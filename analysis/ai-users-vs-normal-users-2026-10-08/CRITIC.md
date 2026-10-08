# CRITIC.md — Hostile pass against FINDINGS.md

**Date:** 2026-10-08
**Mandate:** Try to prove each §3 verdict in `FINDINGS.md` **wrong**, re-measuring from the files. Name what was attacked. Where a verdict survived, say what was attempted.

---

## Attack index

| # | Target verdict | Method | Result |
|---|---|---|---|
| A1 | §3-C-2 "agent registry never reads the DB" | grep for any ORM read in registry/tools | **SURVIVED** |
| A2 | §3-C-2 "nothing merges DB rows into `agentsById`" | every `agentsById.set/clear` call site | **SURVIVED** |
| A3 | §1.3/§3 "generated file is the only source" | read `.d.ts`, read generated file | **SURVIVED** |
| A4 | §3-C "no route creates an agent" | grep for agent insert/persist | **SURVIVED** |
| A5 | §3-A "the 'machine tick' pattern already exists" | read api-keys create page | **PARTIALLY BROKEN** → refined |
| A6 | §3-C-4 "uuid FKs to users" | grep `ManyToOne(() => User)` | **SURVIVED (6 found)** |
| A7 | §1.3 "AI tables are not agent registry" | read override repository | **SURVIVED**, and sharpened |
| A8 | §1.5 impersonation guard | read `z.enum` in validators | **SURVIVED** |

---

## A1 — "The agent registry never reads the database"

**Verdict under test:** §3 Part C item 2 — *a DB-created "AI user" would not appear to `runAiAgent*`, because the runtime reads `agentsById` (an in-memory Map built from a generated file), never the database.*

**What I tried:** `rg -n 'em\.find|entityManager|EntityManager|\.findOne\(|selectFrom|createQueryBuilder|repository' packages/ai-assistant/src/modules/ai_assistant/lib/agent-registry.ts packages/ai-assistant/src/modules/ai_assistant/lib/agent-tools.ts`

**Result:** ONE hit, and it is a **comment**, not code — `agent-tools.ts:53` ("values produced by the override repository"). Zero executable DB reads in either file.

**Could not break it.** The registry has no `EntityManager`, no repository, no query builder. `loadAgentRegistry` (`agent-registry.ts:278-299`) imports a generated *code module* and populates a Map. If the owner's model created an agent as a DB row, `listAgents()`/`getAgent()` (`:301-307`) would never see it without a code change.

**Residual doubt stated honestly:** the *override* repositories (`data/repositories/AiAgentRuntimeOverrideRepository.ts`) DO read the DB (`em.findOne` at `:83,93,108`). So the system is not "AI is DB-free" — it is "**agent identity and agent behaviour are DB-free; agent overrides are DB-persisted, keyed by `agent_id` as a string**." My FINDINGS wording in §1.3 says exactly this, but the sharper phrasing matters for the owner: the DB already keys on agents *by id string*; it just never *defines* them.

---

## A2 — "Nothing merges DB rows into `agentsById`"

**Verdict under test:** same as A1.

**What I tried:** enumerate every write to the Map: `rg -n 'agentsById.set|agentsById\.clear|loadAgentRegistry' packages/ai-assistant/src/modules/ai_assistant/lib/*.ts` (excluding tests).

**Result:** `set` at `:197` (from `populateFromAgents`, fed by the generated module), `:220` (from `applyOverridesToRegistry`, fed by code override entries), `:274` (from `applyExtensionsToRegistry`). All three sources are **code** (the generated file carries `aiAgentOverrideEntries`/`aiAgentExtensionEntries`, `ai-agents.generated.ts:51-60`). No path takes a row from a repository and calls `set`.

**Could not break it.** The strongest possible counter-argument — "maybe a subscriber hydrates agents from DB on boot" — was tested by grepping all `.ts` in the lib dir for `agentsById.set`; there are none outside these three code-fed sites.

---

## A3 — "The generated file is the only agent source"

**Verdict under test:** §1.3 verdict "agents are 100% code-declared and in-memory."

**What I tried:** read `ai-agents-generated.d.ts` in full and the generated `.ts` in full.

**Result:** the `.d.ts` declares only code-shaped exports (`allAiAgents: unknown[]`, `aiAgentOverrideEntries`, `aiAgentExtensionEntries`). The `.ts` statically imports module `ai-agents.ts` files and flattens them (line 56). There is no runtime fetch, no DB, no remote registry.

**Could not break it.** *Caveat surfaced (not a break):* the generated file wires ONLY the `ai_assistant` module (`:10`), while `catalog/ai-agents.ts:540` and `customers/ai-agents.ts:527` declare agents too. So at least part of the declared-agent surface may not be registered in this build. This does **not** weaken the verdict (agents are still code), but it does mean the *count* of live agents is build-dependent — already flagged in FINDINGS §4.1.

---

## A4 — "No route creates an agent"

**Verdict under test:** §3 Part C "two separate procedures."

**What I tried:** `rg -n 'createOrmEntity\(\{[^}]*agent|persist.*[Aa]gentDefinition|INSERT INTO ai_agent' packages/ -g '*.ts' -g '!**/node_modules/**' -g '!**/__tests__/**'`; plus a full read of `api/ai/agents/route.ts`.

**Result:** zero hits. The agents route is GET-only and calls `listAgents()`. The sub-routes (`prompt-override`, `mutation-policy`, `models`, `loop-override`) write *override* rows, not agents.

**Could not break it.** There is no agent-creation surface to collapse.

---

## A5 — **PARTIAL BREAK** — "the machine-tick pattern already exists"

