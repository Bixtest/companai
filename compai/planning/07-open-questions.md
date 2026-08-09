# 07 — Open Questions

**Status:** live list
Decisions we are deliberately not making yet, with what would settle each.

---

## Blocking — needed before Phase 0 design is final

**Q1 — Relationship to the existing `Platform/` codebase and the two candidate
base platforms.**
Evolve, extract, or reference ([01 §7](01-core-architecture.md))? This changes
what Phase 0 even means.
*Settled by:* scoring all three against [Rubric](method/platform-evaluation-rubric.md).
*This is the immediate next step.*

**Q2 — Is the principal model genuinely uniform, or is `ai_worker` a subtype?**
The invariant says one model with optional sections. If a candidate platform's
identity layer cannot hold a non-human principal without violence, that changes
the build/adopt answer more than any feature comparison.
*Settled by:* Q1's evaluation.

**Q3 — Tenancy shape.** One deployment per company, or multi-tenant with strong
isolation? The deep-research report assumes multi-tenant portals; the QM analysis
notes such boundaries are hard to get right. This decision reaches into the
ledger partitioning, the entity graph, and every provider adapter.
*Settled by:* commercial model — self-hosted enterprise vs. SaaS. A product
decision, not a technical one.

## Important — needed before Phase 1

**Q4 — Buy or build the authorisation substrate.** OpenFGA relationship tuples
map well to the org graph, and OPA to conditional policy. But the Autonomy
Resolver is *ours* regardless. Is OpenFGA the storage behind it, or is a
purpose-built relationship layer simpler given how much our model differs?
*Settled by:* modelling three real scenarios in OpenFGA and measuring the
awkwardness.

**Q5 — Workflow engine.** Temporal or Hatchet, behind `WorkflowRuntimeProvider`.
The deep research favours Hatchet for speed and Temporal for durability.
*Settled by:* the crash/recovery/long-wait test suite the research already
specifies. Do not decide by reading documentation.

**Q6 — Agent runtime.** Build minimal, or adopt Hermes/equivalent behind
`AgentRuntimeProvider`? The gateway pattern ([01 §4](01-core-architecture.md))
means the choice is genuinely reversible — which argues for adopting fast and
revisiting.

**Q7 — Entity resolution.** `#customer/acme` depends on knowing two records are
the same organisation. Matching, merge, split, confidence and manual override are
a real subsystem and are currently under-specified
([04 §9](04-context-graph-and-tags.md)).

**Q8 — Deliverable-gate granularity.** Per task, per artefact type, or per skill?
Probably per artefact type with task override, but this is untested.

## Needed before customer deployment

**Q9 — Retention vs. erasure, and the wider EU compliance surface.**
[06 §5](06-attribution-and-audit.md) proposes pointer-based redaction. Needs
legal review, per jurisdiction.

The existing platform's `AI-FIRST-PLATFORM-POLICY.md` §6 offers a structure for
that review rather than a blank page. Adopted as the checklist to react to:

| Obligation | Platform mechanism we already have or need |
|---|---|
| Lawful basis and purpose | AI runs tied to actor, tenant policy and an audited purpose — never anonymous bulk processing |
| Data minimisation | Capabilities declare required scopes; retrieval is lens-bounded ([04 §4](04-context-graph-and-tags.md)) |
| Storage limitation | Retention classes per event type; purge jobs; cell snapshot policy |
| Integrity and confidentiality | Encryption in transit, secrets outside the repo, tenant isolation tests |
| Accountability | Ledger, approval record, signed acts ([06](06-attribution-and-audit.md)) |
| Cross-border transfer | `data_residency` and `policy_tags` on the model registry; **external providers default to `evaluation` until explicitly enabled** — a good default we adopt |
| Human oversight | The autonomy ladder itself; approval paths; A0–A2 gates on E4–E6 |

Two of these are not yet in our design and should be: **purpose binding on an AI
run** (an act records *why* it was permitted to process this data, not only that
it was), and **retention classes as a first-class property of event types**.

