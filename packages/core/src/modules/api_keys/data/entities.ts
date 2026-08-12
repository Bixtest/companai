import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

@Entity({ tableName: 'api_keys' })
// The unique keyPrefix bounds the bcrypt candidate loop in findApiKeyBySecret to at
// most one live row. Do not drop this constraint or widen the prefix space without
// re-evaluating that loop's per-request cost (see #3812).
@Unique({ properties: ['keyPrefix'] })
@Index({
  name: 'api_keys_opencode_session_id_uq',
  expression:
    'create unique index "api_keys_opencode_session_id_uq" on "api_keys" ("opencode_session_id") where "opencode_session_id" is not null and "deleted_at" is null',
})
export class ApiKey {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'description', type: 'text', nullable: true })
  description?: string | null

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'key_hash', type: 'text' })
  keyHash!: string

  @Property({ name: 'key_prefix', type: 'text' })
  keyPrefix!: string

  /**
   * What kind of actor this credential is — `service` (default) or `ai_worker`.
   *
   * **This is what gave `ai_worker` a producer.** The kind existed in the
   * principal vocabulary and nothing could create one, so no ceiling,
   * delegation, trust grant or denial could target a machine and the
   * effect-class matrix never engaged.
   *
   * An AI worker needs a credential, and this is already one: revocable,
   * org-scoped, rate-limited, role-bearing. Marking a key changes the subject it
   * issues (`ai_worker:<id>` rather than `api_key:<id>`) and therefore what the
   * resolver, the journal and the ledger record — without a second auth path to
   * secure and keep in step.
   *
   * Nullable, and null means `service`: every key issued before this column
   * existed is exactly what it always was.
   */
  @Property({ name: 'principal_kind', type: 'text', nullable: true })
  principalKind: string | null = null

  @Property({ name: 'roles_json', type: 'json', nullable: true })
  rolesJson?: string[] | null

  @Property({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null

  /** Session token for ephemeral session-scoped keys (used by AI chat) */
  @Property({ name: 'session_token', type: 'text', nullable: true })
  sessionToken?: string | null

  /** User ID who owns this session (for ephemeral keys) */
  @Property({ name: 'session_user_id', type: 'uuid', nullable: true })
  sessionUserId?: string | null

  /** Encrypted API key secret for session keys (recoverable for API calls) */
  @Property({ name: 'session_secret_encrypted', type: 'text', nullable: true })
  sessionSecretEncrypted?: string | null

  /**
   * OpenCode session id bound to this api_key row. Set the first time the
   * chat dispatcher receives a `done` event after minting a session token,
   * then asserted on every subsequent resume to prevent cross-user session
   * continuation (see security fix 2026-05-23).
   */
  @Property({ name: 'opencode_session_id', type: 'text', nullable: true })
  opencodeSessionId?: string | null

  @Property({ name: 'last_used_at', type: Date, nullable: true })
  lastUsedAt?: Date | null

  @Property({ name: 'expires_at', type: Date, nullable: true })
  expiresAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
