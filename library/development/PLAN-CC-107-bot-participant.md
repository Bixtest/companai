# PLAN — `CC-107` / `SR-07`: a bot is a participant, not a column on the container

**Status:** OPEN — plan written 2026-10-17 (night). **The donor re-read corrected the register row,
and the chain read found a live defect. Both are in §1 and §3; read them before trusting the row.**

Source pin for the donor: `library/architecture/platforms/_extracted/zulip-main/`
(extracted from `platforms/zulip-main.zip`, md5 `f9cea131769925ceb01e64ea78c4113e`,
63,499,938 B — see `library/architecture/zulip-forensics/00-PIN-AND-METHOD.md`).

---

## 1. THE DONOR RE-READ — and it corrects the register

The register's `HARVEST` instruction says, verbatim:

> *"HARVEST: TWO PARTIAL UNIQUE INDEXES, NOT ONE — a plain unique over (tenant, conv, user_id,
> agent_id) will not dedupe agents because Postgres treats NULLs as distinct, so mirror
> streams.py:410-418: unique (tenant, conv, user_id) where user_id is not null PLUS unique
> (tenant, conv, agent_id) where agent_id is not null"*

**That is not what the donor does at those lines, or anywhere.** Measured from the source:

| Citation | What the source actually holds | Verdict |
|---|---|---|
| `zerver/models/streams.py:410-418` | notification-preference fields (`email_notifications`, `wildcard_mentions_notify`, …), then `class Meta:` with **`unique_together = ("user_profile", "recipient")`** at :411, and a **partial, NON-unique** `models.Index(fields=("recipient","user_profile"), condition=Q(active=True, is_user_active=True))` at :414-418 | **✗ the cited range holds ONE plain unique and one partial non-unique index** |
| `zerver/models/streams.py:377-378` | `user_profile = models.ForeignKey(UserProfile, on_delete=CASCADE)` and `recipient = models.ForeignKey(Recipient, on_delete=CASCADE)` — **two non-nullable FKs, one membership row** | ✓ |
| `zerver/models/users.py:556` | `is_bot = models.BooleanField(default=False, db_index=True)`, with `bot_owner = models.ForeignKey("self", null=True, on_delete=SET_NULL)` at :558 | ✓ — and this is the load-bearing one |
| `zerver/models/recipients.py:48-49` | `class Meta: unique_together = ("type", "type_id")` — the polymorphism is on the **audience** (`Recipient`), not the member | ✓ |
| `zerver/lib/subscription_info.py:654` | `(zerver_userprofile.is_bot OR (NOT zerver_userprofile.long_term_idle))` | ✓ — and see §1.2 |

**`is_bot` has 277 usages across `zerver/`.** A Zulip bot is a **`UserProfile` row**. It joins a
conversation through the **same** `Subscription.user_profile` FK a human uses, under the **same**
`unique_together ("user_profile", "recipient")` key, with the same non-nullability. There is **no
second identity axis** for agents in the donor, and therefore **no two-partial-index trick to
mirror**. A search for the pattern across `zerver/models/*.py` finds partial unique constraints only
for *soft-delete exclusions* (`channel_folders.py:26`:
`UniqueConstraint(Lower("name"), "realm", condition=Q(is_archived=False), …)`) and never for a
nullable human/agent discriminator.

### 1.1 Why this matters more than a wrong citation

The register's own **REFUSED** list contains *"making agents rows in the auth User table (they have
no password or email; zulip pays for it with is_bot/bot_type/bot_owner triples)"*. **Refusing that is
what creates the split the two-index design solves.** So:

- The two partial unique indexes are **correct engineering for OUR schema** — Postgres really does
  treat NULLs as distinct, and a single membership table with both a nullable `user_id` and a
  nullable `agent_id` cannot dedupe agent rows under one plain unique.
- But they are **ours, not the donor's**. The donor needs no such trick because it refuses the split
  in the first place.

