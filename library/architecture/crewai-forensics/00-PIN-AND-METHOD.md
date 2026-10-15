# CrewAI Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/crewai-forensics/` · **Status:** OPEN — begun 2026-10-15
**This is a clean forensic study**, run the same way as `library/hermes-forensics/` and
`library/architecture/paperclip-forensics/`. It reads ONE source tree, measures it, and verifies every
load-bearing claim against the source code. **Nothing from any earlier study is reused, referenced, or
assumed** — CrewAI is read on its own terms.

**Why this platform is second.** The owner's ruling was *"one platform at a time"*, Paperclip first
(done: `9ae258f`/`97b4dfc`/`2bef78d`/`f1e5dea`), **CrewAI next**. Paperclip taught us the company /
task-runner shape; CrewAI is the **other** end of the same question — the agent framework where the unit
is the **crew that collaborates on tasks**, not the run that survives a process death. It is studied
standalone; the comparison against our platform, and against Paperclip/Hermes, is the **later mapping
pass**, never a batch.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:**
`C:/Users/Ramzi/Downloads/companai/library/architecture/platforms/_extracted/crewAI-main`
(extracted from `platforms/crewAI-main.zip`, which came from
`https://github.com/crewaiinc/crewai`).

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/crewaiinc/crewai` (`main`) | the owner's `platforms/references.md` |
| Zip | `platforms/crewAI-main.zip` — **220,555,507 B** (210 MB) | `ls -la` |
| **Zip md5** | **`cd93b15634e2c83ed371553b89533324`** | `md5sum` |
| Zip entry count | **41,081 entries = 5,326 dirs + 35,755 files** | Python `zipfile` |
| Uncompressed size | **450,745,141 B** (430 MB) | Python `zipfile` (`file_size` sum) |
| Extracted | 2026-10-15, **16:52** (all files share this mtime) | `ls` |
| **`.git` present?** | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| Total files on disk | **35,731** | Python `os.walk` (excl. `.git`/`node_modules`) |
| Total bytes on disk | **450,677,268** | Python `os.walk` |
| Declared version | **`__version__ = "1.15.28"`** | `lib/crewai/src/crewai/__init__.py` |
| Product | **CrewAI** by crewAI, Inc.; licence **MIT** (© 2025) | `LICENSE`, `README.md` |
| Runtime | **Python `>=3.10,<3.14`** (`.python-version` = `3.13`) | `pyproject.toml`, `.python-version` |
| Build system | **uv workspace** (`.venv` + `uv.lock` 1.74 MB) | `pyproject.toml` `[tool.uv.workspace]` |
| Key md5s | `pyproject.toml` `952f2c6168dc20cd72d804e4fa9ebbf9` · `LICENSE` `9b4b6f4b02c2cd11b4d896d71103b5ce` · `.python-version` `789ee353b44223a8ed8031aa190631dd` | `md5sum` |
| Product one-liner | *"Cutting-edge framework for orchestrating role-playing, autonomous AI agents… collaborative intelligence… agents to work together seamlessly, tackling complex tasks."* | `pyproject.toml` `description` |
| README one-liner | *"Open source Multi-AI Agent orchestration framework"* | `README.md` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree. Unlike Paperclip (which
carried **no version at all**), CrewAI **does** carry one: **`1.15.28`**, and it agrees with the newest
docs folder (`docs/v1.15.28/`, see §2.1). **So the identity we can assert is: source of CrewAI v1.15.28,
extracted 2026-10-15 16:52, zip md5 `cd93b15634e2c83ed371553b89533324`.** A reader reproducing this study
must match those. **Any claim here about "the latest CrewAI" is a claim about this extract.**

**Date clue:** the only in-tree dated artefacts outside `docs/` are two test cassettes under
`lib/crewai/tests/cassettes/` named `…-2025-04-14.yaml`. So the tree is **no older than 2025-04-14** and
snapshotted on/before 2026-10-15. The `1.15.28` tag is the stronger anchor.

---

## 2. What the tree contains (measured) — and the ONE thing that changes this study's shape

### 2.1 ⚠️ 93% of this tree is DOCUMENTATION, not code — this is the defining hazard of this study

Measured by extension over the whole tree (excl. `.git`/`node_modules`):

| Extension | Files | What it is |
|---|---:|---|
| **`.mdx`** | **33,251** | **the documentation site** (Mintlify-style MDX) |
| **`.py`** | **1,418** | the actual framework (see §2.2 — 7 in tests/tools counted separately) |
| `.yaml` | 794 | configs, tests, knowledge sources |
| `.md` | 108 (410,429 B) | READMEs, package docs |
| everything else | ~660 | images, JSON, TOML, lockfiles |

**`.mdx` alone is 292,450,570 B — 65% of the uncompressed tree.** And the reason is visible in `docs/`:

- `docs/` holds **45 documentation trees**: `edge/` (bleeding-edge) plus **44 released versions**
  `v1.10.0` … `v1.15.28`.
- Each version is translated into **4 languages**: `ar`, `en`, `ko`, `pt-BR`.
- Each `docs/<version>/en/` holds **209 `.mdx`** files; 209 × 45 version-trees ≈ the 33k.

**This is a divergence from both earlier studies and it must be stated plainly:**
- Hermes: the docs were a minority; the code was the object.
- Paperclip: **two** doc roots (`doc/` engineering, `docs/` public) but the code was ~1M lines and the
  bulk.
- **CrewAI: the docs *are* the bulk, and most of it is duplicated across versions and languages.** The
  code is small (§2.2). **The method's first rule ("docs are claims, code is the authority") is therefore
  not a preference here — it is the only way to avoid studying a doc archive 45 times over.** Every
  finding in this study is read from `lib/**/*.py`, never from `docs/**/*.mdx`.

> A useful corollary, itself a finding: **the docs site is version-controlled in-tree and rebuilt per
> release, four languages deep.** That is a real practice worth noting for our own documentation strategy
> (tagged: **PZ**). It is recorded here in the pin, not claimed as architecture.

### 2.2 Source code (Python uv workspace) — the object of this study

Six workspace members (`pyproject.toml` `[tool.uv.workspace]`), measured file-by-file:

| Package (`lib/…`) | `.py` files | Lines | Bytes | What it is |
|---|---:|---:|---:|---|
| **`crewai`** | **851** | **255,631** | 8,966,280 | the framework core |
| **`crewai-core`** | **36** | **139,659** | 8,003,388 | dense internals (few files, much code) |
| `crewai-tools` | 334 | 43,715 | 1,556,951 | the tool library |
| `cli` | 137 | 38,474 | 1,394,784 | the `crewai` command-line product |
| `crewai-files` | 43 | 10,632 | 336,966 | file handling |
| `devtools` | 10 | 4,504 | 152,118 | dev helpers |
| **TOTAL** | **1,411** | **492,615** | **20,410,487** | |

**Not in the totals above:** the 7 remaining `.py` files outside `lib/` are root-level (`conftest.py`,
`scripts/`). The **1,411** figure is the framework proper.

**The two monoliths to watch:** inside `lib/crewai/src/crewai/`, **`llm.py` is 108,701 B** and
**`crew.py` is 97,215 B**. A later batch must open both — an ~890-line class in a single file is where
agent behaviour usually hides.

### 2.3 The `crewai` package module map (measured — the object of batches 01–06)

Top level of `lib/crewai/src/crewai/`:

```
agent/  agents/  a2a/  auth/  cli/  core/  crews/  events/  experimental/
flow/   hooks/   knowledge/  llms/  mcp/  memory/  project/  rag/
security/  skills/  state/  tasks/  telemetry/  tools/  translations/  types/  utilities/
crew.py (97 KB) · llm.py (109 KB) · task.py (60 KB) · lite_agent.py (40 KB)
context.py · execution.py · process.py · settings.py · constants.py · version.py
```

Several of these map **directly** onto our poles and will be opened in the pole batches:

| Module | Pole it likely informs | Why it is on the list |
|---|---|---|
| `agent/`, `agents/`, `lite_agent.py` | **P1** | what an agent *is* and how it is configured |
| `memory/`, `knowledge/`, `rag/` | **P1 / P2** | persistent knowledge for an agent or a crew |
| `flow/`, `crews/`, `tasks/`, `process.py` | **P3** | how work is sequenced and delegated |
| `tools/`, `mcp/`, `a2a/` | **P1** | the capability surface (tool calling, MCP, agent-to-agent) |
| `state/`, `events/`, `hooks/` | **P3 / PZ** | run state, eventing, extension points |
| `project/`, `cli/` | **P2** | the on-disk project/product surface |
| `security/`, `auth/`, `telemetry/` | **PZ** | governance, credentials, observability |
| `llms/`, `settings.py` | **P1** | provider surface |

**These are hypotheses for what each batch will open, not findings.** Per rule 0b, the batch measures
first and only then claims.

### 2.4 YAML and the test surface

- **596 `.yaml` under `lib/crewai/`** — the largest single cluster outside `docs/`. A later batch must
  check what these are (configs? fixtures? knowledge sources?); do not assume.
- `lib/crewai/tests/cassettes/` holds recorded LLM interactions (`VCR`-style, given the `-2025-04-14`
  names) — evidence the project tests against **recorded** model traffic.

### 2.5 Agent-facing assets

`AGENTS.md` (1,869 B) is present at the root and is **itself a finding**: CrewAI states rules for AI
coding agents contributing to its own repo — including a specific correctness warning about
`LLMMessage.content` (`str | list[dict] | None`; *"Never `str()` it"*). That is the same posture Paperclip
had (built to be worked on by agents) and belongs in **PZ**.

---

## 3. The method (how every batch is produced)

The method is **inherited verbatim** from the Hermes and Paperclip studies (rules 1–10), with the pole
frame (§3.1) and the additive-across-studies rule (§3.2) as before.

1. **Docs are claims; code is the authority.** *Especially here:* the docs tree is 93% of the files. Every
   load-bearing statement is checked against `lib/**/*.py`. Where they disagree, **the code wins and the
   disagreement is recorded.**
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
10. **The retirement rule (C13-14).** Before reusing any setting/key/module named in an older document or
    another platform's doc, **search that platform's migrations/config for a retirement entry.** A
    silently-removed feature is the most valuable kind of finding.

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

This study does not rewrite the Hermes or Paperclip studies. Where a CrewAI finding **confirms,
contradicts or extends** an earlier finding, it is recorded as a cross-study note naming the earlier
batch — so a reader can trace both directions. Cross-study notes are **observations**, never decisions.

---

## 4. The batch plan (each documented as it is completed)

Findings are organised **per pole**, one file per pole, plus an overview and a synthesis. CrewAI is an
**agent framework**, not a company OS, so the pole weighting will differ from Paperclip's — but the
structure is identical so the later mapping is a per-pole join.

| # | Batch / File | Pole | What it answers |
|---|---|---|---|
| **00** | **This file** — pin and method | — | task zero + method + pole frame |
| **01** | `findings/01-platform-overview.md` | — | What is CrewAI? the crew/agent/task/process model, execution, the control plane |
| **02** | `findings/02-the-aissistant.md` | **P1** | the agent: role/goal/backstory, config, tools, memory, knowledge, LLM surface |
| **03** | `findings/03-the-workspace.md` | **P2** | projects, crews as units, the CLI/product surface, files, knowledge sources |
| **04** | `findings/04-automations.md` | **P3** | crews, flows, task sequencing, delegation, async execution, state, events |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** | the UI surface (if any), the docs-site construction, the presentation layer |
| **06** | `findings/06-out-of-pole-findings.md` | **PZ** | everything else that fits our vision (security, telemetry, MCP/A2A, docs practice) |
| **07** | `findings/07-SYNTHESIS.md` | all | what CrewAI teaches each pole; ranking; the bridge to Hermes/Paperclip is a LATER pass |

**Each batch document carries:** (a) what was read and its measured size; (b) a **capability table tagged
by pole** with **Q1 · Q2**; (c) the code verification with `file:line` evidence and any **doc-vs-code
divergence**; (d) findings carried forward.

> **A note on Batch 05 (adapted, not skipped):** CrewAI is a **Python framework** — it has no in-tree web
> UI. The batch is not dropped; it is **retargeted** to what CrewAI *does* ship as a presentation surface
> (its docs-site construction, its CLI's rendering, any HTML/Studio artefact) and **states plainly that no
> end-user UI exists**, which is itself the finding our widgets/frontend poles need. Per rule 6, the
> capability is named even when the answer is "it does not have one".

---

## 5. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → **code, always** — and the doc tree is 93% of the files, so
  this is enforced hardest here.
- If doc and code disagree, is the disagreement recorded? → must be.
- Is every capability named, including the ones we will not use? → must be.
- Is every finding **tagged with its pole** (P1/P2/P3/PX-W/PX-F/PZ)? → must be.
- Are the two value questions answered in the owner's words? → yes, per capability.
- Is there any comparison to our own platform in a batch? → must be none; that is the later mapping pass.
- Before reusing an older-doc setting, was the retirement rule run (rule 10)? → must be.

---

## 6. How this study relates to the workshop folder

```
library/architecture/
├── hermes-forensics/          # the Hermes study (mirror of library/hermes-forensics/; gitignored copy)
├── paperclip-forensics/       # the Paperclip study (CLOSED 7/7) + reader/
├── crewai-forensics/          # THIS study
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/              # 01..07
├── reader/                    # the Hermes reader (user-facing HTML)
└── platforms/
    ├── *.zip                  # the raw platform archives (gitignored)
    ├── references.md          # repo link per platform
    └── _extracted/            # working trees (gitignored) — crewAI-main here
```

**Per-platform reader:** a reader for CrewAI is built at the **end** of this study, from its markdown,
using the platform-agnostic generator proven for Paperclip (`generate-reader.js` + a `DOCS_CONFIG` block +
a `diagrams.js`). **The markdown is the source of truth; the reader renders it and never edits it.**

---

*Batch 00 of 07. Begun 2026-10-15. Next: `findings/01-platform-overview.md`.*
