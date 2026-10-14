/**
 * @jest-environment node
 *
 * `P2-7` (§2.13) — **the pinned worker's model wiring is FORWARDED by the compose.**
 * `P2-8` (§2.14) — **the worker's WebSocket door is WIRED by three files.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS SUITE PREVENTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `P2-7` measured (rule 0b) that the Hermes worker **ignores** the platform's
 * `OM_AI_PROVIDER`/`OM_AI_MODEL` convention. Its own registry is keyed on
 * `HERMES_*` and the per-provider key/base-URL vars: it auto-detects
 * `openai-api` from `OPENAI_API_KEY`, takes its endpoint from `OPENAI_BASE_URL`
 * and its model from `HERMES_MODEL`. `docker-compose.hermes.yml` forwarded
 * **neither** — so the worker would call `api.openai.com` with a local model
 * name. That is exactly the kind of hole a *live* turn finds and no unit test
 * does, which is why the fix needs a guard that fails **at the point of change**:
 * a future edit that drops the forwarding must go red HERE, not in production.
 *
 * `P2-8`'s hole is the same shape one layer out: this time the code exists and
 * the live turn passed, so the risk is that the WIRING which makes the door
 * reachable is dropped or weakened by a later edit. Three files carry it —
 *
 *   · `docker-compose.hermes.yml` — the worker's door env (token/host/port),
 *     and the fact that the door is NOT published to the host;
 *   · `docker-compose.fullapp.yml` — the app's `HERMES_GATEWAY_URL`,
 *     `HERMES_WS_TOKEN`, and `AI_RUNTIME_ENGINE` (whose default must NOT move
 *     before `P2-9`, a product decision the owner has not made);
 *   · `docker/hermes/Dockerfile` — the CMD that serves the door beside stdio,
 *     and the build-time `py_compile` gate that keeps it honest.
 *
 * Dropping the token makes the door silent; dropping the app's URL makes the
 * client dial the wrong host; flipping the engine default pre-empts `P2-9`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS PARSES INSTEAD OF GREPPING
 * ─────────────────────────────────────────────────────────────────────────────
 * A `toContain('OPENAI_BASE_URL')` check would be **vacuous**: the fix's own
 * explanatory COMMENT names every one of these keys. So this suite strips
 * comments and reads the `environment:` MAPPING of the `hermes-gateway` service.
 * The `a key OUTSIDE the environment mapping…` tests below are the proof that
 * the parse is bounded to the mapping rather than being a substring search in
 * disguise: the key is named in prose AND in another section of the same
 * service, and the parser must see neither — with a real mapping asserted as
 * the control. Those are the mutation targets for exactly that failure mode
 * (measured: the first version of that fixture had only the comment, and a
 * probe with comment-stripping disabled went GREEN — a vacuous guard, fixed).
 *
 * The compose file lives at the repo root; the `REPO_ROOT` walk is the same
 * convention `packages/cli` and `packages/ui` already use for repo-wide guards.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..')
const COMPOSE = join(REPO_ROOT, 'docker-compose.hermes.yml')
const FULLAPP_COMPOSE = join(REPO_ROOT, 'docker-compose.fullapp.yml')
const DOCKERFILE = join(REPO_ROOT, 'docker', 'hermes', 'Dockerfile')

/** Removes a trailing `#` comment, but never inside a quoted scalar. */
function stripComment(line: string): string {
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === "'" && !inDouble) inSingle = !inSingle
    else if (ch === '"' && !inSingle) inDouble = !inDouble
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i)
    }
  }
  return line
}

/**
 * The `environment:` mapping of one service, as written in the file — comment
 * lines excluded, list-form entries ignored (this compose uses map form).
 *
 * Deliberately a small indent-aware scan rather than a YAML dependency: the
 * package does not declare one, and an undeclared (hoisted) import would be a
 * latent break. The scan is bounded to `services: → <service>: → environment:`
 * by indentation, so a key under a DIFFERENT service cannot satisfy an assertion.
 */
