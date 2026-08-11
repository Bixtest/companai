/**
 * A tenant's own rules about how much autonomy it permits.
 *
 * Everything else in the resolver is a property of the platform: what kind of act
 * this is, who is acting, where they sit, what the record's state is. This is the
 * one input that is a **company's decision** — four-eyes on payments, no
 * unattended external email, every permission change approved. Those are
 * defensible positions and different companies hold different ones, which is
 * exactly the definition of a setting that earns its place.
 *
 * **Declarative rules, not a policy engine.** Planning 02 §10 defers OPA/Rego
 * explicitly and says to start with the rule structures and adopt an engine when
 * conditions outgrow them. A rule here is a match plus a ceiling, and nothing
 * else — no conditions, no expressions, no evaluation order to reason about.
 * Everything matching applies, and the answer is the minimum, like every other
 * ceiling in the system.
 */
import { AUTONOMY_GATES, EFFECT_CLASSES, type AutonomyGate, type CapabilityDescriptor, type DataClass, type EffectClass } from './capabilities'

/**
 * One rule: what it matches, and the most it then permits.
 *
 * A rule with no matcher matches **everything**, which is a legitimate and blunt
 * thing to want — *"nothing in this tenant runs unattended"* — and it is written
 * that way rather than requiring somebody to enumerate every effect class.
 */
export type AuthorityPolicyRule = {
  /** Matches one capability exactly, by feature id. */
  capabilityId?: string
  /** Matches every capability of this effect class. */
  effectClass?: EffectClass
  /** Matches capabilities touching this class of data. */
  dataClass?: DataClass
  /** The most this rule permits. */
  ceiling: AutonomyGate
  /** Why the tenant set it. Carried into the refusal. */
  reason?: string
}

export type AuthorityPolicy = {
  rules: AuthorityPolicyRule[]
}

export const EMPTY_POLICY: AuthorityPolicy = { rules: [] }

function isGate(value: unknown): value is AutonomyGate {
  return typeof value === 'string' && (AUTONOMY_GATES as readonly string[]).includes(value)
}

/**
 * Reads a stored policy, discarding anything it cannot understand.
 *
 * **A malformed rule is dropped, not guessed at.** The alternative — keeping a
 * rule whose ceiling is unreadable and treating it as some default — would let a
 * typo silently loosen or tighten a company's stated position. Dropping is
 * visible in a way that a wrong default is not, because the rule simply does not
 * appear when the tenant reads their policy back.
 *
 * Dropping *loosens*, which is worth stating plainly: a policy is a narrowing, so
 * a discarded rule leaves the platform more permissive than the tenant intended.
 * That is the correct trade only because the alternative is inventing a
 * restriction nobody wrote, and because every other ceiling still applies.
 */
export function parseAuthorityPolicy(value: unknown): AuthorityPolicy {
  if (!value || typeof value !== 'object') return EMPTY_POLICY
  const rawRules = (value as { rules?: unknown }).rules
  if (!Array.isArray(rawRules)) return EMPTY_POLICY

  const rules: AuthorityPolicyRule[] = []
  for (const raw of rawRules) {
    if (!raw || typeof raw !== 'object') continue
    const candidate = raw as Record<string, unknown>
    if (!isGate(candidate.ceiling)) continue

    const rule: AuthorityPolicyRule = { ceiling: candidate.ceiling }
    if (typeof candidate.capabilityId === 'string' && candidate.capabilityId) rule.capabilityId = candidate.capabilityId
    if (typeof candidate.effectClass === 'string' && (EFFECT_CLASSES as readonly string[]).includes(candidate.effectClass)) {
      rule.effectClass = candidate.effectClass as EffectClass
    }
    if (typeof candidate.dataClass === 'string') rule.dataClass = candidate.dataClass as DataClass
    if (typeof candidate.reason === 'string' && candidate.reason.trim()) rule.reason = candidate.reason.trim()
    rules.push(rule)
  }
  return { rules }
}

export function ruleMatches(rule: AuthorityPolicyRule, capability: CapabilityDescriptor): boolean {
  if (rule.capabilityId && rule.capabilityId !== capability.id) return false
  if (rule.effectClass && rule.effectClass !== capability.effectClass) return false
  if (rule.dataClass && !(capability.dataClasses ?? []).includes(rule.dataClass)) return false
  return true
}

export type PolicyCeiling = { ceiling: AutonomyGate; detail: string }

/**
 * The most this tenant's policy permits for this act.
 *
 * `null` when no rule matches — not `A5`. An `A5` for every unpoliced act would
 * appear in every explanation saying nothing, and the reason a decision came out
 * the way it did should be short enough to read.
 *
 * When several rules match, the **lowest** wins and the explanation names that
 * one. A tenant that says "E5 acts cap at A2" and "this capability caps at A1"
 * means both, and the stricter is the one that decided.
 */
export function policyCeilingFor(
  policy: AuthorityPolicy,
  capability: CapabilityDescriptor,
): PolicyCeiling | null {
  let lowest: AuthorityPolicyRule | null = null
  for (const rule of policy.rules) {
    if (!ruleMatches(rule, capability)) continue
    if (!lowest || AUTONOMY_GATES.indexOf(rule.ceiling) < AUTONOMY_GATES.indexOf(lowest.ceiling)) lowest = rule
  }
  if (!lowest) return null

  const scope = lowest.capabilityId
    ? `this capability`
    : lowest.effectClass
      ? `${lowest.effectClass} acts`
      : lowest.dataClass
        ? `acts touching ${lowest.dataClass} data`
        : 'every act'
  const because = lowest.reason ? ` (${lowest.reason})` : ''
  return {
    ceiling: lowest.ceiling,
    detail: `tenant policy permits at most ${lowest.ceiling} for ${scope}${because}`,
  }
}

/**
 * Problems that would make a policy mean something other than it says.
 *
 * Returned rather than thrown so a caller can show all of them at once. A
 * settings screen that reports one error per save is a settings screen people
 * fight with.
 */
export function authorityPolicyProblems(policy: AuthorityPolicy): string[] {
  const problems: string[] = []
  policy.rules.forEach((rule, index) => {
    const position = `rule ${index + 1}`
    if (!rule.capabilityId && !rule.effectClass && !rule.dataClass && rule.ceiling !== 'A0') {
      // Allowed, but worth saying out loud: this rule caps the entire tenant.
      problems.push(`${position} matches every capability, so it caps the whole tenant at ${rule.ceiling}`)
    }
    if (rule.ceiling === 'A0' && !rule.capabilityId && !rule.effectClass && !rule.dataClass) {
      problems.push(`${position} would block every act in the tenant`)
    }
  })
  return problems
}
