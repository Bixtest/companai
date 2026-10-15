# Batch 03 — The Workspace (P2)

**Study:** Multica `0.2.0` · **Batch:** 03 of 07 · **Status:** COMPLETE
**Source:** `github.com/multica-ai/multica` → `platforms/_extracted/multica-main`
**Zip md5:** `30ddc64af536212e25a6c00db5672b82` · **License:** Apache-2.0 + Multica conditions
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; code is the authority. Nothing in this file was inferred from a README.

---

## 0. What this batch had to answer

P2 is **the workspace** — the container a person operates in. Batch 01 established that `workspace` is
the tenant root and is fenced by a task-scoped credential; this batch opens the container up: who is in
it, what work lives in it, and how it is tied to code.

Short answer, measured:

| Question | Multica's answer | Where |
|---|---|---|
| What is the tenant root? | `workspace` — **82 of 144 tables** carry a `workspace_id` directly | F03-01 |
| Who is in it, and what may they do? | A `member` row with role `owner`/`admin`/`member`; invitations carry a 7-day expiry | F03-04 |
| What is the work item? | `issue` — a 30-column work record with a per-workspace human number, a tree, stages, triage, and custom properties | F03-06 |
| What is a project? | A planning container (`status`, `priority`, `start`/`due`, a lead that may be a **member or an agent**) | F03-07 |
| How is code linked? | A per-workspace repo registry + a GitHub App installation + issue↔PR links | F03-08 |
| What makes one workspace different? | `settings` (jsonb) + `context` + a per-workspace **fail-closed attribution** switch | F03-09 |

Everything here is the *container*. The agent (batch 02), the scheduler (batch 04) and the UI (batch 05)
are separate.

---

## 1. The workspace record — the tenant root

`001_init.up.sql` creates `workspace`; the current shape is `pkg/db/generated/models.go:1723-1738`
(13 columns):

| Column | Added by | What it is |
|---|---|---|
| `id`, `name`, `slug` (UNIQUE), `description`, `settings` (jsonb), `created_at`, `updated_at` | `001_init` | the tenant root |
| `context` (TEXT) | `006` | free-form workspace context |
| `repos` (jsonb, default `[]`) | `014` | the repo registry (§5) |
| `issue_prefix`, `issue_counter` | `020` | the human-readable issue-ID source (§3.2) |
| `avatar_url` | `111` | display |
| `attribution_fail_closed` (bool, default FALSE) | `188` | the compliance switch (§6) |

### 1.1 The fence, measured

Measured over the whole migration set: **144 unique tables created**, and **82 of them carry a
`workspace_id` column in their own `CREATE TABLE` block**. The other **62** are either join/child tables
that inherit the tenant through a parent (e.g. `agent_skill`, `comment`, `issue_subscriber`) or genuinely
global rows (e.g. `user`, `personal_access_token`, `maintenance_job`, `instance_telemetry_state`).

**Plainly:** `workspace_id` is the tenant key, and it sits on the majority of the schema. This is the
same fence batch 01 found enforced at runtime by a task-scoped credential (`mat_` token); here it is the
storage half of the same idea.

### 1.2 A real bug, recorded in a migration

`044_fix_workspace_fallback_slug.up.sql` is worth reading as a lesson. The frontend's slug generator fell
back to the literal string `"workspace"` when a name produced no valid slug characters — *"Chinese /
Japanese / emoji / Arabic names all stripped to empty by the `/[^a-z0-9]+/g` regex."* The first
non-ASCII-named workspace on any instance silently got `slug = "workspace"`, which (a) produced a
confusing URL and (b) **blocked every later non-ASCII-named workspace with a 409** on the unique index.
The migration renames the literal fallback to `workspace-<8 hex chars>`, and is careful to patch **only**
that literal, because other odd slugs *"are valid per the regex and the user might have chosen them
intentionally."*

**The transferable lesson:** an auto-generated unique key needs a fallback that is unique, and the fix
has to be surgical — a broad "clean up all odd slugs" would have renamed values users chose on purpose.

---

## 2. Members and roles

`member` (`001_init`) is a 5-column join: `(workspace_id, user_id)` UNIQUE, `role ∈ {owner, admin,
member}`. That is the whole model — three roles, one row per person per workspace.

### 2.1 Invitations

`041_workspace_invitation.up.sql` adds `workspace_invitation`: `inviter_id`, `invitee_email`,
`invitee_user_id`, `role ∈ {admin, member}` (**not** owner), `status ∈ {pending, accepted, declined,
expired}`, and `expires_at DEFAULT now() + INTERVAL '7 days'`. A **partial unique index** —
`UNIQUE (workspace_id, invitee_email) WHERE status = 'pending'` — enforces *"only one pending invitation
per workspace + email at a time"*, and two more partial indexes make the pending lookups fast. The
partial index is the interesting part: it makes "one *pending* invite" a database rule while allowing
the history of past invites to accumulate.

