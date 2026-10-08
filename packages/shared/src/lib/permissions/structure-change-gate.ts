/**
 * The structure-change gate (SD-1 / S2) — the permissions question, made
 * unskippable.
 *
 * **The rule, in the owner's words.** *"When new data structure appears — a new
 * table, a new column, a field-type change — the platform must not allow it to
 * land until permissions for it are decided, either by a person or by a rule. The
 * default is: grant full permission to the superadmin role and create the
 * permission records, so nothing is ever invisible and nothing is ever open by
 * accident."* (`SPECIFICATIONS-DICTIONARY.md` S2.)
 *
 * **What this function does, and what it does not.** It is a **pure decision** over
 * an already-loaded input: given the surfaces a change creates, and an optional
 * decision a person made, it says one of three things —
 *
 *   - `decided` — a person decided; the records are theirs;
 *   - `defaulted` — nobody decided; **the default applies**: full grant to the
 *     superadmin role, plus the records the surfaces yield;
 *   - `refused` — the gate **cannot establish** the permissions, so the change
 *     **must not land**.
 *
 * It does **not** write anything. It returns the records; the caller writes them
 * into the existing roles-and-permissions store (`role_acls` / `user_acls`
 * `features_json`), which is the same engine as everything else (S5). Separating
 * the decision from the write is what lets the decision be proved exhaustively —
 * the same split `triage.ts` and `tier-source.ts` use.
 *
 * **Why it is pure.** No `await`, no container, no clock — so a caller on the
 * change path can run it without a database, and its tests need no mock. The one
 * part that touches the database (writing the records) is the caller's, and is
 * named as such rather than hidden here.
 *
 * **Fail closed, always — and the refusals are reachable.** A gate that cannot
 * refuse is decoration. Each refusal below is a real condition a caller can hit,
 * and each is tested:
 *
 *   1. **no surfaces** — a structure change that creates nothing is a defect, not
 *      a pass. Permitting nothing is not the same as permitting something safely.
 *   2. **a malformed surface id** — an id the platform's matcher could not read
 *      would produce a feature record nobody could grant, so it is refused rather
 *      than stored.
 *   3. **an unrecognised surface kind** — "we did not recognise this" is never
 *      evidence that it is safe. This is the same rule the tier source enforces
 *      (an unrecognised change is never `safe`).
 *   4. **a decision that grants nothing** — a decision with no records is not a
 *      decision; treating it as one would let "I decided" mean "I decided
 *      nothing".
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` S2 + §C.1; `ARCHITECTURE-structure-permissions.md`
 * §3–§4; `library/development/PLAN-SD-1.md`.
 */

import {
  isPermissionSurfaceId,
  isPermissionSurfaceKind,
  permissionRecordsFor,
  type PermissionRecord,
  type PermissionSurface,
} from './catalogue'

/**
 * The role a new surface's records are granted to by default.
 *
 * **Why the superadmin role, and not "nobody".** So a new table is never invisible
 * to the only role that can fix it. Invisible-to-everyone is a silent failure;
 * visible-to-superadmin is a safe starting point an admin narrows from
 * (dictionary §C.1, *"why the default is full to superadmin"*).
 */
export const DEFAULT_GRANT_ROLE = 'superadmin' as const

/**
 * A decision a person made about a new surface — the records they granted.
 *
 * The type carries the records, not a boolean, so "a person decided" cannot be
 * true while the decision is empty. An empty decision is refused (rule 4).
 */
export type StructurePermissionDecision = {
  /** Who decided — a user id, a role, or a named policy. Recorded, never inferred. */
  decidedBy: string
  /** The records the decision grants. */
  records: readonly PermissionRecord[]
}

export type StructureChangeGateInput = {
  /** The surfaces the change creates. Empty is refused, not passed. */
  surfaces: readonly PermissionSurface[]
  /**
   * A decision a person (or a named rule) made. When present and well-formed it
   * decides; when absent the default applies.
   */
  decision?: StructurePermissionDecision | null
}

/** Why the gate refused. A closed set, so a caller can switch on it. */
export const STRUCTURE_CHANGE_GATE_REFUSALS = [
  'no_surface',
  'malformed_surface_id',
  'unrecognised_surface_kind',
  'empty_decision',
] as const
export type StructureChangeGateRefusalReason = (typeof STRUCTURE_CHANGE_GATE_REFUSALS)[number]