export function serviceEnvironment(source: string, service: string): Map<string, string> {
  const out = new Map<string, string>()
  let inServices = false
  let inService = false
  let inEnvironment = false

  for (const raw of source.split(/\r?\n/)) {
    const text = stripComment(raw).replace(/\s+$/, '')
    if (text.trim() === '') continue
    const indent = text.length - text.trimStart().length
    const body = text.trim()

    if (indent === 0) {
      inServices = body === 'services:'
      inService = false
      inEnvironment = false
      continue
    }
    if (!inServices) continue
    if (indent === 2) {
      inService = body === `${service}:`
      inEnvironment = false
      continue
    }
    if (!inService) continue
    if (indent === 4) {
      inEnvironment = body === 'environment:'
      continue
    }
    if (inEnvironment && indent >= 6) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(body)
      if (match) out.set(match[1], match[2])
    }
  }
  return out
}

/**
 * The indent-4 KEYS one service declares (`image`, `environment`, `ports`, …).
 *
 * A mapping reader cannot answer "this section must NOT exist": `ports:` has
 * no entries to find. So "must be absent" assertions scan the service's key
 * list instead — which is what makes the no-published-port guard real.
 */
export function serviceKeys(source: string, service: string): Set<string> {
  const out = new Set<string>()
  let inServices = false
  let inService = false

  for (const raw of source.split(/\r?\n/)) {
    const text = stripComment(raw).replace(/\s+$/, '')
    if (text.trim() === '') continue
    const indent = text.length - text.trimStart().length
    const body = text.trim()

    if (indent === 0) {
      inServices = body === 'services:'
      inService = false
      continue
    }
    if (!inServices) continue
    if (indent === 2) {
      inService = body === `${service}:`
      continue
    }
    if (!inService) continue
    if (indent === 4) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*):/.exec(body)
      if (match) out.add(match[1])
    }
  }
  return out
}

/**
 * A Dockerfile's logical INSTRUCTIONS — `#` comments removed and `\`-joined
 * continuations folded into one line.
 *
 * The Dockerfile's own comments name `ws_entry.py`/`ws_host.py` in prose, so a
 * raw substring check on the file would pass with the CMD reverted to the
 * stdio worker. This is the same anti-vacuity rule the compose parser follows,
 * applied to a build manifest instead of a compose mapping.
 */
export function logicalLines(source: string): string[] {
  const out: string[] = []
  let carry = ''
  for (const raw of source.split(/\r?\n/)) {
    const text = stripComment(raw).replace(/\s+$/, '')
    if (text.trim() === '') {
      if (carry !== '') out.push(carry)
      carry = ''
      continue
    }
    const line = carry === '' ? text.trim() : `${carry} ${text.trim()}`
    if (line.endsWith('\\')) {
      carry = line.slice(0, -1).replace(/\s+$/, '')
    } else {
      out.push(line)
      carry = ''
    }
  }
  if (carry !== '') out.push(carry)
  return out
}

