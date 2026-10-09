/**
 * Slice 1 of `AH-1` — the kernel actually SEES the `Agent` object.
 *
 * The point of this test is not "the file exports an array" (that is trivia). It is: **once the
 * `ai_assistant` module's `ce.ts` declaration is fed to the kernel the way the generator feeds it, the
 * kernel's canonical model contains an `agent` entity carrying the six `AH-1` fields.** That is the claim
 * `AH-1` makes ("the `Agent` object in the kernel"), and it is the claim a mutation must be able to falsify.
 *
 * The test drives the REAL `buildModelDescriptor` and the REAL `collectDeclarations` — the same functions
 * production uses — not a re-implementation. It supplies a module entry shaped exactly as the generator
 * produces one from `ce.ts` (see `module-registry.ts:3139` for the fields split and `:3166` for the
 * customEntities split): `customEntities` carries `{ id, label, description }`; `customFieldSets` carries
 * `{ entity: id, fields }` for every entry that has fields.
 */

import entities, { AGENT_FIELDS, AGENT_KINDS } from '../ce'
import { entityExtensions } from '../data/extensions'
import { collectDeclarations } from '@open-mercato/shared/lib/kernel/from-modules'
import { buildModelDescriptor, canonicalEntityId } from '@open-mercato/shared/lib/kernel/model'

/** Build the module entry exactly as `module-registry.ts` derives it from this `ce.ts`. */
function moduleEntryFromCe() {
  const ce = entities as Array<{ id: string; label?: string; description?: string; fields?: unknown[] }>
  return {
    id: 'ai_assistant',
    customEntities: ce.map((e) => ({ id: e.id, label: e.label, description: e.description })),
    customFieldSets: ce
      .filter((e) => Array.isArray(e.fields) && e.fields.length > 0)
      .map((e) => ({ entity: e.id, fields: e.fields, source: 'ai_assistant' })),
    // Exactly as `module-registry.ts:3163` derives the extensions entry from `data/extensions.ts`.
    entityExtensions,
  }
}

describe('AH-1 slice 1 — the Agent object is declared and the kernel sees it', () => {
  it('declares exactly one agent entity, canonically different from its module id', () => {
    expect(entities).toHaveLength(1)
    expect(entities[0].id).toBe('ai_assistant:agent')
    // The canonical id is the kernel's stable identity: the module prefix is stripped to the leaf.
    expect(canonicalEntityId('ai_assistant:agent')).toBe('agent')
  })

  it('the kernel model contains an `agent` entity carrying all six AH-1 fields', () => {
    const declarations = collectDeclarations([moduleEntryFromCe() as never])
    const model = buildModelDescriptor(declarations)

    // `entities` is a Record keyed by the canonical id (model.ts:127).
    const agent = model.entities['agent']
    expect(agent).toBeDefined()
    expect(agent.kind).toBe('entity')
    expect(agent.label).toBe('Agent')

    const fieldKeys = agent.fields.map((f) => f.id.split('.').pop())
    expect(fieldKeys).toEqual(
      expect.arrayContaining(['kind', 'owner', 'acts_as', 'role', 'runtime', 'autonomy']),
    )
    // Six declared fields — no more, no fewer (the §1.4 set).
    expect(agent.fields).toHaveLength(6)
  })

  it('carries the five agent kinds as the `kind` field options — the vocabulary is declared once', () => {
    const kindField = AGENT_FIELDS.find((f) => f.key === 'kind')
    expect(kindField?.kind).toBe('select')
    expect(kindField?.options).toEqual([...AGENT_KINDS])
    expect(AGENT_KINDS).toEqual(['personal', 'role', 'context', 'independent', 'system'])
  })

  it('marks the agent record access-restricted (it holds a role — a governance surface)', () => {
    expect(entities[0].accessRestricted).toBe(true)
  })
})

describe('AH-1 slice 3 (CC-40) — the relation upgrade and the reportsTo self-edge', () => {
  // Build the model the way PRODUCTION does: several modules collected together, so `user` (declared by
  // another module) is present on the entity set — the same condition that makes the relation target real.
  // A single-module model would carry only `agent`, so it could not prove the target resolves (a hostile-
  // critic pass caught the earlier version of this test doing exactly that).
  const userDeclaringModule = {
    id: 'communication_channels',
    entityExtensions: [
      { base: 'auth:user', extension: 'probe:thing', join: { baseKey: 'id', extensionKey: 'x' } },
    ],
  }
  const model = buildModelDescriptor(
    collectDeclarations([moduleEntryFromCe() as never, userDeclaringModule as never]),
  )
  const agent = model.entities['agent']

  const fieldOf = (key: string) => agent.fields.find((f) => f.id.split('.').pop() === key)

  it('the `owner`/`acts_as` target entity is present in the model this test builds', () => {
    // Precondition: the target must be a REAL entity in the model, or the assertions below are vacuous.
    expect(model.entities['user']).toBeDefined()
  })

  it('carries `owner` and `acts_as` as relation-kind fields in the model', () => {
    expect(fieldOf('owner')?.fieldKind).toBe('relation')
    expect(fieldOf('acts_as')?.fieldKind).toBe('relation')
  })

  it('declares the relation TARGET as `user` on the source fields (persisted to the field-definition store)', () => {
    // Where the target lands, stated precisely: `relatedEntityId` is a real, consumed property of the
    // custom-field declaration — the installer persists it (`install-from-ce.ts` FIELD_DETAIL_KEYS) and the
    // relation-options UI reads it. It is NOT carried on the kernel model's `KernelField` (that type has no
    // such property — verified), so this test asserts it on the declaration, not on the model.
    const owner = AGENT_FIELDS.find((f) => f.key === 'owner')
    const actsAs = AGENT_FIELDS.find((f) => f.key === 'acts_as')
    expect(owner?.kind).toBe('relation')
    expect(owner?.relatedEntityId).toBe('user')
    expect(actsAs?.kind).toBe('relation')
    expect(actsAs?.relatedEntityId).toBe('user')
  })

  it('keeps `role` as text — the ADMIN role entity is NOT declared in the kernel (honest, not invented)', () => {
    // `auth:role` (the admin role the agent should carry) is not a declared entity; `customer_role` is a
    // different concept (customer-portal roles). So no relation target exists for this field yet.
    const role = AGENT_FIELDS.find((f) => f.key === 'role')
    expect(role?.kind).toBe('text')
    expect(role?.relatedEntityId).toBeUndefined()
    expect(model.entities['role']).toBeUndefined()
  })

  it('declares a real `agent → agent` reportsTo self-edge in the model (no "type" flag)', () => {
    const rels = agent.relationships
    expect(rels.length).toBeGreaterThan(0)
    const selfEdge = rels.find(
      (r) => r.fromEntityId === 'agent' && r.toEntityId === 'agent',
    )
    expect(selfEdge).toBeDefined()
    // §3.1: it is a real edge, so the kernel records it as a relationship object, not a "type" field.
    expect(selfEdge?.kind).toBe('relationship')
    expect(selfEdge?.toEntityId).toBe('agent')
  })

  it('pushes the self-edge exactly once (the kernel handles from === to without double-counting)', () => {
    const selfEdges = agent.relationships.filter(
      (r) => r.fromEntityId === 'agent' && r.toEntityId === 'agent',
    )
    expect(selfEdges).toHaveLength(1)
  })
})
