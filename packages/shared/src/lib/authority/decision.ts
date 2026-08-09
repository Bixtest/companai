/**
 * The resolver: authority as a decision with reasons (R5).
 *
 * Invariant **I6** — explainability is a return value, not a report generated
 * afterwards. Every permission question returns the gate it settled on, every
 * rule that contributed, which rule was binding, what obligations follow, and
 * what would have to change for the answer to differ.
 *
 * A boolean cannot carry any of that, and no amount of logging bolted on later
 * recovers it: by the time a `false` reaches the caller, the reason has already
 * been discarded. That is why this returns a `Decision` and never a boolean.
 *
 * **What this does not do yet.** It does not enforce. Nothing calls it in the
 * request path; the existing RBAC checks still decide who may do what. Wiring it
 * in is deliberate later work, because a resolver that silently starts refusing
 * requests is the least safe way to introduce one. What exists here is the
 * kernel, its explanation, and its tests.
 *
 * Source: planning 02 §6.
 */

import {
  AUTONOMY_GATES,
  maxAutonomyFor,
  type AutonomyGate,
  type CapabilityDescriptor,
  type TaskGrade,
} from '../../modules/capabilities'
import type { PrincipalKind } from '../auth/principal'

/**
 * A single rule's contribution.
 *
 * Every contributor names itself and says what it permitted. A rule that lowered
 * nothing is still recorded: "the trust ceiling allowed A4" is part of the
 * explanation even when something else was stricter, and an explanation that
 * only lists the losing constraints cannot answer "what else was considered".
 */
export type DecisionReason = {
  /** Stable identifier — safe to switch on, and to translate against. */
  rule: string
  /** The most this rule would permit. */
  ceiling: AutonomyGate
  /** Human-readable, specific to this evaluation. */
  detail: string
}

/**
 * Something the actor must do for the act to proceed at this gate.
 *
 * Obligations are not refusals. They are the difference between "no" and "yes,
 * if" — and a governance layer that can only say no gets routed around.
 */
export type DecisionObligation =
  | { kind: 'approval'; detail: string }
  | { kind: 'hold_window'; detail: string }
  | { kind: 'review'; detail: string }
  | { kind: 'evidence'; detail: string }
  | { kind: 'dual_control'; detail: string }
  | { kind: 'justification'; detail: string }

/** What would change the outcome — the actionable half of an explanation. */
export type DecisionAlternative = { change: string; wouldYield: AutonomyGate }

export type Decision = {
  gate: AutonomyGate
  /** True when the act may proceed at all, in some form. `A0` is the only no. */
  allowed: boolean
  /** Every rule that was consulted, in evaluation order. */
  reasons: DecisionReason[]
  /** The rule that produced the final value. */
  bindingRule: string
  obligations: DecisionObligation[]
  alternatives: DecisionAlternative[]
}

export type ResolveInput = {
  actor: {
    kind: PrincipalKind
    id: string
    /** Whether the actor holds the capability at all, from the existing RBAC. */
    holdsCapability: boolean
    /**
     * The most autonomy this actor has earned for acts of this kind.
     *
     * Absent until the trust model exists (planning 02 §5). Absent is not
     * "unlimited" — see `trustCeiling` below for what absence means and why.
     */
    trustCeiling?: AutonomyGate
    /** True when acting under a delegation, with its own cap. */
    delegationCeiling?: AutonomyGate
    /**
     * The authority of whoever invoked this actor.
     *
     * Invariant **I4**: authority is carried, never amplified. A worker invoked
     * by someone who could not perform the act cannot perform it either.
     */
    invokerCeiling?: AutonomyGate
    /**
     * The ceiling implied by the actor's position in the organization graph (R6).
     *
     * Computed by `resolveGraphCeiling` over the typed edges from the root down.
     * The same invariant as `invokerCeiling`, enforced structurally: a worker in
     * a subsidiary cannot exceed what the edges above it permit, whatever its own
     * grants say.
     */
    graphCeiling?: AutonomyGate
    /** Why the graph ceiling is what it is — carried into the explanation. */
    graphCeilingDetail?: string
  }
  capability: CapabilityDescriptor
  context: {
    /** What is at stake in the surrounding work. Defaults to G1. */
    grade?: TaskGrade
    /** Ceiling implied by the record's state — locked, restricted, open. */
    resourceCeiling?: AutonomyGate
    /** Tenant policy floor, if one applies to this act. */
    policyCeiling?: AutonomyGate
  }
}

