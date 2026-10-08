# ANSWER — the two organisational questions (2026-10-08)

**Owner's questions, verbatim, and the verdict on each:**

1. *"Why don't we treat creating new agents in the platform just like creating new users instead of having two completely separate procedures for each?"*
   → **Partly right — and the right half is more right than you know.** The unification you want **already exists in the platform's design**, but it was built on the *credential* (API key), not the *user*. The missing piece is the **UI**, not a new procedure. What must **not** be unified is the *agent's behaviour* (tools, prompt, loop) — that lives in code, by a deliberate decision, and folding it into a user row would break the agent runtime. **Full reasoning in §1.**

2. *"Is it already well structured how there are core tables and functionalities across tenants, and when a table or database change is made in one tenant, that only impacts that tenant alone?"*
   → **Yes on schema — and the premise needs one correction.** A tenant **cannot create a table at all**; a per-tenant structure change is a **row**, not DDL, so it physically cannot leak to another tenant's *schema*. **But** there is one **real, reachable cross-tenant leak** in the code (a missing tenant filter on a read-back path), which is not a schema problem and should be fixed. **Full reasoning in §2.**

3. Your own proposed answer to CC-25 (*"shouldn't this be broken down into permissions we give or block from roles?"*)
   → **Yes — that is exactly the right model, and the platform already has the mechanism.** It is the same answer the research for §1 independently arrives at. **Confirmation in §3.**

---

## §1 — AI users should be first-class users. Here is what that means in code.

### 1.1 The finding that changes the framing

The platform **already separates two things that sound like one**:

| | What it is | Where it lives today |
|---|---|---|
| **The AI *actor*** (identity, roles, permissions, audit) | A **principal** with a kind | **`api_keys` row** with `principal_kind = 'ai_worker'` |
| **The AI *agent*** (tools, prompt, loop, model) | **Behaviour declared in code** | `ai-agents.ts` → compiled into `ai-agents.generated.ts` |

**Measured, two routes each:**
- The **actor** is real and DB-backed: `api_keys/data/entities.ts:52-53` declares `principal_kind`; migration `Migration20260812180000.ts:32` adds the column. The principal vocabulary is `human | ai_worker | service | system` (`shared/src/lib/auth/principal.ts:28`).
- The **agent** is code-only: `agent-registry.ts:16` is `const agentsById = new Map(...)`; the registry has **no** EntityManager, repository, or query — verified by grep returning zero DB reads. There is **no `ai_agents` table** anywhere in `packages/**`.
- **The `users` table has no kind column at all** — verified by mapping every `@Entity` in `auth/data/entities.ts`; the two `principal_kind` hits at lines 750/848 fall inside `authority_trust_grants` (739–791) and `authority_project_memberships` (833–871), **not** `users` (3–52).

So when you say *"AI users will have extremely diverse functionality"* — **you are right, and the platform already agrees**: it already lets an AI hold roles, delegations, trust grants, and denials, because those tables key on a **principal**, not a user FK. The comment in the authority entities says it in so many words: *"Both ends are principals, not users… an AI worker can hold a delegation and can grant one, and neither is representable if the columns say `user_id`."*

### 1.2 Your three sub-ideas, each judged separately

**A. "One user-creation form with an AI tick that reveals extra settings."**
→ **Sound, and it is the missing UI, not a new procedure.** The backend **already accepts** the tick: `api_keys/data/validators.ts:33` is `z.enum(['service','ai_worker']).optional()`, persisted at `api/keys/route.ts:126`. **But the shipped create page has no such control** (`api_keys/backend/api-keys/create/page.tsx` sends only `name, description, organizationId, roles, expiresAt`) — verified by grep for `principalKind` in that folder returning nothing. So the only way to mark an AI worker today is a direct API/CLI call. **Your idea is exactly the UI that is missing.**

**B. "AI roles created just like normal roles; a normal user's functionality scripted as AI functionality with its own permission settings; handed to AI users."**
→ **Structurally sound in its bones — this is the part that already works.** Roles (`roles` + `role_acls.features_json`) are principal-agnostic; the permission mechanism is a flat array of permission strings per role, per tenant, with wildcards. An AI actor holds roles through `api_keys.roles_json`. *One caveat:* `user_roles` links a role to a **`users` row specifically**, so an "AI user" must be an **api-key-shaped principal** (which already carries roles), **not** a `users` row — or the link table must be extended.

**C. "The two procedures collapse into one."**
→ **Unsound as stated — and this is the one thing I must push back on.** The *actor* can unify; the *agent behaviour* cannot, for one concrete reason:

> **A DB-created agent would be invisible to the AI runtime.** `runAiAgent*` resolves agents from the in-memory `agentsById` Map, which is populated only from the generated code file — never from the database. An agent created as a row would exist, have permissions, and **never run**, unless the registry is rewritten to hydrate from the DB. That is a substantial change, and the codebase records that it was made **deliberately** (`Migration20260812180000.ts:13-19`: *"Why an API key rather than a new table… a parallel identity system would have duplicated every one of those controls and given us two places for them to drift apart."*).

