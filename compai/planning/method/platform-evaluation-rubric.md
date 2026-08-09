# 08 — Base Platform Evaluation Rubric

**Status:** provisional
**Purpose:** score a candidate base platform against what this product actually
requires, so the decision to adopt, fork or reject is made on evidence rather
than on how impressive the README is.

Apply to: the two forthcoming candidates, **and** the existing `Platform/`
codebase, on identical criteria.

---

## 1. How to use this

1. Run the **fatal-flaw screen** (§2) first. A fatal flaw ends the evaluation —
   do not proceed to scoring hoping the total will rescue it.
2. Score §3, weighted. Kernel-fit criteria are weighted heavily because they are
   the expensive things to retrofit; feature criteria are weighted lightly
   because features are cheap next to architecture.
3. Answer the §4 probes with **code**, not documentation. Every candidate's docs
   will claim extensibility. The probes are designed so the answer is visible in
   the source in under an hour each.
4. Produce a §5 verdict.

The governing question throughout is not *"what does it do?"* but
**"what does it assume, and can we live with those assumptions?"**

## 2. Fatal-flaw screen

Any *yes* ends the evaluation for use as a base.

| # | Fatal flaw | Why it is fatal |
|---|---|---|
| F1 | Licence incompatible with the commercial model (AGPL/SSPL/BSL in the core, or an open-core boundary around multi-tenancy, RBAC, SSO or audit) | Exactly the layer we need is the paid layer |
| F2 | The identity model cannot represent a non-human actor as a first-class principal without impersonation | Invariants I1 and I3 die immediately |
| F3 | Permission checks are scattered through application code rather than centralised | Invariant I5 cannot be retrofitted without touching every call site |
| F4 | No append-only event or audit substrate, and no obvious place to introduce one | The attribution model has nowhere to live |
| F5 | Single-tenant assumptions welded into the schema (no tenant column, global uniqueness constraints) | Rewriting the data layer costs more than a fresh build |
| F6 | Abandoned, or a single maintainer with no release cadence | Adopting is inheriting maintenance |
| F7 | Agent behaviour lives in opaque prompts with no declarative layer | NFR-041, and it means the governance model is bolted on rather than real |

## 3. Scorecard

Score each 0–5. **0** = absent, **1** = present but wrong-shaped, **3** = usable
with adaptation, **5** = close to what we would have designed.

### A. Kernel fit — weight ×5

| # | Criterion | What good looks like |
|---|---|---|
| A1 | Principal model | Humans, non-humans and services as peers; identity separable from user accounts |
| A2 | Capability registry | Acts are declared data with metadata, not implicit in endpoints |
| A3 | Centralised decision point | One authorisation service every path consults; decisions carry reasons |
| A4 | Org graph | Departments, teams, roles, reporting lines, memberships as real relationships |
| A5 | Event/audit substrate | Append-only, correlated, actor-attributed |
| A6 | Entity/mapping layer | A concept of "the same thing in another system" |
| A7 | Tag or classification substrate | Cross-cutting metadata attachable to heterogeneous objects |
| A8 | Addressing | Handles resolving to more than individual users |

### B. Extensibility — weight ×4

| # | Criterion | What good looks like |
|---|---|---|
| B1 | Module contract | Modules register objects, capabilities, events, views declaratively |
| B2 | Provider interfaces | Subsystems already sit behind swappable interfaces |
| B3 | Schema extension | Custom objects and fields without forking |
| B4 | API surface | Complete, versioned, consistent; the UI uses the same API we would |
| B5 | Frontend composition | New surfaces without forking the shell |

### C. AI-native fit — weight ×4

| # | Criterion | What good looks like |
|---|---|---|
| C1 | Declarative agent definition | Agents defined as reviewable data, not code or prompt strings |
| C2 | Tool gateway | Every tool call passes one chokepoint that can be governed |
| C3 | Human-in-the-loop | Approval/review exists as a primitive, not as a workaround |
| C4 | Runtime replaceability | Model and harness behind an interface |
| C5 | Durable execution | Long waits, retries and resumption without a live session |
| C6 | Cost attribution | Spend attributable to actor, task and context |

