import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { CommandBus, CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { CommandInterceptorError } from '@open-mercato/shared/lib/commands'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { DelegationService } from '@open-mercato/core/modules/auth/services/delegationService'
import type { EntityManager } from '@mikro-orm/postgresql'
import { hasRequiredFeatures } from '../../../../lib/auth'
import { beginAiAssistantMutationGuard } from '../../../mutation-guard'
import {
  applyDeparture,
  previewDeparture,
  type DepartureDecision,
} from '../../../../lib/departure'

const logger = createLogger('ai_assistant')

/**
 * `CC-127` — the departure flow's two verbs.
 *
 * **`GET` is the question.** It lists what is related to the person — every
 * live binding held by one of their keys (through *both* key links) and every
 * delegation in either direction — and names the default decision. Without it
 * an admin deletes a user and learns what happened to their agents afterwards,
 * which is what the platform did before this existed.
 *
 * **`POST` is the answer.** It runs the person's `auth.users.delete` through the
 * command bus, then applies the decision. The bus's audit entry carries the
 * decision in `metadata.context.departure`, so **`auth` records a fact about
 * agents without knowing what an agent is** — no schema change, no import from
 * `auth` into `ai_assistant` in that direction.
 *
 * Both verbs live in `ai_assistant` because the decision is about agents, and
 * that boundary must not be crossed the other way: `auth` must not learn what an
 * agent is.
 *
 * **Never a 403 for a target.** The caller is already authorized for the verb,
 * so the only honest reason left is that the row is not in their tenant — and a
 * 403 would confirm the id exists elsewhere. Unknown and cross-tenant are both
 * 404.
 */

const DELETE_USER_FEATURE = 'auth.users.delete'
const MANAGE_FEATURE = 'ai_assistant.settings.manage'

/** Both, not either: deleting a person and deciding about their agents are two powers. */
const DEPARTURE_FEATURES = [DELETE_USER_FEATURE, MANAGE_FEATURE]

const userIdSchema = z.object({
  userId: z.string().uuid('userId must be a uuid'),
})

const departureBodySchema = z.object({
  decision: z.enum(['deactivate', 'leave']).optional(),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'Departure flow — what happens to a leaving user\'s agents (CC-127)',
  methods: {
    GET: {
      operationId: 'aiAssistantPreviewDeparture',
      summary: 'Preview what a departing user owns, before deciding.',
      description:
        'Returns `{ user, agents, delegations, default }`. `agents` lists every live binding held by ' +
        'one of the user\'s API keys, through both links — a key that acts as them (`session`) and a ' +
        'key they minted (`created`). `delegations` lists rows in both directions. Unknown and ' +
        'cross-tenant users are both 404. Requires `auth.users.delete` and ' +
        '`ai_assistant.settings.manage`.',
      responses: [
        {
          status: 200,
          description: 'Departure preview payload.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'userId is not a uuid.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks one of the two required features.' },
        { status: 404, description: 'No such user in the caller\'s tenant.' },
      ],
    },
    POST: {
      operationId: 'aiAssistantApplyDeparture',
      summary: 'Delete the user and apply the agent decision.',
      description:
        'Body: `{ decision?: "deactivate" | "leave" }`, default `deactivate`. Deletes the user ' +
        'through `auth.users.delete` (the command bus audits the decision), then revokes every ' +
        'listed binding tenant-wide and every listed delegation in both directions. `leave` writes ' +
        'nothing: the credential still dies with its owner, so the difference is the record, not ' +
        'the capability. A cascade failure after a successful delete returns 500 ' +
        '`departure_partial` — the person is gone and the agent rows may be untouched.',
      requestBody: {
        contentType: 'application/json',
        description: 'Body: `{ decision?: "deactivate" | "leave" }`.',
        schema: departureBodySchema,
      },
      responses: [
        {
          status: 200,
          description: 'Departure receipt.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Malformed userId or an unknown decision.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks a required feature, or the act was held back.' },
        { status: 404, description: 'No such user in the caller\'s tenant.' },
        { status: 500, description: '`departure_partial` — the delete committed and the cascade did not.' },
      ],
    },
  },
}

export const metadata = {
  GET: { requireAuth: true, requireFeatures: DEPARTURE_FEATURES },
  POST: { requireAuth: true, requireFeatures: DEPARTURE_FEATURES },
}

interface RouteContext {
  params: Promise<{ userId: string }>
}

function jsonError(
  status: number,
  message: string,
  code: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, code, ...(extra ?? {}) }, { status })
}

type ResolvedAuth = {
  auth: NonNullable<Awaited<ReturnType<typeof getAuthFromRequest>>>
  tenantId: string | null
  organizationId: string | null
  userId: string
  container: Awaited<ReturnType<typeof createRequestContainer>>
}

async function resolveAuthOrRespond(req: NextRequest): Promise<ResolvedAuth | NextResponse> {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return jsonError(401, 'Unauthorized', 'unauthenticated')
  }
  const container = await createRequestContainer()
  const rbacService = container.resolve<RbacService>('rbacService')
  const acl = await rbacService.loadAcl(auth.sub, {
    tenantId: auth.tenantId,
    organizationId: auth.orgId,
  })
  if (!hasRequiredFeatures(DEPARTURE_FEATURES, acl.features, acl.isSuperAdmin, rbacService)) {
    return jsonError(
      403,
      `Caller lacks a required feature (${DEPARTURE_FEATURES.join(' + ')}).`,
      'forbidden',
    )
  }
  return {
    auth,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
    userId: auth.sub,
    container,
  }
}

