import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import { z } from 'zod'
import { derivePrincipal, type Principal } from '@open-mercato/shared/lib/auth/principal'
import { Tenant } from '@open-mercato/core/modules/directory/data/entities'
import type { RbacService } from '../services/rbacService'
import {
  CapabilityCeilingError,
  loadCapabilityCeiling,
  replaceCapabilityCeiling,
  type CeilingActor,
  type CeilingAuditWriter,
} from './capabilityCeiling'

/**
 * `CC-135` — the capability ceiling over HTTP.
 *
 * Read `PLAN-CC-135-ceiling-route.md` §3 before changing anything here. The row that opened this
 * work said *"`GET`/`PUT` … behind `directory.tenants.manage`"*, and measuring it found two reasons
 * that sentence is not yet a specification. Both are answered here, and the answers are the reason
 * this file exists rather than the two routes each carrying their own copy:
 *
 * 1. **The capability is not the reach.** `directory.tenants.manage` says *may you manage tenants*.
 *    It does not say *whose ceiling may you move* — and under `CC-134` every tenant's superadmin
 *    holds it legitimately, through the `*` that belongs to their position. Gating on the capability
 *    alone would hand every tenant's administrator the **platform** ceiling, which is the thing that
 *    bounds every other tenant. So there are two questions, and `reachRefusal` is the second.
 * 2. **A platform administrator did not exist.** `isGlobalSuperAdmin` answers false when no tenant is
 *    foundational, and nothing wrote `tenants.is_foundational`. `isPlatformAdmin` on the RbacService
 *    is the public name for that question; designating the foundation is `set-foundation` in the auth
 *    CLI (§3.1).
 *
 * **Why the handlers return a plain `{ status, body }` and not a `NextResponse`.** The two routes are
 * four lines each of HTTP, and the decisions are testable without a request object. It also makes it
 * impossible for the platform route and the tenant route to answer differently — they call the same
 * function with a different `CeilingScope`.
 */

/** Which ceiling a request is about. `tenantId: null` is the platform scope, never "all tenants". */
export type CeilingScope =
  | { kind: 'platform' }
  | { kind: 'tenant'; tenantId: string }

/** The tenant id the library expects: `null` means the platform scope. */
export function tenantIdOf(scope: CeilingScope): string | null {
  return scope.kind === 'platform' ? null : scope.tenantId
}

/**
 * The wire shape of a write. **No `.min(1)` on the array, on purpose.**
 *
 * An empty array is refused by `replaceCapabilityCeiling` with the message that explains *why* — an
 * empty ceiling is indistinguishable from having none, and none means inherit, so the operator is
 * pointed at `tenants.is_active`. Rejecting it here with "at least one item is required" would answer
 * the shape question and lose the reason, and `CC-103`'s lesson is that an error naming the wrong
 * cause costs a day.
 */
export const ceilingWriteSchema = z.object({
  capabilities: z.array(z.string().trim().min(1).max(200)).max(2000),
})

/** What the routes hand in. Structurally what `getAuthFromRequest` returns, plus its attached principal. */
export interface CeilingCaller {
  sub?: string | null
  isApiKey?: boolean
  userId?: string | null
  keyId?: string | null
  keyName?: string | null
  email?: string | null
  tenantId?: string | null
  orgId?: string | null
  principal?: Principal | null
}

export interface CeilingResult {
  status: number
  body: Record<string, unknown>
}

/**
 * The cache, when the deployment has one.
 *
 * `null` is a normal answer, not a failure: `loadCapabilityCeiling` falls through to the table, and
 * `replaceCapabilityCeiling` simply skips the invalidation because there is nothing cached. Resolving
 * this is a `try`/`catch` rather than a `has()` check because the container's resolution is what
 * decides, and the CLI already does it this way (`cli.ts:1251-1253`) — one shape for both callers.
 */
export function optionalCache(container: { resolve: (token: string) => unknown }): CacheStrategy | null {
  try {
    return (container.resolve('cache') as CacheStrategy | undefined) ?? null
  } catch {
    return null
  }
}

/**
 * The acting principal, preferring the one the authentication boundary attached.
 *
 * `auth.principal` is the documented reading order — *"Every consumer reads `auth.principal`"*
 * (`shared/lib/auth/principal.ts:16`) — and `derivePrincipal` is the fallback for contexts that
 * predate the field, which is the same expression `resolvePrincipal` uses internally and the same one
 * `shared/lib/auth/server.ts:67` exposes. Deriving unconditionally would ignore an attached principal,
 * which is the one thing the boundary exists to provide.
 */
function principalOf(auth: CeilingCaller | null | undefined): Principal | null {
  if (!auth) return null
  return auth.principal ?? derivePrincipal(auth)
}

/**
 * ★ **The second question.** May this principal move *this* ceiling?
 *
 * - **platform** → only a platform administrator. Not "only a `directory.tenants.manage` holder": the
 *   platform ceiling bounds every tenant, so the act is above every tenant, and option A says the
 *   people who act above every tenant are the foundational tenant's administrators.
 * - **tenant T** → the caller's own tenant is `T`, or the caller is a platform administrator.
 *
 * **Why self-narrowing is allowed and is not an escalation.** `replaceCapabilityCeiling` already
 * refuses a tenant ceiling that is not a subset of the platform's (`capabilityCeiling.ts:198`), so the
 * most a tenant administrator can do to their own ceiling is *reduce* it. Refusing that would mean a
 * tenant cannot tighten its own bound without a support ticket — which is the opposite of what a
 * ceiling is for.
 *
 * The refusal is a **message**, for the same reason `capabilityCeilingRefusalFor` returns one: the
 * person who reads it is the person who tried.
 */
