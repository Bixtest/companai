# Forensic analysis — the frontend, its wiring, and why logging in looks unchanged

**Date:** 2026-10-09. **Requested by the owner** (verbatim): *"before moving to AH-1, I want you to
forensically analyze the frontend and its structure and what it is wired to, and the codebase with all
its done functions and whether it is wired properly in the interface. Because I dont see any differenc
when I log in for so many updates and deployments now - unless this is normal at this stage."*

**Scope.** A *measurement* task, not a build. Every claim below carries an observation, taken from the
**live deployment** (`companai.corprorate.com`, image `open-mercato/app:wan` = `4375447250e3`, built
2026-10-09 16:13) and the **live database** — never from the local, gitignored build artifact.

**Tooling.** Read-only probes, written locally and shipped to `/tmp` on the VM
(`analysis/forensic-frontend-2026-10-09/probe1..6_*.sh`). No repository file was edited by a probe.

---

## The one-line answer

**"No difference when I log in" is REAL, and it is NORMAL at this stage — but it is also a
discoverability gap worth naming.** The work is not missing: it is deployed, registered in the route
manifest, present in the live sidebar, and its APIs answer **200**. What did *not* change is anything
**prominent**: the new capability landed as rows **inside groups that already existed** (Auth,
Authority, Workflow Engine, Business Rules, Module Configuration), so a sidebar that already holds
**22 groups / 61 items** looks the same at a glance.

---

## 1. The frontend mechanism — a registry-assembled SPA

The backend UI is **not** a tree of static pages. The only real page file is a catch-all:

- `apps/mercato/src/app/(backend)/backend/[...slug]/page.tsx` resolves every `/backend/*` path through
  `findRouteManifestMatch(getBackendRouteManifests(), pathname)`; **no match → `notFound()` (404)**.

Therefore **what you can see == what the generated registry lists.** The registry is
`apps/mercato/.mercato/generated/` — a **build artifact**, regenerated during `docker build` by
`mercato generate registry`. Its presence on a laptop proves nothing about a deployment; only the copy
inside the running image does.

**Provenance of "build artifact" (corrected, rule 13).** It is **not tracked** by any repo:
`git ls-files apps/mercato/.mercato` → **0 files**. The ignore rule lives in the **code repo**
(`workspace/starting-kit/.gitignore:`**71** `.mercato`), **not** the docs repo. *(An earlier draft of
this report cited "`.gitignore:71`" without naming the repo — the wrong file. Corrected here after a
hostile-critic pass.)*

**Observation (deployed image).** `docker run … open-mercato/app:wan` →
`ls /app/apps/mercato/.mercato/generated/backend-routes.generated.ts` → dated **Oct 9 14:05**, 56,366 B.
**The deployed registry is fresh.**

**Correction recorded (rule 13).** An earlier subagent report read the **local, stale** copy
(dated Oct 6 10:44) and concluded the SD-5 page was *absent from the deployment*. That premise was
**false** and is corrected here: the deployed registry contains it (see §3).

## 2. What gates visibility

1. **`enabled-module-ids.generated.ts`** — only listed modules contribute routes/pages/APIs.
   **Observation:** the deployed file lists exactly **35 ids** (dashboards … ratelimit_probe). Local and
   deployed agree. → The module set is **not** why the UI looks unchanged.
2. **Each page's `page.meta.ts`** — `requireAuth`, `requireFeatures`, `pageGroup`, `pageOrder`,
   **`pageContext`**. `BackendChromePageContext = 'main' | 'admin' | 'settings' | 'profile'`
   (`shared/src/modules/navigation/backendChrome.ts`). A page with `pageContext: 'settings'` is placed
   into `settingsSections`; everything else into `groups`.

## 3. The SD-4/SD-5 "Structural permissions" screen — BUILT, WIRED, REACHABLE

Prove-it chain (each an observation):

