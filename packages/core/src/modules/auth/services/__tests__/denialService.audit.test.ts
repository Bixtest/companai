/**
 * Every path that changes a denial leaves a record (O1).
 *
 * **The defect these guard.** The audit write lived in the API route, so the CLI
 * recovery path — `mercato auth denials --lift` — called the service directly
 * and wrote nothing. Verified against the running instance: two denials created
 * through the API and two lifted through the CLI produced **two** audit rows,
 * both creations.
 *
 * That is the worst possible asymmetry for a governance product. Taking a
 * permission away was recorded; giving it back was not — on the one path used
 * when somebody is locked out and there is no authenticated user to name.
 *
 * The fix moves the write into the service, so a caller cannot forget. These
 * tests exist to keep it there: if somebody moves it back to the route, the
 * console cases below fail.
 */
import { DenialService } from '../denialService'

const SCOPE = { tenantId: 'tenant-1', organizationId: 'org-1' }

function makeService(options: { withWriter?: boolean; existingLiftedAt?: Date | null } = {}) {
  const log = jest.fn(async () => ({}))
  const rows: Record<string, unknown>[] = []

  const row = {
    id: 'denial-1',
    tenantId: 'tenant-1',
    organizationId: 'org-1',
    subjectPrincipalId: 'a-person',
    subjectKind: 'human',
    featurePattern: 'sales.refund',
    startsAt: new Date('2026-08-01T00:00:00Z'),
    expiresAt: null as Date | null,
    liftedAt: options.existingLiftedAt ?? null,
    liftedByUserId: null as string | null,
    createdByUserId: null as string | null,
    reason: 'under investigation',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const em = {
    async find() { return rows },
    async findOne() { return row },
    create(_entity: unknown, data: Record<string, unknown>) { return { ...row, ...data } },
    persist() { return em },
    async flush() {},
  }

  const service = new DenialService(
    em as never,
    options.withWriter === false ? null : ({ log } as never),
  )
  return { service, log, row }
}

describe('withholding a permission', () => {
  it('records the act', async () => {
    const { service, log } = makeService()

    await service.withhold({
      subjectPrincipalId: 'a-person',
      subjectKind: 'human',
      featurePattern: 'sales.refund',
      reason: 'under investigation',
      createdByUserId: 'an-admin',
    }, SCOPE)

    expect(log).toHaveBeenCalled()
  })
})

describe('lifting a permission back', () => {
  it('records the act — this is the one that was missing', async () => {
    const { service, log } = makeService()

    await service.lift('denial-1', SCOPE, 'an-admin')

    expect(log).toHaveBeenCalled()
  })

  it('records a console lift, which has no user at all', async () => {
    // The CLI passes null. Before the fix this path wrote nothing; an absent
    // user is the reason the entry matters, not a reason to skip it.
    const { service, log } = makeService()

    await service.lift('denial-1', SCOPE, null)

    expect(log).toHaveBeenCalled()
  })

  it('marks a console lift as a system act rather than an anonymous human', async () => {
    const { service, log } = makeService()

    await service.lift('denial-1', SCOPE, null)

    const written = JSON.stringify(log.mock.calls[0]?.[0] ?? {})
    expect(written).toContain('server-console')
  })

  it('writes nothing on a repeat lift', async () => {
    // Lifting is idempotent. A second call must not file a second entry
    // claiming the permission was returned twice.
    const { service, log } = makeService({ existingLiftedAt: new Date('2026-08-10T00:00:00Z') })

    await service.lift('denial-1', SCOPE, 'an-admin')

    expect(log).not.toHaveBeenCalled()
  })
})

describe('when the audit module is absent', () => {
  it('still performs the act rather than failing', async () => {
    // `audit_logs` can legitimately be disabled downstream. The command bus
    // treats it as optional and so must this — refusing to lift a denial
    // because nothing is listening would turn a missing log into an outage.
    const { service } = makeService({ withWriter: false })

    const lifted = await service.lift('denial-1', SCOPE, 'an-admin')

    expect(lifted).not.toBeNull()
  })
})
