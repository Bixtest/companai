# OpenRig Study — Batch 07: the synthesis

**Folder:** `library/architecture/openrig-forensics/` · **Batch 07 of 07** · **Written 2026-10-16**
**Source:** `library/architecture/platforms/_extracted/openrig-main/` — the extract of
`openrig-main.zip` (md5 `d9c56a297910cbc9055aa39014adf788`), **v0.6.10**.
**Rules in force:** 0b (count first) · 1 (docs are claims, code is authority) · 5 (no comparison
*to our own platform* inside a batch — this batch keeps the same discipline and records
cross-platform observations as **observations**, with the decisions left to the owner at the
mapping pass) · 6 (name every capability) · 9 (pole-tag everything) · 10 (the retirement rule) ·
13 (never let a number stand unverified).

**What this batch is.** Batches 01–06 read OpenRig. This batch does three things and nothing else:

1. **Ranks OpenRig's mechanisms** — the ones that are evidence-backed and worth carrying, in the
   order I would act on them, each with the finding ids that back it.
2. **States what OpenRig contributes to the cross-platform mapping** — the poles it is strong on,
   the poles it is absent on, and the *one structural answer* it gives that no earlier platform
   gave.
3. **Records the decided limits** — the mechanisms that are good *and that we will not adopt*,
   with the reason, so a later agent does not re-litigate them.

It is **not** the mapping pass. It does not decide what we build. It hands the owner a ranked,
sourced menu.

---

## 0. What the study measured (the counts, in one place)

Six batches, **2,586 lines** of findings, **79 findings**, **34 divergences**, every load-bearing
claim checked against the source at `0.6.10`.

| Batch | Pole | Findings | Divergences | Headline |
|---|---|---:|---:|---|
| 01 | overview | 10 | 10 | 4 packages; every client is one `DaemonClient`; a 22-export build-enforced boundary |
| 02 | **P1 aissistant** | 13 | 5 | ★ **the permission seam** — the two-surface rule, 5 policies, a translating skill |
| 03 | **P2 workspace** | 13 | 4 | ★ **NO tenancy** — 0 `tenant_id`; the boundary is loopback/Tailscale |
| 04 | **P3 automations** | 13 | 5 | ★ the hot-potato closure contract; the wake ladder |
| 05 | **PX-W / PX-F** | 15 | 5 | ★ **no widget model** (6th in study); the digital-twin harness; the strip invariant |
| 06 | **PZ out-of-pole** | 15 | 5 | ★ the 4-rail exclusion ledger; "a green carries the load it ran under" |
| **Σ** | — | **79** | **34** | |

**Platform figures (measured, batch 01–05):** **3,685 files** · **2,585 `.ts` + 348 `.tsx`**
(43,410 lines in the initial count; `cli` alone is 121,520 lines) · **105 migrations** (001–109;
missing 093/100/102/106) · **69 routes** · **87 CLI commands** · **18 MCP tools** · daemon port
**7433** · state at `$OPENRIG_HOME/openrig.sqlite`. Frontends: `tui` **191 files / 29,473 lines,
zero `.tsx`**; `ui` **538 files / 88,829 lines, 348 `.tsx`**, 22 primitives, 67 hooks, 199 tests.
Guards: **4 guard scripts, each with a co-located test**; **6 gate-lane modules, each with a test**.

**Count-corollary established in batch 01 and held throughout:** *a count that describes a **closed**
surface holds; a count that describes an **open** one drifts.* Migrations (open) drifted twice;
the MCP-tool count (closed) held.

---

## 1. The ranked mechanisms

Ordered by *what I would act on first*, not by how impressive it is. Every entry names the finding
ids that back it.

### Tier 1 — adopt; cheap, general, and each answers a defect class we have already recorded

