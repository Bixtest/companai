# Journal

**What happened, in order, and why.** Newest first.

For *what to avoid*, read [`LESSONS.md`](LESSONS.md). For *where things are*,
read [`INDEX.md`](INDEX.md). This file answers **"how did we get here?"**

---

## 2026-08-10 — Decision: the approvals page, and a rule about defaults

The approval tray works; the screen for it does not exist. I asked, because how a
screen behaves for somebody who opens it every morning is a product question and
guessing produces a control people route around.

**Decided:** its own page. Choose sensible defaults rather than asking about each
one, and expose settings where organisations genuinely differ.

I have read that as *"do not bake your taste into my product"* rather than *"make
everything adjustable"*, and said so — every setting is a thing to explain,
translate, test and get wrong, so "configurable" is not the safe option, it is an
option with a bill. Ordering, bulk approval, deputy cover, standing approvals and
expiry get a default and a knob; **who may approve does not**, because that is
authority and not preference.

**Scheduled after item 2**, with the reason recorded rather than left as
"later": three commands are gated today, so the tray is nearly always empty, and
a screen designed against an empty tray is designed against a guess. Item 2
widens what is gated. Same discipline as running shadow mode before enforcement —
which has already caught two design errors of mine that reasoning alone did not.

Generalised into **rule zero-seven** in the cookbook, because the shape recurs:
choose the default, name which half of the decision you are in (right answer /
legitimate difference / authority), write down the argument, and if a surface
needs real usage to design well then say what has to exist first.

## 2026-08-10 — An act that has to wait

Enforcement could refuse an act and nothing else. `A1` and `A2` — *"the worker
proposes; a human performs"*, *"executes only after approval"* — were recorded as
obligations while the act ran anyway. A control that does not control.

Now an act gated at A1 or A2 **does not run**. It is held with the decision that
held it, and executes only when somebody holding `auth.authority.approve` says
so. Reject means never; every held act carries a 24-hour deadline, and an expired
one has to be proposed again — planning 02 §7.2 is explicit that expiry should
escalate rather than block work silently.

**The design question was where to catch an act**, and it took most of the
investigation. The route is universal but would store raw request bodies
(passwords among them) and re-run guards on replay. The command bus is narrower
but right: an act that can be *undone* is an act that can be *replayed*, and the
platform already models that with snapshots and redo, and already persists
command inputs under the encryption map. I went with the bus.

That left a gap I had not seen: **the resolver is keyed by capability and the bus
by command, and nothing connected them.** `module.entity.action` and
`module.action` look close enough to map with a regular expression, which is
exactly the R4b mistake at 153× scale — a wrong mapping either blocks work that
should proceed or waves through an act that should have waited. So commands
declare their capability explicitly, three of them so far, and everything else is
visibly ungated rather than invisibly mis-gated.

**Who is accountable for an approved act**: the approver, in the proposer's
organization. Approval means taking responsibility, and rebuilding a proposer's
session from two stored columns would be fabricating one rather than reproducing
it. But an act proposed for one organization must not land in another because the
approver was looking elsewhere.

**Two things the unit tests could not have caught**, both found by running it:

The gate read the command's capability from the registry, and at request time the
registry it saw did not have it — so the gate concluded "this command declares
nothing" and let the act through. The capability now travels *from the bus*, on
the interceptor context, because the bus has already resolved the handler. For a
gate, "declares nothing" and "I could not see the declaration" have opposite
consequences, and the first live run took the wrong branch silently.

And the held act answered **500**. My own error class carries a docstring saying
three outcomes must stay distinguishable — you may not, it failed, and *not yet* —
and it was collapsing into the second. Now 202 with the pending-act id: understood,
accepted, not done. A 500 invites a retry, and each retry queues another copy.

Verified end to end afterwards: the rename did not happen, the queue showed it
with the gate and the reason, approving it ran the act, and the organization's
parent survived — the U10 fix holding in the same request.

**What still does not bind, said out loud.** A3 commits when nobody objects —
the opposite of expiry, and it needs a scheduler. A4 runs the act and files a
review, which is a different record. And the queue is an API with a deadline, not
the inbox §7.2 describes: no grade ordering, no bulk-with-diff, no absence
routing, no standing approvals. Items 2 and 3. The inbox is a product decision
and should be talked about before it is built.

## 2026-08-10 — A key is not a person, and a cascade that never ran

**The follow-through from U3.** Authentication resolved a regular API key through
`createdBy` and required that person's organization to equal the key's — so
moving somebody to another team silently killed every key they had ever created.
Provenance was being used as identity.

The rule is now the narrower one that actually matters: **a key may not be
broader than its creator.** A null organization means *unrestricted across the
tenant* to `RbacService`, so a key with none, minted by somebody confined to one
organization, is an amplification and is refused — invariant I4. A key scoped to
an organization its creator has since left is a service credential doing exactly
what it was made for, and keeps working. Session keys keep exact equality,
because there the borrowed identity is the whole point.

**What the old behaviour did that was worth keeping** is now explicit rather than
a side effect of a lookup failing: `api_keys` revokes a deleted user's keys on
`auth.user.deleted`. Offboarding becomes a visible, audited act — the key list
shows them revoked — instead of a fleet of credentials that mysteriously start
returning 401. Authentication still refuses a key whose user has gone, because an
event bus is not a place to put the last line of a security control.

**And then, looking for an event to hang that on, I found U8.**
`communication_channels` has a cascade that disconnects a departed user's email
and calendar channels, stops the poller and orphans the credentials. Its first
line reads `payload.userId`. The platform emits `payload.id`. **It had never run
once** — a departed user's mailbox stayed connected and polling.

Seven tests covered it. Every one of them constructed
`{ userId: 'user-1', tenantId: 'tenant-1' }` — a payload nothing in the platform
produces. That is [L34](LESSONS.md) again from a third direction: not SQL text
this time but an event contract, and the same failure, a test that verifies the
handler's *intent* against a shape somebody imagined.

I wrote my own subscriber against the real payload and put the shape in a typed
comment, because the next person to add a cascade will copy whichever one they
find first.

**The gate then failed on something unrelated** — a `<Notice>` guard that walks
every source file in the repo, reading one from a sibling package's scratch
directory a moment after that package's own tests deleted it. Passes alone, fails
in the gate: the shape of every flake that teaches people to re-run instead of
read. Skipping `.tmp-*` and tolerating a file that vanishes mid-walk brings it
into line with the platform's other repo-walking guard, which already does both.
[U9](workspace/references/upstream-issues.md).

## 2026-08-10 — U2: a screen that showed an action and behaved like a declaration

The *Apply to roles* switches on Sidebar customization reset to "no roles" on
every load, while a save treated the list as a complete statement of which roles
should have this layout. So the second save asked to clear every preset, and the
only thing between that and the delete was a small red badge.

**The obvious fix was wrong, and I had already checked that.** Pre-ticking roles
with `hasPreference` looks like two lines. But a preset stored a *copy* of the
settings and no reference to the layout that produced them, so `hasPreference`
means only "this role has some layout" — pre-ticking on that basis would tick
roles configured from a different layout and silently overwrite them on save. A
worse failure, because the screen would look right while doing it.

**So: `role_sidebar_preferences.variant_id`.** A preset records where it came
from, and the switches can finally say which layout a role actually has. No
foreign key, deliberately: a variant is one person's saved layout and may be
deleted, while the preset it produced must outlive it. A dangling id stops
matching and reads as "from a layout no longer here" — true, where a cascade
would delete a role's sidebar because somebody tidied their own saved views.

**The guarantee is server-side.** `clearRoleIds` can only delete presets whose
stored `variant_id` matches the layout being saved; everything else is dropped
from the list. Fixing the switches fixes the screen — but a client that computes
the wrong list is a bug anyone can ship, and a client that computes the wrong
list *and is obeyed* is how data goes missing. Seven route tests hold that half.

Three states now, not two: *uses this layout* · *uses Finance layout* · *uses a
layout from an unknown source*. The third is for rows written before the column
existed. **Unknown is not "none"**, and a row nobody can attribute is left alone
rather than guessed at — the same distinction the graph ceiling makes between
"no constraint" and "constraint I could not read".

**And the checkpoint script was not pruning.** It reported `pruned: 0` after every
run while the backup directory grew by a set each time. The cap ranked only the
*stale* files, so the newest five sets counted as zero against it and ten old
files survived on top of them. Ranking every backup and applying the grace window
as a second condition fixes it; the directory now converges instead of growing.
A tool that reports success while doing nothing is worse than one that fails.

