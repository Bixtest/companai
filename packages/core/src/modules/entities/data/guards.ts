import type { EntityManager } from '@mikro-orm/postgresql'
import type {
  MutationGuard,
  MutationGuardAfterInput,
  MutationGuardResult,
} from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { PermissionSurface } from '@open-mercato/shared/lib/permissions/catalogue'
import {
  evaluateStructureChange,
  DEFAULT_GRANT_ROLE,
  type StructureChangeGateOutcome,
} from '@open-mercato/shared/lib/permissions/structure-change-gate'
import {
  readStructureDecisionFromHeaders,
  toStructurePermissionDecision,
  type StructureDecisionHeaderRead,
  type StructureDecisionHeaderValue,
} from '@open-mercato/shared/lib/permissions/structure-change-decision-header'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  DEFAULT_CORE_SETTINGS,
  type CoreSettings,
} from '@open-mercato/shared/lib/core-boundary/core-settings'
import type { PrincipalKind } from '@open-mercato/shared/lib/auth/principal'
import {
  actorTypeForPrincipal,
  DEFAULT_STRUCTURAL_SETTINGS,
  explicitStructuralLevel,
  loadStructuralSettings,
  type StructuralObjectKind,
  type StructuralSettings,
  type StructuralSettingsReader,
} from '@open-mercato/shared/lib/permissions/structural-settings'
import type { StructuralVerb } from '@open-mercato/shared/lib/permissions/catalogue'
import type { MutationGuardEscalation } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { isReservedSystemEntityType } from '@open-mercato/shared/lib/entities/system-entities'
import {
  applyStructureChangeGrant,
  assertActorMayStateDecision,
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
 * the records once the surface has committed.
 *
 * **CC-17: the person's decision, read from the request.** The guards see the
 * request headers (the runner passes them through), so this is where a decision
 * carried on the `x-om-ext-permissions-decision` header reaches the gate — the
 * reachable entry point for the `decided` branch, which no caller could reach
 * before. The three-way read is honoured exactly as the batch route honours it:
 *
 *   - `absent` → no decision; the gate applies its default;
 *   - `malformed` → **refused here as a block** (400), because falling through to
 *     the default would silently swap a person's intent for a superadmin grant —
 *     a fail-open reading of a broken authorisation;
 *   - `decision` → handed to the gate, which resolves its grant target.
 *
 * This is deliberately the *same* carrier and the *same* mapping the batch route
 * uses (`toStructurePermissionDecision`), so the two cannot drift into "the route
 * honours a decision, the guard ignores it".
 */
async function runStructureChangeGate(
  surfaces: PermissionSurface[],
  what: string,
  requestHeaders?: Headers,
  actor?: { userId?: string; tenantId?: string; organizationId?: string | null },
) {
  let decision: StructureDecisionHeaderRead = { kind: 'absent' }
  if (requestHeaders) decision = readStructureDecisionFromHeaders(requestHeaders)
  if (decision.kind === 'malformed') {
    return { ok: false as const, status: 400, message: decision.because }
  }

  // SD-1 (CC-25): a person's decision is only honoured when the *actor* is
  // authorised to state it. The carrier trusts the header's `decidedBy` /
  // `grantTo`; this is where they are checked against the authenticated user, at
  // the guard's single chokepoint (both the field and the entity guard pass
  // through here), so the two can never drift into "the route checks, the guard
  // does not". A malformed decision is refused above (400); an unauthorised one
  // is refused here with the platform's own status (`403`), before the gate runs.
  if (decision.kind === 'decision') {
    const refusal = await assertActorMayStateDecisionFromGuard(decision.decision, actor)
    if (refusal) return refusal
  }

  const result = evaluateStructureChange({
    surfaces,
    decision: decision.kind === 'decision' ? toStructurePermissionDecision(decision.decision) : null,
  })
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

/**
 * Run the CC-25 actor check for a guard, converting a `CrudHttpError` refusal into
 * the guard's own failure shape (`ok:false` with the platform's status).
 *
 * The guard runner resolves no container into `validate`, so one is created here —
 * the same pattern {@link loadStructuralSettingsForGuard} already uses. **Fail
 * closed on a broken container:** if the RBAC service cannot be resolved the
 * decision cannot be authorised, so it is refused rather than waved through (a
 * store failure must never *loosen* a protected write — the same rule the
 * structural-settings reader states).
 *
 * Returns `null` when the actor may state the decision (nothing to refuse).
 */
async function assertActorMayStateDecisionFromGuard(
  decision: StructureDecisionHeaderValue,
  actor?: { userId?: string; tenantId?: string; organizationId?: string | null },
): Promise<MutationGuardResult | null> {
  const tenantId = actor?.tenantId
  if (!tenantId) {
    return {
      ok: false as const,
      status: 403,
      message: 'A permission decision must be stated within a tenant.',
    }
  }
  try {
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const rbacService = container.resolve('rbacService') as RbacService
    await assertActorMayStateDecision({
      em,
      rbacService,
      actorUserId: actor?.userId,
      tenantId,
      organizationId: actor?.organizationId ?? null,
      records: decision.records,
      grantTo: decision.grantTo ?? DEFAULT_GRANT_ROLE,
    })
    return null
  } catch (err) {
    if (isCrudHttpError(err)) {
      return { ok: false as const, status: err.status, message: errorMessage(err) }
    }
    // A container/RBAC failure cannot authorise the decision → refuse (fail closed).
    logger.warn('SD-1 (CC-25): could not authorise a structure-permission decision', {
      tenantId,
      err,
    })
    return {
      ok: false as const,
      status: 403,
      message:
        'The permission decision could not be authorised (the permissions service was unreachable), ' +
        'so it is refused rather than applied unverified.',
    }
  }
}

/** The plain-language message out of a CrudHttpError body. */
function errorMessage(err: CrudHttpError): string {
  const body = err.body as Record<string, unknown> | undefined
  const message = body?.error
  return typeof message === 'string' && message.length > 0 ? message : err.message
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
 * Load the structural-permission setting for the guard, or the seed (fail closed).
 *
 * **Why the guard reads the LIVE setting, not just the seed.** The seed is empty by
 * design (every level inherits the strictest), so a guard that only ever saw the seed
 * could never escalate — the CC-37 wiring would be *reachable in principle and dead
 * in practice*, the exact decoration the rules forbid. The setting is what a
 * superadmin edits to place a level, so the guard must read it for the wiring to be
 * real end to end.
 *
 * **Fail closed, always.** A missing container, an unreachable store, or a malformed
 * value all yield {@link DEFAULT_STRUCTURAL_SETTINGS} — the empty seed — which the
 * decision reads as *"no explicit rule"*, so the absolute 422 stands. Never the other
 * way: a store failure must not be able to *loosen* a protected surface.
 */
async function loadStructuralSettingsForGuard(tenantId: string): Promise<StructuralSettings> {
  try {
    const container = await createRequestContainer()
    const reader = container.resolve('moduleConfigService') as StructuralSettingsReader
    return await loadStructuralSettings(reader, { tenantId })
  } catch {
    return DEFAULT_STRUCTURAL_SETTINGS
  }
}

/**
 * Apply the gate's decision (read out of the guard's `metadata`) to the grant role.
 * Exported so it can be tested with a mock EntityManager — the DB-backed half of this
 * guard. The mapping itself lives in `applyStructureChangeGrant`, so the guard and the
 * batch route (CC-2) share one implementation.
 *
 * Returns `null` only when there is **nothing to write** — no decision at all, or a
 * `refused` outcome (which never landed a surface, so there is nothing to grant).
 * Since CC-17 a `decided` outcome is a real write target: the decision type carries
 * a grant target, so the person's records go to the role they named rather than
 * being dropped here (which is exactly what used to happen).
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
 * The guard's `afterSuccess` body: write the gate's records, and make a failure
 * *loud*. The runner swallows `afterSuccess` errors so a committed write still
 * succeeds, so an un-appliable grant is logged here at `error` — an ungated
 * surface is the exact defect SD-1 exists to prevent and must be visible.
 *
 * **CC-17: a `decided` outcome is written too.** Before CC-17 this returned unless
 * the outcome was `defaulted`, so a person's decision reached the gate (once the
 * carrier is wired), produced records, and was then dropped at the write. S2 says
 * the permissions are decided *"either by a person or by a rule"*; both now go
 * through `applyGateDecisionToGrantRole`, which maps both to the one write.
 */
async function writeGateDecisionGrant(input: MutationGuardAfterInput): Promise<void> {
  const decision = readPermissionDecision(input.metadata)
  if (!decision || decision.outcome === 'refused') return

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
      input.requestHeaders,
      { userId: input.userId, tenantId: input.tenantId, organizationId: input.organizationId },
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
      input.requestHeaders,
      { userId: input.userId, tenantId: input.tenantId, organizationId: input.organizationId },
    )
  },

  // The write: apply the gate's default to the ACL store once the entity landed.
  async afterSuccess(input) {
    await writeGateDecisionGrant(input)
  },
}

/* ------------------------------------------------------------------ *
 * SD-4 — the structural guard (S11): a protected object may not be
 * DROPped or RE-TYPED
 * ------------------------------------------------------------------ *
 * The `SD-2b` handoff named this guard: *"a `core`/`platform_release` object
 * must not be DROPped, re-typed, or have its FK changed (S5: one engine, never a
 * rival)".*
 *
 * **The namespace, measured — this is the correction the first draft needed.**
 * The entities definition route passes `entityId` in the platform's **entity-id**
 * form (`auth:user`, `customers:customer_person`) — verified at
 * `api/definitions.ts:670` (`mutationPayload: { entityId, key }`) and in the
 * integration specs (`customers:customer_deal`). It is **not** a table name. The
 * `SD-2b` seed's **tier map** uses *table names* (`users` → `core`), but the same
 * seed's **reserved-entity-type set** is the entity-id form of exactly those
 * `core`/`platform_release` tables (`auth:user`, `auth:role`, …). So the correct
 * decision for a route write is `isReservedSystemEntityType(entityId)` — the
 * already-built, already-tested `SD-2b` bridge between the two namespaces — not a
 * fresh `table`-name lookup that would silently never match.
 *
 * SCOPE, STATED HONESTLY (what a guard can and cannot see):
 *   - A mutation guard sees **row-level structural writes the platform performs**:
 *     deleting a `custom_field_defs` / entity-definition row, or changing one's
 *     `kind` (a re-type). Those are covered here.
 *   - A raw DDL `DROP TABLE` / `ALTER … TYPE` / FK change is **not** a row write,
 *     so no mutation guard can see it. This slice does not pretend to stop it —
 *     the DROP/FK case is named and scheduled (see `PLAN-SD-4.md` §6 and its
 *     callback), because the platform's own schema changes go through migrations,
 *     not through a route's data write.
 */

/**
 * The resource kinds this guard governs: the **definition** writes only.
 *
 * **Why scoped by hand and not by `targetEntity`.** A guard declares one
 * `targetEntity` (or `'*'`), and this guard must see **two** kinds
 * (`entities.entity` and `entities.field_definition`), so it declares `'*'` — and
 * then must narrow itself, because `'*'` also matches the **record** writes
 * (`entities.custom_entity_record`, `records.ts:498/585/697`). Those carry an
 * `entityId` too, so without this scope the guard would judge record writes as if
 * they were structural ones. The record route happens to reject system entities
 * *first* (`classifyRecordsEntity`) — but a guard whose correctness rests on
 * another route's ordering is a latent false-block, not a design. So it narrows by
 * `resourceKind`, which is the one field the runner always sets.
 *
 * A hostile-critic pass found this (Probe 3, HIGH): it proved a record delete
 * against `auth:user` returned 422 from this guard. Scoping here removes the
 * dependence on ordering entirely.
 */
const STRUCTURAL_RESOURCE_KINDS: ReadonlySet<string> = new Set([
  'entities.entity',
  'entities.field_definition',
])

/**
 * The grammar's **object** axis for a resource kind (CC-37) — the architecture's
 * §4.2 bridge `resourceKind → object`.
 *
 * `entities.field_definition` is a **column**; `entities.entity` is a **table**.
 * That is the whole map for this guard: those are the two definition kinds
 * `STRUCTURAL_RESOURCE_KINDS` governs. A kind outside the set returns `null`, and
 * the caller then does not consult the grammar (the guard is inert for it).
 */
function structuralObjectKindFor(resourceKind: string): StructuralObjectKind | null {
  if (resourceKind === 'entities.field_definition') return 'column'
  if (resourceKind === 'entities.entity') return 'table'
  return null
}

/**
 * The grammar's **verb** axis for a mutation operation (CC-37) — the architecture's
 * §4.2 bridge `operation → verb` (create→add, update→edit, delete→remove).
 *
 * **`create` maps to `add`, but this guard never *acts* on a `create`** (a create is
 * the S2 gate's job — see `structuralGuardRefusal`'s first line and the guard's
 * `operations: ['update','delete']`). The mapping is total anyway, so the function
 * has no silent hole and a future caller cannot get `undefined`.
 */
function structuralVerbFor(operation: 'create' | 'update' | 'delete'): StructuralVerb {
  if (operation === 'create') return 'add'
  if (operation === 'update') return 'edit'
  return 'remove'
}

/**
 * CC-37 — the grammar's **level**, turned into a guard outcome, for a structural
 * write. The reader `structural-settings.ts` was built for (Slice C) and had none.
 *
 * **What it decides, and — just as important — what it does not.** A resolved level
 * of `review`/`approval` on a reserved surface becomes the **escalate** outcome (D3,
 * *held for a person* instead of hard-blocked); `never` keeps the existing 422
 * refusal; `straight` cannot *un*-refuse a reserved surface — S9/SD-2b is absolute,
 * and the grammar **refines** it, never weakens it.
 *
 * **Why it only refines a *reserved* surface, and does not yet judge an ordinary
 * one.** The seed's default level is `approval` (fail closed). If this guard escalated
 * every **non-reserved** structural write by that default, it would hold **every**
 * column-add and entity-create-for-review — the platform would stop, and it would be
 * the agent inventing a posture the owner has not set. The grammar's *per-object rules*
 * (which object sits at which level) are the owner's to set; until they exist, a
 * non-reserved write keeps its present behaviour (`ok:true`). So this wiring is
 * **load-bearing where a decision already exists** (a protected surface) and **inert
 * where inventing a decision would break the platform** — the honest, non-breaking
 * half of CC-37. The remainder (acting on a non-reserved object once the owner sets
 * its rules) is stated plainly in the guard's own comment and stays scheduled.
 *
 * **An unresolved actor is refused, not escalated (fail closed).** `actorKind` is
 * optional on the guard input; `undefined` means *"we could not name who is acting"*,
 * not *"a person"*. A hostile-critic pass caught the first version escalating the
 * `any` axis for such a caller under the label "a person" — a false statement (S3)
 * about an unidentified actor. S9 is absolute and the grammar may loosen it **only
 * for a named actor**, so an unnamed one keeps the 422. (Regression: the
 * "does NOT escalate an UNRESOLVED actor" test.)
 *
 * **Pure over its inputs** — no DB, no container. Exported so it can be tested at its
 * exact inputs (the same reason `structuralGuardRefusal` is exported).
 */
export function structuralLevelDecision(
  resourceKind: string,
  operation: 'create' | 'update' | 'delete',
  isReserved: boolean,
  actorKind: PrincipalKind | undefined,
  settings: StructuralSettings,
): MutationGuardEscalation | null {
  // Only refine a surface the guard already refuses. A non-reserved structural write
  // is not judged by the grammar yet (see the doc-comment above).
  if (!isReserved) return null
  const objectKind = structuralObjectKindFor(resourceKind)
  if (!objectKind) return null

  // **An unresolved actor is never escalated (fail closed).** `actorKind` is optional
  // on the guard input — a route that predates S12 passes none — so `undefined` means
  // *"we could not name who is acting"*, **not** *"a person"*. S9's refusal is
  // absolute; the grammar may loosen it **only for an actor we can name**. Escalating
  // an unidentified caller would both hold a write on behalf of an unknown and label
  // it "a person" (a false statement — dictionary S3). So no name → the 422 stands.
  // (A hostile-critic pass found the earlier version escalated `undefined` under the
  // `any` axis and mislabelled it; that is the hole this closes.)
  if (actorKind === undefined) return null

  const verb = structuralVerbFor(operation)
  // **Explicit rules only.** The grammar's default is `approval` (fail closed), so
  // acting on the resolved default would turn the absolute S9 refusal into a 202 for
  // every reserved write that has no rule — weakening the rule the guard exists for.
  // Only a level a person **chose** may loosen an absolute rule (see
  // `explicitStructuralLevel`); no rule → the 422 stands.
  const level = explicitStructuralLevel(objectKind, verb, actorTypeForPrincipal(actorKind), settings)

  // `never` is the existing hard refusal; `straight` cannot override S9 on a protected
  // object. Only a *held-for-a-person* level becomes an escalation.
  if (level !== 'review' && level !== 'approval') return null

  const actor = actorKind === 'human' ? 'a person' : `an automated actor (${actorKind})`
  const gate = level === 'approval' ? 'A3' : 'A2'
  return {
    gate,
    rule: `structural_permission.${objectKind}.${verb}.${level}`,
    because:
      `A structural change to a protected object by ${actor} is set to the "${level}" level ` +
      `for (${objectKind}, ${verb}) — the change is held for a person rather than applied. ` +
      `The level is the superadmin's structural-permission setting (S11).`,
    status: 202,
  }
}

/**
 * The refusal for a protected object, or `null` when the write may proceed.
 *
 * Exported (like `applyGateDecisionToGrantRole`) so the decision can be tested at
 * its exact inputs without a DB or a running registry. Pure over the `SD-2b`
 * decision: given no settings it uses the seed, which fails closed.
 *
 * **A write on a reserved system surface is refused.** The entity id is the unit
 * the route actually carries, and `isReservedSystemEntityType` is the `SD-2b`
 * predicate whose seed is (a) the substrate and (b) the `core`/`platform_release`
 * tables in entity-id form — so a field on `auth:user` and an entity `auth:user`
 * are both protected, from one decision, with no second authority on what is
 * protected (S5).
 *
 * **S12 — the actor kind is part of the decision.** When the acting principal is a
 * **machine** (`ai_worker` / `service` / `system`), the refusal names that fact, so
 * the reason tells the truth about *who* was stopped. This makes the `actorKind`
 * that rides the guard input **load-bearing** (a guard that never read it would be
 * the decoration the rules forbid).
 *
 * **CC-37 — the grammar's level now *shapes* the refusal.** The S11 per-(object,
 * verb, actor) level (`structuralLevelDecision`, below) is read from the settings
 * module Slice C built: an **explicit** `review`/`approval` level turns this hard
 * 422 into an **escalation** — *held for a person*, D3's third outcome, and this
 * guard is its first production emitter. `never`/`straight`/no-rule keep the 422.
 * The grammar **refines** the reserved-surface refusal; it never weakens it (S9 is
 * absolute) — which is why the decision reads `explicitStructuralLevel`, not the
 * resolved default: the seed's `approval` default must **not** convert the absolute
 * refusal into a 202 for every write that has no rule. A non-reserved surface is
 * deliberately **not** judged by the grammar yet (only an explicit rule may move a
 * write off the absolute refusal; on an ordinary object there is no refusal to refine).
 */
export function structuralGuardRefusal(
  payload: Record<string, unknown> | null | undefined,
  operation: 'create' | 'update' | 'delete',
  settings: CoreSettings = DEFAULT_CORE_SETTINGS,
  actorKind?: PrincipalKind,
): { status: number; message: string } | null {
  // A create is not a structural change to an existing object — it is the S2
  // gate's job (a different guard already runs there), not this one.
  if (operation === 'create') return null

  const entityId = readStringField(payload, 'entityId')
  if (!entityId) return null
  if (!isReservedSystemEntityType(entityId, settings)) return null

  // Name the field too when there is one, so the message is actionable for a
  // column write (the route sends `{ entityId, key }` on a field delete/update).
  const key = readStringField(payload, 'key')
  const subject = key ? `"${entityId}.${key}"` : `"${entityId}"`
  const verb = operation === 'delete' ? 'removed' : 'changed'
  const byMachine = actorKind !== undefined && actorKind !== 'human'
  const because = byMachine
    ? `${subject} is part of the schema backbone the platform depends on and cannot be ${verb} ` +
      `by an automated actor (${actorKind}).`
    : `${subject} is part of the schema backbone the platform depends on and cannot be ${verb}.`
  return {
    status: 422,
    message:
      `${because} ` +
      "It is not the tenant's to restructure (CORE-BOUNDARY.md §2). " +
      'A superadmin may move it between tiers in the core-object setting if that is intended.',
  }
}

const structuralCoreGuard: MutationGuard = {
  id: 'entities.structural.core-object-guard',
  // `'*'` because it must see two `targetEntity` kinds (entity + field def); it
  // narrows to exactly those by `resourceKind` in `validate` (see
  // STRUCTURAL_RESOURCE_KINDS), so record writes are not judged by it.
  targetEntity: '*',
  operations: ['update', 'delete'],
  priority: 1,

  async validate(input) {
    // Narrow the wildcard to the definition writes only — never a record write.
    if (!STRUCTURAL_RESOURCE_KINDS.has(input.resourceKind)) return { ok: true }
    const refusal = structuralGuardRefusal(
      input.mutationPayload,
      input.operation,
      undefined,
      input.actorKind,
    )
    // No refusal → the surface is not protected; the grammar does not judge it yet
    // (see `structuralLevelDecision`'s doc-comment for why that is deliberate).
    if (!refusal) return { ok: true }

    // CC-37 — the refusal stands, but the grammar may *shape* it: an **explicit**
    // `review`/`approval` level on this (object, verb) turns the hard 422 into an
    // *escalation* (held for a person) — the escalate outcome D3 built, and this guard
    // is its first production emitter. `never`/`straight`/no-rule → the 422 as before.
    //
    // The level is read from the **live** setting so the wiring is reachable end to end
    // (a superadmin places a rule → the guard escalates), and it fails closed to the
    // seed on any store problem, so a failure can never loosen a protected surface.
    const settings = await loadStructuralSettingsForGuard(input.tenantId)
    const escalation = structuralLevelDecision(
      input.resourceKind,
      input.operation,
      true,
      input.actorKind,
      settings,
    )
    if (escalation) return { ok: true, escalation }
    return { ok: false, status: refusal.status, message: refusal.message }
  },
}

export const guards: MutationGuard[] = [
  reservedKeyGuard,
  keyShapeGuard,
  fieldPermissionDecisionGuard,
  entityPermissionDecisionGuard,
  structuralCoreGuard,
]
