# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`. New work: HERE + today's log.

## ★ ARCHITECTURE WORKSHOP — `library/architecture/`
**Method (binding):** study platforms ONE AT A TIME; find what fits the **three poles** (P1
aissistant · P2 workspace · P3 automations) + widgets/frontend (PX-W/PX-F) + escape hatch (PZ);
**then map each pole across ALL platforms vs mercato → a clean SRS; then build one-tenant ↔
one-Hermes.** **No development before a written requirement. Hermes is NOT forked or edited.
Markdown is the source of truth — never edited to fit a reader.** Readers: copy + rebrand,
never rewrite.
**★ THE MAPPING FRAME (owner, 2026-10-16): we are NOT limited by what mercato allows.** For
each pole, engineer the **best, richest, most versatile, most integratable** version — plus
every extra feature/plugin/module/idea the nine platforms inspire — then re-engineer
accordingly. HAVE/BUILD/BORROW stays as the ledger; the ceiling is the target design, not
mercato's current state. → `library/architecture/mapping/` (00-PIN-AND-METHOD + findings/01..08).

**Rule 1: docs are claims, code is the authority.** **Rule 13: a committed number can be wrong —
re-measure, commit the fix *by name*.**

## Platform studies — verdicts (logs + `findings/`)
1. **Hermes** ✅ 13/13 — main AI engine. "OpenCode" = a provider, not an agent.
2. **Paperclip 0.3.1** ✅ 7/7 — P2/P3 strength; P1 = seam-provider.
3. **CrewAI 1.15.28** ✅ 7/7 — **mechanism donor, not a template.**
4. **Multica 0.2.0** ✅ 7/7 — **all three poles real; closest neighbour.**
5. **Gas Town 1.2.1** ✅ 7/7 — watchdog chain of agents; Hook = durability.
6. **n8n 2.44.0** ✅ 7/7 — **PX-W = first real composition surface.**
7. **buzz 0.5.28** ✅ 7/7 — **community = tenant** (Nostr); **PZ = strongest.**
8. **openrig 0.6.10** ✅ 7/7 — **no tenancy at all**; PZ = gate culture.
9. **zulip 12.0-dev** ✅ 7/7 — **★ P2 = STRONGEST: the ambient realm** (tenant = request's Host
   header); **★ PX-W = first real widget model**; **★ PZ = densest guards.**
— **mattermost** ⬜ **ASK before extracting** (226 MB zip on disk; activepieces 106 MB unlisted).
**Widget model: only n8n + zulip.**

**★ STUDY CHAIN: 9 CLOSED, readers built. MAPPING PASS = RUNNING** (`mapping/findings/01..08`,
requirements `SR-01…SR-nn`). mattermost joins later as a **10th column** (no rework).

## Standing hazards
- **Line endings:** repo commits **CRLF as-is**; CR count == line count is NORMAL — do not "fix"
  it. No BOM, ever.
- **Git-Bash `grep -c $'\r'` LIES**; byte truth = `tr -cd '\r' < f | wc -c`; verify the **staged
  blob** (`git show :path`). Python `open(p,'w')` flips LF→CRLF — pass `newline=''`.
- **Never `git add -A`** — explicit paths. Docs repo = `C:/Users/Ramzi/Downloads/companai`.
- **A numbering ceiling is not a count** (zulip: "0001–0812" = 789 files); a substring skip for
  `.git` drops `.github/`.
- `tsc` needs `--incremental false`; jest does NOT type-check; node→node spawn = `EBUSY`.

## Live code frontier (`JOURNAL.md`)
**★ NEXT = `P2-9b`** — default-flip to Hermes + OpenCode deletion + `CC-74` retirement.
**RULED 2026-10-16 (Option 1):** the stale-timeout gate is closed — keep the 2400 s ceiling, on-demand
tool loading is the standard behavior (the pin ships progressive disclosure ON by default; prompt-cache
reuse measured ON); `P2-9b` = **measure-and-configure**: one in-process re-measurement of the assembled
prompt (the ~16,757 figure under rule-13 re-measurement vs the compose's own 10,988), config only if
the numbers demand, then the switchover. Record: `DECISION-p2-9b-stale-timeout-trade.md` §6; the
lesson is `WORKING-RULES.md` **rule 18** (critical analysis + expanded cloud research first; never a
compromise menu).
**`CC-84` (tenancy, the study's driver):** worker MCP calls run as ONE superadmin identity → a
Hermes turn runs platform tools OUTSIDE the chat's tenant; one shared `HERMES_HOME`. Ranked:
per-run minted credential (recommended) → interim fail-closed guard → doc-only rejected.
Also: `CC-51` (falsified).
Owner decided: **core architecture first — business modules generated from the core workspace.**
