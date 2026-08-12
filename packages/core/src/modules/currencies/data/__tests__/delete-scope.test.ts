/**
 * A superadmin can delete a currency (U4).
 *
 * **The bug this guards.** `currencyDeleteSchema` required `organizationId`, and
 * the route derives that from the actor:
 *
 * ```ts
 * organizationId: ctx.selectedOrganizationId ?? ctx.auth?.orgId ?? undefined
 * ```
 *
 * A superadmin acting tenant-wide has no organization, so the value was
 * `undefined` and every delete returned `400 expected string, received
 * undefined` — verified live on 2026-08-12, two days after it was first
 * recorded.
 *
 * **Why relaxing it is safe, and not a hole.** The field was never read. The
 * record is found through `buildCurrencyCommandWhere(ctx, …)` and the boundary
 * is enforced by `ensureOrganizationScope` against the *loaded record* — both
 * take their scope from `ctx`, which cannot be forged by a request body. A
 * required field that nothing reads is not a control; it is a gate on the one
 * actor honest enough to have no organization.
 *
 * This is the U4 family rule from `references/upstream-issues.md`, stated the
 * other way round: **never require the actor's organization from an actor who
 * has none.**
 */
import { currencyDeleteSchema, exchangeRateDeleteSchema } from '../validators'

const ID = 'b1c09374-8771-4f5f-a0f9-d07aa1ef4052'
const TENANT = '88b6bc8a-a655-4edd-b1b5-d186606efdb2'
const ORG = '065bd751-ada0-4469-a571-879950a1be51'

describe.each([
  ['currencyDeleteSchema', currencyDeleteSchema],
  ['exchangeRateDeleteSchema', exchangeRateDeleteSchema],
])('%s', (_name, schema) => {
  it('accepts a delete from an actor with no organization', () => {
    // The exact shape the route produces for a superadmin acting tenant-wide.
    const result = schema.safeParse({ id: ID, tenantId: TENANT, organizationId: undefined })

    expect(result.success).toBe(true)
  })

  it('accepts a delete from an actor that has one', () => {
    const result = schema.safeParse({ id: ID, tenantId: TENANT, organizationId: ORG })

    expect(result.success).toBe(true)
  })

  it('still requires the tenant', () => {
    // Tenant is the boundary that must never be optional, and unlike the
    // organization it always resolves -- the live 400 named `organizationId`
    // alone, never `tenantId`.
    const result = schema.safeParse({ id: ID, organizationId: ORG })

    expect(result.success).toBe(false)
  })

  it('still requires the id', () => {
    const result = schema.safeParse({ tenantId: TENANT, organizationId: ORG })

    expect(result.success).toBe(false)
  })

  it('still rejects an organization that is not a uuid', () => {
    // Optional must not mean unvalidated. A malformed value is still a bug and
    // should not reach a query builder.
    const result = schema.safeParse({ id: ID, tenantId: TENANT, organizationId: 'not-a-uuid' })

    expect(result.success).toBe(false)
  })
})