export type StructureChangeGateOutcome =
  | {
      outcome: 'decided'
      /** The records the decision grants. */
      records: PermissionRecord[]
      decidedBy: string
      because: string
    }
  | {
      outcome: 'defaulted'
      /** The records to create and grant. */
      records: PermissionRecord[]
      /** The role they are granted to. */
      grantTo: typeof DEFAULT_GRANT_ROLE
      because: string
    }
  | {
      outcome: 'refused'
      reason: StructureChangeGateRefusalReason
      /** Plain language, for the person who has to fix it. Never empty. */
      because: string
    }

/** Deduplicate records by feature id, preserving first-seen order. */
function dedupeRecords(records: readonly PermissionRecord[]): PermissionRecord[] {
  const seen = new Set<string>()
  const out: PermissionRecord[] = []
  for (const record of records) {
    if (seen.has(record.feature)) continue
    seen.add(record.feature)
    out.push(record)
  }
  return out
}

/**
 * Evaluate a structure change. Pure; never throws.
 *
 * The order of the checks is deliberate: the cheapest and most structural
 * refusals first (nothing to permit → an id we cannot read → a kind we do not
 * know), then the decision, then the default. A malformed surface is refused
 * **before** a decision is consulted, because a decision cannot make an unreadable
 * id readable.
 */
export function evaluateStructureChange(input: StructureChangeGateInput): StructureChangeGateOutcome {
  const surfaces = input.surfaces ?? []

  // 1. A change that creates nothing cannot be permitted — and must not pass.
  if (surfaces.length === 0) {
    return {
      outcome: 'refused',
      reason: 'no_surface',
      because:
        'The change creates no enumerable permission surface, so no permission can be decided for it. ' +
        'A structure change must name what it creates before it can land.',
    }
  }

  // 2/3. Every surface must be readable and recognised, before anything is decided.
  for (const surface of surfaces) {
    if (!isPermissionSurfaceId(surface.id)) {
      return {
        outcome: 'refused',
        reason: 'malformed_surface_id',
        because:
          `The surface id ${JSON.stringify(surface.id)} is not a readable permission-surface id ` +
          '(segments of [a-z0-9_], joined by "." or ":"). A record built from it could never be granted.',
      }
    }
    if (!isPermissionSurfaceKind(surface.kind)) {
      return {
        outcome: 'refused',
        reason: 'unrecognised_surface_kind',
        because:
          `The surface kind ${JSON.stringify(surface.kind)} is not recognised, so its records are unknown. ` +
          'An unrecognised surface is never treated as safe.',
      }
    }
    // A `featurePrefix` that no matcher can read would produce unreadable records —
    // a hostile critic proved the gate used to wave this through. It is refused with
    // the same reason as a malformed id, because it is the same defect one level up.
    if (surface.featurePrefix !== undefined && !isPermissionSurfaceId(surface.featurePrefix)) {
      return {
        outcome: 'refused',
        reason: 'malformed_surface_id',
        because:
          `The record prefix ${JSON.stringify(surface.featurePrefix)} is not a readable permission-surface id, ` +
          'so the records built from it could never be granted. Refused rather than stored.',
      }
    }
    if (permissionRecordsFor(surface).length === 0) {
      return {
        outcome: 'refused',
        reason: 'unrecognised_surface_kind',
        because:
          `The surface ${surface.id} yields no permission records, so there is nothing to decide or grant. ` +
          'It is refused rather than landed ungated.',
      }
    }
  }

  const required = dedupeRecords(surfaces.flatMap((surface) => permissionRecordsFor(surface)))

  // 4. A decision that grants nothing is not a decision.
  const decision = input.decision
  if (decision) {
    if (!decision.records || decision.records.length === 0) {
      return {
        outcome: 'refused',
        reason: 'empty_decision',
        because:
          `A decision was recorded by ${JSON.stringify(decision.decidedBy)} but it grants no records, ` +
          'which is the same as deciding nothing. The default must be applied explicitly instead.',
      }
    }
    return {
      outcome: 'decided',
      records: dedupeRecords(decision.records),
      decidedBy: decision.decidedBy,
      because: `${decision.decidedBy} decided the permissions for this change.`,
    }
  }

  // The default: full grant to the superadmin role, plus the records.
  return {
    outcome: 'defaulted',
    records: required,
    grantTo: DEFAULT_GRANT_ROLE,
    because:
      `No permission decision was recorded, so the default applies: full grant to the ` +
      `${DEFAULT_GRANT_ROLE} role, plus ${required.length} permission record(s) created for the new surface(s).`,
  }
}
