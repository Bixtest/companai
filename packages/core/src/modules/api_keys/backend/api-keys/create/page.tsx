"use client"
import * as React from 'react'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { CrudForm, type CrudField, type CrudFormGroup } from '@open-mercato/ui/backend/CrudForm'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { createCrud } from '@open-mercato/ui/backend/utils/crud'
import { createCrudFormError } from '@open-mercato/ui/backend/utils/serverErrors'
import { OrganizationSelect } from '@open-mercato/core/modules/directory/components/OrganizationSelect'
import { fetchRoleOptions } from '@open-mercato/core/modules/auth/backend/users/roleOptions'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { Button } from '@open-mercato/ui/primitives/button'
import { useRouter } from 'next/navigation'
import { useOrganizationScopeDetail, useOrganizationScopeVersion } from '@open-mercato/shared/lib/frontend/useOrganizationScope'
import { useT } from '@open-mercato/shared/lib/i18n/context'

type FormValues = {
  name: string
  description: string | null
  organizationId: string | null
  expiresAt: string | null
  roles: string[]
  /**
   * The "AI user" tick. A **boolean** in the form and a **string** on the wire:
   * the server's `principalKind` accepts `'service' | 'ai_worker'`, and the
   * form converts the tick in `onSubmit`. Unticked means the field is not sent
   * at all, which the server reads as `service` — the same value every key had
   * before the column existed.
   */
  isAiWorker: boolean
}

