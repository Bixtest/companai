# Project memory — Companai / open-mercato (ACTIVE, SHORT form)

> Detail → `extended_deep_memory.md` + daily logs (`YYYY-MM-DD.md`) + `JOURNAL.md`. New work: HERE + log.

## Protocol & standing rules (binding)
Next task ONLY from `JOURNAL.md`'s `★ ACTIVE TASK` (order = `BUILD-ORDER.md`). Requirement = task +
`platform_points.md` points, **written BEFORE any code**; **rule 0b — measure the code FIRST**. Then plan →
execute → **separate-agent** hostile critic → **RED-then-GREEN** (md5 restore) → re-measure. Only when
flawless: ALL docs in the SAME change + commit. **Never `git add -A`** — explicit paths, BOTH repos (docs
`C:/Users/Ramzi/Downloads/companai`; code `../workspace/starting-kit`).
Two sources of truth: `BACKLOG.md` (status) + `BUILD-ORDER.md` (order); FRONTIER = `platform_points.md`'s
`▶ FRONTIER`; **only code is evidence**. **SHARED-DOC CLOBBER HAZARD:** owner saves from a stale copy —
`git diff <path>` first, **commit immediately after every edit**; `owner_answers.md` read-only. Rules 9a ·
10d · 11 (owner decides *what*) · 13 (falsified premise → correct *everywhere*) · 15–17. Reporting: no flag
without a full report (named · plain meaning · why · risk · **ranked actions + recommendation** · whether he
must decide); **never end on "your call"**.

## THREE TREES — never confuse
- `workspace/starting-kit` = OLD thin integration lab (Hermes behind a port). `P2-*`/`CC-*` frontier PARKED.
- `Aiaiai/backend-starter` = UNRELATED children's-education starter; "paperclip" absent.
- **`aissistant-package` = THE REAL PROJECT**: fork of upstream Paperclip 0.3.1 (baseline `4feef987`), rebranded
  Aissistant/Companai — AI-company OS: companies + polymorphic memberships, agent org chart, hire → provision a
  per-employee Hermes home → eval gate → board approval → the 19.4k-line `heartbeat.ts` run engine. Hermes = 11
  adapters, **`hermes_acp` the MANDATED lane** (422 else; break-glass `COMPANAI_ALLOW_LEGACY_ADAPTER_HIRES`):
  ACP over `docker exec -i` into ONE shared container, `HERMES_HOME` selects the employee, per-run identity as
  env vars, ~30 native + 41 `paperclip*` MCP tools, per-company `OPENAI_API_KEY` (AES-256-GCM) + a free local
  llama lane. Report → `analysis/aissistant-package-architecture-2026-10-14.md`. **Study THIS tree.**

## Hazards
`tsc` needs **`--incremental false`** (L139); jest does NOT type-check (L138). **Git-Bash `grep -c $'\r'` LIES
(reports CRs on LF-only files); byte truth = `tr -cd '\r' < f | wc -c`;** `core.autocrlf=true` commit warnings
are noise — verify the STAGED BLOB via `git show :path`. Critic = SEPARATE agent, command+output per claim; a
structural scan must name the file classes it covers; **critic verdicts get measured too (L146)**. Node:
`…/.toolchain/node24/node.exe` above `starting-kit`; managed `…\binaries\node\versions\22.22.2-6\node.exe`.
`/tmp` differs between Write (`C:\tmp`) and bash (`%TEMP%`) — absolute paths. **node→node spawn = `EBUSY`** —
drive children from BASH; GREEN baseline before any RED (L149). Live-service test ≠ unit test (L150). Gates on
the PINNED runtime (L154). Write BYTES not text (Python `open(p,'w')` flips LF→CRLF).

## Live frontier (truth = `JOURNAL.md`'s `★ ACTIVE TASK`)
- **ONE NUMBER 78 / 321 = 24%**, derived, never typed. Row 28 ✅ — `R28-6` (delete OpenCode) → `CC-72`.
  Hermes pin = `HERMES-PIN.md`; `--check` → PIN HOLDS.
- **Hermes Phase 2 DONE (`P2-1`…`P2-9a`), measured, defaults NOT moved.** 129/1890; tsc 92=0 new. Last:
  **`P2-9a` MCP BRIDGE, gate met LIVE** (`context.whoami`; `CC-79` discharged; `e7915da4`).
- **★ NEXT = `P2-9b` — ONE change**: default-flip to Hermes + OpenCode deletion (`R28-6`/`N-8`) + `CC-74`.
  **Hazard:** worker **default** toolset ≈16,757 tokens; cold prefill (~3000 s) > `…STALE_TIMEOUT: 2400` —
  `P2-9a` pinned `HERMES_TUI_TOOLSETS: open-mercato`.
- **Open:** `CC-81` (base tool types NOT assignable from a narrow tool; docblock `lib/types.ts:115` false) ·
  **`CC-84` tenancy:** worker MCP calls authenticate as ONE superadmin identity → a Hermes turn runs platform
  tools OUTSIDE the chat's tenant/user; one shared `HERMES_HOME`. Ranked: per-run minted credential (rec) →
  interim single-tenant fail-closed guard → doc-only rejected. **`CC-83`:** `P2-9b` retires the only session-write
  door. **`CC-51` FALSIFIED:** `team` EXISTS; `staff` PARKED. **Owner: core architecture first — business modules
  GENERATED from the core workspace.** Docker ON.

