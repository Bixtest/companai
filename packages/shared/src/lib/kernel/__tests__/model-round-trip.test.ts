/**
 * The kernel model and its round-trip test (plan §5.2).
 *
 * The fixture is the **real** declared relationships from the codebase, read on
 * 2026-10-05 from
 * `packages/core/src/modules/communication_channels/data/extensions.ts` — the
 * only module of 34 that declares any. Using the real shape rather than an
 * invented one is the difference between testing the kernel and testing a
 * story about the kernel.
 */

import { buildModelDescriptor, canonicalEntityId, findEntityIdCollisions } from '../model'
import type { KernelDeclarationInput } from '../model'
import {
  MODEL_DOCUMENT_VERSION,
  exportModel,
  importModel,
  roundTrip,
  serialiseModelDocument,
} from '../round-trip'

/**
 * The four real relationships declared in the platform today.
 * Copied from `communication_channels/data/extensions.ts` (2026-10-05).
 */
const REAL_EXTENSIONS: KernelDeclarationInput['extensions'] = [
  {
    base: 'messages:message',
    extension: 'communication_channels:message_channel_link',
    join: { baseKey: 'id', extensionKey: 'message_id' },
    cardinality: 'one-to-one',
    description: 'Links Messages to external channel conversations',
  },
  {
    base: 'messages:message',
    extension: 'communication_channels:message_reaction',
    join: { baseKey: 'id', extensionKey: 'message_id' },
    cardinality: 'one-to-many',
    description: 'Emoji reactions on messages from external channels and internal users',
  },
  {
    base: 'auth:user',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
    cardinality: 'one-to-many',
    description: 'Conversations assigned to a user in the unified inbox',
  },
  {
    base: 'customers:customer_entity',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'contact_person_id' },
    cardinality: 'one-to-many',
    description: 'Conversations matched to a CRM person',
  },
]

const REAL_DECLARATION: KernelDeclarationInput = {
  customEntities: [
    { id: 'communication_channels:external_conversation', label: 'External conversation' },
  ],
  customFieldSets: [
    {
      entity: 'communication_channels:external_conversation',
      source: 'communication_channels',
      fields: [
        { key: 'subject', kind: 'text', label: 'Subject' },
        { key: 'unread_count', kind: 'integer', filterable: true },
      ],
    },
  ],
  extensions: REAL_EXTENSIONS,
}

describe('buildModelDescriptor', () => {
  it('maps the real declared relationships into the model', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    const rels = Object.values(model.relationships)
    expect(rels).toHaveLength(4)
    // The relationship id is `<from-entity>.<extension-leaf>` (spec §12.1).
    // Every relationship carries its declared attributes (RQ-05).
    const byId = Object.fromEntries(rels.map((r) => [r.id, r]))
    expect(byId['message.message_channel_link']).toMatchObject({
      fromEntityId: 'message',
      toEntityId: 'message_channel_link',
      cardinality: 'one-to-one',
      optionality: true,
    })
    expect(byId['message.message_reaction']).toMatchObject({
      fromEntityId: 'message',
      toEntityId: 'message_reaction',
      cardinality: 'one-to-many',
    })
    expect(byId['user.external_conversation']?.fromEntityId).toBe('user')
    expect(byId['customer_entity.external_conversation']?.fromEntityId).toBe('customer_entity')
    // No id collisions among the real declarations.
    expect(model.relationshipIdCollisions).toEqual([])
  })

  it('reports two edges to the same target from one entity as a collision', () => {
    const model = buildModelDescriptor({
      customEntities: [],
      customFieldSets: [],
      extensions: [
        { base: 'a:thing', extension: 'b:target', join: { baseKey: 'id', extensionKey: 'thing_id' }, cardinality: 'one-to-one' },
        { base: 'a:thing', extension: 'b:target', join: { baseKey: 'id', extensionKey: 'other_thing_id' }, cardinality: 'one-to-many' },
      ],
    })
    expect(model.relationshipIdCollisions).toEqual([
      { id: 'thing.target', declarations: ['a:thing -> b:target', 'a:thing -> b:target'] },
    ])
  })

  it('guarantees both ends of every relationship exist as entities', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    for (const rel of Object.values(model.relationships)) {
      expect(model.entities[rel.fromEntityId]).toBeDefined()
      expect(model.entities[rel.toEntityId]).toBeDefined()
    }
    // `auth:user` declares no fields of its own, but the edge names it, so it
    // must still be in the model.
    expect(model.entities['user']).toBeDefined()
  })

  it('carries declared fields under the canonical field id', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    const fields = model.entities['external_conversation'].fields.map((f) => f.id)
    expect(fields).toContain('external_conversation.subject')
    expect(fields).toContain('external_conversation.unread_count')
  })

  it('declares absent relationship attributes as absent, never invented', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    const rel = model.relationships['message.message_channel_link']
    // The platform does not declare these today; the model must say so by
    // leaving them undefined rather than picking a default.
    expect(rel.ownership).toBeUndefined()
    expect(rel.deleteBehaviour).toBeUndefined()
    expect(rel.securityInheritance).toBeUndefined()
    expect(rel.multiplicityRisk).toBeUndefined()
  })

  it('holds no copy — two builds from the same input are equal and independent', () => {
    const a = buildModelDescriptor(REAL_DECLARATION)
    const b = buildModelDescriptor(REAL_DECLARATION)
    expect(serialiseModelDocument(exportModel(a))).toBe(serialiseModelDocument(exportModel(b)))

    // Mutating one result must not be visible in a later build.
    a.entities['message'].label = 'mutated'
    const c = buildModelDescriptor(REAL_DECLARATION)
    expect(c.entities['message'].label).toBeUndefined()
  })

  it('is deterministic — fields and relationships are sorted by canonical id', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    const relIds = Object.keys(model.relationships)
    expect(relIds).toEqual([...relIds].sort())
  })
})

