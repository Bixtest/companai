# 10 — Fit Assessment and Verdict: `Platform/`

**Scored against:** [Rubric — Base Platform Evaluation Rubric](../../method/platform-evaluation-rubric.md)
**Evidence:** [P1 forensic — Forensic Analysis](../../platforms/01-graph-portal-platform/01-forensic-analysis.md)
**North star:** the five-service kernel in [01](../../01-core-architecture.md) and
invariants I1–I10 in [00](../../00-product-thesis.md).

---

## 1. Fatal-flaw screen

| # | Flaw | Result |
|---|---|---|
| F1 | Licence incompatible | **Pass** — our own code, no upstream licence |
| F2 | Identity cannot represent a non-human principal | **Near-miss — see below** |
| F3 | Permission checks scattered through application code | **Pass with defect** — logic centralised in one resolver; *invocation* is 11 manual call sites |
| F4 | No append-only event substrate | **Pass** — exists, with correlation and causation |
| F5 | Single-tenant assumptions in the schema | **Pass, strongly** — `tenant_id` on every business table |
| F6 | Abandoned / no cadence | **Pass** — active through August 2026 |
| F7 | Agent behaviour in opaque prompts | **Pass** — there are no prompts to be opaque |

**On F2.** As written, the platform fails: an AI worker would need a fake email
and a `users` row. But the human-only assumption is concentrated in *one enum*
(`principal_type`), *one function* (`getPrincipalSet`), and *one table's foreign
keys* (`temporary_delegations`). The load-bearing paths are already
principal-agnostic: `PermissionCheck.actor_id` is a bare string,
`permission_rules.principal_id` has no FK, `audit_events.actor_id` has no FK.

This is a **bounded repair, not a rewrite** — and that single fact is what
separates this from a Reference verdict.

**No fatal flaw. Evaluation proceeds.**

## 2. Scorecard

| Category | Weight | Score | Notes |
|---|---|---|---|
| **A. Kernel fit** | ×5 | **2.0** | A1 principal 2 · A2 capability 2 · A3 decision point 4 · A4 org graph 4 · A5 ledger 3 · A6 entities 0 · A7 tags 1 · A8 addressing 0 |
| **B. Extensibility** | ×4 | **2.4** | B1 manifest 4 · B2 providers 1 · B3 schema ext. 1 · B4 API 3 · B5 frontend 3 |
| **C. AI-native fit** | ×4 | **0.8** | Everything 0–1. There is no AI. |
| **D. Governance depth** | ×3 | **1.6** | D1 classification 2 · **D2 delegation 5** · D3 versioning 1 · D4 approvals 0 · D5 budgets 0 |
| **E. Operability** | ×2 | **3.6** | E1 migrations 3 · E2 tests 4 · E3 observability 2 · E4 deployment 4 · **E5 fork cost 5** |
| **F. Feature head-start** | ×1 | **0.4** | Only UI quality scores. No business features exist. |

**Weighted total: 1.86 / 5.**

## 3. Why the raw score is misleading

Two reasons, and both must be stated or the number will mislead the decision.

**First: the rubric penalises absence and presence-in-the-wrong-shape almost
equally.** It scores 0 for "absent" and 1 for "present but wrong-shaped". For
adopting a *third-party* platform that is correct — you inherit whatever is
there. For *our own* codebase it is backwards. Absent things cost what we already
budgeted to build them. Wrong-shaped things cost that **plus** demolition, plus
the risk of leaving fragments behind.

Category A scores 2.0 almost entirely because canonical entities (0), addressing
(0) and tags (1) are missing — three things we planned to build from scratch
anyway, and whose absence costs us nothing.

**Second: the rubric was written assuming an upstream to rebase against.** E5
scores 5 here because there is no upstream. Forking has no ongoing cost. "Fork
and reshape" and "adopt as base" collapse into the same option.

I am recording this as a flaw in my own rubric rather than adjusting the score to
suit the conclusion.

## 4. The honest partition

What actually matters is which of three buckets each capability falls into.

### Keep — right shape, expensive to rebuild, boring to rebuild

- Portal graph with typed relationships, inheritance modes and **permission
  ceilings**. This is more organisational nuance than most commercial platforms
  have, and it maps directly onto our department/portal/company model.
