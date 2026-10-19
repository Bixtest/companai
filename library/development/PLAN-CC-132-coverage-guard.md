# PLAN-CC-132 — the coverage guard measures the enabled surface

**Status:** REQUIREMENT ONLY, written 2026-10-19. **No code is written.** §3 is the requirement;
§5 is the proof the build will have to pass. The row stays open until both are done.
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

---

## 7. The question, if any

**None.** The default exists and is stated in the codebase: **classify by the worst act the feature
permits**, and **when in doubt, classify higher**. Both directions of error are unequal — over-
classifying costs an agent some autonomy; under-classifying lets a destructive act run unattended — so
the tie is broken by the same principle the whole authority family is built on.

The eight calls in §4.3 are listed rather than asked because each is reversible in one line, and
because a question whose answer I would take anyway is a question that costs the owner a turn.
