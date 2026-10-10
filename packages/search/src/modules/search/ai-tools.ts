import { z } from 'zod'
import type {
  SearchEntityConfig,
  SearchResult,
  SearchStrategyId,
} from '@open-mercato/shared/modules/search'
import { hasAllFeatures } from '@open-mercato/shared/security/features'
import {
  resolveExportEncryptedFields,
  isEncryptedExportField,
  MASKED_EXPORT_VALUE,
  type ExportEncryptionService,
} from '@open-mercato/shared/lib/crud/export-encryption'

/**
 * AI Tools definitions for the Search module.
 *
 * These tool definitions are discovered by the ai-assistant module's generator
 * and registered as MCP tools. The search module does not depend on ai-assistant.
 *
 * Tool Definition Format:
 * - name: Unique tool identifier (module_action format, no dots allowed)
 * - description: Human-readable description for AI clients
 * - inputSchema: Zod schema for input validation
 * - requiredFeatures: ACL features required to execute
 * - handler: Async function that executes the tool
 */

/**
 * Tool context provided by the MCP server at execution time.
 */
type ToolContext = {
  tenantId: string | null
  organizationId: string | null
  userId: string | null
  container: {
    resolve: <T = unknown>(name: string) => T
  }
  userFeatures: string[]
  isSuperAdmin: boolean
}

/**
 * Tool definition structure.
 */
type AiToolDefinition = {
  name: string
  description: string
  inputSchema: z.ZodType<any>
  requiredFeatures?: string[]
  /**
   * Optional flag — when true, the tool is treated as a write by the
   * agent runtime and routed through the pending-action approval card.
   * Mirrors the public `AiToolDefinition.isMutation` flag without taking
   * a hard dependency on `@open-mercato/ai-assistant` here.
   */
  isMutation?: boolean
  handler: (input: any, ctx: ToolContext) => Promise<unknown>
}

/**
 * Minimal shape of the `searchIndexer` DI service consumed by the per-entity
 * ACL / field-policy resolution below. Kept local to avoid importing the full
 * `SearchIndexer` class into the tool module.
 */
type SearchIndexerLike = {
  getEntityConfig: (entityId: string) => SearchEntityConfig | undefined
}

class SearchToolAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SearchToolAuthorizationError'
  }
}

/**
 * Resolve the search config for an entity type and enforce the per-entity view
 * feature(s). Data-returning tools (`search_get` / `search_aggregate`) MUST NOT
 * rely on the search-administration `search.view` feature to gate record reads.
 *
 * Fails closed: when the entity is not configured for search, or has no
 * `aclFeatures` declared, access is denied so records are never exposed without
 * an explicit owning-module grant.
 */
function authorizeEntityAccess(entityType: string, ctx: ToolContext): SearchEntityConfig {
  const searchIndexer = ctx.container.resolve<SearchIndexerLike>('searchIndexer')
  const config = searchIndexer.getEntityConfig(entityType)

  if (!config) {
    throw new SearchToolAuthorizationError(
      `[internal] Entity type "${entityType}" is not configured for search`
    )
  }

  if (ctx.isSuperAdmin) return config

  const required = config.aclFeatures
  if (!required || required.length === 0) {
    throw new SearchToolAuthorizationError(
      `[internal] Entity type "${entityType}" does not declare aclFeatures; access denied`
    )
  }

  if (!hasAllFeatures(ctx.userFeatures, required)) {
    throw new SearchToolAuthorizationError(
      `[internal] Insufficient permissions for entity "${entityType}". Required: ${required.join(', ')}`
    )
  }

  return config
}

/**
 * Strip fields that the entity's field policy marks as sensitive
 * (`hashOnly` exact-match PII or fully `excluded`) from a query-engine record.
 * Defense-in-depth so even an authorized caller never receives decrypted PII or
 * fields a `fieldPolicy` keeps out of search.
 */
function stripSensitiveFields(
  record: Record<string, unknown>,
  config: SearchEntityConfig
): Record<string, unknown> {
  const sensitive = new Set<string>([
    ...(config.fieldPolicy?.hashOnly ?? []),
    ...(config.fieldPolicy?.excluded ?? []),
  ])
  if (sensitive.size === 0) return record
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (sensitive.has(key)) continue
    safe[key] = value
  }
  return safe
}

/**
 * Determine whether a field is a safe aggregation grouping key for an entity.
 * Only fields explicitly declared `searchable` are allowed; `hashOnly` and
 * `excluded` (PII / sensitive) fields can never be enumerated via group-by.
 */
