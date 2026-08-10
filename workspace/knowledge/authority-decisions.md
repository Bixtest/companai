# Authority decisions

**In one sentence.** Asking whether an actor may do something returns a
*decision* — the gate, every rule that contributed, which one was binding, what
obligations follow, and what would change the answer — never a boolean.

**Why it matters.** Invariant **I6**: explainability is a return value. By the
time a `false` reaches the caller, the reason has already been discarded, and no
amount of logging bolted on afterwards recovers it. A system that can refuse but
not explain gets routed around by the people it is meant to protect.

**Not yet enforcing — but now running.** The existing RBAC still decides who may
do what. Since 2026-08-09 the resolver runs *beside* every real permission check
in shadow mode and records where it would differ. See **Shadow mode** below.

## The six gates

| Gate | Meaning |
|---|---|
| **A0** | Blocked — may not perform the act at all |
| **A1** | Propose — produces a proposal; a human performs the act |
| **A2** | Approve first — prepared, executes only after approval |
| **A3** | Hold and commit — executes into a hold window, commits unless vetoed |
| **A4** | Execute and review — takes effect immediately, enters a review queue |
| **A5** | Execute and log — takes effect, recorded, no queue |

## How it works

```ts
import { resolveDecision, explainDecision } from '@open-mercato/shared/lib/authority/decision'

const decision = resolveDecision({
  actor: { kind: 'ai_worker', id: 'nora', holdsCapability: true },
  capability: getCapabilityDescriptor('messages.email')!,
  context: { grade: 'G2' },
})
// → A2, binding rule 'effect-class-floor', obligations [approval, justification]
```

**Everything is a ceiling and the answer is the minimum.** There is deliberately
no rule anywhere that *raises* a gate. If one existed, every other rule would
become advisory and "what is the most this could ever be" would have no answer.
A test asserts this as a property across every combination of inputs, not as an
example.

### The rules, in order

| Rule | What it says |
|---|---|
| `grant` | The actor holds the capability at all. Without it, `A0` and nothing else is evaluated |
| `effect-class-floor` | The R4 matrix: what this class of act permits at this task grade |
| `irreversible-cap` | **I8** — an act nobody can undo is never decided after it happens. Caps at `A2` |
| `compensation-available` | Recorded when the act is compensatable, so the explanation says so |
| `trust-ceiling` / `untrusted-machine` | What the actor has earned — see below |
| `invoker-ceiling` | **I4** — authority is carried, never amplified |
| `delegation-ceiling` | The cap on the delegation being acted under |
| `resource-state` | What the record's own state permits |
| `policy` | Tenant policy |

The **binding rule** is the *first* rule to reach the final value, not the last.
"You do not hold this" explains more than "policy also capped it".

### The autonomy matrix bounds workers, not people acting on their own grant

The gates describe how much a **worker** may do unattended. `A1` is defined as
*"the worker produces a proposal; a human performs the act"* — if the actor *is*
that human, acting on a permission they hold, `A1` has no meaning: the thing it
asks for has already happened.

So the effect-class matrix and the irreversibility cap apply to **machines and
delegated authority**. A person exercising their own grant is bounded by the
other ceilings — the org graph, the record's state, the delegation they act
under, and tenant policy. Four-eyes on financial acts is a *policy* statement,
deliberately: that is a decision each company makes, not one this table imposes.

**This was wrong in the first version, and shadow mode found it.** Applying the
matrix to everyone put 45 of 45 observed human actions into a review queue or an
approval — including changing one's own sidebar layout, and a second person's
approval to edit a dictionary. A control that expensive is one somebody switches
off, taking the useful controls with it. The same traffic after the correction
produces nothing.

The effect class is still **recorded** for a human decision, just not binding —
dropping it would make a decision about a destructive act read exactly like one
about a read.

### A machine with no trust record does not get the benefit of the doubt

The trust model does not exist yet. Until it does, every AI worker and service
principal resolves as untrusted — capped at `A2`, so a person sees the act before
it happens.

This is a placeholder with a deliberate direction. One that erred the other way
would let machines act unattended precisely during the period when nothing is
measuring whether they should.

