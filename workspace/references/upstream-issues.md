# Inherited defects — things wrong with the platform we forked

**Not our bugs, but our problem.** We own this code now and take no upstream
updates, so anything here ships in our product unless we fix it.

Each entry: what it is, how bad, evidence, and what fixing it takes. Add to this
file whenever something is found — especially when it is tempting to dismiss it
as "that's just how the platform works".

---

## U1 — Most modules write nothing to the audit trail · severity **high** · **FIXED 2026-08-09**

**Found:** 2026-08-09, by the owner noticing an empty Action Log after creating
and deleting an API key.

**What happens.** Creating an API key — which grants access — and deleting it —
which revokes access — produce **no audit record at all**.

**Why.** Action-log entries are written by the **command bus**. A module only
reaches it if it defines a `commands/` folder. Of 25 enabled core modules, **9
do**:

```text
AUDITED     auth · directory · dictionaries · feature_toggles · currencies
            planner · messages · communication_channels · translations

NOT AUDITED api_keys · entities · business_rules · workflows · configs
            integrations · data_sync · attachments · notifications
            dashboards · perspectives · inbox_ops · query_index · progress
            api_docs · audit_logs
```

Some of those have nothing meaningful to audit (`query_index`, `progress`,
`api_docs`). These do:

| Module | What goes unrecorded |
|---|---|
| `api_keys` | Credential issued and revoked |
| `entities` | Custom entity and field definitions — schema changes |
| `business_rules`, `workflows` | The automation that acts on the business |
| `configs` | System configuration |
| `integrations`, `data_sync` | External connections and their credentials |
| `attachments` | Files added and removed |

**Why it matters to us specifically.** Our product's whole premise is a
governance layer that can always explain who did what — for AI workers above all.
A trail covering nine modules of twenty-five cannot do that.

**Partly fixed in R2a (`f75ab27`).** The CRUD factory's direct-write path now
writes an audit entry, which covers **3 of the 16**: `api_keys`, `entities`,
`business_rules` — plus every future `makeCrudRoute` route for free. Two
downstream bugs had to be fixed before any of it was visible: entries were
scoped to the actor's organization (null for a superadmin), and the list query
filtered `organization_id = <caller's org>`, hiding every tenant-scoped row from
everyone.

**Completed in R2a-custom (`ea35f88`, `a144280`).** All four modules with
mutating custom routes are wired — `integrations`, `attachments`, `data_sync`,
`workflows` — 25 write points, each auditing inside the transaction that performs
the write. A build-time guard (`audit-coverage.test.ts`) fails if a new mutating
route is added without one.

Two modules dropped out on inspection: `configs` (its write routes clear caches
and in-memory telemetry, touching no database) and `data_sync/validate.ts` (reads
only). The remainder — `notifications`, `dashboards`, `perspectives`,
`inbox_ops`, `query_index`, `progress`, `api_docs` — have no mutating custom
routes worth auditing.

**Superseded description — 13 modules using custom routes** that never touch the
factory: `workflows`, `configs`, `integrations`, `data_sync`, `attachments`,
`notifications`, `dashboards`, `perspectives`, `inbox_ops`, `query_index`,
`progress`, `api_docs`, `audit_logs`. Several of those legitimately have nothing
to audit; `workflows`, `configs`, `integrations`, `data_sync` and `attachments`
do not.

**Both audit paths now fail closed** (R2b `a396e1d`, R2b-factory `9b0bd7c`): a
change and the record of it commit together, or neither does.

**Remaining fix.** Per-module, for custom write routes — either route them
through the command bus or call the same audit helper directly. No single
leverage point exists for them, which is why this is the expensive half.

---

## U2 — The sidebar role-apply screen is one click from silent data loss · severity **medium** · **FIXED 2026-08-10**

**Found:** 2026-08-09, by the owner noticing the role toggles reset after a save.

**What happens.**

1. On *Sidebar customization*, tick `admin`, `employee`, `superadmin` under
   **Apply to roles** and save. The three roles get the layout. Correct.
2. Reload the page. **All three toggles are off**, and each shows a red
   *"will clear preset"* badge.
3. Save again — for any reason, such as tweaking the item order — and **all three
   role presets are deleted**.

**Evidence.** The editor resets the selection on every load
(`SidebarCustomizationEditor.tsx` → `init()` calls `setSelectedRoleIds([])`), and
computes `willClear = role.hasPreference && !checked`. The save then sends every
unticked role that has a preset as `clearRoleIds`, and the route runs
`em.nativeDelete(RoleSidebarPreference, …)` on them.

**Is it a bug?** Strictly, no — the red badge is a deliberate warning and the
delete is deliberate. The *design* is the problem: each save is treated as a
complete declaration of which roles should have this layout, but the UI never
loads the current answer, so every save starts from a false baseline of "none".
The only thing standing between a routine save and deleting every role's sidebar
config is a small badge.

**The obvious fix is wrong — checked 2026-08-09 before attempting it.**

Pre-ticking roles where `hasPreference` is true *looks* like a two-line fix. It
is not correct. `role_sidebar_preferences` has **no variant reference**:

```text
id · role_id · tenant_id · locale · settings_json · created_at · updated_at · deleted_at
```

A role preset stores a **copy** of the settings, not a link to the variant that
produced them. So `hasPreference` means "this role has *some* sidebar layout",
and nothing more. Pre-ticking on that basis would pre-tick roles configured from
a **different** variant, and saving would silently overwrite them — a worse
failure than the current one, because the screen would look correct while doing it.

**A real fix needs one of:**

1. **A variant reference on `role_sidebar_preferences`** — schema change plus a
   migration, then the toggles can show the truth. Cleanest, and the direction
   our own model wants anyway.
2. **Explicit per-role Apply / Remove controls**, so nothing is destructive by
   omission. UI redesign, no schema change.
3. **Stop deriving `clearRoleIds` from "unticked"** — removes the data-loss path
   in one line, but also removes the only way to detach a role from this screen.
   Needs a decision, not just an edit.