const GATE_RANK: Record<AutonomyGate, number> = {
  A0: 0, A1: 1, A2: 2, A3: 3, A4: 4, A5: 5,
}

export const GATE_MEANING: Record<AutonomyGate, string> = {
  A0: 'Blocked — this actor may not perform the act at all',
  A1: 'Propose — the actor produces a proposal; a human performs the act',
  A2: 'Approve first — the act is prepared and executes only after approval',
  A3: 'Hold and commit — the act executes into a hold window and commits unless vetoed',
  A4: 'Execute and review — the act takes effect immediately and enters a review queue',
  A5: 'Execute and log — the act takes effect and is recorded',
}

function lower(left: AutonomyGate, right: AutonomyGate): AutonomyGate {
  return GATE_RANK[left] <= GATE_RANK[right] ? left : right
}

/**
 * The default ceiling for an actor whose trust is unknown.
 *
 * **A machine with no trust record does not get the benefit of the doubt.** The
 * trust model (planning 02 §5) does not exist yet, and until it does, every AI
 * worker resolves as untrusted — capped at approve-first, so a person sees the
 * act before it happens.
 *
 * This is a placeholder with a deliberate direction. A placeholder that erred the
 * other way would let machines act unattended precisely during the period when
 * nothing is measuring whether they should.
 *
 * Humans are not capped here: a person holding a permission is exercising their
 * own authority, and the floors above still apply to them. That asymmetry is
 * invariant **I2** — it lives in data the resolver reads, not in a branch that
 * treats one kind of actor as special.
 */
const UNTRUSTED_MACHINE_CEILING: AutonomyGate = 'A2'

const MACHINE_KINDS: PrincipalKind[] = ['ai_worker', 'service']

/**
 * Resolves how much autonomy an actor has for one act.
 *
 * Everything is a ceiling and the answer is the minimum. There is deliberately
 * no rule anywhere that *raises* a gate: if one existed, every other rule would
 * become advisory, and the question "what is the most this could ever be" would
 * have no answer.
 */
