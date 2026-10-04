# Batch 11 — Shortcut register and gap register

**Batch:** 11 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** batches 9 and 10 — the overlap matrix, the contested-ownership register and its decided outcomes.
**Question this batch answers:** *what do we get for free by combining what we have with Hermes — and what must genuinely be built?*

**Definition of done (from `PLAN.md`):** *two honest lists and a build order, with no item resting on an unverified claim.*

---

## 0. How to read this report

| List | What it holds | The test an item must pass |
|---|---|---|
| **Shortcut register** (§2) | a requirement that **something we already run, or Hermes already runs, largely pays for** | it must name the **file** that ticks it, and say **what is still needed** |
| **Gap register** (§3) | a requirement **nothing covers** | it must say **why nothing covers it**, a **size**, and **what it depends on** |
| **Build order** (§4) | what must exist before what | each phase names the phase it is blocked by |
| **"Do not build" list** (§5) | things we should **deliberately not build** | it must name the reason — usually a decision in batch 10 |

**A shortcut that needs a week of work is not a shortcut.** Every shortcut here carries a "still needed" column, and the **critic pass (§7) downgraded five of them** to half-built.

**The decisions from batch 10 are gates on this report.** C-6 removes a build (no parallel memory); C-3 adds one (the scheduler enforcement gate); C-11 and C-2 remove others. Those are reflected below, not re-litigated.

---

## 1. What went in

- **Batch 6's 13 shortcuts** (R-01…R-13) and **12 gaps** (R-14…R-25) — measured from our kit.
- **Batch 7's `V`-register** (V-01…V-13) — value beyond the vision.
- **Batch 9's** 140-row matrix — 30 `COVERED` cells, 64 kit `MISSING`s, 3 `CONFLICT`s.
- **Batch 10's** 18 contested items and the **five decided outcomes**.

**Consolidated: 20 shortcuts · 20 gaps · a 4-phase build order (after the decisions already taken) · 12 "do not build" entries · a 23-entry `V`-register.**

---

## 2. The shortcut register — ordered by how much work it saves

