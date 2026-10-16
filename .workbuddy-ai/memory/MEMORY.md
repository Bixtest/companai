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
**LAST DONE = T-32 ✅ BUILT 2026-10-17 `13c6206f`** — `readRecordId` (`interceptors.ts:89`) accepted only RFC-4122 v1–v5 ids, so a v7 id reached the resolver as `recordId: null` and `resourceCeilingFor` early-returned: **the lock was never looked up**. The gate is the ONLY production caller threading a recordId. Fix = **shape only** (the pattern `sync-run-service.ts`/`grantChecks.ts` already use), one step beyond the recorded `[1-5]`→`[0-9a-f]` (rule 13, named; the variant nibble `[89ab]` is the same over-strictness). Proof: 7 tests against the real gate + service, stub lock reader; **decisive assertion = the lookup happened at all** (`stateFor` called with the real id → a v7-named restricted record HELD at A2). Register: **52 closed · 44 open · 96 total**; `CC-94`…`CC-97`.
**★ T-45 / `CC-97`, documented not fixed:** a *locked* record still passes the gate — no A0 hold by design ("RbacService has already made it at the route guard", true for capability refusals but not record-lock ones) and `refusalFor` threads no recordId, so a locked record is writable by any capability holder. High · scheduled · DOCUMENT; pinned by a test.
**▶ NEXT = T-13/T-14** — `--jinja` absent from every compose file; the `mcp` service's missing base URL (else it calls `api.openai.com`). **Then** tooling set (`SR-38`+`SR-46`) → identity (`SR-02`+`SR-07`) → `SR-12` (fix for open `CC-84`) → `P2-9b`.
Owner decided: **core architecture first — business modules generated from the core workspace.**
