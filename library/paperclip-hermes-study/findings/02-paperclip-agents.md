# 02 — Paperclip: agents

**Batch 02 of the Paperclip + Hermes study. Written 2026-10-05.**

This batch reads **upstream Paperclip** at `library/ai/paperclip-master/` (8,299 files; the
newest version). It is not our code and not the sibling's 0.3.1 fork. Every claim below names
the Paperclip file it came from. Where a document and the code disagree, the code is trusted
and the disagreement is stated. This is a static read: nothing here was executed, so anything
that depends on runtime behaviour is marked as such.

The one-sentence model: **an agent is a company-scoped row in `agents` that carries a role, an
org-chart position, a budget, and an adapter choice; a heartbeat wakes it; the adapter spawns a
runtime; the runtime works a task.** The rest of this document unpacks that.

---

## 1. How an agent is defined

### 1.1 The database row

The authoritative definition is the `agents` table in
`packages/db/src/schema/agents.ts`. The columns are:

| Column | Type | Meaning |
|---|---|---|
| `id` | uuid PK | the agent id |
| `company_id` | uuid FK → `companies.id` | every agent belongs to exactly one company |
| `name` | text | display name |
| `role` | text, default `"general"` | one of the fixed roles (see §1.3) |
| `title` | text | free-text job title |
| `icon` | text | legacy icon key |
| `appearance` | jsonb `AgentAppearance` | the visual persona (§3) |
| `status` | text, default `"idle"` | lifecycle status |
| `reports_to` | uuid FK → `agents.id` | **self-referencing manager link** — the org chart |
| `capabilities` | text | free-text capability note |
| `adapter_type` | text, default `"process"` | which runtime adapter runs this agent |
| `adapter_config` | jsonb, default `{}` | adapter-specific config (includes the model) |
| `runtime_config` | jsonb, default `{}` | runtime config (e.g. `aiConnection` binding) |
| `default_environment_id` | uuid FK → `environments.id` | default execution environment |
| `budget_monthly_cents` | integer, default 0 | monthly budget |
| `spent_monthly_cents` | integer, default 0 | recorded spend |
| `pause_reason`, `paused_at` | text / timestamp | why and when paused |
| `error_reason` | text | last error |
| `permissions` | jsonb, default `{}` | e.g. `canCreateAgents`, `canCreateSkills`, `trustPreset` |
| `last_heartbeat_at` | timestamp | last wake |
| `metadata` | jsonb | free metadata (the built-in marker lives here, §4.3) |
| `created_at`, `updated_at` | timestamps | audit |

Two indexes matter for reading: `agents_company_status_idx` (company+status) and
`agents_company_reports_to_idx` (company+manager). A unique constraint `agents_company_id_uq`
on `(company_id, id)` exists so other tables can hold composite foreign keys to an agent
within one company.

### 1.2 The API shape

The TypeScript `Agent` interface in `packages/shared/src/types/agent.ts` mirrors the row and adds
computed fields: `urlKey`, `avatarUrl`, and `orgChainHealth`. `AgentDetail` extends it with
`chainOfCommand` (an array of `AgentChainOfCommandEntry`) and `access` (`AgentAccessState`:
whether the agent can be assigned tasks, and why). `AgentPermissions` is the typed view of the
`permissions` jsonb: `canCreateAgents`, `canCreateSkills?`, `trustPreset?`,
`authorizationPolicy?`.

The create/patch validator is `packages/shared/src/validators/agent.ts`. Notably it defines
`adapterConfig` as a loose record with a `superRefine`, and it **rejects**
`runtimeConfig.modelProfiles` with "no longer supported" (line ~78) — an explicit retirement of
a former per-agent model-profile feature.

### 1.3 Roles and statuses

The fixed role list is `AGENT_ROLES` in `packages/shared/src/constants.ts`:
`ceo, cto, cmo, cfo, security, engineer, designer, pm, qa, devops, researcher, general`, with
labels in `AGENT_ROLE_LABELS`.

The status list is `AGENT_STATUSES`: `active, paused, idle, running, error, pending_approval,
terminated`. The user-facing runtime guide (`docs/agents-runtime.md`) documents a slightly
smaller set and omits `pending_approval`, `active` and `terminated` — a documentation gap, not
a code gap.

### 1.4 The tables around an agent

