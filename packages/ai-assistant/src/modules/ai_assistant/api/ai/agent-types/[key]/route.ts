import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getAgent, loadAgentRegistry } from '../../../../lib/agent-registry'
import { hasRequiredFeatures } from '../../../../lib/auth'
import { beginAiAssistantMutationGuard } from '../../../mutation-guard'
import {
  AgentTypeBundleError,
  validateAgentTypeBundle,
} from '../../../../lib/agent-type-catalog'
import { AiAgentTypeRepository } from '../../../../data/repositories/AiAgentTypeRepository'
import type { AiAgentType } from '../../../../data/entities'

const logger = createLogger('ai_assistant')

/**
 * `CC-126` — one tenant agent type: read, edit (version bump), retire.
 *
 * Retire is one-way and absolute: the key is never reusable, so every binding
 * written for this definition resolves to nothing from here on rather than
 * silently re-pointing at a later one.
 */

const agentTypeKeyPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/

const agentTypeKeyParamSchema = z.object({
  key: z
    .string()
    .regex(
      agentTypeKeyPattern,
      'key must match "<area>.<role>" (lowercase, digits, underscores only)',
    ),
})

const updateAgentTypeSchema = z.object({
  bundle: z.record(z.string(), z.unknown()),
})

const VIEW_FEATURE = 'ai_assistant.view'
const MANAGE_FEATURE = 'ai_assistant.settings.manage'

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'One tenant-created agent type (CC-126)',
  methods: {
    GET: {
      operationId: 'aiAssistantGetAgentType',
      summary: 'Read one of the tenant\'s agent types.',
      description:
        'Returns the row whatever its status, with `shadowedByCode` set when the platform ' +
        'has since claimed this key — in that state the row is inert (code-first ' +
        'precedence) and retiring it is the only meaningful write. Requires `ai_assistant.view`.',
      responses: [
        {
          status: 200,
          description: 'Agent type payload.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Invalid key.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.view`.' },
        { status: 404, description: 'No such key in this tenant.' },
      ],
    },
    PUT: {
      operationId: 'aiAssistantUpdateAgentType',
      summary: 'Edit a live tenant agent type (bumps version).',
      description:
        'Body: `{ bundle }`. Replaces the definition body and bumps `version`. A retired type ' +
        'is not editable (retirement is one-way) and a key the platform has claimed is inert ' +
        '— both are refused 409. Requires `ai_assistant.settings.manage`.',
      requestBody: {
        contentType: 'application/json',
        description: 'Body: `{ bundle }` — the JSON-safe definition subset.',
        schema: updateAgentTypeSchema,
      },
      responses: [
        {
          status: 200,
          description: 'Agent type persisted.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Malformed bundle, or no tenant context.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.settings.manage`.' },
        { status: 404, description: 'No such key in this tenant.' },
        { status: 409, description: 'Type is retired, or its key is claimed by a code agent.' },
      ],
    },
    DELETE: {
      operationId: 'aiAssistantRetireAgentType',
      summary: 'Retire a tenant agent type (one-way).',
      description:
        "Sets `status = 'retired'`. The key is never reusable. Idempotent — retiring an " +
        'already-retired type succeeds quietly. Requires `ai_assistant.settings.manage`.',
      responses: [
        {
          status: 200,
          description: 'Agent type retired (or already retired).',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Invalid key.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks `ai_assistant.settings.manage`.' },
        { status: 404, description: 'No such key in this tenant.' },
      ],
    },
  },
}

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [VIEW_FEATURE] },
  PUT: { requireAuth: true, requireFeatures: [MANAGE_FEATURE] },
  DELETE: { requireAuth: true, requireFeatures: [MANAGE_FEATURE] },
}

