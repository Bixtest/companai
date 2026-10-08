# PLAN — **S-02: wire the resolver as the enforcement point** (the Hermes tool door)

**Written:** 2026-10-07 · **Task:** `platform_points.md` **S-02** (line 233), with `C4` (line 82),
**S-02 tool-call authz** (line 156) and **N-5** (line 328) in scope · **Status:** PLANNED
**Protocol:** the owner's 6-step work protocol (pick the task → pick the points → combine → fact-check
the code → plan, execute, verify → update all docs, BACKLOG and platform_points).

---

## 1. The task, and where it comes from

**`ARCHITECTURE-hermes-service-map.md` §4.4(b) S-02 (verbatim, the requirement):**

> **S-02 — wire the resolver as the enforcement point** | **Agent → Platform**
> Includes the **responsible-user intersection**: an agent acts **on behalf of** a person, and its
> authority is the **intersection** of its own and that person's, decided inside the single decider.
> **This is where a Hermes tool call is actually authorized.** A named warning from the source study:
> **fail closed, or do not ship the switch.**

**`platform_points.md` line 156 (S-02 tool-call authz) and line 233 (S-02 wire the resolver)** add:
the resolver is the *single decider*; one actor's authority = its own ∩ the person it acts for.

**`N-5` (line 328):** *"The `S-02` five missing inputs to the resolver are read but supplied by nothing."*
`resolveDecision` reads `holdsCapability`, `trustCeiling`, `delegationCeiling`, `invokerCeiling`,
`graphCeiling`; the task is that **a real request supplies them**.

**`C4` (line 82, per the Hermes coverage map):** the AI-tool surface must be authorized by the resolver,
not by a parallel check.

## 2. Fact-check — what the code actually contains (step 4)

**(a) The resolver itself is built and is a pure function.** `shared/src/lib/authority/decision.ts:216`
`resolveDecision(input: ResolveInput): Decision`. Every rule is a **ceiling**; the answer is the minimum;
**no rule raises a gate.** `A0` is the only refusal.

**(b) A real enforcement service already exists — and it already supplies all five inputs.**
`core/src/modules/auth/services/authorityEnforcementService.ts` (`AuthorityEnforcementService`):
- `decideFor(subject, feature, scope, { onBehalfOfUserId?, recordId? })` (line 259) builds a *complete*
  `ResolveInput`: `graphCeiling`, `invokerCeiling`, `heldCapability`, `delegationCeiling`, `trustCeiling`
  (actor) and `resourceCeiling`, `policyCeiling`, `grade` (context). **None of the five is missing.**
- It is **invoked-aware**: `invokerCeilingFor` (line 488) resolves the person an API key/AI worker acts
  for **as themselves** and caps the machine at their gate — this *is* the responsible-user intersection
  (`onBehalfOfUserId` → `resolveDecision({actor:{kind:'human',id:onBehalfOfUserId,…}})` → `decision.gate`).
- `modeFor(tenantId)` is three-state: `off | shadow | enforce`; **default `shadow`**.

**(c) Two live enforcement points exist, and the tool door is at neither.**
- `core/src/modules/auth/commands/interceptors.ts` — `authorityCommandGate`, `targetCommand:'*'`,
  `priority:10`. Runs the resolver on **every bus command that declares a `capability`**, and *binds*
  `A1`/`A2` (hold for approval, HTTP 202 + `pendingActId`), `A3` (hold-then-commit), `A4` (run + file for
  review). `A0` is left to RBAC. Fail-closed: a missing DI dependency → nothing gated, **but** a *declared*
  capability that the resolver refuses is a hard stop.
- `core/src/modules/auth/services/rbacService.ts:486` — `userHasAllFeatures()` wraps
  `decideAllFeatures` and then **subtracts**: `withheldFromThisPerson`, then `refusedByAuthority`
  (line 588 → `authorityEnforcement.refusalFor`). This is the request-path authority check for HTTP routes.

