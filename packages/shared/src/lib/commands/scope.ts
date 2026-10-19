import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import type { CommandRuntimeContext } from '@open-mercato/shared/lib/commands'
import { isOrganizationAccessAllowed } from '@open-mercato/shared/lib/auth/organizationAccess'
import { parseBooleanWithDefault } from '@open-mercato/shared/lib/boolean'
import { env } from 'process'
import { createLogger } from '../logger'

const logger = createLogger('shared').child({ component: 'scope' })

function buildScopeLogContext(ctx: CommandRuntimeContext) {
  const requestInfo =
    ctx.request && typeof ctx.request === 'object'
      ? {
          method: (ctx.request as Request).method ?? undefined,
          url: (ctx.request as Request).url ?? undefined,
        }
      : null
  const scope = ctx.organizationScope
    ? {
        selectedId: ctx.organizationScope.selectedId ?? null,
        tenantId: ctx.organizationScope.tenantId ?? null,
        allowedIdsCount: Array.isArray(ctx.organizationScope.allowedIds)
          ? ctx.organizationScope.allowedIds.length
          : null,
        filterIdsCount: Array.isArray(ctx.organizationScope.filterIds)
          ? ctx.organizationScope.filterIds.length
          : null,
      }
    : null
  return {
    userId: ctx.auth?.sub ?? null,
    actorTenantId: ctx.auth?.tenantId ?? null,
    actorOrganizationId: ctx.auth?.orgId ?? null,
    selectedOrganizationId: ctx.selectedOrganizationId ?? null,
    organizationIdsCount: Array.isArray(ctx.organizationIds) ? ctx.organizationIds.length : null,
    scope,
    request: requestInfo,
  }
}

function isStrictOrganizationScopeEnforced(): boolean {
  return parseBooleanWithDefault(env.OM_ENFORCE_ORG_SCOPE_STRICT, false)
}

/**
 * `T-27` — the tenant half of the flag #2441 gave the organisation.
 *
 * Defaults to `false`, and that default is **load-bearing, not an oversight**: the scope-less branch is
 * used by the payment and scheduled-command flows (see `ensureOrganizationScope`'s Pattern C comment), and
 * 415 `ensureTenantScope` call sites ride on it. An operator who wants the deny hardens the deployment;
 * nothing else changes.
 */
function isStrictTenantScopeEnforced(): boolean {
  return parseBooleanWithDefault(env.OM_ENFORCE_TENANT_SCOPE_STRICT, false)
}

function logScopeViolation(
  ctx: CommandRuntimeContext,
  expected: string,
  actual: string | null
): void {
  try {
    if (env.NODE_ENV !== 'test') {
      logger.warn('Forbidden organization scope mismatch detected', {
        expectedId: expected,
        actualId: actual,
        ...buildScopeLogContext(ctx),
      })
    }
  } catch {
    // best-effort logging
  }
}

function logUnscopedOrganizationAccess(ctx: CommandRuntimeContext, organizationId: string): void {
  try {
    if (env.NODE_ENV !== 'test') {
      logger.warn('Unscoped organization command executed without organization context', {
        targetOrganizationId: organizationId,
        strictEnforcement: isStrictOrganizationScopeEnforced(),
        ...buildScopeLogContext(ctx),
      })
    }
  } catch {
    // best-effort logging
  }
}

function logTenantScopeViolation(
  ctx: CommandRuntimeContext,
  expectedTenantId: string,
  actualTenantId: string | null
): void {
  try {
    if (env.NODE_ENV !== 'test') {
      logger.warn('Forbidden tenant scope mismatch detected', {
        expectedTenantId,
        actualTenantId,
        ...buildScopeLogContext(ctx),
      })
    }
  } catch {
    // best-effort logging
  }
}

function logUnscopedTenantAccess(ctx: CommandRuntimeContext, tenantId: string): void {
  try {
    if (env.NODE_ENV !== 'test') {
      logger.warn('Unscoped tenant command executed without an authenticated actor', {
        targetTenantId: tenantId,
        strictEnforcement: isStrictTenantScopeEnforced(),
        ...buildScopeLogContext(ctx),
      })
    }
  } catch {
    // best-effort logging
  }
}

