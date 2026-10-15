# Batch 03 — Skills and the learning loop

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (plain words)

This is **the owner's learning lens**, and Hermes' headline claim: *"the only agent with a built-in
learning loop — it creates skills from experience, improves them during use, nudges itself to persist
knowledge, searches its own past conversations, and builds a deepening model of who you are."* (README)

A **skill** here is not a plugin or a program. It is a **written document** — a `SKILL.md` file — holding
the steps for doing a class of task well: the procedure in order, the commands that work, how the result
should look, and the pitfalls. The agent **writes these documents itself** when it works out a non-trivial
workflow, and **loads them on demand** later. That is what "learns by design" means concretely.

Two halves: **how a skill is stored and loaded**, and **the loop that creates and maintains skills**.

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/`) | Bytes |
|---|---:|
| `user-guide/features/skills.md` | 58,162 |
| `user-guide/features/curator.md` | 27,195 |
| `developer-guide/creating-skills.md` | 20,734 |
| `reference/skills-catalog.md` | 12,337 |
| **Total** | **118,428** |

Plus the per-skill pages under `user-guide/skills/bundled/**` (a bundled catalogue; the catalog doc
lists ~82 rows).

| Code verified against | Evidence |
|---|---|
| `tools/skill_manager_tool.py` | `skill_manage` at line 768 |
| `agent/curator.py` | the background curator; constants at line 31–32 |
| `agent/background_review.py` | the self-improvement review fork |
| ~26 `tools/skill*.py` modules | ledger, linter, provenance, usage, guards, hub, sync |

---

## 2. How a skill is stored and loaded, in plain words

**Storage.** All skills live in **`~/.hermes/skills/`** — *the primary directory and source of truth*
(`skills.md:11`). Bundled skills are copied there on install; hub-installed and **agent-created** skills
go there too. The agent can modify or delete any skill. A skill can also live in an **external directory**
or be **project-local** (inside a repo).

**Loading — progressive disclosure** (`skills.md:172–180`), a three-level scheme designed to save tokens:

```
Level 0: skills_list()          -> [{name, description, category}]   (~3k tokens)   <- always cheap
Level 1: skill_view(name)       -> the full SKILL.md                  (varies)      <- load when relevant
Level 2: skill_view(name, path) -> one reference file                 (varies)      <- load only if needed
```

**Why this matters:** the agent can hold **hundreds of skills** without paying for them, because only the
names and one-line descriptions sit in the prompt until a skill is actually needed. This is the mechanism
that makes a large private knowledge library affordable.

### 2.1 Skills are also commands

Every installed skill is **automatically a slash command** — `/gif-search funny cats`, `/github-pr-workflow
create a PR`, or bare `/excalidraw`. Up to **5 skills can be stacked** in one message by leading slash
commands. **A skill is thus both something the AI reaches for and something the human invokes** — the same
artifact, two doors.

### 2.2 `/learn` — turning anything into a skill

`/learn` is the fast path from "material you already have" to a reusable skill without hand-writing
`SKILL.md`. It accepts *"anything you can describe"*: a local SDK folder, an online doc page, the workflow
you just walked the agent through, pasted notes, or **a whole book or paper stack**. The agent gathers the
material with its normal tools and authors a skill following house standards.

**For large sources it does not summarise lossily** — it authors an *expansive knowledge-base skill*: a
lean `SKILL.md` with the core mental models plus an index, and **one distilled file per chapter/topic under
`references/`**, loaded on demand. *"Reference files cost nothing until a question needs one."* Re-running
`/learn` on the same topic **folds into the existing skill** rather than duplicating.

**Named-and-important limit the docs state:** the distillation *"synthesizes structure — frameworks,
definitions, decision rules, anti-patterns — and never reproduces passages of the source text."*

---

## 3. The learning loop, in plain words

### 3.1 The agent writes its own skills

`skill_manage` (verified: `tools/skill_manager_tool.py:768`) lets the agent **create, patch, delete** its
own skills. The docs call this *"the agent's procedural memory"*: *"when it figures out a non-trivial
workflow, it saves the approach as a skill for future reuse."* The system prompt **asks** the agent to
record when: it worked out a repeatable multi-step workflow; it hit errors and found the working path; or
**the user corrected its approach**.

**A design rule worth quoting** — a skill captures *"lessons, not logs"*: a pitfall is *"a generalizable
rule plus one clause of why, attached to the step it affects, stated once."* Incident narration, PR
numbers, dates and quoted chat are explicitly **not** skill content. Three advisory linters exist for
exactly this shape (incident-log-shape, references-sprawl, oversized-body) — **they warn, never block**.

### 3.2 The three-way loop: memory + skills + background review

> *"Skills and memory work together in the self-improvement loop: memory stores small durable facts that
> should always be in context, while skills store longer procedures that should load only when relevant.
> The background review can suggest or stage skill changes after a session."* (`skills.md:610–614`)

So learning happens in **two shapes** (always-visible facts → memory, batch 04; on-demand procedures →
skills, this batch), and a **background review** runs *after* a turn to propose changes.

### 3.3 The curator — keeping the library clean

Left alone, agent-created skills would pile up into *"dozens of narrow near-duplicates."* The **curator**
(`agent/curator.py`, VERIFIED) is a background maintenance pass that prevents that. **It is
inactivity-triggered, not a cron job** (`curator.py:3`): it runs when the agent has been idle and enough
time has passed. Constants **verified in code** (`curator.py:31–32`):

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_INTERVAL_HOURS` | **7 days** | minimum time between curator runs |
| `DEFAULT_MIN_IDLE_HOURS` | **2 hours** | how idle the agent must be |
| `DEFAULT_STALE_AFTER_DAYS` | **14 days** | unused this long → marked `stale` |
| `DEFAULT_ARCHIVE_AFTER_DAYS` | **30 days** | unused this long → moved to `.archive/` |

**Two safety properties the docs state and the code upholds:** the curator **never auto-deletes** — the
worst outcome is archival into `~/.hermes/skills/.archive/`, recoverable; and it is **deterministic for
the transitions** (no model cost) with an optional short auxiliary-model review that proposes
consolidations. **Pinned skills and skills referenced by any cron job are skipped entirely.**

**First-run behaviour is deliberately conservative:** on a fresh install the curator **does not run
immediately** — the first observation seeds `last_run_at` to now and defers the first real pass by a full
interval, *"so you have a full interval to review your skill library, pin anything important, or opt out."*
`hermes curator run --dry-run` shows what it *would* do.

### 3.4 The write-approval gate — the human's hand on the loop

By default the agent writes skills freely, **including from the background review**. If you want to review
first, `skills.write_approval: true` **stages** every `skill_manage` write instead of committing it —
*"a SKILL.md is too large to review inline, so staging applies regardless"* of where the write came from.
Staged writes survive restarts under `~/.hermes/pending/skills/` and are reviewed with the same
approve/deny flow as dangerous commands (`/skills pending`, `/skills diff <id>`, `/skills approve`).
Memory writes have the **same gate** under `memory.write_approval`.

**This is the single most important governance control in the batch:** the self-improvement loop can be
made **human-gated** without switching it off.

---

## 4. The capability table — the owner's two questions

`Verdict` empty (that is Batch 12's job).

### 4.1 The skill library

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **SKILL.md documents** | a written procedure the AI loads when relevant | the AI does a recurring job *this company's* way, not generically | the platform's own **house knowledge**, portable and reviewable | `now` |
| **Progressive disclosure** (3 levels) | only names load; bodies load when needed | hundreds of skills without slow or costly chats | a large private knowledge base at near-zero standing cost | `now` |
| **Skill = slash command** | every skill is also a typed command | the human can invoke a procedure directly | same artifact, two doors — a natural UI affordance | `now` |
| **Stacking up to 5 skills** | combine procedures in one message | compose a workflow ("PR workflow + TDD") in one line | composable capabilities | `soon` |
| **External + project-local dirs** | skills can live in a repo or shared folder | a company's own docs become the AI's procedures | integratability: point it at existing knowledge | `soon` |
| **Skill bundles** | a named set of skills under one command | "backend work" loads the right five | packaged expertise per role | `later` |

### 4.2 The learning loop

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **`skill_manage` (self-authored skills)** | the agent writes its own procedures | the AI gets better at *this user's* recurring tasks, unaided | **the compounding asset** — the platform's value grows with use | `now` |
| **Learning triggers** | learns from worked-out flows, errors, **and user corrections** | correcting the AI once makes it stick | quality improves from human feedback without a build | `now` |
| **`/learn` (any source → skill)** | turn a doc, a folder, a book into a skill | staff capture expertise without writing it | ingest a company's knowledge into its AI, cheaply | `soon` |
| **Knowledge-base skills (author + references)** | big sources become an indexed skill | a whole handbook is queryable | deep expertise at proportional cost | `soon` |
| **Background review** | proposes skill/memory changes after a session | the AI tidies itself up | unattended improvement | `soon` |
| **Curator (7d/2h/14d/30d, archive-only)** | keeps the library from bloating | the AI stays sharp, not cluttered | long-run health without manual pruning | `later` |
| **`write_approval` gate** | stage every skill/memory write for review | "show me what it learned" | **governance over the learning loop** — critical for a business | `now` |

---

## 5. Divergence and boundary notes

- **No divergence found** between the skills docs and the code on the load-bearing numbers: the curator
  constants in `curator.py:31–32` match the docs exactly (7 days / 2 hours / 14 / 30). That is a *positive*
  finding — the docs are accurate here.
- **Boundary restated by the docs (honest):** `/learn` *"synthesizes structure… and never reproduces
  passages of the source text"* (`skills.md:157–158`). So a knowledge-base skill is **a distilled guide,
  not a copy of the book** — a real limit on what "ingest our documents" yields.
- **The loop is default-ON.** Free writing is the default; the gate is opt-in. A business adopting this
  must decide the gate's state deliberately (batch 08).

---

## 6. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C3-1 | `write_approval` (skills + memory) is the governance control over learning — measure exactly what it stages | batch 08 |
| C3-2 | Memory + skills are two shapes of one loop — read them together | batch 04 |
| C3-3 | The curator's archive-only guarantee and its skip rules (pinned / cron-referenced) | batch 06 |
| C3-4 | Project-local + external dirs = how a company's own repo becomes procedures | batch 04 / synthesis |
| C3-5 | `/learn` distillation never copies source text — bounds any "ingest the docs" plan | synthesis |
| C3-6 | Skill bundles as packaged per-role expertise | batch 07 |
| C3-7 | The background review fork (`background_review.py`) — when it runs, what it may write | batch 04 |

---

## 7. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High and concrete. A staff member's recurring work gets **done their way** because the
AI writes and reuses procedures (skills) captured from real sessions — including from the user's own
corrections. The same skill is a **slash command** the human can call directly, so the artifact is shared
between the person and the AI. `/learn` lets staff turn any source they already have — a folder, a page, a
book — into a capability, without writing code.

**Q2 — VISION VALUE.** This is the owner's **learning lens**, and the loop is exactly what "learns by
design" means: **the more the AI works, the more skills it writes**, and the platform's value compounds
with use rather than staying flat. Two things make it platform-grade, not academic: (1) **progressive
disclosure** means a large house library costs almost nothing when idle; (2) the **`write_approval` gate**
puts a human hand on every change the AI makes to its own knowledge — the governance a business requires.
The curator keeps the library from degenerating, **archive-only, never delete**.

**Learning lens (explicit).** Skills are the **procedures** half of learning; memory (batch 04) is the
**facts** half. Both are written by the agent, both are gated by the same approval switch, and both feed
the "deepening model of who you are and how we work."

---

*Batch 03 of 12 complete. Divergences found this batch: 0 (the curator constants match the code exactly —
a positive finding). Next: `04-memory-and-context.md`.*
