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
- **A mutation whose target text has moved reports GREEN — "DID NOT APPLY" is not a pass.** Re-aim it at
  the text as it stands (`M8`, 2026-10-19: `**80**` had become `49`). Same family as `CC-101`.
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
**The spine:** `PLAN-2026-10-18-one-agent.md`, W1–W8. **Register 79 · 60 · 139.** Checkers PASS
(`check-master-checklist.mjs` + its 14/14-RED mutation suite).
**★ THE PLATFORM IS AN ARCHITECTURE, NOT A VERTICAL.** **A type is a role for agents**; chain ceiling →
type → instance → binding, each a subset above; an agent is always inside a tenant.

**CLOSED, in order:** `CC-123` (the authority intersection — the web door now carries the person a
credential acts for; *holding* needs no descriptor, *gating* does) · `CC-125` (**the floor** — 7 ids
behind the owner's 5 categories, **code not config** because a machine that could reach the ceiling
table could raise its own; binds `ai_worker`/`service`/`system`, never `human`) · `CC-126` (tenant type
catalogue) · `CC-127` (departure flow) · `CC-128` (**the ceiling** — `tenants.is_foundational` +
`tenant_capability_ceilings`, enforced as a **third input to the resolver**, never a filter;
`featureMatch.ts:25-43` forbids list intersection) · `CC-132` (the coverage guard was wrong in **both**
directions; now `160/160 across 34 modules — 149 in this environment`, 39 descriptors) · `CC-134`
(**the superadmin read** — now scoped to the **foundational** tenant in both halves, fail-closed with
no foundation; **★ the blast radius's lesson: scoping the shortcut would have DEMOTED a tenant's own
admin**, because `['*']` was arriving as a side effect of the bug — the wildcard belongs to the
position, not the row. **7 new tests passed while that was broken; the OLD suite caught it.** L188) ·
`CC-135` (**the ceiling's door, 2026-10-19** — `GET`/`PUT /api/auth/capability-ceiling[/tenant/:id]`
behind `directory.tenants.manage`, recording `derivePrincipal(auth)`; **★ two defects the row's own FIX
line did not name**: (1) **`is_foundational` had NO WRITER** — one reader, nothing set it, so
`CC-134`'s fail-closed branch was the only branch and the platform scope would have been unreachable →
`mercato auth set-foundation [--tenant|--clear]` + `setup` designates what it creates, and that command
is **`invalidateAllCache()`'s only caller**; (2) **the capability is not the reach** — every tenant
superadmin holds it through `*` and a tenant with no rows inherits the platform's, so one gate would have
handed every tenant admin the **platform** ceiling → the route asks **two** questions, and
self-narrowing is allowed because `CC-128` already refuses a non-subset. **★ `crossTenant` was wrong
for the platform scope** (a platform act was recorded as cross-tenant) — unreachable before because the
CLI always acted from `null`. L189: **an import from the wrong module is `undefined`, and the test that
passes because of it is the NEGATIVE one**) · `CC-136` (**a platform act is a platform act, 2026-10-19** —
`SYSTEM_SUBJECT_PREFIX` + `systemSubject()`, the `system:` branch **first** in `parseSubject`, the
`isSystem` arm in `derivePrincipal`, the `system` arm in `normalizePrincipalSubject`, and the two template
producers switched to the builder; **★ the row was wrong twice**: (1) *"past both the floor and the
ceiling"* — the ceiling is resolved **by tenant**, so it was a **floor** hole only; (2) *"a parser edit"*
— **`derivePrincipal` re-derives the kind from two booleans whose fall-through is `human`**, so a
parser-only fix would have left every consumer of `auth.principal` calling a platform act a person.
**No data to migrate:** `action_logs.actor_user_id` is **`uuid`**, so `system:…` was never storable.
L190: **two functions can produce one fact; teaching only the one a row names leaves the other
reporting the old answer**) · `CC-137` (**one capability means one door, 2026-10-19** — the users route
was a fifth way onto the authority system: gated by `auth.users.create/edit`, `roles` array checked only
by a **subset** rule whose first line is `if (actorAcl.isSuperAdmin) return`. **★ the finding: the floor
ALREADY named `auth.roles.manage` and this route never asked it** (`CC-101`'s class one layer down) — so
the fix is **two halves, not alternatives**: the route asks for the capability (**makes the existing
answer reachable**) + the two user ids join `MACHINE_FLOOR` (**7 → 9**, refuses at the route's own gate).
Empty `roles` needs no capability (narrowing is not widening). L191: **a check that exempts the most
powerful actor protects everyone except the one who can do the most harm**) · `CC-139` (**the ceiling's
screen, 2026-10-19** — `backend/settings/capability-ceiling/` + a read-only
`api/capability-ceiling/catalogue/route.ts`. **★ the row did not ask which door reads the tree**: the
tree's endpoint is gated by `auth.acl.manage`, the ceiling by `directory.tenants.manage`, the dispatcher
is all-of and there is **no any-of form anywhere** — and the wildcard must not be relied on to arrive
(`CC-134`), so a **separate catalogue route gated like the ceiling** (setting > seeing, and
`/api/auth/features` appends tenant-scoped entity features a platform ceiling must not contain).
**★ a guard met the build**: two suites scan backend screens for mutating calls without an
expected-version header, allowlist deliberately empty; the ceiling is a **set of rows** so no header means
anything → inline exemption → **the exemption's reason became `CC-140`** (no concurrency token).
L192: **an exemption's reason is a defect, and a comment is where defects go to be forgotten**) ·
`CC-140` (**the ceiling write refuses a stale view, 2026-10-19** — `ceilingRevision()` = the fingerprint of
the **set** (FNV-1a over the sorted, length-escaped list, count alongside); the read returns it, the write
takes an optional `expectedRevision` and answers **409** (not 400: the request was right, the *view* was
wrong) when it differs from what the table holds **now**. **★ it is NOT a lock** — the compare→write window
is milliseconds, a real one is `SELECT … FOR UPDATE`; that is written in code, plan and row. The screen
sends the token and a 409 **reloads first, then speaks** (the reload clears the messages). L193: **a fix
that reloads wipes its own message** — the new test caught it in the new code).

**★ OPEN, and the order is now fixed:**
- **`CC-92` Slot 0** — **11 spine findings left** (`T-27` and `T-35` built 2026-10-19): `T-04`, `T-05`, `T-06`, `T-07`,
  `T-08`, `T-15`, `T-16`, `T-17`, `T-28`, `T-30`, `T-33`, `T-35`. Startable.
  `PREVIEW-AUDIT-TRIAGE.md` §6 = checklist §9.4. **The audit's wording is a claim, not a measurement** —
  `T-27`'s own sentence was half wrong (`C-08`/`C-09`); measure each row from source before building it.
- **`CC-138`** — no route declares human-only/machine-only; rides `W3`.
- **`CC-133`** — option B (platform above tenants). Deferred by the owner's trigger.

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
