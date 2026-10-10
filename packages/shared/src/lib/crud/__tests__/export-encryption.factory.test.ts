/**
 * CC-45 — a marked (encrypted) field must never leave in an export in clear.
 *
 * End-to-end through the real CRUD factory list/export handler: the entity declares a marked
 * field, and the export of any supported format must redact it while leaving unmarked columns
 * byte-identical. Also pins the fail-safe: with encryption disabled the export must be unchanged.
 */
jest.mock('@open-mercato/cache', () => ({
  runWithCacheTenant: async (_tenantId: string | null, fn: () => Promise<unknown>) => fn(),
}), { virtual: true })

import { makeCrudRoute } from '@open-mercato/shared/lib/crud/factory'
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import { registerApiInterceptors } from '@open-mercato/shared/lib/crud/interceptor-registry'
import { MASKED_EXPORT_VALUE } from '@open-mercato/shared/lib/crud/export-encryption'
import { z } from 'zod'

jest.mock('@open-mercato/shared/lib/crud/custom-fields', () => {
  const actual = jest.requireActual('@open-mercato/shared/lib/crud/custom-fields')
  return { ...actual, loadCustomFieldDefinitionIndex: jest.fn(async () => new Map()) }
})

const tenantId = '123e4567-e89b-12d3-a456-426614174000'
const organizationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

// The entity's marked field, as the encryption map would report it (snake_case on purpose, to
// prove the candidate-expansion matches a camelCase export column).
let markedFields: string[] = ['apiSecret']
let encryptionEnabled = true
let mapThrows = false

const encryptionService = {
  isEnabled: () => encryptionEnabled,
  getEncryptedFieldNames: async () => {
    if (mapThrows) throw new Error('map read failed')
    return markedFields
  },
}

const em = {
  transactional: async (cb: () => any) => cb(),
  getRepository: () => ({ find: async () => [], findOne: async () => null }),
}

const queryEngine = {
  query: jest.fn(async () => ({
    items: [
      { id: 'id-1', name: 'Acme', apiSecret: 'super-secret-value', organization_id: organizationId, tenant_id: tenantId },
    ],
    total: 1,
  })),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: async () => ({
    resolve: (name: string) => ({
      em,
      queryEngine,
      eventBus: { emitEvent: jest.fn() },
      dataEngine: {},
      accessLogService: { log: jest.fn(async () => {}) },
      commandBus: { execute: jest.fn(async () => ({ result: {}, logEntry: { id: 'l1' } })) },
      tenantEncryptionService: encryptionService,
    } as any)[name],
  }),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => {
  // Literals inlined: `jest.mock` factories are hoisted above module-level `const`s.
  const auth = {
    sub: 'u1',
    orgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
    roles: ['admin'],
  }
  return { getAuthFromCookies: async () => auth, getAuthFromRequest: async () => auth }
})

jest.mock('@open-mercato/core/modules/directory/utils/organizationScope', () => ({
  resolveOrganizationScopeForRequest: jest.fn(async () => ({
    selectedId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    filterIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    allowedIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    tenantId: '123e4567-e89b-12d3-a456-426614174000',
  })),
}))

jest.mock('@open-mercato/core/modules/entities/lib/helpers', () => ({
  setRecordCustomFields: jest.fn(async () => {}),
}))

class Widget {}

const querySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(50),
  sortField: z.string().default('id'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
  format: z.enum(['csv', 'json', 'xml', 'markdown']).optional(),
})

const route = makeCrudRoute({
  metadata: { GET: { requireAuth: true } },
  orm: { entity: Widget, idField: 'id', orgField: 'organizationId', tenantField: 'tenantId', softDeleteField: 'deletedAt' },
  events: { module: 'example', entity: 'widget', persistent: true },
  indexer: { entityType: 'example.widget' },
  list: {
    schema: querySchema,
    entityId: 'example.widget',
    fields: ['id', 'name', 'apiSecret'],
    sortFieldMap: { id: 'id', name: 'name' },
    buildFilters: () => ({} as any),
    transformItem: (i: any) => ({ id: i.id, name: i.name, apiSecret: i.apiSecret }),
    allowCsv: true,
    csv: { headers: ['id', 'name', 'apiSecret'], row: (w: any) => [w.id, w.name, w.apiSecret], filename: 'widgets.csv' },
  },
} as any)

// Same entity, but the CSV header for the secret is spelled the way a hand-written config or a
// human-facing title would be — this is the D2 shape that used to silently miss the mask.
const kebabRoute = makeCrudRoute({
  metadata: { GET: { requireAuth: true } },
  orm: { entity: Widget, idField: 'id', orgField: 'organizationId', tenantField: 'tenantId', softDeleteField: 'deletedAt' },
  events: { module: 'example', entity: 'widget', persistent: true },
  indexer: { entityType: 'example.widget' },
  list: {
    schema: querySchema,
    entityId: 'example.widget',
    fields: ['id', 'name', 'apiSecret'],
    sortFieldMap: { id: 'id', name: 'name' },
    buildFilters: () => ({} as any),
    transformItem: (i: any) => ({ id: i.id, name: i.name, apiSecret: i.apiSecret }),
    allowCsv: true,
    csv: { headers: ['id', 'name', 'Api Secret'], row: (w: any) => [w.id, w.name, w.apiSecret], filename: 'widgets.csv' },
  },
} as any)

beforeEach(() => {
  jest.clearAllMocks()
  markedFields = ['apiSecret']
  encryptionEnabled = true
  mapThrows = false
  registerMutationGuards([])
  registerApiInterceptors([])
})

describe('CC-45 export redaction through the CRUD factory', () => {
  it('redacts the marked field in a CSV export', async () => {
    const res = await route.GET(new Request('http://x/api/example/widgets?format=csv'))
    const text = await res.text()
    expect(text).not.toContain('super-secret-value')
    expect(text).toContain(MASKED_EXPORT_VALUE)
    // the unmarked columns survive untouched
    expect(text).toContain('id-1')
    expect(text).toContain('Acme')
  })

  it('redacts the marked field in a JSON export', async () => {
    const res = await route.GET(new Request('http://x/api/example/widgets?format=json'))
    const text = await res.text()
    expect(text).not.toContain('super-secret-value')
    const parsed = JSON.parse(text)
    expect(parsed[0].apiSecret).toBe(MASKED_EXPORT_VALUE)
    expect(parsed[0].name).toBe('Acme')
  })

  it('redacts the marked field in a full-scope export too', async () => {
    const res = await route.GET(new Request('http://x/api/example/widgets?format=json&exportScope=full'))
    const text = await res.text()
    expect(text).not.toContain('super-secret-value')
  })

  it('leaves the export byte-identical when encryption is disabled', async () => {
    encryptionEnabled = false
    const res = await route.GET(new Request('http://x/api/example/widgets?format=json'))
    const text = await res.text()
    // with encryption off the value passes through raw — this is the documented fail-safe
    expect(text).toContain('super-secret-value')
  })

  it('fails closed (redacts everything) when the map read throws', async () => {
    mapThrows = true
    const res = await route.GET(new Request('http://x/api/example/widgets?format=json'))
    const text = await res.text()
    expect(text).not.toContain('super-secret-value')
    expect(text).not.toContain('Acme')
  })

  it('masks the secret even when the CSV header is spelled "Api Secret" (D2 regression)', async () => {
    const res = await kebabRoute.GET(new Request('http://x/api/example/widgets?format=csv'))
    const text = await res.text()
    expect(text).not.toContain('super-secret-value')
    expect(text).toContain(MASKED_EXPORT_VALUE)
  })
})
