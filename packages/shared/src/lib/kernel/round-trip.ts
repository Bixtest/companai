/**
 * The export / import round-trip — the kernel's own proof (plan §5.2).
 *
 * The plan's test for G-01 is exact: **"the export/reimport round-trip is
 * empty."** That is a stronger claim than "export works". It says the model can
 * be written out and read back with **nothing lost and nothing changed** — so
 * the model is a real, self-describing artefact and not a view that only exists
 * while the process runs.
 *
 * **How "empty" is defined here, and why.**
 *   export(import(export(model))) === export(model)   — byte for byte.
 *
 * The comparison is on the *exported document*, deliberately, not on the
 * in-memory object. Two objects can be deep-equal while serialising in a
 * different key order; a round-trip that only survives as an object is not a
 * round-trip a file or a wire can carry. Comparing the serialised form is the
 * stricter, honest test.
 *
 * **The trap this module is written to avoid.** An empty diff is trivially
 * satisfied by exporting nothing. So `exportModel` is never the only assertion:
 * the tests first assert the export is **non-empty** — it must carry the real
 * relationships the platform declares — *then* assert the round-trip is empty.
 * An empty diff on an empty export proves nothing.
 *
 * Source: SPEC-business-model-kernel.md §12.1 (canonical ids as keys), §5.4.
 */

import { isCanonicalId } from './canonical-id'
import type { KernelEntity, KernelField, KernelRelationship, ModelDescriptor } from './model'

/**
 * The on-the-wire document.
 *
 * A **versioned envelope** rather than a bare map, so a future change to the
 * kernel's shape is a declared version bump the reader can act on, instead of a
 * silent reinterpretation of old bytes. `version` is the *format* version, not
 * any object's semantic version.
 */
export type ModelDocument = {
  format: 'companai.business-model'
  /** Format version. Bump when the document shape changes. */
  version: 1
  entities: KernelEntity[]
  relationships: KernelRelationship[]
  /**
   * Relationship-id collisions found while building the model.
   *
   * Carried in the document on purpose: exporting a model that cannot represent
   * all its declared edges is a real state, and a reader must see it rather than
   * receive a silent merge. Empty in a healthy model.
   */
  relationshipIdCollisions: Array<{ id: string; declarations: string[] }>
}

/** The current document format version. */
export const MODEL_DOCUMENT_VERSION = 1

/**
 * Export the model to a stable document.
 *
 * Deterministic by construction: entities and relationships are sorted by
 * canonical id, and every object's own keys are emitted in a fixed order (the
 * object literals below fix the order). Two calls with the same model produce
 * identical bytes — which is what makes the round-trip test meaningful.
 */
export function exportModel(model: ModelDescriptor): ModelDocument {
  const entities = Object.values(model.entities)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(exportEntity)

  const relationships = Object.values(model.relationships)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(exportRelationship)

  return {
    format: 'companai.business-model',
    version: MODEL_DOCUMENT_VERSION,
    entities,
    relationships,
    relationshipIdCollisions: (model.relationshipIdCollisions ?? [])
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({ id: c.id, declarations: [...c.declarations].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) })),
  }
}

/**
 * Import a document back into a model.
 *
 * Validates the envelope and every canonical id before accepting the document.
 * A malformed id is rejected loudly, because an id that is not canonical is an
 * object that cannot be referenced by the rest of the platform.
 */
