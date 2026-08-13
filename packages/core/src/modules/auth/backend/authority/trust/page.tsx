'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import {
  TRUST_TIERS,
  TRUST_TIER_NAMES,
  type PromotionCriterion,
  type TrustTier,
} from '@open-mercato/shared/modules/trust'

/**
 * What each worker has earned, and on what evidence.
 *
 * **Why this page reads and does not write.** Promotion is deliberately not a
 * button: the API refuses it unless the evidence passes, and the evidence comes
 * from completed acts, not from an administrator's opinion. A "Promote" control
 * here would spend most of its life returning 409, which teaches people the
 * screen is broken rather than that the bar has not been met.
 *
 * So the page answers the two questions somebody actually arrives with — *what
 * is this worker allowed to do on its own* and *what did it do to earn that* —
 * and leaves the granting to the API, which is where the check lives.
 *
 * **Unverified criteria are shown, not hidden.** A promotion can pass with
 * criteria that could not be checked; those are recorded on the grant precisely
 * so nobody later mistakes "not checked" for "checked and passed".
 */

type TrustGrant = {
  principalId: string
  capabilityGroup: string
  tier: TrustTier
  reason: string | null
  unverified: PromotionCriterion[]
  updatedAt: string
}

const dateOnly = (value: string) => value.slice(0, 10)

export default function TrustPage() {
  const t = useT()

  const query = useQuery({
    queryKey: ['auth', 'authority', 'trust'],
    queryFn: async () =>
      (await apiCallOrThrow<{ items: TrustGrant[] }>('/api/auth/authority/trust')).result,
  })

  // Highest tier first: the rows worth a second look are the ones where
  // something has been granted a lot of room, not the ones sitting at the floor.
  const items = React.useMemo(() => {
    const rows = query.data?.items ?? []
    return [...rows].sort((left, right) => TRUST_TIERS.indexOf(right.tier) - TRUST_TIERS.indexOf(left.tier))
  }, [query.data])

  return (
    <Page>
      <PageHeader
        title={t('auth.nav.trust', 'Earned trust')}
        description={t(
          'auth.trust.intro',
          'How much room each worker has earned in one area of work, and why. Trust is a ceiling like everything else here — a high tier permits less supervision, it never permits an act that policy, the record or the invoker would refuse.',
        )}
      />
      <PageBody>
        {query.isLoading ? <LoadingMessage label={t('auth.trust.loading', 'Loading earned trust…')} /> : null}
        {query.isError ? <ErrorMessage label={t('auth.trust.loadFailed', 'Could not load earned trust')} /> : null}

        {!query.isLoading && !query.isError ? (
          <div className="space-y-8">
            <section className="space-y-3">
              {items.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t(
                    'auth.trust.none',
                    'Nobody has been promoted yet. Every worker sits at the bottom tier, which means it may propose work but cannot carry any out on its own.',
                  )}
                </p>
              ) : (
                <ul className="space-y-3">
                  {items.map((grant) => (
                    <li key={`${grant.principalId}:${grant.capabilityGroup}`} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{grant.capabilityGroup}</p>
                          <p className="text-sm text-muted-foreground">{grant.principalId}</p>
                          {grant.reason ? (
                            <p className="text-sm">
                              <span className="text-muted-foreground">{t('auth.trust.why', 'Why')}: </span>
                              {grant.reason}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            {t('auth.trust.since', 'since {date}').replace('{date}', dateOnly(grant.updatedAt))}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-border px-2 py-1 text-sm">
                          {grant.tier} · {TRUST_TIER_NAMES[grant.tier]}
                        </span>
                      </div>

                      {grant.unverified.length > 0 ? (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="text-sm font-medium">
                            {t('auth.trust.unverified', 'Granted without checking')}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {grant.unverified.map((criterion) => (
                              <li key={criterion.id} className="text-sm text-muted-foreground">
                                {criterion.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.trust.scale', 'What the tiers mean')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'auth.trust.scaleHint',
                    'Each tier sets the most autonomy a worker may reach. Reads are exempt at every tier — a worker that may not read cannot do anything at all.',
                  )}
                </p>
              </div>
              <ul className="space-y-2">
                {TRUST_TIERS.map((tier) => (
                  <li key={tier} className="rounded-md border border-border p-3 text-sm">
                    <span className="font-medium">
                      {tier} · {TRUST_TIER_NAMES[tier]}
                    </span>
                    <span className="text-muted-foreground">
                      {' — '}
                      {t(`auth.trust.tier.${tier}`, TIER_MEANING[tier])}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-sm text-muted-foreground">
              {t(
                'auth.trust.promoteHint',
                'Promotion is not a button. It is granted through the API and refused unless the evidence — completed work and how much of it a reviewer reversed — meets the bar. An administrator cannot decide a worker is trustworthy; the record decides.',
              )}
            </p>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}

/**
 * Each tier said in the terms somebody without the specification would use.
 *
 * These are English defaults behind `auth.trust.tier.*` keys, so a translator
 * changes them in the locale file like every other string.
 */
const TIER_MEANING: Record<TrustTier, string> = {
  T0: 'May propose work for somebody to carry out, and nothing more. Where every worker starts.',
  T1: 'May act, but somebody approves each one before it takes effect.',
  T2: 'May act, with the work reviewed after the fact rather than before.',
  T3: 'May act on its own for most work, with the heavier classes still held back.',
  T4: 'May act on its own up to whatever policy, the record and the invoker allow.',
}
