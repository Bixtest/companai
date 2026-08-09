import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'data_sync.view',
    title: 'View sync runs',
    module: 'data_sync',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'data_sync.run',
    title: 'Run sync operations',
    module: 'data_sync',
    capability: {
      effectClass: 'E3',
      reversibility: 'compensatable',
      compensation: 'data_sync.run',
      externalEffect: true,
      dataClasses: ['confidential', 'personal'],
      note: 'Exchanges records with an external system. Outbound, it writes our data into somebody else\'s. The compensation is another sync, which is honest rather than satisfying: there is no undo for data already delivered.',
    },
  },
  {
    id: 'data_sync.configure',
    title: 'Configure sync mappings and schedules',
    module: 'data_sync',
    capability: {
      effectClass: 'E2',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      note: 'Configuration is reversible, but it decides what every later run sends — a mapping change is how a routine sync starts exporting a field nobody agreed to share.',
    },
  },
]

export default features
