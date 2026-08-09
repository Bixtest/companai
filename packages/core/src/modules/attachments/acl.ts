import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'attachments.view',
    title: 'View attachments',
    module: 'attachments',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'attachments.manage',
    title: 'Manage attachments',
    module: 'attachments',
    capability: {
      effectClass: 'E6',
      reversibility: 'irreversible',
      dataClasses: ['confidential', 'personal'],
      standingApprovable: false,
      note: 'Classified by the worst act it permits, not the most common one. This single feature covers upload and delete, and delete removes the file from storage — the row can be recreated, the bytes cannot.',
    },
  },
]

export default features
