import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import type { UIMessage } from 'ai'
import { z } from 'zod'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import { loadAgentRegistry } from '../../../lib/agent-registry'
import { checkAgentPolicy, type AgentPolicyDenyCode } from '../../../lib/agent-policy'
import { resolveAgentBinding, computeBoundRunScope } from '../../../lib/agent-binding'
import { resolveAgentDefinition } from '../../../lib/agent-type-catalog'
// OPEN — row 28 / `CC-67`: this route reaches the platform's own AI SDK runtime
// THROUGH THE DOOR, never by importing `agent-runtime` by name. The engine sits
// behind the door as one implementation (`agent-runtime-port-adapter.ts`) — see
// `ARCHITECTURE-hermes-integration.md` §4/§9. This file must not name an engine.
import { createAgentRuntimePortAdapter } from '../../../lib/agent-runtime-port-adapter'
import { AgentPolicyError } from '../../../lib/agent-tools'

const logger = createLogger('ai_assistant')

const MAX_MESSAGES = 100

const agentIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/

const agentIdSchema = z
  .string()
  .regex(agentIdPattern, 'agent must match "<module>.<agent>" (lowercase, digits, underscores only)')

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

const pageContextSchema = z
  .object({
    pageId: z.string().optional(),
    entityType: z.string().optional(),
    recordId: z.string().optional(),
  })
  .passthrough()

const runObjectRequestSchema = z.object({
  agent: agentIdSchema,
  messages: z
    .array(chatMessageSchema)
    .min(1, 'messages must contain at least one message')
    .max(MAX_MESSAGES, `messages must contain at most ${MAX_MESSAGES} entries`),
  attachmentIds: z.array(z.string()).optional(),
  pageContext: pageContextSchema.optional(),
  modelOverride: z.string().optional(),
})

export type AiRunObjectRequest = z.infer<typeof runObjectRequestSchema>

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'Run an AI agent in structured-output (object) mode',
  methods: {
    POST: {
      operationId: 'aiAssistantRunObject',
      summary: 'Run an object-mode AI agent and return the generated object',
      description:
        'Invokes `runAiAgentObject` server-side for the registered AI agent identified by `agent` ' +
        '(matching "<module>.<agent>"). Enforces the same `requiredFeatures`, tool whitelisting, ' +
        'mutationPolicy, and attachment media-type policy as the chat dispatcher, but additionally ' +
        'requires the agent to declare `executionMode: "object"`. Returns the generated object in ' +
        'a single JSON response (no streaming).',
      requestBody: {
        contentType: 'application/json',
        description:
          'Object-mode dispatch payload. `agent` and `messages` are required; `attachmentIds`, `pageContext`, and `modelOverride` are optional.',
        schema: runObjectRequestSchema,
      },
      responses: [
        {
          status: 200,
          description: 'Object-mode run completed; response body contains `{ object, usage?, finishReason? }`.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 400, description: 'Malformed payload or message cap exceeded.' },
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 403, description: 'Caller lacks agent-level or tool-level required features.' },
        { status: 404, description: 'Unknown agent id.' },
        { status: 409, description: 'Agent/tool/execution-mode policy violation.' },
        { status: 422, description: 'Agent does not support object-mode execution.' },
        { status: 500, description: 'Internal runtime failure.' },
      ],
    },
  },
}

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['ai_assistant.view'] },
}

function jsonError(
  status: number,
  message: string,
  code: string,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, code, ...(extra ?? {}) }, { status })
}

