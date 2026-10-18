/**
 * `DelegationService.grant` narrows the subject — the other half of `CC-124`.
 *
 * A delegation granted to `ai_worker:<id>` was never found, because
 * `grantedByDelegation` passes the bare id. That failure is *closed* — a grant
 * that should have applied did not — which is why it went unnoticed: nobody
 * reports a permission they never exercised.
 *
 * These pin the narrowing at the service as well as the route, because the
 * service is reachable directly by any internal caller.
 */
import { DelegationService } from '../delegationService'

const KEY_ID = '22222222-2222-4222-8222-222222222222'
const SCOPE = { tenantId: 'tenant-1', organizationId: null }
const FROM = new Date('2026-10-18T00:00:00Z')
const TO = new Date(Date.now() + 3_600_000)

const base = {
  capabilityId: 'sales.refund',
  startsAt: FROM,
  expiresAt: TO,
  reason: 'because',
  organizationId: null,
}

function makeService() {
  const created: Record<string, unknown>[] = []
  const em = {
    create(entity: unknown, data: Record<string, unknown>) {
      const row = { id: 'delegation-1', ...data }
      created.push(row)
      return row
    },
    persist() { return em },
    async flush() {},
  }
  const service = new DelegationService(em as never)
  return { service, created }
}

describe('granting to a machine', () => {
  it('stores the bare id, with the kind beside it', async () => {
    const { service, created } = makeService()

    await service.grant({
      ...base,
      granteePrincipalId: `ai_worker:${KEY_ID}`,
      granteeKind: 'ai_worker',
      grantorPrincipalId: KEY_ID,
      grantorKind: 'service',
    }, SCOPE)

    expect(created[0]).toMatchObject({
      granteePrincipalId: KEY_ID,
      granteeKind: 'ai_worker',
      grantorPrincipalId: KEY_ID,
      grantorKind: 'service',
    })
  })

  it('refuses a subject whose prefix names a different actor', async () => {
    // A grant is the widening direction, so this one matters more than it does
    // for a denial: authority lent to the wrong row is authority lent at all.
    const { service, created } = makeService()

    await expect(service.grant({
      ...base,
      granteePrincipalId: `ai_worker:${KEY_ID}`,
      granteeKind: 'service',
      grantorPrincipalId: '11111111-1111-4111-8111-111111111111',
      grantorKind: 'human',
    }, SCOPE)).rejects.toThrow()

    expect(created).toHaveLength(0)
  })
})
