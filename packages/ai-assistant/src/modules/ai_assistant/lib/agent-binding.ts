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
 * Resolves whether a machine principal may run a given agent, from the DB.
 *
 * **Enforcement is fail-closed for every machine** (owner ruling 2026-10-11;
 * widened to `service`/`system` by `CC-103`): only a **human** runs an agent
 * directly. Every other kind — `ai_worker`, `service`, `system`, and any kind
 * added later — must hold a live `ai_agent_bindings` row for
 * `(principalId, agentId)` in the caller's tenant/org, or `bound` is false.
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

  // A principal that cannot be derived at all is **nobody** — an empty or
  // whitespace-only subject identifies no person and no machine. Treating that as
  // a human passthrough would be a fail-OPEN (the binding is a grant, and an
  // unidentifiable actor holds none), so refuse. This closes the path where a
  // blank subject reached the human branch and skipped the check entirely.
  if (!principal) {
    return { bound: false, reason: 'no_binding' }
  }

  // A human runs agents directly — the binding table governs machines (`B4`).
  //
  // ★ `CC-103`: the test is for the ONE kind that passes, not the one that
  // fails. The previous form was `if (principal.kind !== 'ai_worker')`, which
  // admitted `service` and `system` as well — and a `service` key with
  // `ai_assistant.view` could therefore run any agent unbound, with the full
  // declared tool list (`computeBoundRunScope` reads `toolAllowlist: null` as
  // "no narrowing"). Testing for `human` puts every unknown future kind on the
  // deny side by construction, which is the posture the donor states as
  // "private (or any unknown mode) is deny-by-default".
  if (principal.kind === 'human') {
    return { bound: true, toolAllowlist: null, requiredFeatures: [] }
  }

  // Every other kind is a machine. Only an `ai_worker` can hold a binding, so a
  // `service`/`system` principal is refused here rather than passed through: the
  // binding is a grant, and a credential that cannot be bound holds none. This
  // finally produces `not_ai_worker`, the reason this type has always declared.
  if (principal.kind !== 'ai_worker') {
    return { bound: false, reason: 'not_ai_worker' }
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
