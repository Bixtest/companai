import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'api_keys',
  title: 'API Keys',
  version: '0.1.0',
  description: 'Manage access tokens for external API access.',
  author: 'Companai Team',
  license: 'MIT',
  requires: ['auth'],
}

export { features } from './acl'
