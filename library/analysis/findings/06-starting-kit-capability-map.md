# Batch 6 — STARTING-KIT: what it already provides

**Batch:** 6 of 12 · **Status:** complete · **Date:** 2026-10-04
**Input:** our platform today — `workspace/starting-kit/` (Open Mercato 0.6.7 forked,
trimmed, plus our own governance layer).
**Question this batch answers:** What does our fork actually give us today, module by
module — **and how much of the target does it already pay for?**

**Definition of done (from `PLAN.md`):** *every module has a one-line purpose, a state and a
maturity level, or is explicitly listed as unknown; no module silently omitted — and the
reuse question has an evidenced answer rather than an impression.*

---

## 0. How to read this report

Everything here is **measured from the code**, not from a document. Where a number comes
from a written record instead, it says so and gives the date. **`M-nn`** are the measured
facts about our own platform, each with the file or command it came from. **`R-nn`** are the
reuse verdicts. The batch's two questions are answered in **§16** (do we have database
islands?) and **§17** (what do we customise, what must we build?).

**Maturity vocabulary** (fixed by the plan, used exactly):

| Level | Meaning |
|---|---|
| **Running and tested** | Enabled, in the gate, has tests that run |
| **Running, untested** | Enabled and in the gate, but thin or no tests |
| **Present but parked** | Source on disk, switched off; **not compiled, not tested** |
| **Absent** | Not in the repository at all |

---

## 1. What was read, and how big it is

| Source | Size |
|---|---|
| `workspace/starting-kit/packages/` | **21 packages** |
| …of which are module-bearing | 13 |
| `packages/core/src/modules/` | **38 directories** (+ `__tests__`) |
| `packages/shared/src/modules/` | **34 entries** (+ `__tests__`) |
| Source lines (packages + apps, excluding tests) | **847,808** |
| `@Entity` classes across all packages | **225** |
| Explicit `tableName:` declarations | **262** |
| Test files | **2,882** |
| Locales | **5** — `ar, de, en, es, pl` |

**Written records read and cross-checked** (not trusted on their own): `PROGRESS.md`,
`COOKBOOK.md`, `references/parked-modules.md`, `references/salvage-analysis.md`,
`references/completed-work.md`, and 21 files under `knowledge/` — including
`test-gate.md`, `module-lifecycle.md`, `authority-overview.md`,
`scope-tenant-organization.md`.

**The plan's own two numbers were checked and are correct:** `core/src/modules` holds **39**
entries (38 modules + `__tests__`), `shared/src/modules` holds **35** (34 + `__tests__`).

---

## 2. The shape of the codebase, measured

### 2a. Size by package (source lines, excluding tests)

| Package | Lines | State |
|---|---:|---|
| `core` | 531,632 | **enabled** — 25 modules on, 11 parked inside it |
| `ui` | 78,661 | enabled — the React component library |
| `ai-assistant` | 43,213 | enabled — the AI runtime |
| `shared` | 39,832 | enabled — **the authority kernel lives here** |
| `cli` | 27,037 | enabled — the generator and migration runner |
| `search` | 18,032 | enabled |
| `checkout` | 14,203 | **parked** |
| `sync-akeneo` | 9,654 | **parked** |
| `scheduler` | 6,027 | enabled |
| `webhooks` | 5,425 | enabled |
| `onboarding` | 2,534 | enabled |
| `channel-imap` | 2,218 | enabled |
| `storage-s3` | 2,011 | optional (behind `OM_ENABLE_STORAGE_S3`) |
| `create-app` | 2,021 | enabled — the scaffolder |
| `cache` | 1,944 | enabled |
| `gateway-stripe` | 1,736 | **parked** |
| `channel-gmail` | 1,720 | enabled |
| `queue` | 1,597 | enabled |
| `events` | 1,340 | enabled |
| `content` | 371 | enabled |
| `eslint-plugin-ds` | 0 | design-system lint plugin |
| `apps/mercato` | 19,380 | the application shell |
| **Total** | **847,808** | |

### 2b. Modules on and off — the one list that decides it

`apps/mercato/src/modules.ts` is the authority. **35 modules are enabled:**

`dashboards · auth · directory · perspectives · entities · configs · query_index ·
audit_logs · attachments · api_keys · dictionaries · content · onboarding · api_docs ·
business_rules · feature_toggles · workflows · search · currencies · planner · events ·
notifications · progress · integrations · data_sync · messages · communication_channels ·
ai_assistant · translations · scheduler · inbox_ops · channel_imap · channel_gmail ·
webhooks · ratelimit_probe`

**14 modules are parked** (switched off, source kept): `customers · catalog · sales · wms ·
shipping_carriers · payment_gateways · sync_excel · customer_accounts · portal · staff ·
resources · checkout · gateway_stripe · sync_akeneo`.

**Three more are gated, not parked:** `example` and `example_customers_sync` (behind
`OM_ENABLE_EXAMPLES`, off by default) and `storage_s3` (behind `OM_ENABLE_STORAGE_S3`).