| Step | Command | Result |
|---|---|---|
| registered in deployed registry | `grep structural backend-routes.generated.ts` | **2** hits (import + route entry) |
| page renders | `GET /backend/settings/structural-permissions` (superadmin, HTTPS) | **200** |
| page has real content | body size + vocabulary | 517,135 B; levels `straight/review/approval/never`, kinds `table…agent` |
| its API answers | `GET /api/auth/structural-permissions` | **200**, full rule grid `{table:{read,add,…},…,agent:{…}}` |
| it is in the live sidebar | `GET /api/auth/admin/nav` | present under group **Auth** |

**Path correction (self-caught).** `/api/structural-permissions` → **404**; the correct URL is
**`/api/auth/structural-permissions`**. The registry entry is `path: "/auth/structural-permissions"`,
mounting under the `/api` prefix. *The first 404 was my probe using the wrong URL, not a defect.*

**Why the owner did not notice it:** `pageContext: 'settings'`, `pageGroup: 'Auth'`, `pageOrder: 3`.
It is reachable via **Settings → Auth → "Structural permissions"** — and it is *also* rendered in the
main `Auth` group. It simply is not a new top-level destination.

## 4. The live sidebar, measured

`GET /api/auth/admin/nav` as superadmin → **200**, 55,877 B. Payload:

- **`groups`: 22 groups, 61 nav items.**
- **`settingsSections`: 12 sections, 45 items.**
- **`settingsSections` hrefs ⊆ `groups` hrefs** — i.e. **nothing is hidden behind Settings**; every
  settings screen also appears in the main nav. (Set-difference `settingsSections − groups` = ∅;
  union = **61 unique**.)
- **One page, listed twice:** the 45 settings screens appear in **both** the main `groups` and
  `settingsSections`. The main nav has **61 entries, all unique** (no dupes *within* `groups`), so
  "61 items" stands — but a reader should know the Settings view repeats 45 of them.
- Groups carrying the newly-built work, all pre-existing: **Auth (4)**, **Authority (6)**,
  **Workflow Engine (4)**, **Business Rules (3)**, **Module Configuration (14)**.

**Conclusion:** the sidebar is *correct and complete*; it is simply **dense**. Adding a row to an
existing group cannot be seen on a 61-item sidebar.

## 5. The full "done functions → is it wired?" inventory

Each row verified against **deployed registry** (`grep` on the in-image generated files) and the
**live DB** (`pg_tables` + row counts).

### (a) Built + wired + reachable (visible in the live nav)

| Capability | Page(s) | API | Notes |
|---|---|---|---|
| Structural permissions (SD-4/5) | `/backend/settings/structural-permissions` | `/api/auth/structural-permissions` | 200/200; not yet exercised (0 persisted rows) |
| Authority: approvals | `/backend/authority/approvals` | via approvals API | group `Authority` |
| Authority: delegations | `/backend/authority/delegations` | `/api/auth/authority/delegations` | GET/POST |
| Authority: denials | `/backend/authority/denials` | `/api/auth/authority/denials` | GET/POST |
| Authority: trust | `/backend/authority/trust` | `/api/auth/authority/trust` | GET/POST |
| Authority: projects | `/backend/authority/projects` | `/api/auth/authority/projects` | GET |
| Authority: record-locks | `/backend/authority/record-locks` | `/api/auth/authority/record-locks` | GET/POST |
| Workflows | definitions / instances / tasks / events (4 pages) | workflows API | group `Workflow Engine` |
| Business rules | rules / sets / logs (3 pages) | business_rules API | **only family with rows: `business_rules` = 6** |
| AI agents (runtime) | `/backend/config/ai-assistant/agents` | **`/api/ai_assistant/ai/agents`** | see (c) below |
| Roles / users / api-keys | `/backend/roles`, `/backend/users`, `/backend/api-keys` | roles/users API | group `Auth` |
| Sidebar customization | `/backend/sidebar-customization` | `/api/auth/sidebar/*` | group `Customization` |

### (b) Built + wired, but low discoverability

- **Structural permissions** — placed under `Auth`, not a visible new destination (§3).

