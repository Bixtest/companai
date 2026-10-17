# PLAN — identity: the machine is not the teammate, and a bot is a participant

**Status:** written requirement, 2026-10-17. **Slice 1 (`SR-02`) is BUILT — §6.1, `CC-99` closed.**
Slice 2 (`SR-02`'s retire guard) is **re-planned but not built** — §4.2 was rewritten the same day after
reading the donor's code, because the first version had the donor's design backwards. Slice 3 (`SR-07`)
is OPEN.
**Method note:** §4.2 is the first slice written under the donor re-read rule
([`00-PIN-AND-METHOD.md`](../architecture/mapping/00-PIN-AND-METHOD.md) §4.1) — plan first, then open the
donor's source, then harvest or refuse by name. It changed the design.

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

The retire half is preserved in behaviour, but **not as `RESTRICT`** — that reading was corrected on
2026-10-17 after reading the donor's code (see §4.2, which is where the correction lives). Multica declares
`ON DELETE RESTRICT` in `004_agent_runtime_loop.up.sql:73` and then spends migration
`251_agent_runtime_unbind` routing *around* it: `agent.runtime_id` becomes nullable, the unbind is an
application-layer UPDATE inside the delete transaction, and the FK survives only as a last-resort backstop.
So the promise to keep is not *"you may not retire this machine"* but *"retiring the machine must neither
destroy the agent nor strand it silently"* — which is slice 2 of `SR-02` (§4.2). Stated here so the bound is
named rather than forgotten.

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

### 4.2 Slice 2 — `SR-02`'s remaining half: the retire guard *(OPEN — RE-PLANNED after the donor re-read, and RE-SCOPED the same night by `CC-102`)*

**★ This section was rewritten on 2026-10-17 after reading Multica's actual code, per the donor re-read
rule (`00-PIN-AND-METHOD.md` §4.1). The first version of it was wrong.**

#### What the first version said, and why it was wrong

It said: *"a runtime that a live agent binding names must not be retirable … the `ON DELETE RESTRICT`
promise in §3.2 is otherwise unbuilt."* That treats the donor's FK as the design. Reading the donor's
migrations shows the FK is **not** its design — it is a backstop the donor deliberately routes around.

`server/migrations/004_agent_runtime_loop.up.sql:73` does declare `agent.runtime_id … ON DELETE RESTRICT`,
and `:86` declares `agent_task_queue.runtime_id … ON DELETE CASCADE`. But
`server/migrations/251_agent_runtime_unbind.up.sql` **drops `NOT NULL` on both columns** and says why, in
its own words:

> *"Before this migration an agent physically could not exist without a runtime … the runtime-delete flow
> had no third option: it archived the runtime's agents and then hard-deleted the rows, taking their chat
> sessions with them. The confirmation dialog called that 'archive', which is not what the user got …
> **Retiring a laptop is an ordinary action; losing the agents configured on it is not an ordinary
> consequence.**"*

So the donor's settled position is: **retiring a machine must not be blocked by the agents on it, and must
not destroy them either.** The agent survives, *unbound* — it keeps its instructions, skills, chats and
labels, and simply cannot run until rebound. `251` also states the repository rule that produced this:
*"No new foreign keys or cascading actions are introduced … the unbind itself is an explicit
application-layer UPDATE inside the same transaction as the runtime delete."*

A guard that only refuses would have reproduced the exact trap the donor spent a migration escaping.

#### What the donor actually does — five mechanisms worth having

| # | Mechanism | Where | Why it is better than "refuse" |
|---|---|---|---|
| **M1** | **Two doors, not one flag.** `DeleteAgentRuntime` refuses with **409 + the dependency list**; `UnbindAgentsAndDeleteRuntime` is a *separate endpoint* that performs the consequential action. | `server/internal/handler/runtime.go:991`, `:1200` | The dangerous path is a different call with a different name, so it cannot be reached by adding `?force=true` to a routine delete. |
| **M2** | **The refusal carries the data needed to act on it.** *"Surface them on the 409 so the dialog can render the cascade plan directly from this response — saves a second round-trip."* | `runtime.go:1035` | A refusal that says only "in use" forces a second query; one that names the dependants makes the next step obvious. |
| **M3** | **The confirmation is over a SET, re-verified server-side.** The client echoes `expected_active_agent_ids`; the server compares it to what it is about to unbind and refuses on mismatch (`runtime_delete_plan_changed`). | `runtime.go:1212`, `:1277` | Closes the *dialog-open → user-confirm* race: a teammate cannot add an agent while the dialog is open and have it silently unbound. |
| **M4** | **Check → lock → re-check (TOCTOU).** `LockAgentRuntime` takes `FOR UPDATE`, which conflicts with the `FOR KEY SHARE` that every FK insert takes — so no new binding can appear between the check and the act. | `runtime.go:1060`, `:1258` | Without it the guard is a check-then-act race and is decorative under concurrency. |
| **M5** | **The invariant moves to run time.** `agent_task_queue` gets `CHECK (runtime_id IS NOT NULL OR completed_at IS NOT NULL) NOT VALID`, and every dispatch site gates on `RuntimeID.Valid`. | `251_…up.sql`, `internal/dispatch/reason.go:60` | The safety is "an unbound agent cannot run", enforced at every entry point — not "a machine cannot be retired", enforced at one. |

**Two more the donor gets right, and that we should copy verbatim into `down()`:**

- **`251`'s down migration refuses to delete data to make itself succeed:** *"deleting them is precisely
  the data loss the up migration removes, and an operator rolling a schema back is not asking to destroy
  every agent whose machine was retired."* It fails loudly instead, and prints the queries to run.
- **The constraint is expressed with `completed_at`, not a status list** — *"naming enumerable status
  values in a constraint would force a migration for each new status. A future non-terminal status
  therefore fails closed … instead of silently slipping through."*

#### What we build — adapted, not copied

Our situation differs in two ways that matter, and both change the shape:

1. **Our retire is a soft delete** (`deleted_at`), so the row and its history are never lost — the donor's
   data-loss dilemma does not arise. The risk is different and sharper: a soft-deleted runtime stops
   appearing in `listActive`, so an agent naming it starts throwing
   `AiAgentRuntimeBindingNotFoundError` **on every turn** — a loud failure, but a *late* one, discovered by
   the end user rather than by the operator who retired the machine.
2. **Our agent is a custom-entity record and cannot carry an FK**, so there is no `RESTRICT` to lean on.
   The guard is the only place the promise can live — which is exactly why it must not be a bare `if`.

The slice therefore builds:

| Piece | Change |
|---|---|
| **repository** | `listDependants(runtimeId, ctx)` — the live agents whose binding names this runtime (**M2**). Returns `{ agentId, name }[]`, empty when none. |
| **retire** | `retire(id, ctx)` **refuses** with a typed `AiAgentRuntimeInUseError` carrying the dependant list, when `listDependants` is non-empty. |
| **retire (consequential)** | `retire(id, ctx, { unbindAgents: true, expectedAgentIds })` — requires the caller to echo the set it was shown (**M3**); re-reads under the transaction and throws `AiAgentRuntimePlanChangedError` on mismatch. Two doors, one signature (**M1**). |
| **concurrency** | The dependant re-read and the soft-delete happen inside one transaction with the runtime row locked `FOR UPDATE` (**M4**). |
| **the invariant** | A retired runtime is invisible to `listActive` *and* `resolveTenantRuntime` throws a message that **names the dependants** when a binding resolves to nothing but a retired row exists with that name — so the failure at run time explains itself instead of reading as "no runtime". |

**Deliberately not built here:** the donor's `pause_reason` on automations (we have no per-agent schedule
that would spin), and the `agent_task_queue`-style CHECK (we have no task queue on this path). Both belong
to `SR-19`'s territory, not this slice's.

