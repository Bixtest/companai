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

/**
 * The real column shape of `ai_agent_runtimes`, taken from
 * `Migration20261017120000_ai_agent_runtimes.up()` — the parts a fake must not
 * get wrong.
 *
 * ★ `CC-102` — the NOT-NULL-no-default set is the whole point of this table.
 * The first version of `register` supplied `last_seen_at` but NOT these two, and
 * every test passed, because a fake EM has no database. The throwaway-Postgres
 * proof refused the write. So the fake now enforces the same rule Postgres does,
 * and a missing column fails HERE, where it can be fixed.
 */
const AI_AGENT_RUNTIMES_NOT_NULL_NO_DEFAULT = ['created_at', 'updated_at']

/** Pull the parenthesised column list out of a raw INSERT statement. */
function insertColumnList(sql: string): string[] {
  const match = sql.match(/insert\s+into\s+\S+\s*\(([^)]*)\)/i)
  if (!match) return []
  return match[1]
    .split(',')
    .map((column) => column.trim().replace(/^"|"$/g, ''))
}

function makeEm(options: {
  executeError?: unknown
  executeResult?: Array<Record<string, unknown>>
  findOneResult?: Record<string, unknown> | null
  findResult?: Record<string, unknown>[]
} = {}) {
  const calls = { find: 0, findOne: 0, execute: 0, transactional: 0 }
  const executed: Array<{ sql: string; params: unknown[] }> = []
  // `CC-102` — the scope filter is the assertion: a widened query is a claim
  // about which rows a caller may see, and it must be read, not assumed.
  const filters: Record<string, unknown>[] = []

  const connection = {
    execute: async (sql: string, params: unknown[]) => {
      calls.execute += 1
      executed.push({ sql, params })
      // ★ CC-102 — the fake now refuses what Postgres refuses.
      if (/^\s*insert\s+into\s+ai_agent_runtimes/i.test(sql)) {
        const supplied = insertColumnList(sql)
        const missing = AI_AGENT_RUNTIMES_NOT_NULL_NO_DEFAULT.filter(
          (column) => !supplied.includes(column),
        )
        if (missing.length > 0) {
          throw Object.assign(
            new Error(
              `null value in column "${missing[0]}" of relation "ai_agent_runtimes" ` +
                'violates not-null constraint',
            ),
            { code: '23502', constraint: null, detail: `Failing row contains (…${missing.join(', ')}…).` },
          )
        }
      }
      if (options.executeError) throw options.executeError
      return options.executeResult ?? [{ id: 'rt-1', inserted: true }]
    },
  }

  const tx = {
    getConnection: () => connection,
    findOne: async () => options.findOneResult ?? { id: 'rt-1' },
  }

  const em = {
    transactional: async <T>(cb: (t: typeof tx) => Promise<T>): Promise<T> => {
      calls.transactional += 1
      return cb(tx)
    },
    getConnection: () => connection,
    find: async (_entity: unknown, filter: Record<string, unknown>) => {
      calls.find += 1
      filters.push(filter)
      return options.findResult ?? []
    },
    findOne: async (_entity: unknown, filter: Record<string, unknown>) => {
      calls.findOne += 1
      filters.push(filter)
      return options.findOneResult ?? null
    },
  }

  return { em: em as unknown as EntityManager, calls, executed, filters }
}

/** A daemon id is an identity: a uuid, not a hostname (`CC-102`). */
const DAEMON = '11111111-2222-4333-8444-555555555555'

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

