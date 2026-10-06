# The `ai/` folder — two different bodies of work

> **Most of this folder is NOT ours.** It is imported study material — documentation and source
> code from other projects (Hermes, upstream Paperclip, a sibling product). It is **evidence and
> lessons only**, never a decision we inherit.
>
> **Our direction is one subfolder: [`ai-first/`](ai-first/).** If you are here to know *what we are
> building*, read [`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) first, then
> [`ai-first/README.md`](ai-first/README.md). Everything else in `ai/` is something we studied —
> open it only when a specific feature can learn from it.

**Read this before using anything in here.** This folder holds two sets of documents
that look related and are not. Getting them mixed up will produce wrong conclusions.

---

## The split

| | `ai-first/` | `hermes-docs/` + the loose files here |
|---|---|---|
| **What it is** | The design of the platform we intend to build | The documentation of a **different, already-built product** |
| **Status** | **This is the direction.** It says what we will actually do | A sibling project. Lessons only |
| **Codebase it assumes** | None — it is a clean-sheet design | Paperclip as the control plane, Hermes as the agent runtime |
| **Mentions Hermes** | yes — 6 of its 9 documents | yes, throughout |
| **Mentions Companai** | **0 documents** | 137 documents |
| **Mentions Paperclip** | **0 documents** | 230 documents |
| **Mentions Aissistant** | **0 documents** | 251 documents |
| **Mentions Open Mercato** | **0 documents** | 8 documents |

The counts above are measured, not assumed — a case-insensitive search over each set.

---

## Why this matters

The sibling project is **also called Companai**. Same name, different product, built
on a different base (Paperclip, not Open Mercato). Its documents are confident,
detailed and written by people who did the work — which is exactly why they are
dangerous to read carelessly.

Two failure modes:

1. **Inheriting decisions that were never about us.** The sibling project has an
   accepted architecture decision (ADR-001: Paperclip as control plane, Hermes as the
   runtime). That is a decision about *their* base. It is evidence about Hermes, not a
   precedent for us.
2. **Treating their measurements as ours.** Their capability ledger, their gap
   register and their contested list describe *their* product. Reusing the verdicts
   without re-measuring would be measuring a different thing than the claim names.

---

## The trap, in physical form — a file you will meet

`companai.md`, at the **root of this project**, is **not ours.**

- Its md5 is `9f6ebd12a17179eb2fc625a5e9d679d1`.
- `konsult/aissistant-package/documentation/cursor/companai.md` has the **same md5**.
- It is not in our repo: `git ls-tree HEAD` does not list it.

It is 9,429 bytes describing "Companai" as an AI-native company with twelve named AI
employees, and it says *"our platform gives us many of the primitives"*. Every sentence
is about the **other** product. Nothing inside the file says so. A reader would take it
for our vision statement.

It has been left in place — deleting another project's document is not this programme's
call — and is now **gitignored**, so it cannot be committed into our history by
accident. It is also labelled in `INDEX.md`.

This is the whole problem of this folder in one file. If you read only one thing here,
read that one with the md5 in mind.

---

## How to use each set

**`ai-first/` — read as the direction.**
It describes a canonical-business-model platform with Hermes as the agent runtime.
Where it says "the platform must", that is a requirement on us. It is the input to
the requirement register.

**`hermes-docs/` — read as lessons about Hermes, and as a warning.**
It is the only record anywhere of a real Hermes integration that ran in production.
The two incidents it records are worth more than most of the design:

- a Hermes container was **adopted** by the wrong system because compose named it
  identically to the one provisioning expected;
- a callback returned **403** because a run record was inserted without the source
  task information the normal wake path supplies.

Neither is a design opinion. Both are things that happened. Both can happen to us.

**The loose files at this level** — `PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md`,
`qwen-hermes-tool-calling-report.md`, `tiny_models/`, `integration_research/` — belong
to the sibling project's work. Useful for the local-model and integration questions;
not statements about our platform.

**`hermes-agent-main/`** — the Hermes runtime source itself. This one is neither: it
is the artefact. Where any document disagrees with it, **the code wins**.

**`paperclip-master/`** — **upstream Paperclip**, extracted from `paperclip-master.zip`
(8,299 files, version `0.3.1`). Also an artefact, and a third body of work: not ours, and
not the sibling's either — the sibling runs a *fork* of it. Its `doc/` set is the subject
of the completed study below.

**`source-docs/`** — **one place for the scattered source documents.** The study's evidence
was spread across five trees on this laptop, several of them gitignored. This folder gathers
the one set with no other home (upstream Paperclip's 317-file documentation) and holds a
**register** saying where every other set already lives. Read
[`source-docs/README.md`](source-docs/README.md) before hunting for a document.

---

## Where the two-voices rule was actually applied

The rule below is easy to state and hard to follow. The completed
[`../paperclip-hermes-study/`](../paperclip-hermes-study/) is the worked example: eleven
batches that read Paperclip, Hermes and the sibling's integration and kept the three voices
separate throughout — source code, sibling documents, and our own inference, never blended.
Its synthesis
([`findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md))
carries **lessons, not decisions**, and leaves exactly one decision to the owner.

---

## The rule that follows

> A document about the sibling project can tell us **what Hermes does** and **what
> went wrong**. It cannot tell us **what our platform should be**.
> Only `ai-first/` does that.

Anything carried over from the sibling project must be carried as a *lesson with a
reason*, never as a *decision already taken*.
