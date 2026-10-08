import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Hot-path index guard (#2966).
 *
 * Two of the platform's hottest read paths used to run sequential scans:
 * TokenSearchStrategy filters search_tokens by (token_hash IN ..., tenant_id)
 * on every keystroke, and RBAC scans user_roles by user_id on every ACL cache
 * miss and by role_id on user-list/role-mutation paths — Postgres does not
 * auto-index FK columns.
 *
 * This test pins the fix at all three declaration sites so a refactor cannot
 * silently drop one of them: the entity `@Index` decorator, the migration SQL,
 * and the module's `.snapshot-open-mercato.json` (which keeps `yarn db:generate`
 * from re-emitting the diff).
 */

const modulesRoot = join(__dirname, '..', 'modules')

function readEntities(module: string): string {
  return readFileSync(join(modulesRoot, module, 'data', 'entities.ts'), 'utf8')
}

function readSnapshotIndexNames(module: string, table: string): string[] {
  const snapshotPath = join(modulesRoot, module, 'migrations', '.snapshot-open-mercato.json')
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
    tables: Array<{ name: string; indexes: Array<{ keyName: string }> }>
  }
  const tableSnapshot = snapshot.tables.find((candidate) => candidate.name === table)
  expect(tableSnapshot).toBeDefined()
  return tableSnapshot!.indexes.map((index) => index.keyName)
}

type SnapshotIndex = {
  keyName: string
  columnNames?: string[]
  composite?: boolean
  constraint?: boolean
  primary?: boolean
  unique?: boolean
  expression?: string
}

function readSnapshotIndexes(module: string, table: string): SnapshotIndex[] {
  const snapshotPath = join(modulesRoot, module, 'migrations', '.snapshot-open-mercato.json')
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
    tables: Array<{ name: string; indexes: SnapshotIndex[] }>
  }
  const tableSnapshot = snapshot.tables.find((candidate) => candidate.name === table)
  expect(tableSnapshot).toBeDefined()
  return tableSnapshot!.indexes
}

function readAllMigrationSql(module: string): string {
  const migrationsDir = join(modulesRoot, module, 'migrations')
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
    .join('\n')
}