An agent is not one row; it is a small cluster. The schemas that hang off it are:

| Table | File | What it holds |
|---|---|---|
| `agent_config_revisions` | `packages/db/src/schema/agent_config_revisions.ts` | append-only before/after snapshots of adapter config, with `changedKeys` and `rolledBackFromRevisionId` |
| `agent_instruction_revisions` + `agent_instruction_heads` + `agent_instruction_working_copies` | `packages/db/src/schema/agent_instruction_revisions.ts` | the **legacy** instruction-history model (§3.3) |
| `agent_runtime_state` | `packages/db/src/schema/agent_runtime_state.ts` | live session id, last run, cumulative tokens and cost |
| `agent_task_sessions` | `packages/db/src/schema/agent_task_sessions.ts` | one row per (agent, adapter, task) session, plus goal state |
| `agent_memberships` | `packages/db/src/schema/agent_memberships.ts` | users "joined"/starred to an agent (per company+user+agent) |
| `agent_wakeup_requests` | `packages/db/src/schema/agent_wakeup_requests.ts` | queued wakeups |
| `agent_api_keys` | `packages/db/src/schema/agent_api_keys.ts` | agent API keys |
| `user_inbox_agent_policies` | `packages/db/src/schema/user_inbox_agent_policies.ts` | per-user allowlist of which agents may message them |

### 1.5 The org chart

`reports_to` is a nullable self-reference, so the graph is a forest: a root agent has no manager
and every other agent has one. `packages/shared/src/agent-eligibility.ts` walks that chain and
returns `AgentOrgChainHealth` with `status: "healthy" | "invalid_org_chain"` and reasons
`terminated_ancestor`, `missing_manager`, or `cycle`. It also warns — but does not block — when a
**paused** ancestor would dead-letter an escalation. `AgentDetail.chainOfCommand` exposes the
walked chain to the UI.

**So the definition of an agent is: a company-scoped identity + a role + an org-chart edge
(`reports_to`) + a budget + an adapter binding (`adapter_type` + `adapter_config`) + a status.**
That is the whole of it. There is no "kind" column, no "human vs AI" column, and no owner column.

---

## 2. What is a "harness" / adapter?

### 2.1 "Harness" is the product word; "adapter" is the code word

The README tagline says *"Choose models and harnesses per agent"*
(`README.md:39`). In the code the same concept is called an adapter, and the two are used as
synonyms. `packages/shared/src/types/adapter-registry.ts` opens with:

> *"One declarative agent-harness ("adapter") entry."* — and its field comment says
> *"The harness, e.g. `"opencode_local"`."*

So a **harness = an adapter = the bridge between Paperclip and one kind of agent runtime**
(Claude Code CLI, Codex CLI, Hermes, OpenClaw, a raw shell command, an HTTP endpoint, …).

**There is no `harness` column and no `harness` entity in the database.** The only persisted
fields are `adapter_type` (a string) and `adapter_config` (jsonb). "Harness" is marketing/CLI
vocabulary layered on top of the adapter registry. The word is also used in two other, unrelated
senses in the repo — an **evaluation harness** (`doc/evals.md`, `tests/runner-e2e/`) and a
**skill test harness** (`company_skill_test_runs.harness_issue_description`). A reader must not
conflate them.

The CLI makes the mapping explicit. `cli/src/commands/test-drive.ts` defines a
`HarnessDefinition` as `{ adapterType, credentialTarget, credentialName }` and the three
test-drive harnesses map as:

| Harness | Adapter | Credential variable | Model |
|---|---|---|---|
| `claude` | `claude_local` | `ANTHROPIC_API_KEY` | optional (adapter default) |
| `codex` | `codex_local` | `OPENAI_API_KEY` | optional (adapter default) |
| `opencode` | `opencode_local` | `OPENROUTER_API_KEY` | required, `openrouter/…` |

(`doc/CLI.md`, "Harness configuration"; `cli/src/commands/test-drive.ts:37-79`.)

### 2.2 What an adapter does

`docs/adapters/overview.md` states the contract. On a heartbeat, Paperclip:

1. looks up the agent's `adapterType` and `adapterConfig`;
2. calls the adapter's `execute()` with the execution context;
3. the adapter spawns or calls the agent runtime;
4. the adapter captures stdout, parses usage/cost, and returns a structured result.

