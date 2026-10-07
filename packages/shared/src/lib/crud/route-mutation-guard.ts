import type { AwilixContainer } from 'awilix'
import {
  bridgeLegacyGuard,
  runMutationGuards,
  type MutationGuard,
  type MutationGuardEscalation,
} from './mutation-guard-registry'
import { getAllMutationGuardInstances } from './mutation-guard-store'
import { createLogger } from '../logger'

const logger = createLogger('shared').child({ component: 'crud' })

/**
 * Shared registry-based mutation-guard wrapper for custom write routes that do
 * not use `makeCrudRoute`.
 *
 * This mirrors `collectAndRunGuards()` in `factory.ts`: it runs **every** guard
 * collected from the global mutation-guard store (`getAllMutationGuardInstances()`)
 * plus the bridged legacy DI service (`bridgeLegacyGuard()`), so a custom route
 * enforces the same guard set as every `makeCrudRoute` write.
 *
 * Prefer this over the deprecated `validateCrudMutationGuard()` /
 * `runCrudMutationGuardAfterSuccess()` pair, which resolve only the single
 * DI-registered `crudMutationGuardService` and silently skip registry guards.
 */

export type RouteMutationGuardOperation = 'create' | 'update' | 'delete' | 'custom'

export type RouteMutationGuardAuth = {
  userId: string
  tenantId: string
  organizationId?: string | null
  /**
   * Pre-resolved granted features for the caller. When omitted, the wrapper
   * resolves them via `rbacService.getGrantedFeatures` (same source the CRUD
   * factory uses). Feature-gated registry guards only run when their required
   * features are present, so supplying the wrong set silently skips guards.
   */
  userFeatures?: string[]
}

export type RouteMutationGuardInput = {
  resourceKind: string
  resourceId?: string | null
  /**
   * The route's logical operation. `'custom'` (state-changing action endpoints)
   * is mapped to the closest registry operation, `'update'`, because
   * `runMutationGuards` only understands `create | update | delete`.
   */
  operation?: RouteMutationGuardOperation
  mutationPayload?: Record<string, unknown> | null
}

export type RouteMutationGuardBlocked = {
  ok: false
  /**
   * Discriminant, present on **all three** variants so a caller can narrow with a
   * plain `if (result.escalated)` / `if (!result.ok || result.escalated)`.
   * TypeScript narrows on a literal-typed field only when every member declares
   * it, so `false` here is not decoration — it is what makes the escalate branch
   * reachable in one condition instead of an `'escalated' in result` dance.
   */
  escalated: false
  errorStatus: number
  errorBody: Record<string, unknown>
  /** Ready-to-return JSON response built from `errorBody` / `errorStatus`. */
  response: Response
}

/**
 * D3 — a guard asked for a review: the mutation did **not** run, and a person
 * must decide. Distinct from `Blocked` (a refusal) and from `Passed` (ran).
 *
 * The discriminant is `escalated: true`, so a caller that only checks `ok` sees
 * `ok:true` and **must not** read that as "the write landed" — it did not. That
 * is why this type carries no `modifiedPayload` and no `runAfterSuccess`: there
 * is nothing that ran, and offering either would be an invitation to commit
 * uncommitted work. A ready `response` is provided for the common case.
 */
export type RouteMutationGuardEscalated = {
  escalated: true
  ok: true
  errorStatus: number
  /** The guard's reason, in the platform's decision vocabulary. */
  escalation: MutationGuardEscalation
  /** Ready-to-return JSON response describing the pending review. */
  response: Response
}

export type RouteMutationGuardPassed = {
  ok: true
  /** Discriminant — see {@link RouteMutationGuardBlocked}. */
  escalated: false
  /** Merged payload when a guard transformed it; `undefined` when unchanged. */
  modifiedPayload?: Record<string, unknown>
  /**
   * Runs every guard's `afterSuccess` callback that requested it. Callback
   * failures are caught and logged so a committed write still succeeds — call
   * this only after the mutation has committed.
   */
  runAfterSuccess: () => Promise<void>
}

export type RouteMutationGuardResult =
  | RouteMutationGuardBlocked
  | RouteMutationGuardEscalated
  | RouteMutationGuardPassed

