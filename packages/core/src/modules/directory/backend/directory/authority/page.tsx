'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { apiCallOrThrow, withScopedApiRequestHeaders } from '@open-mercato/ui/backend/utils/apiCall'
import { buildOptimisticLockHeader } from '@open-mercato/ui/backend/utils/optimisticLock'
import { surfaceRecordConflict } from '@open-mercato/ui/backend/conflicts'
import { Button } from '@open-mercato/ui/primitives/button'
import { useT } from '@open-mercato/shared/lib/i18n/context'

/**
 * The authority graph, as something a person can change.
 *
 * R6 gave organizations typed edges carrying how much authority flows down them,
 * seeded permissively so nothing changed on the day it landed. Until this page
 * existed the feature was real and unreachable: lowering a ceiling meant writing
 * SQL.
 *
 * The page is deliberately plain — a table and a row editor. What it must do
 * well is **say what an edge means**, because "A2" and "reference_only" are not
 * self-explanatory and a wrong guess here quietly changes what people below can
 * do.
 */

type Edge = {
  id: string
  parentId: string
  childId: string
  relationshipType: string
  inheritanceMode: string
  authorityCeiling: string
  moduleGrants: string[] | null
  note: string | null
  updatedAt: string | null
}

type Organization = { id: string; name: string }

const GATES: Array<{ value: string; meaning: string }> = [
  { value: 'A5', meaning: 'acts and is logged' },
  { value: 'A4', meaning: 'acts, then reviewed' },
  { value: 'A3', meaning: 'acts after a hold window' },
  { value: 'A2', meaning: 'needs approval first' },
  { value: 'A1', meaning: 'may only propose' },
  { value: 'A0', meaning: 'may not act' },
]

const MODES: Array<{ value: string; meaning: string }> = [
  { value: 'strict', meaning: 'authority flows down' },
  { value: 'flexible', meaning: 'authority flows down' },
  { value: 'reference_only', meaning: 'visible, inherits nothing' },
  { value: 'none', meaning: 'inherits nothing' },
]

const TYPES = ['owns', 'manages', 'supervises', 'licenses', 'templates', 'serves', 'advises']

export default function AuthorityGraphPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const [savingId, setSavingId] = React.useState<string | null>(null)

  const edgesQuery = useQuery({
    queryKey: ['directory', 'organization-edges'],
    queryFn: async () => (await apiCallOrThrow<{ items: Edge[] }>('/api/directory/organization-edges')).result,
  })

  const orgsQuery = useQuery({
    queryKey: ['directory', 'organizations', 'lookup'],
    queryFn: async () => (await apiCallOrThrow<{ items: Organization[] }>('/api/directory/organizations?pageSize=200')).result,
  })

  const nameOf = React.useCallback(
    (id: string) => orgsQuery.data?.items?.find((org: Organization) => org.id === id)?.name ?? id,
    [orgsQuery.data],
  )

  const save = React.useCallback(async (edge: Edge, changes: Partial<Edge>) => {
    setSavingId(edge.id)
    try {
      // The version the edit was made against. Without it, two tabs editing the
      // same ceiling produce whichever save landed last and the other person's
      // intent vanishes — which, for authority configuration, is a security
      // change nobody chose.
      await withScopedApiRequestHeaders(
        buildOptimisticLockHeader(edge.updatedAt),
        () => apiCallOrThrow('/api/directory/organization-edges', {
          method: 'PATCH',
          body: JSON.stringify({ id: edge.id, ...changes }),
        }),
      )
      flash(t('directory.authority.saved', 'Authority edge updated'), 'success')
      await queryClient.invalidateQueries({ queryKey: ['directory', 'organization-edges'] })
    } catch (err) {
      if (!surfaceRecordConflict(err, t)) {
        flash(t('directory.authority.save_failed', 'Could not update the authority edge'), 'error')
      }
    } finally {
      setSavingId(null)
    }
  }, [queryClient, t])

  if (edgesQuery.isLoading) return <LoadingMessage label={t('directory.authority.loading', 'Loading authority graph...')} />
  if (edgesQuery.isError) return <ErrorMessage label={t('directory.authority.load_failed', 'Failed to load the authority graph')} />

  const edges = edgesQuery.data?.items ?? []

  return (
    <Page>
      <PageHeader title={t('directory.authority.title', 'Authority graph')} />
      <PageBody>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground max-w-3xl">
            {t(
              'directory.authority.intro',
              'Each row is a link between two organizations, and the ceiling is the most autonomy that may flow down it. Lowering a ceiling restricts everyone below, whatever their own permissions say. Raising one only removes a restriction this link was imposing — it grants nothing on its own.',
            )}
          </p>

          {edges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(
                'directory.authority.empty',
                'No authority edges yet. One is created automatically for each parent-child link between organizations, so this stays empty until the organization tree has more than one level.',
              )}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-3 text-left font-medium">{t('directory.authority.link', 'Link')}</th>
                    <th className="p-3 text-left font-medium">{t('directory.authority.relationship', 'Relationship')}</th>
                    <th className="p-3 text-left font-medium">{t('directory.authority.inheritance', 'Inheritance')}</th>
                    <th className="p-3 text-left font-medium">{t('directory.authority.ceiling', 'Authority ceiling')}</th>
                  </tr>
                </thead>
                <tbody>
                  {edges.map((edge: Edge) => (
                    <tr key={edge.id} className="border-t border-border align-top">
                      <td className="p-3">
                        <div className="font-medium">{nameOf(edge.parentId)}</div>
                        <div className="text-xs text-muted-foreground">→ {nameOf(edge.childId)}</div>
                      </td>
                      <td className="p-3">
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1"
                          value={edge.relationshipType}
                          disabled={savingId === edge.id}
                          onChange={(event) => save(edge, { relationshipType: event.target.value })}
                        >
                          {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1"
                          value={edge.inheritanceMode}
                          disabled={savingId === edge.id}
                          onChange={(event) => save(edge, { inheritanceMode: event.target.value })}
                        >
                          {MODES.map((mode) => (
                            <option key={mode.value} value={mode.value}>{mode.value} — {mode.meaning}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          className="rounded-md border border-input bg-background px-2 py-1"
                          value={edge.authorityCeiling}
                          disabled={savingId === edge.id}
                          onChange={(event) => save(edge, { authorityCeiling: event.target.value })}
                        >
                          {GATES.map((gate) => (
                            <option key={gate.value} value={gate.value}>{gate.value} — {gate.meaning}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground max-w-3xl">
            {t(
              'directory.authority.scope_note',
              'Only links that lie on the organization tree affect a decision today. Other typed relationships can be recorded through the API and are kept for future use, but they do not change anyone’s authority yet.',
            )}
          </p>

          <div>
            <Button variant="outline" size="sm" onClick={() => edgesQuery.refetch()}>
              {t('directory.authority.refresh', 'Refresh')}
            </Button>
          </div>
        </div>
      </PageBody>
    </Page>
  )
}
