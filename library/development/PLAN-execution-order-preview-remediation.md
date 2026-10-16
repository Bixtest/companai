# Execution order — the preview-audit remediation and the queue behind it

**Written:** 2026-10-16 · **Author:** this session, on the owner's instruction
(*"order the tasks the way it makes sense to develop and execute — but follow the working rules
including verifying that any prerequisites are completely done and bug-free"*).

**Method.** Every prerequisite below is verified **in the code**, not in the docs (rule 1), and the
verification command is named so the next session can re-run it. This document **orders**; it does not
build. It changes no frontier — `▶ NEXT` in `MASTER-CHECKLIST` is still `T-13`/`T-14`, and this order
agrees with it.

---

## 0. The rules that order this list

| Rule | What it forces here |
|---|---|
| **15** | A fix that is straightforward and does not disturb the plan is done **immediately**, not scheduled. → `T-13`/`T-14` are one line each and live today; they go first. |
| **11 / §2.2** | A question the owner is holding is **not ours to close**. → `T-45` is **blocked on the owner's decision** (where the refusal belongs). It cannot be executed blind. |
| **10(d)** | **Prove every prerequisite flawless first, in the code** — done, functional, bug-free — or fix it / schedule it. → the verification table in §1. |
| **0** | The vision's order (Phase 0 → 10, lowest open phase first). The preview-audit findings are **repairs to the existing Phase 3–6 kernel** (policy kernel · enforcement · audit) — making a lower phase *whole*, not starting a higher one. |
| **3** | The gate is green (install · typecheck · lint · test · build) before the next batch starts. |
| **8** | A partial build is **scheduled** with gap + prerequisite + callback, never merely noted. |

---

## 1. Prerequisite verification — measured today

| Task | Its prerequisite(s) | Verified in code? | Evidence |
|---|---|---|---|
| **T-13** `--jinja` | the llama.cpp `model` service runs without it | ✅ confirmed absent | `grep -rniE "jinja" docker/ docker-compose*.yml` → **0 hits**; the `model` service (`docker-compose.fullapp.yml:344`, image `ghcr.io/ggml-org/llama.cpp:server`) lists `-m … -c … --rope-scaling … -n … -t … -tb` — **no `--jinja`**. |
| **T-14** mcp base URL | the `mcp` service reaches the embedding lane with no base URL | ✅ confirmed absent | `mcp` block `docker-compose.fullapp.yml:48–89` carries `OPENAI_API_KEY` (:87) and **no `OPENAI_BASE_URL`**; the container runs `yarn mercato ai_assistant mcp:serve-http` (`docker/scripts/mcp-entrypoint.sh`), which serves the search tools whose embedding lane lives in `packages/search`. |
| **T-45** locked-record gate | **T-32** (the recordId threading) | ✅ done | `interceptors.ts:89` is the shape-only `UUID_PATTERN`; the gate threads `recordId` at `:176–182`. **The blocker is not code — it is a decision (rule 11).** |
| **SR-38** digital-twin harness | **SR-39** + **SR-41** (the tooling set's first two slices) | ✅ done | `scripts/check-one-truth.mjs`, `scripts/check-escape-hatches.mjs` present, with `scripts/__tests__/check-{one-truth,escape-hatches}.test.mjs`; `package.json` carries `check:one-truth`, `check:escape-hatches`/`:fail`. The pattern to generalise (`check-agents-md-budget.mjs` = the ratchet) is in the repo. |
| **SR-46** two-reads lint | same; and a settings-read surface | ✅ done (with a home correction) | `packages/eslint-plugin-ds/index.js` exists **but is the wrong home** (`CC-91` row: it runs only on backend-UI files). Settings reads exist across `packages/*/src`. |
| **T-08** trust demotion | **SR-47** (the check that reports it) | ✅ done | `demoteIfEvidenceDemands` defined at `trustService.ts:196`; `grep` shows **no production caller**. |
| **T-29** C6 contract | **SR-47** | ✅ done | `commandContractMetadata` read at `command-bus.ts:452`; the only other hits are its definition (`:57`) and its own test — **zero producers**. |
| **T-43** repeat detector | **SR-47** | ✅ done | `detectRepeatedRequest` at `shared/src/lib/request-outcome/repeat.ts:138`; **only test callers**. |
| **SR-12** (fixes `CC-84`) | **identity `SR-02` + `SR-07`** | ❌ not done | `SR-02`/`SR-07` are Phase 1 (identity); neither is built. **`SR-12` gates `P2-9b`.** |
| **P2-9b** switchover | **SR-12** | ❌ not done | Flipping the default before `SR-12` makes `CC-84` (one superadmin identity outside the chat's tenant) the **default** path. |

**One hazard to clear before any check runs (rule 10(d)).** The memory records the verification toolchain
as `workspace/.toolchain/node24` (v24.19.0). **That path is absent** — measured today: neither
`workspace/.toolchain/node24` nor a repo-root `.toolchain` exists. The last session re-verified on the
host Node **v22.22.2** and the scripts behaved identically. **Restore `.toolchain/node24`, or record the
host-node fallback as the standing toolchain, before Step 3's gate.**

---

## 2. The order

### Step 1 — the two live config defects (no prerequisites; do now) — `T-13`, `T-14`

Both are one line in a compose file, both are live today, both are `urgent`. Rule 15 says do them now.

- **`T-13`** — add `--jinja` to the `model` service's command (in every compose file that runs the
  llama.cpp server), so the model's own chat template drives tool calling instead of a silent default.
- **`T-14`** — forward `OPENAI_BASE_URL` (and the key it already has) to the `mcp` service, exactly as
  `docker-compose.hermes.yml:107` already does for the Hermes gateway. Without it the embedding lane
  **silently calls `api.openai.com`** — a cost and a data-egress the platform did not choose.

**Exit gate (rule 3):** `docker compose config` parses; the stack restarts; a tool-calling turn answers;
the `mcp` container's env carries the base URL.

### Step 2 — `T-45` — blocked on your decision, then built (rule 11)

**The hole (verified in code today).** The command gate computes the record's lock ceiling —
`recordLockCeiling('locked', <non-read>) === 'A0'` (`shared/src/modules/record-locks.ts`) — but the gate
**only acts on `A1`/`A2`** (`interceptors.ts:56`, `HELD_GATES = new Set(['A1','A2'])`), so an `A0`
decision falls through to *"gate permits the act to run now"* (`:183–187`). The gate excludes `A0` on the
stated reasoning that *"RbacService has already made it at the route guard"* (`:72–79`) — true for
**capability** refusals, **false for record-lock** ones, because `refusalFor` (`rbacService.ts:595`) calls
`decideFor(subject, feature, scope)` with **no recordId**. Net: **a `locked` record is writable by any
actor holding the capability.** The command gate is the only production path that threads a recordId.

**The decision is yours (rule 11): where does the refusal belong?**
- **Option A (recommended) — the gate refuses `A0`.** The gate is the *only* production path that has the
  recordId, and it already computes the `A0`; it just does not act on it. The change is small (treat `A0`
  as a refusal in the gate). Capability `A0`s never reach the gate — the route guard refuses first — so
  there is no double-handling. The gate's docblock claim must be corrected by name (rule 13).
- **Option B — the route guard refuses.** Thread the recordId into `refusalFor` so `RbacService` makes the
  `A0`. Matches the stated design, but the route guard has no payload today, so the recordId must be
  plumbed from the route — a wider change for the same outcome.

**Exit gate:** the standard proof (tests + RED-then-GREEN mutation), the docs pass, and the pinned test
*"still passes a locked record"* flipped to *"refuses a locked record"*.

### Step 3 — finish the tooling set (`CC-91`) — `SR-38`, `SR-46`

The SRS sequences this **first** — *"tooling; land FIRST; no blockers; make everything after cheaper."*
Two of four slices are in (`SR-39`, `SR-41`); this is the remainder.

- **`SR-38`** — the digital-twin harness: fixtures typed against the **real** interfaces, so a stale fake
  becomes a **compile error**, not a silent pass. A `tsc` surface, not a runtime check.
- **`SR-46`** — the two-reads lint: a setting read twice in one scope must be read once. **Its home is
  corrected** (`CC-91` row): it belongs in the `scripts/check-*.mjs` family, **not** `eslint-plugin-ds`,
  because the plugin only runs on backend-UI files and would never fire on the files that read settings.

**Clear the `.toolchain/node24` gap first (§1).**

### Step 4 — wire the dead controls `SR-47` reports — `T-08`, `T-29`, `T-43`

The check now **reports** them; these steps make it **fail-proof**. Each is "the control is declared and
nothing reads it" — the same class `SR-47` exists to catch.

- **`T-08`** — trigger trust demotion (`demoteIfEvidenceDemands` has no production caller).
- **`T-29`** — give the C6 command contract a producer (the reader is wired; zero handlers declare
  `risk`/`approval`/`idempotency`).
- **`T-43`** — wire `detectRepeatedRequest` ("show the saving").

**Exit gate:** `check:declared-controls` flips these registry rows from `UNCOVERED` to `COVERED`.

> **Steps 3 and 4 are independent and may be swapped.** The SRS sequences tooling first; the counter-argument
> is "defects before tooling." Either is defensible; the SRS's order is the recorded one.

### Step 5 — the core track — identity → `SR-12` → `P2-9b`

- **`SR-02` + `SR-07`** (identity, Phase 1) →
- **`SR-12`** — one tenant ↔ one engine home; per-run credential — **the fix for `CC-84`** →
- **`P2-9b`** — the switchover.

**Not startable yet** (§1): `SR-12`'s prerequisite is identity, which is unbuilt; `P2-9b`'s prerequisite
is `SR-12`.

---

## 3. The one thing that needs you

**`T-45` cannot start without your decision (rule 11): the locked-record refusal belongs at the gate
(Option A, recommended) or at the route guard (Option B).** Everything else in this order is unblocked.
