/** @jest-environment node */
/**
 * CC-49 — the customer-tasks route gains a server export mode so the CC-45 encryption mask applies
 * to the ALIASED columns the tasks table exports (`todoTitle` ← `customer_interaction.title`,
 * `todoDescription` ← `.body`, customer `displayName` ← `customer_entity.display_name`).
 *
 * Before CC-49 the page assembled the file in the browser and the mask — which keys on the true
 * field name — never matched the alias, so the marked value left in clear (L102).
 */

const ORG_ID = '123e4567-e89b-41d3-a456-426614174000'
const TENANT_ID = '123e4567-e89b-41d3-a456-426614174010'
const ENTITY_ID = '123e4567-e89b-41d3-a456-426614174011'
const TODO_ID = '123e4567-e89b-41d3-a456-426614174013'

const SECRET_TITLE = 'Secret task title'
const SECRET_BODY = 'Secret task description'
const SECRET_CUSTOMER = 'Secret Customer Name'

// ENTITY-AWARE mock (the critic's fix): the real `getEncryptedFieldNames` looks up by entity id
// (`where entity_id = ?`), so a mock that ignores `entityId` can never catch a wrong-entity bug.
// The tasks export draws on TWO entities; the mock mirrors the real maps:
//   customers:customer_interaction → title, body
//   customers:customer_entity      → display_name
const INTERACTION_ENTITY = 'customers:customer_interaction'
const CUSTOMER_ENTITY = 'customers:customer_entity'
const markCalls: Array<{ entityId: string; tenantId: string | null; orgId: string | null }> = []
const encryptedFields = { enabled: true, throws: false }
const mockEncryptionService = {
  isEnabled: () => encryptedFields.enabled,
  getEncryptedFieldNames: jest.fn(async (entityId: string, tenantId: string | null, orgId: string | null) => {
    markCalls.push({ entityId, tenantId, orgId })
    if (encryptedFields.throws) throw new Error('map read failed')
    if (entityId === INTERACTION_ENTITY) return ['title', 'body']
    if (entityId === CUSTOMER_ENTITY) return ['display_name']
    return []
  }),
}

const mockEm = { find: jest.fn(), findOne: jest.fn() }

const mockContainer = {
  resolve: jest.fn((name: string) => {
    if (name === 'queryEngine') return {}
    if (name === 'em') return mockEm
    if (name === 'tenantEncryptionService') return mockEncryptionService
    throw new Error(`Unknown dependency: ${name}`)
  }),
}

const mockRow = {
  id: TODO_ID,
  todoId: TODO_ID,
  todoSource: 'customers:interaction',
  todoTitle: SECRET_TITLE,
  todoDescription: SECRET_BODY,
  todoIsDone: false,
  todoPriority: null,
  todoSeverity: null,
  todoDueAt: null,
  todoCustomValues: null,
  todoOrganizationId: null,
  organizationId: ORG_ID,
  tenantId: TENANT_ID,
  createdAt: '2026-01-02T10:00:00.000Z',
  customer: { id: ENTITY_ID, displayName: SECRET_CUSTOMER, kind: 'company' },
}

const mockContext = {
  auth: { sub: 'user-1', tenantId: TENANT_ID, orgId: ORG_ID },
  em: mockEm,
  organizationIds: [ORG_ID],
  selectedOrganizationId: ORG_ID,
  container: mockContainer,
}

jest.mock('../../../../lib/interactionFeatureFlags', () => ({
  resolveCustomerInteractionFeatureFlags: jest.fn(async () => ({
    unified: true,
    legacyAdapters: true,
    externalSync: false,
  })),
}))

jest.mock('@open-mercato/shared/lib/crud/scoped-request-context', () => ({
  resolveScopedRequestContext: jest.fn(async () => mockContext),
}))

jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: jest.fn(async () => ({
    translate: (_key: string, fallback: string) => fallback,
  })),
}))

