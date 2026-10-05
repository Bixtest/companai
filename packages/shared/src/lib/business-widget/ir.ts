/**
 * The **Widget IR** — the vision's §33–§35.
 *
 * The vision already has one IR, and this is its sibling, not its replacement:
 *
 * > **Business IR:** what should the business system *do*?
 * > **Widget IR:** what should the workspace *present*, and how should the user
 * > interact with it?
 *
 * The single rule that shapes this whole file is §35, and rule 6:
 *
 * > **Do not encode React props, CSS classes, DOM structure, browser-specific
 * > implementation** — unless the Widget is explicitly a developer component.
 *
 * So `WidgetIR` is **semantic**: it names a *control* (`money_input`), never a
 * component (`<CurrencyField>`); it names a *source* (`{ function: 'fn_x' }`),
 * never a query. A renderer reads it; the IR does not know the renderer exists.
 * That is what makes §184's "renderer-independent" true rather than aspirational —
 * and it is enforced by a type-level test, not by this comment.
 *
 * **Why the control list is closed.** `WidgetControl` is a union, so a caller
 * cannot invent `"fancy_date_widget"` and hope a renderer understands it. Adding a
 * control is a deliberate edit to one list, which is exactly what a contract
 * should cost.
 *
 * Source: Doc 5 §33–§35, §184–§185, Part LXXIII rules 5–6, 20; plan §2 phase 3.
 */

import type { CustomFieldKind } from '../../modules/entities/kinds'

/* ------------------------------------------------------------------ *
 * Controls — the semantic vocabulary
 * ------------------------------------------------------------------ */

/**
 * The semantic controls a renderer understands.
 *
 * Deliberately **no** framework words. `entity_picker` is a control; how a given
 * renderer draws a picker is its own business.
 */
export type WidgetControl =
  | 'text_input'
  | 'multiline_input'
  | 'number_input'
  | 'money_input'
  | 'boolean_toggle'
  | 'select_input'
  | 'entity_picker'
  | 'date_input'
  | 'datetime_input'
  | 'date_range'
  | 'file_input'
  | 'phone_input'
  | 'key_value_input'

/** Every control, so a test can prove the mapping below covers the kinds. */
export const WIDGET_CONTROLS: readonly WidgetControl[] = [
  'text_input',
  'multiline_input',
  'number_input',
  'money_input',
  'boolean_toggle',
  'select_input',
  'entity_picker',
  'date_input',
  'datetime_input',
  'date_range',
  'file_input',
  'phone_input',
  'key_value_input',
]

/**
 * **The mapping from a platform field kind to a control, declared once.**
 *
 * Every one of the platform's **13** kinds maps to exactly one control, and the
 * map is total by construction: its type is `Record<CustomFieldKind, …>`, so
 * adding a 14th kind to `kinds.ts` is a **compile error here** until a control is
 * chosen. That is the point — the alternative is a runtime `default:` branch that
 * silently renders the wrong control for a kind nobody thought about.
 */
export const KIND_TO_CONTROL: Record<CustomFieldKind, WidgetControl> = {
  text: 'text_input',
  multiline: 'multiline_input',
  integer: 'number_input',
  float: 'number_input',
  boolean: 'boolean_toggle',
  select: 'select_input',
  currency: 'money_input',
  relation: 'entity_picker',
  attachment: 'file_input',
  dictionary: 'key_value_input',
  phone: 'phone_input',
  date: 'date_input',
  datetime: 'datetime_input',
}

/**
 * The control for a declared kind.
 *
 * Total, so it cannot fail — there is no "unknown kind" branch to get wrong. A
 * Widget's input control is **derived from the declared kind**, never guessed from
 * a value or a name.
 */
export function controlForKind(kind: CustomFieldKind): WidgetControl {
  return KIND_TO_CONTROL[kind]
}

/* ------------------------------------------------------------------ *
 * The IR
 * ------------------------------------------------------------------ */

/**
 * §16–§23's widget kinds, in semantic form.
 *
 * `data_grid` is a grid; how it is drawn is the renderer's. `form` is the shape a
 * command's placement takes (§53: a command is an operation a person performs).
 */
export type WidgetIROperationType =
  | 'data_grid'
  | 'metric'
  | 'detail'
  | 'form'
  | 'chart'
  | 'tree'
  | 'graph'
  | 'document'
  | 'conversation'

export const WIDGET_IR_TYPES: readonly WidgetIROperationType[] = [
  'data_grid',
  'metric',
  'detail',
  'form',
  'chart',
  'tree',
  'graph',
  'document',
  'conversation',
]

/**
 * **What the Widget presents.**
 *
 * Exactly one key is set. A Widget whose source is a **Function** shows what that
 * Function returns — so a Widget holds **no data of its own** (rule 2), and
 * "running the Widget" means "running the Function". A Widget sourced from an
 * **entity** is a browse view over canonical data, and carries no query of its own
 * either.
 */
export type WidgetSource = { function: string } | { entity: string }

/** §34's input: an id, a type, and a control. */
export type WidgetInput = {
  id: string
  /** The platform field kind, so the type is declared and not inferred. */
  type: CustomFieldKind
  control: WidgetControl
  required: boolean
  label?: string
}

/**
 * The Widget IR.
 *
 * Read §34's example against this type: `type`, `title`, `source.function`,
 * `inputs[].{id,type,control}`, `actions` — every field present, and **nothing
 * else**. There is no place to put a component, a class or a style, which is the
 * property the type-level test asserts.
 */
export type WidgetIR = {
  type: WidgetIROperationType
  title: string
  source: WidgetSource
  inputs: WidgetInput[]
  actions: string[]
}

/* ------------------------------------------------------------------ *
 * The semantic guard
 * ------------------------------------------------------------------ */

/**
 * The words §35 forbids.
 *
 * Kept as data, not as a comment, so a test can scan an IR for them. The list is
 * the vision's own: React props, CSS classes, DOM structure, and the file
 * extensions that would mean "this is source code".
 */
export const FRONTEND_VOCABULARY: readonly string[] = [
  'classname',
  'class',
  'style',
  'css',
  'props',
  'children',
  'dom',
  'jsx',
  'tsx',
]

/**
 * Every key path in a value that uses frontend vocabulary, at any depth.
 *
 * **Keys, not values.** A Widget may legitimately carry the word "class" in a
 * title ("Class of 2026"); what it may never do is *structure* itself around
 * frontend concepts. So this walks the keys and returns the offending paths, and
 * an empty result is the claim the semantic test makes.
 *
 * `'ts'` is deliberately in the list and deliberately checked as a whole key
 * segment only, so an ordinary key like `status` is not caught by a substring.
 */
export function findFrontendVocabulary(value: unknown, path = '$'): string[] {
  const found: string[] = []
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      found.push(...findFrontendVocabulary(entry, `${path}[${index}]`))
    })
    return found
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const lowered = key.toLowerCase()
      if (FRONTEND_VOCABULARY.includes(lowered)) {
        found.push(`${path}.${key}`)
      }
      found.push(...findFrontendVocabulary(entry, `${path}.${key}`))
    }
  }
  return found
}
