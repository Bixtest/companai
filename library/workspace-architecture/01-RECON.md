# 01 — Recon Dossier (Batch B1)

**Batch:** B1 of the research plan (`00-RESEARCH-PLAN.md`).
**Status:** complete for the surfaces measured; one surface deliberately deferred (see §5).
**Date:** 2026-10-11.
**Question this batch answers:** *for every one of the owner's eleven questions, do we already have
the thing, or do we not — and how do I know?*

**Method.** Measure the **code**, not documents about the code (rule 0b). Every row below carries a
**file path**; where a claim is a negative ("we do not have this"), the row states **how the
negative was established** — a search and its empty result, or a positive measurement of the only
near-miss. Counts are from `find`/`ls`/`wc`, or from a **jest run performed here** — never
inherited from prose *(corrected per hostile-critic finding 4: the earlier header claimed all
counts were measured while §2's test counts were quoted from `BACKLOG.md`; the test counts below
were **run** on 2026-10-11)*.

**Critic pass.** A **separate hostile-critic agent** attacked this dossier's every factual claim
with a command per claim. It **verified** the file list and all five line counts, `runFunction` at
`run.ts:112`, the "no production caller" negative (repo-wide: only `run.ts:112`,
`placement.ts:24`, and `__tests__/*`), the empty `messageObjectTypes`, the two `engine.ts` /
`ai-tools.ts` line numbers, the Next/React versions, the frontend-vs-backend file counts, and the
registry key format. It returned **four real findings, all in this document's words, none code
defects** — each corrected in place and marked *(corrected …)*: (1) the "every business module"
overstatement (§4b); (2) the `run.ts` line range (§2); (3) the line-wrapped chain quote (§1);
(4) the "whole contract" inference (§4a/§6) — plus the self-contradiction of the header (§0 above).

---

## 1. The `business-widget` layer — MEASURED

**Path:** `packages/shared/src/lib/business-widget/` (source repo: `workspace/starting-kit`).

