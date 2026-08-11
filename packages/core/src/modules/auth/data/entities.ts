import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy'

@Entity({ tableName: 'users' })
// Email uniqueness is per-tenant, enforced by a partial unique index
// (`users_tenant_email_hash_uniq`) on `(tenant_id, email_hash)` over live rows
// (`WHERE deleted_at IS NULL AND email_hash IS NOT NULL`), owned by raw SQL in
// Migration20260610120000. It keys on the deterministic `email_hash`, not `email`, because
// `email` is encrypted at rest with a per-row IV (see encryption.ts) — its ciphertext is
// non-deterministic, so a unique index on it would not detect duplicates. A `@Unique`
// decorator can't express a partial, tenant-scoped index, so the entity omits it — the
// migration is the source of truth. A global unique constraint contradicts the multi-tenant
// login flow and leaks cross-tenant account existence (#2934). Mirrors
// `customer_users_tenant_email_hash_uniq`.
export class User {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ type: 'text' })
  email!: string

  @Property({ name: 'email_hash', type: 'text', nullable: true })
  @Index({ name: 'users_email_hash_idx' })
  emailHash?: string | null

  @Property({ type: 'text', nullable: true })
  name?: string | null

  @Property({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash?: string | null

  @Property({ name: 'is_confirmed', type: 'boolean', default: true })
  isConfirmed: boolean = true

  @Property({ name: 'last_login_at', type: Date, nullable: true })
  lastLoginAt?: Date

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date | null

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'roles' })
@Unique({ properties: ['tenantId', 'name'] })
export class Role {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date | null

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'user_sidebar_preferences' })
// Uniqueness is enforced by a partial unique index (`user_sidebar_preferences_active_unique_idx`)
// scoped to live rows (`WHERE deleted_at IS NULL`) and owned by raw SQL in
// Migration20260427143311. A `@Unique` decorator can't express a partial index,
// so the entity intentionally omits it — the migration is the source of truth.
export class UserSidebarPreference {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => User)
  user!: User

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ type: 'text' })
  locale!: string

  @Property({ name: 'settings_json', type: 'json', nullable: true })
  settingsJson?: unknown

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'role_sidebar_preferences' })
// Uniqueness is enforced by a partial unique index (`role_sidebar_preferences_active_unique_idx`)
// scoped to live rows (`WHERE deleted_at IS NULL`) and owned by raw SQL in
// Migration20260427143311. A `@Unique` decorator can't express a partial index,
// so the entity intentionally omits it — the migration is the source of truth.
export class RoleSidebarPreference {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => Role)
  role!: Role

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ type: 'text' })
  locale!: string

  @Property({ name: 'settings_json', type: 'json', nullable: true })
  settingsJson?: unknown

  /**
   * The saved layout this preset was pushed from, when one is known.
   *
   * A plain id and not a relation: a variant is one person's saved layout and
   * can be deleted, while the preset it produced must outlive it. A dangling id
   * simply stops matching, which reads as "from a layout that is no longer
   * here" — the truth, and better than a cascade that would delete a role's
   * sidebar because somebody tidied up their own saved views.
   *
   * `null` means the source is unknown: rows written before this column existed,
   * or a push made from an unsaved layout. Unknown is not the same as "none",
   * and the screen says so rather than guessing.
   *
   * It exists because the *Apply to roles* switches cannot otherwise tell the
   * truth. Without it, "this role has a preset" is all anyone knows, and a
   * screen that cannot say *which* layout a role has will eventually overwrite
   * or delete one somebody else configured.
   */
  @Index({ name: 'role_sidebar_preferences_variant_id_idx' })
  @Property({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'sidebar_variants' })
// Uniqueness is enforced by a partial unique index (`sidebar_variants_active_name_unique_idx`)
// scoped to live rows (`WHERE deleted_at IS NULL`) and owned by raw SQL in
// Migration20260427143311. A `@Unique` decorator can't express a partial index,
// so the entity intentionally omits it — the migration is the source of truth.
export class SidebarVariant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => User)
  user!: User

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ type: 'text' })
  locale!: string

  @Property({ type: 'text' })
  name!: string

  @Property({ name: 'settings_json', type: 'json', nullable: true })
  settingsJson?: unknown

  @Property({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean = false

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'user_roles' })
@Index({ name: 'user_roles_user_id_idx', properties: ['user'] })
@Index({ name: 'user_roles_role_id_idx', properties: ['role'] })
export class UserRole {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => User)
  user!: User

  @ManyToOne(() => Role)
  role!: Role

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'sessions' })
export class Session {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => User)
  user!: User

  @Property({ type: 'text', unique: true })
  token!: string

  @Property({ name: 'expires_at', type: Date })
  expiresAt!: Date

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'last_used_at', type: Date, nullable: true })
  lastUsedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'password_resets' })
