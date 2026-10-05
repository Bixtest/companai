/**
 * Parameter binding — §47.
 *
 * The positive path first: a real IR with a real placeholder becomes a concrete
 * IR that the compiler can compile. Then the refusals — and the one that matters
 * most is asserted twice: **an unbound placeholder is an error, never passed
 * through.**
 */

import {
  bindParameters,
  collectParameterReferences,
  isParameterReference,
  isValueOfKind,
  sampleValuesFor,
  valueFits,
  PARAM_MARKER,
} from '../../business-ir/bind'
import type { BusinessQueryIR } from '../../business-ir/types'
import { CUSTOM_FIELD_KINDS } from '../../../modules/entities/kinds'
import { UNREAD_IR } from './fixtures'

const SCHEMA = [{ name: 'min_unread', kind: 'integer' as const, required: true }]

describe('the marker, and finding every one of them', () => {
  it('recognises the marker and nothing else', () => {
    expect(isParameterReference({ [PARAM_MARKER]: 'min_unread' })).toBe(true)
    expect(isParameterReference({ $param: 1 })).toBe(false)
    expect(isParameterReference(['min_unread'])).toBe(false)
    expect(isParameterReference(null)).toBe(false)
    expect(isParameterReference('min_unread')).toBe(false)
  })

  it('finds the placeholder in the real IR, and says where it is', () => {
    expect(collectParameterReferences(UNREAD_IR)).toEqual([
      { name: 'min_unread', path: 'filters[1].value' },
    ])
  })

  it('finds a placeholder nested inside a money value, and binds it', () => {
    // The measured defect: a shallow scan missed this, so the marker would have
    // reached the engine as a literal comparison value.
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [
        {
          field: 'unread_count',
          operator: 'gt',
          value: { amount: { [PARAM_MARKER]: 'threshold' }, currency: 'GBP' },
        },
      ],
    }
    expect(collectParameterReferences(ir)).toEqual([
      { name: 'threshold', path: 'filters[0].value.amount' },
    ])

    const result = bindParameters(ir, { threshold: 5 }, [
      { name: 'threshold', kind: 'currency', required: true },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ir.filters?.[0]).toEqual({
      field: 'unread_count',
      operator: 'gt',
      value: { amount: 5, currency: 'GBP' },
    })
    expect(JSON.stringify(result.ir)).not.toContain(PARAM_MARKER)
  })

  it('scans values, not reference positions — and that boundary is deliberate', () => {
    // A marker in a reference position (`entity`, `dimensions`, `sort`) is not a
    // value, so the walk does not report it; resolution refuses it instead, which
    // is tested in the compiler suite. Asserting the boundary here means a reader
    // can see where it is rather than infer it.
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: [{ [PARAM_MARKER]: 'a_dimension' } as never],
      filters: [{ field: 'unread_count', operator: 'gt', value: { [PARAM_MARKER]: 'min_unread' } }],
    }
    expect(collectParameterReferences(ir)).toEqual([
      { name: 'min_unread', path: 'filters[0].value' },
    ])
  })

  it('finds placeholders in a time range and in the limit', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      timeRange: { from: { [PARAM_MARKER]: 'since' }, to: { [PARAM_MARKER]: 'until' } },
      limit: { [PARAM_MARKER]: 'top' } as unknown as number,
    }
    expect(collectParameterReferences(ir)).toEqual([
      { name: 'since', path: 'timeRange.from' },
      { name: 'until', path: 'timeRange.to' },
      { name: 'top', path: 'limit' },
    ])
  })
})

describe('bindParameters — the positive path', () => {
  it('turns a placeholder into a value, and the result carries no marker', () => {
    const result = bindParameters(UNREAD_IR, { min_unread: 3 }, SCHEMA)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const filters = result.ir.filters ?? []
    expect(filters[1]).toEqual({ field: 'unread_count', operator: 'gt', value: 3 })
    expect(JSON.stringify(result.ir)).not.toContain(PARAM_MARKER)
  })

  it('does not mutate the IR it was given', () => {
    const snapshot = JSON.stringify(UNREAD_IR)
    bindParameters(UNREAD_IR, { min_unread: 3 }, SCHEMA)
    expect(JSON.stringify(UNREAD_IR)).toBe(snapshot)
  })

  it('uses a declared default when nothing is supplied', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'gt', value: { [PARAM_MARKER]: 'min_unread' } }],
    }
    const result = bindParameters(ir, {}, [
      { name: 'min_unread', kind: 'integer', required: false, default: 7 },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ir.filters?.[0]).toEqual({ field: 'unread_count', operator: 'gt', value: 7 })
  })
})