**Found on the way:** the `audit_logs` and `directory` migration snapshots had
been stale since R3 and R6. `yarn db:generate` was emitting migrations to
re-create `ledger_events` and `organization_edges` — tables that already exist —
which would have failed on anyone else's machine and looked like our bug. Both
snapshots now match the schema that shipped.

## 2026-08-10 — The resolver decides

R5 and R6 built a decision kernel and nothing called it. It calls now.

Three modes per tenant — `off`, `shadow`, `enforce` — defaulting to shadow,
because enforcement is a decision an operator makes against their own traffic,
not something that arrives with an upgrade and starts refusing requests on a
Tuesday. Verified end to end against the running instance: an organization behind
an `inheritance: none` edge returns **403** where its parent returns **200**, and
the log carries the reason — *"inheritance is none, so nothing flows down, an
'advises' relationship permits at most A2"*.

**Enforcement can only narrow.** It runs after RBAC has already said yes. That
ordering is the guarantee rather than a convention: there is no path through
`RbacService` where the resolver turns a `false` into a `true`, so "could this
grant something?" is a question you answer by reading four lines.

**Refusals bind; obligations do not.** The resolver returns a gate from A0 to A5,
and only A0 is enforced, because it is the only outcome the platform can carry
out. A1–A4 mean approve-first, hold-and-commit, review-afterwards — and nothing
can yet hold an arbitrary act and resume it once somebody approves. Enforcing
those would mean allowing the act and calling the allowance a control. The CLI
says this out loud when you switch a tenant on, and it is backlog item 3.

**Shadow mode found another design error of mine**, which is now twice. An API
key acquired an approval obligation for *listing organizations*. A read has no
effect to approve, and gating one produces exactly the approval fatigue planning
02 opens by naming as the thing it exists to resolve. The cause: I had written
the untrusted-machine ceiling as a flat A2, where §5.1 specifies a vector over
effect classes — *"a worker can be T4 on research reads and T1 on external
communication"* — and warns that a single number is "either uselessly
conservative or dangerously optimistic". Mine was the conservative half. Reads
are now exempt; everything with an effect keeps approve-first.

That exemption has a cost I am not hiding: an untrusted machine can now read
`confidential` data bounded only by RBAC. The control that belongs there is the
data-classification floor, which planning names and nobody has built. Backlog
item 4, with a note that its values need a source rather than my judgement.

**And a bug my tests could not see.** The edge query used `= any(?)`, which the
query builder expands into `any('a','b')` — a syntax error. Seventeen tests
passed because the fake connection never parsed the SQL; it filtered in
JavaScript, so every property they asserted was a property of the fake. It
surfaced the first time an organization actually had a parent, which was the
first time the query ran at all. Second instance of the same shape as the ledger
alias — [L34](LESSONS.md).

## 2026-08-10 — U3 was real. I had closed it twice on bad evidence

A key created through the ordinary UI flow returned **401 on every request**. Not
a corner case — the default path. An admin working tenant-wide has no selected
organization, so creation stored `organization_id = null`, while
`resolveApiKeyAuth` requires the key's organization to equal *its creator's*, and
the creator has one. Every key that admin made was dead on arrival.

One column proved it: 401, `update api_keys set organization_id = <creator's>`,
200. Same key, same request.

I had closed this twice. Once by misdiagnosing it (my own `Authorization: Bearer`
header produced the 401s — [L30](LESSONS.md)), and then, worse, by treating that
discovery as a disproof and **reverting a correct fix**. Invalidating your own
reproduction returns an issue to *unknown*, not to *resolved* —
[L32](LESSONS.md), the more expensive of the two.

**Fixed at creation, not at authentication**, and the distinction is the whole
decision. The comparison looks like the bug — provenance used as an authorization
input — but it is load-bearing: `RbacService` reads a null `organization_id` as
*unrestricted across the tenant*, so that check is the only thing stopping a
single-organization admin from minting a tenant-wide key. Loosening it would have
turned an availability bug into a privilege escalation. Creation now takes the
creator's own organization, and refuses an explicit mismatch with a 422 that says
why.

Checked rather than assumed, and worth recording as a negative: **a key does not
inherit its creator's permissions.** `loadAcl` sees a service principal and reads
the key's own roles; the creator's user ACLs never enter. The escalation this was
feared to be does not exist. What does exist is a machine credential whose life
is tied to a person's record — delete the creator and every key they made dies
silently. That is now backlog item 3.

## 2026-08-10 — The authority graph bridge learns to say "I do not know"

`AuthorityGraphService` had no tests, and two ways to fail that both returned
`A5` — which reads as *nothing constrains this*. An organization it could not
find, and an ancestor index whose order had inverted, would each have granted
full autonomy by silence.

Both now fail closed at `A0` with a stated `basis`, and the inversion is actually
*detected*: a leaf-first index makes every real edge match the path reversed,
which ordinary data cannot produce. Unmapped hops are reported rather than
absorbed, so an unconstrained answer says how much of the path it actually read.

Thirteen tests, including one that pins the root-first ordering of `ancestor_ids`
at the module that produces it — the assumption cannot be typed, so it has to be
detected on one side and pinned on the other.

Found while reading that code: a sibling comparator that compared a lowercased
name against a raw UUID. One identifier. Fixed, with a test.

## 2026-08-10 — A 500 on an ordinary write, caused by four characters of SQL alias

Creating an API key started returning 500. The server log named a duplicate key
on `ledger_events_tenant_seq_uq` — the chain's own uniqueness constraint,
rejecting an append that claimed a position already taken.

**The chain was fine.** Ten events, sequence 1 through 10, no gaps.

**The head query was wrong.**

```sql
select seq::text as seq, hash from ledger_events ... order by seq desc limit 1
```

PostgreSQL resolves `ORDER BY seq` to the *output column* when one shares the
name, so this ordered by text: `'9'` beat `'10'`. Every append computed a head of
9, tried 10, and hit the constraint. The same alias in the verifier made it read
the chain as 1, 10, 2, 3 and report an intact chain as **broken** — a false alarm
from the one tool whose entire value is that people believe it.

Both are one four-character mistake: `as seq` instead of `as seq_text`.

**What the constraint did well.** It refused the write rather than forking the
chain, and it took the business write down with it — fail-closed, exactly as
designed. The integrity guarantee held; what failed was arithmetic.

**What I did badly.** The error named a race, so I went looking for a race, and
found one: `getConnection().execute()` without a transaction context can take a
different pooled connection, which means `pg_advisory_xact_lock` commits and
releases immediately and serialises nothing. That defect is real, and I fixed it
and tested it — but it was not this bug. I spent an hour on a plausible cause
before checking the simplest possible fact: what the head query actually returns.
Ten seconds in psql would have shown `9` sitting on top of a table whose maximum
is 10 ([L31](LESSONS.md)).

Both fixes ship. The chain now verifies: **10 of 10 events, 0 broken.**

---

## 2026-08-10 — The U4 sweep, and a bug I invented

**The sweep did what it should.** `selectedOrganizationId ?? auth?.orgId` appears
in 53 files, which sounds alarming and mostly is not. Thirty-eight are in parked
modules. The rest fall into three shapes, and only one is dangerous:

> **Never use the actor's organization as a value you store.** Comparing against
> it is fine. Filtering by it is fine. Storing it makes the record mean
> *"whatever scope the person who created it happened to have"* — and for a
> superadmin, who has none, it means nothing.

Four bugs have been that one sentence. The rule is now in
[scope-tenant-organization.md](workspace/knowledge/scope-tenant-organization.md),
where somebody will look for it.

**Then I invented a bug and nearly shipped a fix for it.** I expected U3 — "an
API key fails at use time" — to be an instance of the same pattern. I reproduced
it twice, traced it to a comparison in the authentication path, wrote the fix,
updated the tests, and wrote three documents explaining the finding.

Every 401 was my own request. The platform accepts `X-Api-Key` or
`Authorization: ApiKey`; I sent `Authorization: Bearer`, and read the 401 as
confirmation of the defect I was already looking for. Sent correctly: 200.

Worse, when I then tested the mechanism I had blamed — nulling a never-used key's
organization so the comparison would have to reject it — that returned 200 too.
The branch I built a fix around does not fire, and I still do not know why.

**So I reverted the fix.** It changed which organization a new key belongs to, on
the strength of a defect I could not demonstrate. Keeping a behaviour change no
evidence supports is the same mistake as keeping a bandage, and harder to spot
because it looks like diligence.

U3 goes back on the backlog as *unverified*, alongside a real open question: a
security comparison exists that I cannot explain the behaviour of. That is worth
understanding before it starts mattering.

What I never did, in an entire investigation of a 401, was make one API-key
request I expected to **succeed**. It would have taken seconds
([L30](LESSONS.md)).

