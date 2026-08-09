# P2/02 — Fit Assessment and Verdict: Open Mercato

**Scored against:** [Rubric](../../method/platform-evaluation-rubric.md) and the
host-fitness criteria in [Method §0](../../method/platform-assessment-methodology.md)
**Evidence:** [forensic](01-forensic-analysis.md) · **Triage:** [00](00-reading-triage.md)
**North star:** the five kernel services in [01](../../01-core-architecture.md) and
invariants I1–I15 in [00](../../00-product-thesis.md)

---

## 1. Second-pass verification

Two load-bearing claims re-checked before scoring:

| Claim | Verification | Result |
|---|---|---|
| One dispatcher serves all module APIs | `find apps/mercato/src/app/api -name route.ts` | **4 files** — the catch-all plus `auth/login`, `docs/markdown`, `docs/openapi`. Confirmed. |
| Undo is implemented, not just typed | `grep -l "undo:" packages/core/src/modules/*/commands/*.ts` | **70 command files** with real `undo: async ({ logEntry, ctx }) => …` handlers. Confirmed. |

## 2. Fatal-flaw screen

| # | Flaw | Result |
|---|---|---|
| F1 | Licence incompatible | **Pass** — MIT core. `packages/enterprise` is commercial but **optional**; the core does not require it. Consequence: no record locking, SSO or security module in the MIT half. |
| F2 | Cannot represent a non-human principal | **Near-miss — see §4** |
| F3 | Permission checks scattered | **Pass, strongly** — one dispatcher, three documented exceptions |
| F4 | No append-only event substrate | **Pass** — a command journal exists (though mutable; §5) |
| F5 | Single-tenant assumptions | **Pass** — `tenant_id` pervasive, org tree, tenant-scoped everything |
| F6 | Abandoned | **Pass** — v0.6.7, 203 KB changelog, dedicated upgrade notes. *Cadence unverifiable: no `.git` in the download.* |
| F7 | Agent behaviour in opaque prompts | **Pass, strongly** — prompts are **versioned database entities** composed from governed parts (§10.6) |

**No fatal flaws.**

## 3. Scorecard

| Category | Weight | Score | Notes |
|---|---|---|---|
| **A. Kernel fit** | ×5 | **2.5** | A1 principal 3 · A2 capability 3 · A3 decision point 4 · A4 org graph 3 · A5 ledger 3 · A6 entity mapping 2 · A7 tags 2 · A8 addressing 0 |
| **B. Extensibility** | ×4 | **4.4** | B1 module contract **5** · B2 providers 4 · B3 schema extension **5** · B4 API 4 · B5 frontend 4 |
| **C. AI-native fit** | ×4 | **4.3** | C1 declarative agents 4 · C2 tool gateway 4 · C3 human-in-the-loop **5** · C4 runtime replaceability 4 · C5 durable execution 4 · C6 cost attribution **5** |
| **D. Governance depth** | ×3 | **3.2** | D1 classification 2 · D2 delegation **1** · D3 versioning 4 · D4 approvals **5** · D5 budgets/limits 4 |
| **E. Operability** | ×2 | **3.4** | E1 migrations 4 · E2 tests 3 *(present, not run)* · E3 observability 4 · E4 deployment 4 · E5 fork cost **2** |
| **F. Feature head-start** | ×1 | **3.7** | search **5** · dashboards 4 · app builder 4 · chat 4 · UI 4 · work mgmt 3 · knowledge 2 |

**Weighted total: 3.55 / 5** — against Platform 1's **1.86**.

Category A is the weak one, and per [§5.3 of the method](../../method/platform-assessment-methodology.md)
that number needs reading carefully: A8 (addressing) scores 0 and A6/A7 score 2
because canonical entities, tags and mentions are **things we always planned to
build**. Their absence costs what we already budgeted.

## 4. The F2 near-miss — blast radius

A non-human principal **already works**: `sub: 'api_key:<id>'`, `isApiKey`, its
own roles, features, scope and super-admin flag — no fake user row, no
impersonation. Ahead of Platform 1, where an AI worker could not act at all.

But the kind is a **string prefix on `sub`**, re-parsed at each site.
**Blast radius: 30 files**, across `auth`, `audit_logs`, `customers`, `messages`,
`resources` and `ai-assistant`.

**Diffused, not concentrated — the inverse of Platform 1.**

| | Platform 1 | Open Mercato |
|---|---|---|
| Can a non-human act today? | **No** | **Yes** |
| Where the assumption lives | 1 enum, 1 function, 1 table's FKs | 30 files branching on a string prefix |
| Cost of adding a third kind | Small, concentrated | Introduce a principal abstraction, migrate 30 call sites |

Not fatal — the work is mechanical and the sites are findable — but it is real,
and it is the single largest item on the Change list.

## 5. The honest partition

### Keep — right shape, expensive to rebuild

Module contract (21 surfaces, convention-discovered, **boot-validated**) ·
the generator and registry pipeline · the three-level override surface ·
Awilix DI with per-module registrars · per-module migrations **with snapshot
drift detection** · the command bus with **working undo/redo across 70 command
files** · the `mutationPolicy` ordered narrow-only resolver ·
`ai_pending_actions` approve-first gate · model allowlists + `BudgetEnforcer` +
step-level cost attribution · the custom entity/field engine ·
`query_index` (doc + vector + tokens + **coverage measurement**) · the workflow
engine (fork/join, human tasks, escalation) · the business-rules engine with
execution logs · the org tree with denormalised closure arrays ·
**i18n enforced by build-time checks** · `defineLink()` cross-module relations.

### Change — wrong shape, must be fixed before building on

