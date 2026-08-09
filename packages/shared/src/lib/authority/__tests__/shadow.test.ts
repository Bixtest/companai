/**
 * Shadow mode — the resolver runs beside the decision and changes nothing.
 *
 * Two properties matter more than any individual comparison: **it never alters
 * an answer**, and **it never throws**. A diagnostic that can break the thing it
 * observes has inverted its own purpose, and the only way to be sure of that is
 * to test it against the failures rather than to assert it in a comment.
 */

import {
  compareWithResolver,
  isShadowEnabled,
  recordShadowDecision,
  type ShadowInput,
} from '../shadow'
import type { CapabilityDescriptor } from '../../../modules/capabilities'

const reversibleWrite: CapabilityDescriptor = {
  id: 'customers.person.edit',
  module: 'customers',
  effectClass: 'E1',
  reversibility: 'reversible',
}

const destructive: CapabilityDescriptor = {
  id: 'attachments.manage',
  module: 'attachments',
  effectClass: 'E6',
  reversibility: 'irreversible',
}

const input = (overrides: Partial<ShadowInput> = {}): ShadowInput => ({
  actorKind: 'human',
  actorId: 'user-1',
  legacyAllowed: true,
  capability: reversibleWrite,
  ...overrides,
})

describe('the shadow never changes anything', () => {
  it('returns nothing a caller could act on', () => {
    expect(recordShadowDecision(input())).toBeUndefined()
  })

  it('does not throw when the resolver is given nonsense', () => {
    const broken = { ...input(), capability: null as unknown as CapabilityDescriptor }
    expect(() => recordShadowDecision(broken)).not.toThrow()
  })

  it('does not throw when the actor kind is unrecognised', () => {
    const odd = { ...input(), actorKind: 'martian' as never }
    expect(() => recordShadowDecision(odd)).not.toThrow()
  })
})

describe('what it measures', () => {
  it('treats the legacy answer as the grant rather than re-deriving it', () => {
    // Re-deriving RBAC would only test whether two copies of one lookup agree.
    // The question is what the resolver adds on top of the existing answer.
    const denied = compareWithResolver(input({ legacyAllowed: false }))

    expect(denied?.resolverAllows).toBe(false)
    expect(denied?.bindingRule).toBe('grant')
    expect(denied?.disagrees).toBe(false)
  })

  it('records an obligation the platform does not currently impose', () => {
    // The interesting number: not a disagreement, but the work the governance
    // layer would begin doing on the day it is switched on.
    const comparison = compareWithResolver(input({ capability: destructive }))

    expect(comparison?.legacyAllowed).toBe(true)
    expect(comparison?.resolverAllows).toBe(true)
    expect(comparison?.wouldAddObligation).toBe(true)
  })

  it('does not count an unattended act as adding an obligation', () => {
    const comparison = compareWithResolver(input({ capability: { ...reversibleWrite, effectClass: 'E0' } }))

    expect(comparison?.gate).toBe('A5')
    expect(comparison?.wouldAddObligation).toBe(false)
  })

  it('flags a real disagreement when the resolver would block what RBAC allows', () => {
    const comparison = compareWithResolver(
      input({ capability: destructive, graphCeiling: 'A0', graphCeilingDetail: 'reference-only engagement' }),
    )

    expect(comparison?.legacyAllowed).toBe(true)
    expect(comparison?.resolverAllows).toBe(false)
    expect(comparison?.disagrees).toBe(true)
  })

  it('names the binding rule, so a log line can be grouped by cause', () => {
    const comparison = compareWithResolver(input({ actorKind: 'ai_worker' }))

    expect(comparison?.bindingRule).toBe('untrusted-machine')
  })
})

describe('the switch', () => {
  it('is on by default, because evidence nobody collects is evidence nobody has', () => {
    expect(isShadowEnabled({})).toBe(true)
  })

  it.each(['off', 'OFF', 'false', '0'])('is off for %s', (value) => {
    expect(isShadowEnabled({ OM_AUTHORITY_SHADOW: value })).toBe(false)
  })

  it('stays on for anything else, rather than guessing at intent', () => {
    expect(isShadowEnabled({ OM_AUTHORITY_SHADOW: 'yes' })).toBe(true)
  })
})