**The proof standard for this slice** is slice 1's, plus one specific to it: a test that drives **two
concurrent retires** and proves the second sees the first's effect — because a guard without **M4** passes
every sequential test.

#### ★ What the cross-check then found — five gaps in slice 1 itself (2026-10-17, `CC-102`)

The re-plan above was about the *shape* of the retire guard. The ten-analyst donor cross-check then read
slice 1 against the donors a second time and found five **verified gaps in what we already shipped** —
so the re-scoped slice is larger than the guard alone. Each was checked in the code before it was written
down (`AUDIT-2026-10-17-donor-crosscheck.md` §3):

| # | Gap | Measurement | What the donor does |
|---|---|---|---|
| **G1** | **There is no `retire()` at all.** | `AiAgentRuntimeRepository` has no such method, and **`deleted_at` has no writer** — so every `WHERE deleted_at IS NULL` predicate in the slice is inert. Meanwhile the repository's own error text tells operators to *"retire it before registering a replacement"* (`:253`) and *"retire the existing runtime first"* (`:260`), with no API to do either. | `DeleteAgentRuntime` is a real endpoint with a real body. |
| **G2** | **`register()` refuses a daemon reboot.** | The `(tenant, org, daemon, provider)` conflict throws `AiAgentRuntimeConflictError` (`:239`) — so restarting the same daemon is an error the operator must resolve by hand. | `UpsertAgentRuntime` (`runtime.sql:63-93`) is `INSERT … ON CONFLICT (workspace_id, daemon_id, provider) DO UPDATE … SET last_seen_at = now() RETURNING *, (xmax = 0) AS inserted` — restart updates the row, and the `xmax` flag keeps first-registration distinguishable for analytics. |
| **G3** | **`daemon_id` is caller-supplied text.** | A hostname change creates a **second live row with no binding**, and every later lookup is a permanent `AiAgentRuntimeAmbiguousError`. | `048_runtime_daemon_uuid.up.sql:1` — *"Runtime identity is moving from `os.Hostname()` to a persistent daemon UUID"*. |
| **G4** | **No liveness writer.** | Slice 1 withheld `last_seen_at` on the ground that a column nothing writes is a dead control — correct, and it leaves the column unbuilt rather than the writer missing. | `TouchAgentRuntimeLastSeen` (`runtime.sql:178-193`) does `UPDATE … SET last_seen_at = now() WHERE id = $1 AND status = 'online'`. The **`status` predicate is load-bearing**: a sweeper may flip the row between the caller's `SELECT` and this `UPDATE`, and the returned affected-row count lets the caller detect that race and restore the row. It deliberately never touches `status` or `updated_at`, which keeps the row HOT-eligible. **No sweeper, no Redis, no lease required.** |
| **G5** | **A null-org caller cannot see a tenant-level runtime, and the silence is a fallback.** | `agent-runtime-registry.ts` returns `NO_TENANT_RUNTIME` (null, `:41`) for an empty active set (`:138`), and `resolve-ai-runtime-port.ts:184-189` then takes `resolveAiRuntimeEngine(env)` — the deployment default. That is the exact failure the registry's own docblock forbids: *"a fallback … is how an agent ends up served by the wrong engine"* (`:27`), *"Deliberately not a fallback"* (`:46`). | Org scoping is part of the identity, not a filter applied when convenient. |

