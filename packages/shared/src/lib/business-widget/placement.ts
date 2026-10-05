/**
 * **Placement — the vision's most important reusable chain (§160).**
 *
 * > AI request → Business IR → result → **Save as Function** → **Function** →
 * > **Widget** → Workspace
 *
 * G-03 built the Function and proved it runs with no AI. But a Function that runs
 * is not yet something a person can *use*: it has a `parameterSchema` and no form,
 * an id and no place on a screen. **This module is the step that turns a published
 * Function into a Widget** — the arrow the vision calls the most important one.
 *
 * **The direction is one-way, and that is the design.** The inputs are *derived*
 * from the Function's `parameterSchema`; the control is *derived* from each
 * parameter's declared **kind**. Nothing here reads a value, guesses a type from a
 * name, or lets a Widget declare an input the Function does not have. So a
 * Function and its placed Widget cannot drift: change the parameters and the
 * derived Widget changes with them, and its version moves.
 *
 * **What it refuses.** A Function that is not runnable — G-03's own `isRunnable`,
 * not a second opinion. Placing a draft would put a button on a screen that runs
 * something nobody has decided on.
 *
 * **What it deliberately does not do.** It does not execute. Running the placed
 * Widget is G-03's `runFunction`, called with the values the form collected —
 * there is no second execution path, and the test asserts that the Widget's inputs
 * are exactly the Function's parameters by running one through the other.
 *
 * Source: Doc 5 §10, §11, §13, §34, §160; G-03's `parameterSchema`; COOKBOOK
 * Sprint G-07 step 3.3.
 */

import { isRunnable } from '../user-function/lifecycle'
import type { FunctionParameter, UserFunction } from '../user-function/types'
import { controlForKind } from './ir'
import type { WidgetIR, WidgetIROperationType, WidgetInput } from './ir'
import { EMPTY_WIDGET_DEPENDENCIES, EMPTY_WIDGET_PERMISSIONS } from './types'
import type {
  BusinessWidget,
  WidgetDependencies,
  WidgetInputDeclaration,
  WidgetLayout,
  WidgetPermissions,
} from './types'

export type PlacementFailureCode = 'NOT_RUNNABLE'

export type PlacementOptions = {
  /** Defaults to the Function's own id — one identity, not two. */
  widgetId?: string
  /** Defaults to the Function's name. */
  title?: string
  /** Overrides the IR type the operation would otherwise pick. */
  irType?: WidgetIROperationType
  layout?: WidgetLayout
}

export type PlacementResult =
  | { ok: true; widget: BusinessWidget; ir: WidgetIR }
  | { ok: false; code: PlacementFailureCode; reason: string }

/**
 * Turn a published Function into a Widget and its IR.
 *
 * Pure: same Function and options, same Widget — no clock, no database, no AI.
 */
