/**
 * The document round-trip — rule 25's *"Widgets are versioned"*, made storable.
 *
 * A Widget is **a contract and an IR** (the plan's done-when for G-07), so the
 * document carries both. The validation is split to match: the contract's inputs
 * are *declarations* (an id, a kind, a source) and the IR's inputs carry a
 * *control*. Checking for a control on a declaration would demand a field the
 * contract does not have — which is the bug this suite caught on its first run.
 *
 * **The trap this suite is written around:** an empty diff is trivially satisfied
 * by exporting nothing. So the **first** assertion is that the export is
 * *non-empty* — it must carry the real dependencies, inputs and IR — and only then
 * is the round-trip asserted empty. The same guard G-01 and G-03 both carry.
 */

import {
  WIDGET_DOCUMENT_FORMAT,
  WIDGET_DOCUMENT_VERSION,
  exportWidget,
  importWidget,
  roundTripWidget,
  serialiseWidgetDocument,
} from '../document'
import type { WidgetDocument } from '../document'
import type { WidgetIR } from '../ir'
import type { BusinessWidget } from '../types'
import { place } from './fixtures'

function docWith(widget: BusinessWidget, ir: WidgetIR): WidgetDocument {
  return { format: WIDGET_DOCUMENT_FORMAT, version: WIDGET_DOCUMENT_VERSION, widget, ir }
}

describe('the export is non-empty first, so the round-trip is not vacuous', () => {
  it('carries the real dependencies, inputs, IR and the Function it presents', () => {
    const { widget, ir } = place()
    const serialised = serialiseWidgetDocument(exportWidget(widget, ir))

    expect(serialised.length).toBeGreaterThan(300)
    expect(serialised).toContain('external_conversation')
    expect(serialised).toContain('unread_conversations')
    expect(serialised).toContain('min_unread')
    expect(serialised).toContain('number_input')
    expect(exportWidget(widget, ir).widget.dependencies.entities).toEqual(['external_conversation'])
  })
})

describe('the round-trip', () => {
  it('is empty', () => {
    const { widget, ir } = place()
    const trip = roundTripWidget(widget, ir)
    expect(trip.empty).toBe(true)
    expect(trip.before).toBe(trip.after)
  })

  it('is byte-stable — two exports of the same Widget are identical strings', () => {
    const a = place()
    const b = place()
    expect(serialiseWidgetDocument(exportWidget(b.widget, b.ir))).toBe(
      serialiseWidgetDocument(exportWidget(a.widget, a.ir)),
    )
  })

  it('canonicalises the set-like fields, so declaration order cannot change the bytes', () => {
    const { widget, ir } = place()
    const reordered = {
      ...widget,
      dependencies: {
        ...widget.dependencies,
        entities: [...widget.dependencies.entities].reverse(),
        fields: [...widget.dependencies.fields].reverse(),
      },
      actions: [...widget.actions].reverse(),
      permissions: { ...widget.permissions, read: ['b', 'a'] },
    }
    const other = { ...reordered, permissions: { ...widget.permissions, read: ['a', 'b'] } }

    expect(serialiseWidgetDocument(exportWidget(reordered, ir))).toBe(
      serialiseWidgetDocument(exportWidget(other, ir)),
    )
  })

  it('keeps the order of inputs, because a form’s field order is meaningful', () => {
    const { widget, ir } = place({
      parameterSchema: [
        { name: 'first', kind: 'text', required: true },
        { name: 'second', kind: 'text', required: false },
      ],
    })
    const reordered = { ...widget, inputs: [...widget.inputs].reverse() }
    expect(exportWidget(widget, ir).widget.inputs.map((input) => input.id)).toEqual(['first', 'second'])
    expect(exportWidget(reordered, ir).widget.inputs.map((input) => input.id)).toEqual(['second', 'first'])
  })
})