export class PasswordReset {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => User)
  user!: User

  @Property({ type: 'text', unique: true })
  token!: string

  @Property({ name: 'expires_at', type: Date })
  expiresAt!: Date

  @Property({ name: 'used_at', type: Date, nullable: true })
  usedAt?: Date

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

// RBAC: Role-level ACL
@Entity({ tableName: 'role_acls' })
export class RoleAcl {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => Role)
  role!: Role

  // Tenant scope is mandatory for ACL evaluation
  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  // Feature list (string-based). Use JSON array to preserve order and allow wildcards like "example.*".
  @Property({ name: 'features_json', type: 'json', nullable: true })
  featuresJson?: string[] | null

  // If true, user with this role can do everything regardless of features
  @Property({ name: 'is_super_admin', type: 'boolean', default: false })
  isSuperAdmin: boolean = false

  // Visible organizations within the tenant; null/empty means all organizations
  @Property({ name: 'organizations_json', type: 'json', nullable: true })
  organizationsJson?: string[] | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

// RBAC: Per-user ACL override
@Entity({ tableName: 'user_acls' })
export class UserAcl {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne(() => User)
  user!: User

  // Tenant scope is mandatory for ACL evaluation
  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  // Feature list (string-based). Use JSON array to preserve order and allow wildcards like "example.*".
  @Property({ name: 'features_json', type: 'json', nullable: true })
  featuresJson?: string[] | null

  // If true, this user can do everything regardless of features
  @Property({ name: 'is_super_admin', type: 'boolean', default: false })
  isSuperAdmin: boolean = false

  // Visible organizations within the tenant; null/empty means all organizations
  @Property({ name: 'organizations_json', type: 'json', nullable: true })
  organizationsJson?: string[] | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'user_consents' })
@Unique({ properties: ['userId', 'tenantId', 'consentType'] })
export class UserConsent {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Property({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string | null

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'consent_type', type: 'text' })
  consentType!: string

  @Property({ name: 'is_granted', type: 'boolean', default: false })
  isGranted: boolean = false

  @Property({ name: 'granted_at', type: Date, nullable: true })
  grantedAt?: Date | null

  @Property({ name: 'withdrawn_at', type: Date, nullable: true })
  withdrawnAt?: Date | null

  @Property({ type: 'text', nullable: true })
  source?: string | null

  @Property({ name: 'ip_address', type: 'text', nullable: true })
  ipAddress?: string | null

  @Property({ name: 'integrity_hash', type: 'text', nullable: true })
  integrityHash?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * An act the resolver would not let happen yet.
 *
 * When enforcement is on and the resolver gates a command at `A1` or `A2`, the
 * command does **not** run. What it would have done is written here instead, and
 * it runs only when somebody with the authority to approve it says so.
 *
 * Before this existed, enforcement could refuse an act outright and nothing
 * else: `A1`-`A4` were recorded as obligations and did not bind, so "approve
 * first" was a sentence in a log rather than a control.
 *
 * **`input` is the command's own input**, the same shape the command bus already
 * persists to `action_logs.command_payload` for undo — so replaying an approved
 * act is the mechanism the platform already has for redo, not a new one.
 *
 * Expiry is mandatory (planning 02 §7.2): a request that can sit forever turns
 * into a queue nobody trusts, and silently blocking work is worse than saying
 * no. An expired act cannot be approved; it has to be proposed again.
 */
@Entity({ tableName: 'authority_pending_acts' })
@Index({ name: 'authority_pending_acts_queue_idx', properties: ['tenantId', 'status', 'expiresAt'] })
@Index({ name: 'authority_pending_acts_actor_idx', properties: ['tenantId', 'actorId'] })
export class AuthorityAct {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  /** The command that was held, and the capability it performs. */
  @Property({ name: 'command_id', type: 'text' })
  commandId!: string

  @Property({ name: 'capability_id', type: 'text' })
  capabilityId!: string

  /** What the command was called with. Replayed verbatim on approval. */
  @Property({ name: 'command_input', type: 'jsonb' })
  commandInput!: unknown

  /** Who proposed it — the actor whose authority the act was resolved against. */
  @Property({ name: 'actor_id', type: 'text' })
  actorId!: string

  @Property({ name: 'actor_kind', type: 'text' })
  actorKind!: string

  /** The gate that held it, and the rule that produced that gate. */
  @Property({ type: 'text' })
  gate!: string

  @Property({ name: 'binding_rule', type: 'text' })
  bindingRule!: string

  /**
   * The whole decision, so the queue can show why without re-resolving.
   *
   * Re-resolving at display time would answer a different question — what the
   * rules say *now* — and quietly disagree with the reason the act was held.
   */
  @Property({ type: 'jsonb' })
  decision!: unknown

