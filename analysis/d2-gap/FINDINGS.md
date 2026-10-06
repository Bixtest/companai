# D2-gap — measured across every enabled module

**Measured:** 2026-10-06. **Tool:** `analysis/d2-gap/measure.js` (re-runnable; `--json` for machines).
**Repo:** `workspace/starting-kit`, HEAD **`0af50c8`** (the `ai_assistant` fix is in; before it, `4ef5812` with the `audit_logs` fix).

## What D2-gap is, and why it is a defect

`D2-wide` retired the **deprecated** resolver where a route already called it. `D2-gap` is the other
half: **write routes that call no guard at all** — neither the module wrapper, nor the registry, nor
`makeCrudRoute`. A write there is checked by nothing, so it is precisely where a Hermes tool call
would reach data no authorization describes (Hermes map §4.4 (b)).

## The headline

| | baseline (HEAD `5af76bc`) | after `audit_logs` (`4ef5812`) | **now (HEAD `0af50c8`)** |
|---|---|---|---|
| enabled modules with a source tree | **35** | **35** | **35** |
| write verbs across those modules | **256** | **256** | **256** |
| **unguarded write verbs (the `D2-gap`)** | **160** | **158** | **143** |
| auth-flow verbs set aside by design | 8 | 8 | 8 |
| guarded verbs | 88 | 90 | **113** |

**Each column differs from the one before it by exactly the modules fixed so far** — `audit_logs` (2
verbs) then `ai_assistant` (15 verbs). Every figure is recorded because the number a document quotes
must say **which HEAD it was measured at** — carrying a "before" figure forward as if it were current
is how the `auth`-onward file-count slip happened.

**Guarded by mechanism (computed by the tool, not assumed):** 65 through a module wrapper, 0 through
`runRouteMutationGuards` directly, 35 through `makeCrudRoute`/`crud.` (the CRUD factory runs
`collectAndRunGuards()`), 5 through a re-export of a guarded factory, **0 through the deprecated pair**
(D2-wide left none enabled). **Closure — every write verb is accounted for:** 65 + 35 + 5 + 0 + 8
(auth-flow, set aside) + 143 (unguarded) = **256**. *(A first draft of this line carried 33/26/29 forward
from memory; the tool reads 50/35/5, and the closure check is what caught it.)*

## Per module (verbs)

`W` = module wrapper · `R` = `runRouteMutationGuards` · `C` = `makeCrudRoute`/`crud.` ·
`D` = deprecated pair (D2-wide) · `GAP` = unguarded.

| module | files | verbs | W | R | C | D | **GAP** |
|---|---|---|---|---|---|---|---|
| ai_assistant | 19 | 24 | 15 | 0 | 0 | 0 | **9** ✅ *fixed `0af50c8`; was 24* |
| messages | 11 | 17 | 0 | 0 | 0 | 0 | **17** |
| communication_channels | 15 | 15 | 0 | 0 | 0 | 0 | **15** |
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

## The two fixes so far

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
