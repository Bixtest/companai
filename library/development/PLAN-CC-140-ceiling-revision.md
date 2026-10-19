# PLAN — `CC-140`: the ceiling write gets a concurrency token

**Status: BUILT AND CLOSED 2026-10-19.** Opened by `CC-139`'s own exemption comment.

**Files changed:** `lib/capabilityCeiling.ts` (`ceilingRevision`) ·
`lib/capabilityCeilingRoute.ts` (the revision in the read, `expectedRevision` in the write, the 409) ·
`api/capability-ceiling/route.ts` + `tenant/[id]/route.ts` (pass the token through) ·
`backend/settings/capability-ceiling/page.tsx` (send it, survive a 409) · the two test files (+5 route,
+2 page).

---

## 1. The defect, and where it came from

`CC-139` built the screen the ceiling never had, and the screen's save had to answer a guard that refuses
mutating screens without an expected-version header. It could not answer with a header: the ceiling is a
**set of rows**, one per capability (`tenant_capability_ceilings`, `auth/data/entities.ts:1078-1099`), so
`replaceCapabilityCeiling` rewrites N rows and there is no single `updatedAt` a version could name. The
exemption reason was true and specific — and **the reason itself is the defect** (`LESSONS.md` L192):

**Two administrators who load the same ceiling and both save keep the last write.** The first one's change
vanishes with no message, no record that anything was lost, and no retry path. Measured in three parts:

| Part | Measurement |
|---|---|
| the shape | a set of rows → no row version exists to lock on |
| the write | `replaceCapabilityCeiling(em, tenantId, capabilities, { actor, audit })` — no compare, no `where` on a starting point |
| the read | the route returns `capabilities` (+ `source`, `scope`, `tenantId`) and the write's `added` / `removed` diff describes the **result**, never the writer's starting point |

In a terminal this took two people racing at a prompt, so in practice it never happened. **A settings page
makes it reachable by hand**: two administrators who both opened the screen minutes apart, and the first
one's save is silently discarded.

## 2. The ruling: a fingerprint, and an honest name for what it is

**R1 — the read returns a revision.** `revision`: a stable hash of the sorted capability set, in the
response body of both read and write, beside `capabilities`. Not a row's `updatedAt` (there is no row) and
not a counter (nothing owns a sequence): **the fingerprint of the set itself**, because that is the thing
a stale writer is wrong about.

**R2 — the write accepts an expected revision and refuses a stale one.** Optional, so an existing caller
that does not send it is unchanged. When sent and different from what the table holds **now**, the write
is refused — **409**, with a sentence that says what to do.

**R3 — 409 is not 400.** A 400 says *your request is wrong*; the request is right, the **view** is stale.
An operator who reads 400 will try again and lose again. The screen reloads on 409.

**R4 — say what this is and is not.** This converts a silent overwrite into a refusal with a window of a
few milliseconds. **It is not a lock**: a true one needs `SELECT … FOR UPDATE` over the rows the write
will replace. The docblock and this plan both say so, because a security control whose defence is
overstated in its own comment is the `CC-19`/`L184` family — the wrong mechanism sends the next reader
looking in the wrong place.

**R5 — the screen keeps it and uses it.** The revision the read returned travels with the save; a 409
reloads the ceiling and says *"someone else changed this while you were looking"*.

## 3. The proof

1. The read returns `revision`, and it is **stable** for the same set (two reads agree) and **different**
   for a different set.
2. A write with no expected revision behaves exactly as before (the existing 14 route tests are the
   proof).
3. A write with a **stale** revision is refused with **409** and the sentence — and **nothing is
   written** (asserted: the ceiling rows are unchanged and the audit service was never called).
4. A write with the **current** revision succeeds — asserted against a revision obtained from a read,
   not a hard-coded string.
5. The screen sends the revision it was given and survives a 409 by reloading.

**Mutations, each RED then restored byte-identical** (checksums first — `L187`; restore by copy):

| # | Mutation | What must go red |
|---|---|---|
| M1 | drop the revision from the read's response | (1) |
| M2 | ignore `expectedRevision` in the write | (3) |
| M3 | answer 400 instead of 409 on a stale revision | (3) — the status assertion |
| M4 | compare against the **request's** set instead of the stored one | (3) — the refusal must fire when the *table* moved |

## 4. The run

**4/4 RED, every file restored checksum-verified** (`L187`: checksums first, restore **by copy**).

| # | Mutation | Result |
|---|---|---|
| M1 | drop the revision from the read's response | **RED** — 3 failed |
| M2 | ignore `expectedRevision` in the write | **RED** — 2 failed |
| M3 | answer 400 instead of 409 on a stale revision | **RED** — 2 failed |
| M4 | compare against the **request's** set instead of the stored one | **RED** — 1 failed |

**Runs:** the three ceiling suites **32 tests** · `tsc --noEmit` on `packages/core` exit **0** · full core
**661 suites / 5,824 tests, 0 failures**.

**★ The new test caught a defect in the new code before anything else did.** The 409 branch set the message
and then reloaded — and `loadCeiling` starts by clearing both, so the sentence would have been wiped by the
very fix it triggered: the screen would have reloaded in silence, which is the defect `CC-139` was supposed
to to repair (an operator with no message). The reload happens **first** now, and the comment says why.

**What is still true after this change, said plainly:** the window between the comparison and the write is
milliseconds, not zero. This turns a silent overwrite into a refusal; it does not make the write atomic. A
real lock would be `SELECT … FOR UPDATE` over the rows being replaced, and it is not built.

## 5. What this does not do

- **It does not make concurrent writes safe.** It makes concurrent *stale-view* writes refused. Two
  writers who both re-read between the check and the write still race, inside a window of milliseconds
  rather than minutes.
- **It does not version the individual rows.** A ceiling is a set; the fingerprint describes the set.
- **It does not change the empty-refusal and the subset rule**, both of which remain the library's own.