describe('the import validates what it reads', () => {
  it('accepts a well-formed document, and gives back both halves', () => {
    const { widget, ir } = place()
    const back = importWidget(exportWidget(widget, ir))
    expect(back.widget.id).toBe(widget.id)
    expect(back.widget.inputs.map((input) => input.id)).toEqual(['min_unread'])
    expect(back.ir.inputs[0].control).toBe('number_input')
  })

  it('preserves an unknown key, so a newer producer’s document survives', () => {
    const { widget, ir } = place()
    const withExtra = { ...widget, somethingNew: { from: 'the future' } } as unknown as BusinessWidget
    const back = importWidget(docWith(withExtra, ir)).widget as unknown as Record<string, unknown>
    expect(back.somethingNew).toEqual({ from: 'the future' })
  })

  it.each([
    ['an unknown format', { format: 'other.format' }],
    ['an unknown version', { version: 99 }],
  ])('refuses %s', (_label, patch) => {
    const { widget, ir } = place()
    const doc = { ...docWith(widget, ir), ...patch } as unknown as WidgetDocument
    expect(() => importWidget(doc)).toThrow()
  })

  it.each([
    ['a non-canonical widget id', { id: 'Not Canonical' }],
    ['an unknown status', { status: 'live' }],
    ['a non-numeric version', { version: 'one' }],
    ['no tenant', { tenantId: '' }],
  ])('refuses %s', (_label, patch) => {
    const { widget, ir } = place()
    expect(() => importWidget(docWith({ ...widget, ...patch } as BusinessWidget, ir))).toThrow()
  })

  it('refuses a declaration of an unknown kind', () => {
    const { widget, ir } = place()
    const bad = { ...widget, inputs: [{ ...widget.inputs[0], type: 'quantum' }] } as unknown as BusinessWidget
    expect(() => importWidget(docWith(bad, ir))).toThrow(/unknown kind/)
  })

  it('refuses a declaration with an unknown source', () => {
    const { widget, ir } = place()
    const bad = { ...widget, inputs: [{ ...widget.inputs[0], source: 'telepathy' }] } as unknown as BusinessWidget
    expect(() => importWidget(docWith(bad, ir))).toThrow(/unknown source/)
  })

  it('refuses an IR input with an unknown control', () => {
    const { widget, ir } = place()
    const bad = { ...ir, inputs: [{ ...ir.inputs[0], control: 'fancy_widget' }] } as unknown as WidgetIR
    expect(() => importWidget(docWith(widget, bad))).toThrow(/unknown control/)
  })

  it('refuses an IR with no source, or an ambiguous one', () => {
    const { widget, ir } = place()
    expect(() => importWidget(docWith(widget, { ...ir, source: {} } as unknown as WidgetIR))).toThrow(/source/)
    expect(() =>
      importWidget(docWith(widget, { ...ir, source: { function: 'f', entity: 'e' } } as unknown as WidgetIR)),
    ).toThrow(/source/)
  })

  it('refuses a non-canonical dependency id', () => {
    const { widget, ir } = place()
    const bad = { ...widget, dependencies: { ...widget.dependencies, entities: ['External Conversation'] } }
    expect(() => importWidget(docWith(bad as BusinessWidget, ir))).toThrow(/canonical/)
  })
})

describe('the two halves must agree about the inputs', () => {
  it('refuses a user-supplied input the IR has no control for', () => {
    const { widget, ir } = place()
    // The contract declares the input; the IR has no control to fill it with.
    const badIr = { ...ir, inputs: [] } as unknown as WidgetIR
    expect(() => importWidget(docWith(widget, badIr))).toThrow(/no control/)
  })

  it('refuses an IR input the contract never declared', () => {
    const { widget, ir } = place()
    const badWidget = { ...widget, inputs: [] } as unknown as BusinessWidget
    expect(() => importWidget(docWith(badWidget, ir))).toThrow(/does not declare/)
  })

  it('allows a context-supplied input to have no control, because it arrives without a form', () => {
    const { widget, ir } = place()
    // A selection-driven input needs no control: the workspace supplies it.
    const withContextInput = {
      ...widget,
      inputs: [...widget.inputs, { id: 'selected', type: 'text' as const, required: false, source: 'selected_records' as const }],
    }
    expect(() => importWidget(docWith(withContextInput, ir))).not.toThrow()
  })
})
