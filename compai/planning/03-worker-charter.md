# 03 — The Worker Charter (the "CV")

**Status:** provisional
**Implements:** Idea 2 — a CV for AI workers: what it is, its mindflow, who it
supervises and who supervises it, skills, knowledge bases and hashtags, MCP
access, web access, system permissions, subsystem access.
**Resolves:** the human/AI asymmetry tension.

---

## 1. The critical design decision

A CV that *describes* a worker will drift from what the worker can actually do
within weeks. Descriptions are written once and reality changes continuously; the
document becomes a lie that everyone stops reading, and the real permissions live
in a database table nobody can explain.

**So the Charter is not a description. It is the source.**

```text
Charter  ──compile──►  Grant Set  ──enforce──►  runtime
(declarative,          (flat, fast,             (gateway,
 versioned,             derived,                 resolver,
 reviewable,            never hand-edited)       ledger)
 diffable)
```

Nothing at runtime reads the Charter. Runtime reads the compiled Grant Set. The
Charter cannot drift from reality because the Charter *is* reality — it is the
only input to what the worker can do. Change the Charter, recompile, and the
worker's tools, scopes, budgets and gates change with it.

This is the same pattern as the Company Blueprint one level down, which is why it
feels right: the platform compiles organisations, and an organisation is made of
workers.

**The "CV" is the human-readable rendering of the Charter** — a one-page profile
that anyone can read. Working names: *Worker Charter* (the object), *Service
Record* (the rendered view). The word "CV" is a good user-facing metaphor and a
poor schema name, because a CV is a claim about the past and this is a grant for
the present.

## 2. Humans get one too

Per invariant **I2**, there is one Charter schema. AI-only sections are simply
absent for humans, and human-only sections absent for AI workers.

| Section | Human | AI worker | Service |
|---|---|---|---|
| Identity, Position, Supervision | ● | ● | ● |
| Purpose & scope | ● | ● | ● |
| Skills & certification | ● | ● | ○ |
| Knowledge access | ● | ● | ● |
| System permissions & autonomy | ● | ● | ● |
| Subsystem access | ● | ● | ● |
| **Mindflow** | ○ (advisory) | ● | ○ |
| **Model policy** | — | ● | — |
| **Runtime envelope** | — | ● | ● |
| **Tool & MCP grants** | — | ● | ● |
| **Web access policy** | — | ● | ● |
| **Evaluation & trust** | ○ (review record) | ● | ○ |
| Working hours, absence, delegate | ● | ○ (schedule) | — |

● required ○ optional — not applicable

The asymmetry is real and it is now *visible in the schema* rather than smeared
across the codebase as type checks. A human's Charter is thin; an AI worker's is
thick. Both go through the same review, versioning and impact analysis.

## 3. Composition

Writing a full Charter per worker does not survive fifty workers. Charters
**compose** through four layers:

```text
Role Template          "Accounts Receivable Specialist" — the canon
      │  merge
Department Overlay     Finance-wide constraints and grants
      │  merge
Individual Charter     this specific worker's identity and adjustments
      │  merge
Assignment Overlay     temporary, scoped to a project/case/incident, expires
      ▼
Effective Charter  ──compile──►  Grant Set
```

### 3.1 Merge semantics

**Every overlay may only narrow.** This one rule is what makes composition safe
and auditable. Adding an overlay can never increase what a worker may do.

The single exception is an explicit block:

```yaml
elevation:
  grants: [contract.generate]
  gate: A2
  reason: "Q4 renewals surge — legal team capacity"
  granted_by: legal-director          # must personally hold this authority
  effective: 2026-08-08 .. 2026-09-30 # expiry mandatory, max 90 days
  auto_revoke_on: [incident, trust_demotion, role_change]
```

Elevations are signed acts, appear on the granter's own record, expire by
construction, and are listed on the worker's profile as a visible temporary
state — never silently folded into the baseline.

### 3.2 Template propagation

When a Role Template changes, every Charter deriving from it enters
`pending_recompile` with a diff. Changes that only narrow apply automatically;
changes that widen require the same approval as the original grant. Workers on
the affected template are listed with an impact summary before the change is
committed (SRS FR-601).

