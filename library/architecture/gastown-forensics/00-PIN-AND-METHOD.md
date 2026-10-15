# Gas Town Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/gastown-forensics/` · **Status:** OPEN — begun 2026-10-15
**This is a clean forensic study**, run the same way as `library/hermes-forensics/`,
`library/architecture/paperclip-forensics/`, `library/architecture/crewai-forensics/` and
`library/architecture/multica-forensics/`. It reads ONE source tree, measures it, and verifies every
load-bearing claim against the source code. **Nothing from any earlier study is reused, referenced, or
assumed** — Gas Town is read on its own terms.

**Why this platform is fourth.** The owner's ruling was *"one platform at a time"*: Paperclip
(`9ae258f`→`f1e5dea`), **CrewAI second** (`dcd4675`→`d81c86e`), **Multica third** (`20dc339`→`4cdac9c`),
**Gas Town fourth**. The first three sat at three different points: Paperclip is a company/task-runner,
CrewAI is an agent framework, and Multica is a workspace where humans and agents work one board. **Gas
Town is the first platform studied that is explicitly a *multi-agent orchestration workspace* — it
coordinates many agents (Claude Code, Copilot, Codex, Gemini) across projects with persistent,
git-backed work tracking and a role taxonomy.** That makes it the sharpest test yet of the three poles,
and the most dangerous to read casually, because *similarity invites the assumption that it is already
the thing we want*. Per the method, **the code decides, not the README.**

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:**
`C:/Users/Ramzi/Downloads/companai/library/architecture/platforms/_extracted/gastown-main`
(extracted from `platforms/gastown-main.zip`, which came from
`https://github.com/gastownhall/gastown`).

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/gastownhall/gastown` (`main`) | the owner's `platforms/references.md` |
| **Go module path** | **`github.com/steveyegge/gastown`** | `go.mod:1` |
| Zip | `platforms/gastown-main.zip` — **5,829,083 B** (5.56 MB) | `ls -la` |
| **Zip md5** | **`f2485c1baa647967a31a878224a09503`** | `md5sum` |
| Zip entries | **1,737 = 174 directories + 1,563 files** | `unzip -l` + a walk |
| Extracted | 2026-10-15 (all files share the zip's mtimes) | `ls` |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| Total files on disk | **1,563** | Python `os.walk` |
| Total bytes on disk | **23,491,369** (22.4 MB) | Python `os.walk` |
| Declared version | **npm `@gastown/gt` `1.2.1`** (`npm-package/package.json`) | `package.json` |
| Go version | **`go 1.26.2`** | `go.mod:3` |
| Language | **Go** — 1,231 files / 474,724 lines | walk + line count |
| Product one-liner | *"Multi-agent orchestration system for Claude Code, GitHub Copilot, and other AI agents with persistent work tracking"* | `README.md:3` |
| Vision one-liner | *"an agentic development environment for managing multiple Claude Code instances simultaneously using the `gt` and `bd` (Beads) binaries, coordinated with tmux in git-managed directories"* | `docs/glossary.md:3` |
| Key md5s | `README.md` `ebe2ed3a…` · `go.mod` `7c4cb38d…` · `go.sum` `c2035ac4…` · `AGENTS.md` `3b36f0a8…` · `CHANGELOG.md` `d79212dd…` · `LICENSE` `a516aaa0…` · `npm-package/package.json` `cde1a196…` · `.beads/config.yaml` `e84c66fc…` | `md5sum` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. Two identities must
be kept apart, and the difference is itself a finding to verify:

- **The repository is `gastownhall/gastown`** (the owner's `references.md`).
- **The Go module is `github.com/steveyegge/gastown`** (`go.mod:1`).

So the project has moved or been re-homed between an author's namespace and an organisation's, and the
module path was **not** rewritten to match. A reader reproducing this study must match the zip md5, not
a commit. **Any claim here about "the latest Gas Town" is a claim about this extract.**

**Version clue:** the npm wrapper carries a real semver (`1.2.1`) and `CHANGELOG.md` follows *Keep a
Changelog*; the changelog's top entry is `## [Unreleased]`. Where a batch needs to know "is this
current", it says so explicitly rather than assuming.

---

## 2. What the tree contains (measured)

### 2.1 This tree is CODE — a Go product with a real doc set

Measured by extension over the whole tree:

