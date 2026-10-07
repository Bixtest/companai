# D2-gap — measured across every enabled module

**Measured:** 2026-10-06. **Tool:** `analysis/d2-gap/measure.js` (re-runnable; `--json` for machines).
**Repo:** `workspace/starting-kit`, HEAD **`1f1b60e`** (the `messages` registry-bypass fix is in; before it, `0af50c8` with `ai_assistant`, and `4ef5812` with `audit_logs`). The `communication_channels` correction below changed **only the tool**, not the repo — so the HEAD is unchanged.

## What D2-gap is, and why it is a defect

`D2-wide` retired the **deprecated** resolver where a route already called it. `D2-gap` is the other
half: **write routes that call no guard at all** — neither the module wrapper, nor the registry, nor
`makeCrudRoute`. A write there is checked by nothing, so it is precisely where a Hermes tool call
would reach data no authorization describes (Hermes map §4.4 (b)).

## The headline

| | baseline (HEAD `5af76bc`) | after `audit_logs` (`4ef5812`) | after `ai_assistant` (`0af50c8`) | after `messages` (`1f1b60e`) | after the `communication_channels` tool fix (`4eead9d`) | after `auth` (`8e1632c`) | after `business_rules` (`c9a6bb6`) | **now (`inbox_ops`, `0350563`)** |
|---|---|---|---|---|---|---|---|---|
| enabled modules with a source tree | **35** | **35** | **35** | **35** | **35** | **35** | **35** | **35** |
| write verbs across those modules | **256** | **256** | **256** | **256** | **256** | **256** | **256** | **256** |
| **unguarded write verbs (the `D2-gap`)** | **160** | **158** | **143** | **122** | **111** | **99** | **88** | **78** |
| auth-flow verbs set aside by design | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| actor-less verbs set aside by design | — | — | — | — | — | — | — | **1** |
| guarded verbs (registry / crud / wrapper / local / re-export) | 88 | 90 | 105 | 126 | **137** | **149** | **160** | **169** |
| *guarded + auth-flow (the two "not a write to guard" buckets)* | *96* | *98* | *113* | *134* | ***145*** | ***157*** | ***168*** | ***177*** |

**Each column differs from the one before it by exactly the modules fixed so far** — `audit_logs` (2
verbs), `ai_assistant` (15 verbs), then `messages` (17) + `integrations` (4), which moved to the new
**local-helper** class rather than becoming wrapper-guarded; then `communication_channels` (11 verbs),
which likewise was **already guarded** and only needed the **tool** to learn its helper name — check
the `communication_channels` section: the label said 15 unguarded, the artefact said 11 of those were
guarded all along; then **`auth` (12 verbs)**, wired through its own
`beginAuthMutationGuard()` wrapper; then **`business_rules` (11 verbs)**, wired through a **new**
`beginBusinessRulesMutationGuard()` wrapper; then **`inbox_ops` (10 verbs)**, wired through the module's
**existing** `beginInboxOpsMutationGuard()` — **9 of them** (the actor-present write routes), with the
**10th `webhook/inbound` set aside as actor-less** rather than wired. That 10th is why the `inbox_ops`
column moves the unguarded count by **10** but the guarded count by **9**, and introduces a **new
set-aside row**. Every figure is recorded because the number a document quotes
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

**Guarded by mechanism (computed by the tool, not assumed):** **97 through a module wrapper**, 0 through
`runRouteMutationGuards` directly, 35 through `makeCrudRoute`/`crud.` (the CRUD factory runs
`collectAndRunGuards()`), **32 through a module-local guard helper** (`messages` 17 + `integrations` 4 +
`communication_channels` 11 — the `GUARDED_LOCAL` class), 5 through a re-export of a guarded factory,
**0 through the deprecated pair** (D2-wide left none enabled). **Closure — every write verb is
accounted for:** 97 + 0 + 35 + 32 + 5 + 0 + 8 (auth-flow, set aside) + 78 (unguarded) + 1 (actor-less,
set aside) = **256**. *(A first draft of this line carried 33/26/29 forward from memory; the tool reads
50/35/5, and the closure check is what caught it. The `actor-less` term was added 2026-10-07 with the
`inbox_ops` fix — see the class note below.)*