jest.mock('../../../../lib/todoCompatibility', () => {
  const actual = jest.requireActual('../../../../lib/todoCompatibility')
  return {
    ...actual,
    normalizeTodoSearch: jest.fn((value: string | undefined) => {
      if (typeof value !== 'string') return null
      const trimmed = value.trim().toLowerCase()
      return trimmed.length > 0 ? trimmed : null
    }),
    listLegacyTodoRows: jest.fn(async () => []),
    listCanonicalTodoRows: jest.fn(async () => ({ items: [mockRow], bridgeIds: new Set(), total: 1 })),
  }
})

import { GET } from '../route'

function exportUrl(extra = ''): Request {
  return new Request(
    `http://localhost/api/customers/interactions/tasks?format=csv&all=true${extra}`,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  markCalls.length = 0
  encryptedFields.enabled = true
  encryptedFields.throws = false
})

describe('CC-49 — tasks export (server mode) masks the marked fields the columns alias', () => {
  it('asks the encryption map for the TWO real entity ids (never the row source tag)', async () => {
    // H1 regression: the draft passed 'adapter:todo' (a row source tag) as the entityId, so the map
    // returned nothing and the mask silently did nothing. Pin both real ids.
    await GET(exportUrl('&exportColumns=todoTitle,customer.displayName'))
    const asked = new Set(markCalls.map((c) => c.entityId))
    expect(asked.has(INTERACTION_ENTITY)).toBe(true)
    expect(asked.has(CUSTOMER_ENTITY)).toBe(true)
    for (const call of markCalls) expect(call.entityId).not.toBe('adapter:todo')
  })

  it('masks todoTitle (aliasing the marked title) — never the clear value', async () => {
    const res = await GET(exportUrl('&exportColumns=todoTitle'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    const body = await res.text()
    expect(body).not.toContain(SECRET_TITLE)
    expect(body).toContain('***')
  })

  it('masks the nested customer displayName column (H2 regression: not blank, not in clear)', async () => {
    const res = await GET(exportUrl('&exportColumns=todoTitle,customer.displayName'))
    const body = await res.text()
    expect(body).not.toContain(SECRET_CUSTOMER)
    expect(body).toContain('***')
  })

  it('leaks nothing when no projection is given (H2 regression: no un-masked object column)', async () => {
    // Without exportColumns the columns are derived. The old draft emitted a `customer` OBJECT column
    // that serialized the nested name in clear.
    const res = await GET(exportUrl())
    const body = await res.text()
    expect(body).not.toContain(SECRET_CUSTOMER)
    expect(body).not.toContain(SECRET_TITLE)
    expect(body).not.toContain(SECRET_BODY)
  })

  it('masks a marked alias even when the column spelling is the plain true name', async () => {
    const res = await GET(exportUrl('&exportColumns=title,body'))
    const body = await res.text()
    expect(body).not.toContain(SECRET_TITLE)
    expect(body).not.toContain(SECRET_BODY)
  })

  it('honours the projection: an unlisted column is not emitted at all', async () => {
    const res = await GET(exportUrl('&exportColumns=todoIsDone'))
    const body = await res.text()
    expect(body).not.toContain(SECRET_TITLE)
    expect(body).not.toContain(SECRET_CUSTOMER)
  })

  it('leaves the export unchanged when encryption is disabled (fail-open)', async () => {
    encryptedFields.enabled = false
    const res = await GET(exportUrl('&exportColumns=todoTitle'))
    const body = await res.text()
    expect(body).toContain(SECRET_TITLE)
    expect(body).not.toContain('***')
  })

  it('fails closed — masks every column — when the map read throws', async () => {
    encryptedFields.throws = true
    const res = await GET(exportUrl('&exportColumns=todoTitle,customer.displayName'))
    const body = await res.text()
    expect(body).not.toContain(SECRET_TITLE)
    expect(body).not.toContain(SECRET_CUSTOMER)
    expect(body).toContain('***')
  })

  it('returns the JSON list unchanged when no format is given', async () => {
    const res = await GET(new Request('http://localhost/api/customers/interactions/tasks?page=1&pageSize=50'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(body.items[0].todoTitle).toBe(SECRET_TITLE)
  })
})
