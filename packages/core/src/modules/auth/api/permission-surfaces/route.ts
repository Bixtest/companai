import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { OpenApiMethodDoc, OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { readTenantSurfaces } from '../../services/permissionSurfacesService'

/**
 * The permission-catalogue **read** route (`P3b` / `M3e`, row 9).
 *
 * **What this is.** Row 9 says the permission rules must be *"stored … and read back by the running
 * app"*. The durable **write** half (the `permission_surfaces` table + the recorders) was built first;
 * this route is the **read** half — a live consumer that answers *"what permission surfaces does this
 * tenant have?"* **from the tenant's own persisted rows**, not from an in-process `Map` that a restart
 * forgets.
 *
 * **Why a route is the right home (and not the boot).** The app bootstrap
 * (`apps/mercato/src/bootstrap.ts`) is **synchronous and has no tenant** — a surface table is
 * per-tenant, so there is nowhere at boot to hydrate *for* a tenant. A request is the first point at
 * which a tenant is known (`auth.tenantId`) *and* an `EntityManager` exists, which is exactly the
 * prerequisite the callback (`CC-43`) named.
 *
 * **Tenant-correct by construction, not by request order.** `readTenantSurfaces` answers from
 * **declared surfaces (global, identical per tenant) + exactly the rows this tenant's own read
 * returned** — never the process-global registry raw. That closes the cross-tenant leak a naive
 * `listPermissionSurfaces()` would open once two tenants share a process. See the service's own note.
 *
 * **Fail soft.** A DB failure yields the declared surfaces alone with `error` set — a partial view,
 * honestly reported — and never a 500. A missing tenant is `401`, the same as every other `auth` read.
 *
 * **Gated like its neighbours.** This is the catalogue behind the ACL editor's per-surface records, so
 * it requires the same `auth.acl.manage` the sibling `features` and `structural-permissions` reads
 * require — a surface list is administrative data, not end-user data.
 */
export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['auth.acl.manage'] },
}

const surfaceSchema = z.object({
  id: z.string(),
  kind: z.enum(['object', 'field', 'relation', 'function', 'widget', 'agent']),
  owner: z.string(),
  source: z.enum(['declared', 'recorded']),
  featurePrefix: z.string().optional(),
})

const responseSchema = z.object({
  items: z.array(surfaceSchema),
  recorded: z.number().int().nonnegative(),
  error: z.string().nullable(),
})

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth || !auth.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let em: EntityManager | null = null
  let containerError: string | null = null
  try {
    const container = await createRequestContainer()
    em = container.resolve('em') as EntityManager
  } catch (err) {
    // A container/DNS failure is a *server* condition, not a missing configuration — reported
    // distinctly so a 200-with-empty here is never mistaken for "the tenant genuinely has none".
    containerError = err instanceof Error ? err.message : String(err)
  }

  // No EntityManager → the declared half still answers (a partial view, honestly reported).
  // The reason is the real error where we have it, so a transient DI failure is not mislabelled
  // as a missing resolver.
  if (!em) {
    return NextResponse.json({
      items: [],
      recorded: 0,
      error: containerError ? `container_error: ${containerError}` : 'no_entity_manager',
    })
  }

  const view = await readTenantSurfaces(em, auth.tenantId ?? null)
  return NextResponse.json({ items: view.surfaces, recorded: view.recorded, error: view.error })
}

const methodDoc: OpenApiMethodDoc = {
  summary: 'List the permission surfaces for the current tenant',
  description:
    'Returns the permission catalogue for the caller’s tenant — the surfaces the platform declares in code plus the surfaces recorded for this tenant at runtime (custom entities, custom fields). Reads back what the structure-change gate persisted, so a runtime-appearing surface survives a restart and is visible to a second process.',
  tags: ['Authentication & Accounts'],
  responses: [
    { status: 200, description: 'The tenant’s permission surfaces', schema: responseSchema },
    { status: 401, description: 'Missing authentication', schema: z.object({ error: z.string() }) },
  ],
}

export const openApi: OpenApiRouteDoc = {
  summary: 'List permission surfaces',
  methods: { GET: methodDoc },
}
