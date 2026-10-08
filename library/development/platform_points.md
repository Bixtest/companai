# platform_points.md — every point the platform must have, and its true status

**Written:** 2026-10-07 · **Rewritten:** 2026-10-07 (basic form: one glyph per point, DONE or LEFT)
**Asked by:** the owner —
> *"create a checklist called platform_points.md where you list everything that needs to be in the
> platform, not with details but as micro broken down oneliners."*
> *"My goal… 1 track the platform progress so I see what is done and how much work left from a basic
> file that doesn't flood me with text. 2 identify claims made in other docs that everything is done
> when I can see not everything is ticked in my file. The important thing is to have strict rules to
> update this file that it is only tagging a task as done when it is done with 100% certainty —
> critically reviewed and verified in the codebase."*

---

## HOW TO READ THIS FILE (30 seconds)

- Every point is **one line**: `☐ **ID** — what it is *(reason if LEFT)*`.
- **`☑` = DONE.** The point is finished, and it was **verified in the code** — 100%, critically reviewed.
  Nothing else earns a tick.
- **`☐` = LEFT.** Either genuinely not done, or **a doc claims it is done but the code was not verified**.
  The parenthetical says which.
- **The total at the foot tells you the whole project in one glance.**

### The strict tick rule (owner's instruction, 2026-10-07 — this is the law of this file)

0. **Two different jobs, two different sources.** **The POINTS are built from the documents** — every
   line here comes from reading what the platform is supposed to contain (the vision, the registers,
   the backlog, the build order). **The TICK is built from the code** — a box is `☑` only after the
   code was opened or run and the point is *proved*. **Never tick from a document. A document is the
   source of the claim; the code is the only source of the tick.**
1. **A box is `☑` ONLY when the code was read/run and the point *and everything it depends on* is
   finished** — no bug, no missing prerequisite, no work left elsewhere for it to be true.
2. **Docs are not evidence.** A development document (or a developer) saying "done" does **not** tick
   the box. If the code does not back it, the box stays `☐`.
3. **A claim is a trigger to check, not a tick.** When another document claims a point is done, verify
   it **in the code**. If it holds → tick **and** record the evidence in §L. If it does not → leave `☐`,
   and note the disagreement in §L.
4. **Un-tick freely.** If a later change breaks a point, its box goes back to `☐` immediately. A stale
   `☑` is a defect in this file.
5. **Never a "partial" tick.** `PART` is `☐`. Only whole points are ticked, and only at 100%.
6. **Adding work is a bug fix.** A point that the sources require and this file lacks is a defect in
   this file — add it, and record where it came from.

**In one line: the documents tell you *what* must exist; only the code tells you *whether* it does.**

---

## PROGRESS AT A GLANCE

| Section | DONE | LEFT | Total |
|---|---:|---:|---:|
| A. Substrate (C1–C11) | 0 | 12 | 12 |
| B. Platform skeleton (P1–P18) | 0 | 18 | 18 |
| C. AI-first native layer | 14 | 10 | 24 |
| D. Hermes | 1 | 24 | 25 |
| E. Agent half | 0 | 17 | 17 |
| F. Model layer | 0 | 14 | 14 |
| G. Governance & security floor | 9 | 31 | 40 |
| H. Experience contracts | 0 | 13 | 13 |
| I. Business / domain packs | 1 | 17 | 18 |
| J. Deployment & operations | 0 | 14 | 14 |
| K. Dev-doc extras | 1 | 12 | 13 |
| **TOTAL** | **26** | **182** | **208** |

> **Read this honestly.** Only **26 of 208** points carry a tick, because the tick rule demands the code
> be verified — and most points have **not yet been re-verified in code this round**. A point marked
> `(DONE)` in its line but `☐` here means **the docs claim it, the code has not been checked** — treat
> it as **carried, not confirmed**. This is the whole purpose of this file: **the docs' word is not the
> tick.**

---

## A. THE SUBSTRATE — Ring 1, uncustomisable core (`CORE-BOUNDARY.md` C1–C11)

