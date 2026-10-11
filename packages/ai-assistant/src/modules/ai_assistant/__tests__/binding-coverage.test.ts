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
 * `CC-55` hardening / `CC-57` closure — dispatch sites OUTSIDE the gated routes
 * that call the runtime but do **NOT** consult the binding. Each would be a
 * KNOWN gap with a scheduled callback; the module-wide scan below fails if a NEW
 * un-gated site appears, and fails if one of these disappears (so the list cannot
 * go stale).
 *
 * **Empty since `CC-57`.** The one known gap was `lib/business-ir-author.ts`:
 * `authorBusinessQueryIr` called `runAiAgentObject` with the fixed
 * `business_ir.query_author` agent and no `boundScope`. It now resolves the
 * binding and threads the narrowed scope, exactly as the routed paths do — so it
 * is GATED (the scan's GATED arm recognises a dispatch site that CALLS
 * `resolveAgentBinding`), and it is no longer an offender. The positive pin in
 * the last test keeps that closure from silently regressing.
 */
const IN_PROCESS_DISPATCH_SITES: string[] = []

/** Markers that identify "this file dispatches an agent". */
const DISPATCH_MARKERS = [
  // Must mirror the agent-runtime's public dispatch entry points exactly;
  // the last test in this file enforces that.
  'runAiAgentText',
  'runAiAgentObject',
]

/**
 * The local names by which this file refers to a dispatch entry point — the
 * bare names AND any `as`-alias they were imported under.
 *
 * A scan that matched only the literal `runAiAgentObject(` would be evadable:
 * `import { runAiAgentObject as dispatch } from './agent-runtime'` then
 * `dispatch(...)` dispatches an agent while matching neither the marker list nor
 * the call regex, so the file would be invisible to the gate. This closes that
 * hole by resolving the local binding name from the import, so the call regex
 * below matches the ALIAS too. Empirically none exists today; the point is that
 * the enforcement cannot be silently walked around by one.
 */
function dispatchCallNamesIn(source: string): string[] {
  const names = new Set<string>(DISPATCH_MARKERS)
  const importRe = /import\s*\{([^}]*)\}\s*from\s*[^\n]*/g
  for (const m of source.matchAll(importRe)) {
    for (const specifier of m[1].split(',')) {
      // `runAiAgentObject as dispatch` — capture the local (alias) name.
      const alias = specifier.match(/^\s*(runAiAgent(?:Text|Object))\s+as\s+([A-Za-z_$][\w$]*)\s*$/)
      if (alias) names.add(alias[2])
    }
  }
  return [...names]
}

/** A regex that matches a CALL of any local dispatch name (including aliases). */
function dispatchCallRe(source: string): RegExp {
  const alternation = dispatchCallNamesIn(source)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  return new RegExp(`\\b(?:${alternation})\\s*\\(`)
}

/**
 * Alias-aware counterpart for the binding resolver: matches a CALL of
 * `resolveAgentBinding` OR any local alias it was imported under
 * (`import { resolveAgentBinding as gate }` → `gate(`). The bare `source`
 * already contains the import, so a stripped file is passed in.
 */
