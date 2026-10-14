/**
 * The ENGINE SELECTOR — the one place the chat engine is chosen (`P2-5`, §2.11).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * Until `P2-5` the choice of engine lived in a **private function inside one
 * route** (`api/chat/route.ts::resolveAiRuntimePort`), and it could only ever
 * return OpenCode. That made the row's own claim — *"swapping engines touches
 * exactly one function"* — true only as a sentence in a docstring: it was not
 * exported, not shared, and could not be tested without booting the route.
 *
 * This module is that function, extracted and made **config-selected**, so the
 * claim is provable: a test flips the environment variable, calls this one
 * function, and reads the implementation off the port it returns.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES **NOT** DO
 * ─────────────────────────────────────────────────────────────────────────────
 *  - It does not name an **engine**. It imports the two **adapters** (which are
 *    allowed to reach an engine) and never `opencode-client`, `opencode-handlers`
 *    or `agent-runtime` — so the `R28-5` structural proof is untouched.
 *  - It does not touch the OpenCode engine or change the default. With no
 *    environment variable set the chat route builds the OpenCode adapter exactly
 *    as it did before this file existed.
 *  - It does not unify the platform-runtime routes. `api/ai/chat` and
 *    `api/ai/run-object` construct `createAgentRuntimePortAdapter` themselves —
 *    a DIFFERENT engine family (the platform's own in-process AI-SDK loop, not
 *    the chat engine). Merging them is a separate decision, not this row's.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SELECTION IS DENY-BY-DEFAULT
 * ─────────────────────────────────────────────────────────────────────────────
 * An unset variable selects the proven default (`opencode`). A variable naming a
 * **known** engine selects it. A variable naming anything else **throws** — it
 * does not silently fall back. A silent fallback is the dangerous case: an
 * operator who writes `AI_RUNTIME_ENGINE=hermes-typo` would believe Hermes was
 * serving the chat while OpenCode actually was. Failing loudly on a typo is the
 * same posture the platform takes elsewhere (`CC-44`, `S-02`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE HERMES BRANCH — REAL, AND HONESTLY BOUNDED
 * ─────────────────────────────────────────────────────────────────────────────
 * Selecting `hermes` builds a real `HermesGatewayClient` (the worker's command
 * and argv come from the environment, mirroring the opt-in compose service) and
 * hands it to `createHermesPortAdapter`. It is **not** a stub.
 *
 * It is also **not connected** here. The client spawns and supervises the worker
 * on `connect()`, and the adapter refuses to start a run until it is connected
 * (*"connect the client before starting a run"*). Connection is a **lifecycle**
 * decision — one worker per process, connected once — which belongs with the
 * live run, not with the selection. So this row constructs the client and names
 * the bound: serving a live turn over Hermes is `P2-7`'s exit gate (§2.13;
 * corrected 2026-10-13, rule 13 — this line said `P2-6`, but `P2-6` (§2.12) proved
 * the five properties through the port against a `FakeClient` and drove no live
 * turn, so the live turn became its own row). Until then a
 * `hermes`-selected chat fails **closed and loudly** at `startRun`, which is the
 * honest state — it never silently serves a different engine.
 *
 * (The per-request cost is the reason connection is not done here: this function
 * is called **once per request**, and a client that connected on construction
 * would spawn a worker per request. That is a defect, not a feature, so it is
 * deliberately not built.)
 */

import type { EntityManager } from '@mikro-orm/postgresql'
import { OPENCODE_RUNTIME_IMPLEMENTATION, type AiRuntimePort } from './ai-runtime-port'
import { createOpenCodePortAdapter } from './opencode-port-adapter'
import {
  HERMES_RUNTIME_IMPLEMENTATION,
  createHermesPortAdapter,
  type HermesGatewayPortClient,
} from './hermes-port-adapter'
import { HermesGatewayClient } from './hermes-gateway-client'
import {
  createWebSocketTransport,
  fetchHermesTicket,
} from './hermes-gateway-transport'

/** The engines this selector knows. Adding one here is the whole swap. */
export type AiRuntimeEngine = 'opencode' | 'hermes'

/** The accepted engine names, in one place so the error message cannot drift. */
const ACCEPTED_ENGINES: readonly AiRuntimeEngine[] = ['opencode', 'hermes']

/** The engine selected when nothing says otherwise — the proven, live engine. */
const DEFAULT_ENGINE: AiRuntimeEngine = 'opencode'

/** The environment variable an operator sets to choose the engine. */
export const AI_RUNTIME_ENGINE_ENV = 'AI_RUNTIME_ENGINE'