> **A second closure scare, and what it actually was (2026-10-07).** After wiring `auth` the closure read
> **251**, five short. The five were **`webhooks`' 5 `GUARDED_REEXPORT` verbs**, omitted by the summing
> script — not a missing guard and not a tool defect. The tool's per-module `fields` carries
> `reexport`; any closure arithmetic must include it. With it, the figures balance exactly and the
> pre-change value reconstructs to the recorded **137 + 0 + 8 + 111 = 256**, confirming the earlier row
> rather than contradicting it. Recorded because the same omission will otherwise be made again.

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
| auth | 21 | 27 | 13 | 0 | 6 | 0 | 0 | **0** ✅ *fixed `8e1632c`; was 12* |
| business_rules | 5 | 11 | 11 | 0 | 0 | 0 | 0 | **0** ✅ *fixed `c9a6bb6`; was 11* |
| inbox_ops | 14 | 14 | 13 | 0 | 0 | 0 | 0 | **0** ✅ *fixed `0350563`; was 10 — 9 wired, 1 actor-less set aside* |
| workflows | 13 | 14 | 4 | 0 | 0 | 0 | 0 | **10** |
| notifications | 10 | 10 | 0 | 0 | 0 | 0 | 0 | **10** |
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

### `auth` — the third module fixed (`8e1632c`)

**12 unguarded verbs across 10 files** — the largest remaining module, and the first fixed where the
routes were genuinely **not** unprotected: each already enforced its own capability
(`metadata.requireFeatures`) and wrote its own audit entry. What was missing was the **structural guard
chokepoint**, not authorization. All 12 now run through the module's existing
`beginAuthMutationGuard()`. **12 unguarded verbs → 0.** Full detail — including the latent
`sidebar/variants` bypass-caught-as-409 the wiring exposed — is in its own section below.

### `business_rules` — the fourth module fixed (`c9a6bb6`)

**11 unguarded verbs across 5 files** — the largest remaining module after `auth`, and the **second**
fixed where the routes were genuinely **not** unprotected. Every one of the eleven already enforced its
own capability through `metadata.requireFeatures` and scoped every row lookup by tenant +
organization:

| file | verbs | feature today |
|---|---|---|
| `rules/route.ts` | POST, PUT, DELETE | `business_rules.manage` |
| `sets/route.ts` | POST, PUT, DELETE | `business_rules.manage_sets` |
| `sets/[id]/members/route.ts` | POST, PUT, DELETE | `business_rules.manage_sets` |
| `execute/route.ts` | POST | `business_rules.execute` |
| `execute/[ruleId]/route.ts` | POST | `business_rules.execute` |

New wrapper `beginBusinessRulesMutationGuard()`; all eleven now run `runRouteMutationGuards()`.
**11 unguarded verbs → 0** (all eleven `GUARDED_WRAPPER`).

**The one design decision — and a premise that had to be measured, not assumed.** The two
`execute/*` POSTs *look* like "run something" calls, not writes, and the tempting move was to set them
aside by name (as class (b) of `ai_assistant` was). **The premise was tested before the label was
applied** and it was false: both routes insert a `RuleExecutionLog` row through `logRuleExecution`
**whenever `dryRun` is false** — reached on the success path, the error path *and* the timeout path.
They are genuine write routes, and a guard set for this module must be able to see a manual execution.
They are therefore guarded against `business_rules.executionLog` — the log being written, not the rule
being read — while the four CRUD routes use `business_rules.rule` / `.ruleSet` / `.ruleSetMember`.
Guarding them unconditionally (rather than only when `dryRun` is false) is deliberate: the guard is a
**pre-write** chokepoint, and deciding "is this request a write?" inside the route would put policy in
the route.

