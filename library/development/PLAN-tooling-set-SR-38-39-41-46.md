# The tooling set — `SR-38` · `SR-39` · `SR-41` · `SR-46`

**Status:** written requirement, 2026-10-16. **All four slices are now BUILT** — §5 records each: `SR-39`
and `SR-41` on 2026-10-16, `SR-38` and `SR-46` on 2026-10-17. `CC-91` is closed.

---

## 0. Why this is next — and why it is *not* the switchover

The SRS sequences the tooling set **first**, for a reason it states in one line
(`08-THE-SRS.md` §4): *"tooling; land FIRST; no blockers; make everything after cheaper."* Development
productivity is the whole point of the set.

The switchover (`P2-9b`) was the obvious candidate and is **not** the right next step, for a reason the
SRS already records and the checklist did not surface:

> `SR-12` (per-tenant engine home = `CC-84`) ← **gates `P2-9b`**

`CC-84` is **open**: the worker's tool calls all run as **one superadmin identity**, so a Hermes turn
executes platform tools **outside the chat's own tenant**. `SR-12` is its fix. **Flipping the default to
Hermes before `SR-12` lands would make that hole the *default* path** — the one every tenant gets —
rather than a path behind a non-default engine. The owner's own note sharpens this rather than softening
it: *Hermes keeps its development skills and may be used for coding at some point.* A coding agent
carrying broad file/terminal tools, running as a single superadmin identity, is exactly the shape
`CC-84` names.

**Therefore: the tooling set now; the switchover after `SR-12`.**

---

## 1. The four mechanisms, in plain words

| Req | Mechanism (as studied) | What it does for us |
|---|---|---|
| **`SR-38`** | openrig — *"fixtures are typechecked against the real interfaces, so drift breaks the build"* | A fake that no longer matches the real thing **stops compiling**. The study calls it "the single cheapest correctness mechanism". |
| **`SR-39`** | zulip `check-schemas` — verifies **the same fact in three representations** | Wherever one fact is written down twice, a machine proves the copies agree. |
| **`SR-41`** | zulip `mark_sanitized` — a named, one-line, greppable hole in a guard | The lesson is not "have escape hatches" — it is **name them**, so one search finds every one. |
| **`SR-46`** | openrig — *"anywhere we read a setting twice, we will eventually disagree with ourselves"* | A **build-time lint**, not a convention: a setting read twice must be read once. |

---

## 2. ★ THE FINDING THAT CHANGES THE DESIGN — the repo already has this culture

The SRS marks all four **BORROW**, i.e. *"the mechanism comes from a platform study"*. **Measured in the
code repo, that understates what exists.** The repo already implements the *pattern* in more than one
place, so the work is to **generalise a pattern we already run**, not to import a foreign mechanism:

| Mechanism | Already in the repo (measured 2026-10-16) |
|---|---|
| **`SR-39`** one-truth | `scripts/check-version-alignment.sh` — *"all public packages have the same version as the selected reference manifest"*: one fact, many representations, checked mechanically. |
| **`SR-40`** ratchet | `scripts/check-agents-md-budget.mjs` — *"a ratchet on the representative root-to-module chains recorded in the baseline: when a chain already exceeds the budget, the nested part may only shrink"*, with `--update-baseline`, `--json`, and `scripts/__tests__/check-agents-md-budget.test.mjs`. **This is the ratchet, already built.** |
| **`SR-41`** escape hatches | the usual unnamed holes (`eslint-disable`, `@ts-expect-error`) — **named convention not yet adopted**. |
| **`SR-46`** two-reads | no instance yet; the home is the ESLint surface (`packages/eslint-plugin-ds`, `eslint.config.mjs`). |

**What this means for the plan.** Three of the four are *extensions of a working pattern*, and the
repo's conventions are already the right ones: a `scripts/check-*.mjs` with a `--json` flag, a
`--root <dir>` override so it is testable against a fixture, a `scripts/__tests__/*.test.mjs` test run by
`node --test`, and a `package.json` `check:*` script. **The plan adopts those conventions rather than
inventing new ones.** The two ESLint-shaped items (`SR-41`, `SR-46`) go on the existing plugin surface;
the two check-shaped items (`SR-38`, `SR-39`) go beside `check-version-alignment.sh`.

---

## 3. The design, per requirement

### `SR-39` — the one-truth check *(first slice; see §5)*

**Shape.** One checker, a small **registry of facts**, and a rule: *a fact written in N places must read
the same in all of them.* Each fact names its representations as `(label, path, extractor)`. The checker
reads every representation, and:

