/**
 * The Business Model Kernel — the canonical model, as a *view*.
 *
 * The kernel is the canonical, versioned, typed business model **above** the
 * physical database (RQ-01). This module builds that model by **reading** what
 * the platform already declares — it holds no copy of it.
 *
 * **Why a view and not a store.** The platform already keeps field and entity
 * definitions in `custom_field_defs` / `custom_entity`, synchronised from
 * module declarations by `install-from-ce.ts`. If the kernel kept its own copy,
 * there would be two sources of truth that drift apart — which is the exact
 * failure the vision forbids (Doc 4 §54: search is a projection, never a second
 * database; Doc 8 §110: a projection declares its source). So
 * `buildModelDescriptor` reads, and the drift guard in the tests proves the two
 * agree.
 *
 * **The canonical ID is the key.** Every object here is keyed by the §12.1
 * canonical id, not by a module-local name, so the model is stable across
 * renames and unambiguous across modules.
 *
 * Source: SPEC-business-model-kernel.md §4.1 (the 21-item contract), §5.4 (the
 * objects), §12.1 (the id grammar).
 */

import { entityIdOf, fieldIdOf, relationshipIdOf } from './canonical-id'
import type { EntityExtension, CustomFieldDefinition, CustomEntitySpec } from '../../modules/entities'

/**
 * The six entity classes (spec §5.1, RQ-06). Applied to *entities*, not to all
 * kernel objects — an `Entity` declares which class governs it.
 */
export type EntityClass =
  | 'CORE'
  | 'CAPABILITY'
  | 'PROJECTION'
  | 'REFERENCE'
  | 'EXTERNAL'
  | 'TEMPORARY'

/**
 * The 21-item contract, declared once (spec §4.2).
 *
 * Every kernel object carries these. Declaring them in one place and
 * intersecting is what makes "every object has a declared contract" true by
 * construction rather than by a reviewer's memory.
 *
 * Fields the platform does not yet populate are **explicitly absent** (`?`) and
 * never silently defaulted — an absent value is a declared gap, not a
 * convention.
 */
export type KernelObjectContract = {
  /** The §12.1 canonical id — the object's stable identity. */
  id: string
  /** A localised display name. Changing it never changes `id`. */
  label?: string
  description?: string
  /** Semantic version of this object's meaning (spec §5.4 `Version`). */
  version?: string
  /** Lifecycle state, when the object has one. */
  lifecycle?: string
  /** Data classification (spec §12.2). */
  classification?: string
  /** Where the object came from — a module id, or "tenant". */
  source?: string
}

/** A declared entity — a business concept with identity, grain and lifecycle. */
export type KernelEntity = KernelObjectContract & {
  kind: 'entity'
  /** Which class governs it (spec §5.1). Defaults to CAPABILITY — the safest. */
  entityClass: EntityClass
  /** What one row means (spec §5.2, §7). Optional until declared. */
  grain?: string
  fields: KernelField[]
  relationships: KernelRelationship[]
}
/** A declared attribute of an entity. */
export type KernelField = KernelObjectContract & {
  kind: 'field'
  /** The declared kind from the platform's custom-field model. */
  fieldKind: CustomFieldDefinition['kind']
  required: boolean
  multi: boolean
  /** Whether the field may be filtered/searched, declared, never inferred. */
  filterable: boolean
  /** The entity this field is a direct child of. */
  entityId: string
}

/**
 * A declared edge between two entities (RQ-05).
 *
 * The seven attributes below are what makes a relationship *first-class
 * metadata* rather than an implicit join. The platform's `EntityExtension`
 * already declares cardinality, optionality and a description; the remaining
 * attributes are **explicitly optional** — an unset one is a gap the model
 * reports, not a default it invents.
 */
export type KernelRelationship = KernelObjectContract & {
  kind: 'relationship'
  /** The entity the edge leaves from (the `base`). */
  fromEntityId: string
  /** The entity the edge arrives at (the `extension`). */
  toEntityId: string
  /** How many of each side. Declared, from the platform's `EntityExtension`. */
  cardinality?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  /** Whether the edge is required. Declared. */
  optionality: boolean
  /** Which side owns the edge. Not yet declared by the platform. */
  ownership?: 'source' | 'target' | 'shared'
  /** Whether traversal is permitted in each direction. */
  allowedTraversal?: { fromTo: boolean; toFrom: boolean }
  /** What happens when one side is deleted. */
  deleteBehaviour?: 'restrict' | 'cascade' | 'orphan' | 'soft'
  /** How security classification flows along the edge. */
  securityInheritance?: 'none' | 'from-source' | 'strictest'
  /**
   * Whether this edge can multiply rows in a join — the "multiplicity risk"
   * the vision names. A `one-to-many` edge read from the *many* side is a
   * classic double-count. Not yet computed; declared absent on purpose.
   */
  multiplicityRisk?: 'none' | 'row-multiplication'
}

