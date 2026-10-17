import {
  AiAgentRuntimeAmbiguousError,
  AiAgentRuntimeBindingNotFoundError,
  resolveTenantRuntime,
} from '../agent-runtime-registry'

/**
 * `SR-02` — the resolution rules for the agent's `runtime` binding.
 *
 * Three answers and two refusals, and the refusals are the point:
 *
 *   no tenant / no row      → `null`   (the caller keeps its pre-`SR-02` path)
 *   exactly one row         → that row
 *   a binding that matches  → that row
 *   a binding that matches nothing → THROW (never fall back to a default)
 *   several rows, no binding       → THROW (never pick "the first")
 *
 * The last two are what stop a misconfiguration from becoming a silent wrong
 * engine, which is the failure mode a fallback produces.
 */

interface FakeRow {
  id: string
  name: string
  provider: string
}

function makeRepository(options: {
  active?: FakeRow[]
  byName?: Record<string, FakeRow>
  seen?: { listActive: number; findByBindingName: string[] }
}) {
  const seen = options.seen ?? { listActive: 0, findByBindingName: [] }
  return {
    seen,
    repository: {
      listActive: async () => {
        seen.listActive += 1
        return options.active ?? []
      },
      findByBindingName: async (name: string) => {
        seen.findByBindingName.push(name)
        return options.byName?.[name] ?? null
      },
    },
  }
}

const row = (id: string, name: string, provider = 'hermes'): FakeRow => ({ id, name, provider })

describe('SR-02 — resolveTenantRuntime', () => {
  it('returns null for a tenant-less caller without consulting the registry', async () => {
    const { repository, seen } = makeRepository({ active: [row('r1', 'primary')] })

    expect(
      await resolveTenantRuntime({ repository, tenantId: null, organizationId: null }),
    ).toBeNull()
    expect(seen.listActive).toBe(0)
    expect(seen.findByBindingName).toHaveLength(0)
  })

  it('returns null when the tenant has registered no runtime', async () => {
    const { repository } = makeRepository({ active: [] })

    expect(await resolveTenantRuntime({ repository, tenantId: 't1' })).toBeNull()
  })

  it('returns the single runtime when the tenant has exactly one', async () => {
    const only = row('r1', 'primary')
    const { repository } = makeRepository({ active: [only] })

    expect(await resolveTenantRuntime({ repository, tenantId: 't1' })).toBe(only)
  })

  it('resolves a named binding even when several runtimes exist', async () => {
    const named = row('r2', 'secondary')
    const { repository } = makeRepository({
      active: [row('r1', 'primary'), named],
      byName: { secondary: named },
    })

    expect(await resolveTenantRuntime({ repository, tenantId: 't1', binding: 'secondary' })).toBe(
      named,
    )
  })

  it('throws when a named binding matches no live runtime — it never falls back', async () => {
    const { repository } = makeRepository({ active: [row('r1', 'primary')], byName: {} })

    await expect(
      resolveTenantRuntime({ repository, tenantId: 't1', binding: 'missing' }),
    ).rejects.toBeInstanceOf(AiAgentRuntimeBindingNotFoundError)
  })

  it('names the binding and the tenant in the refusal, so the fix is obvious', async () => {
    const { repository } = makeRepository({ active: [] })

    await expect(
      resolveTenantRuntime({ repository, tenantId: 'tenant-9', binding: 'ghost' }),
    ).rejects.toThrow(/No live runtime answers to the binding name "ghost" in tenant "tenant-9"/)
  })

  it('throws when several runtimes exist and none was named — it never picks the first', async () => {
    const { repository } = makeRepository({
      active: [row('r1', 'primary'), row('r2', 'secondary')],
    })

    await expect(resolveTenantRuntime({ repository, tenantId: 't1' })).rejects.toBeInstanceOf(
      AiAgentRuntimeAmbiguousError,
    )
  })

  it('names every candidate in the ambiguity refusal', async () => {
    const { repository } = makeRepository({
      active: [row('r1', 'primary'), row('r2', 'secondary')],
    })

    await expect(resolveTenantRuntime({ repository, tenantId: 't1' })).rejects.toThrow(
      /\(primary, secondary\)/,
    )
  })

  it('treats a whitespace-only binding as no binding', async () => {
    const only = row('r1', 'primary')
    const { repository, seen } = makeRepository({ active: [only] })

    expect(await resolveTenantRuntime({ repository, tenantId: 't1', binding: '   ' })).toBe(only)
    expect(seen.findByBindingName).toHaveLength(0)
  })

  it('trims the binding before resolving it', async () => {
    const named = row('r1', 'primary')
    const { repository, seen } = makeRepository({
      active: [named],
      byName: { primary: named },
    })

    expect(await resolveTenantRuntime({ repository, tenantId: 't1', binding: '  primary  ' })).toBe(
      named,
    )
    expect(seen.findByBindingName).toEqual(['primary'])
  })

  it('refuses clearly when it has neither an EntityManager nor a repository seam', async () => {
    await expect(resolveTenantRuntime({ tenantId: 't1' })).rejects.toThrow(
      /needs an EntityManager \(or a `repository` seam\)/,
    )
  })
})
