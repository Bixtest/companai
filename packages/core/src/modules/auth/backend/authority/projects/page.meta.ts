import React from 'react'

const foldersIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('path', { d: 'M3 8a2 2 0 0 1 2-2h3l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
  React.createElement('path', { d: 'M8 6V5a2 2 0 0 1 2-2h3l2 2h4a2 2 0 0 1 2 2v6' }),
)

export const metadata = {
  requireAuth: true,
  /**
   * The same capability that sets a project up lets somebody see it.
   *
   * The page carries each matter's grade and how much it governs, which is the
   * shape of the rules rather than the work itself. A role that could read it
   * without being able to change it would learn where the looser matters are
   * and be able to do nothing about it.
   */
  requireFeatures: ['auth.projects.manage'],
  pageTitle: 'Projects',
  pageTitleKey: 'auth.nav.projects',
  pageGroup: 'Authority',
  pageGroupKey: 'settings.sections.authority',
  pageOrder: 5,
  icon: foldersIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Projects', labelKey: 'auth.nav.projects' }],
}
