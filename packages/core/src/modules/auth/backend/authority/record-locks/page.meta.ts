import React from 'react'

const lockIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('rect', { x: 4, y: 10, width: 16, height: 10, rx: 2 }),
  React.createElement('path', { d: 'M8 10V7a4 4 0 0 1 8 0v3' }),
)

export const metadata = {
  requireAuth: true,
  /**
   * Seeing what is frozen and thawing it are the same capability.
   *
   * `auth.records.lock` already covers both directions on purpose — its own
   * declaration notes that splitting them would create a role that can stop
   * work and never restart it. The same argument covers reading the list: a
   * lock refuses writes from everybody, so somebody who can see one and not
   * lift it can only watch.
   */
  requireFeatures: ['auth.records.lock'],
  pageTitle: 'Frozen records',
  pageTitleKey: 'auth.nav.recordLocks',
  pageGroup: 'Authority',
  pageGroupKey: 'settings.sections.authority',
  pageOrder: 6,
  icon: lockIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Frozen records', labelKey: 'auth.nav.recordLocks' }],
}
