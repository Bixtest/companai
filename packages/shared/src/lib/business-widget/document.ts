/**
 * The Widget as a durable document — rule 25's *"Widgets are versioned"*, made
 * storable.
 *
 * A Widget is **a contract and an IR** (the plan's own done-when for G-07), and
 * both are durable: the contract says what it is, the IR says what it presents.
 * So the document carries both, as siblings — the same way the vision treats them
 * in separate Parts (§10–§15 and §33–§35) while insisting they belong to one
 * object.
 *
 * The same discipline G-01 and G-03 both proved applies, and for the same reason:
 * a database row is *one place to keep it*, not what makes it durable. What makes
 * it durable is that it can be **written down and read back without loss**, which
 * is testable today with no database and no migration.
 *
 * So:
 *
 *   - a **versioned envelope** (`companai.business-widget`, version 1), so a future
 *     change to the shape is a declared version bump a reader can act on rather
 *     than a silent reinterpretation of old bytes;
 *   - **byte-stable** export, so two exports of the same Widget are identical
 *     strings — which is what makes the round-trip test mean anything;
 *   - import that validates the envelope, every canonical id, every declared kind,
 *     every control, and every input source, so a document the rest of the platform
 *     could not render or reference is refused loudly instead of stored and failing
 *     later.
 *
 * **Why a database row is deliberately not built here.** The same two measured
 * reasons as G-03, plus one: (i) this project tests DB-backed code against a
 * **mocked** EntityManager, so a migration written now would be **unprovable**;
 * (ii) the registry's shape is driven by the **`@`/`#` reference layer (G-09)**,
 * which will query it. **Trigger for the row: G-09.**
 *
 * **The trap, the same one G-01 and G-03 documented:** an empty diff is trivially
 * satisfied by exporting nothing. So the tests assert the export is **non-empty
 * first** — it must carry the real dependencies, inputs and IR — and only then
 * assert the round-trip is empty.
 *
 * Source: Doc 5 §10–§15, §33–§35, §112–§114, Part LXXIII rules 7 and 25; COOKBOOK
 * Sprint G-07 step 3.5.
 */

import { isCanonicalId, isCanonicalSegment } from '../kernel/canonical-id'
import { isCustomFieldKind } from '../../modules/entities/kinds'
import { WIDGET_CONTROLS, WIDGET_IR_TYPES } from './ir'
import type { WidgetControl, WidgetIR, WidgetIROperationType } from './ir'
import { WIDGET_INPUT_SOURCES, CONTROL_REQUIRING_SOURCES, WIDGET_STATUSES } from './types'
import type { BusinessWidget, WidgetInputSource, WidgetStatus } from './types'

/** The on-the-wire document. A Widget is its contract **and** its IR. */
export type WidgetDocument = {
  format: 'companai.business-widget'
  /** Format version. Bump when the document shape changes. */
  version: 1
  widget: BusinessWidget
  ir: WidgetIR
}

export const WIDGET_DOCUMENT_FORMAT = 'companai.business-widget' as const
export const WIDGET_DOCUMENT_VERSION = 1 as const

/**
 * Export a Widget to a stable document.
 *
 * Canonicalises the **set-like** fields (`dependencies.*`, `permissions.*`,
 * `actions`, `events.*`) by sorting them, so a Widget whose dependencies were
 * listed in a different order exports identically. **`inputs` are left in order**,
 * in both the contract and the IR — a form's field order is meaningful, and
 * sorting it would change the product to make a test simpler.
 */
export function exportWidget(widget: BusinessWidget, ir: WidgetIR): WidgetDocument {
  return {
    format: WIDGET_DOCUMENT_FORMAT,
    version: WIDGET_DOCUMENT_VERSION,
    widget: canonicaliseWidget(widget),
    ir: canonicaliseIr(ir),
  }
}

/**
 * Import a document back into a Widget.
 *
 * Validates the envelope, the status, every canonical id, and every declared kind,
 * control and input source. Unknown extra keys are **preserved** rather than
 * dropped: a document written by a newer producer must survive a round-trip
 * through this reader, and silently discarding data is the failure this module
 * exists to prevent.
 */
