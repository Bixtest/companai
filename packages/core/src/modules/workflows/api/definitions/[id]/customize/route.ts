/**
 * Customize Code-Based Workflow Definition
 *
 * POST /api/workflows/definitions/[id]/customize
 *
 * Creates a DB override row for a code-based workflow definition, seeded from
 * the current code registry values. The id param must be of the form
 * "code:<workflowId>".
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { resolveOrganizationScopeForRequest } from '@open-mercato/core/modules/directory/utils/organizationScope'
import { beginWorkflowsMutationGuard } from '../../../mutation-guard'
import { WorkflowDefinition } from '../../../../data/entities'
import { serializeWorkflowDefinition } from '../../serialize'
import { getCodeWorkflow } from '../../../../lib/code-registry'
import { invalidateTriggerCache } from '../../../../lib/event-trigger-service'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'

const logger = createLogger('workflows')

export const metadata = {
  requireAuth: true,
  requireFeatures: ['workflows.definitions.edit'],
}

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const container = await createRequestContainer()
    const em = container.resolve('em')
    const auth = await getAuthFromRequest(request)

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await resolveOrganizationScopeForRequest({ container, auth, request })
    const tenantId = auth.tenantId
    const organizationId = scope?.selectedId ?? auth.orgId

    if (!params.id.startsWith('code:')) {
      return NextResponse.json(
        { error: 'Customize is only supported for code-based workflow definitions' },
        { status: 400 },
      )
    }

    const workflowId = params.id.slice(5)
    const codeDef = getCodeWorkflow(workflowId)
    if (!codeDef) {
      return NextResponse.json({ error: 'Workflow definition not found' }, { status: 404 })
    }

    const guard = await beginWorkflowsMutationGuard({
      container,
      req: request,
      tenantId,
      organizationId: organizationId ?? null,
      userId: auth.sub ?? '',
      resourceKind: 'workflows.definition',
      resourceId: params.id,
      operation: 'custom',
    })
    if (guard.blockedResponse) {
      return guard.blockedResponse
    }

    const existingOverride = await em.findOne(WorkflowDefinition, {
      workflowId: codeDef.workflowId,
      tenantId,
    })

    let saved: WorkflowDefinition
    if (existingOverride) {
      existingOverride.deletedAt = null
      existingOverride.workflowName = codeDef.workflowName
      existingOverride.description = codeDef.description
      existingOverride.version = codeDef.version
      existingOverride.definition = codeDef.definition
      existingOverride.metadata = codeDef.metadata ?? null
      existingOverride.enabled = codeDef.enabled
      existingOverride.codeWorkflowId = codeDef.workflowId
      existingOverride.updatedBy = auth.sub
      existingOverride.updatedAt = new Date()
      // R2a-custom — customizing materialises a code-defined workflow as a DB row,
      // which then shadows the code version. That change of ownership is exactly
      // the kind of thing an audit trail exists to explain.
      await em.transactional(async () => {
        await em.flush()
        await writeDirectWriteAuditLog({
          container,
          auth,
          organizationId: existingOverride.organizationId ?? null,
          action: 'updated',
          resourceKind: 'workflows.definition',
          resourceId: String(existingOverride.id),
          snapshotAfter: { workflowId: existingOverride.workflowId, customizedFromCode: true },
        })
      })
      saved = existingOverride
    } else {
      const override = em.create(WorkflowDefinition, {
        workflowId: codeDef.workflowId,
        workflowName: codeDef.workflowName,
        description: codeDef.description,
        version: codeDef.version,
        definition: codeDef.definition,
        metadata: codeDef.metadata,
        enabled: codeDef.enabled,
        codeWorkflowId: codeDef.workflowId,
        tenantId,
        organizationId,
        createdBy: auth.sub,
        updatedBy: auth.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.transactional(async () => {
        em.persist(override)
        await em.flush()
        await writeDirectWriteAuditLog({
          container,
          auth,
          organizationId: override.organizationId ?? null,
          action: 'created',
          resourceKind: 'workflows.definition',
          resourceId: String(override.id),
          snapshotAfter: { workflowId: override.workflowId, customizedFromCode: true },
        })
      })
      saved = override
    }

    // Materializing the override moves trigger ownership from the code registry
    // to the new `workflow_definitions` row, so the cached snapshot the wildcard
    // subscriber reads is stale until TRIGGER_CACHE_TTL expires (#4425). Scope
    // the invalidation to the saved row's own organization: reviving an existing
    // override belonging to a sibling organization changes triggers for THAT
    // organization, not for the caller's.
    if (saved.tenantId) invalidateTriggerCache(saved.tenantId, saved.organizationId ?? undefined)

    // The write decides the final id: reviving an existing override keeps its
    // row id; creating one materialises a fresh row id. The guard was validated
    // against `params.id` (the `code:<workflowId>` the client addressed), so the
    // after-success is re-bound to the id that actually landed.
    await guard.runAfterSuccess(String(saved.id))

    try {
      const eventBus = container.resolve('eventBus') as
        | { emitEvent(event: string, payload: unknown, options?: unknown): Promise<void> }
        | undefined
      if (eventBus && typeof eventBus.emitEvent === 'function') {
        await eventBus.emitEvent(
          'workflows.definition.customized',
          {
            id: saved.id,
            workflowId: saved.workflowId,
            codeWorkflowId: saved.codeWorkflowId ?? null,
            tenantId: saved.tenantId,
            organizationId: saved.organizationId,
            userId: auth.sub ?? null,
          },
          { tenantId: saved.tenantId, organizationId: saved.organizationId, persistent: true },
        )
      }
    } catch (eventError) {
      logger.error('Failed to emit workflows.definition.customized event', { err: eventError })
    }

    return NextResponse.json({
      data: serializeWorkflowDefinition(saved),
      message: 'Workflow definition customized successfully',
    })
  } catch (error) {
    logger.error('Error customizing workflow definition', { err: error })
    return NextResponse.json({ error: 'Failed to customize workflow definition' }, { status: 500 })
  }
}

export const openApi = {
  methods: {
    POST: {
      summary: 'Customize code-based workflow definition',
      description: 'Creates a DB override for a code-based workflow definition, seeded from the current code registry values. The id param must be of the form "code:<workflowId>".',
      tags: ['Workflows'],
      pathParams: z.object({
        id: z.string().describe('Must be of the form "code:<workflowId>"'),
      }),
      responses: [
        {
          status: 200,
          description: 'Workflow definition customized successfully',
          example: {
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              workflowId: 'workflows.simple-approval',
              workflowName: 'Simple Approval Workflow',
              source: 'code_override',
            },
            message: 'Workflow definition customized successfully',
          },
        },
        {
          status: 400,
          description: 'Not a code-based id',
          example: { error: 'Customize is only supported for code-based workflow definitions' },
        },
        {
          status: 404,
          description: 'Code workflow not found',
          example: { error: 'Workflow definition not found' },
        },
      ],
    },
  },
}
