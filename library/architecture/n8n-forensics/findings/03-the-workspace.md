# Batch 03 — The Workspace (P2)

**Study:** n8n `2.44.0` · **Batch:** 03 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` · **Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code (§ batch 00)
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.

---

## 0. What this batch had to answer

P2 is **the workspace** — the container a person or team operates in. Batch 01 recorded a specific
question and left it open: **the CLI has no tenancy notion at all** (no tenant, project or workspace
verb). So this batch's job is to find out whether the *server* does.

**It does, and the answer is the headline of the whole study so far.**

| Question | n8n's answer | Where |
|---|---|---|
| Is there a container? | **`Project`** — with `type: 'personal' \| 'team'` | F03-01 |
| How is membership held? | **`ProjectRelation`** — a composite key of (userId, projectId) plus a **Role joined by slug** | F03-02 |
| What are the roles? | **10 built-in roles**: 4 global (`global:owner/admin/member/chatUser`) and 6 resource-level | F03-03 |
| How are permissions expressed? | **206 scopes** in a `resource:action` vocabulary, split into global + project + sharing scopes | F03-04 |
| How is identity held? | **`User` + `AuthIdentity` + `ApiKey`** — a user can hold several identities, one per provider | F03-05 |
| How are things shared? | **`SharedWorkflow` / `SharedCredentials`** with a *sharing role*, plus project-scoped secrets-provider access | F03-06 |
| Where do variables live? | **Project-scoped or global** — *"If null, it's a global variable"* | F03-07 |
| Where does data live? | A **`ByteStore` interface with a registry** — and the S3 and Azure backends are `.ee` (unlicensed) | F03-08 |

---

## 1. The container: `Project`, and it is two things at once

`packages/@n8n/db/src/entities/project.ts`:

```ts
@Entity()
export class Project extends WithTimestampsAndStringId {
	@Column({ length: 255 }) name: string;
	@Column({ type: 'varchar', length: 36 })
	type: 'personal' | 'team';
	…
	@OneToMany('ProjectRelation', 'project') projectRelations: ProjectRelation[];
	@OneToMany('SharedCredentials', 'project') sharedCredentials: SharedCredentials[];
	@OneToMany('SharedWorkflow', 'project') sharedWorkflows: SharedWorkflow[];
	@OneToMany('ProjectSecretsProviderAccess', 'project') secretsProviderAccess: ProjectSecretsProviderAccess[];
	@OneToMany('Variables', 'project') variables: Variables[];
	@ManyToMany('RoleMappingRule', (rule) => rule.projects) roleMappingRules: RoleMappingRule[];
	@Column({ type: String, nullable: true }) creatorId: string | null;
	@ManyToOne('User', { onDelete: 'SET NULL' }) creator?: Relation<User>;
}
```

**➜ F03-01 [foundational] — The workspace container is a `Project`, and its `type` is either
`'personal'` or `'team'`.** **Plain meaning:** the same object is both *your private space* and *a team's
shared space*, and the only difference is one column. **Why it matters:** it is a **two-mode container**
— one model serves solo use and collaboration without a second hierarchy. That is the simplest tenancy
shape that still scales to teams, and it is measured, not assumed.

Also on the entity: `icon` (`{ type: 'emoji' | 'icon'; value }`), `description`, **`customTelemetryTags`**,
and `creatorId` with **`onDelete: 'SET NULL'`** (a project outlives its creator).

---

## 2. Membership: a composite key and a role

`packages/@n8n/db/src/entities/project-relation.ts`:

```ts
@Entity()
export class ProjectRelation extends WithTimestamps {
	@ManyToOne('Role', 'projectRelations')
	@JoinColumn({ name: 'role', referencedColumnName: 'slug' })
	role: Role;
	@ManyToOne('User', 'projectRelations') user: User;
	@PrimaryColumn('uuid') userId: string;
	@ManyToOne('Project', 'projectRelations') project: Project;
	@PrimaryColumn() projectId: string;
}
```

**➜ F03-02 [foundational] — Membership is a join row keyed on (userId, projectId) that carries a Role
referenced by its *slug*.** **Plain meaning:** "who is in this project, and as what" is one row, and the
role is a named thing rather than an enum — so a role can be created without a migration. **Why it
matters:** the composite key makes membership a first-class relation (not a column on either side), and
the slug reference is what makes custom roles possible at all.

---

## 3. The permission model: 10 roles, 206 scopes

### 3.1 The roles

`packages/@n8n/permissions/src/roles/all-roles.ts` — **10 built-in role slugs** (measured):

| Scope of the role | Slugs |
|---|---|
| **Global** (the instance) | `global:owner` · `global:admin` · `global:member` · `global:chatUser` |
| **Workflow** | `workflow:owner` · `workflow:editor` |
| **Credential** | `credential:owner` · `credential:user` |
| **Secrets provider connection** | `secretsProviderConnection:owner` · `secretsProviderConnection:user` |

And `packages/@n8n/db/src/constants.ts:52-54` exposes the global three as
`GLOBAL_OWNER_ROLE` / `GLOBAL_ADMIN_ROLE` / `GLOBAL_MEMBER_ROLE`.

**➜ F03-03 [foundational] — Roles are two-level: a global role for the instance, and a resource-level
role for what you are in a project.** **Plain meaning:** "what you can do anywhere" and "what you can do
to this thing" are different questions with different vocabularies. **Why it matters:** it is the
difference between *a tenant's admin* and *a document's editor*, and conflating them is the usual way a
permissions model goes wrong.

### 3.2 The scopes

**206 scope slugs** measured across five files in `permissions/src/roles/scopes/`:

| File | What it scopes |
|---|---|
| `global-scopes.ee.ts` | instance-wide abilities |
| **`project-scopes.ee.ts`** | **project-level abilities** |
| `workflow-sharing-scopes.ee.ts` | what a sharing role may do to a shared workflow |
| `credential-sharing-scopes.ee.ts` | the same for credentials |
| `secrets-provider-connection-sharing-scopes.ee.ts` | the same for secrets-provider connections |

The vocabulary is `resource:action` — `credential:create`, `credential:share`, `credential:use`,
`credential:move`, `workflow:execute`, `workflow:read`… **and four of the five scope files are `.ee`
(enterprise-licensed).**

**➜ F03-04 [foundational] — Permissions are 206 `resource:action` scopes, grouped into global, project
and three sharing domains.** **Plain meaning:** the system never asks "is this user an admin?" — it asks
"may this principal perform `credential:share` on this thing?" **Why it matters:** a capability list is
auditable and composable in a way a role list is not, and it is the model that survives a feature being
added. **But note the licence:** the scope definitions that make this work are largely enterprise files.

---

## 4. Identity: a user, several identities, and keys

`packages/@n8n/db/src/entities/user.ts` — `User` **implements both `IUser` and `AuthPrincipal`**, with
`id` (uuid), `email` (unique, lowercased by a transformer), `firstName`, `lastName`, `password`.

`packages/@n8n/db/src/entities/auth-identity.ts`:

```ts
@Entity()
@Unique(['providerId', 'providerType'])
export class AuthIdentity extends WithTimestamps {
	@Column() userId: string;
	@ManyToOne(() => User, (user) => user.authIdentities) user: User;
	@PrimaryColumn({ length: 255 }) providerId: string;
	@PrimaryColumn() providerType: AuthProviderType;
	// … static create(user, providerId, providerType = 'ldap')
}
```

**➜ F03-05 [foundational] — A `User` is separate from their `AuthIdentity`, and one user may hold
several identities — one per provider — unique on (providerId, providerType).** **Plain meaning:** the
same person can sign in through LDAP and something else and still be one person with one set of
permissions. **Why it matters:** it is the difference between an account and a login, and it is what
makes SSO and migration possible without duplicating people. (The `create()` default is `'ldap'`, which
tells you which provider n8n expects first.)

`User` also relates to `ApiKey` and `ProjectRelation`, so **keys and memberships both hang off the
person, not the login**.

---

## 5. Sharing — the mechanism that makes `team` projects work

`packages/@n8n/db/src/entities/shared-workflow.ts`:

```ts
@Entity()
export class SharedWorkflow extends WithTimestamps {
	@Column({ type: 'varchar' }) role: WorkflowSharingRole;   // from @n8n/permissions
	@ManyToOne('WorkflowEntity', 'shared') workflow: WorkflowEntity;
	@PrimaryColumn() workflowId: string;
	@ManyToOne('Project', 'sharedWorkflows') project: Project;
	@PrimaryColumn() projectId: string;
}
```

So **sharing is a join row carrying a sharing role** — the same shape as membership. `SharedCredentials`
mirrors it, and `ProjectSecretsProviderAccess` (`project-secrets-provider-access.ts`) governs which
project may use which secrets provider.

**➜ F03-06 [foundational] — Sharing is the same primitive as membership: a join row plus a role.**
**Plain meaning:** putting a workflow in front of a team and putting a person in a team are the *same
operation* with a different subject. **Why it matters:** one relation type covers both, which is why the
model stays small as it grows.

---

## 6. Variables, storage, and versioning

### 6.1 Variables are project-scoped — or global

`packages/@n8n/db/src/entities/variables.ts`:

```ts
@Entity()
export class Variables extends WithStringId {
	@Column('text') key: string;
	@Column('text', { default: 'string' }) type: string;
	@Column('text') value: string;
	// If null, it's a global variable
	@ManyToOne('Project', { onDelete: 'CASCADE', nullable: true }) project: Project | null;
}
```

**➜ F03-07 [foundational] — A variable belongs to a project, or to no project (global), and the comment
says so.** **Plain meaning:** configuration has a scope, and "unscoped" is an explicit value rather than
an accident. **Why it matters:** it is the two-level shape from §3.1 again, applied to data — and
`onDelete: 'CASCADE'` means a project's variables die with it.

### 6.2 Storage is an interface — and two backends are enterprise

`packages/@n8n/blob-storage/src/` holds a **`ByteStore` interface** with a **`byte-store-registry.ts`**
and these implementations:

| File | Backend | Licensed? |
|---|---|---|
| `fs-byte-store.ts` | the local filesystem | Sustainable Use |
| **`azure-byte-store.ee.ts`** | Azure Blob | **`.ee` — enterprise** |
| **`s3-byte-store.ee.ts`** | S3 | **`.ee` — enterprise** |
| `object-store/`, `json-store.ts`, `azure-blob/` | supporting | mixed |

**➜ F03-08 [foundational] — Binary storage is a pluggable `ByteStore`, and the two cloud backends are
enterprise-licensed.** **Plain meaning:** self-hosters get the filesystem; S3 and Azure cost money. **Why
it matters:** it is a clean seam (a registry and an interface), and it is a precise example of how n8n
draws its commercial line — *not* by crippling the architecture, but by licensing two adapters.

### 6.3 Workflows are versioned and shared

`packages/@n8n/db/src/entities/workflow-entity.ts` carries `shared: SharedWorkflow[]`,
`activeVersionId` (nullable), a version column (`default: 1`), and a relation to `WorkflowHistory`.

**➜ F03-09 [foundational] — A workflow is versioned, has one active version, and is shared by a join
row.** **Plain meaning:** editing a workflow does not destroy its history, and sharing it does not copy
it. **Why it matters:** versioning plus sharing is what lets a team change something safely.

---

## 7. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F03-01** | **`Project` with `type: 'personal' \| 'team'`** — one object, two modes. | P2 | Your private space and your team's space are the same thing. | A two-mode container; no second hierarchy. |
| **F03-02** | **Membership is a join row keyed (userId, projectId) carrying a Role by slug.** | P2 | Being in a project is a real relation. | Composite-key membership; custom roles without migrations. |
| **F03-03** | **Two-level roles** — 4 global (`owner`/`admin`/`member`/`chatUser`) and 6 resource-level. | P2 | "What can I do anywhere" vs "what can I do to this". | Admin-of-a-tenant vs editor-of-a-thing, kept apart. |
| **F03-04** | **206 `resource:action` scopes** across global, project and three sharing domains — and **four of the five scope files are `.ee`**. | P2 | Nothing asks "are you an admin?"; it asks "may you do X to this". | An auditable, composable capability model. |
| **F03-05** | **`User` ≠ `AuthIdentity`** — one person, several identities, unique per provider. | P2 | Sign in two ways, stay one person. | Accounts separated from logins; SSO becomes possible. |
| **F03-06** | **Sharing is the same primitive as membership** — a join row plus a role, for workflows and credentials. | P2 | Put a workflow in front of a team the way you put a person in it. | One relation type covers both. |
| **F03-07** | **Variables are project-scoped or global**, with `CASCADE` on the project. | P2 | Settings have a scope, and unscoped is explicit. | The two-level shape applied to data. |
| **F03-08** | **`ByteStore` is pluggable, and S3/Azure are `.ee`.** | P2/PZ | Self-hosters get the filesystem; clouds cost money. | A clean seam; the commercial line is drawn on adapters. |
| **F03-09** | **Workflows are versioned, have one active version, and are shared not copied.** | P2 | Edit safely; share without duplicating. | Versioning + sharing is what makes team work safe. |
| **F03-10** | **The CLI's silence on tenancy was not the product's** — the server has a full model; the CLI is an operator tool. | P2 | (resolves batch 01's open question) | A recorded resolution, not a guess. |
| **F03-11** | **`roleMappingRules` are many-to-many with projects** — so external role mappings can be declared per project. | P2/PZ | Map your SSO groups to n8n roles. | Declarative external-role mapping. |
| **F03-12** | **`customTelemetryTags` is a column on `Project`** — telemetry is scoped by container. | PZ | (indirect) | Observability tagged at the tenancy boundary. |

---

## 8. Divergences and honest bounds

- **One question from batch 01 is now resolved, and it resolves *against* the CLI's silence.** Batch 01
  recorded that the CLI has no tenancy notion; this batch measured a full tenancy model in the server.
  Both are true — the CLI is an operator tool and the server is the product. **Recorded as F03-10 rather
  than quietly overwriting the earlier note.**
- **Bound:** this batch read the **data model and permissions** — `Project`, `ProjectRelation`, `Role`,
  `Scope`, `User`, `AuthIdentity`, sharing, variables, blob storage, workflow versioning. It did **not**
  read the **enforcement** path (how a scope is checked at request time), the LDAP/SAML/OAuth flows, or
  the enterprise `role-mapping-rule` mechanics; those are named rather than half-covered.
- **Bound:** the **206** figure counts **scope slugs across the five scope files**; scopes may be
  composed, and the effective count of distinct abilities is a different (larger) number. The figure is
  stated as what it measures.
- **Bound (stated plainly):** the `.ee` marking is read from **filenames** (`.ee.ts` / `.ee` dirs), which
  is exactly what `LICENSE.md` says governs. A file's licence is a legal fact this study cannot verify
  beyond what the licence text declares.

---

## 9. Carried forward to batch 07 (the synthesis)

Four candidates for the highest transferable value, to be ranked in batch 07:

1. **The two-mode container (F03-01)** — `personal | team` in one column. The simplest tenancy shape that
   still supports teams.
2. **The two-level role model (F03-03 / F03-04)** — global roles for the instance, resource-level roles
   for the thing, and 206 `resource:action` scopes instead of role checks.
3. **`User` separated from `AuthIdentity` (F03-05)** — one person, several logins, one permission set.
4. **Sharing as the same primitive as membership (F03-06)** — one join-row-plus-role relation for both.

All four are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 03 of 07. Read from source on 2026-10-15. Next: `findings/04-automations.md`.*
