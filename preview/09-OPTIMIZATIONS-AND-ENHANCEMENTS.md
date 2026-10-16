# Optimisations, enhancements and richer functionality

**Written:** 12 October 2026 · **Author:** an agent brought in to learn the project cold
**Companion to:** [`08-FORENSIC-AUDIT.md`](08-FORENSIC-AUDIT.md), which documents the defects. This
document is about making a working thing *better*, not fixing what is broken.
**Verification marks:** 🔬 I measured it · 🔎 corroborated · 💭 my judgement, not a measurement.

Everything here is optional and prioritised. Nothing here is a prerequisite for anything else unless I
say so.

---

# Part 1 — Performance and cost

The project has already done the one free, measured win (the thread split, +46% prompt ingest). The rest
is ordered by leverage per unit of effort.

## 1.1 The single biggest lever: stop paying the prompt tax 🔬

Hermes' prompt is **~15,700 tokens**, of which the large majority is the **21 MCP tool schemas**. That
prompt is re-ingested on **every turn**, at ~13 tokens per second on this hardware — which is why a turn
costs ~20 minutes of ingest before it generates anything.

**The fix is not hardware.** It is to expose **fewer tools per task**. The platform's tool registry
already groups tools into packs (search, attachments, meta, business-ir); a run should receive the subset
its agent actually needs, and tool *discovery* should be a capability the agent asks for rather than a
wall of schemas it always carries.

Two supporting changes:
- The `meta` pack already exists for exactly this. Promote it from "one tool among 21" to "the first thing
  an agent calls", and gate the rest behind it.
- The 64K context floor is a Hermes requirement, not a per-call requirement. Where a task is genuinely
  small, a smaller window is a large memory and ingest win — the KV cache alone is ~3.7 GB.

**Expected effect:** the largest single reduction in both latency and token spend available, at zero
hardware cost.

## 1.2 Deterministic Functions are the real cost story 💭

The product's own thesis is that a verified Function costs zero tokens forever. That means the highest
-value performance work is **not** making the model faster — it is making the save-a-Function path
pleasant enough that people use it. Every saved Function removes a recurring model call permanently.

Concretely, the things that make people *not* save: no persistence (so nothing is there next session),
no visible library, no menu entry. Those are already on the plan. I would add: **show the saving**. A
quiet line after a repeated request — *"you have asked this three times; run it now or save it?"* — turns
a saved Function into a habit rather than a feature. The repeat-detection signal already exists
(`request-outcome/repeat.ts`); it just has no caller.

## 1.3 Right-size the model per task 🔬

The vision already names task classes and the models that fit them:

| Task | Class |
|---|---|
| simple lookup | small local model |
| a Business IR | small/medium local model |
| complex analysis | larger local model |
| schema design | strongest available |
| vision | vision-capable model |

The 7-tier resolution chain can already express this — tier 5 is the agent default, tier 3 is the tenant
override. **What is missing is a declared picture** (scoreboard row 30, `S6`): no single place says which
model each job uses, and no rule refuses a run without one.

I would build that **before** buying hardware, because it is what makes "we spend this much on reasoning"
answerable, and it is the prerequisite for any honest cost conversation.

## 1.4 Measured, not assumed

The project's own rule — *"local" is not a performance claim* — is correct and should be enforced
mechanically. Before any performance work ships, capture: median and p95 time-to-first-token, total
latency, tokens, CPU/RSS, database I/O and queue delay, **against the current assistant**. Without a
baseline every future change is an assertion.

## 1.5 Smaller, cheaper wins

| # | Change | Why |
|---|---|---|
| L1 | The embedding lane fails as a **warning**, not a gate | A silent embedding failure degrades retrieval, and retrieval underpins the AI's context. Make it fail closed once a local embedding model exists. |
| L2 | `MAX_TIME_RANGE_DAYS`/`DEFAULT_ROW_LIMIT` only fill gaps | Fine as a default, but an explicitly-stated huge limit is accepted. A ceiling that cannot be exceeded at all is the stronger shape. |
| L3 | `custom_entities_storage` export `pageSize` silently becomes 1000 with `?format=` | The repo's ≤100 rule does not hold there. Make the export pagination explicit and bounded. |
| L4 | `resolveTenantAllowlistSnapshot` logs and returns null on failure | The chat route refuses with 503 on the same condition. One door, one answer. |
| L5 | Optimistic locking is client-opt-in and the reader fails open | Opt-in is a defensible product choice; a reader that returns null and lets the write through unprotected is not. |

---

# Part 2 — Richer functionality

## 2.1 The one capability that would change the product: a data-axis read rule 💭

Almost every "not yet" in this project traces back to one missing piece: *may **this actor** read **this
row**, for **this purpose**?* (scoreboard row 1, `G-04`, `CC-6`, `CC-20`.)

Today the platform answers "may this actor read this **kind** of thing". That single gap is why:
- a saved Function carries a visible *"permissions not checked"* note;
- the AI's business-query path has nothing to check (see the audit, §2);
- `read`/`reference` structural verbs are declared and unenforceable;
- the "an answer was reduced before you saw it" marker cannot be built.

**I would rank this above every feature request in this document**, because it is not a feature — it is
the thing four other features are waiting on.

## 2.2 Make the workspace real, in the order the design already sets 💭

The workspace design is written and good. Its own sequencing is the right one:

1. **The wiring first** (the owner's DP-01): make the chain visible end to end — prompt → IR → result →
   save — even with no workspace screen, so the loop can be *seen* and corrected.
2. **Then the join** (`UserFunction.placement` → an `InjectionMenuItem`, group derived from the path).
   Designed, three small edits.
3. **Then the permissions engine** (the owner's DP-04, two gates: may this user *request* it, may this
   viewer *see* the outcome). Cross-cutting; it is the engine of The Studio.
4. **Then The Studio** (one hub for functions, widgets, pages, menu items + a database editor).
5. **Then the permissions-dependent builds** — tenant-authored widgets, AI-proposed widgets.

**The one thing I would not shortcut:** the tenant-authored and AI-proposed extension routes are safe
because of what their objects *cannot express*, not because of a check someone could reason past.
Building them before the permissions engine would be exactly the "granting broad tools before the
enforcement layer is complete" mistake the design document names as an authority bypass.

## 2.3 Features the platform is unusually well-placed to add 💭

These are cheap here and expensive anywhere else, because the substrate already exists:

| Feature | Why it is cheap here |
|---|---|
| **A "what would this change break?" answer.** The registries already answer `whereUsed` and `dependenciesOf`. Expose it as a screen, and it becomes the natural front door to the schema-change gate — every model proposal shows its blast radius before anyone approves it. |
| **Time-travel reads.** The append-only authority objects and the hash-chained ledger already record state over time. An "as of" read for any record would be a *derived* feature rather than a new subsystem — and it is what makes an auditor's question answerable in seconds. |
| **A permissions catalogue as a product surface.** The catalogue exists; the invariant `I1a` already says it is a first-class area, not an appendix. Grouped by module, showing each capability's risk class and what granting it actually permits. Today a granting decision is a list of strings. |
| **Model cost per tenant, per job.** Token metering already records per event and per day. A screen over it, plus a budget that blocks admission, is the honest prerequisite for per-tenant model policy — which the owner has already chosen as the destination. |
| **An approval queue that scales.** The queue already has the right shape. Bulk approval *with the difference shown* (item 22, still open) is the feature; approving many things without seeing what differs is rubber-stamping. |

## 2.4 Things I would deliberately not build yet 💭

- **Finance and procurement.** Correctly deferred by the owner's ruling; the foundation is not finished.
- **Router mode / multiple resident models.** `models_max: 4` exists, but router mode multiplies KV-cache
  memory on a machine with 15.56 GB total. Do not enable it speculatively.
- **A tenant-authored *component* widget.** Declarative-only is a safety property, not a limitation. The
  day a component widget is authorable by a customer, the platform is serving arbitrary code in every
  user's session.
- **In-process Hermes.** Node cannot execute Python; the alternatives are a rewrite of the agent loop or
  a native bridge, and neither has a measured benefit.

---

# Part 3 — Engineering hygiene

## 3.1 The one test that would catch the most: declared-control coverage 💭

The audit's structural finding. There are excellent coverage gates for tables, entities, guard wiring and
command capabilities, and **none** for "this declared invariant has a consumer". That is why
`.delegable` (20+ declarations, 0 readers), `demoteIfEvidenceDemands` (tested, no caller) and the whole
C6 command contract (0 of ~93 declarations) are all invisible to the build.

**The shape:** a single registry of declared controls — each with the file it is declared in and at least
one production file that must read it — asserted by a test that fails when either side is empty. It would
have caught audit §1, §7 and §12(C-1) at build time, and the next three after them.

## 3.2 Fail-closed should be the default, not the opt-in 🔬

Four places currently log-and-continue where they should refuse:

| Where | Today | Should be |
|---|---|---|
| `ensureOrganizationScope` | log-only, default off | refuse; `OM_ENFORCE_ORG_SCOPE_STRICT` becomes the escape hatch, not the gate |
| `ensureTenantScope` | returns when `!ctx.auth` | refuse; keyed on `systemActor`, never on the presence of an auth object |
| The authority command gate | returns when its dependency is missing | refuse — the tool door already does, and its own header says so |
| The model allowlist's provider axis | keeps the resolved provider | refuse; the model axis already does |

The project's own principle is stated in the guard engine: *"we did not recognise this" is never evidence
that it is safe.* These four are the same rule applied to a missing dependency.

## 3.3 Make the ledger append structural 🔬

`appendToLedger` is reached by routing through `log()`. `markUndone` goes around it. The fix is not to
patch `markUndone` — it is to make the ledger append something a module cannot accidentally skip, and to
get `resourceKind`/`resourceId` into the hash so the chain's pointer to the business object is protected
too.

## 3.4 Deprecation with teeth 💭

The `@deprecated` guard pair still has **106 call sites in 40 files, all in parked modules**. The comment
warns that it silently bypasses the registry. Nothing fails when a new call site is added.

A one-line test — *no file outside the parked set may call this pair* — would turn the parked set into a
tripwire. The registry itself proves the pattern works: `D0` was found precisely because the generated
file was empty and a test noticed.

## 3.5 Documentation accuracy is a feature 🔎

Several read as complete and are not: scoreboard row 22 (the confirm path drops the narrowing), row 19
(the command contract has zero declarations), and `CC-64`'s root cause. The project already treats a
disagreement between a document and the code as a defect. I would add the reverse: **a row that reads ✅
must be re-measured by a route that does not share a failure mode with the one that ticked it.** Row 22's
four legs were each measured; the fifth dispatch site was not, because the measurement was scoped to the
four that were.

## 3.6 Dead code with real cost 🔬

Roughly 1,500 lines of Hermes-door governance code plus ~1,000 lines of its tests have **no runtime
path** (`HermesPortAdapter`, `HermesGatewayClient`, `InProcessMcpClient`, `mcp-tool-adapter`,
`mcp-server-config`). That is not untidy — it is a well-written deny-by-default gate that nothing opens,
which reads as protection and is decoration. Either wire it or label it unmistakably as a harness.

The same applies, at smaller scale, to `preflight.ts`'s plan renderer, `authorityPolicyProblems`, and
`demoteIfEvidenceDemands`.
