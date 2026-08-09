# 04 — Context Graph & Knowledge Hashtags

**Status:** provisional
**Implements:** Idea 3 — hashtags injectable into knowledge pieces, database
records and documents, tying content across the platform and subsystems together
by context, forming ad-hoc sub-knowledge-bases for workers, humans and reporting.

---

## 1. The core move

Hashtags are the right *interface*. Typing `#project/atlas` is something a person
will actually do; maintaining a taxonomy in an admin screen is not.

But a hashtag as a **string** creates a swamp within a quarter — `#customer`,
`#customers`, `#Customer`, `#cust`, all meaning the same thing and none of them
connected to the actual customer record. And free-text tags on confidential
content create an information-leak channel that is easy to miss.

**So: hashtags are the user-facing syntax of a typed context graph.**

```text
what the user types          what the system stores
──────────────────          ──────────────────────
#customer/acme        ───►  edge to Canonical Entity  ent:org:acme
                            (which maps to ERP 4412, CRM a_9x1, workspace ws-88)
#topic/pricing        ───►  edge to Concept          tag:topic/pricing
#project/atlas        ───►  edge to Context          ctx:project/atlas
#reg/gdpr             ───►  edge to Concept (regulatory namespace)
#lifecycle/superseded ───►  control tag (affects retrieval, not meaning)
```

This single decision — **an entity tag is a link, not a string** — is what makes
the whole idea work. It unifies Idea 3 with the canonical-entity service the
deep-research report already called for, and it means tagging is not a parallel
metadata system but the *human input method* for the platform's connective tissue.

## 2. Model

### 2.1 Canonical entities

The substrate. One real-world thing; many system-specific identifiers.

```yaml
canonical_entity:
  id: ent:org:acme
  type: organisation           # organisation|person|asset|product|contract|case|place
  display: "Acme Industries AB"
  identifiers:
    org_number: "556677-8899"
  external_mappings:
    - { system: erp,  type: Customer, id: "4412" }
    - { system: crm,  type: Account,  id: "a_9x1" }
    - { system: docs, type: Space,    id: "ws-88" }
  merged_from: []              # entity resolution history
  classification: internal
```

When a provider is replaced, the entity persists and its mapping changes. Tags,
lenses, charters, reports and knowledge grants all keep working. This is the
mechanism that makes "replaceable providers" more than a slogan.

### 2.2 Tags

```yaml
tag:
  id: tag:topic/credit-policy
  namespace: topic
  slug: credit-policy
  label: "Credit policy"
  aliases: ["credit terms", "payment terms policy"]
  type: concept                # entity|concept|context|control|sensitivity
  entity_ref: null             # set for type=entity
  broader: [tag:topic/finance-policy]
  narrower: [tag:topic/credit-limits]
  related: [tag:reg/consumer-credit]
  governance: curated          # open|curated|closed
  status: active               # proposed|active|deprecated
  redirects_to: null
  name_classification: internal  # is the tag's *existence* sensitive?
  owner: role:finance-policy-owner
  description: "Rules governing credit terms offered to customers"
```

### 2.3 Namespaces

Namespaces give type-safety and prevent collisions while still reading as a flat
hashtag. Each namespace has its own governance mode.

| Namespace | Type | Governance | Example |
|---|---|---|---|
| `customer/` `supplier/` `person/` `asset/` | entity | closed — created only by entity resolution | `#customer/acme` |
| `project/` `case/` `incident/` `campaign/` | context | curated — created with the context | `#project/atlas` |
| `topic/` | concept | curated with emergent tier | `#topic/pricing` |
| `dept/` `team/` `role/` | org | closed — mirrors the org model | `#dept/finance` |
| `reg/` | concept | closed — from the regulatory register | `#reg/gdpr` |
| `sensitivity/` | control | closed | `#sensitivity/restricted` |
| `lifecycle/` | control | closed | `#lifecycle/superseded` |
| `x/` | free | open — anything, promotable | `#x/friday-ideas` |

**Governance modes:**
- **open** — anyone creates; tags land in `x/` and can be promoted after use.
- **curated** — anyone *proposes*; a namespace owner approves; proposals are
  visible and usable immediately but marked provisional.
