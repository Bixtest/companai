/**
 * The three endings a prompt can have — the request-outcome taxonomy (G-21).
 *
 * The owner described, in his own words, that **not every prompt becomes a
 * permanent Function**. He named three endings, and the triage that decides which:
 *
 *   1. **A one-time result** — "analyse something from the database and report
 *      back an output in a UI element like a datagrid, an input form, a report."
 *      Nothing is saved. The answer is the deliverable.
 *   2. **A step of architecture** — "some prompts may end up adding new database
 *      architecture because we are expanding the portal/tenant to provide other
 *      services, for example LMS service, CRM, etc."
 *   3. **A permanent Function** — the output is validated, refined until flawless,
 *      then saved with a name and placed in a grouping, so it runs like "a
 *      standard item menu in the traditional platforms" — with no AI.
 *
 * **Why this module exists at all, and why it is not the existing intent enum.**
 * `api/route/route.ts` already classifies every request as `'tool' | 'general_chat'`.
 * That is a **dispatcher** question — *which tool runs this?* — and it is a
 * different axis from the **outcome** question — *what does this prompt become?*
 * A `tool` intent can end as an ephemeral answer *or* as a saved Function; both are
 * `tool`. So the two vocabularies are kept apart on purpose: widening `intent`
 * would make a dispatcher answer a product question, and a later reader could not
 * tell which meaning was intended.
 *
 * **Why `shared` and not `ai-assistant`.** The law in this repo is
 * `ai-assistant -> shared`, never the reverse (`shared/src/modules/overrides.ts`).
 * The taxonomy is about what the *platform* offers a user, so the non-AI layers
 * (the Save gate, the lifecycle) must be able to name it without depending on the
 * AI package. Measured precedent: G-17's wire made this exact mistake and was
 * corrected.
 *
 * Source: `library/development/ARCHITECTURE-request-outcomes.md`;
 * `library/development/PLAN-G21-request-outcomes.md`.
 */

import { isCanonicalId } from '../kernel/canonical-id'

/* ------------------------------------------------------------------ *
 * The three outcomes
 * ------------------------------------------------------------------ */

/**
 * §3's three endings, named as first-class things the platform models.
 *
 * **The names carry the rule.** `ephemeral_answer` says the answer is the
 * deliverable and it is disposable; `model_proposal` says a structure change is
 * being *proposed*; `function_candidate` says the thing is *a candidate to be
 * saved*, not yet saved.
 */
export type RequestOutcome =
  | 'ephemeral_answer'
  | 'model_proposal'
  | 'function_candidate'

/** Every outcome, in the owner's own order. */
export const REQUEST_OUTCOMES: readonly RequestOutcome[] = [
  'ephemeral_answer',
  'model_proposal',
  'function_candidate',
]

/**
 * The three risk tiers, and they are the **vision's**, not ours.
 *
 * Doc 04 §130–§132 already tier schema changes precisely, and an earlier draft of
 * the architecture document invented a parallel small/large split that a critic
 * pass found weaker than the rule sitting next to it. So this is a **re-export of
 * the vision's own tiers**, and no second scheme is defined anywhere.
 *
 *   - `safe` — may auto-publish after testing
 *     (`new optional field`, `new read-only view`, `new alias`, `new UI view`)
 *   - `review_required` — a person must review before it takes effect
 *     (`new relationship`, `metric formula change`, `permission change`,
 *      `field type change`)
 *   - `explicit_approval` — a specific approval is required
 *     (`deleting data`, `removing field`, `breaking relationship`,
 *      `changing authorization boundaries`, `changing payroll/accounting behavior`)
 */
export type ChangeRiskTier = 'safe' | 'review_required' | 'explicit_approval'

export const CHANGE_RISK_TIERS: readonly ChangeRiskTier[] = [
  'safe',
  'review_required',
  'explicit_approval',
]

/**
 * **The tier that every structure change starts at when it is unrecognised.**
 *
 * This is a deliberate fail-closed default. A proposal whose change is not
 * recognised cannot be classified as `safe`, because `safe` is the tier that
 * *proceeds on its own* — and "we did not recognise this" is not evidence that
 * something is harmless. So an unknown change lands in the strictest tier, which
 * is the one that always stops and names a person.
 *
 * Owner's decision, 2026-10-06: a whole new service (LMS/CRM) is
 * **`explicit_approval`**, the strictest tier — so "add me LMS" always stops.
 */
export const UNRECOGNISED_CHANGE_TIER: ChangeRiskTier = 'explicit_approval'

/* ------------------------------------------------------------------ *
 * What the request needs — the triage's input
 * ------------------------------------------------------------------ */

/**
 * The facts the triage decides from.
 *
 * **Deliberately not the raw prompt.** The triage is a pure function over a
 * *classification*, so it can be tested without a model call and cannot itself
 * decide to call one. Whatever produces this shape (today: a human choosing, later:
 * the AI proposing) is a separate concern, and keeping them apart is what lets the
 * triage be proved exhaustively.
 *
 * The three booleans are not independent in practice — a request that needs new
 * structure is also a write — but they are recorded separately so the triage's
 * rule can be read off the type rather than inferred from a combination.
 */
