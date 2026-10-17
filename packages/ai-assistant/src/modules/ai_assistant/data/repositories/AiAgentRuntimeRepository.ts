import type { EntityManager, FilterQuery } from '@mikro-orm/postgresql'
import { AiAgentRuntime } from '../entities'
import { AI_RUNTIME_ENGINES, isAiRuntimeEngine, type AiRuntimeEngine } from '../../lib/ai-runtime-engines'

/**
 * `SR-02` — the repository for **the machine** (`ai_agent_runtimes`).
 *
 * The table's unique indexes are the primitive: a second registration of the same
 * daemon+provider, or a second runtime under the same binding name, is refused by
 * Postgres, not by a check here. This class does **not** pre-check with a SELECT —
 * a read-then-write race is exactly the bug a unique index exists to make
 * impossible. It lets the insert fail and translates the failure.
 *
 * The translation is the part worth reading: "duplicate key value violates unique
 * constraint" tells an operator nothing, and the two keys that can collide mean
 * completely different fixes. `AiAgentRuntimeConflictError.key` says which one.
 */

/** Which uniqueness key a registration collided with. */
export type AiAgentRuntimeConflictKey = 'daemon-provider' | 'name' | 'unknown'

/**
 * A registration was refused because it would break one of the two identity keys.
 *
 * `key` is the actionable part:
 * - `daemon-provider` — that daemon already hosts a runtime for that provider in
 *   this tenant. Reuse the existing row, or retire it first.
 * - `name` — another live runtime already answers to that binding name. The
 *   agent's `runtime` text field could not resolve unambiguously.
 */
export class AiAgentRuntimeConflictError extends Error {
  override readonly name = 'AiAgentRuntimeConflictError'
  constructor(
    readonly key: AiAgentRuntimeConflictKey,
    message: string,
    readonly detail?: { constraint?: string; columns?: string[] },
  ) {
    super(message)
  }
}

/**
 * A provider outside the engine vocabulary was refused **before** the insert.
 *
 * This is the one validation that is not a database constraint, on purpose: the
 * vocabulary is a TypeScript type that grows (`AiRuntimeEngine`), and a CHECK
 * constraint would couple the schema to it (see the migration's header). Validating
 * at the boundary keeps the vocabulary in one place and still refuses the write.
 */
export class AiAgentRuntimeProviderError extends Error {
  override readonly name = 'AiAgentRuntimeProviderError'
  constructor(readonly provider: string) {
    super(
      `Unknown runtime provider "${provider}" — accepted: ${AI_RUNTIME_ENGINES.join(', ')}. ` +
        'The provider names an engine; add it to AI_RUNTIME_ENGINES rather than writing it here.',
    )
  }
}

/**
 * A binding name resolves to more than one live runtime the caller can see.
 *
 * `CC-102` made this reachable: an org-scoped caller now sees its own rows **and**
 * the tenant-level ones, and the two partial unique indexes allow a tenant-level
 * `primary` and an org-level `primary` to coexist legally. Returning either would
 * be the silent choice `resolveTenantRuntime` refuses, so the read refuses too.
 */
export class AiAgentRuntimeAmbiguousNameError extends Error {
  override readonly name = 'AiAgentRuntimeAmbiguousNameError'
  constructor(
    readonly tenantId: string,
    readonly binding: string,
    readonly runtimeIds: string[],
  ) {
    super(
      `The binding name "${binding}" matches ${runtimeIds.length} live runtimes in tenant ` +
        `"${tenantId}" (${runtimeIds.join(', ')}). Refusing to choose one: retire the duplicate, ` +
        'or give the organization-level runtime its own name.',
    )
  }
}

/**
 * The rows a caller may see: its own organization's **and** the tenant-level ones.
 *
 * The house nullable-`org_id` rule. A caller with no organization sees only the
 * tenant-level rows — the scope it actually acts in.
 *
 * Typed as a concrete union rather than `FilterQuery` so it can be **spread** into
 * the surrounding filter; `FilterQuery` is an intersection type and TypeScript
 * refuses to spread it (`TS2698`).
 */
type OrganizationScope =
  | { organizationId: null }
  | { $or: Array<{ organizationId: string } | { organizationId: null }> }

function organizationScope(ctx: AiAgentRuntimeContext): OrganizationScope {
  if (!ctx.organizationId) return { organizationId: null }
  return {
    $or: [{ organizationId: ctx.organizationId }, { organizationId: null }],
  }
}