There is a second, harder constraint: **machine subjects cannot be stored in the columns that expect users.** An AI actor's id string is `ai_worker:<id>`; six columns are `uuid` foreign keys to `users` (`user_roles.user_id`, `sessions.user_id`, `user_acls.user_id`, `ai_chat_conversation_participants.user_id`, `audit_logs.actor_user_id`, `password_resets.user_id`). The platform **already hit this wall**: migration `Migration20260813090000.ts:6-13` documents the literal crash `invalid input syntax for type uuid: "ai_worker:<id>"`, which is why those tables gained nullable **text** `actor_id`/`actor_kind` columns. A "users row that is an AI" would either get a real uuid (and then be indistinguishable from a human in the audit trail) or keep the string subject (and violate every one of those columns).

### 1.3 The shape I recommend (and it is close to what you described)

**Unify the *actor* — which the platform already does — and expose it.**

1. **An "AI user" is an `api_keys` row with `principal_kind = 'ai_worker'`.** It already has a credential, roles, org scope, revocation, rate limits, authority delegation, and correct audit attribution. **Nothing new must be invented.**
2. **Add the tick to a create form** — the exact UI your idea describes. This is the missing piece, and it is small.
3. **Bind an agent *to* an AI user as configuration, not identity.** The agent stays code-declared (so the runtime works); the *binding* — which agent this AI user may run, with which tools, under which permissions — becomes a row. **This is the piece worth designing**, and it is where "I can create an AI role and hand it to an AI user" becomes real.
4. **Do not fold agents into the user row.** Keep the credential/principal split. It is the platform's most deliberate design decision and it is load-bearing.

**Net:** your instinct is right; the refinement is *which object gets unified*. Unify the **actor** (done), bind the **agent** (to build), and keep the **behaviour** in code (by design).

### 1.4 The impact on the code scan, and on SD-1/CC-25

- **The scan remains valid.** Nothing in the "unified actor" direction contradicts the existing SD-1 permissions work; they *meet* at the same point — permissions attached to roles, given to principals.
- **CC-25's answer becomes concrete** (§3 below): the permission to *make a structure-permission decision* is a permission string on a role, and the actor's principal kind decides *which* strings exist for them.
- **New work to plan** (not yet scheduled — needs your go-ahead): the AI-user tick UI; the agent↔AI-user binding row; and teaching the agent registry to resolve a *binding* (never an agent definition) from the DB.

---

## §2 — Tenant isolation: yes on schema, one real leak elsewhere.

### 2.1 The measured model (one sentence)

**One Postgres database, one schema (`public`), every tenant-scoped table carries a nullable `tenant_id` column, and isolation is enforced in the application layer** (MikroORM repository + query engine injecting `where tenant_id = ?`) — **there is no Row-Level Security, no schema-per-tenant, and no DB-per-tenant.**

Measured: **224** entity-backed tables; **209** carry `tenant_id`; **15** do not (all either global core or child/junction tables scoped by a parent FK). **241** migrations, all applied to **one** `DATABASE_URL`. **Zero** occurrences of `ROW LEVEL SECURITY` / `CREATE POLICY` / `search_path`.

### 2.2 Your assumption — TRUE, with one correction

> *"…when a table or database change is made in one tenant, that only impacts that tenant alone."*

**TRUE for the only mechanism that exists — and the correction is that the premise describes something the platform does not permit.**

- **A tenant cannot make a table or database change.** A custom entity/field is a **row**, not DDL: `entities.records.<entityId>` is a logical id backed by `custom_entities_storage` (a shared JSONB `doc` table) plus `custom_field_defs`. Adding a field is an `INSERT` with that tenant's `tenant_id`. **No `CREATE TABLE`/`ALTER TABLE` runs at runtime** (verified: the only runtime DDL is the global pgvector search driver and the sqlite cache — both single global tables, scoped by column, not tenant-triggered).
- **Therefore a per-tenant structure change physically cannot alter another tenant's schema.** There is no shared DDL object to leak — the "structure" *is* data.
- **All real DDL is platform-release-only and global by design.** A migration touching a core/shared table affects every tenant. That is correct for this model (and consistent with `CORE-BOUNDARY.md`), but it means *"a DB change in one tenant"* is not a supported operation at all.

### 2.3 The one real leak (not schema — a missing filter)

**This is the honest exception, and it is worth fixing.**

`packages/core/src/modules/entities/api/records.ts:336-338` reads `custom_entities_storage` filtering on **`entity_type` + `entity_id` only — dropping both `organization_id` and `tenant_id`**:

```
.select(['entity_id','updated_at'])
.where('entity_type', '=', entityId)
.where('entity_id', 'in', recordIds)
```

