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
import { beginAuthMutationGuard } from '../mutation-guard'

/**
 * `CC-135` — **the platform capability ceiling**, over HTTP.
 *
 * **What this replaces.** `mercato auth ceiling` was the only caller of `replaceCapabilityCeiling`, and
 * a CLI has no authenticated principal, so every platform ceiling change was recorded as `system` with
 * no user and no acting tenant. `CC-128` made the actor a required argument for exactly this reason —
 * the day a route supplied a real principal, the record would be real for free. This is that route.
 *
 * **Two questions, not one, and the second is the one the row did not name.** `requireFeatures` below
 * says *may you manage tenants*; it does not say *may you move the platform ceiling*. Every tenant's
 * superadmin holds `directory.tenants.manage` legitimately (the `*` belongs to their position), and a
 * tenant with no ceiling rows inherits the platform's — so gating on the capability alone would hand
 * any tenant administrator the bound that applies to every other tenant. `readCeilingForCaller` and
 * `writeCeilingForCaller` ask the reach question; `PLAN-CC-135-ceiling-route.md` §3.2 is the
 * measurement.
 *
 * **Why the tenant route is a sibling file and not a query parameter.** The scope is part of the
 * address, so the platform ceiling cannot be reached by mistyping a body field, and a proxy log shows
 * which ceiling was touched.
 */
const FEATURE_MANAGE = 'directory.tenants.manage'
const RESOURCE_KIND = 'auth.tenant_capability_ceiling'
/** The `resourceId` the platform scope is recorded under — the same literal the audit record uses. */
const PLATFORM_RESOURCE_ID = 'platform'

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

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    scope: { kind: 'platform' },
  })
  return NextResponse.json(result.body, { status: result.status })
}

export async function PUT(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  // The D2-gap rule: a write that changes a security control passes the seam every other write in the
  // module shares, so a guard registered for this resource kind is enforced rather than skipped.
  const guard = await beginAuthMutationGuard({
    container,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
    userId: auth.sub ?? null,
    req,
    resourceKind: RESOURCE_KIND,
    resourceId: PLATFORM_RESOURCE_ID,
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
    scope: { kind: 'platform' },
    capabilities: parsed.data.capabilities,
  })
  // `runAfterSuccess` only when something actually changed: a refused write is not a success, and a
  // guard hook that fires on a 400 would report an act that did not happen.
  if (result.status === 200) await guard.runAfterSuccess()
  return NextResponse.json(result.body, { status: result.status })
}

export const openApi: OpenApiRouteDoc = {
  tag: 'Authentication & Accounts',
  summary: 'The platform capability ceiling',
  methods: {
    GET: {
      summary: 'Read the platform capability ceiling',
      description:
        'Returns every capability the deployment allows at all. A tenant with no ceiling of its own inherits this set. Only an administrator of the foundational tenant may read it.',
      responses: [
        { status: 200, description: 'The platform ceiling', schema: ceilingResponseSchema },
        { status: 401, description: 'Missing authentication', schema: errorSchema },
        { status: 403, description: 'Not an administrator of the foundational tenant', schema: errorSchema },
      ],
    },
    PUT: {
      summary: 'Replace the platform capability ceiling',
      description:
        'Replaces the set of capabilities the deployment allows. An empty set is refused: it is indistinguishable from having none, and none means every tenant inherits. A tenant ceiling must remain a subset of this one, so narrowing it here refuses any tenant ceiling that names something no longer allowed.',
      requestBody: { schema: ceilingWriteSchema },
      responses: [
        { status: 200, description: 'The ceiling as stored, with the diff', schema: ceilingWriteResponseSchema },
        { status: 400, description: 'Invalid payload, or an empty ceiling', schema: errorSchema },
        { status: 401, description: 'Missing authentication', schema: errorSchema },
        { status: 403, description: 'Not an administrator of the foundational tenant', schema: errorSchema },
      ],
    },
  },
}
