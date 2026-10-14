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
const ENTRYPOINT = join(REPO_ROOT, 'docker', 'hermes', 'entrypoint.py')
const MCP_BOOTSTRAP = join(REPO_ROOT, 'docker', 'hermes', 'mcp_bootstrap.py')

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

/**
 * The `volumes:` LIST of one service, as `{source, target, mode}` triples.
 *
 * SHORT-form entries only (`src:tgt[:mode]`) — which is the form this compose
 * uses and the form the `P2-9a` assertion is about. A rewrite into long form
 * (`type: volume`) parses to NOTHING rather than to a wrong answer, so it goes
 * RED here instead of silently satisfying the mount guard.
 *
 * The target is taken at the LAST colon rather than by splitting on `:`, because
 * the pin mount's source is itself colon-bearing (`${HERMES_PIN_DIR:-../../…}`).
 * A naive `split(':')` mis-parses that entry, which is how this helper would
 * become the vacuous one.
 */
export function serviceVolumeMounts(
  source: string,
  service: string,
): Array<{ source: string; target: string; mode: string }> {
  const out: Array<{ source: string; target: string; mode: string }> = []
  let inServices = false
  let inService = false
  let inVolumes = false

  for (const raw of source.split(/\r?\n/)) {
    const text = stripComment(raw).replace(/\s+$/, '')
    if (text.trim() === '') continue
    const indent = text.length - text.trimStart().length
    const body = text.trim()

    if (indent === 0) {
      inServices = body === 'services:'
      inService = false
      inVolumes = false
      continue
    }
    if (!inServices) continue
    if (indent === 2) {
      inService = body === `${service}:`
      inVolumes = false
      continue
    }
    if (!inService) continue
    if (indent === 4) {
      inVolumes = body === 'volumes:'
      continue
    }
    if (inVolumes && indent >= 6 && body.startsWith('- ')) {
      const raw = body.slice(2).trim()
      const modeMatch = /:(ro|rw|z|Z|cached|delegated|consistent)$/.exec(raw)
      const mode = modeMatch ? modeMatch[1] : ''
      const withoutMode = modeMatch ? raw.slice(0, -modeMatch[0].length) : raw
      const cut = withoutMode.lastIndexOf(':')
      if (cut <= 0) continue
      out.push({
        source: withoutMode.slice(0, cut).trim(),
        target: withoutMode.slice(cut + 1).trim(),
        mode,
      })
    }
  }
  return out
}

/**
 * The TOP-LEVEL `volumes:` block as `Map<key, {name, external}>`.
 *
 * Only the indent-0 `volumes:` block is read, so a service's own `volumes:` list
 * (indent 4) can never be mistaken for a volume DECLARATION. `name` is kept as
 * written — the assertion is about the exact interpolation, not its expansion.
 */
export function topLevelVolumes(source: string): Map<string, { name: string; external: boolean }> {
  const out = new Map<string, { name: string; external: boolean }>()
  let inVolumes = false
  let current: string | null = null

  for (const raw of source.split(/\r?\n/)) {
    const text = stripComment(raw).replace(/\s+$/, '')
    if (text.trim() === '') continue
    const indent = text.length - text.trimStart().length
    const body = text.trim()

    if (indent === 0) {
      inVolumes = body === 'volumes:'
      current = null
      continue
    }
    if (!inVolumes) continue
    if (indent === 2) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*):$/.exec(body)
      current = match ? match[1] : null
      if (current) out.set(current, { name: '', external: false })
      continue
    }
    if (current !== null && indent >= 4) {
      const entry = out.get(current)
      if (!entry) continue
      if (body.startsWith('name:')) entry.name = body.slice('name:'.length).trim()
      else if (body === 'external: true') entry.external = true
    }
  }
  return out
}

