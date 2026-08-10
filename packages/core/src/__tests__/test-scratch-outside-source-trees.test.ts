/**
 * Tests must not write scratch files into a package source tree.
 *
 * Two of them did. `dynamicLoader.tsconfig.test.ts` created
 * `.tmp-dynamic-loader-*` inside `packages/shared`, and `cache/service.test.ts`
 * created `.cache-maintenance-*` inside `packages/cache`. Both directories lived
 * for a few seconds and were then deleted — inside trees that a dozen guard
 * tests walk and read while they run.
 *
 * Nothing breaks while such a directory *exists*: that was measured, by planting
 * one and running the core, ui and cli suites green against it. The failure is
 * the deletion. A guard lists a directory, then reads a file from it, and is
 * handed a path that ceased to exist in between — producing a red gate in a
 * package the change never touched, for a reason that has nothing to do with the
 * change under test. That is how a gate stops being read, which costs more than
 * any single flake.
 *
 * **What this guard is, and is not.** It matches the textual shape both
 * instances shared, so it catches the recurrence rather than the whole class:
 * `const dir = process.cwd()` on one line and `mkdtempSync(dir)` on another slips
 * past it. It is a tripwire on a known mistake, not a proof of the invariant.
 * The invariant itself — nothing appears under `packages/` while tests run — is
 * a property of a whole suite run and cannot be asserted from inside one.
 */
import fs from 'node:fs'
import path from 'node:path'

const SCRATCH_IN_CWD = /\b(?:mkdtemp|mkdtempSync|mkdir|mkdirSync|writeFile|writeFileSync)\s*\(\s*path\.(?:join|resolve)\s*\(\s*process\.cwd\(\)/

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.next', '.mercato', '.turbo', 'coverage', '.git'])

function findRepoRoot(): string {
  let current = __dirname
  while (!fs.existsSync(path.join(current, 'yarn.lock'))) {
    const parent = path.dirname(current)
    if (parent === current) throw new Error('[internal] repository root not found above the test directory')
    current = parent
  }
  return current
}

function collectTestFiles(directory: string, found: string[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true })
  } catch {
    // The guard must survive the very race it exists to prevent: a directory
    // listed a moment ago may already be gone.
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue
      collectTestFiles(path.join(directory, entry.name), found)
      continue
    }
    if (!entry.isFile()) continue
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) found.push(path.join(directory, entry.name))
  }
}

describe('tests keep their scratch files out of package source trees', () => {
  const repoRoot = findRepoRoot()

  it('never creates scratch paths under process.cwd()', () => {
    const testFiles: string[] = []
    for (const root of ['packages', 'apps']) {
      collectTestFiles(path.join(repoRoot, root), testFiles)
    }
    // A guard that found nothing to check would pass forever without saying so.
    expect(testFiles.length).toBeGreaterThan(100)

    const offenders: string[] = []
    for (const filePath of testFiles) {
      let source: string
      try {
        source = fs.readFileSync(filePath, 'utf8')
      } catch {
        continue
      }
      if (SCRATCH_IN_CWD.test(source)) {
        offenders.push(path.relative(repoRoot, filePath).split(path.sep).join('/'))
      }
    }

    expect(offenders).toEqual([])
  })
})
