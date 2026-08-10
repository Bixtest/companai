import type { AwilixContainer } from 'awilix'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { apiKeySubject } from '@open-mercato/shared/lib/auth/principal'
import type { PendingActService } from '@open-mercato/core/modules/auth/services/pendingActService'

const logger = createLogger('authority').child({ component: 'commit-held-acts' })

/**
 * Runs acts whose hold window has passed.
 *
 * Gate `A3` is *"hold and commit unless vetoed"*. The act does not run when it is
 * proposed; it runs by itself once nobody has objected for long enough. That is
 * the difference between a hold window and a queue, and it only holds if
 * something wakes up whether or not anybody is looking — which is why this is a
 * scheduled worker and not a sweep on read.
 *
 * A queue rather than an in-process timer, deliberately: a timer dies with the
 * process that set it, and an act that silently never commits because a server
 * restarted is indistinguishable from one somebody vetoed.
 */
export const metadata = {
  queue: 'authority',
  id: 'auth:commit-held-acts',
  concurrency: 1,
}

/**
 * The principal an auto-committed act runs as.
 *
 * Nobody approved it — it happened because a window passed. Attributing it to a
 * person would put somebody's name on a decision they never made; attributing it
 * to the proposer would claim they acted at a moment they did not. The platform
 * committed it, so the platform is the actor.
 */
function systemAuth(tenantId: string | null) {
  return {
    sub: apiKeySubject('authority-commit'),
    tenantId,
    orgId: null,
    roles: [],
    isSuperAdmin: false,
    principal: {
      id: 'authority-commit',
      kind: 'system' as const,
      onBehalfOfUserId: null,
      displayName: 'Authority hold window',
      tenantId,
      organizationId: null,
    },
  }
}

type WorkerContext = { resolve: <T = unknown>(name: string) => T; container?: AwilixContainer }

type SweepPayload = { scope?: { tenantId?: string | null } }

export default async function handler(payload: SweepPayload, ctx: WorkerContext): Promise<void> {
  // The schedule is registered per tenant and carries its own scope. Without a
  // tenant there is nothing safe to sweep — a global pass from a per-tenant job
  // would repeat every other tenant's work once per tenant.
  const tenantId = typeof payload?.scope?.tenantId === 'string' ? payload.scope.tenantId : null
  if (!tenantId) {
    logger.warn('Hold-window sweep ran without a tenant scope; nothing swept')
    return
  }

  const container = (ctx.container ?? (ctx as unknown as AwilixContainer))
  let pendingActs: PendingActService
  try {
    pendingActs = ctx.resolve('pendingActService') as PendingActService
  } catch {
    // Nothing registered — a bootstrap without the auth module. Nothing to sweep.
    return
  }

  const outcome = await pendingActs.commitDue({
    tenantId,
    container,
    systemAuth: systemAuth(tenantId),
  })

  if (outcome.committed || outcome.failed) {
    logger.warn('Committed acts whose hold window had passed', { tenantId, ...outcome })
  }
}
