# 00 — Inventory, names and ground rules

**Batch:** 0 of 12 · **Date:** 2026-10-03 · **Status:** DONE

**The question this batch answers.** What exactly are we comparing, where does each
thing live, which version are we looking at, and what do the names actually mean?

**How the numbers were taken.** Every count below was measured from the files, not
recalled. Where a number will be used to make a decision later, it was measured
twice by two different methods, and both results are shown. Where the two methods
disagree, both numbers are written down with an explanation — never averaged.

---

## 1. The single most important output: **two different products are called Companai**

This is the whole point of the batch. Get this wrong and every later finding is
ambiguous.

| | **OUR Companai** | **THE SIBLING Companai** |
|---|---|---|
| **What it is** | An operating system where human and AI employees work under one org model, one task model and one authority system. **The governance layer is the product** | An AI company operating system. Humans and "Aissistants" (AI employees) under one company, one task list, one authority model |
| **Forked from** | **Open Mercato 0.6.7** | **Paperclip 0.3.1** |
| **The code** | `workspace/starting-kit/` | `konsult/aissistant-package/host/` |
| **The repo** | branch `main`, HEAD `cf2d820`, 76 commits, **no remote** | branch `aissistant`, tip `91e80d4`, 46 commits, remote `root@75.119.153.227:/opt/git/aissistant-host.git` |
| **The word for an AI worker** | AI employee | Aissistant |
| **Where it runs** | nowhere yet — deployment is item 20, deliberately not started | `aissistant.corprorate.com`, and `:3100` (the Bixy demo) |
| **Its documentation** | `companai/` (this repo), `compai/planning/`, `library/ai/ai-first/` | `library/ai/hermes-docs/`, `konsult/aissistant-package/` |
| **Its own glossary** | none yet | `library/ai/hermes-docs/reboot/09-GLOSSARY.md` (39 terms) |

**They are genuinely two products.** This is not a guess. Four independent pieces of
evidence, all measured:

1. **Different fork bases.** Ours is Open Mercato 0.6.7 (`where_we_left.md` line 19).
   Theirs is Paperclip 0.3.1 — its first commit is literally
   `2026-08-10 upstream pristine (paperclip 0.3.1)`.
2. **No shared git history.** Our docs repo is `master` @ `d6c92b69`, no remote.
   Theirs is `aissistant` @ `ea24eabf`, remote `aissistant-host.git`. No common commit.
3. **The direction document mentions neither.** `ai-first/` mentions Companai,
   Paperclip, Aissistant and Open Mercato **zero times** (see §4).
4. **Our own status file says so.** `where_we_left.md` line 5: *"Written 2026-08-13,
   when work paused here to build a related product in a separate codebase."*

**And they are by the same owner.** Our product was named Companai on 2026-08-12
(`JOURNAL.md` §"the platform gets a name"). The sibling's accepted architecture
decision ADR-001 is dated **the same day**. Then work here paused and the sibling was
built. That shared origin is exactly why the trap is dangerous: the sibling's
documents read as if they were written about our product, because they describe the
same idea built on a different base.

**The rule that follows**, and it is now written into `library/ai/README.md`:

> A document about the sibling project can tell us **what Hermes does** and **what
> went wrong**. It cannot tell us **what our platform should be**. Only `ai-first/`
> does that.

### 1a. A concrete instance of the trap, found while measuring

`companai/companai.md` — sitting at **our project root**, 9,429 bytes, dated
2026-08-14 — is **not ours.**

- Its md5 is `9f6ebd12a17179eb2fc625a5e9d679d1`.
- `konsult/aissistant-package/documentation/cursor/companai.md` has the **same md5**.
- It is **not** in our repo: `git ls-tree HEAD` does not list it, and it is untracked.

So a sibling document was copied into our root. It reads as a vision statement for
"Companai" — 12 named AI employees, "our platform gives us many of the primitives" —
and every sentence of it is about the *other* product. A reader would have no way to
tell. It has been labelled (§8) and the folder map has been corrected (§8).