function isGroupByAllowed(field: string, config: SearchEntityConfig): boolean {
  const sensitive = new Set<string>([
    ...(config.fieldPolicy?.hashOnly ?? []),
    ...(config.fieldPolicy?.excluded ?? []),
  ])
  if (sensitive.has(field)) return false
  const searchable = config.fieldPolicy?.searchable ?? []
  return searchable.includes(field)
}

/**
 * Row 18 — apply the platform's COLUMN-LEVEL **data-classification** mask to a
 * record returned to an AI, so the AI read path is governed by the SAME
 * classification map the human export path is (`CC-45`), not only by the search
 * module's own `fieldPolicy`.
 *
 * This is *defence in depth over* `stripSensitiveFields` (which drops the search
 * `fieldPolicy.hashOnly`/`excluded` names): a field the platform marks via
 * `ModuleEncryptionMap` but which is absent from the search field policy would
 * otherwise leave through `search_get` in clear. The mask, not omission, matches
 * `CC-45`'s owner-decided behaviour.
 *
 * Fail-safe, mirroring `resolveExportEncryptedFields`:
 *   - no service / disabled / unknown entity ⇒ empty set ⇒ **byte-identical** to today;
 *   - a map read that throws ⇒ `maskAll` ⇒ every value masked.
 */
async function maskClassifiedFields(
  record: Record<string, unknown>,
  entityId: string,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  const resolved = await resolveClassifiedFieldSet(entityId, ctx)
  if (resolved.maskAll) {
    const maskedAll: Record<string, unknown> = {}
    for (const key of Object.keys(record)) maskedAll[key] = MASKED_EXPORT_VALUE
    return maskedAll
  }
  if (resolved.fields.size === 0) return record
  return maskValueDeep(record, resolved.fields) as Record<string, unknown>
}

/**
 * Row 18 (critic round 2) — mask classified keys at ANY depth. `search_get` returns a
 * record whose values may be nested objects/arrays (the human export path never hit this
 * because exports are FLAT rows; the AI path is not, so a key buried inside an object
 * column — e.g. `meta.secret` — would otherwise leave in clear). Walking the structure is
 * the only way to guarantee the column-level gate holds for arbitrary record shapes.
 */
function maskValueDeep(value: unknown, fields: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) return value.map((item) => maskValueDeep(item, fields))
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isEncryptedExportField(key, fields)
        ? MASKED_EXPORT_VALUE
        : maskValueDeep(inner, fields)
    }
    return out
  }
  return value
}

/**
 * Row 18 — resolve the platform classification set for one entity. The single place
 * `maskClassifiedFields`, `entityHasClassifiedFields` and the aggregate gate all read
 * from, so the three cannot drift (L106).
 */
async function resolveClassifiedFieldSet(
  entityId: string,
  ctx: ToolContext
): Promise<{ fields: ReadonlySet<string>; maskAll: boolean }> {
  const resolveService = (): ExportEncryptionService | null => {
    try {
      return (ctx.container.resolve('tenantEncryptionService') as ExportEncryptionService) ?? null
    } catch {
      return null
    }
  }
  return resolveExportEncryptedFields(
    resolveService,
    entityId,
    ctx.tenantId ?? null,
    ctx.organizationId ?? null
  )
}

/**
 * Row 18 — true when the entity carries ANY platform-classified field. `search_query`
 * returns a presenter `title`/`subtitle` that is built at INDEX time (the fallback
 * presenter promotes an arbitrary string field into the title — `fallback-presenter.ts`
 * `findAnyStringValue`), so a classified value can be embedded in it and the tool cannot
 * tell which field it came from. The fail-safe egress rule: for an entity with a non-empty
 * classification map, do NOT return the free-text presenter — return the record id
 * instead. A map read that throws is treated as "classified" (fail closed).
 *
 * Fail-safe, mirroring `resolveExportEncryptedFields`: no service / disabled ⇒ the same
 * empty set as the rest of the platform ⇒ presenter returned unchanged (byte-identical).
 */
async function entityHasClassifiedFields(entityId: string, ctx: ToolContext): Promise<boolean> {
  const resolved = await resolveClassifiedFieldSet(entityId, ctx)
  return resolved.maskAll || resolved.fields.size > 0
}

// =============================================================================
// Tool Definitions
// =============================================================================

