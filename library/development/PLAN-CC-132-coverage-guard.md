# PLAN-CC-132 — the coverage guard measures the enabled surface

**Status:** **BUILT and CLOSED 2026-10-19.** Written as a requirement and built to it the same day.
§3 is the requirement, §5 is the proof, **§8 is what was built and §9 is the build record** — including
the five corrections, three of them to this document (Rule 13). The register row is closed.
**Row:** `CC-132` in `library/development/MASTER-CHECKLIST.md` §5.
**Found while** writing `CC-123`'s requirement (`PLAN-CC-123-authority-intersection.md` §1.4), and
recorded separately rather than folded in, because it is a **checker defect** with its own fix.
**Reproduction:** `scripts/measure-cc132-surface.mjs` (read-only; prints the census in §1).

---

## 1. The defect, measured

The row says the guard *"measures one package and reports 100%"*. That is true, and re-measuring found
**two more defects in the same twelve lines of the guard** — one in how it counts, one in what it
believes the enabled set is. All three are in `packages/core/src/__tests__/capability-coverage.test.ts`.

### 1.1 The numerator reads one directory

`modulesRoot` is `join(__dirname, '..', 'modules')` — `packages/core/src/modules` (`:30`) — and every
file read in the guard goes through it: `allModuleIds()` enumerates it (`:97`), `readFeatureIds` joins
it (`:75`), and the final `describe` block `require`s from it (`:262`, `:274`, `:293`).

So a module shipped by any other package is **not seen at all** — not as described, not as
undescribed. It is absent from both halves of the fraction, which is why the fraction reads 100%.

### 1.2 The denominator is parsed from a file that holds more than one list

`readEnabledModuleIds()` (`:40-50`) scans **every line** of `apps/mercato/src/modules.ts` for
`id: '<name>'`. That file does not contain one list:

| What the file holds | Is it enabled? | Does the scan count it? |
|---|---|---|
| `export const enabledModules: ModuleEntry[]` | yes | yes |
| the reference modules below it — `example`, off by design (*"what it must not do is appear in a customer's product"*) | **no** | **yes** |

Measured: the scan reports **36** enabled ids; the array itself holds **35** entries. The extra one is
`example`, which the file says is deliberately off. **The denominator is wrong in the opposite
direction from the numerator** — it counts a module that is off while missing modules that are on.

### 1.3 The enabled set is not static, so no text scan can be complete

Three more entries are added at run time, and a text scan of the array literal cannot see any of them:

| Where it is added | When | Module | Features |
|---|---|---|---|
| `enabledModules.push(...)` under `parseBooleanWithDefault(process.env.OM_ENABLE_EXAMPLES, false)` | `OM_ENABLE_EXAMPLES=true` | `example` (8), and then `example_customers_sync` (2) | 10 |
| `enabledModules.push(...)` under `parseBooleanWithDefault(process.env.OM_ENABLE_STORAGE_S3, false)` | `OM_ENABLE_STORAGE_S3=true` | `storage_s3` | 1 |
| `for (const entry of officialModuleEntries) … push(entry)` | whenever `official-modules.generated.ts` is non-empty — it is **empty today** and will not stay empty | unknown | unknown |

**This is the finding that decides the shape of the fix.** A guard that parses the array and stops
there is correct today and silently wrong the first time somebody sets a documented flag — which is
exactly the failure this row exists to correct, one level up.

### 1.4 What the blindness costs

`decideFor` returns `null` when no module describes a capability (`authorityEnforcementService.ts:266`),
and both doors read `null` as *"a coverage gap, not a refusal"* and continue (`:237-240`,
`tool-authority.ts:194-195`). Measured against the five features the tools actually require:

| Feature | State | Consequence at the tool door |
|---|---|---|
| `attachments.view` | described | gate applies |
| `attachments.manage` | described | gate applies |
| `ai_assistant.view` | **undescribed** | **blind** — the feature that gates the entire agent surface |
| `search.view` | **undescribed** | **blind** |
| `customers.people.view` | **not declared in any enabled module** — `customers` is parked | the requirement names a feature the enabled product does not have |

So the door is **correct and blind for 3 of 5**, and one of those three is a stale requirement rather
than a missing descriptor (see §6).

### 1.5 Rule 13 — the number moved twice, so both moves are recorded

The figure carried since the row was opened was **157 enabled features, 121 described (77 %), 36
undescribed**. Re-measuring found it wrong in **both** directions, for two different reasons:

