/**
 * The structure-change decision carrier (SD-1 / S2, CC-17) — how a **person's
 * decision** reaches the gate.
 *
 * **The problem this solves.** The structure-change gate takes an optional
 * `decision`. Until CC-17 no caller could ever supply one, so the `decided`
 * outcome was unreachable: S2 says permissions are decided *"either by a person
 * or by a rule"*, but only the *rule* (the default) ever fired. The gate had the
 * branch; nothing could reach it. This file is the missing half — the wire that
 * carries a person's decision from the request to the gate.
 *
 * **Why a request header, and not a database row.** A structure change is
 * decided **at the moment it is made**, by the person making it — that is what
 * "decided by a person" means here. The decision must therefore arrive *with the
 * change*: same request, same transaction, no earlier round-trip that a caller
 * could forget, and no durable row that would have to be reconciled if the change
 * were rolled back. A header rides the change itself, so a decision and the change
 * it decides can never be decoupled by a crash between two writes.
 *
 * **Why a header, and not a payload field.** The payload is the *structure*
 * being created (entity ids, field keys, kinds, config). A permission decision is
 * a different kind of statement — an *authorisation* about that structure — and
 * the platform already keeps the two apart on the wire: the optimistic-lock guard
 * carries `expectedUpdatedAt` in a header, not in the body
 * (`x-om-ext-optimistic-lock-expected-updated-at`). Mixing an authorisation into
 * the resource body would also make it part of the resource's own schema, which a
 * caller could then persist by accident. A header is the established home for
 * out-of-band mutation metadata.
 *
 * **The header, following the platform's own convention.** The name is built by
 * `buildExtensionHeader('permissions', 'decision')` → `x-om-ext-permissions-decision`
 * (`umes/extension-headers.ts`), so it is parsed by the platform's own
 * `parseExtensionHeaders` / `getExtensionHeaderValue` and needs no bespoke reader.
 * The **module id is `permissions`**, not `entities`: the decision is about
 * permission records (S2), and both entities and any future surface owner carry
 * the same header — the convention is per *concern*, not per *owner*.
 *
 * **The value is JSON, and a malformed value is refused — never silently dropped.**
 * The carrier is the boundary where untrusted text becomes a decision, so it is
 * strict: a value that is not an object, names no `decidedBy`, or carries no
 * records returns `null` *and says why* via {@link readStructureDecisionHeader}.
 * Returning `null` (rather than throwing) keeps the caller's shape simple, but the
 * caller **must not** read `null` as "no decision was made" without checking
 * `malformed` — those are opposite meanings ("a person decided nothing" is a
 * refusal, rule 4; "no person decided" is the default). The two are told apart
 * explicitly, because conflating them would let a broken header quietly become a
 * default grant.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` S2; `ARCHITECTURE-structure-permissions.md`
 * §3–§4; `PLAN-SD-1.md` §10 (CC-17).
 */

import { buildExtensionHeader, getExtensionHeaderValue } from '../umes/extension-headers'

/**
 * The header that carries a person's permission decision with a structure change.
 *
 * Built from the platform's own convention rather than written by hand, so it
 * cannot drift from `parseExtensionHeaders`.
 */
export const STRUCTURE_DECISION_HEADER_NAME = buildExtensionHeader('permissions', 'decision')

/** The module id the header lives under, for callers that use the parsed map. */
export const STRUCTURE_DECISION_MODULE_ID = 'permissions'

/** The key within {@link STRUCTURE_DECISION_MODULE_ID}. */
export const STRUCTURE_DECISION_KEY = 'decision'

/** One permission record, as it travels on the wire. */
export type StructureDecisionHeaderRecord = {
  /** The feature id, e.g. `entities.records.<entity>` or `<entity>.<field>`. */
  feature: string
  /** The record's block (`data` / `structural`), when the caller knows it. */
  block?: string
  /** The surface the record was derived from, when the caller knows it. */
  surfaceId?: string
}

/** A person's decision, as it arrives on the wire (before the gate validates it). */
export type StructureDecisionHeaderValue = {
  /** Who decided — a user id, a role name, or a named policy. Required. */
  decidedBy: string
  /** The records the decision grants. An empty list is a decision that grants nothing. */
  records: StructureDecisionHeaderRecord[]
  /** The role the records go to. Absent → the gate's default (`superadmin`). */
  grantTo?: string
}

/**
 * Why a decision header could not be read. A closed set, so a caller can switch.
 *
 * These are **not** the gate's refusals: they are the carrier's own parse
 * failures, which happen *before* the gate sees anything. Distinguishing them
 * lets a caller answer 400 (a malformed request) rather than 422 (a policy
 * refusal), which is the same split the batch route already draws between zod
 * (`400`) and the guards (`422`).
 */