async function reachRefusal(
  rbac: RbacService,
  principal: Principal,
  scope: CeilingScope,
): Promise<string | null> {
  if (scope.kind === 'platform') {
    const isPlatformAdmin = await rbac.isPlatformAdmin(principal.id)
    return isPlatformAdmin
      ? null
      : 'The platform ceiling may only be changed by an administrator of the foundational tenant.'
  }
  if (principal.tenantId === scope.tenantId) return null
  const isPlatformAdmin = await rbac.isPlatformAdmin(principal.id)
  return isPlatformAdmin
    ? null
    : `Only an administrator of the foundational tenant may change another tenant's ceiling.`
}

/** The actor the write records. Never invented: `derivePrincipal` is the only source. */
function actorOf(principal: Principal): CeilingActor {
  return {
    principalId: principal.id,
    kind: principal.kind,
    // The tenant the actor acts FROM. When it differs from the target the record says `crossTenant`,
    // and that is the difference between "recorded as such" and "inferred from a badge".
    tenantId: principal.tenantId,
  }
}

/**
 * `R4` — a tenant scope must name a tenant that exists.
 *
 * `tenant_capability_ceilings.tenant_id` is a plain `uuid` with **no foreign key**
 * (`auth/data/entities.ts:1084-1086`), so a write aimed at a mistyped id would persist rows nothing
 * will ever read: a record that lies, and one that makes a later *"why does this tenant have a
 * ceiling"* unanswerable. This runs **before** the reach rule, because an unknown target is not a
 * reach question — answering 403 would tell a caller they lack permission for a tenant that is not
 * there.
 */
async function targetRefusal(em: EntityManager, scope: CeilingScope): Promise<string | null> {
  if (scope.kind === 'platform') return null
  const tenant = await em.findOne(Tenant, { id: scope.tenantId } as never)
  return tenant ? null : `No tenant with id ${scope.tenantId}.`
}

function serialize(scope: CeilingScope, source: 'platform' | 'tenant', capabilities: Iterable<string>) {
  return {
    scope: scope.kind,
    ...(scope.kind === 'tenant' ? { tenantId: scope.tenantId } : {}),
    source,
    capabilities: [...capabilities].sort((a, b) => a.localeCompare(b)),
  }
}

/**
 * Read the ceiling that applies to `scope`.
 *
 * Gated by the **same** reach rule as the write (`R5`): the platform ceiling is the deployment's whole
 * capability surface, and a caller who may not change it may not enumerate it either. A tenant
 * administrator reads their own ceiling — which, when they inherit, already carries the platform's
 * capabilities with `source: 'platform'` naming where they came from. That is the honest answer to
 * *"what may my tenant hold"*, and it is the only one they are entitled to.
 */
export async function readCeilingForCaller(input: {
  em: EntityManager
  cache?: CacheStrategy | null
  rbac: RbacService
  auth: CeilingCaller | null | undefined
  scope: CeilingScope
}): Promise<CeilingResult> {
  const principal = principalOf(input.auth)
  if (!principal) return { status: 401, body: { error: 'Unauthorized' } }

  const missing = await targetRefusal(input.em, input.scope)
  if (missing) return { status: 404, body: { error: missing } }

  const refusal = await reachRefusal(input.rbac, principal, input.scope)
  if (refusal) return { status: 403, body: { error: refusal } }

  const ceiling = await loadCapabilityCeiling(input.em, tenantIdOf(input.scope), input.cache)
  return { status: 200, body: serialize(input.scope, ceiling.source, ceiling.capabilities) }
}

/**
 * Replace the ceiling at `scope`, recording the caller.
 *
 * **The three refusals are the library's, surfaced rather than restated.** `CapabilityCeilingError`
 * becomes a **400**, because every case it covers is the caller's request being wrong — an empty
 * ceiling, or a tenant ceiling naming a capability the platform does not hold — and a 500 would tell
 * the operator to look at the server when the server is fine. The offending capability names travel
 * with it when the error has them, so a screen can point at the rows.
 */
export async function writeCeilingForCaller(input: {
  em: EntityManager
  cache?: CacheStrategy | null
  rbac: RbacService
  audit: CeilingAuditWriter
  auth: CeilingCaller | null | undefined
  scope: CeilingScope
  capabilities: readonly string[]
}): Promise<CeilingResult> {
  const principal = principalOf(input.auth)
  if (!principal) return { status: 401, body: { error: 'Unauthorized' } }

  const missing = await targetRefusal(input.em, input.scope)
  if (missing) return { status: 404, body: { error: missing } }

  const refusal = await reachRefusal(input.rbac, principal, input.scope)
  if (refusal) return { status: 403, body: { error: refusal } }

  const tenantId = tenantIdOf(input.scope)
  try {
    const result = await replaceCapabilityCeiling(input.em, tenantId, input.capabilities, {
      actor: actorOf(principal),
      audit: input.audit,
      cache: input.cache,
    })
    // Read back rather than echo the request: the answer is what the table now says, so a write that
    // silently did less than asked cannot be reported as if it did. The cache was invalidated by the
    // write, so this reads the rows.
    const ceiling = await loadCapabilityCeiling(input.em, tenantId, input.cache)
    return {
      status: 200,
      body: {
        ...serialize(input.scope, ceiling.source, ceiling.capabilities),
        added: result.added,
        removed: result.removed,
      },
    }
  } catch (error) {
    if (error instanceof CapabilityCeilingError) {
      return {
        status: 400,
        body: {
          error: error.message,
          ...(error.capabilities.length ? { capabilities: error.capabilities } : {}),
        },
      }
    }
    throw error
  }
}
