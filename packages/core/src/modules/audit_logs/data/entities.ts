import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'
import type { ActionLogProjectionType, ActionLogSourceKey } from '@open-mercato/core/modules/audit_logs/lib/projections'

export type ActionLogExecutionState = 'done' | 'undoing' | 'undone' | 'failed' | 'redone'

@Entity({ tableName: 'action_logs' })
@Index({ name: 'action_logs_tenant_idx', properties: ['tenantId', 'createdAt'] })
@Index({ name: 'action_logs_actor_idx', properties: ['actorUserId', 'createdAt'] })
@Index({ name: 'action_logs_resource_idx', properties: ['tenantId', 'resourceKind', 'resourceId', 'createdAt'] })
@Index({ name: 'action_logs_parent_resource_idx', properties: ['tenantId', 'parentResourceKind', 'parentResourceId', 'createdAt'] })
@Index({ name: 'action_logs_action_type_idx', properties: ['tenantId', 'organizationId', 'actionType', 'createdAt'] })
@Index({ name: 'action_logs_source_key_idx', properties: ['tenantId', 'organizationId', 'sourceKey', 'createdAt'] })
@Index({ name: 'action_logs_primary_changed_field_idx', properties: ['tenantId', 'organizationId', 'primaryChangedField', 'createdAt'] })
@Index({ name: 'action_logs_changed_fields_idx', properties: ['changedFields'], type: 'gin' })
@Index({ name: 'action_logs_related_resource_idx', properties: ['tenantId', 'relatedResourceKind', 'relatedResourceId', 'createdAt'] })
export class ActionLog {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null = null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null = null