- **closed** — created only by the system or a named owner.

The `x/` namespace is deliberate. People will invent tags; giving that energy a
legitimate, clearly-marked home is better than either forbidding it (people
invent tags anyway, in the wrong namespace) or allowing free creation everywhere
(the swamp). Promotion from `x/` to a governed namespace is a one-click curation
action with usage statistics attached.

### 2.4 Taggings

The edge. Where the actual connective work happens.

```yaml
tagging:
  tag: tag:topic/credit-policy
  target:
    ref: obj:knowledge/kb-4471#section-3   # or a canonical object reference
    system: native                          # native|erp|crm|docs|...
  applied_by: ai:nora
  source: ai_suggested       # human|ai_suggested|rule|inherited|imported
  confidence: 0.82
  status: proposed           # proposed|active|rejected
  context: msg:9931          # where it was applied, if from free text
  created: 2026-08-08T10:12Z
  expires: null
```

**Cross-subsystem tagging works without touching subsystem databases.** The
tagging references the object through the canonical reference; the ERP never
learns it has been tagged. This is what makes the promise "tags tie content
together across subsystem databases" actually deliverable rather than requiring
schema changes in software we do not own.

### 2.5 Beams — relationships as first-class objects

*Adopted from the UXAIOS documents in `Platform/documentation`.*

A tag says *what something is about*. A **beam** says *how two things relate*. It
is a typed, permissioned, navigable object in its own right — not a foreign key
and not an inference.

```yaml
beam:
  id: bm-3391
  type: evidence            # see below
  from: obj:report/rep-8812#claim-3
  to:   obj:erp/invoice/4412
  direction: directed       # directed | mutual
  strength: authoritative   # authoritative | supporting | contradicting | weak
  created_by: ai:nora
  source: derived           # human | derived | rule | imported
  classification: internal
  valid_from: 2026-08-08
  valid_to: null
```

| Beam type | Meaning |
|---|---|
| `evidence` | This claim rests on that source |
| `dependency` | This cannot proceed until that resolves |
| `flow` | Work, value or data moves from here to there |
| `causation` | That happened because of this |
| `derivation` | This was produced from that |
| `supersession` | This replaces that |
| `contradiction` | These two cannot both be true |
| `navigation` | These are worth traversing between |

Three reasons beams earn their place rather than being over-engineering:

- **`evidence` beams make `evidence_required` enforceable.** A capability
  declaring `evidence_required: true` ([02 §4](02-authority-and-autonomy.md))
  cannot complete unless its output carries evidence beams to real sources. The
  ledger checks for the beams, not for a prose citation.
- **`contradiction` beams give knowledge conflicts (SRS FR-125) a home.** New
  information that conflicts with approved knowledge creates a contradiction beam
  rather than silently overwriting — which is exactly what FR-125 requires and
  what a tag cannot express.
- **They make relationship search (SRS FR-332) real.** "Customer → meetings →
  contracts → projects → tasks → responsible employees" is beam traversal,
  permission-filtered at each hop.

Beams obey the same invariants as taggings: **a beam never grants access** (I7),
and an AI-created beam into a scope the worker cannot see is refused.

## 3. Security invariants

These are the reason to design this carefully rather than shipping a tag column.

### T1 — A tagging never grants access

Per invariant **I7**. Tag queries filter *within* what the actor can already see.
Two people running the same lens see different result sets and neither is told
that the other's results exist.

### T2 — AI-applied tags cannot widen reachability

If an AI worker could tag a document into a scope it holds, it could grant itself
access to anything it can see once. Therefore: taggings created by an AI worker
are `proposed` in any namespace used for access-relevant lenses, and a proposed
tagging is invisible to lens-based knowledge grants until confirmed.

### T3 — Tag names are themselves classified

`#project/atlas` may be innocuous. `#project/acquisition-of-competitor-x` is a
disclosure. Every tag carries `name_classification`; autocomplete, tag clouds,
counts and "related tags" are all filtered by it. A tag whose *existence* is
restricted does not appear in suggestions to unauthorised actors.

### T4 — No count leakage

Facet counts, "N documents tagged", and result-set sizes are computed
post-filtering. A count is a covert channel and is treated as data.

### T5 — Denials beat grants

