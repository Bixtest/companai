# 02 — Authority & Autonomy

**Status:** provisional
**Implements:** Idea 1 — task grades, default AI permission status, sensitivity
on each system permission.
**Resolves:** the approval-fatigue tension and the graduated-trust gap in the SRS.

---

## 1. The core move

The instinct in Idea 1 is right, but stated as separate features it becomes four
independent settings — a grade on the task, a status on the permission, a policy
on the role, a limit on the budget — which will contradict each other and which
no user will be able to reason about.

**The design instead: one ordered ladder, one resolver, many inputs.**

```text
                       INPUTS
   ┌──────────────────────────────────────────────┐
   │ capability risk class      (what act is this)│
   │ task grade                 (how sensitive)   │
   │ data classification        (what it touches) │
   │ record lock state          (is it frozen)    │
   │ graph ceiling              (where it sits)   │
   │ charter grant              (what it may do)  │
   │ delegation                 (borrowed rights) │
   │ invoker authority          (who asked)       │
   │ trust tier                 (earned record)   │
   │ budget / limit state       (headroom left)   │
   │ incident state             (recent harm)     │
   │ org policy                 (hard rules)      │
   └──────────────────┬───────────────────────────┘
                      ▼
            ┌───────────────────┐
            │ AUTONOMY RESOLVER │
            └─────────┬─────────┘
                      ▼
          Decision { gate, reasons[], obligations[] }
```

Everything else in this document is the definition of those inputs and the
arithmetic that combines them.

## 2. The autonomy ladder

Six levels, **totally ordered** from least to most autonomous. The total order is
what makes conflict resolution comprehensible: when several inputs disagree, the
most restrictive wins, and that is explainable in one sentence.

| Gate | Name | Behaviour |
|---|---|---|
| **A0** | Blocked | The act may not be performed by this actor at all |
| **A1** | Propose | The worker produces a proposal; a human performs the act |
| **A2** | Approve-first | The worker prepares the act; it executes only after approval |
| **A3** | Hold-and-commit | The act executes into a hold window and auto-commits unless vetoed within *T* |
| **A4** | Execute-and-review | The act takes effect immediately and enters a review queue; a reviewer may compensate |
| **A5** | Execute-and-log | The act takes effect; recorded in the ledger; no queue |

Notes on the two middle gates, which do the real work:

- **A3 (hold-and-commit)** is the fatigue-killer. The worker is not blocked, the
  human is not required to act, but a mistake is catchable. It requires the act
  to be *delayable* — sending an email, publishing a document, dispatching a
  technician. Hold windows are per-capability (default 15 minutes, configurable).
- **A4 (execute-and-review)** requires the act to be *compensatable*. Per
  invariant **I8**, an irreversible capability at A4 is automatically promoted to
  A2 by the resolver. This is not a configuration option; it is arithmetic.

### 2.1 Two gates, not one

Idea 1 correctly distinguishes "needs permission to do it" from "outputs need
review". These are different objects and are resolved separately:

| Gate type | Governs | Answers |
|---|---|---|
| **Action Gate** | each capability invocation | *May this act happen, and how?* |
| **Deliverable Gate** | task completion / artefact acceptance | *Does this output count as done?* |

A worker may hold A5 on every capability used to produce a report and still be
unable to mark the report `delivered` without review. Both gates derive from the
same inputs; conflating them produces either paralysis or rubber-stamping.

Deliverable Gate values: `none` · `peer_review` · `supervisor_review` ·
`named_reviewer` · `dual_review` · `external_signoff`.

## 3. Task grades

A grade is a property of *work*: how much it matters if it goes wrong.

| Grade | Name | Typical content |
|---|---|---|
| **G0** | Routine | Internal, reversible, no external effect, negligible value |
| **G1** | Standard | Normal business work; internal records; ordinary customer service |
| **G2** | Sensitive | Personal data, customer-facing output, moderate money, reputational exposure |
| **G3** | Critical | Contracts, financial commitments, regulated output, security changes, public statements |
| **G4** | Restricted | Legal proceedings, board/M&A, security incidents, named-actor-only work |

### 3.1 Grades are derived, then adjusted

Requiring a human to grade every task guarantees the field is ignored or wrong.
The grade is **proposed by rule** and adjustable:

