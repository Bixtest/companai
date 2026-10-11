# discussion_points.md — the open questions, in plain language

**What this file is.** A running list of every open question, decision, or risk the workspace-architecture
research has raised — written in **plain words**, with **what it changes for the user**, and **my
recommendation**. Nothing here needs an answer *now* unless it is marked **BLOCKER**.

**How to read it.** Two lists:

1. **Blockers** — nothing else can proceed until this is answered. These were discussed as they arose.
2. **Waiting** — real decisions, but I can keep analysing without them. We discuss these **when the
   analysis is finished**, all at once, so we don't interrupt the flow.

**Decisions already made by the owner** (kept here so the list is complete and nothing looks reopened):
- A whole new service (LMS/CRM) is the strictest approval tier — *"add me LMS" always stops and names a
  person* (2026-10-06).
- The Business IR is **CORE**, not a business feature (2026-10-11).
- The platform **proposes** a prompt's ending; the **user confirms** the consequential ones (option **c**).
- **DP-01 — the chain is made live FIRST, storage second** (2026-10-11). The owner's reasoning: *wire it →
  see a real result → refine the recipe by follow-up prompt until it is right → only then talk about saving.*
  This confirms the recommendation in DP-01 and **unblocks `CC-59`** (the first startable item of the
  supplementary core queue).
- **DP-02 — a saved recipe shows "permissions were not checked"** (2026-10-11). The owner accepted the
  recommendation — **and raised the permissions architecture as its own engineering workstream** (see **DP-04**).
- **DP-03 — a schema-change request follows the permissions flow, not a bare refusal** (2026-10-11). The owner
  reframed it: *first ask whether this user holds the permissions (collectively) to change tenant schema;* if
  **yes** → a different (approval-pool) flow; if **no** → explain what is needed and route it to the right
  person. See **DP-04** and **DP-05**.

---

## PART 1 — BLOCKERS

**None right now.** Nothing in the SRS work is blocked. Every batch so far has completed without a
decision from you. If that changes, the blocker appears at the top of this list **the moment it stops me**,
with the reason.

*(History: the only true blocker this workstream ever hit was the owner's initial go-ahead on the
supplementary core queue — answered 2026-10-11.)*

---

## PART 2 — WAITING (they can all wait until the analysis is done)

---

### DP-01 — Should the first working piece come before the save-to-database piece?

**Status:** waiting · **Raised by:** Batch B4 · **Blocks anything?** No — I can carry on to B5–B10.

**Where this lives in the technical file:** `02-SRS-02-function-lifecycle.md` §8, question **OQ-B4-1**.

**What it is, in plain words.**
Your chain has five links: *the user types a question → the AI writes a "business recipe" → the platform
runs it → the user sees the result → the user saves the recipe so it can be re-run forever without the AI.*
Four links are **built and tested**. The only link that does not exist is **the last one: actually storing
the saved recipe** — and, separately, **nothing in the product is wired to any of it yet**.

So there are two things to build: **the wiring** (so a user can reach the chain at all) and **the storage**
(so a recipe can be saved). The question is simply: **which first?**

**What it changes for the user.**
- **Wiring first:** a user can type a business question and *see a working result from real data* — they
  just can't save it yet. The product becomes demonstrable end-to-end, minus the "save" button.
- **Storage first:** you build the filing cabinet before anyone can walk to it. Nothing is demonstrable
  yet, and when the next research stage lands, the cabinet's shape may have to be rebuilt — so the work is
  paid twice.

**My recommendation: wiring first.**
Two reasons. It needs **no database migration at all**, so there is nothing to redo. And it is already the
order your own plan states ("the first startable item of the supplementary queue"). It gets your chain
working in front of real data sooner, which is the thing that proves the architecture.

**The one question.** *Do you want the chain made live first (a real question → a real result, nothing
saved yet), or the save-to-database piece first — accepting its shape may be rebuilt once the reference
research lands?*