  /**
   * `pending` — waiting for a person (A1/A2)
   * `holding` — waiting for its window to pass, then it runs itself (A3)
   * `approved` · `committed` — it ran, by a person or by the clock
   * `rejected` · `vetoed` — it will not run, by a person's decision
   * `expired` — nobody answered in time; it will not run
   * `failed` — it was authorised, ran, and threw
   */
  @Property({ type: 'text', default: 'pending' })
  status: string = 'pending'

  /**
   * When an unanswered act stops being approvable. `A1`/`A2`.
   *
   * Expiry **kills** the act: it never runs, and somebody has to propose it
   * again. That is the opposite of `commitAt` below, and the two must never be
   * read as the same field under a different name.
   */
  @Property({ name: 'expires_at', type: Date })
  expiresAt!: Date

  /**
   * When a held act runs by itself. `A3` — *hold and commit unless vetoed*.
   *
   * A scheduled sweep finds acts past this moment and **runs** them. A veto
   * before then cancels the act permanently.
   *
   * A separate column from `expiresAt`, even though both are "a deadline on a
   * held act". One means *this never happens now*; the other means *this happens
   * now*. Sharing a column and branching on status would put the two opposite
   * outcomes one typo apart, on a table whose entire job is deciding whether
   * something happens.
   */
  @Property({ name: 'commit_at', type: Date, nullable: true })
  commitAt?: Date | null

  @Property({ name: 'resolved_at', type: Date, nullable: true })
  resolvedAt?: Date | null

