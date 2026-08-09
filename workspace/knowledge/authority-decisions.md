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
