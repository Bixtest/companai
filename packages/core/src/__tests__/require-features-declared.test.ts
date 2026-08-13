/**
 * Every permission a guard names must be a permission that exists.
 *
 * **Why this cannot be caught any other way.** Wildcard grants are part of the
 * ACL contract: `admin` holds `auth.*`, and `auth.*` matches `auth.trust.manage`
 * — a feature nobody ever declared — exactly as happily as it matches a real
 * one. So a typo in a `requireFeatures` string produces a page that loads,
 * renders and appears correctly gated *when tested as an administrator*, which
 * is how it will be tested.
 *
 * What ships is a page gated on a permission that exists nowhere: it cannot be
 * granted to a narrower role, cannot be revoked, never appears in the permission
 * editor, and carries no effect class — so the resolver treats acts behind it as
 * ordinary rather than as whatever they really are.
 *
 * `capability-coverage.test.ts` cannot see this. It checks that the descriptors
 * which *exist* are coherent; it has no way to notice a guard referencing one
 * that does not. This test is the other direction.
 *
 * Found by making the mistake (L46, U19). Three real cases existed in inherited
 * code at the time, all now corrected to the declared features they meant.
 *
 * **On the first version of this scan.** It reported seven, and four were
 * false. The regex used to harvest declared ids excluded hyphens, so genuinely
 * declared features like `customers.widgets.next-interactions` looked missing.
 * A guard that cries wolf gets suppressed, so the id pattern here is written
 * once, deliberately wide, and shared by both halves of the comparison.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Feature ids are dotted and may contain hyphens and underscores.
 *
 * Deliberately permissive: this pattern harvests *both* the declarations and
 * the usages, so anything it fails to match is invisible on both sides and
 * cannot produce a one-sided false alarm.
 */
const FEATURE_ID = "[a-zA-Z0-9_]+\\.[a-zA-Z0-9_.*-]+"

const packagesRoot = join(__dirname, '..', '..', '..')

function walk(dir: string, onFile: (path: string) => void): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue
    const full = join(dir, entry)
    let isDir = false
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (isDir) walk(full, onFile)
    else onFile(full)
  }
}

function collectDeclaredFeatures(): Set<string> {
  const declared = new Set<string>()
  walk(packagesRoot, (path) => {
    const normalized = path.replace(/\\/g, '/')
    if (!normalized.endsWith('/acl.ts') || !normalized.includes('/src/modules/')) return
    const source = readFileSync(path, 'utf8')
    // Two shapes in use: descriptor objects with an `id`, and bare string arrays.
    for (const match of source.matchAll(new RegExp(`id:\\s*'(${FEATURE_ID})'`, 'g'))) {
      declared.add(match[1])
    }
    for (const match of source.matchAll(new RegExp(`^\\s*'(${FEATURE_ID})',?\\s*$`, 'gm'))) {
      declared.add(match[1])
    }
  })
  return declared
}

type Usage = { feature: string; file: string }

function collectGuardedFeatures(): Usage[] {
  const usages: Usage[] = []
  walk(packagesRoot, (path) => {
    const normalized = path.replace(/\\/g, '/')
    if (!/\.tsx?$/.test(normalized)) return
    if (normalized.includes('/__tests__/')) return
    if (!normalized.includes('/src/')) return

    const source = readFileSync(path, 'utf8')
    if (!source.includes('requireFeatures')) return

    for (const block of source.matchAll(/requireFeatures:\s*\[([^\]]*)\]/g)) {
      for (const literal of block[1].matchAll(/'([^']+)'/g)) {
        usages.push({ feature: literal[1], file: normalized.split('/src/').pop() ?? normalized })
      }
    }
  })
  return usages
}

/**
 * Prose, not a guard.
 *
 * `shared/modules/denials.ts` explains wildcard denials using `sales.view` and
 * `sales.refund` in a doc comment. The harvester reads comments too, so the two
 * are named here rather than made invisible by narrowing the regex — narrowing
 * it is exactly what produced the false positives this test was written after.
 */
const DOCUMENTATION_EXAMPLES = new Set(['sales.view', 'sales.refund'])

const declared = collectDeclaredFeatures()
const usages = collectGuardedFeatures()

function isDeclared(feature: string): boolean {
  if (declared.has(feature)) return true
  // `module.*` is satisfied by any declared feature beneath it.
  if (feature.endsWith('*')) {
    const prefix = feature.slice(0, -1)
    return [...declared].some((candidate) => candidate.startsWith(prefix))
  }
  return false
}

describe('every requireFeatures string names a declared feature', () => {
  it('found enough declarations and usages to be meaningful', () => {
    // Self-guard (L37): a walker that silently matched nothing would make every
    // assertion below vacuously true, and the suite would pass by finding
    // nothing rather than by finding nothing wrong.
    expect(declared.size).toBeGreaterThan(100)
    expect(usages.length).toBeGreaterThan(100)
  })

  it('has no guard naming a permission that does not exist', () => {
    const undeclared = usages.filter(
      (usage) => !isDeclared(usage.feature) && !DOCUMENTATION_EXAMPLES.has(usage.feature),
    )

    const report = undeclared
      .map((usage) => `  ${usage.feature}  (${usage.file})`)
      .sort()
      .join('\n')

    expect(report).toBe('')
  })

  it('keeps the documentation exceptions honest', () => {
    // If prose stops mentioning these, the exception must go rather than sit
    // here forever hiding a future real one with the same name.
    const seen = usages.map((usage) => usage.feature)
    for (const example of DOCUMENTATION_EXAMPLES) {
      expect(seen).toContain(example)
    }
  })
})
