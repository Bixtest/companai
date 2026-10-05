# The Paperclip value study — a second, wider pass

**Why this study exists.** Paperclip was already studied once, forensically, by
[`../paperclip-hermes-study/`](../paperclip-hermes-study/) — but through **one lens**: how AI workers get
roles, tasks, delegation, triggers and conversations. That study answered the agent-half question and
its synthesis is the reference for our agent architecture.

**The owner asked for a second, wider pass (2026-10-05):** read Paperclip again, **every functionality,
code, idea, flow and concept**, and find anything that **adds value or inspires an idea for our
platform** — and document it **only if there is**.

So this study's lens is different. It is not "how do agents get work". It is: **what does Paperclip
ship, how does it work, and is any of it worth taking, learning from, or deliberately rejecting?**

---

## The rule this study runs under

**Document only where there is value.** A finding that ends in "we already have this" or "not relevant"
is a **result**, and it is recorded in one line so nobody re-opens it. It does not become a
recommendation.

**Every candidate is cross-checked against what we already have, before it is called new.** The
baseline it is checked against:

| Against | Where |
|---|---|
| **The vision** — what the platform is meant to be | [`../ai/ai-first/`](../ai/ai-first/) |
| **The Starting Kit's built capabilities** — what the platform already does | [`../../workspace/knowledge/`](../../workspace/knowledge/), especially [`authority-overview.md`](../../workspace/knowledge/authority-overview.md) |
| **The agent half** — the model and the plan | [`../development/AGENT-HALF.md`](../development/AGENT-HALF.md) |
| **The first study's synthesis** — what we already took from Paperclip | [`../paperclip-hermes-study/findings/10-lessons-and-target-design.md`](../paperclip-hermes-study/findings/10-lessons-and-target-design.md) |
| **The roadmap** — what is already planned | [`../development/BACKLOG.md`](../development/BACKLOG.md) |

**A candidate is only "new" if it survives all five.** If it is already in the vision, already built,
already taken by the first study, or already on the backlog, it is not a finding — it is a
confirmation, and it is recorded as one.

**Evidence rule.** Every claim about Paperclip carries a `file:line` in the extracted tree
(`library/ai/paperclip-master/`). A claim with no observation is not a finding.

---

## The four questions, per area

1. **What is it?** What does this area actually do, read from the code and the docs.
2. **How does it work?** The mechanism, not the marketing. Where is the state, what enforces it.
3. **Do we already have it?** Checked against the five baselines above.
4. **What is it worth to us?** One of: **TAKE** (build this) · **LEARN** (a better way to do something we
   already plan) · **IDEA** (inspires something, not yet planned) · **WARN** (a trap they hit) ·
   **NOT FOR US** (already have it, or it conflicts with our design).

---

## The batches

**The tree studied:** `library/ai/paperclip-master/` — 8,300 files, extracted from
`paperclip-master.zip` (SHA-256 `86cef7df…`). Paperclip version `0.3.1`, MIT.

| # | Batch | The question |
|---|---|---|
| 1 | **Identity, access, and the human/agent boundary** | How do they model humans, agents, permissions, keys and attribution? Two deployment modes, run JWTs, responsible-user attribution, low-trust presets, personal vs shared AI accounts |
| 2 | **The work system** | Tasks, atomic checkout, execution locks, blockers, inbox, documents, artifacts and work products, anchored comments, revision history, company-wide search |
| 3 | **The execution engine** | Heartbeats, the wake queue, coalescing, routines and schedules, bounded recovery, watchdogs |
| 4 | **Governance, approvals and enforced outcomes** | Execution policies, review and approval stages, decision tracking, pause/resume/terminate, what "finished" means |
| 5 | **Budget and cost control** | Scoped budgets, thresholds, hard stops, and cost attribution across company/agent/project/goal/issue/provider/model |
| 6 | **Org, agents, teams, and portability** | Org chart, hiring, team templates, `companies.sh`, export/import with secret scrubbing and collision handling |
| 7 | **Training the agent employee** | Skill Studio, shared skills, evals and saved test runs, skill version history, performance reviews, agent personas and instruction revisions |
| 8 | **Extensibility and governed tool access** | Plugins (out-of-process workers, capability-gated host services), the MCP tool gateway, connections, the secrets manager |
| 9 | **Workspaces, runtime and isolation** | Project repositories, git worktrees, operator branches, runtime services, sandbox providers |
| 10 | **Operations: audit, observability, telemetry, deployment** | Activity and events, the run log, OpenTelemetry, Sentry, the telemetry data contract, deployment modes, the database |
| 11 | **The unbuilt ideas** | The 🟡 and ⚪ roadmap items: Memory/Knowledge, MAXIMIZER MODE, Work Queues, Self-Organization, Automatic Organizational Learning, BYO ticket system, Desktop App, cloud deployments |
| 12 | **Synthesis** | What is genuinely new to us, what we already have, what we reject, and why |

**Batches 1 to 11 produce the evidence; batch 12 is the synthesis.**

---

## Output

**Amended 2026-10-05, after the batches ran.** The plan said "one findings file per batch". In
practice several batches produced almost nothing new, and writing a file each would have been padding.
The evidence is therefore grouped into **six** files, each naming the batches it covers, plus the
synthesis:

```
library/paperclip-value-study/
├── README.md            what this study is, and the rule it runs under
├── PLAN.md              this file — the batches and their questions
├── LOG.md               one dated line per batch completed
└── findings/
    ├── 01-governance-and-the-human-boundary.md   batches 1 + 4
    ├── 02-the-work-system-and-execution.md       batches 2 + 3
    ├── 03-money-and-operations.md                batches 5 + 10
    ├── 04-org-agents-and-training.md             batches 6 + 7
    ├── 05-extensibility-and-isolation.md         batches 8 + 9
    ├── 06-the-unbuilt-ideas.md                   batch 11
    └── 07-synthesis.md                           batch 12 — THE ANSWER
```

**What the synthesis must do.** Separate the three outcomes cleanly: **genuinely new value** (with what
to do about it), **confirmations** (things we already have or plan, one line each), and **rejections**
(with the reason, so nobody re-opens them). It must be usable as the answer to the owner's question:
*"is there anything there that adds value, or not?"*

---

## The rules that bind

- **Only document if there is value** (the owner's instruction, and this study's whole point).
- **Evidence with `file:line`**, or it is not a finding.
- **Cross-check before calling anything new** — against all five baselines.
- **Reach every important claim by two routes**, and make them agree.
- **Bounce the synthesis off a critic** whose only job is to prove it wrong.
- **Do not read the first study's conclusions as this study's findings.** Where they overlap, say so
  and cite them rather than re-deriving.

*Written 2026-10-05.*
