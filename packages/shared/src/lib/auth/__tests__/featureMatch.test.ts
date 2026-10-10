import {
  extractFeatureStrings,
  featureScope,
  featureString,
  hasAllFeatures,
  hasOwnScopeGrant,
  isOwnScoped,
  matchFeature,
  stripOwnScope,
} from '../featureMatch'

describe('featureString', () => {
  it('returns raw string entries unchanged', () => {
    expect(featureString('catalog.view')).toBe('catalog.view')
  })

  it('reads the id from structured feature entries', () => {
    expect(featureString({ id: 'catalog.edit', title: 'Edit catalog' })).toBe('catalog.edit')
  })
})

describe('featureScope', () => {
  it('returns the whole feature id when there is no nested segment', () => {
    expect(featureScope('catalog')).toBe('catalog')
  })

  it('returns the top-level scope for nested feature ids', () => {
    expect(featureScope('catalog.products.edit')).toBe('catalog')
    expect(featureScope('catalog.*')).toBe('catalog')
  })
})

describe('extractFeatureStrings', () => {
  it('normalizes mixed feature entry arrays into string ids', () => {
    expect(
      extractFeatureStrings([
        'catalog.view',
        { id: 'sales.edit', module: 'sales', title: 'Edit sales' },
      ]),
    ).toEqual(['catalog.view', 'sales.edit'])
  })
})

describe('matchFeature', () => {
  it('matches exact feature ids', () => {
    expect(matchFeature('catalog.view', 'catalog.view')).toBe(true)
    expect(matchFeature('catalog.view', 'catalog.edit')).toBe(false)
  })

  it('accepts the global wildcard grant', () => {
    expect(matchFeature('catalog.view', '*')).toBe(true)
  })

  it('matches module wildcards against nested features and the bare prefix', () => {
    expect(matchFeature('catalog.products.edit', 'catalog.*')).toBe(true)
    expect(matchFeature('catalog', 'catalog.*')).toBe(true)
  })

  it('does not treat partial prefixes as module matches', () => {
    expect(matchFeature('cataloging.view', 'catalog.*')).toBe(false)
    expect(matchFeature('sales.view', 'catalog.*')).toBe(false)
  })
})

describe('hasAllFeatures', () => {
  it('returns true when no features are required', () => {
    expect(hasAllFeatures([], ['catalog.*'])).toBe(true)
  })

  it('returns false when features are required but none are granted', () => {
    expect(hasAllFeatures(['catalog.view'], [])).toBe(false)
  })

  it('returns true when every required feature is satisfied', () => {
    expect(hasAllFeatures(['catalog.view', 'sales.edit'], ['catalog.*', 'sales.edit'])).toBe(true)
  })

  it('returns false when any required feature is missing', () => {
    expect(hasAllFeatures(['catalog.view', 'sales.edit'], ['catalog.*'])).toBe(false)
  })
})

// Row 16 (Option A) — the `.own` row-scope modifier. A2: the modifier is a
// separate capability, parsed by its own helpers, and MUST NOT change
// `matchFeature` semantics (otherwise granting `.own` would silently satisfy a
// plain feature requirement, or vice-versa).
describe('own row-scope modifier', () => {
  it('detects the `.own` suffix', () => {
    expect(isOwnScoped('customers.customer_person.view.own')).toBe(true)
    expect(isOwnScoped('customers.customer_person.view')).toBe(false)
    expect(isOwnScoped('catalog.*')).toBe(false)
    expect(isOwnScoped('')).toBe(false)
  })

  it('strips a trailing `.own` and leaves other ids unchanged', () => {
    expect(stripOwnScope('api_keys.view.own')).toBe('api_keys.view')
    expect(stripOwnScope('api_keys.view')).toBe('api_keys.view')
    expect(stripOwnScope('api_keys.*')).toBe('api_keys.*')
  })

  it('reports an own-scope grant only for the exact feature', () => {
    expect(hasOwnScopeGrant(['api_keys.view.own'], 'api_keys.view')).toBe(true)
    expect(hasOwnScopeGrant(['api_keys.view.own'], 'api_keys.create')).toBe(false)
    expect(hasOwnScopeGrant(['api_keys.view'], 'api_keys.view')).toBe(false)
    expect(hasOwnScopeGrant([], 'api_keys.view')).toBe(false)
    expect(hasOwnScopeGrant(undefined, 'api_keys.view')).toBe(false)
    expect(hasOwnScopeGrant(null, 'api_keys.view')).toBe(false)
  })

  it('does NOT change matchFeature: `.own` and the plain feature are distinct', () => {
    // A plain grant must not satisfy an `.own` requirement...
    expect(matchFeature('api_keys.view.own', 'api_keys.view')).toBe(false)
    // ...and an `.own` grant must not satisfy a plain requirement...
    expect(matchFeature('api_keys.view', 'api_keys.view.own')).toBe(false)
    // ...while the module wildcard still reaches both (unchanged semantics).
    expect(matchFeature('api_keys.view.own', 'api_keys.*')).toBe(true)
    expect(matchFeature('api_keys.view', 'api_keys.*')).toBe(true)
  })
})
