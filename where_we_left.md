# Where we left off

**Read this file first. It is the only status document you should trust.**

Written 2026-08-13, when work paused here to build a related product in a
separate codebase. Everything below was verified on the day it was written, not
recalled.

---

## 1. What this is, in one paragraph

**Companai** — an operating system where human and AI employees work under one
org model, one task model, and one authority system. **The differentiator is the
governance layer, not the AI**: every act is checked against a ceiling, and the
answer is always the *minimum* of everything that applies — nothing anywhere can
raise a gate. That property is the product. It is built and it works.

The codebase is a fork of **Open Mercato 0.6.7**, rebranded to Companai. The
governance layer (authority, approvals, delegations, denials, trust, projects,
record locks, the ledger) is ours and does not exist upstream.

---

## 2. Where things stand

The **Starting Kit** milestone is roughly 80% done: 21 items finished, 5 left.
The governance layer is complete and has screens. What remains is approval
workflow polish, a budget ceiling, and one large per-entity piece.

**Last verified state (2026-08-13):**

| | |
|---|---|
| Test gate | **22/22 packages, 12,924 tests, `Cached: 0`, exit 0** |
| Typecheck | **20/20, `Cached: 0`** |
| Boots | Yes — `next start`, admin reachable, zero server errors |
| Docs repo HEAD | `2f8e81c` on branch **`master`** |
| Code repo HEAD | `cf2d820` on branch **`main`** |

Both repos are **clean and committed**. Nothing is half-finished on disk.

---

## 3. What is left

### The Starting Kit — finish these and the milestone closes

- [ ] **22 — Bulk approval with a diff.** Approve many held acts at once. *The diff is the feature*: approving in bulk without seeing what differs between the acts is rubber-stamping, which is the thing the approval queue exists to prevent. **This is next.**
- [ ] **23 — Deputy cover and standing approvals.** So an approver going on holiday does not stop work, without handing over authority permanently.
- [ ] **15b — Budget as a ceiling.** Spend is metered today (item 15) but nothing bounds it. Needs a price table and a limit policy, then it plugs into the resolver like every other ceiling.
- [ ] **21c — A lock control on each record's own screen.** The tenant-wide list of frozen records exists; *setting* a lock is still API-only. Per-entity work across every entity — the largest item left.
- [ ] **24b — A screen for the two per-tenant authority settings.** `authority.enforcement` and `authority.pending_act_ttl_hours` are real settings whose only surface is the `module_configs` table.

### After the Starting Kit — deliberately deferred, not forgotten

- [ ] **20 — Deploy on a real Plesk VPS.** The guide exists; not one step has ever been run. Owner said "not now".
- [ ] **27 — Dashboard widgets of our own.** The admin start page is empty by design (see §6). A governance product should show acts awaiting approval, what ran recently and under whose authority, spend against budget.
- [ ] **25 — Ledger Tier 2, signed checkpoints.** A customer's-auditor feature. No customer yet.
- [ ] **26 — `domain_mappings` extraction.** Per-tenant custom domains. Nothing needs it.
- [ ] **29 — Integration control plane.** Researched and costed at 220–380 person-weeks. Not this milestone. Reasoning: `workspace/references/integration-research-verdict.md`.
- [ ] **11 — Native Arabic review.** Dropped from this milestone by the owner.

### Only the owner can close these

- [ ] **B — Drop `apps/docs`?** It is upstream's documentation *content*, not just their branding. Renaming it would ship somebody else's docs under our name. **Recommendation: drop it.**
- [ ] **C — A lawyer on the privacy and terms pages** before commercial use. They are honest and generic; fine for internal use now.

---

## 4. How to pick the work back up

Everything runs from `workspace/starting-kit/`. **Node 24 is mandatory** and is
project-local — every shell must prepend it, or you will get confusing failures:

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
```

| Task | Command | Notes |
|---|---|---|
| Install | `corepack yarn install` | Yarn 4.17.1 + Turbo |
| Regenerate registries | `corepack yarn generate` | After adding any module file |
| Typecheck | `corepack yarn typecheck --force` | **`--force` matters — see §5** |
| Full gate | `corepack yarn test --force` | ~14 min. Capture to a file, never pipe through `tail` |
| Build | `corepack yarn build` | Packages ~1 min, then the app ~5 min |
| Run | `corepack yarn start` | `next start` on :3000 |

**Postgres** must be running: `postgres://postgres:postgres@localhost:5432/open-mercato`.
There is no Redis in this setup.

**Admin login** is `admin@local.test` at `http://localhost:3000/backend`. The
owner holds the password and types it. **Never write it to a file and never type
it into a login form** — this was committed to and honoured throughout; do not
quietly relax it.

**Before anything risky:** `./workspace/scripts/checkpoint.sh <label>` backs up
the database and `.env` (not source — git has that).

---

## 5. Traps that will cost you hours

These are the ones that actually bit, not hypotheticals. Full list in
`LESSONS.md` (47 entries); these are the expensive ones.

**Turbo caches everything, including the things you use to check your work.**
`yarn typecheck` reported clean for 16 of 20 packages *from cache*, hiding a real
error for weeks. `yarn build:app` can be a cache hit serving stale code. **Always
read the `Cached:` line before believing a green result.** Use `--force` for the
verification you are about to make a claim about (L38, L45).

**The app serves `packages/*/dist`, and `next start` serves a frozen build.** A
source change is invisible until you rebuild *and* restart. Three separate times
this looked like a bug in the code.

