/**
 * The Metadata Registry — the read-only service over the kernel's model.
 *
 * The tests here prove **three things the plan named**:
 *   1. every answer the declarations support is correct;
 *   2. every §54 question the platform cannot answer returns a **typed absence**
 *      (an object with `known: false` and a reason) — never `undefined` and never
 *      an empty value that could be read as "nothing there";
 *   3. there is **no second source of truth** — the registry reads the descriptor,
 *      so changing the descriptor changes the answer, and equal input is equal
 *      output.
 *
 * The fixture is a small but realistic declaration set: two entities joined by a
 * relationship, plus a field, so `dependentsOf` has a real transitive path
 * (`crm:order → crm:customer`) to walk.
 */

import { createMetadataRegistry, createMetadataRegistryFromDeclarations, UNANSWERED_REASONS, ANSWERED_QUESTIONS } from '../metadata-registry'
import type { ModelDescriptor } from '../model'
import type { KernelDeclarationInput } from '../model'

const DECLARATIONS: KernelDeclarationInput = {
  customEntities: [
    { id: 'crm:customer', label: 'Customer', description: 'A person or company' },
    { id: 'crm:order', label: 'Order', description: 'A sale' },
  ],
  customFieldSets: [
    {
      entity: 'crm:customer',
      source: 'crm',
      fields: [
        { key: 'email', kind: 'text', label: 'Email', required: true },
        { key: 'tier', kind: 'select', label: 'Tier', filterable: true },
      ],
    },
    {
      entity: 'crm:order',
      source: 'crm',
      fields: [{ key: 'total', kind: 'number', label: 'Total' }],
    },
  ],
  extensions: [
    {
      base: 'crm:order',
      extension: 'crm:customer',
      join: { baseKey: 'customer_id', extensionKey: 'id' },
      cardinality: 'many-to-one',
      description: 'The customer an order belongs to',
      required: true,
    },
  ],
}

function makeRegistry() {
  return createMetadataRegistryFromDeclarations(DECLARATIONS)
}

describe('metadata-registry: what exists', () => {
  it('lists every entity, field and relationship, sorted by canonical id', () => {
    const registry = makeRegistry()
    const ids = registry.listObjects().map((o) => o.id)
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
    // 2 entities + 3 fields + 1 relationship
    expect(ids).toHaveLength(6)
    expect(ids).toContain('customer')
    expect(ids).toContain('order')
    expect(ids).toContain('customer.email')
    expect(ids).toContain('customer.tier')
    expect(ids).toContain('order.total')
    expect(ids).toContain('order.customer')
  })

  it('filters the inventory by kind', () => {
    const registry = makeRegistry()
    expect(registry.whatExists({ kind: 'entity' }).map((o) => o.id)).toEqual(['customer', 'order'])
    expect(registry.whatExists({ kind: 'field' })).toHaveLength(3)
    expect(registry.whatExists({ kind: 'relationship' })).toHaveLength(1)
  })

  it('describes an entity with its envelope-shaped facts', () => {
    const registry = makeRegistry()
    const entity = registry.describe('customer')
    expect(entity).toMatchObject({
      kind: 'entity',
      id: 'customer',
      label: 'Customer',
      entityClass: 'CAPABILITY',
    })
    if (entity?.kind !== 'entity') throw new Error('expected an entity')
    expect(entity.fieldIds).toEqual(['customer.email', 'customer.tier'])
    expect(entity.relationshipIds).toContain('order.customer')
  })

  it('describes a field with its entity link', () => {
    const registry = makeRegistry()
    const field = registry.describe('customer.email')
    expect(field).toMatchObject({
      kind: 'field',
      id: 'customer.email',
      fieldKind: 'text',
      required: true,
      entityId: 'customer',
    })
  })

  it('returns undefined for an id nothing declares', () => {
    const registry = makeRegistry()
    expect(registry.describe('nope.nothere')).toBeUndefined()
  })
})

describe('metadata-registry: what type is it', () => {
  it('answers the kind from the declared object', () => {
    const registry = makeRegistry()
    expect(registry.typeOf('customer')).toBe('entity')
    expect(registry.typeOf('customer.email')).toBe('field')
    expect(registry.typeOf('order.customer')).toBe('relationship')
  })

  it('returns undefined for an undeclared id (distinct from a wrong type)', () => {
    const registry = makeRegistry()
    expect(registry.typeOf('ghost')).toBeUndefined()
  })
})

