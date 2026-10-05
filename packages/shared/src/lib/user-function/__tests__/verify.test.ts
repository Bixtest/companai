/**
 * Objective verification — §46.
 *
 * The vision's rule is that verification must not be *"the user saw something
 * that looked right"*. So this suite asserts two things in that order:
 *
 *   1. **The positive case passes**, and every compiler-owned check is explicitly
 *      `passed` — not merely absent from a failure list. A report that was green
 *      because it checked nothing would pass a suite that only tested failures.
 *   2. **Each failure names its own check and its own reason**, taken from the
 *      compiler rather than re-derived here.
 */

import { verifyFunction } from '../verify'
import type { VerificationCheckName } from '../types'
import type { BusinessQueryIR } from '../../business-ir/types'
import { BINDINGS, CTX, MODEL, makeFunction, UNREAD_IR } from './fixtures'

const COMPILER_CHECKS: VerificationCheckName[] = [
  'entities_valid',
  'fields_valid',
  'relationships_valid',
  'tenant_scope_valid',
  'query_plan_valid',
]

function outcomeOf(fn: Parameters<typeof verifyFunction>[0], name: VerificationCheckName) {
  const report = verifyFunction(fn, MODEL, BINDINGS, CTX)
  return { report, check: report.checks.find((c) => c.name === name) }
}

describe('verifyFunction — the positive case first', () => {
  it('passes a well-formed Function, with every compiler-owned check explicitly passed', () => {
    const report = verifyFunction(makeFunction(), MODEL, BINDINGS, CTX)
    expect(report.passed).toBe(true)
    for (const name of COMPILER_CHECKS) {
      const check = report.checks.find((c) => c.name === name)
      expect([name, check?.outcome]).toEqual([name, 'passed'])
    }
    expect(report.checks.find((c) => c.name === 'operation_type_valid')?.outcome).toBe('passed')
    expect(report.checks.find((c) => c.name === 'ir_valid')?.outcome).toBe('passed')
    expect(report.checks.find((c) => c.name === 'parameter_schema_valid')?.outcome).toBe('passed')
  })

  it('never reports authorization as passed — G-04 does not exist', () => {
    const report = verifyFunction(makeFunction(), MODEL, BINDINGS, CTX)
    expect(report.checks.find((c) => c.name === 'authorization_valid')?.outcome).toBe('not_checked')
    expect(report.notChecked).toEqual(['authorization_valid'])
    // A check that could not be run must not fail the report, or nothing could
    // ever be verified until G-04 lands.
    expect(report.passed).toBe(true)
  })

  it('says something in every check — no empty detail', () => {
    const report = verifyFunction(makeFunction(), MODEL, BINDINGS, CTX)
    for (const check of report.checks) {
      expect([check.name, check.detail.length > 0]).toEqual([check.name, true])
    }
  })
})

describe('verifyFunction — each failure names its check and its reason', () => {
  it('fails entities_valid when the IR names an entity the model does not have', () => {
    const ir: BusinessQueryIR = { operation: 'list', entity: 'no_such_entity' }
    const { report, check } = outcomeOf(makeFunction({ businessIr: ir }), 'entities_valid')
    expect(report.passed).toBe(false)
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('no_such_entity')
  })

  it('fails fields_valid when a dimension is not a declared field', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['no_such_field'],
    }
    const { report, check } = outcomeOf(makeFunction({ businessIr: ir }), 'fields_valid')
    expect(report.passed).toBe(false)
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('no_such_field')
  })

  it('fails relationships_valid when the IR traverses a relationship the model does not have', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      relationships: ['no_such_relationship'],
    }
    const { report, check } = outcomeOf(makeFunction({ businessIr: ir }), 'relationships_valid')
    expect(report.passed).toBe(false)
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('no_such_relationship')
  })

  it('fails tenant_scope_valid when the context carries no tenant', () => {
    const report = verifyFunction(makeFunction(), MODEL, BINDINGS, {})
    expect(report.passed).toBe(false)
    const check = report.checks.find((c) => c.name === 'tenant_scope_valid')
    expect(check?.outcome).toBe('failed')
    expect(check?.detail.toLowerCase()).toContain('tenant')
  })

  it('fails parameter_schema_valid when the IR asks for an undeclared parameter', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'gt', value: { $param: 'undeclared' } }],
    }
    const { report, check } = outcomeOf(makeFunction({ businessIr: ir }), 'parameter_schema_valid')
    expect(report.passed).toBe(false)
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('undeclared')
    expect(check?.detail).toContain('filters[0].value')
  })

  it('fails parameter_schema_valid on a name that is not a canonical segment', () => {
    const { check } = outcomeOf(
      makeFunction({
        parameterSchema: [{ name: 'Min-Unread', kind: 'integer', required: true }],
      }),
      'parameter_schema_valid',
    )
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('Min-Unread')
  })

  it('fails parameter_schema_valid on a parameter declared twice', () => {
    const { check } = outcomeOf(
      makeFunction({
        parameterSchema: [
          { name: 'min_unread', kind: 'integer', required: true },
          { name: 'min_unread', kind: 'integer', required: false },
        ],
      }),
      'parameter_schema_valid',
    )
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('more than once')
  })

  it('fails parameter_schema_valid on a kind that is not one of the platform\'s', () => {
    const { check } = outcomeOf(
      makeFunction({
        parameterSchema: [{ name: 'min_unread', kind: 'duration' as never, required: true }],
      }),
      'parameter_schema_valid',
    )
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('duration')
  })

  it('fails operation_type_valid when a query Function also carries a command IR', () => {
    const { report, check } = outcomeOf(
      makeFunction({
        businessCommandIr: {
          command: 'conversation.close',
          inputs: {},
          requested_by: 'user-1',
          idempotency_key: 'k',
        },
      }),
      'operation_type_valid',
    )
    expect(report.passed).toBe(false)
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('command IR present: true')
  })
})