**Awilix runs in CLASSIC injection mode.** The constructor parameter *name* is
the DI registration name. `asClass(Foo)` where a parameter is `moduleConfig` but
the registration is `moduleConfigService` injects `undefined` — silently, with
nothing going red, and the feature simply does nothing. Use
`asFunction(...).proxy()` and write a test that fails if the wiring is undone (L37).

**A wildcard ACL grant validates a permission that does not exist.** `admin`
holds `auth.*`, which matches `auth.trust.manage` — an invented name — exactly as
happily as a real one. So a typo in `requireFeatures` produces a page that loads,
renders and looks correctly gated *when tested as an administrator*, which is how
it will be tested. `require-features-declared.test.ts` now guards this (L46).

**Reading code tells you what it would do, not which state the system is in.**
The empty-dashboard bug produced three confident wrong diagnoses from reading,
and a four-minute diagnostic route answered it in one request. **If you are about
to say "the cause is X" and have not observed X, you are guessing** (L47).

**The roadmap has been wrong about what is already done — three times.** Items
were marked "not started" that were finished, and marked urgent on premises that
were false. **Verify against the code before starting any item** (L42).

---

## 6. Things that look broken and are not

**The admin dashboard is empty.** Deliberate. All ten of upstream's widgets read
sales orders, customers and deals; those modules are parked, so
`apps/mercato/src/modules.ts` disables the widgets rather than render ten red
"Failed to load" panels. The empty state now says so honestly. Fixing this
properly is item 27.

**Fourteen modules are parked, not deleted.** `sales`, `customers` and others are
switched off in `modules.ts`. `customers` in particular is upstream's CRUD
reference module and stays readable on purpose. See
`workspace/references/parked-modules.md`.

**The domain is `corprorate.com`.** The spelling is deliberate and owner-confirmed.
**Do not "fix" it.**

**`example` modules exist and are gated behind `OM_ENABLE_EXAMPLES`.** Kept as
working reference code, off by default.

---

## 7. How to work here

Nine standing rules govern this project. They are in `workspace/COOKBOOK.md` in
full; this is what they amount to.

1. **Never assume a decision the owner did not make.** A direction counts only
   when they were asked plainly and answered. If a better way exists, come back
   with a labelled **COUNTER-OPINION**. When the right answer is clear, just do
   it — consulting too much is its own failure.
2. **One roadmap.** Never a second view that competes with it.
3. **No bandages.** Production and security standards, or it goes on the list.
4. **Fix small risk-free things immediately** — but establish the size *before*
   deciding, not after.
5. **Checkpoint before risky work.**
6. **Capture know-how in `workspace/knowledge/`** every batch. It becomes the
   agent's brain.
7. **Found issues go on the roadmap**, in the same edit that discovers them.
8. **Use the waiting time.** While builds run, use the platform in the browser.
   Find, record, keep going — never derail the main task.
9. **Testing instructions are click-by-click**, with verified URLs and expected
   results. Say plainly when a change is invisible.

**Every batch ends with a commit in both repositories.** Stage explicitly — `git
add -A` swept 10,448 of the owner's unrelated files into a commit once.

---

## 8. Where everything else lives

| Question | File |
|---|---|
| How does the governance layer work? | `workspace/knowledge/authority-overview.md` — **start here** |
| How does one specific piece work? | `workspace/knowledge/` — 20 files, one per concept |
| What did we already do, and why? | `workspace/references/completed-work.md` |
| What is wrong with the forked platform? | `workspace/references/upstream-issues.md` (U1–U19) |
| What looks or reads badly? | `workspace/references/ux-findings.md` |
| What still shows the original product? | `workspace/references/whitelabel.md` |
| What did we learn the hard way? | `LESSONS.md` (L1–L47) |
| How did we get here? | `JOURNAL.md` (newest first) |
| How do I test a change by hand? | `workspace/references/how-to-test.md` |
| How do I deploy it? | `workspace/references/deployment.md` |
| What are the working rules, in full? | `workspace/COOKBOOK.md` |

---

## 9. What not to trust

**`workspace/PROGRESS.md` has three overlapping views of the same work** — a
phase-by-phase set of tables, a section called *"The finish line — a checklist"*,
and a newer one called *"The list"*. They accumulated across sessions and they do
not agree with each other. That is a real defect in the documentation and it is
mine.

**This file supersedes it for status.** Use PROGRESS.md only for the *reasoning*
behind an individual item, and believe §3 above over anything in it.

**First job on return, before any feature work:** collapse PROGRESS.md down to
one view, or delete it and let this file carry the plan. Do not add a fourth
checklist to it — that is how it got here.

Two more honest warnings about the record:

- **`upstream-issues.md` headings do not consistently say whether an issue was
  fixed.** Some say FIXED, some do not, and at least one entry with no marker was
  in fact resolved. Read the body, not the heading.
- **The item numbers are not a sequence.** They grew by insertion — 15b, 21b,
  21c, 24b — so a gap does not mean something is missing.

---

## 10. The single most useful thing to know

Every claim in this project should come with an observation attached, not an
argument. The work that held up was verified by *watching it happen* — loading
the page, breaking the test to see it fail, reading the database, reading the
`Cached:` line. The work that had to be retracted was reasoned from reading code.

That distinction is the whole difference between the parts of this codebase you
can trust and the parts that wasted a day.
