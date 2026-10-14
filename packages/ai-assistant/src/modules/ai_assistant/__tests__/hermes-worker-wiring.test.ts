/**
 * @jest-environment node
 *
 * `P2-7` (§2.13) — **the pinned worker's model wiring is FORWARDED by the compose.**
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
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS PARSES INSTEAD OF GREPPING
 * ─────────────────────────────────────────────────────────────────────────────
 * A `toContain('OPENAI_BASE_URL')` check would be **vacuous**: the fix's own
 * explanatory COMMENT names every one of these keys. So this suite strips
 * comments and reads the `environment:` MAPPING of the `hermes-gateway` service.
 * The `ignores a key that appears only in a comment` test below is the proof
 * that the parse is real rather than a substring search in disguise — and it is
 * the mutation target for exactly that failure mode.
 *
 * The compose file lives at the repo root; the `REPO_ROOT` walk is the same
 * convention `packages/cli` and `packages/ui` already use for repo-wide guards.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..')
const COMPOSE = join(REPO_ROOT, 'docker-compose.hermes.yml')

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

  it('ignores a key that appears ONLY in a comment (the parse is not a substring search)', () => {
    // The fix's explanatory comments name every forwarded key, so a naive
    // `toContain` guard would pass even with the mapping deleted. This fixture is
    // the anti-false-positive proof: the key is present as prose, absent as a
    // mapping — and the parser must see nothing.
    const fixture = [
      'services:',
      '  hermes-gateway:',
      '    environment:',
      '      # OPENAI_BASE_URL: ${OPENAI_BASE_URL:-}  (documented, NOT forwarded)',
      '      HERMES_HOME: /var/lib/hermes',
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
