# Provenance — where every document came from

This file records exactly how the library was assembled, so the result can be
checked and rebuilt. Nothing in the library was edited: every file is a
byte-for-byte copy of its source.

---

## 1. The sources

| Shelf | Copied from | Found | Kept |
|---|---|---:|---:|
| `01-policy-and-plan` | `E:\brainstorming\projecting\project\docs` (top level only) | 12 | 12 |
| `02-architecture-contracts` | `E:\brainstorming\projecting\project\docs\architecture` | 23 | 23 |
| `03-uxaios-product-and-paths` | `E:\brainstorming\projecting\project\docs\uxaios` | 23 | **25** (merged) |
| `03-uxaios-product-and-paths` | `E:\brainstorming\projecting\project\reboot` | 26 | — |
| `04-agent-analysis` | `E:\brainstorming\projecting\project\docs\agent-analysis` | 42 | 42 |
| `05-platform-audit-and-srs` | `E:\brainstorming\projecting\project\formalize-platform-audit` | 49 | 49 |
| `06-certification` | `E:\brainstorming\projecting\project\debug-certification` | 30 | 30 |
| `07-canonical-hardening` | `E:\brainstorming\projecting\canonical` | 16 | 16 |
| `08-formalize-blueprint` | `E:\brainstorming\projecting\formalize` | 66 | 66 |
| `09-reboot-vision` | `E:\brainstorming\projecting\reboot` | 18 | 18 |
| `10-uxaios-interface-vision` | `E:\brainstorming\projecting\bookmarks\frontend_vision` | 21 | 21 |
| `11-active-workstreams` | `E:\brainstorming\projecting\active` | 139 | 139 |
| `12-vision-extras` | `E:\brainstorming\projecting\vision-and-some` + 4 loose files at `E:\brainstorming\projecting\` | 58 | 6 |
| `13-design-conversations` | `E:\brainstorming\projecting\ai-datasets` | 6 | 6 |
| `14-reference-collections` | `E:\brainstorming\projecting\bookmarks\backend_references` (top level only) | 5 | 2 |
| `15-agent-rules` | `E:\brainstorming\projecting\agent_rules` | 5 | 5 |
| `16-konsult-product-docs` | `E:\sep-26-2026\major-importand-codebases\konsult\aissistant-package` (moved off `C:\Users\Ramzi\Downloads\konsult\` on 2026-10-04) — `docs\`, `documentation\`, and 13 top-level files | 62 | 61 |
| | **Total** | **577** | **521** |

The 4 loose files folded into `12-vision-extras` are
`FRAMEWORK_FORENSIC_TESTING.md`, `GRAPH_PORTAL_AGENT_IMMERSION.md`,
`platform-foundation-brainstorm.md` and `task.md`.

---

## 2. Where the external drive mattered

Every shelf numbered 01 to 15 came from `E:`, the external drive. Before this
library was built, none of that material existed anywhere on `C:`. With the drive
unplugged, the design of the platform was unreachable.

Shelf 16 is different — it was copied from `C:`, beside the live codebase, so
that the product documentation sits with the rest instead of in a separate place.

---

## 3. Why so many were dropped

**56 documents were removed as exact duplicates.** They were not lost: the first
copy of each was kept, and the later copies deleted. The full list is in
[`MANIFEST.txt`](MANIFEST.txt).

Two sources were almost entirely duplicates of shelves already in the library:

- **`vision-and-some`** (54 documents) — 48 of its 54 were byte-identical to documents already in `01-policy-and-plan`, `02-architecture-contracts` or `03-uxaios-product-and-paths`. Only 6 were unique.
- **`bookmarks\backend_references`** (5 documents) — only 2 were unique.

**Two folders were merged into one.** `project\docs\uxaios` (23 documents) and
`project\reboot` (26 documents) turned out to be the same document series held in
two checkouts: 22 of the 26 in `project\reboot` were byte-identical to documents
in `project\docs\uxaios`. Rather than keep a shelf of 26 documents that collapses
to 2, both were copied into `03-uxaios-product-and-paths`, which now holds the
union — 25 documents.

---

## 4. What was deliberately excluded

| Excluded | Where | Why |
|---|---|---|
| 1,133 documents (12.6 MB) | `E:\...\project\supporting platforms to review` | Other people's product documentation. Reference material about other systems, not writing about this one |
| 336 documents | `C:\...\aissistant-package\documentation\departments\_source` | Raw research material behind the departments synthesis |
| 5 documents | `E:\...\reboot\system_v0\legacy_copies` | A folder explicitly labelled as legacy copies |
| All non-markdown files | everywhere | The library is markdown only. One image (4 MB) referenced by the formalisation set was left behind |
| `node_modules`, `dist`, build output | everywhere | Vendored code and generated files |

---

## 5. How to check this file

Two independent measurements were taken and they agree:

| Measurement | Route | Result |
|---|---|---|
| Number of documents | The build script's own count | 521 |
| Number of documents | A separate `find` over the finished folder | 521 |
| Documents with a duplicate twin | `md5sum` over every file, duplicates counted | 0 |
| Empty files | size test | 0 |
| Files that are not markdown | extension test | 0 (excluding `MANIFEST.txt`) |

---

## 6. How to rebuild it

The build script is kept beside this file as `.build_library.py`. It is
re-runnable and deterministic — running it again deletes the **16 numbered shelves**
and rebuilds them identically.

**Two folders are never touched: `ai/` and `analysis/`.** They are not shelves and
they cannot be re-generated from any source — `ai/` holds the ai-first direction set,
the Hermes runtime source and the sibling project's documents; `analysis/` holds this
whole analysis programme. The script lists them as *preserving* and skips them.
**This guard is load-bearing.** Before it existed, running the command below would
have deleted both silently, and there was nothing to rebuild them from.

**Check before you build.** Add `--check` to see exactly what would be deleted and
what would be kept, without writing anything:

```
"C:\Users\Ramzi\.workbuddy-ai\binaries\python\versions\3.13.12\python.exe" ^
  "C:\Users\Ramzi\Downloads\companai\library\.build_library.py" --check
