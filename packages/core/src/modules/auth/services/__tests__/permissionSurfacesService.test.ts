/**
 * The persisted catalogue — the durable half of `M3e` (SD-1 / S2).
 *
 * **The defect these guard.** The catalogue kept its registry in a process-local `Map`, so a surface
 * that appeared at *runtime* (a custom field, a custom entity) was forgotten on the next restart, and
 * a second process never learned it. These tests keep the two halves honest against each other:
 *   - a **recorded** surface is written to `permission_surfaces` and read back, so a restart does not
 *     lose it;
 *   - a **declared** surface is *not* written as a shadow row and hydration **never downgrades** it;
 *   - a write with no tenant, or an unreadable surface id, is **refused with a reason** (never a row
 *     the catalogue could not read);
 *   - a **read failure does not take the app down** — hydration reports it and returns `0`, leaving
 *     the declarations in place.
 *
 * If somebody makes the write throw into the caller, or makes hydration destructive, these fail.
 */
import {
  clearPermissionCatalogue,
  declareSurfaces,
  getPermissionSurface,
  hasPermissionSurface,
  listPermissionSurfaces,
  type PermissionSurface,
} from '@open-mercato/shared/lib/permissions/catalogue'
import {
  hydratePermissionCatalogue,
  loadPersistedSurfaces,
  persistRecordedSurface,
  readTenantSurfaces,
} from '../permissionSurfacesService'

type Row = Record<string, unknown>

function makeEm(seed: { existing?: Row | null; rowsOnRead?: Row[]; throwOnRead?: boolean } = {}) {
  const created: Row[] = []
  const em = {
    async find() {
      if (seed.throwOnRead) throw new Error('connection reset')
      return seed.rowsOnRead ?? []
    },
    async findOne() {
      return seed.existing ?? null
    },
    create(_entity: unknown, data: Row) {
      const row = { id: `row-${created.length + 1}`, ...data }
      created.push(row)
      return row
    },
    persist() {
      return em
    },
    async flush() {},
  }
  return { em, created }
}

const TENANT = '11111111-1111-1111-1111-111111111111'

const recordedSurface: PermissionSurface = {
  id: 'customers:widget_panel',
  kind: 'object',
  owner: 'customers',
  source: 'recorded',
}

beforeEach(() => {
  clearPermissionCatalogue()
})

describe('persisting a runtime surface', () => {
  it('creates a row for a recorded surface and reports it created', async () => {
    const { em, created } = makeEm()
    const outcome = await persistRecordedSurface(em as never, { tenantId: TENANT, surface: recordedSurface })
    expect(outcome).toEqual({ stored: true, created: true, surfaceId: 'customers:widget_panel' })
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      tenantId: TENANT,
      surfaceId: 'customers:widget_panel',
      kind: 'object',
      owner: 'customers',
      source: 'recorded',
    })
  })

  it('updates an existing row instead of creating a second one (idempotent upsert)', async () => {
    const existing = { id: 'row-1', tenantId: TENANT, surfaceId: 'customers:widget_panel', kind: 'field', owner: 'old' }
    const { em, created } = makeEm({ existing })
    const outcome = await persistRecordedSurface(em as never, { tenantId: TENANT, surface: recordedSurface })
    expect(outcome).toEqual({ stored: true, created: false, surfaceId: 'customers:widget_panel' })
    expect(created).toHaveLength(0)
    expect(existing.kind).toBe('object')
    expect(existing.owner).toBe('customers')
    expect(existing.source).toBe('recorded')
  })

  it('refuses to write without a tenant, and says why', async () => {
    const { em, created } = makeEm()
    const outcome = await persistRecordedSurface(em as never, { tenantId: null, surface: recordedSurface })
    expect(outcome.stored).toBe(false)
    if (outcome.stored === false) {
      expect(outcome.reason).toBe('no_tenant')
      expect(outcome.because.length).toBeGreaterThan(0)
    }
    expect(created).toHaveLength(0)
  })

  it('refuses an unreadable surface id — a row the catalogue could not read is worse than none', async () => {
    const { em, created } = makeEm()
    const outcome = await persistRecordedSurface(em as never, {
      tenantId: TENANT,
      surface: { ...recordedSurface, id: 'not a valid id' },
    })
    expect(outcome.stored).toBe(false)
    if (outcome.stored === false) expect(outcome.reason).toBe('invalid_surface')
    expect(created).toHaveLength(0)
  })
})

/**
 * The tombstone predicate — the defect a hostile critic found in the first cut.
 *
 * The partial unique index is scoped to live rows (`where deleted_at is null`), so every read of
 * this table must be scoped the same way. The first version passed `{ filters: { softDelete: false } }`,
 * which is **inert** — no filter by that name is registered anywhere in the codebase — so a
 * soft-deleted tombstone matched, the write took the UPDATE branch, and the row stayed invisible.
 * These tests pin the predicate rather than trusting a named filter.
 */