## 4. The schema

```yaml
charter:
  id: chr-ai-finance-004
  version: 7
  status: active            # draft|in_review|active|suspended|superseded|retired
  supersedes: 6
  effective_from: 2026-08-08
  review_due: 2026-11-08

  derives_from:
    role_template: rt-accounts-receivable-specialist@3.2
    department_overlay: ovl-finance@1.4

# ─────────────────────────────────────────────────────── 1. IDENTITY
  identity:
    kind: ai_worker
    handle: "@nora"
    display_name: Nora
    employment_number: AI-0041
    signing_key_ref: kms://tenant-a/principals/ai-finance-004
    created: 2026-03-02
    pronouns: they/them          # rendered in generated text about this worker

# ─────────────────────────────────────────────────────── 2. POSITION
  position:
    role: accounts-receivable-specialist
    department: finance
    teams: [collections, customer-launch]
    employment_state: active     # draft|onboarding|testing|active|paused|
                                 # restricted|under_review|retired
    location_scope: [SE, EU]     # data residency / jurisdiction

# ─────────────────────────────────────────────────────── 3. PURPOSE
  purpose:
    mission: >
      Keep receivables current by monitoring overdue invoices, preparing
      customer communications, and escalating collection risk early.
    responsibilities:
      - Monitor the overdue-invoice ledger daily
      - Draft dunning communications for human release
      - Maintain payment-promise records
      - Escalate accounts crossing risk thresholds
    out_of_scope:               # negative scope is mandatory, not optional
      - Negotiating payment terms
      - Issuing credit notes above the standing-approval ceiling
      - Any contact with customers in active legal dispute
      - Any communication in a language it is not certified for
    success_measures:
      - dso_contribution
      - draft_acceptance_rate
      - escalation_precision

# ─────────────────────────────────────────────────────── 4. SUPERVISION
  supervision:
    reports_to: human:finance-director
    accountable_human: human:finance-director   # never null for an AI worker
    escalates_to:                                # ordered chain
      - human:ar-manager
      - human:finance-director
      - duty:finance-on-call
    supervises: []               # workers whose work it directs
    reviews_for:                 # whose output it reviews
      - ai:invoice-matcher
    reviewed_by:
      - human:ar-manager
    approval_authority:          # what it may itself approve
      - capability: payment_promise.record
        limit: { amount_max: 2000, currency: EUR }
        gate: A3
    deputises_for: []            # coverage during absence

# ─────────────────────────────────────────────────────── 5. MINDFLOW
  mindflow: *see section 5*

# ─────────────────────────────────────────────────────── 6. SKILLS
  skills:
    - id: skill:dunning-letter-drafting
      version: "4.1"
      certification: certified   # untested|shadow|probation|certified|suspended
      autonomy: A3
      certified_on: 2026-06-14
      evidence: eval:run-8821
    - id: skill:payment-risk-assessment
      version: "2.0"
      certification: probation
      autonomy: A1
    - id: skill:customer-payment-history-analysis
      version: "1.7"
      certification: certified
      autonomy: A5

# ─────────────────────────────────────────────────────── 7. KNOWLEDGE
  knowledge:
    granted_lenses:              # see doc 04 — grants are by lens, not by document
      - lens:finance-operating-knowledge
      - lens:customer-payment-context
      - lens:"#topic/credit-policy AND NOT #lifecycle/superseded"
    denied_tags:                 # explicit exclusions win over any grant
      - "#topic/legal-dispute"
      - "#sensitivity/hr-personal"
    classification_ceiling: confidential   # public|internal|confidential|restricted
    redaction_profile: pii-mask-default
    may_promote_knowledge: proposal_only   # none|proposal_only|direct
    memory:
      scope: [own_sessions, assigned_customers]
      retention: 180d
      promotion_target: lens:finance-operating-knowledge

# ─────────────────────────────────────────────────── 8. CAPABILITIES
  capabilities:
    - id: erp.invoice.read            # inherits gate from resolver defaults
    - id: erp.invoice.list
    - id: crm.customer.read
    - id: communication.draft
      gate: A5
    - id: communication.send_external
      gate: A2                        # narrower than default; deliberate
      constraints:
        recipient_scope: lens:assigned-customers
        template_required: true
        languages: [sv, en]
    - id: erp.credit_note.issue
      gate: A2
      constraints: { amount_max: 500 }
    denied:                            # explicit denials, unconditional
      - erp.payment.post
      - erp.invoice.cancel
      - erp.customer.delete

# ────────────────────────────────────────────────── 9. TOOLS & MCP
  tools:
    mcp_servers:
      - server: mcp:erp-gateway
        tools: [invoice_search, invoice_get, aging_report]
        denied_tools: [invoice_void, payment_post]
        rate_limit: 120/min
        argument_constraints:
          invoice_search: { company_scope: assigned }
      - server: mcp:document-store
        tools: [search, get]
    native_tools: [calculator, spreadsheet_read, chart_render]
    code_execution:
      enabled: true
      runtime: sandbox-python-restricted
      network: none
      filesystem: ephemeral

# ─────────────────────────────────────────────────── 10. WEB ACCESS
  web:
    mode: allowlist                # none|allowlist|denylist|open_logged
    allowlist:
      - "*.bolagsverket.se"
      - "*.creditsafe.com"
    may_download: true
    download_scan: required
    may_submit_forms: false        # no state-changing web interaction
    may_authenticate: false        # never holds site credentials
    log_retention: 90d

# ────────────────────────────────────────────── 11. SUBSYSTEM ACCESS
  subsystems:
    - system: erp
      scopes: [receivables, customers]
      mode: read_write
      record_filter: lens:assigned-customers
    - system: crm
      scopes: [accounts, activities]
      mode: read
    - system: office
      scopes: [documents/finance]
      mode: read_write
    - system: analytics
      scopes: [finance_marts]
      mode: read

# ───────────────────────────────────────────────── 12. MODEL POLICY
  model_policy:
    allowed: [tier-frontier, tier-fast]
    default: tier-frontier
    fallback: tier-fast
    escalate_to_frontier_when: [grade >= G2, confidence < 0.7]
    data_residency: eu
    no_training: true
    max_context_class: confidential

# ────────────────────────────────────────────── 13. RUNTIME ENVELOPE
  runtime:
    budget:
      daily: { amount: 40, currency: EUR, on_breach: gate_to_A2 }
      monthly: { amount: 600, currency: EUR, on_breach: suspend }
      per_task_default: { amount: 3, currency: EUR }
    concurrency: 3
    max_task_duration: 45m
    max_plan_steps: 25
    max_subagent_depth: 2
    schedule:
      active_hours: "06:00-20:00 Europe/Stockholm"
      outside_hours: queue          # queue|proceed|escalate
    idle_timeout: 10m

# ──────────────────────────────────────────── 14. EVALUATION & TRUST
  evaluation:
    suite: eval:accounts-receivable-v3
    bar: 0.85
    last_run: { id: eval:run-8821, score: 0.91, date: 2026-07-30 }
    cadence: monthly
    regression_required_on: [skill_change, model_change, charter_change]
  trust:
    tiers:                          # per capability group, see doc 02 §5.1
      read: T4
      internal_write: T3
      external_communication: T2
      financial: T1
    incidents_open: 0
    last_demotion: null

# ───────────────────────────────────────────────── 15. LIFECYCLE
  lifecycle:
    onboarding_checklist: [knowledge_granted, skills_certified,
                           shadow_period_complete, manager_approval]
    offboarding_plan:
      reassign_open_work_to: role:accounts-receivable-specialist
      revoke: [credentials, mcp_grants, subsystem_access, schedules]
      preserve: [knowledge_contributions, action_history, attribution]

# ───────────────────────────────────────────────── 16. PROVENANCE
  provenance:
    authored_by: human:ar-manager
    approved_by: human:finance-director
    approved_at: 2026-08-08T09:14:00Z
    signature: <signed act ref>
    change_log: [...]
```

