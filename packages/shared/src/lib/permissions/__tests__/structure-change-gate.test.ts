/**
 * SD-1 — the structure-change gate (S2).
 *
 * **What this suite has to prove.** The gate is the permissions question made
 * unskippable. The easy half is "it applies the default"; the load-bearing half is
 * that it **refuses** — a gate that cannot refuse is decoration. So the refusals
 * are the majority here on purpose, each proven against the exact input that must
 * trigger it:
 *
 *   - a change that creates nothing;
 *   - an id the platform's matcher could not read;
 *   - a kind nobody recognises;
 *   - a decision that grants nothing.
 *
 * And the default is proven to carry **both blocks** (data + structural) and to
 * **reuse the platform's own entity record ids** — so the gate cannot hand back a
 * scheme the enforcement does not read.
 */

import { evaluateStructureChange, DEFAULT_GRANT_ROLE, type StructurePermissionDecision } from '../structure-change-gate'
import type { PermissionSurface } from '../catalogue'

const entitySurface: PermissionSurface = {
  id: 'customers:customer_person',
  kind: 'object',
  owner: 'entities',
  source: 'recorded',
  featurePrefix: 'entities.records.customers:customer_person',
}

const fieldSurface: PermissionSurface = {
  id: 'customers:customer_person.loyalty_tier',
  kind: 'field',
  owner: 'entities',
  source: 'recorded',
}

describe('refusals — the load-bearing half', () => {
  it('refuses a change that creates no surface', () => {
    const result = evaluateStructureChange({ surfaces: [] })
    expect(result.outcome).toBe('refused')
    if (result.outcome === 'refused') expect(result.reason).toBe('no_surface')
  })

  it('refuses a malformed surface id, before consulting a decision', () => {
    const result = evaluateStructureChange({
      surfaces: [{ id: 'not a surface', kind: 'object', owner: 'x', source: 'recorded' }],
      // A decision cannot make an unreadable id readable — the malformed check wins.
      decision: { decidedBy: 'admin', records: [{ feature: 'x.y.view', block: 'data', surfaceId: 'x.y' }] },
    })
    expect(result.outcome).toBe('refused')
    if (result.outcome === 'refused') expect(result.reason).toBe('malformed_surface_id')
  })

  it('refuses an unrecognised surface kind — an unknown is never treated as safe', () => {
    const result = evaluateStructureChange({
      surfaces: [{ id: 'x.y', kind: 'nonsense', owner: 'x', source: 'recorded' } as unknown as PermissionSurface],
    })
    expect(result.outcome).toBe('refused')
    if (result.outcome === 'refused') expect(result.reason).toBe('unrecognised_surface_kind')
  })

  it('refuses a decision that grants nothing — "I decided" must not mean "I decided nothing"', () => {
    const result = evaluateStructureChange({
      surfaces: [entitySurface],
      decision: { decidedBy: 'admin', records: [] },
    })
    expect(result.outcome).toBe('refused')
    if (result.outcome === 'refused') expect(result.reason).toBe('empty_decision')
  })

  it('refuses a malformed featurePrefix — the fail-open a hostile critic found', () => {
    const result = evaluateStructureChange({
      surfaces: [
        { id: 'auth.users', kind: 'object', owner: 'auth', source: 'recorded', featurePrefix: 'bad prefix /x' },
      ],
    })
    expect(result.outcome).toBe('refused')
    if (result.outcome === 'refused') expect(result.reason).toBe('malformed_surface_id')
  })

  it('never throws on hostile input — a caller on the change path must not have to wrap it', () => {
    expect(() => evaluateStructureChange({ surfaces: undefined as never })).not.toThrow()
    expect(() => evaluateStructureChange({} as never)).not.toThrow()
    expect(evaluateStructureChange({ surfaces: undefined as never }).outcome).toBe('refused')
  })
})

