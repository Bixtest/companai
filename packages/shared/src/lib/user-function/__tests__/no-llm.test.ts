/**
 * The no-LLM proof — the plan's own decisive test.
 *
 * Plan §2 phase 3 states it as an instruction: **"Switch the model off and run a
 * Function. If it still runs, it is deterministic software."**
 *
 * "Switch the model off" is awkward to perform literally, and a test that merely
 * *reports* it did so is a story, not a proof. So the claim is established by
 * **two genuinely different routes**, and both must pass:
 *
 *   **Route 1 — behavioural.** Run a real Function end to end, with a fake engine
 *   standing in for the database, and no AI infrastructure anywhere in scope.
 *   Assert the exact `QueryOptions` that reached the engine. This proves the
 *   *behaviour*: the Function produced a database query, with no model involved.
 *
 *   **Route 2 — structural.** Read the module's source and walk its import graph,
 *   and assert that **nothing reachable from the runner imports the AI side**.
 *   This proves the *property*: there is no model to switch off. It is the check
 *   that keeps being true tomorrow, because it fails the moment somebody adds an
 *   AI import to any file the runner depends on.
 *
 * **Why one route alone is not enough.** Route 1 alone passes for a module that
 * *happens* not to call a model on this path, while importing one it could call
 * later. Route 2 alone is a static claim about code that was never executed. Route
 * 1 shows it works; route 2 shows why it cannot stop working.
 *
 * **Route 2 cannot pass vacuously.** It asserts the graph is non-trivially large
 * and that it actually reaches the compiler and the query types — so a walker that
 * found no files, or stopped at the first hop, fails rather than reports success.
 * And the detector itself is falsified: a planted AI import is asserted to be
 * caught, so a detector that detected nothing could not pass either.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { runFunction } from '../run'
import type { QueryRunner } from '../run'
import type { QueryOptions } from '../../query/types'
import { BINDINGS, CTX, EXPECTED_QUERY_OPTIONS, MODEL, PLATFORM_ENTITY_ID, makeFunction } from './fixtures'

/* ------------------------------------------------------------------ *
 * Route 1 — behavioural
 * ------------------------------------------------------------------ */

describe('Route 1 — a Function runs with no AI anywhere in scope', () => {
  it('produces a real database query, and that is all it produces', async () => {
    const calls: Array<{ entity: string; opts: QueryOptions }> = []
    const engine: QueryRunner = {
      query: (async (entity: string, opts?: QueryOptions) => {
        calls.push({ entity, opts: opts ?? {} })
        return { items: [{ id: 'c-1' }], page: 1, pageSize: 1, total: 1 }
      }) as QueryRunner['query'],
    }

    // Nothing here is a model, a client, a prompt or a completion. There is no
    // argument to runFunction that could carry one — see the arity probe below.
    const result = await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(calls).toHaveLength(1)
    expect(calls[0].entity).toBe(PLATFORM_ENTITY_ID)
    expect(calls[0].opts).toEqual(EXPECTED_QUERY_OPTIONS)
    expect(result.rows).toEqual([{ id: 'c-1' }])
  })

  it('**has nowhere to pass a model** — the runner takes no AI parameter', async () => {
    const engine: QueryRunner = {
      query: (async () => ({ items: [], page: 1, pageSize: 0, total: 0 })) as QueryRunner['query'],
    }
    const aiClient = { complete: async () => 'anything' }

    // @ts-expect-error — there is no eighth parameter, so no model client can be
    // handed to a Function. This is the type-level form of "switch the model off":
    // the switch does not exist.
    await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine, {}, aiClient)

    expect(typeof runFunction).toBe('function')
  })
})

/* ------------------------------------------------------------------ *
 * Route 2 — structural
 * ------------------------------------------------------------------ */

/** Package and path shapes that mean "the AI side of the platform". */
const AI_PATTERNS: RegExp[] = [
  /(^|\/)ai-assistant(\/|$)/i,
  /(^|\/)ai-sdk(\/|$)/i,
  /(^|\/)ai-sdk-ollama(\/|$)/i,
  /^@ai-sdk\//i,
  /(^|\/)openai(\/|$)/i,
  /(^|\/)anthropic(\/|$)/i,
  /(^|\/)langchain(\/|$)/i,
  /(^|\/)ollama(\/|$)/i,
  /(^|\/)llm([-_/]|$)/i,
  /(^|\/)model-server(\/|$)/i,
  /(^|\/)inference(\/|$)/i,
  // A bare `ai` package — the one the transformer config already treats as special.
  /(^|\/)ai(\/|$)/,
]

