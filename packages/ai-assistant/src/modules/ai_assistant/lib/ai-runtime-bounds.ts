/**
 * `P2-6` (§2.12) — the run's BOUNDS: how long a run may live, and how many runs
 * an adapter may retain.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS ONE FILE, SHARED BY BOTH ADAPTERS
 * ─────────────────────────────────────────────────────────────────────────────
 * §2.12's exit gate requires *bounded memory/CPU* to be **measured**, and the
 * measurement found two holes the adapters shared: the envelope's `budget` was
 * carried and dropped by **both**, and the run registry was pruned by **neither**.
 * A bound that each adapter defines for itself is a bound the two engines can
 * drift on — the same failure the `P2-5` provenance fix had to correct in both
 * halves. So the rule lives here once, and each adapter applies it.
 *
 * This module imports the port's **types only** — no engine, no client, no DI —
 * so it sits inside the door's structural rule (`door-only-way-in.test.ts`): a
 * file that reaches an *adapter* is inside the rule, and this one reaches
 * neither engine.
 */
import type { AiRuntimeEnvelope } from './ai-runtime-port'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('ai_assistant').child({ component: 'ai-runtime-bounds' })

/**
 * How many runs an adapter retains before it starts evicting FINISHED ones.
 *
 * A run registry is the adapter's memory of what it admitted; without a bound it
 * grows for the life of the process (measured: §2.12 — `this.runs` was never
 * pruned in either adapter). The cap is deliberately generous: it bounds a
 * long-lived adapter, it does not ration concurrency.
 */
export const DEFAULT_MAX_RETAINED_RUNS = 256

/** The minimum a retained run must expose for pruning to be safe. */
export interface RetainedRun {
  readonly runId: string
  readonly cancelled: boolean
  readonly completed: boolean
}

/**
 * The wall-clock instant a run must not outlive — the **sooner** of the two time
 * bounds §4.2 puts in the envelope:
 *
 *   - `deadline` — an absolute instant;
 *   - `budget.milliseconds` — a **duration**, so it is measured from the run's
 *     admission (`admittedAt`, the moment `startRun` accepted it). A duration is
 *     why this function takes the admission time rather than reading the clock:
 *     the bound belongs to the run, not to whoever asks about it.
 *
 * Returns `null` when the envelope bounds nothing — **an absent bound is not a
 * zero bound**. An unparseable `deadline` is logged and ignored rather than
 * firing immediately, so garbage in the field cannot kill a healthy run.
 */
export function resolveRunDeadline(envelope: AiRuntimeEnvelope, admittedAt: number): number | null {
  const candidates: number[] = []

  const deadline = readInstant(envelope.deadline)
  if (deadline !== null) candidates.push(deadline)

  const duration = readDuration(envelope.budget?.milliseconds)
  if (duration !== null) candidates.push(admittedAt + duration)

  if (candidates.length === 0) return null
  return Math.min(...candidates)
}

/**
 * Reads `budget.milliseconds` as a positive DURATION.
 *
 * A **numeric string** (`"5000"`, which a JSON caller that stringified the
 * number produces) is accepted rather than silently dropped — a bound lost in
 * silence is the failure this whole module exists to prevent. Anything unusable
 * is logged and ignored, exactly like an unparseable `deadline`, so garbage in
 * the field bounds nothing but leaves a trace.
 */
function readDuration(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' && typeof value !== 'string') {
    logger.warn('run envelope carried a non-numeric budget.milliseconds; no bound applied', {
      milliseconds: String(value),
    })
    return null
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn('run envelope carried an unusable budget.milliseconds; no bound applied', {
      milliseconds: String(value),
    })
    return null
  }
  return parsed
}

/** Parses an envelope instant; an unreadable value bounds nothing and is logged. */
function readInstant(value: AiRuntimeEnvelope['deadline']): number | null {
  if (value === undefined || value === null) return null
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (!Number.isFinite(parsed)) {
    logger.warn('run envelope carried an unparseable deadline; no bound applied', {
      deadline: String(value),
    })
    return null
  }
  return parsed
}

/**
 * Evicts **finished** runs (completed or cancelled), oldest first, until the
 * registry is back within `cap`. Returns the number evicted, so a caller (or a
 * test) can see the bound actually bite rather than assume it.
 *
 * **A live run is never evicted.** A run that is neither completed nor cancelled
 * is still addressable by `streamRun`/`cancelRun`, so evicting it would break a
 * run in flight — a worse defect than the memory it saves. The registry is
 * therefore bounded by **(live runs + cap)**, and live runs are bounded by the
 * platform's own concurrency. That is a real bound, and it is stated rather than
 * implied.
 *
 * `Map` preserves insertion order, so the iteration below visits the OLDEST runs
 * first — the ones a caller is least likely to ask about again.
 */
export function pruneRunRegistry<T extends RetainedRun>(
  runs: Map<string, T>,
  cap: number = DEFAULT_MAX_RETAINED_RUNS,
): number {
  if (runs.size <= cap) return 0
  let evicted = 0
  for (const [runId, run] of runs) {
    if (runs.size <= cap) break
    if (!run.completed && !run.cancelled) continue
    runs.delete(runId)
    evicted += 1
  }
  return evicted
}
