import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption, findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { AiAgentBinding } from '../entities'

export interface AiAgentBindingContext {
  tenantId: string
  organizationId?: string | null
  userId?: string | null
}

/**
 * A scope with no organization in it, on purpose.
 *
 * The per-agent and per-principal reads are organization-scoped because a
 * manage surface acts inside one organization. A **departure** is not: a person
 * leaves a tenant, and their bindings may sit in several organizations of it.
 * Passing this type instead of `AiAgentBindingContext` makes the wider scope a
 * decision the caller cannot make by forgetting a field (`CC-127`).
 */
export interface AiAgentTenantScope {
  tenantId: string
}

/** One binding the departure cascade revoked, as the write reported it. */
export interface AiAgentBindingRevoked {
  principalId: string
  agentId: string
  organizationId: string | null
}

export interface AiAgentBindingInput {
  principalId: string
  agentId: string
  toolAllowlist?: string[] | null
  requiredFeatures?: string[] | null
  notes?: string | null
}

/**
 * Agent ↔ AI-user binding repository (`CC-27`).
 *
 * One live binding per `(tenantId, organizationId, principalId, agentId)`.
 * `upsert()` replaces an existing row instead of inserting a duplicate (the
 * partial unique indexes in the entity make the model one-row-per-pair).
 * `revoke()` soft-deletes so the audit trail and the unique index survive.
 *
 * Reads always go through `findOneWithDecryption` / `findWithDecryption` to stay
 * consistent with the rest of the module, even though no column is encrypted
 * today.
 */
export class AiAgentBindingRepository {
  constructor(private readonly em: EntityManager) {}

  /**
   * Resolves the single live binding for a principal and agent within a scope.
   *
   * **This is the enforcement read** (`B2`): a `null` return means the AI worker
   * is NOT bound and the run must be refused. It is deliberately a strict
   * `(tenant, org, principal, agent)` lookup — no wildcard, no cross-tenant
   * fallback.
   */
  async findBinding(
    principalId: string,
    agentId: string,
    ctx: AiAgentBindingContext,
  ): Promise<AiAgentBinding | null> {
    if (!principalId || !agentId || !ctx?.tenantId) return null
    const row = await findOneWithDecryption<AiAgentBinding>(
      this.em,
      AiAgentBinding,
      {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        principalId,
        agentId,
        deletedAt: null,
      } as any,
      {},
      { tenantId: ctx.tenantId ?? null, organizationId: ctx.organizationId ?? null },
    )
    return row ?? null
  }

  /** Lists the live bindings for one principal (the manage surface read). */
  async listForPrincipal(
    principalId: string,
    ctx: AiAgentBindingContext,
  ): Promise<AiAgentBinding[]> {
    if (!principalId || !ctx?.tenantId) return []
    return findWithDecryption<AiAgentBinding>(
      this.em,
      AiAgentBinding,
      {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        principalId,
        deletedAt: null,
      } as any,
      { orderBy: { agentId: 'ASC' } },
      { tenantId: ctx.tenantId ?? null, organizationId: ctx.organizationId ?? null },
    )
  }

  /** Lists the live bindings for one agent (the per-agent manage surface read). */
  async listForAgent(
    agentId: string,
    ctx: AiAgentBindingContext,
  ): Promise<AiAgentBinding[]> {
    if (!agentId || !ctx?.tenantId) return []
    return findWithDecryption<AiAgentBinding>(
      this.em,
      AiAgentBinding,
      {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        agentId,
        deletedAt: null,
      } as any,
      { orderBy: { principalId: 'ASC' } },
      { tenantId: ctx.tenantId ?? null, organizationId: ctx.organizationId ?? null },
    )
  }

  /**
   * Lists the live bindings for several principals **across the whole tenant**
   * (`CC-127`).
   *
   * Deliberately not `listForPrincipal` in a loop: that one narrows to
   * `organizationId: ctx.organizationId ?? null`, so a departure preview built
   * on it would silently omit every binding the person holds in another
   * organization of the same tenant — and the admin would be shown a shorter
   * list than the cascade later acts on.
   */
  async listForPrincipals(
    principalIds: string[],
    scope: AiAgentTenantScope,
  ): Promise<AiAgentBinding[]> {
    const ids = normalizeIdList(principalIds)
    if (!ids.length || !scope?.tenantId) return []
    return findWithDecryption<AiAgentBinding>(
      this.em,
      AiAgentBinding,
      {
        tenantId: scope.tenantId,
        principalId: { $in: ids },
        deletedAt: null,
      } as any,
      { orderBy: { agentId: 'ASC' } },
      { tenantId: scope.tenantId, organizationId: null },
    )
  }

