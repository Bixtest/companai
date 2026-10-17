import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { effectiveUserId } from '@open-mercato/shared/lib/auth/principal'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { hasRequiredFeatures } from '../../../../../../lib/auth'
import { beginAiAssistantMutationGuard } from '../../../../../mutation-guard'
import {
  AiChatConversationAccessError,
  AiChatParticipantNotFoundError,
  createConversationStorage,
} from '../../../../../../lib/conversation-storage'
import { emitAiAssistantEvent } from '../../../../../../events'

const REQUIRED_FEATURE = 'ai_assistant.view'
const MANAGE_CONVERSATIONS_FEATURE = 'ai_assistant.conversations.manage'
const SHARE_CONVERSATIONS_FEATURE = 'ai_assistant.conversations.share'

const participantParamsSchema = z.object({
  conversationId: z
    .string()
    .trim()
    .min(1, 'conversationId must be a non-empty string')
    .max(128, 'conversationId exceeds the maximum length of 128 characters'),
  /**
   * `CC-107` — the participant this route addresses, on EITHER axis.
   *
   * The FIELD stays `userId` because the route segment is `[userId]` and Next.js
   * hands the handler `{ ... userId }`; renaming the key here without renaming
   * the directory breaks every caller, and this test suite caught it.
   *
   * Its VALUE is no longer a uuid: a bare uuid remains the human axis, so
   * existing callers are unchanged, and an agent is named with the `agent:`
   * prefix — the convention `ai_worker:` / `api_key:` already use for subjects.
   * An explicit prefix rather than "looks like a uuid?", because that sniff is
   * exactly the ambiguity that put `ai_worker:<id>` into a uuid column before.
   */
  userId: z
    .string()
    .trim()
    .min(1, 'userId must be a non-empty string')
    .max(160, 'userId exceeds the maximum length of 160 characters'),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'Revoke a conversation participant (a user, or agent:<id>)',
  methods: {
    DELETE: {
      operationId: 'aiAssistantRevokeConversationParticipant',
      summary: 'Revoke a participant from a conversation (soft-delete).',
      description:
        'Soft-deletes the participant row. If no active non-owner participants remain, ' +
        'the conversation visibility is reset to "private". ' +
        'Only the conversation owner or a manager may revoke participants.',
      responses: [
        {
          status: 204,
          description: 'Participant revoked.',
        },
      ],
      errors: [
        { status: 400, description: 'Invalid path parameters.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks required features or is not the owner.' },
        { status: 404, description: 'Conversation not found.' },
      ],
    },
  },
}

export const metadata = {
  DELETE: { requireAuth: true, requireFeatures: [REQUIRED_FEATURE] },
}

interface RouteContext {
  /** `CC-107` — the path segment still reads `userId`; it now names EITHER axis. */
  params: Promise<{ conversationId: string; userId: string }>
}

/** `CC-107` — the machine axis is named with a prefix, never sniffed from a uuid. */
const AGENT_PREFIX = 'agent:'

/**
 * `CC-107` — resolve a path participant to ONE axis.
 *
 * `agent:<name>` is the machine axis and carries no human of its own, because the
 * repository refuses an agent participant without an owner — the owner is
 * resolved from the caller, who is the person allowed to revoke.
 */
function participantIdentity(
  raw: string,
  actingUserId: string,
): { userId: string } | { agentId: string; agentOwnerUserId: string } {
  if (raw.startsWith(AGENT_PREFIX)) {
    const agentId = raw.slice(AGENT_PREFIX.length).trim()
    if (!agentId) {
      throw new Error('agent: prefix requires a non-empty agent id')
    }
    return { agentId, agentOwnerUserId: actingUserId }
  }
  const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidShape.test(raw)) {
    throw new Error(
      `participant "${raw}" is neither a user uuid nor an "agent:<id>" — ` +
        'an agent must be named with the prefix.',
    )
  }
  return { userId: raw }
}

function jsonError(
  status: number,
  message: string,
  code: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, code, ...(extra ?? {}) }, { status })
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<Response> {
  const auth = await getAuthFromRequest(req)
  if (!auth) return jsonError(401, 'Unauthorized', 'unauthenticated')
  const rawParams = await context.params
  const parseResult = participantParamsSchema.safeParse(rawParams)
  if (!parseResult.success) {
    return jsonError(400, 'Invalid path parameters.', 'validation_error', {
      issues: parseResult.error.issues,
    })
  }
  if (!auth.tenantId) return jsonError(404, 'Conversation not found.', 'conversation_not_found')

  const container = await createRequestContainer()
  const rbacService = container.resolve<RbacService>('rbacService')
  const acl = await rbacService.loadAcl(auth.sub, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
  })
  if (!hasRequiredFeatures([REQUIRED_FEATURE], acl.features, acl.isSuperAdmin, rbacService)) {
    return jsonError(403, `Caller lacks required feature "${REQUIRED_FEATURE}".`, 'forbidden')
  }
  const canShare = hasRequiredFeatures(
    [SHARE_CONVERSATIONS_FEATURE],
    acl.features,
    acl.isSuperAdmin,
    rbacService,
  )
  if (!canShare) {
    return jsonError(
      403,
      `Caller lacks required feature "${SHARE_CONVERSATIONS_FEATURE}".`,
      'forbidden',
    )
  }

  try {
    const repo = createConversationStorage(container)

    const guard = await beginAiAssistantMutationGuard({
      container,
      req,
      tenantId: auth.tenantId,
      organizationId: auth.orgId ?? null,
      userId: auth.sub,
      resourceKind: 'ai_assistant.conversation',
      resourceId: parseResult.data.conversationId,
      operation: 'custom',
      mutationPayload: { participant: parseResult.data.userId, action: 'revoke' },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // `CC-107` §3.1 — resolve the person ONCE. `auth.sub` is a subject string
    // (`api_key:<id>` / `ai_worker:<id>`) and everything below ends in a uuid
    // column, so a key-backed caller used to get `22P02` here too.
    const actingUserId = effectiveUserId(auth)
    if (!actingUserId) {
      return jsonError(
        422,
        'This credential acts for no person. A conversation is written for a person: ' +
          'name the acting user on the key, or call as a user.',
        'ai_acting_user_required',
      )
    }

    await repo.revokeParticipant(
      parseResult.data.conversationId,
      participantIdentity(parseResult.data.userId, actingUserId),
      {
        tenantId: auth.tenantId,
        organizationId: auth.orgId ?? null,
        userId: actingUserId,
        canManageConversations: hasRequiredFeatures(
          [MANAGE_CONVERSATIONS_FEATURE],
          acl.features,
          acl.isSuperAdmin,
          rbacService,
        ),
      },
    )
    try {
      await emitAiAssistantEvent(
        'ai_assistant.conversation.unshared',
        {
          conversationId: parseResult.data.conversationId,
          tenantId: auth.tenantId,
          organizationId: auth.orgId ?? null,
          ownerUserId: auth.sub,
          participant: parseResult.data.userId,
        },
        { persistent: false },
      )
    } catch {
      // non-fatal
    }
    await guard.runAfterSuccess()
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof AiChatParticipantNotFoundError) {
      return jsonError(404, err.message || 'Participant not found or already revoked.', 'participant_not_found')
    }
    if (err instanceof AiChatConversationAccessError) {
      return jsonError(403, err.message || 'Access denied.', 'forbidden')
    }
    return jsonError(500, 'Internal server error.', 'internal_error')
  }
}
