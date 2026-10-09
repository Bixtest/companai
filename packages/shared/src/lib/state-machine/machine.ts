/**
 * The state-machine engine — declaration in, allow-or-refuse out.
 *
 * This is the enforcement half of the primitive declared in `types.ts`. It answers
 * exactly one question: **given a declaration, a `from`, a `to`, and an actor, is
 * this move allowed — and if not, why not?** It owns no state and mutates nothing;
 * a caller holds the object and applies the move itself. That keeps the engine
 * pure, so a test can pin every branch and a mutation can falsify each one.
 *
 * **The four facets the requirement names, and where each lives.**
 *   1. *allowed transitions* — the edges of the declaration (`canTransition`).
 *   2. *transition permissions* — the edge's `permission` gate (`attempt`).
 *   3. *preconditions* — the edge's `precondition` gate (`attempt`).
 *   4. *events* — carried out of a successful attempt (`attempt` → `events`).
 *
 * **The `G-03` lesson, kept.** `user-function/lifecycle.ts` refuses with
 * `{ ok: false, reason }` rather than silently returning the unchanged object — so
 * a caller always learns *that* a move failed and *why*. This engine keeps that
 * contract and adds a machine-readable `kind`, so a caller can both branch on the
 * refusal and show a sentence about it.
 *
 * Source: blueprint §10; BUILD-ORDER §3 item 9; `user-function/lifecycle.ts`.
 */

import type {
  StateMachineDeclaration,
  StateTransition,
  TransitionGate,
  TransitionOutcome,
} from './types'

/* ------------------------------------------------------------------ *
 * Lookup — indices are built once, so the hot path is O(edges) not O(edges²)
 * ------------------------------------------------------------------ */

/**
 * A compiled declaration: the raw graph plus the indices the engine reads.
 *
 * Built by {@link compile}. Kept separate from the declaration so a caller can
 * declare a machine once (plain data, easy to read and diff) and compile it when
 * it wants to run it — the declaration stays the single source of truth.
 */
export type CompiledStateMachine<TContext = unknown, TActor = unknown> = {
  declaration: StateMachineDeclaration<TContext, TActor>
  /** Every legal state, as a Set for O(1) membership. */
  states: ReadonlySet<string>
  /** Edges keyed by `from` state, so an attempt scans one state's edges. */
  byFrom: ReadonlyMap<string, readonly StateTransition<TContext, TActor>[]>
}

/**
 * Compile a declaration into the engine's working form.
 *
 * Idempotent and cheap; safe to call per request or to cache on a module. It
 * validates nothing about the graph's *shape* beyond what the engine needs — a
 * transition whose `from` is not in `states` is still indexed (and will simply
 * never be reachable by a legal `from`), because refusing to compile a slightly
 * odd declaration would be a policy the primitive should not hold.
 */
export function compile<TContext = unknown, TActor = unknown>(
  declaration: StateMachineDeclaration<TContext, TActor>,
): CompiledStateMachine<TContext, TActor> {
  const byFrom = new Map<string, StateTransition<TContext, TActor>[]>()
  for (const transition of declaration.transitions) {
    const bucket = byFrom.get(transition.from)
    if (bucket) {
      bucket.push(transition)
    } else {
      byFrom.set(transition.from, [transition])
    }
  }
  return {
    declaration,
    states: new Set(declaration.states),
    byFrom,
  }
}

/* ------------------------------------------------------------------ *
 * Facet 1 — allowed transitions
 * ------------------------------------------------------------------ */

/**
 * The declared edge from `from` to `to`, or `undefined` if there is none.
 *
 * A self-transition (`from === to`) is legal **only** if an edge declares it — the
 * engine does not special-case it, because the whole point of a declaration is
 * that the graph is explicit. (Compare `user-function/lifecycle.ts`, which hard
 * codes `from === to → false`; here the graph decides, so a machine that genuinely
 * has a self-loop can declare one.)
 */
export function findTransition<TContext = unknown, TActor = unknown>(
  machine: CompiledStateMachine<TContext, TActor>,
  from: string,
  to: string,
): StateTransition<TContext, TActor> | undefined {
  const edges = machine.byFrom.get(from)
  if (!edges) return undefined
  return edges.find((edge) => edge.to === to)
}

/**
 * Whether a move is a **declared edge** — facet 1 alone.
 *
 * This answers a question about the *graph*, not about the actor or the world: it
 * is `true` for a declared edge whose permission or precondition would still
 * refuse, exactly as `canTransition` in the Function lifecycle is `true` for
 * `validated → verified` even when the report is missing. Keep the two questions
 * apart: "does this edge exist" and "may *this* move happen now" are different, and
 * conflating them is how a guard ends up asserting the wrong thing.
 */
export function canTransition<TContext = unknown, TActor = unknown>(
  machine: CompiledStateMachine<TContext, TActor>,
  from: string,
  to: string,
): boolean {
  return findTransition(machine, from, to) !== undefined
}

/* ------------------------------------------------------------------ *
 * Facets 2–4 — permission, precondition, events
 * ------------------------------------------------------------------ */

