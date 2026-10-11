# 04 — THE BRIDGE: how this workstream syncs with the development-management spine

**What this file is.** The **single contract** that binds this workstream
(`library/workspace-architecture/`, batches **B1–B10**) to the project's main development-management
spine (`BACKLOG.md`, `BUILD-ORDER.md`, `JOURNEY.md`, `COMPLETION-CALLBACKS.md`, `platform_points.md`,
`JOURNAL.md`, `INDEX.md`). It exists because, measured 2026-10-11, **the two paths had no link at all**:
nothing in the spine pointed here, and nothing here pointed at the spine's rules. A workstream with its
own resume point and its own numbering, disconnected from the spine, is **exactly how a dual path grows
a gap**.

**Owner's instruction this file answers** (2026-10-11, verbatim):
> *"how are we bridging the work we will do here into the work we did and managed via documentations
> like backlog, BUILD-ORDER, JOURNEY, COMPLETION-CALLBACKS, platform_points, etc... Identify that and
> systematically sync it so that this dual paths do not create gaps, bugs, errors, flaws, or incomplete
> work. We should also make sure we update all as we go. And what is the document that I should trace to
> see your progress as you build this path."*

---

## §1 — The measured gap (what was wrong, with the command)

| # | The gap | The measurement |
|---|---|---|
| **GAP-1** | **The spine did not point here.** No file in `library/development/`, nor `INDEX.md`, nor `JOURNAL.md`, mentioned this workstream. | `git grep -l "workspace-architecture" 9b5af4d -- library/development INDEX.md JOURNAL.md` → **no output** (0 spine hits at the pre-bridge commit; the only mentions were inside this folder + the agent's memory). |
| **GAP-2** | **This folder did not point at the spine's rules.** It had its **own** "RESUME HERE" — which **violates** the standing rule that *"the live task lives **only** in the `★ ACTIVE TASK` box at the top of `JOURNAL.md`"* (`README.md` §1 of `library/development/`). | this folder's `README.md` carried a "RESUME HERE — B8" while `JOURNAL.md` knew nothing of it. |
| **GAP-3** | **Numbering collision.** This workstream calls its batches **`B1…B10`**. The spine **already** uses `B1`/`B2` for other things: the HANDOVER read-tiers (`HANDOVER.md:252` = `B1 SPECIFICATIONS-DICTIONARY.md`, `:258` = `B2 ARCHITECTURE.md`), the module register (`CORE-MODULES-REGISTER.md:74` = `B1 CRM`, `:75` = `B2 Sales`), and the agent-half items (`B-05`, `B-16`). | `grep -nE "^\| B[12] \|" library/development/HANDOVER.md` → **two** rows (`:252` `B1`, `:258` `B2`); `grep -nE "^\| B[12] \|" library/development/CORE-MODULES-REGISTER.md` → **two** rows (`:74` `B1 CRM`, `:75` `B2 Sales`). So a bare `B1` already means **three** different things. |
| **GAP-4** | **Named plan items existed on both sides but were never joined.** B7/B8 produce and reference `CC-58`, `CC-59`, `CC-32` (register rows) and `G-09` (a vision-plan item) — which live in the spine. But the spine never said *"the workspace workstream refines/hands-off these."* | `COMPLETION-CALLBACKS.md` has the `CC` rows; this folder references them; neither names the other. |
| **GAP-5** | **No single progress document.** The owner had to ask *"what do I trace?"* — and the answer did not exist. | this file, §4. |

**The risk each gap creates, in plain words.** GAP-1/2 → a session working here never sees the standing
rules, and a session working in the spine never sees that a whole workstream ran. GAP-3 → an agent
reading "B7" cannot tell whether that is a batch, a read-tier, or a business module. GAP-4 → a plan item
could be built independently in two places, or **reach completion in one and stay open in the other** —
the exact "dual path" defect the owner named. GAP-5 → progress is invisible.

---

## §2 — The bridge (the contract): four rules that bind the two paths

**These are binding, in the same sense as the standing rules. They are the answer to *"systematically
sync it."***

### Rule BR-1 — ONE live task. The spine owns it.
**The `★ ACTIVE TASK` box at the top of `JOURNAL.md` is the single source of truth for *what is being
worked on right now*.** This workstream's own `README.md` **must not** carry a "RESUME HERE" that
competes with it. When this workstream is the live work, **its state appears in the `★ ACTIVE TASK` box**
(and the folder's README points at that box, never past it). *(This is the fix for GAP-1/2.)*

### Rule BR-2 — Batches here are ONE batch in the spine, and they are numbered distinctly.
This workstream is **one named programme** in the spine (`B-WS`, "the workspace-architecture
workstream"), **not** ten separate spine items. Its internal batches keep their `B1…B10` names **only
inside this folder**; **everywhere in the spine it is written `B-WS`** (with the batch as
`B-WS/B3`, `B-WS/B8`, …), so no reader ever confuses it with a Tier-B read row (`B1`…`B12`), the module
register (`B1 CRM`/`B2 Sales`), or the agent-half items (`B-05`/`B-16`).
*(Fix for GAP-3.)*

### Rule BR-3 — Every plan item this workstream touches is registered in `COMPLETION-CALLBACKS.md`.
When a batch here **specifies, refines, or hands off** a **register item** (`CC-*` / `SD-*` / `S-*` /
`D3` / `AH-1` — the row kinds the register actually holds), that item's row gets a **`decided in`** note
naming the workstream document. **Vision-plan items (`G-01`…`G-20`, which have no register row) are
handled the other way:** the workstream names them in [`03-MAPPING.md`](03-MAPPING.md) with their
prerequisite and trigger, and — if one of them is what a gap actually blocks on — the gap is carried as
a **`CC-*`** row whose *Prerequisite* cell names the `G-*` item. When a batch here **finds a new gap**
(an unwired half, a missing caller, a join that does not exist), it **adds a register row in the same
change** (rule 8) and names the workstream document that found it. **No item may be built in two places,
and no item may be marked done on one side while open on the other.**
*(Fix for GAP-4.)*

### Rule BR-4 — The SRS is an *input*, never a *plan*. Nothing here is "done" as code.
This workstream produces **specifications** (`02-SRS-*`), **decisions** (`02-REFERENCE-SYSTEMS.md`), and
**maps** (`03-MAPPING.md`, this file). **None of it is code.** A requirement is "done" **only** when its
`03-MAPPING.md` **BUILD IT** cell points at a plan item that has **actually landed** — measured in the
code repo, not asserted here. So the honest state of this workstream is *"the design is complete; the
build is scheduled."* *(This is the rule that stops the SRS from being mistaken for finished work — the
"false done" the plan's own §S1 warns about.)*

---

## §3 — The sync points, named per spine document

For **each** spine document, exactly what this workstream writes into it, and when:

| Spine document | What this workstream writes there | When (the trigger) |
|---|---|---|
| **`JOURNAL.md`** `★ ACTIVE TASK` box | the **live state**: which batch is running, what it just decided, the commit | every batch (BR-1) |
| **`JOURNAL.md`** done-block | a **dated block per batch** (or per workstream milestone), same house form as every other entry | when a batch closes |
| **`BACKLOG.md`** | a **pointer row** for the workstream (`B-WS`) in the right phase, stating *"the design is complete; builds are the named `CC-*`/`G-*` items"* — **not** a duplicate of the items | once (this change), then on any new item |
| **`BUILD-ORDER.md`** | **nothing new** unless a batch here proves a *prerequisite* changes — in which case a §note with the measurement | only if the order changes |
| **`COMPLETION-CALLBACKS.md`** | a **`decided in`** note on each **register** row (`CC-*`/`SD-*`/`S-*`/`D3`/`AH-1`) this workstream touches; a **new `CC-*` row** for any gap it finds (naming the `G-*` item in its *Prerequisite* cell when one is the blocker) | per BR-3, per batch |
| **`platform_points.md`** | **nothing** — the ONE NUMBER is derived from the register's boxes, so it moves **only** when a build lands (which is the spine's own work, not this workstream's) | never (from here) |
| **`JOURNEY.md`** | an **act** naming the workstream when it starts (done — Act 10 at B-WS/B8), and one **closing sentence** folded into it when the workstream's product is stable | at the workstream's start, then at B-WS/B10 (the final batch) |
| **`INDEX.md`** | the workstream's **folder** added to the map + a §6 lookup row (*"design the workspace"*) | once (this change) |
| **`library/development/README.md`** | a **first-tier read** naming this folder, so the next agent finds it | once (this change) |
| **`WORKING-RULES.md`** | **nothing** unless a rule is added; if one is, it is added there **and** the workstream's README lists it | only if a rule is added |
| **`LESSONS.md`** | one lesson per real defect a batch's hostile critic finds | per batch |

---

## §4 — The one document to trace for progress  ← **the owner's question**

> **Trace [`JOURNAL.md`](../../JOURNAL.md)'s `★ ACTIVE TASK` box first — that is *what is happening now.*
> Then this workstream's [`README.md`](README.md) §"Status" — that is *the batch scoreboard.*
> Then, for any requirement, [`03-MAPPING.md`](03-MAPPING.md) — that is *where each requirement stands.***

Stated as a one-line rule, so it can be remembered:

- **`JOURNAL.md` ★ ACTIVE TASK box** = *what is being worked on right now* (the spine's rule; BR-1).
- **`library/workspace-architecture/README.md`** = *the batch scoreboard* — which of B1–B10 are done, and
  the RESUME pointer **into** the `★ ACTIVE TASK` box (not a competing one).
- **`library/workspace-architecture/03-MAPPING.md`** = *the requirement ledger* — every workspace
  requirement, and for each: have-it / build-it(item) / borrow-it.
- **`COMPLETION-CALLBACKS.md`** = *the build state* — which `CC-*`/`SD-*`/`S-*`/`D3`/`AH-1` rows are
  open, and where each was decided (BR-3).

**Why the answer is `JOURNAL.md` first and not this folder.** The project's own rule decides it: *"handover
docs carry no 'what is next'; the live task lives only in the `★ ACTIVE TASK` box."* A workstream README
that answered *"what is next"* on its own would be the very dual-path defect this file exists to prevent.

---

## §5 — The "update all as we go" checklist (run at the end of every batch here)

Copy this into the batch's closing action. **Every box is mandatory** (rule 6/7 — update all docs in the
**same** change):

- [ ] **`JOURNAL.md`** — the `★ ACTIVE TASK` box reflects the new state; a dated done-block for the batch.
- [ ] **`library/workspace-architecture/README.md`** — status line + batch scoreboard + RESUME pointer
      (pointing at the box, not competing with it).
- [ ] **`03-MAPPING.md`** — any requirement the batch moved, updated.
- [ ] **`COMPLETION-CALLBACKS.md`** — every **register** row (`CC-*`/`SD-*`/`S-*`/`D3`/`AH-1`) touched: a
      `decided in` note; every new gap: a new `CC-*` row (BR-3).
- [ ] **`BACKLOG.md`** — the `B-WS` pointer row's status, if it changed.
- [ ] **`discussion_points.md`** + **`owner_answers.md`** — new questions; recorded answers.
- [ ] **`.workbuddy-ai/memory/YYYY-MM-DD.md`** — the batch's measured findings.
- [ ] **LF-0 verified** on every edited file; **committed by explicit path** in the docs repo (and the
      code repo **only** if code changed).

---

## §6 — What is deliberately NOT bridged (and why)

- **`platform_points.md`'s ONE NUMBER is not touched by this workstream.** It counts **built spine
  items**; this workstream builds no spine item — it **specifies** them. Moving the number from here
  would be the exact "false done" BR-4 forbids. The number moves when a `CC-*`/`G-*` build lands, in the
  spine's own change.
- **`BUILD-ORDER.md` is not re-ordered by this workstream.** The order is the spine's (and the owner's
  ruling of 2026-10-09). If a batch here proves a prerequisite is wrong, it **reports the measurement**
  and the spine changes — this folder never edits the order directly.
- **No code is claimed here.** BR-4. The code repo is untouched by this workstream (measured at
  `1bb61557` throughout).

---

*Created 2026-10-11 (batch B8's bridge, at the owner's instruction). This file is the contract; if it
and the spine disagree, the spine wins — and this file is stale and must be corrected in the same change
(rule 13).*
