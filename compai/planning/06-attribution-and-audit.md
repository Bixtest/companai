# 06 — Attribution & Audit

**Status:** provisional
**Resolves:** the attribution tension — the SRS demands attribution everywhere
(FR-053, FR-360, NFR-031) but never commits to a mechanism, and a database column
and Buzz-style signed events are very different systems.

---

## 1. The fork, stated plainly

| | Attribution column | Signed events (Buzz-style) |
|---|---|---|
| Cost | Near zero | Key management, signing latency, key rotation, revocation |
| Tamper evidence | None — anyone with DB access rewrites history | Strong |
| Survives export | No — an exported log is just claims | Yes — verifiable offline |
| Proves *to a third party* | No | Yes |
| Complexity | Trivial | Real, and it lands in the hot path |

Signing everything is expensive and mostly pointless — nobody needs cryptographic
proof of who posted a chat message. Signing nothing means the platform's central
promise ("you can always show who did what") is worth exactly as much as trust in
the database administrator, which in a regulated customer's eyes is nothing.

## 2. Recommendation: three tiers

### Tier 1 — Hash-chained event log (everything)

Every state change is an append-only event carrying the hash of its predecessor
within its tenant partition. Cheap, and it makes silent history rewriting
detectable: altering event *n* invalidates every hash from *n* onward.

```yaml
event:
  seq: 8829142
  tenant: t-acme
  prev_hash: 9f2c…
  hash: 4d81…
  ts: 2026-08-08T10:14:22.481Z
  type: task.state_changed
  actor: ai:nora
  correlation: cor-4471
  causation: 8829140            # the event that caused this one
  visibility: portal            # platform | tenant | portal | project | private
  payload: { ... }
```

Two fields adopted from `Platform/`'s event envelope
([P1 forensic §2](platforms/01-graph-portal-platform/01-forensic-analysis.md)):

- **`causation`** — distinct from `correlation`. Correlation says *which business
  action this belongs to*; causation says *which specific event triggered this
  one*. Together they make a trace navigable as a tree rather than a flat list,
  which is what turns an audit log into an explanation.
- **`visibility`** — an event's audience is decided when it is written, not when
  it is queried. Without it, every audit query has to reconstruct sensitivity
  from the payload, and one careless report leaks a private event into a portal
  timeline. With it, the ledger is filterable by construction.

Periodic **checkpoints** anchor the chain — a signed root over a range, published
to append-only storage and included in exports. An auditor can verify a range
without the platform's cooperation.

### Tier 2 — Signed Acts (a defined, small set)

Consequential acts are additionally signed by the acting principal's own key. AI
workers hold keys in the secrets provider; humans sign via session key, with
step-up (WebAuthn) for the highest grades.

**The signed set:**

- approvals and rejections
- delegations, standing approvals, elevations, and their revocations
- Charter changes and Grant Set compilations
- policy, grade-rule and lens-expression changes
- skill promotions and certifications
- trust promotions (demotions are system acts, signed by the system key)
- external communications
- financial acts
- destructive acts
- deployment of generated applications
- knowledge promotion to Official

The rule of thumb: **anything that changes what someone may do, moves money,
leaves the company, or destroys something.** That is a few hundred acts a day in
a mid-sized deployment, not millions — the cost is negligible and the guarantee
is exactly where it is needed.

### Tier 3 — Attribution chain (on every act)

"Who did this" is a chain, not a field. A single `actor_id` cannot answer the
question that actually gets asked, which is *"on whose authority?"*

```yaml
attribution:
  executor: ai:nora                       # who performed it
  on_behalf_of: human:erik                # whose work it was
  authority_source:                       # what permitted it
    kind: standing_approval
    ref: sa-2231
    granted_by: human:anna
  invoker: mnt-88213                      # the mention that started it
  gate: A3
  decision_ref: dec-99120                 # the resolver decision, with reasons
  plan: plan-4412                         # the plan this act belonged to
  correlation: cor-4471                   # the business trace
  charter_version: chr-ai-finance-004@7   # what it was, when it acted
  skill: skill:dunning-letter-drafting@4.1
  model: tier-frontier@2026-07
```

This is what makes the SRS's explainability requirements (FR-370) answerable
mechanically rather than by asking a model to reconstruct its own reasoning:
every element above is a record, not a recollection.

## 3. Correlation

One business action crosses modules, providers and subsystems (SRS FR-620). A
single correlation id threads through all of them, and every provider adapter is
required to propagate it.

```text
cor-4471   Acme onboarding
  ├─ mnt-88213      mention by @erik
  ├─ task-9945      created
  ├─ plan-4412      preflight: 2 approvals identified
  ├─ dec-99120      resolver: crm.customer.create → A4
  ├─ act-2210       crm.customer.create        [signed: no]
  ├─ apr-0881       contract.generate approved [signed: yes, legal-director]
  ├─ act-2214       contract.generate          [signed: yes, ai:nora]
  ├─ wf-7712        durable workflow: await payment (3 days)
  └─ act-2290       invoice.issue              [signed: yes, ai:nora]
```

The trace is the product feature. "Show me everything that happened for Acme's
onboarding, who decided each step, and why" is the demo that sells this platform
to anyone who has ever been audited.

### 3.1 Flow Trace — the trace as a navigable object

*Adopted from the UXAIOS documents in `Platform/documentation`.*

The text tree above is the data. **Flow Trace** is what it should look like:
select any act, event or beam and follow the chain in both directions — backward
to what caused it and forward to what it caused — rendered as a flow rather than
a list, with each node showing its actor, gate and authority source.