**(d) MEASURED — the tool door uses neither. This is the gap.**
`packages/ai-assistant/` contains **zero** references to `authorityEnforcement`, `userHasAllFeatures`,
`resolveDecision` or `Decision`:
```
$ grep -rn "authorityEnforcement|userHasAllFeatures" packages/ai-assistant/src   → (no output)
```
The chokepoint `ai_assistant/lib/tool-executor.ts:26 executeTool()` authorizes *only* through
`hasRequiredFeatures(tool.requiredFeatures, context.userFeatures, context.isSuperAdmin, rbacService)`,
and that helper (`lib/auth.ts:146`) calls **`rbacService.hasAllFeatures(required, granted)`** — the
**synchronous ACL matcher** (`rbacService.ts:111`) that is a pure string match over granted features. It
never reaches `userHasAllFeatures`, never reaches `refusedByAuthority`, never consults the resolver.
Likewise `api-backed-tool.ts` routes through `createAiApiOperationRunner`, which calls the **route
handler directly** (`ai-api-operation-runner.ts:307`) with a synthetic trusted-auth envelope — bypassing
the HTTP route's RBAC wrapper and any bus interceptor.

**(e) A prior session already recorded this as a defect, in prose.** `ai_assistant/api/mutation-guard.ts`
lines 77–79, on `tools/execute`:
> *"Its authorization is the **tool's own** feature checks inside `executeTool`, per tool; there is no
> single resource to guard…"*

**(f) The five inputs are supplied — but only by the command gate.** `N-5`'s wording ("supplied by
nothing") is now **stale for the command path** (fixed by the `interceptors.ts` / `invokerCeilingFor`
work) and **still true for the tool path**. The honest statement: *the resolver is wired to the command
bus and to HTTP RBAC; it is NOT wired to the Hermes tool door, which authorizes with a parallel,
synchronous check the resolver never sees.*

**Conclusion.** S-02 is **not** "build the resolver" (built) and **not** "supply five missing inputs"
(supplied by the enforcement service). S-02 is: **route the AI tool door through the single decider, so a
Hermes tool call is authorized by the same `Decision` that governs every other act — including the
responsible-user intersection, and failing closed.**

## 3. The relevant points from `platform_points.md` (step 2)

| Point | Line | Why it is in scope |
|---|---|---|
| `S-02` — wire the resolver as the enforcement point | 233 | **the task itself** |
| `S-02` — tool-call authz | 156 | the specific surface S-02 names |
| `C4` — the AI-tool authority surface | 82 | the parallel check S-02 replaces |
| `N-5` — five inputs read but supplied by nothing | 328 | re-measure; true for the tool path only |
| `AH-2` — the responsibility rule (accountable party is always a person) | §4.4(c) | the intersection S-02 must carry |
| `SD-4` — object × verb × actor × level | §4.4(a) | the grammar the tool door must speak |
| `AH-8` — MCP is the **only** door | §4.4(c) | if the door is bypassable, wiring it is theatre |
| `I4` — authority is carried, never amplified | `decision.ts` header | the invariant the intersection enforces |
| `Never *` — one fact, one canonical copy | §D | **one** decider; the tool door must not re-decide |

## 4. The design

**Principle: the tool door must not get a second opinion — it must get the *same* one.** The resolver's
whole premise is a single decider; adding a parallel "AI authority check" would be the defect S-02 exists
to remove. Therefore the tool door **calls `AuthorityEnforcementService` directly** (the same service the
command gate and HTTP RBAC call), and does **not** reimplement any rule.

1. **A capability must exist for a tool.** The resolver is keyed by `CapabilityDescriptor`
   (`getCapabilityDescriptor(feature)`). A tool's `requiredFeatures` map onto capability ids. If a tool's
   feature has **no descriptor**, `decideFor` returns `null` → the door behaves as today (RBAC only).
   This is the *coverage gap*, not a refusal — the same position `refusalFor` takes (line 240), and the
   same position the command gate takes for undeclared capabilities.
2. **The door calls `decideFor` after RBAC says yes**, mirroring `userHasAllFeatures`' ordering: RBAC is
   the grant, authority only **subtracts**. `A0` → refuse; `A1`/`A2`/`A3` → the act is *held* (a tool
   call is not a bus command, so "hold" must become a **result**, not a thrown interceptor — see §5);
   `A4`/`A5` → proceed.
3. **The intersection is `onBehalfOfUserId`.** For a tool call the actor is the API key / AI worker; the
   person it acts for is `principal.onBehalfOfUserId` (`principal.ts:138`). The door passes that into
   `decideFor(..., { onBehalfOfUserId })` — which is what makes the agent's authority the **intersection**
   of its own and the person's, inside the single decider.
