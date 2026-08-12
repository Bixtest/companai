import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'dashboards',
  title: 'Admin Dashboards',
  version: '0.1.0',
  description: 'Configurable admin dashboard with module-provided widgets.',
  author: 'Companai Team',
  license: 'MIT',
}

export { features } from './acl'
