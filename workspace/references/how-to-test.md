# How to test each batch by hand

**For the owner, in plain English.** Every batch adds a section here with exact
steps and what should happen.

**Start the platform first:** [local-instance.md](local-instance.md). Then open
<http://localhost:3000> and sign in.

---

## The honest framing: most of this work is invisible

The Starting Kit batches are **foundation work**. They change how the platform
decides things internally, not what the screens look like. So for most batches
the question is **"is anything broken?"**, not "can I see the new feature?".

That is a real test, not a consolation prize. These changes touch login,
permissions and audit — the parts where a silent break is worst. Five minutes of
clicking catches things no automated test will.

Where a batch *does* produce something you can see, this file says so explicitly.

**If any step below does anything other than what it says, stop and tell me what
you saw.** Include the page you were on and anything red on screen.

---

## Batch 2 — R1: who is acting (steps 1 and 2)

**What changed, in one sentence.** The platform used to work out *what kind of
actor* was making a request by reading a text prefix on an id and re-checking it
in sixteen different places; now it works it out once and passes it along.

**Why it matters to us.** Today there are two kinds of actor: a person, and an
API key. We are adding a third — an **AI worker**. Under the old approach every
one of those sixteen places would need a new branch. Now they do not.

**Visible change: none.** Everything below should behave exactly as before. That
is the pass condition.

### Test 1 — Signing in (2 minutes)

The login path was rewritten, so this is the most important check.

1. If you are signed in, sign out.
2. Go to <http://localhost:3000/login>.
3. Enter your email and password and click **Sign in**.

**Should happen:** you land on the dashboard, with the left sidebar showing
Dashboard, Directory, Currencies, Integrations, Webhooks and so on.

**Would mean broken:** an "Unauthorized" or "Failed to fetch" message, or being
bounced straight back to the login page.

> The first request after a rebuild can take up to two minutes while the server
> compiles. "Failed to fetch" straight after a restart usually means *waiting*,
> not *failing* — try once more before reporting it.

### Test 2 — Your sidebar preferences (3 minutes)

This is the one that matters most. The code deciding **whose** settings to save
was duplicated in nine places and is now one function. If it were wrong, your
settings would save to the wrong account or vanish.

> **The save button is not where you would expect, and is not called "Save".**
>
> It sits in the **top card** — the one headed *Variant name* — **above** the
> long "Order & visibility" list, and while no variant exists yet it reads
> **"Create variant"**. Scrolling to the bottom of the list will never reveal it.
> It only reads "Save" once a variant already exists.
>
> This confused the owner on first use and cost real time. It is upstream's
> layout, not something we introduced.
>
> **Also:** if you tick roles under *Apply to roles*, you must re-tick them
> **every** time you save this screen. The toggles reset to off on every page
> load, and saving with them off **deletes** those roles' presets. See
> [upstream-issues.md](upstream-issues.md) → U2.

1. Open <http://localhost:3000/backend/sidebar-customization>.
2. Scroll **down** to *Order & visibility* and change something — toggle an item
   off, or drag one into a different position.
3. Scroll back **up** to the *Variant name* card at the top.
4. Click the black **Create variant** button (bottom-right of that card, beside
   *Reset* and *Cancel*).
5. Press **F5** to reload the page.

**Should happen:** your change is still there after the reload, and the **left
sidebar** on any page reflects it.

**Would mean broken:** the page reverts to the default arrangement, or saving
shows an error.

### Test 3 — API keys (3 minutes)

An API key is the platform's existing *non-human* actor — the closest thing to
the AI workers we are adding, so it is the best proxy for whether the new
handling is right.

1. Open <http://localhost:3000/backend/api-keys>.
2. Create a key. Give it any name.
3. **Important:** if the form offers an **Organization**, pick the same one your
   own account belongs to. A key created without an organization is rejected
   later — that is existing platform behaviour, not something we changed, and it
   will look like a bug if you hit it.
4. Copy the secret it shows you (it is shown once).

**Should happen:** the key is created and appears in the list.

**Would mean broken:** an error on save, or the new key missing from the list.

5. Delete the test key when you are done — it has real access.

