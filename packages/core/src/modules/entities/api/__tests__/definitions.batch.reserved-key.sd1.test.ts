/** @jest-environment node */
/**
 * SD-1 (CC-18) — the batch route hands its keys to the key guards.
 *
 * **The defect this proves fixed.** The batch endpoint
 * (`api/definitions.batch.ts`) upserts a whole definition set under
 * `operation: 'custom'` (the registry maps that to `'update'`) and used to send
 * the guards only `{ entityId, definitionCount }`. The two key guards
 * (`entities.field_definition.no-reserved-key`, `…key-shape`) read a single
 * `payload.key`, found none, and passed — so a batch could define a field on a
 * system column (`id`, `created_at`, …) or with a malformed key, while the
 * single route refused the identical field with 422. Measured before the fix:
 * the batch payload yielded `{ ok: true }`; the same reserved key through a
 * create yielded 422.
 *
 * **What this suite does that the guard unit suite cannot.** It goes through the
 * batch ROUTE — its real guard payload, its real registry wrapper
 * (`runRouteMutationGuards` via `beginEntitiesMutationGuard`) — with the real
 * guards registered, and asserts the route refuses with 422 and writes nothing.
 * A guard suite alone would still pass if the route forgot to name its keys;
 * this suite fails in that case, which is the point.
 */
import { POST } from '../definitions.batch'
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import { guards as entitiesGuards } from '../../data/guards'

type Where = Record<string, unknown>

const mockEm = {
  begin: jest.fn(async () => {}),
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
  find: jest.fn(async (_entity: unknown, _where: Where) => [] as unknown[]),
  findOne: jest.fn(async () => null),
  create: jest.fn((_entity: unknown, data: Where) => ({ ...data })),
  persist: jest.fn(),
  flush: jest.fn(async () => {}),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (key: string) => {
      if (key === 'em') return mockEm
      if (key === 'cache') throw new Error('no cache')
      return null
    },
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: async () => ({ sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1', roles: ['admin'] }),
}))

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
  applyStructureChangeGrant: jest.fn(async () => null),
}))

function request(body: unknown): Request {
  return new Request('http://localhost/api/entities/definitions/batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEm.find.mockResolvedValue([] as unknown[])
  // The real guards, in the real store: what the running app registers.
  registerMutationGuards([{ moduleId: 'entities', guards: entitiesGuards }])
})

describe('entities/definitions.batch POST — SD-1 (CC-18) the batch names its keys', () => {
  it('refuses a batch that defines a reserved system-column key (422, nothing persisted)', async () => {
    const res = await POST(request({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }, { key: 'id', kind: 'text' }],
    }))

    expect(res.status).toBe(422)
    expect(JSON.stringify(await res.json())).toContain('system column')
    // The whole batch is refused before a single row is created — not a partial save.
    expect(mockEm.create).not.toHaveBeenCalled()
    expect(mockEm.commit).not.toHaveBeenCalled()
    expect(mockEm.begin).not.toHaveBeenCalled()
  })

  it('refuses a malformed key at the schema (400) — zod closes that half before the guard', async () => {
    // The key-shape rule is enforced by `upsertCustomFieldDefSchema` (the batch's own
    // `definitions` array uses it, minus `entityId`), so a malformed key never reaches
    // the guard: the route returns 400 from its own parse. The reserved-key rule has no
    // schema equivalent (`id` is valid snake_case), which is exactly why CC-18's hole was
    // the reserved key. Both are pinned — the guard half in `guards.sd1.test.ts`.
    const res = await POST(request({
      entityId: 'test:entity',
      definitions: [{ key: 'Bad-Key', kind: 'text' }],
    }))

    expect(res.status).toBe(400)
    expect(mockEm.create).not.toHaveBeenCalled()
  })

  it('still accepts a batch whose keys are all well-formed', async () => {
    const res = await POST(request({
      entityId: 'test:entity',
      definitions: [{ key: 'alpha', kind: 'text' }, { key: 'beta_2', kind: 'integer' }],
    }))

    expect(res.status).toBe(200)
    expect(mockEm.commit).toHaveBeenCalledTimes(1)
  })
})