type RbacServiceLike = {
  getGrantedFeatures: (
    userId: string,
    opts: { tenantId: string | null; organizationId: string | null },
  ) => Promise<string[]>
}

/**
 * Map a route-level operation to the registry operation set. State-changing
 * action endpoints (`'custom'`) and `'update'` both map to `'update'` per the
 * `packages/core/AGENTS.md` → API Routes guidance.
 */
export function toRegistryMutationOperation(
  operation: RouteMutationGuardOperation | undefined,
): 'create' | 'update' | 'delete' {
  if (operation === 'create' || operation === 'delete') return operation
  return 'update'
}

async function resolveRouteUserFeatures(
  container: AwilixContainer,
  auth: RouteMutationGuardAuth,
): Promise<string[]> {
  if (auth.userFeatures) return auth.userFeatures
  try {
    const rbac = container.resolve('rbacService') as RbacServiceLike | undefined
    if (rbac?.getGrantedFeatures) {
      return await rbac.getGrantedFeatures(auth.userId, {
        tenantId: auth.tenantId,
        organizationId: auth.organizationId ?? null,
      })
    }
  } catch {
    // rbacService not available — guards without feature requirements still run.
  }
  return []
}

/**
 * Collect every registered mutation guard plus the bridged legacy DI service,
 * run them against the route's mutation, and return either a blocked result
 * (with a ready response) or a passed result carrying the merged payload and an
 * after-success runner.
 */
export async function runRouteMutationGuards(params: {
  container: AwilixContainer
  req: Request
  auth: RouteMutationGuardAuth
  input: RouteMutationGuardInput
}): Promise<RouteMutationGuardResult> {
  const { container, req, auth, input } = params
  const operation = toRegistryMutationOperation(input.operation)

  const allGuards: MutationGuard[] = [...getAllMutationGuardInstances()]
  const legacyGuard = bridgeLegacyGuard(container)
  if (legacyGuard) allGuards.push(legacyGuard)

  const userFeatures = await resolveRouteUserFeatures(container, auth)

  const guardResult = await runMutationGuards(
    allGuards,
    {
      tenantId: auth.tenantId,
      organizationId: auth.organizationId ?? null,
      userId: auth.userId,
      resourceKind: input.resourceKind,
      resourceId: input.resourceId ?? null,
      operation,
      requestMethod: req.method,
      requestHeaders: req.headers,
      mutationPayload: input.mutationPayload ?? null,
    },
    { userFeatures },
  )

  if (!guardResult.ok) {
    const errorStatus = guardResult.errorStatus ?? 422
    const errorBody = guardResult.errorBody ?? { error: 'Operation blocked by guard' }
    return {
      ok: false,
      escalated: false,
      errorStatus,
      errorBody,
      response: Response.json(errorBody, { status: errorStatus }),
    }
  }

  // D3: a guard asked for a review. Return before the passed branch, so no
  // caller can mistake "held for a person" for "the write went through". The
  // status defaults to 202 Accepted — the request was understood and *held*, not
  // performed — carried in the guard's own vocabulary (`gate`, `rule`, `because`).
  if (guardResult.escalation) {
    const escalation = guardResult.escalation
    const errorStatus = escalation.status ?? 202
    const errorBody = {
      status: 'pending_review',
      escalation: {
        gate: escalation.gate,
        rule: escalation.rule,
        because: escalation.because,
      },
    }
    return {
      escalated: true,
      ok: true,
      errorStatus,
      escalation,
      response: Response.json(errorBody, { status: errorStatus }),
    }
  }

  return {
    ok: true,
    escalated: false,
    modifiedPayload: guardResult.modifiedPayload,
    runAfterSuccess: async () => {
      for (const { guard, metadata } of guardResult.afterSuccessCallbacks) {
        try {
          await guard.afterSuccess!({
            tenantId: auth.tenantId,
            organizationId: auth.organizationId ?? null,
            userId: auth.userId,
            resourceKind: input.resourceKind,
            resourceId: input.resourceId ?? '',
            operation,
            requestMethod: req.method,
            requestHeaders: req.headers,
            metadata,
          })
        } catch (error) {
          logger.error('Mutation guard afterSuccess failed', { guardId: guard.id, err: error })
        }
      }
    },
  }
}
