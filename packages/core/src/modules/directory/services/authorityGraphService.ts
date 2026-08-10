import type { EntityManager } from '@mikro-orm/postgresql'
import type { CacheStrategy } from '@open-mercato/cache'
import {
  orderEdgesAlongPath,
  resolveGraphCeiling,
  type AuthorityEdge,
  type GraphCeilingResult,
} from '@open-mercato/shared/lib/authority/graph'
import type { AutonomyGate } from '@open-mercato/shared/modules/capabilities'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('directory').child({ component: 'authority-graph-service' })

/**
 * Why a ceiling is what it is — the part `GraphCeilingResult` cannot express.
 *
 * `A5` means "nothing constrains this" and is a perfectly ordinary answer for a
 * root organization. It is also what a lookup that found nothing would return if
 * the two were not distinguished, and those are opposite facts: one is a
 * constraint that does not exist, the other is a constraint that could not be
 * read. Conflating them is how an authorization layer ends up permitting an act
 * because it failed to answer the question.
 */
export type OrganizationCeilingBasis =
  /** At least one edge above this organization was read and applied. */
  | 'edges'
  /** A root organization: nothing sits above it, so nothing bounds it here. */
  | 'no-ancestors'
  /** The organization does not exist in this tenant. Fails closed. */
  | 'organization-unknown'
  /** The path could not be assembled from the ancestor index. Fails closed. */
  | 'path-unresolved'

export type OrganizationCeilingResult = GraphCeilingResult & {
  basis: OrganizationCeilingBasis
  /**
   * Hops on the path with no edge recorded between them.
   *
   * Not an error — the organization tree existed long before edges did, and an
   * absent edge has never meant "forbidden". It is reported because an
   * unconstrained answer built from four hops of which three are unmapped is a
   * different claim from one built from four mapped hops, and the reader of an
   * explanation deserves to know which they have.
   */
  unmappedHops: Array<{ parentId: string; childId: string }>
}

type OrganizationRow = { ancestor_ids: string[] | null }

type EdgeRow = {
  parent_id: string
  child_id: string
  relationship_type: string
  inheritance_mode: string
  authority_ceiling: string
  module_grants: string[] | null
}

/**
 * Bridges the organization graph to the resolver (R6).
 *
 * The pure logic lives in `@open-mercato/shared/lib/authority/graph`; this is the
 * part that knows where the edges are stored and how to find the path to an
 * organization. Keeping them apart matters: the rules are worth testing
 * exhaustively without a database, and the database access is worth keeping in
 * one place rather than repeated at every call site.
 *
 * Reads the closure columns the platform already maintains rather than walking
 * parents one query at a time — planning 08 is explicit that R6 keeps
 * `ancestor_ids` as the resolution index.
 */
export class AuthorityGraphService {
  constructor(
    private readonly em: EntityManager,
    private readonly cache?: CacheStrategy,
  ) {}

  /**
   * The ceiling that this organization's position imposes on one capability.
   *
   * Returns `A5` — no constraint — for a root organization or for a path whose
   * edges impose nothing. Every other outcome carries a `basis` that says why,
   * and the two failure shapes below return `A0` rather than the unconstrained
   * default, because a ceiling this service could not establish must never read
   * as a ceiling it established to be absent.
   *
   * Two queries per call, which is why enforcement reads it through the cache
   * below rather than calling this directly on every permission check.
   */
  async ceilingFor(
    organizationId: string,
    tenantId: string,
    capabilityId: string,
  ): Promise<OrganizationCeilingResult> {
    const rows = await this.em.getConnection().execute<OrganizationRow[]>(
      'select ancestor_ids from organizations where id = ? and tenant_id = ? and deleted_at is null limit 1',
      [organizationId, tenantId],
    )

    if (rows.length === 0) {
      // Either the id is wrong, the organization is deleted, or it belongs to
      // another tenant. All three are reasons to establish no authority at all.
      logger.warn('Authority ceiling requested for an organization that is not in this tenant', {
        organizationId,
        tenantId,
        capabilityId,
      })
      return {
        ceiling: 'A0',
        contributingEdges: [],
        capabilityBlocked: false,
        basis: 'organization-unknown',
        unmappedHops: [],
      }
    }

    const ancestorIds = rows[0]?.ancestor_ids ?? []
    if (ancestorIds.length === 0) {
      return {
        ceiling: 'A5',
        contributingEdges: [],
        capabilityBlocked: false,
        basis: 'no-ancestors',
        unmappedHops: [],
      }
    }

    const chain = [...ancestorIds, organizationId]
    const edgeRows = await this.em.getConnection().execute<EdgeRow[]>(
      // `in (?)` rather than `= any(?)`: the query builder expands an array
      // binding into a comma-separated list, which `in (...)` is built to take
      // and `any(...)` is not — `any('a','b')` is a syntax error. The chain
      // always holds at least two ids by the time this runs (the caller returned
      // early on an empty ancestor list), so the list is never empty.
      `select parent_id, child_id, relationship_type, inheritance_mode, authority_ceiling, module_grants
         from organization_edges
        where tenant_id = ?
          and deleted_at is null
          and parent_id in (?)
          and child_id in (?)`,
      [tenantId, chain, chain],
    )

    const edges: AuthorityEdge[] = edgeRows.map((row) => ({
      parentId: row.parent_id,
      childId: row.child_id,
      relationshipType: row.relationship_type as AuthorityEdge['relationshipType'],
      inheritanceMode: row.inheritance_mode as AuthorityEdge['inheritanceMode'],
      authorityCeiling: row.authority_ceiling as AutonomyGate,
      moduleGrants: row.module_grants,
    }))

    const path = orderEdgesAlongPath(edges, ancestorIds, organizationId)

    /**
     * `orderEdgesAlongPath` reads `ancestor_ids` as root-first, which is how
     * `directory/lib/hierarchy.ts` builds it. That is another module's internal
     * ordering, and if it ever inverts, every edge stops matching a hop and this
     * service quietly reports "unconstrained" for organizations that are
     * constrained — the worst possible direction for a silent failure.
     *
     * A leaf-first index has a signature: the real edges match the hops
     * *reversed*. That is cheap to look for and cannot be produced by ordinary
     * data, because the write path refuses an edge whose child is already an
     * ancestor of its parent.
     */
    if (path.length === 0 && edges.length > 0) {
      const reversed = countReversedHops(edges, chain)
      if (reversed > 0) {
        logger.error('Organization ancestor index appears to be leaf-first; authority path could not be assembled', {
          organizationId,
          tenantId,
          capabilityId,
          edgesRead: edges.length,
          reversedMatches: reversed,
        })
        return {
          ceiling: 'A0',
          contributingEdges: [],
          capabilityBlocked: false,
          basis: 'path-unresolved',
          unmappedHops: [],
        }
      }
    }

    const result = resolveGraphCeiling(path, capabilityId)
    return {
      ...result,
      basis: path.length > 0 ? 'edges' : 'no-ancestors',
      unmappedHops: findUnmappedHops(path, chain),
    }
  }

