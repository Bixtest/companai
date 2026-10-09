/**
 * The persisted half of the permission catalogue (SD-1 / S2 / `M3e`) — read and write.
 *
 * **Why this file exists.** The catalogue
 * (`@open-mercato/shared/lib/permissions/catalogue`) answers *"what permission surfaces exist, and
 * which records does each yield?"* — but it keeps that answer in a **process-local `Map`**. A surface
 * that appears at **runtime** (a custom entity, a custom field) is therefore known only to the process
 * that recorded it: a restart forgets it, and a second process never learns it. This service is the
 * durable half — it writes a surface to `permission_surfaces` when it is recorded, and reads the
 * tenant's rows back so the running catalogue and the database agree. That is exactly `P3b` / `M3e`,
 * in the platform's own terms.
 *
 * **The one engine rule (S5).** This service never decides *who may do what* — that stays with the
 * roles-and-permissions engine (`role_acls.features_json`). It stores **surfaces** (the things that
 * can be permitted) and nothing else. It is a repository in the same shape as the catalogue it backs:
 * declared data, no policy.
 *
 * **Fire-and-forget, and fail *soft* — on purpose, and stated plainly.** Recording a surface is a
 * *bookkeeping* step that rides alongside the real work (a field landing, an entity installing). If the
 * write fails, the field still lands with the platform default grant (S2) — the platform is never
 * *less* able to do its job because the catalogue row is missing, it is only less able to *report* the
 * surface. So the write **never throws into the caller's path**: it returns a result and the caller
 * logs. This is the same posture `applyPermissionDecisionGrant` takes for `role_not_found` — a fact to
 * report, not a crash. (Contrast the *decision* path, which fails closed: an *authorisation* must
 * refuse when it cannot decide; a *registry row* must not take the business operation down with it.)
 *
 * **Hydration is additive and idempotent.** `hydratePermissionCatalogue` upserts each row into the live
 * catalogue via `recordSurface`, which the catalogue already refuses to let a *declared* surface fall
 * back to `recorded` — so a boot that runs twice, or a declaration that also has a row, cannot change
 * an answer. Nothing is removed by hydration: if the DB is briefly unreachable the catalogue keeps the
 * declarations it was built with (a partial view, honestly), rather than being emptied.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` S2 + §C.1; `library/development/platform_points.md` row 9
 * (`P3b` / `M3e`); `Migration20261009205000`.
 */

import type { EntityManager } from '@mikro-orm/postgresql'
import {
  isPermissionSurfaceId,
  isPermissionSurfaceKind,
  recordSurface,
  type PermissionSurface,
  type PermissionSurfaceKind,
} from '@open-mercato/shared/lib/permissions/catalogue'
import { PermissionSurfaceRecord } from '@open-mercato/core/modules/auth/data/entities'

/** Why a surface row could not be written. A closed set, so a caller can switch on it. */
export const SURFACE_PERSIST_FAILURES = ['invalid_surface', 'no_tenant'] as const
export type SurfacePersistFailureReason = (typeof SURFACE_PERSIST_FAILURES)[number]

export type SurfacePersistOutcome =
  | { stored: true; created: boolean; surfaceId: string }
  | { stored: false; surfaceId: string; reason: SurfacePersistFailureReason; because: string }

/**
 * Write (upsert) one runtime surface into the tenant's catalogue rows.
 *
 * One row per `(tenant_id, surface_id)` — the upsert target is the partial unique index
 * `permission_surfaces_tenant_surface_uidx`. A `declared` surface is **not** written here: the code
 * is its source of truth, and a row for it would only be a stale copy (`ghost`); the caller's
 * declaration stands. Only a `recorded` surface is persisted.
 */
