import { readFileSync, existsSync } from 'node:fs'
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
 *
 * **CC-132 rewrote where the surface comes from, because the old version was
 * wrong in three ways at once.** It read one directory (`packages/core/src/modules`)
 * as the numerator, so a module shipped by any other package was absent from
 * *both* halves of the fraction — which is how it printed 100% while the agent
 * surface had no descriptors at all. It parsed the denominator out of a file
 * that holds **more than one list**, so it counted a module that file says is
 * deliberately off. And it assumed the enabled set was static, when three more
 * entries are pushed at run time under documented flags — so it would have been
 * correct today and silently wrong the first time somebody set one.
 *
 * The shape that fixes all three: **resolve each enabled entry by its own
 * `from`** (never by walking `packages/`, which finds the create-app *template*
 * copy of `example` and double-counts it), and **fail on any enablement path the
 * guard does not understand** — a guard that silently ignores a new way of
 * switching a module on is the same defect one level up.
 */

const repoRoot = join(__dirname, '..', '..', '..', '..')
const modulesConfigPath = join(repoRoot, 'apps', 'mercato', 'src', 'modules.ts')
const officialModulesPath = join(repoRoot, 'apps', 'mercato', 'src', 'official-modules.generated.ts')

type EnabledEntry = { id: string; from: string }

/**
 * `from` → the directory that holds that package's modules.
 *
 * `@open-mercato/<pkg>` is the convention the module list documents, and it is
 * also the only mapping that cannot be fooled: a directory walk would find the
 * same module id in more than one tree (`example` ships in the create-app
 * template *and* in the app), and would then describe a template.
 */
function moduleRootFor(from: string): string | null {
  if (from === '@open-mercato/core') return join(repoRoot, 'packages', 'core', 'src', 'modules')
  if (from === '@app') return join(repoRoot, 'apps', 'mercato', 'src', 'modules')
  const match = /^@open-mercato\/([a-z0-9-]+)$/.exec(from)
  return match ? join(repoRoot, 'packages', match[1], 'src', 'modules') : null
}

function modulesSource(): string {
  return readFileSync(modulesConfigPath, 'utf8')
}

/** Comment-stripped, so a commented-out entry is not an entry. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function parseEntries(source: string): EnabledEntry[] {
  const entries: EnabledEntry[] = []
  const re = /\{\s*id:\s*'([a-z0-9_]+)'\s*,\s*from:\s*'([^']+)'/g
  let match
  while ((match = re.exec(source))) entries.push({ id: match[1], from: match[2] })
  return entries
}

/**
 * The `enabledModules` array itself, sliced from its declaration to its own
 * terminator — not the whole file.
 *
 * This is the fix for the second defect: the file below that array holds the
 * reference modules, which are off unless a developer asks for them, and a scan
 * of every `id:` literal counts them as enabled.
 */
function enabledArrayEntries(): EnabledEntry[] {
  const source = modulesSource()
  const start = source.indexOf('export const enabledModules')
  if (start < 0) throw new Error('enabledModules export not found in apps/mercato/src/modules.ts')
  const end = source.indexOf('\n]', start)
  if (end < 0) throw new Error('enabledModules array terminator not found')
  return parseEntries(stripComments(source.slice(start, end)))
}

/** Every `enabledModules.push(` site in the file. */
function pushSiteIndexes(source: string): number[] {
  const indexes: number[] = []
  const re = /enabledModules\.push\(/g
  let match
  while ((match = re.exec(source))) indexes.push(match.index)
  return indexes
}

/**
 * The documented ways a module can be switched on after the array is declared.
 *
 * The list is not the point — the **assertion that every push site matches one
 * of them** is. A new enablement path fails the guard until it is accounted for,
 * which is what stops this file being correct today and wrong on the next flag.
 */
const KNOWN_ENABLEMENT_MARKERS = [
  'process.env.OM_ENABLE_EXAMPLES',
  'process.env.OM_ENABLE_STORAGE_S3',
  'officialModuleEntries',
  "entry.id === 'example'",
]

type PushSite = { index: number; span: string; entry: EnabledEntry | null }

/**
 * Each push site, with the text that decides it: **from the previous push to this
 * one**, capped at 400 characters.
 *
 * The span matters. A fixed look-back window let a new push inherit the marker of
 * the push above it — measured, not supposed: the mutation that adds an unknown
 * enablement path survived a 400-character window because the follower push's
 * `entry.id === 'example'` marker was still inside it. Bounding the span at the
 * previous push is what makes each marker attributable to exactly one site.
 */
function pushSites(source: string): PushSite[] {
  const indexes = pushSiteIndexes(source)
  return indexes.map((index, position) => {
    const previous = position === 0 ? -1 : indexes[position - 1]
    const start = Math.max(previous + 1, index - 400)
    const after = source.slice(index, index + 300)
    const match = /\{\s*id:\s*'([a-z0-9_]+)'\s*,\s*from:\s*'([^']+)'/.exec(after)
    return {
      index,
      span: source.slice(start, index),
      entry: match ? { id: match[1], from: match[2] } : null,
    }
  })
}