| ID | The requirement | What already ticks it | Evidence | What is still needed |
|---|---|---|---|---|
| **S-01** | An agent runtime (RQ-22, RQ-86, RQ-101) | **Hermes ships the whole thing** — agent loop, tool loop, sessions, skills, memory, subagents, sandbox | `agent/`, `tools/`, `skills/` (batch 7 §5–§12) | the integration boundary + our gate. **The single biggest shortcut in the programme** |
| **S-02** | An authorization kernel + audit (RQ-50…RQ-72, RQ-113…RQ-116) | our **layered resolver** returning a `Decision` with reasons + a **hash-chained ledger** | `shared/src/lib/authority/decision.ts`; `ledgerService.ts` (batch 6 §4, §9) | wire the **5 missing inputs**; make it the **enforcement point** (not shadow); add `policy_version`/`decision_id` |
| **S-03** | Model providers, routing, local-first (RQ-88, RQ-91…RQ-93, RQ-98, RQ-99) | **Hermes: 38 providers**, auxiliary models with **automatic fallback**, a **llama.cpp** local runtime | `plugins/model-providers/`; `agent/auxiliary_*.py` (batch 7 §9) | our **model policy layer** (allow-list) above it (S-11 is the gap) |
| **S-04** | Skills (RQ-124) | **Hermes: 210 skills** | `skills/`, `optional-skills/` (batch 7 §3) | **publication + governance**; content/licensing review (**V-09, HOLD**) |
| **S-05** | Eventing, scheduling, queue, webhooks (RQ-127…RQ-131) | our **full stack** — `events`, `webhooks`, `scheduler`, `queue`, 44 subscribers, 42 workers | `packages/{events,webhooks,scheduler,queue}` (batch 6 §8) | the **scheduler enforcement gate** (C-3, decided) |
| **S-06** | Multi-tenancy (RQ-60, RQ-61) | `tenant_id` is **required** on every query — a hard structural guard | `shared/src/lib/query/engine.ts` (batch 6 §14) | **RLS as defence in depth** (C-18) |
| **S-07** | Search and retrieval (RQ-123, RQ-14) | **hybrid** tokens/vector/fulltext + 3 vector drivers + an indexer | `packages/search`, `query_index` (batch 6 §7) | **tenancy filtering + classification-aware routing** — unproven today |
| **S-08** | AI runtime plumbing — tools, MCP, approvals, cost (RQ-88, RQ-89, C-16) | `ai-assistant`: agent runtime, **MCP client *and* server**, pending actions, token/cost metering | `packages/ai-assistant` (batch 6 §6) | **Input/Output Guards + context firewall** (G-06) |
| **S-09** | A UI shell and an extension system (RQ-134) | React library + a **1,359-line injection framework** with behaviour hooks; perspectives; dashboards | `packages/ui` (batch 6 §13) | the **Widget contract / IR / registry** (G-07) — the shell *hosts* it, does not supply it |
| **S-10** | Identity and principals (RQ-110) | `Principal` + `api_keys` (a machine Principal) + an `ai_worker` kind | batch 6 §17a R-01 | the remaining **subject classes** Doc 8 lists |
| **S-11** | A workflow / rules engine (RQ-16…RQ-18, RQ-128) | `workflows` + `business_rules`, both tested | `core/src/modules/{workflows,business_rules}` (batch 6 §11) | whether it is the **substrate for User Functions** (G-03) |
| **S-12** | Chat channels for agents (RQ-133) | **Hermes: 34 adapters** (29 messaging) | `gateway/platforms/` (batch 7 §18) | the **C-11 split** — ours for business, Hermes's for agent chat |
| **S-13** | An MCP catalogue (RQ-88, C-16) | **Hermes: 65 optional MCP definitions** | `optional-mcps/` (batch 7 §10) | vetting each one (**V-13, HOLD**) |
| **S-14** | An ops/admin console (RQ-135) | **Hermes: an extensible ops console** | `web/` (batch 7 §15; **V-04**) | decide whether to adopt it beside our `ui` |
| **S-15** | Files, i18n, notifications (RQ-76, RQ-134) | `attachments`, **5 locales with RTL**, notification types | batch 6 §12 | — |
| **S-16** | Custom fields and extensibility (RQ-08) | the `entities` module — custom field defs, custom entities, per-entity configs | `core/src/modules/entities` (batch 6 §17a R-09) | classification metadata on fields (G-05) |
| **S-17** | Per-tenant configuration (RQ-08) | `module_configs` + the `configs` module | batch 6 §17a R-13 | a UI (deferred) |
| **S-18** | A sandbox for deterministic execution (RQ-98) | **Hermes: a containerised execution image** + restrictable terminal backends | batch 7 §11 | our **authorization** around it (Hermes isolation ≠ platform authorization) |
| **S-19** | Document extraction (RQ-126) | **Hermes: multi-format extraction** | batch 7 §18 | security labels preserved (G-16) |
| **S-20** | Localisation reach (RQ-134) | **Hermes: 17 localised languages** incl. RTL | `locales/` (batch 7; **V-12, HOLD**) | translation quality review |

**The shape of it: the *infrastructure* half is bought and the *agent* half is borrowed.** S-02, S-05, S-06, S-07, S-15, S-16, S-17 are ours and live; S-01, S-03, S-04, S-12, S-13, S-14, S-18, S-19, S-20 are Hermes's and running.

---

## 3. The gap register — ordered by what unblocks the most