**Measured table count.** `@Entity` classes = **225**; explicit `tableName:` = **262**. On a
clean database the record says **263 tables before parking → 136 after** (`COOKBOOK.md`
line 513, measured 2026-08-08). **Two routes, reconciled:** counting only currently-enabled
modules gives **133** `tableName:` declarations today, against the recorded **136** — a
**3-table difference explained by tables added after 2026-08-08** (the authority-kernel
batches added `authority_projects`, `authority_project_memberships`, `authority_project_records`
and others; the git log confirms `auth/data/entities.ts` changed repeatedly through August).
The all-modules number matches (262 measured vs 263 recorded). **The claim stands, with its
date.**

**`PARK` means frozen, not maintained.** A parked module is not compiled and its tests do
not run. That is **553 test files** (520 in the 11 parked core modules + 33 in the 3 parked
packages) that are on disk but silent. A module restored after months will need bringing up
to the current contract.

---

## 3. The module inventory — every module, its state, its maturity

One line each. **State** = on/parked. **Maturity** = the four levels above. `tests` = test
files measured in that module.

### 3a. Core modules — enabled (25)

| Module | What it does | Entities | tests | Maturity |
|---|---|---:|---:|---|
| `auth` | **Identity, sessions, RBAC, and the whole governance layer** (see §4) | 21 | 78 | **Running and tested** |
| `audit_logs` | Access log, action log, and the **hash-chained ledger** | 3 | 15 | **Running and tested** |
| `directory` | **Tenants and organizations** — the tenant boundary and the org graph | 3 | 27 | **Running and tested** |
| `entities` | Custom-field definitions, custom entities, encryption maps | 8 | 31 | **Running and tested** |
| `query_index` | The search index tables and indexers | 15 | 23 | **Running and tested** |
| `messages` | Unified inbox; the object-link registry (batch 4) | 5 | 55 | **Running and tested** |
| `communication_channels` | Channel hub bridging Slack/WhatsApp/email to Messages | 8 | 58 | **Running and tested** |
| `inbox_ops` | Inbox operations and AI-assisted triage | 5 | 35 | **Running and tested** |
| `workflows` | Workflow engine — definitions, instances, steps, activity executor | 7 | 44 | **Running and tested** |
| `business_rules` | Declarative rules engine over entities | 4 | 18 | **Running and tested** |
| `integrations` | External integration registry and credentials | 4 | 16 | **Running and tested** |
| `data_sync` | Sync jobs between systems | 4 | 18 | **Running and tested** |
| `attachments` | File storage, library, per-entity attachments | 2 | 25 | **Running and tested** |
| `currencies` | Currency and exchange-rate master data | 3 | 22 | **Running and tested** |
| `dictionaries` | Platform-wide controlled vocabularies | 2 | 15 | **Running and tested** |
| `feature_toggles` | Feature flags with defaults | 2 | 14 | **Running and tested** |
| `configs` | **Per-tenant module configuration** (`module_configs`) | 2 | 7 | **Running and tested** |
| `dashboards` | Dashboard layout and the KPI widget host | 9 | 15 | **Running and tested** |
| `perspectives` | Saved views / layout perspectives per role and user | 2 | 7 | **Running and tested** |
| `notifications` | Notification types and handlers | 1 | 9 | **Running and tested** |
| `translations` | Translation management | 1 | 16 | **Running and tested** |
| `planner` | Scheduling/calendar primitive | 2 | 13 | **Running and tested** |
| `progress` | Long-running progress reporting | 1 | 3 | Running, lightly tested |
| `api_keys` | Machine credentials — **an API key is a Principal** | 1 | 6 | **Running and tested** |
| `api_docs` | OpenAPI documentation surface | 0 | 2 | Running, lightly tested |

### 3b. Core modules — parked (11)

| Module | What it does | Entities | tests (frozen) |
|---|---|---:|---:|
| `customers` | Full CRM — people, companies, deals, pipelines, activities | 27 | 208 |
| `sales` | Orders, quotes, invoices | 30 | 70 |
| `catalog` | Product catalogue | 13 | 65 |
| `customer_accounts` | **Customer portal identity** — a second auth stack; owns `domain_mappings` | 10 | 55 |
| `staff` | HR staffing model | 13 | 33 |
| `wms` | Warehouse management | 9 | 38 |
| `shipping_carriers` | Carrier integrations | 3 | 16 |
| `payment_gateways` | Payment-provider registry | 4 | 9 |
| `sync_excel` | Excel import/export adapter | 1 | 12 |
| `portal` | Customer-facing portal (requires `customer_accounts`) | 0 | 5 |
| `resources` | Resource booking (requires `planner`) | 6 | 9 |

### 3c. Package modules (13)

