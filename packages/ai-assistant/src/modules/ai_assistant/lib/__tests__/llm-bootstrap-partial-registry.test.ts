/**
 * Tests for the `llm-bootstrap` partial-registry guard (defect found + fixed
 * 2026-10-11, during the row-28 R28-1 build; registered as `CC-68`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS PINS
 * ─────────────────────────────────────────────────────────────────────────────
 * `llm-bootstrap.ts` calls `registerBuiltInLlmProviders()` at IMPORT time (its
 * last line). That function did:
 *
 *     if (bootstrapped && llmProviderRegistry.list().length > 0) { return }
 *     try { llmProviderRegistry.register(...) } catch { warn }
 *     ...
 *     bootstrapped = true
 *
 * Several suites replace the shared registry with a PARTIAL stub carrying only
 * `resolveFirstConfigured` (e.g. `business-ir-author.test.ts:48`). That stub is
 * enough for the code under test but has no `register`/`list`.
 *
 * On a FRESH module load the first call survives: `bootstrapped` is `false`, so
 * `bootstrapped && ...` short-circuits BEFORE `list()` is touched, and every
 * `register()` throws *inside its own try/catch* (only a warning). But the call
 * still ends by setting `bootstrapped = true`. The SECOND call therefore
 * evaluates `llmProviderRegistry.list()` — which is `undefined` on the stub —
 * and throws:
 *
 *     TypeError: llm_provider_registry_1.llmProviderRegistry.list is not a function
 *         at registerBuiltInLlmProviders (llm-bootstrap.ts:44)
 *
 * A second call happens when the module is re-evaluated in the same worker
 * (module-registry reset / re-require). Because it depends on which module a
 * worker resolves first, it is ORDER-DEPENDENT: the full suite failed only on
 * some runs, while this file passed in isolation.
 *
 * THE FIX: `registerBuiltInLlmProviders()` now treats a registry that does not
 * expose the full write surface (`register` + `list`) as "nothing to
 * bootstrap" and returns before touching either. Registration is a best-effort
 * convenience, never a load-time precondition of the modules that import this
 * one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THESE TESTS CALL TWICE
 * ─────────────────────────────────────────────────────────────────────────────
 * A single call is VACUOUS: the short-circuit means the stub is never exercised
 * (this was the first version of this file, and it passed GREEN even with the
 * guard removed — the exact "test that proves nothing" trap from LESSONS L129).
 * The second call is what actually reaches `list()`, so the second call is what
 * must be red without the guard.
 */
import { registerBuiltInLlmProviders, resetLlmBootstrapState } from '../llm-bootstrap'
import { llmProviderRegistry } from '@open-mercato/shared/lib/ai/llm-provider-registry'

jest.mock('@open-mercato/shared/lib/ai/llm-provider-registry', () => ({
  // Deliberately PARTIAL — exactly the shape that used to break the module load.
  llmProviderRegistry: {
    resolveFirstConfigured: () => null,
  },
}))

describe('llm-bootstrap — tolerates a partial registry stub (CC-68)', () => {
  beforeEach(() => {
    resetLlmBootstrapState()
  })

  it('starts from a clean state on the first call', () => {
    // First call: bootstrapped is false, so the `list()` branch is not reached.
    // This is the call that used to set `bootstrapped = true` and arm the trap.
    expect(() => registerBuiltInLlmProviders()).not.toThrow()
  })

  it('does not throw on the SECOND call, which reaches registry.list()', () => {
    // The first call arms `bootstrapped = true` even though it registered
    // nothing (every `register()` was swallowed with a warning). Without the
    // guard, this second call evaluates `llmProviderRegistry.list()` on a stub
    // that has no `list` and throws `list is not a function`.
    registerBuiltInLlmProviders()
    expect(() => registerBuiltInLlmProviders()).not.toThrow()
  })

  it('leaves a partial registry untouched (invents no methods on the caller stub)', () => {
    const before = Object.keys(llmProviderRegistry as object).sort()
    registerBuiltInLlmProviders()
    registerBuiltInLlmProviders()
    const after = Object.keys(llmProviderRegistry as object).sort()
    expect(after).toEqual(before)
  })
})
