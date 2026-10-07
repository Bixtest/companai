/**
 * Retry Workflow Instance API
 *
 * Endpoint:
 * - POST /api/workflows/instances/[id]/retry - Retry a failed workflow instance
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { resolveOrganizationScopeForRequest } from '@open-mercato/core/modules/directory/utils/organizationScope'
import { findOneWithDecryption } from '@open-mercato/shared/lib/encryption/find'
import { WorkflowInstance } from '../../../../data/entities'
import * as workflowExecutor from '../../../../lib/workflow-executor'
import { workflowInstanceResponseSchema, workflowExecutionResultSchema } from '../../../openapi'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import { beginWorkflowsMutationGuard } from '../../../mutation-guard'

const logger = createLogger('workflows')

export const metadata = {
  requireAuth: true,
  requireFeatures: ['workflows.instances.retry'],
}

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/workflows/instances/[id]/retry
 *
 * Retry a failed workflow instance
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
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

    if (!tenantId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing tenant or organization context' },
        { status: 400 }
      )
    }

    // Check retry permission
    const rbacService = container.resolve('rbacService')
    const hasPermission = await rbacService.userHasAllFeatures(
      auth.sub,
      ['workflows.instances.retry'],
      {
        tenantId,
        organizationId,
      }
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const instance = await findOneWithDecryption(em, WorkflowInstance, {
      id: params.id,
      tenantId,
      organizationId,
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Workflow instance not found' },
        { status: 404 }
      )
    }

    // Check if instance can be retried
    if (instance.status !== 'FAILED') {
      return NextResponse.json(
        {
          error: `Cannot retry workflow in ${instance.status} status. Only FAILED workflows can be retried.`,
        },
        { status: 400 }
      )
    }

    const previousErrorMessage = instance.errorMessage
    const previousErrorDetails = instance.errorDetails

    // Structural guard, after auth/permission and the status gate, before the
    // retry mutates state — a blocked guard does not re-run the instance.
    const guard = await beginWorkflowsMutationGuard({
      container,
      req: request,
      tenantId,
      organizationId: organizationId ?? null,
      userId: auth.sub ?? '',
      resourceKind: 'workflows.instance',
      resourceId: params.id,
      operation: 'update',
    })
    if (guard.blockedResponse) {
      return guard.blockedResponse
    }

    instance.status = 'RUNNING'
    instance.retryCount = (instance.retryCount || 0) + 1
    instance.errorMessage = null
    instance.errorDetails = null
    instance.updatedAt = new Date()

    // R2a-custom — audits the RETRY DECISION, not the execution that follows.
    // `executeWorkflow` below runs activities that may call external systems and
    // take arbitrarily long; holding a database transaction across it would be a
    // worse defect than the one being fixed. The auditable fact is that a person
    // re-ran a failed workflow instance, and that is recorded here atomically
    // with the status change it causes.
    await em.transactional(async () => {
      await em.flush()
      await writeDirectWriteAuditLog({
        container,
        auth,
        organizationId: instance.organizationId ?? null,
        action: 'updated',
        resourceKind: 'workflows.instance',
        resourceId: String(instance.id),
        snapshotBefore: { status: 'FAILED', errorMessage: previousErrorMessage },
        snapshotAfter: { status: 'RUNNING', retryCount: instance.retryCount },
      })
    })

    let result
    try {
      result = await workflowExecutor.executeWorkflow(em, container, instance.id)
    } catch (executionError) {
      instance.status = 'FAILED'
      instance.errorMessage = previousErrorMessage
      instance.errorDetails = previousErrorDetails
      instance.updatedAt = new Date()
      await em.flush()
      throw executionError
    }

    await em.refresh(instance)

    await guard.runAfterSuccess(String(instance.id))

    return NextResponse.json({
      data: {
        instance,
        execution: result,
      },
      message: 'Workflow retry initiated successfully',
    })
  } catch (error) {
    logger.error('Error retrying workflow instance', { err: error })

    // Handle specific errors
    if (error instanceof workflowExecutor.WorkflowExecutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to retry workflow instance' },
      { status: 500 }
    )
  }
}

export const openApi = {
  methods: {
    POST: {
      summary: 'Retry failed workflow instance',
      description: 'Retry a failed workflow instance from its current step. The workflow will be reset to RUNNING status and execution will continue.',
      tags: ['Workflows'],
      params: z.object({
        id: z.string().uuid(),
      }),
      responses: [
        {
          status: 200,
          description: 'Workflow retry initiated successfully',
          schema: z.object({
            data: z.object({
              instance: workflowInstanceResponseSchema,
              execution: workflowExecutionResultSchema,
            }),
            message: z.string(),
          }),
        },
        {
          status: 400,
          description: 'Bad request - Workflow cannot be retried in current status or execution error',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 401,
          description: 'Unauthorized',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 403,
          description: 'Forbidden - Insufficient permissions',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 404,
          description: 'Workflow instance not found',
          schema: z.object({ error: z.string() }),
        },
        {
          status: 500,
          description: 'Internal server error',
          schema: z.object({ error: z.string() }),
        },
      ],
    },
  },
}
