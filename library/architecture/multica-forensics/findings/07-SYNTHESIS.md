# Batch 07 — The Synthesis

**Study:** Multica `0.2.0` · **Batch:** 07 of 07 · **Status:** COMPLETE
**Source:** `github.com/multica-ai/multica` → `platforms/_extracted/multica-main`
**Zip md5:** `30ddc64af536212e25a6c00db5672b82` · **License:** Apache-2.0 + Multica conditions

**Scope of this batch.** Batches 00–06 measured Multica from code. This batch does what a synthesis
must: state the platform's verdict in plain words, name the mechanisms worth carrying into the mapping
pass, state plainly what Multica does **not** give us, and answer the two value questions the method
requires. It is a *reading* of the six batches — no new claims about the source are introduced here, and
every claim restates a `file:line` already established in its originating batch.

**Method rules in force.** Code is the authority; docs are claims (rule 1). No comparison to our own
platform (rule 5) — this batch compares **batches to each other**, never Multica to `mercato`. Pole-tag
everything (rule 9). Name every capability, including the ones we will not use (rule 6). Answer the two
value questions (rule 4). Report the negatives. Correct earlier batches where later evidence demands it
(rule 13). Run the retirement rule (rule 10).

---

## 7.1 The measured page

Everything below was counted or read, not estimated.

| Quantity | Measured | Source batch |
|---|---|---|
| Zip md5 | `30ddc64af536212e25a6c00db5672b82` | 00 |
| Archive | **7,013 entries** (474 dirs + 6,539 files); **64,416,699 B** on disk; **no `.git`** | 00 |
| Version | `"version": "0.2.0"` (root `package.json`) | 00 |
| Backend (`server/`, Go) | **2,036 files / 801,066 lines** | 00 |
| Frontend packages (`packages/`) | 1,784 files / 402,307 lines | 00 |
| Apps (`apps/`) | 682 files / 97,262 lines (web · desktop · mobile · docs · ui-lab) | 00 |
| Migrations | **598 up-migrations** (1,196 files with downs) | 00 |
| Tables created | **144 unique** | 03 |
| Tables carrying `workspace_id` | **82 of 144** — the tenant fence | 03 |
| Migrations mentioning `agent` | **229**; of those, **25** touch the `agent` table | 02 |
| The `agent` table | **29 columns** | 02 |
| Provider adapters | **24 backend structs for 25 provider keys** | 02 |
| Failure taxonomy | **27 values** (13 platform-side + 14 `agent_error.*`) | 04 |
| Channel tables | **10 `channel_*`** generalized from Lark | 06 |
| Docs site | **225 `.mdx` = 45 pages × 5 languages** | 06 |
| Repo conventions | `AGENTS.md` — 127 lines / **12 sections** | 06 |
| Frontend split | shared ≈ **402k lines** vs apps ≈ **60k** (≈5:1) | 05 |
| **Findings written** | **75** (19 + 14 + 12 + 11 + 9 + 10 across batches 01–06) | all |
| Retirement entries | **17 distinct** removed objects recorded across batches 02–06 | all |

**➜ F7-1 [foundational] — This is a *product*, not a framework or a doc archive: ~1.3M measured lines of
Go + TypeScript, 144 tables over 598 migrations, and — the one number that changes the whole study —
`workspace_id` on 82 of 144 tables.** **Plain meaning:** unlike CrewAI (93 % documentation) and unlike
Paperclip (a task-runner), Multica is a running multi-surface product that already implements the three
poles. **Why it matters:** rule 1 had to bite hardest here, because a platform whose landing page
describes our own vision is the one most likely to be mistaken for the thing itself. Every finding below
was read from source.

---

## 7.2 The three poles, headlined

### Pole 1 — The aissistant

**Multica has both a stored teammate and the machine that runs it, and it separates them on purpose.**

The load-bearing shape is the **machine / teammate split** (`004_agent_runtime_loop.up.sql:1-18`):
`agent_runtime` is the machine (daemon, provider, `online`/`offline`, `UNIQUE (workspace_id, daemon_id,
provider)`), and `agent` is the teammate, bound by `agent.runtime_id NOT NULL … ON DELETE RESTRICT`
(`:70-73`). One runtime hosts many agents; neither can outlive the other.

