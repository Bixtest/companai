# Workthrough for the owner — 2026-10-06

Your instruction: *"Document it all, if there are questions ask, if there are suggestions share, we need
to iron out all the questions there and identify all the gaps and flaws and fix it then update the main
documentations accordingly. Break it down to points and lets make sure we check and tick each."*

So: each of your corrections is one numbered point below. For each one you get

- **What you asked for** (in plain English)
- **What the platform does today** (measured from the code, not from a summary)
- **The gap or flaw** (if any)
- **The question only you can answer** (if any)
- **A tick box** for you to confirm

Nothing is changed in the code yet. This is the check-first pass you asked for.

---

## Point 0 — the one critical thing you asked me to make sure of (C6)

This one comes first because you called it *critical*, and because I found a real gap.

**What you asked for.** Every time a Function is saved, or a new feature is added through an AI prompt,
a **new record must be created in the permissions table**. You said: *"make sure that is the case
because it is critical."*

**What the platform does today.** I measured it three ways.

1. I listed **every table** the platform has — over 200 of them. There is **no table called
   `permissions`**. There is no `permission` table, no `acl_permissions` table, nothing of that kind.
2. Permissions in this platform are not stored as records. They are stored as **a list of text strings
   inside one column** on a role's row. The column is called `features_json`. For example, a role's
   row holds the text list `["auth.users.create", "auth.roles.manage", "entities.records.view"]`.
   Wildcards are allowed, like `customers.*` meaning "everything under customers".
3. When a Function is saved, **nothing writes a permission**. Saving a Function runs a pure check
   (does the document look valid?) and hands back the Function object. It never touches the permission
   storage. The only two ways a permission string gets into the system today are: (a) a module declares
   it in its own code at boot, or (b) an administrator saves a **whole new list** over the old one
   through the roles screen.

**The gap.** What you describe does not exist yet and cannot be "checked" into existence. You are
describing a **new structure** — a catalogue where each Function or each AI-added feature gets its own
record — plus a **trigger** on the save path that writes that record. Neither is there today.

**Why this matters, plainly.** Right now, if the AI builds you a Function, the platform has no way to
say *"this Function exists, and here is who may use it"* other than the AI casually putting a text
string like `entities.records.view` into the Function's own description. Nobody grants it. Nothing
records that it was ever created. That is a genuine hole, and it is exactly the one you flagged.

**My suggestion.** Build a **fourth structure** beside the three that already exist today
(`roles`, `role_acls`, `user_acls`). Call it the permission catalogue. Then add one hook: when a
Function is saved, or when the AI adds a feature, the platform writes a record into that catalogue and
grants it to nobody by default (an administrator then decides who gets it — same shape as the existing
`read / write / edit / delete / own / team / global` idea you described in point 6).

**Question for you (one).** When a new Function is saved, should it **stop and wait** for an
administrator to grant it out, or should it **work straight away for the person who created it** and
let an administrator widen it later?

- [ ] Stop and wait for an administrator (safer; nothing runs until someone approves)
- [ ] Work immediately for its creator (faster; the creator got what they asked for)

*(Recommended: work immediately for its creator. It matches your "the AI does what I asked" vision,
and an administrator can always widen or withdraw it afterwards. Nothing else changes.)*

---

## Point 1 — a prompt is one thing; its ending is decided as you go (C1)

**What you asked for.** Do not stamp a label on a prompt when it arrives. Whether it ends as a quick
answer, a proposal, or a saved Function is decided by **the context and how far you take it**. The
same prompt — "report the increase of sales by month for the past 12 months" — may stay a one-off, or
become a saved Function because you keep asking for it, **without the prompt itself changing**.
Labeling it at the door limits what can be done with it.

**What the platform does today.** The thing I built last (called G-21) does **exactly the thing you
rejected**. It sorts a prompt into one of three buckets *the moment it arrives*, before any work
starts. That is the flaw. You are right, and this is my error, not a misunderstanding.

**The gap.** The design needs to flip: instead of *deciding first, then working*, it should be
*working, and observing where it lands*. The ending should be able to change at any point — a quick
answer can turn into a saved Function later, and a saved Function can go back to being a one-off.

**My suggestion.** Rebuild it so the outcome is **watched, not assigned**. The platform keeps working
and quietly notices where things are heading. Nothing is decided at the entrance.

**No question for you on this one.** You were clear. I will rebuild it.

- [ ] Confirmed — the outcome is watched as the work goes, never assigned up front

---

## Point 2 — sometimes it is just a conversation (C2)

**What you asked for.** Some prompts are just **chat** — you talking with the AI in a meeting room,
with no outcome and nothing to save. Forcing that into one of three buckets would be actively wrong.
Chat is a legitimate state of its own.

