/**
 * @jest-environment node
 *
 * D2-gap (2026-10-07): the `attachments` module shipped **no mutation guard at
 * all** — a module-wide string scan found no wrapper, no `runRouteMutationGuards`
 * call, no `makeCrudRoute`, and neither of the `@deprecated` pair. All **EIGHT**
 * of its write verbs were therefore checked by nothing:
 *
 *   1. `api/route.ts`            POST (multipart upload)
 *   2. `api/route.ts`            DELETE
 *   3. `api/partitions/route.ts` POST
 *   4. `api/partitions/route.ts` PUT
 *   5. `api/partitions/route.ts` DELETE
 *   6. `api/library/[id]/route.ts` PATCH
 *   7. `api/library/[id]/route.ts` DELETE
 *   8. `api/transfer/route.ts`   POST
 *
 * This suite proves each one now runs a guard, by registering a **real** guard in
 * the global store (`registerMutationGuards`) and driving the **real** route
 * handlers with `runRouteMutationGuards` left **UNMOCKED**. Mocking the wrapper
 * would only prove a function of that name is called; a real registered guard
 * proves the registry chokepoint is actually reached from the route.
 *
 * Two directions are asserted for each wired verb:
 *
 *   1. a **block** verdict (the registered guard returns ok:false) stops the
 *      write — the entity manager records no persist/flush/remove, and no
 *      after-success fires;
 *   2. an **allow** verdict lets the write run — the entity manager DOES record
 *      the write, and the guard's after-success fires exactly once.
 */
const TENANT_ID = 'tenant-1'
const ORG_ID = 'org-1'
const USER_ID = 'user-1'

const ATTACHMENT_ID = '11111111-1111-4111-8111-111111111111'
const PARTITION_ID = '22222222-2222-4222-8222-222222222222'
const RECORD_FROM = 'rec-from'
const RECORD_TO = 'rec-to'

const runAfterSuccessMock = jest.fn(async () => undefined)

// ── Real registry (not stubbed) ────────────────────────────────────────────
import { registerMutationGuards } from '@open-mercato/shared/lib/crud/mutation-guard-store'
import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'

// ── Observable write record ────────────────────────────────────────────────
const writes: string[] = []
function record(name: string) {
  writes.push(name)
}

// ── Shared auth / container ────────────────────────────────────────────────
let currentAuth: Record<string, unknown> | null = {
  sub: USER_ID,
  tenantId: TENANT_ID,
  orgId: ORG_ID,
}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => currentAuth),
}))

// ── Entity classes (avoid MikroORM decorators) ─────────────────────────────
// Jest keys `jest.mock` by the path **resolved from the test file**, so every
// relative specifier a route uses (`../data/entities` from `api/route.ts`,
// `../../data/entities` from `partitions/route.ts`, `../../../data/entities`
// from `library/[id]/route.ts`) must be re-expressed as the one path that
// resolves from THIS file to the same module: `../../data/entities`.
jest.mock('../../data/entities', () => ({
  Attachment: class Attachment {},
  AttachmentPartition: class AttachmentPartition {},
}))

jest.mock('#generated/entities.ids.generated', () => ({
  E: { attachments: { attachment: 'attachments:attachment' } },
}))

