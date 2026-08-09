# 00 — Product Thesis

**Status:** provisional
**Purpose:** state what we are building tightly enough that every later decision
can be checked against it.

---

## 1. The thesis

We are building a **compiler and runtime for companies**.

A business describes itself in plain language. The platform researches it,
proposes a complete operating structure — departments, roles, workflows,
knowledge, AI workers, applications, metrics — and humans approve that structure.
The platform then *runs* the company: humans and AI workers doing work inside
the same org chart, the same task system, and the same authority rules.

The Company Blueprint is source code. The running company is the program.

This pattern repeats at every level, and that repetition is the architecture:

```text
Company Blueprint  →  compiles to  →  the running organisation
Worker Charter     →  compiles to  →  that worker's runtime grants
Skill definition   →  compiles to  →  executable procedure + tests
Lens (tag expr.)   →  compiles to  →  a retrieval / reporting scope
Policy             →  compiles to  →  autonomy decisions at runtime
```

Every one of these is: declarative, versioned, reviewable, diffable, testable,
and reversible. Nothing important is allowed to exist only as an opaque prompt
or an undocumented runtime setting (this is SRS NFR-041, promoted here to a
first principle).

## 2. What is actually differentiating

Not the agents. Agent runtimes are commoditising on a monthly cycle, and the
deep-research report already concludes they should be kept replaceable behind
provider interfaces.

The durable asset is the **governance layer**:

- one principal model that admits humans, AI workers and services as peers;
- capability contracts with intrinsic risk semantics;
- a single autonomy decision point that is always explainable;
- a versioned skill and charter lifecycle with evaluation gates;
- a canonical entity + context graph that survives subsystem replacement;
- one correlated, tamper-evident record of who did what and under whose authority.

That is the part nobody sells, everybody eventually needs, and that stays
valuable after today's model providers and harnesses have been swapped out twice.

The second differentiator is the **Company Compiler** — the highest-leverage and
highest-risk component. Its output quality is a direct function of the domain
knowledge behind it, which makes **Industry Packs** (SRS FR-410) strategically
central rather than a late nice-to-have. Packs are where grades, mindflows, tag
vocabularies, role charters and evaluation scenarios actually ship.

## 3. Invariants

These are the rules the rest of the architecture is not allowed to violate.
If a design decision breaks one of these, the design decision is wrong.

### I1 — One work system

Humans and AI workers share the org model, the task model, the goal tree, the
approval system and the performance system. Occupancy of a role is an attribute,
not a fork in the data model.

### I1a — One set of surfaces, gated by authority

*Adopted from `uxaios/PLATFORM-FEATURE-INVENTORY.md`: "Access is not admin pages
vs guest pages."*

The corollary of I1, and the one that shapes the entire UI. There is no "admin
portal" and no "user portal". **All functions live on the same pages**, and
whether an actor can open a page or press a button is decided by the resolver —
not by routing them to a different application.

Two consequences worth stating because they are routinely violated:

- Operator tooling is **temporary scaffolding**, never the product. Every
  workbench built to administer something should have a named product surface it
  is standing in for, and a plan to be replaced by it.
- The permissions catalogue is a **first-class product area**, not an appendix to
  an admin screen — grouped by module, showing each capability's risk class and
  what granting it actually permits.

This is also what makes the human/AI symmetry visible rather than theoretical: a
manager and an AI worker are looking at the same surface, and the difference
between them is a gate, not a different application.

### I2 — Asymmetry lives in data, not in code

Humans and AI workers are genuinely different: AI workers need context assembly,
budgets, model policy, regression tests and runtime envelopes; humans need
working hours, absence and delegation-on-leave. This asymmetry is expressed as
**optional sections of one schema**, never as `if (principal.type === 'ai')`
scattered through the codebase.

Corollary, and it is the honest form of I1: **humans have autonomy levels too.**
A junior may need approval for the same action an AI worker needs approval for.
Approvals are a property of authority, not of being a machine.

### I3 — Nothing acts without an attributable principal

Every consequential act names its executor, whom it acted on behalf of, and
which grant of authority permitted it. There is no shared superuser identity and
no unattributed background automation.

### I4 — Authority is carried, never amplified

Delegation, mention, subagent spawning and workflow invocation all *transfer*
authority downward. No path in the system lets an actor cause an act that the
initiating authority could not have performed itself.

### I5 — One decision point

