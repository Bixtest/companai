import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getAgent, loadAgentRegistry } from '../../../lib/agent-registry'
import { hasRequiredFeatures } from '../../../lib/auth'
import { beginAiAssistantMutationGuard } from '../../mutation-guard'
import {
  AgentTypeBundleError,
  validateAgentTypeBundle,
} from '../../../lib/agent-type-catalog'
import {
  AiAgentTypeKeyCollisionError,
  AiAgentTypeRepository,
} from '../../../data/repositories/AiAgentTypeRepository'
import type { AiAgentType } from '../../../data/entities'

const logger = createLogger('ai_assistant')

/**
 * `CC-126` — the tenant-visible type catalogue's write surface.
 *
 * A tenant authors a type here; the platform ships types as code and keeps
 * its own id space. The key speaks the same dialect as
 * `ai_agent_bindings.agent_id` (lowercase, one dot) because it flows through
 * the same binding and override machinery.
 */

const agentTypeKeyPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/

const agentTypeKeySchema = z.object({
  key: z
    .string()
    .regex(
      agentTypeKeyPattern,
      'key must match "<area>.<role>" (lowercase, digits, underscores only)',
    ),
})

const createAgentTypeSchema = z.object({
  key: z
    .string()
    .regex(
      agentTypeKeyPattern,
      'key must match "<area>.<role>" (lowercase, digits, underscores only)',
    ),
  /**
   * The JSON-safe definition body — validated by
   * `lib/agent-type-catalog.validateAgentTypeBundle`, which owns the
   * vocabulary: a tenant type is structurally a chat agent with a concrete
   * tool list, and the fields that cannot be JSON (`output`, a custom loop
   * stop condition, `moduleId`) are refused at the boundary rather than
   * silently dropped.
   */
  bundle: z.record(z.string(), z.unknown()),
})

const VIEW_FEATURE = 'ai_assistant.view'
const MANAGE_FEATURE = 'ai_assistant.settings.manage'

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'Tenant-created agent types (CC-126)',
  methods: {
    GET: {
      operationId: 'aiAssistantListAgentTypes',
      summary: 'List the tenant\'s agent types.',
      description:
        'Returns every `ai_agent_types` row the caller\'s tenant holds, retired tombstones ' +
        'included — a retired key is never reusable, so a tombstone is the record of why a ' +
        'key is unavailable. Requires `ai_assistant.view`.',
      responses: [
        {
          status: 200,
          description: 'Agent type list payload.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.view`.' },
      ],
    },
    POST: {
      operationId: 'aiAssistantCreateAgentType',
      summary: 'Create a tenant agent type.',
      description:
        'Body: `{ key, bundle }`. `key` must be in the agent-id dialect and must not be ' +
        'claimed by a code-shipped agent or an existing row (a retired key is never reusable). ' +
        '`bundle` is the JSON-safe definition subset. Requires `ai_assistant.settings.manage`.',
      requestBody: {
        contentType: 'application/json',
        description: 'Body: `{ key, bundle }`.',
        schema: createAgentTypeSchema,
      },
      responses: [
        {
          status: 201,
          description: 'Agent type persisted.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Malformed key, bundle, or no tenant context.' },
        { status: 401, description: 'Unauthentated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.settings.manage`.' },
        { status: 409, description: 'Key is claimed by a code agent or an existing row.' },
      ],
    },
  },
}

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [VIEW_FEATURE] },
  POST: { requireAuth: true, requireFeatures: [MANAGE_FEATURE] },
}

function jsonError(
  status: number,
  message: string,
  code: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, code, ...(extra ?? {}) }, { status })
}

interface ResolvedAuth {
  tenantId: string | null
  organizationId: string | null
  userId: string
  isSuperAdmin: boolean
  features: string[]
  container: Awaited<ReturnType<typeof createRequestContainer>>
  rbacService: RbacService
}