### 2.2 The rules that protect the last owner

`internal/handler/workspace.go` carries the member-management rules, and one is repeated in three places
— update (`:618-628`), delete (`:678-688`) and leave (`:724-734`):

- only an `owner` may touch an `owner` role (`:613-616`, `:673-676`);
- **the workspace must always keep at least one owner** — demoting, removing or leaving as the last
  owner is a `400` (*"workspace must have at least one owner"*).

Two further mechanisms are worth naming because they show the container is live, not just stored:
- a **membership cache** is invalidated on every role change and removal (`:639`, `:700`);
- removing a member **revokes** their access and **disconnects** their live connection
  (`revokeAndRemoveMember`, `h.Hub.DisconnectMember`, `:691-704`).

---

## 3. The work item — issues

### 3.1 The record

`issue` (`001_init`) has grown to **32 columns** (`models.go:818-849`). The base fields are the obvious
ones (title, description, `status`, `priority`, `assignee_type ∈ {member, agent}`, `creator_type`,
`parent_issue_id`, `acceptance_criteria`, `context_refs`, `position`, dates). The later columns are the
study-worthy ones:

| Column | Migration | What it added |
|---|---|---|
| `number` | `020` | a per-workspace human number |
| `project_id` | `034` | the project link |
| `origin_type` / `origin_id` | `042`/`060` | where the issue came from (quick-create, chat, agent) |
| `first_executed_at` | `050` | when an agent first ran it |
| `start_date` | `091`, `112` | a planned start (calendar `DATE`) |
| `metadata` | `105` | a small jsonb KV bag for pipeline state |
| `stage` | `123` | ordered barrier groups among siblings |
| `revision` | `265` area | optimistic-concurrency counter |
| `last_activity_at` | `360` | activity ordering |
| `triage_state` | `483` | "is this work at all", split off `status` |
| `properties` | `191` | typed custom properties |
| `duplicate_of_issue_id` | `536` | which issue a cancelled issue duplicates |

### 3.2 The human number

`020_issue_number.up.sql` gives every workspace an `issue_prefix` (first 3 letters of the name, uppercased)
and an `issue_counter`, and every issue a `number`, with `UNIQUE (workspace_id, number)`. The migration
**back-fills** both — sequential numbers by `created_at`, then the counter set to the max — so the feature
arrives without a gap. That is a small thing done properly: a human ID that is unique per workspace,
stable, and derived once.

### 3.3 Three design decisions recorded in migrations

- **Triage is its own column, not a status.** `483_issue_triage_state.up.sql` moved Triage off `status`:
  *"`status` answers 'how far along is this work'; Triage answers 'is this work at all'. Holding the
  second question in the first field makes every reader of `status` re-answer it, which is where the
  scattered `<> 'triage'` checks came from."* `NULL` means an ordinary issue.
- **A duplicate is a cancelled issue with a pointer**, not a status (`536`): *"there is no duplicate
  status … Reopening an issue is therefore how a mark is removed."* The migration also ships the column
  **before** the code that writes it (*"the expand half"*), so the feature is safe to roll back.
- **Stages are barrier groups** (`123`): `stage` orders sub-issues under one parent; the parent wake
  fires only when the **lowest unfinished stage** closes, so an unstaged sibling set wakes once, not on
  every child.

### 3.4 Custom fields — two layers

Multica has **two** custom-field mechanisms, deliberately split:

- `issue.metadata` (`105`) — a small jsonb KV bag agents write pipeline state into (PR number, status,
  waiting-on). Bounded to 8 KB, `jsonb_path_ops` GIN, values must be primitives.
- `issue_property` + `issue.properties` (`191`) — **typed** custom properties: a workspace-level
  *catalog* of definitions (`text`, `number`, `select`, `multi_select`, `date`, `checkbox`, `url`),
  structurally a sibling of `issue_label`, with per-issue values keyed by **definition UUID**. Values
  are bounded to 16 KB. Definitions are **archived, never deleted**, so historical values stay
  resolvable, and *"keys are UUIDs so definition renames never require value migrations."*

The split is the finding: a **free bag for machines** and a **typed catalog for people**, with the
typed one keyed by UUID so a rename never rewrites data.

### 3.5 Attention and history

- `issue_subscriber` (`015`) records *who* is subscribed and *why* (`creator`, `assignee`, `commenter`,
  `mentioned`, `manual`) — the reason is stored, not inferred.