export const STRUCTURE_DECISION_HEADER_FAILURES = [
  'not_json',
  'not_object',
  'missing_decided_by',
  'invalid_records',
] as const
export type StructureDecisionHeaderFailure = (typeof STRUCTURE_DECISION_HEADER_FAILURES)[number]

export type StructureDecisionHeaderRead =
  | { kind: 'absent' }
  | { kind: 'malformed'; reason: StructureDecisionHeaderFailure; because: string }
  | { kind: 'decision'; decision: StructureDecisionHeaderValue }

/**
 * Read the structure-change decision out of a `Request` or a guard's `Headers`.
 *
 * A thin, forgiving front door to {@link readStructureDecisionHeader}: the guard
 * contract and the route both hand over a live `Headers` object, and this converts
 * one to the plain record the extension-header parser reads. Accepting both shapes
 * (`Headers` and the plain record) keeps every caller on one entry point rather
 * than each doing its own `forEach` — the same reason the carrier exists at all.
 */
export function readStructureDecisionFromHeaders(
  headers: Headers | Record<string, string | string[] | undefined>,
): StructureDecisionHeaderRead {
  if (typeof (headers as Headers).forEach === 'function' && typeof (headers as Headers).get === 'function') {
    const plain: Record<string, string> = {}
    ;(headers as Headers).forEach((value, key) => {
      plain[key] = value
    })
    return readStructureDecisionHeader(plain)
  }
  return readStructureDecisionHeader(headers as Record<string, string | string[] | undefined>)
}

/**
 * Read the structure-change decision out of a request's headers.
 *
 * Returns a **three-way** result, not `T | null`, because the three cases mean
 * three different things and the caller must not merge them:
 *
 *   - `absent` — no person decided; the gate's **default** applies (S2's *"by a
 *     rule"*). This is the ordinary case for an automated create.
 *   - `malformed` — a decision was *attempted* but cannot be read. The caller
 *     **must refuse** (400): falling back to the default here would silently
 *     discard a person's intent and grant the superadmin role instead — a
 *     fail-open reading of a broken authorisation, which is exactly what S2
 *     exists to prevent.
 *   - `decision` — a person decided; hand it to the gate.
 */
export function readStructureDecisionHeader(
  headers: Record<string, string | string[] | undefined>,
): StructureDecisionHeaderRead {
  const raw = getExtensionHeaderValue(headers, STRUCTURE_DECISION_MODULE_ID, STRUCTURE_DECISION_KEY)

  if (raw === undefined || raw.trim().length === 0) return { kind: 'absent' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      kind: 'malformed',
      reason: 'not_json',
      because: `The ${STRUCTURE_DECISION_HEADER_NAME} header is not valid JSON, so the decision it carries cannot be read.`,
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      kind: 'malformed',
      reason: 'not_object',
      because: `The ${STRUCTURE_DECISION_HEADER_NAME} header must be a JSON object with "decidedBy" and "records", not ${Array.isArray(parsed) ? 'an array' : JSON.stringify(parsed)}.`,
    }
  }

  const record = parsed as Record<string, unknown>

  const decidedBy = typeof record.decidedBy === 'string' ? record.decidedBy.trim() : ''
  if (decidedBy.length === 0) {
    return {
      kind: 'malformed',
      reason: 'missing_decided_by',
      because: `The ${STRUCTURE_DECISION_HEADER_NAME} header must name who decided ("decidedBy"); a decision with no author is not a decision this platform can record.`,
    }
  }

  const rawRecords = record.records
  if (!Array.isArray(rawRecords)) {
    return {
      kind: 'malformed',
      reason: 'invalid_records',
      because: `The ${STRUCTURE_DECISION_HEADER_NAME} header must carry "records" as an array of permission records (objects with a string "feature").`,
    }
  }

  const records: StructureDecisionHeaderRecord[] = []
  for (const entry of rawRecords) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return {
        kind: 'malformed',
        reason: 'invalid_records',
        because: `The ${STRUCTURE_DECISION_HEADER_NAME} header names a record that is not an object; every record must be an object with a string "feature".`,
      }
    }
    const feature = (entry as { feature?: unknown }).feature
    if (typeof feature !== 'string' || feature.trim().length === 0) {
      return {
        kind: 'malformed',
        reason: 'invalid_records',
        because: `The ${STRUCTURE_DECISION_HEADER_NAME} header names a record with no readable "feature", so it could never be granted.`,
      }
    }
    const surfaceId = (entry as { surfaceId?: unknown }).surfaceId
    const block = (entry as { block?: unknown }).block
    records.push({
      feature: feature.trim(),
      ...(typeof block === 'string' && block.trim().length > 0 ? { block: block.trim() } : {}),
      ...(typeof surfaceId === 'string' && surfaceId.trim().length > 0 ? { surfaceId: surfaceId.trim() } : {}),
    })
  }

  const grantTo = typeof record.grantTo === 'string' ? record.grantTo.trim() : ''
  const decision: StructureDecisionHeaderValue = {
    decidedBy,
    records,
    ...(grantTo.length > 0 ? { grantTo } : {}),
  }

  return { kind: 'decision', decision }
}