| Extension | Files | Lines | Bytes | What it is |
|---|---:|---:|---:|---|
| **`.go`** | **1,231** | **474,724** | 14,602,075 | **the product — the overwhelming majority** |
| `.md` | 117 | 33,189 | 1,307,528 | docs + templates + agent instructions |
| `.toml` | 57 | — | 688,113 | formulas / config |
| `.jsonl` | 6 | — | **4,979,661** | **large data files — the largest single byte block after Go** |
| `.json` | 26 | 17,074 | 789,676 | manifests, configs, fixtures |
| `.sh` | 38 | 7,391 | 251,793 | scripts |
| `.yaml` / `.yml` | 30 | 4,795 | 178,141 | config |
| `.js` | 6 | 3,838 | 152,142 | the npm wrapper |
| `.tmpl` | 13 | — | 121,597 | templates |
| `.py` | 4 | 1,211 | 42,260 | tooling |

**The hazard here is neither CrewAI's (93 % docs) nor Multica's (code-dominant with persuasive docs).**
Gas Town is **a Go product whose docs are a real but modest surface (~24.6k lines in `docs/`)**, and it
carries a **few very large `.jsonl` data files** (~5 MB, 21 % of all bytes) that a line-count reading
would miss entirely. **Rule 1 applies as always: the README is a claim; the `.go` tree is the authority.**

### 2.2 The measured shape (per area)

| Area | Files (go/md/js) | Lines | Bytes | What it is |
|---|---:|---:|---:|---|
| **`internal/`** | **1,235** | **477,544** | 14,724,333 | **the product — 60+ packages** |
| `docs/` | 68 | 24,592 | 991,181 | the concept, design and guide set |
| `plugins/` | 15 | 3,220 | 97,518 | 10 plugin directories |
| `templates/` | 2 | 483 | 15,514 | agent instruction templates |
| `cmd/` | 6 | 697 | 23,029 | **three binaries** |
| `gt-model-eval/` | 2 | 252 | 11,173 | a model-evaluation harness |
| `npm-package/` | 4 | 365 | 9,924 | the `@gastown/gt` npm wrapper |
| `pr-sheriff-evidence/` | 1 | 26 | 2,150 | evidence for the PR-sheriff feature |

**The ratio is the finding.** `cmd/` is **6 files / 697 lines** for three binaries — the CLI entry is a
thin shell, and essentially everything lives in `internal/`. This is the opposite of a "CLI with a
library"; it is a product whose binaries are almost entirely `internal/`.

### 2.3 The Go module map (measured — the object of batches 01–06)

**1,231 `.go` files across 77 package directories, of which 568 are `_test.go`** — i.e. **46 % of all Go
files are tests.** That is the highest test ratio of any platform studied so far and must be stated up
front, because a naive "lines of Go" reading is half test code.

`cmd/` holds **three binaries**: `gt` (the main CLI), `gt-proxy-client`, `gt-proxy-server`.

`internal/` holds 60+ packages, and **the names are the vocabulary of the product** (verify each, do not
assume): `acp` · `activity` · `agent` · `agentlog` · `beads` · `bitbucket` · `boot` · `channelevents` ·
`checkpoint` · `cli` · `cmd` · `config` · `connection` · `convoy` · `crew` · `daemon` · `deacon` · `deps` ·
`doctor` · `dog` · `doltserver` · `estop` · `events` · `feed` · `formula` · `git` · `github` · `health` ·
`hooks` · `hookutil` · `keepalive` · `krc` · `lock` · `mail` · `mayor` · `mq` · `nudge` · `plugin` ·
`polecat` · `protocol` · `proxy` · `quota` · `reaper` · `refinery` · `rig` · `runtime` · `scheduler` ·
`session` · `shell` · `state` · `style` · `suggest` · `telemetry` · `templates` · `testutil` · `tmux` ·
`townlog` · `tui`.

### 2.4 The role taxonomy — the part most relevant to all three poles

`docs/glossary.md` and `docs/overview.md` describe a **role taxonomy**, and these are *claims to verify
in code*, not conclusions. The names, as the docs state them:

- **Town** (`~/gt/`) — the management headquarters; **Rig** — a project repo under management.
- **Town-level:** **Mayor** (chief-of-staff coordinator), **Deacon** (a watchdog running patrol cycles),
  **Dogs** (the Deacon's maintenance crew), **Boot** (a Dog that checks the Deacon every 5 minutes).
- **Rig-level:** **Polecat** (*"persistent identity but ephemeral sessions"*, working in isolated git
  worktrees), **Refinery** (the merge queue), **Witness** (a patrol agent over Polecats), **Crew**
  (long-lived named agents).
- **Work units:** **Bead** (*"git-backed atomic work unit stored in Dolt"*), **Formula** (a TOML
  workflow template), and a decomposition vocabulary around **MEOW** (*Molecular Expression of Work*).
- **Stated principles:** **GUPP** (*"If there is work on your Hook, YOU MUST RUN IT"*), **NDI**
  (*Nondeterministic Idempotence*).

**Two things are already visible and must be verified, not assumed:** (a) Gas Town ships **an `acp`
package** and a **`tmux` package** — the same agent-protocol lane our project mandates, driven through
tmux sessions; (b) there is **a `mail` package** and **a `convoy` package** — i.e. named hand-off and
batching primitives. Both belong in the pole batches, read from code.

> **Hypothesis for batch 01, not a finding:** Gas Town's role taxonomy (Mayor/Deacon/Dog/Boot) may be the
> *direct analogue* of the "watchdog + recovery" idea our own delivery layer needs, and its Polecat
> (*persistent identity, ephemeral session*) may be the sharpest expression of the machine/teammate split
> found in Multica. Per rule 0b, batch 01 measures first.

### 2.5 Agent-facing assets and the external ledger

- **`AGENTS.md` (185 lines) is a pointer**, not the context: it says *"See `CLAUDE.md` for complete agent
  context"* and *"Full context is injected by `gt prime` at session start"*, then carries a
  **Beads Workflow Integration** section. So the repo's agent instructions are **generated/injected by the
  product itself**, not hand-written into the file — a posture worth verifying.
- **`.beads/`** (config + `PRIME.md` + `README.md`) declares the issue tracker: **Beads**, an external
  project (`github.com/steveyegge/beads`) with two CLIs — **`bd`** (issue CRUD) and **`bv`** (read-only
  graph triage) — storing issues as **`.beads/issues.jsonl`**, synced like code.
- **`templates/`** holds `agents/`, `polecat-CLAUDE.md`, `witness-CLAUDE.md` — the per-role instruction
  templates.

### 2.6 What is NOT here (named now, to guard the reading)

- **No `.git`** — identity is the zip (§1.1).
- **No `node_modules`** (correct); `go.sum` is present, so dependency identity is readable.
- **The repository name and the module path disagree** (§1.1) — a later batch must not treat either as
  the other.
- **`docs/` is a real surface (~24.6k lines)** and will be readable — which is exactly why rule 1 must
  bite: a well-written doc set is a claim set, not evidence.

---

## 3. The method (how every batch is produced)

The method is **inherited verbatim** from the Hermes, Paperclip, CrewAI and Multica studies (rules 1–10),
with the pole frame (§3.1) and the additive-across-studies rule (§3.2) as before.

1. **Docs are claims; code is the authority.** Every load-bearing statement is checked against the
   source. Where they disagree, **the code wins and the disagreement is recorded.**
2. **Every number is measured at the time of writing**, never carried from memory or an older document.
3. **Claims carry their evidence**: a line resting on code cites the file and line it was read at.
4. **Two value questions per capability**: **Q1 · USER VALUE** (how it serves a person using the platform)
   and **Q2 · VISION VALUE** (how it serves the AI-first business & resources planner vision, incl.
   versatility and integratability).
5. **No comparison to our own platform inside the batches.** The cross-platform mapping is a separate
   later pass.
6. **Every capability is named, including ones we will not use.** Nothing is silently dropped.
7. **Findings are additive and never overwrite history.**
8. **Plain words** — every capability gets a one-sentence plain gloss before any detail.
9. **THE POLE FRAME.** Every finding is tagged **P1 / P2 / P3 / PX-W / PX-F / PZ**.
10. **The retirement rule.** Before reusing any setting/key/module named in an older document or another
    platform's doc, **search this platform's migrations/config/CHANGELOG for a retirement entry.** With a
    Keep-a-Changelog history and a git-backed ledger, Gas Town is a rich retirement surface.

### 3.1 The pole frame — the three poles, defined once

| Tag | Pole | The owner's words (abridged) |
|---|---|---|
| **P1** | **The aissistant** (the AI user / agent) | *versatile, integratable, rich featured architecture in itself, deployable in different contexts (workspaces, automations, later the studio)* |
| **P2** | **The workspace** | *highly functional, versatile, integratable, rich featured, adaptable to the mix of current and future features, use-cases and needs* |
| **P3** | **Automations** | *where agents work on assigned tasks, assign tasks, etc. Paperclip is a blueprint* |
| **PX-W** | **Widgets architecture** | cross-cutting: the composable UI surface |
| **PX-F** | **Frontend wiring & construction** | cross-cutting: how the surface is built and wired |

**Plus one escape hatch (PZ):** *"any other findings you identify there that can fit our vision, project,
architecture, or a potential use case or added value for the end user."* Tagged **PZ** with a one-line
reason for keeping them.

### 3.2 Additive across studies, like rule 7 within a study

This study does not rewrite the Hermes, Paperclip, CrewAI or Multica studies. Where a Gas Town finding
**confirms, contradicts or extends** an earlier finding, it is recorded as a cross-study note naming the
earlier batch — so a reader can trace both directions. Cross-study notes are **observations**, never
decisions.

---

## 4. The batch plan (each documented as it is completed)

Findings are organised **per pole**, one file per pole, plus an overview and a synthesis. Gas Town is a
**Go product with a role taxonomy and an external ledger**, so the pole weighting will differ from all
four earlier studies — but the structure is identical so the later mapping is a per-pole join.

| # | Batch / File | Pole | What it answers |
|---|---|---|---|
| **00** | **This file** — pin and method | — | task zero + method + pole frame |
| **01** | `findings/01-platform-overview.md` | — | What is Gas Town? the Town/Rig model, the `gt` CLI, the daemon, the role taxonomy, the control plane |
| **02** | `findings/02-the-aissistant.md` | **P1** | what an "agent" is here: polecat / crew / witness / mayor as records, identity, sessions, the `acp`/`tmux` runtime, skills and instructions |
| **03** | `findings/03-the-workspace.md` | **P2** | Town and Rig, the git-backed Hooks, the Beads ledger, config, membership/identity |
| **04** | `findings/04-automations.md` | **P3** | the scheduler, mailboxes, convoys, patrols (Deacon/Dog/Boot), the merge queue (Refinery), recovery |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** | the `tui` package, the terminal surface, any web surface, the widget model |
| **06** | `findings/06-out-of-pole.md` | **PZ** | everything else that fits our vision (security, quota, telemetry, plugins, the proxy, doctor/health) |
| **07** | `findings/07-SYNTHESIS.md` | all | what Gas Town teaches each pole; ranking; the bridge to the other four studies is a LATER pass |

**Each batch document carries:** (a) what was read and its measured size; (b) a **capability table tagged
by pole** with **Q1 · Q2**; (c) the code verification with `file:line` evidence and any **doc-vs-code
divergence**; (d) findings carried forward.

> **A note on the pole weighting, stated up front.** Gas Town's *stated purpose* is multi-agent
> orchestration with persistent work tracking, so the temptation to score it as "already done" is high
> here. The batches answer the **three value questions in the opposite direction too**: not only "does it
> fit our poles" but **"where does it draw its boundaries, and are they ours?"** — because a close
> neighbour is the hardest to reuse and the easiest to copy badly. That question is answered in the batch
> notes and ranked in batch 07, never assumed.

---

## 5. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → **code, always.**
- If doc and code disagree, is the disagreement recorded? → must be.
- Is every capability named, including the ones we will not use? → must be.
- Is every finding **tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ)? → must be.
- Are the two value questions answered in the owner's words? → yes, per capability.
- Is there any comparison to our own platform in a batch? → must be none; that is the later mapping pass.
- Before reusing an older-doc setting, was the retirement rule run (rule 10)? → must be.
- **Is a test file being counted as product code?** → with **568 of 1,231 Go files being tests**, every
  line count in this study states whether it includes tests.