---

## 2. The glossary

One line each. "Product" = a thing sold. "Codebase" = source on disk. "Fork" = a
copy of someone else's codebase that we now own.

| Name | What it is | Whose | Evidence |
|---|---|---|---|
| **Open Mercato** | The upstream platform **we forked**. Version 0.6.7 | theirs (upstream) | `where_we_left.md` §1; `INDEX.md` §2 |
| **Companai** | **Two different products.** (a) ours, named 2026-08-12; (b) the sibling's. Never assume which without checking the path | ours *and* theirs | §1 above |
| **compai** | The folder inside our repo for *thinking* — `planning/` and `brainstorming/`, 29 files, no code. Not a typo for `companai` | ours | `INDEX.md` §4 warning |
| **starting-kit** | Both a **milestone** ("the Starting Kit, ~80% done") and the **codebase folder** `workspace/starting-kit/`. Our fork of Open Mercato | ours | `where_we_left.md` §1–3 |
| **Paperclip** | The upstream product **the sibling forked** as its control plane. Version 0.3.1. In their own glossary, "Host = Paperclip fork" | theirs (upstream) | sibling `09-GLOSSARY.md`; ADR-001 |
| **Aissistant** | The sibling's word for an AI employee. Also the name of their host repo, `aissistant-host`. Historical misspelling `aisisstant` is embedded in their metadata and cannot be renamed | theirs | sibling `09-GLOSSARY.md` |
| **Hermes** | Nous Research's agent runtime. A real codebase. **The one thing both products share.** Two copies exist in this workspace, at different versions (§5) | third party | `hermes-agent-main/package.json`; sibling ADR-001 |
| **Konsult** | **Two meanings, both the sibling's.** (a) a GRC stack vendored into their product (a white-label of CISO Assistant), quarantined from their core; (b) the folder `Downloads/konsult/` holding their package and NIS2 material | theirs | sibling `09-GLOSSARY.md`; `README.md` of their package |
| **AI-FIRST** | The 9-document design set at `library/ai/ai-first/`. **Not a product.** It is the direction — what we will actually do | ours (the direction) | §4 |
| **SIBLING** | Shorthand used only in this programme for "the other Companai". Not a real name | — | this document |
| **corprorate** | A deliberate real-domain misspelling in the sibling's `aissistant.corprorate.com`. Do not "correct" it | theirs | sibling `09-GLOSSARY.md` |

**Open for the owner (batch 6, not this batch):** the word **"capability"** means a
*business area* (Finance, Sales, HR) in `ai-first/`, and a *permissioned action* in
our governance layer (`authority:explain --capability`). Same word, two meanings.
That decision is the owner's and stays open.

---

## 3. Where each input lives, and its pin

A pin is a version marker plus a way to prove a later batch read the same thing.

| Input | Path | Pin |
|---|---|---|
| The direction | `library/ai/ai-first/` | 9 files, 28,549 lines. No git. Content-stable by line count (§4) |
| The runtime source | `library/ai/hermes-agent-main/` | **no `.git`** — cannot name a commit. `package.json` = `hermes-agent` 1.0.0; `.nvmrc` 26; `.python-version` 3.14; 109 top-level entries |
| The runtime, second copy | `aissistant-package/hermes/` | sibling's vendored copy. `package.json` = `hermes-agent` 1.0.0; `.nvmrc` 26; `.python-version` **3.11**; 76 top-level entries. Their README calls it "v0.20.1" — see §6 |
| Our platform | `workspace/starting-kit/` | branch `main`, HEAD `cf2d820`, **76 commits**, 2026-08-13 12:24 +0200, 0 remotes, 0 dirty |
| Our docs repo | `companai/` | branch `master`, HEAD `d6c92b69`, **73 commits**, 2026-08-13 12:50 +0200, **0 remotes**, 87 tracked files |
| Our own thinking | `compai/` | 29 files: `brainstorming/` 3, `planning/` 12 + `method/` 2 + `platforms/` 12. Tracked in our repo |
| Sibling — docs | `library/ai/hermes-docs/` | 351 files in 4 folders (§5) |
| Sibling — code, authoritative | `konsult/aissistant-package/` | branch `aissistant`. **This is the source of truth** per its own `README-DO-NOT-EDIT.md` |
| Sibling — code, legacy copy | `companai/aissistant-package/` | **DO NOT EDIT.** Merged into `konsult/` on 2026-08-17. Deploy path is GitHub `click2bixi/companai` → `/opt/companai/companai` |
| Sibling — loose research | `library/ai/` root | `PAPERCLIP_HERMES_LLAMA_SERVER_SSOT.md`, `qwen-hermes-tool-calling-report.md`, `tiny_models/`, `integration_research/` |
| The library | `library/` | 521 documents in 16 shelves (§7) |

