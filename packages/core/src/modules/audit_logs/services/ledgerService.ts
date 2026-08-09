import type { EntityManager } from '@mikro-orm/postgresql'
import { LedgerEvent, type LedgerVisibility } from '@open-mercato/core/modules/audit_logs/data/entities'
import {
  LEDGER_HASH_VERSION,
  canonicalDigest,
  computeLedgerHash,
  type CanonicalValue,
} from '@open-mercato/shared/lib/ledger/canonical'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('audit_logs').child({ component: 'ledger' })

export type LedgerAppendInput = {
  tenantId: string
  eventType: string
  actorKind?: string | null
  actorId?: string | null
  organizationId?: string | null
  resourceKind?: string | null
  resourceId?: string | null
  correlationId?: string | null
  causationId?: string | null
  visibility?: LedgerVisibility
  /** Pointers and digests only — never customer content. */
  payload?: Record<string, CanonicalValue>
  ts?: Date
}

export type LedgerVerificationResult = {
  ok: boolean
  tenantId: string
  checked: number
  /** The first position whose stored hash disagrees with a recomputation. */
  brokenAtSeq: string | null
  reason: string | null
}

/**
 * Turns a UUID into the two 32-bit integers `pg_advisory_xact_lock` wants.
 *
 * The lock only needs to be *consistent* per tenant, not collision-free across
 * tenants: a collision costs two tenants a moment of serialisation, never
 * correctness — the unique constraint on `(tenant_id, seq)` is what guarantees
 * correctness.
 */
function advisoryLockKeys(tenantId: string): [number, number] {
  const digest = canonicalDigest({ ledgerTenant: tenantId })
  const high = Number.parseInt(digest.slice(0, 8), 16) | 0
  const low = Number.parseInt(digest.slice(8, 16), 16) | 0
  return [high, low]
}

/**
 * The hash-chained ledger (R3, Tier 1).
 *
 * `ActionLogService` writes the journal — queryable and, being an ordinary
 * table, editable. This writes the proof: each event carries the hash of its
 * predecessor within its tenant, so altering any row invalidates every hash
 * after it.
 *
 * **Appends must run inside the caller's transaction.** The ledger event and the
 * business change it describes commit together or not at all (planning 06 §3.3).
 * This service therefore never opens or commits a transaction of its own — it
 * writes on the EntityManager it was constructed with, which is the container's,
 * which is the one the caller's transaction is bound to.
 */
