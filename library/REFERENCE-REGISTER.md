# Reference register — every substantive document, and where it is reached from

**Why this file exists.** The owner said it plainly on 2026-10-06:

> *"It is excellent to generate many documentations surgically documented different stuff, but this can be a curse or a gift based on one factor: Is it mapped and referenced? … All other documentations need to be referenced in the main one or two documents you have as point of focus, and they need to be referenced not at the top or as a footer, but in every section of the main document where a document — or a section(s) in the document(s) — are relevant … Or else you end up with too many disconnected documents loose and they will be just there with no use or impact."*

A document that no source of truth points at is a **loose document**. This register is the single
place that proves, by naming it, which source of truth reaches each substantive document — and it is
**measured, not asserted** (see §4 for the method and the commands, so anyone can re-run it).

---

## 1. The two sources of truth

| # | Document | It answers |
|---|---|---|
| **1** | [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | **What are we building, and why** — the vision and the architecture |
| **2a** | [`development/BUILD-ORDER.md`](development/BUILD-ORDER.md) | **The order** — what is built, in what sequence, and why |
| **2b** | [`development/BACKLOG.md`](development/BACKLOG.md) | **The live status** — where we are, what is next, what is incomplete, what needs fixing |

**The rule this register enforces:** every substantive document below is named inside **at least one
section** of #1 or #2 — not in a list at the bottom, but in the section where it is relevant. The
"In reach of" column names that section.

---

## 2. What counts as a "substantive document"

Three kinds of file live under `library/`:

| Kind | What it is | In this register? |
|---|---|---|
| **Ours, hand-written** | documents we wrote: the development set, the analysis programme, the two studies, the kit docs | **Yes — all of them** |
| **Ours, copied shelves** | `library/01-`…`library/16-` — byte-for-byte copies of earlier work, kept for provenance (see [`PROVENANCE.md`](PROVENANCE.md)) | No — they are source material, reached through the provenance note |
| **Imported code** | `library/ai/hermes-agent-main` (17,201 files), `library/ai/paperclip-master` (8,300 files) — other people's runnable source, studied, not written by us | No — reached through the two studies |

**Measured scope:** 3,466 `.md` files sit under `library/`, but **2,866 of them are inside
`library/ai/`** — the imported Hermes and Paperclip source trees plus the studied material. The
**hand-written documents this register must account for number 146**, in two groups:

| Group | Files | Where |
|---|---:|---|
| **The `library/` sets** | **73** | `development/` 29, `analysis/` 17, `paperclip-hermes-study/` 14, `paperclip-value-study/` 10, `kit-docs/` 3 |
| **The root sets** | **73** | `compai/` 29, `workspace/knowledge/` 20, `workspace/references/` 16, `llama/` 8 |
| **Total** | **146** | — |

Command: `find library/development library/analysis library/paperclip-hermes-study
library/paperclip-value-study library/kit-docs llama workspace/knowledge workspace/references compai
-name '*.md' | wc -l` → **146**.

---

## 3. The register — every substantive document

> **The count, measured, not estimated:** 73 hand-written `.md` files, in five folders —
> `development/` 29, `analysis/` 17, `paperclip-hermes-study/` 14, `paperclip-value-study/` 10,
> `kit-docs/` 3. Command, so it can be re-run:
> `find library/development library/analysis library/paperclip-hermes-study library/paperclip-value-study library/kit-docs -name '*.md' | wc -l` → **73**.

### 3.1 Point of focus (the two sources of truth themselves)

| Document | Role | In reach of |
|---|---|---|
| [`WHAT-WE-ARE-BUILDING.md`](WHAT-WE-ARE-BUILDING.md) | Source of truth #1 — vision and architecture | itself |
| [`development/BUILD-ORDER.md`](development/BUILD-ORDER.md) | Source of truth #2 — the order | itself |
| [`development/BACKLOG.md`](development/BACKLOG.md) | Source of truth #2 — the live status | itself |

### 3.2 The development set — `library/development/`

| Document | Role | In reach of |
|---|---|---|
| `development/README.md` | The hub: reading order and what lives where | #1 §7 (the library map) |
| `development/HANDOVER.md` | Start-here for a newcomer | #1 §7; #2a §1 |
| `development/START-PROMPT.md` | The prompt that boots a fresh session | #1 §7 |
| `development/NEEDS-YOU.md` | The short list of things only the owner can decide | #2b (top of the backlog) |
| `development/BLOCKERS.md` | Things that stop work, and what unsticks them | #2b §"blockers" |
| `development/ARCHITECTURE.md` | The architecture's index | #1 §3 |
| `development/ARCHITECTURE-structure-permissions.md` | The structure-change permission grammar | #1 §3 |
| `development/ARCHITECTURE-request-outcomes.md` | The request-outcome taxonomy (D3's home) | #1 §3; #2a §2 D3 |
| `development/ARCHITECTURE-hermes-integration.md` | How Hermes plugs in | #1 §4 |
| `development/ARCHITECTURE-model-server-integration.md` | The model/server boundary | #1 §4 |
| `development/AGENT-HALF.md` | The agent half of the product (the AH- series) | #1 §4 |
| `development/SPECIFICATIONS-DICTIONARY.md` | **The binding standard** — every term, one meaning | #1 §5; #2a §1 |
| `development/CORE-BOUNDARY.md` | The three rings: uncustomisable core / configurable / packs | #1 §5 |
| `development/CORE-MODULES-REGISTER.md` | Every core module decided: build / adapt / connect | #1 §5; #2a §3 |
| `development/BLUEPRINT-GAP-ANALYSIS.md` | The four gaps A–D between the blueprint and us | #1 §5; #2a §3 |
| `development/SPEC-business-model-kernel.md` | The business-model kernel spec | #1 §5 |
| `development/RUNBOOK-adding-a-domain-step-by-step.md` | How to add a domain | #1 §6 |
| `development/RUNBOOK-deploying-a-site.md` | How to deploy | #1 §6 |
| `development/RUNBOOK-platform-server.md` | How to run the platform server | #1 §6 |
| `development/RUNBOOK-hosting-server-manual.md` | The hosting server, manual steps | #1 §6 |
| `development/RUNBOOK-sprint0.md` | Sprint 0, start to finish | #1 §6; #2a §3 |
| `development/PLAN-G17-ir-generation.md` | The plan for IR generation | #2a §3 (Phase 1) |
| `development/PLAN-G21-request-outcomes.md` | The plan for request outcomes (P/N, G-21) | #2a §3 (Phase 1); #2a §2 D3 |
| `development/PLAN-coolify-laptop-implementation.md` | The plan to stand the platform up on Coolify | #2a §3 (Phase 0) |
| `development/REVIEW-coolify-laptop-architecture.md` | The critic read of that plan | #2a §3 (Phase 0) |
| `development/THREAD-2026-10-05.md` | A dated thread record of one working session | #2a §7 (the record trail) |
| `development/BOOKMARKS.md` | Pointers worth keeping | #2a §7 |

### 3.3 The studies — `library/analysis/`, `library/paperclip-hermes-study/`, `library/paperclip-value-study/`

| Document | Role | In reach of |
|---|---|---|
| `analysis/README.md` | How the pre-development analysis programme runs | #1 §7 |
| `analysis/PLAN.md` | The batch plan, with tickboxes | #1 §7 |
| `analysis/LOG.md` | One dated line per batch | #1 §7 |
| `analysis/findings/first-reading-notes.md` | First impressions of the ai-first set | #1 §7 |
| `analysis/findings/00-inventory.md` | What exists, inventoried | #1 §3 |
| `analysis/findings/01-vision-frame.md` | The vision's frame | #1 §1 |
| `analysis/findings/02-vision-model-and-runtime.md` | The vision's model and runtime | #1 §1 |
| `analysis/findings/03-vision-runtime-and-data.md` | The vision's runtime and data | #1 §3 |
| `analysis/findings/04-vision-workspace.md` | The vision's workspace | #1 §2 |
| `analysis/findings/05-vision-security-kernel.md` | The vision's security kernel | #1 §3 |
| `analysis/findings/06-starting-kit-capability-map.md` | What the starting-kit already does | #1 §6 |
| `analysis/findings/07-hermes-capability-map.md` | What Hermes already does | #1 §4 |
| `analysis/findings/08-hermes-fact-check.md` | Hermes claims, checked | #1 §4 |
| `analysis/findings/09-overlap-matrix.md` | Where the parts overlap | #1 §5 |
| `analysis/findings/10-contested-ownership.md` | Who owns what, and the decided outcomes | #1 §5 |
| `analysis/findings/11-shortcut-and-gap-register.md` | What is free, what must be built | #2a §3 |
| `analysis/findings/12-development-plan.md` | **The plan the whole programme exists for** | #1 §1; #2a §3 |
| `paperclip-hermes-study/README.md` | How the agent-management study runs | #1 §4 |
| `paperclip-hermes-study/PLAN.md` | Its batch plan | #1 §4 |
| `paperclip-hermes-study/LOG.md` | Its dated log | #1 §4 |
| `paperclip-hermes-study/findings/00-inventory.md` | The three codebases, inventoried | #1 §4 |
| `paperclip-hermes-study/findings/01-paperclip-architecture.md` | Paperclip's architecture | #1 §4 |
| `paperclip-hermes-study/findings/02-paperclip-agents.md` | Paperclip's agents | #1 §4 |
| `paperclip-hermes-study/findings/03-paperclip-tasks-and-delegation.md` | Tasks and delegation | #1 §4 |
| `paperclip-hermes-study/findings/04-paperclip-collaboration.md` | Collaboration | #1 §4 |
| `paperclip-hermes-study/findings/05-paperclip-triggers.md` | Triggers | #1 §4 |
| `paperclip-hermes-study/findings/06-paperclip-hermes-gateway.md` | The gateway between them | #1 §4 |
| `paperclip-hermes-study/findings/07-hermes-capabilities-verified.md` | Hermes, verified | #1 §4 |
| `paperclip-hermes-study/findings/08-new-agent-into-existing-thread.md` | Adding an agent to a live thread | #1 §4 |
| `paperclip-hermes-study/findings/09-aissistant-integration.md` | How the sibling project did it | #1 §4 |
| `paperclip-hermes-study/findings/10-lessons-and-target-design.md` | **Its synthesis — one decision** | #1 §4 |
| `paperclip-value-study/README.md` | How the value study runs | #1 §2 |
| `paperclip-value-study/PLAN.md` | Its batch plan | #1 §2 |
| `paperclip-value-study/LOG.md` | Its dated log | #1 §2 |
| `paperclip-value-study/findings/01-governance-and-the-human-boundary.md` | Governance and the human boundary | #1 §2 |
| `paperclip-value-study/findings/02-the-work-system-and-execution.md` | The work system | #1 §2 |
| `paperclip-value-study/findings/03-money-and-operations.md` | Money and operations | #1 §2 |
| `paperclip-value-study/findings/04-org-agents-and-training.md` | Org agents and training | #1 §2 |
| `paperclip-value-study/findings/05-extensibility-and-isolation.md` | Extensibility and isolation | #1 §2 |
| `paperclip-value-study/findings/06-the-unbuilt-ideas.md` | The ideas left unbuilt | #1 §2 |
| `paperclip-value-study/findings/07-synthesis.md` | **Its synthesis — six things worth acting on** | #1 §2; #2a §3 |

### 3.4 Library root, kit docs, and the record trail

| Document | Role | In reach of |
|---|---|---|
| `INDEX.md` (library root) | The library's own index | #1 §7 |
| `PROVENANCE.md` | Where every copied shelf came from, and how to rebuild it | #1 §7 |
| `universal_application_platform_framework_blueprint.md` | **The blueprint** — 5,565 lines, the framework we build on | #1 §7; #2a §3 |
| `canonical-architecture-v2-hybrid-ai-coolify.md` | A canonical architecture candidate | #1 §3 |
| `canonical-optimized-windows10-coolify-web-ai-architecture.md` | The other candidate | #1 §3 |
| `kit-docs/README.md` | The starting-kit's own docs index | #1 §6 |
| `kit-docs/cla.md` | The kit's contributor agreement | #1 §6 |
| `kit-docs/docs/framework/widget-injection.md` | Widget injection in the kit | #1 §6 |
| `../INDEX.md` (root of repo) | The repo's entry index | #1 §7 |
| `../JOURNAL.md` (root of repo) | The dated work journal | #2a §7 |
| `../LESSONS.md` (root of repo) | The promoted lessons | #2a §7 |
| `../companai.md` (root of repo) | The repo's own overview | #1 §7 |
| `../where_we_left.md` (root of repo) | A resume point | #2b |
| `.workbuddy-ai/memory/` | Per-session work logs | #2b |

### 3.5 Our other hand-written sets, at the repo root

These four folders are ours but live **outside `library/`**, so the earlier basename test in §4 does
not see them. They are registered here for the same reason: each is reached from a section of a
source of truth. **Measured 2026-10-06:** of the four, **two** are entered through a `README.md` that
lists every child (`llama/` 8 files, `workspace/knowledge/` 20 files); **two** are entered through a
folder path, because they hold only one `README` between them (`compai/` is entered at
`compai/planning/README.md`; `workspace/references/` has no `README.md` at all).

| Document / folder | Role | In reach of | Entry point |
|---|---|---|---|
| `../llama/` (8 files) | The model layer — how we call hosted models and run open-weight ones locally | #1 §7 | [`../llama/README.md`](../llama/README.md) — self-indexing |
| `../workspace/knowledge/` (20 files) | How the platform actually works: the governance layer and the mechanisms under it | #1 §4, §6 | [`../workspace/knowledge/README.md`](../workspace/knowledge/README.md) — self-indexing |
| `../compai/` (29 files) | The product thesis, the architecture, the method, the platform evaluations | #1 §1 | [`../compai/planning/README.md`](../compai/planning/README.md) — indexes the planning set |
| `../workspace/references/` (16 files) | The plan and the records for each build phase — graft, strip, repair, salvage batches; deployment and environment notes; parked modules | #2a §3 | **none — path only.** Registered as a folder a section names. |

**Status note, not a loose end:** `workspace/references/` has no `README.md`, so its 16 files are not
reachable from a single entry point the way the other three are. **It is registered, so it is not
loose** — `BUILD-ORDER.md` §3 names the folder. **OPEN — needs the owner only if he wants it changed:**
adding a `README.md` there would bring it in line with the other three. Recorded here rather than left
floating; nothing depends on it.

---

## 4. Proof — no substantive document is orphaned

**Two routes, because the two groups are reached differently.** The 73 `library/` documents are
reached **individually** (each is listed in §3 by name), so the test is a basename check. The 73
root documents are reached **through their set's entry point**, so the test is a folder check.

**Route 1 — the `library/` set. For each hand-written document, check whether its basename is named
inside `WHAT-WE-ARE-BUILDING.md` or `BUILD-ORDER.md` or `BACKLOG.md`.**

```bash
cd /c/Users/Ramzi/Downloads/companai
for f in $(find library/development library/analysis library/paperclip-hermes-study \
             library/paperclip-value-study library/kit-docs -name '*.md'); do
  b=$(basename "$f")
  grep -qs "$b" library/WHAT-WE-ARE-BUILDING.md library/development/BUILD-ORDER.md \
              library/development/BACKLOG.md && echo "OK   $b" || echo "ORPHAN $b"
done
```
**Result: 73 documents, 0 orphans.** Before this change — measured against the committed versions of
the three source-of-truth files at `HEAD` — it reported **39 orphans**, including the whole
`analysis/findings/` series, both studies' `findings/` series, the RUNBOOKs, and several
`development/` plans.

**Route 2 — the root set. For each of the four root folders, check whether a source of truth names
it (or its entry-point README).**

```bash
cd /c/Users/Ramzi/Downloads/companai
for t in 'llama/' 'workspace/knowledge' 'workspace/references' 'compai/planning'; do
  grep -qs -- "$t" library/WHAT-WE-ARE-BUILDING.md library/development/BUILD-ORDER.md \
                    library/development/BACKLOG.md && echo "REACHED: $t" || echo "LOOSE:   $t"
done
```
**Result: 4 folders, 0 loose** — all four are named from a section of a source of truth.

**The caveat, measured and stated rather than hidden.** A basename-only test produces **false
positives**: `LOG.md`, `README.md` and `PLAN.md` occur in more than one study, so a match on one
satisfies the test for all three. §3 resolves this by naming the **section** each document is reached
from, so the register is the record of truth and the commands are the quick check. Neither command
proves a link *resolves*; that was checked separately on every link added this turn, and **0 dead
links** were found in the change (the one dead link discovered — `llama/` written without the
`../` prefix — was fixed in the same change, per the rule in `PROVENANCE.md` §7).

---

## 5. What this register is *not*

- It is **not** a third source of truth. It is a **map of where the two sources of truth reach**.
  If it disagreed with them, they would be right and it would need fixing.
- It is **not** a list to read top to bottom. You read source of truth #1 or #2 and follow the
  `In depth →` lines *inside the section you are in*; this register is where you check that those
  lines exist and are complete.
- It does **not** cover the copied shelves or the imported source trees. Those are material, and
  §2 says how they are reached.

---

## 6. The one thing here that needs the owner (if anything)

Everything in §3 is now reached from a section of a source of truth, so nothing is loose. **One
optional tidy-up remains, and it is the owner's to approve:**

| Point | Status | Where the detail lives |
|---|---|---|
| `workspace/references/` has no `README.md` | **OPEN — needs you, and only a yes/no** | §3.5 status note. The other three root sets self-index; this one is reached as a folder. Adding a README would match the others. Nothing depends on it; the folder is registered either way. |
