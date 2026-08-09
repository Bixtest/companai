# P1 — Graph Portal Platform (`@gpp`)

| | |
|---|---|
| **Source** | `companai/Platform` — internal, our own prior codebase |
| **Self-description** | "AI-first graph portal business operating system" |
| **Assessed** | 2026-08-08 (source, full documentation review, second forensic pass) |
| **Size** | 219 source files · ~30,700 LOC |
| **Stack** | TypeScript 5.7 · NestJS 11 / Fastify · Next 15 / React 19 · Drizzle + PostgreSQL 17 + pgvector · Redis 7 · MinIO · BullMQ |
| **Health** | typecheck 12/12 · tests 234 pass · build 8/8 — all verified by execution |
| **Verdict** | **EVOLVE** — adopt as foundation, rebuild the kernel on top |

## Documents

| | |
|---|---|
| [01 — Forensic analysis](01-forensic-analysis.md) | What it actually is, from source |
| [02 — Verdict](02-verdict.md) | Rubric score, three-bucket partition, cost comparison, sequencing |
| [03 — Identity & salvage map](03-identity-and-salvage-map.md) | Exact stack, 20-table database inventory, need→code mapping |
| [04 — Docs review notes](04-docs-review-notes.md) | Ideas harvested from its documentation, and what we declined |

## The three things to remember

1. **It is not an AI-first framework**, despite the name and README. `grep` for
   `agent`, `charter` or `ai_worker` across all source returns **zero matches**.
   It is an AI-*ready* kernel: the governance substrate without any of the AI.

2. **The human-only principal assumption is shallow, not structural** — one enum,
   one lookup function, one table's foreign keys, because `actor_id` and
   `principal_id` carry no FKs on the hot paths. That single fact made the verdict
   EVOLVE rather than REFERENCE.

3. **Documentation reliability is per document.** `docs-newer/README.md` is
   accurate and admirably honest. `docs-newer/uxaios/PLATFORM-FEATURE-INVENTORY.md`
   in the same folder marks Garage, Assets Store, AI Studio, `/signup` and
   `/settings/*` as "Shipped" — none exist. Estimate from source, never from docs.

## What we took from it

Structural: the typed portal graph with inheritance ceilings · record lock states ·
terminal vs recoverable denials · typed governed hooks · an enriched capability
descriptor · event causation and visibility scope.

Invariants: **I11** (declared or it does not exist) · **I12** (locale is
structural) · **I13** (security by primitive) · **I14** (authority objects are
superseded, never edited) · **I15** (state a control's real strength) · **I1a**
(one set of surfaces, gated by authority).

From its documentation, none of which reached its code: the **Knowledge Cell**,
the **Garage**, **beams**, **Flow Trace**, **`as_of` temporal reads**, the
**citation triple**, and **Packs as deployable bundles**.

Full record in [../../CHANGELOG.md](../../CHANGELOG.md).

## Salvage headline

~3,000–3,500 of ~30,700 lines are worth carrying forward — concentrated in the
resolver, the portal graph, delegations, localisation, and the plumbing nobody
budgets for. Ranked inventory in [03 §4.8](03-identity-and-salvage-map.md);
explicit do-not-carry list in §4.9.
