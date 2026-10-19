/**
 * Feature flags for the scheduler module
 */
export const features = [
  {
    id: 'scheduler.jobs.view',
    title: 'View schedules',
    module: 'scheduler',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'scheduler.jobs.manage',
    title: 'Manage schedules',
    module: 'scheduler',
    capability: {
      effectClass: 'E2',
      reversibility: 'irreversible',
      note: 'Deleting a schedule cannot be undone in the way that matters: the runs it would have made are simply never made, and recreating it does not produce them. E2 rather than E6 because what is destroyed is configuration, not records or data.',
    },
  },
  {
    id: 'scheduler.jobs.trigger',
    title: 'Trigger schedules',
    module: 'scheduler',
    capability: {
      effectClass: 'E3',
      reversibility: 'irreversible',
      externalEffect: true,
      note: 'A triggered job does whatever the job does, and the worst of those reaches outside the company. It is irreversible because nothing here recalls a job that has already run, and naming a compensation would promise a remedy nobody can perform.',
    },
  },
]

export default features
