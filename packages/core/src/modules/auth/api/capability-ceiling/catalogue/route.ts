import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { getModules } from '@open-mercato/shared/lib/i18n/server'

/**
 * `CC-139` — **the catalogue the ceiling screen picks from**, and why it is a route of its own.
 *
 * The feature tree the picker renders comes from `/api/auth/features`, which is gated by
 * **`auth.acl.manage`**. The ceiling is gated by **`directory.tenants.manage`**. Those are different
 * capabilities and the dispatcher's `requireFeatures` is **all-of** — measured, there is no
 * `requireAnyFeature` anywhere in `packages/shared` or `packages/core` — so the screen could not borrow
 * the role editor's endpoint without either widening that gate or rendering an empty tree for a tenant
 * administrator who may narrow **their own** ceiling and holds nothing else (`CC-135` §3.2 supports
 * exactly that actor).
 *
 * **This is not a widening, and the reason is a containment argument:** a capability that lets you
 * **set** the ceiling is strictly more powerful than one that lets you **see** the list you are setting
 * it from. Refusing the list to somebody who may rewrite it is a door with the handle on the wrong side.
 *
 * **It is a separate route rather than a relaxed `/api/auth/features` for one concrete reason:** that
 * endpoint also appends **tenant-scoped synthesized entity features**
 * (`synthesizeRestrictedEntityFeatures`). Those belong to one tenant. The platform ceiling is above every
 * tenant, so a platform ceiling containing a tenant's synthesized entity id would be a category error
 * written into a security control. This route returns the **static catalogue only** — the same
 * `{ items, modules }` shape, so the picker is identical in both screens, minus the part that must not be
 * there.
 */
export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['directory.tenants.manage'] },
}

type FeatureItem = { id: string; title: string; module: string }
type ModuleInfo = { id: string; title: string }

function normalizeDependsOn(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    out.push(trimmed)
  }
  if (out.length === 0) return undefined
  return Array.from(new Set(out))
}

export async function GET(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modules = getModules() || []
  const items: FeatureItem[] = modules.flatMap((m: any) =>
    (m.features || []).map((f: any) => {
      const item: FeatureItem & { dependsOn?: string[] } = {
        id: String(f.id),
        title: String(f.title || f.id),
        module: String(f.module || m.id),
      }
      const deps = normalizeDependsOn(f?.dependsOn)
      if (deps) item.dependsOn = deps
      return item
    }),
  )

  // Deduplicate by id, keeping the first occurrence — the same rule `/api/auth/features` applies, so a
  // capability appears once even when two module records declare it.
  const byId = new Map<string, FeatureItem>()
  for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item)
  const list = Array.from(byId.values()).sort(
    (a, b) => a.module.localeCompare(b.module) || a.id.localeCompare(b.id),
  )

  const moduleInfo = new Map<string, ModuleInfo>()
  for (const m of modules) {
    if (m.id) moduleInfo.set(m.id, { id: m.id, title: (m.info as any)?.title || m.id })
  }
  // A capability may name a module that declares no info block. Emitting a module entry for it anyway is
  // what keeps the picker from silently dropping a group of capabilities it has no heading for.
  for (const item of list) {
    if (!moduleInfo.has(item.module)) moduleInfo.set(item.module, { id: item.module, title: item.module })
  }

  return NextResponse.json({ items: list, modules: Array.from(moduleInfo.values()) })
}

const catalogueResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      module: z.string(),
      dependsOn: z.array(z.string()).optional(),
    }),
  ),
  modules: z.array(z.object({ id: z.string(), title: z.string() })),
})

export const openApi: OpenApiRouteDoc = {
  tag: 'Authentication & Accounts',
  summary: 'The capability catalogue the ceiling screen picks from',
  methods: {
    GET: {
      summary: 'List every declared capability, grouped by module',
      description:
        'The static catalogue — the same shape the ACL editor consumes, without the tenant-scoped ' +
        'synthesized entity features, because the platform ceiling is above every tenant. Gated by ' +
        '`directory.tenants.manage`: the capability that lets you set the ceiling implies the right to ' +
        'see the list you are setting it from.',
      responses: [
        { status: 200, description: 'The catalogue', schema: catalogueResponseSchema },
        { status: 401, description: 'Missing authentication', schema: z.object({ error: z.string() }) },
      ],
    },
  },
}