describe('the default — full grant to superadmin, plus the records', () => {
  it('defaults when no decision is recorded', () => {
    const result = evaluateStructureChange({ surfaces: [entitySurface] })
    expect(result.outcome).toBe('defaulted')
    if (result.outcome === 'defaulted') {
      expect(result.grantTo).toBe(DEFAULT_GRANT_ROLE)
      expect(result.grantTo).toBe('superadmin')
    }
  })

  it('the default carries BOTH blocks (data + the full structural verb set), reusing the platform’s entity ids', () => {
    const result = evaluateStructureChange({ surfaces: [entitySurface] })
    expect(result.outcome).toBe('defaulted')
    if (result.outcome === 'defaulted') {
      expect(result.records.map((r) => r.feature)).toEqual([
        'entities.records.customers:customer_person.view',
        'entities.records.customers:customer_person.manage',
        'entities.records.customers:customer_person.read',
        'entities.records.customers:customer_person.add',
        'entities.records.customers:customer_person.edit',
        'entities.records.customers:customer_person.remove',
        'entities.records.customers:customer_person.reference',
      ])
      // SD-4 Slice C: the structural block is the S11 grammar — five verbs.
      expect(result.records.filter((r) => r.block === 'structural')).toHaveLength(5)
    }
  })

  it('covers every surface, deduplicating records that repeat', () => {
    const result = evaluateStructureChange({ surfaces: [fieldSurface, fieldSurface] })
    expect(result.outcome).toBe('defaulted')
    if (result.outcome === 'defaulted') {
      const features = result.records.map((r) => r.feature)
      expect(features).toEqual([
        'customers:customer_person.loyalty_tier.view',
        'customers:customer_person.loyalty_tier.manage',
        'customers:customer_person.loyalty_tier.read',
        'customers:customer_person.loyalty_tier.add',
        'customers:customer_person.loyalty_tier.edit',
        'customers:customer_person.loyalty_tier.remove',
        'customers:customer_person.loyalty_tier.reference',
      ])
      expect(new Set(features).size).toBe(features.length)
    }
  })
})

describe('a decision decides, and is carried through unchanged', () => {
  it('returns the decision’s records when a person decided', () => {
    const decision: StructurePermissionDecision = {
      decidedBy: 'role:finance-admin',
      records: [
        { feature: 'customers:customer_person.loyalty_tier.view', block: 'data', surfaceId: fieldSurface.id },
        { feature: 'customers:customer_person.loyalty_tier.manage', block: 'data', surfaceId: fieldSurface.id },
        { feature: 'customers:customer_person.loyalty_tier.structure', block: 'structural', surfaceId: fieldSurface.id },
      ],
    }
    const result = evaluateStructureChange({ surfaces: [fieldSurface], decision })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') {
      expect(result.decidedBy).toBe('role:finance-admin')
      expect(result.records).toHaveLength(3)
    }
  })

  it('does not fall through to the default when a decision is present', () => {
    const result = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: { decidedBy: 'admin', records: [{ feature: 'only.this', block: 'data', surfaceId: fieldSurface.id }] },
    })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') expect(result.records.map((r) => r.feature)).toEqual(['only.this'])
  })
})

/**
 * CC-17 — the grant target on a decision, which is what makes `decided` writable.
 *
 * Before CC-17 a `decided` outcome named only `decidedBy` and the records, so the
 * write had **nowhere to put them** and deliberately returned `null`. S2 says the
 * permissions are decided *"either by a person or by a rule"*: a person deciding is
 * not just a different `decidedBy`, it is a different **target** (a narrow role, not
 * the default superadmin). These tests pin that the target travels with the decision
 * and that the default is the fallback, not the only answer.
 */
describe('CC-17 — a decided outcome names the role its records go to', () => {
  const records = [{ feature: 'only.this', block: 'data' as const, surfaceId: fieldSurface.id }]

  it('carries the decision’s own grantTo through to the outcome', () => {
    const result = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: { decidedBy: 'role:finance-admin', records, grantTo: 'finance' },
    })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') {
      expect(result.grantTo).toBe('finance')
      expect(result.because).toContain('finance')
    }
  })

  it('falls back to the default role when the decision names no target', () => {
    const result = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: { decidedBy: 'admin', records },
    })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') expect(result.grantTo).toBe(DEFAULT_GRANT_ROLE)
  })

  it('treats a blank/whitespace grantTo as "no target" rather than a role named ""', () => {
    const result = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: { decidedBy: 'admin', records, grantTo: '   ' },
    })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') expect(result.grantTo).toBe(DEFAULT_GRANT_ROLE)
  })

  it('trims a padded grantTo, so "finance " and "finance" resolve to one role', () => {
    const result = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: { decidedBy: 'admin', records, grantTo: '  finance  ' },
    })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') expect(result.grantTo).toBe('finance')
  })

  it('a decided outcome has a grantTo even though a refused outcome has none', () => {
    const decided = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: { decidedBy: 'admin', records, grantTo: 'finance' },
    })
    // The one field that makes `decided` writable — asserted directly so a future
    // refactor that drops it fails here rather than silently in the write.
    expect(decided).toHaveProperty('grantTo', 'finance')
  })
})
