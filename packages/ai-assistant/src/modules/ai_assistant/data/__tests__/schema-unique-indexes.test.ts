import { readFileSync } from 'node:fs'

const migrationCases = [
  {
    file: 'Migration20260419100521.ts',
    orgIndex: 'create unique index "ai_agent_prompt_overrides_tenant_org_agent_version_uq"',
    tenantIndex:
      'create unique index "ai_agent_prompt_overrides_tenant_agent_version_null_org_uq"',
  },
  {
    file: 'Migration20260419132948.ts',
    orgIndex:
      'create unique index "ai_agent_mutation_policy_overrides_tenant_org_agent_uq"',
    tenantIndex:
      'create unique index "ai_agent_mutation_policy_overrides_tenant_agent_null_org_uq"',
  },
  {
    file: 'Migration20260419134235.ts',
    orgIndex: 'create unique index "ai_pending_actions_tenant_org_idempotency_uq"',
    tenantIndex: 'create unique index "ai_pending_actions_tenant_idem_null_org_uq"',
  },
]

describe('AI assistant nullable organization unique indexes', () => {
  it.each(migrationCases)(
    '$file uses partial unique indexes for org and tenant-wide rows',
    ({ file, orgIndex, tenantIndex }) => {
      const source = readFileSync(
        new URL(`../../migrations/${file}`, import.meta.url),
        'utf8',
      )

      expect(source).toContain(orgIndex)
      expect(source).toContain('where "organization_id" is not null')
      expect(source).toContain(tenantIndex)
      expect(source).toContain('where "organization_id" is null')
      expect(source).not.toContain(' add constraint ')
    },
  )

  it('declares every snapshot expression index on the participants entity (no snapshot/entity drift)', () => {
    const snapshot = JSON.parse(
      readFileSync(
        new URL('../../migrations/.snapshot-open-mercato.json', import.meta.url),
        'utf8',
      ),
    ) as {
      tables: Array<{ name: string; indexes?: Array<{ keyName: string; expression?: string }> }>
    }

    const participants = snapshot.tables.find(
      (table) => table.name === 'ai_chat_conversation_participants',
    )
    expect(participants).toBeDefined()

    const entitySource = readFileSync(
      new URL('../entities.ts', import.meta.url),
      'utf8',
    )

    const expressionIndexes = (participants?.indexes ?? []).filter((index) => index.expression)
    expect(expressionIndexes.length).toBeGreaterThan(0)

    for (const index of expressionIndexes) {
      expect(entitySource).toContain(index.keyName)
    }
  })

  it('keeps the active-participants partial index declared on the entity', () => {
    const entitySource = readFileSync(
      new URL('../entities.ts', import.meta.url),
      'utf8',
    )

    // Rule 13: `6b78a0ac` reordered this index to lead with `user_id` (identity
    // first, mirroring the agent axis), so the previous expectation pinned an
    // order the entity no longer declares. The assertion is about the
    // DECLARATION, so it must read the declaration.
    //
    // ★ AND THAT REORDER MADE THIS INDEX A DUPLICATE: it is now column-for-column
    // identical to `ai_chat_conv_participants_tenant_org_user_conv_idx` — same
    // table, same columns, same `deleted_at is null` predicate, both non-unique.
    // Two identical indexes cannot both be needed, and Postgres maintains both on
    // every write. Recorded in `CC-107`, not silently accepted here: this test
    // asserts what the entity SAYS, it does not bless the shape.
    expect(entitySource).toContain(
      'create index "ai_chat_conv_participants_active_conv_user_idx" on "ai_chat_conversation_participants" ("tenant_id", "organization_id", "user_id", "conversation_id") where "deleted_at" is null',
    )
  })

  it('keeps the module snapshot aligned with partial unique indexes', () => {
    const snapshot = JSON.parse(
      readFileSync(
        new URL('../../migrations/.snapshot-open-mercato.json', import.meta.url),
        'utf8',
      ),
    ) as {
      tables: Array<{ name: string; indexes: Array<{ keyName: string; expression?: string }> }>
    }

    const indexes = new Map<string, string>()
    for (const table of snapshot.tables) {
      for (const index of table.indexes) {
        if (index.expression) indexes.set(index.keyName, index.expression)
      }
    }

    for (const { orgIndex, tenantIndex } of migrationCases) {
      const orgIndexName = orgIndex.match(/"([^"]+)"/)?.[1]
      const tenantIndexName = tenantIndex.match(/"([^"]+)"/)?.[1]
      expect(orgIndexName ? indexes.get(orgIndexName) : undefined).toContain(
        'where "organization_id" is not null',
      )
      expect(tenantIndexName ? indexes.get(tenantIndexName) : undefined).toContain(
        'where "organization_id" is null',
      )
    }
  })
})

