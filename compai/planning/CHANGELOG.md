# Planning Changelog

Traceability for changes to the design documents, and where each idea came from.

---

## 2026-08-08 — Batch A: absorbed from the `Platform/` code analysis

Source: [P1 forensic — Forensic Analysis](platforms/01-graph-portal-platform/01-forensic-analysis.md). These are
things the existing codebase does better than our documents did, or gaps its
absence exposed.

### Added — structural

| Change | Where | Origin |
|---|---|---|
| **Org topology is a typed graph of portals**, not a flat department tree — with typed relationships, inheritance modes and per-edge authority ceilings. Subsumes departments and teams; expresses consultancy/subsidiary/client topologies our documents could not. | [01 §2.1](01-core-architecture.md) · D-13 | `portals` + `portal_edges` |
| **Graph-inherited authority ceilings** as a resolver ceiling input — invariant I4 enforced structurally rather than by convention. | [02 §6.1](02-authority-and-autonomy.md) · D-14 | `permission_ceiling_id` |
| **Record lock state** (open/restricted/locked) as a floor input — sensitivity is about a record's type, lock state is about its moment. | [02 §4.3](02-authority-and-autonomy.md) | `record_policies.lock_state` |
| **Terminal vs. recoverable denials** carried in the Decision object, driving different UX: *"not possible"* vs *"here is how to make it possible"*. | [02 §4.4](02-authority-and-autonomy.md) | project overlay `terminal` flag |
| **Typed hook points with governance metadata** — `allowed_mutations`, `required_capabilities`, `timeout_ms`, `risk`, audit event. Hooks are governed by the resolver rather than being trusted callbacks. | [01 §3.1](01-core-architecture.md) | `HookRegistration` |
| **Capability descriptor enriched** with `allowed_mutations`, `scope_rules`, `evidence_required`, `audit_event_type`. `evidence_required` turns "cite your sources" from a prompt instruction into an enforced precondition. | [02 §4](02-authority-and-autonomy.md) | `AiToolContract` |
| **Event `causation` and `visibility`** alongside correlation — makes a trace a navigable tree, and makes the ledger filterable by construction. | [06 §2](06-attribution-and-audit.md) | `DomainEventEnvelope` |

### Added — invariants

| Change | Where |
|---|---|
| **I11 — Declared or it does not exist.** Boot-time verification; undeclared capabilities unreachable; implementation status expressed in the type system, not prose. Written directly against the observed failure mode of contracts recorded as delivered capabilities. | [00 §3](00-product-thesis.md) · [01 §3.1](01-core-architecture.md) · D-15 |
| **I12 — Locale and direction are structural.** Every principal, portal, knowledge item and generated output carries locale and direction; AI workers are certified per language and the resolver denies uncertified output. **This was a total gap in our documents.** | [00 §3](00-product-thesis.md) · [01 §5.1](01-core-architecture.md) · D-16 |

### Added — rules

| Change | Where |
|---|---|
| **No closed enums in the shared contract.** Object types, event types, capability ids and addressable kinds are registry-backed strings validated against module registrations. | [01 §3.1](01-core-architecture.md) |
| **Manifest carries `implementation_status`**, enforced at boot. | [01 §3](01-core-architecture.md) |

### Validated without change

Design decisions the existing codebase independently arrived at, which raises
confidence rather than changing anything:

- decisions that carry their own explanation trace (our I6);
- layered resolution with deny-wins precedence;
- delegation with scope, expiry, revocation and mandatory reason;
- a module manifest declaring permissions, events, hooks, routes, widgets, field
  types, report blocks and seed templates;
- `tenant_id` discipline on every business table.

---

## 2026-08-08 — Batch B: absorbed from vision & policy documents