### Test 4 — The audit log (2 minutes)

1. Open <http://localhost:3000/backend/audit-logs>.
2. Look at the **Access Log** tab.

**Should happen:** rows for the pages and data you just looked at, attributed to
your email.

**Would mean broken:** entries showing a raw identifier such as
`api_key:0e26100f-…` where a person's email belongs.

> **The Action Log tab may still look sparse**, and that is a gap in the
> platform rather than our work. 13 modules use custom write routes that record
> nothing. R2a fixed the ones built on the CRUD factory — see the next section.
> Detail: [upstream-issues.md](upstream-issues.md) → U1.

---

## Batch 4 — R2a: recording who changed what

**What changed, in one sentence.** Creating or deleting an API key used to leave
no trace at all; now it appears in the Action Log.

**Why it matters to us.** An API key is a credential — issuing one grants access,
deleting one revokes it. Our product's whole premise is being able to explain who
did what, so an unrecorded credential change is exactly the kind of gap that
makes the promise hollow.

**Visible change: yes** — this is one of the few batches you can actually see.

### Test 1 — An API key change appears in the audit trail (4 minutes)

1. Open <http://localhost:3000/backend/api-keys>.
2. Create a key. **Set its Organization to the same one as your account** (see
   U3 — a key without one is rejected later and looks like a bug).
3. Delete that key.
4. Open <http://localhost:3000/backend/audit-logs> and stay on the **Action Log**
   tab.

**Should happen:** two new rows — one for the create, one for the delete — both
attributed to your user, with a recent timestamp.

**Would mean broken:** the Action Log still empty after doing this.

### Test 2 — Those entries offer no undo (1 minute)

They record what happened; they do not know how to reverse it. Offering an undo
button that cannot work would be worse than offering none.

1. On the same page, tick **Undoable only** (top right).

**Should happen:** your two API-key rows **disappear** from the list.

**Would mean broken:** they stay, and an undo control is offered for them.

### If everything passes

### If R1's tests all passed

Nothing changed on screen, and that is the correct result. Sixteen scattered
copies of one decision became one, and the platform behaves identically.

---

## Batch R2c — the platform now records who approves what the AI proposes

> **If you tested this before 16:30 on 2026-08-09 and saw nothing in the Action
> log, that was my fault, not a bug.** The running server was serving an
> 18-hour-old build, so it never had the new code. It has been rebuilt and
> restarted. Please run Test 1 again.

**What changed, in one sentence.** There is a module in here called **Inbox Ops**
that reads forwarded emails with an AI, turns them into suggested actions
("create this order", "add this contact"), and asks a person to approve or reject
each one — and until now, nobody's approval was being written down anywhere.

**Why it matters to us.** That approve/reject moment is the whole product. A
governance layer that cannot say *who approved what the machine suggested* is not
a governance layer. Fourteen places now record it, and the record is written in
the same breath as the change — if the record cannot be saved, the change does
not happen either.

**Visible change:** nothing new on screen. What changed is what appears in the
**Action Log** afterwards.

---

### Test 1 — a settings change now leaves a record (3 minutes)

This is the one part of Inbox Ops you can exercise without setting up email
forwarding and an AI key.

1. Log in.
2. Go to **http://localhost:3000/backend/inbox-ops/settings**
3. You should see a page titled **Inbox Settings**, with a **Forwarding Address**
   at the top and a **Working Language** dropdown at the bottom.
4. Change **Working Language** from **en** to any other language.
   There is no Save button — it saves the moment you pick, and a green message
   says **"Working language updated"**.
5. Now go to **http://localhost:3000/backend/audit-logs**
6. Make sure you are on the **Action log** tab (not Access log).

**Should happen:** a new row at the top, from a few seconds ago, showing your
user, with a label containing **`inbox_ops.settings.updated`**.

**Would mean broken:** the green "Working language updated" message appears but
no new row shows up in the Action log.

**Then change it back to en** if you prefer — that will add a second row, which
is correct.

---

### Test 2 — the record does not leak email content (2 minutes)

Any row the Action log shows for Inbox Ops should describe *the decision*, never
*the message*. Click the row you just created and look at its details.

