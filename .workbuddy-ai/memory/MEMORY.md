# Project memory — Companai / open-mercato (curated, durable)

## How we work — the owner's standing 6-step work protocol (2026-10-07)

**This is the role. Follow it for every task, in order.**

1. **Pick the next task** from the development table (BUILD-ORDER order). It is stated in the
   `★ ACTIVE TASK` box at the top of `JOURNAL.md` — that box is the ONLY place a live task is stated.
2. **Pick all relevant points** in `library/development/platform_points.md` (the master point list).
3. **The task requirement = the task definition + those platform_points, combined.** Write it down
   as the requirement before touching code.
4. **Fact-check the code** to establish: (a) what is actually there; (b) which prerequisites must be
   fully done & functional first; (c) which code pieces the planned change can impact.
5. **Then** create the implementation plan, execute it, and run the **standard review + verification
   protocols** (hostile-critic pass, RED-then-GREEN mutation proof, re-measure) to decide honestly
   whether the work is flawless or needs more fixing.
6. **Only when the task is done fully, flawlessly, completely and honestly**: update ALL relevant
   documentation — including `BACKLOG.md` and `platform_points.md`.

### Standing rules that still bind (pre-existing)
- **Two sources of truth:** `library/development/BACKLOG.md` (live status) + `BUILD-ORDER.md` (order).
- **"A module is done" must be re-measured, never assumed from its tag.**
- **Every claim carries an observation.** Docs are not evidence; only the code is (platform_points Rule 0).
- **Never `git add -A`.** Commit in both repos (docs repo `C:/Users/Ramzi/Downloads/companai`;
  code repo `C:/Users/Ramzi/Downloads/companai/workspace/starting-kit`).
- Handover docs carry **no "what is next"**; the live task lives only in the `★ ACTIVE TASK` box.
- **OWN THE CODE YOU TOUCH — FULLY — AND CHALLENGE THE TASK BEFORE EXECUTING IT** *(owner, 2026-10-08;
  `WORKING-RULES.md` §1 rule 9)*. (a) **Ownership:** once you touch a piece of code you are responsible for
  the **entirety** of it — every bug, incomplete piece, error, optimisation and enhancement. **Fix it
  directly, or schedule it** (backlog / `COMPLETION-CALLBACKS.md`) with the trigger that brings it back.
  **Never leave a defect standing as "pre-existing, not mine".** (b) **Challenge, then execute:** before any
  task, **investigate whether it is the best thing for the project, challenge it if not, execute it if it
  is.** *"Work with knowledge, vision and awareness, not in a blind robotic way."*
- **Every partial build is scheduled** in `library/development/COMPLETION-CALLBACKS.md` (gap + prerequisite
  + callback), in the same change — *not merely noted inside a plan's §10* (`WORKING-RULES.md` rule 8).

### Working hazards learned
- **Markdown formatter damage recurs:** a Prettier-style reflow adds trailing two-space hard-breaks and
  can revert committed content. Before committing any doc: compare `git diff -w --shortstat` vs
  `git diff --shortstat`; if they disagree badly, `git checkout -- <file>` to HEAD and re-apply intent.
- **Node 24 is required:** `export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"`.
- The `analysis/d2-gap/measure.js` tool lives in the **docs repo root**, not the code repo.
- **Jest rootDir quirk:** run tests from **within the package dir** (`cd packages/<pkg> && npx jest
  --config jest.config.cjs …`); from the repo root it fails with `error TS5011`. Do NOT override
  `--rootDir` (the transform config breaks).
- **ENCODING TRAP (bites on every scripted edit):** a Python `open(p,'w')` text-write on Windows flips
  LF→CRLF and changes the md5 — so a "byte-identical" mutation revert silently isn't. **Write bytes**
  (`open(p,'wb').write(s.encode())`) or pass `newline="\n"`, and **hash-compare (md5) every restore**.
  Verify with `python -c "print(open(p,'rb').read().count(b'\r\n'))"` (expect 0 for these repos).
  **⚠️ Line endings are NOT uniform across the docs:** `JOURNAL.md`, `BUILD-ORDER.md`, `BACKLOG.md`,
  `platform_points.md`, `AGENT-HALF.md` are **LF-0**; **`COMPLETION-CALLBACKS.md` is CRLF** (177 → 183 after
  the `CC-40` add); **`SPECIFICATIONS-DICTIONARY.md` is CRLF** (419 → 427 after the §C.3 add). Always `grep`
  the CRLF count *before* editing.
