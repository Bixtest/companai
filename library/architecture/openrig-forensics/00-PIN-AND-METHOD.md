# OpenRig Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/openrig-forensics/` · **Status:** OPEN — begun 2026-10-16
**This is a clean forensic study**, run the same way as `hermes-forensics/`,
`paperclip-forensics/`, `crewai-forensics/`, `multica-forensics/`, `gastown-forensics/`,
`n8n-forensics/` and `buzz-forensics/`. It reads ONE source tree, measures it, and verifies
every load-bearing claim against the source code. **Nothing from any earlier study is reused,
referenced, or assumed** — OpenRig is read on its own terms.

**Why this platform is eighth.** The owner's ruling was *"one platform at a time"*: Hermes,
Paperclip, CrewAI, Multica, Gas Town, n8n and buzz are closed. The owner's own
`platforms/references.md` names the remaining four in order — **buzz, openrig, mattermost,
zulip** — and the workshop README lists them the same way. buzz is done; **OpenRig is eighth**.

OpenRig is the second platform in this study that is **not primarily a workflow tool or a
workspace product** (buzz was the first). It is an **orchestration substrate for other
people's coding agents**: it does not implement an agent, it *wraps* existing ones — Claude
Code and Codex — in a team with a shared daemon, a queue, a terminal UI and an MCP server.
Seven platforms have now been measured against the three poles; **OpenRig is the first whose
stated premise is that the agents are unmodified and the product is only the coordination
around them.**

**The owner's directive carried into this study** (from the n8n and buzz briefs, still in
force): identify what fits the vision **and** what could be *taken further*. Per the method,
the batches stay comparison-free — the "take it further" notes are **observations** in the
synthesis, and the decisions stay the owner's at the mapping pass.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:** `library/architecture/platforms/_extracted/openrig-main/` —
extracted from `library/architecture/platforms/openrig-main.zip`, which came from
`https://github.com/mvschwarz/openrig`.

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/mvschwarz/openrig` (`main`) | the owner's `platforms/references.md` |
| **Zip md5** | **`d9c56a297910cbc9055aa39014adf788`** | `hashlib.md5` |
| Zip | `platforms/openrig-main.zip` — **13,486,627 B** (12.9 MB) | `ls -la` |
| Zip entries | **4,147 = 462 directories + 3,685 files** | `zipfile.namelist()` |
| Uncompressed (on disk) | **39,195,875 B** (37.4 MB) | `du -sb` over the extract |
| **Extraction** | `platforms/_extracted/openrig-main/` — **verified exact: 3,685 of 3,685 files, 0 missing, 0 extra** | a Python set-diff of the zip's namelist against the disk |
| **MAX_PATH check** | **max path = 140 characters** — no limit hit | `max(len(x) for x in namelist)` |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| **Declared version** | **`0.6.10`** (the top `##` heading of `CHANGELOG.md`, and `package.json`'s `"version"`) | `CHANGELOG.md:16`, `package.json:3` |
| Product one-liner | *"A harness wraps a model. A rig wraps your harnesses. Define your agent team in YAML, boot it with one command."* | `README.md:5` |
| Architecture one-liner | *"OpenRig runs a team of coding agents on your machine as one system."* | `ARCHITECTURE.md:11` |
| Toolchain | **Node.js `^22 \|\| ^24`** (`package.json` `engines`) · TS 5.x, ESM, npm workspaces · tmux required · macOS/Linux (Windows only via WSL2) | `package.json`, `README.md:426` |
| Licence | **Apache-2.0** (no gate, no open-core split observed) | `LICENSE`, `package.json:4` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. What *is*
readable is the **latest changelog release heading — `0.6.10`** — and `package.json`'s
`"version": "0.6.10"`, which agree. The CHANGELOG is **agent-readable by design** (its own
opening line says so) and carries **4,132 lines** of release history back to `0.5.0`.
**Any claim here about "the latest OpenRig" is a claim about this extract, at `0.6.10`.**

**⚠️ The one version trap in this tree.** `README.md`'s copy-paste install commands pin the
**`v0.6.8`** release in their raw-GitHub URLs (`README.md:25`, `:28`) while the tree declares
`0.6.10`. This is a **documentation lag, not a code disagreement** — the README is a live
document whose install script hardcodes a release tag. A later reader must not read
`v0.6.8` as the study's pin. **The pin is `0.6.10`; `v0.6.8` is a stale install reference.**