Legal interpretation and DPIA remain the operator's responsibility; the platform
supplies technical measures. That division is the right one and worth stating to
customers explicitly.

**Q10 — Human trust tiers and evaluation records.** Applying the trust model to
human principals is coherent, useful for role clarity, and legally fraught in
several European jurisdictions. Recommendation is off-by-default for humans, but
this needs an actual answer, not a default.

**Q11 — Liability for AI worker acts.** When an AI worker under a standing
approval causes loss, the record shows the human whose authority permitted it.
That is technically correct and commercially uncomfortable. Customers will ask.

**Q12 — Cross-tenant authority.** An AI worker acting into a customer's or
supplier's tenant. Deferred consistently across [02](02-authority-and-autonomy.md)
and [05](05-addressing-and-mentions.md), but it is a natural product demand and
the deferral should be conscious rather than accidental.

## Design questions with no deadline

**Q13 — Naming.** AI Worker / Charter / Mindflow / Lens
([README](README.md#naming)). Worth settling before the vocabulary sets in
documentation and UI, because renaming a core noun later is expensive in ways
that are hard to predict.

**Q14 — How much does the Company Compiler actually generate on day one?**
Generating an entire company is the demo. Generating a department that works is
the product. The phasing in [01 §6.1](01-core-architecture.md) implies starting
narrow, but the marketing pull will be toward the demo.

**Q15 — Do we ship a default grade/capability matrix, or make each tenant define
one?** Shipping defaults is far friendlier and makes us responsible for them.
Current lean: ship opinionated defaults, make every cell overridable, show which
cells a tenant has changed.

**Q16 — Lens performance at scale.** Resolving lenses inside the permission
filter on every retrieval is the hottest path in the system
([04 §9](04-context-graph-and-tags.md)). The materialisation strategy needs real
numbers, and it may push back on the design.

One hard rule adopted in advance, from `AI-FIRST-PLATFORM-POLICY.md` §4:
**SQL-level filtering, never load-all-then-filter in memory.** Lens resolution
must compile to predicates the database evaluates, not to a post-fetch filter.
Any lens that cannot be compiled to a predicate is a design error, not a
performance problem to optimise later.

**Q17 — How far up the visualisation stack do we go?** The existing
documentation proposes a five-layer model: KPI ("what is happening") →
analytical ("why") → relationship ("what connects to what") → multidimensional
("across dimensions") → spatial knowledge ("where am I inside the information"),
and correctly observes that layers 4–5 are essentially greenfield industry-wide.

Layers 1–3 are commodity and we need them. Layers 4–5 are a research programme
that would consume the team. Current lean: **stop at layer 3**, with the beam
graph ([04 §2.5](04-context-graph-and-tags.md)) and Flow Trace
([06 §3.1](06-attribution-and-audit.md)) as our layer-3 answer, and revisit only
if a customer problem genuinely demands more.

---

## Questions that are now closed

Recorded so they are not silently reopened.

| Was | Now |
|---|---|
| Are humans and AI two work systems or one? | One, with asymmetry as optional schema sections ([00 I1/I2](00-product-thesis.md)) |
| Is attribution a column or a signed log? | Both, tiered — chain for everything, signatures for consequential acts ([06](06-attribution-and-audit.md)) |
| How do we avoid approval fatigue? | Preflight batching, hold-and-commit, standing approvals, evidence-based gate removal ([02 §6.3, §7](02-authority-and-autonomy.md)) |
| How does an AI worker earn autonomy? | Computed trust tiers from evaluation and incident evidence; automatic demotion, human promotion ([02 §5](02-authority-and-autonomy.md)) |
| Are hashtags strings? | No — entity tags resolve to canonical entities ([04 §1](04-context-graph-and-tags.md)) |
| Can a mention escalate privilege? | No — mentions carry but never amplify authority ([05 §4.1](05-addressing-and-mentions.md)) |
| Does the CV drift from reality? | It cannot — it is the compiled source of runtime grants ([03 §1](03-worker-charter.md)) |