**Should happen:** it names the fields that changed (`workingLanguage`) and
whether a webhook secret is set — nothing more.

**Would mean broken:** you see an actual secret value, or an email's subject or
body text, inside an audit entry.

This is deliberate. Emails and extracted proposals are encrypted customer data
living in Inbox Ops, where its own permissions apply. Copying that content into
the audit log would put customer text in a second place with different rules
about who can read it and how long it is kept. The audit entry records the
decision and **points at** the record instead.

---

### Test 3 — nothing else broke (2 minutes)

The change touched the shared audit helper, which every module now uses.

1. Go to **http://localhost:3000/backend/api-keys** and create an API key, then
   delete it.
2. Go to **http://localhost:3000/backend/audit-logs**.

**Should happen:** two new rows for the key — created and deleted — exactly as
before this batch.

**Would mean broken:** creating the key works but no rows appear, or the page
errors.

---

### What you cannot test yet, and why

The **accept** and **reject** buttons on an AI proposal are where most of this
batch's work went — but reaching them needs a real email forwarded into the
system and an AI provider key configured, neither of which is set up on this
machine. Those paths are covered by automated tests instead
(`executionEngine.audit.test.ts`), which check that:

- accepting records **who** accepted, **what type** of action it was, and **how
  confident the AI was** about it;
- rejecting records just as much as accepting;
- if two people click accept at once, only the one whose click took effect is
  recorded;
- if the record cannot be written, the approval does not take effect.

When we wire up email forwarding, Test 4 will be: forward an email, open the
proposal, accept one action, and find your approval in the Action log.

---

## Batch R3 — the audit trail can now prove it has not been altered

**What changed, in one sentence.** Until now the Action Log was an ordinary
database table: anyone who could reach the database could edit an entry, and
nothing would show it. Now every entry also writes a second, sealed record that
is chained to the one before it, so a change to history becomes detectable.

**Why it matters to us.** We are selling a system that can always explain who did
what. "Trust our table" is not an explanation. This is the difference between a
log and a record.

**Visible change:** none in the interface. This is a new sealed table plus a
command that checks it.

---

### Test 1 — the chain grows when you do something (4 minutes)

1. Log in.
2. Do any one thing that gets recorded — the easiest is
   **http://localhost:3000/backend/inbox-ops/settings** → change **Working
   Language**. Or create and delete an API key at **/backend/api-keys**.
3. Check the Action Log at **http://localhost:3000/backend/audit-logs** and note
   your new row is there, as before.
4. Now open a terminal in `workspace/starting-kit` and run the checker:

```bash
corepack yarn mercato audit_logs ledger:verify
```

**Should happen:** a line per tenant reading `OK — N event(s) verified`, where N
has grown by at least one since before your action, and a final summary ending
`0 broken`.

**Would mean broken:** the command reports `BROKEN at seq …`, or the count does
not grow after an action that appeared in the Action Log.

> If the command says "No chains to verify", nothing has been recorded since the
> ledger was created — do step 2 first.

---

### Test 2 — the sealed record refuses to be changed (3 minutes)

This is the actual guarantee, and you can check it yourself against the database
directly. Run each of these:

```bash
docker exec mercato-postgres psql -U postgres -d "open-mercato" -c "update ledger_events set event_type='forged' where seq=1;"
```

**Should happen:** it refuses, with

```text
ERROR: ledger_events is append-only: UPDATE is not permitted.
```

The same happens for `delete from ledger_events …` and `truncate ledger_events`.

**Would mean broken:** any of them reports success.

**What this proves and what it does not.** It does not make the record
impossible to tamper with — nothing inside one database can. It means tampering
cannot be *silent*: to hide a change you would have to rewrite every later entry,
and the database refuses to rewrite any of them.

---

### Test 3 — nothing else changed (2 minutes)

1. Create and delete an API key at **http://localhost:3000/backend/api-keys**.
2. Check **http://localhost:3000/backend/audit-logs**.

**Should happen:** both rows appear as before.

