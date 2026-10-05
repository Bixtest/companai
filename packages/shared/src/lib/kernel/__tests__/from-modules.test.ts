/**
 * The live wiring test — the kernel reading registered module declarations.
 *
 * The fixture mirrors the shape the generator actually emits into
 * `modules.runtime.generated.ts` for the four modules that declare
 * `entityExtensions` (measured 2026-10-05): three empty arrays and the real
 * `communication_channels` set. A second test drives the **real global
 * registry** through `registerModules` so the wiring is proven end to end, not
 * only with an argument passed in.
 */

import { registerModules } from '@open-mercato/shared/lib/modules/registry'
import * as registry from '@open-mercato/shared/lib/modules/registry'
import { collectDeclarations, buildModelFromModules, tryBuildModelFromModules } from '../from-modules'
import { exportModel } from '../round-trip'

/** The shape the generator emits, faithful to the real declarations. */
const MODULES = [
  { id: 'business_rules', entityExtensions: [] },
  { id: 'workflows', entityExtensions: [] },
  { id: 'inbox_ops', entityExtensions: [] },
  {
    id: 'communication_channels',
    entityExtensions: [
      {
        base: 'messages:message',
        extension: 'communication_channels:message_channel_link',
        join: { baseKey: 'id', extensionKey: 'message_id' },
        cardinality: 'one-to-one' as const,
        description: 'Links Messages to external channel conversations',
      },
      {
        base: 'messages:message',
        extension: 'communication_channels:message_reaction',
        join: { baseKey: 'id', extensionKey: 'message_id' },
        cardinality: 'one-to-many' as const,
        description: 'Emoji reactions on messages',
      },
      {
        base: 'auth:user',
        extension: 'communication_channels:external_conversation',
        join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
        cardinality: 'one-to-many' as const,
        description: 'Conversations assigned to a user',
      },
      {
        base: 'customers:customer_entity',
        extension: 'communication_channels:external_conversation',
        join: { baseKey: 'id', extensionKey: 'contact_person_id' },
        cardinality: 'one-to-many' as const,
        description: 'Conversations matched to a CRM person',
      },
    ],
    customFieldSets: [
      {
        entity: 'communication_channels:external_conversation',
        source: 'communication_channels',
        fields: [{ key: 'subject', kind: 'text' as const, label: 'Subject' }],
      },
    ],
  },
]

describe('collectDeclarations', () => {
  it('gathers extensions, field sets and custom entities from every module', () => {
    const collected = collectDeclarations(MODULES)
    expect(collected.extensions).toHaveLength(4)
    expect(collected.customFieldSets).toHaveLength(1)
    expect(collected.customFieldSets[0].source).toBe('communication_channels')
  })

  it('is pure — two calls with the same modules return equal data', () => {
    expect(collectDeclarations(MODULES)).toEqual(collectDeclarations(MODULES))
  })

  it('ignores modules that declare nothing', () => {
    const collected = collectDeclarations([{ id: 'x' }, { id: 'y', entityExtensions: [] }])
    expect(collected.extensions).toEqual([])
    expect(collected.customFieldSets).toEqual([])
    expect(collected.customEntities).toEqual([])
  })
})

describe('buildModelFromModules', () => {
  it('produces the canonical model from the module declarations', () => {
    const model = buildModelFromModules(MODULES)
    expect(Object.keys(model.relationships).sort()).toEqual([
      'customer_entity.external_conversation',
      'message.message_channel_link',
      'message.message_reaction',
      'user.external_conversation',
    ])
    // And the model it produces round-trips empty, exactly like the direct path.
    const doc = exportModel(model)
    expect(doc.relationships).toHaveLength(4)
  })

  it('reads the real global registry when no modules are passed', () => {
    // Drive the actual registry the app uses at boot.
    registerModules([
      {
        id: 'fixture_module',
        entityExtensions: [
          {
            base: 'a:one',
            extension: 'b:two',
            join: { baseKey: 'id', extensionKey: 'one_id' },
            cardinality: 'one-to-many',
          },
        ],
      } as never,
    ])
    const model = buildModelFromModules()
    expect(model.relationships['one.two']).toBeDefined()
    expect(model.relationships['one.two'].fromEntityId).toBe('one')
  })

  it('tryBuildModelFromModules returns null when the registry is not ready, not an empty model', () => {
    // "Not ready" is the registry throwing. An empty *model* is a different
    // thing — a tenant with no entities — and the two must not be conflated.
    const spy = jest.spyOn(registry, 'getModules').mockImplementation(() => {
      throw new Error('[Bootstrap] Modules not registered')
    })
    try {
      expect(tryBuildModelFromModules()).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })

  it('tryBuildModelFromModules returns an empty model (not null) when given no declarations', () => {
    const model = tryBuildModelFromModules([])
    expect(model).not.toBeNull()
    expect(Object.keys(model!.entities)).toEqual([])
    expect(Object.keys(model!.relationships)).toEqual([])
  })
})
