/**
 * The gate that makes an obligation bind.
 *
 * Enforcement could refuse an act (`A0`) and nothing else. `A1` and `A2` — *"the
 * worker proposes; a human performs"* and *"executes only after approval"* —
 * were recorded as obligations while the act ran anyway, which is a control in
 * name only.
 *
 * What these tests protect is the narrow claim: **a held act does not run**, and
 * everything the gate declines to gate, it declines to gate on purpose.
 */

import { ActHeldForApprovalError, authorityCommandGate } from '../interceptors'
import { APPROVED_ACT_REPLAY } from '@open-mercato/core/modules/auth/services/pendingActService'

const TENANT = 'tenant-1'
const GATED_COMMAND = 'directory.organizations.update'
const UNMAPPED_COMMAND = 'example.todo.update'
const CAPABILITY = 'directory.organizations.manage'

const hold = jest.fn(async () => ({ id: 'act-1' }))

function makeContext(options: {
  mode?: string
  gate?: string | null
  commandId?: string
  markReplay?: boolean
  auth?: Record<string, unknown> | null
}) {
  const enforcement = {
    modeFor: jest.fn(async () => options.mode ?? 'enforce'),
    decideFor: jest.fn(async () => (options.gate
      ? {
          gate: options.gate,
          allowed: options.gate !== 'A0',
          bindingRule: 'effect-class-floor',
          reasons: [{ rule: 'effect-class-floor', ceiling: options.gate, detail: 'because' }],
          obligations: [],
          alternatives: [],
        }
      : null)),
  }
  const context: Record<string | symbol, unknown> = {
    commandId: options.commandId ?? GATED_COMMAND,
    capability: (options.commandId ?? GATED_COMMAND) === GATED_COMMAND ? CAPABILITY : null,
    auth: options.auth === undefined ? { sub: 'user-1', tenantId: TENANT, orgId: 'org-1' } : options.auth,
    selectedOrganizationId: 'org-1',
    container: {
      resolve: (name: string) => {
        if (name === 'authorityEnforcement') return enforcement
        if (name === 'pendingActService') return { hold }
        return null
      },
    },
  }
  if (options.markReplay) context[APPROVED_ACT_REPLAY] = 'act-1'
  return { context, enforcement }
}

beforeEach(() => {
  hold.mockClear()
})

describe('what the gate holds', () => {
  it('holds an act at A2 and stops it running', async () => {
    const { context } = makeContext({ gate: 'A2' })

    await expect(authorityCommandGate.beforeExecute!({ id: 'org-9' }, context as never))
      .rejects.toBeInstanceOf(ActHeldForApprovalError)
    expect(hold).toHaveBeenCalledTimes(1)
  })

  it('holds an act at A1 too', async () => {
    const { context } = makeContext({ gate: 'A1' })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).rejects.toBeInstanceOf(ActHeldForApprovalError)
  })

  it('tells the caller where the act went', async () => {
    // Three outcomes have to stay distinguishable: you may not, it failed, and
    // *not yet — here is where it went*. Collapsing the third makes the queue
    // invisible.
    const { context } = makeContext({ gate: 'A2' })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).rejects.toMatchObject({
      pendingActId: 'act-1',
      gate: 'A2',
      because: 'because',
      // 202: understood and accepted, but not done yet. A 403 would claim the
      // caller may never do this; a 500 invites a retry, and each retry queues
      // another copy of the same act.
      status: 202,
    })
  })
})

describe('what the gate lets through, deliberately', () => {
  it('does nothing while the tenant is only observing', async () => {
    const { context, enforcement } = makeContext({ mode: 'shadow', gate: 'A2' })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
    expect(enforcement.decideFor).not.toHaveBeenCalled()
    expect(hold).not.toHaveBeenCalled()
  })

  it('does not gate a command that declares no capability', async () => {
    // The resolver is keyed by capability and the bus by command. An unmapped
    // command is a visible gap, not a guess — deriving the mapping from the
    // naming convention would be a guess per command.
    const { context, enforcement } = makeContext({ gate: 'A2', commandId: UNMAPPED_COMMAND })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
    expect(enforcement.modeFor).not.toHaveBeenCalled()
  })

  it('leaves A0 to the route guard, which already refused it', async () => {
    const { context } = makeContext({ gate: 'A0' })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
    expect(hold).not.toHaveBeenCalled()
  })

  it('does not hold A3 or A4, which need machinery that does not exist', async () => {
    for (const gate of ['A3', 'A4', 'A5']) {
      const { context } = makeContext({ gate })
      await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
    }
    expect(hold).not.toHaveBeenCalled()
  })

  it('does not hold the replay of an act somebody already approved', async () => {
    // Otherwise approving queues a second copy and the queue cannot be emptied.
    const { context, enforcement } = makeContext({ gate: 'A2', markReplay: true })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
    expect(enforcement.modeFor).not.toHaveBeenCalled()
    expect(hold).not.toHaveBeenCalled()
  })

  it('does nothing without an authenticated tenant', async () => {
    const { context } = makeContext({ gate: 'A2', auth: null })

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
    expect(hold).not.toHaveBeenCalled()
  })

  it('does nothing when the services are not registered', async () => {
    // A lean bootstrap. An absent dependency is not evidence of a constraint.
    const context = {
      commandId: GATED_COMMAND,
      auth: { sub: 'user-1', tenantId: TENANT },
      selectedOrganizationId: null,
      container: { resolve: () => { throw new Error('not registered') } },
    }

    await expect(authorityCommandGate.beforeExecute!({}, context as never)).resolves.toBeUndefined()
  })
})
