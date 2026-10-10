import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import type { EntityManager, FilterQuery } from '@mikro-orm/postgresql'
import { makeCrudRoute } from '@open-mercato/shared/lib/crud/factory'
import type { CrudCtx } from '@open-mercato/shared/lib/crud/factory'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { Role, User } from '@open-mercato/core/modules/auth/data/entities'
import { Organization } from '@open-mercato/core/modules/directory/data/entities'
import { ApiKey } from '../../data/entities'
import { createApiKeySchema } from '../../data/validators'
import { generateApiKeySecret, hashApiKey } from '../../services/apiKeyService'
import { resolveTranslations } from '@open-mercato/shared/lib/i18n/server'
import { enforceTenantSelection, resolveIsSuperAdmin } from '@open-mercato/core/modules/auth/lib/tenantAccess'
import { escapeLikePattern } from '@open-mercato/shared/lib/db/escapeLikePattern'
import { assertActorCanGrantRoles } from '@open-mercato/core/modules/auth/lib/grantChecks'
import { isOrganizationAccessAllowed } from '@open-mercato/shared/lib/auth/organizationAccess'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { apiKeySubject } from '@open-mercato/shared/lib/auth/principal'

type ApiKeyCrudCtx = CrudCtx & {
  __apiKeySecret?: { secret: string; prefix: string }
  __apiKeyHash?: string
  __apiKeyRoleIds?: string[]
  __apiKeyRoles?: Role[]
  __apiKeyOrganizationId?: string | null
  __apiKeyTenantId?: string | null
}

type ApiKeyEntityWithMeta = ApiKey & {
  __apiKeySecret?: string
  __apiKeyRoles?: Role[]
}

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
})

const apiKeyRoleSchema = z.object({
  id: z.string().describe('Role identifier or alias assigned to the key'),
  name: z.string().nullable().describe('Display name of the mapped role, if available'),
})

const apiKeyListItemSchema = z.object({
  id: z.string().describe('API key identifier'),
  name: z.string().describe('Friendly label used to identify the key'),
  description: z.string().nullable().describe('Optional free-form description'),
  keyPrefix: z.string().describe('Public prefix exposed to clients'),
  organizationId: z.string().uuid().nullable().describe('Organization scope of the key'),
  organizationName: z.string().nullable().describe('Resolved organization display name'),
  createdAt: z.string().describe('Creation timestamp (ISO 8601)'),
  lastUsedAt: z.string().nullable().describe('Last time the key was observed in use (ISO 8601)'),
  expiresAt: z.string().nullable().describe('When the key expires (ISO 8601)'),
  roles: z.array(apiKeyRoleSchema).describe('Effective roles applied when this key authenticates'),
})

const apiKeyCollectionResponseSchema = z.object({
  items: z.array(apiKeyListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
})

const apiKeyCreateResponseSchema = z.object({
  id: z.string().describe('Newly created API key identifier'),
  name: z.string(),
  keyPrefix: z.string(),
  secret: z.string().describe('Full API key value. Shown once for secure persistence.').optional(),
  tenantId: z.string().uuid().nullable(),
  organizationId: z.string().uuid().nullable(),
  roles: z.array(apiKeyRoleSchema),
})

const deleteResponseSchema = z.object({
  success: z.literal(true),
})

const errorSchema = z.object({
  error: z.string(),
})

function json(payload: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  })
}

const crud = makeCrudRoute<
  z.infer<typeof createApiKeySchema>,
  never,
  z.infer<typeof listQuerySchema>
