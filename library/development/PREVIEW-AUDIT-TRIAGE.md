# Preview-audit triage — every finding, validated against the code, ranked

**Written:** 16 October 2026 · **Author:** this workshop, on the owner's instruction
**Subject:** the 13 documents in `preview/` (**45,652 words**, 287,331 bytes), written 11–14 October by an
agent brought in cold. `08-FORENSIC-AUDIT.md` alone carries 20 numbered sections;
`11-FRONTEND-UI-RESPONSIVENESS-AUDIT.md` carries 14. **Nothing in `preview/` had been triaged.** This document
is the triage.

> **Correction on my own header (C-06).** This header first read "197,912 words". That figure is not
> reproducible by any measure of this folder — `wc -w` gives **45,652 words** across the 13 files,
> `wc -c` gives 287,331 bytes, `wc -m` gives 283,547 characters. It was inherited unverified from an
> earlier session's note. Per rule 13 it is corrected here and the error is named: **the triage's own
> headline number was wrong until 16 Oct, and it is now measured, not remembered.**

**Method — the workshop's rule 1: docs are claims, code is the authority.** Every finding below was
re-measured against `workspace/starting-kit/` at commit `b183df58` today. Where the audit's number and my
number disagree, **mine is committed and the audit's is named as corrected.** Where the audit's claim is
already fixed, it is recorded as fixed so nobody re-fixes it.

**Verification marks.** 🔬 I ran the command or read the exact lines · 📐 I measured it with a script whose
method is stated · 🧪 a probe was executed · ✍ a judgement, not a measurement.

---

## 0. How to read this

Every row carries four decisions, and none of them is optional:

| Column | Values | Meaning |
|---|---|---|
| **Validation** | CONFIRMED · FIXED · NOT AN ISSUE · UNVALIDATED | Is the defect in the code *today*? |
| **Rank** | critical · medium · small | Blast radius if it ships |
| **Urgency** | urgent · scheduled · postponed | *When*, and the reason |
| **Action** | EXECUTE · DOCUMENT | §2.1's rule: a finding with no action status is useless |

**The verdict in one paragraph.** The audit's central thesis — *"the architecture is well designed and the
documents are more accurate than the code; the failures are wiring failures, a control declared and never
read"* — **holds completely.** I confirmed 46 discrete findings against the code and found **zero that were
false**. Two of the audit's claims are now outdated because the work they named has since been done, and
five of its own measurements needed correcting. The two CRITICAL authorization defects are **both still
open, both reachable from an ordinary HTTP route, and both are the same defect shape**: a control the design
declares and nothing reads.

**The single most useful thing in the audit is its §18 structural observation**, and it is the finding I
would act on first, ahead of both CRITICALs: there is no automated mechanism that notices a declared control
with no reader. `.delegable` is written in twenty places and read in none, and nothing fails. Adding one
registry-driven check would have caught §1, §7 and §12(C-1) at build time — and the workshop now **owns the
mechanism for it** (`SR-39`'s one-truth check and `SR-41`'s escape-hatch census, both committed today).

---

## 1. The register

Sorted by rank, then by the audit's own priority. "Src" is the `preview/` document and section.

### 1.1 CRITICAL — fix before anything else

| # | Src | The finding | Validation | Rank | Urgency | Action |
|---|---|---|---|---|---|---|
| **T-01** | 08 §1 | **A delegation lends authority the lender does not have.** The route grants any `capabilityId` to any grantee; nothing checks the grantor holds it; `.delegable: false` has **zero** production readers | 🔬 CONFIRMED | critical | **urgent** | EXECUTE |
| **T-02** | 08 §2 | **The AI's business-query tool checks scope but not authorization.** `features` is passed into the Business-IR chain and never read; `engine.query` runs unguarded | 🔬 CONFIRMED | critical | **urgent** | EXECUTE |
| **T-03** | 08 §18, 09 §3.1, 10 §1.2 | **No test for "this declared control has a consumer."** The root cause behind T-01, T-08 and T-29 | 🔬 CONFIRMED | critical | **urgent** | EXECUTE — `SR-47` ✅ **BUILT 2026-10-17** (see §1.5 `C-07` for why the label changed) |

