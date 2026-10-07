# Journal

**What happened, in order, and why.** Newest first.

For *what to avoid*, read [`LESSONS.md`](LESSONS.md). For *where things are*,
read [`INDEX.md`](INDEX.md). This file answers **"how did we get here?"**

---

## ★ ACTIVE TASK — what is being worked on right now

**This section exists because the owner asked for it (2026-10-06).** Handover documents must **not**
say what is next to do — what is next changes every session, and a stale "next" is worse than none.
**The one place that carries "what we are doing now" is this section, at the top of the development
log.** Everything else (HANDOVER, START-PROMPT, README, BOOKMARKS, BACKLOG) points here for it.

**The convention — follow it every session:**

1. **At the start of a session**, read this section. It names the task in hand.
2. **While working**, keep this section current — if the task changes mid-session, change this first.
3. **When the task is done**, do three things **in this order**:
   a. **Tick it** — mark it ✅ done in the "Done" list directly below, with the commit hash and one
      line of what proved it.
   b. **Move it down** — it is no longer the active task, so it leaves this box.
   c. **Post the next task** — write the next item (from [`library/development/BACKLOG.md`](library/development/BACKLOG.md),
      in [`library/development/BUILD-ORDER.md`](library/development/BUILD-ORDER.md) order) into the
      box, with the reason it is next.
4. **Tell the owner, in plain English**, what was done and what is now active — never more than one
   question, and only if it genuinely needs him.

---

### ▶ NOW — `D2-gap`: the write routes that call **no** guard. Two modules DONE (`audit_logs`, `ai_assistant`), plus a THIRD finding (a registry-bypass class, not a D2-gap) and a FOURTH (a mis-labelled module — the tool, not the code, was wrong); next is `auth`

> **If you are a new agent, read only this block to know your job.** Everything below the box is the
> history and the queue; this is the work in hand.

**What happened before this box (2026-10-06, this session).** The `D2-wide` sweep of **every enabled
module** is COMPLETE (`feature_toggles`, code `5af76bc`). We have now **measured `D2-gap` across every
enabled module** (`analysis/d2-gap/measure.js`, FINDINGS.md) and **fixed the first module**.

**What `D2-gap` is, in plain words.** The platform checks every write before it happens (who may change
what). `D2-wide` fixed the code that still called an **old, deprecated** version of that check — which
**silently skips the real guard registry**. `D2-gap` is the other half: write routes that call **no
check of any kind at all** — not the new one, not the old one. A write there is guarded by **nothing**,
so it is exactly the surface a Hermes tool call reaches with no authorization describing it (Hermes map
§4.4 (b); `S-02`). **A module can read "0 remaining on `D2-wide`" and still be wide open** — that phrase
means "no deprecated resolver left", never "the module is guarded".

**The measurement (re-runnable, so it cannot rot):** 35 enabled modules · **256 write verbs** ·
**99 unguarded now** (**111 before the `auth` fix**, **122 before the `communication_channels` tool fix**, **143 before the `messages` registry-bypass fix**, **158 before the `ai_assistant` fix**, **160 before the `audit_logs` fix**) · 8 auth-flow verbs set aside · 149 guarded
(77 wrapper · 35 crud · 32 local helper · 5 re-export; 157 = guarded + the 8 auth-flow, stated so the figure cannot be quoted without its meaning; closure 77+0+35+32+5+0+8+99 = 256).
Per module, unguarded: `ai_assistant`
**9 (now FIXED)** · `messages` **0 (FIXED — registry-bypass, see below)** · `communication_channels` **4 (mis-labelled — 11 were already guarded; see Fix 4)** · `auth` **0 (now FIXED — see Fix 5)** · `business_rules` 11 · `inbox_ops` 10 ·
`workflows` **10** · `notifications` 10 · `attachments` 8 · `search` 7 · `webhooks` 7 · `configs`/
`currencies`/`entities` 4 · `integrations` **0 (FIXED — registry-bypass)** · `progress` 3 · `directory` 3 · `dashboards` 2 · `onboarding`/
`data_sync`/`scheduler` 1 · **0** for `dictionaries`, `feature_toggles`, `perspectives`, `planner`,
`query_index`, `translations`, `api_keys` — and **`audit_logs` 0 (now FIXED)**.

**Fix 1 of the sweep — `audit_logs` DONE and PROVEN (code `4ef5812`).** Both write routes
(`audit-logs/actions/undo` POST, `actions/redo` POST) called **no guard at all**. New wrapper
`beginAuditLogsMutationGuard`; both routes now run `runRouteMutationGuards()`. **2 unguarded verbs →
0.** The one design decision: the guard is evaluated against the **log entry's own `resourceKind`**
(fallback `audit_logs.action_log`), because undo/redo **reverse or replay a write to that resource** — a
guard for e.g. `directory.organization` must see the **undo of an organization write**, or the one path
that can **reverse** a protected change is the one path no guard describes. `resourceKind` is read from
the row, never guessed. The routes' own authorization is untouched. **7 new tests; three disjoint
mutations proved they bite** (undo block path → block test RED; undo guard call → the 4 undo-guard tests
RED; redo guard call → redo test RED), wrapper restored byte-identical; `audit_logs` 16 suites / 108
tests green; core `tsc --noEmit` exit 0.

**Fix 2 of the sweep — `ai_assistant` DONE and PROVEN (code `0af50c8`).** The largest `D2-gap`
module (**24 unguarded verbs across 19 files**) and the **Hermes-facing** one. New wrapper
`beginAiAssistantMutationGuard`; the 10 **resource-write** files now run `runRouteMutationGuards()`.
**24 unguarded verbs → 9.** The 24 were **not** all the same thing: **(a)** 15 resource writes → guarded;
**(b)** 7 session/flow verbs set aside by name (`ai/chat`, `ai/run-object`, `route`, `chat`,
`session-key`, `mcp-key`, `tools/execute`) — chat completion, transport and credential minting, governed
by their own mechanisms (rate limits, short-TTL keys, per-tool feature checks); **(c)** 2 pending-action
gate verbs set aside by name (`ai/actions/[id]/confirm`, `ai/actions/[id]/cancel`) — the AI
mutation-approval gate, whose `runPendingActionRechecks()` re-verifies status, expiry, agent
registration, features, **mutation policy**, tool whitelist, tenant scope, record version and schema
drift. **15 + 7 + 2 = 24.** `resourceKind` is shaped `ai_assistant.<entity>` (settings / allowlist /
agent_override / conversation). **As with `audit_logs`, every route's own checks are untouched** —
`metadata.requireFeatures`, the inline ACL check, Zod validation, tenant scoping and ownership. **The
`loop-override` DELETE guard runs only on the path that actually writes** (a no-op clear has nothing to
govern — the `inbox_ops` precedent). **30 new tests; three disjoint mutations proved they bite**
(wrapper `afterSuccess` joint severed → the 4 `afterSuccess` tests RED; wrapper block path neutered →
the 9 block tests RED and nothing else; guard call removed from one route file → that route's 2 PATCH
tests RED, the DELETE test on the same file green), every file restored byte-identical; `ai_assistant`
**99 suites / 1306 tests green** (2 suites fail only on a **pre-existing** `isolated-vm` native-binding
absence on this Windows box, unrelated to the change); app-level `typecheck` exit 0.

**Fix 3 of the sweep — `messages`: a REGISTRY-BYPASS, not a D2-gap. The premise was measured first and
it was FALSE, so 11 files were NOT spent on a fix for a defect that was not there (code `1f1b60e`).**
`messages` was measured as **17 unguarded verbs / 11 files** — the largest `D2-gap` module left — and the
literal fix (the one `audit_logs` and `ai_assistant` took) would have wrapped all 11 files in a second
guard layer. **But every one of the 17 verbs already calls a guard** (`runMessageMutationGuards()`) — so the
`D2-gap` definition (*"call no guard whatsoever … checked by nothing"*) did not describe them; the tool read
them as GAP only because the file references **none of the four symbols** it scans for. **The real defect
was in the helper:** `messages/api/guards.ts` built `runMutationGuards([legacyGuard], …)` — a **one-element
array** — so the global guard store (`getAllMutationGuardInstances()`) was **never consulted**. That is the
**same one-way failure as the deprecated pair** (`D2-wide`), reached through a module-local helper. **Six
more places had the identical line**, found by grepping **every `bridgeLegacyGuard` call site** rather than
the four symbols: `integrations`, `payment_gateways` (parked), `staff`, and inline copies in
`sales/quotes/convert`, `sales/quotes/send` and `configs/api/cache`. **All seven now build the array the way
`collectAndRunGuards()` does** — registry first, then the bridged legacy service. **Latent, not live:** only
`customer_accounts`/`customers`/`entities` register guards, none for these resource kinds, so no write was
reachable by a guard a bypass could skip. **Test:** `modules/__tests__/local-guard-helpers-registry.test.ts`
(cross-module, 16 tests) drives all four helpers through the **real** store with a **real** guard and asserts
it is **called** and can **block**; **proved RED by mutating ONE helper (`staff`)** → exactly that helper's 2
registry-path tests RED, the other 12 green. `messages` **17 → 0**, `integrations` **4 → 0**; total
**143 → 122**. **The tool gained a fifth class `GUARDED_LOCAL`** so the figure stops over-claiming — **and its
header states the limit: it proves a guard CALL, not a *registry* guard.**

**Fix 4 of the sweep — `communication_channels`: NOT a D2-gap either. The label said 15; the artefact said
11 were guarded all along, and the TOOL was the defect, not the code (repo `workspace/starting-kit`
UNCHANGED at `1f1b60e`).** Measured as the **largest remaining module (15 unguarded verbs / 15 files)** —
so the literal fix would have wrapped all 15. **Measuring the premise first showed it false for 11 of
them: 11 of the 15 verbs already call `validateRouteMutationGuard`**, the module's own helper in
`lib/route-mutation-guard.ts`. That helper is **not** the legacy-only shape — it calls
`runRouteMutationGuards` → the **registry** plus the bridged legacy guard. Where `messages`' helper was
**wrong** and needed fixing, this one was already **right**; the only defects were the **label** and the
**tool not knowing the helper's name**. **Two routes agree on the 11/4 split:** (1) the artefact, route by
route — 11 files reference the helper, each with exactly one write verb and one guard call (11/11, 1:1),
the other 4 hold 4 verbs and no call; (2) the tool's own `--json` rows matched against each file. **The
helper is registry-backed — proven by its own test** (`lib/__tests__/route-mutation-guard.test.ts`
registers a real guard and asserts the helper **blocks** on it and fires its `afterSuccess`). **The 4
left are each named and set aside on evidence — none a D2-gap:** `oauth/initiate` (0 DB writes — issues a
redirect + state cookie), `webhook/[provider]` and `webhooks/gmail` (unauthenticated by design — the
**signature / Google-signed JWT IS the auth** — 0 DB writes, they only **enqueue**), and `test-seed`
(does write, but **env-gated off in production**: `isTestChannelSeedingEnabled()` returns 404 **at line
97, before any write**). **The fix was to the TOOL** — `validateRouteMutationGuard` added to
`LOCAL_GUARD_HELPERS` (after proving it reaches the registry). `communication_channels` **15 → 4**;
**total 122 → 111**; guarded **134 → 145**; closure **65+0+35+32+5+0+8+111 = 256**. `communication_channels`
**58 suites / 558 tests green**. **The standing lesson: the D2-gap label is a four-symbol string scan — it
can read a guarded route as GAP; measure the premise the label names before spending files on the fix it
implies, and teach the tool a helper's name only after proving the helper reaches the registry.**

**Fix 5 of the sweep — `auth`: a REAL `D2-gap` (the label was right), but NOT an authorization hole
(the implication was wrong). DONE and PROVEN (code `8e1632c`).** Measured as **12 unguarded verbs across
10 files** — the largest remaining module. Unlike `messages` and `communication_channels`, the label was
**true on its face**: these routes really did call **no guard of any kind**. But the thing a reader would
conclude from that — *"a write there is checked by nothing"* — was **false**, and saying so is part of
the record: **every one of the twelve already enforced its own capability** (`metadata.requireFeatures` —
`auth.delegations.manage`, `auth.denials.manage`, `auth.authority.approve`, `auth.records.lock`,
`auth.trust.promote`, `auth.acl.manage`, `auth.sidebar.manage`) **and wrote its own audit entry**. What
was missing is the **structural guard chokepoint**, not authorization. **No new wrapper was needed —
`auth` already ships `beginAuthMutationGuard()`;** all twelve verbs now call it **after** the route's own
auth/validation gates and **before** the write, with `guard.runAfterSuccess()` after commit. Ten files
touched. **Two routes agree on the count:** the tool's `--json` rows read **12 GAP / 10 files**, and the
module's own `api/mutation-guard.ts` header — written **2026-10-06, before this work** — records
*"12 unguarded resource-writes across 10 files"* with the same six file names; neither derived from the
other. **The security gain is narrow and is stated narrowly:** `auth` ships **no `data/guards.ts`**, so
**no `auth.*` guard exists in the registry today** — the wiring means the **first** one ever written is
**enforced** rather than silently skipped; it does **not** mean these routes were open. **A latent defect
found while wiring, and fixed:** `sidebar/variants` POST ran its guard **inside** the `try/catch` that
turns a unique-constraint violation into a `409 duplicate_name` — so a **blocked** mutation would have
been **re-reported as a duplicate name**. The guard now sits outside that `catch` (the `variants/[id]`
handlers and the five `authority/*` routes have no such trap — checked). **Proof — two disjoint
mutations, not a mock:** `api/__tests__/d2-gap-wiring.route.test.ts`, **29 tests**, registers a **real**
guard in the global store and drives the **real** handlers: mutation 1 (**block**) — the guard refuses
and the **write never happens** (asserted by the service stub's call count, not the response alone);
mutation 2 (**allow**) — the write happens **and** `afterSuccess` fires **exactly once**. All twelve
verbs in both directions. **`auth` 12 → 0** (wrapper class **1 → 13**); **total 111 → 99**; repo wrapper
**65 → 77**; guarded-only **137 → 149**; closure **77+0+35+32+5+0+8+99 = 256**. **`auth` 79 suites / 682
tests green**; core `tsc --noEmit` exit 0. *(A closure scare read 251 — the missing five were
`webhooks`' `GUARDED_REEXPORT` verbs, omitted by the summing script, not a missing guard; the tool's
per-module `fields` carries `reexport` and any closure arithmetic must include it.)*

**What the box carried before this (context).** `D2-wide`'s remaining work is the **parked set** (106
calls / 40 files), *recorded, not migrated* — a parked module's call is not live, so retiring it there
needs no code change until it is un-parked. `D2-gap` is the live defect, and it is what we work now.

