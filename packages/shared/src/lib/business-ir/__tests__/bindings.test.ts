/**
 * The physical bindings (G-02).
 *
 * The bindings are the **declared** mapping from the canonical model to the
 * physical database. The claim this suite has to hold up is that they are
 * *derived*, not guessed — so it checks them against G-01's own
 * `canonicalEntityId` and against the model's own relationship ids, rather than
 * against a hand-written expectation of what the ids "should" be.
 */

import { buildModelDescriptor, canonicalEntityId } from '../../kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '../../kernel/model'
import { createBindingsFromDeclarations } from '../bindings'

const EXTENSIONS: KernelDeclarationInput['extensions'] = [
  {
    base: 'messages:message',
    extension: 'communication_channels:message_channel_link',
    join: { baseKey: 'id', extensionKey: 'message_id' },
    cardinality: 'one-to-one',
  },
  {
    base: 'auth:user',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
    cardinality: 'one-to-many',
  },
  {
    base: 'customers:customer_entity',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'contact_person_id' },
    cardinality: 'one-to-many',
  },
]

const DECLARATIONS: KernelDeclarationInput = {
  customEntities: [
    { id: 'communication_channels:external_conversation', label: 'External conversation' },
  ],
  customFieldSets: [
    {
      entity: 'communication_channels:external_conversation',
      source: 'communication_channels',
      fields: [{ key: 'subject', kind: 'text' }],
    },
  ],
  extensions: EXTENSIONS,
}

const MODEL: ModelDescriptor = buildModelDescriptor(DECLARATIONS)

describe('createBindingsFromDeclarations', () => {
  it('maps a canonical entity id to the platform id the declaration carries', () => {
    const bindings = createBindingsFromDeclarations(DECLARATIONS, MODEL)
    expect(bindings.entities.user.platformEntityId).toBe('auth:user')
    expect(bindings.entities.message.platformEntityId).toBe('messages:message')
    expect(bindings.entities.external_conversation.platformEntityId).toBe(
      'communication_channels:external_conversation',
    )
    expect(bindings.entities.customer_entity.platformEntityId).toBe(
      'customers:customer_entity',
    )
  })

  it('uses G-01s own canonicalEntityId, so the two cannot disagree', () => {
    const bindings = createBindingsFromDeclarations(DECLARATIONS, MODEL)
    for (const entity of Object.values(MODEL.entities)) {
      expect(bindings.entities[entity.id]).toBeDefined()
      expect(canonicalEntityId(bindings.entities[entity.id].platformEntityId)).toBe(entity.id)
    }
  })

  it('keys every relationship binding by the MODELs own relationship id', () => {
    const bindings = createBindingsFromDeclarations(DECLARATIONS, MODEL)
    expect(Object.keys(bindings.relationships).sort()).toEqual(
      Object.keys(MODEL.relationships).sort(),
    )
    expect(bindings.unboundRelationships).toEqual([])
  })

  it('carries the declared join columns', () => {
    const bindings = createBindingsFromDeclarations(DECLARATIONS, MODEL)
    expect(bindings.relationships['user.external_conversation']).toEqual({
      fromField: 'id',
      toField: 'assigned_user_id',
      type: 'left',
    })
    expect(bindings.relationships['message.message_channel_link']).toEqual({
      fromField: 'id',
      toField: 'message_id',
      type: 'left',
    })
  })

  it('is deterministic — key order is stable', () => {
    const a = createBindingsFromDeclarations(DECLARATIONS, MODEL)
    const b = createBindingsFromDeclarations(DECLARATIONS, MODEL)
    expect(Object.keys(a.entities)).toEqual(Object.keys(b.entities))
    expect(Object.keys(a.relationships)).toEqual(Object.keys(b.relationships))
  })
})

describe('createBindingsFromDeclarations — the failure cases are reported, not hidden', () => {
  it('reports two platform entities that collapse to one canonical id', () => {
    const colliding: KernelDeclarationInput = {
      customEntities: [
        { id: 'alpha:user', label: 'Alpha user' },
        { id: 'beta:user', label: 'Beta user' },
      ],
      customFieldSets: [],
      extensions: [],
    }
    const model = buildModelDescriptor(colliding)
    const bindings = createBindingsFromDeclarations(colliding, model)

    expect(bindings.entityIdCollisions).toEqual([
      { canonicalId: 'user', platformEntityIds: ['alpha:user', 'beta:user'] },
    ])
    // One binding must be chosen; the collision is what tells a caller it is a choice.
    expect(bindings.entities.user.platformEntityId).toBe('alpha:user')
  })

  it('reports a model relationship that has no declaration behind it', () => {
    const model = buildModelDescriptor(DECLARATIONS)
    // Declarations missing the `message` edge, but the model still has it.
    const partial: KernelDeclarationInput = {
      ...DECLARATIONS,
      extensions: EXTENSIONS.filter((e) => e.base !== 'messages:message'),
    }
    const bindings = createBindingsFromDeclarations(partial, model)
    expect(bindings.unboundRelationships).toContain('message.message_channel_link')
    expect(bindings.relationships['message.message_channel_link']).toBeUndefined()
    // The edges that ARE declared are still bound.
    expect(bindings.relationships['user.external_conversation']).toBeDefined()
  })
})
