# 08 — THE SRS

**The requirement set produced by the mapping pass. 53 requirements — `SR-01` … `SR-46`
plus seven sub-lettered additions (`SR-19a`, `SR-19b`, `SR-21a`, `SR-22a`, `SR-32a`, `SR-33a`,
`SR-35a`) — across six poles.**

**The frame (owner, 2026-10-16):** *"we are not limited by what mercato allows. we want to
engineer the best, richest, most versatile and integratable version of each pole plus the
extra features, plugins, modules, ideas, architecture, etc the platforms inspire and
reengineer accordingly."*

Every requirement below is traced to the platforms that demand it and the plan item that
builds it. Where a requirement already exists in the register, it is **extended**, not
duplicated.

---

## 1. How to read a row

| Column | Meaning |
|---|---|
| **SR-nn** | The requirement. New vocabulary; never collides with `S-*` (standards) or `SD-*` (slices). |
| **Source** | The platforms that demand it, with the citation that proves the mechanism exists. |
| **Status** | `HAVE` (exists, named) · `BUILD` (planned, register item) · `BORROW` (mechanism from a platform) · `RE-ENGINEER` (target exceeds current state). |
| **Register** | The existing item it extends: `CC-*` build queue, `G-*` vision, `M*` missing module. |
| **Gate** | Prerequisite / trigger, where one exists. |

---

## 2. The register at a glance

