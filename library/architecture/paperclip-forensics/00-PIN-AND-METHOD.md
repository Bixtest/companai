# Paperclip Study — Batch 00: the pin, the method, and what this study is

**Folder:** `library/architecture/paperclip-forensics/` · **Status:** OPEN — begun 2026-10-15
**This is a clean forensic study**, run the same way as `library/hermes-forensics/`. It reads ONE source
tree, measures it, and verifies every load-bearing claim against the source code. Nothing from any earlier
Paperclip analysis is reused, referenced, or assumed.

**Why this platform is first.** Paperclip is the **upstream ancestor of our own product** — our
`aissistant-package` is a fork of upstream Paperclip 0.3.1 (baseline commit `4feef987`), rebranded
Aissistant/Companai. So this study reads the **upstream** project on its own terms (per the owner's ruling:
*"Upstream standalone first"*); the comparison against our fork is a **later bridge pass**, not this study.

---

## 1. THE PIN — task zero, answered by measurement

**The source of this study is:**
`C:/Users/Ramzi/Downloads/companai/library/architecture/platforms/_extracted/paperclip-master`
(extracted from `platforms/paperclip-master (1).zip`, which itself came from
`https://github.com/paperclipai/paperclip`).

| Fact | Value | How measured |
|---|---|---|
| Origin | `https://github.com/paperclipai/paperclip` (`master`) | the owner's `platforms/references.md` |
| Zip | `platforms/paperclip-master (1).zip` (52 MB, 11,388 entries) | `ls`, `unzip -l` |
| Extracted | 2026-10-15, 13:21 (all files share this mtime) | `ls --time-style=full-iso` |
| `.git` present? | **NO** — this is an extract, not a clone | `ls -d .git` → absent |
| Total files | **10,447** | `find . -type f \| wc -l` |
| `package.json` md5 | **`e912c83c715dba5c7c55469d4de899cb`** | `md5sum` |
| Declared version | **none** (`package.json` carries no `version`) | `json.load` |
| Product | **Paperclip** by Paperclip AI; licence **MIT** | `package.json`, `LICENSE`, `README.md` |
| Runtime | **Node `>=24.11.0`**, **pnpm `9.15.4`** | `package.json` (`engines`, `packageManager`) |
| Product one-liner | *"the app people use to manage AI agents for work"*; *"If OpenClaw is an employee, Paperclip is the company."* | `README.md` |

### 1.1 The identity limit (stated, not glossed)

There is **no `.git`**, so the exact upstream commit cannot be read from the tree, and `package.json` carries
**no version field** — worse than Hermes, whose `version = "0.0.0"` at least existed. **The md5 of
`package.json` plus the file count plus the extraction date is the whole identity we can assert.** A reader
reproducing this study must match those three numbers. **Any claim here about "the latest Paperclip" is a
claim about this extract, dated 2026-10-15.**

**The one date clue we do have:** the newest in-tree dated artefacts are `doc/architecture/
runner-rich-acp-validation-2026-09-30.json` and `doc/adapter-model-audit-2026-10-02.md`. So the tree is
**no older than 2026-10-02** and was snapshotted on/before 2026-10-15. That narrows it; it does not pin it.

---

## 2. What the tree contains (measured)

### 2.1 Documentation — note the TWO doc roots

Paperclip ships documentation in **two distinct places**, and they are different in kind:

| Root | Files | Bytes | What it is |
|---|---:|---:|---|
| **`doc/`** | **375** | **7,561,781** | The **engineering** corpus: specs, architecture notes, audits, plans, run logs, design sheets |
| **`docs/`** | **78** | **531,639** | The **public/user** documentation site (Mintlify-style: `docs.json`, API refs, guides, start) |
| all `.md` in tree | **952** | **12,069,398** | includes package readmes, skill docs, etc. |

**This is a divergence from the Hermes study's shape and is worth stating up front:** Hermes had ONE docs root
(`website/docs/`, 455 files / 8.9 MB). Paperclip has a **split** root, and its `doc/` corpus is **larger than
Hermes's whole docs tree** (7.56 MB vs 8.9 MB) while being **internal-facing**. The `doc/` corpus is the
richer source for architecture; `docs/` is the point-of-view of a user reading the product site.

### 2.2 Source code (TypeScript monorepo)

