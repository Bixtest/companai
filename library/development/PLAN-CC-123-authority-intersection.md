# PLAN-CC-123 — the authority intersection

**Status:** REQUIREMENT ONLY, written 2026-10-19. **No code is written.** §3 is the requirement;
§5 is the proof the build will have to pass. The row stays open until both are done.
**Row:** `CC-123` in `library/development/MASTER-CHECKLIST.md` §5.
**Answers:** nothing — **D2 is already settled by default** (*the human half is read live, never
frozen*), and the code refuses to cache delegations for the same reason
(`services/rbacService.ts:496-505`).
**Sibling of** `CC-121` (the instance), `CC-125` (human-only / machine-only), and **`CC-132`** — the
coverage-guard defect this document measures and hands off rather than builds.

---

## 1. The defect, measured

The row makes four claims. Three survive re-measurement, **one is stale**, and the measurement found
a fifth fact that changes what the build actually is (Rule 1: code is the authority; Rule 13: a
number that changed gets its fix committed by name).

### 1.1 "Unsound as a list operation" — TRUE, and **no list operation exists**

The five breakages, each read at source:

| Breakage | Where | Why it breaks a set intersection |
|---|---|---|
| `*` is one string | `shared/lib/auth/featureMatch.ts:26` | `['*'] ∩ ['a.b'] = []`, but `*` already contains `a.b`. The intersection of two correct answers is wrong |
| `module.*` is a family | `:27-30` | `a.*` contains `a.b`, but as strings they are disjoint |
| **`prefix.*` also contains the bare prefix** | `:29` | `a.*` contains `a` itself (`required === prefix`). The row does not name this one |
| `.own` is a **separate capability** | `:43-60` | `x.y` and `x.y.own` are different and **neither satisfies the other** — deliberately, so a role can hold the ordinary feature without restricting it. Intersecting them yields an empty set that means the opposite of the truth |
| Superadmin short-circuit | `rbacService.ts:638-643` | `features: ['*']` is returned **before** the scope is read; there is no list to intersect |
| Denials subtracted **after** | `:508` | A denial is not in the granted list; it is a second answer applied afterwards. A list intersection cannot see it |
| Delegations added **after** | `:505` | The only branch that can turn `false` into `true`. It is consulted only after the ACL says no, so it is not in either list |

**But measured: no production code performs a list intersection.** A repo-wide search for
intersection helpers over feature lists finds only a nav-filter test and a role-editor filter
(`ui/src/backend/__tests__/nav-utils.test.ts:188`,
`customer_accounts/backend/.../roles/[id]/page.tsx:89`) — neither is an authority decision.

So the row is **a design constraint on the future, not a live bug**. Its real content is: *if anyone
ever writes `intersect(a.features, b.features)`, the answer will be wrong in at least six ways.* The
fix is to make sure that function is never written, and to say why at the one place somebody would
write it.

### 1.2 "`invokerCeilingFor` … is unwired" — **STALE. Two of the three doors already pass the invoker**

| Door | Call site | Invoker passed? |
|---|---|---|
| **Command gate** | `commands/interceptors.ts:222-227`, read at `:210-212` from `auth.principal.onBehalfOfUserId` | **YES** |
| **Tool door** (Hermes / MCP) | `ai-assistant/.../lib/tool-authority.ts:178-183`, via `responsibleUserIdFor` (`:54-60`) | **YES** |
| **HTTP route gate** | `apps/mercato/src/app/api/[...slug]/route.ts:215` → `rbacService.ts:613` → `refusalFor` → `decideFor` **with no options** | **NO** |

This is the correction that shrinks the row. `CC-123` is **not** a platform-wide wiring exercise. It
is **one door**, plus the reason that door cannot be fixed by editing it alone.

### 1.3 The one door that cannot pass it, and why