describe('tombstone handling — the live-row predicate', () => {
  function makeEmCapturingQuery() {
    const queries: { findOne?: unknown; find?: unknown } = {}
    const em = {
      async find(_entity: unknown, where: unknown) {
        queries.find = where
        return []
      },
      async findOne(_entity: unknown, where: unknown) {
        queries.findOne = where
        return null
      },
      create(_entity: unknown, data: Row) {
        return { id: 'row-1', ...data }
      },
      persist() {
        return em
      },
      async flush() {},
    }
    return { em, queries }
  }

  it('the upsert lookup asks for a LIVE row only (deletedAt: null), never an inert named filter', async () => {
    const { em, queries } = makeEmCapturingQuery()
    await persistRecordedSurface(em as never, { tenantId: TENANT, surface: recordedSurface })
    expect(queries.findOne).toMatchObject({ tenantId: TENANT, surfaceId: 'customers:widget_panel', deletedAt: null })
  })

  it('the boot read asks for LIVE rows only (deletedAt: null)', async () => {
    const { em, queries } = makeEmCapturingQuery()
    await loadPersistedSurfaces(em as never, TENANT)
    expect(queries.find).toMatchObject({ tenantId: TENANT, deletedAt: null })
  })

  it('revives a found tombstone rather than editing it in place', async () => {
    // If a tombstone ever reaches the update branch, it must be un-deleted — not silently edited
    // while `deletedAt` stays set (which is what leaves a surface invisible).
    const tombstone = {
      id: 'row-1', tenantId: TENANT, surfaceId: 'customers:widget_panel',
      kind: 'field', owner: 'old', source: 'recorded', deletedAt: new Date('2026-01-01'),
    }
    const { em } = makeEm({ existing: tombstone })
    await persistRecordedSurface(em as never, { tenantId: TENANT, surface: recordedSurface })
    expect(tombstone.deletedAt).toBeNull()
  })
})