A `denied_tags` entry in a Charter overrides every lens grant, unconditionally
and without exception ordering.

## 4. Lenses — hashtags become sub-knowledge-bases

This is the payoff of Idea 3, and it is what connects it to the Charter.

```yaml
lens:
  id: lens:customer-payment-context
  name: "Customer payment context"
  expression: >
    (#topic/credit-policy OR #topic/payment-terms OR #topic/dunning)
    AND NOT #lifecycle/superseded
    AND NOT #topic/legal-dispute
  entity_binding: dynamic          # binds to the customer in the current context
  purpose: [retrieval, grant, report]
  materialisation: live            # live|cached(ttl)|snapshot
  owner: role:finance-policy-owner
  classification_ceiling: confidential
```

A lens is:

- a **retrieval scope** for AI workers — this is how Charters grant knowledge
  ([03 §7](03-worker-charter.md)), rather than by enumerating documents, which is
  unmaintainable after week two;
- a **saved search** for humans;
- a **report and dashboard filter**;
- a **channel binding** — a room can be bound to a lens so relevant material
  surfaces in it;
- a **context assembly input** — what the platform gathers before a worker starts
  (SRS FR-160/FR-161: minimum necessary context becomes computable rather than
  aspirational).

### 4.1 Dynamic binding

`entity_binding: dynamic` is what makes lenses reusable. One lens definition —
*"payment context for the customer I am working on"* — resolves differently per
task. Without it, every lens is per-customer and there are ten thousand of them.

```text
lens:customer-payment-context  +  task context {customer: ent:org:acme}
     ↓
resolves to: (#customer/acme) AND (#topic/credit-policy OR ...) AND NOT ...
```

### 4.2 Lenses are grantable and auditable

Granting `lens:X` to a worker is a capability-grade act: it appears in the
Charter, requires the same approval as other knowledge grants, and is logged.
Changing a lens's *expression* is therefore a permission change affecting every
worker granted it — so lens edits carry an impact analysis listing affected
workers, and widening edits require approval from everyone who would be affected
being at least notified. **A lens edit is a permission edit.** Missing this would
be a serious security hole, because it would let a lens owner silently widen a
dozen workers' access.

### 4.3 Knowledge Cells — what a Lens becomes

*Adopted from `platform-foundation-brainstorm.md`, and the single most valuable
idea recovered from the existing documentation.*

A Lens is an expression. It is correct and abstract, and nobody navigates an
expression. A **Knowledge Cell** is what a Lens becomes when it is given
identity, persistence and views:

```yaml
knowledge_cell:
  id: cell:customer-health/acme
  lens: lens:customer-360            # the scope that defines it
  bound_entity: ent:org:acme         # dynamic binding resolved

  contents:                          # all permission-filtered, all derived
    metrics:        [dso, open_tickets, renewal_probability, ai_spend]
    dimensions:     [time, product_line, region]
    relationships:  [beams in and out of the bound entity]
    documents:      [everything the lens resolves to]
    conversations:  [channels, mentions, decisions in scope]
    embeddings:     [the retrieval index for this scope]
    actions:        [capabilities invocable in this context]

  views: [summary, timeline, graph, table, chart, brief, chat]
  refresh: on_source_change
```

**The inversion that matters.** Conventional tools make the *dashboard* the
primary object, containing charts, KPIs and tables. Here the **cell** is the
primary object and charts, KPIs, documents, reports and briefs are *views of it*.
Users navigate between cells, not between dashboards.

This collapses three things our SRS treats as separate features into one
primitive:

| SRS area | Becomes |
|---|---|
| Knowledge bases (FR-120…126) | A cell's documents and embeddings view |
| Dashboards (FR-300…303) | A cell's metrics view |
| Reports (FR-310…313) | A cell's narrative view, with evidence beams |
| Project brain (FR-550), customer context (FR-560) | A cell bound to that entity |
| Context assembly (FR-160/161) | The cell *is* the assembled context |

That last row is the important one. **A Knowledge Cell is what an AI worker is
given when it starts work** — which means "minimum necessary context" stops being
an aspiration and becomes a computed, inspectable, permission-filtered object
that a human can look at before the work begins.

