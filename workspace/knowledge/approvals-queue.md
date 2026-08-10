# The approvals queue

**In one sentence.** When the resolver stops an act, it lands in a queue at
`/backend/authority/approvals`, and this is where a person decides what happens to
it.

**Read first:** [authority-overview.md](authority-overview.md) for how an act
reaches a gate, and [authority-decisions.md](authority-decisions.md) for what the
gates mean. This document is about what happens *after* one binds.

---

## The two halves, and why they never touch

The page has exactly two lists. Confusing them in either direction is how a queue
stops meaning anything, so they share no row, no verb, and no colour.

| | **Waiting for a decision** | **Already happened, not yet looked at** |
|---|---|---|
| Has the act run? | **No** | **Yes** |
| Table | `authority_pending_acts` | `authority_act_reviews` |
| Gates | A1, A2, A3 | A4 |
| Your options | Approve → it runs · Reject → it never runs | Mark it looked-at |
| If you ignore it | A1/A2 **expire** and never happen · A3 **commits** and does | Nothing. It stays until somebody looks |

The right-hand column is not an approval queue. Nothing on it can change what
already happened; the only question it answers is whether a human being has seen
it. Offering "Approve" there would be offering a decision that does not exist.

## Per-gate behaviour on the page

| Gate | Buttons | Why those |
|---|---|---|
| **A1** — propose, a person performs | Approve and run · Reject | Approving means *you* are performing the act, not the proposer |
| **A2** — approve first | Approve and run · Reject | The ordinary case |
| **A3** — hold, commit unless vetoed | **Stop it running** only | It runs on its own when the window passes. "Approve" would change nothing but the timing, so the only button with an effect is the veto |
| **A4** — act now, review after | I have looked at this | The act is already in the ledger |

**A3 is the one that surprises people.** Its row says *runs by itself* and a time,
not *expires*, and that wording is load-bearing: an unanswered A2 is safe, an
unanswered A3 is a decision to let it happen.

## What each row shows, and why

- **The capability**, not the command. `directory.organizations.manage` is what
  authority was checked against.
- **The gate tag** *and* a plain sentence beside it. "A2" is precise and empty; a
  queue that shows only the code is a queue that gets clicked through.
- **The resolver's own reason** (`because`) — the binding rule's explanation,
  carried from the decision rather than re-derived. See invariant **I6**:
  explainability is a return value, not a log line.
- **Who proposed it** and what kind of actor they are (`human`, `ai_worker`, …).
- **When it expires**, or when it commits.

## Settings, and the ones that are deliberately absent

The owner's rule (COOKBOOK rule zero-seven) is *defaults are mine, tastes are
theirs* — a knob exists where organisations genuinely disagree, and nowhere else.

| | Today |
|---|---|
| **Ordering** | Most-constrained first by default, oldest-first on request. **Per person, in that browser only** (`om:authority:approvals:order`). How you want your own queue sorted is a taste; storing it server-side would make one person's preference everybody's |
| **Expiry** | 24 hours, enforced by `PendingActService`. **No tenant knob yet** — PROGRESS records it as decided-but-unbuilt |
| **Who may approve** | Holders of `auth.authority.approve`. **Not tunable** — that is authority, not preference |
| **Bulk approval** | **Not built.** Backlog item 2. The diff is the feature; the button without it approves things unread |
| **Deputy cover, standing approvals** | **Not built.** Backlog item 3 |

## Where the code is

| Path | What |
|---|---|
| `packages/core/src/modules/auth/backend/authority/approvals/page.tsx` | The page |
| `.../approvals/page.meta.ts` | The guard, and its placement in Settings → Authority |
| `packages/core/src/modules/auth/api/authority/pending-acts/route.ts` | `GET` returns `{ items, reviews }`; `POST` takes `{ id, decision }` where decision is `approve` / `reject` / `reviewed` |
| `packages/core/src/modules/auth/services/pendingActService.ts` | `PendingActService` and `ActReviewService` — the two tables, and every transition between their states |
| `packages/core/src/modules/auth/commands/interceptors.ts` | What puts acts into the queue |
| `packages/core/src/modules/auth/workers/commit-held-acts.ts` | What takes A3 acts out of it without a person |
| `packages/core/src/modules/auth/__tests__/authorityApprovalsPage.test.tsx` | Eight tests; three of them exist only to hold the two halves apart |
| `packages/core/src/modules/auth/i18n/{en,de,es,pl}.json` | The strings, under `auth.approvals.*`. **The module owns these** — not `apps/mercato/src/i18n/` ([[L35]]) |

## Two things worth knowing before you change it

**A held act returns HTTP 202, not 403 or 500.** Three outcomes have to stay
distinguishable: *you may not*, *it failed*, and *not yet — here is where it went*.
A 403 claims the caller may never do this; a 500 invites a retry, and each retry
queues another copy of the same act.

**Approving replays the original command** through the bus, with
`APPROVED_ACT_REPLAY` marked on the context so the gate stands aside. Without that
marker, approving would queue a second copy and the queue could never be emptied.

## Design source

`compai/planning/02-authority-and-autonomy.md` §7.1–7.2 (approval flows, standing
approvals, delegation) and §9 (one inbox rather than four screens).
