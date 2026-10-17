# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`; pre-2026-10-12: `extended_deep_memory.md`.

## ARCHITECTURE WORKSHOP — `library/architecture/`
Study platforms ONE AT A TIME against the three poles + escape hatch; map every pole across ALL platforms vs mercato → a clean SRS; then build one-tenant ↔ one-Hermes. **No development before a written requirement. Hermes is NOT forked or edited. Markdown is the source of truth.** **MAPPING FRAME (owner 2026-10-16): NOT limited by what mercato allows** — engineer the best version per pole.
**Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**

## STANDING FORMAT — every turn MUST state (owner, 2026-10-16)
**(1) what was done, (2) its `CC-nn` address in `MASTER-CHECKLIST.html`, (3) what is next** — and update the HTML's `FRONTIER` array (LAST DONE + NEXT); the `.md` twin's §2 mirrors it. Syntax-check a script edit: extract `<script>`, `node --check` it.

## Standing hazards
- **MASTER-CHECKLIST.html is DATA-DRIVEN** — content lives in the JS arrays (`PHASES`…`SRSREG`); edit an array entry, never the markup. The `.md` twin is hand-synced — the two DO drift.
- Pure LF, never CRLF; never a BOM.
- **A bare-word grep is NOT a declaration census** — use `^\s*capability\s*:`. Git-Bash `grep -c` on CR LIES; byte truth is `tr -cd '\r' < f | wc -c`. **Never `git add -A`** — explicit paths.

## Live code frontier (`JOURNAL.md`)
**LAST DONE = the tooling set COMPLETE 2026-10-17 `CC-91` closed** — `SR-38` (digital-twin harness) + `SR-46` (two-reads lint), the last two of four slices; `SR-39`+`SR-41` landed 2026-10-16. Commits: code `fa0f0b73` (shared lexer `scripts/lib/strip-code.mjs` extracted from `check-declared-controls.mjs`), `8606b8ff` (`SR-38`), `602e058c` (`SR-46`); docs `b31ec5f`. Register: **55 closed · 42 open · 97 total**.
- **`SR-38`**: twins in `packages/core/src/testing/digital-twin/authority.ts` (each `satisfies` a REAL type imported from its owner) + `scripts/check-digital-twins.mjs` (six wiring checks). **The split: the check guards COMPLETENESS, `tsc` guards CORRECTNESS.** A `satisfies` checks SHAPE not VALUES — so a semantic test pins each value (`record-lock-ceiling.twin.test.ts`; proven by flipping `locked` to `'A1'`, which still compiles but reddens exactly that test). 10/10 tests, 7/7 mutations.
- **`SR-46`**: `scripts/check-two-reads.mjs` — **file scope, NOT block scope, rejected WITH the number** (355 of 4,823 files strip to unbalanced braces, mostly `.tsx`/JSX). Trap = a write is not a read; precision = a read in a string/comment is not a read. Measured 4,823 files / 89 findings in 46 files. 8/8 tests, 5/5 mutations. **Its home was corrected by name** from the ESLint surface (runs only on backend-UI files) to the `scripts/check-*.mjs` family.
- **★ Rule-13 correction:** `workspace/.toolchain/node24` was recorded ABSENT — measured **PRESENT at v24.19.0**.
**▶ NEXT = identity (`SR-02` + `SR-07`) → `SR-12`** (per-tenant engine home, the fix for open `CC-84`: a Hermes turn runs platform tools as ONE superadmin identity, outside the chat's tenant) **→ `P2-9b`.** The urgent set (both CRITICALs, `T-32`, `T-45`, the two compose defects) is clear.
Owner decided: **core architecture first — business modules generated from the core workspace.**
