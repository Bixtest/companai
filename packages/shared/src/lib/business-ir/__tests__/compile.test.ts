/**
 * The compiler (G-02).
 *
 * The fixture is the **real** declaration set the platform carries today: the
 * four relationships from `communication_channels/data/extensions.ts` — the only
 * module of 34 that declares any (measured in G-01) — plus the fields that module
 * declares on `external_conversation`. Using the real shape rather than an
 * invented one is the difference between testing the compiler and testing a story
 * about the compiler.
 *
 * The suite asserts the **positive** path first — a real IR compiles to a real
 * `QueryOptions` — and only then the refusals. A suite of only-negative tests
 * would pass against a compiler that refused everything.
 */

import { buildModelDescriptor } from '../../kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '../../kernel/model'
import { createBindingsFromDeclarations } from '../bindings'
import type { PhysicalBindings } from '../bindings'
import { compileQuery, isKnownOperator, modelVersionOf } from '../compile'
import type { BusinessQueryIR, CompileContext } from '../types'
import { SortDir } from '../../query/types'

/* ---- the real declarations ---------------------------------------- */

const REAL_EXTENSIONS: KernelDeclarationInput['extensions'] = [
  {
    base: 'messages:message',
    extension: 'communication_channels:message_channel_link',
    join: { baseKey: 'id', extensionKey: 'message_id' },
    cardinality: 'one-to-one',
    description: 'Links Messages to external channel conversations',
  },
  {
    base: 'messages:message',
    extension: 'communication_channels:message_reaction',
    join: { baseKey: 'id', extensionKey: 'message_id' },
    cardinality: 'one-to-many',
    description: 'Emoji reactions on messages from external channels and internal users',
  },
  {
    base: 'auth:user',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'assigned_user_id' },
    cardinality: 'one-to-many',
    description: 'Conversations assigned to a user in the unified inbox',
  },
  {
    base: 'customers:customer_entity',
    extension: 'communication_channels:external_conversation',
    join: { baseKey: 'id', extensionKey: 'contact_person_id' },
    cardinality: 'one-to-many',
    description: 'Conversations matched to a CRM person',
  },
]

const DECLARATIONS: KernelDeclarationInput = {
  customEntities: [
    { id: 'communication_channels:external_conversation', label: 'External conversation' },
  ],
  customFieldSets: [
    {
      entity: 'communication_channels:external_conversation',
      source: 'communication_channels',
      fields: [
        { key: 'subject', kind: 'text', label: 'Subject' },
        { key: 'unread_count', kind: 'integer', label: 'Unread', filterable: true },
        { key: 'last_message_at', kind: 'datetime', label: 'Last message' },
        { key: 'is_open', kind: 'boolean', label: 'Open' },
      ],
    },
  ],
  extensions: REAL_EXTENSIONS,
}

