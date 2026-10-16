/**
 * The record id, threaded from the payload to the lock.
 *
 * A record's own state — frozen, or restricted — is the one ceiling that is not
 * about the actor: a locked contract is locked for everybody, and no amount of
 * trust or delegation reaches past it. It reaches the resolver through
 * `decideFor`'s `recordId` option, and **the command gate is the only
 * production caller that supplies one** — `refusalFor` (the route guard's
 * path) threads no record id, and the AI tool path threads only
 * `onBehalfOfUserId`. So the gate's `readRecordId` is where a lock either
 * binds or silently does not.
 *
 * The hole this file pins (audit A1-09 / triage T-32): `readRecordId` accepted
 * only RFC-4122 v1–v5 ids. A valid v7 id failed the pattern, the record id
 * arrived at the resolver as `null`, `resourceCeilingFor` returned early on
 * `!recordId` — and the lock was never looked up. A restricted record named by
 * a v7 id ran without the approval the design requires.
 *
 * What these tests protect: **the id in the payload reaches the lock reader,
 * whatever version it is** — and only for ids that are actually UUID-shaped.
 * The state rules themselves belong to `record-locks.test.ts` and
 * `authorityEnforcement.recordLock.test.ts`; this holds the wiring in front of
 * them, which is where the defect lived.
 *
 * | Break this | These tests go red |
 * | --- | --- |
 * | restore the pre-fix pattern (`[1-5]`, `[89ab]`) | THE HOLE (both) · an uppercase id · a locked record |
 * | `readRecordId` returns the raw candidate (no shape check) | a slug is not a record id |
 * | drop the pattern's `/i` | an uppercase id |
 * | `readRecordId` returns null always (threading removed) | every threading test |
 * | the gate passes `A0` through again (pre-T-45) | a locked record is refused (both) |
 */

import { ActHeldForApprovalError, AuthorityRefusedError, authorityCommandGate } from '../interceptors'
import { AuthorityEnforcementService } from '../../services/authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const TENANT = 'tenant-1'
const GATED_COMMAND = 'directory.organizations.update'
const CAPABILITY = 'directory.organizations.manage'
const SCOPE = { tenantId: TENANT, organizationId: 'org-1' }

/** A v7 id — time-ordered, version nibble 7, RFC-4122 variant. */
const V7_ID = '018f4a2c-5b3d-7e4f-8a9b-0c1d2e3f4a5b'
/** A v4 id — what `gen_random_uuid()` produces today. */
const V4_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
/** The same v7 id, uppercase — UUIDs are commonly exported uppercase. */
const V7_UPPER = '018F4A2C-5B3D-7E4F-8A9B-0C1D2E3F4A5B'

const hold = jest.fn(async () => ({ id: 'act-1' }))

/**
 * The real resolver, with only the record-lock reader and the enforcement mode
 * supplied — every other ceiling reads null and contributes nothing. That is
 * the point: the decision the gate receives is the record lock's, and nothing
 * else's, so a test that goes red went red because of the lock.
 */
function makeEnforcement(lock: { state: string; reason: string | null } | null) {
  const stateFor = jest.fn(async () => lock)
  const service = new AuthorityEnforcementService(
    null,
    {
      getValue: async (moduleId: string, name: string) =>
        name === 'authority.enforcement' ? 'enforce' : null,
    } as never,
    null,
    { stateFor } as never,
  )
  return { service, stateFor }
}

function makeContext(service: AuthorityEnforcementService) {
  return {
    commandId: GATED_COMMAND,
    capability: CAPABILITY,
    auth: { sub: 'user-1', tenantId: TENANT, orgId: 'org-1' },
    selectedOrganizationId: 'org-1',
    container: {
      resolve: (name: string) => {
        if (name === 'authorityEnforcement') return service
        if (name === 'pendingActService') return { hold, holdUntilCommit: jest.fn() }
        return null
      },
    },
  } as never
}

beforeEach(() => {
  hold.mockClear()
})