**The transferable rule:** when a register row's HARVEST and its REFUSED list interact, the harvest is
conditional on the refusal — and "as the donor does" can describe something the donor does not do.
The design here must be justified on its own terms, and that is what §4 does.

### 1.2 The third harvest is conditional in the same way

*"exempt agents from idle-pruning (`subscription_info.py:654`)"* — in the donor that predicate reads
`is_bot` **off the joined `zerver_userprofile` row**, which is only possible because a bot *is* a
user row. We have no `is_bot` column and are refusing to add one, so the analogue must be written
against an agent's own row. Same shape, different source table — harvest the **rule** (a participant
that is not a person is not subject to human idle-pruning), not the SQL.

---

## 2. WHAT OUR CODE IS TODAY — measured, not recalled

| Fact | Where | Value |
|---|---|---|
| Participant table | `data/entities.ts:806` | `ai_chat_conversation_participants` |
| Owner column | `entities.ts:847` | `user_id: uuid`, **required, non-nullable** — `@Property({ name: 'user_id', type: 'uuid' }) userId!: string` |
| Agent column | — | **does not exist** |
| Uniqueness today | `entities.ts:808-816` | **TWO** partial unique indexes on `(tenant_id, organization_id, conversation_id, user_id)`, split on `organization_id is null` — the **ORG** split, not a human/agent split |
| Access predicate | `AiChatConversationRepository.ts:770-776` | `canManageConversations(ctx) \|\| row.ownerUserId === ctx.userId \|\| isParticipant` |
| Participant read | `:735-754` `loadParticipantFlag` | `findOne({ tenantId, conversationId, userId, deletedAt: null, organizationId? })` |
| List filter | `:228-247` | a pre-fetch of the caller's participant `conversationId`s, then `where.$or = [{ownerUserId}, {conversationId: {$in: …}}]` |
| Writer | `createOrGet` | writes exactly **one** row, `userId = ctx.userId`, `role = 'owner'`, transactionally with the conversation |
| Revoke route | `api/ai/conversations/[conversationId]/participants/[userId]/route.ts:26` | `userId: z.string().uuid('userId must be a valid UUID')` |
| Context | `api/ai/conversations/route.ts:128` | `userId: auth.sub` |
| Consumers of the facade | 10 files | `createConversationStorage` — the conversations routes, the participants routes, the import route, `api/ai/chat/route.ts`, and three test files |

**The container also carries `agent_id` (text) and `owner_user_id` (uuid)** (`entities.ts:761-765`) —
which is the "a column on the container" the requirement's title objects to: the agent is a *property
of the conversation*, and the participant is a *person who may see it*.

---

## 3. THE CHAIN READ — who CREATES, CHECKS, CONSUMES, DELETES (and a live defect)

`00-PIN-AND-METHOD.md` §4.2. Read in order:

- **Who CREATES a participant row:** `AiChatConversationRepository.createOrGet`, with
  `ctx.userId`. The only writers of `ctx.userId` on the chat path are `api/ai/chat/route.ts` —
  **which passes `auth.sub`** at three sites: `persistChatTurnStart` (:738), the port adapter's
  `authContext` (:766), and `persistAssistantOnStreamCompletion` (:829).
- **Who CHECKS:** `canAccessConversation` + `loadParticipantFlag`, both keyed on `ctx.userId`.
- **Who CONSUMES:** the same `auth.sub`-derived context, in ten files through the facade.
- **Who DELETES:** the revoke route, keyed by `userId` **uuid**.

### 3.1 THE DEFECT — proven, and it is live today

`auth.sub` is a **subject string**, not a user id. `packages/shared/src/lib/auth/principal.ts:73-79`
builds two of its three shapes:

| Principal | `auth.sub` | Fits `user_id uuid`? |
|---|---|---|
| human | `<uuid>` | **yes** |
| service API key | `api_key:<uuid>` | **no** |
| ai_worker API key (`CC-103`) | `ai_worker:<uuid>` | **no** |

