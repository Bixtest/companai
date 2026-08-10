/**
 * Who may read a recorded act.
 *
 * These assertions are the control. The column is inert without them: a scope
 * that nothing checks is a label, and a label on a timeline is worse than
 * nothing because it reads as though somebody decided.
 */
import {
  DEFAULT_VISIBILITY_SCOPE,
  VISIBILITY_SCOPES,
  canSeeVisibilityScope,
  isVisibilityScope,
  parseVisibilityScope,
  visibleScopesFor,
  type VisibilityViewer,
} from '../visibility'

const backOffice: VisibilityViewer = {
  isPlatformOperator: false,
  isActor: false,
  canViewPrivate: false,
  isPortalViewer: false,
}
const viewer = (overrides: Partial<VisibilityViewer> = {}): VisibilityViewer => ({ ...backOffice, ...overrides })

describe('the default is the audience records already had', () => {
  it('defaults to tenant, not private', () => {
    // Defaulting to `private` would empty every existing audit view on the day
    // this shipped -- a much larger change wearing this one's clothes.
    expect(DEFAULT_VISIBILITY_SCOPE).toBe('tenant')
  })

  it('lets an ordinary back-office reader see tenant records, exactly as before', () => {
    expect(canSeeVisibilityScope('tenant', backOffice)).toBe(true)
  })
})

describe('what each reader may see', () => {
  it('keeps internal tenant activity away from a portal reader', () => {
    // The line that matters most here. A customer reading the portal must not be
    // handed the tenant's own back-office activity because both live in one table.
    expect(canSeeVisibilityScope('tenant', viewer({ isPortalViewer: true }))).toBe(false)
  })

  it('shows portal activity to both audiences', () => {
    // The customer's own, and the tenant's staff -- hiding it from staff would
    // leave their audit trail incomplete, which is the opposite of the point.
    expect(canSeeVisibilityScope('portal', viewer({ isPortalViewer: true }))).toBe(true)
    expect(canSeeVisibilityScope('portal', backOffice)).toBe(true)
  })

  it('keeps installation-level acts away from a tenant administrator', () => {
    expect(canSeeVisibilityScope('platform', backOffice)).toBe(false)
    expect(canSeeVisibilityScope('platform', viewer({ isPlatformOperator: true }))).toBe(true)
  })
})

describe('private', () => {
  it('is hidden from an ordinary reader', () => {
    expect(canSeeVisibilityScope('private', backOffice)).toBe(false)
  })

  it('is visible to whoever performed the act', () => {
    // Nobody is locked out of their own history.
    expect(canSeeVisibilityScope('private', viewer({ isActor: true }))).toBe(true)
  })

  it('is visible to an explicit grant, and only an explicit one', () => {
    // Deliberately not implied by view_tenant: reading everyone's private acts is
    // a different decision from reading everyone's ordinary ones.
    expect(canSeeVisibilityScope('private', viewer({ canViewPrivate: true }))).toBe(true)
  })
})

describe('project, which cannot be decided yet', () => {
  it('is hidden from an ordinary reader rather than shown', () => {
    // Deciding this needs project membership, which arrives with G4. Returning
    // true would make the scope a label rather than a control.
    expect(canSeeVisibilityScope('project', backOffice)).toBe(false)
    expect(canSeeVisibilityScope('project', viewer({ isActor: true }))).toBe(false)
  })
})

describe('reading a stored value back', () => {
  it('accepts every scope it writes', () => {
    for (const scope of VISIBILITY_SCOPES) {
      expect(isVisibilityScope(scope)).toBe(true)
      expect(parseVisibilityScope(scope)).toBe(scope)
    }
  })

  it('treats a value it does not understand as private', () => {
    // The column outlives the code reading it. A scope written by a later version
    // and read by an earlier one must hide the record, not expose it.
    expect(parseVisibilityScope('some-future-scope')).toBe('private')
    expect(parseVisibilityScope(42)).toBe('private')
  })

  it('treats an absent value as the default, because old rows have none', () => {
    expect(parseVisibilityScope(null)).toBe('tenant')
    expect(parseVisibilityScope(undefined)).toBe('tenant')
  })
})

describe('the SQL filter', () => {
  it('gives an ordinary reader exactly the two scopes they may read', () => {
    // Pushed into `in (...)` rather than filtered in JavaScript: discarding rows
    // after the query still leaks through counts, paging and exports.
    expect(visibleScopesFor(backOffice).sort()).toEqual(['portal', 'tenant'])
  })

  it('gives a portal reader only portal records', () => {
    expect(visibleScopesFor(viewer({ isPortalViewer: true }))).toEqual(['portal'])
  })

  it('gives a platform operator everything', () => {
    expect(visibleScopesFor(viewer({ isPlatformOperator: true })).sort())
      .toEqual([...VISIBILITY_SCOPES].sort())
  })

  it('never returns a scope the reader would be refused individually', () => {
    // The list form and the single-decision form must not drift apart.
    const viewers = [
      backOffice,
      viewer({ isActor: true }),
      viewer({ canViewPrivate: true }),
      viewer({ isPortalViewer: true }),
      viewer({ isPlatformOperator: true }),
    ]
    for (const candidate of viewers) {
      for (const scope of visibleScopesFor(candidate)) {
        expect(canSeeVisibilityScope(scope, candidate)).toBe(true)
      }
    }
  })
})
