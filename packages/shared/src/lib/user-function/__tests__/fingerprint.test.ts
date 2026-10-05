/**
 * The fingerprint and the freshness check — §43.
 *
 * Two properties are asserted, and the second is the one that matters:
 *
 *   1. The same content gives the same hash, and a changed IR gives a different
 *      one — so the hash answers "did this change?".
 *   2. **A rename does not change it.** Presentation is outside the fingerprint on
 *      purpose, so fixing a label does not invalidate a verification.
 *
 * Then the freshness check, whose three outcomes are each asserted: fresh,
 * recompiled (the model moved, the IR still resolves), and requires
 * recompilation (with G-02's reasons, not a string comparison written here).
 */

import { buildModelDescriptor } from '../../kernel/model'
import { compileQuery, modelVersionOf } from '../../business-ir/compile'
import { bindParameters, sampleValuesFor } from '../../business-ir/bind'
import {
  checkFreshness,
  executionFingerprint,
  functionContent,
  functionFingerprint,
  planFingerprint,
} from '../fingerprint'
import {
  BINDINGS,
  CTX,
  DECLARATIONS,
  MODEL,
  MODEL_PLUS,
  MODEL_RENAMED,
  makeFunction,
  withFieldKind,
} from './fixtures'

function compiledPlan(fn = makeFunction()) {
  // Bound to samples first, because the compiler refuses a placeholder — a
  // placeholder is not a value.
  const schema = fn.parameterSchema ?? []
  const bound = bindParameters(fn.businessIr!, sampleValuesFor(fn.businessIr!, schema), schema)
  if (!bound.ok) throw new Error(`fixture IR did not bind: ${JSON.stringify(bound.errors)}`)
  const result = compileQuery(bound.ir, MODEL, CTX, BINDINGS)
  if (!result.ok) throw new Error(`fixture IR did not compile: ${JSON.stringify(result.diagnostics)}`)
  return result.plan
}

describe('functionFingerprint — the same content, the same string', () => {
  it('is stable across calls and shaped like a content version', () => {
    const fn = makeFunction()
    expect(functionFingerprint(fn)).toBe(functionFingerprint(fn))
    expect(functionFingerprint(fn)).toMatch(/^[0-9a-f]{8}$/)
  })

  it('is unchanged by a deep-equal copy', () => {
    const fn = makeFunction()
    expect(functionFingerprint(JSON.parse(JSON.stringify(fn)))).toBe(functionFingerprint(fn))
  })

  it('changes when the IR changes', () => {
    const before = functionFingerprint(makeFunction())
    const after = functionFingerprint(
      makeFunction({ businessIr: { operation: 'list', entity: 'external_conversation', limit: 10 } }),
    )
    expect(after).not.toBe(before)
  })

  it('changes when a parameter is added', () => {
    const before = functionFingerprint(makeFunction())
    const after = functionFingerprint(
      makeFunction({
        parameterSchema: [
          { name: 'min_unread', kind: 'integer', required: true },
          { name: 'only_open', kind: 'boolean', required: false },
        ],
      }),
    )
    expect(after).not.toBe(before)
  })

  it('does not change when the same permissions are listed in a different order', () => {
    const before = functionFingerprint(makeFunction({ requiredPermissions: ['b', 'a'] }))
    const after = functionFingerprint(makeFunction({ requiredPermissions: ['a', 'b'] }))
    expect(after).toBe(before)
  })

  it('**does not change on a rename** — presentation is outside the fingerprint', () => {
    const original = makeFunction({ name: 'Unread conversations', description: 'old wording' })
    const renamed = makeFunction({
      name: 'Conversations needing attention',
      description: 'new wording',
      presentation: { icon: 'inbox' },
      ui: { placement: 'dashboard' },
      resultSchema: { columns: ['subject'] },
    })
    expect(functionFingerprint(renamed)).toBe(functionFingerprint(original))
  })

  it('does not change on a lifecycle move, a timestamp, or a recorded verification', () => {
    const original = makeFunction({ status: 'draft' })
    const moved = makeFunction({
      status: 'active',
      createdAt: '2026-10-05T00:00:00.000Z',
      publishedAt: '2026-10-05T12:00:00.000Z',
      verifiedBy: 'user-9',
      verification: { notChecked: ['authorization_valid'] },
    })
    expect(functionFingerprint(moved)).toBe(functionFingerprint(original))
  })

  it('names exactly what it covers, so the claim can be read', () => {
    const content = functionContent(makeFunction())
    expect(Object.keys(content).sort()).toEqual([
      'businessCommandIr',
      'businessIr',
      'businessModelVersion',
      'compilerVersion',
      'dependencyVersions',
      'operationType',
      'parameterSchema',
      'references',
      'requiredPermissions',
    ])
  })
})

