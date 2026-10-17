import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { EntityManager } from '@mikro-orm/postgresql'
import { ApiKey } from '@open-mercato/core/modules/api_keys/data/entities'
import { getAgent, loadAgentRegistry } from '../../../../../lib/agent-registry'
import { hasRequiredFeatures } from '../../../../../lib/auth'
import { beginAiAssistantMutationGuard } from '../../../../mutation-guard'
import { AiAgentBindingRepository } from '../../../../../data/repositories/AiAgentBindingRepository'
import type { AiAgentBinding } from '../../../../../data/entities'

const logger = createLogger('ai_assistant')

const agentIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/

const agentIdParamSchema = z.object({
  agentId: z
    .string()
    .regex(
      agentIdPattern,
      'agentId must match "<module>.<agent>" (lowercase, digits, underscores only)',
    ),
})

const createBindingSchema = z.object({
  // CC-103 — a uuid, not any non-empty string. `ai_agent_bindings.principal_id` is
  // a `uuid` column, so a malformed id used to reach Postgres and come back as a
  // 500; more importantly, the id was never checked against anything, so a binding
  // could name a person, another tenant's credential, or nothing at all.
  principalId: z.string().uuid('principalId must be a uuid'),
  toolAllowlist: z.array(z.string()).nullable().optional(),
  requiredFeatures: z.array(z.string()).nullable().optional(),
  notes: z.string().max(2000).optional(),
})

