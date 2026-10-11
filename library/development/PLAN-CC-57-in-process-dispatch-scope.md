# PLAN — `CC-57`: thread a bound scope into the in-process dispatch helper (row 22's last named leg)

**Row:** the `platform_points.md` LIST row **22** — *"an AI user can run only the agents bound to it"* (core leg
`CC-27`, BUILT 2026-10-11; narrowing leg `CC-55`, BUILT 2026-10-11). **Register:**
[`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) `CC-57`.
**Parent design:** [`PLAN-CC-27-agent-binding.md`](PLAN-CC-27-agent-binding.md) §2 `B3`;
[`PLAN-CC-55-bound-scope-runtime.md`](PLAN-CC-55-bound-scope-runtime.md) §5 (the gap this build closes).
**Owner ruling this build obeys** (2026-10-11): *"CC-57 … Startable now."* — **approved**. No new owner question:
it completes coverage of an already-ruled contract (`B3` / `B3'`). No new semantics are invented.

Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

- **The helper dispatches with no scope.** `lib/business-ir-author.ts:105` defines `authorBusinessQueryIr(input)`;
  at `:110` it calls `runAiAgentObject({ agentId: BUSINESS_IR_AGENT_ID, input: input.prompt, authContext:
  input.authContext, … output: { schemaName, schema: BUSINESS_QUERY_IR_SCHEMA_NAME, mode: 'generate' } })` — with
  **no** `boundScope`. The `boundScope` field exists and is honoured by the runtime (`agent-runtime.ts:1806`,
  `:1913` → `resolveAiAgentTools`), but this caller never supplies it.
- **It is the ONLY non-route dispatch site.** A repo-wide scan for dispatch **calls** (`runAiAgent(Text|Object)\(`)
  outside `__tests__` returns exactly three real call sites: the two gated routes
  (`api/ai/chat/route.ts:688`, `api/ai/run-object/route.ts:186`) and `lib/business-ir-author.ts:110`
  (`lib/agent-runtime.ts` is the definition, excluded by name). The `CC-55` module-wide coverage gate
  (`__tests__/binding-coverage.test.ts:52`) names this one site in `IN_PROCESS_DISPATCH_SITES`.
- **The helper's input lacks the two things a binding lookup needs.** `AuthorBusinessQueryIrInput`
  (`:62`) carries `authContext: AiChatRequestContext` (tenant/org/user/features — **no `sub`, no `principal`**)
  and an untyped `container?: unknown`. `resolveAgentBinding` needs an `AuthContext` (`packages/shared/src/lib/
  auth/server.ts:18` — carries `sub` → `requirePrincipal` → `derivePrincipal`) and an `EntityManager`.
- **`resolveAgentBinding` is fail-closed for an `ai_worker`, passthrough for a human.** `agent-binding.ts:34`:
  a non-`ai_worker` principal returns `{ bound: true, toolAllowlist: null, requiredFeatures: [] }` **without a DB
  read**; an `ai_worker` with no tenant returns `{ bound: false, reason: 'no_binding' }` **without a DB read**;
  otherwise it reads `ai_agent_bindings`. `computeBoundRunScope` (`:80`) then yields the narrowing-only scope.
- **A real reader exists — a unit test, not a route.** `lib/__tests__/business-ir-author.test.ts` calls
  `authorBusinessQueryIr({ prompt, authContext: baseAuth })` **six** times (a real-runtime end-to-end proof of the
  model→IR wire). The register's *"no caller today"* means **no routed/barrel caller**; the unit test is a reader,
  and a signature change must update it. The agent `business_ir.query_author` **is** registered
  (`ai-agents.ts:44,96`).

**So the honest state:** the two routed dispatch paths apply the binding's narrowing (`CC-55`), but the one
in-process helper does not — a caller of `authorBusinessQueryIr` today would run `business_ir.query_author` with
the agent's **full** tool set and **no** binding-added feature requirement. It is a **latent** gap (no route
reaches it), held by the coverage gate so it cannot silently become a live hole.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (register `CC-57`):** give `authorBusinessQueryIr` the inputs to resolve the `(principal, agent)` binding,
compute `computeBoundRunScope` for its fixed `business_ir.query_author` agent, pass it into `runAiAgentObject`,
and refuse (fail-closed) when the principal is not bound; then remove its entry from `IN_PROCESS_DISPATCH_SITES`
in `binding-coverage.test.ts`.

**Points taken from `platform_points.md` that define it:**
- **Row 22** — *"an AI user can run only the agents bound to it"*: **every** dispatch path must consult the grant,
  not only the routed ones; a grant that is not consulted is not a grant.