export default function CreateApiKeyPage() {
  const [createdSecret, setCreatedSecret] = React.useState<{ secret: string; keyPrefix: string } | null>(null)
  const [actorIsSuperAdmin, setActorIsSuperAdmin] = React.useState(false)
  const [actorResolved, setActorResolved] = React.useState(false)
  const [selectedTenantId, setSelectedTenantId] = React.useState<string | null>(null)
  const router = useRouter()
  const scopeDetail = useOrganizationScopeDetail()
  const scopeVersion = useOrganizationScopeVersion()
  const t = useT()

  React.useEffect(() => {
    let cancelled = false
    async function loadInitialScope() {
      try {
        const { ok, result } = await apiCall<{ tenantId?: string; isSuperAdmin?: boolean }>(
          '/api/directory/organization-switcher',
        )
        if (!ok || cancelled) {
          if (!ok && !cancelled) setActorIsSuperAdmin(false)
          return
        }
        const rawTenant = typeof result?.tenantId === 'string' ? result.tenantId : null
        const normalizedTenant = rawTenant && rawTenant.trim().length > 0 ? rawTenant.trim() : null
        setSelectedTenantId(normalizedTenant)
        setActorIsSuperAdmin(Boolean(result?.isSuperAdmin))
      } catch {
        if (!cancelled) setActorIsSuperAdmin(false)
      } finally {
        if (!cancelled) setActorResolved(true)
      }
    }
    loadInitialScope()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (scopeVersion === 0) return
    const rawTenant = scopeDetail.tenantId
    const normalizedTenant = typeof rawTenant === 'string' && rawTenant.trim().length > 0 ? rawTenant.trim() : null
    setSelectedTenantId((prev) => {
      if ((prev ?? null) === (normalizedTenant ?? null)) return prev
      return normalizedTenant
    })
  }, [scopeDetail.tenantId, scopeVersion])

  // Block role loading until we know whether the actor is a super admin. Without this guard the
  // initial (non-super-admin) branch fires before the flag resolves and the server returns roles
  // from other tenants because the real caller is a super admin without tenantId scoping.
  const loadRoleOptions = React.useCallback(async (query?: string) => {
    if (!actorResolved) return []
    if (actorIsSuperAdmin) {
      const tenant = typeof selectedTenantId === 'string' && selectedTenantId.trim().length > 0 ? selectedTenantId.trim() : null
      if (!tenant) return []
      return fetchRoleOptions(query, { tenantId: tenant })
    }
    return fetchRoleOptions(query)
  }, [actorIsSuperAdmin, actorResolved, selectedTenantId])

  const fields = React.useMemo<CrudField[]>(() => [
    { id: 'name', label: t('api_keys.form.name'), type: 'text', required: true },
    { id: 'description', label: t('api_keys.form.description'), type: 'textarea', description: t('api_keys.form.descriptionHint') },
    {
      id: 'organizationId',
      label: t('api_keys.form.organization'),
      required: false,
      type: 'custom',
      component: ({ id, value, setValue }) => (
        <OrganizationSelect
          id={id}
          value={typeof value === 'string' ? value : null}
          onChange={(next) => setValue(next ?? null)}
          includeEmptyOption
          emptyOptionLabel={t('api_keys.form.organizationPlaceholder')}
          className="w-full h-9 rounded border px-2 text-sm"
        />
      ),
    },
    {
      id: 'roles',
      label: t('api_keys.form.roles'),
      type: 'tags',
      loadOptions: loadRoleOptions,
      description: t('api_keys.form.rolesHint'),
    },
    {
      /**
       * The "AI user" tick (CC-26). The server has accepted
       * `principal_kind = 'ai_worker'` since the column landed
       * (`api_keys/data/entities.ts`, `data/validators.ts`, `api/keys/route.ts`),
       * but no shipped page could set it — so the only way to mint an AI worker
       * was a direct API or CLI call. This is the missing **UI for a server
       * capability that already exists**, not a new procedure.
       *
       * The tick is a boolean here and the wire value is a string, so `onSubmit`
       * does the conversion; see the note on `FormValues.isAiWorker`.
       */
      id: 'isAiWorker',
      label: t('api_keys.form.isAiWorker'),
      type: 'checkbox',
      description: t('api_keys.form.isAiWorkerHint'),
    },
    {
      /**
       * Revealed only when the tick is on (`visibleWhen`). `CrudForm` excludes a
       * hidden field from validation and from the submitted values, so an unticked
       * form neither validates nor sends this — and unticking after reading it
       * removes it from the payload.
       *
       * Rendered as a `custom` field rather than a read-only `textarea`: a textarea
       * needs a *value* to show, and this is a static note with no value to store
       * (a read-only empty textarea would render blank). A custom component renders
       * the explanatory text and writes nothing.
       *
       * What it states is a **fact about the current server contract**, not a
       * planned feature: an `ai_worker` key issues the subject `ai_worker:<id>`
       * instead of `api_key:<id>`, so the resolver, the journal and the ledger
       * classify everything it does as a machine. Roles are granted the same way a
       * human's are (`roles_json`). It does **not** yet bind the key to an agent —
       * that is CC-27, deliberately not claimed here.
       */
      id: 'aiWorkerNotice',
      label: t('api_keys.form.aiWorkerNotice'),
      type: 'custom',
      visibleWhen: { field: 'isAiWorker', equals: true },
      component: () => (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          {t('api_keys.form.aiWorkerNoticeHint')}
        </p>
      ),
    },
    { id: 'expiresAt', label: t('api_keys.form.expiresAt'), type: 'date', description: t('api_keys.form.expiresHint') },
  ], [loadRoleOptions, t])

  const groups = React.useMemo<CrudFormGroup[]>(() => ([
    { id: 'details', title: t('api_keys.form.details'), column: 1, fields: ['name', 'description', 'organizationId', 'roles', 'isAiWorker', 'aiWorkerNotice', 'expiresAt'] },
  ]), [t])

  if (createdSecret) {
    return (
      <Page>
        <PageBody>
          <div className="flex items-center justify-center">
            <div className="w-full max-w-2xl rounded-xl border bg-card shadow-sm">
              <div className="border-b p-6">
                <h1 className="text-lg font-semibold leading-7">{t('api_keys.copy.title')}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('api_keys.copy.subtitle')}
                </p>
              </div>
              <div className="space-y-4 p-6">
                <div className="rounded-md border bg-muted/50 p-4 font-mono text-sm break-all">
                  {createdSecret.secret}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center rounded-full border px-2 py-1 font-medium">
                    {t('api_keys.copy.prefix', { prefix: createdSecret.keyPrefix })}
                  </span>
                  <span>{t('api_keys.copy.warning')}</span>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => router.push('/backend/api-keys')}>
                    {t('common.close')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
      </PageBody>
    </Page>
    )
  }

  return (
    <Page>
      <PageBody>
        <div className="space-y-6">
          <CrudForm<FormValues>
            title={t('api_keys.form.title')}
            backHref="/backend/api-keys"
            fields={fields}
            groups={groups}
            initialValues={{ name: '', description: null, organizationId: null, roles: [], expiresAt: null, isAiWorker: false }}
            submitLabel={t('common.create')}
            cancelHref="/backend/api-keys"
            onSubmit={async (values) => {
              const payload: {
                name: string
                description: string | null
                organizationId: string | null
                roles: string[]
                expiresAt: string | null
                tenantId?: string | null
                principalKind?: 'ai_worker'
              } = {
                name: values.name,
                description: values.description || null,
                organizationId: values.organizationId || null,
                roles: Array.isArray(values.roles) ? values.roles : [],
                expiresAt: values.expiresAt || null,
              }
              // The tick is a boolean; the server wants the kind. Sent only when
              // ticked: an unticked form omits the key entirely, which the server
              // reads as `service` — the same shape as every pre-existing key.
              // (`aiWorkerNotice` is deliberately not sent because it is a read-only
              // note with no server field. Measured, not assumed: the create schema
              // is not `.strict()`, so zod would **strip** an unknown key rather than
              // reject it — and `mapToEntity` reads only named fields. The comment is
              // here so the next reader does not have to re-measure that.)
              if (values.isAiWorker === true) {
                payload.principalKind = 'ai_worker'
              }
              if (actorIsSuperAdmin) {
                const tenant = typeof selectedTenantId === 'string' && selectedTenantId.trim().length > 0 ? selectedTenantId.trim() : null
                if (!tenant) {
                  const message = t('api_keys.errors.tenantRequired')
                  throw createCrudFormError(message, { tenantId: message })
                }
                payload.tenantId = tenant
              }
              const { result } = await createCrud<{ secret?: string; keyPrefix?: string | null }>(
                'api_keys/keys',
                payload,
              )
              const created = result
              if (!created || typeof created.secret !== 'string') {
                throw createCrudFormError(t('api_keys.form.error.secretMissing'))
              }
              const keyPrefix = typeof created.keyPrefix === 'string' ? created.keyPrefix : ''
              setCreatedSecret({ secret: created.secret, keyPrefix })
              flash(t('api_keys.form.success'), 'success')
            }}
          />
        </div>
      </PageBody>
    </Page>
  )
}
