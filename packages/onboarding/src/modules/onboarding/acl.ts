export const features = [
  {
    id: 'onboarding.access',
    title: 'Access onboarding flow',
    module: 'onboarding',
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'onboarding.submit',
    title: 'Submit onboarding request',
    module: 'onboarding',
    dependsOn: ['onboarding.access'],
    capability: {
      effectClass: 'E1',
      reversibility: 'reversible',
      dataClasses: ['personal'],
      note: 'A submitted request is an ordinary internal write: it can be withdrawn or corrected, and it changes nothing until somebody verifies it.',
    },
  },
  {
    id: 'onboarding.verify',
    title: 'Verify onboarding request',
    module: 'onboarding',
    dependsOn: ['onboarding.access'],
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['personal'],
      note: 'Verifying admits an identity into the tenant. It is reversible (the admission can be refused or withdrawn) but it is still a security decision, so it is classified by what it decides rather than by how it is undone.',
    },
  },
]

export default features
