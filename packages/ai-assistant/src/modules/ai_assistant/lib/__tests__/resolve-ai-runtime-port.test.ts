/**
 * `P2-5` (§2.11) proof — the engine is chosen in ONE config-selected function.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * The row's claim is *"swapping engines touches exactly one function"*. Before
 * `P2-5` that was a sentence in a docstring on a **private** function that could
 * only ever return OpenCode. This suite makes it a measured property:
 *
 *   1. **The default is unchanged.** With nothing in the environment, the
 *      selector builds the OpenCode adapter — the engine the product runs on
 *      today.
 *   2. **The environment selects.** `AI_RUNTIME_ENGINE=hermes` returns a REAL
 *      Hermes adapter (not a stub), and its `describeCapabilities()` says so.
 *   3. **It is deny-by-default.** An unknown engine name REFUSES rather than
 *      silently falling back — a fallback would let an operator believe Hermes
 *      was serving the chat while OpenCode actually was.
 *   4. **One file.** A static check proves the chat route constructs no adapter
 *      itself, and that the selector names no engine — so the `R28-5` structural
 *      proof is untouched.
 *
 * The Hermes branch is deliberately **not connected** here: selection is not
 * serving. The adapter's own contract is *"connect the client before starting a
 * run"*, and a per-request connect would spawn a worker per request. Serving a
 * live turn is `P2-6`'s exit gate; this suite proves the selection.
 */
const handleOpenCodeHealthMock = jest.fn()

// The OpenCode adapter's `describeCapabilities()` asks the LIVE engine for its
// health (`handleOpenCodeHealth` → an HTTP probe + the DI container). That is
// right for the adapter, but a unit test of SELECTION must not depend on a
// running container: an unmocked probe made this suite hang until the jest
// timeout whenever Docker was down — a flaky reading that the first mutation
// harness (broken by a Windows spawn fault) then hid. Mock the probe, exactly
// as the adapter's own suite does; the adapter suite proves the mapping.
jest.mock('../opencode-handlers', () => ({
  handleOpenCodeHealth: (...args: unknown[]) => handleOpenCodeHealthMock(...args),
}))

import type { EntityManager } from '@mikro-orm/postgresql'
import {
  AI_RUNTIME_ENGINE_ENV,
  HERMES_GATEWAY_URL_ENV,
  HERMES_WS_TOKEN_ENV,
  HERMES_WORKER_ARGS_ENV,
  HERMES_WORKER_COMMAND_ENV,
  resolveAiRuntimeEngine,
  resolveAiRuntimePort,
  resolveHermesGatewayConnection,
  resolveHermesWorkerLaunch,
} from '../resolve-ai-runtime-port'
import { HERMES_RUNTIME_IMPLEMENTATION, HermesPortAdapter } from '../hermes-port-adapter'
import { OPENCODE_RUNTIME_IMPLEMENTATION } from '../ai-runtime-port'

/** The OpenCode adapter only stores the EntityManager; nothing is queried here. */
const em = {} as unknown as EntityManager
const auth = { userId: 'user-1', tenantId: 'tenant-1', organizationId: 'org-1' }

function resolve(env: Record<string, string | undefined>) {
  return resolveAiRuntimePort({ em, auth, env })
}

beforeEach(() => {
  // Deterministic, offline health for the OpenCode branch — no container needed.
  handleOpenCodeHealthMock.mockReset()
  handleOpenCodeHealthMock.mockResolvedValue({
    status: 'ok',
    opencode: { healthy: true, version: '1.2.3' },
    url: 'http://localhost:4096',
    mcpUrl: 'http://localhost:3001',
  })
})