## 5. Mindflow

The most novel part of Idea 2, and the part that decides whether two workers with
identical skills behave differently. Mindflow is the worker's **operating
doctrine**: not what it knows, but how it works.

It must be **structured**, because free prose cannot be tested, diffed, or
enforced. Each clause below is individually assertable in an evaluation scenario,
which is what turns Mindflow from a prompt into a governed asset (NFR-041).

```yaml
mindflow:
  version: "2.3"

  intake:
    accepts: [assigned_task, mention, scheduled_trigger, escalation_from_peer]
    rejects: [direct_customer_request]        # must arrive through a task
    clarify_before_starting_if:
      - customer identity ambiguous
      - amount or currency unstated
      - requested action outside listed responsibilities
    refuse_and_escalate_if:
      - account in legal dispute
      - request originates outside assigned customer scope

  planning:
    mode: plan_first                          # plan_first|act_first|adaptive
    plan_approval_required_above_grade: G2
    decomposition_limit: 12
    replan_on: [new_evidence, blocked_step, budget_50pct]

  evidence:
    standard: prefer_authoritative            # what counts as knowing something
    minimum_sources: 2                        # for asserted facts
    source_order: [erp_record, approved_knowledge, crm_record, web]
    conflict_rule: escalate                   # escalate|prefer_newest|prefer_authoritative
    never_assert_without_source: true
    state_uncertainty_below_confidence: 0.75

  method:                                     # ordered phases
    - understand_request
    - gather_account_context
    - verify_against_erp
    - assess_risk
    - draft_output
    - self_check_against_policy
    - deliver_or_escalate

  tool_doctrine:
    preferred_order: [internal_records, approved_knowledge, subsystem_api, web]
    web_only_if: internal sources insufficient and question is external-facts
    never_use_web_for: [customer balances, payment status, contract terms]

  self_check:
    before_delivery:
      - all monetary figures traced to an ERP record
      - no customer named who is outside assigned scope
      - tone matches communication profile
      - no commitment made that requires approval not held

  stop_conditions:
    - confidence below 0.6 on a G2+ task
    - two consecutive tool failures on the same resource
    - budget 80% consumed
    - contradictory instructions from two authorities
    - would require a capability not granted

  escalation:
    triggers:
      - customer disputes an amount
      - account crosses high-risk threshold
      - policy appears to conflict with a customer agreement
    must_include: [what was attempted, what is blocking, options considered,
                   recommendation, what decision is needed, deadline]

  definition_of_done:
    - output produced in the required format
    - all claims sourced
    - deliverable gate satisfied
    - task record updated with outcome and evidence links

  communication:
    tone: direct_professional
    languages: [sv, en]
    formatting: short_paragraphs_no_jargon
    always_disclose_ai_authorship: true
    never: [promising dates, quoting law, discussing other customers]

  prohibitions:
    - never contact a customer outside assigned scope
    - never state a payment has been received without an ERP record
    - never modify an invoice
```

