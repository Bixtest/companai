import type { AnalyticsModuleConfig } from '@open-mercato/shared/modules/analytics'

/**
 * Analytics registry fixtures for the aggregation tests.
 *
 * These deliberately belong to no real module. The aggregation and registry code
 * under test is domain-agnostic — it validates entity types, resolves field
 * mappings and builds SQL fragments — so binding its tests to whichever business
 * modules happened to exist made the suite fail whenever a module was removed,
 * without telling us anything about the code under test.
 *
 * The shape mirrors what the original fixtures exercised, so coverage is
 * unchanged:
 *
 *   - three modules, so registry composition across modules is still tested
 *   - 3 + 2 + 1 = 6 entities, so multi-entity modules are still tested
 *   - every field type the aggregation builder branches on: uuid, numeric, text,
 *     timestamp
 *   - a `labelResolvers` entry, so entities carrying one are still represented
 *
 * Extend these rather than importing a business module's `analytics.ts`.
 */

/** Three entities, including numeric/text/timestamp fields and a label resolver. */
export const primaryFixtureConfig: AnalyticsModuleConfig = {
  entities: [
    {
      entityId: 'fixture_primary:documents',
      requiredFeatures: ['fixture_primary.documents.view'],
      entityConfig: {
        tableName: 'fixture_documents',
        dateField: 'issued_at',
        defaultScopeFields: ['tenant_id', 'organization_id'],
      },
      fieldMappings: {
        id: { dbColumn: 'id', type: 'uuid' },
        totalAmount: { dbColumn: 'total_amount', type: 'numeric' },
        status: { dbColumn: 'status', type: 'text' },
        issuedAt: { dbColumn: 'issued_at', type: 'timestamp' },
        ownerId: { dbColumn: 'owner_id', type: 'uuid' },
        categoryId: { dbColumn: 'category_id', type: 'uuid' },
      },
      labelResolvers: {
        ownerId: { table: 'fixture_owners', idColumn: 'id', labelColumn: 'display_name' },
      },
    },
    {
      entityId: 'fixture_primary:document_lines',
      requiredFeatures: ['fixture_primary.documents.view'],
      entityConfig: {
        tableName: 'fixture_document_lines',
        dateField: 'created_at',
        defaultScopeFields: ['tenant_id', 'organization_id'],
      },
      fieldMappings: {
        id: { dbColumn: 'id', type: 'uuid' },
        quantity: { dbColumn: 'quantity', type: 'numeric' },
        documentId: { dbColumn: 'document_id', type: 'uuid' },
        createdAt: { dbColumn: 'created_at', type: 'timestamp' },
      },
    },
    {
      entityId: 'fixture_primary:drafts',
      requiredFeatures: ['fixture_primary.drafts.view'],
      entityConfig: {
        tableName: 'fixture_drafts',
        dateField: 'created_at',
        defaultScopeFields: ['tenant_id', 'organization_id'],
      },
      fieldMappings: {
        id: { dbColumn: 'id', type: 'uuid' },
        estimatedAmount: { dbColumn: 'estimated_amount', type: 'numeric' },
        createdAt: { dbColumn: 'created_at', type: 'timestamp' },
      },
    },
  ],
}

/** Two entities — proves the registry composes more than one multi-entity module. */
export const secondaryFixtureConfig: AnalyticsModuleConfig = {
  entities: [
    {
      entityId: 'fixture_secondary:entities',
      requiredFeatures: ['fixture_secondary.entities.view'],
      entityConfig: {
        tableName: 'fixture_entities',
        dateField: 'created_at',
        defaultScopeFields: ['tenant_id', 'organization_id'],
      },
      fieldMappings: {
        id: { dbColumn: 'id', type: 'uuid' },
        name: { dbColumn: 'name', type: 'text' },
        createdAt: { dbColumn: 'created_at', type: 'timestamp' },
      },
    },
    {
      entityId: 'fixture_secondary:cases',
      requiredFeatures: ['fixture_secondary.cases.view'],
      entityConfig: {
        tableName: 'fixture_cases',
        dateField: 'opened_at',
        defaultScopeFields: ['tenant_id', 'organization_id'],
      },
      fieldMappings: {
        id: { dbColumn: 'id', type: 'uuid' },
        value: { dbColumn: 'value', type: 'numeric' },
        stage: { dbColumn: 'stage', type: 'text' },
        openedAt: { dbColumn: 'opened_at', type: 'timestamp' },
      },
    },
  ],
}

/** Single entity — proves a one-entity module registers correctly. */
export const tertiaryFixtureConfig: AnalyticsModuleConfig = {
  entities: [
    {
      entityId: 'fixture_tertiary:items',
      requiredFeatures: ['fixture_tertiary.items.view'],
      entityConfig: {
        tableName: 'fixture_items',
        dateField: 'created_at',
        defaultScopeFields: ['tenant_id', 'organization_id'],
      },
      fieldMappings: {
        id: { dbColumn: 'id', type: 'uuid' },
        title: { dbColumn: 'title', type: 'text' },
        createdAt: { dbColumn: 'created_at', type: 'timestamp' },
      },
    },
  ],
}

export const analyticsFixtureConfigs = [
  primaryFixtureConfig,
  secondaryFixtureConfig,
  tertiaryFixtureConfig,
]

/** Every entity id the fixtures register, in registration order. */
export const fixtureEntityIds = [
  'fixture_primary:documents',
  'fixture_primary:document_lines',
  'fixture_primary:drafts',
  'fixture_secondary:entities',
  'fixture_secondary:cases',
  'fixture_tertiary:items',
] as const
