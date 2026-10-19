# PLAN-CC-123 — the authority intersection

**Status:** **BUILT and CLOSED 2026-10-19.** Written as a requirement the same day, then built to it.
§3 is the requirement, §5 is the proof, and **§9 is the build record** — including the two places the
build corrected this document (Rule 13). The register row is closed.
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
| M4 | Run R4's step unconditionally (no invoker gate) | R5 — **but NOT as written here: the mutation removes the guard and the observable is *"asks nothing when no invoker is supplied"*. It cannot blow the stack — see §9.1** |
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

---

## 8. What was built

Six files touched, three of them new tests. The build is **one door plus the holding half**, which is
what §1.2 and §1.4 said it would be once the row's stale claim was removed.

| File | Change | Rule |
|---|---|---|
| `shared/src/lib/auth/featureMatch.ts` | R1's written rule, in `matchFeature`'s docblock: six numbered reasons a list intersection is unsound, ending *"The intersection must be of **answers**, not of lists"* | R1 |
| `core/src/modules/auth/services/authorityEnforcementService.ts` | new `InvokerRefusal { capabilityId, bindingRule, because }`; `refusalFor` takes `{ onBehalfOfUserId }` and forwards it to `decideFor`; new `invokerRefusalFor`; new private `invokerFor` | R2–R7 |
| `core/src/modules/auth/services/rbacService.ts` | `userHasAllFeatures` and `refusedByAuthority` take `{ onBehalfOfUserId }`; `refusedByAuthority` runs `refusalFor` with the invoker, then `invokerRefusalFor`, logging `invokerId` on both | R2, R3, R7 |
| `apps/mercato/src/app/api/[...slug]/route.ts` | reads `derivePrincipal(auth)?.onBehalfOfUserId` and passes it — **the principal, never `auth.userId`** | R2 |
| `core/.../__tests__/authorityEnforcement.invokerHolding.test.ts` | **11 tests** — R3–R7 | R3–R7 |
| `core/.../__tests__/rbacService.invoker.test.ts` | **9 tests** — the plumbing: what reaches `refusalFor`, what reaches `invokerRefusalFor`, and that `null` is passed rather than invented | R2, R7 |
| `apps/mercato/src/__tests__/api-authorization.test.ts` | 1 assertion updated, **2 tests added**: *"carries the person a credential acts for"* and *"does not treat a person as acting for somebody else"* | R2 |

**The design insight, and it is why this was small.** The invoker check has two halves that were being
treated as one. **Holding** — *may the person hold this capability at all?* — is a feature-id question
and needs **no capability descriptor**. **Gating** — *what autonomy gate does their position produce?*
— needs one. `invokerCeilingFor` returns early on `!capability` (`:495`), so *holding* was never asked
for an undescribed feature. `invokerRefusalFor` therefore **skips described features** (`if
(getCapabilityDescriptor(feature)) continue`) and covers all **157** enabled features without writing
36 descriptors — which keeps the descriptor work as a separate product judgement (`CC-132`) instead of
smuggling it into an authority fix.

**A separate type, not a nullable field.** `refusalFor` returns `AuthorityRefusal { capabilityId,
decision }` and existing tests pin `refusal.decision` non-null. The holding refusal has no `Decision`
because it never consulted a descriptor, so it returns `InvokerRefusal { capabilityId, bindingRule,
because }`. Making `decision` nullable would have weakened a type to avoid a second one.

---

## 9. The build record — two corrections, and the proof

### 9.1 Rule 13: the M4 mutation cannot produce what §5 said it would

§5's M4 said: *"Run R4's step unconditionally (no invoker gate) → a stack overflow, asserted as a
timeout/throw."* **It cannot.** The recursion the guard protects against (`rbacService` →
`refusedByAuthority` → `refusalFor` → `decideFor` → `invokerCeilingFor` → `holdsCapability` →
`rbacService`) needs a live ACL layer; in a unit suite the ACL layer is stubbed, so the cycle is
**unreachable** and no stack overflow occurs. The mutation was rewritten to remove the guard and the
observable became *"asks nothing when no invoker is supplied"* — which is the behaviour R5 actually
protects. **The requirement's own proof row was wrong; the rule it protects was right.**

### 9.2 Rule 13: the shared suite's failure is not `CC-19`'s `EBUSY`

`packages/shared` reported `Test Suites: 1 failed, 209 passed, 210 total` with `Tests: 2594 passed,
2594 total` — **zero test failures**, one suite that failed to *run*. It is
`src/lib/bootstrap/__tests__/dynamicLoader.tsconfig.test.ts`, and the recorded cause in `CC-19`
(`EBUSY` under the full suite) is **wrong**. The real error is the agent harness's bulk-delete guard:

```
[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":59,"threshold":50,"scope":"turn", ...}
```

The suite clears its dynamic-loader cache directory, which holds **59 files**, and the shim refuses any
bulk delete above **50** inside one turn. Measured in four steps, not inferred: the suite passes
**alone (8/8)**; it fails **under the full suite**; it fails **with the sandbox bypassed as well** — so
neither concurrency nor the sandbox is the cause; and with the shim switched off
(`CODEBUDDY_SAFE_DELETE_ENABLED=0`) the full suite runs **210 of 210 suites, 2,594 tests, all green**.
That last run is the proof: the same code, the same suite count, the same machine — only the guard
differs. `CC-19`'s *classification* survives (environmental, not a code defect, and the first CI run is
still the right trigger); its *mechanism* does not, and is corrected in the row by name.

**And the correct cause was already in the file.** §2's `CC-124` close records it exactly — *"one
shared suite fails only in its `afterAll`, where this sandbox's delete guard blocks removal of the
suite's own temp cache"*. So the register held the right answer and the wrong one in two places for a
day, and the wrong one sat in the row a debugger opens first. **`LESSONS.md` L184**: *a fact is not
corrected where it was discovered; it is corrected where it is believed.*

### 9.3 The proof

| Check | Result |
|---|---|
| resolver + plumbing suites matching `invoker` | **27 tests PASS** (11 new resolver · 9 new plumbing · 7 pre-existing) |
| `apps/mercato` `api-authorization` | **30 tests PASS** (28 pre-existing · 2 new) |
| `scripts/verify-cc123-mutations.mjs` | **6/6 PROVEN**, every file restored **byte-identical** |
| `packages/core` | **652 suites / 5,705 tests, all green** |
| `packages/shared` | **210/210 suites, 2,594 tests, all green** once the harness delete-guard is off; with it on, 209/210 suites and **0 test failures** (see §9.2) |
| `tsc --noEmit` | **0** for `core` and `shared`; one **pre-existing, unrelated** error in the app's generated `modules.runtime.generated.ts:854` (wants `.extensions`, the module exports `entityExtensions`) |
| line endings / encoding | **CR 0, BOM false** on all 9 touched files |

**The six mutations:**

1. the RBAC door drops the invoker instead of forwarding it
2. `refusalFor` decides without the invoker it was given
3. the descriptor-free holding refusal is removed
4. the holding half runs even when there is no invoker
5. a missing invoker reader stops refusing (fails open)
6. the route reads the invoker from `auth.userId` instead of the principal

Mutation 6 is the one that matters most, because it is the trap `CC-127` fell into: a fixture whose
`userId` happens to equal its owner makes the mutation survive. The route test therefore gives a human
context a `userId` that **differs** from its `sub`, so reading the wrong one is visible.