> **Fact-checked in the code 2026-10-07** — every line below was read against the source, not the docs.
> Verdicts: `NOT DONE` (no code), `PARTIAL` (real code, incomplete), `DONE` (verified, 100%).
> **No line in this section is `☑`** — and now that is a *measured* result, not a carried claim.

- ☐ **C1** — Resource envelope: the shape every object shares *(NOT DONE — no `ResourceEnvelope`/`BaseEntity`/shared base type anywhere in `shared` or `core`; each module declares its own `tenantId`/`organizationId` columns independently)*
- ☐ **C2** — Actor & context model: who is acting and in what context *(PARTIAL — substantial: `shared/src/lib/auth/principal.ts` (215 lines) is a real first-class `Principal` with 4 kinds (`human`/`ai_worker`/`service`/`system`), `onBehalfOfUserId`, machine predicates, and it replaced the old `startsWith('api_key:')` branching; what is missing is the wider **context** (org/locale/tz/trace) as one model)* · ★ Hermes: the seam every run crosses
- ☐ **C3** — Tenancy & isolation boundary: every row belongs to a tenant and cannot escape it *(PARTIAL — substantial: the CRUD factory auto-scopes by `tenantField` (default `'tenantId'`) on every read/write (`shared/src/lib/crud/factory.ts`); **no** DB-level RLS policies were found, so isolation is enforced in the query layer, not by the database)* · ★ Hermes: the tenant is derived, never declared
- ☐ **C4** — Authorization engine: the evaluator and grammar *(PARTIAL — `shared/src/lib/authority/` (1312 lines: `decision.ts` 582 · `shadow-report.ts` 217 · `shadow.ts` 215 · `graph.ts` 182 · `preflight.ts` 116) builds an explainable `Decision` with reasons, and it **is now called in the request path**: `AuthorityEnforcementService` (the command gate + the HTTP RBAC path, which subtract a refusal from an RBAC allowance) and — since `S-02`, code `3add3a2` — the **AI tool door** (`ai-assistant` `lib/tool-authority.ts`). Tenants run `off`/`shadow`(default)/`enforce`; `enforce` binds. **The header quote this row used to carry — "It does not enforce. Nothing calls it in the request path" — was corrected in `decision.ts` on 2026-10-08** (it had been stale since the command gate landed 2026-08-10). **Still PARTIAL because the *grammar* half is not built** — that is `SD-4`, and the data axis is `G-04`)* · ★ Hermes: S-02 is where a tool call is authorized — **now wired**
- ☐ **C5** — Metadata registry & schema conventions *(PARTIAL — the Business Model Kernel `shared/src/lib/kernel/model.ts` (407 lines) **reads** the platform's declarations into a canonical, id-keyed model with a 21-item per-object contract, and `entity-fields-registry` is registered at bootstrap; **the read-only registry service now exists** — `shared/src/lib/kernel/metadata-registry.ts` (2026-10-07, code `59ab859`) answers **what exists · what type · provenance · what depends on it** from the declarations, and returns a **typed absence** for the other ten §54 questions; it is a **live view** over the descriptor. **What is still missing:** the *schema-conventions* half (envelope/contract, `C1`) and the answers that need real links the platform does not yet have — **who can access it** (the authority engine is shadow-mode; SD-4 unbuilt), **what APIs expose it** (no route→object index), and the rest of §54. **And it is not yet consumed** — `SD-1`'s gate can now *enumerate*, but does not call it yet)* · ★ Hermes: how Hermes learns the shape of the business without a DB handle
- ☐ **C6** — Command / action contract: schema · permissions · side effects · risk · approval · idempotency *(PARTIAL — a real command bus exists (`shared/src/lib/commands/`: `command-bus.ts`, `types.ts`, `undo.ts`, `redo.ts`, `registry.ts`, `operationMetadata.ts`, interceptors, scopes); `types.ts` carries input/execute/undo/redo/capability; whether the *full* contract (risk · approval · idempotency) is uniform across every action was not established)*
- ☐ **C7** — Event envelope (CloudEvents-shaped) *(NOT DONE — the entire `shared/src/lib/events/` directory is `patterns.ts` + its test; there is **no envelope type** at all. A separate `packages/events` package exists but was not the envelope)*
- ☐ **C8** — Audit contract: every mutation records who · what · when · before · after · actor_type · trace *(PARTIAL — the `audit_logs` module is real (`packages/core/src/modules/audit_logs/`, with API, undo/redo, export, a mutation-guard, and a CLI); it records user/action/field/before/after/createdAt; `actor_type` and a request/trace id are not confirmed complete)*
- ☐ **C9** — Migration & versioning contract: plan → validate → migrate → verify *(NOT DONE — per-module MikroORM migration folders exist (`<module>/migrations`), but there is **no** plan/validate/verify contract: a grep for `planMigration`/`validateMigration`/`verifyMigration`/`migrationPlan` across `shared` and `core` finds nothing)*
- ☐ **C10** — Localization resolution: fallback chain + formatting contracts *(PARTIAL — `shared/src/lib/i18n/locale.ts` has a real resolution chain (`resolveLocaleFromCandidates`: requested → base-locale → null), plus `number.ts` and `date/format.ts`; but the specified five-step chain (requested → lang+region → lang → app default → platform) and the formatting **contracts** (as a contract, not helpers) are incomplete — GAP C)*
- ☐ **C11** — Error model: code · message · details · field_errors · retryable · trace *(NOT DONE — `shared/src/lib/crud/errors.ts` builds only `{ error: message }` (`badRequest`/`forbidden`/`notFound`/`conflict`); the tokens `field_errors`/`retryable` appear scattered across files, not as one canonical error model)*
- ☐ **Ring-1 enforcement** — no config key for core; migration contract the only door; a test asserts the core *(NOT DONE — no test asserting the core contracts was found, and the migration contract (C9) that was to be "the only door" does not exist)*

