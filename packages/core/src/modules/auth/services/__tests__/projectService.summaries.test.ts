/**
 * Counting what a project governs, without mis-attributing it.
 *
 * `summaries()` reads three tables and joins them in memory, which is the one
 * shape where a silent wrong answer is easy: a tally keyed by the wrong field,
 * or a project with no members inheriting another's count, produces a page that
 * looks entirely plausible and is wrong. Nothing downstream would catch it —
 * the numbers are decoration to the resolver, which never calls this.
 *
 * So the assertions are deliberately about *attribution* rather than totals. A
 * test that only checked "three memberships were counted" would pass even if
 * all three landed on the wrong project.
 *
 * The other thing under test is the grade. `parseGrade` returns `null` for an
 * unreadable or absent value, and the screen renders `null` as *"not graded"*
 * rather than as `G0`. If an unreadable grade ever came back as `G0` instead,
 * every act inside that matter would quietly drop to negligible — so the
 * unreadable case is asserted, not assumed.
 */
import { ProjectService } from '../projectService'

const TENANT = 'tenant-1'

const project = (id: string, name: string, grade: string | null, closedAt: Date | null = null) => ({
  id,
  tenantId: TENANT,
  name,
  grade,
  closedAt,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-02'),
})

/**
 * Enough of an `EntityManager` to answer the three reads, dispatched by entity
 * class name so the service's own query shapes stay under test.
 */
function makeEm(rows: {
  projects: ReturnType<typeof project>[]
  memberships: { projectId: string }[]
  records: { projectId: string }[]
}) {
  const find = jest.fn(async (entity: { name: string }) => {
    if (entity.name === 'AuthorityProject') return rows.projects
    if (entity.name === 'AuthorityProjectMembership') return rows.memberships
    if (entity.name === 'AuthorityProjectRecord') return rows.records
    throw new Error(`[internal] unexpected entity ${entity.name}`)
  })
  return { find } as never
}

describe('ProjectService.summaries', () => {
  it('attributes members and records to the project they belong to', async () => {
    const service = new ProjectService(
      makeEm({
        projects: [project('p1', 'Acquisition', 'G3'), project('p2', 'Housekeeping', 'G0')],
        // Lopsided on purpose: equal counts would pass even when swapped.
        memberships: [{ projectId: 'p1' }, { projectId: 'p1' }, { projectId: 'p2' }],
        records: [{ projectId: 'p2' }],
      }),
    )

    const [acquisition, housekeeping] = await service.summaries({ tenantId: TENANT })

    expect(acquisition).toMatchObject({ name: 'Acquisition', memberCount: 2, recordCount: 0 })
    expect(housekeeping).toMatchObject({ name: 'Housekeeping', memberCount: 1, recordCount: 1 })
  })

  it('reports zero for a project nobody has joined', async () => {
    // A missing key must read as 0, not as undefined — `undefined` renders as
    // "undefined records governed" rather than failing, which is worse.
    const service = new ProjectService(
      makeEm({ projects: [project('p1', 'Empty', null)], memberships: [], records: [] }),
    )

    const [only] = await service.summaries({ tenantId: TENANT })

    expect(only.memberCount).toBe(0)
    expect(only.recordCount).toBe(0)
  })

  it('says nothing about an ungraded matter rather than calling it G0', async () => {
    const service = new ProjectService(
      makeEm({ projects: [project('p1', 'Ungraded', null)], memberships: [], records: [] }),
    )

    const [only] = await service.summaries({ tenantId: TENANT })

    expect(only.grade).toBeNull()
  })

  it('treats an unreadable grade as saying nothing, never as negligible', async () => {
    const service = new ProjectService(
      makeEm({ projects: [project('p1', 'Corrupt', 'G9')], memberships: [], records: [] }),
    )

    const [only] = await service.summaries({ tenantId: TENANT })

    expect(only.grade).toBeNull()
  })

  it('keeps closed projects, because closing does not un-govern the records', async () => {
    const closedOn = new Date('2026-03-03')
    const service = new ProjectService(
      makeEm({
        projects: [project('p1', 'Settled', 'G2', closedOn)],
        memberships: [],
        records: [{ projectId: 'p1' }],
      }),
    )

    const [settled] = await service.summaries({ tenantId: TENANT })

    expect(settled.closedAt).toBe(closedOn)
    expect(settled.recordCount).toBe(1)
  })

  it('asks the database nothing when there are no projects', async () => {
    // The count queries take `$in: []`, which some drivers turn into a scan of
    // everything. Returning early is the guard; this asserts it stays.
    const em = makeEm({ projects: [], memberships: [], records: [] })
    const service = new ProjectService(em)

    expect(await service.summaries({ tenantId: TENANT })).toEqual([])
    expect((em as unknown as { find: jest.Mock }).find).toHaveBeenCalledTimes(1)
  })

  it('returns nothing without a tenant, rather than every tenant', async () => {
    const em = makeEm({ projects: [project('p1', 'Leak', 'G1')], memberships: [], records: [] })
    const service = new ProjectService(em)

    expect(await service.summaries({ tenantId: null })).toEqual([])
    expect((em as unknown as { find: jest.Mock }).find).not.toHaveBeenCalled()
  })
})