Above it, the engine is a **single seam**: one `Backend` interface (`pkg/agent/agent.go:18-23`) with
**24 backend structs for 25 provider keys** (`qoder`/`qoderclicn` share one). The whitelist is closed and
its own comment lists every migration that widened it. A workspace may define a **custom runtime**
(`runtime_profile`, `120`) — but only on an officially-supported family, and with `fixed_args` only.

The teammate's configuration is **12 typed columns**, and three of them (model / thinking / service tier)
are stored **runtime-native, not neutralised** — the value the picker shows is the value the CLI accepts
(`050`, `095`, `212`). Its **permissions are deny-by-default** (`permission_mode` + a stacking
allow-list, `130`), and agent-to-agent calls are judged by the **human at the top of the chain**
(`agent_access.go:33-36`) — closing a real privacy hole where an admin could otherwise run someone's
private agent and use that owner's connections.

**Pole 1 verdict, plainly:** Multica supplies a complete answer to "what is an agent, what runs it, how
is it configured, and who may make it run" — a stored colleague, a swappable engine behind one interface,
and an explicit authorization model with its reason recorded in the migration.

### Pole 2 — The workspace

**The workspace is a real tenant root, and the fence is in the schema.**

Measured: **82 of 144 tables carry `workspace_id`** in their own `CREATE TABLE`. The other 62 are child or
join tables that inherit the tenant, or genuinely global rows (`user`, `personal_access_token`,
`maintenance_job`).

Inside it: three roles with the **last owner protected in three code paths**; invitations with a 7-day
expiry and a partial-unique "one pending" rule; a 32-column **issue** with a per-workspace human number,
a tree, barrier **stages**, **triage split off `status`**, a duplicate pointer, and **two custom-field
layers** (a free bag for machines, a typed catalog for people, keyed by definition UUID so renames never
rewrite data); **projects** whose lead may be a **member or an agent**; and **Git** as three layers (a
repo registry, a multi-workspace installation, an issue↔PR join).

**Pole 2 verdict, plainly:** the container is not a folder — it is a fenced tenant with members, work
items, projects, a code link, and a **per-workspace policy switch** (`attribution_fail_closed`) that can
refuse a run it cannot attribute to a human.

### Pole 3 — Automations

**This is the layer the study was told to look for, and it is real.**

The claim is **one SQL statement** (`pkg/db/queries/agent.sql:749-810`): `FOR UPDATE SKIP LOCKED`, a total
order (`priority DESC, created_at ASC, id ASC`), **per-work-item serialization** (so different agents
share an issue while one agent never double-runs), and the **runtime-health gate inside the claim**.

Around it: a **prepare lease** bounding the dispatched-but-never-started gap; attempt counters and a
per-task heartbeat; **four named sweepers**, one per way a task can die; a **row-as-lease scheduler**
(`sys_cron_executions`, `113`) where the row is both the distributed lock and the audit log, with lease
tokens and a **per-job catch-up decision**; **autopilot as data** (definition + triggers + runs, with a
concurrency policy and a per-trigger responsible publisher); and a **27-value failure taxonomy** where the
`agent_error.` prefix makes "whose fault is this?" a string operation.

**Pole 3 verdict, plainly:** work *arrives*. It is queued, claimed, leased, retried, swept and attributed
— and the platform assumes machines die at every step.

### PX-W / PX-F — Widgets and frontend

**A strong frontend architecture and no widget model at all.**

The frontend is **shared-first**: ~402k shared lines against ~60k app lines (≈5:1). It is held together by
a strict three-package layering whose rules are **prohibitions** (`AGENTS.md:11-24`) — `core` may not
touch a browser, `ui` may not import business logic, `views` may not name a framework — with the platform
differences collected into **named adapters** (`StorageAdapter`, `NavigationAdapter`, `useNavigation`,
`<AppLink>`).