- The **layered resolver with an explanation trace**. Decisions that carry their
  own reasons are rare, and invariant I6 demands exactly this. It is already here.
- **Temporary delegations** with scope, expiry, revocation and mandatory reason —
  a 5/5, and precisely SRS FR-110.
- **Record policies** with lock states.
- The **module manifest contract** — close to what [01 §3](../../01-core-architecture.md)
  specifies, independently arrived at.
- Event envelope with **correlation *and* causation**.
- Multi-tenancy discipline: `tenant_id` everywhere.
- Localisation/RTL from day one — a genuine cost saving, easy to underestimate.
- 234 passing tests, green build, migration ledger, production compose with
  migrate-before-API ordering.

### Change — wrong shape, must be demolished before building on

Five items. That is the entire list, and its shortness is the finding.

1. **Human-only principals** → generalise to `principals` with kind
   `human | ai_worker | service | system`.
2. **Binary allow/deny** → the six-level ordered autonomy ladder.
3. **AI governance as a parallel world** → fold `AiToolContract` into one
   capability registry with effect classes and reversibility.
4. **Manual enforcement** → a guard/interceptor chokepoint that cannot be
   forgotten.
5. **Manual audit emission** → automatic, plus hash chain and attribution chain.

### Build — absent, and always was going to be

Canonical entities · tags and lenses · addressing and mentions · charters and
mindflow · task grades · trust tiers · approvals · budgets · skills · evaluation ·
work management · knowledge · search · reporting · apps · authentication ·
everything AI.

## 5. Cost comparison

The rubric says the decision turns on whether the refactor is smaller than the
build. It is, and not marginally.

**Repair cost (the Change list):** one migration plus roughly six files.
`permission.service.ts` is 288 lines; the enum has four values; `getPrincipalSet`
is one function; the guard and audit interceptor are new code of modest size. The
234 existing tests act as the safety net for all of it. Weeks.

**Replacement cost (what Keep would cost greenfield):** portal graph with
inheritance and ceilings, layered resolver with explanation traces, project
overlays, record policies, delegations, module manifest contract, hook registry,
migration tooling, multi-tenancy discipline, i18n/RTL, admin surface, deploy
pipeline, and the test suite proving it. Months — and they are the unglamorous
months that get rushed, which is exactly how the invariants get quietly broken.

## 6. Verdict

> ### EVOLVE — adopt as the foundation, rebuild the kernel on top of it.
>
> Not "adopt as base" (the kernel is not there). Not "harvest" (the features
> worth harvesting do not exist). Not "reference" (too much of the expensive,
> correct groundwork is already built and passing tests).
>
> This is [01 §7](../../01-core-architecture.md)'s **Evolve** option, and it is
> confirmed by evidence rather than assumed.

### What this codebase is

An honest, disciplined, well-tested **multi-tenant platform kernel with an
unusually good permission core and no product on top of it**. Roughly Phase 0 of
[01 §6.1](../../01-core-architecture.md) — partially built, and built in the right
direction.

### What it is not

It is **not** an AI-first framework. That description is aspiration, not code:
zero matches for `agent`, `charter` or `ai_worker` in the entire source, and an
AI service whose own return value says to wire it up later. The one AI artefact
of real value is the `AiToolContract` *type* — and its main defect is that it was
designed as a separate world instead of as part of the permission system.

The honest restatement: **it is an AI-*ready* platform kernel** — the governance
substrate an AI-first product needs, without any of the AI.

### Conditions

This verdict holds only if all five Change items are done **before** any feature
is built on top. Each is cheap now and expensive later, because every subsequent
module inherits the shape:

- a module built against binary allow/deny will hardcode that assumption;
- a service built without the chokepoint will add a twelfth manual call site;
- an AI feature built against `AiToolContract` deepens the two-world split.

The five repairs are load-bearing prerequisites, not backlog items.

## 7. Recommended sequence

