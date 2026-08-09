import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'translations.view', title: 'View translations', module: 'translations',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'translations.manage', title: 'Manage entity translations', module: 'translations',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'translations.manage_locales', title: 'Configure supported locales', module: 'translations',
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'Adding or removing a locale changes what every translated field resolves to, for everyone at once.' },
  },
]

export default features