  /**
   * Creates or replaces the live binding for `(principalId, agentId)`.
   *
   * A soft-deleted prior row is revived rather than duplicated, so the partial
   * unique index never trips on re-binding.
   */
  async upsert(
    input: AiAgentBindingInput,
    ctx: AiAgentBindingContext,
  ): Promise<AiAgentBinding> {
    if (!ctx?.tenantId) {
      throw new Error('AiAgentBindingRepository.upsert requires tenantId')
    }
    if (!input?.principalId) {
      throw new Error('AiAgentBindingRepository.upsert requires principalId')
    }
    if (!input?.agentId) {
      throw new Error('AiAgentBindingRepository.upsert requires agentId')
    }
    const toolAllowlist = normalizeStringList(input.toolAllowlist)
    const requiredFeatures = normalizeStringList(input.requiredFeatures)
    const notes = normalizeNotes(input.notes)

    return this.em.transactional(async (tx) => {
      const existing = await tx.findOne(AiAgentBinding, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        principalId: input.principalId,
        agentId: input.agentId,
      } as any)
      if (existing) {
        existing.toolAllowlist = toolAllowlist
        existing.requiredFeatures = requiredFeatures
        existing.notes = notes
        existing.deletedAt = null
        existing.createdByUserId = ctx.userId ?? existing.createdByUserId ?? null
        existing.updatedAt = new Date()
        await tx.persist(existing).flush()
        return existing
      }
      const row = tx.create(AiAgentBinding, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        principalId: input.principalId,
        agentId: input.agentId,
        toolAllowlist,
        requiredFeatures,
        notes,
        createdByUserId: ctx.userId ?? null,
      } as unknown as AiAgentBinding)
      await tx.persist(row).flush()
      return row
    })
  }

  /** Soft-deletes the binding for `(principalId, agentId)`. Returns whether a row was revoked. */
  async revoke(
    principalId: string,
    agentId: string,
    ctx: AiAgentBindingContext,
  ): Promise<boolean> {
    if (!principalId || !agentId || !ctx?.tenantId) return false
    return this.em.transactional(async (tx) => {
      const existing = await tx.findOne(AiAgentBinding, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        principalId,
        agentId,
        deletedAt: null,
      } as any)
      if (!existing) return false
      existing.deletedAt = new Date()
      existing.updatedAt = new Date()
      await tx.persist(existing).flush()
      return true
    })
  }

  /**
   * Soft-deletes every live binding held by these principals, tenant-wide
   * (`CC-127`).
   *
   * The departure cascade's write. Two things differ from `revoke` above, both
   * on purpose:
   *
   * - **no organization filter.** `revoke` narrows to
   *   `organizationId: ctx.organizationId ?? null`, which is right for a
   *   per-agent manage route acting inside one organization and wrong for a
   *   person leaving a tenant: the bindings they hold in a second organization
   *   would survive a call that reported success.
   * - **it returns the rows it changed**, not a boolean. A receipt has to name
   *   what was revoked; a count cannot, and a preview list is a read taken
   *   before the write.
   *
   * Idempotent: already-revoked rows are not live, so they are not selected and
   * not reported. The caller derives "already revoked" from what it listed
   * minus what this returned.
   */
  async revokeForPrincipals(
    principalIds: string[],
    scope: AiAgentTenantScope,
  ): Promise<AiAgentBindingRevoked[]> {
    const ids = normalizeIdList(principalIds)
    if (!ids.length || !scope?.tenantId) return []
    return this.em.transactional(async (tx) => {
      const rows = await tx.find(AiAgentBinding, {
        tenantId: scope.tenantId,
        principalId: { $in: ids },
        deletedAt: null,
      } as any)
      if (!rows.length) return []
      const now = new Date()
      for (const row of rows) {
        row.deletedAt = now
        row.updatedAt = now
      }
      await tx.persist(rows).flush()
      return rows.map((row) => ({
        principalId: row.principalId,
        agentId: row.agentId,
        organizationId: row.organizationId ?? null,
      }))
    })
  }
}

function normalizeIdList(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) return []
  return Array.from(
    new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)),
  )
}

function normalizeStringList(values: string[] | null | undefined): string[] | null {
  if (values == null) return null
  if (!Array.isArray(values)) return null
  const cleaned = Array.from(
    new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)),
  )
  return cleaned.length > 0 ? cleaned : null
}

function normalizeNotes(notes: string | null | undefined): string | null {
  if (typeof notes !== 'string') return null
  const trimmed = notes.trim()
  if (!trimmed) return null
  return notes
}

export default AiAgentBindingRepository
