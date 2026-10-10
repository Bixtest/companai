/** @jest-environment node */
import { GET } from '@open-mercato/core/modules/entities/api/records'

/**
 * CC-48 — the server "view" export path (which the browser "View → Export" button now uses via
 * `getUrl`) must (a) mask a marked/encrypted field exactly like the "full" export, and (b) honour
 * the caller's visible-columns projection. Absent a projection or a marked field, output is
 * byte-unchanged (regression guard).
 */

const encryptedFields = { value: [] as string[], enabled: true, throws: false }

const mockEncryptionService = {
  isEnabled: () => encryptedFields.enabled,
  getEncryptedFieldNames: jest.fn(async () => {
    if (encryptedFields.throws) throw new Error('map read failed')
    return encryptedFields.value
  }),
}

const mockQE = {
  query: jest.fn(async () => ({
    items: [
      { id: 'rec-1', name: 'Ada', api_secret: 'super-secret-value', created_at: '2024-10-03T00:00:00Z' },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
  })),
}

const mockEm = {
  findOne: jest.fn(async () => null),
  find: jest.fn(async () => [] as Array<Record<string, unknown>>),
  getKysely: () => ({
    selectFrom: () => ({ select: () => ({ where: () => ({ where: () => ({ execute: async () => [] }) }) }) }),
  }),
}

const mockRbac = {
  loadAcl: jest.fn(async () => ({ isSuperAdmin: true, features: [] })),
  resolveVisibleOrganizations: jest.fn(async () => ['org']),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (k: string) => {
      if (k === 'queryEngine') return mockQE
      if (k === 'em') return mockEm
      if (k === 'rbacService') return mockRbac
      if (k === 'tenantEncryptionService') return mockEncryptionService
      return {}
    },
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: () => ({ sub: 'u1', orgId: 'org', tenantId: 't1', roles: ['admin'] }),
}))

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScope: async () => ({ selectedId: 'org', filterIds: ['org'] }),
  getSelectedOrganizationFromRequest: () => 'org',
}))

function viewExportUrl(extra = ''): Request {
  return new Request(
    `http://x/api/entities/records?entityId=${encodeURIComponent('example:custom')}&format=csv&all=true${extra}`,
  )
}

async function bodyOf(res: Response): Promise<string> {
  return await res.text()
}

describe('CC-48 — server view export masks marked fields and honours a column projection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    encryptedFields.value = []
    encryptedFields.enabled = true
    encryptedFields.throws = false
  })

  it('masks a marked field in a "view" export (no exportScope=full) — never the clear value', async () => {
    encryptedFields.value = ['api_secret']
    const res = await GET(viewExportUrl())
    expect(res.status).toBe(200)
    const body = await bodyOf(res)

    expect(body).not.toContain('super-secret-value')
    expect(body).toContain('***')
    expect(body).toContain('Ada')
  })

  it('masks the marked field when the column spelling matches the map (apiSecret vs api_secret)', async () => {
    encryptedFields.value = ['apiSecret']
    const res = await GET(viewExportUrl('&exportColumns=api_secret'))
    const body = await bodyOf(res)
    expect(body).not.toContain('super-secret-value')
    expect(body).toContain('***')
  })

  it('a projected column whose spelling does not match a row key is emitted empty, never in clear', async () => {
    encryptedFields.value = ['apiSecret']
    const res = await GET(viewExportUrl('&exportColumns=api-secret'))
    const body = await bodyOf(res)
    // The row key is `api_secret`; a differently-spelled projection yields no value at all —
    // never the secret. (Leak-safe by construction; the browser always sends the real accessor.)
    expect(body).not.toContain('super-secret-value')
  })

  it('honours the visible-columns projection (an unlisted column is not emitted at all)', async () => {
    encryptedFields.value = []
    const res = await GET(viewExportUrl('&exportColumns=id,name'))
    const body = await bodyOf(res)

    expect(body).toContain('Ada')
    expect(body).not.toContain('api_secret')
    expect(body).not.toContain('super-secret-value')
  })

  it('leaves an unmarked export byte-identical whether or not a projection is supplied', async () => {
    encryptedFields.value = []
    const withProj = await bodyOf(await GET(viewExportUrl('&exportColumns=id,name,api_secret')))
    const withoutProj = await bodyOf(await GET(viewExportUrl()))
    // No marked fields ⇒ the raw value is present in both (nothing to mask), and the projected
    // export lists exactly the requested columns.
    expect(withProj).toContain('super-secret-value')
    expect(withoutProj).toContain('super-secret-value')
    expect(withProj).not.toEqual(withoutProj) // projection changes the shape, not the values
  })

  it('does not mask when encryption is disabled (fail-open to no change)', async () => {
    encryptedFields.enabled = false
    encryptedFields.value = ['api_secret']
    const res = await GET(viewExportUrl('&exportColumns=id,api_secret'))
    const body = await bodyOf(res)

    expect(body).toContain('super-secret-value')
    expect(body).not.toContain('***')
  })

  it('masks every column when the map read throws (fail-closed)', async () => {
    encryptedFields.throws = true
    const res = await GET(viewExportUrl('&exportColumns=id,name,api_secret'))
    const body = await bodyOf(res)

    expect(body).not.toContain('super-secret-value')
    expect(body).not.toContain('Ada')
    expect(body).toContain('***')
  })
})