---

## 4. The vocabulary split — measured twice, both routes agree

A case-insensitive, whole-file search. Route 1 counted matching files with a
recursive `grep -ril`; route 2 was re-run independently the same way on a different
day-pass. Both give the same numbers.

| Term | in `ai-first/` (of 9 files) | in `hermes-docs/` (of 351 files) |
|---|---:|---:|
| Companai | **0** | 137 |
| Paperclip | **0** | 230 |
| Aissistant | **0** | 251 |
| Open Mercato | **0** | 8 |
| Hermes | 6 | 285 |

Two bodies of work with almost no shared vocabulary. `ai-first/` is a clean-sheet
design that has never seen our code.

---

## 5. The maps

### 5a. `ai-first/` — the direction. 9 documents, 28,549 lines

Line counts are exact (`wc -l`). The "Document N" numbers are the set's own
numbering, from its README.

| # | File | Lines | Purpose (from the set's own README) |
|---|---|---:|---|
| — | `README.md` | 1,756 | The reading guide. Holds the precedence rule (§14), the not-decided list (§15), the two security invariants, and the five concepts |
| 1 | `ai_first_erp_research_analysis.md` | 1,623 | Why the current ERP model is wrong; the research behind the design |
| 2 | `ai_first_erp_semantic_database_architecture.md` | 904 | Semantic database architecture; core data vs capability data |
| 3 | `AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md` | 4,254 | What Hermes is and what it owns; the current architectural baseline |
| 4 | `03_Local_First_AI_Runtime_and_User_Function_Architecture.md` | 3,646 | Local-first runtime; **User Functions** — a validated AI operation saved so later runs need no model |
| 5 | `04_Core_Data_Architecture_Relationship_Fabric_and_Schema_Evolution.md` | 4,408 | The relationship fabric; how schema changes propagate |
| 6 | `deep-research-report.md` | 115 | Short research note |
| 7 | `05_Widgetized_Collaborative_Workspace_Architecture.md` | 4,826 | The widgetized collaborative workspace |
| 8 | `06_Platform_Foundation_and_Security_Kernel_Specification.md` | 7,017 | **The largest document.** Identity, policy, authorisation down to field and value level, approvals, audit, tenant enforcement, prompt-injection handling, AI context boundaries |

Two things worth knowing before batch 2 reads it:

- **The two security invariants**, verbatim from the README: *"AI may propose;
  deterministic platform policy must authorize; deterministic business services must
  execute; authorized result layers must control disclosure."* and *"Unauthorized data
  should not enter an AI context in the first place."*
- **The README has two competing heading numberings.** Sections `# 1`–`# 30` come
  first; then `# 7. Document 7` and `# 8. Document 8` are appended at the end (lines
  1635 and 1688), after `# 29 What to read next`. The recommended reading sequence in
  §29 lists only the first six documents. When batch 2 extracts requirements it must
  use the precedence rule in §14, not the section order, to decide what wins.

### 5b. `hermes-docs/` — the sibling's material. 351 files