**Test evidence — two disjoint mutations, not a mock.** New suite
`api/__tests__/d2-gap-wiring.route.test.ts` (**53 tests**) registers a **real** guard in the global
store via `registerMutationGuards()` and drives the **real** handlers. Mutation 1 (**block**) asserts
the guard's status is returned and the **write never happens**; mutation 2 (**allow**) asserts the
write happens **and** `afterSuccess` fires **exactly once**. Three disjoint mutations proved the suite
bites, every file restored **byte-identical** (wrapper md5 `6638a959…`, `rules/route.ts` md5
`5ef33481…`): (1) neuter the wrapper's **block** path → exactly the **11 mutation-1** tests RED;
(2) remove the guard call from **one route file** (`rules/route.ts` POST) → exactly that route's **2
tests** RED, the other 9 verbs staying green; (3) sever the wrapper's **whole `afterSuccess` path** →
exactly the **11 mutation-2** tests RED.

> **A partial mutation, recorded because it is instructive.** The first cut of mutation 3 severed only
> the direct `afterSuccess` branch and left the `resourceIdOverride` **rebind** branch intact — so the
> two `execute` tests (whose `runAfterSuccess` is called with the generated log id, taking the rebind
> path) **stayed green**, and the count came to 9, not 11. That was a real gap in the *mutation's*
> coverage, not a passing test; running the full sever produced the expected 11. It is recorded
> because a re-run of one's own check would have hidden exactly this.

**Measured after (HEAD `c9a6bb6`):** `business_rules` **11 → 0** (wrapper class for the module **0 →
11**); **total D2-gap 99 → 88**; repo-wide wrapper class **77 → 88**; guarded-only **149 → 160**;
closure **88 + 0 + 35 + 32 + 5 + 0 + 8 + 88 = 256**. **Green:** `business_rules` **19 suites / 393
tests**; core `tsc --noEmit` **exit 0**.

### `inbox_ops` — the fifth module fixed, and the first with a route that CANNOT be wired (`0350563`)

Measured **10 unguarded verbs across 10 files** (of 14 write verbs in the module; 4 already ran the
registry). The label was **right on its face** — these ten called no guard of any kind — but the
implication a reader draws, *"checked by nothing"*, was **false**: every one already enforced its own
capability (`inbox_ops.proposals.manage` / `.replies.send` / `.settings.manage`) and scoped every lookup
by tenant + organisation. **So again: the defect was the missing structural chokepoint, not missing
authorization.**

**Nine of the ten were wired** through the module's **existing** `beginInboxOpsMutationGuard()` — no new
wrapper was needed. Placement follows the module's own idiom: after the route's auth/validation/404/409
gates, before the write, `runAfterSuccess()` after commit. Two placements are deliberate, not incidental:
`proposals/[id]/translate` runs the guard **after** its cache-hit early return, so a request that only
reads a cached translation is not policy-evaluated; and `replies/[replyId]/send` runs it **before** the
atomic send-claim and before `resend.emails.send`, so a block prevents both the email leaving and a claim
row being left set.

**The tenth route — `webhook/inbound.ts` POST — is NOT wired, and could not be.** It is public
(`metadata.POST = { requireAuth: false }`) and **actor-less**: it writes an `InboxEmail` attributed to no
user (`auth: { sub: null, … }`). The registry wrapper types `auth.userId` as a **non-nullable `string`**
and feeds it to `rbacService.getGrantedFeatures`, whose result gates every `features`-bearing guard. With
a fabricated userId, those guards would **skip silently** — "looks guarded while doing nothing", the exact
failure the D2-wide record warns about. It is guarded by its **own** mechanisms — provider HMAC / Svix
signature, a 5-minute replay window, a 2 MB payload cap, global + per-tenant rate limits, and
de-duplication — none of which the D2-gap tool can see. It is therefore **set aside by name** in the tool
(`ACTORLESS_PATHS`, alongside the existing `AUTH_FLOW_PATHS`), and the reason is **measured** (the route
was read), not assumed.

