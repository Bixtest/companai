# Project memory — Companai / open-mercato

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a re-measured number that changed gets its fix committed *by name*.**
- **No code before a written requirement.** Hermes is never forked.
- **DONOR RE-READ on every `SR-*`** — full text `library/architecture/mapping/00-PIN-AND-METHOD.md` §4.1.
- **CHAIN RULE** — same file §4.2: who CREATES · CHECKS · CONSUMES · DELETES.
- **GLYPHS**: ✅ code fully done; 🟡 partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: (1) done, (2) its `CC-nn`, (3) next; update §2, run the checker.
- **QUESTIONS: the 14-year-old test** — one example, no jargon, ONE per turn; if a default exists, take it.

## HAZARDS
- Pure LF, no BOM. **Never `git add -A`** — explicit paths.
- **A checker is not a control until something calls it** (`CC-101`).
- **A newline OR an unescaped `|` inside a register row splits the table.** The checker catches both.
- Suites run on **node24** (`.toolchain/node24/node.exe`), not node22 (core 649/5,677 · shared 210/2,594 · auth 96/840).
- **A row's prescribed FIX can be wrong — re-measure it first.** Twice in one session: `CC-123`'s trigger had fired; `CC-129`'s reader half was a no-op.
- **Jest reads a positional suite arg as a REGEX** — `[key]` matches nothing, runs 0 tests, exits 0. Escape it (`\[key\]`); assert the denominator (`Test Suites: … N total`, the **last** number — the green-only format does not match a failing run). `LESSONS.md` L21.
- **Python `open(p,'w')` converts the WHOLE file to CRLF on Windows** — patch with `newline=''` or binary; verify with `b.count(b'\r')`, never `grep $'\r'`. `LESSONS.md` L22.
- **A mock that ignores its `where` cannot prove a filter** — `CC-127`'s mutation run survived three mutations because the fake `em` returned every row, and one fixture satisfied two clauses at once. Mocks apply the filters they are handed; fixtures make each clause load-bearing. `LESSONS.md` L23.
- **A register status the checker cannot read is a row it does not count** — a closed §5 row is `✅ closed` and **leaves §4**; `☑ done` there is invisible to the checker (it had undercounted `CC-126` for a day, with two errors cancelling). `LESSONS.md` L24.

## FRONTIER (2026-10-18)
**The agent spine:** `PLAN-2026-10-18-one-agent.md`, `CC-121`…`CC-128`. **★ THE PLATFORM IS AN ARCHITECTURE, NOT A VERTICAL** — no business examples.
**★ A TYPE IS A ROLE FOR AGENTS**: a data-defined capability bundle; chain ceiling → type → instance → binding, each a **subset** above; an instance **pins its type version**. **Two layers** (platform, tenant); **an agent is always inside a tenant**.
**★ NO PLATFORM CEILING OVER TENANTS (`CC-128`, plan §4.6, owner-found):** no plan/feature/limit table exists, so D1's ceiling has no column; `isGlobalSuperAdmin` filters no tenant and `loadAcl` returns `['*']` before scope → **one tenant's superadmin is every tenant's** (cookie entry, mintable from inside). Owner: **instance 1 / foundational tenant**; "change platform architecture" is **platform level**. Decide before `CC-125`.
**★ THE BARE-ID CONVENTION (`CC-124`/`CC-129`, closed):** a principal is a **bare id, kind in a sibling column**. Two directions: `CC-124` wrote a **prefixed** denial the bare read never applied (**fail-open**); `CC-129` could not read a machine's evidence (**fail-closed**, unreported). **`normalizePrincipalSubject`**: agreeing prefix → bare · **disagreeing prefix + kind → THROW** · bare + any kind → accepted.
**RULINGS:** D2 live · D4 departure **flow** · D1 ceiling = **configuration** (only the **floor** left, `CC-125`) · D3 VOID.
**★ THE TENANT TYPE CATALOGUE (`CC-126`, BUILD DONE, `e5cd823f`/`18e7712`):** `ai_agent_types` (`tenant_id NOT NULL` always — no platform row, the code registry *is* the platform layer), one plain unique over `(tenant, key)` covering **every** status (a retired key is never reusable), key in the `ai_agent_bindings.agent_id` dialect as a CHECK shipped **with** the table. **`lib/agent-type-catalog.ts` is the one home** for "the catalogue in tenant T": `resolveAgentCatalogEntry` returns `{definition, layer}` and **code-first precedence lives only there**. **The gate is HANDED its subject** (`checkAgentPolicy({agentId, agent})`); a handed subject whose id ≠ the asked id is refused. **A shadowed tenant row: the catalogue lists it flagged, a PICKER DROPS IT** (both key by agent id → duplicate). **Provenance is NOT derivable from a definition** — a tenant type carries `AGENT_TYPE_MODULE_ID='ai_assistant'`, also a real module id.
**★ DEPARTURE (`CC-127`, BUILD DONE, `242ae4c0`/`9b916a1`):** the row's danger was **already disarmed** — demotion invalidates the ACL cache in the same request (`commands/users.ts:650`), departure kills the credential twice (`user-deleted-revoke-keys.ts:70` + `shared/lib/auth/server.ts:284`), delegations are bounded by the grantor's own gate (`authorityEnforcementService.ts:443-465`, `:511`), and a binding's principal is an `api_keys` id. **The defect was that nobody was asked and nothing was recorded.** Built: `GET /api/ai/departures/[userId]` (both key links `session_user_id` **and** `created_by`; delegations both ways, kind checked beside the id) → `POST { decision }` default **deactivate** → `auth.users.delete` through the bus with the decision in **`metadata.context`** (no free-form field exists) → `revokeForPrincipals` **tenant-wide** + delegations both ways. **`leave` writes nothing and says the row is preserved AND inert.** `departure_partial` is the post-delete failure; its flag lives **outside** the try and is read **first** in the catch. 43 tests / 3 suites, 19/19 mutations, package 143/2,128, `tsc` 0.
**NEXT:** `CC-123` (both preconditions discharged) → `CC-121` (behind `CC-119`). Debts: per-agent manage routes code-only + `version` with no pinner (both `CC-122`), `ai_agent_types` migration joins `CC-119`, orphan sweep recorded in the departure plan §7. Register **69 · 61 · 130**.
