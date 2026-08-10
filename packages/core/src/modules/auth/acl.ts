import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'auth.users.list',
    title: 'List users',
    module: 'auth',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['personal'] },
  },
  {
    id: 'auth.users.create',
    title: 'Create users',
    module: 'auth',
    capability: {
      effectClass: 'E5',
      reversibility: 'compensatable',
      compensation: 'auth.users.delete',
      dataClasses: ['personal'],
      delegable: false,
      note: 'Creates a principal. Every later authority question is asked about someone who exists because of this act.',
    },
  },
  {
    id: 'auth.users.edit',
    title: 'Edit users',
    module: 'auth',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['personal'],
      note: 'Editing a user includes editing what they are — E5 rather than E1 because identity fields are not ordinary record fields.',
    },
  },
  {
    id: 'auth.users.delete',
    title: 'Delete users',
    module: 'auth',
    capability: {
      effectClass: 'E6',
      reversibility: 'compensatable',
      compensation: 'auth.users.create',
      dataClasses: ['personal'],
      delegable: false,
      standingApprovable: false,
      note: 'The command carries an undo that restores the record, but sessions, ACL rows and role assignments are hard-deleted and do not come back. Compensatable, not reversible — the distinction matters to whoever has to clean up.',
    },
  },
  {
    id: 'auth.roles.list',
    title: 'List roles',
    module: 'auth',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'auth.roles.manage',
    title: 'Manage roles',
    module: 'auth',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      delegable: false,
      standingApprovable: false,
      note: 'Changes what a whole class of people may do, retroactively and for everyone holding the role.',
    },
  },
  {
    id: 'auth.acl.manage',
    title: 'Manage ACLs',
    module: 'auth',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      delegable: false,
      standingApprovable: false,
      note: 'The capability that grants capabilities. Anyone holding it holds everything it can grant, which is why it is never delegable and never covered by a standing approval.',
    },
  },
  {
    id: 'auth.sidebar.manage',
    title: 'Manage sidebar presets',
    module: 'auth',
    capability: {
      effectClass: 'E1',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      note: 'Navigation layout only. It hides menu entries; it grants and revokes nothing, and treating it as a permission change would be a category error in the other direction.',
    },
  },
  {
    id: 'auth.authority.approve',
    title: 'Approve held acts',
    module: 'auth',
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['internal'],
      delegable: false,
      note: 'Approving a held act runs it, so this capability is worth exactly the sum of every act the queue can carry. It is classified as a permission change rather than by what any individual act does, and it is not delegable: an approver who can hand approval on has turned a control into a routing rule.',
    },
  },
]

export default features