**What the platform does today.** The build I made has three buckets and no room for plain chat.
A casual conversation would be forced into one of them, which is wrong.

**The gap.** There needs to be a fourth, quiet state: **chat — no outcome yet, no outcome needed.**
Nothing is classified, nothing is suggested, nothing is saved. It just is a conversation.

**My suggestion.** Make "chat" the ordinary resting state. Most prompts will sit there. Only when you
keep asking for the same thing does the platform gently speak up (that is point 3).

**No question for you.** Straightforward.

- [ ] Confirmed — chat is a normal state, with no label and no nagging

---

## Point 3 — notice and suggest (C3)

**What you asked for.** When you keep asking for the same thing, the platform should **notice and
suggest** — *"you've asked for this three times now, want to save it as a Function?"* You called it
*"a great touch, it shows a platform intelligence"* and said to provide that impression **wherever and
whenever possible**.

**What the platform does today.** Nothing like this exists. There is no memory of what you have asked
for before, and no way to compare one request to another to see that they are the same thing.

**The gap.** Two pieces are needed: (1) a **quiet history** of the requests you make, per user, and
(2) a way to tell that two requests are **the same kind of thing** (a similarity check). Then a rule:
after the same kind of request repeats a few times, offer to save it.

**My suggestion.** Keep the history and do the similarity check with the **local model** — the one
already running on your own machine. It is free to run, it never leaves the building, and it is a
small, well-suited job (point 5 below is where it fits with running two models at once). Nothing is
ever saved automatically; it only ever asks.

**Question for you (one).** How many times should you ask for the same thing before the platform
offers to save it?

- [ ] After 2 times
- [ ] After 3 times (recommended — enough to be sure it is a habit, not a coincidence)
- [ ] After 5 times

- [ ] Confirmed — the platform notices repeats and offers to save, and never saves on its own

---

## Point 4 — different models for different jobs, set as architecture (C4)

**What you asked for.** You may use an **open-source model** for one job, **OpenAI** for another,
**DeepSeek** for a third — *"as long as all are set in my hermes"*. This must be **recognised and set
architecturally**, not bolted on afterwards.

**What the platform does today — and I want to correct myself here, because it is better than I first
said.** Most of this is **already built**:

- there is a **list of providers** (a provider registry) — OpenAI, the local model, and others;
- there is a **settings screen** where a provider and a model can be chosen;
- and — the important one — a choice can be made **per agent**: each AI agent can be pointed at its own
  provider and its own model, and that choice is **saved in the database** (`AiAgentRuntimeOverride`).
  So "this job uses OpenAI, that job uses the local model" is **already possible today**.

**The gap — narrower than I first implied.** What is missing is not the ability; it is the **one
picture**. Today the choices are scattered: a default here, a per-agent override there, an allowlist
somewhere else. There is no single declared place that reads *"here is every job and the model it
runs on"*, and no rule that **forces** a new job to declare one — a job that declares nothing silently
falls back to the default.

**My suggestion.** Keep everything that exists. Add a **single declared routing table** that names, for
every job, its model — fed by the same per-agent settings already in the database so there is only one
source of truth. Add the rule: **a job with no declared model cannot run**. That gives you the one
picture, using what is already there rather than a parallel system.

**Question for you (one).** Where should this one picture be **read** from?

- [ ] A screen inside the platform (the settings screen you already have, widened to show every job)
- [ ] A single file in the project that lists every job and its model
- [ ] Both — the screen is what you look at, the file is what the platform reads

*(Recommended: the screen you already have, widened. It keeps one place not two, and you already know
where it is.)*

- [ ] Confirmed — one declared picture of "which job uses which model", built on what exists

*(Note: I nearly told you this deserved building from scratch. It does not — the per-agent model choice
is already there and saved. I checked the settings screen and the saved overrides before writing this.
Say so if you had seen it already and meant something more than this.)*

---

## Point 5 — two models working a request at the same time (C4, second half)

**What you asked for.** *"While the system is pulling a report using the OpenAI API, the open source
in llama is scanning whether this is a common request and if so giving that feedback."* Two models,
two jobs, one request, running side by side.

**What the platform does today.** The pieces are all present but never combined. The platform can call
one model at a time for a request. It has a local model available. It has the idea of a background job
(there are job-queue tables in the platform). But there is **no wiring that says "run this small local
job alongside that big cloud job"**.

**The gap.** The pattern you describe — a **background shadow job** running next to the main job — is
not built. Note this is the same shape as something that already exists in the platform: your
authority system has a "shadow" observer that watches and reports but never interferes. The same
pattern fits here.