Cells are cheap because they are derived: a cell is a lens plus a binding plus a
view set. Creating one for every customer, project, case and supplier is a
registration, not a build.

### 4.4 Refresh and auto-sync

*From the same source: knowledge bases that "auto-update when the underlying
source content changes".*

```yaml
refresh:
  mode: on_source_change      # live | on_source_change | scheduled | snapshot
  sources: [erp.invoice, crm.activity, knowledge.*, beams.*]
  debounce: 5m
  on_change: [reindex, invalidate_views, notify_subscribers]
  snapshot_on: [report_published, decision_recorded]
```

`snapshot_on` is the subtle one. A published report must keep the cell state it
was written from, or its evidence links rot as the underlying data moves. Live
cells for working; snapshots for anything that gets sent, signed or filed.

### 4.5 One rule about views

*Adopted from `architecture/knowledge-platform-contract.md`: "Switching mode
changes presentation only — not data or permissions."*

**A view never changes what data exists or who may see it.** Switching a cell
from table to graph to brief to chat changes rendering and nothing else. The same
actor sees the same facts through every view, and no view is a privileged path to
data another view would hide.

Stated because the opposite is a natural and dangerous shortcut: a "summary" view
that quietly aggregates across records the viewer cannot open individually is an
inference channel, and it is exactly how a permission model leaks through its own
reporting layer. Aggregates obey the same filter as the rows beneath them (**I7**).

## 5. Tagging in practice

### 5.1 Where tags come from

| Source | Mechanism | Trust |
|---|---|---|
| **Typed inline** | `#` in any text field, message, comment, document, task | Human, immediate |
| **Chip UI** | Tag picker on any object | Human, immediate |
| **Inherited** | Object in a project inherits `#project/x`; record for a customer inherits `#customer/acme` | Rule, immediate, non-removable at the child |
| **Rule-derived** | "invoices over €10,000 get `#topic/high-value`" | Rule, immediate |
| **AI-suggested** | Classification of content on ingest or edit | Proposed, needs confirmation for governed namespaces |
| **Imported** | From a subsystem's own categories at connector level | Mapped, marked as imported |

### 5.1a Provenance rank — derived never overwrites chosen

*Generalised from `knowledge-platform-contract.md`'s icon rule: randomised
assignment "never overwrites `icon_source: 'manual'`".*

A small rule with wide application. Every derived value — tag, beam, AI field,
classification, grade, icon, summary — carries a provenance rank, and a lower
rank can never overwrite a higher one:

```text
manual  >  approved  >  rule  >  inherited  >  derived/ai
```

A human choice is never silently replaced by a rule, and a rule is never silently
replaced by a model. Lower-rank sources may *propose* — surfacing as a suggestion
with a diff — but the write is refused.

This extends beyond tags to **AI-generated field values** (SRS FR-500/501): an AI
worker recomputing a risk score may not overwrite one a human set, and the
provenance rank is what makes FR-501's "identifiable as AI-generated" mechanical
rather than a display convention.

### 5.2 Autotagging discipline

AI suggestion is where the value is — nobody tags ten thousand documents by hand
— and where the risk is. Rules:

- Suggestions above a confidence threshold in `open` namespaces apply directly,
  marked `ai_suggested`, and are always removable.
- Suggestions in `curated`/`closed` namespaces are `proposed` and enter a review
  queue, batched by tag rather than by document (reviewing "these 340 documents
  look like `#topic/credit-policy`, confirm?" is tractable; reviewing 340
  documents individually is not).
- Per **T2**, proposed taggings do not affect lens-based grants.
- Suggestion quality is measured (confirm rate per tag) and low-performing rules
  are disabled automatically.

### 5.3 Vocabulary maintenance

- **Merge** — `#topic/pricing` absorbs `#x/prices`; the deprecated tag redirects,
  existing taggings are rewritten, queries keep working.
- **Deprecate, never delete** — per **R4**; deletion breaks saved lenses silently,
  which is the worst possible failure mode for a governance system.
- **Split** — a tag grown too broad splits with an AI-assisted reclassification
  proposal over its existing taggings.
- **Health metrics** — orphan tags, near-duplicate detection, tags with a single
  use, tags never used in a lens, tags whose confirm rate is collapsing.

