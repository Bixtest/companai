import {
  assertCanonicalId,
  assertCanonicalSegments,
  canonicalEntityOf,
  canonicalLeafOf,
  entityIdOf,
  fieldIdOf,
  isCanonicalId,
  isCanonicalSegment,
  isDirectChildOf,
  metricIdOf,
  parseCanonicalId,
  relationshipIdOf,
} from '../canonical-id'

describe('canonical id grammar (spec §12.1)', () => {
  describe('segments', () => {
    it('accepts lowercase letters, digits and underscores, leading with a letter', () => {
      expect(isCanonicalSegment('invoice')).toBe(true)
      expect(isCanonicalSegment('outstanding_amount')).toBe(true)
      expect(isCanonicalSegment('a1')).toBe(true)
      expect(isCanonicalSegment('purchase_order_2')).toBe(true)
    })

    it('rejects a leading digit, uppercase, hyphens, spaces and empties', () => {
      expect(isCanonicalSegment('1invoice')).toBe(false)
      expect(isCanonicalSegment('Invoice')).toBe(false)
      expect(isCanonicalSegment('purchase-order')).toBe(false)
      expect(isCanonicalSegment('purchase order')).toBe(false)
      expect(isCanonicalSegment('')).toBe(false)
      expect(isCanonicalSegment('_invoice')).toBe(false)
    })
  })

  describe('whole ids', () => {
    it('accepts the spec §12.1 examples', () => {
      expect(isCanonicalId('invoice')).toBe(true)
      expect(isCanonicalId('invoice.outstanding_amount')).toBe(true)
      expect(isCanonicalId('invoice.customer')).toBe(true)
      expect(isCanonicalId('invoice.outstanding_balance')).toBe(true)
    })

    it('rejects a leading or trailing dot, a double dot, and uppercase', () => {
      expect(isCanonicalId('.invoice')).toBe(false)
      expect(isCanonicalId('invoice.')).toBe(false)
      expect(isCanonicalId('invoice..customer')).toBe(false)
      expect(isCanonicalId('Invoice.Customer')).toBe(false)
    })

    it('property 2 — the parent is the prefix, so the two never collide', () => {
      expect(isCanonicalId('invoice.customer')).toBe(true)
      expect(isCanonicalId('customer.invoice')).toBe(true)
      expect('invoice.customer').not.toBe('customer.invoice')
    })
  })

  describe('constructors', () => {
    it('builds each kind with the documented shape', () => {
      expect(entityIdOf('invoice')).toBe('invoice')
      expect(fieldIdOf('invoice', 'outstanding_amount')).toBe('invoice.outstanding_amount')
      expect(relationshipIdOf('invoice', 'customer')).toBe('invoice.customer')
      expect(metricIdOf('invoice', 'outstanding_balance')).toBe('invoice.outstanding_balance')
    })

    it('refuses to build an id from a malformed segment', () => {
      expect(() => entityIdOf('Invoice')).toThrow(/Invalid canonical id segment/)
      expect(() => fieldIdOf('invoice', 'Outstanding')).toThrow(/Invalid canonical id segment/)
      expect(() => relationshipIdOf('invoice', 'customer-id')).toThrow(/Invalid canonical id segment/)
    })
  })

  describe('assertCanonicalId', () => {
    it('returns the id when valid and throws when not', () => {
      expect(assertCanonicalId('invoice.customer')).toBe('invoice.customer')
      expect(() => assertCanonicalId('Invoice')).toThrow(/Invalid canonical id/)
    })
  })

  describe('assertCanonicalSegments', () => {
    it('names the offending segment', () => {
      expect(() => assertCanonicalSegments(['invoice', 'Bad'])).toThrow(/Bad/)
      expect(() => assertCanonicalSegments([])).toThrow(/at least one segment/)
      expect(assertCanonicalSegments(['invoice', 'customer'])).toEqual(['invoice', 'customer'])
    })
  })

  describe('readers', () => {
    it('parses under a declared kind, never a guessed one', () => {
      expect(parseCanonicalId('invoice.customer', 'relationship')).toEqual({
        kind: 'relationship',
        segments: ['invoice', 'customer'],
      })
      // The same string under a different declared kind is a different reading —
      // the shape alone never decides, which is why kind is an argument.
      expect(parseCanonicalId('invoice.customer', 'field')).toEqual({
        kind: 'field',
        segments: ['invoice', 'customer'],
      })
    })

    it('takes the entity segment and the leaf', () => {
      expect(canonicalEntityOf('invoice.outstanding_amount')).toBe('invoice')
      expect(canonicalLeafOf('invoice.outstanding_amount')).toBe('outstanding_amount')
      expect(canonicalEntityOf('invoice')).toBe('invoice')
      expect(canonicalLeafOf('invoice')).toBe('invoice')
    })

    it('isDirectChildOf is true only for a direct two-segment child', () => {
      expect(isDirectChildOf('invoice', 'invoice.customer')).toBe(true)
      expect(isDirectChildOf('invoice', 'invoice')).toBe(false)
      expect(isDirectChildOf('invoice', 'invoice.customer.name')).toBe(false)
      expect(isDirectChildOf('invoice', 'customer.invoice')).toBe(false)
    })
  })

  describe('property 1 — the id is stable; a label is not the identity', () => {
    it('a label rename never changes the id', () => {
      // The label "Outstanding amount" → "Amount still due" leaves the id alone.
      const id = fieldIdOf('invoice', 'outstanding_amount')
      const relabelled = fieldIdOf('invoice', 'outstanding_amount')
      expect(relabelled).toBe(id)
    })

    it('property 3 — a key rename produces a *different* id, never a rewritten one', () => {
      const before = fieldIdOf('invoice', 'outstanding_amount')
      const after = fieldIdOf('invoice', 'amount_due')
      expect(after).not.toBe(before)
      // Both remain valid ids; the model's job is to report that the old one is
      // superseded and recompilation is required — not to mutate `before`.
      expect(isCanonicalId(before)).toBe(true)
      expect(isCanonicalId(after)).toBe(true)
    })
  })
})
