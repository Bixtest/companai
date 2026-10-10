import {
  MASKED_EXPORT_VALUE,
  applyEncryptedFieldMask,
  canonicalExportFieldName,
  exportFieldNameCandidates,
  isEncryptedExportField,
  resolveExportEncryptedFields,
} from '../export-encryption'
import type { PreparedExport } from '../exporters'

const prepared = (): PreparedExport => ({
  columns: [
    { field: 'id', header: 'ID' },
    { field: 'name', header: 'Name' },
    { field: 'apiSecret', header: 'Api Secret' },
  ],
  rows: [
    { id: '1', name: 'Acme', apiSecret: 'super-secret-value' },
    { id: '2', name: 'Globex', apiSecret: 'another-secret' },
  ],
})

describe('CC-45 resolveExportEncryptedFields', () => {
  it('returns an empty set when no entityId is supplied', async () => {
    const result = await resolveExportEncryptedFields(
      () => ({ getEncryptedFieldNames: async () => ['apiSecret'] }),
      null,
      't1',
      'org1',
    )
    expect(result.fields.size).toBe(0)
    expect(result.maskAll).toBe(false)
  })

  it('returns an empty set when the service is absent (encryption unavailable)', async () => {
    const result = await resolveExportEncryptedFields(() => null, 'customers:customer_entity', 't1', 'org1')
    expect(result.fields.size).toBe(0)
    expect(result.maskAll).toBe(false)
  })

  it('returns an empty set when encryption is disabled', async () => {
    const result = await resolveExportEncryptedFields(
      () => ({ isEnabled: () => false, getEncryptedFieldNames: async () => ['apiSecret'] }),
      'customers:customer_entity',
      't1',
      'org1',
    )
    expect(result.fields.size).toBe(0)
    expect(result.maskAll).toBe(false)
  })

  it('fails closed (maskAll) when the map read throws', async () => {
    const result = await resolveExportEncryptedFields(
      () => ({
        getEncryptedFieldNames: async () => {
          throw new Error('db down')
        },
      }),
      'customers:customer_entity',
      't1',
      'org1',
    )
    expect(result.maskAll).toBe(true)
  })

  it('expands marked names across snake_case / camelCase variants', async () => {
    const result = await resolveExportEncryptedFields(
      () => ({ getEncryptedFieldNames: async () => ['api_secret'] }),
      'customers:customer_entity',
      't1',
      'org1',
    )
    // The map names `api_secret`; the export column is `apiSecret`.
    expect(isEncryptedExportField('apiSecret', result.fields)).toBe(true)
  })
})

describe('CC-45 applyEncryptedFieldMask', () => {
  it('masks only the marked column, leaving others byte-identical', () => {
    const input = prepared()
    const masked = applyEncryptedFieldMask(input, { fields: new Set(['apiSecret']), maskAll: false })
    expect(masked.rows).toEqual([
      { id: '1', name: 'Acme', apiSecret: MASKED_EXPORT_VALUE },
      { id: '2', name: 'Globex', apiSecret: MASKED_EXPORT_VALUE },
    ])
    // headers and column order are unchanged
    expect(masked.columns).toEqual(input.columns)
  })

  it('is a no-op (returns the same object) when nothing is marked', () => {
    const input = prepared()
    const masked = applyEncryptedFieldMask(input, { fields: new Set(), maskAll: false })
    expect(masked).toBe(input)
  })

  it('masks every column when maskAll is set (fail-closed)', () => {
    const masked = applyEncryptedFieldMask(prepared(), { fields: new Set(), maskAll: true })
    for (const row of masked.rows) {
      expect(row.id).toBe(MASKED_EXPORT_VALUE)
      expect(row.name).toBe(MASKED_EXPORT_VALUE)
      expect(row.apiSecret).toBe(MASKED_EXPORT_VALUE)
    }
  })

  it('never writes the raw secret into any serialized output', () => {
    const masked = applyEncryptedFieldMask(prepared(), { fields: new Set(['apiSecret']), maskAll: false })
    const body = JSON.stringify(masked)
    expect(body).not.toContain('super-secret-value')
    expect(body).not.toContain('another-secret')
  })
})

describe('CC-45 exportFieldNameCandidates', () => {
  it('produces raw + canonical variants', () => {
    expect(exportFieldNameCandidates('apiSecret')).toEqual(
      expect.arrayContaining(['apiSecret', 'apisecret']),
    )
  })

  it('handles cf: custom fields', () => {
    const candidates = exportFieldNameCandidates('cf:bank_account')
    expect(candidates).toContain('cf_bank_account')
  })
})

describe('CC-45 canonicalExportFieldName (D2 regression)', () => {
  it('canonicalizes case and every separator to the same token', () => {
    const forms = ['apiSecret', 'api_secret', 'api-secret', 'Api Secret', 'API_SECRET', 'api.secret']
    for (const form of forms) {
      expect(canonicalExportFieldName(form)).toBe('apisecret')
    }
  })

  it('strips the cf: / cf_ prefix so both spellings agree', () => {
    expect(canonicalExportFieldName('cf:bank_account')).toBe('bankaccount')
    expect(canonicalExportFieldName('cf_bank_account')).toBe('bankaccount')
  })
})

describe('CC-45 header-spelling variants are all masked (D2 regression)', () => {
  // Realistic export column spellings that `sanitizeFieldName` can produce from a `csv.headers`
  // entry or an `export.columns[i].field`. Before the canonical fix, `api-secret` / `Api Secret` /
  // `API_SECRET` silently missed and the secret exported in clear.
  const markedFrom = async (mapName: string) =>
    (await resolveExportEncryptedFields(
      () => ({ getEncryptedFieldNames: async () => [mapName] }),
      'example.widget',
      't1',
      'org1',
    )).fields

  it('masks every spelling variant of a marked field', async () => {
    const fields = await markedFrom('apiSecret')
    for (const columnSpelling of ['apiSecret', 'api_secret', 'api-secret', 'Api Secret', 'API_SECRET']) {
      expect(isEncryptedExportField(columnSpelling, fields)).toBe(true)
    }
  })

  it('masks an uppercase-header spelling of a lowercase map name (the SSN case)', async () => {
    const fields = await markedFrom('ssn')
    expect(isEncryptedExportField('SSN', fields)).toBe(true)
    expect(isEncryptedExportField('ssn', fields)).toBe(true)
  })

  it('does NOT mask an unrelated column', async () => {
    const fields = await markedFrom('apiSecret')
    expect(isEncryptedExportField('name', fields)).toBe(false)
    expect(isEncryptedExportField('id', fields)).toBe(false)
  })
})
