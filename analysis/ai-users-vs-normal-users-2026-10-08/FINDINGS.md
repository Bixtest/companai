# AI Users vs Normal Users — Forensic Findings

**Date:** 2026-10-08
**Codebase:** `C:/Users/Ramzi/Downloads/companai/workspace/starting-kit`
**Question:** Is the owner's idea — "treat creating a new AI agent exactly like creating a new user, one form with an 'AI user' tick" — structurally sound? If not, exactly what breaks?

**Method:** Every structural claim below is established by **two independent routes** (entity + migration, route + command, type + consumer). Where the two disagree, it is stated. All paths are relative to the repo root above. No code was modified.

---

## §1 What exists today

### 1.1 How a normal USER is modelled and created

**Entity — `packages/core/src/modules/auth/data/entities.ts:14-51`**

```ts
@Entity({ tableName: 'users' })
export class User {
  id!, tenantId?, organizationId?, email!, emailHash?, name?,
  passwordHash?, isConfirmed!, lastLoginAt?, createdAt, updatedAt?, deletedAt?
}
```

The `User` entity has **no `principal_kind`, no `user_type`, no `kind`, no `is_ai` field.** Fields are: `id`, `tenant_id`, `organization_id`, `email`, `email_hash`, `name`, `password_hash`, `is_confirmed`, `last_login_at`, timestamps + soft-delete.

- **Route 2 (migration agrees):** `packages/core/src/modules/auth/migrations/Migration20251030150038.ts:14` creates `users` with exactly those columns. Grep for `user_type|principal_kind` across the auth entity + all auth migrations returns hits only at lines 750/848 of the entity (`AuthorityTrustGrant`, `AuthorityProjectMembership` — authority tables, not `users`) and in `Migration20260811180000.ts` / `Migration20260811200000.ts` (authority tables). **The `users` table has no actor-kind column.**

**Attachment to tenant:** `User.tenantId` (nullable, `entities.ts:18-19`) plus `User.organizationId` (`entities.ts:21-22`). Tenant is derived from the organization at create time (see command below), not passed as a trusted field for non-super-admins.

**Attachment to roles — join table `user_roles`:**
- Entity `UserRole` — `entities.ts:202-220` (`@ManyToOne(() => User) user`, `@ManyToOne(() => Role) role`, indexed on both).
- Migration `Migration20251030150038.ts:25` — `create table "user_roles" (… "user_id" uuid not null, "role_id" uuid not null …)`. **Two routes agree.**

**Create-user route — `packages/core/src/modules/auth/api/users/route.ts`**
- Route metadata: `route.ts:107-112` — POST requires `auth.users.create`.
- The CRUD factory hosts the create action: `route.ts:127-142` → `commandId: 'auth.users.create'`.
- **Active server contract** is the Zod schema `userCreateSchema` at `route.ts:58-68`:
  `{ email, name, password?, sendInviteEmail?, organizationId (uuid, required), roles?: string[] }` with `.refine(data => data.password || data.sendInviteEmail)`.
- **Two routes for the contract:** the shipped OpenAPI doc (`route.ts:638-657`, `schema: userCreateSchema`) and the UI form (`packages/core/src/modules/auth/backend/users/create/page.tsx:187-261`) both use email/name/password|sendInviteEmail/organizationId/roles. The form payload (`page.tsx:334-352`) does not send any kind flag.

**Create-user command — `packages/core/src/modules/auth/commands/users.ts`**
- `createUserCommand` at `users.ts:196`; `id: 'auth.users.create'`, `capability: 'auth.users.create'` (`users.ts:197-199`).
- It parses `createSchema` (`users.ts:106-116`), resolves the org→tenant (`users.ts:204-213`), computes `emailHash` (`users.ts:215`), enforces per-tenant email uniqueness (`users.ts:220-221`), hashes the password, creates the row via `dataEngine.createOrmEntity({ entity: User, data: { … } })` (`users.ts:232-243`), then attaches roles via `syncUserRoles` (`users.ts:250-253`, defined `users.ts:930-972`).
- **Email uniqueness is keyed on `email_hash`** — this is the second route to the claim that a user *is a credential*: the entity comment (`entities.ts:4-13`) and migration `Migration20260610120000` (named there) own the partial unique index `users_tenant_email_hash_uniq`.

