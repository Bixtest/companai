/**
 * SD-1 — the hook: the permissions-on-change gate on the entities change path.
 *
 * **What this suite has to prove.** The gate is only worth anything if it is
 * actually *on* the change path and actually *stops* something. So these tests go
 * through the real registry runner (`runMutationGuards`) — the same call the
 * entities routes make through `beginEntitiesMutationGuard` — and assert three
 * things:
 *
 *   1. a well-formed create **passes** (the gate defaults; the change is not
 *      blocked, because a default is a decision);
 *   2. a create that **cannot name the surface it creates is refused** — the
 *      fail-closed case, and the reason the guard exists;
 *   3. the guard **does not fire on an update**, because the batch definitions
 *      endpoint maps to `'update'` and would otherwise be broken by it.
 *
 * The last one is a deliberate scope boundary, proven rather than assumed: a guard
 * that fired on updates would break the batch save, so it must not.
 */

import { runMutationGuards, type MutationGuardInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { guards, fieldDefinitionSurface, entityDefinitionSurface } from '../guards'

const FIELD_GUARD_ID = 'entities.field_definition.requires-permission-decision'

function input(partial: Partial<MutationGuardInput>): MutationGuardInput {
  return {
    tenantId: 't1',
    organizationId: 'o1',
    userId: 'u1',
    resourceId: null,
    requestMethod: 'POST',
    requestHeaders: new Headers(),
    mutationPayload: null,
    ...partial,
  } as MutationGuardInput
}

const ctx = { userFeatures: [] as string[] }

function guardById(id: string) {
  const guard = guards.find((g) => g.id === id)
  if (!guard) throw new Error(`guard ${id} not registered`)
  return guard
}

describe('surface helpers reuse the platform’s own id convention', () => {
  it('a field surface is <entityId>.<key>', () => {
    expect(fieldDefinitionSurface('customers:customer_person', 'loyalty_tier')).toMatchObject({
      id: 'customers:customer_person.loyalty_tier',
      kind: 'field',
      source: 'recorded',
    })
  })

  it('an entity surface reuses entities.records.<id> as its record prefix', () => {
    expect(entityDefinitionSurface('customers:customer_person')).toMatchObject({
      id: 'customers:customer_person',
      kind: 'object',
      featurePrefix: 'entities.records.customers:customer_person',
    })
  })
})

describe('the guard is on the create path and lets a well-formed create through', () => {
  it('passes a new custom field (entityId + key)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'create',
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier', kind: 'text' },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
    expect(result.errorBody).toBeUndefined()
  })

  it('passes a new custom entity (entityId)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.entity',
        operation: 'create',
        mutationPayload: { entityId: 'customers:customer_person', label: 'People' },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
  })

  it('carries the gate’s default decision in metadata for the caller to write', async () => {
    const result = await guardById(FIELD_GUARD_ID).validate(
      input({
        resourceKind: 'entities.field_definition',
        operation: 'create',
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
      }),
    )
    expect(result.ok).toBe(true)
    const decision = (result.metadata as { permissionDecision?: { outcome?: string } } | undefined)?.permissionDecision
    expect(decision?.outcome).toBe('defaulted')
  })
})

describe('the guard REFUSES (fail closed) — the load-bearing half', () => {
  it('blocks a field create that names no surface (no key)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'create',
        mutationPayload: { entityId: 'customers:customer_person' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
    expect(JSON.stringify(result.errorBody)).toContain('permissions')
  })

  it('blocks a field create whose surface id the matcher could not read', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'create',
        mutationPayload: { entityId: 'not a valid id', key: 'loyalty_tier' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
  })

  it('blocks an entity create that names no surface (no entityId)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.entity',
        operation: 'create',
        mutationPayload: { label: 'People' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
  })
})

describe('scope boundary — the guard does NOT fire on updates (the batch path)', () => {
  it('leaves an update untouched, so the batch definitions save is not broken', async () => {
    // The batch endpoint maps to `'update'` and carries only { entityId, definitionCount }.
    // If this guard fired here it would refuse a legitimate save, so it must not.
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'update',
        mutationPayload: { entityId: 'customers:customer_person', definitionCount: 3 },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
  })
})

describe('regression — the pre-existing guards still fire', () => {
  it('still refuses a reserved system-column key on create', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'create',
        mutationPayload: { entityId: 'customers:customer_person', key: 'created_at' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result.errorBody)).toContain('system column')
  })

  it('still refuses a malformed field key on create', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'create',
        mutationPayload: { entityId: 'customers:customer_person', key: 'Loyalty-Tier' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
  })
})
