import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'messages.view', title: 'View messages', module: 'messages',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential', 'personal'] },
  },
  { id: 'messages.compose', title: 'Compose messages', module: 'messages',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['confidential'], note: 'Internal composition only. Sending outside needs messages.email, which is classified separately and much higher.' },
  },
  { id: 'messages.attach', title: 'Attach records to messages', module: 'messages',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  { id: 'messages.attach_files', title: 'Attach files to messages', module: 'messages',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  { id: 'messages.email', title: 'Send messages via email', module: 'messages',
    capability: { effectClass: 'E3', reversibility: 'irreversible', externalEffect: true, dataClasses: ['confidential', 'personal'], standingApprovable: false, note: 'Delivers a message by email. A sent message cannot be recalled, so there is no compensation to name — only a correction, which is a different act.' },
  },
  { id: 'messages.actions', title: 'Execute message actions', module: 'messages',
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['confidential'], note: 'Runs the actions a message declares. Its ceiling is whatever those actions do, which is why it is not classified as an ordinary write.' },
  },
  { id: 'messages.manage', title: 'Manage all messages', module: 'messages',
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['confidential', 'personal'], standingApprovable: false, note: 'Moderation over everyone\'s messages. No single route enforces it today, so the class reflects what the title permits rather than what one handler does.' },
  },
]

export default features