| Package | Module | State | tests | Maturity |
|---|---|---|---:|---|
| `ai-assistant` | `ai_assistant` | on | 99 | **Running and tested** |
| `search` | `search` | on | 25 | **Running and tested** |
| `scheduler` | `scheduler` | on | 17 | **Running and tested** |
| `onboarding` | `onboarding` | on | 15 | **Running and tested** |
| `webhooks` | `webhooks` | on | 14 | **Running and tested** |
| `events` | `events` | on | 8 | **Running and tested** |
| `channel-imap` | `channel_imap` | on | 8 | **Running and tested** |
| `channel-gmail` | `channel_gmail` | on | 6 | **Running and tested** |
| `content` | `content` | on | 4 | Running, lightly tested |
| `storage-s3` | `storage_s3` | optional | 8 | **Running and tested** |
| `checkout` | `checkout` | **parked** | 16 (frozen) | Present but parked |
| `sync-akeneo` | `sync_akeneo` | **parked** | 9 (frozen) | Present but parked |
| `gateway-stripe` | `gateway_stripe` | **parked** | 8 (frozen) | Present but parked |

### 3d. Non-module packages

`shared` (the authority kernel — §4), `ui` (the component library — §13), `cli` (generator +
migration runner, incl. the advisory-lock migration guard), `queue` (async/local strategies,
worker registry/runner), `cache`, `create-app` (scaffolder), `eslint-plugin-ds`.

**No module was silently omitted.** Every directory under `packages/*/src/modules` and
`core/src/modules` appears above or is a non-feature holder (`core/__integration__`,
`widgets/lib`, `shared/lib/modules`).

---

## 4. The governance layer — the part the vision overlaps most

**This is the product.** The rest of the repository is a business platform we forked; this is
the part that does not exist anywhere else. **Measured structure:**

| Piece | File |
|---|---|
| **The resolver** — returns a `Decision` with a gate, reasons, binding rule, obligations | `shared/src/lib/authority/decision.ts` |
| **The org-graph rules**, as pure functions | `shared/src/lib/authority/graph.ts` |
| **Preflight** — resolve a whole plan into one batched decision | `shared/src/lib/authority/preflight.ts` |
| **Shadow mode** + shadow report | `shared/src/lib/authority/shadow.ts`, `shadow-report.ts` |
| Effect classes E0–E6, task grades G0–G4, the autonomy matrix, data-class floors | `shared/src/modules/capabilities.ts` |
| Trust tiers T0–T4 | `shared/src/modules/trust.ts` |
| Record locks (open/restricted/locked) | `shared/src/modules/record-locks.ts` |
| Tenant-declared authority policy | `shared/src/modules/authority-policy.ts` |
| Delegations · denials · project overlays · event visibility · overrides | `shared/src/modules/{delegations,denials,project-overlays,visibility,overrides}.ts` |
| Enforcement (per-tenant mode) | `core/…/auth/services/authorityEnforcementService.ts` |
| Held acts and reviews | `core/…/auth/services/pendingActService.ts` |
| Delegations · denials · trust · projects · record locks (services) | `core/…/auth/services/{delegation,denial,trust,project,recordLock}Service.ts` |
| RBAC | `core/…/auth/services/rbacService.ts` |
| **The hash-chained ledger** | `core/…/audit_logs/services/ledgerService.ts` |
| Access log · action log | `core/…/audit_logs/services/{accessLog,actionLog}Service.ts` |

**The gates bind:** A0 blocked · A1 propose · A2 approve-first · A3 hold-then-commit-unless-vetoed
· A4 act-then-review · A5 act-and-log. **Enforcement can only narrow** — it runs *after* the
RBAC check has already said yes, so no arrangement of rules can grant something not already
held.

**Six governance API route groups exist and are served:**
`auth/api/authority/{delegations,denials,pending-acts,projects,record-locks,trust}`. The
approvals queue is a real screen (`/backend/authority/approvals`).

**The honest caveats, carried from batch 5 and re-measured here:**
- **Default mode is `shadow`** — the resolver runs, records what it *would* do, and changes
  nothing. RBAC still decides. So the kernel is **not yet the enforcement point.**
- **Five of the resolver's ten inputs are read but not supplied** at runtime (task grade,
  trust, delegation, record lock state, tenant policy) — audited 2026-08-10; each absence can
  only make the answer *more* permissive than the design intends, never more than RBAC allows.
- **Command → capability mapping is 98%** (55 of 56 live commands gated), up from 38%.
- **No field/record/value-level authorization** (§17).

**Maturity: running and tested.** 78 test files in `auth` alone; `shared`'s suite is the
authority kernel's.

---

## 5. The data layer

