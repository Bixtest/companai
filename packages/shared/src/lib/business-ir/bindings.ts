/**
 * The physical bindings — the declared mapping from the canonical model to the
 * physical database.
 *
 * G-01's model sits **above** the physical database on purpose: its identity is
 * the canonical id (`user`), never the platform's `EntityId` (`auth:user`), and
 * its relationships carry meaning, never join columns. Both of those are
 * **physical** facts, and the model deliberately does not hold them.
 *
 * So the compiler is *handed* the binding rather than reading it out of the
 * model — and the binding is **derived, not guessed**:
 *
 *   - the entity mapping is computed with **G-01's own** `canonicalEntityId`, so
 *     the two can never disagree about what `auth:user` maps to;
 *   - the relationship binding is keyed by the **model's own relationship id**,
 *     matched to a declaration by its endpoints — so no id formula is written
 *     twice, and the two cannot drift;
 *   - two platform entities that collapse to one canonical id are **reported**,
 *     exactly as the model reports relationship-id collisions, never merged.
 *
 * Source: SPEC-business-model-kernel.md §12.1 (a declared mapping, never the
 * same string); Doc 3 §51 (physical planner).
 */

import { canonicalEntityId } from '../kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '../kernel/model'

/** Where one canonical entity lives physically. */
export type EntityBinding = {
  /** The platform's own id, `'<module>:<entity>'`. */
  platformEntityId: string
  /** The physical table, when it is known. */
  table?: string
}

/** How one canonical relationship joins. */
export type RelationshipBinding = {
  /** The column on the *from* (base) side. */
  fromField: string
  /** The column on the *to* (extension) side. */
  toField: string
  type: 'left' | 'inner'
}

export type PhysicalBindings = {
  /** Canonical entity id → where it lives. */
  entities: Record<string, EntityBinding>
  /** Canonical relationship id → how it joins. */
  relationships: Record<string, RelationshipBinding>
  /**
   * Two platform entity ids that collapse to one canonical id.
   *
   * Empty in a healthy model. A non-empty list is a **finding**: the canonical
   * id cannot tell the two apart, so one binding must be chosen deliberately
   * before the model can represent both.
   */
  entityIdCollisions: Array<{ canonicalId: string; platformEntityIds: string[] }>
  /** Model relationships with no declaration behind them, so no join can be built. */
  unboundRelationships: string[]
}

/**
 * Derive the bindings from the same declarations the kernel reads.
 *
 * `model` is required, and it is what makes this drift-proof: the relationship
 * bindings are keyed by the **model's** relationship ids, so a binding can only
 * exist for a relationship the model actually declares.
 */
export function createBindingsFromDeclarations(
  input: KernelDeclarationInput,
  model: ModelDescriptor,
): PhysicalBindings {
  const entities: Record<string, EntityBinding> = {}
  const byCanonical = new Map<string, Set<string>>()

  const bindEntity = (moduleEntityId: string): void => {
    const canonical = canonicalEntityId(moduleEntityId)
    if (!entities[canonical]) entities[canonical] = { platformEntityId: moduleEntityId }
    const set = byCanonical.get(canonical) ?? new Set<string>()
    set.add(moduleEntityId)
    byCanonical.set(canonical, set)
  }

  // Every entity the declarations name — custom entities, field-set owners, and
  // both ends of every extension. The kernel discovers entities the same way.
  for (const spec of input.customEntities ?? []) bindEntity(spec.id)
  for (const set of input.customFieldSets ?? []) bindEntity(set.entity)
  for (const extension of input.extensions ?? []) {
    bindEntity(extension.base)
    bindEntity(extension.extension)
  }

  const entityIdCollisions: PhysicalBindings['entityIdCollisions'] = []
  for (const [canonicalId, ids] of byCanonical) {
    if (ids.size > 1) {
      entityIdCollisions.push({ canonicalId, platformEntityIds: [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) })
    }
  }
  entityIdCollisions.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId))

  // The join columns, keyed by the pair of canonical endpoints. Matching on
  // endpoints (not on a re-derived id) is what keeps this from drifting from the
  // model's own relationship-id formula.
  const joinByEndpoints = new Map<string, RelationshipBinding>()
  for (const extension of input.extensions ?? []) {
    const key = `${canonicalEntityId(extension.base)}->${canonicalEntityId(extension.extension)}`
    joinByEndpoints.set(key, {
      fromField: extension.join.baseKey,
      toField: extension.join.extensionKey,
      type: 'left',
    })
  }

  const relationships: Record<string, RelationshipBinding> = {}
  const unboundRelationships: string[] = []
  for (const relationship of Object.values(model.relationships ?? {})) {
    const key = `${relationship.fromEntityId}->${relationship.toEntityId}`
    const join = joinByEndpoints.get(key)
    if (!join) {
      unboundRelationships.push(relationship.id)
      continue
    }
    relationships[relationship.id] = { ...join }
  }
  unboundRelationships.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  return {
    entities: sortRecord(entities),
    relationships: sortRecord(relationships),
    entityIdCollisions,
    unboundRelationships,
  }
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {}
  for (const key of Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) sorted[key] = record[key]
  return sorted
}
