import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'dashboards.view', title: 'View dashboard', module: 'dashboards',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'dashboards.configure', title: 'Customize dashboard layout', module: 'dashboards',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Layout only — this is the per-user view state that is deliberately excluded from the audit trail as well.' },
  },
  { id: 'dashboards.admin.assign-widgets', title: 'Manage dashboard widget availability', module: 'dashboards',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Decides which widgets are offered, not who may see the data behind them. Hiding a widget grants and revokes nothing.' },
  },
  { id: 'analytics.view', title: 'View analytics widgets', module: 'dashboards',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'], note: 'Lives in the dashboards module but belongs to the shared analytics namespace, which is why the id does not start with the module name.' },
  },
]

export default features
