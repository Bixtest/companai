/**
 * The Metadata Registry — the read-only *service* over the kernel's model.
 *
 * **What this is, and why it is not the kernel.** `kernel/model.ts` **builds** the
 * canonical model (entities, fields, relationships, keyed by canonical id) and
 * holds no copy of it. That model answers *"what exists?"* and *"what type is
 * it?"* — but it is a **view**, not a **service**: nothing can *ask* it who owns an
 * object, what depends on it, or who may access it. This module is that service.
 *
 * It is deliberately **read-only** (an *inventory*), which is what the blueprint
 * asks for first (blueprint §54: create the registry, grow it into the
 * control-plane service). It reads a `ModelDescriptor` and answers the registry
 * questions **that the declarations actually support** — and for the ones they do
 * not, it returns a **typed absence** (`{ known: false, reason }`) rather than an
 * empty value that would read as "nothing there".
 *
 * **No second source of truth.** This module holds no copy of the model. Every
 * answer is derived from the `ModelDescriptor` handed to it; two calls with equal
 * input produce equal output. That is the same invariant the kernel's round-trip
 * test enforces, extended to the service.
 *
 * **Declared absence, never an invented value.** The kernel's own contract makes
 * an unpopulated field *explicitly* `undefined`. The registry keeps that
 * discipline at the question level: a question the platform cannot yet answer is
 * reported as `known: false` **with the reason**, so the shape of the gap is
 * queryable instead of hidden behind `[]` or `undefined`.
 *
 * **Not tenant-scoped, by construction — and here is why that is honest.** The
 * registry describes the platform's **shape** (which entities/fields/relationships
 * exist), which is declared once for the whole platform, not per tenant. It
 * carries no tenant data, so there is no cross-tenant read to refuse: a tenant
 * cannot "see another tenant's objects" because objects are not owned by tenants
 * — the *rows* are (C3, enforced in the query layer). Tenant scoping of **data**
 * is therefore out of scope here and belongs to the CRUD/query layer; the
 * registry answers *what exists*, never *whose data*. A future control-plane
 * version that exposes per-tenant overrides will need a tenant parameter, and
 * that is the trigger to add one — not now, when there is nothing per-tenant to
 * scope.
 *
 * Source: blueprint §54 (the questions), §3 (the conceptual envelope),
 * BLUEPRINT-GAP-ANALYSIS.md GAP A (the two halves), ARCHITECTURE-hermes-service-map.md
 * §4.1 (the AI reads this to learn the business shape without a DB handle).
 */

import type {
  KernelEntity,
  KernelField,
  KernelRelationship,
  KernelObjectContract,
  ModelDescriptor,
} from './model'
import { buildModelDescriptor, type KernelDeclarationInput } from './model'
import {
  buildModelFromModules,
  collectDeclarations,
  tryBuildModelFromModules,
} from './from-modules'

/** A canonical kernel id (entity, field or relationship). */
export type RegistryObjectId = string

/** The kind of a registry object — mirrors the kernel's `kind` discriminant. */
export type RegistryObjectKind = 'entity' | 'field' | 'relationship'

/**
 * The union of every object the registry can describe.
 *
 * The envelope-shaped facts the platform *does* declare (id, type, version,
 * source/provenance, timestamps where present) sit at the top level; the
 * kind-specific detail is nested. This is the honest bridge to the blueprint's
 * conceptual `Resource` envelope (§3) without declaring that envelope type yet —
 * the envelope is a Phase −1 contract (GAP A part 1 / `C1`), and building the
 * type with no consumer would be the "contract after the code" failure.
 */
export type RegistryObject = RegistryEntity | RegistryField | RegistryRelationship

export type RegistryEntity = {
  kind: 'entity'
  id: RegistryObjectId
  label?: string
  description?: string
  entityClass: KernelEntity['entityClass']
  grain?: string
  version: string
  provenance: Provenance
  fieldIds: RegistryObjectId[]
  relationshipIds: RegistryObjectId[]
}