| Area | Files | Lines |
|---|---:|---:|
| `server/src/services/` | 1,220 | **535,237** |
| `packages/paperclip-runner/` | — | **221,706** |
| `packages/adapter-utils/` | — | 84,728 |
| `packages/plugins/` | — | 81,820 |
| `packages/adapters/` | — | 73,201 |
| `packages/shared/` | — | 60,799 |
| `cli/` | — | 46,128 |
| `server/src/routes/` | 94 | 82,750 |
| `packages/db/` | — | 27,577 |
| `ui/src/` | — | 14,771 |
| **`.ts`/`.tsx` in tree (excl. `node_modules`)** | **7,416** | **~1,000,000** (see note) |

**Note on the LOC totals:** two different measurements are in play and they do not add up simply, because
`server/src/services` (535k) is counted once and the per-package figures come from `find … | xargs cat | wc -l`
over different filters. The **honest headline** is: **~1M lines of TypeScript across ~7,400 files**, with
**`server/src/services/` alone at 535k lines / 1,220 files** and **`packages/paperclip-runner/` at 222k**.
The test corpus is large and included: `server/src/__tests__/` is **487,642 lines / 798 files** — i.e. roughly
**half of `server/src`'s total is tests**. Every figure in later batches will be produced by a command at
the time of writing, per rule 2; the numbers above are the opening survey only.

### 2.3 The monorepo shape (measured)

- **`server/`** — the Node API server: `services/` (the bulk), `routes/`, `modules/`, `middleware/`,
  `adapters/`, `realtime/`, `secrets/`, `auth/`, `storage/`.
- **`ui/`** — the React app: **801 `.tsx` components** under `ui/src/components/`; a Storybook surface.
- **`packages/`** — 15 workspace packages: `paperclip-runner` (the execution engine), `adapters`,
  `adapter-utils`, `plugins`, `shared`, `db`, `mcp-server`, `skills-catalog`, `teams-catalog`,
  `paperclip-eval-kernel`, plus MCP demos and a Tailscale HTTPS broker.
- **`cli/`**, **`tools/`**, **`scripts/`**, **`tests/`**, **`evals/`**, **`integrations/`**, **`maps/`**.
- **Agent-facing assets:** `skills/`, `skills-releases/`, `.agents/skills/`, `rules/`, `AGENTS.md`.
- **Every major AI coding agent has its own config folder in-tree:** `.agents/`, `.claude/`, `.codex/`,
  `.devin/`. That is itself a finding about the product's stance (it is built to be worked on by agents).

---

## 3. The method (how every batch is produced)

The method is **inherited verbatim from the Hermes study**, because it earned its keep — plus one addition
(the pole frame) that this stage of the project requires.

1. **Docs are claims; code is the authority.** Every load-bearing statement a doc makes is checked against
   the TypeScript source. Where they disagree, **the code wins and the disagreement is recorded**.
2. **Every number is measured at the time of writing**, never carried from memory or from an older document.
3. **Claims carry their evidence**: a line resting on code cites the file and line it was read at.
4. **Two value questions per capability**, per the owner's standing instruction:
   - **Q1 · USER VALUE** — how does this serve a real use case for a person using the platform?
   - **Q2 · VISION VALUE** — how does this serve the vision of an AI-first business & resources planner,
     now and long-run, including versatility and integratability?
