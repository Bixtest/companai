/**
 * R3 — the chain links, and a rewritten row is detected.
 *
 * The database enforces append-only with a trigger; that is verified against a
 * real Postgres in the integration suite. What is verified here is the part that
 * lives in code: that each event points at its predecessor, that the hash covers
 * the content, and that verification names the first break rather than drowning
 * the reader in every consequential one.
 */

import type { EntityManager } from '@mikro-orm/postgresql'
import { LedgerService } from '../ledgerService'
import { LEDGER_HASH_VERSION, computeLedgerHash } from '@open-mercato/shared/lib/ledger/canonical'

type StoredRow = {
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
}

/**
 * A stand-in for the tenant's chain: an ordered list of rows plus the two
 * queries the service issues against it. Enough to exercise linking and
 * verification without a database, and deliberately not enough to fake the
 * append-only trigger — that guarantee belongs to Postgres and is tested there.
 */
function createFakeChain() {
  const rows: StoredRow[] = []
  const advisoryLocks: Array<[number, number]> = []

  const executeCalls: Array<{ sql: string; ctx: unknown }> = []
  const execute = jest.fn(async (sql: string, params: unknown[] = [], _method?: string, ctx?: unknown) => {
    executeCalls.push({ sql, ctx })
    if (sql.includes('pg_advisory_xact_lock')) {
      advisoryLocks.push([params[0] as number, params[1] as number])
      return []
    }
    if (sql.includes('order by seq desc limit 1')) {
      const last = rows[rows.length - 1]
      return last ? [{ seq_text: last.seq, hash: last.hash }] : []
    }
    if (sql.includes('order by seq asc')) {
      const afterSeq = BigInt(String(params[1]))
      const limit = Number(params[2])
      return rows
        .filter((row) => BigInt(row.seq) > afterSeq)
        .slice(0, limit)
        .map((row) => ({ ...row, seq_text: row.seq }))
    }
    if (sql.includes('select distinct tenant_id')) {
      return [{ tenant_id: 'tenant-1' }]
    }
    throw new Error(`[internal] unexpected sql: ${sql}`)
  })

  const em = {
    getConnection: () => ({ execute }),
    // The transaction the caller opened. Both the advisory lock and the head
    // read must run on it — see below.
    getTransactionContext: () => TRANSACTION,
    create: (_entity: unknown, data: Record<string, unknown>) => ({ ...data }),
    persist: (entity: Record<string, unknown>) => ({
      flush: async () => {
        rows.push({
          seq: String(entity.seq),
          prev_hash: (entity.prevHash as string | null) ?? null,
          hash: entity.hash as string,
          hash_version: entity.hashVersion as number,
          ts: entity.ts as Date,
          event_type: entity.eventType as string,
          actor_kind: (entity.actorKind as string | null) ?? null,
          actor_id: (entity.actorId as string | null) ?? null,
          organization_id: (entity.organizationId as string | null) ?? null,
          correlation_id: (entity.correlationId as string | null) ?? null,
          causation_id: (entity.causationId as string | null) ?? null,
          visibility: entity.visibility as string,
          payload: (entity.payload as Record<string, unknown>) ?? {},
        })
      },
    }),
  } as unknown as EntityManager

  return { em, rows, advisoryLocks, execute, executeCalls }
}

/** Stands in for the caller's open transaction. */
const TRANSACTION = { id: 'trx-1' }

const appendOne = (service: LedgerService, eventType: string, payload: Record<string, string> = {}) =>
  service.append({
    tenantId: 'tenant-1',
    eventType,
    actorKind: 'human',
    actorId: 'user-1',
    organizationId: 'org-1',
    payload,
    ts: new Date('2026-08-09T10:00:00.000Z'),
  })

describe('LedgerService.append', () => {
  it('starts a tenant chain at sequence 1 with no predecessor', async () => {
    const chain = createFakeChain()
    const event = await appendOne(new LedgerService(chain.em), 'api_keys.key.created')

    expect(event.seq).toBe('1')
    expect(event.prevHash).toBeNull()
    expect(event.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('links each event to the one before it', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)

    const first = await appendOne(service, 'api_keys.key.created')
    const second = await appendOne(service, 'api_keys.key.deleted')
    const third = await appendOne(service, 'inbox_ops.settings.updated')

    expect(second.prevHash).toBe(first.hash)
    expect(third.prevHash).toBe(second.hash)
    expect([first.seq, second.seq, third.seq]).toEqual(['1', '2', '3'])
  })

  it('never aliases the sequence column to its own name', async () => {
    // `select seq::text as seq ... order by seq desc` makes PostgreSQL order by
    // the *text* output column: '9' beats '10'. That computed a head behind the
    // real one, the next append claimed a position that already existed, and an
    // ordinary write returned 500. The same alias made the verifier report an
    // intact chain as broken.
    //
    // A string assertion, deliberately: the defect is in the SQL text and
    // invisible to any fake connection, because the fake does the ordering.
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'a')
    await service.verifyTenantChain('tenant-1')

    for (const call of chain.executeCalls) {
      expect(call.sql).not.toMatch(/as seq/)
    }
  })

  it('locks and reads the head inside the caller transaction', async () => {
    // Without the transaction context, `getConnection().execute` may take a
    // different pooled connection: `pg_advisory_xact_lock` would then commit and
    // release immediately, serialising nothing. That produced a real duplicate
    // -key violation on `ledger_events_tenant_seq_uq` in ordinary use.
    const chain = createFakeChain()
    await appendOne(new LedgerService(chain.em), 'api_keys.key.created')

    const lockCall = chain.executeCalls.find((call) => call.sql.includes('pg_advisory_xact_lock'))
    const headCall = chain.executeCalls.find((call) => call.sql.includes('order by seq desc'))

    expect(lockCall?.ctx).toBe(TRANSACTION)
    expect(headCall?.ctx).toBe(TRANSACTION)
  })

  it('takes an advisory lock before reading the head, so two appends cannot claim one position', async () => {
    const chain = createFakeChain()
    await appendOne(new LedgerService(chain.em), 'api_keys.key.created')

    expect(chain.advisoryLocks).toHaveLength(1)
    const lockCall = chain.execute.mock.calls.findIndex(([sql]) => String(sql).includes('pg_advisory_xact_lock'))
    const headCall = chain.execute.mock.calls.findIndex(([sql]) => String(sql).includes('order by seq desc'))
    expect(lockCall).toBeLessThan(headCall)
  })

  it('uses the same lock key for a tenant and a different one for another', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'a')
    await service.append({ tenantId: 'tenant-2', eventType: 'b' })
    await appendOne(service, 'c')

    const [first, second, third] = chain.advisoryLocks
    expect(first).toEqual(third)
    expect(first).not.toEqual(second)
  })

  it('refuses to append without a tenant, because a chain needs a partition', async () => {
    const chain = createFakeChain()
    await expect(new LedgerService(chain.em).append({ tenantId: '', eventType: 'x' }))
      .rejects.toThrow(/requires a tenantId/)
  })

  it('defaults visibility to tenant rather than leaving it unset', async () => {
    const chain = createFakeChain()
    const event = await appendOne(new LedgerService(chain.em), 'x')
    expect(event.visibility).toBe('tenant')
  })
})