## 6. Retrieval

Tags are one signal, not the whole retrieval system.

```text
query + actor + context
        │
        ├─ lens resolution        →  candidate scope (tags, entities, contexts)
        ├─ permission filter      →  what this actor may see            [I7]
        ├─ lexical search         →  keyword match within scope
        ├─ vector search          →  semantic match within scope
        ├─ graph expansion        →  entity neighbours, N hops, permission-filtered
        └─ freshness/lifecycle    →  demote #lifecycle/superseded, expired, low-confidence
                │
                ▼
        ranked, permission-safe, attributable results
```

The important ordering property: **the permission filter is applied to the
candidate scope, not to the final results**. Filtering at the end leaks through
ranking, counts and pagination.

Every retrieved item carries its provenance to the worker: source, classification,
freshness, confidence, and whether it is authoritative or a projection (**I10**).
A worker reading a stale CRM projection is told so, which is the difference
between a report that is wrong and a report that is wrong *and confident*.

### 6.1 The citation triple

*Adopted from `AI-FIRST-PLATFORM-POLICY.md` §2.*

Every groundable record carries three fields that make a citation verifiable
rather than decorative:

```yaml
source_type: erp_record | document | web_page | conversation | derived
locator:     stable address within the source (record id, page, section, offset)
content_hash: hash of the cited content at citation time
```

`content_hash` is the one that earns its keep. It detects when **a cited source
has changed since it was cited** — so a report whose evidence has silently moved
is flagged rather than quietly becoming wrong. Combined with `evidence` beams
([§2.5](#25--beams--relationships-as-first-class-objects)), this gives us:

- an act with `evidence_required` cannot complete without real, resolvable
  citations;
- a stale citation is detectable at read time, not discovered in an audit;
- "show me the data behind this claim" (SRS FR-312) resolves to an exact
  locator, not a document name.

## 7. Reporting and intelligence

Tags give the reporting layer a dimension that no subsystem schema provides,
because it crosses all of them.

- *"Everything connected to `#customer/acme` in the last quarter"* — spanning ERP
  invoices, CRM activities, documents, tasks, decisions, worker actions.
- *"All work touching `#reg/gdpr`"* — a compliance view assembled from tags rather
  than from a compliance module nobody maintains.
- *"Knowledge freshness by `#topic/`"* — which areas of company knowledge are
  going stale (SRS FR-126, FR-640).
- *"Cost by `#project/`"* — AI spend attributed through context rather than
  through a separate cost-centre taxonomy (SRS FR-650).

Every one of these is permission-filtered per asker (SRS FR-322), which means two
executives can run the same report and legitimately see different numbers. The
report must state its own scope: *"within what you can access."*

## 8. UX

- **`#` anywhere.** Autocomplete grouped by namespace, showing label, usage count
  (permission-filtered), and for entity tags the resolved record.
- **Tag chips** carry their type as colour and their namespace as prefix, so
  `#customer/acme` visibly differs from `#topic/pricing` at a glance.
- **Hover a chip** → what it is, who owns it, how many lenses use it, related tags.
- **Every object shows inherited vs. applied tags separately**, so it is obvious
  which came from context and which someone chose.
- **Lens builder** is a saved search that anyone can create from a result set —
  *"save these filters as a lens"* — with a governance step only when the lens is
  used for granting.
- **Provenance is visible**: AI-suggested tags render differently until confirmed,
  with one-click confirm/reject inline.

## 9. Open points

- **Entity resolution quality.** `#customer/acme` only works if the platform knows
  Acme Industries AB and ACME AB are the same organisation. Entity resolution is
  a genuine subsystem (matching, merge, split, confidence, manual override) and it
  is currently under-specified here.
- **Tag explosion in `x/`.** Needs a decay policy — unused `x/` tags age out.
- **Multilingual tags.** Aliases carry synonyms, but a Swedish user typing
  `#prissättning` should reach `#topic/pricing`. Alias-per-locale is probably
  enough; needs confirming against the platform's multilingual requirements.
- **Performance.** Lens resolution inside the permission filter on every retrieval
  is the hottest path in the system. Materialisation strategy (live vs. cached vs.
  snapshot) needs real numbers before the design is trustworthy at scale.
