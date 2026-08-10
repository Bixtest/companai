/**
 * R6 — the bridge between the organization graph and the resolver.
 *
 * The rules themselves are exhaustively tested as pure functions in
 * `packages/shared/src/lib/authority/__tests__/graph.test.ts`. What is tested
 * here is everything the pure functions cannot see: that the queries are scoped
 * to the tenant, that the path is assembled from the ancestor index in the order
 * that index is actually written in, and — the reason this file exists — that
 * every way of failing to establish a ceiling is distinguishable from having
 * established that there is none.
 *
 * `A5` means "nothing constrains this". A lookup that returns nothing must never
 * be allowed to say the same thing.
 */

import type { EntityManager } from '@mikro-orm/postgresql'
import { AuthorityGraphService } from '../authorityGraphService'

const TENANT = 'tenant-1'
const OTHER_TENANT = 'tenant-2'
const GROUP = 'org-group'
const SUBSIDIARY = 'org-subsidiary'
const TEAM = 'org-team'

type OrganizationFixture = { id: string; tenantId: string; ancestorIds: string[] }

type EdgeFixture = {
  tenantId: string
  parentId: string
  childId: string
  relationshipType: string
  inheritanceMode?: string
  authorityCeiling?: string
  moduleGrants?: string[] | null
}

/**
 * A stand-in for the two tables this service reads.
 *
 * It answers the service's SQL by applying the filters that SQL declares —
 * tenant, soft delete, and membership of the chain — rather than by returning a
 * fixed answer. A fake that ignores the tenant filter would pass a test that a
 * cross-tenant leak also passes.
 */
function createFakeGraph(organizations: OrganizationFixture[], edges: EdgeFixture[]) {
  const queries: Array<{ sql: string; params: unknown[] }> = []

  const execute = jest.fn(async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params })

    if (sql.includes('from organizations')) {
      const [organizationId, tenantId] = params as [string, string]
      const match = organizations.find((org) => org.id === organizationId && org.tenantId === tenantId)
      return match ? [{ ancestor_ids: match.ancestorIds }] : []
    }

    if (sql.includes('from organization_edges')) {
      const [tenantId, parentIds, childIds] = params as [string, string[], string[]]
      return edges
        .filter((edge) => edge.tenantId === tenantId)
        .filter((edge) => parentIds.includes(edge.parentId) && childIds.includes(edge.childId))
        .map((edge) => ({
          parent_id: edge.parentId,
          child_id: edge.childId,
          relationship_type: edge.relationshipType,
          inheritance_mode: edge.inheritanceMode ?? 'strict',
          authority_ceiling: edge.authorityCeiling ?? 'A5',
          module_grants: edge.moduleGrants ?? null,
        }))
    }

    throw new Error(`[internal] unexpected sql: ${sql}`)
  })

  const em = { getConnection: () => ({ execute }) } as unknown as EntityManager
  return { service: new AuthorityGraphService(em), queries, execute }
}