**Deferred deliberately**, under the owner's standing policy: fix small
risk-free things immediately, but do not start down a long path mid-batch. This
one turned out to need a schema or UX decision. Scheduled — see PROGRESS.md.

---

### Resolution, 2026-08-10 — option 1, and a little of option 2

**`role_sidebar_preferences.variant_id`.** A preset now records the saved layout
it came from, so the switches can say which layout a role actually has instead of
only "some layout". That was the whole obstacle: without it, no arrangement of
the UI could distinguish a preset this screen owns from somebody else's.

Deliberately **no foreign key**. A variant is one person's saved layout and may
be deleted; the preset it produced must survive that. A dangling id stops
matching and reads as "from a layout that is no longer here", which is true. A
cascade would delete a role's sidebar because somebody tidied up their own saved
views.

**Three states, not two.** The switch for a role now shows:

| Situation | Switch | Badge |
|---|---|---|
| Preset came from this layout | **on** | *uses this layout* |
| …and you turn it off | off | *will lose this layout* |
| Preset came from another layout | off | *uses Finance layout* |
| …and you turn it on | on | *will be moved to this layout* |
| Preset from before this column existed | off | *uses a layout from an unknown source* |
| No preset at all | off | — |

Unknown is not "none". A row nobody attributed is left alone.

**The guarantee is server-side.** `clearRoleIds` can only delete presets whose
stored `variant_id` matches the layout being saved. Everything else is dropped
from the list — silently, because offering them is not an error and a 400 would
break an ordinary save on data the caller cannot see.

That is what actually closes the hole. Pre-ticking the switches fixes the screen;
a client that computes the wrong list is a bug anybody can ship, and a client
that computes the wrong list **and is obeyed** is how data goes missing. Seven
route tests hold the server side, five the editor.

**Option 3 was rejected** — dropping `clearRoleIds` entirely removes the only way
to detach a role, and a screen that can only add is its own kind of trap.

**A push from an unsaved layout clears nothing**, because nothing can own a
preset it never recorded.

---

## U3 — API keys are rejected unless they match their creator's organization · severity **high** · **FIXED 2026-08-10**

**Found:** 2026-08-09, while verifying R1's service-principal path.

**What happens.** An API key created without an organization authenticates
successfully at first glance but is rejected on every request — a flat `401`
regardless of the roles it carries. It looks exactly like broken authentication.

**Why.** `resolveApiKeyAuth` compares the key's `organizationId` against its
creator's user record and returns `null` when they differ. A key with `null`
organization created by a user who has one never matches.

**Severity was wrong.** Filed as low because it looked like a corner case. It is
the *default* path: an admin working tenant-wide has no selected organization, so
every key they create through the UI comes out unscoped, and every one of them is
dead. See the resolution below.

**Fix.** Default the key's organization to its creator's, and refuse an explicit
mismatch at creation with a message that says why. Done 2026-08-10.

---

## U15 — a public endpoint that emailed the upstream vendor · **FIXED 2026-08-12** · severity **high**