/** The whole model, keyed by canonical id. */
export type ModelDescriptor = {
  entities: Record<string, KernelEntity>
  /** Every relationship in the model, keyed by relationship canonical id. */
  relationships: Record<string, KernelRelationship>
  /**
   * Relationship ids that more than one declaration would claim.
   *
   * Empty in a healthy model. A non-empty list is a **finding**, not a warning:
   * it means two declared edges collapse to one id, so the model cannot
   * represent both — and the affected relationships must be given distinct
   * names before they can be first-class metadata.
   */
  relationshipIdCollisions: Array<{ id: string; declarations: string[] }>
}

/**
 * The declarations the kernel reads.
 *
 * These are the platform's own shapes, imported rather than re-declared, so the
 * kernel cannot drift from what modules actually write.
 */
export type KernelDeclarationInput = {
  /** Declared custom entities (from each module's `ce.ts`). */
  customEntities: CustomEntitySpec[]
  /** Declared fields, per entity id (from `defineFields` / `ce.ts` field sets). */
  customFieldSets: Array<{ entity: string; fields: CustomFieldDefinition[]; source?: string }>
  /**
   * Declared extensions (from each module's `data/extensions.ts`).
   *
   * The generated registry already merges these; we accept them raw so the
   * kernel does not need the generated file at unit-test time.
   */
  extensions: EntityExtension[]
}

/**
 * Builds the canonical model by reading the declarations.
 *
 * **It holds no copy.** The returned descriptor is derived entirely from
 * `input`; calling it twice with the same input yields equal output, and there
 * is no module-level state a second caller could observe.
 *
 * Entities are discovered from three sources and merged:
 *   - every `customEntity` spec;
 *   - every entity that carries a field set;
 *   - every entity named as either end of a declared extension.
 *
 * The third source matters: a relationship can link an entity that declares no
 * fields of its own (the `auth:user` → `external_conversation` edge does
 * exactly this), and the model must still contain that entity so the edge has
 * both ends.
 */
export function buildModelDescriptor(input: KernelDeclarationInput): ModelDescriptor {
  const entities = new Map<string, KernelEntity>()
  const relationships: Record<string, KernelRelationship> = {}

  const ensureEntity = (moduleEntityId: string, source?: string): KernelEntity => {
    const canonical = canonicalEntityId(moduleEntityId)
    const existing = entities.get(canonical)
    if (existing) return existing
    const created: KernelEntity = {
      kind: 'entity',
      id: canonical,
      entityClass: 'CAPABILITY',
      fields: [],
      relationships: [],
      source,
    }
    entities.set(canonical, created)
    return created
  }

  // 1. Declared custom entities.
  for (const spec of input.customEntities) {
    const entity = ensureEntity(spec.id)
    if (spec.label) entity.label = spec.label
    if (spec.description) entity.description = spec.description
  }

  // 2. Declared field sets.
  for (const set of input.customFieldSets) {
    const entity = ensureEntity(set.entity, set.source)
    for (const field of set.fields ?? []) {
      entity.fields.push({
        kind: 'field',
        id: fieldIdOf(entity.id, field.key),
        entityId: entity.id,
        label: field.label,
        description: field.description,
        fieldKind: field.kind,
        required: field.required === true,
        multi: field.multi === true,
        filterable: field.filterable === true,
        source: set.source,
      })
    }
  }

  // 3. Declared relationships — both ends guaranteed present.
  //
  // The relationship id is `<from-entity>.<extension-leaf>` (spec §12.1:
  // `<entity>.<relationship>`). The relationship's own name is the *extension's*
  // canonical leaf, because that is the only stable name the platform's
  // `EntityExtension` carries today — it has no relationship-name field. Two
  // edges that share a target but differ in source therefore stay distinct
  // (`user.external_conversation` vs `customer_entity.external_conversation`).
  //
  // Where that is not enough — one entity declaring two edges to the same
  // extension — two ids would collide and one edge would silently overwrite the
  // other. That is exactly the "two different things share one id" case §12.1
  // forbids, so it is collected and reported rather than hidden.
  const relationshipIdCollisions: Array<{ id: string; declarations: string[] }> = []
  const relIdSources = new Map<string, string[]>()

  for (const extension of input.extensions) {
    const from = ensureEntity(extension.base)
    const to = ensureEntity(extension.extension)
    const relId = relationshipIdOf(from.id, leafOf(extension.extension))

    const sources = relIdSources.get(relId) ?? []
    sources.push(`${extension.base} -> ${extension.extension}`)
    relIdSources.set(relId, sources)

    const relationship: KernelRelationship = {
      kind: 'relationship',
      id: relId,
      fromEntityId: from.id,
      toEntityId: to.id,
      cardinality: extension.cardinality,
      optionality: extension.required !== true,
      description: extension.description,
      // Kernel relationship attributes (G-08, RQ-05), read from the declared
      // `attributes` block when present. What is not declared stays absent —
      // declared absence, never an invented default (spec §5.4).
      ownership: extension.attributes?.ownership,
      allowedTraversal: extension.attributes?.allowedTraversal,
      deleteBehaviour: extension.attributes?.deleteBehaviour,
      securityInheritance: extension.attributes?.securityInheritance,
      multiplicityRisk: extension.attributes?.multiplicityRisk,
    }
    relationships[relId] = relationship
    from.relationships.push(relationship)
    if (to !== from) to.relationships.push(relationship)
  }

  for (const [id, declarations] of relIdSources) {
    if (declarations.length > 1) relationshipIdCollisions.push({ id, declarations })
  }

  // Sort fields and relationships by canonical id so the model is deterministic
  // — the round-trip's byte equality depends on it.
  for (const entity of entities.values()) {
    entity.fields.sort((a, b) => a.id.localeCompare(b.id))
    entity.relationships.sort((a, b) => a.id.localeCompare(b.id))
  }

  // Give every object a version derived from its own declared content.
  //
  // The plan requires the model to carry "declared contracts **and versions**".
  // A version field that is always empty would satisfy the letter and not the
  // meaning, so each object gets a version computed from what it declares: change
  // the declaration and the version changes; leave it alone and it does not.
  // Deterministic by construction, so the round-trip stays empty.
  for (const entity of entities.values()) {
    entity.version = contentVersion({
      id: entity.id,
      entityClass: entity.entityClass,
      grain: entity.grain ?? null,
      fields: entity.fields.map((f) => f.id),
    })
    for (const field of entity.fields) {
      field.version = contentVersion({
        id: field.id,
        fieldKind: field.fieldKind,
        required: field.required,
        multi: field.multi,
        filterable: field.filterable,
        label: field.label ?? null,
      })
    }
  }
  for (const relationship of Object.values(relationships)) {
    relationship.version = contentVersion({
      id: relationship.id,
      from: relationship.fromEntityId,
      to: relationship.toEntityId,
      cardinality: relationship.cardinality ?? null,
      optionality: relationship.optionality,
      ownership: relationship.ownership ?? null,
      deleteBehaviour: relationship.deleteBehaviour ?? null,
      securityInheritance: relationship.securityInheritance ?? null,
      multiplicityRisk: relationship.multiplicityRisk ?? null,
    })
  }

  return {
    entities: sortRecord(Object.fromEntries(entities)),
    relationships: sortRecord(relationships),
    relationshipIdCollisions: relationshipIdCollisions.sort((a, b) => a.id.localeCompare(b.id)),
  }
}