/**
 * The EXPRESSION part of every `log(`/`note(` call, with each `len(key)` removed.
 *
 * Two sources are joined, because an expression reaches a log call in two shapes
 * and ONE of them is invisible to the other:
 *
 *   · everything after the format string's closing quote — the `%`/`+`/`,` form
 *     (`log("... %s ..." % (source, len(key)))`);
 *   · every `{…}` interpolation INSIDE the quoted text — the **f-string** form
 *     (`log(f"... {key}")`), where the expression lives precisely where the
 *     first source cannot look.
 *
 * Asserting on this rather than on the whole line is what separates the
 * IDENTIFIER `key` from the English word "key" in the message text
 * (*"waiting up to %ds for the MCP key at %s"*). A whole-line check cannot make
 * that distinction, and a pattern for one leak shape (`/% key/`) misses the
 * others — so the check is "strip the lengths, then the identifier must be gone".
 *
 * ⚠ The f-string source is not decoration. Measured: with only the first source,
 * a mutant that rewrote the entrypoint's line to
 * `log(f"... ({len(key)} chars): {key}")` — i.e. that PRINTS THE SECRET — left
 * this suite 53/53 GREEN, including the test named "never its value". The guard
 * was vacuous against the most idiomatic Python form of the very leak it names.
 */
