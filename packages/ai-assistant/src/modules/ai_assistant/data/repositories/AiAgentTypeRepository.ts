import type { EntityManager } from '@mikro-orm/postgresql'
import { findOneWithDecryption, findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { AiAgentType } from '../entities'

export interface AiAgentTypeContext {
  tenantId: string
}

export interface AiAgentTypeInput {
  key: string
  bundle: Record<string, unknown>
}

/**
 * The refusal a **caller** maps to 409: this tenant already holds this key, in
 * any status. The unique index is over ALL rows, so a retired key is never
 * reusable — a binding written for the old definition can never silently
 * re-point at a new one. Carried as a typed error rather than a null return
 * so a create and a "not found" cannot be confused at the route.
 */
export class AiAgentTypeKeyCollisionError extends Error {
  constructor(readonly key: string) {
    super(`Agent type key "${key}" is already taken in this tenant`)
    this.name = 'AiAgentTypeKeyCollisionError'
  }
}

/**
 * Tenant-created agent type repository (`CC-126`).
 *
 * The data layer of the type catalogue: the platform ships types as code
 * (`AiAgentDefinition`, the generated registry) and a tenant authors one
 * here. One row per `(tenant, key)` **for all time** — the unique index
 * covers active and retired rows alike, which is why there is no `upsert`:
 * `create` refuses a taken key, `update` edits the live row, `retire` is the
 * one-way door.
 *
 * **Every read and write requires `ctx.tenantId`; there is no wildcard, no
 * cross-tenant fallback and no nullable variant** — `tenant_id IS NULL`
 * meaning "platform level" is the sentinel `CC-126` refuses by name (the
 * `CC-103` class: a value every query must remember to exclude). The
 * platform layer needs no row; the code registry already is that layer.
 *
 * `update` bumps `version` in place. Version history as new rows is
 * impossible by construction here: the `(tenant, key)` index admits one row
 * per key ever. The version is pinned by each instance (`CC-122`), which is
 * that row's debt, not this one's.
 *
 * Reads go through `findOneWithDecryption` / `findWithDecryption` for
 * consistency with the rest of the module, even though no column is
 * encrypted.
 */
export class AiAgentTypeRepository {
  constructor(private readonly em: EntityManager) {}

  /**
   * The **resolution read**: the definition a run resolves for a key. A
   * retired row resolves to nothing — retirement is one-way and absolute.
   */
  async findActiveByKey(key: string, ctx: AiAgentTypeContext): Promise<AiAgentType | null> {
    if (!key || !ctx?.tenantId) return null
    const row = await findOneWithDecryption<AiAgentType>(
      this.em,
      AiAgentType,
      { tenantId: ctx.tenantId, key, status: 'active' } as any,
      {},
      { tenantId: ctx.tenantId },
    )
    return row ?? null
  }

  /**
   * The **manage-surface read**: the row whatever its status. A retired row
   * is the tombstone that explains why its key is unavailable, so the manage
   * surface can show it.
   */
  async findByKey(key: string, ctx: AiAgentTypeContext): Promise<AiAgentType | null> {
    if (!key || !ctx?.tenantId) return null
    const row = await findOneWithDecryption<AiAgentType>(
      this.em,
      AiAgentType,
      { tenantId: ctx.tenantId, key } as any,
      {},
      { tenantId: ctx.tenantId },
    )
    return row ?? null
  }

  /**
   * Lists the tenant's **live** types — the runtime catalogue read. Tombstones
   * are excluded: a retired type resolves to nothing, so showing it in the
   * picker would be the `CC-101` shape. The manage surface uses {@link list}
   * and shows them.
   */
  async listActive(ctx: AiAgentTypeContext): Promise<AiAgentType[]> {
    if (!ctx?.tenantId) return []
    return findWithDecryption<AiAgentType>(
      this.em,
      AiAgentType,
      { tenantId: ctx.tenantId, status: 'active' } as any,
      { orderBy: { key: 'ASC' } },
      { tenantId: ctx.tenantId },
    )
  }

  /** Lists the tenant's types, tombstone included, for the manage surface. */
  async list(ctx: AiAgentTypeContext): Promise<AiAgentType[]> {
    if (!ctx?.tenantId) return []
    return findWithDecryption<AiAgentType>(
      this.em,
      AiAgentType,
      { tenantId: ctx.tenantId } as any,
      { orderBy: { key: 'ASC' } },
      { tenantId: ctx.tenantId },
    )
  }

  /**
   * Creates the type. A key this tenant already holds — active OR retired —
   * is refused with {@link AiAgentTypeKeyCollisionError}. The unique index
   * remains the backstop: a race between two creates is closed by the
   * database, not by this check.
   *
   * The collision against a **code-declared** agent id is NOT checked here —
   * the data layer must not import the code registry, and the guarantee does
   * not live at the write anyway: resolution is code-first
   * (`lib/agent-type-catalog.ts`), so a tenant-authored definition can never
   * run under a platform-claimed key even if this write were allowed through.
   * The route performs the loud half against the loaded registry.
   */
  async create(input: AiAgentTypeInput, ctx: AiAgentTypeContext): Promise<AiAgentType> {
    if (!ctx?.tenantId) {
      throw new Error('AiAgentTypeRepository.create requires tenantId')
    }
    if (!input?.key) {
      throw new Error('AiAgentTypeRepository.create requires key')
    }
    return this.em.transactional(async (tx) => {
      const existing = await tx.findOne(AiAgentType, {
        tenantId: ctx.tenantId,
        key: input.key,
      } as any)
      if (existing) {
        throw new AiAgentTypeKeyCollisionError(input.key)
      }
      const row = tx.create(AiAgentType, {
        tenantId: ctx.tenantId,
        key: input.key,
        bundle: input.bundle,
        version: 1,
        status: 'active',
      } as unknown as AiAgentType)
      await tx.persist(row).flush()
      return row
    })
  }

  /**
   * Edits the live row's bundle and bumps `version`. A retired row is not
   * editable — retirement is one-way. Returns `null` when there is no live
   * row for the key, so a caller cannot distinguish "retired" from "never
   * existed" unless it asks {@link findByKey} first.
   */
  async update(
    key: string,
    input: { bundle: Record<string, unknown> },
    ctx: AiAgentTypeContext,
  ): Promise<AiAgentType | null> {
    if (!key || !ctx?.tenantId) return null
    return this.em.transactional(async (tx) => {
      const existing = await tx.findOne(AiAgentType, {
        tenantId: ctx.tenantId,
        key,
        status: 'active',
      } as any)
      if (!existing) return null
      existing.bundle = input.bundle
      existing.version = existing.version + 1
      existing.updatedAt = new Date()
      await tx.persist(existing).flush()
      return existing
    })
  }

  /**
   * Retires the type. One-way: the key is never reusable, so a binding
   * written for this definition resolves to nothing from here on rather
   * than silently re-pointing. Returns whether a live row was retired.
   */
  async retire(key: string, ctx: AiAgentTypeContext): Promise<boolean> {
    if (!key || !ctx?.tenantId) return false
    return this.em.transactional(async (tx) => {
      const existing = await tx.findOne(AiAgentType, {
        tenantId: ctx.tenantId,
        key,
        status: 'active',
      } as any)
      if (!existing) return false
      existing.status = 'retired'
      existing.updatedAt = new Date()
      await tx.persist(existing).flush()
      return true
    })
  }
}

export default AiAgentTypeRepository
