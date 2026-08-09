# Working Notes — `Platform/documentation` review

Running notes taken while reading the existing platform's documentation, focused
on **ideas** (regardless of whether they were implemented). Integration decisions
are recorded in [CHANGELOG.md](../../CHANGELOG.md); this file is the raw capture,
including things we decided *not* to take and why.

Structure: one section per batch. `→` marks something integrated into our docs.

---

## Batch B — Vision & policy

**Read:** `uxaios/VISION.md` · `uxaios/ARCHITECTURE.md` ·
`AI-FIRST-PLATFORM-POLICY.md` · `vision-and-some/platform-foundation-brainstorm.md` ·
`agent-analysis/PLATFORM-MASTER-UNDERSTANDING.md`

### B1 — The Knowledge Cell ★★★ (the standout idea in the entire doc set)

From `platform-foundation-brainstorm.md`. Conventional BI makes the *Dashboard*
the primary object, containing KPIs, charts, tables and filters. The proposal
inverts this:

```text
Knowledge Cell {
  metrics · dimensions · relationships · documents
  conversations · embeddings · actions
}
```

Charts, KPIs, documents, forms and graphs become **views of the cell**, not the
primary objects. Users navigate *between cells*, not between dashboards.

**Why this matters to us:** it is the missing materialised form of our **Lens**.
Our [04](../../04-context-graph-and-tags.md) defines a Lens as a saved tag expression
resolving to a scope — correct but abstract. A Knowledge Cell is what that scope
*becomes* when it is given identity, views and actions. It also unifies three
things our SRS treats separately: knowledge bases, dashboards, and reports.

→ **Integrated** into [04](../../04-context-graph-and-tags.md) §4.3.

### B2 — The Garage (Components Studio) ★★★

"The kitchen containing every ingredient needed to build anything in the system.
Everything built here first and reused everywhere else." Widget types, container
types, beam types, functions, triggers, actions, transitions, animations.

Stated principles: build once / update once reflects everywhere / modules stop
being islands / accelerates growth exponentially. Plus, from the same document's
own "additional ideas": ingredient catalog and living style guide, semantic
versioning with a deprecation path, visual regression testing per ingredient
(widest blast radius in the system), and AI agents that create new ingredients.

**Why this matters:** our SRS specifies an app builder (FR-270…283) and
micro-apps (FR-280…283) but never says *what they are assembled from*. The Garage
is that answer, and "declarative apps built from safe platform components"
(FR-272) is exactly a Garage with a governance boundary.

→ **Integrated** into [01](../../01-core-architecture.md) §3.2.

### B3 — Packs ★★

From the Assets Store section: "a set of spaces packed together; a pack can form
a CRM, an ERP, a module." A deployable bundle of composed structure.

This is our **Industry Pack** (SRS FR-410), made concrete and given a delivery
mechanism. It also gives Industry Packs a natural distribution story we lacked.

→ **Integrated** into [01](../../01-core-architecture.md) §6.1 (Phase 4) and noted for
the compiler.

### B4 — Beams: relationships as first-class objects ★★

From UXAIOS: a **Beam** is a typed relationship — flow, dependency, **evidence**,
navigation — that is itself an object with identity, permissions and rendering,
not merely a foreign key.

Our context graph has tags and canonical entities but treats relationships as
implicit. Making them first-class and typed gives us: evidence links from a claim
to its source, dependency edges between tasks and goals, and a navigable
structure for the "relationship search" the SRS asks for (FR-332).

→ **Integrated** into [04](../../04-context-graph-and-tags.md) §2.5.

### B5 — Flow Trace ★★

Click a relationship → trace the flow through the graph → switch to a "river
view" layout showing the whole chain. Implemented as
`trigger → event → capability (policy-checked) → scene switch → audit event`.

This is the *visualisation* our attribution chain has been missing. [06](../../06-attribution-and-audit.md)
§3 describes `cor-4471` as a text tree; Flow Trace is what it should look like,
and it is the demo that sells the governance model.

