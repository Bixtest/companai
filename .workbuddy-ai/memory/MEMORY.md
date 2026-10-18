# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; older: `extended_deep_memory.md`. Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**
- **Architecture workshop**: one platform at a time vs the three poles + escape hatch → SRS → one-tenant ↔ one-Hermes. No code before a written requirement; Hermes never forked; markdown is truth.
- **DONOR RE-READ, mandatory on every `SR-*`** (`00-PIN-AND-METHOD.md` §4.1): plan → open the donor SOURCE at the cited line, never the digest → HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES. A gate is only as good as what can EXIST in the state it checks.
- **GLYPHS**: ✅ = the code is fully done; 🟡 = partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: each turn states (1) done, (2) its `CC-nn`, (3) next; update §2 of `MASTER-CHECKLIST.md` (short) and run `node scripts/check-master-checklist.mjs`.
- **ONE DOCUMENT**: `MASTER-CHECKLIST.md` is the truth; the `.html` twin was retired — never recreate it.

## HAZARDS
- Pure LF, never CRLF, never BOM. **Never `git add -A`** — explicit paths.
- `check-master-checklist.mjs` + `derive-counts.mjs` re-derive the typed counts but **are not wired into CI** (`CC-101`). **A checker is not a control until something calls it.**
- A bare-word grep is not a census (`^\s*capability\s*:`); CR truth is `tr -cd '\r' | wc -c`; **a newline inside a table row splits it** (the checker sees the pipe count).
- **Run suites with `workspace/.toolchain/node24/node.exe` via `node_modules/jest/bin/jest.js`. Under node 22 two suites fail to LOAD and 109 tests never run.
- **A green claim over a subset is false.** "105/1,553" was a subset; the package is 135 / 1,996.

## FRONTIER (2026-10-18)
`CC-107` ✅ closed (a bot is a participant: schema, two-axis predicate, revoke, POST body, read half proven, 4 mutations RED). **`CC-120` HALF done:** the bridge already existed (`resolveAgentBinding` → `findBinding(api-key id, agent id)`); its bound arm now reports `agentAxis` (the agent for a bound `ai_worker`, `null` for a human). **The chat-route wiring was REVERTED as inert** — those contexts feed `createOrGet`/`appendMessage`, both owner-only and axis-blind; the only readers (`loadParticipantFlag` via `getById`, `list`) have NO machine-facing route. **NEXT = a ruling on the surface** (requirement at `PLAN-CC-120` §7.1): the axis must be a SET (`ctx.agentIds`), minimal consumer = the transcript route; it expands what a machine can read over HTTP. **Never derive an identity from the request target** — authorisation by parameter.
**NEXT = `CC-120` surface ruling**, then `SR-12`; `CC-104`/`CC-106` unblocked. **★ DUPLICATE INDEX** `active_conv_user_idx` ≡ `tenant_org_user_conv_idx` → `CC-119`. 135 / 1,996, `tsc` 0.
