/**
 * Row 18 — the AI read path must apply the platform's COLUMN-LEVEL data-classification
 * mask (the `CC-45` gate the human export path uses), not only the search module's own
 * `fieldPolicy`.
 *
 * These tests prove three things:
 *  1. a field the platform MARKS as classified (and which is NOT in the search
 *     `fieldPolicy`) is masked with `***` on `search_get`;
 *  2. the fail-safe holds: a map read that throws masks EVERY value (`maskAll`);
 *  3. byte-identical when there is no map (covered by the sibling `ai-tools.get.test.ts`
 *     suite, whose mock container resolves no `tenantEncryptionService`).
 */

import { aiTools } from '../ai-tools'

const getTool = aiTools.find((t) => t.name === 'search_get')
if (!getTool) throw new Error('search_get tool not found in aiTools — was it renamed?')

const queryTool = aiTools.find((t) => t.name === 'search_query')
if (!queryTool) throw new Error('search_query tool not found in aiTools — was it renamed?')

const PERSON_CONFIG = {
  aclFeatures: ['customers.people.view'],
  // Note: `loyalty_number` is deliberately NOT in the search fieldPolicy — it is only
  // in the platform classification map. This is the exact gap row 18 closes.
  fieldPolicy: {
    searchable: ['first_name', 'last_name'],
    hashOnly: [],
    excluded: [],
  },
}

function makeCtx(
  record: Record<string, unknown> | undefined,
  encryptionService: unknown,
) {
  const items = record ? [record] : []
  const mockQuery = jest.fn().mockResolvedValue({ items, total: items.length })
  const searchIndexer = {
    getEntityConfig: (entityId: string) =>
      entityId === 'customers:customer_person_profile' ? PERSON_CONFIG : undefined,
  }
  const ctx = {
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    userId: 'user-1',
    userFeatures: ['customers.people.view'],
    isSuperAdmin: false,
    container: {
      resolve: (name: string) => {
        if (name === 'searchIndexer') return searchIndexer
        if (name === 'tenantEncryptionService') return encryptionService
        return { query: mockQuery }
      },
    },
  }
  return { ctx, mockQuery }
}

describe('row 18 — search_get applies the platform classification mask', () => {
  // L103: the mock is ENTITY-AWARE — it returns the marked set only for the entity the
  // test expects, so a wrong-entityId bug in production turns the test RED (a mock that
  // ignores its `entityId` argument would pass such a bug silently).
  const EXPECTED_ENTITY = 'customers:customer_person_profile'
  const entityAwareService = (fields: string[]) => ({
    isEnabled: () => true,
    getEncryptedFieldNames: async (entityId: string) =>
      entityId === EXPECTED_ENTITY ? fields : [],
  })

  it('masks a CLASSIFIED field that the search fieldPolicy does not name', async () => {
    const { ctx } = makeCtx(
      { id: 'rec-1', first_name: 'Jane', loyalty_number: 'LOY-42' },
      entityAwareService(['loyalty_number']),
    )

    const result = (await getTool.handler(
      { entityType: EXPECTED_ENTITY, recordId: 'rec-1' },
      ctx,
    )) as { found: boolean; record: Record<string, unknown> }

    expect(result.found).toBe(true)
    // The unclassified field survives…
    expect(result.record.first_name).toBe('Jane')
    // …the classified one is masked, not dropped (CC-45's owner-decided shape).
    expect(result.record.loyalty_number).toBe('***')
  })

  it('fails safe — a map read that throws masks EVERY value', async () => {
    const { ctx } = makeCtx(
      { id: 'rec-1', first_name: 'Jane', loyalty_number: 'LOY-42' },
      {
        isEnabled: () => true,
        getEncryptedFieldNames: async () => {
          throw new Error('db down')
        },
      },
    )

    const result = (await getTool.handler(
      { entityType: EXPECTED_ENTITY, recordId: 'rec-1' },
      ctx,
    )) as { record: Record<string, unknown> }

    expect(result.record.first_name).toBe('***')
    expect(result.record.loyalty_number).toBe('***')
  })

  it('matches spellings across snake/camel/kebab (canonical form)', async () => {
    // The map names `api-secret`; the record exposes the SAME field under a different
    // spelling. Canonicalisation (lowercase, strip non-alphanumerics) makes them agree.
    const { ctx } = makeCtx(
      { id: 'rec-1', apiSecret: 'shh' },
      entityAwareService(['api-secret']),
    )

    const result = (await getTool.handler(
      { entityType: EXPECTED_ENTITY, recordId: 'rec-1' },
      ctx,
    )) as { record: Record<string, unknown> }

    expect(result.record.apiSecret).toBe('***')
  })

  it('resolves the map for the REQUESTED entity, not a different one (L103)', async () => {
    // The marked set belongs to a DIFFERENT entity; the requested one must NOT mask.
    // This is the assertion a wrong-entityId bug fails.
    const service = {
      isEnabled: () => true,
      getEncryptedFieldNames: async (entityId: string) =>
        entityId === 'some:other_entity' ? ['loyalty_number'] : [],
    }
    const { ctx } = makeCtx(
      { id: 'rec-1', first_name: 'Jane', loyalty_number: 'LOY-42' },
      service,
    )

    const result = (await getTool.handler(
      { entityType: EXPECTED_ENTITY, recordId: 'rec-1' },
      ctx,
    )) as { record: Record<string, unknown> }

    expect(result.record.loyalty_number).toBe('LOY-42')
  })

  it('is byte-identical when there is no encryption service', async () => {
    const { ctx } = makeCtx(
      { id: 'rec-1', first_name: 'Jane', loyalty_number: 'LOY-42' },
      undefined,
    )

    const result = (await getTool.handler(
      { entityType: EXPECTED_ENTITY, recordId: 'rec-1' },
      ctx,
    )) as { record: Record<string, unknown> }

    expect(result.record.first_name).toBe('Jane')
    expect(result.record.loyalty_number).toBe('LOY-42')
  })
})

