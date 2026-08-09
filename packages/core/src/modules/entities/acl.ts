import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'entities.definitions.view', title: 'View custom field definitions', module: 'entities',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'entities.definitions.manage',
    title: 'Manage custom field definitions',
    module: 'entities',
    dependsOn: ['entities.definitions.view'],
    capability: { effectClass: 'E2', reversibility: 'compensatable', compensation: 'entities.definitions.manage', dataClasses: ['internal'], note: 'Schema, not records: adding and removing custom fields. Definitions are soft-deleted and there is a restore route, which is why this is compensatable rather than destructive.' },
  },
  { id: 'entities.records.view', title: 'View records', module: 'entities',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential', 'personal'] },
  },
  {
    id: 'entities.records.manage',
    title: 'Manage records',
    module: 'entities',
    dependsOn: ['entities.records.view'],
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['confidential', 'personal'], note: 'Create, edit and delete across arbitrary custom entities — the blast radius is whatever the tenant has modelled.' },
  },
]

export default features
