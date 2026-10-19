export const features = [
  {
    id: 'search.view',
    title: 'View search settings',
    module: 'search',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'search.manage',
    title: 'Manage search settings',
    module: 'search',
    capability: { effectClass: 'E1', reversibility: 'reversible' },
  },
  {
    id: 'search.reindex',
    title: 'Reindex search data',
    module: 'search',
    capability: {
      effectClass: 'E2',
      reversibility: 'reversible',
      note: 'Internal and bulk: it rewrites the whole index rather than one record, which is the reason for E2 rather than E1. It is reversible because running it again rebuilds the same index from the same source.',
    },
  },
  {
    id: 'search.embeddings.view',
    title: 'View embedding settings',
    module: 'search',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'search.embeddings.manage',
    title: 'Manage embedding settings',
    module: 'search',
    capability: {
      effectClass: 'E2',
      reversibility: 'reversible',
      note: 'Changing the embedding model invalidates every stored vector, so the next index is a bulk rebuild that costs real money to compute. Reversible in the sense that matters: the data is derived and can be rebuilt.',
    },
  },
  {
    id: 'search.global',
    title: 'Use global search (Cmd+K)',
    module: 'search',
    capability: {
      effectClass: 'E0',
      reversibility: 'reversible',
      note: 'It reads only what the actor may already read: the results are filtered by the same permissions that guard the records themselves, so the act adds reach across modules, not access across them.',
    },
  },
]

export default features
