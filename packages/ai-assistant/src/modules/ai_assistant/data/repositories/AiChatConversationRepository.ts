import type { EntityManager, FilterQuery } from '@mikro-orm/postgresql'
import {
  findOneWithDecryption,
  findWithDecryption,
} from '@open-mercato/shared/lib/encryption/find'
import { Organization } from '@open-mercato/core/modules/directory/data/entities'
import {
  AiChatConversation,
  AiChatConversationParticipant,
  AiChatMessage,
} from '../entities'
import type {
  AiChatMessageAppendInput,
  AiChatPageContextInput,
} from '../validators'

/**
 * Persistent store for AI chat conversations, participants, and messages.
 *
 * Owner-first MVP per spec
 * `2026-05-05-ai-chat-server-side-conversation-storage`. Every read/write
 * goes through `findOneWithDecryption` / `findWithDecryption` so the repo
 * stays consistent with the rest of the module and is GDPR-encryption-ready
 * without a second refactor when `content` / `ui_parts` columns are
 * eventually flagged.
 *
 * Tenant + organization scope is required on every method. View-only callers
 * are owner-scoped. Callers with `ai_assistant.conversations.manage` may
 * list/read/update/delete any conversation in the same tenant/org, but never
 * outside that boundary. The participant row is written transactionally
 * alongside conversation create/import.
 *
 */

export interface AiChatConversationContext {
  tenantId: string
  organizationId?: string | null
  userId: string
  /**
   * `CC-107` — the caller's machine axis, when the caller IS an agent. A human
   * has none. Present so the access predicate can consult the agent axis
   * instead of only the human one; an agent caller still carries the person it
   * acts for in `userId` (see `effectiveUserId`).
   */
  agentId?: string | null
  canManageConversations?: boolean
}

export interface AiChatConversationCreateOrGetInput {
  conversationId?: string | null
  agentId: string
  title?: string | null
  pageContext?: AiChatPageContextInput | null
  /** Marks the conversation as imported from local storage (sets `importedFromLocalAt`). */
  importedFromLocal?: boolean
  /** Optional explicit `now` for deterministic tests. */
  now?: Date
}

export interface AiChatConversationListOptions {
  agentId?: string | null
  status?: 'open' | 'closed' | null
  limit?: number
  cursor?: string | null
}

export interface AiChatConversationUpdateInput {
  title?: string | null
  status?: 'open' | 'closed'
  pageContext?: AiChatPageContextInput | null
  /** Optional explicit `now` for deterministic tests. */
  now?: Date
}

export interface AiChatTranscriptOptions {
  limit?: number
  /** ISO timestamp string; rows strictly older than this are returned. */
  before?: string | null
}

export interface AiChatTranscriptResult {
  conversation: AiChatConversation
  messages: AiChatMessage[]
  nextCursor: string | null
}

export interface AiChatMessageAppendOptions {
  /** Override the message timestamp (used to thread server-injected stream-completion turns). */
  createdAt?: Date
  /** Override `createdByUserId` (defaults to the calling context user). */
  createdByUserId?: string | null
}

export interface AiChatConversationImportResult {
  conversation: AiChatConversation
  importedMessageCount: number
  skippedMessageCount: number
}

const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 100
const DEFAULT_TRANSCRIPT_LIMIT = 100
const MAX_TRANSCRIPT_LIMIT = 200

export class AiChatConversationAccessError extends Error {
  override readonly name = 'AiChatConversationAccessError'
  constructor(message: string = 'Conversation is not accessible to the caller.') {
    super(message)
  }
}

export class AiChatConversationDuplicateParticipantError extends Error {
  override readonly name = 'AiChatConversationDuplicateParticipantError'
  constructor(message: string = 'User is already an active participant in this conversation.') {
    super(message)
  }
}

export class AiChatParticipantNotFoundError extends Error {
  override readonly name = 'AiChatParticipantNotFoundError'
  constructor(message: string = 'Participant not found or already revoked.') {
    super(message)
  }
}