```text
grade = max(
  grade_from_capabilities_required,     # what the work will need to do
  grade_from_data_classes_touched,      # what it will read or write
  grade_from_monetary_amount,           # threshold bands
  grade_from_counterparty,              # customer tier, regulator, public
  grade_from_template,                  # process/task template default
  grade_from_parent                     # inheritance, see 3.2
)
```

- **Raising** a grade: any participant, no approval, always allowed.
- **Lowering** a grade: requires approval from someone holding authority at the
  original grade, and is recorded as an act.

### 3.2 Anti-laundering rules

Without these, grades are trivially escaped and the whole model is decorative.

- **R-G1 — Inheritance floor.** A subtask's grade is `≥` its parent's grade. A
  worker cannot decompose a G3 task into G0 subtasks to escape gates.
- **R-G2 — Capability pull-up.** If work invokes a capability whose class implies
  a higher grade, the task's grade is raised automatically and the change is
  logged. Grade cannot lag behind what the work actually does.
- **R-G3 — Aggregation escalation.** Repetition escalates. *N* acts of class *E*
  by one actor within window *W* is itself a G-higher event requiring approval.
  One €80 refund is routine; ninety €80 refunds in an hour is not.
- **R-G4 — Context inheritance.** Work inside a Restricted context (a legal case,
  an incident, an M&A workspace) inherits that context's grade floor regardless
  of the work's own content.
- **R-G5 — No self-grading downward.** An AI worker may propose a lower grade
  with reasoning; it can never apply one.

## 4. The capability registry

This is Idea 1's "add that status also in the system permissions module",
developed into a full descriptor. Every act the platform can perform is
registered with intrinsic risk semantics — **once**, centrally, not per role.

```yaml
capability: invoice.issue
module: finance
description: Issue an invoice to a customer

effect_class: financial              # see 4.1
reversibility: compensatable         # reversible | compensatable | irreversible
compensation: invoice.credit_note
idempotency: required_key

data_classes: [confidential]
external_effect: true                # leaves the company boundary
amount_binding: invoice.total        # binds to monetary limits
rate_bindable: true                  # participates in aggregation escalation

default_grade_floor: G2              # minimum task grade this act implies
delegable: true                      # may appear in a delegation
standing_approvable: true            # may be covered by a standing approval
hold_window: 10m                     # for A3
requires_dual_control_above: 25000

autonomy_ceiling_by_trust:           # the trust → max-gate matrix, per capability
  T0: A0
  T1: A1
  T2: A2
  T3: A3
  T4: A4                             # never A5: financial acts are always seen
```

Four further fields, adopted from the `AiToolContract` type in `Platform/`
([P1 forensic §4.3](platforms/01-graph-portal-platform/01-forensic-analysis.md)) — that type was the best-conceived
artefact in that codebase, and its only real defect was living in a separate
world from the human permission system. Folded in, it contributes:

```yaml
  allowed_mutations: [invoice.status, invoice.sent_at]
      # exactly which fields this act may change — narrower than the capability
      # itself, and checkable after the fact
  scope_rules: [assigned_customers_only, same_portal_subtree]
      # declarative predicates the resolver evaluates against the resource
  evidence_required: true
      # the act cannot complete without cited sources attached; the ledger
      # rejects it otherwise. Pairs with the mindflow evidence standard (03 §5)
  audit_event_type: finance.invoice.issued
      # the ledger event this act must emit, declared rather than chosen at
      # the call site — so audit cannot be forgotten or mislabelled
```

`evidence_required` is the one worth dwelling on: it turns "the worker should
cite its sources" from a prompt instruction into an enforced precondition of the
act completing. That is exactly the difference between a governed platform and a
well-behaved chatbot.

### 4.1 Effect classes

| Class | Meaning |
|---|---|
| **E0** | Read |
| **E1** | Write, internal, reversible |
| **E2** | Write, internal, irreversible or bulk |
| **E3** | External communication (leaves the company boundary) |
| **E4** | Financial effect |
| **E5** | Security, identity, permission or charter change |
| **E6** | Destructive (deletion, revocation, teardown) |

### 4.2 Default floor matrix

Maximum autonomy permitted by effect class and task grade, before any other
input. Tenant-overridable downward freely; upward only through governance.