## Hermes forensics — CLOSED 13/13 · Paperclip study — CLOSED 7/7
- **Hermes** `library/hermes-forensics/` (00 + `01`–`13`; pin: no `.git`, 19,728 files, `pyproject.toml` md5
  `f57f729d4b251547a5a9e2565ce1e726`). Method = docs are claims, code is authority. 4 doc-vs-code divergences;
  batch 10 §9 (**"OpenCode" = a provider, not the coding agent**); batch 13 (prior analysis = HYPOTHESES;
  **C13-14: search config migrations for a retirement entry before reusing any older-doc setting**).
  `security.tirith_*` retired via migration 49→50. **Build UNDER. Steps 2–3 NOT started.** `edee95d`→`f3f83ec`.
- **Paperclip** `library/architecture/paperclip-forensics/` (`9ae258f`/`97b4dfc`/`2bef78d`; reader `f1e5dea`).
  Upstream 0.3.1 = the aissistant's ancestor (no `.git`, 10,447 files; `package.json` md5
  `e912c83c715dba5c7c55469d4de899cb`). **P2/P3 = its strength** (finite runs + durable DB continuity; 5
  continuation kinds + idempotency keys; reconciler; typed task tree TWO link types; portable md company pkg;
  directory restore locks); **P1 = seam-provider** (4 separable layers; agent lifecycle machine; Ed25519;
  memory-as-binding); **does NOT give**: multi-tenancy, a widget composer, rich persona/memory, a final SPEC.
  **4 forks vs Hermes:** Paperclip draws boundaries LOWER, Hermes HIGHER — **Hermes wins where already stronger.**

## ★ ARCHITECTURE WORKSHOP — `library/architecture/` (NEW stage)
**Goal:** study platforms ONE AT A TIME; find what fits the **three poles** (**P1 aissistant · P2 workspace · P3
automations**) + widgets/frontend (PX-W/PX-F) + escape hatch (PZ); then **map** each pole across ALL platforms
against mercato → a clean **SRS**; then build **one-tenant ↔ one-Hermes**. **No development before a written
requirement. Hermes must NOT be forked/edited. Markdown is the source of truth — never edit it to fit a reader.**
**Layout:** `README.md` · `<platform>-forensics/` (`00-PIN-AND-METHOD.md` + `findings/01..NN`) · `platforms/`
(zips + `references.md`; extracts under `platforms/_extracted/`, **gitignored**).
**A study's reader** = the platform-agnostic engine (`generate-reader.js` + `DOCS_CONFIG` + `diagrams.js` +
`reader.js/css`, `marked.min.js`, `serve.js`); emits `index.html` (SPA) + `pages/` + `assets/docs-data.js` +
`verification-report.json`; 4 themes, search, gallery, `[`/`]`, `diagram:id` pills. **Ports:** Hermes 3000 ·
Paperclip 3100. **Gotcha:** source `.md` comes from `SOURCE_DIR` — the **parent** if the generator sits in a
`reader/` folder, else `__dirname`. Built at the END of a study.
- **Paperclip ✅ CLOSED 7/7** — see the section above; reader `f1e5dea`.
- **CrewAI 🔵 IN PROGRESS (2026-10-15).** `crewai-forensics/` = 00 pin + `findings/01` (0 CR). Tree
  `platforms/_extracted/crewAI-main/`; `__version__ = "1.15.28"`. **HAZARD:** 1,411 `.py` / 492,582 lines but
  `docs/` = **33,251 `.mdx` = 93% of files** → read `lib/**/*.py` ONLY. **B01 established the control plane:**
  `Process` = 2 values and **"hierarchical" is NOT a hierarchy** (same loop + a manager agent with 2 tools);
  `kickoff()` the one door; `_execute_tasks` = a for-loop + inline async escape hatch; `execution.py` = per-run
  uuid; **agent loop branches on capability — native tool-calling is an OPTIMISATION on a ReAct TEXT loop**;
  event bus = 163 typed events + replay; hooks = 10 points that can ABORT; **checkpoint/resume/FORK**;
  declarative JSON loader + `FlowDefinition`; **Flows = 2nd paradigm** (routers, racing, human-feedback
  suspend/resume); **Skills** = SKILL.md + 3-level disclosure + `@org/name@version` registry. 14 pole-tagged
  findings. **NEXT = batch 02 (P1):** `agent/core.py` + `base_agent.py`'s 6 abstract methods + platform/MCP tools.
- **★ Remaining 8 platforms:** multica, gastown, n8n, buzz, openrig, mattermost, zulip (crewAI in progress).
  Order beyond "Paperclip first" **not fixed — ASK before extracting ~700 MB more.** Then the **mapping step.**

## Lessons L144–L167
L149 GREEN baseline before RED · L150 live-service test ≠ unit test · L151 the bound must END the stream · L152 a
THIRD impl was unbounded · L153 `progress =` ≠ total · L154 gates on the PINNED runtime · L155 tee long-run
evidence · L159 wrong-VIEW proof · L160 Git Bash path rewriting · L161 docstring-satisfied guards · L162 compose
blast radius = the PROJECT · L163 non-hermetic suite · L164 import ≠ the call + f-string blind spot · L165 a
clean run is the BASELINE · L166 a type fix must restore the CLAIM · L167 a test-helper cast erases N types.
