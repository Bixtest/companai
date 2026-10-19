# PLAN — `CC-136`: a platform act is a platform act

**Status: BUILT AND CLOSED 2026-10-19.** Requirement written 2026-10-19; owner ruling received the same
day: **option (a), teach the parser.** The row was opened by `CC-125`'s own build, which hit the hole
while writing the floor and documented it rather than closing it with a parser edit.

**Files changed:** `packages/shared/src/lib/auth/principal.ts` · `packages/core/src/modules/auth/lib/machineFloor.ts`
(docblock only) · `packages/create-app/template/src/modules/example_customers_sync/lib/{runtime,sync}.ts` ·
`packages/shared/src/lib/auth/__tests__/principal.test.ts` ·
`packages/core/src/modules/auth/services/__tests__/authorityEnforcement.machineFloor.test.ts`.

---

## 1. What the defect is, measured

`PrincipalKind` declares four kinds — `human`, `ai_worker`, `service`, `system`
(`shared/lib/auth/principal.ts:28`). Three of them can be produced from a subject string. The fourth
cannot:

```ts
export function parseSubject(subject: string): { kind: PrincipalKind; id: string } {
  if (subject.startsWith(AI_WORKER_SUBJECT_PREFIX)) return { kind: 'ai_worker', id: … }
  if (subject.startsWith(API_KEY_SUBJECT_PREFIX))  return { kind: 'service',   id: … }
  return { kind: 'human', id: subject }            // ← everything else, including `system:…`
}
```

`parseSubject('system:x')` answers `{ kind: 'human', id: 'system:x' }`. The kind exists in the type
system and has no producer — the same *"kind with no inhabitants"* shape `CC-107` fixed for `ai_worker`.

**The subject form is not hypothetical.** `packages/create-app/template/src/modules/example_customers_sync/lib/sync.ts:296`
and `runtime.ts:46` build `` `system:${origin}` `` today, so the shape exists in the wild with nothing
parsing it.

**Why it is a security defect and not a tidiness one.** `decideFor` takes a **subject string** and
parses it (`authorityEnforcementService.ts:422`), and `human` is the one kind the machine floor does
**not** bind (`machineFloor.ts:81`). So the platform acting on its own behalf is judged as a person,
and the seven capabilities no configuration may grant a machine are grantable to it.

## 2. ★ Two corrections to the row, both measured

**2.1 The row says "past both the floor and the ceiling". The ceiling half is wrong.** `CC-128`'s
ceiling is resolved by **tenant** (`capabilityCeiling.refusalsFor(scope.tenantId, required)`), not by
kind — it applies identically to every principal. The `system:` hole is a **floor** hole, and only a
floor hole. Recording the correction because a row that overstates its blast radius sends the next
reader looking in the wrong place.

**2.2 Fixing the parser alone would NOT fix the defect — `derivePrincipal` would still say `human`.**
This is the half the row did not name, and it is the whole reason the fix is two edits and not one.
`derivePrincipal` does not pass `parseSubject`'s kind through; it re-derives it:

```ts
const isService   = parsed.kind === 'service' || auth.isApiKey === true
const isAiWorker  = parsed.kind === 'ai_worker'
const isMachine   = isService || isAiWorker
…
kind: isAiWorker ? 'ai_worker' : isService ? 'service' : 'human',
```

A `system` subject falls through that final ternary to `'human'` — so teaching `parseSubject` the
prefix, and nothing else, would leave **every consumer of `auth.principal`** (the journal, the
preferences read, the effective-user helper) still calling a platform act a person. The parser and the
derivation are two producers of one fact, and both have to learn it.

## 3. The ruling it must obey

**Option (a), owner, 2026-10-19: teach `parseSubject` the `system:` prefix, and accept that
`principalIdOf` then returns the bare id for those subjects.** The alternative — leave the parser and
make the enforcement boundary carry the kind explicitly — was rejected because it leaves every
`system:` act silently human at every gate forever, and it would put the kind in a second place.

**What (a) costs, measured rather than asserted.** The row worried that the bare-id change would
change what the id columns hold for any stored `system:` row. Measured:

| Column | Type | Can it hold `system:…`? |
|---|---|---|
| `action_logs.actor_user_id` | **`uuid`** (`audit_logs/data/entities.ts:26`) | **No** — Postgres rejects it. A `system:` subject has never been storable there. |
| the authority family's `principal_id` columns | `text` | Yes — and they are written through `normalizePrincipalSubject`, which today returns the **prefixed** form for a `system` subject (its `prefixKind` has no `system` arm, so the prefix is not stripped). |

