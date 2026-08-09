# Capability descriptors

**In one sentence.** Every permission also declares what *kind* of act it is —
how bad it is if it happens, whether it can be taken back, and whether it leaves
the company — so that authority can be reasoned about instead of merely listed.

**Why it matters.** A permission today is an id and a title: `api_keys.delete`,
"Delete API keys". That answers *may this actor do it* and nothing else. It
cannot answer *may a machine do it unattended*, *does a second person need to
confirm*, or *can we undo this tomorrow*. Those are the questions a governance
layer exists to answer, and they cannot be derived from a string.

**R4 is the vocabulary, not the gate.** Nothing here refuses an action yet. The
resolver that reads descriptors and returns a decision with reasons is R5.

## How it works

Descriptors live in each module's `acl.ts`, beside the feature they describe:

```ts
{
  id: 'api_keys.delete',
  title: 'Delete API keys',
  module: 'api_keys',
  capability: {
    effectClass: 'E6',
    reversibility: 'irreversible',
    dataClasses: ['secret'],
    delegable: false,
    note: 'Revocation. The row is soft-deleted and the hash survives, but nothing in the product restores it.',
  },
}
```

Same file, same line of sight: a new permission and its risk semantics get added
together, or the coverage guard notices.

### Effect classes

| Class | Meaning |
|---|---|
| **E0** | Read |
| **E1** | Write, internal, reversible |
| **E2** | Write, internal, irreversible or bulk |
| **E3** | External communication — leaves the company boundary |
| **E4** | Financial effect |
| **E5** | Security, identity, permission or charter change |
| **E6** | Destructive — deletion, revocation, teardown |

### Reversibility

`reversible` — the platform can put it back exactly.
`compensatable` — it cannot be undone, but a named act makes it right (a credit
note, a correcting email). **The compensation must be named**; one nobody named
is one nobody can perform, which is irreversibility wearing a friendlier word.
`irreversible` — nothing brings it back.

### The autonomy floor

`DEFAULT_AUTONOMY_FLOOR[effectClass][grade]` gives the **ceiling** — the most
autonomy anyone may ever have for an act of that class in work of that grade. It
is never a grant: an actor's real gate is this, further lowered by their own
ceiling, their charter and policy. Combining ceilings always takes the minimum
(`lowerCeiling`), because a rule that could raise one would make the table
advisory.

## How to do the common thing

### Describe a capability

Add `capability` to the feature in the module's `acl.ts`. Then read the rules
below, because the classification is the whole value and a wrong one is worse
than none — it authorises rather than merely failing to.

**Classify by the worst act the feature permits.** `attachments.manage` covers
upload *and* delete, and delete removes the file from storage. It is E6, not E1.
Anyone holding a feature holds everything it permits, so the descriptor describes
the ceiling of the set, not the common case.

**Read the code, not the name.** `configs.cache.manage` sounds destructive and is
genuinely reversible — it clears derived state that rebuilds itself.
`auth.sidebar.manage` sounds like a permission change and grants nothing.
`inbox_ops.settings.manage` sounds like a preferences page and sets the webhook
signing secret. Every one of those is decided by opening the route.

**State the surprises in `note`.** A future reader who disagrees with a
classification will either fix it or work around it; the note is what makes the
first outcome likely.

### Look one up

```ts
import { getCapabilityDescriptor } from '@open-mercato/shared/lib/capabilities/registry'

const descriptor = getCapabilityDescriptor('api_keys.delete')
```

The registry hydrates itself from the registered modules on first use — no
bootstrap wiring, so it cannot be silently missing.

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Guard: "must name the capability that compensates" | `compensatable` with no `compensation` | Name it, or mark it `irreversible` |
| Guard: "not an internal write" | `externalEffect: true` on E1/E2 | Anything leaving the company is E3 or higher |
| Guard: "a read is always reversible" | E0 with a non-reversible marking | A read changes nothing |
| Guard: "a reversible destructive act needs a note" | E6 marked reversible | If it is a soft delete, say so in `note` |
| `getCapabilityDescriptor` returns null | The feature has no descriptor yet | Check the coverage report; it may be in the undescribed set |

## Coverage

`packages/core/src/__tests__/capability-coverage.test.ts` prints, on every run:

```text
[capabilities] 113/113 features described (100%). Remaining: none
```

**Every feature of every enabled module is described**, and the guard asserts it.
The module set is computed, not listed — a new module cannot be added without
someone noticing it describes nothing. The denominator counts only enabled
modules; including parked ones would report a gap nobody intends to close.

Four things fail the build:

- a descriptor that contradicts itself (compensatable with no compensation, an
  irreversible read, an external act classified as an internal write)
- a feature with no descriptor
- an act marked `externalEffect` classified below E3
- a `compensation` pointing at a capability that does not exist — a promise
  nobody can keep, and worse than admitting the act is irreversible, because it
  reads as though a remedy were available

The last two are checked against the descriptors **as they ship**, loaded from
the modules. An earlier version of the guard validated invented descriptors and
merely counted the real ones, which would have let a contradictory descriptor sit
in a module indefinitely with a green suite.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/modules/capabilities.ts` | types, effect classes, the floor matrix, validation |
| `packages/shared/src/lib/capabilities/registry.ts` | registration, lookup, coverage measurement |
| `packages/core/src/modules/*/acl.ts` | the descriptors themselves |
| `packages/core/src/__tests__/capability-coverage.test.ts` | the guard and the coverage report |
