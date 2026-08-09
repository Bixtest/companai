import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'currencies.view',
    title: 'View currencies',
    module: 'currencies',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['public'] },
  },
  {
    id: 'currencies.manage',
    title: 'Manage currencies',
    module: 'currencies',
    dependsOn: ['currencies.view'],
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'Currency records are referenced by documents already issued. Removing one does not rewrite them, but it does break how they are read.' },
  },
  {
    id: 'currencies.rates.view',
    title: 'View exchange rates',
    module: 'currencies',
    dependsOn: ['currencies.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['public'] },
  },
  {
    id: 'currencies.rates.manage',
    title: 'Manage exchange rates',
    module: 'currencies',
    dependsOn: ['currencies.rates.view'],
    capability: { effectClass: 'E4', reversibility: 'compensatable', compensation: 'currencies.rates.manage', dataClasses: ['internal'], standingApprovable: false, note: 'Not a payment, but a financial effect: an exchange rate decides what every converted amount is worth. Setting it back corrects future arithmetic and not what was already calculated.' },
  },
  {
    id: 'currencies.fetch.view',
    title: 'View currency fetch configuration',
    module: 'currencies',
    dependsOn: ['currencies.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'currencies.fetch.manage',
    title: 'Manage currency fetch configuration',
    module: 'currencies',
    dependsOn: ['currencies.fetch.view'],
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'Chooses which external provider rates come from. The configuration is reversible; the rates it pulls in have financial effect (see currencies.rates.manage).' },
  },
]

export default features