describe('planFingerprint and executionFingerprint', () => {
  it('hashes the compiled plan, and two different plans differ', () => {
    const a = compiledPlan(makeFunction())
    const b = compileQuery(
      { operation: 'list', entity: 'external_conversation', limit: 5 },
      MODEL,
      CTX,
      BINDINGS,
    )
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(planFingerprint(a)).toMatch(/^[0-9a-f]{8}$/)
    expect(planFingerprint(b.plan)).not.toBe(planFingerprint(a))
  })

  it('ties a result to both the definition and the plan that produced it', () => {
    const fn = makeFunction()
    const plan = compiledPlan(fn)
    const fp = executionFingerprint(fn, plan)
    expect(fp).toBe(executionFingerprint(makeFunction(), compiledPlan(makeFunction())))
    expect(fp).not.toBe(
      executionFingerprint(
        makeFunction({ businessIr: { operation: 'list', entity: 'external_conversation' } }),
        plan,
      ),
    )
  })

  it('does not change when only the revision number changes', () => {
    // The revision number is a fact about the artifact's history, not about what
    // it does, so it is outside the content hash — asserted rather than assumed.
    const plan = compiledPlan()
    expect(executionFingerprint(makeFunction({ version: 7 }), plan)).toBe(
      executionFingerprint(makeFunction({ version: 1 }), plan),
    )
  })
})

describe('checkFreshness — fresh, recompiled, or refused', () => {
  it('is fresh when the recorded model version is the current one', () => {
    const result = checkFreshness(makeFunction(), MODEL, BINDINGS, CTX)
    expect(result).toEqual({ status: 'fresh', reasons: [] })
  })

  it('recompiles when the model moved but the IR still resolves', () => {
    // Two routes to the same conclusion: the version really did move, and the
    // check really does say "recompiled".
    expect(modelVersionOf(MODEL_PLUS)).not.toBe(modelVersionOf(MODEL))

    const result = checkFreshness(makeFunction(), MODEL_PLUS, BINDINGS, CTX)
    expect(result.status).toBe('recompiled')
    expect(result.reasons.join(' ')).toContain(modelVersionOf(MODEL_PLUS))
  })

  it('refuses when a field the IR uses is gone, and says which reference', () => {
    expect(modelVersionOf(MODEL_RENAMED)).not.toBe(modelVersionOf(MODEL))

    const result = checkFreshness(makeFunction(), MODEL_RENAMED, BINDINGS, CTX)
    expect(result.status).toBe('requires_recompilation')
    expect(result.reasons.join(' ')).toContain('unread_count')
  })

  it('refuses when a field was retyped so the IR no longer compiles', () => {
    // The measured defect behind the model version: a field's kind is not part of
    // its id, so a version built from ids alone could not see a retype, and this
    // returned "fresh" for a Function whose `>` filter had just become illegal.
    const retyped = withFieldKind('text')
    expect(modelVersionOf(retyped)).not.toBe(modelVersionOf(MODEL))

    const result = checkFreshness(makeFunction(), retyped, BINDINGS, CTX)
    expect(result.status).toBe('requires_recompilation')
  })

  it('refuses when a relationship the IR traverses is gone', () => {
    const noExtensions = buildModelDescriptor({
      customEntities: DECLARATIONS.customEntities,
      customFieldSets: DECLARATIONS.customFieldSets,
      extensions: [],
    })
    const result = checkFreshness(
      makeFunction({
        businessIr: {
          operation: 'list',
          entity: 'external_conversation',
          relationships: ['user.external_conversation'],
        },
      }),
      noExtensions,
      BINDINGS,
      CTX,
    )
    expect(result.status).toBe('requires_recompilation')
  })

  it('refuses when the entity itself is gone', () => {
    const empty = buildModelDescriptor({ customEntities: [], customFieldSets: [], extensions: [] })
    const result = checkFreshness(makeFunction(), empty, BINDINGS, CTX)
    expect(result.status).toBe('requires_recompilation')
  })

  it('names the destination when it is given the previous model', () => {
    const withoutPrevious = checkFreshness(makeFunction(), MODEL_RENAMED, BINDINGS, CTX)
    const withPrevious = checkFreshness(makeFunction(), MODEL_RENAMED, BINDINGS, CTX, {
      previousModel: MODEL,
    })

    expect(withPrevious.status).toBe('requires_recompilation')
    // The richer answer comes from the model's own rename planner, through G-02 —
    // not from a string comparison written in the fingerprint module.
    expect(withPrevious.reasons.join(' ')).toContain('looks like a rename')
    expect(withPrevious.reasons.join(' ')).toContain('unread_messages')
    expect(withoutPrevious.reasons.join(' ')).not.toContain('looks like a rename')
  })

  it('refuses a command Function whose model moved, rather than assuming it is safe', () => {
    const result = checkFreshness(
      makeFunction({
        operationType: 'command',
        businessIr: undefined,
        businessCommandIr: {
          command: 'conversation.close',
          inputs: {},
          requested_by: 'user-1',
          idempotency_key: 'key-1',
        },
      }),
      MODEL_PLUS,
      BINDINGS,
      CTX,
    )
    expect(result.status).toBe('requires_recompilation')
    expect(result.reasons.join(' ')).toContain('command Function')
  })
})
