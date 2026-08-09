import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'progress.view',
    title: 'View progress jobs',
    module: 'progress',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'progress.create',
    title: 'Create progress jobs',
    module: 'progress',
    dependsOn: ['progress.view'],
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Job bookkeeping. The tracked operation is audited by whatever started it; this is the progress bar.' },
  },
  {
    id: 'progress.update',
    title: 'Update progress jobs',
    module: 'progress',
    dependsOn: ['progress.view'],
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'progress.cancel',
    title: 'Cancel progress jobs',
    module: 'progress',
    dependsOn: ['progress.view'],
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['internal'], note: 'Stops a running operation part-way. The job record is trivial; the half-finished work it abandons is not.' },
  },
  {
    id: 'progress.manage',
    title: 'Manage all progress jobs',
    module: 'progress',
    dependsOn: ['progress.view'],
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['internal'], note: 'Includes cancelling other people\'s jobs.' },
  },
]

export default features
