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
 * **Second agent: `business_ir.query_runner` (`P2-4`, 2026-10-13).** The owner's
 * design input: *"A system agent converting propmt to business ir may have
 * specific tools it need all the time."* This is that agent — a module-declared
 * built-in with a FIXED menu of exactly one tool, `business_ir.run_query` (the
 * pack that makes the whole prompt → IR → validate → run chain callable). It is
 * the **runner** half of the pair: the author (above) converts a prompt into a
 * typed IR with no tools at all; this agent is admitted with the one tool it
 * needs and hands it the question. Its fixed menu is recorded on the run at
 * admission and enforced by the door's two gates (`lib/ai-tool-call-gate.ts`),
 * so a model can call exactly that tool and nothing else — the menu is the
 * agent's, never the model's. Requirement: `library/development/
 * PLAN-HERMES-PHASE2-one-tenant-one-tool.md` §2.10.
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
import { BUSINESS_IR_RUN_QUERY_TOOL_NAME } from './ai-tools/business-ir-pack'

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

/**
 * The runner agent's id. Imported by the door's admission rail and by the
 * callers that start a run under it — the same anti-drift discipline
 * `BUSINESS_IR_AGENT_ID` follows.
 */
export const BUSINESS_IR_RUNNER_AGENT_ID = 'business_ir.query_runner' as const

/**
 * The runner's instruction. The author above is a field list because its output
 * is an object; this one is short because its job is a single decision: **call
 * the one tool, with the question, and report what it says.** Everything that
 * could tempt a model to answer from its own knowledge, or to dress the
 * question up, is named and refused.
 */
const RUNNER_SYSTEM_PROMPT = [
  'ROLE',
  'You answer plain-language questions about the tenant\'s own business data.',
  'You do it in exactly one way: call the tool "business_ir.run_query" with the',
  'user\'s question as the prompt. The tool turns the question into a typed',
  'business request, validates it against the business model, runs it, and',
  'returns the rows. That result is the answer.',
  '',
  'RULES',
  '- Always call the tool for any question about business data — customer',
  '  counts, amounts, trends, lists, comparisons. There is no other way to',
  '  answer, and your own knowledge is never a source for these answers.',
  '- Pass the question as written. Do not rephrase it into something narrower,',
  '  and do not add scope, tenant, organization, id or date fields of your own —',
  '  the platform decides what the caller may see.',
  '- The tool answers with a value, not an error: when it refuses (the person',
  '  is not bound, the request does not compile, the engine fails), report that',
  '  refusal plainly and stop. Never retry with a changed question, and never',
  '  answer the question yourself instead.',
  '- Present the rows the tool returned. Do not summarize away numbers, and do',
  '  not add commentary the result does not support.',
  '- You have this one tool and no others. A request that needs something else',
  '  is outside what you can do — say so.',
].join('\n')

const runnerAgent: AiAgentDefinition = {
  id: BUSINESS_IR_RUNNER_AGENT_ID,
  moduleId: MODULE_ID,
  label: 'Business IR Query Runner',
  description:
    'Answers a plain-language business question by running it through the ' +
    'platform\'s own Business-IR chain — the question becomes a typed, validated ' +
    'request and runs on the platform read path, scoped to the caller\'s ' +
    'tenant/organization. Has exactly one tool, and cannot reach the data any ' +
    'other way. Read-only.',
  systemPrompt: RUNNER_SYSTEM_PROMPT,
  // The fixed menu — "the specific tools it needs all the time" (the owner's
  // design input, 2026-10-13). One tool, always. Recorded on the run at
  // admission and enforced by the door's two gates, so the model can call this
  // tool and nothing else. `CC-78` is the task-shaped menu for the user-facing
  // side; a built-in's menu does not vary by task.
  allowedTools: [BUSINESS_IR_RUN_QUERY_TOOL_NAME],
  // Read-only in every sense: the tool is `isMutation: false` and tagged
  // `read`, and the agent's own policy agrees. Scope comes from the
  // authenticated request the tool context carries, never from the prompt.
  readOnly: true,
  mutationPolicy: 'read-only',
  // The pack's own requirement (`requiredFeatures` on the tool definition) —
  // declaring it here too keeps the agent-level gate and the tool-level gate
  // saying the same thing, so a run is refused at admission rather than at the
  // call if the acting person lacks the feature.
  requiredFeatures: ['ai_assistant.view'],
  keywords: ['query', 'report', 'business data', 'run', 'numbers'],
  domain: 'ai_assistant',
  dataCapabilities: {
    operations: ['read'],
  },
}

export const aiAgents: AiAgentDefinition[] = [agent, runnerAgent]

export default aiAgents
