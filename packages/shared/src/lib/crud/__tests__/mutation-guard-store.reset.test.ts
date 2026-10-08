import {
  getAllMutationGuards,
  registerMutationGuards,
  resetMutationGuards,
} from '../mutation-guard-store'
import type { MutationGuard } from '../mutation-guard-registry'

/**
 * CC-29 — `resetMutationGuards()` and the two places the store lives.
 *
 * The store backs itself with `globalThis` so it survives HMR and module re-evaluation
 * (`mutation-guard-store.ts`). `getAllMutationGuards()` prefers that global slot but
 * **falls back to the module-local `_guardEntries`** when the global one is absent. That
 * fallback is the reason these tests exist: a reset that clears only the global slot looks
 * correct in the same module instance, and silently resurrects the old guards through the
 * local cache. Both routes are therefore pinned separately.
 *
 * Note this file does **not** claim a cross-file leak. Measured: a guard written to the
 * `globalThis` slot in one test file is not visible in another (jest gives each file its own
 * realm). The leak CC-29 fixes is *within* a file — a guard registered in one test is still
 * present at the start of the next — which is what `jest.setup.ts`'s `beforeEach` prevents.
 */

function guard(id: string): MutationGuard {
  return {
    id,
    targetEntity: 'example.todo',
    operations: ['create'],
    priority: 50,
    validate: async () => ({ ok: true }),
  }
}

const GLOBAL_KEY = '__openMercatoMutationGuards__'

afterEach(() => {
  // Leave the process exactly as found, whatever a test did to it.
  resetMutationGuards()
})

describe('resetMutationGuards (CC-29)', () => {
  it('empties a store that has guards in it', () => {
    registerMutationGuards([{ moduleId: 'm', guards: [guard('g1'), guard('g2')] }])
    expect(getAllMutationGuards()).toHaveLength(2)

    resetMutationGuards()

    expect(getAllMutationGuards()).toEqual([])
  })

  it('clears the globalThis slot, not just the in-process view', () => {
    registerMutationGuards([{ moduleId: 'm', guards: [guard('g1')] }])
    // The registration is observable on `globalThis` — this is the copy that survives
    // into another test file sharing the worker, which is the leak being fixed.
    expect((globalThis as Record<string, unknown>)[GLOBAL_KEY]).toBeDefined()

    resetMutationGuards()

    expect((globalThis as Record<string, unknown>)[GLOBAL_KEY]).toBeUndefined()
  })

  it('clears BOTH stores — a global-only reset would leave the local cache to resurrect guards', () => {
    // Read the store **while the global slot is present** (populating the local cache as a
    // side effect of registration), then remove the key a global-only reset would remove,
    // leaving the local cache as the only remaining copy. If the reset had cleared just the
    // global slot, this is the state it would leave behind — and the guards would come back.
    registerMutationGuards([{ moduleId: 'm', guards: [guard('g1')] }])
    delete (globalThis as Record<string, unknown>)[GLOBAL_KEY]
    expect(getAllMutationGuards()).toHaveLength(1) // served from the local cache

    resetMutationGuards()

    // Both copies are gone, so neither route can serve a stale guard.
    expect(getAllMutationGuards()).toEqual([])
    expect((globalThis as Record<string, unknown>)[GLOBAL_KEY]).toBeUndefined()
  })

  it('is idempotent — resetting an already-empty store is not an error', () => {
    expect(() => {
      resetMutationGuards()
      resetMutationGuards()
    }).not.toThrow()
    expect(getAllMutationGuards()).toEqual([])
  })

  it('lets a fresh registration after a reset be seen — reset is not a one-way latch', () => {
    registerMutationGuards([{ moduleId: 'm', guards: [guard('old')] }])
    resetMutationGuards()
    registerMutationGuards([{ moduleId: 'm', guards: [guard('new')] }])

    const ids = getAllMutationGuards().map((entry) => entry.guard.id)
    expect(ids).toEqual(['new'])
  })
})
