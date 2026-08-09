import React from 'react'

const shieldIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }),
  React.createElement('path', { d: 'M9 12l2 2 4-4' }),
)

export const metadata = {
  requireAuth: true,
  // Reading the graph is reading the organization structure. Changing it is
  // guarded separately, inside the page, by `directory.organizations.manage`.
  requireFeatures: ['directory.organizations.view'],
  pageTitle: 'Authority graph',
  pageTitleKey: 'directory.nav.authority',
  pageGroup: 'Directory',
  pageGroupKey: 'settings.sections.directory',
  pageOrder: 3,
  icon: shieldIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Authority graph', labelKey: 'directory.nav.authority' }],
}