export function resolveDecision(input: ResolveInput): Decision {
  const { actor, capability, context } = input
  const grade: TaskGrade = context.grade ?? 'G1'
  const reasons: DecisionReason[] = []

  const consider = (rule: string, ceiling: AutonomyGate, detail: string) => {
    reasons.push({ rule, ceiling, detail })
  }

  // 1. The grant. Without it there is no question of autonomy — this is the one
  //    rule that is about permission rather than degree.
  if (!actor.holdsCapability) {
    const reason: DecisionReason = {
      rule: 'grant',
      ceiling: 'A0',
      detail: `The actor does not hold ${capability.id}`,
    }
    return {
      gate: 'A0',
      allowed: false,
      reasons: [reason],
      bindingRule: 'grant',
      obligations: [],
      alternatives: [
        { change: `${capability.id} were granted to this actor, or someone who holds it acted instead`, wouldYield: 'A2' },
      ],
    }
  }
  consider('grant', 'A5', `The actor holds ${capability.id}`)

  // 2. The effect-class floor: the most the situation permits, before anything
  //    about who is asking.
  const classFloor = maxAutonomyFor(capability.effectClass, grade)
  consider(
    'effect-class-floor',
    classFloor,
    `${capability.effectClass} act on ${grade} work permits at most ${classFloor}`,
  )

  // 3. Irreversibility (invariant I8): an act nobody can undo is never resolved
  //    after the fact. Review-afterwards is only a control when there is
  //    something left to do about it.
  if (capability.reversibility === 'irreversible') {
    consider('irreversible-cap', 'A2', 'The act cannot be undone, so it is never decided after it happens')
  } else if (capability.reversibility === 'compensatable') {
    consider(
      'compensation-available',
      'A5',
      `The act can be compensated by ${capability.compensation ?? 'a named act'}`,
    )
  }

  // 4. Trust. Absent for machines means untrusted, not unlimited.
  if (actor.trustCeiling) {
    consider('trust-ceiling', actor.trustCeiling, `The actor's earned autonomy for acts of this kind is ${actor.trustCeiling}`)
  } else if (MACHINE_KINDS.includes(actor.kind)) {
    consider(
      'untrusted-machine',
      UNTRUSTED_MACHINE_CEILING,
      'No trust record for this worker, so it acts only with prior approval',
    )
  }

  // 5. Carried authority (invariant I4). A worker cannot exceed whoever invoked
  //    it — authority travels down and never grows on the way.
  if (actor.invokerCeiling) {
    consider('invoker-ceiling', actor.invokerCeiling, `Carried from the invoker, who is capped at ${actor.invokerCeiling}`)
  }

  // Position in the graph, before anything the actor was granted personally.
  if (actor.graphCeiling) {
    consider(
      'graph-ceiling',
      actor.graphCeiling,
      actor.graphCeilingDetail ?? `The actor's place in the organization graph permits at most ${actor.graphCeiling}`,
    )
  }

  if (actor.delegationCeiling) {
    consider('delegation-ceiling', actor.delegationCeiling, `Acting under a delegation capped at ${actor.delegationCeiling}`)
  }

  if (context.resourceCeiling) {
    consider('resource-state', context.resourceCeiling, `The record's state permits at most ${context.resourceCeiling}`)
  }

  if (context.policyCeiling) {
    consider('policy', context.policyCeiling, `Tenant policy permits at most ${context.policyCeiling}`)
  }

  const gate = reasons.reduce<AutonomyGate>((current, reason) => lower(current, reason.ceiling), 'A5')

  // The binding rule is the *first* rule that reached the final value. First,
  // not last, because the earliest constraint is the one a person should be told
  // about: "you do not hold this" explains more than "policy also capped it".
  const bindingRule = reasons.find((reason) => reason.ceiling === gate)?.rule ?? 'effect-class-floor'

  return {
    gate,
    allowed: gate !== 'A0',
    reasons,
    bindingRule,
    obligations: deriveObligations(gate, capability),
    alternatives: deriveAlternatives(gate, bindingRule, reasons, capability, grade),
  }
}

/**
 * What must happen for the act to proceed at this gate.
 *
 * Derived from the gate and the capability rather than configured per act: an
 * obligation somebody has to remember to attach is an obligation that will be
 * missing on the act that needed it.
 */
function deriveObligations(gate: AutonomyGate, capability: CapabilityDescriptor): DecisionObligation[] {
  const obligations: DecisionObligation[] = []

  if (gate === 'A1') {
    obligations.push({ kind: 'approval', detail: 'A person must perform the act; the actor may only propose it' })
  }
  if (gate === 'A2') {
    obligations.push({ kind: 'approval', detail: 'A person must approve before the act executes' })
  }
  if (gate === 'A3') {
    obligations.push({ kind: 'hold_window', detail: 'The act commits after the hold window unless vetoed' })
  }
  if (gate === 'A4') {
    obligations.push({ kind: 'review', detail: 'The act takes effect immediately and enters a review queue' })
  }

  if (capability.evidenceRequired) {
    obligations.push({ kind: 'evidence', detail: 'The act cannot complete without cited sources attached' })
  }

  // An irreversible act that still proceeds should say why it was worth doing.
  // The justification is what a later investigation reads first.
  if (capability.reversibility === 'irreversible' && gate !== 'A0') {
    obligations.push({ kind: 'justification', detail: 'The act cannot be undone; a reason must be recorded with it' })
  }

  return obligations
}

