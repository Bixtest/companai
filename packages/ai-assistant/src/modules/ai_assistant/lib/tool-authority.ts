import { createLogger } from '@open-mercato/shared/lib/logger'
import type { Decision } from '@open-mercato/shared/lib/authority/decision'
import type { McpToolContext } from './types'

const logger = createLogger('ai_assistant').child({ component: 'tool-authority' })

/**
 * The shape of `AuthorityEnforcementService` this module needs — declared
 * structurally rather than imported, because `ai-assistant` does not depend on
 * `@open-mercato/core` at build time and the service is resolved from the
 * container at call time.
 *
 * Only the three members used here are named. A narrower type than the class is
 * deliberate: it makes the surface this module relies on readable, and it means a
 * change to any other part of the enforcement service cannot break the tool door.
 */
export type ToolAuthorityResolver = {
  modeFor: (tenantId: string | null) => Promise<'off' | 'shadow' | 'enforce'>
  decideFor: (
    subject: string,
    feature: string,
    scope: { tenantId: string | null; organizationId: string | null },
    options?: { onBehalfOfUserId?: string | null; recordId?: string | null },
  ) => Promise<Decision | null>
}

/**
 * The person a machine actor acts *for* — the responsible-user intersection
 * (S-02).
 *
 * An API key or an AI worker acts on behalf of the person it was issued for, and
 * its authority is the **intersection** of its own and that person's. The person
 * arrives on the context as `onBehalfOfUserId`, which the auth boundary resolves
 * (`principal.onBehalfOfUserId`); the door passes it straight through.
 *
 * **`onBehalfOfUserId` is authoritative when present.** It is the field the auth
 * layer fills from `principal.onBehalfOfUserId`, and it is the *only* thing here
 * that names a person. This function never invents one.
 *
 * **Why it is not derived from `userId`.** Measured across the door's
 * construction sites, `userId` is *inconsistent*: `tools/execute/route.ts` and
 * `mcp-server.ts` store the **subject** (`apikey:<id>`, via `auth.sub` /
 * `apiKeySubject`), while `http-server.ts` stores a **real user id**
 * (`sessionUserId ?? createdBy`). So `userId` cannot be read as either without
 * being wrong somewhere. Deriving from it would name a credential as a person at
 * some sites and miss the intersection at others. Absent is honest; invented is
 * not — and an absent invoker makes the resolver judge the machine on its own,
 * which is narrower, never wider.
 *
 * **Null when the person *is* the actor.** Capping an actor by itself would apply
 * every rule twice — the same reasoning `invokerCeilingFor` uses when it returns
 * `null`.
 */
function responsibleUserIdFor(context: McpToolContext): string | null {
  const person = context.onBehalfOfUserId ?? null
  if (!person) return null
  // The actor acting as themselves is not carrying anybody's authority.
  if (person === context.userId) return null
  return person
}

/** The outcome of the door's authority check. */
export type ToolAuthorityVerdict =
  | { kind: 'permit' }
  | { kind: 'hold'; gate: string; bindingRule: string; because: string | null }
  | { kind: 'refuse'; gate: string; bindingRule: string; because: string | null }

/** A gate that has to be answered by a person before the act may run. */
const HELD_GATES = new Set(['A1', 'A2', 'A3'])
/** `A0` — the actor may not perform the act at all. */
const REFUSAL_GATE = 'A0'

/**
 * Whether the resolver lets a tool call through — the S-02 enforcement point.
 *
 * ## What this is for
 *
 * Until this landed, the Hermes tool door authorized a call with a **parallel**
 * check the resolver never saw: `executeTool` asked
 * `rbacService.hasAllFeatures(required, granted)`, a synchronous string match
 * over the actor's granted feature strings (`tool-executor.ts` → `auth.ts:146`).
 * The authority resolver — the one decider every other act goes through, and the
 * only place the responsible-user intersection is computed — was never consulted.
 * A tool call was, measurably, not authorized by the same `Decision` as a command.
 *
 * This function is that missing call. It does **not** reimplement any rule: it
 * asks the same `AuthorityEnforcementService` the command gate and the HTTP RBAC
 * path ask, and reads the same `Decision`. It is called from **both** places a
 * tool handler runs — `executeTool` (every HTTP/MCP/agent call) and the
 * pending-action executor (the human-confirm path) — because a handler that runs
 * is a tool call whatever door it came through.
 *
 * **The invoker is carried where the surface has one.** This function passes
 * `onBehalfOfUserId` through to `decideFor`, matching the command gate
 * (`interceptors.ts`). Every door that resolves a machine subject supplies it:
 * `executeTool`'s route/MCP callers (`tools/execute`, `chat`, `run-object`,
 * `confirm`), and the MCP server doors (`mcp-server`, `mcp-dev-server`,
 * `in-process-client`) via `authenticateMcpRequest`. `http-server` needs none —
 * it puts a **real user id** in `userId`, so the actor already *is* the person
 * and there is nobody to intersect with. The HTTP RBAC path (`refusalFor`) is the
 * one place that does not pass an invoker; it resolves the actor alone, which is
 * its own pre-existing behaviour, not this door's.
 *
 * **Direction, stated correctly.** Supplying an invoker can only **lower** the
 * gate — it is one more ceiling in a minimum. *Omitting* it therefore yields the
 * actor-alone gate, which is **≥** the intersected gate: **wider**, not narrower.
 * That is why a door that drops the field is an I4 gap, and why the MCP doors were
 * given it rather than left as they were.
 *
 * ## It can only narrow
 *
 * It runs **after** RBAC has already said yes, and it has no path that produces
 * an allowance RBAC did not give — every branch either returns `permit` (this
 * function adds nothing) or removes the act. That is invariant **I4** made
 * structural: *"could this grant something?"* is answerable by reading the type.
 *
 * ## Fail closed
 *
 * This is the one place in the codebase that fails **closed** where the command
 * gate fails **open**. The command gate skips when no dependency is registered
 * (*"a lean bootstrap has nothing to gate with"*). The tool door does not, because
 * the source study named this exact surface and its warning is verbatim: *"fail
 * closed, or do not ship the switch."* A gate that silently disables itself when
 * its dependency is missing is the failure the warning describes.
 *
 * Precisely: when the resolver cannot be **reached** — the container has no
 * `authorityEnforcement`, or `modeFor`/`decideFor` throws — the call is refused,
 * because the mode itself is unreadable and the strictest reading is the only
 * safe one. When the resolver *is* reachable and the tenant is `off`, the call is
 * permitted; when the tenant is `shadow`, the decision is logged and the call is
 * permitted. `shadow` observes and records, which is what makes turning `enforce`
 * on a decision a tenant can make against their own evidence.
 *
 * ## Undescribed capabilities are a coverage gap, not a refusal
 *
 * A feature with no `CapabilityDescriptor` yields `null` from `decideFor`, and
 * the call is permitted exactly as RBAC left it. The command gate takes the same
 * position; enforcing on absence would make every wildcard grant a denial, which
 * is a migration failure dressed as a security control.
 */
