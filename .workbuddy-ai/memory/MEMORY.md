# Project memory — Companai / open-mercato

**Rewritten 2026-10-19 (evening), deliberately shorter.** It had grown to 15.7 KB, and the
session-start injection truncates it — cutting off the *tail*, which is the part that says where we
are. History lives in `JOURNAL.md` and the `PLAN-*` files; this file keeps rules, hazards and the
live position only.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a re-measured number that changed gets its fix committed *by name*.**
- **No code before a written requirement.** Hermes is never forked.
- **DONOR RE-READ on every `SR-*`** — `library/architecture/mapping/00-PIN-AND-METHOD.md` §4.1.
- **CHAIN RULE** — same file §4.2: who CREATES · CHECKS · CONSUMES · DELETES.
- **GLYPHS**: ✅ code fully done; 🟡 partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: (1) what is exactly done, (2) its address in the checklist, (3) what is next —
  and update the **top section** to match. **The HTML twin was retired (`3970769`); the address is
  `MASTER-CHECKLIST.md` §2 (frontier) and §5 (the row).**
- **THE FIVE-SLOT SHAPE** (`WORKING-RULES.md` §2.0, owner 2026-10-19): what changed · why it matters ·
  how I checked · waiting on you · next. **No identifiers in slots 1–2.** If slot 2 needs a mechanism
  word, the consequence has not been decided yet.
- **QUESTIONS: the 14-year-old test** — one example, no jargon, ONE per turn; if a default exists, take it.
- **Commits are mine to manage** (owner, 2026-10-19). Commit when it is the right time — both repos,
  explicit paths.

## HAZARDS
- Pure LF, no BOM. **Never `git add -A`** — explicit paths, in both repos.
- **A checker is not a control until something calls it** (`CC-101`).
- **A newline OR an unescaped `|` inside a register row splits the table.** The checker catches both.
- **§4's state cell reads exactly four strings** — `startable now` · `startable, needs a live DB` ·
  `needs you` · `blocked on its trigger`. **Anything else is a row it does not count** (L24 — and it
  recurred on 2026-10-19 with `scheduled — Slot 0 startable now`; the checker caught it).
- Suites run on **node24** (`workspace/.toolchain/node24/node.exe`). Jest needs the **package** dir and
  its `jest.config.cjs`, not the repo root.
- **A suite that deletes >50 files in one turn fails to RUN under this harness** —
  `[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] count:59 threshold:50`. The harness, not the code
  and not `EBUSY` (that was `CC-19`'s wrong mechanism). Prove with `CODEBUDDY_SAFE_DELETE_ENABLED=0`.
- **A row's prescribed FIX can be wrong — re-measure it first** (`CC-123`, `CC-129`, `CC-125`'s "nine").
- **Jest reads a positional suite arg as a REGEX** — escape `\[key\]`; assert the denominator (L21).
- **Python `open(p,'w')` converts the whole file to CRLF on Windows** (L22).
- **A mock that ignores its `where` cannot prove a filter** (L23).
- **`git checkout --` is not a restore while work is uncommitted** — capture a checksum and restore by
  copy (L187).
- **A test that spells its own input tests a string, not the code** — build subjects through the real
  encoders (L186).
- **`default: false` in an entity decorator does not make the property optional** — `[OptionalProps]`
  must say so (L185).

## FRONTIER (2026-10-19)
**The spine:** `PLAN-2026-10-18-one-agent.md`, W1–W8. **Register 73 · 64 · 137.** Checkers PASS.
**★ THE PLATFORM IS AN ARCHITECTURE, NOT A VERTICAL.** **A type is a role for agents**; chain ceiling →
type → instance → binding, each a subset above; an agent is always inside a tenant.

**CLOSED, in order:** `CC-123` (the authority intersection — the web door now carries the person a
credential acts for; *holding* needs no descriptor, *gating* does) · `CC-125` (**the floor** — 7 ids
behind the owner's 5 categories, **code not config** because a machine that could reach the ceiling
table could raise its own; binds `ai_worker`/`service`/`system`, never `human`) · `CC-126` (tenant type
catalogue) · `CC-127` (departure flow) · `CC-128` (**the ceiling** — `tenants.is_foundational` +
`tenant_capability_ceilings`, enforced as a **third input to the resolver**, never a filter;
`featureMatch.ts:25-43` forbids list intersection) · `CC-132` (the coverage guard was wrong in **both**
directions; now `160/160 across 34 modules — 149 in this environment`, 39 descriptors).

**★ OPEN, and the order is now fixed:**
- **`CC-134`** — `isGlobalSuperAdmin` reads `UserAcl` with **no tenant filter**, so one tenant's
  superadmin is every tenant's. `CC-128` bounded the consequence, not the cause. **STARTABLE — next.**
- **`CC-135`** — the ceiling has no route/screen (CLI only, so its recorded actor is `system`).
- **`CC-136`** — `system:` is a principal kind with **no producer**; `parseSubject` calls it `human`,
  so a platform act passes both floor and ceiling. **NEEDS THE OWNER** (rec: teach the parser).
- **`CC-137`** — "granting roles" is reachable through `auth.users.edit`, which is **not on the floor**
  (`roles` arrays are only subset-checked). **NEEDS THE OWNER** (rec: (b) then (a)).
- **`CC-138`** — no route declares human-only/machine-only; `CC-125`'s **surface** half, previously
  recorded only inside the closed row. Rides `W3`.
- **`CC-133`** — option B (platform above tenants). Deferred by the owner's trigger; now also in
  `BACKLOG.md`'s deferred table.

**★ `CC-92` IS SCHEDULED (2026-10-19) — the preview backlog now has gates, not a queue.**
`PREVIEW-AUDIT-TRIAGE.md` §6 = `MASTER-CHECKLIST.md` §9.4. All **45** `T-*` findings placed: 8 closed ·
**Slot 0 = 13 before `CC-121` starts** · Slot 1 = 10 with `W3` · Slot 2 = 1 with `W5` · Slot 3 = 4 with
`W7` · Slot 4 = 3 with `W8` · Slot 5 = 2 with `P2-9b` · 4 deferred by name. **★ WHY SLOT 0 BEFORE W1:**
`CC-121` re-keys every `principal_id` through a gate that cannot see **7 modules' commands** (`T-07`,
re-measured: 15 have `commands/`, 8 declare a capability) and a scope helper that accepts a missing
identity (`T-27`). **The spine is repaired before it is re-keyed.** Two re-measurements: `T-36` is
closed by `CC-132`; `T-07` is 7, not 9.

**★ DEBTS NAMED, not prose:** `ai_agent_types` migration joins `CC-119`; per-agent manage routes
code-only + `version` with no pinner (`CC-122`); a tool requiring `customers.people.view` from a parked
module (`CC-132` plan §6); platform-ceiling changes are not hash-chained (tenant-less events are skipped).