const MODEL: ModelDescriptor = buildModelDescriptor(DECLARATIONS)
const BINDINGS: PhysicalBindings = createBindingsFromDeclarations(DECLARATIONS, MODEL)
const CTX: CompileContext = { tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1' }

function mustCompile(ir: BusinessQueryIR, ctx: CompileContext = CTX) {
  const result = compileQuery(ir, MODEL, ctx, BINDINGS)
  if (!result.ok) {
    throw new Error(`expected a compile, got: ${JSON.stringify(result.diagnostics, null, 2)}`)
  }
  return result
}

function mustFail(ir: BusinessQueryIR, ctx: CompileContext = CTX) {
  const result = compileQuery(ir, MODEL, ctx, BINDINGS)
  if (result.ok) throw new Error('expected a refusal, got a plan')
  return result
}

/* ---- the positive path -------------------------------------------- */

describe('compileQuery — a real IR compiles to a real QueryOptions', () => {
  it('compiles a list read: dimensions, filters, sort and limit', () => {
    const result = mustCompile({
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['subject', 'unread_count'],
      filters: [{ field: 'unread_count', operator: '>', value: 0 }],
      sort: [{ field: 'unread_count', direction: 'desc' }],
      limit: 25,
    })

    expect(result.plan.physical.fields).toEqual([
      'external_conversation.subject',
      'external_conversation.unread_count',
    ])
    expect(result.plan.physical.filters).toEqual([
      { field: 'external_conversation.unread_count', op: 'gt', value: 0 },
    ])
    expect(result.plan.physical.sort).toEqual([
      { field: 'external_conversation.unread_count', dir: SortDir.Desc },
    ])
    expect(result.plan.physical.page).toEqual({ pageSize: 25 })
    expect(result.plan.logical.entity).toBe('external_conversation')
    expect(result.plan.logical.dimensions).toEqual([
      'external_conversation.subject',
      'external_conversation.unread_count',
    ])
  })

  it('resolves a module-qualified and a capitalised reference to the same entity', () => {
    const a = mustCompile({ operation: 'list', entity: 'communication_channels:external_conversation' })
    const b = mustCompile({ operation: 'list', entity: 'External_Conversation' })
    expect(a.plan.logical.entity).toBe('external_conversation')
    expect(b.plan.logical.entity).toBe('external_conversation')
  })

  it('records provenance naming the model version it compiled against', () => {
    const result = mustCompile({ operation: 'list', entity: 'external_conversation' })
    expect(result.plan.provenance.modelVersion).toBe(modelVersionOf(MODEL))
    expect(result.plan.provenance.modelVersion).toMatch(/^[0-9a-f]{8}$/)
    expect(result.plan.provenance.entityId).toBe('external_conversation')
    expect(result.plan.provenance.stages).toContain('resolve_schema')
    expect(result.plan.provenance.stages).toContain('plan_physical')
  })

  it('is deterministic — the same IR compiles to the same bytes', () => {
    const ir: BusinessQueryIR = {
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['subject'],
      limit: 10,
    }
    const first = mustCompile(ir)
    const second = mustCompile(ir)
    expect(JSON.stringify(first.plan)).toBe(JSON.stringify(second.plan))
  })
})

/* ---- scope is not the IR's to set --------------------------------- */

describe('scope comes from the context, never from the IR', () => {
  it('the IR type has no scope field', () => {
    // @ts-expect-error — a query IR has no tenantId; the type forbids it.
    const forbidden: BusinessQueryIR = { operation: 'list', entity: 'external_conversation', tenantId: 'evil' }
    void forbidden
  })

  it('scope smuggled onto the IR is ignored; the context wins', () => {
    const smuggled = {
      operation: 'list',
      entity: 'external_conversation',
      tenantId: 'evil-tenant',
      organizationId: 'evil-org',
    } as unknown as BusinessQueryIR

    const result = compileQuery(smuggled, MODEL, { tenantId: 'real-tenant' }, BINDINGS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.physical.tenantId).toBe('real-tenant')
    expect(result.plan.physical.organizationId).toBeUndefined()
  })

  it('fails closed when the context has no tenant', () => {
    const result = mustFail({ operation: 'list', entity: 'external_conversation' }, {})
    expect(result.diagnostics.some((d) => d.code === 'TENANT_SCOPE_MISSING')).toBe(true)
  })
})

/* ---- the refusals — every reference is resolved -------------------- */

describe('compileQuery — a reference the model does not contain fails the compile', () => {
  it('refuses an unknown entity', () => {
    const result = mustFail({ operation: 'list', entity: 'no_such_entity' })
    expect(result.diagnostics[0].code).toBe('UNKNOWN_ENTITY')
  })

  it('refuses an unknown field', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      dimensions: ['no_such_field'],
    })
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_FIELD')).toBe(true)
  })

  it('refuses an unknown relationship', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      relationships: ['no_such_relationship'],
    })
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_RELATIONSHIP')).toBe(true)
  })

  it('refuses an unknown operator', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'subject', operator: '~=' as never, value: 'x' }],
    })
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_OPERATOR')).toBe(true)
  })

  it('refuses a comparison operator on a non-ordered field', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'subject', operator: '>', value: 'a' }],
    })
    expect(result.diagnostics.some((d) => d.code === 'OPERATOR_NOT_ALLOWED')).toBe(true)
  })

  it('refuses `like` on an integer field', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'like', value: '3' }],
    })
    expect(result.diagnostics.some((d) => d.code === 'OPERATOR_NOT_ALLOWED')).toBe(true)
  })

  it('refuses a named metric, because the model declares none', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      measures: [{ metric: 'overdue_balance' }],
    })
    expect(result.diagnostics.some((d) => d.code === 'METRIC_NOT_DECLARED')).toBe(true)
  })
})

/* ---- gaps are reported, not hidden; an unservable operation is refused ---- */

