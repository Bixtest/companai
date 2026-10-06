# D2-gap — measured across every enabled module

**Measured:** 2026-10-06. **Tool:** `analysis/d2-gap/measure.js` (re-runnable; `--json` for machines).
**Repo:** `workspace/starting-kit`, HEAD **`1f1b60e`** (the `messages` registry-bypass fix is in; before it, `0af50c8` with `ai_assistant`, and `4ef5812` with `audit_logs`). The `communication_channels` correction below changed **only the tool**, not the repo — so the HEAD is unchanged.

## What D2-gap is, and why it is a defect

`D2-wide` retired the **deprecated** resolver where a route already called it. `D2-gap` is the other
half: **write routes that call no guard at all** — neither the module wrapper, nor the registry, nor
`makeCrudRoute`. A write there is checked by nothing, so it is precisely where a Hermes tool call
would reach data no authorization describes (Hermes map §4.4 (b)).

## The headline

| | baseline (HEAD `5af76bc`) | after `audit_logs` (`4ef5812`) | after `ai_assistant` (`0af50c8`) | after `messages` (`1f1b60e`) | **now (tool fix, HEAD `1f1b60e`)** |
|---|---|---|---|---|---|
| enabled modules with a source tree | **35** | **35** | **35** | **35** | **35** |
| write verbs across those modules | **256** | **256** | **256** | **256** | **256** |
| **unguarded write verbs (the `D2-gap`)** | **160** | **158** | **143** | **122** | **111** |
| auth-flow verbs set aside by design | 8 | 8 | 8 | 8 | 8 |
| guarded verbs (registry / crud / wrapper / local / re-export) | 88 | 90 | 105 | 126 | **137** |
| *guarded + auth-flow (the two "not a write to guard" buckets)* | *96* | *98* | *113* | *134* | ***145*** |

**Each column differs from the one before it by exactly the modules fixed so far** — `audit_logs` (2
verbs), `ai_assistant` (15 verbs), then `messages` (17) + `integrations` (4), which moved to the new
**local-helper** class rather than becoming wrapper-guarded; then `communication_channels` (11 verbs),
which likewise was **already guarded** and only needed the **tool** to learn its helper name — check
the `communication_channels` section: the label said 15 unguarded, the artefact said 11 of those were
guarded all along. Every figure is recorded because the number a document quotes
must say **which HEAD it was measured at** — carrying a "before" figure forward as if it were current
is how the `auth`-onward file-count slip happened.

> **A label correction, made by the closure check itself (2026-10-06).** The "guarded verbs" row
> previously read **88 · 90 · 113 · 134**, and a first draft of this edit read **145**. The closure
> against the unchanged 256 proves those two middle columns (and the new one) were **auth-flow
> double-counts**: 113 = 105 guarded + 8 auth-flow, 134 = 126 + 8, 145 = 137 + 8. Every column must sum
> to 256 with the 8 counted **once**: `guarded-only + 0 (deprecated) + 8 (auth-flow) + unguarded = 256`.
> The correct guarded-only series is **88 · 90 · 105 · 126 · 137** (88 and 90 were already right; the
> drift started at the `ai_assistant` column). Both numbers are now shown, labelled, so the figure can
> never be quoted without its meaning. **Nothing about the code or the unguarded counts changed** — this
> is the same figure-discipline rule the row itself is about, applied to the row.

**Guarded by mechanism (computed by the tool, not assumed):** 65 through a module wrapper, 0 through
`runRouteMutationGuards` directly, 35 through `makeCrudRoute`/`crud.` (the CRUD factory runs
`collectAndRunGuards()`), **32 through a module-local guard helper** (`messages` 17 + `integrations` 4 +
`communication_channels` 11 — the `GUARDED_LOCAL` class), 5 through a re-export of a guarded factory,
**0 through the deprecated pair** (D2-wide left none enabled). **Closure — every write verb is
accounted for:** 65 + 0 + 35 + 32 + 5 + 0 + 8 (auth-flow, set aside) + 111 (unguarded) = **256**. *(A
first draft of this line carried 33/26/29 forward from memory; the tool reads 50/35/5, and the closure
check is what caught it.)*

> ⚠ **What `GUARDED_LOCAL` does and does not prove.** It records that the route calls a module-local
> guard helper — **not** that the helper reaches the registry. `messages`, `integrations`,
> `payment_gateways` and `staff` all named a helper while building `runMutationGuards([legacyGuard])`,
> which **skips the global store**. That is the same one-way failure as the deprecated pair, and the
> scan cannot see it. All four (plus three inline copies) are fixed as of `1f1b60e` — but the class is
> only as trustworthy as the last hand-read of the helper bodies.

