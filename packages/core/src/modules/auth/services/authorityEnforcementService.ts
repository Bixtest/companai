import { resolveDecision, type Decision } from '@open-mercato/shared/lib/authority/decision'
import { getCapabilityDescriptor } from '@open-mercato/shared/lib/capabilities/registry'
import { parseSubject } from '@open-mercato/shared/lib/auth/principal'
import type { AutonomyGate } from '@open-mercato/shared/modules/capabilities'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { recordLockCeiling, recordLockReason, type RecordLockState } from '@open-mercato/shared/modules/record-locks'
import { DEFAULT_TRUST_TIER, TRUST_TIER_NAMES, trustCeilingFor, type TrustTier } from '@open-mercato/shared/modules/trust'
import { parseAuthorityPolicy, policyCeilingFor } from '@open-mercato/shared/modules/authority-policy'
import { projectCeilingFor, type ProjectOverlay } from '@open-mercato/shared/modules/project-overlays'
import type { TaskGrade } from '@open-mercato/shared/modules/capabilities'

const GATE_ORDER: AutonomyGate[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']

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
 * Where a tenant's own authority rules live — beside the enforcement mode, in the
 * same module config, because they are the same kind of decision made by the same
 * person.
 */
const AUTHORITY_POLICY_CONFIG_KEY = 'authority_policy'

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
 * Whether the person an actor is acting *for* holds the capability themselves.
 *
 * A reader rather than the RBAC service itself, because `rbacService` is
 * constructed with this service as a dependency — injecting it back would be a
 * cycle. The DI registration hands over an object that resolves `rbacService`
 * from the cradle at call time, which is late enough to break it.
 */
/**
 * The state the record being acted on is in.
 *
 * A reader for the same reason as the others: this service is constructed inside
 * the request container and must not reach for an `EntityManager` of its own.
 */
type RecordLockReader = {
  stateFor: (
    recordId: string,
    scope: AuthorityScope,
  ) => Promise<{ state: RecordLockState; reason: string | null } | null>
}

/**
 * Lent authority in force for this actor, if any.
 *
 * Read here as well as in the grant path. Two lookups rather than one threaded
 * value, deliberately: the two questions are asked at different layers and by
 * different callers, and coupling them would mean the resolver could only ever
 * be consulted from inside a permission check.
 */
/**
 * What a principal has earned for acts of this kind.
 *
 * The one reader here whose answer can *widen* a decision — every other input
 * narrows. Safe because the value it returns is still only a ceiling among
 * ceilings, and because nothing can write it without evidence and a person.
 */
/**
 * The matter an act belongs to, and what it permits there.
 *
 * Supplies **two** inputs rather than one: the project's own ceiling, and the
 * task grade — which had no source at all until a matter existed to read one
 * from.
 */
type ProjectReader = {
  contextFor: (
    recordId: string,
    principalId: string,
    scope: AuthorityScope,
  ) => Promise<{ grade: TaskGrade | null; overlay: ProjectOverlay | null } | null>
}

type TrustReader = {
  tierFor: (
    principalId: string,
    capabilityGroup: string,
    scope: AuthorityScope,
  ) => Promise<TrustTier>
}

type DelegationReader = {
  activeFor: (
    granteePrincipalId: string,
    capabilityId: string,
    scope: AuthorityScope,
  ) => Promise<{ grantorPrincipalId: string; authorityCeiling: AutonomyGate | null; reason: string; expiresAt: Date } | null>
}

type InvokerAuthorityReader = {
  holdsCapability: (
    userId: string,
    featureId: string,
    scope: AuthorityScope,
  ) => Promise<boolean>
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
 * The resolver returns a gate, `A0` through `A5`, and **every one of them now
 * binds**. `A0` refuses here; `A1` and `A2` hold the act until somebody approves
 * it; `A3` holds it until its window passes unless vetoed; `A4` runs it and files
 * it for review. The command gate in `commands/interceptors.ts` carries out the
 * last four.
 *
 * *(This comment said "only `A0` is enforced" until 2026-08-11, which stopped
 * being true when the command gate landed on 2026-08-10. A stale comment about a
 * control is worse than none, because it is read as a limitation and worked
 * around.)*
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
    private readonly invokerAuthority: InvokerAuthorityReader | null = null,
    private readonly recordLocks: RecordLockReader | null = null,
    private readonly delegations: DelegationReader | null = null,
    private readonly trust: TrustReader | null = null,
    private readonly projects: ProjectReader | null = null,
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

    for (const feature of required) {
      const decision = await this.decideFor(subject, feature, scope)
      // An undescribed capability is a coverage gap, not a refusal. Enforcing on
      // absence would make every wildcard grant and every un-described feature a
      // denial, which is a migration failure dressed up as a security control.
      if (!decision) continue
      if (!decision.allowed) return { capabilityId: feature, decision }
    }

    return null
  }

  /**
   * The whole decision for one capability, or `null` when no module describes it.
   *
   * `refusalFor` answers "may this proceed?" and throws the rest away, which is
   * all a boolean permission check can use. Holding an act needs the gate itself:
   * `A0` is a refusal, `A1` and `A2` are *not yet*, and only the second kind can
   * be queued for a person.
   *
   * Unlike `refusalFor` this does **not** check the tenant's mode — the caller
   * decides what to do with a decision, and the command gate has already
   * established that enforcement is on.
   */
  async decideFor(
    subject: string,
    feature: string,
    scope: AuthorityScope,
    options: { onBehalfOfUserId?: string | null; recordId?: string | null } = {},
  ): Promise<Decision | null> {
    const capability = getCapabilityDescriptor(feature)
    if (!capability) return null

    const principal = parseSubject(subject)
    const graphCeiling = await this.graphCeilingFor(capability.id, scope)
    const invokerCeiling = await this.invokerCeilingFor(
      capability,
      scope,
      graphCeiling,
      principal.id,
      options.onBehalfOfUserId ?? null,
    )
    const resourceCeiling = await this.resourceCeilingFor(capability, scope, options.recordId ?? null)
    const delegation = await this.delegationCeilingFor(capability, scope, principal.id)
    const trust = await this.trustCeilingFor(capability, scope, principal.id)
    const policy = await this.policyCeilingFor(capability, scope.tenantId)
    const project = await this.projectContextFor(capability, scope, principal.id, options.recordId ?? null)

    return resolveDecision({
      actor: {
        kind: principal.kind,
        id: principal.id,
        // RBAC has already said yes; this service exists to narrow that, and
        // re-deciding the grant here would put two answers to one question in
        // the codebase.
        holdsCapability: true,
        ...(graphCeiling ? { graphCeiling: graphCeiling.ceiling, graphCeilingDetail: graphCeiling.detail } : {}),
        ...(invokerCeiling ? { invokerCeiling } : {}),
        ...(delegation ? { delegationCeiling: delegation.ceiling } : {}),
        ...(trust ? { trustCeiling: trust.ceiling } : {}),
      },
      capability,
      context: {
        ...(resourceCeiling
          ? { resourceCeiling: resourceCeiling.ceiling, resourceCeilingDetail: resourceCeiling.detail }
          : {}),
        ...(policy ? { policyCeiling: policy.ceiling, policyCeilingDetail: policy.detail } : {}),
        // The project supplies two things. Its ceiling joins `resourceCeiling`
        // rather than getting a rule of its own — both are statements about the
        // thing being acted on, and the resolver takes the lower.
        ...(project?.ceiling
          ? {
              resourceCeiling: this.lowerOf(resourceCeiling?.ceiling, project.ceiling.ceiling),
              resourceCeilingDetail: this.lowerOf(resourceCeiling?.ceiling, project.ceiling.ceiling) === project.ceiling.ceiling
                ? project.ceiling.detail
                : resourceCeiling?.detail,
            }
          : {}),
        ...(project?.grade ? { grade: project.grade } : {}),
      },
    })
  }

  /**
   * The ceiling the record's own state imposes (G5).
   *
   * Unlike every other input here, this is not about the actor at all — a locked
   * contract is locked for everybody. It arrives as a ceiling like the rest, so
   * no amount of trust, delegation or standing approval reaches past it: the
   * resolver takes a minimum and nothing in it widens.
   *
   * Reads are exempt, which `recordLockCeiling` decides rather than this method —
   * a locked record nobody may look at is one nobody can review before deciding
   * to unlock it.
   */
  private async resourceCeilingFor(
    capability: ReturnType<typeof getCapabilityDescriptor>,
    scope: AuthorityScope,
    recordId: string | null,
  ): Promise<{ ceiling: AutonomyGate; detail: string } | null> {
    if (!capability || !recordId || !this.recordLocks) return null
    const lock = await this.recordLocks.stateFor(recordId, scope)
    if (!lock) return null
    const ceiling = recordLockCeiling(lock.state, capability.effectClass)
    if (!ceiling) return null
    return { ceiling, detail: recordLockReason(lock.state, lock.reason) }
  }

  /**
   * The project an act belongs to, if any — its rules and its grade.
   *
   * Reached through the record: `authority_project_records` maps a record into a
   * matter, and the gate already reads `payload.id` for record locks. No command
   * had to declare anything.
   *
   * **Only a member's overlay applies.** A non-member acting on a project's
   * record is governed by everything else — the graph, policy, the record's own
   * lock — but not by rules written for people working inside the matter.
   */
  private async projectContextFor(
    capability: ReturnType<typeof getCapabilityDescriptor>,
    scope: AuthorityScope,
    principalId: string,
    recordId: string | null,
  ): Promise<{ ceiling: { ceiling: AutonomyGate; detail: string } | null; grade: TaskGrade | null } | null> {
    if (!capability || !this.projects || !recordId) return null
    const context = await this.projects.contextFor(recordId, principalId, scope)
    if (!context) return null
    return {
      ceiling: context.overlay ? projectCeilingFor(context.overlay, capability) : null,
      grade: context.grade,
    }
  }

  /** The lower of two gates, treating an absent one as no constraint. */
  private lowerOf(left: AutonomyGate | undefined, right: AutonomyGate): AutonomyGate {
    if (!left) return right
    return GATE_ORDER.indexOf(left) <= GATE_ORDER.indexOf(right) ? left : right
  }

  /**
   * The ceiling this tenant's own policy imposes.
   *
   * Stored beside the enforcement mode, in the same per-tenant config the mode
   * already uses — no new table, because a policy is a handful of declarative
   * rules rather than a growing collection of records.
   *
   * An unreadable policy yields **no ceiling**, and a warning. The alternative is
   * inventing a restriction the tenant never wrote, which would refuse real work
   * on the strength of a typo. That loosens rather than tightens, and it is the
   * same position this service takes everywhere else: a configuration failure is
   * not a permission answer.
   */
  private async policyCeilingFor(
    capability: ReturnType<typeof getCapabilityDescriptor>,
    tenantId: string | null,
  ): Promise<{ ceiling: AutonomyGate; detail: string } | null> {
    if (!capability || !this.moduleConfig || !tenantId) return null
    const stored = await this.moduleConfig.getValue<unknown>(
      ENFORCEMENT_CONFIG_MODULE,
      AUTHORITY_POLICY_CONFIG_KEY,
      { defaultValue: null, scope: { tenantId } },
    )
    if (stored == null) return null
    const policy = parseAuthorityPolicy(stored)
    if (!policy.rules.length) {
      logger.warn('Authority policy stored but unreadable; no policy ceiling applied', { tenantId })
      return null
    }
    return policyCeilingFor(policy, capability)
  }

  /**
   * The ceiling this principal's earned trust permits.
   *
   * Returns `null` at `T0`, deliberately. `T0` is where everybody starts and is
   * exactly what the untrusted-machine default already says, so supplying it
   * would replace a rule that explains itself — *"no trust record for this
   * worker"* — with one that says `T0` and means the same thing. The resolver
   * falls through to the clearer message.
   *
   * Trust is read per **capability group**, which is the capability's module:
   * a worker can be trusted with research reads and supervised on external
   * communication (planning 02 §5.1).
   */
  private async trustCeilingFor(
    capability: ReturnType<typeof getCapabilityDescriptor>,
    scope: AuthorityScope,
    principalId: string,
  ): Promise<{ ceiling: AutonomyGate; tier: TrustTier } | null> {
    if (!capability || !this.trust || !principalId) return null
    const tier = await this.trust.tierFor(principalId, capability.module, scope)
    if (tier === DEFAULT_TRUST_TIER) return null
    return { ceiling: trustCeilingFor(tier, capability.effectClass), tier }
  }

  /**
   * The ceiling lent authority imposes (G3).
   *
   * Two rules, both narrowing. The grantor cannot lend more than they hold, which
   * is invariant **I4** again in a different costume \u2014 so the grantor is resolved
   * as themselves and their gate becomes the ceiling. And a grantor may lend
   * *less* by naming an explicit cap, which is taken when it is lower.
   *
   * A stored ceiling is never used on its own. It would go stale the moment the
   * grantor's own authority changed, and a delegation quietly outliving its
   * grantor's permissions is exactly the failure this feature exists to prevent.
   */
  private async delegationCeilingFor(
    capability: ReturnType<typeof getCapabilityDescriptor>,
    scope: AuthorityScope,
    granteePrincipalId: string,
  ): Promise<{ ceiling: AutonomyGate } | null> {
    if (!capability || !this.delegations || !granteePrincipalId) return null
    const delegation = await this.delegations.activeFor(granteePrincipalId, capability.id, scope)
    if (!delegation) return null

    const grantorGate = await this.invokerCeilingFor(
      capability,
      scope,
      await this.graphCeilingFor(capability.id, scope),
      granteePrincipalId,
      delegation.grantorPrincipalId,
    )

    const candidates: AutonomyGate[] = []
    if (grantorGate) candidates.push(grantorGate)
    if (delegation.authorityCeiling) candidates.push(delegation.authorityCeiling)
    if (!candidates.length) return null

    const ceiling = candidates.reduce((lowest, candidate) => (
      GATE_ORDER.indexOf(candidate) < GATE_ORDER.indexOf(lowest) ? candidate : lowest
    ))
    return { ceiling }
  }

  /**
   * Invariant **I4** — authority is carried, never amplified.
   *
   * An API key acts for the person who owns it, and an AI worker acts for
   * whoever set it going. Without this, that key could do things its owner
   * cannot: the key passes its own RBAC check, the resolver sees a `service`
   * principal with no invoker, and the person behind it is never consulted.
   *
   * So the invoker is resolved **as themselves** — their own grant, their own
   * position in the graph, the same capability — and whatever gate that produces
   * becomes a ceiling on the act. If they may not perform it at all, the answer
   * is `A0` and the act is refused.
   *
   * Only one level deep, and that is not a shortcut: a human's
   * `onBehalfOfUserId` is always null, so the chain is at most
   * machine → person by construction.
   */
  private async invokerCeilingFor(
    capability: ReturnType<typeof getCapabilityDescriptor>,
    scope: AuthorityScope,
    graphCeiling: { ceiling: AutonomyGate; detail: string } | null,
    actorId: string,
    onBehalfOfUserId: string | null,
  ): Promise<AutonomyGate | null> {
    if (!capability) return null
    // Nobody to carry authority from: the actor answers only to itself.
    if (!onBehalfOfUserId) return null
    // A person acting as themselves is not carrying anybody's authority, and
    // capping them by their own decision would double-apply every rule.
    if (onBehalfOfUserId === actorId) return null

    if (!this.invokerAuthority) {
      // A lean bootstrap with no RBAC registered. Skipped rather than refused:
      // this service takes the position that an infrastructure gap is not a
      // permission answer, and inventing `A0` here would deny acts nobody
      // decided to deny.
      logger.warn('Cannot check invoker authority; no reader registered', { capability: capability.id })
      return null
    }

    const holds = await this.invokerAuthority.holdsCapability(onBehalfOfUserId, capability.id, scope)

    const decision = resolveDecision({
      actor: {
        kind: 'human',
        id: onBehalfOfUserId,
        holdsCapability: holds,
        // The same position in the organization graph: the invoker is being
        // judged in the scope the act is happening in, not in some other one.
        ...(graphCeiling ? { graphCeiling: graphCeiling.ceiling, graphCeilingDetail: graphCeiling.detail } : {}),
      },
      capability,
      context: {},
    })
    return decision.gate
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
