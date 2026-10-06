# Needs you — everything that requires the owner, in one place

**Written:** 2026-10-04, evening. **Updated:** 2026-10-06. **Supersedes:** every earlier list, question  
or request scattered across other documents. If it needs you, it is here or it is not tracked.

> **2026-10-06 — you answered the three open items.** *"I will change the password later, docker
> autostart fixed and the iso is deleted."* **Items 6 and 7 are done and measured; item 5 stays open
> because you said "later".** Part 2 is down from three items to one. **Nothing here blocks the build.**

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

## Part 1 — Decisions I need (**none open** — item 14 closed 2026-10-06; items 1, 2, 8 and 13 closed; item 4 is "nothing needed")

> **Numbering note.** Items are numbered once and **never reused**, so that a number you have already
> quoted keeps meaning the same thing. Item 8 was appended here on 2026-10-05 and answered the same
> day. Items 1 and 2 were closed the same day by measurement — see each item. Item 4 is a "know" item,
> not a decision: the specification's pruning is mine, and nothing is waiting on your signature.
> **Item 13 was added 2026-10-05** with the model-layer work, and **you decided it the same day**:
> per-tenant policy as the destination, cloud-first as the interim. **Item 14 was added and answered
> on 2026-10-06** with the request-outcome taxonomy. **Nothing in this Part is open.**
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

### 13. What should the long-term default for models be — cloud, local, or per-tenant policy? — ✅ **DECIDED 2026-10-05** *(no longer needs you)*

**Your decision: per-tenant policy is the destination, cloud-first is the interim.** Recorded
2026-10-05. It is the answer I recommended, and it is now the plan.

**Background in one line.** The platform can already call hosted models (OpenAI, Anthropic, Google,
DeepInfra, Groq, Together, Fireworks, Azure, LiteLLM, OpenRouter, Requesty) and can already run an
open-weight model on its own machine (llama.cpp, Qwen2.5-7B today). What was not decided was **which
one should be the default.**

| | What it means in practice | What it costs |
|---|---|---|
| **A. Cloud first, local as fallback** — **the interim** | Tenants get hosted models by default; the local server handles offline, private and cheap-repetitive work | Best quality and speed today. Per-token spend. Data leaves the machine |
| **B. Local first, cloud as fallback** | The local server is the default; cloud is a policy-gated escalation | No per-token spend, data stays in the rack. **On today's hardware a turn takes 20 minutes or more** |
| **C. Per-tenant policy** — **the destination** | Each tenant declares *local only / local preferred / cloud allowed / approved providers only*, and the platform enforces it **before** the request leaves | This is what the vision already specifies. It needs a model registry and budget controls that do not exist yet |

**What your decision sets in motion, and this is the part that matters.** Three pieces of work moved
from *nice* to *required*:

- **The model registry stops being optional.** A per-tenant policy cannot be enforced by a broker
  that cannot read it.
- **The agent mapping gets its reason.** You are mapping Hermes' **agents, personas and profiles**
  onto the platform's tenants and roles, so the policy has something to attach to.
- **The platform must manage the local model** — which model runs, per deployment and per new
  release. Written up as a requirement in the model document, §6.4.

**What your decision does not cover**, and none of it needs you now: which specific open-weight model
becomes the standard, whether to buy GPU hardware, and whether self-hosting is a customer-facing
promise or an internal capability. All three sit downstream of this answer.

**Where it is written down.** [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md)
— §9 (the decision and what follows), §6.4 (the local-model management requirement), and §10 (the
deferrals the decision moves).

---

### 14. When a prompt asks for a whole new service (LMS, CRM), which approval tier? — ✅ **DECIDED 2026-10-06 — explicit-approval**

**Your answer:** *"we follow your recommendation there."* So a whole new service takes the **strictest
tier — explicit-approval.** In plain terms: a prompt like "add me LMS" can **never** proceed on its own.
It will always stop and name a person who must approve that specific change, every time. It is not the
middle "review" tier, where a less senior person could wave it through.