- **Row 15 (`P10`)** — *"every read is filtered by permission at the data layer"*: the run's tool set is the
  actor's capability surface; the binding narrows it, and the narrowing must reach **every** chokepoint that
  builds that surface — including an in-process one.

**The contract (`B3''` — the same `B3'` narrowing, applied at the in-process chokepoint):**

- **`B3''a` — the helper resolves the binding before it dispatches.** It calls
  `resolveAgentBinding({ em, auth, agentId: BUSINESS_IR_AGENT_ID })` and refuses when `!binding.bound`.
- **`B3''b` — fail-closed, and the refusal is a value.** An unbound `ai_worker` yields
  `{ ok: false, reason: 'agent_not_bound' }` — a **union arm**, not a throw — and the model is **never** asked
  (the refusal precedes `runAiAgentObject`).
- **`B3''c` — the scope is threaded, narrowing-only.** The helper passes
  `computeBoundRunScope({ agentId: BUSINESS_IR_AGENT_ID, binding })` into `runAiAgentObject`; tools intersect,
  features union, exactly as the routes do.
- **`B3''d` — humans unchanged.** A human principal's binding is `{ toolAllowlist: null, requiredFeatures: [] }`,
  so the scope is the agent's full tool set — **byte-identical** to today (`B4`). The new inputs are
  **required** (a caller must state who is acting), but the human path adds no narrowing.
- **`B3''e` — no new surface.** No new route, table, migration, or public API. One lib signature + one result arm.

---

## 3. Placement

- **`lib/business-ir-author.ts`** — add `auth: AuthContext` and `em: EntityManager` to
  `AuthorBusinessQueryIrInput`; import `resolveAgentBinding`/`computeBoundRunScope` from `./agent-binding`; add
  `| { ok: false; reason: 'agent_not_bound' }` to `AuthorBusinessQueryIrResult`; before the `runAiAgentObject`
  call, resolve the binding, refuse when unbound, compute `boundScope`, and pass it. Update the module header to
  state the binding is consulted.
- **`__tests__/binding-coverage.test.ts`** — implement the **"GATED" arm** the suite's own title already
  promises: a file that CALLS a dispatch entry point and **consults** `resolveAgentBinding` is GATED, not an
  offender. Empty `IN_PROCESS_DISPATCH_SITES` (no un-gated sites remain). Replace the now-vacuous
  "still un-gated" loop with a **positive pin**: the known in-process site exists, dispatches, consults the
  binding, and passes `boundScope`.
- **`lib/__tests__/business-ir-author.test.ts`** — update the six existing calls to pass a human `auth` + `em`
  (the real-runtime proof is preserved: humans stay byte-identical).
- **`lib/__tests__/business-ir-author-binding.test.ts`** (NEW) — the **threading** proof, mirroring the
  established precedent `api/ai/run-object/__tests__/binding-enforcement.test.ts`: mock the runtime + the binding
  repository, keep the **real** resolver + `computeBoundRunScope`, and assert the runtime receives the narrowed
  scope (and is not called at all when unbound).

---

## 4. Non-goals (what this build does NOT do)

- **It does NOT change `resolveAgentBinding` / `computeBoundRunScope`** (`CC-27`/`CC-55` semantics stand).
- **It does NOT add a route or a caller.** It makes the existing helper **safe for the caller it will one day
  have**; the register's honest trigger (a real caller) still governs whether it is *used*.
- **It does NOT touch the confirm path** — the pending-action re-check remains `CC-56` (BUILT).
- **It does NOT widen anything** — the intersection + union are narrowing-only by construction.
- **It does NOT change the two routed paths** — they already thread the scope (`CC-55`).

---

## 5. Impact (what the change can touch)

- **`AuthorBusinessQueryIrInput` gains two required fields** → the **one** reader
  (`lib/__tests__/business-ir-author.test.ts`) must be updated; no production caller exists, so nothing else
  compiles against it.
- **`AuthorBusinessQueryIrResult` gains one arm** (`agent_not_bound`) → exhaustive `switch`es over the reason
  (none exist today) would need the arm; the helper's own doc lists the arms.
- **The coverage gate** stops naming `business-ir-author.ts` as an un-gated gap → `IN_PROCESS_DISPATCH_SITES`
  becomes empty. Any **new** un-gated in-process dispatch site still fails the scan.
- No schema change, no migration, no new file in the runtime path.

---

## 6. RED-then-GREEN plan (the mutation proofs this build must pass)

1. **Fail-closed removed:** mutate the helper to proceed when `!binding.bound` → the unbound-`ai_worker` test
   (`agent_not_bound`, runtime not called) must go **RED**.
2. **Scope not threaded:** mutate the helper to drop `boundScope` from the `runAiAgentObject` call → the
   narrowed-scope test must go **RED**.
