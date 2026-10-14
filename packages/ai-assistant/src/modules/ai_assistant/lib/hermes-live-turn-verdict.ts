/**
 * `P2-7` (§2.13) — the verdict for a **live turn** driven through the port.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A SEPARATE, PURE MODULE
 * ─────────────────────────────────────────────────────────────────────────────
 * `P2-7`'s exit gate is *"a real turn is served through the pinned worker and its
 * events are the adapter's **typed** events"*. The turn itself can only be driven
 * against a live stack (`scripts/hermes-live-turn.mts`), which is **not** a unit
 * test — a test that reaches a live service is a harness, and a harness that
 * silently reports success is worse than no harness at all (L150).
 *
 * So the harness's *judgement* is separated from its *plumbing*: the harness
 * drives the turn and hands the events here; this function decides pass/fail.
 * That split is what makes the claim falsifiable — a mutation to `judgeLiveTurn`
 * turns its unit suite RED in milliseconds, instead of needing a 10-minute live
 * run to notice the harness had gone blind.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY "a done appeared" IS NOT ENOUGH
 * ─────────────────────────────────────────────────────────────────────────────
 * The first draft of the harness asserted `events.some(e => e.type === 'done')`.
 * That is **not** the gate. It passes when:
 *   - the stream ALSO carried an `error` (the adapter emits `error` and settles —
 *     a failed turn never emits `done`, but a hand-edited or future adapter
 *     might, and the harness must not be the thing that hides it);
 *   - the turn produced **no text at all** — the gate says *"a real model
 *     answer, not a fake"*, and an empty answer is not an answer;
 *   - `done` was not the **last** thing the stream said (a `done` followed by a
 *     further `error` is a failed turn).
 * The gate is therefore: **no `error` anywhere, `done` present, `done` is the
 * last event, and the assembled answer is non-empty.** Each of those four is a
 * separate mutation below.
 *
 * This module imports the port's **types only** — no engine, no client, no DI —
 * so it stays inside the door's structural rule (`door-only-way-in.test.ts`).
 */
import type { AiRuntimeStreamEvent } from './ai-runtime-port'

/** What a live turn's event stream says about the turn. */
export interface LiveTurnVerdict {
  /** `true` only when the turn really answered and really ended on `done`. */
  readonly passed: boolean
  /** Plain English, shown on the harness's own line — never a bare `false`. */
  readonly reason: string
  /** The answer text assembled from every `text` event, trimmed. */
  readonly answer: string
  /** The event types in order — so a failure shows the SHAPE of what arrived. */
  readonly eventTypes: readonly string[]
}

/**
 * Judges one streamed turn from the adapter's typed events.
 *
 * Pure and total: every input produces a verdict with a reason, including an
 * empty stream (a stream that ended with nothing at all is a failure, and the
 * reason says so rather than leaving the caller to guess).
 */
export function judgeLiveTurn(events: readonly AiRuntimeStreamEvent[]): LiveTurnVerdict {
  const eventTypes = events.map((event) => event.type)
  const answer = events
    .filter((event): event is Extract<AiRuntimeStreamEvent, { type: 'text' }> => event.type === 'text')
    .map((event) => event.content)
    .join('')
    .trim()

  const base = { answer, eventTypes }

  // 1. An `error` anywhere is a failed turn — the adapter's `error` is terminal
  //    (it `settle()`s), so its presence is never cosmetic.
  const failure = events.find(
    (event): event is Extract<AiRuntimeStreamEvent, { type: 'error' }> => event.type === 'error',
  )
  if (failure) {
    return { ...base, passed: false, reason: `the turn ended with an error: ${failure.error}` }
  }

  // 2. The stream must END on `done`. A `done` that is not last means something
  //    spoke after the turn was over.
  const last = events[events.length - 1]
  if (!last) {
    return { ...base, passed: false, reason: 'the stream carried no events at all' }
  }
  if (last.type !== 'done') {
    return {
      ...base,
      passed: false,
      reason: `the stream ended on ${last.type}, not done (no completed turn)`,
    }
  }

  // 3. The gate says *a real model answer, not a fake* — so there must BE one.
  if (answer === '') {
    return { ...base, passed: false, reason: 'the turn completed but produced no answer text' }
  }

  return { ...base, passed: true, reason: `a real turn answered and ended on done (${events.length} events)` }
}
