/**
 * SD-1 — the permission catalogue (S2 / M3).
 *
 * **What this suite has to prove.** The catalogue is the one place that answers
 * *what records does a surface yield*. Three things make it real, and each is
 * tested against the case that would break it:
 *
 *   1. **It yields both blocks** (amended S2): a data block (`view`/`manage`) and a
 *      structural block (`structure`). A catalogue that yielded only the data block
 *      would silently drop half the standard.
 *   2. **It reuses the platform's own ids where one exists** — an entity surface
 *      with a `featurePrefix` produces exactly the ids `recordFeatures.ts` derives,
 *      so the catalogue and enforcement cannot drift (S5: one engine, never a
 *      second one).
 *   3. **It fails closed at the edge** — an unrecognised kind or a malformed id
 *      yields **no** records, which is what lets the gate refuse. A throw here
 *      would be swallowed somewhere up the stack, which is the fail-open this item
 *      exists to close.
 */

import {
  clearPermissionCatalogue,
  declareSurfaces,
  getPermissionSurface,
  hasPermissionSurface,
  hydrateCatalogueFromFeatures,
  isPermissionSurfaceId,
  isPermissionSurfaceKind,
  listPermissionSurfaces,
  objectSurfaceIdFromFeatureId,
  permissionRecordsFor,
  recordSurface,
  STRUCTURAL_ENFORCED_VERBS,
  STRUCTURAL_VERBS,
  type PermissionSurface,
} from '../catalogue'

beforeEach(() => {
  clearPermissionCatalogue()
})

describe('permissionRecordsFor — the two blocks (amended S2)', () => {
  it('yields a data block (view/manage) and the FULL per-verb structural block (S11)', () => {
    const surface: PermissionSurface = { id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }
    const records = permissionRecordsFor(surface)

    // SD-4 Slice C: the structural block is the S11 grammar — five verbs — not the
    // single `structure` record it was before. The order is declaration order.
    expect(records.map((r) => r.feature)).toEqual([
      'auth.users.view',
      'auth.users.manage',
      'auth.users.read',
      'auth.users.add',
      'auth.users.edit',
      'auth.users.remove',
      'auth.users.reference',
    ])
    expect(records.map((r) => r.block)).toEqual([
      'data',
      'data',
      'structural',
      'structural',
      'structural',
      'structural',
      'structural',
    ])
    expect(records.every((r) => r.surfaceId === 'auth.users')).toBe(true)
  })

  it('the structural block is exactly the declared S11 verb set (no drift)', () => {
    const surface: PermissionSurface = { id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }
    const structural = permissionRecordsFor(surface)
      .filter((r) => r.block === 'structural')
      .map((r) => r.feature.split('.').pop())
    expect(structural).toEqual([...STRUCTURAL_VERBS])
    // The enforced subset is the write verbs; read/reference are declared, not enforced.
    expect(structural).toEqual(expect.arrayContaining([...STRUCTURAL_ENFORCED_VERBS]))
  })

  it('uses featurePrefix when supplied, so an entity matches the platform’s own ids', () => {
    // The exact id `deriveCustomEntityRecordFeature` produces, so the catalogue
    // cannot drift from enforcement.
    const surface: PermissionSurface = {
      id: 'customers:customer_person',
      kind: 'object',
      owner: 'entities',
      source: 'recorded',
      featurePrefix: 'entities.records.customers:customer_person',
    }
    const features = permissionRecordsFor(surface).map((r) => r.feature)

    expect(features).toEqual([
      'entities.records.customers:customer_person.view',
      'entities.records.customers:customer_person.manage',
      'entities.records.customers:customer_person.read',
      'entities.records.customers:customer_person.add',
      'entities.records.customers:customer_person.edit',
      'entities.records.customers:customer_person.remove',
      'entities.records.customers:customer_person.reference',
    ])
  })

  it('yields no records for an unrecognised kind (the gate reads this as a refusal)', () => {
    const surface = { id: 'x.y', kind: 'nonsense', owner: 'x', source: 'declared' } as unknown as PermissionSurface
    expect(permissionRecordsFor(surface)).toEqual([])
  })

  it('yields no records for a malformed surface id', () => {
    for (const bad of ['', 'a b', '.a', 'a:', 'a..b', 'A/B']) {
      const surface: PermissionSurface = { id: bad, kind: 'object', owner: 'x', source: 'declared' }
      expect(permissionRecordsFor(surface)).toEqual([])
    }
  })

  it('yields no records for a malformed featurePrefix (the fail-open a critic found)', () => {
    // A valid id is not enough: the prefix builds the record ids, so an unreadable
    // prefix yields unreadable records. Returning [] is what lets the gate refuse.
    const surface: PermissionSurface = {
      id: 'auth.users',
      kind: 'object',
      owner: 'auth',
      source: 'recorded',
      featurePrefix: 'bad prefix /x',
    }
    expect(permissionRecordsFor(surface)).toEqual([])
  })
})