```text
trigger:  select an act, beam or event
    ↓
event:    trace-flow
    ↓
capability: audit.trace  (resolver-checked — the trace is permission-filtered
                          per viewer, so two people see different chains)
    ↓
view:     the correlation graph, causation edges as the spine
    ↓
ledger:   the trace request is itself an audited act
```

Two properties make this more than a visualisation:

- **`causation` is the spine.** Correlation gives the set; causation gives the
  order and the branching. Without causation you can only show a timeline, which
  answers *when* but never *why*.
- **The trace is permission-filtered per viewer** and says so. A trace with
  hidden nodes shows that nodes are hidden, without revealing them — otherwise the
  viewer draws false conclusions from an apparently complete picture.

### 3.2 `as_of` — reading the past under the rules of the past

*Adopted from `AI-FIRST-PLATFORM-POLICY.md` §2: "use `as_of` for governance reads".*

An audit read must evaluate against the rules that existed **at the time of the
act**, not today's. Otherwise replaying a year-old decision judges it by a policy
written afterwards — which is both wrong and, for a regulated customer,
indefensible.

Every governance-relevant object is therefore temporally addressable:

```text
resolve(actor, capability, resource, context, as_of: 2026-03-14T09:22Z)
  → the gate that applied then, computed from the charter version,
    grade rules, capability matrix, lens definitions, delegations and
    trust tiers that were in force at that instant
```

The attribution chain already pins `charter_version`, `skill` and `model`; `as_of`
generalises this to *every* rule, and makes the explanation in
[02 §6.2](02-authority-and-autonomy.md) reproducible years later.

This is a schema-shaping requirement, not a feature: policies, matrices, lens
expressions, charters and trust tiers all need effective-dating from the start.
Retrofitting bitemporality is notoriously expensive.

## 3.3 The mutation ordering rule

*Adopted from `architecture/release-0-edit-flow-contracts.md` and the module
loader's transaction discipline.*

Every state-changing operation follows one order, and the order is not negotiable:

```text
1  validate input
2  resolve authority          → Decision (gate, reasons, obligations)
3  persist the change         ┐
4  append the ledger event    ┘ same transaction — a failed audit fails the mutation
5  commit
6  emit the domain event      after commit, best-effort, for subscribers
```

Two consequences that are easy to get wrong:

- **Audit is inside the transaction, not after it.** If the ledger append fails,
  the business change rolls back. An action that happened without a record is
  worse than an action that did not happen — the existing codebase states this as
  an explicit invariant and it is right.
- **The event bus is outside.** Subscribers are best-effort and must be
  idempotent; the durable record is already committed. Conflating the two makes
  the audit trail hostage to delivery semantics ([§4](#4-what-the-ledger-is-not)).

The corresponding test discipline: prove the event is persisted *before* fanout,
and prove an explicit deny blocks every mutation path — not a representative one.

## 4. What the ledger is not

- **Not the event bus.** Modules react to a message bus; the ledger is the
  durable record. Conflating them makes the record hostage to delivery semantics.
- **Not the analytics store.** Audit projections feed analytics; queries run
  against projections, never against the chain.
- **Not a blockchain.** No consensus, no distribution, no tokens. Hash chaining
  and signatures are ordinary cryptography — the same conclusion the QM/Buzz
  analysis reached about Buzz.
- **Not a place to store reasoning traces.** Per SRS FR-630, the ledger holds
  decisions, evidence, actions and rationale — not every internal model token.
  Raw traces go to the AI-observability provider with a shorter retention.

## 5. Retention and privacy

Two requirements collide: audit permanence, and the right to erasure.

Recommended shape:

- The **chain is immutable**; events are never deleted, because deletion breaks
  verification.
- **Personal data lives outside the chain**, referenced by pointer. Erasure
  removes the referenced data and records a `redaction` event. The chain stays
  verifiable; the content is gone.
- **Redaction is itself an act**, signed, with a lawful basis recorded.
- Retention classes per event type, tenant-configurable within legal floors.

This needs legal review before it is treated as settled. It is the design most
likely to survive that review, not a claim that it will.

## 6. Export

Per NFR-040, a company can take its record with it — and this is where the tiered
design pays off. The export contains events, signed acts, attribution chains,
checkpoints, and the public keys of every principal. It verifies **offline,
without the platform**.

That is a meaningful commercial property: it means a customer's audit trail is
not hostage to their continued subscription, which is a differentiator in exactly
the conservative markets where a governance-first platform is sellable.

## 7. Cost and honesty about it

- Hash chaining: one hash per event, and a serialisation point per tenant
  partition. Manageable; needs a partitioning design so the chain is not a global
  write bottleneck.
- Signing: bounded by the size of the signed set. Asynchronous signing with a
  short deadline avoids putting key operations in the user-facing path, at the
  cost of a brief window where an act is recorded but not yet signed. That window
  must be visible in the record rather than hidden.
- Key management for AI workers: each worker holds a key in the secrets provider,
  issued at Charter compilation and revoked at offboarding. Key rotation on
  Charter version change is the clean rule — it makes "what was this worker when
  it acted" cryptographically answerable.

## 8. Open points

- **Chain partitioning** — per tenant is the obvious unit, but a high-volume
  tenant may need sub-partitioning, which weakens the total-order property. Needs
  a decision informed by real throughput numbers.
- **Human signing UX** — step-up authentication on every G3 approval is correct
  and will be resented. Session-scoped signing keys with short lifetimes are the
  likely compromise.
- **Third-party verification tooling** — an offline verifier is a small piece of
  software that makes the whole export claim credible. Worth building early, and
  worth open-sourcing.
- **Does the customer's auditor actually want this?** Worth validating with a real
  compliance function before over-investing. The design is cheap at Tier 1 and
  incremental at Tier 2, which is deliberate: Tier 1 alone is defensible, and
  Tier 2 can arrive when a customer asks for it.
