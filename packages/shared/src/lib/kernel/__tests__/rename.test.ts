/**
 * The rename test (plan §2 phase 1; batch 9 §6 #1).
 *
 * "Rename a field; the IR either recompiles cleanly or says 'requires
 * recompilation'."
 *
 * Two renames that look alike and must behave differently:
 *
 *   1. Renaming a **label** — the display name. The canonical id is unchanged,
 *      so nothing downstream needs recompiling and the round-trip stays empty.
 *   2. Renaming a **key** — the id segment itself. The old id no longer
 *      identifies anything; the new one does. The model must *report* this as
 *      requiring recompilation, never silently rewrite the id (spec §12.1
 *      property 3; I14 — authority objects are superseded, never edited).
 *
 * A model that passed case 2 silently would corrupt every reference to the old
 * id, so the silent pass is treated as a failure here.
 */

import { fieldIdOf, isCanonicalId } from '../canonical-id'
import { buildModelDescriptor } from '../model'
import type { KernelDeclarationInput } from '../model'
import { exportModel, serialiseModelDocument } from '../round-trip'
import { planFieldRename, type RenamePlan } from '../rename'

const BASE: KernelDeclarationInput = {
  customEntities: [{ id: 'billing:invoice', label: 'Invoice' }],
  customFieldSets: [
    {
      entity: 'billing:invoice',
      source: 'billing',
      fields: [
        { key: 'outstanding_amount', kind: 'float', label: 'Outstanding amount', filterable: true },
        { key: 'currency_code', kind: 'text', label: 'Currency' },
      ],
    },
  ],
  extensions: [],
}

describe('rename test — a label rename recompiles cleanly', () => {
  it('leaves the canonical id, and the model, unchanged', () => {
    const before = buildModelDescriptor(BASE)
    const after = buildModelDescriptor({
      ...BASE,
      customFieldSets: [
        {
          ...BASE.customFieldSets[0],
          fields: [
            // Only the label changed.
            { key: 'outstanding_amount', kind: 'float', label: 'Amount still due', filterable: true },
            { key: 'currency_code', kind: 'text', label: 'Currency' },
          ],
        },
      ],
    })

    expect(before.entities['invoice'].fields.map((f) => f.id)).toEqual(
      after.entities['invoice'].fields.map((f) => f.id),
    )
    const plan: RenamePlan = planFieldRename(before, after)
    expect(plan.status).toBe('clean')
    expect(plan.requiresRecompilation).toBe(false)
    // The model's identity is stable, so the *export* differs only in the label
    // value — the ids and structure are identical.
    expect(exportModel(before).entities[0].fields.map((f) => f.id)).toEqual(
      exportModel(after).entities[0].fields.map((f) => f.id),
    )
  })
})

describe('rename test — a key rename requires recompilation', () => {
  const before = buildModelDescriptor(BASE)
  const after = buildModelDescriptor({
    ...BASE,
    customFieldSets: [
      {
        ...BASE.customFieldSets[0],
        fields: [
          { key: 'amount_due', kind: 'float', label: 'Outstanding amount', filterable: true },
          { key: 'currency_code', kind: 'text', label: 'Currency' },
        ],
      },
    ],
  })

  it('detects that an id disappeared and another appeared', () => {
    const plan = planFieldRename(before, after)
    expect(plan.status).toBe('requires_recompilation')
    expect(plan.requiresRecompilation).toBe(true)
    expect(plan.removedFieldIds).toContain('invoice.outstanding_amount')
    expect(plan.addedFieldIds).toContain('invoice.amount_due')
  })

  it('never mutates the old id — both ids remain valid and distinct', () => {
    const oldId = fieldIdOf('invoice', 'outstanding_amount')
    const newId = fieldIdOf('invoice', 'amount_due')
    expect(isCanonicalId(oldId)).toBe(true)
    expect(isCanonicalId(newId)).toBe(true)
    expect(oldId).not.toBe(newId)
    // The old id is superseded, not rewritten: the `before` model still carries it.
    expect(before.entities['invoice'].fields.some((f) => f.id === oldId)).toBe(true)
    // And the export of `before` is unchanged by the existence of `after`.
    expect(serialiseModelDocument(exportModel(before))).toContain(oldId)
  })

  it('would fail if a rename were applied silently — the guard this test is', () => {
    const plan = planFieldRename(before, after)
    // The central assertion: the plan is NOT 'clean'.
    expect(plan.status).not.toBe('clean')
  })
})

describe('rename test — a pure addition is clean', () => {
  it('adding a field needs no recompilation of the existing ones', () => {
    const before = buildModelDescriptor(BASE)
    const after = buildModelDescriptor({
      ...BASE,
      customFieldSets: [
        {
          ...BASE.customFieldSets[0],
          fields: [
            ...BASE.customFieldSets[0].fields,
            { key: 'due_date', kind: 'date', label: 'Due date' },
          ],
        },
      ],
    })
    const plan = planFieldRename(before, after)
    expect(plan.status).toBe('clean')
    expect(plan.addedFieldIds).toContain('invoice.due_date')
    expect(plan.removedFieldIds).toEqual([])
  })
})
