import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'query_index.status.view', title: 'View index status', module: 'query_index',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'query_index.reindex',
    title: 'Trigger reindex',
    module: 'query_index',
    dependsOn: ['query_index.status.view'],
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Rebuilds derived data from the source of truth. Expensive, not dangerous.' },
  },
  {
    id: 'query_index.purge',
    title: 'Purge index',
    module: 'query_index',
    dependsOn: ['query_index.status.view'],
    capability: { effectClass: 'E2', reversibility: 'compensatable', compensation: 'query_index.reindex', dataClasses: ['internal'], note: 'Destroys the index. Nothing authoritative is lost — but search and every list built on it are wrong until the rebuild finishes.' },
  },
]

export default features
