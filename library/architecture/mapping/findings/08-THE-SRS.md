# 08 — THE SRS

**The requirement set produced by the mapping pass. 46 requirements, `SR-01` … `SR-46`,
across six poles.**

**The frame (owner, 2026-10-16):** *"we are not limited by what mercato allows. we want to
engineer the best, richest, most versatile and integratable version of each pole plus the
extra features, plugins, modules, ideas, architecture, etc the platforms inspire and
reengineer accordingly."*

Every requirement below is traced to the platforms that demand it and the plan item that
builds it. Where a requirement already exists in the register, it is **extended**, not
duplicated.

---

## 1. How to read a row

| Column | Meaning |
|---|---|
| **SR-nn** | The requirement. New vocabulary; never collides with `S-*` (standards) or `SD-*` (slices). |
| **Source** | The platforms that demand it, with the citation that proves the mechanism exists. |
| **Status** | `HAVE` (exists, named) · `BUILD` (planned, register item) · `BORROW` (mechanism from a platform) · `RE-ENGINEER` (target exceeds current state). |
| **Register** | The existing item it extends: `CC-*` build queue, `G-*` vision, `M*` missing module. |
| **Gate** | Prerequisite / trigger, where one exists. |

---

## 2. The register at a glance

| ID | Pole | Requirement | Source | Status | Register |
|---|---|---|---|---|---|
| SR-01 | P1 | Typed engine port; nothing above it imports Hermes | Hermes | HAVE | `P2-1…P2-9a` |
| SR-02 | P1 | `agent` ≠ `agent_runtime`; uniqueness key as a DB constraint | Multica | BORROW | — |
| SR-03 | P1 | Permission policy ladder as data | openrig | BORROW | — |
| SR-04 | P1 | Two-surface rule: policy set by code, never config | openrig | BORROW | — |
| SR-05 | P1 | Sub-agent spawn cap (measured) + spawn ledger | Hermes, zulip | BUILD | — |
| SR-06 | P1 | Skills as versioned `SKILL.md` artifacts | n8n, Hermes | BORROW | — |
| SR-07 | P1 | A bot is a participant, not a parallel object | zulip | BORROW | — |
| SR-08 | P1 | The triage core gets a production caller | mercato | BUILD | `G-21`, `CC-59`, `CC-60` |
| SR-09 | P1 | A2UI-style protocol contract with enforcement | CrewAI | BORROW | — |
| SR-10 | P2 | Ambient tenancy: tenant derived from the request | zulip | RE-ENGINEER | — |
| SR-11 | P2 | Scope enters once — collapse the double entry | mercato, zulip | BUILD | `CC-84` |
| SR-12 | P2 | One tenant ↔ one engine home; per-run credential | Multica, `CC-84` | BUILD | `CC-84` |
| SR-13 | P2 | Identity keys unique per realm, DB-enforced | zulip | BORROW | — |
| SR-14 | P2 | Scope registry with a build-time ratchet | n8n | BORROW | — |
| SR-15 | P2 | Audit log with topology-encoded event numbering | zulip | BORROW | — |
| SR-16 | P2 | Personal / team workspace kinds | n8n | BORROW | — |
| SR-17 | P2 | Tenancy contract + prose + conformance harness + `LIMITS.md` | buzz | BORROW | — |
| SR-18 | P2 | Machine actors capped at approve-first, test-pinned | Multica, mercato | HAVE | authority layer |
| SR-19 | P3 | Durable wake queue: at-least-once, retries in payload, late cutoff | zulip | BUILD | — |
| SR-20 | P3 | One-statement claim with health gate inside | Multica | BORROW | — |
| SR-21 | P3 | Closed failure taxonomy per attempt | Multica | BORROW | — |
| SR-22 | P3 | Every command declares risk + approval + expiry | mercato, buzz | BUILD | `CC-63` |
| SR-23 | P3 | Transport does not decide | Gas Town | BORROW | — |
| SR-24 | P3 | Durable hooks for side effects | Gas Town | BORROW | — |
| SR-25 | P3 | Event-kind registry; kinds over endpoints | buzz | BORROW | — |
| SR-26 | P3 | Every approval gate ships a test that fires it | buzz | BUILD | — |
| SR-27 | PX-W | Widget = append-only log; state by replay | zulip | RE-ENGINEER | — |
| SR-28 | PX-W | Discriminated-union contract over widget kinds | zulip | BUILD | — |
| SR-29 | PX-W | One generic renderer: `WidgetIR` → DOM | zulip, mercato | BUILD | — |
| SR-30 | PX-W | Generic bridge: any backend drives any widget | zulip | BORROW | — |
| SR-31 | PX-W | Widget-kind registry; kinds register themselves | zulip | BORROW | — |
| SR-32 | PX-W | Composition canvas with CRDT collaboration | n8n | BORROW | — |
| SR-33 | PX-F | Design system + own ESLint plugin guarding composition | n8n | BORROW | — |
| SR-34 | PX-F | Prohibition-constrained 3-package layering | Multica | BORROW | — |
| SR-35 | PX-W | UMES injection as the widget entry point | mercato | HAVE | kit |
| SR-36 | PX-F | Dashboard + perspective screens | mercato | BUILD | `M5` |
| SR-37 | out | Plugin/module registry with full lifecycle | buzz, Multica | BORROW | — |
| SR-38 | out | Digital-twin harness; drift breaks the build | openrig | BORROW | — |
| SR-39 | **PZ** | One-truth check across every representation | zulip | BORROW | — |
| SR-40 | **PZ** | Feature-level ratchet only a human can raise | zulip | BORROW | — |
| SR-41 | **PZ** | Named, greppable escape hatches | zulip | BORROW | — |
| SR-42 | **PZ** | Exclusion ledger with mechanical expiry; ships empty | openrig | BORROW | — |
| SR-43 | **PZ** | Proof beside prose: contract + falsifiable check + `LIMITS.md` | buzz | BORROW | — |
| SR-44 | **PZ** | Retirement ledger; renames are tracked hazards | buzz, openrig | BORROW | — |
| SR-45 | out | Kinds-over-endpoints policy with conformance test | buzz | BORROW | — |
| SR-46 | out | Two-reads lint: any setting read twice must be read once | openrig | BORROW | — |

