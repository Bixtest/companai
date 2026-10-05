/**
 * The model index — the compiler's view of the canonical model.
 *
 * §51's first stage is **schema resolution**: turn the names an IR carries into
 * the objects the model actually declares. This module is that stage, and
 * nothing else.
 *
 * **It resolves; it never guesses.** Every rule here is a *declared* rule, and
 * every failure is reported rather than papered over with a default:
 *
 *   1. A reference is **normalised**: the module qualifier is dropped and the
 *      rest lowercased, so `auth:user` and `Customer` both reach `user` — the
 *      same leaf rule G-01's `canonicalEntityId` already applies.
 *   2. A **single-segment** reference resolves **relative to the subject
 *      entity** (`country` on subject `customer` is `customer.country`). That is
 *      the form the vision's own §50 example uses, and it is unambiguous: a
 *      field id is `<entity>.<field>`, so a bare leaf has exactly one reading.
 *   3. A reference that resolves to nothing is **absent**, not defaulted.
 *
 * Source: SPEC-business-model-kernel.md §6, §12.1; Doc 3 §51.
 */

import type { ModelDescriptor, KernelEntity, KernelField, KernelRelationship, KernelObjectContract } from '../kernel/model'

/**
 * A declared metric.
 *
 * The vision's IR carries `measures` and its filters and sorts may name a
 * `metric` (§50). The kernel's object list includes `Metric` — but **nothing
 * declares one yet**: `buildModelDescriptor` builds entities, fields and
 * relationships, and the platform has no `defineMetric` (measured 2026-10-05:
 * zero `Metric`/`Measure` declarations in `packages/shared/src` and
 * `packages/core/src`). So the metric map is **empty by default**, and a
 * named-measure IR is refused with a message that says so — rather than being
 * quietly treated as an inline aggregate, which would invent a meaning.
 */
export type ModelMetric = KernelObjectContract & {
  kind: 'metric'
  entityId: string
  aggregate: 'sum' | 'count' | 'avg' | 'min' | 'max'
  fieldId: string
}

export type ModelIndex = {
  model: ModelDescriptor
  /** Canonical entity id → entity. */
  entity: (ref: string) => KernelEntity | undefined
  /** Canonical field id → field. */
  field: (ref: string, subjectEntity: string) => KernelField | undefined
  /** Canonical relationship id → relationship. */
  relationship: (ref: string, subjectEntity: string) => KernelRelationship | undefined
  /** Canonical metric id → metric. */
  metric: (ref: string, subjectEntity: string) => ModelMetric | undefined
  /** The canonical id a reference resolved to, or `null` if it resolved to nothing. */
  resolveEntityId: (ref: string) => string | null
  resolveFieldId: (ref: string, subjectEntity: string) => string | null
  resolveRelationshipId: (ref: string, subjectEntity: string) => string | null
  resolveMetricId: (ref: string, subjectEntity: string) => string | null
}

/**
 * Normalise a reference to its canonical form.
 *
 * Drops a module qualifier (`auth:user` → `user`) — the same leaf rule
 * `canonicalEntityId` applies — and lowercases, so `Customer` and `customer`
 * are one thing. Whitespace is trimmed. This is a **declared** normalisation,
 * not a fuzzy match: it cannot make two genuinely different references collide,
 * because the canonical grammar is already lowercase.
 */
export function normaliseRef(ref: string): string {
  const trimmed = String(ref ?? '').trim()
  const idx = trimmed.lastIndexOf(':')
  const leaf = idx === -1 ? trimmed : trimmed.slice(idx + 1)
  return leaf.toLowerCase()
}

/**
 * Build an index over a model.
 *
 * Pure: two indexes over the same model are independent, and mutating one cannot
 * affect the other. `metrics` defaults to none — see {@link ModelMetric}.
 */
export function createModelIndex(
  model: ModelDescriptor,
  metrics: readonly ModelMetric[] = [],
): ModelIndex {
  const entities = new Map<string, KernelEntity>()
  const fields = new Map<string, KernelField>()
  const relationships = new Map<string, KernelRelationship>()
  const metricMap = new Map<string, ModelMetric>()

  for (const entity of Object.values(model.entities ?? {})) {
    entities.set(entity.id, entity)
    for (const field of entity.fields ?? []) fields.set(field.id, field)
  }
  for (const relationship of Object.values(model.relationships ?? {})) {
    relationships.set(relationship.id, relationship)
  }
  for (const metric of metrics) metricMap.set(metric.id, metric)

  const resolveEntityId = (ref: string): string | null => {
    const normalised = normaliseRef(ref)
    return entities.has(normalised) ? normalised : null
  }

  const resolveFieldId = (ref: string, subjectEntity: string): string | null => {
    const normalised = normaliseRef(ref)
    // A bare leaf is the subject's own field; a dotted reference is taken as-is.
    const candidate = normalised.includes('.') ? normalised : `${subjectEntity}.${normalised}`
    return fields.has(candidate) ? candidate : null
  }

  const resolveRelationshipId = (ref: string, subjectEntity: string): string | null => {
    const normalised = normaliseRef(ref)
    const candidate = normalised.includes('.') ? normalised : `${subjectEntity}.${normalised}`
    return relationships.has(candidate) ? candidate : null
  }

  const resolveMetricId = (ref: string, subjectEntity: string): string | null => {
    const normalised = normaliseRef(ref)
    const candidate = normalised.includes('.') ? normalised : `${subjectEntity}.${normalised}`
    return metricMap.has(candidate) ? candidate : null
  }

  return {
    model,
    entity: (ref) => {
      const id = resolveEntityId(ref)
      return id ? entities.get(id) : undefined
    },
    field: (ref, subjectEntity) => {
      const id = resolveFieldId(ref, subjectEntity)
      return id ? fields.get(id) : undefined
    },
    relationship: (ref, subjectEntity) => {
      const id = resolveRelationshipId(ref, subjectEntity)
      return id ? relationships.get(id) : undefined
    },
    metric: (ref, subjectEntity) => {
      const id = resolveMetricId(ref, subjectEntity)
      return id ? metricMap.get(id) : undefined
    },
    resolveEntityId,
    resolveFieldId,
    resolveRelationshipId,
    resolveMetricId,
  }
}