```text
Step 1  Principal generalisation
        principals table · principal_type enum extension · getPrincipalSet
        rewrite · users→principals migration · delegation FK re-point
        Gate: an AI worker holds permissions and delegations with no fake email

Step 2  Enforcement chokepoint
        guard + interceptor · remove the 11 manual call sites
        · a route with no declared capability fails at boot
        Gate: no path reaches a write without a resolver decision

Step 3  Autonomy ladder
        FIRST: push resolver filtering into SQL — it currently loads every
        tenant rule and filters in memory, and our version adds grade,
        trust, budget and graph-ceiling lookups to the same path (11 §3.3)
        · PermissionEffect → six-level gate · first-match → most-restrictive
        · capability registry with effect class + reversibility
        · fold AiToolContract in
        Gate: one capability, one decision, for humans and AI alike

Step 4  Ledger integrity
        unit of work — mutation + audit in ONE transaction (never built,
        despite documentation claiming otherwise — see 11 §3.1)
        · thread the request id into correlation_id and set causation_id
          (both fields are currently runtime-dead — 11 §3.2)
        · automatic emission via interceptor · hash chain · attribution chain
        · signed acts for the defined consequential set
        Gate: audit cannot be forgotten, and a business action is traceable

Step 5  Kernel completion
        canonical entities · tags/lenses · addressing
        Gate: Phase 0 of 01 §6.1 complete

Step 6  Authentication
        real login and sessions, replacing the header bridge

Then    Phase 1 — the vertical slice
```

Steps 1–4 are repairs to existing code and should be sequenced strictly: each one
makes the next cheaper. Step 5 is new build on a now-correct foundation.

## 8. Risks

**The institutional risk is the serious one, and it is worse than first assessed.**
`GAP-ANALYSIS-2026.md` documents a period where contracts were recorded as
delivered capabilities. I initially recorded that as historical and corrected.

Reading the full documentation set shows it is **current**. `PLATFORM-FEATURE-INVENTORY.md`
marks Garage, Assets Store, AI Studio, theme administration, `/signup`,
`/settings/*` and visual regression tests as **"Shipped"** with specific route
paths. None of them exist — `grep` for `garage`, `uxaios`, `assets-store` and
`ai-studio` across all source returns **zero matches**. Full table in
[P1 forensic §5.1](../../platforms/01-graph-portal-platform/01-forensic-analysis.md).

That document sits in the same folder as an accurate, admirably honest README.
**The drift is not a past phase; it is a present condition, and it is
unsignposted** — nothing marks which documents can be trusted.

Two consequences for adoption:

- Any estimate built from that documentation will be wrong by a wide margin, in
  the optimistic direction. Estimates must be built from source.
- The team needs a mechanical answer, not a cultural one. Which is what
  invariant **I11** and boot-time verification are for: a manifest claiming a
  capability that does not exist should fail the build, not sit in a table.

Mitigation is already in our design: the **compile step**. A Charter that
compiles to a Grant Set, a capability that must be declared to be callable, a
route that fails at boot without a declared capability — these make "declared but
not built" a build error rather than a documentation claim. Adopt that discipline
in Step 2 and the failure mode largely closes itself.

**Secondary risks:**

- *Sunk-value inflation.* 30,700 LOC is small. The value here is the design
  decisions, not the volume — which is good news (cheap to change), but it means
  nobody should defend a bad decision on the grounds that it is already written.
- *The "AI-first" label.* If the team believes AI is partly built, Step 3 will be
  under-scoped. It is not partly built. It is not started.
- *No authentication at all.* Known, scoped, standard work — but it is a hard
  prerequisite for any real deployment, and it is currently sitting behind a
  shared-secret header bridge that must not reach production.
- *Non-transactional bootstrap writes*, no RLS, no migration checksums. All
  disclosed in the README, all ordinary hardening, none architectural.

## 9. What this means for the second platform

The bar this sets is specific and mostly narrow. The second candidate has to beat
**a permission resolver with explanation traces, a portal graph with inheritance
ceilings, working delegations, a good module manifest, clean multi-tenancy, and
234 green tests** — while having no upstream fork cost, because this code is ours.

If the second platform brings the things this one entirely lacks — real agent
execution, work management, knowledge, search — the outcome is probably not
"choose one". It is **evolve this kernel and harvest that one's product layers**,
with the kernel's provider interfaces ([01 §1](../../01-core-architecture.md)) as the
seam between them.

That combination should be evaluated explicitly rather than being framed as a
choice between two candidates.