### 1.2 HIGH

| # | Src | The finding | Validation | Rank | Urgency | Action |
|---|---|---|---|---|---|---|
| **T-04** | 08 §3 | **A Function that asks for a count returns rows.** A `gap` verifies as `passed` | 🔬 CONFIRMED | high | urgent | EXECUTE |
| **T-05** | 08 §4 | **The approvals queue can approve the same act twice.** Read-then-act, no CAS | 🔬 CONFIRMED | high | urgent | EXECUTE |
| **T-06** | 08 §5 | **`undo` writes the one record the tamper-evident chain does not cover** | 🔬 CONFIRMED | high | urgent | EXECUTE |
| **T-07** | 08 §6 | **Nine modules' commands are invisible to the authority gate**, one of them enabled | 🔬 CONFIRMED | high | scheduled | EXECUTE |
| **T-08** | 08 §7 | **Trust demotion is never triggered.** `demoteIfEvidenceDemands` has 4 callers, all its own test | 🔬 CONFIRMED | high | scheduled | EXECUTE |
| **T-09** | 11 §1 | **The design-system lint is broken** (`@typescript-eslint` mixed versions) and all six rules are `warn` | 🔬 CONFIRMED | high | scheduled | EXECUTE |
| **T-10** | 11 §2 | **Accessibility linting is installed and never switched on** | 🔬 CONFIRMED | high | postponed | DOCUMENT |
| **T-11** | 11 §3 | **RTL is half-built, and its own source comment says it is finished** | 📐 CONFIRMED | high | scheduled | DOCUMENT |
| **T-12** | 11 §4 | **`/backend` crashes if the `dashboards` module is switched off** | 🔬 CONFIRMED | high | scheduled | EXECUTE |
| **T-13** | 07 §7.2 | **`--jinja` is absent from every compose file** — tool calling may be silently degraded | 🔬 CONFIRMED | high | urgent | EXECUTE |
| **T-14** | 07 §7.2 | **The `mcp` service has no `OPENAI_BASE_URL`** — its embedding lane calls `api.openai.com` | 🔬 CONFIRMED | high | urgent | EXECUTE |

### 1.3 MEDIUM

