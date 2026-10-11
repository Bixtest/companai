/**
 * The repeat detector — the **similarity signal** S8 asks for.
 *
 * **What this is.** S8 (*"The platform notices and suggests, and never acts
 * without asking"*) says: *when the same request repeats, the platform offers to
 * save it as a Function.* The platform already has the **gate** that decides
 * whether such a save may be offered (`gate.ts` → `canOfferSaveAsFunction`) — what
 * it did **not** have is the thing that notices the repeat. This module is that
 * signal, and nothing more: it is **pure**, it **proposes nothing**, and it
 * **stores nothing**.
 *
 * **Why a signal and not a feature.** The spec's own words for S8 are *"needs a
 * per-user request history and a similarity signal"*. Those are two different
 * pieces: the **history** is a read over data the platform already keeps (a
 * person's prior prompts), and the **signal** is a pure comparison. Keeping the
 * signal pure is what lets the rule be *tested exhaustively instead of sampled* —
 * the same reason `triage.ts` is pure — and it keeps the decision to *offer* where
 * the gate already is.
 *
 * **What it deliberately does not do.** It does not read the database, does not
 * know who the user is, does not decide whether the save is *allowed* (that is
 * `canOfferSaveAsFunction`, which consults G-03's verifier), and never saves. A
 * repeat is **evidence for an offer**, never a reason to act: S8's second clause —
 * *"it asks; it never saves on its own"* — is a property of the caller, and the
 * caller is told here only *"this looks like a repeat"*.
 *
 * **The matching rule, and why it is this one.** Requests are compared as **sets
 * of normalised word tokens** (Jaccard similarity: the size of the intersection
 * over the size of the union). That is deliberately the simplest thing that can
 * work, for three reasons: it is **deterministic** (the same pair always scores
 * the same), it is **language-agnostic enough** not to need a model (which would
 * make the signal non-pure and unaffordable to run on every prompt), and it fails
 * **predictably** — a short request that shares most of its words with an earlier
 * one scores high, which is exactly the *"the same request repeats"* case, while a
 * long request that merely shares a topic does not. It is a **signal**, not a
 * classifier: the caller applies the threshold, and the default
 * ({@link DEFAULT_REPEAT_THRESHOLD}) is set high on purpose, because a **false
 * "you asked this before"** is more annoying than a missed one.
 *
 * Source: `library/development/SPECIFICATIONS-DICTIONARY.md` §S8;
 * `ARCHITECTURE-request-outcomes.md` §2; `PLAN-G21-request-outcomes.md`.
 */

/**
 * How similar two requests must be before the platform treats one as a repeat of
 * the other.
 *
 * **High on purpose.** Offering to save something the person has *not* actually
 * asked for before is worse than staying quiet: the offer is an interruption, and
 * a wrong one teaches the person to ignore it. `0.8` means *"four fifths of the
 * words are shared"* — a real repeat, not a shared topic.
 */
export const DEFAULT_REPEAT_THRESHOLD = 0.8

/** One past request, as the caller can supply it from whatever store holds it. */
export type RequestHistoryEntry = {
  /** The request as the person made it (the prompt text). */
  text: string
  /** Optional ISO timestamp, returned on a match so a caller can say *when*. */
  at?: string | null
}

/**
 * What the detector reports — **a signal, not a decision**.
 *
 * The name is deliberate (a hostile critic flagged the first draft's
 * `RepeatedRequestVerdict`): the decision *"may the Save be offered?"* is
 * `canOfferSaveAsFunction` in `gate.ts`, which consults G-03's verifier. This type
 * says only *"this looks like a repeat"* — a caller that read it as permission
 * would be granting something nothing here checked.
 */
export type RepeatSignal = {
  /** True when at least one past request scored at or above the threshold. */
  looksLikeRepeat: boolean
  /** How many past requests scored at or above the threshold. */
  matchCount: number
  /** The highest score seen (0 when the history is empty). */
  bestScore: number
  /** The closest past request, or `null` when there is none. */
  nearest: RequestHistoryEntry | null
  /** The threshold this signal was computed with — returned so a caller can log it. */
  threshold: number
}

/**
 * Normalise a request for comparison: lowercase, strip anything that is not a
 * letter/number (Unicode-aware, so non-Latin scripts survive), collapse runs of
 * whitespace, and trim.
 *
 * Exported because a caller that **stores** a request should store the normalised
 * form alongside the raw one, so the signal does not drift when this rule changes.
 */
export function normaliseRequestText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The distinct normalised tokens of a request. */
export function requestTokens(text: string): Set<string> {
  const normalised = normaliseRequestText(text)
  if (!normalised) return new Set()
  return new Set(normalised.split(' ').filter(Boolean))
}

/**
 * Jaccard similarity of two requests — `|A ∩ B| / |A ∪ B|`, in `0..1`.
 *
 * Two empty requests are `0`, not `1`: *"nothing"* is not a repeat of *"nothing"*,
 * and returning `1` there would make an empty history match everything.
 */
export function requestSimilarity(a: string, b: string): number {
  const left = requestTokens(a)
  const right = requestTokens(b)
  if (left.size === 0 || right.size === 0) return 0
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  const union = left.size + right.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Decide whether `text` looks like a repeat of something in `history`.
 *
 * Pure: no clock, no database, no model. The same inputs always give the same
 * signal, which is what makes *"the platform notices"* a rule that can be tested
 * rather than a behaviour that has to be observed.
 *
 * **Cost — the caller's to bound.** The scan is **O(history)** (one token-set
 * comparison per entry; measured ~5µs per entry, so 50 000 entries ≈ 0.26 s). The
 * signal is cheap enough to run per request, but **not** per keystroke against an
 * unbounded history: a caller should pass the window it actually wants considered
 * (recent requests, or a capped slice). This module does not silently truncate —
 * a cap would change the answer without saying so.
 */
export function detectRepeatedRequest(input: {
  text: string
  history: readonly RequestHistoryEntry[]
  /** Overrides {@link DEFAULT_REPEAT_THRESHOLD}. Clamped to `0..1`. */
  threshold?: number
}): RepeatSignal {
  const threshold = clamp01(input.threshold ?? DEFAULT_REPEAT_THRESHOLD)
  let matchCount = 0
  let bestScore = 0
  let nearest: RequestHistoryEntry | null = null

  for (const entry of input.history) {
    const score = requestSimilarity(input.text, entry.text)
    if (score > bestScore) {
      bestScore = score
      nearest = entry
    }
    if (score >= threshold) matchCount += 1
  }

  return { looksLikeRepeat: matchCount > 0, matchCount, bestScore, nearest, threshold }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REPEAT_THRESHOLD
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}
