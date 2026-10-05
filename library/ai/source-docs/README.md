# Source documents — one place for the material the study reads

**What this folder is.** During the Paperclip + Hermes study
([`../../paperclip-hermes-study/`](../../paperclip-hermes-study/)) the evidence was scattered across
five different trees on this laptop — some tracked, some gitignored, some extracted from a zip that
could be deleted. This folder is the **one place** those documents live together, so a citation in a
findings file can be checked without hunting for the tree it came from.

**This README is the register. It is the only tracked file here.** The copies themselves are
gitignored, following the project's standing decision.

---

## 1. The two rules this folder follows

Both were already the project's position; this folder does not change them.

1. **Copies of somebody else's documents are not versioned.** Recorded in [`.gitignore`](../../../.gitignore)
   on 2026-10-04: *"The hand-written parts are versioned; the copies are ignored."* The reason is
   also recorded there — upstream's documentation must not ship under our name. So the **register is
   tracked and the copies are not**.
2. **The library is markdown only.** From [`../../PROVENANCE.md`](../../PROVENANCE.md) §4. The
   Paperclip doc set carries 118 non-markdown files — 75 images (14.9 MB) and 43 small JSON/MJS/TS
   fixtures. **The images were dropped; the fixtures were dropped too**, so the copy stays markdown
   only and the library does not grow by 15 MB of somebody else's screenshots. A markdown file that
   references a dropped image will show a broken link — that is expected, and it is the same trade-off
   `PROVENANCE.md` already made.

---

## 2. What is copied here

**`paperclip/`** — the documentation set from upstream Paperclip
(`library/ai/paperclip-master/`, extracted from `paperclip-master.zip`, version `0.3.1`).

| Part | Files | What it is |
|---|---:|---|
| `paperclip/doc/` | 235 | the main documentation tree — `architecture/`, `spec/`, `plans/`, `connections/`, `design/`, `plugins/`, `testing/`, `benchmarks/`, `pr/`, `logs/`, `experimental/` |
| `paperclip/docs/` | 75 | the docs site source |
| `paperclip/*.md` (top level) | 7 | `README.md`, `DESIGN.md`, `ROADMAP.md`, `AGENTS.md`, `SECURITY.md`, `CONTRIBUTING.md`, `adapter-plugin.md` |
| **Total** | **317** | **5.4 MB** |

*(The folder therefore holds **318** markdown files: the 317 copies plus this register.)*

**Why this one and nothing else.** Of all the scattered sets, **this is the only one with no other
consolidated home** — its source tree is gitignored, and a citation like `doc/MCP-ACCESS-GOVERNANCE.md:208`
would otherwise have nothing to point at once the zip is gone. The other four sets are already in one
place (§3), and copying them here would create a second copy that drifts.

---

## 3. The full register — where every scattered document set lives

| Set | Count | Where it is | Copied here? |
|---|---:|---|---|
| **Upstream Paperclip documentation** | **317 markdown files** | `library/ai/paperclip-master/` — **gitignored** (`.gitignore:109`) | **Yes — `paperclip/`** |
| **The sibling's documents** (Paperclip 0.3.1 fork + Hermes) | **351 files, of which 238 markdown** | `library/ai/hermes-docs/` — **gitignored** (`.gitignore:92`) | No — already consolidated in one place |
| **Upstream Open Mercato docs site** | 471 files (63 MB) | `library/kit-docs/` — **gitignored** (`.gitignore:98`) | No — already consolidated; too large, and upstream's |
| **The Hermes runtime source** | 17,570 files | `library/ai/hermes-agent-main/` — **gitignored** (`.gitignore:59`) | No — it is a codebase, not a document set |
| **The sibling's whole project** | 92,729 files | `aissistant-package/` — **gitignored** (`.gitignore:36`) | No — 76,216 of those are `host/node_modules` |
| **Our own working documents** | ~15 files | the repository root (`INDEX.md`, `JOURNAL.md`, `LESSONS.md`, `where_we_left.md`, `companai.md`, `NEEDS-YOU.md`, …) | No — **they are already tracked, and a copy would drift** |

*Counts in this table are as measured 2026-10-05. Only the Paperclip row is a markdown-only count; the
others count every file, because that is what those sets are.*

**The last row is deliberate.** The owner's working documents are the project's own words and they are
versioned at the root. Copying them into the library would create two copies of the same file — the
exact defect the project has a rule about. They are listed here so that "one place for everything" is
still true *as an index*, even where the file itself stays put.

---

## 4. What is *not* covered by this folder

- **It is not a backup.** It is a consolidation for reading. The authoritative copy of the sibling's
  documents is still `library/ai/hermes-docs/`.
- **It is not versioned.** If this folder is deleted, the register still says what should be there and
  where to get it (§5), but the copies are gone.
- **It does not make a claim about upstream.** A copied document says what *Paperclip* says. Where a
  Paperclip document disagrees with Paperclip's code, **the code wins** — that is the study's rule, and
  it has already caught three live disagreements.

---

## 5. How to rebuild this folder

```bash
cd C:/Users/Ramzi/Downloads/companai
mkdir -p library/ai/source-docs/paperclip
cp -r library/ai/paperclip-master/doc  library/ai/source-docs/paperclip/doc
cp -r library/ai/paperclip-master/docs library/ai/source-docs/paperclip/docs
cp    library/ai/paperclip-master/*.md library/ai/source-docs/paperclip/
find  library/ai/source-docs -type f ! -name '*.md' -delete   # markdown only
```

If `library/ai/paperclip-master/` is missing, re-extract `paperclip-master.zip` from the repository
root first. **Expect 317 markdown files.** If the count differs, the upstream version has changed and
the study's citations need re-checking.