Exactly one component decides whether an act may proceed and under what gate.
Every other component asks it. A second policy implementation anywhere is a bug.

### I6 — Every decision is explainable

Any gate, denial or requirement can be rendered as one plain sentence naming the
rules that produced it. Explainability is a property of the resolver's return
value, not a feature bolted on later.

### I7 — Discovery never grants access

Tags, search indexes, mentions, embeddings, summaries and previews may only
narrow what an actor can already see. No derived artefact widens access to its
source. In particular, an AI worker cannot tag, index or summarise its way into
data it was not granted.

### I8 — Reversibility is a first-class property

Every capability declares whether its effects are reversible, compensatable, or
irreversible. Irreversible acts can never be assigned to a post-hoc review gate.

### I9 — Demotion is automatic, promotion is human

Trust, permissions and autonomy tighten by machine on evidence of harm, and
loosen only by a human decision on evidence of competence.

### I10 — One authoritative copy

Every business record has exactly one owning system. Everything else — search
index, analytics model, agent memory, channel reference — is a declared
projection, marked as such, and never presented as truth.

### I11 — Declared or it does not exist

*Earned from the `Platform/` analysis — see [P1 forensic §5](platforms/01-graph-portal-platform/01-forensic-analysis.md).*

A capability that is not declared in the registry cannot be invoked. A route
without a declared capability fails at **boot**, not at review. A module whose
manifest declares an object type it does not implement fails registration.

This exists because the single most damaging failure mode observed in the
existing codebase was not bad code — it was **contracts recorded as delivered
capabilities**. Manifests describing modules that do not exist, queue processors
returning `deferred`, and an AI service whose own return value said "wire this up
later", all while planning documents marked the phases complete.

Documentation discipline cannot fix this, because documentation is what failed.
Only the build can. Where implementation status must be expressed, it is
expressed **in the type system**, not in prose — the one practice that codebase
got right (`processor_status: "contract-only"`, `worker_runtime: "not_observable"`).

The corollary, from that project's own June audit: *"do not trust `actor_id` in
any API test — there is no server-side identity, so security tests are
meaningless until auth lands."* An entire suite was asserting on a boundary
nothing enforced. **A test that asserts on an unenforced boundary is worse than
no test**, because it manufactures confidence. Every test we write against an
invariant must first prove the invariant is enforced.

### I13 — Security by primitive

*Adopted from the UXAIOS vision documents.*

Every primitive the platform introduces — object, view, hook, beam, tag, lens,
cell, Garage ingredient, generated app — carries its own permissions, data
boundaries and audit behaviour. There is no category of thing that is "just
presentation" or "just metadata" and therefore exempt.

The corollary is a design test: if a new primitive cannot answer *who may see
this, what may it touch, and what does it record*, it is not ready to exist.

And its companion principle, worth keeping in these words:

> **Compliance produces evidence** — runtime controls and audit trails, not
> paperwork alone.

### I14 — Authority objects are superseded, never edited

*Adopted from `architecture/release-0-edit-flow-contracts.md`, which quietly
encodes a principle its authors may not have named.*

That contract permits editing a user's display name, but **not** deleting a
permission policy or rule; a temporary delegation may only be *revoked* — an
extension requires a new delegation; a portal edge's parent/child cannot be
changed — it requires a new edge; a record policy's object identity cannot be
replaced — it requires a new policy.

Generalised: **anything that grants, bounds or records authority is append-only.**
Charters, delegations, standing approvals, elevations, policies, grade matrices,
lens expressions, capability grants and portal edges are superseded by a new
version, never mutated in place.

The reason is `as_of` ([06 §3.2](06-attribution-and-audit.md)): an audit read must
reconstruct the rules that were in force at the moment of an act. An edited
authority object destroys that history silently, and nothing downstream can
detect the loss.

Corollary for the UI: an "edit" control on an authority object creates a new
version with a diff and an approval. It never overwrites.

### I15 — State a control's real strength

*Adopted from `architecture/knowledge-platform-contract.md`: "**Product honesty:**
protection is deterrence, not DRM. Admin help text must say so."*

Every control the platform offers must describe what it actually enforces, in the
place where it is configured. A governance product that lets an administrator
believe `restricted` is cryptographically enforced when it is advisory has done
something worse than omitting the feature.