---

## B. THE PLATFORM SKELETON — the `P1`–`P18` register

- ☐ **P1 Identity & accounts** — users · sessions · password reset · consent · login *(DONE — the strongest module; not re-verified this round)*
- ☐ **P2 Tenancy & org structure** — tenants · organisations · hierarchy · scoping *(DONE — not re-verified this round)*
- ☐ **P3 Roles & permissions (RBAC/ACL)** — roles · grants · feature gates *(PART — two-table ACL real; the permissions catalogue now exists as a typed service (`SD-1`, 2026-10-08) but is not yet persisted for runtime surfaces nor consumed by a write)*
- ☐ **P4 Audit & compliance log** — who/when/which record; retention/export *(PART — read+create API, one viewer page)*
- ☐ **P5 Settings / configuration** — instance- and tenant-level *(DONE — `module_configs`; hosts the tier setting)*
- ☐ **P6 File / document storage** — attachments · partitions · backends *(DONE)*
- ☐ **P7 Notifications** — in-app + email + push, templates *(PART — templates code-defined, not user-editable)*
- ☐ **P8 Workflow / automation engine** — definitions · instances · steps · user tasks *(DONE)*
- ☐ **P9 Business rules engine** — declarative conditions → actions *(DONE)*
- ☐ **P10 Search / indexing** — full-text + vector *(PART — strong engine, thin UI, `aclFeatures` 6 of 67 tables)*
- ☐ **P11 Integrations & sync** — external systems · credentials · mapping · cursors *(PART — read+update only)*
- ☐ **P12 API keys / programmatic access** — machine auth *(PART — one composite route file)*
- ☐ **P13 i18n / localisation** — translation catalogue · locales *(PART — single-route API, one UI page)*
- ☐ **P14 Feature flags** — gradual rollout · kill switches *(DONE)*
- ☐ **P15 Dashboards / widgets / perspectives** — configurable views *(PART — tables+APIs exist, ZERO UI)*
- ☐ **P16 Custom fields / entity extension** — user-defined tables and columns *(DONE)*
- ☐ **P17 Background jobs / scheduler** — workers · queues · schedules *(PART — service+API, no UI)*
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
- ☐ **Vision** — Business Model Kernel object list (31 objects + 4 contracts) *(PART)*
- ☐ **Vision** — Core data vs capability data: one business universe, no DB islands *(PART)*
- ☐ **Vision** — Schema compiler: model → DB + API + UI + AI + MCP + skills + docs + tests *(OPEN — pieces exist, no single compiler)*