describe('P2-5 — the engine is selected in one place, and the default is unchanged', () => {
  it('selects OpenCode when nothing names an engine', async () => {
    const { port, implementation } = resolve({})
    expect(implementation).toBe(OPENCODE_RUNTIME_IMPLEMENTATION)
    await expect(port.describeCapabilities()).resolves.toMatchObject({
      implementation: OPENCODE_RUNTIME_IMPLEMENTATION,
    })
  })

  it('selects Hermes from the environment — a REAL adapter, not a stub', async () => {
    const { port, implementation } = resolve({ [AI_RUNTIME_ENGINE_ENV]: 'hermes' })
    expect(implementation).toBe(HERMES_RUNTIME_IMPLEMENTATION)
    expect(port).toBeInstanceOf(HermesPortAdapter)

    const caps = await port.describeCapabilities()
    expect(caps.implementation).toBe(HERMES_RUNTIME_IMPLEMENTATION)
    // Selection is not connection: the client has not been connected, so the
    // transport reports `down` rather than claiming a health it has not earned.
    expect(caps.health).toBe('down')
    // ...and all eight operations are real — `P2-4` closed the last one.
    expect(caps.operations).toEqual({
      describeCapabilities: true,
      startRun: true,
      streamRun: true,
      cancelRun: true,
      steerRun: true,
      resumeConversation: true,
      resolveToolCall: true,
      completeRun: true,
    })
  })

  it('the implementation NAME the caller gets matches the port it is handed', async () => {
    // The caller records this name on the run's ledger entry, so a mismatch
    // would write a false engine into the record. Both branches are checked.
    for (const [engine, expected] of [
      ['opencode', OPENCODE_RUNTIME_IMPLEMENTATION],
      ['hermes', HERMES_RUNTIME_IMPLEMENTATION],
    ] as const) {
      const { port, implementation } = resolveAiRuntimePort({ em, auth, engine })
      expect(implementation).toBe(expected)
      await expect(port.describeCapabilities()).resolves.toMatchObject({ implementation: expected })
    }
  })
})

describe('P2-5 — the selection is deny-by-default', () => {
  it('REFUSES an unknown engine instead of silently falling back', () => {
    expect(() => resolve({ [AI_RUNTIME_ENGINE_ENV]: 'hermes-typo' })).toThrow(
      /unknown engine "hermes-typo"/,
    )
    // The message names what IS accepted, so the operator can fix it.
    expect(() => resolve({ [AI_RUNTIME_ENGINE_ENV]: 'hermes-typo' })).toThrow(
      /accepted: opencode, hermes/,
    )
  })

  it('an UNSET value selects the default; a SET-but-blank value is refused', () => {
    // Unset is the normal case — nothing named an engine, so the default runs.
    expect(resolveAiRuntimeEngine({})).toBe('opencode')
    // SET to blank is a misconfiguration (usually a failed variable expansion)
    // and must NOT fall back silently — the same false belief a typo would
    // create. A hostile critic found the first version accepted these.
    expect(() => resolveAiRuntimeEngine({ [AI_RUNTIME_ENGINE_ENV]: '' })).toThrow(/is set but empty/)
    expect(() => resolveAiRuntimeEngine({ [AI_RUNTIME_ENGINE_ENV]: '   ' })).toThrow(/is set but empty/)
  })

  it('is case- and whitespace-tolerant for a KNOWN engine', () => {
    expect(resolveAiRuntimeEngine({ [AI_RUNTIME_ENGINE_ENV]: '  Hermes ' })).toBe('hermes')
    expect(resolveAiRuntimeEngine({ [AI_RUNTIME_ENGINE_ENV]: 'OPENCODE' })).toBe('opencode')
  })

  it('an explicit override wins over the environment — and is validated too', () => {
    const { implementation } = resolveAiRuntimePort({
      em,
      auth,
      env: { [AI_RUNTIME_ENGINE_ENV]: 'hermes' },
      engine: 'opencode',
    })
    expect(implementation).toBe(OPENCODE_RUNTIME_IMPLEMENTATION)
    expect(() => resolveAiRuntimePort({ em, auth, engine: 'nope' })).toThrow(/unknown engine "nope"/)
  })
})

describe('P2-5 — the injected Hermes client is honoured (so no test spawns a worker)', () => {
  it('uses the client it is given', async () => {
    const client = {
      isConnected: true,
      connect: async () => ({}),
      request: async () => ({}),
      submitPrompt: async () => ({}),
      interruptSession: async () => ({}),
      steerSession: async () => ({}),
      on: () => () => {},
      onExit: () => () => {},
    }
    const { port, implementation } = resolveAiRuntimePort({
      em,
      auth,
      engine: 'hermes',
      hermesClient: client as unknown as Parameters<typeof resolveAiRuntimePort>[0]['hermesClient'],
    })
    expect(implementation).toBe(HERMES_RUNTIME_IMPLEMENTATION)
    // The injected client claims to be connected, so health is `ok` — proof the
    // adapter is holding the client it was given, not one it built itself.
    await expect(port.describeCapabilities()).resolves.toMatchObject({ health: 'ok' })
  })
})