---

## 2026-08-10 — The authority graph is now something a person can change

R6 shipped typed organization edges and seeded them permissively, which left the
feature real and unreachable: lowering a ceiling meant writing SQL. There is now
an API and a settings page.

**Guarded by `directory.organizations.manage`**, not a feature of its own.
Editing an edge changes what everyone below may do — the same risk class the
descriptor already assigns to organization management (E5, not delegable) — and a
second permission over the same act would be a second place to get it wrong.

**Four refusals, each protecting something structural.** A self-edge is a cycle
with nothing to terminate on. An edge pointing back up the tree makes "what is
above this organization" have two answers, when the tree is what scopes every
query in the platform. An organization from another tenant would produce a row
that is invisible rather than dangerous — and a write that silently does nothing
is worse than one that fails. And a stale update is refused outright.

**The optimistic-lock guard caught me.** The platform asserts that every mutating
UI file either sends a version header, is inline-exempt, or is allowlisted. My
page did none of those and the gate failed. The right response was not the
allowlist: two people editing the same ceiling from two tabs must not resolve to
whichever saved last, because for authority configuration a lost update is a
security change nobody chose. Both sides now implement it.

That guard is the second time this week a platform-level test has caught
something I would have shipped. It is worth noticing what they have in common:
both assert a **property across the whole codebase** rather than the behaviour of
one unit, so neither can be satisfied by a new file that simply forgets.

**The page's real work is saying what things mean.** "A2" and "reference_only"
are not self-explanatory, so every dropdown carries its meaning — "A2 — needs
approval first" — and the page states plainly that raising a ceiling grants
nothing on its own, it only removes a restriction that edge was imposing.

Gate: 22/22 tasks, 12,527 tests.

---

## 2026-08-10 — U7: the journal can finally tell a machine from a person

`action_logs.actor_user_id` is a uuid column, and the subject is narrowed on the
way in — `api_key:<uuid>` has always been stored as the bare uuid. A key acting
and a person acting were indistinguishable in the journal, which is the single
distinction this platform exists to make. R3 closed it for the hash chain by
reading the raw subject; the journal's own column stayed wrong until now.

`actor_kind` is written from that same raw subject, so the journal and the chain
tell one story. The column is nullable and **null means unknown, never human**:
an entry written before the column existed cannot have its kind recovered from
the row alone.

**The backfill taught me something about my own reasoning.** I wrote it with two
inferences — an id matching `api_keys` is a service principal, no actor at all is
the system — and a comment asserting that a human could not be distinguished from
an unknown actor. The dry run then reported **15 rows "cannot be determined"** on
an instance with one admin.

That number is not plausible, and it was not a bug in the query: it was a
limitation I had asserted without checking. Matching the `users` table is exactly
as sound as matching `api_keys` — the same inference in the opposite direction.
With it, all twenty rows resolved and none were guessed.

Had the command not printed its breakdown before writing, I would have applied it,
seen no error, and left every historical human action permanently unattributed —
in the audit trail, which is the one place that is supposed to be recoverable
after the fact.

Also surfaced in the API and the detail dialog, because a journal that records a
distinction and never shows it has not closed the gap.

Gate: 22/22 tasks, twice — the log held two complete runs after a timeout, both
green (L26 is why I checked before believing the test count).

---

## 2026-08-09 — Three small repairs, and the proof I could not get yesterday

**The audit journal now refuses to lose a scope it was given.** `normalizeInput`
nulls any tenant, organization or actor id that is not a uuid — right for a value
nobody supplied, data loss for one somebody did. A tenant-less entry is returned
by no tenant-scoped query and, since R3, covered by no hash chain: the write
appears to succeed and the record is both unreachable and unprovable. It now
throws, naming every dropped field and the consequence. The old behaviour warned
**once per process**, so the first bad write was reported and every one after it
was silent; every occurrence is logged now.

**Shadow mode has a heartbeat.** After the autonomy matrix was scoped to workers,
ordinary traffic stopped producing any interesting line — and an empty log then
meant either "nothing worth reporting" or "the shadow is not running". Those are
opposite conclusions and I could not tell them apart. The report now says
*"nothing to report, and that is a finding: 240 permission checks were observed
and none would change"*, which is a result rather than an absence of one.

**`OM_LOG_LEVEL` never reached the app.** Turbo runs tasks in a filtered
environment: anything not declared in `globalEnv`, `globalPassThroughEnv`, or a
task's own `env` is dropped silently. `OM_LOG_LEVEL=debug yarn start` looked like
it worked and produced nothing, which is exactly the kind of failure that costs
an hour and teaches the wrong lesson. Both runtime knobs are declared now, and
the runbook warns the next person.

**And with that, the proof I lacked.** Yesterday I reported the matrix correction
as 45 observations → 0 while admitting I could not distinguish "no findings" from
"not running". With debug logging actually reaching the app, the same traffic now
produces **17 "Resolver agrees" lines and zero of everything else**. The shadow
is running, and the correction holds. An inference became a measurement.

Gate: 22/22 tasks, 12,510 tests.

---

## 2026-08-09 — Shadow mode found a design error in its first hour, which is what it was for

With credentials from the owner I logged in and walked all 84 backend pages and
60 API routes. Forty-five shadow observations, twenty-one capabilities.

**Zero disagreements.** The resolver would refuse nothing the platform allows
today — enforcement would lock nobody out.

**Forty-five of forty-five were people acquiring an obligation.** Changing your
own sidebar layout would enter a review queue. Editing a dictionary would need a
second person's approval. Composing a message would be queued for review.

That is not a finding about the platform. It is a design error in the resolver,
and it is mine.

**The mistake.** I applied the autonomy floor matrix to every actor. The gates
describe how much a *worker* may do unattended — `A1` is defined in the planning
as *"the worker produces a proposal; a human performs the act"*, which has no
meaning when the actor **is** that human: the thing A1 asks for has already
happened. Reading the table as applying to people turns every ordinary write into
supervised work.

The planning's own §7 warns about exactly the consequence: *a control that is
expensive to operate gets switched off* — and it takes the useful controls with
it when it goes.

**The correction.** The matrix and the irreversibility cap bound machines and
delegated authority. A person exercising a permission they hold is bounded by the
other ceilings: the org graph, the record's state, the delegation they act under,
and tenant policy. Four-eyes on financial acts belongs in policy, deliberately —
that is a decision each company makes rather than one a table imposes. The effect
class is still *recorded* for human decisions, because dropping it would make a
decision about a destructive act read exactly like one about a read.

**Re-measured on the same traffic: zero.**