→ **Integrated** into [06](../../06-attribution-and-audit.md) §3.

### B6 — `as_of` temporal reads ★★

From `AI-FIRST-PLATFORM-POLICY.md` §2: "`created_at`, `updated_at`; use `as_of`
for governance reads."

We record `charter_version` in the attribution chain, which answers *what the
worker was*. `as_of` generalises it: **what did every rule say at the moment this
act occurred?** Without it, replaying an audit a year later evaluates it against
today's policy, which is wrong and, for a regulated customer, indefensible.

→ **Integrated** into [06](../../06-attribution-and-audit.md) §3.

### B7 — The citation triple ★★

`source_type` · `locator` · `content_hash` as retrieval-friendly provenance
fields on every groundable record.

`content_hash` is the valuable one: it detects when a cited source has *changed
since it was cited*. A report whose evidence has silently moved is worse than one
with no evidence, and this is a cheap mechanism for catching it.

→ **Integrated** into [04](../../04-context-graph-and-tags.md) §6.1.

### B8 — Knowledge bases with auto-sync ★★

From the AI Architecture section: users generate knowledge bases from internal
content, external systems, APIs, documents or conversations, and these
**auto-update when the underlying source changes**.

Our Lens has `materialisation: live | cached | snapshot` but no notion of
source-change-driven refresh.

→ **Integrated** into [04](../../04-context-graph-and-tags.md) §5.

### B9 — Micro-AI dataset slicing ✓ validates our design

The brainstorm's core AI question: "the main database will be huge, while the
micro-AIs need specific slices... splitting separate dataset-like knowledge bases
per micro-AI."

This is precisely our Charter granting knowledge **by Lens** rather than by
enumeration ([03 §7](../../03-worker-charter.md)). Independent arrival at the same
design — no change needed, confidence raised.

### B10 — The five-layer visualisation model ★

