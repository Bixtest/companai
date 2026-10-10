import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { CrudHttpError, isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { parseBooleanToken } from '@open-mercato/shared/lib/boolean'
import { parseCommaSeparatedList } from '@open-mercato/shared/lib/string'
import { resolveTranslations } from '@open-mercato/shared/lib/i18n/server'
import type { QueryEngine } from '@open-mercato/shared/lib/query/types'
import {
  normalizeExportFormat,
  serializeExport,
  defaultExportFilename,
  toHeaderLabel,
  type CrudExportColumn,
} from '@open-mercato/shared/lib/crud/exporters'
import {
  resolveExportEncryptedFields,
  applyEncryptedFieldMask,
  type ExportEncryptionService,
  type ExportFieldAliasMap,
} from '@open-mercato/shared/lib/crud/export-encryption'
import { createCustomersCrudOpenApi, createPagedListResponseSchema } from '../../openapi'
import { resolveCustomerInteractionFeatureFlags } from '../../../lib/interactionFeatureFlags'
import { resolveScopedRequestContext } from '@open-mercato/shared/lib/crud/scoped-request-context'
import {
  CUSTOMER_INTERACTION_ENTITY_ID,
  CUSTOMER_INTERACTION_TODO_ADAPTER_SOURCE,
} from '../../../lib/interactionCompatibility'
import { CUSTOMER_ENTITY_ID } from '../../../lib/customFieldRouting'
import {
  filterTodoRows,
  listCanonicalTodoRows,
  listLegacyTodoRows,
  normalizeTodoSearch,
  paginateTodoRows,
  sortTodoRows,
  type CustomerTodoRow,
} from '../../../lib/todoCompatibility'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('customers')

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
  all: z.string().optional(),
  entityId: z.string().uuid().optional(),
  // CC-49: when present, the request is a file download and the server assembles it (so the CC-45
  // encryption mask applies). Absent => the JSON list response, byte-identical to before.
  format: z.string().optional(),
  exportColumns: z.string().optional(),
})

/**
 * CC-49 — the customer-tasks export columns are ALIASES for marked fields, and the rows draw on TWO
 * entities:
 *   - `todoTitle`       ← `customer_interaction.title`   (marked)
 *   - `todoDescription` ← `customer_interaction.body`     (marked)
 *   - `customer.displayName` / `displayName` ← `customer_entity.display_name` (marked)
 * The mask keys on the field name, so it never matches the alias and the value would leave in clear.
 * This map tells the mask which true field each exported column carries; `TASKS_EXPORT_ENTITY_IDS`
 * names both entities whose marked fields must be unioned (a single id would miss the customer name).
 */
const TASKS_EXPORT_ALIASES: ExportFieldAliasMap = {
  todoTitle: 'title',
  todoDescription: 'body',
  displayName: 'display_name',
  'customer.displayName': 'display_name',
}

const TASKS_EXPORT_ENTITY_IDS: string[] = [
  CUSTOMER_INTERACTION_ENTITY_ID,
  CUSTOMER_ENTITY_ID,
]

/** Walks a dotted path to its value, so an export column keyed on `customer.displayName` resolves. */
function readValueAtPath(record: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.').filter((segment) => segment.length > 0)
  let current: unknown = record
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[segment]
  }
  return current ?? null
}

/**
 * Builds columns from the row's SCALAR fields only. Object/array-valued keys (`customer`,
 * `todoCustomValues`) are deliberately skipped: a nested object column would serialize the whole
 * record — leaking the marked customer `display_name` (or a body inside `todoCustomValues`) in clear.
 */
function deriveScalarColumns(rows: Array<Record<string, unknown>>): CrudExportColumn[] {
  const used: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      const value = row[key]
      if (value !== null && typeof value === 'object') continue
      if (!used.includes(key)) used.push(key)
    }
  }
  if (used.length === 0) return [{ field: 'id', header: 'ID' }]
  return used.map((key) => ({ field: key, header: toHeaderLabel(key) }))
}


export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['customers.interactions.view'] },
}

// Per-source fetch cap used when the legacy adapter must merge legacy and
// canonical-bridge rows without DB-side union. Bounds memory on tenants with
// large task history.
const MERGED_TASK_FETCH_CAP = 2000

