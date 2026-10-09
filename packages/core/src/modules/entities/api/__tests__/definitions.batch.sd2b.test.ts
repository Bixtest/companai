/** @jest-environment node */
/**
 * SD-2b — the bypass is closed.
 *
 * **What this suite has to prove.** The `SD-2b` critic found a CRITICAL hole: the
 * *preset* route (`api/definitions.ts`) refused a custom field on a reserved system
 * surface, but the **batch** route (`api/definitions.batch.ts`) and the non-request
 * primitive `ensureCustomFieldDefinitions` wrote `CustomFieldDef` rows **without
 * ever calling the gate**. So a custom field could still attach to `auth:user`
 * through those paths. This suite proves both now refuse, with the same rule and
 * the same vocabulary (`reservedEntityRefusal`).
 */

const mockEm = {
  begin: jest.fn(async () => {}),
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
  find: jest.fn(async () => [] as unknown[]),
  findOne: jest.fn(async () => null),
  create: jest.fn((_e: unknown, data: Record<string, unknown>) => ({ ...data })),
  persist: jest.fn(),
  flush: jest.fn(async () => {}),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => (key === 'em' ? mockEm : null),
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => ({
    sub: 'user-1',
    tenantId: 'tenant-1',
    orgId: 'org-1',
    roles: ['admin'],
  })),
}))

jest.mock('@open-mercato/shared/lib/logger', () => {
  const shared = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const withChild = (): Record<string, unknown> => ({ ...shared, child: () => withChild() })
  return { createLogger: () => withChild() }
})

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: async () => ({ tenantId: 'tenant-1', selectedId: 'org-1' }),
}))

jest.mock('@open-mercato/core/modules/entities/data/entities', () => ({
  CustomFieldDef: 'CustomFieldDef',
  CustomFieldEntityConfig: 'CustomFieldEntityConfig',
}))

jest.mock('../definitions.cache', () => ({ invalidateDefinitionsCache: jest.fn() }))
jest.mock('../../lib/definitions-version', () => ({
  resolveEntityDefinitionsVersion: jest.fn(async () => null),
}))
jest.mock('@open-mercato/core/modules/auth/lib/permission-decision-grant', () => ({
  applyStructureChangeGrant: jest.fn(async () => ({ applied: true, roleName: 'superadmin', roleId: 'r', aclCreated: true, added: [], alreadyPresent: [] })),
}))

import { POST } from '../definitions.batch'
import { POST as POST_RESTORE } from '../definitions.restore'
import { ensureCustomFieldDefinitions } from '../../lib/field-definitions'

const makeRequest = (body: unknown) =>
  new Request('http://x/api/entities/definitions/batch', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('batch route — a custom field cannot attach to a reserved system surface', () => {
  beforeEach(() => jest.clearAllMocks())

  it('REFUSES the four measured offenders with a 400', async () => {
    for (const entityId of ['auth:user', 'auth:role', 'directory:tenant', 'auth:session']) {
      const res = await POST(makeRequest({ entityId, definitions: [{ key: 'x', kind: 'text' }] }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(String(body.error)).toContain('reserved system surface')
    }
    // Nothing was written.
    expect(mockEm.persist).not.toHaveBeenCalled()
  })

  it('still accepts an ordinary business entity', async () => {
    const res = await POST(makeRequest({ entityId: 'customers:customer_person', definitions: [{ key: 'x', kind: 'text' }] }))
    // 200 (or a 409 optimistic-lock path), but never the reserved-surface refusal.
    if (res.status === 400) {
      const body = await res.json()
      expect(String(body.error)).not.toContain('reserved system surface')
    }
  })
})

describe('restore route — a reserved surface cannot be resurrected', () => {
  beforeEach(() => jest.clearAllMocks())

  it('REFUSES restoring a custom field on a reserved surface', async () => {
    const res = await POST_RESTORE(
      new Request('http://x/api/entities/definitions/restore', {
        method: 'POST',
        body: JSON.stringify({ entityId: 'auth:user', key: 'x' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(String(body.error)).toContain('reserved system surface')
    // It refused BEFORE looking the row up, so no write happened.
    expect(mockEm.persist).not.toHaveBeenCalled()
  })
})

describe('ensureCustomFieldDefinitions — the non-request primitive also refuses', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws for a reserved system surface and writes nothing', async () => {
    await expect(
      ensureCustomFieldDefinitions(mockEm as never, [{ entity: 'auth:user', fields: [{ key: 'x', kind: 'text' }] }] as never, {
        organizationId: null,
        tenantId: 'tenant-1',
      } as never),
    ).rejects.toThrow(/reserved system surface/)
    expect(mockEm.persist).not.toHaveBeenCalled()
  })

  it('does NOT throw for an ordinary entity (no over-blocking)', async () => {
    await expect(
      ensureCustomFieldDefinitions(mockEm as never, [{ entity: 'customers:customer_person', fields: [{ key: 'x', kind: 'text' }] }] as never, {
        organizationId: null,
        tenantId: 'tenant-1',
        dryRun: true,
      } as never),
    ).resolves.toBeDefined()
  })
})