/**
 * A gate's answer, read **strictly**.
 *
 * The contract (`types.ts`) is `boolean | string` — but a gate is often fed by
 * untyped data (a JSON field, a DB column, a predicate whose `!!` was forgotten),
 * so this must not trust the type. The rule is **allow only an explicit `true`**:
 *   - `true`            → allow.
 *   - a non-empty string → refuse, and the string *is* the reason.
 *   - everything else (`false`, `null`, `undefined`, `0`, `''`, `NaN`) → refuse,
 *     with the caller's fallback reason.
 *
 * **Why `undefined` refuses rather than allows.** An *absent* gate (`gate` is
 * `undefined`) allows — that is the "no gate declared" case, handled before this
 * function is called at all. But a gate that *exists* and returns `undefined` is a
 * gate that failed to answer, and *fail closed* is the only safe reading: treating
 * a hole as a yes is precisely the "silent allow" defect this primitive exists to
 * prevent (`G-03`: a refusal carries a value; a missing answer is not a yes).
 *
 * Extracted so `permission` and `precondition` cannot drift apart in how they read
 * a gate's answer — the third trap a copy-paste would introduce.
 */
function readGate<TContext, TActor>(
  gate: TransitionGate<TContext, TActor> | undefined,
  actor: TActor,
  context: TContext,
): { allowed: true } | { allowed: false; reason: string | null } {
  // No gate declared → the edge is ungated; allow.
  if (!gate) return { allowed: true }
  const verdict = gate(actor, context)
  if (verdict === true) return { allowed: true }
  // A non-empty string is the gate's own reason.
  if (typeof verdict === 'string' && verdict.length > 0) {
    return { allowed: false, reason: verdict }
  }
  // Anything else — false, undefined, null, 0, '', NaN — refuses. Fail closed.
  return { allowed: false, reason: null }
}

/**
 * Attempt a transition — the single entry point that enforces all four facets.
 *
 * Order matters and is deliberate: **existence → permission → precondition →
 * allow**. A caller learns the *first* reason a move is impossible, never a
 * downstream one that would be moot. (Refusing on a precondition of an edge that
 * does not exist would be nonsense; refusing on a precondition before checking
 * permission would tell an unauthorised actor about the world's readiness.)
 *
 * On allow, the edge's `emit` is normalised to an array and returned, so a caller
 * publishes events without re-reading the declaration.
 *
 * @param machine  the compiled declaration
 * @param from     the object's current state
 * @param to       the desired state
 * @param actor    who is making the move (handed to the gates, not inspected)
 * @param context  whatever the gates need to decide (the object, or a projection)
 */
export function attempt<TContext = unknown, TActor = unknown>(
  machine: CompiledStateMachine<TContext, TActor>,
  from: string,
  to: string,
  actor: TActor,
  context: TContext,
): TransitionOutcome {
  const edge = findTransition(machine, from, to)
  if (!edge) {
    return {
      ok: false,
      kind: 'not-a-declared-transition',
      from,
      to,
      reason: `"${machine.declaration.name}" has no transition from "${from}" to "${to}". ${
        describeLegalTargets(machine, from)
      }`,
    }
  }

  const permission = readGate(edge.permission, actor, context)
  if (!permission.allowed) {
    return {
      ok: false,
      kind: 'permission',
      from,
      to,
      reason:
        permission.reason ||
        `A transition of "${machine.declaration.name}" from "${from}" to "${to}" is not permitted for this actor.`,
    }
  }

  const precondition = readGate(edge.precondition, actor, context)
  if (!precondition.allowed) {
    return {
      ok: false,
      kind: 'precondition',
      from,
      to,
      reason:
        precondition.reason ||
        `A transition of "${machine.declaration.name}" from "${from}" to "${to}" was refused: its precondition is not met.`,
    }
  }

  return {
    ok: true,
    from,
    to,
    events: normaliseEvents(edge.emit),
  }
}

/** `undefined` → `[]`; a string → `[string]`; an array → a frozen copy. */
function normaliseEvents(emit: string | readonly string[] | undefined): readonly string[] {
  if (emit === undefined) return []
  if (typeof emit === 'string') return [emit]
  return [...emit]
}

/** The states a `from` can legally move to — used to make a refusal actionable. */
function describeLegalTargets<TContext, TActor>(
  machine: CompiledStateMachine<TContext, TActor>,
  from: string,
): string {
  const edges = machine.byFrom.get(from)
  if (!edges || edges.length === 0) {
    return `"${from}" has no outgoing transitions.`
  }
  return `From "${from}" the declared targets are: ${edges.map((edge) => `"${edge.to}"`).join(', ')}.`
}

/* ------------------------------------------------------------------ *
 * Convenience — the initial state, when the declaration names one
 * ------------------------------------------------------------------ */

/**
 * The declared `initial` state, or `null` when the machine names none.
 *
 * Returns `null` rather than throwing: a machine used only for moving an existing
 * object legitimately has no initial state, and that is not an error.
 */
export function initialState<TContext = unknown, TActor = unknown>(
  machine: CompiledStateMachine<TContext, TActor>,
): string | null {
  return machine.declaration.initial ?? null
}

/**
 * Every event a declaration can announce, de-duplicated and in first-seen order.
 *
 * A convenience for docs, tests and event-bus registration; it reads the whole
 * graph, so it is not on any hot path.
 */
export function declaredEvents<TContext = unknown, TActor = unknown>(
  machine: CompiledStateMachine<TContext, TActor>,
): readonly string[] {
  const seen = new Set<string>()
  for (const transition of machine.declaration.transitions) {
    for (const event of normaliseEvents(transition.emit)) {
      seen.add(event)
    }
  }
  return [...seen]
}