**Count by status:** HAVE 4 (`SR-01`, `SR-18`, `SR-35`, + `SR-11` partial via `CC-84`) ·
BUILD 8 · BORROW 31 · RE-ENGINEER 3 (`SR-10`, `SR-27`, + the frame itself).

---

## 3. What the mapping changed about mercato's position

### The good news, measured
- **The guard pole is our strongest starting position.** Guard engine `P18` complete,
  `D0–D3` fixed, authority layer test-pinned, hash-chained ledger, RED-GREEN mutation
  proofs, build-time fences (`CC-44`). No platform in the study starts here.
- **The typed port already works.** `P2-1 … P2-9a` is live and `runFunction` is structurally
  LLM-free. The seam is real.
- **The widget semantics already exist.** `BusinessWidget` / `WidgetIR` / `WidgetInstance`
  are built. Two of nine platforms have a widget model at all; we own the description and
  need only the engine.

### The bad news, measured
- **No durable wake queue.** P3 can run workflows and cannot wake them durably.
- **0 of ~93 commands declare risk or approval** (`CC-63`). A guard engine with nothing to
  guard.
- **The aissistant is unwired.** The triage core exists as a library (`G-21`) and has no
  production caller.
- **`CC-84` is open** — one superadmin identity, one shared `HERMES_HOME`. The pole that
  drove the entire study.

### What the frame changes
Under "not limited by what mercato allows", three requirements exceed anything mercato
currently does:
- **SR-10** (ambient tenancy) replaces explicit scope entry with a derived boundary.
- **SR-27** (widget-as-log) turns `WidgetInstance` from a blob into an append-only log.
- **SR-12** (per-tenant engine home) is the fix for `CC-84` and the retirement of the
  shared `HERMES_HOME`.

---

## 4. Sequencing — what must land before what

```
SR-38, SR-39, SR-41, SR-46   ← tooling; land FIRST; no blockers; make everything after cheaper
        │
        ├── SR-04 (two-surface rule, build-time fence)
        ├── SR-33 (design system + ESLint plugin, tooling)
        │
SR-02 + SR-07 (identity: agent ≠ runtime, bot = participant)   ← land together
        │
        └── SR-12 (per-tenant engine home = CC-84)   ← gates P2-9b
                │
                └── SR-10 + SR-11 (ambient tenancy, scope-once)
                        │
                        └── SR-13 (per-realm identity)
                                │
                                └── SR-19 (durable wake queue)
                                        │
                                        └── SR-22 (risk on every command = CC-63)
                                                │
                                                └── SR-27 (widget = log)
                                                        │
                                                        └── SR-29 (generic renderer)
                                                                │
                                                                └── SR-32 (composition canvas)
                                                                        │
                                                                        └── SR-36 (dashboard, M5)
```

**The critical path runs through identity → tenancy → durability → composition.** Everything
off the path (the tooling items at the top) can land immediately.

**`SR-08` (wire the triage core) has no prerequisite at all** — it is the cheapest item in
the register and can land today.

---

## 5. The mattermost slot

The tenth platform stays unstudied, pending an explicit ASK. **No rework is required**: every
pole file in this pass has a slot waiting for it. When it is studied, its mechanisms are
added as new `SR-*` rows — or, where they contradict an existing row, the contradiction is
reported under Rule 13 and resolved by measurement, not by preference.

---

## 6. What this document is not

It is not a build plan. **No development before a written requirement** — this *is* the
written requirement, and the build queue (`CC-*`, `SD-*`) consumes it. Hermes is not forked
or edited. Markdown is the source of truth and this file is never edited to fit a reader.

---

*Mapping pass complete. Inputs: nine platform digests + one mercato digest. Outputs:
`00-PIN-AND-METHOD` + `findings/01..08`.*