export type RequestNeed = {
  /** Reads existing data and returns a result. */
  reads: boolean
  /** Writes to *existing* structure (a `BusinessCommandIR`). */
  writes: boolean
  /**
   * Requires **new** structure — an added entity/field, or a whole new service.
   *
   * **The dangerous axis, and the only one that can change the database.**
   */
  requiresNewStructure: boolean
  /**
   * Set when new structure is needed, so the risk tier can be decided.
   *
   * Omitted for a recognised change whose tier the classifier did not determine —
   * which the triage then treats as {@link UNRECOGNISED_CHANGE_TIER}, not `safe`.
   */
  change?: StructureChange
}

/** A structure change, named well enough to be tiered. */
export type StructureChange = {
  /** A short, stable name for the class of change, e.g. `new_optional_field`. */
  kind: string
  /** Plain language, for the person who has to approve it. */
  summary: string
}

/* ------------------------------------------------------------------ *
 * The proposal — the triage's output
 * ------------------------------------------------------------------ */

/**
 * What the triage returns: a **proposal**, never an action.
 *
 * **The type is the fence.** There is no field for "applied", "performed" or
 * "migrated" — so a caller cannot use the triage to change the database even by
 * mistake, and a future edit that tried to would be a type error rather than a
 * silent widening. Applying a structure change is the §1b gate's job (validation →
 * impact analysis → approval → migration), and that gate is not this module.
 */
export type RequestOutcomeProposal = {
  outcome: RequestOutcome
  /**
   * Plain language: why this ending. Never empty — a proposal that does not say
   * why is not a proposal.
   */
  reason: string
  /**
   * Present **only** for `model_proposal`. The tier decides *who must look*
   * before anything changes.
   */
  tier?: ChangeRiskTier
  /**
   * True when the user must confirm before the platform proceeds.
   *
   * `ephemeral_answer` is `false` — a read-only answer needs no ceremony.
   * `model_proposal` is **always `true`**, at every tier, because a structure
   * change is the consequential step. Even `safe` means "may publish once tests
   * pass", not "may happen without the user seeing it".
   * `function_candidate` is `true` — saving is a deliberate act.
   */
  requiresConfirmation: boolean
}

/* ------------------------------------------------------------------ *
 * Where a saved Function goes — §61's grouping
 * ------------------------------------------------------------------ */

/**
 * A saved Function's placement, as a **declared canonical path**.
 *
 * §2 Q5 of the architecture document decides this is not free text, *"because a
 * menu that two people can spell two ways is not a menu"* — and because §63
 * (*"user function → repeated pattern → vendor module"*) cannot detect a repeated
 * pattern if the same pattern can be named five ways.
 *
 * The grammar is the platform's existing one (`kernel/canonical-id.ts`), so
 * `finance.accounts_receivable` is valid and `Finance > Accounts Receivable` is
 * refused **at construction** rather than at render. Free text at the edge,
 * canonical id underneath — the pattern used everywhere else in this codebase.
 *
 * **The label is localised metadata and may change freely; the id may not.**
 */
export type FunctionPlacement = {
  /** §12.1 canonical id, e.g. `finance.accounts_receivable`. */
  path: string
  /** What a person sees. Localised, changeable, never the identity. */
  label: string
}

/**
 * Build a placement, refusing a path that is not a canonical id.
 *
 * A constructor rather than a bare type, so the refusal happens where the mistake
 * is made. A `FunctionPlacement` object literal would type-check with
 * `path: 'Finance > AR'` and fail much later, at render time, in front of a user.
 */
export function functionPlacement(path: string, label: string): FunctionPlacement {
  if (!isCanonicalId(path)) {
    throw new Error(
      `Invalid Function placement ${JSON.stringify(path)} — expected a canonical id like "finance.accounts_receivable" where every segment matches [a-z][a-z0-9_]*. Two people must not be able to spell one menu two ways.`,
    )
  }
  if (!label || !label.trim()) {
    throw new Error('A Function placement needs a non-empty label — the id names it, the label shows it.')
  }
  return { path, label }
}

/* ------------------------------------------------------------------ *
 * The candidate — what outcome 3 is a candidate to become
 * ------------------------------------------------------------------ */

/**
 * A `function_candidate`: the thing that *may* be saved, before it is.
 *
 * **This is not a `UserFunction`.** A `UserFunction` has a status, a version and a
 * lifecycle; a candidate is a proposal with the two things the save step needs
 * beyond the IR — where it would go, and under what name.
 *
 * Keeping them apart is what makes §2 Q2's rule structural: an
 * `ephemeral_answer` carries **no** `FunctionCandidate`, so it cannot be given a
 * name or a menu entry by mistake. If this were a `UserFunction` in `draft`, the
 * distinction would be one enum value away from collapsing — and the owner's
 * three-way distinction is the entire point of G-21.
 */
export type FunctionCandidate = {
  /** The IR that would be saved. Opaque here — G-17/G-02 own its shape. */
  businessIr: unknown
  /** The name the user would give it (§45's `Function name`). */
  name: string
  /** Where it would land. */
  placement: FunctionPlacement
}
