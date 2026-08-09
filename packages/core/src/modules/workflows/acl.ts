import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

const moduleId = 'workflows'

export const features: AclFeatureDeclaration[] = [
  { id: 'workflows.view', title: 'View workflows', module: moduleId,
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'workflows.manage',
    title: 'Manage workflows',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'Umbrella over the definition lifecycle, so it inherits the worst of it. Authoring a workflow is authoring automation that later runs unattended.' },
  },
  {
    id: 'workflows.view_logs',
    title: 'View workflow logs',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'], note: 'Execution logs carry activity payloads, which can include anything the workflow touched.' },
  },
  {
    id: 'workflows.view_tasks',
    title: 'View workflow tasks',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'workflows.definitions.view',
    title: 'View workflow definitions',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'workflows.definitions.create',
    title: 'Create workflow definitions',
    module: moduleId,
    dependsOn: ['workflows.definitions.view'],
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'The definition itself is reversible — but it can declare CALL_WEBHOOK and SEND_EMAIL activities, so this is the act that decides what the platform will later do outside the company without anyone present.' },
  },
  {
    id: 'workflows.definitions.edit',
    title: 'Edit workflow definitions',
    module: moduleId,
    dependsOn: ['workflows.definitions.view'],
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'Edits apply to instances already running. Changing a live definition changes work already in flight.' },
  },
  {
    id: 'workflows.definitions.delete',
    title: 'Delete workflow definitions',
    module: moduleId,
    dependsOn: ['workflows.definitions.view'],
    capability: { effectClass: 'E6', reversibility: 'compensatable', compensation: 'workflows.definitions.create', dataClasses: ['internal'], note: 'Soft delete — the row keeps deletedAt — but running instances lose the definition they were following.' },
  },
  {
    id: 'workflows.instances.view',
    title: 'View workflow instances',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'workflows.instances.create',
    title: 'Start workflow instances',
    module: moduleId,
    dependsOn: ['workflows.instances.view', 'workflows.definitions.view'],
    capability: { effectClass: 'E3', reversibility: 'compensatable', compensation: 'workflows.instances.cancel', externalEffect: true, dataClasses: ['confidential'], note: 'Starting an instance runs its activities, which include calling external APIs and sending email. Cancelling stops what has not run yet; it does not recall what has.' },
  },
  {
    id: 'workflows.instances.cancel',
    title: 'Cancel workflow instances',
    module: moduleId,
    dependsOn: ['workflows.instances.view'],
    capability: { effectClass: 'E2', reversibility: 'compensatable', compensation: 'workflows.instances.create', dataClasses: ['internal'], note: 'Abandons work mid-flight. Compensation is starting again from the beginning, which is not the same as resuming.' },
  },
  {
    id: 'workflows.instances.retry',
    title: 'Retry workflow instances',
    module: moduleId,
    dependsOn: ['workflows.instances.view'],
    capability: { effectClass: 'E3', reversibility: 'compensatable', compensation: 'workflows.instances.cancel', externalEffect: true, dataClasses: ['confidential'], note: 'Re-runs a failed activity, including external calls — a retry can deliver the same webhook or email twice.' },
  },
  {
    id: 'workflows.instances.signal',
    title: 'Signal workflow instances',
    module: moduleId,
    dependsOn: ['workflows.instances.view'],
    capability: { effectClass: 'E3', reversibility: 'irreversible', externalEffect: true, dataClasses: ['confidential'], note: 'A signal advances a waiting instance, which then executes whatever comes next — including external activities.' },
  },
  {
    id: 'workflows.tasks.view',
    title: 'View user tasks',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'workflows.tasks.claim',
    title: 'Claim workflow tasks',
    module: moduleId,
    dependsOn: ['workflows.tasks.view'],
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Assignment only. Claiming decides who does the work, not what happens.' },
  },
  {
    id: 'workflows.tasks.complete',
    title: 'Complete workflow tasks',
    module: moduleId,
    dependsOn: ['workflows.tasks.view'],
    capability: { effectClass: 'E3', reversibility: 'irreversible', externalEffect: true, dataClasses: ['confidential'], note: 'Completing a human task advances the instance, which runs the next activities. The human step is the trigger; the effects are the workflow\'s.' },
  },
  {
    id: 'workflows.signals.send',
    title: 'Send workflow signals',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E3', reversibility: 'irreversible', externalEffect: true, dataClasses: ['confidential'], note: 'Same effect as signalling an instance directly, addressed by correlation rather than id.' },
  },
  {
    id: 'workflows.events.view',
    title: 'View workflow events',
    module: moduleId,
    dependsOn: ['workflows.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  // Note: Event triggers are now embedded in workflow definitions.
  // Trigger management permissions are covered by workflows.definitions.edit
]

export default features