`userHasAllFeatures(userId, required, scope)` (`rbacService.ts:494`) has **no options parameter**.
It ends at `refusedByAuthority` (`:509`), which calls `refusalFor(userId, required, scope)` (`:613`),
which calls `decideFor(subject, feature, scope)` (`authorityEnforcementService.ts:236`) — **three
arguments**. So `options.onBehalfOfUserId` is `undefined`, and `invokerCeilingFor` returns `null` at
`:497`.

**Every route-gated request therefore judges a machine on its own key alone.** A key holding
`customers.*` whose owner holds only `customers.view` can, over HTTP, do everything the key's roles
allow — and nothing in that path compares the two.

There is a second, parallel check: `hasRequiredFeatures`
(`ai-assistant/.../lib/auth.ts:157-177`) — a granted-features match used by the meta tools
(`ai-tools/meta-pack.ts:121`, `:172`) and the action routes (`api/ai/actions/[id]/**`). It has no
invoker either. It is not the resolver's question, but it is the check that actually runs on those
paths today.

### 1.4 ★ The measurement that matters: **the chokepoint is blind for 36 enabled features**

Re-measured from source, all 50 `acl.ts` files, split by whether the module is enabled
(`apps/mercato/src/modules.ts`, the list the guard itself treats as authoritative):

| Bucket | Modules | Features | Described | Undescribed |
|---|---|---|---|---|
| Enabled, `packages/core/src/modules` | 25 (one empty) | **121** | **121** | 0 |
| Enabled, everywhere else | 8 | **36** | **0** | **36** |
| **Enabled total** | 33 | **157** | **121 (77%)** | **36 (23%)** |
| Parked (not enabled) | — | 101 | 0 | 101 |

The coverage guard prints `[capabilities] 121/121 features described (100%). Remaining: none` — and
that sentence is true **about a denominator that excludes 23% of the enabled surface**. Its
`modulesRoot` is `packages/core/src/modules` (`core/src/__tests__/capability-coverage.test.ts:30`),
so a module that ships in any other package is invisible to it. The guard's own comment says the
denominator "matters as much as the numerator" (`:36-39`) — and then fixes it to one package.

**The 36 it cannot see include all 8 `ai_assistant.*` features — the entire agent surface.** Also
`search.*` (6), `webhooks.*` (4), `scheduler.*` (3), `onboarding.*` (3), `channel_gmail.*` (2),
`channel_imap.*` (2), `example.*` (8).

Consequence, read at each door:

- `decideFor` returns `null` when no module describes the capability (`:266`);
- `refusalFor` treats `null` as *"a coverage gap, not a refusal"* and continues (`:237-240`);
- `checkToolAuthority` does the same (`tool-authority.ts:194-195`).

So **the tool door — the one door that passes the invoker correctly — cannot fire for 3 of the 5
features the tools actually require.** Measured from the tool and agent packs:

| Feature a tool requires | Described? |
|---|---|
| `ai_assistant.view` (every agent, `meta-pack`, `business-ir-pack`) | **NO** |
| `search.view` (`search-pack.ts:42`, `:84`) | **NO** |
| `customers.people.view` (`lib/tool-registry.ts`) | **NO** (and its module is parked) |
| `attachments.view` (`attachments-pack.ts:84`, `:136`) | yes |
| `attachments.manage` (`attachments-pack.ts:196`) | yes |

The door is correct and blind. That is the sharpest finding in this document, and it is why the
build cannot be "thread one more argument".

### 1.5 Nothing enforces by default, so the proof cannot be an observation

`DEFAULT_ENFORCEMENT_MODE = 'shadow'` (`authorityEnforcementService.ts:43`). `refusalFor` returns
`null` unless the tenant's mode is `enforce` (`:233`); the command gate returns unless `enforce`
(`interceptors.ts:200-204`); the tool door records and changes nothing in `shadow`
(`tool-authority.ts:200-210`).

**In every default deployment the intersection is evidence, not enforcement.** `CC-123` therefore
cannot be proven by watching production; it is proven at `enforce` mode in a test. `CC-123` does not
flip any tenant to `enforce` — it makes the rule correct so that flipping it is safe.

### 1.6 ★ A cycle that terminates only by coincidence

