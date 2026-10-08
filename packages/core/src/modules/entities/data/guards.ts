import type { MutationGuard } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import type { PermissionSurface } from '@open-mercato/shared/lib/permissions/catalogue'
import { evaluateStructureChange } from '@open-mercato/shared/lib/permissions/structure-change-gate'

/**
 * Structural guards for the dynamic-entity definition path.
 *
 * These run through the global mutation-guard registry (`guardEntries` in
 * `guards.generated.ts`, registered by `bootstrap/factory.ts`). They are the
 * central delivery path — not the per-route hand-wired calls — so every write
 * that reaches `beginEntitiesMutationGuard` sees them.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The registry was delivering nothing: the only modules that shipped a
 * `data/guards.ts` were parked (`customers`, `customer_accounts`), so
 * `guardEntries` was empty in the running app and the generic CRUD path ran
 * zero guards. This module is enabled, so its guards actually reach the store.
 *
 * The two guards below are real policy, not demonstrations:
 *
 *   1. `entities.field_definition.no-reserved-key` — a custom field whose key
 *      collides with a system column (`id`, `created_at`, `updated_at`,
 *      `deleted_at`) is REFUSED. Today `records.ts` silently *strips* those
 *      keys from incoming values, which throws data away without telling the
 *      caller. A field definition that can never be written is a defect in
 *      the model, so it must be rejected at definition time, with a reason
 *      (dictionary standard S3: tell the user why).
 *
 *   2. `entities.field_definition.key-shape` — the key must be snake_case,
 *      matching the schema the definition API already enforces. Enforcing it
 *      here as well means an AI-authored or CLI-authored definition cannot
 *      slip a malformed key past the HTTP validator.
 */

/**
 * Columns owned by every dynamic-entity record. A custom field may not claim
 * one: it could never hold a value, because the record write path strips these
 * keys before persisting. Kept in sync with the strip list in
 * `api/records.ts` (the camelCase variants are accepted there because edit
 * forms echo the loaded record back).
 */
const RESERVED_RECORD_KEYS: ReadonlySet<string> = new Set([
  'id',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'deleted_at',
  'deletedAt',
])

const FIELD_KEY_PATTERN = /^[a-z0-9_]+$/

function readStringField(payload: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!payload || typeof payload !== 'object') return null
  const raw = (payload as Record<string, unknown>)[key]
  return typeof raw === 'string' ? raw : null
}

const reservedKeyGuard: MutationGuard = {
  id: 'entities.field_definition.no-reserved-key',
  targetEntity: 'entities.field_definition',
  operations: ['create', 'update'],
  priority: 10,

  async validate(input) {
    const key = readStringField(input.mutationPayload, 'key')
    if (!key) return { ok: true }

    if (RESERVED_RECORD_KEYS.has(key)) {
      return {
        ok: false,
        status: 422,
        message:
          `"${key}" is a system column and cannot be used as a custom field key. ` +
          'System columns are managed by the platform and are stripped from record writes, ' +
          'so a field defined with this key could never store a value.',
      }
    }

    return { ok: true }
  },
}

const keyShapeGuard: MutationGuard = {
  id: 'entities.field_definition.key-shape',
  targetEntity: 'entities.field_definition',
  operations: ['create', 'update'],
  priority: 20,

  async validate(input) {
    const key = readStringField(input.mutationPayload, 'key')
    if (key === null) return { ok: true }

    if (!FIELD_KEY_PATTERN.test(key)) {
      return {
        ok: false,
        status: 422,
        message: `Field key "${key}" is not valid: use lowercase letters, digits and underscores only (snake_case).`,
      }
    }

    return { ok: true }
  },
}

