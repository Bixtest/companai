export const features = [
  {
    id: 'channel_gmail.view',
    title: 'View Gmail channel configuration',
    module: 'channel_gmail',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'channel_gmail.configure',
    title: 'Configure Gmail OAuth defaults',
    module: 'channel_gmail',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['confidential', 'secret'],
      note: 'This is an OAuth credential, not a preference. Whoever can write it decides which mailbox the tenant reads, so the class is security rather than an ordinary setting.',
    },
  },
]

export default features