/**
 * The default worker launch, mirroring `docker-compose.hermes.yml`
 * (`python -m tui_gateway.entry`, newline-JSON on stdio). Overridable because
 * the production launch is an **operator-environment** measurement — a worker in
 * a container is reached by a different argv than one on the host — exactly the
 * shape of `P2-1`'s network premise.
 */
const DEFAULT_HERMES_WORKER_COMMAND = 'python'
const DEFAULT_HERMES_WORKER_ARGS = ['-m', 'tui_gateway.entry']

/** A read-only view of the environment, so tests never mutate `process.env`. */
export type EngineEnv = Record<string, string | undefined>

export interface ResolveAiRuntimePortDeps {
  /** The EntityManager the OpenCode adapter uses for its session-ownership check. */
  em: EntityManager
  /** The auth context for the run, when the caller has one. */
  auth: { userId: string; tenantId: string | null; organizationId: string | null }
  /** An explicit engine name, overriding the environment. For tests and callers. */
  engine?: string
  /** The environment read for the engine name and the worker launch. */
  env?: EngineEnv
  /**
   * The Hermes client to use. Supplied so a test (or a caller holding a
   * long-lived client) never spawns a worker; omitted, a real client is built
   * from the environment.
   */
  hermesClient?: HermesGatewayPortClient
}

/** What the selector returns: the port, and WHICH engine it is. */
export interface ResolvedAiRuntimePort {
  port: AiRuntimePort
  /** The implementation name, for the run's ledger provenance (§2.11 item 4). */
  implementation: string
}

/**
 * Resolve an engine name to a known engine, or refuse.
 *
 * `undefined`/empty selects the default; a known name selects it; anything else
 * throws — never a silent fallback (see the header).
 */
export function resolveAiRuntimeEngine(
  env: EngineEnv = process.env,
): AiRuntimeEngine {
  return normalizeEngine(env[AI_RUNTIME_ENGINE_ENV], AI_RUNTIME_ENGINE_ENV)
}

/**
 * The ONE place the chat engine is chosen.
 *
 * Returns the port **and** the implementation name, because §2.11 item 4 requires
 * the chosen engine to be recorded on the run — the caller cannot read a name off
 * the port without an `await`, and a run's ledger entry must not depend on one.
 */
export function resolveAiRuntimePort(deps: ResolveAiRuntimePortDeps): ResolvedAiRuntimePort {
  const env = deps.env ?? process.env
  const engine =
    deps.engine !== undefined
      ? normalizeEngine(deps.engine, 'the `engine` override')
      : resolveAiRuntimeEngine(env)

  if (engine === 'hermes') {
    return {
      implementation: HERMES_RUNTIME_IMPLEMENTATION,
      port: createHermesPortAdapter(deps.hermesClient ?? buildHermesClient(env)),
    }
  }

  return {
    implementation: OPENCODE_RUNTIME_IMPLEMENTATION,
    port: createOpenCodePortAdapter({ auth: deps.auth, em: deps.em }),
  }
}

function normalizeEngine(raw: string | undefined, source: string): AiRuntimeEngine {
  // UNSET is the normal case: nothing named an engine, so the proven default runs.
  if (raw === undefined) return DEFAULT_ENGINE
  const value = raw.trim().toLowerCase()
  // SET but blank is a MISCONFIGURATION (a failed variable expansion is the usual
  // cause) and must not fall back silently — an operator who meant to select
  // Hermes would otherwise believe Hermes was serving while OpenCode was. This is
  // the same failure the unknown-name branch below refuses; the two differ only
  // in whether a name was written at all.
  if (value === '') {
    throw new Error(
      `${source} is set but empty — refusing to guess which engine should serve the chat ` +
        `(accepted: ${ACCEPTED_ENGINES.join(', ')}); unset it to use the default (${DEFAULT_ENGINE})`,
    )
  }
  if ((ACCEPTED_ENGINES as readonly string[]).includes(value)) return value as AiRuntimeEngine
  throw new Error(
    `${source} names an unknown engine "${value}" (accepted: ${ACCEPTED_ENGINES.join(', ')}) — ` +
      'refusing to guess which engine should serve the chat',
  )
}

/** The environment variables that name the worker launch. */
export const HERMES_WORKER_COMMAND_ENV = 'HERMES_WORKER_COMMAND'
export const HERMES_WORKER_ARGS_ENV = 'HERMES_WORKER_ARGS'

/** The environment variables that name the worker's WebSocket door (P2-8). */
export const HERMES_GATEWAY_URL_ENV = 'HERMES_GATEWAY_URL'
export const HERMES_WS_TOKEN_ENV = 'HERMES_WS_TOKEN'

