/**
 * G-08 — relationship attributes.
 *
 * Two things must both hold, and they pull in opposite directions:
 *   1. A declaration **may** now carry the kernel's relationship attributes.
 *   2. Every **existing** declaration must still type-check and behave
 *      identically, unchanged — there is no second way to write a link.
 *
 * The blast radius was measured before widening: exactly 4 files declare
 * `entityExtensions` today (3 empty stubs + 1 real, in
 * `communication_channels/data/extensions.ts`). Widening an optional field
 * cannot break a caller that never passes it, and the test below pins that by
 * exercising the original call shape verbatim.
 */

import { cf, defineFields, defineLink, entityId, linkable } from '@open-mercato/shared/modules/dsl'
import { buildModelDescriptor } from '../model'

describe('defineLink — the original shape is unchanged', () => {
  it('still builds the exact object it built before (dsl.test.ts, verbatim)', () => {
    const link = defineLink(entityId('auth', 'user'), entityId('my_module', 'user_profile'), {
      join: { baseKey: 'id', extensionKey: 'user_id' },
      cardinality: 'one-to-one',
      required: false,
      description: 'Profile for user',
    })
    expect(link.base).toBe('auth:user')
    expect(link.extension).toBe('my_module:user_profile')
    expect(link.join).toEqual({ baseKey: 'id', extensionKey: 'user_id' })
    // No attributes were passed, so none are present — not an empty object.
    expect(link.attributes).toBeUndefined()
    expect(Object.keys(link).sort()).toEqual(['base', 'cardinality', 'description', 'extension', 'join', 'required'])
  })

  it('linkable + defineFields still behave as before', () => {
    const Auth = { linkable: linkable('auth', ['user', 'role']) }
    expect(Auth.linkable.user).toBe('auth:user')
    const set = defineFields(entityId('directory', 'organization'), [cf.select('industry', ['SaaS'])], 'm')
    expect(set.fields[0]).toMatchObject({ key: 'industry', kind: 'select', options: ['SaaS'] })
  })
})

describe('defineLink — the attributes block is additive', () => {
  it('carries the kernel attributes when declared', () => {
    const link = defineLink(entityId('billing', 'invoice'), entityId('auth', 'user'), {
      join: { baseKey: 'id', extensionKey: 'customer_id' },
      cardinality: 'many-to-one',
      description: 'The customer the invoice is owed by',
      attributes: {
        ownership: 'source',
        allowedTraversal: { fromTo: true, toFrom: true },
        deleteBehaviour: 'restrict',
        securityInheritance: 'strictest',
        multiplicityRisk: 'none',
      },
    })
    expect(link.attributes?.ownership).toBe('source')
    expect(link.attributes?.deleteBehaviour).toBe('restrict')
    expect(link.attributes?.securityInheritance).toBe('strictest')
  })

  it('the kernel reads the declared attributes into the model', () => {
    const model = buildModelDescriptor({
      customEntities: [],
      customFieldSets: [],
      extensions: [
        defineLink(entityId('billing', 'invoice'), entityId('auth', 'user'), {
          join: { baseKey: 'id', extensionKey: 'customer_id' },
          cardinality: 'many-to-one',
          description: 'The customer the invoice is owed by',
          attributes: {
            ownership: 'source',
            deleteBehaviour: 'restrict',
            securityInheritance: 'strictest',
            multiplicityRisk: 'none',
          },
        }),
      ],
    })
    const rel = model.relationships['invoice.user']
    expect(rel).toMatchObject({
      fromEntityId: 'invoice',
      toEntityId: 'user',
      cardinality: 'many-to-one',
      optionality: true,
      ownership: 'source',
      deleteBehaviour: 'restrict',
      securityInheritance: 'strictest',
      multiplicityRisk: 'none',
    })
    // Attributes that were not declared stay absent.
    expect(rel.allowedTraversal).toBeUndefined()
  })

  it('a partially declared attributes block leaves the rest absent', () => {
    const model = buildModelDescriptor({
      customEntities: [],
      customFieldSets: [],
      extensions: [
        defineLink(entityId('a', 'one'), entityId('b', 'two'), {
          join: { baseKey: 'id', extensionKey: 'one_id' },
          attributes: { ownership: 'shared' },
        }),
      ],
    })
    const rel = model.relationships['one.two']
    expect(rel.ownership).toBe('shared')
    expect(rel.deleteBehaviour).toBeUndefined()
    expect(rel.securityInheritance).toBeUndefined()
  })
})
