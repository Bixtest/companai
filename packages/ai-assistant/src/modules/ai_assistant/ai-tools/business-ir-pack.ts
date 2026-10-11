/**
 * `business_ir.*` tool pack — **the first production caller of the Business-IR
 * chain** (`CC-59`, the first item of the supplementary core queue).
 *
 * Every layer of the pipeline was already built and tested, and none of it was
 * reachable from the running product: `authorBusinessQueryIr` turns a prompt into
 * a typed IR, `compileQuery` validates it against the canonical model, and the
 * platform's own `QueryEngine.query` runs the compiled plan. `CC-59` added the
 * single wire between them (`runBusinessQueryPrompt`); **this pack is what makes
 * that wire live** — it registers the one tool that runs the whole chain, so the
 * switch is finally on the panel.
 *
 * **How it is reached — stated precisely, because "registered" is not "called".**
 * The generator discovers this pack and registers the tool on the platform's
 * AI-tool surface, so it is callable through the authenticated tool door
 * (`POST /api/ai/tools/execute`) and the MCP surface, and by any agent that names
 * it in `allowedTools`. **No agent whitelists it yet** — the in-chat / screen
 * consumer is the deferred business half (`CC-58` Stage B; tracked as the `CC-60`
 * callback) — so today the tool is live on the tool door, not yet callable by an
 * assistant inside a chat. The chain has a caller; that caller is not itself yet
 * called by a screen.
 *
 * **Why a tool and not a route.** The natural consumer is an agent: the vision's
 * decisive loop is *a person asks in plain language, the AI proposes a typed
 * business request, the platform validates and runs it*. Registering the entry
 * point on the existing AI-tool surface (`ai-tools/*.ts`, discovered by the
 * generator) makes it reachable **without a new HTTP route and without any
 * business screen** — it stays inside the core, which is what the owner's build
 * order requires. This is also `CC-58` Stage C: the same single caller.
 *
 * **What the handler does — and does not do.** It assembles the four things the
 * entry point needs from the **tool context only** (`ctx`): the canonical model
 * (`buildModelFromModules`), the physical bindings
 * (`createBindingsFromDeclarations`), the entity manager and the query engine
 * (from `ctx.container`). It then calls {@link runBusinessQueryPrompt} with the
 * scope taken from `ctx` — never from the model, never from the prompt. It
 * compiles no SQL, re-implements no compiler, and adds no second way to run a
 * query.
 *
 * **Why the binding is consulted here too.** The entry point calls
 * `authorBusinessQueryIr`, which resolves the `(principal, agent)` binding before
 * the model is asked (`CC-57`) — so an AI worker not bound to
 * `business_ir.query_author` is refused here as a value, with no model call. The
 * tool does not bypass that; it passes the acting principal's `sub` through.
 *
 * Source: `library/development/PLAN-CC-59-business-ir-caller.md` §2 `B5d`;
 * `COMPLETION-CALLBACKS.md` row `CC-59`; the pack pattern of `search-pack.ts` /
 * `meta-pack.ts` (the sibling packs in this folder).
 */
import { z } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import { collectDeclarations, tryBuildModelFromModules } from '@open-mercato/shared/lib/kernel/from-modules'
import { createBindingsFromDeclarations } from '@open-mercato/shared/lib/business-ir/bindings'
import type { QueryRunner } from '@open-mercato/shared/lib/user-function/run'
import { defineAiTool } from '../lib/ai-tool-definition'
import type { AiToolDefinition } from '../lib/types'
import { runBusinessQueryPrompt } from '../lib/business-ir-run'

const runQueryInput = z.object({
  prompt: z
    .string()
    .min(1)
    .describe(
      'The business question in plain language, e.g. "unread conversations over 2, by subject". ' +
        'The platform turns this into a typed business request, validates it, and runs it — the ' +
        'prompt cannot widen the read beyond the caller\'s tenant/organization.',
    ),
})

/**
 * Run a plain-language business query end to end.
 *
 * The handler is deliberately thin: it resolves the platform's own pieces and
 * delegates. All refusals (`agent_not_bound`, `schema_rejected`, `compile_failed`,
 * `no_binding`, `engine_failed`) come back as the entry point's value union, so
 * the agent sees *why* nothing ran rather than a thrown error.
 */
const runQueryTool = defineAiTool({
  name: 'business_ir.run_query',
  displayName: 'Run a business query',
  description:
    'Turn a plain-language business question into a typed Business IR, validate it against the ' +
    'business model, and execute it on the platform read path — scoped to the caller\'s ' +
    'tenant/organization. Returns the rows plus the resolved request and the compiled plan.',
  inputSchema: runQueryInput,
  requiredFeatures: ['ai_assistant.view'],
  tags: ['read', 'business-ir'],
  isMutation: false,
  handler: async (rawInput, ctx) => {
    if (!ctx.tenantId) {
      throw new Error('Tenant context is required for business_ir.run_query')
    }
    // Fail closed when there is no acting principal: `sub` drives the binding
    // lookup, and a blank subject identifies nobody. Guard on the TRIMMED value —
    // a whitespace-only subject is as empty as '', and would otherwise reach the
    // resolver and skip the check (see the same guard in `agent-binding.ts`).
    if (!ctx.userId || !ctx.userId.trim()) {
      throw new Error('Principal context is required for business_ir.run_query')
    }
    const input = runQueryInput.parse(rawInput)

    // The canonical model, from the registered module declarations. `null` is the
    // honest "not ready" (registration has not happened) — refuse rather than run
    // against an empty model that would look like a tenant with no entities.
    const model = tryBuildModelFromModules()
    if (!model) {
      throw new Error('The business model is not available yet; cannot compile a business query.')
    }
    const bindings = createBindingsFromDeclarations(collectDeclarations(), model)

    const em = ctx.container.resolve<EntityManager>('em')
    const engine = ctx.container.resolve<QueryRunner>('queryEngine')

    return runBusinessQueryPrompt({
      prompt: input.prompt,
      // Scope comes from the tool context — the authenticated request — only.
      authContext: {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        features: ctx.userFeatures,
        isSuperAdmin: ctx.isSuperAdmin,
        onBehalfOfUserId: ctx.onBehalfOfUserId ?? null,
      },
      // The acting principal's subject — what the binding is looked up by (CC-57).
      auth: { sub: ctx.userId, tenantId: ctx.tenantId, orgId: ctx.organizationId },
      em,
      model,
      bindings,
      engine,
      container: ctx.container,
    })
  },
})

export const businessIrAiTools: AiToolDefinition<any, any>[] = [runQueryTool]

export default businessIrAiTools
