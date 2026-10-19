import {
  CAPABILITY_CEILING_CACHE_TAG,
  CapabilityCeilingError,
  capabilitiesOutsidePlatformCeiling,
  capabilityCeilingRefusalFor,
  loadCapabilityCeiling,
  replaceCapabilityCeiling,
} from '../capabilityCeiling'

/**
 * `CC-128` — the capability ceiling: which capabilities a tenant may ever hold.
 *
 * **The two assertions that matter most are negative ones.** (1) A tenant with no rows must INHERIT,
 * never be unbounded — R5, and the failure mode that turns a ceiling into a decoration. (2) A tenant
 * ceiling that names something outside the platform ceiling must be REFUSED, not silently narrowed — a
 * ceiling that quietly grants less than it says is a lie the operator cannot see.
 *
 * The fake `EntityManager` below **applies the `where` it is handed** rather than returning every row.
 * That is `L23`: a mock that ignores its filter cannot prove a filter, and a ceiling read is nothing
 * but a filter.
 */

type Row = {
  id: string
  tenantId: string | null
  capability: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

let nextId = 0

function makeEm(seed: Row[] = []) {
  const rows: Row[] = seed.map((r) => ({ ...r }))
  const persistCalls: Row[] = []
  const em = {
    find: async (_entity: unknown, where: { tenantId?: string | null; deletedAt?: null }) => {
      // apply the where — a mock that ignores it proves nothing (L23)
      return rows.filter((r) => {
        if ('tenantId' in where && (where.tenantId ?? null) !== (r.tenantId ?? null)) return false
        if (where.deletedAt === null && r.deletedAt !== null) return false
        return true
      })
    },
    transactional: async (cb: (tx: unknown) => Promise<unknown>) => cb(em),
    create: (_entity: unknown, data: Partial<Row>) => ({
      id: `row-${++nextId}`,
      tenantId: data.tenantId ?? null,
      capability: data.capability ?? '',
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      deletedAt: data.deletedAt ?? null,
    }),
    persist: (row: Row) => {
      const existing = rows.find((r) => r.id === row.id)
      if (existing) Object.assign(existing, row)
      else rows.push(row)
      persistCalls.push(row)
      return em
    },
    flush: async () => undefined,
  }
  return { em: em as never, rows, persistCalls }
}

function makeCache() {
  const store = new Map<string, unknown>()
  const deletedTags: string[][] = []
  return {
    cache: {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: unknown) => {
        store.set(key, value)
      },
      deleteByTags: async (tags: string[]) => {
        deletedTags.push(tags)
        store.clear()
        return 1
      },
    } as never,
    store,
    deletedTags,
  }
}

const row = (tenantId: string | null, capability: string, deletedAt: Date | null = null): Row => ({
  id: `${tenantId ?? 'platform'}-${capability}`,
  tenantId,
  capability,
  createdAt: new Date('2026-10-19T00:00:00Z'),
  updatedAt: new Date('2026-10-19T00:00:00Z'),
  deletedAt,
})

describe('CC-128 — loadCapabilityCeiling', () => {
  it('a tenant with no rows INHERITS the platform ceiling — never unbounded', async () => {
    const { em } = makeEm([row(null, 'ai_assistant.view'), row(null, 'search.view')])
    const ceiling = await loadCapabilityCeiling(em, 'tenant-a')
    expect(ceiling.source).toBe('platform')
    expect([...ceiling.capabilities].sort()).toEqual(['ai_assistant.view', 'search.view'])
  })

  it("a tenant's own rows win, and are reported as the tenant's", async () => {
    const { em } = makeEm([
      row(null, 'ai_assistant.view'),
      row(null, 'search.view'),
      row('tenant-a', 'ai_assistant.view'),
    ])
    const ceiling = await loadCapabilityCeiling(em, 'tenant-a')
    expect(ceiling.source).toBe('tenant')
    expect([...ceiling.capabilities]).toEqual(['ai_assistant.view'])
  })

  it('a retired row is not part of the ceiling', async () => {
    const { em } = makeEm([
      row(null, 'ai_assistant.view'),
      row(null, 'search.view', new Date('2026-10-19T01:00:00Z')),
    ])
    const ceiling = await loadCapabilityCeiling(em, 'tenant-a')
    expect([...ceiling.capabilities]).toEqual(['ai_assistant.view'])
  })

  it('reads the cache when one is supplied, and does not hit the table again', async () => {
    const { em } = makeEm([row(null, 'ai_assistant.view')])
    const { cache, store } = makeCache()
    await loadCapabilityCeiling(em, 'tenant-a', cache)
    expect(store.size).toBeGreaterThan(0)
    // a second read with the table emptied must still answer from cache
    const emptied = makeEm([])
    const again = await loadCapabilityCeiling(emptied.em, 'tenant-a', cache)
    expect([...again.capabilities]).toEqual(['ai_assistant.view'])
  })
})