describe('SR-02 / CC-102 — AiAgentRuntimeRepository.register', () => {
  it('registers with ONE statement — an upsert, never a pre-check SELECT', async () => {
    const { em, calls, executed } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes' }, CTX)

    expect(calls.execute).toBe(1)
    expect(calls.find).toBe(0)
    expect(executed[0].sql).toMatch(/on conflict/i)
  })

  it('sends the tenant, organization, daemon, name and provider as parameters', async () => {
    const { em, executed } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes' }, CTX)

    expect(executed[0].params).toEqual([
      'tenant-1',
      'org-1',
      DAEMON,
      'primary',
      'hermes',
      JSON.stringify({}),
    ])
  })

  // ★ CC-102 — the defect the throwaway-database proof of the liveness migration
  // found: the entity's `onCreate` default is ORM-level and does not run on this
  // raw-SQL path, so a bare INSERT that omits the two NOT NULL columns is refused
  // by real Postgres while every fake-based test still passed.
  it('supplies created_at and updated_at in the INSERT — the entity onCreate default does not run here', async () => {
    const { em, executed } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes' }, CTX)

    // Column list …
    expect(executed[0].sql).toMatch(/\(tenant_id, organization_id, daemon_id, name, provider, metadata, last_seen_at, created_at, updated_at\)/)
    // … and the matching three `now()` values.
    expect(executed[0].sql).toMatch(/values \(\?, \?, \?, \?, \?, \?::jsonb, now\(\), now\(\), now\(\)\)/)
  })

  it('the fake enforces the NOT NULL columns — a statement that omits them is refused', async () => {
    // This is the proof that the guard above is live and cannot rot silently:
    // it exercises `execute` directly with the exact SQL the bug produced.
    const { em } = makeEm()
    const raw = (em as unknown as {
      getConnection: () => { execute: (sql: string, params: unknown[]) => Promise<unknown> }
    }).getConnection()

    await expect(
      raw.execute(
        `insert into ai_agent_runtimes (tenant_id, daemon_id, name, provider) values (?, ?, ?, ?)`,
        ['t', 'd', 'n', 'hermes'],
      ),
    ).rejects.toMatchObject({ code: '23502', message: /violates not-null constraint/ })

    await expect(
      raw.execute(
        `insert into ai_agent_runtimes (tenant_id, daemon_id, name, provider, metadata, last_seen_at) values (?, ?, ?, ?, ?::jsonb, now())`,
        ['t', 'd', 'n', 'hermes', '{}'],
      ),
    ).rejects.toMatchObject({ code: '23502' })
  })

  it('trims the daemon id and the binding name', async () => {
    const { em, executed } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await repo.register(
      { daemonId: `  ${DAEMON}  `, name: '  primary  ', provider: 'opencode' },
      CTX,
    )

    expect(executed[0].params[2]).toBe(DAEMON)
    expect(executed[0].params[3]).toBe('primary')
  })

  it('spells the PARTIAL index predicate — an ON CONFLICT (cols) alone cannot infer it', async () => {
    const orgScoped = makeEm()
    await new AiAgentRuntimeRepository(orgScoped.em).register(
      { daemonId: DAEMON, name: 'primary', provider: 'hermes' },
      { tenantId: 'tenant-1', organizationId: 'org-1' },
    )
    expect(orgScoped.executed[0].sql).toMatch(
      /on conflict \(tenant_id, organization_id, daemon_id, provider\) where organization_id is not null/,
    )

    const tenantLevel = makeEm()
    await new AiAgentRuntimeRepository(tenantLevel.em).register(
      { daemonId: DAEMON, name: 'primary', provider: 'hermes' },
      { tenantId: 'tenant-1', organizationId: null },
    )
    expect(tenantLevel.executed[0].sql).toMatch(
      /on conflict \(tenant_id, daemon_id, provider\) where organization_id is null/,
    )
  })

  it('reports inserted: true on a first registration and false on a reboot', async () => {
    const first = makeEm({ executeResult: [{ id: 'rt-1', inserted: true }] })
    await expect(
      new AiAgentRuntimeRepository(first.em).register(
        { daemonId: DAEMON, name: 'primary', provider: 'hermes' },
        CTX,
      ),
    ).resolves.toMatchObject({ inserted: true })

    // ★ the defect CC-102 closed: this used to THROW AiAgentRuntimeConflictError,
    // so the one thing a runtime does on every start failed on the second start.
    const reboot = makeEm({ executeResult: [{ id: 'rt-1', inserted: false }] })
    await expect(
      new AiAgentRuntimeRepository(reboot.em).register(
        { daemonId: DAEMON, name: 'primary', provider: 'hermes' },
        CTX,
      ),
    ).resolves.toMatchObject({ inserted: false })
  })

  it('still translates a NAME collision — the name index is not part of the upsert target', async () => {
    const { em } = makeEm({
      executeError: pgUniqueViolation('ai_agent_runtimes_tenant_org_name_uq'),
    })
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toMatchObject({
      name: 'AiAgentRuntimeConflictError',
      key: 'name',
    })
    await expect(
      repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toThrow(/binding name "primary"/)
  })

  it('rethrows an error that is not a uniqueness violation', async () => {
    const boom = new Error('connection terminated')
    const { em } = makeEm({ executeError: boom })
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toBe(boom)
  })

  it('refuses a hostname as a daemon id — an identity, not a label', async () => {
    const { em, calls } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: 'build-host-01', name: 'primary', provider: 'hermes' }, CTX),
    ).rejects.toMatchObject({ name: 'AiAgentRuntimeDaemonIdError' })
    expect(calls.execute).toBe(0)
  })

  it('refuses an unknown provider BEFORE writing anything', async () => {
    const { em, calls } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: DAEMON, name: 'primary', provider: 'hermes-typo' }, CTX),
    ).rejects.toBeInstanceOf(AiAgentRuntimeProviderError)

    expect(calls.execute).toBe(0)
    expect(calls.transactional).toBe(0)
  })

  it('names the accepted engines in the provider refusal', async () => {
    const { em } = makeEm()
    const repo = new AiAgentRuntimeRepository(em)

    await expect(
      repo.register({ daemonId: DAEMON, name: 'n', provider: 'nope' }, CTX),
    ).rejects.toThrow(/accepted: opencode, hermes/)
  })
})