**Removed, not configured.** The whole feature is gone: the widget, the demo
notice bar beside it (which linked to the supplier's GitHub), the public
endpoint, its email template, their tests, and the seven orphaned translation
keys in each of four locales.

**Mirrored into `packages/create-app/template` in the same change**, which the
repo requires and which mattered more than usual here — a template still
scaffolding the widget would have put it back into every app generated from it.

**`DEMO_MODE` now gates nothing in the app layer.** It survives where it means
something else entirely: locking attachment partitions, and a branch in tenant
setup. Those are separate behaviours and were left alone.

**Found:** 2026-08-12, while removing the "Feedback" bubble the owner asked to
delete. The bubble was the visible half; this is the other one.

**What it is.** `POST /api/onboarding/demo-feedback` — the endpoint that bubble
posts to.

```ts
export const metadata = { POST: { requireAuth: false, … } }   // public
const adminEmail = process.env.ADMIN_EMAIL || 'piotr@catchthetornado.com'
await sendEmail({ to: adminEmail, … })
```

Three facts together:

1. **It is unauthenticated.** Anyone who can reach the host can call it.
2. **It sends email**, so it is a spam and abuse vector as well as a data path.
3. **Its default recipient is a named personal address at the upstream vendor.**
   Whatever a user types into that box goes to a third party unless
   `ADMIN_EMAIL` happens to be set.

**Mitigations that exist**: the route applies `checkAuthRateLimit`, and our own
`deployment.md` does list `ADMIN_EMAIL` among the variables to set. So a
deployment following our guide does not mail the vendor. It is still a public
email-sending endpoint, and the hardcoded fallback is still in the code.

**Why it is not merely a white-label item.** A "Contact us" link that points at
the supplier is embarrassing. An unauthenticated endpoint that emails an outside
individual whatever somebody types is a different category, and it should not
ship in a product whose entire premise is knowing who did what and where it
went.

**The fix is deletion, not configuration**, and the owner has already authorised
removing this feature: the widget, the demo notice bar, the endpoint, its email
template and their tests, mirrored into the `create-app` template in the same
change so the two do not drift.

---

## U16 — our public legal pages name another company · severity **medium**

**Found:** the same sweep.

`packages/content/src/modules/content/frontend/privacy/page.tsx` and
`terms/page.tsx` are **public frontend pages** and both tell the reader to
contact `info@openmercato.com`.

Legal pages are the one place a reader is entitled to assume the named party is
the one they are dealing with. Ours currently name somebody else, which is worse
than having no page: it is a statement about who is responsible for their data.

Belongs to the white-label batch, but flagged here rather than only in
`whitelabel.md` because it is a correctness problem, not a branding one.

---

## O1 — a denial lifted from the CLI left no record · **FIXED 2026-08-12** · ours, not upstream · severity **high**

**Fixed and verified live.** The audit write moved out of the API route and into
`DenialService`, so every caller is recorded rather than only the ones that
remember to. The route no longer writes its own entry, which would have filed
each act twice.

Verified by planting a denial directly in the database — so the CLI lift was the
only code path exercised — and lifting it from the console:

```text
audit rows for authority.denial:  2  ->  3
actor_user_id:                    null            (a console act has no user)
context_json: {"origin": "server-console", "actorKind": "system", ...}
```

**A console act has no `sub`, and that is the fact worth recording** rather than
a gap to paper over. R1's principal vocabulary already had the word: it is a
`system` actor, marked with where it came from, instead of an entry that looks
like an anonymous human.

Six tests cover it, including that a repeat lift writes **nothing** (lifting is
idempotent, and a second entry would claim the permission came back twice) and
that an absent `audit_logs` module does not stop the lift — refusing to restore
somebody's access because nothing is listening would turn a missing log into an
outage.

**One cosmetic imperfection left**, not chased: the shared helper stamps
`source: "crud-route"` on every direct write, so a console act carries that
label alongside its accurate `origin`. Misleading in isolation, harmless beside
the origin field, and changing the helper's default would touch every direct
write in the platform.

### The original finding

**Found:** 2026-08-12, reading the audit log while a gate ran. **This is a defect
I introduced the same morning**, in the denials feature itself.

**What happens.** `POST /api/auth/authority/denials` writes an audit entry for
both `withhold` and `lift`. The CLI recovery path —
`mercato auth denials --lift <id>` — calls `DenialService.lift()` directly and
**writes nothing**.

Verified against the running instance: two denials created through the API, two
lifted through the CLI, and `action_logs` holds **two rows, both creations**.

**Why it matters more than it looks.** The CLI is the documented recovery path
for the case where a denial has locked out the only account that could lift it —
so it is exactly the moment somebody restores a withheld permission with no
authenticated user and no oversight. *"Somebody gave a permission back and there
is no record of who or when"* is precisely the failure this platform exists to
make impossible. It is also asymmetric in the wrong direction: the act that
**removes** authority is recorded, the act that **returns** it is not.

**Why it happened.** The audit write lives in the route, not the service, so
every other caller of the service silently inherits no audit. The route was
written first and the CLI added afterwards.

**The fix, and the decision in it.** Moving the audit write into
`DenialService.lift()` covers every caller, but the CLI has no authenticated
user — which is the whole point of it being out of band. R1's principal
abstraction already has the vocabulary: a console lift is a **`system`** actor.
So the service should record the act with an explicit system principal and a
note that it came from the server console, rather than either omitting the entry
or inventing a human.

**Not fixed inline**, because it needs that principal decision applied
consistently and a check that the route does not then write twice. Roadmap
item 7.

---

## U14 — the resolver binds 38% of live commands · severity **high**

**Found:** 2026-08-12, answering the `messages.*` question on the roadmap. The
question turned out to be the wrong one, and the answer underneath it matters
much more.

**The original question**, and its answer: `messages.actions` and
`messages.manage` were the only 2 of 113 capability descriptors classified from
their titles rather than from code. Checked:

- **`messages.actions` is enforced** — `POST /api/messages/[id]/actions/[actionId]`
  declares `requireFeatures: ['messages.actions']`. The premise that no route
  enforces it was wrong.
- **`messages.manage` is not enforced anywhere**, and its descriptor already says
  so in its own note. Honest, and still true.

**What that uncovered.** The command gate is keyed by **capability**, and
`commands/interceptors.ts` says plainly that a command declaring none is not
gated — *"the gap is visible rather than guessed at"*. The mechanism was
documented. **The size of the gap had never been measured.**

Measured, counting only modules that actually run (14 parked modules excluded):

| | |
|---|---|
| Commands declaring a capability | **21** |
| Commands declaring none | **35** |
| **Share the resolver can bind** | **38%** |

| Ungated, by live module | |
|---|---|
| `messages` | 20 |
| `planner` | 4 |
| `scheduler` | 4 |
| `example` | 3 |
| `dictionaries` | 2 |
| `translations` | 2 |

**The worst instance.** `messages.email` is classified **E3, irreversible,
`externalEffect: true`** — the strongest classification in the module, on the
grounds that a sent message cannot be recalled. And `messages.messages.compose`,
`.reply` and `.forward` declare **no capability**, so nothing maps that
classification onto an act. **The governance layer cannot hold a message send**,
whatever ceiling applies to the actor.

That is the product's premise failing on its most irreversible act. Everything
gated today — auth, currencies, directory, feature toggles — is reversible
administrative work.

**Not a defect in the gate.** The gate behaves exactly as documented and fails
open by design, because refusing every unmapped command would break the platform.
The work is mapping commands to capabilities, module by module, and `messages`
is where it should start.

**Partly closed 2026-08-12: 38% → 46%.** Five message commands had an
unambiguous capability and now declare one — `actions.execute`,
`actions.record_terminal` and `confirmations.confirm` map to `messages.actions`;
the two draft-attachment commands map to `messages.attach_files`. All 300
messages tests still pass.

### What is left, and the design question in it

Fifteen message commands remain, and the interesting ones are
`compose` / `reply` / `forward` / `update_draft` — the commands that carry a
message from draft to sent.

**Tracing the send confirms the gate can reach it.** The transition is
`isDraft = false; status = 'sent'`, which emits `messages.message.sent`, which a
subscriber turns into a queued job, which the worker delivers by email. Five
hops, and the gate sits at the first — but holding the command does prevent the
send, because nothing downstream fires until the command commits. So this is a
mapping gap, not a structural one.

**The question is which capability to declare**, and a `capability:` is static
while the answer is not:

| Choice | Consequence |
|---|---|
| `messages.compose` (E1) | Correct for an internal message. **Under-classifies an external send** — the irreversible act stays effectively ungated |
| `messages.email` (E3, irreversible, external) | Correct for an external send. **Over-classifies internal messaging**, which in `enforce` mode could hold ordinary internal notes for approval |

`messages.compose`'s own note states the intended split: *"Internal composition
only. Sending outside needs messages.email, which is classified separately and
much higher."* The design assumes two acts; the code has one command.

**Recommendation: declare `messages.email`.** Everything in this system is a
ceiling and the answer is the minimum, so over-classifying restricts and
under-classifying permits — and permitting is the direction this design never
takes. Over-restriction is visible and correctable; an ungated external send is
silent.

**The better fix, if it is worth the work:** split the send transition into its
own command, or let a command resolve its capability from its input. Either
makes the classification honest instead of choosing which way to be wrong. That
is a decision with product consequences — whether internal messages may be held
— so it is worth naming rather than settling quietly.

**Placed at roadmap item 6**, taking the slot the question that found it
occupied.

---

## U13 — the authority graph showed raw UUIDs · **FIXED 2026-08-12** · severity **high**

**Found:** 2026-08-12, exploring the platform while a gate ran (COOKBOOK rule
zero-eight). It was on no list.

**What happened.** Every row of **Settings → Authority graph** rendered as

```text
065bd751-ada0-4469-a571-879950a1be51
→ cc563521-c10e-40ff-9875-9dccb645f45d
```

instead of *Acme Corp → Approval Branch*. **The one screen that governs
authority could not be operated**: nobody can tell which link they are about to
restrict, and lowering the wrong ceiling silently restricts the wrong people.

**Why.** Not a missing feature — the page already maps ids to names through
`nameOf`, falling back to the id. The fallback was firing on every row, because
the lookup asked for more than the API allows:

```ts
'/api/directory/organizations?pageSize=200'   // max is 100
```

`viewSchema` caps `pageSize` at 100 and the route returns **400** when it is
exceeded, so `orgsQuery` failed on every load, `orgsQuery.data` stayed
`undefined`, and every name fell back to a UUID.

| `pageSize` | Result |
|---|---|
| 50, 100 | `200 OK`, 2 items |
| 101, 150, 200 | `400`, 0 items |

**Fixed** by asking for 100. One line.

**Two things it leaves behind**, both recorded in
[ux-findings.md](ux-findings.md): the page **degrades silently** when that lookup
fails rather than saying anything is wrong (X5) — which is why this survived
unnoticed — and three pages in **parked** modules make the same over-max request
(X6), harmless only because those modules do not run.

**Worth generalising.** The API behaved correctly; the caller asked for something
the contract forbids and never checked. `AGENTS.md` already says *"Keep pageSize
at or below 100"*, so the rule existed and was simply not followed.

---

## U12 — a soft-deleted row keeps its unique code forever · **FIXED 2026-08-12** · severity **medium**

**Fixed and verified live.** Both constraints are now partial unique indexes
carrying `where deleted_at is null`, so a deleted row no longer reserves its
value. Verified against the running instance: a soft-deleted `XTS` from
2026-08-09 had blocked creating `XTS`; after the migration the create succeeded,
and a **live** duplicate was still correctly refused.

The entities drop their `@Unique` decorators — the decorator cannot express a
partial index — and `Migration20260812120000` becomes the source of truth, the
same arrangement `users_tenant_email_hash_uniq` already uses.

**The undo question, answered.** Making the index partial created a case that
could not previously exist: undoing a delete when somebody has since reused the
code. Both delete commands now check for a live row first and refuse with a
**409** naming the conflict, rather than letting the index raise a raw violation
that surfaces as a 500. Restoring would mean two live rows sharing one value, and
choosing which survives is not a decision an undo may take on its own — renaming
invents data, overwriting destroys it, and doing nothing silently lies about
having worked. Six tests cover it.

### The original finding


**Found:** 2026-08-12, while reproducing U4 against the running instance.

**What happens.** Delete a currency, then try to create it again with the same
code. It is refused with *"Currency code already exists for this
organization."* — and the currency is not in any list, because it is deleted.
The code is unusable from then on, permanently.

**Why.** The application check is correct and excludes deleted rows:

```ts
const existing = await em.findOne(Currency, {
  code: parsed.code, organizationId, tenantId, deletedAt: null,
})
```

The **database constraint is not**:

```text
"currencies_code_scope_unique" UNIQUE CONSTRAINT, btree (organization_id, tenant_id, code)
```

No `WHERE deleted_at IS NULL`. So the application says "no duplicate, go ahead",
the insert violates the constraint, and the error is mapped back to the same
conflict message — which now names a row the user cannot see. **The misleading
message is half the bug**: it sends somebody looking for a currency that is not
there.

**Reproduced.** A soft-deleted `XTS` row from 2026-08-09 blocked creating `XTS`
on 2026-08-12. `select … where code='XTS'` returned exactly one row, with
`deleted_at` set.

**Two tables have this shape**, both in currencies:

| Table | Constraint |
|---|---|
| `currencies` | `currencies_code_scope_unique` on `(organization_id, tenant_id, code)` |
| `exchange_rates` | `exchange_rates_pair_datetime_source_unique` |

**The fix** is a migration replacing each with a partial unique index carrying
`where deleted_at is null` — the shape `users_tenant_email_hash_uniq` already
uses in this codebase, so there is precedent to copy rather than a pattern to
invent.

**Not fixed inline, deliberately.** It is a schema migration with one genuine
question attached — what should happen when an *undo* of a delete collides with
a row created in the meantime — and bundling it into the U4 fix would have made
both harder to review and to revert. It is **roadmap item 5**.

---

## U4 — A superadmin cannot delete a currency · **FIXED 2026-08-12** · severity **medium**

**Fixed and verified live.** Reproduced first — `DELETE
/api/currencies/currencies?id=…` returned `400 expected string, received
undefined` at `organizationId`, three days after it was recorded — then fixed,
rebuilt, and re-run against the running instance: `{"ok":true}`, with
`deleted_at` and `is_active = false` both set on the row.

**The fix, and why it is not a hole.** `currencyDeleteSchema` required
`organizationId`, and **nothing read it**. Every use of `parsed.organizationId`
in the module is in a *create* path. The delete finds its record through
`buildCurrencyCommandWhere(ctx, …)` and enforces the boundary with
`ensureOrganizationScope` against the **loaded record** — both take scope from
`ctx`, which a request body cannot forge. So the requirement gated nothing and
rejected exactly the actor who legitimately has no organization. It is now
`z.uuid().optional()` in `currencyDeleteSchema` and `exchangeRateDeleteSchema`.

Ten tests guard it, including that `tenantId` stays required and that a
malformed organization id is still rejected — optional must not mean
unvalidated.

**The rule this adds to the U4 family**, stated the other way round from the
sweep's version: *never **require** the actor's organization from an actor who
has none.* The sweep asked where the value is wrongly **stored**; this is where
it is wrongly **demanded**.

### The original finding


**Found:** 2026-08-09, while verifying R2b against the running platform.

**What happens.** `DELETE /api/currencies/currencies?id=…` returns
`400 Invalid input — expected string, received undefined` at `organizationId`,
for a superadmin, whatever else the request carries.

**Why.** The route's body schema is `z.object({}).loose()` — permissive — so the
rejection comes from the *command*, not the route. `mapInput` derives the scope
from the actor:

```ts
organizationId: ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? undefined,
```

A superadmin acts with `orgId = null` and no organization cookie set, so
`organizationId` is `undefined` and the command's own validation rejects it.
Create is unaffected because its `mapInput` reads `parsed` — the caller-supplied
body — rather than the actor's scope.

**The pattern is the point.** This is the third instance of the same root cause:
*code that derives scope from the actor breaks for the actor who has no scope.*
The other two, both found the same day:

- audit entries were scoped to the actor's organization, so a superadmin's
  entries landed with none (fixed in R2a)
- the audit list filtered `organization_id = <caller's org>`, hiding every
  tenant-scoped row (fixed in R2a)

**Worth a sweep**, not just three point fixes: search for
`selectedOrganizationId ?? auth?.orgId` and ask what each site does when both are
null. A superadmin is the *most* privileged actor and currently the one most
likely to hit a wall.

**Fix.** Either let the command accept a caller-supplied `organizationId` on
delete as create does, or resolve the record's own organization when the actor
has none.

---

## U5 — The test suite is intermittently red under parallel execution · severity **medium**

**Found:** 2026-08-09, during R2a-custom.

**What happens.** Two consecutive full-gate runs failed on **different** tests,
neither related to the change under test:

```text
run 1  @open-mercato/cli   integration cache and options ›
                           reuses app-local private attachment storage…
run 2  @open-mercato/ai-assistant  McpClient stdio integration ›
                           starts exactly one SDK-managed server process…
```

**Both pass in isolation.** `cli` alone: 1,220 passed. `ai-assistant` alone:
1,379 passed. Both failures involve **spawning processes or writing to shared
filesystem paths**, and the suite runs with `turbo --concurrency=2`.

**Why it matters more than it looks.** A gate that fails at random teaches the
team to re-run rather than investigate, and a real regression then hides among
the noise. It also makes "the gate is green" — the rule every batch depends on —
unreliable as a statement.

**Fix.** Give the process- and filesystem-touching tests unique temp roots per
worker (they appear to share a fixed path), or mark them to run serially. The
`ai-assistant` MCP test asserting *exactly one* spawned process is inherently
sensitive to a shared process table and is the likelier of the two to need
serialisation.

**Until then:** when the full gate fails, re-run the failing package **in
isolation** before treating it as a regression — and record both results, so a
genuine failure is never dismissed as flake.


---

## U6 — WITHDRAWN. Not an upstream issue; we were on the wrong Node

**Raised and withdrawn the same day (2026-08-09).**

**The claim:** two `ai-assistant` suites could not load because `isolated-vm`
ships no native build for this platform, and it reproduced at `a144280` with the
tree stashed, so it was not ours.

**What was actually true:** the repo declares `"node": "24.x"`. The shell running
the gate had **Node 22.21**. `isolated-vm`'s prebuilds are `abi137` and `abi147`
— **abi137 is Node 24**. The binary was there all along; the runtime asking for
it was the wrong one.

On Node 24 the same two suites pass, and the package goes from 1,270 tests to
**1,379**.

**Why the reproduction did not catch it.** Stashing the tree proved the failure
was not caused by my *changes*. It could not prove the failure was not caused by
my *environment* — both runs used the same wrong Node. A control that varies one
thing tells you nothing about the thing it holds fixed.

**What it cost:** a false entry in this file, and every gate result recorded
before it measured on an unsupported runtime.

**What replaced it:** [L20](../../LESSONS.md) and the Node 24 section of
[local-instance.md](local-instance.md).

---

## U7 — the journal cannot tell a machine actor from a human one

**Severity:** medium · **Status:** open · **Found:** 2026-08-09 (during R3)

`action_logs.actor_user_id` is a `uuid` column, and everything that reaches it is
narrowed to a bare UUID on the way in:

```ts
const toNullableUuid = (value: unknown) => {
  const candidate = parseSubject(value).id        // strips `api_key:`
  return UUID_REGEX.test(candidate) ? candidate : null
}
```

So a write performed by an API key is stored as the key's UUID with **no record
that it was a key**. In the journal, a key acting and a person acting are
indistinguishable — and telling those apart is the entire premise of this
platform.

Two related consequences:

- **`zod` validation failures are silent.** A non-UUID `tenantId` does not raise;
  `parseCreateInput` catches, falls back to the permissive normaliser, and the
  normaliser nulls it. An entry can be written with no tenant and nobody is told.
  (This is also why a test using `tenantId: 'tenant-1'` exercises a path
  production never takes — use real UUIDs.)
- Invariant **I2** says the human/machine asymmetry lives in *data*. Here the data
  discards it.

**What R3 did about it:** the ledger derives `actor_kind` from the **raw** subject
before normalisation, so the chain records `service` where the journal records
only a UUID. That closes the gap for the record that matters most, and leaves the
journal's own column wrong.

**Fixed 2026-08-10.** `action_logs.actor_kind` is written from the raw subject,
the same source the ledger reads, so the journal and the chain now agree. The
column is nullable and **null means unknown, never human** — an entry written
before the column existed cannot have its kind recovered from the row alone.

`mercato audit_logs backfill-actor-kind` recovers what is recoverable: an actor
id matching `api_keys` was a service principal, one matching `users` was a human,
no actor at all was the system. Anything matching neither table stays null. It
dry-runs by default and prints the breakdown before it will write.

The first version of that command claimed a human could not be distinguished from
an unknown actor, which was simply wrong and would have left every historical
human action permanently unattributed. The dry run is what showed it: 15 rows
"cannot be determined" for a single-admin instance is not a plausible number.

---

## U5 — the gate failed at random. What that turned out to be

**Severity:** medium (trust in every other result) · **Status:** two causes found
and fixed, one unexplained and now self-diagnosing · **Worked:** 2026-08-09

Three of six full gate runs in one day failed, each in a different place, all
passing in isolation. Investigated as one problem; it was three.

### 1. Not flakiness at all — I was running the tests wrong

Two "failures" were produced by running `npx jest --config packages/core/jest.config.cjs`
**from the repo root**. Several tests resolve paths from `process.cwd()`, so they
looked for `<repo root>/src/modules/...`, which has never existed. Turbo runs each
package in its own directory; my invocation did not.

Recorded as [L25](../../LESSONS.md). Nothing to fix in the code.

### 2. A real defect: an I/O-bound suite on a unit-test timeout

`packages/cli/.../openapi.test.ts` builds a module tree in a temp directory, runs
route discovery over it, and bundles. Idle, each test takes **165–470ms**. Under
`turbo run test`, where several packages' workers compete for the same disk, one
exceeded jest's **5s default** and failed as a timeout.

Five seconds is a contract for unit tests: *if it has not finished, it has hung*.
That is the wrong contract for a suite whose work is I/O — and it would fire on
any loaded CI runner, not just here.

**Fixed** by stating the timeout explicitly (30s) with the reasoning in the file.
Deliberately bounded at ~60× the idle cost rather than set high enough never to
fail: a genuine performance regression in the generator must still surface.

### 3. One failure that has never been explained

`module-decoupling.test.ts` asserted that `resolveDefaultPartitionCode('catalog:catalog_product')`
falls through to `privateAttachments` when catalog is disabled, and got
`productsMedia` — which requires `E.catalog.catalog_product` to have been defined
at the moment `partitions.ts` was imported.

It should be impossible. In `packages/core`, jest's `moduleNameMapper` redirects
`#generated/entities.ids.generated` to a static mock with **no** catalog, the test
mocks the same specifier again with a reduced registry that also has no catalog,
and both the generated source and its compiled output contain no catalog either.

**Not reproduced** in three solo runs of the suite or in the gate runs since.

Rather than guess at a cause or leave the next occurrence as unexplainable as
this one, the test now **asserts its own precondition**: that the registry it sees
has no `catalog` key. If it ever fails again, the failure will say whether the
mock applied — which is the one fact this investigation lacked.

### A third cause, found later the same day

**A running local instance breaks the gate.** The CLI's integration-cache tests
build ephemeral environments and contend with the server for ports, database
connections and queue state. Two consecutive full-gate runs failed in
`integration cache and options` — different tests each time, always timeouts,
always green in isolation — and the same package's 1,220 tests passed the moment
the server was stopped.

This is the same shape as the two causes above and deserves the same treatment:
it is not flakiness, it is an unstated precondition. The runbook now states it.

### What was ruled out

- **CPU oversubscription.** The shared `jest.config.base.cjs` already caps
  `maxWorkers: 2`, and the root script caps turbo at `--concurrency=2`: four
  workers on eight cores. It was the first thing I assumed and it was wrong.
- **Test order dependence within a package.** Three consecutive solo runs of the
  core suite, and two of the cli suite, were identical.

---

## U4 — the sweep, and what the pattern actually is

**Swept 2026-08-10.** `selectedOrganizationId ?? auth?.orgId` appears in 53
files. That number is misleading in both directions, and the useful output of
this sweep is the classification rather than a count.

### Most of them are not the bug

Thirty-eight are in **parked** modules — catalog, sales, wms, staff, resources,
customers — which do not run. Of the rest, the expression appears in three
distinct shapes, and only one of them is dangerous:

| Shape | Example | Verdict |
|---|---|---|
| **Comparison / logging** — "what org is the actor in, for this message" | `shared/lib/commands/scope.ts` | Fine. Already hardened for the superadmin case (#2441), with an explicit branch and an opt-in strict mode |
| **Filter** — "narrow this query to the actor's org" | `currencies/commands/scope.ts` | Fine. `undefined` omits the filter, which for a superadmin is tenant-wide and correct |
| **Derived value** — "the org to write into the record" | `api_keys/api/keys/route.ts` | **This is U4.** Null for a superadmin, stored, and wrong forever after |

So the rule is not "never use this expression". It is:

> **Never use the actor's organization as a value you store.** Comparing against
> it is fine. Filtering by it is fine. Writing it into a record makes the record
> mean "whatever scope the person who happened to create it had", which for the
> actor with no scope means nothing at all.

Every U4-family bug so far is that one sentence: audit entries invisible because
they were scoped to the actor (R2b), a superadmin unable to delete a currency,
and U3.

### U3 — resolved, after being wrongly closed twice

**The defect is real, and it is the default path.** A key created through the
ordinary UI flow by the admin came out with `organization_id = null` while its
creator had an organization. First use: **401**. Setting that one column to the
creator's organization: **200**. Same key, same request, one column.

```
create via /api/api_keys/keys        -> 201, organizationId: null
GET /api/directory/organizations     -> 401   (X-Api-Key, correct header)
update api_keys set organization_id = <creator's>
GET /api/directory/organizations     -> 200
```

**Why it fires on the ordinary path.** `resolveApiKeyAuth` resolves a key through
`sessionUserId ?? createdBy` and then requires that user's organization to equal
the key's. Creation took the key's organization from the *request scope*
(`selectedOrganizationId ?? auth.orgId`), which for an admin working tenant-wide
is null — while the creator's own record has an organization. The two disagree by
construction. This is the U4 shape: the actor's request scope is not a value to
store.

**Fixed at creation**, not at authentication:

- the key's organization now defaults to **the creator's own** organization —
  a property of the creator, which is what the comparison will be made against;
- an explicitly requested organization that differs is refused with **422** and a
  message saying the key would be rejected every time it is used;
- a context with no loadable creator (CLI, service bootstrap) keeps the previous
  derivation — not finding a creator is an absence of evidence, not a mismatch.

Verified end to end against the running instance: `organizationId` is now the
creator's, and the first request with a new key returns 200. Five tests cover the
four branches.

**Why not fix the comparison instead.** It is doing real work. For a **session
key** it is correct outright — the key acts as that user and must not outrange
them. For a **regular key** it is also, today, the only thing stopping a
single-organization admin from minting a key with `organization_id = null`, which
`RbacService` reads as *unrestricted across the tenant*. Loosening it to make a
broken write succeed would have converted an availability bug into a privilege
escalation.

**What the comparison still costs**, and what is on the backlog because of it:

| Behaviour | Consequence |
|---|---|
| Creator soft-deleted | Every key they ever created returns 401, silently. Offboarding an admin disables their integrations |
| Creator moved to another organization | Same, immediately |
| Key scope tracks a person's current attributes | A machine credential's authority changes when someone edits an unrelated user record |

The durable fix is to give a regular key its own stored scope, validated against
the creator's visibility **at creation**, and stop consulting `createdBy` at
authentication at all — `sessionUserId` keeps its comparison because there the
borrowed identity is the point. That is its own backlog item.

**What `createdBy` does *not* do — checked, not assumed.** It does not widen the
key's permissions. `RbacService.loadAcl` parses the subject, sees a service
principal, and reads features from **the key's own roles**; the creator's user
ACLs are never consulted. The escalation this was originally feared to be does
not exist. What exists is a machine credential whose life is tied to a person's.

**The header trap that cost a day** stands on its own and is worth keeping:

```bash
curl -H "X-Api-Key: <secret>" ...                 # works
curl -H "Authorization: ApiKey <secret>" ...      # works
curl -H "Authorization: Bearer <secret>" ...      # 401, always
```

Sending `Bearer` produces a 401 indistinguishable from a scoping refusal. That is
what made the first reproduction worthless — and concluding from a worthless
reproduction that there was no bug is [[L32]], the more expensive of the two
mistakes.

---

## U8 — a user-deletion cascade that had never run once · severity **medium** · **FIXED 2026-08-10**

**Found:** 2026-08-10, while looking for an event to hang API-key revocation on.

**What happens.** `communication_channels/subscribers/user-deleted-cascade.ts`
subscribes to `auth.user.deleted` to disconnect a departed user's email and
calendar channels: stop the polling worker, deactivate the channel, orphan the
encrypted credentials. Its first line is:

```ts
if (!payload || typeof payload.userId !== 'string' || !payload.userId) return
```

`emitCrudSideEffects` emits `{ id, organizationId, tenantId }`. There is no
`userId`. **The handler returned early on every real event**, so a deleted user's
channels stayed connected, kept polling, and kept their credentials.

**Why nothing caught it.** Every test in the suite constructs
`{ userId: 'user-1', tenantId: 'tenant-1' }` — a payload the platform does not
produce. Seven tests, all green, all verifying the handler against an invented
contract. Same shape as [L34](../../LESSONS.md): a code path with tests and no
execution.

**Severity.** Medium rather than high because the channel rows are inert without
a running poller for that tenant, and because deletion is rare. It is a data
retention and privacy failure rather than an access-control one — but "we
disconnect a departed user's mailbox" was a claim the code made and did not keep.

**Fix.** Read `payload.id`, still accepting `userId` so a hand-rolled emitter
does not hit the same wall from the other side, and two tests written against
the shape the platform actually emits.

**Worth checking elsewhere:** any other subscriber to a CRUD event that names the
record something other than `id`. This is the only one today.

---

## U9 — a repo-walking test guard that races sibling packages · severity **low** · **FIXED 2026-08-10**

**Found:** 2026-08-10, as a gate failure that had nothing to do with the change
under test.

`packages/ui/src/primitives/__tests__/no-deprecated-notice.test.ts` walks every
source file under `apps/` and `packages/` looking for deprecated `<Notice>` JSX.
During a parallel gate run, `@open-mercato/shared` creates and removes
`.tmp-dynamic-loader-*` scratch directories for its own tests. The walk listed a
file inside one and read it a moment after it was deleted:

```
ENOENT: ...\packages\shared\.tmp-dynamic-loader-EzNndM\src\modules\probe\data\entities.ts
```

The failure names the `<Notice>` guard and has nothing to do with `<Notice>`.
Passes on its own, fails in the gate — the shape of every flake that eventually
teaches people to re-run rather than read.

**Fix.** Skip `.tmp-*` directories, and treat a file that vanishes between being
listed and being read as what it is — a live working tree, not a violation. The
platform's other repo-walking guard (`escapeLikePattern.test.ts`) already wraps
its whole walk in try/catch; this brings the two into line rather than inventing
a convention.

### And a second one, found on the next run

`mcp-client.integration.test.ts` spawns a real Node process and completes an MCP
handshake, then asserts exactly one server process started. On an idle machine it
takes about **six seconds**; jest's default timeout is **five**. It passes alone
because the suite's setup time is not counted against the test — and fails under
a parallel gate, where twenty-two packages compile and test at once.

The assertion is right; the budget was wrong. Now `30_000`, with a comment saying
why. A timeout tuned for an idle machine reports "the gate is red" when it means
"the laptop was busy".

### And a third, which named the root cause

`crud-indexer-config.test.ts` failed the same way two runs later, on the same
scratch directory. That is three walkers now, and the pattern is not the walkers:

**`packages/shared` creates `.tmp-dynamic-loader-*` inside its own package tree**
(`fs.mkdtempSync(path.join(process.cwd(), ...))`) while its tests run. Any guard
that walks `packages/` finds those files and reads them a moment after they are
deleted.

The fixture cannot simply move to the OS temp dir: the dynamic loader it tests
resolves real dependencies relative to the repo, which is why it is there. So the
walkers are hardened instead — but **eleven more walk-and-read without a guard**,
and any of them can fail a green change tomorrow. On the backlog.

Related: [U5](#u5--the-test-suite-is-intermittently-red-under-parallel-execution--severity-medium),
the same family. **Three different tests failed three gate runs, none related to
the change under test.** That is how a gate stops being read: not because it is
wrong once, but because it is wrong differently each time. All three are fixed
rather than retried.

---

## U10 — renaming an organization moved it to the root · severity **high** · **FIXED 2026-08-10**

**Found:** 2026-08-10, when an end-to-end test of the approval gate kept passing
an act it should have held. The act was fine; the organization had moved.

**What happens.** `PUT /api/directory/organizations` with `{ id, name }` —
a rename, nothing else — **detaches the organization from its parent** and
**orphans all of its children**.

```
create  parentId=065bd751  depth=1
rename  {"id": ..., "name": "..."}
after   parentId=null      depth=0
```

**Why.** Every field in the update command is guarded, except the two that
describe the organization's *position*:

```ts
if (parsed.name !== undefined) entity.name = parsed.name
if (resolvedSlug !== undefined) entity.slug = resolvedSlug
if (parsed.logoUrl !== undefined) entity.logoUrl = parsed.logoUrl ?? null
if (parsed.isActive !== undefined) entity.isActive = parsed.isActive
entity.parentId = parentId                     // ← unconditional
```

`const parentId = parsed.parentId ?? null` collapses "not mentioned" into
"null", and the assignment then applies it. `childIds` has the same shape one
level up: an omitted list reaches `clearRemovedChildren` with an empty desired
set, which detaches every child.

**Why it is high, not medium.** An organization's position is not decoration. It
decides what its members can reach — the platform's own capability note for
`directory.organizations.manage` says *"moving one moves what its members can
reach"* — and `ancestor_ids` is the index the authority graph resolves ceilings
along. So a rename silently rewrote both an access boundary and the structure the
resolver reasons over, with a 200 and no diff anybody would notice.

**Fix.** Guard both, exactly like the fields above them. `parentId: null` sent
explicitly still detaches; not mentioning it now means what it means everywhere
else in the same function.

**Same family as [U2](#u2--the-sidebar-role-apply-screen-is-one-click-from-silent-data-loss--severity-medium--fixed-2026-08-10):**
an absent value read as an instruction to clear. Third instance this week,
counting the sidebar presets and this one's two fields. Worth a look wherever a
partial update writes a relationship.

### A fourth, and this one is contention rather than a race

`packages/cli/src/lib/testing/__tests__/integration.test.ts` — the integration
environment cache. Two of its cases exceed a **60-second** budget inside the full
gate and pass in **17 seconds** when the file is run alone.

Sixty seconds is not a tight budget. Exceeding it means the work is being starved,
not merely slowed — twenty-two packages compiling and testing at once, on a
machine whose Docker daemon had additionally been unresponsive for hours.

Recorded rather than fixed, deliberately: raising an already-generous timeout
treats the symptom, and the honest fix is either to stop these tests contending
(run them outside the parallel gate) or to find what they are waiting on. That is
its own piece of work — see PROGRESS item 3.

**What matters for anyone reading a red gate**: check whether the failures are in
the area you changed. Four separate flakes today, none of them related to the
change under test.

## U11 — authority edges are seeded once and never maintained · severity **high**

**Found:** 2026-08-11, while the owner was following my own test instructions.

**What happens.** `Migration20260809193000` creates `organization_edges` and seeds
one row per organization that had a parent **at migration time**. Nothing creates
an edge afterwards:

- creating an organization with a parent does **not** create an edge
- moving an organization to a different parent does **not** create or update one

Verified by grep: `OrganizationEdge` is constructed in exactly one place,
`api/organization-edges/route.ts` (a POST). There is no subscriber, no command
hook, no `setup.ts` step.

**Why it matters.** The graph ceiling is one of the resolver's inputs. Without an
edge there is no ceiling, so **the organization hierarchy silently stops
constraining anything for every organization created after 2026-08-09**. It fails
in the permissive direction, which is the safe one — and it means a control the
platform claims to have does nothing for new data.

The live instance shows it exactly: `Approval Branch` has `parent_id` set to
`Acme Corp` and **no edge row**. The only three rows in the table are soft-deleted
leftovers pointing at organizations that no longer exist.

**Two things travel with it.**

- The authority page's empty state says *"One is created automatically for each
  parent-child link between organizations."* That is **false**, and it is the
  sentence that makes the bug invisible — a reader concludes their tree is too
  shallow rather than that the feature is not running.
- My own `how-to-test.md` Test 2 tells the reader to open that page and *"create
  an edge"*. **The page has no create control.** It edits existing rows only, so
  with nothing seeded it is permanently empty and the feature is unreachable
  without `curl`.

**Fixed 2026-08-11.** `rebuildHierarchyForTenant` now ensures an edge for every
parent-child link and retires edges whose link is gone. That function is already
called after every structural change (seven call sites), so there is one place to
be right rather than seven to remember. New edges seed permissively
(`owns`/`strict`/`A5`) exactly as the migration seeded the originals — an edge
appearing at a low ceiling would restrict people the moment somebody added an
organization, a worse surprise than the bug. An existing ceiling is never
modified: that is somebody's decision, and resetting it on a re-parent would
silently *widen* authority.

The page's empty state is corrected, and `how-to-test.md` no longer tells the
reader to create an edge on a page that cannot.

**Verified live**: renaming an organization now produces
`Acme Corp -> Approval Branch | owns strict A5`.

**It took four attempts, and three failed for a reason that had nothing to do
with the fix** — `yarn build:app` was a Turbo cache hit, so the running app never
received any of them. That is [[L38]], and it is the more consequential finding of
the two.
