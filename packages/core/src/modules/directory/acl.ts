import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
    { id: 'directory.tenants.view', title: 'View tenants', module: 'directory',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
    {
        id: 'directory.tenants.manage',
        title: 'Manage tenants',
        module: 'directory',
        dependsOn: ['directory.tenants.view'],
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['internal'], delegable: false, standingApprovable: false, note: 'The tenant is the outermost boundary every other permission is scoped by. Changing it changes what every scope means.' },
  },
    { id: 'directory.organizations.view', title: 'View organizations', module: 'directory',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
    {
        id: 'directory.organizations.manage',
        title: 'Manage organizations',
        module: 'directory',
        dependsOn: ['directory.organizations.view'],
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['internal'], delegable: false, note: 'Organizations decide the scope of nearly every grant. Moving one moves what its members can reach.' },
  },
]

export default features
