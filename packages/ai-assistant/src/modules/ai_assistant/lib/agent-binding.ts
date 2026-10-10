import type { EntityManager } from '@mikro-orm/postgresql'
import { requirePrincipal, type AuthContext } from '@open-mercato/shared/lib/auth/server'
import { AiAgentBindingRepository } from '../data/repositories/AiAgentBindingRepository'
import { getAgent } from './agent-registry'

/**
 * The resolved binding for one `(principal, agent)` pair.
 *
 * `bound: false` means the caller (an AI worker) may NOT run this agent — the
 * route refuses with `agent_not_bound`. `bound: true` carries the **narrowing**
 * the binding contributes (never a widening, `B3`).
 */
export type ResolvedAgentBinding =
  | { bound: false; reason: 'no_binding' | 'not_ai_worker' }
  | {
      bound: true
      toolAllowlist: string[] | null
      requiredFeatures: string[]
    }

/**
 * Resolves whether an AI-user principal may run a given agent, from the DB.
 *
 * **Enforcement is fail-closed for AI workers** (owner ruling 2026-10-11): when
 * the acting principal is `ai_worker` and there is no live `ai_agent_bindings`
 * row for `(principalId, agentId)` in the caller's tenant/org, `bound` is false.
 *
 * A **human** principal is never bound here — humans keep today's behaviour
 * (`B4`), so the resolver returns `{ bound: true, … }` with nothing added.
 *
 * The agent's **definition** is read from code via `getAgent` (never the DB,
 * `B5`); only the **binding** comes from the DB.
 */
export async function resolveAgentBinding(input: {
  em: EntityManager
  auth: AuthContext
  agentId: string
}): Promise<ResolvedAgentBinding> {
  const { em, auth, agentId } = input
  const principal = requirePrincipal(auth)

  // Human (or unknown) principals are not subject to the binding check.
  if (!principal || principal.kind !== 'ai_worker') {
    return { bound: true, toolAllowlist: null, requiredFeatures: [] }
  }

  const ctx = {
    tenantId: auth?.tenantId ?? '',
    organizationId: auth?.orgId ?? null,
  }
  if (!ctx.tenantId) {
    // No tenant ⇒ no scope to resolve a binding in ⇒ fail closed for a machine.
    return { bound: false, reason: 'no_binding' }
  }

  const repo = new AiAgentBindingRepository(em)
  const binding = await repo.findBinding(principal.id, agentId, ctx)
  if (!binding) {
    return { bound: false, reason: 'no_binding' }
  }

  return {
    bound: true,
    toolAllowlist: binding.toolAllowlist ?? null,
    requiredFeatures: binding.requiredFeatures ?? [],
  }
}

/**
 * Computes the effective, **narrowing-only** enforcement inputs for a run.
 *
 * - **Tools:** `agent.allowedTools ∩ binding.toolAllowlist` when the binding
 *   names a subset; the agent's full list when the binding is `null`. A binding
 *   can never add a tool the agent did not declare (`B3`).
 * - **Features:** `agent.requiredFeatures ∪ binding.requiredFeatures` — the union,
 *   so a binding can only ADD a requirement, never remove one (`B3`).
 *
 * Pure and synchronous so it is trivially testable; the DB read is the caller's.
 */
export function computeBoundRunScope(input: {
  agentId: string
  binding: Extract<ResolvedAgentBinding, { bound: true }>
}): { allowedTools: string[]; requiredFeatures: string[] } {
  const agent = getAgent(input.agentId)
  const declaredTools = agent?.allowedTools ?? []
  const declaredFeatures = agent?.requiredFeatures ?? []

  const allowedTools =
    input.binding.toolAllowlist === null
      ? [...declaredTools]
      : declaredTools.filter((tool) => input.binding.toolAllowlist!.includes(tool))

  const requiredFeatures = Array.from(
    new Set([...declaredFeatures, ...input.binding.requiredFeatures]),
  )

  return { allowedTools, requiredFeatures }
}