export function importWidget(doc: WidgetDocument): { widget: BusinessWidget; ir: WidgetIR } {
  if (!doc || typeof doc !== 'object') {
    throw new Error('importWidget: document is required')
  }
  if (doc.format !== WIDGET_DOCUMENT_FORMAT) {
    throw new Error(
      `importWidget: unknown document format ${JSON.stringify(doc.format)} — expected ${JSON.stringify(WIDGET_DOCUMENT_FORMAT)}`,
    )
  }
  if (doc.version !== WIDGET_DOCUMENT_VERSION) {
    throw new Error(
      `importWidget: unsupported document version ${JSON.stringify(doc.version)} — this reader reads version ${WIDGET_DOCUMENT_VERSION}`,
    )
  }

  const widget = doc.widget
  if (!widget || typeof widget !== 'object') {
    throw new Error('importWidget: the document carries no widget.')
  }

  assertId(widget.id, 'the widget id')
  if (!WIDGET_STATUSES.includes(widget.status as WidgetStatus)) {
    throw new Error(
      `importWidget: unknown status ${JSON.stringify(widget.status)} — expected one of ${WIDGET_STATUSES.join(', ')}.`,
    )
  }
  if (typeof widget.version !== 'number' || !Number.isFinite(widget.version)) {
    throw new Error(`importWidget: the widget version must be a number, got ${JSON.stringify(widget.version)}.`)
  }
  if (typeof widget.tenantId !== 'string' || widget.tenantId.length === 0) {
    throw new Error('importWidget: a Widget must carry a tenantId.')
  }

  // The contract's inputs are DECLARATIONS: an id, a kind, a source. The control
  // is the IR's business, and checking for one here would demand a field the
  // contract does not have.
  for (const input of widget.inputs ?? []) {
    if (!isCanonicalSegment(input.id)) {
      throw new Error(`importWidget: input id ${JSON.stringify(input.id)} is not a canonical segment.`)
    }
    if (!isCustomFieldKind(input.type)) {
      throw new Error(`importWidget: input ${JSON.stringify(input.id)} has unknown kind ${JSON.stringify(input.type)}.`)
    }
    if (!WIDGET_INPUT_SOURCES.includes(input.source as WidgetInputSource)) {
      throw new Error(
        `importWidget: input ${JSON.stringify(input.id)} has unknown source ${JSON.stringify(input.source)} — expected one of ${WIDGET_INPUT_SOURCES.join(', ')}.`,
      )
    }
  }

  // Every dependency that names a model object must be a canonical id.
  const dependencies = widget.dependencies
  if (dependencies) {
    for (const [key, ids] of Object.entries(dependencies)) {
      for (const id of ids ?? []) {
        if (typeof id !== 'string' || id.length === 0) {
          throw new Error(`importWidget: dependencies.${key} carries ${JSON.stringify(id)}, which is not a non-empty string.`)
        }
      }
    }
    for (const key of ['entities', 'fields', 'relationships', 'metrics'] as const) {
      for (const id of dependencies[key] ?? []) assertId(id, `dependencies.${key}`)
    }
  }

  const permissions = widget.permissions
  if (permissions) {
    for (const [key, values] of Object.entries(permissions)) {
      for (const value of values ?? []) {
        if (typeof value !== 'string' || value.length === 0) {
          throw new Error(`importWidget: permissions.${key} carries ${JSON.stringify(value)}, which is not a non-empty string.`)
        }
      }
    }
  }

  const ir = readIr(doc.ir)

  // **The two halves must agree about the inputs, in both directions.**
  //
  // An input the user (or the Function) must fill needs a control to fill it
  // with, so a contract input with a control-requiring source and no matching IR
  // input is a form field that could never be drawn — a silent gap. And an IR
  // input the contract never declared collects something the widget does not say
  // it takes. Either one alone would leave the other direction open, so both are
  // checked. (An input from workspace context, a selection, a deep link or a
  // schedule legitimately has no control, which is why the check is keyed on the
  // declared source and not on mere presence.)
  const irInputIds = new Set(ir.inputs.map((input) => input.id))
  const declaredIds = new Set((widget.inputs ?? []).map((input) => input.id))
  for (const input of widget.inputs ?? []) {
    if (CONTROL_REQUIRING_SOURCES.includes(input.source) && !irInputIds.has(input.id)) {
      throw new Error(
        `importWidget: input ${JSON.stringify(input.id)} comes from "${input.source}" but the IR has no control for it, so it could never be filled.`,
      )
    }
  }
  for (const input of ir.inputs) {
    if (!declaredIds.has(input.id)) {
      throw new Error(
        `importWidget: the IR collects ${JSON.stringify(input.id)}, which the widget's contract does not declare.`,
      )
    }
  }

  return { widget: clone(widget), ir }
}