const VIEW_FEATURE = 'ai_assistant.view'
const MANAGE_FEATURE = 'ai_assistant.settings.manage'

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'AI-user ↔ agent bindings for one agent (CC-27)',
  methods: {
    GET: {
      operationId: 'aiAssistantListAgentBindings',
      summary: 'List the live AI-user bindings for this agent.',
      description:
        'Returns the `ai_agent_bindings` rows in the caller\'s tenant/org for `agentId`. ' +
        'A binding grants an `ai_worker` principal the right to run this agent, optionally ' +
        'narrowing the tool set and adding required features. Requires `ai_assistant.view`.',
      responses: [
        {
          status: 200,
          description: 'Binding list payload.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Invalid agent id.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.view`.' },
        { status: 404, description: 'Unknown agent id.' },
      ],
    },
    POST: {
      operationId: 'aiAssistantCreateAgentBinding',
      summary: 'Bind an AI-user principal to this agent (create or replace).',
      description:
        'Body: `{ principalId, toolAllowlist?, requiredFeatures?, notes? }`. Upserts the live ' +
        'binding for `(principalId, agentId)`. `toolAllowlist` may only NARROW the agent\'s ' +
        'declared tools; `requiredFeatures` may only ADD requirements — escalation is impossible ' +
        'at run time (`B3`). Requires `ai_assistant.settings.manage`.',
      requestBody: {
        contentType: 'application/json',
        description: 'Body: `{ principalId, toolAllowlist?, requiredFeatures?, notes? }`.',
        schema: createBindingSchema,
      },
      responses: [
        {
          status: 200,
          description: 'Binding persisted.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Invalid agent id or malformed body.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.settings.manage`.' },
        { status: 404, description: 'Unknown agent id.' },
      ],
    },
    DELETE: {
      operationId: 'aiAssistantRevokeAgentBinding',
      summary: 'Revoke an AI-user binding from this agent.',
      description:
        'Query: `?principalId=<id>`. Soft-deletes the live binding; subsequent runs by that ' +
        'principal against this agent are refused with 403 `agent_not_bound`. Idempotent. ' +
        'Requires `ai_assistant.settings.manage`.',
      responses: [
        {
          status: 200,
          description: 'Binding revoked (or already absent).',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Invalid agent id or missing principalId.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.settings.manage`.' },
        { status: 404, description: 'Unknown agent id.' },
      ],
    },
  },
}

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [VIEW_FEATURE] },
  POST: { requireAuth: true, requireFeatures: [MANAGE_FEATURE] },
  DELETE: { requireAuth: true, requireFeatures: [MANAGE_FEATURE] },
}

interface RouteContext {
  params: Promise<{ agentId: string }>
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

function serializeBinding(row: AiAgentBinding) {
  return {
    id: row.id,
    principalId: row.principalId,
    agentId: row.agentId,
    toolAllowlist: row.toolAllowlist ?? null,
    requiredFeatures: row.requiredFeatures ?? [],
    notes: row.notes ?? null,
    createdByUserId: row.createdByUserId ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  }
}

export async function GET(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, VIEW_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  const rawParams = await context.params
  const paramResult = agentIdParamSchema.safeParse(rawParams)
  if (!paramResult.success) {
    return jsonError(400, 'Invalid agent id.', 'validation_error', {
      issues: paramResult.error.issues,
    })
  }

  try {
    await loadAgentRegistry()
    const agent = getAgent(paramResult.data.agentId)
    if (!agent) {
      return jsonError(404, `Unknown agent "${paramResult.data.agentId}".`, 'agent_unknown')
    }

    if (!authResult.tenantId) {
      return NextResponse.json({ agentId: agent.id, bindings: [] })
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentBindingRepository(em)
    const rows = await repo.listForAgent(agent.id, {
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
    })

    return NextResponse.json({
      agentId: agent.id,
      bindings: rows.map(serializeBinding),
    })
  } catch (error) {
    logger.error('AI Agent Bindings GET — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to load agent bindings.',
      'internal_error',
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, MANAGE_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  const rawParams = await context.params
  const paramResult = agentIdParamSchema.safeParse(rawParams)
  if (!paramResult.success) {
    return jsonError(400, 'Invalid agent id.', 'validation_error', {
      issues: paramResult.error.issues,
    })
  }

  let parsedBody: unknown
  try {
    parsedBody = await req.json()
  } catch {
    return jsonError(400, 'Request body must be valid JSON.', 'validation_error')
  }

  const bodyResult = createBindingSchema.safeParse(parsedBody)
  if (!bodyResult.success) {
    return jsonError(400, 'Invalid request body.', 'validation_error', {
      issues: bodyResult.error.issues,
    })
  }

  try {
    await loadAgentRegistry()
    const agent = getAgent(paramResult.data.agentId)
    if (!agent) {
      return jsonError(404, `Unknown agent "${paramResult.data.agentId}".`, 'agent_unknown')
    }

    if (!authResult.tenantId) {
      return jsonError(
        400,
        'Caller has no tenant context; cannot persist tenant-scoped agent binding.',
        'tenant_required',
      )
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentBindingRepository(em)

    // CC-103 — a binding may only name a principal that can HOLD one. Without
    // this the row was written with whatever id the caller sent: no uuid, no
    // existence, no kind, no tenant. A grant to a person is inert (humans never
    // consult the table), a grant to another tenant's credential is a grant
    // nobody can see, and a grant to nothing is a dead row that reads as policy.
    // All four checks run BEFORE the mutation guard so a rejected binding never
    // enters the approval pipeline.
    const principalId = bodyResult.data.principalId
    const principalKey = await em.findOne(ApiKey, { id: principalId, deletedAt: null })
    if (!principalKey) {
      return jsonError(
        400,
        `No API key "${principalId}" exists; an agent binding names an API key.`,
        'validation_error',
      )
    }
    if (principalKey.principalKind !== 'ai_worker') {
      return jsonError(
        400,
        `API key "${principalId}" is a service credential (principal_kind=${
          principalKey.principalKind ?? 'null'
        }); only an ai_worker credential can hold an agent binding.`,
        'validation_error',
      )
    }
    if ((principalKey.tenantId ?? null) !== authResult.tenantId) {
      return jsonError(
        400,
        `API key "${principalId}" belongs to a different tenant.`,
        'validation_error',
      )
    }

    const guard = await beginAiAssistantMutationGuard({
      container: authResult.container,
      req,
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      resourceKind: 'ai_assistant.agent_binding',
      resourceId: `${bodyResult.data.principalId}:${agent.id}`,
      operation: 'create',
      mutationPayload: {
        principalId: bodyResult.data.principalId,
        agentId: agent.id,
        toolAllowlist: bodyResult.data.toolAllowlist ?? null,
        requiredFeatures: bodyResult.data.requiredFeatures ?? null,
      },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    const saved = await repo.upsert(
      {
        principalId: bodyResult.data.principalId,
        agentId: agent.id,
        toolAllowlist: bodyResult.data.toolAllowlist ?? null,
        requiredFeatures: bodyResult.data.requiredFeatures ?? null,
        notes: bodyResult.data.notes ?? null,
      },
      {
        tenantId: authResult.tenantId,
        organizationId: authResult.organizationId,
        userId: authResult.userId,
      },
    )

    await guard.runAfterSuccess()
    return NextResponse.json({ ok: true, binding: serializeBinding(saved) })
  } catch (error) {
    logger.error('AI Agent Bindings POST — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to save agent binding.',
      'internal_error',
    )
  }
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, MANAGE_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  const rawParams = await context.params
  const paramResult = agentIdParamSchema.safeParse(rawParams)
  if (!paramResult.success) {
    return jsonError(400, 'Invalid agent id.', 'validation_error', {
      issues: paramResult.error.issues,
    })
  }

  const principalId = new URL(req.url).searchParams.get('principalId')?.trim()
  if (!principalId) {
    return jsonError(400, 'Query parameter "principalId" is required.', 'validation_error')
  }
  // CC-103 — the same uuid rule as POST. A non-uuid here reached a `uuid` column
  // and came back as a 500 whose `error.message` (raw Postgres text) was echoed
  // to the caller. No bypass — the tenant/org scope still applied — but a 400 is
  // the honest answer and the driver's text is not ours to publish.
  if (!z.string().uuid().safeParse(principalId).success) {
    return jsonError(400, 'Query parameter "principalId" must be a uuid.', 'validation_error')
  }

  try {
    await loadAgentRegistry()
    const agent = getAgent(paramResult.data.agentId)
    if (!agent) {
      return jsonError(404, `Unknown agent "${paramResult.data.agentId}".`, 'agent_unknown')
    }

    if (!authResult.tenantId) {
      return NextResponse.json({ ok: true, agentId: agent.id, principalId, revoked: false })
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentBindingRepository(em)

    const guard = await beginAiAssistantMutationGuard({
      container: authResult.container,
      req,
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      resourceKind: 'ai_assistant.agent_binding',
      resourceId: `${principalId}:${agent.id}`,
      operation: 'delete',
      mutationPayload: { principalId, agentId: agent.id },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    const revoked = await repo.revoke(principalId, agent.id, {
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
    })

    await guard.runAfterSuccess()
    return NextResponse.json({ ok: true, agentId: agent.id, principalId, revoked })
  } catch (error) {
    logger.error('AI Agent Bindings DELETE — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to revoke agent binding.',
      'internal_error',
    )
  }
}
