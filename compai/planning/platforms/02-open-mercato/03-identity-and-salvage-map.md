# P2/03 — Open Mercato: Identity, Database, and Salvage Mapping

**Companions:** [forensic](01-forensic-analysis.md) · [verdict](02-verdict.md) — **FORK**
**Portability metadata** per [Method §0](../../method/platform-assessment-methodology.md).

---

# Part 1 — Identity

| Property | Value |
|---|---|
| Name / version | Open Mercato 0.6.7 |
| Licence | **MIT** core; `packages/enterprise` **commercial** (excluded) |
| Size | 7,833 `.ts`/`.tsx` files · **1,321,919 LOC** |
| Workspaces | Yarn 4.17.1 Berry — `apps/*`, `packages/*`, `external/official-modules/packages/*` |
| Orchestration | Turborepo · Jest · ESLint (+ custom `eslint-plugin-ds`) |
| Framework | **Next.js 16.2.11** · React 19.2.7 |
| ORM | **MikroORM 7.1.5** (core, decorators, migrations, postgresql) · `pg` 8.22 |
| DI | **Awilix 13.0.5** |
| Validation | **Zod 4.4.3** |
| AI | **Vercel AI SDK 7.0.4** + `@ai-sdk/openai` 4.0.2 |
| UI | Radix · TanStack Query 5 / Table 8 · `@xyflow/react` · react-email · Tailwind |
| Ops | New Relic · Docker (5 compose files) · Railway · devcontainer |
| Git history | **absent** in the download |

**Composition model:** convention-discovered modules → build-time generator
(`yarn generate`, 4,127-line `module-registry.ts`) → generated registries →
Next.js catch-all dispatchers + Awilix container.

---

# Part 2 — Database

MikroORM decorated entities, per-module migrations, per-module snapshot files
(`migrations/.snapshot-open-mercato.json`). **195 `@Entity` declarations across
34 modules.** No RLS; tenancy is application-enforced.

### Tables relevant to our kernel

| Domain | Tables |
|---|---|
| **Tenancy / org** | `tenants` · `organizations` (`parent_id`, `root_id`, `tree_path`, `ancestor_ids`, `child_ids`, `descendant_ids`) |
| **Audit / journal** | `action_logs` (command_id, action_label/type, resource + parent resource, `execution_state`, `undo_token`, `command_payload`, `snapshot_before`, `snapshot_after`, `changes_json`, `changed_fields`, `primary_changed_field`, actor/tenant/org) · access log (buffered, rotated) |
| **Custom objects** | `custom_field_defs` · `custom_field_entity_configs` · `custom_field_values` (**typed EAV**: text/multiline/int/float/bool) · `custom_entities` · `custom_entities_storage` (jsonb `doc`) · `encryption_maps` |
| **Retrieval** | `entity_indexes` (`doc` + **`embedding`** + `index_version`) · `search_tokens` (`token_hash`) · `entity_index_jobs` · **`entity_index_coverage`** · indexer error/status logs |
| **Process** | `workflow_definitions` (versioned, `effective_from/to`) · `workflow_instances` (`correlation_key`) · `workflow_branch_instances` (fork/join) · `step_instances` · **`user_tasks`** (form schema, claim, due date, escalation) · `workflow_events` · `workflow_event_triggers` |
| **Rules** | `business_rules` (`condition_expression`, `success_actions`, `failure_actions`, priority, `effective_from/to`) · `rule_execution_logs` · `rule_sets` · `rule_set_members` |
| **AI** | `ai_agent_prompt_overrides` (versioned) · **`ai_pending_actions`** · `ai_agent_runtime_overrides` · `ai_tenant_model_allowlists` · `ai_agent_mutation_policy_overrides` · `ai_token_usage_events` · `ai_token_usage_daily` · `ai_chat_conversations` / `_participants` / `ai_chat_messages` |

---

# Part 3 — Salvage mapping

Legend: **LIFT** copy near as-is · **ADAPT** copy and modify · **PATTERN** take
the design, rewrite · **REPLACE** wrong for us · **BUILD** absent.

Portability: **Dep** = what it drags · **Ext** = extraction cost ·
**Graft** = cost to make organic in a *different* host.

## 3.1 If Open Mercato is the HOST

Everything in the Keep list stays in place; only the six Change items are work.
See [verdict §5](02-verdict.md). This section is the **donor** view.

## 3.2 Donor value — ranked

