import { createHash } from 'node:crypto'
import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('auth').child({ component: 'setup' })

/**
 * How often the hold windows are swept.
 *
 * Gate `A3` says an act commits once its window passes. The window is fifteen
 * minutes; a one-minute sweep means an act runs within a minute of becoming due,
 * which is precise enough for a control measured in quarter-hours and cheap
 * enough to ignore — the query is a single indexed lookup that usually returns
 * nothing.
 */
const COMMIT_SWEEP_INTERVAL_SECONDS = 60

type SchedulerServiceLike = {
  register: (registration: Record<string, unknown>) => Promise<void>
}

/**
 * A stable id, so re-running setup upserts the schedule instead of adding another.
 *
 * A duplicated sweep would run every due act twice — and the second run would
 * find them already committed, which is safe, but a schedule table that grows a
 * row per deployment is one nobody can read.
 */
function stableScheduleUuid(seed: string): string {
  const hash = createHash('sha1').update(seed).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-')
}

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    admin: ['auth.*'],
  },

  async seedDefaults({ container, tenantId }) {
    /**
     * Register the sweep that commits acts whose hold window has passed.
     *
     * `A3` — *hold and commit unless vetoed* — only means anything if something
     * wakes up whether or not a person is looking. On read would not do: that
     * would make an act commit when somebody happened to open a queue, which is
     * approve-first wearing a timer's clothes.
     *
     * Skipped silently when the scheduler module is not enabled, so lean
     * bootstraps and test harnesses stay usable. The consequence is stated
     * rather than hidden: without a scheduler, A3 acts wait indefinitely and a
     * person has to resolve them — and `pendingActService` still refuses to let
     * one run twice.
     */
    const cradle = container as { hasRegistration?: (name: string) => boolean }
    if (typeof cradle.hasRegistration !== 'function' || !cradle.hasRegistration('schedulerService')) {
      logger.warn('No scheduler registered; A3 hold windows will not commit on their own', { tenantId })
      return
    }

    // Best-effort: a scheduler failure must not abort tenant initialization for
    // every other module.
    try {
      const schedulerService = container.resolve('schedulerService') as SchedulerServiceLike
      await schedulerService.register({
        id: stableScheduleUuid(`auth:commit-held-acts:${tenantId ?? 'system'}`),
        name: 'Authority hold windows',
        description:
          `Every ${COMMIT_SWEEP_INTERVAL_SECONDS}s, runs acts gated at A3 whose hold window has passed and that nobody vetoed.`,
        scopeType: 'tenant',
        tenantId,
        scheduleType: 'interval',
        scheduleValue: `${COMMIT_SWEEP_INTERVAL_SECONDS}s`,
        timezone: 'UTC',
        targetType: 'queue',
        targetQueue: 'authority',
        targetPayload: { scope: { tenantId } },
        sourceType: 'module',
        sourceModule: 'auth',
        isEnabled: true,
      })
    } catch (error) {
      logger.error('Could not register the authority hold-window sweep', { tenantId, err: error })
    }
  },
}

export default setup