function buildCommandContext(
  container: ResolvedAuth['container'],
  auth: ResolvedAuth['auth'],
  req: NextRequest,
): CommandRuntimeContext {
  return {
    container,
    auth,
    organizationScope: null,
    selectedOrganizationId: auth.orgId ?? null,
    organizationIds: auth.orgId ? [auth.orgId] : null,
    request: req,
  }
}

async function readParams(context: RouteContext): Promise<{ userId: string } | NextResponse> {
  const rawParams = await context.params
  const parsed = userIdSchema.safeParse(rawParams)
  if (!parsed.success) {
    return jsonError(400, 'Invalid user id.', 'validation_error', { issues: parsed.error.issues })
  }
  return parsed.data
}

export async function GET(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req)
  if (authResult instanceof NextResponse) return authResult

  const params = await readParams(context)
  if (params instanceof NextResponse) return params

  try {
    // No tenant ⇒ no user can be in it. A 404, not an empty preview: there is
    // nothing to decide about, and an empty list would read as "nothing related".
    if (!authResult.tenantId) {
      return jsonError(404, 'No such user in this tenant.', 'departure_target_not_found')
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const preview = await previewDeparture({
      userId: params.userId,
      tenantId: authResult.tenantId,
      em,
    })
    if (!preview) {
      return jsonError(404, 'No such user in this tenant.', 'departure_target_not_found')
    }

    return NextResponse.json({ ok: true, ...preview })
  } catch (error) {
    logger.error('AI Departures GET — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to preview the departure.',
      'internal_error',
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req)
  if (authResult instanceof NextResponse) return authResult

  const params = await readParams(context)
  if (params instanceof NextResponse) return params

  // An omitted body is an omitted decision, and the default applies. A body that
  // is present but unparseable, or names a decision that does not exist, is a
  // 400: a typo must not become a choice.
  const rawBody = await req.text()
  let parsedBody: unknown = {}
  if (rawBody.trim()) {
    try {
      parsedBody = JSON.parse(rawBody)
    } catch {
      return jsonError(400, 'Request body must be valid JSON.', 'validation_error')
    }
  }
  const bodyResult = departureBodySchema.safeParse(parsedBody)
  if (!bodyResult.success) {
    return jsonError(400, 'Invalid request body.', 'invalid_decision', {
      issues: bodyResult.error.issues,
    })
  }
  const decision: DepartureDecision = bodyResult.data.decision ?? 'deactivate'

  /**
   * Whether the delete committed. Read in the `catch` to tell "nothing happened"
   * from "the person is gone and the cascade failed" — two very different
   * answers that a single 500 would blur.
   */
  let deleteCommitted = false

  try {
    if (!authResult.tenantId) {
      return jsonError(404, 'No such user in this tenant.', 'departure_target_not_found')
    }

    const em = authResult.container.resolve<EntityManager>('em')

    // 1. Read the related rows BEFORE the delete: they are the receipt, and a
    //    post-delete read would have to guess which keys were the person's.
    const preview = await previewDeparture({
      userId: params.userId,
      tenantId: authResult.tenantId,
      em,
    })
    if (!preview) {
      return jsonError(404, 'No such user in this tenant.', 'departure_target_not_found')
    }

    // 2. The structural guard, before any write. Only `deactivate` touches
    //    binding rows, so only it is a guarded resource write; `leave` deletes
    //    the person and leaves the agent rows alone, which the `auth` command
    //    bus already governs.
    let guard: Awaited<ReturnType<typeof beginAiAssistantMutationGuard>> | null = null
    if (decision === 'deactivate' && preview.agents.length > 0) {
      guard = await beginAiAssistantMutationGuard({
        container: authResult.container,
        req,
        tenantId: authResult.tenantId,
        organizationId: authResult.organizationId,
        userId: authResult.userId,
        resourceKind: 'ai_assistant.agent_binding',
        resourceId: `departure:${params.userId}`,
        operation: 'delete',
        mutationPayload: {
          userId: params.userId,
          decision,
          agents: preview.agents.length,
          delegations: preview.delegations.length,
        },
      })
      if (guard.blockedResponse) return guard.blockedResponse
    }

    // 3. The primary act. The decision travels in the audit context, so `auth`
    //    records a fact about agents without knowing what an agent is.
    const commandBus = authResult.container.resolve<CommandBus>('commandBus')
    await commandBus.execute('auth.users.delete', {
      input: { id: params.userId },
      ctx: buildCommandContext(authResult.container, authResult.auth, req),
      metadata: {
        context: {
          departure: {
            decision,
            agents: preview.agents.length,
            delegations: preview.delegations.length,
          },
        },
      },
    })
    deleteCommitted = true

    // 4. Apply the decision. Built from the write results, never from the
    //    preview's list — a receipt that says "deactivated" while a binding is
    //    still live is the one direction this must not fail in.
    const receipt = await applyDeparture({
      preview,
      decision,
      tenantId: authResult.tenantId,
      em,
      delegations: authResult.container.resolve<DelegationService>('delegationService'),
      adminUserId: authResult.userId,
    })

    if (guard) await guard.runAfterSuccess()

    return NextResponse.json({ ok: true, ...receipt })
  } catch (error) {
    // **Checked first, deliberately.** Once the delete has committed, every
    // later failure — whatever its class — is a partial departure. Letting a
    // typed error from the cascade answer with its own status would describe the
    // second half of a two-step operation as though the first never ran.
    if (deleteCommitted) {
      logger.error('AI Departures POST — Failure after the delete committed', { err: error })
      return jsonError(
        500,
        'The user was deleted, but applying the agent decision failed; the agent rows may be untouched.',
        'departure_partial',
        { userId: params.userId },
      )
    }
    // The act was held back by an interceptor, before the delete ran.
    if (error instanceof CommandInterceptorError) {
      logger.warn('AI Departures POST — held back by an interceptor', { err: error })
      return jsonError(403, error.message, 'blocked_by_interceptor')
    }
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    logger.error('AI Departures POST — Failure', { err: error })
    // Nothing happened: the command bus never committed, so the user still
    // exists and no agent row was touched.
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to apply the departure.',
      'departure_failed',
      { userId: params.userId },
    )
  }
}