describe('surface-id and surface-kind validation', () => {
  it('accepts both the feature (dotted) and entity (colon) vocabularies', () => {
    for (const good of ['auth.users', 'customers:customer_person', 'customers:customer_person.loyalty_tier', 'a', 'a1_b.c2']) {
      expect(isPermissionSurfaceId(good)).toBe(true)
    }
  })

  it('rejects ids a matcher could not read', () => {
    for (const bad of ['', ' ', 'a b', '.a', 'a.', 'a:', ':a', 'a..b', 'a::b', null, undefined, 42]) {
      expect(isPermissionSurfaceId(bad as unknown)).toBe(false)
    }
  })

  it('recognises only the declared surface kinds', () => {
    expect(isPermissionSurfaceKind('object')).toBe(true)
    expect(isPermissionSurfaceKind('field')).toBe(true)
    expect(isPermissionSurfaceKind('function')).toBe(true)
    expect(isPermissionSurfaceKind('nonsense')).toBe(false)
    expect(isPermissionSurfaceKind(null)).toBe(false)
  })
})

describe('the registry — declare, record, look up', () => {
  it('declares and reads back a surface', () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    expect(hasPermissionSurface('auth.users')).toBe(true)
    expect(getPermissionSurface('auth.users')?.source).toBe('declared')
  })

  it('records a runtime surface', () => {
    recordSurface({ id: 'customers:customer_person.loyalty_tier', kind: 'field', owner: 'entities', source: 'recorded' })
    expect(getPermissionSurface('customers:customer_person.loyalty_tier')?.source).toBe('recorded')
  })

  it('never downgrades a declared surface to recorded (declared wins)', () => {
    declareSurfaces([{ id: 'auth.users', kind: 'object', owner: 'auth', source: 'declared' }])
    recordSurface({ id: 'auth.users', kind: 'object', owner: 'entities', source: 'recorded' })
    expect(getPermissionSurface('auth.users')?.source).toBe('declared')
    expect(getPermissionSurface('auth.users')?.owner).toBe('auth')
  })

  it('ignores a declaration with a malformed id', () => {
    declareSurfaces([{ id: 'not a surface', kind: 'object', owner: 'x', source: 'declared' }])
    expect(listPermissionSurfaces()).toEqual([])
  })
})

describe('hydrateCatalogueFromFeatures — declared objects from the ACL declarations', () => {
  it('derives the object half of a three-segment feature id', () => {
    hydrateCatalogueFromFeatures([
      { id: 'auth.users.create', module: 'auth' },
      { id: 'catalog.products.view', module: 'catalog' },
    ])
    expect(getPermissionSurface('auth.users')).not.toBeNull()
    expect(getPermissionSurface('catalog.products')).not.toBeNull()
    expect(getPermissionSurface('auth.users')?.owner).toBe('auth')
  })

  it('does not guess an object from a two-segment id', () => {
    expect(objectSurfaceIdFromFeatureId('currencies.view')).toBeNull()
    expect(objectSurfaceIdFromFeatureId('auth.users.create')).toBe('auth.users')
  })

  it('records a derived surface as declared, so it cannot be downgraded', () => {
    hydrateCatalogueFromFeatures([{ id: 'auth.users.create', module: 'auth' }])
    expect(getPermissionSurface('auth.users')?.source).toBe('declared')
  })
})
