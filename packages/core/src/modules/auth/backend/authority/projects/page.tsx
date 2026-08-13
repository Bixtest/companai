'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { LoadingMessage, ErrorMessage } from '@open-mercato/ui/backend/detail'
import { apiCallOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import type { TaskGrade } from '@open-mercato/shared/modules/capabilities'

/**
 * The matters work is organised into, and how much each one governs.
 *
 * A project does two things to the acts inside it: it grades them, and it can
 * narrow what its members may do there. Both are invisible from the record
 * itself — somebody looking at a held act sees the answer, not the matter that
 * shaped it — so this page exists to make the shaping visible.
 *
 * **An ungraded project is shown as saying nothing, not as `G0`.** That
 * distinction is the whole reason `grade` is nullable: a matter nobody has
 * graded leaves acts at their ordinary baseline, and reading the blank as
 * "negligible" would quietly lower every act inside it.
 *
 * Read-only, matching the route. Creating a project, adding a member with an
 * overlay and assigning records are three acts with three different blast
 * radii, and collapsing them into one form would hide that.
 */

type ProjectSummary = {
  id: string
  name: string
  grade: TaskGrade | null
  closedAt: string | null
  updatedAt: string
  memberCount: number
  recordCount: number
}

const dateOnly = (value: string) => value.slice(0, 10)

export default function ProjectsPage() {
  const t = useT()

  const query = useQuery({
    queryKey: ['auth', 'authority', 'projects'],
    queryFn: async () =>
      (await apiCallOrThrow<{ items: ProjectSummary[] }>('/api/auth/authority/projects')).result,
  })

  const items = query.data?.items ?? []
  const open = items.filter((item) => !item.closedAt)
  const closed = items.filter((item) => item.closedAt)

  const grade = (project: ProjectSummary) =>
    project.grade
      ? `${project.grade} · ${t(`auth.projects.grade.${project.grade}`, GRADE_MEANING[project.grade])}`
      : t('auth.projects.ungraded', 'Not graded — acts here stay at their ordinary level')

  const scale = (project: ProjectSummary) =>
    t('auth.projects.scale', '{members} working here · {records} records governed')
      .replace('{members}', String(project.memberCount))
      .replace('{records}', String(project.recordCount))

  return (
    <Page>
      <PageHeader
        title={t('auth.nav.projects', 'Projects')}
        description={t(
          'auth.projects.intro',
          'The matters work is organised into. A project grades how consequential the work inside it is, and can narrow what its members may do there — it can never widen it, which is what makes it an overlay rather than a second set of permissions.',
        )}
      />
      <PageBody>
        {query.isLoading ? <LoadingMessage label={t('auth.projects.loading', 'Loading projects…')} /> : null}
        {query.isError ? <ErrorMessage label={t('auth.projects.loadFailed', 'Could not load projects')} /> : null}

        {!query.isLoading && !query.isError ? (
          <div className="space-y-8">
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.projects.open', 'Open')}</h2>
              </div>

              {open.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t(
                    'auth.projects.noneOpen',
                    'No open projects. Work is being governed by the ordinary rules — roles, policy and each record’s own state.',
                  )}
                </p>
              ) : (
                <ul className="space-y-3">
                  {open.map((project) => (
                    <li key={project.id} className="rounded-md border border-border p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{grade(project)}</p>
                        <p className="text-xs text-muted-foreground">{scale(project)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{t('auth.projects.closed', 'Closed')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'auth.projects.closedHint',
                    'Still governing. Closing a matter does not un-govern the records inside it — if anything the rules matter more afterwards, when nobody is watching it day to day.',
                  )}
                </p>
              </div>

              {closed.length === 0 ? (
                <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {t('auth.projects.noneClosed', 'Nothing has been closed yet.')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {closed.map((project) => (
                    <li key={project.id} className="rounded-md border border-border p-3 text-sm">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-muted-foreground">
                        {' · '}
                        {t('auth.projects.closedOn', 'closed')} {dateOnly(project.closedAt as string)}
                        {' · '}
                        {scale(project)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-sm text-muted-foreground">
              {t(
                'auth.projects.writeHint',
                'Projects are set up through the API. Creating one, adding somebody with a narrowed overlay and assigning records to it are three separate acts with three different consequences, and are deliberately not collapsed into one form here.',
              )}
            </p>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}

/**
 * Each grade said plainly, as English defaults behind `auth.projects.grade.*`.
 *
 * A grade describes the *work*, not the permission: it raises how much care an
 * act inside the matter needs, and like everything else here it can only ever
 * narrow what happens.
 */
const GRADE_MEANING: Record<TaskGrade, string> = {
  G0: 'Routine work with no effect outside the platform',
  G1: 'Ordinary work with limited reach',
  G2: 'Work that reaches customers or money',
  G3: 'Work that is hard to undo, or that others depend on',
  G4: 'Work with consequences the business cannot absorb',
}
