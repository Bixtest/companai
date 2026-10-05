/**
 * Objective verification — §46.
 *
 * The vision is blunt about what verification must not be:
 *
 * > *"Verification should not be: 'The user saw something that looked right.'"*
 *
 * and then lists the checks it should be: IR valid, entities valid, fields valid,
 * metrics valid, relationships valid, authorization valid, tenant scope valid,
 * query plan valid.
 *
 * **Every one of those is executed here by calling G-02's compiler** and reading
 * its diagnostics — not by re-implementing the checks. The compiler already fails
 * closed on each of them, and its diagnostics already name their stage. Writing a
 * second implementation would give the project two answers to one question, which
 * is how the two drift apart.
 *
 * **The IR is bound to sample values before it is compiled, and that matters.**
 * A Function's stored IR carries placeholders, and the compiler refuses a
 * placeholder because a placeholder is not a value. More than that: some of the
 * compiler's checks are about the *shape* of a value — an `in` filter needs a
 * list, `exists` needs a boolean — and a marker satisfies neither. Compiling the
 * unbound IR would therefore report a **false failure** on a perfectly good
 * Function. So each parameter is bound to a sample of its declared kind, using the
 * binder's own rule, and the compiler sees the same shape of IR it will see when
 * the Function actually runs.
 *
 * **The positive case is asserted first, everywhere.** A report that only ever
 * says "failed" would pass against a verifier that failed everything.
 *
 * Source: Doc 3 Part VIII §46; COOKBOOK Sprint G-03 step 3.4.
 */

import { compileQuery } from '../business-ir/compile'
import type { CompileOptions } from '../business-ir/compile'
import type { PhysicalBindings } from '../business-ir/bindings'
import { bindParameters, collectParameterReferences, sampleValuesFor } from '../business-ir/bind'
import { isCanonicalId, isCanonicalSegment } from '../kernel/canonical-id'
import { isCustomFieldKind } from '../../modules/entities/kinds'
import type { ModelDescriptor } from '../kernel/model'
import type { BusinessQueryIR, CompileContext } from '../business-ir/types'
import type {
  UserFunction,
  VerificationCheck,
  VerificationCheckName,
  VerificationOutcome,
  VerificationReport,
} from './types'

/** Which compiler stage failure maps to which §46 check. */
const STAGE_TO_CHECK: Record<string, VerificationCheckName> = {
  resolve_schema: 'entities_valid',
  resolve_values: 'fields_valid',
  check_types: 'fields_valid',
  validate_paths: 'relationships_valid',
  expand_measures: 'query_plan_valid',
  normalise_time_currency: 'query_plan_valid',
  inject_scope: 'tenant_scope_valid',
  plan_physical: 'query_plan_valid',
}

/** The checks the query compiler owns. */
const COMPILER_CHECKS: VerificationCheckName[] = [
  'entities_valid',
  'fields_valid',
  'relationships_valid',
  'tenant_scope_valid',
  'query_plan_valid',
]