### 1.2 The rename hazard — and it is bigger than buzz's (a pin finding)

**A naming hazard a later reader must be told, because it will confuse them.** The product is
called **OpenRig**, the CLI is **`rig`**, and the state directory is **`~/.openrig`** — but the
code is full of a **fourth name: `RIGGED`.**

- The **legacy environment prefix is `RIGGED_*`** — **284 occurrences across 85 files**, in
  **22 distinct names** (measured). The heaviest are **`RIGGED_URL` (66)**,
  **`RIGGED_HOME` (66)** and **`RIGGED_SESSION_NAME` (66)**.
- There is a **legacy managed-block marker** in `conflict-detector.ts:98-99`:
  `<!-- BEGIN RIGGED MANAGED BLOCK: … -->` / `<!-- END RIGGED MANAGED BLOCK: … -->`.
- The **current** prefix is `OPENRIG_*` — **186 distinct names** (measured) — so the two
  families coexist in the same files. `RIGGED_HOME` sits beside `OPENRIG_HOME`; `RIGGED_PORT`
  beside `OPENRIG_PORT` (`index.ts:247` reads `OPENRIG_PORT` with a `RIGGED_PORT` fallback).

**The rename is documented, and the documentation is what ages.** `CHANGELOG.md:4054` records
it under **0.3.0**: *"Original runtime environment aliases keep deprecated `RIGGED_*` fallbacks
for compatibility; newer typed settings use `OPENRIG_*` only."* And the 0.3.0 release notes
(`docs/releases/v0.3.0.md:86`) narrow it: *"Deprecated `RIGGED_*` aliases remain **only for the
original runtime env keys**: `daemon.port`, `daemon.host`, `db.path`, `transcripts.enabled`,
and `transcripts.path`."*

> **The divergence (rule 1).** The release note says the legacy aliases are **five** documented
> runtime keys. The disk has **22 distinct `RIGGED_*` names**, and the **top three by count
> (`RIGGED_SESSION_NAME`, `RIGGED_URL`, `RIGGED_HOME` — 66 each) are not among the five.** They
> are *runtime-injection* variables (identity and endpoint handed to a seat), not the five
> config-translation aliases the note lists. So the true legacy surface is **wider than the
> document that describes it** — measured, not asserted. *(To be re-examined in batch 02,
> where the seat environment is read.)*

**Compare to buzz, one platform earlier.** buzz's rename (`sprout`/`sprig`) left **~4
file-level residues** and was *not* documented as a rename. OpenRig's is **284 occurrences
across 85 files**, *is* documented, and is *deliberately* kept as a compatibility shim. **The
lesson is the same but the shape differs: an undocumented rename leaks silently; a documented
rename leaks on a schedule — the day someone deletes the shim the doc still promises.** This
is the study's first measured rename; it is recorded here so no batch mistakes `RIGGED` for a
second product.

### 1.3 Where the extract lives

Unlike n8n (which had to be extracted to `C:\n8n` because its longest paths exceeded Windows'
260-char `MAX_PATH`), **OpenRig extracted cleanly into the conventional location**
`platforms/_extracted/openrig-main`. The measured reason: **OpenRig's longest path is 140
characters** — far under the limit. **The conventional location is correct for this study;
nothing special is required to reproduce it.**

---

## 2. What the tree contains (measured)

### 2.1 This tree is CODE — a TypeScript monorepo

| Measure | Value | How measured |
|---|---:|---|
| Total files (no `node_modules` in tree) | **3,685** | equals the zip file count; `.gitignore`d deps absent from the published archive |
| `.ts` files | **2,585** | `find -name '*.ts'` |
| `.tsx` files | **348** | `find -name '*.tsx'` |
| `.ts` + `.tsx` total lines | **43,410** | `find … \| xargs wc -l \| tail -1` |
| `.md` files | **377** | `find -name '*.md'` |
| `.yaml` / `.yml` files | **124 / 5** | `find` |
| `.mjs` files | **93** | `find` (build + test scripts) |
| `.sh` files | **17** | `find` |

