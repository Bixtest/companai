import type { EntityManager } from '@mikro-orm/postgresql'
import { sql } from 'kysely'
import { AuthorityTrustGrant } from '@open-mercato/core/modules/auth/data/entities'
import {
  DEFAULT_TRUST_TIER,
  demotedTier,
  demotionTriggered,
  evaluatePromotion,
  parseTrustTier,
  promotionVerdict,
  tierRank,
  type PromotionCriterion,
  type TrustEvidence,
  type TrustTier,
} from '@open-mercato/shared/modules/trust'

export type TrustScope = { tenantId?: string | null }

export type TrustGrantRecord = {
  principalId: string
  capabilityGroup: string
  tier: TrustTier
  reason: string | null
  unverified: PromotionCriterion[]
  updatedAt: Date
}

export type PromotionOutcome =
  | { ok: true; grant: TrustGrantRecord; unverified: PromotionCriterion[] }
  | { ok: false; reason: string; criteria: PromotionCriterion[] }

/**
 * What a principal has earned, and the evidence for it.
 *
 * **The read path is one indexed lookup**, because the resolver calls it on every
 * gated act. Evidence is computed only when somebody asks to promote or when an
 * act is reversed — never on the decision path, which would put two aggregate
 * queries in front of every write in the platform.
 */
export class TrustService {
  constructor(private readonly em: EntityManager) {}

  /**
   * The tier this principal holds for this capability group.
   *
   * `T0` when there is no row. Absence is the bottom of the scale rather than a
   * default in the middle: this is the one lookup whose failure must not grant
   * anything.
   */
  async tierFor(principalId: string, capabilityGroup: string, scope: TrustScope): Promise<TrustTier> {
    if (!scope.tenantId || !principalId || !capabilityGroup) return DEFAULT_TRUST_TIER
    const row = await this.em.findOne(AuthorityTrustGrant, {
      tenantId: scope.tenantId,
      principalId,
      capabilityGroup,
    })
    return row ? parseTrustTier(row.tier) : DEFAULT_TRUST_TIER
  }

  async list(scope: TrustScope): Promise<TrustGrantRecord[]> {
    if (!scope.tenantId) return []
    const rows = await this.em.find(
      AuthorityTrustGrant,
      { tenantId: scope.tenantId },
      { orderBy: { updatedAt: 'desc' } },
    )
    return rows.map((row) => this.toRecord(row))
  }

  /**
   * What this principal's record looks like right now.
   *
   * Two aggregates over `action_logs`: how much work it has completed in this
   * group, and how much of it a reviewer reversed. `execution_state` carries
   * both — `undone` is a reviewer disagreeing after the fact, which is exactly
   * the signal the specification calls an override.
   */
  async evidenceFor(principalId: string, capabilityGroup: string, scope: TrustScope): Promise<TrustEvidence> {
    const empty: TrustEvidence = { completedActs: 0, overriddenActs: 0 }
    if (!scope.tenantId || !principalId) return empty

    // Kysely, not Knex: MikroORM 7 moved, and `getKnex` no longer exists.
    //
    // Both counts come from one pass. Two queries would be two different moments,
    // and an override rate computed from a numerator and a denominator taken
    // seconds apart is a number nobody can reproduce.
    const row = await (this.em.getKysely<any>() as any)
      .selectFrom('action_logs')
      .select([
        sql<string>`count(*) filter (where execution_state in ('done', 'undone', 'redone'))`.as('completed'),
        sql<string>`count(*) filter (where execution_state = 'undone')`.as('overridden'),
      ])
      .where('action_logs.tenant_id', '=', scope.tenantId)
      .where('action_logs.actor_user_id', '=', principalId)
      // The capability group is the capability's module, and a command id starts
      // with it. A `like` rather than a join because the bus carries no entity
      // type -- the same constraint that shaped G5.
      .where('action_logs.command_id', 'like', `${capabilityGroup}.%`)
      .where('action_logs.deleted_at', 'is', null)
      .executeTakeFirst()

    return {
      completedActs: Number(row?.completed ?? 0),
      overriddenActs: Number(row?.overridden ?? 0),
    }
  }

