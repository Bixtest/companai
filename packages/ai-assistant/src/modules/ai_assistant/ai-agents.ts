/**
 * Module-root AI agent contributions for the AI-assistant module. (G-17)
 *
 * **One agent: `business_ir.query_author`.** It is the *first* agent in the
 * platform that does not answer in prose and does not call a tool. It answers by
 * emitting a **Business IR** — the typed business request the vision's whole
 * decisive loop is built on (doc 03 §49–§53: *novel request → AI → Business IR →
 * validation → user verifies → Save as Function → zero-AI execution*).
 *
 * **Why an agent and not a chat assistant.** The vision forbids the model writing
 * arbitrary SQL or JavaScript against the business data (doc 03 Part XXXIV: *"The
 * LLM must generate Business IR/commands, not arbitrary business SQL"*). So this
 * agent is `executionMode: 'object'` with **no tools at all**: its only output
 * channel is the IR schema, and the platform's compiler — not the model — decides
 * whether the resulting request means anything.
 *
 * **How it stays safe.**
 *   - `executionMode: 'object'` + `output: { schema: businessQueryIrSchema }` —
 *     the model decodes against the IR's own shape. `.strict()` objects mean an
 *     unknown key (a guessed field, or an attempted `tenantId`) is a **hard
 *     rejection**, not a value trusted now and stripped later.
 *   - `readOnly: true`, `mutationPolicy: 'read-only'`, `allowedTools: []` — it
 *     cannot write, and it cannot reach any tool. Scope never comes from the IR;
 *     it comes from the authenticated request, which is why the IR has no scope
 *     field and this agent cannot supply one.
 *   - The agent id is exported from `business-ir-author.ts` as
 *     `BUSINESS_IR_AGENT_ID`, and this file imports that constant rather than
 *     re-typing the string — so the caller and the registry cannot drift apart.
 *
 * **Measured 2026-10-06.** The system prompt below was validated against the real
 * local model (Qwen2.5-7B-Instruct-Q4_K_M), which emitted an IR the schema
 * accepted for **6 of 6** varied requests. The same instructions, given loosely,
 * produced nonsense that the schema **rejected** — see `workspace/COOKBOOK.md`,
 * *Sprint G-17, Step 4*.
 *
 * Source: Doc 03 §45–§53; `library/development/ARCHITECTURE-request-outcomes.md`.
 */

import type { AiAgentDefinition } from './lib/ai-agent-definition'
import {
  BUSINESS_QUERY_IR_SCHEMA_NAME,
  businessQueryIrSchema,
} from '@open-mercato/shared/lib/business-ir/schema'
import { BUSINESS_IR_AGENT_ID } from './lib/business-ir-author'

const MODULE_ID = 'ai_assistant'

/**
 * The instruction, kept as one readable block.
 *
 * It is written as a *field list* rather than a prose description on purpose:
 * the measured run showed the model follows an explicit enumeration of the
 * allowed fields and closed vocabularies, and wanders (inventing nested objects)
 * when told merely to "make a query". The prompt and the schema say the same
 * thing twice — the prompt to make the model *aim* right, the schema to make a
 * miss impossible to accept.
 */
const SYSTEM_PROMPT = [
  'ROLE',
  'You turn a business request, written in plain language, into a BusinessQueryIR —',
  'a typed business query object. You do not answer the question and you do not',
  'retrieve data. You produce the query that a deterministic compiler will run.',
  '',
  'OUTPUT',
  'Reply with a single JSON object and nothing else. Its fields:',
  '- operation: "list" (rows), "count" (a number), or "aggregate" (a summary).',
  '- entity: the business entity being asked about, as a plain name.',
  '- grain: optional string, the level of detail of a row.',
  '- dimensions: optional array of field names to group or break out by.',
  '- measures: optional array of { aggregate, field } or { metric };',
  '  aggregate is one of "sum", "count", "avg", "min", "max".',
  '- filters: optional array of { field, operator, value };',
  '  operator is one of eq,ne,gt,gte,lt,lte,in,nin,like,ilike,exists,',
  '  =,!=,>,>=,<,<=,contains.',
  '- relationships: optional array of relationship names to traverse.',
  '- timeRange: optional { from?, to?, field? }; from and to are date strings or',
  '  a placeholder { "$param": "name" } for a value supplied when the query runs.',
  '- timeBasis, currencyBasis: optional strings naming which time or currency to use.',
  '- sort: optional array of { field?, metric?, direction? }; direction is "asc" or "desc".',
  '- limit: optional number, or a placeholder { "$param": "name" }.',
  '- offset: optional number.',
  '',
  'RULES',
  '- Use ONLY the fields listed above. Any other key is rejected — do not add',
  '  scope, tenant, organization, id, or convenience fields of your own.',
  '- Never invent a field name that was not implied by the request.',
  '- Choose the operation that answers the request: "how many" is count;',
  '  "total", "average", "per month", "by country" is aggregate; a list of records is list.',
  '- Use "contains" or "like" for substring matches on text.',
  '- If the request asks about more than one thing, pick the primary question and',
  '  express it; do not stack unrelated asks into one query.',
  '- Do not explain. Do not wrap the JSON in prose. Emit the object.',
].join('\n')

const agent: AiAgentDefinition = {
  id: BUSINESS_IR_AGENT_ID,
  moduleId: MODULE_ID,
  label: 'Business IR Query Author',
  description:
    'Turns a plain-language business request into a BusinessQueryIR — a typed, ' +
    'validated query object. Emits no prose and calls no tools; the result is ' +
    'compiled by the platform, not executed by the model. Read-only.',
  systemPrompt: SYSTEM_PROMPT,
  // No tools. The IR is the only output channel — the vision forbids the model
  // reaching the data directly (doc 03 Part XXXIV).
  allowedTools: [],
  executionMode: 'object',
  output: {
    schemaName: BUSINESS_QUERY_IR_SCHEMA_NAME,
    schema: businessQueryIrSchema,
    mode: 'generate',
  },
  // Read-only in every sense: it produces a query, never a write, and cannot
  // call anything that could change data.
  readOnly: true,
  mutationPolicy: 'read-only',
  // Any authenticated user may author a query; the compiler and the caller's
  // own scope decide what it can actually reach. No extra feature gate is
  // imposed here, because authoring an IR grants nothing by itself.
  requiredFeatures: [],
  keywords: ['query', 'report', 'business ir', 'list', 'count', 'aggregate'],
  domain: 'ai_assistant',
  dataCapabilities: {
    operations: ['read'],
  },
}

export const aiAgents: AiAgentDefinition[] = [agent]

export default aiAgents
