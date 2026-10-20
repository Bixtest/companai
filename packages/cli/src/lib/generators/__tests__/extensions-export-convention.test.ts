/**
 * The `data/extensions.ts` export convention — a build-level contract, enforced.
 *
 * `module-registry.ts:3163` (and `:3182`) emits, for every module that has a `data/extensions.ts`:
 *
 *   entityExtensions: ((X.default ?? X.extensions) as EntityExtension[]) || []
 *
 * The `??` reads as a runtime fallback, and at runtime it is one — but the bundler resolves
 * **both** names **statically**. A module whose file exports a default and `entityExtensions`
 * but no binding called `extensions` therefore works in a type-check and fails the build:
 *
 *   Error: Turbopack build failed with 1 errors:
 *   The export extensions was not found in module
 *     …/packages/ai-assistant/dist/modules/ai_assistant/data/extensions.js
 *
 * That is exactly what the first CI run found (2026-10-20, run `39357327101`): six modules
 * followed the convention and `ai_assistant` did not, and `yarn build:app` died after 71
 * seconds — on a repository whose 2,613 shared-package tests were green, because no test
 * had ever asked this question.
 *
 * The fix was one line in the module. This test is the reason it cannot come back, and the
 * reason a new module cannot be added without it.
 */
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '../../../../../..')

/** Strip comments so a sentence that *mentions* the export cannot satisfy the check. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

function findExtensionsFiles(): string[] {
  const roots = [path.join(REPO_ROOT, 'packages')]
  const found: string[] = []

  const walk = (dir: string, depth: number): void => {
    if (depth > 6) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, depth + 1)
        continue
      }
      if (entry.name !== 'extensions.ts') continue
      if (!full.includes(`${path.sep}data${path.sep}`)) continue
      found.push(full)
    }
  }

  for (const root of roots) walk(root, 0)
  return found.sort()
}

const EXTENSIONS_FILES = findExtensionsFiles()

describe('data/extensions.ts — the export the generator resolves statically', () => {
  it('finds the files it is meant to be guarding (the denominator)', () => {
    // A walker that finds nothing would pass every assertion below by vacuity.
    expect(EXTENSIONS_FILES.length).toBeGreaterThanOrEqual(7)
  })

  it.each(EXTENSIONS_FILES.map((f) => [path.relative(REPO_ROOT, f), f] as const))(
    '%s exports a binding named `extensions`',
    (_rel, file) => {
      const source = stripComments(fs.readFileSync(file, 'utf8'))

      const declares =
        /export\s+const\s+extensions\b/.test(source) ||
        /export\s+function\s+extensions\b/.test(source) ||
        /export\s+let\s+extensions\b/.test(source) ||
        /export\s*\{[^}]*\bextensions\b[^}]*\}/.test(source)

      if (!declares) {
        throw new Error(
          `${path.relative(REPO_ROOT, file)} does not export \`extensions\`.\n` +
            '`module-registry.ts` emits `X.default ?? X.extensions` for every module with a ' +
            'data/extensions.ts, and the bundler resolves BOTH names statically — so a module ' +
            'with only a default export fails `yarn build:app` under Turbopack (CI run ' +
            '39357327101, 2026-10-20). Add `export const extensions = entityExtensions`.',
        )
      }
    },
  )
})
