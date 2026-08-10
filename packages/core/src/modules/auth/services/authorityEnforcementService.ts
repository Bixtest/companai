import { resolveDecision, type Decision } from '@open-mercato/shared/lib/authority/decision'
import { getCapabilityDescriptor } from '@open-mercato/shared/lib/capabilities/registry'
import { parseSubject } from '@open-mercato/shared/lib/auth/principal'
import type { AutonomyGate } from '@open-mercato/shared/modules/capabilities'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('authority').child({ component: 'enforcement' })

/**
 * How much of the resolver a tenant has switched on.
 *
 * Three states rather than a boolean, because "we are measuring" and "we are not
 * looking" are different positions and only one of them produces the evidence
 * that makes the third defensible.
 */
export const ENFORCEMENT_MODES = ['off', 'shadow', 'enforce'] as const
export type EnforcementMode = (typeof ENFORCEMENT_MODES)[number]

export const ENFORCEMENT_CONFIG_MODULE = 'auth'
export const ENFORCEMENT_CONFIG_KEY = 'authority.enforcement'

/**
 * What a tenant gets before anybody chooses.
 *
 * `shadow` — observe and record, change nothing. Enforcement is a decision an
 * operator makes against evidence from their own traffic, not a default that
 * arrives with an upgrade and starts refusing requests on a Tuesday.
 */
export const DEFAULT_ENFORCEMENT_MODE: EnforcementMode = 'shadow'

export function isEnforcementMode(value: unknown): value is EnforcementMode {
  return typeof value === 'string' && (ENFORCEMENT_MODES as readonly string[]).includes(value)
}

export type AuthorityRefusal = {
  capabilityId: string
  decision: Decision
}

export type AuthorityScope = {
  tenantId: string | null
  organizationId: string | null
}

type GraphCeilingReader = {
  cachedCeilingFor: (
    organizationId: string,
    tenantId: string,
    capabilityId: string,
  ) => Promise<{ ceiling: AutonomyGate; basis: string; contributingEdges: Array<{ because: string }> }>
}

type ModuleConfigReader = {
  getValue: <T>(
    moduleId: string,
    name: string,
    options?: { defaultValue?: T | null; scope?: { tenantId?: string | null } },
  ) => Promise<T | null>
}

/**
 * Turns the authority resolver from an observer into a decision.
 *
 * **It can only ever narrow.** This runs after the existing RBAC check has
 * already said yes; a refusal here removes an allowance and nothing here can add
 * one. That is invariant **I4** made structural rather than promised: there is no
 * code path through this service that widens anybody's authority, so the
 * question "could enforcement grant something?" has an answer you can read off
 * the types.
 *
 * ## What enforcement covers today, and what it does not
 *
 * The resolver returns a gate, `A0` through `A5`. Only `A0` — *blocked* — is
 * enforced, because it is the only outcome the platform can currently carry out.
 * `A1` to `A4` attach obligations (approve first, hold and commit, review
 * afterwards) and there is no machinery yet that can hold an arbitrary act and
 * resume it once somebody approves. Claiming to enforce those would mean
 * allowing the act and calling the allowance a control.
 *
 * So: refusals bind, obligations are recorded and do not. That gap is a backlog
 * item, and it is stated in the operator-facing output rather than left for
 * somebody to discover.
 *
 * ## Why a failure here is not a denial
 *
 * If the graph or the tenant's mode cannot be read, this throws rather than
 * returning "no ceiling" or "not enforcing". An infrastructure failure is not a
 * permission answer — the platform already takes that position for session
 * resolution — and both of the alternatives are worse: inventing an allowance
 * disables the control precisely when something is wrong, and inventing a
 * refusal tells a user they lack a permission they hold.
 */
export class AuthorityEnforcementService {
  constructor(
    private readonly graph: GraphCeilingReader | null,
    private readonly moduleConfig: ModuleConfigReader | null,
  ) {}

  /**
   * The mode this tenant is in.
   *
   * Per tenant on purpose. One customer's evidence says nothing about another's
   * graph, and an instance-wide switch would make the first tenant to enable it
   * decide for everybody.
   */
  async modeFor(tenantId: string | null): Promise<EnforcementMode> {
    if (!this.moduleConfig) return DEFAULT_ENFORCEMENT_MODE
    const stored = await this.moduleConfig.getValue<string>(
      ENFORCEMENT_CONFIG_MODULE,
      ENFORCEMENT_CONFIG_KEY,
      { defaultValue: DEFAULT_ENFORCEMENT_MODE, scope: { tenantId } },
    )
    if (isEnforcementMode(stored)) return stored
    if (stored != null) {
      // A value nobody recognises is a misconfiguration, and reading it as
      // "enforce" would refuse traffic on the strength of a typo.
      logger.warn('Unrecognised authority enforcement mode; falling back', {
        tenantId,
        stored,
        using: DEFAULT_ENFORCEMENT_MODE,
      })
    }
    return DEFAULT_ENFORCEMENT_MODE
  }

  /**
   * The first capability the resolver refuses, or `null` when it refuses none.
   *
   * First rather than all: the caller needed every capability in the list, so one
   * refusal settles the request, and resolving the rest would spend queries to
   * produce detail nobody reads.
   */
  async refusalFor(
    subject: string,
    required: string[],
    scope: AuthorityScope,
  ): Promise<AuthorityRefusal | null> {
    if (!required.length) return null
    if ((await this.modeFor(scope.tenantId)) !== 'enforce') return null

    const principal = parseSubject(subject)

    for (const feature of required) {
      const capability = getCapabilityDescriptor(feature)
      // An undescribed capability is a coverage gap, not a refusal. Enforcing on
      // absence would make every wildcard grant and every un-described feature a
      // denial, which is a migration failure dressed up as a security control.
      if (!capability) continue

      const graphCeiling = await this.graphCeilingFor(capability.id, scope)
      const decision = resolveDecision({
        actor: {
          kind: principal.kind,
          id: principal.id,
          // RBAC has already said yes; this service exists to narrow that, and
          // re-deciding the grant here would put two answers to one question in
          // the codebase.
          holdsCapability: true,
          ...(graphCeiling ? { graphCeiling: graphCeiling.ceiling, graphCeilingDetail: graphCeiling.detail } : {}),
        },
        capability,
        context: {},
      })

      if (!decision.allowed) return { capabilityId: capability.id, decision }
    }

    return null
  }

  private async graphCeilingFor(
    capabilityId: string,
    scope: AuthorityScope,
  ): Promise<{ ceiling: AutonomyGate; detail: string } | null> {
    if (!this.graph || !scope.tenantId || !scope.organizationId) return null
    const result = await this.graph.cachedCeilingFor(scope.organizationId, scope.tenantId, capabilityId)
    return {
      ceiling: result.ceiling,
      detail: result.contributingEdges[0]?.because ?? `resolved from the organization graph (${result.basis})`,
    }
  }
}
