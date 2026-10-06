import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

type AiAssistantMutationGuardContext = {
  container: AwilixContainer
  /** Verified tenant id (from the route's resolved auth context). */
  tenantId: string | null | undefined
  /** Organization the write is scoped to (may be null: tenant-level rows carry none). */
  organizationId?: string | null
  /** Actor id — the authenticated user id (`auth.sub`). */
  userId: string | null | undefined
  req: Request
  /** The resource kind the guard set is evaluated against, e.g. `ai_assistant.settings`. */
  resourceKind: string
  resourceId: string
  operation: 'create' | 'update' | 'delete' | 'custom'
  mutationPayload?: Record<string, unknown> | null
}

type AiAssistantMutationGuardHandle = {
  blockedResponse: NextResponse | null
  /** Runs every registry guard's `afterSuccess` callback. Call only after the write commits. */
  runAfterSuccess: () => Promise<void>
}

/**
 * Runs the structural mutation guards for the `ai_assistant` **resource-write**
 * routes.
 *
 * **D2-gap (2026-10-06).** `ai_assistant` is the largest `D2-gap` module measured
 * — **24 unguarded write verbs across 19 files**, and the module most likely to
 * be reached through the Hermes tool door, so this is where that defect and the
 * tool surface meet. Before this wrapper **no** `ai_assistant` write ran a
 * mutation guard of any kind: not the registry, not the deprecated pair, not
 * `makeCrudRoute`. Every write was protected only by `metadata.requireFeatures`
 * plus an **inline** `rbacService.loadAcl()` check, Zod validation, tenant
 * scoping and ownership checks — a real and dense authorization story, but one
 * the **structural grammar (SD-4) never sees**, and one that leaves the
 * registry/`afterSuccess` joint unconnected. This wrapper is that joint.
 *
 * **The 24 verbs are NOT all the same thing, and wrapping them all would be
 * wrong — the same call the `auth` migration made.** They split three ways, and
 * only the first is a mutation-guard target. This is the whole reason the header
 * is long: it is the record of a decision, not a description of a component.
 *
 * | Class | What it is | Verbs | Decision |
 * |---|---|---|---|
 * | **(a) resource writes** | persists a guarded object (settings, allowlist, agent overrides, conversations, participants) | **15** | **`beginAiAssistantMutationGuard` — this file** |
 * | **(b) session/flow** | chat completion, tool execution, run-object, key minting, intent routing — changes ephemeral/credential state, not a guarded resource | 7 | **set aside by name** (below) |
 * | **(c) pending-action gate** | the human-approval gate for AI-proposed mutations | 2 | **set aside by name** (below) |
 *
 * **15 + 7 + 2 = 24** — the module's whole `D2-gap` figure. Measured after this
 * change: `ai_assistant` reads **9 unguarded verbs, 15 guarded** (the 9 are
 * exactly (b)+(c) below).
 *
 * **(a) the 15 guarded verbs — 10 files.** `settings` PUT/DELETE (`ai_assistant.settings`);
 * `settings/allowlist` PUT/DELETE (`ai_assistant.allowlist`); `agents/[agentId]/loop-override`
 * PUT/DELETE, `agents/[agentId]/mutation-policy` POST/DELETE, `agents/[agentId]/prompt-override`
 * POST (`ai_assistant.agent_override`); `conversations` POST, `conversations/import` POST,
 * `conversations/[conversationId]` PATCH/DELETE, `conversations/[conversationId]/participants`
 * POST, `conversations/[conversationId]/participants/[userId]` DELETE (`ai_assistant.conversation`).
 * Each writes a row a guard could legitimately describe, so each must reach the registry.
 *
 * **(b)+(c) the 9 set-aside verbs, named so the exclusion is auditable.** These are
 * deliberately NOT counted as `D2-gap` exposure and NOT wrapped, because each is
 * governed by a mechanism built for it — the identical reasoning that set `auth`'s
 * login/logout/reset/session/profile/locale/feature-check aside:
 *
 * - `ai/chat` POST, `ai/run-object` POST, `route` POST — chat completion / structured-output /
 *   intent routing. `ai/chat` carries a **rate limit** (`checkAiChatRateLimit`) and an
 *   agent-policy check; `run-object` and `route` perform **no DB write at all**.
 * - `chat` POST, `session-key` POST, `mcp-key` POST — the OpenCode/MCP **transport**: session-key
 *   and MCP-key **minting**. `mcp-key` is gated on `api_keys.create` and resolves the caller's
 *   roles server-side so a caller cannot mint above itself; session keys are short-TTL and bound
 *   to the caller's session. This is credential machinery, the `auth` login/logout category.
 * - `tools/execute` POST — executes a named MCP tool. Its authorization is the **tool's own**
 *   feature checks inside `executeTool`, per tool; there is no single resource to guard, and the
 *   tools it calls that DO write go through their own module's guards.
 * - `ai/actions/[id]/confirm` POST, `ai/actions/[id]/cancel` POST — **class (c), the AI mutation
 *   approval gate.** Confirm is the single most guard-like path in the module: it calls
 *   `runPendingActionRechecks()`, which re-verifies status, expiry, agent registration, required
 *   features, **mutation policy**, tool whitelist, attachment tenant scope, record version and
 *   schema drift before the wrapped tool runs. That is a dedicated authorization mechanism for
 *   exactly these writes; it is not replaced by, and does not need, the generic registry guard.
 *   Cancel flips the same state machine to `cancelled`.
 *
 * **What this wrapper does NOT do.** It does not re-implement any route's own checks
 * — the `metadata.requireFeatures` gate, the inline `loadAcl`/`hasRequiredFeatures`
 * check, Zod validation, tenant scoping and ownership rules all stay exactly as
 * they are. It adds the registry chokepoint; guards are **additional** policy.
 *
 * Same wrapper shape as the fourteen migrated before it — the worked example
 * (`entities/api/definitions.mutation-guard.ts`, `d225602`), `data_sync`
 * (`c6c3151`), `dictionaries` (`43e4e5d`), `dashboards` (`a05ea2c`), `workflows`
 * (`d3af1b1`), `inbox_ops` (`d89b8f6`), `perspectives` (`e26642c`), `translations`
 * (`a2f8d5f`), `planner` (`641d3af`), `query_index` (`cc5a237`), `auth`
 * (`aeeaad0`), `directory` (`d682c09`), `feature_toggles` (`5af76bc`) and
 * `audit_logs` (`4ef5812`).
 */