And **`effectiveUserId()` — the helper written for exactly this, whose own docblock says *"using a
key id where a user id is expected silently writes rows nobody can read back"* — is called ZERO times
in the chat route.**

Proven on a real PostgreSQL 16 (throwaway `cc107-pg`, before/after cases; script kept below):

| Case | Result |
|---|---|
| insert `user_id = 'ai_worker:22222222-…'` | **REFUSED** — `22P02 invalid input syntax for type uuid` |
| insert `user_id = 'api_key:22222222-…'` | **REFUSED** — `22P02` |
| insert `user_id = '22222222-…'` (a human) | **accepted** |
| insert `user_id = 'business_ir.query_author'` (an agent id) | **REFUSED** — `22P02` |

**So every API-key caller — service *or* `ai_worker` — that reaches `/api/ai/chat` with a
`conversationId` gets a `22P02` on the first persisted turn**, in `createOrGet`'s owner-row write.
Not a wrong answer; a 500.

**History, measured, so the blame is placed correctly:** `git log -S "userId: auth.sub"` on the chat
route returns `1a0239dd Upstream baseline: Open Mercato 0.6.7, unmodified` — **this predates our work
and predates `CC-103`.** `effectiveUserId` arrived later (`9b77b705`, `f2a53ecb`) and fixed the same
class in `RbacService`, where the `isApiKeyBackedKind` docblock records that a check *"fell through
to the human branch and put `ai_worker:<uuid>` into a uuid column, which is a 500 rather than a wrong
answer"*. **The chat route was never migrated.** `CC-103` did not cause this; it added a second way to
trigger it and it is now on the register's frontier.

### 3.2 And it is the reason `SR-07`'s order matters

A bot cannot be a participant while the participant's owner column is being fed a subject string.
Fixing §3.1 is **not** optional groundwork for `SR-07` — it is the same defect with the lid off.

---

## 4. THE REQUIREMENT, restated

1. **An agent can be a participant** of a conversation, addressed by its **text** agent id, without
   becoming a row in the auth user table (the REFUSED list holds).
2. **The access predicate must consult the agent axis.** `canAccessConversation` today is built
   entirely from `userId`; an agent caller is refused by construction.
3. **Uniqueness must hold on both axes.** Measured (P5): Postgres keeps two rows `(1, null)` under a
   plain unique, so with `user_id` and `agent_id` both nullable in one table, one plain unique would
   not dedupe agent rows. Two partial unique indexes — **ours, per §1.1** — are the shape.
4. **A human principal is answerable for every agent participant** — the `bot_owner` analogue, which
   authorization and audit need. This is a column on the *participant*, not on the agent.
5. **An agent participant is not subject to human idle-pruning** — the rule harvested in §1.2, with
   its source table changed.
6. **`user_id` going nullable changes every `{ userId }` filter's meaning.** The register's carried
   risk, verbatim: *"the num_nonnulls slice must land with this, not before it."* That is what makes
   this one slice rather than two.

---

## 5. THE DESIGN

### 5.1 The participant table gains a second identity axis

```sql
alter table "ai_chat_conversation_participants"
  add column "agent_id" text null,          -- the agent id, as TEXT, exactly as the container stores it
  add column "agent_owner_user_id" uuid null; -- req 4: a human principal is answerable
```

`user_id` becomes **nullable** (req 6). Both identity columns get a partial unique pair — one pair per
axis, keeping the existing org split:

| Index | Columns | Predicate |
|---|---|---|
| `…_tenant_org_conv_user_uq` (exists) | `(tenant_id, organization_id, conversation_id, user_id)` | `organization_id is not null` — **adds** `and user_id is not null` |
| `…_tenant_conv_user_null_org_uq` (exists) | `(tenant_id, conversation_id, user_id)` | `organization_id is null` — **adds** `and user_id is not null` |
| `…_tenant_org_conv_agent_uq` (new) | `(tenant_id, organization_id, conversation_id, agent_id)` | `organization_id is not null and agent_id is not null` |
| `…_tenant_conv_agent_null_org_uq` (new) | `(tenant_id, conversation_id, agent_id)` | `organization_id is null and agent_id is not null` |