### (c) Built with an API but no dedicated page

- **D3 `pending-acts`** — API `/api/auth/authority/pending-acts` (GET/POST) **exists**; there is **no**
  `/backend/authority/pending-acts` page (`grep pending_acts` = 0 in backend-routes). Surfaced **only**
  through Approvals.
- **The AH-1 `Agent` *kernel object*** — `ce.ts` declares `ai_assistant:agent`, and `agent` is a member
  of `CORE_OBJECT_KINDS` and `CORE_SETTING_KINDS`; but **no page renders the kernel object**.
  `/backend/config/ai-assistant/agents` renders `AiAgentSettingsPageClient` — the **runtime** agent
  configuration client, a different thing. The kernel object is guarded at runtime
  (`auth/lib/core-object-guard.ts`) but has **no UI of its own**.
  The runtime agents API is **`/api/ai_assistant/ai/agents`** (200), *not* `/api/ai/agents` (404).
  *(Path corrected after a hostile-critic pass.)*

### (d) Built in code but the module is NOT enabled (hence invisible by design)

Enabled = 35 ids. Modules with backend+API on disk but **not** in `enabled-module-ids`: `catalog`,
`customers`, `customer_accounts`, `sales`, `staff`, `wms`, `resources`, `checkout`, `payment_gateways`,
`shipping_carriers`. Their pages never enter the registry, so they cannot appear. **This is expected,
not a defect** — enabling is a config decision.

### (e) Built but neither API nor UI (library-only)

- **Core-settings / `CORE_SETTING_KINDS`** — the code exists and is deployed
  (`shared/src/lib/core-boundary/core-settings.ts`, `CORE_SETTING_KINDS = ['table','column','relation','function','role','agent']`),
  but there is **no `/backend/config/core-settings` page** and **no `/api/core-settings` route**
  (`grep core-settings` = 0/0). It is writable only through `module_configs`. **AH-1 slices 1+2 are in
  the deployed image**, but the capability has no screen yet.
  **Observation (why "no page" is certain):** `GET /backend/config/core-settings` → **404** with a
  **496,341-byte** frame — the same "not found" frame as a random typo
  (`/backend/zzz-nonexistent` → 404, 496,312 b) — versus the real SD-5 page at **517,135 b (200)**.
  So the path renders the catch-all's notFound frame, indistinguishable from a typo: **no content**.
  **Consequence:** core-settings is **not a "feature family" with a deployed schema** the way D3/authority
  or workflows are; it is a **library-only constant** with neither table nor UI. *(Corrected after a
  hostile-critic pass, which caught the earlier draft lumping it with the schema-backed families.)*
- **`inbox-actions.generated.ts`** — `entriesRaw: InboxActionConfigEntry[] = []` → **zero** inbox
  actions registered. (Confirmed byte-for-byte in the deployed file.)

## 6. Live database state — what the features have actually persisted

Observations (`mercato-postgres-wan`, `open-mercato`):

| Table | Rows |
|---|---|
| `module_configs` | **2** (`notifications/delivery_strategies`, `vector/auto_index_enabled`) — **no** structural/core row |
| `role_acls` | 3 (one per role) |
| `users` | 3 (all one tenant/org) |
| `business_rules` | **6** |
| `authority_*` (7 tables) | 0 each |
| `record_locks` | 0 |
| `ai_agent_*_overrides` (3 tables) | 0 each |
| `ai_pending_actions` | 0 |
| `workflow_*` (5 tables) | 0 each |

**Reading.** The **schema for every new family is deployed** (the tables exist), but **nothing has been
persisted through the new screens yet** — correct **fail-closed** behaviour, and consistent with
"nobody has opened them". `business_rules` is the only family carrying data (6 rows, seeded earlier).

## 7. The ACL model (recorded because it explains who can see what)

`role_acls` = **one row per role**, `features_json` (jsonb array), `is_super_admin` (bool). No
per-feature table.

