import { CommandBus } from '../command-bus'
import { commandRegistry } from '../registry'
import type { CommandRuntimeContext } from '../types'

/**
 * R2b — the business write and its audit record commit together, or neither does.
 *
 * Before R2b, `handler.execute()` committed its own transaction and the audit
 * write then ran in a separate one via `em.fork()`, with its failures swallowed.
 * A committed change could exist with no record of it, silently.
 *
 * The assertion that matters is the last one: **force the audit write to throw
 * and prove the business write is rolled back.** Everything else here supports it.
 */

type FakeEm = {
  begin: jest.Mock
  commit: jest.Mock
  rollback: jest.Mock
  isInTransaction: jest.Mock
}

function makeEm(overrides: Partial<FakeEm> = {}): FakeEm {
  return {
    begin: jest.fn(async () => {}),
    commit: jest.fn(async () => {}),
    rollback: jest.fn(async () => {}),
    isInTransaction: jest.fn(() => false),
    ...overrides,
  }
}

function makeCtx(em: unknown, actionLogService: unknown): CommandRuntimeContext {
  return {
    container: {
      resolve: (name: string) => {
        if (name === 'em') return em
        if (name === 'actionLogService') return actionLogService
        if (name === 'dataEngine') return { flushOrmEntityChanges: async () => {} }
        throw new Error(`[internal] not registered: ${name}`)
      },
    },
    auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
    selectedOrganizationId: 'org-1',
  } as unknown as CommandRuntimeContext
}

describe('command bus — audit atomicity (R2b)', () => {
  const commandId = 'test.audit.atomicity'
  let committed: string[]

  beforeEach(() => {
    committed = []
    jest.clearAllMocks()
  })

  afterEach(() => {
    commandRegistry.unregister?.(commandId)
  })

  function registerHandler(): void {
    commandRegistry.register({
      id: commandId,
      isUndoable: false,
      async execute() {
        // Stands in for the business write. Recorded, then asserted against.
        committed.push('business-row')
        return { id: 'row-1' }
      },
      buildLog: () => ({ resourceKind: 'test.thing', resourceId: 'row-1' }),
    } as never)
  }

  it('opens one transaction and commits it when the audit write succeeds', async () => {
    registerHandler()
    const em = makeEm()
    const log = jest.fn(async () => ({ id: 'log-1' }))
    const bus = new CommandBus()

    await bus.execute(commandId, { input: {}, ctx: makeCtx(em, { log }) })

    expect(em.begin).toHaveBeenCalledTimes(1)
    expect(em.commit).toHaveBeenCalledTimes(1)
    expect(em.rollback).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledTimes(1)
    expect(committed).toEqual(['business-row'])
  })

  it('rolls back the business write when the audit write fails', async () => {
    // The whole point of R2b. Before it, this command committed and the audit
    // failure was swallowed — leaving a change nobody could account for.
    registerHandler()
    const em = makeEm()
    const log = jest.fn(async () => {
      throw new Error('audit table unavailable')
    })
    const bus = new CommandBus()

    await expect(
      bus.execute(commandId, { input: {}, ctx: makeCtx(em, { log }) }),
    ).rejects.toThrow('audit table unavailable')

    expect(em.rollback).toHaveBeenCalledTimes(1)
    expect(em.commit).not.toHaveBeenCalled()
  })

  it('joins an ambient transaction instead of nesting one', async () => {
    // A command invoked from inside another command must not open a second
    // transaction with raw begin/commit — the outermost caller owns the boundary.
    registerHandler()
    const em = makeEm({ isInTransaction: jest.fn(() => true) })
    const bus = new CommandBus()

    await bus.execute(commandId, { input: {}, ctx: makeCtx(em, { log: jest.fn(async () => ({})) }) })

    expect(em.begin).not.toHaveBeenCalled()
    expect(em.commit).not.toHaveBeenCalled()
    expect(committed).toEqual(['business-row'])
  })

  it('still runs when the audit module is absent — that is not a failure', async () => {
    // Disabling `audit_logs` is a legitimate downstream choice. An absent
    // service must not break commands; only a failing WRITE is fatal.
    registerHandler()
    const em = makeEm()
    const ctx = {
      container: {
        resolve: (name: string) => {
          if (name === 'em') return em
          if (name === 'dataEngine') return { flushOrmEntityChanges: async () => {} }
          throw new Error(`[internal] not registered: ${name}`)
        },
      },
      auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
      selectedOrganizationId: 'org-1',
    } as unknown as CommandRuntimeContext

    await expect(bus_execute(ctx)).resolves.toBeDefined()
    expect(em.commit).toHaveBeenCalledTimes(1)
    expect(committed).toEqual(['business-row'])

    async function bus_execute(runtimeCtx: CommandRuntimeContext) {
      return new CommandBus().execute(commandId, { input: {}, ctx: runtimeCtx })
    }
  })

  it('runs untransacted when no EntityManager is available', async () => {
    // Tests with a partial container, and any caller without the ORM
    // registered, must keep working rather than being refused.
    registerHandler()
    const ctx = {
      container: {
        resolve: (name: string) => {
          if (name === 'actionLogService') return { log: jest.fn(async () => ({})) }
          if (name === 'dataEngine') return { flushOrmEntityChanges: async () => {} }
          throw new Error(`[internal] not registered: ${name}`)
        },
      },
      auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: 'org-1' },
      selectedOrganizationId: 'org-1',
    } as unknown as CommandRuntimeContext

    await expect(new CommandBus().execute(commandId, { input: {}, ctx })).resolves.toBeDefined()
    expect(committed).toEqual(['business-row'])
  })
})