**What I could not prove, and said so.** After the correction, human traffic
produces no info-level lines, so silence became ambiguous — it means either
"nothing interesting" or "the shadow stopped running". `OM_LOG_LEVEL=debug` had
no effect (dotenvx's `.env` appears to win over the process environment), and my
machine-actor control was blocked by U3: an API key created by an admin whose
organization is not pinned returns 401 at every use. So I verified the shadow is
present in the running build rather than claiming a positive observation I did
not have. Both gaps are now backlog items — the first one, a heartbeat, exists
precisely so silence is never ambiguous again.

**This is the batch that justifies shadow mode.** Had the resolver been switched
on directly, the first thing this platform's governance layer would have done is
demand approval to edit a dictionary.

Gate: 22/22 tasks, 12,497 tests.

---

## 2026-08-09 — Shadow mode: the resolver now runs on every permission check

R5 and R6 built a resolver nothing called. That gap only widens while it is true,
so the resolver now runs beside **every real permission check** in the platform —
and its answer is recorded, never obeyed.

**Why not simply switch it on.** The existing RBAC has decided these questions
for the life of the product. The resolver is new, one of its inputs is a
deliberately conservative placeholder (every machine actor capped at
approve-first until a trust model exists), and nothing models task grade yet.
Enabling it blind would refuse requests that have always worked, in production,
with no evidence about how often or where. Shadow mode buys that evidence for the
price of a log line.

**One hook, 102 call sites.** Every permission decision in the platform reaches
`RbacService.userHasAllFeatures`, so instrumenting that one method covers all of
them and every future one without touching a caller. The decision itself moved
into a private `decideAllFeatures`, so the shadow runs on a value already
computed and *physically cannot* alter it — a comment promising it would not
alter anything is worth less than a structure in which it cannot.

**The number I care most about is not disagreement.** It is
*"the resolver would add an obligation"* — both systems allow the act, but the
resolver wants approval, review or a hold window. That is the work the governance
layer would begin doing on the day it is switched on, and it is the number that
decides whether switching it on is survivable.

**Measured, not assumed:** 526 ns per call. A permission check does a cache or
database lookup, which is orders of magnitude more. The shadow deliberately skips
the organization graph, because consulting it would add a query per check for a
diagnostic — so the shadow *understates* the eventual constraint, which is the
safe direction for a measurement meant to find surprises early.

**A test earned its place immediately.** I wrote "it must never throw" as a test
rather than a comment, and it failed on the first run: the catch block logged
`input.capability.id`, so a malformed input threw *inside the handler written to
make throwing impossible*. An error path is still a path.

Gate: 22/22 tasks, 12,480 tests.

---

## 2026-08-09 — U5: the gate that failed at random was three different problems

Six full gate runs in one day, three of them failing, each somewhere different,
all passing in isolation. Investigated as one problem. It was three, and only one
was a defect.

**Two were not flakiness at all.** I had been running package suites as
`npx jest --config packages/core/jest.config.cjs` from the repo root. Several
tests resolve paths from `process.cwd()`, so they were looking for a directory
that has never existed. Turbo runs each package in its own directory; my
invocation did not. Nothing was broken — my runner was standing in the wrong
place ([L25](LESSONS.md)).

**One was a real defect, and it would have fired in CI.** The OpenAPI generator
suite builds a module tree in a temp directory, runs discovery over it, and
bundles. Idle, each test takes 165–470ms; under the gate, sharing a disk with
other packages' workers, one exceeded jest's **5s default**. Five seconds is a
contract for unit tests — *if it has not finished, it has hung* — and that is the
wrong contract for a suite whose work is I/O. Now stated explicitly at 30s, with
the reasoning in the file, and deliberately bounded at roughly 60× idle so a
genuine performance regression still surfaces.

**One has never been explained.** A decoupling test saw a capability registry
that contained `catalog` when three separate layers guarantee it cannot. Not
reproduced in three solo runs or in any gate since. Rather than invent a cause,
the test now **asserts its own precondition** — that the registry it sees has no
`catalog` key. If it recurs, the failure will say whether the mock applied, which
is the one fact this investigation lacked.

**What I assumed first and was wrong about:** CPU oversubscription. The shared
jest base already caps workers at 2 and the root script caps turbo at 2 — four
workers on eight cores. The first explanation that fits is not the same as the
one that is true.

**And a trap that nearly cost a wrong conclusion.** A timed-out run's children
kept writing to the log I then read, so one file held two turbo summaries and
looked like a failure. Tasks reported failed with zero failing assertions
underneath is the tell: a real failure names something, a killed one just stops
([L26](LESSONS.md)).

Three consecutive clean gate runs afterwards — 22/22 tasks, 12,466 tests, byte
identical counts.

---

## 2026-08-09 — R6: position in the org graph now bounds authority, and all six repairs are in

Organizations are joined by **typed edges** carrying relationship type,
inheritance mode, an authority ceiling and a capability allowlist. The tree —
`parent_id` plus the closure columns — is untouched and still scopes every query;
the edges add what a tree cannot carry.

This is invariant **I4** made structural rather than conventional. A worker three
levels down cannot exceed what the edges above it permit, whatever its own grants
say, because the resolver takes the minimum along the path.

**Why a tree was never enough.** Real customers are consultancies operating client
companies, groups with subsidiaries, temporary structures for one engagement. "We
advise that client, and may see these things but never those" cannot be said with
`parent_id`. A permission system that cannot express it gets that distinction
implemented in application code instead — differently every time.

`advises` and `serves` default to A2; `owns` and `manages` pass everything. A
consultancy advising a client should not act unattended inside it by default, and
a relationship type can only ever *lower* — a permissive type never widens an edge
somebody deliberately narrowed.

**Nothing changed on the day it landed.** The migration seeds one
`owns`/`strict`/`A5` edge per existing parent-child link, and an absent edge is
also unconstrained. The mechanism exists from now on; lowering a ceiling is a
deliberate act, not a behaviour change that arrives with a deploy.

**A methodology error worth more than the feature.** Chasing what looked like two
new test failures, I found I had been running package suites as
`npx jest --config packages/core/jest.config.cjs` **from the repo root**. Several
tests resolve paths from `process.cwd()`, so they were reading
`<root>/src/modules/...` — a directory that does not exist. The failures were
produced by how I invoked the runner, not by the code. Turbo runs each package in
its own directory, which is why `yarn test` was green while my direct invocation
was not.

That also cleared up the flaky failures around it: two full gate runs came back
green, so the earlier ones were U5's parallelism flakiness, which remains its own
backlog item.

**All six repairs are complete.** R1 principals, R2 audit coverage and atomicity,
R3 the hash-chained ledger, R4 capability descriptors, R5 the decision with
reasons, R6 the authority graph. What remains before the Starting Kit is done is
the eight grafts.

Gate: 22/22 tasks, 12,466 tests, green on two consecutive runs.

---

## 2026-08-09 — R5: authority answers with reasons, and the spike closes

The second half of the spike. Permission checks now return a **decision**: the
gate, every rule that contributed, which one was binding, what obligations
follow, and what would change the answer.

The reason this had to be built early rather than added later is that a boolean
destroys the information at the moment it is produced. By the time `false`
reaches a caller there is nothing left to explain with, and no logging bolted on
afterwards recovers it. Retrofitting explainability into a system that answers
yes/no is essentially impossible; designing for it costs almost nothing.

**What the resolver enforces today.** The grant, the R4 effect-class matrix,
invariant **I8** (an act nobody can undo is never decided after it happens — cap
A2), invariant **I4** (authority is carried, never amplified — a worker cannot
exceed its invoker), delegation and policy ceilings, and resource state. Trust,
charters, budgets and org-graph ceilings are named optional inputs: absent means
*not consulted*, never *unlimited*.

**Everything is a ceiling and the answer is the minimum.** No rule anywhere can
raise a gate. That is asserted as a property over every combination of inputs,
not as an example — if a raising rule ever existed, every other rule would become
advisory and "what is the most this could ever be" would stop having an answer.

**The one policy I invented, and why.** The trust model does not exist yet, so a
machine with no trust record resolves as untrusted and is capped at approve-first.
A placeholder erring the other way would let machines act unattended precisely
during the period when nothing is measuring whether they should. Humans are not
capped this way — that asymmetry is **I2**, and it lives in the data the resolver
reads rather than a branch that treats one kind of actor as special.

**Preflight** resolves a whole plan before work starts, which the planning
document calls the best fatigue mitigation available and I think is right: the
dominant failure of an approval system is not refusal, it is a worker stalling at
step four at hour three and somebody finding out at hour nine. Every step is
resolved even after one is blocked, and approvals are counted per capability
rather than per occurrence — approving the same act five times in a plan is one
decision a person makes.

**It is not enforcing.** Nothing calls it in the request path yet. A resolver
that silently starts refusing requests is the least safe way to introduce one.

`mercato auth authority:explain --capability attachments.manage --actor ai_worker`
prints the whole decision against the real descriptors — an AI worker asking to
delete attachments gets A1, propose-only, with the binding rule marked and the
capability's own note quoted underneath.

**The spike is complete.** R1 (principals) and R5 (decisions) were the two
timeboxed items that would tell us whether this foundation is reshapeable. Both
landed, and neither required fighting the host platform.

Gate: 22/22 tasks, 12,445 tests.

---

## 2026-08-09 — R4b: all 113 permissions described, and a guard that checks the real ones

R4 shipped with 37 of 113 features described and the rest tracked. The remaining
76 are now done, module by module, each classified by opening the routes it
guards.

**What the reading turned up**, none of which was visible from the ids:

*Workflows are the automation engine, and most of it reaches outside.* Activities
include `CALL_API`, `CALL_WEBHOOK` and `SEND_EMAIL`, so starting an instance,
signalling one, retrying one, or completing a human task are all E3 with an
external effect. Completing a task looks like the smallest act in the module and
triggers whatever the workflow does next.

*Authoring automation is authoring authority.* A business rule's actions include
`CallWebhook`, and rules fire with nobody present. Writing one is closer to
changing what the system may do than to editing a record — E5, not E1.

*Importing history pulls in without sending out.* `channel.import_history` reads
years of correspondence from an external platform into the tenant. Nothing
leaves, so it is not E3 — but it is a bulk irreversible write of other people's
personal data, which E2 says and the name does not.

*An exchange rate is a financial effect without being a payment.* It decides what
every converted amount is worth, including on documents already issued.

**A gap in my own guard, found by closing it.** The coverage test validated
*invented* descriptors and merely *counted* the real ones — so a contradictory
descriptor could have sat in a module indefinitely with a green suite. The guard
now loads every module's `acl.ts` and validates what ships, plus two new checks:
nothing marked `externalEffect` may sit below E3, and a `compensation` must point
at a capability that exists. A compensation nobody can perform is worse than
admitting irreversibility, because it reads as though a remedy were available.

**And a defect that guard exposed in my R4 code:** `getModules()` throws when the
app has not bootstrapped, and the registry's lazy hydration called it unguarded.
Asking what kind of act something is would have crashed any CLI command, worker
or test that asked. Now it degrades to "nothing to discover".

**Two self-inflicted mistakes worth recording.** Rewriting the acl files, I
rebuilt each entry by splitting its body on commas — which split inside
`title: 'Create, edit, and delete business rules'` and corrupted five files.
Restored from git and rewritten to insert before the closing brace instead:
never re-parse what you only need to append to. And the apostrophes in my notes
came through double-escaped, which the typecheck caught immediately.

Coverage is now **113/113**, asserted rather than reported, with the module set
computed so a new module cannot arrive undescribed.

Gate: 22/22 tasks, 12,409 tests.

---

## 2026-08-09 — R4: permissions now say what kind of act they are

A permission was an id and a title. `api_keys.delete`, "Delete API keys". That
answers *may this actor do it* and nothing else — not whether a machine may do it
unattended, not whether a second person should confirm, not whether it can be
undone tomorrow. Those are the questions this product exists to answer, and none
of them can be derived from a string.

Every act can now carry intrinsic risk semantics, declared once and centrally:
effect class (E0 read → E6 destructive), reversibility, data classes, whether it
leaves the company, whether it may be delegated or covered by a standing
approval. Plus the autonomy floor matrix from the planning docs — the ceiling on
how much autonomy an act may ever permit, by effect class and task grade.

**R4 is the vocabulary, not the gate.** Nothing refuses an action yet; the
resolver that reads these is R5. Saying so plainly matters, because a
half-implemented gate that looks like a gate is worse than none.

**37 of 113 enabled-module features are described** — the nine modules that
perform the riskiest acts. The rest is R4b, tracked with the exact module list
and counted by a guard that prints coverage on every run. The guard asserts two
things hard: descriptors must be coherent, and a described module may never lose
its descriptors. It does not assert 100%, because a guard that must be disabled
on the day it is written guards nothing.

**Three classification rules earned while doing it.**

*Classify by the worst act the feature permits.* `attachments.manage` covers
upload and delete, and delete removes the file from storage. E6, not E1. Holding
a feature means holding everything it permits.

*Read the code, never the name* (L19 again). `configs.cache.manage` sounds
destructive and is genuinely reversible — it clears derived state that rebuilds
itself. `auth.sidebar.manage` sounds like a permission change and grants nothing.
`inbox_ops.settings.manage` sounds like a preferences page and sets the webhook
signing secret that decides who may inject mail into the tenant.

*A named compensation or nothing.* `compensatable` without naming the
compensating act is irreversibility wearing a friendlier word, so the validator
rejects it. That rule alone changed three of my own first-draft classifications.

Gate: 22/22 tasks, 12,366 tests.

---

## 2026-08-09 — R3: the record can now prove it has not been altered

`action_logs` answers *what happened*. It is an ordinary table: anyone with
database access can edit a row, and nothing would show it. Since the product's
claim is a governance layer that can always explain itself, "trust our table" is
not an answer.

Every audited write now also extends an **append-only, per-tenant hash chain**.
Each event carries its predecessor's hash, so altering one invalidates every hash
after it. Rewriting the successors to match is blocked by a database trigger that
refuses `UPDATE`, `DELETE` and `TRUNCATE` — verified against a superuser, because
a chain only the application declines to rewrite protects against nobody worth
protecting against.

**Hooked to `ActionLogService.log()`**, the single funnel both write paths already
pass through. A module physically cannot audit a change and forget to chain it.

**Three decisions worth keeping.**

*The chain holds no customer content.* Payloads carry the journal entry's id and
**digests** of the snapshots. That is what makes erasure possible: delete the
personal data from the journal, and the chain still verifies because it never
held the data — only proof of what it was.

*Two serialisers, deliberately.* The event envelope is strict — floats, dates and
class instances are rejected — so an outside auditor can recompute a hash.
Snapshots get a total encoder that never throws, because they contain prices and
timestamps, and a strict encoder would throw, and since the append is fail-closed
that throw would roll back the customer's write. **Be strict about what you
construct, total about what you receive.**

*The chain records the actor's kind; the journal cannot.* `action_logs.actor_user_id`
is a uuid column and the normaliser strips the `api_key:` prefix before writing,
so in the journal a key acting and a person acting are indistinguishable — the
one distinction this platform exists to make. The ledger reads the raw subject
and keeps it. The journal's own column still needs fixing (**U7**), and that
belongs with R4/R6 where principals are being worked on.

**Two mistakes on the way in.** I put the entity in its own file and re-exported
it from `data/entities.ts`; the migration loader transpiles that one file alone,
so the re-export broke `db:migrate` for every module — the convention exists for
a reason. And I proved the append-only trigger by inserting a probe row, which by
construction I could not then delete; the table had no real events, so it was
reset, but a minute later that would have been a permanent seq-999 hole in a real
tenant's chain.

Gate: **22/22 tasks, 12,348 tests**, on Node 24.

---

## 2026-08-09 — R2c was correct and unverifiable: three mistakes in the check, not the code

The owner tested R2c and the audit entry did not appear. The code was right; the
way I asked them to verify it was wrong, three times over.

**One: the app serves `dist`, not source.** The running instance was a production
build started eighteen hours earlier. My edits never reached the process serving
the page. Every check I had run — `tsc`, `jest`, the coverage guard — reads
source; none touches what executes. The settings row's `updated_at` even moved,
because the *old* code updates the same row. → [L20](LESSONS.md)

**Two: the gate had been running on the wrong Node.** Rebuilding surfaced a
version guard: the repo declares `"node": "24.x"` and the shell had **22.21**.
The previously-running build predated that guard, so nothing had ever complained.
Two `ai-assistant` suites had been failing to load — I had recorded that as an
upstream defect (U6) after stashing the tree and reproducing it at the previous
commit. The reproduction was sound and the conclusion was wrong: a control that
varies the code cannot tell you anything about the environment it holds fixed.
`isolated-vm`'s prebuild is `abi137` — which *is* Node 24. → [L21](LESSONS.md)

U6 is withdrawn. On Node 24 the gate is **22/22 tasks, 12,290 tests, zero
failures**, and that package runs 1,379 tests rather than 1,270.

**Three: I asked for permission to solve a problem I had already solved.** Having
found no Node 24 on the machine, I stopped the owner to authorise a download,
fetched 36 MB, and extracted it — next to `workspace/.toolchain/node24/`, which
had held the identical build since 3 August and which **my own runbook lists in
its second table**. Removed; the server runs on the original. → [L22](LESSONS.md)

**What changed as a result.** `local-instance.md` now opens with the Node 24
requirement and what silently breaks without it, and its "after code changes"
section says to rebuild *and restart*, force Turbo when it claims `FULL TURBO`
in two seconds, and grep `dist` to confirm the code landed before asking anyone
to look.

**The thread joining all three:** I verified artifacts adjacent to the one that
mattered. Source instead of the running process. The diff instead of the
environment. The machine instead of my own notes.

---

## 2026-08-09 — R2c: the AI approvals are recorded, and the triage that found them

**The claim I was about to write down was wrong.** R2 was going to close with a
note that the remaining eight modules needed no auditing. Before writing it I
inspected every write route instead of reasoning from module names — and found
seventeen mutating routes, nine of them in `inbox_ops`.

`inbox_ops` describes itself as an *"Email-to-ERP Agent: receives forwarded
emails, extracts action proposals using an LLM, and presents them for
human-in-the-loop approval."* That is our product's core loop, already built.
**A human approving or rejecting what a model proposed was recorded nowhere.**

The execution was audited all along — accepted actions run through the command
bus, which writes an entry with an undo token. The *decision* was not. An
investigator could see that an order was created and by whom, but not that a
machine had proposed it, nor that anyone had reviewed it.

**What changed.** Fourteen write points now record: accept, reject, reject-all
and complete (in the execution engine, next to the status transition), plus the
payload edit, recategorisation, reprocessing, settings, the outbound reply, and
both ingestion doors. The decision commits in the same transaction as the status
change it describes — if the record cannot be written, the approval does not
take effect.

**Three decisions worth keeping.**

*The verb is the point.* Recording an approval as `updated` would be true and
useless. `accepted` / `rejected` / `completed` / `failed` joined the audit
contract, and the audit projection learned to classify them — without that they
fell through to `system`, which reads as "nobody did this" and hid them from
every filter.

*Content stays where its permissions are.* No snapshot carries the extracted
payload, the description, or the message body: all of it is encrypted tenant PII.
The entry records the decision, the action type, and **the model's confidence** —
how sure the machine was about what a person went on to approve — and points at
the record for the rest.

*A failure is recorded; a success is not.* A successful execution already has its
command-bus entry. A failure had none, leaving a trail that read "approved, then
nothing" — indistinguishable from still running.

**And a platform fact that had been invisible.** An audited write must open its
transaction on the **container's** EntityManager. MikroORM creates `fork()`s with
`useContext: false`, so a transaction opened on a fork is invisible to the audit
service, which holds the container's manager — the business change would roll
back and the audit row would survive it. Nothing in the code said so;
[audited-writes.md](workspace/knowledge/audited-writes.md) does now.

---

## 2026-08-09 — R2 complete: every write that changes data is now recorded

**Audit coverage is done and guarded.** 25 write points across the four modules
whose custom routes reached neither the CRUD factory nor the command bus.
Committed as `ea35f88` (integrations, attachments, data_sync) and `a144280`
(workflows plus the coverage guard).

Where a route had no transaction, it got one. Twenty-four of the twenty-five
audit inside the transaction that performs the write, so a failed audit rolls the
change back.

**The twenty-fifth is deliberately different, and it is the interesting one.**
`workflows/instances/[id]/advance` runs activities that call external systems.
Holding a transaction across those would exhaust the connection pool and let an
`idle_in_transaction` timeout roll back a transition whose external effects had
already happened — a worse failure than a missed row. It audits afterwards and
**logs rather than throws**, because the transition succeeded and telling the
caller otherwise would be a lie.

**`integrations/credentials` carries no snapshot**, deliberately. It records
*that* credentials changed, never their values: copying secrets into a table with
different retention and different read permissions turns an audit record into a
credential leak.

**The coverage guard matters more than the wiring.** Custom routes bypass both
automatic paths, which is how sixteen modules ended up recording nothing. Wiring
fixed what existed; `audit-coverage.test.ts` stops the next route being added
silently unaudited. It asserts it found at least ten mutating routes, so it can
never pass while guarding nothing — and its mutation detection includes
service-mediated writes, because an earlier version looked only for ORM calls and
missed `integrations/credentials` entirely.

**Three scope corrections, all from inspecting rather than assuming:** `configs`
has no database writes at all (I had judged it by its name); `data_sync/validate`
only reads; and my first detector missed the single most important route in the
batch.

**Test mocks were fixed, never the routes.** Sixteen container/EM mocks across
eleven suites now model `transactional`. Degrading a route to tolerate a partial
EntityManager would have dropped the atomicity guarantee to keep a mock happy.

Gate: typecheck 20/20, lint 1/1, **test 22/22 tasks, 12,283 passed, zero
failures.**

## 2026-08-09 — R2b-factory: both audit paths now fail closed

The CRUD factory's direct-write path audited *after* its transaction had already
committed, so a failed audit could only be swallowed — throwing would have
reported failure for a change that happened. Committed as `9b0bd7c`.

`create` and `update` now audit inside `em.transactional(...)`. **`delete` had no
transaction at all** and now has one — which matters most there: after a delete
there is nothing left to describe what was removed, so losing the entry loses the
information permanently.

The helper no longer catches. An *absent* audit service is still tolerated; a
*failing write* propagates to the enclosing transaction.

**Both paths — command bus and CRUD factory — now share one rule:** a change and
the record of it commit together, or neither does.

Verified live on the rewritten delete path: creating and deleting an API key
returned 200, wrote two audit entries, and left no live key behind. Gate: 22/22
tasks, 12,280 passed.

## 2026-08-09 — R2b: a write and its audit record now commit together

**The business write and its audit entry share one transaction, and a failed
audit rolls the change back.** Committed as `a396e1d`.

Before this, `handler.execute()` committed its own transaction and `persistLog`
opened a separate one via `em.fork()`. A failure between them left a committed
change with no record — and `persistLog` swallowed its own failures, so the gap
was both possible and silent.

**The design worked because the platform was already built for it.**
`withAtomicFlush` carries a re-entrancy guard: with a transaction open on the EM
it joins rather than nesting. So the bus can own the boundary and every handler
slots inside it. `ActionLogService.log()` stopped forking — a fork gets its own
connection and its own transaction, which is exactly what made the two writes
independent.

**Fail-closed, precisely.** An *absent* `actionLogService` is still tolerated —
a downstream app may disable `audit_logs`. A *failing write* now propagates. Those
are different failures and only one means a record was lost.

**Side-effect ordering was the risk, and it is unchanged.**
`flushCrudSideEffects` still runs after the transaction commits, so events and
indexing never fire for a change that rolls back.

Five tests; one is the point — force the audit write to throw, assert the
business write is gone. Verified live too: a currencies create returned 201 with
`currencies` 10 → 11 and `action_logs` 11 → 12 in the same request.

**Not done, and now precisely scoped.** The CRUD factory's direct path still
fails open: its create/update transaction has already committed by the time the
audit write runs, and delete opens none. Throwing there would report failure for
a change that happened. Tracked as **R2b-factory**, backlog item 2.

**A third instance of one root cause, found while verifying.** A superadmin
cannot delete a currency — `mapInput` derives `organizationId` from the actor,
and a superadmin has none. That is the same shape as the two audit-scoping bugs
fixed in R2a. Recorded as **U4**, with a sweep on the backlog: *code that derives
scope from the actor breaks for the actor who has no scope*, and the superadmin
is the most privileged actor in the system.

Also today, at the owner's request: **Rule zero-four — checkpoint before anything
irreversible.** `./workspace/scripts/checkpoint.sh <label>` tags the code and
snapshots the database and `.env` — the two things git cannot restore — and
prunes to the newest five. Source files are deliberately not copied: git already
holds them, and copying would add the clutter the same instruction warned against.

## 2026-08-09 — R2a: the audit trail starts recording, and two bugs hid it

**Creating and deleting an API key is now audited and visible.** Committed as
`f75ab27`.

The CRUD factory has two write paths. Routes declaring `actions.<op>.commandId`
go through the command bus, which writes the audit entry. Routes with a plain
handler wrote nothing. The direct path already resolved the actor, the entity and
its identifiers for its side effects — everything an entry needs was present and
simply unwritten.

**Deliberately not undoable.** A command carries a reverse operation; a direct
handler does not. Rendering an undo button that cannot work would be worse than
none. Audit is a record; undo is a capability.

**Two bugs had to be fixed before any of it was visible**, and both are why the
Action Log had looked empty since the beginning:

1. Entries were scoped to the *actor's* organization. A superadmin acts with
   `orgId = null`, so they landed with no organization.
2. `api_keys` declares `orm: { orgField: null }` — its records are legitimately
   tenant-scoped. The list query filtered `organization_id = <caller's org>`,
   which hid every tenant-scoped row from everyone. That is why even the five
   entries initialisation had always written were invisible.

**Honest scope, measured after the fact.** I framed this as "one change covers
everything". It does not. It covers routes built with `makeCrudRoute` — **3 of
the 16** unaudited modules (`api_keys`, `entities`, `business_rules`) plus every
future CRUD route for free. The other 13 use custom routes that never touch the
factory. Among those, `workflows`, `configs`, `integrations`, `data_sync` and
`attachments` still record nothing, and there is no single leverage point for
them.

**The batch-T drift guard earned its keep.** Making `dashboards` a multi-line
entry in `modules.ts` broke both enabled-module parsers, which only matched the
single-line form — so `dashboards` was classified as *parked* and its 123 tests
were silently skipped. The test count fell from 12,268 to 12,145 and the guard
failed loudly. Without it, a batch would have quietly stopped testing a module we
keep.

Gate: typecheck 20/20, lint 1/1, test 22/22 tasks, **12,272 passed**.

## 2026-08-09 — R1 closed; the first half of the spike passed

**R1's defect was:** *"the kind is a string prefix re-parsed at each site — 30
files branch on it."* In enabled code, **zero do.** Adding `ai_worker` as a third
kind now costs nothing, which was the entire point.

**The spike question was: does this land in about two weeks, or metastasise into
every module?** It landed in two steps, and parking had already halved it — 18 of
the 34 sites were in code that no longer runs. That is a real signal about the
foundation: it was reshapeable.

**R1.4 deferred, with reasons.** Two items remain from the original plan and
neither is worth doing yet:

The **`principals` table** has no consumer. Principals are derived from users and
API keys and everything that needs one has it. Our own kernel design — Charters,
positions, Grant Sets — will shape its columns, so build it with its first real
consumer: an AI worker that is not a user, or **G3**, which needs stable
principal ids.

**The deprecated fields are load-bearing.** `isApiKey` has no reader left in
enabled code, but `customers`, `sales`, `staff` and `resources` read it in around
twenty places. Deleting it would not break the gate — parked source is no longer
type-checked — but it would break those modules **on restore**, adding cost to
exactly the recovery path parking exists to protect. So they stay, marked
`@deprecated`, until parked modules are restored and migrated or dropped for good.

**Also changed today, at the owner's request:** every request to verify something
in the running platform now comes with numbered steps, verified URLs, the expected
result, and the failure signature — plus an explicit note when a change is
invisible by design, which most foundation work is. Steps live in
[`how-to-test.md`](workspace/references/how-to-test.md) and are now a Rule Zero
obligation in the cookbook.

> *"I am new to the system as a whole, so I can't spot the changes after each
> stage to test."*

Asking for unguided verification put the work of designing a test onto someone
without the context to do it, and produced no signal.

## 2026-08-09 — R1.2: the branch sites are gone

Every live site that parsed the `api_key:` prefix or tested `isApiKey` now reads
the principal instead. **16 files down to 3**, and all three are the abstraction
itself: the module that owns the encoding, the `AuthContext` definition, and one
structural parameter type kept for compatibility. Committed as `9b77b70`.

The nine copies of `auth.isApiKey ? auth.userId : auth.sub` are one call.
`rbacService` tested the prefix twice per invocation and now parses once and
switches on kind. Two behavioural branches became `isMachinePrincipal(auth)`,
which says what they mean: *only people have an interactive session to reconcile*.

**Two judgement calls worth recording.**

`effectiveUserId` now derives the principal when a context does not carry one.
Cached entries, trusted envelopes and test fixtures never pass the boundary that
attaches it, and reading the field directly would have silently detached a real
user from their own preferences.

`normalizeAuthorUserId` deliberately does **not** use it. A key issued on
someone's behalf resolves to that person, but authorship is not something a
machine asserts for a human. Behaviour unchanged — R1 moves the kind into data
without changing what any call site decides.

**A latent bug fixed on the way.** The messages token route had its own copy of
the idiom that fell through to `auth.sub` for an ownerless key — putting a
prefixed key id where a user id belongs. It only ever failed the recipient
comparison, so it denied by accident rather than by design.

**Verified against a running instance, not just the suite:** human login, 44/44
backend pages, both sidebar endpoints, and — the case R1 exists for — a real API
key authenticating as a service principal, resolving its ACL through the
rewritten `rbacService` branch, and reading its owning user's sidebar preferences
through `effectiveUserId`.

One dead end, recorded so nobody re-runs it: an API key returned 401 whatever
role it had. Not a regression — `resolveApiKeyAuth` rejects a key whose
organization differs from its creator's, and the key had been created with a null
organization. Upstream behaviour, untouched by R1.

Gate: typecheck 20/20, lint 1/1, test 22/22 tasks, 12,268 passed.

## 2026-08-09 — Batch T: the gate is green, and a licence gap surfaced

**First fully green gate in this project:** typecheck 20/20, lint 1/1, build
20/20, test **22/22 tasks, 12,265 passed, zero failures**. Committed as `67b8366`.

**The planned fix was wrong, and inspection caught it.** The plan was to emit
entity ids for every module on disk, clearing 579 type errors in parked code.
Reading the code showed the registry's exclusion of parked modules is a
*deliberate compile-time guard* — it stops enabled code hard-depending on
entities whose tables no longer exist, and `attachments` demonstrates the
sanctioned alternative (`getEntityIds() as any` + optional chaining). Emitting
the ids would have destroyed a real safety property to silence an artifact.

Parked source was excluded from type-checking instead, and parked tests from the
jest run, both derived from `modules.ts` so they cannot drift.

**The honest cost: 3,472 tests across 520 suites stop running — 42% of core's
suite.** PARK now means **frozen**, not "maintained alongside everything else",
which is a change from how it was first described. A module restored after months
will need bringing up to the current contract. Recorded in
[`parked-modules.md`](workspace/references/parked-modules.md).

**A licence gap, found by the test written in this batch on its first run.**
`packages/enterprise` source was deleted back in `7f9fa5d` — but **671 files and
6 MB of build output survived**: `dist/`, `.turbo/`, `tsconfig.tsbuildinfo`.
Untracked, so never committed, yet sitting in the working tree where a container
build or archive would pick it up. The `.js.map` files carry `sourcesContent`, so
the **original commercial TypeScript was still on disk** — exactly what removing
the package was meant to prevent. Removed.

Four of the failures cleared were **pre-existing Windows portability bugs** that
had never once been seen, because every run aborted before reaching them.

**R1.3 was dropped.** Migrating 18 branch sites in parked code that is neither
compiled nor tested would be unreviewable work on code that does not run. R1.4's
exit gate is now "zero matches in enabled code", stated explicitly.

## 2026-08-08 — R1.1 lands, and the test suite runs end to end for the first time

**Batch 2 of 16 began.** R1 makes an actor's *kind* a field instead of a string
prefix. Today's step is additive: `AuthContext` now carries a `principal`
(`human | ai_worker | service | system`), and one module owns the `api_key:`
encoding so R1.4 can delete it in a single edit. Committed as `f2a53ec`.

The idiom `auth.isApiKey ? auth.userId : auth.sub` appeared **identically at nine
call sites**; `effectiveUserId()` replaces all nine. It deliberately returns
`null` — not the key id — for a service acting for nobody: personal rows keyed by
a key id can never be read back by a person.

**Parking already paid for itself.** The forensic counted 34 files branching on
the prefix. Eighteen are in parked code, leaving **16 live sites** — batch 2
halved before it started.

**Then the important finding, which is not about R1 at all.**

The full test suite has **never completed in this repo**. Turbo stops at the
first failing task, and two Windows-only failures in the Railway deploy tool
aborted every run after 7–8 of 22 packages. `core`, the largest package, was
never reached. Every "gate green" recorded before today — including the P3
baseline's "1,773 passed, 2 failed" — described a partial run as a complete one
(**L15**).

Fixed in `14acfdc`: both Railway tests made platform-correct, and `--continue`
added so one failing package can never again hide the other 21.

**First complete run: 20 of 22 tasks, 15,723 tests passed.** It exposed 10
failures across 15 suites — 10 suites from parking, 2 from the enterprise
removal, 1 from an earlier CRM cleanup, and 4 pre-existing Windows path
assertions. **None from R1**, which is the point worth recording: `shared`
(1,539) and `ai-assistant` (1,379) pass in full.

Parking also turned out to have a cost the build cannot show: the generator emits
entity modules only for *enabled* modules, so parked modules' tests lose their
generated dependencies (**L16**). Two `catalog` tests were fixed properly with
`{ virtual: true }` — they mock the module anyway and never used the real one.

Clearing the rest is now its own batch, **T**, and the plan grew from 15 batches
to 16. It blocks R1.2, because no batch may begin on a red tree — and for the
first time we can actually see whether the tree is red.

## 2026-08-08 — Phase S redesigned: park the ERP modules, do not delete them

**The owner challenged the whole stripping plan, and was right.**

> *"I am questioning whether it is riskier and takes more time to strip the
> platform from existing modules or just keep it and proceed with building… As
> long as our architectural building is in progress, what is the problem in
> keeping the rest?"*

He also observed that almost nothing had actually been deleted yet. Measured, he
was exactly right: outside the commercially-licensed `packages/enterprise`, five
files and ~2,100 lines out of 1,321,919. Every ERP module was still present.

**The evidence that settled it.** Every generated registry and the migration
runner read `resolver.loadEnabledModules()`. A module switched off in
`modules.ts` creates no tables, serves no routes or pages, registers no workers
or DI, and contributes no ACL features. **Deleting buys exactly one thing over
disabling: compile time** — about four minutes of build — in exchange for days of
per-module analysis and a permanent risk of losing something. `domain_mappings`
nearly went that way once.

Fourteen modules parked in one commit (`147c82e`). On a clean database:

| | Before | After |
|---|---|---|
| Tables | 263 | **136** |
| API paths | 428 | **244** |
| Backend pages | 67 | **44** |
| Queues watched | 42 | **26** |
| Initialisation | 91s | **38s** |

Verified in production mode: **44/44 pages return 200, zero 5xx**. Initialisation
is now warning-free — the undeclared-event and seed-mismatch warnings belonged to
the parked modules.

**One correction I had to make to my own conclusion:** two `example` endpoints
appeared to regress from 200 to 401. They had not — my second sweep sent only a
Bearer token, and those two routes read auth from cookies. With the cookie they
return 200. Same class of harness error as **L2** and **L3**.

**Costs deferred, not eliminated**, both written down in
[`parked-modules.md`](workspace/references/parked-modules.md): dormant code stays
in the repository, and dormant dependencies still appear in security audits. A
hard checkpoint before Phase K revisits this with evidence.

> **Superseded next day.** This entry claimed dormant code "still compiles". It
> does not — 579 type errors, found once a cached green was cleared. Parked code
> is now neither type-checked nor tested. See the 2026-08-09 entry above.

Also closed today: the C++ build tools. MSVC 14.44 and Windows SDK 10.0.26100 are
installed and `cpu-features` now builds — the last outstanding environment defect.

## 2026-08-08 — The platform ran for the first time, and a removal had broken it

Stopped removing modules and started the platform instead. It runs entirely on
the laptop — Postgres and Redis in Docker, the app on Node 24. No cloud needed.
Runbook: [`workspace/references/local-instance.md`](workspace/references/local-instance.md).

**Tenant initialisation failed.** An earlier commit had deleted two workflow seed
files along with the CLI commands that used them, but a library function still
loaded both by filename at runtime, and tenant setup calls it every time:

```
❌ Initialization failed: Missing workflow seed file: sales-pipeline-definition.json
```

Four commits had passed the full gate — install, typecheck, lint, test, build —
with this sitting in them. Nothing could have caught it: the reference is a
string handed to the filesystem, so there is no import to resolve and no type to
check. **A green build proves the code agrees with itself and nothing more**
(**L14**).

The deeper gap: the salvage protocol governs removing a *whole module*. Here we
had deleted files from inside a module we are **keeping**, and no protocol
covered that, so none ran.

Fixed in `a097b79` — the two seeds were sales demo data, so the calls go rather
than the files coming back. `seedWorkflowDefinition()` was kept and exported: it
lost its only caller but is domain-agnostic, and doubt resolves to keep.

**Then the platform was exercised properly.** On a clean database: 67 of 67
backend admin pages returned 200 with real rendered content, and 164 of 195 API
endpoints returned 200. Every single non-200 was traced to a missing query
parameter, a service we had not started, or an upstream bug in a module already
scheduled for removal — **one** defect in total was ours, the one above.

Two harness bugs caught along the way, both already-known patterns: guessed URLs
producing 404s that read like regressions (**L2**), and a path list carrying
Windows line endings so that all 195 requests failed identically (**L3**).

**The standing change:** boot the platform after every few removals, not at the
end of the phase.

## 2026-08-08 — Phase S begins: analysing before deleting

Started working through modules with the salvage protocol. First subject:
`customers` (173,786 lines, 25 tables) — the largest module and the most obvious
candidate for deletion.

**It is not safe to delete yet.** Three modules we are keeping reach into it:
`configs` loads its command files during upgrades, `dashboards` imports its
tables to seed demo charts, and `ai_assistant` carries 23 references. Each needs
repairing first.

Report: [`workspace/salvage/customers.md`](workspace/salvage/customers.md) —
deliberately marked **incomplete**. Three of the seven questions are unanswered,
so under our own rule it cannot authorise a deletion.

Two near-misses along the way, both now in `LESSONS.md` (L2, L3): a grep count
that looked like deep entanglement but was mostly test fixtures, and a broken
script that returned identical numbers for nine different modules.

## 2026-08-08 — Baseline verified: the platform is healthy

Ran the full gate on the untouched codebase. **This was the verification never
performed during the assessment** — the verdict carried it as its largest open
risk.

| Check | Result |
|---|---|
| Install | ✅ 1,581 packages |
| Build | ✅ 93 generated files |
| Type-check | ✅ 21/21, zero errors |
| Lint | ✅ 0 errors, 12 warnings |
| Tests | ⚠️ 1,773 passed, 2 failed — both Windows-only, both in code being removed |

Record: [`workspace/salvage/P3-baseline.md`](workspace/salvage/P3-baseline.md).

**The risk is closed.** Nothing here reopens the platform decision.

Also found: lint covers only 1 of 25 packages — their quality gate is far
narrower than it looks. Type-checking does cover everything, which matters more,
but we should extend lint to packages we keep.

## 2026-08-08 — Environment: Node 24, and a correction

Set up the toolchain. Initially proceeded on Node 22 while the project declares
Node 24, reasoning that Yarn only warned about it.

**The owner challenged this, correctly.** Running the baseline on a version the
authors never targeted would have measured our laptop rather than the platform.
Downloaded Node 24.19.0 (checksum verified), installed it *inside* the workspace
so the system Node is untouched, wiped the partial install and started again.

Also deferred — by decision, not neglect — a native component that needs a C++
compiler. Recorded as a **required** step of the Phase S reinstall.
See `LESSONS.md` L6.

## 2026-08-08 — Decision: hard fork

> *"Our platform will have a life of its own. We will change it too much to be
> able to update from theirs."*

We take Open Mercato and never merge from it again. This is what makes the six
planned repairs possible — they rewrite the identity and permission core, which
no amount of rebasing would survive.

The cost, written down so it is not forgotten: **nobody will tell us when they
patch a security hole.**

## 2026-08-08 — Decision: Open Mercato is the host, Platform 1 is a donor

Two platforms assessed with the same method. The decision turned on a criterion
introduced *after* the first assessment — how well a platform **receives** grafted
code — so Platform 1 was scored retroactively on it.

| | Platform 1 | Open Mercato |
|---|---|---|
| Rubric | 1.86 | **3.55** |
| Host-fitness | 2.25 | **4.25** |
| What is built | a permission resolver and an org graph | an entire working platform |

Neither is a governance kernel; both need ours built on top. The question was
*"cheaper to add a kernel to a working platform, or a platform to a working
kernel?"* — and the second is years of work we never wanted to do.

Platform 1 keeps a real edge in exactly one area — the **authority model** — and
contributes eight concentrated pieces: the layered resolver with its explanation
trace, typed org edges with ceilings, delegations, project-level overlays, record
locks, event visibility, locale direction policy, and a migration lock.

Plan: [`compai/planning/08-host-selection-and-migration-plan.md`](compai/planning/08-host-selection-and-migration-plan.md)

## 2026-08-08 — Assessment 2: Open Mercato

1.32 million lines — 43× the first candidate. Required a new discipline: separate
the **framework** (read in full) from the **product** (sampled against a keep/skip
list written *before* reading).

Found a genuine AI governance layer: approve-first gates with field-level diffs,
an ordered narrow-only mutation policy, model allowlists, per-turn budget
enforcement, cost attributed down to the step, and working undo/redo across 70
commands.

Three of my own findings were corrected during the assessment — all cases of
declaring something absent using our vocabulary instead of theirs (`LESSONS.md`
L7).

Also: `packages/enterprise` is commercially licensed and excluded entirely.

## 2026-08-08 — Assessment 1: Graph Portal Platform

Our own earlier codebase. Verdict **EVOLVE**: a good permission kernel with an
explanation trace, a typed portal graph, and working delegations — but **zero
AI**, despite being called an AI-first framework. A repo-wide search for `agent`,
`charter` or `ai_worker` returned nothing.

A second forensic pass overturned three things the first pass had credited it
with (`LESSONS.md` L8) — the origin of the rule that a schema is not a behaviour.

## 2026-08-08 — Method: how we assess a platform

Wrote the assessment methodology from the first assessment's mistakes: seven
batches, sixteen probes, the host/donor distinction, and the **blast-radius
test** — a flaw that fails the screen is only fatal if it is *diffused*.

That test alone separated EVOLVE from REFERENCE on the first platform.

## 2026-08-08 — Design: the four concepts

Turned the brainstorming into architecture: task grades and the autonomy ladder ·
the Worker Charter (an AI worker's "CV", compiled into runtime permissions) ·
knowledge hashtags as the human syntax of a machine-readable context graph ·
@mentions as universal addressing that carries authority but never amplifies it.

Fifteen invariants that everything else must respect:
[`compai/planning/00-product-thesis.md`](compai/planning/00-product-thesis.md).

## Earlier — where the idea came from

Three brainstorming documents: a comparison of two AI-agent workplace systems, a
survey of permissively-licensed building blocks, and a functional specification
of the product written as though we would build all of it ourselves.

[`compai/brainstorming/`](compai/brainstorming/)

---

## Keeping this file

Add an entry whenever a **decision** is made, a **phase** completes, or something
**surprising** is found. Not for routine progress — that is what the salvage
reports and batch reports are for.

Each entry: what happened, why, and what it changed.