Source: [P1 notes §Batch B](platforms/01-graph-portal-platform/04-docs-review-notes.md). Ideas from
`uxaios/VISION.md`, `uxaios/ARCHITECTURE.md`, `AI-FIRST-PLATFORM-POLICY.md`,
`vision-and-some/platform-foundation-brainstorm.md`,
`agent-analysis/PLATFORM-MASTER-UNDERSTANDING.md` — none of which reached the code.

### Added — major concepts

| Change | Where | Origin |
|---|---|---|
| **Knowledge Cell** — a Lens given identity, views and actions. Inverts the dashboard model: cells are primary, charts/KPIs/reports are views of them. Collapses knowledge bases, dashboards, reports, project brain and context assembly into one primitive. **A cell is what an AI worker is given when it starts work**, making "minimum necessary context" computed and inspectable. | [04 §4.3](04-context-graph-and-tags.md) | brainstorm |
| **The Garage** — one catalogued, versioned home for every reusable ingredient (field types, views, layouts, actions, triggers, transitions, cell views). Answers what the app builder assembles *from*, and makes FR-272 safe by construction: the builder cannot express what the Garage does not offer. | [01 §3.2](01-core-architecture.md) | brainstorm |
| **Beams** — typed, permissioned, first-class relationships (evidence, dependency, flow, causation, derivation, supersession, contradiction, navigation). Makes `evidence_required` enforceable, gives knowledge conflicts (FR-125) a home, and makes relationship search (FR-332) real. | [04 §2.5](04-context-graph-and-tags.md) | UXAIOS |
| **Packs as deployable bundles** — Industry Packs given a concrete delivery mechanism: topology, charters, mindflows, skills, lenses, cells, processes, matrices, Garage compositions and seed knowledge, versioned and installable. The compiler *adapts a Pack* rather than generating from nothing. | [01 §6.1](01-core-architecture.md) | Assets Store |
| **Flow Trace** — the correlation/causation chain as a navigable object rather than a text tree, permission-filtered per viewer and honest about hidden nodes. | [06 §3.1](06-attribution-and-audit.md) | UXAIOS |
| **`as_of` temporal reads** — audit reads evaluate under the rules in force at the time of the act. Schema-shaping: policies, matrices, lenses, charters and trust tiers need effective-dating from the start. | [06 §3.2](06-attribution-and-audit.md) | AI-first policy |
| **The citation triple** (`source_type`, `locator`, `content_hash`) — makes citations verifiable, and detects when a cited source has changed since it was cited. | [04 §6.1](04-context-graph-and-tags.md) | AI-first policy |
| **Cell refresh / auto-sync** with `snapshot_on` — live cells for working, snapshots for anything sent, signed or filed, so published evidence does not rot. | [04 §4.4](04-context-graph-and-tags.md) | brainstorm |

### Added — invariants and rules

| Change | Where |
|---|---|
| **I13 — Security by primitive.** No primitive is exempt from permissions, data boundaries and audit. Design test: if it cannot say who may see it, what it may touch and what it records, it is not ready to exist. Plus "compliance produces evidence, not paperwork". | [00 §3](00-product-thesis.md) |
| **A test asserting on an unenforced boundary is worse than no test** — added to I11, from that project's own finding that its security suite proved nothing because no identity was enforced. | [00 §3](00-product-thesis.md) |
| **Capability grants are bound to module lifecycle** — withdrawn on deactivation, with affected Charters recompiled atomically. No orphan grants. | [01 §3.1](01-core-architecture.md) |
| **SQL-level filtering, never load-all-then-filter.** A lens that cannot compile to a database predicate is a design error, not a performance problem. | [07 Q16](07-open-questions.md) |

### Added — open questions

| Change | Where |
|---|---|
| **Q9 expanded** with a concrete EU compliance checklist to react to, and two gaps it exposed in our design: purpose binding on an AI run, and retention classes as a property of event types. | [07 Q9](07-open-questions.md) |
| **Q17 — how far up the visualisation stack.** Five-layer model recorded; current lean is stop at layer 3 (relationships), treat 4–5 as research. | [07 Q17](07-open-questions.md) |

