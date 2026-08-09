/**
 * Preflight: resolving a plan before the work starts (R5).
 *
 * The dominant failure mode of an approval system is not that it refuses things.
 * It is that a worker stalls at step four of nine, at hour three, and a person
 * discovers it at hour nine. Everyone then blames the controls, and the controls
 * get switched off.
 *
 * Resolving the *plan* converts that into one batched decision, made up front,
 * with the full picture visible. It also gives whoever is responsible a truthful
 * preview of what a worker is about to do — which is worth more than most audit
 * features, because it arrives while there is still a choice.
 *
 * Source: planning 02 §6.3.
 */

import { resolveDecision, type Decision, type ResolveInput } from './decision'
import type { AutonomyGate } from '../../modules/capabilities'

export type PlanStep = {
  /** Caller's own label — the step as a person would name it. */
  label: string
  input: ResolveInput
}

export type PlanStepOutcome = {
  label: string
  capabilityId: string
  decision: Decision
  /**
   * Whether this step can proceed without a person doing something first.
   *
   * `A3` counts as proceeding: it commits on its own unless somebody objects,
   * which is a notification rather than a gate. `A2` and below do not.
   */
  proceeds: boolean
}

export type PlanResolution = {
  steps: PlanStepOutcome[]
  /** Steps that need a person before they can run. */
  blockedSteps: PlanStepOutcome[]
  /** The strictest gate anywhere in the plan — the plan's own ceiling. */
  planGate: AutonomyGate
  approvalsNeeded: number
  /** True when nothing in the plan needs anyone. */
  runsUnattended: boolean
}

const GATE_RANK: Record<AutonomyGate, number> = { A0: 0, A1: 1, A2: 2, A3: 3, A4: 4, A5: 5 }

/**
 * Resolves every step of a plan.
 *
 * Every step is resolved even when an earlier one is blocked. Stopping at the
 * first obstacle would produce exactly the drip-feed of approval requests this
 * exists to prevent — a person should be asked once, for everything, not five
 * times as each blocker is cleared.
 */
export function resolvePlan(steps: PlanStep[]): PlanResolution {
  const outcomes: PlanStepOutcome[] = steps.map((step) => {
    const decision = resolveDecision(step.input)
    return {
      label: step.label,
      capabilityId: step.input.capability.id,
      decision,
      proceeds: GATE_RANK[decision.gate] >= GATE_RANK.A3,
    }
  })

  const blockedSteps = outcomes.filter((outcome) => !outcome.proceeds)
  const planGate = outcomes.reduce<AutonomyGate>(
    (current, outcome) => (GATE_RANK[outcome.decision.gate] < GATE_RANK[current] ? outcome.decision.gate : current),
    'A5',
  )

  return {
    steps: outcomes,
    blockedSteps,
    planGate,
    // Counted by distinct capability: approving the same act five times in one
    // plan is one decision a person makes, not five.
    approvalsNeeded: new Set(blockedSteps.map((outcome) => outcome.capabilityId)).size,
    runsUnattended: blockedSteps.length === 0,
  }
}

/**
 * The plan as the planning document draws it.
 *
 * Kept next to the resolution rather than in a UI component so that the CLI, a
 * test and a page all show the same thing — a preview that differs by surface is
 * a preview nobody can rely on.
 */
export function renderPlan(resolution: PlanResolution): string {
  const lines = resolution.steps.map((outcome) => {
    const marker = outcome.proceeds ? '✓' : '⏸'
    const note = outcome.proceeds
      ? outcome.decision.gate === 'A3'
        ? 'proceeds after hold window'
        : outcome.decision.gate === 'A4'
          ? 'proceeds, review queued'
          : 'proceeds'
      : `needs ${outcome.decision.gate === 'A0' ? 'permission' : 'approval'} — ${outcome.decision.bindingRule}`
    return `${marker} ${outcome.label.padEnd(32)} ${outcome.decision.gate}   ${note}`
  })

  lines.push('')
  lines.push(
    resolution.runsUnattended
      ? 'No approvals needed.'
      : `${resolution.approvalsNeeded} approval${resolution.approvalsNeeded === 1 ? '' : 's'} needed.`,
  )

  return lines.join('\n')
}
