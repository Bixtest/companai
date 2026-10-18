/**
 * CC-126 — `AiAgentTypeRepository`, the tenant type's data layer.
 *
 * The rules under test are the ones the DB also enforces, memorized by the
 * repository so a caller gets a typed refusal instead of a constraint error:
 * one row per (tenant, key) **for all time** — a retired key is never
 * reusable — and every read and write carries a tenant. The unique index is
 * the backstop (proved on real Postgres by the SQL probe); these are the
 * front-door behaviours, including the cross-tenant isolation.
 */
import {
  AiAgentTypeKeyCollisionError,
  AiAgentTypeRepository,
} from '../AiAgentTypeRepository'
import { AiAgentType } from '../../entities'

// ---------------------------------------------------------------------------
// In-memory entity manager mock — mirrors the house pattern: `findOne`/`find`
// for the reads, `transactional(fn)` running the writes against the same store.
// ---------------------------------------------------------------------------
type Row = {
  id: string
  tenantId: string
  key: string
  bundle: Record<string, unknown>
  version: number
  status: string
  createdAt: Date
  updatedAt: Date
}

let idCounter = 0

const BUNDLE = {
  label: 'Billing assistant',
  description: 'Answers billing questions.',
  systemPrompt: 'You are a billing assistant.',
  allowedTools: ['invoices.list'],
}

