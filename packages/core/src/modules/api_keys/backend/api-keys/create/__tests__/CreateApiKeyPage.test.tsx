/**
 * @jest-environment jsdom
 */
import * as React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import CreateApiKeyPage from '../page'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { createCrud } from '@open-mercato/ui/backend/utils/crud'
import { fetchRoleOptions } from '@open-mercato/core/modules/auth/backend/users/roleOptions'

/**
 * The page's success screen renders `t('api_keys.copy.prefix', { prefix })`, so the
 * translate stub must turn a params object into a string — returning the params object
 * itself makes React throw "Objects are not valid as a React child" once a submit
 * succeeds. The earlier tests in this file never reached the success screen, so this
 * only surfaced when the CC-26 tests began driving `onSubmit`.
 */
const mockTranslate = (key: string, fallback?: string | Record<string, unknown>) => {
  if (fallback && typeof fallback === 'object') {
    return Object.entries(fallback)
      .map(([name, value]) => `${name}=${String(value)}`)
      .join(' ')
  }
  return typeof fallback === 'string' ? fallback : key
}
const mockPush = jest.fn()

jest.mock('@open-mercato/shared/lib/i18n/context', () => ({
  useT: () => mockTranslate,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('@open-mercato/ui/backend/Page', () => ({
  Page: ({ children }: any) => <div>{children}</div>,
  PageBody: ({ children }: any) => <div>{children}</div>,
}))

type CapturedField = {
  id: string
  type?: string
  visibleWhen?: { field: string; equals: string | number | boolean }
  loadOptions?: (query?: string) => Promise<unknown>
}
type CapturedGroup = { id: string; fields?: Array<string | { id: string }> }
let capturedFields: CapturedField[] = []
let capturedGroups: CapturedGroup[] = []
let capturedOnSubmit: ((values: unknown) => Promise<void>) | undefined

jest.mock('@open-mercato/ui/backend/CrudForm', () => ({
  CrudForm: (props: any) => {
    capturedFields = Array.isArray(props.fields) ? props.fields : []
    capturedGroups = Array.isArray(props.groups) ? props.groups : []
    capturedOnSubmit = typeof props.onSubmit === 'function' ? props.onSubmit : undefined
    return <div data-testid="crud-form-mock" />
  },
}))

jest.mock('@open-mercato/ui/backend/utils/apiCall', () => ({
  apiCall: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/utils/crud', () => ({
  createCrud: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/utils/serverErrors', () => ({
  createCrudFormError: jest.fn(),
}))

jest.mock('@open-mercato/ui/backend/FlashMessages', () => ({
  flash: jest.fn(),
}))

jest.mock('@open-mercato/ui/primitives/button', () => ({
  Button: ({ children }: any) => <button>{children}</button>,
}))

jest.mock('@open-mercato/core/modules/directory/components/OrganizationSelect', () => ({
  OrganizationSelect: () => null,
}))

jest.mock('@open-mercato/core/modules/auth/backend/users/roleOptions', () => ({
  fetchRoleOptions: jest.fn(),
}))

jest.mock('@open-mercato/shared/lib/frontend/useOrganizationScope', () => ({
  useOrganizationScopeDetail: () => ({ tenantId: null, organizationId: null }),
  useOrganizationScopeVersion: () => 0,
}))

function findLoadRoleOptions(): ((query?: string) => Promise<unknown>) | undefined {
  const rolesField = capturedFields.find((field) => field.id === 'roles')
  return rolesField?.loadOptions
}

describe('CreateApiKeyPage — role selector tenant scoping (#1556)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedFields = []
    capturedGroups = []
    capturedOnSubmit = undefined
  })

  it('returns empty options and skips fetchRoleOptions until actor-resolution completes', async () => {
    let resolveActor: (value: any) => void = () => {}
    const actorResolution = new Promise<any>((resolve) => {
      resolveActor = resolve
    })
    ;(apiCall as jest.Mock).mockImplementation(() => actorResolution)
    ;(fetchRoleOptions as jest.Mock).mockResolvedValue([
      { value: 'role-a', label: 'Role A' },
    ])

    render(<CreateApiKeyPage />)

    await waitFor(() => expect(capturedFields.length).toBeGreaterThan(0))

    const loadRoleOptions = findLoadRoleOptions()
    expect(typeof loadRoleOptions).toBe('function')

    // Before the actor-resolution promise settles, the loader MUST return []
    // and MUST NOT invoke fetchRoleOptions — otherwise an unscoped query could
    // leak roles from other tenants when the real caller is a super admin.
    const earlyResult = await loadRoleOptions!()
    expect(earlyResult).toEqual([])
    expect(fetchRoleOptions).not.toHaveBeenCalled()

    // Resolve the actor as a non-super admin. Once the resolution finishes,
    // the loader is allowed to hit the roles endpoint (without tenantId for
    // non-super-admin callers, matching server-side scoping rules).
    await act(async () => {
      resolveActor({ ok: true, result: { tenantId: 'tenant-1', isSuperAdmin: false } })
      await actorResolution
    })

    await waitFor(() => {
      const latest = findLoadRoleOptions()
      expect(latest).not.toBe(loadRoleOptions)
    })

    const resolvedLoader = findLoadRoleOptions()!
    await resolvedLoader()
    expect(fetchRoleOptions).toHaveBeenCalledTimes(1)
    expect(fetchRoleOptions).toHaveBeenCalledWith(undefined)
  })

  it('still blocks the initial call when actor resolution fails (error branch sets actorResolved)', async () => {
    let rejectActor: (reason: unknown) => void = () => {}
    const actorResolution = new Promise<any>((_resolve, reject) => {
      rejectActor = reject
    })
    ;(apiCall as jest.Mock).mockImplementation(() => actorResolution)
    ;(fetchRoleOptions as jest.Mock).mockResolvedValue([])

    render(<CreateApiKeyPage />)

    await waitFor(() => expect(capturedFields.length).toBeGreaterThan(0))

    const earlyLoader = findLoadRoleOptions()!
    expect(await earlyLoader()).toEqual([])
    expect(fetchRoleOptions).not.toHaveBeenCalled()

    await act(async () => {
      rejectActor(new Error('boom'))
      await actorResolution.catch(() => {})
    })

    // After the finally-block flips actorResolved, a fresh loader closure
    // must be produced and the fallback branch is allowed to run.
    await waitFor(() => {
      const latest = findLoadRoleOptions()
      expect(latest).not.toBe(earlyLoader)
    })

    const recoveredLoader = findLoadRoleOptions()!
    await recoveredLoader()
    expect(fetchRoleOptions).toHaveBeenCalledTimes(1)
  })
})

