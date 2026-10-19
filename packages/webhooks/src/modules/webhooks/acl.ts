export const features = [
  {
    id: 'webhooks.view',
    title: 'View webhooks',
    module: 'webhooks',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'webhooks.manage',
    title: 'Manage webhooks',
    module: 'webhooks',
    capability: {
      effectClass: 'E3',
      reversibility: 'reversible',
      externalEffect: true,
      note: 'Writing the configuration is an internal change, but it decides where every future event is sent — so the worst act it permits is data leaving the company, which is what E3 names. Reversible: the endpoint can be changed again.',
    },
  },
  {
    id: 'webhooks.secrets',
    title: 'View and rotate webhook secrets',
    module: 'webhooks',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['secret'],
      note: 'A signing secret is the only thing that lets a receiver tell this tenant\u2019s calls from anybody else\u2019s. Reading it or rotating it is a security change, and rotating it breaks every receiver until they update.',
    },
  },
  {
    id: 'webhooks.test',
    title: 'Test webhooks',
    module: 'webhooks',
    capability: {
      effectClass: 'E3',
      reversibility: 'irreversible',
      externalEffect: true,
      note: 'A test sends a real request to a customer\u2019s endpoint. It cannot be recalled and there is no capability that recalls it, so it is irreversible rather than compensatable — naming a compensation here would promise a remedy nobody can perform.',
    },
  },
]

export default features