**Verdict under test:** §3 Part A — *"the platform already proved the exact pattern… `createApiKeySchema.principalKind` is a 'tick that reveals machine-ness'."*

**What I tried:** look for the tick in the API-key creation **UI** (`packages/core/src/modules/api_keys/backend/api-keys/create/page.tsx`), on the theory that the "tick" the owner wants might already be shipped and my finding would be stronger than I wrote.

**Result — I broke my own framing.** The create page's field list (`page.tsx:82-109`) is `name, description, organizationId, roles, expiresAt`. Its submit payload (`page.tsx:162-176`) sends exactly those. **There is NO `principalKind` control.** `rg 'principalKind|ai_worker|AI worker|principal_kind' packages/core/src/modules/api_keys/backend/` returns **nothing**.

So the truthful statement is narrower than FINDINGS §3-A implied:
- The **server** accepts `principalKind: z.enum(['service','ai_worker'])` (`validators.ts:33`) and persists it (`keys/route.ts:126`).
- The **shipped UI cannot set it.** The only way to mark an AI worker today is a direct API call, a CLI, or a seeded key.

**Why this matters (and it strengthens, not weakens, the core answer):** the owner's instinct — "one form with a tick" — is *precisely the gap the codebase left open*. The pattern exists in the data model and the server contract, but **the UI never exposed it**. So the owner's idea is not redundant with existing UI; it is the missing UI for a server capability that already exists. That is a meaningful correction to §3-A, and I record it here rather than silently averaging.

**What I could not break:** the A5 finding does not touch §3-C (the registry/uuid-FK verdicts). Those stand independently.

---

## A6 — "uuid FKs to `users`"

**Verdict under test:** §3 Part C item 4.

**What I tried:** `rg -n 'ManyToOne\(\(\) => User\)|references.*users' packages/core/src/modules/auth/data/entities.ts`.

**Result:** SIX `@ManyToOne(() => User)` relations: lines 84 (UserSidebarPreference), 171 (SidebarVariant), 209 (UserRole), 227 (Session), 251 (PasswordReset), 311 (UserAcl). Plus, outside this file, `ai_chat_conversation_participants.user_id` is `uuid not null` (`ai-assistant/.../entities.ts:847`) and `audit_logs.actor_user_id` is `uuid` (`audit_logs/.../entities.ts:26`).

**Could not break it.** An `ai_worker:<id>` string subject cannot occupy any of these uuid columns — and the platform already demonstrated the failure: `Migration20260813090000.ts:6-13` records the literal exception `DriverException: invalid input syntax for type uuid: "ai_worker:<id>"`, which is why `ai_token_usage_events` gained nullable text `actor_id`/`actor_kind` (`:39-41`). This is the single most robust pillar of §3-C.

---

## A7 — "AI tables are not an agent registry"

**Verdict under test:** §1.6 "there is no table that holds an AI identity."

**What I tried:** check whether any of the ten `ai_*` entities could secretly *be* an agent registry — in particular `AiAgentRuntimeOverrideRepository`, which looked the most table-like.

**Result:** the repository reads `AiAgentRuntimeOverride` rows filtered by `tenant_id`/`organization_id`/`agent_id` (`:83,93,108`). It reads *configuration about* an existing agent id; it never holds `label`, `systemPrompt`, `allowedTools`, or any definition field. Every `ai_*` table keys on `agent_id` as an opaque string or on `user_id`.

**Could not break it.** No table defines an agent. *Sharpening:* the DB *does* reference agents by id (overrides, usage), so a unified model would not be introducing the concept of "a DB row that mentions an agent" — only "a DB row that **is** an agent."

---

## A8 — "`human` is deliberately excluded from credential kinds"

**Verdict under test:** §3 Part A conflict — a user-form tick must not mint a `human`-parsed subject for an AI.

**What I tried:** see whether any enum or validator would permit a credential to claim `human`/`system`.

**Result:** `validators.ts:33` is the only enum: `z.enum(['service','ai_worker']).optional()`. `system` and `human` are absent by construction. `parseSubject` returns `human` ONLY for a bare uuid (`principal.ts:95`), i.e. a real `users.id`.

**Could not break it.** If the owner's "AI user" is a `users` row, its subject **is** a bare uuid and therefore **parses as `human`** — the exact asymmetry the split forbids. This is the concrete mechanism by which "one user table, AI tick" would mislabel AI actions as human in the journal/ledger, and it survives every re-measurement.

---

## Where the critic FAILED to break the core answer — and why that is the point

The three load-bearing claims of §3 Part C were attacked hardest:
1. **Registry is code, not DB** (A1/A2/A3) — survived; the counter-hypothesis (a DB hydration path) does not exist.
2. **Agents have no creation route** (A4) — survived; there is nothing to unify.
3. **Machine subjects cannot satisfy uuid FKs to users** (A6) — survived, and is corroborated by a shipped migration that documents the exact failure.

The one **correction** is A5: I overstated that the "machine tick" is an existing shipped UI pattern. It exists server-side only. This makes the owner's proposal *less redundant* than I first implied — it is the missing UI for a capability the backend already has. The core verdict is unchanged: the sound target is a **principal with a kind** (which exists), the partly-sound part is a **form with a machine tick** (which the server supports for *keys* but no UI exposes), and the unsound part remains **folding the code-declared agent into the credential object**.

## Net effect on FINDINGS.md
- **One refinement** to §3 Part A: "the pattern already exists" → "the pattern exists in the server schema but is unreachable from the shipped UI; the owner's idea is the missing UI, not a duplicate."
- **One open question closed** (§4.2): the API-key UI does **not** expose `principalKind`.
- No §3 Part C verdict broke.