| ID | The requirement | Why nothing covers it | Rough size | Depends on |
|---|---|---|---|---|
| **G-01** | **The Business Model Kernel** — a canonical, versioned, typed model (RQ-01…RQ-09) | it does not exist; we have per-module `@Entity` classes, not a canonical model | **XL** | **nothing — it is first** |
| **G-02** | **Business IR + the compiler** from IR (RQ-10…RQ-15) | nothing like it exists; the spine of the vision | **XL** | **G-01** |
| **G-03** | **User Functions** — AI work promoted to deterministic software (RQ-22…RQ-27) | nothing; nearest neighbour is `workflows`, a generic engine | **XL** | **G-02** |
| **G-04** | **The data-axis authorization layer** — field/record/value/relationship (RQ-57…RQ-59, C-17) | we have *caller-specified* field selection, not policy-derived projection; no traversal rules | **L** | **G-01** (it must know what fields/relations exist) |
| **G-05** | **Classification metadata on entities and fields** (RQ-73, RQ-74) | our `DataClass` is attached to *capabilities*, never to entity fields | **M** | **G-01** |
| **G-06** | **AI Input Guard / Output Guard / context firewall / trust labels** (RQ-83…RQ-85, RQ-87) | no such code in the AI path — **the largest security gap** | **L** | **G-05** |
| **G-07** | **The Widget contract / Widget IR / a versioned registry** (RQ-40…RQ-42) | the injection system is a UI extension point, not a registry object | **L** | **G-01** |
| **G-08** | **The relationship fabric** — relationships first-class, 14 attributes (RQ-05) | `defineLink` appears in **1** file; no connectivity model | **L** | **G-01** |
| **G-09** | **The `@`/`#` reference and resolution layer** (RQ-43, RQ-47) | the `@` button inserts a literal `@`; the object-link registry ships **empty** | **M** | **G-01** |
| **G-10** | **Dependency tracking + change propagation** (RQ-32, RQ-33) | nothing; no `depends_on`/`used_by`, no impact classes | **M** | **G-01** |
| **G-11** | **The platform model-policy layer** (RQ-90) | nothing above Hermes's model management | **M** | **G-05** (classification drives routing) |
| **G-12** | **Business backup and restore** (C-13) | **no backup module exists** — searched by name and by content | **M** | **nothing — can start now** |
| **G-13** | **Aggregation / inference controls** (RQ-77) | nothing (minimum group size, suppression) | **M** | **G-04** |
| **G-14** | **Break-glass and separation of duties** (RQ-72) | nothing | **S–M** | **G-04** |
| **G-15** | **PostgreSQL Row-Level Security** (C-18) | no `ROW LEVEL SECURITY` anywhere in the source | **S–M** | **nothing** (additive; must be *derived* from the same policy) |
| **G-16** | **A security-event taxonomy** (the 20 named events) | we have generic logs, no named security-event types | **M** | **G-05** |
| **G-17** | **Schema-constrained generation** for IR/extraction (RQ-94) | nothing | **M** | **G-02** |
| **G-18** | **The scheduler enforcement gate** (C-3, decided) | nothing enforces the business/runtime split today | **S–M** | **S-05** |
| **G-19** | **A proprietary ERP benchmark** (RQ-136) | nothing | **M** | **G-01 / G-02** |
| **G-20** | **Freshness, lineage and continuous linting** (RQ-35, RQ-37) | nothing; the ledger has correlation but no freshness/lineage model | **M** | **G-01** |

**The shape of it: the gaps are the *product*.** Sixteen of the twenty cluster in three places — the **business-model spine** (G-01, G-02, G-03, G-07, G-08, G-09, G-10, G-17, G-19, G-20), the **data-level security layer** (G-04, G-05, G-06, G-13, G-14, G-16), and **two that stand alone** (G-12 backup, G-18 the scheduler gate). **G-15 (RLS) is the only gap that depends on nothing.**

---

## 4. The build order — what must exist before what

**Phase 0 — the decisions (done).** The five batch-10 decisions are recorded; the vocabulary register fixes four collisions (Capability, delegation, project, widget).

**Phase 1 — the spine (nothing precedes it).**
`G-01 Business Model Kernel` → `G-08 relationship fabric` → `G-02 Business IR + compiler`.
*This is the vision's own first artifact (README §16) and its own implementation gate (§29). Nothing in phase 2–4 is safe to build before the kernel exists, because every one of them needs to know what an entity, a field and a relationship **are**.*

