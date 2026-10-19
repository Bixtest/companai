# PLAN — `T-35`: the sandbox's advertised caps become real

**Status: BUILT AND CLOSED 2026-10-19.** Slot 0 / `CC-92`. Source: `PREVIEW-AUDIT-TRIAGE.md` §1.3
(`T-35`, `08 §13 A2-06`), rank **small**.

**Files changed:** `packages/ai-assistant/src/modules/ai_assistant/lib/sandbox.ts` (the cap wrapper, the
count, the removal) · `lib/codemode-tools.ts` (stop passing an option that was ignored) ·
`lib/__tests__/sandbox.test.ts` (+8 tests).

---

## 1. The measurement

`packages/ai-assistant/src/modules/ai_assistant/lib/sandbox.ts` declares three options:

```ts
export interface SandboxOptions {
  timeout?: number        // destructured and enforced
  maxOutputSize?: number  // destructured NOWHERE
  maxApiCalls?: number    // destructured NOWHERE
}
```

`createSandbox` opens with `const { timeout = 30_000 } = options`. Measured across the whole package:
**`maxOutputSize` and `maxApiCalls` appear only in the interface** — no read, no default applied, no
enforcement. That is `CC-101`'s class exactly: a control that exists and that nothing consumes.

**And the audit's sentence needs one correction (Rule 13), because it understates and mislocates the real
protection:**

- **`maxApiCalls` — the protection exists, in the wrong place.** `codemode-tools.ts:698-713` implements the
  cap inside the caller's `apiRequestFn` callback, against the **observed HTTP method** (a dynamically-built
  method cannot escape it). So a caller that forgets it gets an **unlimited** sandbox, and the sandbox itself
  is the component that cannot enforce the limit it advertises. The defect is not "the cap is missing"; it is
  **"the sandbox's option is decorative and the safety depends on the caller remembering."**
- **`maxOutputSize` — nothing implements it anywhere, and nothing wants it.** The isolate's own `memoryLimit`
  (`MEMORY_LIMIT_MB`, 32MB) already bounds a runaway result, and the console proxy already caps entries at
  100 × 1000 characters. A second byte counter would be theatre.
- **`SandboxResult.apiCallCount?: number` — a third decorative member the audit did not name.** Declared,
  never written. Callers log `apiCalls` from their own counter, so the sandbox's own count is invisible.

## 2. The requirement

**R1 — the sandbox enforces `maxApiCall` itself.** It wraps any injected `api.request` and throws past the
cap. The option becomes real, and a caller that forgets gets the documented default (50) instead of
unlimited. The caller's method-aware mutation cap stays where it is — the sandbox's is a backstop, not a
replacement, and the two are different controls.

**R2 — `apiCallCount` is written.** The result carries what the sandbox actually counted, so a caller that
logs the result reports the sandbox's own number rather than its private one.

**R3 — `maxOutputSize` is removed, and the removal is recorded.** An option that promises a limit nothing
implements is worse than no option: the next caller writes `{ maxOutputSize: 1024 }` and believes the run is
bounded. Deleting it, with the reason, is the fix.

**R4 — the caller stops passing a value that was ignored.** `codemode-tools.ts:721` passes `{ maxApiCalls }`
to an option that never read it; it now passes nothing and relies on the sandbox's default, while keeping its
own method-aware cap.

## 3. The proof

1. A sandbox whose `api.request` is called `cap + 1` times fails with a message naming the cap.
2. The same at exactly `cap` succeeds, and `result.apiCallCount` equals the observed calls.
3. A sandbox with **no** `api` injected (the search tool's shape) is unaffected — no wrapping, no throw.
4. An injected `api` without a `request` function is passed through untouched.
5. `SandboxOptions` no longer declares `maxOutputSize` (the interface is the contract).
6. The caller's method-aware mutation cap still fires (unchanged behaviour, asserted in its own suite).

**Mutations, each RED then restored byte-identical** (checksums first — `L187`; restore by copy):

| # | Mutation | What must go red |
|---|---|---|
| M1 | drop the sandbox-side cap wrapper | (1) |
| M2 | off-by-one: refuse at `>= maxApiCalls` | (2) — the exact-cap call must still pass |
| M3 | stop writing `apiCallCount` | (2) |
| M4 | re-add `maxOutputSize` to the interface | (5) — a cap that is advertised and unimplemented |

## 4. The run

**5/5 RED, every file restored checksum-verified** (`L187`: checksums first, restore **by copy**).

| # | Mutation | Result |
|---|---|---|
| M1 | drop the wrapper's throw | **RED** — 2 failed |
| M2 | off-by-one: refuse at `cap - 1` | **RED** — 3 failed (the exact-cap run must still pass) |
| M3 | stop writing `apiCallCount` on the **success** path | **RED** — 1 failed |
| M4 | re-advertise `maxOutputSize` in the interface | **RED** — `tsc` `TS2578: Unused '@ts-expect-error' directive` |
| M5 | stop writing `apiCallCount` on the **error** path | **RED** — 2 failed |

**Runs:** the sandbox suite **74 tests** (66 pre-existing + 8 new) · `tsc --noEmit` on
`packages/ai-assistant` exit **0** · the package's full run: **143 suites, 2,107 passed, 27 failed**.

**★ Two things the mutations found, both in my own work:**

1. **The first M3 did not go red.** I aimed it at the first matching `apiCallCount:` line, which turned out
   to be the **catch** block, and nothing asserted the count on a failed run — so the mutation passed. That
   is not a pass, that is an untested branch: a failed run is exactly when the number matters, because it is
   the only place a caller learns the sandbox stopped the run rather than the code failing. **M5 and two new
   tests now hold that branch.**
2. **M4 needed a type-level proof, not a runtime one.** Re-adding an option to an interface is invisible to
   a test that runs, so the contract is pinned with `@ts-expect-error` — which fails the build when the
   expression stops being an error. Verified: re-adding the option produces
   `TS2578: Unused '@ts-expect-error' directive`.

**★ And one failure that is not mine, measured rather than assumed.** The package's full run reports
**27 failures in 5 suites** (`agent-runtime*`, `max-steps-budget.integration`, `ws-c-policy-and-tools`),
every one of them `AiModelFactoryError: The resolved model is pinned to provider "openai", but that
provider is not configured`. Proven the honest way: with this change **stashed**, the pristine tree fails the
**same 27 tests in the same 5 suites**. The cause is a missing provider key in this environment. Nothing here
touches it, and it is worth writing down because the next person to see a red `agent-runtime` suite will
otherwise start digging in the wrong place.

## 5. What this does not do

- **It does not make the cap configurable per call through the caller.** The caller's cap is a constant
  (`CODE_MODE_MAX_API_CALLS = 50`); the sandbox's option now matches it as a default. Wiring the caller's
  constant *into* the sandbox so the two cannot drift is the honest follow-up, and it is one line — noted
  rather than done, because `CODE_MODE_MAX_MUTATION_CALLS` is a separate axis and the drift matters only if
  one of them changes.
- **It does not bound result size.** The isolate's memory limit does, and that argument is written in R3.
- **`T-33`** (the ledger's unhashed resource fields) is untouched — separate row.