export function ensureOrganizationScope(ctx: CommandRuntimeContext, organizationId: string): void {
  const isSuperAdmin = ctx.auth?.isSuperAdmin === true
  const scope = ctx.organizationScope

  // Pattern C: when no organization scope was resolved (system/worker/non-user
  // command contexts that build ctx with `organizationScope: null`), preserve
  // the legacy currentOrg fallback. This branch is load-bearing — switching it
  // to deny would break payment, scheduled-command, and other scope-less flows.
  if (!scope) {
    if (isSuperAdmin) return
    const currentOrg = ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? null
    if (currentOrg) {
      if (currentOrg !== organizationId) {
        logScopeViolation(ctx, organizationId, currentOrg)
        throw new CrudHttpError(403, { error: 'Forbidden' })
      }
      return
    }
    // No current org could be resolved either. This branch previously returned
    // with no validation and no signal — a fail-open-by-omission shape (#2441):
    // a new command path reaching here with `organizationScope: null` would act
    // on an arbitrary target org silently. Preserve the legacy allow behavior by
    // default (the path is load-bearing) but make the unscoped access observable,
    // and let operators harden it into a deny via OM_ENFORCE_ORG_SCOPE_STRICT.
    if (organizationId) {
      logUnscopedOrganizationAccess(ctx, organizationId)
      if (isStrictOrganizationScopeEnforced()) {
        throw new CrudHttpError(403, { error: 'Forbidden' })
      }
    }
    return
  }

  if (!scope.tenantId && organizationId && ctx.auth && !isSuperAdmin) {
    const currentOrg = ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? null
    logScopeViolation(ctx, organizationId, currentOrg)
    throw new CrudHttpError(403, { error: 'Forbidden' })
  }

  // `T-27` — the same asymmetry its sibling had, closed. A resolved scope whose tenant is unknown, called
  // with **no auth object at all**, used to fall through to the allowlist below: the *absence* of a context
  // was trusted more than a context that merely had no tenant in it. Observable now, and closable by the
  // same flag #2441 gave the unscoped branch above.
  if (!scope.tenantId && organizationId && !ctx.auth) {
    logUnscopedOrganizationAccess(ctx, organizationId)
    if (isStrictOrganizationScopeEnforced()) {
      throw new CrudHttpError(403, { error: 'Forbidden' })
    }
    return
  }

  if (
    isOrganizationAccessAllowed({
      isSuperAdmin,
      allowedOrganizationIds: scope.allowedIds,
      targetOrganizationId: organizationId,
    })
  ) {
    return
  }

  const currentOrg = ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? null
  logScopeViolation(ctx, organizationId, currentOrg)
  throw new CrudHttpError(403, { error: 'Forbidden' })
}

/**
 * Refuse a command that targets a tenant the actor may not act in.
 *
 * **`T-27` — the exemption is keyed on the ABSENCE of the auth object, and that is the whole finding.**
 *
 * ```ts
 * if (tenantId && ctx.auth && !isSuperAdmin) { throw }
 * return
 * ```
 *
 * A caller that forgot to wire auth at all lands on the `return`; a caller who wired an
 * `auth: { tenantId: null }` is refused. So *no context at all* was trusted more than a context with
 * nothing in it — and the pass was **silent**, which is what made it hard to act on.
 *
 * **What is deliberately unchanged.** The allow itself. The branch is load-bearing — payment,
 * scheduled-command and the CLI's `auth: null` contexts use it, `scope.test.ts` pins it by name
 * (*"preserves legacy system contexts without an authenticated actor"*), and 415 call sites across 71 files
 * ride on it. Making absent auth a 403 here would break those flows and turn a finding into a manufactured
 * emergency. What changed is what #2441 already chose for the organisation half: **observable now, and
 * closable by flag** (`OM_ENFORCE_TENANT_SCOPE_STRICT`, default `false`).
 *
 * **What this is not.** The HTTP path cannot reach it: the dispatcher refuses a request with no session
 * before any handler runs (`apps/mercato/src/app/api/[...slug]/route.ts:157-162`), the same argument
 * `T-45` recorded. This is the second line of defence, not the first.
 */
export function ensureTenantScope(ctx: CommandRuntimeContext, tenantId: string): void {
  const isSuperAdmin = ctx.auth?.isSuperAdmin === true
  const currentTenant = ctx.auth?.tenantId ?? null
  if (!currentTenant) {
    if (tenantId && ctx.auth && !isSuperAdmin) {
      logTenantScopeViolation(ctx, tenantId, currentTenant)
      throw new CrudHttpError(403, { error: 'Forbidden' })
    }
    // The unscoped path, stated as itself rather than as "everything else".
    if (tenantId && !ctx.auth) {
      logUnscopedTenantAccess(ctx, tenantId)
      if (isStrictTenantScopeEnforced()) {
        throw new CrudHttpError(403, { error: 'Forbidden' })
      }
    }
    return
  }
  if (currentTenant !== tenantId) {
    logTenantScopeViolation(ctx, tenantId, currentTenant)
    throw new CrudHttpError(403, { error: 'Forbidden' })
  }
}

export function ensureSameScope(
  entity: Pick<{ organizationId: string; tenantId: string }, 'organizationId' | 'tenantId'>,
  organizationId: string,
  tenantId: string
): void {
  if (entity.organizationId !== organizationId || entity.tenantId !== tenantId) {
    throw new CrudHttpError(403, { error: 'Cross-tenant relation forbidden' })
  }
}
