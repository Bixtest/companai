import type { EntityManager } from '@mikro-orm/postgresql'
import { Organization, OrganizationEdge } from '@open-mercato/core/modules/directory/data/entities'

export type ComputedOrganizationNode = {
  id: string
  tenantId: string
  name: string
  pathLabel: string
  parentId: string | null
  depth: number
  rootId: string
  treePath: string
  ancestorIds: string[]
  childIds: string[]
  descendantIds: string[]
  isActive: boolean
}

export type ComputedHierarchy = {
  map: Map<string, ComputedOrganizationNode>
  ordered: ComputedOrganizationNode[]
}

type InternalNode = {
  org: Organization
  parentId: string | null
  children: Set<string>
}

function normalizeUuid(value: unknown): string | null {
  if (!value) return null
  const v = String(value).trim()
  if (!v || v.toLowerCase() === 'null' || v.toLowerCase() === 'undefined') return null
  return v
}

export function computeHierarchyForOrganizations(organizations: Organization[], tenantId: string): ComputedHierarchy {
  const nodes = new Map<string, InternalNode>()

  for (const org of organizations) {
    const id = String(org.id)
    const node: InternalNode = {
      org,
      parentId: normalizeUuid(org.parentId),
      children: new Set<string>(),
    }
    nodes.set(id, node)
  }

  // Establish child relationships (ignore missing parents or self-references)
  for (const [id, node] of nodes) {
    const parentId = node.parentId
    if (!parentId || parentId === id) {
      node.parentId = null
      continue
    }
    const parent = nodes.get(parentId)
    if (!parent) {
      node.parentId = null
      continue
    }
    parent.children.add(id)
  }

  const computed = new Map<string, ComputedOrganizationNode>()
  const orderedIds: string[] = []
  const orderedSet = new Set<string>()
  const visited = new Set<string>()

  function walk(nodeId: string, ancestors: string[]): string[] {
    if (ancestors.includes(nodeId)) {
      // Cycle detected; break by treating as root
      const orgName = nodes.get(nodeId)?.org.name || ''
      computed.set(nodeId, {
        id: nodeId,
        tenantId,
        name: orgName,
        pathLabel: orgName,
        parentId: null,
        depth: 0,
        rootId: nodeId,
        treePath: nodeId,
        ancestorIds: [],
        childIds: [],
        descendantIds: [],
        isActive: nodes.get(nodeId)?.org.isActive ?? true,
      })
      if (!orderedSet.has(nodeId)) {
        orderedIds.push(nodeId)
        orderedSet.add(nodeId)
      }
      visited.add(nodeId)
      return []
    }

    const node = nodes.get(nodeId)
    if (!node) return []

    visited.add(nodeId)
    const org = node.org
    const id = String(org.id)
    const nextAncestors = [...ancestors, id]
    if (!orderedSet.has(id)) {
      orderedIds.push(id)
      orderedSet.add(id)
    }
    const childIds = Array.from(node.children)
      .filter((childId) => nodes.has(childId))
      .sort((a, b) => {
        const an = nodes.get(a)!.org.name.toLowerCase()
        const bn = nodes.get(b)!.org.name.toLowerCase()
        if (an === bn) return a.localeCompare(b)
        return an.localeCompare(bn)
      })

    const descendantIds: string[] = []
    for (const childId of childIds) {
      const desc = walk(childId, nextAncestors)
      descendantIds.push(childId, ...desc)
    }

    const ancestorIds = ancestors
    const depth = ancestorIds.length
    const rootId = ancestorIds.length ? ancestorIds[0] : id
    const treePath = nextAncestors.join('/')
    const ancestorNames = ancestors
      .map((ancestorId) => nodes.get(ancestorId)?.org.name)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
    const pathLabel = [...ancestorNames, org.name].join(' / ')

    const computedNode: ComputedOrganizationNode = {
      id,
      tenantId,
      name: org.name,
      pathLabel,
      parentId: node.parentId,
      depth,
      rootId,
      treePath,
      ancestorIds,
      childIds,
      descendantIds,
      isActive: !!org.isActive,
    }
    computed.set(id, computedNode)
    return descendantIds
  }

  // Walk roots first (nodes without parent or whose parent is missing)
  for (const [id, node] of nodes) {
    if (!node.parentId || !nodes.has(node.parentId)) {
      walk(id, [])
    }
  }
  // Handle orphaned nodes or cycles not reached above
  for (const id of nodes.keys()) {
    if (!visited.has(id)) {
      walk(id, [])
    }
  }

  const ordered = orderedIds
    .map((id) => computed.get(id))
    .filter((node): node is ComputedOrganizationNode => !!node)

  return { map: computed, ordered }
}

