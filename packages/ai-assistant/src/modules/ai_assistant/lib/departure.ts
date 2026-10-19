import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { User, AuthorityDelegation } from '@open-mercato/core/modules/auth/data/entities'
import { ApiKey } from '@open-mercato/core/modules/api_keys/data/entities'
import {
  AiAgentBindingRepository,
  type AiAgentBindingRevoked,
} from '../data/repositories/AiAgentBindingRepository'

/**
 * `CC-127` — the departure flow.
 *
 * D4's answer is *"the admin doing the deactivation decides, at that moment,
 * what happens to the related agents"*. The platform had no surface that asked
 * and no record that answered: an offboarded person's credentials died (twice
 * over — the `api_keys` subscriber and the liveness check in `resolveApiKeyAuth`)
 * and their agent rows survived as orphans nobody could tell from live ones.
 *
 * **What this module is.** A preview (what is related to this person) and an
 * apply (carry out the decision). Both are pure data operations over an
 * `EntityManager`; the HTTP verbs live in `api/ai/departures/[userId]/route.ts`.
 *
 * **What it is not.** It does not make an agent outlive its owner. A binding's
 * principal is an `api_keys` id, and the key dies with the person, so **both**
 * decisions leave the agent unable to act. `leave` preserves the row for a
 * future re-home; `deactivate` marks it revoked. The difference is the record,
 * not the capability, and the receipt says so rather than implying a living
 * agent.
 *
 * **Why the cascade runs after the delete.** The delete is the primary act and
 * can fail; the cascade is a consequence. If it fails the person is still gone
 * and the rows are still inert (the credential is already dead), so the failure
 * direction is *inert*, never *open*. The route reports that state honestly as
 * `departure_partial`.
 */

export type DepartureDecision = 'deactivate' | 'leave'

export const DEPARTURE_DECISIONS: readonly DepartureDecision[] = ['deactivate', 'leave']

/**
 * The safe path is the default: a caller who omits the decision gets the one
 * that leaves no live-looking row behind, and the receipt names it.
 */
export const DEFAULT_DEPARTURE_DECISION: DepartureDecision = 'deactivate'

/** The sentence the receipt carries for a preserved agent. */
export const DEPARTURE_INERT_REASON =
  'the credential dies with its owner, so the binding cannot act; the row is kept for a future re-home'

/**
 * How a key relates to the departing person.
 *
 * `session` — `api_keys.session_user_id = userId`: the key **acts as** them.
 * `created` — only `api_keys.created_by = userId`: the key was **minted by**
 * them. The existing `api_keys` cascade sees only `created`, so the preview is
 * already more complete than the cascade it explains.
 */
export type DepartureKeyLink = 'session' | 'created'

export interface DepartureAgentPreview {
  agentId: string
  principalId: string
  keyName: string | null
  organizationId: string | null
  keyLink: DepartureKeyLink
}

export interface DepartureDelegationPreview {
  id: string
  direction: 'granted' | 'received'
  capabilityId: string
  /** `null` when the row carries no readable date — the preview says so rather than inventing one. */
  expiresAt: string | null
  alreadyRevoked: boolean
}

export interface DeparturePreview {
  user: { id: string; email: string; name: string | null }
  agents: DepartureAgentPreview[]
  delegations: DepartureDelegationPreview[]
  default: DepartureDecision
}

export interface DepartureAgentReceipt extends DepartureAgentPreview {
  /** The write reported this row. */
  revoked: boolean
  /** It was listed live and the write did not report it — something else got there first. */
  alreadyRevoked: boolean
  /** Only on `leave`: the row is untouched and the agent still cannot act. */
  stillInert?: boolean
  reason?: string
}

export interface DepartureDelegationReceipt extends DepartureDelegationPreview {
  revoked: boolean
}

export interface DepartureReceipt {
  userId: string
  decision: DepartureDecision
  user: DeparturePreview['user']
  agents: DepartureAgentReceipt[]
  delegations: DepartureDelegationReceipt[]
  counts: {
    agents: number
    agentsRevoked: number
    delegations: number
    delegationsRevoked: number
  }
  /** Present on `leave`: says plainly that no row was changed. */
  note?: string
}

/**
 * The one verb this module needs from the delegation service.
 *
 * Narrow on purpose: `DelegationService` is `auth`'s, and a structural port
 * keeps this module from importing a service it only calls one method on — and
 * keeps the unit test from having to construct one.
 */
export interface DelegationRevoker {
  revoke(
    id: string,
    scope: { tenantId: string },
    revokedByUserId: string | null,
  ): Promise<unknown | null>
}

/**
 * What is related to this person, and the default decision.
 *
 * `null` means *not in this tenant* — the only honest answer once the caller is
 * authorized for the verb. The route turns it into a 404 and never a 403, which
 * would confirm the id exists elsewhere.
 */