- **≥2 readable and all equal** → **PASS** (the fact has one truth).
- **≥2 readable and any differ** → **FAIL**, printing every representation and its value, so the
  divergent one is named.
- **fewer than 2 readable** → **SKIP**, loudly — a fact with one representation is not a one-truth
  problem, and silence there would be a false green.

**Why a registry rather than a bespoke script per fact.** `check-version-alignment.sh` is the pattern
with exactly one fact (the version) hard-wired. A registry makes adding the second fact a data change,
not a new script — which is the difference between a mechanism and an anecdote.

### `SR-38` — the digital-twin harness

**Shape.** A test-support harness whose **fixtures are typed against the real interfaces**, so a change to
an interface turns every stale fake into a **compile error** rather than a silent pass. It is a `tsc`
surface, not a runtime check: the failure mode is the build.

### `SR-41` — named escape hatches

**Shape.** A **convention plus a report**: one greppable marker (a single exported identity function, and
one comment form for the cases a function cannot reach), each carrying a **reason**, plus a check that
**lists every one** — so "how many holes do we have, and where?" is a command, not an audit.

### `SR-46` — the two-reads lint

**Shape.** A rule on the existing plugin surface: a setting read twice in one scope must be read once.
Ships at `warn` like the plugin's other rules, escalating to `error` when the metric allows —
the plugin's own documented rollout (`packages/eslint-plugin-ds/index.js`).

> **★ CORRECTED 2026-10-17, when the slice was built.** The ESLint surface is the wrong home, and the
> reason is structural, not stylistic: `packages/eslint-plugin-ds` runs **only on backend-UI files** via
> `eslint.ds.config.mjs`, so a *settings-read* rule there would **never fire on the files that read
> settings**. The rule moved to the `scripts/check-*.mjs` family, where a read can be seen **across the
> whole file** — which is what the requirement actually needs. See §5.4.

---

## 4. What is deliberately NOT in this plan

- **No new package, no new plugin, no new build system.** Every item lands on a surface that already
  exists and is already wired.
- **No behaviour change to the product.** All four are development-time checks; none runs in production.
- **Nothing is trimmed from Hermes**, and this plan does not touch it.

---

## 5. The slices — DONE 2026-10-16

### 5.1 `SR-39` — one-truth (the first slice)

**`SR-39`'s first instance: the Hermes pin digest.**

The pin digest is the fact that **actually drifted**, measured the same day (`CC-90`): the 2026-10-16
re-pin updated **three of four copies** and left `docker/hermes/verify_pin.py` naming the *previous*
revision, so any caller not handed `HERMES_PIN_DIGEST` read a correctly-pinned tree as `PIN BROKEN`. A
one-truth check over that fact would have caught it at the moment of the re-pin, and would have said
exactly which copy was stale.

**Built:**

| Artefact | Path | What it is |
|---|---|---|
| The checker | `scripts/check-one-truth.mjs` (code repo) | The registry-driven check described in §3. `--json`, `--root <dir>`, exit 1 on drift. |
| The first fact | inside the checker's `FACTS` registry | `hermes-pin-digest`, across the copies that name it. |
| The test | `scripts/__tests__/check-one-truth.test.mjs` (code repo) | Includes a **mutation proof**: a fixture in which one copy drifts **must fail** the check. |
| The script entry | `package.json` → `check:one-truth` | So it can join the existing `check:*` family. |

**Verified 2026-10-16**, on the repo's own toolchain (`workspace/.toolchain/node24`, v24.19.0):

| Check | Result |
|---|---|
| `node scripts/check-one-truth.mjs` against the **real repo** | **PASS** — all three copies read `07ee857bdab59a875317035d8aaad4d6` |
| `node scripts/check-one-truth.mjs --json` | **pure JSON** — the status line goes to stderr, so the output can be piped into a parser |
| `node --test scripts/__tests__/check-one-truth.test.mjs` | **4 / 4 pass**, including the mutation proof and the self-conflict case |

**The test caught a real bug in the checker**, which is the point of having one: the first run emitted
the JSON report **plus** a trailing human status line on stdout, so `--json` was not parseable. Two of
the four tests failed on it and named it. Fixed by routing the status line to stderr whenever `--json`
is set (or the check failed) — the same convention the repo's other `--json` scripts follow.