export class AiChatConversationOrgNotFoundError extends Error {
  override readonly name = 'AiChatConversationOrgNotFoundError'
  constructor(message: string = 'Organization does not exist or is inactive for this tenant.') {
    super(message)
  }
}

/**
 * `CC-107` — **a participant's identity: exactly one of two axes.**
 *
 * A discriminated union rather than `(userId?, agentId?)`, so a caller cannot
 * pass both or neither without the compiler noticing. The repository normalises
 * and re-checks it, because the database constraint
 * (`ai_chat_conv_participants_one_identity_ck`) is `NOT VALID` by design and so
 * protects new writes only where the application enforces it too.
 */
export type AiChatConversationParticipantIdentity =
  | { userId: string; agentId?: never; agentOwnerUserId?: never }
  | { agentId: string; agentOwnerUserId: string; userId?: never }

/** A participant identity that failed the "exactly one axis" rule. */
export class AiChatConversationParticipantIdentityError extends Error {
  override readonly name = 'AiChatConversationParticipantIdentityError'
  constructor(message: string) {
    super(message)
  }
}

/**
 * `CC-107` — narrow an identity to the single axis it names.
 *
 * Rejects, by name and at the boundary:
 * - neither axis — a row no predicate in this module could ever reach again;
 * - both axes — a row that answers to two owners;
 * - an agent with no owning human — authorization and audit need a person to
 *   name, and the CHECK constraint is one-sided, so nothing else would refuse it.
 */
export function normalizeParticipantIdentity(
  input: AiChatConversationParticipantIdentity,
): { userId: string | null; agentId: string | null; agentOwnerUserId: string | null } {
  const userId = typeof input.userId === 'string' ? input.userId.trim() : ''
  const agentId = typeof input.agentId === 'string' ? input.agentId.trim() : ''
  const ownerRaw =
    'agentOwnerUserId' in input && typeof input.agentOwnerUserId === 'string'
      ? input.agentOwnerUserId.trim()
      : ''

  if (userId && agentId) {
    throw new AiChatConversationParticipantIdentityError(
      'A participant has exactly ONE identity — a human user_id or an agent_id, not both. ' +
        'A row naming both would answer to two owners.',
    )
  }
  if (!userId && !agentId) {
    throw new AiChatConversationParticipantIdentityError(
      'A participant needs an identity — a human user_id or an agent_id. A row with neither ' +
        'is unreachable by every predicate in this module.',
    )
  }
  if (agentId && !ownerRaw) {
    throw new AiChatConversationParticipantIdentityError(
      `An agent participant needs a human owner ("${agentId}" has none). Authorization and ` +
        'audit must be able to name a person; name the acting user on the key, or call as a user.',
    )
  }
  if ((userId && ownerRaw) || (!userId && !agentId)) {
    throw new AiChatConversationParticipantIdentityError(
      'agentOwnerUserId applies to the agent axis only.',
    )
  }
  return {
    userId: userId || null,
    agentId: agentId || null,
    agentOwnerUserId: ownerRaw || null,
  }
}

export class AiChatConversationRepository {
  constructor(private readonly em: EntityManager) {}