describe('P2-5 — the worker launch comes from the environment', () => {
  it('defaults to the compose service launch', () => {
    expect(resolveHermesWorkerLaunch({})).toEqual({
      command: 'python',
      args: ['-m', 'tui_gateway.entry'],
    })
  })

  it('honours an override — a worker in a container is a different argv', () => {
    expect(
      resolveHermesWorkerLaunch({
        [HERMES_WORKER_COMMAND_ENV]: 'docker',
        [HERMES_WORKER_ARGS_ENV]: 'exec -i mercato-hermes-gateway python -m tui_gateway.entry',
      }),
    ).toEqual({
      command: 'docker',
      args: ['exec', '-i', 'mercato-hermes-gateway', 'python', '-m', 'tui_gateway.entry'],
    })
  })

  it('falls back to the default when an override is blank (never an empty argv)', () => {
    expect(
      resolveHermesWorkerLaunch({ [HERMES_WORKER_COMMAND_ENV]: '  ', [HERMES_WORKER_ARGS_ENV]: '' }),
    ).toEqual({ command: 'python', args: ['-m', 'tui_gateway.entry'] })
  })

  it('accepts a JSON array, so an argument containing a SPACE is expressible', () => {
    // A hostile critic found the whitespace-split could not express a Windows
    // path such as `C:\Program Files\…`. A JSON array removes that limit.
    expect(
      resolveHermesWorkerLaunch({
        [HERMES_WORKER_COMMAND_ENV]: 'C:\\Program Files\\Python\\python.exe',
        [HERMES_WORKER_ARGS_ENV]: '["-m", "tui_gateway.entry"]',
      }),
    ).toEqual({
      command: 'C:\\Program Files\\Python\\python.exe',
      args: ['-m', 'tui_gateway.entry'],
    })
    expect(resolveHermesWorkerLaunch({ [HERMES_WORKER_ARGS_ENV]: '["-c", "print(1, 2)"]' })).toEqual({
      command: 'python',
      args: ['-c', 'print(1, 2)'],
    })
  })

  it('refuses a MALFORMED JSON argv rather than silently splitting it', () => {
    expect(() => resolveHermesWorkerLaunch({ [HERMES_WORKER_ARGS_ENV]: '["-m", 7]' })).toThrow(
      /must be a JSON array of strings/,
    )
  })
})

describe('P2-5 — the swap is ONE function, proved structurally', () => {
  const fs = require('node:fs') as typeof import('node:fs')
  const path = require('node:path') as typeof import('node:path')

  it('the chat route constructs NO adapter — it calls the selector', () => {
    const route = fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'chat', 'route.ts'), 'utf8')
    expect(route).toMatch(
      /import \{ resolveAiRuntimePort \} from '\.\.\/\.\.\/lib\/resolve-ai-runtime-port'/,
    )
    expect(route).not.toMatch(/createOpenCodePortAdapter/)
    expect(route).not.toMatch(/createHermesPortAdapter/)

    // The ONE thing the route may still take from the OpenCode adapter module is
    // the pure input-ref helper — never a factory. Pin the SYMBOL LIST exactly
    // (not a substring), so a re-added constructor import cannot hide behind the
    // allowed symbol. A hostile critic flagged the substring form as weak.
    const re = /import\s+\{([^}]*)\}\s+from\s+'\.\.\/\.\.\/lib\/opencode-port-adapter'/g
    const symbols: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(route)) !== null) {
      for (const part of m[1].split(',')) {
        const name = part.trim()
        if (name) symbols.push(name)
      }
    }
    expect(symbols).toEqual(['textInputRef'])
  })

  it('the selector names no ENGINE — by ANY module-loading form (R28-5 untouched)', () => {
    const selector = fs.readFileSync(path.join(__dirname, '..', 'resolve-ai-runtime-port.ts'), 'utf8')
    // A hostile critic flagged that matching only `from '…'` would miss
    // `require()` and dynamic `import()`. All three forms are checked.
    for (const engine of ['opencode-client', 'opencode-handlers', 'agent-runtime']) {
      expect(selector).not.toMatch(new RegExp(`from '\\./${engine}'`))
      expect(selector).not.toMatch(new RegExp(`require\\(\\s*'\\./${engine}'`))
      expect(selector).not.toMatch(new RegExp(`import\\(\\s*'\\./${engine}'`))
    }
  })
})