`docs/adapters/creating-an-adapter.md` gives the interfaces. `execute()` receives an
`AdapterExecutionContext` (`runId`, the agent, `runtime.sessionParams`, the config, the task
context, and `onLog`/`onMeta`/`onSpawn` callbacks) and returns an `AdapterExecutionResult`
(`exitCode`, `timedOut`, `usage`, `sessionParams` — persisted across heartbeats — `provider`,
`model`, `costUsd`, `clearSession`). Adapters may also implement `testEnvironment()`,
`listSkills()`/`syncSkills()`, and declare capability flags such as `supportsInstructionsBundle`,
`supportsLocalAgentJwt`, `instructionsPathKey`, and `requiresMaterializedRuntimeSkills`.

Adapters live in `packages/adapters/`: `claude-local`, `codex-local`, `cursor-cloud`,
`cursor-local`, `gemini-local`, `grok-local`, `hermes`, `hermes-gateway`, `kimi-local`,
`openclaw-gateway`, `opencode-local`, `pi-local`. Each package ships three consumers — server
(`execute`), UI (transcript parser), and CLI (terminal formatter) — per
`docs/adapters/creating-an-adapter.md`.

### 2.3 Which adapters exist (and where the docs disagree)

The code's authoritative list is `BUILTIN_ADAPTER_TYPES` in
`server/src/adapters/builtin-adapter-types.ts` — **16 types**:

`acpx_local, claude_local, codex_local, paperclip_runner, cursor_cloud, cursor, gemini_local,
grok_local, hermes_gateway, hermes_local, kimi_local, openclaw_gateway, opencode_local,
pi_local, process, http`.

The shared input schema `AGENT_ADAPTER_TYPES` in `packages/shared/src/constants.ts` lists **15**
— the same set **minus `acpx_local`**. The public docs disagree with both:

- `docs/adapters/overview.md` lists 12 adapters and omits `paperclip_runner`, `acpx_local`,
  `cursor_cloud`, `grok_local`, and `kimi_local`.
- `docs/agents-runtime.md` lists 10 built-ins plus one external (`droid_local`) and omits
  `gemini_local`, `kimi_local`, `grok_local`, `cursor_cloud`, `acpx_local` and
  `paperclip_runner`.

**Trust the code.** `paperclip_runner` is a real adapter: `server/src/adapters/registry.ts:363`
defines it and says it *"Runs Codex, OpenCode, Claude Managed, AWS AgentCore, or ACPX
Claude/Grok Build through the Rust Paperclip runner and authenticated PRP transport"*, and it
requires the native runner coordinator.

### 2.4 How a model is chosen per agent

The model is **part of the agent's adapter config**, not a separate table:

- `server/src/services/heartbeat.ts:6909` defines `readConfiguredModelFromAdapterConfig`, which
  simply returns `adapterConfig.model`.
- Each adapter supplies its own model catalog and default. `packages/adapters/claude-local/src/index.ts`
  exports `models` (a list of `{id,label}` entries) and `resolveClaudeModel(model, env)`, which
  resolves in order: explicit `adapterConfig.model` → `env.ANTHROPIC_MODEL` → the adapter default
  `claude-opus-5` (except Bedrock/Vertex, which keep their provider default).
- `packages/adapters/codex-local/src/index.ts` has the same pattern with
  `DEFAULT_CODEX_LOCAL_MODEL` and alias rewriting.
- Reasoning effort is likewise `adapterConfig.effort`, and adapters expose
  `claudeLocalReasoningEffortsForModel()` / Codex effort sets so the UI can offer only valid
  values (`docs/adapters/overview.md`; `doc/DEVELOPING.md:143`).

The model catalog itself is maintained by hand and audited. `doc/adapter-model-audit-2026-09-22.md`
records the per-adapter model additions and states the governing rule: *"Catalog entries identify
models; provider accounts and installed CLIs determine access."* It also notes that some adapters
discover models at runtime (Pi, OpenCode locally, Cursor Cloud, Hermes, OpenClaw) instead of
shipping a curated list.

**Answer to "how is a model chosen per agent":** the operator picks a model for the agent; it is
stored as `adapterConfig.model`; on each run the server reads it, passes it to the adapter, and
the adapter maps it to the runtime's CLI flag. A blank value falls back to the adapter's default.

---

## 3. Personas vs agent files vs instruction revisions

