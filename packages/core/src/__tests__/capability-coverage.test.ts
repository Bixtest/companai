import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  measureCapabilityCoverage,
  registerCapabilityDescriptors,
  clearCapabilityRegistry,
  getAllCapabilityDescriptors,
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
 * Every enabled module must describe every feature it declares.
 *
 * This was a list of nine modules while R4b was outstanding. It is now the whole
 * enabled set, computed rather than enumerated — a hand-maintained list would
 * let a new module be added without anyone noticing it described nothing.
 */
function describedModules(): string[] {
  // A module that declares no features has nothing to describe — `api_docs` has
  // an `acl.ts` with an empty list. Excluding it here keeps the failure message
  // meaningful; the "finds what it is guarding" assertion is what stops this
  // filter from quietly emptying the whole set.
  return allModuleIds().filter((moduleId) => readFeatureIds(moduleId).ids.length > 0)
}

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

  it('checks every enabled module that declares features', () => {
    // The filter above could silently reduce the per-module checks to nothing if
    // the parsing broke; this is what makes that visible.
    expect(describedModules().length).toBeGreaterThanOrEqual(24)
  })

  it.each(describedModules())('%s has a descriptor on every feature', (moduleId) => {
    const { ids, described } = readFeatureIds(moduleId)
    // The undescribed ids, not just a count — a failure should say which
    // permission is missing risk semantics, not that some number moved.
    expect(ids.filter((id) => !described.includes(id))).toEqual([])
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

    // eslint-disable-next-line no-console
    console.log(
      `[capabilities] ${coverage.described}/${coverage.total} features described (${percent}%). ` +
      `Remaining: ${Object.keys(coverage.undescribedByModule).sort().join(', ') || 'none'}`,
    )

    // 100%, asserted, now that it is true. The per-module test above is the one
    // that names what is missing; this is the whole-surface statement, and it is
    // the thing R5 depends on: a resolver cannot reason about an act nobody
    // described, and would have to treat it as ordinary — which for a
    // destructive act is exactly the wrong default.
    expect(coverage.undescribedByModule).toEqual({})
    expect(coverage.described).toBe(coverage.total)
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

describe('the real descriptors, loaded from the modules themselves', () => {
  // The tests above check the *rules* against invented descriptors, and the
  // coverage report only counts declarations. Neither actually runs the
  // validator over what ships — so a contradictory descriptor could sit in a
  // module indefinitely with a green suite. This loads them for real.
  const modules = allModuleIds()

  beforeEach(() => clearCapabilityRegistry())
  afterAll(() => clearCapabilityRegistry())

  it.each(modules)('%s declares coherent capabilities', (moduleId) => {
    clearCapabilityRegistry()
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const loaded = require(join(modulesRoot, moduleId, 'acl.ts')) as {
      features?: AclFeatureDeclaration[]
      default?: AclFeatureDeclaration[]
    }
    const features = loaded.features ?? loaded.default ?? []
    registerCapabilityDescriptors(features)

    expect(validateRegisteredCapabilities()).toEqual([])
  })

  it('classifies every act that leaves the company as E3 or higher', () => {
    clearCapabilityRegistry()
    for (const moduleId of modules) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const loaded = require(join(modulesRoot, moduleId, 'acl.ts')) as {
        features?: AclFeatureDeclaration[]
        default?: AclFeatureDeclaration[]
      }
      registerCapabilityDescriptors(loaded.features ?? loaded.default ?? [])
    }

    const misclassified = getAllCapabilityDescriptors()
      .filter((descriptor) => descriptor.externalEffect)
      .filter((descriptor) => descriptor.effectClass < 'E3')
      .map((descriptor) => descriptor.id)

    expect(misclassified).toEqual([])
  })

  it('names a compensation for every compensatable act, pointing at a real capability', () => {
    clearCapabilityRegistry()
    for (const moduleId of modules) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const loaded = require(join(modulesRoot, moduleId, 'acl.ts')) as {
        features?: AclFeatureDeclaration[]
        default?: AclFeatureDeclaration[]
      }
      registerCapabilityDescriptors(loaded.features ?? loaded.default ?? [])
    }

    const known = new Set(getAllCapabilityDescriptors().map((descriptor) => descriptor.id))
    // A compensation pointing at a capability that does not exist is a promise
    // nobody can keep — worse than admitting the act is irreversible, because it
    // reads as though a remedy is available.
    const dangling = getAllCapabilityDescriptors()
      .filter((descriptor) => descriptor.compensation && !known.has(descriptor.compensation))
      .map((descriptor) => `${descriptor.id} -> ${descriptor.compensation}`)

    expect(dangling).toEqual([])
  })
})
