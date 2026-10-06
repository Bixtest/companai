/**
 * The Business IR's runtime schema (G-17).
 *
 * This suite is one half of a two-part proof that `schema.ts` **mirrors**
 * `types.ts`:
 *
 *  - the **compile-time** half is `IR_SCHEMA_TYPE_CHECKS` in `schema.ts` — a
 *    value whose annotations are type-equality assertions, so any drift between
 *    a schema and its type fails `tsc`;
 *  - the **runtime** half is this file — it drives real objects through the
 *    schema and checks what it accepts and refuses.
 *
 * Neither half alone is enough. The compiler proves the *types* agree; it says
 * nothing about what `.strict()` does to an actual object, or whether a required
 * field is truly required. A test alone would let the schema and the type drift
 * while every hand-written case still passed. Together they close both doors.
 *
 * **The falsification probe.** The most important test here is the last one. A
 * suite that only ever checks "a good IR parses" passes against a schema that
 * accepts *everything*. So the probe feeds the schema a document with a key the
 * IR does not have — the exact shape a model invents when it decides to widen its
 * own reach (`tenantId`) or to guess (`foo`) — and requires the schema to
 * **reject** it. If `.strict()` is ever dropped, this test fails.
 */

import {
  BUSINESS_COMMAND_IR_SCHEMA_NAME,
  BUSINESS_QUERY_IR_SCHEMA_NAME,
  businessCommandIrSchema,
  businessIrSchema,
  businessQueryIrSchema,
  irFilterOperatorSchema,
  irMeasureSchema,
} from '../schema'
import type { BusinessQueryIR } from '../types'

/** The vision's own example query (§50): receivables over 10,000 EUR, by customer. */
const VALID_QUERY: BusinessQueryIR = {
  operation: 'list',
  entity: 'finance:invoice',
  grain: 'invoice',
  dimensions: ['customer'],
  measures: [{ aggregate: 'sum', field: 'amount_due' }],
  filters: [{ field: 'amount_due', operator: '>', value: { amount: 10000, currency: 'EUR' } }],
  relationships: ['customer'],
  sort: [{ field: 'amount_due', direction: 'desc' }],
  limit: 50,
}

describe('business-ir schema — the runtime mirror of types.ts', () => {
  describe('the positive path first', () => {
    it('parses the vision’s own §50 query', () => {
      const result = businessQueryIrSchema.safeParse(VALID_QUERY)
      expect(result.success).toBe(true)
    })

    it('parses a query that carries only the two required fields', () => {
      const result = businessQueryIrSchema.safeParse({
        operation: 'count',
        entity: 'customers:customer_entity',
      })
      expect(result.success).toBe(true)
    })

    it('parses a command IR', () => {
      const result = businessCommandIrSchema.safeParse({
        command: 'finance:issue_credit_note',
        inputs: { invoice_id: 'inv_1', amount: 250 },
        requested_by: 'user_1',
        idempotency_key: 'idem_1',
      })
      expect(result.success).toBe(true)
    })

    it('parses either IR through the union, and tells them apart', () => {
      const asQuery = businessIrSchema.safeParse(VALID_QUERY)
      const asCommand = businessIrSchema.safeParse({
        command: 'finance:issue_credit_note',
        inputs: {},
        requested_by: 'user_1',
        idempotency_key: 'idem_2',
      })
      expect(asQuery.success).toBe(true)
      expect(asCommand.success).toBe(true)
    })

    it('accepts a $param placeholder where the type allows one', () => {
      const result = businessQueryIrSchema.safeParse({
        operation: 'list',
        entity: 'finance:invoice',
        timeRange: { from: { $param: 'start' }, to: { $param: 'end' } },
        limit: { $param: 'maxRows' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('required fields are required', () => {
    it('rejects a query with no operation', () => {
      const result = businessQueryIrSchema.safeParse({ entity: 'finance:invoice' })
      expect(result.success).toBe(false)
    })

    it('rejects a query with no entity', () => {
      const result = businessQueryIrSchema.safeParse({ operation: 'list' })
      expect(result.success).toBe(false)
    })

    it('rejects a command IR with no idempotency key', () => {
      const result = businessCommandIrSchema.safeParse({
        command: 'finance:issue_credit_note',
        inputs: {},
        requested_by: 'user_1',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('a wrongly-typed field is rejected, not coerced', () => {
    it('rejects an operation outside the enum', () => {
      const result = businessQueryIrSchema.safeParse({
        operation: 'update',
        entity: 'finance:invoice',
      })
      expect(result.success).toBe(false)
    })

    it('rejects a limit that is a string', () => {
      const result = businessQueryIrSchema.safeParse({
        operation: 'list',
        entity: 'finance:invoice',
        limit: 'fifty',
      })
      expect(result.success).toBe(false)
    })

    it('rejects a measure that carries neither a metric nor an aggregate', () => {
      const result = irMeasureSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('the operator vocabulary is exactly the one types.ts declares', () => {
    it('accepts every engine name and every symbol', () => {
      const vocabulary = [
        'eq',
        'ne',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'nin',
        'like',
        'ilike',
        'exists',
        '=',
        '!=',
        '>',
        '>=',
        '<',
        '<=',
        'contains',
      ]
      for (const operator of vocabulary) {
        expect(irFilterOperatorSchema.safeParse(operator).success).toBe(true)
      }
    })

    it('rejects an operator that is not in the vocabulary', () => {
      expect(irFilterOperatorSchema.safeParse('regex').success).toBe(false)
    })
  })

  describe('the schema names are single constants', () => {
    it('names the two IR shapes the agent logs against', () => {
      expect(BUSINESS_QUERY_IR_SCHEMA_NAME).toBe('BusinessQueryIR')
      expect(BUSINESS_COMMAND_IR_SCHEMA_NAME).toBe('BusinessCommandIR')
    })
  })

  describe('falsification — the schema must refuse a widening', () => {
    /**
     * A model that wants to reach outside its tenant, or to guess a field, adds a
     * key the IR does not declare. `.strict()` is what turns that into a
     * rejection at the boundary instead of a value that is trusted now and
     * stripped later. This is the test that fails if `.strict()` is removed.
     */
    it('rejects an unknown key on the query IR (no scope creep)', () => {
      const result = businessQueryIrSchema.safeParse({ ...VALID_QUERY, tenantId: 'tenant_other' })
      expect(result.success).toBe(false)
    })

    it('rejects an unknown key on a nested object', () => {
      const result = businessQueryIrSchema.safeParse({
        ...VALID_QUERY,
        filters: [{ field: 'amount_due', operator: '>', value: 10, sneaky: true }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects an unknown key on the command IR', () => {
      const result = businessCommandIrSchema.safeParse({
        command: 'finance:issue_credit_note',
        inputs: {},
        requested_by: 'user_1',
        idempotency_key: 'idem_3',
        organizationId: 'org_other',
      })
      expect(result.success).toBe(false)
    })

    it('accepts the same object once the unknown key is gone', () => {
      // The control: proves the refusal above is the unknown key and not something
      // else about the object. Without this, "it failed" could mean anything.
      const result = businessQueryIrSchema.safeParse(VALID_QUERY)
      expect(result.success).toBe(true)
    })
  })
})