## Per module (verbs)

`W` = module wrapper · `R` = `runRouteMutationGuards` · `C` = `makeCrudRoute`/`crud.` ·
`L` = module-local guard helper (`GUARDED_LOCAL`) · `D` = deprecated pair (D2-wide) · `GAP` = unguarded.

| module | files | verbs | W | R | C | L | D | **GAP** |
|---|---|---|---|---|---|---|---|---|
| ai_assistant | 19 | 24 | 15 | 0 | 0 | 0 | 0 | **9** ✅ *fixed `0af50c8`; was 24* |
| messages | 11 | 17 | 0 | 0 | 0 | 17 | 0 | **0** ✅ *fixed `1f1b60e` (registry-bypass, not a D2-gap); was 17* |
| communication_channels | 15 | 15 | 0 | 0 | 0 | 11 | 0 | **4** ✅ *tool fix (11 were already guarded); was 15* |
| auth | 21 | 27 | 1 | 0 | 6 | 0 | **12** |
| business_rules | 5 | 11 | 0 | 0 | 0 | 0 | **11** |
| inbox_ops | 14 | 14 | 4 | 0 | 0 | 0 | **10** |
| workflows | 13 | 14 | 4 | 0 | 0 | 0 | **10** |
| notifications | 10 | 10 | 0 | 0 | 0 | 0 | **10** |
| attachments | 4 | 8 | 0 | 0 | 0 | 0 | **8** |
| search | 7 | 7 | 0 | 0 | 0 | 0 | **7** |
| webhooks | 11 | 15 | 0 | 0 | 3 | 0 | **7** |
| configs | 4 | 4 | 0 | 0 | 0 | 0 | **4** |
| currencies | 4 | 10 | 0 | 0 | 6 | 0 | **4** |
| entities | 7 | 11 | 7 | 0 | 0 | 0 | **4** |
| integrations | 4 | 4 | 0 | 0 | 0 | 0 | **4** |
| progress | 2 | 3 | 0 | 0 | 0 | 0 | **3** |
| directory | 4 | 10 | 1 | 0 | 6 | 0 | **3** |
| dashboards | 6 | 6 | 4 | 0 | 0 | 0 | **2** |
| audit_logs | 2 | 2 | 2 | 0 | 0 | 0 | **0** ✅ *fixed `4ef5812`; was 2* |
| onboarding | 1 | 1 | 0 | 0 | 0 | 0 | **1** |
| data_sync | 8 | 10 | 9 | 0 | 0 | 0 | **1** |
| scheduler | 2 | 4 | 0 | 0 | 3 | 0 | **1** |
| dictionaries | 6 | 8 | 8 | 0 | 0 | 0 | **0** |
| feature_toggles | 2 | 4 | 1 | 0 | 3 | 0 | **0** |
| perspectives | 3 | 3 | 3 | 0 | 0 | 0 | **0** |
| planner | 4 | 8 | 2 | 0 | 6 | 0 | **0** |
| query_index | 2 | 2 | 2 | 0 | 0 | 0 | **0** |
| translations | 1 | 2 | 2 | 0 | 0 | 0 | **0** |
| api_keys | 1 | 2 | 0 | 0 | 2 | 0 | **0** |

## The findings so far

### `audit_logs` — the first module fixed (`4ef5812`)

Both write routes (`audit-logs/actions/undo` POST, `actions/redo` POST) called **no guard of any
kind**. New wrapper `beginAuditLogsMutationGuard`; both routes now run `runRouteMutationGuards()`.
**2 unguarded verbs → 0.** The design decision: the guard is evaluated against the **log entry's own
`resourceKind`** (fallback `audit_logs.action_log`), because what is guarded is the *reversal or replay
of a write to that resource* — a guard registered against e.g. `directory.organization` must see the
**undo of an organization write**. **7 tests; three disjoint mutations proved they bite; wrapper
byte-identical.**

### `ai_assistant` — the second and largest module fixed (`0af50c8`)

**24 unguarded verbs across 19 files — the largest `D2-gap` measured, and the Hermes-facing module.**
New wrapper `beginAiAssistantMutationGuard`; the 10 **resource-write** files now run
`runRouteMutationGuards()`. **24 unguarded verbs → 9.**

