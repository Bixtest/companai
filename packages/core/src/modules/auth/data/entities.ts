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

  /**
   * Whether this role is a **core object** — the platform's own surface, which
   * no actor may delete or rename away (`SPECIFICATIONS-DICTIONARY.md` §C.3 /
   * `S9`, `CORE-BOUNDARY.md` §2). Migrated in `Migration20261009090000`.
   *
   * The rule is enforced in `auth/lib/core-object-guard.ts`; this column is its
   * durable key. Before it existed the role was recognised by its **name**
   * (`superadmin`), which a rename could change — so the protection could be
   * disarmed by a rename. A column travels with the row; a name does not.
   */
  @Property({ name: 'is_core', type: 'boolean', default: false })
  isCore: boolean = false

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

@Entity({ tableName: 'permission_surfaces' })
// One row per (tenant, surface) — the durable half of the permission catalogue
// (`@open-mercato/shared/lib/permissions/catalogue`). The uniqueness is a partial
// unique index (`permission_surfaces_tenant_surface_uidx`) over live rows
// (`WHERE deleted_at IS NULL`), owned by raw SQL in Migration20261009205000. A
// `@Unique` decorator cannot express a partial index, so the entity omits it — the
// migration is the source of truth (same convention as `users` and `sidebar_variants`).
//
// What this stores: the *surfaces* that can be permitted (an object, a field, a
// relation, a Function, a widget, an agent) and where each came from. It does not
// store *who may do what* — grants stay in `role_acls.features_json` (S5: one
// permission engine, never a second one). This is a registry, not a policy.
export class PermissionSurfaceRecord {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  // Tenant scope is mandatory: the same surface id can be recorded by two tenants,
  // and the catalogue is a per-tenant live view.
  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  // The surface's canonical id (e.g. `customers:customer_person`, `auth.users`).
  @Property({ name: 'surface_id', type: 'text' })
  surfaceId!: string

  // The surface kind (`object | field | relation | function | widget | agent`) and
  // the module or owner that declared or recorded it.
  @Property({ type: 'text' })
  kind!: string

  @Property({ type: 'text' })
  owner!: string

  // `declared` (the platform ships it in code) or `recorded` (it appeared at runtime).
  // A declared surface is never downgraded to recorded: the declaration wins.
  @Property({ type: 'text', default: 'recorded' })
  source: string = 'recorded'

  // Present only when the platform has a native record-id convention for the surface
  // (a custom entity's `entities.records.<entityId>`), so catalogue and enforcement agree.
  @Property({ name: 'feature_prefix', type: 'text', nullable: true })
  featurePrefix?: string | null

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

/**
 * A matter: a case, an engagement, an acquisition, a property.
 *
 * The platform scopes by tenant and organisation, which describes *structure*.
 * Work is not organised that way — a legal case pulls people from several
 * departments and needs its own rules about who may do what inside it (SRS
 * FR-550, FR-560).
 *
 * `grade` is the second reason this table exists. A task grade describes the
 * **work**, not the act, and until there was a matter to read one from every act
 * resolved at the `G1` baseline. A project is that matter.
 */
@Entity({ tableName: 'authority_projects' })
export class AuthorityProject {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ type: 'text' })
  name!: string

  /**
   * How consequential the work in this project is, `G0`–`G4`.
   *
   * Nullable, and null means "say nothing" rather than `G0`: a project nobody has
   * graded should leave the act at its ordinary baseline, not declare it
   * negligible.
   */
  @Property({ type: 'text', nullable: true })
  grade?: string | null

  @Property({ name: 'closed_at', type: Date, nullable: true })
  closedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Somebody who works in a project, and the rules that apply to them there.
 *
 * `permission_overlay` **only narrows**. It cannot grant a member something they
 * do not already hold — that is what makes it an overlay rather than a second
 * permission system, and it preserves the property the whole resolver rests on.
 */
@Entity({ tableName: 'authority_project_memberships' })
export class AuthorityProjectMembership {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'project_id', type: 'uuid' })
  projectId!: string

  /** Text, not uuid: an API key acting is `api_key:<id>`, and a member may be one. */
  @Property({ name: 'principal_id', type: 'text' })
  principalId!: string

  @Property({ name: 'principal_kind', type: 'text' })
  principalKind!: string

  @Property({ name: 'permission_overlay', type: 'jsonb', nullable: true })
  permissionOverlay?: unknown

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Which project a record belongs to.
 *
 * This is what lets the resolver know an act is happening inside a project at
 * all. The command gate already reads `payload.id` for record locks, so mapping a
 * **record** into a project reuses an identifier the gate has rather than adding a
 * declaration to every command — the same reasoning that shaped G5.
 *
 * One project per record: a record in two matters would give two overlays and no
 * rule for choosing between them.
 */
@Entity({ tableName: 'authority_project_records' })
export class AuthorityProjectRecord {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'project_id', type: 'uuid' })
  projectId!: string

  @Property({ name: 'record_id', type: 'uuid' })
  recordId!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()
}

/**
 * A permission taken away from one person, without touching anybody else.
 *
 * Permissions arrive through roles, so before this the only way to stop one
 * person doing one thing was to remove their whole role — taking away nine
 * other things they still needed — or to invent a bespoke role, which is how an
 * organisation ends up with forty roles and no idea what any of them mean.
 *
 * **`subject_principal_id` is `text`, not `uuid`**, for the same reason as
 * delegations: an API key acting is `api_key:<id>`, and a `uuid` column would
 * make machine actors undeniable, which is the opposite of what R1 was for.
 *
 * **`reason` is not null.** A permission that vanished with no reason cannot be
 * safely lifted six months later by somebody who was not there.
 *
 * **`expires_at` is nullable**, unlike a delegation's. An unbounded *grant* is a
 * role grant wearing a costume, but an unbounded *subtraction* is a legitimate
 * standing decision that should not silently lapse.
 */
@Entity({ tableName: 'authority_denials' })
export class AuthorityDenial {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  /** `null` withholds the permission across the whole tenant. */
  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'subject_principal_id', type: 'text' })
  subjectPrincipalId!: string

  @Property({ name: 'subject_kind', type: 'text' })
  subjectKind!: string

  /** The permission withheld. Wildcards allowed, and only at the end. */
  @Property({ name: 'feature_pattern', type: 'text' })
  featurePattern!: string

  @Property({ name: 'starts_at', type: Date })
  startsAt!: Date

  /** `null` is permanent — a standing decision, not an oversight. */
  @Property({ name: 'expires_at', type: Date, nullable: true })
  expiresAt?: Date | null

  @Property({ name: 'lifted_at', type: Date, nullable: true })
  liftedAt?: Date | null

  @Property({ name: 'lifted_by_user_id', type: 'uuid', nullable: true })
  liftedByUserId?: string | null

  @Property({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null

  @Property({ type: 'text' })
  reason!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
