# CORE MODULES REGISTER — what a platform of this kind needs, what we have, and when to build it

**Written:** 2026-10-06
**Asked by:** the owner —
> *"research and identify standard core and architectural modules in traditional startup saas platforms,
> erps, etc… make a list of them so we convert that to our type of database/default_functions/etc items
> and set when to develop that (earlier better without compromising prerequisites order. And most
> importantly what is exactly built, and more importantly is it REALLY built exactly and completely as
> we need — because we cant compromise core architecture just because something already exist and because
> as you noticed already, while getting busy with the big picture a lot of critical requirements are
> slipping out of our view. Systematic controller project management is the most critical standard in
> this project and it will decide the success or fail of it — totally."*

**Status of the answer:** measured from the code. Two independent routes were used for every verdict.
Where the two disagreed, the disagreement is reported, not averaged (§7).

---

## 0. How to read this document

This is a **register**: one row per module, with (a) what the industry standard is, (b) what we have,
(c) **whether it is REALLY built to production standard**, and (d) when to build it. It exists because
the owner identified the project's true failure mode: *"while getting busy with the big picture a lot of
critical requirements are slipping out of our view."* This file is the instrument against that.

**Four verdicts, defined so they cannot flatter us:**

| Verdict | Meaning |
|---|---|
| **COMPLETE** | Every layer a production module of this kind needs is present **and verified**: tables · API (full CRUD where the domain needs it) · admin UI · tests (unit **and** integration) |
| **BUILT-UNEVEN** | The feature is real and usable, but **at least one layer is thin or missing** — named in the row |
| **SHELL** | Files exist, structure looks right, **but it does not actually deliver the feature** — named in the row |
| **ABSENT** | Not present at all |

**Verification rule (the owner's own):** a claim of "built" is only accepted from **two routes that share
no failure mode** — typically (1) reading the artefact, (2) the producer's own test or a second path to
the same fact. One route is a guess.

---

## 1. The industry baseline — what a platform like this is expected to have

Researched from standard ERP/SaaS module taxonomies (ERP Research's eight core modules; the 14-module
consensus list). Two groups matter, and **the second group is the one that slips out of view**, because
these are not "business features" — they are the platform's own skeleton.

### 1a. Platform / architectural modules (the skeleton — build first)

| # | Standard module | What it is | Why it is foundational |
|---|---|---|---|
| P1 | **Identity & accounts** | users, sessions, password reset, consent, login | nothing works without it |
| P2 | **Tenancy & org structure** | tenants, organisations, hierarchy, scoping | every row is owned by someone |
| P3 | **Roles & permissions (RBAC/ACL)** | roles, grants, feature gates | every action is gated |
| P4 | **Audit & compliance log** | who did what, when, to which record | legally required; the safety net |
| P5 | **Settings / configuration** | instance- and tenant-level settings | policies live here, not in code |
| P6 | **File / document storage** | attachments, partitions, storage backends | most business objects attach files |
| P7 | **Notifications** | in-app + email + push, templates | every workflow emits them |
| P8 | **Workflow / automation engine** | definitions, instances, steps, user tasks | business processes run on it |
| P9 | **Business rules engine** | declarative conditions → actions | policy without code |
| P10 | **Search / indexing** | full-text + vector index over data | AI and users both need it |
| P11 | **Integrations & sync** | external systems, credentials, mapping, cursors | the outside world connects here |
| P12 | **API keys / programmatic access** | machine auth | automation and partners |
| P13 | **i18n / localisation** | translation catalogue, locales | multi-language from day one |
| P14 | **Feature flags** | gradual rollout, kill switches | safe releases |
| P15 | **Dashboards / widgets / perspectives** | configurable views over data | how users actually see the system |
| P16 | **Custom fields / entity extension** | user-defined tables and columns | the "expandable platform" promise |
| P17 | **Background jobs / scheduler** | workers, queues, schedules | everything long-running |
| P18 | **Guard / mutation policy engine** | the gate every write passes | **where the standards are enforced** |

### 1b. Business modules (the flesh — built on the skeleton)

| # | Standard module | Our equivalent |
|---|---|---|
| B1 | CRM (leads, contacts, pipeline) | `customers` |
| B2 | Sales / order management | `sales` |
| B3 | Catalog / product / pricing | `catalog` |
| B4 | Inventory & warehouse (WMS) | `wms` |
| B5 | Finance / accounting (GL, AP/AR) | *(see §4 — the big gap)* |
| B6 | Procurement / purchasing | *(see §4)* |
| B7 | HR / people (HCM) | `staff` (partial — people, not payroll) |
| B8 | Projects / PSA | `planner`, `staff` time |
| B9 | BI / analytics | `query_index`, `dashboards` |
| B10 | Shipping / logistics | `shipping_carriers` |
| B11 | Payments | `payment_gateways` |
| B12 | Currencies / FX | `currencies` |
| B13 | Email / messaging / inbox | `messages`, `inbox_ops`, `communication_channels` |
| B14 | CRM portals (customer self-service) | `portal`, `customer_accounts` |

---

## 2. THE REGISTER — platform modules, measured (2026-10-06)

Counts verified by **two routes** (artefact read + independent count). See §7 for the one correction.

| Module | Tables | Routes | UI pages | Tests (unit / integ) | Verdict | What is thin or missing |
|---|---|---|---|---|---|---|
| **P1 Identity & accounts** (`auth`) | 20 | 17 | 18 | 16 / 57 | **COMPLETE** | — (the strongest module) |
| **P2 Tenancy & org** (`directory`) | 3 | 5 | 8 | 2 / 16 | **COMPLETE** | — |
| **P3 Roles & permissions** (`auth` ACL) | 2 (in auth) | — | UI in auth | in auth | **BUILT-UNEVEN** | the two-table ACL is real; **but there is no permissions *catalogue*** — permissions are strings on ACL rows, and a new data structure creates no permission records (**SD-1 / S2 unbuilt**) |
| **P4 Audit & compliance** (`audit_logs`) | 3 | 5 (read+create only) | 1 | 15 / 9 | **BUILT-UNEVEN** | API is **read+create only** — no update/delete (arguably correct for a log), but the admin surface is a **single viewer page**; needs retention/export policy |
| **P5 Settings / config** (`configs`) | 2 | 4 | 3 | 5 / 6 | **COMPLETE** | `module_configs` is the general settings engine — **and is where the tiers/defaults setting will live (item 1)** |
| **P6 File / document storage** (`attachments`) | 2 | 7 (full CRUD) | 2 | 21 / 20 | **COMPLETE** | — |
| **P7 Notifications** (`notifications`) | 1 | 11 (full CRUD) | 1 | 8 / 11 | **BUILT-UNEVEN** | one table + one UI page. **Templates are CODE-defined** (each module ships a `notifications.ts` with `NotificationTypeDefinition`), **not user-editable** — so there is no template-management surface a business user can change. Verify whether that is intended |
| **P8 Workflow engine** (`workflows`) | 7 | 19 | 11 | 5 / 34 | **COMPLETE** | strong |
| **P9 Business rules** (`business_rules`) | 4 | 9 | 8 | 1 / 14 | **COMPLETE** | — |
| **P10 Search / indexing** (`query_index`) | 6 | 1 (+handlers) | 1 | 21 / 1 | **BUILT-UNEVEN** | engine is strong (21 unit tests) **but UI is a single page and integration coverage is 1 spec**; the per-table `aclFeatures` gate covers only **6 of 67** tables (S4 gap) |
| **P11 Integrations & sync** (`integrations`, `data_sync`) | 4 + 4 | 7 + 5 | 3 + 2 | 12 / 10, 1 / 9 | **BUILT-UNEVEN** | `integrations` API is **read+update only** (no create/delete); `data_sync` has 4 workers — the background side is solid |
| **P12 API keys** (`api_keys`) | 1 | **1** | 2 | in count / 7 | **BUILT-UNEVEN** | **one composite route file** (`api/keys/route.ts`), no per-key routes; thinnest module by structure |
| **P13 i18n / localisation** (`translations`, `shared/i18n`) | 1 | 1 | 1 | 13 / 18 | **BUILT-UNEVEN** | catalogue + per-module `i18n` exist; `translations` API is a **single route** (GET/PUT/DELETE, no create) and UI is one page — **the machinery is there but the management surface is thin** |
| **P14 Feature flags** (`feature_toggles`) | 2 | 8 | 5 | 2 / 15 | **COMPLETE** | — |
| **P15 Dashboards / widgets / perspectives** | 3 + 2 | 6 + 3 | **0 + 0** | 3 / 1, 7 / 12 | **BUILT-UNEVEN** | **`dashboards` and `perspectives` have ZERO UI pages** — the tables and APIs exist, the screens do not. `widgets` is a **one-file re-export shim**, not a module (see §7) |
| **P16 Custom fields / entity extension** (`entities`) | 6 | full verbs | 9 | 3 / 8 | **COMPLETE** | the expandable-platform core — strong |
| **P17 Jobs / scheduler** (`progress` + workers) | 1 | 3 | **0** | 2 / 9 | **BUILT-UNEVEN** | service + API exist; **no UI**; workers exist in many modules (data_sync ×4, payment_gateways ×2, shipping ×3, catalog, workflows, notifications) |
| **P18 Guard / mutation policy** | — | — | — | 10 / 7 | **SHELL — LIVE DEFECT** | the `MutationGuard` mechanism works per-route, **but the generated registry is EMPTY** (`guardEntries: []`); guards are hand-wired in ~4–6 routes. **This is D0 in BUILD-ORDER.md** |

---

## 3. THE REGISTER — business modules, measured (2026-10-06)

| Module | Tables | Routes | UI pages | Tests (unit / integ) | Verdict | Notes |
|---|---|---|---|---|---|---|
| **B1 CRM** (`customers`) | **25** | **55** | 18 | 140 / 162 | **COMPLETE** | the most complete module in the platform |
| **B2 Sales** (`sales`) | **27** | **36** | 14 | 56 / 68 | **COMPLETE** | orders, quotes, invoices, returns, credit memos |
| **B3 Catalog** (`catalog`) | 12 | 13 | 9 | 14 / 60 | **COMPLETE** | — |
| **B4 Inventory / WMS** (`wms`) | 9 | 23 | 12 | 2 / 23 | **COMPLETE** | only 2 unit tests vs 23 integration — inner logic less unit-proven |
| **B7 HR / people** (`staff`) | 12 | 18 | 22 | in count / 30 | **BUILT-UNEVEN** | people, teams, leave, time tracking — **no payroll, no benefits** (may be deliberate) |
| **B8 Projects / PSA** (`planner`, staff time) | 2 | handlers | 3 | 6 / 7 | **BUILT-UNEVEN** | availability rules only; no project accounting / billing / rev-rec |
| **B9 BI / analytics** (`query_index`, `dashboards`) | see P10/P15 | — | **0** for dashboards | — | **BUILT-UNEVEN** | engine yes, **dashboard screens no** |
| **B10 Shipping** (`shipping_carriers`) | 3 | 8 | 1 | 14 / 17 | **BUILT-UNEVEN** | webhook-driven by design (POST-heavy); minimal UI |
| **B11 Payments** (`payment_gateways`) | 4 | 10 | 1 | 9 / 21 | **BUILT-UNEVEN** | gateway transactions + 2 workers; minimal UI |
| **B12 Currencies** (`currencies`) | 3 | 5 | 7 | 1 / 23 | **COMPLETE** | — |
| **B13 Email / messaging** (`messages`, `inbox_ops`, `communication_channels`) | 5 + 5 + 8 | 17 + 17 | 4 + 4 | 49+ / 38+ | **COMPLETE** | three modules, heavily integrated |
| **B14 Customer portal** (`portal`, `customer_accounts`) | 0 + 11 | 0 + many | 7 | 3 / 1 | **BUILT-UNEVEN** | real portal pages + a full `customer_accounts` module (11 tables), but `portal` itself has no api/data layer of its own (it is a front-end over the others) |

---

## 4. What is genuinely MISSING (not "thin" — absent)

The register above is mostly reassuring on the business side. The gaps that matter are these:

**M1 — Finance / accounting. ABSENT — confirmed by two routes.** No module (`ls modules/ | grep -iE
"financ|account|ledger|gl|invoice|bookkeep"` returns only `customer_accounts`, unrelated), and **no**
GL / journal / chart-of-accounts table anywhere (`grep tableName` for ledger/journal/account). The only
`ledger_events` table lives in `audit_logs` — it is an **audit** ledger, not accounting. `sales`
produces invoices and credit memos, but there is **no accounting module behind them**. For a business
platform this is the single biggest structural absence. *(Note: the platform may intend to integrate
rather than build this — that is an owner decision, not an assumption.)*

**M2 — Procurement / purchasing. ABSENT — confirmed by two routes.** No module (`ls modules/ | grep -iE
"procure|purchas|supplier|vendor"` → none). No suppliers, purchase orders, RFQs, goods-receipt. `wms`
moves stock; nothing *orders* it.

**M3 — The permissions catalogue (SD-1 / S2). ABSENT.** Permissions work, but there is **no catalogue of
permissions** and **no gate that forces the permissions question when a new data structure lands**. This
is the owner's "critical" standard and it is unbuilt.

**M4 — The generated guard registry (D0). SHELL — live defect.** See §2 P18.

**M5 — Dashboard / perspective screens. ABSENT.** Tables and APIs exist; the user-facing configuration
screens do not.

---

## 5. Build order for these modules

Rule the owner set: **earlier is better, but never at the cost of prerequisite order.** So the ordering
principle is: *a module is built when everything it depends on is COMPLETE — and not before.*

**TIER 0 — finish the skeleton's holes (before anything new).** These are not features; they are the
load-bearing walls the rest stands on. (Detail: [`BUILD-ORDER.md`](BUILD-ORDER.md).)
1. **P18 guard registry (D0)** — the live defect. Guards must actually run.
2. **P3 permissions catalogue + gate (D1/SD-1)** — force the permissions question on every change.
3. **P5 tiers/defaults as settings (item 1 / SD-3)** — settings, not code.
4. **P3 structural grammar (S11/S12, D2/D3)** — the structural-object permissions.

**TIER 1 — finish skeleton modules that are BUILT-UNEVEN and that others depend on.**
5. **P10 search gate coverage** — extend `aclFeatures` from 6 to all tables (blocks the AI data work).
6. **P13 i18n management surface** — thin API/UI; multi-language is an owner-named foundation.
7. **P15 dashboard/perspective screens** — users cannot see the system without them.
8. **P7 notification templates** — verify then complete.
9. **P12 API keys** — thin; complete the routes.

**TIER 2 — business modules, in dependency order.**
10. **M1 Finance / accounting** — *decision needed:* build or integrate. If build, it is the largest single
    workstream and comes before procurement. If integrate, it becomes a Tier-1 integration task instead.
11. **M2 Procurement** — depends on finance + catalog + wms (all COMPLETE).
12. **B7 HR payroll / B8 PSA accounting** — extend the partial people modules, if in scope.

**TIER 3 — depth and polish** on COMPLETE modules as real use demands.

**What is explicitly NOT to be started yet:** anything in Tier 2 before Tier 0/1 close. That is the
owner's whole point — do not stack on an unfinished foundation.

---

## 6. The thing the owner asked to be most careful about

> *"is it REALLY built exactly and completely as we need — because we cant compromise core architecture
> just because something already exist."*

**Measured example of exactly that trap, in this platform:** the guard engine (§2 P18). It *looks* built —
the interface exists, `runMutationGuards()` exists, guards exist in several modules. But the **generated
registry is empty**, so the central delivery does not work, and guards run only where someone wired them
by hand. **"It exists" was true; "it is built" was false.** That is the class of defect this register
exists to catch, and it was found only because a claim was measured from two routes instead of accepted.

**Standing rule adopted from this:** no module is marked COMPLETE in this register without the two-route
check, and any module showing a **0 in any layer column** is a candidate for the same trap until proven.

---

## 7. Corrections made during this audit (honesty log)

The audit was run by a sub-agent, then **re-measured by a second, independent route**. Two findings
disagreed and are reported rather than averaged:

1. **Test counts — the sub-agent was WRONG.** It reported "0 unit tests" for `audit_logs`, `attachments`,
   `configs`, `integrations`, `dictionaries`, `translations`, `perspectives`, `payment_gateways`,
   `shipping_carriers`. Direct counting shows **15, 21, 5, 12, 11, 13, 7, 9, 14** unit test files
   respectively — every one of those modules has unit tests. **The `__tests__/empty` directories the
   sub-agent saw are empty sub-folders, not absent tests.** The corrected counts are used throughout §2–3.

2. **`widgets` is not a module.** It contains exactly **one file** (`widgets/lib/injection.ts`, a
   re-export). Confirmed by both routes. It must not be counted as a built feature.

3. **Structural facts confirmed by both routes:** the tables, route counts and UI-page counts in §2–3 were
   each re-checked independently and agree (including the *zero-UI* claim for `perspectives`,
   `dashboards`, `progress`, `sync_excel`, and the **empty** `guardEntries` registry).

4. **Caveat that stands:** no test suite was executed in this audit. Verdicts are structural. A green
   build + test run is still required before trusting any COMPLETE verdict as "verified working".