  /**
   * The same ceiling, memoised for the request path.
   *
   * Enforcement asks this question on **every permission check**, and the
   * uncached answer costs two queries. The graph changes when somebody edits an
   * edge or moves an organization, which is rare enough that a cache with
   * explicit invalidation is honest rather than a guess with a timeout on it.
   *
   * `invalidateTenant` below is called by both writers, so the TTL is a backstop
   * and not the mechanism.
   *
   * **The two failure shapes are never cached.** Both mean "this could not be
   * established", both fail closed at `A0`, and storing either would turn a
   * momentary condition — an organization created a second ago, a half-applied
   * structural change — into five minutes of refusals.
   */
  async cachedCeilingFor(
    organizationId: string,
    tenantId: string,
    capabilityId: string,
  ): Promise<OrganizationCeilingResult> {
    if (!this.cache) return this.ceilingFor(organizationId, tenantId, capabilityId)

    const key = `authority:graph:${tenantId}:${organizationId}:${capabilityId}`
    const cached = await this.cache.get(key)
    if (isCeilingResult(cached)) return cached

    const result = await this.ceilingFor(organizationId, tenantId, capabilityId)
    if (result.basis !== 'organization-unknown' && result.basis !== 'path-unresolved') {
      await this.cache.set(key, result as unknown as Parameters<CacheStrategy['set']>[1], {
        ttl: CEILING_CACHE_TTL_MS,
        tags: [authorityGraphTenantTag(tenantId)],
      })
    }
    return result
  }

  /**
   * Drops every cached ceiling for one tenant.
   *
   * Deliberately whole-tenant rather than per-organization: an edge added above
   * a group changes the ceiling of everything beneath it, and a moved
   * organization rewrites the ancestor index of its whole subtree. Working out
   * exactly which keys those touch is more code than re-reading them, and being
   * wrong means serving an authority answer the graph no longer supports.
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    if (!this.cache) return
    await this.cache.deleteByTags([authorityGraphTenantTag(tenantId)])
  }
}

const CEILING_CACHE_TTL_MS = 5 * 60 * 1000

export function authorityGraphTenantTag(tenantId: string): string {
  return `authority:graph:tenant:${tenantId}`
}

/** A cache can hand back anything; only a value of the right shape is a hit. */
function isCeilingResult(value: unknown): value is OrganizationCeilingResult {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<OrganizationCeilingResult>
  return (
    typeof candidate.ceiling === 'string' &&
    typeof candidate.basis === 'string' &&
    typeof candidate.capabilityBlocked === 'boolean' &&
    Array.isArray(candidate.contributingEdges) &&
    Array.isArray(candidate.unmappedHops)
  )
}

/** Hops in the chain that no edge on the resolved path covers. */
function findUnmappedHops(
  path: AuthorityEdge[],
  chain: string[],
): Array<{ parentId: string; childId: string }> {
  const covered = new Set(path.map((edge) => `${edge.parentId}>${edge.childId}`))
  const unmapped: Array<{ parentId: string; childId: string }> = []
  for (let index = 0; index < chain.length - 1; index += 1) {
    const parentId = chain[index]!
    const childId = chain[index + 1]!
    if (!covered.has(`${parentId}>${childId}`)) unmapped.push({ parentId, childId })
  }
  return unmapped
}

/** Edges that would have matched a hop had the chain been walked backwards. */
function countReversedHops(edges: AuthorityEdge[], chain: string[]): number {
  const hops = new Set<string>()
  for (let index = 0; index < chain.length - 1; index += 1) {
    hops.add(`${chain[index + 1]!}>${chain[index]!}`)
  }
  return edges.filter((edge) => hops.has(`${edge.parentId}>${edge.childId}`)).length
}
