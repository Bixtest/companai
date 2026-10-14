/**
 * `CC-80` — the provider environment must be HERMETIC, not merely usually clean.
 *
 * The suite's header claims it is "deterministic, hermetic, and provider-agnostic"
 * and it was not: exporting the app's own config turned 5 suites / 27 tests RED,
 * because `lib/model-factory.ts` reads the provider axis from the ambient
 * environment while the affected suites mock the *registry*. See
 * `test-env-hermetic.ts` for the full measurement.
 *
 * These tests cover the POLICY (which keys are cleared) and the SIDE EFFECT
 * (they are actually gone). The side-effect assertion is the one that matters:
 * it fails whenever the setup is removed AND the run was poisoned — which is the
 * acceptance criterion `CC-80` states, checked here per-file as well.
 */
import {
  CLEARED_EXACT,
  CLEARED_PREFIXES,
  providerEnvKeys,
} from '../../../../test-env-hermetic'

/**
 * A fixture environment. The policy is "clear by PREFIX", so the prefix-derived
 * keys can only be observed by handing the function an env that CONTAINS them —
 * `providerEnvKeys({})` returns just the exact list, which is why the first
 * version of this suite was wrong (and was caught only by running it poisoned).
 */
const SAMPLE: NodeJS.ProcessEnv = {
  // the canonical names — each one reproduced the defect on its own
  OM_AI_PROVIDER: 'openai',
  OM_AI_MODEL: 'gpt-4o',
  // the legacy aliases `readGlobalProviderFromEnv` still reads as fallbacks
  OPENCODE_PROVIDER: 'openai',
  OPENCODE_MODEL: 'gpt-4o',
  // the availability allow-lists
  OM_AI_AVAILABLE_PROVIDERS: 'openai',
  OM_AI_AVAILABLE_MODELS_OPENAI: 'gpt-4o',
  // per-module aliases — the family is why the rule is a PREFIX, not a list
  OM_AI_INBOX_OPS_MODEL: 'gpt-4o',
  OM_AI_CUSTOMERS_PROVIDER: 'openai',
  OM_AI_SALES_BASE_URL: 'http://x',
  // provider credentials and endpoints (the exact list)
  OPENAI_API_KEY: 'sk-x',
  OPENAI_BASE_URL: 'http://x',
  ANTHROPIC_API_KEY: 'sk-x',
  GOOGLE_GENERATIVE_AI_API_KEY: 'x',
  OPENROUTER_API_KEY: 'x',
  DEEPINFRA_API_KEY: 'x',
  REQUESTY_API_KEY: 'x',
  LM_STUDIO_API_KEY: 'x',
  // not the provider axis — clearing these would be over-reach
  JWT_SECRET: 'x',
  DATABASE_URL: 'postgres://x',
  PATH: '/usr/bin',
  // `OM_TEST_*`, not `OM_AI_*`: a near-miss a careless prefix would eat
  OM_TEST_MODE: '1',
  OM_TEST_AI_CHAT_RATE_LIMIT_MODE: 'x',
  // the MCP credential is a DIFFERENT axis (P2-9a) and must survive
  MCP_SERVER_API_KEY: 'x',
}

describe('CC-80 — provider environment hermeticity', () => {
  describe('the policy: which keys are cleared', () => {
    const keys = providerEnvKeys(SAMPLE)

    it.each([
      // the canonical names — each one reproduced the defect on its own
      'OM_AI_PROVIDER',
      'OM_AI_MODEL',
      // the legacy aliases `readGlobalProviderFromEnv` still reads as fallbacks
      'OPENCODE_PROVIDER',
      'OPENCODE_MODEL',
      // the availability allow-lists
      'OM_AI_AVAILABLE_PROVIDERS',
      'OM_AI_AVAILABLE_MODELS_OPENAI',
      // a per-module alias — the family is why the rule is a PREFIX, not a list
      'OM_AI_INBOX_OPS_MODEL',
      'OM_AI_CUSTOMERS_PROVIDER',
      'OM_AI_SALES_BASE_URL',
    ])('clears %s', (key) => {
      expect(keys).toContain(key)
    })

    it.each([...CLEARED_EXACT])('clears the provider credential/endpoint %s', (key) => {
      expect(keys).toContain(key)
    })

    it.each([
      // not the provider axis — clearing these would be over-reach
      'JWT_SECRET',
      'DATABASE_URL',
      'PATH',
      // `OM_TEST_*`, not `OM_AI_*`: a near-miss that a careless prefix would eat
      'OM_TEST_MODE',
      'OM_TEST_AI_CHAT_RATE_LIMIT_MODE',
      // the MCP credential is a DIFFERENT axis (P2-9a) and must survive
      'MCP_SERVER_API_KEY',
    ])('leaves the unrelated key %s alone', (key) => {
      expect(keys).not.toContain(key)
    })

    it('matches by PREFIX so a new alias cannot go stale (the way this defect appeared)', () => {
      // A name invented today must be cleared without editing this file.
      expect(providerEnvKeys({ OM_AI_BRAND_NEW_MODULE_MODEL: 'x' })).toContain(
        'OM_AI_BRAND_NEW_MODULE_MODEL',
      )
      expect(CLEARED_PREFIXES).toContain('OM_AI_')
      expect(CLEARED_PREFIXES).toContain('OPENCODE_')
    })
  })

  describe('the side effect: the keys are actually gone from this process', () => {
    it('leaves no cleared key in the environment', () => {
      // `setupFilesAfterEnv` runs this module before the test file loads, so by
      // now the environment is clean whatever the shell exported. Without the
      // setup this assertion FAILS on a poisoned run — that is the point.
      const leaked = providerEnvKeys(process.env).filter(
        (key) => process.env[key] !== undefined,
      )
      expect(leaked).toEqual([])
    })

    it('and unrelated variables survive, proving it clears by POLICY not by wholesale wipe', () => {
      // A module that did `process.env = {}` would pass the test above and break
      // every suite in the package. `PATH` is the sentinel: always present, never
      // part of the provider axis.
      expect(process.env.PATH).toBeDefined()
    })
  })
})
