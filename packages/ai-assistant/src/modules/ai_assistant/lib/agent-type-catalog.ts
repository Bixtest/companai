import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import type {
  AiAgentAcceptedMediaType,
  AiAgentDataOperation,
  AiAgentDefinition,
  AiAgentLoopStopCondition,
  AiAgentMutationPolicy,
  AiAgentSuggestion,
} from './ai-agent-definition'
import { getAgent, listAgents, loadAgentRegistry } from './agent-registry'
import { AiAgentTypeRepository } from '../data/repositories/AiAgentTypeRepository'
import type { AiAgentType } from '../data/entities'

/**
 * `CC-126` — **the tenant-visible type catalogue**: the single home for the
 * sentence *"the catalogue in tenant T"*.
 *
 * The catalogue has two layers and they stay two homes. The platform ships
 * types as **code** (`AiAgentDefinition`, held by the generated registry);
 * a tenant authors one as a **row** (`AiAgentType`). This module is the only
 * place the two are joined:
 *
 * - {@link resolveAgentDefinition} — what a run resolves for an id, with
 *   **code-first precedence**: the platform's definition wins any collision,
 *   so a tenant-authored definition can never run under a platform-claimed
 *   key. The registry stays global and unscoped; the tenant boundary is a
 *   **required parameter** of every tenant-layer read (`CC-128`'s lesson — a
 *   read that filters no tenant is a defect — and its converse: a scope
 *   demanding fields the read does not use is speculative surface, so the
 *   scope is exactly `{ tenantId }`). {@link resolveAgentCatalogEntry} is the
 *   same decision with the **layer** reported, for the one caller that needs
 *   provenance and must not re-derive it.
 * - {@link materializeAgentTypeDefinition} — the `AiAgentDefinition` a row
 *   denotes: the JSON-safe subset, narrowed field by field, every default on
 *   the safe side.
 * - {@link listAgentCatalog} — both layers merged for the picker, each entry
 *   tagged `layer: 'platform' | 'tenant'`, a tenant row whose key the
 *   platform has since claimed marked **shadowed rather than silently
 *   inert**.
 *
 * **The write-time shape lives here too** ({@link validateAgentTypeBundle}):
 * one vocabulary owned by one module, strict so a field the runtime cannot
 * honour (`executionMode`, `output`, a `loop.stopWhen` custom condition) is
 * **refused at the boundary** rather than silently dropped — silently
 * dropping it would produce a type that behaves differently from what was
 * written.
 */

/**
 * The `moduleId` a materialized tenant type carries. A resolver-owned
 * constant — **the wire format has no `moduleId` field**, so a tenant cannot
 * name a module's env-override namespace (`model-factory.ts:604,613`,
 * `agent-runtime.ts:485`).
 *
 * `'ai_assistant'` on purpose: a tenant type is a first-class member of the
 * module that owns the mechanism, so it inherits that module's env overrides
 * and usage attribution exactly like its code-shipped agents. A distinct
 * namespace would diverge tenant types from the module's env policy for no
 * gain.
 */
export const AGENT_TYPE_MODULE_ID = 'ai_assistant'

export interface AgentTypeScope {
  tenantId: string
}

export interface AgentCatalogEntry {
  id: string
  layer: 'platform' | 'tenant'
  definition: AiAgentDefinition
  /** Bumped on every edit; pinned by an instance (`CC-122`). */
  version?: number
  /** Tenant rows only; the manage surface also lists the tombstones. */
  status?: 'active' | 'retired'
  /**
   * Tenant rows only: the platform has since claimed this key, so the row is
   * inert under code-first precedence. Shown, never hidden — a silently
   * shadowed type is a bug report nobody can write.
   */
  shadowedByCode?: boolean
}

const MUTATION_POLICIES = ['read-only', 'confirm-required', 'destructive-confirm-required'] as const
const MEDIA_TYPES = ['image', 'pdf', 'file'] as const
const DATA_OPERATIONS = ['read', 'search', 'aggregate'] as const

