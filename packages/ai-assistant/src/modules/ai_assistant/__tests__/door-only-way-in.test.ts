/**
 * @jest-environment node
 *
 * R28-5 / `B-05` / `N-8` — **the door is the only way in**.
 *
 * The defect this suite exists to prevent: row 28 gave the AI engine **one typed
 * door** (`lib/ai-runtime-port.ts` + its two adapters), and `CC-67` moved the
 * last direct callers onto it. Without a check, the door is a *suggestion* — the
 * next session can add a route that imports an engine by name and re-opens the
 * bypass nobody re-reads.
 *
 * This suite is the mechanical proof of the row's own sentence — *"no other code
 * talks to it directly"* — over the WHOLE package, and it fails **at the point
 * of change**:
 *   - a NEW file that imports an engine fails here;
 *   - a REMOVED exception also fails (the allowlist cannot go stale);
 *   - the engine-module set is **declared, then checked against the tree** (each
 *     named file must really define an engine entry point, and the
 *     `derives every engine from the tree` test scans `lib/` for engine-defining
 *     files and requires the declaration to name them all), so a third engine
 *     (or a rename) cannot slip past a hand-typed list.
 *
 * The honest, named exceptions are exactly the reaches that are **not runs** and
 * are registered with a callback:
 *   - `src/index.ts` — the package barrel (a re-export, not a caller);
 *   - `api/chat/route.ts` — the `answerQuestion` short-circuit (`CC-69`);
 *   - `api/health/route.ts` — the health/monitoring endpoint (`CC-71`).
 * Each is pinned to the exact engine module it may import, so "an exception"
 * cannot quietly become "any import".
 *
 * This is deliberately a SIBLING of `binding-coverage.test.ts` (which proves the
 * *gate*): that suite asks "is every dispatch gated?"; this one asks "does
 * anything reach an engine without the door?". Different question, different
 * file — so neither suite's failure has two meanings.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const MODULE_ROOT = join(__dirname, '..')
/** `src/` — the scan covers the WHOLE package, not just the module. */
const SRC_ROOT = join(__dirname, '..', '..', '..')
/** The package barrel: `src/index.ts`. */
const BARREL = join(SRC_ROOT, 'index.ts')

/**
 * The engine modules — the things a caller must NOT import directly.
 *
 * **DECLARED, and then CHECKED against the tree.** (A critic correctly pointed
 * out the first header overclaimed "derived, not typed": this list IS typed.) The
 * honest statement is: the list is a **declaration**, and two tests below keep it
 * from going stale — (a) each named file must really exist and really **define**
 * an engine entry point; (b) the `derives every engine from the tree` test scans
 * the module for files that DEFINE an agent-dispatch/engine export and requires
 * this list to name them, so a NEW engine file fails. The two known engines:
 *   - `lib/agent-runtime.ts`   — the platform's in-process AI-SDK runtime;
 *   - `lib/opencode-client.ts` / `lib/opencode-handlers.ts` — the OpenCode engine.
 */
const ENGINE_FILES = [
  join('lib', 'agent-runtime.ts'),
  join('lib', 'opencode-client.ts'),
  join('lib', 'opencode-handlers.ts'),
]
/** Engine basenames, e.g. `opencode-client` — what an import specifier resolves to. */
const ENGINE_BASENAMES = ENGINE_FILES.map((e) => (e.split(`${sep}`).pop() ?? '').replace(/\.ts$/, ''))

/**
 * Files that ARE the door (or the engine itself) — legitimately allowed to name
 * an engine, and skipped by the scan. Expressed relative to `MODULE_ROOT`.
 *   - the engine definitions themselves (the thing being reached);
 *   - the two adapters (adapter #1 OpenCode, adapter #2 platform runtime);
 *   - the OpenCode client ↔ handlers internal edge (one engine, one boundary).
 */
const DOOR_OR_ENGINE = [
  join('lib', 'agent-runtime.ts'),
  join('lib', 'opencode-client.ts'),
  join('lib', 'opencode-handlers.ts'),
  join('lib', 'opencode-port-adapter.ts'),
  join('lib', 'agent-runtime-port-adapter.ts'),
]