**Why the predicate must be spelled in `ON CONFLICT`** — the `CC-102` lesson, applied before it bites:
a bare `on conflict (cols)` cannot infer a partial index, so the registration upsert spells it.

**The `num_nonnulls` half of req 6:** `check (num_nonnulls(user_id, agent_id) = 1)`. Exactly one
axis identifies a participant — a row with neither is unreachable by every predicate, and a row with
both answers to two owners. This is the slice that must land *with* the nullable change, not after.

### 5.2 The writer stops feeding a subject string to a uuid column (§3.1)

`api/ai/chat/route.ts` uses `effectiveUserId(auth)` at all three sites. Where it returns `null` — a
service principal acting for nobody — the honest answer is a **refusal with a named code**, not a
silent fallback to the key's own id: *"using a key id where a user id is expected silently writes rows
nobody can read back"*. That refusal is also req 4's floor for the agent axis: an agent participant
with no `agent_owner_user_id` is refused the same way.

### 5.3 The access predicate consults both axes

`loadParticipantFlag` takes a **participant identity** — `{ userId }` or `{ agentId }` — and
`canAccessConversation` tries both. The revoke route's `userId: z.string().uuid()` becomes a
discriminated `{ kind: 'user', id: uuid } | { kind: 'agent', id: text }`, because a uuid-only path
can never address an agent (measured, §2).

### 5.4 Idle-pruning (req 5)

Our own table, our own predicate. Recorded in the plan here so the rule is not lost: a participant
whose `agent_id` is non-null is **not** a person and is exempt from human idle-pruning.

---

## 6. THE PROOF PLAN

| # | Claim | Test / proof | Fails before? |
|---|---|---|---|
| 1 | `createOrGet` refuses a non-uuid `userId` | repository test asserting the refusal | **yes** — it is a database error today |
| 2 | The chat route uses `effectiveUserId`, not `auth.sub` | test: an `api_key:`-sub caller gets a named refusal, not a 500 | **yes** |
| 3 | A row with neither identity is refused | repository/migration test on the `num_nonnulls` check | **yes** |
| 4 | Two agent participants for one conversation are refused | repository test via the upsert + the new partial index | **yes** |
| 5 | Two org rows + one tenant row with one agent id still dedupe correctly | repository test over both partial pairs | **yes** |
| 6 | An agent caller can read a conversation it is a participant of | repository test through `canAccessConversation` | **yes** — refused by construction today |
| 7 | An agent participant with no owning human is refused | repository test | **yes** |
| 8 | **The migration on a real Postgres** — as `CC-102` and `CC-103` required | throwaway `postgres:16-alpine`, before/after cases, probe committed beside the migration | — |
| 9 | Mutation discipline | revert each fix, confirm the matching test fails, restore byte-identical | — |

**Rule carried from `CC-102`:** the fake EM has no database. Every SQL claim here gets a real
Postgres proof, and the probe is committed next to the migration with its run command.

---

## 7. WHAT THIS DOES NOT DO

- **It does not make agents rows in the auth user table.** That is the REFUSED list, and this design
  is built on top of the refusal (see §1.1 for what that costs).
- **It does not add `type_id` polymorphism with no FK** (the `Recipient` shape). Our participant table
  already has zero foreign keys; this adds none.
- **It does not build sharing UI.** The schema and the access predicate are what make sharing possible;
  the screen is separate work.
- **It does not make the daemon's id persistent** — still `SR-12`.

---

## 8. PROGRESS