The 24 verbs are **not all the same thing**, and wrapping them all would have been wrong — the same
call the `auth` migration made. They split three ways:

| class | verbs | decision |
|---|---|---|
| **(a) resource writes** — settings, allowlist, agent overrides, conversations, participants | **15** | **guarded** via `beginAiAssistantMutationGuard` |
| **(b) session/flow** — `ai/chat`, `ai/run-object`, `route`, `chat`, `session-key`, `mcp-key`, `tools/execute` | 7 | **set aside by name** |
| **(c) pending-action gate** — `ai/actions/[id]/confirm`, `ai/actions/[id]/cancel` | 2 | **set aside by name** |

**15 + 7 + 2 = 24.** Class (b) is chat completion, transport and **credential minting** — governed by
rate limits, short-TTL keys and per-tool feature checks, the `auth` login/logout category. Class (c) is
the **AI mutation-approval gate**: `confirm` calls `runPendingActionRechecks()`, which re-verifies
status, expiry, agent registration, features, **mutation policy**, tool whitelist, tenant scope, record
version and schema drift before the wrapped tool runs — a **dedicated** mechanism for exactly these
writes. `resourceKind` is shaped `ai_assistant.<entity>` (settings / allowlist / agent_override /
conversation). The `loop-override` DELETE guard runs **only on the path that actually writes** — a no-op
clear has nothing for a guard to govern (the `inbox_ops` precedent). **Every route's own authorization
is untouched. 30 tests; three disjoint mutations proved they bite; every file byte-identical.**

## Reconciliation against the figures already recorded

Six of the previously-recorded modules agree **exactly**; two did not, and both are now explained.
This cross-check is the point: a figure carried forward unchecked is how the `auth`-onward file-count
slip happened before.

| module | recorded in BACKLOG | this measurement | verdict |
|---|---|---|---|
| `inbox_ops` | 10 of 14 | 10 | ✅ exact |
| `auth` | 12 of 18 resource-writes | 12 (8 auth-flow verbs set aside by name) | ✅ exact |
| `directory` | 3 verbs in 1 file | 3 in 1 file | ✅ exact |
| `feature_toggles` | 0 of 4 | 0 | ✅ exact |
| `perspectives` | 0 of 3 | 0 | ✅ exact |
| `translations` | 0 of 3 | 0 | ✅ exact |
| `planner` | 0 of 2 | 0 | ✅ exact |
| `query_index` | 0 of 2 | 0 | ✅ exact |
| **`workflows`** | **13 of 19** | **10** | ❌ **the record was wrong** |

### Why `workflows` was wrong — two routes agree

The record lists `api/tasks/route.ts` and `api/events` subscribe/unsubscribe among the unguarded
write routes. **Neither exports a write verb** — checked twice, by routes that share no failure mode:

1. **Read the file today:** `tasks/route.ts` and `events/route.ts` export `GET` (+ `metadata`,
   `openApi`) and nothing else. Same for `events/[id]`, `instances/[id]`, `tasks/[id]`.
2. **Read the commit:** `git show d3af1b1:…/tasks/route.ts` and `…/events/route.ts` — no write verb
   **then either**. So they were never write routes; the record counted the *files* as if they were.

`workflows` is therefore **10 unguarded verbs in 10 files**, and the record's "13 of 19" is corrected
here rather than carried forward.

## Two unit errors in my own first pass — both caught by comparing, not by re-running

1. **Files were counted where the backlog counts verbs.** `directory/organization-edges/route.ts` is
   **one file with three unguarded verbs** (POST, PATCH, DELETE). My first pass said `1`; the record
   says `3`; the record is right. The script now counts verbs, and `directory` matches exactly.
2. **A guarded file was misread as unguarded.** My export-detection regex required the verb to follow
   `const X =` immediately, so `export const POST = crud.POST` — the CRUD factory pattern, used by
   `auth/users/route.ts` and `auth/roles/route.ts` — was classified **unguarded**. That inflated
   `auth` and hid two guarded routes. Fixed; `auth` dropped 20 → 12 and matched the record.

Neither error was visible by re-reading my own output. Both were found by **lining up against the
figures a different person had already written down** — the same discipline the project's own
LESSONS demand.

## `messages` — the label was wrong, and the premise was measured before the fix