/**
 * `CC-102` — `daemon_id` is an identity, so a hostname is refused.
 *
 * The donor moved this column from `os.Hostname()` to a persistent daemon UUID
 * (`048_runtime_daemon_uuid.up.sql:1-6`). Ours was free text, so a machine that
 * changed its hostname registered a **second** live row, and the tenant then had
 * two runtimes with no binding — a permanent `AiAgentRuntimeAmbiguousError` that
 * nobody could resolve without a database edit. Requiring a uuid does not by
 * itself keep the id stable across reboots (that is the daemon's job), but it
 * removes the most common way it changed, and it makes the requirement explicit
 * at the boundary rather than in a comment.
 */
export class AiAgentRuntimeDaemonIdError extends Error {
  override readonly name = 'AiAgentRuntimeDaemonIdError'
  constructor(readonly daemonId: string) {
    super(
      `Daemon id "${daemonId}" is not a uuid. The daemon id is this runtime's IDENTITY — a ` +
        'hostname changes when a machine is renamed and would register a second live runtime. ' +
        'Persist a generated uuid on the daemon and pass that.',
    )
  }
}

/** RFC 4122 shape, version-agnostic: the id is an opaque key, not a semantic value. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AiAgentRuntimeContext {
  tenantId: string
  organizationId?: string | null
}

export interface RegisterAiAgentRuntimeInput {
  /** The identity of the process/host that can execute. Required, never inferred. */
  daemonId: string
  /** The binding key the kernel agent's `runtime` field names. */
  name: string
  /** The engine this runtime hosts. Validated against `AI_RUNTIME_ENGINES`. */
  provider: AiRuntimeEngine | string
  metadata?: Record<string, unknown>
}

/**
 * Map a Postgres unique violation onto the key that caused it.
 *
 * Reads the driver error through MikroORM's wrapper (`UniqueConstraintViolation
 * Exception` carries the original as `cause`), so both shapes work: a raw driver
 * error with `code`/`constraint`/`detail`, and the ORM exception around it.
 *
 * Returns `null` when the error is not a unique violation — callers rethrow those.
 */
export function classifyUniqueViolation(
  error: unknown,
): { key: AiAgentRuntimeConflictKey; constraint?: string; columns?: string[] } | null {
  const info = readPostgresError(error)
  if (!info || info.code !== '23505') return null

  const constraint = info.constraint
  const columns = parseDetailColumns(info.detail)

  // The index name is the precise answer when the driver reports it.
  if (constraint) {
    if (constraint.includes('daemon_provider')) {
      return { key: 'daemon-provider', constraint, columns }
    }
    if (constraint.includes('name')) {
      return { key: 'name', constraint, columns }
    }
  }

  // Fall back to the column list Postgres puts in `detail`:
  // `Key (tenant_id, organization_id, daemon_id, provider)=(…) already exists.`
  // `daemon_id` is the discriminator — `name` never appears beside it in a key.
  if (columns) {
    if (columns.includes('daemon_id')) return { key: 'daemon-provider', columns }
    if (columns.includes('name')) return { key: 'name', columns }
  }

  return { key: 'unknown', constraint, columns }
}

interface PostgresErrorInfo {
  code?: string
  constraint?: string
  detail?: string
  message?: string
}

/** Walk `error` and its `cause` chain (bounded) for the driver's fields. */
function readPostgresError(error: unknown): PostgresErrorInfo | null {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current === 'object') {
      const candidate = current as PostgresErrorInfo & { cause?: unknown }
      if (candidate.code || candidate.constraint || candidate.detail) {
        return {
          code: candidate.code,
          constraint: candidate.constraint,
          detail: candidate.detail,
          message: candidate.message,
        }
      }
      current = candidate.cause
      continue
    }
    break
  }
  // Some ORM wrappers keep only the message; the index name still appears in it.
  const message = error instanceof Error ? error.message : ''
  const named = message.match(/"([a-z_]+_uq)"/)
  if (/duplicate key value|unique constraint/i.test(message)) {
    return { code: '23505', constraint: named?.[1], message }
  }
  return null
}

/** `Key (a, b)=(…) already exists.` → `['a', 'b']`. */
function parseDetailColumns(detail: string | undefined): string[] | undefined {
  if (!detail) return undefined
  const match = detail.match(/Key \(([^)]+)\)=/)
  if (!match) return undefined
  return match[1]
    .split(',')
    .map((column) => column.trim())
    .filter((column) => column.length > 0)
}

export class AiAgentRuntimeRepository {
  constructor(private readonly em: EntityManager) {}

