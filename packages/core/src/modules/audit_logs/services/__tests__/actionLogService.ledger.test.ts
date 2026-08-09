/**
 * R3 — the journal and the chain stay in step.
 *
 * The ledger is hooked to `ActionLogService.log()` rather than to each caller,
 * because both write paths already funnel through it: the command bus via
 * `persistLog`, every custom route via `writeDirectWriteAuditLog`. These tests
 * hold that wiring in place — if it were ever moved to the call sites, a module
 * could audit a change and forget to chain it, and the chain would silently stop
 * proving the record.
 */

import { ActionLogService } from '../actionLogService'
import { digestOpaque } from '@open-mercato/shared/lib/ledger/canonical'

type PersistedLog = Record<string, unknown>

function createService(options?: { ledgerAppend?: jest.Mock }) {
  const persisted: PersistedLog[] = []
  const append = options?.ledgerAppend ?? jest.fn(async () => ({ id: 'ledger-1' }))

  const em = {
    create: (_entity: unknown, data: PersistedLog) => ({ id: 'log-1', ...data }),
    persist: (entity: PersistedLog) => {
      persisted.push(entity)
      return { flush: async () => undefined }
    },
  }

  const service = new ActionLogService(
    em as unknown as ConstructorParameters<typeof ActionLogService>[0],
    undefined,
    { append } as unknown as ConstructorParameters<typeof ActionLogService>[2],
  )

  return { service, append, persisted }
}

// Real uuids, because the schema validates them and quietly nulls anything else
// — a test using 'tenant-1' would exercise a code path production never takes.
const TENANT_ID = '88b6bc8a-a655-4edd-b1b5-d186606efdb2'
const ORG_ID = '065bd751-ada0-4469-a571-879950a1be51'
const USER_ID = '11111111-1111-4111-8111-111111111111'
const API_KEY_ID = '22222222-2222-4222-8222-222222222222'

const baseEntry = {
  commandId: 'inbox_ops.proposal_action.accepted',
  actionLabel: 'inbox_ops.proposal_action.accepted',
  resourceKind: 'inbox_ops.proposal_action',
  resourceId: 'action-1',
  tenantId: TENANT_ID,
  organizationId: ORG_ID,
  actorUserId: USER_ID,
}

describe('every journal entry extends the chain', () => {
  it('appends one ledger event per logged entry', async () => {
    const { service, append } = createService()

    await service.log(baseEntry)

    expect(append).toHaveBeenCalledTimes(1)
    expect(append.mock.calls[0][0]).toMatchObject({
      tenantId: TENANT_ID,
      eventType: 'inbox_ops.proposal_action.accepted',
      organizationId: ORG_ID,
      resourceKind: 'inbox_ops.proposal_action',
      resourceId: 'action-1',
    })
  })

  it('records a human actor as human', async () => {
    const { service, append } = createService()

    await service.log(baseEntry)

    expect(append.mock.calls[0][0]).toMatchObject({ actorKind: 'human', actorId: USER_ID })
  })

  it('records a machine actor as a machine, which the journal itself cannot', async () => {
    // `action_logs.actor_user_id` is a uuid column and the normaliser strips the
    // `api_key:` prefix before writing, so the row cannot tell a key from a
    // person (U7). The chain reads the raw subject and keeps the distinction —
    // the one this platform exists to make.
    const { service, append, persisted } = createService()

    await service.log({ ...baseEntry, actorUserId: `api_key:${API_KEY_ID}` })

    expect(append.mock.calls[0][0]).toMatchObject({ actorKind: 'service', actorId: API_KEY_ID })
    expect((persisted[0] as { actorUserId?: string }).actorUserId).toBe(API_KEY_ID)
  })

  it('records a system actor when nobody is attributed', async () => {
    const { service, append } = createService()

    await service.log({ ...baseEntry, actorUserId: undefined })

    expect(append.mock.calls[0][0]).toMatchObject({ actorKind: 'system', actorId: null })
  })

  it('carries correlation and causation when the caller supplied them', async () => {
    const { service, append } = createService()

    await service.log({ ...baseEntry, context: { correlationId: 'cor-1', causationId: 'evt-9' } })

    expect(append.mock.calls[0][0]).toMatchObject({ correlationId: 'cor-1', causationId: 'evt-9' })
  })

  it('stores digests of the snapshots, never the snapshots', async () => {
    // The chain proves the journal entry has not been altered. It must not hold
    // the content: snapshots are customer data subject to erasure, and a chain
    // holding them could not honour a deletion request without destroying its
    // own proof.
    const { service, append } = createService()
    const snapshotAfter = { email: 'buyer@example.com', total: 19.99 }

    await service.log({ ...baseEntry, snapshotAfter })

    const payload = append.mock.calls[0][0].payload as Record<string, unknown>
    expect(payload.snapshotAfterDigest).toBe(digestOpaque(snapshotAfter))
    expect(payload.snapshotBeforeDigest).toBeNull()
    expect(JSON.stringify(payload)).not.toContain('buyer@example.com')
  })

  it('points at the journal entry it proves', async () => {
    const { service, append, persisted } = createService()

    await service.log(baseEntry)

    const payload = append.mock.calls[0][0].payload as Record<string, unknown>
    expect(payload.actionLogId).toBe((persisted[0] as { id?: string }).id)
  })

  it('rolls the whole write back when the chain cannot be extended', async () => {
    // Fail-closed, for the same reason the journal is: a change that cannot be
    // proved is worse than a change that did not happen. The throw reaches the
    // caller's transaction and takes the business write with it.
    const append = jest.fn(async () => {
      throw new Error('[internal] ledger unavailable')
    })
    const { service } = createService({ ledgerAppend: append })

    await expect(service.log(baseEntry)).rejects.toThrow('ledger unavailable')
  })

  it('works without a ledger at all, for a deployment that has none', async () => {
    const em = {
      create: (_entity: unknown, data: Record<string, unknown>) => ({ id: 'log-1', ...data }),
      persist: () => ({ flush: async () => undefined }),
    }
    const service = new ActionLogService(em as unknown as ConstructorParameters<typeof ActionLogService>[0])

    await expect(service.log(baseEntry)).resolves.toBeTruthy()
  })

  it('skips the chain when no tenant is known, because a chain is per tenant', async () => {
    const { service, append } = createService()

    await service.log({ ...baseEntry, tenantId: undefined })

    expect(append).not.toHaveBeenCalled()
  })
})
