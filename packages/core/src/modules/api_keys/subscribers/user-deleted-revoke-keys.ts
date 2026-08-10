import type { EntityManager } from '@mikro-orm/postgresql'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { ApiKey } from '../data/entities'

const logger = createLogger('api_keys').child({ component: 'user-deleted-revoke' })

/**
 * Revokes the API keys a user created when that user is deleted.
 *
 * **Why this exists.** Authentication used to resolve a regular key through
 * `createdBy` and reject it whenever that user's record no longer matched — so
 * deleting a person revoked their keys as an invisible side effect of a lookup
 * failing. That coupling is gone: a key now carries its own organization and its
 * own roles, and a person moving to another organization no longer breaks it.
 *
 * Which leaves the part that *was* worth keeping, and it belongs here rather
 * than in a comparison: when somebody is offboarded, the credentials they minted
 * should stop working. Doing it as a revocation makes it an explicit, visible,
 * reversible-by-reissue act — the key list shows them revoked — instead of a
 * fleet of keys that mysteriously return 401.
 *
 * Soft delete, not hard: `deleted_at` is what the delete endpoint sets, and the
 * row is worth keeping so the audit trail can still say which key did what.
 *
 * Idempotent: already-revoked rows are filtered out, so an event replay is a
 * no-op.
 *
 * **Not the only guard.** `resolveApiKeyAuth` still refuses a key whose user has
 * gone. This cascade makes the revocation deliberate and auditable; that check
 * catches whatever the cascade missed, because an event bus is not a place to
 * put the last line of a security control.
 */
export const metadata = {
  event: 'auth.user.deleted',
  persistent: true,
  id: 'api_keys:user-deleted-revoke-keys',
}

/**
 * The payload `emitCrudSideEffects` actually emits for a CRUD event.
 *
 * `id` is the deleted user's id. It is worth stating in a type: the platform's
 * other cascade on this event read `payload.userId`, which is never present, and
 * had therefore never run once.
 */
type AuthUserDeletedPayload = {
  id?: string
  tenantId?: string | null
  organizationId?: string | null
}

type SubscriberContext = {
  resolve: <T = unknown>(name: string) => T
}

export default async function handler(
  payload: AuthUserDeletedPayload,
  ctx: SubscriberContext,
): Promise<void> {
  const userId = typeof payload?.id === 'string' && payload.id ? payload.id : null
  if (!userId) return

  // Fail closed on a missing tenant: an unscoped revocation would reach into
  // arbitrary tenants if two ever shared a user id (impossible under UUIDv4,
  // possible after a backup restore).
  const tenantId = typeof payload?.tenantId === 'string' && payload.tenantId ? payload.tenantId : null
  if (!tenantId) return

  const em = (ctx.resolve('em') as EntityManager).fork()
  const keys = await em.find(ApiKey, { createdBy: userId, tenantId, deletedAt: null })
  if (!keys.length) return

  const revokedAt = new Date()
  for (const key of keys) key.deletedAt = revokedAt
  await em.flush()

  logger.warn('Revoked API keys because the user who created them was deleted', {
    userId,
    tenantId,
    revoked: keys.length,
  })
}