**What this changes in the slice:**

- **G1 is the guard's own door.** `retire()` is not an extra feature beside the guard — it **is** the guard's
  entry point, and without it §4.2's whole re-plan is unbuildable. It also discharges the one omission
  slice 1 made that was held to the wrong standard: `status` and `last_seen_at` were held back as
  unwritable, and `deleted_at` was **shipped** unwritten. *(Rule 13, by name: the reasoning was right and
  applied to the wrong column.)*
- **G2 changes `register()` from a refusal to an upsert**, with the same `xmax`-style distinction so a
  first registration and a restart are still told apart where it matters.
- **G3** makes `daemon_id` derive from a **persistent daemon identity**, not a caller string.
- **G4** builds `last_seen_at` together with its writer, as one piece — the column never exists alone.
- **G5** makes the null-org read **explicit**: no org in scope is a distinct answer with a distinct
  message, never a silent slide to the environment default.

**Refused from the donor, with the reason:** a `status` column + sweeper + Redis TTL (fleet machinery for
one supervised process — G4's single UPDATE is the whole mechanism we need); `runtime_mode` (a constant
column); a hard delete after unbind (destroys history our soft delete keeps); and the donor's
`pause_reason` (we have no per-agent schedule that would spin).

**The unbind/CHECK redesign carries over from the re-plan above, with one addition the donor's migration
makes explicit:** `251_agent_runtime_unbind.up.sql` confines `NULL` to *history* with
`CHECK (runtime_id IS NOT NULL OR completed_at IS NOT NULL) NOT VALID` — expressed with `completed_at` so
a future non-terminal status **fails closed**, and `NOT VALID` so a hot table stays metadata-only. Our
binding is text in generic storage, so there is no cascade to fire; the risk is a stale pointer, and the
guard is that **an active binding must always resolve**.

**The proof standard for this slice** is now slice 1's plus **three**: (a) two concurrent retires, the
second seeing the first's effect; (b) a **daemon restart re-registering without an error and without a
second row** — the mutation that removes the upsert branch must kill it; (c) the null-org path returning
the new explicit answer rather than the environment default — proved by making the environment default
obviously wrong in the test.

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
