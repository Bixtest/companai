# Journal

**What happened, in order, and why.** Newest first.

For *what to avoid*, read [`LESSONS.md`](LESSONS.md). For *where things are*,
read [`INDEX.md`](INDEX.md). This file answers **"how did we get here?"**

---

## 2026-08-12 (late night) — looking at the rebrand, not just testing it

The owner asked me to rebuild and check the white-labelling in the browser. Every
routing claim held — `/` redirects to the login, `/start` and the autologin route
both 404, the backend and API docs render zero *mercato* mentions, and the terms
page carries no company name, no registration identifiers and contact on
`corprorate.com`.

**Three defects were only findable by looking**, and all three had passed a green
gate:

**The logo was cropped and squashed.** `AppShell` applied `rounded-full` — masking
a *circle* out of a mark that fills its canvas — and `object-fit: fill`, stretching
448×473 into a 40×40 box. Three call sites. What makes it worth recording is that
it was never a Companai problem: that treatment **crops and stretches any tenant's
uploaded logo**, which is two defects wearing the costume of a style.

**The `.ico` was dead weight** — I had copied it into `public/` and never
referenced it, because `layout.tsx` named only the SVG. Placing a file is not
wiring it up.

**The description still sold upstream's product** — a "modular ERP foundation".
The rename caught every occurrence of the *name* and none of the *positioning*,
which is the same blind spot as L41 in a milder form: a global replace sees
strings, not meaning.

**What I could not check, and said so:** the login page. I am signed in, and I do
not type passwords into forms, so I cannot reach it. Its source matches the
content-header pattern that renders correctly — verified by analogy, not by eye,
and recorded that way rather than rounded up.

**Gate: 22/22 tasks, 12,867 tests, exit 0.**

---

## 2026-08-12 (night) — Companai, and the rename that invented a company

**The product has a name and wears it.** 169 files: tab title, favicon, app
shell, API docs, content pages, CLI, four locales, and the `create-app` template
throughout so generated apps are not born branded. The owner's decision — keep
the internal `@open-mercato/*` names, rename everything a user can see — was
enforced by protecting the namespace *inside the rename script*, rather than
trusting myself to avoid it by hand.

**The legal pages were replaced, not renamed**, and the owner accepted the
reasoning after offering both options. 667 lines of another company's privacy
policy and terms — registered address, KRS, NIP, REGON, share capital, governing
law. Rebranding would have bound our users under a licence drafted for a Polish
company nobody here has read. The replacements are short, name **the operator**
as responsible rather than us, and say the activity record outlives a closed
account: the one clause this product cannot promise away, because that record is
what other people relied on.

**And then I did the exact thing I had just refused to do.** The blanket rename
turned that company into **"Companai sp. z o.o."** — a limited company that does
not exist — still carrying their real registration numbers, inside a GDPR consent
statement, in four locales. Materially worse than the original, which at least
named a company that is real and accountable.

I had protected the *identifier* namespace, which is the mechanical risk, and
missed the *semantic* one: **text that is about the old name looks identical to
text that merely uses it**. It also rewrote my own doc comments into asserting
the opposite of their point.

**What caught it was upstream's own test.** `consent-controller-locales.test.ts`
existed to guard their registration identifiers; inherited into a fork it had
been quietly asserting that we impersonate them, and when my rename broke it, it
became the alarm. Recorded as **L41**, with the grep list — legal forms,
registration ids, addresses, `consent`/`controller`/`terms` — and a rule I did
not have: **read an inherited test failure before updating it.** A guard from
upstream can be the thing that catches a fork misusing their identity.

**The demo surface is gone.** `/start` and its 44 keys per locale; the feedback
bubble and its public endpoint; the demo notice bar; and autologin — which signed
visitors in **from a password in an environment variable**. That one was unset
and inert, and removing it was still right: a platform whose purpose is knowing
who acted has no business logging somebody in without asking who they are.
`DEMO_MODE` survives only where it means something else entirely.

**Gate: 22/22 tasks, 12,867 tests, exit 0.** Lint: 0 errors.

---

## 2026-08-12 (late) — U14 closes, and the Starting Kit has no known functional gaps

**Neither obvious answer was true**, which is why this one was worth doing
carefully. Saving a draft and sending it are the same command with a flag, and
the two acts are `E1 reversible internal` and `E3 irreversible external`. A
static `capability:` had to pick one: under-classify and the irreversible
external act stays ungated; over-classify and the audit record asserts that
saving a draft was irreversible. **A record that says something false is worth
less than no record**, and that is the premise of the whole product, so
over-classifying was not the "safe" option it looked like.

So `capability` may now be a **function of the input**. One call site reads it,
a plain string behaves exactly as before, and the four messages commands classify
per call — only an explicit `isDraft: true` takes the lower one, because compose
itself defaults an absent flag to sending.

**38% → 54% of live commands gated**, and `messages.email` finally binds to a
real act. The 26 that remain are per-actor read state, planner, scheduler,
example, dictionaries and translations — **no irreversible external act among
them**, which was the thing worth chasing.

**Two decisions kept.** A classifier that throws yields `null` rather than
propagating: the gate only narrows, so losing it costs a restriction, while
letting the throw escape would fail a write because of the attribute whose entire
purpose is holding writes back. And the parameter is typed `never` — typing it
`TInput` made every handler in the platform stop compiling (L40), which the
workspace typecheck caught and the package build did not.

**Gate: 22/22 tasks, 12,914 tests, exit 0.** Lint: 0 errors.

**Phase 1 and Phase 2 are now complete except the Arabic review**, which is the
owner's and blocks nothing. There are no known functional gaps in the Starting
Kit. What remains is Phase 3 onward — the deferred screens, the ledger work, and
the pre-hosting items — plus the white-label batch, which now has a name to
rename to.

---

## 2026-08-12 (night) — the bubble had a back end

**The owner asked me to delete the "Feedback" bubble** that points at the
upstream supplier. Following it to its back end is what made the task worth
doing:

```ts
export const metadata = { POST: { requireAuth: false, … } }
const adminEmail = process.env.ADMIN_EMAIL || '<a personal vendor address>'
await sendEmail({ to: adminEmail, … })
```

**Unauthenticated, sends email, defaults to a named individual outside the
organisation.** Anyone able to reach the host could make it send mail, and
whatever a user typed went to a third party unless `ADMIN_EMAIL` was set.

Honest about the mitigations: the route rate-limits, and our own
`deployment.md` already lists `ADMIN_EMAIL`, so a deployment following our guide
would not have mailed the vendor. It is still a public email-sending endpoint
pointed outside the organisation, in a product whose premise is knowing where
things went.