| ID | Pole | Requirement | Source | Status | Register |
|---|---|---|---|---|---|
| SR-01 | P1 | Typed engine port; nothing above it imports Hermes | Hermes | HAVE | `P2-1…P2-9a` |
| SR-02 | P1 | `agent` ≠ `agent_runtime`; uniqueness key as a DB constraint | Multica | BORROW | — |
| SR-03 | P1 | Permission policy ladder as data | openrig | BORROW | — |
| SR-04 | P1 | Two-surface rule: policy set by code, never config | openrig | BORROW | — |
| SR-05 | P1 | Sub-agent spawn cap (measured) + spawn ledger | n8n (max-children cap, `07-SYNTHESIS §7.2` F02-04); Hermes (iteration cap) | BUILD | — | **[C]**
| SR-06 | P1 | Skills as versioned `SKILL.md` artifacts | n8n, Hermes | BORROW | — |
| SR-07 | P1 | A bot is a participant, not a parallel object | zulip | BORROW | — |
| SR-08 | P1 | The triage core gets a production caller | mercato | BUILD | `G-21`, `CC-59`, `CC-60` |
| SR-09 | P1 | Typed tool filter with `run_context`; typed tool failures | CrewAI (`02-the-aissistant §5.2, §8` — its own pick, "the single most actionable finding for our aissistant") | BORROW | — | **[C]** A2UI was moved out of P1: it is a widget protocol (PX-W), see SR-32a below
| SR-10 | P2 | Ambient tenancy: tenant derived from the request | zulip | RE-ENGINEER | — |
| SR-11 | P2 | Scope enters once — collapse the double entry | mercato, zulip | BUILD | `CC-84` |
| SR-12 | P2 | One tenant ↔ one engine home; per-run credential | Multica, `CC-84` | BUILD | `CC-84` |
| SR-13 | P2 | Identity keys unique per realm, DB-enforced | zulip | BORROW | — |
| SR-14 | P2 | Scope registry with a build-time ratchet | n8n | BORROW | — |
| SR-15 | P2 | Audit log with topology-encoded event numbering | zulip | BORROW | — |
| SR-16 | P2 | Personal / team workspace kinds | n8n | BORROW | — |
| SR-17 | P2 | Tenancy contract + prose + conformance harness + `LIMITS.md` | buzz | BORROW | — |
| SR-18 | P2 | Machine actors capped at approve-first, test-pinned | mercato only (Multica's P2 file has **zero** mentions of approve/authority; it makes machines *first-class owners*, the opposite) | HAVE | authority layer | **[C]**
| SR-19 | P3 | Durable wake queue: at-least-once, retries in payload, late cutoff | zulip | BUILD | — |
| SR-19a | P3 | Budget per event, not just per queue — a single event gets bounded time; a batch gets n × that, enforced by the worker | zulip (`04-automations §4.2`, `MAX_CONSUME_SECONDS = 30` SIGALRM) | BORROW | — |
| SR-19b | P3 | The row carries the obligation exactly-once; the wake is at-least-once — baton and wake committed in one transaction | openrig (`04-automations §4`, §5) | BORROW | — |
| SR-20 | P3 | One-statement claim with health gate inside | Multica | BORROW | — |
| SR-21 | P3 | Closed failure taxonomy per attempt | Multica | BORROW | — |
| SR-21a | P3 | Recovery is a named set of sweepers, one per way a task can die — not a generic retry | Multica (`04-automations §4`, F04-03) | BORROW | — |
| SR-22 | P3 | Every command declares risk + approval + expiry | mercato, buzz | BUILD | `CC-63` |
| SR-22a | P3 | Increasing the polling interval only hides the bug — a reconciler that honours human cancellation beats a slower poller | Paperclip (`04-automations §5`, the DOT-2 lesson) | BORROW | — |
| SR-23 | P3 | Transport does not decide | Gas Town | BORROW | — |
| SR-24 | P3 | Durable hooks for side effects | Gas Town (`03-the-workspace §3`, **F03-03** — "The Hook is the durability primitive", a `hook_bead` pointer on the agent bead; session ephemeral, work not) | BORROW | — | **[C]** cited from the P2 file, not the P3 file
| SR-25 | P3 | Event-kind registry; kinds over endpoints | buzz | BORROW | — |
| SR-26 | P3 | Every approval gate ships a test that fires it | buzz | BUILD | — |
| SR-27 | PX-W | Widget = append-only log; state by replay | zulip | RE-ENGINEER | — |
| SR-28 | PX-W | Discriminated-union contract over widget kinds | zulip | BUILD | — |
| SR-29 | PX-W | One generic renderer: `WidgetIR` → DOM | zulip, mercato | BUILD | — |
| SR-30 | PX-W | Generic bridge: any backend drives any widget | zulip | BORROW | — |
| SR-31 | PX-W | Widget-kind registry; kinds register themselves | zulip | BORROW | — |
| SR-32 | PX-W | Composition canvas with CRDT collaboration | n8n | BORROW | — |
| SR-32a | PX-W | **Widget protocol, not widget model** — a declarative UI vocabulary a client renders; an 18-component typed catalog whose `allowed_components` is enforced **on the response**, not just advertised in the prompt | CrewAI (`05-widgets-and-frontend §5.3` — "A2UI — the actual widget architecture (the important find)", 3,669 lines) | BORROW | — | **[C] new row** The markdown's own discipline: "Say 'widget *protocol*', never 'widget system'" — no renderer ships in the tree |
| SR-33 | PX-F | Design system + own ESLint plugin guarding composition | n8n | BORROW | — |
| SR-33a | PX-F | Deliberate non-features recorded: no plugin model, no dynamic loading, no schema versioning | zulip (`05-widgets-and-frontend §5.5`) | BORROW | — |
| SR-34 | PX-F | Prohibition-constrained 3-package layering | Multica | BORROW | — |
| SR-35 | PX-W | UMES injection as the widget entry point | mercato | HAVE | kit |
| SR-35a | PX-F | Frontend as information architecture: a fetcher interface of ~14 methods beats a widget tree | Gas Town (`ConvoyFetcher`, F05-04) | BORROW | — |
| SR-36 | PX-F | Dashboard + perspective screens | mercato | BUILD | `M5` |
| SR-37 | out | Plugin/module registry with full lifecycle | Hermes (`12-SYNTHESIS §3.2` versioned compat contract + deprecation window), Multica (`07-SYNTHESIS §7.3 #12` plugin contract) | BORROW | — | **[C]** buzz's synthesis has no plugin mechanism; Multica's `344` deletes Plugin V1 entirely (14 DROP TABLEs → 3 tables)
| SR-38 | out | Digital-twin harness; drift breaks the build | openrig | BORROW | — |
| SR-39 | **PZ** | One-truth check across every representation | zulip | BORROW | — |
| SR-40 | **PZ** | Feature-level ratchet only a human can raise | zulip (`06-out-of-pole §6.3`; `API_FEATURE_LEVEL = 513`) | BORROW | — | **[C]** trigger corrected — see the note below
| SR-41 | **PZ** | Named, greppable escape hatches | zulip | BORROW | — |
| SR-42 | **PZ** | Exclusion ledger with mechanical expiry; ships empty | openrig | BORROW | — |
| SR-43 | **PZ** | Proof beside prose: contract + falsifiable check + `LIMITS.md` | buzz | BORROW | — |
| SR-44 | **PZ** | Retirement ledger; renames are tracked hazards | buzz, openrig | BORROW | — |
| SR-45 | out | Kinds-over-endpoints policy with conformance test | buzz | BORROW | — |
| SR-46 | out | Two-reads lint: any setting read twice must be read once | openrig | BORROW | — |
| SR-47 | **PZ** | Declared-control coverage: a control nobody reads is reported, not shipped | mercato — the `preview/` audit's §18 class | BUILD | ✅ **`CC-93`, `52383e09`, 2026-10-17** |

**Count by status:** HAVE 3 (`SR-01`, `SR-18`, `SR-35`) · BUILD 11 · BORROW 38 ·
RE-ENGINEER 2 (`SR-10`, `SR-27`). 3 + 11 + 38 + 2 = **54 rows** — the 46 base requirements
plus seven sub-lettered additions (`SR-19a`, `SR-19b`, `SR-21a`, `SR-22a`, `SR-32a`, `SR-33a`,
`SR-35a`) plus `SR-47`. None of the sub-lettered rows change a parent row's status.

**★ `SR-47` IS THE ONE ROW THAT CAME FROM OUR OWN CODEBASE RATHER THAN A PLATFORM STUDY — and it was
added under the wrong number first.** The `preview/` audit's §18 thesis was that six separate findings
were the same finding: a control the code declares and nobody reads. `.delegable` (declared at 24 sites,
read 0x), `demoteIfEvidenceDemands` (a public `TrustService` method with 4 callers, all its own test),
`authorityPolicyProblems` (3 callers, all its own test), `findFrontendVocabulary` (5, plus two
self-calls), `detectRepeatedRequest` (13, the most-tested dead control in the repo), and the C6 command
contract — whose reader *is* wired at `command-bus.ts:452` while **zero handlers declare
`risk`/`approval`/`idempotency`**, so it returns `null` for every handler. **That last one is a third
shape of dead control** — `input`: the reader is wired and the producer is absent, so the control looks
completely alive while doing nothing.

**Built 2026-10-17** as `scripts/check-declared-controls.mjs` + a 10/10 test +
`scripts/verify-declared-controls-mutations.mjs` + `check:declared-controls`/`:fail`. **Five of the six
read UNCOVERED and one reads DEAD-INPUT**, exactly as predicted — and **the test column is the finding**:
every one of these controls has a full test suite and not one production consumer. Tested and wired are
different things, and only the second is protection.

**★ A SECOND FINDING FROM THE BUILD, and a limit on this row's own scope:** a mechanical census of every
exported symbol with no production consumer puts the class at **3,658 of 14,311 (25.6 %)**. That is **not**
a defect count — most of it is zod schemas and type aliases exported as a module's declared surface — so
the shipped check uses a **curated registry** of six controls, and the census is a figure to watch, not a
gate to trip. Publishing 3,658 findings would bury the six that are real, which is the same noise problem
`SR-41` avoided when it refused to fold `as any` into the escape-hatch count.

**★ AND THE CORRECTION THAT PRODUCED THIS ROW'S NUMBER (`C-07`):** the `preview/` triage's §4 ranking
first named this check **`SR-42`** — which was already assigned, above, to *openrig's exclusion ledger
with mechanical expiry*. One ID, two unrelated requirements, and the second would have been silently
overwritten the moment anyone built the first. **`SR-47` is the next free number.** The correction is
recorded in `PREVIEW-AUDIT-TRIAGE.md` §1.5 and in the `CC-92`/`CC-93` register rows. **Rule 13 applies to
a document that exists to enforce "one name, one thing" as much as to anyone else's numbers.**

**Trigger corrections applied in this pass:**

- **SR-40 (the ratchet) was inverted.** The markdown says the build fails when the level is
  **not** raised: *"If a merged PR leaves any `ZF-` marker in the API docs or the spec, this
  guard fails the build — and it also skips the job that posts the announcement."* The human
  must replace the `ZF-` marker **and** post the announcement by hand. The design is a ratchet
  with a **social consequence attached** — which is the part worth borrowing, not the direction
  of the trigger.
- **SR-09's source moved.** A2UI is a *widget* protocol, filed under PX-W as SR-32a. CrewAI's
  P1 contribution is the typed tool filter with `run_context` and the typed tool-failure chain,
  which CrewAI's own batch calls *"the single most actionable finding for our aissistant."*
- **SR-05's sources corrected.** The measured **max-children** spawn cap is n8n's
  (`07-SYNTHESIS §7.2`, F02-04). Hermes has a *subagent iteration* cap — `DEFAULT_MAX_ITERATIONS
  = 250`, parent 500 — and the earlier "50" was corrected inside the corpus itself under rule
  13. There is no spawn cap in zulip; what zulip has is cost metering
  (`MAX_PER_USER_MONTHLY_AI_COST`, default **0.5 USD**).
- **SR-18's Multica source removed.** Multica's P2 file contains zero mentions of approve or
  authority; its stance is machines as **first-class owners** (`F03-07` — a lead that may be a
  member or an agent), which is the opposite of a cap. The cap is mercato's own, test-pinned.
- **SR-37's sources corrected.** buzz's synthesis has no plugin mechanism. The versioned
  compatibility contract with a deprecation window is **Hermes's** (`12-SYNTHESIS §3.2`); the
  plugin contract is Multica's (`07-SYNTHESIS §7.3 #12`). Multica's own obituary is the lesson:
  migration `344` deletes Plugin V1 entirely — **14 DROP TABLEs**, leaving 3.
- **SR-24's citation corrected.** Gas Town's Hook *is* the durability primitive
  (`03-the-workspace §3`, **F03-03**: *"The hook is the 'durability primitive' — work on your
  hook survives session restarts"*). It is filed in Gas Town's P2 file, not its P3 file —
  recorded rather than silently moved.
- **SR-23's name corrected.** ZFC is **"Zero Framework Cognition"** — *"the framework
  transports, the agent decides"* (`03-the-workspace §6`, F03-06). "Transport, don't decide"
  was a fair gloss of a real principle, but the name is what should be quoted.

> **Correction pass, 2026-10-16 (same day, after the first commit `512a4d2`).** The mapping
> was written from compressed digests instead of from the markdown findings directly. It has
> now been re-verified against all 77 findings markdowns in six batches, one per pole plus a
> summary pass. The corrections below are marked **[C]**. Three rules from the verification
> now apply to every row: **(a)** the source citation must name the *findings file* the
> mechanism was read from, not just the platform; **(b)** where a mechanism lives in a pole's
> file other than the one it is cited from, that is recorded rather than silently moved; and
> **(c)** superlatives ("the only", "the first", "the strongest") are only retained where the
> markdown itself states them, because the markdown's own superlatives age as later studies
> land.

---

## 3. What the mapping changed about mercato's position

### The good news, measured
- **The guard pole is our strongest starting position.** Guard engine `P18` complete,
  `D0–D3` fixed, authority layer test-pinned, hash-chained ledger, RED-GREEN mutation
  proofs, build-time fences (`CC-44`). No platform in the study starts here.
- **The typed port already works.** `P2-1 … P2-9a` is live and `runFunction` is structurally
  LLM-free. The seam is real.
- **The widget semantics already exist.** `BusinessWidget` / `WidgetIR` / `WidgetInstance`
  are built. Two of nine platforms have a widget model at all; we own the description and
  need only the engine.

### The bad news, measured
- **No durable wake queue.** P3 can run workflows and cannot wake them durably.
- **0 of ~93 commands declare risk or approval** (`CC-63`). A guard engine with nothing to
  guard.
- **The aissistant is unwired.** The triage core exists as a library (`G-21`) and has no
  production caller.
- **`CC-84` is open** — one superadmin identity, one shared `HERMES_HOME`. The pole that
  drove the entire study.

### What the frame changes
Under "not limited by what mercato allows", three requirements exceed anything mercato
currently does:
- **SR-10** (ambient tenancy) replaces explicit scope entry with a derived boundary.
- **SR-27** (widget-as-log) turns `WidgetInstance` from a blob into an append-only log.
- **SR-12** (per-tenant engine home) is the fix for `CC-84` and the retirement of the
  shared `HERMES_HOME`.

---

## 4. Sequencing — what must land before what

```
SR-38, SR-39, SR-41, SR-46   ← tooling; land FIRST; no blockers; make everything after cheaper
        │
        ├── SR-04 (two-surface rule, build-time fence)
        ├── SR-33 (design system + ESLint plugin, tooling)
        │
SR-02 + SR-07 (identity: agent ≠ runtime, bot = participant)   ← land together
        │
        └── SR-12 (per-tenant engine home = CC-84)   ← gates P2-9b
                │
                └── SR-10 + SR-11 (ambient tenancy, scope-once)
                        │
                        └── SR-13 (per-realm identity)
                                │
                                └── SR-19 (durable wake queue)
                                        │
                                        └── SR-22 (risk on every command = CC-63)
                                                │
                                                └── SR-27 (widget = log)
                                                        │
                                                        └── SR-29 (generic renderer)
                                                                │
                                                                └── SR-32 (composition canvas)
                                                                        │
                                                                        └── SR-36 (dashboard, M5)
```

**The critical path runs through identity → tenancy → durability → composition.** Everything
off the path (the tooling items at the top) can land immediately.

**`SR-08` (wire the triage core) has no prerequisite at all** — it is the cheapest item in
the register and can land today.

---

## 5. The mattermost slot

The tenth platform stays unstudied, pending an explicit ASK. **No rework is required**: every
pole file in this pass has a slot waiting for it. When it is studied, its mechanisms are
added as new `SR-*` rows — or, where they contradict an existing row, the contradiction is
reported under Rule 13 and resolved by measurement, not by preference.

---

## 6. What this document is not

It is not a build plan. **No development before a written requirement** — this *is* the
written requirement, and the build queue (`CC-*`, `SD-*`) consumes it. Hermes is not forked
or edited. Markdown is the source of truth and this file is never edited to fit a reader.

---

*Mapping pass complete. Inputs: nine platform digests + one mercato digest. Outputs:
`00-PIN-AND-METHOD` + `findings/01..08`.*