---

## D. HERMES — the agent runtime and its joints

- ☐ **B-05** — Runtime boundary decided: Hermes a supervised private Python runtime behind one typed port; headless *(DECIDED in docs — but the code has no Hermes port yet; OpenCode still occupies the slot, so NOT ticked)*
- ☐ **Port** — The typed port (`describeCapabilities` · `startRun` · `streamRun` · `cancelRun` · `steerRun` · `resumeConversation` · `resolveToolCall` · `completeRun`) *(OPEN —**verified not built**; OpenCode still occupies the slot)* · ★ Hermes: the only door
- ☐ **Port** — The admitted envelope: server-minted identity, secret *references*, distinct ids *(OPEN)*
- ☐ **Port** — Failure is normal: `cancelRun` bounded+idempotent, `completeRun` replay-safe *(OPEN)*
- ☐ **N-8** — Displace OpenCode: build the port, move the chat route, *then* delete OpenCode *(OPEN — rewire first)*
- ☐ **Hermes id** — `ai_worker` principal derived server-side; no branch on `kind` in own files *(PART — seam built, must extend + enforce)*
- ☐ **AH-1** — The five agent kinds on the agent definition *(OPEN)*
- ☐ **Tool door** — One door only: in-process client + tool registry/executor/mcp-adapter; every call re-authorizes; no DB handle *(PART)*
- ☑ **S-02** — Tool-call authorization at execution time, deny-by-default *(DONE 2026-10-08, code `3add3a2`)* · ★ Hermes: where a tool call is allowed or denied
- ☐ **G-06** — AI input/output guards + the context firewall (prompt-injection + exfiltration) *(OPEN)*
- ☐ **Provider** — Provider choice and fallback; allowlist and local/cloud rule stay ours *(PART)*
- ☐ **Sessions** — Session continuity as a projection keyed by our ids; our records canonical *(PART)*
- ☐ **Memory** — Long-lived tenant-scoped memory artifact with consent, export, retention, deletion *(MISSING)*
- ☐ **AH-9** — Governed skills catalog: provenance · scan · version · approve · pin · roll back · revoke *(MISSING)* · ★ Hermes: "Hermes learns as you go"
- ☐ **Subagents** — Bounded child runs with budgets, deadlines, cancellation, trace *(MISSING)*
- ☐ **Channels** — Rooms own identity; Hermes channels are adapters, never a second inbox *(PART)*
- ☐ **Runtime state** — Isolated per tenant and agent; export, backup, delete, retention *(MISSING)*
- ☐ **Scheduling** — Our scheduler owns every business job; Hermes cron runtime chores only *(PART)*
- ☐ **Sandbox** — Disposable, quota-bounded, network-policed worker *(PART — highest risk)*
- ☐ **Phase 0** — Pin the Hermes source digest + a compatibility harness *(OPEN)*
- ☐ **Phase 0** — State the licence position, including optional components *(OPEN — V-09 gates adoption)*
- ☐ **Never 1** — A model-widened grant *(invariant — must hold)*
- ☐ **Never 2** — A secret in a prompt, a log or an instruction *(invariant — must hold)*
- ☐ **Never 3** — A business mutation outside the typed command path and its approval *(invariant — must hold)*
- ☐ **Never 4** — A second identity plane *(invariant — must hold)*

---

## E. THE AGENT HALF — `AH-1`–`AH-12`

