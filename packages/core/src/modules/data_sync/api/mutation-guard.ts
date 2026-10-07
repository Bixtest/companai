import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import type { AuthContext } from '@open-mercato/shared/lib/auth/server'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'

type AuthenticatedContext = NonNullable<AuthContext>

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type DataSyncMutationGuardContext = {
  container: AwilixContainer
  auth: AuthenticatedContext
  req: Request
  resourceKind: string
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type DataSyncMutationGuardHandle = {
  blockedResponse: NextResponse | null
  runAfterSuccess: () => Promise<void>
}

function resolveActorUserId(auth: AuthenticatedContext): string {
  return auth.userId ?? auth.sub
}

/**
 * Runs the structural mutation guards for every `data_sync` write.
 *
 * D2 (2026-10-06): this module used to call the `@deprecated`
 * `validateCrudMutationGuard()` / `runCrudMutationGuardAfterSuccess()` pair at 19
 * call sites across 7 route files. That pair resolves ONLY the single
 * DI-registered `crudMutationGuardService` and silently bypasses every guard in
 * the global mutation-guard store, so a module that shipped `data/guards.ts`
 * guards for `data_sync.*` would have them silently ignored.
 *
 * Every `data_sync` write now goes through `runRouteMutationGuards()`, the
 * registry-based wrapper the deprecation notice names as the replacement. That
 * runs every registered guard plus the bridged legacy service
 * (`bridgeLegacyGuard()`), so the legacy behaviour is preserved exactly while
 * registry guards start being enforced.
 *
 * The same wrapper shape is used by the `entities` worked example
 * (`entities/api/definitions.mutation-guard.ts`, commit `d225602`), which is
 * the D2-wide reference implementation.
 */
export async function beginDataSyncMutationGuard(
  ctx: DataSyncMutationGuardContext,
): Promise<DataSyncMutationGuardHandle> {
  const tenantId = ctx.auth.tenantId
  const userId = resolveActorUserId(ctx.auth)
  if (!tenantId) {
    return { blockedResponse: null, runAfterSuccess: async () => undefined }
  }

  const guardResult = await runRouteMutationGuards({
    container: ctx.container,
    req: ctx.req,
    auth: {
      userId,
      tenantId,
      organizationId: ctx.auth.orgId ?? null,
    },
    input: {
      resourceKind: ctx.resourceKind,
      resourceId: ctx.resourceId,
      operation: ctx.operation,
      mutationPayload: ctx.mutationPayload ?? null,
    },
  })

  if (!guardResult.ok || guardResult.escalated) {
    return {
      blockedResponse: NextResponse.json(
        ("errorBody" in guardResult) ? guardResult.errorBody : { status: "pending_review", escalation: guardResult.escalation },
        { status: guardResult.errorStatus },
      ),
      runAfterSuccess: async () => undefined,
    }
  }

  return {
    blockedResponse: null,
    runAfterSuccess: guardResult.runAfterSuccess,
  }
}

/**
 * Convenience wrapper for the common route shape: resolve the container and the
 * authenticated context from the request, then run the guard. Routes that have
 * already resolved a container should call `beginDataSyncMutationGuard()`
 * directly instead, so the same container/EntityManager is reused.
 */
export async function runDataSyncMutationGuard(
  req: Request,
  input: {
    resourceKind: string
    resourceId: string
    operation: GuardOperation
    mutationPayload?: Record<string, unknown> | null
  },
): Promise<DataSyncMutationGuardHandle> {
  const auth = await getAuthFromRequest(req)
  if (!auth?.tenantId || !auth.orgId) {
    return { blockedResponse: null, runAfterSuccess: async () => undefined }
  }
  const container = await createRequestContainer()
  return beginDataSyncMutationGuard({
    container,
    auth,
    req,
    resourceKind: input.resourceKind,
    resourceId: input.resourceId,
    operation: input.operation,
    mutationPayload: input.mutationPayload,
  })
}