**A second finding, surfaced while registering the fact.** `HERMES-PIN.md` holds **two different 32-hex
digests for the same tree** — `f57f729d…` in its §1 table and `07ee857b…` in its §"computed twice" note —
and nothing in the document says which one is *the* pin digest. That ambiguity is exactly what a
one-truth check exists to remove, and it is why `HERMES-PIN.md` is **not** registered as a
representation yet: a checker cannot demand agreement from a document that does not agree with itself.
**Recorded as an open sub-item, not silently worked around.**

### 5.2 `SR-41` — named escape hatches (the second slice)

**The convention.** Every directive hole must carry a **reason** on the same line, in each tool's
**native** form so nothing new has to be learned or configured:

```ts
// eslint-disable-next-line no-console -- the CLI's one legal writer (see logger.ts)
// @ts-expect-error: the upstream signature is wrong for the 3rd arg (fixed upstream in v5)
```

**Built:**

| Artefact | Path | What it is |
|---|---|---|
| The checker | `scripts/check-escape-hatches.mjs` (code repo) | The census of §3: counts every directive hole, splits named / unnamed, lists the unnamed ones. `--json`, `--fail`, `--root <dir>`, `--help`. |
| The test | `scripts/__tests__/check-escape-hatches.test.mjs` (code repo) | **5 / 5 pass**, including the trap (a bare rule list is *not* a reason) and the precision case (prose is *not* a hole). |
| The script entries | `package.json` → `check:escape-hatches`, `check:escape-hatches:fail` | Census by default; `:fail` enforces. |

**★ THE MEASUREMENT (2026-10-16, the real repo): 7,968 files scanned · 202 holes · 33 named · 169 unnamed.**

| kind | total | named | unnamed |
|---|---|---|---|
| `eslint-disable` | 168 | 8 | **160** |
| `ts-nocheck` | 10 | 1 | 9 |
| `ts-expect-error` | 22 | **22** | 0 |
| `ts-ignore` | 2 | **2** | 0 |

**★ THE FINDING: the repo already follows this convention for TypeScript and does not for ESLint.** Every
`@ts-expect-error` and `@ts-ignore` carries a reason (24 of 24); only 8 of 168 `eslint-disable`s do. So the
backlog this check creates is real but **one-sided**, and it reads as a *convention gap* rather than a
discipline failure — nobody was ever told to write a reason after `--`.

**Two design decisions worth naming.**

- **`--fail` is deliberately not the default.** The first job is to *answer a question* — "how many holes,
  and where?" — and a census that refuses to print when it finds something is useless. The report always
  prints and always exits 0; `--fail` is the enforcement mode, for once the backlog is cleared. This
  mirrors the repo's existing `check:time-bombs` / `check:time-bombs:fail` split rather than inventing one.
- **A directive counts only when it OPENS the comment.** That is not a style choice — it is how *both*
  tools parse — and it removes a real false-positive class here: `// TS2578 "Unused '@ts-expect-error'
  directive" …` is a sentence about a directive, not a hole. The rule was added after the first run
  counted such a line, and a regression test pins it.