/**
 * A deterministic short version of a value.
 *
 * FNV-1a, 32-bit, hex — chosen because it is pure (no `crypto`, so it runs in a
 * browser, a worker, a CLI and a test alike) and stable across runs and
 * machines, which is what the round-trip needs. It is a *content* version, not
 * a security hash: it answers "did the declaration change?", never "was this
 * tampered with?".
 */
export function contentVersion(value: unknown): string {
  const text = stableKey(value)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** JSON with object keys sorted, so equal values always stringify identically. */
function stableKey(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        out[key] = (v as Record<string, unknown>)[key]
      }
      return out
    }
    return v
  })
}

/**
 * Maps a platform module-qualified entity id (`'auth:user'`) to a canonical
 * entity id (`'user'`).
 *
 * **A declared mapping, not a guess.** The platform's `<module>:<entity>` form
 * encodes the module; the canonical form must not, because a canonical id has
 * to survive the entity moving between modules. The leaf is taken as the
 * canonical name, and where two modules declare the same leaf the kernel
 * reports a collision rather than silently picking one — see
 * `findEntityIdCollisions`.
 */
export function canonicalEntityId(moduleEntityId: string): string {
  const leaf = leafOf(moduleEntityId)
  return entityIdOf(leaf)
}

function leafOf(moduleEntityId: string): string {
  const idx = moduleEntityId.lastIndexOf(':')
  return idx === -1 ? moduleEntityId : moduleEntityId.slice(idx + 1)
}

/**
 * Finds two module-qualified entity ids that would collapse to one canonical
 * id. This is a real hazard: two modules may both own a `message` entity, and
 * silently merging them would be the "two different things share one ID" case
 * the grammar forbids.
 */
export function findEntityIdCollisions(
  moduleEntityIds: readonly string[],
): Array<{ canonicalId: string; moduleEntityIds: string[] }> {
  const byCanonical = new Map<string, string[]>()
  for (const id of moduleEntityIds) {
    const canonical = canonicalEntityId(id)
    const list = byCanonical.get(canonical) ?? []
    list.push(id)
    byCanonical.set(canonical, list)
  }
  return Array.from(byCanonical.entries())
    .filter(([, ids]) => new Set(ids).size > 1)
    .map(([canonicalId, moduleEntityIds]) => ({ canonicalId, moduleEntityIds: [...new Set(moduleEntityIds)].sort() }))
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {}
  for (const key of Object.keys(record).sort()) sorted[key] = record[key]
  return sorted
}