| # | Src | The finding | Validation | Rank | Urgency | Action |
|---|---|---|---|---|---|---|
| **T-15** | 08 §8 | The confirm path drops the binding's narrowing (`CC-56` boolean re-check exists; `CC-55` narrowing does not) | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-16** | 08 §9 | Two gates fail in opposite directions on a missing dependency | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-17** | 08 §10 | The model allowlist fails open on the provider axis | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-18** | 08 §11 F2 | `SURFACE_ID_PATTERN` carries a stray `/i`, so uppercase surface ids are accepted | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-19** | 08 §11 F3 | `importFunction` rejects a §50-legal IR the compiler normalises and accepts | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-20** | 08 §11 F4 | `references` is sorted for export but not for the fingerprint | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-21** | 08 §11 F5 | `notChecked: []` forges "every §46 check ran" | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-22** | 08 §11 F7 | `findFrontendVocabulary` has zero production callers | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-23** | 08 §11 F8 | The `decided` branch returns the header's records unvalidated | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-24** | 08 §11 F9 | `KernelObjectContract.source` is unpopulated for most entities | 🔬 CONFIRMED | small | postponed | DOCUMENT |
| **T-25** | 08 §11 F10 | Two sort comparators, one locale-dependent; it reaches `entity.version` | 🔬 CONFIRMED (shape) | medium | scheduled | EXECUTE |
| **T-26** | 08 §11 F12 | `importModel` validates ids but not structure | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-27** | 08 §12 S-2/S-6 | `ensureTenantScope` fails open when `ctx.auth` is absent | 🔬 CONFIRMED | high | scheduled | EXECUTE |
| **T-28** | 08 §12 S-4 | The PUT command path skips the guard set when the candidate id is not on the parsed input | 🔬 CONFIRMED (shape) | medium | scheduled | EXECUTE |
| **T-29** | 08 §12 C-1 | The C6 command contract is dead at runtime — zero declarations | 🔬 CONFIRMED (shape) | medium | scheduled | EXECUTE |
| **T-30** | 08 §12 L-1 | Optimistic locking is client-opt-in **and the reader fails open** (five early `ok: true` returns) | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-31** | 08 §13 A1-08 | The autonomy matrix exempts humans entirely | 🔬 CONFIRMED, **but deliberate** | small | postponed | DOCUMENT |
| **T-32** | 08 §13 A1-09 | `UUID_PATTERN` rejects UUIDv7, so locked records are writable | 🔬 CONFIRMED | small | urgent | EXECUTE |
| **T-33** | 08 §13 A1-11 | `resourceKind`/`resourceId` are unhashed in the ledger | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-34** | 08 §13 A1-14 | `authorityPolicyProblems` has zero production callers | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-35** | 08 §13 A2-06 | The sandbox's `maxOutputSize` and `maxApiCalls` are declared and dropped | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-36** | 08 §13 A2-07 | The capability-coverage test's denominator excludes the AI package | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-37** | 08 §15 QT-01 | The only assertion is wrapped in an `if` that never runs | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-38** | 08 §15 QT-04 | `describedModules().length >= 24` is a floor, so 24 modules could drop out and it still passes | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-39** | 08 §15 T-4 | The decoupling test asserts against a hand-built fixture | 🔬 CONFIRMED | small | scheduled | EXECUTE |
| **T-40** | 11 §5–§10 | Six DS rule categories of ~30; lint scope excludes user modules; 27 of 73 primitives untested; 10 widgets with no layout contract; three modules with data, API and no screen | 🔬 CONFIRMED | medium | scheduled | DOCUMENT |
| **T-41** | 07 §7.3 / 06 §3.7 | The Hermes service has **no healthcheck** — a wedged runtime is invisible | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-42** | 07 §6.2 | No `llamacpp` preset — the open-source lane squats on `OPENAI_*` | 🔬 CONFIRMED | medium | scheduled | EXECUTE |
| **T-43** | 09 §1.2 | `detectRepeatedRequest` exists and has zero callers — "show the saving" is unwired | 🔬 CONFIRMED | small | scheduled | DOCUMENT |
| **T-44** | 08 §16 / 09 §2.1 | `G-04` — the data axis — does not exist, and the compiler says so loudly on every compile | 🔬 CONFIRMED | critical | scheduled | DOCUMENT |

### 1.4 Already fixed — do not re-fix

| # | Src | The claim | What is true now | Validation |
|---|---|---|---|---|
| **X-01** | 08 §5 / §13 A1-12 | "`ledger:verify` has **zero callers**" | **FIXED.** `audit_logs/cli.ts:91,115` runs `ledgerService.verifyTenantChain`. Still no *scheduled* caller — that half stands | 🔬 FIXED |
| **X-02** | 07 §7.2 Defect 2 | "the MCP service was never given the model server's address" | **FIXED for Hermes** — `docker-compose.hermes.yml:107` forwards `OPENAI_BASE_URL`, with the P2-7/§2.13 measurement recorded beside it. **Still open for `mcp`** — see T-14 | 🔬 FIXED (partly) |
| **X-03** | 07 §12.6 | "the source pin does not exist" | **FIXED.** `library/development/HERMES-PIN.md` exists (29,340 bytes, written today), and the compose carries `HERMES_PIN_DIGEST=07ee857bdab59a875317035d8aaad4d6` — the same digest `SR-39`'s one-truth check verifies | 🔬 FIXED |
| **X-04** | 08 §3 | `run.ts:153` gate 3 | The line moved and the condition **strengthened**: it now reads `if (fn.operationType !== 'query' \|\| !fn.businessIr)`. The defect stands; the citation does not | 🔬 FIXED (citation) |

### 1.5 Corrections to the audit's own measurements

Rule 13 — a committed number can be wrong; re-measure, and commit the fix by name.

