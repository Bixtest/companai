# Findings 06 — The unbuilt ideas

**Covers batch 11:** the roadmap items Paperclip has **not** built — ⚪ planned and 🟡 partial.

**The one-line result.** A competitor's roadmap is a free look at where the market is going, and the
most useful thing here is not the ideas themselves but **what they say they will not do**. Two items
are worth stealing; two are thin; and their explicit **anti-goals** tell us where not to follow.

---

## 1. Memory as a control-plane contract over pluggable providers — **IDEA** (the best unbuilt idea)

**What it is.** Not one memory engine — a **company-scoped memory control plane** that sits above several
engines (Mem0, Zep, Supermemory, Cognee, Honcho), where a company picks a default provider and an agent
may override it, with provenance back to the issue and run that produced the memory, and cost attributed
to it.

**Evidence.** A full interface is designed, not shipped:
`doc/plans/2026-03-17-memory-service-surface-api.md:326-342` declares

```ts
export interface MemoryAdapter {
  key: string; capabilities: MemoryAdapterCapabilities;
  capture(…); upsertRecords(…); query(…); list(…); get(…); forget(…);
}
```

with a `MemoryScope { companyId, agentId?, projectId?, issueId?, runId?, subjectId?, sessionKey?,
namespace? }` and proposed tables `memory_bindings`, `memory_operations`, `memory_extraction_jobs`
(`:614-648`). Cost is deliberately **not** double-counted — a memory call reuses the run's own cost
event (`:583-585`). What actually ships is much narrower: five **experimental** MCP connectors with *"no
separate memory page, automatic conversation upload, prompt injection, or background memory sync"*
(`doc/connections/MEMORY.md:10-13`). The `MemoryAdapter` interface is a plan, not code.

**What we have — more than the first draft of this section said.** *(Corrected 2026-10-06. The first draft
said "nothing, and every 'memory' hit in our vision is about RAM". That was wrong, and it was wrong in the
direction that flatters the finding, so it is corrected here rather than quietly dropped.)* Measured:

- **We have already designed one tenant-scoped memory provider, in our own words.** The vision's own
  architecture document has a whole section: *"Hermes exposes a proper Memory Provider interface and
  supports external providers. This is the correct extension point for a platform-specific memory service.
  Build a first-party plugin conceptually called `PlatformMemoryProvider`"*, enforcing tenant,
  organization, user, agent, session and security scope **at the server side**
  (`library/ai/ai-first/AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md:385-410`),
  with a mapping row `| MemoryProvider | External memory abstraction | First-party tenant-aware memory
  adapter |` (`:4062`).
- **We have already named the gap it leaves.** The Hermes integration architecture's capability table has
  the row `| 7 | Long-lived memory and user model | (nothing) | A new, tenant-scoped artifact with consent,
  export, retention and deletion. Never business truth | **MISSING** |`
  (`library/development/ARCHITECTURE-hermes-integration.md:141`), and `:151` counts it among "three
  capabilities that are genuinely absent".
- **We have a rule about plurality already:** *"Treat the Hermes memory caps as hard, and respect the
  one-external-memory-provider rule"* (`library/development/AGENT-HALF.md:234`, lesson **L-19**).
- **We have the guardrails:** Hermes memory is explicitly not business truth
  (`library/ai/ai-first/03_Local_First_AI_Runtime_and_User_Function_Architecture.md:3468`) and not
  authorization evidence (`library/ai/ai-first/06_...:2542`), and tenant isolation must not depend on it
  (`:565`).

**What is genuinely new** is the step past all of that: a **control plane over several providers**, where a
**company** picks a default and an **agent** may override it, with provenance back to the run that produced
the memory and cost attributed to it. Our design is **one** provider, tenant-scoped. Paperclip's design is
**many**, policy-selected. That is the same shape as our model layer, which we have already chosen twice.

**Verdict: IDEA — an extension of a design we already have, not a blank page.** Worth putting on the "do
not lose this" list rather than the roadmap.

---

## 2. Pipelines — a shipped intake→stage→review substrate, mislabelled on the roadmap — **IDEA**

**What it is.** Continuous work intake with stages, transitions, automation and bulk review. The roadmap
calls "Work Queues" ⚪ planned — but a queue-shaped feature **ships** as **Pipelines**: DB tables,
`server/src/services/pipelines.ts`, `server/src/routes/pipelines.ts`, a CLI
(`cli/src/commands/pipelines.ts:198`), a UI (`ui/src/pages/Pipelines.tsx`), and a tutorial
(`docs/pipelines-tutorial.md:1-9`), with default stages literally `intake / in_progress`
(`pipelines.ts:77-80`).

**What we have.** Our vision's "pipeline" hits are a *Function execution pipeline* and a *Sales
Pipeline* (a business object) — **not** work intake and routing. Our backlog's `AH-3`/`AH-4` are about
triggers producing work, not about continuous intake.

**Verdict: IDEA.** If Companai runs a company day to day, work arriving continuously (support, triage,
intake) has to go somewhere. This is a proven shape for it — and the fact that it doubles as the
substrate for their learning features (below) makes it more interesting than a queue alone.

---

## 3. Self-organization and organizational learning — **IDEA** (the substrate, not the slogan)