| # | Item | State |
|---|---|---|
| 1 | Donor re-read at the cited lines — **done, and it corrects the register** | ✅ **DONE** — §1 |
| 2 | Measured inventory of our participant shape | ✅ **DONE** — §2 |
| 3 | The chain read, and the live defect it found | ✅ **DONE** — §3 |
| 4 | The plan | ✅ **DONE** — §4/§5 |
| 5 | **INCREMENT 1: fix §3.1** — the subject-string-into-uuid-column defect | ✅ **DONE** — see §9 |
| 6 | The migration: `agent_id` + `agent_owner_user_id`, nullable `user_id`, four partial unique indexes, `num_nonnulls` | ✅ **DONE** — see §10 |
| 7 | The access predicate and the revoke route, both axes | ✅ **DONE** — see §10 |
| 7b | **The participants POST body accepts either axis** — the item this table was missing until 2026-10-17 20:03, which is why "7 of 8" read as "the HTTP surface is done" when it was not | ✅ **DONE** — see §10.6 (`8c56428e`) |
| 8 | Idle-pruning exemption | ⬜ **NOT CODE — a rule to record.** No participant pruning exists anywhere in the repo (only run-registry pruning and OpenCode session-idle detection), so there is nothing to exempt yet. See §10.6 |

---

## 9. INCREMENT 1 — CLOSED. §3.1 fixed, in both routes, with the defect proven on a real Postgres

**What changed.** The person a request writes rows for is resolved **once**, with `effectiveUserId(auth)`
— the helper that exists for exactly this and was called **zero** times in both files — and a machine
credential that acts for **nobody** is refused with `422 ai_acting_user_required` instead of being handed
to Postgres as a subject string.

| File | Change |
|---|---|
| `api/ai/chat/route.ts` | `actingUserId` resolved once after body validation; the three sites that feed contexts ending in `user_id` use it |
| `api/ai/conversations/route.ts` | same resolution inside `loadCallerContext`, a new `no-acting-user` kind, and both handlers (GET, POST) guarded |
| `__tests__/route.test.ts` (×2) | 6 new tests — see below |
| `__probes__/acting-user-subject.probe.sql` | **new** — the database proof, committed with its run command |

**Deliberately NOT changed, and documented in the code so nobody "fixes" them the other way:**
`checkAiChatRateLimit` and `rbacService.loadAcl` are keyed by **subject**, not by user id, and keep
`auth.sub`.

### 9.1 The proof

| Proof | Result |
|---|---|
| `api/ai/conversations/__tests__/route.test.ts` | **5/5** (2 existing + 3 new), mutation (`actingUserId = auth.sub`) → **3 failed**, restored byte-identical |
| `api/ai/chat/__tests__/route.test.ts` | **34/34**, same mutation → **3 failed**, restored byte-identical |
| The full affected surface (repositories + api + cli + lib) | **105 suites / 1542 passed / 1542**, no suite failed to load |
| `tsc -p packages/ai-assistant` | **0** |
| **The probe, on a real PostgreSQL 16** | P1 `ai_worker:<id>` → **REFUSED `22P02`**; P2 `api_key:<id>` → **REFUSED `22P02`**; P3 human uuid → **accepted**; P4 text agent id → **REFUSED `22P02`**; P5 NULLs distinct under a unique index → **2 rows**. Container removed; nothing left running. |

Each probe case asserts its own expected outcome rather than being read by eye, so a future
regression in one case is visible instead of averaged away.

### 9.2 What the tests found about the tests

Two things worth recording, both the `CC-102` lesson in a new place:

1. **The existing chat-route fixture used `sub: 'user-1'` — not a uuid.** So the one principal shape the
   suite exercised would also have been refused by the real database. The suite never touched a
   database, which is why it never knew.
2. **No test in the file supplies an `em`** — the container mock returns `{}` for it, which is survivable
   only because a `human` principal short-circuits the binding read (`agent-binding.ts:63-65`) and never
   reaches `em.findOne`. The first `ai_worker` test written here therefore failed with
   `TypeError: em.findOne is not a function` until a real `em` was supplied. **The ai_worker dispatch
   path had no test that got past the binding gate at all.**