/** Every module specifier a source file mentions. */
function specifiersOf(source: string): string[] {
  const found: string[] = []
  const re = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) found.push(match[1])
  return found
}

/** The specifiers in a file that name the AI side. Empty is the good answer. */
function findAiImports(source: string): string[] {
  return specifiersOf(source).filter((spec) => AI_PATTERNS.some((pattern) => pattern.test(spec)))
}

/** Resolve a relative specifier to a file on disk, trying the usual extensions. */
function resolveRelative(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null
  const base = resolve(dirname(fromFile), spec)
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      // Not this one; try the next.
    }
  }
  return null
}

/**
 * Every file reachable from an entry point through relative imports, plus the
 * non-relative specifiers those files name.
 */
function walkImportGraph(entry: string): { files: string[]; externals: string[] } {
  const files: string[] = []
  const externals: string[] = []
  const seen = new Set<string>()
  const queue = [entry]

  while (queue.length > 0) {
    const file = queue.shift()!
    if (seen.has(file)) continue
    seen.add(file)
    files.push(file)

    for (const spec of specifiersOf(readFileSync(file, 'utf8'))) {
      const resolved = resolveRelative(file, spec)
      if (resolved) {
        if (!seen.has(resolved)) queue.push(resolved)
      } else {
        externals.push(spec)
      }
    }
  }

  return { files: files.sort(), externals }
}

const MODULE_DIR = resolve(__dirname, '..')

describe('Route 2 — the detector actually detects', () => {
  it('catches a planted AI import in each shape that matters', () => {
    expect(findAiImports("import { generateText } from 'ai'\n")).toEqual(['ai'])
    expect(findAiImports("import { x } from '@ai-sdk/openai'")).toEqual(['@ai-sdk/openai'])
    expect(findAiImports("import { a } from '../ai-assistant/lib/scope-injection'")).toEqual([
      '../ai-assistant/lib/scope-injection',
    ])
    expect(findAiImports("const m = require('openai')")).toEqual(['openai'])
    expect(findAiImports("import x from 'ai-sdk-ollama'")).toEqual(['ai-sdk-ollama'])
  })

  it('does not fire on the imports this module legitimately uses', () => {
    expect(
      findAiImports(
        [
          "import { compileQuery } from '../business-ir/compile'",
          "import { contentVersion } from '../kernel/model'",
          "import type { QueryEngine } from '../query/types'",
          "import { readFileSync } from 'node:fs'",
          "import { isCustomFieldKind } from '../../modules/entities/kinds'",
        ].join('\n'),
      ),
    ).toEqual([])
  })
})

describe('Route 2 — nothing the runner reaches imports the AI side', () => {
  it('every source file in user-function/ is free of an AI import', () => {
    const files = readdirSync(MODULE_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => join(MODULE_DIR, name))

    // The floor: if the directory were empty this check would pass vacuously.
    expect(files.length).toBeGreaterThanOrEqual(6)

    const offenders: Array<{ file: string; specifiers: string[] }> = []
    for (const file of files) {
      const hits = findAiImports(readFileSync(file, 'utf8'))
      if (hits.length > 0) offenders.push({ file, specifiers: hits })
    }
    expect(offenders).toEqual([])
  })

  it('the whole import graph of run.ts is free of an AI import', () => {
    const { files, externals } = walkImportGraph(join(MODULE_DIR, 'run.ts'))

    // Two floors, so a walker that found nothing cannot report success.
    expect(files.length).toBeGreaterThanOrEqual(8)
    expect(files.some((file) => file.endsWith(join('business-ir', 'compile.ts')))).toBe(true)
    expect(files.some((file) => file.endsWith(join('query', 'types.ts')))).toBe(true)

    const offenders = [
      ...files.flatMap((file) =>
        findAiImports(readFileSync(file, 'utf8')).map((spec) => `${file} -> ${spec}`),
      ),
      ...externals.filter((spec) => AI_PATTERNS.some((pattern) => pattern.test(spec))),
    ]
    expect(offenders).toEqual([])
  })
})
