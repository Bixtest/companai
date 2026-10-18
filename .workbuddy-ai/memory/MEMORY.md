# Project memory — Companai / open-mercato

> Detail → `JOURNAL.md` + daily logs. Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, commit the fix *by name*.**
- **No code before a written requirement.** Hermes is never forked or edited. Markdown is the truth.
- **DONOR RE-READ on every `SR-*`** (`00-PIN-AND-METHOD.md` §4.1): plan → open the donor SOURCE at the cited line, not the digest → HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES. A gate is only as good as what can EXIST in the state it checks.
- **GLYPHS**: ✅ code fully done; 🟡 partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: (1) done, (2) its `CC-nn`, (3) next; update §2, run `node scripts/check-master-checklist.mjs`.
- **ONE DOCUMENT**: `MASTER-CHECKLIST.md`; its `.html` twin was retired — never recreate it.

## HAZARDS
- Pure LF, no BOM. **Never `git add -A`** — explicit paths.
- `check-master-checklist.mjs` + `derive-counts.mjs` are **not in CI** (`CC-101`). **A checker is not a control until something calls it.**
- A bare-word grep is not a census (`^\s*capability\s*:`); **a newline inside a table row splits it**.
- Run suites with `workspace/.toolchain/node24/node.exe` + `node_modules/jest/bin/jest.js` — node 22 silently loses suites.
- **A green claim over a subset is false.** Package = 135 suites / 1,996 tests.

## FRONTIER (2026-10-18, late)
**The agent spine is the work.** `PLAN-2026-10-18-one-agent.md` + `CC-121`…`CC-127`. Verdict: **one agent core is right; "type" must not be a setting** — a field that selects the permission algorithm is the confused-deputy shape. Type = a name for **identity · standing · placement**, set at hire; every setting may only **narrow**.
**★ "Intersection of permissions" is unsound as LISTS** — `*`, `.own`, superadmin short-circuit, denials-after, delegations-after. Intersect **decisions** via `invokerCeilingFor`, reached only via `decideFor`; the HTTP RBAC path passes no invoker (`tool-authority.ts:100-102`) and `refusalFor` is null unless mode=`enforce` (armed for no tenant, `CC-11`).
**★ `CC-124` is FAIL-OPEN, startable now:** a denial written `ai_worker:<id>` — the encoding the entity documents — never matches; `blocking()` uses the bare id and the route does not normalise.
**Measured:** agents are **code-declared, never hired**; **the actor's authority hangs off its credential** (rotation un-hires it); **per-user homes refused** → per-tenant home + per-user state; **"platform level" has no schema home**.
**BLOCKING = D1–D4 (owner):** the cap on a Staiff (`SR-18` vs the owner's model) · live vs frozen Aissistant authority (recommend live) · what platform-level owns · owner departure.
**NEXT:** `CC-124`, then D1–D4, then `CC-121` behind `CC-119`, then the chokepoint. Register **64 closed · 62 open · 126**.
