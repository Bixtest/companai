import {
  CAPABILITY_CEILING_CACHE_TAG,
  CEILING_CHANGE_COMMAND_ID,
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
    /**
     * Rolls back on throw, like the database.
     *
     * Without this the fake cannot answer the only question that matters about a transaction — *did a
     * failed step leave half a write behind?* — and an assertion about atomicity would pass or fail for
     * reasons unrelated to the code. Same family as L23: a fake that ignores its contract proves nothing.
     */
    transactional: async (cb: (tx: unknown) => Promise<unknown>) => {
      const snapshot = rows.map((r) => ({ ...r }))
      try {
        return await cb(em)
      } catch (error) {
        rows.length = 0
        rows.push(...snapshot)
        throw error
      }
    },
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

function makeAudit() {
  const entries: Array<Record<string, unknown>> = []
  return {
    audit: {
      log: async (input: Record<string, unknown>) => {
        entries.push(input)
        return { id: `audit-${entries.length}` }
      },
    } as never,
    entries,
  }
}

/** A SYSTEM actor, unless a test says otherwise — the CLI's honest identity. */
const SYSTEM = { principalId: null, kind: 'system', tenantId: null }

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
    expect([...ceiling.capabilities].sort((a, b) => a.localeCompare(b))).toEqual(['ai_assistant.view', 'search.view'])
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
    await expect(replaceCapabilityCeiling(em, 'tenant-a', [], { actor: SYSTEM, audit: makeAudit().audit })).rejects.toThrow(CapabilityCeilingError)
    await expect(replaceCapabilityCeiling(em, 'tenant-a', [], { actor: SYSTEM, audit: makeAudit().audit })).rejects.toThrow(/is_active/)
  })

  it('refuses an EMPTY platform ceiling — every tenant inherits it', async () => {
    const { em } = makeEm([])
    await expect(replaceCapabilityCeiling(em, null, [], { actor: SYSTEM, audit: makeAudit().audit })).rejects.toThrow(/platform ceiling cannot be empty/)
  })

  it('refuses a SUPERSET of the platform ceiling, naming what is outside', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    await expect(replaceCapabilityCeiling(em, 'tenant-a', ['a.b', 'not.on.the.platform'], { actor: SYSTEM, audit: makeAudit().audit })).rejects.toThrow(
      /not\.on\.the\.platform/,
    )
  })

  it('accepts a SUBSET, and diffs rather than truncates', async () => {
    const { em, rows } = makeEm([row(null, 'a.b'), row(null, 'a.c'), row('tenant-a', 'a.b'), row('tenant-a', 'a.c')])
    const result = await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], { actor: SYSTEM, audit: makeAudit().audit })
    expect(result.added).toEqual([])
    expect(result.removed).toEqual(['a.c'])
    // soft-deleted, not deleted — the row survives as the record of the act
    const retired = rows.find((r) => r.tenantId === 'tenant-a' && r.capability === 'a.c')
    expect(retired?.deletedAt).toBeInstanceOf(Date)
  })

  it('adds a capability that was not there before', async () => {
    const { em, rows } = makeEm([row(null, 'a.b'), row(null, 'a.c')])
    const result = await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], { actor: SYSTEM, audit: makeAudit().audit })
    expect(result.added).toEqual(['a.b'])
    expect(rows.some((r) => r.tenantId === 'tenant-a' && r.capability === 'a.b')).toBe(true)
  })

  it('INVALIDATES the cache on write — a ceiling that takes minutes to lower is not a ceiling', async () => {
    const { em } = makeEm([row(null, 'a.b'), row(null, 'a.c')])
    const { cache, deletedTags } = makeCache()
    await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], { actor: SYSTEM, audit: makeAudit().audit, cache })
    expect(deletedTags).toContainEqual([CAPABILITY_CEILING_CACHE_TAG])
  })

  it('never writes the platform ceiling through the subset check — it IS the ceiling', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    const result = await replaceCapabilityCeiling(em, null, ['a.b', 'a.new'], { actor: SYSTEM, audit: makeAudit().audit })
    expect(result.added).toEqual(['a.new'])
  })
})

describe('CC-128 — capabilitiesOutsidePlatformCeiling', () => {
  it('reports exactly the ones the platform does not hold', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    await expect(capabilitiesOutsidePlatformCeiling(em, ['a.b', 'x.y', 'z.w'])).resolves.toEqual(['x.y', 'z.w'])
  })
})

// ── CC-128's third named part: a cross-tenant act is RECORDED as such ─────────
describe('CC-128 — every ceiling change is recorded, and a cross-tenant one says so', () => {
  const base = [row(null, 'a.b'), row(null, 'a.c'), row(null, 'a.d')]

  it('records against the TARGET tenant, so the tenant whose ceiling moved sees it', async () => {
    const { em } = makeEm(base)
    const { audit, entries } = makeAudit()
    await replaceCapabilityCeiling(em, 'tenant-target', ['a.b'], {
      actor: { principalId: 'user-1', kind: 'human', tenantId: 'tenant-target' },
      audit,
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ tenantId: 'tenant-target' })
    expect(entries[0].commandId).toBe(CEILING_CHANGE_COMMAND_ID)
  })

  it('states crossTenant: true and carries the acting tenant when they differ', async () => {
    const { em } = makeEm(base)
    const { audit, entries } = makeAudit()
    await replaceCapabilityCeiling(em, 'tenant-target', ['a.b'], {
      actor: { principalId: 'foundation-admin', kind: 'human', tenantId: 'tenant-foundation' },
      audit,
    })
    const context = entries[0].context as Record<string, unknown>
    expect(context.crossTenant).toBe(true)
    expect(context.actedFromTenantId).toBe('tenant-foundation')
  })

  it('states crossTenant: false for an act inside one tenant', async () => {
    const { em } = makeEm(base)
    const { audit, entries } = makeAudit()
    await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], {
      actor: { principalId: 'user-1', kind: 'human', tenantId: 'tenant-a' },
      audit,
    })
    expect((entries[0].context as Record<string, unknown>).crossTenant).toBe(false)
  })

  it('records the platform scope as the platform, not as a tenant', async () => {
    const { em } = makeEm([row(null, 'a.b')])
    const { audit, entries } = makeAudit()
    await replaceCapabilityCeiling(em, null, ['a.b', 'a.new'], {
      actor: { principalId: null, kind: 'system', tenantId: null },
      audit,
    })
    expect(entries[0]).toMatchObject({ tenantId: null, resourceId: 'platform' })
    expect((entries[0].context as Record<string, unknown>).ceilingScope).toBe('platform')
  })

  it('records WHAT changed, not merely that something did', async () => {
    const { em } = makeEm([row(null, 'a.b'), row(null, 'a.c'), row('tenant-a', 'a.c')])
    const { audit, entries } = makeAudit()
    await replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], { actor: SYSTEM, audit })
    const context = entries[0].context as Record<string, unknown>
    expect(context.added).toEqual(['a.b'])
    expect(context.removed).toEqual(['a.c'])
  })

  it('a record that CANNOT be written stops the change — fail-closed', async () => {
    const { em, rows } = makeEm([row(null, 'a.b'), row(null, 'a.c')])
    const failing = { log: async () => { throw new Error('journal unavailable') } }
    await expect(
      replaceCapabilityCeiling(em, 'tenant-a', ['a.b'], { actor: SYSTEM, audit: failing as never }),
    ).rejects.toThrow(/journal unavailable/)
    // and nothing was added for the tenant: the write did not half-happen
    expect(rows.some((r) => r.tenantId === 'tenant-a')).toBe(false)
  })
})
