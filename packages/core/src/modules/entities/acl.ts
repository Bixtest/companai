import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'entities.definitions.view', title: 'View custom field definitions', module: 'entities',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'entities.definitions.manage',
    title: 'Manage custom field definitions',
    module: 'entities',
    dependsOn: ['entities.definitions.view'],
    capability: { effectClass: 'E2', reversibility: 'compensatable', compensation: 'entities.definitions.manage', dataClasses: ['internal'], note: 'Schema, not records: adding and removing custom fields. Definitions are soft-deleted and there is a restore route, which is why this is compensatable rather than destructive.' },
  },
  {
    // CC-25 — who may state the permission *decision* for a new structure.
    // Distinct from `manage` on purpose: creating a field is one capability, and
    // deciding *who may see it* (and naming the role the records go to) is
    // another. S2 says a permission is decided "either by a person or by a
    // rule"; this is the permission that authorises the *person* half. An actor
    // holding `manage` but not this one still lands structures — they land with
    // the gate's default grant, exactly as an automated create does.
    id: 'entities.definitions.decide',
    title: 'State the permission decision for a new data structure',
    module: 'entities',
    dependsOn: ['entities.definitions.manage'],
    capability: { effectClass: 'E2', reversibility: 'compensatable', compensation: 'entities.definitions.decide', dataClasses: ['internal'], note: 'Authorises naming which role a new surface\u2019s permission records go to. Compensatable for the same reason `manage` is: the grant is an idempotent set-union on role_acls, so a mistaken grant is reversed by removing the records it added.' },
  },
  { id: 'entities.records.view', title: 'View records', module: 'entities',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential', 'personal'] },
  },
  {
    id: 'entities.records.manage',
    title: 'Manage records',
    module: 'entities',
    dependsOn: ['entities.records.view'],
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['confidential', 'personal'], note: 'Create, edit and delete across arbitrary custom entities — the blast radius is whatever the tenant has modelled.' },
  },
]

export default features
