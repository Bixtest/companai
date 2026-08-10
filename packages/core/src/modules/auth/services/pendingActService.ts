import type { EntityManager } from '@mikro-orm/postgresql'
import type { AwilixContainer } from 'awilix'
import type { Decision } from '@open-mercato/shared/lib/authority/decision'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { AuthorityPendingAct } from '@open-mercato/core/modules/auth/data/entities'

const logger = createLogger('authority').child({ component: 'pending-acts' })

/**
 * How long a held act stays approvable.
 *
 * Mandatory expiry is a design requirement, not a tidiness measure (planning 02
 * §7.2): *"expiry escalates rather than silently blocking work forever"*. An act
 * that can sit in a queue indefinitely turns into a queue nobody trusts, and a
 * request nobody answers is a refusal that never had to be justified.
 */
export const PENDING_ACT_TTL_MS = 24 * 60 * 60 * 1000

export const PENDING_ACT_STATUSES = ['pending', 'approved', 'rejected', 'expired', 'failed'] as const
export type PendingActStatus = (typeof PENDING_ACT_STATUSES)[number]

/**
 * Marks an execution as the replay of an already-approved act.
 *
 * The gate reads this and stands aside. Without it, approving an act would
 * re-resolve it, hold it again, and queue a second copy — an approval queue that
 * cannot be emptied.
 *
 * A symbol rather than a field: it must not be settable from request input.
 */
export const APPROVED_ACT_REPLAY = Symbol.for('open-mercato.authority.approvedActReplay')

export type HoldInput = {
  tenantId: string
  organizationId: string | null
  commandId: string
  capabilityId: string
  commandInput: unknown
  actorId: string
  actorKind: string
  decision: Decision
}

export type PendingActView = {
  id: string
  commandId: string
  capabilityId: string
  actorId: string
  actorKind: string
  gate: string
  bindingRule: string
  because: string | null
  obligations: string[]
  status: PendingActStatus
  expiresAt: string
  createdAt: string
  resolvedAt: string | null
  resolvedByUserId: string | null
  failureReason: string | null
}

type CommandBusLike = {
  execute: (commandId: string, options: {
    input: unknown
    ctx: Record<string, unknown>
  }) => Promise<unknown>
}

/**
 * The acts the resolver held, and what happens to them.
 *
 * An act reaches here when enforcement is on and the resolver gated the command
 * at `A1` or `A2` — *"the worker proposes; a human performs"* and *"prepared,
 * executes only after approval"*. Both mean the same thing to this service: the
 * command does not run now, and runs later only if somebody says so.
 *
 * `A3` (hold-and-commit) and `A4` (execute-and-review) are **not** handled here.
 * A3 needs a scheduler to commit on expiry rather than expire; A4 executes
 * immediately and files a review afterwards, which is a different record with a
 * different meaning. Both are their own work, and calling them done because they
 * share a queue would be the kind of claim this project exists not to make.
 */
export class PendingActService {
  constructor(private readonly em: EntityManager) {}

  /** Records an act that will not run until somebody approves it. */
  async hold(input: HoldInput): Promise<AuthorityPendingAct> {
    const act = this.em.create(AuthorityPendingAct, {
      tenantId: input.tenantId,
      organizationId: input.organizationId,
      commandId: input.commandId,
      capabilityId: input.capabilityId,
      commandInput: input.commandInput,
      actorId: input.actorId,
      actorKind: input.actorKind,
      gate: input.decision.gate,
      bindingRule: input.decision.bindingRule,
      decision: input.decision as unknown,
      status: 'pending',
      expiresAt: new Date(Date.now() + PENDING_ACT_TTL_MS),
      createdAt: new Date(),
    })
    await this.em.persist(act).flush()

    logger.warn('Act held for approval', {
      pendingActId: act.id,
      commandId: input.commandId,
      capability: input.capabilityId,
      gate: input.decision.gate,
      bindingRule: input.decision.bindingRule,
      actorId: input.actorId,
      tenantId: input.tenantId,
    })
    return act
  }

  /**
   * The queue for one tenant.
   *
   * Expired rows are marked before they are listed, so nobody is shown an act
   * they cannot act on. Ordering is oldest-first; planning §7.2 wants grade then
   * deadline risk, and grade is not modelled yet — arrival order is at least an
   * order somebody can predict, rather than one that looks meaningful and is not.
   */
  async list(tenantId: string, status: PendingActStatus | 'all' = 'pending'): Promise<PendingActView[]> {
    await this.expireOverdue(tenantId)
    const where: Record<string, unknown> = { tenantId }
    if (status !== 'all') where.status = status
    const acts = await this.em.find(AuthorityPendingAct, where, { orderBy: { createdAt: 'asc' }, limit: 200 })
    return acts.map((act) => toView(act))
  }

  async findById(tenantId: string, id: string): Promise<AuthorityPendingAct | null> {
    return this.em.findOne(AuthorityPendingAct, { id, tenantId })
  }