- `issue_reaction` (`027`) is emoji reactions from members **or agents**, unique per `(issue, actor,
  emoji)`.
- `issue_view` (`265`, widened by `269`) is the **saved view**: a named, server-backed filter
  (`scope_type ∈ {workspace, my, project}`, a jsonb `query`, a jsonb `display`), with `visibility`
  `private`/`workspace` and a CHECK that **My Issues views are always private** — *"sharing it would
  leak a per-user perspective that renders differently for every member."* The `display` half *"only
  seeds the first open and is overridden per user locally"*, so the shared identity is the filter, not
  the layout.

---

## 4. Projects — the planning container

`034_projects.up.sql` adds `project`: `title`, `description`, `icon`, `status ∈ {planned, in_progress,
paused, completed, cancelled}`, and a **lead that may be a member or an agent** (`lead_type ∈ {member,
agent}`, `lead_id`). `035` adds `priority`; `166` adds `start_date`/`due_date` as calendar `DATE`
columns (*"carrying no time-of-day or timezone, so 'Mar 1' means Mar 1 for every viewer"*); `214` lets a
chat session belong to a project.

`065_project_resources.up.sql` adds `project_resource`: a **polymorphic** typed pointer from a project to
an external resource — `resource_type` is a free string and `resource_ref` is JSONB, so *"adding a new
type requires zero schema changes."* Today `github_repo` is the used type; notion pages, docs, URLs and
files are the named future. The whole table is 12 lines and that is the point: one shape that will not
need a migration per resource type.

---

## 5. Git / VCS — the code link

Three layers, all keyed by workspace:

1. **The registry.** `workspace.repos` (jsonb, `014`) lists the repos a workspace works on. The daemon
   reads them through `GetWorkspaceRepos` (`internal/daemon/client.go:1098`) as `RepoData{URL,
   Description, Ref}` (`internal/daemon/types.go:39-43`) — so a repo is a **url + a ref**, not a clone
   the platform owns.
2. **The installation.** `github_installation` (`079`) records a connected GitHub App installation
   (`installation_id`, account login/type). `133_github_installation_multi_workspace.up.sql` **widens
   the uniqueness key** from `UNIQUE (installation_id)` to `UNIQUE (workspace_id, installation_id)` —
   fixing a real bug where connecting the same org in a second workspace *"silently overwrote the first
   workspace's binding row (#4823)."* It then adds a standalone index because the new composite key
   cannot serve a bare `installation_id` lookup — a good example of a uniqueness change that must be
   paired with an index change.
3. **The PR mirror.** `github_pull_request` (`079`) mirrors PR state (`open`/`closed`/`merged`/`draft`),
   unique per `(workspace, owner, repo, number)`, and `issue_pull_request` joins issues to PRs with who
   linked them.

**The retirement here:** `007_drop_issue_repository.up.sql` dropped an early `issue.repository` column.
Git started **on the issue** and moved **to the workspace** — the registry (`014`) and the installation
(`079`) are the replacement. Reading only the current schema, you would never know the issue ever held
a repo.

---

## 6. The workspace as policy surface

- `settings` (jsonb, `001_init`) — a free workspace-config bag.
- `notification_preference` (`064`) — per `(workspace, user)` jsonb preferences, UNIQUE on the pair.
- **`attribution_fail_closed`** (`188`) — the one that matters. The platform's accountable-human
  waterfall degrades to `owner_fallback` when no precise human resolves, *"so every run has an
  accountable human by default."* A compliance workspace can instead **opt in to fail-closed**: a run
  that cannot be attributed to a precise human is **refused at enqueue** rather than run under a degraded
  label. Default `FALSE` preserves the old behaviour. The migration's own comment draws the line that
  keeps this safe: *"Never affects authorization (`originator_user_id`)."*

**Why this is a P2 finding:** it is a **per-tenant policy switch** for a governance concern, defaulted
off, with its non-interference with authorization stated explicitly. The container decides how strict to
be; the platform does not decide for it.

---

## 7. The retirement ledger (rule 10)