Humans are not capped this way: a person holding a permission is exercising their
own authority. That asymmetry is invariant **I2**, and it lives in the data the
resolver reads rather than in a branch that treats one kind of actor as special.

### Obligations are the difference between "no" and "yes, if"

Derived from the gate and the capability rather than configured per act — an
obligation somebody has to remember to attach is one that will be missing on the
act that needed it. A governance layer that can only say no gets switched off.

### Alternatives never promise more than removing the obstacle would give

`wouldYield` is computed as the *next strictest* rule, not `A5`. Lifting a
delegation cap does not unlock full autonomy if the effect class still caps it,
and an alternative that implied otherwise would be a lie the person only
discovers after doing the work.

## Shadow mode — running before enforcing

The resolver runs on every permission check and its answer is **recorded, never
obeyed**.

Enabling it outright would refuse requests that have always worked, in
production, with no evidence about how often or where. The resolver is new, one
of its inputs is a deliberately conservative placeholder (every machine actor is
capped at approve-first until a trust model exists), and nothing models task
grade yet. Shadow mode buys the evidence for the price of a log line.

**Where it hooks:** `RbacService.userHasAllFeatures`. All 102 permission call
sites in the platform reach a decision through that one method, so instrumenting
it covers every one — and every future one — without touching a caller. The
decision itself was split into a private `decideAllFeatures`, so the shadow runs
on a value already computed and physically cannot alter it.

**What it records**, by log line:

| Case | Meaning |
|---|---|
| `Resolver disagrees with RBAC` | The two answers differ on whether the act may happen at all |
| `Resolver would add an obligation` | Both allow it, but the resolver wants approval, review or a hold window. **The more interesting number** — this is the work the governance layer would begin doing on the day it is switched on |
| `Resolver agrees` (debug) | The expected case, available for measuring the ratio |

**Cost:** 526 ns per call, measured. A permission check does a cache or database
lookup, which is orders of magnitude more.

**Deliberately incomplete:** the shadow does *not* consult the organization
graph, because that would add a query per permission check for a diagnostic. It
therefore **understates** the eventual constraint, which is the safe direction
for a measurement whose purpose is to find surprises before they are enforced.

**Switch:** `OM_AUTHORITY_SHADOW=off`. On by default — evidence nobody collects
because a flag defaults to off is evidence nobody has.

### Reading what it found

```bash
corepack yarn mercato auth authority:shadow-report --log <server log file>
```

```text
Shadow observations: 412 over 2026-08-09T18:00Z → 2026-08-09T19:40Z
Capabilities exercised: 23

Disagreements (0) — enforcement would CHANGE these outcomes: none

Added obligations (18) — enforcement would ALLOW these, with a condition:
      12  attachments.manage                     irreversible-cap  (human)
       6  inbox_ops.replies.send                 effect-class-floor (ai_worker)
```

Read it as: **disagreements are what breaks on the day enforcement is switched
on; added obligations are what starts requiring a person.** Those are the two
numbers the enforcement decision rests on.

A log reader rather than a table, deliberately. The shadow is a temporary
measurement in service of one decision — giving it a schema, a migration and a
write per permission check would cost more than the decision is worth and would
outlive it.

**An empty report says why it is empty**: no permission checks since deployment,
the switch is off, or it is the wrong log. An empty report that looked like a
clean bill of health would be the worst possible output.

## Preflight — resolve the plan, not the act

```ts
import { resolvePlan, renderPlan } from '@open-mercato/shared/lib/authority/preflight'
```

```text
✓ research the customer            A5   proceeds
✓ create the CRM record            A4   proceeds, review queued
⏸ generate the contract            A2   needs approval — effect-class-floor
⏸ issue the invoice                A2   needs approval — effect-class-floor

2 approvals needed.
```

The dominant failure of an approval system is not that it refuses things. It is
that a worker stalls at step four of nine, at hour three, and somebody finds out
at hour nine — after which the controls get blamed and switched off. Resolving
the plan converts that into one batched decision made up front.

Two details that matter:

- **Every step is resolved even after one is blocked.** Stopping at the first
  obstacle reproduces the drip-feed of requests this exists to prevent.
