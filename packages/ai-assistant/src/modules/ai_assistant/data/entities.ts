import { OptionalProps } from '@mikro-orm/core'
import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from '@mikro-orm/decorators/legacy'
import type {
  AiPendingActionExecutionResult,
  AiPendingActionFailedRecord,
  AiPendingActionFieldDiff,
  AiPendingActionQueueMode,
  AiPendingActionRecordDiff,
  AiPendingActionStatus,
} from '../lib/pending-action-types'

/**
 * Versioned additive prompt-override for a registered AI agent (Step 5.3).
 *
 * Each write creates a new row with `version = latest + 1`. Rows are never
 * updated in place — history is preserved so operators can roll back by
 * reading an earlier `version`. Column set is tenant/org-scoped per the
 * standard Companai RBAC contract.
 *
 * `sections` holds additive text keyed by prompt section id. The runtime
 * composes the final `systemPrompt` via `composeSystemPromptWithOverride`
 * (see `lib/prompt-override-merge.ts`), which NEVER replaces a built-in
 * section — overrides are append-only by contract.
 */
@Entity({ tableName: 'ai_agent_prompt_overrides' })
@Index({
  name: 'ai_agent_prompt_overrides_tenant_org_agent_version_uq',
  expression:
    'create unique index "ai_agent_prompt_overrides_tenant_org_agent_version_uq" on "ai_agent_prompt_overrides" ("tenant_id", "organization_id", "agent_id", "version") where "organization_id" is not null',
})
@Index({
  name: 'ai_agent_prompt_overrides_tenant_agent_version_null_org_uq',
  expression:
    'create unique index "ai_agent_prompt_overrides_tenant_agent_version_null_org_uq" on "ai_agent_prompt_overrides" ("tenant_id", "agent_id", "version") where "organization_id" is null',
})
@Index({
  name: 'ai_agent_prompt_overrides_tenant_agent_idx',
  properties: ['tenantId', 'agentId'],
})
@Index({
  name: 'ai_agent_prompt_overrides_tenant_org_agent_version_idx',
  expression:
    'create index "ai_agent_prompt_overrides_tenant_org_agent_version_idx" on "ai_agent_prompt_overrides" ("tenant_id", "organization_id", "agent_id", "version" desc)',
})
export class AiAgentPromptOverride {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | 'organizationId' | 'createdByUserId' | 'notes'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ name: 'version', type: 'int' })
  version!: number

  @Property({ name: 'sections', type: 'jsonb' })
  sections!: Record<string, string>

  @Property({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Persistent mutation-approval gate row backing the Phase 3 WS-C contract
 * (spec §8 `AiPendingAction` + §9 confirm/cancel flow, Step 5.5).
 *
 * One row is created by `prepareMutation` (Step 5.6) whenever the runtime
 * intercepts an `isMutation: true` tool call from a non-read-only agent.
 * The row stores the normalized tool input, a precomputed `fieldDiff` (or
 * per-record batch diff in `records[]`), the target record version, an
 * `idempotencyKey` that dedupes double-submits within the TTL, and a
 * `status` that walks the state machine defined in
 * {@link AI_PENDING_ACTION_ALLOWED_TRANSITIONS}.
 *
 * The cleanup worker (Step 5.12) sweeps `status='pending' AND expiresAt < now`
 * rows and transitions them to `expired`. The confirm route (Step 5.8)
 * walks `pending → confirmed → executing → (failed | terminal success)`.
 * Reads always flow through `findOneWithDecryption` /
 * `findWithDecryption`, even though no column is GDPR-flagged today, so
 * future encrypted columns (e.g. `normalizedInput`) are handled.
 */
@Entity({ tableName: 'ai_pending_actions' })
@Index({
  name: 'ai_pending_actions_tenant_org_idempotency_uq',
  expression:
    'create unique index "ai_pending_actions_tenant_org_idempotency_uq" on "ai_pending_actions" ("tenant_id", "organization_id", "idempotency_key") where "organization_id" is not null',
})
@Index({
  name: 'ai_pending_actions_tenant_idem_null_org_uq',
  expression:
    'create unique index "ai_pending_actions_tenant_idem_null_org_uq" on "ai_pending_actions" ("tenant_id", "idempotency_key") where "organization_id" is null',
})
@Index({
  name: 'ai_pending_actions_tenant_org_status_expires_idx',
  properties: ['tenantId', 'organizationId', 'status', 'expiresAt'],
})
@Index({
  name: 'ai_pending_actions_tenant_org_agent_status_idx',
  properties: ['tenantId', 'organizationId', 'agentId', 'status'],
})
export class AiPendingAction {
  [OptionalProps]?:
    | 'createdAt'
    | 'organizationId'
    | 'conversationId'
    | 'targetEntityType'
    | 'targetRecordId'
    | 'fieldDiff'
    | 'records'
    | 'failedRecords'
    | 'sideEffectsSummary'
    | 'recordVersion'
    | 'attachmentIds'
    | 'executionResult'
    | 'resolvedAt'
    | 'resolvedByUserId'
    | 'queueMode'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ name: 'tool_name', type: 'text' })
  toolName!: string

  @Property({ name: 'conversation_id', type: 'text', nullable: true })
  conversationId?: string | null

  @Property({ name: 'target_entity_type', type: 'text', nullable: true })
  targetEntityType?: string | null

  @Property({ name: 'target_record_id', type: 'text', nullable: true })
  targetRecordId?: string | null

  @Property({ name: 'normalized_input', type: 'jsonb' })
  normalizedInput!: Record<string, unknown>

  @Property({ name: 'field_diff', type: 'jsonb', default: [] })
  fieldDiff: AiPendingActionFieldDiff[] = []

  @Property({ name: 'records', type: 'jsonb', nullable: true })
  records?: AiPendingActionRecordDiff[] | null

  @Property({ name: 'failed_records', type: 'jsonb', nullable: true })
  failedRecords?: AiPendingActionFailedRecord[] | null

  @Property({ name: 'side_effects_summary', type: 'text', nullable: true })
  sideEffectsSummary?: string | null

  @Property({ name: 'record_version', type: 'text', nullable: true })
  recordVersion?: string | null

  @Property({ name: 'attachment_ids', type: 'jsonb', default: [] })
  attachmentIds: string[] = []

  @Property({ name: 'idempotency_key', type: 'text' })
  idempotencyKey!: string

  @Property({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string

  @Property({ name: 'status', type: 'text' })
  status!: AiPendingActionStatus

  @Property({ name: 'queue_mode', type: 'text', default: 'inline' })
  queueMode: AiPendingActionQueueMode = 'inline'

  @Property({ name: 'execution_result', type: 'jsonb', nullable: true })
  executionResult?: AiPendingActionExecutionResult | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'expires_at', type: Date })
  expiresAt!: Date

  @Property({ name: 'resolved_at', type: Date, nullable: true })
  resolvedAt?: Date | null

  @Property({ name: 'resolved_by_user_id', type: 'uuid', nullable: true })
  resolvedByUserId?: string | null
}

