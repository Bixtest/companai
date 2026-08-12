/**
 * A permission taken away from one person, at the point it is enforced.
 *
 * The pure rules are covered in `shared/modules/__tests__/denials.test.ts`. This
 * file is about the wiring, and specifically about the one property the wiring
 * has to have: **a denial can only ever subtract.**
 *
 * The ordering carries that guarantee. Denials are consulted only after the
 * grant path has already said yes, so there is no arrangement of denial rows
 * that permits an act the ACL refused. Several tests below exist purely to fail
 * if somebody ever moves the call earlier.
 */
import { RbacService } from '../rbacService'

const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }
const REFUND = 'sales.refund'
const VIEW = 'sales.view'

function makeService(options: {
  aclAllows?: boolean
  deniedFeatures?: string[]
  withDenials?: boolean
} = {}) {
  const blocking = jest.fn(async (_subject: string, required: readonly string[]) => {
    const hit = required.find((feature) => (options.deniedFeatures ?? []).includes(feature))
    return hit
      ? { feature: hit, denial: { reason: 'under investigation', expiresAt: null } }
      : null
  })

  const service = new RbacService(
    {} as never,
    undefined,
    null,
    null,
    options.withDenials === false ? null : { blocking },
  )

  // The ACL layer and the resolver are stubbed: this file is about the wiring
  // between them, and exercising either for real tests something covered
  // elsewhere.
  const internals = service as unknown as Record<string, unknown>
  internals.decideAllFeatures = jest.fn(async () => options.aclAllows !== false)
  internals.shadowResolver = jest.fn()
  internals.refusedByAuthority = jest.fn(async () => false)

  return { service, blocking, internals }
}

describe('a denial takes a permission away', () => {
  it('refuses a permission the actor otherwise holds', async () => {
    const { service } = makeService({ deniedFeatures: [REFUND] })

    expect(await service.userHasAllFeatures('sam', [REFUND], SCOPE)).toBe(false)
  })

  it('leaves every other permission alone', async () => {
    // The whole point. Removing a role would have taken this away too.
    const { service } = makeService({ deniedFeatures: [REFUND] })

    expect(await service.userHasAllFeatures('sam', [VIEW], SCOPE)).toBe(true)
  })

  it('stops an act that needs a denied permission among others', async () => {
    const { service } = makeService({ deniedFeatures: [REFUND] })

    expect(await service.userHasAllFeatures('sam', [VIEW, REFUND], SCOPE)).toBe(false)
  })

  it('applies to whoever the check is about, including a superadmin', async () => {
    // `decideAllFeatures` short-circuits to true for a superadmin, and this
    // still runs afterwards. A control the most powerful account ignores is a
    // suggestion, not a control.
    const { service } = makeService({ aclAllows: true, deniedFeatures: [REFUND] })

    expect(await service.userHasAllFeatures('the-superadmin', [REFUND], SCOPE)).toBe(false)
  })
})

describe('what it must never do', () => {
  it('cannot permit an act the ACL refused', async () => {
    // The property the whole design rests on. No denial row, present or absent,
    // may turn a false into a true.
    const { service } = makeService({ aclAllows: false, deniedFeatures: [] })

    expect(await service.userHasAllFeatures('sam', [REFUND], SCOPE)).toBe(false)
  })

  it('is not even consulted when the ACL already said no', async () => {
    // Guards the ordering directly. If this ever fails, somebody moved the call
    // above the grant check and the subtraction has become a decision point.
    const { service, blocking } = makeService({ aclAllows: false })

    await service.userHasAllFeatures('sam', [REFUND], SCOPE)

    expect(blocking).not.toHaveBeenCalled()
  })

  it('does not stop the authority resolver from still refusing', async () => {
    // A denial is one narrowing among several, not the last word.
    const { service, internals } = makeService({ deniedFeatures: [] })
    internals.refusedByAuthority = jest.fn(async () => true)

    expect(await service.userHasAllFeatures('sam', [REFUND], SCOPE)).toBe(false)
  })
})

describe('when nothing is withheld', () => {
  it('permits the act', async () => {
    const { service } = makeService({ deniedFeatures: [] })

    expect(await service.userHasAllFeatures('sam', [REFUND], SCOPE)).toBe(true)
  })

  it('works when no denial service is wired at all', async () => {
    // Every existing bootstrap that does not register one must keep working
    // exactly as before.
    const { service } = makeService({ withDenials: false })

    expect(await service.userHasAllFeatures('sam', [REFUND], SCOPE)).toBe(true)
  })

  it('does not query for an act that requires no permissions', async () => {
    const { service, blocking } = makeService()

    await service.userHasAllFeatures('sam', [], SCOPE)

    expect(blocking).not.toHaveBeenCalled()
  })

  it('does not query outside a tenant', async () => {
    // A denial is tenant-scoped. Without one there is nothing to look up, and
    // asking would scan every tenant's rows.
    const { service, blocking } = makeService()

    await service.userHasAllFeatures('sam', [REFUND], { tenantId: null, organizationId: null })

    expect(blocking).not.toHaveBeenCalled()
  })
})
