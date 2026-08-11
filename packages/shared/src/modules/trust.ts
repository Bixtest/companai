/**
 * Trust earned, and trust lost.
 *
 * Planning 02 §5 opens with the constraint that shapes everything here: **trust
 * is computed evidence, not a setting someone types.** A tier lifts the cap that
 * otherwise holds every machine at approve-first, so it is the one input in this
 * system that *widens* — and the only thing standing between "graduated autonomy"
 * and "a dropdown somebody sets to T4" is that promotion has to be earned.
 *
 * **Two of the five criteria the specification names are computable here**, and
 * three are not: there is no incident model, no evaluation suites, and no
 * charters. Rather than pretend otherwise, a promotion **records what could not
 * be verified**, permanently, on the act itself. A gap that travels with the
 * decision is a gap somebody can weigh later; a gap that lives only in a design
 * document is one nobody sees again.
 *
 * Invariant **I9**: the asymmetry is the safety property. Promotion is slow,
 * evidenced and needs a person. Demotion is automatic and immediate.
 */
import type { AutonomyGate, EffectClass } from './capabilities'

export const TRUST_TIERS = ['T0', 'T1', 'T2', 'T3', 'T4'] as const
export type TrustTier = (typeof TRUST_TIERS)[number]

/** Where a principal starts, and where demotion ultimately lands. */
export const DEFAULT_TRUST_TIER: TrustTier = 'T0'

export const TRUST_TIER_NAMES: Record<TrustTier, string> = {
  T0: 'Shadow',
  T1: 'Supervised',
  T2: 'Reviewed',
  T3: 'Trusted',
  T4: 'Autonomous',
}

/**
 * The most autonomy each tier permits, per planning 02 §5.
 *
 * `T0` maps to `A1` rather than `A0` because that is what the specification's two
 * values mean together — *"A0 (effects), A1 (proposals)"*. `A1` **is** propose:
 * the worker produces a proposal and a person performs the act, so a direct
 * effect is already impossible. Mapping it to `A0` would additionally forbid it
 * from proposing, which is the entire activity `T0` exists to allow.
 */
const TIER_CEILING: Record<TrustTier, AutonomyGate> = {
  T0: 'A1',
  T1: 'A2',
  T2: 'A3',
  T3: 'A4',
  T4: 'A5',
}

/**
 * What this tier permits for an act of this class.
 *
 * Reads are exempt at every tier, matching the untrusted-machine default this
 * replaces: a worker that may not read is a worker that cannot do anything, and
 * reading is not the act anybody needs protecting from.
 *
 * Note the ceiling this returns is one input among many. `T4` yielding `A5` does
 * not mean an act happens unreviewed — the effect-class matrix, tenant policy,
 * the org graph, the record's state and the invoker's authority all still apply,
 * and the answer is the minimum. Planning's own worked example caps financial
 * acts at `A4` for exactly that reason, through policy rather than through trust.
 */
export function trustCeilingFor(tier: TrustTier, effectClass: EffectClass): AutonomyGate {
  if (effectClass === 'E0') return 'A5'
  return TIER_CEILING[tier]
}

export function isTrustTier(value: unknown): value is TrustTier {
  return typeof value === 'string' && (TRUST_TIERS as readonly string[]).includes(value)
}

/**
 * An unreadable tier reads back as `T0`, not as whatever it looked like.
 *
 * Trust is the one field where a parsing failure could *grant* something, so it
 * fails to the bottom of the scale rather than to a default in the middle.
 */
export function parseTrustTier(value: unknown): TrustTier {
  return isTrustTier(value) ? value : DEFAULT_TRUST_TIER
}

export function tierRank(tier: TrustTier): number {
  return TRUST_TIERS.indexOf(tier)
}

/** The thresholds the specification names, as defaults a tenant could tune later. */
export const PROMOTION_MIN_ACTS = 50
export const PROMOTION_MAX_OVERRIDE_RATE = 0.05