| Piece | Measured |
|---|---|
| ORM | **MikroORM** — `@Entity({ tableName })` decorators, one class per table |
| Entities | **225** classes; **262** explicit table names |
| Tables on a clean DB | **136** (recorded 2026-08-08; 133 measured in enabled modules today) |
| Migrations | Per-module migration tables (`mikro_orm_migrations_<module>`) |
| Migration safety | **Session-level Postgres advisory lock** (key `8147290361`) so two boots cannot race |
| Custom fields | The `entities` module — `custom_field_defs`, `custom_entities`, `custom_entities_storage`, `custom_field_values` |
| Encryption | `encryption_maps` + KMS + `tenantDataEncryptionService` |
| Tenant scope | Enforced in the **query engine**: `QueryEngine: tenantId is now required for all queries` |
| Relationship layer | **Thin** — `defineLink` appears in **1** file; 6 `data/extensions.ts` files total |
| **Row-Level Security** | **Absent** — no `ROW LEVEL SECURITY` anywhere in the source |

**Maturity: running and tested.** The migration runner is drift-guarded and was verified
against a real database under contention on 2026-08-10.

**The one structural fact that matters for the vision:** the relationship fabric is **thin**.
Cross-module relationships are declared in only a handful of `extensions.ts` files. The vision
makes relationships first-class (Doc 5 — 14 declared attributes, a connectivity model); we
have per-module tables joined ad hoc.

---

## 6. `packages/ai-assistant` — what it does today

**43,213 source lines, 99 test files.** This is a real AI runtime, not a stub. Measured
capabilities, from `lib/`:

| Area | Files (measured) |
|---|---|
| **Agent runtime** | `agent-runtime.ts`, `agent-registry.ts`, `agent-policy.ts`, `agent-tools.ts`, `agent-transport.ts`, `ai-agent-definition.ts` |
| **LLM access** | `llm-adapters/`, `model-factory.ts`, `model-allowlist.ts`, `llm-bootstrap.ts`, `openai-compatible-presets.ts`, `ai-sdk.ts` |
| **MCP** | `mcp-client.ts`, `mcp-server.ts`, `mcp-tool-adapter.ts`, `mcp-server-config.ts`, `mcp-dev-*.ts` |
| **Tools** | `tool-registry.ts`, `tool-executor.ts`, `tool-loader.ts`, `tool-search.ts`, `api-backed-tool.ts` |
| **Approvals / held acts** | `pending-action-executor.ts`, `pending-action-recheck.ts`, `pending-action-client.ts`, `prepare-mutation.ts` |
| **Context** | `entity-graph.ts`, `entity-index.ts`, `scope-injection.ts`, `session-memory.ts`, `prompt-composition-types.ts` |
| **Safety** | `sandbox.ts`, `rate-limit.ts`, `log-redaction.ts`, `baseurl-allowlist.ts`, `auth.ts` |
| **Cost** | `token-usage-recorder.ts`, `usage-serialization.ts` |
| **Conversation** | `conversation-storage.ts` |

**The `ai-tools/` directory ships three packs:** `attachments-pack.ts`, `meta-pack.ts`,
`search-pack.ts` — i.e. the built-in tools are about files, platform metadata and search.

**The AI API surface is real:** `/ai/chat`, `/ai/agents`, `/ai/agents/[id]/{models,mutation-policy,prompt-override,loop-override}`,
`/ai/conversations`, `/ai/actions/[id]/{confirm,cancel}`, `/ai/run-object`.

**The critical gap for the vision — the agent/tool surface lives mostly in parked modules.**
`ai-agents.ts` and `ai-tools/` exist in exactly two core modules, **`catalog` and `customers`,
both parked.** So the *platform-specific* AI agents that upstream ships are **switched off**.
What is enabled is the **generic runtime** (`ai_assistant`) plus its three tool packs.

**Maturity: the runtime is running and tested; the domain agents are present but parked.**

---

## 7. Search and retrieval

`packages/search` — **18,032 lines, 25 test files.** Structure: `fulltext/`, `vector/`,
`indexer/`, `strategies/`, `queue/`, `lib/`, `service.ts`.

- **Three strategies** declared: `tokens`, `vector`, `fulltext` (weighted, combinable).
- **Vector drivers:** `pgvector`, `qdrant`, `chromadb`.
- The `query_index` module supplies the index tables and indexers.

**Maturity: running and tested.** This is a genuine hybrid search subsystem — a **shortcut**
for the vision's retrieval needs, subject to the tenancy question (§17).

---

## 8. Events, webhooks, scheduler, queue

| Piece | Measured |
|---|---|
| `events` | Event bus (`bus.ts`), bridge (`bridge.ts`), single-delivery guarantee |
| `webhooks` | Full module — data, migrations, workers, subscribers, a UI |
| `scheduler` | Full module — services, commands, workers, CLI, migrations |
| `queue` | Two strategies (`async`, `local`), worker registry + runner |
| Subscribers | **44 subscriber directories** across the codebase |
| Workers | **42 worker directories** across the codebase |

**Maturity: running and tested** (events, webhooks, scheduler each carry their own suites).

---

## 9. Audit and ledger

| Piece | Measured |
|---|---|
| Access log | `accessLogService.ts` (418 lines) |
| Action log | `actionLogService.ts` (937 lines) — organisation filter admits null-org rows |
| **Hash-chained ledger** | `ledgerService.ts` — `computeLedgerHash`, `canonicalDigest`, `LEDGER_HASH_VERSION`, verification returning `brokenAtSeq`, per-tenant chain |