| # | Mechanism | What it is | Backing |
|---|---|---|---|
| **1** | **★ The 4-rail exclusion ledger** | A gate may be **green with named exceptions**, but each exception needs `suite+reason+receipt+owner+expiry`; an expired resident **fails the gate even if its suite passes**; a cut ceiling bounds every expiry; an invalid ledger is a loud failure. | F6-1 |
| **2** | **★ "A green carries the load it ran under"** | The verdict **records** per-leg wall-clock, foreign load, and the mode it ran in — *"a green is only as good as what could have been red."* | F6-2 |
| **3** | **★ The single-read flag + independent cross-check** | Read the mode flag **once** at the single choice point and thread the *value* into both the executor and the verdict; keep per-leg durations as an independent observed cross-check. *"Two reads of the same flag can diverge; one cannot."* | F6-3 |
| **4** | **★ The completed self-destruct, with a tombstone and a test** | A bridge declares a **deletion contract**; it expires, is deleted, leaves a tombstone explaining the arc, and **a test asserts it stays deleted**. | F6-8 |
| **5** | **★ The strip invariant, test-pinned and then made structural** | Colour is applied *after* layout, and `stripAnsi(styled) === plain` is asserted in **11 test files**; in the graph renderer it is **structural** — plain and painted are projections of one grid. | F5-5 |
| **6** | **The guard-as-document pattern, present natively** | **4 guard scripts, each with a co-located test**, and one shared rule engine serving two of them. | F6-10, §2 |
| **7** | **★ The exact-path guard exception, with the hole closed** | A single allowed path, named, with three rejected destinations and the reason a directory allowance *"would quietly readmit exactly that."* | F6-9 |

### Tier 2 — adopt when we build the corresponding layer (each is a worked example)

| # | Mechanism | What it is | Backing |
|---|---|---|---|
| **8** | **★ The digital-twin harness** | The **real** UI + fixtures → one double-clickable file, **typechecked against the real hook interfaces** so an interface change **breaks the mockup build**; intent/proof paired; determinism enforced by shooting twice. | F5-3, F5-4 |
| **9** | **★ The permission seam (the two-surface rule)** | *"launch flags may be deterministic code; config-file policy may NOT"* → two policy surfaces (`flag` vs `config`), 5 built-ins, and a **skill** that translates a harness-neutral intent into the installed harness's native rules file, refuses to bypass a stricter rule, and ships an undo. | F2-6…F2-13 |
| **10** | **★ The one command registry** | The grammar **derives** its verbs from one registry, three render surfaces are **serialized projections**, and a **CI parity suite** makes an undocumented action impossible. | F5-6 |
| **11** | **★ The advisory/enforcing three-tier vocabulary** | **advisory** (exit 0, *"a finding is a question, not a verdict"*) · **advisory-but-recorded** (exit code unchanged, in the verdict) · **enforcing** (nonzero). Each tier named where used. | F6-7 |
| **12** | **A named remedy on every finding** | Every leak finding carries *what to do about it*; rules are **data**, allow-lists are explicit fields. | F6-10 |
| **13** | **★ Refusal that teaches, and the named-vs-unknown distinction** | On contention: **hard-refuse**, teach the lock constant, name a holder (`pid`/`startedAt`) or say **honest-unknown** — *"never auto-override."* | F6-5 |
| **14** | **Every surface declares what it reads and how it drills** | Each TUI section names its source read and drill shape, and marks a read **passive** or **memory-only** — *"never the refresh."* | F5-7 |
| **15** | **The honest-unknown vocabulary** | 4 status glyphs that collapse existing states and render unknown as `○` — *"NEVER a fabricated ●"*; unknown edge kinds render `dim` — *"the kind string is data."* | F5-8 |

### Tier 3 — observe; excellent, and a solution to a problem we do not yet have

| # | Mechanism | What it is | Backing |
|---|---|---|---|
| **16** | **The non-blocking kernel-released mutex** | A bound localhost port as a machine-wide lock: **no stale-lock class**, `EADDRINUSE` as the non-blocking probe, 5 binding pins, rejected alternatives on the record. | F6-4 |
| **17** | **Gate hermeticity by derived expectation** | Verify this worktree *owns* the dependency root by deriving every expected target from `package-lock.json`; *"reports only; never repairs."* | F6-6 |
| **18** | **The compiled-package probe** | Prove the **assembled** artefact: SHA + `dirty === false`, policy bytes vs the four authority hashes, compiled startup boundary byte-equal at mode 0444, **never touching the live daemon**. | F6-12 |
| **19** | **Layout = authority, disk = reality** | Generated digests hash **present** files only; a missing file is never given a fabricated digest — the **absence is the signal.** | F6-11 |
| **20** | **The redacted public CI summary** | A leak-adjacent guard runs `--locations-only` in a public repo so the *summary* cannot leak what it detects. | F6-7 |
| **21** | **The self-audited as-built doc set** | Front-matter carries `last-verified-against-source: <SHA>`; the body reconciles against source *"not taken on trust"*; **pointer-not-copy** (Q1); names its own dead files. | F5-12 |