The visual layer is a **role-named token system** whose comments carry its own history (51 ad-hoc font
sizes → 10 role-named steps; two colors pinned by WCAG measurement), plus **component contracts** that
also drive a tested **UI Lab** workbench.

**And the widget model is measured absent:** zero composers, and "widget" appears in only 13 code files,
all incidental.

**PX verdict, plainly:** the *architecture* is the transferable part; the *composition layer* is not here.

---

## 7.3 The ranked mechanisms — what to carry forward

Ranked by how much they would cost us to derive ourselves — value-first, not novelty-first.

1. **The machine / teammate split** [P1] — `agent_runtime` (the machine) and `agent` (the teammate) as two
   rows, bound `NOT NULL … ON DELETE RESTRICT` (`004:1-18`, `:70-73`). *The cleanest "one engine, many
   colleagues" primitive in the study.* (§2.2.1)
2. **The single-statement claim** [P3] — `FOR UPDATE SKIP LOCKED` + a total order + per-work-item
   serialization + the runtime-health gate, all in one `UPDATE` (`agent.sql:749-810`). (§4.2)
3. **The row-as-lease scheduler** [P3] — `sys_cron_executions` unifies the distributed lock and the audit
   log; no materialised stale state; lease tokens guard every live mutation (`113`). (§4.6)
4. **The deny-by-default invocation model** [P1] — `permission_mode` + a stacking allow-list, A2A judged
   by the top-of-chain human, with the privacy hole it closed recorded (`130`,
   `agent_access.go:73-133`). (§2.5)
5. **The failure taxonomy with a classifying prefix** [P3] — 27 values, 13 platform + 14 `agent_error.*`,
   with the renaming rule written down (`pkg/taskfailure/failure.go`). (§4.5)
6. **The strict frontend layering with named prohibitions + adapters** [PX-F] — `views → core + ui`, with
   `StorageAdapter` / `NavigationAdapter` as the only platform seams (`AGENTS.md:11-24`). (§5.2–§5.3)
7. **The role-named token system with its history attached** [PX-W] — and the two WCAG measurements that
   pin its quiet colors (`tokens.css:67-122`, `:187-206`). (§5.4)
8. **The non-inheriting binding pattern** [PZ/P1] — a workspace library plus an explicit per-agent binding
   with a toggle, used **twice** (skills, MCP servers; `008`, `315`). (§6.5)
9. **The two custom-field layers** [P2] — a free jsonb bag for machines (`105`) and a typed catalog keyed
   by definition UUID for people (`191`). (§3.3.4)
10. **The retirement ledger as a practice** [PZ] — 17 recorded removals, including **one migration that
    deletes 14 tables** because they never shipped (`344`). (§6.4)
11. **Write-path secret redaction** [PZ] — ordered rules, each comment naming the leak it closes
    (`pkg/redact`). (§6.2)
12. **The plugin contract + capability gate** [PZ] — three relations (Action/Hook/Resource) and a gate
    that *"fails installation loudly"* (`plugincontract`, `capabilities.go:8-40`). (§6.4)

**➜ F7-2 [synthesis] — The top three are all about *the seam between a machine and a colleague, and the
honest claim of work* — not about features.** **Plain meaning:** what Multica got most right is structural:
separate the engine from the teammate, claim work in one atomic statement, and make the scheduler's record
the same row as its lock. **Why it matters:** these are expensive to invent and cheap to adopt, and none
requires adopting Multica's product.

---

## 7.4 What Multica does NOT give us

Stated as plainly as the positives, because a study that only lists features is useless.

| Absent capability | Measured how | Batch |
|---|---|---|
| **A widget / composition model** | 0 composers; `widget` in 13 incidental code files | 05 |
| **An agent *runtime* of its own** | the engine is a *third-party CLI* behind `Backend`; Multica runs adapters, not a model loop | 02 |
| **A unified engine** | 24 backends, 25 keys, each provider its own adapter — no single execution model | 02 |
| **A shared `team` concept that is live** | the invocation `team` target is *"stored but NOT effective in V1"* (`130`) | 02 |
| **An event bus / streaming substrate of its own** | realtime exists (`internal/realtime`), but the delivery spine is a **table**, not a bus | 04 |
| **Per-datum commenting / annotation** | the nugget/annotation layer is not present; comments are on issues | 03 |
| **A "studio" / visual builder** | the agent builder is a chat draft (`252`), not a canvas | 02 |
| **Foreign keys on relationship tables** | a deliberate house rule: `agent_invocation_target`, `runtime_profile`, the `channel_*` tables all carry **none**; integrity is application-owned | 02, 03, 06 |

