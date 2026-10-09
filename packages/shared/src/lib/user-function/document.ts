/**
 * The Function as a durable document — RQ-24's *"the IR is the durable asset"*.
 *
 * A Function is written once and run for months, so it has to be **storable**.
 * The obvious answer is a database row, and that is where this will end up. But a
 * database row is *one place to keep it*, not what makes it durable. What makes it
 * durable is that it can be **written down and read back without loss** — and
 * that is a property of the document, testable today, with no database and no
 * migration.
 *
 * So this module defines the document, exactly as G-01 did for the model:
 *
 *   - a **versioned envelope** (`companai.user-function`, version 1), so a future
 *     change to the shape is a declared version bump a reader can act on rather
 *     than a silent reinterpretation of old bytes;
 *   - **byte-stable** export, so two exports of the same Function are identical
 *     strings — which is what makes the round-trip test mean anything;
 *   - import that validates the envelope **and every canonical id inside the IR**,
 *     so a document that the rest of the platform could not reference is refused
 *     loudly instead of being stored and failing later.
 *
 * **Why a database row is deliberately not built here.** Two reasons, both
 * measured: (i) the Function's remaining shape (`presentation_definition`, the UI
 * metadata, placement) is **G-07's**, so a schema written today would very likely
 * be rewritten — the deferral is a **design/timing** decision, **not** a proof
 * boundary (`CORRECTED (rule 13)`: an earlier note here claimed a migration would
 * be *"unprovable on this host"* — **false and retracted**; `mercato-postgres-local`
 * runs Postgres 17 and row DDL is written, applied and read back on it, e.g.
 * `Migration20261009205000`, 2026-10-09); and (ii) this module tests DB-backed code
 * against a **mocked** EntityManager, so the row would have no live test until a
 * caller exercises it. **Trigger for the row: G-07 lands.**
 *
 * **The trap this module is written to avoid**, the same one G-01 documented: an
 * empty diff is trivially satisfied by exporting nothing. So the tests assert the
 * export is **non-empty first** — it must carry the real IR — and only then assert
 * the round-trip is empty. An empty diff on an empty export proves nothing.
 *
 * Source: RQ-24; Doc 3 Part VIII §41–§43; COOKBOOK Sprint G-03 step 3.6b.
 */

import { isCanonicalId, isCanonicalSegment } from '../kernel/canonical-id'
import { FUNCTION_STATUSES, REQUIRES_VERIFICATION_RECORD } from './lifecycle'
import type { FunctionStatus, UserFunction } from './types'

/** The on-the-wire document. */
export type FunctionDocument = {
  format: 'companai.user-function'
  /** Format version. Bump when the document shape changes. */
  version: 1
  function: UserFunction
}

export const FUNCTION_DOCUMENT_FORMAT = 'companai.user-function' as const
export const FUNCTION_DOCUMENT_VERSION = 1 as const

/**
 * Export a Function to a stable document.
 *
 * Canonicalises the two **set-like** fields (`references` and
 * `requiredPermissions`) by sorting them, so a Function whose references were
 * listed in a different order exports identically. Everything else is carried
 * through untouched, including the opaque fields — this module's job is to
 * preserve a Function, not to have opinions about G-07's shapes.
 */
export function exportFunction(fn: UserFunction): FunctionDocument {
  return {
    format: FUNCTION_DOCUMENT_FORMAT,
    version: FUNCTION_DOCUMENT_VERSION,
    function: canonicalise(fn),
  }
}

/**
 * Import a document back into a Function.
 *
 * Validates the envelope, the status, and every canonical id. Unknown extra keys
 * are **preserved** rather than dropped: a document written by a newer producer
 * must survive a round-trip through this reader, and silently discarding data is
 * the failure this whole module exists to prevent.
 */
