/**
 * **The critic pass, made executable.**
 *
 * A critic pass that says "looks good" has not run. This suite is the list of
 * things that *would* break the compiler's central claims, each written as an
 * attack that must fail to break them:
 *
 *   1. Does a renamed field compile silently?           → `rename-at-ir.test.ts` (the floor)
 *   2. Can the IR carry or widen scope?                 → here + `compile.test.ts`
 *   3. Is "requires recompilation" the model's answer, or a lucky string compare? → here
 *   4. Does a `gap` hide a failure?                     → here
 *   5. Does the compiler mutate what it is given?       → here
 *   6. Is a "version" real, or an always-empty field?   → here
 */

import { buildModelDescriptor } from '../../kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '../../kernel/model'
import { createBindingsFromDeclarations } from '../bindings'
import type { PhysicalBindings } from '../bindings'
import { compileQuery, modelVersionOf } from '../compile'
import { recompileQuery } from '../recompile'
import { IR_STAGES } from '../types'
import type { BusinessQueryIR, CompileContext } from '../types'

const EXTENSIONS: KernelDeclarationInput['extensions'] = [
  {
    base: 'auth:user',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
    cardinality: 'one-to-many',
  },
]

function declarationsWith(fields: Array<{ key: string; kind: 'text' | 'integer' }>): KernelDeclarationInput {
  return {
    customEntities: [
      { id: 'communication_channels:external_conversation', label: 'External conversation' },
    ],
    customFieldSets: [
      { entity: 'communication_channels:external_conversation', source: 'communication_channels', fields },
    ],
    extensions: EXTENSIONS,
  }
}

const A = declarationsWith([
  { key: 'subject', kind: 'text' },
  { key: 'unread_count', kind: 'integer' },
])
const B = declarationsWith([
  { key: 'subject', kind: 'text' },
  { key: 'unread_total', kind: 'integer' },
])

const MODEL_A: ModelDescriptor = buildModelDescriptor(A)
const MODEL_B: ModelDescriptor = buildModelDescriptor(B)
const BINDINGS: PhysicalBindings = createBindingsFromDeclarations(A, MODEL_A)
const CTX: CompileContext = { tenantId: 'tenant-1' }

const IR: BusinessQueryIR = {
  operation: 'list',
  entity: 'external_conversation',
  dimensions: ['subject'],
}

const IR_withUnread: BusinessQueryIR = {
  operation: 'list',
  entity: 'external_conversation',
  dimensions: ['unread_count'],
}

/* ---- attack 2: scope ----------------------------------------------- */

describe('ATTACK — can the IR carry or widen scope?', () => {
  it('a filter on a tenant-like field fails closed (no such field is declared)', () => {
    const result = compileQuery(
      {
        ...IR,
        filters: [{ field: 'tenant_id', operator: 'eq', value: 'other-tenant' }],
      },
      MODEL_A,
      CTX,
      BINDINGS,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_FIELD')).toBe(true)
  })

  it('a smuggled organizationIds array is not honoured', () => {
    const smuggled = {
      ...IR,
      organizationIds: ['other-org'],
    } as unknown as BusinessQueryIR
    const result = compileQuery(smuggled, MODEL_A, { tenantId: 't' }, BINDINGS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.physical.organizationIds).toBeUndefined()
    expect(result.plan.physical.tenantId).toBe('t')
  })
})

/* ---- attack 3: the rename answer's provenance ---------------------- */

describe('ATTACK — is "requires recompilation" the rename engine talking, or a lucky compare?', () => {
  it('the reason comes from the model rename plan, and says what disappeared', () => {
    const result = recompileQuery(IR_withUnread, MODEL_A, MODEL_B, CTX, BINDINGS)
    expect(result.status).toBe('requires_recompilation')
    if (result.status !== 'requires_recompilation') return
    expect(result.reasons.join(' ')).toContain('disappeared')
    expect(result.reasons.join(' ')).toContain('external_conversation.unread_count')
  })

  it('an IR that references nothing that moved is clean, so the answer is not "always stale"', () => {
    const result = recompileQuery(IR, MODEL_A, MODEL_B, CTX, BINDINGS)
    expect(result.status).toBe('clean')
  })
})

/* ---- attack 4: a gap must not hide a failure ----------------------- */

describe('ATTACK — does a gap hide a failure?', () => {
  it('ok is true iff there is no error; a gap alone never fails a compile', () => {
    const onlyGaps = compileQuery(IR, MODEL_A, CTX, BINDINGS)
    expect(onlyGaps.ok).toBe(true)
    expect(onlyGaps.diagnostics.every((d) => d.severity === 'gap')).toBe(true)
  })

  it('an IR with BOTH an error and a gap fails, and still reports the gap', () => {
    const result = compileQuery(
      {
        operation: 'aggregate',
        entity: 'external_conversation',
        dimensions: ['no_such_field'],
        measures: [{ aggregate: 'sum', field: 'unread_count' }],
      },
      MODEL_A,
      CTX,
      BINDINGS,
    )
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true)
    // The row-oriented gap is still present — it was not swallowed by the error.
    expect(result.diagnostics.some((d) => d.code === 'ROW_ORIENTED_TARGET')).toBe(true)
  })

  it('every §51 stage is accounted for on a clean compile', () => {
    const result = compileQuery(IR, MODEL_A, CTX, BINDINGS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.provenance.stages).toEqual([...IR_STAGES])
  })
})

/* ---- attack 5: mutation ------------------------------------------- */

describe('ATTACK — does the compiler mutate the IR or the model?', () => {
  it('leaves the IR untouched', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['subject'],
      filters: [{ field: 'unread_count', operator: '>', value: 0 }],
      relationships: ['user.external_conversation'],
      sort: [{ field: 'unread_count', direction: 'desc' }],
      limit: 5,
    }
    const snapshot = JSON.stringify(ir)
    compileQuery(ir, MODEL_A, CTX, BINDINGS)
    expect(JSON.stringify(ir)).toBe(snapshot)
  })

  it('leaves the model untouched', () => {
    const snapshot = JSON.stringify(MODEL_A)
    compileQuery(IR, MODEL_A, CTX, BINDINGS)
    expect(JSON.stringify(MODEL_A)).toBe(snapshot)
  })
})

/* ---- attack 6: versions are real ---------------------------------- */

describe('ATTACK — is the model version real, or an always-empty field?', () => {
  it('changes when the model changes', () => {
    expect(modelVersionOf(MODEL_A)).not.toBe(modelVersionOf(MODEL_B))
  })

  it('is stable when the model does not change', () => {
    const rebuilt = buildModelDescriptor(A)
    expect(modelVersionOf(rebuilt)).toBe(modelVersionOf(MODEL_A))
  })

  it('is a short hex digest, not an empty string', () => {
    expect(modelVersionOf(MODEL_A)).toMatch(/^[0-9a-f]{8}$/)
  })
})