| | G0 | G1 | G2 | G3 | G4 |
|---|---|---|---|---|---|
| **E0** read | A5 | A5 | A5 | A4 | A2 |
| **E1** write reversible | A5 | A4 | A4 | A3 | A2 |
| **E2** write irreversible/bulk | A4 | A3 | A3 | A2 | A1 |
| **E3** external comms | A3 | A3 | A2 | A2 | A1 |
| **E4** financial | A3 | A2 | A2 | A1 | A1 |
| **E5** security/permissions | A2 | A2 | A1 | A1 | A0 |
| **E6** destructive | A2 | A1 | A1 | A1 | A0 |

Read the table as: *"the most autonomy anyone can have here"*. An actor's actual
gate is this, further restricted by their own ceiling.

### 4.3 Record lock state

*Adopted from `Platform/`'s `record_policies.lock_state`.*

Sensitivity is a property of a record's *type*; lock state is a property of a
record's *moment*. A signed contract, a closed accounting period, a case under
legal hold and a published policy are all ordinary objects that have become
temporarily or permanently untouchable.

| State | Effect |
|---|---|
| `open` | No additional restriction |
| `restricted` | Writes capped at A2; reads unaffected |
| `locked` | All writes A0; only an explicit unlock act can change it |

Lock state is a floor input, so it cannot be overridden by trust, delegation or a
standing approval. Locking and unlocking are themselves E5 capabilities and
signed acts. This is a cheap primitive that removes a whole class of special-case
logic from every module that would otherwise implement its own "is this frozen?"
check.

### 4.4 Terminal versus recoverable denials

*Adopted from `Platform/`'s project-overlay `terminal` flag.*

Not all denials are equal, and the distinction is worth carrying in the Decision
object because it drives completely different UX:

- **Terminal** — evaluation stops; no later source can lift it. Explicit denies,
  charter exclusions, lock states, graph ceilings. The correct response is *"this
  is not possible"*.
- **Recoverable** — this source denies, but another might allow, or a human could
  grant it. Missing project membership, absent delegation, exhausted budget. The
  correct response is *"here is how to make it possible"*, with the request
  pre-filled.

Rendering a recoverable denial as a dead end is one of the most common ways
governed systems become hated. The resolver returns
`denial_kind: terminal | recoverable` plus, for recoverable denials, the specific
grant that would resolve it.

## 5. Trust tiers

This closes the graduated-trust gap. Trust is **computed evidence**, not a
setting someone types.

| Tier | Name | Meaning | Default ceiling |
|---|---|---|---|
| **T0** | Shadow | Runs against real work, effects discarded, outputs compared | A0 (effects), A1 (proposals) |
| **T1** | Supervised | Every act pre-approved | A2 |
| **T2** | Reviewed | Routine executes with hold; sensitive pre-approved | A3 |
| **T3** | Trusted | Executes with sampled review | A4 |
| **T4** | Autonomous | Executes within charter with audit only | A5 |

### 5.1 Trust is per capability class, not global

A worker can be T4 on research reads and T1 on external communication. Trust is
stored as a vector over effect classes and capability groups, because that is how
competence actually works. A single global trust number would be either uselessly
conservative or dangerously optimistic.

### 5.2 Promotion and demotion

Per invariant **I9**, the asymmetry is the safety property.

**Promotion** — requires *all* of, then a human decision:

- ≥ *N* completed acts in the capability group (default 50)
- reviewer override rate below threshold (default < 5%)
- zero open incidents of severity ≥ medium
- current evaluation suite passing at or above the role's bar
- no charter change since the evidence window opened
- an accountable human approves, and that approval is a signed act

**Demotion** — automatic and immediate on any of:

- an incident of severity ≥ high attributable to the worker
- evaluation regression below the role's bar
- a hard budget breach
- reviewer override rate crossing threshold over a rolling window
- a charter change touching the affected capability group (trust does not
  transfer across a change to what the worker is)

Demotion is a system act, logged, with the triggering evidence attached, and
notifies the responsible manager. Re-promotion goes through the full path again.

### 5.3 Shadow mode is how evidence is produced

New workers, new skill versions and major charter changes run at **T0**: real
inputs, real reasoning, effects captured as a diff and discarded. Outputs are
compared against the incumbent (a human, or the previous version). This is the
only honest way to accumulate promotion evidence without exposure, and it doubles
as regression testing (SRS FR-242).

## 6. The resolver

### 6.1 Algorithm