**The ledger's content, measured (batch 5, re-confirmed here):** `LedgerAppendInput` carries
`tenantId, eventType, actorKind, actorId, organizationId, resourceKind, resourceId,
correlationId, causationId, visibility, payload, ts`. It has **correlation and causation and
visibility**, but **no `policy_version`, `business_model_version` or `decision_id`** — the
provenance columns Doc 8 §118 requires. The chain is real; the content is short.

**Maturity: running and tested.** The ledger's own Tier 2 (signed checkpoints) is deferred by
decision, not forgotten.

---

## 10. Directory and the organisation graph

`directory` holds the two hardest boundaries in the platform:

| Table | What |
|---|---|
| `tenants` | **The hard isolation boundary** — never crossed |
| `organizations` | A unit within a tenant; `organization_id` is **often null, legitimately** |
| `organization_edges` | **Typed edges between organizations** — the authority graph |

`directory/services/authorityGraphService.ts` reads the graph from the database;
`shared/src/lib/authority/graph.ts` holds the rules as pure functions.

**The superadmin trap is documented and partially fixed:** the most privileged actor has **no
organization**, so code deriving scope from the actor breaks precisely for them. This single
root cause produced **four bugs in one day**; two are fixed, one is U3/U4, and a sweep of 53
files found 38 in parked modules. **The rule that prevents it: never store the actor's
organization as a value — take it from the record.**

**Maturity: running and tested.**

---

## 11. Workflows, business rules, feature toggles, dictionaries

| Module | What | Maturity |
|---|---|---|
| `workflows` | Definitions, instances, steps, `activity-executor`, examples | **Running and tested** (44 tests) |
| `business_rules` | Declarative rules over entities, with notifications and subscribers | **Running and tested** (18 tests) |
| `feature_toggles` | Flags with `defaults.json`, CLI, commands | **Running and tested** (14 tests) |
| `dictionaries` | Platform-wide controlled vocabularies, with `fields/` integration | **Running and tested** (15 tests) |

**This is a shortcut for the vision's workflow and business-rule needs** — but note it is a
**generic** engine, not the vision's Function/Command model. Whether it can be the substrate
for User Functions is a batch-9 question.

---

## 12. Content, attachments, i18n

| Piece | Measured | Maturity |
|---|---|---|
| `attachments` | Full module — library, per-entity attachments, storage config, `storage_s3` backend | **Running and tested** (25 tests) |
| `content` | Frontend content pages (371 lines) | Running, lightly tested (4 tests) |
| **i18n** | **5 locales** — `ar, de, en, es, pl`; RTL direction handled (G7) | **Running and tested** |

**Note on locales:** `ar` ships and falls back to English; a native Arabic review is dropped
from the current milestone by the owner's decision.

---

## 13. The UI — perspectives, dashboards, widget injection

`packages/ui` — **78,661 lines.** Areas: `backend/`, `frontend/`, `portal/`, `primitives/`,
`theme/`, `hooks/`, `ai/`, `types/`, `utils/`.

**The widget-injection system is substantial** — **1,359 lines across 5 files**
(`injection.ts` 484, `injection-loader.ts` 644, `component-registry.ts` 133,
`injection-position.ts` 63, `injection-progress.ts` 35). It declares:

- `InjectionWidgetModule` with metadata and placement
- columns, row actions, bulk actions, filters
- **field-visibility rules** and custom fields
- **wizard steps** and status badges
- **before-save / before-delete hooks** and **navigate guards**
- app-event handlers

**This is more than presentation** — it carries behaviour hooks. **But it is still a UI
extension framework, not the vision's Widget** (batch 4): no contract, no Widget IR, no typed
business ports, no versioned registry with a dependency graph. It is the **host** a vision
Widget could render into.

**Live surface:** `perspectives` (saved views per role/user), `dashboards` (9 entities, the
KPI widget host — **all ten upstream KPI widgets are switched off** because they read parked
ERP data), and **95 distinct backend page routes** in enabled core modules + 15 in the app.

**Maturity: running and tested.** This is a **shortcut for the shell**, not for the Widget
contract.

---

## 14. Multi-tenancy — how the boundary is actually enforced

| Level | Mechanism | Where |
|---|---|---|
| Tenant | `tenant_id` — **required** on every query | `shared/src/lib/query/engine.ts` (`tenantId is now required…`) |
| Organization | `organization_id` — nullable; null-admitting filters | query types, `actionLogService` |
| Row | **Not enforced in the database** — no RLS | — |
| Encryption | Per-tenant data encryption (KMS) | `tenantDataEncryptionService.ts` |

**So the tenant boundary is enforced at the application layer, in one place, and it is a hard
guard** — the query engine refuses a query with no tenant. Doc 8 wants RLS **in addition**
(batch 5, X-06). Whether the application guard is enough, or RLS is genuinely additive, is a
batch-9 question — **not settled here.**

