import { matchesEntity, runMutationGuards } from '../mutation-guard-registry'
import type { MutationGuard, MutationGuardInput } from '../mutation-guard-registry'

describe('matchesEntity', () => {
  it('matches wildcard "*" against any entity', () => {
    expect(matchesEntity('*', 'customers.person')).toBe(true)
    expect(matchesEntity('*', 'example.todo')).toBe(true)
  })

  it('matches exact entity', () => {
    expect(matchesEntity('example.todo', 'example.todo')).toBe(true)
    expect(matchesEntity('example.todo', 'example.item')).toBe(false)
  })

  it('matches prefix wildcard (module.*)', () => {
    expect(matchesEntity('example.*', 'example.todo')).toBe(true)
    expect(matchesEntity('example.*', 'example.item')).toBe(true)
    expect(matchesEntity('example.*', 'customers.person')).toBe(false)
  })

  it('does not match partial prefix without wildcard', () => {
    expect(matchesEntity('example', 'example.todo')).toBe(false)
  })
})

describe('runMutationGuards', () => {
  const baseInput: MutationGuardInput = {
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    userId: 'user-1',
    resourceKind: 'example.todo',
    resourceId: 'todo-1',
    operation: 'update',
    requestMethod: 'PUT',
    requestHeaders: new Headers(),
    mutationPayload: { title: 'Updated' },
  }

  function makeGuard(overrides: Partial<MutationGuard> & { id: string }): MutationGuard {
    return {
      targetEntity: 'example.todo',
      operations: ['create', 'update', 'delete'],
      priority: 50,
      validate: jest.fn().mockResolvedValue({ ok: true }),
      ...overrides,
    }
  }

  it('returns ok when no guards match', async () => {
    const guard = makeGuard({ id: 'g1', targetEntity: 'other.entity' })
    const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(true)
    expect(guard.validate).not.toHaveBeenCalled()
  })

  it('runs matching guards in priority order', async () => {
    const callOrder: string[] = []
    const g1 = makeGuard({
      id: 'g1',
      priority: 20,
      validate: jest.fn(async () => { callOrder.push('g1'); return { ok: true } }),
    })
    const g2 = makeGuard({
      id: 'g2',
      priority: 10,
      validate: jest.fn(async () => { callOrder.push('g2'); return { ok: true } }),
    })
    const result = await runMutationGuards([g1, g2], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(true)
    expect(callOrder).toEqual(['g2', 'g1'])
  })

  it('stops on first rejection', async () => {
    const g1 = makeGuard({
      id: 'g1',
      priority: 10,
      validate: jest.fn().mockResolvedValue({ ok: false, message: 'Blocked', status: 403 }),
    })
    const g2 = makeGuard({
      id: 'g2',
      priority: 20,
      validate: jest.fn().mockResolvedValue({ ok: true }),
    })
    const result = await runMutationGuards([g1, g2], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(403)
    expect(result.errorBody).toEqual({ error: 'Blocked', guardId: 'g1' })
    expect(g2.validate).not.toHaveBeenCalled()
  })

  it('accumulates modified payload across guards', async () => {
    const g1 = makeGuard({
      id: 'g1',
      priority: 10,
      validate: jest.fn().mockResolvedValue({ ok: true, modifiedPayload: { extra: true } }),
    })
    const g2 = makeGuard({
      id: 'g2',
      priority: 20,
      validate: jest.fn(async (input) => {
        expect(input.mutationPayload).toEqual({ title: 'Updated', extra: true })
        return { ok: true }
      }),
    })
    const result = await runMutationGuards([g1, g2], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(true)
    expect(result.modifiedPayload).toEqual({ title: 'Updated', extra: true })
  })

  it('collects afterSuccess callbacks', async () => {
    const afterFn = jest.fn()
    const guard = makeGuard({
      id: 'g1',
      validate: jest.fn().mockResolvedValue({ ok: true, shouldRunAfterSuccess: true, metadata: { x: 1 } }),
      afterSuccess: afterFn,
    })
    const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(true)
    expect(result.afterSuccessCallbacks).toHaveLength(1)
    expect(result.afterSuccessCallbacks[0].guard).toBe(guard)
    expect(result.afterSuccessCallbacks[0].metadata).toEqual({ x: 1 })
  })

  it('filters guards by operation type', async () => {
    const guard = makeGuard({
      id: 'g1',
      operations: ['delete'],
      validate: jest.fn().mockResolvedValue({ ok: true }),
    })
    const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(true)
    expect(guard.validate).not.toHaveBeenCalled()
  })

  it('filters guards by ACL features', async () => {
    const guard = makeGuard({
      id: 'g1',
      features: ['premium.locks'],
      validate: jest.fn().mockResolvedValue({ ok: false, message: 'Should not run' }),
    })

    const resultWithout = await runMutationGuards([guard], baseInput, { userFeatures: [] })
    expect(resultWithout.ok).toBe(true)

    const resultWith = await runMutationGuards([guard], baseInput, { userFeatures: ['premium.locks'] })
    expect(resultWith.ok).toBe(false)
  })

  it('accepts wildcard ACL features', async () => {
    const guard = makeGuard({
      id: 'g1',
      features: ['premium.locks'],
      validate: jest.fn().mockResolvedValue({ ok: false, message: 'Blocked by wildcard' }),
    })

    const resultWithWildcard = await runMutationGuards([guard], baseInput, { userFeatures: ['premium.*'] })

    expect(resultWithWildcard.ok).toBe(false)
    expect(resultWithWildcard.errorBody).toEqual({ error: 'Blocked by wildcard', guardId: 'g1' })
  })

  it('uses custom error body when provided', async () => {
    const guard = makeGuard({
      id: 'g1',
      validate: jest.fn().mockResolvedValue({ ok: false, body: { custom: 'error' } }),
    })
    const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
    expect(result.ok).toBe(false)
    expect(result.errorBody).toEqual({ custom: 'error' })
  })

  // D3 — the third outcome. These tests pin the boundary between the three
  // results so a future edit cannot quietly collapse "held for a person" into
  // either "refused" or "performed".
  describe('escalate (D3)', () => {
    const escalation = {
      gate: 'A3',
      rule: 'example.review-required',
      because: 'This change moves money and must be signed off.',
    }

    it('reports ok:true AND carries the escalation — escalate is not a refusal', async () => {
      const guard = makeGuard({
        id: 'g1',
        validate: jest.fn().mockResolvedValue({ ok: true, escalation }),
      })
      const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
      // ok:true is the whole point: the guard is not saying "no".
      expect(result.ok).toBe(true)
      // ...but it is also not saying "yes" — the escalation is the third fact.
      expect(result.escalation).toEqual(escalation)
      // A refusal would carry these; an escalate must not.
      expect(result.errorBody).toBeUndefined()
      expect(result.errorStatus).toBeUndefined()
    })

    it('runs no afterSuccess and queues no callbacks — nothing was performed', async () => {
      const afterFn = jest.fn()
      const guard = makeGuard({
        id: 'g1',
        validate: jest.fn().mockResolvedValue({
          ok: true,
          escalation,
          // A guard that asks for a review must not also ask for cleanup: if this
          // were honoured, afterSuccess would run against a write that never landed.
          shouldRunAfterSuccess: true,
          metadata: { should: 'not survive' },
        }),
        afterSuccess: afterFn,
      })
      const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
      expect(result.escalation).toEqual(escalation)
      expect(result.afterSuccessCallbacks).toHaveLength(0)
    })

    it('drops modifiedPayload — a held mutation must not look transformed', async () => {
      const guard = makeGuard({
        id: 'g1',
        validate: jest.fn().mockResolvedValue({ ok: true, escalation, modifiedPayload: { sneaky: true } }),
      })
      const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
      expect(result.escalation).toEqual(escalation)
      // Carrying a payload the caller might merge back is exactly the trap this
      // guards against: the payload must never reach the write.
      expect(result.modifiedPayload).toBeUndefined()
    })

    it('short-circuits: a later guard never runs once a review is requested', async () => {
      const escalating = makeGuard({
        id: 'escalating',
        priority: 10,
        validate: jest.fn().mockResolvedValue({ ok: true, escalation }),
      })
      const later = makeGuard({
        id: 'later',
        priority: 20,
        validate: jest.fn().mockResolvedValue({ ok: true }),
      })
      const result = await runMutationGuards([escalating, later], baseInput, { userFeatures: [] })
      expect(result.escalation).toEqual(escalation)
      expect(later.validate).not.toHaveBeenCalled()
    })

    it('a refusal still wins when it comes first — block is not softened into escalate', async () => {
      const blocker = makeGuard({
        id: 'blocker',
        priority: 10,
        validate: jest.fn().mockResolvedValue({ ok: false, status: 403, message: 'no' }),
      })
      const escalating = makeGuard({
        id: 'escalating',
        priority: 20,
        validate: jest.fn().mockResolvedValue({ ok: true, escalation }),
      })
      const result = await runMutationGuards([blocker, escalating], baseInput, { userFeatures: [] })
      expect(result.ok).toBe(false)
      expect(result.escalation).toBeUndefined()
      expect(escalating.validate).not.toHaveBeenCalled()
    })

    it('a guard that never sets escalation behaves exactly as before', async () => {
      const guard = makeGuard({ id: 'g1', validate: jest.fn().mockResolvedValue({ ok: true }) })
      const result = await runMutationGuards([guard], baseInput, { userFeatures: [] })
      expect(result.ok).toBe(true)
      expect(result.escalation).toBeUndefined()
    })
  })
})
