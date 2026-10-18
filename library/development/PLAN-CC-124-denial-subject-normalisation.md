# PLAN — `CC-124`: a denial written in the encoding the schema documents never applies

**Status:** requirement written, measured, ready to build. **Owner ruling needed:** none.
**Register:** `MASTER-CHECKLIST.md` §5 `CC-124` · **Opened:** 2026-10-18.

---

## 1. The defect, measured

**A denial naming a machine, in the form the entity's own docblock advertises, is written, audited and
never applied.** The ban does not ban.

The two halves of the path disagree about what a principal identifier looks like:

| | What it writes / reads | Evidence |
|---|---|---|
| **The write side** accepts whatever string the caller sends | `subjectPrincipalId: z.string().min(1).max(200)` — no normalisation, and the value goes to `em.create` untouched | `api/authority/denials/route.ts:35`, `services/denialService.ts:164` |
| **The schema advertises the prefixed form** | *"`subject_principal_id` is `text`, not `uuid`, for the same reason as delegations: an API key acting is `api_key:<id>`, and a `uuid` column would make machine actors undeniable, which is the opposite of what R1 was for."* | `data/entities.ts:964-966`, and the migration that created the column repeats it (`Migration20260812100000.ts:11`) |
| **The read side passes the bare id** | `parseSubject(userId).id` → `blocking(principalId, …)` | `services/rbacService.ts:529-532` (`withheldFromThisPerson`), `:567` (`grantedByDelegation`) |

So an administrator who follows the documented encoding — `subjectPrincipalId: "ai_worker:<key-id>"`,
`subjectKind: "ai_worker"` — writes a row the enforcement path never asks for. Nothing errors. The
denial appears in `GET`, appears in the CLI listing, and does nothing.

**Three consequences, all measured:**

1. **A machine cannot be denied.** `AI_WORKER_SUBJECT_PREFIX` was added so *"no ceiling, delegation,
   trust grant or denial could ever target a machine"* (`packages/shared/src/lib/auth/principal.ts:56-70`).
   The prefix exists; the denial lookup ignores it. The comment says the fix worked.
2. **A machine-grantee delegation is inert.** `grantedByDelegation` passes the bare id to
   `DelegationService.activeFor` (`delegationService.ts:62`), so a delegation granted to
   `ai_worker:<id>` is never found. **This one fails closed** — it refuses a grant that should have
   applied, never permits an act — which is why it survived unnoticed: nobody reports a missing
   permission they never exercised.
3. **The self-delegation ceiling check can be walked past.** `delegations/route.ts:185` compares
   `parsed.data.granteePrincipalId === principal.id`. For a machine, `principal.id` is
   `auth.keyId ?? parsed.id` — the **bare** key id (`principal.ts:133`). Submit
   `granteePrincipalId: "ai_worker:<same-key>"` and the strings differ, so a self-delegation with
   `authorityCeiling: null` passes — the exact authority-laundering shape that check was written to
   stop (`delegations/route.ts:177-190`). **Fail-open.**

**And the test that covers this seam cannot see it.** `services/__tests__/rbacService.denial.test.ts`
stubs `blocking` at `:24` — the exact line where the defect lives — so the wiring is provably wired
and the identifier it is wired with is unproven. A green claim over a subset, in the project's own
highest-traffic file.

---

## 2. The platform's own answer, found at source (the donor re-read)

The recorded `CC-124` hypothesis was *"store the prefixed subject"*. **Reading the platform's own
precedent first shows that is the wrong fix**, and the mistake is the same class as the one this
register keeps making: a second encoding of a thing that already has one.

`packages/core/src/modules/audit_logs/data/entities.ts:26-36`:

> **`actor_user_id` is a `uuid`, and the subject is narrowed to one on the way in: `api_key:<uuid>` is
> stored as the bare uuid. Without this column a key acting and a person acting are indistinguishable
> in the journal** — with `actor_kind` as the sibling column.

**The convention is: the identifier is the bare id; the kind lives in its own column, never inside the
id.** Every table in this family was built that way — `subject_kind`, `grantor_kind`/`grantee_kind`,
`principal_kind`, `actor_kind` — and the text columns exist precisely so the *id* stays a bare id
while a key is still first-class. The denial and delegation schemas have the kind columns. **The
schema was right and the write path was the thing that drifted.**