>({
  metadata: {
    GET: { requireAuth: true, requireFeatures: ['api_keys.view'] },
    POST: { requireAuth: true, requireFeatures: ['api_keys.create'] },
    DELETE: { requireAuth: true, requireFeatures: ['api_keys.delete'] },
  },
  // Row 16 (Option A): api_keys opt into owner row scope. Rows are already
  // stamped with `createdBy = caller` on create (see `create.mapToEntity`), so a
  // role granted the `.own` modifier on `api_keys.view` sees/updates/deletes only
  // its own keys. Without that modifier this is a no-op — behaviour is unchanged.
  orm: { entity: ApiKey, orgField: null, ownerField: 'createdBy', ownerFeature: 'api_keys.view' },
  list: { schema: listQuerySchema },
  create: {
    schema: createApiKeySchema,
    mapToEntity: (input, ctx) => {
      const scopedCtx = ctx as ApiKeyCrudCtx
      const secretData = scopedCtx.__apiKeySecret
      const keyHash = scopedCtx.__apiKeyHash
      if (!secretData || !keyHash) throw new Error('API key secret not prepared')
      const roleIds = Array.isArray(scopedCtx.__apiKeyRoleIds) ? scopedCtx.__apiKeyRoleIds : []
      const organizationId = scopedCtx.__apiKeyOrganizationId ?? null
      const tenantId = scopedCtx.__apiKeyTenantId ?? null
      return {
        name: input.name,
        description: input.description ?? null,
        tenantId,
        organizationId,
        keyHash,
        keyPrefix: secretData.prefix,
        rolesJson: roleIds,
        createdBy: ctx.auth?.sub ?? null,
        expiresAt: input.expiresAt ?? null,
        // Null rather than 'service' when unset: null is what every existing row
        // holds, and writing a default here would make new rows differ from old
        // ones for no reason. Both read as a service.
        principalKind: input.principalKind ?? null,
      }
    },
    response: (entity) => {
      const meta = entity as ApiKeyEntityWithMeta
      const secret = meta.__apiKeySecret
      const roles = meta.__apiKeyRoles
      return {
        id: String(entity.id),
        name: entity.name,
        keyPrefix: entity.keyPrefix,
        secret,
        tenantId: entity.tenantId ?? null,
        organizationId: entity.organizationId ?? null,
        roles: Array.isArray(roles)
          ? roles.map((role) => ({ id: String(role.id), name: role.name ?? null }))
          : (Array.isArray(entity.rolesJson) ? entity.rolesJson.map((id: string) => ({ id, name: null })) : []),
      }
    },
  },
  del: { idFrom: 'query' },
  hooks: {
    beforeList: async (query, ctx) => {
      const auth = ctx.auth
      const { translate } = await resolveTranslations()
      if (!auth?.tenantId) throw json({ error: translate('api_keys.errors.tenantRequired', 'Tenant context required') }, { status: 400 })
      const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1)
      const pageSize = Math.min(Math.max(parseInt(query.pageSize ?? '20', 10) || 20, 1), 200)
      const search = (query.search ?? '').trim().toLowerCase()

      const organizationIds = Array.isArray(ctx.organizationIds) ? ctx.organizationIds : null
      if (organizationIds && organizationIds.length === 0) {
        throw json({ items: [], total: 0, page, pageSize, totalPages: 0 })
      }

      const em = (ctx.container.resolve('em') as EntityManager)
      const qb = em.createQueryBuilder(ApiKey, 'k')
      qb.where({ deletedAt: null })
      qb.andWhere({ tenantId: auth.tenantId })
      if (organizationIds && organizationIds.length > 0) {
        qb.andWhere({ organizationId: { $in: organizationIds } })
      } else if (auth.orgId) {
        qb.andWhere({ organizationId: auth.orgId })
      }
      // Row 16 (Option A): this hook builds its OWN query and short-circuits the
      // factory via `throw json(...)`, so it never reaches `buildScopedWhere`.
      // An own-only role's row scope must therefore be applied HERE too, or the
      // list path would leak every key in the organization. `ctx.rowScope` is
      // resolved once in `withCtx()` and is `null` unless the route opted in AND
      // the caller holds the `.own` grant — so this is a strict no-op otherwise.
      if (ctx.rowScope) {
        qb.andWhere({ [ctx.rowScope.ownerField]: ctx.rowScope.ownerUserId })
      }
      if (search) {
        const pattern = `%${escapeLikePattern(search)}%`
        qb.andWhere({
          $or: [
            { name: { $ilike: pattern } },
            { keyPrefix: { $ilike: pattern } },
          ],
        })
      }
      qb.orderBy({ createdAt: 'desc' })
      qb.limit(pageSize).offset((page - 1) * pageSize)
      const [items, total] = await qb.getResultAndCount()

      if (!items.length) {
        throw json({ items: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
      }

      const roleIdSet = new Set<string>()
      const orgIdSet = new Set<string>()
      for (const item of items) {
        if (Array.isArray(item.rolesJson)) {
          for (const roleId of item.rolesJson) roleIdSet.add(String(roleId))
        }
        if (item.organizationId) orgIdSet.add(String(item.organizationId))
      }

      const roleIdArray = Array.from(roleIdSet)
      const organizationIdArray = Array.from(orgIdSet)
      const roleFilter: FilterQuery<Role> = { id: { $in: roleIdArray } }
      const organizationFilter: FilterQuery<Organization> = { id: { $in: organizationIdArray } }
      const [roles, organizations] = await Promise.all([
        roleIdArray.length ? em.find(Role, roleFilter) : [],
        organizationIdArray.length ? em.find(Organization, organizationFilter) : [],
      ])
      const roleMap = new Map(roles.map((role) => [String(role.id), role.name ?? null]))
      const orgMap = new Map(organizations.map((org) => [String(org.id), org.name ?? null]))

      const payload = {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? null,
          keyPrefix: item.keyPrefix,
          organizationId: item.organizationId ?? null,
          organizationName: item.organizationId ? orgMap.get(String(item.organizationId)) ?? null : null,
          createdAt: item.createdAt,
          lastUsedAt: item.lastUsedAt ?? null,
          expiresAt: item.expiresAt ?? null,
          roles: Array.isArray(item.rolesJson)
            ? item.rolesJson.map((id) => ({ id, name: roleMap.get(String(id)) ?? null }))
            : [],
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }

      throw json(payload)
    },
    beforeCreate: async (input, ctx) => {
      const auth = ctx.auth
      const { translate } = await resolveTranslations()
      if (!auth?.tenantId) throw json({ error: translate('api_keys.errors.tenantRequired', 'Tenant context required') }, { status: 400 })

      const requestedTenant = Object.prototype.hasOwnProperty.call(input, 'tenantId') ? input.tenantId : auth.tenantId
      const scopedCtx = ctx as ApiKeyCrudCtx
      const targetTenantId = await enforceTenantSelection(scopedCtx, requestedTenant)
      scopedCtx.__apiKeyTenantId = targetTenantId

      const secretData = generateApiKeySecret()
      scopedCtx.__apiKeySecret = secretData
      scopedCtx.__apiKeyHash = await hashApiKey(secretData.secret)

      const em = (ctx.container.resolve('em') as EntityManager)
      const roleTokens = Array.isArray(input.roles) ? input.roles.filter((value) => typeof value === 'string' && value.trim().length > 0) : []
      const roleEntities: Role[] = []
      const roleIds: string[] = []
      for (const token of roleTokens) {
        const value = token.trim()
        const rawTenantId = targetTenantId ?? auth.tenantId ?? null
        const effectiveTenantId = typeof rawTenantId === 'string' && rawTenantId.trim().length > 0 ? rawTenantId.trim() : null
        const normalizedEffectiveTenantId = effectiveTenantId ? effectiveTenantId.toLowerCase() : null
        let role: Role | null = null
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
          role = await em.findOne(Role, { id: value, deletedAt: null })
        }
        if (!role) {
          const nameFilter: FilterQuery<Role> = { name: value, deletedAt: null }
          if (normalizedEffectiveTenantId) {
            nameFilter.$or = [
              { tenantId: effectiveTenantId },
              { tenantId: null },
            ]
          } else {
            nameFilter.tenantId = null
          }
          const candidates = await em.find(Role, nameFilter, { limit: 5 })
          if (normalizedEffectiveTenantId) {
            role =
              candidates.find((candidate) => {
                if (!candidate.tenantId) return false
                return String(candidate.tenantId).toLowerCase() === normalizedEffectiveTenantId
              }) ??
              candidates.find((candidate) => candidate.tenantId === null) ??
              null
          } else {
            role = candidates.find((candidate) => candidate.tenantId === null) ?? null
          }
          if (!role) {
            role = candidates[0] ?? null
          }
        }
        if (!role) {
          throw json({ error: translate('api_keys.errors.roleNotFound', `Role ${value} not found`, { identifier: value }) }, { status: 400 })
        }
        const roleTenantId = role.tenantId ? String(role.tenantId) : null
        const normalizedRoleTenantId = roleTenantId ? roleTenantId.toLowerCase() : null
        if (normalizedRoleTenantId && normalizedEffectiveTenantId && normalizedRoleTenantId !== normalizedEffectiveTenantId) {
          throw json({ error: translate('api_keys.errors.roleWrongTenant', `Role ${role.name} belongs to another tenant`, { role: role.name ?? value }) }, { status: 400 })
        }
        roleEntities.push(role)
        roleIds.push(String(role.id))
      }
      await assertActorCanGrantRoles({
        em,
        rbacService: ctx.container.resolve('rbacService') as RbacService,
        actorUserId: auth.sub,
        tenantId: targetTenantId,
        organizationId: auth.orgId ?? null,
        roles: roleEntities,
      })
      scopedCtx.__apiKeyRoles = roleEntities
      scopedCtx.__apiKeyRoleIds = roleIds

      const allowedIds = ctx.organizationScope?.allowedIds ?? null

      /**
       * U3 — a key whose organization does not match its creator's is rejected
       * at *every use*, not at creation.
       *
       * `resolveApiKeyAuth` resolves a key through `sessionUserId ?? createdBy`
       * and then requires that user's organization to equal the key's. Deriving
       * the key's organization from the *request scope* instead makes the two
       * disagree exactly when the creator has an organization but the request
       * carries no selected one — which is the ordinary case for an admin
       * working tenant-wide. The key is minted, a secret is returned, and every
       * request made with it returns 401 forever.
       *
       * Reproduced 2026-08-10: a key created through the UI came out with a null
       * organization while its creator had one; it returned 401 on first use,
       * and setting that one column to the creator's organization turned the
       * same request into a 200.
       *
       * So the creator's own organization is what the key defaults to. That is
       * also the U4 rule — the actor's *request scope* is not a value to store,
       * because it makes the record mean "whatever scope the person happened to
       * be looking at". The creator's organization is a property of the creator,
       * and it is the one the authentication path will compare against.
       *
       * An organization asked for explicitly is honoured up to the point where
       * it would produce a dead key, and refused there in words. A key that
       * cannot work should fail when someone is watching.
       *
       * The authentication comparison is deliberately left alone. For a session
       * key it is correct — the key acts as that user and must not outrange
       * them. For a regular key it constrains a machine credential by a person's
       * current attributes, which is a different question and is on the backlog.
       */
      const creatorId = auth.sub ?? null
      const creator = creatorId ? await em.findOne(User, { id: creatorId, deletedAt: null }) : null
      const creatorOrganizationId = creator ? creator.organizationId ?? null : null
      const requestedOrganizationId = input.organizationId ?? null

      // A creator that cannot be loaded is an absence of evidence, not evidence
      // of a mismatch: keep the previous derivation rather than blocking every
      // context that does not carry a full user record (CLI, service bootstrap).
      const organizationId = creator
        ? requestedOrganizationId ?? creatorOrganizationId
        : requestedOrganizationId ?? ctx.selectedOrganizationId ?? auth.orgId ?? null

      if (creator && requestedOrganizationId !== null && requestedOrganizationId !== creatorOrganizationId) {
        throw json({
          error: translate(
            'api_keys.errors.organizationMustMatchCreator',
            'This key would belong to a different organization than the person creating it, and would be rejected every time it is used. Create it for your own organization instead.',
          ),
        }, { status: 422 })
      }

      const isSuperAdmin = await resolveIsSuperAdmin(scopedCtx)
      if (
        !isOrganizationAccessAllowed({
          isSuperAdmin,
          allowedOrganizationIds: allowedIds,
          targetOrganizationId: organizationId,
        })
      ) {
        throw json({ error: translate('api_keys.errors.organizationOutOfScope', 'Organization out of scope') }, { status: 403 })
      }
      scopedCtx.__apiKeyOrganizationId = organizationId ?? null

      return { ...input, organizationId }
    },
    afterCreate: async (entity, ctx) => {
      const scopedCtx = ctx as ApiKeyCrudCtx
      const secretData = scopedCtx.__apiKeySecret
      const roles = scopedCtx.__apiKeyRoles
      if (secretData) (entity as ApiKeyEntityWithMeta).__apiKeySecret = secretData.secret
      if (roles) (entity as ApiKeyEntityWithMeta).__apiKeyRoles = roles
      try {
        const rbac = (ctx.container.resolve('rbacService') as RbacService)
        await rbac.invalidateUserCache(apiKeySubject(entity.id))
      } catch {}
    },
    beforeDelete: async (id, ctx) => {
      const auth = ctx.auth
      const { translate } = await resolveTranslations()
      if (!auth?.tenantId) throw json({ error: translate('api_keys.errors.tenantRequired', 'Tenant context required') }, { status: 400 })
      const em = (ctx.container.resolve('em') as EntityManager)
      const scopedCtx = ctx as ApiKeyCrudCtx
      const isSuperAdmin = await resolveIsSuperAdmin(scopedCtx)
      const allowedIds = ctx.organizationScope?.allowedIds ?? null
      const recordFilter: FilterQuery<ApiKey> = {
        id,
        tenantId: auth.tenantId,
        deletedAt: null,
      }
      if (!isSuperAdmin && Array.isArray(allowedIds)) {
        recordFilter.organizationId = { $in: allowedIds }
      }
      const record = await findOneWithDecryption(
        em,
        ApiKey,
        recordFilter,
        undefined,
        { tenantId: auth.tenantId, organizationId: null },
      )
      if (
        !record ||
        record.tenantId !== auth.tenantId ||
        !isOrganizationAccessAllowed({
          isSuperAdmin,
          allowedOrganizationIds: allowedIds,
          targetOrganizationId: record.organizationId ?? null,
        })
      ) {
        throw json({ error: translate('api_keys.errors.notFound', 'Not found') }, { status: 404 })
      }
      scopedCtx.__apiKeyOrganizationId = record.organizationId ?? null
    },
    afterDelete: async (id, ctx) => {
      try {
        const rbac = (ctx.container.resolve('rbacService') as RbacService)
        await rbac.invalidateUserCache(apiKeySubject(id))
      } catch {}
    },
  },
})

