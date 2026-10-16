# THE MASTER CHECKLIST — everything we are building, in one place

**Purpose (owner, 2026-10-16):** *"I like to feel in control of what's done, where we are, and what's
left. One simple list that basically lists everything we will do with tick-boxes. When you say we
will do CC-84, I don't need to do an hour of research to see what that is, where it sits in the whole
development lifecycle."*

This is that list. **The HTML view is [`MASTER-CHECKLIST.html`](MASTER-CHECKLIST.html)** — open it in a
browser; it is self-contained and works offline. This markdown is its text twin and the anchor that
keeps it honest.

> **The rule this file obeys:** the detailed registers stay the source of truth. This is the **one
> index** that ties them together in plain English so no one has to hunt. When a status changes, it
> changes here **and** in the register it came from — never here alone.

---

## 1. Where the whole project stands — the headline

**78 of 321 units (~24%)**, derived from the ticked boxes, never typed. Counts on the checklist
rows (the 46 numbered vision rows plus `21b`, which is a row in its own right):

| Status | Rows | Meaning |
|---|---:|---|
| ✅ **done** | 32 | verified in code |
| 🟡 **partial** | 9 | capability built, a named remainder open |
| ☐ **open** | 4 | not started, trigger named |
| ⛔ **absent** | 2 | does not exist yet (business verticals) |
| | **47** | across 11 phases |

*(Counts measured from the checklist data, 2026-10-16 — the first draft of this line said 28/6/3/2
from memory and was wrong; Rule 13 applied.)*

**The honest headline:** the work that is *done* sits **high** in the stack — the AI-first loop is
largely built — while the **platform skeleton underneath it is only starting**. The next work goes
**down the stack** (the skeleton), not sideways into business modules.

**Source of truth for the number:** `platform_points.md` → THE ONE NUMBER.

---

## 2. ▶ The frontier — what is being built now