  /**
   * Runs a held act, with the approver accountable for it.
   *
   * The act executes **as the approver**, not as whoever proposed it. That is
   * what approval means — planning 02 §5.2 asks for *"an accountable human
   * approves, and that approval is a signed act"* — and reconstructing a
   * proposer's authentication context from two stored columns would be
   * fabricating a session rather than reproducing one.
   *
   * The *scope* is the proposer's, though: an act proposed for one organization
   * must not land in the approver's just because they happened to be looking at
   * a different one.
   */
  async approve(params: {
    tenantId: string
    id: string
    approverUserId: string | null
    container: AwilixContainer
    auth: unknown
    note?: string | null
  }): Promise<{ ok: true; act: AuthorityPendingAct } | { ok: false; reason: string; act?: AuthorityPendingAct }> {
    const act = await this.findById(params.tenantId, params.id)
    if (!act) return { ok: false, reason: 'not-found' }
    if (act.status !== 'pending') return { ok: false, reason: `already-${act.status}`, act }
    if (act.expiresAt.getTime() <= Date.now()) {
      act.status = 'expired'
      await this.em.flush()
      return { ok: false, reason: 'expired', act }
    }

    const bus = params.container.resolve('commandBus') as CommandBusLike
    try {
      await bus.execute(act.commandId, {
        input: act.commandInput,
        ctx: {
          container: params.container,
          auth: params.auth,
          selectedOrganizationId: act.organizationId ?? null,
          [APPROVED_ACT_REPLAY]: act.id,
        },
      })
    } catch (error) {
      // A failed act is not an unapproved one. It was authorised and then broke,
      // and hiding that behind `pending` would invite somebody to approve it
      // again and again.
      act.status = 'failed'
      act.resolvedAt = new Date()
      act.resolvedByUserId = params.approverUserId ?? null
      act.failureReason = error instanceof Error ? error.message : String(error)
      await this.em.flush()
      logger.error('An approved act failed when it ran', {
        pendingActId: act.id,
        commandId: act.commandId,
        err: error,
      })
      return { ok: false, reason: 'execution-failed', act }
    }

    act.status = 'approved'
    act.resolvedAt = new Date()
    act.resolvedByUserId = params.approverUserId ?? null
    act.resolutionNote = params.note ?? null
    await this.em.flush()

    logger.warn('Held act approved and executed', {
      pendingActId: act.id,
      commandId: act.commandId,
      approverUserId: params.approverUserId,
      proposedByActorId: act.actorId,
    })
    return { ok: true, act }
  }

  /** Refuses a held act. The command never runs. */
  async reject(params: {
    tenantId: string
    id: string
    approverUserId: string | null
    note?: string | null
  }): Promise<{ ok: true; act: AuthorityPendingAct } | { ok: false; reason: string }> {
    const act = await this.findById(params.tenantId, params.id)
    if (!act) return { ok: false, reason: 'not-found' }
    if (act.status !== 'pending') return { ok: false, reason: `already-${act.status}` }

    act.status = 'rejected'
    act.resolvedAt = new Date()
    act.resolvedByUserId = params.approverUserId ?? null
    act.resolutionNote = params.note ?? null
    await this.em.flush()

    logger.warn('Held act rejected', {
      pendingActId: act.id,
      commandId: act.commandId,
      approverUserId: params.approverUserId,
    })
    return { ok: true, act }
  }

  /**
   * Marks overdue acts expired.
   *
   * Called on read rather than by a scheduler, so expiry is correct without
   * requiring a worker to be running. A queue whose deadlines only apply when
   * background jobs are healthy has deadlines that are not deadlines.
   */
  async expireOverdue(tenantId: string): Promise<number> {
    const overdue = await this.em.find(AuthorityPendingAct, {
      tenantId,
      status: 'pending',
      expiresAt: { $lte: new Date() },
    })
    if (!overdue.length) return 0
    for (const act of overdue) act.status = 'expired'
    await this.em.flush()
    logger.warn('Held acts expired without an answer', { tenantId, expired: overdue.length })
    return overdue.length
  }
}

function toView(act: AuthorityPendingAct): PendingActView {
  const decision = act.decision as Decision | null
  const binding = decision?.reasons?.find((reason) => reason.rule === decision.bindingRule) ?? null
  return {
    id: act.id,
    commandId: act.commandId,
    capabilityId: act.capabilityId,
    actorId: act.actorId,
    actorKind: act.actorKind,
    gate: act.gate,
    bindingRule: act.bindingRule,
    because: binding?.detail ?? null,
    obligations: (decision?.obligations ?? []).map((obligation) => obligation.detail),
    status: act.status as PendingActStatus,
    expiresAt: act.expiresAt.toISOString(),
    createdAt: act.createdAt.toISOString(),
    resolvedAt: act.resolvedAt ? act.resolvedAt.toISOString() : null,
    resolvedByUserId: act.resolvedByUserId ?? null,
    failureReason: act.failureReason ?? null,
  }
}
