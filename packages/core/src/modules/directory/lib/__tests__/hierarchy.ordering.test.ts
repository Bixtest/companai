/**
 * The ordering contract of `ancestor_ids`.
 *
 * R6 resolves authority by walking the ancestor index root-first: the first id
 * is the root, the last is the immediate parent. Nothing in the type says so,
 * and the code that depends on it lives in another module — so if this order
 * ever inverts, `AuthorityGraphService` stops matching edges to hops and reports
 * constrained organizations as unconstrained.
 *
 * The service now detects that inversion and fails closed. This test is the
 * other half: it pins the contract at the place that produces it, so the change
 * is caught here rather than diagnosed there.
 */

import { Organization } from '@open-mercato/core/modules/directory/data/entities'
import { computeHierarchyForOrganizations } from '../hierarchy'

const TENANT = '11111111-1111-4111-8111-111111111111'
const GROUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SUBSIDIARY = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const TEAM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function organization(id: string, name: string, parentId: string | null): Organization {
  return { id, name, parentId, isActive: true, tenantId: TENANT } as unknown as Organization
}

describe('computeHierarchyForOrganizations', () => {
  it('writes ancestor_ids root-first, which is what R6 walks', () => {
    const { map } = computeHierarchyForOrganizations(
      [
        organization(TEAM, 'Team', SUBSIDIARY),
        organization(GROUP, 'Group', null),
        organization(SUBSIDIARY, 'Subsidiary', GROUP),
      ],
      TENANT,
    )

    const team = map.get(TEAM)!
    expect(team.ancestorIds).toEqual([GROUP, SUBSIDIARY])
    expect(team.depth).toBe(2)
    // `rootId` reads ancestorIds[0], so the two agree only under this order.
    expect(team.rootId).toBe(GROUP)
    expect(team.treePath).toBe([GROUP, SUBSIDIARY, TEAM].join('/'))
  })

  it('orders siblings by name rather than by whatever the ids compare to', () => {
    // The comparator lowercased both names and then compared one of them against
    // the other sibling's *id*, so ordering was effectively arbitrary — names
    // never sort against UUIDs in any meaningful way.
    const { map } = computeHierarchyForOrganizations(
      [
        organization(GROUP, 'Group', null),
        organization(TEAM, 'Zebra', GROUP),
        organization(SUBSIDIARY, 'Apple', GROUP),
      ],
      TENANT,
    )

    expect(map.get(GROUP)!.childIds).toEqual([SUBSIDIARY, TEAM])
  })
})
