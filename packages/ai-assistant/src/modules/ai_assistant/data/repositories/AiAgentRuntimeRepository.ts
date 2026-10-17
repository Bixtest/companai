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
  ): Promise<AiAgentRuntime> {
    if (!ctx?.tenantId) {
      throw new Error('AiAgentRuntimeRepository.register requires tenantId')
    }
    if (!input.daemonId?.trim()) {
      throw new Error('AiAgentRuntimeRepository.register requires daemonId')
    }
    if (!input.name?.trim()) {
      throw new Error('AiAgentRuntimeRepository.register requires name')
    }
    if (!isAiRuntimeEngine(input.provider)) {
      throw new AiAgentRuntimeProviderError(String(input.provider))
    }

    try {
      return await this.em.transactional(async (tx) => {
        const row = tx.create(AiAgentRuntime, {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId ?? null,
          daemonId: input.daemonId.trim(),
          name: input.name.trim(),
          provider: input.provider,
          metadata: input.metadata ?? {},
        } as unknown as AiAgentRuntime)
        await tx.persist(row).flush()
        return row
      })
    } catch (error) {
      const violation = classifyUniqueViolation(error)
      if (!violation) throw error
      throw new AiAgentRuntimeConflictError(
        violation.key,
        conflictMessage(violation.key, input),
        { constraint: violation.constraint, columns: violation.columns },
      )
    }
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
