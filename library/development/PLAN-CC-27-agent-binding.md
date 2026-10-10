# PLAN — `CC-27`: bind an AI user to the agents it may run (and enforce it)

**Row:** the `platform_points.md` LIST row **"an AI user can only run the agents bound to it"** (added in this
change — see §7). **Register:** [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) `CC-27`.
**Source design:** [`../../analysis/ANSWER-2026-10-08-organisational-questions.md`](../../analysis/ANSWER-2026-10-08-organisational-questions.md)
§1.3 item 3 + §1.4. **Owner rulings this build obeys** (2026-10-11, the question card): **ENFORCE** (fail-closed)
· **AI WORKERS ONLY** (human sessions unchanged).

Written 2026-10-11 as the requirement (rule 10c) **before** any code, per rule 0b.

---

## 1. What exists today (measured in code, rule 0b, 2026-10-11)

- **The agent *actor* is real and DB-backed.** An AI user is an `api_keys` row with
  `principal_kind = 'ai_worker'` (`packages/core/src/modules/api_keys/data/entities.ts:52-53`), and it carries
  roles (`roles_json`, `:55-56`). Measured: it authenticates as a principal of kind `ai_worker`
  (`shared/src/lib/auth/principal.ts` — `requirePrincipal(auth).kind === 'ai_worker'`,
  `parseSubject('ai_worker:<uuid>')`).
- **The agent *behaviour* is code-declared, in an in-memory Map.** The registry is
  `const agentsById = new Map<string, AiAgentDefinition>()`
  (`packages/ai-assistant/src/modules/ai_assistant/lib/agent-registry.ts:16`), populated **only** from the
  generated `ai-agents.generated.ts` (`loadAgentRegistry`, `:278-299`). **No EntityManager, no repository, no
  query** — grep for a DB read in that file returns **none**. So an agent **definition** can never be a row.
- **The run entry points take the agent id as a raw request-body string and never check any binding.**
  - `api/ai/run-object/route.ts:38` — `agent: agentIdSchema` from the body; `:153-165` calls
    `checkAgentPolicy({ agentId: bodyResult.data.agent, … })`; `:167-183` calls `runAiAgentObject({ agentId:
    bodyResult.data.agent, … })`. **No binding lookup.**
  - `api/ai/chat/route.ts` — same shape (agent from the body; `checkAgentPolicy` at `:468`;
    `runAiAgentText` at `:669`).
