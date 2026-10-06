/**
 * The triage — which of the three endings a request gets (G-21).
 *
 * **What this is.** A pure function that turns a {@link RequestNeed} into a
 * {@link RequestOutcomeProposal}. It proposes; it never performs.
 *
 * **The rule, in one line: the platform proposes an ending, the user confirms the
 * consequential ones, and a structure change is never applied here.**
 *
 * Three properties are load-bearing, and each has a test:
 *
 *   1. **Pure.** No model call, no database, no clock, no randomness. The same
 *      need always yields the same proposal. That is what lets the whole rule be
 *      proved exhaustively instead of sampled.
 *   2. **It proposes, never performs.** {@link RequestOutcomeProposal} has no field
 *      for an applied change, so the triage *cannot* reshape the database. A
 *      structure change goes through the §1b gate (validation → impact analysis →
 *      approval → migration), which is a different item.
 *   3. **It fails closed on an unrecognised change.** A change the classifier could
 *      not tier lands in {@link UNRECOGNISED_CHANGE_TIER} — the strictest — never
 *      `safe`, because "we did not recognise this" is not evidence of harmlessness.
 *
 * **Why the precedence is what it is.** A request that needs new structure is
 * also, in practice, a write — but it is **not** a function candidate, because the
 * thing it produces is a *model proposal*, not a saved operation. So
 * `requiresNewStructure` is checked **first**: the dangerous axis decides, and the
 * read/write axes only decide among the outcomes that are not structure changes.
 * Getting this order wrong would classify "add me an LMS" as a saveable Function,
 * which is exactly backwards — the most consequential request would get the
 * quietest ending.
 *
 * Source: `library/development/ARCHITECTURE-request-outcomes.md` §2 Q1–Q3;
 * `library/development/PLAN-G21-request-outcomes.md` §2b.
 */

import type {
  ChangeRiskTier,
  RequestNeed,
  RequestOutcomeProposal,
  StructureChange,
} from './types'
import { UNRECOGNISED_CHANGE_TIER } from './types'
import type { TierSettings } from './tier-source'
import { DEFAULT_TIER_SETTINGS, resolveTier } from './tier-source'

/**
 * The tiers a named change kind is known to sit in.
 *
 * **This was an empty frozen object until D1 (2026-10-06).** It is now a *seed*,
 * not the mechanism: the live mapping is a **setting** a superadmin can change
 * (`tier-source.ts`, dictionary §C.2b), and {@link tierForChange} reads that when a
 * {@link TierSettings} is supplied. The constant is kept, and kept **empty on
 * purpose**, because it documents the honest state — the mapping from a *change
 * kind* to a tier is not decided anywhere yet, so **every** structure change lands
 * in {@link UNRECOGNISED_CHANGE_TIER} unless a setting says otherwise.
 *
 * That is a safe default, not a missing feature: an unrecognised change sounding an
 * alarm a person must answer is the behaviour we want until the mapping is decided.
 * The setting is where it goes now; this constant is only the seed it is built from.
 *
 * @deprecated since D1 — read the setting through `tier-source.ts` instead. Kept so
 * the pure default is still nameable and one place, not scattered.
 */
const CHANGE_KIND_TIER: Readonly<Record<string, ChangeRiskTier>> = Object.freeze({})

/**
 * The tier for a change, failing closed when the kind is not recognised.
 *
 * **Pure, and now injectable.** Given no `settings`, it uses the seed mapping
 * (`CHANGE_KIND_TIER`, empty) and therefore lands everything unrecognised on
 * {@link UNRECOGNISED_CHANGE_TIER}. Given settings — loaded once by the caller from
 * `module_configs` via `loadTierSettings()` — it reads the live mapping. The purity
 * promise of this module is kept: no database is touched *here*; the read happens
 * before the call, and only the already-validated value crosses this boundary.
 */
export function tierForChange(change: StructureChange, settings?: TierSettings): ChangeRiskTier {
  if (settings) return resolveTier(change.kind, settings)
  return CHANGE_KIND_TIER[change.kind] ?? UNRECOGNISED_CHANGE_TIER
}

/**
 * Decide which ending a request gets.
 *
 * The order of the branches **is** the rule, and each returns a reason a person can
 * read. See the file header for why structure is checked first.
 *
 * `settings` is optional and defaults to the seed, so every existing caller keeps
 * its exact behaviour (an unrecognised change still fails closed). A caller that has
 * loaded the live tier setting — e.g. an AI route that already resolved the
 * container — may pass it so the proposal reflects the configured mapping.
 */
export function triageRequest(need: RequestNeed, settings?: TierSettings): RequestOutcomeProposal {
  const tierSettings = settings ?? DEFAULT_TIER_SETTINGS

  /* ---- 1. New structure: the dangerous axis, decided first ---------------- */

  if (need.requiresNewStructure) {
    // A structure change is proposed even when the classifier supplied no
    // `change` at all. The absence of a named change is not a reason to skip the
    // alarm — it is a reason to raise it, because we cannot say what would change.
    const change: StructureChange = need.change ?? {
      kind: 'unclassified',
      summary: 'A structure change was requested but not described.',
    }
    const tier = resolveTier(change.kind, tierSettings)

    return {
      outcome: 'model_proposal',
      reason:
        `This request needs new structure (${change.summary}), so it is a model proposal, not a saved ` +
        `Function. It is classified "${tier}": a structure change only proceeds through validation, ` +
        `impact analysis and approval — the platform does not reshape the database on its own initiative.`,
      tier,
      // Always true, at every tier: even `safe` means "may publish once tests
      // pass", never "may happen without the user seeing it".
      requiresConfirmation: true,
    }
  }

  /* ---- 2. A write to existing structure: worth naming, so worth saving ----- */

  if (need.writes) {
    return {
      outcome: 'function_candidate',
      reason:
        'This request writes to existing structure as a repeatable operation, so it is a candidate to ' +
        'save as a Function. Saving is a deliberate act: the platform can walk it to flawless, but it ' +
        'is the user who names it, places it, and confirms it.',
      requiresConfirmation: true,
    }
  }

  /* ---- 3. A read: the answer is the deliverable ---------------------------- */

  if (need.reads) {
    return {
      outcome: 'ephemeral_answer',
      reason:
        'This request only reads, so the answer itself is the deliverable and nothing needs saving. It ' +
        'stays in the thread — so it can be re-run without the AI reasoning it out again — but it gets ' +
        'no name, no menu entry and no permissions row. If it turns out to be worth repeating, it ' +
        'becomes a candidate then, on the user\u2019s say-so.',
      requiresConfirmation: false,
    }
  }

  /* ---- 4. Nothing recognised: fail closed, visibly ------------------------- */

  // Reached only if the caller sets none of the three flags. Returning a quiet
  // `ephemeral_answer` here would be a guess in the one place a guess is worst:
  // an unclassified request could be *anything*, including a structure change.
  // So it is treated as needing a person, and the reason says exactly that.
  //
  // The tier is the *configured default*, not the hardcoded constant — because the
  // owner's rule (dictionary §C.2b) is that the default is itself a setting. It
  // still fails closed: `DEFAULT_TIER_SETTINGS.defaultTier` is the strictest tier,
  // so even with no setting at all this branch cannot land on `safe`.
  return {
    outcome: 'model_proposal',
    reason:
      'This request was not classified: it declares no read, no write and no structure change, so the ' +
      'platform cannot say which ending it has. It is held as a proposal rather than guessed at, ' +
      'because an unclassified request could be a structure change and those are never assumed safe.',
    tier: tierSettings.defaultTier,
    requiresConfirmation: true,
  }
}
