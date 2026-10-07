# State of play — what is done, and what is next

**Written:** 2026-10-07
**Measured at:** docs repo `79c0b13` · code repo `462540e` (HEADs after the `configs` + `currencies` fixes; both re-read this session, not remembered)
**Owner:** Ramzi (not a developer)

This page answers one question: **where is the project really, and what is the next thing?**
Every figure below was measured from the files in this session, by **two separate routes**
where a number matters. Where the documentation and the code disagreed, the code is quoted.

**Read this with:** [`../../JOURNAL.md`](../../JOURNAL.md) ★ ACTIVE TASK box (the work in hand),
[`BUILD-ORDER.md`](BUILD-ORDER.md) (the order), [`BACKLOG.md`](BACKLOG.md) (the live status).

---

## 1. The short answer

**The product is real and running. The one live defect is a security-plumbing family, and it is
two-thirds closed.**

- The **AI half is built and proven live**: a real prompt produces a schema-valid Business IR
  through the running platform (`G-17`), and the three endings a prompt can have exist as typed,
  tested code (`G-21`).
- The **guard family** (`D2-wide` + `D2-gap`) — the thing that makes "the AI can be wrong but cannot
  cross the authority boundary" true rather than aspirational — is the work in hand.
  - `D2-wide` (routes still calling the **old, deprecated** check, which silently skips the real
    registry): **COMPLETE across every enabled module.**
  - `D2-gap` (routes calling **no** check at all): **measured 10 unguarded verbs** after this
    session's latest fixes (it read 50 before; the `ai_assistant` 9 were its declared set-asides,
    now classed correctly; then `search` 7 and `webhooks` 7 were fixed, `directory`/`progress` wired,
    `dashboards`/`data_sync` set aside, `configs` fixed — 4 → 0: 1 wired, 1 already
    registry-guarded inline, 2 read-only set aside — and `currencies` fixed — 4 → 0: all 4 wired).
    **Every double-digit module is closed.**
- **The next thing is `entities` (4 — but 2 of those are the
  optimistic-lock floor, not a live hole), then 1/1.**
  Note: **two of the tool's "biggest" remaining modules are tool labels, not a live hole** —
  `ai_assistant` (9, all declared set-asides) and 2 of `entities`' 4 (the optimistic-lock floor).
  Measured this session, verified by a critic pass (§4).

---

## 2. What is DONE — and how I checked it from the code, not the docs

### 2.1 The guard registry is real and reachable (the `D0` fix holds)

This is the foundation the whole guard family rests on. The defect was: *the generated guard registry
was empty in the running app, so every write ran zero guards.*

**Measured from the code, in three links:**

| Link | The file | What it does | Status |
|---|---|---|---|
| 1 | `packages/shared/src/lib/crud/mutation-guard-store.ts` | the registry itself (`globalThis` store) | present, 69 lines |
| 2 | `packages/shared/src/lib/bootstrap/factory.ts:103` | `registerMutationGuards(data.guardEntries)` — called at bootstrap | **present and unconditional** |
| 3 | `apps/mercato/.mercato/generated/guards.generated.ts` | the generated file the bootstrap imports | **NOT empty — carries 1 entry** (`entities`, 2 guards) |

**So the registry is populated.** The route the doc claimed was empty now carries `entities`'
two guards — the module that is enabled *and* ships guards.

### 2.2 Which guard modules exist, and why only one reaches the app

Measured by walking the tree: **three** modules ship a `data/guards.ts` —

