# Audited writes

**In one sentence.** Every write that changes business data must leave a record
of who changed what, and that record commits in the same transaction as the
change.

**Why it matters.** Our product's premise is a governance layer that can always
explain who did what — for AI workers above all. A write with no record is a hole
in that promise, and holes are invisible until someone asks the question the
system cannot answer. When we found this, **16 of 25 enabled modules wrote
nothing**: creating and revoking an API key — a credential — left no trace.

## How it works

There are exactly **two write paths**, and only one of them used to audit.

```text
makeCrudRoute
├── actions.<op>.commandId declared  →  command bus  →  audited (always)
└── plain create/update/delete       →  direct path  →  audited since R2a
```

**The command bus path.** `CommandBus.execute()` runs the handler, then writes
the audit entry via `ActionLogService.log()`. Commands additionally carry an
`undoToken`, which is what makes an entry reversible.

**The direct path.** `makeCrudRoute` calls the route's own `create` / `update` /
`delete` handler. It writes no undo information, because a plain handler has no
reverse operation — so its entries are deliberately **not undoable**.

### The transaction rule

Both paths write the audit entry **inside the transaction that made the change**.

```text
begin
  business write
  audit write        ← failure here rolls the business write back
commit
side effects         ← events, indexing, cache — only after commit
```

This is the property worth protecting. Before it existed, a crash between the two
writes left a committed change with no record, and the audit failure was
swallowed so nothing reported the gap.

**Side effects stay outside.** Events, query-index updates and cache
invalidation fire *after* the commit, never inside it — otherwise an event
announces a change that then rolls back.

### Fail-closed, precisely

Two failures that look similar and are not:

| Situation | Behaviour | Why |
|---|---|---|
| `actionLogService` **not registered** | Tolerated, write proceeds | A downstream app may disable the `audit_logs` module |
| `service.log()` **throws** | Propagates, transaction rolls back | A lost record is the thing we are preventing |

Collapsing these into one `try/catch` is what made the original defect silent.

## How to do the common thing

### Make a new CRUD route audited

Nothing to do. Any route built with `makeCrudRoute` is audited on both paths.

### Make a custom (non-factory) write route audited

Custom routes bypass the factory, so wire them by hand:

```ts
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'

const em = container.resolve('em') as EntityManager
await em.transactional(async () => {
  await someService.save(...)          // the business write
  await writeDirectWriteAuditLog({     // inside the SAME transaction
    container,                          // the SAME container — see below
    auth,
    organizationId: record.organizationId ?? null,
    action: 'updated',
    resourceKind: 'my_module.thing',
    resourceId: String(record.id),
  })
})
```

Five things that are easy to get wrong:

1. **The same container.** `createRequestContainer()` twice yields a *different*
   EntityManager, so the audit would land outside the transaction. Resolve `em`
   and pass `container` from one call.

2. **The container's EntityManager, never a `fork()`.** This one is invisible and
   costs you the whole guarantee — see the section below.
3. **Scope to the record, not the actor** — see
   [scope-tenant-organization.md](scope-tenant-organization.md).
4. **Never snapshot secrets, or tenant content.** `integrations/credentials` records *that*
   credentials changed and nothing more; a snapshot would copy them into a table
   with different retention and different read permissions.
5. **Give the route a transaction if it has none.** Auditing after a commit
   cannot fail closed — throwing would report failure for a change that happened.

Alternatively route the write through a **command**, which also gets you undo,
at the cost of a `commands/` implementation.

### Open the transaction on the container's EntityManager

The audit service is registered `.scoped()` and holds `container.resolve('em')`.
That manager is created with `useContext: true`, so it resolves through
MikroORM's `TransactionContext` and **joins whatever transaction is active in the
async context**.

