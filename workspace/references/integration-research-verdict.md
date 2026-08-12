# The integration research — an honest reading

**What was reviewed.** Three files in `integration_research/`: a `.docx`, a `.pdf`
and a `.md`. The `.docx` and `.pdf` are the same export; the `.md` is a slightly
longer revision. All propose the same thing — a *Company OS Universal Integration
Control Plane* sitting above Apache Camel, Apache APISIX, Temporal, NATS
JetStream, Debezium, SeaTunnel, Playwright and Open Policy Agent, plus a
customer-hosted edge runtime.

**Verdict: good research, right instinct, wrong moment — and about a third of it
we have already built.**

---

## 1. Its central idea is the one we already acted on

The document's thesis is *own the meaning of an integration, rent the machinery*.
That is the same reasoning that produced our governance layer, and the overlap is
not vague — it is line for line:

| The document proposes | We already have | Which is richer |
|---|---|---|
| Side-effect classes: `none`, `local_write`, `reversible_write`, `external_communication`, `financial`, `destructive`, `security_sensitive` | **Effect classes E0–E6**, plus `reversibility`, `externalEffect`, `dataClasses`, `standingApprovable` | **Ours.** Theirs is one axis; ours is four, and 113 capabilities are already classified |
| A principal with `type: ai_employee` | **R1 principal abstraction** — `human`, `ai_worker`, `service`, `system` | Equivalent |
| `delegation: { grantedBy, expiresAt }` | **G3 delegations** — built, tested, live, with a 90-day cap and mandatory reason | **Ours** |
| *"IF actor = AI AND sideEffect = financial AND amount > 500 THEN require approval"* | **Gates A0–A5**, pending acts, the approvals queue | **Ours** — theirs is pseudocode, ours is running and clicked through |
| Policy enforcement via **Open Policy Agent** | The authority resolver: graph ceilings, invoker authority, record locks, delegations, trust, tenant policy, project overlays | **Ours**, for our domain |
| Correlation model | Roadmap item 14 — already identified, not yet built | Same gap, already on our list |

**Adopting OPA would be a step backwards.** We would replace a domain-specific
resolver — one that enforces *"everything is a ceiling and the answer is the
minimum"* and is covered by tests — with a general engine, and then re-express
every invariant in Rego. The document recommends OPA because it assumes no such
resolver exists. Ours does.

That the research re-derived our model independently is the most useful thing in
it: **it is validation, not instruction.**

## 2. What it identifies that we genuinely lack

Stated plainly, because these are real:

- **A capability contract for external systems.** We classify our *own* 113
  capabilities. We have no `crm.contact.search` abstraction that hides whether a
  customer's CRM speaks REST, SQL or MCP.
- **A declared idempotency mode per write.** We have commands and optimistic
  locking; we do not have `natural-key` / `provider-idempotency-key` / `unsafe`
  declarations driving retry behaviour.
- **A customer edge runtime** for systems behind a firewall.
- **Change data capture.**
- **Correlation ids** — already our item 14.

## 3. Why none of it belongs in the Starting Kit

**Its own estimate:**

| Stage | Effort |
|---|---|
| Credible POC | 50–80 person-weeks |
| Production v1 | **220–380 person-weeks** |
| Broad platform | 450–800+ person-weeks |

That is four to seven engineers for a year, for the middle row.

**And the operational cost lands immediately.** We deploy three things today: the
Next app, Postgres, Redis. The proposal adds APISIX, Camel, Temporal, NATS,
Debezium, optionally SeaTunnel and Playwright, plus OPA — **roughly five times
the operational surface, before a single customer exists.** We have not yet run
our own deployment guide on a real server once.

**Several pieces also duplicate what we already ship**: the `queue` package
(Redis/BullMQ), the events bus, the `workflows` module, `webhooks`, and the
`integrations` + `data_sync` modules. The document was not written against our
codebase, so it does not know that.

## 4. The gap the document does not cover

**It never mentions Hermes.** Neither copy does. It was written before Hermes
became the intended AI engine, and the two overlap: Hermes brings its own agent
runtime, sessions, memory, skills, subagents and execution backends. Several
workstreams in the document — MCP brokering, agent-facing execution, tool
invocation — need re-reading *after* Hermes is in, because Hermes may already
provide them.

**Deciding the integration architecture before Hermes lands would be deciding it
with the biggest variable missing.**

## 5. Recommendation

**Defer the whole thing to post-hosting, and revisit it after Hermes is in.**
Recorded as roadmap item 29.

Keep two ideas warm, because they are cheap and they age well:

1. **The external capability contract** — worth designing when the first real
   external system needs integrating, not before. Our internal capability
   descriptors are already the right shape to extend.
2. **Idempotency declarations on writes** — a small, additive field on the
   command contract, and the natural companion to the `capability` field we just
   widened.

Neither is a Starting Kit task. Both should be revisited when a customer's system
forces the question, which is the only honest trigger for building an integration
platform.
