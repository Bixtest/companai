# PLAN — `CC-125`: the machine floor

**Status: CLOSED 2026-10-19 — built, proven, and the build record is §8.**

The requirement was the last open question on the whole authority spine, and it was answered by the
owner on 2026-10-19 (*"we follow your recommendations"* — recorded as a ruling in
`PLAN-2026-10-18-one-agent.md` §4.5, not as a default). The five categories ARE the floor, and nothing
else is. `CC-128`'s ceiling — the prerequisite the row named — was already built and enforced, so the
floor is the one thing that stood between the ruling and code.

---

## 1. The requirement, restated from the ruling

**The five categories that change the authority system itself:**

1. minting or widening credentials
2. granting roles or writing delegations
3. editing the capability catalogue or the type bundles
4. writing to, or erasing, the audit ledger
5. anything that reaches across tenants

**A machine may never be configured to do any of them. A person may hold any of them** — somebody has
to mint the keys, grant the roles and edit the types; that is the system working, not a hole in it.

## 2. The measurement — five categories, and two are not what they sound like

Mapping the owner's five categories onto real capability ids took a measurement, and it found that
**two of the five do not exist in the shape the words suggest**. A floor that listed four of five and
said nothing would look complete.

| The category | The capability | What the measurement found |
|---|---|---|
| minting or widening credentials | `api_keys.create` | `api_keys.delete` is **excluded** — deleting a key *narrows*. Measured in the catalogue: `api_keys.create` / `api_keys.delete` / `api_keys.view` all exist. Named here so the omission reads as a decision. |
| granting roles or writing delegations | `auth.roles.manage`, `auth.delegations.manage`, `auth.acl.manage`, `auth.denials.manage` | **Expands to four**, because granting is expressed four ways. `auth.denials.manage` is included although it *sounds* subtractive: **lifting** a denial widens, and the capability is symmetric — a machine must not hold either end. |
| editing the catalogue or the type bundles | `ai_assistant.settings.manage` | Measured: **no `ai_assistant.agent_types.*` capability exists** (grepped every `acl.ts`). This one capability guards the type routes, the binding routes **and** the mutation-policy / loop-override / prompt-override routes — so a machine holding it could raise its own gate. That is the category in spirit and then some. |
| writing to, or erasing, the audit ledger | **none exists** | Measured: the audit capabilities are `audit_logs.view_self` / `view_tenant` / `view_private`, `undo_self` / `undo_tenant`, `redo_self` / `redo_tenant`. **Nothing can erase the ledger** — the correct end state, recorded as a finding rather than left as an empty row. |
| anything that reaches across tenants | `directory.tenants.manage` | The only capability whose effect is not confined to one tenant. |

**The arithmetic: 1 + 4 + 1 + 1 = seven ids behind five categories.** `MACHINE_FLOOR.size` is asserted
as 7 in `lib/__tests__/machineFloor.test.ts`, so the count cannot drift from the table again — an
earlier draft of the docblock said "six" while the map held seven, which is exactly the typed-count
failure this project keeps recording, caught during the close.

## 3. The design

**The floor is code, not data.** `CC-128` made the ceiling configuration — a table a platform admin
writes — because that is the right shape for every *business* capability. It is the wrong shape here:
a machine that could reach the ceiling table could raise its own ceiling. So the floor is a constant
in `packages/core/src/modules/auth/lib/machineFloor.ts`, and raising it costs an edit and a redeploy.

**It binds machines only.** `FLOOR_BOUND_KINDS = ['ai_worker', 'service', 'system']`. A `human` is
deliberately absent.

**It is checked in `decideFor`** (`authorityEnforcementService`), *before* the ceiling is consulted
for the answer and independent of it, because they answer different questions — the ceiling is *what
this tenant allows* (data), the floor is *what no configuration may ever allow a machine* (code).
A floor refusal reaches the resolver as `holdsCapability: false`, the same carrier `CC-128` uses,
because a floored capability is not *needs approval* — it is *not available to this actor*.

**When both refuse, the reason names the floor** — the one no configuration can lift. Naming the
ceiling would send an operator to raise a ceiling that would not help.

## 4. The proof plan

1. **The floor binds the three machine kinds and only them** — unit tests over the matrix.
2. **Every id on the floor is a capability some `acl.ts` actually declares** — the typo guard walks
   the same two roots the app ships from and collects every `id: '…'`. A floor that names a misspelt
   id is indistinguishable from one that covers nothing, and it fails *open*.
3. **The enforcement refuses a machine and allows a human** — through `decideFor`, with the real
   subject encoders, not string concatenation.
4. **Mutations, each RED then restored byte-identical** (checksum-verified):
   - **M1** — the floor severed from `holdsCapability` → 3 RED
   - **M2** — `service` removed from `FLOOR_BOUND_KINDS` → 2 RED
   - **M3** — `human` added to `FLOOR_BOUND_KINDS` → 2 RED
   - **M4** — one id removed from `MACHINE_FLOOR` → the size guard RED
5. **Blast radius** — the whole `auth` module and the whole `core` package.

## 5. What this does not do

- **No route classification.** The row's original framing — every route declares `human-only` /
  `machine-only` / `both` — is a **separate, still-open surface problem** (`CC-120`'s neighbour on the
  machine axis). The floor is the authority-level floor; per-route declaration is a different gate
  with its own vocabulary and its own requirement. This closes the *authority* half only.
- **No screen for the floor.** It is code. A screen would imply configuration, which is the one thing
  it must not be.