  @Property({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null = null

  /**
   * What kind of principal acted — `human`, `ai_worker`, `service`, `system`.
   *
   * `actor_user_id` is a uuid column, and the subject is narrowed to one on the
   * way in: `api_key:<uuid>` is stored as the bare uuid. Without this column a
   * key acting and a person acting are indistinguishable in the journal, which
   * is the single distinction this platform exists to make (U7).
   *
   * Nullable, and null means **unknown** rather than human: entries written
   * before this column existed cannot have their kind recovered from the row
   * itself. `audit_logs backfill-actor-kind` infers what it can from the api-key
   * table and leaves the rest null, because a guess recorded as a fact is worse
   * than an absence.
   */
  @Property({ name: 'actor_kind', type: 'text', nullable: true })
  actorKind: string | null = null

  @Property({ name: 'command_id', type: 'text' })
  commandId!: string

  @Property({ name: 'action_label', type: 'text', nullable: true })
  actionLabel: string | null = null

  @Property({ name: 'action_type', type: 'text', nullable: true })
  actionType: ActionLogProjectionType | null = null

  @Property({ name: 'resource_kind', type: 'text', nullable: true })
  resourceKind: string | null = null

  @Property({ name: 'resource_id', type: 'text', nullable: true })
  resourceId: string | null = null

  @Property({ name: 'parent_resource_kind', type: 'text', nullable: true })
  parentResourceKind: string | null = null

  @Property({ name: 'parent_resource_id', type: 'text', nullable: true })
  parentResourceId: string | null = null

  @Property({ name: 'execution_state', type: 'text', default: 'done' })
  executionState: ActionLogExecutionState = 'done'

  @Property({ name: 'undo_token', type: 'text', nullable: true })
  undoToken: string | null = null

  @Property({ name: 'command_payload', type: 'jsonb', nullable: true })
  commandPayload: unknown | null = null

  @Property({ name: 'snapshot_before', type: 'jsonb', nullable: true })
  snapshotBefore: unknown | null = null

  @Property({ name: 'snapshot_after', type: 'jsonb', nullable: true })
  snapshotAfter: unknown | null = null

  @Property({ name: 'changes_json', type: 'jsonb', nullable: true })
  changesJson: Record<string, unknown> | null = null

  @Property({ name: 'changed_fields', type: 'text[]', nullable: true })
  changedFields: string[] | null = null

  @Property({ name: 'primary_changed_field', type: 'text', nullable: true })
  primaryChangedField: string | null = null

  @Property({ name: 'context_json', type: 'jsonb', nullable: true })
  contextJson: Record<string, unknown> | null = null

  @Property({ name: 'source_key', type: 'text', nullable: true })
  sourceKey: ActionLogSourceKey | null = null

  @Property({ name: 'related_resource_kind', type: 'text', nullable: true })
  relatedResourceKind: string | null = null

  @Property({ name: 'related_resource_id', type: 'text', nullable: true })
  relatedResourceId: string | null = null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt: Date | null = null
}

@Entity({ tableName: 'access_logs' })
@Index({ name: 'access_logs_tenant_idx', properties: ['tenantId', 'createdAt'] })
@Index({ name: 'access_logs_actor_idx', properties: ['actorUserId', 'createdAt'] })
@Index({ name: 'access_logs_created_at_idx', properties: ['createdAt'] })
export class AccessLog {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null = null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null = null

  @Property({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null = null

  /**
   * What kind of principal acted — `human`, `ai_worker`, `service`, `system`.
   *
   * `actor_user_id` is a uuid column, and the subject is narrowed to one on the
   * way in: `api_key:<uuid>` is stored as the bare uuid. Without this column a
   * key acting and a person acting are indistinguishable in the journal, which
   * is the single distinction this platform exists to make (U7).
   *
   * Nullable, and null means **unknown** rather than human: entries written
   * before this column existed cannot have their kind recovered from the row
   * itself. `audit_logs backfill-actor-kind` infers what it can from the api-key
   * table and leaves the rest null, because a guess recorded as a fact is worse
   * than an absence.
   */
  @Property({ name: 'actor_kind', type: 'text', nullable: true })
  actorKind: string | null = null

  @Property({ name: 'resource_kind', type: 'text' })
  resourceKind!: string

  @Property({ name: 'resource_id', type: 'text' })
  resourceId!: string

  @Property({ name: 'access_type', type: 'text' })
  accessType!: string

  @Property({ name: 'fields_json', type: 'jsonb', nullable: true })
  fieldsJson: string[] | null = null

  @Property({ name: 'context_json', type: 'jsonb', nullable: true })
  contextJson: Record<string, unknown> | null = null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt: Date | null = null
}

/**
 * Who a ledger event is visible to, decided when it is written.
 *
 * Deciding at write time rather than query time is the point: otherwise every
 * audit query has to re-derive sensitivity from the payload, and one careless
 * report leaks a private event into a customer-facing timeline.
 */
export type LedgerVisibility = 'platform' | 'tenant' | 'portal' | 'project' | 'private'

export const LEDGER_VISIBILITIES: LedgerVisibility[] = [
  'platform',
  'tenant',
  'portal',
  'project',
  'private',
]

/**
 * The hash-chained ledger (R3, Tier 1).
 *
 * `action_logs` is the journal: queryable, projected, filtered, and — being an
 * ordinary table — editable by anyone with write access to the database. That is
 * fine for answering "what happened", and useless for answering "is this record
 * still what was written".
 *
 * This table answers the second question. Each row carries the hash of its
 * predecessor within its tenant, so altering any row invalidates every hash from
 * that row onward. It does not make tampering impossible; it makes silent
 * tampering impossible, which is the achievable property.
 *
 * **What it deliberately does not hold.** No customer content. The payload
 * carries pointers and digests — the id of the journal entry, the resource it
 * concerned, and a hash of the snapshot. Personal data stays in the journal
 * where it can be erased on request, and erasing it leaves this chain intact and
 * still verifiable (planning 06 §5). A ledger holding personal data is a ledger
 * that cannot honour a deletion request without destroying its own proof.
 *
 * **Append-only is enforced in the database**, by a trigger that raises on
 * UPDATE and DELETE — not by convention, and not only by this application. The
 * whole value of the chain is that it resists the person with database access.
 */
@Entity({ tableName: 'ledger_events' })
@Unique({ name: 'ledger_events_tenant_seq_uq', properties: ['tenantId', 'seq'] })
@Unique({ name: 'ledger_events_tenant_hash_uq', properties: ['tenantId', 'hash'] })
@Index({ name: 'ledger_events_tenant_created_idx', properties: ['tenantId', 'createdAt'] })
@Index({ name: 'ledger_events_correlation_idx', properties: ['tenantId', 'correlationId'] })
@Index({ name: 'ledger_events_resource_idx', properties: ['tenantId', 'resourceKind', 'resourceId'] })
export class LedgerEvent {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  /**
   * The chain's partition. One chain per tenant — a global chain would make
   * every tenant's writes serialise against every other tenant's.
   */
  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  /** Position in this tenant's chain. Starts at 1. Unique with `tenantId`. */
  @Property({ name: 'seq', type: 'bigint' })
  seq!: string

  /** The predecessor's hash; null only for a tenant's first event. */
  @Property({ name: 'prev_hash', type: 'text', nullable: true })
  prevHash: string | null = null

  /** SHA-256 over the canonical form of everything above and below. */
  @Property({ name: 'hash', type: 'text' })
  hash!: string

  /**
   * Which hash construction produced `hash`. Lets the verifier keep old branches
   * when the covered field set changes, instead of declaring history broken.
   */
  @Property({ name: 'hash_version', type: 'integer' })
  hashVersion: number = 1

  /** Event time, recorded by the writer. Distinct from `createdAt`. */
  @Property({ name: 'ts', type: Date })
  ts: Date = new Date()

  /** `<module>.<resource>.<action>` — the same identity the journal records. */
  @Property({ name: 'event_type', type: 'text' })
  eventType!: string

  /** `human` | `ai_worker` | `service` | `system` — from R1's principal model. */
  @Property({ name: 'actor_kind', type: 'text', nullable: true })
  actorKind: string | null = null

  @Property({ name: 'actor_id', type: 'text', nullable: true })
  actorId: string | null = null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null = null

  @Property({ name: 'resource_kind', type: 'text', nullable: true })
  resourceKind: string | null = null

  @Property({ name: 'resource_id', type: 'text', nullable: true })
  resourceId: string | null = null

  /** Which business action this belongs to. */
  @Property({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId: string | null = null

  /** Which specific event caused this one. Correlation groups; causation links. */
  @Property({ name: 'causation_id', type: 'text', nullable: true })
  causationId: string | null = null

  @Property({ name: 'visibility', type: 'text' })
  visibility: LedgerVisibility = 'tenant'

  /** Pointers and digests only — never customer content. See the class note. */
  @Property({ name: 'payload', type: 'json' })
  payload: Record<string, unknown> = {}

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}