- ☐ **AH-1** — The agent as a kernel object: `kind` · `owner` · `actsAs` · `role` · `runtime` · `autonomy` *(OPEN — the only agent item on the critical path)*
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
- ☑ **AI-USERS** — AI actors are **first-class principals** (owner-confirmed 2026-10-08): one principal vocabulary (`human`/`ai_worker`/`service`/`system`), an AI actor is a real DB row — `api_keys.principal_kind = 'ai_worker'` (`api_keys/data/entities.ts:52-53`; migration `Migration20260812180000.ts:32`; validator `api_keys/data/validators.ts:33`; persisted `api/keys/route.ts:126`) — that holds roles, delegations, trust grants and denials, because the authority tables key on a **principal, not a user FK**. **Verified**, two routes each (entity + migration; type + consumer). **BUT the "AI user tick" has no UI** — the shipped create page exposes no `principalKind` control, so an AI worker can only be marked by API/CLI (**CC-26**, approved, startable). And an AI user cannot yet be **bound** to an agent — the actor and the code-declared agent are joined only by a caller-supplied string (**CC-27**, approved). *What must NOT unify:* the **agent** (tools/prompt/loop) stays code-declared — the registry (`agent-registry.ts`) reads an in-memory Map, never the DB, so a DB-only agent is invisible to `runAiAgent*` (measured); and machine subjects (`ai_worker:<id>`) cannot satisfy the six **uuid FKs to `users`** (already crashed once — `Migration20260813090000.ts:6-13`). Evidence: [`../analysis/ANSWER-2026-10-08-organisational-questions.md`](../analysis/ANSWER-2026-10-08-organisational-questions.md) §1, [`../analysis/ai-users-vs-normal-users-2026-10-08/FINDINGS.md`](../analysis/ai-users-vs-normal-users-2026-10-08/FINDINGS.md). · **★ Hermes:** the map §4.4 (c) — this is the *credential/identity* half of the agent half; every `AH-` item that needs an "AI user" hangs off it.

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