**Would mean broken:** the action fails, or the rows stop appearing. The chain is
written in the same transaction as the entry, so a fault there would now block
the write itself — deliberately, but it must not happen in normal use.

---

### One thing worth knowing

The sealed record **does not contain your data**. It stores the id of the Action
Log entry and a fingerprint of it — enough to prove the entry has not changed,
and not enough to reconstruct it. That is what lets us delete personal data on
request without destroying the proof: the data goes, the chain still verifies.

---

## Shadow mode — one thing only you can do

**What changed, in one sentence.** The new permission engine now runs alongside
the existing one on every check, writing down where the two would disagree —
without changing any answer.

**Why it matters to us.** Before we let the new engine actually decide anything,
we want to know what it would have refused. Guessing is how a governance layer
locks people out of their own system on a Tuesday morning.

**Visible change:** none, by design. Nothing behaves differently.

---

### The one thing that needs you (5 minutes, whenever suits)

I cannot generate the evidence myself — it only appears when a **logged-in** user
does things, and I do not have your password. Unauthenticated requests never
reach a permission check, so the recorder stays empty until you use the system.

1. Log in.
2. Use the app normally for a few minutes — open **Audit Logs**, **API Keys**,
   **Inbox Ops → Settings**, **Directory**, anything you like. Ordinary clicking
   is exactly the right traffic.
3. Tell me when you have, and I will read the recorder.

**Should happen:** nothing at all. Every page behaves as it always has. The
recorder is silent by construction.

**Would mean broken:** any page that worked yesterday refusing you today. That
would mean the shadow is not a shadow, and I want to know immediately.

**There is no rush.** The longer it runs, the better the evidence. It costs
nothing to leave it collecting for days.

---

## The authority graph page — visible, and safe to look at

**What changed, in one sentence.** There is a new settings page showing how much
authority flows between your organizations, and you can change it there instead
of needing me to write SQL.

**Why it matters to us.** This is the piece that lets a real customer say "our
consultancy advises that client company, and may see these things but never
those" — a sentence a plain department tree cannot express at all.

**Visible change:** a new page. It will be **empty on this instance**, and that
is correct — see below.

---

### Test 1 — the page loads and explains itself (2 minutes)

1. Log in.
2. Go to **http://localhost:3000/backend/directory/authority**
   (or **Settings → Directory → Authority graph**).

**Should happen:** a page titled *Authority graph* with a paragraph explaining
that a ceiling is the most autonomy that may flow down a link, and a message
saying there are no edges yet.

**Would mean broken:** a 404, or an error message instead of the explanation.

**Why it is empty, and why that is right.** An edge is created automatically for
each parent-child link between organizations. This instance has one organization
with no parent, so there is nothing to link. The page says so in those words
rather than looking broken.

---

### Test 2 — nothing else moved (1 minute)

1. Visit **Settings → Directory → Organizations** and confirm it still lists
   your organization as before.

**Should happen:** unchanged.

**Would mean broken:** anything about the organizations page behaving
differently — nothing in this batch touches it.

---

### If you ever want to see it populated

Create a second organization with the first as its parent (**Directory →
Organizations → Create**). An edge appears on the authority page automatically,
set to `owns` / `strict` / `A5`, which imposes nothing. You can then lower its
ceiling and watch `authority:explain` change its answer.

**Entirely optional** — nothing depends on it.

---

## Batch U3 — API keys you create actually work now

**What changed, in one sentence.** An API key you created was rejected on every
single request, forever; now it works.

**Why it matters to us.** An API key is how anything outside the browser reaches
the platform — and it is the nearest thing the system has today to a non-human
worker. A credential that is issued successfully and then refuses to work is the
worst shape a bug can take: nothing looks wrong at the moment you create it.

**Visible change:** yes, but only if you use a key. Creating one looks the same.

### Test 1 — a new key is scoped to an organization (2 minutes)

1. Go to **http://localhost:3000/backend/api-keys**
2. Click **Create**, give it any name, pick the **admin** role, and save.
3. Copy the secret it shows you — it is shown once.
4. Look at the **Organization** column in the list for your new key.

**Should happen:** the key shows your organization's name, not a blank.