**So a "user" in this platform = an email-credential row + tenant/org scope + a `user_roles` link set + `user_acls` overrides.**

### 1.2 How a normal ROLE is modelled and created

**Entity — `entities.ts:53-73`**
```ts
@Entity({ tableName: 'roles' })
export class Role { id!, name!, tenantId!, createdAt, updatedAt?, deletedAt? }
```
Migration agrees: `Migration20251030150038.ts:6`.

**Role create route — `packages/core/src/modules/auth/api/roles/route.ts`**
- POST requires `auth.roles.manage` (`route.ts:95-100`).
- `roleCreateSchema` at `route.ts:63-66`: `{ name (min2,max100), tenantId? }` — **a role is only a name + tenant.**
- Create action → `commandId: 'auth.roles.create'` (`route.ts:119-126`) with `enforceRoleTenantAccess`.

**How permissions attach to a role — `role_acls` with `features_json`. CONFIRMED.**
- Entity `RoleAcl` — `entities.ts:271-303`:
  ```ts
  @Entity({ tableName: 'role_acls' })
  export class RoleAcl {
    id!, role! (ManyToOne Role), tenantId!,
    featuresJson?: string[] | null,   // name: 'features_json', type: 'json'
    isSuperAdmin: boolean = false,     // name: 'is_super_admin'
    organizationsJson?: string[] | null, // name: 'organizations_json'
    createdAt, updatedAt?, deletedAt?
  }
  ```
  The comment at `entities.ts:283` states verbatim: *"Feature list (string-based). Use JSON array to preserve order and allow wildcards like `example.*`."*
- **Route 2 (migration agrees):** `Migration20251030150038.ts:9` — `create table "role_acls" (… "features_json" jsonb null, "is_super_admin" boolean … "organizations_json" jsonb null …)`.

**Reader/writer of `features_json`:**
- **Writer** = `PUT /api/auth/roles/acl` — `packages/core/src/modules/auth/api/roles/acl/route.ts:127-286`. Schema `putSchema` at `route.ts:27-33` (`features: z.array(z.string()).optional()`). Persists `aclToPersist.featuresJson = requestedFeatures` at `route.ts:264`, inside `withAtomicFlush` (transactional). Requires `auth.acl.manage` (`route.ts:35-38`). Invalidates tenant RBAC cache at `route.ts:272-279`.
- **Reader** = `GET /api/auth/roles/acl` — `route.ts:54-125`; returns `features: Array.isArray(acl.featuresJson) ? acl.featuresJson : []` (`route.ts:105`).
- **Reader (decision path)** = `RbacService.loadAcl(...)`, used e.g. in `users/route.ts:195` and `run-object/route.ts:148`; it produces `acl.features` / `acl.isSuperAdmin`.

**A role is therefore: a name + tenant, with a separate per-tenant ACL row holding a flat array of permission strings (and an org-visibility list and a super-admin flag). Permissions are strings; there is no capability object, no tool binding, no per-act authority — that lives elsewhere.**

### 1.3 How an AI AGENT is modelled and created

**Agent declaration type — `packages/ai-assistant/src/modules/ai_assistant/lib/ai-agent-definition.ts:290-409`**

`AiAgentDefinition` is a **plain TypeScript code object**, not a MikroORM entity:
```
{ id, moduleId, label, description, systemPrompt, allowedTools: string[],
  executionMode?, output?, requiredFeatures?, readOnly?, mutationPolicy?,
  loop?, defaultProvider?, defaultModel?, dataCapabilities?, … }
```
`defineAiAgent(def) { return def }` at `ai-agent-definition.ts:429-431` is an identity function — declaration is purely in code.

**Agent declarations found (code-declared, 5 total in this tree):**
- `packages/ai-assistant/src/modules/ai_assistant/ai-agents.ts:95-128` — one agent, `business_ir.query_author` (`AiAgentDefinition` const `agent`, exported `aiAgents = [agent]` at line 128).
- `packages/core/src/modules/catalog/ai-agents.ts:540` — `export const aiAgents: AiAgentDefinition[] = [agent, merchandisingAgent]` (2).
- `packages/core/src/modules/customers/ai-agents.ts:471,520,527` — `customers.deal_analyzer`, `customers.deal_analyzer_tool_loop`, plus `agent` (3).
- **Two independent routes for "agents are code":** (a) the declaration files above; (b) the **generated** registry `apps/mercato/.mercato/generated/ai-agents.generated.ts:1-61` which statically `import * as AI_AGENTS_ai_assistant_913 from "@open-mercato/ai-assistant/modules/ai_assistant/ai-agents"` and flattens `allAiAgents` at build time (line 56). No table, no insert — the file is emitted by `mercato generate registry`.

