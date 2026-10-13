/**
 * The two gates a tool call passes before a business operation runs — the
 * `P2-4` requirement's half of the door (`PLAN-HERMES-PHASE2…` §2.10).
 *
 * **The design, in one line:** admission decides what a run may call (from the
 * agent, through the platform's existing machinery — the declared list narrowed
 * by bindings and permissions); the DOOR enforces what admission allowed and
 * never widens. This module is the enforcement, kept pure so it can be proven
 * without a runtime, a container or a worker.
 *
 * **The owner's design input behind it (2026-10-13):** *"A system agent
 * converting propmt to business ir may have specific tools it need all the
 * time. An AI user may need completely different tools and has to start wih a
 * different one depending on the task in hand."* The menu is therefore the
 * agent's (fixed for a built-in; task-shaped for a user-facing one — the
 * shaping itself is `CC-78`), and the model never chooses it mid-run.
 *
 * **Why the function is pure and the checks are few.** Every fact it needs is a
 * fact the door already holds: the tool name, the grant the caller presented,
 * and the run's own grant + recorded menu. It performs no I/O, resolves no
 * agent, and reads no registry — so it cannot accidentally widen (a check that
 * consults a live registry could be talked out of a refusal; this one cannot).
 * The menu it trusts was computed at admission by
 * `resolveAiAgentTools`/`checkAgentPolicy`, where the acting person's
 * permissions live.
 */

/** The run facts the gates need — nothing else about a run is visible here. */
export interface ToolCallGateRun {
  /** The grant the run was admitted under (the envelope's own value). */
  readonly capabilityGrantId: string
  /**
   * The effective tool menu recorded on the run at admission. **Absent means
   * nothing was recorded, and that is fail-closed**: a run whose menu was
   * never recorded may call nothing — an admission that did not happen is not
   * an admission that allowed everything.
   */
  readonly admittedToolMenu?: readonly string[] | null
}

/**
 * Why a call was refused. The reasons are deliberately coarse and never say
 * what the menu contains — a refusal is a decision, not a description.
 */
export type ToolCallRefusalReason =
  /** The caller presented no grant at all. */
  | 'no_grant'
  /** The grant belongs to a different run (or was invented). */
  | 'foreign_grant'
  /** The run has no recorded menu — nothing was admitted for it to call. */
  | 'no_menu_recorded'
  /** The run's menu does not include this tool — even with a valid grant. */
  | 'tool_not_in_menu'

export type ToolCallAdmission =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: ToolCallRefusalReason }

export interface ToolCallAdmissionInput {
  /** The tool being called (`call.toolName`). */
  readonly toolName: string
  /** The grant the caller presented with the call. */
  readonly capabilityGrant: string | undefined | null
  /** The run the call is being resolved against. */
  readonly run: ToolCallGateRun
}

/**
 * Decide whether a tool call may be executed. Pure, total, and deny-by-default:
 * every path that cannot prove admission ends in a refusal.
 *
 * **The gate order is deliberate — identity before authority.** A call that is
 * not this run's own is refused *before* the menu is consulted, so a caller
 * holding a foreign grant learns nothing about what the run may call. The
 * grant checks answer "is this the right run's call"; the menu check answers
 * "was this tool admitted for it". Both must pass, and neither substitutes for
 * the other (§8: the runtime may narrow the grant, never widen it — a grant
 * alone must NOT be able to buy a tool the agent's menu never named).
 */
export function checkToolCallAdmitted(input: ToolCallAdmissionInput): ToolCallAdmission {
  if (typeof input.capabilityGrant !== 'string' || input.capabilityGrant.trim().length === 0) {
    return { ok: false, reason: 'no_grant' }
  }
  if (input.capabilityGrant !== input.run.capabilityGrantId) {
    return { ok: false, reason: 'foreign_grant' }
  }
  const menu = input.run.admittedToolMenu
  if (!menu || menu.length === 0) {
    return { ok: false, reason: 'no_menu_recorded' }
  }
  if (!menu.includes(input.toolName)) {
    return { ok: false, reason: 'tool_not_in_menu' }
  }
  return { ok: true }
}

/**
 * The refusal message the door throws. One plain sentence per reason: the
 * caller (a person reading a log, a runtime reporting to a model) must be able
 * to act on it without asking what it means.
 */
export function describeToolCallRefusal(reason: ToolCallRefusalReason, toolName: string): string {
  switch (reason) {
    case 'no_grant':
      return `Tool call "${toolName}" was refused: no capability grant was presented. A tool call without a grant is exactly the business mutation outside the typed command path that the door exists to prevent.`
    case 'foreign_grant':
      return `Tool call "${toolName}" was refused: the presented grant belongs to a different run. A grant authorizes its own run's calls only — it is never transferable between runs.`
    case 'no_menu_recorded':
      return `Tool call "${toolName}" was refused: the run has no recorded tool menu, so nothing was admitted for it to call. A run whose admission was never recorded may call nothing.`
    case 'tool_not_in_menu':
      return `Tool call "${toolName}" was refused: the tool is not in the run's admitted tool menu. The menu is decided at admission from the agent's declaration (narrowed by its binding and the acting person's permissions), and a valid grant does not add to it — the runtime may narrow the grant, never widen it.`
  }
}