function resolveBindingCallRe(source: string): RegExp {
  const names = new Set<string>(['resolveAgentBinding'])
  const importRe = /import\s*\{([^}]*)\}\s*from\s*[^\n]*/g
  for (const m of source.matchAll(importRe)) {
    for (const specifier of m[1].split(',')) {
      const alias = specifier.match(/^\s*(resolveAgentBinding)\s+as\s+([A-Za-z_$][\w$]*)\s*$/)
      if (alias) names.add(alias[2])
    }
  }
  const alternation = [...names]
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  return new RegExp(`\\b(?:${alternation})\\s*\\(`)
}

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

  it('CC-55 — every in-process dispatch site is either GATED or a named gap', () => {
    // Broadened in CC-55: the scan covers the WHOLE module, not just `api/ai/**`,
    // so an in-process dispatcher (a lib helper calling `runAiAgentObject`) is no
    // longer invisible.
    //
    // CC-57 added the GATED arm the CC-55 header promised: a file that CALLS a
    // dispatch entry point **and consults `resolveAgentBinding`** is GATED (the
    // same bar the routed paths meet), so it is NOT an offender. Only a file that
    // dispatches **without** consulting the binding is a coverage hole — and, when
    // it is not one of the known, scheduled `IN_PROCESS_DISPATCH_SITES`, it fails
    // here. (Empirically, `IN_PROCESS_DISPATCH_SITES` is empty: the one known site,
    // `lib/business-ir-author.ts`, is now GATED — see the positive pin below.)
    //
    // The recognition is deliberately the SAME predicate the file-level route
    // assertions use (`resolveAgentBinding` imported AND called), so a site cannot
    // pass this scan by importing the symbol and never calling it.
    const all = walk(MODULE_ROOT)
    const offenders: string[] = []
    const gatedCallers: string[] = []

    for (const abs of all) {
      const rel = relative(MODULE_ROOT, abs)
      if (AGENT_DISPATCH_ROUTES.includes(rel)) continue
      if (rel === RUNTIME_DEFINITION) continue
      const raw = readFileSync(abs, 'utf8')
      const body = stripComments(bodyAfterImports(raw))
      // Alias-aware: a dispatch imported `as someOtherName` is still a dispatch.
      if (!dispatchCallRe(raw).test(body)) continue
      // GATED: it both imports and CALLS the binding resolver (comments stripped).
      // Also alias-aware, so `resolveAgentBinding as gate` + `gate(...)` counts.
      if (resolveBindingCallRe(raw).test(stripComments(raw))) {
        gatedCallers.push(rel)
      } else {
        offenders.push(rel)
      }
    }

    // Every offender is EXACTLY a known, scheduled gap. A new un-gated dispatcher
    // (a real coverage hole) fails here; a stale allowlist entry also fails. Every
    // other caller is GATED by construction (the arm above).
    expect(offenders.sort()).toEqual([...IN_PROCESS_DISPATCH_SITES].sort())
    // The GATED arm must be non-vacuous: at least the one known in-process site
    // (`lib/business-ir-author.ts`) must have been recognised as gated. A scan
    // that recognises nothing would make every file look like an offender (the
    // assertion above would then fail) — but this pins the positive direction too,
    // so the arm cannot be silently weakened into "nobody calls anything".
    expect(gatedCallers).toContain(join('lib', 'business-ir-author.ts'))
  })

  it('CC-57 — the one known in-process dispatch site is GATED (positive pin)', () => {
    // The `CC-55` header promised this pin; `CC-57` delivers it and closes the
    // gap. `lib/business-ir-author.ts` (`authorBusinessQueryIr`) used to dispatch
    // via `runAiAgentObject` with NO binding check and no `boundScope`. It now:
    //   (1) still dispatches (so this pin is not satisfied by a file that stopped
    //       running the agent), and
    //   (2) consults the binding — imports AND calls `resolveAgentBinding` — and
    //   (3) threads the narrowed scope into the runtime (`computeBoundRunScope` … `boundScope`).
    // If any of those is removed by a future refactor, this fails — the closure
    // cannot silently regress.
    const rel = join('lib', 'business-ir-author.ts')
    const raw = read(rel)
    const stripped = stripComments(raw)

    // (1) It still dispatches an agent.
    expect(dispatchCallRe(raw).test(stripComments(bodyAfterImports(raw)))).toBe(true)

    // (2) It consults the binding — import + a real call (not a comment).
    expect(raw).toMatch(/import\s*\{[^}]*resolveAgentBinding[^}]*\}/)
    expect(resolveBindingCallRe(raw).test(stripped)).toBe(true)

    // (3) It refuses when unbound AND threads the computed scope.
    expect(stripped).toMatch(/agent_not_bound/)
    expect(stripped).toMatch(/computeBoundRunScope\s*\(/)
    expect(stripped).toMatch(/boundScope/)
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

  it('CC-57 — the dispatch scan sees an ALIASED import (the evasion the critic raised)', () => {
    // The textual scan matches `runAiAgentObject(` by NAME. A file could import
    // the dispatch entry under an alias (`… as dispatch`) and dispatch through
    // the alias — invisible to a name-only match. The scan is alias-aware so
    // that evasion is caught. No such alias exists in the tree today (`grep` for
    // `runAiAgent(Text|Object) as` returns nothing); this pins the detection so
    // it cannot regress if one is ever introduced.
    const aliased = [
      "import { runAiAgentObject as dispatch } from './agent-runtime'",
      'export async function sneak() { return dispatch({ agentId: "x" }) }',
    ].join('\n')
    expect(dispatchCallRe(aliased).test(stripComments(bodyAfterImports(aliased)))).toBe(true)

    // And the symmetric case on the resolver side: `… as gate` + `gate(...)`
    // must be recognised as a GATED call, so a gated-by-alias file is not
    // misfiled as an offender.
    const aliasedGate = [
      "import { resolveAgentBinding as gate } from './agent-binding'",
      'export async function ok() { return gate({ em, auth, agentId: "x" }) }',
    ].join('\n')
    expect(resolveBindingCallRe(aliasedGate).test(stripComments(aliasedGate))).toBe(true)

    // The bare (non-aliased) forms are still recognised — the alias handling
    // must not have broken the ordinary path.
    const plain = "import { runAiAgentObject } from './agent-runtime'\nrunAiAgentObject({ agentId: 'x' })"
    expect(dispatchCallRe(plain).test(stripComments(bodyAfterImports(plain)))).toBe(true)
  })

  it('CC-56 — the pending-action confirm path consults the binding', () => {
    // The confirm route EXECUTES a stored tool (a one-hop-removed execution
    // path). It does NOT call a dispatch entry point, so the scan above does not
    // cover it; this assertion keeps its binding re-check from being silently
    // dropped by a future refactor.
    const rel = join('api', 'ai', 'actions', '[id]', 'confirm', 'route.ts')
    const source = read(rel)
    expect(source).toMatch(/import\s*\{[^}]*resolveAgentBinding[^}]*\}/)
    // Strip comments first — a `// resolveAgentBinding(...)` must NOT satisfy the
    // call check (the CC-55 scan uses `stripComments` for the same reason).
    const withoutImport = stripComments(source).replace(
      /import\s*\{[^}]*resolveAgentBinding[^}]*\}\s*from[^\n]*/,
      '',
    )
    expect(withoutImport).toMatch(/resolveAgentBinding\s*\(/)
    expect(source).toMatch(/agent_not_bound/)
  })
})
