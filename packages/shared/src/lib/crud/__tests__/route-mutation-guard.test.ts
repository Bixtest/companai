import type { AwilixContainer } from 'awilix'
import { registerMutationGuards } from '../mutation-guard-store'
import { bridgeLegacyGuard, type MutationGuard } from '../mutation-guard-registry'
import { runRouteMutationGuards, toRegistryMutationOperation } from '../route-mutation-guard'
import { createLogger } from '@open-mercato/shared/lib/logger'

jest.mock('@open-mercato/shared/lib/logger', () => {
  const mocked = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  }
  mocked.child.mockImplementation(() => mocked)
  return { createLogger: jest.fn(() => mocked) }
})
const loggerError = createLogger('shared').error as jest.Mock
const loggerWarn = createLogger('shared').warn as jest.Mock

type Registrations = Record<string, unknown>

function makeContainer(registrations: Registrations = {}): AwilixContainer {
  return {
    hasRegistration: (name: string) => Object.prototype.hasOwnProperty.call(registrations, name),
    resolve: (name: string) => {
      if (Object.prototype.hasOwnProperty.call(registrations, name)) return registrations[name]
      throw new Error(`[test] no registration for ${name}`)
    },
  } as unknown as AwilixContainer
}

function makeRequest(method = 'POST'): Request {
  return new Request('https://example.test/api/things', { method })
}

function makeGuard(overrides: Partial<MutationGuard> & { id: string }): MutationGuard {
  return {
    targetEntity: 'things.thing',
    operations: ['create', 'update', 'delete'],
    priority: 50,
    validate: jest.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  }
}

function registerStoreGuards(guards: MutationGuard[]) {
  registerMutationGuards([{ moduleId: 'things', guards }])
}

const baseAuth = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  organizationId: 'org-1',
  userFeatures: [] as string[],
}
const baseInput = {
  resourceKind: 'things.thing',
  resourceId: 'thing-1',
  operation: 'update' as const,
  mutationPayload: { title: 'Updated' },
}

afterEach(() => {
  registerMutationGuards([])
  jest.restoreAllMocks()
})

describe('toRegistryMutationOperation', () => {
  it('passes create and delete through and maps update/custom/undefined to update', () => {
    expect(toRegistryMutationOperation('create')).toBe('create')
    expect(toRegistryMutationOperation('delete')).toBe('delete')
    expect(toRegistryMutationOperation('update')).toBe('update')
    expect(toRegistryMutationOperation('custom')).toBe('update')
    expect(toRegistryMutationOperation(undefined)).toBe('update')
  })
})

