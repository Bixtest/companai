/**
 * Capability descriptors (R4).
 *
 * A permission today is an identifier and a title: `api_keys.manage`, "Manage API
 * keys". That is enough to answer *may this actor do it*, and nothing else. It
 * cannot answer *how bad is it if they do*, which is the question that decides
 * whether a machine may act alone, whether a second person must confirm, and
 * whether the act can be taken back afterwards.
 *
 * This file gives every act intrinsic risk semantics, declared **once and
 * centrally** rather than repeated per role. Roles then say who may do it; the
 * descriptor says what kind of thing it is.
 *
 * **R4 is the data layer, not the gate.** Nothing here refuses an action yet —
 * the resolver that reads these and returns a decision with reasons is R5. What
 * exists now is the vocabulary, the registry, and a build-time guard that a
 * described capability is described coherently.
 *
 * Source: planning 02 §4.
 */

/**
 * What kind of effect an act has. Ordered by how hard it is to live with the
 * consequences, not by how technically complex the act is.
 */
export const EFFECT_CLASSES = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'] as const
export type EffectClass = (typeof EFFECT_CLASSES)[number]

export const EFFECT_CLASS_MEANING: Record<EffectClass, string> = {
  E0: 'Read',
  E1: 'Write, internal, reversible',
  E2: 'Write, internal, irreversible or bulk',
  E3: 'External communication — leaves the company boundary',
  E4: 'Financial effect',
  E5: 'Security, identity, permission or charter change',
  E6: 'Destructive — deletion, revocation, teardown',
}

/**
 * Whether the act can be taken back, and how.
 *
 * The middle value carries the most weight in practice: most consequential acts
 * are neither undoable nor final. An invoice cannot be un-issued, but it can be
 * credited; an email cannot be un-sent, but a correction can follow. Recording
 * *how* to compensate is what turns "we cannot undo this" into a procedure.
 */
export const REVERSIBILITIES = ['reversible', 'compensatable', 'irreversible'] as const
export type Reversibility = (typeof REVERSIBILITIES)[number]

/**
 * The sensitivity of the data an act touches. Drives redaction, retention and
 * who may see the resulting record — not who may perform the act.
 */
export const DATA_CLASSES = ['public', 'internal', 'confidential', 'personal', 'secret'] as const
export type DataClass = (typeof DATA_CLASSES)[number]

/**
 * Autonomy gates, from "never acts alone" to "acts and nobody looks".
 *
 * Defined here because the floor matrix below is expressed in them. What
 * *assigns* a gate to an actor is R5/R6; this file only says how much autonomy
 * an act may ever permit.
 */
export const AUTONOMY_GATES = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const
export type AutonomyGate = (typeof AUTONOMY_GATES)[number]

/** Task grades, coarsest measure of what is at stake in the surrounding work. */
export const TASK_GRADES = ['G0', 'G1', 'G2', 'G3', 'G4'] as const
export type TaskGrade = (typeof TASK_GRADES)[number]

export type CapabilityDescriptor = {
  /** The feature id this describes — `<module>.<action>`. */
  id: string
  module: string

  effectClass: EffectClass
  reversibility: Reversibility

  /**
   * The capability that undoes this one. **Required when `reversibility` is
   * `compensatable`** — a compensation nobody named is a compensation nobody can
   * perform, which is the same as being irreversible while claiming otherwise.
   */
  compensation?: string

  dataClasses?: DataClass[]

  /** True when the act reaches something outside the company. */
  externalEffect?: boolean

  /** May appear in a delegation. */
  delegable?: boolean

  /** May be covered by a standing approval rather than a per-act one. */
  standingApprovable?: boolean

  /**
   * The ledger event this act must emit, declared here rather than chosen at the
   * call site — so an audit entry cannot be silently mislabelled or forgotten.
   * Enforced when the resolver lands (R5).
   */
  auditEventType?: string

  /**
   * Exactly which fields the act may change — narrower than the capability, and
   * checkable after the fact against the audit snapshot.
   */
  allowedMutations?: string[]

  /**
   * The act cannot complete without cited sources attached. Turns "the worker
   * should cite its sources" from an instruction into a precondition.
   */
  evidenceRequired?: boolean

  /** Why this classification, when it would not be obvious to the next reader. */
  note?: string
}

/**
 * The most autonomy any actor may ever have, by effect class and task grade
 * (planning 02 §4.2).
 *
 * Read a cell as *"the ceiling here"*, never as a grant: an actor's actual gate
 * is this, further restricted by their own ceiling, their charter and policy.
 * Nothing is ever raised by consulting this table.
 *
 * Tenants may lower these freely. Raising them is a governance act, which is why
 * this constant is not tenant-configurable in code.
 */