**Would mean broken:** an empty Organization column. That is the old behaviour,
and a key created that way cannot be used.

---

### Test 2 — the key is accepted (3 minutes)

This one needs a terminal. Paste the secret you copied in place of `<secret>`:

```bash
curl -i -H "X-Api-Key: <secret>" http://localhost:3000/api/directory/organizations
```

**Should happen:** the first line reads `HTTP/1.1 200 OK`, followed by a list of
your organizations.

**Would mean broken:** `HTTP/1.1 401 Unauthorized`. That is exactly the bug this
batch fixes.

**Not a bug:** if you write `Authorization: Bearer <secret>` instead, you will
get a 401 no matter what. This platform accepts `X-Api-Key` or
`Authorization: ApiKey` — never `Bearer`. That trap cost me two wrong diagnoses;
it is not something we introduced.

---

### Test 3 — an impossible key is refused while you are watching (2 minutes)

Only if you have more than one organization. If you have one, skip this.

1. At **/backend/api-keys**, create a key and choose an organization that is
   **not** your own.

**Should happen:** the save is refused with a message explaining the key would be
rejected every time it is used.

**Would mean broken:** the key saves successfully. It would then behave exactly
like the bug above — created fine, useless afterwards.

---

## Batch E — the platform can now refuse an act and tell you why

**What changed, in one sentence.** The authority rules you can already edit on the
authority page now actually stop things, for tenants that switch it on.

**Why it matters to us.** This is the product. Everything before it was building
a system that could *explain* a decision; this is the first time that system
*makes* one. A refusal that cannot say why is what every other platform gives
you.

**Visible change:** none unless you switch it on. Your instance is on `shadow`,
which observes and refuses nothing — that is deliberate and is where it should
stay until you want to try this.

**This test creates and deletes a throwaway organization.** Nothing else is
touched, and step 6 puts everything back.

### Test 1 — build something the rules should block (4 minutes)

1. Go to **http://localhost:3000/backend/directory/organizations**
2. Click **Create**. Name it `Blocked Branch`, set **Parent** to your existing
   organization (`Acme Corp`), and save.
3. Go to **http://localhost:3000/backend/directory/authority**
4. Create an edge: **Parent** `Acme Corp`, **Child** `Blocked Branch`,
   **Relationship** `advises`, **Inheritance** `none`.

**Should happen:** the edge is listed. `none` means *nothing flows down from the
parent* — you have just declared that this branch inherits no authority.

**Would mean broken:** an error saving the edge, or the edge not appearing.

---

### Test 2 — read the decision before enforcing it (2 minutes)

In a terminal:

```bash
cd workspace/starting-kit/apps/mercato && corepack yarn mercato auth authority:explain --capability directory.organizations.view --org <BLOCKED_BRANCH_ID> --tenant <YOUR_TENANT_ID>
```

Both ids are visible in the organizations list URL when you open each one.

**Should happen:** `Decision: A0 — Blocked`, with a binding rule of
`graph-ceiling` and a sentence explaining that inheritance is `none`.

**Would mean broken:** `A5`, or an error. `A5` would mean the graph is not
reaching the decision.

**Nothing has been refused yet.** This command only asks.

---

### Test 3 — switch it on and watch it bind (4 minutes)

```bash
cd workspace/starting-kit/apps/mercato && corepack yarn mercato auth authority:mode --tenant <YOUR_TENANT_ID> --set enforce
```

Then **wait one minute** — a running server re-reads the mode on a 60-second
cache — and in the backend, use the **organization switcher** in the top bar to
select `Blocked Branch`.

**Should happen:** pages that list organizations start returning **Forbidden**
while that branch is selected. Switch back to `Acme Corp` and everything works
again.

**Would mean broken:** no difference at all after a minute. Check the mode with
the same command without `--set`.

---

### Test 4 — the refusal explains itself (1 minute)

Look at the terminal running the server. Search its output for `enforcement`.

**Should happen:** a line naming the capability, the binding rule
(`graph-ceiling`), and *why* — `inheritance is none, so nothing flows down`.

**Would mean broken:** a refusal with no matching line. A 403 nobody can explain
is the thing this whole batch exists to prevent.

