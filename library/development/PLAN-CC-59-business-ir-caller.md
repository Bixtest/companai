# PLAN — `CC-59`: one core caller for the Business-IR compile+execute chain (the first switch on the panel)

**Row:** `platform_points.md` LIST — it is the **first startable item of the supplementary core queue**
(`PLAN-SUPPLEMENTARY-CORE-QUEUE.md` §S1), feeding the vision's decisive loop (Phase 7 row 23–26: *a prompt
becomes a typed Business IR, validated deterministically, then run*). **Register:**
[`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) `CC-59` (its row carries `decided in B-WS/B1 + B-WS/B8`).
**Owner's go-ahead** (2026-10-11, verbatim): *"execute the supplementary core queue"*; and (this session)
*"proceed with cc.59 following our work rules and researching all relevant content and any cloud researching
required to optimise, enhance and enrich the vision and work then implement."*
**Owner ruling this build obeys:** the Business IR is **CORE** (`CORE-BOUNDARY.md` §2 row C2; `NY-24`) — the
wire is the platform describing itself, only its screen is business-half. No new owner question: `CC-59` was
already adopted and scheduled.

Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

**The pipeline is five BUILT, TESTED layers — and inert along its whole length.**

| # | Layer | File | Measured state |
|---|---|---|---|
| L1 | the IR's shape | `packages/shared/src/lib/business-ir/{schema,types}.ts` | BUILT; `schema.conformance.test.ts` green |
| L2 | author the IR from a prompt (the model) | `packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-author.ts` — `authorBusinessQueryIr` | BUILT; binding-gated (`CC-57`, fails closed `agent_not_bound` **before** the model) + scope-threaded (`CC-55`); **zero production callers** (`grep -rn authorBusinessQueryIr packages apps --include=*.ts \| grep -v __tests__` → only its own definition) |
| L3 | bind `{param}` placeholders | `packages/shared/src/lib/business-ir/bind.ts` | BUILT; `bind.test.ts` 28 cases (under `user-function/__tests__`) |
| L4 | compile + validate against the business model | `packages/shared/src/lib/business-ir/compile.ts` — `compileQuery` | BUILT; `compile.test.ts` 33 cases; **only callers are inside the same library** (`run.ts:195`, `verify.ts:163`, `fingerprint.ts:186`→`recompile.ts`) |
| L5 | run a published Function end-to-end | `packages/shared/src/lib/user-function/run.ts:112` — **`runFunction`** | BUILT + **complete**: `isRunnable` → tenant → query-only → `bindParameters` → `checkFreshness` → `compileQuery` → resolve physical binding → **`engine.query(binding.platformEntityId, compiled.plan.physical)`** (`:216-241`); **zero production callers** (its only non-test mention is a *comment*, `business-widget/placement.ts:24`) |

**Test proof (measured this session):** `business-ir` **78 passed / 6 skipped**; `user-function` **133 passed**;
`business-ir-author` **11 passed** — **222 green** across the chain. So the chain works; **nothing runs it.**

**The two facts that fix the shape of the caller (both rule-13 corrected already in the plan §S1.2):**
1. **`runFunction` needs a stored `UserFunction`** — and a `UserFunction` has **no persistence** (no entity,
   table, or repo; `CC-32`, gated on `G-09`). So a caller that *"loads a saved Function by id"* **cannot exist
   yet**. The startable shape is the **authoring** one.
2. Therefore the **authoring** caller does **not** go through `runFunction`. Its shape is:
   **prompt → `authorBusinessQueryIr` (L2) → IR → `compileQuery` (L4) → `engine.query` → result** — the same
   execute hop `runFunction` already uses, on the platform's existing read path (`QueryEngine.query`).

**How the platform assembles the pieces (production pattern, measured):**
- the read engine: `createRequestContainer()` → `container.resolve('queryEngine') as QueryEngine`
  (`apps/mercato/src/modules/example/api/organizations/route.ts:35-36`).
- the canonical model: `buildModelFromModules()` / `tryBuildModelFromModules()`
  (`shared/src/lib/kernel/from-modules.ts:63,78`) — a pure read of the module registry.
- the physical bindings: `createBindingsFromDeclarations(declarations, model)`
  (`shared/src/lib/business-ir/bindings.ts:69`). **Both of these have ONLY test callers today** — no production
  code assembles model+bindings yet, so the caller must.
- the operating scope: `CompileContext { tenantId, organizationId, userId }` (`types.ts:334`) — **separate from
  the IR on purpose**; scope enters the compiled query from the authenticated request, never the IR.
- the AI tool surface: a module-root `ai-tools/*.ts` pack aggregated by `ai-tools.ts`, consumed by the
  generator; each tool is `defineAiTool({ name, description, inputSchema (zod), requiredFeatures?, handler })`
  and its handler receives `(input, ctx: McpToolContext)` with `ctx.tenantId/organizationId/userId/container/
  userFeatures/isSuperAdmin` (`lib/types.ts:8-44`). The search pack (`ai-tools/search-pack.ts`) is the
  reference: it resolves a DI service by name (`ctx.container.resolve('searchService')`) and scopes by
  `ctx.tenantId`/`ctx.organizationId`.

**So the honest state:** the Business-IR pipeline is a **complete circuit with no switch on the panel** — every
layer built and tested, no route/tool/screen reaching any of them. The risk is **rot** (a signature never
exercised by a real caller) and a **false "done"** (an unreachable item mistaken for a working feature), **not a
hole** (an unreachable path cannot be exploited).

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (register `CC-59`):** build **one core entry point** that takes a plain-language prompt and returns a
**compiled result** — `prompt → authorBusinessQueryIr → IR → compileQuery → engine.query → result` — reachable
from the running product, needing **no persistence**, and gated by the same binding the routed paths use.

**Points taken from `platform_points.md` that define it:**
- **Phase 7 rows 23–26** — *"a prompt becomes a typed business request (not SQL)"; "the AI is structurally
  constrained"; "the platform validates deterministically before anything runs"; "every request ends in one of
  three known ways"*. `CC-59` is the **deterministic validate-and-run** step made reachable.
- **Row 15 (`P10`)** — *"every read is filtered by permission at the data layer"*: the caller's read must be
  scoped by the authenticated session, at the data layer, not by hiding anything.
- **Row 22** — *"an AI user can run only the agents bound to it"*: the authoring step must consult the binding
  (`authorBusinessQueryIr` already does, `CC-57`); the caller must **not** bypass it.
- **Rule 11** — the owner decides *what*; this plan fixes *how* and invents no new semantics.

**The contract (`B5` — the `CC-59` caller):**

- **`B5a` — one core entry point, no new chain.** A single exported function (working name
  `runBusinessQueryPrompt`) that: (1) calls `authorBusinessQueryIr` with the prompt + the authenticated
  `authContext`/`auth`/`em`; (2) refuses, as a value, on `!ok`; (3) takes the IR to `compileQuery` with a
  `CompileContext` built **from the session** and the model + bindings the platform derives; (4) fails closed on
  compile diagnostics of `severity: 'error'`; (5) executes the compiled physical plan through the platform's
  existing `QueryEngine.query`, tenant/org-scoped; (6) returns a `result` union (rows + plan + provenance +
  diagnostics), **never** a raw IR. It **duplicates nothing** — it reuses L2, L4, and the same execute hop
  `runFunction` uses.
- **`B5b` — scope comes from the session, never the IR.** The `CompileContext` and the `QueryOptions` tenant/org
  are taken from the authenticated request (`ctx.tenantId`/`ctx.organizationId`, `auth`), never from the model's
  output. The IR has no scope field by construction; this is asserted, not assumed.
- **`B5c` — fail-closed, and every refusal is a value.** `agent_not_bound`, `schema_rejected`, `compile_failed`,
  `no_binding`, `engine_failed` are union arms, not throws the caller may forget — mirroring `runFunction`'s
  `RunResult` and `authorBusinessQueryIr`'s result union.
- **`B5d` — reachable from the running product, via the existing AI tool surface (this is `CC-58` Stage C's
  registration; the two are the same single core caller).** Register **one** `ai-tools` entry
  (`business_ir.run_query`) whose handler calls `runBusinessQueryPrompt` with `ctx` scope. It is `readOnly`, and
  it carries the `requiredFeatures` the read path needs. Registering it makes the **head AND the compile half**
  live in one step — the honest framing: *the whole authoring wire goes live*, not "the head only".
- **`B5e` — bounded by default (adopted from the cloud research, §4).** The caller applies the defensive
  guardrails the literature names as mandatory for NL→query: a **default row limit** and a **maximum time
  range** when the IR does not state one — so a vague prompt cannot ask for an unbounded scan.
- **`B5f` — the result carries its lineage.** The returned result includes the **resolved IR** and the compiled
  **plan/provenance**, so a person (and an auditor) can see exactly what was asked and what ran — the
  auditability recommendation from the research.
- **`B5g` — a coverage gate, so the new entry point cannot be added un-gated.** A test proves (i) the tool is
  registered and its handler reaches `runBusinessQueryPrompt`; (ii) the binding is consulted on the path; (iii)
  the entry point fails closed on each error arm. The existing `binding-coverage.test.ts` must still pass
  (`IN_PROCESS_DISPATCH_SITES` stays empty or gains this site with a gate).

**Out of scope (stated so it is not mistaken for done):** persistence of the authored IR or a saved Function
(`CC-32`/`G-09`); the person-facing **business screen** (`CC-58` Stage B — business-half UI, deferred); the
frontend **workspace** area (owner supplies references after the core is done, §S1.3).

---

## 3. The cloud research — what it confirms and what it adds

**Owner's instruction:** research "to optimise, enhance and enrich the vision." A targeted survey (semantic-layer
NL→query practice 2024–2026) was run. Sources: Cube
(`cube.dev/articles/semantic-layer-for-ai-agents-2026`), Snowflake Cortex Analyst, dbt MetricFlow, Databricks
Unity Catalog Business Semantics, OWASP **LLM01** (prompt injection) / **LLM06** (excessive agency), Spider 2.0
(`arxiv.org/abs/2411.07763`), BIRD (`arxiv.org/abs/2305.03111`), and a production text-to-SQL field guide.

**It CONFIRMS our architecture is the industry consensus:**
- The **IR-then-deterministic-compile** pattern *is* the "semantic layer / metrics layer" that Cube, dbt,
  Snowflake and Databricks all converged on — the model **selects over a governed catalogue**, and the
  **compiler is the safety boundary**, because the hard work (joins, grain, metric math) is solved once, not
  re-guessed per prompt.
- **Text-to-IR is measurably safer and more accurate than text-to-SQL.** Frontier models collapse on realistic
  estates (Spider 2.0: GPT-4o ≈10%, o1-preview ≈21%); the documented failure modes of raw SQL generation
  (hallucinated tables/columns, value hallucination, scope bypass, "a correct query and a leaking query look
  identical") are exactly what a typed IR + compiler removes.
- **Our scope discipline is the recommended one:** *"scope (tenant/org) must come from the authenticated
  session, injected at compile time by the deterministic layer — never from the model's IR."* That is what
  `CompileContext` already is; OWASP LLM01/LLM06 say to **complete mediation in downstream systems, not trust
  the LLM to decide**.
- **Fail closed with a model-readable error** is the recommended retry pattern — and our compiler already
  emits structured `IrDiagnostic`s (the exact material a repair loop consumes).

**It ADDS four cheap, in-scope improvements, folded into the contract above:**
- **`B5e`** — default row limit + max time range (defensive guardrails the literature calls mandatory).
- **`B5f`** — return the resolved IR + plan/provenance (auditability/lineage).
- **`B5g`** — an eval-style coverage gate (known-answer + fail-closed cases), the "eval harness as a
  first-class gate" recommendation.
- **A named follow-on (not built here):** a **structured-error retry loop** (ask the model to re-author using
  the compiler's diagnostics) — the highest-value *next* enhancement. It is naturally the same tool's second
  turn; recorded as a new register row rather than smuggled into `CC-59`, so `CC-59` stays "one caller".

**Nothing in the research contradicts the vision** — it validates the whole decisive loop and sharpens four
edges. The owner's instinct ("the core of the whole vision" is the prompt→IR→execute loop) is the consensus
architecture.

---

## 4. Acceptance (what "done" is measured by)

1. `runBusinessQueryPrompt` exists and is reachable from the running product (an `ai-tools` handler calls it).
2. A live **caller test** proves: prompt → IR → compiled → executed, returning **rows + plan + provenance**
   (**not** a bare IR), with the read scoped to the session's tenant/org.
3. Every error arm fails **closed** and is a value (`agent_not_bound`, `schema_rejected`, `compile_failed`,
   `no_binding`, `engine_failed`) — proven by test.
4. The binding is consulted on the path; `binding-coverage.test.ts` stays green.
5. The defensive guardrails (`B5e`) apply a default limit / max range — proven by test.
6. `tsc --noEmit` clean for the touched packages; the chain suites stay green; **no duplicate chain** was built.
7. A separate-agent hostile critic confirms each claim with a command+output; a RED-then-GREEN mutation proof
   with md5-verified restores; a two-route re-measure of the ONE NUMBER (expected **UNCHANGED** — this is a
   caller, not a new vision box; a new `CC-*` row for the retry loop adds no LIST box).
8. All development docs updated in the **same** change: `BACKLOG.md`, `platform_points.md` (if any box moves —
   it does not), `BUILD-ORDER.md`, `JOURNAL.md`, `COMPLETION-CALLBACKS.md`, this plan, and the patch notes.

---

## 5. Risks and their handling

| Risk | Handling |
|---|---|
| **A second chain is built by accident** (duplicating `runFunction`). | Reuse L2/L4 + the same `engine.query` hop; a test asserts the caller calls `compileQuery`, not a re-implementation. `compile.ts`'s own *"would duplicate that engine"* note is the precedent. |
| **Scope leaks from the prompt/IR.** | `CompileContext` + `QueryOptions` scope come only from `ctx`/`auth`; an IR carrying a scope key is already impossible (`.strict()` schema) — asserted by test. |
| **The IR compiles but the physical binding is missing.** | Fail closed on `no_binding` (mirrors `runFunction`'s `NO_PHYSICAL_BINDING`). |
| **A vague prompt asks for an unbounded scan.** | `B5e` default limit + max time range. |
| **The tool is added un-gated** (row 22's failure mode). | `B5g` coverage gate; `binding-coverage.test.ts` stays green. |
| **The retry loop is smuggled in and bloats `CC-59`.** | It is named as a **follow-on register row**, not built here. |

---

---

## 6. OUTCOME (2026-10-11) — BUILT, gated, and critic-verified

**Status: ✅ DONE.** Built as designed in §2:

| Contract | What landed |
|---|---|
| `B5a` one core entry point, no new chain | `lib/business-ir-run.ts` → `runBusinessQueryPrompt` (reuses `authorBusinessQueryIr` + `compileQuery` + the same `engine.query` hop). |
| `B5b` scope from the session, never the IR | `scopeFromSession(authContext)` → `CompileContext`; `QueryOptions` tenant/org from the session only. |
| `B5c` fail-closed, every refusal a value | `agent_not_bound` / `schema_rejected` / `compile_failed` / `no_binding` / `engine_failed` — all union arms. |
| `B5d` reachable via the AI tool surface | `ai-tools/business-ir-pack.ts` — the tool `business_ir.run_query`, registered in `ai-tools.ts`. |
| `B5e` bounded by default | `applyDefaultBounds` — `DEFAULT_ROW_LIMIT=100`, `MAX_TIME_RANGE_DAYS=365`, applied only when the IR stated none. |
| `B5f` the result carries its lineage | the success arm returns `rows` + `ir` + `plan` + `provenance` + `diagnostics` + `appliedBounds`. |
| `B5g` a coverage gate | `ai-tools/__tests__/business-ir-pack.test.ts` (9 tests) + the wire's 15 + `binding-coverage` still green. |

**Proof.** Pack gate **9** + wire **15** + binding **9** + coverage **12** green; **whole `ai_assistant` module 111 suites / 1518 tests green**; **8 RED-then-GREEN mutations**, md5-verified restores (M1 early return before the entry point; M2 hardcoded `auth.sub`; M3 the principal guard removed; M4 `isMutation:true`; M5 the pack dropped from the aggregator; M6 a real compiler import; M7 the null-principal guard reverted; M8 the whitespace guard reverted). `tsc --noEmit` clean.

**The hostile critic (separate agent, a command + output per claim) found 2 REAL defects — both fixed:**
1. **The doc overclaimed.** The pack said it registers "the one tool an agent can call"; measured, **no agent whitelists it** (`business_ir.query_author` is `executionMode:'object'` with **no tools** by design). The tool is live on the authenticated tool door (`POST /api/ai/tools/execute`) and the MCP surface — **not yet** callable by an in-chat agent. The doc now states exactly that, and the **consumer gap is scheduled as `CC-60`**.
2. **A blank/whitespace subject skipped the binding** (a fail-open — see `LESSONS.md` **L125**). Fixed in **both** places: the tool's guard now trims (`!ctx.userId.trim()`), and `lib/agent-binding.ts` now **refuses a null principal** (`bound:false`) instead of treating "unknown" as human.

**Rule-13 correction to this plan's own claim:** §5's risk table said a test asserts "no second chain" — that structural guard initially fired on a **doc comment** (see `LESSONS.md` **L126**); it now strips comments and still catches a real import (M6 re-proved against the final test).

**THE ONE NUMBER: UNCHANGED at 72 / 321 = 22%** — a caller adds no vision box. Re-derived by two routes (the local `derive-counts` parse; a blind verifier agent), both 72/321.

**Not done here (stated so it is not mistaken for done):** persistence of the authored IR or a saved Function (`CC-32`/`G-09`); the person-facing **business screen** (`CC-58` Stage B); the tool's **in-chat consumer** (`CC-60`); the frontend **workspace** (the owner supplies references after the core is done, §S1.3).

---

*Source: [`PLAN-SUPPLEMENTARY-CORE-QUEUE.md`](PLAN-SUPPLEMENTARY-CORE-QUEUE.md) §S1/§S1.1–§S1.3;
[`CORE-BOUNDARY.md`](CORE-BOUNDARY.md) §2 row C2; [`NEEDS-YOU.md`](NEEDS-YOU.md) `NY-24`; the cloud research
(§3). Written 2026-10-11. If this plan disagrees with the code, the code wins and this plan is broken.*
