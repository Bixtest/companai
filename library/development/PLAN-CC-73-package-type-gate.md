# PLAN — `CC-73`: the `@open-mercato/ai-assistant` type gate (92 test-only errors)

**What this row is.** The `ai-assistant` package's type gate was *decorative* until 2026-10-12 (it
extended the ROOT `tsconfig.json`, whose `exclude` swallowed the package's own `src/**`, so `tsc -p .`
returned **TS18003** — "no inputs"). Turning the gate on exposed **92 type errors**, all in
`__tests__`, all pre-existing. This row is the repair: make the gate say **0**.

**Status.** Requirement written **2026-10-14** (rule 10c — before any code). Fix in progress.
**This row moves no box** — it is debt, not a platform point (ONE NUMBER unchanged).

---

## 1. The measured state (rule 0b — measured 2026-10-14, before any edit)

Command (the gate, reproducible only with `--incremental false` — stale `*.tsbuildinfo` makes `tsc`
report three different truths for the same config, `CC-73`'s own finding):

```
node ../.toolchain/node24/node.exe node_modules/typescript/bin/tsc \
  -p packages/ai-assistant/tsconfig.json --noEmit --incremental false
```

**Measured: exit 1, 92 errors, 27 files, every one under `__tests__`. Production `src/` = 0 errors.**

By file (largest first):

| File | Errors |
|---|---|
| `lib/__tests__/agent-runtime-loop-phase0.test.ts` | 17 |
| `ai-tools/__tests__/meta-pack.test.ts` | 12 |
| `lib/__tests__/api-backed-tool.test.ts` | 10 |
| `subscribers/__tests__/conversation-shared-notify.test.ts` | 9 |
| `lib/__tests__/business-ir-run.test.ts` | 8 |
| `lib/__tests__/client-factory.test.ts` | 5 |
| `lib/__tests__/ai-api-operation-runner.test.ts` | 5 |
| `lib/__tests__/model-factory.test.ts` | 3 |
| `lib/__tests__/ai-agent-definition.test.ts` | 2 |
| `lib/__tests__/phase-0-additive-contract.test.ts` | 2 |
| `data/repositories/__tests__/AiTokenUsageRepository.test.ts` | 2 |
| `__tests__/token-usage-recorder.test.ts` | 2 |
| … 15 more files, 1 each | 15 |

By code: `TS2345` 19 · `TS18048` 17 · `TS2493` 12 · `TS2339` 11 · `TS2556` 10 · `TS2322` 8 ·
`TS2353` 4 · `TS2554` 3 · `TS2739` 2 · `TS2352` 2 · `TS2783`/`TS2741`/`TS2740`/`TS2344` 1 each.

**Why jest never showed it.** `jest` here does not type-check (**L138**): `agent-runtime-loop-phase0`
carries 17 errors and runs green. The build is esbuild (no type-check). So the type gate is the **only**
instrument that sees these — which is why `P2-9b` (a deletion) must not run on top of a broken one.

---

## 2. The requirement (the acceptance, fixed before code)

**Acceptance.** `tsc -p packages/ai-assistant/tsconfig.json --noEmit --incremental false` **exits 0**.

**Hard constraints — all binding:**

1. **The tests stay inside the gate.** Option (2) from `CC-73`'s register row — *exclude
   `**/__tests__/**`, as `packages/shared` does* — is **rejected and stays rejected**. It would hide
   the exact class of defect `P2-2`'s hostile critic found (a camelCase read where the wire is
   snake_case compiles fine and returns `undefined`). `ai-assistant`'s gate is deliberately **stricter**
   than `shared`'s, and this row preserves that.
2. **Every fix lands at the TEST layer.** No production type is loosened, widened, or made optional to
   satisfy a test. If a test cannot express its intent against the production type, the *test* changes.