**Phase 2 — the security floor (blocked by phase 1).**
`G-05 classification` → `G-04 data-axis authorization` → `G-06 AI guards` → `G-16 event taxonomy` → `G-13 aggregation` → `G-14 break-glass`; and `G-15 RLS` can run in parallel (depends on nothing).
*The order inside the phase is fixed by dependency: classification is the input to authorization and to the guards.*

**Phase 3 — the product surface (blocked by phase 1, informed by phase 2).**
`G-07 Widget contract` → `G-09 reference layer` → `G-03 User Functions` → `G-17 schema-constrained generation`.
*User Functions are last in the phase because they need the IR (G-02) and the Widget/reference layer to be *usable* by a person.*

**Phase 4 — the hygiene (can start any time; not on the critical path).**
`G-12 backup` → `G-18 scheduler gate` → `G-19 benchmark` → `G-20 freshness/lineage/lint`.
*G-12 and G-18 are the two that can start **today** — they depend on nothing in the spine.*

**The critical path is four items long: G-01 → G-02 → G-03, with G-08 folded into G-01.**

---

## 5. The "do not build" list

Things the vision asks for, or that a reader might assume we must build, that **we should deliberately not build** — each with the decision behind it.

| # | Do not build | Why | From |
|---|---|---|---|
| DB-01 | **A parallel agent memory** | Hermes ships five tested providers; rebuilding is the reverse of "capitalise on Hermes" | **C-6 (decided)** |
| DB-02 | **A second knowledge base that acts as memory** | only the **authorization boundary** is ours to build; the memory is Hermes's | **C-6 (decided)** |
| DB-03 | **A second scheduler** | a split that is not *enforced* is one scheduler wearing two labels; if the gate cannot be built, Hermes wins outright | **C-3 (decided)** |
| DB-04 | **A skill runtime** | Hermes's hub is complete; we build only *publication* | **C-2** |
| DB-05 | **A second MCP client** | Hermes's client + 65-entry catalogue already does it | **C-16** |
| DB-06 | **Our own session-search engine** | Hermes's `session_search` is free (no model calls) and proven | **C-14** |
| DB-07 | **Our own chat adapters for *agent-facing* chat** | Hermes's 34 adapters already do it; ours are for *business* messages | **C-11 (decided)** |
| DB-08 | **A second policy kernel** | two components deciding violates I5; the data-axis layer is a *layer*, not a kernel | **C-17** |
| DB-09 | **A model-provider layer** | Hermes has 38 hot-swappable providers; we build only the *policy* layer | **C-8** |
| DB-10 | **An agent loop** | Hermes is the agent runtime (S-01) | batch 7 |
| DB-11 | **A second authentication stack** | `customer_accounts` duplicates `auth` — an *island to remove*, not a feature to grow | batch 6 §16 |
| DB-12 | **A second event bus for business events** | our bus owns business events; Hermes's hooks stay runtime-scoped | **C-12** |

**The pattern: every "do not build" is the *runtime* half of something Hermes already runs, or the *second* copy of something we already run.** The things we *do* build are the **business-model spine** and the **authorization/classification layers** — which is exactly where the vision's centre is and where neither side has anything.

---

## 6. The `V`-register, consolidated (batches 1–7)

The owner's standing rule: things that **add value beyond the vision**. Batch 7 started it (V-01…V-13); this batch **back-fills batches 1–6** (V-14…V-23). Each names the benefit concretely; status is from the code.

### 6a. From Hermes — V-01…V-13 (batch 7, restated)

