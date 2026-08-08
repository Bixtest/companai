import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Keeps `tsconfig.json`'s parked-module exclusions honest.
 *
 * Parked modules are excluded from type-checking because the generated entity-id
 * registry covers enabled modules only — see the comment in tsconfig.json. That
 * exclusion list is hand-written, so it can drift from the real one in two ways,
 * and only one of them announces itself:
 *
 *   - park a module and forget to exclude it  → type-check turns red. Loud.
 *   - re-enable a module and forget to remove its exclusion → it silently stops
 *     being type-checked. **This is the dangerous one**, and it is why this test
 *     exists.
 *
 * The source of truth is `apps/mercato/src/modules.ts`: a module directory that
 * exists on disk but is not registered there is parked.
 */

const repoRoot = join(__dirname, '..', '..', '..', '..')
const modulesConfigPath = join(repoRoot, 'apps', 'mercato', 'src', 'modules.ts')
const coreModulesDir = join(__dirname, '..', 'modules')
const tsconfigPath = join(__dirname, '..', '..', 'tsconfig.json')

/**
 * Reads the enabled module ids from the live entries in `modules.ts`.
 *
 * Only uncommented `{ id: '…' }` entries count — the file documents the parked
 * set as commented-out entries of exactly the same shape, so a naive match would
 * report every parked module as enabled and the test would pass vacuously.
 */
function readEnabledModuleIds(): Set<string> {
  const source = readFileSync(modulesConfigPath, 'utf8')
  const ids = new Set<string>()
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
    const match = line.match(/^\{\s*id:\s*'([a-z0-9_]+)'/)
    if (match) ids.add(match[1])
  }
  return ids
}

function readCoreModuleDirectories(): string[] {
  return readdirSync(coreModulesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(coreModulesDir, name, 'index.ts')))
    .sort()
}

function readExcludedModuleIds(): Set<string> {
  // Strip comments before parsing: tsconfig.json permits them, JSON.parse does not.
  const raw = readFileSync(tsconfigPath, 'utf8')
  const withoutComments = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
  const parsed = JSON.parse(withoutComments) as { exclude?: string[] }
  const ids = new Set<string>()
  for (const pattern of parsed.exclude ?? []) {
    const match = pattern.match(/^src\/modules\/([a-z0-9_]+)\/\*\*$/)
    if (match) ids.add(match[1])
  }
  return ids
}

describe('parked modules are excluded from type-checking, and only parked modules are', () => {
  const enabled = readEnabledModuleIds()
  const excluded = readExcludedModuleIds()
  const onDisk = readCoreModuleDirectories()

  it('reads a plausible enabled-module list (guards the parser itself)', () => {
    // If the `modules.ts` format changes, every assertion below would pass
    // vacuously. Anchor on modules that must always be enabled.
    expect(enabled.size).toBeGreaterThan(10)
    for (const required of ['auth', 'directory', 'entities', 'query_index']) {
      expect(Array.from(enabled)).toContain(required)
    }
  })

  it('excludes every parked core module', () => {
    const parked = onDisk.filter((id) => !enabled.has(id))
    const missing = parked.filter((id) => !excluded.has(id))
    expect(missing).toEqual([])
  })

  it('excludes no module that is actually enabled', () => {
    // The silent-failure direction: an enabled module left in the exclude list
    // stops being type-checked and nothing else would notice.
    const wronglyExcluded = Array.from(excluded).filter((id) => enabled.has(id))
    expect(wronglyExcluded).toEqual([])
  })

  it('excludes no module that no longer exists', () => {
    const stale = Array.from(excluded).filter((id) => !onDisk.includes(id))
    expect(stale).toEqual([])
  })
})
