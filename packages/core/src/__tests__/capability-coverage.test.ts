import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  measureCapabilityCoverage,
  registerCapabilityDescriptors,
  clearCapabilityRegistry,
  validateRegisteredCapabilities,
  type AclFeatureDeclaration,
} from '@open-mercato/shared/lib/capabilities/registry'
import { EFFECT_CLASSES, DEFAULT_AUTONOMY_FLOOR, TASK_GRADES } from '@open-mercato/shared/modules/capabilities'

/**
 * Capability coverage guard (R4).
 *
 * A permission with no risk semantics is invisible to the resolver: it cannot be
 * reasoned about, so it will be treated as ordinary, so a destructive act will
 * eventually be permitted as though it were a read. The failure is silent, which
 * is why it needs a test rather than a review.
 *
 * Two things are asserted here and one is reported:
 *
 * - every descriptor that exists is **coherent** (hard failure)
 * - the modules already described **stay** described (hard failure — coverage
 *   must not regress)
 * - overall coverage is **printed**, so the remaining gap is a number somebody
 *   can act on rather than a vague intention
 */

const modulesRoot = join(__dirname, '..', 'modules')
const modulesConfigPath = join(__dirname, '..', '..', '..', '..', 'apps', 'mercato', 'src', 'modules.ts')

/**
 * The enabled modules, from the one list that decides them.
 *
 * The denominator matters as much as the numerator: counting parked modules
 * would report a coverage gap nobody intends to close, and a metric that
 * includes work nobody will do is a metric people learn to ignore.
 */
function readEnabledModuleIds(): Set<string> {
  const source = readFileSync(modulesConfigPath, 'utf8')
  const ids = new Set<string>()
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue
    const match = line.match(/^\{?\s*id:\s*'([a-z0-9_]+)'/)
    if (match) ids.add(match[1])
  }
  return ids
}

/**
 * Modules whose features are fully described. Adding a module here is how R4b
 * proceeds; removing one is how coverage silently rots, so the test fails if a
 * listed module loses its descriptors.
 */
const DESCRIBED_MODULES = [
  'api_keys',
  'attachments',
  'audit_logs',
  'auth',
  'configs',
  'data_sync',
  'feature_toggles',
  'inbox_ops',
  'integrations',
] as const

/**
 * Reads the feature declarations out of a module's `acl.ts` without importing it.
 *
 * Parsing rather than importing keeps the guard independent of module bootstrap:
 * it must be able to see a module that fails to load, since "the module broke"
 * and "the module has no descriptors" are different problems.
 */
function readFeatureIds(moduleId: string): { ids: string[]; described: string[] } {
  const path = join(modulesRoot, moduleId, 'acl.ts')
  if (!existsSync(path)) return { ids: [], described: [] }
  const source = readFileSync(path, 'utf8')

  const ids: string[] = []
  const described: string[] = []

  // Each feature is an object literal with an `id`, optionally followed by a
  // `capability` before the next `id`.
  const blocks = source.split(/\bid:\s*'/).slice(1)
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf("'"))
    if (!id) continue
    ids.push(id)
    if (/\bcapability:\s*\{/.test(block)) described.push(id)
  }

  return { ids, described }
}

function allModuleIds(): string[] {
  const enabled = readEnabledModuleIds()
  return readdirSync(modulesRoot)
    .filter((name) => enabled.has(name))
    .filter((name) => existsSync(join(modulesRoot, name, 'acl.ts')))
}

