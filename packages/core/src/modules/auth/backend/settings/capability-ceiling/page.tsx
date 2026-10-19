"use client"
import * as React from 'react'
import { Page, PageBody, PageHeader } from '@open-mercato/ui/backend/Page'
import { Button } from '@open-mercato/ui/primitives/button'
import { useOptionalT } from '@open-mercato/shared/lib/i18n/context'

/**
 * `CC-139` — the capability ceiling, as a page.
 *
 * **What this screen is for.** The deployment can *enforce* a ceiling on what any tenant may ever be
 * granted (`CC-128`) and, since `CC-135`, it can be *changed* over HTTP. Until this page it could only be
 * changed from a terminal or by hand-written requests, so the one control that bounds every tenant was
 * the one control nobody could see.
 *
 * **Three rules it follows, each of which is a test in `__tests__/capability-ceiling.page.test.tsx`:**
 *
 * 1. **It writes through the route, never the service.** The route is what records *who* changed the
 *    ceiling. Calling the library directly would produce a change with no actor, which is the defect
 *    `CC-135` existed to fix.
 * 2. **It shows the route's message, not its status.** The library refuses an empty ceiling (it is
 *    indistinguishable from *no ceiling*, and no ceiling means *inherit*) and refuses a tenant ceiling
 *    that is not a subset of the platform's. Both arrive as a 400 with a sentence an operator can act on;
 *    showing "400" would just make them try again.
 * 3. **Inheriting and having-your-own are different facts.** A tenant with no ceiling of its own reports
 *    `source: 'platform'`, and the screen says so instead of rendering the inherited set as if it were
 *    that tenant's own — because only one of those two states is editable here.
 *
 * **It does not assume the wildcard.** The catalogue comes from `/api/auth/capability-ceiling/catalogue`,
 * gated by the same capability as this page, rather than from the ACL editor's endpoint — `CC-134`'s
 * lesson was that a permission arriving through `*` must not be relied on to arrive at all.
 *
 * optimistic-lock-exempt: the ceiling is a **set of rows**, one per capability, not one versioned row — a
 * save replaces N of them, so there is no single `updatedAt` an expected-version header could carry. The
 * exemption is not a claim that concurrent edits are safe: two administrators saving at once keep the
 * last write, and that lost update is registered as **`CC-140`** rather than papered over with a header
 * that would mean nothing. `packages/core/src/__tests__/optimistic-lock-ui-coverage.test.ts` is the guard
 * that asked, and this line is the documented answer it accepts.
 */
const PLATFORM_SCOPE = 'platform'
const CATALOGUE_URL = '/api/auth/capability-ceiling/catalogue'
const CEILING_URL = '/api/auth/capability-ceiling'
const TENANTS_URL = '/api/directory/tenants?page=1&pageSize=200'

export function tenantCeilingUrl(tenantId: string): string {
  return `${CEILING_URL}/tenant/${encodeURIComponent(tenantId)}`
}

type CatalogueItem = { id: string; title: string; module: string }
type Catalogue = { items: CatalogueItem[]; modules: Array<{ id: string; title: string }> }
type Ceiling = {
  scope: 'platform' | 'tenant'
  tenantId?: string
  source: 'platform' | 'tenant'
  capabilities: string[]
}
type TenantOption = { id: string; name: string }

type ReadResult<T> = { ok: true; body: T } | { ok: false; status: number; message: string }

async function readJson<T>(url: string): Promise<ReadResult<T>> {
  try {
    const response = await fetch(url, { credentials: 'include' })
    const body = (await response.json().catch(() => null)) as any
    if (!response.ok) {
      return { ok: false, status: response.status, message: messageOf(body, response.status) }
    }
    return { ok: true, body: body as T }
  } catch {
    return { ok: false, status: 0, message: 'Could not reach the server.' }
  }
}

/** The route's own sentence when it sent one, otherwise something a person can read. */
function messageOf(body: unknown, status: number): string {
  const error = (body as { error?: unknown } | null)?.error
  if (typeof error === 'string' && error.trim()) return error
  return `The server refused the request (${status}).`
}

function sortedSet(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const left = sortedSet(a)
  const right = sortedSet(b)
  return left.every((value, index) => value === right[index])
}