### 9.3 What this does NOT do

It does not make a bot a participant. It removes the reason the participant table could not have one:
an owner column that silently rejects every non-human subject. `agent_id`, the second identity axis, the
partial unique pair and `num_nonnulls` are items 6–8.

---

## 10. INCREMENT 2 — CLOSED: the second identity axis (`6b78a0ac`)

**The columns.** `agent_id text null`, `agent_owner_user_id uuid null`, and `user_id` now
**nullable** — which is the change that alters the meaning of every existing `{ userId }` filter, and
the reason `num_nonnulls(user_id, agent_id) = 1` and the one-sided owner CHECK land in the **same
migration** rather than a later one.

**Four partial unique indexes**, two per identity axis and two per org scope. A single plain unique
over `(tenant, org, conv, user_id, agent_id)` would not dedupe agent rows — Postgres treats NULLs as
distinct, and that is **measured in the probe** rather than assumed.

**★ A tightening found while writing it:** the two user-axis uniques previously did **not** exclude
retired rows, so a revoked participant blocked its own slot at the database level while
`addParticipant` compensated in application code — an invariant enforced nowhere a raw writer would
notice. Both now carry `user_id is not null` and `deleted_at is null`, matching what `ai_agent_runtimes`
and `ai_agent_bindings` already do.

**Both CHECKs are NOT VALID on purpose.** The table can be large and the application already
maintains both, so a lock-and-scan on deploy would take the app down for an invariant that holds. The
consequence is stated in the entity and the repository docblock: **the boundary must re-check**, because
`NOT VALID` protects existing rows only where the code does.

### 10.1 The repository, and why the type is a union

`AiChatConversationParticipantIdentity` is a discriminated union, so a caller cannot pass both axes or
neither without the compiler noticing — and `normalizeParticipantIdentity` re-checks it at the boundary,
which is **necessary rather than belt-and-braces** precisely because the database CHECK is NOT VALID.

The access predicate consults **both** axes as **two indexed queries, not one `$or`**: each axis has its
own index (`..._active_conv_user_idx`, `..._active_conv_agent_idx`), and a combined
`{userId} or {agentId}` filter cannot use either and would seq-scan the table. `list` unions the two
axes the same way.

### 10.2 The routes — and the increment-1 defect was in three of them, not two

`participants/route.ts` (POST), `participants/[userId]/route.ts` (DELETE) and its `loadCallerContext`
sibling all fed `userId: auth.sub` into contexts ending in a uuid column. All three fixed here.

**The revoke route's path param keeps its KEY `userId`** — Next.js hands the handler that key from the
`[userId]` segment, and renaming the schema field without renaming the directory broke the route, which
the existing `d2-gap-guard` test suite caught immediately. Its **value** now names either axis: a bare
uuid is a human (existing callers unchanged), `agent:<id>` is a machine. An explicit prefix rather than
"looks like a uuid?", because that sniff is the ambiguity that caused the original defect.

### 10.3 ★ THE PROBE FOUND ME MEASURING WRONG — recorded so it is not repeated

At 2,000 rows the planner used the **user** index for an **agent** query, and I wrote that up as an
index design flaw and "fixed" the column order. **Re-measured after `ANALYZE`, BOTH candidate orderings
are chosen.** The real cause was stale statistics on a freshly bulk-inserted table. So:

- the ordering is kept, but **for symmetry with the user axis**, and the migration says so;
- the false cause was removed from the comment rather than left behind looking proven;
- **the rule: a query plan taken before `ANALYZE` is a claim about the statistics, not about the
  index.** A plan and a measurement are different things, and one can look like the other.