| Migration | What was removed | Why (the migration's own words) |
|---|---|---|
| `007_drop_issue_repository` | `issue.repository` | Git moved from the issue to the workspace registry (§5) |
| `058_drop_autopilot_priority_and_project_id` | autopilot's `priority` + `project_id` | autopilot's scheduling model was simplified |
| `053_drop_orphan_onboarding_current_step` | an orphan onboarding step | superseded onboarding flow |
| `269_issue_view_workspace_variant` | an old `issue_view` CHECK | replaced by a wider, paired constraint (§3.5) |

(These are the P2-side retirements; batch 02 recorded the agent-side four. Together the two batches show
the schema is a **history**, not a snapshot — the single most repeated lesson of this study.)

---

## 8. Findings

Tagged by pole; answered against **Q1 · USER VALUE** (how it serves a person) and **Q2 · VISION VALUE**
(how it serves the AI-first business & resources planner vision, incl. versatility and integratability).

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F03-01** | **The workspace is the tenant root**, and the fence is on **82 of 144 tables** (`workspace_id`). | P2 | Everything a team does lives in one place, and one team cannot see another's. | A clean multi-tenant storage model — the storage half of the runtime credential fence. |
| **F03-02** | **Three roles** (`owner`/`admin`/`member`) + **invitations** with a 7-day expiry and a partial-unique "one pending" rule. | P2 | Joining a team is a clear, expiring, single invite. | Simple, enforceable membership with a real lifecycle. |
| **F03-03** | **The last owner is protected** in three code paths; removal revokes access and disconnects the live session. | P2 | A workspace can never be locked out of itself. | No orphaned tenants. |
| **F03-04** | **Invitation shape** — role capped at admin (never owner), expiry defaulted, pending-uniqueness partial index. | P2 | You cannot be invited straight to owner. | Escalation has a path, not a shortcut. |
| **F03-05** | **A per-workspace human issue number** (`prefix` + `counter` + `UNIQUE (workspace, number)`), back-filled. | P2 | Issues have stable, readable IDs. | Human-facing identity without a global sequence. |
| **F03-06** | **The issue is a 32-column record** with a tree, barrier **stages**, **triage as its own attribute**, a **duplicate pointer**, and **two custom-field layers**. | P2 | Rich, structured work items that can express real project shapes. | A work-item model deep enough to hold a real plan, extensible without a migration per field. |
| **F03-07** | **Projects** — a planning container with dates, priority, and a lead that may be a **member or an agent**; resources are **polymorphic** (`resource_type` + jsonb ref). | P2 | Plans group work and can be led by a person or an AI. | Scheduling objects that accept a machine as a first-class owner. |
| **F03-08** | **The code link is three layers** — a repo registry (url+ref), a GitHub installation (multi-workspace), and an issue↔PR join. | P2 | Work is tied to real code and pull requests. | Integration without the platform owning a clone. |
| **F03-09** | **`attribution_fail_closed`** — a per-workspace switch to refuse an unattributable run, defaulted off, explicitly not affecting authorization. | P2 | A regulated team can refuse runs it cannot attribute. | Governance is a per-tenant policy, not a platform-wide hard rule. |
| **F03-10** | **Saved views** — a named filter (`query` is the shared identity) with per-user display and a CHECK that **My Issues is always private**. | P2 / PX-F | A team shares a view of the work without sharing each other's perspective. | A reusable, shareable lens over the data with a privacy bound built in. |
| **F03-11** | **The retirement ledger** — Git moved issue→workspace; autopilot fields and an onboarding step removed. | PZ | (indirect) — the product you see is the one that survived. | Rule 10 pays again: the current schema hides where Git used to live. |
| **F03-12** | **A migration as a bug post-mortem** (`044`) — an auto-slug fallback that collided on non-ASCII names, fixed surgically. | PZ | Non-Latin workspace names work. | The fix that patches only the literal bug, not every odd value. |

---

## 9. Divergences and honest bounds

- **No doc-vs-code divergence was needed** for these findings; as in batch 02, the migration headers carry
  the design record and agree with the code. The one *narrative* worth flagging: `issue.repository` was
  real and is gone (§5) — a reader of the current schema alone would be wrong about where Git lives.
- **Bound:** the `repos` registry is a *list*, and this batch measured its shape and its reader
  (`GetWorkspaceRepos`), not the daemon's clone/refresh behaviour — that is batch 04.
- **Bound:** `metadata` and `properties` are both jsonb bags, but they are **not** interchangeable; the
  batch states the split (§3.4) rather than treating them as one mechanism.
- **Bound:** the UI of all of this (views, boards, the workspace screen) is batch 05; this batch read the
  storage and the rules, not the rendering.

---

## 10. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The workspace-as-tenant fence (F03-01)** — 82 of 144 tables carry `workspace_id`, matching the
   runtime credential fence of batch 01. The two halves together are the strongest tenancy story in the
   study.
2. **The issue model (F03-06)** — a work item with a tree, barrier stages, a triage attribute split from
   status, a duplicate pointer, and a **two-layer custom-field design** (free bag for machines, typed
   catalog for people, keyed by UUID).
3. **The per-tenant policy switch (F03-09)** — `attribution_fail_closed`, defaulted off, with its
   non-interference with authorization stated explicitly.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 03 of 07. Read from source on 2026-10-15. Next: `findings/04-automations.md`.*
