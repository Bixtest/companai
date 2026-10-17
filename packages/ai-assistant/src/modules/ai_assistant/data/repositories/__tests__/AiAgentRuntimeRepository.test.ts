import type { EntityManager } from '@mikro-orm/postgresql'
import {
  AiAgentRuntimeConflictError,
  AiAgentRuntimeProviderError,
  AiAgentRuntimeRepository,
  classifyUniqueViolation,
} from '../AiAgentRuntimeRepository'

/**
 * `SR-02` — the repository half: the unique index is the authority, and this class
 * only translates its refusal.
 *
 * The most important assertion in this file is a **negative** one: `register` never
 * issues a SELECT before the INSERT. A read-then-write pre-check looks equivalent
 * and is not — two concurrent registrations of one daemon would both pass the read,
 * and one would still fail the insert. The constraint is the primitive; a pre-check
 * would only add a race window and a second source of truth.
 *
 * The `23505` errors below are shaped exactly as Postgres reports them (`code`,
 * `constraint`, `detail`) and as MikroORM wraps them (`cause`), so the translation
 * is proven for both shapes without a live database.
 */

interface FakeTx {
  create: (entity: unknown, data: Record<string, unknown>) => Record<string, unknown>
  persist: (row: unknown) => { flush: () => Promise<void> }
}

function makeEm(options: {
  flushError?: unknown
  findOneResult?: Record<string, unknown> | null
  findResult?: Record<string, unknown>[]
} = {}) {
  const calls = { find: 0, findOne: 0, create: 0, flush: 0, transactional: 0 }
  const created: Record<string, unknown>[] = []

  const tx: FakeTx = {
    create: (_entity, data) => {
      calls.create += 1
      const row = { ...data }
      created.push(row)
      return row
    },
    persist: () => ({
      flush: async () => {
        calls.flush += 1
        if (options.flushError) throw options.flushError
      },
    }),
  }

  const em = {
    transactional: async <T>(cb: (t: FakeTx) => Promise<T>): Promise<T> => {
      calls.transactional += 1
      return cb(tx)
    },
    find: async () => {
      calls.find += 1
      return options.findResult ?? []
    },
    findOne: async () => {
      calls.findOne += 1
      return options.findOneResult ?? null
    },
  }

  return { em: em as unknown as EntityManager, calls, created }
}

const pgUniqueViolation = (constraint: string) =>
  Object.assign(new Error(`duplicate key value violates unique constraint "${constraint}"`), {
    code: '23505',
    constraint,
    detail: 'Key (tenant_id, organization_id, name)=(t1, o1, prod) already exists.',
  })

const CTX = { tenantId: 'tenant-1', organizationId: 'org-1' }

describe('SR-02 — classifyUniqueViolation', () => {
  it('maps the org-scoped daemon+provider index', () => {
    const result = classifyUniqueViolation(
      pgUniqueViolation('ai_agent_runtimes_tenant_org_daemon_provider_uq'),
    )
    expect(result?.key).toBe('daemon-provider')
  })

  it('maps the tenant-wide daemon+provider index', () => {
    const result = classifyUniqueViolation(
      pgUniqueViolation('ai_agent_runtimes_tenant_daemon_provider_null_org_uq'),
    )
    expect(result?.key).toBe('daemon-provider')
  })

  it('maps the org-scoped name index', () => {
    const result = classifyUniqueViolation(pgUniqueViolation('ai_agent_runtimes_tenant_org_name_uq'))
    expect(result?.key).toBe('name')
  })

  it('falls back to the column list when the driver reports no constraint name', () => {
    const detailOnly = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      detail: 'Key (tenant_id, organization_id, daemon_id, provider)=(t1, o1, d1, hermes) already exists.',
    })
    expect(classifyUniqueViolation(detailOnly)?.key).toBe('daemon-provider')
  })

  it('reads the driver error through the ORM wrapper (cause chain)', () => {
    const wrapped = Object.assign(new Error('UniqueConstraintViolationException'), {
      cause: pgUniqueViolation('ai_agent_runtimes_tenant_name_null_org_uq'),
    })
    expect(classifyUniqueViolation(wrapped)?.key).toBe('name')
  })

  it('classifies from the message when nothing else survives', () => {
    const messageOnly = new Error(
      'duplicate key value violates unique constraint "ai_agent_runtimes_tenant_org_name_uq"',
    )
    expect(classifyUniqueViolation(messageOnly)?.key).toBe('name')
  })

  it('returns null for an error that is not a unique violation', () => {
    const fk = Object.assign(new Error('insert or update violates foreign key constraint'), {
      code: '23503',
    })
    expect(classifyUniqueViolation(fk)).toBeNull()
  })
})

