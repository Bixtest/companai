/**
 * CC-45 — a marked (encrypted) field must never leave in an export in clear.
 *
 * The platform already marks sensitive fields/secrets via `ModuleEncryptionMap` and enforces
 * them at rest / on read under a per-tenant DEK (`TenantDataEncryptionService`). What was NOT
 * enforced is the **export** path: `exporters.ts` is classification-agnostic and serializes
 * whatever rows it is handed, so a marked field exported **in clear**.
 *
 * This module is the single place that answers "which export columns are marked for this entity,
 * and what do we write in their place". It mirrors the established pattern in
 * `shared/src/lib/query/encrypted-sort.ts`:
 *   - the service is required **structurally** (`getEncryptedFieldNames?`, `isEnabled?`), never as
 *     a hard class dependency, so this module stays dependency-free and unit-testable;
 *   - a missing service OR `isEnabled() === false` yields an **empty set** => the export is
 *     byte-identical to the pre-CC-45 behaviour (CC-45 check 3);
 *   - field names are matched across snake_case / camelCase / `cf:` variants, because the map may
 *     name a field differently from the export column (CC-45 check 1).
 *
 * Design decision (owner's call, rule 11): **mask**, do not omit. The column and its header stay
 * in place so a downstream spreadsheet consumer does not silently get shifted columns. Switching
 * to omission is a change in `applyEncryptedFieldMask` only.
 */

import type { EntityId } from '@open-mercato/shared/modules/entities'
import type { PreparedExport } from './exporters'

/**
 * The subset of `TenantDataEncryptionService` this module needs. Declared structurally so callers
 * can pass the real service, a container-resolved proxy, or a test double without coupling.
 */
export type ExportEncryptionService = {
  getEncryptedFieldNames?: (
    entityId: EntityId,
    tenantId?: string | null,
    organizationId?: string | null,
  ) => Promise<readonly string[]>
  isEnabled?: () => boolean
}

/** Resolves the encryption service lazily; returns `null`/`undefined` when encryption is unavailable. */
export type ExportEncryptionResolver = () => ExportEncryptionService | null | undefined

/** The token written in place of a marked field's value. */
export const MASKED_EXPORT_VALUE = '***'

// The map may name a field differently from the export column: the column can come from a
// `csv.headers` entry or an `export.columns[i].field` that preserves `-`, spaces and case
// (`sanitizeFieldName` only replaces other punctuation), e.g. map `apiSecret` vs header
// `api-secret` / `Api Secret` / `API_SECRET`. So matching is done on a CANONICAL form — lowercase
// with every non-alphanumeric character removed — which subsumes snake_case, camelCase, kebab-case,
// spaces and case. `cf:` / `cf_` custom-field prefixes are stripped first so both spellings agree.
export function canonicalExportFieldName(field: string): string {
  return String(field || '')
    .trim()
    .replace(/^cf[:_\-\s]+/i, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

/**
 * All spellings of a field name that should be considered "the same field" for masking.
 * Kept as a list (rather than only the canonical form) so callers that need raw spellings for
 * key lookup still work; the canonical form is always included.
 */
export function exportFieldNameCandidates(field: string): string[] {
  const raw = String(field || '').trim()
  if (!raw) return []
  const candidates = [raw, canonicalExportFieldName(raw)]
  if (raw.startsWith('cf:')) candidates.push(raw.replace(/[^a-zA-Z0-9_]/g, '_'))
  return Array.from(new Set(candidates.filter(Boolean)))
}

/**
 * Reads the marked-field set for one entity. Fails **open to empty** on every unavailable path:
 * no service, disabled service, or no `entityId` all mean "nothing is marked" — i.e. no behaviour
 * change. This is deliberate: the export must never become unusable because encryption is off.
 */
/**
 * The outcome of resolving one entity's marked fields.
 * `maskAll` is the fail-closed result — the map read threw, so we redact everything rather than
 * leak. Modelled explicitly rather than with a sentinel Set, so the failure mode is visible at the
 * call site and trivially unit-testable.
 */
export type ExportEncryptedFieldResult = {
  fields: Set<string>
  maskAll: boolean
}

export async function resolveExportEncryptedFields(
  resolveService: ExportEncryptionResolver | ExportEncryptionService | null | undefined,
  entityId: string | null | undefined,
  tenantId?: string | null,
  organizationId?: string | null,
): Promise<ExportEncryptedFieldResult> {
  const empty: ExportEncryptedFieldResult = { fields: new Set(), maskAll: false }
  if (!entityId) return empty
  const service =
    typeof resolveService === 'function' ? safeResolve(resolveService) : resolveService ?? null
  if (!service?.getEncryptedFieldNames) return empty
  if (service.isEnabled && !service.isEnabled()) return empty
  let names: readonly string[]
  try {
    names = await service.getEncryptedFieldNames(entityId, tenantId ?? null, organizationId ?? null)
  } catch {
    // Fail closed on a read error: redact every column rather than export in clear.
    return { fields: new Set(), maskAll: true }
  }
  const expanded = new Set<string>()
  for (const name of names ?? []) {
    // Store the canonical form (and any `cf_`-style raw variant) so matching is spelling-agnostic.
    for (const candidate of exportFieldNameCandidates(name)) expanded.add(candidate)
    const canonical = canonicalExportFieldName(name)
    if (canonical) expanded.add(canonical)
  }
  return { fields: expanded, maskAll: false }
}

function safeResolve(resolver: ExportEncryptionResolver): ExportEncryptionService | null {
  try {
    return resolver() ?? null
  } catch {
    return null
  }
}

/**
 * True when `field` is marked. Compares the CANONICAL form of both sides, so map `apiSecret`
 * matches export column `api-secret` / `Api Secret` / `API_SECRET` / `api_secret`.
 */
export function isEncryptedExportField(field: string, encrypted: ReadonlySet<string>): boolean {
  if (!encrypted || encrypted.size === 0) return false
  const canonical = canonicalExportFieldName(field)
  if (!canonical) return false
  if (encrypted.has(canonical)) return true
  // Backstop: also try the raw spelling, in case a caller populated the set directly with raw names.
  return encrypted.has(String(field || '').trim())
}

/**
 * Applies the mask to a prepared export (returns a new object): every column whose field is marked
 * keeps its header but receives {@link MASKED_EXPORT_VALUE} for every row. When `maskAll` is set
 * (fail-closed) every column is masked. A no-op when nothing is marked, so an unmarked export is
 * byte-unchanged.
 */
export function applyEncryptedFieldMask(
  prepared: PreparedExport,
  resolved: ExportEncryptedFieldResult,
): PreparedExport {
  if (!resolved) return prepared
  const { fields, maskAll } = resolved
  if (!maskAll && (!fields || fields.size === 0)) return prepared
  const maskedFields = new Set<string>()
  for (const column of prepared.columns) {
    if (maskAll || isEncryptedExportField(column.field, fields)) maskedFields.add(column.field)
  }
  if (maskedFields.size === 0) return prepared
  const rows = prepared.rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const next: Record<string, unknown> = { ...row }
    for (const field of maskedFields) {
      if (Object.prototype.hasOwnProperty.call(next, field)) next[field] = MASKED_EXPORT_VALUE
    }
    return next
  })
  return { columns: prepared.columns, rows }
}