**Maturity: running and tested** (application-level).

---

## 15. The test gate — measured now

**The record:** `yarn test` runs **22 packages'** Jest suites through Turbo. Last recorded
full run: **22/22 tasks, 12,851 tests, 6m09s, zero cached** (2026-08-12, `PROGRESS.md` item 2).

**Measured now, in this environment.** No database is reachable on this machine (no `.env`,
no `psql`, no running container), so the full integration gate cannot run here. I ran the
largest single package that does **not** need a database — `shared`, which carries the
authority kernel:

| | Result |
|---|---|
| Command | `jest --config jest.config.cjs` in `packages/shared` |
| Suites | **164 passed, 1 failed, 165 total** |
| Tests | **1,853 passed, 8 failed, 1,861 total** |
| Time | **92.5 s** |

**The 8 failures are not a product defect — and this is measured, not assumed.** All eight are
in one file, `bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`, and every failure is the
same exception:

```
[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":51,"threshold":50,…}
  at checkBulkDeleteGuard (…/WorkBuddyAI/…/node-safe-delete-shim.cjs:239:19)
```

That is **this sandbox's own file-deletion guard** refusing a bulk delete of 51 test scratch
files (threshold 50). The test is doing what `test-gate.md` documents as the *correct*
pattern — putting scratch files under `node_modules/.cache/` — and the sandbox blocks the
cleanup. **The code is fine; the harness is fenced.** Recorded plainly so it is not mistaken
for a red gate.

**Maturity: green by record; partially re-measured here.** The honest position: the gate was
last proven green on 2026-08-12; I re-ran one package (1,861 of 12,851 tests, 14%) and it
passed 1,853/1,861 with the 8 exceptions explained. **The other 21 packages were not re-run**
(no database here).

---

## 16. The data question — do we have database islands?

`PLAN.md`: *the vision exists to prevent database islands. We run 136 tables across 39
modules. Do we actually have them? Answer with evidence.* The vision supplies the detector
(Doc 5 §89). Applying each test to our tables:

| Island detector (Doc 5 §89) | Finding | Evidence |
|---|---|---|
| **Parallel identity systems** | **YES** | `auth` (`users`, `roles`, `user_acls`, `sessions`, `password_resets`) and `customer_accounts` (`customer_users`, `customer_roles`, `customer_role_acls`, `customer_user_roles`, `customer_user_acls`, `customer_user_sessions`, `customer_user_email_verifications`, `customer_user_password_resets`) are **two complete auth + RBAC stacks** |
| **Capability with duplicated master data** | **YES** | `customers` carries its own people/companies (`customer_people`, `customer_companies`, `customer_person_company_links`) alongside `directory.organizations`; its own vocabularies (`customer_dictionary_entries`, `customer_dictionary_kind_settings`) alongside `dictionaries`; its own entity-definition table (`customer_entities`) alongside `entities` |
| **Isolated reporting / index tables** | **YES** | `query_index` (15 tables) is a parallel index; dashboards read it directly |
| **Manual synchronisation dependencies** | **YES** | `data_sync`, `sync_excel`, `sync_akeneo` — the last two parked |
| **Entity with no meaningful relationships** | **Partly** | the relationship layer is `defineLink` in **1 file** + 6 `extensions.ts` — most module tables relate only to their own module |

**Verdict: yes — and they are exactly the kind the vision exists to prevent.** The clearest
is the **double auth stack**: internal users (`auth`) and customer users (`customer_accounts`)
each have their own users, roles, ACLs and sessions. The vision's rule — *one authoritative
copy, one decision point* — is violated by construction. **The mitigation today is that
`customer_accounts` is parked**, so the second stack is dormant, not live. **Parking hides the
island; it does not remove it.**

**Separately, 127 tables are "orphaned" in the record** (263 − 136) — tables whose modules are
parked, so they are not created at runtime. Those are inert, not islands; but they are also
**not free**, because they are the reason security scanners flag CVEs in unused dependencies.

---

## 17. The reuse question, answered honestly

`PLAN.md`: *which parts of the target would we **customise** what we have for, and which parts
genuinely need building? Do not flatter our own code.*

### 17a. Shortcuts — the target is already paid for (customise, do not rebuild)

