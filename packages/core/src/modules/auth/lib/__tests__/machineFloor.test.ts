import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  FLOOR_BOUND_KINDS,
  MACHINE_FLOOR,
  floorRefusalFor,
  isFloorBoundKind,
} from '../machineFloor'

/**
 * `CC-125` — the floor: the capabilities no configuration may ever grant to a machine.
 *
 * **The most important test in this file is the last one**, and it is not about behaviour at all: every id
 * on the floor must be a capability some `acl.ts` actually declares. A floor that names a misspelt id is
 * indistinguishable from a floor that covers nothing, and it fails **open** — the guard looks present and
 * refuses nobody. `CC-132` is the same lesson from the other direction (a denominator that excluded 23% of
 * the surface and printed 100%).
 */

describe('CC-125 — the floor binds machines, and only machines', () => {
  it('binds exactly the three machine kinds', () => {
    expect([...FLOOR_BOUND_KINDS].sort((a, b) => a.localeCompare(b))).toEqual([
      'ai_worker',
      'service',
      'system',
    ])
  })

  it('does NOT bind a human — somebody has to mint the keys', () => {
    for (const capability of MACHINE_FLOOR.keys()) {
      expect(floorRefusalFor('human', capability)).toBeNull()
    }
  })

  it('refuses every floor capability to every machine kind', () => {
    for (const kind of FLOOR_BOUND_KINDS) {
      for (const capability of MACHINE_FLOOR.keys()) {
        const refusal = floorRefusalFor(kind, capability)
        expect(refusal).not.toBeNull()
        // the message must name the floor and say a person may hold it — an operator who reads
        // "the actor does not hold it" goes and grants it, which is the one thing that will not help
        expect(refusal).toMatch(/machine floor/)
        expect(refusal).toMatch(/A person may hold it/)
      }
    }
  })

  it('leaves an ordinary capability alone', () => {
    expect(floorRefusalFor('ai_worker', 'ai_assistant.view')).toBeNull()
    expect(floorRefusalFor('ai_worker', 'directory.organizations.view')).toBeNull()
  })

  it('an unknown kind is not floor-bound — the kinds are an allow-list, not a deny-list', () => {
    expect(isFloorBoundKind('something-new')).toBe(false)
    expect(isFloorBoundKind(null)).toBe(false)
  })

  it('EXCLUDES api_keys.delete on purpose: deleting a key narrows', () => {
    // The owner's wording is "minting or widening". Deleting is neither, and a floor that crept into
    // every neighbouring capability would be a policy change dressed as a safety rule.
    expect(MACHINE_FLOOR.has('api_keys.delete')).toBe(false)
    expect(floorRefusalFor('ai_worker', 'api_keys.delete')).toBeNull()
  })

  it('covers all five of the owner\'s categories, and the two that expand or are empty are named', () => {
    // seven ids behind five categories: 1 + 4 + 1 + 1 — "granting" is expressed four ways
    expect(MACHINE_FLOOR.size).toBe(7)
    // and "erasing the audit ledger" has NO capability — nothing can erase it, machine or human.
    // Asserted as an absence so the finding cannot be quietly forgotten.
    expect([...MACHINE_FLOOR.keys()].some((id) => /ledger/i.test(id))).toBe(false)
  })
})

// ── the typo guard ────────────────────────────────────────────────────────────
/**
 * Every id on the floor must be declared by a real `acl.ts`.
 *
 * Walks the same two roots the app ships from — `packages/<pkg>/src/modules/<mod>/acl.ts` and
 * `apps/mercato/src/modules/<mod>/acl.ts` — and collects `id: '…'`. Not a registry lookup, because the
 * registry is populated at runtime by whatever the app happened to load, and a floor validated against a
 * partial registry would pass for the wrong reason.
 */
function declaredCapabilityIds(): Set<string> {
  const repoRoot = join(__dirname, '..', '..', '..', '..', '..', '..', '..')
  const roots = [join(repoRoot, 'packages'), join(repoRoot, 'apps', 'mercato', 'src')]
  const ids = new Set<string>()

  const walk = (dir: string, depth: number): void => {
    if (depth > 6 || !existsSync(dir)) return
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
      const full = join(dir, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        walk(full, depth + 1)
        continue
      }
      if (entry !== 'acl.ts') continue
      const source = readFileSync(full, 'utf8')
      for (const match of source.matchAll(/\bid:\s*'([^']+)'/g)) ids.add(match[1])
    }
  }

  for (const root of roots) walk(root, 0)
  return ids
}

describe('CC-125 — every floor id is a capability that actually exists', () => {
  it('finds the catalogue at all (a scan that returns nothing would pass vacuously)', () => {
    const declared = declaredCapabilityIds()
    // measured: the enabled surface is 160+ capabilities across 34 modules; anything near zero means the
    // walk broke, and a broken walk must fail rather than silently validate an empty set
    expect(declared.size).toBeGreaterThan(100)
  })

  it('names no capability the catalogue does not declare', () => {
    const declared = declaredCapabilityIds()
    const missing = [...MACHINE_FLOOR.keys()].filter((id) => !declared.has(id))
    expect(missing).toEqual([])
  })
})
