/**
 * The taxonomy — the three endings, and the properties that keep them apart (G-21).
 *
 * The positive path is asserted first, everywhere: the three outcomes exist and are
 * distinguishable, a valid placement is built, and a real Function is accepted. Only
 * then the refusals. A suite of only refusals would pass against a taxonomy that
 * refused everything.
 */

import {
  REQUEST_OUTCOMES,
  CHANGE_RISK_TIERS,
  UNRECOGNISED_CHANGE_TIER,
  functionPlacement,
} from '../types'

describe('the three outcomes', () => {
  it('names exactly the three endings the owner described, in his order', () => {
    // The owner's order is: a one-time result, a step of architecture, then a
    // permanent Function. Asserting the order keeps a later edit from quietly
    // renumbering a distinction that is the whole point of this module.
    expect(REQUEST_OUTCOMES).toEqual(['ephemeral_answer', 'model_proposal', 'function_candidate'])
  })

  it('names the vision\'s own three risk tiers, and no invented ones', () => {
    // Doc 04 §130-§132. An earlier draft invented a parallel small/large split; this
    // assertion is what stops a second scheme being added beside this one.
    expect(CHANGE_RISK_TIERS).toEqual(['safe', 'review_required', 'explicit_approval'])
  })

  it('fails closed: an unrecognised change is the strictest tier, never safe', () => {
    // If this ever read `safe`, an unrecognised change would be allowed to proceed
    // on its own — "we did not recognise this" would become evidence of harmlessness.
    expect(UNRECOGNISED_CHANGE_TIER).toBe('explicit_approval')
  })
})

describe('a Function placement', () => {
  it('accepts a canonical path and keeps the label as display metadata', () => {
    const placement = functionPlacement('finance.accounts_receivable', 'Accounts Receivable')
    expect(placement.path).toBe('finance.accounts_receivable')
    expect(placement.label).toBe('Accounts Receivable')
  })

  it('refuses free text, so one menu cannot be spelled two ways', () => {
    // This is §2 Q5's rule: the grouping is a declared canonical path, not free text.
    expect(() => functionPlacement('Finance > Accounts Receivable', 'Accounts Receivable')).toThrow(
      /canonical id/,
    )
    expect(() => functionPlacement('Finance/AR', 'AR')).toThrow(/canonical id/)
    expect(() => functionPlacement('finance.accounts-receivable', 'AR')).toThrow(/canonical id/)
    expect(() => functionPlacement('2finance', 'Finance')).toThrow(/canonical id/)
  })

  it('refuses a path with no label, because the id names it and the label shows it', () => {
    expect(() => functionPlacement('finance.accounts_receivable', '')).toThrow(/label/)
    expect(() => functionPlacement('finance.accounts_receivable', '   ')).toThrow(/label/)
  })
})