**ANSWERED (2026-10-11) — wiring first.** See the "already decided" list at the top. The owner's words
verbatim: *"We do the wiring first as saving is an architecture that needs the wiring as a prerequisite (if
not wired for an initial outcome that I can see, fix-optimize-and-refine the recipe via a follow-up prompt to
the ai if the outcomes are not accurate, till it is perfectly tuned, then there is nothing to save, proper
wiring and recipe perfecting comes first)."*

---

### DP-02 — When we save a recipe, should it visibly say "permissions were not checked"?

**Status:** waiting · **Raised by:** Batch B4 · **Blocks anything?** No.

**Where this lives in the technical file:** `02-SRS-02-function-lifecycle.md` §8, question **OQ-B4-2**.

**What it is, in plain words.**
Every saved recipe is checked automatically for correctness — does it reference real things, does it run,
is it scoped to the right company. But **one check cannot be run yet**: "is this user actually *allowed* to
do this?". That check needs a permissions layer that does not exist yet.

Here is the trap, and it is a real one: the platform reports this as a **pass** anyway — because "we
couldn't check it" is not "it failed". So **every saved recipe today is green on a check that was never
run.**

**What it changes for the user.**
- **If we show it:** the user sees a one-line note — *"Structurally verified. Permissions were not checked."*
  They know exactly what was and was not proved. Slightly less shiny; fully honest.
- **If we don't:** the recipe looks like it passed everything. In a multi-company product, that is a
  permissions claim we did not earn.

**My recommendation: show it.** It is one line of text, the platform already produces the exact sentence,
and it means a person is never misled about what was verified. Honesty here is cheap; the alternative is
a quiet, wrong reassurance.

**The one question.** *Should a saved recipe visibly state "permissions not checked" until that layer
exists — or is recording it silently enough for now?*

**ANSWERED (2026-10-11) — show it.** The owner accepted the recommendation, and added a substantial new
requirement: the **permissions architecture is a workstream of its own** — see **DP-04**. His words verbatim:
*"we go with your recommendation. But there is a very important flow that we need to iron-out: When the user
sends a prompt, we verify if the user has the right permissions to every functionality and data performing
this request requires, if approved, then we process it. Now we have the outcome recipe. If no permissions set,
ONLY THE USER THAT CREATED THIS ONE can have access to it and run it — because permissions are not set yet.
There is a possibility this user has no permission to set permission for this service so other users can have
access to it. So there need to be a place where all functions are listed with the setting of each. And whoever
has the permission to that can set the pending permissions for functions or change permissions for existing
ones. That user may have permission to set permissions of his own or all. this is just a brainstorming. The
main point is that the permissions architecture is not casual, there are too many layers and 'what-ifs' for
it, so we need to investigate and engineer it properly and accurately."*

---

### DP-03 — When a user asks for something that needs a *new* database structure, what should they see?

**Status:** waiting · **Raised by:** Batch B4 · **Blocks anything?** No.

**Where this lives in the technical file:** `02-SRS-02-function-lifecycle.md` §8, question **OQ-B4-3**.