describe('P2-7 — docker-compose.hermes.yml forwards the worker’s own model wiring', () => {
  const source = readFileSync(COMPOSE, 'utf8')
  const env = serviceEnvironment(source, 'hermes-gateway')

  it('parses the RIGHT service (the worker, not a neighbour)', () => {
    // `HERMES_PIN_DIGEST` is unique to the gateway service, so this pins that the
    // block read below is really the worker's.
    expect(env.get('HERMES_PIN_DIGEST')).toBeDefined()
    expect(env.get('HERMES_HOME')).toBe('/var/lib/hermes')
  })

  it.each([
    // the endpoint the auto-detected `openai-api` provider calls (was api.openai.com)
    'OPENAI_BASE_URL',
    // the model the worker asks for (it does NOT read `OM_AI_MODEL`)
    'HERMES_MODEL',
    // the prefill grace: the local model prefills slower than the 900s default
    'HERMES_LOCAL_STREAM_STALE_TIMEOUT',
  ])('forwards %s', (key) => {
    const value = env.get(key)
    expect(value).toBeDefined()
    expect((value ?? '').trim().length).toBeGreaterThan(0)
  })

  it.each(['OPENAI_BASE_URL', 'HERMES_MODEL', 'HERMES_LOCAL_STREAM_STALE_TIMEOUT'])(
    '%s is a PASS-THROUGH from the operator’s env, not a hardcoded deployment',
    (key) => {
      // The compose is the FORWARDING layer; the values live in `.env` (measured:
      // `.env` sets `OPENAI_BASE_URL=http://model:8080/v1`). A literal here would
      // silently pin one deployment and defeat the point of the fix.
      expect(env.get(key)).toContain(`\${${key}`)
    },
  )

  it('a key OUTSIDE the environment mapping does not satisfy the assertion (the parse is bounded, not a substring search)', () => {
    // The fix's explanatory comments name every forwarded key, and a compose
    // service has other sections that can carry a `KEY: value` line — so a
    // guard that grepped the file would pass with the forwarding deleted.
    // This fixture puts the key in BOTH places a grep would find it (a
    // comment above the block, a `labels:` section below it) and the parser
    // must see neither. `HERMES_HOME` below is the control: the parser does
    // read a real mapping, so the negative is a property of the parse rather
    // than of the key being unfindable. This is also the mutation target for
    // the `inEnvironment` gate: without it, `labels:` leaks in here.
    const fixture = [
      'services:',
      '  hermes-gateway:',
      '    environment:',
      '      # OPENAI_BASE_URL: ${OPENAI_BASE_URL:-}  (documented, NOT forwarded)',
      '      HERMES_HOME: /var/lib/hermes',
      '    labels:',
      '      OPENAI_BASE_URL: ${OPENAI_BASE_URL:-}',
      '    volumes:',
      '      - x:/y',
    ].join('\n')
    const parsed = serviceEnvironment(fixture, 'hermes-gateway')
    expect(parsed.has('OPENAI_BASE_URL')).toBe(false)
    expect(parsed.get('HERMES_HOME')).toBe('/var/lib/hermes')
  })

  it('does not read another service’s environment', () => {
    const fixture = [
      'services:',
      '  other:',
      '    environment:',
      '      OPENAI_BASE_URL: ${OPENAI_BASE_URL:-}',
      '  hermes-gateway:',
      '    environment:',
      '      HERMES_HOME: /var/lib/hermes',
    ].join('\n')
    const parsed = serviceEnvironment(fixture, 'hermes-gateway')
    expect(parsed.has('OPENAI_BASE_URL')).toBe(false)
  })
})

describe('P2-8 — docker-compose.hermes.yml wires the worker’s WebSocket door', () => {
  const source = readFileSync(COMPOSE, 'utf8')
  const env = serviceEnvironment(source, 'hermes-gateway')
  const keys = serviceKeys(source, 'hermes-gateway')

  it('parses the RIGHT service (the worker, not a neighbour)', () => {
    // Same anchor as P2-7 above: the door env read below belongs to the worker.
    expect(env.get('HERMES_PIN_DIGEST')).toBeDefined()
    expect(env.get('HERMES_HOME')).toBe('/var/lib/hermes')
  })

  it.each([
    // the door's shared secret: without it the door does not listen at all
    'HERMES_WS_TOKEN',
    // the in-container bind of the door
    'HERMES_WS_HOST',
    // the door port the app's `HERMES_GATEWAY_URL` default points at
    'HERMES_WS_PORT',
  ])('forwards %s', (key) => {
    const value = env.get(key)
    expect(value).toBeDefined()
    expect((value ?? '').trim().length).toBeGreaterThan(0)
  })

  it('the door’s shared secret is a PASS-THROUGH with an EMPTY default', () => {
    // The token is the door's credential: the app POSTs it to
    // `/internal/ws-ticket` and the door mints a single-use 30s ticket from it.
    // It must never be hardcoded here (a secret in the repo), and the
    // `${VAR:-}` form keeps a stack that does not set it fully bootable —
    // `ws_entry.py` measures the VALUE, so unset ⇒ the door does not listen
    // and the worker is the stdio worker it has always been.
    expect(env.get('HERMES_WS_TOKEN')).toBe('${HERMES_WS_TOKEN:-}')
  })

  it('binds 0.0.0.0 inside the container and listens on 8091 by default', () => {
    // `0.0.0.0` is the bind inside the WORKER's own network namespace — the
    // container — which is what makes `hermes-gateway:8091` resolvable on the
    // shared Docker network. It is NOT a host bind: that is the `ports:` guard
    // below. Both values stay operator-overridable.
    expect(env.get('HERMES_WS_HOST')).toBe('${HERMES_WS_HOST:-0.0.0.0}')
    expect(env.get('HERMES_WS_PORT')).toBe('${HERMES_WS_PORT:-8091}')
  })

  it('never PUBLISHES the door to the host (no ports: section)', () => {
    // The door is reachable on `mercato-network-local` only. A published port
    // would put a runtime that EXECUTES MODEL-GENERATED CODE on the LAN — the
    // exact thing the app port's `127.0.0.1` bind exists to prevent (see
    // `docker-compose.fullapp.yml`). The live proof overrides this OUTSIDE the
    // repos, on purpose, with a loopback-only mapping.
    expect(keys.has('ports')).toBe(false)
  })
})