describe('hot-path indexes (#2966)', () => {
  describe('search_tokens (tenant_id, token_hash)', () => {
    it('declares the index on the SearchToken entity', () => {
      const source = readEntities('query_index')
      expect(source).toContain(
        "@Index({ name: 'search_tokens_tenant_token_hash_idx', properties: ['tenantId', 'tokenHash'] })",
      )
    })

    it('creates the index concurrently in a query_index migration', () => {
      const sql = readAllMigrationSql('query_index')
      expect(sql).toContain(
        'create index concurrently if not exists "search_tokens_tenant_token_hash_idx" on "search_tokens" ("tenant_id", "token_hash")',
      )
    })

    it('records the index in the query_index schema snapshot', () => {
      expect(readSnapshotIndexNames('query_index', 'search_tokens')).toContain(
        'search_tokens_tenant_token_hash_idx',
      )
    })
  })

  describe('user_roles (user_id) and (role_id)', () => {
    it('declares both FK indexes on the UserRole entity', () => {
      const source = readEntities('auth')
      expect(source).toContain("@Index({ name: 'user_roles_user_id_idx', properties: ['user'] })")
      expect(source).toContain("@Index({ name: 'user_roles_role_id_idx', properties: ['role'] })")
    })

    it('creates both indexes in an auth migration', () => {
      const sql = readAllMigrationSql('auth')
      expect(sql).toContain('create index if not exists "user_roles_user_id_idx" on "user_roles" ("user_id")')
      expect(sql).toContain('create index if not exists "user_roles_role_id_idx" on "user_roles" ("role_id")')
    })

    it('records both indexes in the auth schema snapshot', () => {
      const indexNames = readSnapshotIndexNames('auth', 'user_roles')
      expect(indexNames).toContain('user_roles_user_id_idx')
      expect(indexNames).toContain('user_roles_role_id_idx')
    })
  })

  // The record upsert in `@open-mercato/shared/lib/data/engine.ts` uses
  // ON CONFLICT ("entity_type", "entity_id", "organization_id", "tenant_id").
  // MEASURED against Postgres 17: a bare conflict target resolves ONLY against a
  // NON-partial unique index — Postgres never infers a partial one, it raises
  // "there is no unique or exclusion constraint matching the ON CONFLICT
  // specification". So the primary index MUST be plain. A plain unique index cannot
  // cover the null-scope shapes (Postgres treats NULLs as distinct), which is what the
  // three partial indexes below are for. Pinned at all three declaration sites.
  describe('custom_entities_storage scope uniqueness', () => {
    const SCOPE = 'custom_entities_storage_scope_uq'

    it('declares the PRIMARY scope index as a plain non-partial unique index', () => {
      // Plain => declared with `properties`, not `expression`. If this ever becomes an
      // `expression` index it silently stops satisfying the ON CONFLICT target.
      expect(readEntities('entities')).toContain(
        "@Index({ name: 'custom_entities_storage_scope_uq', properties: ['entityType', 'entityId', 'organizationId', 'tenantId'], options: { unique: true } })",
      )
    })

    it('creates the primary scope index as a plain (non-partial) unique index', () => {
      const sql = readAllMigrationSql('entities')
      expect(sql).toContain(
        'create unique index "custom_entities_storage_scope_uq" on "custom_entities_storage" ("entity_type", "entity_id", "organization_id", "tenant_id");',
      )
    })

    it('does not put a predicate on the primary scope index', () => {
      // A predicate here would break the upsert at runtime — the exact defect this
      // test exists to prevent. Assert the CREATE statement has no `where`.
      const statements = readAllMigrationSql('entities')
        .split('\n')
        .filter((line) => line.includes('create unique index "custom_entities_storage_scope_uq"'))
      expect(statements).toHaveLength(1)
      expect(statements[0]).not.toContain('where')
    })

    // The null-scope shapes, which a plain index cannot enforce.
    const partialIndexes: Array<{ name: string; expression: string }> = [
      {
        name: 'custom_entities_storage_tenant_uq',
        expression:
          'create unique index "custom_entities_storage_tenant_uq" on "custom_entities_storage" ("entity_type", "entity_id", "tenant_id") where "tenant_id" is not null and "organization_id" is null',
      },
      {
        name: 'custom_entities_storage_org_uq',
        expression:
          'create unique index "custom_entities_storage_org_uq" on "custom_entities_storage" ("entity_type", "entity_id", "organization_id") where "tenant_id" is null and "organization_id" is not null',
      },
      {
        name: 'custom_entities_storage_global_uq',
        expression:
          'create unique index "custom_entities_storage_global_uq" on "custom_entities_storage" ("entity_type", "entity_id") where "tenant_id" is null and "organization_id" is null',
      },
    ]

    it.each(partialIndexes)('declares $name as a partial index on the entity', ({ expression }) => {
      expect(readEntities('entities')).toContain(expression)
    })

    it.each(partialIndexes)('creates $name in an entities migration', ({ expression }) => {
      expect(readAllMigrationSql('entities')).toContain(expression)
    })

    it.each(partialIndexes)('records $name in the entities schema snapshot', ({ name }) => {
      expect(readSnapshotIndexNames('entities', 'custom_entities_storage')).toContain(name)
    })

    it('drops the legacy non-unique index so db:generate sees no drift', () => {
      const sql = readAllMigrationSql('entities')
      expect(sql).toContain('drop index if exists "custom_entities_storage_unique_idx"')
      // Declaring it again would make MikroORM re-emit a create for an index the
      // migrations deliberately remove.
      expect(readEntities('entities')).not.toContain(
        "@Index({ name: 'custom_entities_storage_unique_idx'",
      )
      expect(readSnapshotIndexNames('entities', 'custom_entities_storage')).not.toContain(
        'custom_entities_storage_unique_idx',
      )
    })

    // The snapshot must record what MikroORM ACTUALLY serializes, or `yarn db:generate`
    // sees a diff and re-emits the SQL. For a `properties` index that is
    // `columnNames: [...]`, `composite: true`, `unique: true`. For an `expression`
    // index it is `columnNames: []`, `composite: false`, `unique: false` — `unique` is
    // literally `type !== 'index'` in `DatabaseTable.addIndex`, and `@Index` passes
    // type `'index'`. Asserting the field shape, not just the name, is the difference
    // between catching this and not: a name-only check passes on a hand-written entry
    // no generator would reproduce.
    it('records the primary index with the properties-index shape MikroORM emits', () => {
      const entry = readSnapshotIndexes('entities', 'custom_entities_storage')
        .find((index) => index.keyName === SCOPE)
      expect(entry).toBeDefined()
      expect(entry!.columnNames).toEqual(['entity_type', 'entity_id', 'organization_id', 'tenant_id'])
      expect(entry!.composite).toBe(true)
      expect(entry!.constraint).toBe(false)
      expect(entry!.primary).toBe(false)
      expect(entry!.unique).toBe(true)
      expect(entry!.expression).toBeUndefined()
    })

    it('records each partial index with the expression-index shape MikroORM emits', () => {
      const byName = new Map(
        readSnapshotIndexes('entities', 'custom_entities_storage').map((i) => [i.keyName, i]),
      )

      for (const { name, expression } of partialIndexes) {
        const entry = byName.get(name)
        expect(entry).toBeDefined()
        expect(entry!.expression).toBe(expression)
        expect(entry!.columnNames).toEqual([])
        expect(entry!.composite).toBe(false)
        expect(entry!.constraint).toBe(false)
        expect(entry!.primary).toBe(false)
        expect(entry!.unique).toBe(false)
      }
    })
  })
})