async function resolveAuthOrRespond(
  req: NextRequest,
  requiredFeature: string,
): Promise<ResolvedAuth | NextResponse> {
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
  if (!hasRequiredFeatures([requiredFeature], acl.features, acl.isSuperAdmin, rbacService)) {
    return jsonError(403, `Caller lacks required feature "${requiredFeature}".`, 'forbidden')
  }
  return {
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
    userId: auth.sub,
    isSuperAdmin: acl.isSuperAdmin,
    features: acl.features,
    container,
    rbacService,
  }
}

function serializeAgentType(row: AiAgentType) {
  return {
    key: row.key,
    status: row.status,
    version: row.version,
    bundle: row.bundle,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, VIEW_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  try {
    // No tenant ⇒ no catalogue to list (the null-tenant house pattern: an
    // empty list, not an error — there is nothing here to deny).
    if (!authResult.tenantId) {
      return NextResponse.json({ agentTypes: [], total: 0 })
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentTypeRepository(em)
    const rows = await repo.list({ tenantId: authResult.tenantId })

    return NextResponse.json({
      agentTypes: rows.map(serializeAgentType),
      total: rows.length,
    })
  } catch (error) {
    logger.error('AI Agent Types GET — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to list agent types.',
      'internal_error',
    )
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, MANAGE_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  let parsedBody: unknown
  try {
    parsedBody = await req.json()
  } catch {
    return jsonError(400, 'Request body must be valid JSON.', 'validation_error')
  }

  const bodyResult = createAgentTypeSchema.safeParse(parsedBody)
  if (!bodyResult.success) {
    return jsonError(400, 'Invalid request body.', 'validation_error', {
      issues: bodyResult.error.issues,
    })
  }
  const keyParamResult = agentTypeKeySchema.safeParse({ key: bodyResult.data.key })
  if (!keyParamResult.success) {
    return jsonError(400, 'Invalid agent type key.', 'validation_error', {
      issues: keyParamResult.error.issues,
    })
  }

  let bundle: Record<string, unknown>
  try {
    bundle = validateAgentTypeBundle(bodyResult.data.bundle)
  } catch (error) {
    if (error instanceof AgentTypeBundleError) {
      return jsonError(400, error.message, 'validation_error', { issues: error.issues })
    }
    throw error
  }

  try {
    // CC-126 — the LOUD half of the collision check: a key the platform has
    // already shipped is refused here, so the tenant never authors a type
    // that cannot run. The fail-CLOSED half is the resolver's code-first
    // precedence, which holds even if this check were skipped.
    await loadAgentRegistry()
    if (getAgent(keyParamResult.data.key)) {
      return jsonError(
        409,
        `Agent key "${keyParamResult.data.key}" is a platform-shipped agent; a tenant type cannot claim it.`,
        'agent_key_claimed_by_code',
      )
    }

    if (!authResult.tenantId) {
      return jsonError(
        400,
        'Caller has no tenant context; cannot persist tenant-scoped agent type.',
        'tenant_required',
      )
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentTypeRepository(em)

    const guard = await beginAiAssistantMutationGuard({
      container: authResult.container,
      req,
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      resourceKind: 'ai_assistant.agent_type',
      resourceId: keyParamResult.data.key,
      operation: 'create',
      mutationPayload: { key: keyParamResult.data.key, bundle },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    let created: AiAgentType
    try {
      created = await repo.create({ key: keyParamResult.data.key, bundle }, { tenantId: authResult.tenantId })
    } catch (error) {
      if (error instanceof AiAgentTypeKeyCollisionError) {
        return jsonError(409, error.message, 'agent_type_key_taken', { key: error.key })
      }
      throw error
    }

    await guard.runAfterSuccess()
    return NextResponse.json({ ok: true, agentType: serializeAgentType(created) }, { status: 201 })
  } catch (error) {
    logger.error('AI Agent Types POST — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to save agent type.',
      'internal_error',
    )
  }
}
