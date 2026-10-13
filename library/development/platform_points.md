# platform_points.md — the ONE list: every task, in plain English, in build order

**You asked for this file to be the single scoreboard.** It replaces the old technical `§A`–`§K` view
(kept at the bottom as an **appendix** — nothing was deleted). There is now **one number** and **one
list**, sorted so you can reorder it.

**Read it like this:** each row says **what you, the user, can do after the task is done** — not
`G-22`, not `SD-1`. Those IDs are still there, in the last column, so a developer can act; you can ignore
that column. **`✅` = done and verified in the code. `☐` = not done. `🟡` = real work landed, not whole.**

> **One tick, one meaning (fixed 2026-10-10).** Until this change the list used **two** check glyphs for
> "done" — `✅` on most rows and `☑` on rows 7–9, added later one at a time. **They always meant the same
> thing; there was never a difference.** The list's status column is now **uniformly `✅`** (the appendix
> below keeps its own three-valued key — `✅ DONE` / `🟡 PARTIAL` / `⬜ OPEN` — for the dev sub-points).

**The order is the vision's own order** (`library/ai/ai-first/06_...§222-232`, Phase 0 → Phase 10). The
platform skeleton is built **before** business capabilities — because the vision says so (§233:
*"Do not start by building dozens of ERP screens … while the security model remains informal"*).

---

## THE ONE NUMBER

> ### **24% done** — 78 of 321 units · weighted ≈24% · **±4**
>
> **But read this next line carefully — it is the honest headline.** The work that is *done* is
> skewed **high** in the stack: the AI-first loop (the hard, interesting part) is largely built, while the
> **platform skeleton underneath it is only starting**. So the "%" is real, but the *order* is the real
> story: **we are ~20% done, and the next work must go DOWN the stack (the skeleton), not sideways into
> business modules.**

**Why there are still 321 units in the appendix but one number here:** the number is derived from the
ticked boxes, never typed. If the number and the boxes disagree, the number is the defect.

---

## ▶ FRONTIER — the one thing being built now, and the two behind it

**Same fact as [`BACKLOG.md`](BACKLOG.md)'s ▶ FRONTIER box — this line is authoritative; that box points here.**

