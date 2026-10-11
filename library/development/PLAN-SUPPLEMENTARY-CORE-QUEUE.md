# PLAN — the supplementary core queue (every open register item, staged — core only)

**What this file is.** The named `CC-` build queue reached its end on 2026-10-11 (row 22's last named leg,
`CC-57`). But the register — [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md) — still holds **open items**:
work that is built-in-part and carries a **named trigger**, not work that is unstarted. A trigger-gated item is
only honest if the trigger is **scheduled where the next agent will read it** (the owner's rule 8, and
[`WORKING-RULES.md`](WORKING-RULES.md) §1). This plan is that schedule for the **core** half.

**Why it exists (the owner's instruction, 2026-10-11, verbatim).**
> *"create a suplimentery implimentation plan that goes thru all the mentioned and any items in the
> COMPLETION-CALLBACKS.md as long as he auplimentery implimentation plan focus on the core and not n business
> modles."*

So this plan: **(1)** goes through **every** open item in the register; **(2)** keeps its focus on the **core**
(kernel, AI foundation, security kernel, schema engine, ops) and **excludes business modules**.

**Scope discipline (measured, not asserted).** The register holds **25** open rows as of 2026-10-11 (derived,
not typed — the last row per id, non-`✅`): `CC-6`, `CC-7`, `CC-8`, `CC-9`, `CC-10`, `CC-11`, `CC-12`,
`CC-13`, `CC-14`, `CC-15`, `CC-19`, `CC-20`, `CC-32`, `CC-33`, `CC-34`, `CC-35`, `CC-36`, `CC-38`, `CC-39`,
`CC-41`, `CC-42`, `CC-51`, `CC-54`, `CC-58`, `CC-59`. Of these, **one is business** (`CC-42` — its first caller is the
`customers` deal pipeline, paused as business work) and is **excluded here**; the remaining **24 are core** and
appear below. (`CC-58` + `CC-59` were both added 2026-10-11 — `CC-58` from `NY-24`, `CC-59` from the measurement
that answered the owner's Stage-B question; `CC-43` and `CC-46` were missing register rows, added the same day —
both DONE, so neither adds to the open count.)

**How to use it.** Each item carries: **what it is** (plain words), **why it is open** (the gap), **its named
trigger** (copied from the register — the register owns the truth), **its prerequisite**, and **what to do when
the trigger fires**. Nothing here overrides the register; where they disagree, the register wins and this file
is stale.

Written 2026-10-11 as a **plan** (rule 10c), not a build. No code is claimed.

---

## §S1 — `CC-58` + `CC-59`: the Business-IR wire's first caller (staged A → C → B) and its **unwired compile half** — **NEW, adopted from `NY-24`**

**What it is.** `authorBusinessQueryIr` (`packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-author.ts`)
turns a plain-language request into the platform's structured **Business IR**. It is written, tested, and — since
`CC-57` — **fails closed** (`agent_not_bound`) and threads `computeBoundRunScope` **before** it asks the model.
**But nothing in the running product calls it**; its only reader is its unit test. It is a **wired circuit with no
switch on the panel**.

**Why it is open.** The wire belongs to the **AI foundation**; its natural consumer — a screen where a person
types a business question — belongs to the **business half**, which the owner's 2026-10-09 ruling deferred until
the policy kernel is finished. So the wire was built when its task (`G-17`) asked for it; its consumer has not
been reached. It is **not a hole** (an unreachable path cannot be exploited); the risks are **rot** (a signature
never exercised by a real caller) and a **false "done"** (an unreachable item mistaken for a working feature).

**The owner's decision (2026-10-11, `NY-24`): adopt the staged introduction — A now → C next → B later — on the
condition that each stage is scheduled in the live docs.** This section, and register rows `CC-58` (the head) + `CC-59` (the compile half), are that
schedule.

| Stage | What it means | Named trigger | Prerequisite | What to do when it fires |
|---|---|---|---|---|
| **A** *(adopted NOW — active)* | Leave it pinned, unreachable. The coverage gate (`binding-coverage.test.ts`, `IN_PROCESS_DISPATCH_SITES` **empty**, held by a positive pin) keeps it honest. Nothing is spent. | n/a — in force now. | none — `CC-57` landed the fail-closed + scope threading. | Nothing to build; keep the gate green. Do **not** remove the helper. |
| **C** *(next)* | Register it as a **chat tool** so the **existing** AI chat path can ask it to author an IR — live **without** a new screen, staying inside the AI foundation, under the same binding. | **When the AI tool surface is next touched.** | none — the chat dispatch path and the binding are already wired (`CC-27`/`CC-55`/`CC-57`). | Add one tool registration that calls `authorBusinessQueryIr` with an `AuthContext` + `EntityManager`; add a test proving the binding is consulted; re-run the coverage gate. Size: **bounded** (one registration + tests). |
| **B** *(later)* | Wire the full **business screen** — a person types a business question on a real screen and gets a compiled answer. | **When business work resumes** (the owner's ruling lifts). | the owner's ruling lifting (business half un-paused). | One route + one screen, reusing the `CC-57`-hardened helper. Size: **one route + one screen**. |



**Measured 2026-10-11 (rule 0b) — the pipeline has TWO unwired halves, not one.** The Business-IR path is **five built, tested layers**: `schema.ts` (the IR's shape) → `authorBusinessQueryIr` (the model produces an IR; binding-gated by `CC-57`) → `bind.ts` (parameter binding) → `compile.ts` (`compileQuery` — the IR is validated against the business model) → `recompile.ts` + `user-function/run.ts` (run a saved Function). **All five exist and carry tests** (the `business-ir` suite alone has **78** assertions, including a live-model smoke test that Qwen2.5-7B produced a schema-valid IR for six different requests). **But NO route, screen, or tool reaches any of them:** `grep` for a production caller of `authorBusinessQueryIr` → only its own definition; `compileQuery`'s only callers are `recompile.ts` and `user-function/run.ts` **inside the same library**; `runUserFunction` has **no external caller**; and **no `api/**/route.ts` anywhere mentions `BusinessQueryIR`, `authorBusinessQueryIr`, or `compileQuery`**. **So the wire is inert along its whole length — not just at its head.**

**What that changes about the stages (honest size).** **Stage C** — *“register the authoring helper as a chat tool”* — wires only the **head** of the pipeline: a chat tool that authors an IR returns the IR, but nothing **compiles** it, so the answer is still a typed object, not a result. Wiring the head is still the smallest real step (it exercises the `CC-57` binding end-to-end against a live caller), and it is exactly what `NY-24` adopted — but it must be stated as *“the head goes live”*, **not** *“the Business IR capability goes live”*. **Stage B** — the full business screen — therefore carries **more than “one route + one screen”**: it must also wire the **compile** half (`compileQuery` + the read path that executes the compiled query), because a screen that shows a person a compiled answer is the **only** thing that exercises layers 3–5. That extra wiring is **core work** (a shared-library capability + a read path), **not** business-module work — so it belongs in **this** (core) plan, and it is why Stage B is the honest destination and Stage C only the first switch.

**Cross-ref:** [`NEEDS-YOU.md`](NEEDS-YOU.md) `NY-24`; `PLAN-CC-57-in-process-dispatch-scope.md`.

---

## §S2 — the **data-axis** cluster: everything gated on the data-axis layer (`G-04` / `G-09`)

**Why grouped.** Four open items share **one** prerequisite — the data-axis layer and its migration story. They
are **not** independently startable; they all **land together** when that layer does. Building any one alone
would be "enforcement the data axis has not defined" (the register's own words for `CC-20`).

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-6`** | The **row-level** rule of the data axis (`entities.records.<id>.view\|manage` records exist; the row-level rule is not built). | It is **not** `SD-1`'s rule to make — the data-axis layer owns it. | **When `G-04` lands.** | Ensure the data-block records carry the row-level rule; re-run the `SD-1` gate tests against the new shape. |
| **`CC-7`** | The permission **catalogue is in-process** for *recorded* (runtime) surfaces — a recorded custom field or saved Function lives for the process, not in a durable row. | A migration was once thought **unprovable** on this host — **retracted 2026-10-09** (the premise was FALSE). It can be built now; sequencing (one migration with `G-04`, not two) still stands. | **The next `G-04`/`G-09` migration.** | Write the catalogue row in the same migration; verify the row exists in the DB and survives a process restart. |
| **`CC-13`** | `G-21` — the schema-mutation **IR kind**, a **UI**, and a **database row** are not built (the taxonomy, pure triage and Save gate **are** done). | Waits on its own follow-up IR kind; the DB row waits on the same migration story as `CC-7`. | **When the schema-mutation IR kind exists.** | Define the kind → wire the UI → let the DB row ride the `G-04`/`G-09` migration. |
| **`CC-20`** | A custom **field**'s permission records have **no enforcement consumer** — granted on write, but nothing reads them. | A per-field permission has no meaning until records can be governed at **field** granularity; building a check now is enforcement the data axis has not defined. | **When `G-04` lands.** | Make the field surface's enforcement prefix equal the one the catalogue grants under; add a live per-field check. Until then: *declared, granted, inert* (stated in `PLAN-SD-1.md` §10). |
| **`CC-32`** | The `UserFunction` core flag the item named **does not exist** — because a saved Function has **no persistence and no delete path** to guard. | The rule was built on the one live surface that *does* exist; the Function row is a `G-09`-era artefact. | **When `G-09` gives a saved Function a durable row and a delete path.** | Then the same three layers bite (route / command / store hook) — apply them to the Function delete path. |

**Prerequisite (shared):** the **data-axis layer** (`G-04`) and the **durable-row migration story** (`G-09`).

---

## §S3 — the **structural-guard** cluster: the entities/structure guard's named edges

**Why grouped.** These are all **edges of the structural guard** (`entities.structural.core-object-guard` and the
`entities` write path). They are **harmless today** (each is a named fragility, not a live hole) and each becomes
real only when a **specific new writer, path, or reader** appears. Building any before its trigger is *plumbing
with no reader* — the anti-pattern row 1 already names.

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-33`** | The guard sees **row-level writes, not raw DDL** — a raw `DROP TABLE` / `ALTER … TYPE` / FK change is invisible to it (the platform's own schema changes go through **migrations**). | No **migration-time / DDL-time** check path exists. | **When a migration-time / DDL-time check path exists.** | Run `resolveCoreTier` / `isReservedSystemEntityType` over the tables a migration touches; refuse a `DROP`/re-type/FK change on a `core`/`platform_release` object. |
| **`CC-34`** | The `read` and `reference` **verbs** are grammar postures, **not** write-path-enforceable — a guard only fires on writes. | `SD-6` set read **side-effect** GETs aside; no **read-path** enforcement point exists. | **When `SD-6` is revisited, or a read-path enforcement point exists.** | Make a `read`/`reference` level be read by an enforcement point (grep for a reader of `resolveStructuralLevel` on a read path). |
| **`CC-35`** | A structural **re-type labelled `'create'`** would **escape the guard** (it excludes `create` — the S2 gate's job). Cannot happen on today's route, but it is a **name-keyed convention**. | No writer labels a structural re-type `'create'` today. | **When any writer can label a structural re-type `'create'`.** | Make the guard decide on the **before-state** (existence), not the operation label; mutation-prove it. |
| **`CC-36`** | Several **foreign guard-input builders omit `actorKind`** — `messages`, `configs`, `communication_channels`, `staff`, `payment_gateways` / `integrations` / `sales` route `auth` objects. | Slice B plumbed `actorKind` through the `entities` path only; the others have no guard that reads it **yet**. | **When a guard reads `actorKind` on (or across) those paths.** | Each builder supplies the actor kind via the `derivePrincipal`-backed resolver, with a transport test per path. |
| **`CC-39`** | The `CC-25` actor check reads **live authorisation state inside** a guard's `validate` — a DB read (`resolveGrantRole`) inside `validate`, before the write. | Idempotent and matching the guard's precedent, but an extra DB round-trip; it wants a **pre-resolved actor ACL** on the guard input. | **When the guard input carries (or can cheaply resolve) the actor's effective ACL.** | Have `runStructureChangeGate` obtain the actor's decide-permission + grantable features without a fresh `Role` read inside `validate` (grep the guard for a `resolveGrantRole`/`loadAcl` call on the `validate` path). |

---

## §S4 — the **escalation / approval** cluster (D3's `escalation` outcome)

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-15`** | The **first production guard that emits `escalation`** — D3 added the outcome and honoured it end-to-end, but the capability is proven by test, not by a live caller. | **Partly met by `CC-37`** (the structural guard is the first production emitter): criteria (1) ✅, (3) ✅, (2) wrapper-level only, (4) NOT met → `CC-38`. | **When a live route asserts the `202` end-to-end and a `pending_acts` row is filed.** | Add a live-route 202 assertion + prove a `pending_acts` row is filed (this overlaps `CC-38`). |
| **`CC-38`** | The escalate outcome has **no approval-layer wiring**: nobody files the pending act — no `authority_pending_acts` row is created, because the guard path carries no `commandId`/`capabilityId` (it **defers**). | The approval layer that owns pending acts does not exist yet. | **When the approval layer gains a guard-origin intake.** | File an `authority_pending_acts` row from the guard origin; add a live-route `202` + row-filed end-to-end test. |
| **`CC-14`** | The escalation branch in the three **PARKED** modules (`staff` 11, `payment_gateways` 4, `sales` 2 — 21 of 36 widened sites): commented out in `modules.ts`, excluded from `tsconfig.json`, so the package typecheck and core suite **never compile or run them**. | **Business-*triggered*, core-*action*:** the guard-consistency work is core, but it starts only when a module is un-parked (a business decision). | **When `staff` / `payment_gateways` / `sales` are un-parked** (re-enabled in `modules.ts` **and** `tsconfig.json`). | Re-run `tsc --noEmit` on `@open-mercato/core` **and** the module suites; confirm each escalation branch compiles and returns `202 pending_review`. |

---

## §S5 — the **audit-verification** cluster (the D3 governance-tree audit)

> *This cluster is empty of open items as of 2026-10-11 — kept as a named heading so a future open item from the
> same audit lands in the right place rather than in a general list.*

---

## §S6 — the **environment / ops** cluster

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-19`** | `packages/shared` — `dynamicLoader.tsconfig.test.ts` fails **8/8 under the full suite** (`EBUSY` / `ERROR_SHARING_VIOLATION`) but **passes 8/8 in isolation**; 12 retries over 6.7 s all fail, so a retry "fix" was written, disproved and **reverted**. | **Environmental, NOT a code defect** — a Windows host holds the freshly-placed `node.exe` image. A retry loop **cannot** fix it (proven). | **The first CI run** (a host where the `node.exe` image is not held). | If `shared` is 197/197 green on CI, close it. If it *also* fails, replace the child-process spawn with a **spawn-free** design and re-measure — do **NOT** re-add a retry. |
| **`CC-41`** | `update.sh` rebuilt onto the **same tag**, so the outgoing image was **overwritten and could not be restored by id**. | **FIXED 2026-10-09** (fix in repo AND on the VM — versioned `wan-<date>` tag); what remains is to **watch it run**. | **The next `update.sh` run** (the following deploy). | After the deploy, `docker images open-mercato/app` must show a surviving `wan-<date>` tag for the image that was live before it. |

---

## §S7 — the **AI read/write surface** cluster (the remaining named tool-path edges)

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-8`** | `ai-assistant/.../tool-test-runner.ts:193` runs a **read-tool handler ungated**. Reachable only from the `mercato ai_assistant tool-test` CLI (superadmin, in-process) — **not** a request path. | The CLI has no HTTP surface, so there is no request door. | **When the `tool-test` CLI gains an HTTP surface.** | Gate the handler with `checkToolAuthority` **before** it runs; add a request-path test. |
| **`CC-9`** | `catalog` / `customers` `ai-agents-context.ts` call `tool.handler` **directly** with `userId: null` for page-context hydration; a `checkToolAuthority` call there returns `permit` immediately (no subject). | Gating it today **changes nothing** (no subject). | **When page-context hydration gains a subject.** | Supply the subject and gate the call; add a test. |
| **`CC-10`** | The **HTTP RBAC path** (`refusalFor`) passes **no invoker** — pre-existing; `S-02` did not change it and does not claim to. | It is a mismatch between two authorization paths (tool door has an invoker; HTTP door does not). | **When `rbacService.refusedByAuthority` is next touched.** | Pass the invoker there, matching the tool door (both authorization paths agree). |
| **`CC-54`** | The **index-time presenter pipeline** still promotes **arbitrary string fields** — the fallback presenter (`findAnyStringValue`) will promote **any** string field of an indexed record into the stored presenter `title`, including a classification-marked sensitive field **not** in the search `fieldPolicy`. `CC-53` fixed the **tool-side** leak (dropping the presenter for a classified entity); this closes the **source**. | A **schema/index** concern, not a blocker (rule 14) — but stored presenters need an **index rebuild** to be corrected. | **When an index rebuild is next performed, or the first non-`search_query` consumer of stored presenters appears** — whichever comes first. | Make the fallback presenter **skip fields the entity's classification map names** (resolve `resolveExportEncryptedFields` at index time, mirroring `CC-53`) before `findAnyStringValue`; add a test with a classified-only index record; run the full protocol. |

---

## §S8 — the **owner-decision** cluster (core, but the owner's call — rule 11)

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-11`** | `enforce` is **not armed for any tenant** — the door is capable and fail-closed; the switch remains the **operator's decision**, made against their own shadow evidence. | The operator decides, per tenant, against shadow evidence — this is not a build. | **The operator's decision, per tenant, against shadow evidence.** | Record each arming (a per-tenant `enforce` row). **OPEN — needs you (`NY-` item).** |
| **`CC-12`** | `GAP A` — the universal **`Resource` envelope** half is OPEN (the Metadata Registry half is DONE). The universal shape every object shares is not built. | Building the type with **no consumer** would be the *"contract after the code"* failure the gap analysis names. | **When Phase −1 contract C1 lands with its first consumer.** | Build the `Resource` envelope type **with** a live consumer (never before one exists). |

---

## §S9 — the **deferred-by-ruling** core item

| ID | What it is (plain words) | Why it is open | Named trigger | What to do when it fires |
|---|---|---|---|---|
| **`CC-51`** | Row 16 Option B — **"own + TEAM" row scope**. `CC-50` (own-only) is BUILT; B additionally needs a **real `team` concept the platform has never had** (no team entity, no membership, nothing on `auth`). | The owner **deferred it** (2026-10-11: *"after you document B as a future addition"*). It is documented, not dropped (`PLAN-ROW16-own-team-row-scope.md` §7.2). | **When the owner asks for team-based visibility, or the first real caller needs it** — whichever comes first. | Build `PLAN-ROW16-own-team-row-scope.md` §7.2: the `team` entity + membership → the `teamField` on the row-scope declaration → the "my teams" expansion in `organizationScope.ts` → the third role mode → the full protocol. |

---

## §X — the **excluded** item (business, per the owner's scope limit)

| ID | Why excluded here |
|---|---|
| **`CC-42`** | `G-22` Slice 2B — the generic state-machine engine's **first caller** is the `customers` **deal pipeline** (a business module). The engine (Slice 2A) is core and BUILT; its first caller is business work, paused by the owner's ruling. **This plan is core-only, so `CC-42` is out of scope** — it stays in the register with its own trigger: *when `G-22` Slice 2B starts* (fact-check the pipeline's real transition shape, then decide preserve-vs-narrow, rule 9b/11). |

---

## How to keep this plan honest

1. **The register owns the truth.** Every row above is a *view* of [`COMPLETION-CALLBACKS.md`](COMPLETION-CALLBACKS.md).
   When a trigger fires and an item is built, its register row flips to `✅` and this plan's row is updated in the
   **same** change.
2. **Re-derive the open set, never type it.** The count (**25 open, 1 business, 24 core** as of 2026-10-11) is
   derived from the register's rows (the last row per id, non-`✅`) — the same rule the ONE NUMBER follows.
3. **A new open item lands in the right cluster.** When a build stops short, its new register row is added **and**
   its cluster here is updated in the same change — so no core item is ever "one session away from forgotten".
4. **No item is started before its trigger.** Starting one early is the *plumbing-with-no-reader* anti-pattern
   (row 1's failure, and the reverse of rules 8/10d).
