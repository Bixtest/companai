# Audit triage — which modules record, and which deliberately do not

**Decided 2026-08-09 by inspecting every write route**, not by reasoning about
module names. The last two times a module was judged by its name the judgement
was wrong (`configs`, `inbox_ops` — both below).

This exists so the gap is not re-discovered every few months and re-argued from
scratch. **If you are about to "notice" that a module records nothing, check here
first.**

---

## Audited — automatically

Anything built on `makeCrudRoute` records on both its write paths, and anything
routed through the command bus records with an undo token. Nothing to do.

## Audited — wired by hand (R2a-custom)

`integrations` · `attachments` · `data_sync` · `workflows` — 25 write points,
each auditing inside the transaction that performs the write. Guarded by
`packages/core/src/__tests__/audit-coverage.test.ts`.

## Deliberately not audited

| Module | Mutating routes | Why not |
|---|---|---|
| `dashboards` | 4 | **Per-user view state.** Layout, user widgets and role widgets are already on `SKIPPED_ACTION_LOG_RESOURCE_KINDS` — recording every widget drag would bury real activity in noise |
| `progress` | 2 | **Ephemeral job telemetry.** `createJob` / `updateProgress` track a running operation's percentage. The operation itself is audited by whatever started it; the progress bar is not a business fact |
| `notifications` | 2 | **Per-user inbox state.** Creating a notification is a side effect of an already-audited action; marking one read is view state |
| `perspectives` | 0 | No mutating write routes |
| `query_index` | 0 | No mutating write routes |
| `api_docs` | 0 | No mutating write routes |
| `audit_logs` | 0 | No mutating write routes — and auditing the audit log recurses, which is why its resource kinds are on the skip list |

**If one of these grows a route that changes business data, it moves out of this
table.** The reason recorded is the test: *would someone investigating an
incident need to know this happened?* Widget positions and progress percentages,
no. Anything else, yes.

---

## `inbox_ops` — audited (R2c, 2026-08-09)

**Nine mutating routes recorded nothing.** Fixed. Kept here because the reasoning
is the template for the next module that lets a machine propose and a human
decide.

From its own manifest:

> **InboxOps — Email-to-ERP Agent.** *Receives forwarded emails via webhook,
> extracts structured action proposals using LLM, and presents them for
> human-in-the-loop approval.*

The execution was audited all along — an accepted action runs through the command
bus, which writes its own entry with an undo token. **The decision was not.**

### What records now

| Where | Verb | Atomic? |
|---|---|---|
| `executionEngine.executeAction` — covers accept and accept-all | `accepted` | Yes, with the claim |
| `executionEngine.executeAction` — execution failed | `failed` | No — the work already reached other modules |
| `executionEngine.rejectAction` | `rejected` | Yes |
| `executionEngine.rejectProposal` | `rejected` | Yes, with both bulk updates |
| `actions/[actionId]` — edit a proposed payload | `updated` | Yes |
| `actions/[actionId]/complete` — fulfilled by hand elsewhere | `completed` | Yes |
| `proposals/[id]/categorize` | `updated` | Yes |
| `emails/[id]` — soft delete | `deleted` | Yes |
| `emails/[id]/reprocess` — discard the model's output, run again | `updated` | Yes, with the retirement |
| `settings` — including the webhook signing secret | `updated` | Yes |
| `replies/[replyId]/send` — outbound email | `completed` | No — the message has left |
| `extract` and `webhook/inbound` — the two ingestion doors | `created` | Yes |

`proposals/[id]/translate` is **not** audited: it caches a machine translation of
content already on the proposal, changing no business fact.

### The three decisions behind the table

**The verb carries the meaning.** `accepted` / `rejected` / `completed` / `failed`
joined the audit contract rather than flattening everything into `updated`, and
`deriveActionLogActionType` learned to classify them — an unclassified verb falls
through to `system`, which reads as "nobody did this".

**Content stays where its permissions are.** No snapshot carries `description`,
`payload`, or a message body — all encrypted tenant PII. Entries carry the action
type, the proposal id, and **the model's confidence**, then point at the record.

**Successes are not double-recorded; failures are recorded.** A successful
execution already has its command-bus entry. A failure had none, and "approved,
then nothing" is indistinguishable from "still running".

Full recipe: [`workspace/knowledge/audited-writes.md`](../knowledge/audited-writes.md).