**My suggestion.** Build it as a **shadow companion**: when a request goes to a cloud model, the
platform quietly starts a small local job beside it (checking commonness, or anything else cheap and
local). The companion never slows the main request down and never blocks it — if it is late, its answer
is simply dropped.

**No question for you.** This follows directly from what you asked. I will design it as the shadow
companion.

- [ ] Confirmed — a small local job can run beside a big cloud job, without slowing it down

---

## Point 6 — check for conflicts before changing the structure (C5)

**What you asked for.** Some prompts will be to **expand the platform itself** — you named a
**form builder** and a **module builder inside the platform**. Changing the structure (whether the
data shape or the code) needs a **mechanism that analyses and optimises potential conflicts** with
what already exists. And the same is needed when **editing** an existing structure, not only when
adding.

**What the platform does today.** Better than I first thought, and I want to correct myself here.
The platform **already has a real conflict detector** — a piece of code called `detectConflicts`.
It compares structural pieces against each other and reports clashes. It already covers four kinds:

- two modules both claiming to override the same screen,
- two modules both intercepting the same route,
- widget dependencies that loop round on each other,
- **a feature that is used somewhere but declared nowhere** (this last one matters for point 0).

But it is **not wired to the platform-building path** — nothing in the platform runs it when a form
builder or module builder proposes a change. It runs today as a check the developer calls from the
command line.

**The gap.** Only the **wiring** is missing, plus the builders themselves. The comparing engine is
built and tested; it has simply never been pointed at an AI-driven change. That is a much smaller gap
than "nothing exists", and I should not have implied the larger version.

**My suggestion.** Treat conflict analysis as a **gate you cannot skip**: no structural change — add or
edit — is applied until the platform has produced a conflict report and you have seen it. This is the
safety net that makes a form builder safe to let loose.

**Question for you (one).** When the platform finds a conflict, what should it do?

- [ ] Stop and tell me, and wait for my decision (recommended — nothing changes without you)
- [ ] Fix what it safely can, tell me what it did, and stop on anything unsafe
- [ ] Fix what it can and only tell me if it could not cope

- [ ] Confirmed — no structural change lands without a conflict report shown to me first

---

## Point 7 — the roles-and-permissions architecture for authority (C6, the design half)

**What you asked for.** Traditional systems give each feature a set of scopes — **read, write, edit,
delete, own, team, global**. You want the **same style** for the authority-level management that
point 0's permission records feed into. And you restated the critical rule: **every new Function or
AI-added feature must create a new record**.

**What the platform does today.** The platform has a **two-table permission model** (a role's
permission list, and a person's permission list), with wildcard matching, and it already has a
**capability registry** — a place where every feature declares *"here is what I am, and what kind of
act I am"*. That registry is the right home for the records point 0 describes, and it is deliberately
built to hold no policy of its own (it answers *"what kind of act is this"*, never *"may this person
do it"* — exactly the split you want).

**The gap.** Today a feature is one string like `auth.users.create`, and its registry entry describes
its **risk** (does it read or write, can it be undone, how sensitive is the data, may it be delegated).
It does **not** carry the **scopes you named** — read, write, edit, delete, own, team, global. So you
cannot yet say "this person may read users but not delete them" in the standard shape. The risk
description is there; the scope list is not.

**My suggestion.** Extend the **capability registry** (do not build a parallel scheme beside it — you
already rejected a parallel scheme once, correctly). Each feature declares its available scopes. Each
scope becomes a record. New Function saved → its records are created automatically (point 0).

**No question for you.** You described it clearly. I will make the existing registry carry the scopes
rather than invent a second list.

- [ ] Confirmed — the scopes live on the existing registry, not a new parallel one

---

## Point 8 — how you want to be kept informed (C7, your standing rule)

**What you asked for.** Do not send you into documents. Explain the item **in the thread, in simple
English**, when asking for a decision. You said: *"We have too many documents for me to sive in and
pick a section in a document you refer to."*

**What I have done.** This page is the first thing written in that style: each point explained in
plain words in-thread, with the question beside it, and no pointer that sends you into the library.

**My suggestion.** Keep this page as the running sheet. Each point gets a tick when you confirm it, and
the tick is written back into this page. The main documents get updated only **after** you have
ticked — not before.

**No question for you.** This is your rule and I am following it.

- [ ] Confirmed — keep working this way

---

## What happens next

1. You tick what you agree with, and answer the four questions marked above.
2. I **fix the flaws**, in this order: point 1 (the up-front label) and point 2 (chat) first, because
   they are wrong today and everything else sits on top of them. Then point 0 (the missing permission
   records), because you called it critical.
3. Only then do I **update the main documents** to match — the plan, the architecture page, the
   backlog, and the handover.

Nothing in the code has been changed yet. This page is the check-first pass, exactly as you asked.
