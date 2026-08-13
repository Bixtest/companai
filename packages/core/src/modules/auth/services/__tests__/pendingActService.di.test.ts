/**
 * That the tenant TTL is actually wired, not merely written.
 *
 * **This test exists because the unit tests cannot fail for the reason that
 * matters.** `resolveTtlMs` can be perfect while `PendingActService` is
 * constructed with `moduleConfig = null`, in which case every tenant silently
 * keeps the 24-hour default and nothing anywhere goes red. The feature would be
 * "done", tested, and inert.
 *
 * The specific trap is L37: this container uses Awilix **CLASSIC** injection, so
 * a dependency is resolved by the *constructor parameter's name*. The second
 * parameter is `moduleConfig`; the registration is `moduleConfigService`. A
 * plain `asClass(PendingActService)` therefore resolves it to `undefined` — no
 * error, no warning, just a service that quietly ignores tenant configuration.
 * That is why `di.ts` registers it with `asFunction(...).proxy()` instead, and
 * why that decision needs a test rather than a comment.
 */
import { createContainer, asValue, InjectionMode, type AwilixContainer } from 'awilix'
import { register } from '../../di'
import { PendingActService, PENDING_ACT_TTL_MS } from '../pendingActService'

const TENANT = 'tenant-1'

function buildContainer(withConfig: boolean): AwilixContainer {
  // CLASSIC on purpose: registering PROXY here would hide the very bug under
  // test, because PROXY passes the cradle and never looks at parameter names.
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC })

  const em = {
    create: jest.fn((_entity: unknown, data: Record<string, unknown>) => data),
    persist: jest.fn(() => ({ flush: jest.fn(async () => undefined) })),
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    flush: jest.fn(async () => undefined),
  }

  container.register({ em: asValue(em) })
  if (withConfig) {
    container.register({
      moduleConfigService: asValue({
        getValue: jest.fn(async () => 3),
      }),
    })
  }

  register(container as never)
  return container
}

describe('pendingActService DI', () => {
  it('resolves to a PendingActService', () => {
    const service = buildContainer(true).resolve('pendingActService')
    expect(service).toBeInstanceOf(PendingActService)
  })

  it('honours the tenant TTL, proving moduleConfigService was injected', async () => {
    // The assertion that would fail under `asClass`: the stub returns 3 hours,
    // so an act held now must expire in about 3 hours, not 24.
    const container = buildContainer(true)
    const service = container.resolve<PendingActService>('pendingActService')

    const before = Date.now()
    const act = (await service.hold({
      tenantId: TENANT,
      organizationId: null,
      commandId: 'demo.command',
      capabilityId: 'demo.capability',
      commandInput: {},
      actorId: 'user-1',
      actorKind: 'human',
      decision: { gate: 'A2', bindingRule: 'test', allowed: false, reasons: [] },
    } as never)) as unknown as { expiresAt: Date }

    const heldForMs = act.expiresAt.getTime() - before
    expect(heldForMs).toBeGreaterThan(2.5 * 3_600_000)
    expect(heldForMs).toBeLessThan(3.5 * 3_600_000)
    expect(heldForMs).toBeLessThan(PENDING_ACT_TTL_MS)
  })

  it('still holds acts when the configs module is absent', async () => {
    // Optional for a reason: an approval queue that stops working because a
    // *settings* module is missing is a worse failure than one on its default.
    const service = buildContainer(false).resolve<PendingActService>('pendingActService')

    const before = Date.now()
    const act = (await service.hold({
      tenantId: TENANT,
      organizationId: null,
      commandId: 'demo.command',
      capabilityId: 'demo.capability',
      commandInput: {},
      actorId: 'user-1',
      actorKind: 'human',
      decision: { gate: 'A2', bindingRule: 'test', allowed: false, reasons: [] },
    } as never)) as unknown as { expiresAt: Date }

    const heldForMs = act.expiresAt.getTime() - before
    expect(heldForMs).toBeGreaterThan(PENDING_ACT_TTL_MS - 5_000)
  })
})
