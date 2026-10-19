import React from 'react'

/**
 * `CC-139` — the capability ceiling's screen.
 *
 * **The gate is this file, and that is why it is asserted by a test.** A backend page with no
 * `requireFeatures` is an **ungated page** — it renders for whoever can reach the URL — which is
 * `CC-138`'s class one surface over. The capability is the same one the route uses
 * (`directory.tenants.manage`); the *reach* question (*may you move this particular ceiling*) is asked
 * by the route, not here, because the page cannot see the tenant a request will name.
 */
const ceilingIcon = React.createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
  React.createElement('path', { d: 'M3 12h18' }),
  React.createElement('path', { d: 'M6 8h12' }),
  React.createElement('path', { d: 'M9 4h6' }),
  React.createElement('path', { d: 'M12 12v8' }),
)

export const metadata = {
  requireAuth: true,
  requireFeatures: ['directory.tenants.manage'],
  pageTitle: 'Capability ceiling',
  pageTitleKey: 'auth.ceiling.title',
  pageGroup: 'Settings',
  pageGroupKey: 'settings.sections.auth',
  pageOrder: 12,
  icon: ceilingIcon,
  pageContext: 'settings' as const,
  breadcrumb: [{ label: 'Capability ceiling', labelKey: 'auth.ceiling.title' }],
}
