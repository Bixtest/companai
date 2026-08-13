'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { RecordLockState } from '@open-mercato/shared/modules/record-locks'

/**
 * Every record currently frozen, and how to thaw it.
 *
 * **This is not the whole of item 21's record-lock work, and says so.** The
 * natural home for setting a lock is a control on each record's own screen —
 * per-entity work across every entity in the platform. What was missing was the
 * other half: a lock applies to *everybody*, so when somebody cannot edit a
 * record and nobody remembers freezing it, there was nowhere at all to look.
 * That question is tenant-wide, so it gets a tenant-wide page.
 *
 * The list therefore shows only what is frozen. Unlike delegations and denials
 * there is no history section, because an unlocked record does not keep a row —
 * `setState` writes the current state rather than appending. Showing "recently
 * unlocked" would mean inventing a history the table does not have.
 */

type RecordLock = {
  recordId: string
  state: RecordLockState
  reason: string | null
  commandHint: string | null
  lockedByUserId: string | null
  updatedAt: string
}

const dateOnly = (value: string) => value.slice(0, 10)

export default function RecordLocksPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [unlockingId, setUnlockingId] = React.useState<string | null>(null)

  const query = useQuery({
    queryKey: ['auth', 'authority', 'record-locks'],
    queryFn: async () =>
      (await apiCallOrThrow<{ items: RecordLock[] }>('/api/auth/authority/record-locks')).result,
  })

  const unlock = React.useCallback(async (lock: RecordLock) => {
    setUnlockingId(lock.recordId)
    try {
      // `open` is the absence of a restriction rather than a fourth state, so
      // thawing is setting the state back rather than deleting a row.
      await apiCallOrThrow('/api/auth/authority/record-locks', {
        method: 'POST',
        body: JSON.stringify({ recordId: lock.recordId, state: 'open' }),
      })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'authority', 'record-locks'] })
      flash(t('auth.recordLocks.unlocked', 'Unlocked. Writes are accepted again from the next request.'), 'success')
    } catch (error) {
      flash(
        error instanceof Error ? error.message : t('auth.recordLocks.unlockFailed', 'Could not unlock it'),
        'error',
      )
    } finally {
      setUnlockingId(null)
    }
  }, [queryClient, t])

  const items = query.data?.items ?? []
  // Fully locked first: those refuse every write, restricted only narrows.
  const frozen = [...items].sort((left, right) => STATE_ORDER[left.state] - STATE_ORDER[right.state])

  return (
    <Page>
      <PageHeader
        title={t('auth.nav.recordLocks', 'Frozen records')}
        description={t(
          'auth.recordLocks.intro',
          'Records that refuse writes whatever authority the writer holds. A lock is not a permission check — it applies to everybody, including the person who set it and including a superadmin.',
        )}
      />
      <PageBody>
        {query.isLoading ? <LoadingMessage label={t('auth.recordLocks.loading', 'Loading frozen records…')} /> : null}
        {query.isError ? <ErrorMessage label={t('auth.recordLocks.loadFailed', 'Could not load frozen records')} /> : null}

        {!query.isLoading && !query.isError ? (
          <div className="space-y-8">
            {frozen.length === 0 ? (
              <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                {t(
                  'auth.recordLocks.none',
                  'Nothing is frozen. Every record accepts writes from whoever ordinarily has the authority to make them.',
                )}
              </p>
            ) : (
              <ul className="space-y-3">
                {frozen.map((lock) => (
                  <li key={lock.recordId} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-mono text-sm font-medium">{lock.recordId}</p>
                        <p className="text-sm">
                          {t(`auth.recordLocks.state.${lock.state}`, STATE_MEANING[lock.state])}
                        </p>
                        {lock.reason ? (
                          <p className="text-sm">
                            <span className="text-muted-foreground">{t('auth.recordLocks.why', 'Why')}: </span>
                            {lock.reason}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t('auth.recordLocks.noReason', 'No reason was recorded — whoever unfreezes this will be guessing.')}
                          </p>
                        )}
                        {lock.commandHint ? (
                          <p className="text-xs text-muted-foreground">
                            {t('auth.recordLocks.commandHint', 'What to do instead')}: {lock.commandHint}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {t('auth.recordLocks.since', 'since {date}').replace('{date}', dateOnly(lock.updatedAt))}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={unlockingId === lock.recordId}
                        onClick={() => unlock(lock)}
                      >
                        {unlockingId === lock.recordId
                          ? t('auth.recordLocks.unlocking', 'Unlocking…')
                          : t('auth.recordLocks.unlock', 'Unlock')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-sm text-muted-foreground">
              {t(
                'auth.recordLocks.setHint',
                'Freezing a record belongs on that record’s own screen, next to the thing being frozen, and is still to be built for each entity. This page exists for the opposite question — when a record refuses writes and nobody remembers why, a lock applies to everybody and there was nowhere to look.',
              )}
            </p>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}

/** Fully locked first — those refuse everything; restricted merely narrows. */
const STATE_ORDER: Record<RecordLockState, number> = { locked: 0, restricted: 1, open: 2 }

/**
 * Each state in the terms somebody chasing a refused write would use.
 *
 * `open` is listed for completeness, though the list should never contain one:
 * an open record is the absence of a restriction, not a kind of lock.
 */
const STATE_MEANING: Record<RecordLockState, string> = {
  locked: 'Locked — every write is refused, whoever asks',
  restricted: 'Restricted — writes are held for approval rather than refused',
  open: 'Open — accepting writes normally',
}
