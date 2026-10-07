import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getIntegration } from '@open-mercato/shared/modules/integrations/types'
import { enforceCommandOptimisticLock } from '@open-mercato/shared/lib/crud/optimistic-lock-command'
import { isCrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import { emitIntegrationsEvent } from '../../../events'
import { updateStateSchema } from '../../../data/validators'
import type { IntegrationStateService } from '../../../lib/state-service'
import {
  resolveUserFeatures,
  runIntegrationMutationGuardAfterSuccess,
  runIntegrationMutationGuards,
} from '../../guards'
import { resolveIntegrationsOrganizationId } from '../../../lib/organization-scope'
import { writeDirectWriteAuditLog } from '@open-mercato/shared/lib/crud/audit-write'
import type { EntityManager } from '@mikro-orm/postgresql'

const idParamsSchema = z.object({ id: z.string().min(1) })

export const metadata = {
  PUT: { requireAuth: true, requireFeatures: ['integrations.manage'] },
}

export const openApi = {
  tags: ['Integrations'],
  summary: 'Update integration state',
}

export async function PUT(req: Request, ctx: { params?: Promise<{ id?: string }> | { id?: string } }) {
  const auth = await getAuthFromRequest(req)
  const organizationId = resolveIntegrationsOrganizationId(auth)
  if (!auth?.tenantId || !organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawParams = (ctx.params && typeof (ctx.params as Promise<unknown>).then === 'function')
    ? await (ctx.params as Promise<{ id?: string }>)
    : (ctx.params as { id?: string } | undefined)

  const parsedParams = idParamsSchema.safeParse(rawParams)
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid integration id' }, { status: 400 })
  }

  const integration = getIntegration(parsedParams.data.id)
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  const payload = await req.json().catch(() => null)
  const parsedBody = updateStateSchema.safeParse(payload)
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Invalid state payload', details: parsedBody.error.flatten() }, { status: 422 })
  }

  const container = await createRequestContainer()
  const guardResult = await runIntegrationMutationGuards(
    container,
    {
    tenantId: auth.tenantId,
    organizationId,
    userId: auth.sub ?? '',
    resourceKind: 'integrations.integration',
    resourceId: integration.id,
    operation: 'update',
    requestMethod: req.method,
    requestHeaders: req.headers,
    mutationPayload: parsedBody.data as Record<string, unknown>,
    },
    resolveUserFeatures(auth),
  )
  if (!guardResult.ok || guardResult.escalation) {
    // D3: an escalate is ok:true — return before the mutation runs.
    if (guardResult.escalation) {
      return NextResponse.json({ status: 'pending_review', escalation: guardResult.escalation }, { status: guardResult.escalation.status ?? 202 })
    }
    return NextResponse.json(guardResult.errorBody ?? { error: 'Operation blocked by guard' }, { status: guardResult.errorStatus ?? 422 })
  }

  let payloadData = parsedBody.data
  if (guardResult.modifiedPayload) {
    const mergedPayload = { ...parsedBody.data, ...guardResult.modifiedPayload }
    const reparsed = updateStateSchema.safeParse(mergedPayload)
    if (!reparsed.success) {
      return NextResponse.json({ error: 'Invalid state payload after guard transform', details: reparsed.error.flatten() }, { status: 422 })
    }
    payloadData = reparsed.data
  }

  const stateService = container.resolve('integrationStateService') as IntegrationStateService
  const stateScope = { organizationId: organizationId, tenantId: auth.tenantId }

  try {
    const current = await stateService.resolveState(integration.id, stateScope)
    enforceCommandOptimisticLock({
      resourceKind: 'integrations.integration',
      resourceId: integration.id,
      current: current.updatedAt,
      request: req,
    })
  } catch (error) {
    if (isCrudHttpError(error)) {
      return NextResponse.json(error.body, { status: error.status })
    }
    throw error
  }

  // R2a-custom — enabling or disabling an integration, and flagging it for
  // re-authentication, change what this platform may do against an external
  // system. Recorded with the audit entry inside the same transaction.
  const em = container.resolve('em') as EntityManager
  const state = await em.transactional(async () => {
    const next = await stateService.upsert(
      integration.id,
      {
        isEnabled: payloadData.isEnabled,
        reauthRequired: payloadData.reauthRequired,
      },
      stateScope,
    )
    await writeDirectWriteAuditLog({
      container,
      auth,
      organizationId,
      action: 'updated',
      resourceKind: 'integrations.state',
      resourceId: integration.id,
      snapshotAfter: { isEnabled: next.isEnabled, reauthRequired: next.reauthRequired },
    })
    return next
  })

  await emitIntegrationsEvent('integrations.state.updated', {
    integrationId: integration.id,
    isEnabled: state.isEnabled,
    reauthRequired: state.reauthRequired,
    tenantId: auth.tenantId,
    organizationId,
    userId: auth.sub,
  })

  await runIntegrationMutationGuardAfterSuccess(guardResult.afterSuccessCallbacks, {
      tenantId: auth.tenantId,
      organizationId,
      userId: auth.sub ?? '',
      resourceKind: 'integrations.integration',
      resourceId: integration.id,
      operation: 'update',
      requestMethod: req.method,
      requestHeaders: req.headers,
    })

  return NextResponse.json({
    isEnabled: state.isEnabled,
    reauthRequired: state.reauthRequired,
    apiVersion: state.apiVersion ?? null,
    updatedAt: state.updatedAt?.toISOString() ?? null,
  })
}