```text
resolve(actor, capability, resource, context) → Decision

  # Floors: how much autonomy the situation permits at most
  floor = min(
    matrix[capability.effect_class][context.task.grade],
    matrix_by_classification[resource.classification],
    lock_state_ceiling(resource.lock_state),             # open|restricted|locked
    capability.default_gate,
    policy_floors(actor, capability, resource, context)
  )

  # Ceilings: how much autonomy this actor has earned or been granted
  ceiling = min(
    graph_ceiling(actor.portal_path, capability),        # inherited down the org graph
    charter.grant_for(capability).gate,
    trust.ceiling(actor, capability.group),
    delegation.ceiling(actor, capability, context),      # if acting under one
    invoker.authority_ceiling(context),                  # I4: carried, not amplified
    budget.state_ceiling(actor, context),
    incident.state_ceiling(actor)
  )

  gate = min(floor, ceiling)

  # I8: irreversible acts are never resolved post-hoc
  if capability.reversibility == irreversible and gate > A2:
      gate = A2

  # Dual control
  if capability.requires_dual_control_above and amount > threshold:
      obligations += dual_control

  return Decision {
    gate,
    reasons:      [every rule that contributed, with its value],
    binding_rule: the rule that produced the final value,
    obligations:  [dual_control, justification_required, hold_window, ...],
    alternatives: [what would change this outcome]
  }
```

### 6.2 The Decision object is the UX

Per invariant **I6**, explainability is a return value. The resolver always
produces enough to render:

> **Approval required.** This is a financial act (E4) on Critical work (G3), and
> you are acting under a delegation capped at €5,000. *Binding rule: delegation
> limit.* This would execute automatically if the amount were below €5,000, or if
> the Finance Director approved it directly.

That sentence is generated, not written. It costs nothing if the resolver is
designed this way from the start and is essentially unattainable if it is not.

### 6.3 Preflight — the single best fatigue mitigation

The resolver is callable in **dry-run** mode against a *plan* rather than an act.
Before an AI worker begins multi-step work, its plan is resolved:

```text
Plan: onboard customer Acme
  ✓ research.web                A5   proceeds
  ✓ crm.customer.create         A4   proceeds, review queued
  ⏸ contract.generate           A2   needs approval — Legal
  ⏸ invoice.issue               A2   needs approval — Finance (€48,000)
  ✓ report.publish_internal     A3   proceeds after 15m hold

2 approvals needed.   [Request both now]   [Start unblocked work]
```

This converts the dominant failure mode — a worker stalling mid-task at hour
three and a human discovering it at hour nine — into one batched decision made
up front, with full context, before any time is wasted. It also gives the
manager a truthful preview of what the worker is about to do, which is worth
more than most audit features.

## 7. Approval mechanics

A control that is expensive to operate gets switched off. Each of these exists to
make the controls above survivable.

### 7.1 Standing approvals — approve the pattern, not the instance

```yaml
standing_approval:
  grantor: finance-director            # a human principal
  capability: invoice.credit_note
  scope:
    customers: lens:#segment/smb
    amount_max: 500
    grade_max: G2
  effective: 2026-08-08 .. 2026-11-08  # expiry mandatory
  max_uses: 200                        # counter, visible
  gate_granted: A3                     # raises ceiling, never above grantor's own
  revocable: true
  auto_revoke_on: [incident, trust_demotion, charter_change]
```

Standing approvals are **signed acts** and appear on the grantor's own record.
They can never grant a gate the grantor does not personally hold — invariant
**I4** again.

### 7.2 Queue design

- **Bulk with diff** — approve *n* similar items after inspecting what differs
  between them, never a blind "approve all".
- **Ordered by grade, then deadline risk**, not arrival time.
- **Mandatory expiry** — every request has a deadline; expiry escalates rather
  than silently blocking work forever.
- **Absence-aware** — an approver who is away routes to their declared
  delegate; the delegation is time-boxed and logged.
- **Context-complete** — the request carries proposed act, reasoning, evidence,
  expected result, risk, alternatives and cost (SRS FR-102, FR-092). An approval
  request that requires the approver to go and investigate is a defect.

### 7.3 Evidence-based de-bureaucratisation

Every gate accumulates statistics: invocations, approvals, rejections, median
latency, override rate. The platform then acts on its own data:

- a gate with **< 2% rejection over ≥ 200 samples** is flagged as a candidate for
  removal or for automatic promotion to A3;
- a gate with **median latency > 4h** is flagged as a bottleneck with named cause;
- a reviewer overriding **> 30%** of one worker's outputs triggers a charter or
  skill review rather than continued manual correction.