## 6. Named debts this creates

**`CC-136` — `system` is a principal kind with no producer.** `PrincipalKind` declares `'system'`
(`shared/lib/auth/principal.ts:28`) and `parseSubject` can never produce it: it recognises
`ai_worker:` and `api_key:` and calls everything else `human` (`:88-97`). Measured from two
directions — at the parser (`parseSubject('system:x')` → `{ kind: 'human', id: 'system:x' }`) and at
the resolver (`decideFor` allows a floor capability to a `system:` subject because it arrives as the
widest kind, past both floor and ceiling). The subject form is not hypothetical:
`packages/create-app/template/src/modules/example_customers_sync/lib/sync.ts` and `runtime.ts` build
`system:…` today. The fix is **not** a one-line parser change — `normalizePrincipalSubject`
documents the storage convention as *"human and system take the bare id and no prefix is defined for
either"*, so teaching the parser the prefix changes what the id columns hold, which is an
identity-model decision. **Registered as `CC-136`, open, needs the owner.**

**`CC-137` — "granting roles" is reachable through a capability the floor does not hold.** Found by
the hostile pass over the closed floor, measured from source rather than reasoned about: the direct
ACL writer (`PUT /api/auth/users/acl`, the route that writes `isSuperAdmin` and the feature list)
is guarded by **`auth.acl.manage`**, which is on the floor — that door is closed. But
`POST`/`PUT /api/auth/users` is guarded by **`auth.users.create` / `auth.users.edit`**, neither of
which is on the floor, and both accept a `roles` array that is checked by
`assertActorCanGrantRoleTokens` → `assertActorCanGrantRoles` (`api/users/route.ts:576-592`,
`lib/grantChecks.ts:48-90`) — a **subset check against the actor's own ACL**, returning early for a
superadmin. So a machine configured with `auth.users.edit` can pass on any role tokens it already
holds, and a machine configured with it **and** a wildcard role can grant any role to anybody. That
is *"granting roles"* — the owner's second category — without touching a floored capability. It did
not change the close (the floor is exactly the five the owner ruled, no more), and it is **not a
one-line fix**: the two options are (a) add `auth.users.create` + `auth.users.edit` to
`MACHINE_FLOOR`, or (b) move role assignment in the users route behind `auth.roles.manage` so one
capability means one door. **Registered as `CC-137`, open, needs the owner; recommendation: (b),
then (a) as belt-and-braces.** The floor file's own docblock points here so the next editor finds it.

---

## 7. Progress

- 2026-10-19 — the row was the register's NEXT; the ruling arrived; the design was written against
  `CC-128`'s ceiling as its model.
- 2026-10-19 — built: `machineFloor.ts`, the `decideFor` wiring, two suites (16 tests), docblocks
  corrected (six → seven), the service test's impossible `service:` subject fixed to use the real
  encoders, four mutations proven, and the register closed.

## 8. The build record

**What was built.** `packages/core/src/modules/auth/lib/machineFloor.ts` — `MACHINE_FLOOR` (7 ids,
each with its reason), `FLOOR_BOUND_KINDS`, `isFloorBoundKind`, `floorRefusalFor` (returns a
*message*, for the same reason `CC-128`'s ceiling does: an operator who reads "the actor does not
hold it" goes and grants it, which is the one thing that will not help).
`authorityEnforcementService.decideFor` takes the floor as a third narrow input beside the ceiling.
Two test suites: `lib/__tests__/machineFloor.test.ts` (9 tests, including the catalogue typo guard)
and `services/__tests__/authorityEnforcement.machineFloor.test.ts` (7 tests, including the
`system`-hole assertions that make `CC-136` visible in a red-green run).

**★ Two defects in the CC-125 work itself, both caught at the close and both fixed:**
1. **A test wrote a subject the platform cannot produce.** `decideFor('service:x')` is judged
   **human** — `service:` is not a subject prefix; a service principal authenticates as
   `api_key:<id>` and the *parser* decides the kind. The test that claimed to prove "nothing in the
   service can turn it off" was red for that reason — a test of a string, not of the rule. It now
   builds its subjects through `aiWorkerSubject` / `apiKeySubject`, the only two subject forms a
   machine can hold, and carries the reason in a comment.
2. **The prose said six and the table held seven.** `MACHINE_FLOOR.size` was 7 while the docblocks
   said "six ids behind five categories" — the typed-count drift this file exists to catch, in the
   file being closed. Corrected to the arithmetic (1 + 4 + 1 + 1), with the size guard as the pin.

**Proof.**
- The two CC-125 suites: **16/16 green**.
- The full `auth` module: **102 suites / 903 tests green**.
- The full `core` package: **656 suites / 5,772 tests, `Cached` bypassed by direct jest invocation,
  0 failures** (CC-128's close stood at 654 / 5,756 — the +2 suites / +16 tests are exactly CC-125's).
- `tsc --noEmit` on `core`: **exit 0** (the self-referencing `@open-mercato/core/...` import resolves).
- **Four mutations, all RED**, every file restored and **checksum-verified byte-identical**
  (`sha256sum -c` over all four touched files, 4×OK after each restore).
- One process note, mine: an intermediate restore used `git checkout --` on a file whose CC-125
  wiring was **uncommitted**, which silently reverted it to HEAD. It was rebuilt from the captured
  diff and proven identical by checksum — but the operational lesson is banked as `LESSONS.md` **L187**:
  capture a checksum and restore by copy, never by `git checkout`, while work is uncommitted.
