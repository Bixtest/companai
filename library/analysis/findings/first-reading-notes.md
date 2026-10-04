# 00 — First reading of the ai-first set

**Date:** 2026-10-03
**Scope:** a first pass over `library/ai/ai-first/`. Read in full: `README.md` (1,756
lines). Read in part: the Hermes research set. **Not yet read:** documents 1–7
(28,549 lines total) — that is batch 1's job.
**Status:** impressions and challenges, not findings. Nothing here is verified.

---

## 1. What the set is actually proposing

It is not "ERP plus a chatbot". It is a platform where a **canonical business model**
is the source of truth, and everything else is generated from it:

```text
Canonical Business Model
   ↓
Business IR  →  validation  →  deterministic execution
   ↓
database · API · UI · AI semantics · MCP · skills · documentation · tests
```

with **Hermes** as the agent runtime sitting beside it, and **local models** as the
normal way to run.

Two ideas carry the most weight:

- **Business IR** — the AI produces *business intent*, never SQL and never a database
  write. Deterministic software decides what is valid and does it.
- **User Functions** — a repeated, validated AI operation is saved as a
  deterministic Function, so future runs need no model at all. AI becomes a way to
  *build features*, not a permanent bill.

---

## 2. The five things that concern me

### 2.1 It never mentions what we already have

28,549 lines. Zero references to Open Mercato, to the starting kit, to Companai, or
to the governance layer we have built and tested. It is a clean-sheet design.

That is not a criticism of the document — it was written before. But it means the
set cannot know that some of it is already running in our stack. **The risk is
rebuilding working software to match a drawing.** This is why batch 6 exists.

### 2.2 The largest document is a security kernel we have largely already built

Document 7, `06_Platform_Foundation_and_Security_Kernel_Specification.md`, is
**7,017 lines — the biggest in the set.** It specifies identity, policy decision and
enforcement, authorisation down to record, field, relationship and value level,
approvals, audit and provenance, tenant-aware enforcement, prompt-injection
handling, and AI context boundaries.

We already have a working, tested version of a large part of that: the layered
resolver with an explanation trace, capability registry, effect classes, denials,
delegations, record locks, the approvals queue, and the ledger.

**This is the single biggest potential shortcut in the whole programme — and the
single biggest risk of doing the work twice.** Batch 5 has to be honest about it.

### 2.3 The design's own core rule is the rule we already enforce

Document 7 states two invariants:

> "AI may propose; deterministic platform policy must authorize; deterministic
> business services must execute; authorized result layers must control disclosure."

> "Unauthorized data should not enter an AI context in the first place."

The second one is not a goal we would have to adopt — it is the property our
authority layer was built to guarantee. Two designs arriving independently at the
same invariant is a good sign for both. Worth recording as a convergence, not a
coincidence.

### 2.4 "Capability" already means something else in our stack

The design uses **Capability** for a *business area* (Finance, Sales, HR).

Our governance layer already uses **capability** for a *permissioned action* — the
capability registry, effect classes, `authority:explain --capability <id>`.

Same word, two meanings, both load-bearing. Left alone this will cause real
confusion in code, documents and conversation. **Recommendation: pick one meaning
before batch 5, and rename the other.** My suggestion is to keep ours (it is in the
code and the CLI) and use **"business domain"** for the design's meaning.

### 2.5 A design with no code can quietly outrank working software

The set is 28,549 lines of architecture and zero lines of implementation. Designs
read as authoritative. Code is inconvenient and has bugs. The failure mode is a team
building to the drawing and throwing away a working system.

**Rule I suggest we adopt now:** where the design and the running code disagree,
the code is the incumbent and the design has to make its case.

---

## 3. Measured discrepancy found on the first pass

`hermes-docs/.../02-hermes-in-four-piles.md` (measured 2026-08-15, on the *installed
build*) states:

| | Count |
|---|---|
| `hermes/skills/` — installed by default | **81** |
| `hermes/optional-skills/` — on demand | **112** |
| **In the box today** | **193** |

A first count of the extracted repository `hermes-agent-main/` gives:

| | Count |
|---|---|
| `skills/**/SKILL.md` | **58** |
| `optional-skills/**/SKILL.md` | **152** |
| **Total** | **210** |

Same rough total, very different split. Either a different version of Hermes, a
different counting rule, or an error in one of the two. **This is exactly the kind
of quiet wrongness that costs a day later**, so it is the first thing batch 2
resolves. It also confirms the rule: measure the artefact, do not trust the report
about the artefact.

---

## 4. What I think is genuinely new — and genuinely valuable

### 4.1 User Functions

