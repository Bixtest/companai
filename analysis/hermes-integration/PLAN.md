# Hermes integration into the product — supplemental analysis programme

**Created:** 2026-10-05  
**Status:** All five analysis batches complete; documentation only.  
**Boundary:** Read-only on all inputs. Outputs in this folder only. This supplements, rather than repeats, library/analysis (12-batch AI-first / Starting Kit / Hermes programme) and library/paperclip-hermes-study (11-batch Paperclip / Hermes / sibling-integration study).

## Purpose

Given the product vision, Open Mercato Starting Kit, its development pipeline, and the sibling Paperclip–Hermes product, determine how to make Hermes capabilities native to our end product without importing the sibling's control plane or duplicating our own authority.

## Evidence rules

1. library/ai/ai-first is the target direction; the sibling aissistant-package is a reference case, not our product specification.
2. Local source/code outranks documents about that source. Running evidence outranks static assertions. This analysis did not run code or services.
3. Carry sibling findings as lessons with an explanation, never as architecture decisions already made for Open Mercato.
4. Distinguish current implementation, roadmap/status claims, intended architecture and this report's inference.
5. The user's request authorizes documentation writes only beneath companai/analysis. Do not modify source, other docs, configuration, Git state, or runtime data.

## Batches

| Batch | Question / focus | Inputs | Status | Output |
|---|---|---|---|---|
| 00 | What prior work answers this? Which sources define the product and actual repository state? | library/INDEX.md, ai/README.md, prior analysis plans, Paperclip study, repo metadata | DONE | findings/00-scope-and-source-map.md |
| 01 | What is the end product, what must Hermes do, and which boundaries are normative? | AI-first guide/design-control docs; development architecture, agent-half, backlog, kernel spec | DONE | findings/01-product-and-pipeline.md |
| 02 | What did the sibling integration build, what changed, what worked/failed, and what transfers? | aissistant-package source/docs; Paperclip study batch 09 and synthesis | DONE | findings/02-sibling-integration-case-study.md |
| 03 | At which Starting Kit module seams do Hermes and Paperclip-derived functions belong? | Starting Kit manifests, AI assistant, entities, auth/policies, queue/events/scheduler; existing analyses and backlog | DONE | findings/03-starting-kit-fit-map.md |
| 04 | What target architecture, order, gates, risks and decisions best fit all evidence? | Batches 00–03 and prior analyses | DONE | findings/04-recommended-integration-architecture.md |

## Completion definition

- Separate product vision from sibling decisions.
- Verify reusable boundaries and failure modes against prior forensic work and selected source.
- Map capabilities to an owning Starting Kit package/domain and mark present, planned or missing.
- Reconcile documentation tensions around literal in-process execution, deployment topology, profiles and scheduler ownership.
- Provide an incremental architecture and adoption order, with security and performance claims bounded by evidence.

## Not in scope

No implementation, deployment choice closure on behalf of the owner, runtime verification, benchmarking, dependency/license audit, or broad rereading of the existing 28k-line vision and prior 12-batch results. No code from Paperclip or the sibling is copied.
