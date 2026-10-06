# G-17 — the AI that emits the Business IR (schema-constrained generation)

**Status:** step 1 (research) and step 2 (validate) **done 2026-10-06**. Step 3 (cookbook) and step 4
(build) not started. **This document corrects a measurement error in `BACKLOG.md`'s G-17 row.**

**What G-17 is.** The AI-first vision's decisive loop is *need → the AI writes a **Business IR** →
the platform **validates** it → it runs → a person confirms → saved as a Function → runs with zero AI*.
Everything downstream of the IR is **built and proven** (G-01 kernel, G-02 IR + compiler, G-03 User
Functions, G-07 Widgets). **What is missing is the AI actually emitting the IR.** That is G-17.

**Why it is the vision's missing join — re-confirmed 2026-10-06.** `packages/ai-assistant` names
`BusinessQueryIR` / `BusinessCommandIR` / `compileQuery` / `runFunction` **nowhere** (zero hits). The
model's only current paths to data are the **code-mode** meta-tools (the model writes JavaScript run in
an `isolated-vm` sandbox against the REST API) and the per-module **CRUD tools**. So today the model
writes JavaScript, never the IR — the exact thing the vision forbids.

---

## 1. Research — what actually exists (measured, not assumed)

> **This section corrects the earlier claim.** The `BACKLOG` G-17 row says *"no `json_schema` /
> `response_format` / grammar / constrained-decoding exists in the model layer … the first artifact is a
> runtime parser mirroring `business-ir/types.ts`."* **The first half was measured against the wrong
> thing, and the second half is wrong about what to build first.** Here is the corrected picture.

### 1a. Constrained generation **does exist** — and we already use it

| What | Evidence |
|---|---|
| The AI SDK's constrained-output function is wired | `packages/ai-assistant/src/modules/ai_assistant/lib/ai-sdk.ts` re-exports **`generateObject`** from `ai` |
| It is **used today** | `api/route/route.ts:138` and `:178` both call `generateObject({ model, schema: RouteResultSchema, prompt })` |
| The schema is **zod** | `route.ts:32` — `const RouteResultSchema = z.object({ intent: z.enum([...]), toolName: z.string().optional(), confidence: z.number().min(0).max(1), reasoning: z.string() })` |
| `zod` is a dependency | `packages/ai-assistant/package.json:117` — `"zod": "^4.4.3"` |
| There is a **first-class object endpoint** | `api/ai/run-object/route.ts` — *"Run an AI agent in structured-output (object) mode"*, calling **`runAiAgentObject`** with policy enforcement, tool whitelisting and attachment policy |

**So the mechanism G-17 needs is not missing — it is already running in the codebase.** My earlier
route (grep for `response_format|json_schema`) searched the *wrong vocabulary*: it looked for the
OpenAI wire-format field names, but the platform calls models through the **AI SDK**, where the
constraint is expressed as `generateObject({ schema: <zod> })`, not as a raw `response_format` field.

### 1b. The host is built, and it takes a schema **override**

`runAiAgentObject` (`agent-runtime.ts:1866`) resolves its structured-output schema in this order
(`agent-runtime.ts:1831`):

```
override.schemaName / override.schema      <- passed in by the caller
    else
agent.output ({ schemaName, schema, mode })  <- declared on the agent
    else
throw AgentPolicyError('execution_mode_not_supported',
  'Agent "<id>" does not declare a structured-output schema; pass runAiAgentObject({ output }) or declare agent.output.')
```

**That is the exact join.** An agent can be handed **our Business IR zod schema** as its structured
output, and the platform will constrain the model to emit precisely that shape — through the existing
object endpoint, with the existing policy checks. G-17 is not "build a constrained-generation layer"; it
is **"write the IR's zod schema, and wire one agent to it."**

### 1c. What is genuinely missing

1. **No zod schema for the IR.** `business-ir/`, `kernel/`, `user-function/` contain **zero** zod
   imports. `BusinessQueryIR` and `BusinessCommandIR` are **TypeScript types only** — nothing checks the
   *shape* of an incoming IR at runtime. (The compiler checks IR against the *model*, not against the
   *type*.)
2. **No agent that emits an IR.** No agent declares an IR output schema; nothing imports `business-ir`
   from the AI side.
3. **No schema-mutation IR kind.** The built IR is `list | count | aggregate` (reads) plus
   `BusinessCommandIR` (writes to *existing* structure). There is **no "add entity / add field / create
   capability"** kind — which is what G-21's outcome 2 (a model proposal) needs.

---

## 2. Validate — the approach, and what would break it

