'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { Tag } from '@open-mercato/ui/primitives/tag'
import { readVersionedPreference, writeVersionedPreference } from '@open-mercato/shared/lib/browser/versionedPreference'
import { useT } from '@open-mercato/shared/lib/i18n/context'

/**
 * The queue, as something a person can work through.
 *
 * When the resolver gates an act it stops and waits. That has worked since
 * enforcement landed — through an API, which means through a terminal, which
 * nobody in a real company is going to do.
 *
 * Two lists, deliberately kept apart on one page (planning 02 §9 asks for one
 * inbox rather than four screens):
 *
 *   **Waiting** — the act has *not* happened. Approving runs it; rejecting means
 *   it never runs; ignoring it means it expires, or, for a hold window, that it
 *   runs by itself.
 *
 *   **To review** — the act *has* happened. Nothing here changes what did; the
 *   only question is whether anybody has looked.
 *
 * Confusing those two in either direction is how a queue loses its meaning, so
 * they never share a row, a verb, or a colour.
 *
 * ## What is deliberately not here yet
 *
 * Bulk approval with a diff, routing to a deputy when somebody is away, and
 * standing approvals — all in planning 02 §7.2, all their own work, each with a
 * backlog entry. A first version that ships without them is usable; one that
 * ships a blind "approve all" button would be worse than no page.
 */

const ORDER_PREFERENCE_KEY = 'om:authority:approvals:order'
const ORDER_PREFERENCE_VERSION = 1

type Ordering = 'risk' | 'oldest'

function isOrdering(value: unknown): value is Ordering {
  return value === 'risk' || value === 'oldest'
}

type PendingAct = {
  id: string
  commandId: string
  capabilityId: string
  actorId: string
  actorKind: string
  gate: string
  bindingRule: string
  because: string | null
  obligations: string[]
  status: string
  expiresAt: string
  createdAt: string
}

type ActReview = {
  id: string
  commandId: string
  capabilityId: string
  actionLogId: string | null
  actorId: string
  actorKind: string
  gate: string
  because: string | null
  status: string
  createdAt: string
}

type QueueResponse = { items: PendingAct[]; reviews: ActReview[] }

/**
 * What each gate means where somebody has to act on it.
 *
 * The gate identifiers are precise and mean nothing to a reader. A queue that
 * shows "A2" and expects the reader to know is a queue that gets clicked through.
 */
function gateMeaning(gate: string, t: (key: string, fallback: string) => string): string {
  switch (gate) {
    case 'A1': return t('auth.approvals.gateA1', 'The proposer may not perform this — you would be performing it')
    case 'A2': return t('auth.approvals.gateA2', 'Needs your approval before it runs')
    case 'A3': return t('auth.approvals.gateA3', 'Runs by itself when the hold window passes, unless you stop it')
    case 'A4': return t('auth.approvals.gateA4', 'Already happened. Someone should look at it')
    default: return t('auth.approvals.gateUnknown', 'Waiting on a decision')
  }
}

/**
 * Lower gate, more constrained, more consequential — so it sorts first.
 *
 * A proxy, and an honest one: the resolver reached a lower gate precisely
 * because it judged the act to matter more. Planning 02 §7.2 wants grade then
 * deadline risk, and grade is not carried on a queue row yet.
 */
const GATE_ORDER = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']

function riskRank(gate: string): number {
  const index = GATE_ORDER.indexOf(gate)
  return index === -1 ? GATE_ORDER.length : index
}

function formatWhen(iso: string): string {
  const at = new Date(iso)
  const minutes = Math.round((at.getTime() - Date.now()) / 60000)
  if (Number.isNaN(minutes)) return iso
  // Relative time, formatted by the platform's locale rather than an English
  // template: "in 12 min" reads as a sentence fragment and would need translating
  // per language, while Intl already knows how each one says it.
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 48) return relative.format(hours, 'hour')
  return at.toLocaleDateString()
}