```

To rebuild, run it without `--check`:

```
"C:\Users\Ramzi\.workbuddy-ai\binaries\python\versions\3.13.12\python.exe" ^
  "C:\Users\Ramzi\Downloads\companai\library\.build_library.py"
```

**It refuses to run if any source is missing.** One of the sources is on the `E:`
drive. If that drive is not mounted, the script stops with a list of the missing
paths and deletes nothing — rather than emptying the shelves and leaving a library
with no documents in it.

It works in three passes:

1. **Stage.** Walk each source folder, take every `.md` file, copy it into its
   shelf keeping the sub-folder structure. If two sources produce the same target
   path, their contents are compared: identical files collapse to one, and
   genuinely different files are kept side by side with `--from-<source>` added
   to the name. Nothing is ever silently overwritten.
2. **Dedupe.** Hash every staged file. Where the same content appears more than
   once, keep the copy in the lowest-numbered shelf and delete the rest.
3. **Record.** Write `MANIFEST.txt` with the counts, the list of duplicates
   removed, and any name collisions.

To add a new source, add a line to the `SOURCES` list at the top of the script
and run it again. **Note that it deletes and rebuilds the shelves** — do not put
anything hand-written inside a numbered shelf, or it will be lost. Hand-written
files belong at the library root beside this one, or in `ai/` or `analysis/`,
which are preserved.

### Proven, not assumed

Both guards were tested, not just written:

| Guard | How it was tested | Result |
|---|---|---|
| `ai/` and `analysis/` survive a rebuild | `--check` against the real library | The 16 shelves are listed as *would delete*; `ai/` and `analysis/` as *preserving*. `ai/` still held its 17,570 files afterwards |
| A missing source stops the run | A copy of the script pointed at a scratch folder with a dummy shelf and one deliberately bogus source path | Refused with exit 2, listed the missing path, left the dummy shelf untouched, created nothing |

---

## 7. Dead links inside the copied shelves are expected — ours are not

The shelves are **byte-for-byte copies**, and their internal links were written for the
**original** repository layout — a sibling repo's `../ops/`, `../docker-compose.yml`,
`../COOKBOOK.md`. Those paths do not exist here, so a link inside a copied shelf is
usually dead. **That is a property of the copy, not a defect in the library**, and it is
why the copies are not edited to "fix" it.

**Measured 2026-10-05**, and kept separate on purpose:

| Where | Internal links checked | Broken |
|---|---:|---:|
| **Our own hand-written documents** — `library/development/`, `library/analysis/`, `library/paperclip-hermes-study/`, `workspace/`, `compai/`, and the root `*.md` | 792 | **0** |
| The 16 copied shelves, `library/01-`…`library/16-` | 907 | **347** — all pointing at the original repo layout |

**The rule that follows:** a dead link in a **numbered shelf** is expected; a dead link in
one of **our own** documents is a defect — report it, and fix it in the same change that
finds it. *(`workspace/references/completed-work.md`, `workspace/references/working-rules.md`
and one RUNBOOK had 24 such links written as if the file sat a directory higher; all 24 were
repaired on 2026-10-05.)*


