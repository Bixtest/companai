# PLAN — identity: the machine is not the teammate, and a bot is a participant

**Status:** written requirement, 2026-10-17. **Slice 1 (`SR-02`) is BUILT — §6.1, `CC-99` closed.**
Slice 2 (`SR-02`'s retire guard) and slice 3 (`SR-07`) are OPEN.

**Why a plan and not a commit.** `SR-02` and `SR-07` are one line each in
[`08-THE-SRS.md`](../architecture/mapping/findings/08-THE-SRS.md) §2. One line is enough to *rank* a
requirement and not enough to *build* one. This document is the measurement and the design the build
stands on. It changes nothing in the SRS; where it disagrees with a sentence in the code, the code wins
(rule 1) and the disagreement is recorded by name.

---

## 0. Why this is next

The SRS sequences identity **before** the per-tenant engine home, and the engine home **before** the
switchover:

```
SR-02 + SR-07 (identity: agent ≠ runtime, bot = participant)   ← land together
        │
        └── SR-12 (per-tenant engine home = CC-84)   ← gates P2-9b
```

That order is not cosmetic. `SR-12` is the fix for the **open** `CC-84` — a Hermes turn runs platform
tools as one superadmin identity, outside the chat's tenant — and flipping the default engine to Hermes
before it lands would make that hole the **default** path. And `SR-12` cannot be built on a runtime that
has no identity: *"one tenant ↔ one engine home"* is a claim about a **row**, and today there is no row.

So this plan builds the row, and the constraint that makes it one.

---

## 1. What exists today — measured in code (rule 1)

Measured 2026-10-17 by reading the files, not the documents.

| # | What the code does today | Where (file : line) |
|---|---|---|
| 1 | The engine is chosen by **one deployment-wide environment variable** (`AI_RUNTIME_ENGINE`), defaulting to `opencode` | `lib/resolve-ai-runtime-port.ts:87` (`DEFAULT_ENGINE`), `:148` (`resolveAiRuntimePort`) |
| 2 | The **only** production caller of that selector is the chat route | `api/chat/route.ts:328` |
| 3 | The agent's `runtime` is a **free-text field on the kernel object** — *"a binding name"* | `ce.ts:128–136` (`kind: 'text'`) |
| 4 | **Nothing reads that field.** `AiAgentDefinition` (`:290`) declares `id`, `moduleId`, `systemPrompt`, `allowedTools`, `mutationPolicy`, `loop`, `executionEngine` … and **no `runtime`** | `lib/ai-agent-definition.ts:290`; `grep '\.runtime\b'` over the module returns no reader |
| 5 | There is **no `agent_runtime` object** — no table, no entity, no type | `grep -rn 'agentRuntime\|agent_runtime' src` finds only the *override* below |
| 6 | `ai_agent_runtime_overrides` **is a different object**: per-tenant provider/model/baseURL *configuration*, not a running instance | `data/entities.ts:229` (`@Entity`), `:254` (class) |
| 7 | Conversation participants are **users only**: `user_id uuid NOT NULL`, no agent column | `data/entities.ts:826–864`, `:847–848`; table created `migrations/Migration20260518092853_ai_assistant.ts:21` |
| 8 | The agent appears in a conversation as **a column on the conversation**, not as a participant | `data/entities.ts:761–762` (`agent_id text`) |
| 9 | The machine principal already exists and is *not* a user: an API key marked `principal_kind = 'ai_worker'` | `packages/core/src/modules/api_keys/data/entities.ts:52–53`; `Migration20260812180000.ts` |
| 10 | A credential ↔ agent binding table already exists (`CC-27`), keyed `(tenant, org, principal, agent)` | `migrations/Migration20261010180000_ai_agent_bindings.ts:16–41` |

### The three findings this measurement produces

**(a) The `runtime` field is a dead control.** It is declared on the kernel object, described as a
binding, and **no code reads it**. That is the `L179` defect class exactly — *a control that asks the
right question and discards the answer.* A `SR-02` that only adds a table would produce a **second** dead
control beside it.

**(b) `agent_runtime` does not collide with `ai_agent_runtime_overrides`, and the names must stay
distinct.** One is a **machine** (a process that can run turns); the other is a **setting** (which model a
tenant prefers). Merging them would repeat the exact conflation `SR-02` exists to undo.

**(c) The kernel `agent` object and the code-declared agent definition are already two objects.** The
kernel object (`ai_assistant:agent`) carries `kind`/`owner`/`actsAs`/`role`/`runtime`/`autonomy`; the
runtime definition (`AiAgentDefinition`) carries none of them. `ce.ts:15–21` says this is deliberate — one
is *the stored teammate*, the other is *the behaviour*. `SR-02` does **not** merge them. It gives the
stored teammate's `runtime` binding something to point at.

---

## 2. The requirement

> **`SR-02`** — `agent` ≠ `agent_runtime`; uniqueness key as a DB constraint. *(Multica, BORROW)*
>
> **`SR-07`** — A bot is a participant, not a parallel object. *(zulip, BORROW)*

The donor mechanisms, quoted from the forensics rather than paraphrased:

**Multica** (`multica-forensics/findings/01-platform-overview.md:130–155`):

```sql
CREATE TABLE agent_runtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    daemon_id    TEXT,
    name         TEXT NOT NULL,
    runtime_mode TEXT NOT NULL CHECK (runtime_mode IN ('local','cloud')),
    provider     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline')),
    device_info  TEXT NOT NULL DEFAULT '',
    metadata     JSONB NOT NULL DEFAULT '{}',
    last_seen_at TIMESTAMPTZ,
    UNIQUE (workspace_id, daemon_id, provider)
);
ALTER TABLE agent ADD COLUMN runtime_id UUID;
```

> *"`agent_runtime` is **the machine** — a daemon, on a host, for one provider. `agent` is **the
> teammate** … One runtime hosts many agents; `agent.runtime_id` is `NOT NULL` and `ON DELETE RESTRICT`,
> so an agent cannot outlive the machine it is bound to."* (`02-the-aissistant.md:81–84`)

**zulip** (`02-the-aissistant.md:109–112`):

> *"**A bot IS a `UserProfile`.** No parallel 'agent' object exists. … That single decision removes an
> entire class of privilege-escalation bugs."*

---

## 3. The design — what we borrow, and where we deliberately diverge

### 3.1 The mapping, named

| Multica | Ours | Why |
|---|---|---|
| `workspace_id` | `(tenant_id, organization_id)` | our tenancy unit is the tenant, scoped by organization — the same pair every AI table already carries |
| `daemon_id` | `daemon_id` | the identity of the process/host that can execute. **`NOT NULL` here** — see divergence D1 |
| `provider` | `provider` | the engine vocabulary: `opencode` \| `hermes` (`AiRuntimeEngine`) |
| `name` | `name` | **the binding key.** This is what the agent's `runtime` text field names |
| `status` `online\|offline` | kept | the question *"which engine instance is **running**"* needs a liveness answer, or the row only says what *could* run |
| `last_seen_at` | kept | liveness needs a timestamp; a status alone cannot say how stale it is |
| `metadata` | kept | the forward-compat slot, so a new fact does not need a migration |
| `runtime_mode` `local\|cloud` | **omitted** — D2 | |
| `device_info` | **omitted** — D2 | |
| `agent.runtime_id` FK, `NOT NULL`, `ON DELETE RESTRICT` | **resolved by `name`**, not by FK — D3 | |

### 3.2 The divergences, each with its reason

**D1 — `daemon_id` is `NOT NULL`; Multica's is nullable, and that silently disables its own constraint.**
Multica writes `UNIQUE (workspace_id, daemon_id, provider)` over a **nullable** `daemon_id`. In Postgres,
`NULL`s are distinct, so every row with a null `daemon_id` is *outside* that uniqueness — the constraint
holds for daemons and evaporates for exactly the rows it cannot describe. A uniqueness key with a hole is
worse than no key, because the schema claims an invariant it does not enforce. Ours is `NOT NULL`, and a
future cloud runtime without a daemon must be a **named** migration, not a silent escape.

**D2 — `runtime_mode` and `device_info` are omitted.** `runtime_mode` has one inhabitant (`local`): our
runtime is a supervised private process behind the port (`AGENT-HALF.md` §1.5). A column whose second
value does not exist is a claim about a design that has not been made. `device_info` is a free-text host
description with no reader; `metadata` carries it if a real need appears.

**D3 — the agent binds by `name`, not by an FK.** Multica's `agent` is a **real table**, so
`agent.runtime_id → agent_runtime(id) ON DELETE RESTRICT` is available. Ours is a **kernel custom
entity** — its records live in the generic `custom_entities_storage` store
(`packages/core/src/modules/entities/data/entities.ts:191`), which cannot carry a foreign key. So the
binding is the `runtime` text field, and the guarantee moves to two places:

1. **`name` is unique per (tenant, organization)** — otherwise resolving a binding name is ambiguous,
   and an ambiguous resolver is a coin flip in production. Multica's `name` is **not** unique; that is a
   second defect we do not copy.
2. **The resolver refuses an unknown binding** rather than falling through to a default. A silent
   fallback is how an agent ends up on a machine nobody registered.

The `ON DELETE RESTRICT` half is preserved in behaviour: `register`/`retire` must refuse to retire a
runtime that a live agent binding names. That is slice 2 of `SR-02` (§4.2), not this one — stated here so
the bound is named rather than forgotten.

### 3.3 `SR-07` — the shape, stated before it is built

The participant table is the **one** place "who is in this conversation" lives. Today it admits users
only, and the agent sits in a **parallel** column on the conversation (`agent_id`). zulip's lesson is
that the agent must be a participant **in that table**, using the same membership machinery — not that it
must be a `users` row. Our own `principal_kind` decision already settled *that* question the other way
(`Migration20260812180000.ts:13–19`: *"Why an API key rather than a new table … A parallel identity system
would have duplicated every one of those controls"*), so `SR-07` is **not** a rewrite of that decision:

- the **principal** stays `ai_worker` (a credential), unchanged;
- the **participant** becomes polymorphic — a row is a user **or** an agent, exactly one, enforced by a
  check constraint, with the uniqueness index widened to include the agent id.

That is the minimum that removes the parallel object without inventing a second identity system.

---

## 4. The slices

### 4.1 Slice 1 — `SR-02`, the object and its constraint *(this slice)*

| Piece | File |
|---|---|
| the table, its two partial unique indexes, and the reasoning | `migrations/Migration20261017120000_ai_agent_runtimes.ts` (new) |
| the entity, with the same index expressions (no entity/schema drift) | `data/entities.ts` |
| `register` / `findByName` / `listActive`, with a typed conflict error naming **which** key collided | `data/repositories/AiAgentRuntimeRepository.ts` (new) |
| `resolveTenantRuntime` — the reader the `runtime` field never had | `lib/agent-runtime-registry.ts` (new) |
| the selector honours a tenant runtime over the env default, byte-identically when the tenant has none | `lib/resolve-ai-runtime-port.ts` |
| the one production caller resolves the tenant runtime before selecting | `api/chat/route.ts` |

### 4.2 Slice 2 — `SR-02`'s remaining half: the retire guard *(OPEN)*

A runtime that a live agent binding names must not be retirable. Needs the binding read path (the kernel
custom-entity record store) and a test that fires it. **Named here because the `ON DELETE RESTRICT`
promise in §3.2 is otherwise unbuilt.**

### 4.3 Slice 3 — `SR-07`, the agent as a participant *(OPEN)*

| Piece | Change |
|---|---|
| schema | `ai_chat_conversation_participants` gains `agent_id text NULL`; a check constraint `num_nonnulls(user_id, agent_id) = 1`; the two uniqueness indexes widen to the agent id |
| entity | `AiChatConversationParticipant.agentId` |
| repository | `addAgentParticipant`; `listParticipants` returns both kinds |
| route | `POST …/participants` accepts `agentId` as the alternative to `userId` |

---

## 5. What is deliberately NOT in this plan

- **`SR-12` — the engine *home* and the per-run credential.** `agent_runtime` gives the row a name and a
  uniqueness rule; it does **not** give it a `HERMES_HOME` path or a per-run credential. Those are
  `SR-12`'s, and `CC-84` stays open until they land.
- **`SR-11` (scope enters once)** and **`SR-10` (ambient tenancy)** — downstream of `SR-12`.
- **`SR-13` (identity keys unique per realm, DB-enforced)** — the realm vocabulary is `SR-07`'s output;
  constraining it before it exists would be a constraint on a guess.
- **`AH-5` (the room).** `SR-07` makes the *conversation* participant table polymorphic. The room is a
  different object with its own log, and `AH-6` (mentions) waits on it. Not merged.
- **Merging the kernel `agent` object with `AiAgentDefinition`.** `ce.ts:15–21` argues the split is
  deliberate; this plan agrees and does not touch it.

---

## 6. The proof standard

Every slice must land with: the code, a `node:test`/jest suite, a **mutation proof** (break the check on
purpose, watch the *named* test go red, restore byte-identical), `tsc` clean, and the register updated by
`CC-nn`. A slice that cannot be made to fail is not proven.

### 6.1 Slice 1 — discharge record

**Built 2026-10-17. `CC-99` closed.**

**The object.** `ai_agent_runtimes` — `(id, tenant_id, organization_id, daemon_id NOT NULL, name,
provider, metadata, timestamps)`. `daemon_id` is `NOT NULL` because a nullable one drops every such row
out of its own uniqueness key (D1). `provider` carries **no CHECK**: the vocabulary is `AiRuntimeEngine`
and grows, so it is validated at the repository boundary against `lib/ai-runtime-engines.ts` — the same
reasoning `Migration20260812180000.ts:24–27` records for `principal_kind`.

**The constraint, as four partial unique indexes** — the house pattern for a nullable `organization_id`
(`Migration20260512090000.ts:7–8`): daemon+provider and name, each split on `organization_id IS NULL`,
each `where deleted_at is null`. `name` is unique because the kernel agent stores its binding as **text**
(custom-entity records live in `custom_entities_storage`, which cannot carry a foreign key), so the
binding resolves by name and two rows with one name would make that resolution a coin flip.

**★ Two omissions, held to the same standard as the object itself.** `status` / `last_seen_at` and
`runtime_mode` / `device_info` are the donor's columns and none is here. `runtime_mode` has one
inhabitant. **`status` and `last_seen_at` would have had no writer** — liveness is a heartbeat and no
probe in this codebase beats one — so a column claiming "online" that nothing sets is the *same* defect
this object exists to remove (a declaration nothing reads), pointed the other way. They land with the
probe.

**The reader.** `resolveTenantRuntime` (`lib/agent-runtime-registry.ts`) is the **first** reader of the
kernel agent's `runtime` field. Three answers, two refusals: no tenant / no row → `null` (the caller
keeps its pre-`SR-02` path); exactly one row → that row; a named binding that matches → that row. A
binding that matches **nothing** throws; several rows with **no** binding throws. Neither falls back and
neither picks "the first" — a silent answer is how an agent ends up served by a machine nobody
registered.

**The wiring.** `resolveAiRuntimePort` gained one rung. Precedence is now
`engine` (caller override) → `tenantRuntime.provider` (the tenant's row) → `AI_RUNTIME_ENGINE` →
`opencode`. A row outranks the environment because a row is a fact about **this tenant** while the
variable is a fact about **the deployment**. A provider read from a row is normalised exactly like the
variable: an unknown value **throws**. The one production caller is the chat route
(`api/chat/route.ts`), which resolves the tenant runtime once per request.

**★ The regression this wiring caused, and the honest fix.** Adding the read broke three chat-route
suites (21 tests) — their container mock was the sentinel `{ identityCacheKey: 'em' }`, written when the
route queried nothing. The fix was **not** to weaken the route: the sentinel gained `find: async () => []`,
which is the "no runtime registered" answer, so those suites now *also* pin the byte-identical path. The
three suites pass unmodified in every assertion they make.

**Proof.**
- `agent-runtime-schema.test.ts` — **9/9**: the table's shape, all four partial unique indexes (columns
  *and* predicates), entity/migration expression parity, `down()`, and the two omissions pinned so they
  cannot be re-added silently.
- `AiAgentRuntimeRepository.test.ts` — **19/19**: the `23505` translation for all four shapes Postgres and
  MikroORM emit (raw, `cause`-wrapped, detail-only, message-only), the typed key, **no pre-check SELECT**,
  and provider validation *before* the write begins.
- `agent-runtime-registry.test.ts` — **11/11**: the three answers and the two refusals, whitespace
  binding, trimming, tenant-less short-circuit.
- `resolve-ai-runtime-port.test.ts` — **25/25** (19 pre-existing + **6** new): both directions of the row-
  over-env precedence, the explicit `engine` override, the byte-identical `null` case, and the unknown-
  provider refusal.
- **Mutation proof: 12/12 PROVEN**, every file restored byte-identical (`scripts/verify-sr02-mutations.mjs`).
  Each mutation names the test that must go red: the unique index losing `UNIQUE`; the entity expression
  drifting from the migration; `daemon_id` going nullable; a liveness column reappearing; a CHECK on
  `provider`; a pre-check SELECT returning; the raw `23505` escaping; the provider check skipped; a missing
  binding falling back to `null`; an ambiguous tenant getting its first row; the selector ignoring the row;
  an unknown provider silently becoming the default.
- **★ A harness bug found by the harness itself:** the first run reported `0/12 PROVEN`. The mutations had
  worked; the *detector* looked for `✕` (U+2715) while this jest build prints `×` (U+00D7) — twelve caught
  mutations read as twelve failures. A mutation harness that cannot see a red test is the most dangerous
  kind of green. Fixed, then 12/12.
- **Package suite, under the pinned toolchain (`workspace/.toolchain/node24`, v24.19.0): 133 suites /
  1,943 tests — all pass, nothing failing to load.** **★ Rule-13 correction (mine, and the sharpest of this
  slice):** the first run used the shell's node 22.22.2 and reported *1,834 / 1,834 pass · 131 suites · 2
  suites failing to load* — which reads as green while **109 tests never ran** (`sandbox` 65 +
  `codemode-tools` 44; `isolated-vm` ships no abi-127 win32 prebuild). **A suite that fails to load reports
  no failures**, which makes it the same defect class as the mutation-harness bug above: both produce green
  by not looking. `BACKLOG.md:18` had already recorded the trap — *"the same run under the shell's node
  22.22.2 falsely showed 2 unloadable suites"* — so this was measuring with the wrong runtime, not broken
  code. The pinned runtime is the only honest number.
- **`tsc --noEmit` in `packages/ai-assistant`: 0 errors. ★ Rule-13 correction:** the recorded `CC-73`
  figure of *"92 pre-existing errors"* no longer reproduces — and the first run of this slice reported
  **2,090**, all of them stale diagnostics replayed from `.tsbuildinfo`. Deleting that cache (gitignored)
  and re-running gives a clean build. **The cache was reporting errors for files it had not re-checked**;
  anyone reading 2,090 as "the code got worse" would have been reading a cache.

**A pre-existing drift found and recorded, not silently absorbed — `CC-100` (open).** The MikroORM
snapshot `migrations/.snapshot-open-mercato.json` lists **10** tables and contains **neither**
`ai_agent_bindings` (`Migration20261010180000`, `CC-27`'s slice) **nor** `ai_agent_runtimes` (this one).
The snapshot is **consumed** — `packages/cli/src/lib/db/commands.ts:100` decides whether to create an
initial module migration from its presence, and MikroORM diffs entities against it — so the next
`db migration:create` for this module would emit a `create table ai_agent_bindings` that already exists.
The fix is a regeneration against a live database, not a hand-edit: a snapshot that is *wrong* is worse
than one that is *stale*. **This slice is part of the finding, not a victim of it.**
