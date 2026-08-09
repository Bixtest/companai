/**
 * R2b-factory — the CRUD factory's direct-write path audits inside the
 * transaction that performed the write, so a failed audit rolls the write back.
 *
 * These tests exercise the *contract* the factory relies on rather than booting
 * a full route: the audit call is made inside `em.transactional(...)`, it does
 * not swallow errors, and an absent audit service is still tolerated. Wiring a
 * complete `makeCrudRoute` here would need an ORM, a data engine and a container
 * — and would test those rather than this.
 *
 * The behaviour under test is the one that was wrong before: an audit failure
 * used to be logged and ignored, leaving a committed change nobody could account
 * for.
 */

type LogFn = (input: Record<string, unknown>) => Promise<unknown>

/** Mirrors `em.transactional` closely enough to observe commit vs rollback. */
function makeTransactionalEm() {
  const state = { committed: false, rolledBack: false, rows: [] as string[] }
  return {
    state,
    async transactional<T>(work: () => Promise<T>): Promise<T> {
      const snapshot = [...state.rows]
      try {
        const result = await work()
        state.committed = true
        return result
      } catch (err) {
        state.rows = snapshot
        state.rolledBack = true
        throw err
      }
    },
  }
}

function makeContainer(actionLogService: { log: LogFn } | null) {
  return {
    resolve: (name: string) => {
      if (name === 'actionLogService') {
        if (!actionLogService) throw new Error('[internal] actionLogService not registered')
        return actionLogService
      }
      throw new Error(`[internal] not registered: ${name}`)
    },
  }
}

/**
 * The shape the factory now uses: write the row, then audit, both inside one
 * transaction. Kept in step with `factory.ts` — if that ordering changes, this
 * test is describing something that no longer exists.
 */
async function writeThenAudit(
  em: ReturnType<typeof makeTransactionalEm>,
  container: { resolve: (name: string) => unknown },
): Promise<void> {
  await em.transactional(async () => {
    em.state.rows.push('business-row')
    let service: { log: LogFn } | null = null
    try {
      service = container.resolve('actionLogService') as { log: LogFn }
    } catch {
      service = null
    }
    if (!service || typeof service.log !== 'function') return
    await service.log({ commandId: 'test.thing.created' })
  })
}

describe('CRUD factory — audit fails closed (R2b-factory)', () => {
  it('commits the row and the audit entry together', async () => {
    const em = makeTransactionalEm()
    const log = jest.fn(async () => ({ id: 'log-1' }))

    await writeThenAudit(em, makeContainer({ log }))

    expect(em.state.committed).toBe(true)
    expect(em.state.rolledBack).toBe(false)
    expect(em.state.rows).toEqual(['business-row'])
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('rolls the row back when the audit write fails', async () => {
    // The point of the batch. Previously the error was swallowed and the row
    // stayed, leaving a change with no record of who made it.
    const em = makeTransactionalEm()
    const log = jest.fn(async () => {
      throw new Error('audit table unavailable')
    })

    await expect(writeThenAudit(em, makeContainer({ log }))).rejects.toThrow('audit table unavailable')

    expect(em.state.rolledBack).toBe(true)
    expect(em.state.committed).toBe(false)
    expect(em.state.rows).toEqual([])
  })

  it('still commits when the audit module is absent', async () => {
    // Disabling `audit_logs` is a legitimate downstream choice; only a failing
    // write is fatal, never a missing service.
    const em = makeTransactionalEm()

    await writeThenAudit(em, makeContainer(null))

    expect(em.state.committed).toBe(true)
    expect(em.state.rows).toEqual(['business-row'])
  })
})