describe('CC-102 — retire and touch', () => {
  it('retires with one scoped UPDATE and reports whether a row changed', async () => {
    const hit = makeEm({ executeResult: [{ id: 'rt-1' }] })
    await expect(
      new AiAgentRuntimeRepository(hit.em).retire('rt-1', CTX),
    ).resolves.toBe(true)
    expect(hit.executed[0].sql).toMatch(/set deleted_at = now\(\)/)
    expect(hit.executed[0].sql).toMatch(/deleted_at is null/)
  })

  it('is idempotent — a second retire reports false, not an error', async () => {
    const miss = makeEm({ executeResult: [] })
    await expect(
      new AiAgentRuntimeRepository(miss.em).retire('rt-1', CTX),
    ).resolves.toBe(false)
  })

  it('touch updates last_seen_at and NOTHING else', async () => {
    const { em, executed } = makeEm({ executeResult: [{ id: 'rt-1' }] })
    await expect(new AiAgentRuntimeRepository(em).touch('rt-1', CTX)).resolves.toBe(true)

    const sql = executed[0].sql
    expect(sql).toMatch(/set last_seen_at = now\(\)/)
    // The donor's reason (`runtime.sql:178-186`): keeping `updated_at` clean keeps
    // the row HOT-eligible and stops every updated_at watcher firing on a heartbeat.
    expect(sql).not.toMatch(/updated_at/)
  })

  it('touch reports false when the row is retired or invisible', async () => {
    const { em } = makeEm({ executeResult: [] })
    await expect(new AiAgentRuntimeRepository(em).touch('rt-1', CTX)).resolves.toBe(false)
  })
})

// ── CC-102 — the null-org visibility rule, and the ambiguity it creates ────────
describe('CC-102 — a caller sees its organization AND the tenant-level runtimes', () => {
  it('widens an org-scoped read to include organization_id IS NULL', async () => {
    const { em, filters } = makeEm({ findResult: [] })
    const repo = new AiAgentRuntimeRepository(em)
    await repo.listActive({ tenantId: 'tenant-1', organizationId: 'org-1' })

    // Before CC-102 this filter was `organizationId: 'org-1'` — an exact match, so
    // a runtime registered with no organization was invisible to every caller
    // inside an organization, and the empty result sent the caller to the
    // deployment-wide environment default.
    expect(filters[0]).toMatchObject({
      tenantId: 'tenant-1',
      deletedAt: null,
      $or: [{ organizationId: 'org-1' }, { organizationId: null }],
    })
  })

  it('keeps a tenant-less-org caller to the tenant-level rows', async () => {
    const { em, filters } = makeEm({ findResult: [] })
    const repo = new AiAgentRuntimeRepository(em)
    await repo.listActive({ tenantId: 'tenant-1', organizationId: null })
    expect(filters[0]).toMatchObject({ organizationId: null })
    expect(filters[0].$or).toBeUndefined()
  })

  it('REFUSES a binding name that now matches two visible runtimes', async () => {
    // Legal under the two partial unique indexes: a tenant-level `primary` and an
    // org-level `primary`. Returning the first would be the silent choice this
    // module exists to refuse.
    const { em } = makeEm({
      findResult: [{ id: 'rt-tenant', name: 'primary' }, { id: 'rt-org', name: 'primary' }],
    })
    const repo = new AiAgentRuntimeRepository(em)
    await expect(
      repo.findByBindingName('primary', { tenantId: 'tenant-1', organizationId: 'org-1' }),
    ).rejects.toThrow(/matches 2 live runtimes/)
  })
})