| # | Artefact | Verdict | Dep | Ext | Graft | Notes |
|---|---|---|---|---|---|---|
| 1 | **`mutationPolicy` resolver** (`lib/agent-policy.ts`) — ordered enum, restrictiveness rank, narrow-only override, escalation rejection, fail-safe default | **LIFT** | none | **trivial** | **trivial** | ~150 LOC of pure logic, no framework coupling. Closest thing to our autonomy resolver in either platform |
| 2 | **`ai_pending_actions` model** — approve-first with `field_diff`, `expires_at`, `idempotency_key`, `record_version` | **ADAPT** | MikroORM entity only | low | low | The *schema* is the value; re-express on any ORM |
| 3 | **`BudgetEnforcer`** — per-turn tokens / tool calls / wall clock, typed abort reasons | **LIFT** | AbortController | **trivial** | **trivial** | Framework-free class |
| 4 | **Token usage model** — per agent/module/user/session/turn/step + daily rollup | **ADAPT** | MikroORM | low | low | More granular than our Charter §13 |
| 5 | **`entity_index_coverage`** — base vs indexed vs vector-indexed counts | **PATTERN** | — | trivial | trivial | *Idea*, not code: measure your own index completeness |
| 6 | **Org closure columns** — `tree_path` + `ancestor_ids` + `descendant_ids` | **PATTERN** | Postgres | trivial | trivial | Combine with Platform 1's typed edges + ceilings |
| 7 | **Module contract + generator** (21 surfaces, boot validation) | **PATTERN** | ts-morph, Yarn, Turbo, Next | **high** | **high** | Take the *shape*; the 4,127-line generator is host-specific |
| 8 | **Three-level override surface** (config / path / eject) | **PATTERN** | generator | high | high | The single best strip-and-graft idea found |
| 9 | **Command bus with undo/redo** — snapshots, derived changes, undo claims; **70 real handlers** | **ADAPT** | Awilix, MikroORM | medium | **high** | Design is excellent; code is DI- and ORM-coupled |
| 10 | **Custom entity/field engine** — typed EAV + jsonb docs + encryption maps | **ADAPT** | MikroORM | medium | high | Implements FR-260…263 |
| 11 | **Workflow engine** — fork/join, user tasks, escalation, temporal definitions | **ADAPT** | MikroORM, queue | high | high | Large; evaluate against Temporal before porting |
| 12 | **Business-rules engine** + execution logs | **ADAPT** | MikroORM | medium | medium | `rule_execution_logs` ≈ our decision log |
| 13 | **`defineLink()`** cross-module relations without FKs | **PATTERN** | — | trivial | trivial | Nearest prefiguration of our **beams** |
| 14 | **Prompt composed from governed parts** — versioned sections + injected policy | **PATTERN** | — | trivial | trivial | Charter → Grant Set should also emit prompt text |
| 15 | **i18n enforcement** — `check-hardcoded`, `check-values`, per-module allowlist | **PATTERN** | Yarn scripts | low | low | **I12 with a linter** |
| 16 | **HTTP parameter-pollution gate** — validate *every* tenant candidate | **LIFT** | — | trivial | trivial | ~40 LOC; a real, subtle fix |
| 17 | **`requireRoles` removal rationale** | **PATTERN** | — | — | — | Delete spoofable auth paths, don't deprecate them |

## 3.3 Do not carry

| Artefact | Reason |
|---|---|
| `packages/enterprise` | **Commercial licence** — excluded entirely |
| ~510k LOC ERP domain (`customers`, `sales`, `catalog`, `wms`, `checkout`, gateways, carriers, currencies…) | Not our product |
| String-prefix principal discriminator | The `if (type === x)` pattern **I2** forbids |
| Audit-outside-transaction + fail-open | Defect, not design |
| Mutable journal as the only record | Keep as a journal; a ledger is a separate thing |
| Boolean authorisation result | Our **I6** needs reasons |
| `apps/mercato` host app | Replaced by ours |

## 3.4 Cross-platform note

The two assessments are **complementary in a specific, useful way**:

| Need | Best donor | Why |
|---|---|---|
| Layered resolver **with explanation trace** | **Platform 1** | Explanations already threaded through 8 decision sources |
| Typed org edges **with authority ceilings** | **Platform 1** | `permission_ceiling_id`, `inheritance_mode`, typed relationships |
| Delegation with scope, expiry, revocation | **Platform 1** | Fully implemented; Open Mercato has none |
| Fast org traversal | **Open Mercato** | Denormalised closure arrays |
| Ordered narrow-only policy resolution | **Open Mercato** | `mutationPolicy` + escalation rejection |
| AI approve-first gate | **Open Mercato** | `ai_pending_actions`, complete |
| Reversibility (undo/redo) | **Open Mercato** | 70 working handlers |
| Module contract, codegen, override surface | **Open Mercato** | Far stronger |
| Custom entities, retrieval, workflows, rules | **Open Mercato** | Platform 1 has none |
| Locale foundation | **Either** — Platform 1's `localization.ts` is dependency-free; Open Mercato's *enforcement* is better |

**The org model is the clearest synthesis:** Platform 1's typed edges and
per-edge ceilings, implemented with Open Mercato's closure columns. Neither
platform has both, and the combination is better than either — the first concrete
proof of the graft strategy in [Method §0](../../method/platform-assessment-methodology.md).
