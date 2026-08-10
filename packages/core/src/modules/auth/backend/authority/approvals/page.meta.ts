import React from 'react'

const inboxIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('path', { d: 'M22 12h-6l-2 3h-4l-2-3H2' }),
  React.createElement('path', { d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }),
)

export const metadata = {
  requireAuth: true,
  /**
   * The same capability that lets somebody resolve an act lets them see the
   * queue.
   *
   * Splitting them would create a role that watches work pile up and can do
   * nothing about it, and a held act carries what somebody was trying to do —
   * which is not neutral information.
   */
  requireFeatures: ['auth.authority.approve'],
  pageTitle: 'Approvals',
  pageTitleKey: 'auth.nav.approvals',
  pageGroup: 'Authority',
  pageGroupKey: 'settings.sections.authority',
  pageOrder: 1,
  icon: inboxIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Approvals', labelKey: 'auth.nav.approvals' }],
}