describe('row 18 — search_query does not leak a classified presenter', () => {
  function makeQueryCtx(results: Array<Record<string, unknown>>, encryptionService: unknown) {
    const searchService = { search: jest.fn().mockResolvedValue(results) }
    const ctx = {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userFeatures: ['search.global'],
      isSuperAdmin: false,
      container: {
        resolve: (name: string) => {
          if (name === 'searchService') return searchService
          if (name === 'tenantEncryptionService') return encryptionService
          return {}
        },
      },
    }
    return { ctx, searchService }
  }

  it('drops the index-time presenter text for an entity that carries a classification map', async () => {
    const { ctx } = makeQueryCtx(
      [
        {
          entityId: 'customers:customer_person_profile',
          recordId: 'rec-1',
          score: 0.9,
          source: 'fulltext',
          presenter: { title: 'LOY-42-SECRET', subtitle: 'classified' },
          url: '/x',
        },
      ],
      {
        isEnabled: () => true,
        getEncryptedFieldNames: async (entityId: string) =>
          entityId === 'customers:customer_person_profile' ? ['loyalty_number'] : [],
      },
    )

    const result = (await queryTool.handler({ query: 'jane' }, ctx)) as {
      results: Array<{ title: unknown; subtitle: unknown; recordId: string }>
    }
    // The classified value must NOT come through the presenter…
    expect(result.results[0].title).toBe('rec-1')
    expect(result.results[0].title).not.toBe('LOY-42-SECRET')
    expect(result.results[0].subtitle).toBeUndefined()
    // …but the hit itself is still returned (id + score + url survive).
    expect(result.results[0].recordId).toBe('rec-1')
  })

  it('returns the presenter unchanged when the entity has NO classification map', async () => {
    const { ctx } = makeQueryCtx(
      [
        {
          entityId: 'catalog:product',
          recordId: 'rec-2',
          score: 0.8,
          source: 'fulltext',
          presenter: { title: 'Widget', subtitle: 'SKU-1' },
          url: '/p',
        },
      ],
      { isEnabled: () => true, getEncryptedFieldNames: async () => [] },
    )

    const result = (await queryTool.handler({ query: 'widget' }, ctx)) as {
      results: Array<{ title: unknown; subtitle: unknown }>
    }
    expect(result.results[0].title).toBe('Widget')
    expect(result.results[0].subtitle).toBe('SKU-1')
  })

  it('is byte-identical with no encryption service at all', async () => {
    const { ctx } = makeQueryCtx(
      [
        {
          entityId: 'catalog:product',
          recordId: 'rec-3',
          score: 0.7,
          source: 'tokens',
          presenter: { title: 'Thing' },
          url: '/t',
        },
      ],
      undefined,
    )

    const result = (await queryTool.handler({ query: 'thing' }, ctx)) as {
      results: Array<{ title: unknown }>
    }
    expect(result.results[0].title).toBe('Thing')
  })
})

