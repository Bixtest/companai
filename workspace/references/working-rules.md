# Working Rules

Adopted from [`skills-main`](../../skills-main) — the agent methodology Open
Mercato was itself built with. Each rule below says what we took and why it
applies to us.

---

## 1. Read-only analysis is a separate step from mutation

`skills-main` splits `om-verify-in-repo` (is this real?) → `om-root-cause`
(read-only: where is it, what is the minimal change) → `om-fix` (implements what
was proposed).

**We adopt this wholesale.** The agent that decides what to keep never deletes.
The agent that deletes acts on a committed report and does not re-decide.

Why it matters here: deletion is irreversible in effect even when the git history
survives, because nobody goes looking for what they already agreed to remove.

## 2. Bounded exploration

> *"Stop reading project context as soon as you can name the file(s) involved —
> do not pre-emptively read the whole codebase."*

Analysis has a stopping condition. Ours is the seven questions in
[salvage-analysis.md](salvage-analysis.md). Answer them, write the report, stop.

## 3. A departure from local convention is the signal

> *"Watch for departures from the project's own conventions in the area… A bug is
> often exactly such a departure from the local pattern."*

Applied to salvage: **a file that does not look like the rest of its module is
the thing most likely worth keeping.** `domain_mappings` did not look like CRM.
That was the tell, and nobody was reading for it.

## 4. Reports are deliverables, not logs

> *"User-facing output is a deliverable, not a log: complete sentences, the why
> behind every verdict, so a reader who never watched the run understands it from
> the report alone."*
>
> *"Never improvise a terser variant to save tokens — token economy is paid by
> granulating layer 3, not by thinning the deliverable."*

We write full reports. Effort is saved by not producing detail nobody needs, never
by compressing the thing that gets read.

## 5. Complete the analysis before reporting the blocker

> *"A red signal does not short-circuit the review… one review cycle gives the
> author the failing check, the conflict, and every code finding at once, rather
> than the cheapest red flag first and another cycle to discover the rest."*

If a strip batch hits a blocker, finish analysing the batch and report everything
together. Do not stop at the first failure and hand back a partial picture.

## 6. Priority and risk are different axes

> *"Priority is how urgent the work is; risk is how dangerous the change is to
> ship."*

`skills-main` scores both independently — a one-line outage fix is
priority-extreme / risk-low; a large auth refactor that can wait is priority-low
/ risk-high. **This is our task-grade model arriving from the other direction**,
and it confirms the design in `planning/02`.

Every batch in this cookbook carries both:

| Risk | Meaning |
|---|---|
| **high** | auth, sessions, data scoping, schema migrations, shared contracts, cross-cutting edits |
| **medium** | a single-area change shipping with tests |
| **low** | docs-only, test-only, isolated |

R1, R2, R5, R6 and every strip batch touching `auth` or `directory` are
**risk-high** by definition. When signals conflict, take the higher and say why.

## 7. Evidence, or it did not happen

> *"No evidence, no `qa-approved`."*

A batch is done when the gate is green **and** the evidence is recorded — the
command output, not a claim that it passed. This applies especially to P3, the
baseline build I never verified during the assessment.

## 8. Autonomy with documented defaults

> *"When a decision is needed mid-run it makes the recommended, most-reversible
> call itself and documents it, instead of stopping to ask."*

Make the reversible call, write it down, keep going. Reserve stopping for the
four cases in [COOKBOOK.md](../COOKBOOK.md) → *When to stop and ask*.

## 9. Token economy — router and terrain

> *"The body is a router + map, not the terrain… Safety always loads on every
> run, never behind a lazy conditional."*
>
> *"After the split, the body alone must still tell **what** the skill does,
> **in what order**, and **where** to find detail."*

`COOKBOOK.md` is the router. Detail lives here in `references/`. But the three
overriding rules and the stop conditions stay **in the cookbook body** — safety
never moves behind a link.

## 10. Config and process change together

> *"This document and `.ai/agentic.config.json` describe the same process: change
> them together."*

The validation gate is written in the cookbook **and** in the repo's config. If
they drift, the gate means nothing.

## 11. Decisions are recorded so they are not silently reversed

> *"Read `DECISIONS.md` before proposing structural changes — most 'obvious'
> restructurings were already considered and decided."*

Ours live in `planning/00 §6` (decisions register) and `planning/CHANGELOG.md`.
A batch that reverses one says so explicitly and updates the register.

---

## Severity scale

Adapted from `CODE_REVIEW.md`, for findings during strip, repair and graft:

| Severity | Meaning |
|---|---|
| **Critical** | Something needed was deleted, an invariant (I1–I15) was broken, a security boundary weakened, or a shared contract changed without updating its consumers |
| **Major** | Ambiguous enough that two reasonable engineers would do different things; a portability break; a kept module left depending on something removed |
| **Minor** | Naming, structure or consistency drift that does not change behaviour |

**Escalation paths, taken directly from `skills-main`:** a change that moves
safety behind a conditional, or that alters a string other code parses, is
**Critical** — not a stylistic nit. In our terms: deleting a capability id, event
name or entity id that something still references by string is Critical, however
tidy the diff looks.

---

## Report template

```markdown
# <Batch id> — <name>

**Risk:** high · medium · low   **Status:** ✅ done · ❌ blocked · ⚠ needs human
**Gate:** <verbatim result of the five commands>

## 🎯 What this batch did
<Full sentences. What changed and why.>

## 📋 Changes
- <path> — <what and why>

## 🔍 Findings
| Severity | Finding | Action |
|---|---|---|

## 🧪 Evidence
<Command output. Not a claim that it passed.>

## ⚠ Decisions taken autonomously
<Every reversible call made without asking, and its reasoning.>

## Next
<What the following batch should know.>
```

Emoji glossary, used only for these meanings — taken verbatim so our output stays
consistent with the toolchain's:

> 🎯 goal · 📋 plan · 📝 spec · 🏷️ labels · 📸 evidence · 🔍 review · 🧪 tests ·
> 💥 breaking · ✅ pass · ❌ fail · ⚠️ needs-human · ⛔ blocked · 🔁 resume · 🚀 merge