Concretely: hold windows say they can be bypassed by a direct database operator;
content protection says it is deterrence; a tag-based knowledge scope says it
filters retrieval and does not encrypt; trust tiers say they are evidence-based
heuristics, not guarantees. **Overstating a control is a defect with the same
severity as a broken one**, because both produce misplaced confidence.

### I12 — Locale and direction are structural, not cosmetic

*Earned from the `Platform/` analysis.*

Every principal, portal, knowledge item, generated document and AI-authored
output carries a locale and a text direction. LTR/RTL is a layout contract from
the first component, not a late theme. Charters declare which languages a worker
is certified to communicate in, and the resolver treats an out-of-certification
language as a denial.

Retrofitting bidirectional text and per-tenant locale into a mature UI is
notoriously expensive, and the existing codebase's decision to seed English,
Swedish and Arabic with direction metadata on day one is one of its better calls.
We inherit it deliberately.

## 4. Consequences we accept

- **The platform is slower to demo and harder to fake.** A governance-first
  product does not produce a wow moment in week two. It produces one in month
  nine when a customer's auditor asks a question and the answer takes four
  seconds instead of four weeks.
- **We will be less capable than a bare agent framework on day one.** That is
  the trade. Bare frameworks cannot be sold into a company that has a finance
  department.
- **Governance must be cheap to operate or it will be switched off.** Every
  control introduced in these documents comes with a mechanism for reducing its
  cost (preflight batching, standing approvals, evidence-based gate removal). A
  control without a fatigue mitigation is an incomplete design.

## 5. Scope discipline

The deep-research report is candid that this concept spans four products, and
the SRS lists twenty-four criteria for functional completeness. The failure mode
is a beautiful skeleton with no working organ.

The counter-strategy has three parts, developed in [01](01-core-architecture.md):

1. A **small kernel** — five services — that everything else plugs into.
2. **One complete vertical slice** proven end to end before breadth.
3. Everything outside the kernel is a **module** behind a provider interface, so
   breadth is additive and reversible rather than structural.

## 6. Decisions register

Provisional decisions taken in these documents. Each is reversible; the cost of
reversal is noted.

| ID | Decision | Where | Reversal cost |
|---|---|---|---|
| D-01 | Autonomy is a single computed decision on a 6-level ordered ladder, not a set of independent flags | [02](02-authority-and-autonomy.md) | High — shapes every call site |
| D-02 | Task grade, capability risk class, data classification, trust tier and budget state are all inputs to that one decision | [02](02-authority-and-autonomy.md) | High |
| D-03 | Trust tier is computed from evaluation and incident evidence; demotion automatic, promotion human | [02](02-authority-and-autonomy.md) | Medium |
| D-04 | The Charter is executable source compiled into runtime grants, not a descriptive document | [03](03-worker-charter.md) | High |
| D-05 | Charters compose Role Template → Department Overlay → Individual → Assignment, and overlays may only narrow | [03](03-worker-charter.md) | Medium |
| D-06 | Humans get Charters too, with AI-only sections absent | [03](03-worker-charter.md) | Low |
| D-07 | Entity hashtags resolve to canonical entities; a tag is a link, not a string | [04](04-context-graph-and-tags.md) | High |
| D-08 | Tags are namespaced, governed per namespace, and never grant access | [04](04-context-graph-and-tags.md) | Medium |
| D-09 | Knowledge is granted to workers by Lens (tag expression), not by enumerating documents | [04](04-context-graph-and-tags.md) | Medium |
| D-10 | Mention intent is explicit or confirmed, never silently inferred from prose | [05](05-addressing-and-mentions.md) | Low |
| D-11 | Mentions carry the mentioner's authority ceiling | [05](05-addressing-and-mentions.md) | Medium |
| D-12 | Hash-chained event log for everything; cryptographic signing for a defined set of consequential acts only | [06](06-attribution-and-audit.md) | High |
| D-13 | The org model is a **typed graph of portals**, not a flat department tree — adopted from `Platform/` | [01](01-core-architecture.md) | High |
| D-14 | Authority ceilings are **inherited down the org graph**, not only granted per principal | [02](02-authority-and-autonomy.md) | Medium |
| D-15 | Capability declaration is verified at boot; undeclared acts are unreachable | [01](01-core-architecture.md) | Low |
| D-16 | Locale and text direction are kernel concerns carried by every principal and object | [01](01-core-architecture.md) | High if deferred |
