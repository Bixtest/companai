/**
 * The **Business Widget** contract — the vision's §10 and §195.
 *
 * The vision's sentence that fixes what this is (Doc 5, Part LXXIII rule 14):
 *
 * > **Function = behavior; Widget = interaction.**
 *
 * A Widget is therefore **not** a UI component. It is a **first-class typed
 * object** that says *what is presented and how a person interacts with it* — and
 * something else (the host) renders it. Rule 6 is explicit: the Widget IR
 * describes interaction requirements, **not frontend source code**, and rule 20
 * forbids AI from emitting UI code. So this type deliberately contains no React,
 * no CSS and no DOM: a Widget that *was* a component would make "AI proposes a
 * Widget" mean "AI writes TSX", which is the one thing the vision rules out.
 *
 * **Why it is called a `BusinessWidget` and not a `Widget`.** The Starting Kit
 * already uses the word *widget* for its dashboard tiles — a TSX component with a
 * metadata id and injection slots (`packages/shared/src/modules/widgets/`). Two
 * different objects under one name would be a trap in every later file. The
 * analysis programme recommended this split (batch 4 §15b, carried to batch 9),
 * and Sprint G-07 takes it: **the kit's tile keeps the word `widget`; this object
 * is a `BusinessWidget`.** Recorded in `compai/planning/CHANGELOG.md` as *our*
 * call, not an owner decision, so it can be overruled in one line.
 *
 * **What this file deliberately does NOT invent.** A lifecycle *machine*. §68
 * draws a six-state chain, and this file carries the six states and the single
 * predicate that answers "may this be used" — but an enforced transition machine
 * is not in G-07's done-when (the plan asks for "a first-class typed object with a
 * contract and an IR"), and building one here would be inventing a requirement.
 * The states are the vision's; the enforcement is a later item's.
 *
 * Source: Doc 5 §10–§15, §68, §73, §112–§114, §195, Part LXXIII; plan §2 phase 3.
 */

import type { CustomFieldKind } from '../../modules/entities/kinds'

/* ------------------------------------------------------------------ *
 * §68 — the lifecycle, as declared states
 * ------------------------------------------------------------------ */

/**
 * §68's chain: `DRAFT → VALIDATED → PUBLISHED → ACTIVE → DEPRECATED → ARCHIVED`.
 *
 * Note this is **six** states, not the Function's eight (§44) — a Widget has no
 * `GENERATED` or `VERIFIED` step, because a Widget is not the thing that gets
 * verified. The Function it places is.
 */
export type WidgetStatus =
  | 'draft'
  | 'validated'
  | 'published'
  | 'active'
  | 'deprecated'
  | 'archived'

/** Every state, in the vision's order. */
export const WIDGET_STATUSES: readonly WidgetStatus[] = [
  'draft',
  'validated',
  'published',
  'active',
  'deprecated',
  'archived',
]

/**
 * **The single place that answers "may this Widget be used".**
 *
 * Only `published` and `active`. A draft is a proposal (§69), and a deprecated or
 * archived Widget has been withdrawn. One predicate, so no caller gets its own
 * opinion — the same discipline as the Function's `isRunnable`.
 */
export function isWidgetUsable(status: WidgetStatus): boolean {
  return status === 'published' || status === 'active'
}

/* ------------------------------------------------------------------ *
 * §11 — where an input's value comes from
 * ------------------------------------------------------------------ */

/**
 * §11's list, verbatim. Declaring the *source* is what stops a Widget from
 * quietly inventing a value: a `function_parameter` input is filled by the
 * Function's own schema, a `selected_records` input by the workspace.
 */
export type WidgetInputSource =
  | 'user'
  | 'function_parameter'
  | 'workspace_context'
  | 'selected_records'
  | 'widget_output'
  | 'deep_link'
  | 'saved_state'
  | 'ai_proposal'
  | 'schedule'

export const WIDGET_INPUT_SOURCES: readonly WidgetInputSource[] = [
  'user',
  'function_parameter',
  'workspace_context',
  'selected_records',
  'widget_output',
  'deep_link',
  'saved_state',
  'ai_proposal',
  'schedule',
]

