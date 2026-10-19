export const features = [
  {
    id: 'storage_providers.manage',
    title: 'Manage storage providers',
    module: 'storage_s3',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['secret'],
      note: 'The feature id is namespaced to the capability rather than to this module, which is deliberate: a second provider package writes the same `storage_providers.manage` row so that one permission covers whichever provider is installed. Writing it configures credentials for where the tenant\u2019s files live.',
    },
  },
]

export default features