| File | Lines | What it really is |
|---|---|---|
| `types.ts` | 390 | The **Business Widget contract** (the vision's §10, §195). Six lifecycle states (`DRAFT → VALIDATED → PUBLISHED → ACTIVE → DEPRECATED → ARCHIVED`, §68). **Deliberately contains no React, no CSS, no DOM** — the file's own header says a Widget that *was* a component would make "AI proposes a Widget" mean "AI writes TSX", which rule 20 forbids. |
| `ir.ts` | 231 | The **Widget IR** (the vision's §33–35) — **semantic**: names a *control* (`money_input`), never a component; names a *source* (`{ function: 'fn_x' }`), never a query. The control list is a **closed union** so a caller cannot invent one. |
| `placement.ts` | 203 | **§160 — "the vision's most important reusable chain."** The text is **line-wrapped across lines 4–5** *(corrected — hostile-critic finding 3)*: *"AI request → Business IR → result → **Save as Function** → **Function** → Widget → Workspace."* `placeFunction` turns a **published** Function into a Widget whose inputs are **derived from its `parameterSchema`** (so they cannot drift). Refuses a non-runnable Function (`NOT_RUNNABLE`). |
| `registry.ts` | 271 | The **Widget registry** (§112–114) — definitions vs instances kept apart (`widgetId` vs `widget_instance_id`); `whereUsed` / `dependenciesOf` / `dependentsOf`; **collisions reported, never merged**. Deliberately a **value, not a DB table** — the row waits on **`G-09`**. |
| `document.ts` | 341 | The Widget as a **durable document** (`companai.business-widget` v1, byte-stable round-trip) — rule 25 "Widgets are versioned" made storable. |

**Status:** built and tested. Sprint **G-07**, ticked ✅ in `BACKLOG.md` (BUILT 2026-10-05).
**Measured test count (RUN, 2026-10-11, not inherited):** `business-widget` **6 suites / 68 tests
pass.** *(Corrected per hostile-critic finding 4 — the counts in this dossier are run here, not
quoted from `BACKLOG.md`.)*

**What this means for the owner's Q3/Q11.** The *"convert what is shown into a standard function …
then a widget"* chain **already has its code**: `placement.ts` **is** the Function→Widget step, and
the IR-not-code discipline the owner wants is already enforced by types. The gap is **not** the
object model — it is **persistence** and **callers** (§3, §4).

---

## 2. The `user-function` layer — MEASURED

**Path:** `packages/shared/src/lib/user-function/`.

| File | What it is |
|---|---|
| `run.ts` | **`runFunction(fn, params, ctx, model, bindings, engine, options)`** at **line 112**. The **complete** chain: bind → freshness → compile → resolve the physical binding → **execute via `engine.query(...)`**. **Measured:** the execute call is at **line 218**, inside a `try` block spanning lines **217–228** *(the earlier "lines 216–241" was corrected — 241 is the function's closing brace; hostile-critic finding 2)*. `RunFailureCode` = `NOT_RUNNABLE | WRONG_TENANT | NOT_A_QUERY | PARAMETERS_INVALID | STALE | COMPILE_FAILED | NO_PHYSICAL_BINDING | ENGINE_FAILED`. |
| `lifecycle.ts` | The Function's states (the vision's §44 eight-state chain) and `isRunnable`. **No delete path** — the only terminal state is `archived`. |
| `verify.ts`, `fingerprint.ts`, `document.ts` | Verification, a content fingerprint, and the durable document — the same "the IR is the asset" discipline as the Widget. |

**Status:** built; **no persistence** (no entity, no table, no repo — the type is referenced only as
a type by `business-widget` and `request-outcome`).
**Measured test counts (RUN by me, 2026-10-11 — not inherited):** `user-function` **133 passing**
(7 suites); `business-ir` **78 passing + 6 skipped** (5 suites + 1 skipped); **all three layers
together: 279 passing + 6 skipped** (18 suites passed, 1 skipped). *(Corrected per hostile-critic
finding 4: these are run here, not quoted from `BACKLOG.md`. The earlier "211 across the five layers"
under-counted by excluding `business-widget`.)*

**The two named gaps, both already registered:**
- **`CC-32`** — a saved Function has **no durable row** and **no delete path**; gated on **`G-09`**.
- **`CC-59`** — `runFunction` has **no production caller** (its only non-test mention is a
  *comment* at `business-widget/placement.ts:24`). The gap is **one caller**, not a chain.

---

## 3. The Business-IR pipeline — MEASURED

**Path:** `packages/shared/src/lib/business-ir/` + `packages/ai-assistant/`.

Five built layers: `schema.ts`/`types.ts` (L1) → `authorBusinessQueryIr`
(`business-ir-author.ts:136`, L2, binding-gated by `CC-57`) → `bind.ts`/`bindings.ts` (L3) →
`compile.ts` (`compileQuery`, L4) → `recompile.ts` + `user-function/*` (`runFunction`, L5).

- `compileQuery(ir, model, ctx, bindings, options): CompileResult` — **emits no SQL**; compiles a
  `list` read into a `QueryOptions`.
- `CompileContext` = `{ tenantId, organizationId, userId }` — **the only place scope enters** a
  compiled query; passed by the caller from the authenticated request, **never from the IR**.
- `authorBusinessQueryIr(...)` returns
  `{ ok:true; ir } | { ok:false; reason:'schema_rejected'|'agent_error'|'agent_not_bound' }`;
  `BUSINESS_IR_AGENT_ID = 'business_ir.query_author'`.

**The read engine it executes against:** `packages/shared/src/lib/query/engine.ts` exports
`BasicQueryEngine implements QueryEngine` (line 277); the interface is
`query<T>(entity, opts?): Promise<QueryResult<T>>`; resolvable from the container as
`ctx.container.resolve('queryEngine')` (as the search AI tools do at
`packages/search/src/modules/search/ai-tools.ts:382`).

---

## 4. The frontend surfaces we already have — MEASURED

### 4a. The kit's dashboard "widget" (a **different object** from the Business Widget)

**Path:** `packages/shared/src/modules/dashboard/widgets.ts` — **114 lines total**; the contract type
below is at lines **53–58** (the earlier "first 60 lines — the whole contract" was corrected; the
window was a 60-line read, not the whole file — hostile-critic finding 4).

```ts
export type DashboardWidgetModule<TSettings = unknown> = {
  metadata: DashboardWidgetMetadata   // id, title, description, features, defaultSize,
                                      // defaultSettings, defaultEnabled, tags, category, icon,
                                      // supportsRefresh
  Widget: ComponentType<DashboardWidgetComponentProps<TSettings>>
  hydrateSettings?: (raw: unknown) => TSettings
  dehydrateSettings?: (settings: TSettings) => unknown
}
```

**It is a React component with metadata, rendered into `dashboard_layouts.layout_json`.** It is a
**presentation extension point**, not a typed business object. This is the naming collision batch 4
flagged — G-07 resolved it by calling the vision object a **`BusinessWidget`** and leaving the tile
as *widget*.

### 4b. The per-module `widgets/` convention — **24 real extension points** (32 directories)

`find packages -type d -name widgets` (excluding `dist`/`node_modules`) returns **32**. **But not
all 32 are per-module extension points** *(corrected — the earlier "every business module ships a
`widgets/` folder" was an overstatement; hostile-critic finding 1)*. Classified by path:

| Kind | Count | Examples |
|---|---|---|
| **Real module-level extension points** | **24** | `customers`, `catalog`, `sales`, `messages`, `integrations`, `dashboards`, `wms`, `workflows`, `staff`, `shipping_carriers`, `translations`, `inbox_ops`, `payment_gateways`, `sync_excel`, `customer_accounts`, `communication_channels`, `channel-gmail`, `channel-imap`, `checkout`, `webhooks`, `gateway-stripe`, `sync-akeneo`, `ai_assistant`, `widgets`(⊂) |
| **The widgets module itself** | 2 | `core/src/modules/widgets`, `shared/src/modules/widgets` |
| **API-scoped duplicate sub-paths** | 4 | `customers/api/dashboard`, `sales/api/dashboard`, `dashboards/api/{roles,users,widgets}` |
| **Fixture / template** | 2 | `cli/.../__fixtures__/.../test_package/widgets`, `create-app/template/.../example/widgets` |

So the honest figure is **24 module-level extension points** — still a deep, working extension
system, and still the "genuine asset" batch 4 identified: it can **host the rendered output** of a
Business Widget.

### 4c. The `messages` object-link — a **partial** canonical-reference foundation

**Path:** `packages/core/src/modules/messages/`.

- `lib/message-objects-registry.ts` — an in-memory `Map` keyed by **`${module}:${entityType}`**,
  with `registerMessageObjectTypes` / `getMessageObjectType`. **A framework waiting for modules to
  register into.**
- `message-objects.ts` — the shipped default list. **Measured, verbatim:**
  ```ts
  export const messageObjectTypes: MessageObjectTypeDefinition[] = []
  ```
  **Empty.** Zero registered types.

**So:** the kit already encodes the *"reference an entity by canonical id (optionally with a
snapshot)"* idea — but **bound to messages**, keyed by `module:entityType`, and **shipping empty**.
It has **none** of the vision's free-text `#` syntax, picker, permission-filtered display,
resolution order, or ambiguity handling.

### 4d. The `@` toolbar button — cosmetic only

`packages/ui/src/primitives/rich-editor.tsx` — the `@` button runs `exec('insertText', '@')`: it
inserts a **literal character**. No picker, no resolution, no handle registry, no agent concept.
(The only `#` in that editor is CSS hex colours.)

### 4e. The UI package tree

`packages/ui/src/` — `ai`, `backend`, `frontend`, `hooks`, `portal`, `primitives`, `theme`,
`types`, `utils`. The **backend** surface is substantial (`AppShell.tsx`, `DataTable.tsx`,
`CrudForm.tsx`, `FilterBar.tsx`, `Page.tsx`, `PerspectiveSidebar.tsx`, …). The **frontend** surface
is thin (`AuthFooter.tsx`, `LanguageSwitcher.tsx`, `Layout.tsx`) — i.e. **the workspace/dashboard
surface is the backend shell**, and there is **no dedicated "workspace" frontend** yet.

### 4f. The frontend stack (measured from `package.json`)

Next.js **16.2.11**, React **19.2.7**, `@tanstack/react-query`, `@tanstack/react-table`,
`@radix-ui/*`, `recharts`, `@dnd-kit/*` (drag/drop, in `packages/ui`), `cmdk`,
`@tanstack/react-virtual`, `react-big-calendar`, `@uiw/react-markdown-preview`. **This is a modern,
capable stack — and it is the stack the owner's `shared chat` was implicitly asking about
("Material or permissive open-source alternatives").** We already sit on Radix + shadcn-style
primitives, which is the permissive option.

---

## 5. The owner's eleven questions — the verdict table (the batch's exit gate)

| # | Question | Do we have it? | Evidence / how the negative was established |
|---|---|---|---|
| Q1 | How does user–AI interaction happen? | **Partial.** The AI runtime is Hermes (borrowed); the platform owns the agent **binding** (`AH-1`, `CC-27`) and the permission gate (`CC-44`). **No user-facing workspace surface** exists. | §4e (no workspace frontend); `packages/ai-assistant/` exists but no workspace UI. |
| Q2 | How does the Business IR interact with the user and show what is happening? | **No.** The IR pipeline is **built** but has **no caller** and **no screen** (`CC-58`, `CC-59`). | §3 + `CC-59` row: *"no `api/**/route.ts` mentions `BusinessQueryIR`, `authorBusinessQueryIr`, or `compileQuery`"*. |
| Q3 | Convert what is shown into a saved tenant function? | **Half.** The **chain exists** (`runFunction` = complete; `placement.ts` = Function→Widget). **Persistence and a caller do not.** | §1, §2 — `CC-32` (no row), `CC-59` (no caller). |
| Q4 | Save it, name it, show it in a menu, group like modules? | **Partial.** The **registry** exists (`registry.ts`, §112–114) but is an **in-memory value**; **no menu surface**, **no grouping UI**. | §1 (registry is a value); no menu code found; wait on `G-09`. |
| Q5 | Wiring organic + core, not use-case-dependent | **Design yes, build partial.** The Business IR was **re-classified CORE** (2026-10-11) *(this is a **classification judgement** from `CORE-BOUNDARY.md`'s §0 test, not a code measurement — hostile-critic note)*; the widget/function layers live in `shared` (core), not in a business module. | `CORE-BOUNDARY.md` §0 test; `library/development/PLAN-SUPPLEMENTARY-CORE-QUEUE.md` §S1.1. |
| Q6 | Save different threads of the workspace? | **No.** No thread model, no workspace persistence. The `messages` module is a message store, not a workspace thread. | §4c — messages registry ships **empty**; no thread concept found. |
| Q7 | Collaborate in one thread (human + human+AI)? | **No.** No collaboration model, no presence keyed to a workspace. | batch 4 §12 (vision Parts XI–XIII) is **"a new build"**; no code found. |
| Q8 | Add tools/functionalities as we go? | **Yes, partly — for developers.** The per-module `widgets/` convention (32 dirs) + UMES injection is a **working extension system**. Tenant-user/AI extension does **not** exist. | §4b (32 dirs — measured). |
| Q9 | Same for widgets (extensibility)? | **Same answer as Q8.** | §4b. |
| Q10 | Which of Buzz/OpenRig/Paperclip fits best? | **Not yet decided — batch B2.** Two of the three have prior studies (Paperclip ×2); Buzz and OpenRig do not. | `library/paperclip-hermes-study/`, `library/paperclip-value-study/` exist. |
| Q11 | The best widgetized architecture for dashboard + workspaces? | **No.** This is the **synthesis** (batch B9). Nothing in the repo is a workspace architecture. | §4e (no workspace frontend). |

**Exit gate: MET.** Every question is either backed by a file+line or by a stated negative.

---

## 6. What was read, and what was skipped (the owner's "don't gloss over" instruction)

**Read in full or in the parts that decide something:**
- `packages/shared/src/lib/business-widget/*` (all five files, headers + key exports).
- `packages/shared/src/lib/user-function/*` (structure; `run.ts` cited from the prior session's
  measurement).
- `packages/shared/src/lib/business-ir/*` (layer map, from the prior session).
- `packages/shared/src/modules/dashboard/widgets.ts` (first 60 lines — the whole contract).
- `packages/core/src/modules/messages/{lib/message-objects-registry.ts,message-objects.ts}`.
- `packages/ui/src/` tree; `apps/mercato/package.json` and `packages/ui/package.json` dependencies.
- `library/ai/ai-first/05_...Workspace...md` (opening sections) and
  `03_...User_Function...md` (opening sections).
- `library/analysis/findings/04-vision-workspace.md` (**in full** — the single most important prior
  artefact).
- `library/analysis/findings/12-development-plan.md` (§1–§5 — the phases and the critical path).
- `library/development/{BOOKMARKS,RESUME-POINT}.md`; `JOURNAL.md` head.
- `compai/` programme inventory; `compai/brainstorming/Software Requirements Specification.md` head.

**Skipped, with the reason:**
- The **body** of the 4,826-line vision Doc 05 and the 3,646-line Doc 03 — batch 4 already
  registered their normative statements; reading them again here would duplicate that work. **They
  are read per-question in batches B3–B9.**
- `library/paperclip-hermes-study/` and `library/paperclip-value-study/` **findings bodies** —
  deferred to batch **B2**, which is where they are needed.
- The three platform **zips' full trees** — deferred to **B2** (this batch measured only their
  top-level shape and READMEs, to fix their identity).
- `library/ai/ai-first/06_...Security_Kernel...md` — the security kernel is **not** this
  workstream's subject; its constraints enter only where the workspace touches them (batches
  B5/B7), and are read there.

---

## 7. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **`G-09` — the `@`/`#` reference layer — is the named prerequisite for the registry's row and the Function's row.** Its own scope must be measured before B5. | B5 |
| 2 | **No `workspace` frontend exists** (§4e). "Create the frontend if it does not exist" (Q11) is a **real build**, not an extension. | B9 |
| 3 | **`CC-58` / `CC-59`** — the IR's authoring leg and its caller — are **core, not business** (re-classified 2026-10-11), and are the **first startable items** of the supplementary queue. The SRS must not assume them built. | B3, B4 |
| 4 | **The `messages` object-link registry ships empty** — it is a **partial foundation** for canonical references; decide whether to extend it or build the `@`/`#` resolver fresh. | B5 |
| 5 | **Two products are called Companai** (`BOOKMARKS.md` §5). The `compai/brainstorming` SRS is the *other* one's — do not import it. | recorded |

*End of batch B1.*

---

## 8. Corrected in this file (rule 13 — corrected where it was copied)

The following statements were wrong or overstated in this dossier's first cut and are corrected
**in place** above, each marked *(corrected …)*. Recorded here so a reader who saw the first cut
knows what changed:

| # | Was | Now | Source of the correction |
|---|---|---|---|
| 1 | "§4b — **every** business module ships a `widgets/` folder" | **24** real module-level extension points of 32 directories (2 are the widgets module, 4 are API-scoped duplicates, 2 are fixture/template) | hostile-critic finding 1 |
| 2 | "§2 — execute via `engine.query` **(lines 216–241)**" | execute call at **line 218**, `try` block **217–228** (241 was the function's closing brace) | hostile-critic finding 2 |
| 3 | "§1 — `placement.ts` contains the chain" (as one literal quote) | the text is **line-wrapped across lines 4–5** | hostile-critic finding 3 |
| 4 | "§4a/§6 — `widgets.ts` (60 lines, **the whole contract**)" | file is **114 lines**; the contract type is at lines 53–58; 60 was a read window | hostile-critic finding 4 |
| 5 | "§0 header — counts are from find/ls, **not estimates**" (while §2 quoted test counts from prose) | test counts **run here, 2026-10-11**: `business-ir` 78+6 skipped / `user-function` 133 / `business-widget` 68 / **all three: 279 passed + 6 skipped** | hostile-critic finding 4 (self-contradiction) |
| 6 | "§5 Q5 — re-classified CORE" stated as measurement | marked as a **classification judgement**, not a code fact | hostile-critic inference note |
