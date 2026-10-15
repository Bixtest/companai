# n8n Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/n8n-forensics/` · **Status:** OPEN — begun 2026-10-15
**This is a clean forensic study**, run the same way as `hermes-forensics/`,
`paperclip-forensics/`, `crewai-forensics/`, `multica-forensics/` and
`gastown-forensics/`. It reads ONE source tree, measures it, and verifies every load-bearing claim
against the source code. **Nothing from any earlier study is reused, referenced, or assumed** — n8n is
read on its own terms.

**Why this platform is sixth.** The owner's ruling was *"one platform at a time"*: Paperclip, CrewAI,
Multica and Gas Town are closed. **n8n is sixth**, chosen by the owner because *"it is a rich and highly
rated platform"* — and it is the first platform in this study whose stated purpose is **the composition
surface itself**: a visual canvas where workflows and AI agents are built and run. The four closed
platforms were each measured to have **no widget/composition model** (Paperclip, CrewAI, Multica, Gas
Town). If that verdict is about to change anywhere, it is here.

**The owner added a directive to this study** (§7): identify what fits the vision **and** what could be
*taken further*. Per the method, the batches stay comparison-free — the "take it further" notes are
**observations** in the synthesis, and the decisions stay the owner's at the mapping pass.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is: `C:\n8n`** — extracted from
`library/architecture/platforms/n8n-master.zip`, which came from
`https://github.com/n8n-io/n8n`.

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/n8n-io/n8n` (`main`) | the owner's `platforms/references.md` |
| **Zip md5** | **`7cc78a5ea124ba2c270bccabf282d9ed`** | `md5sum` |
| Zip | `platforms/n8n-master.zip` — **76,776,813 B** (73.2 MB) | `ls -la` |
| Zip entries | **38,689 = 7,060 directories + 31,629 files** | `zipfile.namelist()` |
| Uncompressed | **218,643,247 B** (208.5 MB) | `os.path.getsize` total |
| **Extraction** | **`C:\n8n`** — **verified exact: 31,629 of 31,629 files, 0 missing, 0 extra** | a Python set-diff of the zip's namelist against the disk |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| **Declared version** | **`2.44.0`** (`package.json`, `"name": "n8n-monorepo"`) | root manifest |
| Toolchain | Node ≥ 24.0.0 · **pnpm ≥ 12.4.2** (`packageManager: pnpm@12.4.2`) · **Turborepo** | `package.json` |
| Product one-liner | *"The Platform for AI Agents and Workflow Automation"* | `README.md:3` |
| Vision one-liner | *"an agentic development environment for managing multiple Claude Code instances"* — **that is Gas Town; n8n's is:** *"Fair-code platform to build and deploy AI agents and workflows. Combine a visual canvas with custom code, run it self-hosted or in the cloud, and connect to 1500+ integrations."* | `README.md:5` |
| Key md5s | `README.md` `f42dce2c…` · `package.json` `d01f7a90…` · `AGENTS.md` `288cebe9…` · `CHANGELOG.md` `d482a741…` · `LICENSE.md` `b6d62346…` · `CLAUDE.md` `5c27369b…` | `md5sum` |

### 1.1 The extraction lives outside the study folder — and why

The study's convention is `platforms/_extracted/<name>`. **This study reads `C:\n8n` instead.** The
reason is measured, and a later reader must not mistake it for carelessness:

- the conventional destination is **87 characters** deep before any filename;
- n8n's longest paths reach **209 characters** relative, i.e. ~296 absolute;
- **Windows' default `MAX_PATH` limit is 260.**

Extracting into the deep workspace path therefore **wedged** at the first path over the limit (a
background `unzip` froze dead at 16,624 files with nothing written for minutes). The owner extracted
manually to a short root path instead, and the result **verified exact**. **To reproduce this study,
extract the zip to a short root path — `C:\n8n` is what was used — not into the workspace.**

**⚠️ `platforms/_extracted/n8n-main/` is a KNOWN-INCOMPLETE ARTEFACT and must not be used.** It holds the
16,624 files written before the stall. It is a partial copy of `C:\n8n`; reading it instead of `C:\n8n`
would silently produce findings about a truncated tree. It is left on disk rather than deleted (deleting
is destructive and was not requested) — if it is ever removed, nothing in this study depends on it.

### 1.2 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. The declared version
is `2.44.0` from the root manifest, and `CHANGELOG.md` is **2,106,677 bytes** — the largest single
document in any platform studied. **Any claim here about "the latest n8n" is a claim about this
extract.** The module is **`n8n-monorepo`** and the binaries are `n8n` / `n8n-worker` (verify in
batch 01).

---

## 2. What the tree contains (measured)

### 2.1 This tree is CODE — a TypeScript monorepo

Measured by extension over the whole tree:

| Extension | Files | Bytes | What it is |
|---|---:|---:|---|
| **`.ts`** | **22,715** | **141,917,795** | **the product — 65 % of all bytes** |
| `.json` | 3,905 | 32,728,433 | manifests, configs, fixtures |
| **`.vue`** | **1,409** | 9,661,010 | **the frontend** |
| `.svg` | 1,157 | 1,886,736 | icons |
| `.md` | 771 | 6,539,149 | docs + AGENTS files |
| `.mjs` | 321 | 1,598,652 | scripts |
| `.snap` | 206 | 2,645,960 | **test snapshots** |
| `.png` | 112 | 3,637,786 | images |

**The hazard here is the opposite of CrewAI's (93 % documentation).** n8n is **code-dominant** — 22,715
TypeScript files against 771 markdown — and the doc set is small enough to read entirely. **Rule 1
applies as a habit, not a suspicion: the docs are few and the code is the authority.** Unlike Gas Town,
the docs here are not the story.

### 2.2 The measured shape (per area)

| Area | Files | Bytes | What it is |
|---|---:|---:|---|
| **`packages/`** | **30,740** | **208,063,359** | **the product — 95 % of the tree** |
| `docs/` | 332 | 1,413,979 | the documentation site source |
| `scripts/` | 100 | 768,859 | build and dev tooling |
| `assets/` | 3 | 338,029 | images |
| `docker/` | 14 | 93,140 | container definitions |

### 2.3 The test ratio — measured before any finding was written

**22,715 `.ts` files = 15,266 product + 7,449 test — a 32.8 % test share by filename.** This is
*middle of the pack* for the study (Gas Town was 46 %, Multica 48 % of `internal/` lines), but it is
stated because a "lines of TypeScript" reading is **one third test code** unless it says so.

### 2.4 The module map (measured — the object of batches 01–06)

`packages/` holds **nine top-level groups plus 57 `@n8n` packages**:

| Group | What it is |
|---|---|
| **`packages/@n8n/`** | **57 internal packages** — the whole product, sliced |
| `packages/cli` | the CLI |
| `packages/core` | the workflow engine core |
| `packages/extensions` | the community extension mechanism |
| `packages/frontend` | the **Vue.js** editor UI |
| `packages/nodes-base` | the built-in node catalog |
| `packages/modules`, `node-dev`, `quality`, `workflow` | tooling and quality gates |

**The 57 `@n8n` packages are the study's map**, and the names are already the domain (verify each; do
not assume): `agents` · **`ai-workflow-builder.ee`** · `ai-node-sdk` · `ai-utilities` · `api-types` ·
`backend-common` · `backend-network` · `backend-services` · `blob-storage` · `chat-hub` · **`crdt`** ·
**`di`** · `db` · `decorators` · **`engine`** · `errors` · **`expression-runtime`** · `extension-sdk` ·
`config` · `constants` · `computer-use` · `instance-ai` · **`mcp-apps`** · **`mcp-browser`** ·
`mcp-browser-extension` · `create-node` · `node-cli` · … *(the full list of 57 is in the batch-01
appendix; this is the shape, not the inventory)*.

### 2.5 The license — and it is the gate

`LICENSE.md` is precise, and it is the single most important fact in this pin:

- *"Source code files that contain **`.ee.` in their filename or `.ee` in their dirname are NOT licensed**
  under the Sustainable Use License. To use [them] you must hold a valid **n8n Enterprise License**."*
- *"All third party components incorporated into the n8n Software are licensed under the original
  license provided by the owner of the applicable component."*
- *"Content outside of the above mentioned files or restrictions is available under the **Sustainable
  Use License**."*

**So n8n is fair-code, not open source.** The `.ee` files — including **`ai-workflow-builder.ee`, the
visual AI workflow builder** — are unlicensed without an enterprise agreement. **This study reads them
to understand the architecture; nothing here is a licence to copy.** Recorded here because it governs
every "can we take this?" question, including the owner's §7 directive.

### 2.6 The repo's own agent posture

- **`AGENTS.md` (438 lines)** — a real agent-instructions file, including engineering rules (*"Always
  use pnpm"*, *"Write all technical text in ASD-STE100 Simplified Technical English"*, and *"**Secrets
  on the command line**: … never put secrets in a command. Pass sensitive values via environment
  variables, which are never captured"*).
- **`CLAUDE.md` is 11 bytes** — `@AGENTS.md`, a one-line pointer.
- **`.agents/`** contains **`review-rules/`** and **`skills/`** — so n8n has already codified how agents
  review its code.

---

## 3. The method (how every batch is produced)

The method is **inherited verbatim** from the five closed studies (rules 1–10), with the pole frame
(§3.1) and the additive-across-studies rule (§3.2) as before.

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
    platform's doc, **search this platform's config/CHANGELOG for a retirement entry.** n8n has a
    **2 MB changelog**, so this rule has an unusually rich surface here.

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

This study does not rewrite the five closed studies. Where an n8n finding **confirms, contradicts or
extends** an earlier finding, it is recorded as a cross-study note naming the earlier batch — so a
reader can trace both directions. Cross-study notes are **observations**, never decisions.

---

## 4. The batch plan (each documented as it is completed)

Findings are organised **per pole**, one file per pole, plus an overview and a synthesis. n8n's pole
weighting will differ from all five earlier studies — **PX-W is expected to be the strongest** — but the
structure is identical so the later mapping is a per-pole join.

| # | Batch / File | Pole | What it answers |
|---|---|---|---|
| **00** | **This file** — pin and method | — | task zero + method + pole frame |
| **01** | `findings/01-platform-overview.md` | — | What is n8n? the monorepo shape, the CLI, the engine, the node model, the control plane |
| **02** | `findings/02-the-aissistant.md` | **P1** | the AI agent surface: `agents`, model flexibility, tool use, MCP, the `ai-node-sdk` |
| **03** | `findings/03-the-workspace.md` | **P2** | the workspace: auth, tenancy, the data model (`db`), storage (`blob-storage`), multi-user |
| **04** | `findings/04-automations.md` | **P3** | the workflow engine: `core`, `engine`, `expression-runtime`, execution, triggers, human approvals, observability |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** | **the composition surface**: the Vue editor, the node catalog, `create-node`, `crdt`, the design system |
| **06** | `findings/06-out-of-pole.md` | **PZ** | everything else (license enforcement, telemetry, quality gates, `quality`, extensions) |
| **07** | `findings/07-SYNTHESIS.md` | all | what n8n teaches each pole; the ranked mechanisms; **and the owner's §7 notes — what fits, and what could be taken further** |

**Each batch document carries:** (a) what was read and its measured size; (b) a **capability table tagged
by pole** with **Q1 · Q2**; (c) the code verification with `file:line` evidence and any **doc-vs-code
divergence**; (d) findings carried forward.

---

## 5. The owner's directive for this study (§7)

The owner asked two things that shape the synthesis:

1. **What fits the vision** — answered per capability in the batches and ranked in batch 07.
2. **What could be taken further** — recorded as **observations** in batch 07 §7, never as decisions.

**The method's discipline still holds inside the batches:** rule 5 (no comparison to our own platform)
applies to batches 01–06. The synthesis (§7) may name a mechanism as *extensible* — e.g. "this pattern
would allow X" — but it must stop at the observation. **The mapping pass and the owner decide.**

**And the licence gate from §2.5 travels with every observation:** nothing here is a right to copy. The
`.ee` files are unlicensed; the Sustainable Use License restricts commercial use. **Read the
architecture; reimplement what is worth having.**

---

## 6. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → **code, always.**
- If doc and code disagree, is the disagreement recorded? → must be.
- Is every capability named, including the ones we will not use? → must be.
- Is every finding **tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ)? → must be.
- Are the two value questions answered in the owner's words? → yes, per capability.
- Is there any comparison to our own platform in a batch? → must be none; that is the later mapping pass.
- Before reusing an older-doc setting, was the retirement rule run (rule 10)? → must be.
- **Does the line count say whether it includes tests?** → with **32.8 % of `.ts` files being tests**,
  every count in this study states its basis.
- **Is a `.ee` file being treated as available?** → it is not; §2.5 governs.

---

## 7. How this study relates to the workshop folder

```
library/architecture/
├── hermes-forensics/          # the Hermes study (mirror; gitignored copy)
├── paperclip-forensics/       # the Paperclip study (CLOSED 7/7) + reader/
├── crewai-forensics/          # the CrewAI study (CLOSED 7/7) + reader/
├── multica-forensics/         # the Multica study (CLOSED 7/7) + reader/
├── gastown-forensics/         # the Gas Town study (CLOSED 7/7) + reader/
├── n8n-forensics/             # THIS study
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/              # 01..07
├── reader/                    # the Hermes reader (user-facing HTML)
└── platforms/
    ├── *.zip                  # the raw platform archives (gitignored)
    ├── references.md          # repo link per platform
    └── _extracted/            # working trees (gitignored) — n8n is at C:\n8n instead (§1.1)
```

**Per-platform reader:** a reader for n8n is built at the **end** of this study, from its markdown,
using the platform-agnostic generator proven for Paperclip, CrewAI, Multica and Gas Town
(`generate-reader.js` + a `DOCS_CONFIG` block + a `diagrams.js`). **The markdown is the source of truth;
the reader renders it and never edits it.** *(Two cautions carried in from earlier readers: the engine is
not fully platform-agnostic — lesson L168 — and a copy-then-swap is exactly where another platform's
content leaks in, so the new tree must be grepped for the old platform's vocabulary before building.)*

---

*Batch 00 of 07. Begun 2026-10-15. Next: `findings/01-platform-overview.md`.*