---

## 6. How this study relates to the workshop folder

```
library/architecture/
├── hermes-forensics/          # the Hermes study (mirror; gitignored copy)
├── paperclip-forensics/       # the Paperclip study (CLOSED 7/7) + reader/
├── crewai-forensics/          # the CrewAI study (CLOSED 7/7) + reader/
├── multica-forensics/         # the Multica study (CLOSED 7/7) + reader/
├── gastown-forensics/         # THIS study
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/              # 01..07
├── reader/                    # the Hermes reader (user-facing HTML)
└── platforms/
    ├── *.zip                  # the raw platform archives (gitignored)
    ├── references.md          # repo link per platform
    └── _extracted/            # working trees (gitignored) — gastown-main here
```

**Per-platform reader:** a reader for Gas Town is built at the **end** of this study, from its markdown,
using the platform-agnostic generator proven for Paperclip, CrewAI and Multica (`generate-reader.js` + a
`DOCS_CONFIG` block + a `diagrams.js`). **The markdown is the source of truth; the reader renders it and
never edits it.** *(One caution carried in from the Multica reader — lesson L168: the generator is not
fully platform-agnostic, so a rebrand must be verified by grepping the new tree for the old name.)*

---

*Batch 00 of 07. Begun 2026-10-15. Next: `findings/01-platform-overview.md`.*