**➜ F7-3 [synthesis] — The absences cluster into one sentence: Multica has no *composition layer* and no
*engine of its own*.** **Plain meaning:** it is a workspace that drives other people's coding agents and
organises the work; it does not invent the agent runtime, and it does not let a user arrange the UI out of
parts. **Why it matters:** if the vision wants a widget surface or a self-owned engine, **those are ours
to build** — they cannot be sourced from this platform. The mapping pass should treat them as **build**,
not **adapt**.

---

## 7.5 The consistency check across batches

A synthesis must look for contradictions between its own inputs. Four were found and are recorded rather
than smoothed:

1. **Triage.** Batch 03 read `triage_state` as a current column. The migration (`483`) shows it was
   **moved off `status`** — a design correction *inside* the platform, not a contradiction in the study,
   and it is recorded as the reason the column exists.
2. **The plugin system.** Batch 01 saw `plugincontract` and `plugin_*` tables as a feature. Batch 06 read
   `344` and found **the V1 (14 tables) was deleted outright** and replaced by three. Both are true of
   different points in time; the correction stands, and it is the sharpest retirement in the study.
3. **The failure `Reason` line.** Batch 01's own self-review corrected a line number (`44`→`49`) before
   commit — a small, recorded fix rather than a silent edit (rule 13 in practice).
4. **The engine default.** Across the study the engine is always a *provider behind a seam*; no batch found
   a place where Multica runs a model loop itself. This is **consistent** across batches 01, 02 and 04, and
   it is why F7-3 names "no engine of its own" as an absence rather than a gap in reading.

**➜ F7-4 [synthesis] — No batch was falsified by a later batch; two were completed by one.** **Plain
meaning:** the study held together, and each correction made the picture larger. **Why it matters:** the 75
findings can be used as one body of evidence in the mapping pass, with the corrections applied.

---

## 7.6 The two value questions (rule 4)

The method requires each platform to be judged against two questions, kept separate.

### Q1 — What does this platform do for *its own users*?

**For a team that wants AI coding agents to show up on a board: a great deal, and it is the point of the
product.** You get a workspace where agents are colleagues you can see, assign to and share; a queue that
survives a laptop sleeping; a scheduler that runs periodic work exactly once across many servers; an
automation you configure rather than script; failures you can actually diagnose; and a frontend that works
the same on web and desktop. The divergences are almost non-existent here — the migrations and comments
*agree* with the code, and where a decision was reversed (the Composio gate, the plugin V1) the reversal
is recorded.

**Verdict on Q1:** as a *workspace where humans and AI agents work one board*, this is mature and
coherent, and it is unusually honest about its own history.

### Q2 — What does it do for *our vision*?

**A great deal on the poles, and nothing on the two things we would have to own.** Multica is the first
platform studied that is aimed at the same target: it has a real aissistant (a stored teammate + a machine
+ an authorization model), a real workspace (a fenced tenant with work items, projects and code), and a
real delivery layer (queue, lease, sweepers, scheduler, autopilot). What it does **not** have is a
**composition layer** (no widgets) and an **engine of its own** (it drives third-party CLIs). And its
closest-neighbour risk is real: because its stated purpose is ours, the temptation is to treat it as
"already done" — which the study resisted by reading the code and finding where it **stops**.

**Verdict on Q2:** Multica is a **rich architecture reference and a genuine mechanism source** for all
three poles — the strongest of the three platforms studied so far — and it is **silent** on the widget
surface and on a self-owned engine. Take the machine/teammate split, the claim, the row-as-lease
scheduler, the invocation model and the frontend layering; **build** the composition layer and the engine.

