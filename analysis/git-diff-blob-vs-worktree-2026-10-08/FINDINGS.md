# A measurement trap that produced a false finding — `git diff <commit>:<path>` vs the worktree

**Date:** 2026-10-08. **Found during:** the CC-24 documentation step (register updates before the commit).
**Status:** NOT AN ISSUE — a false finding, raised by me, then measured false. Recorded because the trap is
general and will bite again.

---

## 1. What I thought I had found

While auditing the uncommitted documentation changes, I ran, to see what had already been committed:

```bash
git show 595df08 -- library/development/COMPLETION-CALLBACKS.md | grep -n "CC-24"
```

It printed a **`+` row for CC-24** (with its full, final text). My model of the commit was that
`595df08` had added the **CC-26 / CC-27 / CC-28** rows only — so a `+CC-24` row looked like a discrepancy:
either the CC-24 row had been committed early, or my register edits were in an uncertain state.

**A second, apparently corroborating reading:** `git diff --stat` for the whole docs repo showed
**five** documents modified (JOURNAL, BACKLOG, BUILD-ORDER, RESUME-POINT, platform_points) — and named
**neither `COMPLETION-CALLBACKS.md` nor `PLAN-SD-1.md`**, both of which I believed I had edited uncommitted.
Two independent-looking readings pointed the same way. They were **both** wrong, and **neither** for the
reason I assumed.

## 2. What was actually true — measured, three routes

| Route | Command | Result |
|---|---|---|
| **1. Is the CC-24 row committed in `595df08`?** | `git show 3afebd3 -- library/development/COMPLETION-CALLBACKS.md \| grep -n "CC-24"` → hit at diff-context line 36; `git show 595df08 -- … \| grep -n "CC-24"` → hit at diff-context line 40 | The row is **already in `3afebd3`** (the CC-17 commit) — because the CC-17 slice's own hostile-critic pass *found* CC-24. Both `git show` hits are **context/unchanged lines printed by the diff**, not `+` additions. My grep counted a rendered line, not an added one. |
| **2. Are `COMPLETION-CALLBACKS.md` / `PLAN-SD-1.md` really unmodified?** | `git log -1 -- <path>` for both | Both last touched in **`595df08`** — i.e. their CC-26/27/28 edits **are committed**. They are absent from `git status` because there is nothing left to commit, not because the edits were lost. `--stat` shows only the files that *differ from HEAD*, which is the correct behaviour. |
| **3. Is the RESUME-POINT working-tree edit real?** | `sed -n '67p'` on the file **and** on `git show HEAD:<path>`, then `byte counts` and `git diff --numstat` | Real and uncommitted: worktree line 67 reads **`CONFIRMED by the owner — a role permission`**; HEAD line 67 reads **`model answered by the owner …; awaiting his confirm before build`**. `git diff --numstat` → **`3 3`**. Byte counts differ (7925 vs 7969) only because of the line-ending normalisation below. |

## 3. The trap, named

Two distinct traps were stacked here, and each silently produced a *plausible wrong* answer:

**(T1) `git show <commit> -- <path>` renders a diff, not a file.** Grepping its output finds **context
lines** (unchanged content, printed with a leading space) as readily as added lines (`+`) and removed
lines (`-`). A hit therefore proves only *"this text is in the commit's diff view"*, and **cannot
distinguish "added by this commit" from "already there"**. The reliable form is to assert on the diff,
not on the render: `git show <commit> -- <path> | grep '^+' | grep …`, or — better — ask the question of
the blob directly: `git show <commit>:<path> | grep -c …`.

**(T2) `git diff --stat` lists only files that differ from HEAD.** A file **absent** from that list is
**already committed**, not lost and not unedited. Reading the absence as "my edit vanished" inverts the
meaning of the output.

A third, smaller trap showed up in the same investigation and is worth naming too:

**(T3) Line endings make a byte comparison lie on this Windows host.** `core.autocrlf=true` (measured:
`git --version` → `2.55.0.windows.3`; `git config --get core.autocrlf` → `true`; no `.gitattributes` at
the repo root), so the **working tree carries CRLF** while every git-rendered blob (`git show`,
`cat -A` on a `git show`) carries **LF**. `cat -A` is therefore a raw-byte view of *only* the working-tree
side; on the git side it is already normalized. Any byte-count comparison across the two sides differs by
the line count for a reason that has **nothing to do with content**. The content comparison must be done
on **lines** (or on a normalized stream), and only then does `git diff --numstat` (`3 3`) agree with it.

## 4. What it changed

**Nothing in the code, and nothing in the registers** — the registers were correct as they stood. The
value of the finding is negative (a finding proved false), and it is recorded here for the same reason
the register files record environmental failures: **two `git`-output readings that appeared independent
agreed on a wrong answer.** Neither was independent — both were interpretations of a *rendered diff*,
which is the one artefact that cannot answer either question.

**The two routes I used to settle it were genuinely different methods, as the standing rule requires:**
(a) *ask the blob* (`git show <commit>:<path>`, then read the two lines side by side) rather than the
diff render; and (b) *ask the history of the path* (`git log -1 -- <path>`), which is a different
question — not "what does this commit say?" but "when was this file last written?" — and it named
`595df08` for both files. Where they could have disagreed (the RESUME-POINT edit) they did not: the
worktree/HEAD line comparison and `git diff --numstat` both show the same three-line change.

## 5. The rule this leaves behind

**When you are checking whether an edit landed, never grep a rendered diff.** Ask the object store for the
file at the revision (`git show <rev>:<path>`), or ask the path's own history (`git log -1 -- <path>`).
`git diff --stat` answers *"what differs from HEAD"* and nothing else. And on this host, compare **lines**,
not **bytes**, across the worktree/git boundary — `core.autocrlf=true` makes a raw byte count meaningless
there (the same class of error as the encoding trap already recorded in the working rules).