export async function previewDeparture(input: {
  userId: string
  tenantId: string
  em: EntityManager
}): Promise<DeparturePreview | null> {
  const { userId, tenantId, em } = input
  if (!userId || !tenantId) return null

  const user = await findOneWithDecryption<User>(
    em,
    User,
    { id: userId, tenantId, deletedAt: null },
    {},
    { tenantId, organizationId: null },
  )
  if (!user) return null

  // Both links, in one query. A key that both acts as the person and was minted
  // by them appears once, as `session` — the stronger claim.
  const keys = await em.find(ApiKey, {
    tenantId,
    deletedAt: null,
    $or: [{ sessionUserId: userId }, { createdBy: userId }],
  } as any)
  const keyById = new Map(keys.map((key) => [key.id, key]))

  const bindings = keys.length
    ? await new AiAgentBindingRepository(em).listForPrincipals(
        keys.map((key) => key.id),
        { tenantId },
      )
    : []

  const agents: DepartureAgentPreview[] = bindings.map((row) => {
    const key = keyById.get(row.principalId) ?? null
    return {
      agentId: row.agentId,
      principalId: row.principalId,
      keyName: key?.name ?? null,
      organizationId: row.organizationId ?? null,
      keyLink: key?.sessionUserId === userId ? 'session' : 'created',
    }
  })

  // Both directions. The kind is checked because the id alone does not identify
  // a principal (`CC-124`): a machine's key id must not be read as this person
  // just because it is the same uuid.
  const delegationRows = await em.find(AuthorityDelegation, {
    tenantId,
    $or: [
      { grantorPrincipalId: userId, grantorKind: 'human' },
      { granteePrincipalId: userId, granteeKind: 'human' },
    ],
  } as any)

  const delegations: DepartureDelegationPreview[] = delegationRows.map((row) => ({
    id: row.id,
    direction: row.grantorPrincipalId === userId ? 'granted' : 'received',
    capabilityId: row.capabilityId,
    expiresAt: toIso(row.expiresAt),
    alreadyRevoked: Boolean(row.revokedAt),
  }))

  return {
    user: { id: user.id, email: String(user.email), name: user.name ?? null },
    agents,
    delegations,
    default: DEFAULT_DEPARTURE_DECISION,
  }
}

/**
 * Carries out the decision. **Runs after the user delete has committed.**
 *
 * `deactivate` revokes every listed binding (tenant-wide) and every listed
 * delegation in both directions, so `revoked_by_user_id` names the admin who
 * decided. `leave` writes nothing.
 *
 * **The receipt is built from what the write reported**, not from the preview:
 * a binding that was already revoked reads `alreadyRevoked`, and one that
 * appeared between the preview and the cascade would still be revoked (the
 * repository re-reads live rows) though it cannot appear here — which is why the
 * route's partial-failure answer is a 500 and not a cheerful receipt.
 *
 * Keys are deliberately absent: the `api_keys` subscriber already revoked them
 * in the same delete. Revoking them again would be a second owner of one fact.
 */
export async function applyDeparture(input: {
  preview: DeparturePreview
  decision: DepartureDecision
  tenantId: string
  em: EntityManager
  delegations: DelegationRevoker
  adminUserId: string | null
}): Promise<DepartureReceipt> {
  const { preview, decision, tenantId, em, delegations, adminUserId } = input

  if (decision === 'leave') {
    return {
      userId: preview.user.id,
      decision,
      user: preview.user,
      agents: preview.agents.map((agent) => ({
        ...agent,
        revoked: false,
        alreadyRevoked: false,
        stillInert: true,
        reason: DEPARTURE_INERT_REASON,
      })),
      delegations: preview.delegations.map((delegation) => ({
        ...delegation,
        revoked: false,
      })),
      counts: {
        agents: preview.agents.length,
        agentsRevoked: 0,
        delegations: preview.delegations.length,
        delegationsRevoked: 0,
      },
      note:
        'No agent or delegation row was changed. The departing user\'s credentials are revoked by the delete, so these agents cannot act.',
    }
  }

  const revokedBindings: AiAgentBindingRevoked[] = preview.agents.length
    ? await new AiAgentBindingRepository(em).revokeForPrincipals(
        preview.agents.map((agent) => agent.principalId),
        { tenantId },
      )
    : []
  const revokedKeys = new Set(
    revokedBindings.map((row) => bindingKey(row.principalId, row.agentId)),
  )

  const agentReceipts: DepartureAgentReceipt[] = preview.agents.map((agent) => {
    const revoked = revokedKeys.has(bindingKey(agent.principalId, agent.agentId))
    return { ...agent, revoked, alreadyRevoked: !revoked }
  })

  const delegationReceipts: DepartureDelegationReceipt[] = []
  for (const delegation of preview.delegations) {
    if (delegation.alreadyRevoked) {
      delegationReceipts.push({ ...delegation, revoked: false })
      continue
    }
    const result = await delegations.revoke(delegation.id, { tenantId }, adminUserId)
    delegationReceipts.push({ ...delegation, revoked: result !== null && result !== undefined })
  }

  return {
    userId: preview.user.id,
    decision,
    user: preview.user,
    agents: agentReceipts,
    delegations: delegationReceipts,
    counts: {
      agents: agentReceipts.length,
      agentsRevoked: agentReceipts.filter((agent) => agent.revoked).length,
      delegations: delegationReceipts.length,
      delegationsRevoked: delegationReceipts.filter((delegation) => delegation.revoked).length,
    },
  }
}

function bindingKey(principalId: string, agentId: string): string {
  return `${principalId}:${agentId}`
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
