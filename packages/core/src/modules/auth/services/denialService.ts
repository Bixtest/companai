import type { EntityManager } from '@mikro-orm/postgresql'
import { AuthorityDenial } from '@open-mercato/core/modules/auth/data/entities'
import {
  denialProblem,
  findBlockingDenial,
  type DenialRecord,
} from '@open-mercato/shared/modules/denials'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { normalizePrincipalSubject } from '@open-mercato/shared/lib/auth/principal'

/** Matches the API route's kind so both paths land in one place in the log. */
const RESOURCE_KIND = 'authority.denial'

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
  constructor(
    private readonly em: EntityManager,
    /**
     * The audit writer, injected so **every** caller is recorded — not only the
     * ones that remember to.
     *
     * **The parameter name is the registration name** and that is load-bearing:
     * the container runs in Awilix CLASSIC mode and resolves each constructor
     * parameter by name (L37). It must stay `actionLogService`.
     *
     * Optional because the `audit_logs` module can legitimately be absent in a
     * downstream app, exactly as the command bus treats it.
     */
    private readonly actionLogService?: { log: (input: Record<string, unknown>) => Promise<unknown> } | null,
  ) {}

  /**
   * Records the act, wherever it came from.
   *
   * **This lives in the service rather than in the route on purpose (O1).** The
   * audit write used to sit in the API route, so the CLI recovery path —
   * `mercato auth denials --lift` — called `lift()` directly and wrote nothing.
   * The result was the worst possible asymmetry for a governance product: taking
   * a permission away was recorded, and giving it back was not, on the one path
   * used when somebody is locked out and there is no authenticated user to blame.
   *
   * A console act has no `sub`. That is not a gap to paper over — it is the
   * fact worth recording, so it is marked as a `system` actor from the server
   * console rather than left to look like an anonymous human.
   */
  private async record(
    action: 'created' | 'updated',
    record: DenialRecord,
    scope: DenialScope,
    actorUserId: string | null,
    snapshotAfter: Record<string, unknown>,
  ): Promise<void> {
    const writer = this.actionLogService
    if (!writer || typeof writer.log !== 'function') return

    await writeDirectWriteAuditLog({
      // The helper only ever resolves `actionLogService`, and we already hold it.
      container: { resolve: (name: string) => (name === 'actionLogService' ? writer : undefined) },
      auth: { sub: actorUserId, tenantId: scope.tenantId ?? null, orgId: scope.organizationId ?? null },
      organizationId: record.organizationId ?? scope.organizationId ?? null,
      action,
      resourceKind: RESOURCE_KIND,
      resourceId: record.id,
      snapshotAfter,
      context: actorUserId
        ? undefined
        : { origin: 'server-console', actorKind: 'system' },
    })
  }

  /**
   * The denial that stops this act, or `null`.
   *
   * The database narrows to rows that could possibly apply; whether one actually
   * does is `findBlockingDenial`, the same pure function the screen and the CLI
   * use, so what an administrator is shown and what the check enforces cannot
   * drift apart.
   *
   * **`subjectKind`, when given, narrows the query.** The identifier of a
   * principal is its **bare id** and its kind lives in `subject_kind`, which is
   * the platform's convention — see `normalizePrincipalSubject`, which is the
   * write path's half. Passing the kind here is what stops a row that was
   * written for a credential from being read back for a person who happens to
   * share an id. The caller that omits it gets exactly today's answer.
   */
  async blocking(
    subjectPrincipalId: string,
    required: readonly string[],
    scope: DenialScope,
    subjectKind?: string | null,
    now: Date = new Date(),
  ): Promise<{ feature: string; denial: DenialRecord } | null> {
    if (!scope.tenantId || !subjectPrincipalId || !required.length) return null

    const kind = typeof subjectKind === 'string' && subjectKind.trim() ? subjectKind.trim() : null
    const rows = await this.em.find(AuthorityDenial, {
      tenantId: scope.tenantId,
      subjectPrincipalId,
      ...(kind ? { subjectKind: kind } : {}),
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

    // The bare id, and the kind that goes with it. Normalised here as well as in
    // the route, because the service is reachable directly (`CC-124`'s other
    // half: the write side accepted the prefixed encoding the docblock
    // advertised, the enforcement side passed the bare id, and a machine was
    // undeniable). A disagreement between the subject and the kind throws rather
    // than picking a half.
    const subjectPrincipalId = normalizePrincipalSubject(input.subjectPrincipalId, input.subjectKind)

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
      subjectPrincipalId,
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

    const record = this.toRecord(created)
    await this.record('created', record, scope, input.createdByUserId ?? null, {
      subjectPrincipalId: record.subjectPrincipalId,
      featurePattern: record.featurePattern,
      startsAt: record.startsAt,
      expiresAt: record.expiresAt,
      reason: record.reason,
    })
    return record
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

      // Only on the transition. Lifting is idempotent, and a second call must not
      // add a second entry claiming a permission was returned twice.
      const lifted = this.toRecord(row)
      await this.record('updated', lifted, scope, liftedByUserId, {
        liftedAt: lifted.liftedAt,
        featurePattern: lifted.featurePattern,
        subjectPrincipalId: lifted.subjectPrincipalId,
      })
      return lifted
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