export type TrustEvidence = {
  /** Completed acts by this principal in this capability group. */
  completedActs: number
  /** How many of those a reviewer reversed. */
  overriddenActs: number
}

export type PromotionCriterion = {
  id: string
  description: string
  /** `true` passed, `false` failed, `null` **could not be checked**. */
  passed: boolean | null
  detail: string
}

/**
 * Every criterion the specification names, evaluated against what exists.
 *
 * The three that return `null` are not oversights and are not silently dropped:
 * they are reported as unverifiable so the promotion act carries them. A
 * criterion that quietly disappears is a criterion somebody later believes was
 * checked.
 */
export function evaluatePromotion(evidence: TrustEvidence): PromotionCriterion[] {
  const rate = evidence.completedActs > 0 ? evidence.overriddenActs / evidence.completedActs : 0

  return [
    {
      id: 'completed-acts',
      description: `at least ${PROMOTION_MIN_ACTS} completed acts in this capability group`,
      passed: evidence.completedActs >= PROMOTION_MIN_ACTS,
      detail: `${evidence.completedActs} completed`,
    },
    {
      id: 'override-rate',
      description: `reviewer override rate below ${Math.round(PROMOTION_MAX_OVERRIDE_RATE * 100)}%`,
      passed: rate < PROMOTION_MAX_OVERRIDE_RATE,
      detail: `${evidence.overriddenActs} of ${evidence.completedActs} reversed (${(rate * 100).toFixed(1)}%)`,
    },
    {
      id: 'no-open-incidents',
      description: 'no open incidents of severity medium or above',
      passed: null,
      detail: 'not verified — this platform has no incident model',
    },
    {
      id: 'evaluation-suite',
      description: 'evaluation suite passing at the role’s bar',
      passed: null,
      detail: 'not verified — evaluation suites do not exist yet',
    },
    {
      id: 'no-charter-change',
      description: 'no charter change since the evidence window opened',
      passed: null,
      detail: 'not verified — charters do not exist yet',
    },
  ]
}

export type PromotionVerdict = {
  allowed: boolean
  refusedBecause: string | null
  unverified: PromotionCriterion[]
}

/**
 * Whether the evidence permits a promotion at all.
 *
 * A criterion that **failed** blocks. A criterion that could not be **checked**
 * does not block — it is carried instead, because blocking on it would make
 * promotion impossible until three unrelated features exist, and the honest
 * alternative to "we checked" is "a person decided knowing we could not check",
 * not "nobody may ever decide".
 *
 * This is the whole reason a human approval is still required afterwards. The
 * evidence gates the decision; it does not make it.
 */
export function promotionVerdict(criteria: PromotionCriterion[]): PromotionVerdict {
  const failed = criteria.find((criterion) => criterion.passed === false)
  return {
    allowed: !failed,
    refusedBecause: failed ? `${failed.description} — ${failed.detail}` : null,
    unverified: criteria.filter((criterion) => criterion.passed === null),
  }
}

/**
 * Whether the evidence now demands a demotion.
 *
 * Deliberately not the mirror of promotion. Demotion needs **one** trigger, needs
 * no approval, and takes effect at once — invariant **I9**, where the asymmetry
 * is the safety property rather than an inconsistency.
 *
 * The minimum-acts floor stops a single reversal early in a worker's life reading
 * as a 100% override rate. Below the floor there is not enough evidence to demote
 * on, which is different from evidence that everything is fine.
 */
export function demotionTriggered(evidence: TrustEvidence): boolean {
  if (evidence.completedActs < 10) return false
  return evidence.overriddenActs / evidence.completedActs >= PROMOTION_MAX_OVERRIDE_RATE
}

/** One step down, never further, and never below the bottom. */
export function demotedTier(tier: TrustTier): TrustTier {
  const index = tierRank(tier)
  return index <= 0 ? 'T0' : TRUST_TIERS[index - 1]
}
