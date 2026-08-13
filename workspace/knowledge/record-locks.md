# Locking a record

**In one sentence.** A record can be frozen or restricted, and no amount of
authority reaches past it.

**Why it matters.** Every other ceiling in the platform is about *who is acting*.
This one is about *what is being acted on* — a contract under dispute, a payroll
run that has closed, a case file frozen pending review. Those are properties of
the record, and no trust level, delegation or standing approval should lift them.

**Where it came from.** Excluding `packages/enterprise` in S2 removed record
locking from the platform entirely. This is not an enhancement; it restores a
control the fork dropped (graft **G5**).

---

## The three states

| State | Writes | Reads | Stored? |
|---|---|---|---|
| `open` | permitted | permitted | **No** — the row is deleted |
| `restricted` | need approval (`A2`) | permitted | Yes |
| `locked` | refused (`A0`) | permitted | Yes |

**Reads are exempt from both, and that is a decision.** A record nobody may read
is a record nobody can review before deciding whether to unlock it, and freezing a
contract should not hide it from the people arguing about it. Who may *read* a
record is already governed by RBAC and by the data classification on the
capability; this controls what may be *done* to it.

So the two constraining states differ precisely on writes: `restricted` means a
person has to agree first, `locked` means not at all.

## Setting one

```bash
# Freeze a record, with a reason somebody will read in the refusal
curl -X POST /api/auth/authority/record-locks   -H 'content-type: application/json'   -d '{"recordId":"<uuid>","state":"locked","reason":"pending the Q3 audit"}'

# Let it go again
curl -X POST /api/auth/authority/record-locks   -d '{"recordId":"<uuid>","state":"open"}'
```

Guarded by **`auth.records.lock`**, which is deliberately not delegable: somebody
who can pass on the power to freeze work has turned a control into a routing rule.
Unlocking is the same capability — splitting them would create a role that can
stop work and never restart it.

**Give a reason.** It is carried into the refusal the resolver returns. *"You may
not edit this"* is a support ticket; *"locked pending the Q3 audit"* is an answer
(invariant **I6**).

**There is no page yet.** A control belongs on each record's own screen, which is
per-entity work rather than one screen — `PROGRESS.md` item 17.

## Two design decisions worth knowing

**The lock is keyed on `(tenant_id, record_id)` and nothing else.** The obvious
design keys on entity type too, but the command bus carries a `capability` and no
entity type, so that would need a per-command declaration across every command —
the R4b mapping exercise again. Record ids are v4 UUIDs, so the id alone
identifies a record in any practical sense, and the gate reads `payload.id` from a
command it is already intercepting. `command_hint` is stored for display and is
**never** part of the key: two capabilities touching one record must produce one
lock.

The gate requires a **well-formed UUID** before looking anything up. A slug or a
numeric id from some other command's payload could otherwise collide with a
genuine record's lock and constrain the wrong thing.

**`open` is not stored.** Setting it deletes the row, so the table is a list of
what is constrained — the only question anybody asks of it. A table of mostly-open
rows would need every reader to filter them out, which is one more place to forget.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| A lock has no effect | The command's payload has no `id`, or it is not a UUID | Locks bind on acts that name a record. A create names none |
| A lock has no effect, and the payload *does* carry an id | The tenant is in `shadow` mode | Enforcement is per tenant: `mercato auth authority:mode --tenant <id>` |
| A read is refused | Not by this — reads are exempt | Look at RBAC and the capability's data classes |
| The refusal says only "permits at most A0" | No reason was given when locking | Pass `reason` when setting the state |

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/modules/record-locks.ts` | The states and what each permits, as pure functions |
| `packages/core/src/modules/auth/services/recordLockService.ts` | Reading and writing them |
| `packages/core/src/modules/auth/api/authority/record-locks/route.ts` | The API |
| `packages/core/src/modules/auth/services/authorityEnforcementService.ts` | `resourceCeilingFor` — where it reaches the resolver |
| `packages/core/src/modules/auth/commands/interceptors.ts` | `readRecordId` — where the record id comes from |

## Where to see it

`/backend/authority/record-locks`, gated on `auth.records.lock` — the same
capability that sets a lock, because its declaration already argues that
splitting lock from unlock would create a role that can stop work and never
restart it. Reading the list falls under the same argument: a lock refuses
writes from everybody, so somebody who can see one without lifting it can only
watch.

**This page is half the feature, and says so on itself.** Setting a lock belongs
on each record's own screen, next to the thing being frozen — per-entity work
across every entity, still to be built. What was missing and is now here is the
opposite question: a lock applies to *everybody*, so when a record refuses
writes and nobody remembers freezing it, there was nowhere at all to look. That
question is tenant-wide, so it gets a tenant-wide page.

**No history section**, unlike delegations and denials. `setState` writes the
current state rather than appending a row, so an unlocked record keeps nothing.
Showing "recently unlocked" would mean inventing a history the table does not
have.

Unlocking is `setState(recordId, 'open')` rather than deleting a row: `open` is
the absence of a restriction, and `list()` never returns one.

