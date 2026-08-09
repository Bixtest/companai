/**
 * An audit entry must not lose the scope it was given.
 *
 * `normalizeInput` nulls any id that is not a uuid — right for a value nobody
 * supplied, and data loss for one somebody did. A tenant-less entry is returned
 * by no tenant-scoped query and, since R3, covered by no hash chain: the write
 * appears to succeed and the record is both unreachable and unprovable.
 */

import { ActionLogService } from '../actionLogService'

const TENANT = '88b6bc8a-a655-4edd-b1b5-d186606efdb2'
const ORG = '065bd751-ada0-4469-a571-879950a1be51'
const USER = '11111111-1111-4111-8111-111111111111'
const KEY = '22222222-2222-4222-8222-222222222222'

function createService() {
  const persisted: Array<Record<string, unknown>> = []
  const em = {
    create: (_entity: unknown, data: Record<string, unknown>) => ({ id: 'log-1', ...data }),
    persist: (entity: Record<string, unknown>) => {
      persisted.push(entity)
      return { flush: async () => undefined }
    },
  }
  const service = new ActionLogService(em as unknown as ConstructorParameters<typeof ActionLogService>[0])
  return { service, persisted }
}

const entry = {
  commandId: 'customers.person.update',
  tenantId: TENANT,
  organizationId: ORG,
  actorUserId: USER,
}

describe('a malformed scope stops the write', () => {
  it.each([
    ['tenantId', { ...entry, tenantId: 'tenant-1' }],
    ['organizationId', { ...entry, organizationId: 'org-1' }],
    ['actorUserId', { ...entry, actorUserId: 'not-a-uuid' }],
  ])('refuses to write when %s cannot survive normalisation', async (field, malformed) => {
    const { service, persisted } = createService()

    await expect(service.log(malformed)).rejects.toThrow(new RegExp(field))
    // Nothing half-written: the throw happens before the entity is built.
    expect(persisted).toHaveLength(0)
  })

  it('names every dropped field, not just the first', async () => {
    const { service } = createService()

    await expect(service.log({ ...entry, tenantId: 'x', organizationId: 'y' }))
      .rejects.toThrow(/tenantId, organizationId/)
  })

  it('explains the consequence rather than only the rule', async () => {
    // Whoever hits this needs to know why it matters, not that a regex failed.
    const { service } = createService()

    await expect(service.log({ ...entry, tenantId: 'x' }))
      .rejects.toThrow(/no tenant-scoped query returns and no hash chain covers/)
  })
})

describe('what remains permitted', () => {
  it('accepts a well-formed entry', async () => {
    const { service, persisted } = createService()

    await expect(service.log(entry)).resolves.toBeTruthy()
    expect(persisted).toHaveLength(1)
  })

  it('accepts an absent scope, which is different from a malformed one', async () => {
    // A system act with no tenant is legitimate. Only a value that was supplied
    // and then discarded is a defect.
    const { service } = createService()

    await expect(service.log({ commandId: 'system.tick' })).resolves.toBeTruthy()
  })

  it('accepts an api_key subject, which parseSubject unwraps to a uuid', async () => {
    const { service, persisted } = createService()

    await expect(service.log({ ...entry, actorUserId: `api_key:${KEY}` })).resolves.toBeTruthy()
    expect((persisted[0] as { actorUserId?: string }).actorUserId).toBe(KEY)
  })

  it('accepts an empty string, which means absent rather than malformed', async () => {
    const { service } = createService()

    await expect(service.log({ ...entry, organizationId: '' })).resolves.toBeTruthy()
  })
})