**Deliberately excluded:** `as any` / `as unknown as` — type *assertions*, not guard bypasses, and ~4.4k of
them in `src`. Requiring a reason on each would bury the 202 real directive holes in noise. (Recorded in
the checker's header as an explicit exclusion, not an oversight.)

**Also observed — not this slice's job:** `node --test scripts/__tests__/*.test.mjs` reports **7
pre-existing failures** (dev-splash / dev-memory-sampler / watch-packages) against a 326-pass suite. They
are untouched by this change — the only shared file edited is `package.json`, and only to add two `check:*`
keys. Recorded so a red suite is not mistaken for this slice's work.

### 5.3 `SR-38` — the digital-twin harness (the third slice)

**The mechanism is the TYPE SYSTEM, not a runtime check.** A twin is a fixture declared `satisfies
<RealType>`, so an interface that drifts stops the fixture compiling — the failure mode is the **build**,
at the one place the type system already looks.

**Built:**

| Artefact | Path | What it is |
|---|---|---|
| The twins | `packages/core/src/testing/digital-twin/authority.ts` (code repo) | Three twins — `RECORD_LOCK_CEILING_TWIN`, `AUTONOMY_GATE_TWIN`, `ANONYMOUS_SCOPE_TWIN` — each `satisfies` a REAL type imported from the module that owns it. |
| The wiring check | `scripts/check-digital-twins.mjs` (code repo) | Six checks per twin: the file exists; imports the real types; declares the symbol; carries its `satisfies`; sits in a `tsc`-visible location; names a semantic test that exists. `--json`, `--fail`, `--root <dir>`. |
| The test | `scripts/__tests__/check-digital-twins.test.mjs` (code repo) | **10 / 10 pass** — the trap (re-stating a shape is not importing it) and a direct unit test for the one rule `--root` cannot reach. |
| The mutation proof | `scripts/verify-digital-twins-mutations.mjs` (code repo) | **7 / 7 proven**, each killing exactly its named case; the checker restored byte-identical. |
| The semantic test | `packages/core/src/modules/auth/services/__tests__/record-lock-ceiling.twin.test.ts` | **4 / 4 pass** — pins every declared VALUE to what `recordLockCeiling` returns. |
| The script entries | `package.json` → `check:digital-twins`, `check:digital-twins:fail` | Census by default; `:fail` enforces. |

**★ THE SPLIT, NAMED: the check guards COMPLETENESS, `tsc` guards CORRECTNESS — neither alone is the
mechanism.** A twin that is deleted, unregistered, moved out of `src`, or has its `satisfies` dropped fails
the check; a twin whose real interface moved fails the build.

**★ AND THE HALF A `satisfies` CANNOT CLOSE — a twin's VALUES.** `satisfies` checks shape, never values:
`{ open: null, restricted: 'A2', locked: 'A0' }` and `{ open: 'A5', restricted: 'A5', locked: 'A5' }` both
compile, and the second is a lie about the control. The semantic test closes that — **proven by mutation:**
flipping `locked` to `'A1'` (still a legal gate, so `satisfies` still compiles) turns the value assertion
red while the other three tests pass. File restored byte-identical.

**Where it is typechecked.** The twins live in `src/`, **not** `__tests__/`, because
`packages/core/tsconfig.json` excludes `__tests__/` — a fixture there would be invisible to `yarn
typecheck` and its drift silent. That is why the location rule is one of the six the check enforces.

### 5.4 `SR-46` — the two-reads lint (the fourth slice)

**★ THE HOME CHANGED, and the plan says so by name (§3).** The requirement's shape was an ESLint rule, but
`packages/eslint-plugin-ds` runs only on backend-UI files, so a *settings-read* rule there would never fire
on the files that read settings. It belongs in the `scripts/check-*.mjs` family — the same family as
`SR-39` and `SR-41` — where a read can be seen across the whole file.

**Built:**

| Artefact | Path | What it is |
|---|---|---|
| The lint | `scripts/check-two-reads.mjs` (code repo) | Lexical, strip-based; a registry of setting kinds (today: `process.env`). `--json`, `--fail`, `--root <dir>`, `--include-tests`. |
| The test | `scripts/__tests__/check-two-reads.test.mjs` (code repo) | **8 / 8 pass** — the trap (**a write is not a read**) and the precision case (**a read inside a string or a comment is not a read**). |
| The mutation proof | `scripts/verify-two-reads-mutations.mjs` (code repo) | **5 / 5 proven**; the checker and the shared lexer restored byte-identical. |
| The script entries | `package.json` → `check:two-reads`, `check:two-reads:fail` | Census by default; `:fail` enforces. |

**★ THE MEASUREMENT (2026-10-17, the real repo): 4,823 production files scanned · 3,153 test files skipped
· 89 settings read twice in 46 files.**

**Two design decisions worth naming.**

- **File scope, not block scope.** The finer rule (a setting read twice in one *function*) was built,
  measured, and **rejected with the number**: 355 of 4,823 files (7.4%) strip to unbalanced braces, mostly
  `.tsx` where JSX is not lexable by a JS lexer, so a brace-scope would emit false findings. The file scope
  is what the lexer can support today; the block scope is scheduled behind a JSX-aware parse. Shipping the
  finer rule now would have meant shipping false positives.
- **Test files are excluded by default** (`--include-tests` scans them), because a test that reads the same
  setting twice is not the drift the requirement is about.

**A shared foundation, extracted and proven.** The string/comment/template/regex lexer that both this check
and `check-declared-controls.mjs` need is now one file — `scripts/lib/strip-code.mjs` (`strip` +
`readStrippedLines`). The extraction was **proven, not assumed**: the three lexer mutations in
`verify-declared-controls-mutations.mjs` were re-pointed at the new file and all still kill their named
tests, and the declared-controls census is byte-stable (6 controls, 1 covered). While extracting it, a real
lexer defect was found and fixed: template-literal `${…}` interpolations left an **unbalanced `{`**, which
is what the rejected block-scope rule mis-nested on.

---

## 6. `CC-101` — wiring the checkers into CI *(the fifth slice; requirement written 2026-10-17 night, before the code)*

**Why this is the fifth slice and not a footnote.** §5 delivered four artefacts that are built, tested and
mutation-proven. Every one of them is, at this moment, **called by nothing**: `.github/workflows/ci.yml`
runs exactly **two** of the repo's seven drift checkers — `check:dep-versions` (`ci.yml:499`) and
`check:time-bombs:fail` (`ci.yml:509`). The four requirements' own text is the standard: *"drift breaks the
build."* Measured, drift breaks nothing. **A control nobody calls is the same defect as a control that
discards its answer** — `CC-101` is the toolchain instance of the dead-control doctrine, pointed at CI
rather than at the runtime.

**The rule this slice follows, stated once:** *a checker joins the build only in the mode where it can
actually fail.* A step that cannot fail is worse than no step, because it manufactures a green tick that
reads as enforcement. That is what `SR-41`'s own docstring warns about ("a false green") and what `SR-46`'s
home-correction was about. So each of the five is assessed for whether it *can* fail before it is wired.

### 6.1 The five, and the honest mode for each

| # | Requirement | Script | Can it fail today? | Wired as |
|---|---|---|---|---|
| 1 | `SR-38` digital twins | `check:digital-twins:fail` | ✅ yes — `--fail` is the enforcement mode | **fail step** |
| 2 | `SR-46` two-reads | `check:two-reads:fail` | ✅ yes | **fail step** |
| 3 | `SR-47` declared controls | `check:declared-controls:fail` | ✅ yes | **fail step** |
| 4 | `SR-39` one-truth | `check:one-truth` | ⚠️ **partly** — `main()` returns 1 only on verdict `FAIL`; a `SKIP` exits 0, which its own docstring calls *"a false green"* | **fail step, limitation recorded in the row** |
| 5 | `SR-41` escape hatches | `check:escape-hatches:fail` | ❌ **no, not honestly** — `--fail` is all-or-nothing and there is no baseline, so it would report **169 unnamed holes of 202** and break the build on day one | **report step** (always exit 0), baseline deferred to `CC-110` |

**Why #5 is a report step and not a fail step.** `CC-110` holds the baseline question: *there is no baseline
file, which is why all-or-nothing `:fail` can never be turned on.* Wiring `:fail` today would produce a
permanently red build — a control that fires so loudly it gets disabled, which is the failure mode this whole
register exists to prevent. Wiring the report step instead publishes the number on every run and leaves
exactly one decision between report and enforcement. **The gap is recorded, not papered over.**

**Why #4 is still wired.** `check:one-truth` *does* exit 1 on real drift, so it is a genuine control for the
case it was built for. The SKIP path remains open and is named in `CC-101`'s register row rather than
silently accepted.

### 6.2 What is NOT in this slice — and why it gets a row instead

**The docs repo's own two checkers cannot be wired here.** `scripts/check-master-checklist.mjs` and
`scripts/derive-counts.mjs` live in the **docs** repository (`companai`), not in this code repository
(`companai/workspace/starting-kit`). `.github/workflows/ci.yml` here cannot run them, and a step that
crosses a repo boundary to run a file it does not own is not a control either. They need their own workflow
in the docs repo — **recorded as a new register row, not folded into this one**, because "wired into CI"
would otherwise be claimed for a step that does not exist.

### 6.3 Proof — what must be true before this is closed

1. **The workflow is valid YAML** and the step names match what they do.
2. **Every wired step runs green on the current tree** — run by hand, in the code repo, exactly as CI would.
3. **Each fail-capable checker is proven to fail when its input is broken** — one mutation per checker, each
   turning its step red. This is the check that matters: a wired step that stays green on broken input is
   the same dead control in a new coat. *(The per-checker mutation proofs already exist for the artefacts;
   what is proved here is that the **wiring** carries the failure through, not that the checker works.)*
4. **The report step publishes its number** and exits 0.
5. **The register row is updated with the measured before/after** — two checkers called → six steps.

### 6.4 Order of work

1. Write this requirement. *(done — this section)*
2. Add the five steps to `ci.yml`, in the block that already runs `check:time-bombs:fail`.
3. Run each step locally, in the code repo, as `yarn <script>`.
4. Prove each fail-capable step can fail: break the input, observe the exit code, restore byte-identical.
5. Update `CC-101`'s row with the measured result; open the new row for the docs-repo workflow.
6. Update §2's frontier and commit.

**Explicitly out of scope:** the `CC-110` baseline decision (owner's, or a ratchet I am authorized to set);
the `SR-39` SKIP path (a code change to that checker, its own row); anything in the `preview/` triage.