function mockEm() {
  const store: Row[] = []

  function matchRow(row: Row, filter: Record<string, unknown>): boolean {
    for (const field of ['tenantId', 'key', 'status'] as const) {
      if (field in filter && row[field] !== filter[field]) return false
    }
    return true
  }

  const em: any = {
    findOne: async (_entity: unknown, where: any) => store.find((row) => matchRow(row, where)) ?? null,
    find: async (_entity: unknown, where: any) => store.filter((row) => matchRow(row, where)),
    persist: (row: Row) => {
      em.__pendingPersist = row
      return em
    },
    flush: async () => {
      if (em.__pendingPersist) {
        const existing = store.find((r) => r.id === em.__pendingPersist?.id)
        if (!existing) {
          store.push(em.__pendingPersist as Row)
        } else {
          Object.assign(existing, em.__pendingPersist)
        }
        em.__pendingPersist = null
      }
    },
    create: (_entity: unknown, data: any) => {
      idCounter += 1
      const row: Row = {
        id: `row-${idCounter}`,
        tenantId: data.tenantId,
        key: data.key,
        bundle: data.bundle ?? {},
        version: data.version ?? 1,
        status: data.status ?? 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      return row
    },
    transactional: async (fn: (tx: any) => Promise<unknown>) => fn(em),
    __pendingPersist: null as Row | null,
    __store: store,
  }

  return em
}

describe('AiAgentTypeRepository', () => {
  const ctx = { tenantId: 't1' }

  describe('reads', () => {
    it('findActiveByKey returns null without a key or a tenant', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      expect(await repo.findActiveByKey('', ctx)).toBeNull()
      expect(await repo.findActiveByKey('billing.assistant', { tenantId: '' })).toBeNull()
    })

    it('findActiveByKey resolves the live row — the resolution read', async () => {
      const em = mockEm()
      const repo = new AiAgentTypeRepository(em)
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      const row = await repo.findActiveByKey('billing.assistant', ctx)
      expect(row?.key).toBe('billing.assistant')
      expect(row?.status).toBe('active')
    })

    it('findActiveByKey resolves nothing for a retired row', async () => {
      const em = mockEm()
      const repo = new AiAgentTypeRepository(em)
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      await repo.retire('billing.assistant', ctx)
      expect(await repo.findActiveByKey('billing.assistant', ctx)).toBeNull()
    })

    it('findByKey sees the tombstone — the manage read', async () => {
      const em = mockEm()
      const repo = new AiAgentTypeRepository(em)
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      await repo.retire('billing.assistant', ctx)
      const row = await repo.findByKey('billing.assistant', ctx)
      expect(row?.status).toBe('retired')
    })

    it('listActive lists the live rows; list includes tombstones', async () => {
      const em = mockEm()
      const repo = new AiAgentTypeRepository(em)
      await repo.create({ key: 'a.live', bundle: BUNDLE }, ctx)
      await repo.create({ key: 'b.retired', bundle: BUNDLE }, ctx)
      await repo.retire('b.retired', ctx)

      const live = await repo.listActive(ctx)
      expect(live.map((r) => r.key)).toEqual(['a.live'])

      const all = await repo.list(ctx)
      expect(all.map((r) => r.key)).toEqual(['a.live', 'b.retired'])
    })

    it('never leaks across tenants — a second tenant holds nothing of the first', async () => {
      const em = mockEm()
      const repo = new AiAgentTypeRepository(em)
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: 'tenant-A' })

      expect(await repo.findActiveByKey('billing.assistant', { tenantId: 'tenant-B' })).toBeNull()
      expect(await repo.findByKey('billing.assistant', { tenantId: 'tenant-B' })).toBeNull()
      expect(await repo.listActive({ tenantId: 'tenant-B' })).toEqual([])
      expect(await repo.list({ tenantId: 'tenant-B' })).toEqual([])
      // The same key in a second tenant is a DIFFERENT type, not a collision.
      const row = await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: 'tenant-B' })
      expect(row.tenantId).toBe('tenant-B')
    })

    it('the same key coexists across tenants and updates do not cross either', async () => {
      const em = mockEm()
      const repo = new AiAgentTypeRepository(em)
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: 'tenant-A' })
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: 'tenant-B' })

      await repo.update('billing.assistant', { bundle: { ...BUNDLE, label: 'Edited in A' } }, { tenantId: 'tenant-A' })

      const a = await repo.findActiveByKey('billing.assistant', { tenantId: 'tenant-A' })
      const b = await repo.findActiveByKey('billing.assistant', { tenantId: 'tenant-B' })
      expect(a?.bundle.label).toBe('Edited in A')
      expect(a?.version).toBe(2)
      expect(b?.bundle.label).toBe('Billing assistant')
      expect(b?.version).toBe(1)
    })
  })

  describe('create', () => {
    it('writes version 1, active, tenant-scoped', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      const row = await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      expect(row.version).toBe(1)
      expect(row.status).toBe('active')
      expect(row.tenantId).toBe('t1')
    })

    it('refuses a taken key with the typed collision error', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      await expect(
        repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx),
      ).rejects.toBeInstanceOf(AiAgentTypeKeyCollisionError)
    })

    it('refuses a RETIRED key too — the key is never reusable', async () => {
      // The row the unique index makes impossible: a binding written for the
      // old definition can never silently re-point at a new one.
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      await repo.retire('billing.assistant', ctx)
      await expect(
        repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx),
      ).rejects.toBeInstanceOf(AiAgentTypeKeyCollisionError)
    })

    it('refuses to write without a tenant or without a key', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await expect(repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: '' })).rejects.toThrow(
        /requires tenantId/,
      )
      await expect(repo.create({ key: '', bundle: BUNDLE }, ctx)).rejects.toThrow(/requires key/)
    })
  })

  describe('update', () => {
    it('bumps the version in place', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      const updated = await repo.update('billing.assistant', { bundle: { ...BUNDLE, label: 'v2' } }, ctx)
      expect(updated?.version).toBe(2)
      expect(updated?.bundle.label).toBe('v2')
      // one row per key for all time — the edit did not spawn a second row
      expect((await repo.list(ctx)).length).toBe(1)
    })

    it('returns null for a retired row — retirement is one-way', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      await repo.retire('billing.assistant', ctx)
      expect(await repo.update('billing.assistant', { bundle: BUNDLE }, ctx)).toBeNull()
    })

    it('returns null for an unknown key, a missing tenant, or a foreign tenant', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: 'tenant-A' })
      expect(await repo.update('nope.nope', { bundle: BUNDLE }, ctx)).toBeNull()
      expect(await repo.update('billing.assistant', { bundle: BUNDLE }, { tenantId: '' })).toBeNull()
      expect(await repo.update('billing.assistant', { bundle: BUNDLE }, ctx)).toBeNull()
    })
  })

  describe('retire', () => {
    it('retires a live row and reports it', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      expect(await repo.retire('billing.assistant', ctx)).toBe(true)
      const row = await repo.findByKey('billing.assistant', ctx)
      expect(row?.status).toBe('retired')
    })

    it('reports false for an already-retired row — the caller maps it to idempotent', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, ctx)
      expect(await repo.retire('billing.assistant', ctx)).toBe(true)
      expect(await repo.retire('billing.assistant', ctx)).toBe(false)
    })

    it('reports false for an unknown key or a foreign tenant — never a silent success', async () => {
      const repo = new AiAgentTypeRepository(mockEm())
      await repo.create({ key: 'billing.assistant', bundle: BUNDLE }, { tenantId: 'tenant-A' })
      expect(await repo.retire('billing.assistant', ctx)).toBe(false)
      expect(await repo.retire('nope.nope', ctx)).toBe(false)
      // tenant-A's row is untouched by tenant-B's attempt
      expect((await repo.findByKey('billing.assistant', { tenantId: 'tenant-A' }))?.status).toBe('active')
    })
  })
})