describe('canonicalEntityId — the declared mapping, not a guess', () => {
  it('maps module-qualified ids to their canonical leaf', () => {
    expect(canonicalEntityId('auth:user')).toBe('user')
    expect(canonicalEntityId('messages:message')).toBe('message')
    expect(canonicalEntityId('communication_channels:external_conversation')).toBe(
      'external_conversation',
    )
    expect(canonicalEntityId('invoice')).toBe('invoice')
  })

  it('reports a collision rather than silently merging two entities', () => {
    const collisions = findEntityIdCollisions(['sales:order', 'catalog:order', 'auth:user'])
    expect(collisions).toEqual([{ canonicalId: 'order', moduleEntityIds: ['catalog:order', 'sales:order'] }])
  })

  it('reports no collision when every leaf is unique', () => {
    expect(findEntityIdCollisions(['auth:user', 'messages:message'])).toEqual([])
  })
})

describe('versions (plan §5.2 — the model carries contracts AND versions)', () => {
  it('every object carries a version', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    for (const entity of Object.values(model.entities)) {
      expect(entity.version).toMatch(/^[0-9a-f]{8}$/)
      for (const field of entity.fields) expect(field.version).toMatch(/^[0-9a-f]{8}$/)
    }
    for (const rel of Object.values(model.relationships)) {
      expect(rel.version).toMatch(/^[0-9a-f]{8}$/)
    }
  })

  it('the version is stable for an unchanged declaration', () => {
    const a = buildModelDescriptor(REAL_DECLARATION)
    const b = buildModelDescriptor(REAL_DECLARATION)
    expect(a.relationships['message.message_channel_link'].version).toBe(
      b.relationships['message.message_channel_link'].version,
    )
  })

  it('the version changes when the declaration changes', () => {
    const before = buildModelDescriptor(REAL_DECLARATION)
    const after = buildModelDescriptor({
      ...REAL_DECLARATION,
      extensions: REAL_DECLARATION.extensions.map((e) =>
        e.base === 'messages:message' && e.extension.endsWith('message_channel_link')
          ? { ...e, attributes: { deleteBehaviour: 'restrict' as const } }
          : e,
      ),
    })
    expect(after.relationships['message.message_channel_link'].version).not.toBe(
      before.relationships['message.message_channel_link'].version,
    )
    // An untouched relationship keeps its version.
    expect(after.relationships['user.external_conversation'].version).toBe(
      before.relationships['user.external_conversation'].version,
    )
  })

  it('adding a field changes the entity version but not a sibling field version', () => {
    const before = buildModelDescriptor(REAL_DECLARATION)
    const after = buildModelDescriptor({
      ...REAL_DECLARATION,
      customFieldSets: [
        {
          ...REAL_DECLARATION.customFieldSets[0],
          fields: [...REAL_DECLARATION.customFieldSets[0].fields, { key: 'due_date', kind: 'date' }],
        },
      ],
    })
    const entity = 'external_conversation'
    expect(after.entities[entity].version).not.toBe(before.entities[entity].version)
    const beforeSubject = before.entities[entity].fields.find((f) => f.id === `${entity}.subject`)
    const afterSubject = after.entities[entity].fields.find((f) => f.id === `${entity}.subject`)
    expect(afterSubject?.version).toBe(beforeSubject?.version)
  })

  it('the round-trip preserves versions (byte equality already covers it, asserted here)', () => {
    const model = buildModelDescriptor(REAL_DECLARATION)
    const reimported = importModel(exportModel(model))
    expect(reimported.relationships['message.message_channel_link'].version).toBe(
      model.relationships['message.message_channel_link'].version,
    )
  })
})

describe('the round-trip (plan §5.2 — the G-01 test)', () => {
  const model = buildModelDescriptor(REAL_DECLARATION)

  it('NON-EMPTY first — the export carries the real model', () => {
    const doc = exportModel(model)
    expect(doc.format).toBe('companai.business-model')
    expect(doc.version).toBe(MODEL_DOCUMENT_VERSION)
    // 4 real relationships, not an empty export that would make the next test
    // meaningless.
    expect(doc.relationships).toHaveLength(4)
    expect(doc.entities.length).toBeGreaterThanOrEqual(4)
    const fieldIds = doc.entities.flatMap((e) => e.fields.map((f) => f.id))
    expect(fieldIds).toContain('external_conversation.subject')
  })

  it('THEN empty — export(import(export(model))) equals export(model), byte for byte', () => {
    const { empty, before, after } = roundTrip(model)
    expect(after).toBe(before)
    expect(empty).toBe(true)
  })

  it('route 2 — import is idempotent: importing twice is also a no-op', () => {
    const once = importModel(exportModel(model))
    const twice = importModel(exportModel(once))
    expect(serialiseModelDocument(exportModel(twice))).toBe(serialiseModelDocument(exportModel(once)))
  })

  it('rejects a non-canonical id instead of accepting it silently', () => {
    const doc = exportModel(model)
    const broken = structuredClone(doc)
    broken.entities[0].id = 'Not_Canonical'
    expect(() => importModel(broken)).toThrow(/non-canonical id/)
  })

  it('rejects an unknown document version', () => {
    const doc = exportModel(model) as unknown as { version: number }
    doc.version = 999
    expect(() => importModel(doc as never)).toThrow(/unsupported document version/)
  })
})