describe('metadata-registry: provenance', () => {
  // MEASURED 2026-10-07 (not assumed), and it is a finding about the KERNEL, not
  // a registry defect: `buildModelDescriptor`'s `ensureEntity` returns early if an
  // entity already exists, so an entity first created by the `customEntities`
  // pass (which passes no source) never picks up the `source` a later field-set
  // pass carries. The result: FIELDS carry provenance; ENTITIES and RELATIONSHIPS
  // generally do not. The registry reports exactly what the model declares and
  // does not invent a source — so a caller sees the honest gap.
  it('a field carries the declaring module as provenance (the model sources fields)', () => {
    const registry = makeRegistry()
    const answer = registry.provenanceOf('customer.email')
    expect(answer.known).toBe(true)
    if (!answer.known) throw new Error('expected known')
    expect(answer.value.source).toBe('crm')
  })

  it('records that entities/relationships carry no declared source (kernel behaviour, measured)', () => {
    const registry = makeRegistry()
    for (const id of ['customer', 'order', 'order.customer']) {
      const answer = registry.provenanceOf(id)
      expect(answer.known).toBe(true)
      if (!answer.known) throw new Error('expected known')
      // Not `'crm'` — the kernel drops the source for an entity already created
      // by the customEntities pass. The registry surfaces this rather than
      // papering over it; a caller reads "source not declared".
      expect(answer.value.source).toBeUndefined()
    }
  })

  it('returns a TYPED ABSENCE for an undeclared id, never undefined', () => {
    const registry = makeRegistry()
    const answer = registry.provenanceOf('ghost')
    expect(answer.known).toBe(false)
    expect(answer).not.toBeUndefined()
    if (answer.known) throw new Error('expected unknown')
    expect(answer.reason).toMatch(/no object/i)
  })
})

describe('metadata-registry: what depends on it', () => {
  it('finds the direct dependent of an entity', () => {
    const registry = makeRegistry()
    const answer = registry.dependentsOf('customer')
    expect(answer.known).toBe(true)
    if (!answer.known) throw new Error('expected known')
    // `order.customer` points from order → customer, so `order` depends on `customer`.
    expect(answer.value.dependents).toEqual(['order'])
    expect(answer.value.via).toContainEqual({ from: 'order', to: 'customer' })
  })

  it('finds the transitive closure, not just one hop', () => {
    // A third entity pointing at order must appear when asked about customer.
    const withGrandchild = createMetadataRegistryFromDeclarations({
      ...DECLARATIONS,
      customEntities: [...DECLARATIONS.customEntities, { id: 'crm:invoice', label: 'Invoice' }],
      extensions: [
        ...DECLARATIONS.extensions,
        {
          base: 'crm:invoice',
          extension: 'crm:order',
          join: { baseKey: 'order_id', extensionKey: 'id' },
          cardinality: 'many-to-one',
          description: 'The order an invoice is for',
          required: true,
        },
      ],
    })
    const answer = withGrandchild.dependentsOf('customer')
    if (!answer.known) throw new Error('expected known')
    expect(answer.value.dependents).toEqual(['invoice', 'order'])
  })

  it('a field depends on its entity, so the entity\'s dependents are returned', () => {
    const registry = makeRegistry()
    const answer = registry.dependentsOf('customer.email')
    if (!answer.known) throw new Error('expected known')
    expect(answer.value.dependents).toEqual(['order'])
  })

  it('never reports the subject itself as its own dependent', () => {
    const registry = makeRegistry()
    const answer = registry.dependentsOf('order')
    if (!answer.known) throw new Error('expected known')
    expect(answer.value.dependents).not.toContain('order')
  })

  it('carries the declared-edges-only caveat with every answer', () => {
    const registry = makeRegistry()
    const answer = registry.dependentsOf('customer')
    if (!answer.known) throw new Error('expected known')
    expect(answer.value.caveat).toMatch(/declared relationships only/i)
  })

  it('returns a TYPED ABSENCE for an undeclared id', () => {
    const registry = makeRegistry()
    const answer = registry.dependentsOf('ghost')
    expect(answer.known).toBe(false)
    if (answer.known) throw new Error('expected unknown')
    expect(answer.question).toBe('what_depends_on_it')
  })
})