**Agent registry — `packages/ai-assistant/src/modules/ai_assistant/lib/agent-registry.ts`**
- In-memory `const agentsById = new Map<string, AiAgentDefinition>()` (`agent-registry.ts:16`).
- `loadAgentRegistry()` (`agent-registry.ts:278-299`) dynamically imports the generated module, `populateFromAgents` (`:185-199`), then applies overrides/extensions.
- `getAgent(id)` (`:301-303`) reads the Map. `listAgents()` (`:305-307`) sorts the Map values.
- `resetAgentRegistryForTests()` (`:317-320`) and `seedAgentRegistryForTests()` (`:327-331`) — test-only hooks that clear/seed the in-memory Map.
- **There is NO DB read anywhere in the registry.** Confirmed by a repo-wide grep for `from('ai_agents'` / `tableName: 'ai_agents'` — zero hits.

**Agent runtime — `packages/ai-assistant/src/modules/ai_assistant/lib/agent-runtime.ts`**
- `runAiAgentObject` (`agent-runtime.ts:1866`) and `runAiAgentText` (`agent-runtime.ts:1422`) both call `resolveAiAgentTools` which calls `loadAgentRegistry()` and `checkAgentPolicy` (`agent-tools.ts:316-333`).
- **Whose identity runs an agent:** the caller's. `run-object/route.ts:148` loads the *caller's* ACL (`rbacService.loadAcl(auth.sub, …)`), and passes `userId: auth.sub`, `features: acl.features`, `onBehalfOfUserId: auth.userId ?? null` into the runtime (`run-object/route.ts:173-181`). **The agent itself has no identity, no ACL row, no role** — it borrows the invoking principal's.

**Agent HTTP surface is read-only:** `packages/ai-assistant/src/modules/ai_assistant/api/ai/agents/route.ts` — only a `GET` that returns `listAgents()` filtered by the caller's features. There is **no POST/create-agent route.** (Per-agent sub-routes exist for `prompt-override`, `mutation-policy`, `models`, `loop-override` — these write *override* rows, not agents.)

**What IS persisted about agents** (overrides + telemetry only, never identity) — `packages/ai-assistant/src/modules/ai_assistant/data/entities.ts`:
`ai_agent_prompt_overrides` (:30), `ai_pending_actions` (:103), `ai_agent_runtime_overrides` (:229), `ai_token_usage_events` (:378), `ai_token_usage_daily` (:503), `ai_tenant_model_allowlists` (:599), `ai_agent_mutation_policy_overrides` (:652), `ai_chat_conversations` (:717), `ai_chat_conversation_participants` (:806), `ai_chat_messages` (:880). **None of these is an agent identity row.** They key on `agent_id` as an opaque string or on `user_id`.

**Verdict for §1.3: agents are 100% code-declared and in-memory. They are not rows in any table.**

### 1.4 The delegation / authority model

**The resolver — `packages/shared/src/lib/authority/decision.ts`**
- `resolveDecision(input)` (`decision.ts:227-430`). Input actor is `{ kind: PrincipalKind; id; holdsCapability; trustCeiling?; delegationCeiling?; invokerCeiling?; graphCeiling? }` (`decision.ts:91-124`).
- **Gates A0–A5** (`decision.ts:160-167`): A0 blocked, A1 propose, A2 approve-first, A3 hold-and-commit, A4 execute-and-review, A5 execute-and-log.
- **`MACHINE_KINDS: PrincipalKind[] = ['ai_worker', 'service']`** (`decision.ts:217`). The autonomy matrix `boundedByAutonomyMatrix = MACHINE_KINDS.includes(actor.kind) || Boolean(actor.delegationCeiling)` (`decision.ts:309`) — **machines are bounded by the effect-class matrix; humans are not.**
- Untrusted machine default `UNTRUSTED_MACHINE_CEILING` (`decision.ts:207-215`): everything with an effect is capped at A2 ("No trust record for this worker, so it acts only with prior approval", `:365-374`).