// ── Entity manager stub ────────────────────────────────────────────────────
// `findOne` serves several callers, so it discriminates on the entity class
// name and the filter shape: an AttachmentPartition lookup resolves the seeded
// partition row; an Attachment lookup resolves the seeded attachment row.
const partitionRow = {
  id: PARTITION_ID,
  code: 'tenantAPriv',
  title: 'Tenant A Private',
  storageDriver: 'local',
  configJson: null,
  isPublic: false,
  requiresOcr: false,
  ocrModel: null,
  tenantId: TENANT_ID,
  organizationId: ORG_ID,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

const attachmentRow = {
  id: ATTACHMENT_ID,
  entityId: 'example:todo',
  recordId: RECORD_FROM,
  fileName: 'doc.pdf',
  mimeType: 'application/pdf',
  fileSize: 3,
  partitionCode: 'tenantAPriv',
  storageDriver: 'local',
  storagePath: 'tenant/org/doc.pdf',
  url: 'http://cdn.local/doc.pdf',
  content: null,
  storageMetadata: { tags: [], assignments: [] },
  tenantId: TENANT_ID,
  organizationId: ORG_ID,
}

function entityName(entity: unknown): string {
  return typeof (entity as { name?: unknown })?.name === 'string' ? (entity as { name: string }).name : ''
}

const mockEm = {
  findOne: jest.fn(async (entity: unknown, where?: Record<string, unknown>) => {
    const name = entityName(entity)
    if (name === 'AttachmentPartition') {
      if (where?.id && where.id !== PARTITION_ID) return null
      if (where?.code && where.code !== partitionRow.code) return null
      return partitionRow
    }
    if (name === 'Attachment') {
      return attachmentRow
    }
    return null
  }),
  find: jest.fn(async () => [attachmentRow]),
  count: jest.fn(async () => 0),
  create: jest.fn((_entity: unknown, data: Record<string, unknown>) => {
    record('em.create')
    return { ...data, id: (data.id as string) ?? ATTACHMENT_ID }
  }),
  persist: jest.fn(function persist(this: unknown) { record('em.persist'); return this }),
  remove: jest.fn(function remove(this: unknown) { record('em.remove'); return this }),
  flush: jest.fn(async () => { record('em.flush') }),
  transactional: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work(mockEm)),
  fork: jest.fn(() => mockEm),
  getKysely: jest.fn(() => ({
    selectFrom: () => ({ select: () => ({ where: () => ({ executeTakeFirst: async () => ({ total_size: 0 }) }) }) }),
  })),
}

const mockDataEngine = {
  setCustomFields: jest.fn(async () => {}),
  markOrmEntityChange: jest.fn(),
  flushOrmEntityChanges: jest.fn(async () => {}),
}

const mockStorageDriver = {
  store: jest.fn(async () => {
    record('driver.store')
    return { storagePath: 'tenant/org/doc.pdf' }
  }),
  delete: jest.fn(async () => { record('driver.delete') }),
  toLocalPath: jest.fn(async () => ({ filePath: '/tmp/x', cleanup: async () => {} })),
}
const mockStorageDriverFactory = {
  resolveForPartition: jest.fn(async () => mockStorageDriver),
}

const mockRbacService = { getGrantedFeatures: jest.fn(async () => []), userHasAllFeatures: jest.fn(async () => true) }

const mockContainer = {
  resolve: jest.fn((token: string) => {
    if (token === 'em') return mockEm
    if (token === 'dataEngine') return mockDataEngine
    if (token === 'storageDriverFactory') return mockStorageDriverFactory
    if (token === 'rbacService') return mockRbacService
    if (token === 'queryEngine') throw new Error('queryEngine not registered')
    return null
  }),
}

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => mockContainer),
}))

// ── Per-route dependency stubs ─────────────────────────────────────────────
jest.mock('@open-mercato/shared/lib/crud/audit-write', () => ({
  writeDirectWriteAuditLog: jest.fn(async () => undefined),
}))

// attachments main route — all relative lib specifiers collapse to `../../lib/*`
// from this test file (see the note on the entity mock above).
jest.mock('../../lib/requestScope', () => ({
  resolveAttachmentOrganizationId: jest.fn(async (_c: unknown, auth: { orgId?: string | null }) => auth?.orgId ?? null),
}))
jest.mock('@open-mercato/shared/lib/i18n/server', () => ({
  resolveTranslations: jest.fn(async () => ({
    t: (_k: string, fallback: string) => fallback,
    translate: (_k: string, fallback: string) => fallback,
  })),
}))
jest.mock('../../lib/textExtraction', () => ({ extractAttachmentContent: jest.fn(async () => null) }))
jest.mock('../../lib/ocrQueue', () => ({ requestOcrProcessing: jest.fn(async () => {}) }))
jest.mock('../../lib/ocrConfig', () => ({ resolveDefaultAttachmentOcrEnabled: jest.fn(() => false) }))
jest.mock('../../lib/thumbnailCache', () => ({ clearAttachmentThumbnailCache: jest.fn(async () => {}) }))

