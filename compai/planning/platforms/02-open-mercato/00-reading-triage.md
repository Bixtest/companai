# P2/00 — Reading Triage

**Written before reading**, per [Method §v1.2b](../../method/platform-assessment-methodology.md).
Purpose: fix the keep/skip decision in advance so the reading cannot drift toward
whatever turns out to be interesting.

**Target:** 1,321,919 LOC. Reading all of it is not possible and not useful.
This document says what we read, what we skip, and why each decision is safe.

---

## 1. Evidence the triage is built on

### 1.1 Declared dependency graph (authoritative)

From `apps/docs/docs/architecture/module-dependencies.mdx` — modules declare
`metadata.requires`, and `yarn generate` **refuses to emit the module registry**
if a required module is not enabled. Declared edges, complete:

```text
api_keys      → auth
entities      → query_index
portal        → customer_accounts
resources     → planner
sales         → catalog, customers, dictionaries
staff         → planner, resources
sync_akeneo   → integrations, data_sync, catalog, sales
```

The documentation is explicit that this is **"the floor, not the ceiling"** —
soft runtime expectations exist that the graph does not capture.

### 1.2 Actual import coupling (measured independently)

Cross-module import counts inside `packages/core/src/modules`:

```
core 1152 · auth 239 · customer_accounts 230 · directory 228 · dictionaries 126
sales 62 · entities 62 · attachments 48 · customers 36 · audit_logs 36
messages 34 · catalog 34 · dashboards 30 · staff/planner/inbox_ops 19 …
```

**The two measures disagree, and that gap is itself a finding.** `directory` has
228 inbound imports and appears on the right-hand side of *no* declared edge.
`auth` is declared foundational only for `api_keys`, yet has 239 inbound imports.

Consequence for triage: **a module is only skippable if nothing in the keep set
depends on it by *either* measure.** Verifying whether the extra coupling is
type-only, service-level, or a genuine boundary violation is a Batch 2 task —
until then, high-inbound modules are kept regardless of their domain name.

---

## 2. KEEP — read in depth

### 2.1 Framework layer (Batch 1 — read in full)

| Target | LOC | Why |
|---|---:|---|
| `packages/shared` | 60,038 | Module registry, `ModuleInfo`, setup/seed ordering — **the module contract itself** |
| `packages/cli` (generators) | 42,636 | Code generation, module registry emission, dependency enforcement — how the platform composes |
| `packages/core/src/bootstrap.ts`, `helpers/`, `index.ts` | ~5,400 | The thin non-module core |
| `packages/events` | 2,713 | Event bus |
| `packages/queue` | 2,758 | Job queue |
| `packages/cache` | 2,937 | Cache abstraction |

### 2.2 AI (Batch 4 — the primary reason this platform matters to us)

| Target | LOC | Why |
|---|---:|---|
| `packages/ai-assistant` | 73,738 | Real AI integration (Vercel AI SDK). Platform 1 had a stub; this is the comparison we need |
| `core/modules/inbox_ops` | 22,316 | **"Email-to-ERP Agent"** — an agentic module despite the ERP-sounding name |
| `.ai/skills`, `.ai/specs` | 189 files | The platform was built *by* AI agents; this is the workflow scaffolding |

### 2.3 Engines relevant to our kernel (Batch 4)

| Target | LOC | Maps to our need |
|---|---:|---|
| `core/modules/entities` | 15,143 | Custom data objects and fields — SRS FR-260…263 · our Garage field types |
| `core/modules/query_index` | 13,766 | Indexing and hybrid query — our retrieval layer · required by `entities` |
| `core/modules/auth` | 34,206 | Identity, RBAC — our Principal service · **P-2 non-human principal probe** |
| `core/modules/directory` | 11,771 | **Tenants & Organizations** — the org model · 228 inbound imports |
| `core/modules/audit_logs` | 6,570 | Audit — our Ledger |
| `core/modules/business_rules` | 18,105 | Rules engine — our policy/automation layer |
| `core/modules/workflows` | 59,292 | Workflow engine — SRS FR-190…203 · our long-running process needs |
| `core/modules/feature_toggles` | 8,597 | Flags — the S0–S3 safe-change protocol |
| `core/modules/translations` + per-module `i18n/` | 6,217 | **I12** locale-is-structural |
| `core/modules/entities` ACL + `acl.ts` pattern | — | **I5** one decision point — or its violation |

### 2.4 Internal builders and API surface (Batch 4)

| Target | LOC | Why |
|---|---:|---|
| `core/modules/dashboards` | 8,776 | Dashboard builder |
| `core/modules/perspectives` | 4,278 | Saved table views — adjacent to our **Lens** |
| `core/modules/widgets` | 18 | Stub — check only |
| `core/modules/api_docs` | 1,834 | API documentation generation |
| `core/modules/api_keys` | 3,293 | API access management |
| `packages/create-app` | 27,646 | Scaffolding / app generation |
| `packages/ui` | 111,287 | Design system — **sample only**, do not read whole |

### 2.5 Integration architecture (Batch 4)