- **Approvals are counted per capability, not per occurrence.** Approving the
  same act five times in one plan is one decision a person makes.
- **`A3` counts as proceeding.** It commits on its own unless somebody objects,
  which is a notification, not a gate.

## See it

```bash
corepack yarn mercato auth authority:explain --capability attachments.manage --actor ai_worker
corepack yarn mercato auth authority:explain --capability messages.email --actor human --grade G3
corepack yarn mercato auth authority:explain --capability api_keys.delete --without-grant
```

It resolves the real descriptors, so what it prints is what the platform actually
believes about the act.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| "No capability descriptor for X" | The id is wrong, or the module is parked | Every enabled module describes every feature — check the id |
| A gate lower than expected for a worker | No trust record, so `untrusted-machine` caps it at A2 | Expected until the trust model lands |
| An alternative that promises `A5` | A bug — alternatives are capped by the next strictest rule | Check `deriveAlternatives` |
| The explanation and the gate disagree | Impossible by construction: the sentence is generated from the same decision | If it happens, the decision was mutated after resolving |

## What R5 is not

- **Not enforcing.** No request path calls it yet.
- **No trust vectors, charters, budgets or incident states.** Each is a named,
  optional input on `ResolveInput` — absent means "not consulted", never
  "unlimited".
- **No org-graph ceilings.** That is R6.
- **No dual control.** It needs amount binding, which needs a financial module.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/authority/decision.ts` | the resolver, obligations, alternatives, explanation |
| `packages/shared/src/lib/authority/preflight.ts` | plan resolution and its rendering |
| `packages/core/src/modules/auth/cli.ts` | `authority:explain` |

## Enforcement — when the resolver's answer starts binding

**Three modes, per tenant**, stored in `module_configs` under
`auth` / `authority.enforcement`:

| Mode | What runs | What binds |
|---|---|---|
| `off` | nothing | nothing |
| `shadow` **(default)** | the resolver, beside the real answer, recording where it would differ | nothing |
| `enforce` | the resolver, with the organization graph | **refusals** |

```bash
mercato auth authority:mode --tenant <id>                  # read
mercato auth authority:mode --tenant <id> --set enforce    # switch
```

Per tenant, because one customer's evidence says nothing about another
customer's graph. Default `shadow`, because enforcement is a decision an operator
makes against their own traffic — not something that arrives with an upgrade and
starts refusing requests on a Tuesday.

### What is enforced, and what is not

**Refusals bind. `A1` and `A2` now bind too. `A3` and `A4` still do not.**

| Gate | Meaning | Enforced? |
|---|---|---|
| `A0` | Blocked | **Yes** — the route guard refuses |
| `A1` | Propose; a human performs | **Yes** — the act is held for approval |
| `A2` | Approve first | **Yes** — the act is held for approval |
| `A3` | Hold and commit unless vetoed | No — needs a scheduler to commit on expiry |
| `A4` | Execute, then review | **Yes** — the act runs and is filed for review |
| `A5` | Execute and log | Nothing to enforce |

A3 is not "the approval queue with a different timer". It executes into a hold
window and **commits** when the window passes unless somebody objects — the
opposite of expiry, and it needs a scheduler rather than a queue.

The CLI says which is which when you switch a tenant on. Say it out loud rather
than let somebody infer a guarantee that is not there.

### How an act is held

The seam is the **command bus**, not the HTTP route:

1. A command declares `capability` — the `acl.ts` feature it performs. The
   resolver is keyed by capability and the bus by command, and without this
   declaration the two cannot be connected. **Opt-in**: an undeclared command is
   not gated, and the gap is visible rather than guessed at.

   **Take the value from the route, never from the command id.** Every CRUD
   route declares both the command it calls (`actions.*.commandId`) and the
   feature that guards it (`metadata.*.requireFeatures`) — that pairing is
   evidence. The naming convention is not: `catalog.offers.*` is guarded by
   `sales.channels.manage`, `customers.addresses.*` by
   `customers.activities.manage`, `auth.users.update` by `auth.users.edit`. A
   regular expression would have got all three wrong.

   21 commands across the enabled modules are mapped. Parked modules are not —
   see [parked-modules.md](../references/parked-modules.md), because restoring a
   module otherwise restores an ungated write path.
2. `auth.authority-command-gate` (a `beforeExecute` interceptor) resolves the
   decision, and on `A1`/`A2` writes an `authority_pending_acts` row and throws
   `ActHeldForApprovalError` carrying the pending-act id.
3. Approving replays `commandBus.execute` with the stored input, marked with a
   symbol the gate recognises so it is not held a second time.

The capability travels **from the bus**, on the interceptor context, rather than
being looked up again from the command registry. An interceptor that re-reads the
registry is one bundling accident away from seeing a different instance and
concluding the command declares nothing — and for a gate, *"declares nothing"*
and *"I could not see the declaration"* have opposite consequences. That is not
hypothetical: it is what happened on the first live run, and the act it should
have held went through.

A held act answers **202**, with the pending-act id and the reason. Not 403 —
the caller may well end up performing it. Not 500, which is what a plain thrown
error produced before and is the worst of the three: it invites a retry, and each
retry queues another copy.

Why the bus rather than the route: an act that can be *undone* is an act that can
be *replayed*, and the platform already models exactly that — snapshots, redo,
and command inputs already persisted and already covered by the encryption map.
Capturing HTTP requests instead would store raw bodies (passwords among them) and
re-run guards and interceptors on replay.

### Who is accountable for an approved act

The act runs **as the approver**, in the **proposer's organization**.

Approval means somebody takes responsibility — planning 02 §5.2 asks for *"an
accountable human approves, and that approval is a signed act"* — and
reconstructing a proposer's session from two stored columns would be fabricating
one. But the scope is the proposer's, so an act proposed for one organization
cannot land in another because the approver was looking elsewhere.

Both the approval and the resulting act are audited.

### Expiry is mandatory

Every held act carries a deadline (24h), and an expired act cannot be approved —
it has to be proposed again. Planning 02 §7.2: *"expiry escalates rather than
silently blocking work forever"*. Expiry is applied **on read** rather than by a
scheduler, because deadlines that only hold when background workers are healthy
are not deadlines.

### What the queue is not yet

Planning 02 §7.2 asks for more than a list, and none of it exists: ordering by
grade then deadline risk, bulk-approve with a diff, absence-aware routing to a
declared delegate, standing approvals, and a single inbox combining approvals,
reviews, escalations and blocked work. Today there is an API and a deadline. The
shape of the inbox is a product decision, and it is its own backlog item.

### Enforcement can only narrow

It runs **after** the existing RBAC check has already returned `true`:

```ts
const allowed = await this.decideAllFeatures(userId, required, scope)
this.shadowResolver(userId, required, scope, allowed)
if (!allowed) return false                       // RBAC refused; nothing here can widen
return !(await this.refusedByAuthority(...))     // the resolver may subtract
```

That ordering is the guarantee, not a convention. There is no path through
`RbacService` that lets the resolver turn a `false` into a `true`, so "could
enforcement grant something?" is a question you answer by reading four lines.

`userHasAllFeatures` is the single funnel every permission decision in the
platform reaches, which is why the switch lives there and nowhere else.

### A failure is not a denial

If the graph or the tenant's mode cannot be read, the call **throws**. It does
not return "no ceiling" and it does not return "refused".

An infrastructure failure is not a permission answer — the platform already
takes that position for session resolution — and both alternatives are worse.
Inventing an allowance disables the control exactly when something is wrong.
Inventing a refusal tells a person they lack a permission they hold, which they
will believe.

### Every refusal says why

```json
{"level":40,"name":"authority","component":"enforcement",
 "capability":"directory.organizations.view",
 "bindingRule":"graph-ceiling",
 "because":"inheritance is none, so nothing flows down, an 'advises' relationship permits at most A2"}