describe('compileQuery — what the platform cannot serve is said at the severity that survives', () => {
  it('refuses an aggregate IR — ROW_ORIENTED_TARGET is an error, not a gap (T-04)', () => {
    // Until `T-04` this compiled with a **gap**, and `verifyFunction`'s error filter excludes gaps by
    // construction — so the check recorded `passed`, the Function saved and ran, and it returned
    // **rows** to somebody who asked for a number. The logical plan is still complete; what is
    // impossible is executing it, so the diagnostic is an error and reaches the report.
    const result = mustFail({
      operation: 'aggregate',
      entity: 'external_conversation',
      dimensions: ['subject'],
      measures: [{ aggregate: 'sum', field: 'unread_count' }],
    })
    const diagnostic = result.diagnostics.find((d) => d.code === 'ROW_ORIENTED_TARGET')
    expect(diagnostic?.severity).toBe('error')
    // The sentence says what the caller would have received, not only what the compiler could not do.
    expect(diagnostic?.message).toContain('rows')
    expect(diagnostic?.message).toContain('aggregate')
  })

  it('always reports that authorization injection does not exist yet', () => {
    const result = mustCompile({ operation: 'list', entity: 'external_conversation' })
    expect(result.plan.provenance.gaps).toContain('inject_authorization')
    expect(result.diagnostics.some((d) => d.code === 'AUTHORIZATION_NOT_IMPLEMENTED')).toBe(true)
  })

  it('reports the currency gap for a money filter value, and still compiles', () => {
    const result = mustCompile({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: '>', value: { amount: 10, currency: 'EUR' } }],
    })
    expect(result.plan.physical.filters).toEqual([
      { field: 'external_conversation.unread_count', op: 'gt', value: 10 },
    ])
    expect(result.diagnostics.some((d) => d.code === 'MONEY_COMPARED_AS_STATED')).toBe(true)
  })

  it('an `in` filter with a list value compiles', () => {
    const result = mustCompile({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'in', value: [1, 2, 3] }],
    })
    expect(result.plan.physical.filters).toEqual([
      { field: 'external_conversation.unread_count', op: 'in', value: [1, 2, 3] },
    ])
  })
})

/* ---- the physical plan carries a join ------------------------------ */

describe('compileQuery — a traversed relationship becomes a join', () => {
  it('builds a join edge from the declared binding', () => {
    const result = mustCompile({
      operation: 'list',
      entity: 'external_conversation',
      relationships: ['user.external_conversation'],
    })
    expect(result.plan.logical.relationships).toEqual(['user.external_conversation'])
    expect(result.plan.physical.joins).toEqual([
      {
        alias: 'user',
        entityId: 'auth:user',
        from: { alias: 'external_conversation', field: 'assigned_user_id' },
        to: { field: 'id' },
        type: 'left',
      },
    ])
  })
})

/* ---- a placeholder is not a value ---------------------------------- */

describe('compileQuery — a placeholder is refused, so it can never become a literal', () => {
  it('refuses an IR that still carries a placeholder in a filter value', () => {
    // Reached by calling the compiler directly, bypassing the runner's binder.
    // Without this guard a marker would land in a filter and the engine would
    // compare it as a value — the exact defect the binder exists to prevent.
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'gt', value: { $param: 'min_unread' } }],
    })
    expect(result.diagnostics[0].code).toBe('PARAMETER_NOT_BOUND')
    expect(result.diagnostics[0].message).toContain('min_unread')
    expect(result.diagnostics[0].message).toContain('filters[0].value')
  })

  it('refuses a placeholder in a time bound and in the limit', () => {
    const timeBound = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      timeRange: { from: { $param: 'since' }, field: 'last_message_at' },
    })
    expect(timeBound.diagnostics[0].code).toBe('PARAMETER_NOT_BOUND')
    expect(timeBound.diagnostics[0].message).toContain('timeRange.from')

    const limited = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      limit: { $param: 'top' },
    })
    expect(limited.diagnostics[0].code).toBe('PARAMETER_NOT_BOUND')
    expect(limited.diagnostics[0].message).toContain('limit')
  })

  it('refuses a sort field that is not declared, instead of silently dropping the sort', () => {
    // The measured defect: this used to compile to a plan with NO sort at all, so
    // a caller got rows in an arbitrary order and no indication why.
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      sort: [{ field: 'no_such_field', direction: 'desc' }],
    })
    expect(result.diagnostics.some((d) => d.code === 'UNKNOWN_FIELD')).toBe(true)
    const error = result.diagnostics.find((d) => d.code === 'UNKNOWN_FIELD')
    expect(error?.message).toContain('no_such_field')
    expect(error?.path).toBe('sort[0]')
  })

  it('refuses a sort carrying a placeholder', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      sort: [{ field: { $param: 'order_by' } as never, direction: 'desc' }],
    })
    expect(result.ok).toBe(false)
  })

  it('refuses a sort that names neither a field nor a metric', () => {
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      sort: [{ direction: 'asc' }],
    })
    expect(result.diagnostics.some((d) => d.code === 'SORT_NEEDS_FIELD')).toBe(true)
  })

  it('reports a metric sort as a gap, because no metrics are declared', () => {
    const result = compileQuery(
      { operation: 'list', entity: 'external_conversation', sort: [{ metric: 'revenue' }] },
      MODEL,
      CTX,
      BINDINGS,
    )
    // A gap, not an error: the IR is valid, the platform cannot serve it yet.
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'METRIC_NOT_DECLARED')).toBe(true)
  })

  it('refuses a placeholder nested inside a money value', () => {
    // A money value is unwrapped to its `amount` before comparison, so a marker
    // there would have become the compared value.
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      filters: [
        {
          field: 'unread_count',
          operator: 'gt',
          value: { amount: { $param: 'threshold' }, currency: 'GBP' },
        },
      ],
    })
    expect(result.diagnostics[0].code).toBe('PARAMETER_NOT_BOUND')
    expect(result.diagnostics[0].message).toContain('filters[0].value.amount')
  })

  it('refuses a placeholder in a reference position, by failing to resolve it', () => {
    // `dimensions` is a reference position, not a value position, so the
    // placeholder guard does not fire — resolution refuses it instead. Either way
    // the compile fails, which is the property that matters.
    const result = mustFail({
      operation: 'list',
      entity: 'external_conversation',
      dimensions: [{ $param: 'a_dimension' } as never],
    })
    expect(result.ok).toBe(false)
  })

  it('compiles the same IR once the placeholder is replaced by a value', () => {
    const result = mustCompile({
      operation: 'list',
      entity: 'external_conversation',
      filters: [{ field: 'unread_count', operator: 'gt', value: 3 }],
    })
    expect(result.plan.physical.filters).toEqual([
      { field: 'external_conversation.unread_count', op: 'gt', value: 3 },
    ])
  })
})

