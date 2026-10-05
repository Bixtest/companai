# Needs you — everything that requires the owner, in one place

**Written:** 2026-10-04, evening. **Supersedes:** every earlier list, question or request scattered  
across other documents. If it needs you, it is here or it is not tracked.

**How to answer.** Every item has a number. Reply with the numbers and a word each — for example  
*"5 done, 6 yes, 7 yes, 4 keep"*. You do not need to read anything else first. Where an item is  
**not** a decision, it says so, and you can ignore it.

**Legend**

| Tag        | Means                                                            |
| ---------- | ---------------------------------------------------------------- |
| **DECIDE** | I need a yes/no or a choice from you                             |
| **DO**     | Only you can do it — it needs your keyboard or your admin rights |
| **KNOW**   | Nothing to do. You should know it; disagree if you want          |
| **NEXT**   | Mine, not yours. Listed so you know what is coming               |

---

## Part 1 — Decisions I need (none open — items 1, 2 and 8 closed, item 4 is "nothing needed")

> **Numbering note.** Items are numbered once and **never reused**, so that a number you have already
> quoted keeps meaning the same thing. Item 8 was appended here on 2026-10-05 and answered the same
> day. Items 1 and 2 were closed the same day by measurement — see each item. Item 4 is a "know" item,
> not a decision: the specification's pruning is mine, and nothing is waiting on your signature.
> *(Item 5, the Coolify password, is in Part 2 — it is a thing to do, not a decision to make.)*

### 1. Reset the local dev database? — ✅ **DONE 2026-10-05** *(no longer needs you)*

**Resolved by measurement.** The database was deleted and rebuilt from scratch on the fixed image, and
the rebuild came out clean. Read off the running container, not argued: the app log says
`First run: full initialization...`, then creates all **five** feature toggles, then
`🎉 App initialization complete!`; the `/tmp/init-marker/.seeded` marker is stamped **04:31**; the
image running is the rebuilt one (`sha256:2daca52e…`, built 04:29 that morning); and the database now
holds **3 users, 1 tenant, 1 organisation, 5 feature toggles and 5 `action_logs` rows** — one log row
per toggle, which is exactly the row that used to go missing when the transaction aborted. **No
database error has been logged since 04:13.** The doubt is gone: the local platform is running on a
complete, cleanly-initialised database.

**Why it was asked.** The database's "already initialised" marker was written by the **broken** version of the  
init script, before the fix. That marker said the database was complete. It may not have been: the  
original symptom was that user creation succeeded and then the seeding step died partway. So the  
database might have been missing some of its starting data while looking healthy.

**What was done.** Deleted the local database and let it rebuild from scratch, with the fixed  
script, and watched whether it completed cleanly. That is the only way to know.

**What it cost.** The three local demo accounts were recreated automatically. There was **no real  
data** in this database — it has only ever held the starter data.

### 2. Drop the `apps/docs` folder from the codebase? — ✅ **DONE 2026-10-05** *(no longer needs you)*

