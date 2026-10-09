/**
 * The state-machine primitive — a declaration, and the four facets it enforces.
 *
 * The vision's §10 promotes lifecycle from a per-module habit to a **core
 * primitive**: *"generic state-machine engine … allowed transitions, transition
 * permissions, preconditions, events. Today pipelines exist only inside
 * `customers`; the blueprint makes lifecycle generic."* The verbatim requirement is
 * quoted in BUILD-ORDER §3 item 9 and `SUB-IMPLEMENTATION-PLAN-CC40-and-G-22.md`
 * §3.
 *
 * **What this file is, and what it deliberately is NOT.** It is the *shape* of a
 * lifecycle — states, the transitions between them, and the three things that can
 * gate or accompany a transition (a permission, a precondition, an event). It is
 * **not** an engine that knows what a permission or a precondition *is*: those are
 * supplied by the caller as functions, so this primitive carries no policy, no
 * authority import, and no domain knowledge. That is what lets one engine serve
 * every module (rule S5: *one permission engine, never a second one*) — a
 * permission check *delegates*, it is not re-implemented here.
 *
 * **The `G-03` lesson, generalised.** `user-function/lifecycle.ts` (the Function
 * lifecycle, verified `☑`) refuses an illegal move with `{ ok: false, reason }` —
 * *a refusal with a value*, never a silent no-op. This module keeps that exact
 * contract, and widens it from one hard-coded chain to any declared graph, with
 * permission and precondition failures folded into the same refusal shape so a
 * caller never has to ask a second question to learn *why* a move was refused.
 *
 * Source: blueprint §10; BUILD-ORDER §3 item 9; `user-function/lifecycle.ts` (the
 * shape this generalises).
 */

/* ------------------------------------------------------------------ *
 * The declaration — what a lifecycle IS
 * ------------------------------------------------------------------ */

/**
 * A single transition: one edge of the graph.
 *
 * `from` and `to` are state ids (opaque strings — the engine never enumerates
 * them, so a module names its own states). `permission` and `precondition` are
 * **optional gates**; an edge with neither is allowed whenever it is a declared
 * edge at all. `emit` names the event(s) the transition announces — carried on
 * the edge, not computed, because an event is part of what the transition *means*.
 *
 * **Why `emit` is an array and not a single string.** A transition can announce
 * more than one fact (e.g. `deal.stage.changed` *and* `deal.won`), and an event
 * bus that can only be told one thing forces the caller to choose — which loses
 * information. An empty or absent array means "this transition announces nothing".
 */
export type StateTransition<TContext = unknown, TActor = unknown> = {
  from: string
  to: string
  /**
   * A gate that answers "may this actor make this move?".
   *
   * **Delegated, never implemented here.** The engine calls it and turns `false`
   * into a refusal; *who* is allowed is the caller's policy (typically the
   * authority layer). Returning a value rather than throwing keeps the engine
   * pure and the failure describable.
   */
  permission?: TransitionGate<TContext, TActor>
  /**
   * A gate that answers "are the conditions for this move met?".
   *
   * Distinct from `permission` on purpose: a permission is about *who*, a
   * precondition is about *whether the world is ready* (a deal has a value, a
   * document passed verification). They refuse for different reasons, so they are
   * separate fields and separate refusal kinds, even though both are predicates.
   */
  precondition?: TransitionGate<TContext, TActor>
  /** The event name(s) this transition announces. Opaque to the engine. */
  emit?: string | readonly string[]
}

/**
 * A gate — the shared shape of `permission` and `precondition`.
 *
 * It receives the actor (who is moving the object) and a caller-defined context
 * (the object itself, or whatever the caller needs to decide). Its answer is read
 * **strictly**:
 *   - `true` — allow.
 *   - a **non-empty string** — refuse, and the string *is* the reason (so a gate
 *     that knows why can say so without the engine inventing a message).
 *   - **anything else** — refuse, with the engine's fallback reason. This includes
 *     `false`, but also `null`, `undefined`, `0`, `''` and `NaN`: a gate that
 *     failed to answer is **not** a yes. Fail closed (the same rule the permission
 *     guards use), because a hole read as an allow is the "silent allow" defect
 *     this primitive exists to prevent.
 *
 * **An *absent* gate is different from a gate returning `undefined`.** Omitting
 * `permission`/`precondition` declares an ungated edge and allows; supplying a gate
 * that returns nothing refuses. That distinction is deliberate: "no rule" and "a
 * rule that did not answer" are not the same thing.
 */
export type TransitionGate<TContext = unknown, TActor = unknown> = (
  actor: TActor,
  context: TContext,
) => boolean | string

/**
 * A lifecycle declaration — the whole graph, plus its named facets.
 *
 * `states` is the complete set of legal states. It is carried (rather than derived
 * from the edges) so the engine can refuse a `to` that names the *empty* state —
 * a value that appears in no edge but is still an invalid target, because no edge
 * carries the actor into it.
 */
export type StateMachineDeclaration<TContext = unknown, TActor = unknown> = {
  /** A human-readable name for the machine, used in refusal messages. */
  name: string
  /** Every legal state id. */
  states: readonly string[]
  /** The declared edges. */
  transitions: readonly StateTransition<TContext, TActor>[]
  /**
   * The state a fresh object is in.
   *
   * Optional: a machine used only for *moving* an existing object need not name an
   * initial state. Where present, `initialState()` returns it.
   */
  initial?: string
}

/* ------------------------------------------------------------------ *
 * The enforcement result — allow, or REFUSE WITH A VALUE (the G-03 lesson)
 * ------------------------------------------------------------------ */

/**
 * Why a transition was refused.
 *
 * `not-a-declared-transition` — the edge does not exist in the declaration.
 * `permission` — the edge exists, its `permission` gate said no.
 * `precondition` — the edge exists and permission passed, its `precondition` gate
 *   said no.
 *
 * These three are the *entire* space of refusal, because the engine can only
 * refuse for these reasons — the facets it enforces are exactly these two gates
 * plus the shape of the graph.
 */
export type TransitionRefusalKind =
  | 'not-a-declared-transition'
  | 'permission'
  | 'precondition'

/**
 * The outcome of an attempted transition.
 *
 * **Allow carries the events; refusal carries a value.** `events` is empty for a
 * declared transition that announces nothing — never `undefined`, so a caller can
 * iterate without a null check. The refusal's `kind` is machine-readable (a caller
 * can branch on it) while `reason` is the human sentence (a caller can show it).
 * Both are always present on a refusal; neither is present on an allow, because an
 * allow has nothing to explain.
 */
export type TransitionOutcome =
  | { ok: true; from: string; to: string; events: readonly string[] }
  | {
      ok: false
      kind: TransitionRefusalKind
      from: string
      to: string
      reason: string
    }

/* ------------------------------------------------------------------ *
 * The actor — the minimal thing a gate is asked about
 * ------------------------------------------------------------------ */

/**
 * The default actor: anything, because the engine does not inspect it.
 *
 * Declared so a caller can read the type and know the engine has no opinion about
 * what an actor *is* — it only hands it to the caller's gates.
 */
export type StateMachineActor = unknown
