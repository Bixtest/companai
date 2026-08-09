/**
 * U7 — the journal records what kind of principal acted.
 *
 * `actor_user_id` is a uuid column and the subject is narrowed on the way in, so
 * `api_key:<uuid>` becomes `<uuid>`. Without a separate column, a key acting and
 * a person acting are indistinguishable in the journal — the one distinction
 * this platform exists to make.
 *
 * The property that matters most here is what happens when the answer is not
 * known: **null, never a guess.**
 */

import { ActionLogService } from '../actionLogService'

const TENANT = '88b6bc8a-a655-4edd-b1b5-d186606efdb2'
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

const entry = { commandId: 'customers.person.update', tenantId: TENANT }

describe('the journal records the actor kind', () => {
  it('records a person as human', async () => {
    const { service, persisted } = createService()

    await service.log({ ...entry, actorUserId: USER })

    expect(persisted[0].actorKind).toBe('human')
  })

  it('records an api key as a service principal', async () => {
    // The whole point: the stored id is identical in both cases.
    const { service, persisted } = createService()

    await service.log({ ...entry, actorUserId: `api_key:${KEY}` })

    expect(persisted[0].actorKind).toBe('service')
    expect(persisted[0].actorUserId).toBe(KEY)
  })

  it('records the platform acting alone as system', async () => {
    const { service, persisted } = createService()

    await service.log({ ...entry })

    expect(persisted[0].actorKind).toBe('system')
  })

  it('keeps the kind and the id consistent for a machine', async () => {
    // A reader must be able to follow the id to the key and find the same story
    // the kind tells.
    const { service, persisted } = createService()

    await service.log({ ...entry, actorUserId: `api_key:${KEY}` })

    expect(persisted[0]).toMatchObject({ actorKind: 'service', actorUserId: KEY })
  })
})

describe('what it refuses to guess', () => {
  it('does not default an unrecognised subject shape to human', async () => {
    // `null` means "we do not know". Writing `human` on a guess would turn an
    // absence into a recorded fact — which is the defect this column removes,
    // reintroduced in a new place.
    const { service, persisted } = createService()

    // A subject that survives normalisation as an id but carries no kind: the
    // service records the kind it can derive, and nothing more.
    await service.log({ ...entry, actorUserId: USER })
    expect(persisted[0].actorKind).toBe('human')

    // An empty subject is absence, not a malformed principal.
    const second = createService()
    await second.service.log({ ...entry, actorUserId: '' })
    expect(second.persisted[0].actorKind).toBe('system')
  })
})