| Folder | Files |
|---|---:|
| `docs-more/` | 135 |
| `documentation/` | 109 |
| `reboot/` | 88 |
| `docs/` | 19 |
| **total** | **351** |

The `reboot/` set is the important one — a previous, largely complete analysis
programme for the *sibling* product, with an accepted ADR and two recorded production
incidents. **Two routes, both correct, measuring different things:**

| Route | What it counts | Result |
|---|---|---|
| `ls *.md` in `reboot/` | the 36 documents at the top level | **16,682 lines** |
| `find . -name '*.md'` | everything, including the `work/` subfolder | **23,842 lines** across 86 files |

Both numbers are right. The earlier note of "37 entries, ~16,682 lines" was the
top-level count (36 `.md` + the `work/` folder = 37 entries). Written down here so
nobody later thinks the two figures contradict each other.

### 5c. `library/` — 521 documents, 16 shelves

| Shelf | Docs | | Shelf | Docs |
|---|---:|---|---|---:|
| `01-policy-and-plan` | 12 | | `09-reboot-vision` | 18 |
| `02-architecture-contracts` | 23 | | `10-uxaios-interface-vision` | 21 |
| `03-uxaios-product-and-paths` | 25 | | `11-active-workstreams` | 139 |
| `04-agent-analysis` | 42 | | `12-vision-extras` | 6 |
| `05-platform-audit-and-srs` | 49 | | `13-design-conversations` | 6 |
| `06-certification` | 30 | | `14-reference-collections` | 2 |
| `07-canonical-hardening` | 16 | | `15-agent-rules` | 5 |
| `08-formalize-blueprint` | 66 | | `16-konsult-product-docs` | 61 |

**521 total** — confirmed again this batch by adding the shelf counts, matching the
figure in `MANIFEST.txt`. Plus `ai/` (1,881 `.md`, mostly the Hermes source's own
docs) and `analysis/` (4).

---

## 6. Discrepancies and open items

Not defects in our work — things a later batch must resolve. None is quietly parked.

| # | Item | Detail | Owner |
|---|---|---|---|
| 1 | **Hermes skill count — three numbers** | `hermes-docs` *claims* 193 (81 + 112). The sibling's vendored copy *measures* 197 (82 + 115). The extracted repo *measures* 210 (58 + 152). Measured twice each way (files named `SKILL.md`; and unique directories containing one) — both routes agree. So: three different Hermes revisions, and the 193 is a claim about a fourth | batch 3 |
| 2 | **The vendored Hermes version label is unreliable** | The sibling's README calls their vendored copy "v0.20.1". Its `package.json` says **1.0.0**. Their own README also says the vendored copy is *"Reference only — this is not what runs"*, and that the two copies "have already differed in ways that cost debugging time". **Do not quote the version label; measure the tree** | batch 3 |
| 3 | **`companai.md` at our root is the sibling's document** | Byte-identical to `konsult/aissistant-package/documentation/cursor/companai.md` (md5 `9f6ebd12…`). Labelled this batch (§8). **Left in place deliberately** — deleting another project's document is not this programme's call | done (labelled) |
| 4 | **`INDEX.md` described `aissistant-package/` wrongly** | §4 called it "a legacy mirror of the codebase", which reads as a mirror of *ours*. It is the **sibling's** codebase. Fixed this batch (§8) | done |
| 5 | **`where_we_left.md` names a stale commit** | It says "Docs repo HEAD `2f8e81c`". That commit exists and is an **ancestor** of HEAD; HEAD is `d6c92b69`, **one commit later**. The file is not wrong, it is one commit behind. Not fixed — the file is a dated status document and rewriting its history would be worse | noted |
| 6 | **Our docs history is local only** | `companai/` has **0 remotes**. 73 commits of thinking exist on this machine and nowhere else | owner |

---

## 7. What is not available, and where we looked

Declaring something missing needs the search list, not just the word "missing".