  /**
   * Idempotent create. If a non-deleted conversation already exists for the
   * caller in this tenant/org with the same `conversationId`, returns the
   * existing row. The owner-participant row is created in the same
   * transaction; a partial failure leaves no orphan conversation.
   */
  async createOrGet(
    input: AiChatConversationCreateOrGetInput,
    ctx: AiChatConversationContext,
  ): Promise<AiChatConversation> {
    assertContext(ctx, 'createOrGet')
    if (!input?.agentId) {
      throw new Error('AiChatConversationRepository.createOrGet requires agentId')
    }
    const now = input.now ?? new Date()
    const conversationId = (input.conversationId ?? '').trim() || generateConversationId()

    return this.em.transactional(async (tx) => {
      const existing = await findOneAccessibleConversation(
        tx as unknown as EntityManager,
        conversationId,
        ctx,
      )
      if (existing) {
        if (existing.ownerUserId !== ctx.userId) {
          throw new AiChatConversationAccessError()
        }
        return existing
      }
      await assertOrganizationExists(tx as unknown as EntityManager, ctx)
      const conversation = tx.create(AiChatConversation, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        conversationId,
        agentId: input.agentId,
        ownerUserId: ctx.userId,
        title: normalizeTitle(input.title),
        status: 'open',
        visibility: 'private',
        pageContext: input.pageContext ?? null,
        lastMessageAt: null,
        importedFromLocalAt: input.importedFromLocal ? now : null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      } as unknown as AiChatConversation)
      const participant = tx.create(AiChatConversationParticipant, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        conversationId,
        userId: ctx.userId,
        role: 'owner',
        lastReadAt: null,
        createdAt: now,
        updatedAt: now,
      } as unknown as AiChatConversationParticipant)
      await tx.persist(conversation).persist(participant).flush()
      return conversation
    })
  }

  /** Fetch within tenant/org. View-only callers see only their own conversations. */
  async getById(
    conversationId: string,
    ctx: AiChatConversationContext,
  ): Promise<AiChatConversation | null> {
    assertContext(ctx, 'getById')
    if (!conversationId) return null
    const row = await findOneAccessibleConversation(this.em, conversationId, ctx)
    if (!row) return null
    const isParticipant =
      !canManageConversations(ctx) && row.ownerUserId !== ctx.userId
        ? await this.loadParticipantFlag(
            this.em,
            ctx.tenantId!,
            ctx.organizationId,
            row.conversationId,
            ctx,
          )
        : false
    if (!canAccessConversation(row, ctx, isParticipant)) return null
    return row
  }

  /** Owner-scoped list unless the caller has tenant/org manage access. Participants also see shared conversations. */
  async list(
    ctx: AiChatConversationContext,
    options: AiChatConversationListOptions = {},
  ): Promise<{ items: AiChatConversation[]; nextCursor: string | null }> {
    assertContext(ctx, 'list')
    const limit = clampLimit(options.limit, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT)
    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId ?? null,
      deletedAt: null,
    }
    if (!canManageConversations(ctx)) {
      // `CC-107` — the caller may hold membership on EITHER axis, so both are
      // fetched and unioned. Two indexed queries rather than one `$or`: each
      // axis has its own index, and a combined `$or` could use neither.
      const scope = {
        deletedAt: null,
        ...(ctx.organizationId ? { organizationId: ctx.organizationId } : {}),
      }
      const axes: Array<FilterQuery<AiChatConversationParticipant>> = []
      if (ctx.userId) {
        axes.push({ tenantId: ctx.tenantId, userId: ctx.userId, ...scope })
      }
      if (ctx.agentId) {
        axes.push({ tenantId: ctx.tenantId, agentId: ctx.agentId, ...scope })
      }

      const participantConvIds = new Set<string>()
      for (const axis of axes) {
        const rows = await findWithDecryption<AiChatConversationParticipant>(
          this.em,
          AiChatConversationParticipant,
          axis,
          { fields: ['conversationId'] as any },
          { tenantId: ctx.tenantId ?? null, organizationId: ctx.organizationId ?? null },
        )
        for (const row of rows) participantConvIds.add(row.conversationId)
      }

      const ownedOrMember: Array<Record<string, unknown>> = [{ ownerUserId: ctx.userId }]
      if (participantConvIds.size > 0) {
        ownedOrMember.push({ conversationId: { $in: [...participantConvIds] } })
      }
      where.$or = ownedOrMember
    }
    if (options.agentId) where.agentId = options.agentId
    if (options.status) where.status = options.status
    if (options.cursor) {
      const cursorDate = parseIso(options.cursor)
      if (cursorDate) {
        where.lastMessageAt = { $lt: cursorDate }
      }
    }
    const rows = await findWithDecryption<AiChatConversation>(
      this.em,
      AiChatConversation,
      where as any,
      {
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }] as any,
        limit: limit + 1,
      },
      {
        tenantId: ctx.tenantId ?? null,
        organizationId: ctx.organizationId ?? null,
      },
    )
    let nextCursor: string | null = null
    if (rows.length > limit) {
      const lastIncluded = rows[limit - 1]
      const cursorValue = lastIncluded.lastMessageAt ?? lastIncluded.createdAt
      nextCursor = cursorValue ? cursorValue.toISOString() : null
    }
    return { items: rows.slice(0, limit), nextCursor }
  }

  /** Update within tenant/org. View-only callers can update only their own conversations. */
  async update(
    conversationId: string,
    patch: AiChatConversationUpdateInput,
    ctx: AiChatConversationContext,
  ): Promise<AiChatConversation> {
    assertContext(ctx, 'update')
    if (!conversationId) {
      throw new Error('AiChatConversationRepository.update requires conversationId')
    }
    return this.em.transactional(async (tx) => {
      const existing = await findOneAccessibleConversation(
        tx as unknown as EntityManager,
        conversationId,
        ctx,
      )
      if (!existing) {
        throw new AiChatConversationAccessError(
          `Conversation "${conversationId}" was not found for the caller.`,
        )
      }
      if (!canAccessConversation(existing, ctx)) {
        throw new AiChatConversationAccessError()
      }
      const now = patch.now ?? new Date()
      if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
        existing.title = normalizeTitle(patch.title)
      }
      if (patch.status) existing.status = patch.status
      if (Object.prototype.hasOwnProperty.call(patch, 'pageContext')) {
        existing.pageContext = patch.pageContext ?? null
      }
      existing.updatedAt = now
      await tx.persist(existing).flush()
      return existing
    })
  }

  /** Soft-delete the conversation and all its messages in one transaction. */
  async softDelete(
    conversationId: string,
    ctx: AiChatConversationContext,
    now: Date = new Date(),
  ): Promise<void> {
    assertContext(ctx, 'softDelete')
    if (!conversationId) {
      throw new Error('AiChatConversationRepository.softDelete requires conversationId')
    }
    await this.em.transactional(async (tx) => {
      const existing = await findOneAccessibleConversation(
        tx as unknown as EntityManager,
        conversationId,
        ctx,
      )
      if (!existing) {
        throw new AiChatConversationAccessError(
          `Conversation "${conversationId}" was not found for the caller.`,
        )
      }
      if (!canAccessConversation(existing, ctx)) {
        throw new AiChatConversationAccessError()
      }
      existing.deletedAt = now
      existing.status = 'closed'
      existing.updatedAt = now
      await tx.persist(existing).flush()

      const messages = await findWithDecryption<AiChatMessage>(
        tx as unknown as EntityManager,
        AiChatMessage,
        {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId ?? null,
          conversationId,
          deletedAt: null,
        } as any,
        {},
        {
          tenantId: ctx.tenantId ?? null,
          organizationId: ctx.organizationId ?? null,
        },
      )
      for (const msg of messages) {
        msg.deletedAt = now
        msg.updatedAt = now
        tx.persist(msg)
      }
      if (messages.length > 0) await tx.flush()
    })
  }

  /**
   * Owner-only transcript hydration. Internally fetched DESC so the `before`
   * cursor naturally advances toward older messages, then reversed so the
   * response contract (`messages` array ordered ascending by `createdAt`)
   * stays stable for callers. `nextCursor` points to the OLDEST message in
   * the returned page — the next call with `before=<cursor>` fetches the
   * next-older window.
   */
  async getTranscript(
    conversationId: string,
    ctx: AiChatConversationContext,
    options: AiChatTranscriptOptions = {},
  ): Promise<AiChatTranscriptResult | null> {
    assertContext(ctx, 'getTranscript')
    if (!conversationId) return null
    const conversation = await this.getById(conversationId, ctx)
    if (!conversation) return null
    const limit = clampLimit(options.limit, DEFAULT_TRANSCRIPT_LIMIT, MAX_TRANSCRIPT_LIMIT)
    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId ?? null,
      conversationId,
      deletedAt: null,
    }
    if (options.before) {
      const beforeDate = parseIso(options.before)
      if (beforeDate) {
        where.createdAt = { $lt: beforeDate }
      }
    }
    const rows = await findWithDecryption<AiChatMessage>(
      this.em,
      AiChatMessage,
      where as any,
      {
        orderBy: { createdAt: 'desc' } as any,
        limit: limit + 1,
      },
      {
        tenantId: ctx.tenantId ?? null,
        organizationId: ctx.organizationId ?? null,
      },
    )
    let nextCursor: string | null = null
    let pageDesc: AiChatMessage[]
    if (rows.length > limit) {
      pageDesc = rows.slice(0, limit)
      const oldestIncluded = pageDesc[pageDesc.length - 1]
      nextCursor = oldestIncluded?.createdAt ? oldestIncluded.createdAt.toISOString() : null
    } else {
      pageDesc = rows
    }
    const messages = [...pageDesc].reverse()
    return { conversation, messages, nextCursor }
  }

  /**
   * Append a single message to an owner-accessible conversation. Honors
   * `clientMessageId` idempotency: if a non-deleted message with the same
   * client id already exists, returns it untouched.
   */
  async appendMessage(
    conversationId: string,
    input: AiChatMessageAppendInput,
    ctx: AiChatConversationContext,
    options: AiChatMessageAppendOptions = {},
  ): Promise<AiChatMessage> {
    assertContext(ctx, 'appendMessage')
    if (!conversationId) {
      throw new Error('AiChatConversationRepository.appendMessage requires conversationId')
    }
    return this.em.transactional(async (tx) => {
      const conversation = await findOneAccessibleConversation(
        tx as unknown as EntityManager,
        conversationId,
        ctx,
      )
      if (!conversation) {
        throw new AiChatConversationAccessError(
          `Conversation "${conversationId}" was not found for the caller.`,
        )
      }
      if (conversation.ownerUserId !== ctx.userId) {
        throw new AiChatConversationAccessError()
      }
      const now = options.createdAt ?? new Date()
      if (input.clientMessageId) {
        const existing = await findOneWithDecryption<AiChatMessage>(
          tx as unknown as EntityManager,
          AiChatMessage,
          {
            tenantId: ctx.tenantId,
            organizationId: ctx.organizationId ?? null,
            conversationId,
            clientMessageId: input.clientMessageId,
            deletedAt: null,
          } as any,
          {},
          {
            tenantId: ctx.tenantId ?? null,
            organizationId: ctx.organizationId ?? null,
          },
        )
        if (existing) return existing
      }
      const message = tx.create(AiChatMessage, {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId ?? null,
        conversationId,
        clientMessageId: input.clientMessageId ?? null,
        role: input.role,
        content: input.content,
        uiParts: normalizeArray(input.uiParts),
        attachmentIds: normalizeArray(input.attachmentIds),
        filesMetadata: normalizeArray(input.files),
        model: input.model ?? null,
        metadata: input.metadata ?? null,
        createdByUserId:
          options.createdByUserId === undefined
            ? input.role === 'user'
              ? ctx.userId
              : null
            : options.createdByUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      } as unknown as AiChatMessage)
      conversation.lastMessageAt = now
      conversation.updatedAt = now
      await tx.persist(message).persist(conversation).flush()
      return message
    })
  }

  /**
   * Lazy migration entrypoint: create-or-get the conversation and append the
   * provided messages with `clientMessageId` dedupe. Designed to be safe to
   * call repeatedly — repeated imports of the same payload return the same
   * counts of imported/skipped rows.
   */
  async importLocalConversation(
    input: {
      conversation: AiChatConversationCreateOrGetInput & {
        status?: 'open' | 'closed'
      }
      messages: AiChatMessageAppendInput[]
    },
    ctx: AiChatConversationContext,
    now: Date = new Date(),
  ): Promise<AiChatConversationImportResult> {
    assertContext(ctx, 'importLocalConversation')
    const conversation = await this.createOrGet(
      { ...input.conversation, importedFromLocal: true, now },
      ctx,
    )
    if (input.conversation.status && conversation.status !== input.conversation.status) {
      await this.update(
        conversation.conversationId,
        { status: input.conversation.status, now },
        ctx,
      )
    }
    let imported = 0
    let skipped = 0
    for (const message of input.messages) {
      if (!message.clientMessageId) {
        // Without an idempotency key the import has no safe way to dedupe.
        skipped += 1
        continue
      }
      const before = await findOneWithDecryption<AiChatMessage>(
        this.em,
        AiChatMessage,
        {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId ?? null,
          conversationId: conversation.conversationId,
          clientMessageId: message.clientMessageId,
          deletedAt: null,
        } as any,
        {},
        {
          tenantId: ctx.tenantId ?? null,
          organizationId: ctx.organizationId ?? null,
        },
      )
      if (before) {
        skipped += 1
        continue
      }
      await this.appendMessage(
        conversation.conversationId,
        message,
        ctx,
        { createdAt: now },
      )
      imported += 1
    }
    return {
      conversation,
      importedMessageCount: imported,
      skippedMessageCount: skipped,
    }
  }

  async listParticipants(
    conversationId: string,
    ctx: AiChatConversationContext,
  ): Promise<AiChatConversationParticipant[]> {
    assertContext(ctx, 'listParticipants')
    const conv = await findOneAccessibleConversation(this.em, conversationId, ctx)
    if (!conv) {
      throw new AiChatConversationAccessError(
        `Conversation "${conversationId}" was not found for the caller.`,
      )
    }
    if (conv.ownerUserId !== ctx.userId && !canManageConversations(ctx)) {
      throw new AiChatConversationAccessError(
        'Only the conversation owner or a manager can list participants.',
      )
    }
    const filter: FilterQuery<AiChatConversationParticipant> = {
      tenantId: ctx.tenantId,
      conversationId,
      deletedAt: null,
      ...(ctx.organizationId ? { organizationId: ctx.organizationId } : {}),
    }
    return findWithDecryption<AiChatConversationParticipant>(
      this.em,
      AiChatConversationParticipant,
      filter,
      { orderBy: { createdAt: 'asc' } as any },
      { tenantId: ctx.tenantId ?? null, organizationId: ctx.organizationId ?? null },
    )
  }

  /**
   * `CC-107` — add a participant on EITHER axis.
   *
   * The identity is normalised (and re-checked) here rather than at the route:
   * the database's `one_identity_ck` is NOT VALID by design, so it guards new
   * writes only where the application guards them too, and the route's zod
   * schema cannot express "exactly one of two".
   */
  async addParticipant(
    conversationId: string,
    identity: AiChatConversationParticipantIdentity,
    role: 'viewer',
    ctx: AiChatConversationContext,
  ): Promise<AiChatConversationParticipant> {
    assertContext(ctx, 'addParticipant')
    const { userId, agentId, agentOwnerUserId } = normalizeParticipantIdentity(identity)
    return this.em.transactional(async (tx) => {
      const conv = await findOneAccessibleConversation(
        tx as unknown as EntityManager,
        conversationId,
        ctx,
      )
      if (!conv) {
        throw new AiChatConversationAccessError(
          `Conversation "${conversationId}" was not found for the caller.`,
        )
      }
      if (conv.ownerUserId !== ctx.userId) {
        throw new AiChatConversationAccessError(
          'Only the conversation owner can add participants.',
        )
      }
      // Look up the SAME axis the caller named. A filter naming both would never
      // match (the columns are mutually exclusive by construction), and one
      // naming the wrong axis would silently revive somebody else's row.
      const existingFilter: FilterQuery<AiChatConversationParticipant> = {
        tenantId: ctx.tenantId,
        conversationId,
        ...(userId ? { userId } : { agentId }),
        ...(ctx.organizationId ? { organizationId: ctx.organizationId } : {}),
      }
      const existing = await findOneWithDecryption<AiChatConversationParticipant>(
        tx as unknown as EntityManager,
        AiChatConversationParticipant,
        existingFilter,
      )
      if (existing) {
        if (existing.deletedAt === null) {
          throw new AiChatConversationDuplicateParticipantError()
        }
        existing.deletedAt = null
        existing.role = role
        await tx.persist(existing).flush()
        if (conv.visibility === 'private') {
          conv.visibility = 'shared'
          await tx.persist(conv).flush()
        }
        return existing
      }
      const participant = tx.create(AiChatConversationParticipant, {
        tenantId: ctx.tenantId!,
        organizationId: ctx.organizationId ?? null,
        conversationId,
        userId,
        agentId,
        agentOwnerUserId,
        role,
      } as unknown as AiChatConversationParticipant)
      if (conv.visibility === 'private') {
        conv.visibility = 'shared'
      }
      await tx.persist(participant).persist(conv).flush()
      return participant
    })
  }

  /**
   * `CC-107` — revoke a participant on EITHER axis, by the identity the caller
   * names. The old signature took a uuid, so an agent could never be addressed
   * at all (`participants/[userId]/route.ts:26` validated `z.string().uuid()`).
   */
  async revokeParticipant(
    conversationId: string,
    identity: AiChatConversationParticipantIdentity,
    ctx: AiChatConversationContext,
  ): Promise<void> {
    assertContext(ctx, 'revokeParticipant')
    const { userId, agentId } = normalizeParticipantIdentity(identity)
    await this.em.transactional(async (tx) => {
      const conv = await findOneAccessibleConversation(
        tx as unknown as EntityManager,
        conversationId,
        ctx,
      )
      if (!conv) {
        throw new AiChatConversationAccessError(
          `Conversation "${conversationId}" was not found for the caller.`,
        )
      }
      if (conv.ownerUserId !== ctx.userId) {
        throw new AiChatConversationAccessError(
          'Only the conversation owner can revoke participants.',
        )
      }
      // The owner is a human, so this guard can only ever fire on the human axis.
      if (userId && userId === conv.ownerUserId) {
        throw new AiChatConversationAccessError('Cannot revoke the conversation owner.')
      }
      const participantFilter: FilterQuery<AiChatConversationParticipant> = {
        tenantId: ctx.tenantId,
        conversationId,
        ...(userId ? { userId } : { agentId }),
        deletedAt: null,
        ...(ctx.organizationId ? { organizationId: ctx.organizationId } : {}),
      }
      const participant = await findOneWithDecryption<AiChatConversationParticipant>(
        tx as unknown as EntityManager,
        AiChatConversationParticipant,
        participantFilter,
      )
      if (!participant) throw new AiChatParticipantNotFoundError()
      participant.deletedAt = new Date()
      const remainingCount = await tx.count(AiChatConversationParticipant, {
        tenantId: ctx.tenantId,
        conversationId,
        deletedAt: null,
        role: { $ne: 'owner' },
      } as FilterQuery<AiChatConversationParticipant>)
      if (remainingCount <= 1) {
        conv.visibility = 'private'
        await tx.persist(conv)
      }
      await tx.persist(participant).flush()
    })
  }

  async getParticipantCount(
    tenantId: string,
    organizationId: string | null | undefined,
    conversationId: string,
  ): Promise<number> {
    return this.em.count(AiChatConversationParticipant, {
      tenantId,
      conversationId,
      deletedAt: null,
      role: { $ne: 'owner' },
      ...(organizationId ? { organizationId } : {}),
    } as FilterQuery<AiChatConversationParticipant>)
  }

  /**
   * `CC-107` — does ANY identity of the caller hold membership here?
   *
   * Two queries, not one `$or`: the two axes are indexed separately
   * (`..._active_conv_user_idx` and `..._active_conv_agent_idx`), so a single
   * `$or` over `{userId} or {agentId}` cannot use either index and would seq-scan
   * the table. Two indexed lookups are the cheaper shape, and they are also the
   * honest one: "this person is a member" and "this machine is a member" are
   * different facts.
   */
  private async loadParticipantFlag(
    em: EntityManager,
    tenantId: string,
    organizationId: string | null | undefined,
    conversationId: string,
    ctx: AiChatConversationContext,
  ): Promise<boolean> {
    // Typed as a concrete object rather than `FilterQuery` so it can be SPREAD:
    // `FilterQuery` is an intersection type and TypeScript refuses to spread it
    // (`TS2698`) — the same trap `organizationScope` hit in `CC-102`.
    type ParticipantScope = {
      tenantId: string
      conversationId: string
      deletedAt: null
      organizationId?: string
    }
    const scoped: ParticipantScope = {
      tenantId,
      conversationId,
      deletedAt: null,
      ...(organizationId ? { organizationId } : {}),
    }

    const human = ctx.userId
      ? await findOneWithDecryption<AiChatConversationParticipant>(
          em,
          AiChatConversationParticipant,
          { ...scoped, userId: ctx.userId } as FilterQuery<AiChatConversationParticipant>,
        )
      : null
    if (human) return true

    if (!ctx.agentId) return false
    const agent = await findOneWithDecryption<AiChatConversationParticipant>(
      em,
      AiChatConversationParticipant,
      { ...scoped, agentId: ctx.agentId } as FilterQuery<AiChatConversationParticipant>,
    )
    return agent !== null
  }
}