describe('bindParameters — the refusals', () => {
  it('refuses a placeholder with no value and no default', () => {
    const result = bindParameters(UNREAD_IR, {}, SCHEMA)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((e) => e.code)).toContain('MISSING_PARAMETER')
    expect(result.errors[0].parameter).toBe('min_unread')
  })

  it('**an unbound placeholder never becomes an IR** — the failure carries no plan', () => {
    const result = bindParameters(UNREAD_IR, {}, SCHEMA)
    expect(result.ok).toBe(false)
    // The decisive assertion: there is no `ir` on a failed bind, so no caller can
    // read one and hand a marker to the compiler as if it were a value.
    expect(Object.prototype.hasOwnProperty.call(result, 'ir')).toBe(false)
  })

  it('refuses a supplied parameter the Function does not declare', () => {
    const result = bindParameters(UNREAD_IR, { min_unread: 3, typo: 1 }, SCHEMA)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.code === 'UNKNOWN_PARAMETER' && e.parameter === 'typo')).toBe(true)
  })

  it('refuses a value of the wrong kind, and says what it got', () => {
    const result = bindParameters(UNREAD_IR, { min_unread: 'three' }, SCHEMA)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const error = result.errors.find((e) => e.code === 'PARAMETER_TYPE_MISMATCH')
    expect(error?.message).toContain('declared as integer')
    expect(error?.message).toContain('string')
  })

  it('refuses a placeholder the Function never declared', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'gt', value: { [PARAM_MARKER]: 'undeclared' } }],
    }
    const result = bindParameters(ir, { undeclared: 1 }, SCHEMA)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.code === 'UNKNOWN_PARAMETER' && e.parameter === 'undeclared')).toBe(true)
  })

  it('refuses a required parameter that is missing even when the IR does not reference it', () => {
    const ir: BusinessQueryIR = { operation: 'list', entity: 'external_conversation' }
    const result = bindParameters(ir, {}, SCHEMA)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.code === 'MISSING_PARAMETER')).toBe(true)
  })
})

describe('a value is checked against how it is used, not only its declared kind', () => {
  const inIr = (): BusinessQueryIR => ({
    operation: 'list',
    entity: 'external_conversation',
    filters: [{ field: 'subject', operator: 'in', value: { [PARAM_MARKER]: 'subjects' } }],
  })

  const existsIr = (): BusinessQueryIR => ({
    operation: 'list',
    entity: 'external_conversation',
    filters: [{ field: 'is_open', operator: 'exists', value: { [PARAM_MARKER]: 'flag' } }],
  })

  it('accepts a list for an "in" filter, even when the declared kind is a scalar one', () => {
    const result = bindParameters(inIr(), { subjects: ['Order 42', 'Order 43'] }, [
      { name: 'subjects', kind: 'text', required: true },
    ])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ir.filters?.[0]).toEqual({
      field: 'subject',
      operator: 'in',
      value: ['Order 42', 'Order 43'],
    })
  })

  it('refuses a bare value for an "in" filter, and says a list is needed', () => {
    const result = bindParameters(inIr(), { subjects: 'Order 42' }, [
      { name: 'subjects', kind: 'text', required: true },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].code).toBe('PARAMETER_TYPE_MISMATCH')
    expect(result.errors[0].message).toContain('needs a list')
  })

  it('refuses a list whose items do not fit the declared kind', () => {
    const result = bindParameters(inIr(), { subjects: ['ok', 7] }, [
      { name: 'subjects', kind: 'text', required: true },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].message).toContain('list it feeds contains')
  })

  it('accepts a boolean for an "exists" filter', () => {
    const result = bindParameters(existsIr(), { flag: true }, [
      { name: 'flag', kind: 'boolean', required: true },
    ])
    expect(result.ok).toBe(true)
  })

  it('refuses a non-boolean for an "exists" filter, whatever the declared kind', () => {
    const result = bindParameters(existsIr(), { flag: 1 }, [
      { name: 'flag', kind: 'integer', required: true },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0].message).toContain('needs true or false')
  })

  it('valueFits is the single rule, and it reports why', () => {
    const parameter = { name: 'subjects', kind: 'text' as const, required: true }
    expect(valueFits(['a'], parameter, 'in')).toEqual({ ok: true })
    const bad = valueFits('a', parameter, 'in')
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.message).toContain('needs a list')
  })
})

