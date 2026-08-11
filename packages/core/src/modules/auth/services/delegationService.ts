import type { EntityManager } from '@mikro-orm/postgresql'
import { AuthorityDelegation } from '@open-mercato/core/modules/auth/data/entities'
import {
  delegationWindowProblem,
  selectActiveDelegation,
  type DelegationRecord,
} from '@open-mercato/shared/modules/delegations'
import type { AutonomyGate } from '@open-mercato/shared/modules/capabilities'
import { AUTONOMY_GATES } from '@open-mercato/shared/modules/capabilities'

export type DelegationScope = {
  tenantId?: string | null
  organizationId?: string | null
}

export type GrantDelegationInput = {
  granteePrincipalId: string
  granteeKind: string
  grantorPrincipalId: string
  grantorKind: string
  capabilityId: string
  startsAt: Date
  expiresAt: Date
  reason: string
  authorityCeiling?: AutonomyGate | null
  organizationId?: string | null
}

/**
 * Reading and writing lent authority.
 *
 * **Never cached.** `RbacService` caches resolved ACLs for five minutes, and a
 * delegation cannot live in that cache: its whole point is a window and an
 * explicit revoke, and a revoke that takes effect "within five minutes" is not a
 * revoke. So this is always a live query.
 *
 * The cost of that is bounded by where it is called from — the grant path only
 * consults delegations **after** the ordinary ACL has already said no, which is
 * the path that was about to return 403 anyway. A permission somebody genuinely
 * holds never pays for this.
 */
export class DelegationService {
  constructor(private readonly em: EntityManager) {}

  /**
   * The delegation this actor may act under for this capability, if any.
   *
   * The database narrows to the rows that could possibly apply; the decision of
   * whether one actually does is `selectActiveDelegation`, the same pure function
   * the resolver uses, so the grant path and the ceiling path cannot disagree.
   */
  async activeFor(
    granteePrincipalId: string,
    capabilityId: string,
    scope: DelegationScope,
    now: Date = new Date(),
  ): Promise<DelegationRecord | null> {
    if (!scope.tenantId || !granteePrincipalId || !capabilityId) return null

    const rows = await this.em.find(AuthorityDelegation, {
      tenantId: scope.tenantId,
      granteePrincipalId,
      capabilityId,
      revokedAt: null,
      // Bounds the scan; the authoritative window check is in the pure function,
      // so a clock difference here cannot widen the answer.
      expiresAt: { $gt: now },
    })

    return selectActiveDelegation(rows.map((row) => this.toRecord(row)), {
      capabilityId,
      organizationId: scope.organizationId ?? null,
      now,
    })
  }

  /** Every delegation in the tenant, revoked ones included — this is a record. */
  async list(scope: DelegationScope): Promise<DelegationRecord[]> {
    if (!scope.tenantId) return []
    const rows = await this.em.find(
      AuthorityDelegation,
      { tenantId: scope.tenantId },
      { orderBy: { createdAt: 'desc' } },
    )
    return rows.map((row) => this.toRecord(row))
  }

  /**
   * Lends authority.
   *
   * Validates the window here as well as in the database constraint. The
   * constraint is the guarantee; this is the message — a check violation tells a
   * caller only that something was wrong.
   */
  async grant(input: GrantDelegationInput, scope: DelegationScope): Promise<DelegationRecord> {
    if (!scope.tenantId) throw new Error('[internal] a delegation needs a tenant')
    const problem = delegationWindowProblem(input.startsAt, input.expiresAt)
    if (problem) throw new Error(`[internal] ${problem}`)
    if (!input.reason?.trim()) throw new Error('[internal] a delegation needs a reason')

    const created = this.em.create(AuthorityDelegation, {
      tenantId: scope.tenantId,
      organizationId: input.organizationId ?? null,
      grantorPrincipalId: input.grantorPrincipalId,
      grantorKind: input.grantorKind,
      granteePrincipalId: input.granteePrincipalId,
      granteeKind: input.granteeKind,
      capabilityId: input.capabilityId,
      authorityCeiling: input.authorityCeiling ?? null,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
      revokedAt: null,
      revokedByUserId: null,
      reason: input.reason.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await this.em.persist(created).flush()
    return this.toRecord(created)
  }

  /**
   * Takes it back, now.
   *
   * Idempotent: revoking an already-revoked delegation keeps the original
   * timestamp rather than moving it. When something stopped granting is a fact
   * about the past, and a second click should not rewrite it.
   */
  async revoke(
    id: string,
    scope: DelegationScope,
    revokedByUserId: string | null,
  ): Promise<DelegationRecord | null> {
    if (!scope.tenantId) return null
    const row = await this.em.findOne(AuthorityDelegation, { id, tenantId: scope.tenantId })
    if (!row) return null
    if (!row.revokedAt) {
      row.revokedAt = new Date()
      row.revokedByUserId = revokedByUserId
      await this.em.flush()
    }
    return this.toRecord(row)
  }

  private toRecord(row: AuthorityDelegation): DelegationRecord {
    return {
      id: row.id,
      granteePrincipalId: row.granteePrincipalId,
      grantorPrincipalId: row.grantorPrincipalId,
      capabilityId: row.capabilityId,
      organizationId: row.organizationId ?? null,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt ?? null,
      // An unrecognised ceiling becomes `null` — "whatever the grantor could do" —
      // rather than being trusted as a gate. A stored value this version cannot
      // read must not be handed to the resolver as though it were meaningful.
      authorityCeiling: this.parseCeiling(row.authorityCeiling),
      reason: row.reason,
    }
  }

  private parseCeiling(value: string | null | undefined): AutonomyGate | null {
    if (!value) return null
    return (AUTONOMY_GATES as readonly string[]).includes(value) ? (value as AutonomyGate) : null
  }
}
