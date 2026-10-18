import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { RbacService } from '@open-mercato/core/modules/auth/services/rbacService'
import type { EntityManager } from '@mikro-orm/postgresql'
import { llmProviderRegistry } from '@open-mercato/shared/lib/ai/llm-provider-registry'
import { isAgentTaskPlanEnabled, loadAgentRegistry } from '../../../lib/agent-registry'
import { listAgentCatalog } from '../../../lib/agent-type-catalog'
import { hasRequiredFeatures } from '../../../lib/auth'
import { toolRegistry } from '../../../lib/tool-registry'
import type { AiToolDefinition } from '../../../lib/types'

const logger = createLogger('ai_assistant')

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'List AI agents the caller can invoke',
  methods: {
    GET: {
      operationId: 'aiAssistantListAgents',
      summary: 'List registered AI agents, filtered by the caller\'s features.',
      description:
        'Returns `{ agents: [...] }` — the C code-declared and the tenant-created agents ' +
        '(`CC-126`), each tagged `layer: "platform" | "tenant"`, that the authenticated caller ' +
        'can invoke based on each agent\'s `requiredFeatures`. A tenant entry the platform has ' +
        'since claimed carries `shadowedByCode: true` — it is inert under code-first precedence. ' +
        'Mirrors the `meta.list_agents` tool handler so backoffice pages (e.g. the playground) ' +
        'can render an agent picker without going through the MCP tool transport.',
      responses: [
        {
          status: 200,
          description: 'Accessible agent summaries.',
          mediaType: 'application/json',
        },
      ],
      errors: [
        { status: 401, description: 'Unauthenticated caller.' },
        { status: 500, description: 'Internal failure while loading the agent registry.' },
      ],
    },
  },
}

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['ai_assistant.view'] },
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthenticated' }, { status: 401 })
  }

  try {
    const container = await createRequestContainer()
    const rbacService = container.resolve<RbacService>('rbacService')
    const acl = await rbacService.loadAcl(auth.sub, {
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
    })

    // No LLM provider configured (no API keys set). The launcher uses the
    // `aiConfigured` flag to show a setup prompt; explicit `<AiChat>` mounts
    // and playground pages still see the full registry so they can show their
    // own configuration prompts instead of silently disappearing.
    const aiConfigured = llmProviderRegistry.resolveFirstConfigured() != null

    await loadAgentRegistry()
    // CC-126 — the catalogue in this tenant: the code layer and the tenant's
    // own rows, merged and tagged. A null tenant yields the platform layer
    // alone, exactly as before.
    const em = container.resolve<EntityManager>('em')
    const catalog = await listAgentCatalog({ tenantId: auth.tenantId ?? '' }, em)
    const accessible = catalog
      .filter((entry) =>
        hasRequiredFeatures(entry.definition.requiredFeatures, acl.features, acl.isSuperAdmin, rbacService),
      )
      // Code-first precedence at the read surface too: where the platform has
      // claimed the key, the tenant row is a duplicate of an entry that is
      // already listed, and a picker keyed by agent id must not see two.
      .filter((entry) => !(entry.layer === 'tenant' && entry.shadowedByCode))

    const agents = accessible.map((entry) => {
      const agent = entry.definition
      const tools = agent.allowedTools.map((toolName) => {
        const tool = toolRegistry.getTool(toolName) as AiToolDefinition | undefined
        return {
          name: toolName,
          displayName: tool?.displayName ?? toolName,
          isMutation: Boolean(tool?.isMutation),
          registered: Boolean(tool),
        }
      })
      return {
        id: agent.id,
        // CC-126 — provenance, so a caller can tell a shipped agent from one
        // this tenant authored. A tenant type carries the owning module's id
        // (`AGENT_TYPE_MODULE_ID`); there is no module to attribute beyond it.
        layer: entry.layer,
        moduleId: agent.moduleId,
        label: agent.label,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        executionMode: agent.executionMode ?? 'chat',
        defaultProvider: agent.defaultProvider ?? null,
        defaultModel: agent.defaultModel ?? null,
        defaultBaseUrl: agent.defaultBaseUrl ?? null,
        allowRuntimeModelOverride: agent.allowRuntimeModelOverride !== false,
        mutationPolicy: agent.mutationPolicy ?? 'read-only',
        readOnly: Boolean(agent.readOnly),
        maxSteps: agent.maxSteps ?? null,
        taskPlan: { enabled: isAgentTaskPlanEnabled(agent) },
        allowedTools: agent.allowedTools,
        tools,
        requiredFeatures: agent.requiredFeatures ?? [],
        acceptedMediaTypes: agent.acceptedMediaTypes ?? [],
        keywords: agent.keywords ?? [],
        suggestions: agent.suggestions ?? [],
        hasOutputSchema: Boolean(agent.output),
        // Tenant rows only; pinned by an instance once `CC-122` lands.
        version: entry.version,
        shadowedByCode: entry.shadowedByCode,
      }
    })

    return NextResponse.json({ agents, total: agents.length, aiConfigured })
  } catch (error) {
    logger.error('AI Agents — Failed to list agents', { err: error })
    return NextResponse.json(
      { error: 'Failed to list agents', code: 'internal_error' },
      { status: 500 },
    )
  }
}