KPI ("what is happening") → Analytical ("why") → Relationship ("what connects to
what") → Multidimensional ("across dimensions") → Spatial Knowledge ("where am I
inside the information"), with the observation that layers 4–5 are essentially
greenfield across the industry.

Useful framing for our dashboards/reporting scope, and an honest signal about
where effort is disproportionate. Layers 1–3 are commodity; 4–5 are research.

→ Noted in [07](../../07-open-questions.md); **not** adopted as scope.

### B11 — Lifecycle-bound capability registration ★★

`ModuleAiBridgeService` registers a module's tools on activation and **removes
them on deactivation**. Capabilities appear and disappear with module state
rather than being permanently present once declared.

Important for us: a disabled module's capabilities must vanish from every
Charter's effective grant set, and workers holding them must be recompiled.

→ **Integrated** into [01](../../01-core-architecture.md) §3.1.

### B12 — Principles worth stealing verbatim ★

- **"Security by primitive"** — every primitive carries permissions, data
  boundaries and audit behaviour. No primitive is exempt.
- **"Compliance produces evidence — runtime controls and audit trails, not
  paperwork alone."**
- **"Graph first, renderer second."**
- **"Do not store a competing graph"** — validates our I10.
- **"Modules never call each other directly; the kernel mediates."** — validates
  our kernel contract.
- **"Localization is structural"** — independently validates the I12 we added in
  Batch A, which is a good sign we were right to add it.

→ First two **integrated** into [00](../../00-product-thesis.md).

### B13 — EU regulatory mapping ★★

`AI-FIRST-PLATFORM-POLICY.md` §6 maps GDPR-adjacent obligations to concrete
platform behaviours: lawful basis tied to actor and audited purpose; data
minimisation via declared tool permissions; storage limitation via retention and
purge jobs; accountability via audit and approval ledger; cross-border transfer
via `data_residency` and `policy_tags` on the provider registry; human oversight
via approval paths. Plus the useful default: **external providers default to
`evaluation` status until explicitly enabled.**

Our [07](../../07-open-questions.md) Q9 defers this to legal review. This gives the
review a structure to react to instead of a blank page.

→ **Integrated** into [07](../../07-open-questions.md) Q9.

### B14 — Lessons, not features ★★

From `PLATFORM-MASTER-UNDERSTANDING.md`, written by an agent auditing the same
codebase in June:

- *"`pnpm typecheck` passing does not mean shippable"* — build and validation
  failed for independent reasons.
- *"Several completion checkboxes in cookbook/foundation are stale."*
- *"Do not trust `actor_id` in any API test — there is no server-side identity;
  security tests are meaningless until auth lands."* A whole test suite was
  proving nothing.

The third is the sharpest: **a test that asserts on an unenforced boundary is
worse than no test**, because it produces confidence. Directly reinforces I11.

→ **Integrated** as a note in [00](../../00-product-thesis.md) I11.

### Deliberately not taken

| Idea | Why not |
|---|---|
| **UXAIOS spatial/3D interface** (Spaces, Containers, Scenes, Composition DNA, teleports, WebXR) | A large, unproven UI research programme. Our product is decided by governance and the compiler, not by 3D navigation. The *concepts* worth keeping — beams, flow trace — are extracted above; the surface model is not. |
| **Skins / themes / space templates** | Real for white-label multi-tenant, but presentation-layer and safely deferred. Recorded for later. |
| **OLAP cubes / hypercube explorers** | Layer 4–5 research. Not a differentiator for us. |
| **Assets Store as commerce** | Packs yes, marketplace/ecommerce no — far beyond current scope. |
| **Named skin families** (Glassy, Neumorphism, …) | Presentation detail. |

---

## Batch C — Architecture contracts (`architecture/`, 18 documents)

**Read in full:** `module-integration-and-ai.md` · `module-loader-contract.md` ·
`integration-extension-contract.md` · `release-0-edit-flow-contracts.md` ·
`knowledge-platform-contract.md` · `knowledge-cell-contract.md` ·
`garage-ingredient-types.md` · `ui-portability-tags.md` · `auth-session.md` ·
`theme-stack-composition.md` (slot model)
**Skimmed as operational, not idea-bearing:** `deployment-operations.md` ·
`local-stack.md` · `ci-release-gate.md` · `readiness-and-health.md` ·
`observability.md` · `performance-and-observability.md` · `release-0-foundation.md`

This is the strongest cluster in the entire documentation set. Where the vision
documents were imaginative, these are rigorous.

### C1 — Kernel-as-intermediary, enforced by a test ★★★

An explicit allowed/forbidden table for module integration — no cross-module
imports, no cross-module HTTP, only events, hooks, declared dependencies and
governed capabilities — **enforced by `module-boundaries.test.ts` which fails the
build**, with the forbidden import written into the document as an anti-pattern.

The generalisable principle: **an architectural rule without an enforcing test is
a preference.** Every invariant in [00](../../00-product-thesis.md) needs one.

→ **Integrated** into [01 §3.4](../../01-core-architecture.md).

### C2 — Module lifecycle with precise surface semantics ★★★

`installed` (migrations applied, nothing active) → `enabled` (surfaces live) →
`disabled` (surfaces withdrawn, data retained) → `uninstalled` (surfaces gone,
**installation ledger and audit history retained**).

`installed ≠ enabled` is the valuable distinction, and the shape is identical to
our AI worker lifecycle: created but inactive until onboarding passes; offboarded
by revoking access while preserving history. Same discipline, two domains.

→ **Integrated** into [01 §3.3](../../01-core-architecture.md).

### C3 — The staged installation pipeline ★★★

Offline preflight → authority gate → state gate → schema validation → file
validation with checksums → dependency gate → atomic transaction → separate
enable. Fail-fast with named failure codes and a documented rollback table.

Two details worth taking:

- **Stage 0 statically inspects source** for audit-boundary compliance and
  repository-only database access. Architecture enforced by tooling.
- **Post-commit work is explicitly best-effort**, database is truth on restart,
  in-memory registries are caches and never authority.

The same shape applies to Pack installation and Charter compilation.

→ **Integrated** into [01 §3.3](../../01-core-architecture.md).

### C4 — Authority objects are superseded, never edited ★★★

`release-0-edit-flow-contracts.md` encodes a principle it never names. Display
names are editable; permission policies and rules **cannot be deleted**;
delegations are **revoke-only** and extension requires a new delegation; a portal
edge's parent/child cannot change — it requires a new edge; a record policy's
object identity cannot be replaced — it requires a new policy.

Generalised: anything that grants, bounds or records authority is append-only.
This is what makes `as_of` (B6) possible — an edited authority object destroys
history silently and nothing downstream can detect the loss.

→ **Integrated** as invariant **I14** in [00 §3](../../00-product-thesis.md).

### C5 — Product honesty about control strength ★★

"**Product honesty:** protection is deterrence, not DRM. Admin help text must say
so." Stated in the admin UI, not buried in documentation.

For a governance product this generalises into an obligation: overstating a
control is a defect of the same severity as a broken one, because both produce
misplaced confidence.

→ **Integrated** as invariant **I15** in [00 §3](../../00-product-thesis.md).

### C6 — The mutation ordering rule ★★

validate → resolve authority → persist change → **append audit in the same
transaction** → commit → emit domain event after commit. A failed audit fails the
mutation. The event bus sits outside the transaction and subscribers are
best-effort.

Plus the test discipline: prove the audit event persists *before* fanout, and
prove explicit deny blocks **every** mutation path, not a representative one.

→ **Integrated** into [06 §3.3](../../06-attribution-and-audit.md).

### C7 — The connector manifest ★★

More complete than the connector contract sketched in our own deep-research
report. Adds `direction`, `auth_type`, `required_secrets` (**names only**),
webhook `replay_window_seconds`, sync `idempotency_key_required`, `rate_limit`,
`retry_policy`, non-destructive `health_check`, and **required** audit event types
for connect/webhook/sync/failure/disconnect.

Plus the webhook rules: verify against the **raw** body, reject outside the replay
window, persist the idempotency key **before** any side effect, audit inside the
transaction.

→ **Integrated** into [01 §3.5](../../01-core-architecture.md).

### C8 — Module versus thin extension ★

Full module when the platform owns records, workflows, permissions, views,
reports or capabilities; thin extension when it only connects to an external
provider. **"Default to full modules until a concrete integration proves the
thinner shape is sufficient."** Good instinct — the lighter contract is the one
that gets abused.

→ **Integrated** into [01 §3.5](../../01-core-architecture.md).

### C9 — The slot registry pattern ★★

Platform owns stable semantic slot IDs; skins and templates *contribute to*
registered slots and never invent ad hoc keys. Adding a variant is a
registration, never an edit to the consumer. The anti-pattern is written out:

```text
❌  if (skin === "glassy") { ... } else if (skin === "neumorphism") { ... }
```

Which is the same disease as `if (principal.type === 'ai')` in our **I2** — a
pleasing confirmation that the instinct generalises across layers.

→ **Integrated** into [01 §3.2](../../01-core-architecture.md).

### C10 — Views change presentation only ★★

"Switching mode changes presentation only — not data or permissions."

Critical for Knowledge Cell views. The opposite is a natural shortcut and a real
leak: a summary view that aggregates across records the viewer cannot open
individually is an inference channel.

→ **Integrated** into [04 §4.5](../../04-context-graph-and-tags.md).

### C11 — Derived never overwrites chosen ★★

From the icon rule: randomised assignment "never overwrites
`icon_source: 'manual'`". Generalises to a provenance rank —
`manual > approved > rule > inherited > derived/ai` — where a lower rank may
propose but never write over a higher one.

Applies well beyond tags, notably to AI-generated field values (SRS FR-500/501),
where it makes "identifiable as AI-generated" mechanical instead of a display
convention.

→ **Integrated** into [04 §5.1a](../../04-context-graph-and-tags.md).

### C12 — Registry hydrated from declarations ✓ validates our design

"On startup the registry rebuilds the tool registry from enabled modules'
declarations. **No separate tool table is required for correctness.**"

Identical in spirit to Charter → Grant Set compilation: the derived artefact is
rebuilt from the declaration, so it cannot drift. Independent arrival.

### C13 — UI portability tags ★

Every UI file declares `portable | garage-candidate | path1-only | spatial-only`
in a code annotation, with the rule that **permission checks, API clients and
validation are always shared** and only *presentation* files may be surface-bound.

Useful discipline for us — we will have admin, end-user portal, embedded app and
eventually mobile surfaces. The `garage-candidate` tag is a nice touch: a
documented intent-to-promote from bespoke to catalogued.

→ Recorded; adopt when a second UI surface exists. Not integrated yet.

### Observations

**`auth-session.md` is a study in honest incrementalism.** It documents a
header-based identity seam, lists precisely what it validates (actor exists, is
active, tenant matches, portal membership exists), and ends with "Not production
auth yet" and a two-item list of what is missing. This is the right way to ship a
temporary seam — and the reason the current documentation is trustworthy where
the June documentation was not.

**The `formalize-platform-audit/` references** point to a directory outside
`documentation/` (blueprints for knowledge spaces and a plugin forensic audit).
Noted; outside this review's scope unless it turns out to matter.

---

## Batch D — Feature inventory, page map, spec batches 01–06

**Read:** `PLATFORM-FEATURE-INVENTORY.md` (product model, permission catalogue,
Patch 4 gaps) · `PLATFORM-FEATURE-SPECS-BATCH-05.md` §3.5 (AI governance
backbone) · structure and headings of batches 01–06 and `PLATFORM-PAGE-MAP.md`.

Batches 01–02 respecify the Phase A kernel already analysed from source; 03–04
are the UXAIOS spatial surface (declined in B); 06 is page flows. The signal is
concentrated in the inventory's product model and Batch 05's AI section.

### D1 — "Access is not admin pages vs guest pages" ★★★

> "All product functions live on **normal pages**. Whether a user can open a page
> or press a button is decided by **permissions**, not by routing people into
> separate admin portals."

Plus two supporting corrections the document makes against its own earlier page
map: workbenches are **temporary operator tools**, not a permanent tier; and the
permissions catalogue is a **first-class product area**, not a table appendix.

This is the UI expression of our I1/I2 and we did not have it stated. It is also
what makes the human/AI symmetry visible to a user rather than merely true in the
data model.

→ **Integrated** as invariant **I1a** in [00 §3](../../00-product-thesis.md).

### D2 — Capability naming and risk in the catalogue ★

Keys follow `module.object.verb` — `portal.manage`, `uxaios.space.construct`,
`ai.tool.approve`, `module.manage` — each declared with a label and a risk level,
and surfaced grouped by module with tick-box assignment.

Confirms our capability registry shape and gives a naming convention worth
adopting verbatim.

### D3 — `ai.evaluate_tool_invocation` ✓ independent arrival at preflight

A dry-run evaluator: given tenant, tool, granted permissions, granted scope
rules, requested mutations, evidence and confirmation → returns `allowed`, a
code, **`missing_permissions`**, and risk flags. Explicitly intended to be called
*"before enabling the invoke button"*.

That is our **Approval Preflight** ([02 §6.3](../../02-authority-and-autonomy.md)) and
our **recoverable denial** ([02 §4.4](../../02-authority-and-autonomy.md)) — `missing_permissions`
is precisely "here is what would resolve it". Independent arrival at both.

### D4 — AI approvals inbox ✓ validates our approval queue

`/settings/ai/approvals` with status filter, detail drawer showing payload,
evidence, requested mutations and **decisions history**, gated on
`ai.tool.approve`. Same shape as our approval queue design.

### D5 — The finding that changes the verdict ★★★

§4.2 and §4.3 mark as **"Shipped"**: `/signup`, `/forgot-password`,
`/reset-password`, `/settings/permissions`, `GET /permissions/catalog`, the role
permission matrix, `/settings/portals`, `/install`, Garage register/edit and
style guide, Assets Store deploy, AI Studio, `/settings/themes`, construction
mode, and a visual-regression e2e spec.

**Verified: none of them exist.** Route directories absent;
`grep -rli "garage|assets-store|ai-studio|uxaios"` across all source returns
nothing.

This document is *recent* and sits beside an honest README. So documentation
trustworthiness here is **per-document, not per-vintage** — which is a materially
different and worse problem than "old docs were wrong".

→ **Corrected** [P1 forensic §5.1](../../platforms/01-graph-portal-platform/01-forensic-analysis.md) and
[P1 verdict §8](../../platforms/01-graph-portal-platform/02-verdict.md).

---

## Batch E — Knowledge cookbook, dictionary, indexes

**Read:** `UNIFIED-KNOWLEDGE-PLATFORM-COOKBOOK.md` (intent, preservation
baseline, safe-change protocol, rounds) · `platform-dictionary.md` (kernel
concepts, Rules of the Puzzle) · headings of `platform-feature-function-index.md`
and `pages-to-spaces.md`.

### E1 — The safe-change protocol ★★★

Changes are graded by risk before they are made:

| Class | Rule |
|---|---|
| `S0` | Docs/types only, no runtime behaviour |
| `S1` | New code behind a feature flag, no existing path touched |
| `S2` | Touches shared surfaces — requires the regression suite |
| `S3` | Auth, protection, migrations — requires review and a rollback plan |

With: flags default off; migrations additive only with reversible `DOWN` for S3;
**never remove a field in the same release** that stops using it; flag-off must
revert without a deploy; evidence logged per slice.

**This is our task-grade model applied to code changes** — the same mechanism,
different subject. It matters more for us than for them, because our platform
*modifies itself*: blueprint changes, charter edits, skill promotions, lens
edits, generated apps and compiler output are all changes to a running company
made by the system. They deserve the same graded treatment, from the same
resolver.

→ **Integrated** into [02 §7.4](../../02-authority-and-autonomy.md).

### E2 — Rules of the Puzzle ✓ mostly validates

"Controllers do transport only. Services enforce use cases. Repositories own
persistence. React components do not own domain rules. **Every mutation needs
permission, validation, persistence, audit event, and domain event.** Every
module declares its capabilities in a manifest. **AI must respect the same
permission and audit model as the rest of the platform.**"

That last line is the one the code did not honour — `AiToolContract` lives in a
separate world from `PermissionCheck` ([P1 forensic §4.3](../../platforms/01-graph-portal-platform/01-forensic-analysis.md)).
A clean illustration that a stated principle without an enforcing test is a
preference (C1).

Two process rules worth keeping: *"every round starts by rechecking the
prerequisite code, tests, contracts and docs it builds on"*, and *"previously
completed work can be extended only after its assumptions are revalidated"* —
both direct responses to the drift problem.

### E3 — Preservation baseline as a document type ★

The knowledge cookbook opens with `PRESERVE-01/02/03` — explicitly named
behaviours that **must not regress**, each with a regression spec attached.

Worth adopting as a document type. For us the equivalents would be: the resolver
is the only decision point; audit is inside the transaction; discovery never
grants access; authority is never amplified. Each named, each with a test that
fails the build.

### Deliberately not taken (D + E)

| Idea | Why not |
|---|---|
| Content protection tiers (basic/strict, HMAC page tokens, print blocking) | Real feature, wrong priority; the honesty principle it carries (I15) is worth more than the mechanism |
| Icon randomisation | Trivial — but its provenance rule generalised into C11, which was worth the read |
| Tree-mode browse as a preservation baseline | Their constraint from a migrated product, not ours |
| Page-by-page UI specs (batches 01–06) | Specifications for a UI we are not building |

### Observation on process

The June audit lists migrations "001–009"; the current repository has 001–005.
The codebase was re-baselined between June and August — consistent with the
stabilisation-by-narrowing pattern found in [P1 forensic](../../platforms/01-graph-portal-platform/01-forensic-analysis.md).
Not a defect, but it means **any document older than August describes a codebase
that no longer exists**, and only the ideas transfer.