/**
 * What would change the outcome.
 *
 * The half of an explanation people actually use. "Approval required" tells
 * somebody they are stuck; "this would proceed automatically below €5,000, or if
 * the Finance Director approved it directly" tells them what to do.
 */
function deriveAlternatives(
  gate: AutonomyGate,
  bindingRule: string,
  reasons: DecisionReason[],
  capability: CapabilityDescriptor,
  grade: TaskGrade,
): DecisionAlternative[] {
  const alternatives: DecisionAlternative[] = []

  // What the answer would be if the binding constraint were lifted: the next
  // strictest rule. That is the honest ceiling of any remedy, and it stops an
  // alternative from promising more than removing the obstacle would give.
  const withoutBinding = reasons
    .filter((reason) => reason.rule !== bindingRule)
    .reduce<AutonomyGate>((current, reason) => lower(current, reason.ceiling), 'A5')

  switch (bindingRule) {
    case 'untrusted-machine':
      alternatives.push({
        change: 'a person with this permission performed it instead',
        wouldYield: withoutBinding,
      })
      alternatives.push({
        change: 'the worker had a trust record for acts of this kind',
        wouldYield: withoutBinding,
      })
      break
    case 'effect-class-floor':
      alternatives.push({
        change: `the work were graded below ${grade}`,
        wouldYield: withoutBinding,
      })
      break
    case 'irreversible-cap':
      alternatives.push({
        change: capability.compensation
          ? `${capability.compensation} were used instead, which can be compensated`
          : 'a reversible act with the same outcome existed',
        wouldYield: withoutBinding,
      })
      break
    case 'graph-ceiling':
      alternatives.push({
        change: 'the act were performed in an organization the edges do not restrict',
        wouldYield: withoutBinding,
      })
      alternatives.push({
        change: 'the edge above this organization were widened, which is itself a governed act',
        wouldYield: withoutBinding,
      })
      break
    case 'delegation-ceiling':
      alternatives.push({ change: 'the delegator performed the act directly', wouldYield: withoutBinding })
      break
    case 'invoker-ceiling':
      alternatives.push({ change: 'someone with more authority invoked the worker', wouldYield: withoutBinding })
      break
    case 'resource-state':
      alternatives.push({ change: 'the record left the state that restricts it', wouldYield: withoutBinding })
      break
    case 'policy':
      alternatives.push({ change: 'tenant policy were changed, which is itself a governed act', wouldYield: withoutBinding })
      break
    default:
      break
  }

  return alternatives.filter((alternative) => GATE_RANK[alternative.wouldYield] > GATE_RANK[gate])
}

/**
 * The decision as a sentence.
 *
 * Generated rather than written, which is the whole point of I6: the same
 * information that produced the gate produces the explanation, so the two can
 * never disagree. A hand-written message drifts from the rule it describes the
 * first time the rule changes.
 */
export function explainDecision(decision: Decision, capability: CapabilityDescriptor): string {
  const binding = decision.reasons.find((reason) => reason.rule === decision.bindingRule)
  const parts: string[] = []

  parts.push(
    decision.allowed
      ? `${GATE_MEANING[decision.gate]}.`
      : `Blocked. ${binding?.detail ?? 'No rule permitted this act.'}`,
  )

  if (decision.allowed && binding) {
    parts.push(`${binding.detail}. Binding rule: ${decision.bindingRule}.`)
  }

  if (decision.obligations.length > 0) {
    parts.push(decision.obligations.map((obligation) => obligation.detail).join('. ') + '.')
  }

  if (decision.alternatives.length > 0) {
    parts.push(
      'This would be ' +
        decision.alternatives
          .map((alternative) => `${alternative.wouldYield} if ${alternative.change}`)
          .join(', or ') +
        '.',
    )
  }

  if (capability.note) parts.push(`(${capability.note})`)

  return parts.join(' ')
}

export { AUTONOMY_GATES }