export async function GET(request: Request): Promise<Response> {
  const { translate } = await resolveTranslations()
  try {
    const { auth, em, organizationIds, container, selectedOrganizationId } =
      await resolveScopedRequestContext(request)
    const url = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(url.searchParams))
    const flags = await resolveCustomerInteractionFeatureFlags(container, auth.tenantId)
    const requestedExport = normalizeExportFormat(query.format)
    // CC-49: an export always means "the full set", exactly like the old browser "full" export.
    const exportAll = requestedExport ? true : parseBooleanToken(query.all) === true
    const search = normalizeTodoSearch(query.search)
    const queryEngine = container.resolve('queryEngine') as QueryEngine

    let items: CustomerTodoRow[]
    let total: number
    if (flags.unified) {
      const canonical = await listCanonicalTodoRows(
        em,
        container,
        auth,
        selectedOrganizationId,
        organizationIds,
        {
          entityId: query.entityId,
          pagination: exportAll ? null : { page: query.page, pageSize: query.pageSize },
          searchText: search,
        },
      )
      items = canonical.items
      total = canonical.total
    } else {
      const legacyWindow = exportAll
        ? null
        : Math.min(
            MERGED_TASK_FETCH_CAP,
            Math.max(query.pageSize, query.page * query.pageSize + query.pageSize),
          )
      const [legacyRows, canonicalRows] = await Promise.all([
        listLegacyTodoRows(em, queryEngine, auth.tenantId, organizationIds, query.entityId, {
          limit: legacyWindow,
        }),
        listCanonicalTodoRows(
          em,
          container,
          auth,
          selectedOrganizationId,
          organizationIds,
          {
            entityId: query.entityId,
            includeDeleted: true,
            source: CUSTOMER_INTERACTION_TODO_ADAPTER_SOURCE,
            limit: legacyWindow,
          },
        ),
      ])
      const mergedRows = [
        ...legacyRows.filter((row) => !canonicalRows.bridgeIds.has(row.todoId)),
        ...canonicalRows.items,
      ]
      const filteredRows = filterTodoRows(sortTodoRows(mergedRows), search)
      const paged = paginateTodoRows(filteredRows, query.page, query.pageSize, exportAll)
      items = paged.items
      total = paged.total
    }

    // CC-49: the server builds the file (like the records page after CC-48), so the CC-45 mask —
    // told the alias map — blanks the marked fields (`todoTitle`/`todoDescription`/`displayName`).
    if (requestedExport) {
      const requestedColumns = parseCommaSeparatedList(query.exportColumns)
      const rawItems = items as unknown as Array<Record<string, unknown>>
      // CC-49 (H2): every row is flattened to a scalar per column. With a projection, the column
      // fields are exactly the ones the page asked for (its accessor keys, e.g. `customer.displayName`),
      // each walked to its value. Without a projection, derive the columns from the row's SCALAR
      // fields only — never from a nested object, which would serialize the whole record and leak the
      // marked customer name in clear.
      const columns: CrudExportColumn[] =
        requestedColumns && requestedColumns.length > 0
          ? requestedColumns.map((field) => ({ field, header: toHeaderLabel(field) }))
          : deriveScalarColumns(rawItems)
      const rows = rawItems.map((row) =>
        Object.fromEntries(columns.map((col) => [col.field, readValueAtPath(row, col.field)])),
      )
      const preparedRaw = { columns, rows }
      // CC-49: the rows draw on TWO entities (interaction title/body, customer display_name), so
      // union the marked fields of both. A map-read error on either fails closed.
      const encryptionService = () => {
        try {
          return (container.resolve('tenantEncryptionService') as ExportEncryptionService) ?? null
        } catch {
          return null
        }
      }
      const resolvedList = await Promise.all(
        TASKS_EXPORT_ENTITY_IDS.map((entityId) =>
          resolveExportEncryptedFields(
            encryptionService,
            entityId,
            auth.tenantId ?? null,
            selectedOrganizationId ?? auth.orgId ?? null,
          ),
        ),
      )
      const resolvedEncrypted = {
        fields: new Set<string>(resolvedList.flatMap((r) => Array.from(r.fields))),
        maskAll: resolvedList.some((r) => r.maskAll),
      }
      const prepared = applyEncryptedFieldMask(preparedRaw, resolvedEncrypted, TASKS_EXPORT_ALIASES)
      const serialized = serializeExport(prepared, requestedExport)
      const filename = defaultExportFilename('customer_todos_full', requestedExport)
      return new Response(serialized.body, {
        headers: {
          'content-type': serialized.contentType,
          'content-disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({
      items,
      total,
      page: exportAll ? 1 : query.page,
      pageSize: exportAll ? items.length : query.pageSize,
      totalPages: exportAll ? 1 : Math.max(1, Math.ceil(total / query.pageSize)),
    })
  } catch (err) {
    if (isCrudHttpError(err)) {
      return NextResponse.json(err.body, { status: err.status })
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: translate('customers.errors.validationFailed', 'Validation failed'), details: err.issues }, { status: 400 })
    }
    logger.error('customers.interactions.tasks.get failed', { err })
    return NextResponse.json({ error: translate('customers.errors.internalError', 'Internal server error') }, { status: 500 })
  }
}

const todoItemSchema = z.object({
  id: z.string(),
  todoId: z.string(),
  todoSource: z.string(),
  todoTitle: z.string().nullable(),
  todoIsDone: z.boolean().nullable(),
  todoPriority: z.number().nullable().optional(),
  todoSeverity: z.string().nullable().optional(),
  todoDescription: z.string().nullable().optional(),
  todoDueAt: z.string().nullable().optional(),
  todoCustomValues: z.record(z.string(), z.unknown()).nullable().optional(),
  todoOrganizationId: z.string().nullable(),
  organizationId: z.string(),
  tenantId: z.string(),
  createdAt: z.string(),
  externalHref: z.string().nullable().optional(),
  _integrations: z.record(z.string(), z.unknown()).optional(),
  customer: z.object({
    id: z.string().nullable(),
    displayName: z.string().nullable(),
    kind: z.string().nullable(),
  }),
})

export const openApi: OpenApiRouteDoc = createCustomersCrudOpenApi({
  resourceName: 'CustomerTask',
  querySchema,
  listResponseSchema: createPagedListResponseSchema(todoItemSchema),
})