```

A 403 whose reason lives only inside a resolver is precisely what R5 exists to
abolish. Enforcement would have reintroduced it if the answer left no trace on
the way out.

### The cost per check

One cached graph-ceiling read, keyed by tenant + organization + capability and
dropped whole-tenant whenever an edge changes. The uncached answer is two
queries; the mode read is served by `ModuleConfigService`'s own 60-second cache.

**In-process caches do not hear each other.** Setting the mode from the CLI takes
up to a minute to reach a running server, and a deployment with more than one
process needs a shared cache (Redis) for the switch to land everywhere at once.

### What would have to exist before more of this binds

- **Obligations** — an approval queue that can hold an arbitrary act and resume
  it. Today only `inbox_ops` can do this, and only for AI proposals.
- ~~A data-classification floor~~ — **done 2026-08-10**, and not the way it
  looked. See below.
- **A trust vector** — `untrusted-machine` is a placeholder standing in for the
  whole of planning 02 §5.

## What an act touches decides how much it matters

A capability declares the data classes it handles. Those raise the **task
grade**, and the grade is what the effect-class matrix reads:

| Class | Grade floor | The phrase in planning 02 §3 |
|---|---|---|
| `public` | G0 | *"no external effect, negligible value"* |
| `internal` | G1 | *"internal records"* |
| `confidential` | G2 | *"reputational exposure"* |
| `personal` | G2 | *"personal data"* |
| `secret` | G3 | *"security changes"* — credentials, mailboxes, keys |

So an AI worker reading a dictionary resolves at **A5**, and the same worker
reading integration credentials resolves at **A4** — `E0 / G3` — the read
happens and enters a review queue.

### Why it is a grade and not a ceiling of its own

§6.1 lists `matrix_by_classification` among the floors, which reads like an
instruction to build a second table mapping classes to gates. That table would
have needed numbers with no source, which is why this sat on the backlog.

§8's worked example settles it: *"Research AI worker, T4, reading confidential
contracts for a G3 legal matter — `E0 / G3 → floor A4`"*. The classification is
already doing its work by raising the grade. One table, already written down,
already tested, instead of a second one somebody invented.

**The general lesson**: when a design document names an input twice in different
shapes, the worked example is the one that tells you which shape was meant.

### Grades only ever go up

`max(what the caller asked for, what the data requires)`. Planning 02 §5:
*"raising a grade: any participant, no approval, always allowed"*, while lowering
one needs authority at the original grade and is itself a recorded act.

So a caller may add weight to a piece of work and **cannot talk the resolver down
below what it is reading**. A tenant that thinks `secret` deserves G4 can say so;
nobody can quietly make it G1.

### It does not bind people

Invariant I2 again: the matrix bounds machines and delegated authority, so
grading the work harder does not start gating a person reading their own
company's credentials. What bounds them is whether they hold the capability, and
policy.

## A4 — the act runs, and somebody still has to look

*Execute and review* is the opposite shape from a held act: it has already
happened. So it is a different table, `authority_act_reviews`, not a status on
`authority_acts`. One table whose rows mean "not yet" or "already did" depending
on a column is how a schema starts lying to whoever reads it next.

```
beforeExecute   gate is A4 → do not hold; carry the decision forward as metadata
                the act runs normally
afterExecute    file a review row: what ran, who ran it, why it was reviewable,
                and the action-log id so a reviewer reads the change itself
```

The decision is carried from `beforeExecute` rather than re-resolved afterwards.
Re-resolving would answer *what the rules say now*, which can differ from the
reason the act was reviewable in the first place.

**Filing never throws at the caller.** The write has already committed, and
failing the request would tell somebody their change did not land when it did. A
missing review row is a real gap; lying about a successful write to report it is
a worse one. It is logged at error level instead.

**No deadline, unlike a held act.** An approval nobody answers has work blocked
behind it and must expire. A review nobody does blocks nothing, and an unreviewed
act is exactly what somebody should still be able to find next quarter.

**One endpoint, two lists.** `GET /api/auth/authority/pending-acts` returns
`items` (not yet happened) and `reviews` (already happened). Planning 02 §9 asks
for one inbox rather than four screens, and this is where that starts — but they
stay distinguishable, because confusing "stop this" with "check this" in either
direction is how a queue loses its meaning.

Marking one looked-at: `POST` the same endpoint with `decision: "reviewed"`. It
runs nothing and undoes nothing. Compensating an act is undo, which the command
bus already provides, and is a separate deliberate step.