- Record ids are **client-suppliable** (a caller's UUID is used as-is if it matches the UUID shape).
- So if two tenants use the **same entity type** and a caller chooses a record id equal to another tenant's record id, that other tenant's `updated_at` is merged into the response — a **cross-tenant metadata disclosure + optimistic-lock confusion**.
- **Severity: MEDIUM.** Only a timestamp leaks; it needs a shared entity type and a colliding id. But it is a **real, reachable, unscoped query** — the exact class of bug the rest of the codebase guards against. *(The single-record sibling at `records.ts:126-144` also omits `tenant_id`, but it passes an `organization_id`, and org ids are globally unique to one tenant, so that one is **LOW / defence-in-depth**.)*
- **A related, unproven risk:** the upsert conflict target (`shared/src/lib/data/engine.ts:350`) omits `tenant_id`, while the **entity declares a unique index that the migration creates as non-unique** — a genuine entity/migration divergence. Whether it leaks depends on which index actually exists in the deployed DB, which **cannot be settled from source**; it needs one live `\d custom_entities_storage` check.

**Recommended action (small, not urgent):** add `tenant_id` to the batch read-back at `records.ts:336-338`, and settle the upsert index question against the live DB. Both are scheduled in `COMPLETION-CALLBACKS.md` as new items.

---

## §3 — Your proposed answer to CC-25 is correct

> *"Shouldn't all the relevant functionalities… be broken down to specific permissions that we give or block from roles we create? Then depending on the user's role, the user gets or doesn't get this or that."*

**Yes. That is the platform's actual permission model, and it is the right answer.**

- Permissions are **strings on a role** (`role_acls.features_json` — a flat array, per tenant, with wildcards like `example.*`). A user's or an AI user's effective permissions are the union of their roles' strings plus their own overrides.
- So **"who may make a structure-permission decision" is not a special new mechanism** — it is one more permission string, e.g. the authority to *state* a permissions decision for a new surface, and to name the role it grants to.
- **The refinement the research adds:** because AI actors and human actors are *both principals with a kind*, the same permission string applies to both — with one difference the platform already handles: a **machine principal is bounded by the autonomy matrix** (an untrusted `ai_worker` is capped at "acts only with prior approval"), while a human is not. So an AI user granted this permission would still pass through the authority resolver.

**Concretely for CC-25:** the fix is to check that the actor sending the decision header **holds the decision permission** (and may grant to the role they named), rather than trusting whatever the header says. That is a **role/permission question**, exactly as you said — **not** a question that needs you to invent new policy from scratch.

**So: CC-25 is answered in principle. It is no longer "an owner decision with nothing to go on" — it is a build, using the permissions model you already have.** I will not build it until you confirm this is the model you want, because you asked me not to close your questions for you.

---

## §4 — Status register (every point, with its state)

| # | Point | Status | Where the detail lives |
|---|---|---|---|
| 1 | Unified AI/human **actor** (principal with a kind) | **FIXED / already exists** — `api_keys.principal_kind='ai_worker'`; 4 principal kinds | §1.1; `analysis/ai-users-vs-normal-users-2026-10-08/FINDINGS.md` |
| 2 | "AI user" **tick on a create form** | **WILL DO X** — it is the missing UI for an existing server capability; not built yet | §1.2 A |
| 3 | AI **roles** handed to AI users | **NOT AN ISSUE** — roles are principal-agnostic; works if the AI user is an api-key principal | §1.2 B |
| 4 | Folding **agent behaviour** into the user row | **NOT AN ISSUE as proposed, but would be if done literally** — would break `runAiAgent*` (registry is code-only) and the uuid FKs | §1.2 C |
| 5 | **Agent ↔ AI-user binding** | **OPEN — to be scheduled** on your go-ahead (a new work item) | §1.3 |
| 6 | Tenant **schema** isolation | **NOT AN ISSUE** — a tenant cannot create DDL; per-tenant structure is a row | §2.2 |
| 7 | Cross-tenant `updated_at` leak in batch read-back | **OPEN — scheduled** (MEDIUM; add `tenant_id` at `records.ts:336-338`) | §2.3 |
| 8 | Upsert conflict target vs index divergence | **OPEN — needs one live DB check** (unprovable from source) | §2.3 |
| 9 | **CC-25** — authorising the decision actor | **ANSWERED IN PRINCIPLE** — it is a role permission; **awaiting your confirm** before build | §3 |

**Every open item above is to be written into `COMPLETION-CALLBACKS.md`** (the standing rule: a gap is scheduled, never merely noted).

---

## §5 — What I did NOT do, and what I need from you

**I did not** resolve CC-25 as a finished decision (it is yours), did not build the AI-user UI or the agent-binding row, and did not touch the tenant leak — all three are recorded, not silently absorbed.

**I need from you (at most):**

1. **Confirm the CC-25 model** — *"yes, a structure-permission decision is a role permission"* — so I can build it. (§3)
2. **A yes/no on scheduling the two new AI items** — the *AI-user tick UI* and the *agent↔AI-user binding row* — as new backlog entries. (§1.4)

Everything else is recorded and does not need you.