| Target | LOC | Why |
|---|---:|---|
| `core/modules/integrations` | 9,282 | Integration registry |
| `core/modules/data_sync` | 10,047 | Sync engine |
| `packages/webhooks` | 8,968 | Webhook handling |
| `packages/scheduler` | 12,078 | Scheduled work |
| `packages/search` | 24,514 | Search provider |
| `packages/storage-s3` | 3,499 | Storage provider interface — **read the interface, skip the impl** |

### 2.6 Licence boundary — ~~keep~~ **EXCLUDED** (resolved in Batch 3)

| Target | LOC | Outcome |
|---|---:|---|
| `packages/enterprise` | 49,446 | **EXCLUDED — do not read.** `LICENSE.md` is commercial: evaluation-only, and forbids "modify, refactor, reverse engineer, **derive from, or generate new features based on**" the package. Reading it for design we then implement would breach the derivation clause. No source read, no salvage entries. Module list (`record_locks`, `security`, `sso`, `system_status_overlays`) recorded only because their public docs publish it. See [forensic §9.1](01-forensic-analysis.md). |

### 2.7 Foundational-by-coupling — keep despite low relevance

Kept only because the keep set imports them; read **shallowly**, for contracts only.

| Target | LOC | Inbound imports |
|---|---:|---:|
| `core/modules/dictionaries` | 9,980 | 126 |
| `core/modules/attachments` | 12,607 | 48 |
| `core/modules/notifications` | 6,234 | 12 |
| `core/modules/messages` | 26,544 | 34 |
| `core/modules/configs` | 5,725 | — |

---

## 3. SKIP — ERP domain, not our product

Safe to skip: nothing in the keep set declares them, and their inbound imports
come from other skipped modules.

| Target | LOC | Justification |
|---|---:|---|
| `core/modules/customers` | 173,786 | CRM domain. Inbound imports (36) are from `sales`, also skipped |
| `core/modules/sales` | 86,777 | Order/quote/billing domain |
| `core/modules/catalog` | 58,717 | Product catalog |
| `core/modules/wms` | 46,627 | Warehouse management |
| `core/modules/customer_accounts` | 25,738 | Customer-facing identity — 230 inbound, but from `portal` and CRM chain |
| `core/modules/currencies` | 13,500 | Commerce primitive |
| `core/modules/shipping_carriers` | 7,676 | Logistics |
| `core/modules/payment_gateways` | 7,203 | Payments |
| `core/modules/portal` | 1,869 | Customer portal — **note: not an org topology**, despite the name |
| `core/modules/sync_excel` | 7,851 | Import tooling |
| `core/modules/progress` | 3,177 | Progress tracking UI |
| `packages/checkout` | 19,261 | Commerce flow |
| `packages/gateway-stripe` | 2,232 | Payment provider |
| `packages/sync-akeneo` | 10,988 | PIM connector |
| `packages/content` | 1,383 | CMS |
| `packages/channel-gmail` / `channel-imap` | 7,480 | Mail transport — **may be revisited** if `inbox_ops` depends on them |
| `packages/onboarding` | 4,645 | Product onboarding flows |
| `apps/mercato`, `apps/docs` (as code) | 25,440 | Host app and doc site; docs content is read in Batch 5 |

**Deferred, not skipped** — decide after Batch 4:

| Target | LOC | Why undecided |
|---|---:|---|
| `core/modules/staff` | 36,128 | "Employees" — our workforce domain, but ERP-HR shaped. Read its **data model only** |
| `core/modules/planner` | 9,655 | Worktime/availability — relevant only if we model human capacity |
| `core/modules/resources` | 12,829 | Resource planning — same |

---

## 4. Reading budget

| Batch | Scope | Approx LOC in scope |
|---|---|---:|
| 1 | Framework layer | ~116,000 (read structurally, not line by line) |
| 2 | Enforcement tracing — 3 write paths | targeted |
| 3 | Verification, probes, licence audit | targeted |
| 4 | AI + engines + builders + integration | ~330,000 (sampled) |
| 5 | Documentation — four trees, see below | — |
| 6 | Second pass, verdict, salvage map | — |

**Skipped: ~510,000 LOC** of ERP domain, with justification per module above.

### 4.1 Documentation reading order (Batch 5)

Four **distinct** trees, no overlap. Read in this order:

| Priority | Tree | Scope | Why first |
|---|---|---|---|
| 1 | `apps/docs/docs/architecture/` + `framework/` | 8 + 89 pages | The published architecture and framework reference — our primary idea source |
| 2 | `AGENTS.md` (root, 31 KB) + per-module `AGENTS.md` | 40 files | The rules the codebase is actually written to; likely the highest-density statement of its architecture |
| 3 | **`docs/design-system/`** | 30 pages | The **Garage as an operating discipline** — component contracts, token versioning, decision log, coverage, and *enforcement* (cross-check `packages/eslint-plugin-ds`) |
| 4 | `apps/docs/docs/customization/` + `api/` + `enterprise/` | 40 pages | Extension model, API surface, open-core boundary |
| 5 | `.ai/skills` + a sample of `.ai/specs` | ~40 files | How an AI-agent-built codebase was actually operated |
| 6 | `docs/superpowers/plans/…module-slimming` | 1 page | A worked example of the **strip** phase in our host/donor programme |
| 7 | `BACKWARD_COMPATIBILITY.md`, `UPGRADE_NOTES.md`, `CHANGELOG.md` | sampled | Release discipline evidence for **H7** |