/**
 * Turn a header-read decision into the gate's own decision type.
 *
 * The header carries `feature` ids; the gate's `StructurePermissionDecision`
 * carries `PermissionRecord`s, which are a `feature` **plus a `block` and a
 * `surfaceId`** — both required by the record type. The mapping is deliberately
 * **total and explicit** here (rather than the gate accepting raw header shapes)
 * so the gate stays a pure decision over already-typed input, the same separation
 * the gate's own header describes.
 *
 * **Where `block` and `surfaceId` come from — derived, not demanded.** A person
 * deciding *which role gets which feature* thinks in feature ids, not in the
 * platform's internal block taxonomy (`data` vs `structural`) or its surface ids.
 * Requiring either on the wire would reject a decision that is perfectly
 * well-formed in the terms the person thinks in — so the carrier **derives** them
 * instead, and a caller that *does* know the platform's taxonomy may still send
 * `block` / `surfaceId` explicitly (they win):
 *
 *   - `block` is read from the feature id's own verb, the same way the catalogue
 *     builds it in reverse: a `.structure` verb is the **structural** block, every
 *     other verb (`.view`, `.manage`, …) is the **data** block. This is total, and
 *     it **provably matches** what the catalogue would have produced — the
 *     catalogue's only structural verb is `structure` (`PERMISSION_BLOCK_VERBS`).
 *     (Measured: for the catalogue's own entity surface, both sides yield
 *     `data/data/structural` for the `.view/.manage/.structure` records.)
 *   - `surfaceId` is the caller's when supplied, else the feature id with its
 *     trailing verb segment removed (`x.y.view` → `x.y`). **This is best-effort and
 *     does NOT always equal the catalogue's `surfaceId`.** The catalogue records
 *     the *surface's own id* (`customers:customer_person`), while a feature id can
 *     be built from a different `featurePrefix` (`entities.records.customers:customer_person.view`
 *     → the carrier derives `entities.records.customers:customer_person`, the
 *     catalogue says `customers:customer_person`) — and the surface id is simply
 *     **not recoverable** from a feature id alone. (Measured, not assumed: a probe
 *     over the catalogue's own entity records showed the two disagree on
 *     `surfaceId` while agreeing on `block`.) **This is harmless today, and that is
 *     the reason it is acceptable rather than fixed here:** nothing in production
 *     reads `record.surfaceId` except log lines (`guards.ts`, `field-definitions.ts`,
 *     `definitions.batch.ts`), and the write uses only `record.feature`. A caller
 *     that needs the exact catalogue id must send `surfaceId` explicitly — which is
 *     why the explicit path exists and wins.
 */
export function toStructurePermissionDecision(
  decision: StructureDecisionHeaderValue,
): {
  decidedBy: string
  records: Array<{ feature: string; block: 'data' | 'structural'; surfaceId: string }>
  grantTo?: string
} {
  return {
    decidedBy: decision.decidedBy,
    records: decision.records.map((record) => ({
      feature: record.feature,
      block: record.block === 'structural' || record.block === 'data' ? record.block : blockFromFeature(record.feature),
      surfaceId: record.surfaceId ?? surfaceIdFromFeature(record.feature),
    })),
    ...(decision.grantTo !== undefined ? { grantTo: decision.grantTo } : {}),
  }
}

/**
 * The block a feature id belongs to, read from its own verb.
 *
 * The catalogue builds every record as `PERMISSION_BLOCK_VERBS[block]` — the
 * `structural` block is exactly the `structure` verb, the `data` block is
 * `view` / `manage`. Reading the last dotted segment back therefore yields the
 * same block the catalogue would have produced for the same surface.
 */
function blockFromFeature(feature: string): 'data' | 'structural' {
  const verb = feature.split('.').pop()
  return verb === 'structure' ? 'structural' : 'data'
}

/**
 * A **best-effort** surface id for a feature id — its id minus the trailing verb
 * segment (`x.y.view` → `x.y`).
 *
 * It is **not** guaranteed to equal the catalogue's `surfaceId`: the catalogue
 * records the surface's own id, which a feature id built from a different
 * `featurePrefix` cannot recover (see the JSDoc on `toStructurePermissionDecision`
 * for the measured example). A feature id with no verb separator is left whole,
 * because there is nothing to strip and a guess would be worse than the id itself.
 * Nothing in production reads `record.surfaceId` except log lines, which is why a
 * best-effort value is acceptable here; a caller that needs the exact id sends it.
 */
function surfaceIdFromFeature(feature: string): string {
  const lastDot = feature.lastIndexOf('.')
  return lastDot === -1 ? feature : feature.slice(0, lastDot)
}
