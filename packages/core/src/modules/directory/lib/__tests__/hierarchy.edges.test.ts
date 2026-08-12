/**
 * Every parent-child link has an authority edge (U11).
 *
 * The bug this guards: the edge table was seeded once by a migration and never
 * maintained, so every organization created afterwards had no edge and the
 * hierarchy silently stopped constraining it. It failed permissively, which is
 * the safe direction and also the reason nobody noticed for two days.
 *
 * These run against `rebuildHierarchyForTenant` because that is what every
 * structural change already calls — seven call sites, one place to be right.
 */
import { rebuildHierarchyForTenant } from '../hierarchy'

const TENANT = 'tenant-1'

type Org = { id: string; parentId: string | null; name: string; [key: string]: unknown }
type Edge = { parentId: string; childId: string; authorityCeiling: string; deletedAt: Date | null; [key: string]: unknown }

function makeEm(orgs: Org[], edges: Edge[]) {
  const created: Edge[] = []
  return {
    em: {
      async find(entity: unknown, where: Record<string, unknown>) {
        // Two finds happen: organizations, then live edges.
        if (where && 'deletedAt' in where && 'tenantId' in where) {
          return edges.filter((edge) => edge.deletedAt === null)
        }
        return orgs
      },
      create(_entity: unknown, data: Edge) {
        created.push(data)
        return data
      },
      // The real code persists explicitly rather than relying on `em.create`
      // auto-persisting -- omitting it here is what made these tests pass against
      // an implementation that could not work.
      persist(entity: Edge) { return entity },
      async flush() {},
    },
    created,
  }
}

const org = (id: string, parentId: string | null = null): Org => ({
  id,
  parentId,
  name: id,
  rootId: null,
  treePath: null,
  depth: 0,
  ancestorIds: [],
  childIds: [],
  descendantIds: [],
  updatedAt: new Date(),
})

describe('an edge exists for every parent-child link', () => {
  it('creates one for an organization that has a parent and no edge', async () => {
    // The exact live case that exposed this: `Approval Branch` had a parent and
    // no edge row, so the hierarchy imposed nothing on it.
    const { em, created } = makeEm([org('acme'), org('branch', 'acme')], [])

    await rebuildHierarchyForTenant(em as never, TENANT)

    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ parentId: 'acme', childId: 'branch' })
  })

  it('creates nothing for a flat tree', async () => {
    const { em, created } = makeEm([org('acme'), org('other')], [])

    await rebuildHierarchyForTenant(em as never, TENANT)

    expect(created).toHaveLength(0)
  })

  it('creates nothing when the edge already exists', async () => {
    const { em, created } = makeEm(
      [org('acme'), org('branch', 'acme')],
      [{ parentId: 'acme', childId: 'branch', authorityCeiling: 'A2', deletedAt: null }],
    )

    await rebuildHierarchyForTenant(em as never, TENANT)

    expect(created).toHaveLength(0)
  })
})

describe('what it must not disturb', () => {
  it('never touches the ceiling on an edge somebody set', async () => {
    // A ceiling is a decision. Re-parenting, renaming or any other structural
    // change must not quietly reset it -- that would silently *widen* authority,
    // which is the one direction this system never permits.
    const existing = { parentId: 'acme', childId: 'branch', authorityCeiling: 'A1', deletedAt: null }
    const { em } = makeEm([org('acme'), org('branch', 'acme')], [existing])

    await rebuildHierarchyForTenant(em as never, TENANT)

    expect(existing.authorityCeiling).toBe('A1')
  })

  it('seeds a new edge permissively, so adding an organization restricts nobody', async () => {
    // An edge appearing at a low ceiling would restrict people the moment
    // somebody created an organization -- a worse surprise than the bug.
    const { em, created } = makeEm([org('acme'), org('branch', 'acme')], [])

    await rebuildHierarchyForTenant(em as never, TENANT)

    expect(created[0].authorityCeiling).toBe('A5')
  })
})

describe('links that no longer exist', () => {
  it('retires the edge rather than deleting it', async () => {
    // A lowered ceiling is somebody's decision, and if the tree is restored the
    // record of that decision should still be findable.
    const stale = { parentId: 'acme', childId: 'gone', authorityCeiling: 'A1', deletedAt: null as Date | null }
    const { em } = makeEm([org('acme')], [stale])

    await rebuildHierarchyForTenant(em as never, TENANT)

    expect(stale.deletedAt).toBeInstanceOf(Date)
  })
})