/**
 * The ws door the app connects, resolved from the environment.
 *
 * `null` when the operator configured no URL — then the Hermes client is the
 * **spawn** client below, which is P2-8's transitional seam (the platform's
 * own container cannot spawn the worker: measured, no Python and no Docker
 * socket). The compose file sets the URL to the sibling service, so in the
 * deployed stack the ws door is THE path.
 *
 * A URL with **no token is a loud refusal**, not a fallback: dialing a door
 * that will refuse every mint with 401 is a failure shaped like a hang, and
 * an operator who set one variable and not the other must hear it at
 * resolution — with the fix named — not at the first chat run.
 */
export function resolveHermesGatewayConnection(
  env: EngineEnv = process.env,
): { url: string; token: string } | null {
  const url = (env[HERMES_GATEWAY_URL_ENV] ?? '').trim()
  if (url === '') return null
  const token = (env[HERMES_WS_TOKEN_ENV] ?? '').trim()
  if (token === '') {
    throw new Error(
      `${HERMES_GATEWAY_URL_ENV} is set (${url}) but ${HERMES_WS_TOKEN_ENV} is not — refusing to dial the ` +
        `Hermes ws door without the shared secret; set ${HERMES_WS_TOKEN_ENV} to the same value the ` +
        'worker service carries',
    )
  }
  return { url: url.replace(/\/+$/, ''), token }
}

/**
 * The worker launch, resolved from the environment.
 *
 * Exported so the launch is directly testable: it is the one **pure** part of the
 * Hermes branch, and a wrong argv would otherwise surface only as a worker that
 * never boots — a `P2-7` failure with no obvious cause. The defaults mirror
 * `docker-compose.hermes.yml`; an operator whose worker runs in a container
 * overrides both (e.g. `docker` + `exec -i <container> python -m tui_gateway.entry`).
 */
export function resolveHermesWorkerLaunch(
  env: EngineEnv = process.env,
): { command: string; args: string[] } {
  const command = (env[HERMES_WORKER_COMMAND_ENV] ?? '').trim() || DEFAULT_HERMES_WORKER_COMMAND
  const rawArgs = (env[HERMES_WORKER_ARGS_ENV] ?? '').trim()
  return {
    command,
    args: rawArgs === '' ? [...DEFAULT_HERMES_WORKER_ARGS] : parseArgs(rawArgs),
  }
}

/**
 * Parse the argv override.
 *
 * A **JSON array** is accepted so an argument containing a space is expressible
 * (a Windows path such as `C:\\Program Files\\…`, or a shell wrapper). Anything
 * else is split on whitespace, which covers the common case and matches how the
 * compose service writes its command. A malformed JSON array is refused rather
 * than silently split — a wrong argv would otherwise surface only as a worker
 * that never boots.
 */
function parseArgs(raw: string): string[] {
  if (raw.startsWith('[')) {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.some((a) => typeof a !== 'string')) {
      throw new Error(
        `${HERMES_WORKER_ARGS_ENV} must be a JSON array of strings, or a whitespace-separated list`,
      )
    }
    return parsed as string[]
  }
  return raw.split(/\s+/)
}

/**
 * Build the worker client from the environment.
 *
 * Two shapes, one seam (P2-8): when `HERMES_GATEWAY_URL` names the worker's
 * ws door the client is built to **connect** it — the transport dials the
 * door, minting a single-use ticket per dial with the shared secret in a
 * header. Otherwise the stdio client is built from the worker launch, which
 * is how the P2-7 harness (and a host-side worker a developer runs by hand)
 * still reaches it. The compose file sets the URL to the sibling service, so
 * the deployed stack takes the first shape.
 *
 * The client merges the platform's own environment into the worker's when it
 * spawns (`{ ...process.env, ...options.env }`), so provider keys reach a
 * spawned worker the same way the compose service passes them — and no
 * secret is placed on argv (argv is world-readable; the client's own
 * docblock says so).
 */
function buildHermesClient(env: EngineEnv): HermesGatewayPortClient {
  const connection = resolveHermesGatewayConnection(env)
  if (connection) {
    const { url, token } = connection
    return new HermesGatewayClient({
      transportFactory: () =>
        createWebSocketTransport({
          url,
          fetchTicket: () => fetchHermesTicket({ baseUrl: url, token }),
        }),
    })
  }
  const { command, args } = resolveHermesWorkerLaunch(env)
  return new HermesGatewayClient({ command, args })
}