| | ID | What it is | State |
|---|---|---|---|
| **NOW** | **Row 28** (Phase 8) — *"the agent runtime sits behind one typed door — no other code talks to it directly"* | **Broken into six sub-rows so it is built one small piece at a time (`PLAN-ROW28-agent-runtime-port.md`).** **R28-1 ✅ DONE 2026-10-11** — the port's shape (`lib/ai-runtime-port.ts`: the eight §4.1 operations, the §4.2 envelope, secret *references*; proof 9 tests, 6 mutations, hostile critic 3 defects fixed). **R28-2 ✅ DONE 2026-10-11** — the first engine behind the door (`lib/opencode-port-adapter.ts` implements all eight, delegates to the **unchanged** OpenCode engine; honest capability map; proof 22 tests, 15 mutations, hostile critic 6 defects fixed). **R28-3 ✅ DONE 2026-10-11** — **the exit gate: the chat route now walks through the door** (`api/chat/route.ts` imports the port, calls `startRun`→`streamRun`; no engine import on the run path; proof 15 tests incl. a self-tested static guard, 9 mutations, hostile critic 4 defects fixed; the pre-existing behaviour tests pass **unmodified**). **R28-4 ✅ DONE 2026-10-11** — **the run is now closed at the door**: the route observes the client's disconnect (`req.signal` — the UI's Stop button / a closed tab) and calls `port.cancelRun`, then `port.completeRun` once with the honest status (cancel-before-complete, so a stopped run records `cancelled`, not `completed`); **`cancelRun`/`completeRun` get their FIRST production caller** (measured before: none). Proof 8 tests (mock boundary = the port, call order asserted), 6 mutations, hostile critic found **no** real defect and its one extra probe was kept as a permanent test. ****`CC-67` ✅ DONE 2026-10-11** — the **last three direct callers** were moved onto the door: a **second adapter** (`lib/agent-runtime-port-adapter.ts`, `implements AiRuntimePort`, holds the live `container`/auth/input on its **construction** — no envelope field invented) that fronts the platform's **own in-process AI-SDK runtime** (a **different engine** from OpenCode); the chat route's text path, `api/ai/run-object/route.ts` and `lib/business-ir-author.ts` now **import no engine module** (statically pinned); `streamRun` **never drains** the single-use `Response` body (`responseForRun`). The hostile critic's one real defect — **the run was never CLOSED** — is fixed (close in the `finally` before `writer.close()`; `failed` on engine error; a bodyless `Response` still closes). Proof 8 tests, 8 mutations md5-restored, 117 suites / 1596 tests green. **`R28-5` ✅ DONE 2026-10-12** — **the exit gate: the door is PROVEN the only way in.** `door-only-way-in.test.ts` walks every production `.ts`/**`.tsx`** file under `src/`, comment-strips it, extracts every module edge to an engine, and asserts the **only** engine-reaching files are the two engines, the two adapters, the barrel and the **two named exceptions** (`CC-69` chat `answerQuestion`; **`CC-71`** the health endpoint — a **new finding**). 11 assertions, **12 mutations all RED** (8 test-side + 4 production-side, md5-restored), full suite **118 suites / 1607 tests green**, type-clean (0 new errors vs a control). A **separate-agent hostile critic found 3 real defects — all fixed**: (`a`) `walk` filtered `.ts` only → **36 `.tsx` files were invisible** (the most serious); (`b`) only single-line `import … from` was detected (multi-line / side-effect / `require` / dynamic `import` missed); (`c`) the header claimed the engine set was *"derived, not typed"* when it was a hard-coded array — now **really derived** (a derivation test). The `.tsx` fix is now **self-guarding** (a new self-check test; without it, reverting `.tsx` kept the suite green). **`B-05` ✅ ticked.** **The `CC-69`/`CC-71` question was RULED 2026-10-12** — the owner delegated it ("do what you find best for the platform long-term") and the ruling is **option (b): both accepted as deliberate, permanent, named exceptions** (neither is a *run*; both are auth-checked and pinned by the shipped test; **not a hole**). The port contract is **NOT widened now**: the engine behind the door is a placeholder that **`R28-6` deletes** and Hermes replaces, so shaping the door around it would be *stacking on a foundation being replaced*. **Revisit trigger: when Hermes lands.** **NEXT = `R28-6`** (delete OpenCode = `N-8`'s second half) — **MEASURED 2026-10-12 and found TRIGGER-BLOCKED**: Hermes does not exist (empty `git ls-files | grep -i hermes`), so deleting OpenCode would remove the **only** engine that answers a chat; registered as **`CC-72`**, trigger = Hermes wired behind the door (architecture §9 Phase 2+). **Row 28's port shape is COMPLETE**; the deletion waits on Hermes. The three `Port` boxes stay `☐` on their **own** blockers (`steerRun`/`resolveToolCall` unsupported; `secretRefs` unpopulated + `CC-70`). **▶ THE HERMES TRACK STARTED 2026-10-12 — arch §9 `Phase 0` ("pin & map") is DONE** (the owner's explicit go-ahead, given once row 28 was verified complete): the pin exists (**`library/development/HERMES-PIN.md`** — the recorded source revision `3569e8461ea721623fa16e6f01fb636157989fe6` + the whole-snapshot digest `ca760e97ff1ef1f0e2ed3deb0dfc2923`, and the harness **`library/.hermes_pin.py --check` → PIN HOLDS**; **RE-PINNED 2026-10-12 to the root `hermes-agent-main/`** = 18,248 files, the newest copy, byte-identical to the root zip — the first edition pinned `library/ai/hermes-agent-main/`, `eb044063…`, now **3,290 commits behind**), the licence position is stated including optional components (**MIT** runtime; all **19** bundled `LICENSE` files are MIT or Apache-2.0; AGPL/GPL appears **only** as references to separately-invoked tools — closes **`V-09`**'s gate), and the exact symbols are mapped (`tui_gateway/server.py` · `gateway/platforms/api_server.py` · `acp_adapter/`). **⚠ A finding that corrects the prior session (rule 13):** Hermes is **NOT absent** — the code repo has none (`git ls-files | grep -i hermes` → empty), but the **docs repo holds the source** as **three gitignored extracts** (the **PINNED** root `hermes-agent-main/`, 18,248 files = the zip; `hermes-agent-main-older/`, 17,367 files; and `library/ai/hermes-agent-main/`, 17,201 files — the *previous* pin). `CC-72`'s *trigger* is unaffected (the engine behind the door is still only OpenCode), but its *"Hermes does not exist"* wording was under-scoped and is corrected. | ✅ **`R28-5` DONE — the door is proven the only way in; `B-05` ticked.** **Hermes `Phase 0` DONE 2026-10-12 — the two `Phase 0` boxes in §D ticked.** **▶ THE HERMES TRACK IS NOW AT §9 `Phase 2` — sub-rows `P2-1`·`P2-2`·`P2-3` ✅ DONE 2026-10-12** (plan `library/development/PLAN-HERMES-PHASE2-one-tenant-one-tool.md`): the stdio JSON-RPC **gateway client** (`packages/ai-assistant/src/modules/ai_assistant/lib/hermes-gateway-client.ts`) — **21/21** tests on the measured wire (every event an `event`-envelope unwrapped, `server.py::_event_frame:701`), RED-then-GREEN 8-of-21 with an md5-verified restore; code commit `f5f85064`. **`P2-2` moves NO box** (as its plan predicted); **`P2-1` ✅ DONE 2026-10-12** — the pinned worker boots as a real process and answers the measured handshake (gate **PASSED in 39.5s**; the RED run against the older pin was refused), **so the frontier is now `P2-3`** (the port adapter; `session.steer` settled by measurement). **`P2-3` ✅ DONE 2026-10-12 — the port adapter, discharged (§2.9): `lib/hermes-port-adapter.ts` holds all eight door operations on the measured wire with the HONEST map — seven ✓, `resolveToolCall` ✗ (`P2-4`), `steerRun` ✓ (the settled §2.4 verdict, three named limits); 37/37 tests, the full package 120 suites / 1665 green, `tsc` 0-in-the-new-files vs the 92 pre-existing (`CC-73`), **11 mutations all RED** md5-restored (`706ad202…`). A separate-agent critic found **3 defects, all fixed**: `resumeConversation` kept the caller's stored id while the worker resolves turns by the runtime id the resume reply carries (a `4001` bug the echo-fake hid — **L144**); the unsubscribe proof was vacuous (**L145**); the `onExit` subscription leaked per streamed run (the `P2-2` client's `onExit` now returns an unsubscribe). **The critic's "no deadline policy" aside was falsified by measurement (rule 13, L146):** the envelope carries `deadline` and the adapter now honours it — the OpenCode adapter still ignores it, registered as **`CC-76`**. `P2-3` moves NO box. Frontier now `P2-4`** — the one narrow tool through `resolveToolCall`. **✅ RULED 2026-10-12 (`CC-74`): the upstream `hermes-local` HTTP gateway (floating `:latest` on 8642) stays until `P2-5` proves the pinned stdio worker behind the port, then is retired in one change — recorded in the compose service comment, COOKBOOK and the register.** **⚠ `CC-73` NEW & OPEN:** `ai-assistant` had **no type gate** (`tsc -p .` = TS18003 — its tsconfig extended the root config, whose `exclude` swallowed its own `src/**`; the only one of 21 configs not extending `tsconfig.base.json`); fixed in the same change, and turning `tsc` on for the first time exposed **92 pre-existing errors in 27 other `__tests__` files** (**L138**). **`P2-4` ✅ DONE 2026-10-13 — the tool door OPENS (§2.10, requirement written BEFORE the code):** `lib/ai-tool-call-gate.ts` (the pure two-gate decision — `checkToolCallAdmitted`/`describeToolCallRefusal`) + the Hermes adapter's `resolveToolCall` made real (the call→run correlation from `tool.start {tool_id}`; **gate 1** = the presented grant is this run's own, **gate 2** = the tool is in the run's recorded menu; deny-by-default, identity → authority) + the **runner agent** declared as a module built-in with a FIXED one-tool menu (`ai-agents.ts`) + the tool name exported as a constant (`business-ir-pack.ts`) so the agent's menu and the registry cannot drift. Execution reaches the platform's own `executeTool` under a fresh container with the admission-time context (`S-02`). **The honest map flips to `resolveToolCall ✓` — the first engine on the port whose eight operations are all real.** 94 tests across the four Hermes/gate suites; the full package **122 suites / 1701 tests green**; `tsc` **92 = exactly the pre-existing `CC-73` count, 0 in the new/changed files**; **10 mutations all RED**, restored md5-identical. A separate-agent hostile critic found **2 defects, both fixed the same change**: the admission stored the execution **context by reference**, so a caller-side mutation *after* admission could **widen authority** (`isSuperAdmin:true` reached `executeTool` — a §8 violation; now a field-by-field snapshot with a regression test, **L147**); and the **default** executor seam (the real `executeTool` under a fresh container) was unproven — closed with a no-executor test. **My own catch:** the result-channel sink was opened *before* `streamRun`'s guards (a dead sink on a run that never streamed — **L147**). **Named bounds registered the same change: `CC-77`** (the grant is still a label — gate 2 proves the call is *this run's*, not that the caller was permitted) **· `CC-78`** (the task-shaped starting menu for user-facing agents) **· `CC-79`** (the live worker bridge — the worker's closed toolset cannot be offered a platform tool on the wire). `P2-4` moves NO box. **`P2-5` ✅ DONE 2026-10-13 — the engine is now SELECTABLE at the door (§2.11 discharge record):** `lib/resolve-ai-runtime-port.ts` (NEW) is the ONE config-selected construction site (env `AI_RUNTIME_ENGINE`, default `opencode`; **deny-by-default** — an unknown name throws, a set-but-blank value is refused); the `hermes` branch builds a **real** `HermesGatewayClient` + adapter (production had never constructed one); the chosen engine is recorded on the run (`provenance.implementation` — **the envelope is NOT widened**); `mintChatRunId`'s engine argument is now **required**. **OpenCode is untouched and still answers — the default did NOT move.** 124 tests across 6 suites; the full package **123 suites / 1723 green**; `tsc` **92 = the pre-existing `CC-73` count, 0 in the new/changed files**; **13 mutations all RED** md5-restored (a first harness that "proved" it in 1 second was a **false positive** — a Windows spawn fault meant jest never ran; **L149**; and the new suite was repaired to mock the live health probe — **L150**). **§2.11 OWNS the default-flip step** — the default flips to Hermes when `P2-6`'s proof is green, and **that same change deletes OpenCode** (`R28-6`/`N-8`), with `CC-76` fixed first. **NEXT = `P2-6`** — the exit-gate proof (**requirement §2.12 written 2026-10-13**; cancellation · retry idempotency · usage capture · bounded memory/CPU · no cross-scope access), which is also the **`CC-74`** trigger that retires the old `hermes-local` service. **`P2-6` ✅ DONE 2026-10-13 — PHASE 2's EXIT GATE IS GREEN** (§2.12 discharge record): the five properties measured on one tenant and then on **two adversarial** ones; the two missing bounds built and **SHARED** (`lib/ai-runtime-bounds.ts` — `resolveRunDeadline` + `pruneRunRegistry`), **`CC-76` FIXED** (OpenCode now honours the time bound); full package **125 suites / 1752 green**; `tsc` **92 = the pre-existing `CC-73`, 0 new**; **10 mutations all RED** md5-restored; critic **2 defects + 2 nits, all fixed** (D1 the bound must **END** the stream, not just flag it — **L151**; D2 the **third** `AiRuntimePort` implementation was unbounded — **L152**). **The default did NOT move.** **▶ NEXT = the step `P2-5`/`P2-6` jointly own: flip the default to Hermes and delete OpenCode in ONE change (`R28-6`/`N-8`, `CC-76` now fixed), which also discharges `CC-74` (retire `hermes-local`).** **ONE NUMBER 78 / 321 = 24%** (§L **29th** run, two routes agree — `P2-6` moves no box). |
| **ALSO NOW** | Row 16 (team-leg), `G-22` | **own / team row scope** — the own-leg is BUILT (`CC-50` CLOSED 2026-10-11); only the **team-leg** (`CC-51`, deliberately deferred) remains. The generic state-machine engine (BUILD-ORDER §3) — first caller = the `customers` deal pipeline | 🟡 **row 16** own-leg BUILT 2026-10-11 (opt-in `ownerField`/`ownerFeature` on `OrmEntityConfig` + role-level `.own` feature modifier; first caller = `api_keys`); **team-leg = `CC-51`** (trigger named). *(Premise corrected 2026-10-12, rule 13: the "no team concept exists" wording was FALSIFIED — `StaffTeam`/`StaffTeamMember` with a `user_id` link exist in `packages/core/src/modules/staff/`, but that module is **parked** in `modules.ts`, which is the real blocker.)* `G-22` Slice 2A (the engine) BUILT 2026-10-09; Slice 2B paused as business work (rule 0b). |
| **DESIGN TRACK** | **`B-WS/B9`** — the widget architecture (end to end) | **A SECOND LIVE TRACK: the workspace-architecture workstream (`B-WS`)** — the design of the dashboard & workspace widget architecture. **It is DESIGN, never code** (BR-4): its outputs are `CC-*` items in THIS list, not builds. **Its design feeds LIST row 35 (Phase 9 — *"you can place Functions and Widgets on a Workspace and share it"*)**, which stays `☐` because no build exists yet. **Bound to this spine 2026-10-11 by a written contract — [`library/workspace-architecture/04-BRIDGE.md`](../workspace-architecture/04-BRIDGE.md)** (rules BR-1…BR-4 + [`WORKING-RULES.md`](WORKING-RULES.md) **Rule 16**): one live task (this box), one numbering (**`B-WS/Bn`**, never a bare `Bn`), every touched register row carries a `decided in B-WS/<batch>` note, and **a design is never a build**. Batch order `B-WS/B1…B-WS/B10`, then the two owner-approved follow-on workstreams **WS-1 B-perms** (the two-gate permissions engine) and **WS-2 B-studio** ("The Studio"). | 🟡 **`B-WS/B1–B-WS/B8` of 10 done; next `B-WS/B9`** (the widget architecture, end to end — the SRS `02-SRS-06-widget-architecture.md`, *to be written*; the sequence runs `02-SRS-01`…`02-SRS-05` today), then `B-WS/B10` finalises `03-MAPPING.md`. **Design track — moves no appendix box, so the ONE NUMBER is unchanged by it.** |
| **DONE** | **Row 22** (`CC-27` core + `CC-55` narrowing + `CC-56` confirm-path + `CC-57` in-process) | **an AI user can run only the agents bound to it** | ✅ **BUILT 2026-10-11 — COMPLETE** (`CC-27` core, `CC-55` narrowing, `CC-56` confirm-path re-check, `CC-57` in-process) — an `ai_agent_bindings` table + repo + a fail-closed `resolveAgentBinding` for `ai_worker` principals, wired into **both** agent dispatch routes (`run-object`, `chat`) as **403 `agent_not_bound`** after the policy gate, a manage surface, and a coverage gate that fails a new un-gated dispatch site. **`CC-55` completes the narrowing half:** the resolved scope is threaded into the runtime — tools INTERSECT (`agent.allowedTools ∩ binding.toolAllowlist`, never widening), features UNION (both required, deny otherwise) — with humans byte-identical. **`CC-56` completes the execution side:** the pending-action **confirm** route (which runs the agent's tool) now re-checks the binding (fail-closed for an `ai_worker`, passthrough for a human) before executing. **`CC-57` closes the last leg:** the **in-process** helper (`lib/business-ir-author.ts`) now resolves the binding (fail-closed `agent_not_bound`, **before the model is asked**) and threads `computeBoundRunScope` too — the coverage gate's `IN_PROCESS_DISPATCH_SITES` is now **empty** (held by a positive pin) and its dispatch detection is **alias-aware**. Hostile-critic-hardened (**2** real defects fixed in `CC-27`; **2** in `CC-55`; **3** in `CC-56`; **1** LOW in `CC-57`), RED-then-GREEN ×9 (`CC-27`) + ×6 (`CC-55`) + ×5 (`CC-56`) + ×6 (`CC-57`). **No remaining named leg.** No fresh appendix box ⇒ ONE NUMBER unchanged. |
| **CLOSED** | `P4` · `SD-4` · `SD-5` · `S11` · `S12` · `SD-1` · `CC-23` · `CC-25` · `P3` · `P3a` · `P3b` · `CC-43` · **`CC-46` · `CC-47` · `CC-50` · `CC-52` · `CC-53` · `CC-27` · `CC-55` · `CC-56` · `CC-44` · `CC-57`** | Row 22 — the AI-user ↔ agent binding (core + narrowing + confirm + in-process — COMPLETE) / Row 18 — the AI read path gated like a human / Row 17 — table coverage reaches every table / Row 16 — own-row scope (own-leg) / Row 15 — every read permission-filtered / Row 14 — data classification / Row 13 — see & change the structural rules / Row 8 — the structure-change permission gate / Row 7 — roles & grants enforced on every write (**now DEFAULT-DENY at the build, `CC-44`**) / Row 9 — the rules stored and read back | ✅ **DONE 2026-10-09/10/11** — row 22: `CC-27` (AI-user ↔ agent binding, core leg) + `CC-55` (the narrowing leg applied to the runtime) + `CC-56` (the pending-action confirm-path binding re-check) + `CC-57` (the in-process helper consults the binding + threads its scope) closed 2026-10-11 (no remaining leg — row 22 COMPLETE); row 18: `CC-53` (the AI read path applies the classification column-mask + the presenter/aggregate leak fixes) closed 2026-10-11; row 17: `CC-52` (every-table coverage gate, all **233** tables) closed 2026-10-11; row 16: `CC-50` (own-row scope own-leg) closed 2026-10-11; row 15: `CC-46` (ACL coverage, all 53 searchable entities) + `CC-47` (human-CRUD-list structural gate) closed 2026-10-10; row 14: the marking half + encrypt-at-rest / decrypt-on-read are built and measured, and every **export** leg (`CC-45` server, `CC-48` client `view`, `CC-49` customer-tasks) is ✅; row 13: `SD-4` slices A/B/C + `CC-37` + `SD-5`; row 7: `CC-44` (the write-path feature gate made **default-deny at the build** — a new write route naming no permission and no `byDesign` exemption fails the build) closed 2026-10-11; rows 7–9 & 13–18, 22 ticked ✅ |

*Row 13 is **✅**: its build is complete (S11 6/6, S12 2/2, SD-5 built), and its two remaining legs are
**provably blocked**, not unbuilt — `CC-34` (`read`/`reference` enforcement: a guard only fires on writes and
no read-path enforcement point exists — measured: the sole reader of the structural level is the write guard)
and `CC-38` (the approval intake: the guard **defers** by design, carrying no `commandId`, so nothing files the
`pending_acts` row). The named edges `CC-33`/`CC-35`/`CC-36` are harmless-today and scheduled (building `CC-36`
now would be plumbing with no reader — the same anti-pattern as row 1). **PHASE 3 is complete (rows 7–9,
13–15); the queue is now in PHASE 5 (row 16 🟡 IN PROGRESS, then rows 17–18) — PHASE 4 (row 14) is
✅.** *(Corrected 2026-10-11, rule 13: this footnote still read "the queue moves to PHASE 4 (row 14)" — a
leftover from the row-13 session, now false and contradicting this file's own PHASE headers below.)* *

---

## ⏳ OPEN WORK — every open item, tied to its LIST row (the ONE place to see what is left)

**Why this section exists (owner, 2026-10-11, verbatim):** *"you need to talk to me based on
`platform_points.md` rows … Add whatever rows or statuses that are missing there to cover it all in one place
… then you tell me what is next first based on what row you will be working on there."*

So: **every open item in the register is listed here, under the LIST row it belongs to.** The register
([`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md)) stays the truth; this is its **row view**. A row whose
Status above is `✅` can still carry an open remainder — the `✅` says the *capability* is built, the remainder
says what is still not whole. **30 open items**, derived from the register (never typed).

**How to read the Trigger column:** it is the **observable event** that makes the item startable. *"When `G-04`
lands"* is a trigger; *"later"* is not. An item whose trigger is **"startable now"** needs nothing but a go-ahead.

| LIST row | Item | What it is, in plain words | Trigger — when it can be built |
|---|---|---|---|
| **1** | `CC-12` | The universal **`Resource` envelope** — the stable id / owner / version / "who changed it" trail every object should share. (The registry half is done; the envelope is not.) | When its **first real consumer** exists (a contract with no consumer is *"contract after the code"*). |
| **1** | `CC-6` | The **row-level** rule of the data axis — per-record `view` / `manage`. | When **`G-04`** (the data-axis layer) lands. |
| **1** | `CC-20` | A custom **field's** permission is granted, but **nothing reads it** (declared, granted, inert). | When **`G-04`** lands. |
| **7** | `CC-10` | The **HTTP** authorization path passes **no invoker** (the tool door does) — two paths, two answers. | When `rbacService.refusedByAuthority` is next touched. |
| **7** | `CC-11` | `enforce` is **not armed for any tenant** — the door is capable and fail-closed; arming is the **operator's** per-tenant decision. | **The operator's decision** — **needs you**. |
| **8** | `CC-33` | The structural guard sees **row writes, not raw DDL** — a `DROP TABLE` / re-type / FK change is invisible to it. | When a **migration-time / DDL-time check path** exists. |
| **8** | `CC-35` | A structural **re-type labelled `'create'`** would escape the guard (a name-keyed convention). | When any writer can label a re-type `'create'`. |
| **8** | `CC-36` | Several **foreign guard-input builders omit `actorKind`** (`messages`, `configs`, `communication_channels`, `staff`, …). | When a guard **reads** `actorKind` on those paths. |
| **8** | `CC-39` | The `CC-25` actor check reads **live ACL state inside a guard's `validate`** — an extra DB round-trip. | When the guard input carries (or can cheaply resolve) the actor's ACL. |
| **9** | `CC-7` | The permission **catalogue is in-process** for recorded surfaces — a recorded field or saved Function lives for the process, not in a durable row. | The next **`G-04`/`G-09` migration** (one migration, not two). |
| **12** | `CC-15` | **No live route** proves the `escalation` (`202` + a `pending_acts` row) end-to-end. | When a live route asserts the 202 end-to-end. |
| **12** | `CC-38` | The **escalate outcome has no approval-layer wiring** — nobody files the pending act. | When the approval layer gains a guard-origin intake. |
| **12** | `CC-14` | The escalation branch in the **three PARKED modules** (`staff`, `payment_gateways`, `sales`) is commented out, so it never compiles or runs. | When those modules are **un-parked** (a business decision). |
| **13** | `CC-34` | The `read` / `reference` **verbs** are grammar postures, **not** enforceable — a guard only fires on writes. | When a **read-path enforcement point** exists. |
| **16** | `CC-51` | Row 16 **Option B — "own + TEAM"** row scope. The own-leg (`CC-50`) is built; "team" adds the team dimension. *(Premise corrected 2026-10-12: the `team` concept EXISTS — `StaffTeam`/`StaffTeamMember` in `packages/core/src/modules/staff/` — but that module is **parked**, and no team branch exists in the row-scope resolver yet.)* | **Your go-ahead** — you deferred it 2026-10-11 (*"document B as a future addition"*). |
| **18** | `CC-54` | The **index-time presenter** can still promote **any** string field into the stored search `title` — `CC-53` fixed the tool side, this closes the **source**. | When an **index rebuild** is next performed. |
| **19** | `CC-63` | **The command contract is now uniform in *shape* — but `risk` / `approval` / `idempotency` are declared by 0 of ~93 production commands.** `CC-61` built the three facets (`C6b` ☐→☑; ONE NUMBER 72→73), and the bus records whatever a handler declares. Setting them on handlers is **per-handler judgement, deliberately not a bulk edit** (a wrong one writes a false risk into the audit record). | **When a command is next touched, or when the audit record's `commandContract` gains a consumer (an export, a screen, a report).** |
| **20** | `CC-42` | `G-22` **Slice 2B** — the state-machine engine's **first caller** is the `customers` deal pipeline. **Business work** (excluded from the core queue). | When business work resumes. |
| **21 / 21b** | `CC-64` · `CC-65` | **The audit phase is BUILT** (re-measured 2026-10-11 — read API + viewer page + export + a **hash-chained ledger** + retention for the access log). Two cracks remain: **`CC-64`** — an undo's trace **bypasses the ledger** (journal-only, unchained); **`CC-65`** — `action_logs` has **no retention path** (unbounded growth). | `CC-64`: when the ledger or undo path is next touched. `CC-65`: **the owner's retention policy** (a compliance choice). |
| **23** | `CC-58` | The Business-IR authoring wire's **person-facing screen** (Stage B) — the head + the compile half are now live (`CC-59`); the screen is not. | When **business work resumes** (the screen is business-half UI). |
| **23** | `CC-60` | The `business_ir.run_query` tool is registered, but **no agent whitelists it** — so a chat assistant cannot call it yet. | When the AI tool surface is next touched, or a general assistant agent is added. |
| **26** | `CC-13` | `G-21`'s **schema-mutation IR kind**, its **UI**, and its **database row** are not built (the taxonomy and the Save gate are). | When the schema-mutation IR kind exists. |
| **27** | `CC-8` | `tool-test-runner.ts` runs a read-tool handler **ungated** (reachable only from the superadmin CLI). | When the `tool-test` CLI gains an HTTP surface. |
| **27** | `CC-9` | `catalog`/`customers` `ai-agents-context.ts` call a tool handler **directly** with `userId: null`. | When page-context hydration gains a subject. |
| **28** | `CC-67` | **Row 28's door: R28-1, R28-2, R28-3 and R28-4 DONE (the port's shape + the first engine + the chat route moved onto it + the run closed at the door), two sub-rows left.** **R28-1 ✅** — `lib/ai-runtime-port.ts` (eight operations, envelope, secret refs). **R28-2 ✅** — `lib/opencode-port-adapter.ts` (all eight implemented, delegating to the unchanged OpenCode engine; honest capability map). **R28-3 ✅** — `api/chat/route.ts` now reaches the engine **through the port** (`startRun`→`streamRun`); no engine import on the run path (statically proven); the pre-existing behaviour tests pass unmodified; 15 new tests, 9 mutations, hostile critic found 4 defects — all fixed. **R28-4 ✅** — the run is **closed** at the door: a client disconnect (`req.signal`) cancels it, and every run is completed once with the honest status (cancel-before-complete → a stopped run records `cancelled`); **`cancelRun`/`completeRun` get their first production caller**; 8 new tests, 6 mutations, hostile critic found no real defect. **Still open:** **`R28-5` → ✅ DONE 2026-10-12** (*the exit gate: the door is proven the only way in* — `door-only-way-in.test.ts`, whole-package `.ts`+`.tsx` scan, 11 assertions, **12 mutations all RED**, hostile critic 3 defects all fixed; **`B-05` ✅ ticked**); **R28-6** = deleting OpenCode (separate, `N-8`'s second half) — **MEASURED 2026-10-12, TRIGGER-BLOCKED: the engine behind the door is still only OpenCode, so it would remove the only engine (registered as `CC-72`; the earlier "Hermes does not exist" wording was under-scoped — the Hermes *source* is in the docs repo, three gitignored extracts, but no Hermes *engine* is wired)**. **Separately `CC-69`**: the chat route's `answerQuestion` bypass (a registered, non-run reach — **RULED 2026-10-12: accepted as a deliberate, permanent, named exception, option (b)**); **`CC-71`**: the health endpoint (a registered, non-run reach — a NEW finding in `R28-5`, **RULED likewise**); **`CC-70`**: the run's capability grant is carried but not yet consumed. | **`R28-5` DONE → `B-05` ticked.** **Hermes `Phase 0` DONE 2026-10-12 → the two `Phase 0` boxes ticked (78 / 321 = 24%).** **Row 28's port shape is COMPLETE.** **`R28-6` (delete OpenCode) is trigger-blocked on Hermes** (architecture §9 Phase 2+; **`CC-72`**). **The `CC-69`/`CC-71` shape question was RULED 2026-10-12 — option (b): both accepted as deliberate, permanent, named exceptions; the port is NOT widened now (the engine behind the door is a placeholder `R28-6` deletes); revisit when Hermes lands.** |
| **27** | `CC-66` | **Row 27's four open parts (restated plainly 2026-10-11).** The **similarity signal** is BUILT (`request-outcome/repeat.ts`). Still open: **(1)** `S3`'s **"reduced" marker** — blocked on `G-04` (cannot name *what* was withheld until per-record read rules exist); **(2)** the **history read** — **startable NOW** (prompts already in `ai_chat_messages`, just not read); **(3)** the **offer** / Save button — blocked on the frontend (`canOfferSaveAsFunction` has no caller); **(4)** `S8`'s *"never acts without asking"* — follows from (2)+(3). **Row 27 stays 🟡 until at least (1) exists.** | **(1)** when `G-04` lands. **(2)** none — startable now. **(3)** the frontend. **(4)** after (2)+(3). |
| **31** | `CC-32` | A saved **Function has no persistence** — so it has no delete path to guard, and cannot be loaded by id. | When **`G-09`** gives a saved Function a durable row. |
| **35** | `CC-62` | **The workspace build set** — every requirement the `B-WS` design mapped as *"BUILD IT"*: the menu **join** (`UserFunction.placement` → `InjectionMenuItem`), the thread **lifecycle**, collaboration **anchoring/presence/feed**, the **AI-as-participant**, and the **tenant-authored / AI-proposed extension routes**. **None was a register row** until 2026-10-11 (found by the owner's audit). Full detail: [`../workspace-architecture/03-MAPPING.md`](../workspace-architecture/03-MAPPING.md). | **Mixed** — the join/lifecycle/presence ride `G-09`/`CC-32`; the **AI-as-participant** needs the owner's **`DP-09`**; the extension routes need **WS-1 (B-perms)** + **`B-WS/B9`**. |
| **46** | `CC-19` | `packages/shared`'s `dynamicLoader.tsconfig.test.ts` fails under the full suite (`EBUSY`) but passes alone — **environmental, not a code defect**. | **The first CI run** (a host that does not hold the `node.exe` image). |
| **46** | `CC-41` | `update.sh` rebuilt onto the same tag, so the outgoing image could not be restored. **Fixed** 2026-10-09; what remains is to **watch it run**. | The **next `update.sh` run** (the following deploy). |

**Rows that are `☐` with no `CC-` item yet** (so they are not in the table above): **row 30** (each job
declares its model — `S6`) is unstarted Phase-8 work; rows **36–44** are business verticals; **row 45**
(entitlements) is a later-phase item. *(**Row 28** — the agent runtime behind one typed door — **was** in
this list until 2026-10-11; it now carries **`CC-67`** in the table above, added with the row-28 plan,
which breaks the row into sub-rows R28-1…R28-6 so it is built one small piece at a time. **Row 35** — the
workspace — **was** in this list until 2026-10-11 too; it now carries **`CC-62`**, which the owner's audit
added because the `B-WS` design's build items had no register row.)*

---

## THE LIST — sorted in build order (vision Phase 0 → Phase 10)

**How to reorder:** move a row up or down; the phases must stay in order (a lower phase cannot be
started while a higher one is open). If you move something, write one line beside it saying why.

> **Row numbers are stable handles — and they are now UNIQUE (repaired 2026-10-11).** Two defects were fixed
> this session, both found by auditing every row against the register: **(1) row `22` was used twice** — by the
> Phase-5 **AI-binding** row (`BUILD-ORDER` item 20, referenced as *"row 22"* in ~50 places, so it **keeps**
> `22`) and by a Phase-6 **audit** row, now **`21b`**; and **(2) row `29`** (Phase 8) restated row 22's own item
> (`CC-27`) while still reading `☐` — a **false open**, now ✅ with a cross-reference. **The physical order of
> the rows follows the PHASES, not the numbers** — so row **22** (a Phase-5 row) sits above rows **21 / 21b**
> (Phase 6). That is correct, not a mis-sort. **Every open item is mapped to its row in the ⏳ OPEN WORK
> section above.**

### PHASE 0 — Immutable platform primitives *(the foundation under everything)*

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 1 | Every record everywhere has a stable ID, an owner, a version and a "who changed it" trail — so nothing is anonymous and nothing is lost. | 🟡 | C1–C11 / `P0-spec` |
| 2 | The platform can always answer "what is this, who owns it, what depends on it" from one registry — the AI never has to guess. | ✅ | `G-01` / Metadata Registry |

### PHASE 1 — Identity *(who is acting)*

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 3 | You can create users, log in, reset a password, and have a session that knows who you are. | ✅ | `P1` |
| 4 | An **agent** is a real object in the system — owned by someone, acting as someone, with a role — so an AI is a first-class citizen, not a side file. | ✅ | `AH-1` |

### PHASE 2 — Multi-tenancy *(who is allowed to see what, by boundary)*

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 5 | You can run several organisations (tenants) with hard walls between them — no data leaks across, by construction. | ✅ | `P2` |
| 6 | You can organise a tenant into units/departments and scope data to them. | ✅ | `P2` |

### PHASE 3 — The policy kernel *(the vision's "first major kernel milestone")* — **COMPLETE: rows 7–9 and 13–15 all done ✅ (row 15 ticked 2026-10-10 by `CC-47`). The queue now moves to PHASE 5 (rows 16–18).**

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 7 | You can define roles and give them permissions, and the platform **enforces** every one on every write — not just in the UI. | ✅ | `P3` |
| 8 | When you create a new table or column, the platform **forces the permission question** — it can no longer be forgotten. | ✅ | `SD-1` / `S2` / `P3a` / `P3b` |
| 9 | The permission rules are **stored** (not just in memory) and read back by the running app. | ✅ | `P3b` / `M3e` |
| 10 | Every write passes one gate, and the gate can say "allow", "refuse", or "ask a human first". | ✅ | `P18` / `D0`–`D3` |
| 11 | You can change the platform's behaviour by **setting**, not by deploying code (the tier mapping is a setting). | ✅ | `D1` |
| 12 | A high-impact change can be sent for **approval** instead of silently allowed. | ✅ | `D3` |
| 13 | You can see the rules that govern a structure, and change them from a screen. | ✅ | `SD-4` / `SD-5` |

### PHASE 4 — Data classification / secrets — **row 14 ✅ (marking + encrypt-at-rest/decrypt-on-read built & measured); the `never exported by accident` leg is opened as `CC-45`.**

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 14 | Sensitive fields and secrets are marked as such, and the platform treats them specially (never logged, never exported by accident). | ✅ | `P4` (classification leg) — **all export legs now MASK marked fields: the server funnel (`CC-45`, 2026-10-10), the custom-entity `view` export (`CC-48`, 2026-10-10), and the customer tasks table (`CC-49`, 2026-10-10)** |

### PHASE 5 — Query / Command enforcement *(reads and writes are authorized)* — **row 15 ✅ (2026-10-10, `CC-47`); row 16 🟡 (own-leg ✅ `CC-50`, team-leg deferred `CC-51`); row 17 ✅ (2026-10-11, `CC-52`); row 18 ✅ (2026-10-11, `CC-53`); row 22 ✅ core (2026-10-11, `CC-27` — AI-user ↔ agent binding; narrowing leg scheduled `CC-55`). PHASE 5's rows 15/17/18/22-core are complete; row 16 remains 🟡 on its deferred team-leg only.**

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 15 | Every read is filtered by permission at the **data layer** — not by hiding a button. | ✅ | `P10` *(re-measured 2026-10-10, then CLOSED 2026-10-10 (`CC-47`). BOTH halves now met: (a) the ACL-coverage half — all 53 searchable entities declare `aclFeatures` + a coverage gate (`CC-46`); (b) the human-CRUD-list half — the human CRUD `GET`/list path IS permission-gated: `makeCrudRoute` routes declare `metadata.GET.requireFeatures` and the dispatcher's `checkAuthorization` enforces it with **403** before the handler runs (61/66 real CRUD routes declare it; the 5 exceptions are custom POST action routes or handler-gated list routes), and `CC-47` added `crud-read-gate-coverage.test.ts` so a NEW list route cannot be added un-gated. **RULE-13 CORRECTION:** the earlier 🟡 rationale ("the human CRUD list path has no per-entity permission filter / is gated by scope only") was FALSE — the gate exists and is enforced; what was missing was only the structural test. Note the honest bound recorded in the test header: the guarantee covers the human CRUD list family, not every route that happens to export a `GET`.)* |
| 16 | You can restrict a person to **their own rows / their team's rows**, not just their whole tenant. | 🟡 | Phase 3 item 18 — **MEASURED + DECIDED 2026-10-11.** Scope today is `tenantId` + `organizationId` + `organizationIds` only (`shared/src/lib/api/crud.ts` `buildScopedWhere`; `factory.ts` `withCtx()` `:1359-1412`); `auth.sub` never filters rows; no `team` concept; no shared owner column — so this is an **opt-in per-entity `rowScope` declaration**. **Owner chose Option A** (`NY-20`): own-only, opt-in, no team entity. **Option B (a real `team` entity + membership) is documented as a future addition** (`PLAN-ROW16-own-team-row-scope.md` §7; partial `CC-50`). 🟡 while A is being built. |
| 17 | Permission coverage reaches **every** table — a new table cannot be created un-gated. | ✅ | Phase 3 item 17 — **BUILT 2026-10-11 (`CC-52`).** Measured first (rule 0b): **233 entity classes (tables)** across modules; the two existing coverage gates cover only the **53 searchable** entities (`CC-46`) and the **60 `makeCrudRoute`** list routes (`CC-47`) — the balance had **no per-table read-ACL check**. `CC-52` adds `table-coverage.test.ts` (AST, `typescript-js`): every table must be **(a) searchable** (a module `search.ts` entityId), **(b) a read surface** (referenced by a comment-stripped `api/**/*.ts` file in its module), **or (c) on the named `INTERNAL_TABLES` allowlist** (with a reason per entry) — so a **new table cannot be added un-gated**; the gate pins the exact counts (233 tables / 47 surface modules / 12 search modules) and fails on a shrink. Hardened after a separate-agent hostile critic (3 real holes: comment false-positive, `route.ts`-only walker, loose floors). |
| 18 | The AI's read path goes through the **same** column- and row-level gates as a human. | ✅ | Phase 3 item 19 — **BUILT 2026-10-11 (`CC-53`).** Measured first (rule 0b): the AI read tools (`packages/search/src/modules/search/ai-tools.ts`) gated by **entity** (`aclFeatures`, fail-closed) and tenant/org **scope**, but applied only the **search** `fieldPolicy` strip — **not** the platform **classification** map and **not** the owner row-scope. Built: `search_get` masks every field the platform **classification map** names (`resolveExportEncryptedFields` + `isEncryptedExportField`, the **same** helper the human export uses — `CC-45`), recursing into nested object/array values, **fail-closed** on a throwing map (`maskAll`); `search_query` **drops the index-time presenter** for a classified entity (so a promoted arbitrary string field cannot leak via `title`); `search_aggregate` **refuses** a `groupBy` on a classified field. No map / map disabled ⇒ **byte-identical** to before. Hardened through **two** separate-agent hostile-critic rounds (round 1: the presenter-promotion leak + a raw aggregate bucket leak; round 2: a classified key nested in an object value leaked — fixed by `maskValueDeep` recursion); **RED-then-GREEN ×6**, md5-verified restores; 32/32 in the search module. **The own row-scope has no reader on the AI path** (measured: no entity is both searchable and own-scoped), so it is **not built** — recorded as the owner question `NY-22` (rules 8/10d/11). |
| 19 | Every state-changing action goes through one typed "command", never a raw write. | ✅ | Phase −1 C6 / `S5` — **BUILT 2026-10-11 (`CC-61`).** Measured first (rule 0b): the command bus is **real** (`shared/src/lib/commands/`, ~122 command files across ~18 modules, 20 test suites), so *"every action goes through one typed command"* **held**. What did **not** hold was `C6b` — *"the full contract uniform across every action"*: `CommandHandler` carried `capability`/`execute`/`undo`/`redo` and **no `risk`, `approval`, `idempotency` at all**. Built: the three facets added as **optional** declarations (`types.ts`) and **recorded on the action log** under `context.commandContract` (`command-bus.ts`), so the record is uniform; **approval DECLARES — the authority layer enforces** (a bus refusal would be a second engine, forbidden by `S5`). `C6b` ☐→☑. **Honest caveat:** the contract is uniform in **shape**; **adoption is 0 of ~93 production commands** (setting the fields is per-handler judgement — scheduled as `CC-63`). `S5` **measured but not ticked**: the matcher is single (`featureMatch.ts`), two RBAC *services* share it. |
| 20 | A generic **state-machine engine** exists so any "stage → stage" flow (an order, a ticket, a deal) can be declared once and enforced everywhere. | 🟡 | `G-22` |
| 22 | An **AI user can run only the agents bound to it** — and nothing else. | ✅ *(core) / 🟡 (narrowing leg)* | `CC-27` — **BUILT 2026-10-11.** The AI **actor** is an `api_keys` row whose credential issues an `ai_worker:<id>` subject; the AI **agent** is code-declared. Before this change the run/chat routes took the agent id as a **raw request-body string with no binding check** — any authenticated caller could name any agent. Built: an `ai_agent_bindings` table (`(tenant, org, principal, agent)`, one live row per pair via two partial-unique indexes), an `AiAgentBindingRepository`, a `resolveAgentBinding` resolver that is **fail-closed for an `ai_worker`** (no binding / no tenant ⇒ refused) and **passthrough for a human** (`B4` — humans keep today's behaviour), the check wired into **both** agent dispatch routes (`api/ai/run-object`, `api/ai/chat`) returning **403 `agent_not_bound`** *after* the policy gate and *before* the runtime call, a **manage surface** (`api/ai/agents/[agentId]/bindings` GET/POST/DELETE, `ai_assistant.settings.manage`), and a **coverage gate** (`binding-coverage.test.ts`) that fails a NEW agent dispatch site added un-gated. Hardened by a **separate-agent hostile critic** (2 real defects fixed: the coverage marker list omitted the real dispatcher `runAiAgentText`; a new test now derives the marker list from the runtime's own exports), **RED-then-GREEN ×9** with md5-verified restores. **Honest scope:** this row's *core* claim — *"may run only the agents bound to it"* — is enforced on the two dispatch routes. Its **narrowing leg** (`computeBoundRunScope`: a binding may only INTERSECT tools and UNION features, `B3`) is **built and unit-tested but not yet applied to the runtime** — the routes read only `binding.bound` — so it is **scheduled as `CC-55`**, and the pending-action **confirm** path does not re-check the binding (**scheduled `CC-56`**). Neither is claimed as done here. |

### PHASE 6 — Audit / provenance

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 21 | You can see **who did what, when, on which record** — and export it for compliance. | ✅ | `P4` — **RE-MEASURED 2026-10-11: BUILT.** The appendix had `0/2` (*"not verified in code this round"*) — never verified, and the phase was built all along. `packages/core/src/modules/audit_logs/`: a **read API** (`api/audit-logs/actions/route.ts`, `GET`, RBAC `audit_logs.view_self`, filter by actor/resource/org), a **viewer page** (`backend/audit-logs/page.tsx`, 235 lines, fetches the action + access logs), an **export API** (`actions/export/route.ts`, CSV), and **retention** (`accessLogService.rotate()` — core 7d / non-core 8h). **Rule-13 correction.** Two cracks registered: `CC-64` (an undo's trace bypasses the ledger), `CC-65` (`action_logs` unbounded). |
| 21b | Audit history is independent of the business record (you cannot edit your own past). | ✅ | `P4a` — **RE-MEASURED 2026-10-11: BUILT**, by the **hash-chained ledger** (`services/ledgerService.ts` — each event carries its predecessor's hash; `unique(tenant_id, seq)` + `unique(tenant_id, hash)`; `verifyTenantChain` + the `ledger:verify` CLI), appended **automatically** by `actionLogService.log()`. **Honest bound:** the *journal* (`action_logs`) is **mutable by design** (backfill CLIs `UPDATE` derived columns) — the tamper-evidence is the **ledger**, which digests the content; and an undo's trace is **unchained** (`CC-64`). **Also fixed here:** this row's ID had cited `P4a`, which is the *read-API/viewer* sub-point — a mis-reference. |

### PHASE 7 — Business Agent Gateway

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 23 | You can type a request in ordinary words and the platform turns it into a **typed business request** (a Business IR), not SQL. | ✅ | `G-02` / `G-17` |
| 24 | The AI is **structurally constrained** to produce a valid request — it cannot hallucinate a table or field. | ✅ | `G-17` |
| 25 | The platform **validates deterministically** before anything runs — the AI's output is a proposal, not an action. | ✅ | `G-02` |
| 26 | Every request ends in one of three known ways (an answer, a proposed model change, or a saved Function). | ✅ | `G-21` |
| 27 | The user is **told when blocked** and **noticed and suggested to** — not left guessing. | ☐ | `S3` / `S8` |

### PHASE 8 — Hermes adapter *(the agent runtime)*

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 28 | The agent runtime sits behind **one typed door** — no other code talks to it directly. | ✅ | `B-05` / `Port` — **PROVEN 2026-10-12 (`R28-5`)**: the whole-package scan proves nothing outside the door reaches an engine for a run; `B-05` ticked. The three `Port` boxes stay `☐` on their **own** blockers (`steerRun`/`resolveToolCall` unsupported; `secretRefs` unpopulated + `CC-70`), and `N-8`'s **delete** half is `R28-6`. |
| 29 | An AI user can be **bound** to a specific agent, with specific tools and scope. | ✅ | `CC-27` — **same item as LIST row 22** (Phase 5), which carries the full evidence: the `ai_agent_bindings` table + fail-closed `resolveAgentBinding` + the narrowing (`CC-55`), the confirm re-check (`CC-56`) and the in-process gate (`CC-57`), all closed 2026-10-11. *(This row read `☐` until 2026-10-11 — a **false open**: it named `CC-27`, which was already complete. Rule-13 correction; the two rows are one item seen from the binding's side and the runtime's side.)* |
| 30 | Each AI job **declares which model** it uses (local or cloud) — one picture, no surprises. | ☐ | `S6` |

### PHASE 9 — Functions / Widgets / Workspace — **rows 31–34 ✅; row 35 is `☐` and is exactly what the `B-WS` DESIGN TRACK feeds (the widget-and-workspace design is being written now: `B-WS/B9` widget architecture → `B-WS/B10` mapping; then WS-1 B-perms / WS-2 B-studio). A design is not a build, so row 35 stays `☐` until the design becomes a `CC-*` item that is built.**

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 31 | You ask for something new, verify it, and **save it as a Function** that then runs with **zero AI** forever. | ✅ | `G-03` |
| 32 | A Function's lifecycle (draft → published → archived) is an **enforced state machine**. | ✅ | `G-03` |
| 33 | A published Function **never calls a model at run time** — proven by test. | ✅ | `G-03` |
| 34 | A Function runs from a **Widget** (a small UI block) with typed inputs and outputs. | ✅ | `G-07` |
| 35 | You can place Functions and Widgets on a **Workspace** and share it. | ☐ | Widgets doc / Workspace — **design in flight: the `B-WS` track (`B-WS/B1–B-WS/B8` done; `B-WS/B9` = the widget architecture, now; see the ▶ FRONTIER DESIGN TRACK row and [`../workspace-architecture/04-BRIDGE.md`](../workspace-architecture/04-BRIDGE.md))** |

### PHASE 10 — First complete business capability *(the flesh — last, by design)*

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 36 | A complete business vertical (e.g. Customer + Sales) runs end-to-end on the finished skeleton. | 🟡 | `B1`–`B14` |
| 37 | CRM: leads, contacts, deals, pipeline. | ✅ (built early) | `B1` |
| 38 | Sales: orders, quotes, invoices, returns. | ✅ (built early) | `B2` |
| 39 | Catalog: products and pricing. | ✅ (built early) | `B3` |
| 40 | Inventory / WMS: stock and warehouses. | ✅ (built early) | `B4` |
| 41 | Finance / accounting (GL, AP/AR). | ☐ ABSENT | `B5` / `M1` |
| 42 | Procurement / purchasing. | ☐ ABSENT | `B6` / `M2` |
| 43 | HR / people (payroll absent). | 🟡 | `B7` |
| 44 | Projects, shipping, payments, customer portal. | 🟡 | `B8`–`B14` |

### PHASE 11+ — later (horizontal services, enterprise scale, entitlements)

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 45 | Entitlements (what a plan *includes*) are separated from permissions (what a person *may do*). | ☐ | blueprint §50 |
| 46 | Deployment, operations and the dev-doc set are complete. | ☐ | `J` / `K` |

---

## THE THREE THINGS THIS REWRITE FIXED

1. **The two-scoreboard contradiction is gone.** Before, `§B` (skeleton) read 0% while `§I` (business
   packs) read "done" — side by side, with no explanation. Now the list is one order, and the skeleton
   rows sit **above** the business rows, so the drift is visible in the layout itself.
2. **`☐ … (DONE)` is gone.** That confusing pattern (docs claim done, code unchecked) is replaced by the
   honest three-value glyph: `☑` verified, `🟡` partial, `☐` not done.
3. **Plain English.** Every row is now a sentence about *you*, not about a code item.

---

## APPENDIX — the technical detail (unchanged; kept for developers)

> The sections below are the **old** `§A`–`§L` view, byte-preserved. They carry the evidence ledger
> (§L) that every `☑` requires. **Do not read them to understand status** — read the list above. They
> exist so a developer can find a proof and so nothing was lost in this rewrite.

## A. THE SUBSTRATE — Ring 1, uncustomisable core (`CORE-BOUNDARY.md` C1–C11)

> **Fact-checked in the code 2026-10-07** — every line below was read against the source, not the docs.
> Verdicts (three-valued, see §"HOW TO READ"): `⬜ OPEN` (not built), `🟡 PARTIAL` (real code, incomplete —
> the remainder is named and scheduled), `✅ DONE` (verified, 100%). **Derived this round: 31 units, 10 done
> (32%)** — split into 7 parents whose 19 sub-points carry the ticks.

- ☐ **C1** — Resource envelope: the shape every object shares *(NOT DONE — no `ResourceEnvelope`/`BaseEntity`/shared base type anywhere in `shared` or `core`; each module declares its own `tenantId`/`organizationId` columns independently)*
  > **Why row 1 is not finished, and why that is right (measured 2026-10-10).** Row 1 is the **only** row
  > before row 13 without a tick — the owner noticed, and asked. **Verdict: leave it ruled-by-design, do
  > not build it yet.** The reason is written down and principled, not an oversight:
  > `BACKLOG.md` GAP A says the `Resource` envelope is a **Phase −1 architecture contract** (a *document*
  > that constrains the build), and *"building the type with no consumer would be the 'contract after the
  > code' failure."* GAP D states the same rule from the other side: *"a contract written **after** the code
  > is a description of what was built, not a constraint on what may be built."* **Measured in the code:** the
  > premise holds — `grep` across `shared`/`core` finds **no** `ResourceEnvelope`/`BaseEntity`/shared base
  > type, and **34 modules** each declare `tenantId` independently. So the envelope is genuinely absent, and
  > genuinely has **no consumer** today: nothing in the running app needs a common `Resource` shape yet —
  > the kernel **view** (`model.ts`) and the registry service (`metadata-registry.ts`) already answer the
  > questions the envelope would be *for*, and the registry deliberately reports envelope-shaped facts as
  > **typed absences** rather than inventing them. **What would change the verdict:** the moment a real
  > caller needs a uniform `Resource` (e.g. a generic list/export/audit path that must treat every object
  > alike), the envelope acquires a consumer and becomes startable with a proof. Until then, finishing it
  > would produce a type nobody reads — the exact anti-pattern Phase −1 exists to prevent. **So the order
  > is better this way:** row 1 waits; rows 7→8→9→13 (the policy kernel) lead, which is also the vision's
  > own order. *Scheduled as a Phase −1 contract; not a `CC-` callback because it is a design gate, not a
  > partial build.*
- ☐ **C2** — Actor & context model: who is acting and in what context ▸ 1/2
-   - ☑ **C2a** — The first-class `Principal`: 4 kinds (`human`/`ai_worker`/`service`/`system`), `onBehalfOfUserId`, machine predicates (`shared/src/lib/auth/principal.ts`, 215 lines) *(DONE — replaced the old `startsWith('api_key:')` branching)*
-   - ☐ **C2b** — The wider **context** (org/locale/tz/trace) as one model *(LEFT — not built; only the principal exists)*
-     *(was PARTIAL — substantial: `principal.ts` is real; what is missing is the wider context model)* · ★ Hermes: the seam every run crosses
- ☐ **C3** — Tenancy & isolation boundary: every row belongs to a tenant and cannot escape it ▸ 1/2
-   - ☑ **C3a** — Query-layer scoping: the CRUD factory auto-scopes by `tenantField` (default `'tenantId'`) on every read/write (`shared/src/lib/crud/factory.ts`) *(DONE — measured)*
-   - ☐ **C3b** — DB-level isolation: RLS policies / a database-enforced boundary *(LEFT — no DB-level RLS policies were found; isolation is enforced in the query layer only)*
-     *(was PARTIAL — substantial: auto-scoping is real; **no** DB-level RLS policies found)* · ★ Hermes: the tenant is derived, never declared
- ☐ **C4** — Authorization engine: the evaluator and grammar ▸ 3/5
-   - ☑ **C4a** — The evaluator: `shared/src/lib/authority/` (1312 lines) builds an explainable `Decision` with reasons *(DONE — measured)*
-   - ☑ **C4b** — Called in the request path: the command gate + the HTTP RBAC path + (since `S-02`, code `3add3a2`) the **AI tool door** (`ai-assistant` `lib/tool-authority.ts`) *(DONE — the header quote "It does not enforce. Nothing calls it in the request path" was **corrected in `decision.ts` on 2026-10-08**; it had been stale since the command gate landed 2026-08-10)*
-   - ☑ **C4c** — The per-verb **grammar** for the write verbs: `SD-4` Slice C built the S11 per-verb grammar (the five verbs in `PERMISSION_BLOCK_VERBS.structural`; the per-(object, verb, actor) **level** in `structural-settings.ts` — `straight`/`review`/`approval`/`never`) and **CC-37 (2026-10-09) wired it** (the structural guard reads the level **live** and escalates an explicit `review`/`approval` rule to the D3 outcome on a protected surface) *(DONE — the grammar exists, is readable, and is acted on for `add`/`edit`/`remove`)*
-   - ☐ **C4d** — `read`/`reference` enforcement (the two verbs the write-path guard cannot act on) *(LEFT — CC-34)*
-   - ☐ **C4e** — The data axis ("may this actor read this row, for this purpose?") *(LEFT — `G-04`)*
-     *(was PARTIAL — the evaluator is real and is now called in the request path; what remains is the `read`/`reference` half of the grammar and the data axis)* · ★ Hermes: S-02 is where a tool call is authorized — **now wired**
- ☐ **C5** — Metadata registry & schema conventions ▸ 2/4
-   - ☑ **C5a** — The kernel **view**: `shared/src/lib/kernel/model.ts` (407 lines) **reads** the platform's declarations into a canonical, id-keyed model with a 21-item per-object contract; `entity-fields-registry` is registered at bootstrap *(DONE — measured)*
-   - ☑ **C5b** — The read-only registry **service**: `shared/src/lib/kernel/metadata-registry.ts` (2026-10-07, code `59ab859`) answers **what exists · what type · provenance · what depends on it** from the declarations, and returns a **typed absence** for the other ten §54 questions; it is a **live view** over the descriptor *(DONE — measured)*
-   - ☐ **C5c** — The **schema-conventions** half: the envelope/contract every object shares *(LEFT — that is `C1`, not built)*
-   - ☐ **C5d** — Consumed by a real caller + the remaining §54 answers that need links the platform does not yet have (**who can access it** — *corrected 2026-10-10: the old text said "the authority engine is shadow-mode and SD-4 unbuilt" — **SD-4 is now BUILT** (2026-10-09, slices A/B/C + CC-37 + SD-5), so the honest remainder is the *route→object* link the registry still lacks*; **what APIs expose it** — no route→object index) *(LEFT — `SD-1`'s gate can now *enumerate* but does not call it yet)*
-     *(was PARTIAL — the view and the service are real; what is missing is the schema-conventions half and real consumption)* · ★ Hermes: how Hermes learns the shape of the business without a DB handle
- ☑ **C6** — Command / action contract: schema · permissions · side effects · risk · approval · idempotency ▸ 2/2 *(both sub-points DONE — `C6a` the bus, `C6b` the uniform contract)*
-   - ☑ **C6a** — A real command bus: `shared/src/lib/commands/` (`command-bus.ts`, `types.ts`, `undo.ts`, `redo.ts`, `registry.ts`, `operationMetadata.ts`, interceptors, scopes); `types.ts` carries input/execute/undo/redo/capability *(DONE — measured)*
-   - ☑ **C6b** — The **full** contract uniform across every action (risk · approval · idempotency) *(DONE 2026-10-11 — `CC-61`, LIST row 19. The contract now carries all **six** facets: `schema` (the input type) · `permissions` (`capability`) · `side effects` (`execute`/`undo`/`redo`/`prepare`) · **`risk` · `approval` · `idempotency`** — the last three added as **optional** declarations on `CommandHandler` (`types.ts`) and **recorded on the action log** under `context.commandContract` (`command-bus.ts` `commandContractMetadata`). **Honest caveat, recorded not hidden:** the contract is uniform in **shape**; **adoption is 0 of ~93 production commands** — setting the fields is per-handler judgement, deliberately out of scope, and is scheduled as `CC-63`.)*
-     *(was PARTIAL — the bus is real; the full contract is unproven)*
- ☐ **C7** — Event envelope (CloudEvents-shaped) *(NOT DONE — the entire `shared/src/lib/events/` directory is `patterns.ts` + its test; there is **no envelope type** at all. A separate `packages/events` package exists but was not the envelope)*
- ☐ **C8** — Audit contract: every mutation records who · what · when · before · after · actor_type · trace ▸ 1/2
-   - ☑ **C8a** — The `audit_logs` module: `packages/core/src/modules/audit_logs/` (API, undo/redo, export, a mutation-guard, a CLI); it records user/action/field/before/after/createdAt *(DONE — measured)*
-   - ☐ **C8b** — `actor_type` and a request/trace id on every record *(LEFT — not confirmed complete)*
-     *(was PARTIAL — the module is real; two fields of the contract are unconfirmed)*
- ☐ **C9** — Migration & versioning contract: plan → validate → migrate → verify *(NOT DONE — per-module MikroORM migration folders exist (`<module>/migrations`), but there is **no** plan/validate/verify contract: a grep for `planMigration`/`validateMigration`/`verifyMigration`/`migrationPlan` across `shared` and `core` finds nothing)*
- ☐ **C10** — Localization resolution: fallback chain + formatting contracts ▸ 1/2
-   - ☑ **C10a** — A real resolution chain: `shared/src/lib/i18n/locale.ts` (`resolveLocaleFromCandidates`: requested → base-locale → null), plus `number.ts` and `date/format.ts` *(DONE — measured)*
-   - ☐ **C10b** — The specified five-step chain (requested → lang+region → lang → app default → platform) and the formatting **contracts** (as a contract, not helpers) *(LEFT — GAP C)*
-     *(was PARTIAL — the chain helper is real; the specified chain and the contracts are incomplete)*
- ☐ **C11** — Error model: code · message · details · field_errors · retryable · trace *(NOT DONE — `shared/src/lib/crud/errors.ts` builds only `{ error: message }` (`badRequest`/`forbidden`/`notFound`/`conflict`); the tokens `field_errors`/`retryable` appear scattered across files, not as one canonical error model)*
- ☐ **Ring-1 enforcement** — no config key for core; migration contract the only door; a test asserts the core *(NOT DONE — no test asserting the core contracts was found, and the migration contract (C9) that was to be "the only door" does not exist)*

---

## B. THE PLATFORM SKELETON — the `P1`–`P18` register

- ☐ **P1 Identity & accounts** — users · sessions · password reset · consent · login *(DONE — the strongest module; not re-verified this round)*
- ☐ **P2 Tenancy & org structure** — tenants · organisations · hierarchy · scoping *(DONE — not re-verified this round)*
- ☑ **P3 Roles & permissions (RBAC/ACL)** — roles · grants · feature gates ▸ 2/2 *(VERIFIED IN CODE 2026-10-09 — the sub-parts were re-measured against the code, not the docs)*
-   - ☑ **P3a** — Roles + grants (the ACL tables) + the typed permissions-catalogue **service** *(DONE 2026-10-09 — re-measured in code. `CORRECTED (rule 13):` the old note said **"two-table ACL"** — that was **false**: the ACL model is **`roles`** (`auth/data/entities.ts:53`) **+ `role_acls`** (`:337`) **+ `user_acls`** (`:372`) with a **`user_roles`** join (`:268`) — three tables plus a join, **not two**. What IS real: the typed catalogue (`shared/src/lib/permissions/catalogue.ts` — `PermissionSurface`/`PermissionRecord` types) **plus** its persistence/read service (`auth/services/permissionSurfacesService.ts`), which are two pieces, not one "typed catalogue service". Both halves exist and both are proven; the wording was wrong, the substance was right.)*
-   - ☑ **P3b** — Persisted for runtime surfaces + consumed by a read *(DONE 2026-10-09 — the durable **write** half is built, wired to all 7 callers and proven on the live DB (`permission_surfaces`, `Migration20261009205000`); the **read** half is now built too: `readTenantSurfaces(em, tenantId)` in `permissionSurfacesService.ts` answers from **declared (global) + exactly this tenant's persisted rows** (never the raw global `Map`), consumed live by the route `GET /api/auth/permission-surfaces`, proven by 27/27 read-side tests + a cross-tenant non-leak test + 5 md5-verified mutations + a separate-agent hostile-critic. `CC-43` CLOSED. See `SD-1`)*
-     *(was: docs claimed `P3a` "carried"; the code was re-verified 2026-10-09 by walking the entities, the catalogue and the RBAC enforcement — the "two-table" claim was corrected above. Row 7's **enforcement** half is now measured too: `analysis/permission-gate/measure.js` reads **158/169** write routes in the 35 enabled modules feature-gated, 5 guard-only and **6 by-design exceptions, 0 unexplained** — the claim "enforces every one on every write" holds for every genuine resource write; the gate is **opt-in** (no default-deny) and that is a **policy** choice scheduled as `CC-44`, not a defect.)*
- ☑ **P4 Data classification / secrets** *(the row-14 leg — RE-MEASURED IN CODE 2026-10-10)* — sensitive fields/secrets ARE marked and the platform DOES treat them specially. **Marking:** a `ModuleEncryptionMap` (`shared/src/modules/encryption.ts`) — **15 modules declare `defaultEncryptionMaps`** (`auth`/`audit_logs`/`customers`/`customer_accounts`/`sales`/`staff`/`integrations`/`communication_channels`/`messages`/`inbox_ops`/`checkout`/`onboarding`/`payment_gateways`/`search`/`webhooks`), persisted into the `encryption_maps` table, seeded at setup + from the CLI. **Treated specially:** a MikroORM subscriber encrypts at rest / decrypts on read under a per-tenant DEK (`TenantDataEncryptionService`, on by default), read back at **1777 call sites across 373 non-test files**; a **manage screen** (`EncryptionManager.tsx` + `entities/api/encryption.ts`, guarded + optimistic-locked); CLI `seed-encryption`/`rotate-encryption-key`/`decrypt-database`. **Audit payloads are encrypted too** (`audit_logs/encryption.ts`). **Suites green: shared encryption 10/67, core entities encryption API 7/7.** **The `never exported by accident` leg — SERVER half CLOSED 2026-10-10 (`CC-45`):** every CRUD export path that serializes real entity rows now consults the map and **masks** a marked field (`shared/src/lib/crud/export-encryption.ts` wired at the factory funnel `factory.ts` + `entities/api/records.ts`; 27 tests, 3 RED-then-GREEN mutations, green gate 556/48 shared + 405/47 core). **The custom-entity CLIENT half CLOSED 2026-10-10 (`CC-48`):** the records page's `view` export is now server-routed (`getUrl` + an `exportColumns` projection) so the mask applies (12 tests, 3 RED-then-GREEN mutations; green gate 417/49). **The CUSTOMER-TASKS export CLOSED 2026-10-10 (`CC-49`):** the tasks table's `view`/`full` exports are now server-routed (like `CC-48`); the tasks route (`interactions/tasks`) gains a `?format=` export mode that **unions the marked fields of both entities the rows draw on** (`customer_interaction.title`/`body` + `customer_entity.display_name`), flattens each row to its exact column fields, and masks via a new **alias map** (`todoTitle→title`, `todoDescription→body`, `displayName`/`customer.displayName`→`display_name`) — 20 tests + 4 RED-then-GREEN mutations. The **hostile critic found 3 real defects in the first draft** (wrong entity id → mask was a no-op; a nested `customer.displayName` column was blank and an un-projected `customer` object column leaked the name; a bypassable static guard) — all fixed. **The `never logged` leg is PARTIAL** — the logger redacts a *fixed* name list (`transport.server.ts:5`), not the classification. *(This is the **classification** leg of row 14. The `P4` id is reused in rows 21/22 below for the **audit** leg — a different unit; see `P4a`/`P4b`.)*
- ☑ **P4 Audit & compliance log (the row-21/21b leg)** — who/when/which record; retention/export ▸ 2/2 *(RE-MEASURED IN CODE 2026-10-11 — **the phase is BUILT**; the old `0/2` read *"no sub-part verified in code this round"*, and that was simply never done. `packages/core/src/modules/audit_logs/`: a read API (`api/audit-logs/actions/route.ts`, `GET`, RBAC `audit_logs.view_self`, filters by actor/resource/org), a viewer page (`backend/audit-logs/page.tsx`, 235 lines, fetches both the action and access logs), an export API (`actions/export/route.ts`, CSV with `content-disposition`), a **hash-chained ledger** (`services/ledgerService.ts` — each event carries its predecessor's hash; `unique(tenant_id, seq)` + `unique(tenant_id, hash)`; `verifyTenantChain` + the `ledger:verify` CLI), appended **automatically** by `actionLogService.log()` (the command bus's caller), and **retention** for the high-volume access log (`accessLogService.rotate()` — core 7d / non-core 8h). **Rule-13 correction.** **Two real cracks found by the hostile critic and registered:** `CC-64` (an undo's trace bypasses the ledger) and `CC-65` (`action_logs` has no retention path). **A different unit from row 14's classification leg above.**)*
-   - ☑ **P4a** — Read + create API and one viewer page *(DONE — measured 2026-10-11: the read API + the viewer page + the export route all exist and are RBAC-gated; the "create" path is the command bus's `actionLogService.log()`. Was *"carried — docs claim it, not re-verified"*.)*
-   - ☑ **P4b** — Retention and export *(DONE — measured 2026-10-11: **export** = `actions/export/route.ts` (CSV); **retention** = `accessLogService.rotate()` with core/non-core cutoffs. **Honest bound:** the retention covers `access_logs` only; `action_logs` and `ledger_events` are **not** pruned — for `ledger_events` that is **intended** (pruning breaks the chain), for `action_logs` it is the registered `CC-65`.)*
-     *(was PART — read+create API, one viewer page; the phase is now measured as fully built)*
- ☐ **G-05** — Classification metadata on entities and fields (personal/secret/regulated) *(OPEN — the kernel `classification?` field is DECLARED (`kernel/model.ts:61`, spec §12.2) and round-tripped (`round-trip.ts`) but **measured: no module ever sets it** — the row-1 declared-unpopulated pattern; buildable when a consumer reads it, e.g. the `CC-45` export filter)*
- ☐ **P5 Settings / configuration** — instance- and tenant-level *(DONE — `module_configs`; hosts the tier setting)*
- ☐ **P6 File / document storage** — attachments · partitions · backends *(DONE)*
- ☐ **P7 Notifications** — in-app + email + push, templates ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P7a** — The notification engine (in-app + email + push) *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P7b** — User-editable templates *(LEFT — templates are code-defined, not user-editable)*
-     *(was PART — templates code-defined, not user-editable)*
- ☐ **P8 Workflow / automation engine** — definitions · instances · steps · user tasks *(DONE)*
- ☐ **P9 Business rules engine** — declarative conditions → actions *(DONE)*
- ☑ **P10 Search / indexing** — full-text + vector ▸ 2/2 *(BOTH sub-points now DONE: the ENGINE (`packages/search`, strategies `tokens`/`vector`/`fulltext` + indexer/workers/embeddings + a global-search route & UI, suite 26/269 green) and the ACL-feature COVERAGE (all 53 searchable entities declare `aclFeatures` + a coverage gate — `CC-46`, 2026-10-10).)*
-   - ☑ **P10a** — A strong search engine *(DONE — re-measured 2026-10-10: `packages/search/src/modules/search/` (strategies `tokens`/`vector`/`fulltext`, indexer, workers, embeddings, `global-search` route + `GlobalSearchDialog.tsx`); suite 26/269 green)*
-   - ☑ **P10b** — A real UI + full ACL-feature coverage *(DONE 2026-10-10 (`CC-46`) — the UI is real; the ACL-feature coverage was thin: measured 2026-10-10 (independent hostile-critic re-measure), **6 `aclFeatures` across 53 searchable entities**, ALL in the `customers` module — the other 10 modules with a `search.ts` declared none (fail closed in the AI-tools gate). **CLOSED 2026-10-10 by `CC-46`**: all 53 entities now declare `aclFeatures` mapping to existing features, enforced by a new coverage test. **`P10b` → ☑.**)*
-     *(the `P10` id does double duty: row 15's **read gate** (`aclFeatures` coverage) vs §B's **search module**. They are distinct; recorded 2026-10-10.)*
- ☐ **P11 Integrations & sync** — external systems · credentials · mapping · cursors ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P11a** — Read + update *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P11b** — Create / delete · credential management · cursor persistence *(LEFT — read+update only)*
-     *(was PART — read+update only)*
- ☐ **P12 API keys / programmatic access** — machine auth ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P12a** — One composite route file *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P12b** — The complete route set *(LEFT — one composite route file)*
-     *(was PART — one composite route file)*
- ☐ **P13 i18n / localisation** — translation catalogue · locales ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P13a** — A single-route API + one UI page *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P13b** — A full translation management surface *(LEFT)*
-     *(was PART — single-route API, one UI page)*
- ☐ **P14 Feature flags** — gradual rollout · kill switches *(DONE)*
- ☐ **P15 Dashboards / widgets / perspectives** — configurable views ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P15a** — Tables + APIs *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P15b** — The configuration UI *(LEFT — tables+APIs exist, ZERO UI)*
-     *(was PART — tables+APIs exist, ZERO UI)*
- ☐ **P16 Custom fields / entity extension** — user-defined tables and columns *(DONE)*
- ☐ **P17 Background jobs / scheduler** — workers · queues · schedules ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P17a** — The service + API *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P17b** — The jobs/scheduler UI *(LEFT — service+API, no UI)*
-     *(was PART — service+API, no UI)*
- ☐ **P18 Guard / mutation policy engine** — the gate every write passes *(DONE — D0 fixed; D2-wide enabled-complete; D2-gap 0)*

---

## C. THE AI-FIRST NATIVE LAYER — the loop that makes this not "an ERP with AI"

- ☐ **P0-spec** — The Business Model Kernel specification (vision gate RQ-140) *(spec exists in docs; NOT code-verified — a spec is not the build)*
- ☑ **G-01** — Business Model Kernel: canonical, versioned, typed model above the DB *(DONE — verified)*
- ☑ **G-08** — Relationship fabric: relationships first-class, declared attributes, collision reporting *(DONE — with G-01)*
- ☑ **G-02** — Business IR: the typed read and write shapes the AI produces *(DONE — verified)*
- ☑ **G-02** — IR compiler: read IR → real query; scope injected fail-closed *(DONE — verified)*
- ☑ **G-17** — Schema-constrained generation: the AI *emits* the Business IR *(DONE + measured live)* · ★ Hermes: the first real joint
- ☑ **G-03** — User Functions: reusable operation created with AI, executable without AI *(DONE — verified)*
- ☑ **G-03** — Function lifecycle: eight states as an enforced state machine *(DONE)*
- ☑ **G-03** — Zero-AI execution: a published Function never calls a model at run time *(DONE — import-graph test)*
- ☑ **G-03** — Function verify gate (`verifyFunction`): objective checks by calling the compiler *(DONE)*
- ☑ **G-07** — Widget contract / Widget IR / registry: typed in/out/actions/events *(DONE — verified)*
- ☑ **G-07** — Function→Widget placement: a published Function runs from Widget inputs with no AI *(DONE)*
- ☑ **G-21** — Request-outcome taxonomy: `ephemeral_answer` · `model_proposal` · `function_candidate` *(DONE — verified)*
- ☑ **G-21** — Triage: pure decision of which ending a prompt gets *(DONE)*
- ☑ **G-21** — Save gate: asks `verifyFunction`; surfaces `notChecked` even on success *(DONE)*
- ☐ **G-21** — The schema-mutation IR kind (outcome 2 waits on this) *(OPEN)*
- ☐ **G-09** — `@`/`#` reference and resolution layer *(OPEN — startable)*
- ☐ **G-10** — Dependency tracking + change propagation *(OPEN — startable)*
- ☐ **G-12** — Business backup and restore *(OPEN — the safety net)*
- ☐ **G-19** — A proprietary ERP benchmark *(OPEN)*
- ☐ **G-20** — Freshness, lineage and continuous linting *(OPEN)*
- ☐ **Vision** — Business Model Kernel object list (31 objects + 4 contracts) ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Vision.a** — The object list + contracts are enumerated *(carried — in the vision docs)*
-   - ☐ **Vision.b** — Every one of the 31 objects exists in code *(LEFT — partially; see §C `G-01`/`G-08`)*
-     *(was PART)*
- ☐ **Vision** — Core data vs capability data: one business universe, no DB islands ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Vision.a** — The principle is written down *(carried — in the vision docs)*
-   - ☐ **Vision.b** — No DB islands in code (every pack shares the universe) *(LEFT — `N-6` `customer_accounts` is a named island)*
-     *(was PART)*
- ☐ **Vision** — Schema compiler: model → DB + API + UI + AI + MCP + skills + docs + tests *(OPEN — pieces exist, no single compiler)*

---

## D. HERMES — the agent runtime and its joints

- ☑ **B-05** — Runtime boundary decided: Hermes a supervised private Python runtime behind one typed port; headless *(**PROVEN 2026-10-12 — `R28-5`.** The typed port exists (`lib/ai-runtime-port.ts`), **every production caller walks through it** (R28-3 + R28-4 + `CC-67`), and — the row's own sentence, *"no other code talks to it directly"* — is now **mechanically proved** by `door-only-way-in.test.ts`: a whole-package structural scan (`.ts` + `.tsx`), 11 assertions, **12 mutations all RED**, a hostile critic's three defects all fixed. The two reaches that remain are **named, registered, non-run exceptions pinned by the test**: `CC-69` (the chat route's `answerQuestion` short-circuit) and `CC-71` (the health/monitoring endpoint) — neither is a *run*, both carry callbacks. **Hermes itself is still unbuilt** — that is a different point; this box is the *runtime boundary*, which is now one typed door and **proven** so)*
- ☐ **Port** — The typed port (`describeCapabilities` · `startRun` · `streamRun` · `cancelRun` · `steerRun` · `resumeConversation` · `resolveToolCall` · `completeRun`) *(**BUILT AND USED** — `lib/ai-runtime-port.ts` declares all eight; **two** engines sit behind the door with honest capability maps: the OpenCode adapter implements six (`steerRun`/`resolveToolCall` openly ✗) and the platform-runtime adapter (R28-2 + `CC-67`); every production caller calls through it; *"the ONLY way in"* is now **proved** (`R28-5`, 2026-10-12). **NOT ticked on its OWN blocker — not R28-5:** `steerRun`/`resolveToolCall` are **openly unsupported by both engines behind the door**, so the port is not yet the full eight-in-one door the box names)* · ★ Hermes: the only door
- ☐ **Port** — The admitted envelope: server-minted identity, secret *references*, distinct ids *(**BUILT AND USED** — the envelope exists with all §4.2 fields and the chat route mints identity server-side with a run id distinct from the conversation id (R28-3, mutation-proved); `CC-67`'s second adapter carries the live `container`/auth **on its construction**, so **no envelope field is invented** (§4.2 respected). **NOT ticked on its OWN blockers — neither is R28-5:** `secretRefs` is declared but **no caller populates it** yet, and the capability grant is **carried-but-not-consumed** (`CC-70`))*
- ☐ **Port** — Failure is normal: `cancelRun` bounded+idempotent, `completeRun` replay-safe *(**BUILT AND NOW USED** — both are value-returning and hostile-critic-hardened (cancel: `already-cancelled`/`already-complete`/`not-found`; complete: replay returns `alreadyComplete`), and the run path **closes every run exactly once** (R28-4 + `CC-67`): a client disconnect (Stop / closed tab → `req.signal`) cancels the run and the `finally` completes it — `CC-67` also closes on an engine error (`failed`) and on a **bodyless** `Response` (a latent leak the critic found). **NOT ticked**: **its own blocker was R28-5, and that is now proved** — but it is kept `☐` **with** the other two `Port` boxes, which have their OWN, different blockers (`steerRun`/`resolveToolCall` unsupported; `secretRefs` unpopulated + `CC-70`): ticking one box of a three-part door while the other two are open is exactly the "one caller out of three" mistake)*
- ☐ **N-8** — Displace OpenCode: build the port, move the chat route, *then* delete OpenCode *(**FIRST HALF DONE AND PROVEN** — the port is built, **every production caller walks through it** (R28-3 + R28-4 + `CC-67`), and the tree-wide guarantee is now **mechanically proved** by `R28-5` (2026-10-12). **NOT ticked**: the **deletion has not happened** — OpenCode still exists as the engine behind the door; that is **`R28-6`**, the second half, which was **MEASURED 2026-10-12 and found TRIGGER-BLOCKED** (rule 9b): Hermes does not exist in this repo, so deleting OpenCode would remove the **only** engine that answers a chat — see `CC-72`. The two non-run reaches (`CC-69`, `CC-71`) do not block the rewire half — they are pinned and registered)*
- ☐ **Hermes id** — `ai_worker` principal derived server-side; no branch on `kind` in own files ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Hermes id.a** — The seam (`aiWorkerSubject`/`derivePrincipal`/`PrincipalKind`) *(carried — the seam is real; not ticked, per §L)*
-   - ☐ **Hermes id.b** — Extended and **enforced** — no branch on `kind` in Hermes's own files *(LEFT — must extend + enforce)*
-     *(was PART — seam built, must extend + enforce)*
- ☐ **AH-1** — The five agent kinds **enforced** on the agent definition *(ENFORCEMENT LEG — distinct from the `AH-1` object in §E, which is DONE 2026-10-09. The five kinds `personal · role · context · independent · system` ARE declared as the `kind` field's option set (`ai_assistant/ce.ts`, code `1a518f8`), so the vocabulary is one source for DB/API/UI — but they are a declared enumerable, not yet an **enforced per-kind definition** (what each kind *decides* about visibility/ownership). That enforcement is owned by `AH-2` (the autonomy gate, needs `G-04`) / the agent-half phase 2, not by the object declaration. Stays `☐` per the never-a-partial-tick rule; it does **not** block the `AH-1` object in §E.)*
- ☐ **Tool door** — One door only: in-process client + tool registry/executor/mcp-adapter; every call re-authorizes; no DB handle ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Tool door.a** — The single door: in-process client + registry/executor/mcp-adapter *(carried)*
-   - ☐ **Tool door.b** — Every call re-authorizes + no DB handle leaks *(LEFT — `S-02` wires the authorization; the completeness of the door is unverified)*
-     *(was PART)*
- ☑ **S-02** — Tool-call authorization at execution time, deny-by-default *(DONE 2026-10-08, code `3add3a2`)* · ★ Hermes: where a tool call is allowed or denied
- ☐ **G-06** — AI input/output guards + the context firewall (prompt-injection + exfiltration) *(OPEN)*
- ☐ **Provider** — Provider choice and fallback; allowlist and local/cloud rule stay ours ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Provider.a** — Provider choice + fallback exists *(carried)*
-   - ☐ **Provider.b** — An allowlist + the local/cloud rule, ours to set *(LEFT)*
-     *(was PART)*
- ☐ **Sessions** — Session continuity as a projection keyed by our ids; our records canonical ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Sessions.a** — Session continuity as a projection *(carried)*
-   - ☐ **Sessions.b** — Keyed by **our** ids, our records canonical *(LEFT)*
-     *(was PART)*
- ☐ **Memory** — Long-lived tenant-scoped memory artifact with consent, export, retention, deletion *(MISSING)*
- ☐ **AH-9** — Governed skills catalog: provenance · scan · version · approve · pin · roll back · revoke *(MISSING)* · ★ Hermes: "Hermes learns as you go"
- ☐ **Subagents** — Bounded child runs with budgets, deadlines, cancellation, trace *(MISSING)*
- ☐ **Channels** — Rooms own identity; Hermes channels are adapters, never a second inbox ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Channels.a** — Channels exist as adapters *(carried)*
-   - ☐ **Channels.b** — Rooms own identity (never a second inbox) *(LEFT)*
-     *(was PART)*
- ☐ **Runtime state** — Isolated per tenant and agent; export, backup, delete, retention *(MISSING)*
- ☐ **Scheduling** — Our scheduler owns every business job; Hermes cron runtime chores only ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Scheduling.a** — A scheduler exists *(carried)*
-   - ☐ **Scheduling.b** — It owns **every business job**; Hermes cron does runtime chores only *(LEFT — needs the `G-18` enforcement gate)*
-     *(was PART)*
- ☐ **Sandbox** — Disposable, quota-bounded, network-policed worker ▸ 0/2 *(highest risk; no sub-part verified in code this round)*
-   - ☐ **Sandbox.a** — A sandbox exists *(carried)*
-   - ☐ **Sandbox.b** — Disposable + quota-bounded + network-policed *(LEFT — highest risk)*
-     *(was PART — highest risk)*
- ☑ **Phase 0** — Pin the Hermes source digest + a compatibility harness *(**DONE 2026-10-12, RE-PINNED to the newest source the same day** — the pin exists: `library/development/HERMES-PIN.md` records the source revision (`3569e8461ea721623fa16e6f01fb636157989fe6`, read from the snapshot zip's own archive comment) and the whole-snapshot digest (`ca760e97ff1ef1f0e2ed3deb0dfc2923`, 18,248 files), and the harness `library/.hermes_pin.py --check` re-computes it and **PIN HOLDS**; proven deterministic (two runs equal) and **sensitive** (append one byte `x` → digest moves to `70a8507c…`; restore md5 `9e0dac68…` → `ca760e97…`, PIN HOLDS). **The pin names ONE of THREE on-disk Hermes copies** (root `hermes-agent-main/` = the newest, byte-verified against the root zip) — the "source-versus-image divergence" of the arch §10 risk table, found in our own tree. **RE-PINNED**: the first edition pinned `library/ai/hermes-agent-main/` (`eb044063…`, 17,201 files); the owner supplied a newer copy, measured **3,290 commits ahead**, and the pin moved to it (harness + doc updated in the same change so the tick still means what it says). L136.)*
- ☑ **Phase 0** — State the licence position, including optional components *(**DONE 2026-10-12** — position stated in `HERMES-PIN.md` §4 from the **re-pinned** snapshot: the runtime is **MIT** (Nous Research); **19** bundled `LICENSE` files (18 in the previous pin; the addition is MIT), all **MIT or Apache-2.0** (`plugins/security-guidance` = Apache-2.0), **no copyleft**; AGPL/GPL appears **only** as references to separately-invoked tools (all `.md` — Hermes' own rule: *"never import it as a Python library … keeps Hermes Agent's MIT license clean"*), never as bundled code. Two obligations named, neither a blocker: keep the notices; keep the invoke-don't-import boundary. This closes **`V-09`**'s gate)*
- ☐ **Never 1** — A model-widened grant *(invariant — must hold)*
- ☐ **Never 2** — A secret in a prompt, a log or an instruction *(invariant — must hold)*
- ☐ **Never 3** — A business mutation outside the typed command path and its approval *(invariant — must hold)*
- ☐ **Never 4** — A second identity plane *(invariant — must hold)*

---

## E. THE AGENT HALF — `AH-1`–`AH-12`

- ☑ **AH-1** — The agent as a kernel object: `kind` · `owner` · `actsAs` · `role` · `runtime` · `autonomy` *(DONE 2026-10-09 — the `Agent` object is declared with **all six** §1.4 fields (`ai_assistant/ce.ts`, code `1a518f8`) so `buildModelDescriptor` sees it; it is protectable as a core object per-object (code `acfd020`); **`owner`/`acts_as`/`role` are all real `relation` fields** (targets `auth:user` and `auth:role`), and the `reportsTo` **self-edge** is declared (`ai_assistant/data/extensions.ts`). The last leg — `role` — closed when `auth:role` was admitted to the kernel via the same `entityExtensions` route that admits `auth:user` (slice 4, 2026-10-09). **Proven:** AH-1 test **12/12 GREEN**; `ai-assistant` **103/103 suites / 1446 tests**; `tsc` clean in `shared`+`core`; **four md5-verified RED-then-GREEN mutations** (M1 `owner` relation→text, M2 empty extensions, M3 `role` relation→text, M4/M5b remove the `auth:role` admission); two hostile-critic rounds (round 2 caught a tautological assertion + an overstated rationale, both fixed). **Owner of the enforcement legs** (`runtime`/`autonomy`) is `L-01`/`AH-5` and `AH-2` — declared here, enforced there, each a named item; that is *not* a gap in `AH-1` (the three docs state it explicitly). `CC-40` is CLOSED.)* · ★ Hermes: the object the multi-tenancy persona map depends on
- ☐ **AH-2** — The responsibility rule: autonomy per action class on `A0`–`A5`; accountable party always a person *(OPEN — needs G-04)*
- ☐ **AH-3** — Durable wake queue: every trigger is a database row, not an in-memory timer *(OPEN — needs S-05)*
- ☐ **AH-4** — Routines produce work items: schedule → task → wake *(OPEN — needs AH-3)*
- ☐ **AH-5** — The room: first-class shared space, participants, agenda, lifecycle, speaker-labelled log *(OPEN)*
- ☐ **AH-6** — Mentions / participants: pull an agent in without assigning work *(OPEN — needs AH-5)*
- ☐ **AH-7** — Hire / fire as a product operation, not an ops script *(OPEN — needs AH-1)*
- ☐ **AH-8** — MCP governance: narrowest-first precedence, changed-tool quarantine, argument-bound approvals *(OPEN — needs G-04)*
- ☐ **AH-9** — Skills: description-indexed, on-demand, derived trust level *(OPEN — needs AH-1)*
- ☐ **AH-10** — System agents: admin-created cron/backup/cleanup workers *(OPEN — needs G-12, G-18)*
- ☐ **AH-11** — ESTOP wired to our own pause: one sentinel file, fails safe on corruption *(OPEN)*
- ☐ **AH-12** — The warm-session acceptance test *(OPEN — needs AH-5)*
- ☐ **N-15** — Draw the orchestration boundary (our scheduler vs "a second orchestration system") before AH-3 *(OPEN — a decision first)*
- ☐ **N-16** — The self-modification gate: an agent's proposal to change how it works → diff, accept, apply separately *(OPEN)*
- ☐ **N-17** — The memory control plane: a policy over several memory providers *(OPEN)*
- ☐ **N-18** — The plugin capability model: may third parties ever extend Companai? *(OPEN — a decision)*
- ☐ **N-19** — Read side-effects are not attributable to the AI *(OPEN — lands with the authority layer + tool-call recording)*
- ☑ **AI-USERS** — AI actors are **first-class principals** (owner-confirmed 2026-10-08): one principal vocabulary (`human`/`ai_worker`/`service`/`system`), an AI actor is a real DB row — `api_keys.principal_kind = 'ai_worker'` (`api_keys/data/entities.ts:52-53`; migration `Migration20260812180000.ts:32`; validator `api_keys/data/validators.ts:33`; persisted `api/keys/route.ts:126`) — that holds roles, delegations, trust grants and denials, because the authority tables key on a **principal, not a user FK**. **Verified**, two routes each (entity + migration; type + consumer). **The "AI user tick" NOW HAS A UI (CC-26, DONE 2026-10-08)** — the create page (`api_keys/backend/api-keys/create/page.tsx`) carries an `isAiWorker` **checkbox** whose revealed notice is gated by `visibleWhen`, and `onSubmit` sets `payload.principalKind = 'ai_worker'` only when ticked, so an AI worker can be marked from the UI, not just by API/CLI. And an AI user cannot yet be **bound** to an agent — the actor and the code-declared agent are joined only by a caller-supplied string (**CC-27**, approved). *What must NOT unify:* the **agent** (tools/prompt/loop) stays code-declared — the registry (`agent-registry.ts`) reads an in-memory Map, never the DB, so a DB-only agent is invisible to `runAiAgent*` (measured); and machine subjects (`ai_worker:<id>`) cannot satisfy the six **uuid FKs to `users`** (already crashed once — `Migration20260813090000.ts:6-13`). Evidence: [`../../analysis/ANSWER-2026-10-08-organisational-questions.md`](../../analysis/ANSWER-2026-10-08-organisational-questions.md) §1, [`../../analysis/ai-users-vs-normal-users-2026-10-08/FINDINGS.md`](../../analysis/ai-users-vs-normal-users-2026-10-08/FINDINGS.md). · **★ Hermes:** the map §4.4 (c) — this is the *credential/identity* half of the agent half; every `AH-` item that needs an "AI user" hangs off it.

---

## F. THE MODEL LAYER — `ML-1`–`ML-4`

- ☐ **ML-1** — The deployment model record + hardware profile ("which model runs here, what fits?") *(OPEN)*
- ☐ **ML-2** — The growable model catalog: registered models as data, not code *(OPEN)*
- ☐ **ML-3** — The platform-driven model swap: update record, fetch file, restart the `model` service *(OPEN — a swap is a restart)*
- ☐ **ML-4** — Budgets and per-tenant quotas (admission block + pause; mid-run kill separate/best-effort) *(OPEN)*
- ☐ **Model** — llama.cpp as one preset entry in the control plane *(OPEN — no preset today)*
- ☐ **Model** — The `--jinja` flag on the model server (without it `llama-server` ignores `tools`) *(OPEN)*
- ☐ **Model** — The MCP service given `OPENAI_BASE_URL` *(OPEN — B-16)*
- ☐ **Model** — The embedding lane's missing seam (`openai-compatible` provider + real `EmbeddingProviderId`) *(OPEN)*
- ☐ **Model** — The embedding model choice (which GGUF + dimension — a data migration) *(OPEN)*
- ☐ **Model** — The Model Policy Layer (Mode A Hermes-managed · B policy-managed · C hybrid) *(DESIGN)*
- ☐ **Model** — Separate model capability from model identity; a capability declaration *(OPEN)*
- ☐ **Model** — Never silently change the model behind a deterministic Function *(OPEN)*
- ☐ **Model** — Escalation / router output: when to escalate to a bigger or cloud model *(DESIGN)*
- ☐ **Item 13** — Per-tenant model policy as destination; cloud-first as interim *(DONE — decided 2026-10-05)*

---

## G. THE GOVERNANCE & SECURITY FLOOR — `S1`–`S12` + the `G-`/`SD-`/`D` items

- ☐ **S1** — Every architectural change is gated and inspected before it is applied ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **S1a** — A gate exists for the create/structural paths *(carried — `S2`/`SD-1`'s gate is built; not re-verified as S1's own point)*
-   - ☐ **S1b** — Inspection coverage for **every** architectural change (not only create) *(LEFT)*
-     *(was PART)*
- ☑ **S2 (= SD-1)** — Every architectural change answers the permissions question: catalogue + fail-closed gate ▸ 6/7
-   - ☑ **S2a** — The permission catalogue: `shared/src/lib/permissions/catalogue.ts` — surfaces + the two blocks they yield (data + structural), populated from declarations and extended by runtime surfaces *(DONE 2026-10-08 — measured)*
-   - ☑ **S2b** — The pure fail-closed gate: `structure-change-gate.ts` + a `MutationGuard` hook on the entities `create` path *(DONE 2026-10-08 — measured)*
-   - ☑ **S2c** — The write: `auth/lib/permission-decision-grant.ts` applies the gate's `defaulted` records to the tenant's grant role's `role_acls.features_json` (idempotent set-union), wired in the guards' `afterSuccess` and carried `validate`→`afterSuccess` by the real runner; **run on every create path** — the batch definitions route, the shared primitive `ensureCustomFieldDefinitions`, the `add-field` CLI, the three HTTP reactivation routes (CC-22/CC-24), the entity-install primitive `upsertCustomEntity` (CC-21), and the three field write sites on a type change (CC-4) *(DONE 2026-10-08 — measured; 133 tests, 56 mutations RED-then-GREEN across twelve slices, nine hostile-critic passes)*
-   - ☑ **S2d** — The merge into `role_acls.features_json` is **atomic** (one SQL `UPDATE`, `jsonb ||` deduped, `returning` — no lost update under a race), proven against live Postgres *(DONE 2026-10-08 — CC-16, with a concurrent-session test + negative control)*
-   - ☑ **S2e** — A unique index on `(role_id, tenant_id)` to close the create-branch double-insert *(DONE 2026-10-09 — CC-23: `Migration20261009220000` adds `role_acls_role_id_tenant_id_unique` (plain unique — nothing soft-deletes a `role_acls` row, so the invariant is "exactly one per role per tenant"); the whole write is now ONE statement `INSERT … ON CONFLICT (role_id, tenant_id) DO UPDATE` (`permission-decision-grant.ts`), so a first grant and a later grant are the same atomic upsert — no read-modify-write window. Proven on live PG 17: applied via `mercato db migrate` (`auth: 1 migration applied`), the two-concurrent-insert race rejected with `duplicate key … "role_acls_role_id_tenant_id_unique"`, and a two-session interleave left EXACTLY ONE row with the union `["grant.B","grant.A"]`. `aclCreated` now read from the DB (`xmax = 0`); `added`/`alreadyPresent` computed in SQL from the pre-merge value. 6 mutations RED-then-GREEN (M2/M3 forced a test strengthening — the SQL-text pins were too weak), md5-verified restores; a separate-agent hostile-critic CONFIRMED all eight claims against live Postgres)*
-   - ☑ **S2f** — An authorised decision actor: the `decided` header names the actor but nothing checks them *(DONE 2026-10-09 — CC-25, code `d61d4f6`: new permission `entities.definitions.decide`; `assertActorMayStateDecision` reuses the platform's grant checks, S5 one engine; enforced at all five sites. Was carried as stale-open until re-measured this round — the register already recorded it DONE)*
-   - ☐ **S2g** — An enforcement consumer for a **field** surface's records (`<entityId>.<key>.view|manage|structure`) + the global-surface gap *(LEFT — CC-20, blocked on `G-04`: a per-field permission has no meaning until records can be governed at field granularity)*
-     *(was PARTIAL 2026-10-08 — the double-insert index (CC-23) and the decision actor (CC-25) are now BUILT; what genuinely remains is the field records' missing consumer, which is blocked on the data axis (`G-04`) — `CC-20`. The global-surface gap folds into `CC-20`. Plan `PLAN-SD-1.md`, limits §10)*
- ☐ **S3** — The platform tells the user when access is refused *(PARTIAL — RE-MEASURED 2026-10-11, row 27. **The "told" half EXISTS:** the dispatcher's refusal returns a localised message **plus the missing feature list** (`NextResponse.json({ error: t('api.errors.forbidden', 'Forbidden'), requiredFeatures }, { status: 403 })`, `apps/mercato/src/app/api/[...slug]/route.ts:249`); 401/404 carry messages too. **The "seal" half does NOT exist** — nothing marks an answer as reduced. Per the spec it is *"to be built with the data permissions work"*, i.e. it needs the **data axis (`G-04`)** to know WHAT was withheld. **So the remainder is BLOCKED on `G-04`** — not scheduled as a build. **The prerequisite, stated plainly:** the marker cannot name *what* was withheld until the platform can decide, record by record, *"may this actor read this row, for this purpose?"* — that is exactly what `G-04` builds. **Unblocked when `G-04` lands; nothing else is needed.**)*
- ☐ **S8** — The platform notices and suggests, and never acts without asking *(PARTIAL — RE-MEASURED + HALF-BUILT 2026-10-11, row 27. **The "asks" half EXISTS and is INERT:** `canOfferSaveAsFunction` (`request-outcome/gate.ts`) decides whether a Save may be offered — it has **no production caller** (the architecture says the Save button is separate; the button is frontend). **The "notices" half did NOT exist**; the spec names it as *"a per-user request history and a similarity signal"*. **BUILT 2026-10-11:** the **similarity signal** — `shared/src/lib/request-outcome/repeat.ts` (`normaliseRequestText` · `requestSimilarity` · `detectRepeatedRequest`; pure, zero imports; Jaccard; threshold 0.8 clamped). **Still open (`CC-66`), plainly:** **(2)** the **history read** — nothing feeds the signal your past requests; **startable NOW** (the prompts already sit in `ai_chat_messages`). **(3)** the **offer** — no screen asks you; **blocked on the frontend** (the Save button). **(4)** the second clause *"never acts without asking"* — only meaningful **after (2) and (3) exist**. **No box moves** — `S8` is a whole point and is not whole.)*
- ☐ **S4** — Data is the gate, not the screen ▸ 4/5
-   - ☑ **S4a** — The isolation model is confirmed by the owner: scope is tenant + org **in the app layer** — single DB, single schema, nullable `tenant_id`, no RLS, no per-tenant DDL *(DONE — owner-confirmed)*
-   - ☑ **S4b** — Cross-tenant defect (i): the batch `updated_at` read-back (`entities/api/records.ts`, GET) read by `entity_id IN (…)` with **no tenant filter**, merging another tenant's `updated_at` into this tenant's response — closed by scoping to `auth.tenantId` + the caller's org scope *(DONE 2026-10-08 — CC-28; the single-record sibling was measured NOT to be a live leak — it filtered on a globally-unique `gen_random_uuid()` PK)*
-   - ☑ **S4c** — Cross-tenant defect (ii): the record upsert's `on conflict (entity_type, entity_id, organization_id, tenant_id)` target matched **no constraint** (the only index was non-unique and omitted `tenant_id`), and a `try/catch` hid it — fixed with four global indexes (one plain unique on all four columns + three partial for the null-scope shapes), proven on live PG 17 *(DONE 2026-10-08 — CC-30: two tenants sharing an org id now produce 2 rows, a global-scope duplicate INSERT is rejected)*
-   - ☑ **S4d** — Cross-tenant defect (iii): the read classifier probed `custom_entities`/`custom_entities_storage` **without a tenant filter**, so one tenant's row routed another tenant's query to doc storage and returned zero rows — now tenant-scoped, cache key included *(DONE 2026-10-08 — CC-30)*
-   - ☐ **S4e** — An enforcement consumer for a custom **field**'s records + the remaining app-layer scope hardening *(LEFT — CC-20)*
-     *(was PART 2026-10-08 — the isolation model is owner-confirmed and three measured cross-tenant defects are closed; what remains is the field-records consumer (CC-20))*
- ☐ **S5** — One permission engine, never a second one ▸ 0/2 *(MEASURED 2026-10-11 (`CC-61`, LIST row 19) — **not ticked, deliberately**: the **matcher** IS single (`shared/src/lib/auth/featureMatch.ts` — `matchFeature`/`hasAllFeatures`, imported by 7 non-test files; the `ai-assistant` helper and `customerRbacService` both **delegate** to it), so **no second *engine*** — but there are **two RBAC *services*** (`core/auth/rbacService` for staff, `customer_accounts/customerRbacService` for the customer population), so `S5a`'s *"the single engine is the authority layer + the catalogue"* is **not** established (the authority layer and the matcher are distinct layers) and the service split needs a **stated justification** before this can be called one engine. Recorded, not rounded up.)*
-   - ☐ **S5a** — The single engine is the authority layer + the catalogue *(carried — see `S2`/`C4`; the 2026-10-11 measurement above is the evidence that this is **not** yet the case)*
-   - ☐ **S5b** — Proof that no second engine exists anywhere *(PARTIALLY measured 2026-10-11: **one matcher**, **two services** — the proof is now written down, but the split is unjustified)*
-     *(was PART)*
- ☐ **S6** — Every model a job uses is declared *(OPEN)*
- ☐ **S7** — Chat is a legitimate unclassified state *(DONE with G-21 — not re-verified this round)*
- ☑ **S9 (= SD-2)** — Core functions ship by default and cannot be deleted ▸ 5/6
-   - ☑ **S9a** — Enforced on **every** delete path (route + command + the `DataEngine.deleteOrmEntity` `refuse` hook), 409, actor-independent — for the one live surface, the built-in `superadmin` role (the roles-and-permissions manager) *(DONE 2026-10-09 — built after challenging the premise: "a flag on the function record" had no home, so the rule was built on the dictionary's named example)*
-   - ☑ **S9b** — The core marker is a **column**: `roles.is_core` migrated + applied + proven live; the rename path is guarded (Option B) *(DONE 2026-10-09 — CC-31(a) CLOSED)*
-   - ☑ **S9c** — The wider core set is a superadmin **SETTING**, not a hardcoded list: `module_configs` `core_boundary`/`coreObjectTiers` (a copy of the `SD-3`/§C.2b pattern — seed + strict parser + pure decision + fail-closed read; the rule + four tier names + parser stay Ring 1) *(DONE 2026-10-09 — built as `SD-2b`)*
-   - ☑ **S9d** — The measured hole closed: `isSystemEntitySelectable('auth:user'|'auth:role'|'directory:tenant'|'auth:session')` → `false` (before, only a 7-id list blocked full custom fields, and it omitted these) *(DONE 2026-10-09 — two hostile rounds: round 1 found a CRITICAL bypass on four paths, closed by one shared `reservedEntityRefusal`; round 2 found the junk-only hole, fixed by a substrate invariant; 10 mutations all RED)*
-   - ☑ **S9e** — The per-object manage screen over the core boundary *(DONE 2026-10-09 — `SD-5`, code `a2317b1`)*
-   - ☐ **S9f** — The `UserFunction` core flag (waits on the artifact gaining a delete path / persistence) *(LEFT — `G-09`, CC-32)*
-     *(was PARTIAL 2026-10-09 — built for the one live surface; the core set is a setting (`SD-2b`); what remains is the `UserFunction` core flag (CC-32), which waits on the artifact gaining a delete path. Evidence: `BACKLOG.md` SD-2/SD-2b, `PLAN-SD-2.md`, `PLAN-SD-2b.md`)
- ☐ **S10** — Every standard has a home in code, and drift is a defect ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **S10a** — The standards register exists as a document *(carried — `SPECIFICATIONS-DICTIONARY.md`)*
-   - ☐ **S10b** — Each standard has a **home in code** + a drift check *(LEFT)*
-     *(was PART)*
- ✅ **S11 (= SD-4)** — Structural permissions explicit, per object and per verb, inherited by default ▸ 5/5 *(DONE 2026-10-09 — Slices A/B/C + the enforcement wiring (CC-37) + the manage screen (SD-5) all built and proven; the `read`/`reference` enforcement (CC-34) and the approval intake (CC-38) are named, deferred edges, not sub-points of S11's own build — verify in `COMPLETION-CALLBACKS.md` §"SD-4 is COMPLETE")*
-   - ☑ **S11a** — Slice A — the structural guard: `entities.structural.core-object-guard` refuses a `delete`/`update` whose `entityId` is a reserved system surface, via the `SD-2b` predicate `isReservedSystemEntityType` (entity-id namespace — the route passes `auth:user`, not `users`) *(DONE 2026-10-09 — 17 tests, 3 mutations RED-then-GREEN; a hostile pass found a HIGH wildcard over-fire on record writes + a LOW namespace-pin gap, both fixed)*
-   - ☑ **S11b** — Slice B — the actor axis (S12) reaches the guard *(DONE 2026-10-09 — see `S12`)*
-   - ☑ **S11c** — Slice C — the per-verb grammar: `PERMISSION_BLOCK_VERBS.structural` is the **five S11 verbs** (`read`/`add`/`edit`/`remove`/`reference`), a surface yields 7 records; the level (per object × verb × actor, `straight`/`review`/`approval`/`never`) lives in `structural-settings.ts` (seed + strict parser + pure `resolveStructuralLevel` + the `actorTypeForPrincipal` bridge + fail-closed read) *(DONE 2026-10-09 — 5 mutations RED-then-GREEN, each restore md5-identical; the falsified `'structure'`-literal premise was corrected at source)*
-   - ☑ **S11d** — CC-37 — the grammar's enforcement wiring: the structural guard reads the level **live** and turns an explicit `review`/`approval` rule into the **escalate** outcome (D3, `{ok:true, escalation}`, 202) instead of the hard 422; `never`/`straight`/no-rule keep the 422 *(DONE 2026-10-09 — M16–M20 RED-then-GREEN; the trap avoided: `explicitStructuralLevel` read, not the fail-closed `resolveStructuralLevel` default, which would have weakened the absolute S9 refusal)*
-   - ☑ **S11e** — The manage screen over this grammar *(DONE 2026-10-09 — `SD-5`, code `a2317b1`: grouped by object, one Select per (verb × actor), "Inherited" clears a cell)*
-   - ☑ **S11f** — **Split out, not a build gap:** the original `S11f` bundled two items that are *not* S11 build slices but **named, deferred edges** — `read`/`reference` enforcement (**CC-34** — genuinely blocked: a `MutationGuard` only fires on writes, and no read-path enforcement point exists; measured: the only reader of the structural level is the write guard, `entities/data/guards.ts:777`) and the approval-layer intake (**CC-38** — genuinely blocked: the guard **defers** by design, carrying no `commandId`/`capabilityId`, so nothing files the `pending_acts` row). Both carry their trigger in `COMPLETION-CALLBACKS.md`; neither is a missing S11 slice.
-     *(was PARTIAL — the structural guard, the actor axis, the per-verb grammar, its enforcement wiring, and the manage screen are all BUILT 2026-10-09; what remains is `read`/`reference` enforcement (CC-34) and the approval-layer intake (CC-38). Plan `PLAN-SD-4.md`)*
- ✅ **S12** — The actor type is part of every structural decision ▸ 2/2 *(DONE 2026-10-09 — the actor kind reaches the guard (S12a) **and** the level is keyed per actor so the decision can differ (S12b, delivered by Slice C). The only honest limit — that a *default* rule does not vary by actor — is a configuration property, not missing code; a superadmin sets per-actor levels on the `SD-5` screen)*
-   - ☑ **S12a** — Slice B of `SD-4`: the actor kind (`PrincipalKind = 'human'|'ai_worker'|'service'|'system'`) reaches the guard input — an optional `actorKind` rides `MutationGuardInput`/`MutationGuardAfterInput`/`RouteMutationGuardAuth`, is threaded into both validate and `afterSuccess` inputs, and is set by the eight guard-input builders; resolved as `auth.principal?.kind ?? derivePrincipal(auth)?.kind` (importing from the un-mocked `auth/principal`), so a trusted-envelope AI context is still read as a machine *(DONE 2026-10-09 — 3 mutations RED-then-GREEN; a hostile pass caught a real regression on the trusted-envelope path, fixed + pinned by 3 derivation tests)*
-   - ☑ **S12b** — The axis changes the **decision**, not only the refusal reason (the per-actor grammar) *(DONE — delivered by S11 Slice C: the level is keyed by `actorTypeForPrincipal(actorKind)`, so a `human` and an `ai_worker` can hold **different** levels for the same (object, verb) and the guard decides on the actor's own level — `entities/data/guards.ts:777`, `structural-settings.ts`)*
-     *(DONE — Slice B plumbed the axis; Slice C keyed the level per actor, so the axis now changes the decision, not only the reason. Plan `PLAN-SD-4.md` §5)*
- ☑ **SD-5** — The structural-permission manage screen (the roles-style surface over S11) *(BUILT 2026-10-09, code `a2317b1` — grouped by object kind, one Select per (verb × actor) with the four levels plus a distinct **"Inherited"** choice that **clears** the cell; the pure data shape (grid / one-cell edit / equality) lives in `shared/src/lib/permissions/structural-settings.ts`, the route is `auth/api/structural-permissions` (GET fail-closed, PUT validates + passes the auth mutation-guard seam + writes `permissions`/`structuralPermissionLevels`), and the screen + page sit in `auth` (`components/StructuralPermissionsSettings.tsx`, `backend/settings/structural-permissions/`) gated `auth.acl.manage`. **68 tests** (49 shared + 11 route + 8 jsdom); `shared` 110 tests and `core` configs+auth+entities 140 suites / 1202 tests, 0 failures; both `tsc` exit 0; **6 mutations RED-then-GREEN (M21–M26)**, each restore md5-identical; a hostile-critic pass found **0 functional defects** (1 tautological test + 2 weaknesses, all fixed). **Honest limit:** the approval-layer intake (a `review`/`approval` rule producing a `pending_acts` row) is CC-38, unchanged here.)*
- ☐ **S-01** — The product-half spine item *(status carried in the plan)*
- ☑ **S-02** — Wire the resolver as the enforcement point (responsible-user intersection; fail closed or do not ship) *(DONE 2026-10-08, code `3add3a2` — `ai-assistant/lib/tool-authority.ts`; two hostile-critic passes found six defects, all fixed; plan `PLAN-S-02.md`)*
- ☐ **S-04** — Skills as a first-class product object *(OPEN — held; see AH-9)*
- ☐ **S-05** — The item AH-3 (durable wake queue) depends on *(OPEN)*
- ☐ **22** — Bulk approval with a diff; **the diff is the feature** *(OPEN)*
- ☐ **23** — Deputy cover and standing approvals *(OPEN)*
- ☐ **15b** — Budget as a ceiling, not just a meter *(OPEN)*
- ☐ **21c** — A lock control on each record's own screen *(OPEN — the largest, per-entity work)*
- ☐ **24b** — A screen for the two per-tenant authority settings *(OPEN)*
- ☐ **G-04** — The data-axis authorization layer ("may this actor read this row, for this purpose?") *(OPEN)*
- ☐ **G-05** — Classification metadata on entities and fields (personal/secret/regulated) *(OPEN)*
- ☐ **G-13** — Aggregation / inference controls *(OPEN)*
- ☐ **G-14** — Break-glass and separation of duties *(OPEN)*
- ☐ **G-15** — PostgreSQL Row-Level Security as the tenant-isolation backstop *(OPEN)*
- ☐ **G-16** — A security-event taxonomy (where denials/escalations/tool calls land) *(OPEN)*
- ☐ **G-18** — The scheduler enforcement gate (one scheduler owns business jobs) *(OPEN)*
- ☑ **D0** — The generated guard registry delivers guards *(DONE — fixed + mutation-proven)*
- ☑ **D1** — The tier mapping / defaults / fallbacks are a superadmin setting *(DONE — verified)*
- ☑ **SD-3** — The tier mapping is a setting, seeded, failing closed *(DONE — verified)*
- ☑ **D2-wide** — Retire the deprecated guard resolver — every enabled module *(DONE — 106 parked sites recorded)*
- ☑ **D2-gap** — Write routes that call no guard: 0 unguarded *(DONE — sweep complete, verified)*
- ☑ **D2-gap / GETs** — The write-performing-GET class *(DONE — 1 fixed, 2 set aside as read side-effects)*
- ☐ **SD-6** — The two read side-effect GETs: set aside or wire — to be revisited *(OPEN — recorded, owner-settled 2026-10-07)*
- ☑ **D3** — The `escalate` outcome on the guard result *(DONE — third outcome added, RED-then-GREEN proven across registry · wrapper · factory mutation proof; 36 consume sites widened; code `ba8a25c`; the 1 pre-existing core failure it exposed is now fixed too — code `9068f70`)*
- ☑ **GAP A / C5** — The Metadata Registry service *(DONE — the read-only service exists (2026-10-07, code `59ab859`): answers what exists · what type · provenance · what depends on it, and a typed absence for the other ten §54 questions; a live view, not a copy. The `Resource` envelope (C1) stays a Phase −1 contract. Consumption by `SD-1` is the next consumer, not yet wired)*
- ☐ **GAP B** — The true-core vs domain-pack boundary as a contract ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **GAP B.a** — The concept is written down (`CORE-BOUNDARY.md`) *(carried — a document, not a contract)*
-   - ☐ **GAP B.b** — It is expressed as an enforceable contract in code *(LEFT)*
-     *(was PART — `CORE-BOUNDARY.md` written; not yet a contract)*
- ☐ **GAP D** — Phase −1: twelve architecture contracts before all code *(OPEN)*

---

## H. THE EXPERIENCE CONTRACTS — localization, accessibility, screens

- ☐ **GAP C** — The localization contract: fallback chain, plural/interpolation, CLDR *(OPEN)*
- ☐ **GAP C** — RTL/LTR as a first-class layout concern *(OPEN)*
- ☐ **GAP C** — The accessibility baseline: WCAG 2.2 AA, declared and tested *(OPEN)*
- ☐ **GAP C** — The TZ rule: recurring schedules store the IANA zone, not an offset *(OPEN)*
- ☐ **GAP C** — The 11-dimension component test matrix (blueprint §88) as an automated check *(OPEN)*
- ☐ **P15 / M5** — Dashboard / perspective screens (tables+APIs exist, zero UI) *(OPEN)*
- ☐ **P13** — The i18n management surface *(OPEN)*
- ☐ **P7** — Notification templates: code-defined vs user-editable *(OPEN — needs the owner only if a template surface is wanted)*
- ☐ **P12** — API keys: complete the routes *(OPEN)*
- ☑ **P10** — Search gate coverage: extend `aclFeatures` to every searchable entity + the aggregate fail-closed rule *(DONE 2026-10-10 (`CC-46`, code `c03eca5c`) — had blocked the AI data work. Re-measured 2026-10-10: **6 `aclFeatures` across 53** searchable entities, ALL in `customers` (the "67" figure over-counted textual `entityId:` occurrences). **CLOSED 2026-10-10 by `CC-46`** — all 53 entities now declare `aclFeatures` (mapped to existing features, never invented) and a new coverage test fails the build when a searchable entity is added without one (the mechanical half of `BUILD-ORDER.md` item 17). **`P10b` → ☑**; row 15 stays 🟡 only for the human-CRUD-list leg → **`CC-47`**.)* **EXTENDED 2026-10-11 (`CC-52`, row 17):** the *searchable*-entity half was 53 of **233** tables; `CC-52` added `table-coverage.test.ts`, so now **every** table must be searchable, a read surface, or on the named `INTERNAL_TABLES` allowlist — a new table cannot be added un-gated. *(This **annotates** the already-`☑` line; it adds no new done unit — hence the ONE NUMBER is unchanged.)* **EXTENDED AGAIN 2026-10-11 (`CC-53`, row 18):** the AI **read** path (`packages/search/.../ai-tools.ts`) now applies the platform **classification column-mask** (the `CC-45` helper, recursing into nested values, fail-closed) to every record it returns, drops the index-time presenter for a classified entity, and refuses a classified `groupBy` — so the AI door is masked like the human export. *(This too **annotates** the already-`☑` line; no new unit — ONE NUMBER unchanged.)*
- ☐ **P17** — A jobs/scheduler UI *(OPEN)*
- ☐ **G-16b** — The ledger carries `policy_version`/`decision_id` *(OPEN)*
- ☐ **Register** — Every module with a `0` in any layer column is a "looks built, is not" candidate until proven *(standing rule)*

---

## I. THE BUSINESS / DOMAIN PACKS — `B1`–`B14` and the absences `M1`–`M5`

- ☐ **B1 CRM (`customers`)** — leads · contacts · pipeline *(DONE — most complete module; not re-verified this round)*
- ☐ **B2 Sales (`sales`)** — orders · quotes · invoices · returns · credit memos *(DONE — not re-verified this round)*
- ☐ **B3 Catalog (`catalog`)** — products · pricing *(DONE — not re-verified this round)*
- ☐ **B4 Inventory / WMS (`wms`)** — stock · warehouse *(DONE — light unit coverage)*
- ☐ **B5 Finance / accounting** — GL · journal · chart of accounts · AP/AR *(ABSENT — M1 · build-vs-integrate is the owner's)*
- ☐ **B6 Procurement / purchasing** — suppliers · POs · RFQ · goods-receipt *(ABSENT — M2 · needs M1's decision)*
- ☐ **B7 HR / people (`staff`)** — people · teams · leave · time; payroll absent ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **B7a** — People · teams · leave · time *(carried)*
-   - ☐ **B7b** — Payroll *(LEFT — absent)*
-     *(was PART)*
- ☐ **B8 Projects / PSA (`planner`)** — availability rules; no project accounting/billing ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **B8a** — Availability rules *(carried)*
-   - ☐ **B8b** — Project accounting / billing *(LEFT — absent)*
-     *(was PART)*
- ☐ **B9 BI / analytics (`query_index`, `dashboards`)** — engine yes, screens no ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **B9a** — The query/analytics engine *(carried)*
-   - ☐ **B9b** — The screens *(LEFT — screens absent)*
-     *(was PART — engine yes, screens no)*
- ☐ **B10 Shipping (`shipping_carriers`)** — webhook-driven, minimal UI ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **B10a** — The webhook-driven core *(carried)*
-   - ☐ **B10b** — A real UI *(LEFT — minimal UI)*
-     *(was PART — webhook-driven, minimal UI)*
- ☐ **B11 Payments (`payment_gateways`)** — gateway transactions + workers, minimal UI ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **B11a** — Gateway transactions + workers *(carried)*
-   - ☐ **B11b** — A real UI *(LEFT — minimal UI)*
-     *(was PART — gateway transactions + workers, minimal UI)*
- ☐ **B12 Currencies (`currencies`)** — FX *(DONE)*
- ☐ **B13 Email / messaging (`messages`, `inbox_ops`, `communication_channels`)** *(DONE)*
- ☐ **B14 Customer portal (`portal`, `customer_accounts`)** ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **B14a** — The portal surface *(carried)*
-   - ☐ **B14b** — Remove the duplicate: `customer_accounts` duplicates `auth` *(LEFT — `N-6` says remove)*
-     *(was PART — `customer_accounts` duplicates `auth`; N-6 says remove)*
- ☐ **M3** — The permissions catalogue (= SD-1) ▸ 4/5
-   - ☑ **M3a** — The catalogue service exists (`shared/src/lib/permissions/catalogue.ts`): permission surfaces + the two blocks each yields (data + structural) *(DONE 2026-10-08 — measured)*
-   - ☑ **M3b** — Consumed by a **write**: `auth/lib/permission-decision-grant.ts` applies its records to `role_acls.features_json` on every create path (entities create, the batch definitions route, `ensureCustomFieldDefinitions`, the HTTP reactivation routes (CC-22), the entity-install primitive `upsertCustomEntity` (CC-21), each field write site on a type change (CC-4)) *(DONE 2026-10-08 — measured)*
-   - ☑ **M3c** — The merge itself is atomic (no lost update) *(DONE 2026-10-08 — CC-16)*
-   - ☐ **M3d** — A **field** surface's records have an enforcement consumer (the live per-record features are `entities.records.<entityId>.{view,manage}`) *(LEFT — CC-20; for a custom entity the records *are* the live ones)*
-   - ☑ **M3e** — Persisted for **runtime** surfaces *(DONE 2026-10-09 — the durable row **exists and was written + read back on the live DB** (`permission_surfaces`, `Migration20261009205000` applied to `mercato-postgres-local`), persisted fail-soft from the gate/route/lib layers on every structure change, and wired into all 7 callers; **the READ side is now built too** — `readTenantSurfaces(em, tenantId)` (in `permissionSurfacesService.ts`) is the live consumer of `listPermissionSurfaces()`, answering from declared + this tenant's persisted rows, exposed at `GET /api/auth/permission-surfaces`. `CC-43` CLOSED. `CORRECTED (rule 13):` the old note said a durable row "waits on `G-04`" and that a migration "is unprovable on this host" — **both false**: `G-04` is the data-axis authorization layer (unrelated to storing surfaces), and a migration **is** provable here (this one was; `mercato-postgres-local` runs Postgres 17))*.
-     *(was PARTIAL 2026-10-08 — the catalogue exists and is consumed by a write with an atomic merge; runtime surface persistence is now **written** (durable row, live-proven) with its **read side** open (CC-43); the field-records consumer is CC-20. See `S2 (= SD-1)`)*
- ☑ **M4** — The generated guard registry (= D0) *(DONE)*
- ☐ **M5** — Dashboard / perspective screens (= P15) *(OPEN)*
- ☐ **N-6** — `customer_accounts` duplicates `auth` — an island to remove *(OPEN)*

---

## J. DEPLOYMENT & OPERATIONS

- ☐ **S0** — The local dockerised trio comes up whole *(DONE — 8 containers healthy; not re-verified this round)*
- ☐ **Deploy** — The Companai platform deployment (compose project, image, reverse proxy) *(DONE — documented in RUNBOOK)*
- ☐ **Deploy** — The running image predates the guard sweep — a redeploy ships the fixes *(OPEN)*
- ☐ **Hermes svc** — The `hermes` service needs a healthcheck *(OPEN)*
- ☐ **Blueprint App. B** — The twenty non-negotiable design rules adopted ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Blueprint App. B.a** — Most of the twenty rules are aligned *(carried)*
-   - ☐ **Blueprint App. B.b** — The remaining rules adopted (some GAPs) *(LEFT)*
-     *(was PART — most aligned, some GAPs)*
- ☐ **Observability** — Trace/context envelope crossing every execution boundary *(OPEN)*
- ☐ **Versioning** — API and event contracts versioned ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **Versioning.a** — Some API versioning exists *(carried)*
-   - ☐ **Versioning.b** — Event contracts versioned too *(LEFT)*
-     *(was PART)*
- ☐ **Item 20** — Deploy on a real Plesk VPS *(DEFERRED — owner said "not now")*
- ☐ **Item 25** — Ledger Tier 2, signed checkpoints *(DEFERRED — a customer's-auditor feature)*
- ☐ **Item 26** — `domain_mappings` extraction *(DEFERRED — nothing needs it)*
- ☐ **Item 27** — Dashboard widgets of our own *(DEFERRED — the start page is empty by design)*
- ☐ **Item 29** — The integration control plane *(DEFERRED — 220–380 person-weeks; post-hosting)*
- ☐ **Item 11** — Native Arabic review *(DEFERRED — before shipping `ar` as a supported locale)*
- ☐ **Item C** — A lawyer on the privacy/terms before commercial use *(OPEN — needs the owner)*

---

## K. WHAT THE DEVELOPMENT DOCUMENTS ADD BEYOND THE ABOVE (the "vision upgraded as we go" set)

- ☐ **N-1** — Each phase's named tests must be written when that phase starts *(OPEN)*
- ☐ **N-2** — The vocabulary register: four word-collisions (Capability, delegation, project, widget) *(OPEN)*
- ☐ **N-3** — `where_we_left.md` is stale *(OPEN — hygiene)*
- ☐ **N-4** — `workspace/PROGRESS.md` has three overlapping views that disagree *(OPEN — superseded by the backlog)*
- ☑ **N-5** — The `S-02` five missing inputs to the resolver are read but supplied by nothing *(RESOLVED for the request path 2026-10-08, code `3add3a2` — the tool door supplies them via `AuthorityEnforcementService.decideFor`, which already read all five; the command gate and HTTP RBAC supply them too. `policy_version`/`decision_id` remain a separate thread)*
- ☐ **N-7** — The `V`-register HOLDs each need a review before use *(OPEN)*
- ☐ **N-11** — The host cannot run the codebase natively (no Node 24 / yarn) — the container is the path *(recorded)*
- ☐ **N-16 / N-17 / N-18 / N-19** — the Paperclip-pass items *(OPEN — see §E)*
- ☐ **N-20** — One fact must have one canonical copy; two stale copies of one count is a defect *(the lesson behind this file — see §L)*
- ☐ **Paperclip** — The four "do not build" classes *(DECIDED AGAINST)*
- ☐ **Agent-half exclusions** — The 14 REJECT and 4 NOT-AN-ISSUE lessons *(DECIDED)*
- ☐ **V-04** — Adopt Hermes's ops console beside our UI? *(OPEN — needs the owner; Hermes stays headless)*
- ☐ **V-09 · V-10 · V-11 · V-12 · V-13 · S-04** — the 7 `V`-HOLDs, each with a trigger *(HELD)*

---

## L. THE VERIFICATION LEDGER — every `☑` names its evidence

**This is the truth-check ledger.** Rule 3 above: a claim in any other document is a **trigger to check**,
not a tick. When a doc claims a point is done, look here — if the point is not in the `☑` list below, **it
has not been verified in the code, and the claim is unconfirmed.**

### Verified `☑` — the code was read/run and it holds

| Point(s) | How it was verified | Result |
|---|---|---|
| `G-01` `G-08` | ran `packages/shared/src/lib/kernel` | **5 suites / 51 tests pass** |
| `G-02` `G-03` | ran `business-ir` + `user-function` (incl. the zero-AI `no-llm` test and the live smoke test) | **13 suites / 217 tests pass** |
| `G-07` `G-21` | ran `business-widget` + `request-outcome` | **10 suites / 130 tests pass** |
| `SD-3` `D1` | read the tier-mapping setting + its seed/fail-closed path (`tier-mapping`, seeded) | **verified — fails closed** |
| `G-17` | the live IR smoke test ran inside the `business-ir` suite | **pass** |
| `D0` `M4` | read `apps/mercato/.mercato/generated/guards.generated.ts` (**non-empty**: `entities`, 2 guards) + ran the registry test | **13 tests pass** |
| `D2-wide` | the tool reports `D` (deprecated) **= 0 for every enabled module** | **complete** |
| `D2-gap` | ran `node analysis/d2-gap/measure.js` (**256 write verbs, 0 unguarded**) + proof suites | **35 tests pass; 0 unguarded** |
| `D2-gap / GETs` | the same tool run reports **3 write-performing GETs, 0 unguarded, 2 set aside (read side-effects)** | **complete** |
| `S-02` `N-5` | ran the new tool-door suite (`tool-authority.s02.test.ts`) + the 5 confirm-path tests; **two hostile-critic passes**; **six mutations RED-then-GREEN**, each restore md5-verified | **ai-assistant 102 suites / 1434 tests; core auth 275; shared authority 114; typecheck 0** |
| `S2` `SD-1` `M3` | ran the permissions suites (catalogue 13, gate 19, guard 17, decision-header 28) + the write/mapping suites (19) + the batch slice (16) + the non-request slice (19) + the reactivation slice (9) + the entity-install slice (7) + the re-type slice (6) + the atomic-merge slice (1) + the batch-key slice (7); **nine hostile-critic passes + four mutation/premise-found defects (thirty-one defects, all fixed or named)**; **56 mutations RED-then-GREEN across twelve slices**, each restore md5-verified — **plus the atomic merge proven against live Postgres 17 with a concurrent-session test and a negative control** | **133 tests; `shared` 197 / 2329 (8 fail in the one suite of CC-19); `core` 627 / 5438, green six consecutive times; typecheck 0 — and the records ARE written on every create path, every reactivation path, the field re-type case, and a **stated (`decided`) decision**, with an atomic (no-lost-update) merge, the batch key validation restored, and the test harness now resetting the guard store before every test (CC-29) — but still **PARTIAL**: the create-branch double-insert (needs a migration — CC-23), the unauthorised decision actor (CC-25), the field records' missing enforcement consumer (CC-20), and the global-surface gap — each scheduled in `COMPLETION-CALLBACKS.md`** |
| `S2e` (`CC-23`) | added `auth/migrations/Migration20261009220000.ts` (unique index `role_acls_role_id_tenant_id_unique`); rewrote the write in `auth/lib/permission-decision-grant.ts` as ONE statement `INSERT … ON CONFLICT (role_id, tenant_id) DO UPDATE` (CTEs `pre`/`upsert`/`requested`; `(xmax = 0) as inserted`; `newly_added`/`already_present` computed from the pre-merge value); ran the migration + migration test + the auth lib suite; **applied the migration on live PG 17 via `mercato db migrate`** (`auth: 1 migration applied`, journal records `Migration20261009220000`, `\d role_acls` shows the unique index); **proved the race closed** (two concurrent plain inserts → `duplicate key value violates unique constraint "role_acls_role_id_tenant_id_unique"`; a two-session interleave of the new upsert → EXACTLY ONE row, union `["grant.B","grant.A"]`); **six mutations RED-then-GREEN** (M2 `xmax`→`true` and M3 `newly_added` read from post-merge forced a test strengthening — the SQL-text pins were too weak; both re-ran RED after); each restore **md5-verified**; **one hostile-critic pass as a SEPARATE agent** — CONFIRMED all eight claims against live Postgres, found the tenant-filter pin weak (now pinned by M5) and named the `added`-under-concurrency contract limit (now documented) | **auth lib suite 25/25; migration suite 2/2; `core` 639 suites / 5621 tests GREEN; `core` tsc 0 — the create-branch double-insert is closed by a DB-enforced invariant, not an app lock** |
| `G-22` (Slice 2A) | read the new primitive (`packages/shared/src/lib/state-machine/`: `types.ts` · `machine.ts` · `index.ts`) line by line; ran its suite; ran `tsc --noEmit -p tsconfig.json` on `shared`; **two hostile-critic passes as SEPARATE agents**; **8 md5-verified RED-then-GREEN mutations** (M1 undeclared-transition gate removed; M2 permission ignored; M3 precondition ignored; M4 events dropped; M5 perm/precond order swapped; M6 fail-closed reading removed; M7 reason forced empty; M8 string-emit dropped) — each restore **md5-identical** (`7bcd6f63…`) | **26 tests GREEN; `shared` tsc 0; full `shared` suite 204/204 suites · 2515/2515 tests pass with only the CC-19 suite excluded (8 pre-existing failures, proven not caused by this change). Round 1 of the critic found TWO REAL DEFECTS, both fixed and re-verified: (1) `readGate` read a gate returning `null`/`0`/`NaN`/`undefined` as ALLOW (silent allow — the exact `G-03` trap) — now **fail-closed** (only an explicit `true` allows); (2) an empty-string gate reason produced a refusal with `reason:''` — now the call sites use `reason \|\| fallback`, so every refusal carries a non-empty reason. Round 2 independently re-probed both (all of `null`/`undefined`/`0`/`NaN`/`''`/`false` now refuse; no branch can yield an empty reason) and confirmed both new tests are non-tautological. Slice 2A is a verified `✅`-quality unit; `G-22` stays `🟡` because the first caller (Slice 2B → `CC-42`) is unbuilt** |

**Whole-package run (the broad check).** The full `shared` package suite was run: **197 suites, 2329
tests** → **196 suites / 2321 tests pass**; the **1 failing suite / 8 tests** is a **host-level
process-creation failure, not a code defect** (`bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`).
**An earlier note here — that the sandbox's safe-delete shim intercepts the suite's `fs.rmSync` — was
WRONG and was re-diagnosed on 2026-10-08.** The measured facts: the failure is `spawnSync …\.toolchain\node24\node.exe
EBUSY` with `errno=-4082` (libuv maps Windows `ERROR_SHARING_VIOLATION` to `UV_EBUSY` — `CreateProcessW`
was refused, so no project code ran); the suite **passes 8/8 in isolation** but fails 8/8 under the full
run; **12 retries over 6.7 s all fail** (continuous, not transient — so a retry cannot fix it, and the
retry-based "fix" was reverted); it fails identically with the **sandbox disabled**; and at **HEAD,
byte-unmodified**, the full run gives the **same 8 failures**. Owned and recorded as a known
environmental failure (**CC-19**) with the trigger that closes it.
**Re-observed 2026-10-09 while verifying `G-22` Slice 2A:** the full `shared` run gave **205 suites / 2523
tests, 1 suite / 8 tests failing** — again exactly this suite and no other — and it **passed 8/8 in
isolation**, then the same run **with only this suite excluded was 204/204 suites · 2515/2515 tests
pass**. (In *this* session the injection point surfaced as the WorkBuddy sandbox's safe-delete shim
intercepting the suite's `fs.rmSync` — `SAFE_DELETE_BULK_CONFIRM_REQUIRED` — whereas the 2026-10-08
observation was `spawnSync … EBUSY`; **both are the same class: a host-level interception of a
sandbox/child-process operation, not project code**, which is why the trigger is a CI run.)

### Verified `☐` (checked this round, and confirmed NOT done)

| Point | Verified in code | Result |
|---|---|---|
| `P0-spec` | the spec is a **document**; there is no code artifact for it | **not a code point — demoted from `☑` to `☐` (a spec is not the build)** |
| `N-8` | re-measured 2026-10-11 (`CC-67`, code `6c3db27c`): **no production caller imports an engine module for the run path** — `api/chat/route.ts`, `api/ai/run-object/route.ts` and `lib/business-ir-author.ts` import the port / a `*PortAdapter` and call through it (the OpenCode adapter for the streaming engine; the new `agent-runtime-port-adapter` for the platform's own in-process runtime), proven by a static guard + a self-test. The **one** remaining direct engine call in production is `createOpenCodeClient` in the `answerQuestion` short-circuit (`CC-69`). | **FIRST HALF DONE** — every caller walks through the door; the tree-wide **proof** (`R28-5`) and the deletion remain |
| `B-05` | the port EXISTS and is USED by **every production caller** (`lib/ai-runtime-port.ts` + the two adapters), and the row's sentence *"no other code talks to it directly"* is now **mechanically proved** tree-wide by `R28-5` (`door-only-way-in.test.ts`: whole-package `.ts`+`.tsx` scan, 11 assertions, 12 mutations all RED) — with **two named, registered, non-run reaches** (`CC-69`, `CC-71`) pinned by the test | **✅ TICKED 2026-10-12** — the runtime boundary is one typed door, and nothing reaches an engine around it for a run |
| The Hermes port | the typed port is real and the chat route uses it; Hermes itself is **not** built (OpenCode is the implementation behind the door) | **PART — the port is built; Hermes (Phase 2+) is not; `N-8`'s deletion is not done** |
| Hermes id seam | `principal.ts` exports `aiWorkerSubject` / `derivePrincipal` / `PrincipalKind` | **seam is real (PART — not ticked)** |

### Verified in code this round — SECTION A (`C1`–`C11`), fact-checked line by line

Every line of §A was read against the source on 2026-10-07. **Result: 0 `DONE`, 8 `PARTIAL`, 4 `NOT DONE`.**

| Point | What the code shows | Verdict |
|---|---|---|
| `C1` Resource envelope | no `ResourceEnvelope`/`BaseEntity`/shared base type in `shared` or `core`; modules declare their own `tenantId`/`organizationId` columns | **NOT DONE** |
| `C2` Actor & context | `shared/src/lib/auth/principal.ts` (215 lines) — first-class `Principal`, 4 kinds, `onBehalfOfUserId`, machine predicates; wider context model absent | **PARTIAL** |
| `C3` Tenancy | `shared/src/lib/crud/factory.ts` auto-scopes by `tenantField` (default `'tenantId'`); **no** DB-level RLS policies found | **PARTIAL** |
| `C4` Authz engine | `shared/src/lib/authority/` (1312 lines) builds an explainable `Decision`, and it **is called in the request path** — the command gate, the HTTP RBAC path, and (since `S-02`, `3add3a2`) the AI tool door; the header quote this row used to carry was corrected in `decision.ts` on 2026-10-08 | **PARTIAL** — the *grammar* half (`SD-4`) is now **declared** (Slice C) and **enforced for the write verbs** (`add`/`edit`/`remove`) by **CC-37**; `read`/`reference` enforcement is CC-34 |
| `C5` Metadata registry | `shared/src/lib/kernel/model.ts` (407 lines) = a **view**; **the registry *service* now exists** (`kernel/metadata-registry.ts`, 2026-10-07) answering what-exists/type/provenance/dependents + typed absences. **Schema conventions half (C1) absent; not yet consumed** | **PARTIAL** |
| `C6` Command contract | `shared/src/lib/commands/` command bus is real (`command-bus.ts`, `types.ts`, `undo`/`redo`, interceptors, scopes); full contract not established | **PARTIAL** |
| `C7` Event envelope | `shared/src/lib/events/` = `patterns.ts` + test only; **no envelope type** | **NOT DONE** |
| `C8` Audit contract | `packages/core/src/modules/audit_logs/` real (API, undo/redo, export, mutation-guard, CLI); `actor_type`/trace not confirmed complete | **PARTIAL** |
| `C9` Migration contract | per-module `<module>/migrations` exist; grep for `planMigration`/`validateMigration`/`verifyMigration` = **nothing** | **NOT DONE** |
| `C10` Localization | `shared/src/lib/i18n/locale.ts` chain (`resolveLocaleFromCandidates`) + `number.ts`/`date/format.ts`; five-step chain + contracts incomplete | **PARTIAL** |
| `C11` Error model | `shared/src/lib/crud/errors.ts` = `{ error: message }` only; `field_errors`/`retryable` scattered, no canonical model | **NOT DONE** |
| Ring-1 enforcement | no test asserting the core; the C9 migration contract it depends on does not exist | **NOT DONE** |

> **Why this matters (owner's goal #2):** the old §A said C3 was *"DONE in code"*, C5/C11 were *"OPEN"*,
> and the rest *"PART"* — **all of it inherited from the document, none of it checked.** The check shows
> **C3 is PARTIAL, not DONE** (no DB-level isolation), and **C5 is PARTIAL, not OPEN** (the kernel view
> exists). The document was wrong in both directions; the code settles it.

### Carried — a doc claims `DONE`, the code was **not** re-verified this round (so: `☐`)

These are the points where a document says "done" and this file **refuses the tick** pending a code check.
**This is your truth-check list.** Tick each one only when its code has been read and it holds.

- The `CORE-MODULES-REGISTER.md` **COMPLETE** verdicts for `P1`–`P18` and `B1`–`B14` — the register's own
  rule stands: a module with a `0` in any layer column is a "looks built, is not" candidate until
  re-measured. **Carried as claims.**
- The **health-round figures** (2026-10-06/07) — the guard counts, the "thirteen modules", the
  `workflows 10/19` figure — **carried**: verified in the docs sweep, not re-run in code this round.
- `S0` (the docker stack) — not re-run this round; the docs report 8 containers healthy.
- Every `(DONE)` line in §A–§K whose box is `☐` — the docs claim done, the code is unchecked. A `(DONE)`
  in the text with a `☐` in front of it is **carried, not confirmed** by definition.

### How the numbers are derived (the `derive-counts` check — reproducible, not typed)

The PROGRESS table and the per-section counts are **computed from the boxes**, never typed by hand. The
rule, in one place:

1. Walk each section `A`–`K` (section `L` is this ledger — it holds no points).
2. A line starting `- ` is a **whole point** — count it once as a **unit** (it has no `▸`).
3. A line starting `- ` **with** a `▸ n/N` is a **split parent** — it counts as a **unit**, but its
   **ticks live on its children**, so it is **never counted as `done`** (count its sub-points for that).
4. A line starting `-   - ` is a **sub-point** — count it once as a **unit**.
5. `units = whole points + split parents + sub-points`. `done =` the whole points and sub-points carrying
   `☑` (a ticked split parent adds **no** `done` — its children carry it). `left = units − done`.
6. Coverage `% = done ÷ units`. Build-weighted `% = Σ(done×w) ÷ Σ(units×w)` with `w` the section's effort
   weight (the rubric table above).

**Re-run the check in this session (2026-10-10, `CC-46` completion; CORRECTED 2026-10-10 after a forensic
re-derivation, rule 13) gave:** A 10/31 · B **5**/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G **33**/74 ·
H **1**/13 · I 5/35 · J 0/18 · K **1**/13 · **TOTAL 72 / 321 = 22%** (build-weighted ≈23%).
**This corrected a line that read 73 / 330 — the headline had drifted, because it had been *typed* up one
step at a time instead of re-derived.** Three section figures were stale and are now fixed: **§B** was
counted as 37 units (it is **38**); **§H** was counted as 0 done (its `☑ P10 — Search gate coverage` line is
a real tick → **1/13**); **§K** was counted as **3/23** (it has **13** lines and **1** tick — `N-5` — because
the "23" had counted *ids named inside a single bullet*, e.g. `N-16/17/18/19` and `V-09…V-13/S-04`, as if
each were its own line, which the rule forbids: **a line is one unit**). Measured twice by two independent
routes (a local derivation script, and a separate blind hostile-critic agent): **both returned 72 / 321**.
The percentage is unchanged (72/321 = 22.4% → "22%"), so no downstream figure moves — only the two integers
were wrong. *Lesson banked: `N-20` — one fact must have one canonical copy, and the number must be
re-derived from the boxes every time, never incremented by hand.*

**Re-run again at the `CC-45` completion (2026-10-10): still A 10/31 · B 5/38 · C 14/28 · D 1/39 · E 2/18 ·
F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** — UNCHANGED, as expected:**
`CC-45` closed a callback that was *opened against* row 14 (already a counted unit), it did not tick a new
box, and `CC-48` is a new callout row, not a box. **Measured twice by two independent routes** (a local
derivation script, and a separate blind verifier agent that wrote its own script): **both returned 72 / 321.**
*Both routes hit the same trap on the way and it is worth recording:* a first naive parser returned **319**
(and the verifier's returned **364**) because each **missed or over-counted a line class** — mine skipped §G's
**two `- ✅` whole-point lines** (`S11` line 478, `S12` line 486) by only matching `☐`/`☑`, and the verifier's
counted the `-     *(was PARTIAL…)*` **annotation** lines as points. **The 321 figure holds; the near-miss was
in the measuring, not the file.** *(The concrete instruction for the next re-run: the marker set is
`☐`/`☑`/`✅` for whole points — `✅` appears exactly twice, both in §G — and the indent-only
`-     *(was …)*` lines are annotations, never units.)*

**Re-run again at the `CC-48` completion (2026-10-10): still A 10/31 · B 5/38 · C 14/28 · D 1/39 · E 2/18 ·
F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** — UNCHANGED, as expected:**
`CC-48` closed the callback opened by the `CC-45` critic (a **box** was never at stake — the leak is a
defect in an already-counted unit, not a new point), and `CC-49` is a **new callout row**, not a box.
**Re-derived by two independent routes** (the local derivation and a separate blind verifier agent) — both
returned **72 / 321**. *(This is the third consecutive re-run at 72 / 321; the figure has been stable since
the 2026-10-10 correction from a hand-typed 73 / 330.)*

**Re-run again at the `CC-49` completion (2026-10-10): still A 10/31 · B 5/38 · C 14/28 · D 1/39 · E 2/18 ·
F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** — UNCHANGED, as expected:**
`CC-49` closed the *same* callback family as `CC-45`/`CC-48` (the row-14 export leg) — a **defect in an
already-counted unit**, not a new box; row 14's 🟡→✅ is a status flip of a unit already counted as *done* in
this derivation, so the totals do not move. **Re-derived by two independent routes** (the local derivation
and a separate blind verifier agent) — both returned **72 / 321**. *(Fourth consecutive re-run. The figure
has been stable since the 2026-10-10 correction from a hand-typed 73 / 330.)*

**Re-run again at the `CC-47` completion (2026-10-10): still A 10/31 · B 5/38 · C 14/28 · D 1/39 · E 2/18 ·
F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** — UNCHANGED, as expected:**
`CC-47` flipped **row 15's scoreboard status 🟡 → ✅**, but row 15 maps to the appendix's **§B `P10`**, which
is a **split parent already `☑`** (`▸ 2/2`, both children `P10a`/`P10b` already `☑`) — so the *derived* units
and `done` counts do **not** move (a status flip of an already-counted unit, exactly the `CC-45`/`CC-48`/`CC-49`
case). **Derived by two routes:** (1) by walking the boxes — §B P10 contributes via its two already-☑ children
either way; (2) the file's own recorded figure, unchanged across **five** consecutive re-runs (72/321 since the
2026-10-10 correction from a hand-typed 73/330). **A naive re-parse in this session returned 72/364** — the
**done** count agreed (72) but the **unit** count was inflated by counting indent-continuation/annotation lines
as points, which the rule above forbids; the 321 figure (independently reproduced twice before) holds. *(Fifth
consecutive re-run at 72 / 321.)*

**Re-run again at the Row-16 Option-A own-leg build (2026-10-11): still A 10/31 · B 5/38 · C 14/28 · D 1/39 ·
E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** — UNCHANGED, as
expected:** Row 16 is a **🟡 partial**, so it was never a counted `done` unit — the build **closed the opt-in
own-leg callout `CC-50`** (a callback row, not a box) and left the team-leg deferred (`CC-51`, also a callout
row). Neither moves the derivation. **Derived by two routes:** (1) by walking the boxes — no `☐`/`☑`/`✅`
marker changed anywhere in §A–§K, so every section figure is byte-identical to the `CC-47` re-run above;
(2) the file's own recorded figure, now unchanged across **six** consecutive re-runs (72/321 since the
2026-10-10 correction from a hand-typed 73/330). *(Sixth consecutive re-run at 72 / 321.)* **Note for the
next re-run:** row 16 will only move the number when its **team-leg** (`CC-51`) lands and flips the row's
scoreboard status 🟡 → ✅ **and** the appendix box for the own/team scope point is ticked — a status flip
alone does not move it (the `CC-45`/`CC-47` case), a **new tick** does.

**Re-run again at the Row-17 every-table-coverage gate (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** Row 17 (`CC-52`) is a **coverage-gate build** — it adds a structural test that
forces every table to be read-gated or on a named `INTERNAL_TABLES` allowlist, and it closes no new
**vision point box** in §A–§K (it hardens rows 15/17, it does not tick a fresh point). **Derived by two
routes:** (1) by walking the boxes — no `☐`/`☑`/`✅` marker changed anywhere in §A–§K, so every section
figure is byte-identical to the Row-16 re-run above; (2) the file's own recorded figure, now unchanged
across **seven** consecutive re-runs (72/321 since the 2026-10-10 correction from a hand-typed 73/330).
*Route (1) this session is worth stating plainly:* my first two attempts mis-parsed — the first ordered
`-   - ` **after** `- ` (so the 69 sub-points in §A–§K were swallowed as whole points and the total read
364), and the second treated `☐` as a done marker (so `done` read 278). **Both traps are the ones the
§L text already names** — sub-points start with `- ` too, and `☐` is *not* a tick. Corrected, the local
derivation returned the exact section figures above, and a separate blind verifier agent (its own script,
written independently) returned the same 72 / 321. *(Seventh consecutive re-run at 72 / 321.)*
**Note for the next re-run:** row 17 will not move the number — it is a gate, not a vision point. The next
figure movement comes when a **🟡 row flips to ✅ and its appendix box is newly ticked** (row 16's team-leg
`CC-51`, or row 18), never from a status flip alone.

**Re-run again at the Row-18 AI-read-path-gates build (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** Row 18 (`CC-53`) wires the AI read path to the human column-/row-level gates and
**ticks a fresh LIST box** (row 18 `☐` → `✅`), but that box has **no appendix `☐`/`☑`/`✅` marker of its own**
in §A–§K (the AI read path is enforced by the same §B/§G points already counted), so the **derived** units and
`done` counts are byte-identical to the Row-17 re-run above. **Derived by two routes:** (1) by walking the
boxes — no `☐`/`☑`/`✅` marker changed anywhere in §A–§K; (2) the file's own recorded figure, now unchanged
across **eight** consecutive re-runs (72/321 since the 2026-10-10 correction from a hand-typed 73/330).
**The disagreement this session pinned a NEW trap, and it is the important one to bank:** a blind verifier
agent (its own script) returned **74 / 331** against my **72 / 321**, disagreeing on §K (**3/23** vs **1/13**).
The cause was **not** the file and **not** §K — it was that the verifier's section regex
`^##\s+([A-K])\.\s` **never matches `## L.`** (the letter `L` is outside `[A-K]`), so its parser left
`sec = 'K'` open and **kept counting every `- ` bullet in the ledger §L** (lines 634–862: the ledger's own
`### Verified ☑ …` sub-lists) as if they were §K points — exactly the "23" inflation the earlier note named.
Correcting the bound to `[A-L]` fixed §K to **1/13**, but the verifier's total then read **72 / 331** — the
**10-unit gap**, because §L (the ledger) was still being summed **as a point section**. **The rule is
explicit and is what both routes now enforce: §L holds no points — do not count it.** With §L excluded, the
independent route returns **72 / 321**, agreeing to the unit. *(Eighth consecutive re-run at 72 / 321.)*

**Re-run again at the CC-27 AI-user↔agent-binding build (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** `CC-27` **adds a NEW LIST row (22)** for the AI-user ↔ agent binding — but the
derivation walks **§A–§K only**, and the new row has **no appendix `☐`/`☑`/`✅` marker of its own** (agent
dispatch authorization is enforced by the §B/§G points already counted), so the derived units and `done`
counts are byte-identical to the Row-18 re-run above. **Derived by two routes:** (1) by walking the boxes —
no `☐`/`☑`/`✅` marker changed anywhere in §A–§K; (2) the file's own recorded figure, unchanged across
**nine** consecutive re-runs (72/321 since the 2026-10-10 correction from a hand-typed 73/330). *(Ninth
consecutive re-run at 72 / 321. Note: this entry confirms the rule that a **LIST** row is not a derivation
source — the LIST is the user scoreboard; the number comes from the appendix boxes alone.)*

**Re-run again at the CC-55 bound-scope-to-runtime build (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** `CC-55` is the **narrowing leg** of the **same** LIST row 22 (`CC-27`) — it adds
**no** new LIST row and **no** appendix `☐`/`☑`/`✅` marker, so §A–§K are byte-identical to the `CC-27`
re-run above. **Derived by two independent routes this session:** (1) a regex classifier (whole point `- ` /
sub-point `-   - ` / annotation `- {4,}` excluded) → **72 / 321**; (2) a blind character-level scanner
(counting spaces after the leading dash) → **72 / 321**. *Both routes hit the same trap on the first pass and
it is recorded for the next re-run: a whole point `- X` has **one** space after the dash (not zero), and the
`-     *(was …)*` lines are annotations — mis-classifying either inflates or deflates the unit count.
(Tenth consecutive re-run at 72 / 321.)*

**Re-run again at the CC-56 confirm-path binding re-check (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** `CC-56` is the **execution-side leg** of the **same** LIST row 22 — it adds **no**
new LIST row and **no** appendix `☐`/`☑`/`✅` marker, so §A–§K are byte-identical to the `CC-55` re-run above.
**Derived by two independent routes this session:** (1) a local regex classifier → **72 / 321**; (2) a blind
verifier agent that wrote its own script → **72 / 321**. *Both routes hit the same trap on the first pass and
it is recorded for the next re-run: a **split parent** (a `- ` line carrying `▸ n/N`) is **never counted as
done**, even when the parent line itself carries a `☑` — mis-counting it inflates `done` (the first pass
returned **78 / 321**; excluding split parents from `done` returned **72 / 321**).* (Eleventh consecutive
re-run at 72 / 321.)

**Re-run again at the CC-44 default-deny write gate (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** `CC-44` is a **build gate**, not a vision point — it adds **no** LIST row and **no**
appendix `☐`/`☑`/`✅` marker, so §A–§K are byte-identical to the `CC-56` re-run above. **Derived by two
independent routes this session:** (1) a local regex classifier (whole point `- ` / sub-point `-   - ` /
annotation `- {5,}` excluded) → **72 / 321**; (2) a **blind verifier agent** that wrote its own script — a
space-count classifier **and** a second method classifying by the prefix before the first box glyph — → **72 / 321**,
agreeing per-section. *(Twelfth consecutive re-run at 72 / 321.)*

**How the drift happened (recorded so it is not repeated).** For several sessions the headline was **typed
forward one step at a time** as rows closed (`68/329 → 70/329 → 71/330 → 72/330 → 73/330`), each session
bumping the *total* by hand instead of re-running this check. Because the totals were hand-edited, two
**section** figures that nobody re-opened stayed stale the whole time — `§H` (kept at 0 done even after its
`P10` line was ticked) and `§K` (kept at `3/23` even though §K has 13 lines and 1 tick), and `§B`'s unit
count was one short. The re-derivation above is the **first** time the boxes and the headline have been
reconciled since the drift began. The per-step *narrative* of earlier sessions (`row 13 → G +2`, `row 14 →
B +1`, `row 15 P10a → B +1`, `CC-46 P10b → B +1`) was individually real and is preserved in the JOURNAL's
dated blocks; what was never re-derived was the **sum**, and that is what went wrong. **Never quote a
number from this file that this check does not reproduce.**
**This replaced a typed line that read 64 / 319** (with D 2/39, I 4/35, K 1/13) — every one of those three
sections was already stale before this session's change (the same N-20 drift the previous re-run warned
about): the boxes had moved and the line had not been re-derived. This session's change alone is **G +2**
(`S2e` and `S2f` ticked: CC-23 built, CC-25 re-measured as already DONE), so `G 29/74 → 31/74` and the
total `66 → 68`. If you ever change a tick, re-run this — **the line is downstream of the boxes, never the
other way round.**

**Re-run again at the CC-57 in-process-dispatch-scope build (2026-10-11): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** `CC-57` is the **last named leg** of the **same** LIST row 22 (`CC-27`/`CC-55`/`CC-56`)
— it adds **no** new LIST row and **no** appendix `☐`/`☑`/`✅` marker, so §A–§K are byte-identical to the `CC-44`
re-run above. **Derived by two independent routes this session:** (1) a local Python classifier (whole point `- ` /
sub-point `-   - ` / annotation `- {5,}` excluded; split parents carrying `▸` never counted `done`) → **72 / 321**;
(2) a **blind verifier agent** that wrote its own scraper — one pass, section reset to `None` when `## L.` is
matched — → **72 / 321**, agreeing per-section. *All three traps the §L text already names were hit and corrected
on the way:* (i) the first pass returned **74 / 331** because the section regex `[A-K]` **never matched `## L.`**,
so §L's ledger bullets were summed into §K (`K 3/23`); widening the bound to `[A-L]` **and stopping** at L fixed
§K to **1/13** and the total to **72 / 321** — exactly the 10-unit §L-inflation the Row-18 note records. The rule
is: **§L holds no points — never count it.** (Thirteenth consecutive re-run at 72 / 321.)*

**Re-run again at the `B-WS` BRIDGE landing (2026-10-11, commit `33ca4a5`): still A 10/31 · B 5/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22%** —
UNCHANGED, as expected:** the bridge (`library/workspace-architecture/04-BRIDGE.md` + `WORKING-RULES.md`
**Rule 16**) binds a **design** workstream (`B-WS`) to this spine; it is **not a build**. This change touches
this file **only** in the **▶ FRONTIER** box (a new **DESIGN TRACK** row; a sentence on the NOW row) and in the
**Phase-9 header + LIST row 35** — **all of which are LIST-level, and a LIST row is NOT a derivation source**
(the rule the `CC-27` entry already recorded): it adds **no** `☐`/`☑`/`✅` marker anywhere in **§A–§K**, so every
section figure is byte-identical to the `CC-57` re-run above. **Row 35 deliberately stays `☐`** — a design is
never a build (BR-4), so nothing is ticked. **Also derived by two independent routes this session:** (1) walking
the boxes through §A–§K and stopping at `## L.` → **72 / 321**; (2) a second classifier that keys the section off
the **prefix before the first box glyph** → **72 / 321** (units agree per-section at 321; both routes returned
**72** done). *One trap hit on the way and re-banked: route 2's **first** pass returned **278 / 321** because it
counted **every boxed line as `done`** — but `done` is keyed on the **tick glyph** `☑`/`✅`, and most boxes are
`☐`. Fixing that one line (require `[☑✅]`) returned it to **72** — the same class of mistake the §L text already
names, and the reason the rule is **"key `done` on the tick, never on the presence of a box".** The file's own
recorded figure is now unchanged across **fourteen** consecutive re-runs (72/321 since the 2026-10-10 correction
from a hand-typed 73/330).*
*(Fourteenth consecutive re-run at 72 / 321.)* **Note for the next re-run:** the *first* `B-WS` batch that can
move the number is the one that produces a **built `CC-*`** item — e.g. row 35's Workspace/Widgets, when the
widget architecture stops being a design and lands as code. Until then `B-WS/Bn` progress is **invisible to this
number by construction**, and that is correct.

**Re-run again at the `CC-59` build (2026-10-11, the first supplementary-core-queue item): still A 10/31 · B 5/38 ·
C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 72 / 321 = 22% —
UNCHANGED, as expected:** `CC-59` is a **caller** (a wire that reaches the already-built chain), not a new
vision box — it ticks no `- ` line in §A–§K. **Re-derived by two independent routes:** (1) the local
`derive-counts` parse; (2) a **blind verifier agent** that wrote its own script — both returned **72 / 321**,
and the verifier independently reproduced the `## L.` boundary trap and the `-     *(was …)*` annotation
exclusion. *(Fifteenth consecutive re-run at 72 / 321.)*

**Re-run again at the `CC-61` build (2026-10-11, LIST row 19 — the uniform command contract): A **11**/31 ·
B 5/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 73 / 321 =
23% — MOVED (+1 done, §A).** `CC-61` ticked **`C6b`** (§A — the command contract now carries all **six**
facets: schema · permissions · side effects · **risk · approval · idempotency**), so exactly one `☐ → ☑` flipped:
**A 10/31 → 11/31**. **Re-derived by two independent routes** — a Node parse and a separate Python parse, both
returning **73 / 321**. *(Sixteenth consecutive re-run; the first movement since the 2026-10-10 correction from
a hand-typed 73/330 — and note the figure returns to 73, this time **derived**, not typed.)*

**Re-run again at the row-21/21b RE-MEASUREMENT (2026-10-11, Phase 6 audit): A 11/31 · B **7**/38 · C 14/28 ·
D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 75 / 321 = 23% — MOVED
(+2 done, §B).** The audit phase was recorded as `P4 ▸ 0/2 — *"no sub-part verified in code this round"*`; it was
**never verified**, and the phase is **built** (read API + viewer page + export + a hash-chained ledger +
retention). Corrected: **`P4a` and `P4b` ☐→☑** — two `☑` in §B: **B 5/38 → 7/38**. **Re-derived by two
independent routes** — a Node parse and a separate Python parse, both **75 / 321**. *(Seventeenth consecutive
re-run; the second movement since the 2026-10-10 correction.)*

**Re-run again at the row-28 / R28-2 build (2026-10-11, the OpenCode adapter behind the port): A 11/31 ·
B 7/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 75 / 321
= 23% — UNCHANGED, as expected:** R28-1 and R28-2 build the **door** (a typed port + the existing engine
fitted behind it, unmodified). They add **no** `☐`/`☑`/`✅` marker anywhere in §A–§K — `B-05`/`Port` are about
the door being **used**, and nothing walks through it yet (that is R28-3). §A–§K are byte-identical to the
row-21 re-run above. **Re-derived by two independent routes:** (1) the local `derive-counts` parse; (2) a
separate Python classifier keyed on the prefix before the first box glyph and stopping at `## L.` — both
returned **75 / 321**. *(Eighteenth consecutive re-run; the figure has been stable at 75/321 since the row-21
re-measurement.)* **Note for the next re-run:** **R28-3** (the chat route moved onto the door) is the change
that finally flips `B-05` — a **caller** moving behind the door is what makes the row's sentence true.
*(One trap hit on the way and re-banked: route 1's first pass returned **83 / 321** because it counted a
**split parent** line (a `- ` line carrying `▸ n/N`) as a tick when the parent happened to also carry a
`☑`. That double-counts: the parent's own box is never a derivable tick — its `n` sub-points are. Excluding
the `▸ n/N` parents restored the done-count to **75**, per-section identical to this ledger. The rule is the
same one the `CC-57` entry recorded: **a split parent is never counted as a point; count `done` on the tick
of a real box, never on the presence of a box glyph, and exclude the `▸ n/N` parent lines.**)*

**Re-run again at the row-28 / R28-3 build (2026-10-11, the chat route moved onto the door): A 11/31 ·
B 7/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 75 / 321
= 23% — UNCHANGED, and this one is worth stating plainly.** R28-3 is the exit gate: the **live chat route now
reaches the AI runtime through the port** (proven: no engine import on the run path, the pre-existing
behaviour tests pass unmodified, 15 new tests, 9 mutations, hostile critic's 4 defects fixed). But the row's
own sentence is *"**no other** code talks to it directly"* — and **two other callers still do**
(`CC-67`), plus the registered question bypass (`CC-69`). So `B-05`, `N-8` and the three `Port` boxes all keep
their `☐` **on purpose**: the door is now **used**, which is real, but a door used by one caller out of three
is not *"the agent runtime sits behind one typed door"*. §D's boxes were **re-worded** to say exactly what is
built and what is not (no tick changed). **Re-derived by two independent routes:** (1) the local
`derive-counts` parse; (2) a separate classifier keyed on the prefix before the first box glyph and stopping
at `## L.` — both **75 / 321**. *(Nineteenth consecutive re-run; stable at 75/321.)* **Note for the next
re-run:** **R28-4** (cancel/complete have a production caller) will flip the *third* `Port` box; **`CC-67`**
(moving the two remaining callers) is what flips `B-05` and `N-8` — the row's own sentence.

**Re-run again at the row-28 / R28-4 build (2026-10-11, the run closed at the door — cancel + complete):
A 11/31 · B 7/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 ·
**TOTAL 75 / 321 = 23% — UNCHANGED.** R28-4 gives the port's `cancelRun` and `completeRun` their **first
production caller** (measured before: none existed; the chat UI's Stop button only aborted the browser's own
socket and never reached the server). Now a client disconnect (Stop, or a closed tab → `req.signal`) cancels
the run, and every run is completed at the door exactly once, cancel-before-complete so a stopped run records
`cancelled` (proven: the mock boundary is the port, the call order is asserted, 8 new tests, 6 mutations,
a separate-agent hostile critic that found no real defect and whose one extra probe — "a run that never
streams is still closed" — was kept as a permanent test). **Why the number did not move:** the third `Port`
box (`failure is normal`) is now true **and used**, but it is kept `☐` with `Port` (a)/(b) — ticking one of
the three while the row's door is **still bypassed by two callers** (`CC-67`) and the question bypass
(`CC-69`) would repeat exactly the "one caller out of three" mistake. §D's `Port` boxes were **re-worded**
(no tick changed). **Re-derived by two independent routes:** (1) the local `derive-counts` parse; (2) a
separate classifier keyed on the prefix before the first box glyph and stopping at `## L.` — both **75 /
321**. *(Twentieth consecutive re-run; stable at 75/321.)* **Note for the next re-run:** the next build is
**`CC-67`** (move `runAiAgentText`/`runAiAgentObject` onto the door) — that is the change that flips **`B-05`**
and **`N-8`**; then **R28-5** (the "nothing bypasses" check).

**Re-run again at the row-28 / `CC-67` build (2026-10-11, the last three direct callers moved onto the door —
a second adapter for the platform's own in-process runtime):**
A 11/31 · B 7/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 ·
**TOTAL 75 / 321 = 23% — UNCHANGED.** `CC-67` adds a **second adapter** (`lib/agent-runtime-port-adapter.ts` —
`implements AiRuntimePort`, the honest counterpart to R28-2's OpenCode adapter) and moves the **three remaining
direct callers** (the chat route's AI-SDK text path, `api/ai/run-object/route.ts`, and the in-process
`lib/business-ir-author.ts`) onto it: they now **import no engine module** (statically pinned). The engine call
hands back the **original `Response`** whose body the browser consumes — so `streamRun` **stashes it and never
drains the body** (`responseForRun`; a `getReader` spy pins `readCount()===0`). **The one real defect a
separate-agent hostile critic found — the run was never CLOSED** (a first cut called `startRun` and never
`completeRun`, so a finished run could later be falsely reported `cancelled`) — was **fixed** (the route closes
in the stream wrapper's `finally` before `writer.close()`; an engine error completes `failed`; a **bodyless**
`Response` still closes — a second latent leak, also fixed). Proven: **117 suites / 1596 tests green**, the 27
pre-existing route tests pass **UNMODIFIED**, **8 RED-then-GREEN mutations all md5-restored**. **Why the number
did not move:** `B-05`, `N-8` and the three `Port` boxes keep `☐` on purpose — the row's sentence is *"**no
other** code talks to it directly"*, a claim about **the whole codebase**, and it becomes true only when
**proven**, which is **R28-5**. After `CC-67` no production file outside the two adapters names an engine,
**except** the package barrel `src/index.ts` (a re-export, not a caller) and the registered `CC-69` bypass.
**Re-derived by two independent routes:** (1) the local `derive-counts` parse; (2) a separate classifier keyed
on the prefix before the first box glyph and stopping at `## L.` — both **75 / 321**. *(Twenty-first consecutive
re-run; stable at 75/321.)* **Note for the next re-run:** the next build is **R28-5** (the "nothing bypasses the
door" check) — the **exit gate** for `B-05`/`N-8`; it will not move the number unless its proof is accepted as
the row's completion (a finding for the owner, not a silent tick).

**Re-run at the `R28-5` completion (2026-10-12):** A 10/31 · B 5/38 · C 14/28 · D 1/39 · E 2/18 · F 0/14 ·
G 33/74 · H 1/13 · I 5/35 · J 0/18 · K **2**/13 · **TOTAL 76 / 321 = 24%** — **the FIRST movement since
`CC-53` (73→75).** Exactly **one** box moved, and it is the honest one: **`B-05` `☐`→`☑`**. Why only one, when
R28-5 was described as the exit gate "for `B-05`/`N-8`" and "the three `Port` boxes": **because the other four
boxes have their OWN, separate blockers, re-read from their text (rule 9b, not assumed):**
- **`N-8`** keeps `☐` — R28-5 proves its *rewire* half, but its second half (*"then delete OpenCode"*) has **not
  happened**; that is `R28-6`. Its stated blocker was always two-part.
- **`Port` (typed port)** keeps `☐` — its blocker is `steerRun`/`resolveToolCall` **openly unsupported by both
  engines**; R28-5 does not touch that.
- **`Port` (envelope)** keeps `☐` — its blockers are `secretRefs` unpopulated and `CC-70` (grant carried-not-
  consumed); R28-5 does not touch either.
- **`Port` (failure normal)** keeps `☐` — its *own* blocker **was** R28-5 (now removed), but it is explicitly
  *kept with the other two `Port` boxes*, whose blockers remain; ticking one box of a three-part door while the
  other two are open would repeat the "one caller out of three" mistake.
Only **`B-05`**'s stated blocker was *exactly and solely* "prove the door is the only way in", and that is now
proven — so it is the only tick. **The two non-run reaches do not block it** (`CC-69` chat `answerQuestion`,
`CC-71` health endpoint): both are named, pinned by the test, and registered with callbacks, and neither is a
*run*. **Re-derived by two independent routes:** (1) the local `derive-counts` parse (walk §A–§K, stop at
`## L.`, count `- ` whole points + `-   - ` sub-points, `done` keyed on `☑`); (2) a separate classifier keyed
on the prefix before the first box glyph — **both returned 76 / 321**. *(Twenty-second consecutive re-run; the
first **movement** since `CC-53`, which took 73→75.)* **Note for the next re-run:** **`R28-6` (delete OpenCode)
was MEASURED 2026-10-12 and found TRIGGER-BLOCKED** — Hermes does not exist (`git ls-files | grep -i hermes` →
empty), so the deletion would remove the **only** engine that answers a chat; registered as **`CC-72`**, trigger
= Hermes wired behind the door (architecture §9 Phase 2+). **It is not a buildable task, so it moves no box;**
`N-8`'s deleted half and the `steerRun`/`resolveToolCall` question stay `☐` until Hermes lands. The
`CC-69`/`CC-71` shape question was **RULED 2026-10-12** (owner-delegated): both accepted as deliberate, permanent,
named exceptions — **option (b)**; the port is **not** widened now (the engine behind the door is a placeholder
`R28-6` deletes); **revisit when Hermes lands**.

**Re-run at the Hermes `Phase 0` (pin & map) completion (2026-10-12):** A 11/31 · B 7/38 · C 14/28 · D **4**/39 ·
E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13 · **TOTAL 78 / 321 = 24%** — **+2, from ticking the
two `Phase 0` boxes in §D** (`☐`→`☑` ×2: the source digest + harness, and the licence position). This is the
**Hermes track's first movement** (§9 Phase 0). **A finding about the record itself, corrected here (rule 13):**
the 22nd re-run (above) wrote the per-section figures as *"A 10 · B 5 · D 1 · K 2"*; the **true** pre-tick
breakdown — re-derived this round, both routes — was **A 11 · B 7 · D 2 · K 1**. The **total was right (76)**,
but **four section figures had drifted** and offset each other, so the headline never looked wrong. The breakdown
below is the re-derived one and supersedes the 22nd run's per-section numbers. **Re-derived by two independent
routes:** (1) the local `derive-counts` parse (`library/development/.derive_platform_points.py`); (2) a separate
blind verifier agent's own from-scratch script — **both returned 78 / 321** (per-section identical). *(Twenty-third
consecutive re-run; the second **movement** since `CC-53`, which took 73→75.)* **Note for the next re-run:** the
next Hermes work is **§9 Phase 1** — already achieved (the port with OpenCode behind it) — so **Phase 2** (one
Hermes worker, one tenant, one tool) is the frontier; it needs **Hermes wired behind the door**, which is what
unblocks `R28-6` / `CC-72`.

**RE-PIN (2026-10-12, later the same day) — the count is UNCHANGED.** The Hermes pin moved from
`library/ai/hermes-agent-main/` (`eb044063…`, 17,201 files) to the root `hermes-agent-main/` (`3569e846…`, 18,248
files), because the owner supplied a newer copy measured **3,290 commits ahead**. The two `Phase 0` boxes were
already ticked and **stay ticked** — the re-pin changed *which snapshot they point at*, not *whether they are
done*; the harness, `HERMES-PIN.md`, and both boxes' wording were updated in the same change so the tick still
means what it says. **78 / 321 = 24% stands.** (Twenty-fourth consecutive re-run; **no movement** — correctly so.)

**(2026-10-12, Hermes §9 Phase 2) — `P2-1` + `P2-2` discharged, and the count is UNCHANGED at 78 / 321.**
Nothing in Phase 2's first two sub-rows ticks a box: `P2-2` built the stdio gateway client (a library layer)
and `P2-1` booted the pinned worker in Docker — both prerequisites for the `Port` boxes, neither a box.
**Two independent routes agree (25th consecutive re-run):** (1) `library/development/.derive_platform_points.py`
walks §A–§K and returns **78**; (2) a from-scratch parse keyed on the box glyph after a `- ` unit, skipping
§L and any `▸ n/N` split parent, also returns **78 / 321**. The frontier text above now reads
**`NEXT = P2-3`** (the port adapter), and no box may be ticked while its §D `Port` siblings are open.

**(2026-10-12, Hermes §9 Phase 2, third round) — `P2-3` discharged, and the count is UNCHANGED at 78 / 321.**
Nothing in the port adapter ticks a box: it maps the door's eight operations onto the measured wire (the
prerequisite for the `Port` boxes), it is not a box itself, and §D's `Port` parent still has open siblings
(`resolveToolCall` unsupported until `P2-4`; `secretRefs` unpopulated + `CC-70`) — the "one caller out of
three" / never-tick-while-siblings-open rule applies verbatim. **Two independent routes agree (26th consecutive
re-run):** (1) `library/development/.derive_platform_points.py` walks §A–§K and returns **78** (§A 11/31 · B 7/38
· C 14/28 · D 4/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 · J 0/18 · K 1/13); (2) a from-scratch parse
keyed on the box glyph after a `- ` unit, skipping §L and any `▸ n/N` split parent, also returns **78 / 321**.
The frontier text above now reads **frontier = `P2-4`** (the one narrow tool through `resolveToolCall`).

**(2026-10-13, Hermes §9 Phase 2, fourth round) — `P2-4` and `P2-5` discharged; the count is UNCHANGED at 78 / 321.**
`P2-4` (the tool door opens) was recorded in the frontier cell at the time but — a gap corrected here — **not as a
§L log entry**; both are recorded together so the log stays continuous. Nothing in either sub-row ticks a box:
`P2-4` made the door's `resolveToolCall` real (the prerequisite for the `Port` box's `resolveToolCall` sibling) and
`P2-5` made the engine **selectable** (the prerequisite for swapping OpenCode for Hermes) — neither *is* a box, and
§D's `Port` parent still has open siblings, so the "never tick while siblings are open" rule applies verbatim.
**Two independent routes agree (28th consecutive re-run):** (1) `library/development/.derive_platform_points.py`
walks §A–§K and returns **78** (§A 11/31 · B 7/38 · C 14/28 · D 4/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 ·
J 0/18 · K 1/13); (2) a from-scratch parse keyed on the box glyph after a `- ` unit, skipping §L and any `▸ n/N`
split parent, also returns **78 / 321**. The frontier text above now reads **NEXT = `P2-6`** (the exit-gate proof:
cancellation · retry idempotency · usage capture · bounded memory/CPU · no cross-scope access) — the gate that lets
`P2-5`'s **owned default-flip + OpenCode deletion** (`R28-6`/`N-8`, `CC-76` first) run, and the trigger that retires
the old `hermes-local` service (`CC-74`).

**(2026-10-13, Hermes §9 Phase 2, fifth round) — `P2-6` discharged, and the count is UNCHANGED at 78 / 321.**
The exit gate is green: the five properties (cancellation · retry idempotency · usage capture · bounded
memory/CPU · no cross-scope access) are measured on one tenant and then on **two adversarial** ones. Nothing
in `P2-6` ticks a box — it is a **proof row** that also builds the two missing bounds (`lib/ai-runtime-bounds.ts`,
shared by the engines; **`CC-76` fixed**), and §D's `Port` parent still has open siblings (`secretRefs`
unpopulated + `CC-70`), so the "never tick while siblings are open" rule applies verbatim.
**Two independent routes agree (29th consecutive re-run):** (1) `library/development/.derive_platform_points.py`
walks §A–§K and returns **78** (§A 11/31 · B 7/38 · C 14/28 · D 4/39 · E 2/18 · F 0/14 · G 33/74 · H 1/13 · I 5/35 ·
J 0/18 · K 1/13); (2) a from-scratch parse keyed on the box glyph after a `- ` unit, skipping §L and any `▸ n/N`
split parent, also returns **78 / 321**. The frontier text above now reads **▶ NEXT = the step `P2-5`/`P2-6`
jointly own — flip the default to Hermes and delete OpenCode in ONE change** (`R28-6`/`N-8`, `CC-76` now fixed),
which also discharges `CC-74`.

### Documentation & tool defects found this round (and fixed)

- **TWO ticks rested on documents, not code — demoted `☑` → `☐`** (the rule applied to this file itself):
  **`P0-spec`** (its "evidence" was *the spec document exists* — a spec is not the build) and **`B-05`**
  (its "evidence" was *the docs record the decision* — but no Hermes port exists in the code; OpenCode
  still occupies the slot). **A decision or a spec recorded in a document is a claim, not a tick.**
- **`D2-gap / GETs` had NO evidence row** while carrying a `☑` — "no evidence, no tick" was violated.
  **FIXED**: it now names its tool evidence (3 write-performing GETs, 0 unguarded, 2 set aside).
- **The Hermes service map carried a STALE `D2-gap` figure** ("50 unguarded" in two live places) — the
  tool reads 0. **FIXED** this round.
- **`STATE-OF-PLAY-2026-10-07.md` §4 carried a SECOND stale copy** ("41 unguarded") — the tool reads 0.
  **FIXED** this round. *(Two documents, two stale copies of one count — the **N-20** lesson.)*
- **The `D2-gap` tool could not resolve app-local modules** (`from: '@app'`), so "all 35 enabled modules"
  actually covered 34. **FIXED**: it now searches the app-local dir and reports `ratelimit_probe` as
  **out of scope** (test-only, writes nothing), so 256 and "all 35" are both true.
- **`previous_thread.md`** — named as untracked in `STATE-OF-PLAY` §4; it no longer exists (superseded by
  this file). **FIXED** (Finding 3 now closed).

---

*If this file disagrees with the code, the code wins and this file is broken — fix it.*