/**
 * CC-26 — the "AI user" tick.
 *
 * The server has accepted `principal_kind = 'ai_worker'` since the column landed
 * (`api_keys/data/entities.ts`, `data/validators.ts`, `api/keys/route.ts`), but no shipped
 * page could set it. These tests pin the UI half: the tick exists, it reveals the
 * machine-only notice, and — the part that actually reaches the server — `onSubmit` sends
 * `principalKind: 'ai_worker'` when ticked and omits it when not.
 */
describe('CreateApiKeyPage — the "AI user" tick (CC-26)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedFields = []
    capturedGroups = []
    capturedOnSubmit = undefined
    ;(apiCall as jest.Mock).mockResolvedValue({
      ok: true,
      result: { tenantId: 'tenant-1', isSuperAdmin: false },
    })
    ;(createCrud as jest.Mock).mockResolvedValue({ result: { secret: 'sk_live_x', keyPrefix: 'sk_live' } })
  })

  async function renderAndCapture() {
    render(<CreateApiKeyPage />)
    await waitFor(() => expect(capturedOnSubmit).toBeDefined())
  }

  it('renders the tick and the machine-only notice, and the notice is revealed only when ticked', async () => {
    await renderAndCapture()

    const tick = capturedFields.find((f) => f.id === 'isAiWorker')
    const notice = capturedFields.find((f) => f.id === 'aiWorkerNotice')

    expect(tick).toBeDefined()
    expect(tick!.type).toBe('checkbox')
    expect(notice).toBeDefined()
    // The reveal is the mechanism under test: tied to the tick, not always-on.
    expect(notice!.visibleWhen).toEqual({ field: 'isAiWorker', equals: true })
  })

  it('includes the tick and the notice in the form group so they are rendered at all', async () => {
    await renderAndCapture()

    // A field that exists but is in no group is not rendered by CrudForm — the same
    // class of mistake as a guard that is registered and never invoked.
    const fieldIds = capturedGroups.flatMap((g) =>
      (g.fields ?? []).map((f) => (typeof f === 'string' ? f : f.id)),
    )
    expect(fieldIds).toContain('isAiWorker')
    expect(fieldIds).toContain('aiWorkerNotice')
  })

  it('sends principalKind: "ai_worker" when the tick is on', async () => {
    await renderAndCapture()

    await act(async () => {
      await capturedOnSubmit!({
        name: 'Runner',
        description: null,
        organizationId: null,
        roles: [],
        expiresAt: null,
        isAiWorker: true,
      })
    })

    expect(createCrud).toHaveBeenCalledTimes(1)
    const [resource, payload] = (createCrud as jest.Mock).mock.calls[0]
    expect(resource).toBe('api_keys/keys')
    expect(payload.principalKind).toBe('ai_worker')
    // The read-only notice is NOT part of the payload — it is display text only.
    expect(payload).not.toHaveProperty('aiWorkerNotice')
    expect(payload).not.toHaveProperty('isAiWorker')
  })

  it('omits principalKind entirely when the tick is off (the server reads absence as "service")', async () => {
    await renderAndCapture()

    await act(async () => {
      await capturedOnSubmit!({
        name: 'Integration',
        description: null,
        organizationId: null,
        roles: [],
        expiresAt: null,
        isAiWorker: false,
      })
    })

    const [, payload] = (createCrud as jest.Mock).mock.calls[0]
    // Not `principalKind: null` and not `'service'` — the key is absent, so the row
    // is shaped exactly like every key issued before the column existed.
    expect(payload).not.toHaveProperty('principalKind')
    expect(payload).not.toHaveProperty('isAiWorker')
  })

  it('treats a missing tick value the same as unticked (no accidental AI-worker mint)', async () => {
    await renderAndCapture()

    await act(async () => {
      await capturedOnSubmit!({
        name: 'Legacy',
        description: null,
        organizationId: null,
        roles: [],
        expiresAt: null,
        // isAiWorker intentionally absent — an older caller shape.
      })
    })

    const [, payload] = (createCrud as jest.Mock).mock.calls[0]
    expect(payload).not.toHaveProperty('principalKind')
  })
})