**★ AND THE REORDER MADE AN INDEX A DUPLICATE — found 2026-10-17 (23:3x), while clearing the red.**
`active_conv_user_idx` was reordered to `(tenant, org, user, conversation)`; `tenant_org_user_conv_idx`
already had **exactly** that column list and **exactly** the same `where deleted_at is null` predicate, and
both are **non-unique**. So after `6b78a0ac` the table carries **two identical indexes**: Postgres
maintains both on every insert, update and delete, the pair doubles the index footprint, and the planner
has to choose between two paths that cannot differ. The migration is where it happened — it *drops and
recreates* `tenant_org_user_conv_idx` in the same identity-first order
(`Migration20261017180000_ai_chat_participant_agent_axis.ts:157-165`), which is the step that made the two
collide.

**Why it was invisible:** the schema test that should have caught it pinned the *old* column order, so it
went red on the reorder and read as "a stale test" rather than as "a duplicate index". Fixing the
expectation would have made the red disappear **and taken the evidence with it** — which is why the test
now states what it asserts and explicitly does not bless the shape.

**The fix is a decision, not a keystroke, so it is recorded rather than taken:** drop
`active_conv_user_idx` (its access path is served by `tenant_org_user_conv_idx`, and conversation-first
reads are served by the four uniques), **or** drop `tenant_org_user_conv_idx` and keep the `active_conv_*`
pair for naming symmetry. Either way it needs a migration, and `CC-119` (the database rebuild) is where the
chain gets proven — so it is **scheduled**, not urgent. **§10.4's "two axis read indexes" also undercounts:
there are three, and one of them is this duplicate.**

### 10.4 The proof

The migration's **own** SQL is extracted at runtime by invoking the class with a stub `addSql` — never
hand-copied, so the probe cannot drift from the migration. Against a real `postgres:16-alpine`:

| Case | Result |
|---|---|
| columns after `up()` | `agent_id text`, `agent_owner_user_id uuid`, `user_id uuid` — all three nullable |
| indexes after `up()` | four participant uniques + **three** axis read indexes (one of them the duplicate named in §10.3) + pkey |
| constraints after `up()` | `one_identity_ck` and `agent_owner_ck`, both `NOT VALID` as designed |
| an **agent participant** | **accepted** — the thing that was impossible before |
| a duplicate agent participant (org scope) | **refused** `23505 …_tenant_org_conv_agent_uq` |
| a duplicate agent participant (tenant scope) | **refused** `23505 …_tenant_conv_agent_null_org_uq` |
| no identity at all | **refused** `23514` (one_identity_ck) |
| both identities at once | **refused** `23514` |
| an agent with no owning human | **refused** `23514` (agent_owner_ck) |
| a human with no owner | **accepted** — the MVP shape stays legal |
| a **retired** agent | frees its slot — 1 live row |
| `down()` then `up()` | both columns and index drop; `user_id` back to NOT NULL; the previous index shape restored; `up()` repeatable |

**Tests:** 105 suites / **1,553 passed / 1,553**, no suite failed to load. **★ Rule 13, 2026-10-17:
that is a SUBSET claim, not a package claim** — the 105 covered *repositories + api + cli + lib*, and
`data/__tests__` was outside it. The full `packages/ai-assistant` surface measures **135 suites / 1,989
tests**, and it is **RED** (4 suites / 25 tests; two causes, neither from this increment — §10.6).
Mutation (remove the both-axes
and no-owner refusals) → **3 RED**, file restored byte-identical. `tsc -p packages/ai-assistant` **0**.
Probe committed at
`migrations/__probes__/participant-agent-axis.probe.sql` with its run command and the extraction
command.

### 10.5 What is still not done

`loadParticipantFlag`'s human branch runs **first** and short-circuits, so an agent caller still reaches
the agent axis only when the human one misses — correct, but untested against a real repository.
**The participants POST route is no longer on this list:** §10.6 closed it at `8c56428e`. What remains is
(1) the **idle-pruning exemption (item 8)**, which is a **rule to record**, not code — no participant
pruning exists anywhere in the repo, so there is nothing to exempt yet; and (2) **two agent-axis test
gaps** — `GET /participants`' agent serialisation is untested (all four tests added at `8c56428e` are
POST-only), and `canAccessConversation` with an agent caller (`ctx.agentId`) is untested, so an agent
participant can be **written** but nothing proves it can **read**.

