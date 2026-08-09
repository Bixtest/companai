/**
 * R6 — authority along the organization graph.
 *
 * The property being defended: **walking a path can only lower a ceiling.** If
 * any combination of edges could raise one, "what is the most anyone in this
 * subsidiary could ever do" would stop having an answer, and every edge somebody
 * deliberately narrowed could be widened by adding another.
 */

import {
  orderEdgesAlongPath,
  resolveGraphCeiling,
  type AuthorityEdge,
} from '../graph'
import { resolveDecision } from '../decision'
import { AUTONOMY_GATES, type AutonomyGate, type CapabilityDescriptor } from '../../../modules/capabilities'

const edge = (overrides: Partial<AuthorityEdge> = {}): AuthorityEdge => ({
  parentId: 'group',
  childId: 'subsidiary',
  relationshipType: 'owns',
  inheritanceMode: 'strict',
  authorityCeiling: 'A5',
  moduleGrants: null,
  ...overrides,
})

const rank = (gate: AutonomyGate) => AUTONOMY_GATES.indexOf(gate)

describe('an unconstrained path constrains nothing', () => {
  it('returns A5 for an empty path', () => {
    expect(resolveGraphCeiling([], 'anything.at.all').ceiling).toBe('A5')
  })

  it('returns A5 for edges that impose nothing', () => {
    const result = resolveGraphCeiling([edge(), edge({ parentId: 'subsidiary', childId: 'team' })], 'a.b')

    expect(result.ceiling).toBe('A5')
    expect(result.contributingEdges).toEqual([])
  })
})

describe('a path can only lower', () => {
  it('takes the strictest edge along the path', () => {
    const result = resolveGraphCeiling(
      [
        edge({ authorityCeiling: 'A4' }),
        edge({ parentId: 'subsidiary', childId: 'team', authorityCeiling: 'A2' }),
        edge({ parentId: 'team', childId: 'project', authorityCeiling: 'A5' }),
      ],
      'a.b',
    )

    expect(result.ceiling).toBe('A2')
  })

  it('never rises however the edges are combined', () => {
    // Property, not example. Adding an edge to a path must never widen it.
    for (const first of AUTONOMY_GATES) {
      for (const second of AUTONOMY_GATES) {
        const single = resolveGraphCeiling([edge({ authorityCeiling: first })], 'a.b').ceiling
        const pair = resolveGraphCeiling(
          [edge({ authorityCeiling: first }), edge({ parentId: 'subsidiary', childId: 'team', authorityCeiling: second })],
          'a.b',
        ).ceiling

        expect(rank(pair)).toBeLessThanOrEqual(rank(single))
      }
    }
  })

  it('records why each contributing edge lowered it', () => {
    const result = resolveGraphCeiling([edge({ authorityCeiling: 'A1' })], 'a.b')

    expect(result.contributingEdges).toHaveLength(1)
    expect(result.contributingEdges[0].because).toMatch(/caps authority at A1/)
  })
})

describe('the relationship type carries meaning', () => {
  it('lets an owned subsidiary act as freely as the edge permits', () => {
    expect(resolveGraphCeiling([edge({ relationshipType: 'owns' })], 'a.b').ceiling).toBe('A5')
  })

  it('caps an advisory relationship, because advising is not operating', () => {
    // A consultancy advising a client should not act unattended inside it by
    // default. This is the case a department tree cannot express at all.
    const result = resolveGraphCeiling([edge({ relationshipType: 'advises' })], 'a.b')

    expect(result.ceiling).toBe('A2')
    expect(result.contributingEdges[0].because).toMatch(/'advises' relationship/)
  })

  it('never lets a permissive relationship widen an edge somebody narrowed', () => {
    const result = resolveGraphCeiling([edge({ relationshipType: 'owns', authorityCeiling: 'A1' })], 'a.b')
    expect(result.ceiling).toBe('A1')
  })
})

describe('inheritance mode decides whether anything flows at all', () => {
  it('passes authority down a strict edge', () => {
    expect(resolveGraphCeiling([edge({ inheritanceMode: 'strict' })], 'a.b').ceiling).toBe('A5')
  })

  it('passes nothing down a reference-only edge', () => {
    const result = resolveGraphCeiling([edge({ inheritanceMode: 'reference_only' })], 'a.b')

    expect(result.ceiling).toBe('A0')
    expect(result.contributingEdges[0].because).toMatch(/nothing flows down/)
  })

  it('passes nothing down a none edge', () => {
    expect(resolveGraphCeiling([edge({ inheritanceMode: 'none' })], 'a.b').ceiling).toBe('A0')
  })
})