**Two independent routes agree on the 10/10 count:** (1) the tool's `--json` rows read **10 UNGUARDED
across 10 files** with the ten file names; (2) the module's own `api/mutation-guard.ts` header — written
**2026-10-06, before this work** — names the **same ten** routes verbatim under *"The other 10 call no
guard at all"*. Neither derives from the other.

**One tool change, and it is a labelling one:** the tool gained an `ACTORLESS_SET_ASIDE` class so the
webhook is not counted as GAP. This is the same discipline as `GUARDED_LOCAL` and `AUTH_FLOW_SET_ASIDE`:
a figure that reads "checked by nothing" when the truth is "cannot be checked this way, and is checked
another way" **over-claims**. The closure grew a term: `97 + 0 + 35 + 32 + 5 + 0 + 8 + 78 + 1 = 256`.

**Test evidence — a real guard in the real store, not a mock:** new suite
`api/__tests__/d2-gap-wiring.route.test.ts` (**73 tests**) registers a **real** guard via
`registerMutationGuards()` and drives the **real** handlers (the older `mutation-guards.test.ts` stubs the
registry call, so it proves only that the wrapper is *reached*). **Mutation 1 (block):** the guard
refuses (423) and the entity manager records **no write** for all nine verbs — asserted by the write
record, not the status. **Mutation 2 (allow):** the write happens and `afterSuccess` fires **exactly
once**. **Three disjoint mutations** proved the suite bites, every file restored **byte-identical**
(verified two ways — md5, and a `git diff --numstat` reading **pure insertions, zero deletions**):
neuter the wrapper's block path → **10 RED**; remove **one route's** guard call → **1 RED**; sever the
wrapper's **whole after-success path** (both branches) → **9 RED**.

> **Two things the suite itself got wrong, recorded because a re-run of one's own check hides both.**
> (1) A guard registered with the route's `'custom'` operation **never matches**: the registry maps
> `'custom'` → `'update'` *before* filtering guards, so three verbs silently returned 200 with the guard
> unfired until the helper mapped the operation. (2) An edit collapsed a newline in `translate/route.ts`
> (`findWithDecryption(      ctx.em,`); it typechecked and the tests passed, so **only the md5 /
> zero-deletion check caught it**. Both fixed; the file is byte-identical to its pre-mutation hash.

**Measured after (HEAD `0350563`):** `inbox_ops` **10 → 0** in the GAP column (wrapper class for the
module **4 → 13**; 1 verb newly in the actor-less class); **total D2-gap 88 → 78**; repo-wide wrapper
class **88 → 97**; guarded-only **160 → 169**; closure **97 + 0 + 35 + 32 + 5 + 0 + 8 + 78 + 1 = 256**.
**Green:** `inbox_ops` **36 suites / 415 tests**; core `tsc --noEmit` **exit 0**. **Next module:
`notifications` / `workflows` (10 unguarded verbs each).**

## Reconciliation against the figures already recorded

Six of the previously-recorded modules agree **exactly**; two did not, and both are now explained.
This cross-check is the point: a figure carried forward unchecked is how the `auth`-onward file-count
slip happened before.

| module | recorded in BACKLOG | this measurement | verdict |
|---|---|---|---|
| `inbox_ops` | 10 of 14 | 10 | ✅ exact → **now 0, fixed `0350563` (9 wired, 1 actor-less set aside)** |
| `auth` | 12 of 18 resource-writes | 12 (8 auth-flow verbs set aside by name) | ✅ exact → **now 0, fixed `8e1632c`** |
| `business_rules` | 11 unguarded verbs | 11 | ✅ exact → **now 0, fixed `c9a6bb6`** |
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

## `auth` — the first module fixed where the routes were *not* unprotected

`auth` was measured as **12 unguarded resource-writes across 10 files** — the largest remaining module
on the list, and the fourth-largest after three already fixed. The premise that mattered here was a
different one from `messages` and `communication_channels`: **the label was right** (these routes really
did call no guard), but the *implication* a reader would draw from it — "these writes are checked by
nothing" — **was wrong, and saying so is part of the record.**

