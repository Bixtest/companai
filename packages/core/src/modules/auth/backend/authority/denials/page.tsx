'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

/**
 * Permissions withheld from one person, and how to give them back.
 *
 * The feature shipped with an API and a CLI and no screen, which put the whole
 * of it behind a terminal. That is the wrong place for this one in particular:
 * a denial can stop somebody working, and the person best placed to notice and
 * lift it is an administrator looking at a list — not somebody who knows the
 * command.
 *
 * **Lifted denials stay on the page.** The list answers *"why couldn't Sam
 * approve that in March"*, which needs the ones that ended as much as the ones
 * still in force.
 */

type Denial = {
  id: string
  subjectPrincipalId: string
  featurePattern: string
  organizationId: string | null
  startsAt: string
  expiresAt: string | null
  liftedAt: string | null
  reason: string
}

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : null)

/** In force right now — mirrors `isDenialActive`, the rule the check uses. */
function isInForce(denial: Denial, now: number): boolean {
  if (denial.liftedAt) return false
  if (new Date(denial.startsAt).getTime() > now) return false
  if (denial.expiresAt && new Date(denial.expiresAt).getTime() <= now) return false
  return true
}

export default function DenialsPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [liftingId, setLiftingId] = React.useState<string | null>(null)
  const now = Date.now()

  const query = useQuery({
    queryKey: ['auth', 'authority', 'denials'],
    queryFn: async () =>
      (await apiCallOrThrow<{ items: Denial[] }>('/api/auth/authority/denials')).result,
  })

  const lift = React.useCallback(async (denial: Denial) => {
    setLiftingId(denial.id)
    try {
      await apiCallOrThrow('/api/auth/authority/denials', {
        method: 'POST',
        body: JSON.stringify({ action: 'lift', id: denial.id }),
      })
      await queryClient.invalidateQueries({ queryKey: ['auth', 'authority', 'denials'] })
      flash(t('auth.denials.lifted', 'Given back. It applies again on the next request.'), 'success')
    } catch (error) {
      flash(
        error instanceof Error ? error.message : t('auth.denials.liftFailed', 'Could not lift it'),
        'error',
      )
    } finally {
      setLiftingId(null)
    }
  }, [queryClient, t])

  const items = query.data?.items ?? []
  const inForce = items.filter((item) => isInForce(item, now))
  const ended = items.filter((item) => !isInForce(item, now))

  return (
    <Page>
      <PageHeader
        title={t('auth.nav.denials', 'Withheld permissions')}
        description={t(
          'auth.denials.intro',
          'One permission taken from one person, without touching their role. A denial only ever subtracts — it can never grant anything — and it applies to everybody, including superadmins.',
        )}
      />
      <PageBody>
        {query.isLoading ? <LoadingMessage label={t('auth.denials.loading', 'Loading withheld permissions…')} /> : null}
        {query.isError ? <ErrorMessage label={t('auth.denials.loadFailed', 'Could not load withheld permissions')} /> : null}

        {!query.isLoading && !query.isError ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.denials.inForce', 'In force now')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('auth.denials.inForceHint', 'These permissions are being withheld right now.')}
                </p>
              </div>

              {inForce.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t('auth.denials.noneInForce', 'Nothing is withheld from anybody. Everyone can do what their roles allow.')}
                </p>
              ) : (
                <ul className="space-y-3">
                  {inForce.map((denial) => {
                    const until = dateOnly(denial.expiresAt)
                    return (
                      <li key={denial.id} className="rounded-md border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{denial.featurePattern}</p>
                            <p className="text-sm text-muted-foreground">
                              {t('auth.denials.withheldFrom', 'Withheld from {subject}').replace('{subject}', denial.subjectPrincipalId)}
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">{t('auth.denials.why', 'Why')}: </span>
                              {denial.reason}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {until
                                ? t('auth.denials.until', 'until {date}').replace('{date}', until)
                                : t('auth.denials.permanent', 'Permanent — it will not lapse on its own')}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            disabled={liftingId === denial.id}
                            onClick={() => lift(denial)}
                          >
                            {liftingId === denial.id
                              ? t('auth.denials.lifting', 'Giving back…')
                              : t('auth.denials.lift', 'Give it back')}
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.denials.ended', 'Lifted and expired')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('auth.denials.endedHint', 'Kept on purpose — this answers why somebody could not do something at the time, not only what is withheld today.')}
                </p>
              </div>

              {ended.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t('auth.denials.noneEnded', 'Nothing has been lifted or expired yet.')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {ended.map((denial) => (
                    <li key={denial.id} className="rounded-md border border-border p-3 text-sm">
                      <span className="font-medium">{denial.featurePattern}</span>
                      <span className="text-muted-foreground">
                        {' · '}
                        {denial.subjectPrincipalId}
                        {' · '}
                        {denial.liftedAt
                          ? `${t('auth.denials.liftedOn', 'lifted')} ${dateOnly(denial.liftedAt)}`
                          : `${t('auth.denials.expiredOn', 'expired')} ${dateOnly(denial.expiresAt)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-sm text-muted-foreground">
              {t(
                'auth.denials.lockoutHint',
                'A denial applies to superadmins too, so it is possible to withhold something from the only account that could give it back. The way out is on the server: mercato auth denials --tenant <id> --lift <denial-id>.',
              )}
            </p>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}
