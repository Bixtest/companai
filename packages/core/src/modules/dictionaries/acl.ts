import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'dictionaries.view', title: 'View shared dictionaries', module: 'dictionaries',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'dictionaries.manage', title: 'Manage shared dictionaries', module: 'dictionaries',
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['internal'], note: 'Dictionary entries are referenced by records across modules. Removing one leaves those references pointing at nothing.' },
  },
]

export default features
