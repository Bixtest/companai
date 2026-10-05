/**
 * The drift guard — the kernel's view must equal the installer's view.
 *
 * The Business Model Kernel is a **view** over the declarations the platform
 * keeps, not a second store. That claim is only worth anything if it is checked:
 * if the kernel and the installer ever disagree about what a tenant's model
 * contains, the kernel has quietly become a second source of truth — the exact
 * failure the vision forbids (Doc 4 §54; Doc 8 §110).
 *
 * This test drives **both readers from one registered module set** and compares
 * them object by object:
 *
 *   - the installer's view: `getAggregatedCustomEntityConfigs()` (what gets
 *     synced into `custom_field_defs`);
 *   - the kernel's view: `buildModelFromModules()` (the canonical model).
 *
 * They read the same registry (`getModules()`), so they must agree. If they do
 * not, this test prints both sides.
 *
 * Source: SPEC-business-model-kernel.md §12.3; COOKBOOK Sprint G-01 step 3.4.
 */

import { registerModules } from '@open-mercato/shared/lib/modules/registry'
import { buildModelFromModules, collectDeclarations } from '@open-mercato/shared/lib/kernel/from-modules'
import { getAggregatedCustomEntityConfigs } from '../install-from-ce'

/** The declarations, shaped as a module emits them. */
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
        cardinality: 'one-to-one',
      },
      {
        base: 'auth:user',
        extension: 'communication_channels:external_conversation',
        join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
        cardinality: 'one-to-many',
      },
    ],
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
  },
]

function canonicalOf(moduleEntityId: string): string {
  const idx = moduleEntityId.lastIndexOf(':')
  return idx === -1 ? moduleEntityId : moduleEntityId.slice(idx + 1)
}

describe('kernel view === installer view (the drift guard)', () => {
  beforeAll(() => {
    registerModules(MODULES as never)
  })

  it('the two readers see the same entities', () => {
    const installer = getAggregatedCustomEntityConfigs()
    const kernel = buildModelFromModules()

    const installerEntities = installer.map((e) => canonicalOf(e.entityId)).sort()
    const kernelEntities = Object.keys(kernel.entities).sort()

    // Every entity the installer knows about, the kernel must know about.
    for (const entity of installerEntities) {
      expect(kernelEntities).toContain(entity)
    }
    // And the kernel must not invent an entity the installer does not have,
    // except for relationship endpoints, which the installer does not register
    // as entities but the model needs so both ends of an edge exist.
    const endpointEntities = Object.keys(kernel.relationships).flatMap((id) => [
      kernel.relationships[id].fromEntityId,
      kernel.relationships[id].toEntityId,
    ])
    for (const entity of kernelEntities) {
      expect(installerEntities.includes(entity) || endpointEntities.includes(entity)).toBe(true)
    }
  })

  it('the two readers see the same fields for every shared entity', () => {
    const installer = getAggregatedCustomEntityConfigs()
    const kernel = buildModelFromModules()

    for (const config of installer) {
      const canonical = canonicalOf(config.entityId)
      const kernelEntity = kernel.entities[canonical]
      expect(kernelEntity).toBeDefined()

      const installerFieldKeys = new Set<string>()
      for (const set of config.fieldSets) {
        for (const field of set.fields ?? []) installerFieldKeys.add(field.key)
      }

      const kernelFieldKeys = new Set(kernelEntity.fields.map((f) => f.id.split('.').slice(1).join('.')))

      // Same keys on both sides — nothing in one that is missing from the other.
      expect([...kernelFieldKeys].sort()).toEqual([...installerFieldKeys].sort())
    }
  })

  it('the two readers see the same relationships (from the extensions)', () => {
    const declarations = collectDeclarations(MODULES as never)
    const kernel = buildModelFromModules(MODULES as never)

    // Every declared extension is present in the model, keyed by canonical id.
    expect(Object.keys(kernel.relationships).length).toBe(declarations.extensions.length)
    for (const ext of declarations.extensions) {
      const relId = `${canonicalOf(ext.base)}.${canonicalOf(ext.extension)}`
      expect(kernel.relationships[relId]).toBeDefined()
      expect(kernel.relationships[relId].fromEntityId).toBe(canonicalOf(ext.base))
      expect(kernel.relationships[relId].toEntityId).toBe(canonicalOf(ext.extension))
    }
  })

  it('no relationship-id collisions for the real declarations', () => {
    const kernel = buildModelFromModules()
    expect(kernel.relationshipIdCollisions).toEqual([])
  })
})
