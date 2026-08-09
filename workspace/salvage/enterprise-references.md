# Salvage analysis — `packages/enterprise` references

**Analysed:** 2026-08-08 · **Status: complete**
**Verdict: REMOVE the package. The MIT core has zero real dependencies on it.**
**Scope:** the *references*, not the package. Its source was never read — see below.

---

## Licence position

`packages/enterprise/LICENSE.md` is commercial software: evaluation-only, and it
forbids *"modify, refactor, reverse engineer, **derive from, or generate new
features based on**"* the package.

**Its source has not been read.** Everything below comes from the MIT half
looking outward, never from the commercial half looking in. The owner (a lawyer)
confirmed reading for lessons would be permissible; it has not been necessary, so
it has not been done.

---

## The finding: the isolation is architectural and deliberate

Four files outside the package mention `@open-mercato/enterprise`. **Two are
comments explaining why the code does *not* import it.**

### `core/modules/communication_channels/lib/oauth-state.ts`

```
Ported (re-implemented locally), NOT imported, from
packages/enterprise/src/modules/sso/lib/state-cookie.ts.
Root AGENTS.md rule: @open-mercato/core MUST NOT import from @open-mercato/enterprise.
```

The OAuth state-cookie helper was **re-implemented in the MIT half** — AES-256-GCM
with HKDF key derivation — precisely so the open core does not depend on the
commercial one.

### `packages/ui/src/backend/utils/optimisticLock.ts`

```
The enterprise record_locks 409 conflict code. Kept as a literal here so
core/UI stays enterprise-free (no import from @open-mercato/enterprise).
```

The UI knows how to *handle* a `record_lock_conflict` response if one arrives. It
does not import the thing that produces one. With the package gone, that response
simply never occurs.

### The other two

| File | What |
|---|---|
| `apps/mercato/src/modules.ts` | Registers the enterprise modules when the env flag is on |
| `packages/create-app/src/lib/templates/modules-ts.template` | The same registration in the new-app scaffold |

Both are configuration, not code dependencies.

**Correction to my own strip plan.** `strip-batches.md` S2 said *"The MIT core
contains a fail-closed delegation to the enterprise record-lock. Decide: remove
locking, or implement our own now."* That overstated it. There is **no
delegation** — only a conflict-code constant kept as a literal, and UI handling
for a response that will never arrive. Nothing to decide, nothing to unpick.

---

## What the MIT half actually loses

Confirmed from their public documentation, not from the package:

| Capability | Status after removal |
|---|---|
| **Record locking** | Gone. Replaced by graft **G5** — Platform 1's `lock_state` (open/restricted/locked) as a resolver floor input |
| **Single sign-on** | Gone. Our identity plan uses an external provider anyway |
| **Security add-ons** | Gone. Unknown contents; not read |
| **System status overlays** | Gone. UI convenience |

**G5 becomes more important than first credited.** It is not an enhancement to
Open Mercato's locking — it is the *replacement* for a capability we are removing.

---

## Removal steps

1. Delete `packages/enterprise/`.
2. Remove the enterprise entries from `apps/mercato/src/modules.ts`.
3. Remove them from `create-app`'s `modules-ts.template`.
4. Leave the two explanatory comments in place but reword them — they document a
   real design decision (*this was re-implemented rather than imported*) that stays
   true and useful after the package is gone.
5. Optional: clean the `OM_ENABLE_ENTERPRISE_MODULES*` plumbing from
   `packages/cli/src/lib/testing/`. Harmless if left; the flags simply resolve to
   `false` forever.
6. Generator, full gate.

**Expected difficulty: low.** This is the cleanest removal in Phase S, because
their own architecture rule — *"`@open-mercato/core` MUST NOT import from
`@open-mercato/enterprise`"* — was enforced consistently.

---

## A note worth carrying into our own design

Their open-core boundary is maintained by a **stated rule plus deliberate
duplication**: where the open half needed something the commercial half had, they
re-implemented it rather than importing it, and left a comment saying so.

That is the same discipline as our own *"dependencies = invocation, files = own
copies"* rule from `skills-main`. It costs duplication and buys a boundary that
does not silently erode.

If we ever ship a commercial layer over our own MIT core, this is the pattern to
copy — and the comments are the part that makes it survive contact with future
maintainers.
