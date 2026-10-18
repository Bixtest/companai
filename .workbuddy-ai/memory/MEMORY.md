# Project memory — Companai / open-mercato

> Detail → `JOURNAL.md` + daily logs. Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a re-measured number that changed gets its fix committed *by name*.**
- **No code before a written requirement.** Hermes is never forked.
- **DONOR RE-READ on every `SR-*`** (§4.1): open the donor SOURCE at the cited line, not the digest; HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES.
- **GLYPHS**: ✅ code fully done; 🟡 partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: (1) done, (2) its `CC-nn`, (3) next; update §2, run the checklist checker.
- **QUESTIONS: the 14-year-old test** (`WORKING-RULES.md` NOTE) — one example, no jargon, **ONE per turn**; if a default exists, take it.

## HAZARDS
- Pure LF, no BOM. **Never `git add -A`** — explicit paths.
- **A checker is not a control until something calls it** (`CC-101`).
- **A newline inside a table row splits it.**
- Run suites on node24 (`.toolchain/node24/node.exe`), not node22.
- **A green claim over a subset is false.** Package = 135 suites / 1,996 tests.

## FRONTIER (2026-10-18, last)
**The agent spine is the work.** `PLAN-2026-10-18-one-agent.md` + `CC-121`…`CC-127`.
**★ THE PLATFORM IS AN ARCHITECTURE, NOT A VERTICAL.** The school-management system is a tenant-shaped app on top of it. **Never explain a design decision with a business example** — use a structural one, or it reads as a feature request and becomes unanswerable.
**★ THE MODEL (owner's): a TYPE IS A ROLE FOR AGENTS** — a named, data-defined bundle of capabilities. Chain: platform ceiling → type → instance → binding, each a **subset** above. An instance **pins its type version**. A type bundles capabilities; it must **never select the permission rule**. **Types have two layers** (platform-shipped, or tenant-created); **an agent is always inside a tenant**.
**★ "Intersection of permissions" is unsound as LISTS** — `*`, `.own`, superadmin short-circuit, denials-after, delegations-after. Intersect **decisions** via `invokerCeilingFor`, reached only via `decideFor`; the HTTP RBAC path passes no invoker (`tool-authority.ts:100-102`).
**★ `CC-124` FAIL-OPEN, startable now:** a denial written `ai_worker:<id>` — the encoding the entity documents — never matches; `blocking()` uses the bare id.
**RULINGS:** D2 default (live, never frozen) · D4 answered (departure **flow**, default deactivate-never-delete) · D1 in principle (ceiling is **configuration**; only the **floor** left, `CC-125`) · **D3 VOID — my misreading of "types" as "agents"**; it surfaced `CC-126`: the type catalogue has **only a code layer**, so a tenant can override a type but not create one.
**NEXT:** `CC-124`, then `CC-126`, `CC-127`; then `CC-121` behind `CC-119`. Register **64 closed · 62 open · 126**.
