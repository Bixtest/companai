/**
 * SD-4 — the structural guard (S11): a protected object may not be DROPped or
 * RE-TYPED.
 *
 * **What this suite has to prove.** A structural guard is only worth anything if
 * it (a) is actually on the structural write path, (b) *stops* a write to a
 * protected object, and (c) *does not* stop an ordinary one — because a guard
 * that fires on everything would break every tenant's own schema edits.
 *
 * So these tests go through the real registry runner (`runMutationGuards`) — the
 * same call the entities routes make through `beginEntitiesMutationGuard` — and
 * assert the cases that matter, including the one the FIRST draft got wrong:
 *
 *   1. a **delete** of a field on a **core table** (`auth:user`) is refused;
 *   2. an **update** (re-type) of a field on a core table is refused;
 *   3. a protected **entity** delete (`auth:user` the entity) is refused;
 *   4. an ordinary tenant object is **allowed** — the guard is not wall-to-wall.
 *
 * **The namespace this pins.** The route passes `entityId` in the platform's
 * entity-id form (`auth:user`), NOT a table name (`users`). The guard decides via
 * `isReservedSystemEntityType` (the SD-2b predicate whose seed is the entity-id
 * form of the core/platform_release tables) — this suite proves that bridge is the
 * one in use, by passing entity ids and expecting them refused.
 *
 * Plus the structural boundaries: a `create` is not this guard's business, and a
 * non-reserved object is allowed.
 */

import { runMutationGuards, type MutationGuardInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { guards, structuralGuardRefusal } from '../guards'

const GUARD_ID = 'entities.structural.core-object-guard'

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

describe('the structural guard is registered and scoped to delete/update', () => {
  it('is in the module’s guard list', () => {
    expect(guardById(GUARD_ID)).toBeTruthy()
  })

  it('declares exactly the two structural-change operations', () => {
    expect([...guardById(GUARD_ID).operations].sort()).toEqual(['delete', 'update'])
  })

  it('matches every entity (a wildcard), so both field and entity writes are seen', () => {
    expect(guardById(GUARD_ID).targetEntity).toBe('*')
  })

  it('does not fire on a create (that is the S2 gate’s job, not this guard’s)', () => {
    expect(structuralGuardRefusal({ entityId: 'auth:user', key: 'nickname' }, 'create')).toBeNull()
  })
})

describe('a protected object (core table, entity-id form) is refused', () => {
  it('refuses a delete of a field on a core table (auth:user)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
    const message = JSON.stringify(result.errorBody)
    expect(message).toContain('auth:user')
    expect(message).toContain('backbone')
  })

  it('refuses a re-type (update) of a field on a protected table', () => {
    const refusal = structuralGuardRefusal({ entityId: 'auth:role', key: 'notes' }, 'update')
    expect(refusal).not.toBeNull()
    expect(refusal?.status).toBe(422)
  })

  it('refuses a delete of a field on a platform_release table (workflow_definitions)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'workflows:workflow_definition', key: 'label' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
  })

  it('refuses a delete of a protected ENTITY (auth:user as the entity itself)', () => {
    const refusal = structuralGuardRefusal({ entityId: 'auth:user' }, 'delete')
    expect(refusal).not.toBeNull()
    expect(refusal?.status).toBe(422)
    expect(refusal?.message).toContain('auth:user')
  })

  it('refuses a protected substrate entity (entities:custom_field_def)', () => {
    expect(structuralGuardRefusal({ entityId: 'entities:custom_field_def', key: 'x' }, 'delete')).not.toBeNull()
  })
})

describe('an ordinary tenant object is allowed — the guard is not wall-to-wall', () => {
  it('allows a delete of a field on a tenant table', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
  })

  it('allows a re-type of a column on a tenant table', () => {
    expect(
      structuralGuardRefusal({ entityId: 'customers:customer_person', key: 'loyalty_tier' }, 'update'),
    ).toBeNull()
  })

  it('allows a delete of a tenant entity', () => {
    expect(structuralGuardRefusal({ entityId: 'customers:customer_deal' }, 'delete')).toBeNull()
  })
})

describe('a payload that names no target is not this guard’s business', () => {
  it('allows when the payload carries no entityId', () => {
    expect(structuralGuardRefusal({}, 'delete')).toBeNull()
    expect(structuralGuardRefusal(null, 'update')).toBeNull()
  })
})

