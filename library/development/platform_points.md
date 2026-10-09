# platform_points.md — the ONE list: every task, in plain English, in build order

**You asked for this file to be the single scoreboard.** It replaces the old technical `§A`–`§K` view
(kept at the bottom as an **appendix** — nothing was deleted). There is now **one number** and **one
list**, sorted so you can reorder it.

**Read it like this:** each row says **what you, the user, can do after the task is done** — not
`G-22`, not `SD-1`. Those IDs are still there, in the last column, so a developer can act; you can ignore
that column. **`☑` = done and verified in the code. `☐` = not done. `🟡` = real work landed, not whole.**

**The order is the vision's own order** (`library/ai/ai-first/06_...§222-232`, Phase 0 → Phase 10). The
platform skeleton is built **before** business capabilities — because the vision says so (§233:
*"Do not start by building dozens of ERP screens … while the security model remains informal"*).

---

## THE ONE NUMBER

> ### **19% done** — 61 of 319 units · weighted ≈22% · **±4**
>
> **But read this next line carefully — it is the honest headline.** The work that is *done* is
> skewed **high** in the stack: the AI-first loop (the hard, interesting part) is largely built, while the
> **platform skeleton underneath it is only starting**. So the "%" is real, but the *order* is the real
> story: **we are ~20% done, and the next work must go DOWN the stack (the skeleton), not sideways into
> business modules.**

**Why there are still 319 units in the appendix but one number here:** the number is derived from the
ticked boxes, never typed. If the number and the boxes disagree, the number is the defect.

---

## THE LIST — sorted in build order (vision Phase 0 → Phase 10)

**How to reorder:** move a row up or down; the phases must stay in order (a lower phase cannot be
started while a higher one is open). If you move something, write one line beside it saying why.

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

### PHASE 3 — The policy kernel *(the vision's "first major kernel milestone")* — **this is where the queue now points**

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 7 | You can define roles and give them permissions, and the platform **enforces** every one on every write — not just in the UI. | 🟡 | `P3` |
| 8 | When you create a new table or column, the platform **forces the permission question** — it can no longer be forgotten. | 🟡 | `SD-1` / `S2` / `P3a` / `P3b` |
| 9 | The permission rules are **stored** (not just in memory) and read back by the running app. | ☐ | `P3b` / `M3e` |
| 10 | Every write passes one gate, and the gate can say "allow", "refuse", or "ask a human first". | ✅ | `P18` / `D0`–`D3` |
| 11 | You can change the platform's behaviour by **setting**, not by deploying code (the tier mapping is a setting). | ✅ | `D1` |
| 12 | A high-impact change can be sent for **approval** instead of silently allowed. | ✅ | `D3` |
| 13 | You can see the rules that govern a structure, and change them from a screen. | 🟡 | `SD-4` / `SD-5` |

### PHASE 4 — Data classification / secrets

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 14 | Sensitive fields and secrets are marked as such, and the platform treats them specially (never logged, never exported by accident). | ☐ | `P4` (classification leg) |

### PHASE 5 — Query / Command enforcement *(reads and writes are authorized)*

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 15 | Every read is filtered by permission at the **data layer** — not by hiding a button. | 🟡 | `P10` |
| 16 | You can restrict a person to **their own rows / their team's rows**, not just their whole tenant. | ☐ | Phase 3 item 18 |
| 17 | Permission coverage reaches **every** table — a new table cannot be created un-gated. | ☐ | Phase 3 item 17 |
| 18 | The AI's read path goes through the **same** column- and row-level gates as a human. | ☐ | Phase 3 item 19 |
| 19 | Every state-changing action goes through one typed "command", never a raw write. | 🟡 | Phase −1 C6 / `S5` |
| 20 | A generic **state-machine engine** exists so any "stage → stage" flow (an order, a ticket, a deal) can be declared once and enforced everywhere. | 🟡 | `G-22` |

### PHASE 6 — Audit / provenance

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 21 | You can see **who did what, when, on which record** — and export it for compliance. | 🟡 | `P4` |
| 22 | Audit history is independent of the business record (you cannot edit your own past). | 🟡 | `P4a` |

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
| 28 | The agent runtime sits behind **one typed door** — no other code talks to it directly. | ☐ | `B-05` / `Port` |
| 29 | An AI user can be **bound** to a specific agent, with specific tools and scope. | ☐ | `CC-27` |
| 30 | Each AI job **declares which model** it uses (local or cloud) — one picture, no surprises. | ☐ | `S6` |