describe('runRouteMutationGuards', () => {
  it('runs a registry-store guard the legacy bridge path would have skipped', async () => {
    const guard = makeGuard({ id: 'store-guard' })
    registerStoreGuards([guard])

    const result = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: baseAuth,
      input: baseInput,
    })

    expect(result.ok).toBe(true)
    expect(guard.validate).toHaveBeenCalledTimes(1)
  })

  it('blocks and returns a ready response when a store guard rejects', async () => {
    const guard = makeGuard({
      id: 'blocking-guard',
      validate: jest.fn().mockResolvedValue({ ok: false, status: 422, body: { error: 'nope' } }),
    })
    registerStoreGuards([guard])

    const result = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: baseAuth,
      input: baseInput,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected blocked result')
    expect(result.errorStatus).toBe(422)
    expect(result.errorBody).toEqual({ error: 'nope' })
    expect(result.response.status).toBe(422)
    await expect(result.response.json()).resolves.toEqual({ error: 'nope' })
  })

  it('threads modifiedPayload from a store guard', async () => {
    const guard = makeGuard({
      id: 'transform-guard',
      validate: jest.fn().mockResolvedValue({ ok: true, modifiedPayload: { extra: true } }),
    })
    registerStoreGuards([guard])

    const result = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: baseAuth,
      input: baseInput,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected passed result')
    expect(result.modifiedPayload).toEqual({ title: 'Updated', extra: true })
  })

  it('runs afterSuccess callbacks via runAfterSuccess()', async () => {
    const afterSuccess = jest.fn().mockResolvedValue(undefined)
    const guard = makeGuard({
      id: 'after-guard',
      validate: jest.fn().mockResolvedValue({ ok: true, shouldRunAfterSuccess: true, metadata: { ping: 1 } }),
      afterSuccess,
    })
    registerStoreGuards([guard])

    const result = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: baseAuth,
      input: baseInput,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected passed result')
    expect(afterSuccess).not.toHaveBeenCalled()

    await result.runAfterSuccess()

    expect(afterSuccess).toHaveBeenCalledTimes(1)
    expect(afterSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ resourceKind: 'things.thing', resourceId: 'thing-1', metadata: { ping: 1 } }),
    )
  })

  it('swallows afterSuccess callback errors so a committed write still succeeds', async () => {
    loggerError.mockClear()
    const guard = makeGuard({
      id: 'throwing-after-guard',
      validate: jest.fn().mockResolvedValue({ ok: true, shouldRunAfterSuccess: true }),
      afterSuccess: jest.fn().mockRejectedValue(new Error('after boom')),
    })
    registerStoreGuards([guard])

    const result = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: baseAuth,
      input: baseInput,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected passed result')
    await expect(result.runAfterSuccess()).resolves.toBeUndefined()
    expect(loggerError).toHaveBeenCalledWith('Mutation guard afterSuccess failed', expect.objectContaining({ guardId: 'throwing-after-guard' }))
  })

  it('skips feature-gated guards when the caller lacks the feature', async () => {
    const guard = makeGuard({
      id: 'gated-guard',
      features: ['premium.locks'],
      validate: jest.fn().mockResolvedValue({ ok: false, message: 'should not run' }),
    })
    registerStoreGuards([guard])

    const passes = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: { ...baseAuth, userFeatures: [] },
      input: baseInput,
    })
    expect(passes.ok).toBe(true)
    expect(guard.validate).not.toHaveBeenCalled()

    const blocks = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: { ...baseAuth, userFeatures: ['premium.locks'] },
      input: baseInput,
    })
    expect(blocks.ok).toBe(false)
  })

  it('resolves userFeatures from rbacService when not pre-supplied', async () => {
    const getGrantedFeatures = jest.fn().mockResolvedValue(['premium.locks'])
    const guard = makeGuard({
      id: 'gated-guard',
      features: ['premium.locks'],
      validate: jest.fn().mockResolvedValue({ ok: false, message: 'blocked via rbac-resolved features' }),
    })
    registerStoreGuards([guard])

    const result = await runRouteMutationGuards({
      container: makeContainer({ rbacService: { getGrantedFeatures } }),
      req: makeRequest(),
      auth: { userId: 'user-1', tenantId: 'tenant-1', organizationId: 'org-1' },
      input: baseInput,
    })

    expect(getGrantedFeatures).toHaveBeenCalledWith('user-1', { tenantId: 'tenant-1', organizationId: 'org-1' })
    expect(result.ok).toBe(false)
  })

  it('maps a custom operation to update so update-scoped guards run', async () => {
    const updateGuard = makeGuard({
      id: 'update-only-guard',
      operations: ['update'],
      validate: jest.fn().mockResolvedValue({ ok: true }),
    })
    const createGuard = makeGuard({
      id: 'create-only-guard',
      operations: ['create'],
      validate: jest.fn().mockResolvedValue({ ok: true }),
    })
    registerStoreGuards([updateGuard, createGuard])

    const result = await runRouteMutationGuards({
      container: makeContainer(),
      req: makeRequest(),
      auth: baseAuth,
      input: { ...baseInput, operation: 'custom' },
    })

    expect(result.ok).toBe(true)
    expect(updateGuard.validate).toHaveBeenCalledTimes(1)
    expect(createGuard.validate).not.toHaveBeenCalled()
  })

  it('includes the bridged legacy DI guard', async () => {
    const legacyService = {
      validateMutation: jest.fn().mockResolvedValue({ ok: false, status: 409, body: { error: 'locked' } }),
      afterMutationSuccess: jest.fn().mockResolvedValue(undefined),
    }

    const result = await runRouteMutationGuards({
      container: makeContainer({ crudMutationGuardService: legacyService }),
      req: makeRequest('PUT'),
      auth: baseAuth,
      input: baseInput,
    })

    expect(legacyService.validateMutation).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected blocked result')
    expect(result.errorStatus).toBe(409)
    expect(result.errorBody).toEqual({ error: 'locked' })
  })

  it('warns only once when the registered legacy guard cannot be resolved', () => {
    delete (globalThis as Record<string, unknown>).__openMercatoCrudMutationGuardResolutionWarningEmitted__
    loggerWarn.mockClear()
    const resolutionError = new Error('Could not resolve scopedEm')
    const container = {
      hasRegistration: () => true,
      resolve: () => {
        throw resolutionError
      },
    } as unknown as AwilixContainer

    expect(bridgeLegacyGuard(container)).toBeNull()
    expect(bridgeLegacyGuard(container)).toBeNull()
    expect(loggerWarn).toHaveBeenCalledTimes(1)
    expect(loggerWarn).toHaveBeenCalledWith(
      'CRUD mutation guard service could not be resolved; the legacy guard bridge is disabled',
      { err: resolutionError },
    )
  })

  // S12 / SD-4 slice B — the actor axis must survive the whole trip from the
  // route's declared `auth` into the guard, on BOTH the validate call and the
  // afterSuccess call. Proving it only at the registry type level would be a
  // decorative field; this is the transport contract.
  describe('actorKind transport (S12 / SD-4 slice B)', () => {
    it('carries auth.actorKind into the validate input', async () => {
      const guard = makeGuard({ id: 'actor-reading-guard' })
      registerStoreGuards([guard])

      const result = await runRouteMutationGuards({
        container: makeContainer(),
        req: makeRequest(),
        auth: { ...baseAuth, actorKind: 'ai_worker' },
        input: baseInput,
      })

      expect(result.ok).toBe(true)
      expect(guard.validate).toHaveBeenCalledTimes(1)
      expect(guard.validate).toHaveBeenCalledWith(
        expect.objectContaining({ actorKind: 'ai_worker' }),
      )
    })

    it('carries auth.actorKind into the afterSuccess input', async () => {
      const afterSuccess = jest.fn().mockResolvedValue(undefined)
      const guard = makeGuard({
        id: 'actor-after-guard',
        validate: jest.fn().mockResolvedValue({ ok: true, shouldRunAfterSuccess: true }),
        afterSuccess,
      })
      registerStoreGuards([guard])

      const result = await runRouteMutationGuards({
        container: makeContainer(),
        req: makeRequest(),
        auth: { ...baseAuth, actorKind: 'service' },
        input: baseInput,
      })

      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('expected passed result')
      await result.runAfterSuccess()

      expect(afterSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ actorKind: 'service' }),
      )
    })

    it('leaves actorKind undefined when the route does not declare one (no behaviour change for legacy callers)', async () => {
      const guard = makeGuard({ id: 'legacy-guard' })
      registerStoreGuards([guard])

      const result = await runRouteMutationGuards({
        container: makeContainer(),
        req: makeRequest(),
        auth: baseAuth,
        input: baseInput,
      })

      expect(result.ok).toBe(true)
      // The field is present on the input object but explicitly undefined — a
      // legacy guard that never reads it is byte-for-byte unaffected, and a
      // structural guard that does read it must fail closed on undefined.
      const call = (guard.validate as jest.Mock).mock.calls[0][0] as { actorKind?: unknown }
      expect(call.actorKind).toBeUndefined()
    })
  })

  // D3 — the route wrapper is where consumers read the result, so the three
  // outcomes must be distinguishable *here*, not only in the runner.
  describe('escalate (D3)', () => {
    const escalation = {
      gate: 'A3',
      rule: 'things.review-required',
      because: 'High-value thing edits need a second pair of eyes.',
    }

    it('returns escalated:true, ok:true and a 202 response — held, not performed', async () => {
      const guard = makeGuard({
        id: 'escalating-guard',
        validate: jest.fn().mockResolvedValue({ ok: true, escalation }),
      })
      registerStoreGuards([guard])

      const result = await runRouteMutationGuards({
        container: makeContainer(),
        req: makeRequest(),
        auth: baseAuth,
        input: baseInput,
      })

      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('expected a non-blocked result')
      expect(result.escalated).toBe(true)
      if (!result.escalated) throw new Error('expected an escalated result')
      expect(result.escalation).toEqual(escalation)
      // 202 by default: the request was accepted *and held*, never 2xx-as-committed.
      expect(result.errorStatus).toBe(202)
      expect(result.response.status).toBe(202)
      await expect(result.response.json()).resolves.toEqual({
        status: 'pending_review',
        escalation: { gate: 'A3', rule: 'things.review-required', because: 'High-value thing edits need a second pair of eyes.' },
      })
    })

    it('honours an explicit escalation status when the guard supplies one', async () => {
      const guard = makeGuard({
        id: 'escalating-with-status',
        validate: jest.fn().mockResolvedValue({ ok: true, escalation: { ...escalation, status: 409 } }),
      })
      registerStoreGuards([guard])

      const result = await runRouteMutationGuards({
        container: makeContainer(),
        req: makeRequest(),
        auth: baseAuth,
        input: baseInput,
      })

      if (!result.ok || !result.escalated) throw new Error('expected an escalated result')
      expect(result.errorStatus).toBe(409)
      expect(result.response.status).toBe(409)
    })

    it('does not expose runAfterSuccess or modifiedPayload on an escalated result', async () => {
      const guard = makeGuard({
        id: 'escalating-guard',
        validate: jest.fn().mockResolvedValue({ ok: true, escalation, modifiedPayload: { sneaky: true } }),
      })
      registerStoreGuards([guard])

      const result = await runRouteMutationGuards({
        container: makeContainer(),
        req: makeRequest(),
        auth: baseAuth,
        input: baseInput,
      })

      if (!result.ok || !result.escalated) throw new Error('expected an escalated result')
      // The trap this closes: reading `ok:true` and then calling runAfterSuccess()
      // on a write that never happened.
      expect('runAfterSuccess' in result).toBe(false)
      expect('modifiedPayload' in result).toBe(false)
    })

    it('lets the bridged legacy DI guard escalate too (no new interface needed)', async () => {
      // A legacy service only speaks ok/block; but a *registry* guard escalating
      // must still win over a legacy pass, so the union is exercised end-to-end.
      const guard = makeGuard({
        id: 'escalating-guard',
        validate: jest.fn().mockResolvedValue({ ok: true, escalation }),
      })
      registerStoreGuards([guard])
      const legacyService = {
        validateMutation: jest.fn().mockResolvedValue({ ok: true }),
        afterMutationSuccess: jest.fn().mockResolvedValue(undefined),
      }

      const result = await runRouteMutationGuards({
        container: makeContainer({ crudMutationGuardService: legacyService }),
        req: makeRequest('PUT'),
        auth: baseAuth,
        input: baseInput,
      })

      if (!result.ok || !result.escalated) throw new Error('expected an escalated result')
      expect(result.escalation.rule).toBe('things.review-required')
    })
  })
})