4. **Fail closed.** Per the source study's warning: when the tenant is in `enforce` and the door **cannot
   reach** the enforcement service (DI failure, resolver throw), the tool call is **refused** — unlike the
   command gate, which skips when no dependency is registered. Rationale: the tool door is *the* place the
   source study named; a control that silently disables itself under load is the failure it warns about.
   In `off`/`shadow`, behaviour is unchanged (observe / no-op).
5. **Mode gating.** `shadow` (default) → resolve and **log**, refuse nothing. `enforce` → bind. This lets
   a tenant turn the door on against their own traffic, exactly as the command gate does.
6. **One decider, one call.** The door must **not** also keep a parallel authority check; the RBAC
   feature check stays as the *grant*, and the resolver as the *ceiling*. No third.

## 5. Open design questions to settle during implementation (step 5)

- **"Held" has no HTTP interceptor here.** A bus command throws `ActHeldForApprovalError` and the
  interceptor runner surfaces 202 + `pendingActId`. A tool call returns a `ToolExecutionResult`. The
  honest options: (i) return `{success:false, errorCode:'UNAUTHORIZED', ...}` with the gate and binding
  rule in the message — simple, but loses the pending-act; (ii) create a pending act and return its id in
  the result — reuses `PendingActService`, but the tool door is not a command bus and the pending-act
  executor assumes a command. **Decision to record, not guess:** measure whether `PendingActService` can
  hold a *tool* act (it keys on `commandId`), and pick (i) or (ii) on evidence.
- **Which capability does a tool call?** `requiredFeatures` is a *feature list*, and a tool may require
  several. The command gate refuses on the **first** capability the resolver refuses; the door should do
  the same (`refusalFor` already returns first-refusal). But `refusalFor` returns only `A0` refusals, not
  `A1`/`A2` holds — so the door needs `decideFor` per feature, not `refusalFor`, to see holds. Confirm.
- **The `A4` review path** needs `ActReviewService`; a tool act has no `actionLogId`. Decide whether A4
  files with `actionLogId: null` or whether the door treats A4 as proceed-and-log.

## 6. Verification plan (step 5, standard review)

- **RED-then-GREEN mutation proof** for each binding: (a) in `enforce`, an `A0` tool call is refused;
  (b) an `A1`/`A2` tool call is held/refused-until-approved; (c) the intersection: an agent whose
  responsible user **lacks** the capability is refused **even though the agent's own key holds it**;
  (d) `shadow` refuses nothing; (e) `off` refuses nothing; (f) fail-closed: enforcement service absent in
  `enforce` → refused.
- Each mutation must be applied, observed **failing**, reverted, re-observed **passing** (never assert
  from a green run alone).
- **Hostile-critic pass** on the finished wiring: look for (i) a path that *raises* a gate, (ii) a path
  that re-decides, (iii) a bypass of the door, (iv) an over-claim in the docs.
- **Re-measure** the S-02 / N-5 / C4 rows against the code after the change; update `platform_points.md`
  only on measurement.

## 7. What is explicitly OUT of scope

- Building the resolver (exists), the enforcement service (exists), the command gate (exists).
- `G-04` (data-axis authorization), `G-05` (classification), `G-06` (input/output guards), `AH-8`
  (MCP-governance precedence) — each named as a *dependency*, not delivered here.
- Arming `enforce` for any tenant. This task makes the door **capable** of enforcing and **fail-closed**;
  the switch remains the operator's.

---

## 8. Verification results (measured, 2026-10-08)

**What was built.** `packages/ai-assistant/src/modules/ai_assistant/lib/tool-authority.ts` —
`checkToolAuthority(toolName, requiredFeatures, context)`. Called from **both** places a tool handler
runs: `executeTool` (`tool-executor.ts`) and the pending-action confirm path
(`pending-action-executor.ts`). `McpToolContext` gained an optional `onBehalfOfUserId`, populated at every
door that resolves a machine subject.

**Tests.** `tool-authority.s02.test.ts` (14) + 5 new confirm-path tests in `pending-action-executor.test.ts`.
Full package: **102 suites / 1434 tests, 0 failures.** `core` auth services+commands: 30 suites / 275 tests,
0 failures. `shared` authority: 7 suites / 114 tests, 0 failures. Typecheck (ai-assistant, shared, core): 0.