**What it is, in plain words.**
Some prompts are not questions — they are requests to **change the databasing itself**. ("Add me a
Vehicle record." "Set us up an LMS.") The platform **already recognises** these correctly and flags them as
the most serious kind of change, needing a person's approval. That recognition is built and tested.

**But the part that would actually carry the change out does not exist** — deliberately. It is the most
dangerous capability in the whole product, so it was fenced off on purpose: *the fence was built before the
thing it fences.*

The question is **only about what the user sees in the meantime.** Today, a user asking for a new structure
gets a correct, serious refusal — and then **nothing happens.** A correct "no" with no follow-through is a
dead end the user will notice.

**What it changes for the user.**
- **Show the proposal:** the user sees *"This needs a new structure. It is a serious change and needs
  approval. [Here is what it would change.]"* They understand why, and they see the platform is thinking
  correctly — even though carrying it out is still a later piece of work.
- **Hide it entirely:** the request just… stops. The user is left wondering whether the platform
  understood them.

**My recommendation: show the proposal, keep the execution out of scope.**
Displaying it costs almost nothing — the recognition already runs. And it turns a dead end into an honest,
useful answer: *"I understood you; here's what it would take; this kind of change is a separate, gated
step."* Building the *execution* here is a much bigger decision and, I recommend, stays its own item.

**The one question.** *When a prompt needs new database structure, should the workspace show the proposal
and its seriousness — with actually carrying it out still out of scope — or is it fine for that request to
simply stop for now?*

**ANSWERED (2026-10-11) — reframed; it is a permissions question first.** The owner's answer verbatim:
*"part of the answer is what I mentioned in the previous question's answer, the need for a highly engineered
permissions system. Because the first question to ask: does this user have the permissions — collectively —
to change tenant-based database schema? If yes, that takes you in a completely different flow than the one you
mentioned. If the user does not have all the permissions needed then you can explain what is needed and if you
should forward that requested change to the right person to approve or work on it. If yes, we can have a
specific pool for that and users with the right permissions can pick that up, validate, build, and inform the
user that it is ready to use."* → captured as **DP-05** (the schema-change approval pool).

---

### DP-04 — The permissions architecture must be engineered as its own workstream

**Status:** waiting · **Raised by:** owner's answers to DP-02 and DP-03 · **Blocks anything?** No for the SRS;
**yes for the permissions-dependent builds** it will spawn.

**Where this lives in the technical file:** to be defined by a dedicated analysis batch (see below).

**What it is, in plain words.**
When the owner answered "show that permissions were not checked", he attached a much bigger point: **the
permissions system is not a casual feature.** It has many layers, and the "what ifs" multiply fast. His own
words are the specification:

1. **On every prompt**, the platform checks whether the user holds the permissions that *every* functionality
   and *every piece of data* the request touches requires. If approved → process it.
2. **A recipe with no permissions set is private to its creator.** Only the user who made it can find and run
   it — because nobody has decided who else may.
3. **But that creator may not have the right to grant permissions to others.** So there must be **a place that
   lists all functions and their permission settings**, and **someone with the authority** can set the
   *pending* permissions for a function, or change the permissions of an existing one.
4. **Scope of that authority differs by person:** one person may be able to set permissions *only for their
   own* functions; another, for *all* functions.

**What it changes for the user.**
- Without this: a saved recipe is either **invisible to everyone but its maker forever**, or **visible to
  everyone with no control** — both wrong in a multi-company product.
- With this: a recipe is **born private**, and **someone accountable decides when and to whom it opens up** —
  which is exactly the "psychological shift: the user is teaching the ERP a new capability" the vision wants,
  without handing out unearned access.

**My recommendation: treat it as a named engineering workstream with its own analysis batch, not a footnote.**
This is the same class of decision as the Business IR being CORE: it is **cross-cutting** — every function,
every widget, every thread, every prompt touches it. Building it piecemeal is how permission bugs become
security bugs. I recommend a **dedicated analysis batch (call it B-perms)** that produces its own SRS, and
that the permissions-dependent builds are **scheduled behind it**, not guessed at now.

**The one question.** *Do you want me to open a dedicated permissions-architecture batch (its own SRS) before
we build anything that depends on "who may run/save/share what" — or should permissions stay a lighter,
deferred layer while the workspace SRS finishes?*

** Answer: Yes you can do so. Permid´ssions management is extremely critical especially that -unlike standard platforms were he permissions are channeled with static hardcoded functions- in our system the ai-first prompting makes the platform more fluid that may expose it to prompt engineering that can expose the platform and the database in a way that should not be permitted - which is why it is important to check user permission when the flow is from the user to the ai "does this user have the rights needed to request this" and on the way back before the user can have any access to the outcomes - in any way- there should be the question asked again "does the user have all the rights required to see this outcome", just one example why permissions management and gateguards management need a proper engineering that protect the system without damaging its optimization. **

---

### DP-05 — When a prompt needs a new database structure and the user is *allowed*, what happens?

**Status:** waiting · **Raised by:** owner's answer to DP-03 · **Blocks anything?** No — B6–B10 proceed.

**Where this lives in the technical file:** `02-SRS-02-function-lifecycle.md` §8, question **OQ-B4-3** (the
owner's reframing supersedes the original "just show a refusal" option).

**What it is, in plain words.**
The owner's reframing splits the old single question into **two flows**, depending on one check:

- **Does this user hold the permissions — collectively — to change the tenant's database schema?**
  - **Yes →** a *different* flow: the change is picked up and carried out.
  - **No →** the platform **explains what is needed** and can **route the request to the right person** to
    approve or work on it.

**And the "yes" flow has a shape**, in the owner's words: *"a specific pool … users with the right permissions
can pick that up, validate, build, and inform the user that it is ready to use."* — i.e. a **build queue /
pool** where authorized people take a schema-change request, run it through the same validate→build discipline
the platform uses, and tell the requester when it is live.

**What it changes for the user.**
- A schema-change request stops being a dead end. It becomes either **done by someone entitled to do it**, or
  **a routed, tracked request** with a named owner — and either way the requester is told.
- This is also a **safety** improvement: the "yes" path does not remove the fence; it **replaces an
  unattended fence with a staffed gate.**

**My recommendation: capture the two flows now, build neither until DP-04's permissions layer exists.**
The "no" branch (explain + route) is cheap and honest and can ship early. The "yes" branch (the pool) depends
entirely on DP-04's permission model — it *is* a permissions feature. So: **specify both; sequence the pool
after the permissions workstream.**

**The one question.** *Do you want the "explain and route to the right person" branch built early (it needs no
permissions layer), with the "build pool" branch held until the permissions workstream (DP-04) lands?*

** Answer: Yes, we can do so**

---

### DP-06 — Does a saved recipe get **one home** in the menu, or can it sit in several?

**Status:** waiting · **Raised by:** Batch B5 · **Blocks anything?** No — B5 has a working default.

**Where this lives in the technical file:** `02-SRS-03-naming-menus-grouping.md` §9, question **OQ-B5-1**.

**What it is, in plain words.**
When a user saves a recipe, they choose **where it goes** in the menu (the vision's own example: *Destination:
Finance → Accounts Receivable*). The technical question is *what owns that "where"* — the recipe itself, or
the placed button/panel that shows it. We already keep "a thing" and "a place a thing is shown" apart in code
(one recipe can be shown in five places, with one identity and five placements).

**What it changes for the user.**
- **One home per recipe:** every saved recipe appears in exactly one menu spot. Simple, predictable, and the
  user always knows where to find it.
- **Many homes allowed:** the *same* saved recipe can be put in two menus — e.g. under both "Reports" and
  "My Shortcuts". More flexible, slightly harder to explain ("why is it in two places?").

**My recommendation: one home by default, with the door open to many later.**
Store the home on the recipe (so it always has a place), and let the "shown in a place" layer add more spots
when we need them. That gives predictability now and flexibility later, at no cost.

**The one question.** *Should a saved recipe appear in exactly one menu location, or be allowed in several?*

**Answer: Be allowed in several. But it will have the same permissions setings everywhere.**

---

### DP-07 — When a user runs a saved recipe, what does it *open as*?

**Status:** waiting · **Raised by:** Batch B5 · **Blocks anything?** No.

**Where this lives in the technical file:** `02-SRS-03-naming-menus-grouping.md` §9, question **OQ-B5-2**.

**What it is, in plain words.**
For a saved recipe to appear in the menu, its menu link needs a **destination** — a page to open when it is
clicked. Two shapes are possible: a **dedicated page per recipe**, or the recipe **always opening as a panel
inside the workspace** (the widget idea). The menu item needs to know which.

**What it changes for the user.**
- **Its own page:** clicking the menu item takes you to a full screen for that recipe. Familiar; you can
  bookmark it; it feels like a "real" part of the app.
- **Opens in the workspace:** clicking drops the recipe into the workspace you are in, alongside your
  conversation and other panels. More "one working surface"; more in keeping with the vision's workspace idea,
  but the menu is then a *shortcut* rather than a *page*.

**My recommendation: open in the workspace (a panel), with the menu item a shortcut to it.**
This matches the vision's whole point — *interaction islands in one workspace*, not a tree of new pages. It
also means a recipe and a chat about that recipe live side by side, which is what you asked the workspace to be.

**The one question.** *Should a saved recipe open as its own page, or be dropped into the workspace as a panel
(your menu being a shortcut to it)?*

** My answer: We can have both optons. When I save a recipe, I can choose one of the two options or both.**

---

### DP-08 — How deep should the menu categories go?

**Status:** waiting · **Raised by:** Batch B5 · **Blocks anything?** No.

**Where this lives in the technical file:** `02-SRS-03-naming-menus-grouping.md` §9, question **OQ-B5-3**.

**What it is, in plain words.**
A recipe's location is a **path** — e.g. `team.reports.followups`. Read from the left, each dot is a level. The
question: when the user picks `team.reports.followups`, is the *category* simply **`team.reports`** (a flat
list of categories), or is it a **nested tree** — a "team" category containing a "reports" category containing
"followups"?

**What it changes for the user.**
- **Flat categories:** the menu has a flat list of categories, each with items. Easy to scan; the name shows
  the whole path (`team.reports`). Slight downside: a busy tenant could end up with many categories.
- **Nested tree:** categories can expand into sub-categories, like file folders. Cleaner for large tenants;
  but it needs expand/collapse behaviour and is more to get right.

**My recommendation: flat categories for now, with the path carrying the full parent.**
It is simpler, needs no new menu behaviour, and the path already tells you where you are. Because the mechanism
is a pure function of the path, **we can turn on nesting later without re-saving a single recipe** — so nothing
is lost by starting flat.

**The one question.** *Do you want a nested, folder-like menu, or a flat list of categories for now?*

** Answer: We can have it Flat for now.**

---

- **A blocker** goes in Part 1 the moment it stops work, with the reason stated plainly.
- **Anything else** goes in Part 2 the moment it is found, so nothing is lost — and we discuss the whole
  of Part 2 **once the analysis is finished** (the owner's instruction, 2026-10-11).
- Every entry keeps the same five parts: **what it is · what it changes for the user · my recommendation ·
  the one question · the technical-file pointer.** That is the project's reporting standard.
- This file is a **living list**. When an item is decided, it moves to the "already decided" list at the
  top rather than being deleted — so the record shows the decision was made, not lost.

---

*Created 2026-10-11. Owner: Ramzi. Lives in `library/workspace-architecture/` alongside the SRS. Updated as
each batch raises its questions.*

**⚠️ Editing discipline (added 2026-10-11 after a lost edit).** This file is edited by **both** the owner and
the agent. An editor holding an older copy can silently overwrite the other's changes on save — which
happened once and cost the agent's DP-04/05/06 additions. Rule: **before saving, the editor should reload the
file; the agent must re-read the file from disk (not from memory) before every edit, and must never assume
its last version is the current one.** Every edit is committed immediately so the history is recoverable
(`git show <commit>:<path>`).

**Current list:** DP-01 ✅ answered · DP-02 ✅ answered · DP-03 ✅ answered · DP-04 (permissions workstream) ·
DP-05 (schema-change pool) · DP-06 · DP-07 · DP-08 — all waiting, none blocking the SRS.
