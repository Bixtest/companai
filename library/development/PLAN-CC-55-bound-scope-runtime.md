# PLAN — `CC-55`: apply the bound scope to the runtime (row 22's narrowing leg)

**Row:** the `platform_points.md` LIST row **22** — *"an AI user can run only the agents bound to it"* (core leg
`CC-27`, BUILT 2026-10-11). **Register:** [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) `CC-55`.
**Parent design:** [`PLAN-CC-27-agent-binding.md`](PLAN-CC-27-agent-binding.md) §2 `B3`.
**Owner rulings this build obeys** (2026-10-11, the `CC-27` question card): **ENFORCE** (fail-closed) ·
**AI WORKERS ONLY** (human sessions unchanged). This build adds **no new owner question** — it completes the
narrowing half of an already-ruled contract.

Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

- **`computeBoundRunScope` is built and unit-tested but NOTHING calls it.**
  `packages/ai-assistant/src/modules/ai_assistant/lib/agent-binding.ts:80` defines it
  (tools = `agent.allowedTools ∩ binding.toolAllowlist`; features = `agent.requiredFeatures ∪
  binding.requiredFeatures`). A repo-wide grep for `computeBoundRunScope(` returns **only** its own definition
  and the `agent-binding.test.ts` unit test — **no production caller**.
- **Both routes read only `binding.bound`.** `api/ai/run-object/route.ts:169-180` and
  `api/ai/chat/route.ts:488-499` resolve the binding, refuse `403 agent_not_bound` when `!bound`, and then
  dispatch with the **un-narrowed** `agentId` — the `toolAllowlist`/`requiredFeatures` the resolver returned are
  **discarded**.
- **The runtime resolves the agent and its toolset itself, from the full code-declared list.**
  `runAiAgentText` (`lib/agent-runtime.ts:1448`) and `runAiAgentObject` (`:1888`) both call
  `resolveAiAgentTools({ agentId, … })` (`lib/agent-tools.ts:316`). That function resolves the agent via
  `checkAgentPolicy({ agentId })` (`:323`) and then **iterates `agent.allowedTools`** (`:344`) to build the AI
  SDK `tools` map. It has **no** narrowing input.
- **The feature gate is agent-declared only.** `checkAgentPolicy` (`lib/agent-policy.ts:176-185`) checks
  `agent.requiredFeatures` via `hasRequiredFeatures(agentFeatures, authContext.userFeatures,
  authContext.isSuperAdmin)` (`lib/auth.ts:145`). Nothing adds a **binding's** `requiredFeatures` to that set.
- **The actor's features + super-admin flag ARE available to the runtime.** `AiChatRequestContext`
  (`lib/attachment-bridge-types.ts:18`) carries `features: string[]` and `isSuperAdmin: boolean`, and both
  routes populate it from `rbacService.loadAcl(...)`.

**So the honest state:** the **enforcement** half of row 22 works (an unbound AI worker is refused), but the
**narrowing** half does not — a binding that names a tool subset, or adds a required feature, has **no effect at
run time**. The runtime runs the agent's **full** tool set regardless of the binding. This is the gap `CC-55`
closes.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (register `CC-55`):** thread the **resolved bound scope** into the agent runtime so a binding's
`toolAllowlist` actually **intersects** the tools the run may use, and its `requiredFeatures` actually **add** a
requirement the acting principal must hold — **narrowing-only** (a binding may never widen).

**Points taken from `platform_points.md` that define it:**
- **Row 22** — *"an AI user can run only the agents bound to it"*: the binding is the grant; a grant that names
  tools and features must be **honoured**, not merely recorded.
- **Row 15 (`P10`)** — *"every read is filtered by permission at the data layer"*: the run's tools are the
  actor's capability surface; the binding narrows it, and the narrowing must reach the chokepoint.
- **Row 16 (`CC-50`)** — the platform's **opt-in declaration resolved once at a chokepoint** pattern: the
  binding is such a declaration; the runtime's `resolveAiAgentTools` is the chokepoint that must apply it.

