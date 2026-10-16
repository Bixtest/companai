# 00 — PIN AND METHOD

**Workshop:** `library/architecture/` · **Study chain:** 9 platforms closed, 10th pending ASK
**Pass:** the cross-platform mapping — the step that turns nine closed studies into an SRS
**Started:** 2026-10-16 · **Status:** open

---

## 1. What this pass is

Nine platform forensics are closed. Each one answered the same question — *what does this
platform do about the aissistant, the workspace, automations, widgets, and the guard?* — and
produced findings with file citations.

This pass answers the next question: **what should OUR platform do?**

That is a different question from "what does mercato already do". The owner's ruling of
2026-10-16, quoted exactly:

> "we are not limited by what mercato allows. we want to engineer the best, richest, most
> versatile and integratable version of each pole plus the extra features, plugins, modules,
> ideas, architecture, etc the platforms inspire and reengineer accordingly."

So the ceiling here is **not** mercato's current state. It is the best design we can justify
from nine platforms' evidence. Mercato's current state is one *input* — the starting point,
the things we already own, the things that must not be broken — never the limit.

## 2. The poles

| Pole | Name | Question it answers |
|---|---|---|
| **P1** | the aissistant | Who thinks, how is it invoked, what may it do, how is it identified? |
| **P2** | the workspace | Whose data is this, who may see it, how is the boundary drawn? |
| **P3** | automations | What runs without a human watching, and how does it survive a crash? |
| **PX-W** | widgets | How is the interface composed, by whom, at runtime? |
| **PX-F** | frontend | How is the workspace rendered? |
| **PZ** | the guard / escape hatch | How do we make the wrong thing hard to do — and stay honest when we can't? |

## 3. The four columns (the ledger)

Every row in every pole file carries four columns. The first three are inherited from
`03-MAPPING.md`; the fourth is new, and it is the one that matters under this pass's frame.

| Column | Meaning |
|---|---|
| **HAVE IT** | Named code path or symbol in mercato today. |
| **BUILD IT** | A named plan item (`CC-*`, `G-*`, `M*`, `SD-*`) with prerequisite + trigger. |
| **BORROW IT** | A mechanism taken from a named platform, with the file citation that proves it exists. |
| **RE-ENGINEER IT** | **New.** The target design — the best/richest/most versatile/most integratable version, unrestricted by what mercato currently allows. |

A row with no RE-ENGINEER column is not finished.

## 4. Rules this pass obeys

1. **Markdown is the source of truth.** These files are the record. Nothing here is edited to
   fit a reader, a tool, or a convenient summary.
2. **Docs are claims; code is the authority** (Rule 1). Every BORROW row cites the platform
   file that proves the mechanism exists.
3. **A committed number can be wrong — re-measure, then commit the fix by name** (Rule 13).
   Contradictions between a study's own batches are **reported, not silently resolved**.
4. **Measured numbers only.** No estimates presented as counts.
5. **No development before a written requirement.** This pass writes requirements; it does not
   write code. Hermes is not forked or edited.
6. **Extend the register, never compete with it.** The project already has `G-*` (vision),
   `CC-*` (build queue), `S-*` (standards), `SD-*` (slices), `M1–M5` (missing modules),
   `C1–C11` (uncustomisable core), `P1–P18` (module register), `ROW-*` (mapping rows). New
   requirements are numbered **`SR-*`** and cross-referenced into that vocabulary.

## 5. Inputs

- **Nine platform digests** — one per closed study, extractive, file-cited, contradictions
  reported. Pole findings live in `<platform>-forensics/findings/02..06`; synthesis in `07`.
- **One mercato digest** — the same poles measured against the live code, from the named
  paths in `JOURNAL.md` and the register.
- **The existing registers** — `G-*`, `CC-*`, `S-*`, `SD-*`, `M1–M5`, `C1–C11`, `P1–P18`.

## 6. Outputs (this folder)

| File | Contents |
|---|---|
| `01-platform-overview.md` | The nine platforms at a glance; the frame; what each pole's target must be |
| `02-the-aissistant.md` | P1 — target + requirements |
| `03-the-workspace.md` | P2 — target + requirements |
| `04-automations.md` | P3 — target + requirements |
| `05-widgets-and-frontend.md` | PX-W + PX-F — target + requirements |
| `06-out-of-pole.md` | The inspired additions (plugins, modules, ideas) — **plus the gathered guard pole (PZ)**, whose mechanisms are cross-cutting by nature |
| `07-SYNTHESIS.md` | The re-engineered whole — one tenant ↔ one Hermes, the layer stack |
| `08-THE-SRS.md` | The requirement set `SR-01…SR-nn`, each traced to platforms and plan items |

## 7. What this pass does NOT do

- It does not extract or study mattermost (the 10th platform stays pending an explicit ASK).
- It does not write code, config, or build steps.
- It does not resolve a contradiction by choosing the convenient answer. It reports both.

---

## 8. The correction pass — 2026-10-16, same day

The mapping was first written from **compressed digests** — summaries produced by digest
agents — rather than from the markdown findings files directly. That broke the workshop's own
rule: *markdown is the source of truth.* The gap was 77 files and 1.6 MB never read.

**Correction run:** six verification batches, one per pole plus a summary pass, each agent
given only the markdown findings files for its slice and the corresponding mapping section to
check them against. Findings marked **[C]** throughout the pole files.

**What the pass found and fixed:**

| Class | Count | Worst instance |
|---|---|---|
| Wrong numbers | 5 | buzz's Tamarin lemmas: **32**, not 21 (stated twice in the markdown) |
| Invented quotes | 2 | *"Guard-as-document: the proof is only as good as the document that says where it stops"* — **not in the corpus at all**; and *"two reads of the same flag can diverge; one cannot"* |
| Inverted mechanism | 1 | SR-40's ratchet trigger — the build fails when the level is **not** raised |
| Wrong pole | 2 | A2UI is PX-W, not P1; openrig's Context Packs are PX-W, not P3 |
| Platform wrongly omitted | 5 | CrewAI from P2; Hermes, Gas Town, n8n, Paperclip, CrewAI from the guard pole |
| False negatives | 2 | buzz "has no P1"; CrewAI "has no widget model" |
| Stale superlatives | 2 | "the study's only real enforcement"; "the only platform with machine-checked composition" |
| Bad arithmetic | 3 | the status counts (3/10/31/2, not 4/8/31/3); the "six of nine" widget count; the "three of nine" tenancy count |
| Wrong attribution | 4 | Multica's approve-first authority layer (does not exist); zulip's hash-chained ledger (does not exist); buzz's plugin mechanism (does not exist); SR-05's sources |

**Two verification "no support" findings were themselves wrong**, and were corrected by
grepping the corpus: Gas Town's Hook **is** F03-03 and exactly as described (it lives in Gas
Town's P2 file, not its P3 file), and buzz's 136 `ALL_KINDS` entries are real. Both are now
cited correctly. The lesson: an agent that reads one pole's files cannot say a mechanism
"does not exist" — only that it is not in the files it was given.

**Rules added by this pass:**
1. Every source citation names the **findings file** the mechanism was read from, not just the
   platform.
2. Where a mechanism lives in a pole's file other than the one it is cited from, that is
   **recorded**, not silently moved.
3. A superlative is retained only where the markdown itself states it — superlatives age as
   later studies land.
4. A "not found" is a statement about the files read, never about the corpus.

---

*Next: `01-platform-overview.md`.*