export function importModel(doc: ModelDocument): ModelDescriptor {
  if (!doc || typeof doc !== 'object') {
    throw new Error('importModel: document is required')
  }
  if (doc.format !== 'companai.business-model') {
    throw new Error(`importModel: unknown document format ${JSON.stringify(doc.format)}`)
  }
  if (doc.version !== MODEL_DOCUMENT_VERSION) {
    throw new Error(
      `importModel: unsupported document version ${JSON.stringify(doc.version)} — this kernel reads version ${MODEL_DOCUMENT_VERSION}`,
    )
  }

  const entities: Record<string, KernelEntity> = {}
  for (const entity of doc.entities ?? []) {
    assertId(entity.id, 'entity')
    const fields = (entity.fields ?? []).map((field) => {
      assertId(field.id, 'field')
      return { ...field }
    })
    const relationships = (entity.relationships ?? []).map((rel) => {
      assertId(rel.id, 'relationship')
      return { ...rel }
    })
    entities[entity.id] = { ...entity, fields, relationships }
  }

  const relationships: Record<string, KernelRelationship> = {}
  for (const rel of doc.relationships ?? []) {
    assertId(rel.id, 'relationship')
    relationships[rel.id] = { ...rel }
  }

  return {
    entities: sortRecord(entities),
    relationships: sortRecord(relationships),
    relationshipIdCollisions: (doc.relationshipIdCollisions ?? []).map((c) => ({
      id: c.id,
      declarations: [...c.declarations],
    })),
  }
}

/**
 * Serialise a document to its canonical string form.
 *
 * The round-trip test compares *this*, not the object, so that key order cannot
 * hide a real difference (see the module note).
 */
export function serialiseModelDocument(doc: ModelDocument): string {
  return stableStringify(doc)
}

/**
 * The whole round-trip, and the emptiness check, in one call.
 *
 * Returns both the reimported document and whether the round-trip was empty, so
 * a caller can report *what* differed rather than only that something did.
 */
export function roundTrip(model: ModelDescriptor): {
  reimported: ModelDocument
  empty: boolean
  before: string
  after: string
} {
  const before = serialiseModelDocument(exportModel(model))
  const reimported = exportModel(importModel(exportModel(model)))
  const after = serialiseModelDocument(reimported)
  return { reimported, empty: before === after, before, after }
}

function exportEntity(entity: KernelEntity): KernelEntity {
  return {
    kind: entity.kind,
    id: entity.id,
    label: entity.label,
    description: entity.description,
    version: entity.version,
    lifecycle: entity.lifecycle,
    classification: entity.classification,
    source: entity.source,
    entityClass: entity.entityClass,
    grain: entity.grain,
    fields: (entity.fields ?? []).slice().sort((a, b) => a.id.localeCompare(b.id)).map(exportField),
    relationships: (entity.relationships ?? [])
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(exportRelationship),
  }
}

function exportField(field: KernelField): KernelField {
  return {
    kind: field.kind,
    id: field.id,
    entityId: field.entityId,
    label: field.label,
    description: field.description,
    version: field.version,
    lifecycle: field.lifecycle,
    classification: field.classification,
    source: field.source,
    fieldKind: field.fieldKind,
    required: field.required,
    multi: field.multi,
    filterable: field.filterable,
  }
}

function exportRelationship(rel: KernelRelationship): KernelRelationship {
  return {
    kind: rel.kind,
    id: rel.id,
    fromEntityId: rel.fromEntityId,
    toEntityId: rel.toEntityId,
    label: rel.label,
    description: rel.description,
    version: rel.version,
    lifecycle: rel.lifecycle,
    classification: rel.classification,
    source: rel.source,
    cardinality: rel.cardinality,
    optionality: rel.optionality,
    ownership: rel.ownership,
    allowedTraversal: rel.allowedTraversal,
    deleteBehaviour: rel.deleteBehaviour,
    securityInheritance: rel.securityInheritance,
    multiplicityRisk: rel.multiplicityRisk,
  }
}

function assertId(id: string, kind: string): void {
  if (!isCanonicalId(id)) {
    throw new Error(`importModel: ${kind} has a non-canonical id ${JSON.stringify(id)}`)
  }
}

/**
 * JSON with object keys in sorted order, so two structurally equal values
 * always produce the same string. Arrays keep their order — the export already
 * sorts them, and re-sorting here would hide an ordering bug.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {}
      for (const key of Object.keys(val as Record<string, unknown>).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
        sorted[key] = (val as Record<string, unknown>)[key]
      }
      return sorted
    }
    return val
  })
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  const sorted: Record<string, T> = {}
  for (const key of Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) sorted[key] = record[key]
  return sorted
}