**Removed rather than configured around** — widget, the demo notice bar beside it
(which linked to the supplier's GitHub), endpoint, email template, tests, and 28
orphaned translation keys across four locales. Mirrored into
`packages/create-app/template` in the same change, which mattered more than the
rule usually does: a template still scaffolding the widget would have put it back
into every app generated from it.

`DEMO_MODE` now gates nothing in the app layer. It survives where it means
something genuinely different — locking attachment partitions, a branch in tenant
setup — and those were left alone. **Deleting a flag is not the same as deleting
a feature**, and conflating them would have changed two behaviours nobody asked
about.

**U16, found in the same sweep and not fixed:** our public `/privacy` and
`/terms` pages tell readers to contact `info@openmercato.com`. That is a
different category from a logo — legal pages are the one place a reader is
entitled to assume the named party is who they are dealing with. It goes to the
**top** of the white-label list rather than into the general pile.

**Gate: 22/22 tasks, 12,907 tests, exit 0.** The drop from 12,910 is exactly the
deleted demo-feedback tests.

---

## 2026-08-12 (evening) — O1 fixed, and the platform gets a name

**The session was interrupted mid-flight.** Nothing was lost: both repos were
committed clean beforehand. The server had not died either — the task tracker
lost its handle, and the platform's own single-instance guard correctly refused
my duplicate start, naming the pid still serving. A small thing that worked
exactly as it should.

**O1 fixed the same day I made it.** The audit write moved out of the API route
into `DenialService`, so no caller can forget it, and the route stopped writing
its own — which would have filed every act twice.

Verified by planting a denial straight into the database, so the CLI lift was the
**only** path exercised: audit rows went 2 → 3, with `actor_user_id` null and
`context_json` carrying `{"origin": "server-console", "actorKind": "system"}`.

The decision inside it: a console act has no `sub`, and that is the fact worth
**recording** rather than a gap to paper over. R1's principal vocabulary already
had the word. Marking it a `system` actor with its origin is honest; leaving the
field empty would make it read like an anonymous human, which is worse than no
entry at all.

One imperfection left deliberately and written down: the shared helper stamps
`source: "crud-route"` on every direct write, so a console act carries that label
beside its accurate origin. Changing the helper's default would touch every
direct write in the platform, which is not a thing to do in passing.

**The product has a name: `Companai`.** With it came the Mac/Apple direction,
permission to vendor any genuinely unrestricted asset, and permission to delete
supplier-facing things outright — the feedback bubble named explicitly. All of it
is in `references/whitelabel.md` rather than only in memory.

I recorded a recommendation on the one open white-label question: **keep the
`@open-mercato/*` package names and rename everything a user can see.** The
internal names cost nothing while upstream is still fixing bugs we would
otherwise fix ourselves; the visible ones cost the entire first impression.

**Gate: 22/22 tasks, 12,910 tests, exit 0.** Lint: 0 errors.

---

## 2026-08-12 (evening) — the question was wrong, and what was under it was worse

**U13 verified fixed**: the authority graph now reads *Acme Corp → Approval
Branch* instead of two UUIDs.

**Item 6 asked me to check two capability descriptors. Both turned out fine**,
and the checking found something much larger. `messages.actions` **is** enforced
by a route — the roadmap's premise was wrong. `messages.manage` is not, and its
own note already says so honestly.

**U14.** The command gate is keyed by capability, and `interceptors.ts` states
plainly that a command declaring none is not gated — *"the gap is visible rather
than guessed at"*. The mechanism was documented. **Nobody had measured the gap.**
Counting live modules only: **21 of 56 commands, 38%.** Twenty of the thirty-five
misses were in `messages`.

Five had an unambiguous answer and now declare one, taking it to **46%**. What
remains is a design question rather than typing: `compose`/`reply`/`forward`
carry a message from draft to *sent*, and a static `capability:` must choose
between under-classifying an external send and over-classifying internal notes.
I recommend the higher classification — permitting is the direction this design
never takes — and noted that splitting the send into its own command is the
better fix. That is a product decision, so it is named rather than settled
quietly.

**Tracing it was worth doing.** The send is five hops from the gate — command →
event → subscriber → queue → worker → `sendEmail()` — which looked structural at
first. It is not: nothing downstream fires until the command commits, so holding
the command does prevent the send. A mapping gap, not an architectural one, and
the difference matters for how it gets fixed.

**O1 — and this one is mine.** Reading the audit log while the gate ran, I found
two `authority.denial` rows for two creations and **nothing for the two lifts**.
The API audits both; the CLI recovery path calls the service directly and writes
nothing. So the act that **removes** authority is recorded and the act that
**returns** it is not — in the feature I built this morning, on the path
documented for when somebody is locked out.

It happened because the audit write lives in the route rather than the service,
so every other caller inherits silence. Not fixed inline: it needs R1's `system`
principal applied to a console actor, and a check that the route does not then
write twice. Roadmap item 7.

**Rule zero-eight has now found three things in one afternoon** — U13, U14 and
O1 — none of which was on any list, all while a build or gate was running.

---

## 2026-08-12 (later still) — U12 answered, and rule zero-eight paid on its first outing

**U12 needed a decision, not just a migration**, which is why it was not folded
into the U4 fix. Both constraints are now partial unique indexes carrying
`where deleted_at is null`, so a deleted row stops reserving its value. The
entities drop `@Unique` — it cannot express a partial index — and the migration
becomes the source of truth, which is the arrangement
`users_tenant_email_hash_uniq` already uses here. Precedent, not invention.

Verified live: `XTS`, blocked since 2026-08-09, creates again, and a **live**
duplicate is still refused.

**The decision.** Making the index partial created a case that could not exist
before: undoing a delete after somebody reused the value. Restoring would give
two live rows sharing one value and there is no correct automatic winner —
renaming invents data, overwriting destroys it, and doing nothing silently claims
to have worked. So both delete commands check first and refuse with a **409**
naming the conflict, rather than letting the index raise a violation that
surfaces as a 500 and explains nothing.

**The generator caught a gap in my own work.** Running `db:generate` as a
schema-diff probe showed it wanted to create `authority_denials` — because I
hand-wrote that migration this morning and never updated the auth ORM snapshot.
Kept the snapshot updates, discarded the generated migrations, and both modules
now report *no changes*. Worth remembering: **a hand-written migration is only
half the change.**

**Rule zero-eight earned its place within an hour of being written.** While the
gate ran I opened the authority graph and found every row rendering as
`065bd751-… → cc563521-…` instead of *Acme Corp → Approval Branch*. **The one
screen that governs authority could not be operated** — nobody can tell which
link they are about to restrict.

Not a missing feature: the page already maps ids to names. The lookup asked for
`pageSize=200` where the API caps it at 100, so it returned **400** on every load
and every name fell back to a UUID. One line to fix, high severity, and on no
list. I would never have found it reading code.

It leaves two things behind, both recorded in `ux-findings.md`: the page
**degrades silently** when that lookup fails, which is precisely why it survived,
and three pages in parked modules make the same over-max request.

**Gate: 22/22 tasks, 12,904 tests, exit 0.** Lint: 0 errors.

---

## 2026-08-12 (later) — U4 was still broken, and reproducing it found another

**Phase 2 of the roadmap is verifying things nobody has checked.** U4 went first
because the route still derived its organization in the shape the original bug
had. It was not a stale record: `DELETE /api/currencies/currencies?id=…` returned
`400 expected string, received undefined` at `organizationId`, three days after
it was written down.

**The fix was to delete a requirement, not to add a fallback.** `organizationId`
was mandatory in `currencyDeleteSchema` and **nothing read it** — every use of
`parsed.organizationId` in the module is in a create path. The delete finds its
record through `buildCurrencyCommandWhere(ctx, …)` and enforces the boundary with
`ensureOrganizationScope` against the *loaded record*, both taking scope from
`ctx`, which a request body cannot forge. So the field gated nothing and rejected
the one actor who honestly has none. Adding a fallback would have been the U4
antipattern itself — deriving a value from an actor who has no scope.

That is worth stating as the other half of the family rule. The sweep asked
*where is the actor's organization wrongly stored?* This is *where is it wrongly
demanded?*

**Reproducing it turned up U12.** Creating a currency whose code had been deleted
fails with "already exists for this organization" — naming a row the user cannot
see. The application check correctly excludes soft-deleted rows;
`currencies_code_scope_unique` does not carry `where deleted_at is null`, so the
insert violates the constraint and the error is mapped back to a message about a
row that is not there. Deleting a currency makes its code permanently unusable.
`exchange_rates` has the same shape.

**Not fixed inline, and that was a judgement rather than a dodge.** It needs a
migration and an answer for what an undo-of-delete does when it collides with a
row created in the meantime. Bundling it into the U4 fix would have made both
harder to review and to revert. Recorded as U12 and placed at roadmap item 5,
immediately after this phase.

**The approvals queue, verified through the API rather than handed over.** I had
written that this item "needs the owner" because it is a screen I cannot see.
That was the wrong reason, and checking it changed the size of the ask. The real
limit is narrower: I do not type passwords into forms, so I cannot log a browser
in. Everything on the other side of that line I can do.

So I did: set enforcement to `enforce`, lowered the Approval Branch ceiling to
A2, and drove three acts through the API. The first was held with its reason
(*the edge caps authority at A2*) and the rename did not happen. The second I
approved, and the rename executed. The third I rejected, and it never did. One
act is parked in the queue for the owner, so their part is now three minutes of
looking and one click rather than twenty minutes of setup.

**A good incidental**: `Approval Branch`'s authority edge already existed,
annotated *"created automatically from the organization tree"* and timestamped
this morning. That is the U11 fix working on the live instance — and it is
precisely the step my own bad instructions once sent the owner hunting for.

**Gate after the U4 fix: 22/22 tasks, 12,898 tests, exit 0.**

**And then the owner logged my browser in, which changed the shape of the work.**
They asked whether it would help. It does, materially: within minutes I had
verified the thing I had just handed them, by looking at it and clicking it.
**Reject** produced *"Rejected. It will not run."*, the card left the queue and
the name did not change; **Approve and run** executed the rename. Item 3 closed
by me rather than by them.

The standing permission that came with it — click state-changing buttons on the
local instance, report afterwards — is recorded in memory along with the two
limits that do not move: I never type passwords into forms, and anything off this
machine still needs an explicit ask.

**The first thing it caught was not on any list.** A "Contact us" bubble in the
screenshot turned out to be `DEMO_MODE`, which defaults to **`true`**
(`parseBooleanWithDefault(process.env.DEMO_MODE, true)`), so anyone deploying
without setting it explicitly ships a feedback widget in their admin. Accurately:
it posts to a *local* endpoint so nothing leaves the instance, and
`deployment.md` already sets it false — minor. But a demo-only feature should
fail closed, and I would never have seen it by reading code. Roadmap item 8.

**Test state restored** afterwards: name, ceiling back to A5, enforcement back to
`shadow`.

**Two round-trips of the L38/L39 tax.** Both fixes needed
`build:packages --force`, `build:app --force`, and a server restart before
anything could be verified — about seven minutes each time. Worth the cost:
without it I would have been reading code and guessing.

---

## 2026-08-12 — one roadmap, and the last of G1

**The owner stopped me on process, and was right.** *"You already had a plan, then
you had 5 waves, and now this."* Three overlapping views of the same work is not a
plan — it is three plans, which is none, and it means tasks get picked off
whichever list happens to be open. `PROGRESS.md` is now the roadmap and nothing
else: 23 items, ordered, from here to the finish line, each tagged with whether it
needs the owner, is blocked on something that does not exist yet, or was deferred
deliberately. The 1,400 lines of closures and findings moved to
`references/completed-work.md`, where the reasoning stays findable without
competing with the plan. Rule zero-three now says this outright.

**The gate ran green in full for the first time since the U11 fix**: 22/22 tasks,
12,851 tests, 6m09s, zero cached. The arithmetic is worth recording — 12,845
before plus the 6 new authority-edge tests is exactly 12,851, so the new guards
demonstrably ran rather than being silently skipped, which is the failure L38 was
written about.

**Then explicit deny, which closes G1.** Permissions arrive through roles, so
stopping one person doing one thing meant removing their whole role — and with it
nine things they still needed — or inventing a bespoke role, which is how an
organisation ends up with forty roles nobody can describe.

Three decisions in it are worth keeping:

**It can only ever subtract, and the ordering is what guarantees that.** Denials
are consulted after the grant check has already returned true, so no arrangement
of denial rows can permit an act the ACL refused. A test asserts the denial
service is not even *called* when the ACL said no — if somebody moves that call
earlier, the test fails rather than the property quietly disappearing.

**It applies to superadmins, and that has a price I paid rather than dodged.** A
control the most powerful account ignores is a suggestion. But it means somebody
can withhold `auth.*` from the only account that could give it back, so the
recovery path is a CLI command, out of band by design: recovering from a lockout
should require reaching the server, not persistence in a browser. The alternative
— exempting the deny-management capability from denial — would have been a
special case, which is the bandage rule zero-one forbids.

**Permanent is allowed here and forbidden for delegations**, and the asymmetry is
the philosophy in miniature. A grant with no end is a role grant wearing a
costume. A subtraction with no end is a standing decision, and forcing it to lapse
would hand a permission back to somebody nobody re-authorised.

**Verified on the running instance, not merely built.** I had left the migration
unapplied and called it the owner's decision. Corrected: checkpoint taken,
migration applied, and then the whole loop run against the live API rather than
handed over as steps. Withholding `currencies.*` from the **superadmin** turned a
`200` into a `403`; lifting it from the terminal with nobody logged in turned it
back into a `200`. That single sequence proves the three claims that mattered —
denials bind, they bind superadmins, and the out-of-band recovery path works.
Blank reasons and mid-pattern wildcards were both refused. All test data lifted
afterwards; the lifted rows remain, which is the design.

**The 404 that was not a bug.** The new route returned `404` while its sibling
returned `401`. Nothing was wrong with it: the server runs `next start`, which
serves a frozen build. Recorded as L39, with the sibling-route diagnostic that
settles it in one command.

**One documentation bug fixed in passing**: I had written `mercato auth
denials:lift` into two doc comments before building the command, and the command
I actually built is `auth denials --lift`. A doc that names a command which does
not exist is worse than no doc, because somebody trusts it during an outage.

---

## 2026-08-11 — G4: work gets its own scope, and the grade finally has a source

Scoping stopped at the department. A legal case pulls people from several
departments and needs its own rules inside it, and the platform had no way to say
so.

**The design question was the same shape as G5's, and answering it first paid off
again.** An overlay only means something if the resolver can tell that this act is
inside that project — and nothing said so. A project holds records; an act names a
record through `payload.id`, which the gate already reads for record locks. So a
record-to-project table gives the resolver the matter for free, and no command had
to declare anything.

**Terminal deny turned out to need no code at all.** Platform 1 implements it by
ending evaluation early. Here a deny is `A0`, and because every rule takes a
minimum and nothing anywhere raises a ceiling, `A0` already cannot be lifted by
anything later. The property falls out of the invariant — which is a better place
for it than an evaluation-order rule somebody has to remember, and the tests
assert it holds whichever order the rules are written in.

**And this closed the task-grade item.** A grade describes the work rather than
the act, and I reclassified it days ago as blocked on G4 precisely because there
was no matter to read one from. There is now, so it binds: an act on a project's
record resolves at that project's grade.

The care that item needed carried over intact. An ungraded project says **nothing**
rather than `G0`, and an unreadable grade parses to `null` rather than `G0` —
because a *lower* grade buys **more** autonomy, which was the defect I fixed in the
resolver earlier the same day. It would have been easy to reintroduce it one layer
up, in a service that had every reason to default a missing value.

**One habit fixed after it cost me.** I ran this gate capturing full output, after
the previous batch where `tail -4` destroyed a failure I still cannot explain.
22/22 and 12,845 tests, with the log intact this time.

Server booted before calling it done, per [[L37]].

---

## 2026-08-11 — Tenant policy, and three things found on the way

Every other input the resolver reads is a property of the platform. This one is a
company's decision — four-eyes on payments, no unattended external email — which
is exactly rule zero-seven's "organisations legitimately differ" row, and the
first time in this sprint that a setting has clearly earned its place.

Declarative rules, because planning §10 defers a policy engine by name. A rule is
a match and a ceiling: no conditions, no expressions, no evaluation order to
reason about. Stored beside the enforcement mode in the same per-tenant config,
because a policy is a handful of rules rather than a growing table and the person
who sets one sets the other.

**An unreadable policy applies nothing.** That loosens, which is the uncomfortable
direction — but inventing a restriction the tenant never wrote would refuse real
work because of a typo, and a configuration failure is not a permission answer.

**Three things turned up that were not this task**, and all three are fixed here
rather than noted for later.

The first is a repeat of a bug I fixed three batches ago. `policyCeilingDetail`
did not exist on the resolver's context, so the tenant's own wording was computed
and silently dropped — precisely what `resourceCeilingDetail` had done for record
locks. Two occurrences make it a pattern worth stating: **when a ceiling carries a
reason, check the context type has somewhere to put it.** A refusal now quotes the
tenant back instead of reciting a gate.

The second is my own habit. A gate run failed in core, and I could not say why,
because I had piped `yarn test` through `tail -4` and thrown the failure away
before reading it. Core alone then passed 5,054 tests and a second full run passed
12,826. **The cause is unknown and is recorded as unknown** — three flake causes
have been found and fixed, and this may be a fourth or one of those recurring
somewhere unswept. The habit is fixed; the run is gone.

The third was cheap: charter and budget were both investigated before being
assumed buildable, and both turned out blocked on subsystems that do not exist —
`ai_worker` is a type with no producer, and nothing meters spend. Recorded with
preconditions rather than half-built.

**The resolver is now complete for everything that can be supplied.** The audit
five days ago found six of ten inputs unsupplied. All six that could be supplied
from what exists now are, and the two that remain are blocked on Phase K work in a
direction that is safe.

Gate: 22/22, **12,826 tests**, and the server boots.

---

## 2026-08-11 — The trust model, and the gaps it refuses to hide

This is the only input to the resolver that **widens**. Every other ceiling can
only take autonomy away, which makes them safe whatever they contain. Trust lifts
the cap that otherwise holds every machine at approve-first, so it is safe for a
different reason entirely: promotion is hard, demotion is easy.

**The specification's first line is the whole constraint** — *"trust is computed
evidence, not a setting someone types"* — and auditing it against this platform
found only **two of the five** promotion criteria computable. There is no incident
model, no evaluation suites, no charters.

That made the scope a genuine product decision rather than a sequencing one, so I
asked rather than assumed: shipping a partial control here does not point in the
safe direction, which is the opposite of every other gap in this sprint. The
answer was **gated promotion** — refuse on what can be checked, and carry what
cannot.

**So a promotion records its own gaps.** Three "not verified" notes go onto the
grant *and* into the audit trail. A gap in a design document is one nobody reads
again; a gap on the record is one whoever reads it later has to weigh. And it is
why a human approval is still required: the evidence gates the decision, it does
not make it.

**Three places where the failure direction was the whole design.** A missing row
means `T0`. An unreadable tier parses to `T0` — this is the one field in the
system where a parsing failure could *grant* something, so it fails to the bottom
of the scale rather than to a middling default. And `T0` supplies no ceiling at
all, because it says exactly what the untrusted-machine rule already says, and
replacing an explanation with a code that means the same thing is a loss.

**Demotion runs on reversal, not on a schedule.** A sweep would leave a worker at
its old tier for however long the interval is, and that window is precisely what
the specification is trying to close.

**One mistake worth recording.** I wired the trust reader into the DI registration
in the wrong position — the constructor takes six positional readers, and I put
trust where delegations belongs. It type-checked perfectly, because both are
objects with one async method. Caught by reading the argument list against the
constructor rather than by any tool, and the call site now carries a comment
naming the order. Positional readers that all look alike are a trap the compiler
cannot see.

**And I booted the server before calling it done**, which [[L37]] exists to
enforce. All three authority APIs resolve and are guarded, against a 404 control
that makes those 401s mean something.

Gate: 22/22, **12,802 tests**.

---

## 2026-08-11 — G3: authority you can lend, and take back

The platform had only permanent grants. Covering somebody's approvals for a
fortnight meant granting a role and remembering to remove it — and the grant
nobody removes is how permissions accumulate until nobody can say why anyone has
what they have. A delegation is that same grant with an end date and a reason
attached.

**All three findings I recorded before starting held up**, which is the strongest
argument yet for answering the design questions first. Each one changed the build:

A delegation had to **grant**, not only cap. The obvious reading — fill in
`delegationCeiling` and stop — fails because the route guard refuses on RBAC
before the resolver ever runs. A cap-only delegation could reduce authority
somebody already had and never lend any.

Which meant touching the grant path, the one layer built so nothing turns a
`false` into a `true`. That guarantee turns out to be about the **resolver**, not
about RBAC: RBAC has always had two grant sources, so a third that expires is
consistent with its design. The rule that had to survive — *the authority resolver
never widens* — does. The resolver still runs afterwards and still refuses; a
delegation gets somebody past the grant, not past everything.

And the caching problem was real. `loadAcl` caches for five minutes, and a revoke
that takes effect "within five minutes" is not a revoke. So delegations are a live
query — but only after the ordinary ACL has already said no, which is the request
that was about to return 403 anyway. The hot path never pays.

**The negative tests are the ones that matter here.** Every required capability
needs its own delegation, because returning true when one of three matched would
be the widest bug available in this codebase. A delegation does not rescue an act
the resolver refuses. It is not consulted when the actor already holds the
capability. And it is looked up by *principal id*, not by the subject string —
`api_key:abc` would never match a row written against `abc`, and the delegation
would silently do nothing.

**Two rules are judgements rather than mechanics**, so they are written down where
the work is. The **latest expiry wins** when several apply, because
newest-created would let a hasty short delegation silently shorten an agreed long
one. And **ninety days is the maximum**, because a delegation with no practical
end is a role grant wearing a costume — it can be re-granted, and that is the
point: re-granting is a decision somebody makes; letting one run for a year is a
decision nobody makes.

**Checkpointed before touching the grant path**, and verified the dump was
readable before starting rather than trusting that it existed. Verified afterwards
against real Postgres too: the check constraint rejects a backwards window, and
`api_key:abc-123` stores as a grantee — which is exactly why those columns are
`text` and not `uuid`.

No page. That is now item 16 alongside G5's, rather than a sentence in a commit
message.

**And then it did not boot.** The gate was green — typecheck, lint, 12,768 tests,
both builds — and `yarn start` died with `Could not resolve 'delegations'`.

The container runs in Awilix CLASSIC mode, and the default registration is
`asClass(RbacService)`. CLASSIC reads constructor parameter *names* and resolves
each by name. I called the parameter `delegations`; the registration is
`delegationService`. **In CLASSIC mode a parameter name is a dependency name**, so
I had renamed a dependency without meaning to.

This is the second time this trap has bitten, and the first time produced a guard
— `di-classic-proxy.test.ts` — which guards the *destructuring factory* half. This
was the `asClass` half, and it went straight through.

**Writing the new guard took three attempts, and the failures are the lesson.** I
wrote it, ran it, and it passed — with the bug still in the tree. Fixed a bracket
matcher, ran it, passed again. It took instrumenting the thing by hand to find
that a doc comment inside the parameter list contained brackets, which closed the
parameter list early and silently dropped every parameter after the third. Only
then did it fail, and name the offender exactly.

A guard nobody has watched fail is not a guard. It is a decoration that makes
people confident — the same shape as [[L34]], where a mock made six tests assert
nothing about the SQL they were supposedly covering.

**The wider finding is [[L37]]: the gate does not boot the application.** Type
checking, linting and unit tests all operate on code in isolation. Dependency
injection, migrations against a real schema and route registration happen only at
startup. A green gate is evidence about the code, not about the system — and after
any change to DI, a service constructor or module registration, the only thing
that tests the wiring is starting the server.

Gate: 22/22, **12,770 tests**, and the server boots.

---

## 2026-08-11 — G5: the first ceiling that is not about the actor

Every other input to the resolver asks *who is acting*. This one asks what is
being acted on. A contract under dispute, a payroll run that has closed, a case
file somebody froze pending review — none of those are properties of an actor, and
no trust level or delegation should reach past them.

`locked` refuses every write; `restricted` makes writes need approval. Neither can
be lifted by anything about the actor, and that holds structurally rather than by
a check: it arrives as a ceiling into a resolver that takes a minimum.

It also restores something we removed. Excluding `packages/enterprise` in S2 took
record locking out of the platform entirely, so this is not an enhancement.

**Reads are exempt, deliberately.** A record nobody may read is one nobody can
review before deciding whether to unlock it, and freezing a contract should not
hide it from the people arguing about it. Who may read is already RBAC's question
and the data classification's.

**The design question was answered before the batch started**, and that turned out
to be the right order: the bus carries a capability and no entity type, so keying
a lock on both would have needed a per-command declaration across every command —
the R4b exercise again. Keyed on the record id alone instead, with the gate
requiring a well-formed UUID before it looks anything up, because a slug or a
numeric id from some other payload could collide with a real lock and constrain
the wrong record.

**Two things the batch caught in itself, and both were mine.**

The refusal read *"the record's state permits at most A0"* — which tells the
person who hit it nothing they can act on. The reason somebody typed when locking
the record was being computed and then dropped, because the resolver's context
took a gate and no detail. Now it carries one, and a refusal reads *"locked
pending the Q3 audit"*. I only noticed because a test asserted the reason appeared,
which it would not have done if I had tested only the gate.

And `db:generate` found an index declared on the entity that my migration never
created. The unique constraint on `(tenant_id, record_id)` already provides
exactly that index, so the honest fix was to delete both the decorator and the
partial index I had written rather than add a second index costing a write on
every lock change to answer nothing new.

**What I did not build is a page.** Locking is an API guarded by a new
`auth.records.lock` capability — enough that a lock can be applied and therefore
means something, which is the line this sprint keeps drawing. A control belongs on
each record's own screen, and that is per-entity work rather than one screen. It
is item 17 rather than a sentence in a commit message.

Gate: 22/22, **12,742 tests**.

---

## 2026-08-11 — The task-grade item could not be done, and was worth doing anyway

The audit said the resolver never receives a task grade: `decideFor` passes
`context: {}`, so every act resolves at the `G1` default and only the data-class
floor can raise it. All true.

**What I found is that there is nothing to pass.** A grade describes *the work*,
not the act — `G4` is "legal proceedings, board/M&A, security incidents", which is
a property of the matter somebody is working on. This platform has no matter.
Project, case and engagement context arrives with **G4**, and until it does the
only honest source of a grade is the data classification, which already applies.

So I did not wire it. Building the seam — a symbol on the command context, say —
and calling the item closed would have produced exactly the thing this sprint
exists to remove: a control named in a table with nothing behind it. The item is
reclassified with its precondition instead.

**And the investigation paid for itself.** `resolveDecision` took the maximum of
the requested grade and the data floor, and *not* of the `G1` baseline. A caller
passing `G0` therefore landed below the default — which buys more autonomy, not
less. `E4` permits `A3` at `G0` against `A2` at `G1`; `E6` permits `A2` against
`A1`. The one input a caller controls could widen the answer, in a resolver whose
whole premise is that nothing widens. The doc comment two lines above even said
*"a caller cannot talk the resolver down"*, which was true of the data floor and
false of the baseline.

**Two corrections to my own first reading**, both from the code rather than from
me. I wrote the tests with a `human` actor and every gate came back `A5` — because
the effect-class matrix bounds **machines and delegated authority only**; people
are bounded by the graph, the record and policy instead. That narrowed the bug
honestly: exploitable by an AI worker or a delegated actor, not by an ordinary
user. And my first test file used the ACL declaration shape rather than the
flattened descriptor the resolver actually takes, which failed loudly rather than
passing vacuously.

**The fix was verified by reverting it.** Two of the six tests fail without it.
A guard nobody has watched fail is a guard nobody should trust — the same
discipline as the recurrence guard last week.

Gate: 22/22, **12,722 tests**.

---

## 2026-08-11 — I4 stops being a claim

*Authority is carried, never amplified.* The platform has said that since the
resolver landed. The rule was implemented, tested, and listed in a table of
resolver rules — and nothing supplied its input outside a CLI what-if flag. It was
the one finding from yesterday's audit that was not merely incomplete but
**wrong**: a control named in documentation and absent from the request path.

The concrete hole: an API key passes its own RBAC check, the resolver sees a
`service` principal with no invoker, and the person who owns the key is never
consulted. So a key could do what its owner could not.

R1 had already built the piece that was missing — `onBehalfOfUserId` on the
principal. The wiring resolves that person **as themselves**: their own grant,
their own position in the organization graph, the same capability. Whatever gate
that produces becomes a ceiling. If they may not perform the act, the answer is
`A0` and it is refused.

**The dependency had to go in backwards**, which was the only real design problem.
`rbacService` is constructed *with* `authorityEnforcement`, so injecting RBAC into
the enforcement service closes a cycle. It takes a reader instead — the same shape
as the graph and module-config readers already there — and DI resolves
`rbacService` from the cradle *inside the call*, which is late enough to break it.

**Absence is still not a refusal.** With no reader registered, the check is
skipped with a warning rather than answering `A0`. That is the position this
service already takes when the graph cannot be read, and the alternative invents a
denial nobody decided.

**And a stale comment went with it.** The class doc claimed *"Only `A0` is
enforced — `A1` to `A4` attach obligations and there is no machinery yet"*. True
when written, false since the command gate landed on 2026-08-10. A stale comment
about a control is worse than none: it reads as a limitation and gets designed
around.

The two tests I would most easily have skipped are the ones worth having — that
this never *raises* a gate, and that a person acting as themselves is not capped
by their own decision (which would apply every rule twice and put a confusing
second reason in every explanation).

Five of the resolver's ten inputs are still unsupplied, and every one of them can
only make an answer more permissive than the design intends — never more permissive
than the RBAC check that already said yes. They are backlog items 1–10. This one
was different because it was claimed.

Gate: 22/22, **12,716 tests**.

---

## 2026-08-11 — A deployment guide, and what it is honest about

The owner asked for handover documentation good enough that somebody who has
never seen this system can put it on a VPS subdomain behind Plesk.
`references/deployment.md` is that: what you are actually deploying (four things,
and only the first is obvious), the server prerequisites, Postgres including the
two extensions people forget, the environment, the build order, migrations, the
first tenant, workers, the nginx block, and a verification checklist.

**Every command in it was checked against the repository**, and two were wrong
when I first wrote them. `mercato auth setup` needs `--orgName` and `--password`,
which I had left out — the usage string in `auth/cli.ts` said so. A guide that
almost works is worse than no guide, because the reader assumes they broke it.

**The important line is at the top, and it is a limitation.** None of the
Plesk-specific steps have been run on a Plesk server. The build, migrate and start
sequence is the one used daily and is safe to trust; the systemd unit and the
nginx directives are the standard way to run a long-lived Node service behind
Plesk, written by somebody who knows the shape of the problem. That is a
well-informed first run, not a transcript, and saying so is the difference between
documentation and a claim.

**One judgement call worth flagging:** do not use Plesk's Node.js extension for
this. It runs Passenger, which wants to own the process, and this app is started
by its own CLI that supervises Next plus worker processes. Systemd plus an nginx
proxy lets Plesk do what it is good at — TLS — and keeps the supervisor intact.

**Three things the guide surfaces that were nowhere on the backlog**, now items
21 and 22: nobody has verified the Plesk path; there is no zero-downtime deploy,
backup schedule, monitoring or secret rotation; and the `CUSTOM_DOMAIN_*` and
`ACME_EMAIL` variables exist in `.env.example` while the `domain_mappings` work
that would honour them is deferred — so a reader would otherwise have set them and
waited for something that is not there.

The guide also carries the `Upgrade`/`Connection` proxy headers, which are not
optional: the platform pushes live updates over SSE, and without them
notifications and progress bars silently never arrive. That is exactly the class
of thing a first deployment loses an afternoon to.

---

## 2026-08-11 — G7: the interface can now run right-to-left

The platform could always do this and had never decided to. Radix takes `dir`,
the CSS logical properties follow it, and `<html>` shipped with a `lang` and
nothing else — which is fine while every locale runs left-to-right, and silently
wrong the moment one does not. A browser handed `lang="ar"` and no `dir` renders
Arabic left-to-right: letters right, layout inside out, nothing to notice.

Direction is decided on the **language subtag**, never the whole tag, because it
is a property of the script: `ar`, `ar-EG` and `ar-Arab-EG` all run the same way,
and a list of full tags would be endless and still incomplete. Anything
unrecognised falls back to `ltr` — the safe direction rather than the neutral one,
since a `rtl` default would mirror the interface for every locale we failed to
parse.

**Arabic ships**, because that is the difference between a policy and a claim.
Proven over HTTP against the built app: `Accept-Language: en` returns
`dir="ltr"`, `ar` returns `<html lang="ar" dir="rtl">`, with Arabic actually
rendering. Its dictionaries are partial on purpose — a module without `ar.json`
falls back to inline English, so untranslated surfaces degrade to readable rather
than blank. The Arabic I wrote is unreviewed by a native speaker, which is on the
backlog rather than glossed over.

**I did not build the setting the graft asked for.** `graft-batches.md` wants
`text_direction_policy` in tenant configuration. Rule zero-seven's own table says
otherwise: *there is a right answer → default, no setting.* Direction follows
language essentially universally. The resolver still accepts a policy and is
tested for it, so the seam is there when something genuinely has one — but adding
a configuration key nothing reads would have been precisely the "claimed and
absent" control I spent yesterday's audit cataloguing.

**And the compiler did the interesting work.** Adding `ar` to the `Locale` union
failed the build in two places that enumerate locales by hand, which is the type
system enforcing completeness rather than a chore. A test then failed for the
right reason too: `TranslationManager.primitives` asserted the tabs were exactly
`['EN','PL','ES','DE']`, so a locale addition broke an assertion about *markup*.
It now derives from the configured locales, which is what it always meant.

Wave 1 done — G8, G6, G7. Gate: 22/22, **12,708 tests**.

---

## 2026-08-11 — G6: an act now records who it was written for

Audit rows had a tenant and an organization and no notion of audience, so anyone
holding `audit_logs.view_tenant` read everything. `visibility_scope` fixes the
tense: the code performing an act decides who it was for, at the moment it is
recorded, instead of a report inferring sensitivity from a payload afterwards.

Backfilled to `tenant`, which is precisely what every existing row already had.
This is a vocabulary, not a restriction — defaulting to `private` would have
emptied every audit view on the day it shipped.

**Writing it turned up two things I had not thought through.**

The first was a leak I put in myself. I wrote `case 'tenant': return true` —
obviously right, since a tenant reader may read tenant records. Then I got to
`portal` and found I had written an expression that evaluated to `true` either
way, which is the kind of nonsense that only shows up when you try to explain it.
Working out what `portal` should mean exposed the real problem: a portal reader is
a *customer*, and `tenant` returning `true` unconditionally would hand them the
tenant's internal activity. The line belongs on `tenant`, not on `portal` — which
genuinely does have two audiences, because hiding portal activity from staff would
leave their own trail incomplete.

The second was that `private` cannot be a scope list at all. Whether a private row
is readable depends on **who performed it**, and that is per-row. So the filter is
`scope in (...) OR (scope = 'private' AND actor_user_id = me)`, and the nesting
matters: ANDing the actor across the whole predicate instead would silently narrow
every reader's timeline to their own acts.

**And the verification was wrong before the code was.** Executed against real
Postgres, the owner of a planted private act appeared *not* to see it. That looks
exactly like a bug in the predicate. It was my probe: it grabbed an arbitrary row
whose `actor_user_id` was null, so `actor_user_id = null` matched nothing. Re-run
against a row that had an actor — 56 of 56 for the owner, 55 for a stranger.

Worth writing down because the instinct at that moment is to go and change the
code. [[L30]] again, from the other end: a reproduction you built yourself is a
hypothesis, and that includes the one that appears to confirm a failure.

`project` fails closed until G4 gives it membership to check. Nothing writes it,
so it is inert — but a scope that returns `true` because we cannot decide it yet
would be a label pretending to be a control.

Gate: 22/22, **12,699 tests**.

---

## 2026-08-11 — G8: one migration run at a time

Two containers booting from one image against one database is the ordinary way to
deploy, and nothing stopped both of them migrating. Both read the same empty
`mikro_orm_migrations_<module>` table, both decide the same file is pending, both
run it. `create table` fails on the loser and the boot dies — or a data migration
that is not idempotent runs twice and nobody notices, which is the worse one.

`yarn db:migrate` now holds a Postgres session-level advisory lock for the whole
run. Session-level because the lock has to outlive every per-module ORM the run
opens and closes, on its own short-lived connection for the same reason. It
**waits** rather than failing: a second container should apply nothing and carry
on, and by the time it holds the lock the first run has finished and its pending
list is empty. And it says so on the way in, because a migration blocking in
silence is indistinguishable from one that has hung, and an operator watching a
stalled deploy will kill it.

**The verification is the interesting part**, because the failure needs two
processes and a race and cannot be reproduced in a unit test. Eleven unit tests
pin the decisions around the lock. The SQL then ran against real Postgres — A
acquires, B is refused while A holds, B acquires once A frees, zero locks left
([[L34]]). Then the whole command, against a lock held from another connection.

**And that last step caught what the first two could not.** The first contended
run finished in seven seconds with no waiting message. The unit tests were green;
the SQL was proven; the lock was genuinely held by the other connection. The CLI
runs from `packages/cli/dist`, and I had never built it. Rebuild, retest, and the
message appeared — 22 seconds of waiting against 6 uncontended. The standing trap
in this repository is usually stated about the app; it is not only about the app.

**Two things I had said were wrong, and the tests said so.** I checked
`dbGreenfield` for migration calls, read the first half of the function, saw it
deleting migration files and concluded it does not migrate. It does — the call is
at the end. A test failed with `client.connect is not a function` and pointed
straight at it. That is a better outcome than my claim: greenfield rebuilding a
database while a deploy migrates it is exactly the collision the lock is for.

**Then a third gate flake, unrelated to any of this.** `OrganizationBrandingPage`
failed in the gate and passed three-for-three alone. The page seeds `logoUrl` into
local state from fetched data through an effect, so there is a render commit
between the organization name appearing and the input filling; the test awaited
the name and asserted the input synchronously. Load widens the window. `waitFor`
closes it, and it is now **trap 3** in `knowledge/test-gate.md` — the nastiest of
the three, because the failing line is right there, the lines above it pass, and
the product is correct.

A sweep confirmed it was the only instance: seven files use `toHaveValue`, three
never wait, and all three render synchronously from props inside `await act`.

Gate: 22/22, **12,677 tests**.

---

## 2026-08-10 — The gate stops depending on how busy the laptop is

Two causes, both fixed, and the interesting part is that **the diagnosis I had
written down was wrong.**

`PROGRESS` said: two guards hardened, *eleven more walk-and-read unguarded*. That
framed the work as hardening eleven readers. So I planted a fixture-shaped
directory inside `packages/shared` and ran core, ui and cli against it — **6,905
tests, all green.** Nothing breaks while the directory exists. The failure only
happens when it is *deleted* out from under a walker.

Which inverts the fix. Thirteen readers were never the problem; two writers were.
`dynamicLoader.tsconfig.test.ts` was creating scratch app roots inside
`packages/shared`, and `cache/service.test.ts` inside `packages/cache`. Both now
write outside any source tree — the loader fixture to `node_modules/.cache`,
because it needs repo-relative resolution for its `@mikro-orm` import, and the
cache fixture to `os.tmpdir()`, because it needs nothing.

**A backlog note is a hypothesis with a date on it.** Mine was written while
chasing something else, was plausible, and would have sent me to harden eleven
files that did not need it. Ten minutes of planting a directory settled it
([[L36]]).

**The second cause I nearly guessed at too.** Five tests in the CLI integration
file were slow, and my first theory was the source fingerprint. Then I measured
it: 8,715 files, 262ms to walk, 777ms to stat, on an idle machine. About a second
— nowhere near a 60-second budget. The theory was too small to explain the
symptom, and if I had "fixed" it I would have declared victory over nothing.

So I built the load instead: four heavy test packages running concurrently, then
timed the file against them.

| | Before | After |
|---|---|---|
| Worst single test | 13,023 ms | **2,467 ms** |
| Whole file | 37.0 s | **9.8 s** |

Eight-fold degradation under only four of the gate's twenty-two packages — which
is what makes 60s reachable, and it is a *measurement* rather than the arithmetic
I would otherwise have offered.

The fix threads overrides that already existed one level down
(`hasBuildInputChangesSince` has always taken `BuildCacheOptions`;
`tryReuseExistingEnvironment` just never passed any) so those tests point the walk
at a two-file fixture. They assert reuse decisions, not that the repository
contains 8,700 files.

**And coverage went up.** Fixturing all five would have left the real default
paths untested — they could point at nothing and every test would still pass. So
one new test keeps them, cheaply: backdate `startedAt` to 2020 and the staleness
check returns on the *first* file it stats instead of the 8,700th. Same code path,
one three-thousandth of the I/O.

The recurrence guard was verified the only way a guard can be — by putting the bug
back and watching it go red and name the file.

**What I did not fix, said plainly.** The walking guards are still unguarded.
Nothing writes into `packages/` during a gate run now, so nothing races; if some
future build step does, the class returns. Measured, not eliminated.

Gate: 22/22 tasks, **12,666 tests**, 5m57s idle.

---

## 2026-08-10 — The approvals queue becomes a screen

Enforcement has held acts since it landed. Answering them meant calling an API,
which means a terminal, which means nobody. `/backend/authority/approvals` is
where a person now works through the tray.

**Two lists, and they never borrow each other's verbs.** *Waiting* holds acts
that have **not** happened — approving runs one, rejecting means it never runs.
*To review* holds acts that **already did** — nothing on that half changes what
happened; the only open question is whether anybody looked. Offering "Approve" on
something that already ran, or "I have looked at this" on something still waiting,
would make every row ambiguous, and a reader who cannot tell the halves apart
clicks through both. Three of the eight new tests exist only to hold that line.

**A3 gets a veto and no approval button.** *Hold and commit unless vetoed* runs
on its own when the window passes, so "Approve and run" would be a button that
changes nothing but the timing. The only act with an effect is stopping it, so
that is the only button.

**The gate identifier never appears alone.** "A2" is precise and empty. Each row
carries the plain sentence — *needs your approval before it runs* — beside the
tag, and the resolver's own reason underneath it. The queue that shows only codes
is the queue that gets clicked through.

**Ordering is a taste, so it is stored per person.** Riskiest first by default,
oldest first on request, kept in that browser and nowhere else. Storing it
server-side would quietly make one person's preference everybody's — the reading
of the owner's *"a setting where organisations genuinely differ"* that keeps the
setting count honest.

**Pulled forward, and the reason is that its premise expired.** `PROGRESS` had
scheduled this after the gate-stability work, arguing that a screen designed
against a nearly-empty tray is designed against a guess. That was true when three
commands were gated. The capability mapping has since gated 117, and A3 and A4
both bind — the tray now fills from ordinary use, so the argument for waiting no
longer holds.

**What is deliberately absent**, each with a backlog entry rather than a
half-built control: bulk approval with a diff, routing to a deputy, standing
approvals. A first version without them is usable. One shipping a blind "approve
all" would be worse than no page.

**One wrong turn worth recording.** I put the new strings in the *app's* locale
files. The auth module owns its own `i18n/` — four fully translated files, no
English placeholders — and app-level files are the app's. Reverted, and the
strings landed with real German, Spanish and Polish rather than English standing
in for them ([[L35]]).

Gate green end to end: 22/22 tasks, 12,664 tests, no flakes this run.

---

## 2026-08-10 — A3 binds, and every gate now does

*Hold and commit unless vetoed* is the gate that needed something to wake up. The
act does not run when proposed; it runs by itself once its fifteen-minute window
passes, and only an objection stops it.

**The interesting part is how close it is to its opposite.** An unanswered
approval expires and never happens. An unopposed hold commits and does. Same
table, same waiting, opposite ends — so `commit_at` is a separate column from
`expires_at` rather than one field read differently by status. Sharing a column
would put "this never happens" and "this happens" a single typo apart, on a table
whose entire job is deciding whether something happens.

A scheduled sweep runs due acts every minute. Not on read, which would make an act
commit when somebody happened to open a queue — approve-first wearing a timer's
clothes. Not an in-process timer either: a timer dies with the process that set
it, and an act that never commits because a server restarted is indistinguishable
from one somebody vetoed.

**Nobody's name goes on an auto-committed act.** It happened because a window
passed, so `resolved_by_user_id` stays null. Recording an approver would attribute
a decision nobody made; recording the proposer would claim they acted at a moment
they did not.

**And a test caught a real bug.** Three failed because my fake EM required a
tenant filter the sweep did not supply — which was not a harness problem but the
harness telling me the sweep queried across every tenant while the schedule is
registered per tenant. Each tenant's timer would have done every other tenant's
work. Scoped, with a test that holds it.

Two other failures were my own stale claims — a gate test asserting A3 needs
machinery that does not exist, which stopped being true in the same commit. That
is the third time this week a test has failed because it described the world
before the change, and each time it has been the test doing its job.

## 2026-08-10 — A4 binds: the act runs, and somebody still has to look

*Execute and review* is the opposite shape from an act held for approval — it has
already happened — so it went in its own table rather than as a status on the
existing one. A table whose rows mean "not yet" or "already did" depending on a
column is how a schema starts lying to whoever reads it next, and this one is a
day old, which is the cheapest moment to get that right.

The decision is carried from `beforeExecute` to `afterExecute` through the
interceptor metadata rather than re-resolved after the act. Re-resolving would
answer *what the rules say now*, which can differ from the reason the act was
reviewable when it ran.

**Filing never throws at the caller.** The write has already committed; failing
the request would tell somebody their change did not land when it did. A missing
review row is a real gap, and lying about a successful write to report it is a
worse one — logged at error level instead.

**And no deadline**, unlike a held act. An approval nobody answers has work
blocked behind it and must expire. A review nobody does blocks nothing, and an
unreviewed act is exactly the thing somebody should still be able to find next
quarter. Same table shape, opposite retention, for a reason worth writing down.

One endpoint now returns both lists, because §9 asks for one inbox rather than
four screens — but they stay separate fields, since confusing "stop this" with
"check this" in either direction is how a queue loses its meaning.

That leaves **A3** alone: it commits when nobody objects, which needs something to
wake up and run the act. The scheduler module is enabled, so the pieces exist.

## 2026-08-10 — Which commands are gated, decided by reading rather than guessing

Three commands declared the capability they perform. Everything else was
ungated — visibly, by design, but three is not a governance layer.

The temptation was a regular expression: `directory.organizations.update` →
`directory.organizations.manage` looks like a rule. It is not. `catalog.offers.*`
is guarded by `sales.channels.manage`; `customers.addresses.*` by
`customers.activities.manage`; `auth.users.update` by `auth.users.edit`. A
pattern would have got those wrong, and a wrong mapping either blocks work that
should proceed or waves through an act that should have waited.

So I read it off the routes instead — every CRUD route declares both the command
it calls and the feature that guards it, which is evidence rather than inference.
**117 commands, no ambiguous cases.** 21 of them are in enabled modules and now
carry the declaration.

Parked modules are left alone and the step is written into `parked-modules.md`,
because restoring a module would otherwise quietly restore an ungated write path.

A guard test checks each declared capability is a real feature id. It is a text
scan, not a runtime check: the registry only hydrates enabled modules, so a
runtime assertion would pass for a parked module's typo and fail on the day
somebody restored it. And a typo here does not throw — it silently stops gating
the command while the source still looks gated.

## 2026-08-10 — The classification control needed no new policy, only a closer read

An AI worker reading integration credentials resolved exactly like one reading a
dictionary. Everything landed at `G1` whatever it touched, because nothing ever
set the grade from the data.

I had this on the backlog as *"needs a policy table with a source, not values I
invent"* — planning 02 §6.1 lists `matrix_by_classification` among the floors,
which reads like an instruction to build a classification-to-gate table. Inventing
those numbers was the blocker.

§8's worked example settles it in one line: *"reading confidential contracts for a
G3 legal matter — `E0 / G3 → floor A4`"*. The classification was never a ceiling
of its own; it raises the **task grade**, and the effect-class matrix — already
written, already tested — does the rest. The class-to-grade mapping comes from
the grade table in §3, matched on the words it already uses: *"internal records"*
is G1, *"personal data"* is G2, *"security changes"* is G3.

So: credentials now grade the work G3, and `E0 / G3` permits at most A4 — the
read happens and enters a review queue. Grades take the maximum, so a caller can
add weight and cannot talk the resolver below what it is reading.

**Worth keeping as a habit**: when a design document names the same input twice in
different shapes, the worked example is the one that tells you which shape was
meant. I spent a backlog item's worth of hesitation on a table that was never
supposed to exist.

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
