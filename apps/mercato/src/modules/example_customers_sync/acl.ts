export const features = [
  {
    id: 'example_customers_sync.view',
    title: 'View Example customer sync diagnostics',
    module: 'example_customers_sync',
    dependsOn: ['customers.people.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example_customers_sync.manage',
    title: 'Manage Example customer sync',
    module: 'example_customers_sync',
    dependsOn: ['example_customers_sync.view'],
    capability: {
      effectClass: 'E2',
      reversibility: 'irreversible',
      dataClasses: ['personal'],
      note: 'A sync overwrites customer records in bulk, and the value it replaces is not kept — so running it again restores the source, not what was there before. Demo code, but the same classification a real sync would get.',
    },
  },
]

export default features
