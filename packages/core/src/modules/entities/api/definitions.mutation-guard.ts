import { NextResponse } from 'next/server'
import type { AwilixContainer } from 'awilix'
import type { AuthContext } from '@open-mercato/shared/lib/auth/server'
import { runRouteMutationGuards } from '@open-mercato/shared/lib/crud/route-mutation-guard'

export const ENTITY_DEFINITION_RESOURCE_KIND = 'entities.entity'
export const FIELD_DEFINITION_RESOURCE_KIND = 'entities.field_definition'

type AuthenticatedContext = NonNullable<AuthContext>

type GuardOperation = 'create' | 'update' | 'delete' | 'custom'

type EntitiesMutationGuardContext = {
  container: AwilixContainer
  auth: AuthenticatedContext
  req: Request
  resourceKind: string
  resourceId: string
  operation: GuardOperation
  mutationPayload?: Record<string, unknown> | null
}

type EntitiesMutationGuardHandle = {
  blockedResponse: NextResponse | null
  runAfterSuccess: () => Promise<void>
}

function resolveActorUserId(auth: AuthenticatedContext): string {
  return auth.userId ?? auth.sub
}

/**
 * Runs the structural mutation guards for every entity / field-definition write.
 *
 * D2 (2026-10-06): this used to call the `@deprecated` `validateCrudMutationGuard()`,
 * which resolves ONLY the single DI-registered `crudMutationGuardService` and
 * silently bypasses every guard in the global mutation-guard store. The effect
 * was that a module could ship `data/guards.ts` guards for `entities.entity` /
 * `entities.field_definition` and they would never run on this path.
 *
 * It now goes through `runRouteMutationGuards()`, the registry-based wrapper the
 * deprecation notice names as the replacement. That runs every registered guard
 * plus the bridged legacy service (`bridgeLegacyGuard()`), so the legacy
 * behaviour is preserved exactly while the registry guards start being enforced.
 */
export async function beginEntitiesMutationGuard(
  ctx: EntitiesMutationGuardContext,
): Promise<EntitiesMutationGuardHandle> {
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