describe('P2-8 — docker-compose.fullapp.yml hands the app the door, and does NOT move the engine', () => {
  const source = readFileSync(FULLAPP_COMPOSE, 'utf8')
  const env = serviceEnvironment(source, 'app')

  it('parses the RIGHT service (the app, not a neighbour)', () => {
    // `INTERNAL_APP_ORIGIN` is written only in the app service, so this pins
    // the block read below to the app rather than to opencode/mcp/postgres.
    expect(env.get('INTERNAL_APP_ORIGIN')).toContain('${INTERNAL_APP_ORIGIN:-http://app:')
  })

  it('hands the app the worker’s door URL, the in-network default', () => {
    // The app container has neither Python nor the Docker socket, so it cannot
    // spawn the worker (P2-3's stdio adapter) — it CONNECTS it by URL. The
    // default is the sibling service on the shared network; the internal port,
    // never a published one.
    expect(env.get('HERMES_GATEWAY_URL')).toBe('${HERMES_GATEWAY_URL:-http://hermes-gateway:8091}')
  })

  it('the URL default is NOT loopback (the app cannot reach its own localhost)', () => {
    // The same trap is already recorded above `OPENCODE_URL` in this file: the
    // code default `http://localhost:4096` is unreachable from inside the app
    // container, because `localhost` there is the app itself. A loopback default
    // would make the door dial the app's own port 8091 — nothing listening.
    const value = env.get('HERMES_GATEWAY_URL') ?? ''
    expect(value).not.toContain('localhost')
    expect(value).not.toContain('127.0.0.1')
    expect(value).toContain('hermes-gateway:8091')
  })

  it('passes the door’s shared secret through with an EMPTY default', () => {
    // Same value the worker service carries; the door refuses a mint without
    // it. Empty default so a stack that never set Hermes is byte-for-byte the
    // stack it was before P2-8, and the app's resolution of the URL without a
    // token fails LOUDLY at startup rather than dialing a 401.
    expect(env.get('HERMES_WS_TOKEN')).toBe('${HERMES_WS_TOKEN:-}')
  })

  it('leaves the engine on opencode (the switchover is P2-9, a product decision)', () => {
    // P2-8 builds the door; it does NOT walk through it. Flipping this default
    // here would move the engine switchover ahead of `P2-9`, which is the
    // `CC-74` trigger and the OWNER's decision (rule 11) — an editor flipping
    // it "because Hermes is ready" must go red HERE.
    expect(env.get('AI_RUNTIME_ENGINE')).toBe('${AI_RUNTIME_ENGINE:-opencode}')
  })

  it('a key OUTSIDE the environment mapping does not satisfy the assertion (the parse is bounded, not a substring search)', () => {
    // The app block's comment names all three keys, and the app service has
    // other sections that can carry a `KEY: value` line — so a `toContain`
    // guard would pass even with the mapping deleted. The key appears as a
    // comment and under `deploy:`; the parser must see neither. `OPENCODE_URL`
    // is the control: the parser does read a real mapping.
    const fixture = [
      'services:',
      '  app:',
      '    environment:',
      '      # HERMES_GATEWAY_URL: ${HERMES_GATEWAY_URL:-http://hermes-gateway:8091}',
      '      # AI_RUNTIME_ENGINE: ${AI_RUNTIME_ENGINE:-opencode}',
      '      OPENCODE_URL: ${OPENCODE_URL:-http://opencode:4096}',
      '    deploy:',
      '      resources:',
      '        AI_RUNTIME_ENGINE: ${AI_RUNTIME_ENGINE:-opencode}',
    ].join('\n')
    const parsed = serviceEnvironment(fixture, 'app')
    expect(parsed.has('HERMES_GATEWAY_URL')).toBe(false)
    expect(parsed.has('AI_RUNTIME_ENGINE')).toBe(false)
    expect(parsed.get('OPENCODE_URL')).toBe('${OPENCODE_URL:-http://opencode:4096}')
  })

  it('does not read another service’s environment', () => {
    const fixture = [
      'services:',
      '  opencode:',
      '    environment:',
      '      HERMES_GATEWAY_URL: ${HERMES_GATEWAY_URL:-http://hermes-gateway:8091}',
      '  app:',
      '    environment:',
      '      OPENCODE_URL: ${OPENCODE_URL:-http://opencode:4096}',
    ].join('\n')
    const parsed = serviceEnvironment(fixture, 'app')
    expect(parsed.has('HERMES_GATEWAY_URL')).toBe(false)
  })
})