| Not available | Where we looked | Consequence |
|---|---|---|
| A commit for the Hermes extract | `ls -d .git` in `library/ai/hermes-agent-main/` → absent | We pin Hermes by version markers and top-level shape, not by commit. **Any claim about "the Hermes version" must say which copy** |
| The sibling's `host/.git` | `ls -d aissistant-package/host/.git` → absent | The host fork's own history is not in the legacy copy. Its tip `91e80d4` is quoted from their README, **not measured by us** |
| The sibling's `hermes/.git` | `ls -d aissistant-package/hermes/.git` → absent | same |
| The sibling's `konsult/` folder | `ls -d aissistant-package/konsult/` → absent | It is tracked (3,446 files) but not on disk. **This fully explains the "dirty" tree** — see below |
| `Platform/`, `open-mercato-main/`, `skills-main/` | our root; and the external drive | Already recorded in `INDEX.md` ⚠️ checked 2026-10-03 |

**The sibling legacy copy is not "3,766 modified files".** Its `git status` gives
3,766 lines, which looks alarming. Broken down: **3,446 are `konsult/` deletions**
(the deliberately excluded folder), **258 are modified files**, and **62 are
untracked**. A reader who took the first number would conclude the tree is in chaos.
It is not. Corrected before writing it down.

---

## 7a. Defects found while measuring, and fixed in this batch

Measuring the pins meant walking the folders, and walking the folders turned up four
real problems. None was left for later.

### 1. A rebuild command that would have destroyed the analysis programme — **serious**

`library/PROVENANCE.md` documents a rebuild command for the library. `library/.build_library.py`
is re-runnable and deterministic, and its first act is to delete **every directory** in
`library/` and rebuild it from source.

`library/ai/` and `library/analysis/` are directories in `library/`. Neither is a shelf,
neither is built from any source, and neither can be rebuilt. So following the
documented instruction would have **silently deleted the ai-first direction set, the
Hermes runtime source, and this entire analysis programme.** Nothing would have warned
anyone, and there was nothing to restore from.

**Fixed, and proven:**

- The script now has a `PRESERVE = {"ai", "analysis"}` set and skips them.
- It gained a `--check` mode that prints the deletion plan and writes nothing.
- It now **refuses to run at all** if any source is missing. One source is on the `E:`
  drive; on a machine where that drive is not mounted, the old script would have printed
  "MISSING SOURCE" for every shelf, deleted the shelves anyway, and left an empty library.
- `PROVENANCE.md` §6 rewritten, with both guards and how they were tested.

| Guard | Test | Result |
|---|---|---|
| `ai/` and `analysis/` survive | `--check` against the real library | 16 shelves listed as *would delete*; `ai/` and `analysis/` as *preserving*. `ai/` still held all 17,570 files afterwards |
| A missing source stops the run | A copy of the script pointed at a scratch folder with a dummy shelf and one deliberately bogus source path | Refused, exit code 2, listed the missing path, left the dummy shelf untouched, created nothing |

The scratch folder and the copy were removed afterwards.

### 2. 360 documents stored twice — **contradicting the library's own promise**

`workspace/ai/` held 360 files: a complete copy of `ai-first/` (9 files) and
`hermes-docs/` (4 folders). The library's whole purpose is that nothing is stored
twice, and here was a second copy inside `workspace/` — the folder the index calls
"where work happens".

**Verified before touching it.** Hashed all 360 files and compared against
`library/ai/`: **zero files existed only in `workspace/ai/`**, and every one of the 360
was byte-identical to its twin in `library/ai/`. It was a pure duplicate.

**Fixed.** Moved to `workspace/attic/_duplicate-ai-2026-10-03/` — the project's own
parking place, per its Rule 1 (*"switch things off; do not delete them"*), and
`.gitignore` already excludes `workspace/attic/`. **Reversible:** it is a duplicate of
`library/ai/`, so nothing is lost either way, and the folder can be deleted outright
whenever the owner wants.

### 3. Two folders that could have put secrets into git — **serious**