export default function AuthorityApprovalsPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [ordering, setOrdering] = React.useState<Ordering>('risk')

  // Per person, and only per person: how somebody wants their own queue sorted
  // is a taste, not a policy, and storing it server-side would make one person's
  // preference everybody's.
  React.useEffect(() => {
    setOrdering(readVersionedPreference(ORDER_PREFERENCE_KEY, ORDER_PREFERENCE_VERSION, isOrdering, 'risk'))
  }, [])

  const chooseOrdering = React.useCallback((next: Ordering) => {
    setOrdering(next)
    writeVersionedPreference(ORDER_PREFERENCE_KEY, ORDER_PREFERENCE_VERSION, next)
  }, [])

  const queueQuery = useQuery({
    queryKey: ['authority', 'queue'],
    queryFn: async () => (await apiCallOrThrow<QueueResponse>('/api/auth/authority/pending-acts')).result,
    // The queue changes because other people act, not because this page did.
    refetchInterval: 30_000,
  })

  const resolve = React.useCallback(async (
    id: string,
    decision: 'approve' | 'reject' | 'reviewed',
    label: string,
  ) => {
    setBusyId(id)
    try {
      await apiCallOrThrow('/api/auth/authority/pending-acts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      })
      flash(label, 'success')
      await queryClient.invalidateQueries({ queryKey: ['authority', 'queue'] })
    } catch (error) {
      // Say what failed rather than "something went wrong": an approval that
      // silently does nothing is the worst outcome on this page, because the
      // reader will assume the act ran.
      flash(error instanceof Error ? error.message : t('auth.approvals.resolveFailed', 'Could not resolve this act.'), 'error')
    } finally {
      setBusyId(null)
    }
  }, [queryClient, t])

  const waiting = React.useMemo(() => {
    const items = [...(queueQuery.data?.items ?? [])]
    return items.sort((left, right) => {
      if (ordering === 'risk') {
        const byRisk = riskRank(left.gate) - riskRank(right.gate)
        if (byRisk !== 0) return byRisk
        // Then whatever runs out first — a tie on consequence is broken by time.
        return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime()
      }
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    })
  }, [queueQuery.data, ordering])

  const reviews = queueQuery.data?.reviews ?? []

  if (queueQuery.isLoading) return <LoadingMessage label={t('auth.approvals.loading', 'Loading the queue…')} />
  if (queueQuery.isError) {
    return (
      <ErrorMessage
        label={t('auth.approvals.loadError', 'Could not load the queue.')}
        description={t(
          'auth.approvals.loadErrorHint',
          'Nothing has been approved or rejected. Reload to try again.',
        )}
      />
    )
  }

  return (
    <Page>
      <PageHeader
        title={t('auth.nav.approvals', 'Approvals')}
        description={t(
          'auth.approvals.description',
          'Acts the rules stopped, and acts that happened and want a second pair of eyes.',
        )}
      />
      <PageBody>
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold leading-none text-foreground">
                  {t('auth.approvals.waitingTitle', 'Waiting for a decision')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('auth.approvals.waitingHint', 'These have not happened. Nothing here has changed anything yet.')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('auth.approvals.orderLabel', 'Order')}</span>
                <Button
                  type="button"
                  variant={ordering === 'risk' ? 'default' : 'outline'}
                  onClick={() => chooseOrdering('risk')}
                >
                  {t('auth.approvals.orderRisk', 'Most constrained first')}
                </Button>
                <Button
                  type="button"
                  variant={ordering === 'oldest' ? 'default' : 'outline'}
                  onClick={() => chooseOrdering('oldest')}
                >
                  {t('auth.approvals.orderOldest', 'Oldest first')}
                </Button>
              </div>
            </div>

            {waiting.length === 0 ? (
              <p className="rounded-lg border bg-background px-4 py-6 text-sm text-muted-foreground">
                {t('auth.approvals.waitingEmpty', 'Nothing is waiting. Acts appear here when the rules stop one.')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {waiting.map((act) => (
                  <article key={act.id} className="flex flex-col gap-2 rounded-lg border bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{act.capabilityId}</span>
                      <Tag variant={act.gate === 'A3' ? 'warning' : 'info'}>{act.gate}</Tag>
                      <span className="text-sm text-muted-foreground">
                        {gateMeaning(act.gate, t)}
                      </span>
                    </div>
                    {act.because ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{t('auth.approvals.becauseLabel', 'Why')}: </span>
                        {act.because}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {t('auth.approvals.proposedBy', 'Proposed by')} {act.actorKind} · {act.commandId} ·{' '}
                      {act.gate === 'A3'
                        ? `${t('auth.approvals.runsBy', 'runs by itself')} ${formatWhen(act.expiresAt)}`
                        : `${t('auth.approvals.expiresIn', 'expires')} ${formatWhen(act.expiresAt)}`}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {act.gate === 'A3' ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busyId === act.id}
                          onClick={() => resolve(act.id, 'reject', t('auth.approvals.stopped', 'Stopped. It will not run.'))}
                        >
                          {t('auth.approvals.stop', 'Stop it running')}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            disabled={busyId === act.id}
                            onClick={() => resolve(act.id, 'approve', t('auth.approvals.approved', 'Approved, and the act ran.'))}
                          >
                            {t('auth.approvals.approve', 'Approve and run')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busyId === act.id}
                            onClick={() => resolve(act.id, 'reject', t('auth.approvals.rejected', 'Rejected. It will not run.'))}
                          >
                            {t('auth.approvals.reject', 'Reject')}
                          </Button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold leading-none text-foreground">
                {t('auth.approvals.reviewTitle', 'Already happened, not yet looked at')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  'auth.approvals.reviewHint',
                  'These acts took effect. Marking one looked-at changes nothing except the record that somebody checked.',
                )}
              </p>
            </div>

            {reviews.length === 0 ? (
              <p className="rounded-lg border bg-background px-4 py-6 text-sm text-muted-foreground">
                {t('auth.approvals.reviewEmpty', 'Nothing waiting to be reviewed.')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {reviews.map((review) => (
                  <article key={review.id} className="flex flex-col gap-2 rounded-lg border bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{review.capabilityId}</span>
                      <Tag variant="info" dot>{review.gate}</Tag>
                      <span className="text-sm text-muted-foreground">
                        {t('auth.approvals.alreadyRan', 'Already ran')}
                      </span>
                    </div>
                    {review.because ? (
                      <p className="text-sm text-muted-foreground">{review.because}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {review.actorKind} · {review.commandId} · {new Date(review.createdAt).toLocaleString()}
                    </p>
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busyId === review.id}
                        onClick={() => resolve(review.id, 'reviewed', t('auth.approvals.markedReviewed', 'Marked as reviewed.'))}
                      >
                        {t('auth.approvals.markReviewed', 'I have looked at this')}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </PageBody>
    </Page>
  )
}
