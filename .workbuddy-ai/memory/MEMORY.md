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

## FRONTIER (2026-10-18)
**The agent spine:** `PLAN-2026-10-18-one-agent.md`, `CC-121`…`CC-128`. **★ THE PLATFORM IS AN ARCHITECTURE, NOT A VERTICAL** — no business examples.
**★ A TYPE IS A ROLE FOR AGENTS**: a data-defined capability bundle; chain ceiling → type → instance → binding, each a **subset** above; an instance **pins its type version**. **Two layers** (platform, tenant); **an agent is always inside a tenant**.
**★ NO PLATFORM CEILING OVER TENANTS (`CC-128`, plan §4.6, owner-found):** no plan/feature/limit table exists, so D1's ceiling has no column; `isGlobalSuperAdmin` filters no tenant and `loadAcl` returns `['*']` before scope → **one tenant's superadmin is every tenant's** (cookie entry, mintable from inside). Owner: **instance 1 / foundational tenant**; "change platform architecture" is **platform level**. Decide before `CC-125`.
**★ THE BARE-ID CONVENTION (`CC-124`/`CC-129`, closed):** a principal is a **bare id, kind in a sibling column**. Two directions: `CC-124` wrote a **prefixed** denial the bare read never applied (**fail-open**); `CC-129` could not read a machine's evidence (**fail-closed**, unreported). **`normalizePrincipalSubject`**: agreeing prefix → bare · **disagreeing prefix + kind → THROW** · bare + any kind → accepted.
**RULINGS:** D2 live · D4 departure **flow** · D1 ceiling = **configuration** (only the **floor** left, `CC-125`) · D3 VOID.
**NEXT:** `CC-126` → `CC-127` → `CC-121` (behind `CC-119`). Register **67 · 63 · 130**.
