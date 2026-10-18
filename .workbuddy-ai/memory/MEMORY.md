# Project memory — Companai / open-mercato

> Detail → `JOURNAL.md` + daily logs. Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a re-measured number that changed gets its fix committed *by name*.**
- **No code before a written requirement.** Hermes is never forked.
- **DONOR RE-READ on every `SR-*`** (§4.1): open the donor SOURCE at the cited line, not the digest; HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES.
- **GLYPHS**: ✅ code fully done; 🟡 partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: (1) done, (2) its `CC-nn`, (3) next; update §2, run the checker.
- **QUESTIONS: the 14-year-old test** (`WORKING-RULES.md` NOTE) — one example, no jargon, **ONE per turn**; if a default exists, take it.

## HAZARDS
- Pure LF, no BOM. **Never `git add -A`** — explicit paths.
- **A checker is not a control until something calls it** (`CC-101`).
- **A newline inside a table row splits it.**
- Suites run on node24 (`.toolchain/node24/node.exe`), not node22. **A green claim over a subset is false** (135 suites / 1,996 tests).

## FRONTIER (2026-10-18)
**The agent spine is the work:** `PLAN-2026-10-18-one-agent.md`, `CC-121`…`CC-128`.
**★ THE PLATFORM IS AN ARCHITECTURE, NOT A VERTICAL.** Never explain a design decision with a business example — use a structural one.
**★ A TYPE IS A ROLE FOR AGENTS**: a data-defined capability bundle. Chain platform ceiling → type → instance → binding, each a **subset** above; an instance **pins its type version**; a type never picks the permission rule. **Two layers** (platform, tenant); **an agent is always inside a tenant**.
**★ NO PLATFORM CEILING OVER TENANTS (`CC-128`, plan §4.6, owner-found):** no plan/feature/limit table exists, so D1's "platform sets the ceiling" has no column; `UserAcl`/`RoleAcl` tenant is `NOT NULL` yet `isGlobalSuperAdmin` filters no tenant and `loadAcl` returns `['*']` before scope → **one tenant's superadmin is every tenant's**, entered by cookie, mintable from inside. Owner's direction: **instance 1 / foundational tenant**, others inherit or are limited to it; "change platform architecture" is **platform level**. Decide foundation-vs-above **before** `CC-125`.
**★ "Intersection of permissions" is unsound as LISTS** — `*`, `.own`, superadmin, denials-after, delegations-after. Intersect **decisions** via `invokerCeilingFor`, reached only via `decideFor`.
**RULINGS:** D2 default (live, never frozen) · D4 answered (departure **flow**, deactivate-never-delete) · D1 in principle (ceiling = **configuration**; only the **floor** left, `CC-125`) · D3 VOID — my misreading of "types" as "agents"; surfaced `CC-126`.
**NEXT:** `CC-124` → `CC-126` → `CC-127` → `CC-121` (behind `CC-119`). Register **64 closed · 63 open · 127**.