This is SRS FR-420's spirit turned into a mechanism, and it is the answer to
"the system will accumulate controls forever". It sheds them on evidence.

## 7.4 Grading the platform's own changes

*Adopted from the "safe-change protocol" in
`uxaios/UNIFIED-KNOWLEDGE-PLATFORM-COOKBOOK.md`.*

That document grades **code changes** by risk in a way structurally identical to
how we grade *work*:

| Class | Rule |
|---|---|
| `S0` | Docs and types only — no runtime behaviour |
| `S1` | New code behind a feature flag; no existing path touched |
| `S2` | Touches shared surfaces — **requires the regression suite** |
| `S3` | Auth, protection, migrations — **requires review and a rollback plan** |

Plus: feature flags default **off**; migrations additive only, with reversible
`DOWN` scripts for `S3`; **never remove a field in the same release** that stops
using it; a feature flag turned off must revert behaviour without a deploy.

This matters to us more than it did to them, because **our platform modifies
itself**. Blueprint changes, charter changes, skill promotions, lens edits,
generated apps and compiler output are all changes to a running company made by
the system. They need the same graded treatment as changes to the platform's own
code — which means the S-classes and the G-grades are the same mechanism applied
to two kinds of change, and should share one implementation:

| Change | Class | Consequence |
|---|---|---|
| A worker's mindflow wording | S0/G0 | Versioned, no gate |
| A new skill behind a scope limit | S1/G1 | Shadow mode first |
| A lens expression edit | S2/G2 | Impact analysis; affected workers listed |
| A capability matrix or charter authority change | S3/G3 | Review, simulation, rollback plan |
| A policy or portal-edge ceiling change | S3/G4 | Signed act, dual control |

The Company Compiler is therefore not exempt from the autonomy model — it is one
of its subjects, and its proposals resolve through the same resolver as any other
actor's.

## 8. Worked examples

**Junior human, refund €300, standard customer**
`E4 / G1 → floor A2`. Charter grants A2. Result: **approve-first**. Same gate an
AI worker would get. This is invariant I2 in action — nobody feels singled out
for being a machine, and the rule is defensible.

**Finance AI worker, T3, refund €80, SMB customer, standing approval active**
`E4 / G1 → floor A2`; standing approval raises ceiling to A3 within scope.
Result: **hold-and-commit**, 10-minute window, counter decrements, visible on the
Finance Director's record.

**Same worker, 90th refund within an hour**
R-G3 aggregation escalation fires. Task grade rises to G3, floor drops to A1,
standing approval scope no longer covers it. Result: **propose only**, plus an
alert to the Finance Director with the aggregate pattern attached.

**Research AI worker, T4, reading confidential contracts for a G3 legal matter**
`E0 / G3 → floor A4`; but the matter sits in a Restricted context (R-G4), lifting
the grade floor to G4 → **A2**. Result: reads are individually authorised. Slow
by design, and correct.

**Manager mentions the Contract AI to send a signed agreement**
`E3 + E4 / G3`. The AI's own ceiling is A3, but the mentioning manager holds no
contract-signing authority. Invoker ceiling → **A1**. Result: the worker prepares
the contract as a proposal and routes it to Legal. The manager cannot obtain
through an AI worker what they cannot do themselves.

## 9. Making it user-friendly

- **The Autonomy Dial** — per worker, per capability group, six labelled stops
  with plain-language descriptions and a live preview: *"Moving to Trusted lets
  Nora send customer emails after a 15-minute hold instead of waiting for you.
  Based on the last 90 days this would have affected 214 emails, 3 of which you
  edited."* Never a raw permission matrix as the primary interface.
- **Gates explain themselves in place** — the sentence from §6.2 appears wherever
  a gate applies, with the binding rule linked to the setting that produced it.
- **One queue** — approvals, reviews, escalations and blocked work in a single
  grade-coloured inbox, not four separate screens.
- **The advanced matrix stays available** for administrators who want it, but it
  is never the path of first contact.

## 10. Deferred

- Formal policy language (OPA/Rego or equivalent) — start with the declarative
  rule structures above; adopt a policy engine when conditions outgrow them.
- Cross-tenant / partner-org authority (an AI worker acting into a customer's
  own tenant). Real, hard, and out of scope until the single-tenant model is proven.
- Regulatory overlays (SOX-style segregation of duties, GDPR lawful-basis binding
  per act). The capability descriptor has room for them; the semantics are not
  designed yet.
