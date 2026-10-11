/**
 * `CC-61` / LIST row 19 — **the command contract is uniform** (`C6b`).
 *
 * The command bus is real (`~122` command files) — *"every action goes through
 * one typed command"* holds. What did **not** hold is *"the full contract uniform
 * across every action"*: `CommandHandler` carried `capability` / `execute` /
 * `undo` / `redo` and **no `risk`, `approval`, or `idempotency`** at all. This
 * suite proves the three facets now exist **and are recorded**, and — the half
 * that matters for not breaking the platform — that a command declaring **none**
 * of them writes a log **identical** to before.
 *
 * It also pins the **enforcement split** (`S5`): `approval` **declares**; the
 * authority layer enforces. Nothing here refuses on `approval: 'required'`,
 * because doing so in the bus would be a second permission engine.
 */
import { createContainer, asValue, InjectionMode } from 'awilix'
import {
  commandRegistry,
  registerCommand,
  CommandBus,
  commandContractMetadata,
} from '@open-mercato/shared/lib/commands'

function makeBus() {
  const logMock = jest.fn(async () => ({ id: 'log-entry' }))
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC })
  container.register({ actionLogService: asValue({ log: logMock }) })
  const bus = new CommandBus()
  const ctx = {
    container,
    auth: { sub: 'user-1', tenantId: 'tenant-1', orgId: null },
    organizationScope: null,
    selectedOrganizationId: null,
    organizationIds: null,
  }
  return { bus, ctx, logMock }
}

describe('CC-61 — the command contract is uniform (risk / approval / idempotency)', () => {
  afterEach(() => {
    commandRegistry.clear()
  })

  it('commandContractMetadata is null when a handler declares nothing', () => {
    expect(commandContractMetadata({})).toBeNull()
  })

  it('records the declared values, and `hasKey` — never the keyOf function', () => {
    const contract = commandContractMetadata({
      risk: 'high',
      approval: 'required',
      idempotency: { idempotent: true, keyOf: () => 'dedupe-key' },
    })
    expect(contract).toEqual({
      risk: 'high',
      approval: 'required',
      idempotency: { idempotent: true, hasKey: true },
    })
    // The function is never serialized onto the record.
    expect(JSON.stringify(contract)).not.toContain('keyOf')
    expect(JSON.stringify(contract)).not.toContain('dedupe-key')
  })

  it('records only what was declared (a partial declaration stays partial)', () => {
    expect(commandContractMetadata({ risk: 'low' })).toEqual({ risk: 'low' })
    expect(commandContractMetadata({ idempotency: { idempotent: false } })).toEqual({
      idempotency: { idempotent: false, hasKey: false },
    })
  })

  it('a DECLARING command records the contract on the action log', async () => {
    registerCommand({
      id: 'test.declaring',
      risk: 'high',
      approval: 'required',
      idempotency: { idempotent: true, keyOf: () => 'k' },
      execute: async () => ({ ok: true }),
      buildLog: () => ({ actionLabel: 'X', resourceKind: 'test', resourceId: '1' }),
    })
    const { bus, ctx, logMock } = makeBus()

    await bus.execute('test.declaring', { input: {}, ctx })

    const payload = logMock.mock.calls[0][0] as Record<string, unknown>
    expect(payload.context).toEqual({
      commandContract: {
        risk: 'high',
        approval: 'required',
        idempotency: { idempotent: true, hasKey: true },
      },
    })
  })

  it('records the contract even when the handler has NO buildLog (caller metadata)', async () => {
    // Found by the CC-61 hostile critic: the first draft merged the contract
    // inside `buildLog`, which returns null when a handler has no `buildLog` — so
    // a declaring handler with no `buildLog` recorded nothing, even though a log
    // IS written from caller-supplied `metadata`. "Uniform" has to mean uniform.
    registerCommand({
      id: 'test.no-buildlog',
      risk: 'medium',
      execute: async () => ({ ok: true }),
    })
    const { bus, ctx, logMock } = makeBus()

    await bus.execute('test.no-buildlog', {
      input: {},
      ctx,
      metadata: { actionLabel: 'L', resourceKind: 'test', resourceId: '9' },
    })

    const payload = logMock.mock.calls[0][0] as Record<string, unknown>
    expect(payload.context).toEqual({ commandContract: { risk: 'medium' } })
  })

  it('a NON-declaring command adds NO key — its log is unchanged', async () => {
    registerCommand({
      id: 'test.plain',
      execute: async () => ({ ok: true }),
      buildLog: () => ({ actionLabel: 'Y', resourceKind: 'test', resourceId: '2' }),
    })
    const { bus, ctx, logMock } = makeBus()

    await bus.execute('test.plain', { input: {}, ctx })

    const payload = logMock.mock.calls[0][0] as Record<string, unknown>
    expect('context' in payload).toBe(false)
  })

  it('preserves a context the handler already set', async () => {
    registerCommand({
      id: 'test.with-context',
      risk: 'low',
      execute: async () => ({ ok: true }),
      buildLog: () => ({
        actionLabel: 'Z',
        resourceKind: 'test',
        resourceId: '3',
        context: { note: 'keep-me' },
      }),
    })
    const { bus, ctx, logMock } = makeBus()

    await bus.execute('test.with-context', { input: {}, ctx })

    const payload = logMock.mock.calls[0][0] as Record<string, unknown>
    expect(payload.context).toEqual({ note: 'keep-me', commandContract: { risk: 'low' } })
  })

  it('approval DECLARES — the bus does not refuse on it (S5: one engine)', async () => {
    // If the bus refused on `approval: 'required'` it would be a second
    // permission engine. It must run; the authority layer is the gate.
    registerCommand({
      id: 'test.approval-required',
      approval: 'required',
      execute: async () => ({ ran: true }),
      buildLog: () => ({ actionLabel: 'A', resourceKind: 'test', resourceId: '4' }),
    })
    const { bus, ctx } = makeBus()

    const { result } = await bus.execute('test.approval-required', { input: {}, ctx })

    expect(result).toEqual({ ran: true })
  })
})