3. **Binding not consulted:** mutate the helper to skip `resolveAgentBinding` → the gate test must go **RED**
   (the file becomes an offender and the allowlist is empty) **and** the binding tests must go RED.
4. **Gate GATED arm reverted:** mutate the gate to not skip binding-consulting callers → the gate test must go
   **RED** (the helper re-appears as an offender).
5. **Human narrowed:** mutate the human path to force an empty scope → the existing end-to-end IR test must go
   **RED** (proving humans are byte-identical today).

Every mutation restores the file **md5-verified**.

---

## 7. OUTCOME

**BUILT 2026-10-11 (code repo `workspace/starting-kit`). `CC-57` is ✅ DONE; row 22 is COMPLETE.**

- **`B3''a`–`B3''e` all hold.** `AuthorBusinessQueryIrInput` gained **required** `auth: AuthContext` + `em:
  EntityManager`; `AuthorBusinessQueryIrResult` gained `{ ok:false, reason:'agent_not_bound' }`; the helper
  resolves `resolveAgentBinding` **before the model is asked**, refuses fail-closed, computes
  `computeBoundRunScope` and passes it into `runAiAgentObject`; a human is a passthrough (full scope, no DB
  read). No new route/table/migration/API.
- **The gate closed.** `IN_PROCESS_DISPATCH_SITES` is now **empty** in `binding-coverage.test.ts`; the **GATED
  arm** recognises a dispatcher that consults the binding, and a **positive pin** keeps the closure from
  regressing. The **6** call sites in the helper's end-to-end suite now pass a human `auth` + stub `em`
  (humans byte-identical — the assertion the suite exists for).
- **Hardening (TOTAL quality protocol).** A **separate-agent hostile critic** confirmed **all 6 claims**
  (scan non-vacuous — 176 files walked, a temporary un-gated probe turned the gate RED then was deleted with
  `git status` verified; refusal precedes the model; real `computeBoundRunScope`; human derivation; no other
  un-gated site; **full suite 109/109 suites · 1492/1492 tests**). It raised **1 LOW** — the scan matched a
  dispatch by **name**, so an `import { runAiAgentObject as dispatch }` alias would evade it (no such alias
  exists today — proven by grep). **Fixed**: the scan is now **alias-aware** on both the dispatch and the
  resolver side, with a **new RED-then-GREEN pin**.
- **RED-then-GREEN — 5 mutations from §6 + 1 for the hardening, every restore md5-verified**
  (`business-ir-author.ts` `c06e0ecfc4090b0390e8d36ff390e66f`; `binding-coverage.test.ts`
  `cda0525c7731838b84727c3ad2da7401`): (1) fail-closed removed → 2 RED; (2) `boundScope` dropped → 3 RED;
  (3) `resolveAgentBinding` not called → gate offender + 5 binding RED; (4) GATED arm reverted → helper
  re-appears as offender RED; (5) human path force-narrowed → all 6 end-to-end IR tests RED; (6)
  alias-awareness removed → alias pin RED. **23/23 GREEN** across the three suites.
- **Typecheck.** `tsc` clean for all three CC-57 files; the only two errors in a wider check are a
  **pre-existing** `convertToModelMessages` mock spread (byte-identical at `HEAD`) and a generated-file path
  alias — both independent of this change.
- **Two-route re-measure.** ONE NUMBER **72 / 321 = 22% — unchanged** (local derivation + blind verifier
  agent; §L's 13th re-run). The change adds no vision box.
- **Honest boundary (unchanged, §4).** `authorBusinessQueryIr` still has **no routed caller** — this made the
  existing helper **safe for the caller it will one day have**; the register's honest trigger (a real caller)
  still governs whether it is *used*.

---

## 8. What was measured vs what was quoted

- **Measured (this session, `Read`/`Grep`, 2026-10-11):** `authorBusinessQueryIr` calls `runAiAgentObject`
  without `boundScope` (`:110`); it is the only non-route dispatch **call** site; `AuthorBusinessQueryIrInput`
  lacks `AuthContext`/`em`; `resolveAgentBinding` is DB-free for a human and for an `ai_worker` with no tenant;
  `business_ir.query_author` is registered; the helper has **one** reader — its unit test (six calls).
- **Quoted (from the `CC-57` register entry):** *"`lib/business-ir-author.ts:110` (`authorBusinessQueryIr`) calls
  `runAiAgentObject({ agentId: BUSINESS_IR_AGENT_ID, … })` with **no** `boundScope` … the only non-route dispatch
  site … no caller today"* — **confirmed true** by measurement, with the refinement that a **unit test** reads it.
