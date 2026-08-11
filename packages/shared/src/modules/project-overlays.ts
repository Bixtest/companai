/**
 * What a project permits its members, over and above where they sit.
 *
 * The platform scopes by tenant and organisation, and that is a description of
 * *structure*. Work is not organised that way: a legal case, a client engagement,
 * an acquisition and a property each pull people from several departments and
 * need their own rules about who may do what inside them. Without this, scoping
 * stops at the department (SRS FR-550, FR-560).
 *
 * **An overlay only ever narrows.** It cannot grant a member something they do
 * not already hold — that is what makes it an *overlay* rather than a second
 * permission system, and it keeps the property the whole resolver rests on.
 *
 * **Typed grants, not a mini-language.** Platform 1 encodes these as strings with
 * `deny:` and `!` prefixes. That is a parser, a quoting question and a class of
 * typo that silently means the opposite of what somebody wrote.
 */
import { AUTONOMY_GATES, type AutonomyGate, type CapabilityDescriptor, type EffectClass } from './capabilities'

/**
 * One rule in an overlay.
 *
 * `deny` is not a ceiling of `A0` spelled differently — it reads as an intention
 * ("nobody does this in this project") rather than as an arithmetic result, and
 * the explanation it produces says so.
 */
export type ProjectOverlayRule = {
  capabilityId?: string
  effectClass?: EffectClass
  /** `deny` blocks the act outright; a gate caps it. */
  effect: 'deny' | AutonomyGate
  reason?: string
}

export type ProjectOverlay = {
  rules: ProjectOverlayRule[]
}

export const EMPTY_OVERLAY: ProjectOverlay = { rules: [] }

function isGate(value: unknown): value is AutonomyGate {
  return typeof value === 'string' && (AUTONOMY_GATES as readonly string[]).includes(value)
}

/**
 * Reads a stored overlay, dropping rules it cannot understand.
 *
 * Dropping **loosens**, and that is the same uncomfortable trade tenant policy
 * makes: the alternative is inventing a restriction nobody wrote. The difference
 * here is that a dropped rule is visible — a member reading the project's rules
 * back will not see it.
 */
export function parseProjectOverlay(value: unknown): ProjectOverlay {
  if (!value || typeof value !== 'object') return EMPTY_OVERLAY
  const raw = (value as { rules?: unknown }).rules
  if (!Array.isArray(raw)) return EMPTY_OVERLAY

  const rules: ProjectOverlayRule[] = []
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== 'object') continue
    const record = candidate as Record<string, unknown>
    const effect = record.effect
    if (effect !== 'deny' && !isGate(effect)) continue

    const rule: ProjectOverlayRule = { effect: effect as 'deny' | AutonomyGate }
    if (typeof record.capabilityId === 'string' && record.capabilityId) rule.capabilityId = record.capabilityId
    if (typeof record.effectClass === 'string') rule.effectClass = record.effectClass as EffectClass
    if (typeof record.reason === 'string' && record.reason.trim()) rule.reason = record.reason.trim()
    rules.push(rule)
  }
  return { rules }
}

function ruleMatches(rule: ProjectOverlayRule, capability: CapabilityDescriptor): boolean {
  if (rule.capabilityId && rule.capabilityId !== capability.id) return false
  if (rule.effectClass && rule.effectClass !== capability.effectClass) return false
  return true
}

export type ProjectCeiling = { ceiling: AutonomyGate; detail: string }

/**
 * The most this overlay permits for this act.
 *
 * **A deny wins over every gate**, whatever order the rules are in and whatever
 * else matches. Platform 1 calls this *terminal deny* and implements it by ending
 * evaluation; here it needs no special case, because a deny is `A0` and nothing
 * anywhere in this resolver raises a ceiling. The property comes from the
 * invariant rather than from a rule somebody has to remember.
 *
 * `null` when nothing matches — not `A5` — so an unremarkable act in a project
 * produces no line in its explanation.
 */
export function projectCeilingFor(
  overlay: ProjectOverlay,
  capability: CapabilityDescriptor,
): ProjectCeiling | null {
  let chosen: ProjectOverlayRule | null = null
  for (const rule of overlay.rules) {
    if (!ruleMatches(rule, capability)) continue
    if (!chosen) { chosen = rule; continue }
    if (rule.effect === 'deny') { chosen = rule; continue }
    if (chosen.effect === 'deny') continue
    if (AUTONOMY_GATES.indexOf(rule.effect) < AUTONOMY_GATES.indexOf(chosen.effect)) chosen = rule
  }
  if (!chosen) return null

  const scope = chosen.capabilityId
    ? 'this capability'
    : chosen.effectClass
      ? `${chosen.effectClass} acts`
      : 'every act'
  const because = chosen.reason ? ` (${chosen.reason})` : ''

  if (chosen.effect === 'deny') {
    return {
      ceiling: 'A0',
      detail: `this project forbids ${scope}${because}`,
    }
  }
  return {
    ceiling: chosen.effect,
    detail: `this project permits at most ${chosen.effect} for ${scope}${because}`,
  }
}
