import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'configs.system_status.view',
    title: 'View system status',
    module: 'configs',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'configs.cache.view',
    title: 'View cache overview',
    module: 'configs',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'configs.cache.manage',
    title: 'Manage cache',
    module: 'configs',
    capability: {
      effectClass: 'E1',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      note: 'Clearing a cache destroys only derived state, which rebuilds itself. Genuinely reversible, unusually for something that reads as destructive.',
    },
  },
  {
    id: 'configs.manage',
    title: 'Manage configuration',
    module: 'configs',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      delegable: false,
      note: 'Covers upgrade actions and instance configuration — the settings that decide how everything else behaves.',
    },
  },
]

export default features