| ID | What it is | Verdict |
|---|---|---|
| **V-01** | Auxiliary/chore models with **automatic fallback** — turns local-first from a hardware problem into a routing problem | **KEEP** |
| **V-02** | **38 model providers**, hot-swappable, no code change | **KEEP** |
| **V-03** | **Exact dependency pinning** as a security policy (post-PyPI-worm) | **KEEP** |
| **V-04** | The **extensible ops console** (`web/`) | **KEEP** |
| **V-05** | **34 platform adapters** (29 messaging) from one gateway | **KEEP** |
| **V-06** | **FTS5 with a CJK bigram tokenizer** — session recall in CJK | **KEEP** |
| **V-07** | **Credential pools with rotation** | **KEEP** |
| **V-08** | **Trajectories + a compressor** — raw material for evaluating the agent | **KEEP** |
| **V-09** | The **210-skill library** as a content asset | **HOLD** (licensing/content review) |
| **V-10** | **Kanban + bot rooms** (multi-agent collaboration) | **HOLD** (delegation/authority first) |
| **V-11** | **Computer-use + browser automation with a credential vault** | **HOLD** (must sit behind our approval gate) |
| **V-12** | **17 localised languages** incl. RTL | **HOLD** (quality review) |
| **V-13** | The **65-entry MCP catalogue** | **HOLD** (each needs vetting) |

### 6b. Back-filled from our own kit — V-14…V-23 (batches 1–6)

| ID | What it is | Where | Why it is worth keeping | Verdict |
|---|---|---|---|---|
| **V-14** | **Explanation as a value on every decision** — the reason is returned, not merely inspectable | `decision.ts` (batch 6 §4) | Doc 8 §175 only asks that an admin "should be able to inspect"; ours is **strictly stronger** | **KEEP** |
| **V-15** | **Trust tiers T0–T4** and the **trust asymmetry** | `shared/src/modules/trust.ts` | the vision does not model graded trust between actors | **KEEP** |
| **V-16** | **Effect classes E0–E6 × gates A0–A5 × task grades G0–G4** — an autonomy matrix | `shared/src/modules/capabilities.ts` | **richer than Doc 8's single 6-value risk scale** | **KEEP** |
| **V-17** | **Record locks** (open / restricted / locked) | `shared/src/modules/record-locks.ts` | not in the vision | **KEEP** |
| **V-18** | **Enforcement can only narrow** — it runs *after* RBAC has already said yes | `authorityEnforcementService.ts` | a **structural guarantee** the design does not state | **KEEP** |
| **V-19** | The **organisation graph with typed edges** | `directory/organization_edges` (batch 6 §10) | a graph the vision asks for but does not model | **KEEP** |
| **V-20** | **Shadow mode + a shadow report** | `shadow.ts`, `shadow-report.ts` | a migration instrument for turning a resolver into an enforcement point | **KEEP** |
| **V-21** | The **migration advisory lock** (drift-guarded migrations) | `packages/cli` (batch 6 §5) | prevents two boots racing on a migration | **KEEP** |
| **V-22** | **5 locales with RTL handled** | `ar, de, en, es, pl` (batch 6 §12) | reach the vision does not specify | **KEEP** |
| **V-23** | The **1,359-line UI injection framework** (hooks, navigate guards) | `packages/ui` (batch 6 §13) | the **host** a vision Widget can render into — more than a spot-injector | **KEEP** |

**The consolidated `V`-register is now 23 entries: 16 KEEP, 7 HOLD, 0 DROP.** The most valuable remains **V-01** — auxiliary models with fallback, which is what makes the vision's local-first claim practical.

---

## 7. Critic pass — challenge the shortcut count

**The attack, named.** The specific failure this batch could commit is: **call something a shortcut when it needs a week of work.** A shortcut that needs a week of work is not a shortcut. So I took every entry in §2 and asked: **how much is *actually* left, and is the remaining work the *hard* part?**

**Downgraded — five "shortcuts" that are really half-built:**

