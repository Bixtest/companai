import { ensureOrganizationScope, ensureTenantScope } from '@open-mercato/shared/lib/commands/scope'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { createLogger } from '@open-mercato/shared/lib/logger'

jest.mock('@open-mercato/shared/lib/logger', () => {
  const mocked = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(),
  }
  mocked.child.mockImplementation(() => mocked)
  return { createLogger: jest.fn(() => mocked) }
})
const loggerWarn = createLogger('shared').warn as jest.Mock


type ScopeShape = NonNullable<CommandRuntimeContext['organizationScope']>

function buildCtx(overrides: {
  isSuperAdmin?: boolean
  tenantId?: string | null
  orgId?: string | null
  selectedOrganizationId?: string | null
  organizationScope?: ScopeShape | null
  systemActor?: boolean
}): CommandRuntimeContext {
  return {
    container: {} as CommandRuntimeContext['container'],
    auth: {
      sub: 'user-1',
      tenantId: overrides.tenantId === undefined ? 'tenant-1' : overrides.tenantId,
      orgId: overrides.orgId ?? null,
      isSuperAdmin: overrides.isSuperAdmin ?? false,
    },
    organizationScope: overrides.organizationScope ?? null,
    selectedOrganizationId: overrides.selectedOrganizationId ?? null,
    organizationIds: null,
    systemActor: overrides.systemActor,
  }
}

function buildScope(overrides: Partial<ScopeShape>): ScopeShape {
  return {
    selectedId: null,
    filterIds: null,
    allowedIds: null,
    tenantId: 'tenant-1',
    ...overrides,
  }
}

describe('ensureTenantScope', () => {
  it('denies a tenant-less non-superadmin acting on a tenant-scoped target (#3910)', () => {
    const ctx = buildCtx({ tenantId: null, isSuperAdmin: false })
    expect(() => ensureTenantScope(ctx, 'tenant-2')).toThrow(CrudHttpError)
  })

  it('allows super admins with no tenant context to act on tenant-scoped targets', () => {
    const ctx = buildCtx({ tenantId: null, isSuperAdmin: true })
    expect(() => ensureTenantScope(ctx, 'tenant-2')).not.toThrow()
  })

  it('preserves legacy system contexts without an authenticated actor', () => {
    const ctx = { ...buildCtx({}), auth: null }
    expect(() => ensureTenantScope(ctx, 'tenant-2')).not.toThrow()
  })

  it('denies authenticated tenant-less systemActor contexts unless they are superadmin (#3910)', () => {
    const ctx = buildCtx({ tenantId: null, isSuperAdmin: false, systemActor: true })
    expect(() => ensureTenantScope(ctx, 'tenant-2')).toThrow(CrudHttpError)
  })

  it('allows a scoped principal acting inside its own tenant', () => {
    const ctx = buildCtx({ tenantId: 'tenant-1' })
    expect(() => ensureTenantScope(ctx, 'tenant-1')).not.toThrow()
  })
})