describe('CC-128 — the refusal names the RIGHT ceiling', () => {
  it('names the tenant when the tenant narrowed it', async () => {
    const { em } = makeEm([row(null, 'a.b'), row('tenant-a', 'a.c')])
    const refusal = await capabilityCeilingRefusalFor(em, 'tenant-a', 'a.b')
    expect(refusal).toMatch(/tenant's capability ceiling/)
  })

  it('names the platform when the tenant inherited', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    const refusal = await capabilityCeilingRefusalFor(em, 'tenant-a', 'a.c')
    expect(refusal).toMatch(/platform capability ceiling/)
  })

  it('returns null for a capability inside the ceiling', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    await expect(capabilityCeilingRefusalFor(em, 'tenant-a', 'a.b')).resolves.toBeNull()
  })
})

describe('CC-128 — replaceCapabilityCeiling refuses the two things that would make the table lie', () => {
  it('refuses an EMPTY tenant ceiling, and points at is_active instead', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    await expect(replaceCapabilityCeiling(em, 'tenant-a', [])).rejects.toThrow(CapabilityCeilingError)
    await expect(replaceCapabilityCeiling(em, 'tenant-a', [])).rejects.toThrow(/is_active/)
  })

  it('refuses an EMPTY platform ceiling — every tenant inherits it', async () => {
    const { em } = makeEm([])
    await expect(replaceCapabilityCeiling(em, null, [])).rejects.toThrow(/platform ceiling cannot be empty/)
  })

  it('refuses a SUPERSET of the platform ceiling, naming what is outside', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    await expect(replaceCapabilityCeiling(em, 'tenant-a', ['a.b', 'not.on.the.platform'])).rejects.toThrow(
      /not\.on\.the\.platform/,
    )
  })

  it('accepts a SUBSET, and diffs rather than truncates', async () => {
    const { em, rows } = makeEm([row(null, 'a.b'), row(null, 'a.c'), row('tenant-a', 'a.b'), row('tenant-a', 'a.c')])
    const result = await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'])
    expect(result.added).toEqual([])
    expect(result.removed).toEqual(['a.c'])
    // soft-deleted, not deleted — the row survives as the record of the act
    const retired = rows.find((r) => r.tenantId === 'tenant-a' && r.capability === 'a.c')
    expect(retired?.deletedAt).toBeInstanceOf(Date)
  })

  it('adds a capability that was not there before', async () => {
    const { em, rows } = makeEm([row(null, 'a.b'), row(null, 'a.c')])
    const result = await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'])
    expect(result.added).toEqual(['a.b'])
    expect(rows.some((r) => r.tenantId === 'tenant-a' && r.capability === 'a.b')).toBe(true)
  })

  it('INVALIDATES the cache on write — a ceiling that takes minutes to lower is not a ceiling', async () => {
    const { em } = makeEm([row(null, 'a.b'), row(null, 'a.c')])
    const { cache, deletedTags } = makeCache()
    await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], { cache })
    expect(deletedTags).toContainEqual([CAPABILITY_CEILING_CACHE_TAG])
  })

  it('never writes the platform ceiling through the subset check — it IS the ceiling', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    const result = await replaceCapabilityCeiling(em, null, ['a.b', 'a.new'])
    expect(result.added).toEqual(['a.new'])
  })
})

describe('CC-128 — capabilitiesOutsidePlatformCeiling', () => {
  it('reports exactly the ones the platform does not hold', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    await expect(capabilitiesOutsidePlatformCeiling(em, ['a.b', 'x.y', 'z.w'])).resolves.toEqual(['x.y', 'z.w'])
  })
})