export async function persistRecordedSurface(
  em: EntityManager,
  input: { tenantId: string | null | undefined; surface: PermissionSurface },
): Promise<SurfacePersistOutcome> {
  const surfaceId = input.surface?.id
  const tenantId = typeof input.tenantId === 'string' && input.tenantId.trim().length > 0
    ? input.tenantId.trim()
    : null

  if (!tenantId) {
    return {
      stored: false,
      surfaceId: String(surfaceId ?? ''),
      reason: 'no_tenant',
      because:
        'A surface cannot be recorded without a tenant: the catalogue is a per-tenant view, and a ' +
        'row with no tenant would be invisible to every tenant. The declaration still stands in code.',
    }
  }

  if (!isPermissionSurfaceId(surfaceId) || !isPermissionSurfaceKind(input.surface.kind)) {
    return {
      stored: false,
      surfaceId: String(surfaceId ?? ''),
      reason: 'invalid_surface',
      because:
        `"${String(surfaceId)}" is not a valid surface id (or its kind is unknown), so no row is ` +
        'written — a row the catalogue could not read back would be worse than no row.',
    }
  }

  // **Live rows only, stated explicitly.** The partial unique index is scoped to live rows
  // (`where deleted_at is null`), so the read must be too — otherwise a soft-deleted tombstone
  // would be "found" here and the write below would take the UPDATE branch without reviving it.
  // `filters: { softDelete: false }` does NOT do this: **no filter of that name is registered
  // anywhere in this codebase** (no `addFilter`/`@Filter` exists), so it is inert and would let a
  // tombstone match. The predicate is therefore written out (`deletedAt: null`) — the one form that
  // is guaranteed to reach SQL — and it matches the migration's index predicate exactly.
  const existing = await em.findOne(
    PermissionSurfaceRecord,
    { tenantId, surfaceId, deletedAt: null } as never,
  )

  if (existing) {
    existing.kind = input.surface.kind
    existing.owner = input.surface.owner
    existing.source = 'recorded'
    existing.featurePrefix = input.surface.featurePrefix ?? null
    // Defensive: a found row is a live row by the predicate above, but if a tombstone ever
    // reached here it must be revived rather than edited in place (else it stays invisible).
    if (existing.deletedAt) existing.deletedAt = null
    existing.updatedAt = new Date()
    await em.flush()
    return { stored: true, created: false, surfaceId }
  }

  const row = em.create(PermissionSurfaceRecord, {
    tenantId,
    surfaceId,
    kind: input.surface.kind,
    owner: input.surface.owner,
    source: 'recorded',
    featurePrefix: input.surface.featurePrefix ?? null,
    createdAt: new Date(),
  })
  await em.persist(row).flush()
  return { stored: true, created: true, surfaceId }
}

/**
 * Read a tenant's persisted surfaces.
 *
 * Returns `[]` on any read failure — a partial view is better than a boot that dies because the
 * catalogue table was momentarily unreachable. The caller supplies the entity manager so the read
 * runs in the caller's context (tenant filters, transaction), exactly like every other query here.
 */
export async function loadPersistedSurfaces(
  em: EntityManager,
  tenantId: string,
): Promise<PermissionSurface[]> {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) return []
  // Live rows only — the predicate is written out, not a named filter (see
  // `persistRecordedSurface`: no `softDelete` filter is registered, so naming one is inert).
  const rows = await em.find(
    PermissionSurfaceRecord,
    { tenantId: tenantId.trim(), deletedAt: null } as never,
  )
  const surfaces: PermissionSurface[] = []
  for (const row of rows) {
    if (!isPermissionSurfaceId(row.surfaceId) || !isPermissionSurfaceKind(row.kind)) continue
    surfaces.push({
      id: row.surfaceId,
      kind: row.kind as PermissionSurfaceKind,
      owner: row.owner,
      source: row.source === 'declared' ? 'declared' : 'recorded',
      ...(row.featurePrefix ? { featurePrefix: row.featurePrefix } : {}),
    })
  }
  return surfaces
}

/**
 * Hydrate the live catalogue from a tenant's persisted rows.
 *
 * **Additive, idempotent, and non-destructive** — see the file header. The catalogue's own
 * `recordSurface` already protects a `declared` surface from being downgraded, so a row that shadows
 * a declaration is a no-op. Returns how many rows were read, so a boot can log it.
 *
 * A read failure is swallowed to `0` and reported, never thrown: the running app keeps the
 * declarations it was built with and the platform stays up. This is the deliberate *soft-fail* that
 * matches the write half.
 */
export async function hydratePermissionCatalogue(
  em: EntityManager,
  tenantId: string,
): Promise<{ hydrated: number; error: string | null }> {
  try {
    const surfaces = await loadPersistedSurfaces(em, tenantId)
    for (const surface of surfaces) recordSurface(surface)
    return { hydrated: surfaces.length, error: null }
  } catch (err) {
    return { hydrated: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
