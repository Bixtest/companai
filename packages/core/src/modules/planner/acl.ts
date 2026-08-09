import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'planner.view', title: 'View schedules', module: 'planner',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['personal'] },
  },
  { id: 'planner.manage_availability', title: 'Manage availability', module: 'planner',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['personal'] },
  },
]

export default features