`user-guide` (66) and `cli` (31) are read only where a specific question sends us
there. `docs/manuals/` and `docs/wms/` are skipped.

**Acquisition note:** all documentation is read from the repository. A crawl of
the live site was tested and returned the homepage instead of the requested page
— see [forensic §5.1](01-forensic-analysis.md).

## 5. Execution plan — named files per batch

Located during orientation, so each batch starts with targets rather than a
search. Everything is read from the local repository; nothing is crawled.

### Batch 1 — Framework layer (read in full)

The contract that decides whether this is a viable **host**.

| # | File | Question it answers |
|---|---|---|
| 1 | `packages/shared/src/modules/registry.ts` | **The module contract.** `ModuleInfo`, what a module may declare |
| 2 | `packages/shared/src/modules/setup.ts` | Install/seed ordering, dependency topology |
| 3 | `packages/core/src/bootstrap.ts` | DI container construction — the composition root |
| 4 | `packages/cli/src/lib/generators/module-registry.ts` | How the registry is emitted; where `requires` is enforced |
| 5 | `packages/cli/src/lib/generators/module-di.ts` | How DI registrations are collected |
| 6 | `packages/cli/src/lib/generators/module-entities.ts` | How ORM entities are collected |
| 7 | `packages/cli/src/lib/generators/scanner.ts`, `index.ts` | What the generator scans and in what order |
| 8 | `packages/shared/src/modules/events.ts` + `events/` | Event bus contract |
| 9 | `packages/shared/src/security/` | Security primitives |
| 10 | `packages/core/src/modules/auth/{index,acl,di,events}.ts` | A real module's four contract files |

**Exit artefact:** forensic §6 — the module contract, DI model, generator
pipeline and event model, stated in our vocabulary. Host-fitness criteria
**H-1, H-2, H-4, H-6** provisionally scored.

### Batch 2 — Enforcement tracing (probes P-2…P-6, P-9, P-11)

Three write paths traced end to end. Chosen for coverage, not convenience:

| Path | Why this one |
|---|---|
| `auth` — create/modify a user or role | Identity and RBAC; **P-2** non-human principal |
| `entities` — create a custom entity record | The engine we most want; custom-field write path |
| `audit_logs` — any audited mutation | Whether audit is transactional (**P-5**) and correlated |

For each: HTTP entry → authorisation → validation → persistence → audit → event.
Count enforcement sites (**P-3**). Check `acl.ts` — is it one decision point
(**I5**) or 39 of them?

**Exit artefact:** forensic §7 — property-by-property *enforced / partial /
declared only*.

### Batch 3 — Verification and licence audit

`yarn install` is unlikely to be viable offline; do not block on it.

| Probe | Action |
|---|---|
| P-1 | Absence greps for our kernel concepts (charter, autonomy ladder, canonical entity, tag/lens, mention, trust tier) |
| P-7 | MikroORM entities vs migrations — drift check |
| P-8 | Tenant discriminator coverage; RLS presence |
| P-9 | Audit immutability constraints |
| P-10 | Query shape on hot paths |
| P-12 | Documentation claim verification — sample 10 claims across the four doc trees |
| P-13 | `yarn typecheck` / `yarn test` if dependencies resolve; otherwise record as not run |
| P-15 | Escape hatches: `OM_ENABLE_ENTERPRISE_MODULES*`, bypass flags, no-op stubs |
| **Licence** | File-level audit of `packages/enterprise`; headers, per-package `license` fields, `official-modules.json` |

### Batch 4 — Sampled deep reads

In priority order, stopping when the question is answered:

1. `packages/ai-assistant` — `lib/agent-runtime.ts` first, then `di.ts`, tools, model policy, cost
2. `core/modules/entities` — definitions, fields, ACL, records API
3. `core/modules/query_index` — indexing and hybrid query
4. `core/modules/directory` — the org/tenant model (**H2**)
5. `core/modules/auth` — RBAC depth
6. `core/modules/workflows` + `business_rules` — process and rules engines
7. `core/modules/audit_logs` — ledger shape
8. `core/modules/inbox_ops` — the email-to-ERP agent
9. `core/modules/{dashboards,perspectives}` — internal builders
10. `core/modules/{integrations,data_sync}` + `packages/{webhooks,scheduler,search}` — integration architecture
11. `core/modules/staff` — **data model only**, then decide (deferred item)

### Batch 5 — Documentation

Order fixed in [§4.1](#41-documentation-reading-order-batch-5).

### Batch 6 — Second pass, verdict, salvage map

Re-verify every credited property against runtime (**the Platform 1 lesson**).
Then: rubric score, three-bucket partition, **host-fitness scoring H-1…H-8**,
salvage map with portability metadata, verdict.

## 6. Revision rule

If Batch 2 or 4 shows a skipped module is load-bearing for something we keep,
**amend this document and say so** rather than quietly reading it. The value of a
triage is that its errors are visible.