/**
 * Per-tenant runtime override row that controls which provider, model, and
 * base URL the AI runtime uses for a given agent (or all agents when
 * `agent_id` is null).
 *
 * Resolution at query time: a non-null `agent_id` row takes precedence over
 * a null `agent_id` (tenant-wide) row for the same `(tenant_id,
 * organization_id)` scope. All value columns are nullable — an admin can
 * override just the provider, just the model, or any subset. A null value
 * means "inherit from the next source in the factory resolution chain."
 *
 * Soft-delete via `deleted_at` so the unique partial index and audit trail
 * remain intact across upsert operations.
 *
 * Phase 4a of spec `2026-04-27-ai-agents-provider-model-baseurl-overrides`.
 */
@Entity({ tableName: 'ai_agent_runtime_overrides' })
@Index({
  name: 'ai_agent_runtime_overrides_tenant_org_agent_uq',
  expression:
    'create unique index "ai_agent_runtime_overrides_tenant_org_agent_uq" on "ai_agent_runtime_overrides" ("tenant_id", "organization_id", "agent_id") where "deleted_at" is null and "organization_id" is not null and "agent_id" is not null',
})
@Index({
  name: 'ai_agent_runtime_overrides_tenant_agent_null_org_uq',
  expression:
    'create unique index "ai_agent_runtime_overrides_tenant_agent_null_org_uq" on "ai_agent_runtime_overrides" ("tenant_id", "agent_id") where "deleted_at" is null and "organization_id" is null and "agent_id" is not null',
})
@Index({
  name: 'ai_agent_runtime_overrides_tenant_null_agent_null_org_uq',
  expression:
    'create unique index "ai_agent_runtime_overrides_tenant_null_agent_null_org_uq" on "ai_agent_runtime_overrides" ("tenant_id") where "deleted_at" is null and "organization_id" is null and "agent_id" is null',
})
@Index({
  name: 'ai_agent_runtime_overrides_tenant_org_null_agent_uq',
  expression:
    'create unique index "ai_agent_runtime_overrides_tenant_org_null_agent_uq" on "ai_agent_runtime_overrides" ("tenant_id", "organization_id") where "deleted_at" is null and "organization_id" is not null and "agent_id" is null',
})
@Index({
  name: 'ai_agent_runtime_overrides_tenant_idx',
  properties: ['tenantId'],
})
export class AiAgentRuntimeOverride {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'agentId'
    | 'providerId'
    | 'modelId'
    | 'baseUrl'
    | 'allowedOverrideProviders'
    | 'allowedOverrideModelsByProvider'
    | 'updatedByUserId'
    | 'deletedAt'
    | 'loopDisabled'
    | 'loopMaxSteps'
    | 'loopMaxToolCalls'
    | 'loopMaxWallClockMs'
    | 'loopMaxTokens'
    | 'loopStopWhenJson'
    | 'loopActiveToolsJson'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'agent_id', type: 'string', columnType: 'varchar(128)', nullable: true })
  agentId?: string | null

  @Property({ name: 'provider_id', type: 'string', columnType: 'varchar(64)', nullable: true })
  providerId?: string | null

  @Property({ name: 'model_id', type: 'string', columnType: 'varchar(256)', nullable: true })
  modelId?: string | null

  @Property({ name: 'base_url', type: 'string', columnType: 'varchar(2048)', nullable: true })
  baseUrl?: string | null

  @Property({ name: 'allowed_override_providers', type: 'jsonb', nullable: true })
  allowedOverrideProviders?: string[] | null

  @Property({ name: 'allowed_override_models_by_provider', type: 'jsonb', default: '{}' })
  allowedOverrideModelsByProvider: Record<string, string[]> = {}

  @Property({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null

  /**
   * Kill switch — when `true`, runtime forces `stopWhen: stepCountIs(1)` and
   * ignores all other loop config. Phase 3 of spec
   * `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_disabled', type: 'boolean', nullable: true })
  loopDisabled?: boolean | null

  /**
   * Override `loop.maxSteps`. Phase 3 of spec
   * `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_max_steps', type: 'int', nullable: true })
  loopMaxSteps?: number | null

  /**
   * Override `loop.budget.maxToolCalls`. Phase 3 of spec
   * `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_max_tool_calls', type: 'int', nullable: true })
  loopMaxToolCalls?: number | null

  /**
   * Override `loop.budget.maxWallClockMs`. Phase 3 of spec
   * `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_max_wall_clock_ms', type: 'int', nullable: true })
  loopMaxWallClockMs?: number | null

  /**
   * Override `loop.budget.maxTokens`. Phase 3 of spec
   * `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_max_tokens', type: 'int', nullable: true })
  loopMaxTokens?: number | null

  /**
   * Override `loop.stopWhen`. JSON-safe variants only (`stepCount`,
   * `hasToolCall`); validator rejects `kind: 'custom'`. Phase 3 of spec
   * `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_stop_when_json', type: 'jsonb', nullable: true })
  loopStopWhenJson?: unknown | null

  /**
   * Override `loop.activeTools` (must be subset of `agent.allowedTools`).
   * Phase 3 of spec `2026-04-28-ai-agents-agentic-loop-controls`.
   */
  @Property({ name: 'loop_active_tools_json', type: 'jsonb', nullable: true })
  loopActiveToolsJson?: unknown | null
}

/**
 * Append-only event log for token usage per step (chat) or per turn (object).
 *
 * One row is created by `recordTokenUsage` (Phase 6.3) for every completed
 * AI SDK step. Indexed for the three read patterns: daily rollup, per-agent
 * report, and session drill-down.
 *
 * Retention: rows older than `AI_TOKEN_USAGE_EVENTS_RETENTION_DAYS` (default
 * 90) are swept by the `ai-token-usage-prune` worker (Phase 6.4).
 *
 * Phase 6.0 of spec `2026-04-28-ai-agents-agentic-loop-controls`.
 */
@Entity({ tableName: 'ai_token_usage_events' })
@Index({
  name: 'ai_token_usage_events_tenant_created_idx',
  properties: ['tenantId', 'createdAt'],
})
@Index({
  name: 'ai_token_usage_events_tenant_agent_created_idx',
  properties: ['tenantId', 'agentId', 'createdAt'],
})
@Index({
  name: 'ai_token_usage_events_tenant_model_created_idx',
  properties: ['tenantId', 'modelId', 'createdAt'],
})
@Index({
  name: 'ai_token_usage_events_tenant_session_turn_step_idx',
  properties: ['tenantId', 'sessionId', 'turnId', 'stepIndex'],
})
export class AiTokenUsageEvent {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'cachedInputTokens'
    | 'reasoningTokens'
    | 'finishReason'
    | 'loopAbortReason'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  /**
   * The person this consumption is attributable to.
   *
   * **Nullable**: a machine acting on its own has nobody to attribute it to,
   * and inventing a sponsor would be a fiction. Before this the column was
   * `not null` and the chat route passed `auth.sub` straight in — which for a
   * credential is `ai_worker:<uuid>`, not a uuid at all.
   */
  @Property({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null = null

  /**
   * What kind of actor burned these tokens — `human`, `ai_worker` or `service`.
   *
   * Without it a machine consuming tokens autonomously is indistinguishable
   * from a person using the assistant, and the first question anybody asks of a
   * spend table is *"how much did the machines cost us?"*.
   */
  @Property({ name: 'actor_kind', type: 'text', nullable: true })
  actorKind: string | null = null

  /**
   * The principal id. `text`, not `uuid`: a credential id is not always a bare
   * uuid, and forcing that is exactly what made `user_id` a latent 500.
   */
  @Property({ name: 'actor_id', type: 'text', nullable: true })
  actorId: string | null = null

  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ name: 'module_id', type: 'text' })
  moduleId!: string

  @Property({ name: 'session_id', type: 'uuid' })
  sessionId!: string

  @Property({ name: 'turn_id', type: 'uuid' })
  turnId!: string

  @Property({ name: 'step_index', type: 'int' })
  stepIndex!: number

  @Property({ name: 'provider_id', type: 'text' })
  providerId!: string

  @Property({ name: 'model_id', type: 'text' })
  modelId!: string

  @Property({ name: 'input_tokens', type: 'int' })
  inputTokens!: number

  @Property({ name: 'output_tokens', type: 'int' })
  outputTokens!: number

  @Property({ name: 'cached_input_tokens', type: 'int', nullable: true })
  cachedInputTokens?: number | null

  @Property({ name: 'reasoning_tokens', type: 'int', nullable: true })
  reasoningTokens?: number | null

  @Property({ name: 'finish_reason', type: 'text', nullable: true })
  finishReason?: string | null

  @Property({ name: 'loop_abort_reason', type: 'text', nullable: true })
  loopAbortReason?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Materialized daily rollup of token usage per `(tenant, day, agent, model)`.
 *
 * Updated incrementally by UPSERT on every `recordTokenUsage` call so the
 * rollup is always current even when the prune worker is behind. A daily
 * reconciliation worker (Phase 6.4) recomputes `session_count` from the events
 * table to correct any drift caused by event delivery delays or outages.
 *
 * `session_count` is maintained via a per-row LATERAL exists check at write
 * time (first event in a `(tenant, day, agent, model, session)` window
 * increments the counter). This counter may drift if events arrive out of
 * order; the daily worker corrects it.
 *
 * Phase 6.1 of spec `2026-04-28-ai-agents-agentic-loop-controls`.
 */
@Entity({ tableName: 'ai_token_usage_daily' })
@Index({
  name: 'ai_token_usage_daily_tenant_day_agent_model_org_uq',
  expression:
    'create unique index "ai_token_usage_daily_tenant_day_agent_model_org_uq" on "ai_token_usage_daily" ("tenant_id", "day", "agent_id", "model_id", "organization_id") where "organization_id" is not null',
})
@Index({
  name: 'ai_token_usage_daily_tenant_day_agent_model_null_org_uq',
  expression:
    'create unique index "ai_token_usage_daily_tenant_day_agent_model_null_org_uq" on "ai_token_usage_daily" ("tenant_id", "day", "agent_id", "model_id") where "organization_id" is null',
})
@Index({
  name: 'ai_token_usage_daily_tenant_day_idx',
  properties: ['tenantId', 'day'],
})
export class AiTokenUsageDaily {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | 'organizationId'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'day', type: 'string', columnType: 'date' })
  day!: string

  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ name: 'model_id', type: 'text' })
  modelId!: string

  @Property({ name: 'provider_id', type: 'text' })
  providerId!: string

  @Property({ name: 'input_tokens', type: 'string', columnType: 'bigint' })
  inputTokens!: string

  @Property({ name: 'output_tokens', type: 'string', columnType: 'bigint' })
  outputTokens!: string

  @Property({ name: 'cached_input_tokens', type: 'string', columnType: 'bigint' })
  cachedInputTokens!: string

  @Property({ name: 'reasoning_tokens', type: 'string', columnType: 'bigint' })
  reasoningTokens!: string

  @Property({ name: 'step_count', type: 'string', columnType: 'bigint' })
  stepCount!: string

  @Property({ name: 'turn_count', type: 'string', columnType: 'bigint' })
  turnCount!: string

  @Property({ name: 'session_count', type: 'string', columnType: 'bigint' })
  sessionCount!: string

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Tenant-scoped override of an agent's declared `mutationPolicy` (Step 5.4).
 *
 * Unlike {@link AiAgentPromptOverride}, this surface is NOT versioned — it is
 * a single-value policy switch per `(tenantId, organizationId, agentId)`. The
 * runtime enforces the override as a DOWNGRADE only: the effective policy
 * equals the MOST RESTRICTIVE of `{ code-declared, override }`. Escalation is
 * a code-level change and is rejected at the route layer.
 *
 * Hierarchy (most restrictive → least): `read-only` < `destructive-confirm-required`
 * < `confirm-required`. The route never allows an override to widen the
 * code-declared policy.
 */