**The package split (npm workspaces):**

| Package | Files (`.ts`/`.tsx`) | Lines | Ships? |
|---|---:|---:|---|
| `packages/daemon` | 1,748 | 40,441 | **private** — copied into the CLI |
| `packages/cli` | 468 | 39,451 | **the only published package** (`@openrig/cli`) |
| `packages/ui` | 523 | 43,030 | **private, maintenance mode** — built files copied into the CLI |
| `packages/tui` | 185 | 29,473 | **private** — copied into the CLI |
| `packages/test-system` | 0 | 0 | not an npm workspace; scenario library |

> **The packaging fact that matters.** `packages/cli` is the *only* package published to npm
> (`rawMarkdown` → `ARCHITECTURE.md:24`). The daemon, TUI and UI are **copied into** it at
> package time by `scripts/build-package.sh`. So what a user installs with
> `npm install -g @openrig/cli` contains four packages' worth of code under one name.

### 2.2 The architecture, in one measured picture

From `ARCHITECTURE.md:44-59` (a doc claim, verified against `server.ts` and `routes/`):

```
  rig (CLI)            TUI            MCP server (rig mcp serve, stdio)
       \                |                /
        +---- HTTP to the daemon (port 7433 by default) --------------+
                                |
  packages/daemon/src/server.ts   createApp(): context middleware, /healthz, app.route("/api/…")
                                |
  packages/daemon/src/routes/     one Hono router per area
                                |
  packages/daemon/src/domain/     services, repositories, orchestrators, event bus
              /                 |                  \
     SQLite (db/)       tmux (adapters/tmux.ts)    runtime adapters (adapters/*-adapter.ts)
                                                     claude-code, codex, pi, omp, terminal, stub
```

- **State** lives in `$OPENRIG_HOME` (default `~/.openrig`), database `openrig.sqlite`.
- **The daemon default port is 7433.** The three clients (CLI, TUI, MCP) all talk to it over
  local HTTP; the TUI also subscribes to `/api/activity/events` (SSE).
- **The runtime adapters are the boundary to the outside world.** Six of them:
  `claude-code`, `codex`, `pi`, `omp` (OMP extends Pi), `terminal`, `stub` (the test double).

### 2.3 The self-declared counts, and where the doc has aged (rule 1, in the pin)

`ARCHITECTURE.md` is unusually honest: it opens *"This map is not the territory… Where it
disagrees with the code, the code is right"* (`ARCHITECTURE.md:3-4`) and **pins every count to
commit `c750304f` (0.6.6 development)** (`:6`). The tree is `0.6.10`. So the doc's counts are
**three releases old by construction**. Measured against the disk:

| What | `ARCHITECTURE.md` says (at `c750304f`, 0.6.6) | **On disk (0.6.10)** | Verdict |
|---|---:|---:|---|
| Database migrations | **94** files (latest `095_…`; "there is no 093") | **105** files (latest **`109_mode_posture_coexist.ts`**) | **DIVERGED — doc aged** |
| Files in `routes/` | 67 | **69** | **DIVERGED — doc aged** |
| … of which create a Hono router | 65 | *(to verify in batch 01)* | pending |
| `app.route(...)` mounts in `server.ts` | 69 | *(to verify in batch 01)* | pending |
| Top-level `rig` commands | **87** | **87** | **HOLDS** |
| Runtime adapters | 6 (command counts 5 because OMP extends Pi) | 6 names present | **HOLDS (naming)** |
| MCP tools | **18** | **18** | **HOLDS** |
| Daemon `exports` subpaths | 21 | *(to verify in batch 01)* | pending |
| Library scenarios | 15 | *(to verify in batch 04)* | pending |

**The migration gap is the pin's first sharp finding.** The doc says *"there is no 093"* —
**true**: 093 is absent. But the disk has **four** absent numbers, not one:

> migrations run **001 → 109**, **105 files present**, and the missing numbers are
> **093, 100, 102, 106** *(measured: `range 1–109, count 105, missing [93, 100, 102, 106]`)*.

The doc's single named gap aged into a four-gap reality, and the doc's *latest* number (095)
is **14 migrations behind** the disk (109). **The doc is a true snapshot of 0.6.6, not a
false claim about 0.6.10** — which is exactly why the method pins to code.

