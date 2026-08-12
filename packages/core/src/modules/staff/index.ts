import type { ModuleInfo } from '@open-mercato/shared/modules/registry'

export const metadata: ModuleInfo = {
  name: 'staff',
  title: 'Employees',
  version: '0.1.0',
  description: 'Teams, roles, and employee rosters.',
  author: 'Companai Team',
  license: 'MIT',
  requires: ['planner', 'resources'],
  ejectable: true,
}

export { features } from './acl'