function unattributedPushSites(): number[] {
  return pushSites(modulesSource())
    .filter((site) => !KNOWN_ENABLEMENT_MARKERS.some((marker) => site.span.includes(marker)))
    .map((site) => site.index)
}

/**
 * Modules activated through the generated registry.
 *
 * Empty today. It is parsed rather than assumed empty, and the parse **fails**
 * if the file holds an `id:` it could not read as an `{ id, from }` pair — a
 * registry whose shape moved must not silently contribute nothing.
 */
function officialEntries(): EnabledEntry[] {
  if (!existsSync(officialModulesPath)) {
    throw new Error(`official modules registry not found at ${officialModulesPath}`)
  }
  const source = stripComments(readFileSync(officialModulesPath, 'utf8'))
  const entries = parseEntries(source)
  const declared = (source.match(/\bid:\s*'/g) ?? []).length
  if (declared !== entries.length) {
    throw new Error(
      `official-modules.generated.ts declares ${declared} id(s) but only ${entries.length} read as an { id, from } pair — ` +
        'the guard does not understand its shape, so it cannot claim the registry contributes nothing',
    )
  }
  return entries
}

/**
 * Every module reachable from the enabled list, whatever this environment has
 * switched on.
 *
 * Coverage is asserted over this union rather than over the current environment,
 * because a descriptor that is only missing when a documented flag is set is a
 * failure that arrives for whoever sets the flag — and the fix is to describe the
 * module, not to tell them to turn it off.
 */
function reachableEntries(): EnabledEntry[] {
  const source = modulesSource()
  const entries = [...enabledArrayEntries()]
  for (const site of pushSites(source)) {
    if (site.entry) entries.push(site.entry)
  }
  entries.push(...officialEntries())

  const unique: EnabledEntry[] = []
  for (const entry of entries) {
    if (!unique.some((existing) => existing.id === entry.id)) unique.push(entry)
  }
  return unique
}

/** The modules this environment actually has enabled, for the printed line. */
function environmentEntries(): EnabledEntry[] {
  const source = modulesSource()
  const entries = [...enabledArrayEntries()]
  for (const site of pushSites(source)) {
    const envVar = /process\.env\.([A-Z0-9_]+)/.exec(site.span)?.[1]
    const followsExample = site.span.includes("entry.id === 'example'")
    const enabled = envVar
      ? /^(1|true|yes|on)$/i.test(process.env[envVar] ?? '')
      : followsExample
        ? entries.some((entry) => entry.id === 'example')
        : false
    if (!enabled) continue
    if (site.entry && !entries.some((existing) => existing.id === site.entry!.id)) entries.push(site.entry)
  }
  entries.push(...officialEntries())
  return entries
}

type ModuleScan = {
  id: string
  from: string
  rootKnown: boolean
  path: string
  exists: boolean
  ids: string[]
  described: string[]
}

/**
 * Reads the feature declarations out of a module's `acl.ts` without importing it.
 *
 * Parsing rather than importing keeps the guard independent of module bootstrap:
 * it must be able to see a module that fails to load, since "the module broke"
 * and "the module has no descriptors" are different problems.
 */
function readFeatureIds(path: string): { ids: string[]; described: string[] } {
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

function scanEntries(entries: EnabledEntry[]): ModuleScan[] {
  return entries.map((entry) => {
    const root = moduleRootFor(entry.from)
    const path = root ? join(root, entry.id, 'acl.ts') : ''
    const exists = Boolean(root) && existsSync(path)
    const { ids, described } = exists ? readFeatureIds(path) : { ids: [], described: [] }
    return { id: entry.id, from: entry.from, rootKnown: Boolean(root), path, exists, ids, described }
  })
}

/**
 * Enabled modules that genuinely declare no permissions.
 *
 * They are named rather than skipped: "the module has no `acl.ts`" and "the guard
 * looked in the wrong place" produce the same empty result, and only a named list
 * tells them apart. A new module arriving here fails the guard until somebody
 * says, deliberately, that it declares nothing.
 */
const DECLARES_NOTHING = ['content', 'events', 'ratelimit_probe']

const reachable = scanEntries(reachableEntries())
const withFeatures = reachable.filter((module) => module.ids.length > 0)
const coreModules = withFeatures.filter((module) => module.from === '@open-mercato/core')
const otherModules = withFeatures.filter((module) => module.from !== '@open-mercato/core')

describe('the enabled surface the guard is meant to cover', () => {
  it('understands every way a module can be enabled', () => {
    // R2: a new `enabledModules.push(` the guard does not recognise is a module
    // that would be invisible — the same defect this file was rewritten for.
    expect(unattributedPushSites()).toEqual([])
  })

  it('resolves every enabled module to a package it knows', () => {
    const unknown = reachable.filter((module) => !module.rootKnown).map((module) => `${module.id} (from '${module.from}')`)
    expect(unknown).toEqual([])
  })

  it('finds an acl.ts for every enabled module that should have one', () => {
    const missing = reachable
      .filter((module) => !module.exists)
      .map((module) => module.id)
      .filter((id) => !DECLARES_NOTHING.includes(id))
    expect(missing).toEqual([])
  })

  it('does not count a module the file says is off', () => {
    // The reference modules sit below `enabledModules` in the same file. Counting
    // them is the second defect this guard was rewritten for: the old parse took
    // every `id:` literal, so `example` — which that file says is *deliberately
    // off* and *must not appear in a customer's product* — was in the
    // denominator. Asserting it here is what makes the scoping load-bearing.
    const enabledIds = environmentEntries().map((entry) => entry.id)
    const flagOn = (name: string) => /^(1|true|yes|on)$/i.test(process.env[name] ?? '')

    if (!flagOn('OM_ENABLE_EXAMPLES')) {
      expect(enabledIds).not.toContain('example')
      expect(enabledIds).not.toContain('example_customers_sync')
    }
    if (!flagOn('OM_ENABLE_STORAGE_S3')) {
      expect(enabledIds).not.toContain('storage_s3')
    }
  })

  it('finds the acl declarations it is meant to be guarding', () => {
    // Without this, a change to the parsing could reduce the guard to zero
    // features and it would pass while checking nothing. The floor is the
    // measured surface, not a round number: 121 core + 39 elsewhere.
    const total = withFeatures.reduce((sum, module) => sum + module.ids.length, 0)
    expect(total).toBeGreaterThanOrEqual(160)
  })

  it('checks modules from more than one package', () => {
    // R6: the defect was a denominator that could not see outside core. Without
    // this floor a regression to core-only would pass every other assertion here
    // and print 100% again — the exact failure, restored in silence.
    expect(withFeatures.length).toBeGreaterThanOrEqual(34)
    expect(otherModules.length).toBeGreaterThanOrEqual(10)
    expect(coreModules.length).toBeGreaterThanOrEqual(24)
  })

  it.each(withFeatures.map((module) => module.id))('%s has a descriptor on every feature', (moduleId) => {
    const module = withFeatures.find((candidate) => candidate.id === moduleId)!
    // The undescribed ids, not just a count — a failure should say which
    // permission is missing risk semantics, not that some number moved.
    expect(module.ids.filter((id) => !module.described.includes(id))).toEqual([])
  })

  it('reports how much of the permission surface has risk semantics', () => {
    const features: AclFeatureDeclaration[] = []
    for (const module of withFeatures) {
      for (const id of module.ids) {
        features.push({
          id,
          title: id,
          module: module.id,
          ...(module.described.includes(id) ? { capability: { effectClass: 'E0', reversibility: 'reversible' } as never } : {}),
        })
      }
    }

    const coverage = measureCapabilityCoverage(features)
    const percent = Math.round((coverage.described / coverage.total) * 100)

    // R8: the denominator is named. `100%` over a surface nobody stated is how
    // this guard read for a day while the agent module had no descriptors.
    const inEnvironment = scanEntries(environmentEntries()).reduce((sum, module) => sum + module.ids.length, 0)

    // eslint-disable-next-line no-console
    console.log(
      `[capabilities] ${coverage.described}/${coverage.total} features described (${percent}%) across ` +
      `${withFeatures.length} modules reachable from enabledModules — every documented enablement path, ` +
      `${inEnvironment} features in this environment. ` +
      `Remaining: ${Object.keys(coverage.undescribedByModule).sort().join(', ') || 'none'}`,
    )

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
  const modules = withFeatures.map((module) => ({ id: module.id, path: module.path }))

  beforeEach(() => clearCapabilityRegistry())
  afterAll(() => clearCapabilityRegistry())

  it.each(modules.map((module) => module.id))('%s declares coherent capabilities', (moduleId) => {
    clearCapabilityRegistry()
    const module = modules.find((candidate) => candidate.id === moduleId)!
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const loaded = require(module.path) as {
      features?: AclFeatureDeclaration[]
      default?: AclFeatureDeclaration[]
    }
    const features = loaded.features ?? loaded.default ?? []
    registerCapabilityDescriptors(features)

    expect(validateRegisteredCapabilities()).toEqual([])
  })

  it('classifies every act that leaves the company as E3 or higher', () => {
    clearCapabilityRegistry()
    for (const module of modules) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const loaded = require(module.path) as {
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
    for (const module of modules) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const loaded = require(module.path) as {
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
