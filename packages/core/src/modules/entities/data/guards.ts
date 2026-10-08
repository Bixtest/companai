import type { EntityManager } from '@mikro-orm/postgresql'
import type {
  MutationGuard,
  MutationGuardAfterInput,
} from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import type { PermissionSurface } from '@open-mercato/shared/lib/permissions/catalogue'
import {
  evaluateStructureChange,
  type StructureChangeGateOutcome,
} from '@open-mercato/shared/lib/permissions/structure-change-gate'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  applyStructureChangeGrant,
  type PermissionGrantOutcome,
} from '@open-mercato/core/modules/auth/lib/permission-decision-grant'

const logger = createLogger('entities').child({ component: 'structure-change-gate' })

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
 *
 * Both read **every** key the payload names (`readFieldKeys`), not one
 * `payload.key`. The batch endpoint carries a list of definitions and no single
 * key, so a one-key reading silently skipped both guards there (CC-18). The
 * batch route now passes its keys (`keys: [...]`); the single route passes its
 * one (`{ ...input }`).
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

/**
 * Find the field keys in a mutation payload. Returns `[]` when the payload
 * carries none.
 *
 * **Why this is not just `payload.key`.** Those two guards used to read one
 * string field (`readStringField(payload, 'key')`), and the batch endpoint
 * (`api/definitions.batch.ts`) carries `{ entityId, definitionCount }` — no key
 * at all — so neither guard had ever run on a batch save. Measured (CC-18):
 * a batch POST with `definitions:[{key:'id',kind:'text'}]` returned 200 and
 * created a field defined on a system column, while the same key through the
 * single route (`api/definitions.ts`, which does put `key` in the payload) was
 * refused with 422.
 *
 * Rather than duplicate the checks into the route — which is how the two paths
 * drifted apart in the first place — the payload now names **every** key the
 * mutation touches: the two guards iterate them, and one reading of the list
 * keeps the single and batch paths honest.
 *
 * The contract (a mutation that writes keyed definitions puts the keys in
 * `keys`; a single-key payload is the one-element case) is pinned by the
 * batch route's own `keys: [...]` and by the single route's `{ ...input }`,
 * which spreads `key` in. It is a convention, not a closed type — a payload
 * that carried a key under any other name would still be missed — so the
 * call sites are the documentation, and this comment names them.
 */
export function readFieldKeys(payload: Record<string, unknown> | null | undefined): string[] {
  if (!payload || typeof payload !== 'object') return []
  const keys = (payload as Record<string, unknown>).keys
  if (Array.isArray(keys)) {
    return keys.filter((key): key is string => typeof key === 'string')
  }
  const key = (payload as Record<string, unknown>).key
  return typeof key === 'string' ? [key] : []
}