/**
 * The write-time shape of a tenant bundle: the JSON-safe subset of
 * `AiAgentDefinition`, strict. The three fields that cannot be JSON —
 * `resolvePageContext`, `output.schema`, `loop.prepareStep` — and the two
 * structural ones (`executionMode`, `executionEngine`, object mode) are
 * refused here rather than dropped: a tenant type is structurally a chat
 * agent with a concrete tool list, and the boundary must say so out loud.
 */
export const agentTypeBundleSchema = z
  .object({
    label: z.string().min(1).max(200),
    description: z.string().max(2000),
    systemPrompt: z.string().max(20_000),
    allowedTools: z.array(z.string().min(1)).min(1),
    suggestions: z
      .array(z.object({ label: z.string().min(1).max(200), prompt: z.string().max(2000) }).strict())
      .optional(),
    defaultProvider: z.string().min(1).max(100).optional(),
    defaultModel: z.string().min(1).max(200).optional(),
    defaultBaseUrl: z.string().url().max(500).optional(),
    allowRuntimeOverride: z.boolean().optional(),
    acceptedMediaTypes: z.array(z.enum(MEDIA_TYPES)).optional(),
    requiredFeatures: z.array(z.string().min(1)).optional(),
    taskPlan: z.object({ enabled: z.boolean() }).strict().optional(),
    uiParts: z.array(z.string().min(1)).optional(),
    readOnly: z.boolean().optional(),
    mutationPolicy: z.enum(MUTATION_POLICIES).optional(),
    maxSteps: z.number().int().positive().max(1000).optional(),
    loop: z
      .object({
        maxSteps: z.number().int().positive().max(1000).optional(),
        stopWhen: z
          .array(
            z.union([
              z.object({ kind: z.literal('stepCount'), count: z.number().int().positive() }).strict(),
              z.object({ kind: z.literal('hasToolCall'), toolName: z.string().min(1) }).strict(),
            ]),
          )
          .optional(),
      })
      .strict()
      .optional(),
    keywords: z.array(z.string().min(1)).optional(),
    domain: z.string().min(1).max(100).optional(),
    dataCapabilities: z
      .object({
        entities: z.array(z.string().min(1)).optional(),
        operations: z.array(z.enum(DATA_OPERATIONS)).optional(),
        searchableFields: z.array(z.string().min(1)).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export class AgentTypeBundleError extends Error {
  constructor(readonly issues: string[]) {
    super(`Agent type bundle is not a valid definition: ${issues.join('; ')}`)
    this.name = 'AgentTypeBundleError'
  }
}

/**
 * The write-time gate. Returns the stored bundle — the validated shape, and
 * nothing the schema refused.
 */
export function validateAgentTypeBundle(input: unknown): Record<string, unknown> {
  const parsed = agentTypeBundleSchema.safeParse(input)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    throw new AgentTypeBundleError(issues)
  }
  return parsed.data as Record<string, unknown>
}

/** The code-layer lookup, with the load-order discipline in one place. */
export async function findCodeAgentDefinition(agentId: string): Promise<AiAgentDefinition | null> {
  if (!agentId) return null
  await loadAgentRegistry()
  return getAgent(agentId) ?? null
}

/**
 * The definition a run must use for `agentId` inside one tenant — the shape
 * the runtime gate wants. Delegates to {@link resolveAgentCatalogEntry}, which
 * holds the precedence and the load-order discipline.
 */
export async function resolveAgentDefinition(input: {
  agentId: string
  scope: AgentTypeScope
  em?: EntityManager | null
}): Promise<AiAgentDefinition | null> {
  const resolved = await resolveAgentCatalogEntry(input)
  return resolved ? resolved.definition : null
}

/**
 * Resolves with the **layer** it came from — the one caller that needs
 * provenance (`meta.describe_agent`) asks here rather than re-deriving it.
 * Provenance is NOT derivable from the definition: a tenant type carries
 * `AGENT_TYPE_MODULE_ID`, which is also a real module id.
 *
 * **Code-first, always decided against a loaded registry.** Deciding "no
 * code agent" while the registry is empty would let a tenant row win a key
 * the platform claims, which is the one direction the design must never
 * fail. So the registry is loaded here first — idempotent, and already the
 * runtime's first step (`api/ai/chat/route.ts:548`).
 *
 * `em` is required **only on the tenant path**: when the code layer holds
 * the id, no DB handle is ever touched. When the code layer misses and no
 * `em` is supplied, the tenant layer is unreachable and the result is
 * `null` — the caller's gate refuses an unknown id, exactly as it does for
 * the code layer today (`agent_unknown`, and the empty tool set
 * `computeBoundRunScope` yields for a missing agent). No tenant scope, and
 * no tenant row for an unclaimed key, resolve the same way.
 *
 * The precedence lives here and nowhere else: this is the same decision the
 * runtime gate makes, reported.
 */
export async function resolveAgentCatalogEntry(input: {
  agentId: string
  scope: AgentTypeScope
  em?: EntityManager | null
}): Promise<{ definition: AiAgentDefinition; layer: 'platform' | 'tenant' } | null> {
  if (!input.agentId || !input.scope?.tenantId) return null
  const codeAgent = await findCodeAgentDefinition(input.agentId)
  if (codeAgent) return { definition: codeAgent, layer: 'platform' }
  if (!input.em) return null
  const repo = new AiAgentTypeRepository(input.em)
  const row = await repo.findActiveByKey(input.agentId, input.scope)
  if (!row) return null
  return { definition: materializeAgentTypeDefinition(row), layer: 'tenant' }
}

/**
 * The definition a row denotes, narrowed field by field.
 *
 * Every optional field either narrows to its declared type or is left
 * unset — there is no "guess the tenant meant" branch, because a hand-edited
 * or legacy row must degrade to the safe default (empty tool list, no
 * mutation, no runtime overrides), never to a wider behaviour than it
 * declares. The write-time schema is the loud gate; this is the silent,
 * fail-closed one underneath it.
 */
export function materializeAgentTypeDefinition(row: AiAgentType): AiAgentDefinition {
  const b = asObject(row.bundle)
  const definition: AiAgentDefinition = {
    id: row.key,
    moduleId: AGENT_TYPE_MODULE_ID,
    label: str(b.label),
    description: str(b.description),
    systemPrompt: str(b.systemPrompt),
    allowedTools: strArray(b.allowedTools),
  }

  const suggestions = narrowSuggestions(b.suggestions)
  if (suggestions) definition.suggestions = suggestions

  const provider = str(b.defaultProvider)
  if (provider) definition.defaultProvider = provider
  const model = str(b.defaultModel)
  if (model) definition.defaultModel = model
  const baseUrl = str(b.defaultBaseUrl)
  if (baseUrl) definition.defaultBaseUrl = baseUrl

  const allowRuntimeOverride = bool(b.allowRuntimeOverride)
  if (allowRuntimeOverride !== undefined) definition.allowRuntimeOverride = allowRuntimeOverride

  const mediaTypes = narrowVocabulary(b.acceptedMediaTypes, MEDIA_TYPES)
  if (mediaTypes) definition.acceptedMediaTypes = mediaTypes as AiAgentAcceptedMediaType[]

  const requiredFeatures = strArray(b.requiredFeatures)
  if (requiredFeatures.length > 0) definition.requiredFeatures = requiredFeatures

  const taskPlanEnabled = bool(asObject(b.taskPlan).enabled)
  if (taskPlanEnabled !== undefined) definition.taskPlan = { enabled: taskPlanEnabled }

  const uiParts = strArray(b.uiParts)
  if (uiParts.length > 0) definition.uiParts = uiParts

  const readOnly = bool(b.readOnly)
  if (readOnly !== undefined) definition.readOnly = readOnly

  const mutationPolicy = oneOf(b.mutationPolicy, MUTATION_POLICIES)
  if (mutationPolicy) definition.mutationPolicy = mutationPolicy as AiAgentMutationPolicy

  const maxSteps = posInt(b.maxSteps)
  if (maxSteps !== undefined) definition.maxSteps = maxSteps

  const loop = narrowLoop(b.loop)
  if (loop) definition.loop = loop

  const keywords = strArray(b.keywords)
  if (keywords.length > 0) definition.keywords = keywords

  const domain = str(b.domain)
  if (domain) definition.domain = domain

  const dataCapabilities = narrowDataCapabilities(b.dataCapabilities)
  if (dataCapabilities) definition.dataCapabilities = dataCapabilities

  return definition
}

/**
 * Both layers for the picker, tagged. Live tenant rows only — a retired
 * type resolves to nothing, so listing it would be the `CC-101` shape; the
 * manage surface reads the tombstones through the repository instead.
 *
 * `em` optional for the same reason {@link resolveAgentDefinition} takes it
 * optional: a caller with no tenant scope or no DB handle gets the platform
 * layer alone rather than an error — the tenant layer is unreachable, not
 * absent-by-policy.
 */
export async function listAgentCatalog(
  scope: AgentTypeScope,
  em?: EntityManager | null,
): Promise<AgentCatalogEntry[]> {
  await loadAgentRegistry()
  const entries: AgentCatalogEntry[] = listAgents().map((agent) => ({
    id: agent.id,
    layer: 'platform' as const,
    definition: agent,
  }))
  if (!scope?.tenantId || !em) return entries
  const repo = new AiAgentTypeRepository(em)
  const rows = await repo.listActive(scope)
  for (const row of rows) {
    entries.push({
      id: row.key,
      layer: 'tenant',
      definition: materializeAgentTypeDefinition(row),
      version: row.version,
      status: row.status === 'retired' ? 'retired' : 'active',
      shadowedByCode: getAgent(row.key) != null,
    })
  }
  return entries
}

// ── narrowing helpers ────────────────────────────────────────────────────────
// Each returns the SAFE side when the shape does not hold: an empty string,
// an empty list, or `undefined` (leave the field unset). None of them throws
// — a malformed row must not crash a run, it must narrow.

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function posInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

function narrowVocabulary<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const kept = value.filter((item): item is T => typeof item === 'string' && (allowed as readonly string[]).includes(item))
  return kept.length > 0 ? kept : undefined
}

function narrowSuggestions(value: unknown): AiAgentSuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined
  const kept = value
    .map((item) => asObject(item))
    .filter((item) => typeof item.label === 'string' && typeof item.prompt === 'string')
    .map((item) => ({ label: item.label as string, prompt: item.prompt as string }))
  return kept.length > 0 ? kept : undefined
}

function narrowLoop(value: unknown): AiAgentDefinition['loop'] {
  const loop = asObject(value)
  const maxSteps = posInt(loop.maxSteps)
  const stopWhen = narrowStopConditions(loop.stopWhen)
  if (maxSteps === undefined && stopWhen.length === 0) return undefined
  return { maxSteps, stopWhen: stopWhen.length > 0 ? stopWhen : undefined }
}

/**
 * Only the two JSON-representable conditions survive: a `custom` condition
 * carries a function (`StopCondition<ToolSet>`) and can never be in a row,
 * so it is dropped here and refused at the write boundary.
 */
function narrowStopConditions(value: unknown): AiAgentLoopStopCondition[] {
  if (!Array.isArray(value)) return []
  const kept: AiAgentLoopStopCondition[] = []
  for (const item of value) {
    const condition = asObject(item)
    if (condition.kind === 'stepCount' && typeof condition.count === 'number') {
      kept.push({ kind: 'stepCount', count: condition.count })
    } else if (condition.kind === 'hasToolCall' && typeof condition.toolName === 'string') {
      kept.push({ kind: 'hasToolCall', toolName: condition.toolName })
    }
  }
  return kept
}

function narrowDataCapabilities(value: unknown): AiAgentDefinition['dataCapabilities'] {
  const caps = asObject(value)
  const entities = strArray(caps.entities)
  const operations = narrowVocabulary(caps.operations, DATA_OPERATIONS)
  const searchableFields = strArray(caps.searchableFields)
  if (entities.length === 0 && !operations && searchableFields.length === 0) return undefined
  return {
    entities: entities.length > 0 ? entities : undefined,
    operations: operations as AiAgentDataOperation[] | undefined,
    searchableFields: searchableFields.length > 0 ? searchableFields : undefined,
  }
}

export default resolveAgentDefinition