- **`checkAgentPolicy` is the single policy chokepoint both routes share** — and it is **synchronous and pure**
  (`lib/agent-policy.ts` — `export function checkAgentPolicy(input): AgentPolicyDecision`, reads only the
  in-memory registry + the caller's feature list). It cannot perform a DB read, so the binding check cannot
  live inside it as-is.
- **The principal's kind and id are available at both routes** (`auth.sub` + `requirePrincipal(auth)`), and the
  `tenantId`/`organizationId` too (`auth.tenantId`/`auth.orgId`).
- **There is NO binding table and no binding concept anywhere.** grep for `agent_binding|agentBinding` across
  `packages/**` → **no matches**.

**So the honest state:** the AI *actor* and the AI *agent* are two objects joined only by **a string the caller
supplies**. Any caller who holds `ai_assistant.view` may name **any** registered agent. There is no row saying
*"this AI user runs this agent, with these tools, under these permissions"* — which is exactly the row that
makes *"create an AI role and hand it to an AI user"* real. `CC-27` builds it and enforces it.

---

## 2. The requirement (rule 10c = the task's own definition + the platform points, combined)

**Task (register `CC-27`):** build an **agent↔AI-user binding row** (which agent an AI user may run, which
tools, which feature scope), and teach the agent resolution to consult a **binding** from the DB — **never** an
agent *definition*.

**Points taken from `platform_points.md` that define it:**
- **Row 15 (`P10`)** — *"every read is filtered by permission at the data layer"*: a **run** is an action; the
  AI door must not let an actor exercise a capability it was not granted.
- **Row 16 (`CC-50`)** — the platform's own per-entity opt-in declaration pattern (`ownerField`/`ownerFeature`)
  is the shape a binding should copy — a **declaration**, resolved once, applied at the chokepoint.
- **§D `AH-1`** — the agent is now a **kernel object** (kind `personal · role · context · independent ·
  system`), which is what the binding hangs off (this is why `CC-27` is now unblocked).

**Contract (acceptance):**

- **B1 — the binding row exists.** A new tenant/org-scoped table `ai_agent_bindings`: which
  (`agent_id`) an **AI-user principal** (`principal_id` = the `api_keys` uuid) may run, plus an optional
  **tool allowlist** (a **subset** of the agent's own `allowedTools` — it may never widen) and an optional
  **feature scope** (features the caller must additionally hold). Soft-delete + unique per
  `(tenant, org, principal_id, agent_id)`.
- **B2 — enforcement is fail-closed for AI workers.** When the caller's principal is `ai_worker`, the run is
  **refused** unless a live binding for `(principal_id, agent_id)` exists in the caller's tenant/org. Error code
  `agent_not_bound`. **A human caller is unchanged** (owner ruling: AI workers only).
- **B3 — the binding narrows, never widens.** The effective tool set = `agent.allowedTools ∩ binding.toolAllowlist`
  (a `null` allowlist means "all of the agent's tools"); the required features = `agent.requiredFeatures ∪
  binding.requiredFeatures`. A binding can never grant a tool or a feature the agent's code did not declare.
- **B4 — no regression when there is no binding / no AI-worker path.** A human run, and any run where the
  principal is not `ai_worker`, is **byte-identical** to today. Existing suites stay green.
- **B5 — the definition stays in code.** The registry is **not** taught to read agent *definitions* from the DB;
  only the **binding** is DB-resolved. (The runtime reads `agentsById`; a DB-only agent is invisible.)
- **B6 — a manage surface + coverage discipline.** An admin can create/list/revoke a binding (a CRUD route, the
  `mutation-policy` route is the template), and a test proves a new agent cannot be run by an AI worker without a
  binding — the fail-closed default (the row-17 "cannot be added un-gated" shape, applied to bindings).

---

## 3. Where it lives (L105-aware placement)

- **The entity** in `packages/ai-assistant/src/modules/ai_assistant/data/entities.ts` (the module already holds
  tenant/org-scoped AI tables) + a **migration** in `.../migrations/`.
- **The repository** `…/data/repositories/AiAgentBindingRepository.ts`, copying
  `AiAgentMutationPolicyOverrideRepository` (constructor takes `em`; `findOneWithDecryption`; transactional
  writes).
- **The enforcement** as an **async** step in each route, **before** `checkAgentPolicy`/the runtime — because
  `checkAgentPolicy` is synchronous. A small `resolveBinding(ctx, principalId, agentId)` helper in
  `lib/agent-binding.ts` returns `{ bound, toolAllowlist, requiredFeatures }`; the route turns a miss into
  `agent_not_bound`.
- **The tools/features narrowing** threaded into `runAiAgent*` as an explicit, **narrowing-only** input
  (intersect/union at the call site), so the runtime keeps its single source of truth.

---

## 4. Non-goals (explicit) — and the one thing that would have been a question

- **Not** making agent *definitions* DB-resident (would break the runtime — measured, §1).
- **Not** changing the human session path (owner ruling: AI workers only).
- **Not** building the *AI-user tick UI* (that is `CC-26`, already closed) nor team scope (`CC-51`).
- **No owner question stands open for this build** — the two branches that would have needed a ruling
  (enforce-vs-record; who-is-bound) were **answered by the owner this session** (ENFORCE · AI WORKERS ONLY).

---

## 5. Impact trace (rule 10e)

- `packages/ai-assistant/src/modules/ai_assistant/data/entities.ts` — the new entity.
- `…/migrations/Migration<ts>_ai_agent_bindings.ts` — the new table (rule 14b: provable, additive).
- `…/data/repositories/AiAgentBindingRepository.ts` — new.
- `…/lib/agent-binding.ts` — new (the resolver + the narrowing math).
- `…/api/ai/run-object/route.ts` + `…/api/ai/chat/route.ts` — the enforcement step (+ the narrowing inputs).
- `…/api/ai/agents/[agentId]/bindings/route.ts` (new) — the manage surface.
- Tests: the two existing route suites (must stay green) + a new binding suite (entity/repo/resolver/enforcement).
- No parked-module impact (the AI tools are in `packages/ai-assistant`, an enabled module).

---

## 6. Red-then-GREEN plan (rule 10f)

For each load-bearing change: a mutation that turns RED, restored **md5-verified** byte-identical:
(a) make the binding check return "bound" unconditionally → the unbound-AI-worker test RED; (b) make it refuse
humans too → the human-passthrough test RED; (c) let the binding **widen** the tool set → the narrowing test
RED; (d) drop the tenant/org predicate from the binding lookup → the cross-tenant test RED;
(e) make the resolver read an agent *definition* instead of a binding (B5) → RED.

---

## 7. OUTCOME

**BUILT 2026-10-11 — the CORE leg of row 22 ("an AI user can run only the agents bound to it") is complete and
enforced; two legs are explicitly NOT built and are scheduled (`CC-55`, `CC-56`).**

**What landed (contract `B1`–`B6`, §2).**
- **`B1` the binding table** — `AiAgentBinding` entity (`ai_agent_bindings`; columns `tenant_id`,
  `organization_id`, `principal_id` uuid, `agent_id` text, `tool_allowlist` jsonb, `required_features` jsonb,
  `notes`, `created_by_user_id`, timestamps, `deleted_at`; **four** `@Index` incl. **two partial-unique**) +
  the thin re-export `data/entities/AiAgentBinding.ts` + the additive migration
  `Migration20261010180000_ai_agent_bindings.ts` (a `create table` + its indexes; `down()` drops).
- **`B2` fail-closed for `ai_worker`** — `lib/agent-binding.ts` `resolveAgentBinding({ em, auth, agentId })`
  returns `{ bound:false, reason:'no_binding' }` on **no binding / no tenant / empty id**, and
  `{ bound:true, … }` only when a live `(tenant, org, principal, agent)` row exists.
- **`B3` narrowing-only** — `computeBoundRunScope`: tools = `agent.allowedTools ∩ binding.toolAllowlist`
  (a `null` allowlist = all of the agent's tools); features = `agent.requiredFeatures ∪ binding.requiredFeatures`.
  A binding can never add a tool or remove a feature.
- **`B4` no regression** — a **human** (or unknown) principal returns `{ bound:true, toolAllowlist:null,
  requiredFeatures:[] }` **without any DB read**; the two existing route suites stay green.
- **`B5` the definition stays in code** — only the **binding** is read from the DB; the agent is `getAgent`.
- **`B6` manage surface + coverage** — `api/ai/agents/[agentId]/bindings/route.ts` (GET list / POST upsert /
  DELETE revoke; `ai_assistant.view` read, `ai_assistant.settings.manage` write; mutation-guarded) and
  `__tests__/binding-coverage.test.ts`.

**Wiring.** Both dispatch routes (`api/ai/run-object/route.ts`, `api/ai/chat/route.ts`) call
`resolveAgentBinding` **after** `checkAgentPolicy` and **before** the runtime call, refusing with **403
`agent_not_bound`**. Owner ruling (§2.2): **ENFORCE · AI WORKERS ONLY.**

**Quality protocol.** A **separate-agent hostile critic** found **2 REAL defects, both fixed:** (1) the coverage
gate's marker list named **non-existent** functions (`runAiAgentStream`/`runAiAgentChat`/`streamAiAgent`) and
**omitted the real chat dispatcher `runAiAgentText`** — so the gate would not have caught the most likely new
un-gated site; the list is now the runtime's real exports **and a new test derives it from
`agent-runtime.ts`'s own `export function runAiAgent*` surface**, proven by a scratch route that turns the gate
RED. (2) the route tests' `requirePrincipal` **mock ignored `keyId`**, diverging from the real `derivePrincipal`;
fixed. **9 RED-then-GREEN mutations**, each restore **md5-verified** (resolver fail-open ×3, route 403 removal,
narrowing widening, coverage import/refusal, manage 403 gate + manage 400). `tsc --noEmit` exit 0. **1364 tests
pass** across `packages/ai-assistant`; only the **2 pre-existing `isolated-vm` electron-ABI suites** fail,
**proven pre-existing at HEAD** (stash + re-run). Two-route re-measure: ONE NUMBER **72 / 321 = 22%**, unchanged.

**Lesson banked: `L116`.** The mutation proof was **almost a false proof** — two manage-route mutations read
GREEN because the suite **never ran** (the path contained `[agentId]`, a jest **glob** that matched nothing;
"no tests found" ≠ "all tests passed"). The standing fix: **assert the test count**, not only the absence of
failures.

**Explicitly NOT built — and not claimed anywhere (`B3`/§4 non-goals):**
- **`CC-55` — the narrowing leg is dead code.** `computeBoundRunScope` is built and unit-tested, but **nothing
  calls it**: the routes read only `binding.bound`. A binding's `toolAllowlist`/`requiredFeatures` therefore has
  **no effect at run time** today. (Scheduled; the honest scope is stated in row 22 and `CC-27`.)
- **`CC-56` — the confirm path does not re-check the binding.** `api/ai/actions/[id]/confirm` executes a stored
  pending action without `resolveAgentBinding`; the binding was checked at *dispatch* time, so a revocation
  between dispatch and confirm is not observed.

---

## 8. What was measured vs what was quoted

**Measured this session (commands run in `workspace/starting-kit`):** the registry's in-memory Map + zero DB
reads (`agent-registry.ts:16`, `:278-299`); the two routes' raw-body agent id and their `checkAgentPolicy`/
`runAiAgent*` call sites; `checkAgentPolicy`'s synchronous pure signature; `api_keys.principal_kind`/`roles_json`
(`api_keys/data/entities.ts:52-56`); the `Principal` kind vocabulary and `ai_worker:` subject encoding
(`shared/src/lib/auth/principal.ts`); `AuthContext` fields (`shared/src/lib/auth/server.ts:18-55`, incl.
`requirePrincipal`); the `AiAgentMutationPolicyOverrideRepository` house pattern; the absence of any binding
table. **Quoted (not re-measured here):** the `AH-1` agent-as-kernel-object build (proven in `PLAN-AH-1.md`)
and `CC-26`'s AI-user tick UI.
