/**
 * One migration run at a time, enforced by the database rather than by hoping.
 *
 * `dbMigrate` opens a fresh ORM per module and applies that module's pending
 * files. Nothing stopped two processes doing that at once — and two processes
 * usually means two containers booting from the same image against the same
 * database, which is the ordinary way to deploy rather than an exotic case.
 *
 * What goes wrong is not theoretical. Both read the same empty
 * `mikro_orm_migrations_<module>` table, both decide the same file is pending,
 * and both run it. `create table` fails on the loser and the boot dies; worse,
 * a data migration that is not idempotent runs twice and nobody notices.
 *
 * A Postgres **session-level** advisory lock is the fit here. It is held by a
 * connection rather than a transaction, so it spans every per-module ORM the run
 * creates; it costs nothing when uncontended; and it is released automatically
 * if the process dies, which no application-level lock file can promise.
 */

/**
 * The lock's identity. Arbitrary, and that is fine — what matters is that it
 * never changes, because two versions of this code with different keys would not
 * see each other and the lock would silently stop working.
 *
 * Advisory-lock keys share one global namespace per database, so this is
 * deliberately not a small round number that another tool might also pick.
 */
export const MIGRATION_ADVISORY_LOCK_KEY = 8147290361

export type AdvisoryLockClient = {
  connect(): Promise<void>
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
  end(): Promise<void>
}

export type WithMigrationAdvisoryLockOptions = {
  /**
   * Called once when the lock is already held and this process is about to wait.
   *
   * A migration that blocks in silence is indistinguishable from one that has
   * hung, and an operator watching a stalled deploy will kill it. Saying "another
   * run holds the lock, waiting" turns a mystery into a queue.
   */
  onWaiting?: () => void
  lockKey?: number
}

/**
 * Runs `operation` with the migration lock held.
 *
 * Waits rather than failing when another run holds it. A second booting
 * container should apply nothing and continue, not crash — by the time it
 * acquires the lock the first run has finished and its pending list is empty,
 * which is exactly the desired outcome.
 */
export async function withMigrationAdvisoryLock<T>(
  createClient: () => AdvisoryLockClient,
  operation: () => Promise<T>,
  options: WithMigrationAdvisoryLockOptions = {},
): Promise<T> {
  const lockKey = options.lockKey ?? MIGRATION_ADVISORY_LOCK_KEY
  const client = createClient()
  await client.connect()

  let held = false
  try {
    // Try first so the common uncontended case never blocks, and so there is a
    // place to announce the wait before entering it.
    const attempt = await client.query('select pg_try_advisory_lock($1) as acquired', [lockKey])
    held = attempt.rows[0]?.acquired === true
    if (!held) {
      options.onWaiting?.()
      await client.query('select pg_advisory_lock($1)', [lockKey])
      held = true
    }

    return await operation()
  } finally {
    // Best-effort, in this order, and neither step may mask a failure from
    // `operation` — the caller needs to see why the migration failed, not why the
    // cleanup did. Closing the connection releases the lock regardless, so a
    // failed unlock is untidy rather than dangerous.
    if (held) {
      try {
        await client.query('select pg_advisory_unlock($1)', [lockKey])
      } catch {
        // Ignored deliberately: see above.
      }
    }
    try {
      await client.end()
    } catch {
      // Ignored deliberately: see above.
    }
  }
}
