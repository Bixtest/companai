import type { EntityManager } from '@mikro-orm/postgresql'
import { AuthorityDenial } from '@open-mercato/core/modules/auth/data/entities'
import {
  denialProblem,
  findBlockingDenial,
  type DenialRecord,
} from '@open-mercato/shared/modules/denials'

export type DenialScope = {
  tenantId?: string | null
  organizationId?: string | null
}

export type WithholdInput = {
  subjectPrincipalId: string
  subjectKind: string
  featurePattern: string
  reason: string
  startsAt?: Date
  expiresAt?: Date | null
  organizationId?: string | null
  createdByUserId?: string | null
}

/**
 * Reading and writing permissions withheld from one person.
 *
 * **Never cached**, for the same reason delegations are not: `RbacService` caches
 * resolved ACLs for five minutes, and a denial cannot live in that cache. A
 * delegation that outlives its revoke by five minutes keeps granting; a denial
 * that takes five minutes to arrive keeps *permitting*. Both are the unsafe
 * direction, so both are live queries.
 *
 * The cost is one indexed probe on the permission path. Unlike delegations —
 * which are consulted only after the ACL has already said no — this runs on the
 * path that was about to say **yes**, so it is paid on every allowed check. That
 * is the honest price of a control that cannot be bypassed by holding the
 * permission, and the partial index makes the overwhelmingly common answer
 * (nothing withheld) an empty index scan.
 */
export class DenialService {
  constructor(private readonly em: EntityManager) {}

  /**
   * The denial that stops this act, or `null`.
   *
   * The database narrows to rows that could possibly apply; whether one actually
   * does is `findBlockingDenial`, the same pure function the screen and the CLI
   * use, so what an administrator is shown and what the check enforces cannot
   * drift apart.
   */
  async blocking(
    subjectPrincipalId: string,
    required: readonly string[],
    scope: DenialScope,
    now: Date = new Date(),
  ): Promise<{ feature: string; denial: DenialRecord } | null> {
    if (!scope.tenantId || !subjectPrincipalId || !required.length) return null

    const rows = await this.em.find(AuthorityDenial, {
      tenantId: scope.tenantId,
      subjectPrincipalId,
      liftedAt: null,
    })
    if (!rows.length) return null

    return findBlockingDenial(rows.map((row) => this.toRecord(row)), required, {
      organizationId: scope.organizationId ?? null,
      now,
    })
  }

  /** Every denial in the tenant, lifted ones included — this is a record. */
  async list(scope: DenialScope): Promise<DenialRecord[]> {
    if (!scope.tenantId) return []
    const rows = await this.em.find(
      AuthorityDenial,
      { tenantId: scope.tenantId },
      { orderBy: { createdAt: 'desc' } },
    )
    return rows.map((row) => this.toRecord(row))
  }

  /**
   * Takes a permission away.
   *
   * Validates here as well as in the database constraints. The constraints are
   * the guarantee; this is the message — a check violation tells a caller only
   * that something was wrong.
   */
  async withhold(input: WithholdInput, scope: DenialScope): Promise<DenialRecord> {
    if (!scope.tenantId) throw new Error('[internal] a denial needs a tenant')

    const startsAt = input.startsAt ?? new Date()
    const expiresAt = input.expiresAt ?? null
    const problem = denialProblem({
      featurePattern: input.featurePattern,
      reason: input.reason,
      startsAt,
      expiresAt,
    })
    if (problem) throw new Error(`[internal] ${problem}`)

    const created = this.em.create(AuthorityDenial, {
      tenantId: scope.tenantId,
      organizationId: input.organizationId ?? null,
      subjectPrincipalId: input.subjectPrincipalId,
      subjectKind: input.subjectKind,
      featurePattern: input.featurePattern.trim(),
      startsAt,
      expiresAt,
      liftedAt: null,
      liftedByUserId: null,
      createdByUserId: input.createdByUserId ?? null,
      reason: input.reason.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await this.em.persist(created).flush()
    return this.toRecord(created)
  }

  /**
   * Gives it back, now.
   *
   * Idempotent: lifting an already-lifted denial keeps the original timestamp
   * rather than moving it. When a permission came back is a fact about the past,
   * and a second click should not rewrite it.
   */
  async lift(id: string, scope: DenialScope, liftedByUserId: string | null): Promise<DenialRecord | null> {
    if (!scope.tenantId) return null
    const row = await this.em.findOne(AuthorityDenial, { id, tenantId: scope.tenantId })
    if (!row) return null
    if (!row.liftedAt) {
      row.liftedAt = new Date()
      row.liftedByUserId = liftedByUserId
      await this.em.flush()
    }
    return this.toRecord(row)
  }

  private toRecord(row: AuthorityDenial): DenialRecord {
    return {
      id: row.id,
      subjectPrincipalId: row.subjectPrincipalId,
      featurePattern: row.featurePattern,
      organizationId: row.organizationId ?? null,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt ?? null,
      liftedAt: row.liftedAt ?? null,
      reason: row.reason,
    }
  }
}