**HARVEST (from the donor, this repo's own audit entity):**
- the bare-id + kind column shape itself — the fix is to make the write and read paths agree with it,
  not to add a third encoding;
- `z.enum` kinds at the boundary (`:30` documents the four), so an unrecognised kind is unrepresentable;
- the narrowing comment style: *why* the id is bare, stated on the column, which is what stops the next
  person re-adding the prefix.

**REFUSED, by name — and this is the recorded hypothesis: storing the prefixed form.**
Storing `ai_worker:<id>` would (a) contradict `actor_user_id`'s convention for no gain, (b) make the
kind live in two places (`subject_kind` **and** the prefix) where they can disagree silently, and (c)
leave the delegation and membership encodings inconsistent with the journal, which is the one place
every row must reconcile. The columns are the design. **The bug is that nothing enforces it.**

---

## 3. The fix

### 3.1 One normaliser, in `shared`, beside `parseSubject`

`packages/shared/src/lib/auth/principal.ts` — the file that owns the encoding gets the guard on it:

```ts
/** The bare id of a principal subject, or null if it cannot be one. */
export function principalIdOf(subject: string): string | null
/** Throws with a message an operator can act on if the prefix and the declared kind disagree. */
export function normalizePrincipalSubject(subject: string, kind: PrincipalKind | null | undefined): string
```

Rules, in one place so the routes, the services and the tests all use the same answer:

1. A subject carrying a prefix whose kind **≠ the declared kind** is **rejected** — not normalised
   silently. A denial that was aimed at a machine and landed on a person is a worse bug than the one
   being fixed, so the mismatch is a `400` and never a guess.
2. A subject carrying the **agreeing** prefix is accepted and stored **bare**.
3. A bare subject with a machine kind is accepted — the bare id **is** the convention, and
   `subject_kind` carries the kind.
4. `human` and `system` take the bare id; `service` maps `api_key:`; `ai_worker` maps `ai_worker:`.
   **`system` has no prefix and no way to be addressed** — see §5.

### 3.2 Two routes reject at the boundary

`denials/route.ts` and `delegations/route.ts` validate the subject pair with the normaliser and
return `400` on disagreement, **before** the write. The route owns the message; the service owns the
storage.

### 3.3 Two services normalise as defence in depth

`DenialService.withhold` and `DelegationService.grant` normalise internally too, because both are
reachable directly (the CALLBACK test drives `withhold`; the CLI and any future internal caller can
reach `grant`). A caller that bypasses the route must not bypass the invariant.

### 3.4 Two lookups become kind-aware

`blocking(subjectPrincipalId, required, scope, kind)` and
`activeFor(granteePrincipalId, capabilityId, scope, kind)` add an optional kind. When present the
query narrows on it; when absent the behaviour is exactly today's. `rbacService` passes
`parseSubject(userId).kind` at both call sites (`:532`, `:571`) — it already computes it on the line
below, in the log fields.

**Why the kind is worth a query filter:** the id space of `users` and `api_keys` is disjoint today, so
the practical risk is theoretical — but the column is there, the alternative is a string that encodes
the same fact twice, and a control that matches on "an id, any kind" is the shape that fails the day
somebody seeds a fixture with a colliding uuid. **Documented risk of the filter itself:** a row whose
stored kind is wrong would stop applying — fail-open in the *other* direction. §3.5 is what makes that
impossible, and the migration is what repairs the rows that already exist.

### 3.5 One migration, and the fix for the documentation that caused this

`Migration20261018120000.ts`:
- `authority_denials.subject_principal_id`, `authority_delegations.grantor_principal_id` /
  `grantee_principal_id`, `authority_project_memberships.principal_id`: strip the prefix **when it
  agrees with the sibling kind column**; when it disagrees, leave the row and emit a warning — a row
  whose id and kind disagree is data nobody can act on, and rewriting either half would be a guess.
- Idempotent: a second run is a no-op (a bare id carries no prefix, so there is nothing to strip).
- **Rule 13, corrected after measuring: this section first claimed a unique index on
  `(tenant_id, subject_principal_id)` (`Migration20260812100000.ts:49`). It is a plain partial index —
  `where lifted_at is null` — and there is no `@Unique` decorator on `AuthorityDenial` in the entity
  either.** So there is no conflict to resolve and no run that can fail on one; two rows naming the
  same subject are already possible today, and for a *subtraction* a duplicate is harmless (two
  identical denials are one denial). The migration therefore needs no dedup logic, and claiming
  otherwise would have written a branch for a state the schema cannot hold.

**And the two documents that caused the defect are corrected in the same change**, because a docblock
that advertises an encoding the code does not honour is the defect's other half:
`data/entities.ts:964-966` and `Migration20260812100000.ts:11` are rewritten to state the convention
(*the id is bare; `subject_kind` carries the kind; a prefixed subject is accepted on write and stored
bare*), not to repeat the old claim.

### 3.6 Tests — each one named against a way this could stay broken

| Test | Fails if |
|---|---|
| `normalizePrincipalSubject` unit: agreeing prefix → bare; disagreeing prefix → throws; bare + machine kind → accepted; empty → throws | the normaliser is removed or made permissive |
| `rbacService`: a lookup for `ai_worker:<key>` calls `blocking` with the **bare id and the kind** | the read side reverts to the bare id alone (the current defect) |
| `denialService.withhold`: a prefixed subject is stored bare, with its kind | the write side drifts again |
| `delegations` route: `granteePrincipalId: "ai_worker:<key>"` with the actor's own key, no ceiling → **403** | the self-delegation walk-through reopens |
| migration test: a legacy `ai_worker:<id>` row is rewritten bare; a disagreeing row is left and warned; a second run is a no-op | the migration is lossy or non-idempotent |
| the existing `rbacService.denial.test.ts` suite still green | the refactor broke the subtraction ordering |

The rewrite of `rbacService.denial.test.ts`'s stub is **in scope**: the stub must start asserting the
arguments it receives, or the suite stays green over the exact line the defect lives on.

---

## 4. Fail-direction proof, branch by branch

The property this platform rests on: **a control can fail closed (refuse something that should be
allowed) and never open.**

| Branch after the fix | Direction |
|---|---|
| Prefix and kind agree | stores bare — matches the lookup |
| Prefix and kind disagree | `400`, nothing written — **fail closed** |
| Bare subject, machine kind | stored bare + kind — matches the lookup, kind-aware |
| Lookup: kind matches the row's | applies — correct |
| Lookup: kind does not match the row's | row not applied — **fail open** ← the one branch with a risk, and the migration + write validation are what make the row's kind trustworthy |
| Migration: disagreement | left untouched + warned — the row does not silently change meaning |
| Migration: a second run | no-op — a bare id carries no prefix |
| `system` actor | see §5 — unchanged from today, recorded, not silently worse |

---

## 5. Measured in the same pass, and deliberately not fixed here

Two findings of the same root cause, in a different failing direction. Recorded rather than folded in,
because folding them would make this change touch the trust ledger and a service with no production
callers on the same commit as a fail-open security fix.

1. **`trustService` evidence cannot ever come from a machine.** `evidenceFor` joins
   `action_logs.actor_user_id = principalId` (`trustService.ts:94`) — and `actor_user_id` is the
   **uuid** column the platform narrows to the bare id on the way in (`audit_logs/data/entities.ts:26-36`).
   Callers of the write side pass a free-form `principalId` string (`api/authority/trust/route.ts:45,91-93`).
   A machine's evidence is therefore empty **unless the caller sends the bare id** — and a promotion
   that requires evidence fails closed, so a machine can never be promoted through the UI unless the
   admin knows to strip the prefix by hand. **Fail closed, undocumented, and the same trap.**
2. **`AuthorityProjectMembership` has the same free-form `principal_id` + kind sibling**
   (`data/entities.ts:926-936`), written by `projectService.addMember(principalId, principalKind)`
   and read by `contextFor(recordId, principalId)` with `principal.id` — the bare id. Measured: the
   write path has **no production caller today** (only the DI wiring at `di.ts:107-114` and tests), so
   it is not a live fail-open. It is the same defect waiting for its first caller.

Both are recorded in the register as `CC-129` with their measurements, so the pattern — *free-form
principal string, kind in a sibling column, no agreement check between them* — is named once rather
than rediscovered three more times.

---

## 6. What this change does not claim

- It does not make `system` actors deniable or delegatable. `parseSubject` has no `system` prefix,
  so a CLI/scheduled-job actor reads as `human` kind with whatever id it carries. Folding a `system`
  prefix in here would touch every subject parse in the platform; it is a change of its own, and it is
  the honest boundary of this one.
- It does not prove the migrations run in order against a real-shaped database — that is `CC-119`, and
  this migration rides with it. What it proves is that the migration is idempotent, non-failing on
  conflict, and explicit about the rows it refuses to touch.
- It does not re-verify that `subject_kind` is written correctly by every historical caller of
  `withhold`. The migration warns on disagreement rather than trusting it.

---

*Written 2026-10-18, before any code. The donor read is §2 — the platform's own audit entity, and it
reversed the recorded hypothesis.*