---

## 2. How OpenRig maps across the poles

| Pole | OpenRig's answer | Strength | The finding |
|---|---|---|---|
| **P1 — aissistant** | The agent is **not OpenRig's** — it is an unmodified Claude Code / Codex process in a YAML blueprint, under a **permission seam** that is the most careful in the study. | **★ strong** — *"the strongest P1 surface in the study so far"* (batch 02's own words) | F2-6…F2-13 |
| **P2 — workspace** | A **rig** = `nodes` + typed `edges`; a **workspace** = a root + named repos; a durable **queue**; **and no tenant at all.** | **★ strong on the container, ABSENT on tenancy** | F3-1…F3-12; **F3-1b (the tenancy answer)** |
| **P3 — automations** | A queue of **obligations that must be carried**: the hot-potato closure contract, the transactional handoff, the wake ladder. | **★ strong** — a *different* answer from n8n's canvas | F4-1…F4-13 |
| **PX-W — widget surface** | **NONE.** 6th platform with no widget/composer model. The composition-shaped system (Context Packs) composes **prompts**, not UI. | **absent** | F5-1, F5-2, F5-14 |
| **PX-F — frontend** | **Two** frontends: a hand-rolled ANSI TUI (primary) + a React web UI in maintenance mode; a token-driven design system; the **digital-twin harness**. | **★ strong, and unusual** — the primary UI is not React | F5-3…F5-13 |
| **PZ — escape hatch** | A **gate culture**: 4 guards (+tests), the gate lane, the exclusion ledger, the self-destruct, the advisory reports. | **★★ the strongest in the study, tied with buzz** | F6-1…F6-15 |

---

## 3. OpenRig's one structural answer

Every platform in this study so far has answered **one** question in a way no earlier platform did.
buzz's was *the event log as the source of truth*; n8n's was *the canvas as a composition surface*;
Multica's was *the machine/teammate split*.

**OpenRig's is: "the gate should be as honest as the product."**

Put differently: OpenRig applies the same honesty discipline to its **own verification machinery**
that a careful product applies to its output. Three statements, all from code, are the shape of it:

> *"a green is only as good as what could have been red"* — `gate-lane-run.mjs`
>
> *"Findings never fail it: a finding is a question, not a verdict."* — `portability-report.mjs`
>
> *"hash-verifying the JSON proves the file authentic, never that the gate RAN."* — `gate-lane-run.mjs`

**Why this is structural, not decorative.** Most systems treat the CI gate as an oracle: it says
pass, therefore we pass. OpenRig treats the gate as an **artefact that can lie**, and engineers
against three specific lies:
1. **The skipped run that reads as a real one** — solved by the single-read flag + per-leg durations.
2. **The permanent exemption** — solved by the 4-rail ledger's mechanical expiry.
3. **The green that ignores the conditions it ran under** — solved by recording load, mode, and
   per-leg time *inside the verdict*.

And it **states its blind spots**: the web UI is not a leg (with a date and a ruling); foreign load
is observed, not locked; the portability report exits 0 either way; the ledger ships empty with the
reason recorded.

**For the SRS:** OpenRig is the study's best evidence that **verification machinery is itself a
design surface** — and that the honest version is mostly *records*, not *checks*.

---

## 4. Decided limits — good mechanisms we will not adopt, with the reason

These are excellent and **decided against**, so a later agent does not re-litigate them.

