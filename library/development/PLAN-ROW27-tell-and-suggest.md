# PLAN — Row 27 (Phase 7): *"told when blocked, noticed and suggested to"* — MEASURED + the startable half built

**Row:** `platform_points.md` LIST **row 27** — *"The user is told when blocked and noticed and suggested to —
not left guessing."* **IDs:** `S3` (tell the user when access is refused) / `S8` (notice and suggest, and never
act without asking).

---

## 1. What was measured (rule 0b, 2026-10-11)

**`S3` — "The platform tells the user when access is refused."** *(spec: when a prompt asks for something the
user may not see, the platform says so — it never silently returns a smaller answer that looks complete.)*

- **The "told" half EXISTS.** The dispatcher's refusal returns a **localised message plus the missing feature
  list**: `NextResponse.json({ error: t('api.errors.forbidden', 'Forbidden'), requiredFeatures }, { status: 403 })`
  (`apps/mercato/src/app/api/[...slug]/route.ts:249`); 401 and 404 carry messages too, and `CrudHttpError`
  bodies pass through.
- **The "seal" half does NOT exist.** A grep for a seal / truncation marker found nothing in the audit or
  request paths. Per the spec, the seal is *"to be built with the data permissions work"* — i.e. it needs the
  **data axis (`G-04`)** to know *what* was withheld. **So `S3`'s remainder is BLOCKED on `G-04`.**

**`S8` — "The platform notices and suggests, and never acts without asking."**

- **The "asks" half EXISTS** — and is *inert*: `canOfferSaveAsFunction` (`gate.ts`) is the single place that
  decides whether a Save may be offered (it consumes G-03's `VerificationReport` and reports the `notChecked`
  names). **It has no production caller** — the architecture says *"No UI. The gate is the function a Save
  button will call; wiring the button is separate."*
- **The "notices" half did NOT exist.** The spec names it exactly: *"needs a per-user request history and a
  similarity signal"*. Measured: **no history, no similarity, anywhere** (grep for
  `requestHistory`/`similarity`/`similarRequests` → nothing).

**Verdict:** row 27's startable piece is **`S8`'s similarity signal**. `S3`'s seal is blocked on `G-04`;
`S8`'s *offer* is the frontend Save button (deferred).

---

## 2. What was built

**`packages/shared/src/lib/request-outcome/repeat.ts`** (+ its test) — the **similarity signal**, and nothing
else:

- `normaliseRequestText` — lowercase, strip non-letter/number (Unicode-aware, so non-Latin scripts survive),
  collapse whitespace. A naive `[a-z0-9]` strip would empty every non-Latin request and make them all look
  like repeats of each other.
- `requestTokens` / `requestSimilarity` — **Jaccard** over token sets. Chosen because it is **deterministic**
  (the same pair always scores the same), needs **no model** (which would make the signal impure and
  unaffordable per request), and fails predictably.
- `detectRepeatedRequest({ text, history, threshold? })` → `RepeatSignal`
  (`{ looksLikeRepeat, matchCount, bestScore, nearest, threshold }`).
- **`DEFAULT_REPEAT_THRESHOLD = 0.8`**, clamped — a **false "you asked this before"** is worse than a missed
  one, so the bar is high.

**Design decisions worth stating:**
- **Pure — zero imports.** No clock, no database, no model, no randomness. That is what makes *"the platform
  notices"* a rule that can be **tested exhaustively** rather than observed.
- **A signal, not a decision.** The type is `RepeatSignal` / `looksLikeRepeat`, **not** `…Verdict` — a
  separate-agent hostile critic flagged that the first draft's name collided with the gate's real decision
  type, and a reader could have taken *"repeat"* for *"may save"*.
- **An empty request is not a repeat of an empty one** (`0`, not `1`) — otherwise an empty history matches
  everything and an empty prompt looks like a repeat of the last one.
- **Cost is the caller's to bound** — O(history), ~5 µs/entry (50 000 entries ≈ 0.26 s). The module does
  **not** silently truncate: a cap would change the answer without saying so.

---

## 3. Honest bound — what is NOT built (registered as `CC-66`)

- **The history read.** The signal takes a `history` list; nothing yet *feeds* it from the user's own prior
  prompts. That is the other half of what the spec names.
- **The offer.** The Save button that calls `canOfferSaveAsFunction` — frontend, deferred.
- **`S3`'s seal** — blocked on `G-04` (the data axis knows *what* was withheld).

**No appendix box moves.** `S3` and `S8` are whole points and neither is whole, so both stay `☐` — the ONE
NUMBER is **unchanged at 75 / 321 = 23%**. This is the honest outcome: a real piece was built, and the row is
not finished.

---

## 4. Proof

`src/lib/request-outcome` — **5 suites / 78 tests green** (16 new); `tsc --noEmit` clean on `shared`;
**4 RED-then-GREEN mutations**, every restore **md5-verified** (similarity always 0; empty ⇒ 1; threshold
ignored; threshold not clamped — plus one **re-proved against the final code** after the rename). A
separate-agent hostile critic attacked 7 claims: all held; **2 of its findings were false positives** (the
cited docs exist — in the docs repo, which the critic did not search; and the deep-path import is the
package's own established pattern) and **1 was real and is fixed** (the naming collision).

---

*Source: `platform_points.md` row 27 + §G `S3`/`S8`; `SPECIFICATIONS-DICTIONARY.md` §S3/§S8;
`ARCHITECTURE-request-outcomes.md`; `PLAN-G21-request-outcomes.md`. Written 2026-10-11. If this plan disagrees
with the code, the code wins and this plan is broken.*