describe('reading a tenant’s surfaces back', () => {
  it('returns the rows the tenant has, decoded', async () => {
    const { em } = makeEm({
      rowsOnRead: [
        { surfaceId: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded', featurePrefix: null },
        { surfaceId: 'catalog:product', kind: 'object', owner: 'catalog', source: 'declared', featurePrefix: 'x.y' },
      ],
    })
    const surfaces = await loadPersistedSurfaces(em as never, TENANT)
    expect(surfaces).toHaveLength(2)
    expect(surfaces[0]).toEqual({ id: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' })
    expect(surfaces[1]).toMatchObject({ id: 'catalog:product', source: 'declared', featurePrefix: 'x.y' })
  })

  it('skips a row whose surface id or kind cannot be read', async () => {
    const { em } = makeEm({
      rowsOnRead: [
        { surfaceId: 'bad id', kind: 'object', owner: 'x', source: 'recorded' },
        { surfaceId: 'ok:surface', kind: 'nonsense', owner: 'x', source: 'recorded' },
        { surfaceId: 'good:surface', kind: 'field', owner: 'x', source: 'recorded' },
      ],
    })
    const surfaces = await loadPersistedSurfaces(em as never, TENANT)
    expect(surfaces.map((s) => s.id)).toEqual(['good:surface'])
  })

  it('returns [] for an empty tenant id (no query issued)', async () => {
    const { em } = makeEm({ rowsOnRead: [{ surfaceId: 'x:y', kind: 'object', owner: 'o', source: 'recorded' }] })
    expect(await loadPersistedSurfaces(em as never, '   ')).toEqual([])
  })
})

describe('hydrating the live catalogue', () => {
  it('reads the rows back and they are then visible in the catalogue', async () => {
    const { em } = makeEm({
      rowsOnRead: [{ surfaceId: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' }],
    })
    const result = await hydratePermissionCatalogue(em as never, TENANT)
    expect(result).toEqual({ hydrated: 1, error: null })
    expect(hasPermissionSurface('customers:widget_panel')).toBe(true)
    expect(getPermissionSurface('customers:widget_panel')?.owner).toBe('customers')
  })

  it('NEVER downgrades a declared surface, while still adding a recorded one from the same read', async () => {
    // Coupled to the change on purpose: a test that only declares `auth.users` and asserts it is
    // unchanged would pass with hydration **entirely removed** (the guard lives in the pre-existing
    // `recordSurface`), so it would prove nothing about this service. By putting a *recorded* row in
    // the same read and asserting it *is* added, the test proves hydration ran — and only then does
    // the "declared wins" assertion mean something.
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({
      rowsOnRead: [
        { surfaceId: 'auth.users', kind: 'object', owner: 'somebody-else', source: 'recorded' },
        { surfaceId: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' },
      ],
    })
    const result = await hydratePermissionCatalogue(em as never, TENANT)
    // Hydration demonstrably ran (the recorded row landed)…
    expect(result).toEqual({ hydrated: 2, error: null })
    expect(hasPermissionSurface('customers:widget_panel')).toBe(true)
    // …and the declared surface was not downgraded by the shadow row.
    expect(getPermissionSurface('auth.users')?.source).toBe('declared')
    expect(getPermissionSurface('auth.users')?.owner).toBe('auth')
  })

  it('is additive and idempotent across two boots', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({ rowsOnRead: [{ surfaceId: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' }] })
    await hydratePermissionCatalogue(em as never, TENANT)
    await hydratePermissionCatalogue(em as never, TENANT)
    expect(listPermissionSurfaces().length).toBe(2)
  })

  it('a read failure does NOT take the app down — it reports and keeps the declarations', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({ throwOnRead: true })
    const result = await hydratePermissionCatalogue(em as never, TENANT)
    expect(result.hydrated).toBe(0)
    expect(result.error).toBe('connection reset')
    // The declaration it was built with is still there — a partial view, not an emptied catalogue.
    expect(hasPermissionSurface('auth.users')).toBe(true)
  })
})

/**
 * The live consumer (`P3b` / `M3e`, row 9's read half) — and the cross-tenant defect it exists to
 * prevent.
 *
 * The catalogue's registry is a **process-global `Map`**, but a *recorded* surface belongs to one
 * tenant. So an answer read from the raw global map would hand tenant B whatever tenant A's request
 * happened to leave there — a data leak that depends only on request *order*. These tests pin the
 * tenant-scoped answer: declared (global) + **exactly this tenant's own rows**, nothing else.
 */
describe('the live consumer — reading the catalogue back for one tenant', () => {
  const TENANT_B = '22222222-2222-2222-2222-222222222222'

  it('returns the declared surfaces even with no rows', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({ rowsOnRead: [] })
    const view = await readTenantSurfaces(em as never, TENANT)
    expect(view.recorded).toBe(0)
    expect(view.error).toBeNull()
    expect(view.surfaces.map((s) => s.id)).toEqual(['auth.users'])
  })

  it('returns this tenant’s recorded rows alongside the declared surfaces', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({
      rowsOnRead: [{ surfaceId: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' }],
    })
    const view = await readTenantSurfaces(em as never, TENANT)
    expect(view.recorded).toBe(1)
    expect(view.surfaces.map((s) => s.id).sort()).toEqual(['auth.users', 'customers:widget_panel'])
  })

  it('does NOT leak another tenant’s recorded surface, even after that tenant hydrated the map', async () => {
    // Tenant A records its surface first — this is what puts it in the process-global map.
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const tenantA = { rowsOnRead: [{ surfaceId: 'customers:widget_panel', kind: 'object', owner: 'customers', source: 'recorded' }] }
    await readTenantSurfaces(makeEm(tenantA).em as never, TENANT)
    expect(hasPermissionSurface('customers:widget_panel')).toBe(true) // now in the global map

    // Tenant B has no recorded rows. Its answer must not include A's surface.
    const { em } = makeEm({ rowsOnRead: [] })
    const view = await readTenantSurfaces(em as never, TENANT_B)
    expect(view.recorded).toBe(0)
    expect(view.surfaces.map((s) => s.id)).toEqual(['auth.users'])
    expect(view.surfaces.some((s) => s.id === 'customers:widget_panel')).toBe(false)
  })

  it('never lets a recorded row shadow a declared surface (declared wins)', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({
      rowsOnRead: [{ surfaceId: 'auth.users', kind: 'object', owner: 'somebody-else', source: 'recorded' }],
    })
    const view = await readTenantSurfaces(em as never, TENANT)
    const users = view.surfaces.find((s) => s.id === 'auth.users')
    expect(users?.source).toBe('declared')
    expect(users?.owner).toBe('auth')
  })

  it('a read failure still answers, with the declared surfaces and a reported error', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    const { em } = makeEm({ throwOnRead: true })
    const view = await readTenantSurfaces(em as never, TENANT)
    expect(view.recorded).toBe(0)
    expect(view.error).toBe('connection reset')
    expect(view.surfaces.map((s) => s.id)).toEqual(['auth.users'])
  })

  it('with no tenant, answers the declared (global) surfaces and issues no query', async () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    let queried = false
    const em = {
      async find() {
        queried = true
        return []
      },
    }
    const view = await readTenantSurfaces(em as never, null)
    expect(view.surfaces.map((s) => s.id)).toEqual(['auth.users'])
    expect(view.recorded).toBe(0)
    expect(queried).toBe(false)
  })
})