**Your job now — work `D2-gap` module by module, largest first.** The measurement names the shape of
each fix: route the unguarded writes through a per-module wrapper, so the module has **one** guard
chokepoint rather than two mechanisms — **but check first whether the module already ships its own
wrapper, as `auth` and `communication_channels` both did.** **Next module: `business_rules` (11
unguarded verbs).** Then
`inbox_ops` (10)
→ `workflows` (10) → `notifications` (10) → the rest. Protocol for each: **measure from the artefact**
(re-run `measure.js` and read the module's own routes); **name the control that actually protects each
route today** (many are protected by other means — record it, do not over-claim); **prove the fix with
two mutations** (block path, then after-success) and restore byte-identical; **update the count in both
repos**; **tell the owner in plain English what was done.** **Added by the `communication_channels`
episode:** before applying a `GAP` label's fix, **check whether the module ships its own guard helper**
— if it does, prove the helper reaches the registry, then teach the tool its name; the label alone has
now twice described a defect that was not there (`messages`, `communication_channels`). **Added by the
`auth` episode:** the label can also be **right on its face and still mislead** — a route can call no
guard and still be capability-guarded and audited; **name what protects the route today before implying
it is unprotected.**

**A trap that has now bitten three migrations — carry it forward:** not every write handler is a
`route.ts`. `translations/put/locales.ts`, `planner/*` and `query_index/{reindex,purge}.ts` all export
**named** verbs. **Walk every `.ts` under `api/`, never glob for `route.ts`** — a name-scan reports a
module clean while leaving live write routes unguarded.


**Then, in order (nothing dropped):**

| # | The item | Why here |
|---|---|---|
| **1** | ✅ **The owner's three directives — DONE** | Directive 1's map was later found **incomplete**; completed in Part I §4.4 + Part II. |
| **2** | ✅ **D2-wide: `dashboards` — DONE** (code `a05ea2c`) | 10 calls / 4 files → 5 guard objects; count 161 → 151; mutation-proven twice. |
| **3** | ✅ **Directive 1 completed** (docs `807ab40`, `365c4e4`) | Map §4.4 covers **every** AI-touching item; Part II works the three joints in depth. |
| **4** | ✅ **Test defect (a): `explicit-sort-comparators` — DONE** (code `d5567c7`) | **16 sites, not 2** — read from the test's own output. Audit 4/4; 336 tests green. |
| **5** | ✅ **Test defect (b): `module-decoupling` — DONE** (code `fe7c3e5`) | File-scoped isolation; **full suite 602 suites / 5123 tests, 0 failures**. |
| **6** | ✅ **D2-wide: `workflows` — DONE** (code `d3af1b1`) | 9 calls / 3 files → 4 guard objects; count 151 → 142; mutation-proven (5 RED / 3 RED). |
| **7** | ✅ **D2-wide: `inbox_ops` — DONE** (code `d89b8f6`) | 8 calls / 4 files → 4 guard objects; count 142 → 134; mutation-proven (4 RED / 4 RED). |
| **7b** | ✅ **The owner's two integration concerns — DONE** | The Hermes map named **43** items and the backlog named the map **0** times; the register/blueprint items had **0** per-item backlog rows. **Both measured true and fixed** — `★ Hermes:` lines on every AI-touching item, a new "core-module gaps" section, rule 6 in WORKING-RULES, and a re-measurable check in `BACKLOG.md` §A. **No code changed.** |
| **8** | ✅ **D2-wide: `perspectives` — DONE** (code `e26642c`) | 8 calls / 3 files → 4 guard objects; count **134 → 126** (files 52 → 49); mutation-proven (**2 RED / 5 RED**). **The new shape:** the POST route guards **two resources in one request** (personal + role-scoped), each with its own after-success condition. **The first module with NO `D2-gap`** — all 3 write routes guarded. |
| **9** | ✅ **D2-wide: `translations` — DONE** (code `a2f8d5f`) | 6 calls / 2 files → **2 guard objects** (the plan's "4" was wrong: one guard per route). Count **126 → 120** (files **47**, not 49). **Found: `put/locales.ts` is not a `route.ts`** — a file-name scan misses it. **First real use of the id re-binding** on after-success. Mutation-proven (**3 RED / 3 RED**). |
| **10** | ✅ **D2-wide: `planner` — DONE** (code `641d3af`) | 4 calls / 2 files → **2 guard objects** (the plan's figure held on re-measurement — the first module where it did). Count **120 → 116** (files **47 → 45**). **Found: neither handler is a `route.ts`** (both are named `POST` exports) — a file-name scan misses both. Handled the `shouldRunAfterSuccess` gate without re-implementing it (the registry already applies it). **No `D2-gap`** — all 5 write verbs guarded. Mutation-proven (**2 RED / 2 RED** — every test covered). |
| **11** | ✅ **D2-wide: `query_index` — DONE** (code `cc5a237`) | 4 calls / 2 files → **2 guard objects** (the plan's figure held again). Count **116 → 112** (files **45 → 43**). **Neither handler is a `route.ts`** (`reindex.ts`, `purge.ts` — named `POST` exports); the test mocked the **deprecated DI service**, re-pointed to stub only `runRouteMutationGuards`. **Proof went past the wrapper:** each route mutated in turn → each reddened only its own test. **No `D2-gap`** — both write verbs guarded. Mutation-proven (**2 RED / 2 RED**, disjoint). |
| **11a** | ✅ **D2-wide: `auth` — DONE** (code `aeeaad0`) | 2 calls / 1 file → **1 guard object**; count **112 → 110** (files **43 → 42** — *the docs first said 45 → 44; corrected this session, see the file-count note below*). **The plan's figure held.** **The module is far bigger than its 2 calls suggest:** 18 files export a write verb, **only 3 are guarded** — **12 unguarded resource-writes across 10 files** is the **worst `D2-gap` measured**, recorded not fixed. **A wrong `D2-gap` claim in the header's first draft was caught and corrected against the walk** (`users/route.ts` **is** guarded via `makeCrudRoute`; `authority/projects/route.ts` is **GET only**). Mutation-proven (**2 RED / 1 RED**, plus route-file mutations 2 RED / 1 RED). |
| **11b** | ✅ **D2-wide: `directory` — DONE** (code `d682c09`) | 2 calls / 1 file → **1 guard object**; count **110 → 108** (files **42 → 41**). **The plan's figure held.** **Almost no `D2-gap`:** the module's entire gap is **3 unguarded verbs in 1 file** (`organization-edges` POST/PATCH/DELETE) against `auth`'s 12 — and all three are protected by other controls (`requireFeatures`, a verified-tenant `resolveScope`, `assertOrganizationsInTenant()`, audit rows, the OSS optimistic-lock floor). **Two traps caught by running tests, not reading:** a `*/` inside a block comment closed the JSDoc early; and a comment **naming** `enforceCommandOptimisticLock(` failed a code guard that regexes raw text (L91). Mutation-proven (**2 RED / 1 RED**, plus route-file mutations 2 RED / 1 RED). |
| **11c** | ✅ **D2-wide: `feature_toggles` — DONE** (code `5af76bc`) | 2 calls / 1 file → **1 guard object**; count **108 → 106** (files **41 → 40**). **The plan's figure held.** **The LAST ENABLED MODULE — the sweep is complete.** **No `D2-gap`:** `overrides` PUT → this wrapper; `global` POST/PUT/DELETE → `makeCrudRoute` → `collectAndRunGuards()`; `check/*` is read-only (checked). **First wrapper in the sweep to carry `runAfterSuccess(idOverride)` into a route whose validated id can differ from the written id** (the override may be *created*, returning a generated `overrideToggleId`) — the `translations`/`dashboards` shape, proven with 2 registry calls on the rebind. Mutation-proven (**2 RED / 2 RED**, disjoint; plus route-file mutations 2 RED / 2 RED). |
| **12** | **D2-gap** — the write routes that call **no** guard at all. **MEASURED across every enabled module 2026-10-06** (`analysis/d2-gap/measure.js`): 256 write verbs, **99 unguarded now** (111 before the `auth` fix, 122 before the `communication_channels` tool fix, 143 before the `messages` registry-bypass fix, 158 before `ai_assistant`, 160 before the `audit_logs` fix). Per module: `ai_assistant` **9** (after the fix), `messages` **0** (fixed — registry-bypass, see 12c), `integrations` **0** (fixed — same), `communication_channels` **4** (mis-labelled — 11 were already guarded; see 12d), `auth` **0** (fixed — see 12e), `business_rules` 11, `inbox_ops` 10, `workflows` **10** *(record said 13 — the record was wrong; `tasks/route.ts` and `events` export no write verb)*, `notifications` 10, `attachments` 8, `search` 7, `webhooks` 7, then 4/4/4/4, 3/3, 2, 1/1/1, and **0** for `dictionaries`, `feature_toggles`, `perspectives`, `planner`, `query_index`, `translations`, `api_keys`, **`audit_logs`**. | **The recommended task — now in progress.** Do it module by module, largest first; record the per-module unguarded count next to the D2-wide count. |
| **12a** | ✅ **D2-gap: `audit_logs` — DONE** (code `4ef5812`) | **The FIRST `D2-gap` module.** Both write routes (`undo` POST, `redo` POST) called **no guard at all**; 2 unguarded verbs → 0. New `beginAuditLogsMutationGuard`. **The design decision:** guard against the **log entry's own `resourceKind`** (fallback `audit_logs.action_log`) — undo/redo reverse or replay a write *to that resource*, so a guard for `directory.organization` must see the undo of an organization write, or the one path that can reverse a protected change is the one path no guard describes. Redo guard runs **after** `resolveRedoInput` (policy not evaluated for a request that will 400). 7 new tests; **3 disjoint mutations** proved they bite; wrapper byte-identical; 16 suites / 108 tests green. |
| **12b** | ✅ **D2-gap: `ai_assistant` — DONE** (code `0af50c8`) | **The SECOND and largest `D2-gap` module — 24 unguarded verbs across 19 files.** New `beginAiAssistantMutationGuard`; the 10 resource-write files now run the registry. **24 → 9.** The 24 split three ways: **15 resource writes guarded**; **7 session/flow set aside by name** (`ai/chat`, `ai/run-object`, `route`, `chat`, `session-key`, `mcp-key`, `tools/execute`); **2 pending-action gate set aside by name** (`confirm`, `cancel` — the AI mutation-approval gate, `runPendingActionRechecks()`). `resourceKind` = `ai_assistant.<entity>`. The `loop-override` DELETE guards only the path that writes (no-op clear has nothing to govern). **30 new tests; 3 disjoint mutations** proved they bite; every file byte-identical; **99 suites / 1306 tests green**; app `typecheck` exit 0. |
| **12c** | ✅ **`messages` — REGISTRY-BYPASS, not a D2-gap — DONE** (code `1f1b60e`) | Measured as **17 unguarded verbs / 11 files**, the largest `D2-gap` left — but the premise was **FALSE**: all 17 already call `runMessageMutationGuards()`. **The real defect was in the helper** — it built `runMutationGuards([legacyGuard])`, a one-element array, **skipping the global registry** (the `D2-wide` shape, reached locally). **Six more places had the identical line**: `integrations`, `payment_gateways` (parked), `staff`, and inline copies in `sales/quotes/convert`, `sales/quotes/send`, `configs/api/cache`. **All seven fixed** — registry first, then the bridged legacy service. **Latent, not live** (only 3 modules register guards, none for these kinds). **16-test cross-module suite; proved RED by mutating ONE helper** (`staff`) → only its 2 tests red. `messages` **17 → 0**, `integrations` **4 → 0**; total **143 → 122**. Tool gained class **`GUARDED_LOCAL`**; **its header states the limit** (proves a guard *call*, not a *registry* guard). **605 suites / 5159 tests green**; core `tsc` exit 0. **Next: `communication_channels` (15).** |
| **12d** | ✅ **`communication_channels` — NOT a D2-gap; the TOOL was the defect, not the code — DONE** (tool only; repo unchanged at `1f1b60e`) | Measured as **15 unguarded verbs / 15 files**, the largest remaining — but **11 of the 15 already call `validateRouteMutationGuard`**, the module's own helper, which reaches the **registry** (`runRouteMutationGuards` → `getAllMutationGuardInstances()`). The literal fix would have wrapped 11 files needlessly. **Two routes agree on 11/4:** the artefact (11 files, each 1 verb + 1 guard call) and the tool's `--json` rows. **The helper is registry-backed — proven by its own test** (registers a real guard, asserts block + afterSuccess). **The 4 left, each set aside on evidence:** `oauth/initiate` (0 writes), `webhook/[provider]` + `webhooks/gmail` (unauthenticated by design — signature/JWT IS the auth — 0 writes, enqueue only), `test-seed` (writes, but env-gated off in prod — 404 **before** any write). **Fix = teach the tool the helper's name**; `communication_channels` **15 → 4**; total **122 → 111**; guarded **134 → 145**; **58 suites / 558 tests green**. **Standing lesson: the label is a four-symbol string scan — measure the premise before applying the fix it implies.** **Next: `auth` (12).** |
| **12e** | ✅ **`auth` — a REAL D2-gap (label right), but NOT an authorization hole (implication wrong) — DONE** (code `8e1632c`) | Measured **12 unguarded verbs / 10 files**, the largest remaining — and the label was **true**: these routes called **no guard of any kind**. But **every one already enforced its own capability** (`metadata.requireFeatures`) **and wrote its own audit entry**, so *"checked by nothing"* was false. **No new wrapper needed — `auth` already ships `beginAuthMutationGuard()`;** all 12 verbs now call it before the write, `runAfterSuccess()` after commit. **Two routes agree on 12/10:** the tool's `--json` rows, and the module's own header written **before** this work. **Narrow gain, stated narrowly:** `auth` ships **no `data/guards.ts`**, so no `auth.*` guard exists today — what changed is that the **first** one will be enforced, not skipped. **Latent defect found and fixed:** `sidebar/variants` POST ran its guard **inside** the 409-duplicate-name `catch`, so a **blocked** mutation could have been re-reported as a duplicate name. **Proof:** 29 tests, a **real** registered guard driving the **real** handlers — block (write never happens, by call count) and allow (`afterSuccess` fires once), all 12 verbs both ways. `auth` **12 → 0**; total **111 → 99**; wrapper **65 → 77**; guarded **137 → 149**; closure **77+0+35+32+5+0+8+99 = 256**; **79 suites / 682 tests green**; `tsc` exit 0. **Next: `business_rules` (11).** |
| **13** | **D3** — add the `escalate` outcome to `MutationGuardResult` | The last guard-engine gap; D2-wide's shape is now settled, so it is unblocked. |
| **14** | **The Metadata Registry** service (GAP A / C5) | The remaining foundation item; everything stacked on it inherits it. |

**Where the reasoning lives:** the order is `BUILD-ORDER.md` §2e; the live counts are in `BACKLOG.md`;
the per-item status is in `BACKLOG.md`. **This box is the only place that says "we are doing X now."**

**The story behind the chain** (kept for context, not needed to start the task):

1. **Document how Hermes serves / is served, per development item** — including the Llama
   integration, the multi-tenant-vs-one-tenant challenge, multi-agents, integrations and MCP.
   Written for a new developer, with no learning curve. → built as
   [`library/development/ARCHITECTURE-hermes-service-map.md`](library/development/ARCHITECTURE-hermes-service-map.md).
2. **Restructure the handover docs** so they do not carry "what is next", and put the live task in
   **this** section. → done for `START-PROMPT.md`, `HANDOVER.md`, `README.md`, `BOOKMARKS.md`.
3. **A new standing rule:** *whatever is ready to be interfaced in the front end, do it — once it
   can be fully functional as a piece, even if unfinished parts are locked or switched off.*
   Updating the front end lets the owner test the micros as work proceeds. → recorded in
   [`WORKING-RULES.md`](library/development/WORKING-RULES.md) and the COOKBOOK.

**All three are done.** The table above is the queue that followed them; the row marked
**◀ THE ACTIVE TASK** is the work in hand. The milestones reached on the way: `dashboards`, `workflows`,
`inbox_ops`, `perspectives`, `translations`, `planner`, `query_index`, `auth`, `directory` and `feature_toggles`
migrated to the registry (`a05ea2c`, `d3af1b1`, `d89b8f6`,
`e26642c`, `a2f8d5f`, `641d3af`, `cc5a237`, `aeeaad0`, `d682c09`, `5af76bc`) — **every enabled module**; directive 1's map completed to cover every
item and to work the three joints in depth (`807ab40`, `365c4e4`); the two test-suite defects fixed so
the suite is green (`d5567c7`, `fe7c3e5`); the two integration concerns fixed in the docs (this session,
docs `c0b26d2`); the D2-wide **file count corrected** against the commits (this session) and **L91**
recorded.

**Where the reasoning lives:** the order is `BUILD-ORDER.md` §2e; the live counts are in
`BACKLOG.md`; the per-item status is in `BACKLOG.md`. **This box is the only place that says "we are
doing X now."**

---

### ✅ Done recently (ticked, then moved down here)

- **2026-10-06 — `D2-gap` MEASURED across every enabled module, and the FIRST module fixed** (code
  `4ef5812`; analysis `analysis/d2-gap/`). The sweep: 35 enabled modules · **256 write verbs** ·
  **158 unguarded now / 160 before the fix** · 8 auth-flow verbs set aside · 90 guarded
  (50 wrapper · 35 crud · 5 re-export). Per module: `ai_assistant` **24**,
  `messages` 17, `communication_channels` 15, `auth` 12, `business_rules` 11, `inbox_ops` 10,
  `workflows` **10**, `notifications` 10, `attachments` 8, `search` 7, `webhooks` 7, then 4/4/4/4, 3/3,
  2, 1/1/1, and 0 for seven modules. **8 of 9 previously-recorded modules agree exactly; the ninth
  record was wrong** — `workflows` was recorded "13 of 19", measures **10**, because two counted files
  (`tasks/route.ts`, `events`) export **no write verb** (checked twice: today's file and `git show
  d3af1b1:…`). **Two unit errors in my own first pass, both fixed in the tool and both found by
  comparison, not by re-running:** files counted where the backlog counts **verbs**
  (`organization-edges` = 1 file / 3 verbs), and a guarded CRUD re-export misread as unguarded
  (`export const POST = crud.POST`, in `auth`). **`audit_logs` FIXED and PROVEN:** both write routes
  (`undo`, `redo`) called no guard at all → 2 unguarded verbs → 0, via a new `beginAuditLogsMutationGuard`;
  guarded against the **log entry's own `resourceKind`** (fallback `audit_logs.action_log`) so the path
  that *reverses* a protected write is described by a guard; 7 new tests, **3 disjoint mutations** proved
  they bite, wrapper restored byte-identical; 16 suites / 108 tests green; core `tsc --noEmit` exit 0.
  Full detail: `analysis/d2-gap/FINDINGS.md`, `BUILD-ORDER.md` §2f, `BACKLOG.md` item **D2-gap**.
- **2026-10-06 — `feature_toggles` D2-wide migration** (code `5af76bc`). 2 calls / 1 file → **1 guard
  object**; count **108 → 106** (files **41 → 40**); `feature_toggles` measures 0. **Thirteenth and LAST
  enabled module — the D2-wide sweep of enabled modules is complete.** **The plan's figure held.** **No
  `D2-gap`:** walked every write verb and named its guard — `overrides` PUT → the new wrapper; `global`
  POST/PUT/DELETE → **`makeCrudRoute` → `collectAndRunGuards()`**; the four `check/*` routes (boolean, json,
  number, string) are **read-only** (checked, not assumed). **The shape that is new here:** the PUT
  validates the guard set against `existingOverride?.id ?? parsed.data.toggleId`, but the command may
  **create** a row whose generated `overrideToggleId` differs — so the wrapper's `runAfterSuccess(idOverride)`
  re-collects the guard set for the produced id and runs that (safe: `validate` is a pure predicate). The
  test proves the rebind by asserting the registry is called **twice** (validated id, then produced id).
  **A naming trap already recorded applies here too:** the route also calls
  `enforceCommandOptimisticLockWithGuards`, whose `...WithGuards` suffix means the *command optimistic-lock*
  guard service — **not** mutation guards; a `grep -i guard` shows the file "guarded" when only this wrapper
  is the mutation guard. **Tests:** 1 suite repaired (`api/overrides/__tests__/mutation-guard.test.ts`) — it
  stubbed the **DI `crudMutationGuardService`**, now stubbed to **only** the registry call
  `runRouteMutationGuards`, wrapper running for real; **5 tests green**. **Mutations bit:** block path
  disabled → **2 RED**; `runAfterSuccess` neutered → **2 RED** (a **disjoint** set); wrapper restored
  md5-identical `7b5514c22a8d4a78962e663725c6df24`. **Critic pass mutated the ROUTE file:** block return
  removed → **2 RED**; after-success call removed → **2 RED**; all files restored **byte-identical**.
  `feature_toggles` module **14 suites / 84 tests green**; core `tsc --noEmit` exit 0. **Counts re-measured
  two independent ways:** repo-wide **108 → 106**, files **41 → 40**; both `grep` and `git grep` agree, and
  the delta (−2 sites / −1 file) equals exactly this module's calls. Full entry below.
- **2026-10-06 — `directory` D2-wide migration** (code `d682c09`). 2 calls / 1 file → **1 guard object**;
  count **110 → 108** (files **42 → 41**); `directory` measures 0. Twelfth enabled module. **Almost no
  `D2-gap`** — the module's entire gap is **3 unguarded verbs in 1 file** (`organization-edges`
  POST/PATCH/DELETE), against `auth`'s 12, and all three are protected by other controls that are now
  named: `requireFeatures: ['directory.organizations.manage']`, a verified-tenant `resolveScope()`,
  `assertOrganizationsInTenant()` ("the tenant boundary for this table"), audit rows, and the OSS
  optimistic-lock floor. **A naming trap recorded:** `enforceCommandOptimisticLockWithGuards` does **not**
  run mutation guards — its `...WithGuards` suffix means the *command optimistic-lock* guard service, so a
  `grep -i guard` shows the file as "guarded" when it is not mutation-guarded. **Two traps caught by
  running tests, not by reading:** **(1)** the wrapper header contained the literal `` `get/*/lookup.ts` ``
  — the `*/` inside the glob **closed the JSDoc early** and the file would not parse; **(2)** the header
  *named* `enforceCommandOptimisticLock(` in prose, and `optimistic-lock-command-coverage.test.ts` regexes
  **raw file text** without stripping comments — so the wrapper was reported as a bypassing direct call
  site and the full suite went **1 test RED**, from a **comment**, in a file that calls neither helper. The
  first rewrite quoted the regex and **contained the call syntax again**, reproducing the failure. Fixed by
  naming both helpers without parentheses; recorded as **L91**. **A full-suite run caught this** — a
  targeted module run would not have. **Counts re-measured two independent ways, and the FILE COUNT WAS
  CORRECTED** (see below).
- **2026-10-06 — the D2-wide FILE COUNT was wrong in the docs, and was corrected** (docs, this session).
  `auth` was recorded as files **45 → 44** and `query_index`/`planner` as ending at **43**/**45**.
  Re-measured at **every commit** (`git grep <commit>`), the true chain is
  **78 → 77 → 69 → 63 → 59 → 56 → 52 → 49 → 47 → 45 → 43 → 42 → 41**: every per-module **delta** was
  right, but the `auth` row re-used `query_index`'s *before* value (45) as its *after* value, and the error
  propagated into `BUILD-ORDER.md`, `HANDOVER.md` and this file. **The site counts were always right**
  (200 → 108, verified at every commit). **No filter ever produced 44** — it was arithmetic drift, not a
  measurement. **The rule: derive the chain from the commits, never carry a number forward.**
  **A second count trap was caught and recorded this session (L92):** re-deriving the "before" figure with
  `git grep <rev>` and the *working-tree* classifier gave `139 sites / 1 file` instead of `108 / 41` — because
  `git grep <rev>` prints a **fourth** field (the revision) and `split(':', 2)` collapsed every match into one
  pseudo-file. It failed *toward a plausible number* and nearly rewrote six documents. Fixed with a prefix-aware
  `split(':', 3)`; the corrected probe confirmed **108 → 106, 41 → 40**, delta exactly the module.
- **2026-10-06 — `directory` D2-wide migration** (code `d682c09`). 2 calls / 1 file → **1 guard object**;
  count **110 → 108** (files **42 → 41**); `directory` measures 0. Twelfth enabled module — **and the
  cleanest so far on `D2-gap`.** Walked every write verb and named its guard: `organization-branding` PUT
  → the new wrapper; `organizations` and `tenants` POST/PUT/DELETE → **`makeCrudRoute` →
  `collectAndRunGuards()`** (the registry, `factory.ts:615-618`); `organization-switcher` is **GET only**
  (checked). **The entire gap is 3 unguarded verbs in 1 file** (`organization-edges` POST/PATCH/DELETE) —
  against `auth`'s 12 — and all three are protected by other controls: `requireFeatures:
  ['directory.organizations.manage']`, a verified-tenant `resolveScope()` (401), `assertOrganizationsInTenant()`
  ("the tenant boundary for this table" — both endpoint orgs must be in the caller's tenant), a self-edge
  and tree-inversion refusal, a `writeDirectWriteAuditLog()` row per verb, and the OSS optimistic-lock
  floor on PATCH. **A naming trap recorded:** `enforceCommandOptimisticLockWithGuards` does **not** run
  mutation guards — its `...WithGuards` suffix means the *command optimistic-lock* guard service; a
  `grep -i guard` shows the file as "guarded" when it is not mutation-guarded. **Tests:** 1 suite repaired
  (`organization-branding/__tests__/route.test.ts`) — it stubbed the **DI `crudMutationGuardService`**,
  now stubbed to **only** the registry call `runRouteMutationGuards`, wrapper running for real; **13 tests
  green** including three guard-shaped (the registry call's shape; deny → 423, no flush; "does NOT run
  after-success when blocked"). **Mutations bit:** block path disabled → **2 RED**; `runAfterSuccess`
  neutered → **1 RED**; wrapper restored md5-identical `9427d68151ecff5823587b65dd937f8e`. **Critic pass
  mutated the ROUTE file:** block return removed → **2 RED**; after-success call removed → **1 RED**; all
  files restored byte-identical. **Two traps, both caught by running tests:** **(1)** a `*/` inside the
  header's literal `` `get/*/lookup.ts` `` **closed the JSDoc early** and the file would not parse;
  **(2)** the header *named* `enforceCommandOptimisticLock(` in prose, and
  `optimistic-lock-command-coverage.test.ts` regexes **raw file text** without stripping comments — so the
  wrapper was reported as a bypassing direct call site and the **full suite went 1 test RED**, from a
  comment, in a file that calls neither helper. The first rewrite quoted the regex and **contained the call
  syntax again**, reproducing it. Fixed by dropping the parentheses; recorded as **L91**. **A targeted
  module run would have missed (2) entirely** — the guard lives in `src/__tests__/`. `directory` module
  **27 suites / 194 tests green**; **whole core suite 603 suites / 5136 tests green**; core `tsc --noEmit`
  exit 0. Full entry below.

- **2026-10-06 — `auth` D2-wide migration** (code `aeeaad0`). 2 calls / 1 file → **1 guard object**;
  count **112 → 110** (files **43 → 42**; the docs first said `45 → 44` — corrected, see above);
  `auth` measures 0. Eleventh enabled module. **The real finding
  is not the 2 calls — it is what sits under them.** `auth` has **18 files exporting a write verb**, and
  **only 3 are guarded** (`users/resend-invite` → this wrapper; `users/route.ts` and `roles/route.ts` →
  `makeCrudRoute` → `collectAndRunGuards()`). **12 resource-write verbs across 10 files call no guard at
  all** — `users/acl` (PUT), `roles/acl` (PUT), `sidebar/preferences` (PUT, DELETE), `sidebar/variants`
  (POST), `sidebar/variants/[id]` (PUT, DELETE), and five `authority/*` routes (POST each). That is
  **`D2-gap`, the worst measured**, recorded in the wrapper header + BACKLOG item **`D2-gap`**, **not**
  fixed here. **A wrong claim was caught before it shipped:** the header's first draft named a
  **different, wrong** `D2-gap` set from memory (listed `users/route.ts` as unguarded; counted
  `authority/projects` and `sidebar/variants` wrongly) — corrected against the walk. `users/route.ts`
  **is** guarded, and **`authority/projects/route.ts` exports GET only** (5 authority write routes, not
  6). **Auth-flow endpoints were set aside, not counted:** `login`, `logout`, `reset`,
  `reset/confirm`, `session/refresh`, `profile`, `locale`, `feature-check` call no mutation guard either
  but change session/credential state and are guarded by their own mechanisms. **One caution stated
  because it is load-bearing:** the mutation guard is **not** what protects this route — that is
  `assertActorCanAccessUserTarget()` (`lib/grantChecks.ts:130`), before the guard. **Tests:** 1 suite
  repaired (`resend-invite.route.test.ts`) — it mocked the **deprecated pair**, now stubbed to **only**
  the registry call `runRouteMutationGuards`, wrapper running for real; **15 tests green** including two
  new (the registry call's shape, with `organizationId` asserted as the **target user's** org; and "does
  NOT run after-success when the guard blocks"). **Mutations bit:** block path disabled → **2 RED**;
  `runAfterSuccess` neutered → **1 RED**; wrapper restored md5-identical
  `bfdd5a9b340bdfbc805e62c3db806315`. **Critic pass mutated the ROUTE file:** block return removed →
  **2 RED**; after-success call removed → **1 RED**; all files restored byte-identical. `auth` module
  **78 suites / 653 tests green**; **whole core suite 603 suites / 5135 tests green**; core
  `tsc --noEmit` exit 0. Full entry below.

- **2026-10-06 — `query_index` D2-wide migration** (code `cc5a237`). 4 calls / 2 files → **2 guard objects**;
  count **116 → 112** (files **45 → 43** — this pair was correct; only the *next* module's row drifted, see
  the file-count correction above); `query_index` measures 0. Tenth enabled module. **Neither handler
  is a `route.ts`** — `reindex.ts` and `purge.ts` both export a **named** `POST` with
  `metadata = { POST: { requireAuth: true, requireFeatures: [...] } }`, so a `route.ts`-only glob finds
  neither file; found by walking every `.ts` under `api/`. **The test mocked the deprecated DI service**
  (`crudMutationGuardService.validateMutation` / `afterMutationSuccess`) — the wrong target now, and the
  exact shape that makes a mutation invisible; re-pointed to stub **only** the registry call
  `runRouteMutationGuards`, wrapper running for real. Its 6 tests assert the registry call's
  `{ container, req, auth, input }` shape, both deny paths, both allow paths, and the call ORDER
  (guard < emit < after-success) the original suite asserted. **Mutations bit:** block path disabled →
  **2 RED** (both deny-path tests); `runAfterSuccess` neutered → **2 RED** (both allow-path tests) —
  disjoint, 2+2 of 6; the two "queues without inline delivery" tests assert neither path and correctly
  stay green. Wrapper restored md5-identical `b9f437fe0d7bac77bdc5125414582c9e`. **A critic pass went
  further and mutated the ROUTE files, not the wrapper, one at a time:** removing `if (guard.blockedResponse)
  return …` from `reindex.ts` → the reindex deny test **RED** (purge stayed green); removing
  `await guard.runAfterSuccess()` from `purge.ts` → the purge allow test **RED** (reindex stayed green).
  All three files restored byte-identical. `query_index` module **21 suites / 125 tests green**; **whole
  core suite 603 suites / 5133 tests green**; core `tsc --noEmit` exit 0. **Scope:** exactly **2 write
  verbs and both are guarded → no `D2-gap`** (like `perspectives`, `translations`, `planner`). Full entry
  below.
- **2026-10-06 — `planner` D2-wide migration** (code `641d3af`). 4 calls / 2 files → **2 guard objects**; count
  **120 → 116** (files **47 → 45**); `planner` measures 0. Ninth enabled module. **The plan's figure held
  for the first time** — 4 calls / 2 files → 2 objects, re-derived by walking every `.ts` under `api/`
  rather than inherited; L87 asks for re-derivation, not for the number to be wrong. **Both handlers are
  named `POST` exports, not `route.ts`** — the same trap `translations` hit, and a `route.ts`-only glob
  finds neither file. **Two behaviour points settled by reading, not assuming:** the guard input's
  `requestMethod`/`requestHeaders` are derived by the registry from `req` (equivalent), and the hand-rolled
  `shouldRunAfterSuccess` gate is **already applied inside the registry** (`mutation-guard-registry.ts:117`),
  so calling `runAfterSuccess()` unconditionally is a no-op. **Scope: no `D2-gap`** — all 5 write verbs
  guarded; the 3 factory verbs already run the registry via `collectAndRunGuards()`. Mutations bit:
  block path disabled → **2 RED**; `runAfterSuccess` neutered → **2 RED** (2+2 of 4, every test covered);
  wrapper restored md5-identical `2bc9646e2ae83399011a8f5dd94f96f6`. `planner` module 13 suites / 53 tests
  green; **whole core suite 603 suites / 5133 tests green**; core `tsc --noEmit` exit 0. Full entry below.

- **2026-10-06 — `translations` D2-wide migration** (code `a2f8d5f`). 6 calls / 2 files → **2 guard
  objects**; count **126 → 120**; `translations` measures 0. Eighth enabled module. **Three things made it
  different from the seven before it.** (1) **The plan's "4 guard objects" was wrong** — it counted each
  route *file* as contributing a guard per exported verb, but the routes collect **one guard each**, and
  `put/locales` and `[entityType]/[entityId]` are two different routes: it is **2**, and the count drops
  **6**. (2) **`put/locales.ts` is not a `route.ts`** — it exports a default handler with
  `metadata.path = /translations/locales`, so a scan globbing only for `route.ts` skips it silently and
  would report the module clean while leaving it on the deprecated resolver. Found by walking every `.ts`
  under `api/`. (3) **The first module where the id changes between the guard and the after-success**, so
  the first real use of `runAfterSuccess(resourceIdOverride)`: the old code passed the composite
  `${entityType}:${entityId}` to the after-success instead of the row id the write produced; the wrapper
  now re-binds to `result.rowId` (both branches tested). Mutations bit: block path disabled → **3 RED**;
  `runAfterSuccess` neutered → **3 RED**; wrapper restored md5-identical
  `cab5084e343f9f7a076e0ae8427ccc52`. `translations` module 16 suites / 215 tests green; **whole core suite
  603 suites / 5133 tests green**; core `tsc --noEmit` exit 0. **Scope: no `D2-gap`** — all 3 write verbs
  guarded. Full entry below.
- **2026-10-06 — `perspectives` D2-wide migration** (code `e26642c`). 8 calls / 3 files → 4 guard objects;
  count **134 → 126** (files **52 → 49**); `perspectives` measures 0. Seventh enabled module. **Two things
  made it different from the six before it.** (1) **The POST route guards two resources in one request** —
  a personal perspective and, when the payload carries role ops, a role perspective with
  `resourceId = targetRoleIds.join(',')`; each is a separate guard object evaluated independently, each
  keeping its own after-success condition (personal unconditional, matching the old always-true
  `shouldRunAfterSuccess`; role only when `applyToRoles.length > 0 || clearedRolePerspectiveCount > 0`).
  The `hasRoleOps`/`targetRoleIds`/`applyToRoles`/`clearRoleIds` definitions were verified **byte-identical
  to HEAD** so nothing shifted silently. (2) **It is the first module with NO `D2-gap`** — all **3** write
  routes are guarded; the only unguarded route is `GET` on `[tableId]`, which reads. Mutations bit:
  block path disabled → **2 RED** (both deny-path tests); `runAfterSuccess` neutered → **5 RED** (every
  allow-path test plus the clear-only no-op that counts one call); wrapper restored md5-identical
  `acbd7125327bfdb0a79c12f2028b3888`. `perspectives` module 7 suites / 44 tests green; core and shared
  `tsc --noEmit` exit 0. Full entry below.
- **2026-10-06 — `inbox_ops` D2-wide migration** (code `d89b8f6`). 8 calls / 4 files → 4 guard objects;
  count **142 → 134**; `inbox_ops` measures 0. Sixth enabled module. Straightforward because the module
  already had a dedicated guard suite — it just mocked the **old** module, so it was repointed to stub
  **only** the registry call `runRouteMutationGuards` and let the wrapper run for real. Mutations bit
  cleanly: block path disabled → **4 RED**; `runAfterSuccess` neutered → **4 RED**; wrapper restored
  md5-identical `9490fbfc2b3515ef67a7131b941342d2`. `inbox_ops` api 15 suites / 107 tests green; whole
  module 35 suites / 395 tests green; core `tsc --noEmit` exit 0. **Scope recorded in the wrapper
  header:** 4 of the module's 14 write routes are guarded; **10 call no guard at all** (`D2-gap`). Full entry below.
- **2026-10-06 — `workflows` D2-wide migration** (code `d3af1b1`). 9 calls / 3 files → 4 guard objects;
  count **151 → 142**; workflows measures 0. Fourth enabled module. **The proof's first attempt was
  wrong and is recorded:** the tests mocked the *module wrapper*, so both mutations left the suite green
  — the mutation never ran. Fixed by stubbing only the registry call `runRouteMutationGuards` and adding
  a dedicated suite; the mutations then bit (block path disabled → **5 RED**; `runAfterSuccess` neutered
  → **3 RED**; wrapper restored md5-identical `b969e361b9c727e61f3365f0f9cae1b0`). **Note:** that md5 is
  the state *the mutation proof ended in*. A later **comment-only** scope edit (see the hostile-pass
  correction below) changed the file to `bc030d318c0baeb23d875727d65ee9dc` — the fix hash is not the
  hash you will see in the tree now; the difference is header prose, not logic, and the suites were
  re-run green after it). Whole `workflows` module 45 suites / 650 tests green; core `tsc --noEmit` exit 0. Full entry below.
- **2026-10-06 — directive 1 deepened: Part II of the Hermes service map** (docs `365c4e4`). The owner
  asked for a plan a junior developer can execute flawlessly; Part II works the three real joints in
  depth — agent identity (`AH-1`), the tool door + authorization (`S-02`/`AH-8`), and "Hermes learns as
  you go" (`AH-9`) — plus the D2-wide walkthrough, every path read from source. Full entry below.
- **2026-10-06 — directive 1 completed: the Hermes service map now covers *every* item** (docs below).
  Added §4.4 to `ARCHITECTURE-hermes-service-map.md` — the owner's directive was "every bit of
  development in our log where needed", and the first pass named only 11 items while the BACKLOG holds
  ~20 that touch AI. Coverage now measured: **41 backlog ids, 0 missing**. Full entry below.
- **2026-10-06 — `explicit-sort-comparators` audit fixed** (code `d5567c7`). **16 violations across 6
  files**, not the 2 a summary had claimed — the site list was read from the test's own output. Added the
  canonical comparator at all 18 sites; audit 4/4 green; 336 touched-package tests green; 7/7 equivalence
  probes byte-identical. Full entry below.
- **2026-10-06 — the owner's three directives** (docs `54459c1`): the `★ ACTIVE TASK` convention in
  this file; the Hermes/Llama service map; the front-end rule in `WORKING-RULES.md` + COOKBOOK rule 5.
  Full entry below.
- **2026-10-06 — `dashboards` D2-wide migration** (code `a05ea2c`). 10 calls / 4 files → 5 guard objects;
  count **161 → 151**. Four test suites repaired and mutation-proven (block path disabled → 4 red;
  `runAfterSuccess` neutered → 4 red; wrapper restored md5-identical). Full entry below.
- **2026-10-06 — `dictionaries` D2-wide migration** (code `43e4e5d`, docs `7987f2a`). 16 calls / 6
  files → 9 guard objects; 15 suites / 74 tests green; core `tsc --noEmit` exit 0; two mutations
  proved the tests bite (block-path disabled → 6 red; `runAfterSuccess` neutered → 8 red). Repo-wide
  count **177 → 161**. Full entry below.
- **2026-10-06 — `data_sync` D2-wide migration** (code `c6c3151`, docs `a4ac202`). 19 calls / 7
  files retired; full entry below.
- **2026-10-06 — D1** — the tier mapping / defaults / fallbacks became a superadmin **setting**
  (`module_configs`), seeded from the dictionary, failing closed (code `558cfab`, `6726573`,
  `a3b58ad`). Full entry below.
- **2026-10-06 — D0** — the generated guard registry now delivers guards, mutation-proven
  (code `d225602`). Full entry below.

---

## 2026-10-06 (newest) — `D2-gap` measured across every enabled module, and its first module fixed (`audit_logs`)

**The task this box now carries.** With the `D2-wide` sweep of enabled modules complete, the next live
defect is **`D2-gap`** — write routes that call **no guard at all** (neither the registry, nor the
deprecated pair, nor `makeCrudRoute`). This session: **measure it across every enabled module**, then
**fix it module by module, largest first.**

**Why it is a defect, in one line.** A write that calls no guard is a write **no Hermes authorization can
ever reach** (Hermes map §4.4 (b)) — so it is precisely where a tool call touches data that no
authorization describes. And "0 remaining on `D2-wide`" does **not** mean "the module is guarded" — a
module can be finished there and still wide open here.

**The measurement — built as a re-runnable tool, not a one-off number.** `analysis/d2-gap/measure.js`
(+ `--json`), FINDINGS.md in the same folder. It reads the enabled set from
`apps/mercato/src/modules.ts` (**not** a hand-typed list), **strips comments before looking for guards**
(so a guard *named in prose* is not counted — the L91 lesson), **counts verbs not files**, and sets the
eight auth-flow endpoints aside **by name** so the figure stays comparable with the backlog record.
Headline: **35 enabled modules · 256 write verbs · 158 unguarded now (160 before the `audit_logs` fix) ·
90 guarded** (50 wrapper · 35 `makeCrudRoute`/`crud.` · 5 re-exported guarded factory · 0 deprecated; the
closure 50+35+5+0+8+158 = 256 balances).
**Both figures are recorded because the number must name the HEAD it was measured at** — the rule that
would have prevented the `auth`-onward file-count slip. `audit_logs` accounts for the −2.

**Reconciled against what was already recorded — and the point is the one that disagreed.** Eight of the
nine previously-recorded modules matched **exactly** (`inbox_ops` 10/14, `auth` 12, `directory` 3-in-1-file,
and the five zeros). The ninth did not: **`workflows` was recorded as "13 of 19" and measures 10.** The
record listed `api/tasks/route.ts` and `api/events` subscribe/unsubscribe as unguarded write routes —
**neither exports a write verb**, checked twice by routes that share no failure mode (read the file today;
`git show d3af1b1:…` shows no write verb then either). They were never write routes; the record counted
*files* as if they were. **Corrected to 10, not carried forward.**

**Two unit errors in my own first pass — both caught by comparing, neither visible by re-reading my own
output.** (1) It counted **files** where the backlog counts **verbs**: `directory/organization-edges/route.ts`
is one file with three unguarded verbs (POST/PATCH/DELETE), so `directory` read 1 and the record's 3 was
right. (2) The export-detection regex required the verb to immediately follow `const X =`, so
`export const POST = crud.POST` — the CRUD-factory pattern used by `auth/users/route.ts` and
`auth/roles/route.ts` — was misread as **unguarded**; `auth` read 20, corrected to 12, matching the record.
**The method that caught both:** line the figures up against what a **different person** had already
written down — the same discipline the project's own LESSONS demand.

**Fix 1 of the sweep — `audit_logs` DONE and PROVEN (code `4ef5812`).** Both write routes in the module —
`audit-logs/actions/undo` (POST) and `actions/redo` (POST) — called **no guard of any kind**: no wrapper,
no `runRouteMutationGuards()`, not the deprecated pair, and they are not built by `makeCrudRoute`. A guard
set shipped for `audit_logs` would have been **silently skipped**, and a Hermes-authorized undo would have
reached the command bus with nothing checking it. **2 unguarded verbs → 0**, via a new
`packages/core/src/modules/audit_logs/api/mutation-guard.ts` (`beginAuditLogsMutationGuard`).

**Why this module first.** Undo and redo **replay a registered command** — the most privilege-sensitive
write on the platform — and the routes already carry a dense hand-written authorization story (feature
requirements, actor-vs-tenant undo rights, fail-closed tenant scope, org-scope resolution, the "only the
latest undoable row" re-lookup; issues #2398, #2685). **None of that is replaced.** The missing piece was
the **registry chokepoint**: today a future guard for this module cannot run, and the structural grammar
(SD-4) never sees these writes.

**The one design decision — and it is a real choice, not a nicety.** The guard is evaluated against the
**log entry's own `resourceKind`** (falling back to `audit_logs.action_log`), because what is guarded is
the *reversal or replay of a write to that resource*: a guard registered against, say,
`directory.organization` must see the **undo of an organization write** — otherwise the one path that can
**reverse** a protected change is the one path no guard describes. Evaluating against the wrong key would
either fire guards that have no business seeing this write, or (worse) silently match none and look
guarded while doing nothing. The value is **read from the row, never guessed**; a null `resourceKind` is
guarded as the log table itself.

**Second deliberate placement — the redo route.** The guard runs **after** `resolveRedoInput` (which 400s
"Redo data unavailable" when the redo payload is missing), so policy is only evaluated for a request that
can actually proceed. Discovered by reading the route, not assumed.

**Test evidence.** New suite `api/__tests__/d2-gap-guard.test.ts`, **7 tests**, every one asserting the
guard is really wired in: registry called once with the row's own resource; the guard runs before the
command; a block prevents the command; fallback to the log-table kind for a null-resource row; **two
negatives** that the guard is NOT reached on 401/400; redo guard + afterSuccess.

**Proof — three disjoint mutations, each restored byte-identical.** (1) disable the undo **block path** →
exactly the **block** test RED. (2) remove the **undo guard call** → the **4 undo-guard** tests RED, and
the 3 that do not depend on it stay green. (3) remove the **redo guard call** → exactly the **redo** test
RED. Routes restored **byte-identical**: undo md5 `256401137b7e0f54fd2b7482232ea477`, redo md5
`fd6e65e603256293549d5e98818c5735`. `audit_logs` = **16 suites / 108 tests green**; core `tsc --noEmit`
**exit 0**.

**What the box posts next.** **`ai_assistant` (24 unguarded verbs)** — the Hermes-facing module, where this
defect and the Hermes tool door meet most directly — then `messages` (17), `communication_channels` (15),
`auth` (12) — *all four now done: see the `D2-gap` sweep records at the top of this file; `auth` was a
real `D2-gap` but not an authorization hole (code `8e1632c`)* — and down the measured list. **A trap
carried forward:** not every write handler is a
`route.ts` (`translations/put/locales.ts`, `planner/*`, `query_index/{reindex,purge}.ts` export **named**
verbs). **Walk every `.ts` under `api/`, never glob for `route.ts`** — a name-scan reports a module clean
while leaving live write routes unguarded.

---

## 2026-10-06 (newest) — `feature_toggles` retired: **the last enabled module, and the D2-wide sweep is complete**

**The task this box carried.** D2-wide: retire the deprecated `validateCrudMutationGuard()` /
`runCrudMutationGuardAfterSuccess()` pair in `feature_toggles` (2 calls / 1 file), the way the previous
twelve enabled modules were done. **Definition of done:** the module measures 0, its route tests are green,
the two mutation proofs went RED, the repo-wide count is 106, and the docs say so.

**Measured before touching it — from the artefact, never the plan.** `grep` for the deprecated pair across
`feature_toggles --include="*.ts"`, comment lines dropped, returned exactly **2 call sites in 1 file**
(`api/overrides/route.ts`, lines 124 and 151). Per-file shape: that one file. The plan said 2 calls / 1 file
and it held — the third consecutive module where re-measurement confirmed the queued figure.

**The D2-gap was walked, not assumed.** Every write verb in the module, and its guard:

| Route file | Write verbs | Guard | Unguarded |
|---|---|---|---|
| `overrides/route.ts` | PUT | **this wrapper** (was the deprecated pair) | 0 |
| `global/route.ts` | POST, PUT, DELETE | `makeCrudRoute` → `collectAndRunGuards()` | 0 |
| `check/{boolean,json,number,string}/route.ts` | — (read only) | — | 0 |

**`feature_toggles` has no `D2-gap`** — the second module in the sweep with none (after `perspectives`,
`translations`, `planner`, `query_index`, `dashboards`, `workflows` also measuring 0, but this is the
first whose *every* route is either a guarded write or a read). The `check/*` routes were checked, not
assumed read-only.

**How it was solved.** A new module wrapper `packages/core/src/modules/feature_toggles/api/mutation-guard.ts`
— `beginFeatureTogglesMutationGuard(ctx)` returns `{ blockedResponse, runAfterSuccess }`, mirroring
`beginDirectoryMutationGuard`. The PUT route now collects the guard through it, returns
`guard.blockedResponse` when blocked, and calls `guard.runAfterSuccess(...)` after the command commits.

**The shape that is new here — the id-rebind, brought into the wrapper.** This route is the first in the
sweep whose *validated* id can differ from the *written* id **on the same route path**: it validates the
guard set against `existingOverride?.id ?? parsed.data.toggleId`, then the command may **create** a row and
return a generated `overrideToggleId`. The old code passed that produced id to
`runCrudMutationGuardAfterSuccess`. The wrapper reproduces that with `runAfterSuccess(idOverride)`: when the
override is absent or equal to the validated id it runs the collected callbacks; when it differs it
**re-collects** the guard set for the produced id and runs that. Re-running the set is safe **only because
`validate` is a pure predicate** — a fresh set is collected, so no callback runs twice. The test proves it by
asserting the registry is called **twice** on the create path (validated id, then produced id).

**A naming trap already on record, and it applies here.** The route also calls
`enforceCommandOptimisticLockWithGuards` on the existing-override path. That helper does **not** run mutation
guards — its `...WithGuards` suffix refers to the *command optimistic-lock* guard service, and its first
step is the OSS optimistic-lock floor. A plain `grep -i guard` shows the file as "guarded"; the mutation
guard is this wrapper. Recorded again so a later reader does not credit the wrong control.

**A caution about this call site.** The mutation guard is **not** the main protection on this route: the
route resolves a verified tenant (`resolveFeatureCheckContext`, 400 if absent), loads the override row
tenant-scoped, and refuses a stale overwrite. **`feature_toggles` ships no `guards.ts`**, so before this
migration the deprecated pair's only content was the bridged legacy service. The migration is still correct
and necessary — it removes the **bypass** — but the security argument rests on that, not on the route being
unprotected today.

**Test evidence.** One suite repaired: `api/overrides/__tests__/mutation-guard.test.ts` stubbed the **DI
`crudMutationGuardService`**, now stubbed to **only** the registry call `runRouteMutationGuards` (never the
wrapper), with the wrapper running for real. The old assertions on the flat `{ ok, status, body, metadata }`
shape were re-pointed to the `{ container, req, auth, input }` shape. **5 tests green**, including: the
registry call with the route scope; deny → 403 with no command execution and no after-success; **does NOT
run after-success when blocked**; the **rebind** (registry called twice, second call carries the produced
`overrideToggleId`); and the existing-row id used as the validate id. The sibling
`__tests__/optimistic-lock.test.ts` (4 tests) still green.

**Mutations proved the tests bite.** Wrapper backed up (md5 `7b5514c22a8d4a78962e663725c6df24`).
**Mutation A** — `if (!guardResult.ok)` → `if (false && !guardResult.ok)`: **2 RED** (both deny-path tests),
3 green. **Mutation B** — `if (true) return` as the first line of `runAfterSuccess`: **2 RED** (both
allow-path tests), 3 green — a **disjoint** set from A. Wrapper restored **md5-identical**, `diff` clean.

**Critic pass then mutated the ROUTE file.** Block return disabled (`if (false && guard.blockedResponse)`)
→ **2 RED**. After-success call commented out → **2 RED**. Both files restored **byte-identical**.

**L91 applied pre-emptively and proven.** The wrapper's header names both helpers **without parentheses**
(`enforceCommandOptimisticLockWithGuards`, "the sync helper"), and the file was checked against the raw-text
scanner regex `enforceCommandOptimisticLock\s*\(` — **0 matches**. The whole package suite was run anyway.

**Green, measured:** `feature_toggles` module **14 suites / 84 tests green**; core `tsc --noEmit` exit 0;
**whole core suite 603 suites / 5136 tests green**.

**Count re-measured two independent ways, both agree:** repo-wide **108 → 106**, files **41 → 40**. The
"before" was re-derived on the stashed tree with the same classifier (**108 / 41**) and the delta (−2 sites /
−1 file) is exactly this module's 2 calls in 1 file. `feature_toggles` now reads **0**.

**What it means:** **every enabled module in the D2-wide sweep is migrated.** The only D2-wide work left is
the **parked set** (106 calls / 40 files), which is *recorded, not migrated* — a parked module's deprecated
call is dormant, so retiring it there needs no code change until it is un-parked. `D2-gap` remains an open
backlog item, and is the recommended next task.

---

**The active task from the box: `inbox_ops` D2-wide (8 deprecated guard calls in 4 files). Done, proven
and committed (`d89b8f6`, code repo).**

**What was done, plainly.** Four custom write routes in `inbox_ops` called the **deprecated** guard
pair (`validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()`), which resolves only the
single DI-registered service and silently skips the real guard registry. They now go through a new
module wrapper `inbox_ops/api/mutation-guard.ts` → `beginInboxOpsMutationGuard(ctx)`, which calls
`runRouteMutationGuards()` — the same shape as the five modules before it. **8 calls in 4 files → 4
guard objects.** Count **142 → 134**, measured two independent ways (`grep … | grep -vE` and `git grep`
classified by a script), and `inbox_ops` now measures **0**.

The four routes, each read before and after:

| Route | Verb | `resourceKind` | `operation` |
|---|---|---|---|
| `proposals/[id]/categorize` | POST | `inbox_ops:inbox_proposal` | `update` |
| `proposals/[id]/actions/[actionId]` | PATCH | `inbox_ops:inbox_proposal_action` | `update` |
| `proposals/[id]/accept-all` | POST | `inbox_ops:inbox_proposal` | `custom` |
| `emails/[id]` | DELETE | `inbox_ops:inbox_email` | `delete` |

**One behaviour point kept, not silently dropped.** The email DELETE returns **404 before** the
after-success when the row was already gone (the old code sat `runCrudMutationGuardAfterSuccess()` below
the 404 return). The new code keeps that ordering by simply **not** calling `guard.runAfterSuccess()` on
the 404 path — the hook runs only after a committed write. That path has its own test, and it stayed
green under both mutations, which is correct: it asserts the hook did *not* run.

**The proof — and why it was easier this time.** `inbox_ops` already shipped a dedicated guard suite
(`api/__tests__/mutation-guards.test.ts`, 9 tests) covering all four routes on both verdicts. Its only
defect was the one recorded in the `workflows` entry: it **mocked the deprecated module**, the wrong
target now. Repointed to stub **only** the registry call `runRouteMutationGuards` and let the module
wrapper run for real. Then the mutations bit, exactly as they must:

- disabling the wrapper's **block path** → **4 tests RED** (every deny-path test);
- neutering **`runAfterSuccess`** → **4 tests RED** (every allow-path test);
- wrapper restored **md5-identical** (`9490fbfc2b3515ef67a7131b941342d2`).

**Verified:** `inbox_ops/api` = **15 suites / 107 tests green**; whole `inbox_ops` module = **35 suites /
395 tests green**; `core` `tsc --noEmit` **exit 0**.

**Scope, stated honestly (and measured, not assumed).** `inbox_ops` has **14** routes exporting a write
verb. This wrapper covers **4**. The other **10** call **no guard at all** — `extract`,
`emails/[id]/reprocess`, `proposals/[id]/translate`, `proposals/[id]/reject`,
`proposals/[id]/actions/[actionId]/{accept,complete,reject}`,
`proposals/[id]/replies/[replyId]/send`, `settings`, `webhook/inbound`. That is the **`D2-gap`** sibling
concern, and the figure is now written into the wrapper's own header so the next reader does not have to
re-derive it. Same lesson as `workflows`: **"0 remaining on `D2-wide`" means "no deprecated resolver
left", NOT "the module is guarded".**

**Also this session (before the migration): committed the outstanding corrections from the previous
turn.** The `workflows` wrapper's comment-only scope edit (`9c9ccbf`) and the docs corrections
(`5abf1f5`) — the false coverage claim, the `58 → 56` file count, and the stale proof hash, now stated
as "the hash the proof restored" vs "the hash in the tree now" with the reason. Nothing was left
uncommitted between turns.

---

## 2026-10-06 (newest) — `workflows` retired, and a mutation proof that was proving nothing

**The active task from the box: `workflows` D2-wide (9 deprecated guard calls in 3 files). Done, proven
and committed (`d3af1b1`, code repo).**

**What was done, plainly.** The three route files that write workflow definitions
(`definitions/[id]/route.ts` PUT + DELETE, `definitions/[id]/customize`, `definitions/[id]/reset-to-code`)
called the **deprecated** guard pair, which resolves only the single DI-registered service and silently
skips the real guard registry. They now go through a new module wrapper
`workflows/api/mutation-guard.ts` → `beginWorkflowsMutationGuard(ctx)`, which calls
`runRouteMutationGuards()` — the same shape as `entities`, `data_sync`, `dictionaries`, `dashboards`.
**9 calls in 3 files → 4 guard objects.** Count **151 → 142**, measured two independent ways (`grep` and
`git grep`), and `workflows` now measures **0**.

**The part worth recording — my first proof was worthless, and the mutation is what caught it.** I
repaired the four existing test suites and, to keep them simple, mocked the **module wrapper** so each
test saw a pass-through guard. Then I ran the two mutations the pattern requires: disable the block path,
and neuter `runAfterSuccess`. **Both stayed green.** A green mutation does not mean "the code is fine" —
it means **the test is not exercising the code you mutated**. Because the wrapper was mocked, the mutated
block path never ran at all.

The fix is the pattern now written into the docs: stub **only** the registry call
(`runRouteMutationGuards`), and let the module wrapper run for real. That meant adding a dedicated suite
(`api/__tests__/mutation-guard.route.test.ts`) that drives the actual routes with a blocked verdict and
with a passing verdict, and asserts the id is re-bound to the row the write produced. With the wrapper
in the path, the mutations bite: **block path disabled → 5 RED; `runAfterSuccess` neutered → 3 RED;
wrapper restored md5-identical (`b969e361b9c727e61f3365f0f9cae1b0`)**.

**Why the hash in the tree is not that hash.** The proof ended by restoring the wrapper byte-for-byte to
`b969e361…`. The hostile pass (below) then required a **comment-only** edit to the same file — the honest
"Scope" paragraph in its header — which moved it to **`bc030d318c0baeb23d875727d65ee9dc`**. The two
hashes differ by header prose only; no executable line changed. After that edit the api suites were
re-run: **7 suites / 118 tests green, core `tsc --noEmit` exit 0**. A junior dev re-running `md5sum` on
that file should expect `bc030d…`; `b969e361…` is the artefact the mutation proof restored, recorded so
the proof stays auditable.

**Also this session — the map's Part II, and a heading defect I introduced and fixed.** Per the owner's
"deep enough for a junior developer", `ARCHITECTURE-hermes-service-map.md` gained Part II: the three real
joints worked in full (agent identity `AH-1`; the tool door + authorization `S-02`/`AH-8`; skills+memory
`AH-9`) plus the D2-wide walkthrough (§10–§13), every path read from source. My insert left §9 sitting
*after* §10–§13; a grep caught the order and it was moved back before Part II, with the duplicated
verification block removed (docs `365c4e4`).

**Evidence.** `workflows` api **7 suites / 118 tests green**; whole `workflows` module **45 suites /
650 tests green**; core `tsc --noEmit` **exit 0**. **Next active task: `inbox_ops` (8 calls / 4 files);
expected count 142 → 134.**

**Then a hostile re-measurement found two things wrong with what I had just written — both fixed.**

1. **FALSE CLAIM (the serious one) — "every `workflows` write now goes through the guard."** *Status:
   FIXED — the false sentence is removed, the real scope is stated, and the gap is now a tracked item.*
   A critic pass counted the module's write routes: **13 of 19 call no guard at all** — neither the new
   wrapper nor the old deprecated pair (`instances/**`, `tasks/**`, `signals`, `events`,
   `definitions/route` POST). Measured independently by checking each file at `d3af1b1~1`:
   `deprecated_calls_at_parent = 0`, so the gap is **pre-existing, not a regression** — and it is
   precisely why this migration measured 9 calls across only 3 files. The important part is the
   *reading*: **"0 remaining on `D2-wide`" means "no deprecated resolver left", NOT "the module is
   guarded"** — a module can score 0 and still be wide open. Recorded as backlog item **`D2-gap`**
   (what to measure, how to measure it, the suggested fix), stated in the wrapper's own header so
   nobody reads that file as coverage, and added as a "Scope — what this does NOT cover" row in
   `BUILD-ORDER.md` §2e. The same question must now be asked of `data_sync`, `dictionaries` and
   `dashboards`.
2. **WRONG NUMBER — the file count.** *Status: FIXED — the docs now say 56, not 58.* I wrote "58 files"
   from a `grep -rln` — but `-l` lists a file if **any** line matches, including comment-only files,
   while the site count is computed per-line. Two genuinely different methods (a Python parser that
   classifies each match, and an `awk` filter over `grep -rn`) both return **142 sites / 56 files** and
   agree with each other. The site count of 142 was right; the file count was not.

**The methods that caught both** are the ones the owner asks for: a separate pass whose only job is to
break the claim (Technique A), and reaching the number by a second, different route (Technique B).
Neither error would have been visible from re-running my own command.

---

## 2026-10-06 (latest) — directive 1 completed in full, and the sort audit fixed

**The owner asked whether his two directives were documented, and when they would be done.** The honest
answer, measured rather than asserted:

- **Directive 2 (the Active-task box) — DONE, fully.** The `★ ACTIVE TASK` box is at the top of this
  file; HANDOVER, START-PROMPT, README and BOOKMARKS carry no "what is next" and point here.
- **Directive 1 (the Hermes/Llama service map) — the file existed, but it was INCOMPLETE.** The owner's
  words were *"for every bit of development in our log where needed."* The first version named **11
  items**; the BACKLOG holds **43 open items, ~20 of which touch AI**. So it did not meet the bar it
  claimed to. **This turn completed it.**

**How directive 1 was completed — measured, not guessed.** §4.4 was added to
[`library/development/ARCHITECTURE-hermes-service-map.md`](library/development/ARCHITECTURE-hermes-service-map.md),
grouped: (a) the structural-permission items `SD-1/2/4/5`; (b) the AI I/O guard `G-06` and the
enforcement point `S-02`; (b2) the remaining security/authority items `G-04/05/13/14/15/16`; (c) the
agent-half items `AH-1`–`AH-12`; (d) the model-layer track `ML-1`–`ML-4`; (e) the decision items `N-15`,
`V-04` and the `V`-HOLDs. A closing paragraph names the items deliberately **not** in the map (`G-09`,
`G-10`, `G-18`, `G-19`, `G-20`, and the human-approval/UI items `22`, `23`, `15b`, `21c`, `24b`, `C`) and
why — no AI is an ingredient in them, so mapping them would dilute rather than complete the page.
**Coverage is now a measured claim:** every open item id in the BACKLOG was checked against the map →
**41 ids, 0 missing.** The document's own §9 records that its earlier completeness claim was false.

**Then the straightforward next task — the `explicit-sort-comparators` audit — was fixed.** The audit test
was red. **A handover summary said "two files are flagged"; the test's own output said 16 violations
across 6 files.** I read the list from the failing run, not the summary — which is why the fix is
complete rather than partial (and why fixing only the two summary names left it red: there is a *second*
bare sort in `user-function/document.ts` at a different line). All 18 sites got the **canonical-key
comparator** `(a, b) => (a < b ? -1 : a > b ? 1 : 0)` — *not* `localeCompare`, because these are internal
identifiers, not display strings, and `localeCompare` would make the order locale-dependent.
**Proven behaviour-preserving two ways:** 7/7 adversarial equivalence probes show the canonical comparator
is byte-identical to the default string sort; and the touched shared packages = **24 suites / 336 tests
green**, shared `tsc --noEmit` exit 0, audit 4/4. Code commit `d5567c7`.

**The second test-suite defect (`module-decoupling`) is now FIXED too (code `fe7c3e5`).** Established by
measurement: it **passes alone 3/3** and in pair runs, but failed under **full-suite parallel load** — the
real `#generated/entities.ids.generated` wins over the test's `jest.mock` inside a shared jest worker, so
`partitions.ts` sees a catalog registry and returns `productsMedia`. The test file itself already
documented this exact symptom as *"seen once, never reproduced, never explained."* **It is a test-harness
defect, not a product defect** — `partitions.ts` is correct by design (it includes the catalog product id
only when catalog is enabled). **Owner chose file-scoped isolation.** The fix wraps the mock-dependent
test in `jest.isolateModulesAsync(...)`, giving it a fresh module registry so the mock always applies — no
change to the shared jest config. **It cannot mask a real bug:** the test still asserts its own
precondition `expect(E.catalog).toBeUndefined()` inside the isolation, so if the mock ever fails to apply
it fails there first. **Result: the full core suite is now 602 suites / 5123 tests, 0 failures — the first
fully green run.** A probe test confirmed the mock applies inside `isolateModulesAsync` regardless of
prior cache, so the file no longer depends on scheduling order.

---

## 2026-10-06 (latest) — the owner's three directives, and D2-wide reaches `dashboards`

**The owner set three directives this turn, and asked me to sort the priorities and connect them to
the development chain.** This entry records the chain, what shipped, and what it measured.

**Directive 1 — document how Hermes serves every piece.** Built as
[`library/development/ARCHITECTURE-hermes-service-map.md`](library/development/ARCHITECTURE-hermes-service-map.md):
for **every** AI-touching development item, whether Hermes appears as **an agent** or as **setting
wiring**, where **Llama** sits, and the measured status. It answers the four challenges the owner
named — the one-tenant/multi-tenant mismatch, multi-agents, integrations, and MCP — and is written so
a new developer can execute without a learning curve. **Built from the source, not a summary:** the
11 model presets were enumerated (`openai`, `deepinfra`, `groq`, `together`, `fireworks`, `azure`,
`litellm`, `ollama`, `openrouter`, `requesty`, `lm-studio`) and **none is llama.cpp** — confirmed by
two routes (the id list, and a search for `localhost:8080`/`llama-server`), which is why "integrate
Llama" is *one preset entry*, not a project. Also measured: the `mcp` service in
`docker-compose.fullapp.yml` has **no `OPENAI_BASE_URL`** (defect #2 from the model-server doc), and
the chat route is still wired to OpenCode.

**Directive 2 — take "what is next" out of the handover docs, put it in one box.** Done:
`HANDOVER.md`, `START-PROMPT.md`, `README.md` and `BOOKMARKS.md` no longer carry a task; they point
at the new **`★ ACTIVE TASK`** section at the **top of this file**, which carries the convention
(*tick it, move it down, post the next one*). A task stated anywhere else is now stale by definition.

**Directive 3 — the front-end rule.** Recorded as a standing rule in
[`library/development/WORKING-RULES.md`](library/development/WORKING-RULES.md) and as **rule 5 of
COOKBOOK "the rules that override everything"**: *if a piece can be fully functional on its own, wire
it into the running interface in the same batch, locking or switching off the parts that still need
work.* The owner's reason, kept verbatim: *"Updating the front end helps me testing the micros as you
work."*

**Then the development chain continued with `dashboards`.** The third enabled module retired from
the deprecated guard resolver: **10 call sites across 4 files → 5 guard objects**, via a new
`beginDashboardsMutationGuard()` (`dashboards/api/mutation-guard.ts`) matching the proven wrapper
shape. **Two of the routes write in one of two mutually-exclusive branches** ("clear the override"
then return, or "upsert the override"), and each ran its own after-success call; because
`validate()` is a pure predicate, collecting the guard set once and invoking `runAfterSuccess()` in
whichever branch is taken is equivalent, and it evaluates the guard set once instead of twice.

**Proven, not assumed.** 5 suites / 19 tests green (4 repaired from the deprecated-pair mock to the
registry mock, including the two tenant-isolation tests, which now assert `runRouteMutationGuards`
was **not** called on a rejected cross-tenant write). Core `tsc --noEmit` **exit 0**. Two mutations
proved the tests bite: disabling the block path → **4 red** (one per file); neutering `runAfterSuccess`
→ **4 red**; the wrapper was restored **md5-identical** (`76fb8b374e2528f3420879eac8e0e1d4`).
Repo-wide count **161 → 151 (−10 exactly)**, and `dashboards` re-measured at **0**.

**One correction to my own account, caught by measuring rather than retelling.** I first wrote the
count as 163 in this session's working notes; the true call-site count is **161**, because the raw
grep also matches the **two declarations** of the deprecated pair in `mutation-guard.ts`
(`export async function validateCrudMutationGuard(`). The file count is **67**, not 69 — the naive
file list also includes the declaration file and a file whose only match is a docstring line. That
161 was then **re-measured to 151 after `dashboards`**, at **59 files** — both figures corrected in
every place they appear (HANDOVER, BUILD-ORDER, BACKLOG, the Active-task box). **This is the
"measure, don't retell" rule working exactly as written.**

**The full suite was run after the change, and read honestly.** `packages/core` = **600 suites passed /
2 failed, 5121 tests passed / 2 failed**. The two failures were **both checked against the baseline,
not assumed**:
- `explicit-sort-comparators` — **pre-existing**, fails identically with the dashboards work stashed
  (the known next-but-two chain item; the flagged files are untouched by any D2-wide commit).
- `module-decoupling` — **NOT pre-existing, and NOT caused by this change.** It *passes* both with and
  without the dashboards work when run as a pair; it fails only under **full-suite parallel load**
  (a module-registry state leak across jest workers — the failure is
  `resolveDefaultPartitionCode('catalog:catalog_product')` returning `productsMedia` when the catalog
  suites are scheduled alongside it). Recorded as an **order-dependent flake**, reproducible at the
  baseline, so it is a test-harness defect, not a product defect — and it is now on the chain.

**The commit is `a05ea2c`** (repo `workspace/starting-kit`, branch `main`); the docs batch that records
it is this file plus BUILD-ORDER/BACKLOG/HANDOVER.

---

## 2026-10-06 (later still) — D2-wide: the owner set HOW, not just WHAT

**The owner's two directives this turn.** (1) *Do not state an issue without saying how it was or will be
solved, when, and where it is documented* — an open-ended concern is a source of confusion, not a report.
(2) On the deprecated guard resolver: *"mapping existing modules to core needs may provide a shortcut to
retire the resolver and with every module you decide if you customize and integrate directly or just
disconnect and park till later."*

**The answer to "did we fully process the blueprint?"** Yes, and it is documented in three places, each
measured: [`BLUEPRINT-GAP-ANALYSIS.md`](library/development/BLUEPRINT-GAP-ANALYSIS.md) (four gaps A–D, each
with what-the-blueprint-says / what-we-have / what-to-add / where-in-the-order);
[`CORE-MODULES-REGISTER.md`](library/development/CORE-MODULES-REGISTER.md) (P1–P18 + B1–B14 with
two-route verdicts); [`CORE-BOUNDARY.md`](library/development/CORE-BOUNDARY.md) (Ring 1 core / Ring 2
configurable / Ring 3 packs, the direct answer to the uncustomisable-core question). All three feed
[`BUILD-ORDER.md`](library/development/BUILD-ORDER.md) §3. Nothing from the blueprint is left undocumented;
gaps A–D are each assigned a phase.

**What changed on D2-wide.** It was a counted item ("199 call sites, module by module") but the count had
drifted in my retelling and — more importantly — the item carried no *decision method*. It now carries
both. **The count, re-measured this turn by two routes that share no failure mode** (the doc's own count
command, and a per-file walk of every affected module): **199 call sites / 78 files**. Split: **93 calls /
38 files ENABLED** (a live defect — they run today and bypass the registry), **106 / 40 parked**. The
`entities` path is already retired for real and sits *inside* the 199 as the worked example.

**Two corrections I had to make to myself, recorded because they are the method working.** Mid-turn I
"re-measured" and got 352, and briefly wrote that 199 was wrong. It was not: a name-only grep also counts
**import and docstring lines**, so 356 measured *names mentioned*, while 199 measures *calls made* — two
different questions. Then I "corrected" the enabled split 93/38 → 92/37, also wrongly: my per-module loop
had missed the `workflows` API subdirectories (real: 9 calls / 3 files). A **critic pass that re-measured
every single table row** — not just the total — caught it. Restored to the original figures, which were
right. Neither wrong number reached a file except in this turn's own draft, now fixed; the calls-vs-names
ambiguity is written into BUILD-ORDER §2c so it is not re-derived.

**The plan (BUILD-ORDER §2e).** D2-wide is a **module-to-core-need mapping**; each affected module is
tagged **(A) customise & integrate directly now**, **(B) disconnect & park till later**, or **(C) already
connected**. Enabled modules first (largest cluster first: `data_sync` → `dictionaries` → `dashboards`),
each with its own mutation proof; parked modules are recorded as graft-phase — their deprecated calls are
**dormant, not live**, which is the shortcut the owner spotted. **That is the honest statement of how
D2-wide will be solved, when, and where it is written down.**

---

## 2026-10-06 (latest) — D1: the tier mapping stopped being code and became a setting

**D1 is done (code `558cfab`).** The owner's instruction was *"concerning tiers, default ones and
concerning fallbacks. let's not make it hardcoded but a setting a superadmin can change."* Before this,
those three values lived in a frozen `.ts` object (`CHANGE_KIND_TIER`), so changing what the platform
permits took a code deploy. Now they are one setting — the kind→tier map, the default tier, and the S11
fallback level — read from the platform's **existing** settings engine (`module_configs`, module
`request_outcome`, name `structureChangeTiers`). No new table (S5): the engine was already there.

**The design problem worth recording: the triage is pure, and the setting needs a database.** `triage.ts`
promises in its own header "no model call, no database, no clock" — that is what lets its rule be proved
exhaustively. So the fix **separates the read from the decision**: `loadTierSettings(reader, scope)` is
the only async, store-touching part (taking an injected reader, typed structurally so `shared` never
depends on `core`); `resolveTier(kind, settings)` is pure. `triageRequest` and `tierForChange` take the
settings as an **optional injected argument**, so every existing caller keeps its exact behaviour and
**not one existing test had to change**.

**It fails closed, and that half is the one that matters.** A malformed setting — a bad tier string, one
bad row inside a good map, a missing default, a missing fallback level — is rejected outright and the seed
is used instead, whose default is the strictest tier. A reader that throws also yields the seed.
**A broken setting is treated as no setting.** The mutation proof: softening the seed default from
`explicit_approval` to `safe` turned **7 tests red**; the file was restored md5-identical.

**Also this turn — two corrections found by re-measuring.** The D2-wide count I had written as "~201 calls
in ~76 files" was **understated**; measured twice by independent routes it is **199 calls in 78 files**
(raw 203/80, minus the 2 declarations and 2 docstring mentions), with **93 of those calls in enabled
modules**. And the enabled-module count of "37" was wrong — it had matched commented-out parked lines; the
config declares **35 static enabled modules**. Both are now corrected in every doc. The architecture
document's §7 checklist also showed the owner's fallback question as open when **he had already answered
it** (Q2: fall back to the tier table, standards-loaded) — settled and written in.

**The honest boundary, found by a critic pass on this work.** The setting is **written** on install and
**read by nothing at request time yet** — there is no production caller of `loadTierSettings`, because
**`triageRequest` itself has no production caller**: G-21 was built as a *library* with no route wired to
it. So D1's setting sits at exactly the maturity of its consumer. "The tier mapping is a setting" is
**true**; "the platform reads tiers at runtime" is **not yet true**. It is the same shape as the D0 defect
(*a file that exists is not a mechanism that runs*), one layer up — recorded, not hidden.

**Next:** **D2-wide** (retire the deprecated resolver, module by module, each mutation-proven), then **D3**
(the `escalate` outcome). The order is in [`library/development/BUILD-ORDER.md`](library/development/BUILD-ORDER.md).

---

## 2026-10-06 — D0 fixed and proven; the real defect was bigger than the registry

**D0 is done (code `d225602`).** The generated guard registry now delivers guards, and the delivery
chain is proven by mutation — not merely green. The build started with D0, as agreed, after the
documentation sweep (item 3) and the blueprint study (item 2b) were closed.

**Root cause, by two routes that share no failure mode.** (1) The running app's
`guards.generated.ts` exported `guardEntries: []`. (2) The generator's **own** test builds a module that
ships `data/guards.ts` and asserts it must appear — and it passes. **So the generator was never the
bug.** The cause was supply: the only modules shipping a `data/guards.ts` were `customers` and
`customer_accounts`, and **both are parked** ("ERP is off"), with the `example` template off by default.
No enabled module contributed a guard, so an empty registry was *correct* — and looked exactly like a
healthy system. That is why nothing caught it.

**The fix.** An enabled module (`entities`) now ships real structural guards: a custom field may not
claim a system column (`id`/`created_at`/`updated_at`/`deleted_at` — `records.ts` silently strips those
from writes, so such a field could never hold a value), and field keys must be snake_case. The delivery
test runs against the **real generated file** and the **real store**, and is **mutation-proven**:
emptying the entries → 4 red; no-op registration → 3 red; neutering the guard → 1 red, the right one.

**Then the honest part — the defect is bigger than the registry.** While fixing the entities path (D2),
a sweep found **199 non-test call sites across 78 files** still calling the `@deprecated`
`validateCrudMutationGuard()` pair, which bypasses the registry entirely — **93 of those calls (38
files) in ENABLED** modules (`auth`, `dashboards`, `data_sync`, `dictionaries`, `directory`, `entities`,
`feature_toggles`, `inbox_ops`, `perspectives`, `planner`, `query_index`, `translations`, `workflows`),
the rest in parked modules. So the registry is now populated and
**delivering**, and most routes still **do not consume it**. That is the same class of defect one layer
up: the owner's *"guarded for some, forgotten for others"* — present, measured, and now counted. It is
recorded as **`D2-wide`** in the backlog and in the build order, so it cannot slip.

**The entities path is the worked example (D2, entities scope — done).** `beginEntitiesMutationGuard`
now calls `runRouteMutationGuards()` — the registry wrapper the `@deprecated` docstring itself names as
the replacement — with the legacy service preserved via `bridgeLegacyGuard()`, so nothing was lost. Its
existing test had to be **repaired**: it mocked the deprecated pair, and the change falsified that
premise. Re-pointed to the registry wrapper; same intent; mutation-proven red.

**Proof, all measured this turn:** generator structural-contracts **104/104** · `entities` **222/222** ·
guard-delivery **5/5** · `core` and `app` `tsc --noEmit` **exit 0** · every mutated file restored
**md5-identical**.

**Also closed this session:** the owner's three earlier requests — (1) tiers/defaults/fallbacks are now
a **superadmin setting** in `module_configs`, not a hardcoded table (dictionary §C.2b); (2) the
core-module audit (`CORE-MODULES-REGISTER.md`) and the blueprint gap study
(`BLUEPRINT-GAP-ANALYSIS.md`, `CORE-BOUNDARY.md`); (3) the documentation sweep (handover, start prompt,
cookbook, lessons, index).

---

## 2026-10-06 — Build order: the owner is right, and the measurement says so

**The owner asked whether the permissions infrastructure should be built *now*, applying the standards
as we go, rather than stacked and edited later — and told me to fix the order so it is not deferred.**
He named accounts management, permissions and languages as things that must come first because
everything is built on top of them.

**He is right. And the honest news is better in one way and worse in another:** the foundation is
**largely already built** (accounts, permissions, languages), so this is not "stop and build
foundations from scratch" — it is "finish the foundation's last four gaps before stacking." But one of
those gaps, **D0**, is a **live defect**: the generated guard registry is empty and guards are wired by
hand. **The owner's feared defect class — some things guarded, others forgotten — already exists in the
guard layer.**

**Measured, from the code:**
- **Accounts management — BUILT.** `packages/core/src/modules/auth/` is a full module (api, backend,
  commands, components, data, di.ts, emails, encryption.ts, events.ts, frontend, **i18n**, lib, **20+
  migrations**, services, setup.ts, workers).
- **Roles & permissions — BUILT** as a two-table ACL (`role_acls` / `user_acls`, `featuresJson:
  string[]`, wildcard matching, `isSuperAdmin`).
- **Languages — BUILT** (`shared/src/lib/i18n`, per-module `i18n`, `translations`, `dictionaries`).
- **The guard engine ("this") — the mechanism is real, but the central registry is NOT delivering
  guards.** `MutationGuard` + `runMutationGuards()` exist and **are used** — but by **hand, per route**
  (~4–6 route files call `runMutationGuards(...)` explicitly). The **generated registry is empty**:
  `apps/mercato/.mercato/generated/guards.generated.ts` is a shell — `export const guardEntries:
  GuardEntry[] = []` — and only **3** modules even ship a `data/guards.ts` (`customers`,
  `customer_accounts`, `create-app` template). That empty file **is** imported by the app
  (`apps/mercato/src/bootstrap.ts:44`), so the wiring exists and the list it carries is empty.
- **The structural write hook — BUILT.** `beginEntitiesMutationGuard` is called at **every**
  entity/field-definition write path (`definitions.ts`, `definitions.batch.ts`, `definitions.restore.ts`,
  `entities.ts`), carrying `resourceKind` (`entities.entity`, `entities.field_definition`) + `operation`.
  That is the `(object, verb)` half of the owner's grammar, already in flight.

**So the order is: finish four named gaps in the foundation, then stack.** Written up in
[`BUILD-ORDER.md`](library/development/BUILD-ORDER.md):
- **D0 — the generated guard registry is EMPTY (a live defect).** Found by a critic pass **after** I had
  claimed the engine was "live and auto-wired" — the claim was **false** and is corrected in the table
  above. A guard that claims to run and does not is worse than no guard. This comes first because
  D1/D2/D3 all assume guards actually run.
- **D1** — structural rules are `.ts` code, not data; there is **no settings table** for the grammar to
  read. (Everything else reads from it.)
- **D2** — the entities path calls `validateCrudMutationGuard()`, which the code itself marks
  **`@deprecated`** for *"silently bypass[ing] every guard in the global mutation-guard store."* The
  authoritative path for tables and columns is the one path **not** running the central guard set.
- **D3** — `MutationGuardResult.ok` is a **boolean**; there is no `escalate`. A guard can allow or block,
  but cannot say *"allowed, but a person must review"* — the owner's grammar needs that third outcome.

**Order: D0 → D1 → D2 → D3 (Phase 0), then Phase 1 (S2 gate, tier mapping into code, core-function delete
guard, the manage screen), then Phase 2 (S7/G-21, S3, S8, S6), then Phase 3 (data-access coverage and
row scope).**

**Both owner decisions are now settled and recorded** (dictionary Part E): **Q1 accepted** — the tier
mapping is the default *beneath* the structural grammar and **bulk-applies** to it wherever no explicit
setting exists; **Q2 fallback accepted** — unset falls back to the tier table, and the fallback **carries
the standards' default values** (never silent, never "never"). SD-3 is unblocked.

**Correction to my own earlier framing, stated for the record — and it is the second time in one turn
that a critic pass beat me.** Last turn I called the guard system "a socket waiting to be used"; when I
went to correct that, I swung too far the other way and claimed it was "live and auto-wired for every
module" running in "nine-plus modules." **A critic pass falsified that**: the generated registry is
**empty** (`guardEntries: []`), only **3** modules ship a `data/guards.ts`, and guards actually run via
**hand-written per-route calls** in a handful of routes. The honest state is: **the guard *mechanism* is
real and used; the *central delivery* is broken.** Which — note this — is **exactly the defect class the
owner is trying to prevent** ("permissions for some tables, then forgetting others"). It happened, in
the guard layer, and went unnoticed until measured. That is the strongest support for his instruction,
and it is why **D0** now leads the order.

**Wired into:** `SPECIFICATIONS-DICTIONARY.md` (Part E settled, Part F added), `BACKLOG.md` (banner +
SD-3/SD-4 updated), `HANDOVER.md` (B1c), `INDEX.md` (reading order #1b + folder map).

## 2026-10-06 — The structure-permission grammar: the owner's idea beats what item 17 set

**The owner proposed a better shape, and it is better.** Not one tier per *kind of change*, but a
**permission per object, per verb, per actor**: for this table, may the AI add a column? Edit one? Drop
one? May it do it straight, or does it need review, or approval? May this column be *referenced* by
another table? Managed with a roles-and-permissions-style surface keyed on the user's role, the actor
type (human or AI), and the permission.

**Why it is better, said plainly.** It is **finer** (it can say "add columns, yes; drop them, no" — item
17's table cannot), it is **uniform** (structural permissions become the same *shape* as the data
permissions, so there is one mental model rather than two), and the **actor type is first-class** — which
matters, because the whole reason this question exists is that an AI can now propose changes to the
platform's own shape.

**And it is affordable, because the socket already exists — measured.** `entities.entity` and
`entities.field_definition` are already named resource kinds (`definitions.mutation-guard.ts:9-10`). A
column is already a row with settings (`custom_field_defs`). And a generic guard already takes a resource
kind, an operation and an actor and can **block** (`MutationGuard`, `mutation-guard-registry.ts:9`). So the
idea costs: a **settings block**, one new guard outcome (**escalate** — today it is binary allow/block),
and the **actor-type input**. Pending-approval machinery already exists on both sides
(`authority_pending_acts`; the AI's `pending-action-*` set).

**The grammar** (and the owner's sharpest point, the **reference** verb — a column others may reference
becomes public API, and changing it later breaks dependents, so it earns its own permission):
`(object, verb, actorType, role, level)`.

**Item 17 is not discarded — it is demoted.** The tier table survives as the **default beneath** the
mechanism: with no explicit structural permission, the kind's tier decides; both fail closed.

**What I checked and corrected:** the owner's premise — "now that every database column has its permission
setting" — is the **destination, not the current state**. There is **no per-column permission today**
(grepped: empty). The idea is a design, and an honest one, but the premise it builds on is still to be
built. Recorded as such.

**Written:** [`library/development/ARCHITECTURE-structure-permissions.md`](library/development/ARCHITECTURE-structure-permissions.md).
**Amended:** the dictionary — new **S11** (explicit per-object structural permissions) and **S12** (the
actor type is part of every structural decision); **S2** now installs **two** blocks on a new surface
(data + structural); item 17's table noted as the default. New backlog items **SD-4** (the grammar) and
**SD-5** (the manage screen).

---

## 2026-10-06 — The specifications dictionary: the standard that stops the platform decaying as it grows

**Why this exists.** The owner's concern, in his words: permissions get set for the tables that exist
today and forgotten for the tables created tomorrow, "and similar gaps and bugs generating flaws". He
asked for a standard like MVC — a bible that every architectural change is checked against, inherited
into gates and guards so it cannot be forgotten.

**What was written:** [`library/development/SPECIFICATIONS-DICTIONARY.md`](library/development/SPECIFICATIONS-DICTIONARY.md).
**Ten uncompromisable standards** (S1–S10), a **change protocol** in eight steps nothing may skip, and the
two clauses the owner named: **the permissions question** (new data structure does not land until its
permissions are decided — default: full grant to superadmin plus permission records) and **the tier
question** (item 17, resolved).

**Two findings, measured this session.**
1. **The conflict engine already blocks the build.** `detectConflicts` is called by the module-registry
   generator, which `throw`s on any error (`module-registry.ts:3284`) — so structural clashes already stop
   a build. It is simply not yet pointed at an AI-proposed change. I first wrote "not wired"; that was too
   strong and is corrected in the dictionary.
2. **Item 17 is answered by being absorbed, not by being picked.** `CHANGE_KIND_TIER` is an empty frozen
   object, so every structure change currently fails closed to the strictest tier. That is safe, but noisy.
   The owner's instruction turns the tiers into a **standard** — derived from the vision's own three tiers,
   failing closed on anything unrecognised — with a first mapping proposed in the dictionary's Part E.

**The rule that makes it binding:** **Rule zero-zero-one** in the COOKBOOK. Every architectural change is
checked against the dictionary before it lands; the permissions question and the tier question may never be
skipped; and when the dictionary and the code disagree, **the disagreement is the defect**.

**The owner's confirmed decision (2026-10-06):** when a prompt asks for what a user may not see, the
platform **tells them it was blocked** — strict without disrupting the flow, and never letting a partial
answer read as a complete one.

**Also measured this session (feeds S4):** the data-permission idea is **already half-built** — a per-table
gate (`aclFeatures`, fails closed) and a per-column policy (`fieldPolicy`) exist; the own/team/global row
scope does not; coverage is **6 of 67** tables. And there is **no unguarded door**: every path the AI can
use to reach data is checked, and its sandbox cannot fake its scope. Full write-up:
[`analysis/owner-workthrough-data-permissions.md`](analysis/owner-workthrough-data-permissions.md).

---

## 2026-10-06 — G-21 built: the three endings a prompt can have, and the gate on the dangerous one

**The last item the owner's features_pack named now exists as code.** Not every prompt becomes a
Function. He described three endings — a one-time answer, a step of architecture (LMS/CRM), a saved
Function — and the triage that chooses. Two were already in the vision, **the one-time answer was named
nowhere**, and the triage had no home. Now typed, tested and committed (`916069a`).

**The finding that shaped the whole build: most of the gate already existed.** I went in expecting to
build the §46 bar and found it already built and already enforcing — `verifyFunction` runs the checks by
calling G-02's compiler, and `transition()` **refuses** to mark a Function `verified` on a failing report.
So G-21 **asks** that gate instead of growing a second copy of it. A re-implementation would have given
the project two answers to one question, and the drift would have been invisible, because both would have
looked authoritative.

**What was built** (`packages/shared/src/lib/request-outcome/`): the **three outcomes** as a first-class
union; a **pure triage** that proposes and *cannot* perform — the return type has no field for an applied
change, so the fence is a type, not a convention; and a **Save gate** that consumes `verifyFunction`'s
report. Structure is decided **first**, so "add me an LMS" cannot be quietly classified as a saveable
Function — the most consequential request must not get the quietest ending.

**The existing intent classifier is a different axis, and I left it alone.** `api/route/route.ts` already
classifies every request as `tool | general_chat` — that is a *dispatcher* question ("which tool runs
this?"), not the *outcome* question ("what does this become?"). A `tool` intent can end as either. Widening
that enum would have made a dispatcher answer a product question, and the next reader could not have told
which meaning was meant.

**The subtle one — the `not_checked` trap.** `report.passed` is `true` when nothing **failed**, and
`not_checked` never fails a report. So a green report can hide a check that **never ran** — and
`authorization_valid` never has, because the data-axis layer is G-04 and does not exist. A gate asking only
`report.passed` would have cheerfully offered to save a Function whose permissions were never established.
The gate therefore returns `notChecked` **even when it says yes**: a clean report must not read as a clean
bill of health.

**Two defects found while testing, and both are kept as regression tests rather than quietly fixed.**

1. **A helper typed `: string` that could return `undefined`.** `describeSaveGateVerdict` read
   `if (!verdict.allowed) return verdict.reason`. Given a value whose `allowed` was missing — a
   `VerificationReport` passed where a `SaveGateVerdict` was expected, easy to do because **both carry a
   `notChecked`** — `!undefined` is `true`, so it returned `verdict.reason`, which was also missing. The
   caller was wrong, but the silent non-string was the function's, so the function now guards its own
   contract and answers with a sentence for junk input.
2. **A mutation proof that proved nothing.** To show the fail-closed guard was real, I mutated the
   unclassified branch and the suite **stayed green** — which looked like evidence the guard was weak. It
   was not: my whitespace-sensitive replace **had not matched**, so I was testing an unmutated file. Redone
   by index, it fails the test. **A mutation that does not apply cannot falsify** — and the first version
   looked exactly as authoritative as the real one.

**Every guard is mutation-proven RED:** failures ignored · `notChecked` dropped · structure branch removed ·
confirmation dropped · tier failing open · unclassified guessing. Green: **shared 2234/2234 across 193
suites**, typecheck **exit 0** — after confirming the restored files byte-identical by `md5sum`.

**Three things deliberately NOT built, so the result is not over-read.** The **schema-mutation IR kind**
does not exist (`IrOperation` is still `list | count | aggregate`), so outcome 2 is **triaged and gated but
not yet emittable** — the fence comes before the thing it fences, on purpose. **No UI**: the gate is the
function a Save button will call. **No database row**: `document.ts` names its own trigger (G-07), which has
now landed, so that row is startable — but it is not this item's, and building it here would widen a
taxonomy change into a migration.

**Files:** code — `packages/shared/src/lib/request-outcome/{types,triage,gate}.ts` plus three test suites
(32 tests), commit `916069a`. Docs — `library/development/PLAN-G21-request-outcomes.md` (new),
`ARCHITECTURE-request-outcomes.md` (§5 register closed, §6 added), `BACKLOG.md`, `workspace/COOKBOOK.md`.

---

## 2026-10-06 — the live app-level run is GREEN: request in, Business IR out

**The measurement G-17 was built for now exists.** A plain-language request went in through the running
platform and a Business IR object came out — with the app's *own* registry resolving the agent, not a
test double.

```
1. SESSION      POST /api/auth/login                -> http=200  {"ok":true,"token":"eyJ..."}
2. REGISTRY     GET  /api/ai_assistant/ai/agents    -> http=200
                business_ir.query_author present, moduleId=ai_assistant
3. END TO END   POST /api/ai_assistant/ai/run-object -> http=200  elapsed=69s
```

```json
{"object": {"operation": "list", "entity": "invoice", "grain": "customer",
            "filters": [{"field": "amount", "operator": "gt", "value": 10000}],
            "currencyBasis": "EUR",
            "sort": [{"field": "created_at", "direction": "desc"}], "limit": 50},
 "finishReason": "stop", "usage": {"inputTokens": 530, "outputTokens": 92, "totalTokens": 622}}
```

Correct on every axis the prompt named. The owner's **yes** to item 16 (rebuild the container) is what
made it runnable.

**The order the owner set is what made the result unambiguous.** The model was probed from **outside**
the platform first (PASS, http=200, 32s, correct IR). So if the platform run had failed, the fault would
have been the platform's, not the model's. Both halves passed — nothing left to unpick. This is the
"two routes" rule applied to a *dependency* rather than to a number.

**The first attempt failed, and it was my input, not the platform.** Login returned **401**. That is not
a defect: the script had guessed `secret` for superadmin, but the container seeds superadmin with
**`OM_INIT_SUPERADMIN_PASSWORD=password`** (measured from the container's own env; the *other* two demo
users use `secret`). The owner confirmed the same: superadmin is `password`, superadmin logs in in the
browser, and the password is used verbatim as the *bcrypt* secret. Re-run with `password` -> **200**.
**Had the outside probe not been run first, a 401 here would have looked like a platform fault.**

**A second input error caught before it could cost a cycle.** The run-object route's real body is
`{agent, messages: [{role, content}]}` — read from `runObjectRequestSchema` in
`api/ai/run-object/route.ts`. The script had guessed `{agentId, input}`; both field names wrong, which
would have returned `400 validation_error` and sent me debugging a phantom. Both route paths were then
confirmed against the generated table (`api-routes.generated.ts` line 32 `/auth/login`, line 239
`/ai_assistant/ai/run-object`) rather than guessed. **Read the contract; do not guess the shape.**

**The rebuild, measured both sides of the switch.** `docker compose -f docker-compose.fullapp.yml build
app` -> **12m22s**, new image `open-mercato/app:local` id `cd8c4242dcc0`; container recreated on it. Same
file, `/app/apps/mercato/.mercato/generated/ai-agents.generated.ts`: **0** occurrences of `ai_assistant`
before, **5** after (line 2 imports the module, line 10 registers `moduleId: "ai_assistant"`).

**Recorded but not acted on, and it does not change the result.** Latency was **69s** in-platform vs
**32s** straight to the model — the delta is the 530-token injected system prompt plus platform
overhead. A latency-budget data point, not a defect. Field names differ between surfaces
(`grain`/`created_at` in-platform vs `dimensions`/`date` raw) — that is the platform's schema doing its
job, not a discrepancy.

**Files:** `analysis/g17-app-run/RESULTS-2026-10-06.md` (new), `outside-probe-2026-10-06.md` (new),
`run-app-e2e.sh` (new; body shape and password corrected to the measured contract).

---

## 2026-10-06 — the IR agent declared, three tests its declaration falsified, and one gap left to the owner

**The gap the live run exposed.** The wire to the Business IR was built and the model was proven able to
use it — but the agent was **never declared anywhere**. `grep business_ir` found no non-test hits and
`ai-agents.generated.ts` was an empty stub. A wire with nothing registered cannot run in the app, so the
live app-level run could not have succeeded. Now declared: `ai-agents.ts` for
`business_ir.query_author` — `executionMode: 'object'`, **no tools**, read-only, its output schema pinned
to the **shared** `businessQueryIrSchema`, and its id imported from the wire so caller and registry
cannot drift.

**Getting it picked up failed silently twice, which is the part worth keeping.**

1. **The generator never ran.** I invoked the CLI's `dist/index.js`; it exited **0** and printed
   **nothing**. That file only *exports* the entry function — the real entrypoint is
   `packages/cli/bin/mercato`. **`exit 0` with no output is not success.**
2. **Then the registry was still empty — and my first explanation was wrong.** I assumed a stale build
   hid the file; importing the scanner's own `resolveModuleFile` showed it resolving correctly. So I
   traced the scan callback in the *built* extension instead, which showed it firing for `ai_assistant`
   with the file resolved — and the registry then carried the entry.

**Proven by two routes that share no failure mode:** the generated file's import statement, and a runtime
probe through the real `loadAgentRegistry()` — `found = YES`, `executionMode = object`, `schemaName =
BusinessQueryIR`, `allowedTools = []`, `readOnly = true`.

**Declaring the agent falsified THREE tests — all asserting a registry was EMPTY as a stand-in for
"nothing is declared".** `resetAgentRegistryForTests()` only clears a map and sets a latch; the next read
**lazily reloads the real registry**, so the "empty" premise died one call later, silently. **`reset` did
not mean "empty".** Repaired by moving each claim, not deleting it: the wire test now seeds the id as a
chat-mode agent with no output schema (object mode is refused with `execution_mode_not_supported` — a
deliberate refusal that survives whoever declares the id next), and the two empty-registry tests seed an
explicit `[]`. **Every repair was seen red** under two different mutations. Green: **1385/1385 across 100
suites**, app typecheck **exit 0**.

**One claim I made and then disproved — kept, because that is the point.** The once-failing
`agent-runtime-object.test.ts` is now 8/8, and the tidy story was "declaring the agent fixed it".
Tested: swapping the generated registry back to its empty form left it at **8/8**. So the cause is
**unattributed** (the registry sidecar was regenerated in the same window), and the item **stays open**
rather than being closed on a plausible story. *A fix you cannot attribute is a coincidence.*

**The one thing left, and it is the owner's call.** The route is live — `POST
/api/ai_assistant/ai/run-object` → **401**, the auth gate working (my first probe used a guessed URL and
got a misleading 404). But `starting-kit-app-1` has **no bind mount** to the workspace, so its code is
baked into a 15-hour-old image and its registry holds **0** occurrences of `ai_assistant`. **Nothing is
broken; the running app is simply older than the change.** The app-level run needs a **container
rebuild** — recorded as NEEDS-YOU Part 4 **item 16**, a yes/no for the owner. I did not touch the running
stack: widening its blast radius to make my own test pass is not my call.

**Files:** code — `packages/ai-assistant/src/modules/ai_assistant/ai-agents.ts` (new), plus three
repaired tests (`business-ir-author.test.ts`, `meta-pack.test.ts`, `ws-c-tool-pack-coverage.test.ts`),
commit `43161b3`. Docs — `workspace/COOKBOOK.md`, `BACKLOG.md`, `NEEDS-YOU.md`, `PLAN-G17-ir-generation.md`.
Skills — two new/updated lessons: `prove-a-generator-can-see-your-new-file` (new) and a sixth instance in
`repair-the-test-your-fix-falsified` (a fix that *adds* rather than removes).

---

## 2026-10-06 — the live model was asked, and it can: G-17's open question answered

**The one claim G-17 would not make has been measured, and the answer is yes.** The stack was up (all
eight containers healthy), so the local model was asked for real: **`Qwen2.5-7B-Instruct-Q4_K_M`, 6 of 6
requests produced an object our own schema accepts** — across six *different* IR shapes (filtered list,
`count`, bucketed `aggregate`, text `like` search, sort+limit, grouped average). Each reply was judged by
`businessQueryIrSchema`, not by eye. It also picked **sensible semantics** — `count` for "how many",
`aggregate` for "total per month" — which no schema can check.

**The negative control is the part that makes the 6/6 mean something.** Asked with a *loose* prompt, the
same model produced **nonsense** — invented nested `income`/`savings`/`debt` objects, plus a `tenant_id`
key. The schema **rejected it** and named why: a bad `operation`, a missing required field, and
`Unrecognized keys: "finances", "tenant_id"`. **So the model can go off-script, and the schema catches
it — including the exact tenant-widening the design exists to refuse.** Without this, "6 of 6" would
only have shown that the schema accepts everything.

**Two limits, stated so the result is not over-read.** It is **not a reliability rate** (six requests,
one run each, `temperature: 0` — it shows the model *can*, not how often it fails), and it went
**straight to the model server**, not through the platform's agent path. The model's *ability* and the
platform's *wire* are proven **separately** — which is exactly why the stubbed tests did not become
redundant.

**New artifact:** `packages/shared/src/lib/business-ir/__tests__/live.smoke.test.ts` — skips cleanly with
a loud message when no model server is running, because a measurement is not a gate.

**Still open:** the same request driven through the *live app* end to end (needs an authenticated
session).

---

## 2026-10-06 — G-17 built: the AI that emits the Business IR, and two of my own errors caught by falsifying them

**The join the vision was missing is now made.** The platform could compile and run a Business IR; it
could call a model with a schema; **nothing pointed the one at the other.** Now:
`business-ir/schema.ts` (the IR as a zod schema, `.strict()` at every level), `schema.conformance.test.ts`
(18 tests), `business-ir-author.ts` (`authorBusinessQueryIr()` — the wire, through the *existing*
`runAiAgentObject` schema override), and `business-ir-author.test.ts` (6 tests, ending with a model's
answer being **accepted by the existing `compileQuery`**). Full `business-ir` suite: **78/78**.

**Two of my own errors, both found by trying to break my own work — which is the whole reason the rule
exists.**

1. **A guard that was a print.** The schema asserted that it mirrored `types.ts` using bare type aliases
   (`type _Check = Expect<AssertEqual<A, B>>`). The falsification — delete a field, re-run `tsc` — came
   back **clean**, which is exactly what a broken guard looks like. Cause: TypeScript resolves an
   **unused type alias lazily**, so it never ran. Isolated probes proved only `const d: AssertEqual<A,B>
   = true` actually fails. Moved every assertion into one exported const. Re-measured: delete `grain` →
   `tsc` now **fails** (`TS2322`). *A test that cannot fail is documentation, not a guard.*

2. **The wire was on the wrong side of the dependency.** Writing it in `shared` made `shared` import
   `ai-assistant`, and `shared`'s type-check broke. The direction rule was already written down one file
   over. Moved it to `ai-assistant`; `shared` is clean again. *The layering is not a style preference; it
   is what keeps the packages independently checkable.*

**What is NOT done, plainly: the live smoke test.** Every proof above uses a **stubbed** model. Whether
our local model can actually emit a valid IR is a **separate question** that only a live run answers — so
it is **unproven**, and recorded as an open item (NEEDS-YOU Part 4 item 15). Also found: a **pre-existing**
broken test in the AI package (`agent-runtime-object.test.ts`, 4 of 8 failing on an unmodified tree),
recorded as item 14.

**Files:** code — `packages/shared/src/lib/business-ir/schema.ts`, `.../__tests__/schema.conformance.test.ts`,
`packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-author.ts`,
`.../lib/__tests__/business-ir-author.test.ts`. Docs — `BACKLOG.md`, `NEEDS-YOU.md`,
`PLAN-G17-ir-generation.md`, `workspace/COOKBOOK.md`.

---

## 2026-10-06 — G-17 begins: the AI that emits the Business IR, and a wrong claim corrected

**The documentation was perfected first, at the owner's request** — the tier decision recorded, and the
reading order unified across all four entry points into three tiers (A: direction + live decisions; B:
the spine; C: supporting, opened only where the work needs it). Then G-17 began.

**G-17's step 1 research corrected a wrong claim in G-17's own `BACKLOG` row.** The row said *"no
constrained-generation exists; the first artifact is a parser from scratch."* That was measured against
the **wrong vocabulary** — it grepped for the OpenAI wire fields (`response_format`, `json_schema`). The
platform calls models through the **AI SDK v7**, where the constraint is `generateObject({ schema:
<zod> })`, and **that is already built and in use**: `ai-sdk.ts` re-exports `generateObject`;
`api/route/route.ts:138` calls it with a zod `RouteResultSchema`; and there is a first-class object
endpoint (`api/ai/run-object` → **`runAiAgentObject`**) that takes a **structured-output schema
override** (`agent-runtime.ts:1831`). **So G-17 is not "build constrained generation"; it is "write the
IR's zod schema and point one agent at it."**

**What is genuinely missing, measured:** the IR has **no zod schema** (zero zod imports in
`business-ir/`, `kernel/`, `user-function/` — it is a TS type only, so nothing checks an incoming IR's
*shape*); nothing in `ai-assistant` imports `business-ir` (**zero hits** — the missing join, re-confirmed
by two routes); and there is **no schema-mutation IR kind** (that is G-21's, not this sprint's).

**The sprint is scoped and the cookbook written** (`workspace/COOKBOOK.md`, *Sprint G-17*), in the
project's four-step process: write `business-ir/schema.ts` mirroring `types.ts`, prove the two agree
with a conformance test that **can fail**, wire one agent through the existing override, and test the
end-to-end path with a stubbed model. **Step 4 (build) is next** — and its one unproven claim is
**whether our local quantised model can emit a valid IR**, which is a measurement, not an assumption.

**Files:** `library/development/PLAN-G17-ir-generation.md` (new, the step 1–2 record),
`library/development/BACKLOG.md` (G-17 row corrected + header), `workspace/COOKBOOK.md` (Sprint G-17),
`library/development/README.md` (new doc indexed).

---

## 2026-10-06 — The three things a prompt can become, and a wrong reading of mine corrected

**The owner described his core features_pack: not every prompt becomes a Function.** A prompt can end as
**(1) a one-time answer** (analyse, report into a datagrid/form/report, save nothing), **(2) a model
proposal** (the prompt needs new *structure* — a field, an entity, a whole new service like LMS or CRM),
or **(3) a saved Function** (walked to *flawless*, named, placed in a grouping, then runs with **no AI**,
"like a standard item menu in the traditional platforms"). He asked me to grill it and **verify it is
well established in the development plans**.

**The grilling found that my own previous claim was wrong — and it is the exact error my method warns
about.** In the same-day gap-register pass I had written that the vision "never names a prompt-caused
schema change". Re-measured from the source: **it does name it.** `Doc 04 §33` (line 997) —
*"When the user says: **Add Vehicle.** the first operation is: draft Business Model change — not ALTER
TABLE"*; `Doc 04 §34` — the full `User/AI request → Model Proposal → … → Publish Model Version` pipeline;
`AI_Native… §122` — `User requirement → … → Activate capability` (the LMS/CRM case); and `§123` — *"Both
can originate from natural language, but they go through different command paths."* I had measured the
wrong document. **Retracted and corrected in place.**

**What is genuinely absent, measured three independent ways.** The **one-time answer is named nowhere.**
(a) the vision folder — every `ephemeral|one-time|ad-hoc` hit is about *system* state (prompt caches,
worker state, processing state), not a prompt outcome; (b) the whole library (~26,000 files) — every
substantive hit belongs to an imported project or a Cancel button; (c) the nearest counter-example, read
in full — `Doc 03 §40` (*"Do NOT save only: raw SQL / the prompt / the returned data"*) is about **what**
to save when you save, not **whether** to save. And the **triage** — the rule that decides which ending a
prompt gets — exists as **one sentence** (`AI_Native… §123`) with **no backlog item and no home**, while
`save as function` returns only the two loop lines (`BACKLOG` 70, `HANDOVER` 616), neither naming
outcomes 1 or 2.

**So: two of three outcomes are covered, one is absent, and the triage is homeless.** That is now
**G-21**, with the design in [`library/development/ARCHITECTURE-request-outcomes.md`](library/development/ARCHITECTURE-request-outcomes.md)
— six grilled questions, each with a decision taken and written down. Two things the grilling settled
that the vision had left open: **(i)** the **"flawless" bar** is not a feeling — it is `Doc 03 §46`'s
objective checks (`IR valid · entities valid · … · sample result valid`), enforced by G-02's compiler, so
the Save button should be *disabled* until they pass; **(ii)** the **grouping** (`§61`'s
`Destination: Finance → Accounts Receivable`) is decided to be a **declared canonical path**, not free
text, so a menu cannot be spelled two ways and `§63`'s *"pattern → vendor module"* becomes detectable.

**A critic pass then caught my own invented scheme, and I replaced it with the vision's.** I had split
outcome 2 into a hand-drawn "small/large". A hostile re-read found `Doc 04 §130–§132` already tiers
*changes* into **safe / review-required / explicit-approval**. My approximation was weaker than the rule
sitting next to it, so G-21 now uses the vision's three tiers.

**Documentation changed in the same pass:** `BACKLOG.md` (**G-21** added; **G-17**'s row narrowed to all
three paths; header), `WHAT-WE-ARE-BUILDING.md` (the loop diagram now **branches**, because it previously
implied every need ends in a saved Function — the exact misreading the owner warned about),
`HANDOVER.md` (the decisive-loop line shows the branch), `README.md` (new doc indexed),
`NEEDS-YOU.md` (**item 14** — one genuine owner question: which tier an LMS/CRM-sized capability lands
in), and the gap register (**§7b**: the wrong reading corrected, the real gap recorded).

**One open question for the owner, no more:** *when a prompt asks for a whole new service, is that
review-required or explicit-approval?* Recommended: **explicit-approval**. Everything else was decided
and written down so it can be changed by saying so.

**Next:** G-17 (unchanged) — now scoped to emit the IR for **all three** paths, not the read path alone.

---

## 2026-10-06 — Sprint 0 re-run: the stack comes up whole, and why it did not

**The owner's answer unblocked `S0`, so the re-run happened — and it immediately found a real defect.**
The owner had reported the stack "up" and Docker Desktop auto-start "fixed". Measured independently:
Docker server **29.8.1** running, but **`mercato-redis-local` had exited (255)** and, behind it,
**`mercato-mcp-local` was `unhealthy`** with a healthcheck `FailingStreak` of **1446** and a log reading
`getaddrinfo ENOTFOUND mercato-redis-local`. So the count read "seven up" — and eight *rows* existed all
along. **A row count is not health.**

**Root cause, measured three ways.** `redis` was the **only** service in
`docker-compose.fullapp.yml` with **no `restart:` policy** — every other service carries
`restart: unless-stopped` (verified directly from `docker inspect .HostConfig.RestartPolicy`, not from the
file's prose). `mcp`, `app` and `opencode` all declare `depends_on: redis: condition: service_healthy`, so
with redis down the MCP could never finish starting.

**The fix and the proof.** Added `restart: unless-stopped` to the `redis` service (with the reasoning in a
comment), ran `docker compose up -d redis`, then `docker restart mercato-mcp-local`. Verified by two
independent routes: **(1)** all **8 containers healthy** — MCP `FailingStreak 0`, log
`Tools registered toolCount=21`, `Server listening port=3001`; **(2)** the app's `/login` returns **200**
and the model's `/v1/models` returns **200**, with **no redis errors** in the app log.

**What the defect taught.** The documentation had carried "8 containers up" for two days as an
*observation*. It was a **measurement of the wrong thing** — a count, when the claim should have been
about health. The claim was corrected everywhere it lived: `HANDOVER.md` (§0 check now demands the
**Status** column, not a count; §7 Group A; §7 "proven"), `RUNBOOK-sprint0.md`, `NEEDS-YOU.md`,
`BACKLOG.md`, `BLOCKERS.md` (resolved table), `INDEX.md`, and a new `workspace/COOKBOOK.md` section.
The fix itself is one line in the code repo.

**What the re-run did *not* do.** It did not touch **B-16** (no embeddings endpoint — still open, still
root-caused as two defects), and it did not exercise a **real host reboot**; the restart policy is the
mechanism that makes a reboot safe, and it is now correct in the file, but the reboot itself is not proven.

---

## 2026-10-06 — the second Paperclip pass, and a file the extractor had lost

**The owner asked for a second, wider study of Paperclip: extract the archive, read it again — every
functionality, code, idea, flow and concept — and find anything that adds value or inspires an idea,
documenting it only if there is.**

**The answer is yes, and it is not where Paperclip's own README points.** Almost everything Paperclip
*advertises*, we already have or already plan. What is worth taking is **how** it does the things we have
only described. The study ([`library/paperclip-value-study/`](library/paperclip-value-study/), 12 batches)
ends at [`findings/07-synthesis.md`](library/paperclip-value-study/findings/07-synthesis.md): **six things
worth acting on, four of our items confirmed correct, eight rejections with a reason each, and a trap
list.**

**Two findings changed words we had already written.** First, **`ML-4` promised a mid-run stop we have not
built.** Paperclip built exactly this, and its design records spend *first* and judges it *after*, so
crossing a budget pauses the scope and blocks future admission while the code that cancels work already in
flight is an **optional hook** that one service of six supplies. Our item now says what it can deliver.
Second, **we had never drawn the orchestration boundary** Paperclip drew explicitly and refused to cross
(*"a second orchestration system inside the product"*). It is now **N-15**, to be written before `AH-3` is
built.

**The strongest idea in the study is the responsible-user intersection:** an agent acts *on behalf of* a
person, and its authority is the intersection of its own permissions and that person's, decided **inside
the single decider** rather than at each call site. We already hold the rule in our own words; this is the
place to put it. It lands on **`S-02`**. `AH-8` and `AH-9` were confirmed correct, and both now carry the
mechanism that was missing from our item text.

**Three genuinely new ideas**, all on the "do not lose this" list rather than the roadmap — the fourth new
item is the boundary rule above (**N-15**). They are: the **self-modification gate** (**N-16** — a diff, an
accepted interaction, and application only in a separate run, with an evidence floor), the **memory control
plane** (**N-17** — extending the tenant-scoped provider we already designed to a policy over several), and
the **plugin capability model** (**N-18**).

**The study's own evidence base had a defect, and measuring found it.** The first extraction produced
8,299 files against the archive's 8,300, and the first pass attributed the gap to *"a single symlink
Windows will not create"*. That was wrong: the archive holds **two** symlinks and **both are present** in
the tree, and the real gap was **one missing file** —
`packages/db/src/migrations/0118_pipeline_case_agent_fanout.sql`, 346 bytes. Restored from the archive
byte-for-byte. The tree and the archive now agree **exactly** at **8,300 files / 132,839,980 bytes**, by
two independent routes.

**The critic pass also found two false claims in the study's own findings** — both "we have nothing"
statements about things we do in fact have (the agent-learning prohibition, and a designed tenant-scoped
memory provider). Both are corrected in place, with the measurement that disproved them, rather than
quietly edited.

**The owner answered the three open items.** Docker Desktop auto-start is **on** and Docker is running
(seven containers up, server 29.8.1), so **`S0` is unblocked** — and it now has one thing to explain:
`mercato-mcp-local` reports `unhealthy` while the other six are healthy. The 3.8 GB installer is
**deleted**, confirmed two ways (no `.iso` remains but the 67 KB cloud-init seed, and `C:` is at 86 GB free
against 82.74 GB). The Coolify password stays open by his choice.

**No code changed, so the code repository has no commit.** Committed in Repo 1 (docs), staged by explicit
path, never `git add -A`.

---

## 2026-10-05 — the model default is decided, and the documentation a new agent needs now exists

**The owner approved the model-layer recommendation and asked for four things: follow it, map the
Hermes agents / personas / profiles onto tenants and roles, record two requirements for the
open-source lane, and sweep the documentation so a new agent gets the full picture.**

**The decision: per-tenant policy is the destination, cloud-first is the interim.** Recorded as
[`library/development/ARCHITECTURE-model-server-integration.md`](library/development/ARCHITECTURE-model-server-integration.md)
**§9**, "DECIDED by the owner, 2026-10-05". It turns three pieces of work from *nice* to *required*:
the model registry, the Hermes **agent / persona / profile** mapping, and platform-managed local
models. Item 13 of [`NEEDS-YOU.md`](library/development/NEEDS-YOU.md) is closed.

**The two owner requirements.** First, the open-source lane must **not reserve a vendor's settings**
(the example given: OpenAI's), because we will integrate several suppliers and open-weight models;
written into **§4.2**, and general to every provider. Second, the platform must be able to **choose
which local (llama) model runs**, per the deployment's hardware and per new model releases; written
into a new **§6.4**, "Managing the local model from the platform". The Hermes mapping intent is in
[`library/development/AGENT-HALF.md`](library/development/AGENT-HALF.md) §5.

**The critic passes on the model document converged: eight passes, sixteen changes, and the tenth
pass found nothing new.** The sharpest finding was a "fix" that was itself wrong — a previous pass
called a runbook sentence false when the same change had rewritten the entry it was looking for. Two
routes disagreed, and that disagreement exposed it. Every finding was corrected in the text, none
defended.

**A new navigation layer now exists.** [`library/development/BOOKMARKS.md`](library/development/BOOKMARKS.md)
is the one-page short list: the documents that matter, the **end-game / vision** documents, the two
integration designs, and an honest list of which folders are in git and which are not. The root
[`INDEX.md`](INDEX.md), [`library/INDEX.md`](library/INDEX.md),
[`library/development/README.md`](library/development/README.md) and `HANDOVER.md` (revision 8) all
point at it. This session's reasoning is written down in
[`library/development/THREAD-2026-10-05.md`](library/development/THREAD-2026-10-05.md).

**Two folders the design cites were sitting untracked, and that is fixed.** `llama/` (the eight
documents the model-layer design was built from) and `analysis/` (the earlier Hermes / Starting Kit
study) are now **tracked**; the Hermes source at the repository root is now **ignored**, matching its
library twin. An our-call, reversible with `git rm -r --cached analysis llama`.

**No code changed, so the code repository has no commit.** Committed in Repo 1 (docs), staged by
explicit path, never `git add -A`.

---

## 2026-10-05 — the agent study is finished, and the scattered documents have one home

**The owner asked for two things: finish the forensic study of Paperclip and Hermes — batches 04 to
10 — and gather the documents scattered across the laptop into one place in the library.**

**The study is complete: 11 of 11 batches, 3,931 lines.** Its deliverable is the synthesis at
[`library/paperclip-hermes-study/findings/10-lessons-and-target-design.md`](library/paperclip-hermes-study/findings/10-lessons-and-target-design.md)
— every lesson with its evidence and its consequence, and each of the owner's twelve named concerns
(assistant agents, solo agents, roles, delegation, event triggers, recurring work, meetings, joining an
existing thread, skills, memory, models, MCP) answered in four voices: what Paperclip does, what Hermes
does, what the sibling's integration did, and what we should do.

**Three findings changed what we would build.**

1. **"Session resume is broken" is our defect, not Hermes'.** The capability exists — Hermes continues a
   transcript through `POST /api/sessions/{id}/chat`. Batch 07 contradicted the claim, and it is now
   recorded as *not an issue* so nobody re-raises it.
2. **The warm-session hazard is stronger than the dossier said.** The sibling's own note said a write
   underneath a session Hermes already holds *"may not be seen"*. Measured: **it will not be seen.**
   History loads only on a cold restore, and warm sessions are never evicted on a timer. This is the one
   place our architecture can beat both: because Hermes runs **in-process** for us, we can write
   *through* the runtime's session path instead of underneath it — which a pure HTTP control plane
   cannot do.
3. **A new defect in the sibling's proof script.** It calls `SessionDB.list_sessions`, which does not
   exist on either Hermes tree — only `list_sessions_rich` does.

**And the study found the gap that matters most: neither system has a meeting.** Paperclip has no room,
channel or meeting entity at all — every conversation is 1:1 or one thread against one task, and an
agent is pulled into a thread only by assigning it work. Hermes, meanwhile, already ships **hosted
rooms** with a 128-member limit and replica takeover. That combination is our opening.

**One decision came back to the owner.** The study carries lessons, not decisions — with exactly one
exception: whether an assistant agent is *identity* (it belongs to Alice) or *context* (it acts as Alice
for Alice's work). Paperclip chose context. It is item 8 in
[`library/development/NEEDS-YOU.md`](library/development/NEEDS-YOU.md).

**The scattered documents now have one home.** `library/ai/source-docs/` holds the one set with no other
consolidated home — upstream Paperclip's 317-file documentation — beside a **tracked register** saying
where every other scattered set already lives and why it was not copied. The copies follow the project's
standing rule and are gitignored; **exactly one file is tracked.**

**The work was audited by a separate hostile pass, which found four defects — all fixed.** An
over-stated *"exactly one item is open"*; a code citation that was correct in one Hermes tree and wrong
in the other; and two stale library file counts (the file said 2,440 and then 3,121 against a real
**3,439**). The four are now lessons in [`LESSONS.md`](LESSONS.md) — **L80 to L82**.

**Verification.** All 299 local links across the 13 changed documents resolve. All ten per-batch line
counts were re-measured and are correct. The 521-document shelf count was re-measured and is correct.
Committed as `59c109a`.

---

## 2026-10-04 — part 1 of 8 (newest first) — the infrastructure answer, and a defect whose recorded cause was wrong

**The owner asked two things: whether we have everything needed to deploy and test the codebase, and
to leave no gaps, flaws, bugs or incomplete work while getting there.**

**The infrastructure answer is: built and proven, but not running — and the agent cannot start it.**
The Sprint 0 stack is complete and was proven working earlier today (eight services healthy, 21
platform tools discovered). Nothing is missing: the compose file, the model file, `.env` and Node 24
are all in place, and the database is provided by the stack rather than installed on Windows. What is
*not* in place is a running Docker engine. Chasing that produced the session's most useful finding:

```
$ docker desktop start
PROGRAM BLOCKED BY SECURITY POLICY - the sandbox prevented a program on the configured
Program Blacklist from starting:
  - wsl.exe (C:\WINDOWS\System32\wsl.exe)
```

Docker Desktop's startup path runs `wsl.exe`, and this machine's security policy blocks it for
anything the agent launches. The block is not approvable and must not be worked around. **So "start
Docker Desktop" is a permanent owner step, not a one-off** — and `AutoStart` is off, so it recurs on
every restart. Recorded as **B-04**, rewritten, precisely so a later session does not read it as the
agent having failed.

> **Update, 2026-10-06.** The owner turned Docker Desktop **auto-start on**, so the second half of that
> is no longer true: it no longer recurs on every restart. **The first half still is** — the agent
> cannot start Docker Desktop, and never will, because that is a security-policy block and not a
> setting. See `NEEDS-YOU.md` item 6 and `RUNBOOK-sprint0.md`.

**Then the defect, and the uncomfortable part: the recorded cause was wrong.** B-15 said `mercato
init` "printed `❌ Initialization failed` yet **exited 0**", so the fix looked like it belonged in the
CLI. It does not. The CLI's catch block returns 1 and `bin.ts` calls `process.exit(code ?? 0)`, and
the CLI's **own tests assert `toBe(1)`** — two independent routes, both saying the CLI was honest.
The dishonest code was `init-or-migrate.sh`, in two lines:

```sh
if sh -lc "${COMMAND}" >"${LOG_FILE}" 2>&1; then
  return 0
fi
STATUS=$?          # always 0
```

The exit status of an `if` with no `else` whose condition failed is **0**, so every failure was
reported to the caller as success and the "already seeded" marker was written anyway. The same
mistake appeared **a second time** at the bottom of the same script, and a third variant lived in
`dev-entrypoint.sh`, where a function opening with `set -e` was called as `if ! (run_setup)` —
and **errexit is ignored for a function invoked as a condition**, so that guard was dead code.
Three defects, one family, all measured in both `sh` and `bash`.

**All three are fixed, and the fix is proven rather than asserted.** Two tests that need no Docker:
`init-or-migrate.test.sh` (**7 passed / 3 failed** against the unfixed script, **10 / 0** after) and
`compose-init-guard.test.sh`, which extracts the *real* `command:` block out of the compose file and
runs it against stubs (**3 failed** on the old text, **6 passed** on the new). Both were deliberately
run against the broken code first — a regression test that passes before the fix is not testing the
fix. **One recorded instruction was deliberately not followed:** B-15 said to treat "a printed
failure" as failure too, but the string `❌ Initialization failed:` also wraps the *"database already
has users"* message, which must be treated as **success** — a text match would have broken that
recovery path. The status capture was the fix; the tests pin the already-seeded path as a success.

**A correction I had to make to my own work, twice in one session.** The `.wslconfig` I applied
earlier today capped WSL at **12 GB**. A measurement already sitting in the runbook settles it — the
*model container alone* uses **~10 GiB** of a Docker VM that was **15.56 GiB** — so the cap would have
starved the stack, and the symptom would have been containers OOM-killed mid-run, which reads as a
code bug. Raised to 16 GB, the ceiling the stack was proven to work at. The file now records the
budget and notes that a ceiling is a ceiling, not a reservation.

**The blockers list had drifted.** B-01, B-02, B-03 and B-04 were still listed as 🔴 OPEN while the
same file's Resolved table said all four were cleared — in a file whose own rule is "a blocker is a
claim about now, not about last time". Rewritten: five open, and only **B-04** actually stops work.

**What this means for the owner.** One action: start Docker Desktop. Everything else in the
deployment path is either proven or now has a test.

---

## 2026-10-04 — part 2 of 8 (newest first) — the deployment path is proven: domains, directories, databases, phpMyAdmin

**The owner asked to keep going until he could add domains, put code in directories, create linked
databases and open phpMyAdmin — so he could test his own WordPress sites and then a Docker platform on a
subdomain.** The environment was already built; what was missing was proof that a *site* can be served.

**What was in the way, and what I did about it.** Coolify's API exists and can create services, but it
needs a Sanctum token, and 2FA now blocks scripted UI login. I could have minted a token by writing into
`personal_access_tokens` — and decided not to. The asymmetry settled it: if my proof stack were wrong we
lose a round-trip, but if I corrupted the auth tables of a dashboard the owner had just secured with 2FA,
he could be locked out. **So I proved the environment with compose and documented Coolify's own path,
rather than doing surgery on an auth system to save a click.**

**What is now proven with real traffic.** A throwaway stack (`/opt/companai-teststack`) reusing Coolify's
*own* Traefik and its `coolify` network:

- `Host: wp.test` → WordPress, redirecting to its installer.
- `Host: pma.test` → a **full phpMyAdmin login**: `pma.test / mariadb | phpMyAdmin 5.2.3`,
  `Server: mariadb:3306`, both databases listed, live session.
- `Host: app.test` → a separate container; and `Host: wp.test` **+ `/files/hello.txt`** → that same
  container, *not* WordPress. That is the "code in a directory under a domain" case.
- A second database created beside the first, written to, and read back **by name** from another container.

**The most useful thing found, though, was in Coolify's source.** The Domains field is not just a
hostname: `fqdnLabelsForTraefik` parses `scheme://host[:port][/path]`, and **the scheme decides TLS** —
`https://` adds `tls=true` and a Let's Encrypt resolver, `http://` adds neither. So for `.test` names you
must write `http://`, and a **path in the domain entry is Coolify's own built-in way** to serve code from
a directory. That turns the owner's requirement from something to be engineered into something to be
typed.

**Verification.** An independent critic agent re-measured all eleven claims from scratch and refuted
none; it found two extra things on its own — a phantom port 8080, and Coolify's catchall router not
taking effect. Both are recorded.

**And I caught a false negative of my own.** I first reported that phpMyAdmin could not reach the
database. It could. My test used `/dev/tcp`, which does not exist in `dash`, so the probe failed and I
nearly wrote that up as a finding. Re-tested with the PHP runtime phpMyAdmin itself uses: OPEN. Written
up as [[L62]] — a failing probe is not a finding until you know the probe works.

---

## 2026-10-04 — part 3 of 8 (newest first) — 2FA verified, the exposed password tested, and the WSL cap applied

**The owner asked "what's next?" and reported 2FA done.** Instead of accepting it, I re-measured, and
the round produced three things worth recording.

**1. 2FA is genuinely on, confirmed two independent ways.** The database says
`users.two_factor_confirmed_at = 2026-10-04 12:44:46` with a secret and recovery codes present. And a
*live* login attempt now returns `302 -> /two-factor-challenge`. Two routes, same answer — which is the
standard this project is held to.

**2. The exposed password is still live.** That same login attempt is what proved it: Fortify only
reaches the 2FA step when the credentials pass, so `302 -> /two-factor-challenge` means the password
that was typed into a chat message **still authenticates**. 2FA is the only thing protecting the
account. It stays an open item and is now the owner's single remaining action.

**3. The `.wslconfig` deferral was based on a premise that turned out to be false.** The plan had
parked this change because "it restarts the dev environment". Measured before acting: Docker Desktop is
installed but **not running**, and the only WSL distro is idle. A `.wslconfig` only applies when WSL
next starts, so there was nothing to disturb and no `wsl --shutdown` was needed. The file was written
(12 GB / 4 CPU / 4 GB swap). `wsl.exe` is also blocked by this machine's security policy, so the
restart could not have been run from here anyway.

**And I got a number wrong, then caught it.** I justified the cap with "WSL2's default ceiling is 80% of
RAM on Windows 10". Microsoft's current documentation says **50% of total memory**, no Windows 10/11
split; 80% is a stale figure still repeated across the web. The change was still worth making — 16 GB
of WSL plus a 6 GB VM is 22 GB of 32 — but the number carrying the argument was wrong, and it is
corrected in the file header, the runbook and the plan. Written up as [[L61]]: if a number is the
reason to act, read the vendor's current page.

**Verdict on the build:** the environment is complete. What remains is one 30-second owner action (the
password), one untested behaviour (a real *host* reboot — the auto-start policy reads
`Start / delay 30` but has never been exercised), and decisions that belong to the application phase.

---

## 2026-10-04 — part 4 of 8 (newest first) — the hosting environment is built, and it is real

**The instruction was: engineer the environment, don't ruin the laptop, and keep a supervisor on
every step.** So this was done in phases, each one verified by an independent agent before the next
began. Two of those verifications found real defects — which is the whole reason for having them.

**The install stopped and waited for a person.** The autoinstall seed *was* found — the VM console
showed subiquity walking through every `apply_autoinstall_config` step — but it then asked
`Continue with autoinstall? (yes/no)` and sat there for eight minutes with the CPU at zero. The seed
alone does not suppress that prompt; only `autoinstall` on the kernel command line does. Answering it
needed a keystroke, and **the obvious way to send one does not work**: `Msvm_Keyboard.TypeText`
returns `ReturnValue = 0` and types nothing. What works is pressing keys by their **virtual-key
code**. We only found that because of the control we ran — pressing **Enter and nothing else** made a
third prompt line appear, which proved input was arriving and isolated the fault to `TypeText`. Had
we not run that control, the conclusion would have been "keyboard input does not work on this VM",
and the fix would have been remastering the ISO. That is a much larger change to solve a problem
that did not exist. **L59.**

**Reading a screen that has no screenshot API.** Hyper-V has no `Get-VMScreenshot`. The console image
comes from a WMI call that returns a raw RGB565 framebuffer. We rendered it to PNG and read it — and
that is how the blocking prompt was found at all, and how we confirmed the `yes` landed.

**The supervisor found a defect in what I had just declared done.** I had set the hard disk first in
the boot order and reported it as verified. It was not: `BootType -eq "Drive"` matches a **DVD** as
well as a hard disk, and the entry I moved to the front was the *empty DVD drive*. The VM still
booted (an empty DVD falls through), so nothing looked wrong — but re-inserting any ISO would have
booted the installer again, exactly the loop the plan set out to prevent. Fixed by discriminating on
the device type. **This is the class of error the plan's "verify before proceeding" rule exists to
catch, and it was caught by someone re-measuring rather than by me re-reading my own work.**

**Coolify is up, and its installer is honest about what it checks.** Docker 29.8.2 and Coolify 4.3.23
went in cleanly; six containers, all genuinely healthy; dashboard on 8000, Traefik on 80/443. We
proved persistence properly — **rebooted the guest and all six came back**, including the sentinel
whose `RestartPolicy=no` looked like a defect but turns out to be by design (the Coolify app manages
it). And the pre-seeded admin account **failed validation**, in Coolify's own words: the email must
pass `email:rfc,dns` (the domain has to actually resolve) and the password must contain a symbol. So
the account is left for the owner to create in the browser — it is his identity, and 2FA is
browser-only in any case. The three variables that claimed otherwise are now commented out rather
than left lying in the config.

**A small thing with outsized consequences: the address moves.** After the reboot the VM's DHCP
address had changed from `172.19.120.91` to `172.19.122.65`, so SSH failed and the VM looked dead for
three minutes. It was not. The stable address is the **static** `172.28.50.2` on the second NIC — and
the only reason the host cannot use it yet is that **Phase 6 has not been run**. That turns a
two-command firewall step from a nicety into the thing that makes the environment pleasant to use.

**Where it stands.** The environment exists and works: a real Ubuntu 24.04.5 guest on its own disk,
Docker and Coolify running, containers that survive a reboot, the dashboard reachable from the laptop,
82.74 GB still free (the stop line is 60). It is written up in
[`library/development/RUNBOOK-platform-server.md`](library/development/RUNBOOK-platform-server.md).
**Two things are left and both need the owner:** one elevated run for Phase 6, and creating the
Coolify account. Neither is blocking anything else.

**Both were done the same afternoon.** The owner ran the elevated script and created his account. And
then the interesting part: **the link was proved with traffic rather than a config read.** It would
have been easy to tick the box on the two `Get-Net*` outputs. Instead a listener was started on the
host bound to `172.28.50.1:8080` and the guest was pointed at it — `HTTP 200`, with the host's own log
recording the client as `172.28.50.2`. That is the difference between "the rule exists" and "the path
works", and only the second one is worth anything.

**The same check also caught a criterion in my own plan that was wrong.** It said "the VM pings the
host". Ping returns 100% packet loss — Windows Firewall drops inbound ICMP by default and the rule
deliberately allows only TCP 8080. Nothing is broken; the test was. Had we trusted it, we would have
gone hunting a fault that did not exist.

**And one false alarm of my own, worth recording as L60.** Checking which SSH account Coolify would
use, I queried its `servers` table and read `user = coolify`, found no such account on the machine,
and concluded the connection was misconfigured. It was not. **`user` is a reserved word in Postgres**
— bare `select user` returns `current_user`, so I had read the *database role* back, not the column.
The real value is `root`, and `root@host.docker.internal` connects. The wrong answer was plausible
enough to have gone unnoticed: `coolify` is exactly what you would expect in a Coolify database, and
every neighbouring column was correct. What broke the story was *trying* the connection instead of
describing it. **The rule: when a value looks like it might be about the tool rather than the subject,
check that you selected what you meant — and settle a finding that would send someone off to fix
something by a second, independent route.**

**A pleasant side effect:** Phase 6 gives the host a *stable* address for the guest. `172.28.50.2`
never changes, so the dashboard is now bookmarkable at `http://172.28.50.2:8000` — while the DHCP
address had already moved once that day.

---

## 2026-10-04 — part 5 of 8 (newest first) — a verified backup, and the model 46% faster

**The owner asked for a full codebase zip before any further change, and it had to be flawless.**
Saved to `C:\Users\Ramzi\Downloads\companai\starting-kit-codebase-backup-2026-10-04.zip`:

- **4,889,632,988 bytes** (4.55 GB); **SHA-256 `8fb277ba5eab8d62a5947c290a57d52aec3248ed01a1daee7394b9203172c31c`**.
- **23,249 files**, 5,105,209,091 bytes uncompressed.
- **Excludes only two things, both regenerable:** `node_modules/` (deps — `npm ci`) and
  `apps/mercato/.mercato/` (the Turbopack cache already known corrupt, blocker **B-08**). Everything
  else is in, including `models/` (the 4.4 GB GGUF) and `.git/`.
- **Verified three ways:** `7z t` → *"Everything is Ok"*; the archive's file list diffed against the
  on-disk list → **0 missing, 0 extra**; and the byte totals agree exactly on both routes
  (5,105,209,091). Not assumed — measured.
- **A note on the project's own rule.** Rule zero-four says *source is not copied, because git is a
  better restore point*. It is right in general — but the tree has **5 uncommitted files**
  (`.dockerignore`, `.gitignore`, `Dockerfile`, `docker-compose.fullapp.yml`, `package.json`) and the
  last commit is **2026-08-13**, so no tag captures the present state. The zip is genuinely useful
  here, and the owner asked for it explicitly.
- **The tool mattered.** `bsdtar` (the Windows `tar.exe`) archived at **~220 KB/s** — hours for this
  tree. **7-Zip did it in ~3 min 52 s** (~12–24 MB/s, multi-threaded). Both are installed; use 7-Zip.

**Then the model.** Answering the owner's question — *"isn't Qwen2.5-7B too big for fast testing?"* —
**yes, on this laptop's CPU**, and the first fix was free. The container is given **8** CPUs but
llama.cpp defaulted `-t` to the **4 physical** cores, so half the machine sat idle. Measured with a
direct `/completion` call: ingest **13.2 tok/s**, generation **3.9 tok/s** at the default. Set
`-t 4 -tb 8` (more threads for the compute-bound prompt ingest, fewer for the memory-bound
generation) → ingest **19.3 tok/s (+46%)**, generation **4.6 tok/s**. Recorded as **L58**. The
remaining levers, in order: don't ship all 21 tool schemas when only testing the model; then a
smaller model (3B ≈2.3× faster). **GPU offload is not the fix** — the Quadro M2000M has 4 GiB, which
cannot hold the model *and* the 64K KV cache.

**One accuracy correction to an earlier claim.** The loopback port fix was *written* into the compose
but the running containers predated it: `docker ps` showed `0.0.0.0:8080`. Recreating the model
service applied it — it now reads `127.0.0.1:8080->8080/tcp`. **App and Hermes are still on `0.0.0.0`**
(they have not been recreated yet).

---

## 2026-10-04 — part 6 of 8 (newest first) — the trio runs; five defects fall out of it

**Sprint 0's stack is up.** `docker compose -f docker-compose.fullapp.yml up -d` brings up eight
services — platform app, `mcp`, `opencode`, `postgres`, `redis`, `meilisearch`, the local
`model` server and `hermes` — all healthy, on one file, parameterised only by `DEPLOY_ENV`.

**Then the proof, and the defects.** Bringing it up honestly turned out to be the whole exercise:
five separate faults sat between "the file parses" and "the agent can call a platform tool", and
each one *looked* like success from the outside. All five are now fixed and written up as **L52–L57**
in [`LESSONS.md`](LESSONS.md):

- **A default that was not a default.** `NODE_OPTIONS: ${NODE_OPTIONS:-…}` interpolated the *host's*
  Windows-only preload path into the app container, which crash-looped. The neighbouring `mcp`
  service survived only because it used a differently-named variable. Fixed by renaming to
  `APP_NODE_OPTIONS` — **never default a compose value from a variable the host may own** (L52).
- **A marker that lied.** The database had **zero users**, while `/tmp/init-marker/.seeded` told every
  later run "already seeded". `mercato init` had *printed* `❌ Initialization failed`, and the script
  wrote the marker anyway; because the compose command did not check the init step, the app then
  started and looked perfectly healthy (L53, L57). Tracked as **B-15**. *(Corrected 2026-10-04: this
  entry first said the CLI "still exited 0" — it did not, and that wrong cause aimed the fix at the
  wrong file. The real fault was in `init-or-migrate.sh`; see part 1 of 8.)*
- **A config file the program owns.** I hand-wrote Hermes' `config.yaml`; Hermes **overwrote it on
  startup**, so its log contained not one MCP line. Configure Hermes only through `hermes config
  set` / `hermes mcp add` (L54).
- **The wrong auth form.** Hermes stores `Authorization: Bearer …`; the platform's MCP accepts only
  `x-api-key: …` or `Authorization: ApiKey …` (`lib/auth.ts:157-192`). One header, and **arrow (1)
  connected: 21 platform tools discovered** (L55).
- **A capacity flag that was silently capped.** Hermes requires a **64K** context window; `-c 65536`
  *looked* like the fix, but llama.cpp logged `the slot context (65536) exceeds the training context
  of the model (32768) - capping` and served 32768. YaRN RoPE scaling is what actually admits 64K —
  confirmed from the server's own log, not from the flag (L56).

**Two design corrections, both mine.** Sprint 0 had been mounting the owner's **personal** Hermes
home (`~/.hermes` — 555 MB of state) into a disposable container, and Hermes warned that WAL-mode
SQLite on a Windows bind mount *can silently corrupt the database*. It now has its own named volume,
the fix Hermes' own message names, and **the owner's config was verified undamaged**. Separately,
`.env` was setting `MCP_SERVER_API_KEY`, which **does not set the MCP's key** — the `mcp` service
generates its own — and because `opencode` prefers the env var, that stale value was making opencode
authenticate with the wrong key. Removed.

**A finding worth acting on, not a defect.** CPU-only, this laptop ingests Hermes' prompt at ~13
tokens/s and that prompt is ~15,700 tokens, so one agent turn spends ~20 minutes just reading its
prompt. That is the honest cost of the 64K floor on a CPU 7B — the answer is GPU offload (the
machine has a Quadro M2000M) or a smaller tool surface.

---

## 2026-10-04 — part 7 of 8 (newest first) — a specification corrected

**The owner caught an inaccuracy.** Sprint 0's research table had recorded the laptop as
"RAM 31.9 GB, 8 cores". Both numbers were measured, but both are the operating system's
*derived* readings: 31.89 GB is the memory Windows can *use* once the integrated graphics
reserve their share, and "8" is the **thread** count, not the core count. The specification is
**32 GB RAM** (2 × 16 GB DDR4-2133) and **4 cores / 8 threads** (Intel i7-6820HQ), on a
**Dell Precision 7510** (hostname `BIXMASERVER`).

Corrected in `workspace/COOKBOOK.md` (Sprint 0, Step 1) and `library/development/README.md` —
which now carries the machine's measured specification for handover — and written up as **L50**
in `LESSONS.md`: *a true number attached to the wrong word is still a false claim.*

---

## 2026-10-04 — part 8 of 8 (newest first) — the analysis programme closes, and a development hub opens

**The 12-batch analysis programme finished.** Batches 0–12 mapped the vision (468 statements
across eight documents) against Hermes and the Starting Kit, and turned the result into a
development plan. The headline: **of 140 requirements, the platform covers 20, partly covers
50, misses 64, and conflicts with Hermes on 3; Hermes is the wrong place to look for 85 by
design.** The one-line answer: **the platform half is bought, the agent half is borrowed, and
the product half — the model spine and the data-level security — is neither, and must be
built.** The plan lives at
[`library/analysis/findings/12-development-plan.md`](library/analysis/findings/12-development-plan.md).

**Then the owner gave six instructions, and this is the day they were answered.** The point of
all six was the same: **stop letting things live in reports and in memory.** So:

**A development hub now exists — [`library/development/`](library/development/README.md).** Four documents, and
it is the place to start:

- **`BACKLOG.md`** — **the one roadmap.** It unifies the five remaining Starting-Kit items with
  the four product phases, and adds a **"do not lose this"** list for the remarks that used to
  live only in a report — the phase tests not yet written, the vocabulary register, the five
  missing resolver inputs. `workspace/PROGRESS.md` and `where_we_left.md` are now banners
  pointing here; both had already flagged themselves as broken or stale.
- **`ARCHITECTURE.md`** — how the Starting Kit, Hermes and the model server run together, and
  **the dockerisation decision**.
- **`README.md`** — the reading order, what to study first by role, and the handover sequence.
- **`QUESTIONS.md`** — a temporary file holding every open question for the owner. **It was
  answered the same day and deleted**, exactly as promised.

**All of it now lives in the library, not at the root.** The hub was first written at
`development/`, then moved to **`library/development/`** — the owner's rule is that generated
documentation belongs in the library, in the right shelf, beside `ai/` and `analysis/`.

**The owner answered the questions the same day, and every recommendation was adopted:** the
**object list** starts from the union of 37 and is pruned by the specification; **Hermes** is the
agent runtime and **OpenCode is removed**; the first model is a small instruct model; the laptop
budget is 16 GB; the **secrets** rule is confirmed (tenant secrets never enter a Hermes home);
**RLS** is confirmed as a derived backstop; and the **model default** is default-deny.

**The dockerisation decision, taken.** The owner asked me to decide when. **Answer: now — as
Sprint 0**, in parallel with the kernel specification. The reason it is cheap: the Starting Kit
**already ships a dockerised, `DEPLOY_ENV`-parameterised stack** (`docker-compose.fullapp.yml`)
that brings up the app, its MCP server and an agent runtime. So this is *finishing* something
that exists — adding Hermes and the model server, and proving the two arrows work. And
local-first plus cloud-ready comes free, because the same file already targets both.

**Two rules were promoted from the analysis programme into the cookbook:** rule zero-nine
(*measure from the artefact, not the description of it* — the extract beats the document, and
every number gets two routes) and rule zero-ten (*research, validate, write the steps, then
build* — the owner's instruction that no sprint starts without knowing what already exists).

**What is next.** Sprint 0 (the running trio) and the Business Model Kernel specification.

---

## 2026-08-13 — four governance screens, and one capability that did not exist

Item 21 asked for screens over the governance features that shipped with an API
and no page. Four are now built — delegations, denials, trust, projects — and
each one turned out to be a design decision rather than a rendering job.

**None of them has a create form, for four different reasons.** Delegations need
a person picker and a capability picker, and guessing at those is worse than
leaving the API as the path. Denials can already be lifted from the list, which
is the control that matters. Trust promotion is refused unless the *evidence*
passes, so a Promote button would spend its life returning 409 and teach people
the screen is broken rather than that the bar has not been met. Projects are
three separate acts -- create, add a member with an overlay, assign records --
with three different blast radii, and one form covering all three would have an
effect class that depends on its body. Each page says which of these applies to
it, so the absence reads as a decision instead of an omission.

**Every list keeps what ended.** Revoked delegations, lifted denials, closed
projects. The question these get asked is *"why could Sam not do that in
March"*, and a list of what is in force today cannot answer it.

**Projects had no capability at all.** Not a missing screen -- a missing
permission. `auth.projects.manage` is new, at E5 alongside delegation and
denial: a project grades the work inside it and can narrow what its members may
do there, so setting one up changes the rules for every record assigned to it.
Not delegable, because the power to define where the rules are looser is not
something to lend for a fortnight. Existing tenants need no ACL sync -- admin
already holds `auth.*`, and the wildcard covers it.

The counts on that page come from a new `ProjectService.summaries()` kept
deliberately apart from `contextFor()`. `contextFor` sits on the decision path
at two indexed reads; anything that counts rows must never become reachable
from the resolver.

**What is left of item 21 is record locks**, and it belongs on each record's own
screen rather than a list of its own -- per-entity work, the biggest of the
five.

Verified the way everything here now is: `yarn test` at 22/22 with `Cached: 0`,
`yarn typecheck --force` at 20/20 with `Cached: 0`. The forced typecheck is not
optional any more -- see L45.

---

## 2026-08-12 (late night) — looking at the rebrand, not just testing it

The owner asked me to rebuild and check the white-labelling in the browser. Every
routing claim held — `/` redirects to the login, `/start` and the autologin route
both 404, the backend and API docs render zero *mercato* mentions, and the terms
page carries no company name, no registration identifiers and contact on
`corprorate.com`.

**Three defects were only findable by looking**, and all three had passed a green
gate:

**The logo was cropped and squashed.** `AppShell` applied `rounded-full` — masking
a *circle* out of a mark that fills its canvas — and `object-fit: fill`, stretching
448×473 into a 40×40 box. Three call sites. What makes it worth recording is that
it was never a Companai problem: that treatment **crops and stretches any tenant's
uploaded logo**, which is two defects wearing the costume of a style.

**The `.ico` was dead weight** — I had copied it into `public/` and never
referenced it, because `layout.tsx` named only the SVG. Placing a file is not
wiring it up.

**The description still sold upstream's product** — a "modular ERP foundation".
The rename caught every occurrence of the *name* and none of the *positioning*,
which is the same blind spot as L41 in a milder form: a global replace sees
strings, not meaning.

**What I could not check, and said so:** the login page. I am signed in, and I do
not type passwords into forms, so I cannot reach it. Its source matches the
content-header pattern that renders correctly — verified by analogy, not by eye,
and recorded that way rather than rounded up.

**Gate: 22/22 tasks, 12,867 tests, exit 0.**

---

## 2026-08-12 (night) — Companai, and the rename that invented a company

**The product has a name and wears it.** 169 files: tab title, favicon, app
shell, API docs, content pages, CLI, four locales, and the `create-app` template
throughout so generated apps are not born branded. The owner's decision — keep
the internal `@open-mercato/*` names, rename everything a user can see — was
enforced by protecting the namespace *inside the rename script*, rather than
trusting myself to avoid it by hand.

**The legal pages were replaced, not renamed**, and the owner accepted the
reasoning after offering both options. 667 lines of another company's privacy
policy and terms — registered address, KRS, NIP, REGON, share capital, governing
law. Rebranding would have bound our users under a licence drafted for a Polish
company nobody here has read. The replacements are short, name **the operator**
as responsible rather than us, and say the activity record outlives a closed
account: the one clause this product cannot promise away, because that record is
what other people relied on.

**And then I did the exact thing I had just refused to do.** The blanket rename
turned that company into **"Companai sp. z o.o."** — a limited company that does
not exist — still carrying their real registration numbers, inside a GDPR consent
statement, in four locales. Materially worse than the original, which at least
named a company that is real and accountable.

I had protected the *identifier* namespace, which is the mechanical risk, and
missed the *semantic* one: **text that is about the old name looks identical to
text that merely uses it**. It also rewrote my own doc comments into asserting
the opposite of their point.

**What caught it was upstream's own test.** `consent-controller-locales.test.ts`
existed to guard their registration identifiers; inherited into a fork it had
been quietly asserting that we impersonate them, and when my rename broke it, it
became the alarm. Recorded as **L41**, with the grep list — legal forms,
registration ids, addresses, `consent`/`controller`/`terms` — and a rule I did
not have: **read an inherited test failure before updating it.** A guard from
upstream can be the thing that catches a fork misusing their identity.

**The demo surface is gone.** `/start` and its 44 keys per locale; the feedback
bubble and its public endpoint; the demo notice bar; and autologin — which signed
visitors in **from a password in an environment variable**. That one was unset
and inert, and removing it was still right: a platform whose purpose is knowing
who acted has no business logging somebody in without asking who they are.
`DEMO_MODE` survives only where it means something else entirely.

**Gate: 22/22 tasks, 12,867 tests, exit 0.** Lint: 0 errors.

---

## 2026-08-12 (late) — U14 closes, and the Starting Kit has no known functional gaps

**Neither obvious answer was true**, which is why this one was worth doing
carefully. Saving a draft and sending it are the same command with a flag, and
the two acts are `E1 reversible internal` and `E3 irreversible external`. A
static `capability:` had to pick one: under-classify and the irreversible
external act stays ungated; over-classify and the audit record asserts that
saving a draft was irreversible. **A record that says something false is worth
less than no record**, and that is the premise of the whole product, so
over-classifying was not the "safe" option it looked like.

So `capability` may now be a **function of the input**. One call site reads it,
a plain string behaves exactly as before, and the four messages commands classify
per call — only an explicit `isDraft: true` takes the lower one, because compose
itself defaults an absent flag to sending.

**38% → 54% of live commands gated**, and `messages.email` finally binds to a
real act. The 26 that remain are per-actor read state, planner, scheduler,
example, dictionaries and translations — **no irreversible external act among
them**, which was the thing worth chasing.

**Two decisions kept.** A classifier that throws yields `null` rather than
propagating: the gate only narrows, so losing it costs a restriction, while
letting the throw escape would fail a write because of the attribute whose entire
purpose is holding writes back. And the parameter is typed `never` — typing it
`TInput` made every handler in the platform stop compiling (L40), which the
workspace typecheck caught and the package build did not.

**Gate: 22/22 tasks, 12,914 tests, exit 0.** Lint: 0 errors.

**Phase 1 and Phase 2 are now complete except the Arabic review**, which is the
owner's and blocks nothing. There are no known functional gaps in the Starting
Kit. What remains is Phase 3 onward — the deferred screens, the ledger work, and
the pre-hosting items — plus the white-label batch, which now has a name to
rename to.

---

## 2026-08-12 (night) — the bubble had a back end

**The owner asked me to delete the "Feedback" bubble** that points at the
upstream supplier. Following it to its back end is what made the task worth
doing:

```ts
export const metadata = { POST: { requireAuth: false, … } }
const adminEmail = process.env.ADMIN_EMAIL || '<a personal vendor address>'
await sendEmail({ to: adminEmail, … })
```

**Unauthenticated, sends email, defaults to a named individual outside the
organisation.** Anyone able to reach the host could make it send mail, and
whatever a user typed went to a third party unless `ADMIN_EMAIL` was set.

Honest about the mitigations: the route rate-limits, and our own
`deployment.md` already lists `ADMIN_EMAIL`, so a deployment following our guide
would not have mailed the vendor. It is still a public email-sending endpoint
pointed outside the organisation, in a product whose premise is knowing where
things went.

**Removed rather than configured around** — widget, the demo notice bar beside it
(which linked to the supplier's GitHub), endpoint, email template, tests, and 28
orphaned translation keys across four locales. Mirrored into
`packages/create-app/template` in the same change, which mattered more than the
rule usually does: a template still scaffolding the widget would have put it back
into every app generated from it.

`DEMO_MODE` now gates nothing in the app layer. It survives where it means
something genuinely different — locking attachment partitions, a branch in tenant
setup — and those were left alone. **Deleting a flag is not the same as deleting
a feature**, and conflating them would have changed two behaviours nobody asked
about.

**U16, found in the same sweep and not fixed:** our public `/privacy` and
`/terms` pages tell readers to contact `info@openmercato.com`. That is a
different category from a logo — legal pages are the one place a reader is
entitled to assume the named party is who they are dealing with. It goes to the
**top** of the white-label list rather than into the general pile.

**Gate: 22/22 tasks, 12,907 tests, exit 0.** The drop from 12,910 is exactly the
deleted demo-feedback tests.

---

## 2026-08-12 (evening) — O1 fixed, and the platform gets a name

**The session was interrupted mid-flight.** Nothing was lost: both repos were
committed clean beforehand. The server had not died either — the task tracker
lost its handle, and the platform's own single-instance guard correctly refused
my duplicate start, naming the pid still serving. A small thing that worked
exactly as it should.

**O1 fixed the same day I made it.** The audit write moved out of the API route
into `DenialService`, so no caller can forget it, and the route stopped writing
its own — which would have filed every act twice.

Verified by planting a denial straight into the database, so the CLI lift was the
**only** path exercised: audit rows went 2 → 3, with `actor_user_id` null and
`context_json` carrying `{"origin": "server-console", "actorKind": "system"}`.

The decision inside it: a console act has no `sub`, and that is the fact worth
**recording** rather than a gap to paper over. R1's principal vocabulary already
had the word. Marking it a `system` actor with its origin is honest; leaving the
field empty would make it read like an anonymous human, which is worse than no
entry at all.

One imperfection left deliberately and written down: the shared helper stamps
`source: "crud-route"` on every direct write, so a console act carries that label
beside its accurate origin. Changing the helper's default would touch every
direct write in the platform, which is not a thing to do in passing.

**The product has a name: `Companai`.** With it came the Mac/Apple direction,
permission to vendor any genuinely unrestricted asset, and permission to delete
supplier-facing things outright — the feedback bubble named explicitly. All of it
is in `references/whitelabel.md` rather than only in memory.

I recorded a recommendation on the one open white-label question: **keep the
`@open-mercato/*` package names and rename everything a user can see.** The
internal names cost nothing while upstream is still fixing bugs we would
otherwise fix ourselves; the visible ones cost the entire first impression.

**Gate: 22/22 tasks, 12,910 tests, exit 0.** Lint: 0 errors.

---

## 2026-08-12 (evening) — the question was wrong, and what was under it was worse

**U13 verified fixed**: the authority graph now reads *Acme Corp → Approval
Branch* instead of two UUIDs.

**Item 6 asked me to check two capability descriptors. Both turned out fine**,
and the checking found something much larger. `messages.actions` **is** enforced
by a route — the roadmap's premise was wrong. `messages.manage` is not, and its
own note already says so honestly.

**U14.** The command gate is keyed by capability, and `interceptors.ts` states
plainly that a command declaring none is not gated — *"the gap is visible rather
than guessed at"*. The mechanism was documented. **Nobody had measured the gap.**
Counting live modules only: **21 of 56 commands, 38%.** Twenty of the thirty-five
misses were in `messages`.

Five had an unambiguous answer and now declare one, taking it to **46%**. What
remains is a design question rather than typing: `compose`/`reply`/`forward`
carry a message from draft to *sent*, and a static `capability:` must choose
between under-classifying an external send and over-classifying internal notes.
I recommend the higher classification — permitting is the direction this design
never takes — and noted that splitting the send into its own command is the
better fix. That is a product decision, so it is named rather than settled
quietly.

**Tracing it was worth doing.** The send is five hops from the gate — command →
event → subscriber → queue → worker → `sendEmail()` — which looked structural at
first. It is not: nothing downstream fires until the command commits, so holding
the command does prevent the send. A mapping gap, not an architectural one, and
the difference matters for how it gets fixed.

**O1 — and this one is mine.** Reading the audit log while the gate ran, I found
two `authority.denial` rows for two creations and **nothing for the two lifts**.
The API audits both; the CLI recovery path calls the service directly and writes
nothing. So the act that **removes** authority is recorded and the act that
**returns** it is not — in the feature I built this morning, on the path
documented for when somebody is locked out.

It happened because the audit write lives in the route rather than the service,
so every other caller inherits silence. Not fixed inline: it needs R1's `system`
principal applied to a console actor, and a check that the route does not then
write twice. Roadmap item 7.

**Rule zero-eight has now found three things in one afternoon** — U13, U14 and
O1 — none of which was on any list, all while a build or gate was running.

---

## 2026-08-12 (later still) — U12 answered, and rule zero-eight paid on its first outing

**U12 needed a decision, not just a migration**, which is why it was not folded
into the U4 fix. Both constraints are now partial unique indexes carrying
`where deleted_at is null`, so a deleted row stops reserving its value. The
entities drop `@Unique` — it cannot express a partial index — and the migration
becomes the source of truth, which is the arrangement
`users_tenant_email_hash_uniq` already uses here. Precedent, not invention.

Verified live: `XTS`, blocked since 2026-08-09, creates again, and a **live**
duplicate is still refused.

**The decision.** Making the index partial created a case that could not exist
before: undoing a delete after somebody reused the value. Restoring would give
two live rows sharing one value and there is no correct automatic winner —
renaming invents data, overwriting destroys it, and doing nothing silently claims
to have worked. So both delete commands check first and refuse with a **409**
naming the conflict, rather than letting the index raise a violation that
surfaces as a 500 and explains nothing.

**The generator caught a gap in my own work.** Running `db:generate` as a
schema-diff probe showed it wanted to create `authority_denials` — because I
hand-wrote that migration this morning and never updated the auth ORM snapshot.
Kept the snapshot updates, discarded the generated migrations, and both modules
now report *no changes*. Worth remembering: **a hand-written migration is only
half the change.**

**Rule zero-eight earned its place within an hour of being written.** While the
gate ran I opened the authority graph and found every row rendering as
`065bd751-… → cc563521-…` instead of *Acme Corp → Approval Branch*. **The one
screen that governs authority could not be operated** — nobody can tell which
link they are about to restrict.

Not a missing feature: the page already maps ids to names. The lookup asked for
`pageSize=200` where the API caps it at 100, so it returned **400** on every load
and every name fell back to a UUID. One line to fix, high severity, and on no
list. I would never have found it reading code.

It leaves two things behind, both recorded in `ux-findings.md`: the page
**degrades silently** when that lookup fails, which is precisely why it survived,
and three pages in parked modules make the same over-max request.

**Gate: 22/22 tasks, 12,904 tests, exit 0.** Lint: 0 errors.

---

## 2026-08-12 (later) — U4 was still broken, and reproducing it found another

**Phase 2 of the roadmap is verifying things nobody has checked.** U4 went first
because the route still derived its organization in the shape the original bug
had. It was not a stale record: `DELETE /api/currencies/currencies?id=…` returned
`400 expected string, received undefined` at `organizationId`, three days after
it was written down.

**The fix was to delete a requirement, not to add a fallback.** `organizationId`
was mandatory in `currencyDeleteSchema` and **nothing read it** — every use of
`parsed.organizationId` in the module is in a create path. The delete finds its
record through `buildCurrencyCommandWhere(ctx, …)` and enforces the boundary with
`ensureOrganizationScope` against the *loaded record*, both taking scope from
`ctx`, which a request body cannot forge. So the field gated nothing and rejected
the one actor who honestly has none. Adding a fallback would have been the U4
antipattern itself — deriving a value from an actor who has no scope.

That is worth stating as the other half of the family rule. The sweep asked
*where is the actor's organization wrongly stored?* This is *where is it wrongly
demanded?*

**Reproducing it turned up U12.** Creating a currency whose code had been deleted
fails with "already exists for this organization" — naming a row the user cannot
see. The application check correctly excludes soft-deleted rows;
`currencies_code_scope_unique` does not carry `where deleted_at is null`, so the
insert violates the constraint and the error is mapped back to a message about a
row that is not there. Deleting a currency makes its code permanently unusable.
`exchange_rates` has the same shape.

**Not fixed inline, and that was a judgement rather than a dodge.** It needs a
migration and an answer for what an undo-of-delete does when it collides with a
row created in the meantime. Bundling it into the U4 fix would have made both
harder to review and to revert. Recorded as U12 and placed at roadmap item 5,
immediately after this phase.

**The approvals queue, verified through the API rather than handed over.** I had
written that this item "needs the owner" because it is a screen I cannot see.
That was the wrong reason, and checking it changed the size of the ask. The real
limit is narrower: I do not type passwords into forms, so I cannot log a browser
in. Everything on the other side of that line I can do.

So I did: set enforcement to `enforce`, lowered the Approval Branch ceiling to
A2, and drove three acts through the API. The first was held with its reason
(*the edge caps authority at A2*) and the rename did not happen. The second I
approved, and the rename executed. The third I rejected, and it never did. One
act is parked in the queue for the owner, so their part is now three minutes of
looking and one click rather than twenty minutes of setup.

**A good incidental**: `Approval Branch`'s authority edge already existed,
annotated *"created automatically from the organization tree"* and timestamped
this morning. That is the U11 fix working on the live instance — and it is
precisely the step my own bad instructions once sent the owner hunting for.

**Gate after the U4 fix: 22/22 tasks, 12,898 tests, exit 0.**

**And then the owner logged my browser in, which changed the shape of the work.**
They asked whether it would help. It does, materially: within minutes I had
verified the thing I had just handed them, by looking at it and clicking it.
**Reject** produced *"Rejected. It will not run."*, the card left the queue and
the name did not change; **Approve and run** executed the rename. Item 3 closed
by me rather than by them.

The standing permission that came with it — click state-changing buttons on the
local instance, report afterwards — is recorded in memory along with the two
limits that do not move: I never type passwords into forms, and anything off this
machine still needs an explicit ask.

**The first thing it caught was not on any list.** A "Contact us" bubble in the
screenshot turned out to be `DEMO_MODE`, which defaults to **`true`**
(`parseBooleanWithDefault(process.env.DEMO_MODE, true)`), so anyone deploying
without setting it explicitly ships a feedback widget in their admin. Accurately:
it posts to a *local* endpoint so nothing leaves the instance, and
`deployment.md` already sets it false — minor. But a demo-only feature should
fail closed, and I would never have seen it by reading code. Roadmap item 8.

**Test state restored** afterwards: name, ceiling back to A5, enforcement back to
`shadow`.

**Two round-trips of the L38/L39 tax.** Both fixes needed
`build:packages --force`, `build:app --force`, and a server restart before
anything could be verified — about seven minutes each time. Worth the cost:
without it I would have been reading code and guessing.

---

## 2026-08-12 — one roadmap, and the last of G1

**The owner stopped me on process, and was right.** *"You already had a plan, then
you had 5 waves, and now this."* Three overlapping views of the same work is not a
plan — it is three plans, which is none, and it means tasks get picked off
whichever list happens to be open. `PROGRESS.md` is now the roadmap and nothing
else: 23 items, ordered, from here to the finish line, each tagged with whether it
needs the owner, is blocked on something that does not exist yet, or was deferred
deliberately. The 1,400 lines of closures and findings moved to
`references/completed-work.md`, where the reasoning stays findable without
competing with the plan. Rule zero-three now says this outright.

**The gate ran green in full for the first time since the U11 fix**: 22/22 tasks,
12,851 tests, 6m09s, zero cached. The arithmetic is worth recording — 12,845
before plus the 6 new authority-edge tests is exactly 12,851, so the new guards
demonstrably ran rather than being silently skipped, which is the failure L38 was
written about.

**Then explicit deny, which closes G1.** Permissions arrive through roles, so
stopping one person doing one thing meant removing their whole role — and with it
nine things they still needed — or inventing a bespoke role, which is how an
organisation ends up with forty roles nobody can describe.

Three decisions in it are worth keeping:

**It can only ever subtract, and the ordering is what guarantees that.** Denials
are consulted after the grant check has already returned true, so no arrangement
of denial rows can permit an act the ACL refused. A test asserts the denial
service is not even *called* when the ACL said no — if somebody moves that call
earlier, the test fails rather than the property quietly disappearing.

**It applies to superadmins, and that has a price I paid rather than dodged.** A
control the most powerful account ignores is a suggestion. But it means somebody
can withhold `auth.*` from the only account that could give it back, so the
recovery path is a CLI command, out of band by design: recovering from a lockout
should require reaching the server, not persistence in a browser. The alternative
— exempting the deny-management capability from denial — would have been a
special case, which is the bandage rule zero-one forbids.

**Permanent is allowed here and forbidden for delegations**, and the asymmetry is
the philosophy in miniature. A grant with no end is a role grant wearing a
costume. A subtraction with no end is a standing decision, and forcing it to lapse
would hand a permission back to somebody nobody re-authorised.

**Verified on the running instance, not merely built.** I had left the migration
unapplied and called it the owner's decision. Corrected: checkpoint taken,
migration applied, and then the whole loop run against the live API rather than
handed over as steps. Withholding `currencies.*` from the **superadmin** turned a
`200` into a `403`; lifting it from the terminal with nobody logged in turned it
back into a `200`. That single sequence proves the three claims that mattered —
denials bind, they bind superadmins, and the out-of-band recovery path works.
Blank reasons and mid-pattern wildcards were both refused. All test data lifted
afterwards; the lifted rows remain, which is the design.

**The 404 that was not a bug.** The new route returned `404` while its sibling
returned `401`. Nothing was wrong with it: the server runs `next start`, which
serves a frozen build. Recorded as L39, with the sibling-route diagnostic that
settles it in one command.

**One documentation bug fixed in passing**: I had written `mercato auth
denials:lift` into two doc comments before building the command, and the command
I actually built is `auth denials --lift`. A doc that names a command which does
not exist is worse than no doc, because somebody trusts it during an outage.

---

## 2026-08-11 — G4: work gets its own scope, and the grade finally has a source

Scoping stopped at the department. A legal case pulls people from several
departments and needs its own rules inside it, and the platform had no way to say
so.

**The design question was the same shape as G5's, and answering it first paid off
again.** An overlay only means something if the resolver can tell that this act is
inside that project — and nothing said so. A project holds records; an act names a
record through `payload.id`, which the gate already reads for record locks. So a
record-to-project table gives the resolver the matter for free, and no command had
to declare anything.

**Terminal deny turned out to need no code at all.** Platform 1 implements it by
ending evaluation early. Here a deny is `A0`, and because every rule takes a
minimum and nothing anywhere raises a ceiling, `A0` already cannot be lifted by
anything later. The property falls out of the invariant — which is a better place
for it than an evaluation-order rule somebody has to remember, and the tests
assert it holds whichever order the rules are written in.

**And this closed the task-grade item.** A grade describes the work rather than
the act, and I reclassified it days ago as blocked on G4 precisely because there
was no matter to read one from. There is now, so it binds: an act on a project's
record resolves at that project's grade.

The care that item needed carried over intact. An ungraded project says **nothing**
rather than `G0`, and an unreadable grade parses to `null` rather than `G0` —
because a *lower* grade buys **more** autonomy, which was the defect I fixed in the
resolver earlier the same day. It would have been easy to reintroduce it one layer
up, in a service that had every reason to default a missing value.

**One habit fixed after it cost me.** I ran this gate capturing full output, after
the previous batch where `tail -4` destroyed a failure I still cannot explain.
22/22 and 12,845 tests, with the log intact this time.

Server booted before calling it done, per [[L37]].

---

## 2026-08-11 — Tenant policy, and three things found on the way

Every other input the resolver reads is a property of the platform. This one is a
company's decision — four-eyes on payments, no unattended external email — which
is exactly rule zero-seven's "organisations legitimately differ" row, and the
first time in this sprint that a setting has clearly earned its place.

Declarative rules, because planning §10 defers a policy engine by name. A rule is
a match and a ceiling: no conditions, no expressions, no evaluation order to
reason about. Stored beside the enforcement mode in the same per-tenant config,
because a policy is a handful of rules rather than a growing table and the person
who sets one sets the other.

**An unreadable policy applies nothing.** That loosens, which is the uncomfortable
direction — but inventing a restriction the tenant never wrote would refuse real
work because of a typo, and a configuration failure is not a permission answer.

**Three things turned up that were not this task**, and all three are fixed here
rather than noted for later.

The first is a repeat of a bug I fixed three batches ago. `policyCeilingDetail`
did not exist on the resolver's context, so the tenant's own wording was computed
and silently dropped — precisely what `resourceCeilingDetail` had done for record
locks. Two occurrences make it a pattern worth stating: **when a ceiling carries a
reason, check the context type has somewhere to put it.** A refusal now quotes the
tenant back instead of reciting a gate.

The second is my own habit. A gate run failed in core, and I could not say why,
because I had piped `yarn test` through `tail -4` and thrown the failure away
before reading it. Core alone then passed 5,054 tests and a second full run passed
12,826. **The cause is unknown and is recorded as unknown** — three flake causes
have been found and fixed, and this may be a fourth or one of those recurring
somewhere unswept. The habit is fixed; the run is gone.

The third was cheap: charter and budget were both investigated before being
assumed buildable, and both turned out blocked on subsystems that do not exist —
`ai_worker` is a type with no producer, and nothing meters spend. Recorded with
preconditions rather than half-built.

**The resolver is now complete for everything that can be supplied.** The audit
five days ago found six of ten inputs unsupplied. All six that could be supplied
from what exists now are, and the two that remain are blocked on Phase K work in a
direction that is safe.

Gate: 22/22, **12,826 tests**, and the server boots.

---

## 2026-08-11 — The trust model, and the gaps it refuses to hide

This is the only input to the resolver that **widens**. Every other ceiling can
only take autonomy away, which makes them safe whatever they contain. Trust lifts
the cap that otherwise holds every machine at approve-first, so it is safe for a
different reason entirely: promotion is hard, demotion is easy.

**The specification's first line is the whole constraint** — *"trust is computed
evidence, not a setting someone types"* — and auditing it against this platform
found only **two of the five** promotion criteria computable. There is no incident
model, no evaluation suites, no charters.

That made the scope a genuine product decision rather than a sequencing one, so I
asked rather than assumed: shipping a partial control here does not point in the
safe direction, which is the opposite of every other gap in this sprint. The
answer was **gated promotion** — refuse on what can be checked, and carry what
cannot.

**So a promotion records its own gaps.** Three "not verified" notes go onto the
grant *and* into the audit trail. A gap in a design document is one nobody reads
again; a gap on the record is one whoever reads it later has to weigh. And it is
why a human approval is still required: the evidence gates the decision, it does
not make it.

**Three places where the failure direction was the whole design.** A missing row
means `T0`. An unreadable tier parses to `T0` — this is the one field in the
system where a parsing failure could *grant* something, so it fails to the bottom
of the scale rather than to a middling default. And `T0` supplies no ceiling at
all, because it says exactly what the untrusted-machine rule already says, and
replacing an explanation with a code that means the same thing is a loss.

**Demotion runs on reversal, not on a schedule.** A sweep would leave a worker at
its old tier for however long the interval is, and that window is precisely what
the specification is trying to close.

**One mistake worth recording.** I wired the trust reader into the DI registration
in the wrong position — the constructor takes six positional readers, and I put
trust where delegations belongs. It type-checked perfectly, because both are
objects with one async method. Caught by reading the argument list against the
constructor rather than by any tool, and the call site now carries a comment
naming the order. Positional readers that all look alike are a trap the compiler
cannot see.

**And I booted the server before calling it done**, which [[L37]] exists to
enforce. All three authority APIs resolve and are guarded, against a 404 control
that makes those 401s mean something.

Gate: 22/22, **12,802 tests**.

---

## 2026-08-11 — G3: authority you can lend, and take back

The platform had only permanent grants. Covering somebody's approvals for a
fortnight meant granting a role and remembering to remove it — and the grant
nobody removes is how permissions accumulate until nobody can say why anyone has
what they have. A delegation is that same grant with an end date and a reason
attached.

**All three findings I recorded before starting held up**, which is the strongest
argument yet for answering the design questions first. Each one changed the build:

A delegation had to **grant**, not only cap. The obvious reading — fill in
`delegationCeiling` and stop — fails because the route guard refuses on RBAC
before the resolver ever runs. A cap-only delegation could reduce authority
somebody already had and never lend any.

Which meant touching the grant path, the one layer built so nothing turns a
`false` into a `true`. That guarantee turns out to be about the **resolver**, not
about RBAC: RBAC has always had two grant sources, so a third that expires is
consistent with its design. The rule that had to survive — *the authority resolver
never widens* — does. The resolver still runs afterwards and still refuses; a
delegation gets somebody past the grant, not past everything.

And the caching problem was real. `loadAcl` caches for five minutes, and a revoke
that takes effect "within five minutes" is not a revoke. So delegations are a live
query — but only after the ordinary ACL has already said no, which is the request
that was about to return 403 anyway. The hot path never pays.

**The negative tests are the ones that matter here.** Every required capability
needs its own delegation, because returning true when one of three matched would
be the widest bug available in this codebase. A delegation does not rescue an act
the resolver refuses. It is not consulted when the actor already holds the
capability. And it is looked up by *principal id*, not by the subject string —
`api_key:abc` would never match a row written against `abc`, and the delegation
would silently do nothing.

**Two rules are judgements rather than mechanics**, so they are written down where
the work is. The **latest expiry wins** when several apply, because
newest-created would let a hasty short delegation silently shorten an agreed long
one. And **ninety days is the maximum**, because a delegation with no practical
end is a role grant wearing a costume — it can be re-granted, and that is the
point: re-granting is a decision somebody makes; letting one run for a year is a
decision nobody makes.

**Checkpointed before touching the grant path**, and verified the dump was
readable before starting rather than trusting that it existed. Verified afterwards
against real Postgres too: the check constraint rejects a backwards window, and
`api_key:abc-123` stores as a grantee — which is exactly why those columns are
`text` and not `uuid`.

No page. That is now item 16 alongside G5's, rather than a sentence in a commit
message.

**And then it did not boot.** The gate was green — typecheck, lint, 12,768 tests,
both builds — and `yarn start` died with `Could not resolve 'delegations'`.

The container runs in Awilix CLASSIC mode, and the default registration is
`asClass(RbacService)`. CLASSIC reads constructor parameter *names* and resolves
each by name. I called the parameter `delegations`; the registration is
`delegationService`. **In CLASSIC mode a parameter name is a dependency name**, so
I had renamed a dependency without meaning to.

This is the second time this trap has bitten, and the first time produced a guard
— `di-classic-proxy.test.ts` — which guards the *destructuring factory* half. This
was the `asClass` half, and it went straight through.

**Writing the new guard took three attempts, and the failures are the lesson.** I
wrote it, ran it, and it passed — with the bug still in the tree. Fixed a bracket
matcher, ran it, passed again. It took instrumenting the thing by hand to find
that a doc comment inside the parameter list contained brackets, which closed the
parameter list early and silently dropped every parameter after the third. Only
then did it fail, and name the offender exactly.

A guard nobody has watched fail is not a guard. It is a decoration that makes
people confident — the same shape as [[L34]], where a mock made six tests assert
nothing about the SQL they were supposedly covering.

**The wider finding is [[L37]]: the gate does not boot the application.** Type
checking, linting and unit tests all operate on code in isolation. Dependency
injection, migrations against a real schema and route registration happen only at
startup. A green gate is evidence about the code, not about the system — and after
any change to DI, a service constructor or module registration, the only thing
that tests the wiring is starting the server.

Gate: 22/22, **12,770 tests**, and the server boots.

---

## 2026-08-11 — G5: the first ceiling that is not about the actor

Every other input to the resolver asks *who is acting*. This one asks what is
being acted on. A contract under dispute, a payroll run that has closed, a case
file somebody froze pending review — none of those are properties of an actor, and
no trust level or delegation should reach past them.

`locked` refuses every write; `restricted` makes writes need approval. Neither can
be lifted by anything about the actor, and that holds structurally rather than by
a check: it arrives as a ceiling into a resolver that takes a minimum.

It also restores something we removed. Excluding `packages/enterprise` in S2 took
record locking out of the platform entirely, so this is not an enhancement.

**Reads are exempt, deliberately.** A record nobody may read is one nobody can
review before deciding whether to unlock it, and freezing a contract should not
hide it from the people arguing about it. Who may read is already RBAC's question
and the data classification's.

**The design question was answered before the batch started**, and that turned out
to be the right order: the bus carries a capability and no entity type, so keying
a lock on both would have needed a per-command declaration across every command —
the R4b exercise again. Keyed on the record id alone instead, with the gate
requiring a well-formed UUID before it looks anything up, because a slug or a
numeric id from some other payload could collide with a real lock and constrain
the wrong record.

**Two things the batch caught in itself, and both were mine.**

The refusal read *"the record's state permits at most A0"* — which tells the
person who hit it nothing they can act on. The reason somebody typed when locking
the record was being computed and then dropped, because the resolver's context
took a gate and no detail. Now it carries one, and a refusal reads *"locked
pending the Q3 audit"*. I only noticed because a test asserted the reason appeared,
which it would not have done if I had tested only the gate.

And `db:generate` found an index declared on the entity that my migration never
created. The unique constraint on `(tenant_id, record_id)` already provides
exactly that index, so the honest fix was to delete both the decorator and the
partial index I had written rather than add a second index costing a write on
every lock change to answer nothing new.

**What I did not build is a page.** Locking is an API guarded by a new
`auth.records.lock` capability — enough that a lock can be applied and therefore
means something, which is the line this sprint keeps drawing. A control belongs on
each record's own screen, and that is per-entity work rather than one screen. It
is item 17 rather than a sentence in a commit message.

Gate: 22/22, **12,742 tests**.

---

## 2026-08-11 — The task-grade item could not be done, and was worth doing anyway

The audit said the resolver never receives a task grade: `decideFor` passes
`context: {}`, so every act resolves at the `G1` default and only the data-class
floor can raise it. All true.

**What I found is that there is nothing to pass.** A grade describes *the work*,
not the act — `G4` is "legal proceedings, board/M&A, security incidents", which is
a property of the matter somebody is working on. This platform has no matter.
Project, case and engagement context arrives with **G4**, and until it does the
only honest source of a grade is the data classification, which already applies.

So I did not wire it. Building the seam — a symbol on the command context, say —
and calling the item closed would have produced exactly the thing this sprint
exists to remove: a control named in a table with nothing behind it. The item is
reclassified with its precondition instead.

**And the investigation paid for itself.** `resolveDecision` took the maximum of
the requested grade and the data floor, and *not* of the `G1` baseline. A caller
passing `G0` therefore landed below the default — which buys more autonomy, not
less. `E4` permits `A3` at `G0` against `A2` at `G1`; `E6` permits `A2` against
`A1`. The one input a caller controls could widen the answer, in a resolver whose
whole premise is that nothing widens. The doc comment two lines above even said
*"a caller cannot talk the resolver down"*, which was true of the data floor and
false of the baseline.

**Two corrections to my own first reading**, both from the code rather than from
me. I wrote the tests with a `human` actor and every gate came back `A5` — because
the effect-class matrix bounds **machines and delegated authority only**; people
are bounded by the graph, the record and policy instead. That narrowed the bug
honestly: exploitable by an AI worker or a delegated actor, not by an ordinary
user. And my first test file used the ACL declaration shape rather than the
flattened descriptor the resolver actually takes, which failed loudly rather than
passing vacuously.

**The fix was verified by reverting it.** Two of the six tests fail without it.
A guard nobody has watched fail is a guard nobody should trust — the same
discipline as the recurrence guard last week.

Gate: 22/22, **12,722 tests**.

---

## 2026-08-11 — I4 stops being a claim

*Authority is carried, never amplified.* The platform has said that since the
resolver landed. The rule was implemented, tested, and listed in a table of
resolver rules — and nothing supplied its input outside a CLI what-if flag. It was
the one finding from yesterday's audit that was not merely incomplete but
**wrong**: a control named in documentation and absent from the request path.

The concrete hole: an API key passes its own RBAC check, the resolver sees a
`service` principal with no invoker, and the person who owns the key is never
consulted. So a key could do what its owner could not.

R1 had already built the piece that was missing — `onBehalfOfUserId` on the
principal. The wiring resolves that person **as themselves**: their own grant,
their own position in the organization graph, the same capability. Whatever gate
that produces becomes a ceiling. If they may not perform the act, the answer is
`A0` and it is refused.

**The dependency had to go in backwards**, which was the only real design problem.
`rbacService` is constructed *with* `authorityEnforcement`, so injecting RBAC into
the enforcement service closes a cycle. It takes a reader instead — the same shape
as the graph and module-config readers already there — and DI resolves
`rbacService` from the cradle *inside the call*, which is late enough to break it.

**Absence is still not a refusal.** With no reader registered, the check is
skipped with a warning rather than answering `A0`. That is the position this
service already takes when the graph cannot be read, and the alternative invents a
denial nobody decided.

**And a stale comment went with it.** The class doc claimed *"Only `A0` is
enforced — `A1` to `A4` attach obligations and there is no machinery yet"*. True
when written, false since the command gate landed on 2026-08-10. A stale comment
about a control is worse than none: it reads as a limitation and gets designed
around.

The two tests I would most easily have skipped are the ones worth having — that
this never *raises* a gate, and that a person acting as themselves is not capped
by their own decision (which would apply every rule twice and put a confusing
second reason in every explanation).

Five of the resolver's ten inputs are still unsupplied, and every one of them can
only make an answer more permissive than the design intends — never more permissive
than the RBAC check that already said yes. They are backlog items 1–10. This one
was different because it was claimed.

Gate: 22/22, **12,716 tests**.

---

## 2026-08-11 — A deployment guide, and what it is honest about

The owner asked for handover documentation good enough that somebody who has
never seen this system can put it on a VPS subdomain behind Plesk.
`references/deployment.md` is that: what you are actually deploying (four things,
and only the first is obvious), the server prerequisites, Postgres including the
two extensions people forget, the environment, the build order, migrations, the
first tenant, workers, the nginx block, and a verification checklist.

**Every command in it was checked against the repository**, and two were wrong
when I first wrote them. `mercato auth setup` needs `--orgName` and `--password`,
which I had left out — the usage string in `auth/cli.ts` said so. A guide that
almost works is worse than no guide, because the reader assumes they broke it.

**The important line is at the top, and it is a limitation.** None of the
Plesk-specific steps have been run on a Plesk server. The build, migrate and start
sequence is the one used daily and is safe to trust; the systemd unit and the
nginx directives are the standard way to run a long-lived Node service behind
Plesk, written by somebody who knows the shape of the problem. That is a
well-informed first run, not a transcript, and saying so is the difference between
documentation and a claim.

**One judgement call worth flagging:** do not use Plesk's Node.js extension for
this. It runs Passenger, which wants to own the process, and this app is started
by its own CLI that supervises Next plus worker processes. Systemd plus an nginx
proxy lets Plesk do what it is good at — TLS — and keeps the supervisor intact.

**Three things the guide surfaces that were nowhere on the backlog**, now items
21 and 22: nobody has verified the Plesk path; there is no zero-downtime deploy,
backup schedule, monitoring or secret rotation; and the `CUSTOM_DOMAIN_*` and
`ACME_EMAIL` variables exist in `.env.example` while the `domain_mappings` work
that would honour them is deferred — so a reader would otherwise have set them and
waited for something that is not there.

The guide also carries the `Upgrade`/`Connection` proxy headers, which are not
optional: the platform pushes live updates over SSE, and without them
notifications and progress bars silently never arrive. That is exactly the class
of thing a first deployment loses an afternoon to.

---

## 2026-08-11 — G7: the interface can now run right-to-left

The platform could always do this and had never decided to. Radix takes `dir`,
the CSS logical properties follow it, and `<html>` shipped with a `lang` and
nothing else — which is fine while every locale runs left-to-right, and silently
wrong the moment one does not. A browser handed `lang="ar"` and no `dir` renders
Arabic left-to-right: letters right, layout inside out, nothing to notice.

Direction is decided on the **language subtag**, never the whole tag, because it
is a property of the script: `ar`, `ar-EG` and `ar-Arab-EG` all run the same way,
and a list of full tags would be endless and still incomplete. Anything
unrecognised falls back to `ltr` — the safe direction rather than the neutral one,
since a `rtl` default would mirror the interface for every locale we failed to
parse.

**Arabic ships**, because that is the difference between a policy and a claim.
Proven over HTTP against the built app: `Accept-Language: en` returns
`dir="ltr"`, `ar` returns `<html lang="ar" dir="rtl">`, with Arabic actually
rendering. Its dictionaries are partial on purpose — a module without `ar.json`
falls back to inline English, so untranslated surfaces degrade to readable rather
than blank. The Arabic I wrote is unreviewed by a native speaker, which is on the
backlog rather than glossed over.

**I did not build the setting the graft asked for.** `graft-batches.md` wants
`text_direction_policy` in tenant configuration. Rule zero-seven's own table says
otherwise: *there is a right answer → default, no setting.* Direction follows
language essentially universally. The resolver still accepts a policy and is
tested for it, so the seam is there when something genuinely has one — but adding
a configuration key nothing reads would have been precisely the "claimed and
absent" control I spent yesterday's audit cataloguing.

**And the compiler did the interesting work.** Adding `ar` to the `Locale` union
failed the build in two places that enumerate locales by hand, which is the type
system enforcing completeness rather than a chore. A test then failed for the
right reason too: `TranslationManager.primitives` asserted the tabs were exactly
`['EN','PL','ES','DE']`, so a locale addition broke an assertion about *markup*.
It now derives from the configured locales, which is what it always meant.

Wave 1 done — G8, G6, G7. Gate: 22/22, **12,708 tests**.

---

## 2026-08-11 — G6: an act now records who it was written for

Audit rows had a tenant and an organization and no notion of audience, so anyone
holding `audit_logs.view_tenant` read everything. `visibility_scope` fixes the
tense: the code performing an act decides who it was for, at the moment it is
recorded, instead of a report inferring sensitivity from a payload afterwards.

Backfilled to `tenant`, which is precisely what every existing row already had.
This is a vocabulary, not a restriction — defaulting to `private` would have
emptied every audit view on the day it shipped.

**Writing it turned up two things I had not thought through.**

The first was a leak I put in myself. I wrote `case 'tenant': return true` —
obviously right, since a tenant reader may read tenant records. Then I got to
`portal` and found I had written an expression that evaluated to `true` either
way, which is the kind of nonsense that only shows up when you try to explain it.
Working out what `portal` should mean exposed the real problem: a portal reader is
a *customer*, and `tenant` returning `true` unconditionally would hand them the
tenant's internal activity. The line belongs on `tenant`, not on `portal` — which
genuinely does have two audiences, because hiding portal activity from staff would
leave their own trail incomplete.

The second was that `private` cannot be a scope list at all. Whether a private row
is readable depends on **who performed it**, and that is per-row. So the filter is
`scope in (...) OR (scope = 'private' AND actor_user_id = me)`, and the nesting
matters: ANDing the actor across the whole predicate instead would silently narrow
every reader's timeline to their own acts.

**And the verification was wrong before the code was.** Executed against real
Postgres, the owner of a planted private act appeared *not* to see it. That looks
exactly like a bug in the predicate. It was my probe: it grabbed an arbitrary row
whose `actor_user_id` was null, so `actor_user_id = null` matched nothing. Re-run
against a row that had an actor — 56 of 56 for the owner, 55 for a stranger.

Worth writing down because the instinct at that moment is to go and change the
code. [[L30]] again, from the other end: a reproduction you built yourself is a
hypothesis, and that includes the one that appears to confirm a failure.

`project` fails closed until G4 gives it membership to check. Nothing writes it,
so it is inert — but a scope that returns `true` because we cannot decide it yet
would be a label pretending to be a control.

Gate: 22/22, **12,699 tests**.

---

## 2026-08-11 — G8: one migration run at a time

Two containers booting from one image against one database is the ordinary way to
deploy, and nothing stopped both of them migrating. Both read the same empty
`mikro_orm_migrations_<module>` table, both decide the same file is pending, both
run it. `create table` fails on the loser and the boot dies — or a data migration
that is not idempotent runs twice and nobody notices, which is the worse one.

`yarn db:migrate` now holds a Postgres session-level advisory lock for the whole
run. Session-level because the lock has to outlive every per-module ORM the run
opens and closes, on its own short-lived connection for the same reason. It
**waits** rather than failing: a second container should apply nothing and carry
on, and by the time it holds the lock the first run has finished and its pending
list is empty. And it says so on the way in, because a migration blocking in
silence is indistinguishable from one that has hung, and an operator watching a
stalled deploy will kill it.

**The verification is the interesting part**, because the failure needs two
processes and a race and cannot be reproduced in a unit test. Eleven unit tests
pin the decisions around the lock. The SQL then ran against real Postgres — A
acquires, B is refused while A holds, B acquires once A frees, zero locks left
([[L34]]). Then the whole command, against a lock held from another connection.

**And that last step caught what the first two could not.** The first contended
run finished in seven seconds with no waiting message. The unit tests were green;
the SQL was proven; the lock was genuinely held by the other connection. The CLI
runs from `packages/cli/dist`, and I had never built it. Rebuild, retest, and the
message appeared — 22 seconds of waiting against 6 uncontended. The standing trap
in this repository is usually stated about the app; it is not only about the app.

**Two things I had said were wrong, and the tests said so.** I checked
`dbGreenfield` for migration calls, read the first half of the function, saw it
deleting migration files and concluded it does not migrate. It does — the call is
at the end. A test failed with `client.connect is not a function` and pointed
straight at it. That is a better outcome than my claim: greenfield rebuilding a
database while a deploy migrates it is exactly the collision the lock is for.

**Then a third gate flake, unrelated to any of this.** `OrganizationBrandingPage`
failed in the gate and passed three-for-three alone. The page seeds `logoUrl` into
local state from fetched data through an effect, so there is a render commit
between the organization name appearing and the input filling; the test awaited
the name and asserted the input synchronously. Load widens the window. `waitFor`
closes it, and it is now **trap 3** in `knowledge/test-gate.md` — the nastiest of
the three, because the failing line is right there, the lines above it pass, and
the product is correct.

A sweep confirmed it was the only instance: seven files use `toHaveValue`, three
never wait, and all three render synchronously from props inside `await act`.

Gate: 22/22, **12,677 tests**.

---

## 2026-08-10 — The gate stops depending on how busy the laptop is

Two causes, both fixed, and the interesting part is that **the diagnosis I had
written down was wrong.**

`PROGRESS` said: two guards hardened, *eleven more walk-and-read unguarded*. That
framed the work as hardening eleven readers. So I planted a fixture-shaped
directory inside `packages/shared` and ran core, ui and cli against it — **6,905
tests, all green.** Nothing breaks while the directory exists. The failure only
happens when it is *deleted* out from under a walker.

Which inverts the fix. Thirteen readers were never the problem; two writers were.
`dynamicLoader.tsconfig.test.ts` was creating scratch app roots inside
`packages/shared`, and `cache/service.test.ts` inside `packages/cache`. Both now
write outside any source tree — the loader fixture to `node_modules/.cache`,
because it needs repo-relative resolution for its `@mikro-orm` import, and the
cache fixture to `os.tmpdir()`, because it needs nothing.

**A backlog note is a hypothesis with a date on it.** Mine was written while
chasing something else, was plausible, and would have sent me to harden eleven
files that did not need it. Ten minutes of planting a directory settled it
([[L36]]).

**The second cause I nearly guessed at too.** Five tests in the CLI integration
file were slow, and my first theory was the source fingerprint. Then I measured
it: 8,715 files, 262ms to walk, 777ms to stat, on an idle machine. About a second
— nowhere near a 60-second budget. The theory was too small to explain the
symptom, and if I had "fixed" it I would have declared victory over nothing.

So I built the load instead: four heavy test packages running concurrently, then
timed the file against them.

| | Before | After |
|---|---|---|
| Worst single test | 13,023 ms | **2,467 ms** |
| Whole file | 37.0 s | **9.8 s** |

Eight-fold degradation under only four of the gate's twenty-two packages — which
is what makes 60s reachable, and it is a *measurement* rather than the arithmetic
I would otherwise have offered.

The fix threads overrides that already existed one level down
(`hasBuildInputChangesSince` has always taken `BuildCacheOptions`;
`tryReuseExistingEnvironment` just never passed any) so those tests point the walk
at a two-file fixture. They assert reuse decisions, not that the repository
contains 8,700 files.

**And coverage went up.** Fixturing all five would have left the real default
paths untested — they could point at nothing and every test would still pass. So
one new test keeps them, cheaply: backdate `startedAt` to 2020 and the staleness
check returns on the *first* file it stats instead of the 8,700th. Same code path,
one three-thousandth of the I/O.

The recurrence guard was verified the only way a guard can be — by putting the bug
back and watching it go red and name the file.

**What I did not fix, said plainly.** The walking guards are still unguarded.
Nothing writes into `packages/` during a gate run now, so nothing races; if some
future build step does, the class returns. Measured, not eliminated.

Gate: 22/22 tasks, **12,666 tests**, 5m57s idle.

---

## 2026-08-10 — The approvals queue becomes a screen

Enforcement has held acts since it landed. Answering them meant calling an API,
which means a terminal, which means nobody. `/backend/authority/approvals` is
where a person now works through the tray.

**Two lists, and they never borrow each other's verbs.** *Waiting* holds acts
that have **not** happened — approving runs one, rejecting means it never runs.
*To review* holds acts that **already did** — nothing on that half changes what
happened; the only open question is whether anybody looked. Offering "Approve" on
something that already ran, or "I have looked at this" on something still waiting,
would make every row ambiguous, and a reader who cannot tell the halves apart
clicks through both. Three of the eight new tests exist only to hold that line.

**A3 gets a veto and no approval button.** *Hold and commit unless vetoed* runs
on its own when the window passes, so "Approve and run" would be a button that
changes nothing but the timing. The only act with an effect is stopping it, so
that is the only button.

**The gate identifier never appears alone.** "A2" is precise and empty. Each row
carries the plain sentence — *needs your approval before it runs* — beside the
tag, and the resolver's own reason underneath it. The queue that shows only codes
is the queue that gets clicked through.

**Ordering is a taste, so it is stored per person.** Riskiest first by default,
oldest first on request, kept in that browser and nowhere else. Storing it
server-side would quietly make one person's preference everybody's — the reading
of the owner's *"a setting where organisations genuinely differ"* that keeps the
setting count honest.

**Pulled forward, and the reason is that its premise expired.** `PROGRESS` had
scheduled this after the gate-stability work, arguing that a screen designed
against a nearly-empty tray is designed against a guess. That was true when three
commands were gated. The capability mapping has since gated 117, and A3 and A4
both bind — the tray now fills from ordinary use, so the argument for waiting no
longer holds.

**What is deliberately absent**, each with a backlog entry rather than a
half-built control: bulk approval with a diff, routing to a deputy, standing
approvals. A first version without them is usable. One shipping a blind "approve
all" would be worse than no page.

**One wrong turn worth recording.** I put the new strings in the *app's* locale
files. The auth module owns its own `i18n/` — four fully translated files, no
English placeholders — and app-level files are the app's. Reverted, and the
strings landed with real German, Spanish and Polish rather than English standing
in for them ([[L35]]).

Gate green end to end: 22/22 tasks, 12,664 tests, no flakes this run.

---

## 2026-08-10 — A3 binds, and every gate now does

*Hold and commit unless vetoed* is the gate that needed something to wake up. The
act does not run when proposed; it runs by itself once its fifteen-minute window
passes, and only an objection stops it.

**The interesting part is how close it is to its opposite.** An unanswered
approval expires and never happens. An unopposed hold commits and does. Same
table, same waiting, opposite ends — so `commit_at` is a separate column from
`expires_at` rather than one field read differently by status. Sharing a column
would put "this never happens" and "this happens" a single typo apart, on a table
whose entire job is deciding whether something happens.

A scheduled sweep runs due acts every minute. Not on read, which would make an act
commit when somebody happened to open a queue — approve-first wearing a timer's
clothes. Not an in-process timer either: a timer dies with the process that set
it, and an act that never commits because a server restarted is indistinguishable
from one somebody vetoed.

**Nobody's name goes on an auto-committed act.** It happened because a window
passed, so `resolved_by_user_id` stays null. Recording an approver would attribute
a decision nobody made; recording the proposer would claim they acted at a moment
they did not.

**And a test caught a real bug.** Three failed because my fake EM required a
tenant filter the sweep did not supply — which was not a harness problem but the
harness telling me the sweep queried across every tenant while the schedule is
registered per tenant. Each tenant's timer would have done every other tenant's
work. Scoped, with a test that holds it.

Two other failures were my own stale claims — a gate test asserting A3 needs
machinery that does not exist, which stopped being true in the same commit. That
is the third time this week a test has failed because it described the world
before the change, and each time it has been the test doing its job.

## 2026-08-10 — A4 binds: the act runs, and somebody still has to look

*Execute and review* is the opposite shape from an act held for approval — it has
already happened — so it went in its own table rather than as a status on the
existing one. A table whose rows mean "not yet" or "already did" depending on a
column is how a schema starts lying to whoever reads it next, and this one is a
day old, which is the cheapest moment to get that right.

The decision is carried from `beforeExecute` to `afterExecute` through the
interceptor metadata rather than re-resolved after the act. Re-resolving would
answer *what the rules say now*, which can differ from the reason the act was
reviewable when it ran.

**Filing never throws at the caller.** The write has already committed; failing
the request would tell somebody their change did not land when it did. A missing
review row is a real gap, and lying about a successful write to report it is a
worse one — logged at error level instead.

**And no deadline**, unlike a held act. An approval nobody answers has work
blocked behind it and must expire. A review nobody does blocks nothing, and an
unreviewed act is exactly the thing somebody should still be able to find next
quarter. Same table shape, opposite retention, for a reason worth writing down.

One endpoint now returns both lists, because §9 asks for one inbox rather than
four screens — but they stay separate fields, since confusing "stop this" with
"check this" in either direction is how a queue loses its meaning.

That leaves **A3** alone: it commits when nobody objects, which needs something to
wake up and run the act. The scheduler module is enabled, so the pieces exist.

## 2026-08-10 — Which commands are gated, decided by reading rather than guessing

Three commands declared the capability they perform. Everything else was
ungated — visibly, by design, but three is not a governance layer.

The temptation was a regular expression: `directory.organizations.update` →
`directory.organizations.manage` looks like a rule. It is not. `catalog.offers.*`
is guarded by `sales.channels.manage`; `customers.addresses.*` by
`customers.activities.manage`; `auth.users.update` by `auth.users.edit`. A
pattern would have got those wrong, and a wrong mapping either blocks work that
should proceed or waves through an act that should have waited.

So I read it off the routes instead — every CRUD route declares both the command
it calls and the feature that guards it, which is evidence rather than inference.
**117 commands, no ambiguous cases.** 21 of them are in enabled modules and now
carry the declaration.

Parked modules are left alone and the step is written into `parked-modules.md`,
because restoring a module would otherwise quietly restore an ungated write path.

A guard test checks each declared capability is a real feature id. It is a text
scan, not a runtime check: the registry only hydrates enabled modules, so a
runtime assertion would pass for a parked module's typo and fail on the day
somebody restored it. And a typo here does not throw — it silently stops gating
the command while the source still looks gated.

## 2026-08-10 — The classification control needed no new policy, only a closer read

An AI worker reading integration credentials resolved exactly like one reading a
dictionary. Everything landed at `G1` whatever it touched, because nothing ever
set the grade from the data.

I had this on the backlog as *"needs a policy table with a source, not values I
invent"* — planning 02 §6.1 lists `matrix_by_classification` among the floors,
which reads like an instruction to build a classification-to-gate table. Inventing
those numbers was the blocker.

§8's worked example settles it in one line: *"reading confidential contracts for a
G3 legal matter — `E0 / G3 → floor A4`"*. The classification was never a ceiling
of its own; it raises the **task grade**, and the effect-class matrix — already
written, already tested — does the rest. The class-to-grade mapping comes from
the grade table in §3, matched on the words it already uses: *"internal records"*
is G1, *"personal data"* is G2, *"security changes"* is G3.

So: credentials now grade the work G3, and `E0 / G3` permits at most A4 — the
read happens and enters a review queue. Grades take the maximum, so a caller can
add weight and cannot talk the resolver below what it is reading.

**Worth keeping as a habit**: when a design document names the same input twice in
different shapes, the worked example is the one that tells you which shape was
meant. I spent a backlog item's worth of hesitation on a table that was never
supposed to exist.

## 2026-08-10 — Decision: the approvals page, and a rule about defaults

The approval tray works; the screen for it does not exist. I asked, because how a
screen behaves for somebody who opens it every morning is a product question and
guessing produces a control people route around.

**Decided:** its own page. Choose sensible defaults rather than asking about each
one, and expose settings where organisations genuinely differ.

I have read that as *"do not bake your taste into my product"* rather than *"make
everything adjustable"*, and said so — every setting is a thing to explain,
translate, test and get wrong, so "configurable" is not the safe option, it is an
option with a bill. Ordering, bulk approval, deputy cover, standing approvals and
expiry get a default and a knob; **who may approve does not**, because that is
authority and not preference.

**Scheduled after item 2**, with the reason recorded rather than left as
"later": three commands are gated today, so the tray is nearly always empty, and
a screen designed against an empty tray is designed against a guess. Item 2
widens what is gated. Same discipline as running shadow mode before enforcement —
which has already caught two design errors of mine that reasoning alone did not.

Generalised into **rule zero-seven** in the cookbook, because the shape recurs:
choose the default, name which half of the decision you are in (right answer /
legitimate difference / authority), write down the argument, and if a surface
needs real usage to design well then say what has to exist first.

## 2026-08-10 — An act that has to wait

Enforcement could refuse an act and nothing else. `A1` and `A2` — *"the worker
proposes; a human performs"*, *"executes only after approval"* — were recorded as
obligations while the act ran anyway. A control that does not control.

Now an act gated at A1 or A2 **does not run**. It is held with the decision that
held it, and executes only when somebody holding `auth.authority.approve` says
so. Reject means never; every held act carries a 24-hour deadline, and an expired
one has to be proposed again — planning 02 §7.2 is explicit that expiry should
escalate rather than block work silently.

**The design question was where to catch an act**, and it took most of the
investigation. The route is universal but would store raw request bodies
(passwords among them) and re-run guards on replay. The command bus is narrower
but right: an act that can be *undone* is an act that can be *replayed*, and the
platform already models that with snapshots and redo, and already persists
command inputs under the encryption map. I went with the bus.

That left a gap I had not seen: **the resolver is keyed by capability and the bus
by command, and nothing connected them.** `module.entity.action` and
`module.action` look close enough to map with a regular expression, which is
exactly the R4b mistake at 153× scale — a wrong mapping either blocks work that
should proceed or waves through an act that should have waited. So commands
declare their capability explicitly, three of them so far, and everything else is
visibly ungated rather than invisibly mis-gated.

**Who is accountable for an approved act**: the approver, in the proposer's
organization. Approval means taking responsibility, and rebuilding a proposer's
session from two stored columns would be fabricating one rather than reproducing
it. But an act proposed for one organization must not land in another because the
approver was looking elsewhere.

**Two things the unit tests could not have caught**, both found by running it:

The gate read the command's capability from the registry, and at request time the
registry it saw did not have it — so the gate concluded "this command declares
nothing" and let the act through. The capability now travels *from the bus*, on
the interceptor context, because the bus has already resolved the handler. For a
gate, "declares nothing" and "I could not see the declaration" have opposite
consequences, and the first live run took the wrong branch silently.

And the held act answered **500**. My own error class carries a docstring saying
three outcomes must stay distinguishable — you may not, it failed, and *not yet* —
and it was collapsing into the second. Now 202 with the pending-act id: understood,
accepted, not done. A 500 invites a retry, and each retry queues another copy.

Verified end to end afterwards: the rename did not happen, the queue showed it
with the gate and the reason, approving it ran the act, and the organization's
parent survived — the U10 fix holding in the same request.

**What still does not bind, said out loud.** A3 commits when nobody objects —
the opposite of expiry, and it needs a scheduler. A4 runs the act and files a
review, which is a different record. And the queue is an API with a deadline, not
the inbox §7.2 describes: no grade ordering, no bulk-with-diff, no absence
routing, no standing approvals. Items 2 and 3. The inbox is a product decision
and should be talked about before it is built.

## 2026-08-10 — A key is not a person, and a cascade that never ran

**The follow-through from U3.** Authentication resolved a regular API key through
`createdBy` and required that person's organization to equal the key's — so
moving somebody to another team silently killed every key they had ever created.
Provenance was being used as identity.

The rule is now the narrower one that actually matters: **a key may not be
broader than its creator.** A null organization means *unrestricted across the
tenant* to `RbacService`, so a key with none, minted by somebody confined to one
organization, is an amplification and is refused — invariant I4. A key scoped to
an organization its creator has since left is a service credential doing exactly
what it was made for, and keeps working. Session keys keep exact equality,
because there the borrowed identity is the whole point.

**What the old behaviour did that was worth keeping** is now explicit rather than
a side effect of a lookup failing: `api_keys` revokes a deleted user's keys on
`auth.user.deleted`. Offboarding becomes a visible, audited act — the key list
shows them revoked — instead of a fleet of credentials that mysteriously start
returning 401. Authentication still refuses a key whose user has gone, because an
event bus is not a place to put the last line of a security control.

**And then, looking for an event to hang that on, I found U8.**
`communication_channels` has a cascade that disconnects a departed user's email
and calendar channels, stops the poller and orphans the credentials. Its first
line reads `payload.userId`. The platform emits `payload.id`. **It had never run
once** — a departed user's mailbox stayed connected and polling.

Seven tests covered it. Every one of them constructed
`{ userId: 'user-1', tenantId: 'tenant-1' }` — a payload nothing in the platform
produces. That is [L34](LESSONS.md) again from a third direction: not SQL text
this time but an event contract, and the same failure, a test that verifies the
handler's *intent* against a shape somebody imagined.

I wrote my own subscriber against the real payload and put the shape in a typed
comment, because the next person to add a cascade will copy whichever one they
find first.

**The gate then failed on something unrelated** — a `<Notice>` guard that walks
every source file in the repo, reading one from a sibling package's scratch
directory a moment after that package's own tests deleted it. Passes alone, fails
in the gate: the shape of every flake that teaches people to re-run instead of
read. Skipping `.tmp-*` and tolerating a file that vanishes mid-walk brings it
into line with the platform's other repo-walking guard, which already does both.
[U9](workspace/references/upstream-issues.md).

## 2026-08-10 — U2: a screen that showed an action and behaved like a declaration

The *Apply to roles* switches on Sidebar customization reset to "no roles" on
every load, while a save treated the list as a complete statement of which roles
should have this layout. So the second save asked to clear every preset, and the
only thing between that and the delete was a small red badge.

**The obvious fix was wrong, and I had already checked that.** Pre-ticking roles
with `hasPreference` looks like two lines. But a preset stored a *copy* of the
settings and no reference to the layout that produced them, so `hasPreference`
means only "this role has some layout" — pre-ticking on that basis would tick
roles configured from a different layout and silently overwrite them on save. A
worse failure, because the screen would look right while doing it.

**So: `role_sidebar_preferences.variant_id`.** A preset records where it came
from, and the switches can finally say which layout a role actually has. No
foreign key, deliberately: a variant is one person's saved layout and may be
deleted, while the preset it produced must outlive it. A dangling id stops
matching and reads as "from a layout no longer here" — true, where a cascade
would delete a role's sidebar because somebody tidied their own saved views.

**The guarantee is server-side.** `clearRoleIds` can only delete presets whose
stored `variant_id` matches the layout being saved; everything else is dropped
from the list. Fixing the switches fixes the screen — but a client that computes
the wrong list is a bug anyone can ship, and a client that computes the wrong
list *and is obeyed* is how data goes missing. Seven route tests hold that half.

Three states now, not two: *uses this layout* · *uses Finance layout* · *uses a
layout from an unknown source*. The third is for rows written before the column
existed. **Unknown is not "none"**, and a row nobody can attribute is left alone
rather than guessed at — the same distinction the graph ceiling makes between
"no constraint" and "constraint I could not read".

**And the checkpoint script was not pruning.** It reported `pruned: 0` after every
run while the backup directory grew by a set each time. The cap ranked only the
*stale* files, so the newest five sets counted as zero against it and ten old
files survived on top of them. Ranking every backup and applying the grace window
as a second condition fixes it; the directory now converges instead of growing.
A tool that reports success while doing nothing is worse than one that fails.

**Found on the way:** the `audit_logs` and `directory` migration snapshots had
been stale since R3 and R6. `yarn db:generate` was emitting migrations to
re-create `ledger_events` and `organization_edges` — tables that already exist —
which would have failed on anyone else's machine and looked like our bug. Both
snapshots now match the schema that shipped.

## 2026-08-10 — The resolver decides

R5 and R6 built a decision kernel and nothing called it. It calls now.

Three modes per tenant — `off`, `shadow`, `enforce` — defaulting to shadow,
because enforcement is a decision an operator makes against their own traffic,
not something that arrives with an upgrade and starts refusing requests on a
Tuesday. Verified end to end against the running instance: an organization behind
an `inheritance: none` edge returns **403** where its parent returns **200**, and
the log carries the reason — *"inheritance is none, so nothing flows down, an
'advises' relationship permits at most A2"*.

**Enforcement can only narrow.** It runs after RBAC has already said yes. That
ordering is the guarantee rather than a convention: there is no path through
`RbacService` where the resolver turns a `false` into a `true`, so "could this
grant something?" is a question you answer by reading four lines.

**Refusals bind; obligations do not.** The resolver returns a gate from A0 to A5,
and only A0 is enforced, because it is the only outcome the platform can carry
out. A1–A4 mean approve-first, hold-and-commit, review-afterwards — and nothing
can yet hold an arbitrary act and resume it once somebody approves. Enforcing
those would mean allowing the act and calling the allowance a control. The CLI
says this out loud when you switch a tenant on, and it is backlog item 3.

**Shadow mode found another design error of mine**, which is now twice. An API
key acquired an approval obligation for *listing organizations*. A read has no
effect to approve, and gating one produces exactly the approval fatigue planning
02 opens by naming as the thing it exists to resolve. The cause: I had written
the untrusted-machine ceiling as a flat A2, where §5.1 specifies a vector over
effect classes — *"a worker can be T4 on research reads and T1 on external
communication"* — and warns that a single number is "either uselessly
conservative or dangerously optimistic". Mine was the conservative half. Reads
are now exempt; everything with an effect keeps approve-first.

That exemption has a cost I am not hiding: an untrusted machine can now read
`confidential` data bounded only by RBAC. The control that belongs there is the
data-classification floor, which planning names and nobody has built. Backlog
item 4, with a note that its values need a source rather than my judgement.

**And a bug my tests could not see.** The edge query used `= any(?)`, which the
query builder expands into `any('a','b')` — a syntax error. Seventeen tests
passed because the fake connection never parsed the SQL; it filtered in
JavaScript, so every property they asserted was a property of the fake. It
surfaced the first time an organization actually had a parent, which was the
first time the query ran at all. Second instance of the same shape as the ledger
alias — [L34](LESSONS.md).

## 2026-08-10 — U3 was real. I had closed it twice on bad evidence

A key created through the ordinary UI flow returned **401 on every request**. Not
a corner case — the default path. An admin working tenant-wide has no selected
organization, so creation stored `organization_id = null`, while
`resolveApiKeyAuth` requires the key's organization to equal *its creator's*, and
the creator has one. Every key that admin made was dead on arrival.

One column proved it: 401, `update api_keys set organization_id = <creator's>`,
200. Same key, same request.

I had closed this twice. Once by misdiagnosing it (my own `Authorization: Bearer`
header produced the 401s — [L30](LESSONS.md)), and then, worse, by treating that
discovery as a disproof and **reverting a correct fix**. Invalidating your own
reproduction returns an issue to *unknown*, not to *resolved* —
[L32](LESSONS.md), the more expensive of the two.

**Fixed at creation, not at authentication**, and the distinction is the whole
decision. The comparison looks like the bug — provenance used as an authorization
input — but it is load-bearing: `RbacService` reads a null `organization_id` as
*unrestricted across the tenant*, so that check is the only thing stopping a
single-organization admin from minting a tenant-wide key. Loosening it would have
turned an availability bug into a privilege escalation. Creation now takes the
creator's own organization, and refuses an explicit mismatch with a 422 that says
why.

Checked rather than assumed, and worth recording as a negative: **a key does not
inherit its creator's permissions.** `loadAcl` sees a service principal and reads
the key's own roles; the creator's user ACLs never enter. The escalation this was
feared to be does not exist. What does exist is a machine credential whose life
is tied to a person's record — delete the creator and every key they made dies
silently. That is now backlog item 3.

## 2026-08-10 — The authority graph bridge learns to say "I do not know"

`AuthorityGraphService` had no tests, and two ways to fail that both returned
`A5` — which reads as *nothing constrains this*. An organization it could not
find, and an ancestor index whose order had inverted, would each have granted
full autonomy by silence.

Both now fail closed at `A0` with a stated `basis`, and the inversion is actually
*detected*: a leaf-first index makes every real edge match the path reversed,
which ordinary data cannot produce. Unmapped hops are reported rather than
absorbed, so an unconstrained answer says how much of the path it actually read.

Thirteen tests, including one that pins the root-first ordering of `ancestor_ids`
at the module that produces it — the assumption cannot be typed, so it has to be
detected on one side and pinned on the other.

Found while reading that code: a sibling comparator that compared a lowercased
name against a raw UUID. One identifier. Fixed, with a test.

## 2026-08-10 — A 500 on an ordinary write, caused by four characters of SQL alias

Creating an API key started returning 500. The server log named a duplicate key
on `ledger_events_tenant_seq_uq` — the chain's own uniqueness constraint,
rejecting an append that claimed a position already taken.

**The chain was fine.** Ten events, sequence 1 through 10, no gaps.

**The head query was wrong.**

```sql
select seq::text as seq, hash from ledger_events ... order by seq desc limit 1
```

PostgreSQL resolves `ORDER BY seq` to the *output column* when one shares the
name, so this ordered by text: `'9'` beat `'10'`. Every append computed a head of
9, tried 10, and hit the constraint. The same alias in the verifier made it read
the chain as 1, 10, 2, 3 and report an intact chain as **broken** — a false alarm
from the one tool whose entire value is that people believe it.

Both are one four-character mistake: `as seq` instead of `as seq_text`.

**What the constraint did well.** It refused the write rather than forking the
chain, and it took the business write down with it — fail-closed, exactly as
designed. The integrity guarantee held; what failed was arithmetic.

**What I did badly.** The error named a race, so I went looking for a race, and
found one: `getConnection().execute()` without a transaction context can take a
different pooled connection, which means `pg_advisory_xact_lock` commits and
releases immediately and serialises nothing. That defect is real, and I fixed it
and tested it — but it was not this bug. I spent an hour on a plausible cause
before checking the simplest possible fact: what the head query actually returns.
Ten seconds in psql would have shown `9` sitting on top of a table whose maximum
is 10 ([L31](LESSONS.md)).

Both fixes ship. The chain now verifies: **10 of 10 events, 0 broken.**

---

## 2026-08-10 — The U4 sweep, and a bug I invented

**The sweep did what it should.** `selectedOrganizationId ?? auth?.orgId` appears
in 53 files, which sounds alarming and mostly is not. Thirty-eight are in parked
modules. The rest fall into three shapes, and only one is dangerous:

> **Never use the actor's organization as a value you store.** Comparing against
> it is fine. Filtering by it is fine. Storing it makes the record mean
> *"whatever scope the person who created it happened to have"* — and for a
> superadmin, who has none, it means nothing.

Four bugs have been that one sentence. The rule is now in
[scope-tenant-organization.md](workspace/knowledge/scope-tenant-organization.md),
where somebody will look for it.

**Then I invented a bug and nearly shipped a fix for it.** I expected U3 — "an
API key fails at use time" — to be an instance of the same pattern. I reproduced
it twice, traced it to a comparison in the authentication path, wrote the fix,
updated the tests, and wrote three documents explaining the finding.

Every 401 was my own request. The platform accepts `X-Api-Key` or
`Authorization: ApiKey`; I sent `Authorization: Bearer`, and read the 401 as
confirmation of the defect I was already looking for. Sent correctly: 200.

Worse, when I then tested the mechanism I had blamed — nulling a never-used key's
organization so the comparison would have to reject it — that returned 200 too.
The branch I built a fix around does not fire, and I still do not know why.

**So I reverted the fix.** It changed which organization a new key belongs to, on
the strength of a defect I could not demonstrate. Keeping a behaviour change no
evidence supports is the same mistake as keeping a bandage, and harder to spot
because it looks like diligence.

U3 goes back on the backlog as *unverified*, alongside a real open question: a
security comparison exists that I cannot explain the behaviour of. That is worth
understanding before it starts mattering.

What I never did, in an entire investigation of a 401, was make one API-key
request I expected to **succeed**. It would have taken seconds
([L30](LESSONS.md)).

---

## 2026-08-10 — The authority graph is now something a person can change

R6 shipped typed organization edges and seeded them permissively, which left the
feature real and unreachable: lowering a ceiling meant writing SQL. There is now
an API and a settings page.

**Guarded by `directory.organizations.manage`**, not a feature of its own.
Editing an edge changes what everyone below may do — the same risk class the
descriptor already assigns to organization management (E5, not delegable) — and a
second permission over the same act would be a second place to get it wrong.

**Four refusals, each protecting something structural.** A self-edge is a cycle
with nothing to terminate on. An edge pointing back up the tree makes "what is
above this organization" have two answers, when the tree is what scopes every
query in the platform. An organization from another tenant would produce a row
that is invisible rather than dangerous — and a write that silently does nothing
is worse than one that fails. And a stale update is refused outright.

**The optimistic-lock guard caught me.** The platform asserts that every mutating
UI file either sends a version header, is inline-exempt, or is allowlisted. My
page did none of those and the gate failed. The right response was not the
allowlist: two people editing the same ceiling from two tabs must not resolve to
whichever saved last, because for authority configuration a lost update is a
security change nobody chose. Both sides now implement it.

That guard is the second time this week a platform-level test has caught
something I would have shipped. It is worth noticing what they have in common:
both assert a **property across the whole codebase** rather than the behaviour of
one unit, so neither can be satisfied by a new file that simply forgets.

**The page's real work is saying what things mean.** "A2" and "reference_only"
are not self-explanatory, so every dropdown carries its meaning — "A2 — needs
approval first" — and the page states plainly that raising a ceiling grants
nothing on its own, it only removes a restriction that edge was imposing.

Gate: 22/22 tasks, 12,527 tests.

---

## 2026-08-10 — U7: the journal can finally tell a machine from a person

`action_logs.actor_user_id` is a uuid column, and the subject is narrowed on the
way in — `api_key:<uuid>` has always been stored as the bare uuid. A key acting
and a person acting were indistinguishable in the journal, which is the single
distinction this platform exists to make. R3 closed it for the hash chain by
reading the raw subject; the journal's own column stayed wrong until now.

`actor_kind` is written from that same raw subject, so the journal and the chain
tell one story. The column is nullable and **null means unknown, never human**:
an entry written before the column existed cannot have its kind recovered from
the row alone.

**The backfill taught me something about my own reasoning.** I wrote it with two
inferences — an id matching `api_keys` is a service principal, no actor at all is
the system — and a comment asserting that a human could not be distinguished from
an unknown actor. The dry run then reported **15 rows "cannot be determined"** on
an instance with one admin.

That number is not plausible, and it was not a bug in the query: it was a
limitation I had asserted without checking. Matching the `users` table is exactly
as sound as matching `api_keys` — the same inference in the opposite direction.
With it, all twenty rows resolved and none were guessed.

Had the command not printed its breakdown before writing, I would have applied it,
seen no error, and left every historical human action permanently unattributed —
in the audit trail, which is the one place that is supposed to be recoverable
after the fact.

Also surfaced in the API and the detail dialog, because a journal that records a
distinction and never shows it has not closed the gap.

Gate: 22/22 tasks, twice — the log held two complete runs after a timeout, both
green (L26 is why I checked before believing the test count).

---

## 2026-08-09 — Three small repairs, and the proof I could not get yesterday

**The audit journal now refuses to lose a scope it was given.** `normalizeInput`
nulls any tenant, organization or actor id that is not a uuid — right for a value
nobody supplied, data loss for one somebody did. A tenant-less entry is returned
by no tenant-scoped query and, since R3, covered by no hash chain: the write
appears to succeed and the record is both unreachable and unprovable. It now
throws, naming every dropped field and the consequence. The old behaviour warned
**once per process**, so the first bad write was reported and every one after it
was silent; every occurrence is logged now.

**Shadow mode has a heartbeat.** After the autonomy matrix was scoped to workers,
ordinary traffic stopped producing any interesting line — and an empty log then
meant either "nothing worth reporting" or "the shadow is not running". Those are
opposite conclusions and I could not tell them apart. The report now says
*"nothing to report, and that is a finding: 240 permission checks were observed
and none would change"*, which is a result rather than an absence of one.

**`OM_LOG_LEVEL` never reached the app.** Turbo runs tasks in a filtered
environment: anything not declared in `globalEnv`, `globalPassThroughEnv`, or a
task's own `env` is dropped silently. `OM_LOG_LEVEL=debug yarn start` looked like
it worked and produced nothing, which is exactly the kind of failure that costs
an hour and teaches the wrong lesson. Both runtime knobs are declared now, and
the runbook warns the next person.

**And with that, the proof I lacked.** Yesterday I reported the matrix correction
as 45 observations → 0 while admitting I could not distinguish "no findings" from
"not running". With debug logging actually reaching the app, the same traffic now
produces **17 "Resolver agrees" lines and zero of everything else**. The shadow
is running, and the correction holds. An inference became a measurement.

Gate: 22/22 tasks, 12,510 tests.

---

## 2026-08-09 — Shadow mode found a design error in its first hour, which is what it was for

With credentials from the owner I logged in and walked all 84 backend pages and
60 API routes. Forty-five shadow observations, twenty-one capabilities.

**Zero disagreements.** The resolver would refuse nothing the platform allows
today — enforcement would lock nobody out.

**Forty-five of forty-five were people acquiring an obligation.** Changing your
own sidebar layout would enter a review queue. Editing a dictionary would need a
second person's approval. Composing a message would be queued for review.

That is not a finding about the platform. It is a design error in the resolver,
and it is mine.

**The mistake.** I applied the autonomy floor matrix to every actor. The gates
describe how much a *worker* may do unattended — `A1` is defined in the planning
as *"the worker produces a proposal; a human performs the act"*, which has no
meaning when the actor **is** that human: the thing A1 asks for has already
happened. Reading the table as applying to people turns every ordinary write into
supervised work.

The planning's own §7 warns about exactly the consequence: *a control that is
expensive to operate gets switched off* — and it takes the useful controls with
it when it goes.

**The correction.** The matrix and the irreversibility cap bound machines and
delegated authority. A person exercising a permission they hold is bounded by the
other ceilings: the org graph, the record's state, the delegation they act under,
and tenant policy. Four-eyes on financial acts belongs in policy, deliberately —
that is a decision each company makes rather than one a table imposes. The effect
class is still *recorded* for human decisions, because dropping it would make a
decision about a destructive act read exactly like one about a read.

**Re-measured on the same traffic: zero.**

**What I could not prove, and said so.** After the correction, human traffic
produces no info-level lines, so silence became ambiguous — it means either
"nothing interesting" or "the shadow stopped running". `OM_LOG_LEVEL=debug` had
no effect (dotenvx's `.env` appears to win over the process environment), and my
machine-actor control was blocked by U3: an API key created by an admin whose
organization is not pinned returns 401 at every use. So I verified the shadow is
present in the running build rather than claiming a positive observation I did
not have. Both gaps are now backlog items — the first one, a heartbeat, exists
precisely so silence is never ambiguous again.

**This is the batch that justifies shadow mode.** Had the resolver been switched
on directly, the first thing this platform's governance layer would have done is
demand approval to edit a dictionary.

Gate: 22/22 tasks, 12,497 tests.

---

## 2026-08-09 — Shadow mode: the resolver now runs on every permission check

R5 and R6 built a resolver nothing called. That gap only widens while it is true,
so the resolver now runs beside **every real permission check** in the platform —
and its answer is recorded, never obeyed.

**Why not simply switch it on.** The existing RBAC has decided these questions
for the life of the product. The resolver is new, one of its inputs is a
deliberately conservative placeholder (every machine actor capped at
approve-first until a trust model exists), and nothing models task grade yet.
Enabling it blind would refuse requests that have always worked, in production,
with no evidence about how often or where. Shadow mode buys that evidence for the
price of a log line.

**One hook, 102 call sites.** Every permission decision in the platform reaches
`RbacService.userHasAllFeatures`, so instrumenting that one method covers all of
them and every future one without touching a caller. The decision itself moved
into a private `decideAllFeatures`, so the shadow runs on a value already
computed and *physically cannot* alter it — a comment promising it would not
alter anything is worth less than a structure in which it cannot.

**The number I care most about is not disagreement.** It is
*"the resolver would add an obligation"* — both systems allow the act, but the
resolver wants approval, review or a hold window. That is the work the governance
layer would begin doing on the day it is switched on, and it is the number that
decides whether switching it on is survivable.

**Measured, not assumed:** 526 ns per call. A permission check does a cache or
database lookup, which is orders of magnitude more. The shadow deliberately skips
the organization graph, because consulting it would add a query per check for a
diagnostic — so the shadow *understates* the eventual constraint, which is the
safe direction for a measurement meant to find surprises early.

**A test earned its place immediately.** I wrote "it must never throw" as a test
rather than a comment, and it failed on the first run: the catch block logged
`input.capability.id`, so a malformed input threw *inside the handler written to
make throwing impossible*. An error path is still a path.

Gate: 22/22 tasks, 12,480 tests.

---

## 2026-08-09 — U5: the gate that failed at random was three different problems

Six full gate runs in one day, three of them failing, each somewhere different,
all passing in isolation. Investigated as one problem. It was three, and only one
was a defect.

**Two were not flakiness at all.** I had been running package suites as
`npx jest --config packages/core/jest.config.cjs` from the repo root. Several
tests resolve paths from `process.cwd()`, so they were looking for a directory
that has never existed. Turbo runs each package in its own directory; my
invocation did not. Nothing was broken — my runner was standing in the wrong
place ([L25](LESSONS.md)).

**One was a real defect, and it would have fired in CI.** The OpenAPI generator
suite builds a module tree in a temp directory, runs discovery over it, and
bundles. Idle, each test takes 165–470ms; under the gate, sharing a disk with
other packages' workers, one exceeded jest's **5s default**. Five seconds is a
contract for unit tests — *if it has not finished, it has hung* — and that is the
wrong contract for a suite whose work is I/O. Now stated explicitly at 30s, with
the reasoning in the file, and deliberately bounded at roughly 60× idle so a
genuine performance regression still surfaces.

**One has never been explained.** A decoupling test saw a capability registry
that contained `catalog` when three separate layers guarantee it cannot. Not
reproduced in three solo runs or in any gate since. Rather than invent a cause,
the test now **asserts its own precondition** — that the registry it sees has no
`catalog` key. If it recurs, the failure will say whether the mock applied, which
is the one fact this investigation lacked.

**What I assumed first and was wrong about:** CPU oversubscription. The shared
jest base already caps workers at 2 and the root script caps turbo at 2 — four
workers on eight cores. The first explanation that fits is not the same as the
one that is true.

**And a trap that nearly cost a wrong conclusion.** A timed-out run's children
kept writing to the log I then read, so one file held two turbo summaries and
looked like a failure. Tasks reported failed with zero failing assertions
underneath is the tell: a real failure names something, a killed one just stops
([L26](LESSONS.md)).

Three consecutive clean gate runs afterwards — 22/22 tasks, 12,466 tests, byte
identical counts.

---

## 2026-08-09 — R6: position in the org graph now bounds authority, and all six repairs are in

Organizations are joined by **typed edges** carrying relationship type,
inheritance mode, an authority ceiling and a capability allowlist. The tree —
`parent_id` plus the closure columns — is untouched and still scopes every query;
the edges add what a tree cannot carry.

This is invariant **I4** made structural rather than conventional. A worker three
levels down cannot exceed what the edges above it permit, whatever its own grants
say, because the resolver takes the minimum along the path.

**Why a tree was never enough.** Real customers are consultancies operating client
companies, groups with subsidiaries, temporary structures for one engagement. "We
advise that client, and may see these things but never those" cannot be said with
`parent_id`. A permission system that cannot express it gets that distinction
implemented in application code instead — differently every time.

`advises` and `serves` default to A2; `owns` and `manages` pass everything. A
consultancy advising a client should not act unattended inside it by default, and
a relationship type can only ever *lower* — a permissive type never widens an edge
somebody deliberately narrowed.

**Nothing changed on the day it landed.** The migration seeds one
`owns`/`strict`/`A5` edge per existing parent-child link, and an absent edge is
also unconstrained. The mechanism exists from now on; lowering a ceiling is a
deliberate act, not a behaviour change that arrives with a deploy.

**A methodology error worth more than the feature.** Chasing what looked like two
new test failures, I found I had been running package suites as
`npx jest --config packages/core/jest.config.cjs` **from the repo root**. Several
tests resolve paths from `process.cwd()`, so they were reading
`<root>/src/modules/...` — a directory that does not exist. The failures were
produced by how I invoked the runner, not by the code. Turbo runs each package in
its own directory, which is why `yarn test` was green while my direct invocation
was not.

That also cleared up the flaky failures around it: two full gate runs came back
green, so the earlier ones were U5's parallelism flakiness, which remains its own
backlog item.

**All six repairs are complete.** R1 principals, R2 audit coverage and atomicity,
R3 the hash-chained ledger, R4 capability descriptors, R5 the decision with
reasons, R6 the authority graph. What remains before the Starting Kit is done is
the eight grafts.

Gate: 22/22 tasks, 12,466 tests, green on two consecutive runs.

---

## 2026-08-09 — R5: authority answers with reasons, and the spike closes

The second half of the spike. Permission checks now return a **decision**: the
gate, every rule that contributed, which one was binding, what obligations
follow, and what would change the answer.

The reason this had to be built early rather than added later is that a boolean
destroys the information at the moment it is produced. By the time `false`
reaches a caller there is nothing left to explain with, and no logging bolted on
afterwards recovers it. Retrofitting explainability into a system that answers
yes/no is essentially impossible; designing for it costs almost nothing.

**What the resolver enforces today.** The grant, the R4 effect-class matrix,
invariant **I8** (an act nobody can undo is never decided after it happens — cap
A2), invariant **I4** (authority is carried, never amplified — a worker cannot
exceed its invoker), delegation and policy ceilings, and resource state. Trust,
charters, budgets and org-graph ceilings are named optional inputs: absent means
*not consulted*, never *unlimited*.

**Everything is a ceiling and the answer is the minimum.** No rule anywhere can
raise a gate. That is asserted as a property over every combination of inputs,
not as an example — if a raising rule ever existed, every other rule would become
advisory and "what is the most this could ever be" would stop having an answer.

**The one policy I invented, and why.** The trust model does not exist yet, so a
machine with no trust record resolves as untrusted and is capped at approve-first.
A placeholder erring the other way would let machines act unattended precisely
during the period when nothing is measuring whether they should. Humans are not
capped this way — that asymmetry is **I2**, and it lives in the data the resolver
reads rather than a branch that treats one kind of actor as special.

**Preflight** resolves a whole plan before work starts, which the planning
document calls the best fatigue mitigation available and I think is right: the
dominant failure of an approval system is not refusal, it is a worker stalling at
step four at hour three and somebody finding out at hour nine. Every step is
resolved even after one is blocked, and approvals are counted per capability
rather than per occurrence — approving the same act five times in a plan is one
decision a person makes.

**It is not enforcing.** Nothing calls it in the request path yet. A resolver
that silently starts refusing requests is the least safe way to introduce one.

`mercato auth authority:explain --capability attachments.manage --actor ai_worker`
prints the whole decision against the real descriptors — an AI worker asking to
delete attachments gets A1, propose-only, with the binding rule marked and the
capability's own note quoted underneath.

**The spike is complete.** R1 (principals) and R5 (decisions) were the two
timeboxed items that would tell us whether this foundation is reshapeable. Both
landed, and neither required fighting the host platform.

Gate: 22/22 tasks, 12,445 tests.

---

## 2026-08-09 — R4b: all 113 permissions described, and a guard that checks the real ones

R4 shipped with 37 of 113 features described and the rest tracked. The remaining
76 are now done, module by module, each classified by opening the routes it
guards.

**What the reading turned up**, none of which was visible from the ids:

*Workflows are the automation engine, and most of it reaches outside.* Activities
include `CALL_API`, `CALL_WEBHOOK` and `SEND_EMAIL`, so starting an instance,
signalling one, retrying one, or completing a human task are all E3 with an
external effect. Completing a task looks like the smallest act in the module and
triggers whatever the workflow does next.

*Authoring automation is authoring authority.* A business rule's actions include
`CallWebhook`, and rules fire with nobody present. Writing one is closer to
changing what the system may do than to editing a record — E5, not E1.

*Importing history pulls in without sending out.* `channel.import_history` reads
years of correspondence from an external platform into the tenant. Nothing
leaves, so it is not E3 — but it is a bulk irreversible write of other people's
personal data, which E2 says and the name does not.

*An exchange rate is a financial effect without being a payment.* It decides what
every converted amount is worth, including on documents already issued.

**A gap in my own guard, found by closing it.** The coverage test validated
*invented* descriptors and merely *counted* the real ones — so a contradictory
descriptor could have sat in a module indefinitely with a green suite. The guard
now loads every module's `acl.ts` and validates what ships, plus two new checks:
nothing marked `externalEffect` may sit below E3, and a `compensation` must point
at a capability that exists. A compensation nobody can perform is worse than
admitting irreversibility, because it reads as though a remedy were available.

**And a defect that guard exposed in my R4 code:** `getModules()` throws when the
app has not bootstrapped, and the registry's lazy hydration called it unguarded.
Asking what kind of act something is would have crashed any CLI command, worker
or test that asked. Now it degrades to "nothing to discover".

**Two self-inflicted mistakes worth recording.** Rewriting the acl files, I
rebuilt each entry by splitting its body on commas — which split inside
`title: 'Create, edit, and delete business rules'` and corrupted five files.
Restored from git and rewritten to insert before the closing brace instead:
never re-parse what you only need to append to. And the apostrophes in my notes
came through double-escaped, which the typecheck caught immediately.

Coverage is now **113/113**, asserted rather than reported, with the module set
computed so a new module cannot arrive undescribed.

Gate: 22/22 tasks, 12,409 tests.

---

## 2026-08-09 — R4: permissions now say what kind of act they are

A permission was an id and a title. `api_keys.delete`, "Delete API keys". That
answers *may this actor do it* and nothing else — not whether a machine may do it
unattended, not whether a second person should confirm, not whether it can be
undone tomorrow. Those are the questions this product exists to answer, and none
of them can be derived from a string.

Every act can now carry intrinsic risk semantics, declared once and centrally:
effect class (E0 read → E6 destructive), reversibility, data classes, whether it
leaves the company, whether it may be delegated or covered by a standing
approval. Plus the autonomy floor matrix from the planning docs — the ceiling on
how much autonomy an act may ever permit, by effect class and task grade.

**R4 is the vocabulary, not the gate.** Nothing refuses an action yet; the
resolver that reads these is R5. Saying so plainly matters, because a
half-implemented gate that looks like a gate is worse than none.

**37 of 113 enabled-module features are described** — the nine modules that
perform the riskiest acts. The rest is R4b, tracked with the exact module list
and counted by a guard that prints coverage on every run. The guard asserts two
things hard: descriptors must be coherent, and a described module may never lose
its descriptors. It does not assert 100%, because a guard that must be disabled
on the day it is written guards nothing.

**Three classification rules earned while doing it.**

*Classify by the worst act the feature permits.* `attachments.manage` covers
upload and delete, and delete removes the file from storage. E6, not E1. Holding
a feature means holding everything it permits.

*Read the code, never the name* (L19 again). `configs.cache.manage` sounds
destructive and is genuinely reversible — it clears derived state that rebuilds
itself. `auth.sidebar.manage` sounds like a permission change and grants nothing.
`inbox_ops.settings.manage` sounds like a preferences page and sets the webhook
signing secret that decides who may inject mail into the tenant.

*A named compensation or nothing.* `compensatable` without naming the
compensating act is irreversibility wearing a friendlier word, so the validator
rejects it. That rule alone changed three of my own first-draft classifications.

Gate: 22/22 tasks, 12,366 tests.

---

## 2026-08-09 — R3: the record can now prove it has not been altered

`action_logs` answers *what happened*. It is an ordinary table: anyone with
database access can edit a row, and nothing would show it. Since the product's
claim is a governance layer that can always explain itself, "trust our table" is
not an answer.

Every audited write now also extends an **append-only, per-tenant hash chain**.
Each event carries its predecessor's hash, so altering one invalidates every hash
after it. Rewriting the successors to match is blocked by a database trigger that
refuses `UPDATE`, `DELETE` and `TRUNCATE` — verified against a superuser, because
a chain only the application declines to rewrite protects against nobody worth
protecting against.

**Hooked to `ActionLogService.log()`**, the single funnel both write paths already
pass through. A module physically cannot audit a change and forget to chain it.

**Three decisions worth keeping.**

*The chain holds no customer content.* Payloads carry the journal entry's id and
**digests** of the snapshots. That is what makes erasure possible: delete the
personal data from the journal, and the chain still verifies because it never
held the data — only proof of what it was.

*Two serialisers, deliberately.* The event envelope is strict — floats, dates and
class instances are rejected — so an outside auditor can recompute a hash.
Snapshots get a total encoder that never throws, because they contain prices and
timestamps, and a strict encoder would throw, and since the append is fail-closed
that throw would roll back the customer's write. **Be strict about what you
construct, total about what you receive.**

*The chain records the actor's kind; the journal cannot.* `action_logs.actor_user_id`
is a uuid column and the normaliser strips the `api_key:` prefix before writing,
so in the journal a key acting and a person acting are indistinguishable — the
one distinction this platform exists to make. The ledger reads the raw subject
and keeps it. The journal's own column still needs fixing (**U7**), and that
belongs with R4/R6 where principals are being worked on.

**Two mistakes on the way in.** I put the entity in its own file and re-exported
it from `data/entities.ts`; the migration loader transpiles that one file alone,
so the re-export broke `db:migrate` for every module — the convention exists for
a reason. And I proved the append-only trigger by inserting a probe row, which by
construction I could not then delete; the table had no real events, so it was
reset, but a minute later that would have been a permanent seq-999 hole in a real
tenant's chain.

Gate: **22/22 tasks, 12,348 tests**, on Node 24.

---

## 2026-08-09 — R2c was correct and unverifiable: three mistakes in the check, not the code

The owner tested R2c and the audit entry did not appear. The code was right; the
way I asked them to verify it was wrong, three times over.

**One: the app serves `dist`, not source.** The running instance was a production
build started eighteen hours earlier. My edits never reached the process serving
the page. Every check I had run — `tsc`, `jest`, the coverage guard — reads
source; none touches what executes. The settings row's `updated_at` even moved,
because the *old* code updates the same row. → [L20](LESSONS.md)

**Two: the gate had been running on the wrong Node.** Rebuilding surfaced a
version guard: the repo declares `"node": "24.x"` and the shell had **22.21**.
The previously-running build predated that guard, so nothing had ever complained.
Two `ai-assistant` suites had been failing to load — I had recorded that as an
upstream defect (U6) after stashing the tree and reproducing it at the previous
commit. The reproduction was sound and the conclusion was wrong: a control that
varies the code cannot tell you anything about the environment it holds fixed.
`isolated-vm`'s prebuild is `abi137` — which *is* Node 24. → [L21](LESSONS.md)

U6 is withdrawn. On Node 24 the gate is **22/22 tasks, 12,290 tests, zero
failures**, and that package runs 1,379 tests rather than 1,270.

**Three: I asked for permission to solve a problem I had already solved.** Having
found no Node 24 on the machine, I stopped the owner to authorise a download,
fetched 36 MB, and extracted it — next to `workspace/.toolchain/node24/`, which
had held the identical build since 3 August and which **my own runbook lists in
its second table**. Removed; the server runs on the original. → [L22](LESSONS.md)

**What changed as a result.** `local-instance.md` now opens with the Node 24
requirement and what silently breaks without it, and its "after code changes"
section says to rebuild *and restart*, force Turbo when it claims `FULL TURBO`
in two seconds, and grep `dist` to confirm the code landed before asking anyone
to look.

**The thread joining all three:** I verified artifacts adjacent to the one that
mattered. Source instead of the running process. The diff instead of the
environment. The machine instead of my own notes.

---

## 2026-08-09 — R2c: the AI approvals are recorded, and the triage that found them

**The claim I was about to write down was wrong.** R2 was going to close with a
note that the remaining eight modules needed no auditing. Before writing it I
inspected every write route instead of reasoning from module names — and found
seventeen mutating routes, nine of them in `inbox_ops`.

`inbox_ops` describes itself as an *"Email-to-ERP Agent: receives forwarded
emails, extracts action proposals using an LLM, and presents them for
human-in-the-loop approval."* That is our product's core loop, already built.
**A human approving or rejecting what a model proposed was recorded nowhere.**

The execution was audited all along — accepted actions run through the command
bus, which writes an entry with an undo token. The *decision* was not. An
investigator could see that an order was created and by whom, but not that a
machine had proposed it, nor that anyone had reviewed it.

**What changed.** Fourteen write points now record: accept, reject, reject-all
and complete (in the execution engine, next to the status transition), plus the
payload edit, recategorisation, reprocessing, settings, the outbound reply, and
both ingestion doors. The decision commits in the same transaction as the status
change it describes — if the record cannot be written, the approval does not
take effect.

**Three decisions worth keeping.**

*The verb is the point.* Recording an approval as `updated` would be true and
useless. `accepted` / `rejected` / `completed` / `failed` joined the audit
contract, and the audit projection learned to classify them — without that they
fell through to `system`, which reads as "nobody did this" and hid them from
every filter.

*Content stays where its permissions are.* No snapshot carries the extracted
payload, the description, or the message body: all of it is encrypted tenant PII.
The entry records the decision, the action type, and **the model's confidence** —
how sure the machine was about what a person went on to approve — and points at
the record for the rest.

*A failure is recorded; a success is not.* A successful execution already has its
command-bus entry. A failure had none, leaving a trail that read "approved, then
nothing" — indistinguishable from still running.

**And a platform fact that had been invisible.** An audited write must open its
transaction on the **container's** EntityManager. MikroORM creates `fork()`s with
`useContext: false`, so a transaction opened on a fork is invisible to the audit
service, which holds the container's manager — the business change would roll
back and the audit row would survive it. Nothing in the code said so;
[audited-writes.md](workspace/knowledge/audited-writes.md) does now.

---

## 2026-08-09 — R2 complete: every write that changes data is now recorded

**Audit coverage is done and guarded.** 25 write points across the four modules
whose custom routes reached neither the CRUD factory nor the command bus.
Committed as `ea35f88` (integrations, attachments, data_sync) and `a144280`
(workflows plus the coverage guard).

Where a route had no transaction, it got one. Twenty-four of the twenty-five
audit inside the transaction that performs the write, so a failed audit rolls the
change back.

**The twenty-fifth is deliberately different, and it is the interesting one.**
`workflows/instances/[id]/advance` runs activities that call external systems.
Holding a transaction across those would exhaust the connection pool and let an
`idle_in_transaction` timeout roll back a transition whose external effects had
already happened — a worse failure than a missed row. It audits afterwards and
**logs rather than throws**, because the transition succeeded and telling the
caller otherwise would be a lie.

**`integrations/credentials` carries no snapshot**, deliberately. It records
*that* credentials changed, never their values: copying secrets into a table with
different retention and different read permissions turns an audit record into a
credential leak.

**The coverage guard matters more than the wiring.** Custom routes bypass both
automatic paths, which is how sixteen modules ended up recording nothing. Wiring
fixed what existed; `audit-coverage.test.ts` stops the next route being added
silently unaudited. It asserts it found at least ten mutating routes, so it can
never pass while guarding nothing — and its mutation detection includes
service-mediated writes, because an earlier version looked only for ORM calls and
missed `integrations/credentials` entirely.

**Three scope corrections, all from inspecting rather than assuming:** `configs`
has no database writes at all (I had judged it by its name); `data_sync/validate`
only reads; and my first detector missed the single most important route in the
batch.

**Test mocks were fixed, never the routes.** Sixteen container/EM mocks across
eleven suites now model `transactional`. Degrading a route to tolerate a partial
EntityManager would have dropped the atomicity guarantee to keep a mock happy.

Gate: typecheck 20/20, lint 1/1, **test 22/22 tasks, 12,283 passed, zero
failures.**

## 2026-08-09 — R2b-factory: both audit paths now fail closed

The CRUD factory's direct-write path audited *after* its transaction had already
committed, so a failed audit could only be swallowed — throwing would have
reported failure for a change that happened. Committed as `9b0bd7c`.

`create` and `update` now audit inside `em.transactional(...)`. **`delete` had no
transaction at all** and now has one — which matters most there: after a delete
there is nothing left to describe what was removed, so losing the entry loses the
information permanently.

The helper no longer catches. An *absent* audit service is still tolerated; a
*failing write* propagates to the enclosing transaction.

**Both paths — command bus and CRUD factory — now share one rule:** a change and
the record of it commit together, or neither does.

Verified live on the rewritten delete path: creating and deleting an API key
returned 200, wrote two audit entries, and left no live key behind. Gate: 22/22
tasks, 12,280 passed.

## 2026-08-09 — R2b: a write and its audit record now commit together

**The business write and its audit entry share one transaction, and a failed
audit rolls the change back.** Committed as `a396e1d`.

Before this, `handler.execute()` committed its own transaction and `persistLog`
opened a separate one via `em.fork()`. A failure between them left a committed
change with no record — and `persistLog` swallowed its own failures, so the gap
was both possible and silent.

**The design worked because the platform was already built for it.**
`withAtomicFlush` carries a re-entrancy guard: with a transaction open on the EM
it joins rather than nesting. So the bus can own the boundary and every handler
slots inside it. `ActionLogService.log()` stopped forking — a fork gets its own
connection and its own transaction, which is exactly what made the two writes
independent.

**Fail-closed, precisely.** An *absent* `actionLogService` is still tolerated —
a downstream app may disable `audit_logs`. A *failing write* now propagates. Those
are different failures and only one means a record was lost.

**Side-effect ordering was the risk, and it is unchanged.**
`flushCrudSideEffects` still runs after the transaction commits, so events and
indexing never fire for a change that rolls back.

Five tests; one is the point — force the audit write to throw, assert the
business write is gone. Verified live too: a currencies create returned 201 with
`currencies` 10 → 11 and `action_logs` 11 → 12 in the same request.

**Not done, and now precisely scoped.** The CRUD factory's direct path still
fails open: its create/update transaction has already committed by the time the
audit write runs, and delete opens none. Throwing there would report failure for
a change that happened. Tracked as **R2b-factory**, backlog item 2.

**A third instance of one root cause, found while verifying.** A superadmin
cannot delete a currency — `mapInput` derives `organizationId` from the actor,
and a superadmin has none. That is the same shape as the two audit-scoping bugs
fixed in R2a. Recorded as **U4**, with a sweep on the backlog: *code that derives
scope from the actor breaks for the actor who has no scope*, and the superadmin
is the most privileged actor in the system.

Also today, at the owner's request: **Rule zero-four — checkpoint before anything
irreversible.** `./workspace/scripts/checkpoint.sh <label>` tags the code and
snapshots the database and `.env` — the two things git cannot restore — and
prunes to the newest five. Source files are deliberately not copied: git already
holds them, and copying would add the clutter the same instruction warned against.

## 2026-08-09 — R2a: the audit trail starts recording, and two bugs hid it

**Creating and deleting an API key is now audited and visible.** Committed as
`f75ab27`.

The CRUD factory has two write paths. Routes declaring `actions.<op>.commandId`
go through the command bus, which writes the audit entry. Routes with a plain
handler wrote nothing. The direct path already resolved the actor, the entity and
its identifiers for its side effects — everything an entry needs was present and
simply unwritten.

**Deliberately not undoable.** A command carries a reverse operation; a direct
handler does not. Rendering an undo button that cannot work would be worse than
none. Audit is a record; undo is a capability.

**Two bugs had to be fixed before any of it was visible**, and both are why the
Action Log had looked empty since the beginning:

1. Entries were scoped to the *actor's* organization. A superadmin acts with
   `orgId = null`, so they landed with no organization.
2. `api_keys` declares `orm: { orgField: null }` — its records are legitimately
   tenant-scoped. The list query filtered `organization_id = <caller's org>`,
   which hid every tenant-scoped row from everyone. That is why even the five
   entries initialisation had always written were invisible.

**Honest scope, measured after the fact.** I framed this as "one change covers
everything". It does not. It covers routes built with `makeCrudRoute` — **3 of
the 16** unaudited modules (`api_keys`, `entities`, `business_rules`) plus every
future CRUD route for free. The other 13 use custom routes that never touch the
factory. Among those, `workflows`, `configs`, `integrations`, `data_sync` and
`attachments` still record nothing, and there is no single leverage point for
them.

**The batch-T drift guard earned its keep.** Making `dashboards` a multi-line
entry in `modules.ts` broke both enabled-module parsers, which only matched the
single-line form — so `dashboards` was classified as *parked* and its 123 tests
were silently skipped. The test count fell from 12,268 to 12,145 and the guard
failed loudly. Without it, a batch would have quietly stopped testing a module we
keep.

Gate: typecheck 20/20, lint 1/1, test 22/22 tasks, **12,272 passed**.

## 2026-08-09 — R1 closed; the first half of the spike passed

**R1's defect was:** *"the kind is a string prefix re-parsed at each site — 30
files branch on it."* In enabled code, **zero do.** Adding `ai_worker` as a third
kind now costs nothing, which was the entire point.

**The spike question was: does this land in about two weeks, or metastasise into
every module?** It landed in two steps, and parking had already halved it — 18 of
the 34 sites were in code that no longer runs. That is a real signal about the
foundation: it was reshapeable.

**R1.4 deferred, with reasons.** Two items remain from the original plan and
neither is worth doing yet:

The **`principals` table** has no consumer. Principals are derived from users and
API keys and everything that needs one has it. Our own kernel design — Charters,
positions, Grant Sets — will shape its columns, so build it with its first real
consumer: an AI worker that is not a user, or **G3**, which needs stable
principal ids.

**The deprecated fields are load-bearing.** `isApiKey` has no reader left in
enabled code, but `customers`, `sales`, `staff` and `resources` read it in around
twenty places. Deleting it would not break the gate — parked source is no longer
type-checked — but it would break those modules **on restore**, adding cost to
exactly the recovery path parking exists to protect. So they stay, marked
`@deprecated`, until parked modules are restored and migrated or dropped for good.

**Also changed today, at the owner's request:** every request to verify something
in the running platform now comes with numbered steps, verified URLs, the expected
result, and the failure signature — plus an explicit note when a change is
invisible by design, which most foundation work is. Steps live in
[`how-to-test.md`](workspace/references/how-to-test.md) and are now a Rule Zero
obligation in the cookbook.

> *"I am new to the system as a whole, so I can't spot the changes after each
> stage to test."*

Asking for unguided verification put the work of designing a test onto someone
without the context to do it, and produced no signal.

## 2026-08-09 — R1.2: the branch sites are gone

Every live site that parsed the `api_key:` prefix or tested `isApiKey` now reads
the principal instead. **16 files down to 3**, and all three are the abstraction
itself: the module that owns the encoding, the `AuthContext` definition, and one
structural parameter type kept for compatibility. Committed as `9b77b70`.

The nine copies of `auth.isApiKey ? auth.userId : auth.sub` are one call.
`rbacService` tested the prefix twice per invocation and now parses once and
switches on kind. Two behavioural branches became `isMachinePrincipal(auth)`,
which says what they mean: *only people have an interactive session to reconcile*.

**Two judgement calls worth recording.**

`effectiveUserId` now derives the principal when a context does not carry one.
Cached entries, trusted envelopes and test fixtures never pass the boundary that
attaches it, and reading the field directly would have silently detached a real
user from their own preferences.

`normalizeAuthorUserId` deliberately does **not** use it. A key issued on
someone's behalf resolves to that person, but authorship is not something a
machine asserts for a human. Behaviour unchanged — R1 moves the kind into data
without changing what any call site decides.

**A latent bug fixed on the way.** The messages token route had its own copy of
the idiom that fell through to `auth.sub` for an ownerless key — putting a
prefixed key id where a user id belongs. It only ever failed the recipient
comparison, so it denied by accident rather than by design.

**Verified against a running instance, not just the suite:** human login, 44/44
backend pages, both sidebar endpoints, and — the case R1 exists for — a real API
key authenticating as a service principal, resolving its ACL through the
rewritten `rbacService` branch, and reading its owning user's sidebar preferences
through `effectiveUserId`.

One dead end, recorded so nobody re-runs it: an API key returned 401 whatever
role it had. Not a regression — `resolveApiKeyAuth` rejects a key whose
organization differs from its creator's, and the key had been created with a null
organization. Upstream behaviour, untouched by R1.

Gate: typecheck 20/20, lint 1/1, test 22/22 tasks, 12,268 passed.

## 2026-08-09 — Batch T: the gate is green, and a licence gap surfaced

**First fully green gate in this project:** typecheck 20/20, lint 1/1, build
20/20, test **22/22 tasks, 12,265 passed, zero failures**. Committed as `67b8366`.

**The planned fix was wrong, and inspection caught it.** The plan was to emit
entity ids for every module on disk, clearing 579 type errors in parked code.
Reading the code showed the registry's exclusion of parked modules is a
*deliberate compile-time guard* — it stops enabled code hard-depending on
entities whose tables no longer exist, and `attachments` demonstrates the
sanctioned alternative (`getEntityIds() as any` + optional chaining). Emitting
the ids would have destroyed a real safety property to silence an artifact.

Parked source was excluded from type-checking instead, and parked tests from the
jest run, both derived from `modules.ts` so they cannot drift.

**The honest cost: 3,472 tests across 520 suites stop running — 42% of core's
suite.** PARK now means **frozen**, not "maintained alongside everything else",
which is a change from how it was first described. A module restored after months
will need bringing up to the current contract. Recorded in
[`parked-modules.md`](workspace/references/parked-modules.md).

**A licence gap, found by the test written in this batch on its first run.**
`packages/enterprise` source was deleted back in `7f9fa5d` — but **671 files and
6 MB of build output survived**: `dist/`, `.turbo/`, `tsconfig.tsbuildinfo`.
Untracked, so never committed, yet sitting in the working tree where a container
build or archive would pick it up. The `.js.map` files carry `sourcesContent`, so
the **original commercial TypeScript was still on disk** — exactly what removing
the package was meant to prevent. Removed.

Four of the failures cleared were **pre-existing Windows portability bugs** that
had never once been seen, because every run aborted before reaching them.

**R1.3 was dropped.** Migrating 18 branch sites in parked code that is neither
compiled nor tested would be unreviewable work on code that does not run. R1.4's
exit gate is now "zero matches in enabled code", stated explicitly.

## 2026-08-08 — R1.1 lands, and the test suite runs end to end for the first time

**Batch 2 of 16 began.** R1 makes an actor's *kind* a field instead of a string
prefix. Today's step is additive: `AuthContext` now carries a `principal`
(`human | ai_worker | service | system`), and one module owns the `api_key:`
encoding so R1.4 can delete it in a single edit. Committed as `f2a53ec`.

The idiom `auth.isApiKey ? auth.userId : auth.sub` appeared **identically at nine
call sites**; `effectiveUserId()` replaces all nine. It deliberately returns
`null` — not the key id — for a service acting for nobody: personal rows keyed by
a key id can never be read back by a person.

**Parking already paid for itself.** The forensic counted 34 files branching on
the prefix. Eighteen are in parked code, leaving **16 live sites** — batch 2
halved before it started.

**Then the important finding, which is not about R1 at all.**

The full test suite has **never completed in this repo**. Turbo stops at the
first failing task, and two Windows-only failures in the Railway deploy tool
aborted every run after 7–8 of 22 packages. `core`, the largest package, was
never reached. Every "gate green" recorded before today — including the P3
baseline's "1,773 passed, 2 failed" — described a partial run as a complete one
(**L15**).

Fixed in `14acfdc`: both Railway tests made platform-correct, and `--continue`
added so one failing package can never again hide the other 21.

**First complete run: 20 of 22 tasks, 15,723 tests passed.** It exposed 10
failures across 15 suites — 10 suites from parking, 2 from the enterprise
removal, 1 from an earlier CRM cleanup, and 4 pre-existing Windows path
assertions. **None from R1**, which is the point worth recording: `shared`
(1,539) and `ai-assistant` (1,379) pass in full.

Parking also turned out to have a cost the build cannot show: the generator emits
entity modules only for *enabled* modules, so parked modules' tests lose their
generated dependencies (**L16**). Two `catalog` tests were fixed properly with
`{ virtual: true }` — they mock the module anyway and never used the real one.

Clearing the rest is now its own batch, **T**, and the plan grew from 15 batches
to 16. It blocks R1.2, because no batch may begin on a red tree — and for the
first time we can actually see whether the tree is red.

## 2026-08-08 — Phase S redesigned: park the ERP modules, do not delete them

**The owner challenged the whole stripping plan, and was right.**

> *"I am questioning whether it is riskier and takes more time to strip the
> platform from existing modules or just keep it and proceed with building… As
> long as our architectural building is in progress, what is the problem in
> keeping the rest?"*

He also observed that almost nothing had actually been deleted yet. Measured, he
was exactly right: outside the commercially-licensed `packages/enterprise`, five
files and ~2,100 lines out of 1,321,919. Every ERP module was still present.

**The evidence that settled it.** Every generated registry and the migration
runner read `resolver.loadEnabledModules()`. A module switched off in
`modules.ts` creates no tables, serves no routes or pages, registers no workers
or DI, and contributes no ACL features. **Deleting buys exactly one thing over
disabling: compile time** — about four minutes of build — in exchange for days of
per-module analysis and a permanent risk of losing something. `domain_mappings`
nearly went that way once.

Fourteen modules parked in one commit (`147c82e`). On a clean database:

| | Before | After |
|---|---|---|
| Tables | 263 | **136** |
| API paths | 428 | **244** |
| Backend pages | 67 | **44** |
| Queues watched | 42 | **26** |
| Initialisation | 91s | **38s** |

Verified in production mode: **44/44 pages return 200, zero 5xx**. Initialisation
is now warning-free — the undeclared-event and seed-mismatch warnings belonged to
the parked modules.

**One correction I had to make to my own conclusion:** two `example` endpoints
appeared to regress from 200 to 401. They had not — my second sweep sent only a
Bearer token, and those two routes read auth from cookies. With the cookie they
return 200. Same class of harness error as **L2** and **L3**.

**Costs deferred, not eliminated**, both written down in
[`parked-modules.md`](workspace/references/parked-modules.md): dormant code stays
in the repository, and dormant dependencies still appear in security audits. A
hard checkpoint before Phase K revisits this with evidence.

> **Superseded next day.** This entry claimed dormant code "still compiles". It
> does not — 579 type errors, found once a cached green was cleared. Parked code
> is now neither type-checked nor tested. See the 2026-08-09 entry above.

Also closed today: the C++ build tools. MSVC 14.44 and Windows SDK 10.0.26100 are
installed and `cpu-features` now builds — the last outstanding environment defect.

## 2026-08-08 — The platform ran for the first time, and a removal had broken it

Stopped removing modules and started the platform instead. It runs entirely on
the laptop — Postgres and Redis in Docker, the app on Node 24. No cloud needed.
Runbook: [`workspace/references/local-instance.md`](workspace/references/local-instance.md).

**Tenant initialisation failed.** An earlier commit had deleted two workflow seed
files along with the CLI commands that used them, but a library function still
loaded both by filename at runtime, and tenant setup calls it every time:

```
❌ Initialization failed: Missing workflow seed file: sales-pipeline-definition.json
```

Four commits had passed the full gate — install, typecheck, lint, test, build —
with this sitting in them. Nothing could have caught it: the reference is a
string handed to the filesystem, so there is no import to resolve and no type to
check. **A green build proves the code agrees with itself and nothing more**
(**L14**).

The deeper gap: the salvage protocol governs removing a *whole module*. Here we
had deleted files from inside a module we are **keeping**, and no protocol
covered that, so none ran.

Fixed in `a097b79` — the two seeds were sales demo data, so the calls go rather
than the files coming back. `seedWorkflowDefinition()` was kept and exported: it
lost its only caller but is domain-agnostic, and doubt resolves to keep.

**Then the platform was exercised properly.** On a clean database: 67 of 67
backend admin pages returned 200 with real rendered content, and 164 of 195 API
endpoints returned 200. Every single non-200 was traced to a missing query
parameter, a service we had not started, or an upstream bug in a module already
scheduled for removal — **one** defect in total was ours, the one above.

Two harness bugs caught along the way, both already-known patterns: guessed URLs
producing 404s that read like regressions (**L2**), and a path list carrying
Windows line endings so that all 195 requests failed identically (**L3**).

**The standing change:** boot the platform after every few removals, not at the
end of the phase.

## 2026-08-08 — Phase S begins: analysing before deleting

Started working through modules with the salvage protocol. First subject:
`customers` (173,786 lines, 25 tables) — the largest module and the most obvious
candidate for deletion.

**It is not safe to delete yet.** Three modules we are keeping reach into it:
`configs` loads its command files during upgrades, `dashboards` imports its
tables to seed demo charts, and `ai_assistant` carries 23 references. Each needs
repairing first.

Report: [`workspace/salvage/customers.md`](workspace/salvage/customers.md) —
deliberately marked **incomplete**. Three of the seven questions are unanswered,
so under our own rule it cannot authorise a deletion.

Two near-misses along the way, both now in `LESSONS.md` (L2, L3): a grep count
that looked like deep entanglement but was mostly test fixtures, and a broken
script that returned identical numbers for nine different modules.

## 2026-08-08 — Baseline verified: the platform is healthy

Ran the full gate on the untouched codebase. **This was the verification never
performed during the assessment** — the verdict carried it as its largest open
risk.

| Check | Result |
|---|---|
| Install | ✅ 1,581 packages |
| Build | ✅ 93 generated files |
| Type-check | ✅ 21/21, zero errors |
| Lint | ✅ 0 errors, 12 warnings |
| Tests | ⚠️ 1,773 passed, 2 failed — both Windows-only, both in code being removed |

Record: [`workspace/salvage/P3-baseline.md`](workspace/salvage/P3-baseline.md).

**The risk is closed.** Nothing here reopens the platform decision.

Also found: lint covers only 1 of 25 packages — their quality gate is far
narrower than it looks. Type-checking does cover everything, which matters more,
but we should extend lint to packages we keep.

## 2026-08-08 — Environment: Node 24, and a correction

Set up the toolchain. Initially proceeded on Node 22 while the project declares
Node 24, reasoning that Yarn only warned about it.

**The owner challenged this, correctly.** Running the baseline on a version the
authors never targeted would have measured our laptop rather than the platform.
Downloaded Node 24.19.0 (checksum verified), installed it *inside* the workspace
so the system Node is untouched, wiped the partial install and started again.

Also deferred — by decision, not neglect — a native component that needs a C++
compiler. Recorded as a **required** step of the Phase S reinstall.
See `LESSONS.md` L6.

## 2026-08-08 — Decision: hard fork

> *"Our platform will have a life of its own. We will change it too much to be
> able to update from theirs."*

We take Open Mercato and never merge from it again. This is what makes the six
planned repairs possible — they rewrite the identity and permission core, which
no amount of rebasing would survive.

The cost, written down so it is not forgotten: **nobody will tell us when they
patch a security hole.**

## 2026-08-08 — Decision: Open Mercato is the host, Platform 1 is a donor

Two platforms assessed with the same method. The decision turned on a criterion
introduced *after* the first assessment — how well a platform **receives** grafted
code — so Platform 1 was scored retroactively on it.

| | Platform 1 | Open Mercato |
|---|---|---|
| Rubric | 1.86 | **3.55** |
| Host-fitness | 2.25 | **4.25** |
| What is built | a permission resolver and an org graph | an entire working platform |

Neither is a governance kernel; both need ours built on top. The question was
*"cheaper to add a kernel to a working platform, or a platform to a working
kernel?"* — and the second is years of work we never wanted to do.

Platform 1 keeps a real edge in exactly one area — the **authority model** — and
contributes eight concentrated pieces: the layered resolver with its explanation
trace, typed org edges with ceilings, delegations, project-level overlays, record
locks, event visibility, locale direction policy, and a migration lock.

Plan: [`compai/planning/08-host-selection-and-migration-plan.md`](compai/planning/08-host-selection-and-migration-plan.md)

## 2026-08-08 — Assessment 2: Open Mercato

1.32 million lines — 43× the first candidate. Required a new discipline: separate
the **framework** (read in full) from the **product** (sampled against a keep/skip
list written *before* reading).

Found a genuine AI governance layer: approve-first gates with field-level diffs,
an ordered narrow-only mutation policy, model allowlists, per-turn budget
enforcement, cost attributed down to the step, and working undo/redo across 70
commands.

Three of my own findings were corrected during the assessment — all cases of
declaring something absent using our vocabulary instead of theirs (`LESSONS.md`
L7).

Also: `packages/enterprise` is commercially licensed and excluded entirely.

## 2026-08-08 — Assessment 1: Graph Portal Platform

Our own earlier codebase. Verdict **EVOLVE**: a good permission kernel with an
explanation trace, a typed portal graph, and working delegations — but **zero
AI**, despite being called an AI-first framework. A repo-wide search for `agent`,
`charter` or `ai_worker` returned nothing.

A second forensic pass overturned three things the first pass had credited it
with (`LESSONS.md` L8) — the origin of the rule that a schema is not a behaviour.

## 2026-08-08 — Method: how we assess a platform

Wrote the assessment methodology from the first assessment's mistakes: seven
batches, sixteen probes, the host/donor distinction, and the **blast-radius
test** — a flaw that fails the screen is only fatal if it is *diffused*.

That test alone separated EVOLVE from REFERENCE on the first platform.

## 2026-08-08 — Design: the four concepts

Turned the brainstorming into architecture: task grades and the autonomy ladder ·
the Worker Charter (an AI worker's "CV", compiled into runtime permissions) ·
knowledge hashtags as the human syntax of a machine-readable context graph ·
@mentions as universal addressing that carries authority but never amplifies it.

Fifteen invariants that everything else must respect:
[`compai/planning/00-product-thesis.md`](compai/planning/00-product-thesis.md).

## Earlier — where the idea came from

Three brainstorming documents: a comparison of two AI-agent workplace systems, a
survey of permissively-licensed building blocks, and a functional specification
of the product written as though we would build all of it ourselves.

[`compai/brainstorming/`](compai/brainstorming/)

---

## Keeping this file

Add an entry whenever a **decision** is made, a **phase** completes, or something
**surprising** is found. Not for routine progress — that is what the salvage
reports and batch reports are for.

Each entry: what happened, why, and what it changed.
