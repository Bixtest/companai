/**
 * Authority along the organization graph (R6).
 *
 * Invariant **I4** made structural rather than conventional: authority is bounded
 * by *position in the graph* before any per-principal grant is considered. A
 * worker three levels down cannot be granted more than the edges above it permit,
 * whatever its own charter says.
 *
 * The rule is the same one the resolver uses everywhere — take the minimum, never
 * the maximum. Walking a path can only ever lower the ceiling, which is what
 * makes "what is the most anyone here could ever do" a question with an answer.
 *
 * Source: planning 01 §2.1, 02 §6.1, 08 R6.
 */

import type { AutonomyGate } from '../../modules/capabilities'

export type OrganizationRelationshipType =
  | 'owns'
  | 'manages'
  | 'advises'
  | 'serves'
  | 'licenses'
  | 'templates'
  | 'supervises'

export type OrganizationInheritanceMode = 'strict' | 'flexible' | 'reference_only' | 'none'

/** One edge on the path from the root to the actor's organization. */
export type AuthorityEdge = {
  parentId: string
  childId: string
  relationshipType: OrganizationRelationshipType
  inheritanceMode: OrganizationInheritanceMode
  authorityCeiling: AutonomyGate
  /** Allowlist of capability ids; `null` means this edge restricts nothing. */
  moduleGrants?: string[] | null
}

export type GraphCeilingResult = {
  ceiling: AutonomyGate
  /** Every edge that lowered the ceiling, in path order, with why. */
  contributingEdges: Array<{ edge: AuthorityEdge; ceiling: AutonomyGate; because: string }>
  /** True when an edge's allowlist excludes the capability entirely. */
  capabilityBlocked: boolean
}

const GATE_RANK: Record<AutonomyGate, number> = { A0: 0, A1: 1, A2: 2, A3: 3, A4: 4, A5: 5 }

function lower(left: AutonomyGate, right: AutonomyGate): AutonomyGate {
  return GATE_RANK[left] <= GATE_RANK[right] ? left : right
}

/**
 * The ceiling each inheritance mode imposes, before the edge's own value.
 *
 * `none` means nothing inherits: the child appears in the structure and takes no
 * authority from above it. `reference_only` is the same for authority — the
 * difference between them is visibility, which is not this function's business.
 *
 * `strict` and `flexible` both let authority through; they differ in whether a
 * child may hold grants the parent does not, which is a grant-compilation
 * question rather than a ceiling one. Encoding that difference here would be
 * inventing a rule the planning does not state.
 */
const INHERITANCE_CEILING: Record<OrganizationInheritanceMode, AutonomyGate> = {
  strict: 'A5',
  flexible: 'A5',
  reference_only: 'A0',
  none: 'A0',
}

/**
 * Default ceilings implied by what kind of relationship an edge is.
 *
 * *Advises* and *owns* mean genuinely different things: a consultancy advising a
 * client should not, by default, be able to act unattended inside it. These are
 * defaults an explicit `authorityCeiling` can only lower further — the minimum is
 * taken, so a permissive relationship type never widens an edge somebody
 * deliberately narrowed.
 */
const RELATIONSHIP_CEILING: Record<OrganizationRelationshipType, AutonomyGate> = {
  owns: 'A5',
  manages: 'A5',
  supervises: 'A4',
  licenses: 'A3',
  templates: 'A3',
  serves: 'A2',
  advises: 'A2',
}

/**
 * Walks a path of edges from the root down to the actor's organization.
 *
 * `path` must be ordered root-first. Order matters only for the explanation —
 * the ceiling is a minimum and would be the same in any order — but an
 * explanation that lists constraints out of order is one nobody can follow back
 * to the structure.
 */
export function resolveGraphCeiling(
  path: AuthorityEdge[],
  capabilityId: string,
): GraphCeilingResult {
  let ceiling: AutonomyGate = 'A5'
  let capabilityBlocked = false
  const contributingEdges: GraphCeilingResult['contributingEdges'] = []

  for (const edge of path) {
    const fromMode = INHERITANCE_CEILING[edge.inheritanceMode]
    const fromRelationship = RELATIONSHIP_CEILING[edge.relationshipType]
    const edgeCeiling = lower(lower(fromMode, fromRelationship), edge.authorityCeiling)

    // An allowlist that omits the capability stops it entirely: the act does not
    // exist below this edge, which is stronger than having no autonomy for it.
    if (edge.moduleGrants && !edge.moduleGrants.includes(capabilityId)) {
      capabilityBlocked = true
      contributingEdges.push({
        edge,
        ceiling: 'A0',
        because: `${capabilityId} is not among the capabilities this ${edge.relationshipType} edge passes down`,
      })
      ceiling = 'A0'
      continue
    }

    if (GATE_RANK[edgeCeiling] < GATE_RANK[ceiling]) {
      contributingEdges.push({
        edge,
        ceiling: edgeCeiling,
        because: describeEdge(edge, fromMode, fromRelationship),
      })
      ceiling = edgeCeiling
    }
  }

  return { ceiling, contributingEdges, capabilityBlocked }
}

function describeEdge(
  edge: AuthorityEdge,
  fromMode: AutonomyGate,
  fromRelationship: AutonomyGate,
): string {
  const reasons: string[] = []
  if (fromMode === 'A0') reasons.push(`inheritance is ${edge.inheritanceMode}, so nothing flows down`)
  if (GATE_RANK[edge.authorityCeiling] <= GATE_RANK[fromRelationship] && edge.authorityCeiling !== 'A5') {
    reasons.push(`the edge caps authority at ${edge.authorityCeiling}`)
  } else if (fromRelationship !== 'A5') {
    reasons.push(`an '${edge.relationshipType}' relationship permits at most ${fromRelationship}`)
  }
  return reasons.join(', ') || `the edge caps authority at ${edge.authorityCeiling}`
}

/**
 * Orders a set of edges into a root-first path for one organization.
 *
 * `ancestorIds` comes from the closure columns the platform already maintains —
 * planning 08 is explicit that R6 keeps them as the resolution index rather than
 * replacing them with a recursive walk. Reusing the index means the graph adds
 * meaning without adding a query per level.
 */
export function orderEdgesAlongPath(
  edges: AuthorityEdge[],
  ancestorIds: string[],
  organizationId: string,
): AuthorityEdge[] {
  // ancestorIds is root-first; the last hop is the organization itself.
  const chain = [...ancestorIds, organizationId]
  const path: AuthorityEdge[] = []

  for (let index = 0; index < chain.length - 1; index += 1) {
    const parentId = chain[index]
    const childId = chain[index + 1]
    const matches = edges.filter((edge) => edge.parentId === parentId && edge.childId === childId)
    // Several typed edges can join the same pair — a company may both `owns` and
    // `advises` a subsidiary. Authority takes the strictest, because holding two
    // relationships cannot grant more than either does alone.
    for (const match of matches) path.push(match)
  }

  return path
}
