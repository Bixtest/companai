# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → daily logs in this folder + `JOURNAL.md`. New work: HERE + today's log.

## ★ ARCHITECTURE WORKSHOP — `library/architecture/` (the active stage)
**Method (binding):** study platforms ONE AT A TIME; find what fits the **three poles**
(**P1 aissistant · P2 workspace · P3 automations**) + widgets/frontend (PX-W/PX-F) + escape
hatch (PZ); then **map** each pole across ALL platforms vs mercato → a clean **SRS**; then build
**one-tenant ↔ one-Hermes**. **No development before a written requirement. Hermes must NOT be
forked or edited. Markdown is the source of truth — never edit it to fit a reader.** Owner's
frame: *"Do NOT be casual… everything we learn now will help us later."*

**Layout:** `<platform>-forensics/` (`00-PIN-AND-METHOD.md` + `findings/01..07`) · `platforms/`
(zips) · `reader/` (shared engine `generate-reader.js` + `DOCS_CONFIG` + `diagrams.js`; **copy +
rebrand, never rewrite**; built at the END of a study).

**Rule 1: docs are claims, code is the authority.** Count FIRST — a doc tree can be 93% of a repo;
the migration history is the most honest document in a repo. Rule 13: a committed number can be
wrong — re-measure, then commit the fix *by name*.

## Platform studies — verdicts (detail = daily logs + `findings/`)
1. **Hermes** ✅ 13/13 — main AI engine; never fork it. "OpenCode" = a provider, not an agent.
2. **Paperclip 0.3.1** ✅ 7/7 — P2/P3 strength; P1 = seam-provider. No tenancy, no composer.
3. **CrewAI 1.15.28** ✅ 7/7 — **mechanism donor, NOT an architecture template.**
4. **Multica 0.2.0** ✅ 7/7 +r3300 — **all three poles real — closest neighbour.** No widget model.
5. **Gas Town 1.2.1** ✅ 7/7 +r3400 — watchdog chain of agents; Hook = durability. No widget model.
6. **n8n 2.44.0** ✅ 7/7 +r3500, 73 f — **PX-W = first real composition surface**; P2 = 10 roles / 206 scopes.
7. **buzz 0.5.28** ✅ 7/7 +r3600, 90 f — **community = tenant** (Nostr); **PZ = strongest: 5 artefacts, 3 languages.** No widget model.
8. **openrig 0.6.10** ✅ 7/7 +r3700, 79 f — **P2: NO tenancy at all (first in study)**; P1 = two-surface rule; **PZ = the gate culture.** No widget model.
9. **zulip 12.0-dev+git** ✅ **7/7 + r3800** — **★ P2 = STRONGEST: the ambient realm** (tenant = the request's Host header). **★ PX-W = THE FIRST REAL WIDGET MODEL** (widget = an append-only `SubMessage` log, replayed). **★ PZ = densest guard culture.** P1 tiny. *"Make the wrong thing hard to do, then catch the rest automatically."*
— **mattermost** ⬜ **ASK before extracting (~700 MB).**

**★ STUDY CHAIN (9 CLOSED, all readers built)** → then **ASK** for the 10th (mattermost) → then the
**cross-platform mapping pass**. **Reader ports:** 3000 Hermes → 3100 Paperclip → 3200 CrewAI →
3300 Multica → 3400 Gas Town → 3500 n8n → 3600 buzz → 3700 openrig → 3800 zulip.

**Carried facts.** Multica — **machine ≠ teammate** (`agent_runtime` vs `agent`; `UNIQUE
(workspace_id, daemon_id, provider)` = the one-tenant-one-engine primitive); the one-statement claim
(`FOR UPDATE SKIP LOCKED` + health gate INSIDE it). buzz — an **event log is NOT a widget model**; no
RLS, the approval gate is **dead code**, `bypass-permissions` is buzz's DEFAULT. zulip b07 — "812"
was the numbering **ceiling**, not the count: **789 files**, and **4 numbers carry TWO migrations
(`0001`, `0209`, `0261`, `0501`) = exactly the `MIGRATIONS_TO_SKIP` set.**

## Standing hazards (still bite)
- **Line endings:** this repo commits **CRLF as-is** (`core.autocrlf=true`, no `.gitattributes`).
  A file whose CR count == its line count is NORMAL; do not "fix" it. No BOM, ever.
- **Git-Bash `grep -c $'\r'` LIES** (reports lines); byte truth = `tr -cd '\r' < f | wc -c`. Verify
  the **staged blob** via `git show :path`. Python `open(p,'w')` flips LF→CRLF — pass `newline=''`.
- **Never `git add -A`** — explicit paths. Docs repo = `C:/Users/Ramzi/Downloads/companai`.
- **`os.access(X_OK)` LIES on Windows** (75 vs the honest 65 via a `#!` shebang check).
- **Two counting traps:** a substring skip for `.git` silently drops `.github/` (prune exact dir
  names only), and **a numbering ceiling is not a count** ("0001–0812" was 789 files — measure count
  and range separately, and check for duplicate numbers).
- **Reader copy-then-rebrand (L168):** engine vocabulary (`BuzzReader`, `buzz_reader_`, stale
  `<title>`) is a leak; the *new* platform's own markdown quoting a sibling study by name is fine.
- `tsc` needs `--incremental false`; jest does NOT type-check. node→node spawn throws `EBUSY`.

## Live code frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
**★ NEXT = `P2-9b`** — default-flip to Hermes + OpenCode deletion + `CC-74` retirement.
**`CC-84` (tenancy, drives the whole study):** worker MCP calls authenticate as ONE superadmin
identity → a Hermes turn runs platform tools OUTSIDE the chat's tenant; one shared `HERMES_HOME`.
Ranked: per-run minted credential (recommended) → interim single-tenant fail-closed guard →
doc-only rejected. Also open: `CC-81`, `CC-85`-candidate, `CC-51` (falsified).
Owner decided: **core architecture first — business modules generated from the core workspace.**
