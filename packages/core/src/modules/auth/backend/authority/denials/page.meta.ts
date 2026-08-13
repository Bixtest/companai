import React from 'react'

const blockIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('circle', { cx: 12, cy: 12, r: 9 }),
  React.createElement('path', { d: 'M5.6 5.6l12.8 12.8' }),
)

export const metadata = {
  requireAuth: true,
  /**
   * Seeing what is withheld and lifting it are the same capability.
   *
   * A role that can see a denial but not lift it would be able to watch
   * somebody be locked out and do nothing, and the list itself carries the
   * reason — which is not neutral information about a colleague.
   */
  requireFeatures: ['auth.denials.manage'],
  pageTitle: 'Withheld permissions',
  pageTitleKey: 'auth.nav.denials',
  pageGroup: 'Authority',
  pageGroupKey: 'settings.sections.authority',
  pageOrder: 3,
  icon: blockIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Withheld permissions', labelKey: 'auth.nav.denials' }],
}
