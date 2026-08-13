import React from 'react'

const handoverIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('path', { d: 'M17 8l4 4-4 4' }),
  React.createElement('path', { d: 'M3 12h18' }),
  React.createElement('path', { d: 'M7 16l-4-4 4-4' }),
)

export const metadata = {
  requireAuth: true,
  /**
   * The same capability that lets somebody lend authority lets them see what is
   * lent.
   *
   * Splitting them would create a role that can grant a delegation and then
   * cannot find it to revoke it — and revocation is the whole safety property
   * of the feature.
   */
  requireFeatures: ['auth.delegations.manage'],
  pageTitle: 'Delegations',
  pageTitleKey: 'auth.nav.delegations',
  pageGroup: 'Authority',
  pageGroupKey: 'settings.sections.authority',
  pageOrder: 2,
  icon: handoverIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Delegations', labelKey: 'auth.nav.delegations' }],
}
