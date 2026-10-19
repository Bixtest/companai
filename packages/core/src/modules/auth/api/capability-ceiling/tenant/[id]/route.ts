import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { CeilingAuditWriter } from '@open-mercato/core/modules/auth/lib/capabilityCeiling'
import {
  ceilingWriteSchema,
  optionalCache,
  readCeilingForCaller,
  writeCeilingForCaller,
} from '@open-mercato/core/modules/auth/lib/capabilityCeilingRoute'
import { beginAuthMutationGuard } from '../../../mutation-guard'

/**
 * `CC-135` — **one tenant's capability ceiling**, over HTTP.
 *
 * The sibling of `api/capability-ceiling/route.ts`, which is the platform scope. The scope is in the
 * address so a proxy log names the ceiling that was touched and the platform ceiling cannot be reached
 * by mistyping a body field.
 *
 * **Three outcomes the platform route does not have:**
 *
 * - **`404`** for a tenant id that does not exist. `tenant_capability_ceilings.tenant_id` carries no
 *   foreign key (`auth/data/entities.ts:1084-1086`), so without this check a write to a mistyped id
 *   would persist rows nothing reads — a record that lies.
 * - **`200` for a tenant's own administrator narrowing its own ceiling.** `CC-128` already refuses a
 *   tenant ceiling that is not a subset of the platform's, so the most a tenant can do here is reduce
 *   what it may hold. Refusing that would mean a tenant cannot tighten its own bound without a support
 *   ticket, which is the opposite of what a ceiling is for.
 * - **`200` for a platform administrator acting on any tenant**, with the audit record saying
 *   `crossTenant: true` and `actedFromTenantId` naming where they acted from — the record `CC-128`
 *   built and no caller could fill until now.
 */
const FEATURE_MANAGE = 'directory.tenants.manage'
const RESOURCE_KIND = 'auth.tenant_capability_ceiling'

export const metadata = {
  GET: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
  PUT: { requireAuth: true, requireFeatures: [FEATURE_MANAGE] },
}

const ceilingResponseSchema = z.object({
  scope: z.enum(['platform', 'tenant']),
  tenantId: z.string().uuid().optional(),
  source: z.enum(['platform', 'tenant']),
  capabilities: z.array(z.string()),
})

const ceilingWriteResponseSchema = ceilingResponseSchema.extend({
  added: z.array(z.string()),
  removed: z.array(z.string()),
})

const errorSchema = z.object({ error: z.string() })

/** The last path segment: `/api/auth/capability-ceiling/tenant/<id>`. */
function tenantIdFromUrl(req: Request): string | null {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] || null
}

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = tenantIdFromUrl(req)
  if (!tenantId) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

  let container: Awaited<ReturnType<typeof createRequestContainer>>
  try {
    container = await createRequestContainer()
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  const result = await readCeilingForCaller({
    em: container.resolve('em') as EntityManager,
    cache: optionalCache(container),
    rbac: container.resolve('rbacService') as RbacService,
    auth,
    scope: { kind: 'tenant', tenantId },
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function PUT(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenantId = tenantIdFromUrl(req)
  if (!tenantId) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = ceilingWriteSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  let container: Awaited<ReturnType<typeof createRequestContainer>>
  try {
    container = await createRequestContainer()
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 })
  }

  const guard = await beginAuthMutationGuard({
    container,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    req,
    resourceKind: RESOURCE_KIND,
    // The TARGET tenant, the same id the audit record uses — so the guard and the journal name the
    // same thing, and a hook registered for this tenant sees the act.
    resourceId: tenantId,
    operation: 'update',
    mutationPayload: { capabilities: parsed.data.capabilities },
  })
  if (guard.blockedResponse) return guard.blockedResponse

  const result = await writeCeilingForCaller({
    em: container.resolve('em') as EntityManager,
    cache: optionalCache(container),
    rbac: container.resolve('rbacService') as RbacService,
    audit: container.resolve('actionLogService') as CeilingAuditWriter,
    auth,
    scope: { kind: 'tenant', tenantId },
    capabilities: parsed.data.capabilities,
  })
  if (result.status === 200) await guard.runAfterSuccess()
  return NextResponse.json(result.body, { status: result.status })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authentication & Accounts',
  summary: "One tenant's capability ceiling",
  methods: {
    GET: {
      summary: "Read a tenant's capability ceiling",
      description:
        'Returns the ceiling that applies to this tenant. `source` says whether it is the tenant\'s own narrowing or the platform ceiling it inherits — the difference between "this tenant limited itself" and "the deployment limits it".',
      responses: [
        { status: 200, description: "The tenant's ceiling", schema: ceilingResponseSchema },
        { status: 401, description: 'Missing authentication', schema: errorSchema },
        { status: 403, description: 'Not this tenant, and not a platform administrator', schema: errorSchema },
        { status: 404, description: 'No such tenant', schema: errorSchema },
      ],
    },
    PUT: {
      summary: "Replace a tenant's capability ceiling",
      description:
        'Replaces what this tenant may ever hold. It must be a subset of the platform ceiling — a superset is refused with the offending capabilities named, never silently narrowed. An empty set is refused: it is indistinguishable from having none, and none means inheriting; deactivate the tenant instead.',
      requestBody: { schema: ceilingWriteSchema },
      responses: [
        { status: 200, description: 'The ceiling as stored, with the diff', schema: ceilingWriteResponseSchema },
        { status: 400, description: 'Invalid payload, an empty ceiling, or a capability outside the platform ceiling', schema: errorSchema },
        { status: 401, description: 'Missing authentication', schema: errorSchema },
        { status: 403, description: 'Not this tenant, and not a platform administrator', schema: errorSchema },
        { status: 404, description: 'No such tenant', schema: errorSchema },
      ],
    },
  },
}
