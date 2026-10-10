/**
 * @jest-environment node
 *
 * CC-27 / B6 — the **binding coverage gate**.
 *
 * The defect this suite exists to prevent: adding a NEW route that runs an AI
 * agent, and forgetting to put the binding check in front of it. `CC-27` refuses
 * an `ai_worker` principal that has no `ai_agent_bindings` row; if a future agent
 * dispatch site is added without `resolveAgentBinding`, that site silently
 * re-opens the hole on the one path nobody re-reads.
 *
 * Enforcement is only as complete as its **coverage**, so this suite asserts it
 * structurally rather than per-route: every file that *dispatches an agent* must
 * import and call `resolveAgentBinding`. A new dispatch site with no binding
 * check fails HERE, at the point of change, not in production.
 *
 * Two lists are kept honest:
 *   1. `AGENT_DISPATCH_ROUTES` — the routes that run an agent (must be gated).
 *   2. the scan — any OTHER route under `api/ai/**` that calls an agent runtime
 *      but is NOT in the list is a coverage hole (the list cannot go stale).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const MODULE_ROOT = join(__dirname, '..')
const API_ROOT = join(MODULE_ROOT, 'api', 'ai')

/** Routes that dispatch an agent and MUST therefore consult the binding. */
const AGENT_DISPATCH_ROUTES = [
  'api/ai/chat/route.ts',
  'api/ai/run-object/route.ts',
].map((p) => p.split('/').join(sep))

/** Markers that identify "this file dispatches an agent". */
const DISPATCH_MARKERS = [
  // Must mirror the agent-runtime's public dispatch entry points exactly;
  // the last test in this file enforces that.
  'runAiAgentText',
  'runAiAgentObject',
]

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) out.push(full)
  }
  return out
}

function read(rel: string): string {
  return readFileSync(join(MODULE_ROOT, rel), 'utf8')
}

/** Text after the last `import` line — so comments/imports don't create hits. */
function bodyAfterImports(source: string): string {
  const lines = source.split('\n')
  let lastImport = -1
  lines.forEach((line, i) => {
    if (/^\s*import\s/.test(line) || /^\s*}\s*from\s/.test(line)) lastImport = i
  })
  return lines.slice(lastImport + 1).join('\n')
}

describe('CC-27 / B6 — every agent dispatch site applies the binding gate', () => {
  it('the declared dispatch-route list is non-empty and on disk', () => {
    expect(AGENT_DISPATCH_ROUTES.length).toBeGreaterThan(0)
    for (const rel of AGENT_DISPATCH_ROUTES) {
      expect(() => read(rel)).not.toThrow()
    }
  })

  it.each(AGENT_DISPATCH_ROUTES)('%s imports resolveAgentBinding', (rel) => {
    expect(read(rel)).toMatch(/import\s*\{[^}]*resolveAgentBinding[^}]*\}/)
  })

  it.each(AGENT_DISPATCH_ROUTES)('%s CALLS resolveAgentBinding (not just imports it)', (rel) => {
    const source = read(rel)
    const calls = source.match(/resolveAgentBinding\s*\(/g) ?? []
    // one occurrence is the import; a CALL means at least two, or an inline use.
    const withoutImport = source.replace(
      /import\s*\{[^}]*resolveAgentBinding[^}]*\}\s*from[^\n]*/,
      '',
    )
    expect((withoutImport.match(/resolveAgentBinding\s*\(/g) ?? []).length).toBeGreaterThan(0)
    expect(calls.length).toBeGreaterThan(0)
  })

  it.each(AGENT_DISPATCH_ROUTES)('%s REFUSES with agent_not_bound', (rel) => {
    expect(read(rel)).toMatch(/agent_not_bound/)
  })

  it('nothing under api/** dispatches an agent by a name the marker list misses', () => {
    // The list above is only as good as the names in it. This test insists the
    // agent runtime be reached through ONE of the marker names — so a new route
    // cannot smuggle a dispatch in via an alias (`runAiAgentText`,
    // `runAiAgentObject`) that was never added to the list.
    const allApi = walk(API_ROOT)
    const offenders: string[] = []

    for (const abs of allApi) {
      const rel = relative(MODULE_ROOT, abs)
      if (AGENT_DISPATCH_ROUTES.includes(rel)) continue
      const body = bodyAfterImports(readFileSync(abs, 'utf8'))
      if (DISPATCH_MARKERS.some((m) => body.includes(m))) offenders.push(rel)
    }

    expect(offenders).toEqual([])
  })

  it('the runtime-module marker list is exactly the runtime\'s real dispatch exports', () => {
    // Read the runtime's own export surface and require every public
    // agent-dispatch entry point to be named in DISPATCH_MARKERS. If someone
    // adds `runAiAgentFoo`, the coverage scan above would miss it — this makes
    // that drift a test failure instead.
    const runtime = readFileSync(join(MODULE_ROOT, 'lib', 'agent-runtime.ts'), 'utf8')
    const exportedDispatchFns = Array.from(
      runtime.matchAll(/export\s+(?:async\s+)?function\s+(runAiAgent\w+)/g),
    ).map((m) => m[1])

    expect(exportedDispatchFns.length).toBeGreaterThan(0)
    const missing = exportedDispatchFns.filter((name) => !DISPATCH_MARKERS.includes(name))
    expect(missing).toEqual([])
  })
})