export async function checkToolAuthority(
  toolName: string,
  requiredFeatures: string[] | undefined,
  context: McpToolContext,
): Promise<ToolAuthorityVerdict> {
  if (!requiredFeatures?.length) return { kind: 'permit' }
  // No subject to resolve against — nothing to ask the resolver about. RBAC has
  // already made its decision; this is not the door's question to answer.
  const subject = context.userId
  if (!subject) return { kind: 'permit' }

  let resolver: ToolAuthorityResolver | null = null
  let mode: 'off' | 'shadow' | 'enforce' = 'shadow'
  try {
    resolver = context.container.resolve('authorityEnforcement') as ToolAuthorityResolver
    mode = await resolver.modeFor(context.tenantId)
  } catch (error) {
    // The dependency could not be reached. In `enforce` this is a refusal — see
    // the header. The mode is unknown here, so it is read as the strictest
    // position the platform ships with a switch for, and the call is refused;
    // `off`/`shadow` deployments never reach this branch with `enforce`
    // semantics because `modeFor` is the thing that failed.
    logger.error('Tool authority: enforcement service unreachable; failing closed', {
      toolName,
      err: error,
    })
    return {
      kind: 'refuse',
      gate: 'A0',
      bindingRule: 'enforcement-unreachable',
      because: 'The authority resolver could not be reached, so the act was refused rather than run ungoverned.',
    }
  }

  if (!resolver || mode === 'off') return { kind: 'permit' }

  const scope = { tenantId: context.tenantId, organizationId: context.organizationId }
  const onBehalfOfUserId = responsibleUserIdFor(context)

  for (const feature of requiredFeatures) {
    let decision: Decision | null
    try {
      decision = await resolver.decideFor(subject, feature, scope, { onBehalfOfUserId })
    } catch (error) {
      logger.error('Tool authority: resolution threw; failing closed', { toolName, feature, err: error })
      return {
        kind: 'refuse',
        gate: 'A0',
        bindingRule: 'enforcement-error',
        because: 'The authority resolver failed, so the act was refused rather than run ungoverned.',
      }
    }

    // No descriptor for this feature — a coverage gap, not a refusal.
    if (!decision) continue

    const binding = decision.reasons.find((reason) => reason.rule === decision.bindingRule) ?? null
    const because = binding?.detail ?? null

    if (mode === 'shadow') {
      // Observe and record, change nothing. This is what produces the evidence a
      // tenant needs before turning `enforce` on.
      if (!decision.allowed || decision.gate !== 'A5') {
        logger.info('Tool authority (shadow): resolver would have gated this call', {
          toolName,
          feature,
          gate: decision.gate,
          bindingRule: decision.bindingRule,
        })
      }
      continue
    }

    // `enforce`.
    if (decision.gate === REFUSAL_GATE || !decision.allowed) {
      logger.warn('Tool authority: refused', {
        toolName,
        feature,
        gate: decision.gate,
        bindingRule: decision.bindingRule,
      })
      return { kind: 'refuse', gate: decision.gate, bindingRule: decision.bindingRule, because }
    }

    if (HELD_GATES.has(decision.gate)) {
      // A tool call is not a bus command, so there is no interceptor to hold it
      // and no `PendingActService` row to point at (that service keys on a
      // `commandId` and re-runs the act through the bus). The honest outcome is
      // to refuse the call and say which gate held it, rather than to run it and
      // pretend an approval happened.
      logger.warn('Tool authority: held for approval; the tool call is refused', {
        toolName,
        feature,
        gate: decision.gate,
        bindingRule: decision.bindingRule,
      })
      return { kind: 'hold', gate: decision.gate, bindingRule: decision.bindingRule, because }
    }
  }

  return { kind: 'permit' }
}