const searchQueryTool: AiToolDefinition = {
  name: 'search_query',
  description: `Search across all data using hybrid search. Use this FIRST for finding records.

Returns: title, subtitle, entityType, recordId, url for each match.
Searches customers, products, orders, deals, and more in one call.`,
  inputSchema: z.object({
    query: z.string().min(1).describe('The search query text'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of results to return (default: 20)'),
    entityTypes: z
      .array(z.string())
      .optional()
      .describe(
        'Filter to specific entity types (e.g., ["customers:customer_person_profile", "catalog:product"])'
      ),
    strategies: z
      .array(z.enum(['fulltext', 'vector', 'tokens']))
      .optional()
      .describe('Specific search strategies to use (default: all available)'),
  }),
  requiredFeatures: ['search.global'],
  handler: async (input, ctx) => {
    if (!ctx.tenantId) {
      throw new Error('Tenant context is required for search')
    }

    const searchService = ctx.container.resolve<{
      search: (query: string, options: any) => Promise<SearchResult[]>
    }>('searchService')

    const results = await searchService.search(input.query, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      entityTypes: input.entityTypes,
      strategies: input.strategies as SearchStrategyId[],
      limit: input.limit,
    })

    // Row 18 — the presenter title/subtitle is index-time text and may embed a classified
    // field value; for any entity carrying a classification map, drop the free text and
    // fall back to the record id (fail-safe egress). Resolved once per distinct entity.
    const classifiedByEntity = new Map<string, boolean>()
    await Promise.all(
      Array.from(new Set(results.map((r) => r.entityId))).map(async (entityId) => {
        classifiedByEntity.set(entityId, await entityHasClassifiedFields(entityId, ctx))
      })
    )

    return {
      query: input.query,
      totalResults: results.length,
      results: results.map((result) => {
        const mayLeak = classifiedByEntity.get(result.entityId) === true
        return {
          entityType: result.entityId,
          recordId: result.recordId,
          score: Math.round(result.score * 100) / 100,
          source: result.source,
          title: mayLeak ? result.recordId : (result.presenter?.title ?? result.recordId),
          subtitle: mayLeak ? undefined : result.presenter?.subtitle,
          url: result.url,
        }
      }),
    }
  },
}

const searchStatusTool: AiToolDefinition = {
  name: 'search_status',
  description:
    'Get the current status of the search module, including available search strategies and their availability.',
  inputSchema: z.object({}),
  requiredFeatures: ['search.view'],
  handler: async (_input, ctx) => {
    const searchService = ctx.container.resolve<{
      getStrategies: () => Array<{
        id: string
        name: string
        priority: number
        isAvailable: () => Promise<boolean>
      }>
      getDefaultStrategies: () => string[]
    }>('searchService')

    const strategies = searchService.getStrategies()
    const defaultStrategies = searchService.getDefaultStrategies()

    const strategyStatus = await Promise.all(
      strategies.map(async (strategy) => ({
        id: strategy.id,
        name: strategy.name,
        priority: strategy.priority,
        isAvailable: await strategy.isAvailable(),
        isDefault: defaultStrategies.includes(strategy.id),
      }))
    )

    return {
      strategiesRegistered: strategies.length,
      defaultStrategies,
      strategies: strategyStatus,
    }
  },
}

// =============================================================================
// search.get - Retrieve full record details by entity type and ID
// =============================================================================

