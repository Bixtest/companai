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
 * Authority lent for a while, as something a person can see and take back.
 *
 * G3 built delegations and shipped no screen, so the only way to revoke one was
 * an API call. That is the wrong shape for this feature in particular: a
 * delegation's entire safety property is that somebody can end it early, and a
 * control you need a terminal for is a control most people will not use.
 *
 * **The page shows revoked delegations too.** This is a record of what authority
 * was lent, not a list of what is currently in force — "who could approve
 * payments last March" is the question it will actually be asked.
 */

type Delegation = {
  id: string
  granteePrincipalId: string
  grantorPrincipalId: string
  capabilityId: string
  organizationId: string | null
  startsAt: string
  expiresAt: string
  revokedAt: string | null
  authorityCeiling: string | null
  reason: string
}

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : '—')

/** In force right now — the same three questions the resolver asks. */
function isActive(delegation: Delegation, now: number): boolean {
  if (delegation.revokedAt) return false
  if (new Date(delegation.startsAt).getTime() > now) return false
  return new Date(delegation.expiresAt).getTime() > now
}

export default function DelegationsPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [revokingId, setRevokingId] = React.useState<string | null>(null)
  const now = Date.now()

  const query = useQuery({
    queryKey: ['auth', 'authority', 'delegations'],
    queryFn: async () =>
      (await apiCallOrThrow<{ items: Delegation[] }>('/api/auth/authority/delegations')).result,
  })

  const revoke = React.useCallback(async (delegation: Delegation) => {
    setRevokingId(delegation.id)
    try {
      await apiCallOrThrow('/api/auth/authority/delegations', {
        method: 'POST',
        body: JSON.stringify({ action: 'revoke', id: delegation.id }),
      })
      // Delegations are never cached — a revoke binds on the next request rather
      // than when a cache expires — so refetching shows the truth immediately.
      await queryClient.invalidateQueries({ queryKey: ['auth', 'authority', 'delegations'] })
      flash(t('auth.delegations.revoked', 'Revoked. It stops granting on the next request.'), 'success')
    } catch (error) {
      flash(
        error instanceof Error ? error.message : t('auth.delegations.revokeFailed', 'Could not revoke it'),
        'error',
      )
    } finally {
      setRevokingId(null)
    }
  }, [queryClient, t])

  const items = query.data?.items ?? []
  const active = items.filter((item) => isActive(item, now))
  const past = items.filter((item) => !isActive(item, now))

  return (
    <Page>
      <PageHeader
        title={t('auth.nav.delegations', 'Delegations')}
        description={t(
          'auth.delegations.intro',
          'Authority one person lent another for a while. A delegation grants — it is the only thing here that does — so each one has an end date and a reason, and can be taken back at any time.',
        )}
      />
      <PageBody>
        {query.isLoading ? <LoadingMessage label={t('auth.delegations.loading', 'Loading delegations…')} /> : null}
        {query.isError ? <ErrorMessage label={t('auth.delegations.loadFailed', 'Could not load delegations')} /> : null}

        {!query.isLoading && !query.isError ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.delegations.inForce', 'In force now')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('auth.delegations.inForceHint', 'These are granting authority right now.')}
                </p>
              </div>

              {active.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t('auth.delegations.noneActive', 'Nobody is acting under a delegation. Authority is being used only by the people who hold it themselves.')}
                </p>
              ) : (
                <ul className="space-y-3">
                  {active.map((delegation) => (
                    <li key={delegation.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{delegation.capabilityId}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('auth.delegations.fromTo', 'From {grantor} to {grantee}')
                              .replace('{grantor}', delegation.grantorPrincipalId)
                              .replace('{grantee}', delegation.granteePrincipalId)}
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">{t('auth.delegations.why', 'Why')}: </span>
                            {delegation.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dateOnly(delegation.startsAt)} → {dateOnly(delegation.expiresAt)}
                            {delegation.authorityCeiling
                              ? ` · ${t('auth.delegations.cappedAt', 'capped at')} ${delegation.authorityCeiling}`
                              : ''}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          disabled={revokingId === delegation.id}
                          onClick={() => revoke(delegation)}
                        >
                          {revokingId === delegation.id
                            ? t('auth.delegations.revoking', 'Revoking…')
                            : t('auth.delegations.revoke', 'Revoke')}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.delegations.past', 'Expired and revoked')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('auth.delegations.pastHint', 'Kept deliberately. This is a record of what authority was lent, not only of what is in force.')}
                </p>
              </div>

              {past.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t('auth.delegations.nonePast', 'Nothing has expired or been revoked yet.')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {past.map((delegation) => (
                    <li key={delegation.id} className="rounded-md border border-border p-3 text-sm">
                      <span className="font-medium">{delegation.capabilityId}</span>
                      <span className="text-muted-foreground">
                        {' · '}
                        {delegation.granteePrincipalId}
                        {' · '}
                        {delegation.revokedAt
                          ? `${t('auth.delegations.revokedOn', 'revoked')} ${dateOnly(delegation.revokedAt)}`
                          : `${t('auth.delegations.expiredOn', 'expired')} ${dateOnly(delegation.expiresAt)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-sm text-muted-foreground">
              {t(
                'auth.delegations.createHint',
                'Delegations are granted through the API. A screen for granting one needs a person picker and a capability picker, and is deliberately not guessed at here.',
              )}
            </p>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}
