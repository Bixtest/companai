/**
 * Who a recorded act was written for.
 *
 * **The point is the tense.** An act's audience is decided when it is written,
 * by the code that knows what the act was, and never reconstructed afterwards by
 * a report trying to infer sensitivity from a payload. Inference is where leaks
 * come from: a query that has to guess will guess wrong once, and once is enough
 * when the thing being guessed about is whether a private act belongs in a shared
 * timeline.
 *
 * Everything here is a **narrowing**. `tenant` is what a record gets when nobody
 * says otherwise, and it is exactly the audience audit records already had, so
 * adding this vocabulary changes nothing until a caller deliberately narrows a
 * record below it. Consistent with the authority resolver: nothing widens.
 */

export const VISIBILITY_SCOPES = ['platform', 'tenant', 'portal', 'project', 'private'] as const

export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number]

/**
 * What a record is written with when its writer says nothing.
 *
 * `tenant` rather than `private`, and the reason is worth stating: this is not a
 * new control being switched on, it is a vocabulary being introduced. Defaulting
 * to `private` would silently empty every existing audit view, which is a
 * different and much larger change wearing this one's clothes.
 */
export const DEFAULT_VISIBILITY_SCOPE: VisibilityScope = 'tenant'

export function isVisibilityScope(value: unknown): value is VisibilityScope {
  return typeof value === 'string' && (VISIBILITY_SCOPES as readonly string[]).includes(value)
}

/**
 * Anything stored that is not a scope we know is treated as `private`.
 *
 * A value we cannot interpret is not a value we may show. This matters on a
 * column that outlives the code reading it: a scope added by a later version and
 * read back by an earlier one must hide the record, not expose it.
 */
export function parseVisibilityScope(value: unknown): VisibilityScope {
  if (isVisibilityScope(value)) return value
  if (value === null || value === undefined) return DEFAULT_VISIBILITY_SCOPE
  return 'private'
}

export type VisibilityViewer = {
  /** Reads across tenants — the platform operator, not a tenant's administrator. */
  isPlatformOperator: boolean
  /** The reader performed the act being read. Always allowed to see their own. */
  isActor: boolean
  /** Holds the explicit grant to read acts marked private. */
  canViewPrivate: boolean
  /** Reading through the customer portal rather than the back office. */
  isPortalViewer: boolean
}

/**
 * Whether this reader may see a record carrying this scope.
 *
 * Runs **after** tenant and organization scoping and after the ordinary audit
 * feature check, exactly like the authority resolver runs after RBAC. It can only
 * take records away.
 */
export function canSeeVisibilityScope(scope: VisibilityScope, viewer: VisibilityViewer): boolean {
  switch (scope) {
    case 'tenant':
      // The audience audit records have always had: back-office readers, already
      // scoped to the tenant and already past a feature check to be here.
      //
      // A portal reader is a customer, and internal activity in the tenant is not
      // theirs to read — so this is where that line is drawn, not in the `portal`
      // case below.
      return !viewer.isPortalViewer || viewer.isPlatformOperator

    case 'platform':
      // Acts concerning the installation rather than any one tenant. A tenant's
      // own administrator is not the audience for those.
      return viewer.isPlatformOperator

    case 'portal':
      // Customer-facing activity, and the one scope with two audiences. The
      // customer sees their own; back-office readers see it too, because it
      // happened inside their tenant and hiding it would leave their audit trail
      // incomplete — the opposite of the point.
      return true

    case 'private':
      return viewer.isActor || viewer.canViewPrivate || viewer.isPlatformOperator

    case 'project':
      // **Fail closed, deliberately.** Deciding this needs project membership,
      // which does not exist until G4. Returning `true` would make the scope a
      // label rather than a control, and a control that is claimed and absent is
      // worse than one that is absent and known. Nothing writes `project` today,
      // so this is inert rather than restrictive.
      return viewer.isPlatformOperator

    default: {
      // Exhaustiveness: a scope added to the union without a rule here fails the
      // build rather than defaulting to visible.
      const unreachable: never = scope
      return unreachable
    }
  }
}

/**
 * The scopes this reader may see, for pushing into a SQL `in (...)` filter
 * rather than fetching everything and discarding rows in JavaScript.
 *
 * Filtering after the fact would still leak through anything that counts rows,
 * pages them, or exports them.
 */
export function visibleScopesFor(viewer: VisibilityViewer): VisibilityScope[] {
  return VISIBILITY_SCOPES.filter((scope) => canSeeVisibilityScope(scope, viewer))
}