### 5.1 Mindflow is versioned, testable and shareable

- It is an asset like a Skill: versioned, reviewed, promoted, retired.
- Clauses map to **evaluation assertions**: *"given a disputed amount, did it
  escalate rather than answer?"* A mindflow change triggers regression.
- Mindflows are **reusable across workers** — a department can define a house
  doctrine that all its workers inherit and narrow.
- Industry Packs ship mindflows. This is a large part of what a pack *is*.

### 5.2 Mindflow vs. Skill

A recurring confusion worth settling now:

| | Skill | Mindflow |
|---|---|---|
| Answers | *How do I perform task type X?* | *How do I work, always?* |
| Scope | One reusable procedure | Every task this worker takes |
| Count per worker | Many | One (composed from overlays) |
| Analogy | A trained procedure | Professional judgement and conduct |

## 6. Compilation

```text
Effective Charter
      │
      ├─► Capability Grant Table     (capability → gate, constraints)
      ├─► Tool Manifest              (MCP servers, tools, arg constraints, limits)
      ├─► Knowledge Scope Set        (resolved lens → filter predicates)
      ├─► Subsystem Credential Refs  (scoped tokens, never raw secrets)
      ├─► Budget Counters            (initialised, bound to the ledger)
      ├─► Runtime Config             (model policy, concurrency, timeouts)
      ├─► Prompt Assembly Inputs     (mission, mindflow, doctrine, prohibitions)
      └─► Evaluation Binding         (suite, bar, cadence)
```