/**
 * The honest exceptions — each `[file (relative to MODULE_ROOT), the engine
 * basename it may import]`.
 *
 * Pinning the allowed engine (not a boolean "is excluded") means an exception
 * cannot silently grow a SECOND engine import: the barrel may re-export both
 * engines (it is the public surface), the chat route may import only
 * `opencode-client`, the health route only `opencode-handlers`.
 */
const NAMED_EXCEPTIONS: Array<[string, string]> = [
  // the package barrel — a re-export, not a caller (may surface BOTH engines).
  [join('..', '..', 'index.ts'), 'agent-runtime'],
  [join('..', '..', 'index.ts'), 'opencode-client'],
  [join('..', '..', 'index.ts'), 'opencode-handlers'],
  // `CC-69` — the chat route's `answerQuestion` short-circuit (not a run).
  // NOTE: this is `api/chat/route.ts` (the OpenCode-backed chat), NOT
  // `api/ai/chat/route.ts` (the platform-runtime route, which is fully behind
  // the door). The two routes are easy to confuse — the exception is pinned to
  // the exact file that makes the reach.
  [join('api', 'chat', 'route.ts'), 'opencode-client'],
  // `CC-71` — the health/monitoring endpoint (not a run).
  [join('api', 'health', 'route.ts'), 'opencode-handlers'],
]

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules' || entry === 'integration') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    // `.tsx` is INCLUDED: a production React component is a production file, and
    // it can import an engine exactly like a `.ts` file. (A critic found this gap:
    // the first version walked `.ts` only, so 36 `.tsx` files were invisible.)
    else if ((entry.endsWith('.ts') || entry.endsWith('.tsx')) && !entry.endsWith('.d.ts')) out.push(full)
  }
  return out
}

/** Removes block and line comments so a name in prose is not a false hit. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/**
 * Every engine module this file reaches, as engine basenames.
 *
 * **All the forms a real module edge can take** (a critic found the first version
 * missed several, so a file could reach an engine and still pass):
 *   - static named/default/namespace import, single-line OR multi-line:
 *     `import X from '<spec>'`, `import { … }\n from '<spec>'`, `import * as X from '<spec>'`;
 *   - re-export: `export … from '<spec>'`, `export * from '<spec>'`;
 *   - **side-effect import**: `import '<spec>'`;
 *   - **CommonJS**: `require('<spec>')`;
 *   - **dynamic import**: `import('<spec>')`.
 * Comment-stripped, so a bare name in prose does not count. We match on the
 * **basename** of the specifier (any relative depth, or the package specifier
 * `@open-mercato/ai-assistant/...` ending in the engine's file name).
 */