**RED-then-GREEN mutation proof** — each mutation applied, observed failing, reverted, re-observed passing:

| # | Mutation | Result |
|---|---|---|
| 1 | remove the `checkToolAuthority` call in `tool-executor` | 7 tests RED (the 6 that stay green assert a *permit*, which removal cannot break) |
| 2 | fail **open** on unreachable resolver | 1 RED (fail-closed test) |
| 3 | derive the responsible user from `userId` | 2 RED (both intersection tests) |
| 4 | ignore `off` mode | 1 RED |
| 5 | remove the `shadow` branch | 1 RED |
| 6 | remove the `checkToolAuthority` call in `pending-action-executor` | 3 RED (A0 refusal, intersection, fail-closed) |

Every restore was md5-verified byte-identical (encoding-trap guard).

## 9. Hostile-critic passes — two, both finding real defects

The first pass found **three** defects; the second pass (on the fixes) found **three more**. All six fixed.

| # | Pass | Finding | Fix |
|---|---|---|---|
| 1 | 1 | **Bypass**: `pending-action-executor.ts` ran `tool.handler` directly — the HTTP confirm route executed a confirmed act with the RBAC check alone, the resolver never consulted. The last handler path S-02 had not covered. | Gate the confirm path before the handler; 5 tests + mutation 6 |
| 2 | 1 | **Dropped field** in `pending-action-recheck.ts` `toHandlerContext`. | (Superseded by #4) |
| 3 | 1 | **Over-claims** in `tool-authority.ts`: "the same `onBehalfOfUserId` as the HTTP RBAC path" (false — `refusalFor` has no such parameter); "in `off` and `shadow` nothing is refused" (false when `modeFor` itself fails). | Both sentences corrected |
| 4 | 2 | **Inert field**: the recheck's `toHandlerContext` context is consumed **only** by `loadBeforeRecord(s)`, which never consult the resolver — so the field was dead and its docstring claim false. | Field **removed** (dead code deleted), route insert removed |
| 5 | 2 | **Backwards direction claim**: "narrower, never wider". Omitting an invoker *removes a ceiling*, so it is **wider**, not narrower — an I4 gap. | Docstring corrected; the MCP doors were given the field (below) rather than left as they were |
| 6 | 2 | **Stale docstring**: said the MCP doors "build a context without it", which FIX 3 had just made false. | Docstring corrected |

**Parity closed (from finding 5).** `authenticateMcpRequest` now returns `onBehalfOfUserId`
(`apiKey.sessionUserId ?? apiKey.createdBy`), and `mcp-server`, `mcp-dev-server`, `in-process-client` set
it on their `McpToolContext`. `http-server` needs none — it puts a **real user id** in `userId`, so the
actor already *is* the person.

## 10. Honest limits (named, with owners)

1. **`tool-test-runner.ts:193` runs a read-tool handler ungated.** Reachable only from the `mercato
   ai_assistant tool-test` CLI and an integration spec — not a request path, superadmin in-process.
   *Owner:* S-02 follow-up if the runner ever becomes reachable from a request; trigger: the CLI command
   gains an HTTP surface.
2. **`catalog`/`customers` `ai-agents-context.ts` call `tool.handler` directly** with `userId: null` for
   page-context hydration. A `checkToolAuthority` call there would return `permit` immediately (no
   subject), so gating it changes nothing; it is recorded so the boundary is visible. *Owner:* the
   page-context hydration work if it ever gains a subject.
3. **The HTTP RBAC path (`refusalFor`) passes no invoker.** Pre-existing; S-02 did not change it and does
   not claim to. *Owner:* whoever next touches `rbacService.refusedByAuthority` — the tool door now does
   what that path does not.
4. **`enforce` is not armed for any tenant.** The door is capable and fail-closed; the switch remains the
   operator's decision, made against their own shadow evidence.
5. **Fail-closed couples every feature-bearing tool call to `authorityEnforcement` being registered.** In
   production it always is (core auth DI). In a lean bootstrap or a hand-rolled test container it is not,
   and the call is refused. This is the deliberate direction (see the docstring), not an accident.

