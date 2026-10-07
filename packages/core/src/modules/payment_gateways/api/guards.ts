import type { AwilixContainer } from 'awilix'
import {
  bridgeLegacyGuard,
  runMutationGuards,
  type MutationGuard,
  type MutationGuardInput,
  type MutationGuardRunResult,
} from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { getAllMutationGuardInstances } from '@open-mercato/shared/lib/crud/mutation-guard-store'

type GuardAfterCallback = {
  guard: MutationGuard
  metadata: Record<string, unknown> | null
}

export function resolveUserFeatures(auth: unknown): string[] {
  const features = (auth as { features?: unknown })?.features
  if (!Array.isArray(features)) return []
  return features.filter((value): value is string => typeof value === 'string')
}

export async function runPaymentGatewayMutationGuards(
  container: AwilixContainer,
  input: MutationGuardInput,
  userFeatures: string[],
): Promise<MutationGuardRunResult> {
  // Run every guard from the global mutation-guard store, plus the bridged
  // legacy DI service — the same set `makeCrudRoute` writes enforce
  // (`collectAndRunGuards()` in `crud/factory.ts`). Previously this ran ONLY
  // the legacy bridge, silently skipping every registry guard. Same defect as
  // `messages/api/guards.ts`; the module is not enabled today, so the hole was
  // unreachable — fixed now rather than left for the day it is enabled.
  const allGuards: MutationGuard[] = [...getAllMutationGuardInstances()]
  const legacyGuard = bridgeLegacyGuard(container)
  if (legacyGuard) allGuards.push(legacyGuard)
  if (allGuards.length === 0) {
    return { ok: true, afterSuccessCallbacks: [] }
  }

  return runMutationGuards(allGuards, input, { userFeatures })
}

export async function runPaymentGatewayMutationGuardAfterSuccess(
  callbacks: GuardAfterCallback[],
  input: {
    tenantId: string
    organizationId: string | null
    userId: string
    resourceKind: string
    resourceId: string
    operation: 'create' | 'update' | 'delete'
    requestMethod: string
    requestHeaders: Headers
  },
): Promise<void> {
  for (const callback of callbacks) {
    if (!callback.guard.afterSuccess) continue
    await callback.guard.afterSuccess({
      ...input,
      metadata: callback.metadata ?? null,
    })
  }
}