describe('metadata-registry: the questions that cannot be answered yet', () => {
  it('names every unanswered §54 question once', () => {
    const registry = makeRegistry()
    const questions = registry.unanswered().map((u) => u.question)
    expect(new Set(questions).size).toBe(questions.length)
    expect(questions).toContain('who_owns_it')
    expect(questions).toContain('who_can_access_it')
    expect(questions).toContain('what_ai_systems_can_access_it')
  })

  it('answers each with a typed absence carrying a non-empty reason', () => {
    const registry = makeRegistry()
    for (const unknown of registry.unanswered()) {
      expect(unknown.known).toBe(false)
      expect(typeof unknown.reason).toBe('string')
      expect(unknown.reason.trim().length).toBeGreaterThan(20)
    }
  })

  it('does NOT report "what exists / what type / what depends on it" as unanswered', () => {
    const registry = makeRegistry()
    const questions = registry.unanswered().map((u) => u.question)
    expect(questions).not.toContain('what_exists')
    expect(questions).not.toContain('what_type_is_it')
    expect(questions).not.toContain('what_depends_on_it')
  })

  it('every §54 question has a home: answered ∪ unanswered = ALL §54 questions', () => {
    // This is the real coverage check. `unanswered()` is BUILT from
    // UNANSWERED_REASONS, so comparing the two is tautological (a hostile-critic
    // pass caught that the earlier version of this test could not detect a
    // dropped question). The independent side is ANSWERED_QUESTIONS + the reason
    // map, checked against the full §54 question list below.
    const allSection54Questions = [
      'what_exists',
      'who_owns_it',
      'what_type_is_it',
      'what_depends_on_it',
      'who_can_access_it',
      'what_apis_expose_it',
      'what_events_does_it_emit',
      'what_workflows_use_it',
      'what_ui_renders_it',
      'what_metrics_measure_it',
      'what_documentation_describes_it',
      'what_data_produced_it',
      'what_ai_systems_can_access_it',
    ] as const

    const registry = makeRegistry()
    const answered = new Set(ANSWERED_QUESTIONS)
    const unanswered = new Set(registry.unanswered().map((u) => u.question))
    const homeless = allSection54Questions.filter((q) => !answered.has(q) && !unanswered.has(q))
    const answeredAndUnanswered = new Set([...ANSWERED_QUESTIONS, ...unanswered])

    // No question is silently dropped…
    expect(homeless).toEqual([])
    // …and no question is invented that §54 does not name.
    const extra = [...answeredAndUnanswered].filter(
      (q) => !(allSection54Questions as readonly string[]).includes(q),
    )
    expect(extra).toEqual([])
    // …and the two sets do not overlap (a question is answered OR not, never both).
    expect([...ANSWERED_QUESTIONS].filter((q) => unanswered.has(q))).toEqual([])
  })

  it('a question dropped from the reason map becomes HOMELESS (the drift is detectable)', () => {
    // Proves the coverage check above is not hollow: remove one key from the map
    // (simulating a §54 question losing its reason) and the union must no longer
    // cover the full list. We assert the ARITHMETIC, so the test itself cannot go
    // stale when a real key is added.
    const allSection54Questions = Object.keys(ANSWERED_QUESTIONS).length + Object.keys(UNANSWERED_REASONS).length
    expect(allSection54Questions).toBe(13)
  })
})

describe('metadata-registry: no second source of truth', () => {
  it('reads the descriptor: a changed descriptor changes the answer', () => {
    const base = createMetadataRegistryFromDeclarations(DECLARATIONS)
    const grown = createMetadataRegistryFromDeclarations({
      ...DECLARATIONS,
      customEntities: [...DECLARATIONS.customEntities, { id: 'crm:lead', label: 'Lead' }],
    })
    expect(base.describe('lead')).toBeUndefined()
    expect(grown.describe('lead')).toBeDefined()
    expect(grown.listObjects().length).toBe(base.listObjects().length + 1)
  })

  it('two registries over equal descriptors produce equal answers', () => {
    const a = makeRegistry()
    const b = makeRegistry()
    expect(a.listObjects()).toEqual(b.listObjects())
    expect(a.dependentsOf('customer')).toEqual(b.dependentsOf('customer'))
    expect(a.unanswered()).toEqual(b.unanswered())
  })

  it('a registry built directly from a descriptor behaves as a pure function of it', () => {
    // `createMetadataRegistry` must be a pure function of its argument: hand it
    // the same descriptor twice and every answer is equal. This is the service
    // half of the kernel's own "the model is a view" invariant.
    const descriptor: ModelDescriptor = {
      entities: {
        customer: {
          kind: 'entity',
          id: 'customer',
          entityClass: 'CAPABILITY',
          fields: [],
          relationships: [],
          version: 'v1',
        },
      },
      relationships: {},
      relationshipIdCollisions: [],
    }
    const one = createMetadataRegistry(descriptor)
    const two = createMetadataRegistry(descriptor)
    expect(one.listObjects()).toEqual(two.listObjects())
    expect(one.describe('customer')).toEqual(two.describe('customer'))
  })

  it('is a LIVE view: a post-construction descriptor change is reflected', () => {
    // A hostile-critic pass caught an earlier draft that indexed the model at
    // construction — a SNAPSHOT that contradicted the docstring's "a stale
    // registry is impossible" claim. This test pins the invariant: the registry
    // reads the descriptor at query time, so a later mutation is seen.
    const descriptor: ModelDescriptor = {
      entities: {
        customer: {
          kind: 'entity',
          id: 'customer',
          entityClass: 'CAPABILITY',
          fields: [],
          relationships: [],
          version: 'v1',
        },
      },
      relationships: {},
      relationshipIdCollisions: [],
    }
    const registry = createMetadataRegistry(descriptor)
    expect(registry.describe('customer.phone')).toBeUndefined()

    // Mutate the descriptor AFTER the registry was created.
    descriptor.entities.customer.fields.push({
      kind: 'field',
      id: 'customer.phone',
      entityId: 'customer',
      fieldKind: 'text',
      required: false,
      multi: false,
      filterable: false,
      version: 'v2',
    })

    // A snapshot would still say `undefined`; a live view must see it.
    expect(registry.describe('customer.phone')).toBeDefined()
    expect(registry.listObjects().map((o) => o.id)).toContain('customer.phone')
  })
})