### D. Governance depth — weight ×3

| # | Criterion |
|---|---|
| D1 | Data classification as a first-class concept |
| D2 | Delegation with scope and expiry |
| D3 | Versioning of configuration and policy |
| D4 | Approval workflow beyond a boolean flag |
| D5 | Budgets and rate limits per actor |

### E. Operability — weight ×2

| # | Criterion |
|---|---|
| E1 | Migration story for schema evolution |
| E2 | Test coverage of the parts we would depend on |
| E3 | Observability — traces, structured logs, metrics |
| E4 | Deployment model matching our target |
| E5 | Upgrade path if we fork — how painful is rebasing? |

### F. Feature head-start — weight ×1

Deliberately the lowest weight. Features are the cheapest thing to add and the
most seductive thing to evaluate on.

| # | Criterion |
|---|---|
| F1 | Work management (tasks, projects, goals) |
| F2 | Knowledge and document handling |
| F3 | Search |
| F4 | Dashboards and reporting |
| F5 | App/form builder |
| F6 | Chat and collaboration surfaces |
| F7 | UI quality and design coherence |

## 4. Probes

Answer from source. Each should take well under an hour; if it takes longer, that
is itself a finding about the codebase.

1. **The non-human principal probe.** Find where a user is loaded and authorised.
   Could an AI worker be created there without a fake email, a shared account, or
   an impersonation flag? Trace one authorisation decision end to end and count
   the places that would need to change.
2. **The chokepoint probe.** Pick a write operation. How many distinct code paths
   can reach it? If more than one, centralised governance is not achievable
   without refactoring, and the size of that refactor is the real adoption cost.
3. **The new-object probe.** Add a custom object with fields, permissions, a list
   view and an audit trail. How much of that is declarative versus hand-written?
4. **The tool-call probe.** Find where an agent invokes a tool. Is there one place
   to insert the resolver, or is tool dispatch spread across the runtime?
5. **The tenant probe.** Grep the schema for the tenant discriminator. Is it on
   every table? Are there global unique constraints that assume one tenant?
6. **The audit probe.** Cause a state change. What record survives? Does it name
   an actor? Can it be edited afterwards?
7. **The upgrade probe.** Read the last six months of commits to the files we
   would most need to modify. If they churn constantly, forking is expensive
   forever.

## 5. Verdict

| Verdict | Meaning | Trigger |
|---|---|---|
| **Adopt as base** | Build the kernel inside it | No fatal flaws; A ≥ 3.5 avg; B ≥ 3.5 avg; probes 1, 2 and 5 clean |
| **Fork and reshape** | Take it and rebuild the kernel beneath | No fatal flaws; A ≥ 2.5; strong B/F; probe 2 shows a tractable refactor |
| **Harvest** | Take modules, UI, connectors, patterns — not the foundation | Strong C/F, weak A |
| **Reference** | Read it, learn, build our own | Fatal flaw, or A ≤ 2 |

Record for each candidate: verdict, the three findings that decided it, the
single largest risk of adopting, and the estimated cost of the refactor that
adoption implies. **That last number is the one that actually decides this** —
"adopt" is only cheaper than "build" if the refactor is smaller than the build,
and that comparison is routinely made on optimism rather than on an estimate.

## 6. A caution about the answer

The realistic outcome for a product this specific is **Harvest** or **Fork**, not
**Adopt**. The kernel described in [01](../01-core-architecture.md) is unusual
precisely because it is the differentiating layer — a platform that already had
it would be a competitor rather than a foundation.

That is not a reason to skip the evaluation. A strong Harvest verdict — taking a
UI shell, a module contract, a connector library and six months of accumulated
detail — is a large, real win. It is just a different win from the one people
hope for when they ask "can we start from this instead of from scratch?", and
naming that in advance keeps the evaluation honest.