/**
 * Read a single string field off a payload, or `null`.
 *
 * Used by the two permission-decision guards (`entityId`, and the single `key`
 * of a create). Those name exactly one surface each, so a single-value read is
 * right for them — `readFieldKeys` is for the guards that must judge a batch.
 */
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
    const keys = readFieldKeys(input.mutationPayload)
    if (keys.length === 0) return { ok: true }

    const reserved = keys.find((key) => RESERVED_RECORD_KEYS.has(key))
    if (reserved) {
      // Name the offending key: a batch names many, and "one of these is
      // reserved" is not actionable (dictionary S3: tell the user why).
      return {
        ok: false,
        status: 422,
        message:
          `"${reserved}" is a system column and cannot be used as a custom field key. ` +
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
    const keys = readFieldKeys(input.mutationPayload)
    if (keys.length === 0) return { ok: true }

    const malformed = keys.find((key) => !FIELD_KEY_PATTERN.test(key))
    if (malformed !== undefined) {
      return {
        ok: false,
        status: 422,
        message: `Field key "${malformed}" is not valid: use lowercase letters, digits and underscores only (snake_case).`,
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
 * is the gate's; **this hook now writes those records** into
 * `role_acls.features_json` through the existing store (S5: one engine), in the
 * guard's `afterSuccess` step (see `applyGateDecisionToGrantRole` below).
 *
 * Why `afterSuccess` and not `validate`: the write is a *post-commit* side effect —
 * the surface must exist before it is granted — and the mutation-guard contract
 * provides exactly this step (`shouldRunAfterSuccess` + `metadata` carry the
 * validate-time decision forward). The write is idempotent (a set-union), so a
 * retry cannot double-grant.
 *
 * Scope, stated honestly (a hostile-critic pass corrected an earlier, looser version):
 *   - `operations: ['create']` only. This guard's payload carries no field list, so it
 *     cannot enumerate the columns a bulk save creates — and the batch definitions
 *     endpoint (`api/definitions.batch.ts`) creates NEW columns under
 *     `operation: 'custom'`, which the registry maps to `'update'`. Those creates are
 *     therefore not gated *by this hook*. They are gated **at that route instead**
 *     (CC-2, closed): the route runs the same pure gate over the same
 *     `fieldDefinitionSurface` for the keys it finds no definition row for, and writes
 *     the default through the same `applyStructureChangeGrant`. The trigger moved to the
 *     one place that knows the create; the policy did not move at all.
 *   - A **field-type change** (an update of an existing field's `kind`) is also not gated:
 *     detecting it needs the before-state, which the guard input does not carry.
 *   - **A write that cannot be applied is logged, not blocked.** `afterSuccess` runs
 *     after the surface has committed, so it cannot un-land it; when the grant role is
 *     missing (a provisioning defect) the failure is logged at `error` with the reason,
 *     and the gate itself already failed closed on the *decision*. Named in
 *     `PLAN-SD-1.md` §10 and scheduled in `COMPLETION-CALLBACKS.md` (CC-1).
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
 * S3: *tell the user why*). A pass carries the gate's outcome in `metadata` and
 * sets `shouldRunAfterSuccess`, so the guard's own `afterSuccess` step can write
 * the default's records once the surface has committed.
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
  return {
    ok: true as const,
    shouldRunAfterSuccess: true,
    metadata: { permissionDecision: result },
  }
}

/* ------------------------------------------------------------------ *
 * SD-1 — the write: applying the gate's default to the ACL store
 * ------------------------------------------------------------------ *
 * The gate is pure and writes nothing; the records it returns are applied here,
 * through the existing roles-and-permissions store (S5). The write happens in the
 * guard's `afterSuccess`, after the surface has committed.
 */

/** Read the gate's decision out of the guard's `metadata`, defensively. */
function readPermissionDecision(
  metadata: Record<string, unknown> | null | undefined,
): StructureChangeGateOutcome | null {
  const raw = metadata?.permissionDecision
  if (!raw || typeof raw !== 'object') return null
  const outcome = (raw as { outcome?: unknown }).outcome
  if (outcome !== 'defaulted' && outcome !== 'decided' && outcome !== 'refused') return null
  return raw as StructureChangeGateOutcome
}

/**
 * Obtain the request's EntityManager, or `null` when there is none.
 *
 * The mutation-guard contract hands `afterSuccess` no container (only ids and
 * metadata), so the guard resolves one itself — the same pattern
 * `customers/data/guards.ts` uses. Returning `null` rather than throwing keeps a
 * missing container from being mistaken for a refused write.
 */
async function resolveRequestEntityManager(): Promise<EntityManager | null> {
  try {
    const container = await createRequestContainer()
    return container.resolve('em') as EntityManager
  } catch {
    return null
  }
}

/**
 * Apply the gate's decision (read out of the guard's `metadata`) to the grant role.
 * Exported so it can be tested with a mock EntityManager — the DB-backed half of this
 * guard. The mapping itself lives in `applyStructureChangeGrant`, so the guard and the
 * batch route (CC-2) share one implementation.
 *
 * Returns `null` when there is nothing to write (no decision, or a `decided` outcome
 * whose records belong to a person's own grant target, which the decision type does
 * not yet carry — a named boundary, not a silent skip).
 */
export async function applyGateDecisionToGrantRole(
  em: EntityManager,
  input: { tenantId: string; metadata?: Record<string, unknown> | null },
): Promise<PermissionGrantOutcome | null> {
  const decision = readPermissionDecision(input.metadata)
  if (!decision) return null
  return applyStructureChangeGrant(em, { tenantId: input.tenantId, decision })
}

/**
 * The guard's `afterSuccess` body: write the default's records, and make a
 * failure *loud*. The runner swallows `afterSuccess` errors so a committed write
 * still succeeds, so an un-appliable grant is logged here at `error` — an ungated
 * surface is the exact defect SD-1 exists to prevent and must be visible.
 */
async function writeGateDecisionGrant(input: MutationGuardAfterInput): Promise<void> {
  const decision = readPermissionDecision(input.metadata)
  if (!decision || decision.outcome !== 'defaulted') return

  const em = await resolveRequestEntityManager()
  if (!em) {
    logger.error('SD-1: the new structure landed but no request EntityManager was available to grant its permissions', {
      tenantId: input.tenantId,
      resourceKind: input.resourceKind,
      // Deduped: a surface yields several records, so mapping records here would name
      // the same surface once per record.
      surfaces: [...new Set(decision.records.map((record) => record.surfaceId))],
    })
    return
  }

  const result = await applyGateDecisionToGrantRole(em, { tenantId: input.tenantId, metadata: input.metadata })
  if (result && !result.applied) {
    logger.error('SD-1: the new structure landed but its permission records could not be written', {
      reason: result.reason,
      because: result.because,
      roleName: result.roleName,
      tenantId: input.tenantId,
      resourceKind: input.resourceKind,
    })
    return
  }
  if (result) {
    logger.info('SD-1: permission records granted for the new structure', {
      roleName: result.roleName,
      added: result.added.length,
      alreadyPresent: result.alreadyPresent.length,
      aclCreated: result.aclCreated,
      tenantId: input.tenantId,
      resourceKind: input.resourceKind,
    })
  }
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

  // The write: apply the gate's default to the ACL store once the field landed.
  async afterSuccess(input) {
    await writeGateDecisionGrant(input)
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

  // The write: apply the gate's default to the ACL store once the entity landed.
  async afterSuccess(input) {
    await writeGateDecisionGrant(input)
  },
}

export const guards: MutationGuard[] = [
  reservedKeyGuard,
  keyShapeGuard,
  fieldPermissionDecisionGuard,
  entityPermissionDecisionGuard,
]