export async function beginAiAssistantMutationGuard(
  ctx: AiAssistantMutationGuardContext,
): Promise<AiAssistantMutationGuardHandle> {
  const { tenantId, userId } = ctx
  if (!tenantId || !userId) {
    // No verified tenant/actor — the guard set cannot be evaluated. The route's
    // own auth check is authoritative and returns before reaching here when the
    // actor is missing; this mirrors the legacy service's behaviour on
    // incomplete context rather than inventing a second auth mechanism.
    return { blockedResponse: null, runAfterSuccess: async () => undefined }
  }

  const guardResult = await runRouteMutationGuards({
    container: ctx.container,
    req: ctx.req,
    auth: {
      userId,
      tenantId,
      organizationId: ctx.organizationId ?? null,
    },
    input: {
      resourceKind: ctx.resourceKind,
      resourceId: ctx.resourceId,
      operation: ctx.operation,
      mutationPayload: ctx.mutationPayload ?? null,
    },
  })

  if (!guardResult.ok) {
    return {
      blockedResponse: NextResponse.json(guardResult.errorBody, { status: guardResult.errorStatus }),
      runAfterSuccess: async () => undefined,
    }
  }

  return {
    blockedResponse: null,
    runAfterSuccess: async () => {
      await guardResult.runAfterSuccess()
    },
  }
}
