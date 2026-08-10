import type { CommandInterceptor, CommandInterceptorContext } from '@open-mercato/shared/lib/commands/command-interceptor'
import { parseSubject } from '@open-mercato/shared/lib/auth/principal'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { CrudHttpError } from '@open-mercato/shared/lib/crud/errors'
import type { AuthorityEnforcementService } from '@open-mercato/core/modules/auth/services/authorityEnforcementService'
import { APPROVED_ACT_REPLAY, type PendingActService } from '@open-mercato/core/modules/auth/services/pendingActService'

const logger = createLogger('authority').child({ component: 'command-gate' })

/**
 * Raised when the resolver holds an act instead of letting it run.
 *
 * A distinct error type, and not a generic block, because the caller has to be
 * able to tell three things apart: *you may not do this*, *this failed*, and
 * **this has not happened yet and here is where it went**. Collapsing the third
 * into either of the others is how an approval queue becomes invisible.
 *
 * Thrown rather than returned: the interceptor runner reduces a returned block
 * to a message string, and the pending-act id has to survive.
 */
export class ActHeldForApprovalError extends CrudHttpError {
  readonly pendingActId: string
  readonly gate: string
  readonly bindingRule: string
  readonly because: string | null

  constructor(params: { pendingActId: string; gate: string; bindingRule: string; because: string | null }) {
    // **202, not 403 and not 500.** The request was understood and accepted; the
    // act has not happened *yet*. A 403 would say "you may not", which is false
    // — the same person may well end up performing it. A 500 says "something
    // broke", which is what the caller saw before this extended `CrudHttpError`
    // and is the worst of the three: it invites a retry, and each retry queues
    // another copy.
    super(202, {
      error: 'This act needs approval before it can run.',
      code: 'authority_act_held',
      pendingActId: params.pendingActId,
      gate: params.gate,
      bindingRule: params.bindingRule,
      because: params.because,
    })
    this.name = 'ActHeldForApprovalError'
    this.pendingActId = params.pendingActId
    this.gate = params.gate
    this.bindingRule = params.bindingRule
    this.because = params.because
  }
}

/** Gates below this are refusals, above are permissions. `A1`/`A2` are "not yet". */
const HELD_GATES = new Set(['A1', 'A2'])

/**
 * Holds a command the resolver is not willing to let run unattended.
 *
 * This is what makes an obligation bind. Before it, enforcement could only
 * refuse (`A0`); `A1` and `A2` were recorded and ignored, so *"a person must
 * approve before this executes"* was a sentence in a log while the act executed
 * anyway.
 *
 * ## What it does not gate, deliberately
 *
 * - **Commands that declare no `capability`.** The resolver is keyed by
 *   capability and the bus by command; a command that has not been mapped is not
 *   gated, and the gap is visible rather than guessed at.
 * - **Tenants not in `enforce`.** Shadow mode observes and changes nothing.
 * - **`A0`.** That is a refusal and `RbacService` has already made it at the
 *   route guard, before any of this runs.
 * - **`A3` and `A4`.** Hold-and-commit needs a scheduler; execute-and-review
 *   runs the act and files a review afterwards. Different machinery, and
 *   pretending a queue covers them would be a claim without a mechanism.
 * - **Replays of an already-approved act**, which would otherwise be held again
 *   and produce a queue that cannot be emptied.
 */
export const authorityCommandGate: CommandInterceptor = {
  id: 'auth.authority-command-gate',
  targetCommand: '*',
  // Early: an act that is not going to run should not first be rewritten by
  // interceptors that assume it will.
  priority: 10,

  async beforeExecute(input: unknown, context: CommandInterceptorContext) {
    // Debug rather than silence: a gate that declines to act should be able to
    // say which of its many deliberate exits it took. Every `return` below is a
    // decision, and without this the only observable difference between "not
    // gated on purpose" and "never ran" is the absence of a log line.
    logger.debug('Command gate reached', { commandId: context.commandId })

    const replayId = (context as unknown as Record<symbol, unknown>)[APPROVED_ACT_REPLAY]
    if (replayId) return

    const auth = context.auth
    const tenantId = (auth?.tenantId as string | null | undefined) ?? null
    const subject = (auth?.sub as string | undefined) ?? null
    if (!tenantId || !subject) return

    const capability = context.capability ?? null
    if (!capability) {
      logger.debug('Command declares no capability; not gated', { commandId: context.commandId })
      return
    }

    let enforcement: AuthorityEnforcementService | null = null
    let pendingActs: PendingActService | null = null
    try {
      enforcement = context.container.resolve('authorityEnforcement') as AuthorityEnforcementService
      pendingActs = context.container.resolve('pendingActService') as PendingActService
    } catch {
      // Neither registered — a lean bootstrap. Nothing to gate with, so nothing
      // is gated. An absent dependency is not evidence of a constraint.
      return
    }
    if (!enforcement || !pendingActs) return

    const mode = await enforcement.modeFor(tenantId)
    if (mode !== 'enforce') {
      logger.debug('Tenant is not enforcing; not gated', { commandId: context.commandId, mode })
      return
    }

    const organizationId = context.selectedOrganizationId ?? (auth?.orgId as string | null | undefined) ?? null
    const decision = await enforcement.decideFor(subject, capability, { tenantId, organizationId })
    if (!decision || !HELD_GATES.has(decision.gate)) {
      logger.debug('Gate permits the act to run now', {
        commandId: context.commandId,
        gate: decision?.gate ?? 'undescribed',
      })
      return
    }

    const principal = parseSubject(subject)
    const act = await pendingActs.hold({
      tenantId,
      organizationId,
      commandId: context.commandId,
      capabilityId: capability,
      commandInput: input,
      actorId: principal.id,
      actorKind: principal.kind,
      decision,
    })

    const binding = decision.reasons.find((reason) => reason.rule === decision.bindingRule) ?? null
    logger.warn('Command held for approval instead of executing', {
      commandId: context.commandId,
      capability,
      gate: decision.gate,
      pendingActId: act.id,
    })

    throw new ActHeldForApprovalError({
      pendingActId: act.id,
      gate: decision.gate,
      bindingRule: decision.bindingRule,
      because: binding?.detail ?? null,
    })
  },
}

export const interceptors: CommandInterceptor[] = [authorityCommandGate]
