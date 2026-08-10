/**
 * Enforcement — the switch that makes the resolver's answer binding.
 *
 * The property that matters most here is negative: **enforcement can only
 * narrow.** It runs after RBAC has already said yes, and there is no path
 * through it that turns a refusal into an allowance. The tests are written so
 * that a future rearrangement which broke that would fail loudly rather than
 * quietly widen somebody's authority.
 */

import {
  AuthorityEnforcementService,
  DEFAULT_ENFORCEMENT_MODE,
  isEnforcementMode,
} from '../authorityEnforcementService'
import { clearCapabilityRegistry, registerCapabilityDescriptors } from '@open-mercato/shared/lib/capabilities/registry'

const TENANT = 'tenant-1'
const ORGANIZATION = 'org-team'
const SUBJECT = 'user-1'

const READ = 'directory.organizations.view'
const WRITE = 'directory.organizations.manage'

function configReturning(mode: unknown) {
  return {
    getValue: jest.fn(async <T>(_module: string, _name: string, options?: { defaultValue?: T | null }) =>
      (mode === undefined ? (options?.defaultValue ?? null) : mode) as T | null),
  }
}

function graphReturning(ceiling: string, because = 'an edge caps authority here') {
  return {
    cachedCeilingFor: jest.fn(async () => ({
      ceiling: ceiling as never,
      basis: 'edges',
      contributingEdges: because ? [{ because }] : [],
    })),
  }
}

beforeAll(() => {
  registerCapabilityDescriptors([
    {
      id: READ,
      title: 'View organizations',
      module: 'directory',
      capability: { effectClass: 'E0', reversibility: 'reversible' },
    },
    {
      id: WRITE,
      title: 'Manage organizations',
      module: 'directory',
      capability: { effectClass: 'E5', reversibility: 'reversible' },
    },
  ])
})

afterAll(() => {
  clearCapabilityRegistry()
})

describe('which mode a tenant is in', () => {
  it('observes rather than enforces until somebody chooses', async () => {
    const service = new AuthorityEnforcementService(null, configReturning(undefined))

    expect(await service.modeFor(TENANT)).toBe(DEFAULT_ENFORCEMENT_MODE)
    expect(DEFAULT_ENFORCEMENT_MODE).toBe('shadow')
  })

  it('reads the mode per tenant, not per instance', async () => {
    const config = configReturning('enforce')
    const service = new AuthorityEnforcementService(null, config)

    await service.modeFor(TENANT)

    expect(config.getValue).toHaveBeenCalledWith(
      'auth',
      'authority.enforcement',
      expect.objectContaining({ scope: { tenantId: TENANT } }),
    )
  })

  it('falls back rather than enforcing on a value it does not recognise', async () => {
    // A typo in a config row must not be able to start refusing traffic.
    const service = new AuthorityEnforcementService(null, configReturning('enforced'))

    expect(await service.modeFor(TENANT)).toBe('shadow')
  })

  it('accepts only the three modes', () => {
    expect(isEnforcementMode('enforce')).toBe(true)
    expect(isEnforcementMode('shadow')).toBe(true)
    expect(isEnforcementMode('off')).toBe(true)
    expect(isEnforcementMode('on')).toBe(false)
  })
})

describe('what enforcement refuses', () => {
  const scope = { tenantId: TENANT, organizationId: ORGANIZATION }

  it('refuses nothing while the tenant is only observing', async () => {
    // The graph says A0. In shadow that is a recording, not a refusal — which is
    // the whole point of having a mode between off and enforcing.
    const graph = graphReturning('A0')
    const service = new AuthorityEnforcementService(graph, configReturning('shadow'))

    expect(await service.refusalFor(SUBJECT, [WRITE], scope)).toBeNull()
    // And it does not pay for a ceiling it has no use for.
    expect(graph.cachedCeilingFor).not.toHaveBeenCalled()
  })

  it('refuses an act the organization graph blocks', async () => {
    const service = new AuthorityEnforcementService(graphReturning('A0'), configReturning('enforce'))

    const refusal = await service.refusalFor(SUBJECT, [WRITE], scope)

    expect(refusal).not.toBeNull()
    expect(refusal!.capabilityId).toBe(WRITE)
    expect(refusal!.decision.allowed).toBe(false)
  })

  it('carries the reason out with the refusal', async () => {
    // A 403 whose reason lives only inside a resolver is the thing R5 exists to
    // abolish; enforcement would reintroduce it if the answer left no trace.
    const service = new AuthorityEnforcementService(
      graphReturning('A0', 'this branch is advised, not owned'),
      configReturning('enforce'),
    )

    const refusal = await service.refusalFor(SUBJECT, [WRITE], scope)

    const binding = refusal!.decision.reasons.find((reason) => reason.rule === refusal!.decision.bindingRule)
    expect(binding?.detail).toContain('advised, not owned')
  })

  it('allows an act the graph merely limits', async () => {
    // A2 is a real constraint and enforcement does not act on it, because the
    // platform cannot hold an act and resume it after approval. Refusing here
    // would be enforcing a control that does not exist.
    const service = new AuthorityEnforcementService(graphReturning('A2'), configReturning('enforce'))

    expect(await service.refusalFor(SUBJECT, [WRITE], scope)).toBeNull()
  })

  it('does not refuse a capability no module describes', async () => {
    // Enforcing on absence would turn every wildcard and every un-described
    // feature into a denial — a migration failure wearing a security costume.
    const service = new AuthorityEnforcementService(graphReturning('A0'), configReturning('enforce'))

    expect(await service.refusalFor(SUBJECT, ['nothing.declares_this'], scope)).toBeNull()
  })

  it('stops at the first refusal instead of resolving the rest', async () => {
    const graph = graphReturning('A0')
    const service = new AuthorityEnforcementService(graph, configReturning('enforce'))

    await service.refusalFor(SUBJECT, [WRITE, READ], scope)

    expect(graph.cachedCeilingFor).toHaveBeenCalledTimes(1)
  })

  it('reads no graph when there is no organization to place the actor in', async () => {
    const graph = graphReturning('A0')
    const service = new AuthorityEnforcementService(graph, configReturning('enforce'))

    const refusal = await service.refusalFor(SUBJECT, [WRITE], { tenantId: TENANT, organizationId: null })

    expect(graph.cachedCeilingFor).not.toHaveBeenCalled()
    expect(refusal).toBeNull()
  })

  it('degrades to allowing when the graph is not wired at all', async () => {
    // An absent dependency is not evidence of a constraint.
    const service = new AuthorityEnforcementService(null, configReturning('enforce'))

    expect(await service.refusalFor(SUBJECT, [WRITE], scope)).toBeNull()
  })

  it('lets an infrastructure failure surface instead of turning it into a denial', async () => {
    // The platform already takes this position for session resolution: a
    // database that cannot answer is a transient failure, not a permission
    // answer. Inventing a refusal would tell a user they lack a permission they
    // hold, and inventing an allowance would disable the control exactly when
    // something is wrong.
    const graph = {
      cachedCeilingFor: jest.fn(async () => { throw new Error('[internal] pool exhausted') }),
    }
    const service = new AuthorityEnforcementService(graph, configReturning('enforce'))

    await expect(service.refusalFor(SUBJECT, [WRITE], scope)).rejects.toThrow('pool exhausted')
  })
})
