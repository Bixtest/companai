import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'business_rules.view', title: 'View business rules', module: 'business_rules',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'business_rules.manage', title: 'Create, edit, and delete business rules', module: 'business_rules',
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['internal'], delegable: false, note: 'A rule\'s actions include CallWebhook and Notify, and rules fire without anyone present. Writing one is closer to changing what the system is permitted to do than to editing a record — which is why this is E5 rather than an ordinary write.' },
  },
  { id: 'business_rules.execute', title: 'Execute business rules manually', module: 'business_rules',
    capability: { effectClass: 'E3', reversibility: 'irreversible', externalEffect: true, dataClasses: ['confidential'], note: 'Runs a rule now, including its webhook actions. Manual execution is the same act as automatic execution, with a person attached.' },
  },
  { id: 'business_rules.view_logs', title: 'View rule execution logs', module: 'business_rules',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'], note: 'Execution logs carry the data the rule evaluated.' },
  },
  { id: 'business_rules.manage_sets', title: 'Manage rule sets', module: 'business_rules',
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['internal'], delegable: false, note: 'Grouping and ordering decide which rules fire and in what sequence — the same authority as writing them.' },
  },
]

export default features