- **NEVER edit a file at a line number taken from a DIFFERENT tool (near-miss 2026-10-09).** `grep -n`
  and Python **disagree on line numbers in a CRLF file**. I replaced "line 44" (Python) which was actually
  the heading `## The register` — destroyed 32 lines of the register (177→145; 39 rows→36). **The rule:**
  (1) locate the target **by content inside the same pass that writes** (`… if ln.startswith('| **CC-25** |')`,
  assert exactly one match); (2) **work in the file's own line-ending domain** (`split('\r\n')` / `join('\r\n')`
  for the register); (3) **assert the invariants in the same pass** (row count + CRLF count); (4) a one-row
  change MUST show `1 insertion(+), 1 deletion(-)` — anything more is collateral damage.
- **The register's real row shape is 5 CONTENT cells** = 7 parts when split on `|` (plus two empty edges):
  `| ID | Gap | Prerequisite | Trigger ↔ checked at | Callback |`. The `BAD-COLUMNS` check counts only
  ` | ` (space-pipe-space) ≥ 4. **Do not** use raw `awk -F'|'` field count as the shape test — escaped
  `\|` inside cell text inflates it. Reconciliation reads **cell 3 (the Gap cell)** for `✅`.
- **`BUILD-ORDER.md` was missing the entire `AH-` (agent) track** — fixed 2026-10-09 by adding a
  "PHASE 1 (continued) — the agent half" block with **item 20 = `AH-1`**; the eleven other `AH-` items
  stay ordered in `AGENT-HALF.md` §4. `AH-1` is the only agent-half item on the critical path.
- **`AH-1`'s "startable since `G-01`" was an over-simplification (corrected 2026-10-09):** `G-01` built the
  kernel descriptor **engine** (`buildModelDescriptor`/`collectDeclarations`), **not** an `Agent` object —
  `packages/shared/src/lib/kernel/model.ts` exports no `Agent`, and no module declares an agent entity.
  `AH-1`'s first slice is **declaring the `Agent` kernel object**. **BUILT 2026-10-09 (slices 1+2, codes
  `1a518f8`/`acfd020`):** the `Agent` is declared via a **module-root `ce.ts`** (`ai_assistant/ce.ts`) — the
  one channel `module-registry.ts` splits into `customEntities` **and** `customFieldSets` (`:3166`/`:3139`)
  — and `agent` is admitted as both a `CORE_SETTING_KINDS` kind and a `CORE_OBJECT_KINDS` kind (per-object
  `core` mark, refused on delete/rename). **The item still stays `☐`** (strict tick rule): the `reportsTo`
  edge + relation-typed `owner`/`role`/`actsAs` are deferred → **`CC-40`**; `runtime`/`autonomy` enforcement
  is `L-01`/`AH-5` + `AH-2`. The **core-object status leg is RESOLVED and BUILT** (per-object SETTING —
  `DECISION-agent-protection-tier.md`).
- **The kernel admits objects through exactly TWO channels:** `customEntities` and
  `entityExtensions`/`customFieldSets` — there is **no separate "platform entity" list**. A module-root
  `ce.ts` fills **both** (the generator splits it). `model.entities` is a **`Record<string, KernelEntity>`
  keyed by canonical id**, NOT an array — use `model.entities['agent']`, not `.find(...)`.
- **The core-object vocabulary is TWO distinct sets** (`shared/src/lib/core-boundary/`): `CORE_SETTING_KINDS`
  = kinds a **tier can be assigned to** (`table/column/relation/function/role/agent`); `CORE_OBJECT_KINDS` =
  the **row-level** kinds whose rows carry a delete/rename refusal (`role/agent`). Do not conflate them.
- **`perl` is NOT available.** Prefer Python or Node for scripted edits.
- **Sandbox `rmSync` shim** (`node-safe-delete-shim.cjs`) intercepts deletes and can make tests that clean
  temp dirs (`dynamicLoader.tsconfig.test.ts`) fail under the full suite while passing in isolation — a
  known **pre-existing environmental** failure, NOT a code defect. Prove pre-existing by re-running with
  the suspect test excluded.
- **Hostile-critic pass earns its keep every time** (found a real hole in D3 AND two in the registry:
  a snapshot-vs-live-view contradiction, and a tautological test). Run it as a SEPARATE agent before
  declaring anything done; demand a command+output for every claim.