// partitions route
jest.mock('../../lib/partitionEnv', () => ({ resolvePartitionEnvKey: jest.fn(() => null) }))

// library/[id] route
jest.mock('../../lib/assignmentDetails', () => ({
  applyAssignmentEnrichments: jest.fn((a: unknown) => a),
  resolveAssignmentEnrichments: jest.fn(async () => ({})),
}))

// shared helpers used by upload / library routes
jest.mock('@open-mercato/shared/lib/commands/helpers', () => ({
  emitCrudSideEffects: jest.fn(async () => { record('emitCrudSideEffects') }),
  setCustomFieldsIfAny: jest.fn(async () => {}),
}))
jest.mock('@open-mercato/shared/lib/crud/custom-fields', () => ({
  splitCustomFieldPayload: (body: unknown) => ({ base: body ?? {}, custom: {} }),
  loadCustomFieldValues: jest.fn(async () => ({})),
}))
jest.mock('@open-mercato/shared/lib/custom-fields/normalize', () => ({
  normalizeCustomFieldResponse: (v: unknown) => v ?? null,
}))
jest.mock('../../lib/partitions', () => ({
  DEFAULT_ATTACHMENT_PARTITIONS: [{ code: 'privateAttachments' }, { code: 'productsMedia' }],
  ensureDefaultPartitions: jest.fn(async () => {}),
  resolveDefaultPartitionCode: jest.fn(() => 'tenantAPriv'),
  sanitizePartitionCode: (input: unknown) => (typeof input === 'string' ? input.trim() : null),
  isPartitionSettingsLocked: jest.fn(() => false),
}))
jest.mock('../../lib/crud', () => ({ attachmentCrudEvents: [], attachmentCrudIndexer: null }))

// `mergeAttachmentMetadata` / `readAttachmentMetadata` are pure and tiny — keep
// the real ones so the transfer / library metadata paths behave as in prod.
// (They live under `attachments/lib/metadata`, which has no heavy deps.)

import { POST as upload } from '../route'
import { DELETE as deleteAttachment } from '../route'
import { POST as createPartition, PUT as updatePartition, DELETE as deletePartition } from '../partitions/route'
import { PATCH as patchLibrary, DELETE as deleteLibrary } from '../library/[id]/route'
import { POST as transferAttachments } from '../transfer/route'

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) } as never
}