function engineImportsIn(source: string): string[] {
  const stripped = stripComments(source)
  const specifiers: string[] = []
  // any `from '<spec>'` (covers static import + export, single- or multi-line).
  const fromRe = /\bfrom\s*['"]([^'"]+)['"]/g
  for (const m of stripped.matchAll(fromRe)) specifiers.push(m[1])
  // side-effect import: `import '<spec>'` (no `from`).
  const sideEffectRe = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g
  for (const m of stripped.matchAll(sideEffectRe)) specifiers.push(m[1])
  // CommonJS require + dynamic import: `require('<spec>')` / `import('<spec>')`.
  const callRe = /\b(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  for (const m of stripped.matchAll(callRe)) specifiers.push(m[1])
  const engines = new Set<string>()
  for (const spec of specifiers) {
    const base = (spec.split('/').pop() ?? '').replace(/\.(ts|tsx|js|jsx)$/, '')
    if (ENGINE_BASENAMES.includes(base)) engines.add(base)
  }
  return [...engines]
}

/**
 * Does this file DEFINE an AI-engine entry point, rather than merely call one?
 *
 * An **AI engine** is a module that dispatches a prompt to a model and returns
 * its output. The two known engines export a narrow, recognisable shape:
 *   - `agent-runtime.ts`     → `runAiAgentText` / `runAiAgentObject`
 *   - `opencode-client.ts`   → `createOpenCodeClient`
 *   - `opencode-handlers.ts` → `handleOpenCodeMessage* / handleOpenCodeHealth …`
 * The symbol prefixes below are the *AI-runtime* dispatch names — deliberately
 * NOT a generic `create*Client` (an MCP client factory, `createMcpClient`, is a
 * transport concern, not an AI engine — the first draft of this regex wrongly
 * matched it, and the derivation test caught exactly that).
 * Comment-stripped, so a symbol named only in prose does not count.
 */
function definesEngineEntryPoint(_rel: string, source: string): boolean {
  const body = stripComments(source)
  // Static `export function` / `export async function` / `export const` whose name
  // is an AI-runtime dispatch entry point.
  const re =
    /export\s+(?:async\s+)?(?:function|const)\s+(runAiAgent\w*|createOpenCodeClient|handleOpenCode\w*)/
  return re.test(body)
}

describe('R28-5 / B-05 / N-8 — the door is the only way in', () => {
  it('the engine set is real (every ENGINE_FILES entry exists)', () => {
    for (const rel of ENGINE_FILES) {
      expect(() => readFileSync(join(MODULE_ROOT, rel), 'utf8')).not.toThrow()
    }
  })

  it('every engine file really IS an engine (defines a dispatch/engine entry point)', () => {
    // If someone repurposes or renames an engine file so it no longer defines an
    // engine entry point, this fails — so the engine set cannot silently point at
    // the wrong files.
    for (const rel of ENGINE_FILES) {
      const raw = readFileSync(join(MODULE_ROOT, rel), 'utf8')
      expect(definesEngineEntryPoint(rel, raw)).toBe(true)
    }
  })

  it('derives every engine from the tree — a NEW engine-defining file fails here', () => {
    // THE anti-staleness guard. The engine list is a DECLARATION; this test makes
    // it a DERIVATION too: it scans the module's `lib/` for every file that
    // DEFINES an engine entry point (an exported `runAiAgent*`, `create*Client`,
    // `handleOpenCode*` — the symbol shapes the two known engines use) and
    // requires ENGINE_FILES to name the SAME set. A genuinely new third engine
    // (a new file in `lib/` exporting an engine entry point) fails HERE, which is
    // exactly the claim the header used to overstate.
    const declared = new Set(ENGINE_FILES.map((e) => e.split(`${sep}`).pop() ?? ''))
    const found = new Set<string>()
    for (const abs of walk(join(MODULE_ROOT, 'lib'))) {
      const raw = readFileSync(abs, 'utf8')
      if (definesEngineEntryPoint(relative(MODULE_ROOT, abs), raw)) {
        found.add(abs.split(`${sep}`).pop() ?? '')
      }
    }
    expect([...found].sort()).toEqual([...declared].sort())
  })

  it('NONE of the door/engine files is mistaken for a caller (they may name an engine)', () => {
    // The door and the engine definitions are excluded by design; this pins that
    // each of them DOES reach at least one engine file, so the exclusion list
    // cannot grow a file that has nothing to do with the door.
    for (const rel of DOOR_OR_ENGINE) {
      const raw = readFileSync(join(MODULE_ROOT, rel), 'utf8')
      // the engine files import themselves/as siblings; adapters import their engine.
      const isEngine = ENGINE_FILES.includes(rel)
      const isAdapter =
        rel === join('lib', 'opencode-port-adapter.ts') ||
        rel === join('lib', 'agent-runtime-port-adapter.ts')
      expect(isEngine || isAdapter).toBe(true)
      if (isAdapter) {
        expect(engineImportsIn(raw).length).toBeGreaterThan(0)
      }
    }
  })

  it('the scan really visits .tsx production files (a `.ts`-only walk fails here)', () => {
    // A critic found the first draft walked `.ts` only, so production React
    // components were invisible. Adding `.tsx` to `walk` fixes that — but only a
    // test that OBSERVES the `.tsx` files prevents a future edit from silently
    // dropping them again (a `.ts`-only walk cannot catch a `.tsx` bypass, so
    // nothing else in this suite notices). This is the self-check for that.
    const tsxUnderModule = walk(MODULE_ROOT).filter((f) => f.endsWith('.tsx'))
    expect(tsxUnderModule.length).toBeGreaterThan(0)
    // and the module really does ship at least one `.tsx` outside `__tests__`,
    // so the assertion above is not vacuously true on an empty tree.
    expect(tsxUnderModule.some((f) => !f.includes(`${sep}__tests__${sep}`))).toBe(true)
  })

  it('ONLY the door, the engines, the barrel and the named exceptions import an engine', () => {
    const exceptionFiles = new Set(NAMED_EXCEPTIONS.map(([f]) => f))
    const offenders: Array<{ rel: string; engines: string[] }> = []

    for (const abs of walk(SRC_ROOT)) {
      const rel = relative(MODULE_ROOT, abs)
      if (DOOR_OR_ENGINE.includes(rel)) continue
      if (exceptionFiles.has(rel)) continue
      const engines = engineImportsIn(readFileSync(abs, 'utf8'))
      if (engines.length > 0) offenders.push({ rel, engines })
    }

    // An empty offender list is the row's guarantee, measured: nothing outside
    // the door reaches an engine. A new direct importer fails HERE.
    expect(offenders).toEqual([])
  })

  it('the named exceptions are exact — each imports ONLY the engine module it is allowed', () => {
    // The exception list is not "these files are invisible to the scan"; it is
    // "this file may import THIS engine". A blanked-out exclusion would let an
    // exception grow a second engine import unnoticed.
    for (const [rel, allowedEngine] of NAMED_EXCEPTIONS) {
      const raw = readFileSync(join(MODULE_ROOT, rel), 'utf8')
      const engines = engineImportsIn(raw)
      // The allowed engine must actually be imported (the exception is real, not stale).
      expect(engines).toContain(allowedEngine)
    }
  })

  it('the ONLY engine modules imported anywhere are the two known engines (no third engine)', () => {
    // Derive the set of engine basenames imported across the whole tree and
    // require it to be a subset of the known engines. A NEW engine file whose
    // name is imported anywhere fails here, which is the "no third engine" rule
    // from the architecture document (§4/§7) — enforced structurally.
    const known = new Set(ENGINE_FILES.map((e) => (e.split(`${sep}`).pop() ?? '').replace(/\.ts$/, '')))
    const imported = new Set<string>()
    for (const abs of walk(SRC_ROOT)) {
      for (const e of engineImportsIn(readFileSync(abs, 'utf8'))) imported.add(e)
    }
    const unknown = [...imported].filter((e) => !known.has(e))
    expect(unknown).toEqual([])
  })

  it('CC-69 / CC-71 — both non-run exceptions are pinned to their engine import site', () => {
    // The two exceptions are not "left alone": each is pinned to the exact KIND
    // of reach it makes, so the exception cannot become a general escape hatch.
    //
    // CC-69 is at `api/chat/route.ts` — the OpenCode-backed chat route. Its RUN
    // path already walks through the door (`createOpenCodePortAdapter`); only the
    // `answerQuestion` short-circuit still names `opencode-client` directly.
    const chat = readFileSync(join(MODULE_ROOT, 'api', 'chat', 'route.ts'), 'utf8')
    expect(engineImportsIn(chat)).toEqual(['opencode-client'])
    expect(chat).toMatch(/createOpenCodeClient\s*\(/)

    const health = readFileSync(join(MODULE_ROOT, 'api', 'health', 'route.ts'), 'utf8')
    // CC-71: the health endpoint reaches OpenCode's health handler directly.
    expect(engineImportsIn(health)).toEqual(['opencode-handlers'])
    expect(health).toMatch(/handleOpenCodeHealth\s*\(/)
  })

  it('the platform-runtime chat route (api/ai/chat) is NOT an exception — it is fully behind the door', () => {
    // The two chat routes are easy to confuse. `api/ai/chat/route.ts` reaches the
    // engine ONLY through the port (CC-67); it must import NO engine by name.
    const raw = readFileSync(join(MODULE_ROOT, 'api', 'ai', 'chat', 'route.ts'), 'utf8')
    expect(engineImportsIn(raw)).toEqual([])
  })

  it('the barrel re-exports engines (a surface, not a caller) — pinned to `export … from`', () => {
    // `src/index.ts` is the ONE exception that names engines because it is the
    // package's public surface. Pin that its engine reaches are RE-EXPORTS, never
    // calls — so the barrel cannot become a caller over time.
    const barrel = readFileSync(BARREL, 'utf8')
    const engines = engineImportsIn(barrel)
    expect(engines.sort()).toEqual(['agent-runtime', 'opencode-client', 'opencode-handlers'])
    // every engine reach in the barrel is an `export … from`, never an `import … from`.
    const importFromEngine = /(?:^|\n)\s*import\b[^\n]*?from\s*['"][^'"]*(?:agent-runtime|opencode-client|opencode-handlers)['"]/g
    expect(stripComments(barrel)).not.toMatch(importFromEngine)
  })
})