export async function rebuildHierarchyForTenant(em: EntityManager, tenantId: string): Promise<ComputedHierarchy> {
  const organizations = await em.find(Organization, { tenant: tenantId as any, deletedAt: null }, { orderBy: { name: 'ASC' } })
  const hierarchy = computeHierarchyForOrganizations(organizations, tenantId)
  const now = new Date()

  for (const org of organizations) {
    const computed = hierarchy.map.get(String(org.id))
    if (!computed) {
      org.parentId = null
      org.rootId = String(org.id)
      org.treePath = String(org.id)
      org.depth = 0
      org.ancestorIds = []
      org.childIds = []
      org.descendantIds = []
      org.updatedAt = now
      continue
    }
    org.parentId = computed.parentId
    org.rootId = computed.rootId
    org.treePath = computed.treePath
    org.depth = computed.depth
    org.ancestorIds = computed.ancestorIds
    org.childIds = computed.childIds
    org.descendantIds = computed.descendantIds
    org.updatedAt = now
  }

  await em.flush()
  await ensureAuthorityEdges(em, tenantId, organizations)
  return hierarchy
}

/**
 * Every parent-child link has an authority edge, and every edge has a live link.
 *
 * **The bug this closes (U11).** `Migration20260809193000` seeded one edge per
 * organization that had a parent *at migration time*, and nothing created one
 * afterwards. So every organization created since — or moved to a new parent —
 * had no edge, and the organization hierarchy silently stopped constraining
 * anything for it. It failed permissively, which is the safe direction and also
 * the invisible one.
 *
 * This runs from `rebuildHierarchyForTenant`, which is already called after every
 * structural change to the tree (seven call sites), so there is one place to get
 * right rather than seven to remember.
 *
 * **New edges are seeded permissively** — `owns` / `strict` / `A5` — exactly as the
 * migration seeded the originals. An edge that appeared with a low ceiling would
 * silently restrict people the moment somebody added an organization, which is a
 * worse surprise than the one being fixed. `A5` imposes nothing; somebody lowers
 * it deliberately.
 *
 * **An existing edge is never modified.** Its ceiling is somebody's decision, and
 * a re-parent must not quietly reset it.
 */
async function ensureAuthorityEdges(
  em: EntityManager,
  tenantId: string,
  organizations: Organization[],
): Promise<void> {
  const wanted = new Map<string, { parentId: string; childId: string }>()
  for (const org of organizations) {
    if (!org.parentId) continue
    wanted.set(`${org.parentId}:${org.id}`, { parentId: String(org.parentId), childId: String(org.id) })
  }

  const existing = await em.find(OrganizationEdge, { tenantId, deletedAt: null })
  const have = new Set(existing.map((edge) => `${edge.parentId}:${edge.childId}`))

  let created = 0
  for (const [key, link] of wanted) {
    if (have.has(key)) continue
    // `persist` explicitly rather than relying on `em.create` auto-persisting.
    // Every other service here does the same, and the first version of this
    // function did not -- the rebuild ran, stamped every organization, and
    // created no edge, silently.
    const edge = em.create(OrganizationEdge, {
      tenantId,
      parentId: link.parentId,
      childId: link.childId,
      relationshipType: 'owns',
      inheritanceMode: 'strict',
      authorityCeiling: 'A5',
      moduleGrants: null,
      note: 'created automatically from the organization tree',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    em.persist(edge)
    created += 1
  }

  // Edges whose link no longer exists are retired rather than deleted: an edge
  // somebody lowered is a decision, and if the tree is restored the record of
  // that decision should still be findable.
  for (const edge of existing) {
    if (wanted.has(`${edge.parentId}:${edge.childId}`)) continue
    edge.deletedAt = new Date()
    edge.updatedAt = new Date()
  }

  if (created || existing.length) await em.flush()
}
