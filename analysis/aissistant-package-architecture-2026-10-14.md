# aissistant-package — the code-first architecture report

**Date:** 2026-10-14 · **Method:** read the code, not the docs. Every load-bearing claim below was
measured in `C:\Users\Ramzi\Downloads\companai\aissistant-package` (git branch `aissistant`,
HEAD `ea24eabf`). Fork docs under `reboot/` were used as maps to where to look, never as truth.

---

## 1. What this codebase actually is

It is **not** the starting-kit lab. It is a **fork of upstream Paperclip 0.3.1** — measured: the
history contains a pristine upstream commit (`4feef987 "upstream pristine (paperclip 0.3.1)"`),
every internal package is named `@paperclipai/*`, and the database carries **211 Drizzle SQL
migrations**. Paperclip is an open-source **"AI company OS"** — its own words: *if an agent
(OpenClaw-style) is an employee, Paperclip is the company*. The fork rebrands it Aissistant /
Companai; the rebrand is presentation-layer (slugs still say `paperclip` / `aisisstant`).

Shape: a monorepo under `host/` — `server` (TypeScript, NestJS-style), `ui` (React), `cli`, and
`packages/` — of which the important ones for this decision are **11 runtime adapters**, `db`,
`skills-catalog`, `mcp-server`, and `adapter-utils` (which contains the ACPX engine).
`reboot/` holds the fork's own engineering record (~30 documents) — maps only.

Working tree at audit time: **3,446 deleted files** (the vendored `konsult/` tree, quarantined),
**258 modified, 62 untracked** — the "dirty" in-progress patch plus genuine new files
(`product-adapter-policy.ts`, model catalogue, tests).

## 2. How the Paperclip features work (measured)

**Tenancy = companies.** The `companies` table carries per-company settings (`issuePrefix`,
`budgetMonthlyCents`, board-approval flags); every row in the system is scoped by `companyId`.

**One permission system for humans and agents.** `company_memberships` is polymorphic:
`principalType: "user"` for people, `"agent"` for AI employees — both flow through the same
`company-member-roles.ts` / `authorization.ts` checks. There is no separate "machine accounts"
shadow system.

**Agents are full org citizens.** `schema/agents.ts` gives each agent a role, a `reportsTo`
self-FK (an org chart), `adapterType`/`adapterConfig`, its own `budgetMonthlyCents`, and a
permissions jsonb.

**Lifecycle is server-enforced.** `packages/shared/src/agent-lifecycle.ts` defines the only legal
transitions: `draft → testing|retired`, `testing → active|paused|retired`,
`active → paused|retired`, `paused → active|retired`, `retired → (nothing)`. Illegal moves throw
(`agent-lifecycle.ts`, "M3-AGT-03").

**A hire is a real provisioning event, not a config row.** `POST /companies/:id/agent-hires` runs
`applyManagedHermesHireToCreateBody` → `provisionManagedHermesEmployee` (writes an actual on-disk
Hermes home — §4) → creates the agent row → optional board `hire_agent` approval →
`activatePendingApproval`. Rejection fires the profile.

**An eval gate stands between "built" and "working".** `agent-eval-gate.ts`
("M3-AGT-02 — Evals before activation"): managed Hermes hires start in `testing`, run a **3-task
role eval pack** on a non-engagement board issue, and **engagement assignment is blocked until a
human activates them after a passing transcript** (`AGENT_EVAL_GATE_CODE`).

**Work = issues.** Assignee can be an agent or a user; issues carry `goalId`, a parent tree,
checkout/execution locks, workspaces and watchdogs. Waking an agent up goes
`queueIssueAssignmentWakeup` → `heartbeat.wakeup`.

**`heartbeat.ts` (19.4k lines) is the run engine.** wakeup → spend soft-cap → company gate →
queued run → `claimQueuedRun` → `executeRun` → **`adapter.execute({ runId, agent, runtime, config,
context, runtimeMcp, … })`** with a synchronous permission callback — one seam through which every
one of the 11 adapters is driven, each run carrying its own MCP servers.

**Approvals and spend are first-class.** A generic approvals table covers `hire_agent` and
`runtime_permission_required`. Spend is enforced in **three layers** (all measured on disk):
`spend-soft-cap.ts` (before the wake), `budget_policies` (hard stop, `budgets.ts`), and a
`cost_events` ledger.

**Chat is comments, not rooms.** There are **no room/message/thread tables** in the db package
(measured: no such `pgTable` exists). Chat = `issue_comments` +
`issue_thread_interactions`. "Rooms" are a target architecture, not a shipped schema.

## 3. How the Hermes integration is done — three lanes, one mandated

Hermes reaches this platform through **three adapters**, and the code forces which one is the
product:

| lane | what it is | state |
|---|---|---|
| **`hermes_acp`** | the host drives **one shared Hermes container** over ACP (Agent Client Protocol) via `docker exec -i` | **MANDATED** — the product lane |
| `hermes_gateway` | HTTP bridge to a Hermes API server (`POST /v1/runs`, SSE + polling fallback) | functional; **resume measured broken** |
| `hermes_local` | spawns `hermes chat -q` and regex-scrapes stdout | legacy |

**The mandate is code, not a doc preference.** `services/product-adapter-policy.ts:5` —
`DEFAULT_PRODUCT_ADAPTER_TYPE = "hermes_acp"`; any other hire or adapter switch throws **422**
unless the break-glass env `COMPANAI_ALLOW_LEGACY_ADAPTER_HIRES` is set (enforced at
hire/create/switch in `routes/agents.ts`).

A fourth piece runs the **other** direction: `paperclip-task-bridge` is a Hermes *skill* that lets
a user sitting inside Hermes drive Paperclip's REST API (credentials via env or scoped
`task_bridge` keys — never written into prompt text).

### 3.1 Anatomy of the product lane (the part that matters)

- **One container, many employees.** `docker-compose.yml` defines a single shared runtime
  (`aissistant-hermes-runtime`, 4 GB cap) with every employee's home mounted at
  `/opt/data/profiles/<slug>` and the platform's own code mounted read-only at `/paperclip`.
  Two networks are attached with `gw_priority` set so the internal inference network never wins
  the default route.
- **The host speaks ACP into it.** `adapters/hermes/src/server/acp.ts` builds
  `docker exec -i … aissistant-hermes-runtime /opt/hermes/.venv/bin/hermes-acp` and drives the
  Agent Client Protocol. **`HERMES_HOME` selects which employee answers** —
  `hermesHomeInContainer(slug) = /opt/data/profiles/<slug>`.
- **Per-run identity travels as env vars** (`FORWARDED_RUN_ENV`, acp.ts): `PAPERCLIP_API_KEY`,
  `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_RUN_ID`, `PAPERCLIP_TASK_ID`,
  `PAPERCLIP_WAKE_REASON` — and `PAPERCLIP_API_URL=http://paperclip:3100` so the runtime can call
  back into the platform. **This is exactly the per-run identity channel the old starting-kit
  integration lacked.**
- **The ACPX engine does the heavy lifting** (`packages/adapter-utils/src/acpx-engine/execute.ts`,
  3,924 lines): sessions, `session/load` resume, streaming, warm-runtime reuse for compatible
  resumes, permission modes (`approve-all` / `approve-reads` / `deny-all`), cost capture,
  cancellation.
- **A 5-step `testEnvironment()`** honestly reports docker reachability → container running → ACP
  binary present → provider configured → credential present, with warn-vs-error levels.

### 3.2 A hire writes a whole employee home

`services/hermes-provisioning.ts` (2,558 lines; `createHermesProfileHome`) writes, per hire, under
`<AISSISTANT_HERMES_ROOT>/profiles/<slug>/`:

- `SOUL.md` — the role template (from `hermes-profile-templates/<role>/`, `_shared` fallback)
- `memories/MEMORY.md` + `USER.md`
- `skills/` — role skills, copied per role
- `pending/skills` + `pending/notes` — 0777 drop-boxes for the skill-promote watcher
- `plugins/companai-approvals` — the approval transport (§3.4)
- `companai-mcp/companai-mcp.mjs` — the control-plane tools (§3.3)
- `.env` with `OPENAI_API_KEY`, **mode 0600, API lane only, never on the free local lane** (X21)
- `config.yaml` (model/provider/reasoning), `profile.yaml`, `PAPERCLIP_BINDING.json`, `auth.json`
- a **manifest with drift detection** (requested vs effective model/provider/reasoning), skill
  pins, and an append-only memory-edit log

Hire / edit / fire / rollback / sync all route through `hermes-provisioning-hooks.ts`; a home
write bumps `profileVersion`, which retires warm runtimes (B7).

### 3.3 What Hermes is allowed to touch — mediated, not dumped

An employee gets **two tool worlds**:

1. **Hermes's own ~30 native tools** from the pinned vendored Hermes tree (measured: agents already
   hold `session_search`), plus
2. **41 `paperclip*` control-plane MCP tools** from `packages/mcp-server/src/tools.ts` —
   `paperclipMe`, `paperclipInboxLite`, `paperclipListAgents`, `paperclipList/GetIssues`,
   `paperclipGetHeartbeatContext`, `paperclipListComments`, goal readers,
   `paperclipList/Get/CreateApproval`, `paperclipCreate/Update/Checkout/ReleaseIssue`,
   `paperclipAddComment`, `paperclipSuggestTasks`, ask-user-questions, confirmation requests,
   document upsert, issue-workspace service control, wait-for-service. The MCP client attaches
   the **run token + run id**, so every tool call is attributable to one run.