describe('module grants decide whether the act exists downstream', () => {
  it('blocks a capability the allowlist omits', () => {
    const result = resolveGraphCeiling([edge({ moduleGrants: ['crm.view'] })], 'finance.invoice.issue')

    expect(result.ceiling).toBe('A0')
    expect(result.capabilityBlocked).toBe(true)
    expect(result.contributingEdges[0].because).toMatch(/not among the capabilities/)
  })

  it('permits a capability the allowlist includes', () => {
    const result = resolveGraphCeiling([edge({ moduleGrants: ['crm.view'] })], 'crm.view')

    expect(result.ceiling).toBe('A5')
    expect(result.capabilityBlocked).toBe(false)
  })

  it('treats an empty allowlist as passing nothing, distinct from null', () => {
    // `[]` and `null` must not be conflated: an empty allowlist is a real and
    // useful statement for a reference-only engagement, and treating it as
    // "unset" would make the safest configuration unreachable.
    expect(resolveGraphCeiling([edge({ moduleGrants: [] })], 'crm.view').ceiling).toBe('A0')
    expect(resolveGraphCeiling([edge({ moduleGrants: null })], 'crm.view').ceiling).toBe('A5')
  })
})

describe('ordering edges along a path', () => {
  it('walks the closure index root-first', () => {
    const edges = [
      edge({ parentId: 'team', childId: 'project', authorityCeiling: 'A3' }),
      edge({ parentId: 'group', childId: 'subsidiary', authorityCeiling: 'A5' }),
      edge({ parentId: 'subsidiary', childId: 'team', authorityCeiling: 'A4' }),
    ]

    const path = orderEdgesAlongPath(edges, ['group', 'subsidiary', 'team'], 'project')

    expect(path.map((entry) => `${entry.parentId}->${entry.childId}`)).toEqual([
      'group->subsidiary',
      'subsidiary->team',
      'team->project',
    ])
  })

  it('ignores edges that are not on the path', () => {
    const edges = [
      edge({ parentId: 'group', childId: 'subsidiary' }),
      edge({ parentId: 'group', childId: 'unrelated', authorityCeiling: 'A0' }),
    ]

    const path = orderEdgesAlongPath(edges, ['group'], 'subsidiary')

    expect(path).toHaveLength(1)
    expect(path[0].childId).toBe('subsidiary')
  })

  it('keeps every typed edge between the same pair', () => {
    // A company may both own and advise a subsidiary. Holding two relationships
    // cannot grant more than either alone, so both are kept and the minimum wins.
    const edges = [
      edge({ relationshipType: 'owns', authorityCeiling: 'A5' }),
      edge({ relationshipType: 'advises', authorityCeiling: 'A5' }),
    ]

    const path = orderEdgesAlongPath(edges, ['group'], 'subsidiary')

    expect(path).toHaveLength(2)
    expect(resolveGraphCeiling(path, 'a.b').ceiling).toBe('A2')
  })

  it('returns nothing for an organization with no ancestors', () => {
    expect(orderEdgesAlongPath([edge()], [], 'group')).toEqual([])
  })
})

describe('the graph ceiling reaches the resolver', () => {
  const capability: CapabilityDescriptor = {
    id: 'crm.customer.create',
    module: 'crm',
    effectClass: 'E1',
    reversibility: 'reversible',
  }

  it('caps a decision at the graph ceiling', () => {
    const graph = resolveGraphCeiling([edge({ relationshipType: 'advises' })], capability.id)

    const decision = resolveDecision({
      actor: {
        kind: 'human',
        id: 'consultant',
        holdsCapability: true,
        graphCeiling: graph.ceiling,
        graphCeilingDetail: graph.contributingEdges[0]?.because,
      },
      capability,
      context: { grade: 'G0' },
    })

    expect(decision.gate).toBe('A2')
    expect(decision.bindingRule).toBe('graph-ceiling')
  })

  it("carries the edge's own explanation into the decision", () => {
    const graph = resolveGraphCeiling([edge({ inheritanceMode: 'reference_only' })], capability.id)

    const decision = resolveDecision({
      actor: {
        kind: 'human',
        id: 'consultant',
        holdsCapability: true,
        graphCeiling: graph.ceiling,
        graphCeilingDetail: graph.contributingEdges[0]?.because,
      },
      capability,
      context: {},
    })

    expect(decision.gate).toBe('A0')
    expect(decision.allowed).toBe(false)
    expect(decision.reasons.find((reason) => reason.rule === 'graph-ceiling')?.detail)
      .toMatch(/nothing flows down/)
  })

  it('bounds a grant the actor genuinely holds — position beats permission', () => {
    // The whole point of I4 being structural: holding the capability is not
    // enough if the graph above you does not permit it.
    const decision = resolveDecision({
      actor: { kind: 'human', id: 'u', holdsCapability: true, graphCeiling: 'A1', trustCeiling: 'A5' },
      capability,
      context: { grade: 'G0' },
    })

    expect(decision.gate).toBe('A1')
  })
})
