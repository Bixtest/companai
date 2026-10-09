/**
 * The state-machine primitive — public surface.
 *
 * A lifecycle, promoted from a per-module habit to a core primitive (blueprint
 * §10; BUILD-ORDER §3 item 9). Declare a graph, compile it, attempt a move, and
 * get back *allow* (with the events it announces) or a *refusal with a value*
 * (with a machine-readable kind and a human reason) — the `G-03` lesson.
 *
 * @example
 * ```ts
 * const deal = compile({
 *   name: 'deal pipeline',
 *   states: ['discovery', 'proposal', 'won', 'lost'],
 *   initial: 'discovery',
 *   transitions: [
 *     { from: 'discovery', to: 'proposal', permission: mayEditDeal, emit: 'deal.stage.changed' },
 *     { from: 'proposal', to: 'won', precondition: hasValue, emit: ['deal.stage.changed', 'deal.won'] },
 *   ],
 * })
 *
 * const outcome = attempt(deal, 'discovery', 'proposal', actor, context)
 * if (!outcome.ok) return refuse(outcome.reason)
 * publish(outcome.events)
 * ```
 */

export type {
  StateMachineDeclaration,
  StateTransition,
  TransitionGate,
  TransitionOutcome,
  TransitionRefusalKind,
  StateMachineActor,
} from './types'

export {
  compile,
  canTransition,
  findTransition,
  attempt,
  initialState,
  declaredEvents,
  type CompiledStateMachine,
} from './machine'