describe('LedgerService.verifyTenantChain', () => {
  it('accepts a chain it wrote itself', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'one')
    await appendOne(service, 'two')
    await appendOne(service, 'three')

    const result = await service.verifyTenantChain('tenant-1')

    expect(result).toMatchObject({ ok: true, checked: 3, brokenAtSeq: null, reason: null })
  })

  it('accepts an empty chain — nothing written is not the same as something broken', async () => {
    const chain = createFakeChain()
    const result = await new LedgerService(chain.em).verifyTenantChain('tenant-1')
    expect(result).toMatchObject({ ok: true, checked: 0 })
  })

  it('detects a rewritten event', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'one')
    await appendOne(service, 'two')
    await appendOne(service, 'three')

    // Somebody edited the middle row directly in the database — the scenario the
    // whole batch exists to make detectable.
    chain.rows[1].event_type = 'something.else'

    const result = await service.verifyTenantChain('tenant-1')

    expect(result.ok).toBe(false)
    expect(result.brokenAtSeq).toBe('2')
    expect(result.reason).toMatch(/modified after it was written/)
  })

  it('detects a deleted event as a sequence gap', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'one')
    await appendOne(service, 'two')
    await appendOne(service, 'three')

    chain.rows.splice(1, 1)

    const result = await service.verifyTenantChain('tenant-1')

    expect(result.ok).toBe(false)
    expect(result.brokenAtSeq).toBe('3')
    expect(result.reason).toMatch(/Sequence gap/)
  })

  it('detects a re-linked chain even when each row hashes correctly on its own', async () => {
    // The subtle attack: recompute the row's own hash after editing it, so the
    // content matches — but the successor still points at the old hash.
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'one')
    await appendOne(service, 'two')

    const row = chain.rows[1]
    row.event_type = 'forged.event'
    row.hash = computeLedgerHash({
      v: LEDGER_HASH_VERSION,
      tenantId: 'tenant-1',
      seq: 2,
      prevHash: row.prev_hash,
      ts: new Date(row.ts).toISOString(),
      eventType: row.event_type,
      actorKind: row.actor_kind,
      actorId: row.actor_id,
      organizationId: row.organization_id,
      correlationId: row.correlation_id,
      causationId: row.causation_id,
      visibility: row.visibility,
      payload: row.payload as never,
    })

    // Row 2 now verifies in isolation. Append a third event pointing at the
    // ORIGINAL hash, as a real successor written before the forgery would.
    chain.rows.push({
      ...row,
      seq: '3',
      prev_hash: 'not-the-forged-hash',
      hash: 'irrelevant',
    })

    const result = await service.verifyTenantChain('tenant-1')

    expect(result.ok).toBe(false)
    expect(result.brokenAtSeq).toBe('3')
    expect(result.reason).toMatch(/re-linked/)
  })

  it('refuses to pass a chain written by a hash construction it does not know', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    await appendOne(service, 'one')
    chain.rows[0].hash_version = LEDGER_HASH_VERSION + 1

    const result = await service.verifyTenantChain('tenant-1')

    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/Unknown hash version/)
  })

  it('reports the first break only, not every consequence of it', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    for (const name of ['a', 'b', 'c', 'd', 'e']) await appendOne(service, name)

    chain.rows[1].event_type = 'tampered'

    const result = await service.verifyTenantChain('tenant-1')

    expect(result.brokenAtSeq).toBe('2')
    expect(result.checked).toBe(1)
  })

  it('walks chains longer than one batch', async () => {
    const chain = createFakeChain()
    const service = new LedgerService(chain.em)
    for (let i = 0; i < 12; i += 1) await appendOne(service, `event-${i}`)

    const result = await service.verifyTenantChain('tenant-1', { batchSize: 5 })

    expect(result).toMatchObject({ ok: true, checked: 12 })
  })
})