**So there is exactly one class of row the change could affect, and it is empty:** nothing writes a
`system:` subject into a `text` principal column today — the two producers put it in a request context
(`sub`, `userId`), not in a table. The change is a correction with **no data to migrate**, and the
verification is a grep rather than a migration.

## 4. The requirement

**R1 — the parser learns the prefix.** `parseSubject` gains a `system:` branch returning
`{ kind: 'system', id: <bare> }`. It is checked **first**, because `system:` is the shortest prefix and
a later check could never fire if a longer one matched.

**R2 — the derivation learns it too.** `derivePrincipal` produces `kind: 'system'` for such a subject,
with `onBehalfOfUserId: null` — the platform acts for nobody — and `id` the **bare** id, because
`system` is not backed by a credential (`isApiKeyBackedKind('system')` is false, so the key lookup must
not run).

**R3 — the write path learns it.** `normalizePrincipalSubject` gains a `system` arm to `prefixKind`,
so the three existing rules apply unchanged: an **agreeing** prefix is stripped and the bare id
returned · a **disagreeing** prefix and declared kind **throws** · a **bare** subject with any kind is
accepted. Its docblock's sentence — *"`human` and `system` take the bare id and no prefix is defined
for either"* — is **corrected**, not deleted: `human` still has no prefix; `system` now has one, and
the reason is written down.

**R4 — the encoding keeps one home.** A `systemSubject(id)` builder joins `apiKeySubject` and
`aiWorkerSubject`, and the two template producers use it instead of hand-rolling the string. The
module's own docblock already claims *"Nothing outside this module should build or parse this string"*;
today two files do.

**R5 — the floor's docblock stops apologising.** `machineFloor.ts:27-32` says the `system` entry is
*"currently unreachable"* and *"must not be read as coverage today"*. After this change that is false,
and the paragraph is replaced with what is now true: the entry is live, and the reason it is live is
`CC-136`.

