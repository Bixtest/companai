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

/** Routes that dispatch an agent and MUST therefore consult the binding. */
const AGENT_DISPATCH_ROUTES = [
  'api/ai/chat/route.ts',
  'api/ai/run-object/route.ts',
].map((p) => p.split('/').join(sep))

/**
 * The runtime file that DEFINES the dispatch entry points — it is the thing
 * being reached, not a caller, so the module-wide scan excludes it.
 */
const RUNTIME_DEFINITION = join('lib', 'agent-runtime.ts')

/**
 * `CC-55` hardening — dispatch sites OUTSIDE the gated routes that call the
 * runtime but do NOT consult the binding. Each is a KNOWN gap with a scheduled
 * callback; the module-wide scan below fails if a NEW un-gated site appears, and
 * fails if one of these disappears (so the list cannot go stale).
 *
 * - `lib/business-ir-author.ts` — `authorBusinessQueryIr` calls
 *   `runAiAgentObject` with the fixed `business_ir.query_author` agent and no
 *   `boundScope`. It is an in-process helper with **no caller today** (not routed,
 *   not in the barrel); wiring a scope needs the caller's `AuthContext`, which the
 *   helper does not receive. Scheduled as **`CC-57`** (thread the bound scope into
 *   every in-process dispatch site).
 */
const IN_PROCESS_DISPATCH_SITES = ['lib/business-ir-author.ts'].map((p) => p.split('/').join(sep))

/** Markers that identify "this file dispatches an agent". */
const DISPATCH_MARKERS = [
  // Must mirror the agent-runtime's public dispatch entry points exactly;
  // the last test in this file enforces that.
  'runAiAgentText',
  'runAiAgentObject',
]

/** Matches an actual CALL of a dispatch entry point (name followed by `(`). */
const DISPATCH_CALL_RE = /\brunAiAgent(?:Text|Object)\s*\(/

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

/** Removes block and line comments so a name in a comment is not a false hit. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
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

  it('CC-55 — every in-process dispatch site is either GATED or a named CC-57 gap', () => {
    // Broadened in CC-55: the scan covers the WHOLE module, not just `api/ai/**`,
    // so an in-process dispatcher (a lib helper calling `runAiAgentObject`) is no
    // longer invisible. A file that CALLS a dispatch entry point and is neither a
    // gated route nor the runtime definition itself must be a KNOWN, named gap.
    const all = walk(MODULE_ROOT)
    const offenders: string[] = []

    for (const abs of all) {
      const rel = relative(MODULE_ROOT, abs)
      if (AGENT_DISPATCH_ROUTES.includes(rel)) continue
      if (rel === RUNTIME_DEFINITION) continue
      const body = stripComments(bodyAfterImports(readFileSync(abs, 'utf8')))
      if (DISPATCH_CALL_RE.test(body)) offenders.push(rel)
    }

    // The offenders are EXACTLY the known, scheduled in-process sites. A new one
    // (a real coverage hole) fails here; a stale allowlist entry also fails.
    expect(offenders.sort()).toEqual([...IN_PROCESS_DISPATCH_SITES].sort())
  })

  it('CC-55 — every named in-process gap still exists and is genuinely un-gated', () => {
    for (const rel of IN_PROCESS_DISPATCH_SITES) {
      const source = read(rel)
      // It must still dispatch (otherwise the entry is stale and must be removed)…
      expect(stripComments(bodyAfterImports(source))).toMatch(DISPATCH_CALL_RE)
      // …and it must NOT consult the binding yet (that is the CC-57 work).
      expect(source).not.toMatch(/resolveAgentBinding/)
    }
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
