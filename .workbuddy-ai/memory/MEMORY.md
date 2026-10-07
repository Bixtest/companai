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
- **`perl` is NOT available.** Prefer Python or Node for scripted edits.
- **Sandbox `rmSync` shim** (`node-safe-delete-shim.cjs`) intercepts deletes and can make tests that clean
  temp dirs (`dynamicLoader.tsconfig.test.ts`) fail under the full suite while passing in isolation — a
  known **pre-existing environmental** failure, NOT a code defect. Prove pre-existing by re-running with
  the suspect test excluded.
- **Hostile-critic pass earns its keep every time** (found a real hole in D3 AND two in the registry:
  a snapshot-vs-live-view contradiction, and a tautological test). Run it as a SEPARATE agent before
  declaring anything done; demand a command+output for every claim.
