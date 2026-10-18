/**
 * The write path's half — `CC-124`.
 *
 * The defect: `POST api/authority/denials` accepted any string in
 * `subjectPrincipalId` and wrote it untouched, while `withheldFromThisPerson`
 * looks the **bare** id up. The entity docblock then instructed the reader to
 * write `ai_worker:<id>`, so the rows that followed the documentation were the
 * ones that never applied.
 *
 * These tests pin the narrowing at the service as well as the route, because the
 * service is reachable directly — `denialService.audit.test.ts` calls
 * `withhold()` and the CLI can reach `grant()` — and a caller that bypasses the
 * route must not bypass the invariant.
 */
import { DenialService } from '../denialService'

const SCOPE = { tenantId: 'tenant-1', organizationId: null }
const KEY_ID = '22222222-2222-4222-8222-222222222222'

function makeService() {
  const created: Record<string, unknown>[] = []
  const log = jest.fn(async () => ({}))

  const em = {
    async find() { return [] },
    create(_entity: unknown, data: Record<string, unknown>) {
      const row = { id: 'denial-1', ...data }
      created.push(row)
      return row
    },
    persist(entity: unknown) { return { ...em, entity } },
    async flush() {},
  }

  const service = new DenialService(em as never, { log } as never)
  return { service, created, log }
}

describe('withholding from a machine', () => {
  it('stores the bare id, with the kind beside it', async () => {
    // The exact request that used to write an inert row.
    const { service, created } = makeService()

    await service.withhold({
      subjectPrincipalId: `ai_worker:${KEY_ID}`,
      subjectKind: 'ai_worker',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
    }, SCOPE)

    expect(created[0]).toMatchObject({
      subjectPrincipalId: KEY_ID,
      subjectKind: 'ai_worker',
    })
  })

  it('accepts the bare id that has always been written', async () => {
    const { service, created } = makeService()

    await service.withhold({
      subjectPrincipalId: KEY_ID,
      subjectKind: 'ai_worker',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
    }, SCOPE)

    expect(created[0]).toMatchObject({ subjectPrincipalId: KEY_ID, subjectKind: 'ai_worker' })
  })

  it('refuses a subject whose prefix names a different actor', async () => {
    // A ban aimed at a credential must never land on a person because two
    // spellings of one string were quietly accepted.
    const { service, created } = makeService()

    await expect(service.withhold({
      subjectPrincipalId: `ai_worker:${KEY_ID}`,
      subjectKind: 'human',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
    }, SCOPE)).rejects.toThrow(/ai_worker/)

    expect(created).toHaveLength(0)
  })
})

describe('a person', () => {
  it('is unchanged', async () => {
    const { service, created } = makeService()

    await service.withhold({
      subjectPrincipalId: '11111111-1111-4111-8111-111111111111',
      subjectKind: 'human',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
    }, SCOPE)

    expect(created[0]).toMatchObject({ subjectPrincipalId: '11111111-1111-4111-8111-111111111111' })
  })
})
