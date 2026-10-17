# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; pre-2026-10-12 and the long 2026-10-17 form: `extended_deep_memory.md` (pre-compaction MEMORY.md verbatim). Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**
- **Architecture workshop** (`library/architecture/`): one platform at a time vs the three poles + escape hatch → map every pole across all platforms vs mercato → SRS → one-tenant ↔ one-Hermes. No code before a written requirement; Hermes is never forked; markdown is the truth. Not limited by what mercato allows.
- **DONOR RE-READ, mandatory on every `SR-*`** (`00-PIN-AND-METHOD.md` §4.1): plan fully → open the donor SOURCE at the cited line, never the digest → HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES. A gate is only as good as what can EXIST in the state it checks.
- **GLYPHS**: ✅ = the code is fully done; 🟡 = partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: every turn states (1) done, (2) its `CC-nn`, (3) next; update `MASTER-CHECKLIST.md` §2 (short — history goes to `JOURNAL.md`) and run `node scripts/check-master-checklist.mjs`.
- **ONE DOCUMENT**: `MASTER-CHECKLIST.md` is the single source of truth; the `.html` twin was retired 2026-10-17 — never recreate it.

## HAZARDS
- Pure LF, never CRLF, never BOM. **Never `git add -A`** — explicit paths.
- `check-master-checklist.mjs` and `derive-counts.mjs` re-derive the typed counts (mutation-proven) but **are not wired into CI** (`CC-101`). **A checker is not a control until something calls it.**
- A bare-word grep is not a census (`^\s*capability\s*:`); CR truth is `tr -cd '\r' | wc -c`.
- **Run package suites with `workspace/.toolchain/node24/node.exe`**, from inside the package, via `node_modules/jest/bin/jest.js`. Under node 22 two suites fail to LOAD and 109 tests never run.
- **A green claim measured over a subset is a false claim.** The 2026-10-17 "105 suites / 1,553" was a subset; the package is 135 suites / 1,989 tests and RED.

## FRONTIER (2026-10-17)
`SR-07` / `CC-107` (a bot is a participant): increments 1–2 plus the POST-body gap at `8c56428e` are **built**, and its **docs pass is DONE** (plan §7b/§10.5/§10.6, checklist §2/§4/register, `JOURNAL.md`). What remains: **the package is RED** — 4 suites / 25 tests, neither cause from `8c56428e` (a stale index-order assertion from `6b78a0ac`; three chat-route `jest.mock` factories missing `requirePrincipal` from `e8ecde6d`) — then **two agent-axis test gaps** (GET serialisation; `canAccessConversation` with an agent caller), then **item 8, a RULE** (no participant pruning exists anywhere).
**NEXT = clear the red.** Then those two tests → `CC-104`/`CC-106` → `SR-12` → `P2-9b`; `CC-119` (DB rebuild) fires when identity closes.
