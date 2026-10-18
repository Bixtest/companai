# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; older: `extended_deep_memory.md`. Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**
- **Architecture workshop** (`library/architecture/`): one platform at a time vs the three poles + escape hatch → map every pole vs mercato → SRS → one-tenant ↔ one-Hermes. No code before a written requirement; Hermes is never forked; markdown is the truth. mercato is not the limit.
- **DONOR RE-READ, mandatory on every `SR-*`** (`00-PIN-AND-METHOD.md` §4.1): plan → open the donor SOURCE at the cited line, never the digest → HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES. A gate is only as good as what can EXIST in the state it checks.
- **GLYPHS**: ✅ = the code is fully done; 🟡 = partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: each turn states (1) done, (2) its `CC-nn`, (3) next; update §2 of `MASTER-CHECKLIST.md` (short) and run `node scripts/check-master-checklist.mjs`.
- **ONE DOCUMENT**: `MASTER-CHECKLIST.md` is the truth; the `.html` twin was retired — never recreate it.

## HAZARDS
- Pure LF, never CRLF, never BOM. **Never `git add -A`** — explicit paths.
- `check-master-checklist.mjs` and `derive-counts.mjs` re-derive the typed counts (mutation-proven) but **not wired into CI** (`CC-101`). **A checker is not a control until something calls it.**
- A bare-word grep is not a census (`^\s*capability\s*:`); CR truth is `tr -cd '\r' | wc -c`; **a newline inside a table row splits it** (the checker sees the pipe count).
- **Run suites with `workspace/.toolchain/node24/node.exe`**, inside the package, via `node_modules/jest/bin/jest.js`. Under node 22 two suites fail to LOAD and 109 tests never run.
- **A green claim measured over a subset is a false claim.** The "105 suites / 1,553" was a subset; the package is 135 suites / 1,989 tests (1,995 after `CC-107`).

## FRONTIER (2026-10-18)
`SR-07` / `CC-107` (a bot is a participant) — **✅ CLOSED**: schema, two-axis predicate, revoke route, POST body, **and the read half proven** (GET both axes; real-filter agent-caller tests; **4 mutations RED**). Package **135 suites / 1,995 tests, `tsc` 0.** **★ The tests found `CC-120`: `ctx.agentId` HAS NO PRODUCER** — no route builds a context carrying it, so the read path is proven and UNREACHABLE. Needs a ruling: credential→registry-id bridge (correct) vs addressed-agent (cheap, wrong). **A test green for the wrong reason is the defect to hunt** (the old `getById` test matched ANY `agentId` filter). Item 8 = a RULE (§10.9). **★ DUPLICATE INDEX** `active_conv_user_idx` ≡ `tenant_org_user_conv_idx` → `CC-119`.
**NEXT = `CC-120`'s ruling**, then `SR-12`; `CC-104`/`CC-106` unblocked.