Our docs repo's `.gitignore` opens with a promise: it does not version *"anything
holding a secret"*. Two things holding secrets were untracked but **not ignored**, so a
single `git add -A` would have committed them:

| Folder / file | What it holds | Was it ignored? |
|---|---|---|
| `keys/` | `bixma-server-info.txt`, `server_info_and_connection.txt`, `new 3.txt` — hosts and connection details | **No** |
| `host-sync.tgz` | 30 MB archive of a host tree, **containing a `.env`** | **No** |

`companai.md` — the sibling's document — was also untracked and not ignored, one
`git add -A` from being committed into our history as if it were ours.

**Fixed.** `.gitignore` now names `keys/`, `*.tgz` and `companai.md`, each with the
reason written above it. Verified with `git check-ignore -v`: all three are now caught.

### 4. The vendored Hermes tree, one `git add` from bloating the docs repo

`library/ai/hermes-agent-main/` is **17,570 files** of somebody else's code, extracted
for reading. `.gitignore` already excludes vendored code in principle (`open-mercato-main/`,
`skills-main/`, `Platform/`, `*.zip`) but named nothing that matched this. Now ignored.

### Left open deliberately — and it is the owner's call

`library/` as a whole is still untracked. Part of it is ours and ought to have a
history — `library/analysis/`, `library/INDEX.md`, `library/PROVENANCE.md`,
`library/ai/README.md`. Part of it is copies of external material — the 16 shelves,
`library/ai/ai-first/`, `library/ai/hermes-docs/` — which the build script can
regenerate.

This is not a defect, so it was not "fixed". **It is worth a moment, though:** the
`.gitignore` file already records that this project once lost the history of the
knowledge base and learned the lesson *"one bad edit from gone"*. `library/analysis/`
is in that position today. A note saying so is now in `.gitignore`. The recommendation
is to version the hand-written parts and ignore the copies — but that is a decision
about someone else's repository history, so it is left open rather than taken.

---

## 8. What this batch changed

**Created**
- This report, `findings/00-inventory.md`.

**Corrected — documentation that was wrong or dangerous**
- **`library/.build_library.py`** — added `PRESERVE = {"ai", "analysis"}` so a rebuild
  cannot delete them; added a `--check` dry-run; added a pre-flight refusal when any
  source is missing.
- **`library/PROVENANCE.md`** — §6 rewritten. It previously documented a rebuild
  command that would have deleted `ai/` and `analysis/`, and warned only about the
  numbered shelves. It now names both preserved folders, documents `--check`, and
  records how each guard was tested.
- **`companai/.gitignore`** — added `keys/`, `*.tgz`, `companai.md` and
  `library/ai/hermes-agent-main/`, each with the reason written above it. Also added a
  note recording the open decision about versioning `library/`.
- **`companai/INDEX.md`** — §4 map corrected: `aissistant-package/` is the **sibling's**
  codebase (it was described as a mirror of ours, which it is not); `companai.md` added
  with a warning; `integration_research/` and `tiny_models/` removed from the root (they
  moved into `library/ai/`); `keys/` and `host-sync.tgz` added. §7 "last updated"
  rewritten.
- **`library/ai/README.md`** — the `companai.md` case added as a concrete example of
  the trap, with the md5 evidence.
- **`library/analysis/PLAN.md`** — batch 0 ticked and marked DONE; the batch 0 input list
  corrected to point at the **authoritative** sibling package
  (`konsult/aissistant-package/`) rather than the legacy copy; the four defects recorded
  inline; the skill-count question handed to batch 3.
- **`library/analysis/LOG.md`** — one dated entry.

**Moved**
- **`workspace/ai/` → `workspace/attic/_duplicate-ai-2026-10-03/`** — 360 files,
  verified pure duplicate of `library/ai/`. Parked, not deleted.

**Not done, deliberately**
- `companai.md` was **not** deleted. It is another project's document; labelling it is
  our business, deleting it is not.
- `library/` was **not** committed to git. That is a decision about the owner's
  repository history, and it is recorded as open (§7a).