/**
 * The input sources that need a **control** in the IR.
 *
 * An input a person types (`user`) or the Function fills from its schema
 * (`function_parameter`) must appear in the IR, because the IR is what says how it
 * is collected. The others — workspace context, selected records, a widget's
 * output, a deep link, saved state, an AI proposal, a schedule — arrive without a
 * form, so an input with one of those sources legitimately has no control.
 *
 * This list exists so the document reader can refuse a contract input that claims
 * to be user-supplied but has nothing to supply it with: a form field that can
 * never be drawn is a silent gap, the same class of defect as a sort that quietly
 * does nothing.
 */
export const CONTROL_REQUIRING_SOURCES: readonly WidgetInputSource[] = ['user', 'function_parameter']

/* ------------------------------------------------------------------ *
 * §12 — outputs are typed
 * ------------------------------------------------------------------ */

/**
 * §12 gives *examples* of output types; these are their semantic forms, so the
 * type is closed (a caller cannot invent a string) while the meaning is the
 * vision's. §12's own examples map one-to-one: `CustomerRef` → `entity_ref`,
 * `InvoiceRef[]` → `entity_ref_list`, `MetricResult` → `metric_result`, and so on.
 */
export type WidgetOutputType =
  | 'entity_ref'
  | 'entity_ref_list'
  | 'metric_result'
  | 'table_result'
  | 'chart_data'
  | 'report'
  | 'document_ref'
  | 'function_result'
  | 'workflow_ref'
  | 'task_list'

/* ------------------------------------------------------------------ *
 * The parts of the contract
 * ------------------------------------------------------------------ */

/** A declared input. `type` is a platform field kind, so nothing second is invented. */
export type WidgetInputDeclaration = {
  id: string
  type: CustomFieldKind
  required: boolean
  /** §11 — where the value comes from. */
  source: WidgetInputSource
  label?: string
  description?: string
}

/** A declared output. §12: outputs are typed, and never raw frontend state. */
export type WidgetOutputDeclaration = {
  id: string
  type: WidgetOutputType
}

/** §14 — loose coupling: a Widget emits and consumes events without knowing producers. */
export type WidgetEvents = {
  emits: string[]
  consumes: string[]
}

/**
 * §15 — everything whose change can invalidate the Widget.
 *
 * This is the Widget's half of the platform's dependency graph (§106–§108), and
 * it is why the registry can answer "what breaks if this field is renamed?".
 */
export type WidgetDependencies = {
  capabilities: string[]
  entities: string[]
  fields: string[]
  relationships: string[]
  metrics: string[]
  functions: string[]
  commands: string[]
  workflows: string[]
  policies: string[]
  knowledge: string[]
  skills: string[]
  widgets: string[]
}

/** Every dependency list, empty. Exported so callers do not each invent one. */
export const EMPTY_WIDGET_DEPENDENCIES: WidgetDependencies = {
  capabilities: [],
  entities: [],
  fields: [],
  relationships: [],
  metrics: [],
  functions: [],
  commands: [],
  workflows: [],
  policies: [],
  knowledge: [],
  skills: [],
  widgets: [],
}

/**
 * §195's four permission groups.
 *
 * §73 names a finer set (*view, interact, edit, configure, execute, comment,
 * share, publish*); these four are the **manifest's** grouping, and the finer
 * permissions belong inside them. Rule 16 governs both: **a Widget permission
 * never replaces business authorization** — §74 is explicit that the platform
 * re-checks user, tenant, role, policy, record, threshold and workflow state
 * every time. These lists are declarations for the host; they are not the guard.
 */
export type WidgetPermissions = {
  read: string[]
  interact: string[]
  execute: string[]
  share: string[]
}

/** Every permission group, empty. */
export const EMPTY_WIDGET_PERMISSIONS: WidgetPermissions = {
  read: [],
  interact: [],
  execute: [],
  share: [],
}

/** §10's `collaboration: { supported }`. */
export type WidgetCollaboration = { supported: boolean }

/** §10's `persistence.type`. A Widget keeps no business truth of its own (rule 2). */
export type WidgetPersistenceType = 'workspace_object' | 'ephemeral'
export type WidgetPersistence = { type: WidgetPersistenceType }

/**
 * §184–§185 — the runtime is **renderer-independent**.
 *
 * `renderer` names the *kind* of renderer the IR targets, never a framework: the
 * IR is semantic, so more than one renderer can consume it. `'semantic'` is the
 * default and the only value this sprint produces.
 */
