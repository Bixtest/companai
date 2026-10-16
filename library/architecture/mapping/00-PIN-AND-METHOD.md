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

*Next: `01-platform-overview.md`.*
