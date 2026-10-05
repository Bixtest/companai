/**
 * The no-AI proof for the Widget layer — the **structural** route.
 *
 * G-03 proved a Function runs with no AI, by two routes. The Widget layer sits on
 * top of that, and it must not reintroduce a model: a Widget whose *placement* or
 * *IR* needed an AI call would mean "AI proposes a Widget" ran through this code,
 * which is exactly what the vision rules out (rule 20: *AI generates Widget IR /
 * patches, not arbitrary UI code*).
 *
 * The **behavioural** route is in `placement-run.test.ts` — a placed Widget runs
 * its Function and the exact plan reaches the engine. This file is the
 * **structural** route: read the module's own source, walk its import graph, and
 * assert **nothing reachable imports the AI side**. That is the check that keeps
 * being true tomorrow, because it fails the moment somebody adds an AI import to
 * any file this module depends on.
 *
 * The walk **cannot pass vacuously**: it asserts the graph is non-trivially large
 * and that it actually reaches G-03's lifecycle and G-01's id grammar. And the
 * detector is falsified in-test on planted strings, so a detector that detected
 * nothing could not pass either.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { placeFunction } from '../placement'
import { place, placedFunction } from './fixtures'

/* ------------------------------------------------------------------ *
 * A type-level probe — there is nowhere to pass a model
 * ------------------------------------------------------------------ */

describe('placement takes no AI', () => {
  it('**has nowhere to pass a model** — placeFunction takes no AI parameter', () => {
    const aiClient = { complete: async () => 'anything' }

    // @ts-expect-error — there is no third parameter, so no model client can be
    // handed to placement. The same form of "switch the model off" G-03 uses: the
    // switch does not exist.
    placeFunction(placedFunction(), {}, aiClient)

    expect(typeof placeFunction).toBe('function')
  })

  it('a placed Widget declares that it needs no model', () => {
    expect(place().widget.ai.required).toBe(false)
  })
})

/* ------------------------------------------------------------------ *
 * The structural walk
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

describe('the detector actually detects', () => {
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
          "import { isRunnable } from '../user-function/lifecycle'",
          "import { controlForKind } from './ir'",
          "import { stableStringify } from './document'",
          "import { isCanonicalId } from '../kernel/canonical-id'",
          "import { isCustomFieldKind } from '../../modules/entities/kinds'",
          "import { readFileSync } from 'node:fs'",
        ].join('\n'),
      ),
    ).toEqual([])
  })
})

describe('nothing the Widget layer reaches imports the AI side', () => {
  it('every source file in business-widget/ is free of an AI import', () => {
    const files = readdirSync(MODULE_DIR)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => join(MODULE_DIR, name))

    // The floor: if the directory were empty this check would pass vacuously.
    expect(files.length).toBeGreaterThanOrEqual(5)

    const offenders: Array<{ file: string; specifiers: string[] }> = []
    for (const file of files) {
      const hits = findAiImports(readFileSync(file, 'utf8'))
      if (hits.length > 0) offenders.push({ file, specifiers: hits })
    }
    expect(offenders).toEqual([])
  })

  it('the import graph of placement.ts reaches G-03 and the kinds, and no AI', () => {
    const { files, externals } = walkImportGraph(join(MODULE_DIR, 'placement.ts'))

    // Floors, so a walker that found nothing cannot report success.
    expect(files.length).toBeGreaterThanOrEqual(6)
    expect(files.some((file) => file.endsWith(join('user-function', 'lifecycle.ts')))).toBe(true)
    expect(files.some((file) => file.endsWith(join('modules', 'entities', 'kinds.ts')))).toBe(true)

    const offenders = [
      ...files.flatMap((file) =>
        findAiImports(readFileSync(file, 'utf8')).map((spec) => `${file} -> ${spec}`),
      ),
      ...externals.filter((spec) => AI_PATTERNS.some((pattern) => pattern.test(spec))),
    ]
    expect(offenders).toEqual([])
  })

  it('the import graph of document.ts and registry.ts reaches G-01’s id grammar, and no AI', () => {
    for (const entry of ['document.ts', 'registry.ts']) {
      const { files, externals } = walkImportGraph(join(MODULE_DIR, entry))
      expect([entry, files.length >= 4]).toEqual([entry, true])
      expect(files.some((file) => file.endsWith(join('kernel', 'canonical-id.ts')))).toBe(true)

      const offenders = [
        ...files.flatMap((file) =>
          findAiImports(readFileSync(file, 'utf8')).map((spec) => `${file} -> ${spec}`),
        ),
        ...externals.filter((spec) => AI_PATTERNS.some((pattern) => pattern.test(spec))),
      ]
      expect([entry, offenders]).toEqual([entry, []])
    }
  })
})