export function importFunction(doc: FunctionDocument): UserFunction {
  if (!doc || typeof doc !== 'object') {
    throw new Error('importFunction: document is required')
  }
  if (doc.format !== FUNCTION_DOCUMENT_FORMAT) {
    throw new Error(
      `importFunction: unknown document format ${JSON.stringify(doc.format)} — expected ${JSON.stringify(FUNCTION_DOCUMENT_FORMAT)}`,
    )
  }
  if (doc.version !== FUNCTION_DOCUMENT_VERSION) {
    throw new Error(
      `importFunction: unsupported document version ${JSON.stringify(doc.version)} — this reader reads version ${FUNCTION_DOCUMENT_VERSION}`,
    )
  }

  const fn = doc.function
  if (!fn || typeof fn !== 'object') {
    throw new Error('importFunction: the document carries no function.')
  }

  assertId(fn.id, 'the function id')
  if (fn.operationType !== 'query' && fn.operationType !== 'command') {
    throw new Error(
      `importFunction: unknown operation type ${JSON.stringify(fn.operationType)} — expected query or command.`,
    )
  }
  if (!FUNCTION_STATUSES.includes(fn.status as FunctionStatus)) {
    throw new Error(
      `importFunction: unknown status ${JSON.stringify(fn.status)} — expected one of ${FUNCTION_STATUSES.join(', ')}.`,
    )
  }
  // A status only reachable through `verified` must carry the record that made it
  // true. Otherwise a doctored document could claim to be verified and then run,
  // which would make the lifecycle's guarantee a property of the API alone.
  if (REQUIRES_VERIFICATION_RECORD.includes(fn.status as FunctionStatus)) {
    if (!fn.verification) {
      throw new Error(
        `importFunction: a Function cannot be "${fn.status}" without a verification record. A status is not evidence; the record is.`,
      )
    }
    // And the record must say what it means. An empty object is not a record: its
    // whole purpose is to name the checks that could not be run.
    if (!Array.isArray(fn.verification.notChecked)) {
      throw new Error(
        `importFunction: the verification record for a "${fn.status}" Function must list the checks that could not be run (notChecked).`,
      )
    }
  }
  if (typeof fn.version !== 'number' || !Number.isFinite(fn.version)) {
    throw new Error(`importFunction: the function version must be a number, got ${JSON.stringify(fn.version)}.`)
  }

  for (const parameter of fn.parameterSchema ?? []) {
    if (!isCanonicalSegment(parameter.name)) {
      throw new Error(
        `importFunction: parameter name ${JSON.stringify(parameter.name)} is not a canonical segment.`,
      )
    }
  }

  const references = fn.references
  if (references) {
    for (const [key, ids] of Object.entries(references)) {
      for (const id of ids ?? []) assertId(id, `references.${key}`)
    }
  }
  for (const permission of fn.requiredPermissions ?? []) {
    if (typeof permission !== 'string' || permission.length === 0) {
      throw new Error(`importFunction: required permission ${JSON.stringify(permission)} is not a non-empty string.`)
    }
  }

  assertIrIds(fn)

  return clone(fn)
}

/**
 * Every canonical id the IR carries, checked.
 *
 * **The set is exactly the references the compiler resolves, and no more.** Being
 * *stricter* than the compiler would refuse a document the platform can actually
 * run; being *looser* would accept one it cannot. So `grain` is not checked here:
 * the compiler passes it through without resolving it, so a document check that
 * demanded it be canonical would be inventing a constraint the platform does not
 * have.
 */
function assertIrIds(fn: UserFunction): void {
  const ir = fn.businessIr
  if (ir) {
    assertId(ir.entity, 'the IR entity')
    for (const dimension of ir.dimensions ?? []) assertId(dimension, 'an IR dimension')
    for (const filter of ir.filters ?? []) {
      if ('metric' in filter) assertId(filter.metric, 'an IR metric filter')
      else assertId(filter.field, 'an IR field filter')
    }
    for (const measure of ir.measures ?? []) {
      if ('metric' in measure) assertId(measure.metric, 'an IR measure')
      else assertId(measure.field, 'an IR measure field')
    }
    for (const relationship of ir.relationships ?? []) assertId(relationship, 'an IR relationship')
    for (const sort of ir.sort ?? []) {
      if (sort.field) assertId(sort.field, 'an IR sort field')
      if (sort.metric) assertId(sort.metric, 'an IR sort metric')
    }
    if (ir.timeBasis) assertId(ir.timeBasis, 'the IR time basis')
    if (ir.timeRange?.field) assertId(ir.timeRange.field, 'the IR time-range field')
  }

  const command = fn.businessCommandIr
  if (command) assertId(command.command, 'the command name')
}

/** The document's canonical string form. The round-trip compares this, not objects. */
export function serialiseFunctionDocument(doc: FunctionDocument): string {
  return stableStringify(doc)
}

/**
 * The whole round-trip, and the emptiness check, in one call.
 *
 * Returns what differed as well as whether anything did, so a failure can be
 * reported rather than merely detected.
 */
export function roundTripFunction(fn: UserFunction): {
  reimported: FunctionDocument
  empty: boolean
  before: string
  after: string
} {
  const before = serialiseFunctionDocument(exportFunction(fn))
  const reimported = exportFunction(importFunction(exportFunction(fn)))
  const after = serialiseFunctionDocument(reimported)
  return { reimported, empty: before === after, before, after }
}

/** Sorted, because `references` is a set of dependencies, not a sequence. */
function canonicalise(fn: UserFunction): UserFunction {
  const references = fn.references
  return {
    ...fn,
    ...(references
      ? {
          references: {
            entities: sorted(references.entities),
            fields: sorted(references.fields),
            metrics: sorted(references.metrics),
            commands: sorted(references.commands),
            workflows: sorted(references.workflows),
          },
        }
      : {}),
    requiredPermissions: sorted(fn.requiredPermissions ?? []),
  }
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/** A deep copy through JSON, so an imported Function shares nothing with the document. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertId(id: string, what: string): void {
  if (!isCanonicalId(id)) {
    throw new Error(
      `importFunction: ${what} is ${JSON.stringify(id)}, which is not a canonical id (segment('.'segment)*, each matching [a-z][a-z0-9_]*).`,
    )
  }
}

/**
 * JSON with object keys in sorted order, so two structurally equal values always
 * produce the same string. Arrays keep their order — the export already
 * canonicalises the ones that are sets, and re-sorting here would hide a real
 * ordering difference.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(val as Record<string, unknown>).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
        out[key] = (val as Record<string, unknown>)[key]
      }
      return out
    }
    return val
  })
}
