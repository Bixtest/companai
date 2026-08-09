import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'notifications.view', title: 'View own notifications', module: 'notifications',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'notifications.create', title: 'Create notifications for others', module: 'notifications',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'In-app only. Delivery to email or push is a different module\'s act.' },
  },
  { id: 'notifications.manage', title: 'Manage all notifications', module: 'notifications',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'] },
  },
]

export default features