### Validated without change

- Micro-AI dataset slicing ≡ our Charter-grants-knowledge-by-Lens design.
- "Modules never call each other directly; the kernel mediates" ≡ our kernel contract.
- "Do not store a competing graph" ≡ I10.
- "Localization is structural" ≡ the I12 we added in Batch A — independent arrival.

### Deliberately declined

UXAIOS spatial/3D surface model, skins/themes/space templates, OLAP hypercube
explorers, Assets Store as commerce. Reasons in [P1 notes](platforms/01-graph-portal-platform/04-docs-review-notes.md).

---

## 2026-08-08 — Batch C: absorbed from the architecture contracts

Source: [P1 notes §Batch C](platforms/01-graph-portal-platform/04-docs-review-notes.md). The 18 documents in
`architecture/` — the most rigorous cluster in the set.

| Change | Where |
|---|---|
| **I14 — Authority objects are superseded, never edited.** Anything that grants, bounds or records authority is append-only. Generalised from an edit-flow contract that forbids deleting permission policies, allows delegations to be revoked but not extended, and requires a new edge rather than a re-parented one. Makes `as_of` possible. | [00 §3](00-product-thesis.md) |
| **I15 — State a control's real strength.** From "protection is deterrence, not DRM — admin help text must say so". Overstating a control is a defect of the same severity as a broken one. | [00 §3](00-product-thesis.md) |
| **Module lifecycle** — installed / enabled / disabled / uninstalled with precise surface semantics; `installed ≠ enabled`; audit history survives uninstall. Mirrors our AI worker lifecycle exactly. | [01 §3.3](01-core-architecture.md) |
| **Staged installation pipeline** — offline preflight → authority → state → schema → file checksums → dependencies → atomic transaction → separate enable. Stage 0 statically checks source for audit-boundary and repository-only DB access. Applies equally to Pack install and Charter compilation. | [01 §3.3](01-core-architecture.md) |
| **Kernel-as-intermediary, enforced by a build-failing test.** Explicit allowed/forbidden integration table. Plus: foreign keys point to kernel tables, never another module's private tables. | [01 §3.4](01-core-architecture.md) |
| **Module vs thin extension**, and a **connector manifest** more complete than our own deep-research sketch — adds direction, auth type, secret *names*, webhook replay window, sync idempotency, rate limit, retry policy, health check and *required* audit events. Plus webhook handling rules. | [01 §3.5](01-core-architecture.md) |
| **Slot registry pattern** — extension by registration against stable semantic slots, never by conditional. Same disease as `if (principal.type === 'ai')`. | [01 §3.2](01-core-architecture.md) |
| **Garage registration pipeline** — author → registry → QA gate → catalogue → deploy. | [01 §3.2](01-core-architecture.md) |
| **Views change presentation only** — never data, never permissions. Prevents summary views becoming an inference channel. | [04 §4.5](04-context-graph-and-tags.md) |
| **Provenance rank** — `manual > approved > rule > inherited > derived/ai`; lower may propose, never overwrite. Extends to AI-generated field values (FR-500/501). | [04 §5.1a](04-context-graph-and-tags.md) |
| **Mutation ordering rule** — validate → resolve → persist → audit *in the same transaction* → commit → emit. A failed audit fails the mutation; the event bus sits outside. | [06 §3.3](06-attribution-and-audit.md) |

**Recorded, not yet integrated:** UI portability tags (`portable` /
`garage-candidate` / `path1-only`) — adopt when a second UI surface exists.

---

## 2026-08-08 — Batches D & E: feature specs, knowledge cookbook, dictionary