| `R` | The target wants | We already have | Evidence | What is still needed |
|---|---|---|---|---|
| **R-01** | An identity boundary (person / service / AI / API client) | `Principal` attached at the auth boundary; `api_keys` is a machine Principal; `ai_worker` kind exists | `knowledge/principals.md`, `auth`, item 13 | Add the remaining subject classes Doc 8 lists |
| **R-02** | A policy kernel that answers "may this actor act, and why" | A layered resolver returning a `Decision` with reasons; gates A0–A5 that **all bind** | `decision.ts`; `authority-overview.md` | Wire the 5 missing inputs; make it the enforcement point (not shadow) |
| **R-03** | Multi-tenancy with a hard boundary | `tenant_id` required on every query; org graph with typed edges | `query/engine.ts`, `directory` | RLS as defence in depth (batch 9 question) |
| **R-04** | Approval and high-impact controls | Held acts, approvals queue, confirm path re-runs every check | `pendingActService.ts` | `ApprovalToken` bound to a `command_hash`; bulk approval; standing approvals |
| **R-05** | Audit and provenance | Access log, action log, **hash-chained ledger** | `ledgerService.ts` | Add `policy_version`, `business_model_version`, `decision_id` |
| **R-06** | A retrieval layer | Hybrid search (tokens/vector/fulltext), 3 vector drivers, an indexer | `packages/search` | Tenancy-filtered retrieval; classification-aware routing |
| **R-07** | Eventing, scheduling, background work | Event bus, webhooks, scheduler, queue, 44 subscribers, 42 workers | packages + `core` | — (this is a clean shortcut) |
| **R-08** | A workflow / rules engine | `workflows` + `business_rules`, both tested | `core/modules` | Whether it is the substrate for User Functions (batch 9) |
| **R-09** | Custom fields and extensibility | `entities` module — custom field defs, custom entities, per-entity configs | `entities` (31 tests) | Classification metadata on fields (batch 5, X-05) |
| **R-10** | A UI shell and an extension system | React library; injection system with hooks; perspectives; dashboards | `packages/ui` (1,359-line injection system) | The Widget **contract/IR/registry** — the shell hosts it, does not supply it |
| **R-11** | An AI runtime with tools, MCP, sandbox, approvals | `ai-assistant`: agent runtime, LLM adapters, MCP client+server, sandbox, pending actions, cost metering | `packages/ai-assistant` (99 tests) | Input/Output Guards and context firewall (batch 5, X-07) |
| **R-12** | Files, i18n, notifications | `attachments`, 5 locales with RTL, notification types | `core/modules` | — |
| **R-13** | Per-tenant configuration | `module_configs` + `configs` module | `configs` | A UI (item 24b) |

**That is 13 real shortcuts.** The single largest is **R-02 + R-05**: a working, tested
authority kernel and a tamper-evident ledger. On the *act* axis, we are ahead of the design.

### 17b. Gaps — nothing covers it, it must be built

| `R` | The target wants | Why nothing covers it |
|---|---|---|
| **R-14** | **Field-, record-, value- and relationship-level authorization** | We have *caller-specified* field selection, not **policy-derived projection**; no value-level write validation; no traversal rules (batch 5, X-01…X-03) |
| **R-15** | **Classification metadata on entities and fields** | Our `DataClass` is attached to *capabilities*, never to entity fields (X-05) |
| **R-16** | **AI Input Guard / Output Guard / context firewall / content-trust labels** | No such code in the AI path (X-07) — **the largest security gap** |
| **R-17** | **The Business Model Kernel** | Does not exist. We have per-module entities, not a canonical business model |
| **R-18** | **Business IR + the compiler from IR** | Does not exist. This is the spine of the vision |
| **R-19** | **User Functions** (validated AI operation saved as durable functionality) | Does not exist — nearest neighbour is `workflows`, a generic engine |
| **R-20** | **The relationship fabric** (relationships as first-class, 14 attributes) | `defineLink` in **1** file; no connectivity model |
| **R-21** | **The Widget contract, Widget IR, and a versioned widget registry with a dependency graph** | The injection system is a UI extension point, not a registry object |
| **R-22** | **The `@`/`#` reference and resolution layer** | The `@` button inserts a literal `@`; the only object link is the messages registry, which **ships empty** (batch 4) |
| **R-23** | **A security-event taxonomy** | We have generic logs, no named event types (X-08) |
| **R-24** | **Aggregation / inference controls** | Nothing (X-04) |
| **R-25** | **Break-glass and separation of duties** | Nothing (X-09) |

**Honest summary:** the **governance and platform services** are largely paid for; the
**business-model spine** (R-17…R-20) and the **data-level security layer** (R-14…R-16,
R-23…R-25) are not paid for at all. **The reuse is real but it is on the platform half, not
the business-model half.**

### 17c. Things that look like shortcuts but are not

- **The 14 parked modules.** They are **frozen, not maintained** — not compiled, not tested
  (553 frozen test files), and restoring one restores an **ungated write path** until its
  commands are mapped to capabilities. A parked module is a **restore candidate**, not free
  capability.
- **The 2,882 test files.** 553 of them are frozen. The live count is what the gate runs
  (12,851 tests).
- **`checkout` / `gateway-stripe` / `sync-akeneo`.** Parked packages; their dependencies are
  still installed and will be flagged by scanners.

---

## 18. Critic pass — challenge every "it already does this"

**The attempt, named.** For every `COVERED`-looking claim in §17a, I asked: *what would the
target require here that this code cannot do?* and looked for the code that would have to
exist. The pattern in this programme is that **a capability which exists but is switched off,
or wired but not called, is not a shortcut** — so the pass attacked exactly those.