export function CapabilityCeilingPage() {
  const t = useOptionalT()
  const tr = React.useCallback(
    (key: string, fallback: string) => (t ? t(key, fallback) : fallback),
    [t],
  )

  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(null)
  const [tenants, setTenants] = React.useState<TenantOption[]>([])
  const [scope, setScope] = React.useState<string>(PLATFORM_SCOPE)
  const [ceiling, setCeiling] = React.useState<Ceiling | null>(null)
  const [selected, setSelected] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const ceilingUrlFor = React.useCallback(
    (next: string) => (next === PLATFORM_SCOPE ? CEILING_URL : tenantCeilingUrl(next)),
    [],
  )

  const loadCeiling = React.useCallback(
    async (next: string) => {
      setLoading(true)
      setError(null)
      setNotice(null)
      const result = await readJson<Ceiling>(ceilingUrlFor(next))
      if (result.ok) {
        setCeiling(result.body)
        setSelected(sortedSet(result.body.capabilities ?? []))
      } else {
        setCeiling(null)
        setSelected([])
        setError(result.message)
      }
      setLoading(false)
    },
    [ceilingUrlFor],
  )

  React.useEffect(() => {
    let cancelled = false
    async function boot() {
      const [catalogueResult, tenantsResult] = await Promise.all([
        readJson<Catalogue>(CATALOGUE_URL),
        readJson<{ items?: Array<{ id?: string; name?: string }> }>(TENANTS_URL),
      ])
      if (cancelled) return
      if (catalogueResult.ok) setCatalogue(catalogueResult.body)
      else setError(catalogueResult.message)
      if (tenantsResult.ok) {
        setTenants(
          (tenantsResult.body.items ?? []).reduce<TenantOption[]>((acc, item) => {
            if (typeof item?.id === 'string' && item.id) {
              acc.push({ id: item.id, name: typeof item.name === 'string' ? item.name : item.id })
            }
            return acc
          }, []),
        )
      }
      await loadCeiling(PLATFORM_SCOPE)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [loadCeiling])

  const onScopeChange = React.useCallback(
    (next: string) => {
      setScope(next)
      void loadCeiling(next)
    },
    [loadCeiling],
  )

  const toggle = React.useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : sortedSet([...current, id]),
    )
  }, [])

  const setModule = React.useCallback((ids: string[], on: boolean) => {
    setSelected((current) => (on ? sortedSet([...current, ...ids]) : current.filter((value) => !ids.includes(value))))
  }, [])

  const dirty = ceiling ? !sameSet(selected, ceiling.capabilities ?? []) : false

  async function save() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(ceilingUrlFor(scope), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ capabilities: sortedSet(selected) }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(messageOf(body, response.status))
        return
      }
      const written = body as Ceiling
      setCeiling(written)
      setSelected(sortedSet(written.capabilities ?? []))
      setNotice(tr('auth.ceiling.saved', 'Ceiling saved.'))
    } catch {
      setError(tr('auth.ceiling.unreachable', 'Could not reach the server.'))
    } finally {
      setSaving(false)
    }
  }

  const moduleGroups = React.useMemo(() => {
    if (!catalogue) return []
    const byModule = new Map<string, CatalogueItem[]>()
    for (const item of catalogue.items) {
      const list = byModule.get(item.module) ?? []
      list.push(item)
      byModule.set(item.module, list)
    }
    const titles = new Map(catalogue.modules.map((m) => [m.id, m.title]))
    const needle = search.trim().toLowerCase()
    return Array.from(byModule.entries())
      .map(([moduleId, items]) => ({
        id: moduleId,
        title: titles.get(moduleId) ?? moduleId,
        items: needle
          ? items.filter(
              (item) =>
                item.id.toLowerCase().includes(needle) || item.title.toLowerCase().includes(needle),
            )
          : items,
      }))
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [catalogue, search])

  const scopeLabel =
    scope === PLATFORM_SCOPE
      ? tr('auth.ceiling.scope.platform', 'Platform — bounds every tenant')
      : tenants.find((tenant) => tenant.id === scope)?.name ?? scope

  const inherits = ceiling?.source === 'platform'

  return (
    <Page>
      <PageBody>
        <PageHeader
          title={tr('auth.ceiling.title', 'Capability ceiling')}
          description={tr(
            'auth.ceiling.description',
            'The capabilities this deployment allows at all. A tenant with no ceiling of its own inherits this set.',
          )}
        />

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{tr('auth.ceiling.scope', 'Scope')}</span>
            <select
              aria-label={tr('auth.ceiling.scope', 'Scope')}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={scope}
              onChange={(event) => onScopeChange(event.target.value)}
            >
              <option value={PLATFORM_SCOPE}>
                {tr('auth.ceiling.scope.platformOption', 'Platform (every tenant)')}
              </option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{tr('auth.ceiling.search', 'Search')}</span>
            <input
              aria-label={tr('auth.ceiling.search', 'Search')}
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tr('auth.ceiling.searchPlaceholder', 'Filter by capability or title')}
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || saving}
              onClick={() => setSelected(sortedSet(ceiling?.capabilities ?? []))}
            >
              {tr('auth.ceiling.reset', 'Reset')}
            </Button>
            <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? tr('auth.ceiling.saving', 'Saving…') : tr('auth.ceiling.save', 'Save ceiling')}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground" data-testid="ceiling-summary">
          {loading
            ? tr('auth.ceiling.loading', 'Loading…')
            : `${tr('auth.ceiling.selected', 'Selected')}: ${selected.length} · ${scopeLabel}`}
        </p>

        {inherits && scope !== PLATFORM_SCOPE ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {tr(
              'auth.ceiling.inherits',
              'This tenant has no ceiling of its own — it inherits the platform ceiling shown here. Saving gives it one.',
            )}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </p>
        ) : null}

        <div className="space-y-4">
          {moduleGroups.map((group) => {
            const ids = group.items.map((item) => item.id)
            const allOn = ids.every((id) => selected.includes(id))
            return (
              <section key={group.id} className="rounded-lg border border-border p-3">
                <header className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{group.title}</h2>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setModule(ids, !allOn)}>
                    {allOn
                      ? tr('auth.ceiling.clearModule', 'Clear all')
                      : tr('auth.ceiling.selectModule', 'Select all')}
                  </Button>
                </header>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        id={`cap-${item.id}`}
                        checked={selected.includes(item.id)}
                        onChange={() => toggle(item.id)}
                      />
                      <label htmlFor={`cap-${item.id}`} className="cursor-pointer">
                        <span className="font-medium">{item.title}</span>{' '}
                        <code className="text-xs text-muted-foreground">{item.id}</code>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </PageBody>
    </Page>
  )
}

export default CapabilityCeilingPage
