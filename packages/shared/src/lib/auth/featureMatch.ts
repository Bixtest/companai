export type FeatureEntry = { id: string; title?: string; module?: string }

export function featureString(entry: FeatureEntry | string): string {
  return typeof entry === 'string' ? entry : entry.id
}

export function featureScope(featureId: string): string {
  const dotIndex = featureId.indexOf('.')
  return dotIndex === -1 ? featureId : featureId.slice(0, dotIndex)
}

export function extractFeatureStrings(entries: Array<FeatureEntry | string>): string[] {
  return entries.map(featureString)
}

/**
 * Checks if a required feature is satisfied by a granted feature permission.
 *
 * Wildcard patterns:
 * - `*` (global wildcard): Grants access to all features
 * - `prefix.*` (module wildcard): Grants access to all features starting with `prefix.`
 *   and also the exact prefix itself
 * - Exact match: Feature must match exactly
 *
 * ## Do NOT build a feature-list intersection on top of this
 *
 * A permission set is not a list, so `intersect(a.features, b.features)` is unsound
 * in at least six ways, and every one of them is a real case in this codebase:
 *
 * 1. `*` is a single string that contains everything — `['*'] ∩ ['a.b'] = []`, which
 *    denies the whole of what both parties may do.
 * 2. `a.*` is a family — it contains `a.b`, but as strings the two are disjoint.
 * 3. `a.*` also contains the **bare** `a` (`required === prefix` below), so a naive
 *    intersection loses that case too.
 * 4. `.own` is a **separate capability**, not a suffix: `x.y` and `x.y.own` do not
 *    satisfy each other (see `OWN_SCOPE_SUFFIX`), so intersecting them yields an
 *    empty set that means the opposite of the truth.
 * 5. A **denial** is subtracted after the grant and is not an element of any list.
 * 6. A **delegation** is added after the grant says no, and is not in either list.
 *
 * The intersection must be of **answers**, not of lists: ask the authority resolver
 * once per capability, with the person the actor acts for supplied as a ceiling
 * (`AuthorityEnforcementService.decideFor` with `onBehalfOfUserId`). `CC-123`.
 */
export function matchFeature(required: string, granted: string): boolean {
  if (granted === '*') return true
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2)
    return required === prefix || required.startsWith(prefix + '.')
  }
  return granted === required
}

/**
 * Row 16 (Option A) — the `own` row-scope modifier, a **suffix** on a feature id.
 *
 * A role grant of `<feature>.own` (e.g. `customers.customer_person.own`) means
 * *"this role may only see rows it owns"* for that entity; the plain `<feature>`
 * grant means all rows in the caller's tenant/organization scope. The modifier is
 * resolved into a row filter by `withCtx()` (`lib/crud/factory.ts`) — it never
 * changes who *may* call an endpoint, only which rows the call returns.
 *
 * This parser is deliberately **additive**: it is a separate function so that
 * `matchFeature()` (used by every one of the platform's permission checks) keeps
 * its exact existing semantics. A grant of `x.y` does NOT satisfy a required
 * `x.y.own`, and a grant of `x.y.own` does NOT satisfy a required `x.y` — the two
 * are different capabilities, kept apart on purpose so a role can be given the
 * ordinary feature without accidentally restricting it, and vice-versa.
 */
export const OWN_SCOPE_SUFFIX = '.own'

/** True when a feature id ends with the `.own` row-scope modifier. */
export function isOwnScoped(featureId: string): boolean {
  return typeof featureId === 'string' && featureId.endsWith(OWN_SCOPE_SUFFIX)
}

/** Strip a trailing `.own` modifier, if present (else return the id unchanged). */
export function stripOwnScope(featureId: string): string {
  return isOwnScoped(featureId) ? featureId.slice(0, -OWN_SCOPE_SUFFIX.length) : featureId
}

/** True when the granted feature list carries the `.own` modifier for `feature`. */
export function hasOwnScopeGrant(granted: readonly string[] | undefined | null, feature: string): boolean {
  if (!Array.isArray(granted) || !granted.length) return false
  // The grant must ACTUALLY carry the `.own` suffix — a plain `<feature>` grant
  // means "all rows", never "own rows". So we require `isOwnScoped(grant)`.
  return granted.some((grant) => isOwnScoped(grant) && stripOwnScope(grant) === feature)
}

/**
 * Checks if all required features are satisfied by the granted feature set.
 */
export function hasAllFeatures(required: string[], granted: string[]): boolean {
  if (!required.length) return true
  if (!granted.length) return false
  return required.every((req) => granted.some((g) => matchFeature(req, g)))
}