| # | Claim attacked | Attacked by | Survived? |
|---|---|---|---|
| 1 | R-02 "we have the policy kernel" | Asking whether the resolver **decides** anything today | **BROKEN.** Default `shadow`; nothing calls it in the request path; RBAC still decides. **We have a resolver, not an enforcement point.** |
| 2 | R-02 "gates A0–A5 all bind" | Asking whether the inputs they read are supplied | **PARTLY BROKEN.** Five of ten inputs are read but supplied by nothing; each absence makes the answer *more* permissive, not less — but never more than RBAC already allowed. |
| 3 | R-05 "we have tamper-evident audit" | Comparing the ledger's record shape to Doc 8 §118 | **PARTLY BROKEN.** The chain is real; the content lacks `policy_version`/`decision_id`. |
| 4 | R-11 "we have an AI runtime" | Asking **where the domain agents live** | **PARTLY BROKEN.** The *platform-specific* agents (`catalog`, `customers`) are **parked**. Enabled is the generic runtime + 3 tool packs. |
| 5 | R-10 "we have a widget system" | Asking whether it is a *registry object with a dependency graph* | **BROKEN.** It is a UI extension framework with hooks — richer than a spot-injector, but not the vision's Widget. |
| 6 | R-07 "we have eventing/scheduling/queue" | Asking whether anything is switched off | **SURVIVED.** `events`, `webhooks`, `scheduler`, `queue` are all enabled and tested. |
| 7 | R-06 "we have search" | Asking whether it is tenancy-filtered and classification-aware | **PARTLY BROKEN.** Hybrid search is real; tenancy filtering and classification-aware routing are not proven here. |
| 8 | R-03 "we have multi-tenancy" | Asking where the boundary is enforced | **SURVIVED (with a caveat).** The query-engine guard is real and hard; there is **no RLS**. Application-level only. |
| 9 | R-09 "we have extensibility" | Asking whether fields carry classification | **PARTLY BROKEN.** Custom fields exist; classification metadata on fields does not. |
| 10 | R-01 "we have identity" | Asking how many subject classes | **PARTLY BROKEN.** `Principal` + `api_keys` + `ai_worker` exist; Doc 8's full subject set does not. |

**What the pass could not break:** the eventing/scheduling/queue stack (R-07) and the
application-level tenant guard (R-03) are genuine, live shortcuts. The resolver's
**explanation-as-a-value**, the **trust asymmetry** and the **required-compensation** control
(batch 5 §16) remain real strengths.

**The most important break is #1.** "We already have the policy kernel" is **false today** —
we have a resolver that does not yet decide anything. That is fixable, and it is the same
finding batch 5 reached from the other direction. **Two routes, same answer.**

**A second-order finding the pass produced:** the shortcuts that survive are almost all
**infrastructure** (events, queue, search, i18n, files). The shortcuts that break are almost
all **the ones the vision is actually about** (the policy kernel as the enforcement point, the
Widget contract, the domain agents). **The platform half is bought; the product half is not.**

---

## 19. Definition of done

- **"Every module has a one-line purpose, a state and a maturity level, or is explicitly
  listed as unknown."** Met: §3 lists all 25 enabled core modules, all 11 parked core modules,
  all 13 package modules, and the non-module packages — with a one-line purpose, a state and
  a maturity level each.
- **"No module silently omitted."** Met: every directory under `packages/*/src/modules` and
  `core/src/modules` is accounted for; the three non-feature holders are named as such.
- **"The reuse question has an evidenced answer rather than an impression."** Met: §17 gives
  **13 shortcuts** and **12 gaps**, each with the file or measurement behind it, and §17c names
  the three things that look like shortcuts but are not.

**Met?** Yes.

---

## 20. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **The double auth stack** (`auth` vs `customer_accounts`) — is the parked customer identity to be deleted, merged into `auth`, or kept? | Batch 9, Batch 10 |
| 2 | **The 127 orphaned tables** — delete, or keep the parked modules? | Batch 11 |
| 3 | **The thin relationship fabric** — can `defineLink` be grown into the vision's fabric, or is it a new build? | Batch 9 |
| 4 | **`workflows` as the substrate for User Functions** — can it, or is User Functions a new build? | Batch 9 |
| 5 | **The `ai-agents`/`ai-tools` in parked modules** — what do `catalog` and `customers` ship that we would want on restore? | Batch 7, Batch 9 |
| 6 | **Search tenancy and classification** — is retrieval tenancy-filtered today? | Batch 9 |
| 7 | **The full gate re-run** — needs a database; the last proven green is 2026-08-12 | Batch 12 |
| 8 | **The recorded 44 backend pages vs 95 measured** — could not reconcile; recorded, not averaged | Recorded |
| 9 | **`ratelimit_probe`** — an `@app` module in the enabled list; purpose not examined here | Recorded |
| 10 | **The 553 frozen test files** — they are a restore-time liability, not coverage | Batch 11 |
