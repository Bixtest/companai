# Knowledge base — how this platform actually works

**What this is.** Reusable know-how discovered by doing the work: platform
concepts, the recipes for common tasks, and the traps that cost us time. Not a
history and not a list of mistakes — those are [`JOURNAL.md`](../../JOURNAL.md)
and [`LESSONS.md`](../../LESSONS.md).

| Document | Answers |
|---|---|
| **`knowledge/`** (here) | *"How do I do X on this platform?"* |
| [`LESSONS.md`](../../LESSONS.md) | *"What went wrong, and how do I avoid it?"* |
| [`JOURNAL.md`](../../JOURNAL.md) | *"How did we get here?"* |
| [`references/`](../references/) | *"What is the plan for this phase?"* |

## What is here, and the order to read it

**If you are new: read [authority-overview.md](authority-overview.md) first.** It
is the governance layer end to end — the part of this project that does not exist
anywhere else — and every other entry below is a piece of it or a platform
mechanism it stands on.

### The governance layer — what we are building

| Read | Answers |
|---|---|
| 1. [authority-overview.md](authority-overview.md) | *"What happens when somebody tries to do something?"* — start here |
| 2. [principals.md](principals.md) | *"Who is acting?"* — person, service, AI worker, and the API-key traps |
| 3. [capabilities.md](capabilities.md) | *"What kind of act is this?"* — effect class, reversibility, data classes |
| 4. [authority-decisions.md](authority-decisions.md) | *"How much autonomy?"* — the resolver, the gates, enforcement, held acts |
| 5. [org-authority-graph.md](org-authority-graph.md) | *"What does the org structure permit?"* — typed edges and ceilings |
| 6. [approvals-queue.md](approvals-queue.md) | *"A gate stopped an act — now what?"* — the queue, and the two halves that must never merge |

### The platform underneath — what we inherited

| Read | Answers |
|---|---|
| [audited-writes.md](audited-writes.md) | *"How do I make a write that gets recorded?"* — and why it fails closed |
| [ledger.md](ledger.md) | *"How do we prove the record was not altered?"* |
| [scope-tenant-organization.md](scope-tenant-organization.md) | *"Which tenant and organization does this belong to?"* — and the one rule behind four bugs |
| [module-lifecycle.md](module-lifecycle.md) | *"How do I add, park or restore a module?"* |
| [overrides.md](overrides.md) | *"How do I change a module's behaviour without forking it?"* |

Read the first group in order and you understand the product. Read the second
when you need it — each is self-contained.

## Who this is for — including something that does not exist yet

Three readers, in order of how soon they arrive:

1. **Us, next month**, having forgotten how the override surface works.
2. **A developer handed this project cold**, per the standing rule that there is
   one place to start.
3. **The in-platform agents we intend to build** — the ones that will help users
   create their own fields, forms, and eventually whole modules.

The third reader is why the format is strict. An agent that helps a user build a
module needs to know *how this platform builds modules* — the real conventions,
the real constraints, the real failure modes. That knowledge is being discovered
right now, one batch at a time, and it is either captured while it is fresh or
reconstructed later at ten times the cost.

**So write every entry as if it will be handed to something that has never seen
the codebase and cannot ask a follow-up question.** State the constraint, show
the code, name what happens when you get it wrong.

## The rule

**Every batch adds what it discovered.** If a batch taught you how something
works — a mechanism, a convention, a non-obvious constraint — it becomes an entry
or an edit to one, in the same commit. A batch that leaves this stale is not
finished (COOKBOOK Rule zero).

Do not write speculative entries. Everything here should be **earned by work
actually done**, so the reader can trust it describes the platform rather than
someone's model of it.

## Entries

| Entry | What it covers |
|---|---|
| [audited-writes.md](audited-writes.md) | The two write paths, and how to make a write appear in the audit trail |
| [org-authority-graph.md](org-authority-graph.md) | Typed organization edges — how position in the structure bounds authority |
| [authority-decisions.md](authority-decisions.md) | Why an actor may or may not act — the resolver, its reasons, obligations and preflight |
| [capabilities.md](capabilities.md) | What kind of act a permission represents — effect class, reversibility, the autonomy ceiling |
| [ledger.md](ledger.md) | The append-only hash chain that proves the audit trail has not been altered |
| [scope-tenant-organization.md](scope-tenant-organization.md) | Tenant vs organization scoping, and why superadmins break naive code |
| [module-lifecycle.md](module-lifecycle.md) | Enabled, parked, deleted — what each actually changes |
| [overrides.md](overrides.md) | Turning off another module's contract without editing its source |
| [principals.md](principals.md) | Who is acting: human, service, and the AI worker we are adding |
| [approvals-queue.md](approvals-queue.md) | Where held acts go, what each gate offers a reader, and which settings deliberately do not exist |

## Template

```markdown
# <Topic>

**In one sentence.** <what this is>

**Why it matters.** <the consequence of not knowing it>

## How it works
<the mechanism, with real file paths and real code>

## How to do the common thing
<numbered steps, copy-pasteable>

## What goes wrong
| Symptom | Cause | Fix |
|---|---|---|

## Where the code lives
<paths, so a reader can verify rather than trust>
```

**Every claim carries a path.** A reader who cannot check a statement has to
believe it, and belief is how stale documentation survives.