| Change | Where |
|---|---|
| **I1a — One set of surfaces, gated by authority.** No admin portal versus user portal; all functions on the same pages, gated by the resolver. Operator tooling is temporary scaffolding with a named product surface it stands in for. The permissions catalogue is a first-class product area. | [00 §3](00-product-thesis.md) |
| **Grading the platform's own changes** — the S0–S3 safe-change protocol mapped onto our task grades. Matters more for us than for them because our platform modifies itself: blueprint edits, charter changes, skill promotions, lens edits and compiler output all resolve through the same resolver. **The Company Compiler is a subject of the autonomy model, not exempt from it.** | [02 §7.4](02-authority-and-autonomy.md) |

### Corrected

| Correction | Where |
|---|---|
| **Documentation trustworthiness is per-document, not per-vintage.** `PLATFORM-FEATURE-INVENTORY.md` marks Garage, Assets Store, AI Studio, `/signup`, `/settings/*`, themes and visual-regression tests as "Shipped"; grep returns **zero matches** for all of them. It sits beside an honest README with nothing signposting the difference. My Batch-A assessment that "current documentation is trustworthy" was too generous. | [P1 forensic §5.1](platforms/01-graph-portal-platform/01-forensic-analysis.md) · [P1 verdict §8](platforms/01-graph-portal-platform/02-verdict.md) |

### Validated without change

- `ai.evaluate_tool_invocation` — a dry-run evaluator returning `missing_permissions`,
  intended to run *before* enabling the invoke button. Independent arrival at both
  our **Approval Preflight** and our **recoverable denial**.
- AI approvals inbox with decisions history ≡ our approval queue.
- "Every mutation needs permission, validation, persistence, audit event, and
  domain event" ≡ our mutation ordering rule.
- "AI must respect the same permission and audit model as the rest of the
  platform" — stated by them, not enforced; exactly the two-world defect we
  identified in the code.

### Recorded for later

- **Preservation baseline as a document type** (`PRESERVE-01/02/03`): named
  behaviours that must not regress, each with an attached regression spec. Our
  equivalents would be the resolver as sole decision point, audit inside the
  transaction, discovery never granting access, authority never amplified.
- Capability naming convention `module.object.verb` with declared risk level.

---

## 2026-08-08 — Second forensic pass: identity, database, salvage mapping

New document: [P1 map — Platform 1: Identity, Database and Salvage Mapping](platforms/01-graph-portal-platform/03-identity-and-salvage-map.md).
Exact stack and versions, complete 20-table database inventory, and a per-need
map from our five kernel services to reusable code with LIFT/ADAPT/PATTERN/
REPLACE/BUILD verdicts.

### Corrections to [P1 forensic](platforms/01-graph-portal-platform/01-forensic-analysis.md) and [P1 verdict](platforms/01-graph-portal-platform/02-verdict.md)

Three findings the first pass missed. All three are properties I credited the
codebase with that it does not have.

| Correction | Detail |
|---|---|
| **Audit is not transactional** | `DatabaseUnitOfWork` does not exist — zero matches for `UnitOfWork`, `.transaction(` or `appendWithinTransaction`. Mutation commits, then audit inserts separately. Documentation and README both claim otherwise. |
| **Correlation and causation are runtime-dead** | Every `correlation_id` is a fresh `randomUUID()`; `causation_id` is always `null`, across all 12 emission sites. Nothing can be traced. I had credited this as a strength — it is a strength of the schema, not the runtime. |
| **The resolver loads all rules and filters in memory** | `permission.repository.ts:84-88` selects every tenant rule then filters in JS. The exact anti-pattern their own AI-first policy forbids, on the hottest path. |

Sequencing updated in [P1 verdict §7](platforms/01-graph-portal-platform/02-verdict.md): transactional audit and
real correlation added to Step 4; SQL-level filtering becomes a **prerequisite**
of Step 3, since our resolver adds four more lookups to that same path.

### Salvage summary