export function placeFunction(
  fn: UserFunction,
  options: PlacementOptions = {},
): PlacementResult {
  if (!isRunnable(fn.status)) {
    return {
      ok: false,
      code: 'NOT_RUNNABLE',
      reason: `This Function is "${fn.status}". Only a published or active Function can be placed: putting a Widget on a screen is acting on the Function, and a Function that has not been published has not been decided on.`,
    }
  }

  const title = options.title ?? fn.name
  const inputs: WidgetInput[] = (fn.parameterSchema ?? []).map(inputForParameter)
  const actions = actionsFor(fn)

  const ir: WidgetIR = {
    type: options.irType ?? (fn.operationType === 'command' ? 'form' : 'data_grid'),
    title,
    // The Widget shows what the Function returns. It holds no data of its own
    // (rule 2), so "running the Widget" means "running the Function".
    source: { function: fn.id },
    inputs,
    actions,
  }

  const widget: BusinessWidget = {
    id: options.widgetId ?? fn.id,
    // The Widget takes the Function's version, so a new Function version is a new
    // Widget version — one number to move, not two that can disagree.
    version: fn.version,
    name: title,
    description: fn.description,
    purpose: `Run the saved operation "${fn.name}".`,
    // A Widget placed from a runnable Function is itself usable: its content is
    // the Function's, which has already been decided on, so placement introduces
    // no new behaviour to review. Our call, reported in the sprint.
    status: 'published',
    tenantId: fn.tenantId,
    organizationId: fn.organizationId ?? null,
    owner: fn.createdBy,
    inputs: (fn.parameterSchema ?? []).map(declarationForParameter),
    // No outputs are declared yet: a Widget's outputs are the Function's result
    // shape, which is G-03's `resultSchema` — still opaque, and not this sprint's
    // to define. Declaring an empty list is honest; inventing one would not be.
    outputs: [],
    actions,
    events: { emits: [], consumes: [] },
    dependencies: dependenciesOf(fn),
    permissions: permissionsOf(fn),
    collaboration: { supported: true },
    persistence: { type: 'workspace_object' },
    // §184 — the IR is semantic, so the runtime is renderer-independent.
    rendering: { renderer: 'semantic' },
    ai: { required: false },
    presentation: {
      title,
      ...(fn.description ? { description: fn.description } : {}),
      ...(options.layout ? { layout: options.layout } : {}),
    },
    ...(fn.createdAt ? { createdAt: fn.createdAt } : {}),
  }

  return { ok: true, widget, ir }
}

/* ------------------------------------------------------------------ *
 * Derivations — every one of them one-way, from the Function
 * ------------------------------------------------------------------ */

/** §34's `{ id, type, control }`, plus `required` and a label. */
function inputForParameter(parameter: FunctionParameter): WidgetInput {
  return {
    id: parameter.name,
    type: parameter.kind,
    control: controlForKind(parameter.kind),
    required: parameter.required,
    ...(parameter.label ? { label: parameter.label } : {}),
  }
}

/** The same input, as a contract declaration — §11's `source` is the Function. */
function declarationForParameter(parameter: FunctionParameter): WidgetInputDeclaration {
  return {
    id: parameter.name,
    type: parameter.kind,
    required: parameter.required,
    // §11 lists `function_parameter` as a source precisely so a placed input
    // declares that the Function fills it.
    source: 'function_parameter',
    ...(parameter.label ? { label: parameter.label } : {}),
    ...(parameter.description ? { description: parameter.description } : {}),
  }
}

/**
 * §13's actions, derived from what the operation is.
 *
 * A read is refreshed; a write is executed. This is a **minimal** derived set, not
 * the vision's full action vocabulary — declaring `['refresh']` is honest, and
 * inventing `open`/`share`/`comment` for a Widget that cannot yet do them would
 * not be. Our call, reported in the sprint.
 */
function actionsFor(fn: UserFunction): string[] {
  return fn.operationType === 'command' ? ['execute'] : ['refresh']
}

/** §15 — the Widget's dependency set is the Function's, plus the Function itself. */
function dependenciesOf(fn: UserFunction): WidgetDependencies {
  const references = fn.references
  return {
    ...EMPTY_WIDGET_DEPENDENCIES,
    entities: [...(references?.entities ?? [])],
    fields: [...(references?.fields ?? [])],
    metrics: [...(references?.metrics ?? [])],
    commands: [...(references?.commands ?? [])],
    workflows: [...(references?.workflows ?? [])],
    // The Widget depends on the Function it presents. This is the edge that makes
    // the registry able to answer "which Widgets use this Function?" (§114).
    functions: [fn.id],
  }
}

/**
 * The Function's required permissions, placed in the group that matches the
 * operation: a read needs `read`, a write needs `execute`.
 *
 * Rule 16 governs: these are **declarations for the host**, never the guard. The
 * platform re-checks authorization every time (§74), and G-04 is where that
 * enforcement is built.
 */
function permissionsOf(fn: UserFunction): WidgetPermissions {
  const required = [...(fn.requiredPermissions ?? [])]
  return {
    ...EMPTY_WIDGET_PERMISSIONS,
    ...(fn.operationType === 'command' ? { execute: required } : { read: required }),
  }
}
