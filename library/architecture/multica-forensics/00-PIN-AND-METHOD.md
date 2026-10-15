# Multica Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/multica-forensics/` · **Status:** OPEN — begun 2026-10-15
**This is a clean forensic study**, run the same way as `library/hermes-forensics/`,
`library/architecture/paperclip-forensics/` and `library/architecture/crewai-forensics/`. It reads ONE source
tree, measures it, and verifies every load-bearing claim against the source code. **Nothing from any earlier
study is reused, referenced, or assumed** — Multica is read on its own terms.

**Why this platform is third.** The owner's ruling was *"one platform at a time"*: Paperclip first
(`9ae258f`/`97b4dfc`/`2bef78d`/`f1e5dea`), **CrewAI second** (`dcd4675`→`d81c86e`), **Multica third**. The
first two sat at opposite ends of one question — Paperclip is a company/task-runner, CrewAI is an agent
framework. **Multica is the first platform studied that appears to be aimed at the same target we are**: it
describes itself as a **workspace where humans and AI agents work on one board**, with agents as first-class
teammates, runtimes, runs, squads, workspaces and roles. That makes it the sharpest candidate yet — and the
most dangerous one to read casually, because *similarity invites the assumption that it is already the thing
we want*. Per the method, **the code decides, not the landing page.**

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:**
`C:/Users/Ramzi/Downloads/companai/library/architecture/platforms/_extracted/multica-main`
(extracted from `platforms/multica-main.zip`, which came from
`https://github.com/multica-ai/multica`).

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/multica-ai/multica` (`main`) | the owner's `platforms/references.md` |
| Zip | `platforms/multica-main.zip` — **25,102,497 B** (23.9 MB) | `ls -la` |
| **Zip md5** | **`30ddc64af536212e25a6c00db5672b82`** | `md5sum` |
| Zip entry count | **7,013 entries = 474 dirs + 6,539 files** | Python `zipfile` |
| Extracted | 2026-10-15, **17:53** (all files share this mtime) | `ls` |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| Total files on disk | **6,539** | Python `os.walk` (excl. `node_modules`) |
| Total bytes on disk | **64,416,699** (61.4 MB) | Python `os.walk` |
| Declared version | **`"version": "0.2.0"`** (root `package.json`) | `package.json` |
| Product | **Multica** by Multica; licence **Apache-2.0 + additional conditions** ("Multica License") | `LICENSE`, `README.md` |
| Runtime (web/server) | **Node ≥22 · pnpm 10.28.2 · Go ≥1.26.9 · Docker** | `package.json` `engines`, `README.md` |
| Backend language | **Go** (Chi router, sqlc, gorilla/websocket) | `README.md` "Architecture" |
| Database | **PostgreSQL 17** (`pgcrypto` + `pg_trgm`) | `README.md` |
| Frontend | **Next.js 16 (App Router)** + Electron desktop + Expo mobile | `README.md` |
| Key md5s | `package.json` `650b1eb149f9fe21571a3e9ea97c2940` · `pnpm-workspace.yaml` `b76c5f981d93363f3e27e8b992d3ca74` · `server/go.mod` `226d873abc6f772e8428676125088d1d` · `README.md` `17be34e077708cc46e115d12a362601f` · `VISION.md` `31ad9091ea3adb4ca8181862ba4840a4` · `LICENSE` `6fe680e18c49114732b5443cbac6ac28` · `AGENTS.md` `5673f41b41e63ba12526b1426da1986d` · `turbo.json` `17ccd53fff5a8eb57448b94db85619ed` · `Makefile` `2d7c4ac1c68b6c825c43aaeee1c55d31` | `md5` |
| Product one-liner | *"Agents that show up on the board."* — *"a source-available workspace where you assign work to AI coding agents the way you'd assign it to a teammate"* | `README.md` |
| Vision one-liner | *"Make humans and AI agents work as one team."* — *"become the system of record and action for human-agent work."* | `VISION.md` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. Unlike CrewAI (which
carried `1.15.28` and a matching docs tree), Multica carries **`0.2.0`** — a young version number on a very
large tree (see §2), which is itself a signal to interpret carefully: the `package.json` version describes the
*frontend workspace*, and the product is **released "most weekdays"** per the README, so `main` is a fast-moving
snapshot. **The identity we can assert is: source of Multica, version string `0.2.0`, extracted 2026-10-15
17:53, zip md5 `30ddc64af536212e25a6c00db5672b82`.** A reader reproducing this study must match those. **Any
claim here about "the latest Multica" is a claim about this extract.**

**Date clue:** the docs content is monorepo-versioned (no per-release doc trees like CrewAI), so the strongest
anchor is the zip md5 plus the extracted date. Where a batch needs to know "is this current", it says so
explicitly rather than assuming.

---

## 2. What the tree contains (measured) — and the ONE thing that changes this study's shape

### 2.1 This tree is CODE — a real product, not a framework, and not a doc archive

Measured by extension over the whole tree (excl. `node_modules`):

| Extension | Files | Bytes | What it is |
|---|---:|---:|---|
| **`.go`** | **2,036** | **30,422,769** | **the backend — the largest single surface** |
| `.ts` | 1,292 | 7,620,683 | shared packages + apps + e2e |
| **`.tsx`** | **1,208** | **11,305,345** | **the React UI (web + desktop + views)** |
| **`.sql`** | **1,262** | **1,550,749** | **1196 migration files** (up/down) + queries |
| `.mdx` | 229 | 2,207,357 | the docs site (5 languages) |
| `.json` | 200 | 2,045,197 | manifests, configs, fixtures |
| `.webp` | 67 | 4,146,362 | doc screenshots |
| `.md` | 52 | 549,051 | root + engineering docs |
| everything else | ~1,193 | — | images, shell, CSS, YAML, lockfiles |

**The opposite hazard from CrewAI.** CrewAI was **93% documentation**; a study that read its docs would read
the same claim 45 times. Multica is **code-dominant**: ~5,000 code files across Go, TypeScript, TSX and SQL.
**The docs here are small enough to be readable in full — which is exactly why rule 1 must bite hardest here:
a platform whose landing page describes OUR vision is the one most likely to have us mistake the pitch for the
implementation.** Every finding is read from source; the README/VISION are treated as *claims by the seller*.

### 2.2 The measured shape (per area)

| Area | Files | Lines | Bytes | What it is |
|---|---:|---:|---:|---|
| **`server/` (Go)** | **2,036** | **801,066** | 30,422,769 | the backend: API, daemon, scheduler, dispatch, integrations |
| **`packages/` (TS/TSX)** | **1,784** | **402,307** | 14,839,502 | `core` (headless logic + API client), `ui`, `views`, `plugin-sdk` |
| `apps/` (TS/TSX) | 682 | 97,262 | 3,903,890 | `web` (Next.js), `desktop` (Electron), `mobile` (Expo), `docs` |
| `server/migrations` (SQL) | 1,196 | 15,534 | 783,046 | the schema history — **the durable truth of the data model** |
| `apps/docs` content (MDX) | 225 | 30,942 | 2,176,494 | the docs site, 5 languages (`en`, `zh`, `ja`, `ko`, `fr`) |
| `e2e/` (TS) | 31 | 4,457 | 180,511 | Playwright end-to-end tests |
| `scripts/` | 31 | 6,507 | 241,024 | build/CI/install scripts |

**This is the largest *implementation* of the three studies so far.** Paperclip was ~1M lines TS across a
product; CrewAI was ~493k lines Python in a framework; **Multica is ~1.3M measured lines across Go + TS/TSX in
a running multi-surface product** (Go 801k + packages 402k + apps 97k ≈ 1.30M).

### 2.3 The Go backend module map (measured — the object of batches 01, 03, 04, 06)

`server/internal/` (the private app) — directories that map onto our poles:

```
agentconfig/ analytics/ attribution/ attributionbackfill/ auth/ channelmedia/ chatoriginbackfill/
chattitle/ cli/ cloudruntime/ daemon/ daemonws/ database/ dbreader/ dbstartup/ delegatedrecoverybackfill/
dispatch/ entitlement/ events/ featureflags/ handler/ inbox/ integrations/ issueactivitybackfill/
issueguard/ issueposition/ issueproperty/ issuestatus/ logger/ maintenance/ metrics/ middleware/
migrations/ profiling/ realtime/ runtimeapps/ scheduler/ seatcapacity/ selfexec/ selfhosttelemetry/
service/ skill/ storage/ taskusagebackfill/ testutil/ util/
```

`server/pkg/` (importable):

```
agent/ awakeclock/ composio/ db/ dbid/ eventcontract/ featureflag/ llm/ plugincontract/
protocol/ publicapi/ redact/ remotemcp/ skillbundle/ taskfailure/
```

`server/cmd/` (binaries):

```
multica/ server/ migrate/ maintenance/ backfill_codex_usage_cache/ backfill_delegated_failure_settled/
backfill_issue_last_activity/ backfill_task_usage_hourly/
```

**The names alone are findings to verify, not conclusions:** `scheduler/` (a real clock — CrewAI had none),
`dispatch/` (a delivery layer), `awakeclock/`, `delegatedrecoverybackfill/` (durable recovery of delegated
work), `seatcapacity/` + `entitlement/` (licensing/seats), `issueguard/`, and `plugincontract/` + `remotemcp/`
(the extension seam). Several of these are exactly the capabilities CrewAI was measured to lack.

### 2.4 The agent-runtime surface — the part most relevant to Hermes

`server/pkg/agent/` holds **one Go file per provider**, plus shared machinery:

```
agent.go  builtin_runtimes.go  models.go  launch.go  version.go  run_collect.go  stream_json_result.go
acp_session.go  acp_terminal.go  acp_usage.go  acp_effort.go  acp_deliverable.go   ← ACP support
claude.go  codex.go  cursor.go  copilot.go  devEco.go  dim.go  dsh.go  grok.go  hermes.go  kimi.go
kiro.go  mcode.go  openclaw.go  opencode.go  opencode_v2.go  pi.go  qoder.go  qwen.go  qwenpaw.go
reasonix.go  traecli.go  zeroclaw.go  antigravity.go  codearts.go  codebuddy.go  omp_session.go
```

`server/internal/daemon/` is the local execution plane:

```
daemon.go  execenv/  processtree/  repocache/  reconcile.go  wakeup.go  wsrpc.go  health.go  gc.go
runtime_mcp.go  remote_mcp_broker.go  plugin_hook_mcp.go  skill_cache.go  local_skills.go
prompt.go  identity.go  diskusage.go  task_phase_timing.go  task_supplement.go  agents_probe.go
```

**Two things are already visible and must be verified, not assumed:** (a) Multica ships a **`hermes.go`
provider adapter** and **ACP** (`acp_session.go`) — the same lane our own project mandates; (b) the daemon is
a **real local execution plane** with its own process tree, repo cache, wake/reconcile loop and MCP wiring.
Both belong in the pole batches, read from code.

> **Hypothesis for batch 01, not a finding:** Multica's `pkg/agent/*.go` may be the *direct analogue* of the
> "engine-as-an-adapter" seam our project built for Hermes. If so, it is the single most transferable idea in
> this tree. Per rule 0b, batch 01 measures first.

### 2.5 Agent-facing assets

`AGENTS.md` (12,811 B) is present at the root, plus `CLAUDE.md` (11 B — a pointer), plus per-app
`apps/mobile/AGENTS.md`. **`AGENTS.md` states binding rules for AI coding agents working in the repo** —
package boundaries (`views → core + ui`), state rules (TanStack Query vs Zustand), **database rules that forbid
foreign keys and cascading deletes**, concurrent-index migration rules, and UUID-source rules. This is the same
posture Paperclip and CrewAI had (built to be worked on by agents) and is **itself a finding** — it belongs in
**PZ**, and §3 of it (the DB rules) is exactly the kind of hard-won convention our own project keeps relearning
(cf. rule 9a, rule 10d).

### 2.6 What is NOT here (named now, to guard the reading)

- **No `.git`** — identity is the zip (§1.1).
- **No per-release doc trees** (unlike CrewAI's 45 × 4) — the docs are monorepo-versioned; they are a *small*
  surface and can be read whole, but are still *claims*.
- The `mobile/` app is excluded from root `build`/`typecheck`/`test` scripts (`--filter=!@multica/mobile`) — a
  later batch must not assume mobile is covered by the root gates.
- `node_modules` is absent (correct); `go.sum`/`pnpm-lock.yaml` are present, so dependency identity is
  readable.

---

## 3. The method (how every batch is produced)

The method is **inherited verbatim** from the Hermes, Paperclip and CrewAI studies (rules 1–10), with the pole
frame (§3.1) and the additive-across-studies rule (§3.2) as before.

1. **Docs are claims; code is the authority.** *Here the docs are small and persuasive — the README describes
   our own vision back to us. That is precisely when rule 1 matters most.* Every load-bearing statement is
   checked against the source. Where they disagree, **the code wins and the disagreement is recorded.**
2. **Every number is measured at the time of writing**, never carried from memory or an older document.
3. **Claims carry their evidence**: a line resting on code cites the file and line it was read at.
4. **Two value questions per capability**: **Q1 · USER VALUE** (how it serves a person using the platform) and
   **Q2 · VISION VALUE** (how it serves the AI-first business & resources planner vision, incl. versatility and
   integratability).
5. **No comparison to our own platform inside the batches.** The cross-platform mapping is a separate later
   pass.
6. **Every capability is named, including ones we will not use.** Nothing is silently dropped.
7. **Findings are additive and never overwrite history.**
8. **Plain words** — every capability gets a one-sentence plain gloss before any detail.
9. **THE POLE FRAME.** Every finding is tagged **P1 / P2 / P3 / PX-W / PX-F / PZ**.
10. **The retirement rule (C13-14).** Before reusing any setting/key/module named in an older document or
    another platform's doc, **search that platform's migrations/config for a retirement entry.** With 1,196
    migration files, Multica is the richest retirement surface studied so far — **a silently-removed feature is
    the most valuable kind of finding, and here it is findable.**

### 3.1 The pole frame — the three poles, defined once

| Tag | Pole | The owner's words (abridged) |
|---|---|---|
| **P1** | **The aissistant** (the AI user / agent) | *versatile, integratable, rich featured architecture in itself, deployable in different contexts (workspaces, automations, later the studio)* |
| **P2** | **The workspace** | *highly functional, versatile, integratable, rich featured, adaptable to the mix of current and future features, use-cases and needs* |
| **P3** | **Automations** | *where agents work on assigned tasks, assign tasks, etc. Paperclip is a blueprint* |
| **PX-W** | **Widgets architecture** | cross-cutting: the composable UI surface |
| **PX-F** | **Frontend wiring & construction** | cross-cutting: how the surface is built and wired |

**Plus one escape hatch (PZ):** *"any other findings you identify there that can fit our vision, project,
architecture, or a potential use case or added value for the end user."* Tagged **PZ** with a one-line reason
for keeping them.

### 3.2 Additive across studies, like rule 7 within a study

This study does not rewrite the Hermes, Paperclip or CrewAI studies. Where a Multica finding **confirms,
contradicts or extends** an earlier finding, it is recorded as a cross-study note naming the earlier batch — so
a reader can trace both directions. Cross-study notes are **observations**, never decisions.

---

## 4. The batch plan (each documented as it is completed)

Findings are organised **per pole**, one file per pole, plus an overview and a synthesis. Multica is a
**multi-surface product** (Go server + daemon + web/desktop/mobile), so the pole weighting will differ from
both earlier studies — but the structure is identical so the later mapping is a per-pole join.

| # | Batch / File | Pole | What it answers |
|---|---|---|---|
| **00** | **This file** — pin and method | — | task zero + method + pole frame |
| **01** | `findings/01-platform-overview.md` | — | What is Multica? the workspace/issue/agent/run model, the Go backend, the daemon, the control plane |
| **02** | `findings/02-the-aissistant.md` | **P1** | what an "agent" is here: provider + runtime + config, skills, permissions/access scopes, the agent record |
| **03** | `findings/03-the-workspace.md` | **P2** | workspaces, members/roles, projects, repos/Git, issues, the data model (from migrations) |
| **04** | `findings/04-automations.md` | **P3** | the scheduler, dispatch, autopilots, runs, retries, wakeups, delegated recovery — the delivery layer |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** | the UI: `packages/ui` + `packages/views`, token discipline, the desktop/mobile surfaces, the widget model |
| **06** | `findings/06-out-of-pole.md` | **PZ** | everything else that fits our vision (security model, tenancy, telemetry, plugins, MCP, channels, docs practice) |
| **07** | `findings/07-SYNTHESIS.md` | all | what Multica teaches each pole; ranking; the bridge to Hermes/Paperclip/CrewAI is a LATER pass |

**Each batch document carries:** (a) what was read and its measured size; (b) a **capability table tagged by
pole** with **Q1 · Q2**; (c) the code verification with `file:line` evidence and any **doc-vs-code divergence**;
(d) findings carried forward.

> **A note on the pole weighting, stated up front.** Multica is the first platform studied whose *stated purpose*
> is the same as ours, so the temptation to score it as "already done" is highest here. The batches answer the
> **three value questions in the opposite direction too**: not only "does it fit our poles" but **"where does it
> draw its boundaries, and are they ours?"** — because a close neighbour is the hardest to reuse and the easiest
> to copy badly. That question is answered in the batch notes and ranked in batch 07, never assumed.

---

## 5. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → **code, always** — and because Multica's docs describe our own
  vision back to us, this is enforced *hardest* here.
- If doc and code disagree, is the disagreement recorded? → must be.
- Is every capability named, including the ones we will not use? → must be.
- Is every finding **tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ)? → must be.
- Are the two value questions answered in the owner's words? → yes, per capability.
- Is there any comparison to our own platform in a batch? → must be none; that is the later mapping pass.
- Before reusing an older-doc setting, was the retirement rule run (rule 10)? → must be — and with 1,196
  migrations, this is checked hard.

---

## 6. How this study relates to the workshop folder

```
library/architecture/
├── hermes-forensics/          # the Hermes study (mirror; gitignored copy)
├── paperclip-forensics/       # the Paperclip study (CLOSED 7/7) + reader/
├── crewai-forensics/          # the CrewAI study (CLOSED 7/7) + reader/
├── multica-forensics/         # THIS study
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/              # 01..07
├── reader/                    # the Hermes reader (user-facing HTML)
└── platforms/
    ├── *.zip                  # the raw platform archives (gitignored)
    ├── references.md          # repo link per platform
    └── _extracted/            # working trees (gitignored) — multica-main here
```

**Per-platform reader:** a reader for Multica is built at the **end** of this study, from its markdown, using
the platform-agnostic generator proven for Paperclip and CrewAI (`generate-reader.js` + a `DOCS_CONFIG` block +
a `diagrams.js`). **The markdown is the source of truth; the reader renders it and never edits it.**

---

*Batch 00 of 07. Begun 2026-10-15. Next: `findings/01-platform-overview.md`.*