/**
 * CC-126 — `ai_agent_types` is NOT the nullable-org pattern above and must
 * never be edited into it. One plain unique index over every row regardless of
 * status (a retired key is never reusable), no org column, and the dialect
 * CHECK shipped WITH the table.
 *
 * The snapshot is not asserted here: this table joins the set `CC-119`
 * regenerates at the rebuild milestone, so a snapshot expectation would be a
 * claim about a generated artifact that is currently stale.
 */
describe('CC-126 ai_agent_types unique index and checks', () => {
  const migrationSource = readFileSync(
    new URL('../../migrations/Migration20261018120000_ai_agent_types.ts', import.meta.url),
    'utf8',
  )
  const entitySource = readFileSync(new URL('../entities.ts', import.meta.url), 'utf8')
  // Whitespace-normalised so the statement is asserted as written, not as wrapped.
  const flatMigration = migrationSource.replace(/\s+/g, ' ')

  it('creates the tenant_key unique index over every row — no partial pair', () => {
    expect(flatMigration).toContain(
      'create unique index "ai_agent_types_tenant_key_uq" on "ai_agent_types" ("tenant_id", "key");',
    )
    // NOT partial: the retired rows are inside the index, which is what makes a
    // retired key unreusable. A `where` here would retire-and-recreate.
    expect(flatMigration).not.toMatch(/create unique index "ai_agent_types_tenant_key_uq"[^;]*where/)
  })

  it('ships the dialect CHECK with the table, not as a later alter', () => {
    // The expression is captured from BOTH files and compared byte-for-byte
    // rather than retyped: the dialect carries a backslash, and a test that
    // re-types it tests the test's escaping, not the schema's. The CHECK's
    // teeth are proved on real Postgres by the migration probe (`23514` on
    // `Billing.Assistant`).
    const migrationExpr = flatMigration.match(
      /constraint "ai_agent_types_key_format_ck" check \((.+?)\), constraint/,
    )?.[1]
    const entityExpr = entitySource.match(
      /name: 'ai_agent_types_key_format_ck',\s*expression: `([^`]+)`/,
    )?.[1]
    expect(migrationExpr).toBeDefined()
    expect(entityExpr).toBeDefined()
    expect(entityExpr).toBe(migrationExpr)
    // ...and it is the agent-id dialect, anchored at both ends.
    expect(migrationExpr).toContain('"key" ~')
    expect(migrationExpr).toContain('[a-z0-9_]+')
    expect(migrationExpr).toContain('$')

    expect(migrationSource).not.toContain(' add constraint ')
    expect(migrationSource).not.toContain('alter table')
  })

  it('ships the status CHECK — no third status is representable', () => {
    expect(flatMigration).toContain(
      'constraint "ai_agent_types_status_ck" check ("status" in (\'active\', \'retired\'))',
    )
  })

  it('requires tenant_id — the sentinel has no column to live in', () => {
    expect(flatMigration).toContain('"tenant_id" uuid not null,')
  })

  it('declares the same index expression on the entity — no migration/entity drift', () => {
    expect(flatMigration).toContain(
      'create unique index "ai_agent_types_tenant_key_uq" on "ai_agent_types" ("tenant_id", "key");',
    )
    expect(entitySource).toContain(
      '\'create unique index "ai_agent_types_tenant_key_uq" on "ai_agent_types" ("tenant_id", "key")\'',
    )
    expect(entitySource).toContain('ai_agent_types_status_ck')
    expect(entitySource).toContain("tableName: 'ai_agent_types'")
  })
})
