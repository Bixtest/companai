import type { EntityManager } from '@mikro-orm/postgresql'
import type { AiAgentRuntime } from '../data/entities'
import {
  AiAgentRuntimeRepository,
  type AiAgentRuntimeContext,
} from '../data/repositories/AiAgentRuntimeRepository'

/**
 * `SR-02` — **the first reader of the agent's `runtime` binding.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The kernel `Agent` object has carried a `runtime` field since `AH-1`, described
 * as *"a binding name, not an embedded runtime"* (`ce.ts:128-136`) — and **nothing
 * read it**. Measured 2026-10-17: `AiAgentDefinition` (`ai-agent-definition.ts:290`)
 * has no `runtime` field at all, and no module in `ai_assistant` reads one. A
 * declared binding with no reader is not a control; it is a comment with a type.
 *
 * This module is the reader. It turns the binding string into the row it names,
 * and it refuses — loudly — in the two cases where a silent answer would be wrong.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TWO REFUSALS, AND WHY THEY ARE REFUSALS
 * ─────────────────────────────────────────────────────────────────────────────
 * **A named binding that resolves to nothing throws.** The alternative is falling
 * back to the environment default, and that is how an agent ends up served by a
 * machine nobody registered — with no error, and a log that looks healthy.
 *
 * **A tenant with more than one runtime and no binding throws.** Picking "the
 * first" is a coin flip that changes behaviour when a row is added. Until `SR-12`
 * makes one tenant ↔ one home a rule, an unbound tenant with two runtimes is a
 * question the system cannot answer, and saying so is better than guessing.
 *
 * `null` means exactly one thing: **this tenant has no runtime registered**, so the
 * caller keeps the behaviour it had before this table existed. That is what makes
 * the change byte-identical for every existing tenant.
 */

/** The tenant has no runtime registered. The caller keeps its pre-`SR-02` path. */
export const NO_TENANT_RUNTIME = null

/**
 * A binding was named and no live runtime answers to it.
 *
 * Deliberately not a fallback: the binding is a declaration by the operator, and
 * silently ignoring it would make `agent.runtime` advisory.
 */
export class AiAgentRuntimeBindingNotFoundError extends Error {
  override readonly name = 'AiAgentRuntimeBindingNotFoundError'
  constructor(
    readonly binding: string,
    readonly tenantId: string,
  ) {
    super(
      `No live runtime answers to the binding name "${binding}" in tenant "${tenantId}". ` +
        'Register it (ai_agent_runtimes) or correct the agent\'s "runtime" field — this is ' +
        'refused rather than falling back to the environment default, because a fallback would ' +
        'silently serve the agent from a machine nobody registered.',
    )
  }
}

/**
 * The tenant has several runtimes and the caller named none.
 *
 * One daemon per (tenant, provider) is allowed by `SR-02`; one **home** per tenant
 * is `SR-12`. Between the two, "which runtime serves this tenant" is answerable
 * only when there is one — so this refuses instead of choosing.
 */
export class AiAgentRuntimeAmbiguousError extends Error {
  override readonly name = 'AiAgentRuntimeAmbiguousError'
  constructor(
    readonly tenantId: string,
    readonly names: string[],
  ) {
    super(
      `Tenant "${tenantId}" has ${names.length} live runtimes (${names.join(', ')}) and the caller ` +
        'named no binding. Refusing to choose one: add the agent\'s "runtime" binding, or retire ' +
        'the extra runtimes (one tenant ↔ one engine home is SR-12).',
    )
  }
}

/**
 * The read seam. Structural rather than `Pick<AiAgentRuntimeRepository, …>` so a
 * test can supply rows it builds itself — the rules below are about *how many* and
 * *which* row, not about the entity's other columns.
 */
export interface TenantRuntimeReader<T extends { name: string }> {
  listActive(ctx: AiAgentRuntimeContext): Promise<T[]>
  findByBindingName(name: string, ctx: AiAgentRuntimeContext): Promise<T | null>
}

export interface ResolveTenantRuntimeDeps<T extends { name: string } = AiAgentRuntime> {
  /** The request-scoped EntityManager. Ignored when `repository` is supplied. */
  em?: EntityManager
  /**
   * The read seam. Supplied by tests so the resolution rules are proven without a
   * database; production omits it and the real repository is built from `em`.
   */
  repository?: TenantRuntimeReader<T>
  tenantId?: string | null
  organizationId?: string | null
  /** The kernel agent's `runtime` field. Empty/absent means "the tenant's runtime". */
  binding?: string | null
}

/**
 * Resolve the runtime that serves this tenant — or `null` when none is registered.
 *
 * @throws {AiAgentRuntimeBindingNotFoundError} a binding was named and matched nothing
 * @throws {AiAgentRuntimeAmbiguousError} several runtimes exist and none was named
 */
export async function resolveTenantRuntime<T extends { name: string } = AiAgentRuntime>(
  deps: ResolveTenantRuntimeDeps<T>,
): Promise<T | null> {
  const tenantId = deps.tenantId?.trim()
  // A tenant-less caller (an unauthenticated probe, a superadmin console) has no
  // runtime registry to consult; today's path is the correct one for it.
  if (!tenantId) return NO_TENANT_RUNTIME

  // One cast, and it is safe: the real repository returns `AiAgentRuntime`, which
  // satisfies `TenantRuntimeReader<AiAgentRuntime>`; the generic exists only so a
  // test can pass a lighter row shape.
  const repository: TenantRuntimeReader<T> =
    deps.repository ?? (buildRepository(deps.em) as unknown as TenantRuntimeReader<T>)
  const ctx = { tenantId, organizationId: deps.organizationId ?? null }

  const binding = deps.binding?.trim()
  if (binding) {
    const named = await repository.findByBindingName(binding, ctx)
    if (!named) throw new AiAgentRuntimeBindingNotFoundError(binding, tenantId)
    return named
  }

  const active = await repository.listActive(ctx)
  if (active.length === 0) return NO_TENANT_RUNTIME
  if (active.length === 1) return active[0]
  throw new AiAgentRuntimeAmbiguousError(
    tenantId,
    active.map((row) => row.name),
  )
}

function buildRepository(em: EntityManager | undefined): AiAgentRuntimeRepository {
  if (!em) {
    throw new Error(
      'resolveTenantRuntime needs an EntityManager (or a `repository` seam) to read ai_agent_runtimes',
    )
  }
  return new AiAgentRuntimeRepository(em)
}