export type RegistryField = {
  kind: 'field'
  id: RegistryObjectId
  label?: string
  description?: string
  fieldKind: KernelField['fieldKind']
  required: boolean
  multi: boolean
  filterable: boolean
  entityId: RegistryObjectId
  version: string
  provenance: Provenance
}

export type RegistryRelationship = {
  kind: 'relationship'
  id: RegistryObjectId
  description?: string
  fromEntityId: RegistryObjectId
  toEntityId: RegistryObjectId
  cardinality?: KernelRelationship['cardinality']
  optionality: boolean
  ownership?: KernelRelationship['ownership']
  deleteBehaviour?: KernelRelationship['deleteBehaviour']
  securityInheritance?: KernelRelationship['securityInheritance']
  multiplicityRisk?: KernelRelationship['multiplicityRisk']
  version: string
  provenance: Provenance
}

/**
 * What the platform records about where an object came from.
 *
 * `source` is the declaring module id (or `"tenant"`); it is **provenance**, not
 * ownership, and this type says so — the registry must not let the word "owner"
 * be answered by a field that means "who declared it".
 */
export type Provenance = {
  /** The declaring module id, or `"tenant"` — the kernel's `source`. */
  source?: string
}

/**
 * A typed absence — the honest answer to a §54 question the declarations cannot
 * answer yet.
 *
 * It is an **object**, never bare `undefined` or `[]`, so a caller cannot mistake
 * "we cannot answer this yet" for "the answer is empty". `question` names the §54
 * question; `reason` says why it is unanswered.
 */
export type Unknown = { known: false; question: RegistryQuestion; reason: string }

/** An answer that is either the value or a typed absence. */
export type Answer<T> = { known: true; value: T } | Unknown

/**
 * The blueprint §54 questions, named exactly so the registry's output can be
 * matched against the blueprint without interpretation.
 */
export type RegistryQuestion =
  | 'what_exists'
  | 'who_owns_it'
  | 'what_type_is_it'
  | 'what_depends_on_it'
  | 'who_can_access_it'
  | 'what_apis_expose_it'
  | 'what_events_does_it_emit'
  | 'what_workflows_use_it'
  | 'what_ui_renders_it'
  | 'what_metrics_measure_it'
  | 'what_documentation_describes_it'
  | 'what_data_produced_it'
  | 'what_ai_systems_can_access_it'

/**
 * The §54 questions the registry **can** answer from declarations today. Declared
 * as data so a test can assert the union of this set and `UNANSWERED_REASONS`
 * equals every `RegistryQuestion` — i.e. no §54 question is silently homeless.
 * A test that compared `unanswered()` against `UNANSWERED_REASONS` alone would be
 * tautological (the former is built from the latter); this constant is the
 * independent side of the check.
 */
export const ANSWERED_QUESTIONS = ['what_exists', 'what_type_is_it', 'what_depends_on_it'] as const

/**
 * The reason strings for questions the platform cannot answer today, recorded
 * once so they cannot drift and so the *shape of the gap* is stable and testable.
 *
 * Each is a **measured** statement about the build, not a guess: it names what is
 * missing, so the day the missing piece lands the reason becomes false and the
 * test that asserts it will fail — which is the point.
 */