const searchGetTool: AiToolDefinition = {
  name: 'search_get',
  description: `Get full record details by entityType and recordId from search_query results.`,
  inputSchema: z.object({
    entityType: z
      .string()
      .describe('The entity type (e.g., "customers:customer_company_profile", "customers:customer_deal")'),
    recordId: z.string().describe('The record ID (UUID)'),
  }),
  requiredFeatures: ['search.view'],
  handler: async (input, ctx) => {
    if (!ctx.tenantId) {
      throw new Error('Tenant context is required')
    }

    const entityConfig = authorizeEntityAccess(input.entityType, ctx)

    const queryEngine = ctx.container.resolve<{
      query: (entityId: string, options: any) => Promise<{ items: unknown[]; total: number }>
    }>('queryEngine')

    const result = await queryEngine.query(input.entityType, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      filters: { id: input.recordId },
      includeCustomFields: true,
      page: { page: 1, pageSize: 1 },
    })

    const rawRecord = result.items[0] as Record<string, unknown> | undefined
    if (!rawRecord) {
      return {
        found: false,
        entityType: input.entityType,
        recordId: input.recordId,
        error: 'Record not found',
      }
    }

    const record = stripSensitiveFields(rawRecord, entityConfig)

    // Row 18 — also apply the platform data-classification mask (the `CC-45`
    // gate the human export path uses), so a classified field cannot leave
    // through this AI read tool in clear. Fail-safe: no map ⇒ byte-identical.
    const classified = await maskClassifiedFields(record, input.entityType, ctx)

    // Extract custom fields
    const customFields: Record<string, unknown> = {}
    const standardFields: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(classified)) {
      if (key.startsWith('cf:') || key.startsWith('cf_')) {
        customFields[key.replace(/^cf[:_]/, '')] = value
      } else {
        standardFields[key] = value
      }
    }

    // Build URL based on entity type
    let url: string | null = null
    const id = classified.id ?? classified.entity_id ?? input.recordId
    if (input.entityType.includes('person')) {
      url = `/backend/customers/people/${id}`
    } else if (input.entityType.includes('company')) {
      url = `/backend/customers/companies/${id}`
    } else if (input.entityType.includes('deal')) {
      url = `/backend/customers/deals/${id}`
    } else if (input.entityType.includes('activity')) {
      const entityId = classified.entity_id ?? classified.entityId
      url = entityId ? `/backend/customers/companies/${entityId}#activity-${id}` : null
    }

    return {
      found: true,
      entityType: input.entityType,
      recordId: input.recordId,
      record: standardFields,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      url,
    }
  },
}

// =============================================================================
// search.schema - Discover searchable entities and their fields
// =============================================================================

const searchSchemaTool: AiToolDefinition = {
  name: 'search_schema',
  description:
    'Discover searchable entities and their fields. Use this to learn what data can be searched and what fields are available for filtering.',
  inputSchema: z.object({
    entityType: z
      .string()
      .optional()
      .describe('Optional: Get schema for a specific entity type only'),
  }),
  requiredFeatures: ['search.view'],
  handler: async (input, ctx) => {
    const searchIndexer = ctx.container.resolve<{
      getAllEntityConfigs: () => Array<{
        entityId: string
        enabled?: boolean
        priority?: number
        strategies?: string[]
        fieldPolicy?: {
          searchable?: string[]
          hashOnly?: string[]
          excluded?: string[]
        }
      }>
    }>('searchIndexer')

    const allConfigs = searchIndexer.getAllEntityConfigs()
    const entities: Array<{
      entityId: string
      enabled: boolean
      priority: number
      strategies?: string[]
      searchableFields?: string[]
      hashOnlyFields?: string[]
      excludedFields?: string[]
    }> = []

    for (const entityConfig of allConfigs) {
      if (input.entityType && entityConfig.entityId !== input.entityType) {
        continue
      }

      entities.push({
        entityId: entityConfig.entityId,
        enabled: entityConfig.enabled !== false,
        priority: entityConfig.priority ?? 5,
        strategies: entityConfig.strategies,
        searchableFields: entityConfig.fieldPolicy?.searchable,
        hashOnlyFields: entityConfig.fieldPolicy?.hashOnly,
        excludedFields: entityConfig.fieldPolicy?.excluded,
      })
    }

    if (input.entityType && entities.length === 0) {
      return {
        found: false,
        entityType: input.entityType,
        error: 'Entity type not configured for search',
      }
    }

    return {
      totalEntities: entities.length,
      entities: entities.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    }
  },
}

// =============================================================================
// search.aggregate - Get counts grouped by field values
// =============================================================================