describe('verifyFunction — a command Function', () => {
  const command = {
    command: 'conversation.close',
    inputs: { conversation: 'c-1' },
    requested_by: 'user-1',
    idempotency_key: 'key-1',
  }

  it('reports the query-only checks as not_checked, not as passed', () => {
    const report = verifyFunction(
      makeFunction({ operationType: 'command', businessIr: undefined, businessCommandIr: command }),
      MODEL,
      BINDINGS,
      CTX,
    )
    expect(report.passed).toBe(true)
    for (const name of COMPILER_CHECKS) {
      expect([name, report.checks.find((c) => c.name === name)?.outcome]).toEqual([name, 'not_checked'])
    }
    expect(report.notChecked).toContain('authorization_valid')
    expect(report.notChecked).toContain('query_plan_valid')
  })

  it('fails ir_valid on a command name that is not a canonical id', () => {
    const { check } = outcomeOf(
      makeFunction({
        operationType: 'command',
        businessIr: undefined,
        businessCommandIr: { ...command, command: 'Conversation.Close' },
      }),
      'ir_valid',
    )
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('canonical id')
  })

  it('fails ir_valid when the idempotency key is missing', () => {
    const { check } = outcomeOf(
      makeFunction({
        operationType: 'command',
        businessIr: undefined,
        businessCommandIr: { ...command, idempotency_key: '' },
      }),
      'ir_valid',
    )
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('idempotency')
  })

  it('fails operation_type_valid when a command Function carries no command IR', () => {
    const { report, check } = outcomeOf(
      makeFunction({ operationType: 'command', businessIr: undefined, businessCommandIr: undefined }),
      'operation_type_valid',
    )
    expect(report.passed).toBe(false)
    expect(check?.outcome).toBe('failed')
  })
})

describe('verifyFunction — the parameters are bound before the compile', () => {
  it('passes an "in" filter fed by a list parameter', () => {
    // This would report a false failure if the unbound IR were compiled: the
    // compiler needs a list for `in`, and a marker is not one.
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'subject', operator: 'in', value: { $param: 'subjects' } }],
    }
    const report = verifyFunction(
      makeFunction({
        businessIr: ir,
        parameterSchema: [{ name: 'subjects', kind: 'text', required: true }],
      }),
      MODEL,
      BINDINGS,
      CTX,
    )
    expect(report.passed).toBe(true)
    expect(report.checks.find((c) => c.name === 'query_plan_valid')?.outcome).toBe('passed')
  })

  it('passes an "exists" filter fed by a boolean parameter', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'is_open', operator: 'exists', value: { $param: 'flag' } }],
    }
    const report = verifyFunction(
      makeFunction({
        businessIr: ir,
        parameterSchema: [{ name: 'flag', kind: 'boolean', required: true }],
      }),
      MODEL,
      BINDINGS,
      CTX,
    )
    expect(report.passed).toBe(true)
  })

  it('fails parameter_schema_valid when a parameter cannot satisfy the operator that consumes it', () => {
    // An integer parameter feeding `exists`: the declaration is well formed and
    // the placeholder is declared, so only the *pair* is wrong — and this is the
    // one place that pair is checked.
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'is_open', operator: 'exists', value: { $param: 'flag' } }],
    }
    const report = verifyFunction(
      makeFunction({
        businessIr: ir,
        parameterSchema: [{ name: 'flag', kind: 'integer', required: true }],
      }),
      MODEL,
      BINDINGS,
      CTX,
    )
    expect(report.passed).toBe(false)
    const check = report.checks.find((c) => c.name === 'parameter_schema_valid')
    expect(check?.outcome).toBe('failed')
    expect(check?.detail).toContain('needs true or false')

    // And no compiler check may claim to have passed, because none of them ran.
    for (const name of COMPILER_CHECKS) {
      expect([name, report.checks.find((c) => c.name === name)?.outcome]).toEqual([name, 'not_checked'])
    }
  })

  it('never reports a compiler check as passed when nothing was compiled', () => {
    const report = verifyFunction(
      makeFunction({
        parameterSchema: [{ name: 'Min-Unread', kind: 'integer', required: true }],
      }),
      MODEL,
      BINDINGS,
      CTX,
    )
    expect(report.passed).toBe(false)
    for (const name of COMPILER_CHECKS) {
      expect([name, report.checks.find((c) => c.name === name)?.outcome]).toEqual([name, 'not_checked'])
    }
  })
})

describe('verifyFunction — the same IR the compiler is given', () => {
  it('verifies the fixture IR unchanged', () => {
    // Guards the fixture itself: if UNREAD_IR ever stopped being valid, every
    // suite that asserts "passed" would be testing a story.
    const report = verifyFunction(makeFunction({ businessIr: UNREAD_IR }), MODEL, BINDINGS, CTX)
    expect(report.passed).toBe(true)
  })
})