**Enforcement service — `packages/core/src/modules/auth/services/authorityEnforcementService.ts`**
- `class AuthorityEnforcementService` (`:182-539`). Modes `off | shadow | enforce` (`:23-24`), per-tenant, default `shadow` (`:43`).
- `decideFor(subject, feature, scope, { onBehalfOfUserId, recordId })` (`:259-316`) builds the `ResolveInput` actor, parsing the subject kind with `parseSubject(subject)` (`:268`).
- **Invoker authority — invariant I4** `invokerCeilingFor` (`:488-526`): *"An API key acts for the person who owns it, and an AI worker acts for whoever set it going… So the invoker is resolved as themselves… and whatever gate that produces becomes a ceiling. If they may not perform it at all, the answer is A0."* Only one level deep (machine → person) by construction.

**Whose permissions are checked when an AI acts?** — **The person it acts for, intersected with itself.**
- The **S-02 "Hermes tool door"** — `packages/ai-assistant/src/modules/ai_assistant/lib/tool-authority.ts`, function `checkToolAuthority` (`:141-242`). It passes `onBehalfOfUserId = responsibleUserIdFor(context)` (`:178`, defined `:54-60`) to `resolver.decideFor(subject, feature, scope, { onBehalfOfUserId })` (`:183`). `responsibleUserIdFor` reads `context.onBehalfOfUserId` (auth-boundary resolved), and returns `null` when the person *is* the actor (`:58`).
- Route 2: the unit test `tool-authority.s02.test.ts` fakes the resolver and asserts the intersection is carried (`:1-18`, `:94-101`).

**Two independent routes for "identity is a `kind` + `onBehalfOfUserId`":**
1. `packages/shared/src/lib/auth/principal.ts:28` (`PrincipalKind = 'human' | 'ai_worker' | 'service' | 'system'`), `:30-45` (`Principal.onBehalfOfUserId`), `:118-143` (`derivePrincipal`).
2. `authorityEnforcementService.decideFor` + `tool-authority.checkToolAuthority` both carry `onBehalfOfUserId` into `resolveDecision` via `invokerCeiling`.

**Authority tables (all keyed on a principal, not a user FK) — `entities.ts`:**
`authority_pending_acts` (`:405`, has `actor_id` **text** + `actor_kind` **text**, `:430-434`), `authority_act_reviews` (`:527`, same), `record_locks` (`:601`), `authority_delegations` (`:662`, `grantor_principal_id`/`grantor_kind`/`grantee_principal_id`/`grantee_kind` — all text), `authority_trust_grants` (`:739`, `principal_id`+`principal_kind` text), `authority_projects` (`:792`), `authority_project_memberships` (`:833`, `principal_id`/`principal_kind`), `authority_denials` (`:909`, `subject_principal_id`/`subject_kind`).

The comment at `entities.ts:646-660` states the design intent verbatim:
> *"Both ends are principals, not users… an AI worker can hold a delegation and can grant one, and neither is representable if the columns say `user_id`."*

And `entities.ts:898-901`: *"`subject_principal_id` is `text`, not `uuid`… an API key acting is `api_key:<id>`, and a `uuid` column would make machine actors undeniable."*

### 1.5 Is there ANY existing notion of an "AI user"?

**YES — but it is NOT a user. It is a credential kind on `api_keys`.**

- The principal vocabulary includes `ai_worker`: `principal.ts:28`.
- **The producer of `ai_worker`** — `packages/core/src/modules/api_keys/data/entities.ts:52-53`:
  ```ts
  @Property({ name: 'principal_kind', type: 'text', nullable: true })
  principalKind: string | null = null
  ```
  Comment (`entities.ts:35-51`): *"What kind of actor this credential is — `service` (default) or `ai_worker`. **This is what gave `ai_worker` a producer**… Marking a key changes the subject it issues (`ai_worker:<id>` rather than `api_key:<id>`)."*