`messages` was measured as **17 unguarded verbs / 11 files** — the largest `D2-gap` module left after
`ai_assistant`. The literal fix (the one `audit_logs` and `ai_assistant` took) would have wrapped all
11 route files in a second guard layer. **That would have been wrong, and it was caught by measuring
the premise first.**

**Every one of the 17 verbs already calls a guard** — `runMessageMutationGuards()` — so the `D2-gap`
definition (*"routes that call no guard whatsoever … a write there is checked by nothing"*) **did not
describe them**. The scan read them as GAP only because the file references **none of the four shared
symbols** it looks for. This is the trap the project's own skill
`check-the-premise-before-the-blanket-fix` names.

> **Arithmetic to expect, so it is not re-derived:** the module has **17 write verbs but only 15
> `runMessageMutationGuards(` call sites**. That is not a gap — two files
> (`[id]/conversation/{read,archive}/route.ts`) export **two verbs each that share one call site**: a
> private `runConversation*Mutation()` helper holding the single guard call, with `PUT` and `DELETE`
> both delegating to it. All 17 verbs reach the guard. Verified twice: the per-file `verbs` vs
> `guard-calls` counts, and reading both files end to end.

**But the code was still defective, in a different way.** `messages/api/guards.ts` built
`runMutationGuards([legacyGuard], …)` — a **one-element array**. `runMutationGuards` filters only the
array it is handed, so `getAllMutationGuardInstances()` (the global guard store) was **never
consulted**. That is the **same one-way failure as the deprecated `validateCrudMutationGuard()` pair**
(the `D2-wide` defect), reached through a module-local helper instead of the deprecated names: a guard
registered for `messages.*` would have been silently ignored.

**The same one-line defect existed in six more places**, found by grepping **every
`bridgeLegacyGuard` call site** rather than the four symbols:

| site | helper |
|---|---|
| `messages/api/guards.ts` | `runMessageMutationGuards` |
| `integrations/api/guards.ts` | `runIntegrationMutationGuards` |
| `payment_gateways/api/guards.ts` | `runPaymentGatewayMutationGuards` *(module parked)* |
| `staff/api/guards.ts` | `runStaffMutationGuards` |
| `sales/api/quotes/convert/route.ts` | inline `runGuards()` |
| `sales/api/quotes/send/route.ts` | inline `runGuards()` |
| `configs/api/cache/route.ts` | inline purge handler |

All seven now build the array the way `collectAndRunGuards()` in `crud/factory.ts` does — registry
instances first, then the bridged legacy service. The `*.mutation-guard.ts` wrappers were **never
affected**: they call `runRouteMutationGuards`, which already includes the registry.

**Latent, not live — stated plainly.** Only `customer_accounts`, `customers` and `entities` ship a
`data/guards.ts`, and none registers a guard for any of these modules' resource kinds. No write was
reachable by a guard that a bypass could skip. The hole is closed **before** one exists, not after.

**The tool was corrected, not just the code.** The four-symbol scan cannot tell "calls a guard" from
"calls a *registry* guard", so a fifth class **`GUARDED_LOCAL`** was added (helpers listed by name in
`LOCAL_GUARD_HELPERS`). **Its header states the limit:** it proves a guard **call**, not a *registry*
guard — so a helper that regresses to legacy-only is invisible to the tool and must be re-read by hand.

**`messages` 17 → 0, `integrations` 4 → 0; total 143 → 122.**
**Test:** `modules/__tests__/local-guard-helpers-registry.test.ts` — 16 tests, cross-module; proved RED
by mutating **one** helper (`staff`) back to legacy-only → exactly that helper's 2 registry-path tests
went red, the other 12 stayed green.

## `communication_channels` — the label was wrong again; the tool, not the code, was defective

`communication_channels` was measured as the **largest remaining `D2-gap` module: 15 unguarded verbs /
15 files** (12 POST, 2 DELETE, 1 PUT — one verb per file). The literal fix would have wrapped all 15
files. **Measuring the premise first showed it was false for 11 of them.**

**11 of the 15 verbs already call `validateRouteMutationGuard`** — the module's own helper in
`lib/route-mutation-guard.ts`. That helper is **not** the legacy-only shape: it calls
`runRouteMutationGuards`, which spreads `getAllMutationGuardInstances()` (the registry) **and** pushes
the bridged legacy guard. Where `messages`' helper was wrong and needed **fixing**, this one was already
right — the only defect was that the **scan did not know its name**.

**Two routes agree that those 11 are guarded:**

