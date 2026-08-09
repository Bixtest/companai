import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'integrations.view',
    title: 'View integrations and external ID mappings',
    module: 'integrations',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'integrations.manage',
    title: 'Manage integration configurations',
    module: 'integrations',
    capability: {
      effectClass: 'E1',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      note: 'Configuration only. Enabling an integration does not itself reach outside; the acts that do are classified where they happen (data_sync.run).',
    },
  },
  {
    id: 'integrations.credentials.manage',
    title: 'Manage integration credentials',
    module: 'integrations',
    capability: {
      effectClass: 'E5',
      reversibility: 'irreversible',
      dataClasses: ['secret'],
      delegable: false,
      standingApprovable: false,
      auditEventType: 'integrations.credentials.updated',
      note: 'Stores the credentials this platform uses to act on an external system — it decides what we can do in someone else\'s account. Irreversible because the previous secret is overwritten and never snapshotted.',
    },
  },
]

export default features