**The contract (`B3'` — the narrowing half of `CC-27`'s `B3`):**

- **`B3'a` — tools INTERSECT.** The set of tools built for a run is
  `agent.allowedTools ∩ binding.toolAllowlist` when the binding names a subset; the agent's full list when the
  binding's `toolAllowlist` is `null`. **A binding may NEVER add a tool the agent did not declare** — the
  intersection makes this structurally impossible, and the implementation re-intersects against
  `agent.allowedTools` as a defensive second check.
- **`B3'b` — features UNION.** The effective required-feature set is
  `agent.requiredFeatures ∪ binding.requiredFeatures`. A binding may only **add** a requirement; if the acting
  principal lacks any of the union, the run is **denied** (`agent_features_denied`, 403) — fail-closed.
- **`B3'c` — humans unchanged.** A human (non-`ai_worker`) principal's resolver returns
  `{ toolAllowlist: null, requiredFeatures: [] }`, so the scope is the agent's full tool set + its own features —
  **byte-identical** to today (`B4`).
- **`B3'd` — no new surface.** The narrowing is applied **inside** `resolveAiAgentTools`; no new route, table, or
  public API. The `boundScope` input is **optional**, so every existing caller (tests included) is unaffected.

---

## 3. Placement

- **`lib/agent-tools.ts`** — add an optional `boundScope?: { allowedTools: string[]; requiredFeatures: string[] }`
  to `ResolveAiAgentToolsInput`. In `resolveAiAgentTools`: (a) compute
  `effectiveAllowedTools = boundScope ? agent.allowedTools.filter(t => boundScope.allowedTools.includes(t)) :
  agent.allowedTools`; (b) iterate `effectiveAllowedTools` (not `agent.allowedTools`); (c) after the policy
  check, enforce `boundScope.requiredFeatures` via `hasRequiredFeatures(...)` and throw
  `AgentPolicyError('agent_features_denied', …)` on a miss; (d) return `{ ...agent, allowedTools:
  effectiveAllowedTools }` so **every** downstream consumer (system prompt, loop active-tools, mutation
  interceptor) sees the narrowed set.
- **`lib/agent-runtime.ts`** — add the same optional `boundScope` to `RunAiAgentTextInput` and
  `RunAiAgentObjectInput`, and forward it into both `resolveAiAgentTools` calls (`:1448`, `:1888`).
- **`api/ai/run-object/route.ts` + `api/ai/chat/route.ts`** — after the `binding.bound` check, compute
  `const boundScope = computeBoundRunScope({ agentId, binding })` and pass `boundScope` into the runtime call.

---

## 4. Non-goals (what this build does NOT do)

- **It does NOT change the enforcement gate** (`CC-27`'s `bound` check stays exactly as it is).
- **It does NOT touch the confirm path** — the pending-action re-check remains `CC-56`.
- **It does NOT add a new owner question** — the semantics are already ruled (`B3` from `CC-27`).
- **It does NOT widen anything** — the intersection + union are narrowing-only by construction.

---

## 5. Impact (what the change can touch)

- `resolveAiAgentTools` is called by `runAiAgentText` (`:1448`), `runAiAgentObject` (`:1888`), and tests
  (`lib/__tests__/agent-tools.test.ts`, `lib/__tests__/prepare-mutation.test.ts`). The new field is **optional**,
  so all existing callers are unaffected.
- The returned `agent` object gains a narrowed `allowedTools` **only when** a `boundScope` is supplied — i.e.
  only on a binding-driven run. With no binding (or a human), the returned agent is unchanged.
- No schema change, no migration.

---

## 6. RED-then-GREEN plan (the mutation proofs this build must pass)

1. **Resolver-level:** mutate `resolveAiAgentTools` to ignore `boundScope.allowedTools` (use
   `agent.allowedTools`) → a route test asserting an excluded tool is **absent** from the built tool set must go
   RED.
2. **Feature-level:** mutate the feature enforcement to `return` instead of throwing → a test asserting a
   binding-added feature **denies** when the actor lacks it must go RED.
3. **Widening negative:** a binding naming a tool the agent did NOT declare must NOT add it (the intersection
   guarantees this) — mutate the intersection to a union → the test must go RED.
4. **Human no-op:** mutate the route to pass a `boundScope` for a human → the human test must stay GREEN (proving
   the human path is the full tool set), and a mutation that narrows a human must go RED.

Every mutation restores the file **md5-verified**.

---

## 7. OUTCOME

**✅ BUILT 2026-10-11 (code `3c4db640` + this change; `CC-55`).** The bound scope is now applied to the runtime.

**What landed.** `ResolveAiAgentToolsInput` + `RunAiAgentTextInput`/`RunAiAgentObjectInput` gained an optional
`boundScope?: { allowedTools: string[]; requiredFeatures: string[] }`. `resolveAiAgentTools`
(`lib/agent-tools.ts`) now (a) builds the tool set from `agent.allowedTools ∩ boundScope.allowedTools` (the
agent's list is the base — **never widening**; re-intersected defensively), (b) enforces
`agent.requiredFeatures ∪ boundScope.requiredFeatures` via `hasRequiredFeatures` and throws
`AgentPolicyError('agent_features_denied')` on a miss, and (c) returns the **original** agent object when
nothing is narrowed (humans byte-identical, `B4`). Both routes compute
`computeBoundRunScope({ agentId, binding })` after the `bound` check and pass it into the runtime call.

**Proof.** A separate-agent hostile critic found **2 real defects, both fixed** — (1) the coverage gate was
**blind to in-process dispatch sites** (it scanned only `api/ai/**`); it now scans the **whole module** for
dispatch *calls* (comments stripped) and names the one known un-gated site `lib/business-ir-author.ts` as a
**`CC-57`** gap, with an allowlist test that fails on a new occurrence **and** on a stale entry; (2) the
**"features UNIONED" test did not test the union** (it stayed GREEN when the enforcement was deleted, satisfied
instead by `checkAgentPolicy`) — rewritten to assert the union (agent feature A + binding feature B, actor
holding only A ⇒ denied). **6 RED-then-GREEN mutations** (tool intersection ignored, feature throw removed,
intersection→union, route drops the scope, route forces an empty scope for humans, a new un-gated scratch
dispatch site), every restore **md5-verified**; `tsc --noEmit` clean; **1374 tests pass** (the 2 `isolated-vm`
electron-ABI suites are flaky/environmental — they *passed* in the critic's run).

**Honestly NOT built — named, scheduled, not claimed.** The pending-action **confirm** path still does not
re-check the binding → **`CC-56`**. The in-process dispatch site (`lib/business-ir-author.ts`, **no caller
today**) still dispatches without a scope → **`CC-57`**. And note `LOW`: on `run-object`, object mode discards
the tool map (`void tools`), so the tool **intersection** is inert on that route — only the **feature union**
has a live effect there; the tool intersection is proven at the runtime level (`bound-scope-runtime.test.ts`).

**ONE NUMBER, two routes: 72 / 321 = 22% — unchanged** (§L's tenth re-run).

---

## 8. What was measured vs what was quoted

- **Measured (this session, `grep`/`Read`):** `computeBoundRunScope` has no production caller; the routes
  discard the resolver's `toolAllowlist`/`requiredFeatures`; `resolveAiAgentTools` iterates `agent.allowedTools`;
  `checkAgentPolicy` checks only `agent.requiredFeatures`; `AiChatRequestContext` carries `features` +
  `isSuperAdmin`.
- **Quoted (from `CC-27`'s close-out):** *"`computeBoundRunScope` is built + unit-tested but NOT wired into the
  runtime (the routes read only `binding.bound`)"* — **confirmed true** by measurement.
