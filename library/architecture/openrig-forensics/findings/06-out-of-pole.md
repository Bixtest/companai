# OpenRig Study — Batch 06: out-of-pole (PZ)

**Folder:** `library/architecture/openrig-forensics/` · **Batch 06 of 08** · **Status:** OPEN
**Pole:** **PZ — the escape hatch** (the guards, hard limits, self-tests and honest-advisory
machinery that is not one of the three product poles but tells you what the platform *refuses* to
do, and how it *proves* it)
**What this batch answers:** what does OpenRig guard, how does it prove the guard works, what does
it refuse to check, and how does it let a gate be **honest about what it does not check**?

**Rule 5 reminder:** no comparison to our own platform appears in this batch.

**Rule 1 reminder:** every claim was read from source; divergences are in §9.

---

## 1. The one-sentence shape

**OpenRig's out-of-pole surface is a *gate culture*: four named guard scripts (each with a
co-located `.test.mjs`), a machine-wide **gate lane** that refuses rather than queues, a **4-rail
exclusion ledger** that lets the gate be green *with named exceptions* while mechanically
expiring them, a **portability report that is deliberately advisory** ("a finding is a question,
not a verdict"), a **self-expiring migration bridge that actually expired and is now tested to
stay dead**, and a **compiled-package probe** that proves the assembled artifact byte-for-byte.**

The organising idea, stated in the code and carried through every guard in this batch, is:
**green carries the load it ran under.** A pass is not just "all legs ok" — it records *what else
was running*, *how long each leg took*, *whether the run was a smoke*, and *which failures were
covered by a named, owned, expiring exclusion*. The platform's honesty machinery is aimed at the
gate itself.

The eight ideas in this batch, each read from code:

| Idea | Owner | § |
|---|---|---|
| the guard inventory (4 guards, 4 co-located tests) | `scripts/check-*.mjs` | 3 |
| **★ the gate lane** (mutex + honesty gap + verdict) | `scripts/gate-lane*.mjs` | 4 |
| **★★ the 4-rail exclusion ledger** | `scripts/gate-lane-ledger.mjs` | 5 |
| the advisory portability report | `scripts/portability-report.mjs` | 6 |
| the docs guard + the leak guard | `check-docs-guard.mjs` / `internal-leak-guard.mjs` | 7 |
| **★ the completed self-destruct + its tombstone test** | `model-divergence-monitor.ts:280` | 8.1 |
| the scenario harness (RED-FIRST, `seed_regression`) | `packages/test-system/scenarios/**` | 8.2 |
| the disk-truth digests + compiled-package probe | `regen-edge-digests.mjs` / `verify-packaged-builtins.mjs` | 8.3 |

---

## 2. The guard inventory, measured first (rule 0b)

Counts before interpretation. `scripts/` holds **60 `.mjs` files and 6 `.sh` files**. Of the `.mjs`,
**20 have a co-located `<name>.test.mjs`**.

There are exactly **four guard scripts** (the `check-*.mjs` family, excluding the test files
themselves) — and **all four have a co-located test**:

| Guard | Co-located test | What it guards |
|---|---|---|
| `check-docs-guard.mjs` (62 lines) | ✅ `check-docs-guard.test.mjs` | where tracked docs may live |
| `check-first-run-references.mjs` | ✅ `check-first-run-references.test.mjs` | *"concrete references, not prose quality"* |
| `check-internal-leak-guard.mjs` (251 lines) | ✅ `check-internal-leak-guard.test.mjs` | internal text leaking into public artefacts |
| `check-substance-gate.mjs` (468 lines) | ✅ `check-substance-gate.test.mjs` | whether a package has *substance* (reuses the leak scanner) |

This is the shape buzz's batch-07 recommendations argued for and named the **"guard-as-document"
pattern** — and OpenRig has it *natively*, with a **1:1 guard-to-test ratio**. The extra libs are
shared, not duplicated: `internal-leak-scanner.mjs` (77 lines) is the **rule engine** that both
`check-internal-leak-guard.mjs` and `check-substance-gate.mjs` import — **one scanner, two
consumers.** *(PZ — the guard-as-document pattern, present by construction.)*

---

## 3. The gate lane — a gate that refuses rather than queues

`scripts/gate-lane*.mjs` is a six-module family (lock / run / ledger / hermeticity / consume /
entrypoint), each 54–171 lines, **all six with a co-located test**. It is the study's most complete
CI-gate mechanism.

### 3.1 The entrypoint, and what it does in order
`gate-lane.mjs` (171 lines) wires four things into one gate, and states the order in its own header:
> `// acquire lane (non-blocking) → refuse+teach+exit-nonzero on contention (P5) → observe foreign
> // load (advisory, recorded) → run BOTH legs (typecheck AND vitest) → write the C2 verdict (green
> // carries the load it ran under) → release (kernel also frees on death).`

The **exclusion ledger is loaded first, and its failure mode is stated**: *"Absent/corrupt → treat
as EMPTY (strict gate), never a silent skip."* **A missing exclusions file makes the gate stricter,
not laxer.** *(PZ.)*

### 3.2 The mutex: 74 lines, 5 binding pins, and every rejected alternative named
`gate-lane-lock.mjs` is the batch's clearest example of *"a decision, not a preference."* Its
header names the property first and the syscall second:

> `// The arch rationale is the PROPERTY, not the syscall: a machine-wide, kernel-RELEASED-on-process-
> // death, NON-BLOCKING mutex with no stale-lock class. A bound localhost port delivers all three
> // (the kernel frees the port when the holder dies; EADDRINUSE is an immediate non-blocking probe
> // = LOCK_NB) with zero native deps. (Unix-socket bind was REJECTED for the record: the socket
> // file lingers post-kill-9 = stale-artifact.)`

The **5 pins** each name what would break them:
- **P1** — bind `127.0.0.1` **explicitly**.
- **P2** — exclusivity is **LOAD-BEARING**: *"NO SO_REUSEPORT (never set… ) so a second concurrent
  bind MUST fail — with REUSEPORT the mutex silently vanishes. **Guard-tested.**"*
- **P3** — *"the PORT NUMBER **is** the lock name: ONE named constant, ONE home."*
- **P4** — the holder-info file is **NAMING-ONLY**: written *after* a successful bind, *"NEVER
  consulted for the lock DECISION (the bind is the decision; EADDRINUSE alone refuses)."*
- **P5** — foreign-squatter honesty: a gate holder is **named** (pid/started-at); a foreign squatter
  is **honest-unknown**; *"ALWAYS hard-refuse, never auto-override."*

The release is honest about the kernel too: *"release (kernel also frees on death)."* **A lock with
no stale-lock class, and the reason its alternates were rejected is on the record.** *(PZ — top-tier.)*

### 3.3 ★ The honesty gap: "a green is only as good as what could have been red"
`gate-lane-run.mjs` (134 lines) is where the batch's central idea lives.

**Both legs always run (not fail-fast)**, so the verdict records every result:
> `// All legs run (not fail-fast) so the verdict records every result; green = every leg ok.`

**Per-leg wall-clock is recorded, with the reason:**
> `// Per-leg wall-clock (ms) — the discriminator a whole-run total hides: a MIXED-mode run (some
> // legs real, some smoked/skipped) still sums into a plausible band, but the skipped legs show
> // ~0ms here.`

**Foreign load is *observed*, never locked** — because it *cannot* be locked, and the code says so:
> `// Advisory foreign-load context (arch: foreign NON-gate load cannot be locked, only OBSERVED →
> // advisory warn, exit code UNCHANGED, RECORDED in the verdict).`

**And the verdict's own rationale:**
> `// a green carries the load context it ran under (RECORDED, not just printed) — a green is only
> // as good as what could have been red.`

### 3.4 ★★ The two-reads-of-one-flag hazard, solved in code
The sharpest single detail in the batch. A "smoke" mode (which skips the real legs) must not be
sealable as a normal pass. OpenRig solves it by **reading the flag exactly once**, at the single
choice point, and threading that *value* into both the executor and the verdict:

> `// SELF-DESCRIBING: the mode this verdict ran under, taken from the SINGLE choice point — the
> // caller computes SMOKE ONCE to pick the executor and passes THAT same value here. It is
> // deliberately NOT a second, independent `process.env` read: … reading the env here would record
> // INTENT that can disagree with what actually ran (a smoking exec under an unset env →
> // smoke:false over legs that never executed). **Two reads of the same flag can diverge; one
> // cannot.** The per-leg durationMs below is the INDEPENDENT observed cross-check: declared mode vs
> // observed effect — if they ever disagree, that disagreement is itself detectable. Without this a
> // smoke run seals a normal PASS indistinguishable from a real one; **hash-verifying the JSON
> // proves the file authentic, never that the gate RAN.**`

That last sentence is a **rule-13-grade distinction**: *authenticity of an artefact is not evidence
of the act that produced it.* And the remedy is named as a **belt-and-braces pair**: a single read
(removes the divergence) **plus** an independent observed effect (detects it if it still happens).

**The test-calls-production-shape** is also explicit: `runGate` is extracted *"so production and its
test call ONE origin — not a mirror,"* and *"its negative control guards the shipped path rather
than a lookalike."* *(PZ — top-tier; carry BOTH ideas to the SRS.)*

### 3.5 ★ The web UI is deliberately NOT a gate leg
`gate-lane-run.mjs` states the exclusion and its reason:
> `// The web UI (packages/ui) is deliberately NOT a gate leg. Founder ruling 2026-08-21: the web UI
> // went best-effort experimental at the 0.5.0 TUI pivot and releases must not spend gate time or
> // block on it. `npm run test:ui` still exists for manual runs; it gates nothing.`

**The scope of the gate is a stated decision with a date** — matching batch 05's "wording rule."
*(PZ.)*

### 3.6 Hermeticity: the dependency root is verified, and the check "only reports; it never repairs"
`gate-lane-hermeticity.mjs` (88 lines) verifies that **this worktree owns** `node_modules` and
**every lock-derived `@openrig/*` workspace link**. It refuses on a symlinked `node_modules`
(*"node_modules is a symlink"*), derives the expected targets **from `package-lock.json`**, requires
each real target to equal its lock-derived target, and refuses if any target **escapes
`packages/`**. Its own docstring: *"The check reports only; it never repairs."* **A verifier that
will not paper over what it finds.** *(PZ.)*

---

## 4. ★★ The 4-rail exclusion ledger — a gate that can be green *with named exceptions*

`gate-lane-ledger.mjs` (112 lines) is the study's best answer to the question *"how do you let a
gate admit it does not check something, without that admission becoming permanent?"* Its header:

> `// A base-health suite that genuinely cannot be fixed before a cut may be EXCLUDED from the gate —
> // but only VISIBLY, OWNED, RECEIPTED, and MECHANICALLY EXPIRING.`

The four rails, which map exactly onto the questions a reviewer would ask:

| Rail | Name | Mechanism |
|---|---|---|
| **1** | **green-with-exclusions** | a failure *covered* by an active resident → gate **PASS**, but the resident is **named in-band** |
| **2** | **mechanical expiry** | a resident **past its expiry → gate FAIL**, *"forces removal; self-dying"* |
| **3** | **receipt + owner + expiry** | every resident must carry all five fields (`suite, reason, receipt, owner, expiry`) — **an invalid ledger is a loud gate failure, never a silent pass** |
| **4** | **cut ceiling** | no resident's expiry may outlive the cut date |

Three details make it a real mechanism rather than a form:
1. **An invalid ledger fails the gate** — `validity.valid` is **AND-ed** into the verdict
   (`gate = validity.valid && uncovered.length === 0 && expired.length === 0 ? "pass" : "fail"`).
   A malformed entry cannot buy a suite a pass.
2. **An expired resident fails the gate *even if its suite now passes*** — *"a resident past its
   expiry forces RED regardless of its suite's current state — it must be removed or
   re-justified."* **The ledger cannot rot into a permanent exemption.**
3. **A green that carries exclusions must NAME every one of them, in-band and loud** — the
   `renderLedgerState` output prints `owner`, `expires`, `receipt` and `reason` per resident, and
   says *"gate ledger: 0 exclusions (clean — no residents)"* when empty.

**And the seed is EMPTY — with the reason recorded in the data file itself:**
> `// F1 exclusion-ledger — base-health suites EXCLUDED from the gate. EMPTY by design: the named-6
> // were KILLED (E/C/D/A + B), not excluded, so main is truly green.`

**A framework built to allow exceptions, shipped with zero exceptions, and documenting *why* it can
afford to.** *(PZ — top-tier; this is the batch's headline.)*

---

## 5. The portability report — advisory by design

`portability-report.mjs` (187 lines) inverts the usual guard posture, and says so in its header:

> `// Findings never fail it: a finding is a question, not a verdict. It exits 0 with or without
> // findings and 2 on an operational error (bad argument, git failure).`

It scans **lines added by a change** for values *"tied to one machine, network or account"*:
credentials, absolute home paths, IPs and local-network hostnames, temp/instance-specific
directories, email addresses. And it draws a boundary the reader should note: **"Rig, seat and
agent names are ordinary identifiers and are not reported."** *(Advisory scope, stated.)*

**The CI wiring respects the leak the guard is about.** The workflow file explains:
> `// The repository is public, so this summary lists file and line only; authors see the matched
> // text when they run the report locally or on push.`

and CI runs it with `--locations-only`. **A leak-adjacent guard that will not itself leak into a
public job summary** — `--locations-only` exists precisely for that. *(PZ — a small, precise
capability.)*

**The advisory/enforcing split is a three-tier vocabulary across the platform:** the portability
report is **advisory** (exit 0, findings are questions); the foreign-load observation is **advisory
but recorded** (exit code unchanged, in the verdict); the gate legs and the four guards are
**enforcing** (nonzero). *Each tier is named where it is used.* *(PZ — carry the three-tier
vocabulary to the SRS.)*

---

## 6. The docs guard and the leak guard

### 6.1 The docs guard: an exact path, and why a directory would be wrong
`check-docs-guard.mjs` (62 lines) enforces that tracked docs live under three durable roots, with
**one exact-path exception whose justification is longer than its code**:

> `// docs/DESIGN.md is the canonical visual/brand/design-system spec, and its root placement is
> // RATIFIED doctrine, not drift… [and] it cannot be satisfied by relocating into any allowed root:
> //   docs/as-built/ — every file there carries last-verified-against-source; DESIGN.md is not
> //                    source-derived, and Q1 rules this destination out by name
> //   docs/reference/ — that directory SHIPS (scripts/build-package.sh stages it into the package
> //                    and the daemon materializes it to $OPENRIG_HOME/reference/), so moving there
> //                    would start distributing the brand spec to every operator
> //   docs/releases/ — not a release note
> // So it is named here as an EXACT PATH rather than relocated or covered by a widened directory
> // allowance. Keep this exact-path: the policy this guard enforces is "loose plans and notes stay
> // untracked", and a directory hole would quietly readmit exactly that.`

**Three rejected destinations, each with a distinct reason, and the guard explicitly refuses to be
weakened into a directory allowance** with the reason stated: *"a directory hole would quietly
readmit exactly that."* **The exception is one file, named, with its escape route closed.** *(PZ.)*

### 6.2 The leak guard: rule-driven, with a remedy named on every finding
`internal-leak-scanner.mjs` (77 lines) is a pure rule engine. It exports a **named remedy** as a
constant and attaches it to *every* finding:

> `export const INTERNAL_LEAK_REMEDY = "Move the detail to an internal sidecar, fence it, genericize
> it, or keep the whole file host-only."`

Rules are **data, not code** (`internal_path_globs`, `path_prefixes`, `seat_and_rig_patterns`,
`host_patterns`, `charged_terms`), with **allow-context escape hatches** that are themselves
explicit (`allowed_context_substrings`, `allowed_context_lines`). The consumer
(`check-internal-leak-guard.mjs`, 251 lines) can emit a **deterministic JSON report** recording the
mode, the scanned file list and the finding count — *"mode"* being **scanned**, i.e. the report says
*how* it was produced. **Findings are actionable by construction: every one carries what to do about
it.** *(PZ.)*

---

## 7. Guardian lists are generated, not hand-maintained

Two `.generated.json` files sit beside the guards and are regenerated from disk truth:

- **`skill-edge-digests.generated.json`** — SHA-256 per skill edge file, regenerated by
  `regen-edge-digests.mjs`, whose header states the **authority/reality split**:
  > `// PROPERTY (layout = authority, disk = reality, regen touches only reality): buildEdgeDigests
  > // hashes PRESENT files only. A layout-demanded file missing from disk is never given a digest
  > // here…`
- **`internal-tokens.generated.json`** — the token list the leak scanner charges against.

**The property line is the finding:** *layout is the authority; disk is the reality; the regen
touches only reality.* A missing file cannot acquire a fabricated digest — it simply has none, and
that absence is the signal. *(PZ — the same "never fabricate a value you were not given" discipline
seen in batch 05's `honest-unknown ○` glyph.)*

---

## 8. The self-destruct, the scenarios, and the packaged probe

### 8.1 ★ The completed self-destruct — with a tombstone AND a test that it stays dead
`model-divergence-monitor.ts:280` carries the study's cleanest retirement artefact:

> `// (The self-expiring CLAUDE_ALIAS_MIGRATION_BRIDGE and its SPEC_VALIDATION_CAPABILITIES sentinel
> // gate completed their arc and are DELETED per the bridge's own deletion contract: the 5.3
> // advisory landed, the bridge emptied, and f7dfca0c replaced the no-tolerance state with
> // canonicalization through the advisory's shipped map.)`

And `model-divergence-monitor.test.ts:256` **asserts the bridge is gone**:
> `expect("CLAUDE_ALIAS_MIGRATION_BRIDGE" in monitorMod).toBe(false);`

**This is rule 10 at its most rigorous:** the bridge declared a *deletion contract*, *executed* it,
left a **tombstone explaining the arc**, and the codebase **tests that it stayed deleted** so it
cannot silently return. **A migration bridge that expires itself and a test that guards the
tombstone.** *(PZ — top-tier.)*

The same file also records a **rule-13-grade history of a reversal** (the pin-comparison logic):
> `// History on record: exact was ruled at build; a seat reversed it to whole-token alias matching;
> // r2 reversed THAT back because generic token containment lets one pin bless multiple distinct
> // models ("codex" matched gpt-5.6-codex AND gpt-5.1-codex-mini). … Never add a second map here,
> // and never token containment: an unknown alias or a fallback model canonicalizes to itself and
> // still diverges.`

**The wrong answer is documented, with the concrete counter-example that killed it.** *(PZ.)*

### 8.2 The scenario harness — RED-FIRST is the exception, and the exception is *loud*
`packages/test-system/scenarios/` holds **23 scenario YAMLs**, **12 of which carry a
`seed_regression: {class: …}`** — the defect class the scenario exists to reproduce. The naming is
the invariant statement (`locked-restore-never-permissive`, `queue-baton-survives-restart`,
`ps-scope-honesty`, `send-verify-means-rendered`, `clean-lifecycle-no-residue`).

**One scenario is RED-FIRST, and it explains itself at length.** `kill-daemon-mid-handoff.yaml`
describes a **real incident** (2026-08-05, pm-lead ruling `6eb9166a`):
> `// a gated, guard-cleared branch cleanup EXECUTED correctly and was receipted on disk, but the
> // daemon died before the queue closure landed — so a later reader misread completed work as an
> // out-of-band incident for ~5 hours. The divergence between completed EXECUTION and queue STATE
> // must become VISIBLE on a shipped surface, never silently misread as unexecuted.`

And then states its own honesty rule:
> `// *** RED-FIRST *** … Until that lands, its runs are recorded as EXPECTED-RED (the class
> // demonstrably caught), NEVER massaged to green.`

It also names its **blocking dependencies, routed rather than shimmed** (*"Deps (BLOCKING, routed —
never shimmed here)"*) and, at the end, the assertion boundary: *"#11 may NOT assert on the on-disk
receipt (not a shipped surface): its assertions ride queue/stream."* **RED-FIRST is one scenario out
of 23 — the exception, not the rule — and it is the loudest file in the directory.** *(PZ —
top-tier.)*

### 8.3 The compiled-package probe — proving the *assembled* artefact
`verify-packaged-builtins.mjs` proves, **against an assembled package**, three things:
1. **package identity** — the assembled daemon *and* cli build-info name **the exact candidate SHA
   with `dirty === false`**;
2. **assembled policy bytes** — `daemon/policies/builtin/*` equal **the four authority hashes**;
3. **the compiled assembled startup boundary** — invoking the assembled `dist`'s exported
   `createDaemon()` (no listen) under a **fresh temporary `OPENRIG_HOME`** with isolated state
   materializes **exactly** the four stable files at `reference/policies/builtin/` — **byte-equal,
   mode 0444**.

And its own containment rule:
> `// The probe NEVER touches the live daemon, its port, or the operator home.`

**It tests the artefact an operator would actually receive, not the source tree** — the exact gap
buzz's `LIMITS.md` recommendation warned about, closed natively. *(PZ.)*

### 8.4 Honest ledgers around the build
`check-cli-daemon-freshness` and `cleanStaleVendoredBundle` together name a **known poisoning
path and neutralise it**:
> `// remove the vendored daemon bundle at packages/cli/daemon before the legs run. That path is a
> // GITIGNORED build artifact… a stale desk leftover there poisons test:repo's freshness guard …
> // Removing it at gate start means a leftover can never poison a run; real package-time assembly
> // is still guarded, and a fresh clone with no bundle is a force:true no-op.`

**A self-inflicted false-signal path is named, and a `force:true` no-op runs every time to close
it.** *(PZ.)*

---

## 9. Divergences (rule 1)

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D6-1** | the guard family looks like it might be ~10+ scripts | the `check-*.mjs` **guard** family is exactly **4** (the rest are their co-located `.test.mjs`, plus shared libs and non-guard tools) | **DIVERGED from a loose reading, HOLDS against source** (counted; the 4+4 shape is exact) |
| **D6-2** | "gates catch regressions" is the usual (implied) claim | the gate is **explicit about what it does NOT catch**: the web UI is not a leg *by dated ruling*; foreign load is **observed, not locked**; the portability report **exits 0 either way** | **HOLDS — and unusually precise** (the gate states its own blind spots) |
| **D6-3** | the exclusion ledger reads as a mechanism that must be in use | it ships **EMPTY, by design**, with the reason in the data file (*"the named-6 were KILLED, not excluded, so main is truly green"*) | **HOLDS** (a mechanism present and unused, with the reason recorded — not dead code) |
| **D6-4** | `ARCHITECTURE.md` / the coordination doc's migration counts (batch 04: doc says 96, ARCHITECTURE.md 94, disk 105) | re-checked here: the **gate/hermeticity machinery does not depend on any migration count**; the divergence is confined to prose | **DIVERGED (carried from D4-1)** — restated here so batch 07 can resolve it once |
| **D6-5** | a `check-*` guard implies a passing tripwire | **all four guards carry a co-located test** — verified one by one — so "the guard has its own test" holds, not merely "the guard exists" | **HOLDS** (verified individually, not inferred from the directory listing) |

---

## 10. Findings (batch 06)

**F6-1.** ★★★ **★ The 4-rail exclusion ledger: the gate may be green WITH named exceptions, and no
exception can become permanent.** Green-with-exclusions (named in-band) · **mechanical expiry** (an
expired resident FAILS the gate *even if its suite passes* — *"self-dying"*) · **receipt + owner +
expiry mandatory** (an invalid ledger is a loud failure, never a silent pass) · **a cut ceiling** no
expiry may outlive. **Ships EMPTY, with the reason recorded.** *(PZ — headline.)*

**F6-2.** ★★★ **"A green is only as good as what could have been red" — the verdict RECORDS the load
it ran under.** Per-leg wall-clock (*"the discriminator a whole-run total hides"*), advisory
foreign-load observation (*"cannot be locked, only OBSERVED"*), and the mode it ran in — all sealed
into the verdict, not printed and discarded. *(PZ — top-tier.)*

**F6-3.** ★★★ **The two-reads-of-one-flag hazard, solved by construction: "Two reads of the same
flag can diverge; one cannot."** The mode flag is read ONCE, at the single choice point, and its
*value* flows to both the executor and the verdict; **and** the per-leg durations are declared as an
**independent observed cross-check** (*"declared mode vs observed effect"*). Plus: *"hash-verifying
the JSON proves the file authentic, never that the gate RAN."* *(PZ — top-tier; carry the pair.)*

**F6-4.** ★★ **The gate lane's non-blocking, kernel-released mutex — 74 lines, 5 pins, every
rejected alternative on the record.** The port number *is* the lock name (P3); the bind *is* the
decision and the holder file is naming-only (P4); **SO_REUSEPORT must never be set or "the mutex
silently vanishes"** (P2, *"guard-tested"*); refusal is **hard, never auto-override** (P5); and the
Unix-socket alternative was **rejected for a named stale-artifact reason**. *(PZ — top-tier.)*

**F6-5.** ★★ **Refusal teaches, and distinguishes a NAMED holder from an HONEST-UNKNOWN squatter.**
A gate holder is named (`pid`, `startedAt`); a foreign process is **"holder UNKNOWN (no gate
holder-info file)"** and the gate **fails closed** — *"a gate lane must not run beside unknown load."*
*(PZ.)*

**F6-6.** ★★ **The gate hermeticity check assumes nothing: it verifies this worktree OWNS the
dependency root, deriving every expected target from `package-lock.json`, refusing a symlinked
`node_modules` and any target that escapes `packages/`.** Its own rule: *"The check reports only; it
never repairs."* *(PZ.)*

**F6-7.** ★★ **The portability report is deliberedly ADVISORY — "a finding is a question, not a
verdict" — and its CI wiring refuses to leak the thing it detects.** Exit 0 with or without
findings; 2 on operational error; `--locations-only` in the public workflow *"so this summary lists
file and line only."* *(PZ — and it establishes the platform's three-tier advisory/enforcing
vocabulary.)*

**F6-8.** ★ **★ The completed self-destruct, with a tombstone and a test that it stays dead.** The
`CLAUDE_ALIAS_MIGRATION_BRIDGE` *"completed [its] arc and [is] DELETED per the bridge's own deletion
contract"*; a tombstone records the arc; and `expect("CLAUDE_ALIAS_MIGRATION_BRIDGE" in
monitorMod).toBe(false)` **guards the tombstone.** *(PZ/rule 10 — top-tier.)*

**F6-9.** ★ **The docs guard uses an EXACT PATH, not a directory allowance, and closes the hole
explicitly:** *"a directory hole would quietly readmit exactly that."* Three rejected destinations,
each with a distinct reason — including one that would *"start distributing the brand spec to every
operator."* *(PZ.)*

**F6-10.** ★ **Every leak finding carries a NAMED REMEDY, and the rules are data, not code.**
`INTERNAL_LEAK_REMEDY` = *"Move the detail to an internal sidecar, fence it, genericize it, or keep
the whole file host-only."* One scanner (`internal-leak-scanner.mjs`) serves two consumers, and
allow-list escape hatches are themselves explicit fields. *(PZ — the guard-as-document pattern,
natively: 4 guards, 4 co-located tests.)*

**F6-11.** ★ **Guardian lists are GENERATED from disk truth: "layout = authority, disk = reality,
regen touches only reality."** A layout-demanded file missing from disk **is never given a digest** —
the absence is the signal, and no value is fabricated. *(PZ.)*

**F6-12.** ★★ **The compiled-package probe proves the assembled artefact byte-for-byte, SHA-exact,
under an isolated `OPENRIG_HOME`, and never touches the live daemon.** Package identity (SHA,
`dirty === false`) + the four authority hashes + the compiled startup boundary (4 files, byte-equal,
mode 0444). *(PZ — the "prove the shipped artefact" gap, closed.)*

**F6-13.** ★ **RED-FIRST is one scenario out of 23 — and it is the loudest.** `kill-daemon-mid-handoff`
documents a real ~5-hour misdiagnosis, names its blocking deps *"routed — never shimmed here,"* and
states: runs are *"recorded as EXPECTED-RED …, NEVER massaged to green."* 12 of 23 scenarios carry a
`seed_regression` class. *(PZ — top-tier.)*

**F6-14.** ★ **The gate states its own blind spots, with dates:** the web UI is **not a leg** (founder
ruling 2026-08-21, *"it gates nothing"*); foreign load is **observed, not locked**; absent/corrupt
ledger → **strict, never a silent skip**; a stale vendored bundle is **removed at gate start** so it
*"can never poison a run."* *(PZ.)*

**F6-15.** ★ **A reversal history with the counter-example that killed the wrong answer.** The pin
comparison records *exact → whole-token alias → reversed back*, **because token containment let one
pin bless two models** (`"codex"` matched `gpt-5.6-codex` AND `gpt-5.1-codex-mini`), and forbids a
second mapping home. *(PZ/rule 13.)*

---

## 11. Plain-English summary of batch 06

Everything outside OpenRig's three product poles is a **gate culture**. There are exactly **four
guard scripts**, and **each one has its own test sitting next to it** — so the platform can prove
every tripwire actually fires. A single shared leak-scanner serves two of them, so there is one rule
engine, not two copies.

The centrepiece is the **gate lane** — the thing that decides whether a change is allowed in. Three
ideas make it unusual:

- **It refuses instead of queuing.** A machine-wide lock is a public port number. If the port is
  taken by another gate, it says so and stops. If it is taken by something unknown, it says
  *"holder UNKNOWN"* and **fails closed**, because *a gate must not run beside unknown load.* The
  lock is 74 lines, and it documents **five binding decisions** — including one that would silently
  destroy the lock if anyone ever set `SO_REUSEPORT`.
- **It records what the green means.** A pass does not just say "all checks OK." It records how long
  each check took, what else was running on the machine, and — crucially — **whether the run was a
  smoke run that skipped the real checks**. The platform's own sentence for this: *"a green is only
  as good as what could have been red."*
- **It solved a subtle bug in the obvious way.** It used to be possible to read the "is this a smoke
  run?" flag twice, and the two reads could disagree — sealing a skipped run as a normal pass. The
  fix reads the flag **once** and passes the *value* everywhere, **and** keeps the per-check times
  as an independent cross-check. The line that explains why it matters: *"hash-verifying the JSON
  proves the file authentic, never that the gate RAN."*

The most elegant thing in the batch is the **exclusion ledger**. OpenRig lets the gate be **green
with exceptions** — but every exception must be **named, owned, receipted, and given an expiry
date; and if the expiry passes, the gate goes red *even if the underlying check now passes*.**
Exceptions cannot rot into permanent exemptions. And the framework **ships empty, on purpose**,
with the reason written into the file: the six problem suites were *killed*, not excluded, so main
is genuinely green. **The platform built the mechanism, then documented why it did not need it.**

Two more things deserve naming. The **portability report** is deliberately *advisory* — *"a finding
is a question, not a verdict"* — and its public CI job lists file and line only, because *"the
repository is public"*: a leak-detector that refuses to leak. And one older migration bridge
**expired itself, deleted itself, left a tombstone explaining its arc, and left a test asserting it
stays deleted** — rule 10 done as far as it can be done.

**Next: batch 07 — synthesis.** Ranked mechanisms, the pole map, the decided limits, and the
verdict — followed by the reader on port 3700.

---

*Batch 06 of 08 — out-of-pole (PZ). All claims read from source at `0.6.10`. 5 divergences;
15 findings (F6-1..F6-15).*
