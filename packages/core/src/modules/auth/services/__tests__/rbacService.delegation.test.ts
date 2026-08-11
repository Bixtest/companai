/**
 * The one thing in RBAC that turns a `false` into a `true`.
 *
 * Every other change to this service narrows. A delegation grants — that is the
 * feature — so these tests exist to pin the shape of that power precisely, and
 * most of them are about what it must *not* do.
 *
 * The ordering matters as much as the rule: delegations are consulted only after
 * the ordinary ACL has said no, and the authority resolver still runs afterwards
 * and can still refuse. A delegation gets somebody past the grant, not past
 * everything.
 */
import { RbacService } from '../rbacService'

const TENANT = 'tenant-1'
const SCOPE = { tenantId: TENANT, organizationId: 'org-1' }
const APPROVE = 'auth.authority.approve'
const MANAGE = 'directory.organizations.manage'

function makeService(options: {
  aclAllows?: boolean
  delegatedCapabilities?: string[]
  withDelegations?: boolean
} = {}) {
  const activeFor = jest.fn(async (_grantee: string, capabilityId: string) => (
    (options.delegatedCapabilities ?? []).includes(capabilityId)
      ? { id: 'delegation-1', grantorPrincipalId: 'priya', capabilityId }
      : null
  ))

  const service = new RbacService(
    {} as never,
    undefined,
    null,
    options.withDelegations === false ? null : { activeFor },
  )

  // The ACL layer and the resolver are both stubbed: this file is about the
  // wiring between them, and exercising either for real would test something
  // already covered elsewhere.
  const internals = service as unknown as Record<string, unknown>
  internals.decideAllFeatures = jest.fn(async () => options.aclAllows === true)
  internals.shadowResolver = jest.fn()
  internals.refusedByAuthority = jest.fn(async () => false)

  return { service, activeFor, internals }
}

describe('a delegation gets somebody past the grant', () => {
  it('allows a capability the actor does not hold themselves', async () => {
    const { service } = makeService({ aclAllows: false, delegatedCapabilities: [APPROVE] })

    expect(await service.userHasAllFeatures('sam', [APPROVE], SCOPE)).toBe(true)
  })

  it('still refuses one nobody delegated', async () => {
    const { service } = makeService({ aclAllows: false, delegatedCapabilities: [APPROVE] })

    expect(await service.userHasAllFeatures('sam', [MANAGE], SCOPE)).toBe(false)
  })
})

describe('what it must not do', () => {
  it('requires a delegation for every capability, not just one', async () => {
    // The widest bug available here: returning true because one of three matched
    // would authorise an act that needs all three.
    const { service } = makeService({ aclAllows: false, delegatedCapabilities: [APPROVE] })

    expect(await service.userHasAllFeatures('sam', [APPROVE, MANAGE], SCOPE)).toBe(false)
  })

  it('does not rescue an act the authority resolver refuses', async () => {
    // A delegation gets somebody past the grant, not past everything. The
    // resolver still runs and still narrows.
    const { service, internals } = makeService({ aclAllows: false, delegatedCapabilities: [APPROVE] })
    internals.refusedByAuthority = jest.fn(async () => true)

    expect(await service.userHasAllFeatures('sam', [APPROVE], SCOPE)).toBe(false)
  })

  it('is not consulted at all when the actor already holds the capability', async () => {
    // Ordering, and the reason the extra query is affordable: the hot path never
    // reaches it. Only the request that was about to 403 pays.
    const { service, activeFor } = makeService({ aclAllows: true, delegatedCapabilities: [APPROVE] })

    expect(await service.userHasAllFeatures('sam', [APPROVE], SCOPE)).toBe(true)
    expect(activeFor).not.toHaveBeenCalled()
  })

  it('grants nothing without a tenant', async () => {
    const { service, activeFor } = makeService({ aclAllows: false, delegatedCapabilities: [APPROVE] })

    expect(await service.userHasAllFeatures('sam', [APPROVE], { tenantId: null, organizationId: null })).toBe(false)
    expect(activeFor).not.toHaveBeenCalled()
  })

  it('grants nothing when no delegation service is registered', async () => {
    // A lean bootstrap has no delegations rather than failing open.
    const { service } = makeService({ aclAllows: false, withDelegations: false })

    expect(await service.userHasAllFeatures('sam', [APPROVE], SCOPE)).toBe(false)
  })

  it('grants nothing when nothing was required', async () => {
    const { service, activeFor } = makeService({ aclAllows: false })

    await service.userHasAllFeatures('sam', [], SCOPE)
    expect(activeFor).not.toHaveBeenCalled()
  })
})

describe('the principal, not the subject string', () => {
  it('looks up an API key by its id rather than its prefixed subject', async () => {
    // A delegation is held by a principal. Looking up `api_key:abc` verbatim
    // would never match a row written against `abc`, and the delegation would
    // silently do nothing.
    const { service, activeFor } = makeService({ aclAllows: false, delegatedCapabilities: [APPROVE] })

    await service.userHasAllFeatures('api_key:abc', [APPROVE], SCOPE)

    expect(activeFor).toHaveBeenCalledWith('abc', APPROVE, SCOPE)
  })
})