**Every one of the twelve already enforced its own capability and wrote its own audit entry:**

| route | write verb | its own authorization today |
|---|---|---|
| `authority/delegations` | POST | `metadata.requireFeatures: ['auth.delegations.manage']` + `writeDirectWriteAuditLog` |
| `authority/denials` | POST | `auth.denials.manage` + audited by `DenialService` |
| `authority/pending-acts` | POST | `auth.authority.approve` + audited |
| `authority/record-locks` | POST | `auth.records.lock` + audited |
| `authority/trust` | POST | `auth.trust.promote` + audited |
| `roles/acl` | PUT | `auth.acl.manage` + `assertActorCanGrantAcl` + `assertActorCanModifySuperAdminRoleTarget` |
| `users/acl` | PUT | `auth.acl.manage` + `assertActorCanAccessUserTarget` + `assertActorCanGrantAcl` |
| `sidebar/preferences` | PUT, DELETE | `auth.sidebar.manage` (role scope) + `enforceCommandOptimisticLock` |
| `sidebar/variants` | POST | `auth.sidebar.manage` |
| `sidebar/variants/[id]` | PUT, DELETE | `auth.sidebar.manage` |

So this is **not** "a write nothing checks" in the ordinary sense. What was missing was the **structural
mutation-guard chokepoint** — the registry. Since `auth` ships **no `data/guards.ts`**, no `auth.*`
guard exists in the registry today, so the security argument for the fix is narrow and is stated
narrowly: it means the **first** `auth.*` guard ever written will be **enforced** rather than silently
skipped. The module's own `api/mutation-guard.ts` already said exactly this before the wiring; the
finding above is its confirmation, not a new claim.

**What was done:** all twelve verbs now call the module's existing `beginAuthMutationGuard()` — which
calls `runRouteMutationGuards()`, the registry — placed **after** the route's own auth/validation gates
and **before** the write, with `guard.runAfterSuccess()` after the write commits. Ten files touched;
`auth` needs no new wrapper.

**Two independent routes agree on the count** (the discipline the `communication_channels` section
established): the tool's `--json` rows read **12 GAP across 10 files**, and the module's own
`mutation-guard.ts` header — written 2026-10-06, *before* this work — records **"12 unguarded
resource-writes across 10 files"** with the identical six file names. Neither was derived from the
other.

**Proven by two disjoint mutations, not by a mock.** `api/__tests__/d2-gap-wiring.route.test.ts`
registers a **real** guard in the global store via `registerMutationGuards()` and drives the **real**
handlers — 29 cases covering all twelve verbs in both directions:

- **Mutation 1 (block):** the guard refuses (423) and the **write never happens** — asserted by the
  service stub's call count staying at zero, not by reading the response alone.
- **Mutation 2 (allow):** the write happens **and** the guard's `afterSuccess` fires **exactly once**.

A mock of `beginAuthMutationGuard` would have proven only that the routes call a function of that name;
registering a real guard proves the chokepoint is actually reached.

**One latent defect found while wiring, and fixed.** `sidebar/variants` POST ran its guard **inside** the
`try/catch` that translates a unique-constraint violation into a `409 duplicate_name`. A blocked
mutation would therefore have been **re-reported as a duplicate name**. The guard is now outside that
`catch`. (The `variants/[id]` handlers and the five `authority/*` routes had no such trap; checked.)

**Measured after (HEAD `8e1632c`):** `auth` **12 → 0** unguarded (all 12 now `GUARDED_WRAPPER`, wrapper
class for the module **1 → 13**); **total 111 → 99**; repo-wide wrapper class **65 → 77**; guarded-only
**137 → 149**. **Closure: 77 + 0 + 35 + 32 + 5 + 0 + 8 + 99 = 256.** `auth` **79 suites / 682 tests
green**; `tsc --noEmit` clean.

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
