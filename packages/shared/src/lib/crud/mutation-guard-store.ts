/**
 * Mutation Guard Store
 *
 * Global registry for mutation guards using the same globalThis pattern
 * as interceptor-registry.ts for HMR-safe storage.
 */

import type { MutationGuard } from './mutation-guard-registry'

export interface MutationGuardRegistryEntry {
  moduleId: string
  guard: MutationGuard
}

const GLOBAL_KEY = '__openMercatoMutationGuards__'

let _guardEntries: MutationGuardRegistryEntry[] | null = null

function readGlobal(): MutationGuardRegistryEntry[] | null {
  try {
    const value = (globalThis as Record<string, unknown>)[GLOBAL_KEY]
    return Array.isArray(value) ? (value as MutationGuardRegistryEntry[]) : null
  } catch {
    // globalThis access can throw in restricted environments (e.g., edge runtimes); fall back to local cache
    return null
  }
}

function writeGlobal(entries: MutationGuardRegistryEntry[]) {
  try {
    ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = entries
  } catch {
    // ignore global assignment failures
  }
}

/**
 * Register mutation guards from all modules.
 * Called during bootstrap after generated guards are imported.
 */
export function registerMutationGuards(
  entries: Array<{ moduleId: string; guards: MutationGuard[] }>,
) {
  const flat: MutationGuardRegistryEntry[] = []
  for (const entry of entries) {
    for (const guard of entry.guards) {
      flat.push({ moduleId: entry.moduleId, guard })
    }
  }
  _guardEntries = flat
  writeGlobal(flat)
}

/**
 * Get all registered mutation guards.
 */
export function getAllMutationGuards(): MutationGuardRegistryEntry[] {
  const globalEntries = readGlobal()
  if (globalEntries) return globalEntries
  if (!_guardEntries) return []
  return _guardEntries
}

/**
 * Clear the guard store.
 *
 * **Why this exists (CC-29).** The store backs itself with `globalThis` so it survives HMR
 * and module re-evaluation, and `registerMutationGuards` **replaces it wholesale** — the
 * right behaviour at runtime, but it means a guard a test registers is still in the store
 * when the **next test in the same file** runs. Measured: a guard registered in one test is
 * still returned by {@link getAllMutationGuards} at the start of the following test in that
 * file (count 1); with this reset wired into `jest.setup.ts` it is 0. The store does **not**
 * cross a *file* boundary in this jest config — measured directly: a second test file reads
 * the `globalThis` key as `undefined` even with the reset switched off, so jest gives each
 * test file its own realm. The leak this fixes is therefore *within* a file, not between
 * files, and a suite left with a stale guard can fail a later test in that same file.
 *
 * Clearing **both** places is deliberate: {@link getAllMutationGuards} prefers the global
 * slot but falls back to the module-local `_guardEntries`, so clearing only the global one
 * would let the local cache resurrect the previous guards (pinned by three tests in
 * `__tests__/mutation-guard-store.reset.test.ts`, which go RED if the local clear is removed).
 *
 * Callers: `jest.setup.ts` (`setupFilesAfterEnv`) calls it in a root-level `beforeEach`, so
 * every **test** starts from a known-empty store instead of inheriting the previous test's.
 */
export function resetMutationGuards(): void {
  _guardEntries = null
  try {
    delete (globalThis as Record<string, unknown>)[GLOBAL_KEY]
  } catch {
    // Mirror writeGlobal: a restricted global must not turn a reset into a throw.
  }
}

/**
 * Get all guard instances (unwrapped from registry entries).
 */
export function getAllMutationGuardInstances(): MutationGuard[] {
  return getAllMutationGuards().map((entry) => entry.guard)
}