These are three separate documents in `doc/` and they are **not** three layers of the same thing.
They are one live mechanism and two retired ones.

### 3.1 Personas = visual identity only

`doc/agent-personas.md` defines a persona as
`{ schemaVersion: 1, characterVersion: "cap-v1", paletteId }`, persisted in `agents.appearance`
(and typed as `AgentAppearance` in `packages/shared/src/agent-appearance.ts`). It is **purely
cosmetic**: 17 permanent palettes recolour one shared character; the avatar is served from a
public, agent-agnostic endpoint `/api/agent-avatars/…`. The document is explicit that names,
status badges and status text *"remain authoritative"* — the persona carries no prompt, no
model, and no permissions.

### 3.2 Agent files = the live instructions model

`doc/agent-files.md` is the current design. **Each managed agent has one current directory**,
scoped by company and agent, under
`<instance>/companies/<company>/agents/<agent>/instructions/`. `AGENTS.md` (or a configured
entry) is one file in it; the agent may also create ordinary files and folders for notes and
memory. The Instructions Editor reads and writes this directory.

Key properties, all from `doc/agent-files.md`:

- Agents can edit their own files under the responsible user's permissions; editing **another**
  agent's files needs target-scoped configuration permission.
- Limits: 100,000 entries, 256 MiB per file, 2 GiB total; the instruction entry must be valid
  UTF-8, ≤ 1 MiB, and cannot be deleted. Symlinks/hardlinks/special files are rejected.
- A run restores the current files into a private run copy, points `AGENT_HOME` at it, and
  applies **per-file, last-sync-wins** changes on stop. There is **no text merge and no
  historical copy** to recover an overwritten version. A stale browser save returns HTTP 409 and
  keeps the user's draft.
- Only the *loaded* instruction entry participates in the runtime instruction digest; ordinary
  memory/image edits do not change it.

### 3.3 Instruction revisions = the retired model

`doc/agent-instruction-revisions.md` says plainly: *"The revision-based design in the first
version of PR #14325 has been superseded by persistent agent files. Current managed files are
authoritative; new edits do not create revision or head rows."* Migrations 0285/0286 and the
existing revision records are **retained for upgrade safety only**; old heads are adopted once
and read-only history endpoints remain for pre-upgrade records, but *"they are not advertised as
new agent capabilities."*

The tables still exist (`agent_instruction_revisions`, `agent_instruction_heads`,
`agent_instruction_working_copies`), and the API types still exist
(`AgentInstructionRevision`, `AgentInstructionSnapshot`, `AgentInstructionDiff`,
`AgentInstructionHistory` in `packages/shared/src/types/agent.ts`), but the live path is the
file directory.

### 3.4 Config revisions are separate again

`agent_config_revisions` (`packages/db/src/schema/agent_config_revisions.ts`) is a **different**
history: it snapshots `adapterConfig` before/after each change, with `changedKeys` and a
`rolledBackFromRevisionId`. So Paperclip has one live instruction model (files), one retired
instruction model (revision rows), and one live *config* history (config revisions). Do not merge
them.

### 3.5 How instructions evolve over time

The honest summary: **instructions are a live file, edited in place, with last-write-wins and no
merge.** Evolution happens by the operator editing `AGENTS.md` in the editor, or by the agent
rewriting its own files during a run. A stale editor save is rejected (409); a run's sync can
overwrite a saved browser edit (last-sync-wins). The pre-2026 revision/restore history is no
longer produced. This is a deliberate simplification — and a loss of auditability that we should
weigh (§7).

---

## 4. What is a team?

### 4.1 Teams are catalog templates, not runtime objects

`packages/teams-catalog/` is a **read-only catalog of team templates**. Its manifest type
(`packages/teams-catalog/src/types.ts`) defines a `CatalogTeam` with `key`, `kind`
(`bundled` | `optional`), `category`, `entrypoint: "TEAM.md"`, `schema: "agentcompanies/v1"`,
`defaultInstall`, `rootAgentSlugs`, `agentSlugs`, `projectSlugs`, `requiredSkills`, `envInputs`,
`trustLevel` (`markdown_only` | `assets` | `scripts_executables` | `external_sources`), and a
per-file inventory with sha256 hashes.

