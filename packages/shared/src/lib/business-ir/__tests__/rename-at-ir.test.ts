/**
 * **The rename test — the plan's own proof that the IR is real.**
 *
 * Plan §2 phase 1: *"rename a field; the IR either recompiles cleanly or says
 * 'requires recompilation'. If it silently produces wrong SQL, the IR is not
 * real."*
 *
 * This suite asserts **both directions**, and it asserts the *floor* as well as
 * the ceiling:
 *
 *   - the **floor** — compiling the old IR against the new model must **fail**,
 *     not return a plan. That is what stops a silent compile to a column that no
 *     longer exists.
 *   - the **ceiling** — the rename-aware entry must say **requires recompilation**
 *     and name where the field went, so a person is told what to do.
 *
 * A suite that only checked the ceiling would pass against a compiler that
 * compiled anything; one that only checked the floor would pass against a
 * compiler that refused everything.
 */

import { buildModelDescriptor } from '../../kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '../../kernel/model'
import { createBindingsFromDeclarations } from '../bindings'
import type { PhysicalBindings } from '../bindings'
import { compileQuery } from '../compile'
import { collectFieldReferences, recompileQuery } from '../recompile'
import type { BusinessQueryIR, CompileContext } from '../types'

const EXTENSIONS: KernelDeclarationInput['extensions'] = [
  {
    base: 'auth:user',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
    cardinality: 'one-to-many',
  },
]

function declarationsWith(unreadField: { key: string; label?: string }): KernelDeclarationInput {
  return {
    customEntities: [
      { id: 'communication_channels:external_conversation', label: 'External conversation' },
    ],
    customFieldSets: [
      {
        entity: 'communication_channels:external_conversation',
        source: 'communication_channels',
        fields: [
          { key: 'subject', kind: 'text', label: 'Subject' },
          { key: unreadField.key, kind: 'integer', label: unreadField.label },
        ],
      },
    ],
    extensions: EXTENSIONS,
  }
}

/** Model A: the field is called `unread_count`. */
const DECLARATIONS_A = declarationsWith({ key: 'unread_count' })
/** Model B: the same field was renamed to `unread_total`. */
const DECLARATIONS_B = declarationsWith({ key: 'unread_total' })
/** Model C: only the *label* changed — the key is untouched. */
const DECLARATIONS_C = declarationsWith({ key: 'unread_count', label: 'Unread (renamed label)' })

const MODEL_A: ModelDescriptor = buildModelDescriptor(DECLARATIONS_A)
const MODEL_B: ModelDescriptor = buildModelDescriptor(DECLARATIONS_B)
const MODEL_C: ModelDescriptor = buildModelDescriptor(DECLARATIONS_C)

const BINDINGS: PhysicalBindings = createBindingsFromDeclarations(DECLARATIONS_A, MODEL_A)
const CTX: CompileContext = { tenantId: 'tenant-1' }

/** The IR as written against model A. */
const IR_OLD: BusinessQueryIR = {
  operation: 'list',
  entity: 'external_conversation',
  dimensions: ['subject'],
  filters: [{ field: 'unread_count', operator: '>', value: 0 }],
  sort: [{ field: 'unread_count', direction: 'desc' }],
}

describe('the rename test — a moved field never compiles silently', () => {
  it('THE FLOOR: the old IR compiled against the new model FAILS (no silent compile)', () => {
    const result = compileQuery(IR_OLD, MODEL_B, CTX, BINDINGS)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_FIELD')).toBe(true)
  })

  it('THE CEILING: recompiling says "requires recompilation" and names the destination', () => {
    const result = recompileQuery(IR_OLD, MODEL_A, MODEL_B, CTX, BINDINGS)
    expect(result.status).toBe('requires_recompilation')
    if (result.status !== 'requires_recompilation') return

    expect(result.staleReferences.map((r) => r.id)).toContain(
      'external_conversation.unread_count',
    )
    const stale = result.staleReferences.find(
      (r) => r.id === 'external_conversation.unread_count',
    )
    expect(stale?.renamedTo).toBe('external_conversation.unread_total')
    // The reasons come from the model's own rename planner, in plain language.
    expect(result.reasons.join(' ')).toContain('recompiled')
  })

  it('an IR updated to the new id recompiles CLEANLY against the new model', () => {
    const updated: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['subject'],
      filters: [{ field: 'unread_total', operator: '>', value: 0 }],
      sort: [{ field: 'unread_total', direction: 'desc' }],
    }
    const result = recompileQuery(updated, MODEL_A, MODEL_B, CTX, BINDINGS)
    expect(result.status).toBe('clean')
    if (result.status !== 'clean') return
    expect(result.plan.physical.filters).toEqual([
      { field: 'external_conversation.unread_total', op: 'gt', value: 0 },
    ])
  })

  it('a label-only change is CLEAN — no id moved, so nothing needs recompiling', () => {
    const result = recompileQuery(IR_OLD, MODEL_A, MODEL_C, CTX, BINDINGS)
    expect(result.status).toBe('clean')
  })

  it('a change that does not touch the IR is CLEAN even when another field moved', () => {
    // The IR references `subject` only; `unread_count` moved but is not referenced.
    const unrelated: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['subject'],
    }
    const result = recompileQuery(unrelated, MODEL_A, MODEL_B, CTX, BINDINGS)
    expect(result.status).toBe('clean')
  })

  it('reports "invalid" when the IR does not compile for a reason that is not a rename', () => {
    const broken: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['never_existed'],
    }
    const result = recompileQuery(broken, MODEL_A, MODEL_A, CTX, BINDINGS)
    expect(result.status).toBe('invalid')
  })
})

describe('collectFieldReferences — the IR knows what it references', () => {
  it('finds every field reference, and its path in the IR', () => {
    const refs = collectFieldReferences(IR_OLD, MODEL_A)
    expect(refs).toEqual([
      { path: 'dimensions', id: 'external_conversation.subject' },
      { path: 'filters', id: 'external_conversation.unread_count' },
      { path: 'sort', id: 'external_conversation.unread_count' },
    ])
  })

  it('returns nothing for an entity the model does not contain', () => {
    expect(collectFieldReferences({ operation: 'list', entity: 'nope' }, MODEL_A)).toEqual([])
  })
})