beforeAll(() => {
  registerCapabilityDescriptors([
    {
      id: CAPABILITY,
      title: 'Manage organizations',
      module: 'directory',
      capability: { effectClass: 'E4', reversibility: 'reversible' },
    },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('THE HOLE — a v7 record id (audit A1-09 / triage T-32)', () => {
  it('threads a v7 id to the lock reader', async () => {
    // The decisive assertion: the lock reader is asked about *this* record,
    // by its real id. Before the fix the pattern rejected v7, `readRecordId`
    // returned null, and this call never happened — no lock lookup, no
    // project context, no grade.
    const { service, stateFor } = makeEnforcement({ state: 'open', reason: null })

    await authorityCommandGate.beforeExecute({ id: V7_ID }, makeContext(service))

    expect(stateFor).toHaveBeenCalledWith(V7_ID, SCOPE)
  })

  it('holds a write to a restricted record named by a v7 id', async () => {
    // End to end, through the real resolver: the restricted state produces
    // A2, and the gate holds A2. Before the fix the id never reached the
    // reader, the decision carried no record ceiling, and the command ran.
    const { service } = makeEnforcement({ state: 'restricted', reason: 'pending the Q3 audit' })

    await expect(authorityCommandGate.beforeExecute({ id: V7_ID }, makeContext(service)))
      .rejects.toBeInstanceOf(ActHeldForApprovalError)
    expect(hold).toHaveBeenCalledTimes(1)
  })
})

describe('ids that must keep threading', () => {
  it('threads a v4 record id', async () => {
    const { service, stateFor } = makeEnforcement({ state: 'open', reason: null })

    await authorityCommandGate.beforeExecute({ id: V4_ID }, makeContext(service))

    expect(stateFor).toHaveBeenCalledWith(V4_ID, SCOPE)
  })

  it('threads an uppercase id', async () => {
    // UUIDs are commonly exported uppercase; the pattern's `/i` is deliberate.
    const { service, stateFor } = makeEnforcement({ state: 'open', reason: null })

    await authorityCommandGate.beforeExecute({ id: V7_UPPER }, makeContext(service))

    expect(stateFor).toHaveBeenCalledWith(V7_UPPER, SCOPE)
  })
})

describe('ids that must not', () => {
  it('does not look up a lock for a slug or a numeric id', async () => {
    // The docblock's collision defence: a slug or a numeric id from some
    // other command's payload must not constrain a real record's lock.
    const { service, stateFor } = makeEnforcement({ state: 'open', reason: null })
    const context = makeContext(service)

    await expect(authorityCommandGate.beforeExecute({ id: 'org-9' }, context))
      .resolves.toBeUndefined()
    await expect(authorityCommandGate.beforeExecute({ id: '12345' }, context))
      .resolves.toBeUndefined()

    expect(stateFor).not.toHaveBeenCalled()
  })

  it('does not look up a lock for a create', async () => {
    // A create names no record. Looking one up would be a query per create
    // for an answer that cannot exist.
    const { service, stateFor } = makeEnforcement({ state: 'open', reason: null })

    await expect(authorityCommandGate.beforeExecute({}, makeContext(service)))
      .resolves.toBeUndefined()

    expect(stateFor).not.toHaveBeenCalled()
  })
})

describe('a locked record is refused, not passed (T-45)', () => {
  it('refuses a write to a locked record named by a v7 id', async () => {
    // The lock produces A0. The gate now refuses A0 instead of passing it
    // through — which is what closed T-45: before, the write proceeded. The
    // route guard cannot make this refusal, because `refusalFor` threads no
    // record id; only this gate does.
    const { service, stateFor } = makeEnforcement({ state: 'locked', reason: 'frozen pending review' })

    await expect(authorityCommandGate.beforeExecute({ id: V7_ID }, makeContext(service)))
      .rejects.toBeInstanceOf(AuthorityRefusedError)

    // The lock was still looked up — T-32's threading — and the act did not run.
    expect(stateFor).toHaveBeenCalledWith(V7_ID, SCOPE)
    expect(hold).not.toHaveBeenCalled()
  })

  it('refuses a locked record named by a v4 id too', async () => {
    // The refusal is the lock's, not the id version's: a v4-named locked record
    // is refused exactly as a v7-named one is.
    const { service } = makeEnforcement({ state: 'locked', reason: null })

    await expect(authorityCommandGate.beforeExecute({ id: V4_ID }, makeContext(service)))
      .rejects.toBeInstanceOf(AuthorityRefusedError)
  })
})