  @Property({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId?: string | null

  @Property({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote?: string | null

  /** Set when an approved act was run and threw. The act stays visible. */
  @Property({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date
}

/**
 * An act that already happened, and that somebody still has to look at.
 *
 * Gate `A4` is *"execute and review"*: the act takes effect immediately and
 * enters a review queue, where a reviewer may compensate. That is the opposite
 * shape from `A1`/`A2`, which hold an act that has **not** happened — so it is a
 * different table rather than a status on the same one. One table whose rows mean
 * "not yet" or "already did" depending on a `kind` column is how a schema starts
 * lying to the next reader.
 *
 * It carries the action-log id of what ran, so a reviewer can see the change
 * itself rather than a description of it, and can undo it through the machinery
 * that already exists.
 *
 * No deadline. An approval that nobody answers must expire, because work is
 * blocked behind it; a review that nobody does blocks nothing and must **not**
 * quietly disappear — an unreviewed act is exactly the thing somebody should
 * still find next quarter.
 */
@Entity({ tableName: 'authority_act_reviews' })
@Index({ name: 'authority_act_reviews_queue_idx', properties: ['tenantId', 'status', 'createdAt'] })
export class AuthorityActReview {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'command_id', type: 'text' })
  commandId!: string

  @Property({ name: 'capability_id', type: 'text' })
  capabilityId!: string

  /** The audit entry for the act itself, so a reviewer reads the change. */
  @Property({ name: 'action_log_id', type: 'uuid', nullable: true })
  actionLogId?: string | null

  @Property({ name: 'actor_id', type: 'text' })
  actorId!: string

  @Property({ name: 'actor_kind', type: 'text' })
  actorKind!: string

  @Property({ type: 'text' })
  gate!: string

  @Property({ name: 'binding_rule', type: 'text' })
  bindingRule!: string

  @Property({ type: 'jsonb' })
  decision!: unknown

  /** `awaiting` · `reviewed` · `compensated` */
  @Property({ type: 'text', default: 'awaiting' })
  status: string = 'awaiting'

  @Property({ name: 'reviewed_at', type: Date, nullable: true })
  reviewedAt?: Date | null

  @Property({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId?: string | null

  @Property({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date(), nullable: true })
  updatedAt?: Date
}

/**
 * A record frozen or restricted, whatever anybody's authority.
 *
 * **Keyed on `(tenant_id, record_id)` and nothing else.** The obvious design
 * keys on entity type as well, but the command bus carries a `capability` and no
 * entity type, so that would need a second per-command declaration across every
 * command — the R4b mapping exercise again. Record ids are v4 UUIDs, so keying on
 * the id alone is unique in any practical sense, and the gate can read
 * `payload.id` from a command it is already intercepting.
 *
 * `command_hint` exists so a person reading a list of locks knows what the thing
 * is. It is **never** part of the key: two capabilities touching one record must
 * produce one lock, not two.
 *
 * If two tables ever did share a UUID, an unrelated record would be
 * *over*-restricted — wrong in the only direction this system tolerates.
 */
@Entity({ tableName: 'record_locks' })
// No `@Index` here: the unique constraint on (tenant_id, record_id) already
// creates the index every read in `RecordLockService` uses, and a second index on
// the same columns costs a write on every lock change to answer nothing new.
export class RecordLock {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  /** The locked record's own id. See the note above on why this is the key. */
  @Property({ name: 'record_id', type: 'uuid' })
  recordId!: string

  /** `open`, `restricted` or `locked`. */
  @Property({ name: 'lock_state', type: 'text' })
  lockState!: string

  /**
   * Why, in the words of whoever locked it.
   *
   * Carried into the refusal the resolver returns, because "you may not edit
   * this" is a support ticket and "locked pending the Q3 audit" is an answer.
   */
  @Property({ type: 'text', nullable: true })
  reason?: string | null

  /** What kind of thing this is, for display only — never keyed on. */
  @Property({ name: 'command_hint', type: 'text', nullable: true })
  commandHint?: string | null

  @Property({ name: 'locked_by_user_id', type: 'uuid', nullable: true })
  lockedByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Authority lent for a while, and taken back.
 *
 * **Both ends are principals, not users**, which is the whole reason R1 came
 * first: an AI worker can hold a delegation and can grant one, and neither is
 * representable if the columns say `user_id`.
 *
 * `reason` is **not nullable**. A delegation without one is the grant nobody can
 * evaluate later — "why does Sam have approval rights?" is the question this
 * table exists to answer, and a nullable column is a question mark somebody will
 * skip past.
 *
 * `expires_at` is not nullable either. A delegation with no end is a role grant
 * wearing a costume, and the failure this feature prevents is precisely the grant
 * nobody revisits.
 */
@Entity({ tableName: 'authority_delegations' })
export class AuthorityDelegation {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  /** `null` scopes the delegation to the whole tenant rather than one organization. */
  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'grantor_principal_id', type: 'text' })
  grantorPrincipalId!: string

  @Property({ name: 'grantor_kind', type: 'text' })
  grantorKind!: string

  @Property({ name: 'grantee_principal_id', type: 'text' })
  granteePrincipalId!: string

  @Property({ name: 'grantee_kind', type: 'text' })
  granteeKind!: string

  @Property({ name: 'capability_id', type: 'text' })
  capabilityId!: string

  /**
   * A cap the grantor chose, at or below what they hold themselves.
   *
   * `null` means "whatever the grantor could do", which the resolver works out
   * rather than trusting a stored number that would go stale the moment the
   * grantor's own authority changed.
   */
  @Property({ name: 'authority_ceiling', type: 'text', nullable: true })
  authorityCeiling?: string | null

  @Property({ name: 'starts_at', type: Date })
  startsAt!: Date

  @Property({ name: 'expires_at', type: Date })
  expiresAt!: Date

  @Property({ name: 'revoked_at', type: Date, nullable: true })
  revokedAt?: Date | null

  @Property({ name: 'revoked_by_user_id', type: 'uuid', nullable: true })
  revokedByUserId?: string | null

  @Property({ type: 'text' })
  reason!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * How much autonomy a principal has earned, per capability group.
 *
 * **Per group, not global**, per planning 02 §5.1: a worker can be trusted with
 * research reads and supervised on external communication, and a single number
 * would be either uselessly conservative or dangerously optimistic. The group is
 * the capability's module, which is a grouping the platform already has rather
 * than a taxonomy invented for this table.
 *
 * **A missing row means `T0`.** Absence is the bottom of the scale, never a
 * default in the middle — this is the one record whose absence must not grant
 * anything.
 *
 * `evidence_json` is the snapshot the promotion was granted on, and
 * `unverified_json` the criteria nobody could check at the time. Both are kept
 * because "why does this worker have T3?" is the question this table exists to
 * answer, and an answer that requires re-deriving year-old evidence is no answer.
 */
@Entity({ tableName: 'authority_trust_grants' })
export class AuthorityTrustGrant {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'principal_id', type: 'text' })
  principalId!: string

  @Property({ name: 'principal_kind', type: 'text' })
  principalKind!: string

  /** The capability's module — `directory`, `auth`, `sales`. */
  @Property({ name: 'capability_group', type: 'text' })
  capabilityGroup!: string

  @Property({ type: 'text' })
  tier!: string

  @Property({ name: 'evidence_json', type: 'jsonb', nullable: true })
  evidenceJson?: unknown

  @Property({ name: 'unverified_json', type: 'jsonb', nullable: true })
  unverifiedJson?: unknown

  @Property({ name: 'granted_by_user_id', type: 'uuid', nullable: true })
  grantedByUserId?: string | null

  /** Why the last change happened — a person's words, or a demotion trigger. */
  @Property({ type: 'text', nullable: true })
  reason?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