export const DEFAULT_AUTONOMY_FLOOR: Record<EffectClass, Record<TaskGrade, AutonomyGate>> = {
  E0: { G0: 'A5', G1: 'A5', G2: 'A5', G3: 'A4', G4: 'A2' },
  E1: { G0: 'A5', G1: 'A4', G2: 'A4', G3: 'A3', G4: 'A2' },
  E2: { G0: 'A4', G1: 'A3', G2: 'A3', G3: 'A2', G4: 'A1' },
  E3: { G0: 'A3', G1: 'A3', G2: 'A2', G3: 'A2', G4: 'A1' },
  E4: { G0: 'A3', G1: 'A2', G2: 'A2', G3: 'A1', G4: 'A1' },
  E5: { G0: 'A2', G1: 'A2', G2: 'A1', G3: 'A1', G4: 'A0' },
  E6: { G0: 'A2', G1: 'A1', G2: 'A1', G3: 'A1', G4: 'A0' },
}

/** The ceiling for an act of this class in work of this grade. */
export function maxAutonomyFor(effectClass: EffectClass, grade: TaskGrade): AutonomyGate {
  return DEFAULT_AUTONOMY_FLOOR[effectClass][grade]
}

/** True when `left` permits at least as much autonomy as `right`. */
export function isAtLeastAsAutonomous(left: AutonomyGate, right: AutonomyGate): boolean {
  return AUTONOMY_GATES.indexOf(left) >= AUTONOMY_GATES.indexOf(right)
}

/**
 * The lower of two ceilings.
 *
 * Every combination of ceilings takes the minimum, always. A rule that could
 * raise a ceiling by combining two others would make the whole table advisory.
 */
export function lowerCeiling(left: AutonomyGate, right: AutonomyGate): AutonomyGate {
  return isAtLeastAsAutonomous(left, right) ? right : left
}

export type CapabilityDescriptorProblem = { id: string; problem: string }

/**
 * Checks a descriptor says something coherent.
 *
 * These are not style rules — each one catches a descriptor that would mislead
 * the resolver into permitting more than intended.
 */
export function validateCapabilityDescriptor(descriptor: CapabilityDescriptor): CapabilityDescriptorProblem[] {
  const problems: CapabilityDescriptorProblem[] = []
  const fail = (problem: string) => problems.push({ id: descriptor.id, problem })

  if (!descriptor.id.includes('.')) {
    fail('Capability id must be `<module>.<action>`')
  }
  if (!descriptor.id.startsWith(`${descriptor.module}.`) && !descriptor.note) {
    // Usually an accident — a descriptor pasted into the wrong module. Sometimes
    // deliberate: a module may own a feature in a shared namespace, as
    // `dashboards` owns `analytics.view`. The note is what distinguishes the two,
    // and demanding one costs a sentence where guessing costs a wrong grant.
    fail(`Capability id does not start with module '${descriptor.module}' — if that is deliberate, say why in a note`)
  }
  if (!EFFECT_CLASSES.includes(descriptor.effectClass)) {
    fail(`Unknown effect class '${descriptor.effectClass}'`)
  }
  if (!REVERSIBILITIES.includes(descriptor.reversibility)) {
    fail(`Unknown reversibility '${descriptor.reversibility}'`)
  }

  if (descriptor.reversibility === 'compensatable' && !descriptor.compensation) {
    fail('Compensatable acts must name the capability that compensates them')
  }
  if (descriptor.reversibility === 'irreversible' && descriptor.compensation) {
    fail('An irreversible act cannot have a compensation — mark it compensatable instead')
  }

  // A read that changes nothing cannot be irreversible, and an act that reaches
  // outside the company is never internal-only. Both mistakes read as plausible
  // and would quietly widen what a machine may do unattended.
  if (descriptor.effectClass === 'E0' && descriptor.reversibility !== 'reversible') {
    fail('A read (E0) is always reversible')
  }
  if (descriptor.externalEffect && (descriptor.effectClass === 'E1' || descriptor.effectClass === 'E2')) {
    fail('An act with an external effect is not an internal write — classify it E3 or higher')
  }
  if (descriptor.effectClass === 'E3' && descriptor.externalEffect === false) {
    fail('E3 means the act leaves the company boundary; externalEffect cannot be false')
  }
  if (descriptor.effectClass === 'E6' && descriptor.reversibility === 'reversible' && !descriptor.note) {
    // Soft deletes are genuinely reversible, and that is worth stating out loud
    // rather than leaving the next reader to wonder whether it is a mistake.
    fail('A reversible destructive act needs a note explaining why (soft delete?)')
  }

  for (const dataClass of descriptor.dataClasses ?? []) {
    if (!DATA_CLASSES.includes(dataClass)) fail(`Unknown data class '${dataClass}'`)
  }

  return problems
}
