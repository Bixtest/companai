# Project memory - Companai / open-mercato

> Detail -> daily logs + `JOURNAL.md`. New work: HERE + today's log.

## ARCHITECTURE WORKSHOP - `library/architecture/`
Study platforms ONE AT A TIME against the three poles (P1 assistant / P2 workspace / P3 automations),
widgets/frontend + escape hatch; then map every pole across ALL platforms vs mercato -> a clean SRS;
then build one-tenant <-> one-Hermes. **No development before a written requirement. Hermes is NOT forked
or edited. Markdown is the source of truth.**
**MAPPING FRAME (owner 2026-10-16): we are NOT limited by what mercato allows** - engineer the
best/richest/most-integratable version per pole, then re-engineer.

**Rule 1: docs are claims, code is the authority. Rule 13: a committed number can be wrong -
re-measure, and commit the fix *by name*.**

## STANDING FORMAT - every turn MUST state (owner, 2026-10-16)
**(1) what was done, (2) its address in `MASTER-CHECKLIST.html` (`CC-nn`), (3) what is next** - and
update the HTML's `FRONTIER` array (LAST DONE with `CC-*` + NEXT); the `.md` twin's section 2 mirrors it.
Syntax-check a script edit: extract `<script>` and `node --check` it.

## Standing hazards
- **MASTER-CHECKLIST.html is DATA-DRIVEN, not generated** - content lives in the JS arrays at the top of
  its `<script>` (`PHASES`/`ROWS`/`OPEN`/`PLATFORMS`/`FRONTIER`/`REGISTER`/`SRSREG`); edit an array entry,
  never the markup. Hand-synced with the `.md` twin, so the two DO drift.
- **CORRECTED 2026-10-16: `MASTER-CHECKLIST.html` is pure LF, NOT CRLF** (HEAD and worktree both 0 CR
  bytes); the old "CRLF as-is" note was wrong for this file. Never a BOM.
- **A bare-word grep is NOT a declaration census** - grepping `capability` matched the prose "adapter
  capability" in a comment. Use `^\s*capability\s*:`. Git-Bash `grep -c` on CR LIES; byte truth is
  `tr -cd '\r' < f | wc -c`. **Never `git add -A`** - explicit paths.

## Live code frontier (`JOURNAL.md`)
**NEXT = `SR-42` - a declared-control coverage check - then the two CRITICALs T-01/T-02.** Why `SR-42`
first: **six triage findings are the SAME finding** - a control declared, **zero production readers**,
invisible to the build (named in `CC-92`) - and the workshop owns the mechanism (`SR-39` + `SR-41`).
A patch closes an instance; `SR-42` closes the class. **T-01:** the
delegation route guards `auth.delegations.manage`, never the capability being granted. **T-02:**
`business_ir.run_query` passes `features: ctx.userFeatures` into the Business-IR chain and nothing reads
it. Both are one function to close - copy `getCapabilityDescriptor` / `authorizeEntityAccess`.
**`CC-92`** = the `preview/` triage (46 findings validated against `b183df58`, zero false) ->
`PREVIEW-AUDIT-TRIAGE.md`. **Then** the tooling set's remainder (`SR-38` + `SR-46` re-homed to
`scripts/check-*.mjs`) -> identity -> **`SR-12`** (the fix for open `CC-84`) -> `P2-9b`.
Owner decided: **core architecture first - business modules generated from the core workspace.**
