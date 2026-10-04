# Batch 12 — The development plan

**Batch:** 12 of 12 · **Status:** complete · **Date:** 2026-10-04
**Inputs:** everything — above all batch 11 (the shortcut and gap registers, the build order) and batch 10 (the contested-ownership register and the five decided outcomes).
**Question this batch answers:** *what do we build, in what order, to get from where we are to the vision?*

**Definition of done (from `PLAN.md`):** *someone who was not part of any of this can read the plan and know what we are building, in what order, and why — and can start the first item without asking a question.*

**This is the deliverable the whole programme exists for.** Batches 0–11 produced evidence. This batch spends it.

---

## 0. How to read this plan

| Section | What it gives you |
|---|---|
| **§1** | the whole plan in one paragraph |
| **§2** | the phases — each with a **definition of done** and a **way to test it** |
| **§3** | what each phase needs from **Hermes**, from **our platform**, and **built** |
| **§4** | the **critical path** — what must happen before what, and why |
| **§5** | the **first three things to build**, concretely |
| **§6** | **Ramzi's decisions** — separated from ours |
| **§7** | what is **deliberately deferred**, and the **trigger** that brings it back |
| **§8** | the **"do not build"** exclusions — carried from batch 11 |
| **§9** | the **`V`-register** — value beyond the vision, carried |
| **§10** | what this batch changed in the project's own documents |
| **§11** | the reusable rules promoted into the cookbook and the lessons |
| **§12** | the **critic pass** — the plan read as a stranger |

**Every item here traces to a numbered finding** in batches 9–11 (`RQ-nn`, `G-nn`, `S-nn`, `C-nn`, `V-nn`, `DB-nn`). Nothing is asserted here that is not measured there.

---

## 1. The plan in one paragraph

**We build the product half, and we borrow the rest.**

The platform half is **bought** — identity, tenancy, the ledger, events, files, custom fields are live in the starting-kit (batch 11 §2, S-05…S-17). The agent half is **borrowed** — the agent loop, tools, skills, model providers and channels are Hermes's and running (S-01, S-03, S-04, S-12…S-20). The **product half is neither**: the **business-model spine** (the canonical model, the IR, the compiler, User Functions) and the **data-level security layer** (classification, field/record/value authorization, the AI guards) exist on neither side and **must be built** (batch 11 §3, §7). The plan is therefore four phases — **the spine, then the security floor, then the product surface, then the hygiene** — with a critical path **four items long: G-01 → G-02 → G-03**. Nothing in the vision may be built before the **Business Model Kernel specification** exists, because the vision says so itself (RQ-140) and because every later item needs to know what an entity, a field and a relationship *are*.

**And the single honest limit:** every "live and tested" claim in this programme rests on **code we read, not behaviour we ran**. The dockerised instance (§7) is what upgrades them to measurements.

---

## 2. The plan — the phases

Four phases. Phase 0 is done. Each later phase has a **definition of done** (when it is finished) and a **way to test it** (how we know it is finished without trusting a claim).

### Phase 0 — The decisions · **DONE, 2026-10-04**

**What it is.** The five contested items are decided (batch 10 §8), and the vocabulary register fixes four word-collisions.

| | |
|---|---|
| **Definition of done** | The five owner decisions (C-1, C-3, C-6, C-11, C-15) are recorded; the four vocabulary collisions (Capability, delegation, project, widget) are written down. |
| **Test** | A reader can answer "who owns memory?" and "is a subagent's authority inherited?" from the register alone. **Met** — batch 10 §8. |

### Phase 1 — The spine · *nothing precedes it*

