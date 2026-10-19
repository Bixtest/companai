/**
 * CC-127 — the two repository verbs the departure cascade needed.
 *
 * `listForPrincipals` / `revokeForPrincipals` exist because a person leaves a
 * **tenant**, not an organization: the per-principal reads and `revoke` narrow
 * to `organizationId`, so a cascade built on them would report success while a
 * binding in a second organization of the same tenant survived. These tests hold
 * that difference down, plus the two things a bulk soft-delete must never do —
 * touch another tenant, or report a row it did not change.
 */
const findWithDecryptionMock = jest.fn()

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findWithDecryption: (...args: unknown[]) => findWithDecryptionMock(...args),
  findOneWithDecryption: (...args: unknown[]) => findWithDecryptionMock(...args),
}))

import { AiAgentBindingRepository } from '../AiAgentBindingRepository'
import { AiAgentBinding } from '../../entities'

type Row = {
  id: string
  tenantId: string
  organizationId: string | null
  principalId: string
  agentId: string
  deletedAt: Date | null
  updatedAt: Date
}

const TENANT = 'tenant-1'
const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4111-8111-222222222222'

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: TENANT,
    organizationId: 'org-1',
    principalId: P1,
    agentId: 'sales.assistant',
    deletedAt: null,
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  }
}

/**
 * The entity manager the repository actually talks to: `find` returns what the
 * store holds for the filter, `transactional` runs the callback against the same
 * object, and the decryption helper is a pass-through.
 */
function mockEm(rows: Row[]) {
  const em: any = {
    find: jest.fn(async (_entity: unknown, where: any) => {
      return rows.filter((row) => {
        if (where.tenantId !== undefined && row.tenantId !== where.tenantId) return false
        if (where.organizationId !== undefined && row.organizationId !== where.organizationId) return false
        if (where.deletedAt === null && row.deletedAt !== null) return false
        if (where.principalId?.$in) {
          if (!where.principalId.$in.includes(row.principalId)) return false
        } else if (where.principalId !== undefined && row.principalId !== where.principalId) {
          return false
        }
        return true
      })
    }),
    persist: jest.fn(() => em),
    flush: jest.fn(async () => undefined),
    transactional: jest.fn(async (fn: (tx: any) => Promise<unknown>) => fn(em)),
  }
  return em
}

describe('CC-127 — AiAgentBindingRepository tenant-wide verbs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    findWithDecryptionMock.mockImplementation(async (_em, _entity, where) => {
      const rows = await _em.find(_entity, where)
      return rows
    })
  })

  describe('listForPrincipals', () => {
    it('returns bindings for several principals across organizations of the tenant', async () => {
      const rows = [
        makeRow({ principalId: P1, organizationId: 'org-1', agentId: 'sales.assistant' }),
        makeRow({ principalId: P2, organizationId: 'org-2', agentId: 'ops.assistant' }),
      ]
      const repo = new AiAgentBindingRepository(mockEm(rows))

      const found = await repo.listForPrincipals([P1, P2], { tenantId: TENANT })

      expect(found.map((row) => row.agentId)).toEqual(['sales.assistant', 'ops.assistant'])
      // The point of the method: no organization narrowing. The same call built
      // on `listForPrincipal` would have returned one row.
      expect(found).toHaveLength(2)
    })

    it('excludes soft-deleted rows', async () => {
      const rows = [makeRow({ deletedAt: new Date() })]
      const repo = new AiAgentBindingRepository(mockEm(rows))
      await expect(repo.listForPrincipals([P1], { tenantId: TENANT })).resolves.toEqual([])
    })

    it('excludes another tenant\'s rows', async () => {
      const rows = [makeRow({ tenantId: 'tenant-OTHER' })]
      const repo = new AiAgentBindingRepository(mockEm(rows))
      await expect(repo.listForPrincipals([P1], { tenantId: TENANT })).resolves.toEqual([])
    })

    it('returns nothing for an empty principal list without querying', async () => {
      const em = mockEm([makeRow()])
      const repo = new AiAgentBindingRepository(em)
      await expect(repo.listForPrincipals([], { tenantId: TENANT })).resolves.toEqual([])
      expect(findWithDecryptionMock).not.toHaveBeenCalled()
    })

    it('de-duplicates the principal list before querying', async () => {
      const em = mockEm([makeRow()])
      const repo = new AiAgentBindingRepository(em)
      await repo.listForPrincipals([P1, P1, ' '], { tenantId: TENANT })
      expect(em.find.mock.calls[0][1].principalId.$in).toEqual([P1])
    })
  })

  describe('revokeForPrincipals', () => {
    it('revokes every live binding of these principals, across organizations', async () => {
      const a = makeRow({ principalId: P1, organizationId: 'org-1', agentId: 'sales.assistant' })
      const b = makeRow({ principalId: P2, organizationId: 'org-2', agentId: 'ops.assistant' })
      const repo = new AiAgentBindingRepository(mockEm([a, b]))

      const revoked = await repo.revokeForPrincipals([P1, P2], { tenantId: TENANT })

      expect(revoked).toEqual([
        { principalId: P1, agentId: 'sales.assistant', organizationId: 'org-1' },
        { principalId: P2, agentId: 'ops.assistant', organizationId: 'org-2' },
      ])
      expect(a.deletedAt).toBeInstanceOf(Date)
      expect(b.deletedAt).toBeInstanceOf(Date)
    })

    it('never reports a row it did not change — already-revoked rows are not returned', async () => {
      const live = makeRow({ agentId: 'sales.assistant' })
      const dead = makeRow({ agentId: 'ops.assistant', deletedAt: new Date('2026-09-01T00:00:00Z') })
      const repo = new AiAgentBindingRepository(mockEm([live, dead]))

      const revoked = await repo.revokeForPrincipals([P1], { tenantId: TENANT })

      expect(revoked).toHaveLength(1)
      expect(revoked[0].agentId).toBe('sales.assistant')
    })

    it('leaves another tenant\'s binding alone', async () => {
      const other = makeRow({ tenantId: 'tenant-OTHER' })
      const repo = new AiAgentBindingRepository(mockEm([other]))

      const revoked = await repo.revokeForPrincipals([P1], { tenantId: TENANT })

      expect(revoked).toEqual([])
      expect(other.deletedAt).toBeNull()
    })

    it('leaves another principal\'s binding alone', async () => {
      const stranger = makeRow({ principalId: '99999999-9999-4999-8999-999999999999' })
      const repo = new AiAgentBindingRepository(mockEm([stranger]))

      const revoked = await repo.revokeForPrincipals([P1], { tenantId: TENANT })

      expect(revoked).toEqual([])
      expect(stranger.deletedAt).toBeNull()
    })

    it('is a no-op for an empty principal list', async () => {
      const em = mockEm([makeRow()])
      const repo = new AiAgentBindingRepository(em)
      await expect(repo.revokeForPrincipals([], { tenantId: TENANT })).resolves.toEqual([])
      expect(em.transactional).not.toHaveBeenCalled()
    })
  })
})