describe('P2-8 — the ws door the client connects, resolved from the environment', () => {
  it('is null when no URL is configured (the spawn client is the fallback)', () => {
    expect(resolveHermesGatewayConnection({})).toBeNull()
    expect(resolveHermesGatewayConnection({ [HERMES_GATEWAY_URL_ENV]: '   ' })).toBeNull()
  })

  it('returns the URL and the token, trailing slash trimmed', () => {
    expect(
      resolveHermesGatewayConnection({
        [HERMES_GATEWAY_URL_ENV]: 'http://hermes-gateway:8091/',
        [HERMES_WS_TOKEN_ENV]: 'sk-shared',
      }),
    ).toEqual({ url: 'http://hermes-gateway:8091', token: 'sk-shared' })
  })

  it('REFUSES a URL with no token — never a silent unauthenticated dial', () => {
    // The door answers every mint with 401 when the secret is missing, so a
    // silent fallback would surface as a first-chat hang. The refusal names
    // the fix (the same value the WORKER service carries).
    expect(() => resolveHermesGatewayConnection({ [HERMES_GATEWAY_URL_ENV]: 'http://hermes-gateway:8091' })).toThrow(
      /HERMES_GATEWAY_URL is set .* but HERMES_WS_TOKEN is not/,
    )
  })

  it('the engine default does NOT move here (P2-9 owns the flip)', () => {
    // The compose default is `opencode`; this row proves the ws door, it does
    // not select it.
    expect(resolveAiRuntimeEngine({})).toBe('opencode')
    expect(resolveAiRuntimeEngine({ [AI_RUNTIME_ENGINE_ENV]: 'hermes' })).toBe('hermes')
  })
})

/**
 * `SR-02` — the tenant's registered runtime, when it has one.
 *
 * The precedence this pins, highest first:
 *   explicit `engine` > tenant runtime row > `AI_RUNTIME_ENGINE` > `opencode`.
 *
 * The middle rung is the new one and the reason is asymmetric: a row in
 * `ai_agent_runtimes` is a fact about **this tenant**, while `AI_RUNTIME_ENGINE` is
 * a fact about **the deployment**. A deployment default must not outrank a tenant's
 * own registration, or `SR-12`'s per-tenant home could never take effect.
 *
 * The last assertion in this block is the one that protects every existing tenant:
 * with no row (`null`), the env path is taken **exactly** as before.
 */
describe('SR-02 — a registered tenant runtime outranks the environment', () => {
  it('uses the tenant runtime when the environment names nothing', () => {
    const { implementation } = resolveAiRuntimePort({
      em,
      auth,
      env: {},
      tenantRuntime: { provider: 'hermes', name: 'primary' },
    })
    expect(implementation).toBe(HERMES_RUNTIME_IMPLEMENTATION)
  })

  it('uses the tenant runtime OVER the environment default', () => {
    const { implementation } = resolveAiRuntimePort({
      em,
      auth,
      env: { [AI_RUNTIME_ENGINE_ENV]: 'opencode' },
      tenantRuntime: { provider: 'hermes', name: 'primary' },
    })
    expect(implementation).toBe(HERMES_RUNTIME_IMPLEMENTATION)
  })

  it('uses the tenant runtime OVER a hermes environment, too (both directions)', () => {
    const { implementation } = resolveAiRuntimePort({
      em,
      auth,
      env: { [AI_RUNTIME_ENGINE_ENV]: 'hermes' },
      tenantRuntime: { provider: 'opencode', name: 'primary' },
    })
    expect(implementation).toBe(OPENCODE_RUNTIME_IMPLEMENTATION)
  })

  it('still lets an explicit `engine` win — it is a caller override, not a preference', () => {
    const { implementation } = resolveAiRuntimePort({
      em,
      auth,
      env: {},
      engine: 'opencode',
      tenantRuntime: { provider: 'hermes', name: 'primary' },
    })
    expect(implementation).toBe(OPENCODE_RUNTIME_IMPLEMENTATION)
  })

  it('is byte-identical to the old behaviour when the tenant has no runtime', () => {
    // This is what makes the change safe for every existing tenant: `null` is the
    // "nothing registered" answer, and the env rung is then reached unchanged.
    const withNull = resolveAiRuntimePort({ em, auth, env: {}, tenantRuntime: null })
    const withoutTheField = resolveAiRuntimePort({ em, auth, env: {} })
    expect(withNull.implementation).toBe(withoutTheField.implementation)
    expect(withNull.implementation).toBe(OPENCODE_RUNTIME_IMPLEMENTATION)
  })

  it('refuses an unknown provider in a row instead of falling back', () => {
    // A hand-edited row must fail loudly. Silently serving OpenCode for a row that
    // says `hermes-typo` is the exact deception the deny-by-default rule prevents.
    expect(() =>
      resolveAiRuntimePort({
        em,
        auth,
        env: {},
        tenantRuntime: { provider: 'hermes-typo', name: 'primary' },
      }),
    ).toThrow(/the tenant runtime "primary" names an unknown engine "hermes-typo"/)
  })
})
