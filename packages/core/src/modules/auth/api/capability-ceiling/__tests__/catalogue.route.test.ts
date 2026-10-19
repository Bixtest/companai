/** @jest-environment node */
import { GET, metadata } from '@open-mercato/core/modules/auth/api/capability-ceiling/catalogue/route'

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(),
}))

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  getModules: jest.fn(),
}))

import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { getModules } from '@open-mercato/shared/lib/i18n/server'

const mockGetAuth = getAuthFromRequest as jest.Mock
const mockGetModules = getModules as jest.Mock

/**
 * `CC-139` — the catalogue the ceiling screen picks from.
 *
 * **The gate is the point of this route**, so it is asserted twice: on the exported `metadata` (the thing
 * the dispatcher reads) and in the sentence the test name carries. If this route were ever re-gated on
 * `auth.acl.manage` — the ACL editor's capability — a tenant administrator who may narrow **their own**
 * ceiling and holds nothing else would get an empty tree and no explanation. That is `CC-134`'s lesson
 * applied forward: do not let a permission arrive through `*` by assumption.
 */
function makeReq() {
  return new Request('http://localhost/api/auth/capability-ceiling/catalogue')
}

describe('GET /api/auth/capability-ceiling/catalogue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAuth.mockResolvedValue({ sub: 'u1', tenantId: 't1', orgId: 'o1' })
    mockGetModules.mockReturnValue([
      {
        id: 'auth',
        info: { title: 'Auth' },
        features: [
          { id: 'auth.users.list', title: 'List users', module: 'auth' },
          { id: 'auth.users.edit', title: 'Edit users', module: 'auth' },
        ],
      },
      {
        id: 'directory',
        info: { title: 'Directory' },
        features: [{ id: 'directory.tenants.manage', title: 'Manage tenants', module: 'directory' }],
      },
    ])
  })

  it('★ is gated by the capability that lets you SET the ceiling, not the one that edits one role', () => {
    expect(metadata.GET.requireFeatures).toEqual(['directory.tenants.manage'])
    expect(metadata.GET.requireAuth).toBe(true)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockResolvedValue(null)
    const response = await GET(makeReq())
    expect(response.status).toBe(401)
  })

  it('returns the { items, modules } shape the picker consumes, sorted by module then id', async () => {
    const response = await GET(makeReq())
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.items.map((item: { id: string }) => item.id)).toEqual([
      'auth.users.edit',
      'auth.users.list',
      'directory.tenants.manage',
    ])
    expect(body.modules).toEqual([
      { id: 'auth', title: 'Auth' },
      { id: 'directory', title: 'Directory' },
    ])
  })

  it('deduplicates a capability declared twice, keeping the first', async () => {
    mockGetModules.mockReturnValue([
      { id: 'auth', info: { title: 'Auth' }, features: [{ id: 'auth.users.list', title: 'First', module: 'auth' }] },
      { id: 'auth2', info: { title: 'Auth again' }, features: [{ id: 'auth.users.list', title: 'Second', module: 'auth' }] },
    ])
    const body = await (await GET(makeReq())).json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].title).toBe('First')
  })

  it('emits a module heading for a capability whose module declares no info block', async () => {
    // Without this the picker silently drops the group: the capability exists and has no heading, so a
    // reader concludes it cannot be granted.
    mockGetModules.mockReturnValue([
      { id: 'ghost', features: [{ id: 'ghost.thing.view', title: 'Thing', module: 'ghost' }] },
    ])
    const body = await (await GET(makeReq())).json()
    expect(body.modules).toEqual([{ id: 'ghost', title: 'ghost' }])
  })

  it('does not carry tenant-scoped synthesized entity features', async () => {
    // `/api/auth/features` appends those. The platform ceiling is above every tenant, so a synthesized
    // entity id in it would be a category error written into a security control. This route has no import
    // of `synthesizeRestrictedEntityFeatures` at all, which is the strongest form of "it cannot".
    mockGetModules.mockReturnValue([
      { id: 'auth', info: { title: 'Auth' }, features: [{ id: 'auth.users.list', title: 'List', module: 'auth' }] },
    ])
    const body = await (await GET(makeReq())).json()
    expect(body.items.every((item: { module: string }) => item.module === 'auth')).toBe(true)
  })
})
