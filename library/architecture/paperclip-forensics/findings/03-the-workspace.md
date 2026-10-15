# Paperclip Study — Batch 03: the workspace (P2)

**Status:** DONE — 2026-10-15 · **Pole tag: P2 — the workspace** (highly functional, versatile, integratable,
rich-featured; adapts to a mix of current and future features, use-cases and needs).
**Sources read:** `docs/companies/companies-spec.md` (596 lines), `doc/AGENTCOMPANIES_SPEC_INVENTORY.md`,
`doc/project-repositories.md`, `doc/execution-semantics.md`, `doc/workspace-restore-locks.md`,
`doc/PRODUCT.md` (task model + company skills), plus routes/dirs measured in code.

> **Naming caution.** Paperclip uses "workspace" in **two different senses**: (a) the **company/project
> container** a person operates in (this batch, P2), and (b) a **filesystem checkout** an agent runs inside
> (`doc/project-repositories.md`, `doc/workspace-restore-locks.md`). Both are in this batch; they are kept
> clearly apart because our own product uses "workspace" in sense (a).

---

## §0 — Plain words: what the workspace is in Paperclip

A **company** is the workspace. Under it sit **projects**, and work lives in a **tree of tasks** that all
trace up to the company's goal. The surface a person actually operates is a **control plane**: a task board,
a company directory, documents attached to work, and an audit stream. The single most transferable idea in
this batch is that **the whole company is a portable markdown package** — a folder of `.md` files you can
git-clone, fork, and share, with the database as a *derived* view.

---

## §1 — The company as a *portable artefact* (the headline finding)

`docs/companies/companies-spec.md` (`agentcompanies/v1-draft`) defines a **markdown-first package format**.
This is the most P2-relevant mechanism in the platform.

**Core principles (measured, `:26–37`):**
1. **Markdown is canonical.** 2. **Git repositories are valid package containers.** 3. Registries are optional
discovery layers, *not* authorities. 4. `SKILL.md` stays owned by the Agent Skills spec. 5. External refs must
be **pinnable to immutable Git commits**. 6. Attribution/licence survive import+export. 7. **Slugs and
relative paths are the portable identity layer, not database ids.** 8. Conventional folder structure works
without verbose wiring. 9. Vendor fidelity lives in **extensions**, not the base package.

**Package kinds** — a root is identified by ONE primary markdown file (`:38–50`): `COMPANY.md`, `TEAM.md`,
`AGENTS.md`, `PROJECT.md`, `TASK.md`, `SKILL.md`.

**Reserved layout** (`:51–85`):
```
COMPANY.md   TEAM.md   AGENTS.md   PROJECT.md   TASK.md   SKILL.md
agents/<slug>/AGENTS.md
teams/<slug>/TEAM.md
projects/<slug>/PROJECT.md
projects/<slug>/tasks/<slug>/TASK.md
tasks/<slug>/TASK.md
skills/<slug>/SKILL.md
.paperclip.yaml      ← vendor extension sidecar
HEARTBEAT.md  SOUL.md  TOOLS.md  README.md  assets/  scripts/  references/
```

**Common frontmatter** (`:86–116`): `schema`, `kind`, `slug`, `name`, `description`, `version`, `license`,
`authors`, `homepage`, `tags`, `metadata`, `sources`. Exporters **omit empty/default fields**.

**Code verification:** the inventory (`doc/AGENTCOMPANIES_SPEC_INVENTORY.md`) names the real implementation —
`packages/shared/src/types/company-portability.ts` + `validators/company-portability.ts` (shared contract),
`server/src/services/company-portability.ts` ("core portability service… import (graph resolution, collision
handling, entity creation)"), `server/src/routes/companies.ts` (export/import/preview endpoints),
`server/src/services/company-export-readme.ts` (**generates README.md + a Mermaid org-chart for exports**).
**VERIFIED IN CODE** (files exist and are described as the live implementation, not a plan).

**Plain gloss:** a company in Paperclip is **a git-cloneable folder of markdown**. You can export your
company as a template ("here's a pre-built marketing-agency org"), fork someone else's, or version-control
your org chart. The database is not the truth — **the markdown is**, and the DB is rebuilt from it on import.

**Cross-study note (Hermes b13 §3.1 / b12):** Hermes ships **skills and profiles as files** but has no
equivalent "the whole tenant is a portable markdown package". This is a **Paperclip strength** and it maps
directly onto our platform's need for companies/workspaces that can be templated and forked.