`em.fork()` is created with `useContext: false` (MikroORM's default). A
transaction opened on a fork never reaches the audit service:

```ts
const em = ctx.container.resolve('em') as EntityManager   // correct
const em = ctx.em                                          // WRONG if ctx.em is a fork
```

**What goes wrong if you get it backwards:** the business write rolls back and
the audit row commits anyway — the exact inversion of the guarantee, and nothing
reports it. Tests still pass, because a mock EntityManager runs the callback
whichever manager you hand it.

**And load the record inside the callback.** An entity belongs to the manager
that loaded it. `em.transactional(cb)` runs `cb` against a *fork* of that
manager, so an entity loaded before the transaction is not in the transactional
unit of work and flushing inside will not persist it:

```ts
await em.transactional(async (trx) => {
  const record = await findOneWithDecryption(trx, Thing, { id }, undefined, scope)
  if (!record) return
  record.status = 'done'
  await trx.flush()
  await writeDirectWriteAuditLog({ container, ... })
})
```

This costs one extra read. It buys a guarantee that actually holds.

### Verbs beyond create / update / delete

`DirectWriteAuditAction` also carries **decision verbs** — `accepted`,
`rejected`, `completed`, `failed` — for a human acting on something a machine
proposed. Recording an approval as `updated` is true and useless: "who approved
what the AI suggested" is the question this platform exists to answer.

**Adding a verb means classifying it** in `deriveActionLogActionType`
(`audit_logs/lib/projections.ts`). An unclassified verb falls through to
`system`, which reads as "nobody did this" and is matched by no action-type
filter — so the entry becomes hard to find, which for a decision record is the
worst possible outcome.

### Make an entry undoable

Only commands can be. The bus sets `undoToken` when the handler implements
`undo()` and does not set `isUndoable: false`. Do not synthesise an undo token
for a write that cannot be reversed — the UI renders an undo control for any
entry that has one, and a button that cannot work is worse than no button.

### Exclude a resource kind from auditing

Add it to `SKIPPED_ACTION_LOG_RESOURCE_KINDS`
(`packages/shared/src/lib/commands/action-log-skip-list.ts`). **One list, both
paths.** It exists for two cases only: auditing the audit log (which recurses)
and per-user view state such as dashboard layout (which is not a business fact).

Growing that list is how audit coverage silently erodes — a test asserts its
size, so any addition has to be deliberate.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Action Log empty for something you just did | The route is custom, or uses the factory's direct path in a module predating R2a | Check whether the module reaches the factory at all |
| Entry written but invisible in the UI | Entry has `organization_id = NULL`; the list filters by the caller's organization | Fixed — the list now also admits null-organization rows. If it recurs, check the scoping (see [scope-tenant-organization.md](scope-tenant-organization.md)) |
| Entry scoped to no organization | Written with the **actor's** scope, and the actor is a superadmin (no organization) | Scope to the **record's** organization, falling back to the actor's |
| `actor_kind` is null on an old entry | It predates the column (U7) | Null means **unknown**, never human. Run `audit_logs backfill-actor-kind` |
| `command_id` looks like `Q8svLX…:v1` in psql | Encrypted at rest — `audit_logs:action_log` is in the tenant encryption map | Expected. The API decrypts on read; do not "fix" it |
| Undo button on something unreversible | An `undoToken` was written for a non-command write | Do not set one on the direct path |

## Who a recorded act was written for

Every `action_logs` row carries a **`visibility_scope`**, set by the code that
performed the act rather than inferred afterwards by whatever is reading it.

| Scope | Audience | Enforced? |
|---|---|---|
| `tenant` | Back-office readers in the tenant. **The default** | Yes — hidden from portal readers |
| `portal` | Customer-facing activity. Seen by *both* the customer and tenant staff | Yes |
| `platform` | Concerns the installation, not any one tenant | Yes — platform operators only |
| `private` | The actor, plus holders of `audit_logs.view_private` | Yes |
| `project` | A project's members | **No — fails closed** until G4 supplies membership. Nothing writes it |

**To narrow an act**, pass `visibilityScope` when logging it. Say nothing and it
is `tenant`, which is the audience audit records have always had — so this
vocabulary narrows and never widens, like every other ceiling in the platform.

**Two things that are easy to get wrong here**, both of which we did first:

- **The customer/staff line lives on `tenant`, not on `portal`.** `portal` has two
  legitimate audiences (hiding customer activity from staff would leave the staff
  trail incomplete). What must not leak is the tenant's *internal* activity to a
  customer — so that is where the check belongs.
- **`private` cannot be expressed as a list of scopes.** Whether a private row is
  readable depends on who performed it, which is per-row. The query is
  `scope in (...) OR (scope = 'private' AND actor_user_id = me)`. AND-ing the
  actor across the whole predicate instead silently narrows every reader's
  timeline to their own acts.

The filter is pushed into SQL rather than applied to fetched rows, because
`count()` and `loadEntries()` share one builder and a post-fetch discard would
still leak through totals, paging and export.

`packages/shared/src/modules/visibility.ts` holds the vocabulary and the decision
as pure functions; `visibleScopesFor()` is what a route hands to the query.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/commands/command-bus.ts` | `execute()`, `runInTransaction()`, `persistLog()` |
| `packages/shared/src/lib/crud/factory.ts` | `writeDirectWriteAuditLog()` and the three call sites |
| `packages/shared/src/lib/commands/action-log-skip-list.ts` | The shared skip list |
| `packages/core/src/modules/audit_logs/services/actionLogService.ts` | `log()` and the list query |
| `packages/shared/src/lib/commands/__tests__/command-bus.audit-atomicity.test.ts` | The rollback-on-audit-failure proof |

**Coverage is complete and guarded.** All five modules with mutating custom
routes audit by hand; everything else is covered by the factory or the command
bus. `packages/core/src/__tests__/audit-coverage.test.ts` fails if a new mutating
route appears without an audit call — the failure mode here is silence, which no
review catches.

### Recording a decision about machine output (`inbox_ops`)

`inbox_ops` is the human-in-the-loop loop: an LLM extracts action proposals from
a forwarded email, a person accepts or rejects each one, accepted ones execute
against other modules.

Three things worth copying when the next module does something similar.

**Record the decision with the claim, not with the outcome.** `executeAction`
claims the action (`pending` to `processing`) and writes the decision entry in
one transaction, *before* running the proposed work. Recording it afterwards
would lose the approval entirely if the process died mid-execution — the one case
where knowing who approved what matters most.

**Record failures, not successes.** A successful execution already has its
command-bus entry, attributed to the approving user, with an undo token; a second
`inbox_ops` entry beside it would double the volume and add nothing. A *failure*
writes nothing anywhere, leaving a trail that reads "approved, then nothing" —
indistinguishable from still processing.

**Keep the confidence, drop the content.** The snapshot carries `actionType`,
`proposalId`, `requiredFeature` and the model's `confidence`. It never carries
`description` or `payload`: both are encrypted tenant PII, and copying them into
the action log would duplicate customer content under a different retention
policy and a different set of readers. The entry records the decision and points
at the action.

The engine is the right place for it — `accept`, `accept-all`, `reject` and the
proposal-level `reject` all funnel through `lib/executionEngine.ts`, so the
record sits beside the transition instead of being repeated in four routes. The
coverage guard's `AUDITED_ELSEWHERE` map records that, and verifies the named
file really audits.

### The one place that is not atomic, and why

`workflows/instances/[id]/advance` audits **after** its transition, outside any
transaction, and logs rather than throws on failure.

`executeTransition` runs the transition's activities — `CALL_API`,
`CALL_WEBHOOK`, `SEND_EMAIL`. Holding a database transaction across those would
exhaust the connection pool under load, and an `idle_in_transaction` timeout
could roll back a transition whose external side effects had already happened.
A missed audit row is the lesser failure.

It does not throw either: the transition succeeded and its external effects are
real, so telling the caller it failed would be a lie.

`inbox_ops` has two of the same shape: a **failed** execution (the proposed work
already reached other modules) and a **sent reply** (the email has left). Both
record afterwards and log loudly on failure.

**The general rule this illustrates:** audit inside the transaction *whenever the
write is transactional*. When a write has already escaped into the outside world,
record it afterwards and log loudly on failure — never pretend the operation
failed, and never hold a transaction open across a network call.