- ☐ **S1** — Every architectural change is gated and inspected before it is applied *(PART)*
- ☐ **S2 (= SD-1)** — Every architectural change answers the permissions question: catalogue + fail-closed gate *(PARTIAL 2026-10-08 — the **decision core AND the enforcement are built and proven, on every create path**: the permission catalogue (`shared/src/lib/permissions/catalogue.ts` — surfaces + the two blocks they yield) and a pure fail-closed gate (`structure-change-gate.ts`), a `MutationGuard` hook on the entities `create` path, and **the write** (`auth/lib/permission-decision-grant.ts` — applies the gate's `defaulted` records to the tenant's grant role's `role_acls.features_json`, idempotent set-union, S5), wired in the guards' `afterSuccess` and carried from `validate` to `afterSuccess` by the real runner, **run directly by the batch definitions route** for the columns it creates (the registry maps that route to `'update'` and its payload carries no field list, so the gate runs where the create is actually known), **run in the shared primitive `ensureCustomFieldDefinitions`** (`entities/lib/field-definitions.ts`, the choke point behind seven callers) **plus the `add-field` CLI** for the non-request paths, **run at the three HTTP reactivation routes** (`api/definitions.ts` + `api/definitions.restore.ts` — a tombstoned **field** brought back is a surface re-appearing — **and the entity twin**, `api/entities.ts`, gated at the route from the before-state (`!isActiveEntity(ent) && (input.isActive ?? true)`), refusing fail-closed **422**, records written after the flush — **CC-24, 2026-10-08**), gated from the before-state at the route and granted after the flush, **CC-22, built 2026-10-08**), **and run in the primitive `upsertCustomEntity`** (`entities/lib/register.ts`, the module-install choke point — a custom **entity** appearing is a surface appearing, gated before the row and granted after the flush, with the live `entities.records.<id>` records, **CC-21, built 2026-10-08**), **and at all three field write sites on a type change** (`existing.kind !== incoming.kind` — a re-typed field is a surface changing shape; the before-state exists at each write site so no guard-contract change was needed, **CC-4, built 2026-10-08**) — **and the merge into `role_acls.features_json` is now atomic** (one SQL `UPDATE`, `jsonb ||` deduped by `group by elem` with first-occurrence order, `returning` so the DB is the source of truth — no lost update under a race, **CC-16, built 2026-10-08**, proven against live Postgres with a negative control) — deciding before the create and granting after the flush; **and the batch path's reserved-key check is restored** (the route now names every key it writes, `keys: definitions.map(d => d.key)`, and the two key guards read the list via the new `readFieldKeys` helper; measured — a malformed key was already refused by zod 400 before the guard on both routes, so the *reserved* key was the real hole, **CC-18, built 2026-10-08**) — **and the `decided` outcome is now reachable and writable** (a caller may *state* the decision instead of accepting the default: the carrier `structure-change-decision-header.ts` reads a three-way `x-om-ext-permissions-decision` header — `absent`/`malformed`/`decision` — fail-closed (malformed is **400**, never silently defaulted), and a **stated** decision grants the records to the role it names (`grantTo`, defaulting to `superadmin`); the two write sites that only accepted `defaulted` now **also** write a `decided` decision — the **guard** path (read from `input.requestHeaders` in `validate`, carried to `afterSuccess`) and the **three HTTP route** paths (read from `req.headers`; malformed → 400 before any transaction); the third primitive path (`register.ts`) and the field choke point correctly **cannot** see a request header and so still default — measured by the route tests, the guard tests and the direct-primitive tests, **CC-17, built 2026-10-08**) — 117 tests, 48 mutations RED-then-GREEN across ten slices, `shared` 197/2329 (8 known host failures — CC-19), `core` 626/5427, typecheck 0; eight hostile-critic passes + two mutation/premise-found defects (twenty-six defects, all fixed or named). **Still PARTIAL**: the create-branch double-insert (no unique index on `(role_id,tenant_id)` — CC-23, unreachable in normal operation), ~~a custom **entity**'s HTTP reactivation is ungated (its gate is `operations:['create']` but the route maps a reactivation to `update` — CC-24)~~ ✅ **closed 2026-10-08 (CC-24)**, **no one is authorised** to make a structure-permission decision (the header names the actor but nothing checks them — CC-25), a **field**'s records have no enforcement consumer (CC-20), and a global surface has no tenant to grant in — each scheduled in `COMPLETION-CALLBACKS.md`. **CC-25's model is CONFIRMED by the owner (2026-10-08): a structure-permission decision is a ROLE PERMISSION** — the platform's own model (`role_acls.features_json`), so *who may decide a new surface's permissions* is a permission string a superadmin grants; this is now a build, not an open policy (item 14 of `PLAN-SD-1.md` §10). Plan `PLAN-SD-1.md`, limits §10)*
- ☐ **S3** — The platform tells the user when access is refused *(OPEN)*
- ☐ **S4** — Data is the gate, not the screen *(PART — scope is tenant + org only today)*
- ☐ **S5** — One permission engine, never a second one *(PART)*
- ☐ **S6** — Every model a job uses is declared *(OPEN)*
- ☐ **S7** — Chat is a legitimate unclassified state *(DONE with G-21 — not re-verified this round)*
- ☐ **S8** — The platform notices and suggests, and never acts without asking *(OPEN)*
- ☐ **S9 (= SD-2)** — Core functions ship by default and cannot be deleted *(OPEN — startable)*
- ☐ **S10** — Every standard has a home in code, and drift is a defect *(PART)*
- ☐ **S11 (= SD-4)** — Structural permissions explicit, per object and per verb, inherited by default *(OPEN)*
- ☐ **S12** — The actor type is part of every structural decision *(OPEN)*
- ☐ **SD-5** — The structural-permission manage screen (the roles-style surface over S11) *(OPEN — a UI surface, absent)*
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
- ☐ **GAP B** — The true-core vs domain-pack boundary as a contract *(PART — `CORE-BOUNDARY.md` written; not yet a contract)*
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
- ☐ **B7 HR / people (`staff`)** — people · teams · leave · time; payroll absent *(PART)*
- ☐ **B8 Projects / PSA (`planner`)** — availability rules; no project accounting/billing *(PART)*
- ☐ **B9 BI / analytics (`query_index`, `dashboards`)** — engine yes, screens no *(PART)*
- ☐ **B10 Shipping (`shipping_carriers`)** — webhook-driven, minimal UI *(PART)*
- ☐ **B11 Payments (`payment_gateways`)** — gateway transactions + workers, minimal UI *(PART)*
- ☐ **B12 Currencies (`currencies`)** — FX *(DONE)*
- ☐ **B13 Email / messaging (`messages`, `inbox_ops`, `communication_channels`)** *(DONE)*
- ☐ **B14 Customer portal (`portal`, `customer_accounts`)** *(PART — `customer_accounts` duplicates `auth`; N-6 says remove)*
- ☐ **M3** — The permissions catalogue (= SD-1) *(PARTIAL 2026-10-08 — the catalogue service exists (`shared/src/lib/permissions/catalogue.ts`): permission surfaces + the two blocks each yields (data + structural), populated from declarations and extended by runtime surfaces. It is now **consumed by a write** (`auth/lib/permission-decision-grant.ts` applies its records to `role_acls.features_json` on the entities create path, **on the batch definitions route**, **in the non-request primitive `ensureCustomFieldDefinitions`**, **at the HTTP reactivation routes (CC-22)**, **in the entity-install primitive `upsertCustomEntity` (CC-21)**, **at each field write site on a type change (CC-4)**, **and the merge itself is atomic (CC-16)**). **Caveat, measured:** a **field** surface's records (`<entityId>.<key>.view|manage|structure`) are written but have **no enforcement consumer** — the live per-record features are `entities.records.<entityId>.{view,manage}` (`CC-20`); for a **custom entity** the records *are* the live ones (the surface supplies the `entities.records.<id>` prefix). **Still not persisted** for runtime surfaces (in-process; a durable row waits on `G-04`, since a migration is unprovable on this host). See `S2 (= SD-1)`)*
- ☑ **M4** — The generated guard registry (= D0) *(DONE)*
- ☐ **M5** — Dashboard / perspective screens (= P15) *(OPEN)*
- ☐ **N-6** — `customer_accounts` duplicates `auth` — an island to remove *(OPEN)*

---

## J. DEPLOYMENT & OPERATIONS

- ☐ **S0** — The local dockerised trio comes up whole *(DONE — 8 containers healthy; not re-verified this round)*
- ☐ **Deploy** — The Companai platform deployment (compose project, image, reverse proxy) *(DONE — documented in RUNBOOK)*
- ☐ **Deploy** — The running image predates the guard sweep — a redeploy ships the fixes *(OPEN)*
- ☐ **Hermes svc** — The `hermes` service needs a healthcheck *(OPEN)*
- ☐ **Blueprint App. B** — The twenty non-negotiable design rules adopted *(PART — most aligned, some GAPs)*
- ☐ **Observability** — Trace/context envelope crossing every execution boundary *(OPEN)*
- ☐ **Versioning** — API and event contracts versioned *(PART)*
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
| `S2` `SD-1` `M3` | ran the permissions suites (catalogue 13, gate 19, guard 17, decision-header 28) + the write/mapping suites (19) + the batch slice (16) + the non-request slice (19) + the reactivation slice (9) + the entity-install slice (7) + the re-type slice (6) + the atomic-merge slice (1) + the batch-key slice (7); **eight hostile-critic passes + two mutation/premise-found defects (twenty-six defects, all fixed or named)**; **48 mutations RED-then-GREEN across ten slices**, each restore md5-verified — **plus the atomic merge proven against live Postgres 17 with a concurrent-session test and a negative control** | **117 tests; `shared` 197 / 2329 (8 fail in the one suite of CC-19); `core` 626 / 5427; typecheck 0 — and the records ARE written on every create path, every reactivation path, the field re-type case, and a **stated (`decided`) decision**, with an atomic (no-lost-update) merge and the batch key validation restored — but still **PARTIAL**: the create-branch double-insert (needs a migration — CC-23), the custom entity's ungated HTTP reactivation (CC-24), the unauthorised decision actor (CC-25), the field records' missing enforcement consumer (CC-20), and the global-surface gap — each scheduled in `COMPLETION-CALLBACKS.md`** |

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
| `C4` Authz engine | `shared/src/lib/authority/` (1312 lines) builds an explainable `Decision`, and it **is called in the request path** — the command gate, the HTTP RBAC path, and (since `S-02`, `3add3a2`) the AI tool door; the header quote this row used to carry was corrected in `decision.ts` on 2026-10-08 | **PARTIAL** — the *grammar* half (`SD-4`) is not built |
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