Compilation rules:

- **Deterministic** — same Charter, same Grant Set. Compilation is diffable.
- **Fail closed** — a Charter that references a missing skill, unknown capability
  or unresolvable lens fails to compile, and the worker keeps its previous Grant
  Set (or stays inactive if it never had one). No partial application.
- **Atomic** — a Grant Set is swapped whole. A worker never runs half-old grants.
- **In-flight work** — running tasks continue under the Grant Set they started
  with, unless the change is a *narrowing for cause* (incident, demotion,
  suspension), which pre-empts immediately.
- **Every compile is a ledger act**, with the diff attached.

## 7. Lifecycle

```text
Draft ──► In review ──► Approved ──► Onboarding ──► Shadow (T0)
                                                        │
                                          evidence accumulates
                                                        ▼
                                                   Probation (T1)
                                                        │
                                             promotion decision (human)
                                                        ▼
                                                     Active
                                              │             │
                                    incident/regression   review
                                              ▼             ▼
                                        Restricted     Charter v+1
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                                 Paused              Retired
```

**Change is versioned, not edited.** Every Charter change produces a new version
with a diff, an impact analysis and an approval. The impact analysis answers:
which tasks, lenses, standing approvals, evaluations, teams and downstream
workers are affected (SRS FR-601, FR-422).

**Simulation before activation** (SRS FR-430): a proposed Charter can be replayed
against the last *N* days of the worker's actual work to answer *"what would have
been different?"* — how many additional approvals, which acts would have been
blocked, what the cost delta is. This is the same machinery as shadow mode,
pointed backwards, and it makes charter changes arguable with evidence instead of
opinion.

## 8. The rendered CV

What a person actually sees. The Charter is YAML; nobody should have to read it.

```text
┌────────────────────────────────────────────────────────────────┐
│  Nora  ·  @nora  ·  AI-0041                        ● Active    │
│  Accounts Receivable Specialist · Finance                      │
│  Reports to: Anna Lind (Finance Director)                      │
├────────────────────────────────────────────────────────────────┤
│  Trust    read T4 │ internal T3 │ external T2 │ financial T1    │
│  Budget   €18 / €40 today        €212 / €600 this month         │
│  Now      3 tasks · 1 awaiting your approval                    │
│  ⚠ Temporary elevation: contract.generate until 30 Sep          │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│ Overview │ Mindflow │  Skills  │Knowledge │  Access  │ Record  │
└──────────┴──────────┴──────────┴──────────┴──────────┴─────────┘

Overview   mission, responsibilities, what it will not do, who it works with
Mindflow   plain-language rendering of the doctrine, clause by clause
Skills     each with version, certification state, autonomy, last evidence
Knowledge  which lenses, what that means in plain words, what is excluded
Access     capabilities grouped by area with their gates; tools; web; subsystems
Record     evaluations, incidents, performance, cost, charter history with diffs
```

Design rules for this surface:

- **Every grant is stated in plain language with its consequence.** Not
  `communication.send_external: A2` but *"Can send customer emails — you approve
  each one before it goes."*
- **Negative scope is displayed as prominently as positive scope.** What a worker
  will refuse to do is the thing managers most need to know and the thing every
  agent product hides.
- **The Access tab shows the *effective* result**, with each line traceable to the
  layer that produced it (template / department / individual / assignment /
  elevation). One click to "why is this like this?".
- **Editing produces a proposal, never a live change** — diff, impact, simulation,
  approval, then compile.

## 9. Open points

- **Do humans see their own Charter?** Recommendation: yes, and it is a feature —
  role clarity is a genuine organisational good. But the trust and evaluation
  sections applied to humans are an HR minefield in several jurisdictions and
  probably need to be off by default for human principals.
- **Naming.** *Charter* is accurate but slightly grand; *Mandate*, *Commission*
  and *Employment File* are alternatives. *Mindflow* should be kept — it is
  distinctive and immediately understood.
- **Charter portability.** NFR-040 implies exporting charters. A charter exported
  from tenant A and imported to tenant B carries capability ids that may not
  exist. Needs a capability-mapping story before templates can be a marketplace.