5. **No comparison to our own platform inside the batches.** Understanding first; the cross-platform mapping
   is a **separate later pass** (the owner's step: *"we start mapping each pole findings across the
   platforms with what we have already in mercato"*).
6. **Every capability is named, including ones we will not use.** Nothing is silently dropped.
7. **Findings are additive and never overwrite history** (rule 7 from Hermes; see also §3.2 for the
   cross-study form).
8. **Plain words** — every capability gets a one-sentence plain gloss before any detail.
9. **THE POLE FRAME (new to this study).** Every capability finding is **tagged with which of the three
   poles it informs** — see §3.1 — so the later cross-platform mapping is a per-pole join rather than a
   re-read of nine studies.
10. **The retirement rule (C13-14, inherited).** Before reusing any setting, key, feature or module named in
    an older document or another platform's doc, **search that platform's migrations/config for a
    retirement entry.** A silently-removed feature is the most valuable kind of finding (Hermes Taught us
    this with `security.tirith_*`).

### 3.1 The pole frame — the three poles, defined once

The owner defined three poles plus two cross-cutting concerns. Every batch tags its findings against them:

| Tag | Pole | The owner's words (abridged) |
|---|---|---|
| **P1** | **The aissistant** (the AI user / agent) | *engineer the agent to be versatile, integratable, and rich featured architecture in itself, deployable in different contexts and needs (workspaces, automations, later the studio)* |
| **P2** | **The workspace** | *highly functional, versatile, integratable, rich featured architecture that adapts and provides the compatibility of the mix of current and future features, use-cases and needs* |
| **P3** | **Automations** | *where agents work on assigned tasks, assign tasks, etc. Paperclip is a blueprint for that* |
| **PX-W** | **Widgets architecture** | cross-cutting: the composable UI surface |
| **PX-F** | **Frontend wiring & construction** | cross-cutting: how the surface is built and wired |

**Plus one escape hatch, per the owner:** *"add any other findings you identify there that can fit our
vision, project, architecture, or a potential use case or added value for the end user."* Those are tagged
**PZ** (out-of-pole findings) with a one-line reason for keeping them.

### 3.2 Additive across studies, like rule 7 within a study

This study does not rewrite the Hermes study. Where a Paperclip finding **confirms, contradicts or extends**
a Hermes finding, it is recorded as a cross-study note naming the Hermes batch — so a reader can trace both
directions. Cross-study notes are **observations**, never decisions; the mapping step decides.

---

## 4. The batch plan (each documented as it is completed)

Per the owner's ruling, findings are organised **per pole** — each platform study gets **one file per pole**,
plus an overview, plus a "fits the vision" file. For Paperclip:

| # | Batch / File | Pole | What it answers |
|---|---|---|---|
| **00** | **This file** — pin and method | — | task zero + method + pole frame |
| **01** | `findings/01-platform-overview.md` | — | What is Paperclip? the company/agent/task model, the heartbeat, the control plane |
| **02** | `findings/02-the-aissistant.md` | **P1** | the agent: identity, personas, adapters, config, lifecycle, skills, memory, permissions |
| **03** | `findings/03-the-workspace.md` | **P2** | companies, projects, task hierarchy, artifacts, channels, documents, the operator surface |
| **04** | `findings/04-automations.md` | **P3** | heartbeats, runs, scheduling, wake recovery, budgets, approvals, the board, the runner |
| **05** | `findings/05-widgets-and-frontend.md` | **PX-W / PX-F** | the UI system, tokens, component inventory, Storybook, the app shell |
| **06** | `findings/06-out-of-pole-findings.md` | **PZ** | everything else that fits our vision/use-cases |
| **07** | `findings/07-SYNTHESIS.md` | all | what Paperclip teaches each pole; the bridge to our fork is a LATER pass |

**Each batch document carries:** (a) what was read and its measured size; (b) a **capability table tagged
by pole** with **Q1 · Q2**; (c) the code verification with `file:line` evidence and any **doc-vs-code
divergence**; (d) findings carried forward.

---

## 5. Ground rules restated as a checklist the reader can hold this study to

- Is the claim measured, or remembered? → must be measured.
- Does the line rest on a doc, or on code? → code where it matters.
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
├── hermes-forensics/          # the Hermes study (mirror of library/hermes-forensics/ — see note)
├── paperclip-forensics/       # THIS study
│   ├── 00-PIN-AND-METHOD.md
│   └── findings/              # 01..07
├── reader/                    # the Hermes reader (user-facing HTML) — one reader per platform, per owner
└── platforms/
    ├── *.zip                  # the raw platform archives (gitignored)
    ├── references.md          # repo link per platform
    └── _extracted/            # working trees (gitignored)
```

**Note on the mirror:** `architecture/hermes-forensics/` is byte-identical to `library/hermes-forensics/`
(verified by `diff -rq`, 0 differences on 2026-10-15). **Two live copies of the same markdown is a clobber
hazard** — the standing rule applies: `git diff <path>` before editing, and know WHICH copy you are editing.
The authoritative copy is `library/hermes-forensics/`; `architecture/hermes-forensics/` exists so the reader
and the workshop sit together.

---

*Batch 00 of 07. Begun 2026-10-15. Next: `findings/01-platform-overview.md`.*