  /**
   * Every live runtime the caller can see, oldest first.
   *
   * ★ `CC-102` — an org-scoped caller must also see the **tenant-level** row.
   * The filter used to match `organization_id` exactly, so a runtime registered
   * with no organization (the tenant's own machine) was invisible to every caller
   * inside an organization — and an empty result is not "no answer" here: it sends
   * `resolve-ai-runtime-port` to the deployment-wide environment default, which is
   * the fallback the registry's own docblock forbids (*"Deliberately not a
   * fallback"*). The house rule is the nullable-`org_id` one: a tenant-level row
   * belongs to the whole tenant.
   */
  async listActive(ctx: AiAgentRuntimeContext): Promise<AiAgentRuntime[]> {
    if (!ctx?.tenantId) return []
    return this.em.find(
      AiAgentRuntime,
      {
        tenantId: ctx.tenantId,
        ...organizationScope(ctx),
        deletedAt: null,
      } satisfies FilterQuery<AiAgentRuntime>,
      { orderBy: { createdAt: 'ASC' } },
    )
  }

  /**
   * Resolve the binding name the kernel agent's `runtime` field carries.
   *
   * `null` when no live runtime answers to that name — and the caller **must**
   * treat that as a refusal, not as "use the default". A silent fallback is how an
   * agent ends up on a machine nobody registered.
   *
   * ★ `CC-102` — widened like `listActive`, which makes **two** visible rows
   * possible: a tenant-level `primary` and an org-level `primary` are both legal
   * under the two partial unique indexes. Returning the first one would be the
   * silent choice this module exists to refuse, so more than one match throws.
   */
  async findByBindingName(
    name: string,
    ctx: AiAgentRuntimeContext,
  ): Promise<AiAgentRuntime | null> {
    if (!ctx?.tenantId || !name) return null
    const rows = await this.em.find(AiAgentRuntime, {
      tenantId: ctx.tenantId,
      ...organizationScope(ctx),
      name,
      deletedAt: null,
    } satisfies FilterQuery<AiAgentRuntime>)
    if (rows.length === 0) return null
    if (rows.length === 1) return rows[0]
    throw new AiAgentRuntimeAmbiguousNameError(
      ctx.tenantId,
      name,
      rows.map((row) => row.id),
    )
  }

  /**
   * Register a runtime. The unique indexes decide whether it is legal; this method
   * only translates the refusal.
   *
   * No read-then-write pre-check: two concurrent registrations of one daemon would
   * both pass a SELECT and one would still fail the INSERT — so the constraint is
   * the authority and the SELECT would only add a race window.
   */
  async register(
    input: RegisterAiAgentRuntimeInput,
    ctx: AiAgentRuntimeContext,
  ): Promise<{ row: AiAgentRuntime; inserted: boolean }> {
    if (!ctx?.tenantId) {
      throw new Error('AiAgentRuntimeRepository.register requires tenantId')
    }
    const daemonId = input.daemonId?.trim() ?? ''
    if (!daemonId) {
      throw new Error('AiAgentRuntimeRepository.register requires daemonId')
    }
    // `CC-102` — an identity, not a label. See AiAgentRuntimeDaemonIdError.
    if (!UUID_RE.test(daemonId)) {
      throw new AiAgentRuntimeDaemonIdError(daemonId)
    }
    if (!input.name?.trim()) {
      throw new Error('AiAgentRuntimeRepository.register requires name')
    }
    if (!isAiRuntimeEngine(input.provider)) {
      throw new AiAgentRuntimeProviderError(String(input.provider))
    }

    const organizationId = ctx.organizationId ?? null
    // ★ CC-102 — the upsert, harvested from the donor
    // (`multica-main/server/pkg/db/queries/runtime.sql:63-93`). Two differences
    // from a naive `ON CONFLICT (cols)`:
    //
    //   1. the conflict target must SPELL THE PARTIAL INDEX'S PREDICATE, or
    //      Postgres cannot infer which index arbitrates and the statement fails;
    //   2. `(xmax = 0)` distinguishes a fresh insert from an update, which is the
    //      only signal that a machine appeared rather than rebooted.
    //
    // A reboot used to THROW `AiAgentRuntimeConflictError`, so the one thing a
    // runtime does on every start — register itself — failed on the second start.
    const conflictTarget = organizationId
      ? 'on conflict (tenant_id, organization_id, daemon_id, provider) where organization_id is not null and deleted_at is null'
      : 'on conflict (tenant_id, daemon_id, provider) where organization_id is null and deleted_at is null'

    try {
      return await this.em.transactional(async (tx) => {
        // `created_at`/`updated_at` are supplied HERE and not left to the entity's
        // `onCreate` default: that default is ORM-level and never runs on this
        // path. Both columns are NOT NULL with no database default, so a raw
        // INSERT that omits them is refused by Postgres — which is exactly what
        // the throwaway-database proof of this migration found, and why the test
        // below asserts the column list rather than trusting the fake.
        const rows = (await tx.getConnection().execute(
          `insert into ai_agent_runtimes
             (tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?::jsonb, now(), now(), now())
           ${conflictTarget}
           do update set
             name = excluded.name,
             metadata = excluded.metadata,
             last_seen_at = now(),
             updated_at = now()
           returning id, (xmax = 0) as inserted`,
          [
            ctx.tenantId,
            organizationId,
            daemonId,
            input.name.trim(),
            input.provider,
            JSON.stringify(input.metadata ?? {}),
          ],
        )) as Array<{ id: string; inserted: boolean }>

        const first = rows[0]
        if (!first) {
          throw new Error('ai_agent_runtimes upsert returned no row')
        }
        const row = await tx.findOne(AiAgentRuntime, { id: first.id } as FilterQuery<AiAgentRuntime>)
        if (!row) {
          throw new Error(`ai_agent_runtimes row ${first.id} vanished inside the upsert transaction`)
        }
        return { row, inserted: Boolean(first.inserted) }
      })
    } catch (error) {
      // The identity tuple is now an upsert; the NAME index is not part of it and
      // must still refuse, so the translation stays.
      const violation = classifyUniqueViolation(error)
      if (!violation) throw error
      throw new AiAgentRuntimeConflictError(
        violation.key,
        conflictMessage(violation.key, input),
        { constraint: violation.constraint, columns: violation.columns },
      )
    }
  }