A team is authored as a directory of markdown. `TEAM.md` frontmatter names a `manager` (the root
agent's file) and lists `includes` (other agents, projects, tasks). Example
(`packages/teams-catalog/catalog/bundled/company-defaults/core-exec-team/TEAM.md`): manager
`agents/ceo/AGENTS.md`, includes `cto`, `qa`, a starter project, and required skills
`task-planning`, `issue-triage`, `github-pr-workflow`, `qa-acceptance`. Each agent file is a short
role description with its own frontmatter — e.g.
`.../agents/ceo/AGENTS.md` declares `role: ceo`, `reportsTo: null`, and `skills: [task-planning,
issue-triage]`.

The shipped catalog (`packages/teams-catalog/generated/catalog.json`) has **4 teams**:
`core-exec-team` (bundled, `defaultInstall: true`), `product-design`, `product-engineering`
(both bundled), and `content-machine` (optional). `MIGRATION.md` confirms this Phase-H set.

### 4.2 Installing a team

A team install is a **company-portability import**, not a new subsystem. The server service
`server/src/services/teams-catalog.ts` prepares a `CompanyPortabilityImport` from the team's
inline files and hands it to `companyPortabilityService`, which creates the agents, projects,
tasks, routines and skills. Import options include `targetManagerAgentId`/`targetManagerSlug`
(install the team under an existing manager), per-agent `adapterOverrides`, and name overrides.
`MIGRATION.md` notes adapter overrides are intentionally left out of frontmatter so the operator
chooses the runtime at install time.

### 4.3 How agents group at runtime

Two mechanisms, and they are distinct:

1. **The org chart** — the `reports_to` self-reference on `agents` (§1.5). This is the real,
   persistent grouping: manager → reports, walked by `agent-eligibility.ts`, surfaced as
   `chainOfCommand`.
2. **Projects and team templates** — projects (`packages/db/src/schema/projects.ts`) and
   `project_memberships` group work; the teams catalog is a *starting bundle* that seeds both the
   org chart and projects. A team is not a persistent membership list; once installed, the agents
   are ordinary rows whose grouping is `reports_to` + project membership.

### 4.4 Built-in agents

`docs/built-in-agents.md` and `server/src/services/built-in-agents.ts` define **first-party,
company-scoped agents resolved by a stable registry key**. They are normal `agents` rows carrying
an immutable marker at `metadata.paperclipBuiltInAgent`. A `BuiltInAgentDefinition` has `key`,
`displayName`, `featureKeys`, `shortPurpose`, `defaultInstructions`, `defaultRole`,
`allowedAdapterTypes`, optional budget, and an optional bundle (instructions + skill + routine).
State is derived: `not_provisioned`, `needs_setup`, `ready`, `paused` (the code union also
includes `pending_approval`). Provisioning skips the board hire-approval gate because built-ins
are *"registry-owned system capacity, not ad hoc hires"*, but still requires `agents:create`.

**Documentation/code disagreement:** `docs/built-in-agents.md` says *"The first built-ins are
`briefs` and `learning`."* The code (`server/src/services/built-in-agents.ts:308-…`) defines
**four**: `briefs`, `learning`, `reflection-coach`, and `summarizer`. Trust the code.

---

## 5. How an agent gets its tools and skills

### 5.1 Skills: a two-layer library, materialized into the workspace

`docs/guides/agent-developer/skills-store.md` names the two layers:

| Layer | What it is | Where |
|---|---|---|
| **The catalog** | curated, read-only skills shipped with Paperclip | `@paperclipai/skills-catalog` |
| **Your company library** | skills installed in *your* company | the `company_skills` table |

A skill is a directory with a `SKILL.md` carrying frontmatter `name` and `description`. At
runtime, the company's installed skills are **materialized into the agent's workspace as
`SKILL.md` directories**, and the agent's harness loads the frontmatter `name` + `description` as
**routing logic** — the agent reads the one-line description to decide whether to load the full
body. This is why the docs insist the description read as "what this does and when to use it".

The catalog package `packages/skills-catalog/` compiles markdown under
`catalog/bundled/**` and `catalog/optional/**` into `generated/catalog.json`. The shipped
manifest has **17 skills** (10 bundled, 7 optional). Trust level is *derived from the files*:
`markdown_only` (only `.md`), `assets` (markdown + static files), `scripts_executables` (any
script). Bundled examples: `task-planning`, `issue-triage`, `status-card-query`, `summarize-status`,
`reflection-coach`, `qa-acceptance`, `github-pr-workflow`, `doc-maintenance`, `wireframe`.

Per-agent assignment is stored **inside the agent's adapter config**, not in a join table.
`packages/shared/src/constants.ts:82` lists `paperclipSkillSync` as an adapter-agnostic key that
*"is persisted in adapterConfig but must survive adapter swaps"*, and
`server/src/services/company-skills.ts:6610` reads `adapterConfig.paperclipSkillSync` as the
agent's `assignedSkills`. Skill sync into workspaces is governed by a per-instance preference
(`skills-store.md`). The company-level default policy lives in
`packages/db/src/schema/company_skill_policies.ts` (`defaultEffect`, `rules`), and GitHub-synced
skill repositories in `company_skill_sources` / `company_skill_source_entries`.

An agent receives skills from three routes: (a) the company library via sync, (b) a team
import's `requiredSkills`/agent `skills:` frontmatter, and (c) skills it writes itself
(`canCreateSkills` permission).

### 5.2 Tools: MCP, governed by profiles bound to scopes

`doc/MCP-ACCESS-GOVERNANCE.md` gives the mental model: **Application → Connection → Catalog Entry
→ Profile → Binding**, then at call time **Policy → Gateway → Action Request**. In plain terms:

- an **Application** is a logical group ("GitHub"); a **Connection** is one MCP endpoint
  (`remote_http` or `local_stdio`);
- a **Catalog Entry** is one discovered tool, classified `read` / `write` / `destructive`;
- a **Profile** is a named allow/deny bundle; a **Binding** attaches it to a scope;
- a **Policy** is an orthogonal call-time rule (`allow`, `block`, `require_approval`,
  `rate_limit`, `trust_rule`; deny beats allow);
- the **Gateway** resolves the decision, records a call event, and opens an **Action Request**
  for human approval when needed.

The bindable scopes are `company`, `agent`, `project`, `routine`, `issue`, `gateway`
(`TOOL_PROFILE_BINDING_TARGET_TYPES`, `packages/shared/src/constants.ts:1092`), with effective
precedence `issue > routine > agent > project > company`. So an agent's tool surface is the
union of the profiles bound to it and to its enclosing scopes.

The storage is in `packages/db/src/schema/tool_access.ts`: `tool_applications`,
`tool_connections`, `connection_grants`, `tool_catalog_entries`, `tool_profiles`,
`tool_profile_entries`, `tool_profile_bindings`, `tool_mcp_gateways`,
`tool_mcp_gateway_tokens`, `tool_invocations`, `tool_action_requests`, `tool_call_events`, and
the audit tables. Credentials are per connection with a policy of `shared`, `per_user`,
`per_user_with_fallback`, or `per_agent`, and grants can be `organization`, `user`, or `agent`.

### 5.3 Paperclip's own task API is also exposed as tools

Separately from external MCP, Paperclip exposes its **own task management operations** as MCP
tools — `list_issues`, `get_issue`, and the rest — documented in `doc/TASKS-mcp.md` and
implemented in `packages/mcp-server/`. So an agent's total tool surface is: its runtime's native
tools + Paperclip's control-plane MCP tools + any external MCP connections allowed by its
profiles.

### 5.4 Identity injected into every run

`docs/guides/agent-developer/how-agents-work.md` lists the env vars every agent receives:
`PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY` (a
short-lived JWT), and `PAPERCLIP_RUN_ID`, plus context vars such as `PAPERCLIP_TASK_ID` and
`PAPERCLIP_WAKE_REASON`. This is how the runtime authenticates back to the control plane.

---

## 6. Can one agent be a specific person's assistant? Can agents work solo?

### 6.1 Assistant-to-a-person: partially, and never as ownership

There is **no column in `agents` that names a person as the agent's owner**, and no
"personal agent" entity. But Paperclip provides four concrete mechanisms that make an agent
behave like a person's assistant:

1. **A per-person conversation per agent.** `doc/plans/2026-09-10-agent-chat.md` states the
   contract: *"Each person has one persistent conversation with each agent in a company. A
   conversation is an ordinary issue with fixed `conversationAgentId` and `conversationUserId`."*
   So a person has a private-feeling channel to any agent — **but** the document is explicit that
   *"these are separate conversations, not private messages"*: the backing issue is an ordinary
   company-visible task.
2. **A responsible user per unit of work.** `responsibleUserId` appears on runs, issues,
   routines and secrets (`packages/shared/src/types/heartbeat.ts:164`,
   `.../types/issue.ts:811`, `.../types/routine.ts:96`). `doc/execution-github-identity.md` states
   the rule: *"Shared agents use the GitHub connection of the person whose accepted instructions
   they are executing."* So when Alice instructs a shared agent, the agent acts as Alice for
   credentials — but the agent is not *hers*.
3. **Per-user agent policy.** `user_inbox_agent_policies` (`packages/db/src/schema/user_inbox_agent_policies.ts`)
   lets each user allow/deny which agents may reach their inbox — a per-person relationship, again
   without ownership.
4. **Memberships and stars.** `agent_memberships` lets a user "join" or star an agent; the chat
   sidebar lists starred agents per person.

**Evidence against a true personal assistant:** the `agents` table has no `ownerUserId`; agents
are company-scoped; the chat container is an ordinary issue; and the GitHub-identity document
describes agents as *"Shared agents"* whose identity is per-work, not per-agent. **So Paperclip
models the *work* as belonging to a person, not the *agent*.** The agent is a shared company
employee who borrows a person's identity for the duration of that person's accepted instructions.

### 6.2 Solo agents: yes, and they are the default shape

Agents can and do work without a person directing each step:

- `reports_to` is **nullable**, so a root agent (e.g. the CEO, `reportsTo: null` in
  `core-exec-team/agents/ceo/AGENTS.md`) has no manager.
- `docs/agents-runtime.md` §2 lists four wake sources — `timer`, `assignment`, `on_demand`,
  `automation` — and §7.1 describes the *"Simple autonomous loop"*: enable a timer, keep
  assignment wakeups on, and let the agent act each heartbeat.
- `README.md:125` and `:173` describe routines that *"create recurring tasks on their own
  schedules"* and heartbeat runs that wake agents for assigned work — no person in the loop.
- Built-in agents (`briefs`, `learning`, …) are **system capacity** provisioned without a hire
  approval (`docs/built-in-agents.md`), i.e. agents that exist for the company, not for a person.

So both are supported, and they are not in tension: an agent is company-owned and autonomous by
default, and *a person* can direct it for a stretch of work through a conversation and become the
responsible user for that work.

---

## 7. What we should learn for our platform

Each bullet names its evidence and its consequence for us.

- **A flat, honest agent row is enough to start.** Paperclip defines an agent with one table:
  identity, role, `reports_to`, budget, adapter binding, status, permissions (`packages/db/src/schema/agents.ts`).
  *For us:* our AI-employee row should stay this legible; resist adding a "type" column. The
  human/AI distinction belongs in the same shape so the org chart is genuinely mixed.
- **"Harness" should be a first-class word only if it earns it.** In Paperclip it is a synonym for
  adapter with no schema backing (`packages/shared/src/types/adapter-registry.ts`). *For us:*
  decide one word and make it a real entity. If we want per-agent model choice, model it explicitly
  rather than hiding it inside an opaque `adapterConfig` jsonb.
- **Separate identity, instructions, and history — but keep history.** Paperclip split persona
  (cosmetic), agent files (live instructions), and revisions (retired) (`doc/agent-personas.md`,
  `doc/agent-files.md`, `doc/agent-instruction-revisions.md`). *For us:* copy the separation, but
  **reject the loss of history.** Paperclip's current model is last-write-wins with *"no text
  merge or historical copy"* (`doc/agent-files.md`) — a serious auditability gap for a governance
  product. We should version instructions by default.
- **The adapter/`execute()` contract is the right seam.** A single `execute(context) → result`
  with explicit `sessionParams` for cross-run continuity
  (`docs/adapters/creating-an-adapter.md`) is a clean, testable boundary. *For us:* adopt this
  shape for our `AiRuntimePort`; it matches the sibling dossier's six-port facade.
- **Govern tools by scope-bound profiles, not per-agent grants.** Paperclip's
  Application→Connection→Catalog→Profile→Binding→Policy→Gateway chain, with bindings at
  `company/agent/project/routine/issue/gateway` and precedence narrowest-first
  (`doc/MCP-ACCESS-GOVERNANCE.md`), is more scalable than enumerating tools per agent. *For us:*
  copy the *binding precedence* idea; it lets one policy govern a whole project.
- **Skills as description-indexed, on-demand markdown is a good pattern.** The agent sees only
  `name` + `description` and loads the body only when relevant
  (`docs/guides/agent-developer/writing-a-skill.md`). *For us:* adopt it — it keeps the base
  prompt small and makes skills composable. Also copy the *derived* trust level
  (`markdown_only`/`assets`/`scripts_executables`, `packages/skills-catalog/src/types.ts`), which
  is a cheap, honest safety signal.
- **Teams as portable bundles are the right onboarding primitive.** A team is markdown with
  frontmatter installed through the portability service
  (`packages/teams-catalog/src/types.ts`, `server/src/services/teams-catalog.ts`), so "hire a
  team" reuses the same import path as "import a company". *For us:* model our starting teams as
  data, not code, and reuse the import path.
- **The org chart is the real grouping; teams are just seed data.** `reports_to` is the persistent
  grouping (`packages/shared/src/agent-eligibility.ts`); the catalog only seeds it. *For us:*
  invest in the org graph and its health checks (cycles, terminated/paused ancestors) rather than
  in a separate "team membership" table.
- **"Assistant" is a per-work relationship, not an ownership column.** Paperclip ties a person to
  work via `responsibleUserId` and a per-person conversation, while the agent stays company-owned
  (`doc/plans/2026-09-10-agent-chat.md`, `doc/execution-github-identity.md`). *For us:* this is
  the single most important design lesson. The owner asked for "some are a specific person's
  assistant". We should decide deliberately whether that means *identity* (the agent is Alice's)
  or *context* (the agent acts as Alice for Alice's work). Paperclip chose context; if we want
  identity, we must add it, and we should say so.
- **Reject Paperclip's chat privacy gap.** Its "personal" conversation is an ordinary
  company-visible issue (`doc/plans/2026-09-10-agent-chat.md`: *"not private messages"*). *For us:*
  if a human talks to their assistant, we should decide the visibility explicitly rather than
  inheriting a task container.
- **Weak point: model choice is buried in `adapterConfig` and duplicates the adapter's catalog.**
  The model lives in a free-form jsonb (`heartbeat.ts:6909`) and every adapter re-declares its own
  model list (`doc/adapter-model-audit-2026-09-22.md`). *For us:* one model registry, referenced
  by agents, would be cleaner and would avoid the doc/code drift we found in §2.3.
- **Weak point: the docs drift from the code.** We found three live disagreements in one batch
  (adapter lists, built-in agent count, agent status list). *For us:* generate the docs from the
  registries, or the drift will recur.

---

## What I could not verify

- **Runtime behaviour was not exercised.** Nothing was executed. Statements about heartbeats,
  adapter execution, session resume, skill materialization and MCP gateway decisions are read
  from code and Paperclip's own docs, not observed running. The study's method note already flags
  this; it applies here.
- **The actual number and content of `paperclip_runner` provider profiles** (Codex, OpenCode,
  Claude Managed, AWS AgentCore, ACPX) is described in `server/src/adapters/registry.ts:524` but
  I did not read the full runner implementation or the Rust transport in
  `packages/paperclip-runner/`. Batch 06 owns that contract.
- **Whether `acpx_local` is intended to be user-selectable.** It is in `BUILTIN_ADAPTER_TYPES`
  but not in `AGENT_ADAPTER_TYPES` and not in the public adapter docs; I could not determine from
  this batch whether that is deliberate or drift.
- **The exact behaviour of skill sync into workspaces** ("governed by a per-instance preference",
  `docs/guides/agent-developer/skills-store.md`) — I read the description but not the server code
  that performs the sync, so I cannot say what the preference values are.
- **How the `responsibleUserId` on a routine is set and changed** — I saw the column and the
  rule that "edits preserve the routine's responsible person"
  (`doc/execution-github-identity.md`) but did not trace the routine service.
- **Whether a "personal assistant" agent is planned on the roadmap.** `ROADMAP.md` was not read
  for this batch; the conclusion in §6.1 is about the current code, not about intent.
- **The `docs/built-in-agents.md` vs code discrepancy may be a stale doc rather than a bug** — I
  recorded the disagreement but did not check git history to see which is newer.
