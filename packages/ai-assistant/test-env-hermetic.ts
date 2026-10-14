/**
 * Hermetic provider environment for the `ai-assistant` test suite — `CC-80`.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The suite's own header promises it is *"deterministic, hermetic, and
 * provider-agnostic"*, and it was not. Measured 2026-10-14 while discharging
 * `P2-9a` (rule 0b): the first full-package run read **5 failed suites / 27
 * failed tests**, every one of them `AiModelFactoryError: The resolved model is
 * pinned to provider "openai", but that provider is not configured`. All five
 * pass in isolation; all five are byte-identical to the commit before the row;
 * and the throwing file (`lib/model-factory.ts`) was unchanged. The cause was
 * then reproduced EXACTLY, not guessed:
 *
 *     OM_AI_PROVIDER=openai OM_AI_MODEL=Qwen2.5-7B-Instruct <jest>
 *       →  5 failed, 123 passed, 128 total  /  27 failed, 1837 passed, 1864 total
 *
 * — the same five suites and the same 27 tests. Characterised one variable at a
 * time: `OM_AI_PROVIDER=openai` alone ⇒ 3 failed; the legacy `OPENCODE_PROVIDER`
 * alone ⇒ 3; `OM_AI_MODEL=openai/gpt-4o` alone ⇒ 3; `OM_AI_MODEL=Qwen2.5-7B-…`
 * alone ⇒ 1.
 *
 * **The mechanism.** `model-factory.resolveModel` walks the provider axis from
 * the **ambient environment** (`readGlobalProviderFromEnv` reads `OM_AI_PROVIDER`
 * then the legacy `OPENCODE_PROVIDER`; `readGlobalModelFromEnv` reads
 * `OM_AI_MODEL`). The affected suites mock the provider *registry* — not the
 * *environment* — so an exported `OM_AI_PROVIDER` pins the model to a provider
 * their mock does not offer, and an exported provider API key makes a provider
 * "configured" to the real registry. Both are the same class of leak: **the test
 * reads the operator's shell.**
 *
 * A cross-file `process.env` leak was ruled out with a POSITIVE CONTROL rather
 * than an argument: an instrumented run printed its init line 128 times (proving
 * it ran in every file) and reported zero env changes, and was 128 / 1864 green.
 *
 * WHAT THIS FILE DOES
 * -------------------
 * Runs as `setupFilesAfterEnv` (see `jest.config.cjs`), i.e. once per test file,
 * BEFORE the test file is loaded. It removes the provider-axis variables from the
 * environment, so a suite that wants them must set them explicitly — which is
 * what the hermetic suites already do. It restores them in `afterAll` so the
 * worker process is left as it was found.
 *
 * WHY THE WHOLE PREFIX, NOT A HAND-LIST OF NAMES
 * ----------------------------------------------
 * The provider axis is not three variables; it is a family with per-module and
 * legacy aliases (`OM_AI_<MODULE>_MODEL`, `OM_AI_<MODULE>_PROVIDER`,
 * `OM_AI_<MODULE>_BASE_URL`, `OM_AI_AVAILABLE_PROVIDERS`,
 * `OM_AI_AVAILABLE_MODELS_<PROVIDER>`, and the pre-rename `OPENCODE_*` forms).
 * A hand-list would go stale the next time an alias is added — which is exactly
 * how this defect appeared. Prefix matching cannot go stale.
 *
 * ACCEPTANCE (two-sided, and both sides were run — `CC-80`)
 * --------------------------------------------------------
 *   1. clean shell ......................... 128 suites / 1864 tests GREEN
 *   2. the variables exported .............. 128 suites / 1864 tests GREEN
 * Side 2 was **RED** before this file existed (5 suites / 27 tests), so the
 * fix is measured against its own defect, not merely asserted.
 */

/**
 * Whole families cleared by prefix. `OM_AI_` subsumes every canonical name and
 * every per-module / availability alias; `OPENCODE_` covers the pre-rename
 * aliases the model factory still reads as fallbacks.
 */
export const CLEARED_PREFIXES: readonly string[] = ['OM_AI_', 'OPENCODE_']

/**
 * Provider credentials and endpoints, which sit OUTSIDE those prefixes but are
 * the same class of leak: an ambient key makes a provider `isConfigured()` for
 * the real registry, so the suite stops being provider-agnostic.
 */
export const CLEARED_EXACT: readonly string[] = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'ANTHROPIC_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'OPENROUTER_API_KEY',
  'DEEPINFRA_API_KEY',
  'REQUESTY_API_KEY',
  'LM_STUDIO_API_KEY',
]

/**
 * The keys this module would clear from `env` — exported so the policy itself is
 * testable without mutating a live process environment.
 */
export function providerEnvKeys(env: NodeJS.ProcessEnv): string[] {
  const keys = new Set<string>()
  for (const key of Object.keys(env)) {
    if (CLEARED_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.add(key)
  }
  for (const key of CLEARED_EXACT) keys.add(key)
  return [...keys].sort()
}

// ── the side effect: clear on entry, restore on exit ────────────────────────
const saved = new Map<string, string | undefined>()
for (const key of providerEnvKeys(process.env)) {
  saved.set(key, process.env[key])
  delete process.env[key]
}

afterAll(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