Nothing in our stack does this. It is the idea that turns AI from an operating cost
into a **feature-construction mechanism**: the customer describes a recurring need
once, the platform validates it, saves it as a deterministic Function, and from then
on it runs with no model involved.

If it works, it is also the answer to "why is this platform cheaper than an AI
assistant". I expect this to be one of the few genuinely-missing pieces.

### 4.2 The README's precedence rule

Section 14 says, in effect: invariants beat the latest design-control document,
which beats later subsystem documents, which beat earlier ones, which beat
brainstorming. Most design sets do not do this, and then argue with themselves
forever. It makes batch 1 tractable.

### 4.3 The "deliberately not decided" list

Section 15 lists what the design refuses to settle: physical schema layout, schema
partitioning, whether a graph projection is needed, the analytics engine, the vector
engine, the workflow engine, the frontend framework, the model family, quantisation,
and the cloud provider mix.

**That list is a gift.** It means we can plug in what we already have — Postgres,
our search package, our scheduler — without contradicting the architecture.

---

## 5. A concrete, measurable question worth asking early

The design's central data rule is:

> "Maximize semantic connectivity; minimize unnecessary physical coupling."

It exists to prevent **database islands** — separate copies of the same business
concept in different modules.

We run 136 tables across 39 modules. So this is not a hypothetical: **do we actually
have database islands?** That is measurable, and it is a good test of whether the
design is solving a problem we have, or a problem it imagined.

If we do not have them, that is a shortcut. If we do, the design has earned its
place. Either way it is a fact, not an opinion.

---

## 6. Correction to my own first pass — there is a large body of prior analysis

I wrote above that `CONTESTED-HERMES-VS-COMPANAI.md` had not been located. **That was
wrong, and I found it by looking properly.** It is at
`library/ai/hermes-docs/reboot/CONTESTED-HERMES-VS-COMPANAI.md` — 247 lines, status
"register open. NOTHING DECIDED. Thirteen to analyse."

Searching for it also uncovered something much bigger. `library/ai/hermes-docs/reboot/`
is **a previous, substantially complete analysis programme** — 37 entries, ~16,682
lines — containing at least:

| Document | What it is |
|---|---|
| `12-ARCHITECTURE-DECISION-COMPANAI.md` | **ADR-001, accepted by the founder 2026-08-12**: Companai uses Paperclip as the company control plane and Hermes as the managed AI runtime, joined by a versioned runtime boundary |
| `06-CAPABILITY-AND-GAP-LEDGER.md` | A 12-row ledger of product surfaces with a current verdict each |
| `CONTESTED-HERMES-VS-COMPANAI.md` | The 13 contested items, deliberately held open for the founder |
| `13-HERMES-CAPABILITY-MATRIX.md` | A Hermes capability matrix |
| `00-CURRENT-STATE.md` | Where development actually stopped, including two real incidents |
| `17-TQM-REVIEW-PROTOCOL.md`, `11-DEVELOPMENT-RULES.md` | The review protocol and the development rules |
| `15-ENGINEERING-COOKBOOK.md` (1,941), `cookbook_light.md` (1,638), `reboot.md` (4,952) | The working cookbooks |

**This changes the plan.** Batches 2, 4 and 7 as I first wrote them would have
redone work that has already been done, on a product that already exists. The
integration question Ramzi is asking has been answered once before — for a different
codebase — and the answer is written down.

So the plan now opens with a batch whose only job is to read that prior analysis and
decide what still holds. That is batch 1.

**A caution that goes with it.** The prior analysis was done for **Paperclip /
Aissistant**. We are now building on **starting-kit (Open Mercato)**. ADR-001 names
Paperclip as the control plane; our control plane is now a different fork entirely.
So the prior decisions may not transfer — but they were made with far more evidence
than we have today, and the two incidents they record (a Hermes container being
adopted because it shared a name, and a callback returning 403) are exactly the kind
of thing that repeats. **Read it before disagreeing with it.**

---

## 7. What I have not done

Stated plainly so nobody mistakes this for more than it is:

- I have **not** read documents 1–7 in full. Only the README was read end to end.
- I have **not** verified any claim in the ai-first set against code.
- I have **not** measured Hermes beyond the skill counts above.
- I have **not** read the reboot set (16,682 lines) beyond four document headers.
- I have **not** read the aissistant work records (B1–B10) or the forensics documents.
- I have **not** yet established the relationship between the names in play —
  **Paperclip**, **Companai**, **Aissistant**, **starting-kit** and **Hermes** all
  appear, and I am not yet certain which is which. Batch 0 fixes that.

All of that is what batches 0 to 11 are for.

