/**
 * What a project permits inside itself.
 *
 * The rule worth guarding is **terminal deny**: a project that forbids something
 * must forbid it whatever else matches and whatever order the rules were written
 * in. Platform 1 gets that by ending evaluation early; here it falls out of the
 * resolver's minimum, which is stronger — there is no evaluation order to get
 * wrong — but only if `projectCeilingFor` really does pick the deny.
 */
import {
  EMPTY_OVERLAY,
  parseProjectOverlay,
  projectCeilingFor,
} from '../project-overlays'
import type { CapabilityDescriptor } from '../capabilities'

function capability(overrides: Partial<CapabilityDescriptor> = {}): CapabilityDescriptor {
  return {
    id: 'customers.people.manage',
    module: 'customers',
    effectClass: 'E4',
    reversibility: 'reversible',
    ...overrides,
  } as CapabilityDescriptor
}

describe('a deny is terminal', () => {
  it('beats a permissive rule written after it', () => {
    const overlay = {
      rules: [
        { capabilityId: 'customers.people.manage', effect: 'deny' as const },
        { effectClass: 'E4' as const, effect: 'A5' as const },
      ],
    }
    expect(projectCeilingFor(overlay, capability())?.ceiling).toBe('A0')
  })

  it('beats a permissive rule written before it', () => {
    // Order must not matter. A rule set whose meaning depends on its ordering is
    // one nobody can review.
    const overlay = {
      rules: [
        { effectClass: 'E4' as const, effect: 'A5' as const },
        { capabilityId: 'customers.people.manage', effect: 'deny' as const },
      ],
    }
    expect(projectCeilingFor(overlay, capability())?.ceiling).toBe('A0')
  })

  it('reads as a prohibition rather than as a number', () => {
    // "This project forbids it" is what somebody meant; "permits at most A0" is
    // the arithmetic that happens to follow.
    const overlay = { rules: [{ effect: 'deny' as const, reason: 'sealed pending settlement' }] }
    const result = projectCeilingFor(overlay, capability())
    expect(result?.detail).toContain('forbids')
    expect(result?.detail).toContain('sealed pending settlement')
  })
})

describe('capping without denying', () => {
  it('takes the strictest gate when several match', () => {
    const overlay = {
      rules: [
        { effectClass: 'E4' as const, effect: 'A3' as const },
        { capabilityId: 'customers.people.manage', effect: 'A1' as const },
      ],
    }
    expect(projectCeilingFor(overlay, capability())?.ceiling).toBe('A1')
  })

  it('says nothing when no rule matches', () => {
    // `null`, not `A5`: an unremarkable act should produce no line in the
    // explanation at all.
    expect(projectCeilingFor({ rules: [{ effectClass: 'E1', effect: 'A0' }] }, capability())).toBeNull()
    expect(projectCeilingFor(EMPTY_OVERLAY, capability())).toBeNull()
  })

  it('matches every act when a rule names nothing', () => {
    const result = projectCeilingFor({ rules: [{ effect: 'A2' }] }, capability())
    expect(result?.ceiling).toBe('A2')
    expect(result?.detail).toContain('every act')
  })
})

describe('reading a stored overlay back', () => {
  it('survives anything that is not an overlay', () => {
    for (const value of [null, undefined, 'nope', 7, {}, { rules: {} }]) {
      expect(parseProjectOverlay(value)).toEqual(EMPTY_OVERLAY)
    }
  })

  it('drops a rule whose effect it cannot read', () => {
    const overlay = parseProjectOverlay({
      rules: [{ effect: 'maybe' }, { effect: 'deny' }],
    })
    expect(overlay.rules).toHaveLength(1)
    expect(overlay.rules[0].effect).toBe('deny')
  })

  it('keeps a deny even when everything else about it is unreadable', () => {
    // Dropping loosens, so the one rule that must survive a partial parse is the
    // one that forbids.
    const overlay = parseProjectOverlay({ rules: [{ effect: 'deny', capabilityId: 42 }] })
    expect(overlay.rules).toHaveLength(1)
    expect(overlay.rules[0].capabilityId).toBeUndefined()
  })

  it('accepts a gate as an effect', () => {
    expect(parseProjectOverlay({ rules: [{ effect: 'A2' }] }).rules[0].effect).toBe('A2')
  })
})