function statusForDenyCode(code: AgentPolicyDenyCode): number {
  switch (code) {
    case 'agent_unknown':
      return 404
    case 'agent_features_denied':
    case 'tool_features_denied':
      return 403
    case 'execution_mode_not_supported':
      return 422
    case 'tool_not_whitelisted':
    case 'tool_unknown':
    case 'mutation_blocked_by_readonly':
    case 'mutation_blocked_by_policy':
      return 409
    case 'attachment_type_not_accepted':
      return 400
    default:
      return 409
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return jsonError(401, 'Unauthorized', 'unauthenticated')
  }

  let parsedBody: unknown
  try {
    parsedBody = await req.json()
  } catch {
    return jsonError(400, 'Request body must be valid JSON.', 'validation_error')
  }

  const bodyResult = runObjectRequestSchema.safeParse(parsedBody)
  if (!bodyResult.success) {
    return jsonError(400, 'Invalid request body.', 'validation_error', {
      issues: bodyResult.error.issues,
    })
  }

  try {
    await loadAgentRegistry()

    const container = await createRequestContainer()
    const rbacService = container.resolve<RbacService>('rbacService')
    const acl = await rbacService.loadAcl(auth.sub, {
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
    })

    // CC-126 — resolve the subject BEFORE the gate asks about it (the code
    // layer first, a tenant-authored type second, in this caller's tenant).
    const agentSubject = await resolveAgentDefinition({
      agentId: bodyResult.data.agent,
      scope: { tenantId: auth.tenantId ?? '' },
      em: container.resolve('em'),
    })

    const decision = checkAgentPolicy({
      agentId: bodyResult.data.agent,
      agent: agentSubject,
      authContext: {
        userFeatures: acl.features,
        isSuperAdmin: acl.isSuperAdmin,
      },
      requestedExecutionMode: 'object',
      attachmentMediaTypes: undefined,
    })

    if (!decision.ok) {
      return jsonError(statusForDenyCode(decision.code), decision.message, decision.code)
    }

    // CC-27 — an AI-user principal may run only the agents BOUND to it (fail-closed).
    const binding = await resolveAgentBinding({
      em: container.resolve('em'),
      auth,
      agentId: bodyResult.data.agent,
    })
    if (!binding.bound) {
      return jsonError(
        403,
        `Agent "${bodyResult.data.agent}" is not bound to this principal.`,
        'agent_not_bound',
      )
    }

    // CC-55 — apply the binding's NARROWING (tools INTERSECT, features UNION) to
    // the run. `binding.bound` is always true here, so the scope is well-typed.
    // CC-126 — the agent is the resolved subject (code layer or tenant row).
    const boundScope = computeBoundRunScope({ agent: decision.agent, binding })

    // The AI runtime door (`CC-67`). The engine sits behind it; this route never
    // names one. The rich deps the envelope cannot hold — the container, the
    // resolved auth context, the binding's narrowed scope — ride on the adapter's
    // CONSTRUCTION (per request), exactly as the OpenCode adapter's `{ auth, em }`
    // do (§4.2: the envelope carries identity + references only).
    const port = createAgentRuntimePortAdapter({
      authContext: {
        tenantId: auth.tenantId ?? null,
        organizationId: auth.orgId ?? null,
        userId: auth.sub,
        features: acl.features,
        isSuperAdmin: acl.isSuperAdmin,
        // S-02: the person this machine actor acts for (auth.userId; undefined for a person).
        onBehalfOfUserId: auth.userId ?? null,
      },
      container,
      boundScope,
    })

    const result = await port.runObjectForRun({
      agentId: bodyResult.data.agent,
      prompt: bodyResult.data.messages as unknown as UIMessage[],
      attachmentIds: bodyResult.data.attachmentIds,
      pageContext: bodyResult.data.pageContext,
      modelOverride: bodyResult.data.modelOverride,
    })

    if (result.mode !== 'generate') {
      return jsonError(
        422,
        'Streaming object-mode is not supported by the run-object HTTP route; agent must use generate mode.',
        'execution_mode_not_supported',
      )
    }

    return NextResponse.json({
      object: result.object,
      finishReason: result.finishReason,
      usage: result.usage,
    })
  } catch (error) {
    if (error instanceof AgentPolicyError) {
      return jsonError(statusForDenyCode(error.code), error.message, error.code)
    }
    logger.error('AI Run Object — Dispatch failure', { err: error })
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Agent object dispatch failed.',
      'internal_error',
    )
  }
}