export class LedgerService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Appends one event to a tenant's chain and returns it.
   *
   * Serialisation is by advisory lock, held for the rest of the caller's
   * transaction. Without it, two concurrent appends could read the same head and
   * both claim `seq = n + 1`; with it they queue, and if the lock is ever
   * bypassed the unique constraint turns a forked chain into a failed write.
   */
  async append(input: LedgerAppendInput): Promise<LedgerEvent> {
    if (!input.tenantId) {
      // A chain needs a partition. Writing tenant-less events would put every
      // deployment's records on one contended chain and make "verify this
      // tenant's history" unanswerable.
      throw new Error('[internal] Ledger append requires a tenantId')
    }

    const [lockHigh, lockLow] = advisoryLockKeys(input.tenantId)
    const connection = this.em.getConnection()
    await connection.execute('select pg_advisory_xact_lock(?, ?)', [lockHigh, lockLow])

    const head = await this.em.getConnection().execute<Array<{ seq: string; hash: string }>>(
      'select seq::text as seq, hash from ledger_events where tenant_id = ? order by seq desc limit 1',
      [input.tenantId],
    )

    const previous = head[0] ?? null
    const seq = previous ? BigInt(previous.seq) + 1n : 1n
    const prevHash = previous ? previous.hash : null
    const ts = input.ts ?? new Date()
    const visibility: LedgerVisibility = input.visibility ?? 'tenant'
    const payload = (input.payload ?? {}) as CanonicalValue

    const hash = computeLedgerHash({
      v: LEDGER_HASH_VERSION,
      tenantId: input.tenantId,
      seq: Number(seq),
      prevHash,
      ts: ts.toISOString(),
      eventType: input.eventType,
      actorKind: input.actorKind ?? null,
      actorId: input.actorId ?? null,
      organizationId: input.organizationId ?? null,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
      visibility,
      payload,
    })

    const event = this.em.create(LedgerEvent, {
      tenantId: input.tenantId,
      seq: seq.toString(),
      prevHash,
      hash,
      hashVersion: LEDGER_HASH_VERSION,
      ts,
      eventType: input.eventType,
      actorKind: input.actorKind ?? null,
      actorId: input.actorId ?? null,
      organizationId: input.organizationId ?? null,
      resourceKind: input.resourceKind ?? null,
      resourceId: input.resourceId ?? null,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
      visibility,
      payload: (input.payload ?? {}) as Record<string, unknown>,
      createdAt: new Date(),
    })

    await this.em.persist(event).flush()
    return event
  }

  /**
   * Walks a tenant's chain and reports the first position that does not verify.
   *
   * Stops at the first break by design: after a break every subsequent hash is
   * expected to disagree, and a report listing thousands of consequential
   * failures buries the one that matters.
   */
  async verifyTenantChain(tenantId: string, options?: { batchSize?: number }): Promise<LedgerVerificationResult> {
    const batchSize = options?.batchSize ?? 500
    const connection = this.em.getConnection()

    let checked = 0
    let expectedSeq = 1n
    let expectedPrevHash: string | null = null
    let afterSeq = 0n

    for (;;) {
      const rows = await connection.execute<Array<{
        seq: string
        prev_hash: string | null
        hash: string
        hash_version: number
        ts: Date
        event_type: string
        actor_kind: string | null
        actor_id: string | null
        organization_id: string | null
        correlation_id: string | null
        causation_id: string | null
        visibility: string
        payload: Record<string, unknown>
      }>>(
        `select seq::text as seq, prev_hash, hash, hash_version, ts, event_type, actor_kind, actor_id,
                organization_id, correlation_id, causation_id, visibility, payload
           from ledger_events
          where tenant_id = ? and seq > ?
          order by seq asc
          limit ?`,
        [tenantId, afterSeq.toString(), batchSize],
      )

      if (rows.length === 0) break

      for (const row of rows) {
        const seq = BigInt(row.seq)

        if (seq !== expectedSeq) {
          return {
            ok: false,
            tenantId,
            checked,
            brokenAtSeq: row.seq,
            reason: `Sequence gap: expected ${expectedSeq}, found ${seq}. An event was deleted, or one was never written.`,
          }
        }

        if (row.prev_hash !== expectedPrevHash) {
          return {
            ok: false,
            tenantId,
            checked,
            brokenAtSeq: row.seq,
            reason: 'Predecessor hash does not match the previous event — the chain was re-linked.',
          }
        }

        if (row.hash_version !== LEDGER_HASH_VERSION) {
          return {
            ok: false,
            tenantId,
            checked,
            brokenAtSeq: row.seq,
            reason: `Unknown hash version ${row.hash_version}; this build verifies version ${LEDGER_HASH_VERSION}.`,
          }
        }

        const recomputed = computeLedgerHash({
          v: LEDGER_HASH_VERSION,
          tenantId,
          seq: Number(seq),
          prevHash: row.prev_hash,
          ts: new Date(row.ts).toISOString(),
          eventType: row.event_type,
          actorKind: row.actor_kind,
          actorId: row.actor_id,
          organizationId: row.organization_id,
          correlationId: row.correlation_id,
          causationId: row.causation_id,
          visibility: row.visibility,
          payload: (row.payload ?? {}) as CanonicalValue,
        })

        if (recomputed !== row.hash) {
          return {
            ok: false,
            tenantId,
            checked,
            brokenAtSeq: row.seq,
            reason: 'Stored hash does not match the event content — this row was modified after it was written.',
          }
        }

        checked += 1
        expectedSeq = seq + 1n
        expectedPrevHash = row.hash
        afterSeq = seq
      }
    }

    return { ok: true, tenantId, checked, brokenAtSeq: null, reason: null }
  }

  /** Every tenant that has at least one event, oldest chain first. */
  async listTenantsWithEvents(): Promise<string[]> {
    const rows = await this.em.getConnection().execute<Array<{ tenant_id: string }>>(
      'select distinct tenant_id from ledger_events order by tenant_id',
    )
    return rows.map((row) => row.tenant_id)
  }
}

/**
 * Appends to the ledger without letting a ledger problem take down a write that
 * has no ledger to write to.
 *
 * The distinction mirrors the journal's: a **missing** service is legitimate (a
 * downstream app may run without `audit_logs`), a **failing** append is not and
 * propagates so the caller's transaction rolls back.
 */
export async function appendLedgerEvent(
  container: { resolve: (name: string) => unknown },
  input: LedgerAppendInput,
): Promise<LedgerEvent | null> {
  let service: LedgerService | null = null
  try {
    service = container.resolve('ledgerService') as LedgerService
  } catch {
    service = null
  }
  if (!service || typeof service.append !== 'function') {
    logger.debug('Ledger service unavailable; skipping append', { eventType: input.eventType })
    return null
  }
  return service.append(input)
}