describe('AuthorityGraphService', () => {
  describe('a ceiling it could not establish', () => {
    it('does not report an unknown organization as unconstrained', async () => {
      const { service } = createFakeGraph([], [])

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      expect(result.basis).toBe('organization-unknown')
      expect(result.ceiling).toBe('A0')
    })

    it('does not resolve an organization belonging to another tenant', async () => {
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: OTHER_TENANT, ancestorIds: [] }],
        [],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      // The organization exists. It is not this tenant's, which is the same
      // answer as not existing and must not be the same answer as unconstrained.
      expect(result.basis).toBe('organization-unknown')
      expect(result.ceiling).toBe('A0')
    })

    it('fails closed when the ancestor index is ordered leaf-first', async () => {
      // `directory/lib/hierarchy.ts` writes ancestor_ids root-first. If that ever
      // inverts, every edge stops matching a hop — and the natural consequence,
      // an empty path, resolves to A5. That is a silent grant of full autonomy
      // caused by another module changing an array order.
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [SUBSIDIARY, GROUP] }],
        [
          { tenantId: TENANT, parentId: GROUP, childId: SUBSIDIARY, relationshipType: 'owns' },
          { tenantId: TENANT, parentId: SUBSIDIARY, childId: TEAM, relationshipType: 'advises' },
        ],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      expect(result.basis).toBe('path-unresolved')
      expect(result.ceiling).toBe('A0')
    })
  })

  describe('a ceiling it established to be absent', () => {
    it('reports a root organization as unconstrained, and says why', async () => {
      const { service, execute } = createFakeGraph(
        [{ id: GROUP, tenantId: TENANT, ancestorIds: [] }],
        [],
      )

      const result = await service.ceilingFor(GROUP, TENANT, 'directory.organizations.manage')

      expect(result).toMatchObject({ ceiling: 'A5', basis: 'no-ancestors', unmappedHops: [] })
      // No ancestors means no path, so the edge query is not worth issuing.
      expect(execute).toHaveBeenCalledTimes(1)
    })

    it('reports the hops that carry no edge rather than absorbing them', async () => {
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [GROUP, SUBSIDIARY] }],
        [{ tenantId: TENANT, parentId: SUBSIDIARY, childId: TEAM, relationshipType: 'owns' }],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      // An absent edge has never meant forbidden, so the ceiling stays A5 — but
      // an unconstrained answer resting on one unmapped hop is a different claim
      // from one resting on none, and the explanation has to carry the
      // difference.
      expect(result.ceiling).toBe('A5')
      expect(result.basis).toBe('edges')
      expect(result.unmappedHops).toEqual([{ parentId: GROUP, childId: SUBSIDIARY }])
    })
  })

  describe('the path it assembles', () => {
    it('applies every edge above the organization, root first', async () => {
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [GROUP, SUBSIDIARY] }],
        [
          { tenantId: TENANT, parentId: GROUP, childId: SUBSIDIARY, relationshipType: 'supervises' },
          { tenantId: TENANT, parentId: SUBSIDIARY, childId: TEAM, relationshipType: 'advises' },
        ],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      // supervises caps at A4, advises at A2; the minimum wins.
      expect(result.ceiling).toBe('A2')
      expect(result.basis).toBe('edges')
      expect(result.unmappedHops).toEqual([])
      expect(result.contributingEdges.map((entry) => entry.edge.relationshipType)).toEqual([
        'supervises',
        'advises',
      ])
    })

    it('ignores an edge between two organizations on the path that is not a hop', async () => {
      // A group may hold a direct edge to a team three levels down. It is a real
      // edge and the query returns it, because both ends are in the chain — but
      // it is not a step on the path, and counting it would apply a constraint
      // twice or skip the levels between.
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [GROUP, SUBSIDIARY] }],
        [
          { tenantId: TENANT, parentId: GROUP, childId: SUBSIDIARY, relationshipType: 'owns' },
          { tenantId: TENANT, parentId: SUBSIDIARY, childId: TEAM, relationshipType: 'owns' },
          { tenantId: TENANT, parentId: GROUP, childId: TEAM, relationshipType: 'advises' },
        ],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      expect(result.ceiling).toBe('A5')
      expect(result.contributingEdges).toEqual([])
    })

    it('does not read another tenant\'s edges for the same organization ids', async () => {
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [SUBSIDIARY] }],
        [
          {
            tenantId: OTHER_TENANT,
            parentId: SUBSIDIARY,
            childId: TEAM,
            relationshipType: 'advises',
            authorityCeiling: 'A0',
          },
        ],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      // The other tenant's edge would have capped this at A0. Reading it would
      // be a cross-tenant leak in the direction that looks harmless — a refusal
      // one tenant can cause in another.
      expect(result.ceiling).toBe('A5')
      expect(result.contributingEdges).toEqual([])
    })

    it('scopes both queries to the tenant and excludes deleted rows', async () => {
      const { service, queries } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [SUBSIDIARY] }],
        [{ tenantId: TENANT, parentId: SUBSIDIARY, childId: TEAM, relationshipType: 'owns' }],
      )

      await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      expect(queries).toHaveLength(2)
      for (const query of queries) {
        expect(query.sql).toContain('tenant_id = ?')
        expect(query.sql).toContain('deleted_at is null')
        expect(query.params).toContain(TENANT)
      }
    })

    it('blocks a capability an edge does not pass down', async () => {
      const { service } = createFakeGraph(
        [{ id: TEAM, tenantId: TENANT, ancestorIds: [SUBSIDIARY] }],
        [
          {
            tenantId: TENANT,
            parentId: SUBSIDIARY,
            childId: TEAM,
            relationshipType: 'owns',
            moduleGrants: ['directory.organizations.view'],
          },
        ],
      )

      const result = await service.ceilingFor(TEAM, TENANT, 'directory.organizations.manage')

      expect(result.capabilityBlocked).toBe(true)
      expect(result.ceiling).toBe('A0')
    })

    it('tolerates a null ancestor index the same way it tolerates an empty one', async () => {
      const { service } = createFakeGraph(
        [{ id: GROUP, tenantId: TENANT, ancestorIds: null as unknown as string[] }],
        [],
      )

      const result = await service.ceilingFor(GROUP, TENANT, 'directory.organizations.manage')

      expect(result).toMatchObject({ ceiling: 'A5', basis: 'no-ancestors' })
    })
  })
})