**What it is.** `G-01 Business Model Kernel` → `G-08 relationship fabric` → `G-02 Business IR + compiler`. Preceded by the **kernel specification** (RQ-140 — the vision's own implementation gate).

| | |
|---|---|
| **Definition of done** | (a) The **Business Model Kernel specification** exists and fixes **one** canonical object list (the vision offers three — 30/33/34, union 37; batch 9 §6 #2). (b) A business described in plain language produces a **canonical object graph** — entities, fields, relationships, metrics — each with a declared contract, stable IDs and versions. (c) The **IR** exists and the compiler turns IR into schema; SQL is a *target*, never the source. |
| **Test** | **The rename test (batch 9 §6 #1):** rename a field; the IR either recompiles cleanly or says "requires recompilation". If it silently produces wrong SQL, the IR is not real. **Second test:** the canonical object graph round-trips — export it, reimport it, and the diff is empty. |
| **Why nothing precedes it** | Every phase 2–4 item needs to know what an entity, a field and a relationship **are**. Building classification or authorization first means inventing a model to hang them on, then rebuilding it. |

### Phase 2 — The security floor · *blocked by phase 1*

**What it is.** `G-05 classification` → `G-04 data-axis authorization` → `G-06 AI guards` → `G-16 event taxonomy` → `G-13 aggregation` → `G-14 break-glass`; and `G-15 RLS` runs **in parallel** (depends on nothing).

| | |
|---|---|
| **Definition of done** | (a) Every entity, field and relationship **declares** its security metadata — classification is first-class (RQ-73/74). (b) The **data-axis layer** returns an **authorized projection** — *which* rows/fields/values an actor may touch — not a retrieve-then-filter (RQ-57/58/59). (c) The **AI Input Guard / Output Guard / context firewall** stop unauthorized data entering model context *in the first place* (RQ-83…RQ-85, RQ-87). (d) The 20 named **security events** exist as types. |
| **Test** | **Adversarial, not illustrative.** (a) Request a record whose field is classified above the actor's clearance: the field must be **absent from the projection**, not masked after retrieval. (b) Plant a prompt-injection document in a knowledge source: it must not become a policy. (c) The **AI context** for a task must contain **zero** fields the actor may not read — checked by reading the assembled context, not the prompt. |
| **The order inside the phase is fixed by dependency:** classification is the input to both authorization and the guards. |

### Phase 3 — The product surface · *blocked by phase 1, informed by phase 2*

**What it is.** `G-07 Widget contract / IR / registry` → `G-09 @/# reference layer` → `G-03 User Functions` → `G-17 schema-constrained generation`.

| | |
|---|---|
| **Definition of done** | (a) A **Widget** is a first-class typed object with a contract and an IR (RQ-40/41/42). (b) An `@`/`#` reference **resolves** to a canonical entity and re-authorizes on dereference (RQ-43/47, RQ-117). (c) A **User Function** — validated AI-authored work — **runs with no LLM call** (RQ-22, RQ-25). |
| **Test** | **Switch the model off and run a Function.** If it still runs, it is deterministic software (the vision's own decisive property). **Second test:** create an `@` reference to a record the user may read, then remove the permission — the reference must **fail on dereference**, not silently return stale data. |
| **Why User Functions are last in the phase:** they need the IR (G-02) *and* the Widget/reference layer to be usable by a person. |

### Phase 4 — The hygiene · *can start any time; not on the critical path*

**What it is.** `G-12 business backup and restore` → `G-18 the scheduler enforcement gate` → `G-19 the ERP benchmark` → `G-20 freshness / lineage / linting`. **G-12 and G-18 depend on nothing in the spine and can start today.**

| | |
|---|---|
| **Definition of done** | (a) Business data has a **tested restore path** (today it has none — C-13 is a gap, not a decision). (b) The **scheduler enforcement gate** refuses an agent-created business job unless it passes our gate (C-3's condition). (c) A benchmark exists that scores the compiler like a compiler (RQ-136). (d) Freshness, lineage and continuous linting exist (RQ-35/36/37). |
| **Test** | (a) **Restore a backup into a scratch database** and diff against the source — the round-trip must be clean (L23: never test an irreversible guarantee on real infrastructure). (b) **Attempt to create a business job from an agent** and watch it be refused — the gate must be *seen to fire*. |

---

## 3. What each phase needs — Hermes / our platform / built

**Three columns, because the plan only works if the division of labour is explicit.** "Hermes" is what we *consume*; "our platform" is what we *reuse*; "built" is what does not exist anywhere.

| Phase | Needs from **Hermes** | Needs from **our platform** | Must be **built** |
|---|---|---|---|
| **1 — spine** | nothing (Hermes is `N/A` on the whole model spine — batch 9 §2A–D) | the `entities` custom-field module (S-16) as the *seed* of extension; `query_index` as a projection target | **G-01** kernel · **G-08** relationship fabric · **G-02** IR + compiler · **G-10** dependency tracking (feeds the IR) |
| **2 — security floor** | the runtime **tool-approval** guard (C-1: Hermes keeps guarding raw tool use) | the **resolver** (`decision.ts`) + `authorityEnforcementService` (**S-02** — but see the half-built note) · the **ledger** · the query-engine tenant guard (S-06) | **G-05** classification · **G-04** data-axis authorization · **G-06** AI guards (**the largest security gap**) · **G-16** event taxonomy · **G-13** aggregation · **G-14** break-glass · **G-15** RLS (parallel) |
| **3 — product surface** | the agent runtime (**S-01**) that *authors* Functions and Widgets; **G-17** needs Hermes's schema-constrained generation (RQ-94 `PARTIAL`) | the **UI injection framework** (V-23) as the *host*; `workflows` + `business_rules` (S-11) as a candidate substrate | **G-07** Widget contract/IR/registry · **G-09** reference layer · **G-03** User Functions · **G-17** schema-constrained generation |
| **4 — hygiene** | `hermes backup` for **its own home** only (C-13) | the `scheduler` + `events` + `webhooks` stack (S-05) that the **G-18** gate attaches to | **G-12** backup/restore · **G-18** scheduler gate · **G-19** benchmark · **G-20** freshness/lineage/lint |

**The reading of the table:** **phase 1 needs nothing from Hermes and everything from us to build** — which is exactly why it is the critical path. **Phase 2 needs Hermes only at the tool boundary.** **Phase 3 is where Hermes's agent runtime earns its keep.** **Phase 4 is ours alone.**

---

## 4. The critical path

**Four items long: the kernel specification → G-01 → G-02 → G-03, with G-08 folded into G-01.**

```
kernel spec (RQ-140)
   └─> G-01 Business Model Kernel  (+ G-08 relationship fabric)
          └─> G-02 Business IR + compiler
                 ├─> G-03 User Functions        ← the product's distinctive feature
                 ├─> G-04 data-axis authorization (needs G-01)
                 └─> G-07 Widget contract       (needs G-01)
```

**Why this order, and not another:**

1. **The specification comes first because the vision says so.** §29: *"If those answers are not clear, the implementation phase should not yet begin."* §16: the Business Model Kernel specification is the next major artifact. **RQ-140 is a gate, not a step.** The one thing it must settle is the **object list** (30/33/34 → one list) — a test suite cannot be written against "the objects" until one list is chosen (batch 9 §6 #2).
2. **G-01 precedes G-02** because you cannot compile an IR for a model you have not defined.
3. **G-02 precedes G-03** because a User Function *is* compiled IR made durable (RQ-24: *the IR is the durable asset; SQL is a derivative*).
4. **Everything in phases 2–4 waits on G-01**, because each needs to know what an entity, field and relationship *are* — classification attaches to fields, authorization projects fields, Widgets reference entities.

**What can run in parallel with the critical path — the four independent items:** `G-12` (backup — depends on nothing), `G-15` (RLS — depends on nothing), `G-18` (the scheduler gate — depends only on S-05, which is live), and the **S-02 enforcement wiring** (the resolver exists; making it the enforcement point does not wait on the kernel).

**The one branch that can invalidate a decision:** **C-3.** If the **scheduler enforcement gate (G-18) cannot be built**, the honest answer is **one scheduler, not a split** (batch 10 §5). **G-18 is therefore a requirement on the plan, not a nicety** — and it is on the early, independent track precisely so the fork is resolved before it costs anything.

---

## 5. The first three things to build

**Stated concretely enough to start.** These are the three items an engineer opens on day one — the gate, the spine, and the one safety item that must not wait.

> **Added 2026-10-04 — Sprint 0 precedes them: the running trio.** The owner asked for the
> dockerisation to be timed, and for the three pieces to be shown working together before
> development. **Decision: Sprint 0 — stand up the local dockerised trio (platform + Hermes +
> the model server) — is the first thing built, in parallel with writing the specification.**
> The stack is **already dockerised and already targets laptop and cloud from the same file**
> (`DEPLOY_ENV`), so this finishes something that exists and makes every later step develop
> against a real running system. Full reasoning: [`../../development/ARCHITECTURE.md`](../../development/ARCHITECTURE.md) §5.

### 1. The Business Model Kernel specification — *the gate (RQ-140)*

- **What it is:** a design-control document, not code. It fixes **one canonical object list** (from the union of **37** candidates in batch 9 §6 #2 — the 37 are listed below), the **contract of each kernel object** (entity/field/relationship/metric/rule/constraint/command/workflow/event/projection — RQ-03), and the classification taxonomy (CORE / CAPABILITY / PROJECTION / REFERENCE / EXTERNAL / TEMPORARY — RQ-06).
- **Why first:** the vision forbids implementation before it, and every later item depends on the model it fixes.
- **Done when:** the object list is one list; every object has a declared contract; a reader can name what an "entity" is without asking.
- **Settles:** the owner's object-list decision (§6).

> **The 37 candidates, measured 2026-10-04 — and a correction.** The union of the vision's three
> lists is **37**, not the **36** this plan and nine other places said. The error was an
> arithmetic slip in the sentence that stated it: `30 + LegalEntity + Function + Dependency + the
> four contracts` is **30 + 3 + 4 = 37**. Re-measured twice from the source files
> (`library/ai/ai-first/`: Doc 3 §38 = 30, README §16 = 33, Doc 3 §150 = 34), both routes agreeing.
> **The owner's decision is unaffected** — he decided to start from the union and prune; only the
> size was mis-stated. The candidates, in the order the vision introduces them:
>
> | # | Object | From |
> |---|---|---|
> | 1–8 | `Tenant` · `Organization` · `User` · `Agent` · `Role` · `Permission` · `Module` · `Capability` | Doc 3 §38 |
> | 9–13 | `Entity` · `Field` · `ValueObject` · `Enum` · `Relationship` | Doc 3 §38 |
> | 14–16 | `Metric` · `Rule` · `Constraint` | Doc 3 §38 |
> | 17–19 | `Command` · `Workflow` · `Policy` | Doc 3 §38 |
> | 20–22 | `Event` · `Projection` · `View` | Doc 3 §38 |
> | 23–27 | `Document` · `Knowledge` · `Skill` · `Tool` · `Integration` | Doc 3 §38 |
> | 28–30 | `Version` · `Migration` · `AuditRecord` | Doc 3 §38 |
> | 31–33 | `LegalEntity` · `Function` · `Dependency` | README §16 only |
> | 34–37 | `BusinessQueryIR` · `BusinessCommandIR` · `TaskContract` · `ResultContract` | Doc 3 §150 only |
>
> **Note for the specification:** items 34–37 are **interfaces, not kernel objects** — Doc 3 §150
> is by its own words listing *"what the next design document should define"*, which is a superset
> by design. They are the first candidates for pruning, and pruning them is the specification's
> call, not this plan's.

### 2. G-01 — the Business Model Kernel (+ G-08 relationship fabric)

- **What it is:** the canonical, versioned, typed business model *above* the physical database — the single source of truth (RQ-01). Relationships become first-class metadata with declared attributes (RQ-05); today `defineLink` appears in **one file** (batch 9 §2A).
- **Why second:** it is the spine; nothing else is safe to build without it.
- **Done when:** a business described in plain language produces a canonical object graph with stable IDs, declared contracts and versions; relationships carry their attributes.
- **Test:** the export/reimport round-trip is empty (§2, phase 1).

### 3. G-12 — business backup and restore

- **What it is:** the missing restore path for business data. **No backup module exists** — searched by name and by content (C-13, G-12).
- **Why third, and why now:** it **depends on nothing**, it is a **safety gap** (a tenant's business data has no tested restore today), and it is independent of the spine — so it can be built while the kernel specification is being written. **It is the one item whose delay is a live risk rather than a deferred feature.**
- **Done when:** a backup round-trips into a scratch database with a clean diff (§2, phase 4).
- **Also startable today, in parallel:** **G-18** (the scheduler gate — small, resolves the C-3 fork) and **G-15** (RLS — additive, depends on nothing).

**The shape of the first three:** one **document** (the gate), one **kernel** (the spine), one **safety net** (the backup). A specification cannot be "mostly done", a kernel cannot be built before its spec, and the backup cannot wait for either.

---

## 6. Ramzi's decisions, separated from ours

**The owner's decisions are not ours to make, and ours are not his to carry.** Every item below is labelled.

### 6a. Decided by Ramzi — 2026-10-04

Recorded in batch 10 §8. **A decision here is a gate, not a preference.**

| # | Decision | What it settles |
|---|---|---|
| **C-1** | Approvals — **split by scope**; our gate owns business actions | Hermes's mode is `manual`, never `smart`; **risk-graded** — only actions above a risk class wait for a person |
| **C-3** | Scheduling — **split by scope**; our scheduler owns business jobs | `allow_agent_scheduling` off by default; **valid only if G-18 enforces the boundary** — else one scheduler |
| **C-6** | Memory vs knowledge — **split by the six categories**; build **only the authorization boundary** | Hermes owns agent memory + session history; we own business truth, tenant knowledge, procedural skills; **no parallel memory** |
| **C-11** | Chat channels — **split by scope**; ours is the business inbox | We do not build adapters for agent-facing chat |
| **C-15** | Delegation — **split + rename** | Ours is *authority delegation*; Hermes's is *task delegation*; the words are not interchangeable |

### 6b. Still Ramzi's — **decided 2026-10-04**

**Update, 2026-10-04.** The owner reviewed these and **adopted every recommendation below** —
the object list, the C-7/C-18 security confirmations, and the C-8 model default. The table is
kept as the record of what was recommended and adopted. **The two `HOLD` items (V-04 and the
seven `V`-HOLDs) remain open**, to be decided when their triggers fire
([`../../../library/development/BACKLOG.md`](../../../library/development/BACKLOG.md)).

| # | Decision | Why it is his | Our recommendation |
|---|---|---|---|
| **Object list** | Which canonical object list — 30, 33, or 34? | It defines the product's nouns; the vision offers three | Pick the **union (36)** and let the spec prune it — the spec is where it gets settled |
| **C-7** | Confirm the **secrets** split | Security consequence: tenant secrets must never enter a Hermes home | Confirm the hard rule (batch 10 §3 C-7) |
| **C-18** | Confirm **RLS as additive**, derived from the same policy | Security consequence: RLS must not become a second decision point (I5) | Confirm — RLS derived, app guard authoritative |
| **C-8** | The **tenant model-policy default** | It decides what a tenant may reach by default | Default-deny with a reviewed exception path (batch 10 §5) |
| **V-04** | Adopt Hermes's **ops console** beside our `ui`? | A product-surface choice | **HOLD** — decide after the Widget contract (G-07) |
| **The 7 `V`-HOLDs** | V-09 licensing · V-10 multi-agent boards · V-11 computer-use · V-12 locale quality · V-13 MCP vetting | Each is a judgement about risk or content, not code | See §9 |
| **The dockerised instance** | When to stand up a local Hermes to upgrade "read" to "ran" | Owner-scheduled | See §7 |

### 6c. Ours — decided here, reported not asked

The rest of the register: C-2, C-4, C-5, C-9, C-10, C-12, C-14, C-16, C-17, and the phase order. **These are technical calls with a defensible answer; they are made, and reported so the owner can overrule cheaply** (COOKBOOK rule zero-zero case 3).

---

## 7. What is deliberately deferred — and the trigger

**Deferral is honest only when it is explicit and carries the trigger that brings it back** (COOKBOOK rule zero-one: a deferral is not a bandage when it names what is lost until then).

| Deferred | Why | **The trigger that brings it back** |
|---|---|---|
| **V-09 — the 210-skill library** | Licensing and content review not done | A licensing review passes |
| **V-10 — multi-agent boards (Hermes kanban)** | Delegation and authority must be settled first | After C-15's rename lands and the delegation boundary is enforced |
| **V-11 — computer-use + browser automation** | Must sit behind our approval gate (C-1) | After the approval gate is the enforcement point (phase 2) |
| **V-12 — 17 localised languages** | Translation quality unverified | A quality review passes; 5 locales ship today (V-22) |
| **V-13 — the 65-entry MCP catalogue** | Each entry is a third-party integration to vet | Each is vetted before it is enabled (never a trust root — N8-146) |
| **Phase 3's Widget layer** | Needs the kernel (G-01) and the IR (G-02) | G-02 is done |
| **The `@`/`#` full resolution layer** | Needs the kernel's entity registry | G-01 is done |
| **Cross-tenant authority** (Q12) | A conscious deferral in the design | A customer demand for AI acting into a supplier's tenant |
| **Layers 4–5 of the visualisation stack** (Q17) | A research programme; the lean is to stop at layer 3 | A customer problem that genuinely needs more |

---

## 8. The "do not build" exclusions — carried from batch 11 §5

**These are decisions, not omissions.** Each is the *runtime* half of something Hermes runs, or the *second* copy of something we run.

| # | Do not build | The decision behind it |
|---|---|---|
| DB-01 | A parallel agent memory | C-6 — Hermes ships five tested providers |
| DB-02 | A second knowledge base acting as memory | C-6 — only the authorization boundary is ours |
| DB-03 | A second scheduler | C-3 — a split that is not enforced is one scheduler |
| DB-04 | A skill runtime | C-2 — Hermes's hub is complete; we build *publication* |
| DB-05 | A second MCP client | C-16 — Hermes's client + catalogue does it |
| DB-06 | Our own session-search engine | C-14 — Hermes's `session_search` is free and proven |
| DB-07 | Our own agent-facing chat adapters | C-11 — Hermes's 34 adapters do it |
| DB-08 | A second policy kernel | C-17 — two deciders violates I5 |
| DB-09 | A model-provider layer | C-8 — we build only the *policy* layer |
| DB-10 | An agent loop | Hermes is the agent runtime (S-01) |
| DB-11 | A second authentication stack | `customer_accounts` duplicates `auth` — an island to *remove* |
| DB-12 | A second event bus for business events | C-12 — our bus owns business events |

---

## 9. The `V`-register — value beyond the vision, carried

**23 entries: 16 KEEP, 7 HOLD, 0 DROP** (batch 11 §6). The KEEPs are capabilities we already run that the vision does not ask for — cheaper than building. **The most valuable remains V-01** (auxiliary models with fallback), which is what makes the vision's local-first claim practical.

**The 16 KEEP:** V-01 fallback models · V-02 38 providers · V-03 dependency pinning · V-04 ops console · V-05 34 adapters · V-06 CJK FTS5 · V-07 credential rotation · V-08 trajectories · V-14 explanation-as-a-value · V-15 trust tiers T0–T4 · V-16 the autonomy matrix · V-17 record locks · V-18 enforcement-can-only-narrow · V-19 the org graph · V-20 shadow mode · V-21 the migration advisory lock · V-22 5 RTL locales · V-23 the UI injection framework.

**The 7 HOLD:** V-09 · V-10 · V-11 · V-12 · V-13 (see §7), plus the ops console (V-04) and S-04 (skills) pending their reviews.

**The rule that keeps it honest (owner's standing rule):** every KEEP names a concrete end-product benefit and survives the critic pass. A `V`-entry that cannot becomes a HOLD or a DROP — not a wish list.

---

## 10. What this batch changed in the project's own documents

**A plan that only lives in `findings/` is not a plan.** This batch updates the documents a newcomer actually reads.

| Document | What changed |
|---|---|
| [`companai/INDEX.md`](../../../INDEX.md) | The folder map now says the analysis programme is **complete**; the "if you only need one thing" table points at **this plan**; the status line is current |
| [`compai/planning/07-open-questions.md`](../../../compai/planning/07-open-questions.md) | **Q6 (agent runtime) closed** — Hermes is the runtime; the batch-10 decisions recorded in a new section |
| [`compai/planning/CHANGELOG.md`](../../../compai/planning/CHANGELOG.md) | A new dated entry: the five decisions and the four vocabulary fixes, each with its origin named |
| [`workspace/COOKBOOK.md`](../../../workspace/COOKBOOK.md) | One new rule: **measure from the artefact, not the description of it** |
| [`LESSONS.md`](../../../LESSONS.md) | Two new lessons: **a capability that exists is not coverage**; **a number written without measuring it** |
| [`library/analysis/PLAN.md`](../PLAN.md) | Batch 12's boxes ticked; the status table now reads **all 12 DONE** |
| [`library/analysis/LOG.md`](../LOG.md) | The closing entry |

---

## 11. The reusable rules promoted

**The programme produced four disciplines worth keeping.** They went where they will be found.

### Into `workspace/COOKBOOK.md` — how the work is done

**Rule zero-nine — measure from the artefact, not the description of it.** When a document and the thing it describes disagree, the **thing wins**. The owner's own directive for Hermes: *"the extract is the authority; the documents are the claims."* The same rule caught **8 wrong claims** in the sibling's Hermes documentation (batch 8) and **5 overstated claims in the vision itself** (batch 9 §6). **A description is a claim to check, never a fact to cite.**

**And its companion: reach every number by two routes.** A single derivation repeats its own mistake. Batch 9's requirement count (140) was confirmed two ways — grouping the registers, and counting the matrix rows — and the two agreed. **When two routes disagree, find out why; never average them and never quietly pick the nicer one.**

### Into `LESSONS.md` — mistakes made and how they were caught

**L48 — a capability that exists is not coverage.** The programme's most expensive error, made three times: marking something `COVERED` because a *capability* exists, not because it *does the job*. A resolver in `shadow` decides nothing (RQ-51); a search that is not tenancy-filtered is a hole, not a feature (S-07); a UI shell that hosts a Widget is not the Widget (S-09). **The test: what would the requirement need that this cannot do?** (Batch 9 §9.)

**L49 — a number written without measuring it.** Batch 9's hand-written verdict tally said `15 / 55 / 38`; parsing the file said `20 / 50 / 64`. Four domain-header counts were also wrong, and three `CONFLICT` rows had `COVERED` in their verdict cells. **The fix: never write a summary count by hand — parse the artefact you just wrote.** (Batch 9's defect; folded into the `count-rows-by-one-per-row-cell` skill.)

---

## 12. Critic pass — the plan read as a stranger

**The attack, named.** The specific failure this plan could commit is: **assert a phase is "done" because its box is ticked, or call something a plan when it is a wish.** So I read the plan as someone who was not there, and asked of every claim: **what is the evidence, and could I start without asking?**

**Asserted without evidence — found and fixed or flagged:**

| # | The claim | The attack | Outcome |
|---|---|---|---|
| 1 | "Phase 1 is the critical path" | *Prove nothing else can precede it.* | **Holds** — every phase 2–4 item needs G-01's model (batch 11 §4). But it **rests on the kernel specification existing first**, which is a *document* on the critical path — easy to skip. **Flagged as the plan's softest point.** |
| 2 | "The first three things to build" | *Is G-12 really third, or is it a distraction from the spine?* | **Holds, with a caveat** — G-12 depends on nothing and is a live safety gap; but it is **not** on the critical path, so a reader could think it delays the spine. **Stated as parallel, not sequential.** |
| 3 | "Hermes is `N/A` on the whole model spine" | *Is that a measurement or an assumption?* | **Holds** — batch 9 §2A–D shows Hermes `N/A` on all of RQ-01…RQ-49. Measured, not assumed. |
| 4 | "Every 'live and tested' claim is really 'code we read'" | *Is that too strong?* | **Holds and is load-bearing** — batch 11 §7 states it plainly; the dockerised instance is the only upgrade. **This is the plan's single biggest honest limit.** |
| 5 | "The plan is buildable" | *Is it? The vision says implementation may not begin.* | **Holds only because the plan starts with the specification**, not code. **If a reader skips the spec and starts G-01, the plan violates RQ-140.** The gate is stated twice for this reason. |
| 6 | "Four phases, each with a test" | *Are the tests real, or decorative?* | **Mixed, and said so** — the rename test (§2 phase 1) and the switch-the-model-off test (§2 phase 3) are **decisive and derivable**; the classification tests (§2 phase 2) are **specified but not yet written**. A test not yet written is a plan, not a proof. |

**Three things the stranger-pass changed:**

1. **The specification is named as the first build item** — it was implicit in batch 11; the stranger-pass made it explicit, because a plan that starts at G-01 violates the vision's own gate.
2. **G-12 is stated as parallel, not third-in-sequence** — to stop a reader thinking the safety net delays the spine.
3. **The "tests not yet written" limit is stated** — the phase tests are specified, but only two are decisive today.

**What the stranger-pass could NOT verify, and says so:** whether the phase tests are *sufficient* — that needs the tests written and run, which is the build, not the plan. **The plan can only promise the tests are named.**

---

## 13. Definition of done

- **"Phases, each with a definition of done and a way to test it."** Met — §2, four phases, each with both.
- **"For each phase: what it needs from Hermes, from our platform, and built."** Met — §3, the three-column table.
- **"The critical path."** Met — §4, four items, with why.
- **"The first three things to build, concretely."** Met — §5, each named with a done-when.
- **"Every decision that is Ramzi's, listed separately."** Met — §6, split into decided (6a), still open (6b), and ours (6c).
- **"What is deliberately deferred, and the trigger."** Met — §7, each with its trigger.
- **"Update `companai/INDEX.md`."** Met — §10.
- **"Fold the decisions into `compai/planning/`."** Met — §10 (Q6 closed; CHANGELOG entry).
- **"Promote reusable rules into `COOKBOOK.md` and `LESSONS.md`."** Met — §11.
- **"Update the status table and write the closing `LOG.md` entry."** Met — §10.
- **"Critic pass — read as a stranger."** Met — §12, six claims attacked, three changes, one limit stated.

**Met?** Yes — **with two stated limits.** (1) Every "live and tested" claim is about *code read*, not *behaviour run* — the dockerised instance upgrades it. (2) The phase tests are **named**, not yet **written**; only two are decisive today.

**And the plan's own rule, kept:** it does not close a decision that is Ramzi's. §6b lists seven items that are his, open, with recommendations — not resolutions.

---

## 14. Closing — the programme ends here

**Twelve batches, 0 through 12. The analysis is complete.**

- **Batches 1–5** read the vision — 468 statements across eight documents.
- **Batches 6–8** measured our platform and Hermes from their code — and fact-checked the documents against the extract.
- **Batch 9** mapped all 140 distinct requirements against both sides.
- **Batch 10** decided who owns what — 18 contested items, five owner decisions.
- **Batch 11** separated the shortcuts from the gaps — 20 and 20, plus 12 exclusions.
- **Batch 12** — this — turned it into a plan.

**The one-line answer the whole programme exists to produce:**

> **The platform half is bought, the agent half is borrowed, and the product half — the model spine and the data-level security — is neither, and must be built.**

**The first move is not code.** It is the **Business Model Kernel specification** — the vision's own gate (RQ-140), the one document that must exist before anything is built, and the place the object list (30/33/34 → one list) gets settled.

**Then the spine, the floor, the surface, and the hygiene — in that order, because that is the order the dependencies allow.**

---

**Programme status: COMPLETE.** All 12 batches done. The next work is the specification in §5 item 1.
