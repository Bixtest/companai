# The hash-chained ledger

**In one sentence.** Every audited write also extends an append-only, per-tenant
hash chain, so that the record can be shown to be unaltered — not merely trusted.

**Why it matters.** `action_logs` answers *what happened*. It is an ordinary
table: anyone with database access can edit a row, and nothing would show it. The
ledger answers the second question, *is this still what was written*. It does not
make tampering impossible — nothing in one database can — it makes **silent**
tampering impossible, which is the achievable and the useful property.

## How it works

```text
business write ─┐
journal entry  ─┤ one transaction
ledger event   ─┘ a failure in any of the three rolls back the other two
commit
```

Each event carries the hash of its predecessor **within its tenant**:

```text
seq 1   prev_hash: null      hash: 4d81…
seq 2   prev_hash: 4d81…     hash: 9f2c…
seq 3   prev_hash: 9f2c…     hash: c07a…
```

Altering event 2 changes its hash, which no longer matches event 3's `prev_hash`.
Recomputing event 2's own hash to cover the edit does not help: event 3 still
points at the original. To hide a change you must rewrite every event after it —
and the trigger below prevents rewriting any of them.

### Where it is hooked, and why there

`ActionLogService.log()`. Both write paths already funnel through it — the
command bus via `persistLog`, every custom route via `writeDirectWriteAuditLog` —
so the chain cannot fall behind the record it proves. A module physically cannot
audit a change and forget to chain it.

### Append-only is enforced by the database

A trigger raises on `UPDATE`, `DELETE` and `TRUNCATE`. Verified against a
superuser: all three are refused. A chain that only the *application* declines to
rewrite protects against nobody worth protecting against.

### One chain per tenant

Appends serialise on a per-tenant advisory lock (`pg_advisory_xact_lock`), held
to the end of the caller's transaction. A global chain would make every tenant's
writes queue behind every other tenant's.

The lock is the fast path; `unique (tenant_id, seq)` is the guarantee. If the
lock is ever bypassed, two appends claiming one position **fail loudly** instead
of forking the chain.

## How to do the common thing

### Record something in the chain

Nothing to do — audit it, and it is chained. See
[audited-writes.md](audited-writes.md).

### Verify a chain

```bash
corepack yarn mercato audit_logs ledger:verify
corepack yarn mercato audit_logs ledger:verify --tenant <uuid>
```

Exits non-zero when a chain is broken, so a scheduled run fails loudly. **Run it
after every database restore** — a partial restore produces exactly the sequence
gap it reports.

Verification stops at the *first* break. After a break every later hash is
expected to disagree, and a report listing thousands of consequential failures
buries the one that matters.

### Add a field to a ledger event

1. Add it to `LedgerEventHashInput` **and** to the row.
2. Bump `LEDGER_HASH_VERSION`.
3. Keep the old construction in the verifier, branching on `hash_version`.

Skipping step 2 makes every past event unverifiable. Skipping step 1 leaves a
field an attacker can change without breaking anything — **a field outside the
hash is a field nobody is protecting.**

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| `ledger:verify` reports a sequence gap | Rows deleted, or a partial restore | Compare against a backup; the gap position tells you when |
| `CanonicalizationError: Non-integer number` | A float reached the event envelope | Represent it as a string — see below |
| Verification fails after moving environments | Something locale- or platform-dependent got into the hash | Only `byCodeUnit` ordering and integer/string values are permitted in the envelope |
| `ledger_events is append-only` from a data fix | Working as intended | Append a correcting event; never rewrite |
| Business write rolls back with a ledger error | Fail-closed doing its job | Fix the ledger error; do not catch it |

### Two serialisers, and why

| | `canonicalize` | `digestOpaque` |
|---|---|---|
| Used for | the event envelope | snapshots of business records |
| Floats, dates, class instances | **rejected** | accepted |
| Throws | yes | never |
| Reproducible by | any language | any JavaScript runtime |

The envelope is ours, so it can be strict, and strictness is what lets an outside
auditor recompute a hash. Snapshots are not ours: they hold prices and
timestamps, and a strict encoder would throw on them — which, because the append
is fail-closed, would **roll back the customer's write**. The audit mechanism
would become the thing that breaks the business.

That is the general rule worth keeping: *be strict about what you construct, and
total about what you receive.*

### What the chain deliberately does not hold

No customer content. The payload carries the journal entry's id, the resource it
concerned, and **digests** of the before/after snapshots.

This is what makes erasure possible. A deletion request removes the personal data
from the journal; the chain still verifies, because it never held the data — only
proof of what it was. A ledger holding personal data cannot honour a deletion
request without destroying its own proof.

## What R3 is not

- **Not signed.** Tier 2 (acts signed by the acting principal's own key) needs
  principal key management, which arrives with R4/R6.
- **Not checkpointed.** Periodic signed roots published to external storage, so an
  auditor can verify without us, are a later addition — the chain is designed for
  them but does not have them.
- **Not correlated end to end.** `correlation_id` and `causation_id` are carried
  when a caller supplies them in `context`; nothing propagates them across modules
  yet. That is what makes a trace navigable, and it is its own piece of work.
- **Not a blockchain.** No consensus, no distribution. Ordinary cryptography.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/ledger/canonical.ts` | canonical form, hashing, `digestOpaque` |
| `packages/core/src/modules/audit_logs/services/ledgerService.ts` | `append()`, `verifyTenantChain()` |
| `packages/core/src/modules/audit_logs/data/entities.ts` | `LedgerEvent` |
| `packages/core/src/modules/audit_logs/migrations/Migration20260809170000.ts` | table, constraints, append-only triggers |
| `packages/core/src/modules/audit_logs/cli.ts` | `ledger:verify` |