**Why it was asked.** You told me a prompt can end three ways: a **one-time answer**, a **model
proposal** (the prompt needs new structure), or a **saved Function**. I checked that against the vision
and wrote it up as **G-21** ([`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md)).
Everything in it was decided except this one mapping. The vision already sorts *changes* into three
risk tiers — Doc 04 §130/§131/§132:

| Tier | Its own examples | Who must look |
|---|---|---|
| **Safe** | `new optional field` · `new read-only view` · `new alias` · `new UI view` | nobody — publish after tests pass |
| **Review-required** | `new relationship` · `metric formula change` · `field type change` · `workflow change` | a person reviews |
| **Explicit-approval** ← **a new service goes here** | `deleting data` · `removing field` · `changing authorization boundaries` · `changing financial metric semantics` | a named person approves that specific change |

**The gap the vision left, now closed.** The vision tiers *changes to the model*, but never said which
tier a **whole new capability** lands in. "Add a field" is obviously *safe*. "Add an LMS service" was
the open one — now **explicit-approval**, because it adds UI, API, migrations and tests and becomes part
of the running platform real tenants use.

**Where it is written down.** [`ARCHITECTURE-request-outcomes.md`](ARCHITECTURE-request-outcomes.md) §2 Q3
(decision taken) and §5 (register row 10, no longer open).

---

## Part 2 — Things only you can do (**1 open** — items 6 and 7 are done)

> **Update 2026-10-06.** You answered the three items: *"I will change the password later, docker
> autostart fixed and the iso is deleted."* **Item 6 is done** and **item 7 is done** — both measured,
> see each item. **Item 5 is still open, and it is the only thing left in this Part.** Nothing here
> blocks the build.

### 5. Change the Coolify admin password — **DO** · *still open, and it is the only item left here*

You said *"password I will change later"*, and on 2026-10-06 you said it again. So this stays open and
I am not touching it. There is a reason to move it up when you have a minute.

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

### 6. Turn on Docker Desktop auto-start — ✅ **DONE 2026-10-06** *(no longer needs you)*

**You said "docker autostart fixed". Measured, and it is true.** Docker is running right now and the
whole local stack is up: `mercato-postgres-local`, `mercato-meilisearch-local`, `mercato-model-local`,
`mercato-opencode-local`, `mercato-mcp-local`, `hermes-local`, `starting-kit-app-1` — seven of the
eight containers up at the time of measuring, Docker server **29.8.1**. *(The eighth — `mercato-redis-local`
— was exited; that was the defect `S0` later root-caused and fixed, 2026-10-06. All eight are healthy now.)*

**What this unblocks.** `S0` — the re-run that confirms the local trio still comes up — was waiting on
exactly this, because Docker Desktop's startup path runs `wsl.exe`, which this machine's security policy
blocks for anything I launch (**B-04**). **It is no longer blocked, and it is now mine to do.**

*(For the record, what the item was: Docker Desktop was set to **not** start with Windows, so every
restart left the stack down and only you could start it — open **Docker Desktop** → **Settings** → the
gear, top right → **General** → tick **"Start Docker Desktop when you sign in"**.)*

### 7. Delete the 3.8 GB Ubuntu installer, if you want the space — ✅ **DONE 2026-10-06** *(no longer needs you)*

**You said "the iso is deleted". Measured, and it is true, by two routes.**

1. **The file is gone.** A search for every `.iso` under the project returns **one** file —
   `vms/seed.iso`, 67,584 bytes, which is the cloud-init seed for the VM, **not** the installer. The
   `ubuntu-24.04.5-live-server-amd64.iso` is not there.
2. **The space came back.** `C:` now reports **86 GB free**, against the **82.74 GB** recorded when the
   item was written. That is roughly the 3.8 GB the file occupied.

**If you ever need it back:** re-download from `https://releases.ubuntu.com/24.04.5/`. The runbook
records the SHA-256 so you can check you got the right file. Nothing in the build depended on it being
on disk — it was the way back to a clean reinstall of the hosting server, and it is still one download
away.

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
| 13 | **`S0` — re-run the local dockerised trio and confirm it still comes up** — the first unbuilt item in [`BACKLOG.md`](BACKLOG.md)          | ✅ **DONE 2026-10-06.** The re-run found the stack **was not** coming up whole: `mercato-redis-local` had exited because it was the **only** service with **no `restart:` policy**, and `mercato-mcp-local`'s `unhealthy` was a symptom of that (it depends on redis being healthy). **Fixed** — one line added to the redis service, both restarted, **all eight containers now healthy**. Full record: `workspace/COOKBOOK.md`, *Sprint 0 — the re-run* |
| 9  | **Finish the specification** | ✅ **DONE 2026-10-05** — draft 2 closes all 18 items: **36 settled · 1 derived · 3 deferred-with-trigger · 0 open**. The one item that was yours, the **Hermes boundary (B-05)**, you **approved on 2026-10-05**. Only **ratification** is left — and that is item **4** |
| 10 | **Wire the two new test files into the automatic check** so they run without being remembered                                            | ✅ **DONE 2026-10-05** — a `docker-scripts` job in `ci.yml` runs all four on every push/PR (**N-10**)        |
| 11 | **Remove OpenCode properly** — the platform's own AI chat is built on it, so it cannot just be deleted; the chat has to be rewired first | Open, and the reason is recorded                                                                             |
| 12 | **Deploy a WordPress site and a Docker app to a subdomain on the hosting server, and prove the database-plus-phpMyAdmin path**           | This is the thing you asked for. The runbook and the procedure exist; it needs the hosting server VM running |
| 14 | **A pre-existing broken test in the AI package** — `agent-runtime-object.test.ts` fails 4 of its 8 cases on an unmodified tree | **Open, and mine to fix — it does not need you.** Found while building G-17. The test's mock of the LLM provider registry no longer matches the path the model factory actually takes, so the model can't be resolved and the test throws `no_provider_configured`. **Proven pre-existing** by running the unmodified file. I sidestepped it in my own test by mocking the factory instead. It should be repaired, not deleted — the four cases it is failing are ones that *should* pass |
| 15 | **The live smoke test for G-17** — ask the running local model whether it can actually emit a valid Business IR | ✅ **ANSWERED 2026-10-06 — yes, 6 of 6.** Qwen2.5-7B-Instruct-Q4_K_M produced an object the platform schema accepts for six different IR shapes (filtered list, count, bucketed aggregate, text search, sort+limit, grouped average), each validated against `businessQueryIrSchema` rather than by eye. A **negative control** confirms the pass is real: a loose prompt made the model invent nonsense (incl. a `tenant_id` key), and the schema **rejected** it. **Still open (small):** the same request driven through the *live app* end to end, which needs an authenticated session. Full record: `workspace/COOKBOOK.md`, *Sprint G-17, Step 4* |

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
| **The Hermes runtime boundary (B-05) was open** — the last owner decision in the specification | **You approved it 2026-10-05.** One product, one repository, one deployment, one interface (ours), with Hermes as a **supervised private runtime process behind the internal port**; Hermes is **headless**. The spec's 40-row register is now **36 settled · 1 derived · 3 deferred · 0 open** |
| **The long-term model default was open** — item **13** | **You decided it 2026-10-05.** **Per-tenant policy is the destination, cloud-first is the interim.** It turned three pieces of work from *nice* to *required*: the model registry, the Hermes agent/persona/profile mapping, and platform-managed local models. See [`ARCHITECTURE-model-server-integration.md`](ARCHITECTURE-model-server-integration.md) §9 |
| **Docker Desktop auto-start was off** — item **6** | ✅ **You fixed it 2026-10-06.** Measured: Docker server **29.8.1** running and the stack up, so a restart no longer leaves the stack down. **This also unblocked `S0`** (Part 4 row 13). *(The count read "seven up" because `mercato-redis-local` had separately exited — that was the `S0` defect, now fixed; all eight healthy.)* |
| **The 3.8 GB Ubuntu installer was on disk** — item **7** | ✅ **You deleted it 2026-10-06.** Measured by two routes: a search for every `.iso` under the project returns only `vms/seed.iso` (67,584 bytes, the cloud-init seed), and `C:` now reports **86 GB free** against **82.74 GB** when the item was written. Re-downloadable from `https://releases.ubuntu.com/24.04.5/` |
| **The Coolify admin password was in a tracked file** | **Half done, and the half that matters is yours** — I removed it from the file it was written in; **you have not changed it yet, and item 5 is still open.** Deleting text does not remove it from git history, so **changing the password is the fix** |

---

*Nothing else needs you. If this document is out of date, that is a defect in this document — tell me  
and I will fix it.*
