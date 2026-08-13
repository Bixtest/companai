/**
 * "Nothing is installed" and "nothing is permitted" are different answers.
 *
 * The browser cannot tell them apart on its own. `ClientBootstrap` registers the
 * raw generated widget entries, while the `enabledModules` overrides that can
 * disable a widget outright are applied **only on the server**. An app that
 * switched its dashboard widgets off therefore looked, to the client, exactly
 * like an app that still had them — so the empty dashboard rendered *"Use 'Add
 * a widget'…"* and there was no such control, because there was nothing to add.
 *
 * That is the bug this locks: `registeredWidgetCount` is the server's count
 * after overrides, and it is deliberately **not** ACL-filtered. A user who may
 * see none of an installation's ten widgets should still be told the widgets
 * exist; a user in an installation with zero should be told they do not.
 *
 * Found by the owner on the dashboard, then attributed by instrumenting the
 * running server rather than by reading the code — two readings of it produced
 * two confident wrong answers first.
 */
const tenantId = '11111111-1111-4111-8111-111111111111'
const organizationId = '22222222-2222-4222-8222-222222222222'
const userId = '33333333-3333-4333-8333-333333333333'

const layoutRow = {
  userId,
  tenantId,
  organizationId,
  layoutJson: [],
}

const em = {
  fork: jest.fn(() => em),
  find: jest.fn(async () => []),
  findOne: jest.fn(async () => layoutRow),
  create: jest.fn(() => layoutRow),
  persist: jest.fn(),
  flush: jest.fn(async () => undefined),
}

const rbac = {
  loadAcl: jest.fn(async () => ({ features: [], isSuperAdmin: false })),
}

const container = {
  resolve: jest.fn((name: string) => {
    if (name === 'em') return em
    if (name === 'rbacService') return rbac
    throw new Error(`[internal] Unexpected container resolve: ${name}`)
  }),
}

const loadAllWidgetsMock = jest.fn()
const resolveAllowedWidgetIdsMock = jest.fn()

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => container),
}))

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: jest.fn(async () => ({ sub: userId, tenantId, orgId: organizationId })),
}))

jest.mock('@open-mercato/core/modules/dashboards/lib/widgets', () => ({
  loadAllWidgets: (...args: unknown[]) => loadAllWidgetsMock(...args),
}))

jest.mock('@open-mercato/core/modules/dashboards/lib/access', () => ({
  resolveAllowedWidgetIds: (...args: unknown[]) => resolveAllowedWidgetIdsMock(...args),
}))

jest.mock('@open-mercato/shared/lib/encryption/find', () => ({
  findOneWithDecryption: jest.fn(async () => ({ name: 'Sam', email: 'sam@example.test' })),
}))

import { GET } from '../route'

const widget = (id: string) => ({ metadata: { id, title: id, features: [] } })

function request(): Request {
  return new Request('http://localhost/api/dashboards/layout')
}

beforeEach(() => {
  jest.clearAllMocks()
  em.fork.mockReturnValue(em)
  em.findOne.mockResolvedValue(layoutRow)
  em.find.mockResolvedValue([])
  rbac.loadAcl.mockResolvedValue({ features: [], isSuperAdmin: false })
})

describe('registeredWidgetCount', () => {
  it('counts widgets the installation has, even when the caller may see none', async () => {
    // The exact shape of the reported bug, inverted: widgets exist, this caller
    // is allowed none. The client must still be told they exist.
    loadAllWidgetsMock.mockResolvedValue([widget('a'), widget('b')])
    resolveAllowedWidgetIdsMock.mockResolvedValue([])

    const body = await (await GET(request())).json()

    expect(body.registeredWidgetCount).toBe(2)
    expect(body.widgets).toHaveLength(0)
  })

  it('reports zero when every widget has been disabled by an override', async () => {
    // `loadAllWidgets` is already post-override, so a fully disabled install
    // returns nothing — and this is the case the client could not detect.
    loadAllWidgetsMock.mockResolvedValue([])
    resolveAllowedWidgetIdsMock.mockResolvedValue([])

    const body = await (await GET(request())).json()

    expect(body.registeredWidgetCount).toBe(0)
  })

  it('is not reduced by ACL filtering', async () => {
    // Stated separately because the tempting simplification — reusing the
    // already-filtered `allowedWidgets.length` — reintroduces the bug for every
    // user who simply lacks a permission.
    loadAllWidgetsMock.mockResolvedValue([widget('a'), widget('b'), widget('c')])
    resolveAllowedWidgetIdsMock.mockResolvedValue(['a'])

    const body = await (await GET(request())).json()

    expect(body.registeredWidgetCount).toBe(3)
    expect(body.allowedWidgetIds).toEqual(['a'])
  })
})