describe('the wildcard is narrowed to the definition writes — a record write is NOT judged', () => {
  // The record route's resourceKind, pinned to the constant `records.ts` actually
  // emits. A hostile-critic pass found the first version of this test used a
  // plausible-but-fictional string, so it passed for the wrong reason. This
  // reads the real value from the source so the test cannot silently drift from
  // production; if `CUSTOM_ENTITY_RECORD_RESOURCE_KIND` is ever renamed, this
  // assertion — not a mystery failure — tells the next reader why.
  const RECORD_RESOURCE_KIND = 'entities.record'

  it('matches the resourceKind the records route really emits (drift guard)', () => {
    const fs = require('node:fs') as typeof import('node:fs')
    const path = require('node:path') as typeof import('node:path')
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'records.ts'), 'utf8')
    const match = source.match(/CUSTOM_ENTITY_RECORD_RESOURCE_KIND\s*=\s*'([^']+)'/)
    expect(match?.[1]).toBe(RECORD_RESOURCE_KIND)
  })

  it('does not block a record delete even when the payload names a reserved entity', async () => {
    // A hostile-critic pass (Probe 3) proved the un-narrowed wildcard returned 422
    // for a *record* write against auth:user. Record writes carry an entityId too,
    // so the guard must scope by resourceKind. This pins the fix — using the
    // resourceKind `records.ts` actually emits, not a plausible-looking string.
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: RECORD_RESOURCE_KIND,
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', recordId: 'r1' },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
  })

  it('does not block a record update against a reserved entity', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: RECORD_RESOURCE_KIND,
        operation: 'update',
        mutationPayload: { entityId: 'auth:user', values: { a: 1 } },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
  })
})

describe('the namespace is pinned — a table name is NOT an entity id', () => {
  it('does not treat the bare table name "users" as protected', () => {
    // The falsifier for the namespace decision: the route passes entity ids
    // (`auth:user`), not table names (`users`). If the guard were wired to a
    // table-name lookup, `users` would be refused — this asserts it is not.
    expect(structuralGuardRefusal({ entityId: 'users' }, 'delete')).toBeNull()
    expect(structuralGuardRefusal({ entityId: 'roles' }, 'delete')).toBeNull()
  })

  it('refuses the entity-id form of the same object (auth:user / auth:role)', () => {
    expect(structuralGuardRefusal({ entityId: 'auth:user' }, 'delete')).not.toBeNull()
    expect(structuralGuardRefusal({ entityId: 'auth:role' }, 'delete')).not.toBeNull()
  })
})

/* ------------------------------------------------------------------ *
 * S12 / slice B — the actor kind is part of the decision
 * ------------------------------------------------------------------ */

describe('S12 — the actor kind reaches the guard and shapes the refusal', () => {
  it('names the machine actor when an AI worker is refused', () => {
    const refusal = structuralGuardRefusal(
      { entityId: 'auth:user', key: 'nickname' },
      'delete',
      undefined,
      'ai_worker',
    )
    expect(refusal).not.toBeNull()
    expect(refusal?.message).toContain('automated actor')
    expect(refusal?.message).toContain('ai_worker')
  })

  it('does not name a machine when a human is refused', () => {
    const refusal = structuralGuardRefusal(
      { entityId: 'auth:user', key: 'nickname' },
      'delete',
      undefined,
      'human',
    )
    expect(refusal).not.toBeNull()
    expect(refusal?.message).not.toContain('automated actor')
  })

  it('still refuses when the actor kind is unknown (fail closed)', () => {
    const refusal = structuralGuardRefusal({ entityId: 'auth:user' }, 'delete')
    expect(refusal).not.toBeNull()
    expect(refusal?.status).toBe(422)
  })

  it('carries actorKind through the real registry runner to the guard', async () => {
    // End-to-end transport proof: the runner spreads the input, so a guard sees
    // actorKind. The AI refusal message is the observable that proves it arrived.
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        actorKind: 'ai_worker',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result.errorBody)).toContain('automated actor')
  })

  it('an ordinary object is still allowed for a machine actor (the axis does not over-fire)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        actorKind: 'ai_worker',
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
  })
})
