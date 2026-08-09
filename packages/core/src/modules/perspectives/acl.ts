import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'perspectives.use',
    title: 'Use table perspectives',
    module: 'perspectives',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'], note: 'Applying a saved view. It filters what is displayed; it does not widen what may be read.' },
  },
  {
    id: 'perspectives.role_defaults',
    title: 'Manage role default perspectives',
    module: 'perspectives',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Sets the default view for a role. Presentation, not permission — a hidden column is still readable through the API.' },
  },
] as const

export default features