function assertContext(ctx: AiChatConversationContext | undefined, method: string): void {
  if (!ctx?.tenantId) {
    throw new Error(`AiChatConversationRepository.${method} requires tenantId`)
  }
  if (!ctx?.userId) {
    throw new Error(`AiChatConversationRepository.${method} requires userId`)
  }
}

function canManageConversations(ctx: AiChatConversationContext): boolean {
  return ctx.canManageConversations === true
}

function canAccessConversation(
  row: AiChatConversation,
  ctx: AiChatConversationContext,
  isParticipant = false,
): boolean {
  return canManageConversations(ctx) || row.ownerUserId === ctx.userId || isParticipant
}

async function assertOrganizationExists(
  em: EntityManager,
  ctx: AiChatConversationContext,
): Promise<void> {
  if (!ctx.organizationId) return
  const org = await findOneWithDecryption<Organization>(
    em,
    Organization,
    {
      id: ctx.organizationId,
      tenant: ctx.tenantId,
      deletedAt: null,
      isActive: true,
    } as any,
    {},
    {
      tenantId: ctx.tenantId ?? null,
      organizationId: ctx.organizationId ?? null,
    },
  )
  if (!org) {
    throw new AiChatConversationOrgNotFoundError(
      `Organization "${ctx.organizationId}" does not exist or is inactive in tenant "${ctx.tenantId}".`,
    )
  }
}

async function findOneAccessibleConversation(
  em: EntityManager,
  conversationId: string,
  ctx: AiChatConversationContext,
): Promise<AiChatConversation | null> {
  const row = await findOneWithDecryption<AiChatConversation>(
    em,
    AiChatConversation,
    {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId ?? null,
      conversationId,
      deletedAt: null,
    } as any,
    {},
    {
      tenantId: ctx.tenantId ?? null,
      organizationId: ctx.organizationId ?? null,
    },
  )
  return row ?? null
}

function normalizeTitle(title: string | null | undefined): string | null {
  if (title === undefined) return null
  if (title === null) return null
  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeArray<T>(value: T[] | null | undefined): T[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  return value
}

function clampLimit(value: number | undefined | null, fallback: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(Math.floor(value), max))
}

function parseIso(value: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function generateConversationId(): string {
  // Prefer the runtime crypto generator when present; fall back to a non-cryptographic
  // string for environments without `crypto.randomUUID()` (older Node / test mocks).
  const cryptoMod: { randomUUID?: () => string } | undefined =
    typeof globalThis === 'object' ? (globalThis as any).crypto : undefined
  if (cryptoMod?.randomUUID) return cryptoMod.randomUUID()
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

export default AiChatConversationRepository