- **Route 2 (migration agrees):** `packages/core/src/modules/api_keys/migrations/Migration20260812180000.ts:32` — `alter table "api_keys" add column if not exists "principal_kind" text null`, plus partial index `api_keys_principal_kind_idx` (`:38-40`).
- Subject encoding: `aiWorkerSubject(apiKeyId) => 'ai_worker:'+id` (`principal.ts:78-80`); `parseSubject` maps the prefix to `kind:'ai_worker'` (`principal.ts:88-96`).
- Validation of the field: `packages/core/src/modules/api_keys/data/validators.ts:33` — `principalKind: z.enum(['service','ai_worker']).optional()`. The doc-comment (`:20-32`) is explicit that `human` and `system` are **deliberately excluded**: *"`human` would let a credential impersonate a person, which is the one thing the principal split exists to prevent."*
- Persisted at creation: `packages/core/src/modules/api_keys/api/keys/route.ts:126` — `principalKind: input.principalKind ?? null`.
- Downstream consumers treat `ai_worker` as a machine everywhere: `audit_logs/data/entities.ts:30,43-44` (`actor_kind`), `ai_token_usage_events` (`Migration20260813090000.ts:31,40-41`), `rbacService.ts:320` (`isApiKeyBackedKind`), i18n label `audit_logs.actions.actorKind.ai_worker` = "AI worker".