| # | The audit said | I measured | Why it differs |
|---|---|---|---|
| **C-01** | RTL: **1,129** physical vs **16** logical (70:1) | **878** vs **58** (15.1:1) | 📐 Token-level count of string literals only, over `packages/ui/src`, `packages/core/src`, `apps/mercato/src`, `packages/enterprise/src` — 4,320 files, 472,110 class-like tokens. The audit's was a word-boundary count. **The finding and its severity are unchanged; the ratio is 15:1, not 70:1.** |
| **C-02** | §6: `communication_channels` declares no command capability | **Correct** — and my own first census was wrong | My first census grepped for the bare word `capability`, which matched the prose "adapter capability" in a comment. Re-measured with `^\s*capability\s*:` : **15 core modules with `commands/`, 8 declaring a capability.** The audit's numbers were right; the measurement method was mine to get wrong. |
| **C-03** | §12 S-2/S-6 cited `commands/scope.ts:95-126` | The file is **`packages/core/src/modules/wms/commands/shared.ts:12-17`** | `ensureTenantScope` lives in the wms module's shared helpers, not a top-level `commands/scope.ts` |
| **C-04** | §15 QT-01 cited `authority/__tests__/decision.test.ts:296-303` | **`packages/shared/src/lib/authority/__tests__/decision.test.ts`**, same shape | The test moved into `shared` |
| **C-05** | §11 §10: 9 arbitrary media queries | **6** in source | Excluding tests and built output; and they are `window.matchMedia` JS calls rather than CSS media queries |
| **C-06** | *(this document's own header)* "197,912 words" | **45,652 words**, 287,331 bytes | 📐 `wc -w` and `wc -c` over the 13 files. The 197,912 figure is not reproducible by any measure of this folder — it was inherited unverified from an earlier session's note. **Rule 13 applied to my own work.** |
| **C-07** | *(this document's own ranking)* named the declared-control check **`SR-42`** | The check is **`SR-47`**. `SR-42` was already assigned in the SRS to **openrig's exclusion ledger with mechanical expiry** | 📐 `library/architecture/mapping/findings/08-THE-SRS.md` lines 78–86 and `MASTER-CHECKLIST`'s `SRSREG` both carry `SR-42` = "Exclusion ledger with mechanical expiry; ships empty". The triage's §4 ranking reused a live label without checking the register, so the same ID pointed at two unrelated requirements — and the second one would have been silently overwritten the moment anyone built the first. **Rule 13 applied to my own work, a second time.** `SR-47` is the next free number in the SRS. Corrected in all four documents; the two legitimate `SR-42` rows are untouched. |

**Two of these seven are corrections to my own work, not the audit's** — `C-06` is the headline number of this
very document, and `C-07` is the ID this document's own ranking invented for the work it ranked first. Both
were wrong until 17 October. They are listed here rather than quietly fixed, because the register's own
method commits the fix *by name* — and `C-07` in particular is the kind of error that a document which
exists to enforce "one name, one thing" cannot afford to make.

### 1.6 Not validated

Recorded so nobody mistakes silence for a pass.

| # | The claim | Why not validated | What would settle it |
|---|---|---|---|
| **U-01** | 06 §3.5 — the hosted platform's login is broken for every real account | Environmental; needs the owner's machine and a real account | One sign-in attempt on the hosted deployment |
| **U-02** | 08 §14 — the 5,000+ tests in the audited suites are all green | A full suite run is a long job and was not in scope | `yarn test` on the committed tree |
| **U-03** | 09 §3.4 — the `@deprecated` guard pair has 106 call sites in 40 files | I could not locate a file matching the audit's cited name | The audit's own grep, re-run |
| **U-04** | 08 §11 F10's exact locale-divergence example | I confirmed two comparators exist and that `localeCompare` is used in `round-trip.ts`, `model.ts` and `bindings.ts`; I did not reproduce the byte-level divergence | A two-locale round-trip probe |
| **U-05** | 11 §2 — whether the 27 untested primitives have Playwright integration coverage | The audit itself left this open | An audit of `.ai/qa/` |

---

## 2. The two CRITICALs, with the measurement

### 2.1 T-01 — a delegation lends authority the lender does not have

**Every decisive line, read today.**

- `packages/core/src/modules/auth/api/authority/delegations/route.ts:25-26` — the guard config is
  `{ requireAuth: true, requireFeatures: [FEATURE_MANAGE] }`. The route requires
  `auth.delegations.manage`. **It does not require the capability being granted.**
- `:33` — `capabilityId: z.string().min(1).max(200)`. Any string. No descriptor lookup.
- `:118-130` — `delegations.grant({ grantorPrincipalId: principal.id, capabilityId: parsed.data.capabilityId, … })`.
  The grantor is derived from the caller and **never checked against the capability**.
- `services/delegationService.ts` — no reference to `getCapabilityDescriptor`, `delegable`, or any grant check.
- `.delegable` — **0 production consumers** repo-wide, outside `acl.ts` declaration sites.
  `.standingApprovable` — **0**.

**The failing scenario, unchanged:** a user holding only `auth.delegations.manage` — a reasonable, limited
role — can lend `api_keys.manage` (minting identities) or `directory.tenants.manage` to anybody, or to
themselves. `api_keys.manage` is declared `delegable: false` and nothing notices.

**The fix is one function**, and the code to copy already exists: read
`getCapabilityDescriptor(capabilityId)`, refuse when `delegable: false`, refuse a self-delegation with a null
ceiling. **Rank: critical. Urgency: urgent.**

### 2.2 T-02 — the AI's business-query tool checks scope but not authorization

**Every decisive line, read today.**

- `packages/ai-assistant/src/modules/ai_assistant/ai-tools/business-ir-pack.ts:94` —
  `requiredFeatures: ['ai_assistant.view']`.
- `:129` — `features: ctx.userFeatures` is built and passed.
- `lib/business-ir-run.ts`, `shared/src/lib/business-ir/compile.ts`,
  `shared/src/lib/business-ir/bindings.ts` — **0 reads of `features`**. The only hit in
  `business-ir-author.ts:84` is a comment.
- `business-ir-run.ts:324` — `engine.query(binding.platformEntityId, plan.physical)`, **no per-entity gate**.

**One correction to the audit's wording, which makes the finding sharper.** `ai_assistant.view` *is*
declared — in `packages/ai-assistant/src/modules/ai_assistant/acl.ts`, as an ACL feature. What it does not
have is a **`capability` descriptor**. `registerCapabilityDescriptors` skips any feature without one
(`registry.ts:44`), so `getCapabilityDescriptor('ai_assistant.view')` returns `null`, `decideFor` returns
`null`, and `checkToolAuthority` permits — `tool-authority.ts:136-139` documents that as a deliberate
migration position ("enforcing on absence would make every wildcard grant a denial"). **That reasoning is
defensible for the descriptor's absence. It is not a defence for `features` being passed into the chain and
never read** — which is unintended, and is why **T-36** matters: the capability-coverage test's denominator
is `packages/core/src/modules`, so the eight `ai_assistant.*` features are never counted, and the gap that
makes this gate inert is itself invisible to the build.

**The fix is one call**, and the code to copy already exists: `authorizeEntityAccess` in
`packages/search/src/modules/search/ai-tools.ts:86`, with all 53 entities' `aclFeatures` behind it.
**Rank: critical. Urgency: urgent.**

### 2.3 T-03 — the root cause, and why it is ranked with them

`.delegable` written in twenty places, read in none — nothing fails. `demoteIfEvidenceDemands` tested and
never called — nothing fails. `risk`/`approval`/`idempotency` with zero declarations — nothing fails.
`authorityPolicyProblems` with zero callers — nothing fails. `findFrontendVocabulary` with zero callers —
nothing fails. `detectRepeatedRequest` with zero callers — nothing fails. **Six findings in this register
are the same finding.**

The workshop already owns the mechanism. `SR-39`'s `check-one-truth.mjs` is a registry-driven check that
fails when copies disagree; `SR-41`'s `check-escape-hatches.mjs` is a census that fails when a hole carries
no reason. Both were committed today. **`SR-47` is the same shape pointed at declared controls**: a registry
of declared controls, each naming at least one production reader, asserted by a test that fails when either
side is empty. It would have caught T-01, T-08 and T-29 at build time, and the next three automatically.

**This is why it is ranked critical and scheduled urgent, ahead of the individual patches.** A patch closes
one instance. `SR-47` closes the class.

> ✅ **`SR-47` WAS BUILT, 2026-10-17.** `scripts/check-declared-controls.mjs` in the code repo, committed as
> `52383e09`. Six controls registered; **five UNCOVERED and one DEAD-INPUT**, exactly as predicted. Two things
> the build added beyond the plan: the **DEAD-INPUT shape** (the C6 contract's reader *is* wired at
> `command-bus.ts:452` and zero handlers write the field, so it returns `null` for every handler — a dead
> control that looks completely alive, and harder to see than a function nobody calls), and a **wider census**
> that put the class at **3,658 of 14,311 exported symbols (25.6%)** with no production consumer — a figure to
> watch, not a gate to trip, and the reason the registry is curated rather than automatic. The check was also
> **wrong twice while being built, both times in the dangerous direction** (a dead control reading as wired),
> which is why `strip()` removes string, comment *and* regex-literal contents before any pattern is applied.
> T-03 is now closed; **T-01, T-08, T-29 and T-43 remain open and are still the work.**

---

## 3. What the audit got right about its own process — and why that matters here

The audit's §19 records that a hostile-critic pass attacked every claim and **every defect finding
survived**, while four of the audit's own evidentiary lapses did not. I re-measured 46 findings and found
**zero false**. That is a remarkably high hit rate for a cold read of a codebase this size, and it changes
how this register should be used: **the audit's findings can be trusted as a work list.** What needed work
was its *numbers* — five of which I have corrected in §1.5 by name.

The audit's own §18 sentence is the one I would put in front of every new developer, and it is the
workshop's own rule restated by an outsider:

> *"a standard that lives only in a document is a wish."*

---

## 4. The recommended order

The audit's §17 order and mine agree on the first four. Where they differ is at the top, and the difference
is the one substantive recommendation this document adds.

| # | The work | Why here |
|---|---|---|
| 1 | **`SR-47` — the declared-control coverage check** (T-03) — ✅ **BUILT 2026-10-17** | It is the class, not an instance. The workshop already owns the mechanism. Doing it first means T-01, T-08, T-29 and the next three are caught mechanically rather than patched one at a time |
| 2 | **T-01 and T-02** — the two CRITICALs | Live privilege-escalation and data-exposure routes, both reachable from an ordinary role, both one function to close, both with the code to copy already in the repo |
| 3 | **T-32** — `UUID_PATTERN` `[1-5]` → `[0-9a-f]` | One character. Locked records become writable by a v7-id payload. There is no reason to leave a one-character fail-open in place |
| 4 | **T-13 and T-14** — `--jinja` and the `mcp` base URL | Both are one line in a compose file, both are live today, and T-14 is the difference between the embedding lane working and it silently calling `api.openai.com` |
| 5 | **T-04, T-05, T-06** — the count gap, the double approve, the ledger hole | The three HIGHs that break a central guarantee with a green test suite behind them |
| 6 | **T-07, T-27, T-16, T-17** — the fail-open flips | Four small edits that each remove a silent failure mode, and T-27 is the one that lets an `auth: null` context accept a foreign tenant |
| 7 | **T-09, T-12** — repair the DS lint, guard `/backend` | T-09 unlocks thirty rule categories; T-12 removes a documented crash trap |
| 8 | **T-11** — the RTL campaign | A campaign, not a flag: 878 physical sites vs 58 logical. Start with `packages/ui/src`, the primitives every consumer inherits |
| 9 | **T-44** — `G-04`, the data axis | The single gap the audit's `09` ranks above every feature request, because four other features wait on it. Correctly **scheduled**, not urgent: it is a foundation item with its own sequencing in the SRS |

---

## 5. What this document does not do

- It does not schedule anything. **BUILD-ORDER.md and the SRS own the sequence.** Every "scheduled" row above
  names a plan item only where the plan already names it.
- It does not resolve an owner decision. The seven `DP-*` and `CC-*` questions in `06 §1` remain the owner's,
  and are recorded here as untouched.
- It does not re-run the suites. **U-02** is open, and the audit's green-suite claims are second-hand.

---

*Every finding above was measured against `workspace/starting-kit/` at `b183df58`. Where I corrected a
number, the correction is named in §1.5. Where I could not validate, §1.6 says so rather than guessing.*
