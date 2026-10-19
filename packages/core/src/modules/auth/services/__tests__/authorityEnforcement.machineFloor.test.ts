/**
 * `CC-125` — the floor in the resolver: a machine cannot hold what no configuration may grant it.
 *
 * **The two assertions that matter.** (1) The floor applies to a MACHINE and not to a human — the whole
 * point is that somebody must still mint keys and grant roles, so a floor that refused everybody would be
 * the system locking itself out. (2) When both the floor and the ceiling refuse, the reason names the
 * **floor**, because that is the one no configuration can lift — naming the ceiling would send an operator
 * to raise a ceiling that would not help.
 */
import { AuthorityEnforcementService } from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'
import { aiWorkerSubject, apiKeySubject, parseSubject, systemSubject } from '@open-mercato/shared/lib/auth/principal'

const FLOORED = 'auth.roles.manage'
const ORDINARY = 'ai_assistant.view'
const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

const ENFORCING_CONFIG = { getValue: async () => 'enforce' }

/** A ceiling reader that refuses nothing, so any refusal below is the floor's. */
const EMPTY_CEILING = { refusalsFor: async () => new Map<string, string>() }

function makeService(ceiling: { refusalsFor: (t: string | null, c: readonly string[]) => Promise<Map<string, string>> } = EMPTY_CEILING) {
  return new AuthorityEnforcementService(null, ENFORCING_CONFIG as never, null, null, null, null, null, ceiling as never)
}

beforeAll(() => {
  registerCapabilityDescriptors([
    { id: FLOORED, title: 'Manage roles', module: 'auth', capability: { effectClass: 'E5', reversibility: 'reversible' } },
    { id: ORDINARY, title: 'Use the assistant', module: 'ai_assistant', capability: { effectClass: 'E1', reversibility: 'reversible' } },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('CC-125 — the floor in decideFor', () => {
  it('refuses a floor capability to an ai_worker, however the ACL answered', async () => {
    const decision = await makeService().decideFor('ai_worker:key-1', FLOORED, SCOPE)
    expect(decision).not.toBeNull()
    expect(decision!.allowed).toBe(false)
    expect(decision!.gate).toBe('A0')
    expect(decision!.reasons[0]?.detail).toMatch(/machine floor/)
  })

  it('refuses it to a service key too — the floor has no privileged kind', async () => {
    const decision = await makeService().decideFor('api_key:key-2', FLOORED, SCOPE)
    expect(decision!.allowed).toBe(false)
    expect(decision!.reasons[0]?.detail).toMatch(/machine floor/)
  })

  it('ALLOWS it to a human — somebody has to mint the keys', async () => {
    const decision = await makeService().decideFor('user-1', FLOORED, SCOPE)
    expect(decision!.allowed).toBe(true)
    expect(decision!.reasons.some((r) => /machine floor/.test(r.detail))).toBe(false)
  })

  it('leaves an ordinary capability alone for a machine', async () => {
    const decision = await makeService().decideFor('ai_worker:key-1', ORDINARY, SCOPE)
    expect(decision!.allowed).toBe(true)
  })

  it('names the FLOOR when the ceiling refuses too — raising a ceiling would not help', async () => {
    const refusingCeiling = {
      refusalsFor: async () => new Map([[FLOORED, "The tenant's capability ceiling does not include it"]]),
    }
    const decision = await makeService(refusingCeiling).decideFor('ai_worker:key-1', FLOORED, SCOPE)
    const detail = decision!.reasons[0]?.detail ?? ''
    expect(detail).toMatch(/machine floor/)
    expect(detail).not.toMatch(/capability ceiling/)
  })

  it('the floor is CODE, not configuration — nothing in the service can turn it off', async () => {
    // No option, no setting and no ceiling entry exempts a machine. The only way past it is to edit
    // `machineFloor.ts` and redeploy, which is the cost it should have.
    //
    // The subjects come from the platform's own encoders, not from string concatenation. `service:` is
    // NOT a subject prefix — a service principal authenticates as `api_key:<id>` and the PARSER decides
    // the kind. Concatenating the kind name into a subject tests a subject the platform cannot produce:
    // `parseSubject('service:x')` answers `human`, the widest kind, past both floor and ceiling. That is
    // how this test was first written, and it went red for that reason — a test of a string, not of the
    // rule. The two encoders below are the only two subject forms a machine can hold.
    for (const subject of [aiWorkerSubject('x'), apiKeySubject('x')]) {
      const decision = await makeService().decideFor(subject, FLOORED, SCOPE)
      expect(decision!.allowed).toBe(false)
    }
  })

  it('★ a `system` principal IS a machine now — `CC-136` taught the parser, and the floor binds it', async () => {
    // The hole this replaces was measured from two directions and pinned so it stayed visible:
    //
    // (1) THE PARSER. `PrincipalKind` declared 'system' and `parseSubject` could never produce it — it
    //     knew `ai_worker:` and `api_key:` and called everything else `human`. A kind with no
    //     inhabitants, the same shape `CC-107` fixed for `ai_worker`.
    // (2) THE RESOLVER. `decideFor` takes a subject string and parses it, so a platform act — and the
    //     `system:` form is not hypothetical: `packages/create-app/template/src/modules/
    //     example_customers_sync/lib/` builds it — arrived as the WIDEST kind, and `human` is the one
    //     kind the floor does not bind.
    //
    // Both halves are fixed, and **fixing only the parser would not have been enough**:
    // `derivePrincipal` re-derives the kind from two booleans whose fall-through is `human`, so it
    // needed the arm too. That second half is asserted in `principal.test.ts`.
    expect(parseSubject(systemSubject('x'))).toEqual({ kind: 'system', id: 'x' })

    const decision = await makeService().decideFor(systemSubject('x'), FLOORED, SCOPE)
    expect(decision!.allowed).toBe(false)
    expect(decision!.reasons[0]?.detail).toMatch(/machine floor/)

    // And it is a LIST of seven ids, not a blanket refusal: the same subject still gets an ordinary
    // capability. A floor that refused a platform act everything would be the platform unable to run.
    const ordinary = await makeService().decideFor(systemSubject('x'), ORDINARY, SCOPE)
    expect(ordinary!.allowed).toBe(true)
  })
})