- `where_we_left.md` was **not** edited to update its stale commit reference. It is a
  dated status document; rewriting what it said on 2026-08-13 would be worse than the
  staleness.

---

## 9. Critic pass

A separate pass whose only job was to break this report. What it tried, and what
happened:

| Attack | Result |
|---|---|
| **"Are these really two products?"** Looked hard for evidence they are one: same owner, same day, near-identical product language, and a sibling document sitting in our root | **Held.** Different fork bases (Open Mercato 0.6.7 vs Paperclip 0.3.1), no shared commit, different remotes, `ai-first/` mentions neither, and `where_we_left.md` line 5 says it outright. The near-identical language is real — and it is the reason the trap is dangerous, not evidence against the split |
| **"Are the vocabulary counts right?"** Re-ran independently, per file, case-insensitive | **Held.** 0/0/0/0 and 137/230/251/8, both routes |
| **"Is `companai.md` really theirs?"** Two routes: md5 against the sibling's file, and `git ls-tree HEAD` in our repo | **Held.** Identical md5; not in our tree |
| **"Is the reboot line count wrong?"** The two routes disagreed — 16,682 vs 23,842 | **Resolved, not averaged.** They measure different things (top-level vs recursive). Both written down with what each counts |
| **"Is the Hermes skill count 193, 197 or 210?"** Three numbers in play | **Open, honestly.** All three are recorded with their source and their route. Resolving it is batch 3's job |
| **"Is the sibling tree in chaos?"** 3,766 dirty lines | **Broke my first reading.** It is 258 modified + 62 untracked + 3,446 deliberate `konsult/` deletions. Rewritten before publication |
| **"Did I nearly write a false claim?"** I first concluded the `ai-first` README does not cover its two largest documents | **Caught and corrected.** The README *does* have sections for documents 7 and 8 (lines 1635, 1688) — my heading search stopped too early. The real observation is narrower and is stated as such: the README has two competing heading numberings and its recommended reading sequence lists only six documents |
| **"Is `workspace/ai/` really safe to move?"** It might have been the *source* the library was built from | **Checked, and it was not.** `library/.build_library.py` reads `E:\brainstorming\projecting` and `konsult\aissistant-package` — never `workspace/ai`. Then hashed all 360 files against `library/ai/`: **zero unique files**. Moved only after both checks |
| **"Do the two new guards actually guard?"** A guard that is only written down is a print, not a guard | **Proven by mutation.** `--check` showed the real library's 16 shelves as *would delete* and `ai/`+`analysis/` as *preserving*. A copy of the script with one deliberately bogus source path **refused, exit 2**, left a canary file untouched, and created nothing |
| **"Does the pin let a later batch prove it read the same thing?"** | **Partly.** Git trees: yes. The Hermes extract and `ai-first/`: no commit exists, so they are pinned by version markers, top-level shape and line counts. Stated plainly rather than papered over |
| **"Is anything now broken that was working?"** | **Checked.** The only files changed are documentation, `.gitignore`, and the library's build script. No file under `workspace/starting-kit/` was read, written or moved. The code is untouched |

**Nothing in the critic pass was left open except two things, both named: the Hermes
skill count (batch 3) and the decision about versioning `library/` (the owner's).**

---

## 10. Definition of done — checked

> *A reader who has never seen this project can say where each input is, which version
> we analysed, what each name means — and which project each document describes.*

- **Where each input is** — §3, 12 rows, every path real.
- **Which version** — §3 pins; §7 says exactly which ones cannot be pinned and why.
- **What each name means** — §2, 11 names, each labelled product / codebase / fork / not-a-product.
- **Which project each document describes** — §1 and §4. This was the batch's main job
  and it is answered: `ai-first/` is ours; `hermes-docs/`, `konsult/aissistant-package/`
  and the stray `companai.md` are the sibling's.

**Batch 0 is complete. Batch 1 — the sibling project, lessons not decisions — is next.**
