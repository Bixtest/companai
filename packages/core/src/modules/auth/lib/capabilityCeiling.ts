import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import { TenantCapabilityCeiling } from '../data/entities'

/**
 * `CC-128` — the **capability ceiling**: which capabilities a tenant may ever hold.
 *
 * Read `PLAN-CC-128-tenant-ceiling.md` §3 before changing anything here. Three points decide the shape
 * of this file:
 *
 * 1. **This is not the authority ceiling.** *Ceiling* already means the autonomy gate (A0–A5, from
 *    organization edges) and, since `CC-123`, the invoker. This one answers a different question —
 *    *may this be held at all* — and it is answered **before** any autonomy question is asked.
 * 2. **It is never a list intersection.** `featureMatch.ts:25-43` forbids that in six specific ways
 *    (a `*` grant, a `prefix.*` family, the bare prefix, `.own`, denials, delegations). The ceiling is
 *    a ceiling among ceilings; the caller asks the resolver and the answer is the minimum.
 * 3. **An empty ceiling is not expressible, on purpose.** See `replaceCapabilityCeiling`.
 */

/** The cache tag a ceiling write invalidates. One tag, because one table backs every scope. */
export const CAPABILITY_CEILING_CACHE_TAG = 'auth:capability-ceiling'

const cacheKeyFor = (tenantId: string | null): string =>
  `auth:capability-ceiling:${tenantId ?? 'platform'}`

/**
 * A ceiling as the enforcement path consumes it.
 *
 * `source` is not decoration: it is how an operator learns **why** a capability was refused. A tenant
 * that has narrowed its own ceiling gets a different message from one bounded by the platform, and the
 * difference is the difference between "ask your admin" and "this does not exist in this deployment".
 */
export interface CapabilityCeiling {
  source: 'platform' | 'tenant'
  capabilities: ReadonlySet<string>
}

/** A ceiling operation that the caller should report rather than swallow. */
export class CapabilityCeilingError extends Error {
  override readonly name = 'CapabilityCeilingError'
  constructor(
    message: string,
    /** The capabilities responsible, when the failure is about specific ones. */
    readonly capabilities: readonly string[] = [],
  ) {
    super(message)
  }
}

/**
 * Read the ceiling that applies to `tenantId`.
 *
 * **A tenant with no rows of its own inherits the platform ceiling** — R5 of the plan. "No rows" must
 * never mean "no limit", or the first tenant created after this ships is unbounded.
 *
 * When a cache is supplied it is read first and written back under `CAPABILITY_CEILING_CACHE_TAG`.
 * **No TTL is set, and that is deliberate:** a ceiling that takes five minutes to lower is not a
 * ceiling (`CC-123` makes the same argument about a revoked delegation). The invalidation on write is
 * therefore load-bearing, not an optimisation.
 */
export async function loadCapabilityCeiling(
  em: EntityManager,
  tenantId: string | null,
  cache?: CacheStrategy | null,
): Promise<CapabilityCeiling> {
  const key = cacheKeyFor(tenantId)
  if (cache) {
    const cached = await cache.get(key)
    if (cached) return reviveCeiling(cached)
  }

  const platform = await readScope(em, null)
  // A tenant's own rows win — they are a narrowing of the platform, never a superset (enforced on
  // write). A tenant with none inherits.
  const own = tenantId ? await readScope(em, tenantId) : null
  const ceiling: CapabilityCeiling = own && own.size > 0
    ? { source: 'tenant', capabilities: own }
    : { source: 'platform', capabilities: platform }

  if (cache) {
    await cache.set(
      key,
      { source: ceiling.source, capabilities: [...ceiling.capabilities] },
      { tags: [CAPABILITY_CEILING_CACHE_TAG] },
    )
  }
  return ceiling
}

/**
 * The refusal message for a capability outside the ceiling, or `null` when it is inside.
 *
 * Returns a **message**, not a boolean, because the caller puts it in a `Decision` reason and the
 * operator reads it. `CC-103`'s lesson: an error that names the wrong cause costs a day, so the cause
 * is computed where it is known.
 */
export async function capabilityCeilingRefusalFor(
  em: EntityManager,
  tenantId: string | null,
  capability: string,
  cache?: CacheStrategy | null,
): Promise<string | null> {
  const ceiling = await loadCapabilityCeiling(em, tenantId, cache)
  if (ceiling.capabilities.has(capability)) return null
  return ceiling.source === 'tenant'
    ? `The tenant's capability ceiling does not include ${capability}`
    : `The platform capability ceiling does not include ${capability}`
}