/* ---- the model version must cover what the compiler reads ---------- */

describe('modelVersionOf — a version that answers the question it is asked', () => {
  const withUnreadKind = (kind: string): ModelDescriptor =>
    buildModelDescriptor({
      customEntities: DECLARATIONS.customEntities,
      customFieldSets: [
        {
          entity: 'communication_channels:external_conversation',
          source: 'communication_channels',
          fields: DECLARATIONS.customFieldSets[0].fields.map((field) =>
            field.key === 'unread_count' ? { ...field, kind: kind as never } : field,
          ),
        },
      ],
      extensions: DECLARATIONS.extensions,
    })

  it('changes when a field is retyped', () => {
    // The measured defect: a field's *kind* is not part of its *id*, so a version
    // built from ids alone was blind to a retype — and a Function whose `>` filter
    // had just become illegal still reported itself fresh.
    const before = withUnreadKind('integer')
    const after = withUnreadKind('text')
    expect(modelVersionOf(before)).not.toBe(modelVersionOf(after))
  })

  it('changes when a field is added or removed', () => {
    const fewerFields = buildModelDescriptor({
      customEntities: DECLARATIONS.customEntities,
      customFieldSets: [
        {
          entity: 'communication_channels:external_conversation',
          source: 'communication_channels',
          fields: DECLARATIONS.customFieldSets[0].fields.filter((field) => field.key !== 'is_open'),
        },
      ],
      extensions: DECLARATIONS.extensions,
    })
    expect(modelVersionOf(fewerFields)).not.toBe(modelVersionOf(MODEL))
    expect(modelVersionOf(withUnreadKind('text'))).not.toBe(modelVersionOf(MODEL))
  })

  it('does not change when a declaration is merely reordered', () => {
    const reordered = buildModelDescriptor({
      customEntities: DECLARATIONS.customEntities,
      customFieldSets: [
        {
          entity: 'communication_channels:external_conversation',
          source: 'communication_channels',
          fields: [...DECLARATIONS.customFieldSets[0].fields].reverse(),
        },
      ],
      extensions: [...DECLARATIONS.extensions].reverse(),
    })
    expect(modelVersionOf(reordered)).toBe(modelVersionOf(buildModelDescriptor(DECLARATIONS)))
  })

  it('is stable across calls', () => {
    expect(modelVersionOf(MODEL)).toBe(modelVersionOf(MODEL))
    expect(modelVersionOf(MODEL)).toMatch(/^[0-9a-f]{8}$/)
  })
})

/* ---- the operator vocabulary --------------------------------------- */

describe('isKnownOperator', () => {
  it('accepts both the engine names and the symbols', () => {
    expect(isKnownOperator('eq')).toBe(true)
    expect(isKnownOperator('=')).toBe(true)
    expect(isKnownOperator('contains')).toBe(true)
    expect(isKnownOperator('~=' as never)).toBe(false)
  })
})