**What they say.** Agents should propose structural changes (roles, delegation, new routines) inside
governance (`ROADMAP.md:129-131`), and completed work should become reusable knowledge — playbooks,
recurring fixes, decision patterns (`:133-135`).

**How far it is built.** Both are **bullets only**: a search for `self-organiz` returns **zero code
hits**. But three real substrates exist:

- A shipped **Learning Agent** (`server/src/services/built-in-agents.ts:321-330`: *"Extract durable
  lessons from completed work, preserve useful patterns"*).
- A runner tool that *"turns a completed task's learnings into a company skill"*
  (`releases/v2026.1001.0.md:20`).
- The **Reflection Coach** (findings 01 §5, 04 §7).
- **Decisions v1**, shipped: agents propose multi-option actions and humans decide from durable,
  triage-ranked queues (`SPEC-implementation.md:1253-1266`) — the natural carrier for a proposal.

**What we have.** Nothing in our **vision** and nothing in our **backlog** — measured: `self-organiz` and
`organizational learning` return **zero hits** across `library/ai/ai-first/` and `library/development/`.
But **not nothing in our library**, and this is a correction to the first draft of this section: both
concepts were identified once before, in the predecessor product's forensic audit, with requirement
numbers attached —
`library/16-konsult-product-docs/forensic-product-audit.md:300` (D11 "Hiring recommendations from
workload", *missing*, citing "HOST ROADMAP 'Self-Organization' ⚪; build on manager heartbeat"),
`:283` (C10 "Memory promotion (conversation → approved company asset)", *partial*, citing "HOST ROADMAP
'Automatic Organizational Learning' ⚪ not in host"), and `:464` ("Company Blueprint versioned objects +
self-organization proposals", a build item against SRS FR-420–441). So the idea was named, given
requirement numbers, and never carried into this platform's plan.

**Three precisions, so the search is reproducible** (added 2026-10-06 after a critic pass):
- That audit exists in **two identical copies** — `library/16-konsult-product-docs/forensic-product-audit.md`
  and `library/ai/hermes-docs/docs-more/forensic-product-audit.md` — with the same three lines at the same
  numbers. Either may be cited.
- The **remaining** hits are **not ours**: `library/ai/source-docs/paperclip/README.md:519-520` and
  `library/ai/source-docs/paperclip/ROADMAP.md:129, 133` are verbatim copies of **Paperclip's own**
  roadmap, and `library/ai/paperclip-master/` is the upstream tree. They are the subject, not our plan.
- So the accurate claim is: **zero hits in our vision and our backlog; three lines in our own audit of
  the predecessor product; and Paperclip's own text wherever it is copied.**

**Verdict: IDEA.** The *slogans* are not worth taking. The **gate** (finding 01 §5) and the **carrier**
(a durable proposal a human decides) are — and they are the same governance primitive we already care
about.

---

## 4. Bring-your-own ticket system — **IDEA**, but only the spec is real

**What it is.** Asana, Linear and Jira as **on-ramps** that feed work in, while Paperclip owns execution
and governance. The design is `docs/specs/external-task-protocol.md` — `Status: Draft v1` (`:2`), a
1,190-line RFC-2119 spec. **No implementation was found** for `ExternalTask` / `TaskLink`.

**Verdict: IDEA, low priority.** The *stance* is interesting — meet people where they are rather than
demand they move — but there is no mechanism here to learn from, only a spec.

---

## 5. MAXIMIZER MODE and Desktop App — **NOT FOR US**

**What they are.** "More output per human supervisor" through aggressive delegation
(`ROADMAP.md:121-123`), and a desktop client (`:147-149`). Both appear in **exactly three files**, all
roadmap bullets — no mechanism, no design.

**Verdict: NOT FOR US.** A slogan without a mechanism is not a finding. Our "output per supervisor"
answer is the governance layer, which is already the product.

---

## 6. What they say they will NOT do — **LEARN** (the most useful section in this batch)

Paperclip is unusually explicit about its own boundaries, and their boundaries are a free design review
of ours:

| Their anti-goal | Evidence |
|---|---|
| **A knowledge base is explicitly not core** | `doc/SPEC.md:563-567, 576` |
| **Not automatically self-healing** | `doc/SPEC.md:579` |
| **Not a general chat app** | `doc/PRODUCT.md:135` |
| **Do not build enterprise-grade RBAC first** | `doc/PRODUCT.md:137` |
| **Do not import runtime-level cron/workflow/queue into the core** — it *"would create a second orchestration system inside the product"* | `doc/plans/2026-04-08-agent-os-technical-report.md:230-232, 351-364` |

**Verdict: LEARN.** The last one is a warning aimed at us. Our plan already borrows Hermes as the agent
runtime and adds a wake queue (`AH-3`) and routines (`AH-4`). The line between "our scheduler" and "a
second orchestration system" is exactly where Paperclip says it drew a line. **Write down where our line
is**, before `AH-3` is built.

---

## 7. A feature they built and hid — **WARN**

**What it is.** Issue-scoped worktrees ship **runtime-only**, with the UI "hard-gated off"
(`doc/experimental/issue-worktree-support.md:3, 14`).

**Verdict: WARN.** A capability that exists but is not exposed is a claim waiting to be misread. If we
ever do this, say so where a reader will see it — which is exactly the discipline our own `BOOKMARKS.md`
§5 now applies to our folders.
