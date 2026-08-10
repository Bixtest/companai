/**
 * The lock that stops two deploys applying the same migration.
 *
 * The failure this prevents needs two processes and a race, so it cannot be
 * reproduced in a unit test. What *can* be pinned down is every decision the
 * helper makes around the lock: that it is taken before the work and released
 * after, that a held lock waits instead of failing, that the caller is told it is
 * waiting rather than left staring at a stalled deploy, and — most importantly —
 * that a failure inside the migration still surfaces as itself rather than as
 * whatever the cleanup did afterwards.
 */
import { MIGRATION_ADVISORY_LOCK_KEY, withMigrationAdvisoryLock } from '../advisoryLock'

type Call = { text: string; values?: unknown[] }

function fakeClient(options: { tryAcquireSucceeds?: boolean; failOn?: RegExp } = {}) {
  const calls: Call[] = []
  const state = { connected: false, ended: false }
  const client = {
    async connect() { state.connected = true },
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values })
      if (options.failOn?.test(text)) throw new Error(`query failed: ${text}`)
      if (text.includes('pg_try_advisory_lock')) {
        return { rows: [{ acquired: options.tryAcquireSucceeds !== false }] }
      }
      return { rows: [{}] }
    },
    async end() { state.ended = true },
  }
  const sql = () => calls.map((call) => call.text).join(' | ')
  return { client, calls, state, sql }
}

describe('the uncontended path', () => {
  it('takes the lock, runs the migration, and releases it', async () => {
    const { client, state, sql } = fakeClient()
    const order: string[] = []

    await withMigrationAdvisoryLock(() => client, async () => { order.push('migrated') })

    expect(state.connected).toBe(true)
    expect(sql()).toContain('pg_try_advisory_lock')
    expect(sql()).toContain('pg_advisory_unlock')
    expect(order).toEqual(['migrated'])
    expect(state.ended).toBe(true)
  })

  it('never blocks when the lock is free', async () => {
    // `pg_advisory_lock` waits indefinitely. Reaching for it when the lock is
    // already available would turn every ordinary deploy into a gamble on
    // whatever else happens to be connected.
    const { client, sql } = fakeClient({ tryAcquireSucceeds: true })

    await withMigrationAdvisoryLock(() => client, async () => {})

    expect(sql()).not.toContain('select pg_advisory_lock(')
  })

  it('locks on a stable key, because two keys are no lock at all', async () => {
    const { client, calls } = fakeClient()

    await withMigrationAdvisoryLock(() => client, async () => {})

    for (const call of calls) {
      expect(call.values).toEqual([MIGRATION_ADVISORY_LOCK_KEY])
    }
  })

  it('holds one lock across the whole run, not one per module', async () => {
    // dbMigrate opens an ORM per module. A lock scoped to any one of them would
    // leave the gaps between them open, which is where the race lives.
    const { client, sql } = fakeClient()
    let sqlDuringRun = ''

    await withMigrationAdvisoryLock(() => client, async () => { sqlDuringRun = sql() })

    expect(sqlDuringRun).toContain('pg_try_advisory_lock')
    expect(sqlDuringRun).not.toContain('pg_advisory_unlock')
  })
})

describe('when another run holds it', () => {
  it('waits rather than failing', async () => {
    // A second booting container should apply nothing and carry on. By the time
    // it acquires the lock the first run has finished and its pending list is
    // empty, which is the outcome we want -- crashing the boot is not.
    const { client, sql } = fakeClient({ tryAcquireSucceeds: false })

    await expect(withMigrationAdvisoryLock(() => client, async () => 'done')).resolves.toBe('done')
    expect(sql()).toContain('select pg_advisory_lock($1)')
  })

  it('says so, once, before it starts waiting', async () => {
    // Silence here is indistinguishable from a hang, and an operator watching a
    // stalled deploy will kill it.
    const { client } = fakeClient({ tryAcquireSucceeds: false })
    const onWaiting = jest.fn()

    await withMigrationAdvisoryLock(() => client, async () => {}, { onWaiting })

    expect(onWaiting).toHaveBeenCalledTimes(1)
  })

  it('stays quiet when it did not have to wait', async () => {
    const { client } = fakeClient({ tryAcquireSucceeds: true })
    const onWaiting = jest.fn()

    await withMigrationAdvisoryLock(() => client, async () => {}, { onWaiting })

    expect(onWaiting).not.toHaveBeenCalled()
  })
})

describe('when things go wrong', () => {
  it('releases the lock when the migration throws', async () => {
    // Otherwise one failed deploy blocks every later one until somebody finds
    // the connection and kills it.
    const { client, sql, state } = fakeClient()

    await expect(withMigrationAdvisoryLock(() => client, async () => {
      throw new Error('migration 003 failed')
    })).rejects.toThrow('migration 003 failed')

    expect(sql()).toContain('pg_advisory_unlock')
    expect(state.ended).toBe(true)
  })

  it('surfaces the migration failure, not the cleanup failure', async () => {
    // The caller needs to know why the migration failed. An unlock that also
    // fails is untidy -- closing the connection releases the lock anyway -- and
    // must never be what the operator sees instead.
    const { client } = fakeClient({ failOn: /pg_advisory_unlock/ })

    await expect(withMigrationAdvisoryLock(() => client, async () => {
      throw new Error('migration 003 failed')
    })).rejects.toThrow('migration 003 failed')
  })

  it('does not try to unlock something it never acquired', async () => {
    const { client, sql } = fakeClient({ failOn: /pg_try_advisory_lock/ })

    await expect(withMigrationAdvisoryLock(() => client, async () => {})).rejects.toThrow()

    expect(sql()).not.toContain('pg_advisory_unlock')
  })

  it('closes the connection even when unlocking fails', async () => {
    const { client, state } = fakeClient({ failOn: /pg_advisory_unlock/ })

    await withMigrationAdvisoryLock(() => client, async () => {})

    expect(state.ended).toBe(true)
  })
})