interface RouteContext {
  params: Promise<{ key: string }>
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

function serializeAgentType(row: AiAgentType, shadowedByCode: boolean) {
  return {
    key: row.key,
    status: row.status,
    version: row.version,
    bundle: row.bundle,
    shadowedByCode,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  }
}

export async function GET(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, VIEW_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  const rawParams = await context.params
  const paramResult = agentTypeKeyParamSchema.safeParse(rawParams)
  if (!paramResult.success) {
    return jsonError(400, 'Invalid agent type key.', 'validation_error', {
      issues: paramResult.error.issues,
    })
  }

  try {
    if (!authResult.tenantId) {
      return jsonError(404, `No agent type "${paramResult.data.key}" in this context.`, 'agent_type_unknown')
    }
    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentTypeRepository(em)
    const row = await repo.findByKey(paramResult.data.key, { tenantId: authResult.tenantId })
    if (!row) {
      return jsonError(404, `No agent type "${paramResult.data.key}" in this tenant.`, 'agent_type_unknown')
    }
    await loadAgentRegistry()
    return NextResponse.json({
      agentType: serializeAgentType(row, getAgent(row.key) != null),
    })
  } catch (error) {
    logger.error('AI Agent Type GET — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to load agent type.',
      'internal_error',
    )
  }
}

export async function PUT(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, MANAGE_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  const rawParams = await context.params
  const paramResult = agentTypeKeyParamSchema.safeParse(rawParams)
  if (!paramResult.success) {
    return jsonError(400, 'Invalid agent type key.', 'validation_error', {
      issues: paramResult.error.issues,
    })
  }

  let parsedBody: unknown
  try {
    parsedBody = await req.json()
  } catch {
    return jsonError(400, 'Request body must be valid JSON.', 'validation_error')
  }

  const bodyResult = updateAgentTypeSchema.safeParse(parsedBody)
  if (!bodyResult.success) {
    return jsonError(400, 'Invalid request body.', 'validation_error', {
      issues: bodyResult.error.issues,
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
    if (!authResult.tenantId) {
      return jsonError(
        400,
        'Caller has no tenant context; cannot persist tenant-scoped agent type.',
        'tenant_required',
      )
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentTypeRepository(em)

    // All three preconditions run BEFORE the mutation guard so a refused edit
    // never enters the approval pipeline — the bindings route's discipline.
    const existing = await repo.findByKey(paramResult.data.key, { tenantId: authResult.tenantId })
    if (!existing) {
      return jsonError(404, `No agent type "${paramResult.data.key}" in this tenant.`, 'agent_type_unknown')
    }
    if (existing.status === 'retired') {
      return jsonError(
        409,
        `Agent type "${paramResult.data.key}" is retired; retirement is one-way and the key is never reusable.`,
        'agent_type_retired',
      )
    }
    await loadAgentRegistry()
    if (getAgent(paramResult.data.key)) {
      return jsonError(
        409,
        `Agent key "${paramResult.data.key}" is a platform-shipped agent; this tenant row is inert (code-first precedence). Retire it to remove the shadow.`,
        'agent_type_shadowed',
      )
    }

    const guard = await beginAiAssistantMutationGuard({
      container: authResult.container,
      req,
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      resourceKind: 'ai_assistant.agent_type',
      resourceId: paramResult.data.key,
      operation: 'update',
      mutationPayload: { key: paramResult.data.key, bundle },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    const saved = await repo.update(paramResult.data.key, { bundle }, { tenantId: authResult.tenantId })
    if (!saved) {
      // Lost a race with a retire between the read and the write; the guard
      // has already opened, so close it honestly rather than pretending.
      await guard.runAfterSuccess()
      return jsonError(409, `Agent type "${paramResult.data.key}" is no longer live.`, 'agent_type_retired')
    }

    await guard.runAfterSuccess()
    return NextResponse.json({ ok: true, agentType: serializeAgentType(saved, false) })
  } catch (error) {
    logger.error('AI Agent Type PUT — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to save agent type.',
      'internal_error',
    )
  }
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<Response> {
  const authResult = await resolveAuthOrRespond(req, MANAGE_FEATURE)
  if (authResult instanceof NextResponse) return authResult

  const rawParams = await context.params
  const paramResult = agentTypeKeyParamSchema.safeParse(rawParams)
  if (!paramResult.success) {
    return jsonError(400, 'Invalid agent type key.', 'validation_error', {
      issues: paramResult.error.issues,
    })
  }

  try {
    if (!authResult.tenantId) {
      return jsonError(
        400,
        'Caller has no tenant context; cannot retire a tenant-scoped agent type.',
        'tenant_required',
      )
    }

    const em = authResult.container.resolve<EntityManager>('em')
    const repo = new AiAgentTypeRepository(em)
    const existing = await repo.findByKey(paramResult.data.key, { tenantId: authResult.tenantId })
    if (!existing) {
      return jsonError(404, `No agent type "${paramResult.data.key}" in this tenant.`, 'agent_type_unknown')
    }

    const guard = await beginAiAssistantMutationGuard({
      container: authResult.container,
      req,
      tenantId: authResult.tenantId,
      organizationId: authResult.organizationId,
      userId: authResult.userId,
      resourceKind: 'ai_assistant.agent_type',
      resourceId: paramResult.data.key,
      // The guard's operation vocabulary is fixed; a retirement is the
      // delete verb for this resource, and `resourceKind` already names it
      // an agent type.
      operation: 'delete',
      mutationPayload: { key: paramResult.data.key, retire: true },
    })
    if (guard.blockedResponse) return guard.blockedResponse

    // Idempotent: retiring an already-retired type succeeds quietly — the
    // row is already in the state the caller asked for, and a second guard
    // pass writing the same value is not a second decision.
    const retired = await repo.retire(paramResult.data.key, { tenantId: authResult.tenantId })
    await guard.runAfterSuccess()
    return NextResponse.json({
      ok: true,
      retired,
      agentType: serializeAgentType({ ...existing, status: 'retired' }, false),
    })
  } catch (error) {
    logger.error('AI Agent Type DELETE — Failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Failed to retire agent type.',
      'internal_error',
    )
  }
}