### 10.6 INCREMENT 2's last gap — the POST body, and the "only id" flaw it fixed (`8c56428e`, 2026-10-17 20:03)

**Why the gap existed.** Increment 2 gave the schema, the repository and the access predicate a second
identity axis, but the **route** still validated `addParticipantBodySchema` as a bare uuid — so an agent
participant could be created by code and never over HTTP. The item was **missing from §8's table
entirely**, which is why the table read "7 of 8" while a whole surface was unreachable.

**What changed.** The body accepts **either** `userId` (uuid) or `agentId` (text), **exactly one** — a
zod refine, not a defaulted field, so "both" and "neither" are refusals rather than a silent pick.
Existence is checked **per axis**: a `User` row for a human, `getAgent` for an agent. `getAgent` is a
global registry lookup (`agentsById.get`), not a tenant-scoped one — existence is proven, *"enabled for
this tenant"* is not. That is a deliberate boundary rather than an oversight: agents are code-declared.

**★ The flaw the build found — "a call that returned only an id".** The success path and the audit event
reported only `userId`, which is **NULL for an agent**: a call that grants a machine access to a
conversation said nothing about **which machine**. Now the response carries `userId` and `agentId` (both
present, exactly one non-null), the audit event carries `participantAgentId`, and `GET /participants`
serialises both. The revoke route deliberately keeps `participant: "<axis>:<id>"` — axis-qualified, and
therefore unambiguous. *(A second, unrelated "only id" sighting in the same hour was a **test** defect:
a mock returned `{ id }` where the handler reads `createdAt`, producing a 500. Fixed in the mock.)*

**Proof.** `d2-gap-guard` **34/34**; mutation **3 RED**; `tsc -p packages/ai-assistant` **0**. **All four
new tests are POST-only** — the GET serialisation they enable is therefore **untested** (§10.5).

**★ And it was committed without a docs pass.** The session was cut at 20:04, one sentence into the docs
edit, so for ~90 minutes this plan, `MASTER-CHECKLIST.md` §2, the `CC-107` register row and the memory all
asserted that the POST body was uuid-only. **A code commit is not done until the documents that describe
it agree with it** — this section is that pass, and §10.4's figure carries the correction that came with
it.

### 10.7 The red, cleared (2026-10-17, 23:3x) — two classes, neither from `8c56428e`

The package run was **4 suites / 25 tests red**, and both causes were older than the commit that exposed
them:

| Suite(s) | Cause | Fix |
|---|---|---|
| `data/__tests__/schema-unique-indexes.test.ts` | `6b78a0ac` reordered `active_conv_user_idx` to identity-first; the test pinned the previous order | the expectation now reads the declaration as it is — and the reorder it revealed is the **duplicate** in §10.3 |
| `chat-route-cancel-complete`, `chat-route-through-port`, `chat-route-ownership` | `e8ecde6d` (`CC-103`) added `requirePrincipal` to `api/chat/route.ts`; three `jest.mock('@open-mercato/shared/lib/auth/server')` factories never learned it, so every POST died at `route.ts:291` | the factories now carry the house pattern — the same route's newer suite already had it — mirroring the real helper: blank subject → `null`, prefix → kind |

**Measured, not assumed:** those four suites were **4 failed / 25 failed tests** before the change and are
**4 passed / 40 tests** after it. The pre-fix state *is* the mutation, so there is nothing to simulate: the
same code, run twice, with only the two test-side classes differing.

**The lesson is the one this row already carries:** a route that imports a new guard needs **every** mock
of that module updated, and *"the affected surface"* is not the list of files you edited. Both red classes
were invisible for the same reason — each commit measured a surface that excluded them.