/** The IR, validated. §34's shape, and §35's ban on frontend vocabulary. */
function readIr(ir: WidgetIR): WidgetIR {
  if (!ir || typeof ir !== 'object') {
    throw new Error('importWidget: the document carries no widget IR. A Widget is a contract and an IR.')
  }
  if (!WIDGET_IR_TYPES.includes(ir.type as WidgetIROperationType)) {
    throw new Error(
      `importWidget: unknown IR type ${JSON.stringify(ir.type)} — expected one of ${WIDGET_IR_TYPES.join(', ')}.`,
    )
  }
  if (typeof ir.title !== 'string' || ir.title.length === 0) {
    throw new Error('importWidget: the IR must carry a non-empty title.')
  }
  if (!ir.source || typeof ir.source !== 'object') {
    throw new Error('importWidget: the IR must name a source.')
  }
  const sourceKeys = Object.keys(ir.source)
  if (sourceKeys.length !== 1 || (sourceKeys[0] !== 'function' && sourceKeys[0] !== 'entity')) {
    throw new Error(
      `importWidget: the IR source must be exactly one of { function } or { entity }, got ${JSON.stringify(ir.source)}.`,
    )
  }
  for (const input of ir.inputs ?? []) {
    if (!isCanonicalSegment(input.id)) {
      throw new Error(`importWidget: IR input id ${JSON.stringify(input.id)} is not a canonical segment.`)
    }
    if (!isCustomFieldKind(input.type)) {
      throw new Error(`importWidget: IR input ${JSON.stringify(input.id)} has unknown kind ${JSON.stringify(input.type)}.`)
    }
    if (!WIDGET_CONTROLS.includes(input.control as WidgetControl)) {
      throw new Error(
        `importWidget: IR input ${JSON.stringify(input.id)} has unknown control ${JSON.stringify(input.control)} — expected one of ${WIDGET_CONTROLS.join(', ')}.`,
      )
    }
  }
  return clone(ir)
}

/** The document's canonical string form. The round-trip compares this, not objects. */
export function serialiseWidgetDocument(doc: WidgetDocument): string {
  return stableStringify(doc)
}

/**
 * The whole round-trip, and the emptiness check, in one call.
 *
 * Returns what differed as well as whether anything did, so a failure can be
 * reported rather than merely detected.
 */
export function roundTripWidget(
  widget: BusinessWidget,
  ir: WidgetIR,
): { reimported: WidgetDocument; empty: boolean; before: string; after: string } {
  const before = serialiseWidgetDocument(exportWidget(widget, ir))
  const read = importWidget(exportWidget(widget, ir))
  const reimported = exportWidget(read.widget, read.ir)
  const after = serialiseWidgetDocument(reimported)
  return { reimported, empty: before === after, before, after }
}

/** Sorted, because these fields are sets of dependencies, not sequences. */
export function canonicaliseWidget(widget: BusinessWidget): BusinessWidget {
  const dependencies = widget.dependencies
  return {
    ...widget,
    ...(dependencies
      ? {
          dependencies: {
            capabilities: sorted(dependencies.capabilities),
            entities: sorted(dependencies.entities),
            fields: sorted(dependencies.fields),
            relationships: sorted(dependencies.relationships),
            metrics: sorted(dependencies.metrics),
            functions: sorted(dependencies.functions),
            commands: sorted(dependencies.commands),
            workflows: sorted(dependencies.workflows),
            policies: sorted(dependencies.policies),
            knowledge: sorted(dependencies.knowledge),
            skills: sorted(dependencies.skills),
            widgets: sorted(dependencies.widgets),
          },
        }
      : {}),
    permissions: {
      read: sorted(widget.permissions?.read ?? []),
      interact: sorted(widget.permissions?.interact ?? []),
      execute: sorted(widget.permissions?.execute ?? []),
      share: sorted(widget.permissions?.share ?? []),
    },
    actions: sorted(widget.actions ?? []),
    events: {
      emits: sorted(widget.events?.emits ?? []),
      consumes: sorted(widget.events?.consumes ?? []),
    },
  }
}

/** The IR's set-like field sorted; its `inputs` left in form order. */
export function canonicaliseIr(ir: WidgetIR): WidgetIR {
  return { ...ir, actions: sorted(ir.actions ?? []) }
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort()
}

/** A deep copy through JSON, so an imported Widget shares nothing with the document. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertId(id: string, what: string): void {
  if (!isCanonicalId(id)) {
    throw new Error(
      `importWidget: ${what} is ${JSON.stringify(id)}, which is not a canonical id (segment('.'segment)*, each matching [a-z][a-z0-9_]*).`,
    )
  }
}

/**
 * JSON with object keys in sorted order, so two structurally equal values always
 * produce the same string. Arrays keep their order — the export already
 * canonicalises the ones that are sets, and re-sorting here would hide a real
 * ordering difference.
 *
 * Exported because the registry needs the same notion of "the same content" when
 * it detects a collision, and two different notions would be two answers to one
 * question.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(val as Record<string, unknown>).sort()) {
        out[key] = (val as Record<string, unknown>)[key]
      }
      return out
    }
    return val
  })
}
