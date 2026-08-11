import { asClass, asFunction } from 'awilix'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import { AuthService } from '@open-mercato/core/modules/auth/services/authService'
import { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { AuthorityEnforcementService } from '@open-mercato/core/modules/auth/services/authorityEnforcementService'
import { RecordLockService } from '@open-mercato/core/modules/auth/services/recordLockService'
import { DelegationService } from '@open-mercato/core/modules/auth/services/delegationService'
import { TrustService } from '@open-mercato/core/modules/auth/services/trustService'
import { ActReviewService, PendingActService } from '@open-mercato/core/modules/auth/services/pendingActService'
import {
  createRbacFallbackCache,
  isRbacDefaultCacheEnabled,
  resetRbacFallbackCache,
} from '@open-mercato/core/modules/auth/services/rbacDefaultCache'

export { resetRbacFallbackCache }

/**
 * Reads one registration without requiring it to exist.
 *
 * The enforcement service needs the organization graph (directory) and the
 * per-tenant config store (configs). Both are ordinary modules a deployment may
 * have switched off, and lean bootstraps — CLI scripts, test containers —
 * register neither. Auth is the optional *consumer* here, so per the
 * cross-module rules it owns the glue and degrades rather than hard-requiring a
 * peer.
 *
 * Degrading means: no graph ceiling, and the default mode. Never a refusal
 * invented from an absent dependency.
 */
function optional<T>(cradle: Record<string, unknown>, name: string): T | null {
  try {
    return (cradle[name] as T) ?? null
  } catch {
    return null
  }
}

export function register(container: AppContainer) {
  // Register or override core auth service
  container.register({ authService: asClass(AuthService).scoped() })

  container.register({
    // `.proxy()` hands the resolver the cradle object itself. Without it this
    // container's CLASSIC injection mode reads the parameter list and goes
    // looking for a registration literally named `cradle`.
    authorityEnforcement: asFunction((cradle: Record<string, unknown>) => new AuthorityEnforcementService(
      optional(cradle, 'authorityGraphService'),
      optional(cradle, 'moduleConfigService'),
      {
        // Resolved inside the call, not here. `rbacService` is constructed with
        // `authorityEnforcement` as a dependency, so touching it at construction
        // time would close a cycle; reading it when the question is actually
        // asked breaks that.
        async holdsCapability(userId: string, featureId: string, scope) {
          const rbac = optional(cradle, 'rbacService') as
            | { userHasAllFeatures: (userId: string, features: string[], scope: unknown) => Promise<boolean> }
            | null
          if (!rbac) return false
          return rbac.userHasAllFeatures(userId, [featureId], {
            tenantId: scope.tenantId ?? null,
            organizationId: scope.organizationId ?? null,
          })
        },
      },
      {
        // Same lazy shape as the invoker reader above, and for a plainer reason:
        // this service is built inside the request container and must not open an
        // EntityManager of its own.
        async stateFor(recordId: string, scope) {
          const locks = optional(cradle, 'recordLockService') as
            | { stateFor: (id: string, scope: unknown) => Promise<{ state: string; reason: string | null } | null> }
            | null
          if (!locks) return null
          return locks.stateFor(recordId, scope) as never
        },
      },
      // Argument order matters and is not obvious from the call site: the
      // constructor takes (graph, moduleConfig, invokerAuthority, recordLocks,
      // delegations, trust). These are positional readers, so swapping two of
      // them type-checks perfectly and silently asks the wrong service.
      {
        async activeFor(granteePrincipalId: string, capabilityId: string, scope) {
          const delegations = optional(cradle, 'delegationService') as
            | { activeFor: (id: string, capabilityId: string, scope: unknown) => Promise<unknown | null> }
            | null
          if (!delegations) return null
          return delegations.activeFor(granteePrincipalId, capabilityId, scope) as never
        },
      },
      {
        async tierFor(principalId: string, capabilityGroup: string, scope) {
          const trust = optional(cradle, 'trustService') as
            | { tierFor: (id: string, group: string, scope: unknown) => Promise<string> }
            | null
          // `T0` rather than null: absence is the bottom of the scale, and the
          // resolver reads `T0` as "no trust record" and falls through to the
          // untrusted-machine default.
          if (!trust) return 'T0' as never
          return trust.tierFor(principalId, capabilityGroup, scope) as never
        },
      },
    )).scoped().proxy(),
  })

  // Scoped, so a held act is written on the request's EntityManager and rolls
  // back with it — an act recorded as held by a request that then failed would
  // be an approval queue entry for something nobody proposed.
  container.register({ recordLockService: asClass(RecordLockService).scoped() })
  container.register({ delegationService: asClass(DelegationService).scoped() })
  container.register({ trustService: asClass(TrustService).scoped() })
  container.register({ pendingActService: asClass(PendingActService).scoped() })
  container.register({ actReviewService: asClass(ActReviewService).scoped() })

  // RBAC service. The bare `asClass(...).scoped()` registration matches
  // develop and is the default. Setting `OM_RBAC_DEFAULT_CACHE=on` opts
  // into the in-process LRU fallback for deployments that don't wire a
  // shared CacheStrategy (CLI scripts, lean test bootstraps). Production
  // bootstraps that already register `cache` via `@open-mercato/cache`
  // preempt this fallback because the container's existing `cache`
  // registration wins when `RbacService` reaches for it.
  if (isRbacDefaultCacheEnabled()) {
    container.register({
      rbacService: asFunction((cradle: { em: EntityManager; cache?: CacheStrategy; authorityEnforcement?: AuthorityEnforcementService; delegationService?: DelegationService }) => {
        return new RbacService(
          cradle.em,
          cradle.cache ?? createRbacFallbackCache(),
          cradle.authorityEnforcement ?? null,
          cradle.delegationService ?? null,
        )
      }).scoped().proxy(),
    })
  } else {
    container.register({ rbacService: asClass(RbacService).scoped() })
  }
}