/* ------------------------------------------------------------------ *
 * SD-1 — the permissions-on-change gate (S2)
 * ------------------------------------------------------------------ *
 * The dictionary's S2 standard: *"When new data structure appears — a new table,
 * a new column, a field-type change — the platform must not allow it to land until
 * permissions for it are decided, either by a person or by a rule."*
 *
 * These two guards are the hook. They run the shared structure-change gate
 * (`@open-mercato/shared/lib/permissions/structure-change-gate`) for the surface a
 * create lands and REFUSE (fail closed) when the gate cannot establish the
 * permissions. The default — full grant to the superadmin role plus the records —
 * is the gate's; writing those records into `role_acls.features_json` is the
 * caller's step through the existing store (S5: one engine).
 *
 * Scope, stated honestly (a hostile-critic pass corrected an earlier, looser version):
 *   - `operations: ['create']` only. This guard's payload carries no field list, so it
 *     cannot enumerate the columns a bulk save creates — and the batch definitions
 *     endpoint (`api/definitions.batch.ts`) creates NEW columns under
 *     `operation: 'custom'`, which the registry maps to `'update'`. Those creates are
 *     therefore **not** gated by this hook. Named as an open hole in `PLAN-SD-1.md` §10.
 *   - A **field-type change** (an update of an existing field's `kind`) is also not gated:
 *     detecting it needs the before-state, which the guard input does not carry.
 *   - **The gate produces the records; nothing writes them yet.** No call site persists
 *     the default into `role_acls.features_json` yet, so on the HTTP routes this hook
 *     enumerates and fails closed but does not itself change the ACL. `PLAN-SD-1.md`
 *     §10 states this plainly — the item is **PARTIAL**, not done.
 */

/**
 * The permission surface a custom **field** creates. The id is `<entityId>.<key>`,
 * so a field is a surface in its own right (the amended S2: a new column is not
 * "permitted" until both its blocks are set).
 */
export function fieldDefinitionSurface(entityId: string, key: string): PermissionSurface {
  return { id: `${entityId}.${key}`, kind: 'field', owner: 'entities', source: 'recorded' }
}

/**
 * The permission surface a custom **entity** creates.
 *
 * The records use the platform's own per-entity prefix (`entities.records.<id>`)
 * rather than a new scheme, so the catalogue and enforcement cannot drift — the
 * same ids `recordFeatures.ts` derives.
 */
export function entityDefinitionSurface(entityId: string): PermissionSurface {
  return {
    id: entityId,
    kind: 'object',
    owner: 'entities',
    source: 'recorded',
    featurePrefix: `entities.records.${entityId}`,
  }
}

/**
 * Run the gate for a create and turn a refusal into a block.
 *
 * A refusal is returned as `ok:false` with a plain-language message (dictionary
 * S3: *tell the user why*). A pass carries the gate's outcome in `metadata`, so a
 * caller that wants to write the default's records can read them.
 */
function runStructureChangeGate(surfaces: PermissionSurface[], what: string) {
  const result = evaluateStructureChange({ surfaces })
  if (result.outcome === 'refused') {
    return {
      ok: false as const,
      status: 422,
      message:
        `${what} cannot land: ${result.because} ` +
        'Every new data structure must answer the permissions question before it is applied (S2).',
    }
  }
  return { ok: true as const, metadata: { permissionDecision: result } }
}

const fieldPermissionDecisionGuard: MutationGuard = {
  id: 'entities.field_definition.requires-permission-decision',
  targetEntity: 'entities.field_definition',
  operations: ['create'],
  priority: 5,

  async validate(input) {
    const entityId = readStringField(input.mutationPayload, 'entityId')
    const key = readStringField(input.mutationPayload, 'key')
    // A create that cannot name the surface it creates is refused, not waved
    // through: the gate cannot decide permissions for a change it cannot describe.
    return runStructureChangeGate(
      entityId && key ? [fieldDefinitionSurface(entityId, key)] : [],
      'A new custom field',
    )
  },
}

const entityPermissionDecisionGuard: MutationGuard = {
  id: 'entities.entity.requires-permission-decision',
  targetEntity: 'entities.entity',
  operations: ['create'],
  priority: 5,

  async validate(input) {
    const entityId = readStringField(input.mutationPayload, 'entityId')
    return runStructureChangeGate(
      entityId ? [entityDefinitionSurface(entityId)] : [],
      'A new custom entity',
    )
  },
}

export const guards: MutationGuard[] = [
  reservedKeyGuard,
  keyShapeGuard,
  fieldPermissionDecisionGuard,
  entityPermissionDecisionGuard,
]