function uploadRequest(extra: Record<string, string> = {}): Request {
  const fd = new FormData()
  fd.set('entityId', 'example:todo')
  fd.set('recordId', RECORD_TO)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  fd.set('file', new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' }))
  return new Request('http://localhost/api/attachments', { method: 'POST', body: fd as never })
}

interface Case {
  name: string
  resourceKind: string
  operation: string
  /** The write the route performs when the guard allows it. */
  writeMarker: string
  call: () => Promise<Response>
}

function buildCases(): Case[] {
  return [
    {
      name: 'api POST (upload)',
      resourceKind: 'attachments.attachment',
      operation: 'create',
      writeMarker: 'em.persist',
      call: () => upload(uploadRequest()),
    },
    {
      name: 'api DELETE',
      resourceKind: 'attachments.attachment',
      operation: 'delete',
      writeMarker: 'em.remove',
      call: () => deleteAttachment(new Request(`http://localhost/api/attachments?id=${ATTACHMENT_ID}`, { method: 'DELETE' })),
    },
    {
      name: 'partitions POST',
      resourceKind: 'attachments.partition',
      operation: 'create',
      writeMarker: 'em.persist',
      call: () => createPartition(jsonRequest('http://localhost/api/attachments/partitions', 'POST', {
        code: 'newPart', title: 'New Partition', storageDriver: 'local', isPublic: false,
      })),
    },
    {
      name: 'partitions PUT',
      resourceKind: 'attachments.partition',
      operation: 'update',
      writeMarker: 'em.persist',
      call: () => updatePartition(jsonRequest('http://localhost/api/attachments/partitions', 'PUT', {
        id: PARTITION_ID, code: 'tenantAPriv', title: 'Renamed',
      })),
    },
    {
      name: 'partitions DELETE',
      resourceKind: 'attachments.partition',
      operation: 'delete',
      writeMarker: 'em.remove',
      call: () => deletePartition(new Request(`http://localhost/api/attachments/partitions?id=${PARTITION_ID}`, { method: 'DELETE' })),
    },
    {
      name: 'library/[id] PATCH',
      resourceKind: 'attachments.attachment',
      operation: 'update',
      writeMarker: 'em.flush',
      call: () => patchLibrary(jsonRequest(`http://localhost/api/attachments/library/${ATTACHMENT_ID}`, 'PATCH', { tags: ['x'] }), ctx(ATTACHMENT_ID)),
    },
    {
      name: 'library/[id] DELETE',
      resourceKind: 'attachments.attachment',
      operation: 'delete',
      writeMarker: 'em.remove',
      call: () => deleteLibrary(new Request(`http://localhost/api/attachments/library/${ATTACHMENT_ID}`, { method: 'DELETE' }), ctx(ATTACHMENT_ID)),
    },
    {
      name: 'transfer POST',
      resourceKind: 'attachments.attachment',
      operation: 'update',
      writeMarker: 'em.persist',
      call: () => transferAttachments(jsonRequest('http://localhost/api/attachments/transfer', 'POST', {
        entityId: 'example:todo', attachmentIds: [ATTACHMENT_ID], fromRecordId: RECORD_FROM, toRecordId: RECORD_TO,
      })),
    },
  ]
}

function registerGuard(resourceKind: string, routeOperation: string, verdict: 'block' | 'allow') {
  const operation = routeOperation === 'custom' ? 'update' : routeOperation
  const guard: MutationGuard = {
    id: `guard-${resourceKind}-${verdict}`,
    targetEntity: resourceKind,
    operations: [operation as MutationGuard['operations'][number]],
    validate: jest.fn(async () => (verdict === 'block'
      ? { ok: false, status: 423, body: { error: 'blocked by guard' } }
      : { ok: true, shouldRunAfterSuccess: true })),
    afterSuccess: runAfterSuccessMock,
  }
  registerMutationGuards([{ moduleId: 'attachments', guards: [guard] }])
  return guard
}

describe('attachments D2-gap wiring — a real guard blocks or allows each newly-wired write', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    writes.length = 0
    currentAuth = { sub: USER_ID, tenantId: TENANT_ID, orgId: ORG_ID }
  })

  afterEach(() => {
    registerMutationGuards([])
  })

  const cases = buildCases()

  describe('block — the guard refuses and the write never happens', () => {
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      registerGuard(c.resourceKind, c.operation, 'block')

      const res = await c.call()

      expect(res.status).toBe(423)
      expect(await res.json()).toEqual({ error: 'blocked by guard' })
      expect(writes).not.toContain(c.writeMarker)
      expect(runAfterSuccessMock).not.toHaveBeenCalled()
    })
  })

  describe('allow — the write runs and after-success fires exactly once', () => {
    it.each(cases.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
      registerGuard(c.resourceKind, c.operation, 'allow')

      const res = await c.call()

      expect(res.status).toBeLessThan(400)
      expect(writes).toContain(c.writeMarker)
      expect(runAfterSuccessMock).toHaveBeenCalledTimes(1)
    })
  })

  it('an unregistered guard set (control) lets every write through with no block', async () => {
    // Sanity control: with no guard registered the block path cannot fire, which
    // proves the 423 in the block suite comes from the guard and not from some
    // route-level constant.
    for (const c of cases) {
      writes.length = 0
      const res = await c.call()
      expect(res.status).not.toBe(423)
    }
  })
})
