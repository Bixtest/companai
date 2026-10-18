/**
 * The read path's half — and the exact line `CC-124` lived on.
 *
 * **The defect.** `withheldFromThisPerson` and `grantedByDelegation` both
 * resolved the actor with `parseSubject(userId).id` and passed **only the bare
 * id** to `blocking()` / `activeFor()`. The tables they read store a principal as
 * a bare id *plus a kind column*, and the write paths accepted the prefixed
 * encoding the entity docblock advertised. So a denial naming a machine —
 * `subjectPrincipalId: "ai_worker:<key-id>"`, `subjectKind: "ai_worker"` — was
 * written, audited, listed, and **never applied**, because the lookup asked for
 * `<key-id>` and the row said `ai_worker:<key-id>`.
 *
 * The existing suite (`rbacService.denial.test.ts`) covers this seam by stubbing
 * `blocking` — see its `makeService` at line 24 — and asserts only *that* it was
 * called. A stub at the line where the defect lives is a green claim over a
 * subset: the wiring is proven, the identifier it is wired with is not.
 *
 * This file closes that. It asserts the **arguments** — the bare id *and* the
 * kind, for a person and for a machine, on both paths. If somebody reverts the
 * lookup to an id alone, which is the defect itself, these fail.
 */
import { RbacService } from '../rbacService'
import { aiWorkerSubject, apiKeySubject } from '@open-mercato/shared/lib/auth/principal'

const SCOPE = { tenantId: 'tenant-1', organizationId: null }
const REFUND = 'sales.refund'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const KEY_ID = '22222222-2222-4222-8222-222222222222'

/**
 * The service under test, with every collaborator stubbed but the lookups
 * recorded. `allow` drives `decideAllFeatures`, which is what decides whether the
 * delegation path runs at all — see the ordering test at the bottom.
 */
function makeService(options: { allow?: boolean } = {}) {
  const blocking = jest.fn(async () => null)
  const activeFor = jest.fn(async () => null)

  const service = new RbacService(
    {} as never,
    undefined,
    null,
    { activeFor } as never,
    { blocking } as never,
  )

  const internals = service as unknown as Record<string, unknown>
  internals.decideAllFeatures = jest.fn(async () => options.allow !== false)
  internals.shadowResolver = jest.fn()
  internals.refusedByAuthority = jest.fn(async () => false)

  return { service, blocking, activeFor }
}

describe('what the denial lookup is asked for', () => {
  it('a person: the bare id, and the kind', async () => {
    const { service, blocking } = makeService({ allow: true })

    await service.userHasAllFeatures(USER_ID, [REFUND], SCOPE)

    expect(blocking).toHaveBeenCalledTimes(1)
    const [subject, required, scope, kind] = blocking.mock.calls[0]
    expect(subject).toBe(USER_ID)
    expect(kind).toBe('human')
    expect(required).toEqual([REFUND])
    expect(scope).toBe(SCOPE)
  })

  it('a machine: the bare id, and the kind', async () => {
    // The real path. The row the write path now stores is `subjectKind:
    // 'ai_worker'` over the **bare** key id, so this is the pair the lookup has
    // to send for a machine's denial to be findable at all.
    const { service, blocking } = makeService({ allow: true })

    await service.userHasAllFeatures(aiWorkerSubject(KEY_ID), [REFUND], SCOPE)

    expect(blocking).toHaveBeenCalledTimes(1)
    const [subject, , , kind] = blocking.mock.calls[0]
    expect(subject).toBe(KEY_ID)
    expect(kind).toBe('ai_worker')
  })

  it('a service key: the same pair, its own kind', async () => {
    const { service, blocking } = makeService({ allow: true })

    await service.userHasAllFeatures(apiKeySubject(KEY_ID), [REFUND], SCOPE)

    const [subject, , , kind] = blocking.mock.calls[0]
    expect(subject).toBe(KEY_ID)
    expect(kind).toBe('service')
  })
})

describe('what the delegation lookup is asked for', () => {
  it('a machine: the bare id, and the kind', async () => {
    // The same defect on the grant side: a delegation granted to
    // `ai_worker:<key-id>` was never found because the lookup passed the bare
    // id alone. That fails *closed* — a grant that should have applied did not —
    // which is why it survived: nobody reports a permission they never saw.
    const { service, activeFor } = makeService({ allow: false })

    await service.userHasAllFeatures(aiWorkerSubject(KEY_ID), [REFUND], SCOPE)

    expect(activeFor).toHaveBeenCalledTimes(1)
    const [subject, capability, scope, kind] = activeFor.mock.calls[0]
    expect(subject).toBe(KEY_ID)
    expect(kind).toBe('ai_worker')
    expect(capability).toBe(REFUND)
    expect(scope).toBe(SCOPE)
  })

  it('is not consulted when the ACL already allowed the act', async () => {
    // The ordering guarantee, re-stated from the pair the lookup now sends: a
    // permission somebody genuinely holds never pays for the delegation query.
    const { service, activeFor } = makeService({ allow: true })

    await service.userHasAllFeatures(aiWorkerSubject(KEY_ID), [REFUND], SCOPE)

    expect(activeFor).not.toHaveBeenCalled()
  })
})
