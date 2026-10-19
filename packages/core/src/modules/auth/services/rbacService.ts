import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import { getCurrentCacheTenant, runWithCacheTenant } from '@open-mercato/cache'
import { UserAcl, RoleAcl, User, UserRole } from '@open-mercato/core/modules/auth/data/entities'
import { Tenant } from '@open-mercato/core/modules/directory/data/entities'
import { ApiKey } from '@open-mercato/core/modules/api_keys/data/entities'
import { findWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { buildOrgScopeUserCacheTag, buildOrgScopeTenantCacheTag } from '@open-mercato/core/modules/directory/utils/organizationScope'
import { matchFeature as sharedMatchFeature, hasAllFeatures as sharedHasAllFeatures } from '@open-mercato/shared/lib/auth/featureMatch'
import { recordShadowDecision } from '@open-mercato/shared/lib/authority/shadow'
import { createLogger } from '@open-mercato/shared/lib/logger'
import type { AuthorityEnforcementService } from '@open-mercato/core/modules/auth/services/authorityEnforcementService'
import { getCapabilityDescriptor } from '@open-mercato/shared/lib/capabilities/registry'
import { isApiKeyBackedKind, parseSubject } from '@open-mercato/shared/lib/auth/principal'
import { filterGrantsByEnabledModules, getOwningModuleId, getEnabledModuleIds } from '@open-mercato/shared/security/enabledModulesRegistry'

const authorityLogger = createLogger('authority').child({ component: 'enforcement' })

interface AclData {
  isSuperAdmin: boolean
  features: string[]
  organizations: string[] | null
}

function isAclData(value: unknown): value is AclData {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<AclData>
  if (typeof record.isSuperAdmin !== 'boolean') return false
  if (!Array.isArray(record.features) || record.features.some((feature) => typeof feature !== 'string')) return false
  if (record.organizations !== null && record.organizations !== undefined) {
    if (!Array.isArray(record.organizations)) return false
    if (record.organizations.some((org) => typeof org !== 'string')) return false
  }
  return true
}

export class RbacService {
  private cacheTtlMs: number = 5 * 60 * 1000 // 5 minutes default
  private cache: CacheStrategy | null = null
  private globalSuperAdminCache = new Map<string, boolean>()

  constructor(
    private em: EntityManager,
    cache?: CacheStrategy,
    private authorityEnforcement?: AuthorityEnforcementService | null,
    /**
     * Lent authority, consulted live.
     *
     * **The parameter name is the registration name, and that is load-bearing.**
     * The default registration is `asClass(RbacService)`, and the container runs
     * in Awilix CLASSIC mode: it reads the constructor's parameter *names* and
     * resolves each one by name. Calling this `delegations` made every boot fail
     * with `Could not resolve 'delegations'`, because the registration is
     * `delegationService`.
     */
    private delegationService?: {
      activeFor: (
        granteePrincipalId: string,
        capabilityId: string,
        scope: { tenantId: string | null; organizationId: string | null },
        /**
         * The grantee's kind, sent beside the id. `CC-124`: the row stores the
         * pair, and a lookup that passes only the id asks for a row that was
         * never written.
         */
        granteeKind?: string | null,
      ) => Promise<unknown | null>
    } | null,
    /**
     * Permissions withheld from one person, consulted live.
     *
     * Same naming rule as above — the parameter name **is** the registration
     * name under Awilix CLASSIC. This one is `denialService`.
     */
    private denialService?: {
      blocking: (
        subjectPrincipalId: string,
        required: readonly string[],
        scope: { tenantId: string | null; organizationId: string | null },
        /** The subject's kind, sent beside the id — `CC-124`, as above. */
        subjectKind?: string | null,
      ) => Promise<{ feature: string; denial: { reason: string; expiresAt: Date | null } } | null>
    } | null,
  ) {
    this.cache = cache || null
  }

  /**
   * Set cache TTL in milliseconds
   * @param ttlMs - Time to live in milliseconds
   */
  setCacheTtl(ttlMs: number) {
    this.cacheTtlMs = ttlMs
  }

  /**
   * Checks if a required feature is satisfied by a granted feature permission.
   * 
   * Wildcard patterns:
   * - `*` (global wildcard): Grants access to all features
   * - `prefix.*` (module wildcard): Grants access to all features starting with `prefix.`
   *   and also the exact prefix itself (e.g., `entities.*` matches both `entities` and `entities.records.view`)
   * - Exact match: Feature must match exactly (e.g., `users.view` only matches `users.view`)
   * 
   * @param required - The feature being requested (e.g., 'entities.records.view')
   * @param granted - The feature permission granted (e.g., 'entities.*' or '*')
   * @returns true if the granted permission satisfies the required feature
   * 
   * @example
   * matchFeature('users.view', '*') // true - global wildcard
   * matchFeature('entities.records.view', 'entities.*') // true - module wildcard
   * matchFeature('entities', 'entities.*') // true - exact prefix match
   * matchFeature('users.view', 'entities.*') // false - different module
   * matchFeature('users.view', 'users.view') // true - exact match
   */
  private matchFeature(required: string, granted: string): boolean {
    return sharedMatchFeature(required, granted)
  }

  public hasAllFeatures(required: string[], granted: string[]): boolean {
    return sharedHasAllFeatures(required, granted)
  }

  private roleAclAllowsOrganization(acl: RoleAcl, organizationId: string | null | undefined): boolean {
    if (!organizationId) return true
    const organizations = Array.isArray(acl.organizationsJson) ? acl.organizationsJson : null
    if (!organizations || !organizations.length || organizations.includes('__all__')) return true
    return organizations.includes(organizationId)
  }

  private getCacheKey(userId: string, scope: { tenantId: string | null; organizationId: string | null }): string {
    return `rbac:${userId}:${scope.tenantId || 'null'}:${scope.organizationId || 'null'}`
  }

  private getUserTag(userId: string): string {
    return `rbac:user:${userId}`
  }

  private getTenantTag(tenantId: string): string {
    return `rbac:tenant:${tenantId}`
  }

  private getOrganizationTag(organizationId: string): string {
    return `rbac:org:${organizationId}`
  }

  private async getFromCache(cacheKey: string): Promise<AclData | null> {
    if (!this.cache) return null
    const cached = await this.cache.get(cacheKey)
    if (!cached) return null
    return isAclData(cached) ? cached : null
  }

  private async setCache(cacheKey: string, data: AclData, userId: string, scope: { tenantId: string | null; organizationId: string | null }): Promise<void> {
    if (!this.cache) return

    const tags = [
      this.getUserTag(userId),
      'rbac:all'
    ]

    if (scope.tenantId) {
      tags.push(this.getTenantTag(scope.tenantId))
    }

    if (scope.organizationId) {
      tags.push(this.getOrganizationTag(scope.organizationId))
    }

    await this.cache.set(cacheKey, data, {
      ttl: this.cacheTtlMs,
      tags
    })
  }

  /**
   * Invalidates cached ACL data for a specific user across all tenants and organizations.
   * Call this when a user's roles or user-specific ACL is modified.
   * 
   * @param userId - The ID of the user whose cache should be invalidated
   */
  async invalidateUserCache(userId: string): Promise<void> {
    this.globalSuperAdminCache.delete(userId)
    // Also drop the directory OrganizationScope cache for this user. That scope's
    // accessible-org set is derived from this user's ACL/role grants, so any
    // permission change that invalidates the RBAC cache must invalidate the
    // resolved scope too. This is the missing `org-scope:user:*` caller required
    // before the cross-request scope TTL can be safely enabled (issue #2259).
    await this.deleteCacheByTags([this.getUserTag(userId), buildOrgScopeUserCacheTag(userId)])
  }

  /**
   * Invalidates cached ACL data for all users within a specific tenant.
   * Call this when a role's ACL is modified, since roles are tenant-scoped
   * and affect all users in that tenant who have that role.
   * 
   * @param tenantId - The ID of the tenant whose cache should be invalidated
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    this.globalSuperAdminCache.clear()
    // Role ACL changes invalidate every user in the tenant; the resolved
    // OrganizationScope for those users derives from the same grants, so drop
    // the tenant-tagged scope entries alongside the RBAC ones (issue #2259).
    await this.deleteCacheByTags([this.getTenantTag(tenantId), buildOrgScopeTenantCacheTag(tenantId)], [tenantId])
  }

  /**
   * Invalidates cached ACL data for all users within a specific organization.
   * Call this when organization-level permissions or visibility changes.
   * 
   * @param organizationId - The ID of the organization whose cache should be invalidated
   */
  async invalidateOrganizationCache(organizationId: string): Promise<void> {
    await this.deleteCacheByTags([this.getOrganizationTag(organizationId)])
  }

  /**
   * Clears all cached ACL data.
   * Use this for bulk operations or system-wide ACL changes.
   */
  async invalidateAllCache(): Promise<void> {
    this.globalSuperAdminCache.clear()
    await this.deleteCacheByTags(['rbac:all'])
  }

  private async deleteCacheByTags(tags: string[], tenantHints?: Array<string | null>): Promise<void> {
    if (!this.cache) return
    const contexts = new Set<string | null>()
    const current = getCurrentCacheTenant()
    contexts.add(current ?? null)
    contexts.add(null)
    if (Array.isArray(tenantHints)) {
      for (const hint of tenantHints) {
        contexts.add(hint ?? null)
      }
    }
    for (const ctx of contexts) {
      if (ctx === current) {
        await this.cache.deleteByTags(tags)
      } else {
        await runWithCacheTenant(ctx, async () => {
          await this.cache!.deleteByTags(tags)
        })
      }
    }
  }

  /**
   * Is this person an administrator of the **foundational** tenant — i.e. does their authority reach
   * above every tenant?
   *
   * `CC-134`. This is **not** "does the user hold a superadmin row anywhere". The per-tenant answer is
   * produced by `loadAcl`'s own scoped read below (`:383`), so a superadmin of tenant B is already a
   * superadmin **inside B** without this function's help. The only question left here is the
   * cross-tenant one, and under `CC-128` option A the answer is: **the platform's admins are the
   * foundational tenant's admins.**
   *
   * The `UserAcl` read used to carry **no tenant filter**, on a column whose own comment says tenant
   * scope is mandatory for ACL evaluation — so a superadmin of any tenant was treated as a superadmin
   * of every tenant, and `loadAcl` acted on that before the requested scope was consulted at all.
   * `CC-128` bounded what the resulting `*` could reach; this is the read itself.
   *
   * **No foundational tenant means no global superadmin** (fail closed). A deployment that has not
   * designated a foundation must not silently promote every tenant's superadmin.
   *
   * The answer is a property of the **user**, not of the requested scope — which is why the per-user
   * cache above is correct rather than accidentally correct. `tenants.is_foundational` moving is the
   * one event that invalidates it, and `invalidateAllCache()` is the lever.
   */
  private async isGlobalSuperAdmin(userId: string): Promise<boolean> {
    if (this.globalSuperAdminCache.has(userId)) return this.globalSuperAdminCache.get(userId)!
    const em = this.em.fork()

    const foundational = await em.findOne(Tenant, { isFoundational: true } as any)
    const foundationalTenantId = foundational ? String((foundational as any).id) : null
    if (!foundationalTenantId) {
      this.globalSuperAdminCache.set(userId, false)
      return false
    }

    const userSuper = await em.findOne(UserAcl, {
      user: userId as any,
      isSuperAdmin: true,
      tenantId: foundationalTenantId,
    })
    if (userSuper && (userSuper as any).isSuperAdmin) {
      this.globalSuperAdminCache.set(userId, true)
      return true
    }

    // The role half must ask the SAME question, or this function returns the union of two different
    // ones. A global role lives **in the foundational tenant** — not in "no tenant", which is what
    // this lookup used to look for (and `UserAcl.tenant_id` is `NOT NULL`, so the two halves could
    // never have agreed).
    const links = await findWithDecryption(
      em,
      UserRole,
      { user: userId as any, role: { tenantId: foundationalTenantId } } as any,
      { populate: ['role'] },
      { tenantId: foundationalTenantId, organizationId: null },
    )
    const linkList = Array.isArray(links) ? links : []
    if (!linkList.length) {
      this.globalSuperAdminCache.set(userId, false)
      return false
    }
    const roleIds = Array.from(new Set(linkList.map((link) => {
      const role = link.role as any
      return role?.id ? String(role.id) : null
    }).filter((id): id is string => typeof id === 'string' && id.length > 0)))
    if (!roleIds.length) {
      this.globalSuperAdminCache.set(userId, false)
      return false
    }
    const roleSuper = await em.findOne(RoleAcl, {
      isSuperAdmin: true,
      tenantId: foundationalTenantId,
      role: { $in: roleIds as any },
    } as any)
    const result = !!(roleSuper && (roleSuper as any).isSuperAdmin)
    this.globalSuperAdminCache.set(userId, result)
    return result
  }

  /**
   * Loads the Access Control List (ACL) for a user within a given scope.
   * 
   * The ACL resolution follows this priority:
   * 1. Per-user ACL (UserAcl) - if exists, use it exclusively
   * 2. Aggregated role ACLs (RoleAcl) - combine permissions from all user's roles
   * 
   * Results are cached for performance (default 5 minutes TTL).
   * Cache is automatically invalidated when ACL-related data changes.
   * 
   * @param userId - The ID of the user
   * @param scope - The tenant and organization context for ACL evaluation
   * @returns An object containing:
   *   - isSuperAdmin: If true, user has unrestricted access to all features
   *   - features: Array of feature strings (may include wildcards like 'entities.*')
   *   - organizations: Array of organization IDs user can access, or null for all organizations
   * 
   * @example
   * const acl = await rbacService.loadAcl('user-123', { tenantId: 'tenant-1', organizationId: 'org-1' })
   * // Returns: { isSuperAdmin: false, features: ['users.view', 'entities.*'], organizations: ['org-1', 'org-2'] }
   */
  async loadAcl(userId: string, scope: { tenantId: string | null; organizationId: string | null }): Promise<{
    isSuperAdmin: boolean
    features: string[]
    organizations: string[] | null
  }> {
    const cacheKey = this.getCacheKey(userId, scope)
    const cached = await this.getFromCache(cacheKey)
    if (cached) return cached

    // `userId` is a subject string, not necessarily a user id — it carries the
    // actor's kind in a prefix. Parsed once here rather than re-tested per
    // branch; R1.4 replaces the parameter with a resolved `Principal` so the
    // kind arrives as data and this parse disappears.
    const subject = parseSubject(userId)

    if (subject.kind === 'human') {
      if (await this.isGlobalSuperAdmin(userId)) {
        const result = { isSuperAdmin: true, features: ['*'], organizations: null }
        await this.setCache(cacheKey, result, userId, scope)
        return result
      }
    }

    // Both service keys and AI workers resolve their permissions from the key
    // row they authenticate with. Testing for 'service' alone sent an AI worker
    // down the human branch, where its subject reached a uuid column.
    if (isApiKeyBackedKind(subject.kind)) {
      const apiKeyId = subject.id
      const em = this.em.fork()
      const key = await em.findOne(ApiKey, { id: apiKeyId, deletedAt: null })
      if (!key || (key.expiresAt && key.expiresAt.getTime() < Date.now())) {
        const result = { isSuperAdmin: false, features: [], organizations: null }
        await this.setCache(cacheKey, result, userId, scope)
        return result
      }
      const tenantId = scope.tenantId || key.tenantId || null
      const roleIds = Array.isArray(key.rolesJson) ? key.rolesJson.filter(Boolean) : []
      let isSuper = false
      const features: string[] = []
      let organizations: string[] | null = key.organizationId ? [key.organizationId] : null
      if (tenantId && roleIds.length) {
        const racls = await em.find(RoleAcl, { tenantId, role: { $in: roleIds as any } } as any)
        for (const acl of racls) {
          isSuper = isSuper || !!acl.isSuperAdmin
          if (Array.isArray(acl.featuresJson)) {
            for (const f of acl.featuresJson) if (!features.includes(f)) features.push(f)
          }
          if (organizations !== null) {
            if (acl.organizationsJson == null) {
              organizations = null
            } else if (Array.isArray(acl.organizationsJson) && acl.organizationsJson.includes('__all__')) {
              organizations = null
            } else {
              organizations = Array.from(new Set([...(organizations || []), ...acl.organizationsJson]))
            }
          }
        }
      }
      const result = { isSuperAdmin: isSuper, features, organizations }
      await this.setCache(cacheKey, result, userId, scope)
      return result
    }

    // Use a forked EntityManager to avoid inheriting an aborted transaction from callers
    const em = this.em.fork()
    const user = await em.findOne(User, { id: userId })
    if (!user) {
      const result = { isSuperAdmin: false, features: [], organizations: null }
      await this.setCache(cacheKey, result, userId, scope)
      return result
    }
    const tenantId = scope.tenantId || user.tenantId || null
    const orgId = scope.organizationId || user.organizationId || null

    if (!tenantId) {
      const result = { isSuperAdmin: false, features: [], organizations: null }
      await this.setCache(cacheKey, result, userId, scope)
      return result
    }

    // Per-user ACL first
    const uacl = await em.findOne(UserAcl, { user: userId as any, tenantId })
    if (uacl) {
      const result = {
        isSuperAdmin: !!uacl.isSuperAdmin,
        // A superadmin holds everything, and `*` is how this codebase spells "everything". The global
        // shortcut used to supply it for any superadmin row anywhere — so scoping that shortcut
        // (`CC-134`) would otherwise have SILENTLY REDUCED a tenant superadmin's features to whatever
        // their row happens to list. The wildcard belongs to the position, not to the row's contents.
        features: uacl.isSuperAdmin
          ? ['*']
          : (Array.isArray(uacl.featuresJson) ? (uacl.featuresJson as string[]) : []),
        organizations: Array.isArray(uacl.organizationsJson) ? (uacl.organizationsJson as string[]) : null,
      }
      await this.setCache(cacheKey, result, userId, scope)
      return result
    }

    // Aggregate role ACLs
    const links = await findWithDecryption(
      em,
      UserRole,
      { user: userId as any, role: { tenantId } } as any,
      { populate: ['role'] },
      { tenantId, organizationId: orgId },
    )
    const linkList = Array.isArray(links) ? links : []
    const roleIds = linkList.map((l) => (l.role as any)?.id).filter(Boolean)
    let isSuper = false
    const features: string[] = []
    let organizations: string[] | null = []
    if (roleIds.length) {
      const racls = await em.find(RoleAcl, { tenantId, role: { $in: roleIds as any } } as any, {})
      const roleAcls = Array.isArray(racls) ? racls : []
      for (const r of roleAcls) {
        isSuper = isSuper || !!r.isSuperAdmin
        if (Array.isArray(r.featuresJson)) for (const f of r.featuresJson) if (!features.includes(f)) features.push(f)
        if (organizations !== null) {
          if (r.organizationsJson == null) organizations = null
          else if (Array.isArray(r.organizationsJson) && r.organizationsJson.includes('__all__')) organizations = null
          else organizations = Array.from(new Set([...(organizations || []), ...r.organizationsJson]))
        }
      }
    }
    if (organizations && orgId && !organizations.includes(orgId) && !organizations.includes('__all__')) {
      // Out-of-scope org; caller will enforce
    }
    const result = { isSuperAdmin: isSuper, features, organizations }
    await this.setCache(cacheKey, result, userId, scope)
    return result
  }

  /**
   * Checks whether any tenant role grants a feature.
   *
   * This supports non-user runtimes such as scheduler workers that execute with
   * tenant scope but without an authenticated user.
   */
  async tenantHasFeature(
    tenantId: string | null | undefined,
    feature: string,
    opts?: { organizationId?: string | null },
  ): Promise<boolean> {
    if (!tenantId || !feature) return false

    const enabledIds = getEnabledModuleIds()
    if (enabledIds.length && !enabledIds.includes(getOwningModuleId(feature))) return false

    const em = this.em.fork()
    const roleAcls = await em.find(RoleAcl, { tenantId, deletedAt: null } as any, {})
    const list = Array.isArray(roleAcls) ? roleAcls : []
    const organizationId = opts?.organizationId ?? null

    for (const acl of list) {
      if (!this.roleAclAllowsOrganization(acl, organizationId)) continue
      if (acl.isSuperAdmin) return true
      const grants = Array.isArray(acl.featuresJson) ? acl.featuresJson : []
      if (this.hasAllFeatures([feature], filterGrantsByEnabledModules(grants))) return true
    }

    return false
  }

  /**
   * Checks if a user has all required features within a given scope.
   *
   * This is the primary authorization check method used throughout the application.
   * It combines feature checking with organization visibility validation.
   *
   * Authorization logic:
   * 1. No features required → always returns true
   * 2. User is super admin → always returns true
   * 3. Organization restriction check: If the user's ACL has a restricted organization list
   *    and the requested organization is not in that list → returns false
   * 4. Feature matching: User must have all required features (supports wildcards)
   *
   * @param userId - The ID of the user
   * @param required - Array of feature strings to check (e.g., ['users.view', 'users.edit'])
   * @param scope - The tenant and organization context for authorization
   * @returns true if the user has all required features and organization access, false otherwise
   *
   * @example
   * // Check if user can view and edit users
   * const canManageUsers = await rbacService.userHasAllFeatures(
   *   'user-123',
   *   ['users.view', 'users.edit'],
   *   { tenantId: 'tenant-1', organizationId: 'org-1' }
   * )
   *
   * @example
   * // Check with wildcard features
   * const canAccessEntities = await rbacService.userHasAllFeatures(
   *   'user-123',
   *   ['entities.records.view'],
   *   { tenantId: 'tenant-1', organizationId: 'org-1' }
   * )
   * // Returns true if user has 'entities.*', '*', or 'entities.records.view'
   */
  async userHasAllFeatures(
    userId: string,
    required: string[],
    scope: { tenantId: string | null; organizationId: string | null },
    options: { onBehalfOfUserId?: string | null } = {},
  ): Promise<boolean> {
    const fromAcl = await this.decideAllFeatures(userId, required, scope)
    // Delegations are consulted **only after** the ordinary ACL has said no.
    //
    // Two reasons, and the second is the important one. A permission somebody
    // genuinely holds never pays for the extra query, because this path is the
    // one that was about to return 403 anyway. And delegations are never cached:
    // `loadAcl` caches for five minutes, and a delegation whose whole point is a
    // window and an explicit revoke cannot live in a cache that keeps granting
    // for five minutes after somebody revokes it. A revoke that takes effect
    // "within five minutes" is not a revoke.
    const allowed = fromAcl || await this.grantedByDelegation(userId, required, scope)
    this.shadowResolver(userId, required, scope, allowed)
    if (!allowed) return false
    if (await this.withheldFromThisPerson(userId, required, scope)) return false
    return !(await this.refusedByAuthority(userId, required, scope, options))
  }

  /**
   * Whether somebody has had one of these permissions taken away.
   *
   * Reached only after the grant path has already returned **true**, which is
   * what makes this a subtraction and nothing else. There is no branch here that
   * can return `false` in a way that permits an act — the worst a bug in this
   * method can do is refuse something that should have been allowed, and that is
   * the direction every control in this platform fails in.
   *
   * **It applies to superadmins.** `decideAllFeatures` short-circuits for them
   * and returns `true`, and this still runs afterwards, on purpose: a control the
   * most powerful account ignores is a suggestion. The recovery path when
   * somebody withholds something they needed is
   * `mercato auth denials --tenant <id> --lift <denial-id>`, out of band by
   * design.
   *
   * A refusal is logged with its reason. A 403 whose cause lives only inside a
   * function is exactly what R5 exists to abolish.
   */
  private async withheldFromThisPerson(
    userId: string,
    required: string[],
    scope: { tenantId: string | null; organizationId: string | null },
  ): Promise<boolean> {
    if (!this.denialService || !required.length || !scope.tenantId) return false
    // The bare id **and** the kind, which is the other half of the pair
    // `authority_denials` stores: `subject_principal_id` holds the bare id and
    // `subject_kind` holds the kind. Passing only the id was `CC-124` — a denial
    // written for a machine, in the encoding the entity documents, was listed,
    // audited and never applied.
    const subject = parseSubject(userId)
    const principalId = subject.id
    if (!principalId) return false

    const blocking = await this.denialService.blocking(principalId, required, scope, subject.kind)
    if (!blocking) return false

    authorityLogger.warn('Withheld from this account', {
      feature: blocking.feature,
      because: blocking.denial.reason,
      until: blocking.denial.expiresAt?.toISOString() ?? null,
      actorId: principalId,
      actorKind: parseSubject(userId).kind,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    return true
  }

  /**
   * Whether lent authority covers what the actor's own grants do not.
   *
   * This is the **only** thing in this service that can turn a `false` into a
   * `true`, and it is deliberately here rather than one layer down: RBAC has
   * always had more than one grant source \u2014 role ACLs and user ACLs \u2014 so a third
   * that expires is consistent with its design. What must never gain that power
   * is `refusedByAuthority`, because the authority resolver narrows and the whole
   * system rests on it never doing anything else.
   *
   * **Every** required feature must be covered. A delegation for one of three
   * capabilities does not authorise an act that needs all three, and returning
   * true because one matched would be the widest bug in the platform.
   */
  private async grantedByDelegation(
    userId: string,
    required: string[],
    scope: { tenantId: string | null; organizationId: string | null },
  ): Promise<boolean> {
    if (!required.length || !scope.tenantId || !this.delegationService) return false
    // Bare id + kind, the same pair the delegation row stores. A delegation
    // granted to `ai_worker:<id>` was never found because the lookup passed the
    // bare id alone.
    const subject = parseSubject(userId)
    const principalId = subject.id
    if (!principalId) return false

    for (const feature of required) {
      const delegation = await this.delegationService.activeFor(principalId, feature, scope, subject.kind)
      if (!delegation) return false
    }
    return true
  }

  /**
   * The authority resolver, when the tenant has switched it on.
   *
   * Reached only after `decideAllFeatures` has already returned **true**, so
   * this can subtract an allowance and cannot add one. The ordering is the
   * guarantee: there is no path here that turns a `false` into a `true`.
   *
   * A refusal is logged with the rule that produced it. A 403 whose reason lives
   * only inside a resolver is the thing R5 exists to abolish, and enforcement
   * would reintroduce it if the answer left no trace on the way out.
   */
  private async refusedByAuthority(
    userId: string,
    required: string[],
    scope: { tenantId: string | null; organizationId: string | null },
    options: { onBehalfOfUserId?: string | null } = {},
  ): Promise<boolean> {
    if (!this.authorityEnforcement) return false

    const onBehalfOfUserId = options.onBehalfOfUserId ?? null
    const actor = parseSubject(userId)

    // 1. The capability-aware half. Every feature some module describes is settled
    //    here, with the person this actor acts for supplied as a ceiling.
    const refusal = await this.authorityEnforcement.refusalFor(userId, required, scope, { onBehalfOfUserId })
    if (refusal) {
      authorityLogger.warn('Refused by the authority resolver', {
        capability: refusal.capabilityId,
        bindingRule: refusal.decision.bindingRule,
        because: refusal.decision.reasons.find((reason) => reason.rule === refusal.decision.bindingRule)?.detail,
        actorId: actor.id,
        actorKind: actor.kind,
        invokerId: onBehalfOfUserId,
        tenantId: scope.tenantId,
        organizationId: scope.organizationId,
      })
      return true
    }

    // 2. The half that needs no descriptor — see `invokerRefusalFor`. Without this
    //    the invoker rule is blind for every feature no module has described, which
    //    measured at 36 of the 157 enabled (`CC-132`).
    const invokerRefusal = await this.authorityEnforcement.invokerRefusalFor(
      userId,
      required,
      scope,
      onBehalfOfUserId,
    )
    if (!invokerRefusal) return false

    authorityLogger.warn('Refused by the invoker rule', {
      capability: invokerRefusal.capabilityId,
      bindingRule: invokerRefusal.bindingRule,
      because: invokerRefusal.because,
      actorId: actor.id,
      actorKind: actor.kind,
      invokerId: onBehalfOfUserId,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
    })
    return true
  }

  /**
   * The permission decision itself — unchanged, and deliberately separate from
   * the shadow that observes it.
   *
   * Splitting them means the shadow physically cannot alter the answer: it runs
   * after this returns, on a value already computed.
   */
  private async decideAllFeatures(userId: string, required: string[], scope: { tenantId: string | null; organizationId: string | null }): Promise<boolean> {
    if (!required.length) return true
    const acl = await this.loadAcl(userId, scope)
    if (acl.isSuperAdmin) {
      const enabledIds = getEnabledModuleIds()
      if (!enabledIds.length) return true
      const enabledSet = new Set(enabledIds)
      return required.every((feature) => enabledSet.has(getOwningModuleId(feature)))
    }
    if (acl.organizations && scope.organizationId && !acl.organizations.includes(scope.organizationId) && !acl.organizations.includes('__all__')) return false
    return this.hasAllFeatures(required, filterGrantsByEnabledModules(acl.features))
  }

  /**
   * Runs the authority resolver beside the answer, and records where it differs.
   *
   * **This is the one place it needs to go.** All 102 call sites in the platform
   * reach a permission decision through `userHasAllFeatures`, so instrumenting
   * the method covers every one of them, and every future one, without touching
   * a single caller.
   *
   * Synchronous and allocation-light on purpose: it runs on every permission
   * check in the product. No database access, no organization-graph lookup —
   * that would add a query per check for a diagnostic. The graph ceiling is
   * therefore absent from the shadow's inputs, which means the shadow
   * *understates* the eventual constraint. Understating is the safe direction
   * for a measurement whose purpose is to find surprises before they are
   * enforced.
   */
  private shadowResolver(
    userId: string,
    required: string[],
    scope: { tenantId: string | null; organizationId: string | null },
    allowed: boolean,
  ): void {
    try {
      const principal = parseSubject(userId)
      for (const feature of required) {
        const capability = getCapabilityDescriptor(feature)
        // An undescribed capability is a coverage gap, not a disagreement.
        // Wildcards and feature ids that no module declares fall through here.
        if (!capability) continue
        recordShadowDecision({
          actorKind: principal.kind,
          actorId: principal.id,
          legacyAllowed: allowed,
          capability,
          organizationId: scope.organizationId,
          tenantId: scope.tenantId,
        })
      }
    } catch {
      // The shadow observes; it never participates. A throw here would turn a
      // diagnostic into an outage.
    }
  }

  /**
   * Returns the effective feature grant list for a user within a scope,
   * filtered to enabled modules only. Super admins receive `['*']` expanded
   * to per-module wildcards via `filterGrantsByEnabledModules` — consistent
   * with `userHasAllFeatures` which also enforces disabled-module boundaries
   * for super admins. Returns `[]` when the requested organization is outside
   * the user's visibility list, or when the user does not exist.
   */
  async getGrantedFeatures(
    userId: string,
    scope: { tenantId: string | null; organizationId: string | null },
  ): Promise<string[]> {
    const acl = await this.loadAcl(userId, scope)
    if (acl.isSuperAdmin) return filterGrantsByEnabledModules(['*'])
    if (
      acl.organizations &&
      scope.organizationId &&
      !acl.organizations.includes(scope.organizationId) &&
      !acl.organizations.includes('__all__')
    ) {
      return []
    }
    return filterGrantsByEnabledModules(acl.features)
  }
}