---

## §2 — The task tree and the four first-class objects (measured)

From batch 01 §2.1, restated for P2 with the hierarchy (`doc/SPEC.md:352–355`, `doc/PRODUCT.md:53–59`):

**`Initiative (company goal) → Projects → Milestones → Issues → Sub-issues`.**

**Execution semantics are specified** (`doc/execution-semantics.md`) — and this is where the workspace's
behaviour actually lives:
- **§1 Core Model**, **§2 Assignee Semantics** (who owns work), **§3 Status Semantics** with a precise
  vocabulary: `backlog`, `todo`, `in_progress`, `blocked`, `in_review`, `done`, `cancelled` — **each with its
  own rules** (e.g. `done` at `:159`, `blocked` at `:73` with §5's "Known execution waits at admission").
- **§4 Agent-owned vs User-owned execution** — work ownership is explicit.
- **§5 Checkout and Active Execution** — the single-writer lock per task (cross-ref batch 01's 409 rule).
- **§6 Parent/Sub-Issue vs Blockers** — **two different relations** (`parentId` vs `blockedByIssueIds`), plus
  child→parent reporting, review delegation, and **"The Courier Pattern (Lateral Coordination)"**.
- **§7 Accepted-Plan Execution** with an **exact-once fingerprint** and a durable compatibility claim.
- **§8 Non-Terminal Issue Liveness Contract**.

**Plain gloss:** the workspace is not a loose list — it has a **typed task state machine** and **two distinct
link types** (hierarchy = *why*; blocker = *what's in the way*). Keeping those separate is what lets an agent
answer "why am I doing this" (§ hierarchy) separately from "what's stopping me" (§ blockers).

**Code verification:** routes exist for all of it — `server/src/routes/issues.ts`, `projects.ts`,
`companies.ts`, `activity.ts`, `dashboard.ts`, `issue-tree-control.ts`, `issues-checkout-wakeup.ts`.
**VERIFIED IN CODE** (files present, matching the doc's model).

---

## §3 — The operator surface: what a person actually sees

P2 is "the workspace" as an experience, not just a data model. From the routes and docs:

| Surface | Backing | What it is |
|---|---|---|
| **Dashboard** | `server/src/routes/dashboard.ts` | the operator's home: state scanning |
| **Task board / issue tree** | `routes/issues.ts`, `issue-tree-control.ts` | the work, hierarchically |
| **Companies & directory** | `routes/companies.ts` | the org, members, roles |
| **Activity / audit** | `routes/activity.ts` | the audit trail |
| **Documents on work** | `roadmap`: issue documents (PRODUCT.md) | work-attached docs |
| **Search** | `doc/SEARCH.md`, `routes/dashboard.ts` | find anything |
| **Attention** | `routes/attention.ts` | what needs me now |

**The design stance** (`DESIGN.md:11–13`, read in full): *"Paperclip is an operational control plane… The user
is an operator scanning state and making decisions. Every screen should answer, in order: **what is happening,
does it need me, what do I do about it.** Density in service of scanning beats whitespace in service of
aesthetics — but density comes from information, never from chrome."*

**Plain gloss:** the workspace is built for a person whose job is **triage** — scan, decide, act — not for
someone doing the work. The "what is happening / does it need me / what do I do" ordering is a genuine
product principle and is worth carrying into our workspace design.

---

## §4 — Company-level skills and policy (a P2 governance mechanism)

`doc/PRODUCT.md:95–139` ("Company Skills and Policy") plus `server/src/routes/company-skills.ts` and
`company-skill-policy.ts`: a company can hold **skills and a policy about them**, so the *workspace* governs
what its agents may load — not just the individual agent. **Code verification:** both routes exist.
**This is the workspace exercising authority over its members' capabilities**, which is a P2 governance
pattern (our platform will need the same: a workspace policy about what agents may do inside it).

---

## §5 — The filesystem sense of "workspace" (agents running in checkouts)

Because our product must eventually run agents *inside* a workspace, the second sense matters too:

- **Project repositories** (`doc/project-repositories.md`): a project can bind **GitHub repositories**;
  selected repos become **normal project workspaces** with `metadata.githubRepositoryId`; **one workspace
  stays primary**; tasks **materialize the other repositories as editable checkouts** inside their workspace.
  Access is resolved through the **caller's authorized GitHub grants** before creating anything; a selection
  **never delegates credentials**; low-trust review runs cannot use the persistent-clone fallback.
- **Workspace restore locks** (`doc/workspace-restore-locks.md`): writes to canonical target directories are
  **serialized by per-target SQLite `BEGIN IMMEDIATE` file locks** under `<instance root>/locks/directory-merge`,
  outside the writable target, with a **30-second** retry ceiling and a PID-only owner file for diagnostics
  (*"Missing, stale, or incorrect metadata cannot grant or retain ownership"*). Network filesystems without
  reliable SQLite locking are **not supported**.

**Plain gloss:** when agents share folders, Paperclip **locks the folder, not the database row**, and it fails
closed on ill-matched metadata. This is a hard-won, concrete answer to "two agents touched the same
directory" — and it is exactly the class of problem our workspace engine will face.

**Code verification:** `server/src/routes/task-workspaces.ts` and `server/src/services/heartbeat/
workspaces.ts` (measured: **146,149 B in one file**) implement the workspace lifecycle.
**VERIFIED IN CODE.**

---

## §6 — Divergences found in this batch

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D1** | `doc/PRODUCT.md` §Core Concepts describes "task" throughout | The same doc and `DESIGN.md:35` state the canonical term **should** be *task* (never *issue*), yet the **code and routes still say `issues`** (`routes/issues.ts`, `/api/issues/...`) | **Terminology divergence, by design-in-progress.** DESIGN.md explicitly schedules the task-rename as a later run. Recorded so no later batch is confused by `issue` in code meaning "task" in product. |
| **D2** | SPEC §1 "A Company does not have a standalone goal field" | `doc/project-repositories.md:11` says projects support **"goal links"** and `PRODUCT.md` says company "has a goal" | **Soft contradiction between two docs.** Likely: the *goal* is an **Initiative** object, not a company column — so "has a goal" is true semantically and false structurally. Flagged; code would settle it in the mapping step. |

---

## §7 — Carried forward

| ID | Carry | To |
|---|---|---|
| **C3-1** | **The company is a portable markdown package** (`agentcompanies/v1`): canonical md, git containers, slugs as identity, `.paperclip.yaml` extensions. | P2 (core), mapping |
| **C3-2** | **Export as template vs snapshot** (structure-only vs full state) — forkable orgs. | P2, PZ |
| **C3-3** | **Typed task state machine** (`backlog/todo/in_progress/blocked/in_review/done/cancelled`) + **two link types** (hierarchy vs blockers). | P2, P3 |
| **C3-4** | **Operator-first screen rule**: *what is happening / does it need me / what do I do*. | PX-W, P2 |
| **C3-5** | **Company skills + policy**: the workspace governs its members' capabilities. | P2, P1 |
| **C3-6** | **Project repositories → per-task checkouts**, credentials never delegated, one primary workspace. | P2, P3 |
| **C3-7** | **Directory-level restore locks** (SQLite `BEGIN IMMEDIATE`, 30 s ceiling, fail-closed on bad metadata). | P2, P3 |
| **C3-8** | **Courier pattern** (lateral coordination) as a named inter-agent work pattern. | P3 |
| **C3-9** | **README + Mermaid org-chart generated on export** — the org chart is a rendered artefact. | PZ, PX-W |
| **C3-10** | **Docs are a mix of settled and in-progress** (`issue`→`task` rename scheduled); treat product vocabulary as *transitioning*. | all |

---

## §8 — Value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a real user use case?**
It gives the user a **workspace they can template and share** (clone a working org, not a blank one), a **task
board that always answers "why"**, a **directory + audit trail** so they can see who did what, and a
**triage-shaped UI** that tells them what needs them. For a person running a company of AI workers, the
portable-package idea is the killer feature: *start from a proven org*.

**Q2 — how does this serve an AI-first business & resources planner?**
Three carry directly: (1) **C3-1, the company-as-markdown-package** — a planner that can define, version and
fork whole business configurations is exactly a "resources planner", and it is the strongest single idea
Paperclip offers P2; (2) **C3-3, the typed task model with separate hierarchy and blocker links** — the
planner needs both "why" and "what's blocking"; (3) **C3-5, workspace-level skill policy** — a planner must
be able to say "inside this workspace, these capabilities are permitted", which is governance the workspace
owns. The single-tenant assumption again does not fit, but **the portability format is tenant-agnostic** and
survives the multi-tenant rework intact.

---

*Batch 03 of 07 complete. Divergences: 2 (both explainable, recorded). Carried: C3-1…C3-10.
Next: `04-automations.md` (P3).*