describe('sampleValuesFor — a value of each declared kind, shaped for its operator', () => {
  it('samples the fixture, and the samples really do bind', () => {
    const samples = sampleValuesFor(UNREAD_IR, [{ name: 'min_unread', kind: 'integer', required: true }])
    expect(samples).toEqual({ min_unread: 1 })

    // The claim that matters: the samples produce a concrete IR, so verification
    // and freshness have something real to compile.
    const bound = bindParameters(UNREAD_IR, samples, [
      { name: 'min_unread', kind: 'integer', required: true },
    ])
    expect(bound.ok).toBe(true)
    if (!bound.ok) return
    expect(JSON.stringify(bound.ir)).not.toContain(PARAM_MARKER)
  })

  it('samples a list for an "in" filter and a boolean for "exists"', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [
        { field: 'subject', operator: 'in', value: { [PARAM_MARKER]: 'subjects' } },
        { field: 'is_open', operator: 'exists', value: { [PARAM_MARKER]: 'flag' } },
      ],
    }
    const schema = [
      { name: 'subjects', kind: 'text' as const, required: true },
      { name: 'flag', kind: 'boolean' as const, required: true },
    ]
    expect(sampleValuesFor(ir, schema)).toEqual({ subjects: ['sample'], flag: true })
    expect(bindParameters(ir, sampleValuesFor(ir, schema), schema).ok).toBe(true)
  })

  it('prefers a declared default when it already has the right shape', () => {
    const schema = [{ name: 'min_unread', kind: 'integer' as const, required: false, default: 7 }]
    expect(sampleValuesFor(UNREAD_IR, schema)).toEqual({ min_unread: 7 })
  })

  it('samples a placeholder in a time bound and in the limit', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      timeRange: { from: { [PARAM_MARKER]: 'since' }, field: 'last_message_at' },
      limit: { [PARAM_MARKER]: 'top' },
    }
    const schema = [
      { name: 'since', kind: 'date' as const, required: true },
      { name: 'top', kind: 'integer' as const, required: true },
    ]
    const samples = sampleValuesFor(ir, schema)
    expect(samples).toEqual({ since: '2026-01-01', top: 1 })

    const bound = bindParameters(ir, samples, schema)
    expect(bound.ok).toBe(true)
    if (!bound.ok) return
    expect(bound.ir.timeRange?.from).toBe('2026-01-01')
    expect(bound.ir.limit).toBe(1)
  })
})

describe('isValueOfKind — one vocabulary, the platform\'s own 13 field kinds', () => {
  it('accepts a fitting value for every declared kind', () => {
    const fitting: Record<string, unknown> = {
      text: 'a',
      multiline: 'a',
      integer: 1,
      float: 1.5,
      boolean: true,
      select: 'a',
      currency: 1.5,
      relation: 'customer_1',
      attachment: 'file_1',
      dictionary: 'a',
      phone: '+441234567',
      date: '2026-10-05',
      datetime: '2026-10-05T12:00:00Z',
    }
    for (const kind of CUSTOM_FIELD_KINDS) {
      expect([kind, isValueOfKind(fitting[kind], kind)]).toEqual([kind, true])
    }
  })

  it('refuses a value that does not fit', () => {
    expect(isValueOfKind('1', 'integer')).toBe(false)
    expect(isValueOfKind(1.5, 'integer')).toBe(false)
    expect(isValueOfKind(1, 'boolean')).toBe(false)
    expect(isValueOfKind({}, 'text')).toBe(false)
    expect(isValueOfKind([], 'currency')).toBe(false)
  })

  it('accepts a list or a single id for an attachment', () => {
    expect(isValueOfKind('file_1', 'attachment')).toBe(true)
    expect(isValueOfKind(['file_1', 'file_2'], 'attachment')).toBe(true)
  })

  it('accepts a Date object for a date or datetime', () => {
    expect(isValueOfKind(new Date('2026-10-05T00:00:00Z'), 'date')).toBe(true)
    expect(isValueOfKind(new Date('2026-10-05T00:00:00Z'), 'datetime')).toBe(true)
  })
})
