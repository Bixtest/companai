/**
 * The G-03 fixture.
 *
 * The declaration set is the **real** one the platform carries today: the four
 * relationships from `communication_channels/data/extensions.ts` — the only
 * module of 34 that declares any (measured in G-01) — plus the fields that module
 * declares on `external_conversation`. G-02's compiler suite uses the same
 * fixture, and reusing it is deliberate: a Function is tested against the model
 * the platform actually has, not against a convenient invention.
 *
 * `makeFunction` builds a valid, published Function so each suite can vary exactly
 * the one thing it is testing.
 */

import { buildModelDescriptor } from '../../kernel/model'
import type { KernelDeclarationInput, ModelDescriptor } from '../../kernel/model'
import { createBindingsFromDeclarations } from '../../business-ir/bindings'
import type { PhysicalBindings } from '../../business-ir/bindings'
import { modelVersionOf } from '../../business-ir/compile'
import type { BusinessQueryIR, CompileContext } from '../../business-ir/types'
import type { UserFunction } from '../types'

export const REAL_EXTENSIONS: KernelDeclarationInput['extensions'] = [
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

export const DECLARATIONS: KernelDeclarationInput = {
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

export const MODEL: ModelDescriptor = buildModelDescriptor(DECLARATIONS)
export const BINDINGS: PhysicalBindings = createBindingsFromDeclarations(DECLARATIONS, MODEL)
export const CTX: CompileContext = { tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1' }

/** The model's own version, so a fixture Function is fresh by construction. */
export const MODEL_VERSION = modelVersionOf(MODEL)

/** The same entity, with one field added. The IR still resolves. */
const EXTRA_FIELD: KernelDeclarationInput['customFieldSets'][number]['fields'][number] = {
  key: 'priority',
  kind: 'integer',
  label: 'Priority',
}

function withFields(
  fields: KernelDeclarationInput['customFieldSets'][number]['fields'],
): KernelDeclarationInput {
  return {
    customEntities: DECLARATIONS.customEntities,
    customFieldSets: [
      {
        entity: 'communication_channels:external_conversation',
        source: 'communication_channels',
        fields,
      },
    ],
    extensions: DECLARATIONS.extensions,
  }
}

const BASE_FIELDS = DECLARATIONS.customFieldSets[0].fields

/** The model after an unrelated addition — a Function keeps working against it. */
export const MODEL_PLUS = buildModelDescriptor(withFields([...BASE_FIELDS, EXTRA_FIELD]))

/** The model after `unread_count` becomes `unread_messages` — a key rename, so a new id. */
export const MODEL_RENAMED = buildModelDescriptor(
  withFields(
    BASE_FIELDS.map((field) =>
      field.key === 'unread_count' ? { ...field, key: 'unread_messages' } : field,
    ),
  ),
)

/** The platform entity id the fixture Function's read goes to. */
export const PLATFORM_ENTITY_ID = 'communication_channels:external_conversation'

/**
 * The model with `unread_count`'s **kind** changed.
 *
 * A retype keeps the field's id and changes only its type — which is exactly why a
 * model version built from ids alone could not see it.
 */
export function withFieldKind(kind: string): ModelDescriptor {
  return buildModelDescriptor(
    withFields(
      BASE_FIELDS.map((field) =>
        field.key === 'unread_count' ? { ...field, kind: kind as never } : field,
      ),
    ),
  )
}

/**
 * The exact `QueryOptions` the fixture Function should produce when run with
 * `min_unread: 3`. Kept here rather than in one suite so two suites asserting the
 * same shape cannot disagree about it.
 */
export const EXPECTED_QUERY_OPTIONS = {
  fields: ['external_conversation.subject', 'external_conversation.unread_count'],
  filters: [
    { field: 'external_conversation.is_open', op: 'eq', value: true },
    { field: 'external_conversation.unread_count', op: 'gt', value: 3 },
  ],
  sort: [{ field: 'external_conversation.last_message_at', dir: 'desc' }],
  page: { pageSize: 25 },
  tenantId: 'tenant-1',
  organizationId: 'org-1',
}

/**
 * A read that a person would actually want: open conversations with more than a
 * given number of unread messages, newest first.
 *
 * It carries **one placeholder** (`min_unread`) on purpose, so every suite that
 * needs a parameter has a real one rather than an invented one.
 */
export const UNREAD_IR: BusinessQueryIR = {
  operation: 'list',
  entity: 'external_conversation',
  dimensions: ['subject', 'unread_count'],
  filters: [
    { field: 'is_open', operator: 'eq', value: true },
    { field: 'unread_count', operator: 'gt', value: { $param: 'min_unread' } },
  ],
  sort: [{ field: 'last_message_at', direction: 'desc' }],
  limit: 25,
}

/**
 * A valid Function, in the state that runs.
 *
 * `status: 'active'` rather than `'published'` so the fixture is past the gate
 * without the suite having to walk the lifecycle. Suites that test the gate set
 * their own status.
 */
export function makeFunction(overrides: Partial<UserFunction> = {}): UserFunction {
  const base: UserFunction = {
    id: 'unread_conversations',
    tenantId: 'tenant-1',
    name: 'Unread conversations',
    description: 'Open conversations with more than a given number of unread messages.',
    operationType: 'query',
    businessIr: UNREAD_IR,
    parameterSchema: [
      { name: 'min_unread', kind: 'integer', required: true, label: 'Minimum unread' },
    ],
    references: {
      entities: ['external_conversation'],
      fields: [
        'external_conversation.subject',
        'external_conversation.unread_count',
        'external_conversation.is_open',
        'external_conversation.last_message_at',
      ],
      metrics: [],
      commands: [],
      workflows: [],
    },
    requiredPermissions: [],
    businessModelVersion: MODEL_VERSION,
    dependencyVersions: { 'communication_channels:external_conversation': '1.0.0' },
    compilerVersion: '1',
    // An `active` Function has been through verification, so it carries the record
    // of what verification could and could not establish. A fixture without it
    // would be a Function that could not exist.
    verification: { notChecked: ['authorization_valid'] },
    version: 1,
    status: 'active',
  }
  return { ...base, ...overrides }
}
