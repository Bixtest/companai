import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'audit_logs.view_self',
    title: 'View own audit logs',
    module: 'audit_logs',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'audit_logs.view_tenant',
    title: 'View tenant audit logs',
    module: 'audit_logs',
    capability: {
      effectClass: 'E0',
      reversibility: 'reversible',
      dataClasses: ['confidential', 'personal'],
      note: 'Reads everyone\'s activity, including snapshots of records the reader may not otherwise see. A read, but not a harmless one.',
    },
  },
  {
    id: 'audit_logs.undo_self',
    title: 'Undo own actions',
    module: 'audit_logs',
    capability: {
      effectClass: 'E2',
      reversibility: 'compensatable',
      compensation: 'audit_logs.redo_self',
      dataClasses: ['internal'],
      note: 'Undo reverses somebody else\'s completed write. Classed E2 rather than E1 because what it reverses may itself have been irreversible, and the undo cannot know.',
    },
  },
  {
    id: 'audit_logs.undo_tenant',
    title: 'Undo tenant actions',
    module: 'audit_logs',
    capability: {
      effectClass: 'E2',
      reversibility: 'compensatable',
      compensation: 'audit_logs.redo_tenant',
      dataClasses: ['confidential'],
      standingApprovable: false,
      note: 'Reverses any user\'s action across the tenant. Never covered by a standing approval: undoing another person\'s work is a decision that should be made each time.',
    },
  },
  {
    id: 'audit_logs.redo_self',
    title: 'Redo own actions',
    module: 'audit_logs',
    capability: {
      effectClass: 'E2',
      reversibility: 'compensatable',
      compensation: 'audit_logs.undo_self',
      dataClasses: ['internal'],
    },
  },
  {
    id: 'audit_logs.redo_tenant',
    title: 'Redo tenant actions',
    module: 'audit_logs',
    capability: {
      effectClass: 'E2',
      reversibility: 'compensatable',
      compensation: 'audit_logs.undo_tenant',
      dataClasses: ['confidential'],
      standingApprovable: false,
    },
  },
]

export default features