describe('SR-02 — AiAgentRuntimeRepository.register', () => {
  it('does NOT pre-check with a SELECT — the unique index is the authority', async () => {
    const { em, calls } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes' }, CTX)

    expect(calls.findOne).toBe(0)
    expect(calls.find).toBe(0)
    expect(calls.flush).toBe(1)
  })

  it('writes the tenant, organization, daemon, name and provider it was given', async () => {
    const { em, created } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes' }, CTX)

    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      daemonId: 'daemon-1',
      name: 'primary',
      provider: 'hermes',
    })
  })

  it('trims the daemon id and the binding name', async () => {
    const { em, created } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register({ daemonId: '  daemon-1  ', name: '  primary  ', provider: 'opencode' }, CTX)

    expect(created[0]).toMatchObject({ daemonId: 'daemon-1', name: 'primary' })
  })

  it('translates a name collision into a typed error that names the binding', async () => {
    const { em } = makeEm({
      flushError: pgUniqueViolation('ai_agent_runtimes_tenant_org_name_uq'),
    })
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toMatchObject({
      name: 'AiAgentRuntimeConflictError',
      key: 'name',
    })

    await expect(
      repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toThrow(/binding name "primary"/)
  })

  it('translates a daemon+provider collision into the other key', async () => {
    const { em } = makeEm({
      flushError: pgUniqueViolation('ai_agent_runtimes_tenant_org_daemon_provider_uq'),
    })
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toMatchObject({ key: 'daemon-provider' })
  })

  it('rethrows an error that is not a uniqueness violation', async () => {
    const boom = new Error('connection terminated')
    const { em } = makeEm({ flushError: boom })
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toBe(boom)
  })

  it('refuses an unknown provider BEFORE writing anything', async () => {
    const { em, calls } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'daemon-1', name: 'primary', provider: 'hermes-typo' }, CTX),
    ).rejects.toBeInstanceOf(AiAgentRuntimeProviderError)

    // The vocabulary is validated at the boundary, so the write never starts —
    // which is the point: no invalid row is ever handed to the constraint.
    expect(calls.create).toBe(0)
    expect(calls.flush).toBe(0)
    expect(calls.transactional).toBe(0)
  })

  it('names the accepted engines in the provider refusal', async () => {
    const { em } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'd', name: 'n', provider: 'nope' }, CTX),
    ).rejects.toThrow(/accepted: opencode, hermes/)
  })

  it('requires a tenant, a daemon id and a name', async () => {
    const { em } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'd', name: 'n', provider: 'hermes' }, { tenantId: '' }),
    ).rejects.toThrow(/requires tenantId/)
    await expect(
      repo.register({ daemonId: '  ', name: 'n', provider: 'hermes' }, CTX),
    ).rejects.toThrow(/requires daemonId/)
    await expect(
      repo.register({ daemonId: 'd', name: '  ', provider: 'hermes' }, CTX),
    ).rejects.toThrow(/requires name/)
  })

  it('exposes the collision key on the error instance, not only in the message', async () => {
    const { em } = makeEm({
      flushError: pgUniqueViolation('ai_agent_runtimes_tenant_org_name_uq'),
    })
    const repo = new AiAgentRuntimeRepository(em)

    const error = await repo
      .register({ daemonId: 'd', name: 'n', provider: 'hermes' }, CTX)
      .catch((err: unknown) => err)

    expect(error).toBeInstanceOf(AiAgentRuntimeConflictError)
    expect((error as AiAgentRuntimeConflictError).key).toBe('name')
    expect((error as AiAgentRuntimeConflictError).detail?.constraint).toBe(
      'ai_agent_runtimes_tenant_org_name_uq',
    )
  })
})

describe('SR-02 — AiAgentRuntimeRepository reads', () => {
  it('returns null for an empty tenant', async () => {
    const { em } = makeEm({ findOneResult: null })
    const repo = new AiAgentRuntimeRepository(em)

    expect(await repo.findByBindingName('primary', CTX)).toBeNull()
  })

  it('returns null when no tenant is supplied rather than querying', async () => {
    const { em, calls } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    expect(await repo.findByBindingName('primary', { tenantId: '' })).toBeNull()
    expect(await repo.listActive({ tenantId: '' })).toEqual([])
    expect(calls.findOne).toBe(0)
    expect(calls.find).toBe(0)
  })
})