**R6 — fail closed on a prefix with nothing behind it.** `system:` with an empty id throws, exactly as
the other two prefixes already do (`principalIdOf` returns `null` → *"a principal subject must name
somebody"*). A control asked *"may this act"* by an empty id must not get an answer derived from `''`.

**R7 — the three existing kinds do not move.** `api_key:` and `ai_worker:` answers are byte-identical,
and a **human** subject is still unbound by the floor. That last one is the regression that would be
worst and would be reverted by hand at 3 a.m.: the floor is a list of seven ids for machines, not a
blanket refusal.

## 5. The proof

1. `parseSubject('system:x')` → `{ kind: 'system', id: 'x' }`; `principalIdOf('system:x')` → `'x'`.
2. `derivePrincipal({ sub: 'system:x' })` → `kind: 'system'`, `id: 'x'`, `onBehalfOfUserId: null`.
3. `normalizePrincipalSubject('system:x', 'system')` → `'x'`; `('x', 'system')` → `'x'`;
   `('system:x', 'human')` → **throws**; `('system:', 'system')` → **throws**.
4. **The floor fires.** `decideFor('system:x', 'auth.acl.manage', scope)` is **not allowed**, and the
   reason names the machine floor rather than the grant.
5. **And it is a list, not a blanket.** The same subject is **allowed** a described capability that is
   not on the floor.
6. **A human is still unbound** by the floor for the same capability — asserted beside (4), so the fix
   cannot be read as "bind everybody".
7. `api_key:` and `ai_worker:` answers unchanged, asserted from the existing table.

**Mutations, each RED then restored byte-identical** (checksum captured first — `L187`; restore by
copy, never `git checkout --`):

| # | Mutation | What must go red |
|---|---|---|
| M1 | remove the `system:` branch from `parseSubject` | (1), (4) |
| M2 | keep the parser branch, drop the arm from `derivePrincipal`'s ternary | (2) |
| M3 | return the prefixed id from the `system:` branch | (1), (3) |
| M4 | drop the `system` arm from `normalizePrincipalSubject` | (3) |
| M5 | remove `system` from `FLOOR_BOUND_KINDS` | (4) |

## 6. What this does not do, and the debts it creates

- **It does not decide what a `system` principal may hold.** `loadAcl` has no `system` branch: a
  `system:` subject falls to the user lookup, where a non-uuid id is a Postgres cast error rather than
  a clean *"holds nothing"*. That is **pre-existing** — the prefixed id was equally not a uuid — and it
  belongs to `CC-120`, which owns *"a machine can hold access in its own right or only as somebody's
  hands"* and already records the same breakage in `api/ai/conversations/[conversationId]/route.ts:167`.
  Named here so the next reader does not think `CC-136` left it behind.
- **It does not change the CLI's actor.** A CLI has no principal at all; `null` remains correct there.
- **It does not fix `CC-137`** — a machine holding `auth.users.edit` can still pass on role tokens.
- **Debt, named:** the template producers pass the prefixed form in **`userId`** as well as `sub`. That
  is the *user* field, and after this change `effectiveUserId` correctly returns `null` for a system
  principal — so the explicit `userId` is the template overriding a correct answer with a string that
  is not a user id. It is not this row's to change (it is a behaviour change in an example module), and
  it is recorded rather than quietly left. **What the change did do, measured rather than assumed:**
  `derivePrincipal` no longer reads `auth.userId` for a `system` subject at all (`onBehalfOfUserId` is
  `null` for it), so the field can no longer make `effectiveUserId` answer with a non-user id. The two
  literals were replaced by the builder — the **same string**, so no behaviour moved — and the line now
  carries a comment saying what it is not. **What it did not do:** remove the field, because ~25 routes
  read `auth.userId` directly (`auth.userId ?? auth.sub`) and deleting it is an example-module behaviour
  change with its own blast radius.

---

## 7. What was proven, and how

| # | Claim | Where it is asserted |
|---|---|---|
| 1 | `parseSubject('system:x')` → `{ kind: 'system', id: 'x' }`; `principalIdOf('system:x')` → `'x'` | `principal.test.ts` — *the system subject* block |
| 2 | `derivePrincipal({ sub: 'system:x' })` → kind `system`, id `'x'`, `onBehalfOfUserId: null` | same block |
| 3 | `normalizePrincipalSubject` — agreeing prefix stripped · bare accepted · disagreeing throws · empty throws | same block, 4 of the 7 tests |
| 4 | **The floor fires**: `decideFor(systemSubject('x'), 'auth.roles.manage')` is **not allowed**, reason names the machine floor | `authorityEnforcement.machineFloor.test.ts` (the inverted hole test) |
| 5 | **And it is a list, not a blanket**: the same subject **is** allowed `ai_assistant.view` | same test, same run |
| 6 | A human is still unbound — asserted beside (4) by the existing table | `machineFloor.test.ts` |
| 7 | `api_key:` / `ai_worker:` answers byte-identical | `principal.test.ts`'s existing table, unchanged |

**Runs:** shared **210 suites / 2,601 tests** · core **659 suites / 5,800 tests, 0 failures** ·
`tsc --noEmit` exit **0** for `packages/shared` **and** `packages/core` · targeted re-runs green after
every restore (3 suites / 45 · 2 suites / 16).

## 8. The mutation run — 5/5 RED, every file restored checksum-verified

Checksums captured before the first edit (`L187`), restored **by copy**, never `git checkout --`.

| # | Mutation | Result |
|---|---|---|
| M1 | remove the `system:` branch from `parseSubject` | **RED** — shared 6 failed · core 1 failed |
| M2 | keep the parser branch, drop the `isSystem` arm from `derivePrincipal` | **RED** — shared 2 failed |
| M3 | return the prefixed id from the `system:` branch | **RED** — shared 5 failed |
| M4 | drop the `system` arm from `normalizePrincipalSubject` | **RED** — shared 1 failed |
| M5 | remove `system` from `FLOOR_BOUND_KINDS` | **RED** — core 2 failed (one per suite) |

**M2 is the one worth keeping.** It removes *only* the derivation half, and it turns exactly two tests
red while the parser tests stay green — which is the measurement that proves §2.2 was not a theory: the
row's own `FIX` line would have shipped a parser-only change and left every consumer of `auth.principal`
calling a platform act a person.

**And one instrument was found broken while proving this.** `scripts/__tests__/check-master-checklist.mutations.mjs`
reported `GREEN M8 — DID NOT APPLY` — its target text (`the unaddressed count is **80**`) had moved to
`49` at an earlier close, so the mutation could not fire. **A mutation that cannot fire is not a
proof** — the suite's own words. Re-aimed at the text as it stands; the suite is back to 14/14 RED with
its unmutated run PASS.