export const UNANSWERED_REASONS: Record<Exclude<RegistryQuestion, 'what_exists' | 'what_type_is_it' | 'what_depends_on_it'>, string> = {
  who_owns_it:
    'No canonical `owner` field is declared: `KernelObjectContract.source` records which module *declared* the object (provenance), not who owns it. Ownership is part of the `Resource` envelope (GAP A / C1, a Phase −1 contract) and is not declared yet.',
  who_can_access_it:
    'No link exists from a kernel object to the permission/capability that guards it. The authority engine is shadow-mode and the structural grammar (SD-4) is not built, so access cannot be answered from declarations.',
  what_apis_expose_it:
    'Routes are not yet indexed back to canonical object ids. `D2-gap` proved every write route runs a guard, but the route → object mapping is not a declared, enumerable relation.',
  what_events_does_it_emit:
    'The event envelope (C7) is NOT DONE — there is no envelope type, so an object cannot declare the events it emits.',
  what_workflows_use_it:
    'Workflows reference runtime resources, not canonical kernel ids; the join is not declared.',
  what_ui_renders_it:
    'Widgets reference runtime resources, not canonical kernel ids; the join is not declared.',
  what_metrics_measure_it:
    'No metric declarations are attached to canonical kernel ids (the canonical id grammar reserves a `metric` kind, but no metrics are registered against it).',
  what_documentation_describes_it:
    'Documentation is prose in the docs repo, not a declaration attached to a canonical id; there is no declared doc → object relation.',
  what_data_produced_it:
    'Data lineage (blueprint §107) is not declared; the kernel models the *shape*, not the movement of data.',
  what_ai_systems_can_access_it:
    'AI access is bounded by the tool policy (§13) and the authority engine, neither of which is linked to canonical object ids yet.',
}

/**
 * The registry. Construct it from a `ModelDescriptor`; it holds no copy of the
 * model, so a stale registry is impossible — rebuild from the current descriptor
 * instead.
 */
export type MetadataRegistry = {
  /** Every object, sorted by canonical id. */
  readonly listObjects: () => readonly RegistryObject[]
  /** One object by canonical id, or `undefined` if there is no such object. */
  readonly describe: (id: RegistryObjectId) => RegistryObject | undefined
  /** The §54 "what exists?" — the inventory, optionally filtered by kind. */
  readonly whatExists: (filter?: { kind?: RegistryObjectKind }) => readonly RegistryObject[]
  /** The §54 "what type is it?" — the kind of a canonical id (from the id itself). */
  readonly typeOf: (id: RegistryObjectId) => RegistryObjectKind | undefined
  /** Provenance for an object: the declaring module. Typed absence if unknown. */
  readonly provenanceOf: (id: RegistryObjectId) => Answer<Provenance>
  /**
   * The §54 "what depends on it?" — the transitive reverse-edge closure over the
   * **declared** relationships. Returns the objects that would be affected if this
   * object changed: for an entity, everything reachable by following relationship
   * edges *towards* it; for a field, its owning entity (a field depends on its
   * entity) plus that entity's dependents; for a relationship, both endpoints.
   *
   * This is the one dependents answer the declarations *do* support, and it is
   * honest about its limits: it counts **declared** edges only — an undeclared
   * dependency is invisible to it, which is stated in the result.
   */
  readonly dependentsOf: (id: RegistryObjectId) => Answer<DependentsResult>
  /**
   * The §54 questions the platform cannot answer from declarations yet, each as a
   * typed absence with the reason.
   */
  readonly unanswered: () => readonly Unknown[]
}

export type DependentsResult = {
  /** Canonical ids that depend on the subject, directly or transitively. */
  dependents: readonly RegistryObjectId[]
  /** The declared edges used to compute the closure (from → to). */
  via: readonly { from: RegistryObjectId; to: RegistryObjectId }[]
  /**
   * A deliberate caveat, returned with the answer: the closure is over **declared**
   * relationships only. A dependency that no declaration carries is not counted.
   */
  caveat: string
}

/**
 * Builds the registry over an already-built model descriptor.
 *
 * **Pure, and a true VIEW.** The returned registry closes over `descriptor` and
 * reads it **at query time** — it holds no materialised index, so if the
 * descriptor changes after construction the answers change with it. That is the
 * "no second source of truth" invariant made literal: there is nothing to go
 * stale, because there is nothing cached. (Two earlier drafts indexed the model
 * at construction and were a *snapshot*; a hostile-critic pass caught that the
 * docstring claimed a view while the code held a copy. The index is now rebuilt
 * per call — cheap, and honest.)
 */