export function verifyFunction(
  fn: UserFunction,
  model: ModelDescriptor,
  bindings: PhysicalBindings,
  ctx: CompileContext,
  options: CompileOptions = {},
): VerificationReport {
  const checks: VerificationCheck[] = []
  const record = (name: VerificationCheckName, outcome: VerificationOutcome, detail: string): void => {
    checks.push({ name, outcome, detail })
  }

  /* ---- the operation type, and that exactly one IR is present ---- */

  const hasQuery = fn.businessIr !== undefined
  const hasCommand = fn.businessCommandIr !== undefined
  const wantsQuery = fn.operationType === 'query'
  const shapeOk = wantsQuery ? hasQuery && !hasCommand : hasCommand && !hasQuery
  record(
    'operation_type_valid',
    shapeOk ? 'passed' : 'failed',
    shapeOk
      ? `A ${fn.operationType} Function carries exactly one ${wantsQuery ? 'Business Query IR and no command IR' : 'Business Command IR and no query IR'}.`
      : `A ${fn.operationType} Function must carry exactly one ${wantsQuery ? 'Business Query IR' : 'Business Command IR'}; query IR present: ${hasQuery}, command IR present: ${hasCommand}.`,
  )

  /* ---- the parameter schema, and the IR bound to sample values ---- */

  const declared = verifyParameters(fn)
  let concrete: BusinessQueryIR | undefined
  let bindDetail = ''

  if (declared.outcome !== 'passed') {
    record('parameter_schema_valid', declared.outcome, declared.detail)
  } else if (wantsQuery && fn.businessIr) {
    // The pair that nobody else checks: does each parameter's declared kind
    // satisfy the operator that consumes it? The binder owns that rule, so it is
    // asked rather than re-implemented.
    const bound = bindParameters(
      fn.businessIr,
      sampleValuesFor(fn.businessIr, fn.parameterSchema ?? []),
      fn.parameterSchema ?? [],
    )
    if (bound.ok) {
      concrete = bound.ir
      record('parameter_schema_valid', 'passed', declared.detail)
    } else {
      bindDetail = bound.errors.map((error) => error.message).join(' ')
      record(
        'parameter_schema_valid',
        'failed',
        `The parameters are declared but cannot be bound to values the IR can use. ${bindDetail}`,
      )
    }
  } else {
    record('parameter_schema_valid', declared.outcome, declared.detail)
  }

  /* ---- the IR itself --------------------------------------------- */

  if (fn.operationType === 'command') {
    record('ir_valid', ...verifyCommandIr(fn))
  } else if (!fn.businessIr) {
    record('ir_valid', 'failed', 'No Business Query IR is present, so there is nothing to compile.')
  } else if (
    fn.businessIr.operation !== 'list' &&
    fn.businessIr.operation !== 'count' &&
    fn.businessIr.operation !== 'aggregate'
  ) {
    record(
      'ir_valid',
      'failed',
      `Unknown operation ${JSON.stringify(fn.businessIr.operation)}; expected list, count or aggregate.`,
    )
  } else {
    record('ir_valid', 'passed', `The IR declares a valid operation (${fn.businessIr.operation}).`)
  }

  /* ---- the checks the compiler owns ------------------------------ */

  if (fn.operationType === 'query' && fn.businessIr) {
    if (!concrete) {
      // There is no concrete IR to compile, so claiming any of these passed would
      // be a claim about work that never ran.
      for (const name of COMPILER_CHECKS) {
        record(
          name,
          'not_checked',
          `Not checked: the parameters could not be bound, so no concrete IR was available to compile. ${bindDetail}`,
        )
      }
    } else {
      const compiled = compileQuery(concrete, model, ctx, bindings, options)
      const errors = compiled.diagnostics.filter((d) => d.severity === 'error')

      const byCheck = new Map<VerificationCheckName, string[]>()
      for (const error of errors) {
        const check = STAGE_TO_CHECK[error.stage]
        if (!check) continue
        const list = byCheck.get(check) ?? []
        list.push(error.message)
        byCheck.set(check, list)
      }

      for (const name of COMPILER_CHECKS) {
        const failures = byCheck.get(name)
        if (failures && failures.length > 0) {
          record(name, 'failed', failures.join(' '))
        } else if (!compiled.ok && name === 'query_plan_valid') {
          // The compile failed for a reason not mapped to this check. Say so here
          // rather than leaving the report green on a compile that did not succeed.
          record(
            name,
            'failed',
            `The compiler refused this IR: ${errors.map((e) => e.message).join(' ')}`,
          )
        } else {
          record(name, 'passed', 'The compiler resolved this against the model without error.')
        }
      }
    }
  } else {
    // A command Function is not compiled by the query compiler. Saying "passed"
    // would be a claim about work that never ran.
    for (const name of COMPILER_CHECKS) {
      record(
        name,
        'not_checked',
        'Not applicable to a command Function: the query compiler validates reads, and this is a write.',
      )
    }
  }

  /* ---- §46's "authorization valid" — G-04 does not exist yet ---- */

  record(
    'authorization_valid',
    'not_checked',
    'The data-axis authorization layer (G-04) does not exist, so no authorized projection can be verified. This Function is structurally valid; it is not thereby permitted.',
  )

  const notChecked = checks.filter((c) => c.outcome === 'not_checked').map((c) => c.name)
  return {
    passed: checks.every((c) => c.outcome !== 'failed'),
    checks,
    notChecked,
  }
}

function verifyParameters(fn: UserFunction): { outcome: VerificationOutcome; detail: string } {
  const schema = fn.parameterSchema ?? []
  const seen = new Set<string>()

  for (const parameter of schema) {
    if (!isCanonicalSegment(parameter.name)) {
      return {
        outcome: 'failed',
        detail: `Parameter name ${JSON.stringify(parameter.name)} is not a canonical segment (lowercase letters, digits and underscores, starting with a letter).`,
      }
    }
    if (seen.has(parameter.name)) {
      return { outcome: 'failed', detail: `Parameter "${parameter.name}" is declared more than once.` }
    }
    seen.add(parameter.name)
    if (!isCustomFieldKind(parameter.kind)) {
      return {
        outcome: 'failed',
        detail: `Parameter "${parameter.name}" declares kind ${JSON.stringify(parameter.kind)}, which is not one of the platform's field kinds.`,
      }
    }
  }

  // Every placeholder the IR asks for must be declared, or the Function would
  // fail at run time instead of at verification time.
  if (fn.businessIr) {
    for (const reference of collectParameterReferences(fn.businessIr)) {
      if (!seen.has(reference.name)) {
        return {
          outcome: 'failed',
          detail: `The IR asks for parameter "${reference.name}" at ${reference.path}, but the Function does not declare it.`,
        }
      }
    }
  }

  return {
    outcome: 'passed',
    detail: `${schema.length} parameter(s) declared, and every placeholder the IR asks for is declared.`,
  }
}

function verifyCommandIr(fn: UserFunction): [VerificationOutcome, string] {
  const command = fn.businessCommandIr
  if (!command) {
    return ['failed', 'No Business Command IR is present, so there is nothing to validate.']
  }
  if (!command.command || !isCanonicalId(command.command)) {
    return [
      'failed',
      `The command name ${JSON.stringify(command.command)} is not a canonical id (segment('.'segment)*, each matching [a-z][a-z0-9_]*).`,
    ]
  }
  if (!command.inputs || typeof command.inputs !== 'object' || Array.isArray(command.inputs)) {
    return ['failed', 'The command inputs must be an object.']
  }
  if (!command.requested_by) {
    return ['failed', 'The command must record who requested it (requested_by).']
  }
  if (!command.idempotency_key) {
    return [
      'failed',
      'The command must carry an idempotency_key, so a retry collapses to one effect rather than two.',
    ]
  }
  return ['passed', `Command "${command.command}" is well-formed and carries an idempotency key.`]
}
