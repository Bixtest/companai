/**
 * @jest-environment jsdom
 *
 * `CC-139` — the capability ceiling, as a person meets it.
 *
 * The route, the library and the enforcement are covered elsewhere (`CC-128`, `CC-135`). What is untested
 * until now is whether the screen *says* the right thing: that it writes through the route rather than the
 * service, that it shows the route's **sentence** rather than its status, that *inheriting the platform
 * ceiling* and *having one's own* do not look the same, and that a save cannot happen without a change.
 */
import * as React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@open-mercato/shared/lib/testing/renderWithProviders'

jest.mock('@open-mercato/shared/lib/i18n/context', () => {
  const translate = (key: string, fallback?: string) => (fallback ?? key) as string
  return {
    useT: () => translate,
    useOptionalT: () => translate,
    I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

import { metadata } from '../page.meta'
import { CapabilityCeilingPage, tenantCeilingUrl } from '../page'

const PLATFORM_URL = '/api/auth/capability-ceiling'
const TENANT_ID = '123e4567-e89b-12d3-a456-4266141740aa'

const CATALOGUE = {
  items: [
    { id: 'auth.users.edit', title: 'Edit users', module: 'auth' },
    { id: 'auth.users.list', title: 'List users', module: 'auth' },
    { id: 'directory.tenants.manage', title: 'Manage tenants', module: 'directory' },
  ],
  modules: [
    { id: 'auth', title: 'Auth' },
    { id: 'directory', title: 'Directory' },
  ],
}

const PLATFORM_CEILING = {
  scope: 'platform' as const,
  source: 'platform' as const,
  capabilities: ['auth.users.edit', 'auth.users.list', 'directory.tenants.manage'],
  revision: 'cc140-test-revision',
}

const TENANT_INHERITS = {
  scope: 'tenant' as const,
  tenantId: TENANT_ID,
  source: 'platform' as const,
  capabilities: ['auth.users.edit', 'auth.users.list'],
}

type Call = { url: string; init?: RequestInit }

function installFetch(options: {
  platform?: unknown
  tenant?: unknown
  put?: { status: number; body: unknown }
} = {}) {
  const calls: Call[] = []
  const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const respond = (status: number, body: unknown) =>
      ({ ok: status < 400, status, json: async () => body }) as unknown as Response

    if (init?.method === 'PUT') {
      return respond(options.put?.status ?? 200, options.put?.body ?? JSON.parse(String(init.body)))
    }
    if (url === '/api/auth/capability-ceiling/catalogue') return respond(200, CATALOGUE)
    if (url.startsWith('/api/directory/tenants')) {
      return respond(200, { items: [{ id: TENANT_ID, name: 'Acme' }] })
    }
    if (url.includes('/tenant/')) return respond(200, options.tenant ?? TENANT_INHERITS)
    if (url === PLATFORM_URL) return respond(200, options.platform ?? PLATFORM_CEILING)
    return respond(404, { error: `unexpected ${url}` })
  })
  ;(global as any).fetch = fetchMock
  return { fetchMock, calls }
}

function putCalls(calls: Call[]) {
  return calls.filter((call) => call.init?.method === 'PUT')
}

describe('CC-139 — the ceiling screen', () => {
  it('★ declares the capability that gates it — an undeclared page is an ungated page', () => {
    expect(metadata.requireFeatures).toEqual(['directory.tenants.manage'])
    expect(metadata.requireAuth).toBe(true)
    expect(metadata.pageContext).toBe('settings')
  })

  it('renders every module that has capabilities and ticks the ceiling it loaded', async () => {
    installFetch()
    renderWithProviders(<CapabilityCeilingPage />)

    expect(await screen.findByText('Auth')).toBeTruthy()
    expect(await screen.findByText('Directory')).toBeTruthy()
    // Three capabilities, all on the platform ceiling, so three boxes are ticked.
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes).toHaveLength(3)
    expect(boxes.every((box) => box.checked)).toBe(true)
    expect(screen.getByTestId('ceiling-summary').textContent).toContain('3')
  })

  it('★ writes through the route, with the capabilities it shows, carrying the revision it was given', async () => {
    const { calls } = installFetch()
    renderWithProviders(<CapabilityCeilingPage />)

    const editUsers = (await screen.findByLabelText(/Edit users/)) as HTMLInputElement
    await waitFor(() => expect(editUsers.checked).toBe(true))
    fireEvent.click(editUsers)
    fireEvent.click(screen.getByRole('button', { name: 'Save ceiling' }))

    await waitFor(() => expect(putCalls(calls)).toHaveLength(1))
    const [put] = putCalls(calls)
    expect(put.url).toBe(PLATFORM_URL)
    // `CC-140` — the token is the fingerprint of the set the screen was **given**, so a save against a
    // view that has moved is refused rather than silently discarding the change somebody else made.
    expect(JSON.parse(String(put.init?.body))).toEqual({
      capabilities: ['auth.users.list', 'directory.tenants.manage'],
      expectedRevision: 'cc140-test-revision',
    })
  })

  it('★ a stale view (409) reloads the ceiling and says so — it does not ask for another click', async () => {
    const { calls } = installFetch()
    renderWithProviders(<CapabilityCeilingPage />)

    const editUsers = (await screen.findByLabelText(/Edit users/)) as HTMLInputElement
    await waitFor(() => expect(editUsers.checked).toBe(true))
    fireEvent.click(editUsers)

    // Route answers "the ceiling moved": the write helper returns 409 with a sentence, and the screen
    // must reload rather than leave the person looking at a selection that no longer describes anything.
    ;(global as any).fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const respond = (status: number, body: unknown) =>
        ({ ok: status < 400, status, json: async () => body }) as unknown as Response
      if (init?.method === 'PUT') {
        return respond(409, { error: 'The ceiling changed while you were looking at it. Reload it and apply your edit again.' })
      }
      if (url === '/api/auth/capability-ceiling/catalogue') return respond(200, CATALOGUE)
      if (url.startsWith('/api/directory/tenants')) return respond(200, { items: [] })
      if (url === PLATFORM_URL) return respond(200, PLATFORM_CEILING)
      return respond(404, { error: `unexpected ${url}` })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save ceiling' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('changed while you were looking at it')
    // Reloaded: the second read is what the screen is now showing, so the ticked boxes match the table
    // again rather than the edit that was just refused.
    await waitFor(() => {
      const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
      expect(boxes.every((box) => box.checked)).toBe(true)
    })
  })

  it('★ says that a tenant inherits, and saves to the TENANT url when that scope is chosen', async () => {
    const { calls } = installFetch()
    renderWithProviders(<CapabilityCeilingPage />)

    await screen.findByText('Auth')
    fireEvent.change(screen.getByLabelText('Scope'), { target: { value: TENANT_ID } })

    expect(await screen.findByText(/inherits the platform ceiling/i)).toBeTruthy()

    const listUsers = (await screen.findByLabelText(/List users/)) as HTMLInputElement
    await waitFor(() => expect(listUsers.checked).toBe(true))
    fireEvent.click(listUsers)
    fireEvent.click(screen.getByRole('button', { name: 'Save ceiling' }))

    await waitFor(() => expect(putCalls(calls)).toHaveLength(1))
    // The scope is part of the address, so a mistyped body field cannot reach the platform ceiling.
    expect(putCalls(calls)[0].url).toBe(tenantCeilingUrl(TENANT_ID))
  })

  it('★ shows the route\'s sentence, not its status', async () => {
    installFetch({
      put: { status: 400, body: { error: 'A ceiling with no capabilities is refused: it is indistinguishable from having none.' } },
    })
    renderWithProviders(<CapabilityCeilingPage />)

    const editUsers = (await screen.findByLabelText(/Edit users/)) as HTMLInputElement
    await waitFor(() => expect(editUsers.checked).toBe(true))
    fireEvent.click(editUsers)
    fireEvent.click(screen.getByRole('button', { name: 'Save ceiling' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('indistinguishable from having none')
    expect(alert.textContent).not.toBe('400')
  })

  it('★ cannot save without a change, and Reset puts the loaded set back', async () => {
    installFetch()
    renderWithProviders(<CapabilityCeilingPage />)

    const save = (await screen.findByRole('button', { name: 'Save ceiling' })) as HTMLButtonElement
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(3))
    expect(save.disabled).toBe(true)

    const editUsers = screen.getByLabelText(/Edit users/) as HTMLInputElement
    fireEvent.click(editUsers)
    expect(save.disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect((screen.getByLabelText(/Edit users/) as HTMLInputElement).checked).toBe(true)
  })
})
