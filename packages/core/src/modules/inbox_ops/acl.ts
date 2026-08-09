import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'inbox_ops.proposals.view',
    title: 'View proposals',
    module: 'inbox_ops',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential', 'personal'] },
  },
  {
    id: 'inbox_ops.proposals.manage',
    title: 'Manage proposals',
    module: 'inbox_ops',
    capability: {
      effectClass: 'E2',
      reversibility: 'compensatable',
      compensation: 'audit_logs.undo_tenant',
      dataClasses: ['confidential', 'personal'],
      evidenceRequired: true,
      auditEventType: 'inbox_ops.proposal_action.accepted',
      note: 'Accepting a proposal executes what a model suggested, against other modules. Its own effect class is the ceiling of whatever it executes, which is why it is not classed E1. Evidence is required: the source email is the evidence, and an approval without it is unexplainable afterwards.',
    },
  },
  {
    id: 'inbox_ops.settings.manage',
    title: 'Manage inbox settings',
    module: 'inbox_ops',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['secret'],
      delegable: false,
      auditEventType: 'inbox_ops.settings.updated',
      note: 'Sets the webhook signing secret, which decides who may inject email into this tenant — a security boundary wearing the costume of a settings page.',
    },
  },
  {
    id: 'inbox_ops.log.view',
    title: 'View processing log',
    module: 'inbox_ops',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential', 'personal'] },
  },
  {
    id: 'inbox_ops.replies.send',
    title: 'Send draft replies',
    module: 'inbox_ops',
    capability: {
      effectClass: 'E3',
      reversibility: 'irreversible',
      externalEffect: true,
      dataClasses: ['confidential', 'personal'],
      standingApprovable: false,
      evidenceRequired: true,
      auditEventType: 'inbox_ops.reply.completed',
      note: 'Sends an email to a customer, from text a model drafted. A sent message cannot be recalled, so there is no compensation to name — only a correction, which is a different act.',
    },
  },
]

export default features
