import type { EntityManager } from '@mikro-orm/postgresql'
import {
  orderEdgesAlongPath,
  resolveGraphCeiling,
  type AuthorityEdge,
  type GraphCeilingResult,
} from '@open-mercato/shared/lib/authority/graph'
import type { AutonomyGate } from '@open-mercato/shared/modules/capabilities'

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
  constructor(private readonly em: EntityManager) {}

  /**
   * The ceiling that this organization's position imposes on one capability.
   *
   * Returns `A5` — no constraint — for an organization with no ancestors or no
   * edges. That is the only backward-compatible default: the tree existed long
   * before edges did, and an absent edge has never meant "forbidden".
   */
  async ceilingFor(
    organizationId: string,
    tenantId: string,
    capabilityId: string,
  ): Promise<GraphCeilingResult> {
    const rows = await this.em.getConnection().execute<Array<{ ancestor_ids: string[] | null }>>(
      'select ancestor_ids from organizations where id = ? and tenant_id = ? and deleted_at is null limit 1',
      [organizationId, tenantId],
    )

    const ancestorIds = rows[0]?.ancestor_ids ?? []
    if (ancestorIds.length === 0) {
      return { ceiling: 'A5', contributingEdges: [], capabilityBlocked: false }
    }

    const chain = [...ancestorIds, organizationId]
    const edgeRows = await this.em.getConnection().execute<Array<{
      parent_id: string
      child_id: string
      relationship_type: string
      inheritance_mode: string
      authority_ceiling: string
      module_grants: string[] | null
    }>>(
      `select parent_id, child_id, relationship_type, inheritance_mode, authority_ceiling, module_grants
         from organization_edges
        where tenant_id = ?
          and deleted_at is null
          and parent_id = any(?)
          and child_id = any(?)`,
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

    return resolveGraphCeiling(orderEdgesAlongPath(edges, ancestorIds, organizationId), capabilityId)
  }
}