`di.ts:59-68` implements the invoker reader as:

```ts
async holdsCapability(userId, featureId, scope) {
  return rbac.userHasAllFeatures(userId, [featureId], { tenantId, organizationId })
}
```

`userHasAllFeatures` → `refusedByAuthority` → `refusalFor` → `decideFor` → `invokerCeilingFor` →
`holdsCapability`. **The cycle closes on itself.**

It terminates today for exactly one reason: `refusalFor` calls `decideFor` with **no options**
(`:236`), so the inner `invokerCeilingFor` returns `null` at `:497` and stops. That is not a design;
it is an accident of argument-passing. **Any change that makes `refusalFor` supply an invoker
unconditionally turns this into infinite recursion** — which is why §3's R4 is gated on *an invoker
being present*, and why R5 is a requirement rather than a note.

---

## 2. What "the intersection" actually is

Not a set. **One question, asked per capability:** given the actor and the person it acts for, what
is the lower of their two authorities, in the scope of the act?

`resolveDecision` already takes a minimum and nothing in it widens — the file says so where it
introduces the record-lock ceiling (`authorityEnforcementService.ts:318-329`). So the intersection is
**already computed correctly, once per capability, by the resolver**. The only defect is that one
door does not ask, and that the resolver cannot answer for 36 features.

The invoker half separates into two questions that the current code conflates:

| Question | Needs a capability descriptor? | Answered by |
|---|---|---|
| **Holding** — may the person hold this capability at all? | **No.** It is a feature-id question | `invokerAuthority.holdsCapability` |
| **Gating** — what gate (A0…A5) does the person's position produce? | **Yes** | `resolveDecision` |

`invokerCeilingFor` returns early on `!capability` (`:495`), so the *holding* question is never asked
for an undescribed feature. **That is the gap, and it is closable without writing 36 descriptors.**

---

## 3. The requirement

**R1 — No list intersection, ever.**
The five (six) breakages in §1.1 are recorded as a comment at the one place somebody would write the
helper: `shared/lib/auth/featureMatch.ts`, beside `matchFeature`. The rule is stated as a rule, not
enforced by a grep — a lint that guesses at intent produces noise, and the comment sits where the
decision is made.

**R2 — The HTTP route gate carries the invoker.**
`userHasAllFeatures` gains `options?: { onBehalfOfUserId?: string | null }`; `refusedByAuthority`
threads it; `refusalFor` accepts it and passes it to `decideFor`. The route reads it from
`derivePrincipal(auth)?.onBehalfOfUserId` (`principal.ts:216`) — **never from `auth.userId`**, because
`tool-authority.ts:40-48` measured `userId` as inconsistent across the door's construction sites
(sometimes `apikey:<id>`, sometimes a real user id). The auth boundary already computed it at
`shared/lib/auth/server.ts:281` (`sessionUserId ?? createdBy`) and put it on the principal at `:364`.

**R3 — `refusalFor` must not lose the invoker.**
With mode `enforce`, a machine subject whose invoker lacks the feature is refused; the **same subject
with no invoker is not** — the second half is what proves the invoker is the cause and not something
else.

**R4 — The holding half does not need a descriptor.**
When an invoker is present **and** no module describes the feature, ask
`holdsCapability(invoker, feature)` alone. `false` → refuse with binding rule
`invoker-lacks-capability`. `true` → no additional narrowing (the existing coverage gap is unchanged).
This is what makes the rule cover **all 157 enabled features** rather than the 121 described ones, and
it is the only part of this build that touches the 36.

**R5 — The cycle is made structural, not accidental.**
R4's step runs **only when an invoker is present**. A human subject has none (`principal.ts:216`
returns `null` for `human`), so `holdsCapability` → `userHasAllFeatures` → `refusalFor` re-enters with
no invoker, skips R4, and terminates. A test asserts the termination rather than trusting the
argument order.

