/**
 * `CC-128` — the capability ceiling binds superadmins, and its refusal names the ceiling.
 *
 * **R2 of the plan is the whole point.** `loadAcl` answers `{ isSuperAdmin: true, features: ['*'] }`
 * before scope is consulted (`rbacService.ts:317-323`), and `['*']` matches every capability
 * (`featureMatch.ts:45-46`). So the defect the row records is that *one tenant's superadmin is every
 * tenant's*. The ceiling is applied where the ACL has already said yes — `holdsCapability` — which is
 * the only place that can narrow a `*`.
 *
 * **The second assertion that matters is the MESSAGE.** Both causes — "the grant does not include it"
 * and "the tenant may never hold it" — arrive as `holdsCapability: false`, so a message that blames the
 * grant sends an operator to the wrong table. `CC-103`'s lesson, one layer down.
 */
import { AuthorityEnforcementService } from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const INSIDE = 'ai_assistant.view'
const OUTSIDE = 'ai_assistant.settings.manage'
const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

/**
 * `DEFAULT_ENFORCEMENT_MODE` is `'shadow'`, so `refusalFor` returns before asking anything when no
 * moduleConfig is wired. That is correct behaviour — the resolver is a report in shadow mode — but it
 * would make the batch assertion vacuous, so this fake says `enforce`.
 */
const ENFORCING_CONFIG = {
  getValue: async () => 'enforce',
}

function makeService(ceiling: Map<string, string> | null) {
  const calls: Array<{ tenantId: string | null; capabilities: readonly string[] }> = []
  const reader = ceiling
    ? {
        refusalsFor: async (tenantId: string | null, capabilities: readonly string[]) => {
          calls.push({ tenantId, capabilities })
          const out = new Map<string, string>()
          for (const capability of capabilities) {
            const refusal = ceiling.get(capability)
            if (refusal) out.set(capability, refusal)
          }
          return out
        },
      }
    : null
  const service = new AuthorityEnforcementService(
    null,
    ENFORCING_CONFIG as never,
    null, null, null, null, null,
    reader as never,
  )
  return { service, calls }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    { id: INSIDE, title: 'Use the assistant', module: 'ai_assistant', capability: { effectClass: 'E1', reversibility: 'reversible' } },
    { id: OUTSIDE, title: 'Change assistant settings', module: 'ai_assistant', capability: { effectClass: 'E4', reversibility: 'reversible' } },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('CC-128 — decideFor honours the ceiling', () => {
  it('refuses a capability the tenant may never hold, even though the ACL granted it', async () => {
    const { service } = makeService(new Map([[OUTSIDE, `The tenant's capability ceiling does not include ${OUTSIDE}`]]))
    const decision = await service.decideFor('super-admin', OUTSIDE, SCOPE)
    expect(decision).not.toBeNull()
    expect(decision!.allowed).toBe(false)
    expect(decision!.gate).toBe('A0')
    expect(decision!.bindingRule).toBe('grant')
  })

  it('names the CEILING, not the grant, in the reason', async () => {
    const { service } = makeService(new Map([[OUTSIDE, `The tenant's capability ceiling does not include ${OUTSIDE}`]]))
    const decision = await service.decideFor('super-admin', OUTSIDE, SCOPE)
    const detail = decision!.reasons[0]?.detail ?? ''
    expect(detail).toMatch(/capability ceiling/)
    // the wrong cause would read "The actor does not hold …"
    expect(detail).not.toMatch(/^The actor does not hold/)
  })

  it('lets a capability INSIDE the ceiling through to the ordinary rules', async () => {
    const { service } = makeService(new Map())
    const decision = await service.decideFor('super-admin', INSIDE, SCOPE)
    expect(decision).not.toBeNull()
    // allowed, and no reason mentions a ceiling — the ceiling had nothing to say about it
    expect(decision!.allowed).toBe(true)
    expect(decision!.reasons.some((r) => /capability ceiling/.test(r.detail))).toBe(false)
  })

  it('asks the reader for the caller\'s tenant, so a tenant cannot borrow another\'s ceiling', async () => {
    const { service, calls } = makeService(new Map())
    await service.decideFor('super-admin', INSIDE, SCOPE)
    expect(calls[0]?.tenantId).toBe('tenant-1')
  })

  it('reads the ceiling ONCE for a list of capabilities, not once per capability', async () => {
    const { service, calls } = makeService(new Map())
    await service.refusalFor('super-admin', [INSIDE, OUTSIDE], SCOPE)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.capabilities).toEqual([INSIDE, OUTSIDE])
  })

  it('refusalFor returns the ceiling refusal as the binding one', async () => {
    const { service } = makeService(new Map([[OUTSIDE, `The platform capability ceiling does not include ${OUTSIDE}`]]))
    const refusal = await service.refusalFor('super-admin', [OUTSIDE], SCOPE)
    expect(refusal).not.toBeNull()
    expect(refusal!.decision.bindingRule).toBe('grant')
    expect(refusal!.decision.reasons[0]?.detail).toMatch(/platform capability ceiling/)
  })

  it('with NO reader wired, behaviour is exactly what it was before CC-128', async () => {
    const { service } = makeService(null)
    const decision = await service.decideFor('super-admin', OUTSIDE, SCOPE)
    // no ceiling means no ceiling refusal: the ACL's yes stands, unchanged
    expect(decision!.allowed).toBe(true)
    expect(decision!.reasons.some((r) => /capability ceiling/.test(r.detail))).toBe(false)
  })
})