describe('row 18 — search_aggregate cannot enumerate a classified field', () => {
  const aggregateTool = aiTools.find((t) => t.name === 'search_aggregate')
  if (!aggregateTool) throw new Error('search_aggregate tool not found in aiTools — was it renamed?')

  // `groupBy` is allowed by the search fieldPolicy (it is `searchable`), but the PLATFORM
  // classifies it — so it must be refused as a grouping key.
  const CONFIG = {
    aclFeatures: ['customers.deals.view'],
    fieldPolicy: { searchable: ['stage', 'loyalty_number'], hashOnly: [], excluded: [] },
  }

  function makeCtx(encryptionService: unknown) {
    const searchIndexer = {
      getEntityConfig: (entityId: string) =>
        entityId === 'customers:customer_deal' ? CONFIG : undefined,
    }
    const queryEngine = { query: jest.fn().mockResolvedValue({ items: [], total: 0 }) }
    return {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userFeatures: ['customers.deals.view'],
      isSuperAdmin: false,
      container: {
        resolve: (name: string) => {
          if (name === 'searchIndexer') return searchIndexer
          if (name === 'queryEngine') return queryEngine
          if (name === 'tenantEncryptionService') return encryptionService
          return {}
        },
      },
    }
  }

  it('refuses a classified groupBy field', async () => {
    const ctx = makeCtx({
      isEnabled: () => true,
      getEncryptedFieldNames: async (entityId: string) =>
        entityId === 'customers:customer_deal' ? ['loyalty_number'] : [],
    })
    await expect(
      aggregateTool.handler({ entityType: 'customers:customer_deal', groupBy: 'loyalty_number' }, ctx),
    ).rejects.toThrow(/classified/)
  })

  it('allows a non-classified groupBy field', async () => {
    const ctx = makeCtx({
      isEnabled: () => true,
      getEncryptedFieldNames: async () => ['loyalty_number'],
    })
    const result = (await aggregateTool.handler(
      { entityType: 'customers:customer_deal', groupBy: 'stage' },
      ctx,
    )) as { total: number }
    expect(result.total).toBe(0)
  })

  it('is byte-identical with no encryption service (gate is a no-op)', async () => {
    const ctx = makeCtx(undefined)
    const result = (await aggregateTool.handler(
      { entityType: 'customers:customer_deal', groupBy: 'loyalty_number' },
      ctx,
    )) as { total: number }
    expect(result.total).toBe(0)
  })
})

describe('row 18 — the mask recurses into nested values (critic round 2)', () => {
  it('masks a classified key nested inside an object value', async () => {
    const { ctx } = makeCtx(
      { id: 'rec-9', meta: { secret: 'LEAK', safe: 'ok' }, tags: [{ secret: 'LEAK2' }] },
      {
        isEnabled: () => true,
        getEncryptedFieldNames: async (entityId: string) =>
          entityId === 'customers:customer_person_profile' ? ['secret'] : [],
      },
    )

    const result = (await getTool.handler(
      { entityType: 'customers:customer_person_profile', recordId: 'rec-9' },
      ctx,
    )) as { record: Record<string, unknown> }

    const meta = result.record.meta as Record<string, unknown>
    expect(meta.secret).toBe('***')
    expect(meta.safe).toBe('ok')
    const tags = result.record.tags as Array<Record<string, unknown>>
    expect(tags[0].secret).toBe('***')
  })
})