  /**
   * `CC-102` — retire a runtime. Idempotent: `false` means it was already retired
   * or is not visible to this caller, which is an answer rather than an error.
   *
   * The scope is the same one the reads use (`organizationScope`), so a caller can
   * only retire a row it can see. No cascade fires: our agents bind to a runtime by
   * **text**, so there is no foreign key to unbind — the donor's whole
   * `251_agent_runtime_unbind` machinery exists because its agents have one. What
   * remains here is a stale pointer, and that fails closed as
   * `AiAgentRuntimeBindingNotFoundError` on the next resolve.
   */
  async retire(id: string, ctx: AiAgentRuntimeContext): Promise<boolean> {
    if (!ctx?.tenantId) {
      throw new Error('AiAgentRuntimeRepository.retire requires tenantId')
    }
    const rows = (await this.em.getConnection().execute(
      `update ai_agent_runtimes
          set deleted_at = now(), updated_at = now()
        where id = ?
          and tenant_id = ?
          and (organization_id is not distinct from ? or organization_id is null)
          and deleted_at is null
        returning id`,
      [id, ctx.tenantId, ctx.organizationId ?? null],
    )) as Array<{ id: string }>
    return rows.length > 0
  }

  /**
   * `CC-102` — record a heartbeat. Returns whether a live, visible row was touched.
   *
   * Deliberately updates `last_seen_at` and **nothing else** — not `updated_at`
   * (`multica-main/server/pkg/db/queries/runtime.sql:178-186`): keeping that column
   * clean keeps the row HOT-eligible and stops every `updated_at` watcher firing on
   * a heartbeat. The donor's `status = 'online'` predicate has no analogue here
   * because we have no `status` column — refused on purpose, see the entity.
   *
   * The affected-row answer is how a caller learns the row was retired between its
   * read and this write.
   */
  async touch(id: string, ctx: AiAgentRuntimeContext): Promise<boolean> {
    if (!ctx?.tenantId) {
      throw new Error('AiAgentRuntimeRepository.touch requires tenantId')
    }
    const rows = (await this.em.getConnection().execute(
      `update ai_agent_runtimes
          set last_seen_at = now()
        where id = ?
          and tenant_id = ?
          and (organization_id is not distinct from ? or organization_id is null)
          and deleted_at is null
        returning id`,
      [id, ctx.tenantId, ctx.organizationId ?? null],
    )) as Array<{ id: string }>
    return rows.length > 0
  }
}

function conflictMessage(key: AiAgentRuntimeConflictKey, input: RegisterAiAgentRuntimeInput): string {
  if (key === 'daemon-provider') {
    return (
      `Daemon "${input.daemonId}" already hosts a runtime for provider "${input.provider}" ` +
      'in this tenant. One daemon serves one runtime per provider — reuse the existing row, ' +
      'or retire it before registering a replacement.'
    )
  }
  if (key === 'name') {
    return (
      `A live runtime already answers to the binding name "${input.name}". The kernel agent's ` +
      '"runtime" field resolves by name, so two rows with one name would make that resolution ' +
      'ambiguous. Choose a different name, or retire the existing runtime first.'
    )
  }
  return (
    `Registration refused by a uniqueness constraint on ai_agent_runtimes ` +
    `(daemon "${input.daemonId}", provider "${input.provider}", name "${input.name}").`
  )
}

export default AiAgentRuntimeRepository