| # | Mechanism | Why we will not adopt it |
|---|---|---|
| **L-1** | **★ The exclusion ledger's *presence* is not the point — its *shape* is.** | The mechanism is transferable and should be adopted (Tier 1 #1). What we will **not** adopt is a **cut-ceiling constant** (`2026-09-30`) baked as a release-date literal — our cadence has no single "cut" to bound against. **Take the rails; drop the ceiling** (or make it a per-release parameter). |
| **L-2** | **The bound-port mutex** | It solves a *desktop* problem: many gates on one developer machine. Our gates run in CI, one per job. **No stale-lock class is a real virtue, but we do not have the class.** Revisit if we ever run parallel local gates. |
| **L-3** | **The web UI in *maintenance mode*, CLI-primary** | This is a **product** decision, not a mechanism. OpenRig's answer (TUI primary, UI best-effort) is coherent *for a local operator cockpit* and would be wrong for us. **Do not copy the posture; copy the *wording rule*** (Tier 2 #11's honesty discipline). |
| **L-4** | **The digital-twin harness's Chrome screenshot path** | The **idea** transfers (Tier 2 #8). The *specific* headless-Chrome + byte-compare-dual-shoot implementation is heavier than we need until we have a visual surface worth proving. **Take the typechecked-fixture idea now; defer the capture tooling.** |
| **L-5** | **`SO_REUSEPORT`-is-forbidden as a *pinned comment*** | The insight (*a lock that can silently vanish is worse than no lock*) is a **review heuristic** we can carry in prose. We do not need to own a mutex to hold the principle. |
| **L-6** | **No widget model, and no plan for one** | OpenRig's negative is *correct for OpenRig* (its UI is a fixed cockpit). It does **not** license the same choice for us — our composition question is still open, and OpenRig's absence is **evidence about the cost of fixing the surface in code**, not a recommendation. |

---

## 5. The honest ledger — what OpenRig does *not* have

Stated by OpenRig in-tree, or measured. **This is the most valuable section for the mapping pass**,
because a platform's absences are as informative as its features.

1. **NO tenancy.** **0** `tenant_id`; the auth header itself says *"single-developer, single-user,
   single-host … Token holder is fully privileged"*; the boundary is loopback or a Tailscale tailnet
   (*"the tailnet is the auth boundary"*). **The first platform in the study with no tenant at all.**
   *(F3-1.)*
2. **NO widget/composer model**, and no third-party UI extension point — *"add a surface"* means
   *edit the app*. *(F5-1, F5-14.)*
3. **The web UI is in maintenance mode**, best-effort, and **gates nothing** — daemon contract
   mirrors are no longer proactively maintained; a moved API shows up as a `test:ui` failure.
   *(F5-9, F6-14.)*
4. **The gate has stated blind spots:** the web UI is not a leg (dated founder ruling); foreign load
   is observed, not locked; the portability report never fails a job. *(F6-14.)*
5. **The exclusion ledger ships empty** — the six problem suites were *"KILLED, not excluded."*
   *(F6-1.)*
6. **A version/prose drift:** the README's install tag lags (`v0.6.8` vs the declared `0.6.10`), and
   the migration count is stated **three different ways** across the doc set (96 / 94 / 105 on disk).
   *(Batch 00 §2.3, D4-1, D6-4.)*
7. **The permission default is the permissive one** (`OPENRIG_YOLO` env; the floor is *acceptEdits*
   — i.e. writes are pre-accepted, not asked). The `locked`/`standard` policies exist but are
   **attached per-seat**, not the global default. *(F2-6…F2-13.)*

---

## 6. Rule 10 — the retirement surface

OpenRig's retirement story is the study's **most rigorous**, though the surface is smaller than
buzz's.

1. **★ The completed self-destruct.** `CLAUDE_ALIAS_MIGRATION_BRIDGE` *"completed [its] arc and [is]
   DELETED per the bridge's own deletion contract"*; a **tombstone** records the arc; and a **test
   asserts it stays deleted** (`expect("CLAUDE_ALIAS_MIGRATION_BRIDGE" in monitorMod).toBe(false)`).
   **This is rule 10's most complete form in the study** — the mechanism expired itself, said so,
   and is guarded. *(F6-8.)*
2. **A reversal history with the killing counter-example.** The pin comparison went
   *exact → whole-token alias → reversed back*, **because token containment let one pin bless two
   models** (`"codex"` matched `gpt-5.6-codex` AND `gpt-5.1-codex-mini`) — and the code forbids a
   second mapping home. *(F6-15.)*
3. **Rename residue is documented in the pin (batch 00 §1.2):** OpenRig was formerly **`rigged`**;
   **284 occurrences of `RIGGED_*` across 85 files in 22 distinct names** survive, while the docs
   claim only **5** documented runtime keys. **The same rename-hazard class buzz taught, at greater
   scale** — and, like buzz, the residue was never cleaned. *(Batch 00.)*