**R6 — An unreadable invoker fails closed, in `enforce` only.**
Today a missing reader warns and returns `null` (`:502-508`) — **fail-open**. `checkToolAuthority`
takes the opposite position on the same infrastructure gap and refuses (`tool-authority.ts:163-172`).
Two doors, two answers. `CC-123` settles it: in `enforce`, an invoker that exists but cannot be read
is `A0`, because *an unreadable owner is not an unbounded owner*. In `shadow` the behaviour is
unchanged — R8.

**R7 — No tenant is switched to `enforce` by this build.** The rule is made correct; the switch stays
where it is.

**R8 — `shadow` behaviour is unchanged.** A route still passes in `shadow` with a machine whose
invoker lacks the feature; only the log line differs. This is the regression that would otherwise be
discovered by a customer.

---

## 4. What is deliberately **not** built

- **The 36 descriptors.** They are a product judgement (what effect class is
  `ai_assistant.conversations.share`?), and they are **not** needed for the intersection — only for
  autonomy gating. Handed off as **`CC-132`**, which also fixes the guard's denominator. Building
  them here would mix a classification exercise with a security fix and make the proof ambiguous.
- **Flipping a tenant to `enforce`.** R7.
- **Human-only / machine-only routes** — `CC-125`.
- **The actor/credential split** — `CC-121`. `CC-123` reads the invoker from the credential because
  that is where it lives today; when `CC-121` moves the actor, the reader moves with it and nothing in
  this rule changes shape.

---

## 5. The proof

Every rule gets a test that fails when the rule is removed — the `CC-127` standard, which found that
three of its first six mutations were failing because the *tests* were the defect.

| # | Mutation | Must go RED |
|---|---|---|
| M1 | Drop `options` from `userHasAllFeatures` → `refusedByAuthority` → `refusalFor` | R2/R3 |
| M2 | `refusalFor` passes no options to `decideFor` (revert to `:236`) | R3 |
| M3 | Remove the `invoker-lacks-capability` branch | R4 |
| M4 | Run R4's step unconditionally (no invoker gate) | R5 — a stack overflow, asserted as a timeout/throw |
| M5 | Restore `return null` on a missing reader | R6 |
| M6 | Read the invoker from `auth.userId` instead of the principal | R2 — and only fails if the fixture's `userId` differs from its owner, which is the trap `CC-127` hit |

Plus the denominators, asserted explicitly (L21 — a positional suite argument is a regex; the count is
the **last** number on the summary line):

- the route suite's total suite count,
- `authorityEnforcementService`'s suite count,
- `tsc --noEmit` at 0.

**A mutation whose test does not go red is a defect in the test, not in the rule** — measured twice in
`CC-127`, recorded as **L23** (*a mock that ignores its arguments cannot prove the filter it was
handed*).

---

## 6. Named debts

| Debt | Why it is not here | Where it goes |
|---|---|---|
| **36 enabled features have no descriptor**, and the guard that should catch it measures core only | It is a classification exercise with product judgement, and it is a **checker defect** of its own (`CC-101`'s class: a control that cannot see what it guards) | **`CC-132`** |
| `hasRequiredFeatures` (`ai-assistant/lib/auth.ts:157`) has no invoker | It is a *granted-features* check, not the resolver's question; the resolver runs beside it | Stated here; folded into `CC-123` only if a test shows the meta tools reach the resolver by no other path |
| A machine subject's `userId` is inconsistent across construction sites | Measured and documented at `tool-authority.ts:40-48`; fixing it is a rename across call sites | `CC-121` (the actor/credential split) |

---

## 7. The question, if any

**None.** Two defaults exist and are taken, because the platform already states them:

- **A machine never exceeds its owner over HTTP.** This is invariant **I4**, already written at
  `interceptors.ts:207-209` and already implemented at the command gate and the tool door. Extending
  it to the third door is not a new decision.
- **An unreadable owner is not an unbounded owner** (R6). `checkToolAuthority` already refuses on the
  same condition; `CC-123` makes the resolver agree with it.

Both are recorded here so that if either is wrong, it is wrong **by name** and can be reverted in one
place.
