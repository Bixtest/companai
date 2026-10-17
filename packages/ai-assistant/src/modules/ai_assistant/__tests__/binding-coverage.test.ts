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

/**
 * `CC-67` — the files that ARE the door, not callers of it.
 *
 * Behind the door (row 28), the dispatch call to the engine lives in an
 * ADAPTER, not in the business code: `lib/opencode-port-adapter.ts` (the
 * OpenCode engine) and `lib/agent-runtime-port-adapter.ts` (the platform's own
 * in-process AI SDK runtime). These files call `runAiAgentText`/`runAiAgentObject`
 * **by design** — but they do NOT make the binding decision, and must not: they
 * have no `em`/`auth`, and the binding check belongs to the caller that knows the
 * principal. The gate is therefore enforced **at the door's callers**
 * (`api/ai/chat/route.ts`, `api/ai/run-object/route.ts`,
 * `lib/business-ir-author.ts`), each of which still resolves the binding and
 * refuses `agent_not_bound` before constructing the adapter.
 *
 * They are excluded from the offender scan for the same reason
 * `RUNTIME_DEFINITION` is: they are the thing being reached, the one place that
 * legitimately names the engine — not another business caller. The `CC-67` pin
 * below keeps the gate on the CALLERS from regressing.
 */
const RUNTIME_ADAPTERS = [
  join('lib', 'opencode-port-adapter.ts'),
  join('lib', 'agent-runtime-port-adapter.ts'),
]

/**
 * `CC-103` — dispatch sites gated by **principal kind** rather than by a binding
 * row, because the agent they run cannot be bound at all.
 *
 * `api/chat/route.ts` runs `ai_assistant.chat`, which is not a code-declared
 * agent: `getAgent('ai_assistant.chat')` is undefined and the manage surface
 * 404s on an unknown agent, so **no binding row can ever authorise it**. Applying
 * the resolver there would refuse every machine forever; skipping it left the one
 * path where a `service` key reached an agent with no grant. It now refuses every
 * non-`human` principal instead, and the pin below keeps that true.
 *
 * A file belongs here ONLY if it can be shown that the agent it runs cannot be
 * bound. If a future route could be bound, it belongs in `AGENT_DISPATCH_ROUTES`.
 */
const GATED_BY_PRINCIPAL_KIND = [join('api', 'chat', 'route.ts')]

/**
 * `CC-103` — the file that DEFINES the door. It matches `resolveAiRuntimePort(`
 * on its own `export function` line, so it would read as a caller. It is the
 * thing being reached, exactly as `RUNTIME_DEFINITION` is.
 */
const DOOR_DEFINITION = join('lib', 'resolve-ai-runtime-port.ts')

/**
 * `CC-67` — the files whose dispatch now happens THROUGH the door, and which
 * must therefore keep consulting the binding themselves (they are the gate).
 * The scan below cannot see them as dispatchers any more (they no longer call a
 * `runAiAgent*` marker directly), so this list pins that they are still gated.
 */
const DOOR_CALLERS_THAT_MUST_STAY_GATED = [
  join('api', 'ai', 'chat', 'route.ts'),
  join('api', 'ai', 'run-object', 'route.ts'),
  join('lib', 'business-ir-author.ts'),
]

