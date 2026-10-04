# The backlog — everything left, in one place

**This is the one roadmap.** If a task is not on this list, it is not tracked. Order is mine
to set; anything can be pulled forward on request. **The owner should never be the person who
remembers a task** (COOKBOOK rule zero-three).

**Why this file exists.** Before it, "what is left" was spread across `workspace/PROGRESS.md`
(three overlapping views that disagree), `where_we_left.md` (a snapshot from 2026-08-13, which
predates the whole analysis programme), and remarks buried in reports. **This file replaces
those as the plan.** The others are kept for their reasoning and point here.

**Last updated:** 2026-10-04.

| Tag | Meaning |
|---|---|
| ⏳ | next up |
| 🔒 | needs the owner — I cannot do it |
| ⛔ | blocked on something that does not exist yet |
| 💤 | deferred by decision, not forgotten — the trigger is named |

---

## The list — read this section, and nothing else, for "what is left"

**Order is my working order, top to bottom.** The reasoning is below.

### Now — the workbench and the gate

- [ ] **S0** ⏳ — **Stand up the local dockerised trio** (platform + Hermes + model server). **Built and proven 2026-10-04** — eight services healthy, all **21** platform tools discovered, five defects found and fixed (JOURNAL, part 6). What is left is a **re-run to confirm it still comes up**, and that needs the owner to start Docker Desktop first: the agent cannot (Docker Desktop's startup path runs `wsl.exe`, which this machine's security policy blocks — **B-04**). Plan: [`ARCHITECTURE.md`](ARCHITECTURE.md) §5. **Steps:** COOKBOOK, *Sprint 0*
- [ ] **P0-spec** ⏳ — **The Business Model Kernel specification** (the vision's gate, RQ-140) → plan §5.1
- [ ] **G-12** — **Business backup and restore** *(depends on nothing — the safety net)*
- [ ] **G-18** — **The scheduler enforcement gate** *(small; resolves the C-3 fork)*

### Phase 1 — the spine

- [ ] **G-01** — The Business Model Kernel (+ **G-08** relationship fabric) ⛔ *needs P0-spec*
- [ ] **G-02** — Business IR + the compiler ⛔ *needs G-01*
- [ ] **G-10** — Dependency tracking + change propagation ⛔ *needs G-01*

### Phase 2 — the security floor

- [ ] **G-05** — Classification metadata on entities and fields ⛔ *needs G-01*
- [ ] **G-04** — The data-axis authorization layer ⛔ *needs G-01*
- [ ] **G-06** — AI Input/Output Guards + context firewall ⛔ *needs G-05* — **the largest security gap**
- [ ] **G-16** — A security-event taxonomy ⛔ *needs G-05*
- [ ] **G-13** — Aggregation / inference controls ⛔ *needs G-04*
- [ ] **G-14** — Break-glass and separation of duties ⛔ *needs G-04*
- [ ] **G-15** — PostgreSQL Row-Level Security *(parallel — depends on nothing)*
- [ ] **S-02** — Wire the resolver as the **enforcement point** *(5 missing inputs + `policy_version`/`decision_id`)*

### Phase 3 — the product surface

- [ ] **G-07** — The Widget contract / Widget IR / registry ⛔ *needs G-01*
- [ ] **G-09** — The `@`/`#` reference and resolution layer ⛔ *needs G-01*
- [ ] **G-03** — User Functions ⛔ *needs G-02*
- [ ] **G-17** — Schema-constrained generation ⛔ *needs G-02*

### Phase 4 — the hygiene

- [ ] **G-19** — A proprietary ERP benchmark ⛔ *needs G-01/G-02*
- [ ] **G-20** — Freshness, lineage and continuous linting ⛔ *needs G-01*

### The Starting Kit — what is left before that milestone closes

- [ ] **22** — Bulk approval with a diff; **the diff is the feature**
- [ ] **23** — Deputy cover and standing approvals
- [ ] **15b** — Budget as a ceiling, not just a meter
- [ ] **21c** — A lock control on each record's own screen *(the largest — per-entity work)*
- [ ] **24b** — A screen for the two per-tenant authority settings
- [ ] **B** 🔒 — Drop `apps/docs`? *(my recommendation: drop it)*
- [ ] **C** 🔒 — A lawyer on the privacy/terms before commercial use

### Waiting on the owner — I cannot close these

**Decided 2026-10-04** — the owner answered the questions file, which is now **deleted**:

- ✅ **The object list** — start from the **union of 37 objects**, and let the Business Model Kernel specification prune it. *(This unblocks the specification. **Corrected 2026-10-04** — the union was mis-stated as 36 in this file and nine others; the vision's three lists are 30/33/34 and their union is 30 + 3 + 4 = **37**. The decision itself is unchanged.)*
- ✅ **A1 — the agent runtime** — **Hermes**, and **OpenCode is removed** from the stack.
- ✅ **A2 — the first model** — a small instruction model (~7–8B); Sprint 0 tests the plumbing.
- ✅ **A3 — the laptop budget** — assume 16 GB RAM; the model server takes about half.
- ✅ **C-7 secrets** — confirmed: tenant secrets never enter a Hermes home.
- ✅ **C-18 RLS** — confirmed: the app guard is authoritative; the database lock is a backstop **derived from the same policy**.
- ✅ **C-8 model default** — confirmed: none until chosen (default-deny), with a reviewed exception path.
- ✅ **B2 — the old roadmaps** — retired; this backlog is the plan.

Full reasoning: [`ARCHITECTURE.md`](ARCHITECTURE.md) §6.

**Still open — a decision is needed when the trigger fires:**

- [ ] 🔒 **V-04** — adopt Hermes's ops console beside our own UI? *(decide after the Widget contract, G-07)*
- [ ] 🔒 **The 7 `V`-HOLDs** — V-09 licensing · V-10 multi-agent boards · V-11 computer-use · V-12 locales · V-13 MCPs · S-04 skills *(each has a trigger in the deferred table below)*

**Done means:** the gate is green and uncached, it is verified against the running instance
where that is possible, and the documentation says what it does.

---

## Noted but not yet scheduled — the "do not lose this" list

**These are the remarks that used to live only in a report.** Each is a real outstanding item;
each is now here, where it will be seen.

| # | Item | Why it is here |
|---|---|---|
| N-1 | **The phase tests are named, not yet written.** The plan specifies a test for each phase; only the *rename test* (phase 1) and the *switch-the-model-off test* (phase 3) are decisive today. **Each phase's tests must be written when that phase starts.** | plan §2, §12 — a test named is not a test written |
| N-2 | **The vocabulary register — four word-collisions** (Capability, delegation, project, widget) are recorded but not yet written into a single glossary. | batch 10 §3; a reader cannot tell which "project" is meant |
| N-3 | **`where_we_left.md` is stale** — dated 2026-08-13, it predates the analysis programme. | it is labelled "the only status document you should trust" and is no longer current |
| N-4 | **`workspace/PROGRESS.md` has three overlapping views that disagree.** | flagged by `where_we_left.md` §9; this backlog supersedes it as the plan |
| N-5 | **The `S-02` five missing inputs** to the resolver are read but supplied by nothing. | batch 9 §2G — the resolver decides nothing today (it is in `shadow`) |
| N-6 | **`customer_accounts` duplicates `auth`** — an island to *remove*, not a feature to grow. | DB-11 — a "do not build" that is also a "do remove" |
| N-7 | **The `V`-register HOLDs** (V-09 licensing · V-10 boards · V-11 computer-use · V-12 locales · V-13 MCPs) each need a review before use. | batch 11 §6 |
| N-8 | **Remove OpenCode properly — it cannot simply be deleted.** The platform's chat route is wired to it (`api/chat/route.ts` → `OPENCODE_URL`), so deleting the service breaks the platform's AI chat. **Prerequisite:** rewire the chat to the app's own LLM registry (`model-factory.ts` + `llm-provider-registry`), *then* delete the service and the `OPENCODE_*` env vars. | **B-05**; A1's escape clause — it stays until this is done |
| N-9 | **Why does `mercato init`'s feature-toggle seeding transaction abort?** The users are created, then it dies with `current transaction is aborted`. The underlying SQL error is not in the app log, so it has to be reproduced with the transaction error surfaced — which needs the Docker engine. **The failure is no longer hidden** (that half is fixed — see N-10), so this is now about the seeding being incomplete, not about it being silent. | **B-15 half 2**. Measured 2026-10-04; the *recorded* cause of B-15 was wrong and has been corrected |
| N-10 | **The database-readiness logic now has tests — keep them wired in.** `docker/scripts/__tests__/init-or-migrate.test.sh` and `compose-init-guard.test.sh` run with **no Docker, no database and no yarn**, and are exposed as `yarn test:docker-scripts`. They were mutation-proven (run against the broken code first: 3 and 3 failures respectively). **Nothing runs them automatically yet** — they are not in `ci.yml`, and `yarn` is not on this host (see N-11). | Added 2026-10-04 with the **B-15** fix. A test nobody runs is worthless |
| N-11 | **The host cannot run the codebase natively.** Measured 2026-10-04: the kit requires **Node 24.x** (`.nvmrc`, `engines.node`, and `packages/cli/src/bin.ts` hard-fails below 24), but **no Node 24 exists on this machine** — only 22.22.2 — and **`yarn` is not installed** (`corepack` is, at 0.34.6, and `packageManager` is `yarn@4.17.1`). **This is not a blocker:** the supported path is the container, which carries its own Node 24 and yarn, and that is how Sprint 0 runs. It matters only if native host development or host-run unit tests are wanted, and then it is a Node 24 install plus `corepack enable`. | Found while wiring N-10. Recorded so "the tests won't run here" is not mistaken for a broken test |

---

## Deferred by decision — with the trigger that brings it back

**A deferral is honest only when it names what brings it back** (COOKBOOK rule zero-one).

| Item | Why it waits | The trigger |
|---|---|---|
| **20** — Deploy on a real Plesk VPS | Owner said "not now"; nothing to deploy yet | Sprint 0's stack is proven locally and a server is wanted |
| **27** — Dashboard widgets of our own | The start page is empty by design | After the product's own surfaces exist |
| **25** — Ledger Tier 2, signed checkpoints | A customer's-auditor feature | A customer asks |
| **26** — `domain_mappings` extraction | Nothing needs it | A tenant needs a custom domain |
| **29** — The integration control plane | 220–380 person-weeks; its own estimate | Post-hosting, and only if a customer needs it |
| **11** — Native Arabic review | Dropped from the milestone by the owner | Before shipping `ar` as a *supported* locale |
| **V-09** — the 210-skill library | Licensing/content review not done | A licensing review passes |
| **V-10** — multi-agent boards | Delegation/authority must settle first | C-15's rename lands and the delegation boundary is enforced |
| **V-11** — computer-use + browser automation | Must sit behind our approval gate | The approval gate is the enforcement point (phase 2) |
| **V-12** — 17 localised languages | Translation quality unverified | A quality review passes |
| **V-13** — the 65-entry MCP catalogue | Each entry needs vetting | Each is vetted before enabling (never a trust root) |
| **Phase 3's Widget layer** | Needs the kernel and the IR | G-02 is done |
| **Cross-tenant authority** | A conscious deferral in the design | A customer needs AI acting into a supplier's tenant |

---

## The record of what is done

- The **Starting Kit** build — [`../workspace/references/completed-work.md`](../../workspace/references/completed-work.md)
- The **analysis programme** (batches 0–12) — [`../library/analysis/LOG.md`](../analysis/LOG.md)
  and [`../library/analysis/findings/`](../analysis/findings/)

*If this file disagrees with the code, the code wins and this file is broken — fix it.*
