# P2 — Open Mercato

| | |
|---|---|
| **Source** | `companai/open-mercato-main/open-mercato-main` |
| **Upstream** | [github.com/open-mercato/open-mercato](https://github.com/open-mercato/open-mercato) · [docs.openmercato.com](https://docs.openmercato.com/) |
| **Version** | 0.6.7 |
| **Licence** | **MIT** (root `LICENSE`, "Open Mercato contributors", 2025–2026) — but see the open-core note below |
| **Size** | **7,833 source files · ~1,321,900 LOC** |
| **What it is** | A modular commerce / ERP platform — 39 domain modules plus infrastructure packages |
| **Assessed** | Batch 0 complete, 2026-08-08 |
| **Verdict** | *in progress* |

## Scale warning

**This target is ~43× Platform 1** (1.32M LOC vs 30.7k). `packages/core` alone is
825k LOC across 4,757 files — 62% of the codebase.

The methodology's Batch 1 ("read kernel contracts completely") cannot mean
reading `core`. It must mean reading the **framework layer** — module contract,
DI, ACL, entity engine, event bus, migration system — and treating the 39 domain
modules as *product*, sampled rather than read. Recorded as a methodology
refinement in [Method §9](../../method/platform-assessment-methodology.md).

## Documents

| | |
|---|---|
| [01 — Forensic analysis](01-forensic-analysis.md) | In progress — Batch 0 recorded |
| 02 — Verdict | Not started |
| 03 — Identity & salvage map | Not started |
| 04 — Docs review notes | Not started |

## Batch plan

Sized to the target. Batches 1–3 are scoped to the framework layer; the domain
modules are sampled in Batch 4.

| Batch | Scope | Status |
|---|---|---|
| **0** | Orientation — size, shape, stack, licence, where the kernel lives | **done** |
| **1** | Framework layer: module contract · DI (Awilix) · generators · `acl.ts` · events · migrations | **done** — forensic §7 |
| **2** | Enforcement tracing — dispatcher, CRUD factory, command bus, audit. P-2..P-6, P-11 | **done** — forensic §8 |
| **3** | Verification — licence audit, P-1, P-8, P-9, P-15. *Build/tests not run — see §9.6* | **done** — forensic §9 |
| **4** | Module sampling — AI layer, `directory`, `entities`, `query_index`, `workflows`, `business_rules` **done** (forensic §10). Deferred to Batch 6 if needed: `inbox_ops`, `dashboards`/`perspectives`, integration architecture, `staff` | **done (core)** |
| **5** | Documentation — architecture set, framework index, root `AGENTS.md`. P-12 done. *Unread: framework detail, design-system, `.ai/`* | **done (core)** — forensic §11 |
| **6** | Second pass, verdict, salvage map, host-fitness scoring | **done** |

## Verdict — **FORK** · rubric **3.55/5** · host-fitness **4.25/5**

The strongest host candidate assessed so far. Not *Adopt* (kernel fit 2.5 — the
kernel is not there). Not *Harvest* (too much of the foundation is right). Not
*Evolve* (that verdict assumed our own code with no upstream; this has a live
third-party upstream).

Full reasoning: [02 — Verdict](02-verdict.md) · reuse plan:
[03 — Identity & salvage map](03-identity-and-salvage-map.md)

## Headline findings so far

- **Licence**: MIT core; `packages/enterprise` is commercial (excluded from
  salvage — no record locking, SSO or security module in the MIT core).
- **Composition**: build-time generator; a module whose `requires` is unmet makes
  the generator refuse to emit the registry → **our I11, enforced at build time**.
- **Strip cost**: an enable list plus a universal per-module override surface
  (`routes`, `events`, `workers`, `widgets`, `guards`, `cli`, `acl.features`,
  `di`, `encryption`, **`ai.agents`/`ai.tools`**) → **stripping is configuration,
  not a fork**.
- **Enforcement**: one dispatcher for all module APIs; default-deny auth,
  opt-in authorisation.
- **Reversibility**: a command bus with working **undo/redo**, before/after
  snapshots and derived change sets.
- **Audit**: rich command journal, but written in a **separate transaction** and
  **failing open silently**; mutable by design; no hash chain or signing.
- **AI**: a real governance layer — approve-first gate with field diffs and
  expiry, an ordered **narrow-only** mutation policy with escalation rejection,
  tenant/agent model allowlists, per-turn token/tool/time budget enforcement, and
  cost attributed down to the step.
- **Absent**: charter, trust tiers, task grades, canonical entities, lenses,
  beams, @mentions, authority delegation, first-class non-human principals.

## First impressions (to be verified, not conclusions)

- **It has what Platform 1 entirely lacked**: a real AI package (74k LOC), a
  workflow engine (59k), a custom-entity engine (15k), a business-rules engine
  (18k), an audit module, query indexing, and 39 working domain modules.
- **It appears to lack what Platform 1 was good at**: there is no portal-graph
  equivalent; `portal` is a 1.9k-LOC module, not an org topology with inheritance
  ceilings.
- **The module convention looks strong** — each module carries `acl.ts`,
  `di.ts`, `events.ts`, `migrations/`, `i18n/{de,en,es,pl}.json`, `api/`,
  `backend/`, `frontend/`, `services/`, `data/entities.ts`, and its own
  `AGENTS.md`/`README.md`.
- **`packages/enterprise` exists (49k LOC)** — an open-core boundary that must be
  licence-audited at file level before anything is assumed reusable. Root
  `package.json` has no `license` field despite the MIT `LICENSE` file.

None of these are findings yet. They are hypotheses for Batches 1–4.