3. **No silencing.** No `@ts-ignore`, no `@ts-expect-error`, no blanket `as any` that hides a whole
   class of error. A cast is allowed **only** where the test is deliberately constructing a value the
   production type forbids (e.g. a partial input to a validator) — and then it is a **narrow cast on the
   specific value**, with the reason visible at the call site.
4. **Behaviour unchanged.** The package's test suite stays green, and no assertion's meaning changes.

---

## 3. The order decision — why `CC-73` precedes `P2-9b` (owner-delegated, measured)

The owner delegated the order: *"do them in the best order for the platform and development pipeline."*
**Measured reasoning for `CC-73` first:**

1. **`P2-9b` is a deletion** (remove OpenCode, retire `hermes-local`) — the one shape of change where a
   clean type gate matters most, and the type-checker is the **only** tool here that polices it.
2. **The 92 errors sit in the suites `P2-9b` must edit and rely on** — `agent-runtime*`,
   `ws-c-*`, `api/ai/chat/__tests__/route.test.ts`, `max-steps-budget.integration` — so fixing them
   first gives the deletion a clean base and avoids editing the same files twice.
3. **`CC-73` is ready now; `P2-9b` is not.** `CC-73` is test-only, mechanical, and has no prerequisite.
   `P2-9b` carries an unsolved hazard (the worker's default toolset ≈16,757 tokens > the 2400 s stale
   ceiling). Do the ready thing while the risky thing is still blocked (rule 15: solve the
   straightforward thing now).

---

## 4. The fix taxonomy (measured — the classes, and the rule for each)

| Class | Example | The fix |
|---|---|---|
| **A. Test helper returns a union** | `meta-pack.test.ts`'s `findTool()` → `.find()` over a heterogeneous tool array → calling `.handler()` demands the **intersection** of every tool's input | Widen the **test helper's** return type (a loose `handler` signature). The production tools keep their own strict inputs. |
| **B. jest mock typed too narrowly** | `jest.fn()` with no impl → `.mock.calls[0]` is the empty tuple `[]` → `TS2493` | Type the mock explicitly (`jest.fn<Ret, [Args]>()`), or read the call through a typed local. |
| **C. Spread of a non-tuple** | `fn(...someArray)` → `TS2556` | Type the array as a tuple / the function as a rest param, or pass the array itself. |
| **D. A genuinely-optional production return** | `mergeStepOverrides` returns `PrepareStepResult<ToolSet>`, which **includes `undefined`** (the function really can return an undefined `wrapperOverride`) | The production type is **correct**; the test asserts non-null (`!`) or uses `?.` — it passes a defined `wrapperOverride`, so the assertion is sound. |
| **E. Deliberately-invalid input to a validator** | `tool.handler({}, ctx)` where the handler's type requires fields | A **narrow cast on the input value** at the call site; the test's intent (exercise runtime validation) is stated. |
| **F. A dropped SDK field** | ai-sdk 6.0.177 dropped `tools` from `PrepareStepResult`; the test passes a type-asserted `tools` map on purpose | Cast the **whole** asserted object to `PrepareStepResult<ToolSet>`, matching the production docblock's own statement. |
| **G. Fixture missing new required fields** | `AiChatRequestContext` gained `features`/`isSuperAdmin` | Add the fields to the fixture. |
| **H. A stale mock shape** | `FakeProvider` missing `LlmProvider`'s members | Complete the fake, or cast it to the interface it stands in for. |

---

## 5. The gates

- `tsc … --noEmit --incremental false` → **exit 0**.
- Full `ai-assistant` package green (jest), from a clean environment.
- **RED-then-GREEN** per class: revert one representative fix → the error returns; restore (md5-verified
  byte-identical) → 0.
- **Hostile critic (separate agent):** hunt for any fix that weakened a production type, changed a
  test's behaviour, or silenced a class of error instead of fixing it.

## 6. Discharge record — **DISCHARGED 2026-10-14**