### 2a. The approach

**Build the IR's zod schema so it mirrors `business-ir/types.ts` exactly, then give it to an agent as
its structured output through the existing object path.**

Three steps, in order:

1. **`business-ir/schema.ts`** — a zod schema that mirrors `BusinessQueryIR` (and `BusinessCommandIR`),
   including the §51 field set, the operator vocabulary, `IrMoney`, `IrParameterReference`, and the
   `IrOperation` union. It must be **derived from, or provably in step with, `types.ts`** — a mirrored
   schema that drifts is worse than none.
2. **A conformance test** that proves the schema and the type agree: every field in the type is in the
   schema, and the schema rejects what the type forbids. (This is the "prove a mirrored file stays in
   step" discipline — see the skill of that name.)
3. **One agent that emits the IR**, wiring the schema into `runAiAgentObject({ output })`, and a test
   that a natural-language prompt produces an IR that **compiles** via the existing `compileQuery`.

### 2b. What would break it — checked against the artefacts

| Risk | Measured answer |
|---|---|
| Does `generateObject` actually constrain the model, or just parse the reply? | It is the AI SDK's **structured-output** call; the SDK passes the schema to the provider (or validates server-side fallback). **Tested live 2026-10-06 (§4c): the model produced a schema-valid object for 6 of 6 requests** — though the live run went to the model server directly, not through `generateObject`, so this row is proven by the stubbed tests on the wire side and by §4c on the model side. |
| Will the local quantised Qwen2.5-7B emit a valid IR reliably? | **Measured 2026-10-06 (§4c): yes, in the sense that it *can* — 6 of 6 requests, across six different IR shapes, produced objects the schema accepts.** *Not* a reliability rate: six requests, one run each, `temperature: 0`. The row's original worry (that a 7B might need a larger model) was **not borne out** on these six, but a failure *rate* would need many runs per shape. |
| Streaming vs object mode | `runAiAgentObject` supports `mode: 'generate' \| 'stream'` (`agent-runtime.ts:1831`). Start with `generate` (smaller surface). |
| Does the mirrored zod schema drift from the TS type? | The conformance test (2a-2) is the guard; it must be a **failing test** if the two diverge, or it is just a print. |
| G-21's three paths | The IR must cover a **read** (list/count/aggregate), a **write** (`BusinessCommandIR`), and eventually a **model proposal** (schema mutation). The first two exist as types today; the third does **not** (`BACKLOG` G-17 sub-finding 3). **Scope decision: G-17 ships the read + command IR schema first; the schema-mutation kind is G-21's dependency and is scoped there.** |

### 2c. The honest limit of this document

No live model call has been made yet. **Everything above is read from the code** — the mechanism is
proven to *exist and be used* (route.ts, run-object), but it is **not yet proven to constrain our local
model into emitting a valid IR.** That proof is step 4, and it is the one claim this document does not
make.

---

## 3. What changes in the docs

| File | Change |
|---|---|
| `BACKLOG.md` G-17 row | the "no constrained generation exists" claim **corrected**; the first artifact restated as **the IR zod schema, wired to an agent through the existing `runAiAgentObject` override** |
| This document | the step 1–2 record |

**Next:** step 3 — write the cookbook steps (the exact files, commands and the "done when" test) into
`workspace/COOKBOOK.md`. **No code before step 3 is written.**

---

## 4. Step 4 — the build (done 2026-10-06)

**Outcome: the wire is built and proven with a stubbed model. The live-model question remains open.**

### 4a. What was built

| Artifact | Path | Proven by |
|---|---|---|
| The IR's zod schema | `packages/shared/src/lib/business-ir/schema.ts` | `tsc --noEmit -p packages/shared/tsconfig.json` **clean**; a compiling equality proof that **fails** on drift |
| Its conformance suite | `packages/shared/src/lib/business-ir/__tests__/schema.conformance.test.ts` | **18/18**; falsified by loosening `.strict()` → the scope test fails |
| **The wire** | `packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-author.ts` | `authorBusinessQueryIr()` passes `businessQueryIrSchema` to the existing override |
| The wire's test | `packages/ai-assistant/src/modules/ai_assistant/lib/__tests__/business-ir-author.test.ts` | **6/6**, incl. model answer → `compileQuery` → a real plan; falsified by `passthrough()` |

The full `business-ir` suite is **78/78 across 5 suites**.

### 4b. The two corrections this step made to my own earlier work

**1. The mirror's guard was a print, not a guard.** The schema's type-equality assertions were first
written as unused type aliases (`type _Check = Expect<AssertEqual<A, B>>`). The mandatory
falsification — delete a field, re-run `tsc` — came back **clean (exit 0)**, which should have been
impossible. Root cause: TypeScript resolves an **unused type alias lazily**, so the assertion was never
evaluated. The `/tmp/tsguard/` probes fixed the rule exactly: `type _Check = …` passes,
`declare const c: AssertEqual<A,B>` passes, `f<AssertEqual<A,B>>()` passes — **only
`const d: AssertEqual<A, B> = true` fails**, `TS2322: Type 'true' is not assignable to type 'never'`.
Fixed by one exported const `IR_SCHEMA_TYPE_CHECKS`. Re-measured: delete `grain` from
`businessQueryIrSchema` → `tsc` **fails** at the `queryIr` entry, exit 1.

**2. The wire was on the wrong side of the dependency.** `authorBusinessQueryIr` was first written in
`shared`, next to the schema. That made `shared` import `ai-assistant` and its type-check broke —
it began reporting `@/.mercato/generated/ai-agents.generated`, a path that exists only at build time in
the app. Proven by moving the file out: with it in `shared`, `tsc` for `shared` fails; without it,
clean. The rule was already written down in `shared/src/modules/overrides.ts` — *"`@open-mercato/shared`
must NOT take a runtime dependency on `@open-mercato/ai-assistant` (the dependency direction is the
other way around)"*. The wire now lives in `ai-assistant`.

### 4c. The live-model question — ANSWERED 2026-10-06

**The claim this document refused to make in §2c is now measured, and the answer is yes.**

The stack was up (eight containers healthy), the model server answered on `:8080`, and the app pointed
at **`Qwen2.5-7B-Instruct-Q4_K_M`** via the OpenAI-compatible endpoint. The model was asked for six
different IR shapes and **all six came back as objects the platform's own `businessQueryIrSchema`
accepts** — the schema was the judge, not a human reading JSON.

| Request | Shape exercised | Time | Verdict |
|---|---|---|---|
| *"list invoices over 10,000 EUR for each customer, newest first, at most 50"* | filter + dimension + sort + limit (the vision's §50 example) | 23 s | ✅ |
| *"how many open support tickets are there"* | `count` | 16 s | ✅ |
| *"total revenue per month this year"* | `aggregate` bucketed over time | 26 s | ✅ |
| *"customers whose name contains "acme""* | text operator (`like`) | 17 s | ✅ |
| *"the 10 newest orders"* | sort + limit | 15 s | ✅ |
| *"average invoice value by country"* | grouped `aggregate` | 12 s | ✅ |

The model also chose **sensible semantics** — `count` for "how many", `aggregate` for "total per
month", `like` + `%acme%` for "contains" — which a schema cannot check and which is worth recording
separately from the syntactic pass.

**The negative control (without it, "6 of 6" would be worthless).** Given a *loose* prompt with no field
list, the same model produced **nonsense** — invented nested `income`/`savings`/`debt` objects plus a
`tenant_id` key. The schema **rejected it**, naming the reasons: a bad `operation`, a missing required
field, and **`Unrecognized keys: "finances", "tenant_id"`**. So the model can go off-script and the
schema catches it — including the exact tenant-widening the `.strict()` design exists to refuse.

**Two limits, stated so the result is not over-read.**
1. **Not a reliability rate.** Six requests, one run each, `temperature: 0`. It shows the model *can*,
   not how often it fails.
2. **It went straight to the model server**, not through `generateObject` and the app's agent path. The
   model's *ability* and the platform's *wire* are each proven — separately. That is exactly why the
   stubbed tests were not made redundant by this run.

**Still open:** the same request driven through the live app end to end (HTTP in, IR out), which needs
an authenticated session. NEEDS-YOU Part 4 item 15.

### 4d. What remains open — the honest limit

The document's §2c limit is now **discharged for the model question**; what remains is the app-level
end-to-end run above. Nothing about the *wire* is unproven.

### 4e. A failure found on the way — now green, but the cause is UNATTRIBUTED

`agent-runtime-object.test.ts` failed **4 of 8** cases on a tree with none of my changes in it: its mock
of `llm-provider-registry` no longer matched the path `model-factory` takes, so `resolveModel` threw
`no_provider_configured`. Proven pre-existing by running the untouched file.

**It now passes 8/8 — but do not read that as a fix.** The obvious explanation (*declaring the IR agent
fixed it*) was **tested and disproved**: swapping the generated registry back to its empty form left the
suite at **8/8**. The generated registry sidecar was regenerated for the first time in the same window,
which is a plausible cause and an unproven one. **The item stays open** rather than being closed on a
plausible story — NEEDS-YOU Part 4 item 14. *A fix you cannot attribute is a coincidence.*

---

## 5. Step 5 — the agent declared (done 2026-10-06, later the same day)

**Why this step exists.** Steps 1–4 built the schema, the wire and the model proof — but the agent was
**never declared**. `grep business_ir` had no non-test hits, and `ai-agents.generated.ts` was an empty
stub. A wire with nothing registered cannot run in the app, so the app-level run in §4d *could not*
succeed. Declaring it closes a real gap in G-17; it is not added scope.

### 5a. What was built

`packages/ai-assistant/src/modules/ai_assistant/ai-agents.ts` — module-root agent contribution,
declaring `business_ir.query_author`:

| Field | Value | Why |
|---|---|---|
| `executionMode` | `'object'` | the model decodes against the IR's own shape |
| `allowedTools` | `[]` | the vision forbids the model reaching data directly (doc 03 Part XXXIV) — the IR is the only output channel |
| `output.schema` | the **shared** `businessQueryIrSchema` | not a private copy; if the two ever diverge, the test fails |
| `output.schemaName` | `BUSINESS_QUERY_IR_SCHEMA_NAME` | imported, not re-typed |
| `id` | `BUSINESS_IR_AGENT_ID` | imported from the wire, so caller and registry cannot drift |
| `readOnly` / `mutationPolicy` | `true` / `'read-only'` | it authors a query, never a write |

### 5b. Getting it picked up failed SILENTLY twice — the reusable lesson

1. **The generator never ran.** `node .../@open-mercato/cli/dist/index.js generate` exited **0** with no
   output. That file only *exports* the entry function; the real entrypoint is `packages/cli/bin/mercato`.
   **`exit 0` with no output is not success.**
2. **My first explanation was wrong, and measuring beat guessing.** I assumed a stale build hid the
   file; importing the scanner's own `resolveModuleFile` showed it resolving the source file correctly.
   So I patched a temporary trace into the *built* extension — it fired for `ai_assistant` with the path
   resolved, and the registry then carried the entry. Patch removed and restored byte-for-byte
   (`md5sum -c`).

**Proven by two routes:** the generated file's import + config entry, **and** a runtime probe through the
real `loadAgentRegistry()` returning the agent with `executionMode: 'object'`, `allowedTools: []`,
`readOnly: true`, `schemaName: 'BusinessQueryIR'`.

### 5c. Three tests the declaration FALSIFIED, all the same way

`business-ir-author.test.ts` ("No agent seeded"), `meta-pack.test.ts` and `ws-c-tool-pack-coverage.test.ts`
("registry is empty") each used **emptiness as a stand-in for "nothing is declared"**. The trap:
`resetAgentRegistryForTests()` only clears a map and sets `loaded = false`, and the next read **lazily
reloads the real registry** — so the premise died one call later, silently. **`reset` did not mean
"empty".**

Repaired by moving the claim, not deleting it:
- the wire test now seeds the id as a chat-mode agent with **no** output schema, so object mode is
  refused with `execution_mode_not_supported` — a **deliberate** refusal that survives whoever declares
  the id later; the `generateObjectMock.not.toHaveBeenCalled()` guard is kept;
- the two empty-registry tests seed an explicit `seedAgentRegistryForTests([])`.

**Each repair was seen RED** under two different mutations (rethrow the wire's catch; make the tool
handler ignore the registry). Restored by byte copy, verified by `md5`.

**Measured green:** **1385/1385 across 100 suites**; app typecheck **exit 0**.

### 5d. What remains — now a measured owner decision

The route **is** live: `POST /api/ai_assistant/ai/run-object` → **401** (the auth gate working; a first
probe used a guessed URL and produced a misleading 404 — read the route table, do not guess the path).

But the running `starting-kit-app-1` **cannot serve the new agent**, and this was measured rather than
assumed: it has **no bind mount** to the workspace (three volumes only — mcp-shared, init-marker,
attachments), so its code is a **15-hour-old baked image**, and its `ai-agents.generated.ts` contains
**0** occurrences of `ai_assistant`. **Nothing is broken — the running app is simply older than the
change.** Completing the app-level run needs a **container rebuild** (and an authenticated session).

**That is the owner's call, and it is NEEDS-YOU Part 4 item 16 — a yes/no.** The running stack was not
touched: widening its blast radius to make my own test pass is not my decision.

**Next:** the owner's answer on item 16, then G-21.