4. **`packages/ui` is a *forward-only* convention, not a migration:** the twin capture README
   freezes existing ad-hoc capture sets (*"FROZEN — not renamed or migrated"*) rather than
   renumbering them. **A retirement decision that refuses to touch history.** *(F5-3 context.)*

**Rule 10 verdict:** OpenRig **does** what buzz recommended for *one* mechanism (self-expiring bridge
+ tombstone + guarding test) — better than any other platform — and **fails** it at scale (the
`RIGGED_*` rename residue is untouched). **Both facts belong in the SRS.**

---

## 7. What this study did NOT do (limits of the evidence)

1. **No build was run.** All figures are read from source, not from an executed build. Where a build
   artefact is claimed (package identity, byte-equality), OpenRig's own probe documents it and that
   is quoted as a claim, not re-verified here.
2. **No daemon was started.** Runtime behaviour (e.g. the wake ladder actually waking a seat) is read
   from source and the scenario declarations, not observed.
3. **The web UI was not rendered.** Design observations come from `DESIGN.md`, `tailwind.config.ts`,
   `globals.css`, and the source components — not from a running browser.
4. **The `RIGGED_*` rename hazard (284 occurrences) was measured, not traced.** I did not determine
   which are runtime-live versus dead.
5. **The migration count is unresolved.** Three numbers (96 / 94 / 105) remain unreconciled — carried
   as D4-1/D6-4 for a single resolution at the mapping step.

---

## 8. Where OpenRig sits in the study's ranked order

By **what it contributes to the mapping** — the order I would reach for it when designing:

| Rank | Platform | This study's view of its contribution |
|---:|---|---|
| 1 | **n8n** | The only real **composition surface** (PX-W) + the best security surface pre-buzz. |
| 2 | **buzz** | The strongest **PZ** + the strongest **tenancy** (a verified multi-tenant relay). |
| 3 | **OpenRig** | **The second-strongest PZ** (the gate culture) + **the strongest P1 seam** + the **digital-twin harness**. Also **P2 with no tenancy at all** — a decisive negative. |
| 4 | Multica | All three poles real; the **one-statement claim**; the closest neighbour. |
| 5 | Gas Town | Orchestration mechanisms; the watchdog chain of agents; **no widget model**. |
| 6 | Paperclip | P2/P3 strength; no tenancy, no composer. |
| 7 | CrewAI | **Mechanism donor, not a template.** |
| 8 | Hermes | Our engine; never fork it. |

**Two things make OpenRig unusually valuable despite ranking third:**
1. **Its PZ is the study's most *transferable*.** buzz's PZ is a *formalism* (TLA+/Tamarin) — heavy,
   and justified by buzz's tenancy. OpenRig's PZ is a *gate culture* — light, and it answers a
   defect class **we already have** (a verification artefact that can read green while proving
   less than it appears to).
2. **Its negatives are decisive.** **No tenancy, no widget model** — the two things the workshop's
   later mapping turns on — are answered here with *measured zeros*, which is exactly the evidence
   the SRS needs to justify building them.

---

## 9. Ranked actions for the mapping pass

Ordered. Each names what to do, which finding backs it, and what it costs.

1. **★ Put the exclusion-ledger *rails* into the SRS as a required mechanism for any gate that can
   be green-with-exceptions.** Named, owned, receipted, mechanically expiring; an invalid ledger is
   a loud failure; a green-with-exceptions names every exception in-band. *(F6-1. Cost: a small
   module + a data file. Our gates are new; the cost of adding it later is much higher.)*
2. **★ Require every gate/verification artefact to RECORD the conditions it ran under** — mode, per-
   leg duration, ambient load — and to read any mode flag **once**. *(F6-2, F6-3. Cost: a schema
   addition to the verdict + one coding rule.)*
3. **★ Adopt the "self-expiring mechanism + tombstone + guarding test" triad as our rule-10
   standard.** OpenRig proves it is implementable; buzz proves the alternative (residue) rots.
   *(F6-8, §6.3. Cost: a convention + a test template.)*
4. **★ Adopt the strip-invariant discipline for any rendering layer:** paint after layout, pin
   `stripInk(styled) === plain` in tests, and prefer the **structural** form (projections of one
   grid) where the renderer allows it. *(F5-5. Cost: near zero if adopted at layer birth; high
   retrofitted.)*