- **★ LAST DONE — 2026-10-17 (night): `T-13` + `T-14` — the two live compose defects — BUILT (`CC-98`),
  and `T-45` — a locked record is refused now — BUILT (`CC-97` closed).** The urgent set is now clear.
  - **`T-13` — `--jinja` added to the llama.cpp `model` service** (`docker-compose.fullapp.yml`, the only
    file that runs it). Without it llama.cpp does not format tool calls through the model's own chat
    template, so tool calling was silently degraded.
  - **`T-14` — `OPENAI_BASE_URL` forwarded to the `mcp` service** in `docker-compose.fullapp.yml` and
    `docker-compose.fullapp.dev.yml`, mirroring `docker-compose.hermes.yml:107`; without it the embedding
    lane silently called `api.openai.com`.
  - **Verified live, not just parsed:** both files pass `docker compose config`; the model and mcp
    containers were recreated and read back — `docker inspect` shows `--jinja` in the model's args and
    `OPENAI_BASE_URL=http://model:8080/v1` in the mcp env; both healthy.
  - **`T-45` — a locked record is refused, not passed — BUILT (Option A, the owner's ruling).** The gate
    computed the lock's `A0` and then ignored it (`HELD_GATES = {A1,A2}`, `interceptors.ts:56`), so an
    `A0` fell through to "gate permits the act to run now". It excluded `A0` believing `RbacService` had
    already refused it — true for a *capability* refusal, false for a *record lock*, which the route guard
    cannot make because `refusalFor` threads no record id and the gate is the only path that does. The
    gate now refuses `A0` with a new `AuthorityRefusedError` (403 — "you may not", distinct from the held
    case's 202); the gate's own docblock claim was corrected by name (rule 13).
  - **Proof:** 21 tests across the two gate suites (the T-32 pin "still passes a locked record" is flipped
    to "refuses a locked record"); **3 mutations run for real, each killing exactly its named tests** —
    remove the branch (the 4 refusal tests), mislabel `REFUSAL_GATE` (the same 4), wrong status (the
    status assertion) — file restored **byte-identical** (`f3c1017b…`); 71 tests across all 13 auth
    command suites; `tsc --noEmit --incremental false` clean, eslint clean.

- **★ AND EARLIER — 2026-10-17 (evening): `T-32` — a v7 record id no longer hides a record's lock — BUILT
  (`13c6206f`).** *(Superseded as LAST DONE by the compose/`T-45` block above.)* The audit's A1-09: `readRecordId` (`interceptors.ts:89`) accepted only RFC-4122 v1–v5
  ids — version nibble `[1-5]`, variant nibble `[89ab]` — so a valid v7 id failed the pattern, reached
  the resolver as `recordId: null`, and `resourceCeilingFor` (`authorityEnforcementService.ts:335`)
  returns early on `!recordId`: **the lock was never looked up** — no ceiling, no project context, no
  grade. The command gate is the **only production caller that threads a recordId** (`refusalFor` at
  `rbacService.ts:595` calls `decideFor` with no options; the AI tool path threads only
  `onBehalfOfUserId`), so this one pattern was the single point where record locks reach the resolver.
  And the house tests could not have caught it: every existing gate test mocks `decideFor` entirely
  (QT-02 — the mock ignores its arguments, so deleting the threading would leave a green suite).
  - **The fix goes one step beyond the recorded one, by name (rule 13).** The triage recorded
    `[1-5]` → `[0-9a-f]`; re-measured, the variant nibble is the same class of over-strictness (a valid
    UUID with a non-RFC variant bypasses the lookup identically), so the fix takes the shape to its
    logical end — `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. In-repo precedent
    measured: `sync-run-service.ts:7` and `grantChecks.ts:46` use exactly this shape; `crud/ids.ts:5`
    shows the house relaxing in the same direction with `[1-8]`. Version and variant are properties of
    the **generator**, not the record — ids are v4 today (`gen_random_uuid()`) but the `uuid` column
    accepts any version and imports/sync/future migrations can carry v7; the shape is what keeps a slug
    or numeric id from colliding with a lock, which is the docblock's stated purpose.
  - **Proof:** 7 tests in `authority-command-gate.record-id.test.ts`, driving the real gate and the real
    `AuthorityEnforcementService` with a stub lock reader; **the decisive assertion is that the lookup
    happened at all** — `stateFor` called with the record's real id, after which a restricted record
    named by a v7 id is **held** at A2. 4 mutations run for real, the file restored byte-clean between
    runs, each killing exactly its named tests (M1 restore the pre-fix pattern → the hole ×2 + uppercase
    + locked; M2 accept any string → the slug/numeric guard; M3 drop `/i` → uppercase; M4 remove the
    threading → all 5 threading tests). Verified: 19 tests across the two gate suites, 809 tests /
    90 suites across `src/modules/auth`, `tsc --noEmit --incremental false` clean, eslint clean; both
    files pure LF, no BOM.
  - **★ WHAT IT EXPOSED, NOW CLOSED — `T-45` / `CC-97`:** building T-32 revealed that a **locked** record
    still passed the gate. That is fixed in the block above — the gate now refuses `A0` — so `CC-97` is
    closed and the pinning test was flipped from "still passes a locked record" to "refuses a locked
    record".

- **★ AND EARLIER THE SAME DAY — 2026-10-17 (afternoon): the two CRITICALs, `T-01` and `T-02` — BOTH
  BUILT (`fa974bb1`, `60a6714f`).**
  *(Superseded as LAST DONE by `T-32` above; the full record is in `CC-94` and `CC-95`.)*
  - **`T-01` (`fa974bb1`):** a delegation no longer lends authority the lender does not have. The route's
    guard required `auth.delegations.manage` and never the capability being granted; three checks now run
    before `delegations.grant` — the grantor-holds check, the `delegable: false` refusal, and the
    self-delegation ceiling — one more than the triage's fix sentence named. 9 tests, 3 mutations run for
    real; **the decisive assertion is that the write never happened**.
  - **`T-02` (`60a6714f`):** the business-query tool no longer reads an entity the caller has no
    permission for. One fail-closed gate before `engine.query`, copied from the search module's
    `authorizeEntityAccess` because the two packages must not depend on each other. 8 tests, 7 mutations
    run for real; **the decisive assertion is that the read never happened**.

- **★ AND EARLIER THE SAME DAY — 2026-10-17: `SR-47`, the declared-control coverage check — BUILT,
  `52383e09`.**
  The item the triage's own ranking put **first, ahead of both CRITICAL patches**, and the reason it
  went first: **six findings in the register are the same finding** — `.delegable`,
  `demoteIfEvidenceDemands`, the C6 command contract, `authorityPolicyProblems`,
  `findFrontendVocabulary`, `detectRepeatedRequest`, every one declared, every one with **zero
  production readers**, every one **invisible to the build**. A patch closes an instance; this
  closes the class.
  **What shipped:** `scripts/check-declared-controls.mjs` + a 10-test suite + a mutation-proof
  harness. **Six controls registered; five read UNCOVERED and one reads DEAD-INPUT**, exactly as
  predicted. **The test column is the finding** — every one of them has a full test suite and not
  one production consumer:

  | control | verdict | decl | prod consumers | test consumers |
  |---|---:|---:|---:|---:|
  | `capability-delegable` | UNCOVERED | 24 | 0 | 0 |
  | `trust-demote-if-evidence-demands` | UNCOVERED | 1 | 0 | 4 |
  | `authority-policy-problems` | UNCOVERED | 1 | 0 | 3 |
  | `business-widget-frontend-vocabulary` | UNCOVERED | 1 | 0 | 5 |
  | `request-repeat-detector` | UNCOVERED | 1 | 0 | 13 |
  | `command-contract-c6` | **DEAD-INPUT** | 1 | 1 | 4 |

  **★ THREE SHAPES, because "nobody calls it" is not the only way a control dies.** `field`
  (declared, never read), `export` (exported, called only by its own test), and — **new, and the
  one that most deserves a check** — `input`: the C6 contract's reader *is* wired
  (`command-bus.ts:452`) and **zero handlers declare `risk`/`approval`/`idempotency`**, so it
  returns `null` for every handler. A dead control that looks completely alive.
  **★ A SECOND FINDING FROM THE BUILD — the class is far wider than the six.** A mechanical census
  of every exported symbol with no production consumer puts it at **3,658 of 14,311 (25.6%)**.
  That is **not** a defect count — most of it is zod schemas and type aliases exported as a
  module's declared surface — so the registry is **curated**, and the census is a figure to watch,
  not a gate to trip. Publishing 3,658 findings would bury the six that are real, which is the
  same noise problem `SR-41` was careful to avoid.
  **★ THE CHECK WAS WRONG TWICE WHILE BEING BUILT, both times in the dangerous direction** — a
  dead control reading as *wired*. (1) String literals were not stripped, so `auth/acl.ts:112`'s
  sentence **"Emphatically not itself delegable:"** read as a declaration site — a raw grep reports
  29 declarations for `.delegable` where the true count is **24**, five of them prose inside
  `note:` strings. (2) Regex literals were not stripped, so the registry's own
  `consumer: /\.delegable\b|\[['"]delegable['"]\]/` — a quote inside a character class — read as a
  string delimiter, the `\.delegable` before it survived, and **the check reported itself as the
  control's consumer**. On a real run that made `.delegable` look COVERED. `strip()` now removes
  string, comment **and** regex-literal contents before any pattern is applied, keeping length and
  newlines so line numbers stay true. **Six mutations prove the suite has teeth.**
  **★ AND A NAMING CORRECTION ON MY OWN WORK (`C-07`):** the triage's §4 ranking called this
  **`SR-42`**, which was **already assigned** in the SRS to *openrig's exclusion ledger with
  mechanical expiry*. One ID, two unrelated requirements, and the second would have been silently
  overwritten the moment anyone built the first. Corrected to **`SR-47`** (the next free number)
  in all four documents; the two legitimate `SR-42` rows are untouched. **A document that exists
  to enforce "one name, one thing" cannot afford to break that rule itself.**
  **What remains open:** **T-08, T-29 and T-43** — the check reports them, it does not
  fix them. T-03 itself is closed, and **T-01 is now built**.

- **▶ NEXT — the two live compose defects:** **T-13** — `--jinja` is absent from every compose file;
  **T-14** — the `mcp` service's missing base URL, which is the difference between the embedding lane
  working and it silently calling `api.openai.com`. Both are one line in a compose file, both live
  today. **Then the tooling set's remainder** (`CC-91` — `SR-38` digital-twin harness, `SR-46`
  two-reads lint), and the sequence behind it unchanged: identity (`SR-02`/`SR-07`) → `SR-12` (the
  fix for open `CC-84`) → `P2-9b`. The two CRITICALs and T-32 do not delay any of these — they were
  the urgent pair, and `SR-47` remains the item that makes the next findings arrive as a build
  failure instead of a discovery.

### 2.1 And earlier the same day (2026-10-16) — the `preview/` audit, `CC-92`

- **2026-10-16 (late): the `preview/` audit, triaged and validated — `CC-92`.**
  *(Superseded as LAST DONE by `SR-47` above; kept in full because every `T-*` reference downstream
  resolves here.)*
  13 documents, **45,652 words**, written 11–14 Oct by an agent brought in cold, and **never triaged**.
  **46 findings re-measured against the code at `b183df58`: zero false.**
  **Both CRITICALs confirmed and still open.** **T-01** — the delegation route's guard is
  `{requireAuth, requireFeatures:[FEATURE_MANAGE]}`, i.e. `auth.delegations.manage`, and **never the
  capability being granted**; `capabilityId` is `z.string().min(1)` with no descriptor lookup; and
  `.delegable` has **0 production readers** repo-wide. **T-02** — `business-ir-pack.ts:129` passes
  `features: ctx.userFeatures` into the Business-IR chain and **0 of the four files read it**;
  `engine.query` at `business-ir-run.ts:324` runs unguarded. **One correction that sharpens T-02:**
  `ai_assistant.view` *is* declared in the ai-assistant package's own `acl.ts` — what it lacks is a
  `capability` descriptor, and `registerCapabilityDescriptors` skips features without one, so `decideFor`
  returns null and the tool is permitted. The descriptor's absence is a documented migration position;
  `features` being unread is not.
  **And the measurement that matters most — my own census was the error.** §6 claims
  `communication_channels` declares no command capability. My first census grepped the bare word
  `capability` and **matched the prose** "adapter capability" in a comment, scoring it as declared.
  Re-measured with `^\s*capability\s*:`: **15 core modules with `commands/`, 8 declaring one.** The audit's
  numbers were right; the method was mine to get wrong. **Rule 13 applied to my own reading.**
  **Four claims now fixed — recorded so nobody re-fixes them:** `ledger:verify` **has** a caller
  (`audit_logs/cli.ts:91,115`; only the *scheduling* half stands); `OPENAI_BASE_URL` **is** forwarded to
  `hermes-gateway` (`docker-compose.hermes.yml:107`, with the P2-7/§2.13 measurement beside it) — **but not
  to `mcp`**, which is still open; `HERMES-PIN.md` **exists** (29,340 bytes, digest `07ee857b…` — the same
  one `SR-39` verifies); and `run.ts` gate 3 gained `|| !fn.businessIr`.
  **Five of the audit's own numbers corrected by name** (`C-01`…`C-05`), the largest being the RTL ratio:
  **70:1 → 15.1:1**. Measured token-level over string literals — 4,320 files, 472,110 class-like tokens,
  **878 physical vs 58 logical** — against the audit's word-boundary count of 1,129/16. **The finding and
  its severity are unchanged.**
  **A sixth correction is on my own work (`C-06`):** this pass first carried the preview folder as
  **197,912 words**; that figure is not reproducible by any measure of the folder (`wc -w` = **45,652**,
  `wc -c` = 287,331 bytes). It was inherited unverified, and rule 13 commits the fix by name.
  Document: [`PREVIEW-AUDIT-TRIAGE.md`](PREVIEW-AUDIT-TRIAGE.md).
- **★ THE RANKING'S OWN FINDING — and the one substantive addition to the audit's §17 order:**
  rank **`SR-47` — a declared-control coverage check — FIRST, ahead of both CRITICAL patches.**
  ✅ **BUILT 2026-10-17** (`52383e09`), and it confirmed all six.
  Because **six findings in the register are the SAME finding**: `.delegable`,
  `demoteIfEvidenceDemands`, the C6 command contract, `authorityPolicyProblems`,
  `findFrontendVocabulary`, `detectRepeatedRequest` — every one declared, every one with **zero production
  readers**, every one **invisible to the build**. A patch closes an instance; `SR-47` closes the class —
  **and the workshop already owns the mechanism** (`SR-39`'s one-truth check + `SR-41`'s escape-hatch
  census, both committed the day before).
- **▶ NEXT — the two CRITICALs (T-01, T-02):** both are **one function to close**, and the
  code to copy already exists in the repo — `getCapabilityDescriptor` for T-01, `authorizeEntityAccess`
  (`search/ai-tools.ts:86`, 53 entities' `aclFeatures` behind it) for T-02. **Then the one-character fix**
  (T-32: `UUID_PATTERN`'s `[1-5]` → `[0-9a-f]` — a v7 id currently fails the match, so no lock lookup runs
  and a locked record is writable), **and the two live compose defects** (T-13 `--jinja`, absent from every
  compose file; T-14 the `mcp` service's missing base URL, which is the difference between the embedding
  lane working and it silently calling `api.openai.com`). **`SR-47` does not delay any of these** — it is
  the item that makes them arrive as a build failure instead of a discovery, and it now runs
  `check:declared-controls` on demand.
- **▶ THEN — the rest of the tooling set (`CC-91`), unchanged:** `SR-38` (digital-twin harness — fixtures
  typechecked against the real interfaces, so drift breaks the build) and `SR-46` (the two-reads lint —
  **★ whose stated home needs a correction:** `packages/eslint-plugin-ds` runs only on **backend-UI
  files** via `eslint.ds.config.mjs`, so a *settings-read* lint there would never fire on the files that
  read settings; it belongs in the `scripts/check-*.mjs` family, where cross-file drift is visible).
  These are the SRS's *"land FIRST; make everything after cheaper"* items, and they **gate the critical
  path**: tooling → identity (`SR-02`/`SR-07`) → **`SR-12` (per-tenant engine home)** → `P2-9b`.
  **`SR-47` does not displace that order** — it *is* the SRS's own *"land FIRST"* item, and it is the item
  that makes the next three findings arrive as a build failure instead of a discovery.
- **▶ AND THEN — `P2-9b`, now SPLIT (owner's ruling 2026-10-16):** **(1)** the default-flip to Hermes + the
  `hermes-local` retirement (`CC-74`) — **after `SR-12` lands**, because until then a flip would make the
  open `CC-84` hole (a Hermes turn runs platform tools as ONE superadmin identity, outside the chat's
  tenant) the **default** path; and **(2)** the OpenCode deletion (`R28-6`/`N-8`) — **DEFERRED**: OpenCode
  stays in place, un-defaulted, so that deleting it cannot break something we are unaware of; revisit once
  its presence has proved harmless.
- **ALSO NOW:** the architecture workshop's mapping pass is **DONE** — **53 requirements**:
  `SR-01`…`SR-46` plus 7 lettered variants (`SR-19a`, `SR-19b`, `SR-21a`, `SR-22a`, `SR-32a`,
  `SR-33a`, `SR-35a`). **★ A notation correction on this line itself (2026-10-17):** it previously
  read *"`SR-01`…`SR-53`"*, which is wrong twice over — there is no `SR-53`, and the highest base
  number is `SR-46`. The count of 53 was right; the range was not. **Rule 13 applied to my own
  frontier card.**
  Two platform studies remain (mattermost + activepieces), and the approved next
  build is the tooling set (`SR-38`/`39`/`41`/`46`) + `SR-08`.
- **Behind it:** Row 16 team-leg (`CC-51` — your go-ahead) and the `B-WS/B9` widget design.

### 2.1 And earlier the same day — the warm-up's last leg, and the handshake gate

- **`CC-88` / `CC-89` / `CC-90`.** The **cold fill was caught live** — the loop engaged unattended and
  refilled the prefix in **2,051 s** (`8.07 tok/s`), after which the next request reused **16,559 of
  16,560 tokens in 4.1 s** — `CC-88`. The **stdio handshake gate PASSED in 103.9 s** on the re-pinned
  worker (`hermes-gateway:p2-9a` / tree `07ee857b…`): `ping`→pong, `gateway.capabilities`→
  `per_session_exclusive_submit`, `client.capabilities`→16 `server_requests`, the `gateway.ready` event,
  `process.stop`→answered, and **all 5 stdout frames valid JSON-RPC** — **closes `CC-86`**. The CPU gain
  was re-measured honestly — **+10 % on the whole 16,560-token fill** (2,264 s @ 7.32 → 2,051 s @ 8.07
  tok/s), not the +56 % a 2,048-token segment had suggested — `CC-89`. The gate then found a **real
  defect**: `docker/hermes/verify_pin.py`'s `DEFAULT_EXPECTED_DIGEST` still named the **previous** revision
  after the 2026-10-16 re-pin, so any caller not given `HERMES_PIN_DIGEST` read a correctly-pinned tree as
  `PIN BROKEN` — `CC-90`, **open** (source corrected; the image needs a rebuild to carry it).
  **Also measured, and it unblocks the next step:** a **turn-shaped** request (system + tools + a user
  message) reuses **99.92 %** of the turn prompt — 16,558 of 16,572, leaving **14 tokens** to prefill —
  so the warm-up **retires the stale-timeout hazard** that gated the switchover
  (`DECISION-p2-9b-stale-timeout-trade.md` §4.6).
- **`CC-91` — the tooling set's first two slices, `SR-39` + `SR-41`, built 2026-10-16:** a
  registry-driven `scripts/check-one-truth.mjs` (code repo) + a **mutation-proof** test
  (`scripts/__tests__/check-one-truth.test.mjs`, 4/4) + the `check:one-truth` script, with the **Hermes
  pin digest** as its first fact — the fact that actually drifted (`CC-90`); **and** the **escape-hatch
  census** `scripts/check-escape-hatches.mjs` + a 5/5 test + `check:escape-hatches`/`:fail`, which
  **measured the real repo: 7,968 files · 202 holes · 33 named · 169 unnamed** — one-sided, because every
  `@ts-expect-error`/`@ts-ignore` carries a reason (24 of 24) while only **8 of 168** `eslint-disable`s
  do. **Finding:** the SRS marks the four BORROW, but the repo **already runs the pattern**
  (`check-version-alignment.sh` = one-truth; `check-agents-md-budget.mjs` + `.baseline.json` = the
  ratchet, `SR-40`), so the work is *generalise*, not *import*. Plan:
  [`PLAN-tooling-set-SR-38-39-41-46.md`](PLAN-tooling-set-SR-38-39-41-46.md).
- **And what was deliberately NOT done in the triage pass:** the hosted-login defect (`06 §3.5` — needs the
  owner's machine and a real account) and the audit's green-suite claims (a full run was not in scope) are
  recorded **UNVALIDATED** in the triage document — named as unverified rather than guessed or silently
  passed over.

---

## 3. The checklist — 47 rows in build order

Filterable in the HTML. IDs point at the register items that build each row, so a code-name always
resolves. The full per-row evidence is in `platform_points.md` → THE LIST.

| # | Phase | What you can do after this | Status | Register IDs |
|---:|---|---|---|---|
| 1 | 0 | Every record has a stable ID, owner, version, who-changed-it trail | 🟡 | C1–C11 / P0-spec · CC-12, CC-6, CC-20 |
| 2 | 0 | Answer what-is-this / who-owns-it / what-depends from one registry | ✅ | G-01 |
| 3 | 1 | Users, login, password reset, a session that knows who you are | ✅ | P1 |
| 4 | 1 | An agent is a real object — owned, acting-as, with a role | ✅ | AH-1 |
| 5 | 2 | Several organisations with hard walls between them | ✅ | P2 |
| 6 | 2 | Organise a tenant into units/departments, scope data to them | ✅ | P2 |
| 7 | 3 | Roles + permissions enforced on every write, not just the UI | ✅ | P3 |
| 8 | 3 | Creating a table/column forces the permission question | ✅ | SD-1 / S2 / P3a / P3b |
| 9 | 3 | Permission rules stored and read back by the running app | ✅ | P3b / M3e |
| 10 | 3 | Every write passes one gate: allow / refuse / ask a human | ✅ | P18 / D0–D3 |
| 11 | 3 | Change behaviour by setting, not by deploying code | ✅ | D1 |
| 12 | 3 | A high-impact change can be sent for approval | ✅ | D3 · CC-15, CC-38 |
| 13 | 3 | See and change the rules that govern a structure, from a screen | ✅ | SD-4 / SD-5 · CC-34 |
| 14 | 4 | Sensitive fields marked; never logged, never exported by accident | ✅ | P4 |
| 15 | 5 | Every read filtered by permission at the data layer | ✅ | P10 / CC-46 / CC-47 |
| 16 | 5 | Restrict a person to their own / their team's rows | 🟡 | CC-50 (own) · CC-51 (team) |
| 17 | 5 | Permission coverage reaches every table; a new table can't be un-gated | ✅ | CC-52 |
| 18 | 5 | The AI's read path goes through the same gates as a human | ✅ | CC-53 · CC-54 |
| 19 | 5 | Every state-changing action goes through one typed command | ✅ | S5 / CC-61 · CC-63 |
| 20 | 5 | A generic state-machine engine for any stage→stage flow | 🟡 | G-22 · CC-42 |
| 22 | 5 | An AI user can run only the agents bound to it | 🟡 | CC-27 core · CC-55/56/57 legs |
| 21 | 6 | See who did what, when, on which record; export for compliance | ✅ | P4 · CC-64, CC-65 |
| 21b | 6 | Audit history independent of the business record (can't edit your past) | ✅ | P4a (hash-chained ledger) |
| 23 | 7 | Type a request in words; the platform makes a typed business request | ✅ | G-02 / G-17 · CC-58 |
| 24 | 7 | The AI is structurally constrained — it cannot hallucinate a table | ✅ | G-17 |
| 25 | 7 | The platform validates deterministically before anything runs | ✅ | G-02 |
| 26 | 7 | Every request ends one of three known ways | ✅ | G-21 · CC-13 |
| 27 | 7 | The user is told when blocked, noticed and suggested to | 🟡 | S3 / S8 · CC-66, CC-8, CC-9 |
| 28 | 8 | The agent runtime sits behind one typed door | 🟡 | B-05 / Port · R28-6 = CC-72 |
| 29 | 8 | An AI user bound to a specific agent, tools and scope | ✅ | CC-27 (= row 22) |
| 30 | 8 | Each AI job declares which model it uses | ☐ | S6 |
| 31 | 9 | Save a request as a Function that runs with zero AI | ✅ | G-03 |
| 32 | 9 | A Function's lifecycle is an enforced state machine | ✅ | G-03 · CC-32 |
| 33 | 9 | A published Function never calls a model at run time — proven by test | ✅ | G-03 |
| 34 | 9 | A Function runs from a Widget with typed inputs/outputs | ✅ | G-07 |
| 35 | 9 | Place Functions and Widgets on a Workspace and share it | ☐ | B-WS design · CC-62 build set |
| 36 | 10 | A complete business vertical runs end-to-end on the skeleton | 🟡 | B1–B14 |
| 37 | 10 | CRM: leads, contacts, deals, pipeline | ✅ | B1 |
| 38 | 10 | Sales: orders, quotes, invoices, returns | ✅ | B2 |
| 39 | 10 | Catalog: products and pricing | ✅ | B3 |
| 40 | 10 | Inventory / WMS: stock and warehouses | ✅ | B4 |
| 41 | 10 | Finance / accounting (GL, AP/AR) | ⛔ | B5 / M1 |
| 42 | 10 | Procurement / purchasing | ⛔ | B6 / M2 |
| 43 | 10 | HR / people (payroll absent) | 🟡 | B7 |
| 44 | 10 | Projects, shipping, payments, customer portal | 🟡 | B8–B14 |
| 45 | 11 | Entitlements separated from permissions | ☐ | blueprint §50 |
| 46 | 11 | Deployment, operations and the dev-doc set complete | ☐ | J / K · CC-19, CC-41 |

---

## 4. Open work — every unfinished item, with its trigger

**The trigger is the observable event that makes an item startable.** Full plain-English detail is in
`platform_points.md` → ⏳ OPEN WORK (29 items) and in the HTML view, grouped by row.

Startable now or near-term (no hard blocker): **CC-66(2)** the history read · **CC-54** on the next
index rebuild · **CC-63** when a command is next touched · **CC-41** on the next deploy.
Needs you: **CC-11** (arm enforce per-tenant) · **CC-51** (team-leg go-ahead) · **CC-65** (retention
policy). Trigger-blocked on another build: **CC-6 / CC-20 / CC-66(1)** on G-04 · **CC-32** on G-09 ·
**CC-72 (R28-6)** — the stale-timeout gate is **RULED 2026-10-16** (Option 1 of the decision record:
keep the 2400 s ceiling, `P2-9b` = measure-and-configure); the deletion now waits only on `P2-9b`'s
one in-process prompt measurement.

*Closed since the first draft, verified in code and in the register: **CC-60** (done by `P2-4` — the
runner agent `business_ir.query_runner` carries the fixed one-tool menu `business_ir.run_query`,
`ai-agents.ts:197`) and **CC-67** (row 28's door is complete; the open row-28 item is `CC-72`).*

---

## 5. The register — every named item, closed and open

The `CC-*` codes are the fine-grained items behind the rows above — the cuts, the findings, the fixes.
**Every one has an address here**: a code you meet anywhere in the documents resolves on this page.
**Closed** = built and proven (tests, mutations, a separate-agent hostile critic — the record is in
`COMPLETION-CALLBACKS.md`). States were read item by item from that register, not scanned by keyword.
**CC-75 was never assigned** — the numbering skips it. **52 closed · 44 open · 96 total.**

| Item | What it is, in plain words | State |
|---|---|---|
| CC-1 | The permission write now lands: the gate's defaulted outcome is applied to the tenant's grant role | ✅ closed |
| CC-2 | The batch route is gated at the route | ✅ closed |
| CC-3 | The module-install / CLI create paths are gated, fail-closed, grants after the flush | ✅ closed |
| CC-4 | A field re-type is gated on every write site that can re-type one | ✅ closed |
| CC-5 | The S11 grammar ships as a setting (five verbs — SD-4 Slice C) | ✅ closed |
| CC-6 | The data-axis row shape is not built (per-record view / manage) | ☐ open |
| CC-7 | The catalogue is in-process for recorded surfaces — a recorded field lives for the process, not a durable row | ☐ open |
| CC-8 | tool-test-runner runs a read-tool handler ungated (CLI-only today) | ☐ open |
| CC-9 | catalog / customers context calls a tool handler with userId: null | ☐ open |
| CC-10 | The HTTP RBAC path passes no invoker (the tool door does) | ☐ open |
| CC-11 | enforce is not armed for any tenant — the operator's per-tenant decision | ☐ open |
| CC-12 | The universal Resource envelope is not built (the registry half is done) | ☐ open |
| CC-13 | G-21's schema-mutation IR kind, its UI and its database row are not built | ☐ open |
| CC-14 | The escalation branch in the three parked modules is commented out | ☐ open |
| CC-15 | No live route proves the escalation (202 + a pending_acts row) end-to-end | ☐ open |
| CC-16 | The grant merge into role_acls.features_json is one atomic SQL UPDATE | ✅ closed |
| CC-17 | Both halves closed: the decision carrier (request header) exists and is checked | ✅ closed |
| CC-18 | The batch route names every key it is about to write | ✅ closed |
| CC-19 | dynamicLoader.tsconfig.test.ts fails under the full suite (environmental, not a code defect) | ☐ open |
| CC-20 | A custom field's permission is granted, but nothing reads it | ☐ open |
| CC-21 | The custom-entity install primitive is gated (upsertCustomEntity, fail-closed) | ✅ closed |
| CC-22 | Both HTTP reactivation paths are gated at the route | ✅ closed |
| CC-23 | The create branch of the grant write is atomic too | ✅ closed |
| CC-24 | A custom entity's HTTP reactivation is gated at the route (the CC-22 shape) | ✅ closed |
| CC-25 | The carrier read now checks the actor (decidedBy / grantTo verified) | ✅ closed |
| CC-26 | The create page carries the checkbox field | ✅ closed |
| CC-27 | An AI user can run only the agents bound to it (the core leg) | ✅ closed |
| CC-28 | The batch read-back inside GET is fixed | ✅ closed |
| CC-29 | The deletedAt clause is pinned in both consumers; the globalThis leak became a coverage gate | ✅ closed |
| CC-30 | The custom-entities storage entry corrected (the migration is unapplied on live DBs — noted) | ✅ closed |
| CC-31 | The core set is marked by column, not by name (Option B, owner ruling) | ✅ closed |
| CC-32 | A saved Function has no persistence — so it has no delete path to guard | ☐ open |
| CC-33 | The structural guard sees row writes, not raw DDL | ☐ open |
| CC-34 | The read / reference verbs are grammar postures, not write-path-enforceable | ☐ open |
| CC-35 | A structural re-type labelled 'create' would escape the guard | ☐ open |
| CC-36 | Several foreign guard-input builders omit actorKind | ☐ open |
| CC-37 | The structural settings ship the S11 grammar as a setting | ✅ closed |
| CC-38 | The escalate outcome has no approval-layer wiring — nobody files the pending act | ☐ open |
| CC-39 | The actor check reads live ACL state inside a guard's validate | ☐ open |
| CC-40 | auth:role is a declared kernel entity | ✅ closed |
| CC-41 | update.sh fix shipped; the closing proof is a double-build | ☐ open |
| CC-42 | G-22 Slice 2B — the state-machine engine's first caller (business work) | ☐ open |
| CC-43 | readTenantSurfaces is the live consumer of the persisted surfaces (the read half) | ✅ closed |
| CC-44 | The write-path gate is DEFAULT-DENY at the build | ✅ closed |
| CC-45 | Server-side exports consult the map and MASK marked fields | ✅ closed |
| CC-46 | All 53 searchable entities declare aclFeatures (+ a coverage gate) | ✅ closed |
| CC-47 | The human CRUD GET / list path IS permission-gated (403) | ✅ closed |
| CC-48 | The custom-entity records page's export goes through the server | ✅ closed |
| CC-49 | The customer-tasks export is built by the server | ✅ closed |
| CC-50 | The OWN leg of row 16 (opt-in owner scope) | ✅ closed |
| CC-51 | Row 16 Option B: own + TEAM row scope — deferred by the owner | ☐ open |
| CC-52 | Every table must be searchable / a read surface / allowlisted (233 tables) | ✅ closed |
| CC-53 | The AI read path applies the classification column-mask (+ the presenter / aggregate leak fixes) | ✅ closed |
| CC-54 | The index-time presenter can still promote any string field | ☐ open |
| CC-55 | The narrowing leg: tools INTERSECT, features UNION | ✅ closed |
| CC-56 | The confirm route re-checks the binding before executing | ✅ closed |
| CC-57 | The in-process helper consults the binding + threads its scope (the last named leg) | ✅ closed |
| CC-58 | The Business-IR screen (Stage C / B not started; Stage A in force) | ☐ open |
| CC-59 | The Business-IR chain's first production caller — registered and gated | ✅ closed |
| CC-60 | The tool's in-chat consumer — done by P2-4 (the runner agent's fixed one-tool menu) | ✅ closed |
| CC-61 | The command contract made uniform (all six facets on the action log) | ✅ closed |
| CC-62 | The workspace build set (menu join, thread lifecycle, collaboration, AI-as-participant, extensions) | ☐ open |
| CC-63 | The command contract's facets are declared by 0 of ~93 production commands | ☐ open |
| CC-64 | An undo's trace entry bypasses the hash-chained ledger | ☐ open |
| CC-65 | action_logs has no retention path | ☐ open |
| CC-66 | Row 27's remaining parts (reduced-marker, history read, offer, never-acts-without-asking) | ☐ open |
| CC-67 | Row 28's door: the platform's own runtime sits behind it; both window-walkers closed | ✅ closed |
| CC-68 | The non-deterministic MCP dev-key test fixed (not the product) | ✅ closed |
| CC-69 | The chat route's question short-circuit — RULED: stays a named, pinned, permanent exception | ✅ closed |
| CC-70 | The chat run's capabilityGrantId is carried but not consumed | ☐ open |
| CC-71 | The health endpoint's direct engine reach — RULED: stays a named, pinned, permanent exception | ✅ closed |
| CC-72 | Delete OpenCode from behind the door (R28-6) — the switchover's deletion half — stale-timeout gate **RULED 2026-10-16** (Option 1; record: `DECISION-p2-9b-stale-timeout-trade.md` §6) | ☐ open |
| CC-73 | The ai-assistant type gate says 0 (92 pre-existing test-only errors fixed) | ✅ closed |
| CC-74 | hermes-local retires in P2-9b (the retirement is the switchover's content) | ☐ open |
| CC-76 | The OpenCode adapter now honours the envelope's deadline (fixed in P2-6) | ✅ closed |
| CC-77 | The capability grant resolves to nothing — a label, not an authority | ☐ open |
| CC-78 | The task-shaped starting menu has no machinery behind it | ☐ open |
| CC-79 | The live worker bridge: the worker CAN knock on the door (P2-9a — a live turn called a platform tool) | ✅ closed |
| CC-80 | The ai-assistant suite is hermetic (measured on both sides) | ✅ closed |
| CC-81 | The base tool interfaces are not assignable from a narrowly-typed tool | ☐ open |
| CC-82 | The port carries no settings (model / toolset / prompt are deployment constants on the Hermes path) | ☐ open |
| CC-83 | P2-9b retires the only door that can write into a Hermes session | ☐ open |
| CC-84 | The worker's tool calls carry ONE identity (the superadmin's) — the live Hermes path bypasses per-user, per-tenant authority | ☐ open |
| CC-85 | The worker's MCP key lives only in the process the entrypoint starts — a worker spawned any other way gets a 401 from the MCP server and loses its tools | ☐ open |
| CC-86 | The live Hermes proofs (`P2-1`…`P2-9a`) were taken against the previous pin revision — **both legs now re-proven on the new pin**: the **live turn** (route B, 2026-10-16: `TURN DONE in 2280.4 s`, `usage.prompt = 16572`) and the **stdio handshake gate** — **GATE PASSED in 103.9 s** on `hermes-gateway:p2-9a` / tree `07ee857b…`: `ping`→pong, `gateway.capabilities`→`per_session_exclusive_submit`, `client.capabilities`→16 `server_requests`, the `gateway.ready` event, `process.stop`→answered, and **all 5 stdout frames valid JSON-RPC** | ✅ closed |
| CC-87 | The architecture reader is a generated bundle printing a stale pin — regenerate it from the study sources | ☐ open |
| CC-88 | The first turn of every conversation re-read the whole 16.6k-token instruction sheet after each model restart (~2,280 s — the `CC-86` turn). A warm-up service now replays the exact shared prefix **from the worker's own `state.db`** so the model's RAM cache is already full: verified at **16,559 of 16,560 tokens reused in 1.4 s**, and it engages unattended on a fresh model process | ✅ closed |
| CC-89 | The stack ran on **4 of the host's 8 CPUs** (`.wslconfig`), so the model's `-tb 8` was silently clamped. Raised to 8 — and **a Docker Desktop restart does NOT reboot the WSL VM**, so the file only applies via `docker desktop stop`/`start`. Measured: **+56 % at the 2,048-token point** (7.81 → 12.18 tok/s), but only **+10 % on the whole 16,560-token cold fill** (2,264 s @ 7.32 → **2,051 s @ 8.07 tok/s**) — the prefill rate is length-dependent, so the early-fill sample flatters | ✅ closed |
| CC-90 | The container's pin verifier carried a **stale default digest**. After the 2026-10-16 re-pin, `library/.hermes_pin.py`, `HERMES-PIN.md` and the compose's `HERMES_PIN_DIGEST` default all moved to `db44c462…`/`07ee857b…` — but `docker/hermes/verify_pin.py`'s `DEFAULT_EXPECTED_DIGEST` still named the **previous** revision (`3569e846…`/`ca760e97…`), though its own docstring says to update it "in the same change". Effect: any invocation **without** `HERMES_PIN_DIGEST` — a manual `docker run`, a test, the handshake gate — rejected the **correctly-pinned** tree with `PIN BROKEN` (19,728 files hashing to `07ee857b…`). The live stack was unaffected only because the compose injects the env. **Source corrected; the image must be rebuilt to carry it** — until then, callers pass `--pin-digest 07ee857bdab59a875317035d8aaad4d6` | ☐ open |
| CC-91 | **The tooling set (`SR-38`/`39`/`41`/`46`) — the SRS's "land FIRST; make everything after cheaper" item, and now the frontier.** It is why the switchover is *not* next: the SRS sequences **`SR-12` (per-tenant engine home) ← gates `P2-9b`**, and `SR-12` is the fix for the **open** `CC-84` (a Hermes turn runs platform tools as ONE superadmin identity, outside the chat's tenant) — so flipping the default first would make that hole the **default** path. **First slice DONE 2026-10-16:** the **one-truth check (`SR-39`)** — `scripts/check-one-truth.mjs` + a **mutation-proof** test (`scripts/__tests__/check-one-truth.test.mjs`, 4/4) + the `check:one-truth` script — with the **Hermes pin digest** as its first fact, i.e. the fact that actually drifted (`CC-90`). **Second slice DONE 2026-10-16 (evening):** the **escape-hatch census (`SR-41`)** — `scripts/check-escape-hatches.mjs` + a **5/5** test (the trap: a bare rule list is *not* a reason; the precision case: prose is *not* a hole) + `check:escape-hatches` / `:fail`. **Measured on the real repo: 7,968 files · 202 holes · 33 named · 169 unnamed** — and the finding is **one-sided**: every `@ts-expect-error`/`@ts-ignore` carries a reason (24 of 24) but only **8 of 168** `eslint-disable`s do, so the backlog is a *convention gap* (nobody was told to write a reason after `--`), not a discipline failure. **★ Finding:** the SRS marks all four BORROW, but the repo **already runs the pattern** (`check-version-alignment.sh` = one-truth; `check-agents-md-budget.mjs` + `.baseline.json` = the ratchet, `SR-40`), so the work is *generalise*, not *import*. **Remainder:** `SR-38` (digital-twin harness), `SR-46` (two-reads lint — **★ and its stated home needs a correction:** `packages/eslint-plugin-ds` runs only on **backend-UI files** via `eslint.ds.config.mjs`, so a *settings-read* lint there would never fire on the files that read settings; it belongs in the `scripts/check-*.mjs` family, where the cross-file drift is visible) | ☐ open |
| CC-92 | **The `preview/` folder's 13 documents (45,652 words, written 11–14 Oct by an agent brought in cold) were never triaged** — `08-FORENSIC-AUDIT.md` alone carries 20 numbered sections with **2 CRITICAL authorization defects**. **TRIAGED AND VALIDATED 2026-10-16** in [`PREVIEW-AUDIT-TRIAGE.md`](PREVIEW-AUDIT-TRIAGE.md): **46 findings re-measured against the code at `b183df58`, ZERO false.** **Both CRITICALs CONFIRMED — and BOTH NOW BUILT 2026-10-17** (`fa974bb1`, `60a6714f`) — **T-01** (the delegation route requires `auth.delegations.manage` but **never the capability being granted**; `.delegable` has **0 production readers** repo-wide) and **T-02** (`business_ir.run_query` passes `features: ctx.userFeatures` into the Business-IR chain and **nothing reads it**; `engine.query` runs unguarded). **Also CONFIRMED:** the count-gap-verifies-as-passed (§3), the pending-act double-approve with no CAS (§4), undo bypassing the ledger (§5), nine modules' commands ungated (§6 — **and my OWN first census was the measurement error**: grepping the bare word `capability` matched the prose "adapter capability" in a comment; re-measured with `^\s*capability\s*:` gives **15 core modules with `commands/`, 8 declaring one**), `demoteIfEvidenceDemands` with 4 callers all its own test (§7), the broken DS lint + all six rules at `warn` (11 §1), and **878 physical vs 58 logical direction utilities = 15.1:1** (11 §3). **FOUR claims now FIXED**, recorded so nobody re-fixes them: `ledger:verify` **has** a caller (`audit_logs/cli.ts:91,115`), `OPENAI_BASE_URL` **is** forwarded to `hermes-gateway` (`docker-compose.hermes.yml:107`, P2-7/§2.13), `HERMES-PIN.md` **exists** (29,340 bytes, digest `07ee857b…` = the one `SR-39` verifies), and `run.ts` gate 3 gained `\|\| !fn.businessIr`. **FIVE of the audit's own numbers corrected by name** (`C-01`…`C-05`), the largest being the RTL ratio **70:1 → 15.1:1** (token-level count of string literals, 4,320 files, 472,110 class-like tokens, vs the audit's word-boundary count). **A sixth (`C-06`) corrects my own work**: the folder is 45,652 words, not the 197,912 first carried. **★ THE RANKING'S OWN FINDING — the one substantive addition to the audit's §17 order: rank the declared-control coverage check FIRST, ahead of both CRITICAL patches**, because **six findings in the register are the SAME finding** (`.delegable`, `demoteIfEvidenceDemands`, the C6 command contract, `authorityPolicyProblems`, `findFrontendVocabulary`, `detectRepeatedRequest`: all declared, all with **zero production readers**, all **invisible to the build**) **and the workshop already owns the mechanism** (`SR-39`'s one-truth check + `SR-41`'s escape-hatch census, both committed the day before). **★ THIS ROW CALLED IT `SR-42`, WHICH WAS WRONG — corrected by name as `C-07` (2026-10-17): `SR-42` was already assigned in the SRS to openrig's exclusion ledger with mechanical expiry, so the label pointed at two unrelated requirements. The correct ID is `SR-47`.** **★ AND IT IS BUILT (`52383e09`, 2026-10-17):** `scripts/check-declared-controls.mjs` registers the six and reports **five UNCOVERED and one DEAD-INPUT** — every one with a full test suite and zero production consumers (`capability-delegable` 24 decl/0 prod, `demoteIfEvidenceDemands` 1/0 with 4 test callers, `authorityPolicyProblems` 1/0 with 3, `findFrontendVocabulary` 1/0 with 5, `detectRepeatedRequest` 1/0 with 13, `command-contract-c6` reader wired at `command-bus.ts:452` with 0 producers). **★ A second finding from the build: a census puts the whole class at 3,658 of 14,311 exported symbols (25.6%) with no production consumer — a figure to watch, not a gate to trip, and the reason the registry is curated rather than automatic.** **★ The check was wrong twice while being built, both times a dead control reading as wired** — prose inside `note:` strings read as declarations (a raw grep reports 29 `.delegable` declarations where the true count is 24), and the registry's own regex literal read as a string delimiter so the check reported *itself* as the control's consumer. `strip()` now removes string, comment AND regex-literal contents before matching. **T-03 is closed; T-01 and T-02 are now BUILT (`fa974bb1`, `60a6714f`, 2026-10-17); T-08, T-29 and T-43 remain open and are still the work.** **UNVALIDATED and recorded as such rather than guessed:** the hosted login (06 §3.5, environmental), the green-suite claims (a full run was not in scope), the `@deprecated` pair's 106 call sites (could not locate the audit's cited file), and F10's byte-level locale divergence | ☐ open |
| CC-93 | **`SR-47` — the declared-control coverage check — BUILT 2026-10-17 (`52383e09`).** The item the triage's own ranking put **first, ahead of both CRITICAL patches**, and the reason it went first: six findings were the same finding, and a patch closes an instance while this closes the class. **What shipped:** `scripts/check-declared-controls.mjs` (a registry of six controls), `scripts/__tests__/check-declared-controls.test.mjs` (**10/10**), `scripts/verify-declared-controls-mutations.mjs` (a mutation-proof harness), and `check:declared-controls` / `:fail` in `package.json`. **Measured on the real repo at `b183df58`:** `capability-delegable` **UNCOVERED** (24 declarations, 0 production consumers, 0 test); `trust-demote-if-evidence-demands` **UNCOVERED** (1 decl, 0 prod, **4 test** — a public `TrustService` method whose only callers are its own test); `authority-policy-problems` **UNCOVERED** (1/0/**3**); `business-widget-frontend-vocabulary` **UNCOVERED** (1/0/**5**, and `ir.ts:217`/`:227` are self-calls); `request-repeat-detector` **UNCOVERED** (1/0/**13** — the most-tested dead control in the repo); `command-contract-c6` **DEAD-INPUT** (reader wired at `command-bus.ts:452`, **0 producers**). **★ THE TEST COLUMN IS THE FINDING:** every one of these controls has a full test suite and not one production consumer — **tested and wired are different things, and only the second is protection.** **★ THREE SHAPES, because "nobody calls it" is not the only way a control dies:** `field` (declared, never read), `export` (exported, called only by its own test), and `input` — **new, and the one that most deserves a check** — where the reader is wired and the producer is absent, so the C6 contract returns `null` for every handler while looking completely alive. **★ A SECOND FINDING FROM THE BUILD:** a mechanical census of every exported symbol with no production consumer puts the whole class at **3,658 of 14,311 (25.6%)** — **not** a defect count (most of it is zod schemas and type aliases exported as a module's declared surface), which is why the registry is **curated** and the census is a figure to watch, not a gate to trip. Publishing 3,658 findings would bury the six that are real — the same noise problem `SR-41` avoided. **★ THE CHECK WAS WRONG TWICE WHILE BEING BUILT, both times in the dangerous direction** (a dead control reading as *wired*): (1) string literals were not stripped, so `auth/acl.ts:112`'s sentence **"Emphatically not itself delegable:"** read as a declaration site — a raw grep reports 29 `.delegable` declarations where the true count is **24**, five of them prose inside `note:` strings; (2) regex literals were not stripped, so the registry's own `consumer: /\.delegable\b|\[['"]delegable['"]\]/` — a quote inside a character class — read as a string delimiter, the `\.delegable` before it survived, and **the check reported itself as the control's consumer**. `strip()` now removes string, comment **and** regex-literal contents before any pattern is applied, keeping length and newlines so line numbers stay true. **★ SIX MUTATIONS PROVE THE SUITE HAS TEETH** — regex, string and comment stripping disabled; same-file consumers always counted; a declaration counting as its own consumer; test files never walked. Each must fail the suite **in the right case**; a mutation caught in the wrong case is reported NOT PROVEN, not as a pass. All six proven, and the harness restores the checker byte-identical or refuses to report success. **★ Default mode reports and exits 0**, because all six controls are currently uncovered and a check that is red from its first commit gets switched off — the exact failure this script exists to catch. `--fail` is the enforcement mode, for when the backlog is cleared. Same report-now / enforce-later split as `SR-41`. **The 7 failures in the wider scripts suite are pre-existing and environmental** (`dev-memory-sampler` reads `/proc`; `dev-splash` and `watch-packages` have their own) — proven by stashing this commit's only tracked change and re-running the same files: they fail identically at HEAD. **Remainder — the six findings themselves are still open:** T-01, T-02, T-08, T-29, T-43. The check reports them; it does not fix them (T-01 has since been built — see CC-94) | ✅ closed |
| CC-94 | **`T-01` — the delegation route lent authority the lender did not have — BUILT 2026-10-17 (`fa974bb1`).** The route's guard is `{requireAuth, requireFeatures:[auth.delegations.manage]}` and the grantor principal was derived from the caller and never checked against the capability: a user holding only `auth.delegations.manage` could lend `api_keys.manage` (minting identities) or `directory.tenants.manage` to anybody, or to themselves, while `.delegable: false` had zero production readers. **Three checks now run in the route before `delegations.grant` — and ONE MORE than the triage's fix sentence named:** (1) the **grantor-holds** check, added first, which extends the route's own header principle ("nobody may lend authority they do not hold") from the grantor id to the caller's own holdings; (2) a capability declared `delegable: false` may never appear in a delegation; (3) a self-delegation needs an explicit authority ceiling, because a delegation is an independent authority source at use time, so a self-delegation with a null ceiling outlives the holdings that justified it. **Proof:** 9 tests in `packages/core/src/modules/auth/api/__tests__/delegations.route.test.ts` driving the real route handler with service doubles; 3 mutations run for real, each killing exactly its own test; **the decisive assertion in every refusal case is that THE WRITE NEVER HAPPENED** — `delegations.grant` was never called, not merely a 403 returned after it. Verified: 216 tests across all 18 auth API suites, `tsc --noEmit --incremental false` clean, eslint clean | ✅ closed |
| CC-95 | **`T-02` — `business_ir.run_query` checked scope but not authorization — BUILT 2026-10-17 (`60a6714f`).** `features: ctx.userFeatures` rode the `authContext` into the Business-IR chain and was read by nothing: the compile step used the scope, the authoring step used the agent binding, and `engine.query` ran with no per-entity check at all — so the tool (whose `requiredFeatures` is `ai_assistant.view`, a view feature with no capability descriptor, so the capability path permits on absence) could read any entity the caller's tenant held. The only guard on which rows came back was the prompt itself. **One gate before the engine read:** `authorizeEntityRead` in `packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-run.ts`, copied from `authorizeEntityAccess` (`packages/search/src/modules/search/ai-tools.ts:86`, all 53 entities' `aclFeatures` behind it) because the two packages must not depend on each other. Fail-closed the way the donor is: no config → refusal, no `aclFeatures` → refusal, no container → refusal; superadmin bypasses (the donor's rule, preserved deliberately and pinned by a test). **Proof:** 8 tests in `business-ir-run.authorization.test.ts`; 7 mutations run for real, each killing exactly its named test; **the decisive assertion in every refusal case is that THE READ NEVER HAPPENED** — `engine.query` was never called, not a refusal after the rows came back. The existing run suite's fixtures were **completed, not weakened** (they passed no container, so the fail-closed gate would have refused every happy path). Verified: 43 tests across 5 business-ir suites, `tsc --noEmit --incremental false` clean, eslint clean | ✅ closed |
| CC-96 | **`T-32` — a v7 record id no longer hides a record's lock — BUILT 2026-10-17 (`13c6206f`).** The hole (audit A1-09, `08-FORENSIC-AUDIT.md` §13/§14): `readRecordId` at `packages/core/src/modules/auth/commands/interceptors.ts:89` accepted only RFC-4122 v1–v5 ids — version nibble pinned to `[1-5]`, variant nibble to `[89ab]` — so a valid v7 id failed the pattern, reached the resolver as `recordId: null`, and `resourceCeilingFor` (`authorityEnforcementService.ts:335`) returns early on `!recordId`: the lock was never looked up — no ceiling, no project context, no grade. The command gate is the **only production caller that threads a recordId** (`refusalFor` at `rbacService.ts:595` calls `decideFor` with no options; the AI tool path threads only `onBehalfOfUserId`), so this one pattern was the single point where record locks reach the resolver. **Fix:** shape only, no version or variant constraint — `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. The triage recorded `[1-5]` → `[0-9a-f]`; re-measured per rule 13, the variant nibble is the same class of over-strictness (a valid UUID with a non-RFC variant bypasses the lookup identically), so the fix takes the shape to its logical end. In-repo precedent: `sync-run-service.ts:7` and `grantChecks.ts:46` use exactly this shape, and `crud/ids.ts:5` shows the house relaxing in the same direction with `[1-8]`. Version and variant are properties of the **generator**, not the record: ids are v4 today (`gen_random_uuid()`) but the `uuid` column accepts any version, and imports/sync/future migrations can carry v7. **Proof:** 7 tests in `packages/core/src/modules/auth/commands/__tests__/authority-command-gate.record-id.test.ts`, driving the real gate and the real `AuthorityEnforcementService` with a stub lock reader; 4 mutations run for real, the file restored byte-clean between runs, each killing exactly its named tests: M1 (restore the pre-fix pattern) kills both hole tests + uppercase + locked; M2 (accept any string) kills the slug/numeric guard; M3 (drop `/i`) kills uppercase; M4 (remove the threading) kills all 5 threading tests. The decisive assertion is that **the lookup happened at all** — `stateFor` called with the record's real id; a restricted record named by a v7 id is then **held** at A2. Verified: 19 tests across the two gate suites, 809 tests / 90 suites across `src/modules/auth`, `tsc --noEmit --incremental false` clean, eslint clean; both files pure LF, no BOM | ✅ closed |
| CC-97 | **`T-45` — a locked record's refusal has no production consumer on the command path — FOUND while building T-32, documented not fixed.** The record-lock rules themselves are right (`record-locks.ts`: `locked` → A0, `restricted` → A2, `open` → null, reads E0 exempt, unreadable → `locked`, fail-closed): the audit's §14 note said only the *lookup* fails open, and T-32 fixed the lookup. But the command gate does not hold A0 by design ("RbacService has already made it at the route guard") — true for capability refusals, false for record-lock ones, since `refusalFor` (`rbacService.ts:595`) calls `decideFor(subject, feature, scope)` with no options, so a record-lock ceiling can never surface there either. Net effect: a locked record is writable by any actor holding the capability. Ranked high, urgency scheduled (the owner decides where the refusal belongs — a gate hold, or the route guard threading the recordId), action DOCUMENT. Pinned rather than left latent: the T-32 suite carries the test "still passes a locked record: the gate does not hold A0, by design". **BUILT 2026-10-17 (Option A, the owner's ruling):** the gate now refuses `A0` with a new `AuthorityRefusedError` (403 — "you may not", distinct from the held case's 202); the pinning test was flipped from "still passes a locked record" to "refuses a locked record". 21 tests across the two gate suites; 3 mutations run for real, each killing exactly its named tests (remove the branch / mislabel `REFUSAL_GATE` → the 4 refusal tests; wrong status → the status assertion), file restored byte-identical (`f3c1017b…`); 71 tests across all 13 auth command suites; `tsc` + eslint clean | ✅ closed |
| CC-98 | **`T-13` + `T-14` — the two live compose defects — BUILT 2026-10-17.** `T-13`: `--jinja` was absent from every compose file, so llama.cpp never applied the model's own chat template and tool calling was silently degraded — added to the `model` service command in `docker-compose.fullapp.yml` (the only file that runs `ghcr.io/ggml-org/llama.cpp:server`). `T-14`: the `mcp` service carried `OPENAI_API_KEY` but no `OPENAI_BASE_URL`, so its embedding lane silently called `api.openai.com` — the same defect `docker-compose.hermes.yml:107` already fixed for the Hermes gateway; `OPENAI_BASE_URL` forwarded to the `mcp` service in both `docker-compose.fullapp.yml` and `docker-compose.fullapp.dev.yml`. **Verified live, not just parsed:** `docker compose config` parses and resolves both files; the `model` and `mcp` containers were recreated and read back — `docker inspect` shows `--jinja` in the model's args and `OPENAI_BASE_URL=http://model:8080/v1` in the mcp env; both healthy | ✅ closed |

---

## 6. Platform study — 11 platforms

Nine closed; two pending your ask. They join as new `SR-*` columns, **no rework**.

- ✅ **Closed:** Hermes · Paperclip · CrewAI · Multica · Gas Town · n8n · buzz · openrig · zulip
- ⬜ **Pending your ask:** **mattermost** (226 MB zip on disk) · **activepieces** (added 2026-10-16 —
  `activepieces-main.zip` on disk, repo `activepieces/activepieces`)

---

## 7. The architecture requirements (SR) — every one, with its address

The mapping output — **53 requirements** across the poles — is in
`library/architecture/mapping/findings/08-THE-SRS.md`, with the filterable register in
`library/architecture/mapping/workshop-status.html`. **Every one of them has an address here** — the
table below, read straight from that register (its wording, not a rewrite). **Status meanings:**
**HAVE** = exists and is named · **BUILD** = planned, a register item builds it · **BORROW** = the
mechanism comes from a platform study · **RE-ENGINEER** = the target exceeds what mercato does today.
**3 HAVE · 10 BUILD · 38 BORROW · 2 RE-ENGINEER = 53.** The sequencing rule from the SRS: the tooling
set (`SR-38`/`39`/`41`/`46`) lands **first** — no blockers — and `SR-08` has no prerequisite at all.

| Item | Pole | What it is | From | State | Extends / gate |
|---|---|---|---|---|---|
| SR-01 | P1 | Typed engine port; nothing above it imports Hermes | Hermes | ✅ HAVE | `P2-1…P2-9a` (built) |
| SR-02 | P1 | An agent is not its runtime; uniqueness key as a DB constraint | Multica | ☐ BORROW | — |
| SR-03 | P1 | Permission policy ladder as data | openrig | ☐ BORROW | — |
| SR-04 | P1 | Two-surface rule: policy set by code, never config | openrig | ☐ BORROW | — |
| SR-05 | P1 | Sub-agent spawn cap (measured) + spawn ledger | n8n, Hermes | ☐ BUILD | corrected in the SRS (rule 13) |
| SR-06 | P1 | Skills as versioned `SKILL.md` artifacts | n8n, Hermes | ☐ BORROW | — |
| SR-07 | P1 | A bot is a participant, not a parallel object | zulip | ☐ BORROW | — |
| SR-08 | P1 | The triage core gets a production caller | mercato | ☐ BUILD | `G-21`, `CC-59`, `CC-60` — no prerequisite |
| SR-09 | P1 | Typed tool filter with `run_context`; typed tool failures | CrewAI | ☐ BORROW | A2UI moved to `SR-32a` |
| SR-10 | P2 | Ambient tenancy: tenant derived from the request | zulip | ☐ RE-ENGINEER | — |
| SR-11 | P2 | Scope enters once — collapse the double entry | mercato, zulip | ☐ BUILD | `CC-84` |
| SR-12 | P2 | One tenant ↔ one engine home; per-run credential | Multica | ☐ BUILD | `CC-84` — gates `P2-9b` |
| SR-13 | P2 | Identity keys unique per realm, DB-enforced | zulip | ☐ BORROW | — |
| SR-14 | P2 | Scope registry with a build-time ratchet | n8n | ☐ BORROW | — |
| SR-15 | P2 | Audit log with topology-encoded event numbering | zulip | ☐ BORROW | — |
| SR-16 | P2 | Personal / team workspace kinds | n8n | ☐ BORROW | — |
| SR-17 | P2 | Tenancy contract + prose + conformance harness + `LIMITS.md` | buzz | ☐ BORROW | — |
| SR-18 | P2 | Machine actors capped at approve-first, test-pinned | mercato | ✅ HAVE | authority layer (test-pinned) |
| SR-19 | P3 | Durable wake queue: at-least-once, retries in payload, late cutoff | zulip | ☐ BUILD | — |
| SR-19a | P3 | Budget per event, not just per queue — a single event gets bounded time | zulip | ☐ BORROW | `MAX_CONSUME_SECONDS = 30` (SIGALRM) |
| SR-19b | P3 | The row carries the obligation exactly-once; the wake is at-least-once | openrig | ☐ BORROW | baton + wake committed in one transaction |
| SR-20 | P3 | One-statement claim with health gate inside | Multica | ☐ BORROW | — |
| SR-21 | P3 | Closed failure taxonomy per attempt | Multica | ☐ BORROW | — |
| SR-21a | P3 | Recovery is a named set of sweepers, one per way a task can die — not a generic retry | Multica | ☐ BORROW | F04-03 |
| SR-22 | P3 | Every command declares risk + approval + expiry | mercato, buzz | ☐ BUILD | `CC-63` |
| SR-22a | P3 | A slower poller only hides the bug — a reconciler that honours human cancellation beats it | Paperclip | ☐ BORROW | the DOT-2 lesson |
| SR-23 | P3 | Transport does not decide | Gas Town | ☐ BORROW | "Zero Framework Cognition" |
| SR-24 | P3 | Durable hooks for side effects | Gas Town | ☐ BORROW | F03-03 — cited from the P2 file |
| SR-25 | P3 | Event-kind registry; kinds over endpoints | buzz | ☐ BORROW | — |
| SR-26 | P3 | Every approval gate ships a test that fires it | buzz | ☐ BUILD | — |
| SR-27 | PX-W | Widget = append-only log; state by replay | zulip | ☐ RE-ENGINEER | — |
| SR-28 | PX-W | Discriminated-union contract over widget kinds | zulip | ☐ BUILD | — |
| SR-29 | PX-W | One generic renderer: `WidgetIR` → DOM | zulip, mercato | ☐ BUILD | — |
| SR-30 | PX-W | Generic bridge: any backend drives any widget | zulip | ☐ BORROW | — |
| SR-31 | PX-W | Widget-kind registry; kinds register themselves | zulip | ☐ BORROW | — |
| SR-32 | PX-W | Composition canvas with CRDT collaboration | n8n | ☐ BORROW | — |
| SR-32a | PX-W | Widget **protocol**, not widget model — a declarative UI vocabulary a client renders | CrewAI | ☐ BORROW | new row; the A2UI find |
| SR-33 | PX-F | Design system + own ESLint plugin guarding composition | n8n | ☐ BORROW | — |
| SR-33a | PX-F | Deliberate non-features recorded: no plugin model, no dynamic loading, no schema versioning | zulip | ☐ BORROW | — |
| SR-34 | PX-F | Prohibition-constrained 3-package layering | Multica | ☐ BORROW | — |
| SR-35 | PX-W | UMES injection as the widget entry point | mercato | ✅ HAVE | kit |
| SR-35a | PX-F | Frontend as information architecture: a fetcher interface beats a widget tree | Gas Town | ☐ BORROW | the `ConvoyFetcher` find |
| SR-36 | PX-F | Dashboard + perspective screens | mercato | ☐ BUILD | `M5` |
| SR-37 | out | Plugin/module registry with full lifecycle | Hermes, Multica | ☐ BORROW | corrected in the SRS (rule 13) |
| SR-38 | out | Digital-twin harness; drift breaks the build | openrig | ☐ BORROW | **the next task — prerequisites measured in code** |
| SR-39 | **PZ** | One-truth check across every representation | zulip | ☐ BORROW | — |
| SR-40 | **PZ** | Feature-level ratchet only a human can raise | zulip | ☐ BORROW | trigger corrected in the SRS |
| SR-41 | **PZ** | Named, greppable escape hatches | zulip | ☐ BORROW | — |
| SR-42 | **PZ** | Exclusion ledger with mechanical expiry; ships empty | openrig | ☐ BORROW | — |
| SR-43 | **PZ** | Proof beside prose: contract + falsifiable check + `LIMITS.md` | buzz | ☐ BORROW | — |
| SR-44 | **PZ** | Retirement ledger; renames are tracked hazards | buzz, openrig | ☐ BORROW | — |
| SR-45 | out | Kinds-over-endpoints policy with conformance test | buzz | ☐ BORROW | — |
| SR-46 | out | Two-reads lint: any setting read twice must be read once | openrig | ☐ BORROW | — |
| SR-47 | **PZ** | Declared-control coverage: a control nobody reads is reported, not shipped | mercato (the `preview/` audit's §18 class — `.delegable`, `demoteIfEvidenceDemands`, the C6 contract, `authorityPolicyProblems`, `findFrontendVocabulary`, `detectRepeatedRequest`) | ✅ BUILD — **`52383e09`, 2026-10-17** | `CC-93` |

---

## 8. How this file relates to the other registers (no conflicts)

| Document | Role |
|---|---|
| **`platform_points.md`** | THE ONE NUMBER + THE LIST + ⏳ OPEN WORK — the detailed source of truth for status |
| **`BACKLOG.md`** | the roadmap — order is mine to set |
| **`BUILD-ORDER.md`** | the shape of the work — what comes before what |
| **`NEEDS-YOU.md`** | the owner-decision list |
| **`../architecture/mapping/`** | the platform research + the `SR-*` architecture requirements |
| **This file + `MASTER-CHECKLIST.html`** | the one plain-English index over all of it |

---

## 9. Keeping it current

When a status changes: update it here **and** in `platform_points.md` (the number is derived from the
boxes, never typed), then re-open the HTML — its data block mirrors this list and is marked with the
date it was last synced. If this index and a register disagree, **the register wins and this file is
the defect** — fix it here.

**Last synced:** 2026-10-16 (audit — the register section added: all 83 `CC-*` items carry an address;
the SR register added: all 53 architecture requirements carry an address (3 HAVE · 10 BUILD ·
38 BORROW · 2 RE-ENGINEER), read straight from `08-THE-SRS.md`; `CC-60` closed by `P2-4` and
`CC-67` closed, both verified in code and in the callbacks register; `CC-72` is the open row-28
item (its stale-timeout gate **RULED 2026-10-16** — Option 1: keep the 2400 s ceiling, `P2-9b` =
measure-and-configure; the ruling is recorded in the decision doc §6, `platform_points.md` row 28
and the phase-2 plan §2.15); the frontier boxes aligned across BACKLOG / platform_points / JOURNAL). **Re-synced later the same
day:** `CC-88` and `CC-89` added — the prompt-cache warm-up, and the CPU-ceiling finding (including
that **a Docker Desktop restart does not reboot the WSL VM**, so `.wslconfig` only applies via
`docker desktop stop`/`start`).

**Re-synced again 2026-10-16 (evening).** `CC-86` **closed** — the stdio handshake gate passed on the
re-pinned worker (`GATE PASSED in 103.9 s`), so both of its legs are now re-proven. `CC-90` **added** —
`docker/hermes/verify_pin.py` carried a stale `DEFAULT_EXPECTED_DIGEST` naming the *previous* revision,
so any caller not given `HERMES_PIN_DIGEST` read a correctly-pinned tree as `PIN BROKEN`; the source is
corrected but the image needs a rebuild to carry it. `CC-89`'s measured claim was refined to give the
**whole-fill** figure (+10 %) beside the segment figure (+56 %). The register is now **48 closed · 41
open · 89 total**. The HTML twin was re-synced the same evening and carries `CC-85`…`CC-90`.

**Re-synced again 2026-10-16 (evening, third pass).** `CC-91`'s **second slice** landed — the
**escape-hatch census (`SR-41`)**, `scripts/check-escape-hatches.mjs` + a 5/5 test +
`check:escape-hatches`/`:fail`, **measured on the real repo at 7,968 files · 202 holes · 33 named · 169
unnamed**, and **one-sided** (every `@ts-expect-error`/`@ts-ignore` carries a reason — 24 of 24 — while
only **8 of 168** `eslint-disable`s do). A **correction** is recorded in the `CC-91` row: `SR-46`'s
stated home does not work, because `packages/eslint-plugin-ds` runs only on **backend-UI files**, so a
*settings-read* lint there would never fire on the files that read settings. **The register now reads
48 closed · 42 open · 90 total** — the previous note's 41 / 89 was the state *before* `CC-91` was added,
so it is corrected here by name rather than left to look like a second count. The HTML twin was
re-synced in the same pass. **Re-synced again 2026-10-17 (sixth pass):** `CC-94` (T-01) and `CC-95` (T-02)
added, **both closed** — the register now reads **51 closed · 43 open · 94 total**; the frontier in §2 was
rewritten so the two CRITICALs are **LAST DONE** and `SR-47` moved to "AND EARLIER THE SAME DAY". The HTML
twin was re-synced in the same pass.

**The frontier was rewritten the same evening.** The HTML's top section (and this file's §2) now carries
**LAST DONE** with the `CC-*` addresses — `CC-88` (the cold fill, caught live), **`CC-86` closed** (the
handshake gate, `GATE PASSED in 103.9 s`), `CC-89` (refined to the whole-fill figure), `CC-90` (added,
open) and `CC-91` (the tooling set, **two slices built and tested**) — and **▶ NEXT**: the rest of the
tooling set (`SR-38` + the re-homed `SR-46`), then the critical path — identity (`SR-02`/`SR-07`) →
**`SR-12` (per-tenant engine home)** → `P2-9b` step (1). **`SR-12` is why the switchover is not next**:
it is the fix for the open `CC-84`, so a default-flip before it would make that hole the *default* path.
The turn-shaped reuse measurement that unblocks the flip is
`DECISION-p2-9b-stale-timeout-trade.md` **§4.6** (99.92 % of the turn prompt reused — 14 tokens left to
prefill). *This is the standing format from 2026-10-16: every pass states what was done, its address in
this register, and what is next — and the HTML's top section is updated to match.*

**Re-synced again 2026-10-16 (late, fourth pass) — the `preview/` triage, `CC-92`.** The 13 documents in
`preview/`, written 11–14 Oct by an agent brought in cold and **never triaged**, are now triaged and
validated in [`PREVIEW-AUDIT-TRIAGE.md`](PREVIEW-AUDIT-TRIAGE.md): **46 findings re-measured against the
code at `b183df58` — zero false.** Both of `08-FORENSIC-AUDIT.md`'s CRITICAL authorization defects are
**confirmed and still open** (T-01 the delegation route lending authority the lender does not have; T-02
the business-query tool checking scope but not authorization). **The register now reads 48 closed ·
43 open · 91 total.** The frontier in §2 was rewritten so the triage is **LAST DONE** and the warm-up /
handshake-gate work moved under **§2.1 "And earlier the same day"** — **this pass also fixes a dangling
sentence** in the HTML frontier card ("…a full run was not in scope) are" ended mid-clause) and
**corrects the preview folder's size by name**: it is **45,652 words** (`wc -w`, 287,331 bytes), not the
197,912 first carried — recorded as `C-06` in the triage document, since rule 13 applies to my own
headline numbers as much as to the audit's. **★ And the ranking's own finding:** a declared-control
coverage check — **which this pass's author then mislabelled `SR-42`** — is ranked **FIRST**, ahead of both
CRITICAL patches, because six findings in the triage register are the same finding (a control declared,
never consumed, invisible to the build) and the workshop already owns the mechanism (`SR-39` + `SR-41`,
both committed the day before).

**Re-synced 2026-10-17 (fifth pass) — `SR-47` BUILT, and the `SR-42` label corrected by name.** The item
the triage ranked first is built: `scripts/check-declared-controls.mjs` + a **10/10** test +
`scripts/verify-declared-controls-mutations.mjs` (a mutation-proof harness) + `check:declared-controls` /
`:fail`, committed in the code repo as **`52383e09`**. **Six controls registered; five read UNCOVERED and
one reads DEAD-INPUT** — every one with a full test suite and not one production consumer. **`CC-93` is
added and closed; the register now reads 49 closed · 43 open · 92 total.** **`SR-47` is added to the SR
register**, so the SRS stands at **54 rows** (53 + this one).

**★ AND A CORRECTION ON MY OWN WORK, recorded as `C-07` in the triage:** that pass's §4 ranking named the
check **`SR-42`** — which was **already assigned** in the SRS to *openrig's exclusion ledger with
mechanical expiry*. One ID, two unrelated requirements, and the second would have been silently
overwritten the moment anyone built the first. **Corrected to `SR-47`** (the next free number) across all
four documents; the two legitimate `SR-42` rows are untouched. **A document that exists to enforce "one
name, one thing" cannot afford to break that rule itself — and this is the second time rule 13 has had to
be applied to my own frontier card, after `C-06`.**

**★ A SECOND CORRECTION ON THIS SAME LINE (2026-10-17):** the "ALSO NOW" bullet in §2 read *"53
requirements, `SR-01`…`SR-53`"*. The **count** of 53 was right; the **range** was not — there is no `SR-53`,
and the highest base number is `SR-46`, with 7 lettered variants (`SR-19a`, `SR-19b`, `SR-21a`, `SR-22a`,
`SR-32a`, `SR-33a`, `SR-35a`). Corrected in place. **Rule 13 applies to a frontier card's own notation as
much as to an audit's number.**

**★ What the build found beyond the plan:** (1) a **third shape of dead control** — `input`, where the
reader *is* wired and the producer is absent, so the C6 contract returns `null` for every handler while
looking completely alive; (2) a **census that puts the whole class at 3,658 of 14,311 exported symbols
(25.6%)** with no production consumer — deliberately **not** treated as a defect count, because most of it
is zod schemas and type aliases exported as a module's declared surface, and publishing 3,658 findings
would bury the six that are real. **The registry is curated; the census is a figure to watch, not a gate
to trip.** (3) The check was **wrong twice while being built, both times in the dangerous direction** — a
dead control reading as *wired* — which is why `strip()` removes string, comment **and** regex-literal
contents before any pattern is applied. **Six mutations prove the suite has teeth**, each required to fail
the suite *in the right case*.

**What is next, unchanged in substance:** the two CRITICALs (**T-01, T-02**) — both one function to close,
both with the code to copy already in the repo (`getCapabilityDescriptor` for T-01, `authorizeEntityAccess`
at `search/ai-tools.ts:86` for T-02) — then **T-32** (the one-character `UUID_PATTERN` fix), then **T-13 /
T-14** (two compose-file lines). **`SR-47` does not delay any of these**: it is the item that makes them
arrive as a build failure instead of a discovery, and it now runs `check:declared-controls` on demand. The
**six findings themselves remain open** — the check reports them, it does not fix them.

**Re-synced 2026-10-17 (sixth pass) — the two CRITICALs BUILT: `CC-94` (T-01) and `CC-95` (T-02).** T-01
(`fa974bb1`): the delegation route now runs **three checks** before `delegations.grant` — the grantor
*holds* the capability, a `delegable: false` capability may never appear in a delegation, and a
self-delegation needs an explicit authority ceiling — **one more than the triage's fix sentence named**,
the grantor-holds check being the route's own header principle applied to the caller's own holdings. T-02
(`60a6714f`): `business_ir.run_query` now runs **one per-entity gate** before `engine.query`, copied from
the search module's `authorizeEntityAccess` (`search/ai-tools.ts:86`, 53 entities' `aclFeatures` behind it)
because the two packages must not depend on each other. Both were proven the standing way: **the decisive
assertion is that the write / read never happened** — `delegations.grant` / `engine.query` was never
called, not a refusal returned after it — and mutations were run for real: **3 for T-01, 7 for T-02, each
killing exactly its named test**. **The register now reads 51 closed · 43 open · 94 total**, both new rows
closed. The frontier in §2 was rewritten so the two CRITICALs are **LAST DONE** and `SR-47` moved to "AND
EARLIER THE SAME DAY"; **▶ NEXT** is **T-32**, then **T-13/T-14**, then the tooling set's remainder. The
triage document was updated in the same pass: the T-01/T-02 action cells, the §2.1/§2.2 built notes (with
T-01's extension beyond the fix sentence recorded), the §0 verdict paragraph and the §4 order table.

**Re-synced 2026-10-17 (seventh pass) — `T-32` BUILT (`CC-96`), and the gap it exposed recorded (`CC-97`).**
The one-character `UUID_PATTERN` fix the triage ranked urgent: `readRecordId`
(`interceptors.ts:89`) accepted only RFC-4122 v1–v5 ids, so a valid v7 id failed the match, reached the
resolver as `recordId: null`, and `resourceCeilingFor` early-returned on `!recordId` — **the lock was never
looked up**. The fix goes one step beyond the recorded one, by name (rule 13): the variant nibble `[89ab]`
is the same class of over-strictness as `[1-5]`, so the pattern is now **shape only**, the exact shape
`sync-run-service.ts:7` and `grantChecks.ts:46` already use. **Proof:** 7 tests driving the real gate and
the real service with a stub lock reader — **the decisive assertion is that the lookup happened at all**,
after which a restricted record named by a v7 id is **held** at A2 — and 4 mutations run for real, each
killing exactly its named tests. **★ The build exposed one new finding, `T-45` / `CC-97`, documented not
fixed:** a *locked* record still passes the gate, because the gate does not hold A0 by design and
`refusalFor` threads no recordId, so a record-lock ceiling has no production consumer on the command path.
Ranked high, urgency scheduled, action DOCUMENT — the owner decides where the refusal belongs — and pinned
by a test so the gap is visible rather than latent. **The register now reads 52 closed · 44 open · 96
total**, `CC-96` closed and `CC-97` open. The frontier in §2 was rewritten so **T-32 is LAST DONE**, the two
CRITICALs demoted to "AND EARLIER THE SAME DAY (afternoon)" with their full record in `CC-94`/`CC-95`, and
**▶ NEXT** is **T-13/T-14** (the two live compose defects), then the tooling set's remainder. The triage
document was updated in the same pass: the T-32 action cell, the new T-45 register row, the new §2.4
section (the hole, the named deviation, the proof, and the gap), the §0 verdict and the §4 order table.

**Re-synced 2026-10-17 (eighth pass) — the two compose defects BUILT (`CC-98`), and `T-45` CLOSED
(`CC-97`) on the owner's ruling (Option A).** `T-13`: `--jinja` added to the llama.cpp `model` service
command in `docker-compose.fullapp.yml` (the only file that runs it) — without it llama.cpp never applied
the model's own chat template, so tool calling was silently degraded. `T-14`: `OPENAI_BASE_URL` forwarded
to the `mcp` service in `docker-compose.fullapp.yml` and `docker-compose.fullapp.dev.yml`, mirroring
`docker-compose.hermes.yml:107` — without it the embedding lane silently called `api.openai.com`. **Both
verified live, not just parsed:** the `model` and `mcp` containers were recreated and read back
(`docker inspect` shows `--jinja` in the model's args and `OPENAI_BASE_URL=http://model:8080/v1` in the
mcp env); both healthy. **`T-45`** — the owner chose Option A over threading the recordId into the route
guard: the gate now **refuses `A0`** via a new `AuthorityRefusedError` (403 — "you may not", distinct from
the held case's 202), instead of passing it through; the gate's own docblock claim ("`A0` is left to the
route guard") was corrected by name (rule 13). **Proof:** 21 tests across the two gate suites — the T-32
pin "still passes a locked record" flipped to "refuses a locked record" — and 3 mutations run for real,
each killing exactly its named tests (remove the branch / mislabel `REFUSAL_GATE` → the 4 refusal tests;
wrong status → the status assertion), the file restored byte-identical (`f3c1017b…`); 71 tests across all
13 auth command suites; `tsc` + eslint clean. **The register now reads 54 closed · 43 open · 97 total**,
`CC-97` closed and `CC-98` added-and-closed. The frontier in §2 was rewritten so the compose defects and
`T-45` are **LAST DONE**, `T-32` demoted to "AND EARLIER", and **▶ NEXT** is the tooling set's remainder
(`SR-38` + `SR-46`) — with the `.toolchain/node24` gap named as the thing to clear first. The triage
document was updated in the same pass: the T-13/T-14/T-45 action cells and the built notes.
