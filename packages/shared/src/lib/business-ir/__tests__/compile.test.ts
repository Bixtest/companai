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

/* ---- gaps are reported, not hidden --------------------------------- */

describe('compileQuery — a valid IR the platform cannot serve compiles with a gap', () => {
  it('an aggregate IR compiles logically and reports the row-oriented gap', () => {
    const result = mustCompile({
      operation: 'aggregate',
      entity: 'external_conversation',
      dimensions: ['subject'],
      measures: [{ aggregate: 'sum', field: 'unread_count' }],
    })
    expect(result.plan.logical.measures).toEqual([
      { aggregate: 'sum', field: 'external_conversation.unread_count' },
    ])
    expect(result.plan.provenance.gaps).toContain('plan_physical')
    expect(result.diagnostics.some((d) => d.code === 'ROW_ORIENTED_TARGET')).toBe(true)
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

/* ---- the operator vocabulary --------------------------------------- */

describe('isKnownOperator', () => {
  it('accepts both the engine names and the symbols', () => {
    expect(isKnownOperator('eq')).toBe(true)
    expect(isKnownOperator('=')).toBe(true)
    expect(isKnownOperator('contains')).toBe(true)
    expect(isKnownOperator('~=' as never)).toBe(false)
  })
})