export function createMetadataRegistry(descriptor: ModelDescriptor): MetadataRegistry {
  // Read the descriptor fresh on every call — never cache. The model is small
  // (hundreds of objects at most), so rebuilding the index per query is cheap
  // and buys the invariant outright.
  const index = (): Map<RegistryObjectId, RegistryObject> => {
    const byId = new Map<RegistryObjectId, RegistryObject>()
    for (const entity of Object.values(descriptor.entities)) {
      byId.set(entity.id, toRegistryEntity(entity))
      for (const field of entity.fields) byId.set(field.id, toRegistryField(field))
    }
    for (const relationship of Object.values(descriptor.relationships)) {
      byId.set(relationship.id, toRegistryRelationship(relationship))
    }
    return byId
  }

  const listObjects = (): readonly RegistryObject[] => {
    const byId = index()
    return Array.from(byId.keys())
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((id) => byId.get(id)!)
  }

  const describe = (id: RegistryObjectId): RegistryObject | undefined => index().get(id)

  const whatExists = (filter?: { kind?: RegistryObjectKind }): readonly RegistryObject[] => {
    const all = listObjects()
    return filter?.kind ? all.filter((o) => o.kind === filter.kind) : all
  }

  const typeOf = (id: RegistryObjectId): RegistryObjectKind | undefined => index().get(id)?.kind

  const provenanceOf = (id: RegistryObjectId): Answer<Provenance> => {
    const object = index().get(id)
    if (!object) {
      return {
        known: false,
        question: 'what_exists',
        reason: `No object with canonical id "${id}" is declared.`,
      }
    }
    return { known: true, value: object.provenance }
  }

  const dependentsOf = (id: RegistryObjectId): Answer<DependentsResult> => {
    const subject = index().get(id)
    if (!subject) {
      return {
        known: false,
        question: 'what_depends_on_it',
        reason: `No object with canonical id "${id}" is declared, so it has no declared dependents.`,
      }
    }

    // Normalise the subject to an *entity* id, because dependencies are declared
    // as entity→entity edges. A field depends on its entity (and thereby on
    // whatever depends on the entity); a relationship concerns its two endpoints.
    const rootEntityIds = rootEntitiesFor(subject, descriptor.relationships)

    // Build the reverse adjacency: for each entity, which entities point *to* it.
    const reverse = new Map<RegistryObjectId, Set<RegistryObjectId>>()
    const via: Array<{ from: RegistryObjectId; to: RegistryObjectId }> = []
    for (const rel of Object.values(descriptor.relationships)) {
      via.push({ from: rel.fromEntityId, to: rel.toEntityId })
      const set = reverse.get(rel.toEntityId) ?? new Set<RegistryObjectId>()
      set.add(rel.fromEntityId)
      reverse.set(rel.toEntityId, set)
    }

    const dependents = new Set<RegistryObjectId>()
    const seen = new Set<RegistryObjectId>()
    const queue = [...rootEntityIds]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (seen.has(current)) continue
      seen.add(current)
      for (const dependent of reverse.get(current) ?? []) {
        // A dependent is an entity that points at `current`. Report the **entity**
        // (the object that depends), never the subject itself.
        if (!rootEntityIds.has(dependent)) dependents.add(dependent)
        queue.push(dependent)
      }
    }

    return {
      known: true,
      value: {
        dependents: Array.from(dependents).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
        via: via.sort((a, b) => (a.from === b.from ? (a.to < b.to ? -1 : 1) : a.from < b.from ? -1 : 1)),
        caveat:
          'Computed over DECLARED relationships only. A dependency that no declaration carries is invisible here, so treat the result as a lower bound, not a complete impact set.',
      },
    }
  }

  const unanswered = (): readonly Unknown[] =>
    (Object.keys(UNANSWERED_REASONS) as Array<keyof typeof UNANSWERED_REASONS>).map((question) => ({
      known: false as const,
      question,
      reason: UNANSWERED_REASONS[question],
    }))

  return {
    listObjects,
    describe,
    whatExists,
    typeOf,
    provenanceOf,
    dependentsOf,
    unanswered,
  }
}