**➜ F7-5 [synthesis] — The two questions point the same way, which is unusual: excellent for its users,
and directly instructive for two of our three poles — while being explicitly empty on the third.**
**Plain meaning:** unlike the earlier platforms, this one is worth reading closely for *how* to structure
the workspace and the delivery layer. **Why it matters:** it tells the mapping pass where to spend its
attention — and where not to.

---

## 7.7 The finding index

Consolidated for the mapping pass. Format: `id · pole · one line · batch §`.

**Foundations** — F01-01 the machine/teammate split is real and tested [P1] 01 · F01-02 a stored `agent` +
`agent_runtime` + a per-provider adapter [P1] 01 · F01-03 … F01-19 (the platform overview: the queue, the
claim, the distributed cron, the autopilot, the failure taxonomy, the task-token fence, the Hermes lane).
*(Batch 01 wrote 19 findings; they are indexed in full in `01-platform-overview.md`.)*

**Pole 1 — the aissistant** — F02-01 machine/teammate split [P1] 02 §2.1 · F02-02 one `Backend` interface,
24 structs / 25 keys [P1] 02 §2.2 · F02-03 closed whitelist in Go + Postgres [P1] 02 §2.3 · F02-04
`runtime_profile` custom runtimes [P1] 02 §2.4 · F02-05 `BuiltinRuntime` descriptor [P1] 02 §2.5 ·
F02-06 the 12-column config, runtime-native values [P1] 02 §3 · F02-07 the catalog knows what it does not
know [P1] 02 §3.1 · F02-08 two kinds of skill [P1] 02 §4 · F02-09 deny-by-default invocation [P1] 02 §5 ·
F02-10 A2A judged by the top-of-chain human [P1] 02 §5.4 · F02-11 product-defined agents [P1] 02 §6 ·
F02-12 the lifecycle (status, archive, concurrency, builder draft) [P1] 02 §7 · F02-13 the agent-side
retirement ledger [PZ] 02 §8 · F02-14 "denied" kept apart from "unknown" [P1] 02 §5.5.

**Pole 2 — the workspace** — F03-01 the tenant fence (82/144) [P2] 03 §1 · F03-02 three roles +
invitations [P2] 03 §2 · F03-03 the last owner protected [P2] 03 §2.2 · F03-04 the invitation shape [P2]
03 §2.1 · F03-05 the per-workspace human number [P2] 03 §3.2 · F03-06 the 32-column issue + two
custom-field layers [P2] 03 §3 · F03-07 projects with a member-or-agent lead [P2] 03 §4 · F03-08 the three
Git layers [P2] 03 §5 · F03-09 `attribution_fail_closed` [P2] 03 §6 · F03-10 saved views with a privacy
bound [P2/PX-F] 03 §3.5 · F03-11 the workspace-side retirement ledger [PZ] 03 §7 · F03-12 a migration as
a bug post-mortem (`044`) [PZ] 03 §1.2.

**Pole 3 — automations** — F04-01 the one-statement claim [P3] 04 §2 · F04-02 leases + heartbeat [P3]
04 §3 · F04-03 four named sweepers [P3] 04 §4 · F04-04 the row-as-lease scheduler [P3] 04 §6 · F04-05
autopilot as data [P3] 04 §7 · F04-06 the 27-value failure taxonomy [P3] 04 §5 · F04-07 wakeups with a
revision fence [P3] 04 §8 · F04-08 the prepare lease [P3] 04 §3 · F04-09 `awakeclock` [P3] 04 §9 ·
F04-10 recovery as a bounded, measured walk [P3] 04 §9 · F04-11 the queue's retirement ledger (rebuilt
twice) [PZ] 04 §10.

**Widgets / frontend** — F05-01 the strict three-package layering [PX-F] 05 §2 · F05-02 the platform
adapters [PX-F] 05 §3 · F05-03 the role-named token system with its history [PX-W/PX-F] 05 §4 ·
F05-04 component contracts [PX-W] 05 §5 · F05-05 UI Lab [PX-W] 05 §6 · **F05-06 no widget model [PX-W]
05 §8** · F05-07 the state/API boundaries [PX-F] 05 §7 · F05-08 the deployed-client rule [PX-F] 05 §7 ·
F05-09 the shared:app ratio [PX-F] 05 §1.