**What does NOT exist (explicit negative results):**
- No `isAiUser`, `is_ai_user`, `agentUser`, `aiUser`, `userType`, `user_type`, `principalType`, `principal_type` anywhere in `packages/**/*.ts` (ripgrep, excluding node_modules + generated: only hits are Gmail's `OM_GMAIL_PUBSUB_SERVICE_ACCOUNT_EMAIL`, unrelated).
- No `serviceAccount`/`service_account` concept (same grep — only a Gmail relay email string).
- No `kind: 'ai' | 'agent' | 'bot'`.
- The `users` table has **no kind column** (§1.1).
- There is **no `users` row that is an AI** — an "AI actor" today is an `api_keys` row, full stop.

**Where I searched for §1.5:**
- `rg -i 'isAiUser|is_ai_user|agentUser|aiUser|agent_user|ai_user|serviceAccount|service_account|principalType|principal_type|userType|user_type' packages/ -g '*.ts' -g '!**/node_modules/**' -g '!**/generated/**'` → only Gmail service-account strings.
- `rg 'principal_kind|principalKind|ai_worker' packages/core/src/modules/api_keys/` → the credential-kind producer.
- Full read of `packages/core/src/modules/auth/data/entities.ts` (users/roles/role_acls).

### 1.6 The migration / table list

**Migration directories:** MikroORM migrations are **per-module**, under `packages/core/src/modules/<module>/migrations/` (215 `Migration*.ts` files under `packages/core/src` alone) plus `packages/ai-assistant/src/modules/ai_assistant/migrations/` (11 files, listed in §1.3).

**Tables relevant to identity/authority (two independent routes — entity `tableName:` AND `create table`/`alter table` in a migration):**

| Table | Entity | Migration |
|---|---|---|
| `users` | `auth/data/entities.ts:3` | `auth/.../Migration20251030150038.ts:14` |
| `roles` | `:53` | `:6` |
| `user_roles` | `:202` | `:25` |
| `role_acls` (`features_json`) | `:271` | `:9` |
| `user_acls` | `:306` | `:23` |
| `api_keys` (`principal_kind`) | `api_keys/.../entities.ts:13` | `Migration20260812180000.ts:32` |
| `authority_pending_acts` (`actor_id`/`actor_kind` text) | `:405` | authority migrations |
| `authority_delegations` (`*_principal_id`/`*_kind` text) | `:662` | authority migrations |
| `authority_trust_grants` (`principal_id`/`principal_kind`) | `:739` | `Migration20260811180000.ts`/`1180000` |
| `authority_denials` (`subject_principal_id`/`subject_kind`) | `:909` | authority migrations |

**Is there any table that could hold an AI identity?**
**No dedicated one exists.** The only row that *is* an AI identity today is `api_keys` with `principal_kind = 'ai_worker'` (§1.5). All `ai_*` tables in `packages/ai-assistant/src/modules/ai_assistant/data/entities.ts` hold **overrides, token usage, pending actions, and chat** — keyed on `agent_id` (opaque text) or `user_id`; **none is an agent registry.** A grep for `from('ai_agents'`, `tableName: 'ai_agents'`, `ai_users`, `ai_workers` across the repo and across the AI migrations returns nothing.

**There is no foreign key from any agent to `users`, because agents are not rows. And there is no FK from `users` to any agent.**

---

## §2 The structural gap

### What is COMMON between a user and an agent
- Both ultimately authenticate/execute **through an API-key-shaped credential or a user session**, and both resolve RBAC from `features_json` string arrays via `RbacService.loadAcl(...)`.
- Both are bounded by the same **authority resolver** (`resolveDecision`) and the same gate vocabulary (A0–A5).
- Both are attributable in the journal via `actor_kind` (`audit_logs/.../entities.ts:43`) — `human` vs `ai_worker`.
- Both can hold delegations, denials, and trust grants, because those tables key on a **principal** (text id + kind), not a user FK (`entities.ts:646-660`).

### What is SEPARATE
| Dimension | User | Agent |
|---|---|---|
| **Storage** | DB row (`users`, `entities.ts:14`) | In-memory code object (`ai-agent-definition.ts:290`; `agent-registry.ts:16`) |
| **Creation** | `POST /api/auth/users` → command `auth.users.create` (`users/route.ts:129`, `users.ts:196`) | Compiled into `ai-agents.generated.ts` at build (`ai-agents.generated.ts:1,56`); no write route |
| **Identity** | `users.id` (uuid) | none — borrows the invoker's principal; `agent_id` is an opaque string on override rows |
| **Credential** | `email` + `password_hash` (`entities.ts:24,34`) | none of its own; runs under the caller's API key/session |
| **Permissions** | role → `role_acls.features_json` + `user_acls` overrides | declared as `requiredFeatures: string[]` in code (`ai-agent-definition.ts:382`), checked by `checkAgentPolicy` against the *caller's* features |
| **Tools** | n/a | `allowedTools: string[]` in code (`ai-agent-definition.ts:296`), validated against the tool registry at runtime (`agent-tools.ts:344-401`) |
| **Actor kind** | `human` (implicit, `principal.ts:95`) | `ai_worker` — **but issued from an `api_keys` row, not from the agent** (`api_keys/entities.ts:52`) |

**The crux:** an *agent* (the thing with tools, prompts, loops) and an *AI actor* (the thing with `kind: 'ai_worker'`, roles, and authority) are **two different objects today, and neither is a user.** The agent is code; the AI actor is an API key. Nothing joins them by construction — the link is a string the caller supplies.

---

## §3 Would the owner's unified model work? — point-by-point verdict

The proposal has **three separable parts**. They do not have the same verdict.

### Part A — "One user-creation form, with an 'AI user' tick that reveals extra settings."

**Partly sound, partly missing, partly conflicting.**

- **Sound in spirit — and this is the missing UI, not a duplicate:** the platform already has the *data model* for the pattern the owner is reaching for — *one credential object, a kind flag, an extra settings block.* `api_keys.principal_kind` (`api_keys/entities.ts:52`) + `createApiKeySchema.principalKind` (`validators.ts:33`) is exactly a "tick that reveals machine-ness."
  **Correction (from CRITIC A5):** that tick exists **server-side only**. The shipped API-key create page (`api_keys/backend/api-keys/create/page.tsx:82-109,162-176`) has *no* `principalKind` control — it sends only `name, description, organizationId, roles, expiresAt`. So today the only way to mark an AI worker is a direct API/CLI call. The owner's "tick on a form" is therefore **the UI the backend is missing**, which makes Part A more sound than a pure re-invention — provided it marks an `api_keys` row, not a `users` row.
- **Redundant with an existing, deliberate design decision:** the codebase explicitly *rejected* making the AI actor a new identity table and *chose* the API-key-as-credential route. `Migration20260812180000.ts:13-19`: *"**Why an API key rather than a new table.** An AI worker needs a credential, and a key already is one: hashed, revocable, org-scoped, rate-limited and role-bearing. A parallel identity system would have duplicated every one of those controls and given us two places for them to drift apart."* A "user tick" that spawns an AI actor re-creates the parallel identity system that comment argues against — unless it delegates to `api_keys`.
- **Conflicts with a stated invariant:** `validators.ts:28-31` says `human` is *deliberately* not a selectable `principalKind` because *"a credential impersonating a person is the one thing the principal split exists to prevent."* A user-form tick that produces an `ai_worker` must **not** create a `users` row whose `sub` parses as `human` (`principal.ts:95` returns `human` for a bare uuid) — otherwise an AI's actions land in the journal as a person, defeating U7/`actor_kind`.

### Part B — "AI roles created just like normal roles, a normal user's functionality scripted as AI functionality with its own permission settings, added to an AI role, handed to AI users."

**Structurally sound in its bones.** This is the part that already works, or is closest to working:

- **Roles already are principal-agnostic.** `roles`/`role_acls` (`entities.ts:53-303`) key on nothing human. But note: **`user_roles` links a Role to a `User` row specifically** (`entities.ts:202-213`). An AI actor (an `api_keys` row) holds roles through a **different** column — `api_keys.roles_json` (`api_keys/entities.ts:55`), not `user_roles`. So "AI roles created like normal roles, handed to AI users" works *only if the AI user is an `api_keys` row* (which already carries `roles_json`), **not** if it is a `users` row (because `user_roles.user_id` is a FK-shaped uuid and a user has no tools).
- **"Own permission settings"** = `role_acls.features_json` per role — already the mechanism, already per-tenant, already wildcarded (`entities.ts:283`).
- **"Scripted as AI functionality"** = the agent's `allowedTools` (`ai-agent-definition.ts:296`) + `requiredFeatures` (`:382`). These are code-declared, not role fields today. To make "functionality" a role property rather than a code property would mean moving tool bindings into the DB — a real change, but not a structural impossibility.

### Part C — "Two separate procedures collapse into one."

**Unsound as stated, for a concrete reason:** the two procedures create **different kinds of object that serve different purposes**, and the platform depends on that split:

1. **A `users` row has no tools, no loop, no prompt, no model.** An agent definition is ~120 lines of behaviour (`ai-agent-definition.ts:290-409`). A user form tick cannot reveal "tools", "maxSteps", "executionMode", "output schema" without effectively embedding the agent-declaration surface in a user form — at which point you have the separate procedure again, just relocated.
2. **The agent registry resolves from code, never the DB** (`agent-registry.ts:16,278`; grep confirms zero `ai_agents` table). A DB-created "AI user" would **not appear** to `runAiAgent*` unless the registry is taught to merge DB rows — a non-trivial change that also must preserve the build-time `ai-agents.generated.ts` contract and the override/extension pipeline (`agent-registry.ts:215-276`).
3. **The audit/attribution model assumes a resolvable actor kind**, and it already had to be *migrated* to tolerate machines: `Migration20260813090000.ts:6-13` documents that `ai_token_usage_events.user_id` was `uuid not null` and `ai_worker:<id>` **threw a 500** (`invalid input syntax for type uuid`) the moment a machine ran an agent. Any unified model that lets an AI actor reaching user-typed columns re-opens exactly this class of failure.
4. **Foreign keys to `users` an agent would have to satisfy:** `sessions.user_id`, `password_resets.user_id` (`entities.ts:227,251`), `user_roles.user_id` (`:209`), `user_acls.user_id` (`:311`), `ai_chat_conversation_participants.user_id` (**uuid**, `ai-assistant/.../entities.ts:847`), `audit_logs.actor_user_id` (**uuid**, `audit_logs/.../entities.ts:26`). An `ai_worker:<id>` string **cannot** satisfy any of these uuid columns — the platform already hit this and had to add nullable `actor_id`/`actor_kind` text columns instead (`Migration20260813090000.ts:39-41`). A unified "AI user" that is a `users` row would have to either (a) get a real uuid (fine) but then be indistinguishable from a person by subject (`principal.ts:95`), or (b) keep the string subject and violate every one of those columns.

### The single verdict
- **Sound:** a *unified actor* concept — one principal with a `kind`, roles, and authority — is **already the platform's design** and works (`principal.ts:28`, authority tables, `invokerCeiling`).
- **Partly sound:** "one form with a machine tick" is the pattern already used for API keys (`validators.ts:33`); applying it is coherent **if the AI user is an `api_keys` row with `principal_kind='ai_worker'`.**
- **Unsound:** merging the **agent** (code-declared behaviour: tools, prompt, loop, model) into the **user** object (a credential + roles), because the agent registry is code-only, the agent has no permissions of its own, and the uuid-typed user columns cannot hold a machine subject. What breaks first and hardest is **§3 Part C item 2**: a DB-only "AI user" is invisible to `runAiAgent*`, because the runtime reads `agentsById` (an in-memory Map built from a generated file), never the database.

---

## §4 What is NOT established (open questions + the grep that tried)

1. **Whether any *other* app/build wires catalog & customers agents.** The generated file in this tree lists only the `ai_assistant` module (`ai-agents.generated.ts:10`), yet `catalog/ai-agents.ts:540` and `customers/ai-agents.ts:527` declare agents. Whether those are registered depends on regeneration. *Tried:* reading `ai-agents.generated.ts` fully; `rg 'moduleId:'` on it. **Not closed — the generated file is a build artifact and may be stale.**

2. **Whether an `ai_worker` API key can currently be created through the UI.** **CLOSED (see CRITIC A5):** the *server* accepts `principalKind` (`keys/route.ts:126`, `validators.ts:33`) but the create page (`api_keys/backend/api-keys/create/page.tsx:82-109,162-176`) exposes **no such control** — grep for `principalKind|ai_worker` in `api_keys/backend/` returns nothing. Marking an AI worker is server/CLI-only today.

3. **The full set of tables with a uuid FK to `users`.** I enumerated the ones in `auth/data/entities.ts` and two AI/audit ones, but did not sweep all 215 migrations for every `references "users"` clause. *Tried:* entity-level grep + the two migrations I read. **Not closed — a repo-wide `references "users"` sweep was not run.**

4. **Whether `resolveDecision` is reached for a *human* actor in the same path.** The resolver is only consulted when enforcement mode is `shadow`/`enforce` (`authorityEnforcementService.ts:233`); default is `shadow` (`:43`), and `tool-authority.ts:175` permits immediately when mode is `off`. So "whose permissions are checked" is mode-dependent. **Partially established** (the code path exists and carries `onBehalfOfUserId`), but the runtime prevalence of `enforce` per tenant is data, not code — not measurable from here.

5. **Whether there is a planned/partial "AI user" spec in `.ai/specs`.** I saw `.ai/specs/implemented/2026-04-27-ai-agents-provider-model-baseurl-overrides.md` etc. via glob, but did not read the spec corpus for a "unified principal" proposal. *Tried:* glob `**/*ai-agents*`. **Not closed.**

---

## §5 Measured counts

- **Agent declarations in this tree:** 5 total (1 in `ai_assistant/ai-agents.ts:128`; 2 in `catalog/ai-agents.ts:540`; 3 in `customers/ai-agents.ts:527`), **0 DB rows**.
- **`ai-agents.generated.ts` modules wired in this build artifact:** 1 (`ai_assistant`).
- **Routes that create an agent:** **0.** (`api/ai/agents/route.ts` is GET-only.)
- **User-creation call sites:** 1 HTTP route (`api/auth/users/route.ts`) → 1 command (`auth.users.create`, `commands/users.ts:196`); 1 UI form (`backend/users/create/page.tsx:334`); 1 OpenAPI contract (`users/route.ts:638`).
- **Role-creation call sites:** 1 route (`api/roles/route.ts`) → 1 command (`auth.roles.create`); 1 ACL write route (`api/roles/acl/route.ts` PUT).
- **User-model identity columns (`users`):** 0 kind columns (id, tenant, org, email, email_hash, name, password_hash, is_confirmed, last_login_at, timestamps).
- **Principal kinds:** 4 (`human`, `ai_worker`, `service`, `system` — `principal.ts:28`).
- **Machine kinds bounded by the autonomy matrix:** 2 (`ai_worker`, `service` — `decision.ts:217`).
- **Actor-kind producers on a credential:** 2 (`service` default, `ai_worker` — `validators.ts:33`); `human` and `system` deliberately excluded.
- **Authorization gates:** 6 (A0–A5).
- **Tables that can hold an AI actor identity:** 1 — `api_keys` (`principal_kind`). **0 dedicated agent tables.**
- **uuid FKs to `users` that a string machine-subject cannot satisfy (sampled):** `sessions.user_id`, `password_resets.user_id`, `user_roles.user_id`, `user_acls.user_id`, `ai_chat_conversation_participants.user_id`, `audit_logs.actor_user_id`.
- **Migrations under `packages/core/src` alone:** 215; **AI-assistant migrations:** 11.