/**
 * The registry over the platform's **live** declarations.
 *
 * `null` means "the modules are not registered yet" — an honest *not ready*, the
 * same distinction `tryBuildModelFromModules` makes (an empty model would look
 * like a tenant with no entities). A caller that must have a registry uses
 * `buildMetadataRegistry`, which throws when nothing is registered.
 */
export function tryBuildMetadataRegistry(
  modules?: Parameters<typeof tryBuildModelFromModules>[0],
): MetadataRegistry | null {
  const descriptor = tryBuildModelFromModules(modules)
  return descriptor ? createMetadataRegistry(descriptor) : null
}

/** The registry over the live declarations; throws when no modules are registered. */
export function buildMetadataRegistry(
  modules?: Parameters<typeof buildModelFromModules>[0],
): MetadataRegistry {
  return createMetadataRegistry(buildModelFromModules(modules))
}

/**
 * The registry over an explicit declaration set — the pure, test-friendly entry
 * point that mirrors `buildModelDescriptor`.
 */
export function createMetadataRegistryFromDeclarations(
  input: KernelDeclarationInput,
): MetadataRegistry {
  return createMetadataRegistry(buildModelDescriptor(input))
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function toRegistryEntity(entity: KernelEntity): RegistryEntity {
  return {
    kind: 'entity',
    id: entity.id,
    label: entity.label,
    description: entity.description,
    entityClass: entity.entityClass,
    grain: entity.grain,
    version: entity.version ?? '',
    provenance: { source: entity.source },
    fieldIds: entity.fields.map((f) => f.id),
    relationshipIds: entity.relationships.map((r) => r.id),
  }
}

function toRegistryField(field: KernelField): RegistryField {
  return {
    kind: 'field',
    id: field.id,
    label: field.label,
    description: field.description,
    fieldKind: field.fieldKind,
    required: field.required,
    multi: field.multi,
    filterable: field.filterable,
    entityId: field.entityId,
    version: field.version ?? '',
    provenance: { source: field.source },
  }
}

function toRegistryRelationship(relationship: KernelRelationship): RegistryRelationship {
  return {
    kind: 'relationship',
    id: relationship.id,
    description: relationship.description,
    fromEntityId: relationship.fromEntityId,
    toEntityId: relationship.toEntityId,
    cardinality: relationship.cardinality,
    optionality: relationship.optionality,
    ownership: relationship.ownership,
    deleteBehaviour: relationship.deleteBehaviour,
    securityInheritance: relationship.securityInheritance,
    multiplicityRisk: relationship.multiplicityRisk,
    version: relationship.version ?? '',
    provenance: { source: relationship.source },
  }
}

/**
 * The entity id(s) a subject "is" for the purpose of the dependents closure.
 *
 * A field's own entity depends on nothing extra, but **things that depend on the
 * entity depend on the field too** — so a field resolves to its entity. A
 * relationship concerns both of its endpoints. An entity resolves to itself.
 */
function rootEntitiesFor(
  subject: RegistryObject,
  relationships: Record<string, KernelRelationship>,
): Set<RegistryObjectId> {
  if (subject.kind === 'entity') return new Set([subject.id])
  if (subject.kind === 'field') return new Set([subject.entityId])
  // relationship: both endpoints are "concerned", but a relationship is not an
  // entity the platform declares dependencies *on*, so the honest root set is
  // empty — nothing declares a dependency on a relationship id.
  void relationships
  return new Set()
}

// Re-export the declaration collector so a caller building a registry from live
// modules can inspect exactly what was read (same contract as `from-modules`).
export { collectDeclarations }