**The row is closed: the gate says 0.** `tsc -p packages/ai-assistant/tsconfig.json --noEmit
--incremental false` → **exit 0, 0 errors** (was exit 1 with 92). **27 test files changed, production
`src/` byte-untouched** (`git diff --name-only | grep -v __tests__` → empty). No `@ts-ignore`, no
`@ts-expect-error`, no `as any`.

**The gates, measured.**

| Gate | Result |
|---|---|
| `tsc … --incremental false` | **exit 0, 0 errors** (was 92) |
| full package suite (pinned Node 24) | **129 suites / 1890 tests GREEN** (identical to the `CC-80` baseline) |
| production files changed | **0** (every changed path is under `__tests__`) |
| `tsconfig.json` | **unchanged** — option (2), excluding `**/__tests__/**`, stays rejected |

**RED-then-GREEN (4 representative reverts, md5-restored).** Reverting one fix per class returned
exactly the expected errors — **17 total** — and restoring the file byte-identically returned 0:

| Reverted | Errors restored |
|---|---|
| `meta-pack.test.ts` — the `findTool` widening (class A) | 12 |
| `ai-agent-definition.test.ts` — the explicit `<unknown, {pong}>` (class D) | 2 |
| `agent-runtime-loop-phase0.test.ts` — the `StopCondition<ToolSet>` cast (class F) | 2 |
| `agent-runtime.test.ts` — the `Parameters<…>` spread cast (class C) | 1 |

All four files restored to their pre-mutation md5 (`1f281008…`, `eb966c01…`, `4b104b5d…`, `d6a8831a…`).

**A hostile critic (separate agent) found 1 MEDIUM + 3 LOW/NIT — all acted on.** This is the part the
author's own gate could not see, because a green gate is exactly what a *wrong* fix produces.

- **MEDIUM — two BC tests now overclaim.** The critic compiled the ORIGINAL inference form and produced
  the `TS2322`: the claim *"assignable to `AiToolDefinition`/`McpToolDefinition`"* was **false**, not
  stale (`handler`/`isDestructive` are function-typed **properties** → contravariant parameters → a
  narrow input is not assignable to `unknown`). My first fix (author with `<unknown, …>`) compiles — but
  makes the assertion near-tautological, because `defineAiTool` is an identity function. **Fixed: both
  test TITLES and comments now state what they actually prove, and the narrow-input friction is
  registered as `CC-81` rather than deleted.** (Lesson **L166**.)
- **LOW — a blanket helper cast erased three tools' input types.** `meta-pack.test.ts`'s `findTool`
  widens the union to a loose shape, so a wrong-typed input is no longer a compile error. **Kept — the
  tests assert runtime validation on arbitrary input — but the trade-off is now written at the cast.**
  (Lesson **L167**.)
- **LOW — an overclaiming comment.** `business-ir-run.test.ts`'s fake engine gained `page`/`pageSize`;
  the comment claimed it prevented an observed defect. The critic measured that **no caller reads them**
  and the gate passes either way. **Fixed: the comment now says fidelity, not fix.** (Lesson **L167**.)
- **NIT — a comment named the wrong type.** `ai-api-operation-runner.test.ts` said TS narrows `resolved`
  to `null`; the *error text* says `never`. **Fixed** — the comment now names both (the variable is
  narrowed to `null`; `resolved?.tenantId` then reads a property off `never`).
- **NIT — the critic's own scratch files** (`scratch_variance.ts`, `gate_full.diff`,
  `gate_output.txt`) were removed from the working tree before the commit.

**What this row did NOT do (named bounds).** Nothing was excluded from the gate; no production type was
touched; `CC-73` moves **no box** (it is debt — ONE NUMBER unchanged). The `CC-81` friction it exposed
is **scheduled, not fixed** — fixing it means changing the variance semantics of a public interface,
which is a design decision (rule 11).

**Next: `P2-9b`** — the switchover, now standing on a gate that can actually say "0".