/**
 * Write a ceiling, refusing the two things that would make the table lie.
 *
 * **A tenant ceiling must be a SUBSET of the platform ceiling** (R3). A superset is refused, not
 * silently narrowed: a ceiling that quietly grants less than it says is a lie the operator cannot see.
 *
 * **An empty ceiling is refused** — and this is the design decision worth reading twice. An empty set
 * is indistinguishable from "this tenant has no ceiling row", and "no row" must mean *inherit*. So an
 * empty tenant ceiling cannot be stored, and an operator who wants a tenant to do nothing is pointed at
 * `tenants.is_active`, which is the thing that already means that. The alternative — a marker row
 * meaning "I really mean empty" — is a second encoding of the same fact, and the codebase's own rule
 * is that a fact gets one home.
 *
 * Replacing is a **diff, not a truncate**: a capability removed from a ceiling is soft-deleted, so the
 * row survives as the record of the act (`PLAN-2026-10-18-one-agent.md` §4.6).
 */
export async function replaceCapabilityCeiling(
  em: EntityManager,
  tenantId: string | null,
  capabilities: readonly string[],
  options: { cache?: CacheStrategy | null; now?: Date } = {},
): Promise<{ added: string[]; removed: string[] }> {
  const now = options.now ?? new Date()
  const wanted = new Set(capabilities.map((c) => c.trim()).filter((c) => c.length > 0))

  if (wanted.size === 0) {
    throw new CapabilityCeilingError(
      tenantId
        ? 'A tenant ceiling cannot be empty. An empty ceiling is indistinguishable from having none, ' +
          'and having none means inheriting the platform ceiling. To stop a tenant acting, deactivate ' +
          'the tenant (tenants.is_active) rather than emptying its ceiling.'
        : 'The platform ceiling cannot be empty: every tenant with no ceiling of its own inherits it, ' +
          'so an empty platform ceiling would silently deny every capability everywhere.',
    )
  }

  if (tenantId) {
    await assertWithinPlatformCeiling(em, wanted, now)
  }

  return em.transactional(async (tx) => {
    const live = await tx.find(TenantCapabilityCeiling, {
      tenantId: tenantId ?? null,
      deletedAt: null,
    } as never)

    const liveCapabilities = new Map(live.map((row) => [row.capability, row]))
    const added: string[] = []
    const removed: string[] = []

    for (const row of live) {
      if (!wanted.has(row.capability)) {
        row.deletedAt = now
        row.updatedAt = now
        tx.persist(row)
        removed.push(row.capability)
      }
    }
    for (const capability of wanted) {
      if (liveCapabilities.has(capability)) continue
      tx.persist(
        tx.create(TenantCapabilityCeiling, {
          tenantId: tenantId ?? null,
          capability,
          createdAt: now,
          updatedAt: now,
        } as never),
      )
      added.push(capability)
    }
    await tx.flush()

    // The invalidation is the point of the cache, not an afterthought: without it the ceiling this
    // write just lowered would keep granting until a TTL expired.
    if (options.cache) {
      await options.cache.deleteByTags([CAPABILITY_CEILING_CACHE_TAG])
    }
    return { added, removed }
  })
}

/** The capabilities in `wanted` that the platform ceiling does not contain. Exported for the route. */
export async function capabilitiesOutsidePlatformCeiling(
  em: EntityManager,
  capabilities: Iterable<string>,
): Promise<string[]> {
  const platform = await readScope(em, null)
  return [...capabilities].filter((capability) => !platform.has(capability))
}

async function assertWithinPlatformCeiling(
  em: EntityManager,
  wanted: ReadonlySet<string>,
  _now: Date,
): Promise<void> {
  const offending = await capabilitiesOutsidePlatformCeiling(em, wanted)
  if (offending.length === 0) return
  const named = offending.slice(0, 10).join(', ')
  const more = offending.length > 10 ? ` (+${offending.length - 10} more)` : ''
  throw new CapabilityCeilingError(
    `A tenant ceiling must be a subset of the platform ceiling. Outside it: ${named}${more}. ` +
      'Add them to the platform ceiling first if the platform really allows them.',
    offending,
  )
}

async function readScope(em: EntityManager, tenantId: string | null): Promise<Set<string>> {
  const rows = await em.find(TenantCapabilityCeiling, {
    tenantId: tenantId ?? null,
    deletedAt: null,
  } as never)
  return new Set(rows.map((row) => row.capability))
}

/** The cache round-trips JSON, so a `Set` comes back as an array. */
function reviveCeiling(value: unknown): CapabilityCeiling {
  const raw = value as { source?: unknown; capabilities?: unknown } | null
  const source = raw?.source === 'tenant' ? 'tenant' : 'platform'
  const capabilities = Array.isArray(raw?.capabilities)
    ? raw.capabilities.filter((c): c is string => typeof c === 'string')
    : []
  return { source, capabilities: new Set(capabilities) }
}