describe('ensureOrganizationScope', () => {
  it('denies a restricted floating user acting on an org outside allowedIds (#2239)', () => {
    const ctx = buildCtx({
      orgId: null,
      selectedOrganizationId: null,
      organizationScope: buildScope({ allowedIds: ['org-a'], filterIds: ['org-a'] }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-b')).toThrow(CrudHttpError)
  })

  it('allows super admins', () => {
    const ctx = buildCtx({
      isSuperAdmin: true,
      organizationScope: buildScope({ allowedIds: ['org-a'] }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
  })

  it('allows truly unrestricted scope (allowedIds === null)', () => {
    const ctx = buildCtx({
      organizationScope: buildScope({ allowedIds: null }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
  })

  it('denies null-tenant organization scope for a non-superadmin (#3910)', () => {
    const ctx = buildCtx({
      tenantId: null,
      organizationScope: buildScope({ tenantId: null, allowedIds: null, filterIds: null }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-b')).toThrow(CrudHttpError)
  })

  it('allows null-tenant organization scope for a superadmin', () => {
    const ctx = buildCtx({
      tenantId: null,
      isSuperAdmin: true,
      organizationScope: buildScope({ tenantId: null, allowedIds: null, filterIds: null }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
  })

  it('preserves null-tenant organization scope for system contexts without an authenticated actor', () => {
    const ctx = {
      ...buildCtx({
        tenantId: null,
        organizationScope: buildScope({ tenantId: null, allowedIds: null, filterIds: null }),
      }),
      auth: null,
    }
    expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
  })

  it('denies authenticated null-tenant systemActor organization scopes unless they are superadmin (#3910)', () => {
    const ctx = buildCtx({
      tenantId: null,
      systemActor: true,
      organizationScope: buildScope({ tenantId: null, allowedIds: null, filterIds: null }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-b')).toThrow(CrudHttpError)
  })

  it('allows a restricted user acting on an org inside allowedIds (allow-path regression)', () => {
    const ctx = buildCtx({
      orgId: 'org-a',
      organizationScope: buildScope({ allowedIds: ['org-a'], filterIds: ['org-a'] }),
    })
    expect(() => ensureOrganizationScope(ctx, 'org-a')).not.toThrow()
  })

  describe('absent organization scope (Pattern C — legacy fallback, not deny)', () => {
    it('allows when no current org can be resolved', () => {
      const ctx = buildCtx({ orgId: null, selectedOrganizationId: null, organizationScope: null })
      expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
    })

    it('allows when the resolved current org matches the target', () => {
      const ctx = buildCtx({ selectedOrganizationId: 'org-a', organizationScope: null })
      expect(() => ensureOrganizationScope(ctx, 'org-a')).not.toThrow()
    })

    it('denies when the resolved current org differs from the target', () => {
      const ctx = buildCtx({ selectedOrganizationId: 'org-a', organizationScope: null })
      expect(() => ensureOrganizationScope(ctx, 'org-b')).toThrow(CrudHttpError)
    })
  })

  describe('fail-open-by-omission hardening (#2441)', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalStrict = process.env.OM_ENFORCE_ORG_SCOPE_STRICT
    beforeEach(() => {
      // The scope loggers suppress output under NODE_ENV==='test'; flip it so the
      // observability signal becomes assertable, then restore in afterEach.
      process.env.NODE_ENV = 'development'
      loggerWarn.mockClear()
    })

    afterEach(() => {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = originalNodeEnv
      if (originalStrict === undefined) delete process.env.OM_ENFORCE_ORG_SCOPE_STRICT
      else process.env.OM_ENFORCE_ORG_SCOPE_STRICT = originalStrict
    })

    it('emits an observability warning when scope and currentOrg are both null', () => {
      delete process.env.OM_ENFORCE_ORG_SCOPE_STRICT
      const ctx = buildCtx({ orgId: null, selectedOrganizationId: null, organizationScope: null })
      expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
      expect(loggerWarn).toHaveBeenCalledWith(
        'Unscoped organization command executed without organization context',
        expect.objectContaining({ targetOrganizationId: 'org-b', strictEnforcement: false })
      )
    })

    it('throws when OM_ENFORCE_ORG_SCOPE_STRICT is enabled', () => {
      process.env.OM_ENFORCE_ORG_SCOPE_STRICT = 'true'
      const ctx = buildCtx({ orgId: null, selectedOrganizationId: null, organizationScope: null })
      expect(() => ensureOrganizationScope(ctx, 'org-b')).toThrow(CrudHttpError)
      expect(loggerWarn).toHaveBeenCalledWith(
        'Unscoped organization command executed without organization context',
        expect.objectContaining({ targetOrganizationId: 'org-b', strictEnforcement: true })
      )
    })

    it('does not warn or throw when there is no target organization to validate', () => {
      delete process.env.OM_ENFORCE_ORG_SCOPE_STRICT
      const ctx = buildCtx({ orgId: null, selectedOrganizationId: null, organizationScope: null })
      expect(() => ensureOrganizationScope(ctx, '')).not.toThrow()
      expect(loggerWarn).not.toHaveBeenCalled()
    })
  })
})

/**
 * `T-27` — the unscoped tenant path becomes observable, and closable by flag.
 *
 * **The finding, stated as a sentence the tests can hold.** `ensureTenantScope`'s deny branch was guarded
 * by `ctx.auth &&`, so a caller with **no auth object at all** landed on a silent `return` while a caller
 * with `auth: { tenantId: null }` was refused. Absence of context was trusted more than an empty one.
 *
 * **The allow is deliberate and unchanged** — the legacy test below stays exactly as it was; these tests
 * add what was missing, they do not reverse a decision. The payment and scheduled-command flows use the
 * scope-less path, so the deny direction is a flag (`OM_ENFORCE_TENANT_SCOPE_STRICT`), mirroring the
 * organisation half from #2441.
 */
describe('T-27 — the unscoped tenant path is observable and closable', () => {
  const originalStrict = process.env.OM_ENFORCE_TENANT_SCOPE_STRICT
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Same reason #2441's block flips it: the scope loggers suppress output under NODE_ENV==='test', so
    // the observability signal is unassertable without this. Restored in afterEach.
    process.env.NODE_ENV = 'development'
    loggerWarn.mockClear()
    delete process.env.OM_ENFORCE_TENANT_SCOPE_STRICT
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalStrict === undefined) delete process.env.OM_ENFORCE_TENANT_SCOPE_STRICT
    else process.env.OM_ENFORCE_TENANT_SCOPE_STRICT = originalStrict
  })

  /** The logger is silenced outside `NODE_ENV === 'test'`, so the assertion is on the captured payload. */
  function unscopedWarnings() {
    return loggerWarn.mock.calls.filter((call) => String(call[0]).includes('Unscoped tenant command'))
  }

  it('★ still allows the legacy scope-less context — and says so out loud', () => {
    const ctx = { ...buildCtx({}), auth: null }

    expect(() => ensureTenantScope(ctx, 'tenant-2')).not.toThrow()

    // The behaviour did not change; the silence did. A pass nobody can see is the part that cannot be
    // acted on, and this is the whole of `T-27`.
    const warnings = unscopedWarnings()
    expect(warnings).toHaveLength(1)
    expect(warnings[0][1]).toMatchObject({ targetTenantId: 'tenant-2', strictEnforcement: false })
  })

  it('★ is refused when the operator hardens the deployment', () => {
    process.env.OM_ENFORCE_TENANT_SCOPE_STRICT = 'true'
    const ctx = { ...buildCtx({}), auth: null }

    expect(() => ensureTenantScope(ctx, 'tenant-2')).toThrow(CrudHttpError)
    expect(unscopedWarnings()).toHaveLength(1)
  })

  it('★ logs the strict state, so a reader can tell which deployment they are in', () => {
    process.env.OM_ENFORCE_TENANT_SCOPE_STRICT = '1'
    const ctx = { ...buildCtx({}), auth: null }
    expect(() => ensureTenantScope(ctx, 'tenant-2')).toThrow(CrudHttpError)

    // The payload names the deployment it ran in — a reader of the log can tell whether this pass was a
    // warning or a refusal without knowing the operator's config.
    expect(unscopedWarnings()[0][1]).toMatchObject({ strictEnforcement: true })
  })

  it('a present but tenant-less auth is still refused, exactly as #3910 left it', () => {
    // Unchanged behaviour, asserted beside the new one: the new path is for the ABSENT object, not for a
    // context that exists and is merely empty.
    const ctx = buildCtx({ tenantId: null, isSuperAdmin: false })
    expect(() => ensureTenantScope(ctx, 'tenant-2')).toThrow(CrudHttpError)
    expect(unscopedWarnings()).toHaveLength(0)
  })

  it('says nothing at all when there is no target tenant to check', () => {
    const ctx = { ...buildCtx({}), auth: null }
    expect(() => ensureTenantScope(ctx, '')).not.toThrow()
    expect(unscopedWarnings()).toHaveLength(0)
  })

  it('★ an ABSENT auth object cannot claim superadmin, and that is the finding in miniature', () => {
    // The existing test allows a superadmin with no tenant — but it builds an auth object carrying
    // `isSuperAdmin: true`. Strip the object and the privilege is unknowable, so the unscoped path logs.
    // Every caller that forgot to wire auth is in exactly this position.
    const ctx = { ...buildCtx({ tenantId: null, isSuperAdmin: true }), auth: null }
    expect(() => ensureTenantScope(ctx, 'tenant-2')).not.toThrow()
    expect(unscopedWarnings()).toHaveLength(1)
  })

  it('★ the organisation half gets the same treatment on its line-128 branch', () => {
    const ctx = {
      ...buildCtx({}),
      auth: null,
      // tenantId null is what makes this the line-128 branch; allowedIds null is what makes it an allow.
      organizationScope: buildScope({ tenantId: null, allowedIds: null }),
    }
    expect(() => ensureOrganizationScope(ctx, 'org-b')).not.toThrow()
    expect(
      loggerWarn.mock.calls.filter((call) => String(call[0]).includes('Unscoped organization command')),
    ).toHaveLength(1)
  })
})