const searchAggregateTool: AiToolDefinition = {
  name: 'search_aggregate',
  description:
    'Get record counts grouped by a field value. Useful for analytics like "how many deals by stage?" or "customers by status". Samples up to 100 records — percentages may not reflect the full dataset for large entity sets.',
  inputSchema: z.object({
    entityType: z
      .string()
      .describe('The entity type to aggregate (e.g., "customers:customer_deal")'),
    groupBy: z
      .string()
      .describe('The field to group by (e.g., "status", "industry", "pipeline_stage")'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of buckets to return (default: 20)'),
  }),
  requiredFeatures: ['search.view'],
  handler: async (input, ctx) => {
    if (!ctx.tenantId) {
      throw new Error('Tenant context is required')
    }

    const entityConfig = authorizeEntityAccess(input.entityType, ctx)

    if (!isGroupByAllowed(input.groupBy, entityConfig)) {
      throw new SearchToolAuthorizationError(
        `[internal] Field "${input.groupBy}" is not an allowed grouping key for "${input.entityType}"`
      )
    }

    // Row 18 — a classified field must never be enumerable, even as a bucket VALUE.
    // `isGroupByAllowed` only consults the search `fieldPolicy`; a field the PLATFORM
    // classifies (via `ModuleEncryptionMap`) but which is `searchable` would otherwise
    // return its raw values as bucket keys. Reject it (fail closed on a map read error).
    const classified = await resolveClassifiedFieldSet(input.entityType, ctx)
    if (classified.maskAll || isEncryptedExportField(input.groupBy, classified.fields)) {
      throw new SearchToolAuthorizationError(
        `[internal] Field "${input.groupBy}" is classified and cannot be aggregated for "${input.entityType}"`
      )
    }

    const queryEngine = ctx.container.resolve<{
      query: (entityId: string, options: any) => Promise<{ items: unknown[]; total: number }>
    }>('queryEngine')

    // Fetch records and aggregate in memory
    // Note: For large datasets, this should use database GROUP BY
    const result = await queryEngine.query(input.entityType, {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      page: { page: 1, pageSize: 100 },
    })

    const counts = new Map<string | null, number>()
    for (const item of result.items as Record<string, unknown>[]) {
      const value = item[input.groupBy]
      const key = value === null || value === undefined ? null : String(value)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const total = result.items.length
    const buckets = Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, input.limit)

    return {
      entityType: input.entityType,
      groupBy: input.groupBy,
      total,
      buckets,
    }
  },
}

const searchReindexTool: AiToolDefinition = {
  name: 'search_reindex',
  description:
    'Trigger a reindex operation for search data. This rebuilds the search index for the specified entity type or all entities.',
  inputSchema: z.object({
    entityType: z
      .string()
      .optional()
      .describe(
        'Specific entity type to reindex (e.g., "customers:customer_person_profile"). If not provided, reindexes all entities.'
      ),
    strategy: z
      .enum(['fulltext', 'vector'])
      .optional()
      .default('fulltext')
      .describe('Which search strategy to reindex (default: fulltext)'),
    recreateIndex: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to recreate the index from scratch (default: false)'),
  }),
  requiredFeatures: ['search.reindex'],
  // Reindex changes server-side index state — must surface as a write so
  // any agent that whitelists it routes through the approval card.
  isMutation: true,
  handler: async (input, ctx) => {
    if (!ctx.tenantId) {
      throw new Error('Tenant context is required for reindex')
    }

    const searchIndexer = ctx.container.resolve<{
      reindexEntityToFulltext: (params: any) => Promise<any>
      reindexAllToFulltext: (params: any) => Promise<any>
      reindexEntityToVector: (params: any) => Promise<void>
      reindexAllToVector: (params: any) => Promise<void>
    }>('searchIndexer')

    const baseParams = {
      tenantId: ctx.tenantId,
      organizationId: ctx.organizationId,
      recreateIndex: input.recreateIndex,
      useQueue: true,
    }

    if (input.strategy === 'vector') {
      if (input.entityType) {
        await searchIndexer.reindexEntityToVector({
          ...baseParams,
          entityId: input.entityType,
        })
        return {
          status: 'started',
          strategy: 'vector',
          entityType: input.entityType,
          message: `Vector reindex started for ${input.entityType}`,
        }
      } else {
        await searchIndexer.reindexAllToVector(baseParams)
        return {
          status: 'started',
          strategy: 'vector',
          entityType: 'all',
          message: 'Vector reindex started for all entities',
        }
      }
    } else {
      if (input.entityType) {
        const result = await searchIndexer.reindexEntityToFulltext({
          ...baseParams,
          entityId: input.entityType,
        })
        return {
          status: 'completed',
          strategy: 'fulltext',
          entityType: input.entityType,
          ...result,
        }
      } else {
        const result = await searchIndexer.reindexAllToFulltext(baseParams)
        return {
          status: 'completed',
          strategy: 'fulltext',
          entityType: 'all',
          ...result,
        }
      }
    }
  },
}

// =============================================================================
// Export
// =============================================================================

/**
 * All AI tools exported by the search module.
 * Discovered by ai-assistant module's generator.
 */
export const aiTools = [
  searchQueryTool,
  searchStatusTool,
  searchGetTool,
  searchSchemaTool,
  searchAggregateTool,
  searchReindexTool,
]

export default aiTools
