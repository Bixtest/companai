import React from 'react'

const structuralPermissionsIcon = React.createElement(
  'svg',
  {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  React.createElement('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }),
  React.createElement('path', { d: 'M9 12l2 2 4-4' }),
)

export const metadata = {
  requireAuth: true,
  requireFeatures: ['auth.acl.manage'],
  pageTitle: 'Structural permissions',
  pageTitleKey: 'auth.structuralPermissions.pageTitle',
  pageGroup: 'Auth',
  pageGroupKey: 'settings.sections.auth',
  pageOrder: 3,
  icon: structuralPermissionsIcon,
  pageContext: 'settings' as const,
  breadcrumb: [
    { label: 'Structural permissions', labelKey: 'auth.structuralPermissions.pageTitle' },
  ],
} as const
