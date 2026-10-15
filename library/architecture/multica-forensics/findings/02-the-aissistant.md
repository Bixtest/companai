# Batch 02 — The Aissistant (P1)

**Study:** Multica `0.2.0` · **Batch:** 02 of 07 · **Status:** COMPLETE
**Source:** `github.com/multica-ai/multica` → `platforms/_extracted/multica-main`
**Zip md5:** `30ddc64af536212e25a6c00db5672b82` · **License:** Apache-2.0 + Multica conditions
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; code is the authority. Nothing in this file was inferred from a README.

---

## 0. What this batch had to answer

P1 is **the aissistant** — the AI user: what it *is*, what runs it, how it is configured, what it can
do, and who is allowed to make it run. Batch 01 established that an `agent` exists as a stored row and
is dispatched work through a queue. This batch opens the row up.

Short answer, measured:

| Question | Multica's answer | Where |
|---|---|---|
| What is an "agent"? | A stored **teammate** (`agent`) bound to a stored **machine** (`agent_runtime`). Two rows, not one. | F02-01 |
| What runs it? | One Go interface (`Backend.Execute`) behind **24 backend structs** for **25 provider keys** | F02-02 |
| What is the provider whitelist? | A closed `SupportedTypes` list kept in lockstep with a DB `CHECK` by hand + migrations | F02-03 |
| Can a workspace define its own runtime? | Yes — `runtime_profile`, based only on an officially-supported family | F02-04 |
| How is one agent different from another? | **12 per-agent columns** (`model`, `thinking_level`, `custom_env`, `custom_args`, `mcp_config`, `instructions`, …) | F02-06 |
| What are its skills? | **Two kinds**: workspace skills (structured, M2M) and runtime skills (the CLI's own) | F02-08 |
| Who may make it run? | `permission_mode` (`private` \| `public_to`) + an allow-list of **invocation targets**, **deny-by-default** | F02-09 |

Everything here is the *agent* layer. The workspace (batch 03), the scheduler/dispatch (batch 04) and
the UI (batch 05) are separate; this file stops at the agent boundary.

---

## 1. The agent record — the durable shape

Measured: **598 up-migrations** in `server/migrations/`; **229** mention `agent`; **25** touch the
`agent` table itself. The agent is the most-evolved table in the schema.

The current column set is the `Agent` struct in the sqlc output, `pkg/db/generated/models.go:25-57`
(**29 columns**). Grouped by what they do:

| Group | Columns | Added by |
|---|---|---|
| **Identity** | `id`, `workspace_id`, `name`, `avatar_url`, `owner_id`, `created_at`, `updated_at` | `001_init` |
| **Runtime binding** | `runtime_mode` (`local`\|`cloud`), `runtime_config` (jsonb), `runtime_id` | `001_init`; `runtime_id` by `004` |
| **Who may run it** | `visibility` (legacy), `permission_mode` (`private`\|`public_to`) | `001_init`; `permission_mode` by `130` |
| **Kind** | `kind` (`user`\|`system`), `system_key` | `163` |
| **Lifecycle** | `status` (`idle`\|`working`\|`blocked`\|`error`\|`offline`), `archived_at`, `archived_by` | `001_init`; archive by `031` |
| **Capacity** | `max_concurrent_tasks` | `001_init`; default 1→6 by `023` |
| **Behaviour** | `description`, `instructions` | `002`; `021` |
| **Launch config** | `custom_env` (jsonb), `custom_args` (jsonb) | `040`; `041` |
| **Model config** | `model`, `thinking_level`, `service_tier` | `050`; `095`; `212` |
| **MCP config** | `mcp_config` (jsonb) | `046` |
| **Skills** | `disabled_runtime_skills` (jsonb) | `206` |
| **Integrations** | `composio_toolkit_allowlist` (text[]) | `129` |
| **UI affordance** | `conversation_starters` (jsonb) | `404`, renamed by `432` |

**The one detail worth stating plainly.** `runtime_config` (jsonb, from `001_init`) is the *legacy*
free-form config. The later migrations did not extend it — they **promoted fields out of it into
typed columns** (`model`, `thinking_level`, `service_tier`, `custom_env`, `custom_args`, `mcp_config`).
Migration `050_agent_model.up.sql` says why in its own words: *"Previously the only way to pick a model
per agent was via custom_env / custom_args; a first-class column lets the UI render a dropdown and keeps
Codex-style app-server providers (which reject `-m` in custom_args) working without CLI flags."* A
jsonb blob was replaced by columns the moment a UI had to render a picker over them.

---

## 2. Provider + runtime — the machine / teammate split (the load-bearing finding)

### 2.1 Two rows, deliberately

`004_agent_runtime_loop.up.sql` splits the thing that *is* from the thing that *runs*:

```
agent_runtime (id, workspace_id, daemon_id, name, runtime_mode, provider,
               status[online|offline], device_info, metadata, last_seen_at,
               UNIQUE (workspace_id, daemon_id, provider))          -- 004:1-15
agent.runtime_id  ->  agent_runtime(id)  ON DELETE RESTRICT (NOT NULL) -- 004:70-73
```

`agent_runtime` is **the machine** — a daemon, on a host, for one provider. `agent` is **the teammate**
— a stored colleague that a runtime runs. One runtime hosts many agents; `agent.runtime_id` is
`NOT NULL` and `ON DELETE RESTRICT`, so an agent cannot outlive the machine it is bound to, and a
machine cannot be deleted while it still owns an agent.

### 2.2 One interface, 24 implementations

`pkg/agent/agent.go:18-23` is the whole seam:

```go
type Backend interface {
	Execute(ctx context.Context, prompt string, opts ExecOptions) (*Session, error)
}
```

Every provider is a struct implementing that one method — **24 backend structs** in `pkg/agent/`
(`claudeBackend`, `codexBackend`, `hermesBackend`, `opencodeBackend`, `cursorBackend`, …). `New()`
(`agent.go:437`) is a `switch` over the provider key that returns the right one.

**24 structs, 25 keys.** `SupportedTypes` (`agent.go:369-395`) lists **25** provider keys; the
difference is `qoder` and `qoderclicn`, which share one ACP backend — the comment at `agent.go:362-364`
states the reason: *"keeping both provider keys lets the daemon auto-detect and register the
international and China-region binaries independently."*

### 2.3 The whitelist is closed, and kept closed by hand

`SupportedTypes` is the canonical whitelist, and its own comment (`agent.go:352-368`) records that it
**MUST stay in lockstep** with the `runtime_profile.protocol_family` CHECK constraint — and then lists
**every migration that widened it** (`120`, `134`, `136`, `175`, `179`, `202`, `242`, `253`, `254`,
`313`, `342`, `370`, `403`, `441`). That is a real anti-drift discipline: the same set is enforced in
Go and in Postgres, and every time it grew, a migration recorded it.

### 2.4 A workspace may define its own runtime — within the whitelist

`120_runtime_profile.up.sql` adds `runtime_profile`: a workspace-level definition of a custom runtime
(an in-house wrapper of an official CLI). Its `protocol_family` may only be a value in
`SupportedTypes`. Two rules in its header are worth carrying forward:

- **No new foreign keys** — "Referential integrity policy (house rule): this migration does NOT add any
  new database foreign keys or ON DELETE cascades." Cleanup is application code's job.
- **The profile carries no per-agent args.** Its only args column is `fixed_args` (the args *every*
  agent on that runtime must inherit). Per-agent args stay on `agent.custom_args`.

### 2.5 Adding a fork is a descriptor, not a rewrite

`pkg/agent/builtin_runtimes.go:18-85` declares `BuiltinRuntime` — *"the single declaration site for a
runtime identity."* Its header states that `agents_probe.go`, `config.go`, display names, execenv skill
paths, `ListModels` and the frontend maps **all derive from this**, so *"adding a new compatible fork of
an existing runtime is a descriptor entry, not a cross-stack change."* Today the list has **one** entry
(`omp` → the `pi` family, `builtin_runtimes.go:86-`), which is exactly the shape being described: a fork
that cost one struct literal.

---

## 3. The configuration surface — what makes one agent different from another

Twelve per-agent columns (§1). Three of them are worth naming because of a shared design choice:

- `model` (`050`), `thinking_level` (`095`), `service_tier` (`212`).
- `095_agent_thinking_level.up.sql` stores *"the runtime-native string … rather than a cross-runtime
  abstraction, so the user-visible value matches what each CLI's own UI advertises (see MUL-2339). NULL
  means 'use the runtime/model default'."*
- `212_agent_service_tier.up.sql` does the same: *"the value is the runtime-native catalog ID reported
  by `codex debug models --bundled` … NULL means 'inherit'."*

**The choice, stated plainly:** Multica does **not** invent a neutral vocabulary and translate it per
provider. It stores the provider's own token and passes it through. The cost is that the value means
different things on different runtimes; the benefit is that what the user sees is what the CLI accepts.

### 3.1 The model catalog knows what it does not know

`pkg/agent/models.go` is 3,003 lines of model discovery, and its types encode honesty:

- `Catalog` (`models.go:108`) separates `Models`, `Unavailable`, `Fallback` and `CLIThinkingLevels`.
- `UnavailableModel` (`models.go:64`) is *"a model the runtime named but will not run on this host"* —
  kept in a **separate list** so it can never be mistaken for selectable.
- `Catalog.Verified()` (`models.go:147`) reports whether the catalog is the runtime's *own* answer. Its
  docstring is the rule: a fallback or an empty catalog means **"unknown", not "unsupported"** — the
  saved value goes to the CLI as-is and the CLI is the judge.
- `Fallback` must never enter the day-scale cache, or *"one transient failure [becomes] the answer for
  24h"* (`models.go:120-127`, MUL-5549).

---

## 4. Skills — two different things share the word

### 4.1 Workspace skills (structured, many-to-many)

`008_structured_skills.up.sql` created three tables: `skill` (workspace-level: `name`, `description`,
`content`, `config`), `skill_file` (supporting files by path), and `agent_skill` (the M2M join). The
same migration **dropped the earlier text `skills` column** from `agent` (see §8).

A workspace skill's content is a `SKILL.md`. `internal/skill/frontmatter.go:27` parses its YAML
frontmatter for `name`/`description`, and `internal/skill/reserved.go:12,25` reserves the filename
`SKILL.md` — a supporting file may not claim the path the daemon writes the primary content to, and the
check cleans the path first so `./SKILL.md` and `sub/../SKILL.md` are caught too.

### 4.2 Runtime skills (the CLI's own)

`206_agent_disabled_runtime_skills.up.sql` added `disabled_runtime_skills`. These are **not** workspace
skills: they are skills the *provider CLI* ships, and the column is a per-agent **disable list**.
`internal/daemon/execenv/runtime_skill_policy.go:17` defines `RuntimeSkillRefForEnv{Root, Key, Name,
Plugin}` — *"a runtime-local skill for provider-specific task environment filtering."* So a workspace
skill is authored and shared; a runtime skill is inherited from the CLI and can only be switched off.

### 4.3 Skill bundles are hashed

`pkg/skillbundle/hash.go` exists to hash a skill bundle. (Its use is on the dispatch path; the mechanics
belong to batch 04.)

---

## 5. Permissions — the security-critical half

### 5.1 Two questions, deliberately separated

`internal/handler/agent_access.go:13-23` states the split in its own words:

> *"Two distinct questions, previously conflated in `canAccessPrivateAgent`:*
> *- "can this actor SEE / open this agent in the UI" → `canAccessPrivateAgent`*
> *- "can this actor TRIGGER a run for this agent" → `canInvokeAgent`*
> *The invoke gate is the security-critical one: a workspace admin must NOT be able to invoke someone's
> private agent (and thereby use that owner's Composio/OAuth connections) just because they are an
> admin. Admin retains management + inventory visibility, not the ability to run."*

### 5.2 The model

`130_agent_invocation_permission.up.sql` (MUL-3963) replaced the overloaded `visibility` column with:

- `agent.permission_mode`: **`private`** (owner only — *no admin bypass, no A2A bypass*) or
  **`public_to`** (an allow-list decides).
- `agent_invocation_target`: one row per `(agent, target_type, target_id)`, `target_type ∈ {workspace,
  member, team}`. Targets **stack**, and the gate **OR-matches** them. `team` is *"reserved … stored
  but NOT effective in V1 (no team membership source yet)."*
- `visibility` is **kept and derived** — *"so old clients never see a permission WIDENING."* It is no
  longer an authorization source.

The default is `private`, and the migration says why: *"Default private = deny-by-default."*

### 5.3 The gate, read in code

`internal/handler/agent_access.go:73` `invokeAgentDecision`:

1. Owner may always invoke their own agent (`:82`).
2. If `permission_mode != "public_to"` → **false**, deny-by-default (`:86-90`).
3. Otherwise walk the targets (`:115-131`): `workspace` admits a workspace member — and, as a
   *"deliberate, product-approved exception"* (`:99-106`), also admits agent/system principals so a
   webhook or automation can trigger a workspace-shared agent with no human at the top of the chain;
   `member` requires the matching human; `team` admits no one in V1.

### 5.4 Agent-to-agent is judged by the human at the top

The rule (`agent_access.go:33-36`): *"A2A is judged by the top-of-chain human originator, never by the
immediate agent actor: if user U triggers agent A and A @-mentions agent B, B is only invocable when U
(the originator) is in B's allow-list. This prevents agents from forming a channel that bypasses the
owner's white-list."*

### 5.5 "Denied" is kept apart from "unknown"

`internal/service/agent_invocation.go:21-50` is the durable-trigger twin of the gate. Its comment draws
the distinction that matters for a scheduler: `(false, nil)` is a real verdict; `(false, err)` is *"we
do not know"*. The durable path (`CanMemberInvokeAgent`) fails **closed** on a lookup error, while the
interactive path wants the error so it can retry rather than tell a person they lack a permission they
have. Collapsing the two *"is what turns one transient database error into … a person told they lack a
permission they have."*

### 5.6 No foreign keys

`130`'s header states the house rule again: `agent_invocation_target` carries **no** FKs; the
application maintains the relationships (targets pruned on member removal; agent rows cleaned on
hard-delete). The migration explains the one real hazard this creates — a re-invited user must not
inherit stale grants — and the app-level function that prevents it.

---

## 6. Product-defined agents

`163_agent_builder.up.sql` added `kind ('user'|'system')` and `system_key`. A `system` agent is one the
**product** defines, not the user:

- **Mika** — a product onboarding agent: `internal/handler/mika_agent.go:125,172,192` create agents with
  `system_key = service.MikaSystemKey`, and `mika_onboarding.go:99` recognises them.
- **The agent builder** — the agent that *builds* agents: `agent_builder.go:115-116` sets
  `system_key = <prefix> + flowID`, and `:509-511` guards by `kind == "system" && prefix match`.

`172_agent_system_identity_index.up.sql` adds a **partial unique index** —
`UNIQUE (workspace_id, owner_id, runtime_id, system_key) WHERE system_key IS NOT NULL` — so a given
product agent exists once per (owner, runtime) and user agents are unconstrained. The index is created
`CONCURRENTLY` in a **single-statement migration**, because *"concurrent index creation cannot run in a
transaction or a multi-command migration."*

---

## 7. The lifecycle

- `status ∈ {idle, working, blocked, error, offline}` (`001_init`) — the teammate's live state.
- `archived_at` / `archived_by` (`031`) — **soft delete**, *"soft-delete replacement."* Agents are
  normally archived, not deleted, so related rows (invocation targets, drafts) persist across
  archive/restore.
- `max_concurrent_tasks` — default **1**, raised to **6** by `023`, which also back-filled existing rows
  set to 1. (Batch 04 covers how the queue honours it.)
- `agent_builder_draft` (`252`) — the half-typed configuration of an agent being created by
  conversation, made a **server-owned object** so it survives a reload. `draft` is **opaque to the
  server** (*"teaching Postgres and the handler about it would create a second definition to keep in
  sync for no gain"*), and `chat_session_id` is the primary key so the write path is a plain upsert.

---

## 8. The retirement ledger (rule 10)

Multica was predicted to be the richest retirement surface of the three studies, and it is. Four
retirements found, each with its reason recorded in the migration itself:

| Migration | What was removed | Why (the migration's own words) |
|---|---|---|
| `008_structured_skills` | `agent.skills` (TEXT) | replaced by the structured `skill` + `agent_skill` model |
| `032_drop_agent_triggers` | `agent.triggers`, `agent.tools` (JSONB) | *"Trigger behavior … is now always enabled (hardcoded). Tools was a placeholder field never used at runtime."* |
| `109_drop_agent_skills_local` | `agent.skills_local` | *"the unreleased per-agent local skill toggle"* — reverted |
| `126_runtime_profile_drop_gemini` | `gemini` from the `protocol_family` CHECK | removed from the whitelist (constraint re-added `NOT VALID` so historical rows upgrade cleanly) |

One further evolution, not a removal: migration `129` gated the Composio overlay on
**`originator == agent.owner_id`**, and migration `130` **reversed that rule** — the overlay now follows
invocation permission and uses the owner's connection, and the migration rewrites the column comments
to say the old gate *"is gone."* The column comments are *the* documentation for this, because they
drive the sqlc-generated doc comments in `models.go`.

**The lesson the ledger teaches:** the durable truth of "what an agent is" is not any one doc — it is
the migration chain, read in order. Three of these four retirements would be invisible to a reader of
the current schema alone.

---

## 9. Findings

Each finding is tagged by pole and answered against the two value questions: **Q1 · USER VALUE** (how it
serves a person using the platform) and **Q2 · VISION VALUE** (how it serves the AI-first business &
resources planner vision, incl. versatility and integratability).

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F02-01** | **The machine / teammate split** — `agent` (teammate) bound to `agent_runtime` (machine) by a `NOT NULL` `RESTRICT` FK. | P1 | You add a colleague without caring which host runs it; the host can be replaced without losing the colleague. | The exact primitive a tenant needs: an engine instance that many agents share. |
| **F02-02** | **One `Backend` interface, 24 implementations for 25 providers.** | P1 | Every provider behaves the same from the platform's side. | The engine is swappable behind one method — the seam that lets a new engine be added without touching callers. |
| **F02-03** | **A closed provider whitelist enforced in Go *and* Postgres, kept in lockstep by hand + a migration log.** | P1 | You cannot pick a provider the platform has not tested. | A safe, auditable list of engines; widening it is a recorded act, not an accident. |
| **F02-04** | **`runtime_profile`** — a workspace may define a custom runtime, based only on a supported family; args are `fixed_args` only. | P1 | A team can wrap an in-house CLI and share it. | Extensibility without letting a workspace invent an unsupported engine. |
| **F02-05** | **`BuiltinRuntime` descriptor** — one declaration site; a new fork is one entry. | P1 | A new compatible runtime appears everywhere at once. | Cheap, low-risk extensibility. |
| **F02-06** | **The per-agent config surface (12 columns); model/thinking/tier stored runtime-native, not neutralised.** | P1 | The picker shows exactly what the CLI accepts. | Per-agent capability without a translation layer to maintain. |
| **F02-07** | **The catalog knows what it does not know** (`Verified`, `Fallback`, `Unavailable`). | P1 | The UI never offers a model the host cannot run. | Honest capability reporting; a failed probe is "unknown", never a silent downgrade. |
| **F02-08** | **Two kinds of skill** — workspace (structured, M2M) vs runtime (CLI-owned, disable-only). | P1 | You author and share skills; you switch off ones the CLI ships. | One vocabulary, two lifecycles, no conflation. |
| **F02-09** | **Invocation permission: `permission_mode` + a stacking allow-list, deny-by-default; the admin-bypass privacy hole closed.** | P1 | A private agent cannot be run by an admin or a stranger. | Authorization is explicit and default-deny — the posture the vision requires. |
| **F02-10** | **A2A is judged by the top-of-chain human originator.** | P1 | Agents cannot quietly chain around a person's allow-list. | Agent collaboration stays inside the human's grant. |
| **F02-11** | **Product-defined agents** (`kind=system`, `system_key`) with a partial unique index. | P1 | The product's own helper agents are distinguishable from yours. | The platform can ship first-party agents without polluting user space. |
| **F02-12** | **The lifecycle: live `status`, soft archive, `max_concurrent_tasks` (1→6), a server-owned builder draft.** | P1 | A colleague can be paused, archived and edited mid-creation without loss. | Durable, restartable configuration. |
| **F02-13** | **The retirement ledger** — 4 retirements, each with its reason; the schema is a history, not a snapshot. | PZ | (indirect) — the feature set you see is the one that survived. | Rule 10 proved valuable: three retirements are invisible in the current schema. |
| **F02-14** | **"Denied" kept apart from "unknown"** on the durable invocation path (fail closed; the interactive path retries). | P1 | A person is never wrongly told they lack a permission. | Correctness under transient failure — the difference between a retry and a false denial. |

---

## 10. Divergences and honest bounds

- **No divergence between docs and code was needed to reach these findings** — the migration headers and
  Go doc-comments are unusually candid here, and where they explain a decision they agree with the code.
  This is the opposite of the CrewAI study's shape (93% docs, 45 duplicated trees); here the docs are
  small and the *comments in code* carry the design record.
- **Bound (stated, not glossed):** this batch read the **agent** surface only. How a run is actually
  claimed, dispatched, retried and recovered is batch 04; how the workspace fences the agent's blast
  radius is batch 03; the agent's UI is batch 05.
- **Bound:** `conversation_starters` arrived in migration `404` and was renamed in `432`; the feature is
  unreleased, so its shape may move. It is recorded as present, not as stable.
- **Bound:** the `team` invocation target is **stored but inert** in V1 — the column exists, the gate
  treats it as admitting no one. Recorded as a reserved seam, not a capability.

---

## 11. Carried forward to batch 07 (the synthesis)

Two findings are candidates for the highest transferable value and will be ranked in batch 07:

1. **The machine / teammate split (F02-01)** — an `agent_runtime` that many `agent` rows bind to, with a
   `RESTRICT` FK. It is the cleanest expression seen so far of "one engine instance, many colleagues".
2. **The invocation-permission model (F02-09 / F02-10)** — a deny-by-default gate, an explicit stacking
   allow-list, and A2A judged by the top-of-chain human. It is the most complete authorization model in
   the study so far, and the one whose *reason* (a real privacy hole) is recorded in the migration.

Both are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 02 of 07. Read from source on 2026-10-15. Next: `findings/03-the-workspace.md`.*
