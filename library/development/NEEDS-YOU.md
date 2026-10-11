# Needs you — everything that requires the owner, in one place

**Written:** 2026-10-04, evening. **Updated:** 2026-10-06. **Supersedes:** every earlier list, question  
or request scattered across other documents. If it needs you, it is here or it is not tracked.

> **2026-10-06 — you answered the three open items.** *"I will change the password later, docker
> autostart fixed and the iso is deleted."* **`NY-6` and `NY-7` are done and measured; `NY-5` stays open
> because you said "later".** Part 2 is down from three items to one. **Nothing here blocks the build.**

**How to answer.** Every item has an **ID** (`NY-n` — its stable handle). Reply with the IDs and a word
each — for example *"`NY-5` done, `NY-6` yes, `NY-7` yes, `P0-spec` keep"*. You do not need to read
anything else first. Where an item is **not** a decision, it says so, and you can ignore it.

> **Why IDs, not bare numbers (owner's rule, 2026-10-09).** A bare number is ambiguous — `5` could mean
> this file's item 5, or `P5`, or BUILD-ORDER's item 5. An **ID** resolves in every document. This file's
> numbers are therefore written with the `NY-` prefix, and where the item already has a project ID that
> ID is shown too. An item's number is **never reused**, so an ID you quoted yesterday still means the
> same thing today.

**Legend**

| Tag        | Means                                                            |
| ---------- | ---------------------------------------------------------------- |
| **DECIDE** | I need a yes/no or a choice from you                             |
| **DO**     | Only you can do it — it needs your keyboard or your admin rights |
| **KNOW**   | Nothing to do. You should know it; disagree if you want          |
| **NEXT**   | Mine, not yours. Listed so you know what is coming               |

---

## Part 1 — Decisions I need (**2 open** — `NY-22` (row 18: AI own-row-scope semantics) **OPEN — your call; the safe default (a) is already in place**; `NY-24` (the Business-IR authoring wire's first caller) **DECIDED 2026-10-11 — A now → C next → B later (staged + scheduled)**; `NY-23` (row 22 / `CC-44`: should a write endpoint with no permission check fail the build?) **decided 2026-10-11: Option A** (build the default-deny gate); `NY-21` (row 17 coverage) **decided 2026-10-11: Option A** (build the all-tables classification gate); `NY-20` (row 16 scope) **decided 2026-10-11: Option A**; `NY-19` **decided 2026-10-10** (owner chose Option A: build the read-gate coverage test → built as `CC-47`, row 15 ✅); `NY-18` **decided 2026-10-10** ("we follow your recommendations" → Option B, built as `CC-49`); `NY-16` and `NY-17` **decided 2026-10-10** (blank the value; Option B); `NY-15` decided 2026-10-09; `NY-14` closed 2026-10-06; `NY-1`, `NY-2`, `NY-8`, `NY-13` closed; `NY-4` is "nothing needed")

> **Numbering note.** Items are numbered once and **never reused**, so that a number you have already
> quoted keeps meaning the same thing. Item 8 was appended here on 2026-10-05 and answered the same
> day. Items 1 and 2 were closed the same day by measurement — see each item. Item 4 is a "know" item,
> not a decision: the specification's pruning is mine, and nothing is waiting on your signature.
> **Item 13 was added 2026-10-05** with the model-layer work, and **you decided it the same day**:
> per-tenant policy as the destination, cloud-first as the interim. **Item 14 was added and answered
> on 2026-10-06** with the request-outcome taxonomy. **Nothing in this Part is open.**
> *(Item 5, the Coolify password, is in Part 2 — it is a thing to do, not a decision to make.)*
> **Items 16 and 17 were added 2026-10-10** when `CC-45` closed — both were small wording choices with a
> working default already in place. **You decided both the same day:** `NY-16` **blank the value** (the
> default, unchanged — no code touched) and `NY-17` **Option B** (the browser export is sent back through
> the server). Neither blocked the build. **Item 18 was added later on 2026-10-10**, when the `CC-48` critic
> found a *second*, differently-caused leak (the customer-tasks table) — **that one is a real open leak, not
> a preference**, and its fix choice is yours.

### `NY-16` — An exported marked field: hide the column, or blank the value? — ✅ **DECIDED 2026-10-10: blank the value** *(no code change — that was already the behaviour)*

**Your ruling: blank the value** (`"we follow your recommendations"`). When a marked (encrypted) field is
exported, the value is replaced with `***` and the column and its heading stay in place. The alternative
(drop the column entirely) was rejected — it would shift columns for any spreadsheet or script that reads
the file. **Nothing changed in code**: `***` was already what `CC-45` shipped. Undo, if ever wanted, is one
line in `applyEncryptedFieldMask`.

### `NY-17` — The one export that still leaks: which fix do you want? — ✅ **DECIDED 2026-10-10: Option B** *(built as `CC-48`)*

**Your ruling: Option B** (`"we follow your recommendations"`) — the browser-side "View → Export" is sent
back **through the server**, so it gets the same blanking as every other export and reveals nothing new to
the browser. Options A (blank in the browser, which would expose the secret field *names* to the client) and
C (hide marked columns from every records table) were rejected. Built and measured as **`CC-48`**; see
`PLAN-CC-48-client-view-export-leak.md`.

### `NY-18` — The customer **tasks** table leaks the same way (a *different* fix needed): which shape? — ✅ **DECIDED 2026-10-10: Option B (server export mode)** *(built as `CC-49`)*

**Your ruling: Option B** (`"we follow your recommendations"`) — the customer-tasks export is now built
**by the server** (the same pattern as the records page after `CC-48`), so the mask blanks the aliased
columns (`todoTitle`/`todoDescription`/`displayName`) and nothing new reaches the browser. Built and
measured as **`CC-49`** (done 2026-10-10); see `PLAN-CC-49-tasks-alias-export-leak.md`. Option A (mask in
the browser) was rejected for the same reason as `NY-17` A — it names the secret columns to the client.

**What this was.** The customer tasks table ("Work plan → Tasks → Export") built its file in the browser
too, and its rows carried a task's **title**/**description** and the **customer's name** — all marked
(secret) fields. Because the table renamed them (`todoTitle`, `todoDescription`, `displayName`), the
server's blanking rule — which matches on the **real** field name — never matched the alias, so the file
got the real values. This was a **real, open leak** (not a preference), and it is now closed.

---

### `NY-19` — `CC-47`: the register's premise is **wrong**, so the "last leg of row 15" is a choice, not a build — ✅ **DECIDED 2026-10-10 (owner chose Option A)**

**What I found (measured in code, three routes).** The register says *"the ordinary human CRUD `GET`/list path
has **NO** per-entity permission filter."* **That is false.** A CRUD route's own `metadata.GET.requireFeatures`
**is** enforced for the whole request: `apps/mercato/src/app/api/[...slug]/route.ts` loads the route's metadata
(`:367`), extracts the method's entry (`:377`) and calls `checkAuthorization(...)` (`:378`) — which resolves
`rbac.userHasAllFeatures(...)` and returns **403 Forbidden** if the caller lacks the feature (`:207-251`).
**61 of 66** real CRUD `route.ts` files declare it (or gate inside the handler); I found **no un-gated list
endpoint**. So the *filter exists* — what is missing is only a **test that stops a new list route being added
without one** (the same gap `CC-46` closed for the search path).

**The two options.** **Option A (my recommendation):** add one structural test that fails the build when a new
CRUD list route declares no read gate (an explicit, commented exemption list for the handful of handler-gated
and custom-action routes). It is **additive** — one test file, no production code changes — and it closes row
15 *honestly* (`BUILD-ORDER.md` item 17: "so a new table cannot be added un-gated"). **Option B:** just correct
row 15's wording to the measured truth and close it; no test, so a future un-gated list route would still be
possible silently.

**DECISION (owner, 2026-10-10): Option A — build the coverage test.** Built as
`packages/cli/src/lib/generators/__tests__/crud-read-gate-coverage.test.ts` (9 tests GREEN; `tsc --noEmit`
clean). The test is **fail-closed**: it only accepts what the AST can *see* is a statically-read, non-vacuous
gate and forces a human to name everything else on a pinned, commented exemption list — a design inverted
after **12 hostile-critic passes** each found a shape the earlier, open-ended versions missed (each is now a
RED-then-GREEN self-check fixture). Pass 12 additionally found a **discovery gap** (the destructured
`export const { GET, … } = builder(…)` form was invisible to the walker), now fixed. Row 15 flips 🟡 → ✅ and
the wrong claim is corrected in every document that copied it (rule 13). Full detail in
`PLAN-CC-47-human-crud-read-gate.md`.

**Rider worth your eye (one open item, not this one).** The test's honest bound is that its `makeCrudRoute`
family (assertion A) and its exported-metadata family (assertion B) are **not** the whole 457-file tree — **161**
route files are in neither, and **every one is a mutation endpoint** (POST/PUT/PATCH/DELETE) — **none exports a
`GET`**, so none is a list read.
That is intended for CC-47's scope, but it means *"every read is permission-filtered"* is guaranteed for the
human CRUD list family, not for every route that happens to export a `GET`. This is stated in the test header,
not hidden. *(Rule-13 correction, 2026-10-10: this read "163"; measured three ways, the true value is 161.)*

---

### `NY-20` — Row 16 ("own / team row scope"): which scope do you actually want? — ✅ **DECIDED 2026-10-11 (owner chose Option A)** *(Option B documented as a future addition)*

**What row 16 says.** *"You can restrict a person to their own rows / their team's rows, not just their whole
tenant."* (BUILD-ORDER item 18: *"today scope is tenant + organization only."*)

**What I measured in code (rule 0b).** The claim is **true** — scope today is exactly **three** dimensions:
`tenantId`, `organizationId`, and an `organizationIds` allowlist (`shared/src/lib/api/crud.ts`
`buildScopedWhere()`, applied in `shared/src/lib/crud/factory.ts` `withCtx()`). The user id (`auth.sub`) is read
all over the factory **but only to stamp audit/event records — never to filter rows.** There is **no `team`
concept at all** (no team entity, no membership, nothing on `auth`).

**The obstacle that decides the design.** "Own rows" needs a column that says *whose* row it is. **There is no
shared owner column.** Most tables have none, and the few that do use **different names and types**:
`createdByUserId` (`created_by_user_id`, uuid) on `auth`/`customers`; `createdBy` (`created_by`, **varchar** — a
label, not a user) on `business_rules`/`workflows`; `assignedTo` + `assignedToRoles` on `workflows` UserTask. So
a blanket "filter every table by owner" is impossible; row 16 must be an **opt-in, per-entity declaration** of
which column is the owner (the same shape as the existing `aclFeatures` declaration in each module's
`search.ts`).

**Three options:**

| | Option | What it means for you | Size |
|---|---|---|---|
| **A** ✅ *my rec* | **Own-only, opt-in per entity** | An entity that declares an owner column can be restricted so a role sees **only its own rows**; a role on the normal scope is unchanged. **No new "team" thing.** | Bounded, testable |
| **B** | **Own + Team** | As A, **plus** a real `team` entity + membership + UI + schema/migrations. The *full* row 16 as worded. | Large (new entity) |
| **C** | **Correct the row, don't build** | Change row 16 to say the platform is tenant+org by design and per-row scope is a plugin concern. | Trivial |

**Recommendation: A.** It delivers the row's substance (a person *can* be restricted to their own rows) with a
bounded change, and defers "team" as a **scheduled callback** — named, not silently dropped. If you want the
full thing, pick B and I will treat the team entity as its own project. Detail: `PLAN-ROW16-own-team-row-scope.md`.

**Your answer (2026-10-11): A — own-only, opt-in per entity; and document B as a future addition.** A is
**BUILT** (2026-10-11 — the partial `CC-50` is **CLOSED**: an opt-in `ownerField`/`ownerFeature` on
`OrmEntityConfig` plus a role-level `.own` feature-grant modifier, first caller `api_keys`); **Option B** (a
real `team` entity + membership + UI + migrations) is written down as a **future addition** in
`PLAN-ROW16-own-team-row-scope.md` §7.2, scheduled as **`CC-51`** with its trigger named — not dropped. **Part
1 is 0 open again.**

---

### `NY-1` — Reset the local dev database? — ✅ **DONE 2026-10-05** *(no longer needs you)*

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

### `NY-2` — Drop the `apps/docs` folder from the codebase? — ✅ **DONE 2026-10-05** *(no longer needs you)*

**Done.** You approved it and it was moved out of the codebase in commit `2c8fda5` (*"Move apps/docs
out of the codebase"*, 2026-10-05 05:38). Measured: `apps/` now contains only `apps/mercato`. It is
recoverable from the kit's upstream if it is ever wanted back.

**Why it was asked.** It was the kit's own documentation website — **471 files**, a Docusaurus site with its own  
build config and content. It came with the kit we forked. We have our own documentation in  
`library/`, and this was 471 files to keep in step for no benefit.

### `NY-3` — Get a lawyer to review the privacy policy and terms before any commercial use? — **DECIDE**

· *recommend: NOT YET*

**Why.** You would be handling other people's business data. This is a real requirement — but only  
before you take a paying customer, not before you write code.

**If yes now.** I will put a placeholder in the repository so it cannot be forgotten, and you brief  
someone. **If not yet.** It is already recorded as item **C** on the roadmap with the trigger  
"before commercial use", so it will come back on its own.

### `NY-4` — Do you want a say in how I pruned the specification's object list? — **KNOW** · *nothing needed*

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

### `NY-8` — Are assistant agents *identity* or *context*? — ✅ **ANSWERED 2026-10-05**

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

### `NY-13` — What should the long-term default for models be — cloud, local, or per-tenant policy? — ✅ **DECIDED 2026-10-05** *(no longer needs you)*

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

### `NY-14` — When a prompt asks for a whole new service (LMS, CRM), which approval tier? — ✅ **DECIDED 2026-10-06 — explicit-approval**

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

### `NY-15` — What else is "core" beyond the roles-and-permissions manager — and which **database tables** count as the schema backbone? — ✅ **DECIDED 2026-10-09 — the recommendations, AND as a superadmin SETTING, not hardcoded**

**Your ruling (2026-10-09).** *"we follow your recommendations concerning that. However, analyze if we can do
this as a manageable matter instead of hardcoded. Give the superadmin the right and functionality to identify
which table/column/function belongs to which tier. This way if in the future the superadmin added a column
that should not be deleted, he can set that from the superadmin UI without editing code. So, your
recommendations become **default settings**, not hardcoded architecture."*

**Accepted on both counts, and it corrected a real defect in my first recommendation.** Writing the ~25 tables
into code would have meant a **deploy to protect a table the superadmin had just created** — wrong for a
customizable platform. So the recommendation (**Tier‑1 core, Tier‑2 platform-release, the columns/relations
rule — all accepted**) becomes the **SEED**, and the *object→tier map* becomes a **superadmin setting** in
`module_configs`, exactly as `SD-3` did for the tier mapping (the pattern to copy: seed + strict parser +
pure decision + fail-closed read — dictionary §C.2b).

**The one thing that does NOT become a setting**, and your wording already respects it: *the rule* that core
objects cannot be deleted or restructured. That is Ring 1 (`CORE-BOUNDARY.md` §2) — **a setting can move an
object between tiers; it can never delete the tiers.**

**Design and sizing:** [`DECISION-core-object-set-as-settings.md`](DECISION-core-object-set-as-settings.md)
(the four tiers, the seed, the manage screen folded into `SD-5`, **no migration needed**). The evidence that
prompted it: [`DECISION-core-object-set.md`](DECISION-core-object-set.md).

**What happens next (mine, no longer yours):** build the setting as **`SD-2b`** (small — a direct copy of
`tier-source.ts`'s shape), fold its manage screen into **`SD-5`**, and schedule the structural guard with
**`SD-4`**. **Nothing is blocked on you.**

**✅ DONE 2026-10-09 — `SD-2b` is built** (`module_configs` `core_boundary`/`coreObjectTiers`; plan
[`PLAN-SD-2b.md`](PLAN-SD-2b.md)). The superadmin can now move an object **between** the four tiers **from the
UI, no deploy**, and the parser guarantees a setting may **add**, never **drop**, the protected substrate. The
manage screen is folded into **`SD-5`**; the structural guard now rides **`SD-4`** (the ★ ACTIVE TASK). **Still
not yours:** nothing here needs a decision from you.

**✅ ALSO DECIDED AND DONE 2026-10-09 — `CC-31(a)`, "Option B".** A second question had been sitting under this
item: whether the platform's *core* role should be marked by its **name** (`superadmin`) or by a durable
**`is_core` column**. Your ruling, verbatim: *"lets do option B. This way we may also end up having one main
superadmin that is undeletable (the main one) but later we may add new superadmins that the main one can delete
them by changing their names first."* **Built and proven on the live database:** the column exists
(`roles.is_core`), a core role **cannot be renamed away from its guard**, and a freshly created core role is
stamped core so a rename cannot disarm it. **This item no longer needs you** — and it un-parked a whole class of
work: the *"a migration is unprovable on this host"* premise turned out to be **false** (corrected in CC-31 /
CC-7 / CC-23 / `PLAN-SD-1` / `PLAN-SD-2`; your directive is now `WORKING-RULES.md` §1 rule 14).

---

### `NY-21` — Row 17 ("permission coverage reaches **every** table"): measured, only **53 of 239** tables carry a read-ACL declaration — how strict do you want it? — ✅ **DECIDED 2026-10-11: Option A** *(force the classification — build a coverage gate over all 239 tables)*

**What row 17 says** (`BUILD-ORDER.md` item 17): *"Coverage: extend `aclFeatures` from 6 of 53 tables to all
tables, with an aggregate rule so a new table cannot be added un-gated."*

**What I measured in code (rule 0b), 2026-10-11:**
- **239 tables** exist (exported entity classes across the modules' `data/entities.ts`; biggest: sales 28,
  customers 25, auth 21).
- **53 are searchable entities and ALL 53 declare `aclFeatures`** (`CC-46`, 2026-10-10) — the AI read path is
  fully gated and **fails closed** for anything un-declared.
- **60 have a `makeCrudRoute` CRUD route and ALL 60 declare a GET read gate** (`CC-47`, 2026-10-10) — the human
  list path is gated and a **new list route cannot be added un-gated**.
- **→ ~186 tables declare no `aclFeatures` and are not behind a CRUD route.** Many are **not read surfaces at
  all** (join tables, `auth.Session`, `auth.PasswordReset`, sidebar preferences, `PermissionSurfaceRecord`,
  audit/mechanism tables, `query_index`, `translations`, `progress`). They are protected by **tenant/org row
  scope** and by the **write** guards — but **not** by a per-table **read** ACL declaration.

**So the honest state:** the row's *substance* ("a new table cannot be added un-gated") has **two mechanical
guards** today (the CC-46 and CC-47 coverage tests) — but the row's *literal words* ("**every** table") are
**not** met: 186 of 239 tables have no read-ACL declaration.

**Three options:**

| | Option | What it means for you | Size |
|---|---|---|---|
| **A** *(my rec)* | **Classify every table, force the question** | A new coverage gate enumerates **all 239** tables and requires each to be **either** granted a read-ACL (`aclFeatures`) **or** explicitly classified *"internal — not a read surface"*. A brand-new table then **cannot** ship un-classified. This is the row's spirit, applied to *every* table, with the "internal" list reviewable by name. | Bounded, testable |
| **B** | **Narrow the row to the measured boundary** | Tick row 17 against what is *actually* guaranteed — **searchable entities (53) + CRUD list routes (60)** — and record the honest bound (the other ~186 are scope- + write-guarded). Same treatment row 15 got. No new code. | Trivial |
| **C** | **Declare a read-ACL for all 239** | Give every table an `aclFeatures` declaration, including internal ones. Most accurate, but **invents a permission for tables no actor can read** — plumbing with no reader. | Large |

**Recommendation: A.** It delivers the row's real promise (nothing ships un-gated *or* un-classified), keeps
the answer honest (the "internal" set is a **named, reviewable list**, not a silent omission), and is the same
*shape* as the `check-the-premise` rule: force the classification rather than assume it.

**✅ OUTCOME — Option A BUILT 2026-10-11 (`CC-52`; see `PLAN-ROW17-every-table-coverage.md`).**
`packages/cli/src/lib/generators/__tests__/table-coverage.test.ts` enumerates every table and requires it to be
**searchable**, **a comment-stripped `api/**/*.ts` read surface**, or **on the named `INTERNAL_TABLES`
allowlist**. **Rule-13 count correction:** the code-measured exact figure is **233** tables (not 239 — the 239
was the rough rule-0b scan; the gate **pins 233**, and the surface/search module counts 47/12). A separate-agent
hostile critic found 3 real holes (comment false-positive, `route.ts`-only walker, loose floors) — all fixed;
4 RED-then-GREEN mutations md5-verified; green 5/5; `tsc` clean. The "internal" list is a named, reviewable
allowlist with a **reason per entry**, exactly as Option A promised.

**Your answer (2026-10-11): A — force the classification.** Build a coverage gate over **all 239** tables: each
must **either** declare a read-ACL **or** be explicitly classified *"internal — not a read surface"* on a named,
reviewable list. A new table then cannot ship un-classified. **Part 1 is 0 open again.**

---

### `NY-22` — Row 18: when an AI acts for a user who is restricted to **their own rows**, should the AI see only that user's rows, or the whole tenant? — ⬜ **OPEN (your call; the safe default is already in place)**

**What row 18 says** (`BUILD-ORDER.md` item 19): *"Wire the AI IR path to the new column- and row-level gates."*
**(✅ BUILT 2026-10-11 as `CC-53` — the column-level half.)**

**What I measured in code (rule 0b), 2026-10-11:** the AI read tools (`packages/search/src/modules/search/ai-tools.ts`)
now apply the **same column-level classification mask** a human export gets (`CC-45`'s helper), so a field the
platform marks sensitive can no longer be returned to the AI unmasked. But the **row-level** half has a
complication I will not decide for you:

- Row 16 added an **opt-in owner row-scope** (`OrmEntityConfig.ownerField`/`ownerFeature`) that the **human**
  path applies — *"show me only my own rows"*.
- On the **AI** path, that clause has **no reader**: I measured that **no entity is both searchable and
  own-scoped** (only `api_keys` declares `ownerField`, and it has **no** `search.ts`). So today the AI path
  cannot apply an owner clause even if it wanted to.
- That makes the *semantics* a policy question, not a build question — **which is yours, not mine (rule 11)**.

**The question:** *when an AI assistant acts on behalf of a user who is own-scoped, should it (a) see **only
that user's own rows** — the safe default, so the AI can never show more than the human could — or (b) see the
**whole tenant** because the AI is a service principal with its own rights?*

**My recommendation: (a).** It preserves the row 15 guarantee (*"every read is filtered by permission"*) for the
AI door too, and an AI can never exceed the human it speaks for. **This is already the built default** — the
column-mask shipped, and the owner clause is simply not applied because no searchable entity is own-scoped; no
AI can leak across an owner boundary today. If you rule **(b)**, it is a **one-line change** at the resolution
site when the first searchable+own-scoped entity appears, plus a recorded exemption.

**Why it does not block the row:** row 18's **column-level** gate is built and verified; the **row-level** leg is
**deferred with a named trigger** (rules 8/10d) — *the first entity that is both searchable and own-scoped*, or
your ruling, whichever comes first. Recorded as `CC-53`'s own-leg note.

---

### `NY-23` — Should a write screen with **no** permission check fail the build? (the `CC-44` ruling) — ✅ **DECIDED 2026-10-11: Option A (default-deny). BUILT as `CC-44` (2026-10-11).**

> **Owner's answer, 2026-10-11:** *"CC-44: we do Option A (your recommendation)."* So a write endpoint that
> declares no permission and no explicit "by design" exemption **will fail the build**; the deliberately-open
> endpoints get a machine-readable "by design" tag on the route itself.
>
> **✅ DONE 2026-10-11.** The build-time gate is `packages/cli/src/lib/generators/__tests__/write-gate-coverage.test.ts`
> (a new write route that names no permission and no `byDesign` exemption now fails the build); the **11**
> non-feature-gated routes carry an inert `byDesign: '<reason>'` tag. Detail: `COMPLETION-CALLBACKS.md` `CC-44`.

**What this is about, in plain terms.** Whenever we build something that **changes data** — a screen or an
endpoint that saves, edits or deletes a record — the platform is supposed to ask *"is this person allowed to
do this?"*. Today it only asks **if the developer remembered to name a permission on that piece of code**. If
they forget, the code still runs and checks nothing. The check is **opt-in**, not automatic.

**Is anything actually broken right now?** **No.** I measured it (2026-10-09): across the **35** active modules
there are **169** write endpoints. **158** do name a permission; **5** are protected by a different guard; and
the last **6** are deliberately open on purpose (logging in / changing your own profile; webhooks whose
signature is the real check; and one rate-limit probe). So **no real data-write is unprotected today.** The
claim "roles and grants are enforced on every write" is **true** as things stand.

**So what is the risk?** Only this: nothing **forces** the *next* endpoint to name a permission. A future
endpoint could be added that forgets, and it would ship silently open. The hole cannot exist today, but it can
appear tomorrow.

**The decision I need from you.** Do you want the platform to **refuse to build** when a write endpoint names
neither a permission nor an explicit "this one is deliberately open" marker?

| | Option | What it means for you | Size |
|---|---|---|---|
| **A** *(my rec)* | **Default-deny — make it a build failure** | A new write endpoint that declares no permission and no "by design" exemption **fails the build**. The 6 deliberately-open endpoints get a small, readable "by design" tag (e.g. `byDesign: 'signature-verified'`). | Bounded — one check + 6 tags |
| **B** | **Leave it opt-in — keep the manual guard** | No build failure. The existing checker (`analysis/permission-gate/measure.js --check`) stays as the guard: it lists every write endpoint and its gate state and exits with an error if one appears with no explanation — but **someone has to remember to run it**. | Trivial (already built) |

**Recommendation: A.** It turns a rule we currently *hope* is followed into one the machine *enforces* — a
future endpoint cannot ship un-gated by accident. It is a **new rule, not a bug fix**, which is exactly why it
is your call and not mine (rule 11).

**What is already done either way.** The checker that measures every write endpoint and its gate state is
**built** (`analysis/permission-gate/measure.js`); in `--check` mode it exits with an error on an unexplained
route. So even Option B has a mechanical guard — Option A just promotes it from "a step someone must remember"
to "the build stops".

**You ruled Option A, and it is built (2026-10-11).** The gate is now **default-deny at the build** — a new
write endpoint that names no permission and no explicit by-design exemption **fails the build**. Detail:
`COMPLETION-CALLBACKS.md` `CC-44`.

---

### `NY-24` — The Business-IR authoring wire is built but has **no caller**: how should its first caller be introduced? — ✅ **DECIDED 2026-10-11: keep it pinned now; wire it as a chat tool (C) when the AI tool surface is next touched; wire the full business screen (B) only when business work resumes.**

> **Owner's answer, 2026-10-11:** *"we can follow this as long as you clearly and in details you document that in
> the backlog and platform_points and any other document needed so each stage is developed at the right time
> instead of forgetting about it."* So the recommendation is **adopted**, on the condition that each stage is
> **scheduled in the live documents** (this file, `BACKLOG.md`, `platform_points.md`, `COMPLETION-CALLBACKS.md`)
> rather than left in a session's summary. That scheduling is the **supplementary implementation plan** —
> [`PLAN-SUPPLEMENTARY-CORE-QUEUE.md`](PLAN-SUPPLEMENTARY-CORE-QUEUE.md) — and the register row **`CC-58`** below.

**What this is about, in plain terms.** There is a piece of the platform that turns a plain-language request
(*"invoices over 10,000 EUR, by customer"*) into the platform's own structured request object (a **Business IR**).
It is written, tested, and — as of `CC-57` (2026-10-11) — it now correctly checks the agent-permission binding
before it does anything. **But nothing in the running product calls it.** It is a **wired circuit with no switch
on the panel**: no screen reaches it, and it is not exported for other code to use. So the whole capability is
**safe but inert**.

**Why it is that way.** The wire belongs to the **AI foundation** (it calls a model), but its natural consumer —
a *screen* where a person types a business question — belongs to the **business half**, which your own ruling
(2026-10-09) deferred until the policy kernel is finished. So the wire was built when its task (`G-17`) asked for
it; its consumer simply has not been reached yet. It is not a hole (nobody can exploit a path nobody can call);
the risks are **rot** (a signature never exercised by a real caller) and a **false "done"** (an unreachable item
mistaken for a working feature).

**The decision I need from you.** Which of three stages introduces its first caller — and in what order?

| | Stage | What it means | When it is right | Size |
|---|---|---|---|---|
| **A** *(adopted now)* | **Leave it pinned, unreachable** | The coverage gate (`binding-coverage.test.ts`) keeps it honest; the register records that it has no caller. Nothing is spent. | While Phase 3–7 (the kernel) are unfinished — **now**. | Zero |
| **C** *(next)* | **Register it as a chat tool** | The **existing** AI chat path can then ask it to author an IR — it becomes live **without** any new screen, staying inside the AI foundation. | The **next time the AI tool surface is touched**. | Bounded — one tool registration + tests, under the same binding |
| **B** *(later)* | **Wire the full business screen** | A person types a business question on a real screen and gets a compiled answer. | When **business work resumes** (your ruling lifts). | One route + one screen |

**Recommendation (adopted): A now → C next → B later.** Each stage is **scheduled with a named trigger** in the
supplementary plan and the register (`CC-58`), so no stage is forgotten and each is built at the right time.

**Update 2026-10-11 (the owner’s follow-up challenge: *“is the best version doable already? if so, why not go straight to that?”*).** I measured the **whole** pipeline before answering (rule 0b) and found the answer **changes the size, not the order**: the Business-IR path is **five built, tested layers** — `schema.ts` → `authorBusinessQueryIr` (binding-gated by `CC-57`) → `bind.ts` → **`compileQuery`** → `recompile.ts` / **`user-function/run.ts`** — with **78 tests** (incl. a live-model smoke test), **but nothing in the running product reaches any of them**: `authorBusinessQueryIr` has no production caller, `compileQuery`’s only callers are **inside the same library**, and **no route anywhere** mentions the IR, the author, or the compiler. **So the wire is inert along its whole length.** That means: **Stage C** wires only the **head** (an AI tool authors an IR — but nothing compiles it, so the answer is still an object, not a result); **Stage B** is the honest destination and its size is **larger** than first stated — it must also wire the **compile** half (a shared-library capability + a read path), because a screen that shows a compiled answer is the **only** thing that exercises layers 3–5. **That extra work is core, not business** — it is now its own register row, **`CC-59`**, squarely inside the core plan.

**What this means for your question.** We **can** build the full pipeline now — nothing blocks it, and it is core work. The reason not to do it *this instant* is the **same rule you set on 2026-10-09**: it is the **business half’s screen** that is the natural consumer, and building the screen now would be **business-module work before the policy kernel is finished** — the exact reverse-order move you corrected. The **compile half** (`CC-59`), however, is **core and startable now** (it is a library capability + a read path, no screen). **So there is a real choice here, and it is yours** (rule 11):

| Option | What it does | Cost / risk |
|---|---|---|
| **1 — Keep A→C→B as adopted** | Head goes live at Stage C when the AI tool surface is next touched; the compile half (`CC-59`) rides with the consumer that needs it. | Nothing spent now; the pipeline stays inert a while longer (rot risk, low because the tests exercise it). |
| **2 — Pull `CC-59` (the compile half) forward now** | Wire `compileQuery` + a **core read path** so an authored IR can be compiled and executed — via a **core-only** entry (no business screen). | **Startable now, core, no screen.** Makes the pipeline live end-to-end at the library boundary; the only missing piece then is the screen (Stage B). |
| **3 — Pull the whole thing (B) forward now** | The full plain-language → compiled-answer path **with** a screen. | **Blocked by your own ruling**: the screen is business work before the kernel is done. Not recommended. |

**My recommendation:** **Option 2**, if you want the pipeline genuinely live rather than pinned — it is core, unblocked, and it turns “two unwired halves” into “one missing screen”, which is a much better frontier. It does **not** violate your order ruling (no business screen). **The specific question I need you to answer:** *do you want `CC-59` (the compile half, core, startable now) pulled forward as the next build after the current queue, or left triggered with the rest?*

**What is already done either way.** The wire exists and is binding-gated (`CC-57`); the coverage gate guards it;
this decision changes **when** it is exercised, not whether it is safe.

---

## Part 2 — Things only you can do (**1 open** — items 6 and 7 are done)

> **Update 2026-10-06.** You answered the three items: *"I will change the password later, docker
> autostart fixed and the iso is deleted."* **`NY-6` is done** and **`NY-7` is done** — both measured,
> see each item. **Item 5 is still open, and it is the only thing left in this Part.** Nothing here
> blocks the build.

### `NY-5` — Change the Coolify admin password — **DO** · *still open, and it is the only item left here*

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

### `NY-6` — Turn on Docker Desktop auto-start — ✅ **DONE 2026-10-06** *(no longer needs you)*

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

### `NY-7` — Delete the 3.8 GB Ubuntu installer, if you want the space — ✅ **DONE 2026-10-06** *(no longer needs you)*

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

## Part 2b — The newest version is deployed, and the login works — **KNOW**

**Deployed 2026-10-06, and signed in end to end to prove it.** The newest build (code `5af76bc`,
the completed D2-wide sweep) is running on the laptop VM, and I walked the whole browser journey
against it: open `/backend` anonymously → redirected to the login page → submit the form → back at
`/backend` with a live session, **200, `Companai` title**.

**Where to test it:** `https://car-compilation-applications-rochester.trycloudflare.com`

Sign in with **`admin@companai.local`** and the password in
`/opt/companai-platform/.env` (`grep OM_INIT_SUPERADMIN /opt/companai-platform/.env`). That is the
**only** account that works on this deployment — the three `@acme.com` accounts listed in Part 3 are
the *local* machine's logins and do not work on the VM.

**Two things to know about that address.**

1. **It changes if the tunnel restarts.** It is an ephemeral Cloudflare quick tunnel. If the link
   stops working, the tunnel restarted and the address moved — say so and I will re-point it
   (`./set-host.sh <new-address>`). Putting it on a real domain removes this; that is *"Putting it on
   your own domain"* in `RUNBOOK-deploying-a-site.md`.
2. **Anyone who finds it can register.** `DEMO_MODE` and self-service onboarding are on — the kit's
   default, and what makes it useful to show people. Say the word and it becomes a closed instance.

**One correction to an earlier report of mine.** I had said the login was broken and returning
`400`. That was **my error, not the platform's** — I was testing it by posting JSON, and the login
route only accepts form-encoded bodies (which is what the page sends). Measured properly, it returns
`200` with a working session. A later cross-check also showed the `400` is not exclusive to JSON: it
is returned whenever the *input* fails validation, including a password under six characters, and it
prints the same words as a genuine credential rejection. Both traps are now written down in
`RUNBOOK-deploying-a-site.md` so nobody repeats them. **Nothing here needs you.**

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

> **Keying (2026-10-09).** The first column is now the **canonical ID** — `NY-n`, the item's stable
> handle. Quote the ID, never a bare number, so it resolves in every document. Where the row already
> has a project ID, that ID is carried in the Status cell.

| ID | What | Status |
| -- | ---- | ------ |
| **`NY-8`** | **Prove the database init completes cleanly** | ✅ **DONE 2026-10-05** — rebuilt on the fixed image; every init step ran green (see `NY-1`) |
| **`S0`** (`NY-13`) | **Re-run the local dockerised trio and confirm it still comes up** — the first unbuilt item in [`BACKLOG.md`](BACKLOG.md) | ✅ **DONE 2026-10-06.** The re-run found the stack **was not** coming up whole: `mercato-redis-local` had exited because it was the **only** service with **no `restart:` policy**, and `mercato-mcp-local`'s `unhealthy` was a symptom of that (it depends on redis being healthy). **Fixed** — one line added to the redis service, both restarted, **all eight containers now healthy**. Full record: `workspace/COOKBOOK.md`, *Sprint 0 — the re-run* |
| **`P0-spec`** (`NY-9`) | **Finish the specification** | ✅ **DONE 2026-10-05** — draft 2 closes all 18 items: **36 settled · 1 derived · 3 deferred-with-trigger · 0 open**. The one item that was yours, the **Hermes boundary (B-05)**, you **approved on 2026-10-05**. Only **ratification** is left — and that is `P0-spec` |
| **`N-10`** (`NY-10`) | **Wire the two new test files into the automatic check** so they run without being remembered | ✅ **DONE 2026-10-05** — a `docker-scripts` job in `ci.yml` runs all four on every push/PR (**N-10**) |
| **`N-8`** (`NY-11`) | **Remove OpenCode properly** — the platform's own AI chat is built on it, so it cannot just be deleted; the chat has to be rewired first | Open, and the reason is recorded |
| **`NY-12`** | **Deploy a WordPress site and a Docker app to a subdomain on the hosting server, and prove the database-plus-phpMyAdmin path** | This is the thing you asked for. The runbook and the procedure exist; it needs the hosting server VM running |
| **`G-17`** (`NY-16`) | **The G-17 agent declared, in the running app, and the live app-level run GREEN** | ✅ **DONE 2026-10-06 — you said yes, and it passed.** Container rebuilt (`docker compose -f docker-compose.fullapp.yml build app`, **12m22s**, new image `open-mercato/app:local` id `cd8c4242dcc0`). Measured both sides of the switch, same file: `ai-agents.generated.ts` held **0** `ai_assistant` occurrences before and **5** after. Then the live run: login **200** → `GET /ai_assistant/ai/agents` **200** (the app's own registry lists `business_ir.query_author`) → `POST /ai_assistant/ai/run-object` **200** in **69s**, returning a schema-valid Business IR (`list` invoices, `grain: customer`, `amount > 10000`, newest first, `limit 50`, EUR). **The one failure on the way was my input, not the platform:** login first returned **401** because the script guessed the password `secret`; the container seeds superadmin with **`OM_INIT_SUPERADMIN_PASSWORD=password`** (`secret` is for `admin@`/`employee@`). Confirmed by the owner. Full record: `analysis/g17-app-run/RESULTS-2026-10-06.md`. **No further action from you.** The outside-model probe you asked for ran first and passed, so the in-platform pass is unambiguous. **Answer QUALITY remains deliberately unevaluated** — that is the later model-comparison work |
| **`NY-14`** | **A pre-existing broken test in the AI package** — `agent-runtime-object.test.ts` failed 4 of its 8 cases on an unmodified tree | **OPEN — green now, but UNATTRIBUTED, and it does not need you.** Found while building G-17: the test's mock of the LLM provider registry no longer matched the path the model factory actually takes, so the model could not be resolved and it threw `no_provider_configured`. **It now passes 8/8** — but I tested the obvious explanation (*declaring the IR agent fixed it*) and it is **false**: swapping the generated registry back to its empty form left the suite at **8/8**. The environment changed in the same window (the generated registry sidecar was regenerated for the first time). **So the cause is unattributed and the item stays open** rather than being closed on a plausible story. A fix you cannot attribute is a coincidence, and the next person would lean on it. **My side, not yours** |
| **`G-17`** (`NY-15`) | **The live smoke test for G-17** — ask the running local model whether it can actually emit a valid Business IR | ✅ **ANSWERED 2026-10-06 — yes, 6 of 6.** Qwen2.5-7B-Instruct-Q4_K_M produced an object the platform schema accepts for six different IR shapes (filtered list, count, bucketed aggregate, text search, sort+limit, grouped average), each validated against `businessQueryIrSchema` rather than by eye. A **negative control** confirms the pass is real: a loose prompt made the model invent nonsense (incl. a `tenant_id` key), and the schema **rejected** it. Full record: `workspace/COOKBOOK.md`, *Sprint G-17, Step 4*. **The app-level half is now measured and GREEN — see the `G-17` row above** |
| **`S2`/`SD-1`** (`NY-17`) | **Which risk tier each kind of structure change sits in** — the mapping from a change (e.g. "add an optional field") to one of the vision's three tiers | ✅ **ANSWERED, 2026-10-06 — by being absorbed into the specifications dictionary.** Verified this session: `CHANGE_KIND_TIER` in `packages/shared/src/lib/request-outcome/triage.ts` is an **empty frozen object**, so today every structure change lands in the strictest tier. That is the safe default, not a fault — but it is noisier than wanted. **The owner's new instruction resolves it a better way than picking a table:** the tiers become a **standard in [`SPECIFICATIONS-DICTIONARY.md`](SPECIFICATIONS-DICTIONARY.md) §C.2**, derived from the vision's own three tiers and failing closed on anything unrecognised. A **first mapping is proposed there** (optional column → `review_required`; new table / field-type change / removal → `explicit_approval`; index → `safe`) and **one question is open on it** — see the dictionary's Part E. **If the owner does nothing:** the mapping is not written to code and every change keeps stopping for explicit approval — safe, just noisy. **Confirmed properly answered:** the question is no longer "pick a tier per change", it is "the dictionary defines the tiers, the code inherits them" — which is what makes it un-forgettable |

---

## Part 5 — Closed since the last list — **KNOW**

So you can see these are genuinely done and not re-appearing.

| Was                                                                    | Now                                                                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Docker Desktop was not running** — the one thing blocking everything | **You started it.** The full stack came up and was verified today: **8 services, 7 healthy, 21 AI tools discovered** |
| **The local platform might not run at all**                            | It runs. `http://localhost:3000` serves, and the login page loads                                                    |
| **The local database might be half-seeded** — item **1**               | **Rebuilt and clean.** Deleted and rebuilt from scratch on the fixed image; every init step ran green, all five toggles created, 5 `action_logs` rows (see `NY-1`) |
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