/**
 * Tenant-scoped allowlist clipping which providers and models the runtime is
 * permitted to use within the env-driven allowlist (Phase 1780-6 of spec
 * `2026-04-27-ai-agents-provider-model-baseurl-overrides`).
 *
 * Effective constraint chain (outer → inner): `OM_AI_AVAILABLE_*` env vars →
 * this tenant allowlist → per-tenant runtime overrides → per-request overrides.
 * The tenant allowlist may NEVER widen the env allowlist; the runtime
 * intersects the two and surfaces the intersection through the settings GET
 * response so the UI never offers a value the runtime would refuse.
 *
 * `allowedProviders === null` means "inherit env" (no tenant-level restriction
 * beyond what the env imposes). `allowedModelsByProvider` keys are provider
 * ids; a missing key means "inherit env" for that provider; an empty array
 * means "no models permitted for this provider" (effectively disabling it).
 */
@Entity({ tableName: 'ai_tenant_model_allowlists' })
@Index({
  name: 'ai_tenant_model_allowlists_tenant_org_uq',
  expression:
    'create unique index "ai_tenant_model_allowlists_tenant_org_uq" on "ai_tenant_model_allowlists" ("tenant_id", "organization_id") where "deleted_at" is null and "organization_id" is not null',
})
@Index({
  name: 'ai_tenant_model_allowlists_tenant_null_org_uq',
  expression:
    'create unique index "ai_tenant_model_allowlists_tenant_null_org_uq" on "ai_tenant_model_allowlists" ("tenant_id") where "deleted_at" is null and "organization_id" is null',
})
@Index({
  name: 'ai_tenant_model_allowlists_tenant_idx',
  properties: ['tenantId'],
})
export class AiTenantModelAllowlist {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'allowedProviders'
    | 'allowedModelsByProvider'
    | 'updatedByUserId'
    | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'allowed_providers', type: 'jsonb', nullable: true })
  allowedProviders?: string[] | null

  @Property({ name: 'allowed_models_by_provider', type: 'jsonb', default: '{}' })
  allowedModelsByProvider: Record<string, string[]> = {}

  @Property({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

@Entity({ tableName: 'ai_agent_mutation_policy_overrides' })
@Index({
  name: 'ai_agent_mutation_policy_overrides_tenant_org_agent_uq',
  expression:
    'create unique index "ai_agent_mutation_policy_overrides_tenant_org_agent_uq" on "ai_agent_mutation_policy_overrides" ("tenant_id", "organization_id", "agent_id") where "organization_id" is not null',
})
@Index({
  name: 'ai_agent_mutation_policy_overrides_tenant_agent_null_org_uq',
  expression:
    'create unique index "ai_agent_mutation_policy_overrides_tenant_agent_null_org_uq" on "ai_agent_mutation_policy_overrides" ("tenant_id", "agent_id") where "organization_id" is null',
})
@Index({
  name: 'ai_agent_mutation_policy_overrides_tenant_agent_idx',
  properties: ['tenantId', 'agentId'],
})
export class AiAgentMutationPolicyOverride {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | 'organizationId' | 'createdByUserId' | 'notes'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ name: 'mutation_policy', type: 'text' })
  mutationPolicy!: string

  @Property({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Tenant-scoped durable record of a typed AI chat session.
 *
 * Owner-only MVP per spec `2026-05-05-ai-chat-server-side-conversation-storage`.
 * The `participants` table prepares for future sharing without a schema
 * rewrite — the owner row is always written in the same transaction as the
 * conversation row (see `AiChatConversationRepository.createOrGet`).
 *
 * `conversationId` is the stable, client-visible identifier. It is unique
 * within `(tenant_id, organization_id)` so an idempotent `createOrGet` can
 * accept a client-generated UUID. Pending mutation approvals already store
 * the same id in `AiPendingAction.conversationId` — the chat-history schema
 * deliberately matches that contract so a future foreign key can be added
 * without churn.
 *
 * `imported_from_local_at` flags conversations that the UI lazily migrated
 * from `localStorage`. The flag is informational only; once a row exists it
 * is always the source of truth for that conversation.
 */
@Entity({ tableName: 'ai_chat_conversations' })
@Index({
  name: 'ai_chat_conversations_tenant_org_conv_uq',
  expression:
    'create unique index "ai_chat_conversations_tenant_org_conv_uq" on "ai_chat_conversations" ("tenant_id", "organization_id", "conversation_id") where "organization_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_chat_conversations_tenant_conv_null_org_uq',
  expression:
    'create unique index "ai_chat_conversations_tenant_conv_null_org_uq" on "ai_chat_conversations" ("tenant_id", "conversation_id") where "organization_id" is null and "deleted_at" is null',
})
@Index({
  name: 'ai_chat_conversations_tenant_org_owner_agent_idx',
  properties: ['tenantId', 'organizationId', 'ownerUserId', 'agentId', 'status', 'lastMessageAt'],
})
@Index({
  name: 'ai_chat_conversations_tenant_org_deleted_idx',
  properties: ['tenantId', 'organizationId', 'deletedAt'],
})
export class AiChatConversation {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'title'
    | 'status'
    | 'visibility'
    | 'pageContext'
    | 'lastMessageAt'
    | 'importedFromLocalAt'
    | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'conversation_id', type: 'text' })
  conversationId!: string

  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  @Property({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string

  @Property({ name: 'title', type: 'text', nullable: true })
  title?: string | null

  @Property({ name: 'status', type: 'text', default: 'open' })
  status: 'open' | 'closed' = 'open'

  @Property({ name: 'visibility', type: 'text', default: 'private' })
  visibility: 'private' | 'shared' | 'organization' = 'private'

  @Property({ name: 'page_context', type: 'jsonb', nullable: true })
  pageContext?: Record<string, unknown> | null

  @Property({ name: 'last_message_at', type: Date, nullable: true })
  lastMessageAt?: Date | null

  @Property({ name: 'imported_from_local_at', type: Date, nullable: true })
  importedFromLocalAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * Membership row for an `AiChatConversation`.
 *
 * MVP always writes exactly one row per conversation with `role = 'owner'`,
 * written transactionally alongside the conversation. Sharing extensions
 * append additional rows with `role IN ('viewer', 'commenter', ...)`. The
 * access predicate is "is the caller an undeleted participant" — see
 * `AiChatConversationRepository.assertAccessible`.
 *
 * ★ `CC-107` — **a member is identified by exactly ONE of two axes.** `user_id`
 * is the human axis; `agent_id` is the machine axis. An agent id is TEXT and
 * cannot live in a uuid column, which is why the second axis exists at all
 * (`acting-user-subject.probe.sql`, P4) and why `user_id` is now nullable.
 *
 * `num_nonnulls(user_id, agent_id) = 1` is enforced by the database
 * (`ai_chat_conv_participants_one_identity_ck`) and again at the repository
 * boundary: a row with neither identity is unreachable by every predicate in
 * this module, and a row with both would answer to two owners. **Both checks
 * landed in the same migration on purpose** — making `user_id` nullable without
 * them in the same change is the risk the register carried forward itself.
 *
 * `agent_owner_user_id` is the human principal answerable for an agent
 * participant (the `bot_owner` analogue) — authorization and audit need a person
 * to name. A human participant needs no owner, so the constraint is one-sided.
 *
 * `last_read_at` is reserved for future unread/share UX and is unused in MVP.
 */
@Entity({ tableName: 'ai_chat_conversation_participants' })
// ── the human axis ────────────────────────────────────────────────────────────
// Two partial uniques, split on the nullable org. Both now also require
// `user_id is not null` (a plain unique over a nullable column lets duplicates
// through — NULLs are distinct) and exclude retired rows (a revoked member must
// not block its own slot; `addParticipant` already did this in application
// code, so the invariant now lives where a raw writer will see it).
@Index({
  name: 'ai_chat_conv_participants_tenant_org_conv_user_uq',
  expression:
    'create unique index "ai_chat_conv_participants_tenant_org_conv_user_uq" on "ai_chat_conversation_participants" ("tenant_id", "organization_id", "conversation_id", "user_id") where "organization_id" is not null and "user_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_chat_conv_participants_tenant_conv_user_null_org_uq',
  expression:
    'create unique index "ai_chat_conv_participants_tenant_conv_user_null_org_uq" on "ai_chat_conversation_participants" ("tenant_id", "conversation_id", "user_id") where "organization_id" is null and "user_id" is not null and "deleted_at" is null',
})
// ── the machine axis — the same two, for `agent_id` ───────────────────────────
// `CC-107`: without these, two rows naming the same agent in one conversation
// coexist legally, because (t, o, c, NULL, 'agent') is not equal to itself under
// Postgres NULL semantics.
@Index({
  name: 'ai_chat_conv_participants_tenant_org_conv_agent_uq',
  expression:
    'create unique index "ai_chat_conv_participants_tenant_org_conv_agent_uq" on "ai_chat_conversation_participants" ("tenant_id", "organization_id", "conversation_id", "agent_id") where "organization_id" is not null and "agent_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_chat_conv_participants_tenant_conv_agent_null_org_uq',
  expression:
    'create unique index "ai_chat_conv_participants_tenant_conv_agent_null_org_uq" on "ai_chat_conversation_participants" ("tenant_id", "conversation_id", "agent_id") where "organization_id" is null and "agent_id" is not null and "deleted_at" is null',
})
// ── the read paths, one per axis, each leading with its own identity ──────────
@Index({
  name: 'ai_chat_conv_participants_active_conv_user_idx',
  expression:
    'create index "ai_chat_conv_participants_active_conv_user_idx" on "ai_chat_conversation_participants" ("tenant_id", "organization_id", "user_id", "conversation_id") where "deleted_at" is null',
})
@Index({
  name: 'ai_chat_conv_participants_active_conv_agent_idx',
  expression:
    'create index "ai_chat_conv_participants_active_conv_agent_idx" on "ai_chat_conversation_participants" ("tenant_id", "organization_id", "agent_id", "conversation_id") where "deleted_at" is null',
})
@Index({
  name: 'ai_chat_conv_participants_tenant_org_user_conv_idx',
  expression:
    'create index "ai_chat_conv_participants_tenant_org_user_conv_idx" on "ai_chat_conversation_participants" ("tenant_id", "organization_id", "user_id", "conversation_id") where "deleted_at" is null',
})
// ── the CHECK constraints ─────────────────────────────────────────────────────
// Exactly one identity, and a human behind every agent participant. Both NOT
// VALID: the table can be large and the application already maintains both, so
// a lock-and-scan on deploy would take the app down for an invariant that holds.
@Index({
  name: 'ai_chat_conv_participants_one_identity_ck',
  expression:
    'alter table "ai_chat_conversation_participants" add constraint "ai_chat_conv_participants_one_identity_ck" check (num_nonnulls("user_id", "agent_id") = 1) not valid',
})
@Index({
  name: 'ai_chat_conv_participants_agent_owner_ck',
  expression:
    'alter table "ai_chat_conversation_participants" add constraint "ai_chat_conv_participants_agent_owner_ck" check ("agent_id" is null or "agent_owner_user_id" is not null) not valid',
})
export class AiChatConversationParticipant {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'userId'
    | 'agentId'
    | 'agentOwnerUserId'
    | 'role'
    | 'lastReadAt'
    | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'conversation_id', type: 'text' })
  conversationId!: string

  /** The human axis. Nullable since `CC-107` — an agent participant has none. */
  @Property({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null

  /** `CC-107` — the machine axis. Text, exactly as `ai_chat_conversations.agent_id` is. */
  @Property({ name: 'agent_id', type: 'text', nullable: true })
  agentId?: string | null

  /** `CC-107` — the human answerable for an agent participant. Required when `agentId` is set. */
  @Property({ name: 'agent_owner_user_id', type: 'uuid', nullable: true })
  agentOwnerUserId?: string | null

  @Property({ name: 'role', type: 'text', default: 'owner' })
  role: 'owner' | 'viewer' | 'commenter' = 'owner'

  @Property({ name: 'last_read_at', type: Date, nullable: true })
  lastReadAt?: Date | null

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}

/**
 * Append-only message row for an `AiChatConversation`.
 *
 * `client_message_id` is the idempotency key for retries and lazy imports
 * from `localStorage`. The partial unique index allows a non-null
 * `clientMessageId` to dedupe within the conversation while leaving
 * server-only rows (assistant turns persisted from the streaming dispatcher)
 * free of the constraint.
 *
 * `ui_parts` stores the serializable subset of `AiChatMessageUiPart[]` so the
 * chat surface can re-render record cards, mutation-preview cards, etc.
 * across reloads. Attachment previews (`data:` URLs and transient blob
 * URLs) MUST NOT be persisted here — the UI strips them before upload.
 */
@Entity({ tableName: 'ai_chat_messages' })
@Index({
  name: 'ai_chat_messages_tenant_org_conv_client_id_uq',
  expression:
    'create unique index "ai_chat_messages_tenant_org_conv_client_id_uq" on "ai_chat_messages" ("tenant_id", "organization_id", "conversation_id", "client_message_id") where "organization_id" is not null and "client_message_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_chat_messages_tenant_conv_client_id_null_org_uq',
  expression:
    'create unique index "ai_chat_messages_tenant_conv_client_id_null_org_uq" on "ai_chat_messages" ("tenant_id", "conversation_id", "client_message_id") where "organization_id" is null and "client_message_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_chat_messages_tenant_org_conv_created_idx',
  properties: ['tenantId', 'organizationId', 'conversationId', 'createdAt'],
})
@Index({
  name: 'ai_chat_messages_tenant_org_deleted_idx',
  properties: ['tenantId', 'organizationId', 'deletedAt'],
})
export class AiChatMessage {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'clientMessageId'
    | 'uiParts'
    | 'attachmentIds'
    | 'filesMetadata'
    | 'model'
    | 'metadata'
    | 'createdByUserId'
    | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  @Property({ name: 'conversation_id', type: 'text' })
  conversationId!: string

  @Property({ name: 'client_message_id', type: 'text', nullable: true })
  clientMessageId?: string | null

  @Property({ name: 'role', type: 'text' })
  role!: 'user' | 'assistant' | 'system'

  @Property({ name: 'content', type: 'text' })
  content!: string

  @Property({ name: 'ui_parts', type: 'jsonb', nullable: true })
  uiParts?: unknown[] | null

  @Property({ name: 'attachment_ids', type: 'jsonb', nullable: true })
  attachmentIds?: string[] | null

  @Property({ name: 'files_metadata', type: 'jsonb', nullable: true })
  filesMetadata?: Array<Record<string, unknown>> | null

  @Property({ name: 'model', type: 'text', nullable: true })
  model?: string | null

  @Property({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null

  @Property({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * An **agent ↔ AI-user binding** (`CC-27`).
 *
 * The AI *actor* is an `api_keys` row with `principal_kind = 'ai_worker'` — a
 * principal that carries roles, scope and a credential. The AI *agent*
 * (tools, prompt, loop, model) is **code-declared** and resolved from the
 * in-memory `agentsById` Map, so it can never be a row. What was missing is the
 * join between them: a row saying *"this AI user may run this agent, with these
 * tools, under these permissions."*
 *
 * This entity is that row. It is a **binding**, never a definition: the runtime
 * still reads the agent from code (`B5`), and this table only **narrows** what a
 * machine principal may do (`B3`).
 *
 * Enforcement (`B2`) is **fail-closed for AI workers**: an `ai_worker` principal
 * with no live binding for the requested agent is refused (`agent_not_bound`).
 * A human caller is unaffected — humans are not bound here.
 *
 * `principal_id` is the **`api_keys` id** (a uuid), stored as `uuid`: unlike the
 * audit/ledger columns that must hold the string subject `ai_worker:<id>`, this
 * table is keyed by the credential id itself, which is always a bare uuid.
 *
 * `tool_allowlist` (`jsonb`, nullable) is a **subset** of the agent's own
 * `allowedTools`; `null` means "all of the agent's tools". `required_features`
 * (`jsonb`, nullable) are features the caller must **additionally** hold on top
 * of the agent's code-declared `requiredFeatures`. Neither can widen the agent.
 */
@Entity({ tableName: 'ai_agent_bindings' })
@Index({
  name: 'ai_agent_bindings_tenant_org_principal_agent_uq',
  expression:
    'create unique index "ai_agent_bindings_tenant_org_principal_agent_uq" on "ai_agent_bindings" ("tenant_id", "organization_id", "principal_id", "agent_id") where "organization_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_agent_bindings_tenant_principal_agent_null_org_uq',
  expression:
    'create unique index "ai_agent_bindings_tenant_principal_agent_null_org_uq" on "ai_agent_bindings" ("tenant_id", "principal_id", "agent_id") where "organization_id" is null and "deleted_at" is null',
})
@Index({
  name: 'ai_agent_bindings_tenant_org_principal_agent_idx',
  properties: ['tenantId', 'organizationId', 'principalId', 'agentId'],
})
@Index({
  name: 'ai_agent_bindings_tenant_agent_idx',
  properties: ['tenantId', 'agentId'],
})
export class AiAgentBinding {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'organizationId'
    | 'toolAllowlist'
    | 'requiredFeatures'
    | 'notes'
    | 'createdByUserId'
    | 'deletedAt'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  /** The `api_keys` id of the AI-user principal this binding belongs to. */
  @Property({ name: 'principal_id', type: 'uuid' })
  principalId!: string

  /** The code-declared agent id (`<module>.<agent>`) this principal may run. */
  @Property({ name: 'agent_id', type: 'text' })
  agentId!: string

  /**
   * A subset of the agent's own `allowedTools`. `null` means "all of the
   * agent's tools". The effective set is the INTERSECTION with the agent's
   * declaration — a binding can narrow, never widen (`B3`).
   */
  @Property({ name: 'tool_allowlist', type: 'jsonb', nullable: true })
  toolAllowlist?: string[] | null

  /**
   * Features the caller must ADDITIONALLY hold, on top of the agent's
   * code-declared `requiredFeatures`. The effective requirement is the UNION
   * with the agent's declaration (`B3`).
   */
  @Property({ name: 'required_features', type: 'jsonb', nullable: true })
  requiredFeatures?: string[] | null

  @Property({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null

  @Property({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}

/**
 * `SR-02` — **the machine**, as distinct from the teammate (`ai_assistant:agent`).
 *
 * One row is a daemon, on a host, for one provider, inside one tenant. The kernel
 * `Agent` object's `runtime` text field **names** a row here by `name`; it does not
 * embed one (`ce.ts:128-136`, `AGENT-HALF.md` §1.5). One runtime hosts many agents.
 *
 * The migration is the source of truth for the constraints — a partial,
 * tenant-scoped unique index cannot be expressed as a `@Unique` decorator, which
 * is the same reason `auth`'s `User` omits one (`core/src/modules/auth/data/
 * entities.ts:4-13`). The expressions are repeated here anyway so the entity and
 * the schema cannot drift silently; `schema-unique-indexes.test.ts` asserts they
 * match.
 *
 * **`last_seen_at`, and still no `status`.** Slice 1 withheld both and said they
 * would *"land with the probe"*; `CC-102` is the probe — `touch()` writes this
 * column and `ai:runtime:touch` calls it. `status` stays refused, and the refusal
 * is not a postponement: a timestamp answers *"when did this machine last speak"*,
 * which is a fact; `status` answers *"is it online"*, which is a **verdict** and
 * needs a sweeper to keep it true. The fact is taken; the verdict is not.
 *
 * **`legacy_daemon_id`** records the previous identity after a rename, so an audit
 * can follow the machine instead of finding two rows (`CC-102`, the donor's
 * `048_runtime_daemon_uuid.up.sql:1-6`).
 *
 * **Not `AiAgentRuntimeOverride`** (line 254). That is per-tenant provider/model/
 * baseURL *configuration*; this is an *instance*. A setting says which model a
 * tenant prefers; this says which process can serve it.
 */
@Entity({ tableName: 'ai_agent_runtimes' })
@Index({
  name: 'ai_agent_runtimes_tenant_org_daemon_provider_uq',
  expression:
    'create unique index "ai_agent_runtimes_tenant_org_daemon_provider_uq" on "ai_agent_runtimes" ("tenant_id", "organization_id", "daemon_id", "provider") where "organization_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_agent_runtimes_tenant_daemon_provider_null_org_uq',
  expression:
    'create unique index "ai_agent_runtimes_tenant_daemon_provider_null_org_uq" on "ai_agent_runtimes" ("tenant_id", "daemon_id", "provider") where "organization_id" is null and "deleted_at" is null',
})
@Index({
  name: 'ai_agent_runtimes_tenant_org_name_uq',
  expression:
    'create unique index "ai_agent_runtimes_tenant_org_name_uq" on "ai_agent_runtimes" ("tenant_id", "organization_id", "name") where "organization_id" is not null and "deleted_at" is null',
})
@Index({
  name: 'ai_agent_runtimes_tenant_name_null_org_uq',
  expression:
    'create unique index "ai_agent_runtimes_tenant_name_null_org_uq" on "ai_agent_runtimes" ("tenant_id", "name") where "organization_id" is null and "deleted_at" is null',
})
export class AiAgentRuntime {
  [OptionalProps]?:
    | 'organizationId'
    | 'metadata'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
    | 'lastSeenAt'
    | 'legacyDaemonId'

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null

  /**
   * The identity of the process/host that can execute. `NOT NULL` — a nullable
   * `daemon_id` would silently drop every such row out of the uniqueness key
   * (Postgres treats `NULL`s as distinct), which is the donor's defect and is
   * deliberately not copied. See the migration's header.
   */
  @Property({ name: 'daemon_id', type: 'text' })
  daemonId!: string

  /**
   * **The binding key.** The kernel `Agent` object's `runtime` field carries this
   * string; `resolveTenantRuntime` turns it back into this row. Unique per
   * (tenant, organization) among live rows, or the resolution is ambiguous.
   */
  @Property({ name: 'name', type: 'text' })
  name!: string

  /**
   * The engine this runtime hosts — an `AiRuntimeEngine` (`'opencode' | 'hermes'`).
   * Typed `string` here on purpose: importing the selector would drag its adapters
   * into the data layer. The repository validates the vocabulary at its boundary
   * against `lib/ai-runtime-engines`, which imports nothing.
   */
  @Property({ name: 'provider', type: 'text' })
  provider!: string

  @Property({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown> = {}

  /**
   * When this runtime last spoke — written by `touch()`, never by a read.
   *
   * Nullable on purpose: a row registered and never heard from has **no**
   * heartbeat, and defaulting it to `now()` would claim one. Null means "we have
   * never heard from it since registration", which is a different and more honest
   * statement than "it is online".
   */
  @Property({ name: 'last_seen_at', type: Date, nullable: true })
  lastSeenAt?: Date | null

  /** The identity this row carried before a rename (`CC-102`, donor `048`). */
  @Property({ name: 'legacy_daemon_id', type: 'text', nullable: true })
  legacyDaemonId?: string | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