/** Markers that identify "this file dispatches an agent". */
const DISPATCH_MARKERS = [
  // Must mirror the agent-runtime's public dispatch entry points exactly;
  // the last test in this file enforces that.
  'runAiAgentText',
  'runAiAgentObject',
  // ★ CC-103 — and the DOOR. `CC-67` moved dispatch behind a port, so a file can
  // now start a run without naming `runAiAgent*` at all: it calls
  // `resolveAiRuntimePort(...)` and then `port.startRun(...)`. Neither marker was
  // in this list, so `api/chat/route.ts` — which runs `ai_assistant.chat` through
  // the port and consults NO binding — was invisible to this gate. That is
  // exactly the hole this suite exists to catch, and it survived the gate because
  // the gate could not see the door. Only callers import `resolveAiRuntimePort`;
  // the module that defines it does not call it, so no exclusion is needed.
  'resolveAiRuntimePort',
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
    const gatedByKind: string[] = []

    for (const abs of all) {
      const rel = relative(MODULE_ROOT, abs)
      if (AGENT_DISPATCH_ROUTES.includes(rel)) continue
      if (rel === RUNTIME_DEFINITION) continue
      if (rel === DOOR_DEFINITION) continue
      // `CC-67` — the adapters ARE the door: the one legitimate place that names
      // the engine. They are not business callers and do not own the gate.
      if (RUNTIME_ADAPTERS.includes(rel)) continue
      const raw = readFileSync(abs, 'utf8')
      const body = stripComments(bodyAfterImports(raw))
      // Alias-aware: a dispatch imported `as someOtherName` is still a dispatch.
      if (!dispatchCallRe(raw).test(body)) continue
      // GATED: it both imports and CALLS the binding resolver (comments stripped).
      // Also alias-aware, so `resolveAgentBinding as gate` + `gate(...)` counts.
      if (resolveBindingCallRe(raw).test(stripComments(raw))) {
        gatedCallers.push(rel)
      } else if (GATED_BY_PRINCIPAL_KIND.includes(rel)) {
        // `CC-103` — gated by principal kind instead, because the agent it runs
        // cannot be bound. The pin below asserts it really does refuse machines.
        gatedByKind.push(rel)
      } else {
        offenders.push(rel)
      }
    }

    // Every offender is EXACTLY a known, scheduled gap. A new un-gated dispatcher
    // (a real coverage hole) fails here; a stale allowlist entry also fails. Every
    // other caller is GATED by construction (the arm above).
    expect(offenders.sort()).toEqual([...IN_PROCESS_DISPATCH_SITES].sort())
    // Since `CC-67`, every dispatch marker in the tree is called from an ADAPTER
    // (excluded above as the door) — so `gatedCallers` is legitimately empty here.
    // The gate that used to be proven by this arm is now proven by the explicit
    // `CC-67 — every caller of the runtime door still consults the binding` test
    // below. This arm still catches a FUTURE in-process dispatcher: if one is
    // added it appears in `offenders` (and fails the assertion above) unless it is
    // gated, in which case it appears in `gatedCallers`.
    if (gatedCallers.length > 0) {
      for (const rel of gatedCallers) {
        expect(resolveBindingCallRe(readFileSync(join(MODULE_ROOT, rel), 'utf8')).test(
          stripComments(readFileSync(join(MODULE_ROOT, rel), 'utf8')),
        )).toBe(true)
      }
    }
  })

  it('CC-103 — a principal-kind-gated dispatch site really refuses non-human callers', () => {
    // The allowlist above is only honest if each entry earns it. A route that is
    // exempt from the binding gate because it CANNOT be bound must still refuse
    // machines — otherwise "gated by principal kind" is a label on an open door.
    expect(GATED_BY_PRINCIPAL_KIND.length).toBeGreaterThan(0)
    for (const rel of GATED_BY_PRINCIPAL_KIND) {
      const src = stripComments(read(rel))
      expect(src).toMatch(/requirePrincipal\s*\(/)
      expect(src).toMatch(/kind\s*!==\s*'human'/)
      expect(src).toMatch(/403/)
    }
  })

  it('CC-103 — every door caller is either binding-gated or principal-gated', () => {
    // The scan above is only as good as its markers. This pins the OUTCOME: no
    // file in the module calls `resolveAiRuntimePort(` without one of the two
    // gates. It is the assertion that would have failed for `api/chat/route.ts`
    // before `CC-103`.
    const offenders: string[] = []
    for (const abs of walk(MODULE_ROOT)) {
      const rel = relative(MODULE_ROOT, abs)
      if (rel === RUNTIME_DEFINITION) continue
      if (rel === DOOR_DEFINITION) continue
      if (RUNTIME_ADAPTERS.includes(rel)) continue
      const raw = readFileSync(abs, 'utf8')
      if (!/resolveAiRuntimePort\s*\(/.test(stripComments(bodyAfterImports(raw)))) continue
      const gatedByBinding = resolveBindingCallRe(raw).test(stripComments(raw))
      const gatedByKind = GATED_BY_PRINCIPAL_KIND.includes(rel)
      if (!gatedByBinding && !gatedByKind) offenders.push(rel)
    }
    expect(offenders).toEqual([])
  })

  it('CC-57 / CC-67 — the one known in-process dispatch site is GATED (positive pin)', () => {
    // The `CC-55` header promised this pin; `CC-57` delivers it and closes the
    // gap. `lib/business-ir-author.ts` (`authorBusinessQueryIr`) used to dispatch
    // via `runAiAgentObject` with NO binding check and no `boundScope`. It now:
    //   (1) still runs the agent — since `CC-67` THROUGH THE DOOR (it constructs
    //       the runtime port adapter and calls `runObjectForRun`; it no longer
    //       names the engine), and
    //   (2) consults the binding — imports AND calls `resolveAgentBinding` — and
    //   (3) threads the narrowed scope into the runtime (`computeBoundRunScope` … `boundScope`).
    // If any of those is removed by a future refactor, this fails — the closure
    // cannot silently regress.
    const rel = join('lib', 'business-ir-author.ts')
    const raw = read(rel)
    const stripped = stripComments(raw)

    // (1) It still RUNS an agent — through the door (`CC-67`). Either the direct
    // dispatch marker (pre-CC-67) or the door's own op counts, so this pin does
    // not silently pass on a file that stopped running the agent.
    const runsAgent =
      dispatchCallRe(raw).test(stripComments(bodyAfterImports(raw))) ||
      /createAgentRuntimePortAdapter\s*\(/.test(stripped)
    expect(runsAgent).toBe(true)
    // ...and it reaches the engine only THROUGH the door, never by name.
    expect(raw).not.toMatch(/from\s+['"][^'"]*\bagent-runtime['"]/)

    // (2) It consults the binding — import + a real call (not a comment).
    expect(raw).toMatch(/import\s*\{[^}]*resolveAgentBinding[^}]*\}/)
    expect(resolveBindingCallRe(raw).test(stripped)).toBe(true)

    // (3) It refuses when unbound AND threads the computed scope.
    expect(stripped).toMatch(/agent_not_bound/)
    expect(stripped).toMatch(/computeBoundRunScope\s*\(/)
    expect(stripped).toMatch(/boundScope/)
  })

  it('CC-67 — every caller of the runtime door still consults the binding', () => {
    // The dispatch behind the door is gated by the caller that constructs the
    // adapter (the adapter has no `em`/`auth` and must not decide). This pins
    // that each of the three door callers keeps the gate — so `CC-67` cannot
    // move the dispatch behind the door and leave it ungated.
    for (const rel of DOOR_CALLERS_THAT_MUST_STAY_GATED) {
      const raw = read(rel)
      const stripped = stripComments(raw)
      expect(resolveBindingCallRe(raw).test(stripped)).toBe(true)
      expect(stripped).toMatch(/agent_not_bound/)
    }
  })

  it('CC-67 — the adapters are the door, and never consult the binding themselves', () => {
    // An adapter that grew its own binding check would be a second, competing
    // gate (and it has no `em`/`auth` to consult). This pins the boundary: each
    // adapter names its engine and does NOT resolve the binding.
    //
    // The engine each adapter names differs: the OpenCode adapter calls the
    // OpenCode handlers, the platform adapter calls the in-process `runAiAgent*`
    // entry points. Both are engines; neither makes the binding decision.
    const engineMarkers: Record<string, RegExp> = {
      [join('lib', 'opencode-port-adapter.ts')]: /handleOpenCode\w+/,
      [join('lib', 'agent-runtime-port-adapter.ts')]: /runAiAgent(?:Text|Object)\s*\(/,
    }
    for (const rel of RUNTIME_ADAPTERS) {
      const raw = read(rel)
      expect(raw).toMatch(engineMarkers[rel])
      expect(stripComments(raw)).not.toMatch(/resolveAgentBinding\s*\(/)
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