- `packages/core/src/modules/entities/data/guards.ts` — **enabled**, so it is wired (the file's own
  header says exactly this: *"the only modules that shipped a `data/guards.ts` were parked
  (`customers`, `customer_accounts`), so `guardEntries` was empty in the running app"*).
- `packages/core/src/modules/customers/data/guards.ts` — **parked**, correctly excluded by the generator.
- `packages/core/src/modules/customer_accounts/data/guards.ts` — **parked**, correctly excluded.

**Conclusion:** the generator is not missing anyone. It wires every enabled module that ships a guard
set. The registry is small (one module, two guards) but **correct** — the emptiness defect is fixed.

### 2.3 `D2-wide` — complete, every enabled module

The journal's queue table names 13 modules migrated, from `dashboards` (`a05ea2c`) to
`feature_toggles` (`5af76bc`, the last). `feature_toggles` measures **0** deprecated calls in the tool.
I did not re-run each commit, but the end-state is independently confirmed by the measurement tool
(below), which counts **`D` (deprecated) = 0 for every enabled module**.

### 2.4 `D2-gap` — measured (10 after this session's latest fixes), and every double-digit module closed

> **SUPERSEDED 2026-10-07 (same day, later):** this snapshot recorded the sweep at **41 unguarded**.
> The `search` module was then fixed (**7 → 0**), so the live figure became **34**; then four
> "leftover-verb" modules were closed — `directory` (3) and `progress` (3) wired, `dashboards` (2) and
> `data_sync` (1) set aside as measured read-only — so the live figure became **25**; then `webhooks`
> (**7 → 0** — 5 wired, 1 re-export shim re-classified, 1 actor-less set aside) brought it to **18**,
> with wrapper class **132**, re-export **6** and actor-less **2**; then `configs` (**4 → 0** — 1 wired,
> 1 already registry-guarded inline, 2 read-only set aside) brought it to **14**, with wrapper **133**,
> registry **1** (the tool's first non-zero), read-only **6**, guarded **217**; then `currencies`
> (**4 → 0** — all 4 genuine writes wired through a new `beginCurrenciesMutationGuard`, the label did
> NOT split) brought it to **10**, with wrapper **137** and guarded **221** (details in `BACKLOG.md`
> §D2-gap and `BUILD-ORDER.md` §2f). **Every double-digit module is now closed.** This section is kept
> as the study's own reading, per the "every figure names its HEAD" rule; it is not the current number.

**Route 1 (the tool):** ran `node analysis/d2-gap/measure.js` this session. It reproduces the
documented headline **50 unguarded** — and, after this session's tool fixes, reads **10**.
Closure at 10: `137 (wrapper) + 1 (registry) + 35 (crud) + 42 (local helper) + 6 (re-export)
+ 0 (deprecated) + 8 (auth-flow) + 2 (actor-less) + 6 (read-only) + 9 (guard-system) + 0 (lock-floor)
+ 10 (unguarded) = 256`.

**Route 2 (the code):** grepped each fixed module's `api/` for a registry path. Every one is wired:

| module | files referencing a registry path | docs claim |
|---|---|---|
| `audit_logs` | 2 | done, `4ef5812` |
| `ai_assistant` | 2 | done, `0af50c8` |
| `auth` | 3 | done, `8e1632c` |
| `business_rules` | 2 | done, `c9a6bb6` |
| `inbox_ops` | 3 | done, `0350563` |
| `workflows` | 7 | done, `a9ecd21` |
| `attachments` | 2 | done, `88582bd` |

**Route 3 (the tests):** ran the exact proof suites the docs name. **101 tests green**:

- `attachments/api/__tests__/d2-gap-wiring.route.test.ts` — **17/17**
- `workflows` + `business_rules` + `auth` d2-gap suites — **71/71**
- `shared/lib/crud/__tests__/mutation-guard-registry.test.ts` — **13/13**

So the two claims that matter are true by three independent routes: the fixes are in the code, the
code is tested, and the count is reproducible.

### 2.5 The stack

`docker ps` this session: **8 containers**, server **29.8.1**.
`starting-kit-app-1` (Up 24h) · redis, mcp, opencode, model, meilisearch, postgres **all healthy** ·
`hermes-local` Up.
**`mercato-mcp-local` is now `healthy`** — it read `unhealthy` in the previous session. Seven
containers healthy/up, no unhealthy container.

---

## 3. What is NEXT

**Immediate (the ★ ACTIVE TASK box):** the `D2-gap` sweep, **largest module first**.

| # | Module | Unguarded verbs | Notes |
|---|---|---|---|
| **1** | `entities` | **4** | **2 are the optimistic-lock floor, not gaps** (§4 Finding 3) |
| 2 | `onboarding` / `scheduler` | 1 each | |

*(Every double-digit module is now closed. Measured this session, **all 9 `ai_assistant` verbs are
its declared set-asides** (7 session/flow + 2 pending-action-gate) and **none reaches the registry** —
the tool re-lists them only because it has no set-aside *class* for them. **So `ai_assistant` is a
tool fix, not guard work (§4 Finding 2, verified by a critic pass).** `configs` (**4 → 0**) and
`currencies` (**4 → 0**) were fixed this session — `configs`: 1 wired, 1 already registry-guarded inline,
2 read-only set aside; `currencies`: all 4 wired, no set-aside. The real next module is `entities`.)*

**After the sweep (from the box's queue):**

| # | Item | Why |
|---|---|---|
| 13 | **`D3`** — add the `escalate` outcome to the guard result | the guard engine returns a plain yes/no today |
| 14 | **The Metadata Registry** service | the last Phase-0 foundation item; everything stacked on it inherits it |
| — | **`G-12`** (business backup/restore) | sits as `G-17`'s rival for the next build slot |
| — | **`S-02`** — the Hermes tool door | where `D2-gap` and Hermes meet (§4.4 (b)) |

**What needs the owner:** only **item 5** in `NEEDS-YOU.md` (change the Coolify admin password).
Everything else is mine.

---

## 4. Findings — measured this session, and what the documents did not yet say

**Headline of §4:** the tool's `50 unguarded` **over-counted by 9** — the `ai_assistant` verbs are
the fix's declared set-asides, not gaps. **Fixed this session:** the tool now has a
`GUARD_SYSTEM_SET_ASIDE` class and reads **41 unguarded**, not 50. **The 41 still contains at least
one mixed file** (`entities/api/records.ts`), which is left in the count on purpose (Finding 1). Each
claim below was re-measured after a hostile critic pass.

### Finding 1 — `entities 4`: 2 verbs on the lock floor, 2 genuine — and the file stays in the count on purpose

The tool lists `entities` as **4 unguarded verbs** across two files. Measured from the code, verb by
verb (**corrected twice — a hostile critic pass broke my first version, see the note below**):

- `api/records.ts` — exports **POST, PUT, DELETE** (3 verbs):
  - **PUT** (line 556) and **DELETE** (line 623) each call
    `enforceCommandOptimisticLockWithGuards()`. That is the **optimistic-lock floor**, *not* the
    mutation-guard registry — the `...WithGuards` suffix means the *command optimistic-lock* guard
    service. **This is the exact trap the `directory` record already documents** (BACKLOG.md line 190:
    *"`enforceCommandOptimisticLockWithGuards` does **not** run mutation guards"*). A `grep -i guard`
    shows the file as "guarded"; it is not mutation-guarded.
  - **POST** (line 420): **no guard of any kind.** The POST body (lines 420–500) contains no guard
    call, no lock-floor call, nothing. **Genuine `D2-gap`.**
- `api/entity-settings.ts` — **PUT** (line 56): only `metadata.requireFeatures`
  (`entities.definitions.manage`, lines 13-14). **No guard mechanism of any kind.** A **genuine**
  `D2-gap` — and the same class as `auth`/`business_rules`: **label right, implication wrong**
  (capability-guarded, not unprotected).

**So of `entities`' 4: 2 genuine gaps** (`records.ts` POST, `entity-settings` PUT) **+ 2 verbs on the
lock floor** (`records.ts` PUT/DELETE). **The file is deliberately NOT set aside**, because one of its
verbs (POST) is a real gap: **one protected verb must not launder an unprotected sibling in the same
file.** The tool keeps all three of its verbs in the GAP column, which is the honest reading.
**Tool change:** a `COMMAND_LOCK_FLOOR` class was defined but left **empty on purpose** (no file
currently qualifies, because `records.ts`'s POST blocks it), so a future all-floor file is recorded
with its reason instead of read as a gap.
**Status:** the 2 genuine verbs should be wired like `auth`'s were. **Not a live authorization hole** —
both are capability-gated — but they are real `D2-gap` work.

> **How my first version was wrong, kept visible.** I first wrote *"POST / PUT / DELETE each call
> `enforceCommandOptimisticLockWithGuards()`"* — an over-generalisation from a `grep` that returned
> the two call lines without showing which handler they sat in. A critic pass read the POST body
> (420–492) and found **no** call, then I re-measured: the POST block holds only a *comment* using
> the word "optimistic". **The lesson is the same one this sweep keeps paying for: a `grep` showing
> a symbol in a file is not proof the *verb* calls it.** Group the hit to its handler before
> counting.

### Finding 2 — `ai_assistant 9` was a tool mislabel, not real work (verified, then fixed in the tool)

The tool listed **9** `ai_assistant` verbs as remaining GAP. Read from the code, all 9 are the
**named set-asides** from the `ai_assistant` fix (`0af50c8`):

- 7 **session/flow** verbs — `ai/chat`, `ai/run-object`, `route`, `chat`, `session-key`, `mcp-key`,
  `tools/execute` — governed by their own mechanisms (rate limits, short-TTL keys, per-tool feature checks).
- 2 **pending-action gate** verbs — `ai/actions/[id]/confirm`, `ai/actions/[id]/cancel` — governed by
  `runPendingActionRechecks()`.

The tool had classes for `AUTH_FLOW_SET_ASIDE`, `ACTORLESS_SET_ASIDE` and `READ_ONLY_SET_ASIDE`, but
**no class for `ai_assistant`'s named session/flow set-asides** — so it re-reported them as GAP.
**Independently verified by a hostile critic pass:** it grepped all 9 paths for any guard mechanism
and found **only comment-text matches** (`cancel/route.ts:24,26` documents the failure mode;
`chat/route.ts:182` says "Guard against writes after close"). **None of the 9 reaches the registry,
and all 9 are exactly the set-aside verbs.**
**Fixed this session:** a new `GUARD_SYSTEM_SET_ASIDE` class (keyed on module + file path, so a *new*
unguarded `ai_assistant` verb still reads as GAP). **`ai_assistant` 9 → 0 GAP / 9 set aside.**

### Finding 3 — `previous_thread.md` is **untracked** in the docs repo

`git status` in the docs repo shows one untracked file: `library/development/previous_thread.md`
(23,467 bytes, the owner's hand-off from the other agent, written 07:20 today). It is **not committed**.
**Status: needs the owner** — I have not committed it, because it is his file and may be a scratch
hand-off. Say the word and I will commit it into the docs history, or leave it.

---

## 5. What the last thread (the other agent) said, and how it lines up

`previous_thread.md` is a transcript of the other agent's session yesterday (2026-10-06). Its final
state, checked against what I measured:

| The other agent said | My measurement | Agrees? |
|---|---|---|
| Docs at `f54e149`, code at `e26642c` | Docs now `839ffe1`, code now `88582bd` | **superseded** — ~20 more commits since |
| The active task is `translations` (6 calls / 2 files) | `translations` measures **0** deprecated | **done since** (`a2f8d5f`) |
| `D2-wide` = 126 deprecated calls / 49 files | tool reads **0 deprecated** for every enabled module | **`D2-wide` complete since** |
| The queue: `planner` → `query_index` → `auth` → `directory` → `feature_toggles` | all five are migrated (`641d3af`, `cc5a237`, `aeeaad0`, `d682c09`, `5af76bc`) | **all done since** |
| 8 containers, redis + mcp healthy | 8 containers; **7 healthy/up + `mercato-mcp-local` healthy** | **agrees** |
| Its reference files (JOURNAL box, BUILD-ORDER §2e, BACKLOG, LESSONS) | the same files are the ones I used | **agrees** |

**The one substantial thing the last thread got directionally right, and the owner corrected it:**
the other agent first described the product as *"the AI is the builder, used once"* — **wrong**. The
owner corrected it: this is an **AI-first platform where you use the AI all the time**; a saved
Function is a **shortcut you earn through repetition**, not the shape of the product. The other agent
recorded the correction in full. **This matters because it is the same correction I must carry: the
AI is the workspace, used constantly; the Function is the durable asset a prompt can become.**

**The key turning point the other agent named, still true today:** the platform "looked finished in
the guard layer and was not" — the auto-wired registry was empty and most routes called a deprecated
resolver that silently bypassed it. **That is `D2-wide` + `D2-gap`, and it is why Phase 0 must close
before anything is stacked on it.** I verified the `D0` half of that is fixed (§2.1).

---

## 6. My main reference files going forward

**What we are building (the design)**
- [`../WHAT-WE-ARE-BUILDING.md`](../WHAT-WE-ARE-BUILDING.md) — source of truth #1, plain English.
- [`../ai/ai-first/`](../ai/ai-first/) — the four numbered architecture documents (03–06) + the
  Hermes forensic analysis. These govern.
- `compai/planning/00-product-thesis.md` — the thesis and its 15 invariants.

**Where we are / what is next (the spine)**
- [`../../JOURNAL.md`](../../JOURNAL.md) ★ ACTIVE TASK box — the **only** place that says "doing X now".
- [`BUILD-ORDER.md`](BUILD-ORDER.md) — the order (§2e = the `D2-wide` worked pattern).
- [`BACKLOG.md`](BACKLOG.md) — source of truth #2: order + live status.
- `analysis/d2-gap/measure.js` + `FINDINGS.md` — the re-runnable `D2-gap` count.

**Rules and history**
- [`WORKING-RULES.md`](WORKING-RULES.md) — the standing rules.
- `LESSONS.md` (L1–L91) — binds both ways; read it and add to it.
- [`HANDOVER.md`](HANDOVER.md) — the front door; two-repo layout and traps.
- `.workbuddy-ai/memory/` — the project memory.

**The traps already paid for, that this study re-used**
- **L88:** a mutation that leaves a suite green may have run nothing (`[entityType]/[entityId]`
  brackets read as a jest glob) — check the test count and use `--runTestsByPath`.
- **`enforceCommandOptimisticLockWithGuards` is NOT a mutation guard** (`directory` record) — hit
  again by `entities` (Finding 1).
- **The `D2-gap` label is a four-symbol string scan** — it can read a guarded route as GAP
  (`messages`, `communication_channels`, `notifications`, and now `entities` partly). **Measure the
  premise before applying the fix the label implies.**
