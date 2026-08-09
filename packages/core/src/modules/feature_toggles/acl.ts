import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'feature_toggles.view',
    title: 'View feature toggles',
    module: 'feature_toggles',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'feature_toggles.manage',
    title: 'Manage per-tenant feature toggle overrides',
    module: 'feature_toggles',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      note: 'A toggle decides whether a capability exists at all for this tenant. Turning one on is not a write to a record, it is a change to what the system permits.',
    },
  },
  {
    id: 'feature_toggles.global.manage',
    title: 'Manage system-wide global feature toggles',
    module: 'feature_toggles',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      delegable: false,
      standingApprovable: false,
      note: 'The same act, across every tenant on the instance. Blast radius, not mechanism, is what separates it from the per-tenant version.',
    },
  },
]

export default features
