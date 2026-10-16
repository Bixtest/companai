# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`. Archive of pre-2026-10-12 work: `extended_deep_memory.md`.

## ARCHITECTURE WORKSHOP — `library/architecture/`
Study platforms ONE AT A TIME against the three poles (P1 assistant / P2 workspace / P3 automations), widgets/frontend + escape hatch; then map every pole across ALL platforms vs mercato → a clean SRS; then build one-tenant ↔ one-Hermes. **No development before a written requirement. Hermes is NOT forked or edited. Markdown is the source of truth.** **MAPPING FRAME (owner 2026-10-16): we are NOT limited by what mercato allows** — engineer the best/richest/most-integratable version per pole; ceiling = the target design.
**Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong — re-measure, and commit the fix *by name*.**

## STANDING FORMAT — every turn MUST state (owner, 2026-10-16)
**(1) what was done, (2) its address in `MASTER-CHECKLIST.html` (`CC-nn`), (3) what is next** — and update the HTML's `FRONTIER` array (LAST DONE + NEXT); the `.md` twin's §2 mirrors it. Syntax-check a script edit: extract `<script>` and `node --check` it.

## Standing hazards
- **MASTER-CHECKLIST.html is DATA-DRIVEN** — content lives in the JS arrays at the top of its `<script>` (`PHASES`…`SRSREG`); edit an array entry, never the markup. Hand-synced with the `.md` twin, so the two DO drift.
- Pure LF, never CRLF; never a BOM.
- **A bare-word grep is NOT a declaration census** — use `^\s*capability\s*:`. Git-Bash `grep -c` on CR LIES; byte truth is `tr -cd '\r' < f | wc -c`. **Never `git add -A`** — explicit paths.

## Live code frontier (`JOURNAL.md`)
**LAST DONE = the two CRITICALs ✅ BOTH BUILT 2026-10-17** — **T-01 `fa974bb1`**: the delegation route runs three checks before `grant` (grantor-holds — one more than the triage's fix sentence named; `delegable: false` refuses even a holder; self-delegation needs a ceiling). **T-02 `60a6714f`**: `authorizeEntityRead` gates `engine.query` in `business-ir-run.ts`, copied from the search module's `authorizeEntityAccess` (no cross-package dependency), fail-closed. **Proof standard: the decisive assertion is the write/read NEVER HAPPENED (grant/query never called); mutations run for real — 3 for T-01, 7 for T-02, each killing exactly its named test.** Pin *which* guard refused or overlapping guards hide a mutation. Register: **51 closed · 43 open · 94 total**; `CC-94`/`CC-95` added.
**▶ NEXT = T-32** — the one-character `UUID_PATTERN` fix (`[1-5]`→`[0-9a-f]`; a v7 id fails the match, so no lock lookup runs and a locked record is writable). **Then** T-13/T-14 (compose lines), tooling set (`SR-38`+`SR-46`) → identity (`SR-02`+`SR-07`) → `SR-12` (fix for open `CC-84`) → `P2-9b`.
Owner decided: **core architecture first — business modules generated from the core workspace.**