export const metadata = crud.metadata
export const GET = crud.GET
export const POST = crud.POST
export const DELETE = crud.DELETE

export const openApi: OpenApiRouteDoc = {
  summary: 'Manage API keys',
  description:
    'Provides list, creation, and deletion capabilities for API keys scoped to the authenticated tenant and organization.',
  methods: {
    GET: {
      summary: 'List API keys',
      description:
        'Returns paginated API keys visible to the current user, including per-key role assignments and organization context.',
      query: listQuerySchema,
      responses: [
        {
          status: 200,
          description: 'Collection of API keys',
          schema: apiKeyCollectionResponseSchema,
        },
      ],
      errors: [
        { status: 400, description: 'Tenant context missing', schema: errorSchema },
        { status: 401, description: 'Unauthorized', schema: errorSchema },
        { status: 403, description: 'Forbidden by organization scope', schema: errorSchema },
      ],
    },
    POST: {
      summary: 'Create API key',
      description:
        'Creates a new API key, returning the one-time secret value together with the generated key prefix and scope details.',
      requestBody: {
        contentType: 'application/json',
        schema: createApiKeySchema,
        description: 'API key definition including optional scope and role assignments.',
      },
      responses: [
        {
          status: 201,
          description: 'API key created successfully',
          schema: apiKeyCreateResponseSchema,
        },
      ],
      errors: [
        { status: 400, description: 'Invalid payload or missing tenant context', schema: errorSchema },
        { status: 401, description: 'Unauthorized', schema: errorSchema },
        { status: 403, description: 'Organization outside allowed scope', schema: errorSchema },
      ],
    },
    DELETE: {
      summary: 'Delete API key',
      description:
        'Removes an API key by identifier. The key must belong to the current tenant and fall within the requester organization scope.',
      query: z.object({
        id: z.string().uuid().describe('API key identifier to delete'),
      }),
      responses: [
        { status: 200, description: 'Key deleted successfully', schema: deleteResponseSchema },
      ],
      errors: [
        { status: 400, description: 'Missing or invalid identifier', schema: errorSchema },
        { status: 401, description: 'Unauthorized', schema: errorSchema },
        { status: 403, description: 'Organization outside allowed scope', schema: errorSchema },
        { status: 404, description: 'Key not found within scope', schema: errorSchema },
      ],
    },
  },
}