5. **★ Adopt the guard-as-document pattern: one guard = one test beside it, one shared rule engine,
   a named remedy on every finding, and an exact-path exception with the hole closed.** *(F6-9,
   F6-10, §2. Cost: a directory convention.)*
6. **Take the advisory/enforcing three-tier vocabulary and name each tier where it is used.**
   *(F6-7. Cost: a wording convention.)*
7. **Carry the digital-twin *idea* into the PX-W design now; defer the capture tooling.** The
   transferable part is **fixtures typechecked against the real interfaces so drift breaks the
   build.** *(F5-3. Cost: a fixture module typed to our hook/API contracts.)*
8. **Carry the one-command-registry parity idea into any surface with both a UI and a CLI.** One
   registry, generated projections, a CI parity test. *(F5-6. Cost: a registry + a test.)*
9. **★ Carry OpenRig's two measured zeros into the SRS as justification targets:** tenancy (0
   `tenant_id`) and composition (no widget model). *Both are things we intend to build; two
   independent platforms lacking them is the evidence for why.* *(F3-1, F5-1. Cost: none — this is
   an argument, not a build.)*

---

## 10. The verdict, in plain English

**OpenRig is a local cockpit for running a small team of Claude Code and Codex sessions, and its
engineering is concentrated in two places the product itself barely shows: the *seam around the
agent*, and the *gate that decides what is allowed to ship*.**

On the agent side, OpenRig has the **most careful permission design in this study**. It knows
something most tools do not: some of what a coding agent does is stable enough to automate, and
some of it is not. So it splits policy into two surfaces — a launch flag (deterministic code is
fine) and a config file (which a vendor can change under you, so it must go through a skill that
reads the installed version and adapts, refuses to weaken a stricter rule, and ships an undo).
That single rule explains the whole architecture, and it is the cleanest expression of
human-in-the-loop defaults I have read in eight platforms.

On the workspace side, OpenRig gives a decisive answer to the question the mapping turns on:
**there is no tenant.** Not a weak one, not a single-tenant flag — none. Zero `tenant_id` across 105
migrations; a static token whose holder is, in the code's own words, *fully privileged*; and a
boundary that is *the machine* (loopback or a Tailscale tailnet). **This is the first platform in
the study with no tenancy concept at all** — which says plainly what kind of product it is: a
personal/team-local cockpit, not a service.

Its automation is **not a canvas**. It is a **queue of obligations that must be carried** — you
cannot finish a task without saying where it went, the handoff and its wake are written in one
transaction, and a "wake ladder" retries the *pointer* while its own stated invariant keeps the
obligation exactly-once.

And then there is the part that is, for us, the most useful thing in this study: **OpenRig treats
its own gate as something that can lie, and engineers against three specific lies.** A gate that
skipped its real checks but reads as a real pass (solved by reading the mode flag *once* and
recording per-leg times). A gate exemption that becomes permanent (solved by an exclusion ledger
whose entries must be owned, receipted, and — crucially — **expire**, at which point the gate goes
red *even if the check now passes*). A green that ignores the conditions it ran under
(solved by sealing ambient load and mode *into the verdict*, under the sentence: *"a green is only
as good as what could have been red"*). It even ships its best guardrails **empty, on purpose**,
with the reason written down.

**There is no widget model here, and OpenRig is not hiding one.** The word "widget" appears in five
files and every hit is someone else's word. The one composition system composes *prompts*, not
screens. But the frontend has two genuinely first-rate ideas: a **digital twin** — the real UI,
fixtures, typechecked against the real interfaces, emitted as one clickable file that **breaks on
purpose when an interface changes** — and a terminal UI that **proves, in eleven test files, that
stripping the colour back out gives you exactly the original.**

**In one sentence for the mapping pass:** OpenRig will not give us tenancy or a composition
surface — it has neither — but it may give us **the most transferable honesty machinery in the
study**, and its two measured zeros are themselves the strongest argument we have for building
those two things.

---

*Batch 07 of 07 — the synthesis. **OpenRig study COMPLETE.** 6 batches of findings (01–06,
2,586 lines, 79 findings, 34 divergences) read from source at `0.6.10`, plus this synthesis.
The reader is the remaining deliverable (port 3700).*
