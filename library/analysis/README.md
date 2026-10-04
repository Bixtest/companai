# Analysis programme — how it runs

This folder is where the **analysis before development** happens. It exists because
we now have a large architecture design (the ai-first set), a large agent runtime
(Hermes), a working platform (starting-kit) and a built product (aissistant-package)
— and nobody has yet checked them against each other.

The output of this programme is not prose. It is **decisions**: what to adopt, what
to adapt, what to build, what to drop — each with the evidence behind it.

---

## 1. The files

| File | What it is |
|---|---|
| `PLAN.md` | **The batch plan.** Every batch, with tickboxes. This is the live document — it gets updated as batches finish |
| `findings/first-reading-notes.md` | My first read of the ai-first set, before any deep analysis. Impressions only, not verified |
| `findings/NN-*.md` | One report per batch. Written when the batch runs, not before |
| `LOG.md` | A dated, append-only line per batch completed. So anyone can see the programme's history at a glance |

---

## 2. The rules

These are not preferences. A batch that breaks one is not finished.

1. **One batch at a time, to completion.** No starting batch 5 while batch 3 is half
   done. The whole point of batching is that each step gets full attention.
2. **Measure, do not trust.** Every claim about what Hermes, starting-kit or the
   ai-first documents do gets checked against the actual files, with the path and
   line recorded. A document that describes itself is not evidence of itself.
3. **Two independent routes.** Any number or conclusion we will act on is reached
   twice, by genuinely different methods, and the two must agree. Re-running your
   own check is not a second route.
4. **A third-person critic on every batch.** Before a batch closes, a separate pass
   tries to *break* its conclusion. It must name what it tried to break. "Looks
   good" without naming the attempt is a failed check.
5. **Write down where you looked.** When something is declared missing, say where
   you searched. "Not found" without a search list is not a finding.
6. **No known defect left open.** Anything found broken gets fixed or gets an
   explicit open item — never quietly parked.
7. **Plain English.** Short sentences. If a sentence needs a glossary, rewrite it.
8. **Every batch updates the documentation it affects.** If a batch adds or changes
   a document in `library/`, the library index is updated in the same batch. This is
   the standing answer to "keep the documentation current as we go".

---

## 3. What this programme is for

**Re-scoped by the owner on 2026-10-03.** The purpose is three things, and nothing else:

1. **Understand the vision** — `library/ai/ai-first/`. This is the target.
2. **Measure Hermes and our starting-kit** — from their **code**, to find where they stand
   together against that target.
3. **Use the rest of the library for one thing only** — understanding **Hermes** better,
   with every fact taken from it **fact-checked** against the Hermes code.

> Only when the vision, Hermes and the starting-kit are properly understood can we connect
> the dots, map it all, and write a solid development plan to reach the goal.

**Anything not serving those three is out of scope for now.**

**Read [`../ai/README.md`](../ai/README.md) first.** Two different products are called
Companai, and getting them mixed up produces wrong conclusions.

| Short name | What it is | Where |
|---|---|---|
| **VISION** | **The target.** A self-extending, local-first business operating platform whose canonical business model is the single source of truth, with Hermes as its agent runtime. 9 documents, 28,549 lines. Mentions Companai, Paperclip, Aissistant and Open Mercato **zero** times — a clean-sheet design | `library/ai/ai-first/` |
| **HERMES** | The agent runtime itself (Nous Research). A real, large codebase. Where a document disagrees with it, the code wins | `library/ai/hermes-agent-main/` |
| **STARTING-KIT** | **Our platform today.** Open Mercato 0.6.7 forked, trimmed, plus our own governance layer. The base we agreed to evolve from | `workspace/starting-kit/` |

**Not a fourth thing.** `library/ai/hermes-docs/` and the sibling project's codebase
(`konsult/aissistant-package/`) describe a *different, already-built* product that is also
called Companai — Paperclip-based, not ours. They are used for **one purpose: understanding
Hermes**, and every fact taken from them is checked against the Hermes code. Their verdicts
about their own product are dropped, not inherited.

The question the programme answers:

> **Where are the starting-kit and Hermes, together, against the vision — what do they
> already cover, what needs work, what is genuinely missing, and what is the plan to
> close the gap?**

---

## 4. Where the work goes when it is done

- Batch reports → `findings/`
- Decisions → folded into `companai/compai/planning/`
- Anything reusable as a rule → `workspace/COOKBOOK.md` or `LESSONS.md`
- The project's own start page → `companai/INDEX.md`
- A one-line dated entry per batch → `LOG.md`

---

## 5. Status

See the status table at the top of [`PLAN.md`](PLAN.md).