Roughly **3,000–3,500 of ~30,700 lines** are worth carrying forward, concentrated
in the resolver, the portal graph, delegations, localisation and the plumbing
nobody budgets for. Ranked inventory in [P1 map §4.8](platforms/01-graph-portal-platform/03-identity-and-salvage-map.md);
explicit do-not-carry list in §4.9.

---

## 2026-10-04 — Analysis programme: the contested-ownership decisions adopted

Source: the 12-batch analysis programme ([`library/analysis/`](../../library/analysis/)),
batches 9–12. These are the design decisions the programme settled — above all the five
contested items the register marked **"the owner's to decide"**, adopted 2026-10-04. Full
reasoning: [`findings/10`](../../library/analysis/findings/10-contested-ownership.md) and the
development plan [`findings/12`](../../library/analysis/findings/12-development-plan.md).

### Decided — ownership boundaries

| Change | Where | Origin |
|---|---|---|
| **The agent runtime is Hermes** — Q6 closed | [07](07-open-questions.md) | batch 9 map · batch 11 S-01 |
| **Approvals split by scope** — our gate owns business actions; risk-graded | [02 §4.4](02-authority-and-autonomy.md) | batch 10 C-1 |
| **Scheduling split by scope** — our scheduler owns business jobs; valid only if enforced | [01 §2.1](01-core-architecture.md) | batch 10 C-3 |
| **Memory vs knowledge split by the six categories** — build only the authorization boundary | [04 §9](04-context-graph-and-tags.md) | batch 10 C-6 |
| **Chat channels split by scope** — ours is the business inbox | [05](05-addressing-and-mentions.md) | batch 10 C-11 |
| **Delegation renamed** — ours is *authority* delegation; Hermes's is *task* delegation | [05 §4.1](05-addressing-and-mentions.md) | batch 10 C-15 |

### Added — the four vocabulary collisions

*Capability*, *delegation*, *project* and *widget* each name **two different things** — ours
and Hermes's. Recorded so a reader can tell which is meant, and so no document uses them
interchangeably.

**`widget` — resolved by a reported default, 2026-10-05 (Sprint G-07).** The `widget` collision is
the one case that is *kit vs vision*, not *ours vs Hermes's*: the Starting Kit already calls its
dashboard tiles "widgets" (a TSX component with a metadata id and slots), while the vision's Widget
is a typed business object with a contract, an IR and a registry. Batch 4 §15b recommended keeping
"widget" for the kit's tile and calling the vision object a **"Business Widget"**, and that
recommendation was carried to batch 9 but never formally taken. **G-07 takes it as its own call:**
the vision object is a **`BusinessWidget`** (`packages/shared/src/lib/business-widget/`); the kit's
tile keeps the word `widget` unchanged. The reason is cost, not taste — the kit's word is in dozens
of files and its public module API, the vision's object has no callers, so renaming the cheap side
is the cheap move. **Recorded as our call, not an owner decision, so it can be overruled in one
line** (COOKBOOK rules zero-zero and zero-seven).

### Added — the build order, as a gate

The development plan fixes the order: **the Business Model Kernel specification first
(RQ-140 — the vision's own implementation gate), then the spine (G-01 → G-02 → G-03), the
security floor, the product surface, the hygiene.** By the vision's own rule (§29), no
implementation begins before the kernel specification exists.

### Validated without change

- **The "do not build" list** (12 items) — each is the *runtime* half of something Hermes
  runs, or the *second* copy of something we run.
- **The `V`-register** (23 entries: 16 KEEP, 7 HOLD) — value we hold that the vision does
  not ask for.

---

## Appendix — Batch A: noted as a rubric flaw

[Rubric](method/platform-evaluation-rubric.md) scores *absent* and *present-but-wrong-shaped*
almost equally. Correct for third-party adoption, backwards for our own code:
absent costs what we already budgeted; wrong-shaped costs that plus demolition.
Recorded in [P1 verdict §3](platforms/01-graph-portal-platform/02-verdict.md) rather than silently adjusted.
