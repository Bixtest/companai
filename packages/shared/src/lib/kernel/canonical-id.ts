/**
 * The canonical identifier grammar (Business Model Kernel, spec §12.1).
 *
 * A canonical ID is a lowercase, dot-separated path of ASCII segments, where
 * every segment matches `[a-z][a-z0-9_]*`. It is the *semantic* identity the
 * business model refers to — not a primary key.
 *
 *   id      ::= segment ( "." segment )*
 *   segment ::= [a-z][a-z0-9_]*
 *
 * Three properties the vision asks for, and this module guarantees:
 *
 *   1. Stable — the ID is the identity. A display label is localised metadata
 *      and may change freely; the ID may not. A rename creates a new `Version`;
 *      it never rewrites the ID (I14: authority objects are superseded, never
 *      edited).
 *   2. Unique by position — the parent is the prefix, so `invoice.customer`
 *      can never collide with `customer.invoice`.
 *   3. Opaque — the grammar constrains the *form* and never the *meaning*. Two
 *      different things never share one ID, but nothing may be inferred from an
 *      ID beyond which thing it names.
 *
 * **What this is not.** It is a naming rule, not a foreign-key scheme and not an
 * ordering. Physical primary keys remain the platform's business (UUIDs). The
 * two are related by a declared mapping, never by being the same string
 * (spec §12.1, boundary).
 *
 * Source: SPEC-business-model-kernel.md §12.1 ← Doc 3 §39; Doc 8 §222.
 */

/** The four kinds of canonical identifier the kernel distinguishes. */
export type CanonicalIdKind = 'entity' | 'field' | 'relationship' | 'metric'

/**
 * A segment is one dotted part. Lowercase ASCII letter first, then letters,
 * digits and underscores. No leading digit, no hyphen, no uppercase — so an ID
 * can never depend on case-folding rules a database might disagree about.
 */
const SEGMENT_PATTERN = /^[a-z][a-z0-9_]*$/

/** A whole canonical id: one or more segments joined by dots. */
const ID_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/

/** Whether a single string is a valid segment. */
export function isCanonicalSegment(segment: string): boolean {
  return SEGMENT_PATTERN.test(segment)
}

/** Whether a whole string is a syntactically valid canonical id. */
export function isCanonicalId(id: string): boolean {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

/**
 * Throws when a string is not a valid canonical id.
 *
 * Callers that must not fail silently — anything writing an identity into the
 * model — use this rather than `isCanonicalId`, so a malformed id is a loud
 * error at the point it is created, not a quiet mismatch discovered later.
 */
export function assertCanonicalId(id: string): string {
  if (!isCanonicalId(id)) {
    throw new Error(
      `Invalid canonical id: ${JSON.stringify(id)} — expected segment('.'segment)* where each segment matches [a-z][a-z0-9_]*`,
    )
  }
  return id
}

/**
 * Asserts every segment is valid and returns them.
 *
 * The distinction from `assertCanonicalId` matters at the boundary: a caller
 * that has already split its parts wants to know *which* part is wrong.
 */
export function assertCanonicalSegments(segments: readonly string[]): readonly string[] {
  if (segments.length === 0) {
    throw new Error('A canonical id needs at least one segment')
  }
  segments.forEach((segment) => {
    if (!isCanonicalSegment(segment)) {
      throw new Error(
        `Invalid canonical id segment: ${JSON.stringify(segment)} — expected [a-z][a-z0-9_]*`,
      )
    }
  })
  return segments
}

function join(segments: readonly string[]): string {
  assertCanonicalSegments(segments)
  return segments.join('.')
}

/**
 * An entity id: a single segment.
 *
 *   entityIdOf('invoice') === 'invoice'
 */
export function entityIdOf(entity: string): string {
  assertCanonicalSegments([entity])
  return entity
}

/**
 * A field id: `<entity>.<field>`.
 *
 *   fieldIdOf('invoice', 'outstanding_amount') === 'invoice.outstanding_amount'
 */
export function fieldIdOf(entity: string, field: string): string {
  return join([entity, field])
}

/**
 * A relationship id: `<entity>.<relationship>`.
 *
 * Two segments, not three. The spec's table shows `invoice.customer`, whose
 * middle part is the relationship name itself; a three-part form would make the
 * relationship's own name ambiguous with a field name. Declaring the kind
 * separately (see `parseCanonicalId`) is what distinguishes a field from a
 * relationship — never a different number of dots.
 */
export function relationshipIdOf(entity: string, relationship: string): string {
  return join([entity, relationship])
}

/**
 * A metric id: `<entity>.<metric>`.
 *
 * The metric *kind* is declared separately on the `Metric` object; the id only
 * says which metric, per spec §12.1's note "metric kind declared separately".
 */
export function metricIdOf(entity: string, metric: string): string {
  return join([entity, metric])
}

export type ParsedCanonicalId = {
  /** What the id names. Declared by the caller, never guessed from the shape. */
  kind: CanonicalIdKind
  /** The dotted parts, in order. */
  segments: string[]
}

/**
 * Validates an id and returns its segments under a **declared** kind.
 *
 * `kind` is an argument rather than a deduction on purpose. Two segments could
 * name a field or a relationship and nothing in the string tells them apart —
 * so guessing would be exactly the undocumented convention the vision forbids
 * (Appendix D: "the project should not rely on undocumented conventions").
 * The caller knows what it built; it says so.
 */
export function parseCanonicalId(id: string, kind: CanonicalIdKind): ParsedCanonicalId {
  assertCanonicalId(id)
  return { kind, segments: id.split('.') }
}

/** The entity segment of any canonical id — always the first. */
export function canonicalEntityOf(id: string): string {
  assertCanonicalId(id)
  return id.split('.')[0]
}

/** The trailing segment — the field, relationship or metric name. */
export function canonicalLeafOf(id: string): string {
  assertCanonicalId(id)
  const parts = id.split('.')
  return parts[parts.length - 1]
}

/**
 * Whether `id` sits directly under `entity` — i.e. `id`'s first segment is
 * `entity` and it has exactly one further segment.
 *
 * Used by the rename test: renaming a *label* leaves this true; renaming a
 * *key* makes the old id invalid and the new one replaces it, which the model
 * must report as "requires recompilation" rather than applying silently.
 */
export function isDirectChildOf(entity: string, id: string): boolean {
  if (!isCanonicalId(id) || !isCanonicalSegment(entity)) return false
  const parts = id.split('.')
  return parts.length === 2 && parts[0] === entity
}