Six items:

1. **Principal kind is a string prefix** across 30 files → a first-class
   principal with `kind` (I1/I2).
2. **Audit is written in a separate transaction and fails open silently** → a
   unit of work; fail-closed.
3. **The journal is mutable by design** (`execution_state`, soft delete) → add an
   append-only, hash-chained ledger *alongside* it. The journal is right for
   undo; it is not a ledger.
4. **Capabilities carry no risk semantics** — no effect class, reversibility,
   data classification or amount binding → enrich the descriptor.
5. **The authorisation decision carries no explanation** — a boolean plus a
   forbidden log. Our **I6** requires reasons in the return value.
6. **Org edges are untyped and carry no ceilings** → add typed edges and
   per-edge authority ceilings; **keep** the closure arrays as the implementation.

### Build — absent, and always was going to be

Charters and mindflow · trust tiers · task grades · canonical entities ·
tags and lenses · beams (partially prefigured by `defineLink`) · addressing and
mentions · authority delegation · knowledge cells · the Garage · the Company
Compiler · attribution chain (`on_behalf_of`, authority source, invoker).

## 6. Host-fitness — scored separately from the rubric

| # | Criterion | Score | Evidence |
|---|---|---:|---|
| H-1 | Module contract strength | **5** | 21 surfaces, convention-discovered, generator-validated at boot |
| H-2 | Dependency injection | **5** | Awilix container; per-module `di.ts`; generated registrars; `di` overridable per app |
| H-3 | ORM / persistence neutrality | **2** | MikroORM decorators throughout; entities are decorated classes. Grafting across ORMs means rewriting every entity and migration |
| H-4 | Migration ownership | **5** | Per-module migrations **plus** per-module schema snapshots |
| H-5 | Boundary enforcement | **4** | `requires` blocks the build; "no cross-module ORM relations" is a stated rule with `defineLink` as the sanctioned path — but ordinary imports are culturally, not mechanically, constrained |
| H-6 | Codegen / registry | **5** | 4,127-line generator; checksum-incremental; absorbs new modules without editing core |
| H-7 | Test and CI scaffolding | **3** | Extensive `__tests__`/`__integration__` and a jest project layout — **I did not run them** |
| H-8 | Strip cost | **5** | Enable list + universal override surface + path override + eject. **Stripping is configuration, not a fork** |

**Host-fitness average: 4.25 / 5.**

The single weak criterion is **H-3**. Anything grafted *into* this host must be
rewritten onto MikroORM; anything grafted *out of* it carries MikroORM with it.
That is the main structural cost of choosing it as host.

## 7. Verdict

> ### FORK — the strongest host candidate assessed so far.
>
> Not **Adopt** (kernel fit is 2.5; the kernel is not there).
> Not **Harvest** (far too much of the foundation is right to take only pieces).
> Not **Evolve** (that verdict was coined for our own code with no upstream;
> this has a live third-party upstream and rebase is a real, recurring cost).

### What it is

A mature, disciplined, **AI-native modular application platform** with an
unusually strong composition model and a real AI governance layer — carrying
~510,000 LOC of ERP domain we do not want, which its own architecture lets us
switch off by configuration.

### What it is not

It is **not a governance kernel**. There is no principal model, no capability
risk semantics, no explanation trace, no delegation, no trust, no grades, no
canonical entity layer, no addressing. Its authorisation is a competent
feature-check, not a resolver.

### Conditions

The six Change items must land before feature work, for the same reason as
Platform 1: every module built on top inherits the shape. Items 1, 2 and 5 are
the load-bearing ones — principal, audit atomicity, and decision explainability.

## 8. Risks

- **Upstream divergence (H-3/E-5).** A live upstream at 1.3M LOC. Either we track
  it and pay rebase cost forever, or we hard-fork and lose security fixes. This
  is the biggest strategic difference from Platform 1 and is **not** a code
  problem — it is an ownership decision.
- **Commercial boundary.** `record_locks`, `security` and `sso` are commercial.
  The MIT core contains a *fail-closed delegation* to the enterprise record-lock,
  so the open half knows it is incomplete. Any locking guarantee must be
  re-verified against the MIT half alone.
- **Unverified build health.** I did not run install, typecheck, tests or build.
  **No claim is made about this codebase's build health** — a real asymmetry with
  Platform 1, where all three were executed and green.
- **ERP gravity.** 510k LOC of domain we do not want remains in the repository
  even when disabled. It is inert, but it is surface area for upgrades, security
  advisories and cognitive load.
- **Documentation staleness on a security claim** (§11.1) — narrower than
  Platform 1's, but on exactly the kind of statement that must not be stale.

## 9. What this means for selection

This is now the decision the programme turns on, and it is genuinely close:

| | Platform 1 | Open Mercato |
|---|---|---|
| Rubric | 1.86 | **3.55** |
| Host-fitness | low — no codegen, no override surface, central migrations | **4.25** |
| Ownership | **ours; no upstream; fork cost zero** | third-party; live upstream |
| Kernel fit | 2.0 | 2.5 |
| What is actually built | a permission resolver and an org graph | **an entire working platform** |
| Change list | 5 items, concentrated | 6 items, one diffused across 30 files |
| Build verified | **yes — green** | not run |

**Neither is a governance kernel. Both would need our kernel built on top.** The
question is therefore not "which is better" but **"is it cheaper to add a kernel
to a working platform, or a platform to a working kernel?"**

I will not answer that here — it needs the third platform, and it needs a
deliberate decision about upstream ownership that is commercial, not technical.
It belongs in a cross-platform selection document once assessments are complete.
