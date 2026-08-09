# 12 — Platform Assessment Methodology

**Status:** v1, distilled from the `Platform/` assessment (2026-08-08)
**Purpose:** a repeatable method for judging a candidate codebase against our
platform, so each assessment is faster, more consistent and less wrong than the
last.
**Refined by:** every assessment. See [§9](#9-refinement-log).

This document exists because the first assessment produced four errors that a
method would have prevented. They are named in [§7](#7-traps-with-the-actual-mistakes)
rather than quietly fixed, because the errors are the most instructive part.

---

## 0. The programme this serves

We assess several platforms, and the assessments are not independent verdicts.
They feed one strategy:

```text
  assess N platforms
        │
        ├── harvest IDEAS      →  our design docs (00–07) + CHANGELOG
        └── tag CODE           →  per-platform salvage map
        │
        ▼
  SELECT one platform as the HOST
        │
        ▼
  STRIP it — remove what we do not need
        │
        ▼
  DEVELOP the kernel and product on it
        │
        ▼
  GRAFT adapted pieces from the DONOR platforms until they are
  organic to the host — its idioms, its DI, its ORM, its module contract
```

### Host and donor are different roles, judged differently

This distinction is the reason this section exists, and getting it wrong would
invalidate a scorecard.

| Role | Judged on | Question |
|---|---|---|
| **Donor** | What it *has* | Which pieces are worth taking? |
| **Host** | How well it *receives* | How cheaply can foreign code be made organic here? |

**A platform can be the best donor and the wrong host.** Donor value is
feature-weighted; host value is *architecture*-weighted — module contract
strength, dependency injection, ORM neutrality, migration discipline, generator
or registry systems, test scaffolding, and how strictly boundaries are enforced.

Host-fitness criteria, scored separately from the rubric in
[platform-evaluation-rubric.md](platform-evaluation-rubric.md):

| # | Host criterion | Why it decides graft cost |
|---|---|---|
| H-1 | **Module contract strength** | A foreign capability arrives as a module or it arrives as a mess |
| H-2 | **Dependency injection** | Container-based DI lets a grafted service be registered rather than wired |
| H-3 | **ORM / persistence neutrality** | Grafting across ORMs means rewriting every entity and migration |
| H-4 | **Migration ownership** | Per-module migrations let a graft bring its own schema |
| H-5 | **Boundary enforcement** | Enforced boundaries mean a graft cannot quietly couple to the host |
| H-6 | **Codegen / registry** | A generated registry absorbs new modules without editing core |
| H-7 | **Test and CI scaffolding** | A graft is only safe if the host can prove it did not break anything |
| H-8 | **Strip cost** | How much must be deleted before development starts, and how entangled is it |

### Salvage items need portability metadata

"Useful" is not enough once code may move between codebases. Every salvage item
in a `03-identity-and-salvage-map.md` carries:

| Field | Meaning |
|---|---|
| **Verdict** | LIFT · ADAPT · PATTERN · REPLACE · BUILD (as before) |
| **Dependency footprint** | What it drags with it — packages, ORM, DI, framework |
| **Extraction cost** | Effort to lift it out of its own codebase |
| **Graft cost** | Effort to make it organic in a *different* host |
| **Organic fit** | Which hosts it fits without rewriting (same ORM? same DI? same module shape?) |

A component with high salvage value and high graft cost is a **PATTERN**, not a
**LIFT**, no matter how good it is. Recording this at assessment time is far
cheaper than rediscovering it during migration.

### The cross-platform harvest ledger

Ideas are consolidated in [../CHANGELOG.md](../CHANGELOG.md) with origin named.
Code is consolidated at selection time into a single comparison across all
`03-identity-and-salvage-map.md` documents — because the same need may be met by
two platforms, and the decision is then *which donor*, not *whether*.

---

## 1. When to use this

Any time we evaluate an external or inherited codebase for adoption, forking,
harvesting or reference. It assumes the target is large enough that reading it
end to end in one pass is impractical, and that the decision matters enough to
justify a day or more.

It does **not** apply to evaluating a library or a single dependency. That is a
smaller question with a smaller method: read the docs, check the licence, check
the release cadence, write a spike.

## 1a. The orientation rule — binding, and checked every batch

**Assume the whole project is handed tomorrow to a developer who knows nothing
about it.** They must be able to start from **one page** and reach everything —
never by exploring folders and inferring.

Three files carry this, and they are **deliverables, not documentation**:

| File | Answers | Updated when |
|---|---|---|
| `INDEX.md` at the project root | *Where do I start? What is everything?* | Any folder added, phase completed, or decision made |
| `JOURNAL.md` | *How did we get here?* | A decision, a completed phase, or a surprising finding |
| `LESSONS.md` | *What traps are already known?* | Immediately when a mistake or near-miss is caught |

**Rules.**

1. **One entry point.** `INDEX.md` is the only thing a newcomer must be told to
   read. Everything reachable within two clicks.
2. **Update in the same change.** A batch that adds a folder or makes a decision
   and does not update `INDEX.md` is **not finished**.
3. **Record mistakes as they happen**, not at the end. A near-miss counts. Write
   what was believed, how it was caught, what it would have cost, and the rule
   that prevents it.
4. **Written for someone who was not there.** No shorthand, no assumed context.
5. **The test:** could a competent stranger orient themselves from `INDEX.md`
   alone? If not, the page is broken — fix the page.

Why this is in the *methodology* and not a nice-to-have: this project has already
produced 20+ design documents, two full platform assessments and a live codebase.
That is a jungle to anyone who was not present for it, and the value of every
document in it drops to near zero if nobody can find the way in.

## 2. Principles

### P1 — North star before target

Before opening the target, restate what *we* need in our own vocabulary: the
kernel services, the invariants, the rubric. Every finding is then expressed as
**fit against our model**, not as a tour of their features.

The failure this prevents is real and insidious: a deep code read quietly
re-frames the goal around whatever the target happens to do well. You start
asking "how would we use their Spaces?" instead of "do they solve addressing?"

### P2 — Code is evidence; documentation is a claim

Read source first, documentation second. Every documentation statement is a
hypothesis to verify, including — especially — statements marked *Complete*,
*Shipped*, *Done*, or *INTEGRATED*.

### P3 — A schema is not a behaviour

The presence of a type, column, enum or interface proves only that someone
intended something. It is not evidence that the runtime uses it. **Every property
you intend to credit must be traced through at least one complete execution
path.** This is the single most expensive lesson from assessment 1 — it caused
two of the four errors.

### P4 — Prove absence explicitly

"I didn't see it" is not a finding. `grep -rli` returning zero matches across all
source **is** a finding, and it is often the most decisive one available. Write
the search down so it can be re-run.

### P5 — Separate observation from judgement

Two documents, always. A forensic record that a hostile reader could verify, and
a verdict that argues from it. Mixing them makes the evidence unfalsifiable and
the judgement unpersuasive.

### P6 — Cost decides, not score

A weighted score orders candidates; it does not make the decision. The decision
is whether **repair cost < replacement cost**, and that comparison is routinely
made on optimism rather than an estimate.

### P7 — Batch, and finish each batch

Each batch has a defined scope, produces written output before the next begins,
and is not revisited casually. This is what keeps attention high across a large
target — confirmed in practice on assessment 1, where the batched documentation
review surfaced materially more than the unbatched first pass.

---

## 3. The batch structure

Seven batches. Each has an entry condition, a method, and a written exit artefact.
**Do not start a batch before its predecessor's artefact exists.**

### Batch 0 — Orientation (do not read code yet)

| | |
|---|---|
| **Goal** | Know the shape and size before forming any opinion |
| **Method** | File counts by type and area · total LOC · directory tree to depth 3 · package manifests · licence · commit cadence if git is present · list documentation without reading it |
| **Exit** | A size/shape table. A batch plan sized to what you found. |
| **Time** | 15–30 min |

Deliberately *not* done here: reading the README. It frames you before you have
any independent picture.

### Batch 1 — Kernel contracts, read completely

| | |
|---|---|
| **Goal** | Understand the target's model of identity, authority, data and extension |
| **Method** | Read **in full**: shared type/contract packages · database schema · every migration · enum definitions · the module/extension contract |
| **Exit** | The model as they see it, in our vocabulary. First fatal-flaw screen. |
| **Time** | 1–2 h |

This is where the verdict is usually decided. Contracts are small, dense, and
tell you what is structurally possible.

### Batch 2 — Enforcement paths, traced end to end

| | |
|---|---|
| **Goal** | Establish which claimed properties are actually enforced |
| **Method** | Pick 2–3 representative write operations. Trace each from HTTP entry → authorisation → validation → persistence → audit → event. Count enforcement call sites. Look for guards, interceptors, transactions. |
| **Exit** | For each property (authorisation, audit, atomicity, attribution, tenancy): *enforced / partially enforced / declared only*. |
| **Time** | 1–2 h |

**This batch is mandatory and was the one skipped in assessment 1.** It is what
catches non-transactional audit and dead correlation ids.

### Batch 3 — Verification and probes

| | |
|---|---|
| **Goal** | Independent evidence, not reading |
| **Method** | Run typecheck, tests, build. Run the probe catalogue ([§4](#4-the-probe-catalogue)). Record commands and outputs. |
| **Exit** | A table of probe → result → what it proves |
| **Time** | 1 h |

### Batch 4 — Documentation, batched by kind

| | |
|---|---|
| **Goal** | Harvest *ideas*, and measure documentation reliability |
| **Method** | Group by kind, not folder: **vision/policy** → **architecture contracts** → **feature specs** → **process/ops**. Read in that order. Skip pure execution logs. For every "Shipped"/"Complete" claim, verify against the filesystem. |
| **Exit** | Notes file with `→ Integrated` / `→ Recorded` / `→ Declined + reason` on each idea. Documentation reliability assessment, **per document**. |
| **Time** | 2–4 h |

Ideas are frequently worth more than code. In assessment 1 the documentation
produced the Knowledge Cell, the Garage, beams, Flow Trace, `as_of` and four new
invariants — none of which existed in the code.

### Batch 5 — Second forensic pass

| | |
|---|---|
| **Goal** | Catch what the first pass credited without checking |
| **Method** | Re-read every file you have *not* opened. Then re-verify each property you credited in Batch 1–2 against the runtime, not the type. Diff schema-as-declared against schema-as-migrated. |
| **Exit** | Corrections to earlier artefacts, stated as corrections |
| **Time** | 1–2 h |

Assessment 1 found three corrections here, all of them properties wrongly
credited. Assume this batch will find something; if it finds nothing, you
probably did not look hard enough.

### Batch 6 — Verdict and salvage mapping

| | |
|---|---|
| **Goal** | The decision, and the reuse plan that makes it actionable |
| **Method** | Score the rubric · apply the three-bucket partition · estimate repair vs replacement · map every one of our needs to LIFT/ADAPT/PATTERN/REPLACE/BUILD with file paths |
| **Exit** | Verdict document + identity/salvage mapping document |
| **Time** | 2–3 h |

The salvage map is the highest-value artefact for development and the easiest to
skip. Do not skip it.

---

## 4. The probe catalogue

Each probe is a question with a mechanical answer. Run all of them; they are
cheap and they are what separates evidence from impression.

| # | Probe | Method | What it proves |
|---|---|---|---|
| **P-1** | **Absence** | `grep -rli "<our core concepts>" --include=*.<ext> <src>` | Whether a claimed capability exists at all. Zero matches is decisive. |
| **P-2** | **Non-human principal** | Find where an actor is loaded and authorised. Could a non-human act without a fake email / shared account / impersonation flag? | Fatal flaw F2, and its blast radius |
| **P-3** | **Chokepoint count** | Count enforcement call sites; look for guard/interceptor/middleware | Whether authority is centralised in *invocation*, not just in logic |
| **P-4** | **Write trace** | Follow one write end to end | Which properties are real (see Batch 2) |
| **P-5** | **Transaction boundary** | Search for unit-of-work / `.transaction(` / equivalent; check whether audit shares it | Atomicity of audit and mutation |
| **P-6** | **Field liveness** | For every field you intend to credit, grep its *assignment* sites | Whether a field is populated meaningfully or with a placeholder |
| **P-7** | **Schema/migration diff** | Tables declared in ORM vs tables created in migrations | Drift, orphans, and how disciplined the team is |
| **P-8** | **Tenancy** | Discriminator on every table? Global unique constraints? RLS? | Cost of multi-tenancy retrofit |
| **P-9** | **Immutability** | Constraints, rules, triggers, revokes on the audit store | Whether "append-only" is enforced or conventional |
| **P-10** | **Query shape** | Look for select-then-filter-in-memory on hot paths | Whether performance was designed or deferred |
| **P-11** | **Foreign keys** | Which columns are hard-wired vs deliberately loose | Where a refactor will hurt — often decides shallow vs structural |
| **P-12** | **Claim verification** | For each documentation "Shipped" claim: does the route/file/symbol exist? | Documentation reliability, per document |
| **P-13** | **Build reality** | Run typecheck, tests, build; record counts | Whether the thing works at all |
| **P-14** | **Test integrity** | Do tests assert on boundaries the code enforces? | Whether the suite means anything. A test on an unenforced boundary is worse than no test. |
| **P-15** | **Escape hatches** | Search for bypass flags, no-op stubs, dev-only modes | Hidden risk (`LOCAL_NO_DB`, `ALLOW_UNSIGNED_IDENTITY`, bootstrap tokens) |
| **P-16** | **Churn** | Commit history on the files we would modify most | Cost of maintaining a fork |

---

## 5. Scoring and verdict

### 5.1 Fatal-flaw screen first

Run it before scoring. A fatal flaw ends the evaluation; do not hope the total
rescues it. Current screen is in [Rubric §2](../method/platform-evaluation-rubric.md).

### 5.2 The blast-radius test — shallow or structural?

**The most important refinement from assessment 1.** A flaw that fails the screen
is not automatically fatal. Ask:

> Is this defect **concentrated** or **diffused**?

`Platform/`'s human-only principal model failed the screen. But it lived in one
enum, one lookup function and one table's foreign keys, because `actor_id` and
`principal_id` carried **no foreign keys** in the hot paths. Concentrated →
bounded repair → **EVOLVE**. Had those keys been hard-wired throughout, the same
symptom would have been structural → **REFERENCE**.

Same symptom, opposite verdicts. Probe **P-11** is what tells them apart, and it
is the single highest-leverage probe in the catalogue.

### 5.3 Absent ≠ wrong-shaped

The rubric scores 0 for absent and 1 for present-but-wrong-shaped. That ordering
is right when adopting a third party (you inherit what is there) and **backwards**
for anything we planned to build ourselves:

```text
absent          costs  what we already budgeted
wrong-shaped    costs  that  +  demolition  +  risk of leftover fragments
```

So report the raw score **and** the corrected partition. Do not silently adjust
the score to fit the conclusion — record the discrepancy and explain it.

### 5.4 The three-bucket partition

More decision-useful than any number:

| Bucket | Meaning | Cost |
|---|---|---|
| **Keep** | Right shape, expensive and boring to rebuild | Free |
| **Change** | Wrong shape, must be demolished before building on | Repair |
| **Build** | Absent, and always was going to be | Already budgeted |

**The length of the Change list is the verdict.** If it is short and each item is
bounded, adopt and repair. If it is long or any item is diffuse, do not.

### 5.5 Cost comparison

State two numbers and defend them:

- **Repair cost** = the Change list, in files and migrations
- **Replacement cost** = what the Keep list would cost greenfield, honestly
  including the unglamorous parts that get rushed

### 5.6 Verdict vocabulary

| Verdict | Meaning |
|---|---|
| **Adopt** | Build our kernel inside it |
| **Evolve** | Adopt as foundation, rebuild the kernel on top (own or inherited code, no upstream) |
| **Fork** | Take it and reshape, accepting rebase cost |
| **Harvest** | Take modules, UI, connectors, patterns — not the foundation |
| **Reference** | Read, learn, build our own |

**Evolve** was added after assessment 1: the rubric's categories assumed a
third-party project with an upstream. For our own code, fork cost is zero and
"adopt" and "fork" collapse into one option that neither label described.

---

## 6. Deliverable set

Five artefacts per platform, numbered in sequence:

| Artefact | Content | Template |
|---|---|---|
| **Forensic analysis** | What it is, from source. Neutral, verifiable. | [T-1](#t-1--forensic-analysis) |
| **Verdict** | Scored, argued, decided | [T-2](#t-2--verdict) |
| **Identity & salvage mapping** | Stack, database, need→code map | [T-3](#t-3--identity--salvage-mapping) |
| **Docs review notes** | Ideas harvested, declined, with reasons | [T-4](#t-4--documentation-review-notes) |
| **Changelog entry** | What changed in our design, and why | [T-5](#t-5--changelog-entry) |

---

## 7. Traps, with the actual mistakes

The four errors from assessment 1, named. Each has a probe that prevents it.

### Trap 1 — Generalising documentation trust

**What happened.** I read the top-level README (accurate, honest, listing its own
gaps), and concluded "the current documentation is trustworthy." A document in
the same folder marked Garage, Assets Store, AI Studio, `/signup` and
`/settings/*` as **Shipped**. None existed — zero grep matches.

**Rule.** Documentation reliability is **per document, never per folder, per date
or per project**. Verify claims from at least three documents before generalising
about any of them. → **P-12**

### Trap 2 — Crediting a property from its type

**What happened.** I saw `DomainEventEnvelope` with `correlation_id` and
`causation_id`, saw the audit repository, and credited the codebase with
correlation and transactional audit. Neither was true: every `correlation_id` is
a fresh `randomUUID()`, `causation_id` is always `null`, and no unit of work
exists.

**Rule.** A field's existence proves intent, not behaviour. Grep its **assignment
sites**, not its declaration. → **P-3, P-4, P-5, P-6**

### Trap 2b — Discrediting a property from an absent keyword

**The inverse of Trap 2, and it bit three times in one batch on Open Mercato.**

| I concluded | From | Reality |
|---|---|---|
| "AI cost budgets are absent" | grep for `budget` → only test timeouts | Comprehensive token-usage tracking per agent/module/session/turn/step. They call it *token usage*. |
| "Model policy is global, not scoped" | env-var counts (`OM_AI_PROVIDER`) | Two-level DB allowlist: tenant ceiling + per-agent selection. Env vars set *defaults*. |
| "Features carry only id/title/module" | one module's `acl.ts` | Features also carry `dependsOn` — a capability dependency graph |

**Rule.** A concept is absent only when you have searched for **the vocabulary
that codebase uses**, not the vocabulary ours uses. Before declaring absence:

1. search your term, then **at least two plausible synonyms** the target might use;
2. check the **data model** — entity/table names are the most reliable vocabulary
   index a codebase has;
3. if the concept would need persistence, absence in the schema is strong
   evidence; absence in a keyword grep is weak evidence.

A false absence is more dangerous than a false presence, because it silently
removes a candidate's strongest feature from the comparison.

### Trap 3 — Scoring absence as a defect

**What happened.** Category A scored 2.0/5 largely because canonical entities,
tags and addressing were missing — three things we had already budgeted to build.
The number understated the codebase and would have misled a reader.

**Rule.** Always publish the three-bucket partition beside the score. → [§5.3](#53-absent--wrong-shaped)

### Trap 4 — Reading documentation before code

**Nearly happened.** The instinct is to start with the README because it is
inviting. Doing so on `Platform/` would have framed the entire assessment around
"AI-first platform", when zero source matches exist for `agent`, `charter` or
`ai_worker`.

**Rule.** Batch 0 lists documentation. Batch 4 reads it. → **P-1**

### Other traps to watch

| Trap | Guard |
|---|---|
| **LOC as value** | 30,700 lines yielded ~3,200 worth keeping. Measure concentration, not volume. |
| **The impressive-README halo** | Quality of writing correlates weakly with quality of code, and sometimes inversely. |
| **Green tests as proof** | Ask what they assert on. A suite testing an unenforced boundary manufactures confidence. → **P-14** |
| **Vocabulary capture** | If your notes start using their nouns for our concepts, stop and re-read the north star. |
| **Sunk-value defence** | "It's already written" is not an argument. Small codebases are cheap to change; say so. |
| **Choosing between candidates** | The answer may be *evolve one and harvest another*. Evaluate the combination explicitly. |

---

## 8. Templates

Skeletons. Adapt freely; keep the section order so documents are comparable
across platforms.

### T-1 — Forensic analysis

```markdown
# NN — Forensic Analysis: <name>

**Subject:** <path> — <product name>
**Method:** <what you read, ran, diffed>. Documentation read *after* code and
used only to check claims.
**Date:**

## 1. Verified facts
Table: size · stack · typecheck · tests · build · migrations — each with how verified.

## 2. What is actually implemented
Only what you traced. Cite file:line.

## 3. What is declared but not implemented
The heart of the document. Quote self-documenting TODOs.

## 4. Structural findings against our kernel
### 4.n — <finding>
Evidence table (claim | file:line). State whether the defect is concentrated
or diffused (P-11).

## 5. Documentation accuracy
Per document, not per folder. Include the verification table.

## 6. Summary table
Layer → state.
```

### T-2 — Verdict

```markdown
# NN — Fit Assessment and Verdict: <name>

## 1. Fatal-flaw screen
Table with pass/fail/near-miss. For near-misses, apply the blast-radius test.

## 2. Scorecard
Weighted categories with per-criterion scores.

## 3. Why the raw score is (or is not) misleading
Absent vs wrong-shaped. Record rubric flaws rather than adjusting scores.

## 4. The honest partition
Keep / Change / Build. The Change list length is the verdict.

## 5. Cost comparison
Repair cost vs replacement cost, both defended.

## 6. Verdict
One of: Adopt · Evolve · Fork · Harvest · Reference.
What it is. What it is not. Conditions.

## 7. Recommended sequence
Numbered steps with a gate per step.

## 8. Risks
Institutional risks first — they outlast technical ones.

## 9. What this means for the next candidate
The bar this sets; combination options.
```

### T-3 — Identity & salvage mapping

```markdown
# NN — <name>: Identity, Database, and Salvage Mapping

# Part 1 — Identity
1.1 Technology stack (exact versions, per app/package)
1.2 Runtime topology (diagram, ports)
1.3 Environment contract
1.4 Infrastructure images

# Part 2 — Database
2.1 Physical tables — # · name · key columns · notes
2.2 Enums, extensions, indexes, RLS, immutability
2.3 Migration tooling

# Part 3 — Corrections to earlier analysis
Anything the second pass overturned. State as corrections.

# Part 4 — Salvage mapping
Legend: LIFT · ADAPT · PATTERN · REPLACE · BUILD
4.1–4.n  One table per kernel service:
         our need | what exists | where (file:line) | verdict | effort saved
4.x  Cross-cutting quiet wins
4.y  Ranked salvage inventory (what to copy first)
4.z  Explicit do-not-carry list

# Part 5 — What this means for sequencing
```

### T-4 — Documentation review notes

```markdown
# Working Notes — <name> documentation review

One section per batch. `→` marks integration.

## Batch <X> — <kind>
**Read:** <files>
**Skimmed as non-idea-bearing:** <files>

### X1 — <idea> ★★★
What it is. Why it matters to us. What it changes.
→ **Integrated** into [doc §section] · or **Recorded** · or **Declined**

### Deliberately not taken
| Idea | Why not |

### Observations
Process/meta observations worth keeping.
```

### T-5 — Changelog entry

```markdown
## <date> — Batch <X>: absorbed from <source>

### Added — <category>
| Change | Where | Origin |

### Validated without change
Independent arrivals at our design. Raises confidence, changes nothing.

### Corrected
| Correction | Where |

### Deliberately declined
With reasons, linked to notes.
```

---

## 9. Refinement log

| Version | Date | Change |
|---|---|---|
| v1 | 2026-08-08 | Created from the `Platform/` assessment. Introduced: Batch 2 (enforcement tracing) and Batch 5 (second pass) as mandatory; the 16-probe catalogue; the blast-radius test; absent-vs-wrong-shaped correction; the **Evolve** verdict; four named traps. |
| v1.1 | 2026-08-08 | **Scale adaptation**, from Open Mercato's Batch 0 (1.32M LOC — 43× the first target). See below. |

### v1.1 — Batch 0 must locate the kernel, not just measure the target

On a target above roughly 100k LOC, "read the kernel contracts completely"
(Batch 1) stops being a literal instruction. Batch 0 therefore has a second
obligation: **separate the framework layer from the product layer** and state
which is which, in LOC.

- **Framework layer** — module contract, DI, ACL, entity engine, event bus,
  migrations, auth. Read in full in Batch 1. Usually small.
- **Product layer** — domain modules. **Sampled**, not read. Choose samples by
  relevance to our kernel, not by size.

Open Mercato's framework layer is a few thousand lines; its product layer is
1.3 million. Reading it as one undifferentiated mass would have consumed the
entire assessment and answered nothing.

Two consequences for the batch plan on large targets:

- Batch 4 becomes **module sampling** with a named, justified sample list,
  written down *before* reading so the sample cannot drift toward whatever turns
  out to be interesting.
- The salvage map (Batch 6) is per-module rather than per-file. Its unit of reuse
  is "this module", not "this function".

| v1.2 | 2026-08-08 | Added [§0](#0-the-programme-this-serves) — host/donor roles, host-fitness criteria, salvage portability metadata, cross-platform harvest ledger. Plus the two rules below. |

### v1.2a — Documentation acquisition: prefer the source, verify the crawl

Before crawling a documentation website, **check whether its source is in the
repository.** Modern doc sites (Docusaurus, Nextra, VitePress, mkdocs) ship their
markdown in-tree with a sidebar file that is the literal navigation tree.

In-repo documentation is strictly better than crawling:

- **complete and enumerable** — you can count the pages and prove coverage;
- **offline** — no rate limits, no JS rendering, no pagination guesswork;
- **version-matched to the code being assessed** — the live site may document a
  newer release than the checkout, which silently produces false findings.

If you must crawl, **verify the crawl before relying on it**: fetch one page whose
content you already know and confirm the fetcher returned *that page* rather than
the site shell. On Open Mercato this test failed — a request for
`/architecture/system-overview` returned the homepage — and would have produced
a confidently wrong documentation review had it not been checked.

Record the acquisition method and the verification result in the forensic
document. "I read the documentation" is not a method.

### v1.2b — Relevance triage must be derived from the dependency graph

On a large product-heavy target, most modules are irrelevant to us and skipping
them is correct. But the skip list is derived, not guessed:

1. Find the **declared** dependency mechanism (`requires`, peer deps, manifest
   fields) and the enforcement point.
2. Measure **actual** coupling independently — cross-module import counts. The
   two rarely agree, and the gap is itself a finding.
3. Skip only a module that **nothing in the keep set depends on**, by either
   measure.
4. Write the keep/skip list down **with a one-line justification per entry**
   before reading anything.

Two traps this prevents, both live on Open Mercato:

- **Skipping by domain intuition.** `directory` sounds peripheral; it is
  "Tenants & Organizations" with 228 inbound imports and carries the org model.
- **Missing relevance behind a domain name.** `inbox_ops` reads as ERP inbox
  tooling; it is "Email-to-ERP **Agent**" — an AI module.

**After each assessment, update this document with:** any trap that caught us,
any probe that proved decisive, any probe that proved useless, and any verdict
the vocabulary could not express.

The measure of this method is not that it produces confident assessments. It is
that assessment *n+1* makes fewer errors than assessment *n*, and that the errors
it does make are new ones.
