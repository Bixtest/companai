import React from 'react'

const risingIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
  React.createElement('path', { d: 'M3 17l6-6 4 4 8-8' }),
  React.createElement('path', { d: 'M21 7v5h-5' }),
)

export const metadata = {
  requireAuth: true,
  /**
   * Gated on the promote capability, though the page only reads.
   *
   * There is no separate read feature and inventing one would be worse: the
   * list carries each grant's reason and what went unchecked, which is an
   * argument about how far a worker can be relied on rather than neutral
   * information. Whoever may raise a worker's autonomy is exactly who should
   * see what has already been raised — and reusing the existing feature keeps
   * `acl.ts` the single place trust is described.
   */
  requireFeatures: ['auth.trust.promote'],
  pageTitle: 'Earned trust',
  pageTitleKey: 'auth.nav.trust',
  pageGroup: 'Authority',
  pageGroupKey: 'settings.sections.authority',
  pageOrder: 4,
  icon: risingIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Earned trust', labelKey: 'auth.nav.trust' }],
}