export type WidgetRendering = { renderer: string }

/** §195's `responsive`. Declared constraints, not CSS. */
export type WidgetResponsive = { minWidth?: number; breakpoints?: string[] }

/** §195's `ai`. `required: false` is the norm — a placed Function needs no model. */
export type WidgetAi = { required: boolean; skills?: string[] }

/** The four layout shapes the semantic renderer understands. */
export type WidgetLayout = 'stack' | 'grid' | 'tabs' | 'split'

/**
 * **The field G-03 left opaque, now defined.**
 *
 * `UserFunction.presentation` and `.ui` were carried as `unknown` on purpose, so
 * that defining them here would not require a migration. This is that definition:
 * presentational metadata, semantic, with no framework vocabulary.
 */
export type WidgetPresentation = {
  title?: string
  description?: string
  icon?: string
  layout?: WidgetLayout
}

/* ------------------------------------------------------------------ *
 * The contract itself — §10 and §195 together
 * ------------------------------------------------------------------ */

/**
 * The Business Widget.
 *
 * Every id that names a model object (`dependencies.*`, and an input of kind
 * `relation`) is a **canonical id** (G-01's grammar), never a physical key — rule
 * 11: *"canonical EntityRef objects should be used instead of copied business
 * data"*. A Widget that copied a row would be a second source of truth, which rule
 * 2 forbids.
 */
export type BusinessWidget = {
  /** The §12.1 canonical id of the Widget itself. */
  id: string
  /**
   * The Widget's version. Rule 25: *"Widgets are versioned"*.
   *
   * A placed Widget takes its **Function's** version, so a new Function version is
   * a new Widget version — one number to move, not two that can disagree.
   */
  version: number

  name: string
  description?: string
  /** §10's `purpose`, and rule 38: every Widget has a clear owner, purpose and graph. */
  purpose?: string

  status: WidgetStatus

  /** The tenant that owns it. Every object in this platform is tenant-scoped. */
  tenantId: string
  organizationId?: string | null

  /** §112's `owner` — who is answerable for it. */
  owner?: string
  /** §112's `scope` — personal or organizational reach. */
  scope?: string

  /** §10's `inputs` / §195's `inputs`. */
  inputs: WidgetInputDeclaration[]
  /** §10's `outputs` / §195's `outputs`. */
  outputs: WidgetOutputDeclaration[]
  /** §13's `actions` — user or system operations. */
  actions: string[]
  /** §14's `events`. */
  events: WidgetEvents

  dependencies: WidgetDependencies
  permissions: WidgetPermissions

  collaboration: WidgetCollaboration
  persistence: WidgetPersistence
  rendering: WidgetRendering
  responsive?: WidgetResponsive
  ai: WidgetAi

  presentation?: WidgetPresentation

  createdAt?: string
  updatedAt?: string
}

/* ------------------------------------------------------------------ *
 * §112–§114 — the registry's entry, and the object graph
 * ------------------------------------------------------------------ */

/** §112 — a Widget as a first-class registry object. */
export type WidgetRegistryEntry = {
  objectType: 'widget'
  objectId: string
  version: number
  owner?: string
  scope?: string
  status: WidgetStatus
  dependencies: WidgetDependencies
  permissions: WidgetPermissions
}

/**
 * §113 — a **definition** and an **instance** are different objects.
 *
 * The same Widget placed in five workspaces still has one canonical identity
 * (`widgetId`); each placement is an instance. Rule 7: *"Widget definitions are
 * distinct from widget instances."*
 */
export type WidgetInstance = {
  instanceId: string
  widgetId: string
  version: number
  /** Where it was placed. A workspace id, a document id, a conversation id. */
  host?: string
  /** A named slot within the host, when the host has more than one. */
  slot?: string
}

/** §106–§108 — an edge in the dependency graph, as the registry reports it. */
export type WidgetDependencyEdge = {
  from: string
  to: string
  /** Which dependency list the edge came from, so a reader can act on it. */
  kind: keyof WidgetDependencies
}

/**
 * Two Widgets claiming one identity.
 *
 * Reported, never merged — the same rule G-01 and G-02 both follow. A silent merge
 * would make the registry answer a question about an object nobody wrote.
 */
export type WidgetCollision = {
  widgetId: string
  version: number
  reason: string
}