describe('P2-8 — docker/hermes/Dockerfile serves the door and keeps it compiling', () => {
  const source = readFileSync(DOCKERFILE, 'utf8')
  const lines = logicalLines(source).map((line) => line.trim())
  const cmdLines = lines.filter((line) => /^CMD\b/.test(line))
  const compileLines = lines.filter((line) => line.includes('py_compile'))

  it('the CMD is the ws entrypoint (the stdio worker runs unchanged beneath it)', () => {
    // P2-8 replaces the direct `python -m tui_gateway.entry` CMD:
    // `ws_entry.py` runs the pinned stdio entry in the MAIN thread with the
    // ws door in a daemon thread beside it — one `tui_gateway.server`, two
    // transports. Token unset ⇒ the door does not listen and this process is
    // the stdio worker it has always been. Reverting the CMD (with the
    // comments still describing the door) is the mutation this catches.
    expect(cmdLines).toHaveLength(1)
    expect(cmdLines[0]).toBe('CMD ["python3", "/opt/hermes/ws_entry.py"]')
  })

  it('a syntax error in the ws host fails the BUILD (the py_compile gate)', () => {
    // Measured twice: the live boot caught an indentation error in
    // `ws_host.py` that `docker build` shipped happily — the image built, then
    // FATALed 15 seconds into every start. The compile check makes the build
    // itself fail; both new files are in its list.
    expect(compileLines).toHaveLength(1)
    expect(compileLines[0]).toContain('/opt/hermes/ws_host.py')
    expect(compileLines[0]).toContain('/opt/hermes/ws_entry.py')
  })

  it('COPYs the two new files into the image', () => {
    // The py_compile gate would catch a missing COPY only at the RUN line —
    // after the layer is cached. Assert the COPY itself, on the same
    // comment-stripped view, so a stale build cannot hide it.
    const copyLines = lines.filter((line) => /^COPY\b/.test(line) && line.includes('ws_'))
    expect(copyLines).toHaveLength(1)
    expect(copyLines[0]).toContain('ws_host.py')
    expect(copyLines[0]).toContain('ws_entry.py')
  })

  it('ignores a file named ONLY in a comment (the parse is not a substring search)', () => {
    // The Dockerfile comments describe the door in prose, so a raw
    // `toContain('ws_entry.py')` would pass with the CMD reverted to stdio.
    const fixture = [
      '# The ws door is served by ws_entry.py in a thread beside stdio.',
      'CMD ["python3", "-m", "tui_gateway.entry"]',
    ].join('\n')
    const parsed = logicalLines(fixture).map((line) => line.trim())
    expect(parsed.filter((line) => /^CMD\b/.test(line))).toEqual([
      'CMD ["python3", "-m", "tui_gateway.entry"]',
    ])
    expect(parsed.some((line) => line.includes('ws_entry.py'))).toBe(false)
  })
})
