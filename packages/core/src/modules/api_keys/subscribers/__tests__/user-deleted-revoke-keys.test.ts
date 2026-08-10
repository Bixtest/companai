/**
 * Offboarding revokes the keys the person minted.
 *
 * Authentication no longer ties a regular key's *scope* to its creator's record,
 * so a person moving between organizations stops breaking their keys. What that
 * removes is an accident; what it must not remove is the useful half — that
 * deleting somebody stops the credentials they created.
 *
 * Doing it here makes the revocation an explicit, visible act instead of a fleet
 * of keys that quietly begin returning 401.
 */

import handler, { metadata } from '../user-deleted-revoke-keys'

type Key = { id: string; createdBy: string; tenantId: string; deletedAt: Date | null }

function makeContext(keys: Key[]) {
  const flush = jest.fn(async () => {})
  const find = jest.fn(async (_entity: unknown, where: Record<string, unknown>) =>
    keys.filter((key) =>
      key.createdBy === where.createdBy &&
      key.tenantId === where.tenantId &&
      key.deletedAt === null,
    ),
  )
  const em = { find, flush, fork: () => em }
  return { ctx: { resolve: () => em }, find, flush }
}

const LIVE: Key = { id: 'key-1', createdBy: 'user-1', tenantId: 'tenant-1', deletedAt: null }

describe('revoking a departed user\'s API keys', () => {
  it('subscribes to auth.user.deleted with a stable id', () => {
    expect(metadata.event).toBe('auth.user.deleted')
    expect(metadata.id).toBe('api_keys:user-deleted-revoke-keys')
    // Persistent: a revocation that is dropped because a worker restarted is a
    // credential nobody knows is still live.
    expect(metadata.persistent).toBe(true)
  })

  it('revokes every key the deleted user created', async () => {
    const key = { ...LIVE }
    const { ctx, flush } = makeContext([key])

    await handler({ id: 'user-1', tenantId: 'tenant-1' }, ctx as never)

    expect(key.deletedAt).toBeInstanceOf(Date)
    expect(flush).toHaveBeenCalled()
  })

  it('reads the user id from `id`, which is what the platform emits', async () => {
    // The other cascade on this event read `payload.userId` — never present —
    // and had therefore never run. Worth a test of its own.
    const key = { ...LIVE }
    const { ctx } = makeContext([key])

    await handler({ id: 'user-1', tenantId: 'tenant-1' }, ctx as never)

    expect(key.deletedAt).toBeInstanceOf(Date)
  })

  it('does nothing without a tenant, rather than reaching across tenants', async () => {
    const key = { ...LIVE }
    const { ctx, find } = makeContext([key])

    await handler({ id: 'user-1' }, ctx as never)

    expect(find).not.toHaveBeenCalled()
    expect(key.deletedAt).toBeNull()
  })

  it('leaves another tenant\'s keys alone', async () => {
    const ours = { ...LIVE }
    const theirs: Key = { id: 'key-2', createdBy: 'user-1', tenantId: 'tenant-2', deletedAt: null }
    const { ctx } = makeContext([ours, theirs])

    await handler({ id: 'user-1', tenantId: 'tenant-1' }, ctx as never)

    expect(ours.deletedAt).toBeInstanceOf(Date)
    expect(theirs.deletedAt).toBeNull()
  })

  it('leaves keys created by somebody else alone', async () => {
    const mine = { ...LIVE }
    const yours: Key = { id: 'key-3', createdBy: 'user-2', tenantId: 'tenant-1', deletedAt: null }
    const { ctx } = makeContext([mine, yours])

    await handler({ id: 'user-1', tenantId: 'tenant-1' }, ctx as never)

    expect(yours.deletedAt).toBeNull()
  })

  it('is a no-op on replay', async () => {
    const alreadyRevoked: Key = { ...LIVE, deletedAt: new Date('2026-01-01') }
    const { ctx, flush } = makeContext([alreadyRevoked])

    await handler({ id: 'user-1', tenantId: 'tenant-1' }, ctx as never)

    expect(alreadyRevoked.deletedAt).toEqual(new Date('2026-01-01'))
    expect(flush).not.toHaveBeenCalled()
  })
})
