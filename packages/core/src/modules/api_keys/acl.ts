import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  {
    id: 'api_keys.view',
    title: 'View API keys',
    module: 'api_keys',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'api_keys.create',
    title: 'Create API keys',
    module: 'api_keys',
    capability: {
      effectClass: 'E5',
      reversibility: 'compensatable',
      compensation: 'api_keys.delete',
      dataClasses: ['secret'],
      delegable: false,
      standingApprovable: false,
      auditEventType: 'api.key.created',
      note: 'Issues a credential that acts as a principal in its own right. Not delegable: handing out the ability to mint identities is how a bounded grant becomes an unbounded one.',
    },
  },
  {
    id: 'api_keys.delete',
    title: 'Delete API keys',
    module: 'api_keys',
    capability: {
      effectClass: 'E6',
      reversibility: 'irreversible',
      dataClasses: ['secret'],
      delegable: false,
      standingApprovable: false,
      auditEventType: 'api.key.deleted',
      note: 'Revocation. The row is soft-deleted and the hash survives, but nothing in the product restores it and the plaintext key was never stored — from the outside this is final.',
    },
  },
]

export default features