On top of that sit the governance layers the runtime must obey: **tool profiles with per-run
effective grants** (`heartbeat.buildPaperclipRuntimeMcpServers` mints, per run, the control-plane
MCP plus one gateway per permitted connection — each with **≤1-hour run-scoped tokens**),
approvals, budgets/hard-stop, the skills catalogue (content-hashed manifest, company policy,
per-run materialisation), secrets, and the eval gate of §2.

### 3.4 The approver is fail-closed

`plugins/companai-approvals` (Python) exists because the runtime's built-in ACP permission path is
broken upstream (a documented thread-local callback bug; the fork's own `B2c` note). When a tool
call needs a human, the plugin POSTs to `/api/agents/me/runtime-permission` with the run token;
**every failure path returns "deny"**; only offered choices are honoured (`always`/`session`
downgrade to `once` when not offered). It is **dormant until
`security.approval.transport: companai`** is written into the profile's config.

### 3.5 The per-tenant API key — it exists here

`resolveCompanyProviderApiKey` (`hermes-provisioning-hooks.ts`) reads the **company secret named
`OPENAI_API_KEY`** (AES-256-GCM via `secrets/local-encrypted-provider.ts`; the GCP/Vault providers
are stubs that throw), falls back to the deployment env, and hands it to provisioning — which
writes it into that employee's home (0600). The **free local lane** (`companai-local`, resolved
from server env and never from caller input) runs on a locally hosted llama-server and needs no
key at all. **So the answer to "how does a tenant add its own key so Hermes uses it" is: as a
company secret, encrypted at rest, injected into the employee's own home** — a real door, unlike
in the starting-kit lab.

## 4. The honest state

**Proven, committed, testable:** the run engine, per-run identity, the tool door, approvals,
budgets, the eval gate, lifecycle enforcement, and the provisioning engine.

**Measured broken:** the `hermes_gateway` lane's resume — three runs of one agent on one task
produced **three sessions with one message each** (our side only asks to resume when the previous
run saved clean session details; failed runs save nothing).

**Governance risks (my flags, ranked by severity):**

1. **`HERMES_YOLO_MODE=1` on the shared runtime** — fine for a dev box, a serious posture question
   for any shared/multi-tenant deployment.
2. **The uncommitted "dirty recovery patch" puts a run-scoped callback JWT into model-visible run
   instructions** — the fork's own capability matrix names this pattern a security NO ("never place
   bearer callback credentials in model-visible content").
3. **The Knowledge sidecar accepts `actor` from the request body** — an unauthenticated-approval
   blocker for any "AI drafts, humans approve" flow.
4. **The approvals transport is dormant until config selects it** — i.e. today's default posture
   depends on the broken upstream ACP path the plugin was written to replace.
5. **Rooms are unbuilt** by design constraints measured in the fork's own investigation: a Hermes
   session's stored messages carry a role but **no author field**, so two agents can never share
   one transcript; a room must be one session per agent. The UI route exists
   (`projects/:projectId/room` → `EngagementRoom.tsx`); board-chat is experimental-gated.
6. **The bundled built-in agents currently create nothing** — `allowedAdapterTypes` excludes
   `hermes_acp` (a deliberate gate, X24), and the vendored `konsult/` tree is deleted in the
   working tree (quarantined, gated default-off).

## 5. Recommendation — proceed, with conditions

**My recommendation: proceed with this fork as the project.** The reason is not enthusiasm, it is
the shape of the evidence: the things that are hard to fake — a 19.4k-line run engine with a single
adapter seam, server-enforced lifecycle transitions, an eval gate that blocks engagement until a
human passes a transcript, fail-closed approvals, three spend layers, per-run identity, and a
provisioning engine that writes a complete per-employee Hermes identity — are **real, committed
code**. The open problems are **governance-shaped, not plumbing-shaped**: nothing found suggests
the architecture does not work; everything found says *decide the rules before exposing it*.

Ranked actions, in the order I would take them:

1. **Commit or quarantine the dirty tree** (62 untracked + the WIP patch). Decide explicitly what
   ships: my recommendation is commit the intended files, drop the callback-JWT-in-prompt patch,
   and record the gateway-resume breakage as a known defect.
2. **Fix the three governance items before any second tenant**: YOLO posture, callback credential
   in model-visible content, Knowledge actor binding. Each is small and local.
3. **Retire the gateway lane** (its resume is broken and the ACP lane is mandated anyway) rather
   than paying to fix a road you have already left.
4. **Turn the approvals transport on** (`security.approval.transport: companai`) so the fail-closed
   path is the live path, then re-run the eval gate end-to-end on a real hire.
5. Only then resume the rooms work, against the measured constraint (one session per agent).

**What you must decide (rule 11 — these are yours, not mine):**

- Is this fork THE project, with `starting-kit` retired to a lab? My recommendation: yes.
- The YOLO/credential/actor rulings above — I recommend all three be fixed before exposure, but
  they are product-risk calls, and you may accept them for a single-tenant dev deployment.
- Whether the 3,446 deleted `konsult/` files stay quarantined (my recommendation: yes).