**Out-of-pole** — F06-01 the layered security perimeter [PZ] 06 §1 · F06-02 write-path redaction [PZ]
06 §2 · F06-03 the three-relation plugin contract [PZ] 06 §4.2 · F06-04 the capability gate [PZ] 06 §4.2 ·
F06-05 the non-inheriting binding pattern, used twice [PZ] 06 §5 · F06-06 the cutover as a deployment
problem [PZ] 06 §6 · F06-07 first-party opt-out telemetry [PZ] 06 §7 · F06-08 conventions in the repo [PZ]
06 §8 · F06-09 enforcement separated from commercial policy [PZ] 06 §9 · F06-10 **the deleted subsystem**
[PZ] 06 §4.1.

**Synthesis** — F7-1 the measured page [—] §7.1 · F7-2 twelve mechanisms ranked [—] §7.3 · F7-3 the
absences cluster [—] §7.4 · F7-4 no falsifications, two completions [—] §7.5 · F7-5 the two questions
answered [—] §7.6.

**➜ F7-6 [synthesis] — 75 findings, five of them load-bearing: F02-01 (the machine/teammate split),
F04-01 (the one-statement claim), F04-04 (the row-as-lease scheduler), F02-09 (deny-by-default
invocation), F05-06 (no widget model).** **Plain meaning:** if the mapping pass reads only five lines,
these are the five. **Why it matters:** it gives the next stage a prioritised entry point instead of 75
flat rows.

---

## 7.8 The platform verdict, in one paragraph

**Multica `0.2.0` is a source-available, multi-surface product — a Go backend, a local daemon, and web,
desktop and mobile clients — for a workspace where humans and AI coding agents work one board, and it is
the closest thing to our own target that this workshop has studied.** Its architecture is genuinely
instructive: it separates the **machine** (`agent_runtime`) from the **teammate** (`agent`) with a
restricting foreign key; it runs any of **24 provider adapters behind one interface**; it claims work in a
**single atomic SQL statement** with per-work-item serialization and a health gate inside it; it makes the
**scheduler's record the same row as its distributed lease**; it classifies **every failure** into a
27-value taxonomy with a prefix that turns "whose fault" into a string operation; it fences **82 of its 144
tables** by workspace and governs invocation **deny-by-default** with agent-to-agent calls judged by the
human at the top; and it keeps its frontend **shared-first** (~5:1) behind named platform adapters with a
role-named token system whose comments record the mistakes it fixed. Its migrations and comments are
unusually honest — they record what was reversed (the Composio gate), what was rebuilt twice (the
chat-pending marker), and what was **deleted outright** (a 14-table plugin V1 that never shipped). Where it
stops is equally clear: it has **no composition layer** (no widget model exists at all) and **no engine of
its own** (it drives third-party CLIs). The correct posture toward it is therefore **both an architecture
reference and a mechanism source for the three poles** — and **build**, not adapt, for the widget surface
and any self-owned engine.

---

## 7.9 Batch 07 — checklist

- [x] Read from source only; no new source claims introduced (all restate verified findings).
- [x] Every finding carries its originating batch and section.
- [x] No comparison to our own platform (rule 5) — internal batch-to-batch consistency only (§7.5).
- [x] Both value questions answered separately (rule 4, §7.6).
- [x] Absences reported as findings, not omitted (rule 6, §7.4).
- [x] Four cross-batch consistencies recorded, none smoothed (rule 13, §7.5).
- [x] Retirement rule honoured: no earlier finding deleted to fit the synthesis (rule 10).
- [x] 6 synthesis findings: F7-1…F7-6, plus the complete finding index (§7.7).

The Multica study is complete: **pin (00) + 75 findings across six pole batches (01–06) + this synthesis
(07).** The reader is built from this markdown, at the end, with the platform-agnostic generator — and no
study markdown is edited to fit it.
