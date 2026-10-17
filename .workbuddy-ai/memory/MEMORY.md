# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; pre-2026-10-12 and the long 2026-10-17 form: `extended_deep_memory.md` (pre-compaction MEMORY.md verbatim). Docs `companai`; code `workspace/starting-kit`.

## RULES (owner)
- **Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**
- **Architecture workshop** (`library/architecture/`): one platform at a time vs the three poles + escape hatch → map every pole vs mercato → SRS → one-tenant ↔ one-Hermes. No code before a written requirement; Hermes is never forked; markdown is the truth. Not limited by what mercato allows.
- **DONOR RE-READ, mandatory on every `SR-*`** (`00-PIN-AND-METHOD.md` §4.1): plan fully → open the donor SOURCE at the cited line, never the digest → HARVEST what enriches, REFUSE the worse **by name**.
- **CHAIN RULE** (§4.2, `L180`): who CREATES · CHECKS · CONSUMES · DELETES. A gate is only as good as what can EXIST in the state it checks.
- **GLYPHS**: ✅ = the code is fully done; 🟡 = partly. **No remote = deployment state. No caller = defect.**
- **STANDING FORMAT**: every turn states (1) done, (2) its `CC-nn`, (3) next; update `MASTER-CHECKLIST.md` §2 (short — history goes to `JOURNAL.md`) and run `node scripts/check-master-checklist.mjs`.
- **ONE DOCUMENT**: `MASTER-CHECKLIST.md` is the single source of truth; the `.html` twin was retired — never recreate it.

## HAZARDS
- Pure LF, never CRLF, never BOM. **Never `git add -A`** — explicit paths.
- `check-master-checklist.mjs` and `derive-counts.mjs` re-derive the typed counts (mutation-proven) but **are not wired into CI** (`CC-101`). **A checker is not a control until something calls it.**
- A bare-word grep is not a census (`^\s*capability\s*:`); CR truth is `tr -cd '\r' | wc -c`.
- **Run package suites with `workspace/.toolchain/node24/node.exe`**, from inside the package, via `node_modules/jest/bin/jest.js`. Under node 22 two suites fail to LOAD and 109 tests never run.
- **A green claim measured over a subset is a false claim.** The 2026-10-17 "105 suites / 1,553" was a subset; the package is 135 suites / 1,989 tests.

## FRONTIER (2026-10-17)
`SR-07` / `CC-107` (a bot is a participant): increments 1–2 plus the POST-body gap at `8c56428e` are **built**, its **docs pass is DONE** (plan §7b/§10.5–§10.7, checklist §2/§4, `JOURNAL.md`), and **the package is GREEN — 135 suites / 1,989 tests, `tsc` 0.** What remains: **two agent-axis test gaps** (GET serialisation; `canAccessConversation` with an agent caller) and **item 8, a RULE** (no participant pruning exists anywhere). **★ A DUPLICATE INDEX surfaced while clearing the red:** `active_conv_user_idx` is identical to `tenant_org_user_conv_idx` (same columns/predicate, both non-unique) — scheduled with `CC-119`. **A stale assertion is evidence, not noise.**
**NEXT = the two agent-axis tests**, then `CC-104`/`CC-106` → `SR-12` → `P2-9b`; `CC-119` follows.
