/**
 * Shadow mode: run the resolver beside the permission check, change nothing.
 *
 * R5 and R6 built a resolver that nothing calls. The gap between what the
 * platform can *explain* and what it actually *enforces* only widens while that
 * is true — so the resolver starts running now, on every real permission check,
 * and its answer is recorded rather than obeyed.
 *
 * **Why not just switch it on.** The existing RBAC has been deciding these
 * questions for the life of the product. The resolver is new, its inputs are
 * partly defaulted (nothing models task grade yet), and its conservative
 * placeholder caps every machine actor at approve-first. Enabling it blind would
 * refuse requests that have always worked, in production, with no evidence about
 * how often or where. Shadow mode buys that evidence for the price of a log line.
 *
 * **What it must never do:** change an answer, throw, or cost anything
 * noticeable. Every failure here is swallowed deliberately — a diagnostic that
 * can break the thing it observes is worse than no diagnostic.
 */

import { createLogger } from '../logger'
import { resolveDecision, type Decision } from './decision'
import type { CapabilityDescriptor } from '../../modules/capabilities'
import type { PrincipalKind } from '../auth/principal'

const logger = createLogger('authority').child({ component: 'shadow' })

/**
 * Whether the shadow runs at all.
 *
 * Default **on**: the whole point is evidence from real traffic, and evidence
 * nobody collects because a flag defaults to off is evidence nobody has. Set
 * `OM_AUTHORITY_SHADOW=off` to silence it.
 */
export function isShadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.OM_AUTHORITY_SHADOW ?? '').trim().toLowerCase()
  return raw !== 'off' && raw !== 'false' && raw !== '0'
}

export type ShadowInput = {
  actorKind: PrincipalKind
  actorId: string
  /** What the existing RBAC decided. The shadow never contradicts this. */
  legacyAllowed: boolean
  capability: CapabilityDescriptor
  organizationId?: string | null
  tenantId?: string | null
  graphCeiling?: Decision['gate']
  graphCeilingDetail?: string
}

export type ShadowComparison = {
  capabilityId: string
  legacyAllowed: boolean
  gate: Decision['gate']
  resolverAllows: boolean
  /** True when the two answers differ on whether the act may happen at all. */
  disagrees: boolean
  /**
   * True when the resolver would allow the act but with an obligation the
   * platform does not currently impose — approval, review, a hold window.
   *
   * Not a disagreement, and the more interesting number: it is the work the
   * governance layer would start doing on the day it is switched on.
   */
  wouldAddObligation: boolean
  bindingRule: string
}

/**
 * Compares the resolver against the answer the platform is about to act on.
 *
 * Returns the comparison for callers that want it (tests, an eventual report)
 * and logs it. Returns `null` when the shadow is off or the capability has no
 * descriptor — an undescribed capability is a coverage gap, not a disagreement,
 * and reporting it as one would bury the real signal.
 */
export function compareWithResolver(input: ShadowInput): ShadowComparison | null {
  const decision = resolveDecision({
    actor: {
      kind: input.actorKind,
      id: input.actorId,
      // The legacy answer *is* the grant. The shadow is measuring what the
      // resolver adds on top of RBAC, not re-deriving RBAC — re-deriving it
      // would only test whether two copies of the same lookup agree.
      holdsCapability: input.legacyAllowed,
      ...(input.graphCeiling ? { graphCeiling: input.graphCeiling, graphCeilingDetail: input.graphCeilingDetail } : {}),
    },
    capability: input.capability,
    context: {},
  })

  const resolverAllows = decision.allowed
  const proceedsUnattended = decision.gate === 'A5'

  return {
    capabilityId: input.capability.id,
    legacyAllowed: input.legacyAllowed,
    gate: decision.gate,
    resolverAllows,
    disagrees: input.legacyAllowed !== resolverAllows,
    wouldAddObligation: input.legacyAllowed && resolverAllows && !proceedsUnattended,
    bindingRule: decision.bindingRule,
  }
}

/**
 * Runs the comparison and records it. Never throws, never returns a decision the
 * caller could accidentally act on.
 */
export function recordShadowDecision(input: ShadowInput): void {
  if (!isShadowEnabled()) return

  try {
    const comparison = compareWithResolver(input)
    if (!comparison) return

    // Only the interesting cases are logged at info. Agreement is the expected
    // case and would drown the signal — it is available at debug for anyone
    // measuring the ratio.
    if (comparison.disagrees) {
      logger.info('Resolver disagrees with RBAC', {
        capability: comparison.capabilityId,
        legacyAllowed: comparison.legacyAllowed,
        gate: comparison.gate,
        bindingRule: comparison.bindingRule,
        actorKind: input.actorKind,
        tenantId: input.tenantId ?? null,
      })
      return
    }

    if (comparison.wouldAddObligation) {
      logger.info('Resolver would add an obligation', {
        capability: comparison.capabilityId,
        gate: comparison.gate,
        bindingRule: comparison.bindingRule,
        actorKind: input.actorKind,
        tenantId: input.tenantId ?? null,
      })
      return
    }

    logger.debug('Resolver agrees', { capability: comparison.capabilityId, gate: comparison.gate })
  } catch (err) {
    // Deliberately swallowed. A diagnostic that can break the request path it
    // observes has inverted its own purpose.
    //
    // Optional access on the way out, too: the first version of this line read
    // `input.capability.id`, so a malformed input threw *inside the handler
    // written to make throwing impossible*. An error path is still a path.
    logger.warn('Shadow comparison failed', { err, capability: input?.capability?.id ?? null })
  }
}