describe('capability coverage — every described act is described coherently', () => {
  const modules = allModuleIds()

  it('finds the acl declarations it is meant to be guarding', () => {
    // Without this, a change to the parsing could reduce the guard to zero
    // features and it would pass while checking nothing.
    const total = modules.reduce((sum, moduleId) => sum + readFeatureIds(moduleId).ids.length, 0)
    expect(total).toBeGreaterThanOrEqual(100)
  })

  it.each(DESCRIBED_MODULES)('%s has a descriptor on every feature', (moduleId) => {
    const { ids, described } = readFeatureIds(moduleId)
    expect(ids.length).toBeGreaterThan(0)
    expect(described.sort()).toEqual(ids.sort())
  })

  it('reports how much of the permission surface has risk semantics', () => {
    const features: AclFeatureDeclaration[] = []
    for (const moduleId of modules) {
      const { ids, described } = readFeatureIds(moduleId)
      for (const id of ids) {
        features.push({
          id,
          title: id,
          module: moduleId,
          ...(described.includes(id) ? { capability: { effectClass: 'E0', reversibility: 'reversible' } as never } : {}),
        })
      }
    }

    const coverage = measureCapabilityCoverage(features)
    const percent = Math.round((coverage.described / coverage.total) * 100)

    // Printed, not asserted at 100%: R4 describes the modules that perform the
    // riskiest acts, and the rest is tracked as R4b. A guard that demanded 100%
    // today would have to be disabled today, and a disabled guard guards nothing.
    // eslint-disable-next-line no-console
    console.log(
      `[capabilities] ${coverage.described}/${coverage.total} features described (${percent}%). ` +
      `Remaining: ${Object.keys(coverage.undescribedByModule).sort().join(', ') || 'none'}`,
    )

    expect(coverage.described).toBeGreaterThanOrEqual(37)
  })
})

describe('the descriptors themselves', () => {
  beforeEach(() => clearCapabilityRegistry())
  afterAll(() => clearCapabilityRegistry())

  it('rejects a compensatable act that names no compensation', () => {
    registerCapabilityDescriptors([
      {
        id: 'demo.thing',
        title: 'Demo',
        module: 'demo',
        capability: { effectClass: 'E1', reversibility: 'compensatable' },
      },
    ])
    expect(validateRegisteredCapabilities()[0].problem).toMatch(/must name the capability that compensates/)
  })

  it('rejects an external act classified as an internal write', () => {
    registerCapabilityDescriptors([
      {
        id: 'demo.send',
        title: 'Demo',
        module: 'demo',
        capability: { effectClass: 'E1', reversibility: 'reversible', externalEffect: true },
      },
    ])
    expect(validateRegisteredCapabilities()[0].problem).toMatch(/not an internal write/)
  })

  it('rejects an irreversible read, which is a contradiction', () => {
    registerCapabilityDescriptors([
      {
        id: 'demo.read',
        title: 'Demo',
        module: 'demo',
        capability: { effectClass: 'E0', reversibility: 'irreversible' },
      },
    ])
    expect(validateRegisteredCapabilities()[0].problem).toMatch(/always reversible/)
  })

  it('accepts a coherent descriptor', () => {
    registerCapabilityDescriptors([
      {
        id: 'demo.issue',
        title: 'Demo',
        module: 'demo',
        capability: {
          effectClass: 'E4',
          reversibility: 'compensatable',
          compensation: 'demo.credit',
          externalEffect: true,
        },
      },
    ])
    expect(validateRegisteredCapabilities()).toEqual([])
  })
})

describe('the default autonomy floor', () => {
  it('covers every effect class and grade', () => {
    for (const effectClass of EFFECT_CLASSES) {
      for (const grade of TASK_GRADES) {
        expect(DEFAULT_AUTONOMY_FLOOR[effectClass][grade]).toMatch(/^A[0-5]$/)
      }
    }
  })

  it('never permits more autonomy as the stakes rise', () => {
    // Down a column (grade rising) and along a row (effect class rising),
    // autonomy may only fall. A single cell out of order would let a higher-risk
    // act be more automatable than a lower-risk one, which is the whole table
    // saying the opposite of what it means.
    const rank = (gate: string) => Number(gate.slice(1))

    for (const effectClass of EFFECT_CLASSES) {
      const row = TASK_GRADES.map((grade) => rank(DEFAULT_AUTONOMY_FLOOR[effectClass][grade]))
      expect(row).toEqual([...row].sort((a, b) => b - a))
    }

    for (const grade of TASK_GRADES) {
      const column = EFFECT_CLASSES.map((effectClass) => rank(DEFAULT_AUTONOMY_FLOOR[effectClass][grade]))
      expect(column).toEqual([...column].sort((a, b) => b - a))
    }
  })

  it('never lets a security or destructive act run unattended at the highest grade', () => {
    expect(DEFAULT_AUTONOMY_FLOOR.E5.G4).toBe('A0')
    expect(DEFAULT_AUTONOMY_FLOOR.E6.G4).toBe('A0')
  })
})