- **superadmin** — `is_super_admin = t`; features include `directory.tenants.*`, `integrations.*`,…
  (does **not** literally list `auth.acl.manage`, yet the page still returns 200 → **`is_super_admin`
  bypasses the feature check** at the catch-all; verified empirically).
- **admin** — features include **`auth.*`** → wildcard grants `auth.acl.manage`.
- **employee** — least privilege.

## 8. Verdict

1. **Is the UI broken / unwired?** **No.** The catch-all, the registry, the enabled-module gate, and
   the four chrome contexts all behave as designed. New work is registered, reachable, and its APIs
   answer.
2. **Is "no visible difference on login" normal at this stage?** **Yes, mechanically** — for the reason
   in §4: new rows inside 22 pre-existing groups on a 61-item sidebar. **And** the newly-built screen
   (SD-5) was deliberately a **Settings sub-page**, so the *main* nav could not change.
3. **A second, deeper reason — the data substrate is empty.** This is the confound that a hostile-critic
   pass forced into the open (§6). The deployment serves **1 tenant / 1 org / 3 users**, and **every
   table belonging to the new families is at 0 rows** (authority, workflows, agents, pending-acts,
   record-locks). A UI whose *content* is empty cannot look different from a UI whose content is
   missing — **regardless of how many screens are wired**. So "no difference" is *partly layout density*
   and *partly an empty database*: the platform has shipped the **machinery** for these features but
   nothing in the running instance exercises them yet. **Only `business_rules` carries data (6 rows).**
4. **Is there still a defect worth fixing?** **Yes, one — a discoverability gap, not a wiring bug.**
   A whole slice of work (SD-3/4/5, D3 escalation, the agent kernel object) can land with **zero change
   to the default landing/nav**, and with no seeded content to make it visible. That is a product
   decision to schedule, not an accident to debug.
5. **What would make the difference visible?** *(for the owner to decide, not the agent)* —
   e.g. a top-level destination for the new capability, an onboarding/"what's new" surface, a default
   landing page that reflects new work, **or simply exercising the features with real data**. **This is
   a decision, so per rule 11 it is the owner's.**

---

## Appendix — reproduction

All probes are in `analysis/forensic-frontend-2026-10-09/`. They log in as superadmin over HTTPS and
read the deployed image / live DB read-only. Key URLs learned this pass:

- Sidebar payload: **`GET /api/auth/admin/nav`** (the layout hardcodes this in `backend/layout.tsx:122`).
- Structural-permissions API: **`GET /api/auth/structural-permissions`**.
- Runtime agents API: **`GET /api/ai_assistant/ai/agents`**.
- Login: `POST /api/auth/login`, **form-encoded** only.

## Appendix — hostile-critic outcome (2026-10-09)

A separate hostile-critic pass re-probed every claim against the live deployment and found **three real
defects in the first draft**, all now fixed above:

| # | Critic finding | Verified | Fix |
|---|---|---|---|
| F1 | the `.gitignore:71` citation named the wrong repo | ✅ `.mercato` is at **`workspace/starting-kit/.gitignore:71`**; `git ls-files` → 0 tracked | citation corrected (§1) |
| F2 | the runtime agents API path was false | ✅ `/api/ai/agents` → **404**; `/api/ai_assistant/ai/agents` → **200** | path corrected (§5c) |
| F3 | `core-settings` was lumped with schema-backed families | ✅ `core-settings` → 404 with the **same 496 KB frame as a typo**; no table, no page | re-classified as library-only (§5e) |
| C4 | the "nothing hidden" claim could hide a double-count | ✅ set-diff **is** ∅, but the 45 settings screens are **listed twice** (main + settings) | clarified in §4 |
| — | a confound was missed: **empty data** | ✅ 1 tenant / 3 users / new tables all **0 rows** | added as Verdict §3 |

**Critic's blunt verdict:** *"The analysis is substantially sound … the plain-English conclusion is
honest and defensible … As written: sound conclusions, sloppy provenance."* The provenance is now
repaired; the conclusion stands.