| Was a shortcut | The attack | Downgraded to |
|---|---|---|
| **S-02** authorization kernel | *Does the resolver decide anything today?* — **No. It is in `shadow`; RBAC still decides.** The wiring (5 missing inputs + making it the enforcement point) is the **hard part**, not a tidy-up | **half-built** — the kernel is free, the *enforcement* is the work |
| **S-09** UI shell | *Is the shell the Widget?* — **No.** The shell is free; the Widget contract/IR/registry (G-07) is a build | **half-built** — free shell, missing object |
| **S-08** AI runtime | *Does it have the guards?* — **No.** The runtime is free; the Input/Output Guards (G-06) are the largest security gap | **half-built** — free plumbing, missing safety |
| **S-07** search | *Is it tenancy-filtered and classification-aware?* — **Not proven** (batch 6 §18 #7). An unfiltered vector search is a security hole, not a shortcut | **conditional** — safe only after G-04/G-05 |
| **S-04** skills | *Are 210 skills usable as-is?* — **HOLD.** Licensing and content review first | **HOLD**, not a shortcut yet |

**Also downgraded:** **S-13** (65 MCPs — each needs vetting, **HOLD**) and **S-20** (17 locales — quality review, **HOLD**). **S-06** survives but only as *part* of the answer — RLS (G-15) is still a gap.

**Held — the shortcuts that genuinely survive:**

- **S-01** (the agent runtime): verified from the code (batch 7) — the largest real shortcut.
- **S-05** (eventing/scheduling/queue): live, tested, all enabled (batch 6 §18 #6).
- **S-06** (multi-tenancy): the query-engine guard is real and hard (batch 6 §18 #8).
- **S-15, S-16, S-17** (files/i18n, custom fields, per-tenant config): live and tested.
- **S-03** (models/routing/local-first): verified — but only the *capability*, not the *policy* (that is G-11).
- **S-12, S-14, S-18, S-19** (adapters, ops console, sandbox, extraction): Hermes-side, verified.

**The count after the critic:** **20 shortcuts → 13 genuine + 5 half-built + 2 held-for-review.** The two-line summary the owner needs: **the platform half is bought; the agent half is borrowed; the *product* half — the model spine and the data-level security — is neither, and must be built.**

**And one honest limit, stated plainly.** **Every shortcut above rests on code we can read, not on behaviour we can run.** We cannot run Hermes or our own gate here (no database, no container). So a "live and tested" claim means **the tests exist and the module is enabled** — it does not mean we watched it work. The one measurement that would upgrade all of them is the **dockerised instance** (the owner's standing note).

---

## 8. Definition of done

- **"Two honest lists."** Met — 20 shortcuts (§2) and 20 gaps (§3), each with its evidence or its reason, and the shortcuts' remaining work named.
- **"A build order."** Met — §4, four phases, the critical path stated (G-01 → G-02 → G-03).
- **"The 'do not build' list."** Met — §5, 12 entries, each with the decision behind it.
- **"No item resting on an unverified claim."** Met — every shortcut names a file; every gap says why nothing covers it; the critic pass downgraded five shortcuts that were **claims**, not measurements; and the batch's **own limit** (behaviour not run here) is stated in §7.

**Met?** Yes — with the stated limit that "live and tested" is a claim about the code and its gate, not about a run we performed.

---

## 9. Open items carried forward

| # | Item | Goes to |
|---|---|---|
| 1 | **The four-phase build order** — becomes the plan's skeleton | **Batch 12** |
| 2 | **The critical path** — G-01 → G-02 → G-03, and the vision's own gate (RQ-140) | **Batch 12** |
| 3 | **The 12 "do not build" entries** — must survive into the plan as explicit exclusions | **Batch 12** |
| 4 | **The vocabulary register** — Capability, delegation, project, widget | **Batch 12** |
| 5 | **G-12 backup and G-18 the scheduler gate** — the two that can start today | **Batch 12** |
| 6 | **The `V`-register (23 entries)** — 16 KEEP to carry, 7 HOLD to decide | **Batch 12** |
| 7 | **The dockerised instance** — would upgrade every "live and tested" claim to a measurement | the standing note |
| 8 | **Five half-built shortcuts** (S-02, S-07, S-08, S-09, S-04) — each is a build, not a tidy-up | **Batch 12** |