1. **The artefact, route by route.** 11 files reference `validateRouteMutationGuard`; each exports
   exactly **one** write verb and holds exactly **one** `await validateRouteMutationGuard(` call —
   11 verbs / 11 calls, 1:1. The other 4 files hold 4 verbs and no such call. **11 + 4 = 15 files,
   11 + 4 = 15 verbs.**
2. **The tool's own rows**, read back from `--json` and matched against each file's text: the same
   **11 / 4** split. *(My first hand-count said "12 guarded, 3 unguarded" — a slip; the two machine
   routes corrected it. Do not carry the 12 forward.)*

**And the helper really is registry-backed** — proven by its own test, not by reading the line:
`lib/__tests__/route-mutation-guard.test.ts` registers a **real** guard via `registerMutationGuards`,
then asserts `validateRouteMutationGuard` **blocks** on it (422) and **fires its `afterSuccess`**. A
legacy-only helper could not pass that test — there is no legacy service registered in it.

**The remaining 4 verbs, each named and set aside on evidence — none is a `D2-gap`:**

| route | why it is not a resource write to guard |
|---|---|
| `post/oauth/[provider]/initiate` | **0 DB writes.** Issues an OAuth authorize URL + sets a state cookie. An outgoing redirect, not a mutation. |
| `post/webhook/[provider]` | `requireAuth: false` — the **signature verification IS the auth**. **0 DB writes**; verifies a per-tenant signature, then **enqueues** an inbound job. There is no `(userId, tenantId)` scope for a mutation guard to read. |
| `post/webhooks/gmail` | Same shape: a **Google-signed JWT** is the auth, no session. **0 DB writes**; enqueues a history-sync job; 204. |
| `post/test-seed` | **Does write — but is gated off in production.** `isTestChannelSeedingEnabled()` (env `OM_ENABLE_TEST_CHANNEL_SEEDING`, unset by default) returns **404 at line 97 — before any write**. Every write (commandBus, `em.create`, `INSERT INTO messages`, link, mapping) is **after** the gate; verified by line order. A test surface, not a product write path. |

**Measured after (tool fix only; no code change, HEAD unchanged at `1f1b60e`):**
`communication_channels` **15 → 4** unguarded (11 moved to `GUARDED_LOCAL`); **total 122 → 111**;
local class **21 → 32**; guarded **134 → 145**. **Closure: 65 + 0 + 35 + 32 + 5 + 0 + 8 + 111 = 256.**
`communication_channels` **58 suites / 558 tests green** (incl. the guard test above).

**The lesson this repeats — now a standing rule for this sweep:** the `D2-gap` label is a *four-symbol
string scan*. It can read a guarded route as `GAP` (this module, `messages`) and — before the
`GUARDED_LOCAL` header was written — a legacy-only helper as guarded. **Measure the premise the label
names (`check-the-premise-before-the-blanket-fix`) before spending files on the fix it implies.** When a
module ships its own guard helper, teach the tool the helper's name **only after proving the helper
reaches the registry** — the `messages` fix proved the name alone is not enough.

## Method, so this can be re-run and cannot rot

```bash
node analysis/d2-gap/measure.js          # table + the unguarded file list
node analysis/d2-gap/measure.js --json   # machine-readable
```

The script reads the enabled set from `apps/mercato/src/modules.ts` (**not** a hand-typed list), strips
comments before looking for guards (so a guard *named in prose* is not counted — the L91 lesson),
counts **verbs** not files, and sets the eight auth-flow endpoints aside by name to stay comparable
with the record.

**Known limits, stated rather than hidden:**

- `ratelimit_probe` is enabled but has no source directory under the searched roots — excluded.
- A module whose route is built somewhere unusual could still be missed; the list of excluded modules
  is printed on every run.
- The script classifies by **what the file references**, not by tracing the call graph. A file that
  references a guard but returns before calling it would read as guarded. Not observed here.
- **`GUARDED_LOCAL` depends on `LOCAL_GUARD_HELPERS` being complete.** A module with its own guard
  helper that is **not** listed reads as `GAP` even though it is guarded — this is exactly what happened
  to `communication_channels` (11 verbs mis-labelled until `validateRouteMutationGuard` was added to the
  map). **When a new module is measured, check whether it ships a guard helper before trusting a `GAP`.**
  The five known helpers: `runMessageMutationGuards`, `runIntegrationMutationGuards`,
  `runPaymentGatewayMutationGuards`, `runStaffMutationGuards`, `validateRouteMutationGuard`.