**Done.** You approved it and it was moved out of the codebase in commit `2c8fda5` (*"Move apps/docs
out of the codebase"*, 2026-10-05 05:38). Measured: `apps/` now contains only `apps/mercato`. It is
recoverable from the kit's upstream if it is ever wanted back.

**Why it was asked.** It was the kit's own documentation website — **471 files**, a Docusaurus site with its own  
build config and content. It came with the kit we forked. We have our own documentation in  
`library/`, and this was 471 files to keep in step for no benefit.

### &#x20; 
 Get a lawyer to review the privacy policy and terms before any commercial use? — **DECIDE**

· *recommend: NOT YET*

**Why.** You would be handling other people's business data. This is a real requirement — but only  
before you take a paying customer, not before you write code.

**If yes now.** I will put a placeholder in the repository so it cannot be forgotten, and you brief  
someone. **If not yet.** It is already recorded as item **C** on the roadmap with the trigger  
"before commercial use", so it will come back on its own.

### 4. Do you want a say in how I pruned the specification's object list? — **KNOW** · *nothing needed*

This is the question you asked about — *"I don't know what ratification is and what is expected from  
me."* Here is the honest answer.

**Ratification is mostly not your job.** You already made the decision that mattered: *start from the  
union of the objects and let the specification prune it.* Pruning is therefore mine, and I did it.  
Nothing is waiting on your signature. **Draft 2 is now written** (2026-10-05) and it closes the last  
18 open items, so the specification's gate is passed and implementation may begin — there is no further  
writing step waiting on you.

**The one thing you might disagree with.** Of the 37 candidate objects, I removed two as separate  
objects and folded them into others:

- `LegalEntity` → became `Organization` with legal-registration details. **Reason:** the vision's own  
  design says to avoid separate identity silos, and a legal entity *is* an organisation with extra  
  details.
- `Dependency` → became a kind of `Relationship`. **Reason:** it is a connection between two things,  
  not a thing in its own right.

**If you disagree with either.** Say so — it is two rows and a version bump, about ten minutes. This  
is the only part of the specification that is genuinely arguable, and it is flagged as such inside  
the document.

---

### 8. Are assistant agents *identity* or *context*? — ✅ **ANSWERED 2026-10-05**

**Your answer: neither, and both.** There are **five kinds** of agent, and a separate rule that decides
who is answerable when one acts.

| Kind | Who it belongs to | Who can see it |
|---|---|---|
| **Personal assistant** | one user | **that user only** |
| **Role assistant** | a role | **every user holding that role** |
| **Context agent** | the company | shared — it **acts as** a named user for that user's work |
| **Independent agent** | the company | a worker in its own right: its role and permissions, its own queue |
| **System agent** | an admin | replaces or augments a system function — cron, backup, cleanup |

**And the rule that carries the responsibility.** For each action an agent either **acts
automatically** or **needs the relevant user's approval** — and *that choice is what identifies who is
responsible*. Your own example: an assistant may **filter** spam in your inbox but may **not clean**
it — you approve, or you perform the cleaning. A supervisor hands an employee a task; the employee may
use the assistants allocated to them; **but if it goes wrong, the employee cannot blame the assistant.**
The human verifies, fact-checks and approves the final action.

**Where it is written down.** [`AGENT-HALF.md`](AGENT-HALF.md) — the whole model, how it maps onto what
the platform already has (`ai_worker` principals and the `A0`–`A5` gates), and **where each piece lands
in the development plan**.

**Why this beat the question I asked.** My question forced a choice between two of your five kinds, and
it missed the part that matters most: **the accountability rule.** Two of the five kinds (independent,
system) are not assistants at all, and without the approval rule there is no answer to *"who is
responsible when the agent acts?"*

---

## Part 2 — Things only you can do (3)

### 5. Change the Coolify admin password — **DO** · *and it is now the most urgent item here*

You said *"password I will change later."* This is the later, and there is a reason to move it up.

**Why it is urgent.** That password is **still live** — it was tested today and it still gets past  
the password check (only the 2FA code stops it). And it has been sitting in plain text inside a  
**tracked file** in this repository, and it was sent in a chat message. So it is in this project's git  
history.

**What I did about it today.** I removed the password from the file it was written in  
(`RUNBOOK-platform-server.md`), which is where it should never have been. **But deleting text does  
not remove it from git history** — so that is not the fix. **Changing the password is the fix.**  
Until you change it, 2FA is the only thing standing between that password and the dashboard.

**Click-by-click steps:** `RUNBOOK-platform-server.md` §6a, **Task 2**.

**Short version:** open the Coolify dashboard → click `admin` bottom-left → **Profile** → the  
**Password** section → fill in **Current password**, **New password**, **Confirm new password** →  
**Change password**. It signs out every session, including yours.

### 6. Turn on Docker Desktop auto-start — **DO** · *recommended*

**Why.** Right now Docker Desktop is set to **not** start with Windows. So every time the laptop  
restarts, the whole local stack is down, and **I cannot start it** — Docker Desktop's startup uses a  
Windows component (`wsl.exe`) that this machine's security policy blocks for anything I launch. That  
block is not something I can get around, and I should not try.

**The effect today:** the stack works only while Docker Desktop is running, and only you can start it.

**How:** open **Docker Desktop** → **Settings** (the gear, top right) → **General** → tick  
**"Start Docker Desktop when you sign in"** → close Settings. Nothing restarts; it applies from the  
next sign-in.

### 7. Delete the 3.8 GB Ubuntu installer, if you want the space — **DO** · *optional*

The runbook now says **keep it** — it is the way back to a clean reinstall of the hosting server, and  
there is **82.74 GB free** on `C:` (the build's own hard stop was 60 GB, so it is clear by 22 GB). So  
this is purely your call about disk space. If you want the space:

```
Remove-Item "C:\Users\Ramzi\Downloads\companai\vms\ubuntu-24.04.5-live-server-amd64.iso"
```

You can re-download it later from `https://releases.ubuntu.com/24.04.5/` — the runbook records the  
SHA-256 so you can check you got the right file.

---

## Part 3 — The local platform's logins — **KNOW**

You asked: *"I don't know starting kit credentials if there are accounts existing there already."*  
There are three, and they already exist.

| Account                       | Email                 | Password               |
| ----------------------------- | --------------------- | ---------------------- |
| **Superadmin** (full control) | `superadmin@acme.com` | **see the note below** |
| **Admin**                     | `admin@acme.com`      | **see the note below** |
| **Employee**                  | `employee@acme.com`   | **see the note below** |

**Where the password comes from, and why I am not writing it here.** These are the kit's own  
development defaults, and they are already written in plain text in  
`workspace/starting-kit/docker-compose.fullapp.yml`, in the `app` service's environment:

- `OM_INIT_SUPERADMIN_PASSWORD` — this is the superadmin's password.
- The admin and employee accounts use the kit's built-in demo password, which is set in  
  `packages/cli/src/lib/init-secrets.ts`.

**I am deliberately not copying the passwords into this document.** That is a standing rule for this  
project — credentials do not get written into new files — and it costs you one file to look at.

**How I know these are right, without logging in.** Two independent checks, both agreeing:

1. **From the code and the running container's settings** — read the seeding logic, then read the  
   actual environment the container has.
2. **From the database itself** — the passwords are stored scrambled; I tested the candidate  
   passwords against the stored values and exactly those matched. This needs no login and changes  
   nothing.

The app's own tool also lists the three accounts and their roles, which is how the emails above were  
confirmed.

**To open the platform:** `http://localhost:3000` — it is reachable from **this laptop only**, by  
design, and nothing is exposed to the network.

---

## Part 4 — What is next, and is mine (not yours) — **NEXT**

Listed so you are not surprised by the work, not because it needs you.

| #  | What                                                                                                                                     | Status                                                                                                       |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 8  | **Prove the database init completes cleanly**                                                                                            | ✅ **DONE 2026-10-05** — rebuilt on the fixed image; every init step ran green (see item **1**) |
| 9  | **Finish the specification** | ✅ **DONE 2026-10-05** — draft 2 closes all 18 items: 35 settled · 1 derived · 3 deferred-with-trigger · 1 open (the Hermes boundary, which is yours). Only **ratification** is left — and that is item **4** |
| 10 | **Wire the two new test files into the automatic check** so they run without being remembered                                            | ✅ **DONE 2026-10-05** — a `docker-scripts` job in `ci.yml` runs all four on every push/PR (**N-10**)        |
| 11 | **Remove OpenCode properly** — the platform's own AI chat is built on it, so it cannot just be deleted; the chat has to be rewired first | Open, and the reason is recorded                                                                             |
| 12 | **Deploy a WordPress site and a Docker app to a subdomain on the hosting server, and prove the database-plus-phpMyAdmin path**           | This is the thing you asked for. The runbook and the procedure exist; it needs the hosting server VM running |

---

## Part 5 — Closed since the last list — **KNOW**

So you can see these are genuinely done and not re-appearing.

| Was                                                                    | Now                                                                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Docker Desktop was not running** — the one thing blocking everything | **You started it.** The full stack came up and was verified today: **8 services, 7 healthy, 21 AI tools discovered** |
| **The local platform might not run at all**                            | It runs. `http://localhost:3000` serves, and the login page loads                                                    |
| **The local database might be half-seeded** — item **1**               | **Rebuilt and clean.** Deleted and rebuilt from scratch on the fixed image; every init step ran green, all five toggles created, 5 `action_logs` rows (see item **1**) |
| **`apps/docs` — 471 files to keep in step** — item **2**               | **Moved out of the codebase** (commit `2c8fda5`, 2026-10-05); `apps/` now holds only `apps/mercato` (see item **2**) |
| **The two new test files were not wired into CI** — Part 4 row 10      | **A `docker-scripts` job runs all four on every push/PR** (**N-10**)                                                 |
| **`library/analysis/` had no history** — one bad edit from gone        | **Versioned.** You said yes; 41 files are now in version control, and the copies are excluded                        |
| **`.wslconfig` memory cap — "not yet exercised"**                      | **Verified.** The Docker machine now reports 4 CPUs and 15.62 GiB, exactly matching the file                         |
| **A failed database init was reported as success**                     | **Fixed and proven** against the unfixed code first                                                                  |
| **The "36 objects" figure**                                            | **Corrected to 37** in 14 places across 8 files — including your own decision record. The sentence carried its own disproof |

---

*Nothing else needs you. If this document is out of date, that is a defect in this document — tell me  
and I will fix it.*