export function loggedExpressions(source: string, call: RegExp): string {
  const pieces: string[] = []
  for (const row of source.split(/\r?\n/)) {
    if (!call.test(row)) continue
    const cut = Math.max(row.lastIndexOf('"'), row.lastIndexOf("'"))
    pieces.push(cut === -1 ? row : row.slice(cut + 1))
    // `{…}` groups inside the quoted text: an f-string's expressions.
    for (const match of row.matchAll(/\{([^{}]*)\}/g)) pieces.push(match[1])
  }
  return pieces.join('\n').split('len(key)').join('')
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

/**
 * `P2-9a` (§2.15) — **the platform's 21 MCP tools reach a Hermes-served chat.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE REGRESSION THIS SUITE PREVENTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `P2-9`'s requirement measured, before any code, that OpenCode is live and
 * connected to the platform's own MCP server (`{"open-mercato":{"status":
 * "connected"}}`, 21 tools) while the pinned worker had **no** MCP config and
 * **no MCP SDK** — so flipping the default to Hermes and deleting OpenCode, as
 * §2.14 sketched it, would have removed 21 tools the chat can call today. That
 * is a capability regression, and it is what `CC-79` names.
 *
 * `P2-9a` closes it additively: the image installs the pin's own `mcp` extra,
 * the entrypoint resolves the credential and writes the worker's `mcp_servers`
 * entry, and the compose wires the URL, the key and the shared volume. Four
 * files carry that, and each one has a failure mode a later edit could
 * reintroduce silently:
 *
 *   · the compose — a URL default that is unreachable from the worker, a
 *     dropped credential, or a WRITABLE key mount;
 *   · the Dockerfile — an `uv sync` without the extra (the client goes inert
 *     again: `register_mcp_servers` returns `[]` when the SDK is missing);
 *   · the entrypoint — a bootstrap whose stdout is inherited (a corrupt frame
 *     on the gateway's channel) or which runs before the pin is verified;
 *   · the bootstrap — the credential written to the persistent volume instead
 *     of the pin's `${VAR}` placeholder.
 *
 * Every assertion below is written against a COMMENT-STRIPPED view for the same
 * reason the `P2-7`/`P2-8` blocks above are: these files' own comments name
 * every key and file being asserted, so a substring check would pass with the
 * wiring deleted.
 */
describe('P2-9a — docker-compose.hermes.yml wires the platform’s MCP server', () => {
  const source = readFileSync(COMPOSE, 'utf8')
  const env = serviceEnvironment(source, 'hermes-gateway')
  const mounts = serviceVolumeMounts(source, 'hermes-gateway')
  const volumes = topLevelVolumes(source)

  it('parses the RIGHT service (the worker, not a neighbour)', () => {
    expect(env.get('HERMES_PIN_DIGEST')).toBeDefined()
    expect(mounts.some((mount) => mount.target === '/hermes-src')).toBe(true)
  })

  it('points the worker at the IN-NETWORK MCP service, not the host gateway', () => {
    // Measured 2026-10-14: `getent hosts mcp` inside this worker → 172.18.0.2 on
    // `mercato-network-local`, i.e. a sibling it can reach by name. The previous
    // default (`host.docker.internal`) is the APP's own convention and the wrong
    // one here; the OpenCode service already uses this in-network form.
    expect(env.get('HERMES_MCP_URL')).toBe('${HERMES_MCP_URL:-http://mcp:3001/mcp}')
  })

  it('passes the MCP credential through with an EMPTY default', () => {
    // Same ordering as `docker/opencode/entrypoint.sh`: the env var wins, and
    // `${VAR:-}` keeps a stack that never set it byte-for-byte bootable. A
    // literal here would be a secret committed to the repo.
    expect(env.get('MCP_SERVER_API_KEY')).toBe('${MCP_SERVER_API_KEY:-}')
  })

  it('names the shared key file the `mcp` service provisions', () => {
    // The fallback leg, and the SAME path the OpenCode service reads — the
    // volume is the platform's, not this file's.
    expect(env.get('MCP_SERVER_API_KEY_FILE')).toBe('/run/mcp-shared/mcp-api-key')
  })

  it('mounts the shared key volume READ-ONLY', () => {
    const mount = mounts.find((entry) => entry.target === '/run/mcp-shared')
    expect(mount).toBeDefined()
    expect(mount?.source).toBe('mcp_shared')
    // Read-only matters: this worker EXECUTES MODEL-GENERATED CODE. A writable
    // mount would let a turn rotate or replace the platform's MCP key.
    expect(mount?.mode).toBe('ro')
  })

  it('declares that volume EXTERNAL, named as the fullapp stack names it', () => {
    // EXTERNAL for the same reason the network is: `down` in this file must not
    // take the platform's MCP key volume with it. The name tracks the fullapp
    // file's own `${DEPLOY_ENV:-local}` suffix so both files address one volume.
    const declared = volumes.get('mcp_shared')
    expect(declared).toBeDefined()
    expect(declared?.external).toBe(true)
    expect(declared?.name).toBe(
      '${HERMES_MCP_SHARED_VOLUME:-mercato-mcp-shared-${DEPLOY_ENV:-local}}',
    )
  })

  it('a mount OUTSIDE the service’s volumes: list does not satisfy the assertion', () => {
    // The fix's comments name the mount, and a compose service has several other
    // places a `- src:tgt` line can sit. The mount appears in THREE of them — a
    // comment, a `labels:` list on the SAME service, and another service's
    // `volumes:` — and the parser must see none. `/hermes-src` is the control:
    // the parser does read a real list.
    //
    // The `labels:` leg is what makes the `inVolumes` gate testable at all:
    // another service's list is already excluded by the `inService` gate, so a
    // fixture with only that leg stays GREEN when `inVolumes` is deleted.
    const fixture = [
      'services:',
      '  hermes-gateway:',
      '    # - mcp_shared:/run/mcp-shared:ro  (documented, NOT mounted)',
      '    volumes:',
      '      - ${HERMES_PIN_DIR:-../../hermes-agent-main}:/hermes-src:ro',
      '    labels:',
      '      - mcp_shared:/run/mcp-shared:ro',
      '  other:',
      '    volumes:',
      '      - mcp_shared:/run/mcp-shared:ro',
    ].join('\n')
    const parsed = serviceVolumeMounts(fixture, 'hermes-gateway')
    expect(parsed.some((mount) => mount.source === 'mcp_shared')).toBe(false)
    expect(parsed.some((mount) => mount.target === '/hermes-src')).toBe(true)
  })

  it('parses a colon-bearing source (the pin mount) without losing its target', () => {
    // `split(':')` would turn the pin mount into four fields and read
    // `-../../hermes-agent-main}` as its target. This is the property that keeps
    // the mount guard above from being satisfied by the WRONG entry.
    const fixture = [
      'services:',
      '  hermes-gateway:',
      '    volumes:',
      '      - ${HERMES_PIN_DIR:-../../hermes-agent-main}:/hermes-src:ro',
      '      - mcp_shared:/run/mcp-shared:ro',
    ].join('\n')
    const parsed = serviceVolumeMounts(fixture, 'hermes-gateway')
    expect(parsed).toEqual([
      { source: '${HERMES_PIN_DIR:-../../hermes-agent-main}', target: '/hermes-src', mode: 'ro' },
      { source: 'mcp_shared', target: '/run/mcp-shared', mode: 'ro' },
    ])
  })

  it('does not read a service’s own volumes: list as a volume DECLARATION', () => {
    const fixture = [
      'services:',
      '  hermes-gateway:',
      '    volumes:',
      '      - mcp_shared:/run/mcp-shared:ro',
      'volumes:',
      '  hermes_state:',
      '    name: mercato-hermes-state',
    ].join('\n')
    const declared = topLevelVolumes(fixture)
    expect(declared.has('mcp_shared')).toBe(false)
    expect(declared.get('hermes_state')?.name).toBe('mercato-hermes-state')
  })
})

describe('P2-9a — docker/hermes/Dockerfile installs the SDK and ships the bootstrap', () => {
  const source = readFileSync(DOCKERFILE, 'utf8')
  const lines = logicalLines(source).map((line) => line.trim())

  it('asks uv for the pin’s OWN mcp extra (measured absent before it)', () => {
    // Measured before the fix: `import mcp` → ModuleNotFoundError; the client
    // was INERT (`SDK available: False`, `DISCOVERED: 0`) because
    // `register_mcp_servers` begins `if not _core._ensure_mcp_sdk(): return []`.
    const sync = lines.filter((line) => line.includes('uv sync'))
    expect(sync).toHaveLength(1)
    // Anchored with a boundary: a bare `toContain('--extra mcp')` is satisfied by
    // `--extra mcp-bogus` (measured), i.e. by a typo that installs nothing.
    expect(sync[0]).toMatch(/--extra\s+mcp(\s|$)/)
  })

  it('keeps --frozen: the extra is installable frozen only because the lock has it', () => {
    // Measured in the pin: `uv.lock` carries `{ name = "mcp", marker = "extra ==
    // 'mcp'", specifier = "==2.0.0" }` (and httpx2/starlette). The `mcp = false`
    // under `[tool.uv.exclude-newer-package]` is an exclude-newer EXEMPTION, not
    // an exclusion — it is why the lock resolves the package at all. Dropping
    // `--frozen` would let uv re-resolve and float a transitive the lock pinned.
    const sync = lines.filter((line) => line.includes('uv sync'))
    expect(sync[0]).toContain('--frozen')
    expect(sync[0]).toContain('--no-install-project')
  })

  it('COPYs the bootstrap and compile-checks it', () => {
    expect(lines.filter((line) => /^COPY\b/.test(line) && line.includes('mcp_bootstrap.py'))).toHaveLength(1)
    const compileLines = lines.filter((line) => line.includes('py_compile'))
    expect(compileLines).toHaveLength(1)
    expect(compileLines[0]).toContain('mcp_bootstrap.py')
  })

  it('ignores a file named ONLY in a comment (the parse is not a substring search)', () => {
    const fixture = [
      '# The image ships mcp_bootstrap.py and installs `uv sync --extra mcp`.',
      'RUN cd /build && uv sync --frozen --no-install-project --no-dev --python 3.14',
    ].join('\n')
    const parsed = logicalLines(fixture).map((line) => line.trim())
    expect(parsed.some((line) => line.includes('--extra mcp'))).toBe(false)
    expect(parsed.some((line) => line.includes('mcp_bootstrap.py'))).toBe(false)
  })
})

describe('P2-9a — docker/hermes/entrypoint.py writes the entry, after the pin, quietly', () => {
  const source = readFileSync(ENTRYPOINT, 'utf8')

  it('runs the bootstrap as a subprocess with its stdout DISCARDED', () => {
    // The pin's config modules are CLI code and print (its migration path writes
    // banners). This process's stdout is the gateway's JSON-RPC channel, where a
    // stray print is a corrupt frame — the same rule `verify_pin.py` and the
    // gateway itself follow. `stdout=DEVNULL` is what makes the import safe.
    expect(source).toMatch(
      /subprocess\.run\(\s*\[sys\.executable,\s*bootstrap,\s*SOURCE_DIR\],\s*stdout=subprocess\.DEVNULL\s*,?\s*\)/,
    )
  })

  it('runs it AFTER the pin digest check, never before', () => {
    // The bootstrap imports `hermes_cli.config` from the mounted tree. Importing
    // the pin from an UNVERIFIED mount is the single thing this ordering exists
    // to prevent, so the order is asserted rather than assumed.
    const verifyAt = source.indexOf('verify_pin.py')
    const bootstrapAt = source.indexOf('bootstrap = os.path.join')
    expect(verifyAt).toBeGreaterThan(-1)
    expect(bootstrapAt).toBeGreaterThan(-1)
    expect(bootstrapAt).toBeGreaterThan(verifyAt)
  })

  it('puts the resolved credential into the WORKER’s environment', () => {
    // `config.yaml` holds the literal `${MCP_SERVER_API_KEY}` and the pin
    // resolves it from `os.environ` at read time (measured: `get_secret` falls
    // through to `os.environ` in a single-profile deployment). The worker's
    // environment is the one this file builds for its final `execvpe`, so
    // without this line the placeholder stays literal and every call 401s.
    expect(source).toContain('os.environ[MCP_KEY_ENV] = key')
  })

  it('logs the credential’s SOURCE and LENGTH, never its value', () => {
    // These lines land in `docker compose logs`. Only the source and the length
    // may appear. See `loggedExpressions` for why the assertion is written on
    // the call's EXPRESSION rather than on the whole line — the message text
    // contains the English word "key" legitimately.
    const line = source.split(/\r?\n/).find((row) => row.includes('MCP credential resolved from'))
    expect(line).toBeDefined()
    expect(line).toContain('len(key)')
    expect(loggedExpressions(source, /\blog\(/)).not.toMatch(/\bkey\b/)
  })

  it('treats a REFUSED bootstrap as fatal, and an ABSENT credential as not', () => {
    // The distinction is the whole point: a deployment that configured no
    // credential may boot without tools (loudly), but one that ASKED for the
    // platform's tools and did not get them must not boot and silently look
    // healthy — that is the exact regression P2-9a exists to prevent.
    //
    // SCOPED to the region after the bootstrap is resolved. An unscoped
    // `/if\s+result\.returncode\s*!=\s*0:\s*fail\(/` over the whole file is
    // satisfied by the PIN-verification check near the top of `main()`, so the
    // mutant that downgrades THIS one to a `log(` stays GREEN — measured: it did
    // exactly that, and this is the fix.
    const bootstrapAt = source.indexOf('bootstrap = os.path.join')
    expect(bootstrapAt).toBeGreaterThan(-1)
    expect(source.slice(bootstrapAt)).toMatch(/if\s+result\.returncode\s*!=\s*0:\s*fail\(/)
  })
})

describe('P2-9a — docker/hermes/mcp_bootstrap.py uses the pin’s writer and PROVES the result', () => {
  const source = readFileSync(MCP_BOOTSTRAP, 'utf8')

  it('writes through the pin’s own writer, not hand-rolled YAML', () => {
    // `_save_mcp_server` is what `hermes mcp add` calls: it validates through
    // `validate_mcp_server_entry`, writes atomically, and sets the pin's file
    // permissions. Writing YAML here would drift from that schema.
    expect(source).toContain('from hermes_cli.mcp_config import _save_mcp_server')
    // ⚠ The IMPORT is not the claim; the CALL is. Measured: replacing
    // `_save_mcp_server(server_name, entry)` with a hand-rolled write while
    // leaving the import in place left this suite 53/53 GREEN — including this
    // very test, whose name says "not hand-rolled YAML". Anchor on the call site.
    expect(source).toMatch(/_save_mcp_server\(\s*server_name\s*,\s*entry\s*\)/)
  })

  it('reads the entry BACK through the pin’s own reader', () => {
    // `save_config` normalises and strips defaults before writing, so "I called
    // the writer" is not evidence the file holds what was asked for. Measured so
    // the round-trip is known to hold: `mcp_servers` is absent from
    // `DEFAULT_CONFIG` (it is in `_EXTRA_KNOWN_ROOT_KEYS`), so the strip pass
    // cannot drop the section.
    expect(source).toContain('from hermes_cli.config import load_config')
  })

  it('reads the RAW file to prove the placeholder is what is at rest', () => {
    // `read_raw_config()` is the file as written ("no defaults merged, no
    // migration"). This is the read that answers *is the secret at rest?*
    //
    // Anchored on the CALL SITE, not the bare name: this module's docstring
    // explains both readers by name, so `toContain('read_raw_config()')` would
    // be satisfied by the prose alone — a vacuous guard of exactly the kind the
    // blocks above exist to prevent.
    expect(source).toContain('from hermes_cli.config import load_config, read_raw_config')
    expect(source).toContain('read_raw_config().get("mcp_servers")')
  })

  it('checks AT-REST with the raw reader and NOT the expanded one (the measured defect)', () => {
    // The first version of the bootstrap compared the placeholder against
    // `load_config()` — which `_load_config_impl` ends by running through
    // `_expand_env_vars(normalized)`, so it returns the RESOLVED credential. The
    // proof then saw a value that is indistinguishable from a secret written to
    // disk, and correctly REFUSED to boot. Reading the wrong view makes the
    // at-rest claim untestable, so the pairing is asserted: the raw read comes
    // first and is what feeds the placeholder comparison.
    const rawAt = source.indexOf('read_raw_config().get("mcp_servers")')
    const expandedAt = source.indexOf('load_config().get("mcp_servers")')
    expect(rawAt).toBeGreaterThan(-1)
    expect(expandedAt).toBeGreaterThan(rawAt)
    expect(source.slice(rawAt, expandedAt)).toContain('!= PLACEHOLDER')
  })

  it('reads the EXPANDED config to prove the runtime resolves it', () => {
    // The leg that would otherwise fail as a 401 mid-turn: `load_config()` is
    // the pin's own load path (normalise → expand `${VAR}` from the process
    // environment), i.e. the same view `_load_mcp_config()` reads at turn time.
    expect(source).toContain('load_config().get("mcp_servers")')
    expect(source).toContain('!= key')
  })

  it('carries the `${VAR}` placeholder, never the credential', () => {
    // `config.yaml` lives in a PERSISTENT volume. Writing the key into it would
    // put the secret at rest and make rotation a volume edit; the placeholder is
    // the pin's own documented form for secrets.
    expect(source).toContain('PLACEHOLDER = "${" + KEY_ENV + "}"')
    expect(source).toContain('"x-api-key": PLACEHOLDER')
  })

  it('exits 0 with no entry when there is no credential (fail-soft, and loud)', () => {
    // Mirrors the ws door's shape: a deployment that cannot authenticate does
    // not get an entry that would 401 on every turn. The worker still serves
    // chat; it just has no platform tools, and says so on stderr.
    //
    // Read as a SLICE rather than a whole-file `toContain`, so the assertion is
    // about the absent-credential BRANCH: `note(` and `return 0` must sit inside
    // it, between the `if not key:` guard and the next guard.
    const start = source.indexOf('if not key:')
    const end = source.indexOf('if not url:')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const absentBranch = source.slice(start, end)
    expect(absentBranch).toContain('note(')
    expect(absentBranch).toContain('return 0')
    expect(source).toContain('No config entry was written')
  })

  it('never prints the credential', () => {
    // Same shape as the entrypoint's check, for the same reason: `note(` lines
    // land in `docker compose logs`, so only the LENGTH may appear.
    const noteLines = source.split(/\r?\n/).filter((row) => /\bnote\(/.test(row))
    expect(noteLines.some((row) => row.includes('len(key)'))).toBe(true)
    expect(loggedExpressions(source, /\bnote\(/)).not.toMatch(/\bkey\b/)
  })
})