  /**
   * Raises a principal one tier, if the evidence permits it.
   *
   * **Refuses on a failed criterion; carries an unverifiable one.** Three of the
   * five the specification names cannot be checked here, and blocking on them
   * would make promotion impossible until three unrelated features exist. They
   * are stored on the grant instead, so the gap travels with the decision rather
   * than living in a design document nobody re-reads.
   *
   * One tier at a time. A jump from `T0` to `T4` is not a promotion, it is a
   * decision to skip the evidence.
   */
  async promote(
    principalId: string,
    principalKind: string,
    capabilityGroup: string,
    scope: TrustScope,
    grantedByUserId: string | null,
    reason: string,
  ): Promise<PromotionOutcome> {
    if (!scope.tenantId) throw new Error('[internal] a trust grant needs a tenant')

    const evidence = await this.evidenceFor(principalId, capabilityGroup, scope)
    const criteria = evaluatePromotion(evidence)
    const verdict = promotionVerdict(criteria)
    if (!verdict.allowed) {
      return { ok: false, reason: verdict.refusedBecause ?? 'the evidence does not support a promotion', criteria }
    }

    const current = await this.tierFor(principalId, capabilityGroup, scope)
    if (current === 'T4') {
      return { ok: false, reason: 'already at the highest tier', criteria }
    }
    const next = (['T0', 'T1', 'T2', 'T3', 'T4'] as TrustTier[])[tierRank(current) + 1]

    const grant = await this.write(principalId, principalKind, capabilityGroup, next, scope, {
      evidence,
      unverified: verdict.unverified,
      grantedByUserId,
      reason,
    })
    return { ok: true, grant, unverified: verdict.unverified }
  }

  /**
   * Drops a principal one tier, now.
   *
   * No approval, no evidence threshold beyond the trigger, and it takes effect on
   * the next decision. Invariant **I9**: the asymmetry between this and
   * `promote` is the safety property, not an inconsistency.
   */
  async demote(
    principalId: string,
    capabilityGroup: string,
    scope: TrustScope,
    reason: string,
  ): Promise<TrustGrantRecord | null> {
    if (!scope.tenantId) return null
    const row = await this.em.findOne(AuthorityTrustGrant, {
      tenantId: scope.tenantId,
      principalId,
      capabilityGroup,
    })
    // Nothing to demote: absence already means `T0`.
    if (!row) return null

    const current = parseTrustTier(row.tier)
    const next = demotedTier(current)
    if (next === current) return this.toRecord(row)

    row.tier = next
    row.reason = reason
    // The evidence that justified the old tier is not evidence for the new one.
    row.evidenceJson = null
    row.unverifiedJson = null
    row.grantedByUserId = null
    await this.em.flush()
    return this.toRecord(row)
  }

  /**
   * Demotes when the record now demands it.
   *
   * Called after an act is reversed rather than on a schedule, so "immediate"
   * means immediate. A sweep would leave a worker at its old tier for however
   * long the interval is, which is the window the specification is trying to
   * close.
   */
  async demoteIfEvidenceDemands(
    principalId: string,
    capabilityGroup: string,
    scope: TrustScope,
  ): Promise<TrustGrantRecord | null> {
    const evidence = await this.evidenceFor(principalId, capabilityGroup, scope)
    if (!demotionTriggered(evidence)) return null
    return this.demote(
      principalId,
      capabilityGroup,
      scope,
      `reviewers reversed ${evidence.overriddenActs} of ${evidence.completedActs} acts`,
    )
  }

  private async write(
    principalId: string,
    principalKind: string,
    capabilityGroup: string,
    tier: TrustTier,
    scope: TrustScope,
    details: {
      evidence: TrustEvidence
      unverified: PromotionCriterion[]
      grantedByUserId: string | null
      reason: string
    },
  ): Promise<TrustGrantRecord> {
    const existing = await this.em.findOne(AuthorityTrustGrant, {
      tenantId: scope.tenantId!,
      principalId,
      capabilityGroup,
    })

    if (existing) {
      existing.tier = tier
      existing.evidenceJson = details.evidence
      existing.unverifiedJson = details.unverified
      existing.grantedByUserId = details.grantedByUserId
      existing.reason = details.reason
      await this.em.flush()
      return this.toRecord(existing)
    }

    const created = this.em.create(AuthorityTrustGrant, {
      tenantId: scope.tenantId!,
      principalId,
      principalKind,
      capabilityGroup,
      tier,
      evidenceJson: details.evidence,
      unverifiedJson: details.unverified,
      grantedByUserId: details.grantedByUserId,
      reason: details.reason,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await this.em.persist(created).flush()
    return this.toRecord(created)
  }

  private toRecord(row: AuthorityTrustGrant): TrustGrantRecord {
    return {
      principalId: row.principalId,
      capabilityGroup: row.capabilityGroup,
      tier: parseTrustTier(row.tier),
      reason: row.reason ?? null,
      unverified: Array.isArray(row.unverifiedJson) ? (row.unverifiedJson as PromotionCriterion[]) : [],
      updatedAt: row.updatedAt,
    }
  }
}