---

### Test 5 — what it deliberately does **not** do (1 minute, read only)

Set an edge's **Authority ceiling** to `A2` instead of using `none`. `A2` means
*a person must approve before the act executes*.

**Should happen:** nothing is refused. That is correct, not a bug: the platform
has no way yet to hold an act and resume it after somebody approves, so
enforcing `A2` would mean allowing the act and calling it a control. Only
outright blocks bind today, and the CLI says so when you switch a tenant on.

---

### Test 6 — put it back (2 minutes)

```bash
cd workspace/starting-kit/apps/mercato && corepack yarn mercato auth authority:mode --tenant <YOUR_TENANT_ID> --set shadow
```

Then delete the edge on the authority page, and delete `Blocked Branch` on the
organizations page.

**Should happen:** everything behaves as it did before Test 1.

---

## Batch U2 — the sidebar screen no longer forgets what it did

**What changed, in one sentence.** The **Apply to roles** switches now show which
roles already use the layout you are looking at, instead of resetting to none
every time you open the page.

**Why it mattered.** Because they reset, a second save — changing one label, say
— asked the server to remove every role's sidebar configuration, and did. If you
ever wondered why your role presets disappeared, this was why.

**Visible change:** yes, immediately, on
**http://localhost:3000/backend/sidebar-customization**.

### Test 1 — the switches remember (3 minutes)

1. Go to **http://localhost:3000/backend/sidebar-customization**
2. Pick a saved layout on the left (or create one and save it).
3. Under **Apply to roles**, turn on `admin` and save.
4. **Reload the page** and select the same layout again.

**Should happen:** `admin` is **on**, with a quiet badge reading *uses this
layout*.

**Would mean broken:** the switch is off, or shows a warning badge. That is the
old behaviour and the next save would delete the preset.

---

### Test 2 — a second save changes nothing it was not asked to (3 minutes)

1. From the state above, rename any sidebar group and click **Save**.
2. Reload, and re-select the layout.

**Should happen:** `admin` is still on and still says *uses this layout*.

**Would mean broken:** `admin` turns off. Previously this save deleted the
preset.

---

### Test 3 — another layout's roles are not yours to remove (4 minutes)

Only if you have two saved layouts. If you have one, create a second.

1. Select layout **B**, turn on `employee`, save.
2. Select layout **A** again.

**Should happen:** `employee` shows as **off**, with a badge naming layout B —
*uses B*. Turning it **on** changes the badge to *will be moved to this layout*,
which is a fair warning for a deliberate act.

**Would mean broken:** `employee` shows as on, or shows *will lose this layout*.
Either would mean layout A believes it owns a preset that layout B configured.

**Worth knowing:** even if the screen got this wrong, the server would refuse.
A layout can only delete presets it created — that rule is enforced behind the
API, not just in the page.

---

### Test 4 — presets from before today (1 minute, read only)

Any role preset created before this change has no recorded source, and will show
*uses a layout from an unknown source*.

**Should happen:** it stays off, and no save from this screen removes it.

**This is deliberate.** Nothing recorded where those came from, and deleting on a
guess is the failure being fixed. To bring one under a layout's control, tick it
and save — that is an explicit act, and the badge says so first.

---

## Template for future batches

```markdown
## Batch N — <name>

**What changed, in one sentence.** <plain English, no jargon>

**Why it matters to us.** <tie it to the product we are building>

**Visible change:** <none | describe exactly what is new>

### Test 1 — <name> (<minutes>)
1. Go to <verified URL>
2. <action>

**Should happen:** <specific observable result>
**Would mean broken:** <specific failure signature>
```

**Rules for writing these** (learned the hard way):

- **Verify every URL against the generated route list before writing it down.**
  Guessed URLs 404 and look like bugs.
- Name the actual control the user will see, not the function behind it.
- Always give the failure signature. "Check it works" is not a test.
- Say when a change is invisible. Hunting for a difference that does not exist
  wastes time and undermines trust in the instructions.
- Include known-confusing platform behaviour that is **not** ours — like the
  API-key organization rule above — so it is not mistaken for a regression.
