/** @jest-environment node */

/**
 * SD-2 / S9 — the `refuse` hook on `DataEngine.deleteOrmEntity`.
 *
 * A mutation run found this hook was **decorative**: the command's own check
 * caught the core role first, so silencing the hook changed no test result. That
 * is a real gap — a hook that can be deleted without a single test going red is a
 * hook no refactor is obliged to keep. This suite makes the hook load-bearing by
 * proving it **directly**, on the store, with no command involved.
 *
 *   - the predicate is consulted **before** any write (soft or hard);
 *   - a returned `CrudHttpError` is thrown and **nothing is written**;
 *   - a `null`/void return allows the delete;
 *   - returning `null` (row missing) short-circuits before the predicate.
 */

// A DataEngine needs a lot to construct; we test the method through a prototype
// stub with only `em` bound, which is the whole of what the method touches.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DefaultDataEngine } = require('@open-mercato/shared/lib/data/engine')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CrudHttpError } = require('@open-mercato/shared/lib/crud/errors')

function makeEngine(row: unknown) {
  const remove = jest.fn(() => ({ flush: jest.fn(async () => {}) }))
  const em = {
    findOne: jest.fn(async () => row),
    remove,
    persist: jest.fn(() => ({ flush: jest.fn(async () => {}) })),
    flush: jest.fn(async () => {}),
  }
  const engine = Object.create(DefaultDataEngine.prototype) as { em: unknown; deleteOrmEntity: unknown }
  engine.em = em
  return { engine: engine as never, em, remove }
}

beforeEach(() => jest.clearAllMocks())

describe('DataEngine.deleteOrmEntity — the refuse hook bites', () => {
  it('throws the returned error and writes nothing (hard delete)', async () => {
    const { engine, em } = makeEngine({ id: 'r1', name: 'superadmin' })
    const refusal = new CrudHttpError(409, { error: 'core role' })
    await expect(
      (engine as { deleteOrmEntity: (o: unknown) => Promise<unknown> }).deleteOrmEntity({
        entity: 'Role',
        where: { id: 'r1' },
        soft: false,
        refuse: () => refusal,
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(em.remove).not.toHaveBeenCalled()
    expect(em.flush).not.toHaveBeenCalled()
  })

  it('throws the returned error and writes nothing (soft delete)', async () => {
    const { engine, em } = makeEngine({ id: 'r1', name: 'superadmin' })
    await expect(
      (engine as { deleteOrmEntity: (o: unknown) => Promise<unknown> }).deleteOrmEntity({
        entity: 'Role',
        where: { id: 'r1' },
        refuse: () => new CrudHttpError(409, { error: 'core role' }),
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(em.persist).not.toHaveBeenCalled()
  })

  it('proceeds when the predicate returns null/void (no over-blocking)', async () => {
    const { engine, em } = makeEngine({ id: 'r1', name: 'admin' })
    const out = await (engine as { deleteOrmEntity: (o: unknown) => Promise<unknown> }).deleteOrmEntity({
      entity: 'Role',
      where: { id: 'r1' },
      soft: false,
      refuse: () => null,
    })
    expect(out).toEqual({ id: 'r1', name: 'admin' })
    expect(em.remove).toHaveBeenCalledTimes(1)
  })

  it('a missing row short-circuits before the predicate (never consults it)', async () => {
    const { engine } = makeEngine(null)
    const refuse = jest.fn(() => new CrudHttpError(409, { error: 'core role' }))
    const out = await (engine as { deleteOrmEntity: (o: unknown) => Promise<unknown> }).deleteOrmEntity({
      entity: 'Role',
      where: { id: 'missing' },
      soft: false,
      refuse,
    })
    expect(out).toBeNull()
    expect(refuse).not.toHaveBeenCalled()
  })

  it('the predicate sees the ACTUAL loaded row (not the where clause)', async () => {
    const { engine } = makeEngine({ id: 'r1', name: 'superadmin' })
    const refuse = jest.fn(() => null)
    await (engine as { deleteOrmEntity: (o: unknown) => Promise<unknown> }).deleteOrmEntity({
      entity: 'Role',
      where: { id: 'r1' },
      soft: false,
      refuse,
    })
    expect(refuse).toHaveBeenCalledWith({ id: 'r1', name: 'superadmin' })
  })
})