### 2.4 The documentation surface

| Path | Files | What it is |
|---|---:|---|
| `docs/reference/` | (of 141 total under `docs/`) | user + operator reference; **ships inside the npm package** |
| `docs/as-built/` | **10** | module-by-module system description; **being re-verified for 0.6.6**; each page carries a `last-verified-against-source` commit in frontmatter |
| `docs/releases/` | | per-release notes |
| `docs/DESIGN.md` | 1 | the only other git-tracked doc at `docs/` root (a **docs guard** enforces this — see below) |
| `skills/` | `_canonical/`, `rigs/` | shipped agent skills; three mirrored "edges" (spec / plugin / canonical) |

**The docs guard is a real mechanism, not a convention** (`scripts/check-docs-guard.mjs`,
`ARCHITECTURE.md:288`): under `docs/`, git may track **only** `docs/as-built/`,
`docs/reference/`, `docs/releases/` and exactly `docs/DESIGN.md`; `.gitignore` ignores the
rest. This is the study's first sighting of **a repository whose documentation tree is
enforced by a test** — to be examined properly in batch 06.

---

## 3. The three poles — the frame for every batch (carried from the workshop)

| Pole | What it is | Where this study looks |
|---|---|---|
| **P1 — The aissistant** | the AI user: a versatile, integratable, rich-featured agent | **batch 02** — the runtime adapters, AgentSpec, seats, skills, permissions |
| **P2 — The workspace** | the container a person operates in | **batch 03** — rigs, pods, projects, the queue, the daemon's tenancy story |
| **P3 — Automations** | where agents work on and assign tasks | **batch 04** — the queue, message delivery, the scenario harness, continuity/restore |
| **PX-W — Widgets** | the composition surface | **batch 05** |
| **PX-F — Frontend wiring** | how the surfaces are assembled | **batch 05** |
| **PZ — the escape hatch** | the out-of-pole mechanisms worth stealing | **batch 06** |

**Every finding is tagged with its pole** so the later mapping step is a per-pole join.

## 4. The method (inherited, binding)

1. **Docs are claims; code is the authority.** Where they disagree, the code wins and the
   disagreement is recorded. *(Already productive: §2.3.)*
2. **Every number is measured** at the time of writing.
3. **Claims carry their evidence** (`file:line`).
4. **Two value questions per capability** — Q1 user value, Q2 vision value.
5. **No comparison to our own platform inside a batch** — that is the mapping step.
6. **Every capability is named**, including ones we will not use.
7. **Findings are additive**, never overwritten.
8. **Plain words** — a one-sentence gloss before any detail.
9. **Every finding is tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ).
10. **The retirement rule** — before reusing any setting from an older document, search that
    platform's migrations/config for a retirement entry (a silently-removed feature is the
    most valuable finding).

## 5. The batch plan (7 batches + this pin)

| Batch | File | Question |
|---|---|---|
| **00** | this file | The pin, the method, and what this study is |
| **01** | `findings/01-platform-overview.md` | What IS OpenRig — the daemon/CLI/TUI/MCP shape, the crate map, the counts reconciled |
| **02** | `findings/02-the-aissistant.md` | **P1** — the runtime adapters, AgentSpec, seats, skills, permission modes, YOLO |
| **03** | `findings/03-the-workspace.md` | **P2** — RigSpec, pods, projects, the queue, state, and the **tenancy** question |
| **04** | `findings/04-automations.md` | **P3** — the queue as the at-least-once baton, message delivery, continuity, restore |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** — the TUI topology views, the UI in maintenance mode, context packs |
| **06** | `findings/06-out-of-pole.md` | **PZ** — the guards, the scenario harness, the bundle integrity, the internal-leak scanner |
| **07** | `findings/07-synthesis.md` | The ranked mechanisms, the pole map, the decided limits, the verdict |

**Reader:** the OpenRig reader will be built from this markdown **on port 3700** (after
Hermes 3000 · Paperclip 3100 · CrewAI 3200 · Multica 3300 · Gas Town 3400 · n8n 3500 · buzz
3600), by copying the shared engine and rebranding it — never rewriting it.

---

*Batch 00 of 08 — the pin and the method. Next: **batch 01, the platform overview.***