| | Count | Why |
|---|---|---|
| carried | 36 undescribed | `example` counted as enabled (it is off), and `example_customers_sync` + `storage_s3` not counted (they are on under the same class of switch) |
| **measured, default environment** | **28** undescribed across 7 modules → **149 enabled, 121 described (81 %)** | the array as it stands with no flags set |
| **measured, every documented flag on** | **39** undescribed across 10 modules → **160 enabled, 121 described (76 %)** | adds `example` 8, `example_customers_sync` 2, `storage_s3` 1 |

**The number the build must close is 39, not 28** — because the guard must stay green for a developer
who sets the documented flags, and a check that goes red on a supported configuration is a check people
switch off. The 28 is what a default CI run sees.

Parked modules stay out of the denominator: **16 modules, 101 features, 0 described** — excluded on
purpose, because *"a metric that includes work nobody will do is a metric people learn to ignore"*
(the guard's own words, `:36-39`, and they are right).

---

## 2. What "described" means, and why the 39 are not busywork

A descriptor answers the questions an identifier cannot: **how bad is it if this happens, can it be
taken back, does it leave the company, does it touch personal data, and what audit event must it
emit** (`shared/src/modules/capabilities.ts`).

Without one, the resolver cannot reason about the act, so it must treat it as ordinary — and *"for a
destructive act that is exactly the wrong default"* (the guard's own docblock). The 39 undescribed
features are not a cosmetic gap: **the whole agent surface is in it** (`ai_assistant.*`), plus every
channel credential (`channel_imap.configure`, `channel_gmail.configure`, `webhooks.secrets`) and the
scheduler's trigger.

---

## 3. The requirement

**R1 — the numerator covers the enabled surface.** Every enabled module that declares features is
counted, whichever package ships it. Resolution is by the entry's own `from`, not by a directory scan:
`@open-mercato/core` → `packages/core/src/modules`, `@open-mercato/<pkg>` → `packages/<pkg>/src/modules`,
`@app` → `apps/mercato/src/modules`. **No walking of `packages/`** — walking finds the create-app
*template* copy of `example` and double-counts it (§4.1).

**R2 — the parse fails on a change it does not understand.** The guard must be able to answer *"is
there a way to enable a module that I did not account for?"* and say **no** by construction: every
`enabledModules.push(` site in the file is either evaluated or named as unhandled, and a new one fails
the guard. **A guard that silently ignores a new way of enabling a module is this row's defect one
level up.**

**R3 — the denominator is the enabled array, and only it.** The reference modules below the array are
not enabled and must not be counted. If they are enabled by a documented flag, they are counted **when
that flag is on** (R2), not always.

**R4 — an unresolvable module is a failure, not a skip.** An `from` the guard does not recognise, or an
enabled module whose `acl.ts` is missing where the root says it should be, **fails by name**. A skip is
how the current guard lost 7 modules without anyone noticing.

**R5 — "declares nothing" is a fact, and it is counted.** Three enabled modules legitimately have no
`acl.ts` (`content`, `events`, `ratelimit_probe`) and one has an empty list (`api_docs`). The guard
reports them and asserts the **count** of them, so a resolution bug that makes every module look empty
cannot pass as "nothing to describe".

**R6 — the floors are re-derived, and one of them is new.** The existing floors (`≥100` features,
`≥24` modules) are what stop the guard reducing to zero. They are re-derived from the measured surface,
and a **new floor asserts that at least 7 non-core modules are seen** — without it, a regression to
core-only would pass the old floors and print 100 % again.

**R7 — the 39 features get descriptors.** Classified by the rule the codebase already states —
*"classify by the worst act it permits, not the most common one"* (`attachments/acl.ts`, quoted) — with
a `note` wherever the class would not be obvious to the next reader. **When in doubt, classify higher**:
over-classifying costs autonomy, under-classifying costs a destructive act running unattended.

**R8 — the printed line names its scope.** `[capabilities] N/M features described` must say what the
denominator is, so nobody reads 100 % as "all modules" again.

---

## 4. The classification, and the calls that are judgement

### 4.1 Two traps the build must not fall into

| Trap | Measured | Why it bites |
|---|---|---|
| Walking `packages/` to find `acl.ts` | `example` exists **twice** — `packages/create-app/template/src/modules/example` and `apps/mercato/src/modules/example` | the template is a **copy shipped to generated apps**, not a module of this app; counting it inflates the surface by 8 features that describe a template |
| Parsing every `id:` literal | `apps/mercato/src/modules.ts` holds the enabled array **and** the reference list | it counts a module the file says is off (`example`) while missing three that are on (§1.3) |

### 4.2 The rules that decide each of the 39

| Pattern | Class | Reversibility | Why |
|---|---|---|---|
| `.view`, `.list`, `.global` | **E0** | reversible | a read; `dataClasses` carries the sensitivity instead |
| `.manage`, `.configure`, `.settings.manage` on configuration that holds **a credential** | **E5** | reversible | a security/identity change — this is the one people get wrong |
| `.share` | **E3** | compensatable | it widens who can see something that has already left the actor's hands; revoking is a correction, not an undo |
| `.serve`, `.test`, `.trigger` | **E3** | compensatable | reaches outside the company boundary (an MCP client, a webhook target, a scheduled external job) |
| `.reindex`, `.embeddings.manage` | **E2** | reversible | internal and bulk — the second is the one that costs money to redo |
| `example.*` | **E0/E1**, `example.todos.manage` **E6** | per act | demo code, classified honestly rather than waved through: `manage` includes delete |

### 4.3 The eight calls that are genuinely judgement, with the default taken

Recorded so that if any is wrong, it is wrong **by name** and reversible in one line.

| Feature | Default | The argument against it |
|---|---|---|
| `ai_assistant.mcp.serve` | **E3**, external | it starts a server the outside can call — the boundary is crossed by definition |
| `ai_assistant.mcp_servers.manage` | **E5** | it writes the configuration of external servers, which is where their credentials live |
| `ai_assistant.conversations.share` | **E3**, compensatable | sharing is internal to the tenant, but the actor can no longer control where it goes |
| `channel_imap.configure` / `channel_gmail.configure` | **E5** | an email credential; a wrong one reads somebody's mail |
| `webhooks.secrets` | **E5** | signing secrets — the highest-value secret in the module |
| `webhooks.test` | **E3**, external | it sends a real request to a customer's endpoint |
| `scheduler.jobs.trigger` | **E3**, compensatable | the effect is whatever the job does, and the job may reach outside — classified by the worst case |
| `search.embeddings.manage` | **E2**, reversible | bulk and expensive, but rebuildable |

**★ Rule 13 — three of these changed when they were actually written down, and the change is recorded
here rather than quietly applied.** The table above was the *plan*; the shipped classification is:

| Feature | Planned | Shipped | Why the plan was wrong |
|---|---|---|---|
| `ai_assistant.conversations.share` | E3, compensatable | **E5**, compensatable | E3 means *leaves the company boundary*, and a shared conversation stays inside the tenant. What changes is **who may read a record** — which is E5's own definition. Using E3 would have been the right instinct with the wrong reason, and the next reader would have trusted the class over the note |
| `webhooks.test` | E3, compensatable | **E3, irreversible** | a compensatable act must **name the capability that compensates it**, and there is none: nothing recalls a request that has reached a customer's endpoint. Naming `webhooks.manage` would have been a promise nobody can keep — which the validator exists to prevent |
| `scheduler.jobs.trigger` | E3, compensatable | **E3, irreversible** | same reason: no capability undoes a job that has already run |

The pattern in all three: **the plan reached for `compensatable` because the outcome felt recoverable,
and the validator asked the harder question — *which capability compensates it?*** For two of them the
answer was "none", so the honest class was `irreversible`. That is the validator doing its job on its
first real input, and it is why descriptors are declared next to the act rather than in a table
somewhere else.

---

## 5. The proof

Every rule gets a test that fails when the rule is removed — the `CC-127` standard (*"a mutation whose
test does not go red is a defect in the test, not in the rule"*, `LESSONS.md` L23).

| # | Mutation | Must go RED |
|---|---|---|
| M1 | Restore `modulesRoot` as the only source (the defect itself) | R1 — the 7 non-core modules vanish and the fraction reads 100 % again |
| M2 | Resolve `from` to the wrong package (`@open-mercato/search` → core) | R4 — names the module whose `acl.ts` is missing |
| M3 | Treat an unknown `from` as a skip instead of a failure | R4 |
| M4 | Remove the non-core floor assertion | R6 — a core-only regression passes |
| M5 | Delete one descriptor from `ai_assistant` | R7 — names `ai_assistant.view` |
| M6 | Add an `enabledModules.push(...)` the guard does not know | R2 — the completeness assertion fails |
| M7 | Count the reference modules as always enabled | R3 — `example` appears in a default-environment run |

Plus the denominators, asserted explicitly (`LESSONS.md` L21 — a positional suite argument is a regex;
the count is the **last** number on the summary line): the guard's own suite count, the core suite
count, and `tsc --noEmit` at 0.

---

## 6. Named debts

| Debt | Why it is not here | Where it goes |
|---|---|---|
| A tool requires `customers.people.view`, and `customers` is **parked** — so the requirement names a feature the enabled product does not have | It is a question about which tools ship, not about coverage | A new row when the tool surface is next touched; recorded here so it is not rediscovered |
| The guard's `readFeatureIds` splits on `id: '` and cannot tell a feature id from a nested object's id | No module nests `id:` today (measured across all 50 `acl.ts` files); fixing it needs a real parser and buys nothing yet | Stated here; it becomes a row the first time a module nests one |
| `officialModuleEntries` is empty, so the generated-registry path is **unexercised** | The guard must still handle it (R2), but there is nothing to test it against | Test with an injected fixture, not with the real file |
| **`tsc` never type-checks a test file** — every package's tsconfig excludes `**/__tests__/**`, so `tsc --noEmit` at 0 says nothing about the 84 tests this row added | Platform-wide, and fixing it changes every package's build time | A candidate row: *"the type-checker cannot see the tests"* — the same class as `CC-101` |
| **`packages/core/jest.config.cjs` parses `modules.ts` with the same naive scan** that `CC-132` fixed in the guard — every `id:` literal, including the reference list | It only decides which core module tests to skip, and no core module is in the reference list, so it is inert today | Stated here; it becomes a row the first time a core module is parked *and* listed elsewhere |

---

## 7. The question, if any

**None.** The default exists and is stated in the codebase: **classify by the worst act the feature
permits**, and **when in doubt, classify higher**. Both directions of error are unequal — over-
classifying costs an agent some autonomy; under-classifying lets a destructive act run unattended — so
the tie is broken by the same principle the whole authority family is built on.

The eight calls in §4.3 are listed rather than asked because each is reversible in one line, and
because a question whose answer I would take anyway is a question that costs the owner a turn.

---

## 8. What was built

Eleven files changed: the guard, nine `acl.ts` files plus one in the app, and a mutation script.

| File | Change | Rule |
|---|---|---|
| `packages/core/src/__tests__/capability-coverage.test.ts` | the surface now comes from `enabledModules` resolved by each entry's `from`; the parse fails on an enablement path it does not know; modules that declare nothing are named; the floors are re-derived with a non-core floor added; the printed line states its scope | R1–R6, R8 |
| `packages/ai-assistant/…/acl.ts` | **8 descriptors** — the whole agent surface | R7 |
| `packages/search/…/acl.ts` | 6 | R7 |
| `packages/webhooks/…/acl.ts` | 4 | R7 |
| `packages/scheduler/…/acl.ts` | 3 | R7 |
| `packages/onboarding/…/acl.ts` | 3 | R7 |
| `packages/channel-gmail/…/acl.ts`, `packages/channel-imap/…/acl.ts` | 2 each | R7 |
| `apps/mercato/src/modules/example/acl.ts` | 8 | R7 |
| `apps/mercato/src/modules/example_customers_sync/acl.ts` | 2 | R7 |
| `packages/storage-s3/…/acl.ts` | 1 | R7 |
| `scripts/verify-cc132-mutations.mjs` | the proof | §5 |

**The guard's shape, and the three functions that carry the fix.** `moduleRootFor(from)` is the whole
of R1: it maps a package name to the directory that ships its modules, so **nothing is found by
walking** — which is what keeps the create-app template copy of `example` out of the count.
`pushSites(source)` is the whole of R2: it returns each `enabledModules.push(` with **the text that
decides it**, and a site whose text matches none of the documented enablement paths fails the guard.
`environmentEntries()` is R3: it evaluates the documented flags, so the printed line can say how much
of the surface this environment actually has.

**39 descriptors, and the validator earned its keep on its first real input.** Three classifications
changed when written down (§4.3) — two of them because `compensatable` demands a capability that
compensates, and for `webhooks.test` and `scheduler.jobs.trigger` there is none.

---

## 9. The build record — five corrections, three of them to this document

### 9.1 Rule 13: four of §5's seven mutations could not be proved as written

The table in §5 was written before the guard existed. Building it showed four rows were wrong:

| Row | As written | What it actually is |
|---|---|---|
| M3 | "treat an unknown `from` as a skip" | **There is no unknown `from` today**, so the mutation changes nothing and survives. Replaced with *"a known root is treated as unknown"* (`@app` → `null`), which the resolution test catches by name |
| M4 | "remove the non-core floor" | **Removing an assertion cannot fail anything.** A floor is only load-bearing against the regression it guards, so M4 now removes *both* — the pushed entries are dropped from the surface **and** the floor goes — and the mutation proves the floor is what catches a silently-shrinking denominator |
| M7 | "count the reference modules as always enabled" | Once those modules are described, counting them changes **no** coverage assertion. The observable had to be created: a new test asserts that a module the file says is off is **not in the environment set**, and M7 now goes red against that |
| M1, M2, M5, M6 | — | survived as written |

**This is the `CC-127` lesson applied to the requirement instead of the tests:** a proof row that
cannot go red is a defect in the row.

### 9.2 The mutation run found a defect in the GUARD, not in the test

M6 — *"a new way to enable a module the guard does not know"* — **survived the first run**. The
attribution looked **400 characters back** from each push site, and the new push inherited the marker
of the push above it (`entry.id === 'example'`), so an unknown enablement path was silently attributed
to a known one.

Fixed by attributing each push to **the span between the previous push and this one**, so a marker
belongs to exactly one site. After that M6 goes red on its own.

**Worth stating plainly, because it is the opposite of the usual direction:** in `CC-127` the mutation
run exposed defective *tests*; here it exposed a defective *guard*. The instrument is doing the same
job either way — it asks whether the rule can fail, and it does not care which half is wrong.

### 9.3 A process miss: my own census script broke a repo-wide test

`scripts/measure-cc132-surface.mjs` — committed with the requirement — contained `[...allIds].sort()`
with no comparator, and `packages/core/src/__tests__/explicit-sort-comparators.test.ts` scans
`scripts/` for exactly that. **The full core suite went red on the next run.**

The miss was mine and it was avoidable: when the script was committed, **only the guard's own suite was
run**, not the suite that governs the directory the file was added to. Fixed with an explicit
comparator; recorded because the same shape will recur — a new file in a scanned directory is a change
to that directory's checks.

### 9.4 `tsc` does not cover the guard file, and the plan implied it did

§5 lists `tsc --noEmit` at 0 as a denominator. Measured: `packages/core/tsconfig.json` **excludes
`**/__tests__/**`**, so `tsc` never type-checks the file this whole row is about. The claim is true and
weaker than it reads. The guard's correctness is carried by **84 passing tests and 7/7 mutations**, not
by the type-checker — and this is the same class as `CC-101` (*a control that cannot see what it
guards*), one level down. Recorded in §6 as a candidate row rather than fixed here.

### 9.5 The proof

| Check | Result |
|---|---|
| the guard | **84 tests PASS** |
| `scripts/verify-cc132-mutations.mjs` | **7/7 PROVEN**, every file restored **byte-identical** |
| printed line | `[capabilities] 160/160 features described (100%) across 34 modules reachable from enabledModules — every documented enablement path, 149 features in this environment` |
| `packages/core` | **652 suites / 5,728 tests, all green** (was 5,705 — the guard gained 23) |
| `packages/ai-assistant` | **143 suites / 2,128 tests green** |
| the seven other described packages | channel-gmail 6/78 · channel-imap 8/109 · onboarding 15/93 · scheduler 18/353 · search 27/281 · webhooks 15/127 · storage-s3 8/90 — all green |
| `tsc --noEmit` | **0** for `core` and all nine packages; the app has **one pre-existing, unrelated** error (`modules.runtime.generated.ts:854`, `.extensions` vs `entityExtensions`) |

**The seven mutations, as proved:**

1. the numerator reads one package again (the original defect)
2. one package resolves to the wrong tree
3. a known root is treated as unknown and skipped
4. a module enabled by a flag is dropped from the surface, and the floor that catches it
5. one descriptor is deleted from the agent surface
6. a new way to enable a module the guard does not know
7. the denominator is parsed from the whole file, counting modules that are off
