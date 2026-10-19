export const features = [
  {
    id: 'example.backend',
    title: 'Access example backend',
    module: 'example',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example.view',
    title: 'View example enrichments',
    module: 'example',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example.todos.view',
    title: 'View todos',
    module: 'example',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example.todos.manage',
    title: 'Manage todos',
    module: 'example',
    dependsOn: ['example.todos.view'],
    capability: {
      effectClass: 'E6',
      reversibility: 'irreversible',
      note: 'Demo code, classified honestly rather than waved through: the same feature covers creating a todo and deleting it, and nothing keeps the deleted row.',
    },
  },
  {
    id: 'example.widgets.injection',
    title: 'Use injection widgets',
    module: 'example',
    dependsOn: ['example.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example.widgets.todo',
    title: 'Use dashboard todo widget',
    module: 'example',
    dependsOn: ['example.todos.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example.widgets.welcome',
    title: 'Use dashboard welcome widget',
    module: 'example',
    dependsOn: ['example.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'example.widgets.notes',
    title: 'Use dashboard notes widget',
    module: 'example',
    dependsOn: ['example.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
]

export default features