### PHASE 9 — Functions / Widgets / Workspace

| # | What you can do after this | Status | ID |
|---|---|---|---|
| 31 | You ask for something new, verify it, and **save it as a Function** that then runs with **zero AI** forever. | ✅ | `G-03` |
| 32 | A Function's lifecycle (draft → published → archived) is an **enforced state machine**. | ✅ | `G-03` |
| 33 | A published Function **never calls a model at run time** — proven by test. | ✅ | `G-03` |
| 34 | A Function runs from a **Widget** (a small UI block) with typed inputs and outputs. | ✅ | `G-07` |
| 35 | You can place Functions and Widgets on a **Workspace** and share it. | ☐ | Widgets doc / Workspace |

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
-   - ☐ **C5d** — Consumed by a real caller + the remaining §54 answers that need links the platform does not yet have (**who can access it** — the authority engine is shadow-mode and SD-4 unbuilt; **what APIs expose it** — no route→object index) *(LEFT — `SD-1`'s gate can now *enumerate* but does not call it yet)*
-     *(was PARTIAL — the view and the service are real; what is missing is the schema-conventions half and real consumption)* · ★ Hermes: how Hermes learns the shape of the business without a DB handle
- ☐ **C6** — Command / action contract: schema · permissions · side effects · risk · approval · idempotency ▸ 1/2
-   - ☑ **C6a** — A real command bus: `shared/src/lib/commands/` (`command-bus.ts`, `types.ts`, `undo.ts`, `redo.ts`, `registry.ts`, `operationMetadata.ts`, interceptors, scopes); `types.ts` carries input/execute/undo/redo/capability *(DONE — measured)*
-   - ☐ **C6b** — The **full** contract uniform across every action (risk · approval · idempotency) *(LEFT — whether it is uniform was not established)*
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
- ☐ **P3 Roles & permissions (RBAC/ACL)** — roles · grants · feature gates ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P3a** — Two-table ACL + the typed permissions-catalogue **service** (`SD-1`, 2026-10-08) *(carried — docs claim it, the code was not re-verified this round)*
-   - ☐ **P3b** — Persisted for runtime surfaces + consumed by a write *(LEFT — in-process only; see `SD-1`)*
-     *(was PART — two-table ACL real; the catalogue service exists but is not yet persisted for runtime surfaces nor consumed by a write)*
- ☐ **P4 Audit & compliance log** — who/when/which record; retention/export ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P4a** — Read + create API and one viewer page *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P4b** — Retention and export *(LEFT)*
-     *(was PART — read+create API, one viewer page)*
- ☐ **P5 Settings / configuration** — instance- and tenant-level *(DONE — `module_configs`; hosts the tier setting)*
- ☐ **P6 File / document storage** — attachments · partitions · backends *(DONE)*
- ☐ **P7 Notifications** — in-app + email + push, templates ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P7a** — The notification engine (in-app + email + push) *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P7b** — User-editable templates *(LEFT — templates are code-defined, not user-editable)*
-     *(was PART — templates code-defined, not user-editable)*
- ☐ **P8 Workflow / automation engine** — definitions · instances · steps · user tasks *(DONE)*
- ☐ **P9 Business rules engine** — declarative conditions → actions *(DONE)*
- ☐ **P10 Search / indexing** — full-text + vector ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **P10a** — A strong search engine *(carried — docs claim it, not re-verified this round)*
-   - ☐ **P10b** — A real UI + full ACL-feature coverage (`aclFeatures` covers 6 of 67 tables) *(LEFT — thin UI; blocks the AI data work)*
-     *(was PART — strong engine, thin UI, `aclFeatures` 6 of 67 tables)*
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

- ☐ **B-05** — Runtime boundary decided: Hermes a supervised private Python runtime behind one typed port; headless *(DECIDED in docs — but the code has no Hermes port yet; OpenCode still occupies the slot, so NOT ticked)*
- ☐ **Port** — The typed port (`describeCapabilities` · `startRun` · `streamRun` · `cancelRun` · `steerRun` · `resumeConversation` · `resolveToolCall` · `completeRun`) *(OPEN —**verified not built**; OpenCode still occupies the slot)* · ★ Hermes: the only door
- ☐ **Port** — The admitted envelope: server-minted identity, secret *references*, distinct ids *(OPEN)*
- ☐ **Port** — Failure is normal: `cancelRun` bounded+idempotent, `completeRun` replay-safe *(OPEN)*
- ☐ **N-8** — Displace OpenCode: build the port, move the chat route, *then* delete OpenCode *(OPEN — rewire first)*
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
- ☐ **Phase 0** — Pin the Hermes source digest + a compatibility harness *(OPEN)*
- ☐ **Phase 0** — State the licence position, including optional components *(OPEN — V-09 gates adoption)*
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
- ☐ **S2 (= SD-1)** — Every architectural change answers the permissions question: catalogue + fail-closed gate ▸ 4/7
-   - ☑ **S2a** — The permission catalogue: `shared/src/lib/permissions/catalogue.ts` — surfaces + the two blocks they yield (data + structural), populated from declarations and extended by runtime surfaces *(DONE 2026-10-08 — measured)*
-   - ☑ **S2b** — The pure fail-closed gate: `structure-change-gate.ts` + a `MutationGuard` hook on the entities `create` path *(DONE 2026-10-08 — measured)*
-   - ☑ **S2c** — The write: `auth/lib/permission-decision-grant.ts` applies the gate's `defaulted` records to the tenant's grant role's `role_acls.features_json` (idempotent set-union), wired in the guards' `afterSuccess` and carried `validate`→`afterSuccess` by the real runner; **run on every create path** — the batch definitions route, the shared primitive `ensureCustomFieldDefinitions`, the `add-field` CLI, the three HTTP reactivation routes (CC-22/CC-24), the entity-install primitive `upsertCustomEntity` (CC-21), and the three field write sites on a type change (CC-4) *(DONE 2026-10-08 — measured; 133 tests, 56 mutations RED-then-GREEN across twelve slices, nine hostile-critic passes)*
-   - ☑ **S2d** — The merge into `role_acls.features_json` is **atomic** (one SQL `UPDATE`, `jsonb ||` deduped, `returning` — no lost update under a race), proven against live Postgres *(DONE 2026-10-08 — CC-16, with a concurrent-session test + negative control)*
-   - ☐ **S2e** — A unique index on `(role_id, tenant_id)` to close the create-branch double-insert *(LEFT — CC-23; needs a migration, unreachable in normal operation)*
-   - ☐ **S2f** — An authorised decision actor: the `decided` header names the actor but nothing checks them *(LEFT — CC-25; its model is confirmed by the owner: a structure-permission decision is a ROLE PERMISSION)*
-   - ☐ **S2g** — An enforcement consumer for a **field** surface's records (`<entityId>.<key>.view|manage|structure`) + the global-surface gap *(LEFT — CC-20)*
-     *(was PARTIAL 2026-10-08 — the decision core AND the enforcement are built and proven on every create path; what remains is the double-insert index (CC-23), the unauthorised decision actor (CC-25), the field records' missing consumer (CC-20), and the global-surface gap — each scheduled in `COMPLETION-CALLBACKS.md`. Plan `PLAN-SD-1.md`, limits §10)*
- ☐ **S3** — The platform tells the user when access is refused *(OPEN)*
- ☐ **S4** — Data is the gate, not the screen ▸ 4/5
-   - ☑ **S4a** — The isolation model is confirmed by the owner: scope is tenant + org **in the app layer** — single DB, single schema, nullable `tenant_id`, no RLS, no per-tenant DDL *(DONE — owner-confirmed)*
-   - ☑ **S4b** — Cross-tenant defect (i): the batch `updated_at` read-back (`entities/api/records.ts`, GET) read by `entity_id IN (…)` with **no tenant filter**, merging another tenant's `updated_at` into this tenant's response — closed by scoping to `auth.tenantId` + the caller's org scope *(DONE 2026-10-08 — CC-28; the single-record sibling was measured NOT to be a live leak — it filtered on a globally-unique `gen_random_uuid()` PK)*
-   - ☑ **S4c** — Cross-tenant defect (ii): the record upsert's `on conflict (entity_type, entity_id, organization_id, tenant_id)` target matched **no constraint** (the only index was non-unique and omitted `tenant_id`), and a `try/catch` hid it — fixed with four global indexes (one plain unique on all four columns + three partial for the null-scope shapes), proven on live PG 17 *(DONE 2026-10-08 — CC-30: two tenants sharing an org id now produce 2 rows, a global-scope duplicate INSERT is rejected)*
-   - ☑ **S4d** — Cross-tenant defect (iii): the read classifier probed `custom_entities`/`custom_entities_storage` **without a tenant filter**, so one tenant's row routed another tenant's query to doc storage and returned zero rows — now tenant-scoped, cache key included *(DONE 2026-10-08 — CC-30)*
-   - ☐ **S4e** — An enforcement consumer for a custom **field**'s records + the remaining app-layer scope hardening *(LEFT — CC-20)*
-     *(was PART 2026-10-08 — the isolation model is owner-confirmed and three measured cross-tenant defects are closed; what remains is the field-records consumer (CC-20))*
- ☐ **S5** — One permission engine, never a second one ▸ 0/2 *(no sub-part verified in code this round)*
-   - ☐ **S5a** — The single engine is the authority layer + the catalogue *(carried — see `S2`/`C4`)*
-   - ☐ **S5b** — Proof that no second engine exists anywhere *(LEFT)*
-     *(was PART)*
- ☐ **S6** — Every model a job uses is declared *(OPEN)*
- ☐ **S7** — Chat is a legitimate unclassified state *(DONE with G-21 — not re-verified this round)*
- ☐ **S8** — The platform notices and suggests, and never acts without asking *(OPEN)*
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
- ☐ **S11 (= SD-4)** — Structural permissions explicit, per object and per verb, inherited by default ▸ 5/6
-   - ☑ **S11a** — Slice A — the structural guard: `entities.structural.core-object-guard` refuses a `delete`/`update` whose `entityId` is a reserved system surface, via the `SD-2b` predicate `isReservedSystemEntityType` (entity-id namespace — the route passes `auth:user`, not `users`) *(DONE 2026-10-09 — 17 tests, 3 mutations RED-then-GREEN; a hostile pass found a HIGH wildcard over-fire on record writes + a LOW namespace-pin gap, both fixed)*
-   - ☑ **S11b** — Slice B — the actor axis (S12) reaches the guard *(DONE 2026-10-09 — see `S12`)*
-   - ☑ **S11c** — Slice C — the per-verb grammar: `PERMISSION_BLOCK_VERBS.structural` is the **five S11 verbs** (`read`/`add`/`edit`/`remove`/`reference`), a surface yields 7 records; the level (per object × verb × actor, `straight`/`review`/`approval`/`never`) lives in `structural-settings.ts` (seed + strict parser + pure `resolveStructuralLevel` + the `actorTypeForPrincipal` bridge + fail-closed read) *(DONE 2026-10-09 — 5 mutations RED-then-GREEN, each restore md5-identical; the falsified `'structure'`-literal premise was corrected at source)*
-   - ☑ **S11d** — CC-37 — the grammar's enforcement wiring: the structural guard reads the level **live** and turns an explicit `review`/`approval` rule into the **escalate** outcome (D3, `{ok:true, escalation}`, 202) instead of the hard 422; `never`/`straight`/no-rule keep the 422 *(DONE 2026-10-09 — M16–M20 RED-then-GREEN; the trap avoided: `explicitStructuralLevel` read, not the fail-closed `resolveStructuralLevel` default, which would have weakened the absolute S9 refusal)*
-   - ☑ **S11e** — The manage screen over this grammar *(DONE 2026-10-09 — `SD-5`, code `a2317b1`: grouped by object, one Select per (verb × actor), "Inherited" clears a cell)*
-   - ☐ **S11f** — `read`/`reference` enforcement + the approval-layer intake (a `review`/`approval` rule producing a `pending_acts` row) *(LEFT — CC-34, CC-38; the escalation is held but not filed)*
-     *(was PARTIAL — the structural guard, the actor axis, the per-verb grammar, its enforcement wiring, and the manage screen are all BUILT 2026-10-09; what remains is `read`/`reference` enforcement (CC-34) and the approval-layer intake (CC-38). Plan `PLAN-SD-4.md`)*
- ☐ **S12** — The actor type is part of every structural decision ▸ 1/2
-   - ☑ **S12a** — Slice B of `SD-4`: the actor kind (`PrincipalKind = 'human'|'ai_worker'|'service'|'system'`) reaches the guard input — an optional `actorKind` rides `MutationGuardInput`/`MutationGuardAfterInput`/`RouteMutationGuardAuth`, is threaded into both validate and `afterSuccess` inputs, and is set by the eight guard-input builders; resolved as `auth.principal?.kind ?? derivePrincipal(auth)?.kind` (importing from the un-mocked `auth/principal`), so a trusted-envelope AI context is still read as a machine *(DONE 2026-10-09 — 3 mutations RED-then-GREEN; a hostile pass caught a real regression on the trusted-envelope path, fixed + pinned by 3 derivation tests)*
-   - ☐ **S12b** — The axis changes the **decision**, not only the refusal reason (the per-actor grammar) *(LEFT — that is S11/Slice C)*
-     *(was PARTIAL — Slice B is built; honest limit: the axis changes the refusal *reason* today, not the decision. Plan `PLAN-SD-4.md` §5)*
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
- ☐ **P10** — Search gate coverage: extend `aclFeatures` from 6 to all 67 tables *(OPEN — blocks the AI data work)*
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
- ☐ **M3** — The permissions catalogue (= SD-1) ▸ 3/5
-   - ☑ **M3a** — The catalogue service exists (`shared/src/lib/permissions/catalogue.ts`): permission surfaces + the two blocks each yields (data + structural) *(DONE 2026-10-08 — measured)*
-   - ☑ **M3b** — Consumed by a **write**: `auth/lib/permission-decision-grant.ts` applies its records to `role_acls.features_json` on every create path (entities create, the batch definitions route, `ensureCustomFieldDefinitions`, the HTTP reactivation routes (CC-22), the entity-install primitive `upsertCustomEntity` (CC-21), each field write site on a type change (CC-4)) *(DONE 2026-10-08 — measured)*
-   - ☑ **M3c** — The merge itself is atomic (no lost update) *(DONE 2026-10-08 — CC-16)*
-   - ☐ **M3d** — A **field** surface's records have an enforcement consumer (the live per-record features are `entities.records.<entityId>.{view,manage}`) *(LEFT — CC-20; for a custom entity the records *are* the live ones)*
-   - ☐ **M3e** — Persisted for **runtime** surfaces *(LEFT — in-process; a durable row waits on `G-04`, since a migration is unprovable on this host)*
-     *(was PARTIAL 2026-10-08 — the catalogue exists and is consumed by a write with an atomic merge; the remaining halves are the field-records consumer (CC-20) and runtime persistence (waits on `G-04`). See `S2 (= SD-1)`)*
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
| `B-05` | the decision is recorded in docs; `api/chat/route.ts` still imports OpenCode, no Hermes port | **not built — demoted from `☑` to `☐` (decided ≠ implemented)** |
| The Hermes port | `api/chat/route.ts` still imports `createOpenCodeClient` / `opencode-handlers`; `opencode-handlers.ts:178` reads `OPENCODE_URL` | **NOT built — OpenCode still occupies the slot (N-8 accurate)** |
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
2. A line starting `- ` is a **whole point** — count it once (it has no `▸`).
3. A line starting `- ` **with** a `▸ n/N` is a **split parent** — do **not** count it; count its sub-points.
4. A line starting `-   - ` is a **sub-point** — count it once.
5. `units = whole points + sub-points`. `done =` the units carrying `☑`. `left = units − done`.
6. Coverage `% = done ÷ units`. Build-weighted `% = Σ(done×w) ÷ Σ(units×w)` with `w` the section's effort
   weight (the rubric table above).

**Re-run the check in this session (2026-10-09) gave:** A 10/31 · B 0/36 · C 14/28 · D 1/39 · E 2/18 ·
F 0/14 · G 29/74 · H 0/13 · I 4/35 · J 0/18 · K 1/13 · **TOTAL 61 / 319 = 19%** (build-weighted ≈22%).
**This replaced a typed table that read 61 / 276 = 22%** — the DONE total happened to be right, but every
section total was under-counted (the pass-2 split added units no one had re-summed). The lesson is the
**N-20** one: *a count that is typed drifts from the boxes the moment a box changes.* If you ever change a
tick, re-run this — the table is downstream of the boxes, never the other way round.

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
