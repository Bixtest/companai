export const features = [
  {
    id: 'channel_imap.view',
    title: 'View IMAP channel configuration',
    module: 'channel_imap',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'channel_imap.configure',
    title: 'Configure IMAP channel defaults',
    module: 'channel_imap',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['confidential', 'secret'],
      note: 'A mail credential, and the same reasoning as the Gmail channel: writing it decides which mailbox the tenant reads, which is a security change rather than a preference.',
    },
  },
]

export default features
