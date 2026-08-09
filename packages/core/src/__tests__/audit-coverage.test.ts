import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * Audit coverage guard (R2a-custom).
 *
 * Writes that change business data must leave a record. The CRUD factory and the
 * command bus handle that automatically, but **custom routes bypass both** — and
 * that is exactly how 16 of 25 modules ended up recording nothing at all,
 * including credential creation and revocation.
 *
 * Wiring those routes by hand fixed the ones that existed. This test is what
 * stops the next one being added without an audit call: the failure mode is not
 * a crash, it is silence, and silence is invisible in review.
 *
 * **What it checks.** For each module below, every route file that mutates
 * persistent state must reference `writeDirectWriteAuditLog`. Modules audited
 * automatically (anything built on `makeCrudRoute`) are not listed — they get
 * coverage from the factory.
 *
 * **If this fails on a route you just added:** wire it, do not add it to the
 * exemption list. The recipe is in workspace/knowledge/audited-writes.md.
 */

const modulesRoot = join(__dirname, '..', 'modules')

/** Modules whose write routes are custom and must therefore audit by hand. */
const MODULES_REQUIRING_MANUAL_AUDIT = [
  'integrations',
  'attachments',
  'data_sync',
  'workflows',
  'inbox_ops',
  'directory',
] as const

/**
 * Signals that a route mutates persistent state.
 *
 * Includes service-mediated writes: an earlier version of this check looked only
 * for ORM calls and missed `integrations/credentials`, which persists through
 * `credentialsService.save()` — the single most consequential write in the set.
 */
const MUTATION_SIGNALS = [
  /\bem\.persist\(/,
  /\bem\.remove\(/,
  /\bem\.flush\(/,
  /\bem\.transactional\(/,
  /\bnativeUpdate\(/,
  /\bnativeDelete\(/,
  /\bcreateOrmEntity\(/,
  /\b\w*[Ss]ervice\.(save|create|update|delete|remove|upsert|store|markStatus)\w*\(/,
]

/**
 * Routes that pass the mutation heuristic but change nothing persistent.
 *
 * Each entry states why, because an unexplained exemption is how coverage
 * quietly erodes.
 */
const NOT_ACTUALLY_MUTATIONS: Record<string, string> = {
  'data_sync/api/validate.ts':
    'Only calls credentialsService.resolve() — a read. Matched on the service name, not the operation.',
  'inbox_ops/api/proposals/[id]/translate/route.ts':
    'Caches a machine translation of content already stored on the proposal. A rendering of the same facts in another language changes no business data, so recording it would add volume and no answer.',
}

/**
 * Routes whose audit entry is written somewhere else, and where.
 *
 * The engine is the right place for the inbox_ops decisions: `accept`,
 * `accept-all`, `reject` and the proposal-level `reject` all funnel through
 * `lib/executionEngine.ts`, so the record sits next to the status transition it
 * describes instead of being copy-pasted into four routes.
 *
 * Each entry names the file that does the writing, and the test verifies that
 * file actually contains an audit call — otherwise this map would be a way to
 * silence the guard by asserting something untrue.
 */
const AUDITED_ELSEWHERE: Record<string, string> = {
  'inbox_ops/api/proposals/[id]/actions/[actionId]/accept/route.ts':
    'modules/inbox_ops/lib/executionEngine.ts',
  'inbox_ops/api/proposals/[id]/actions/[actionId]/reject/route.ts':
    'modules/inbox_ops/lib/executionEngine.ts',
  'inbox_ops/api/proposals/[id]/accept-all/route.ts':
    'modules/inbox_ops/lib/executionEngine.ts',
  'inbox_ops/api/proposals/[id]/reject/route.ts':
    'modules/inbox_ops/lib/executionEngine.ts',
}

function walk(dir: string, acc: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(full, acc)
      continue
    }
    if (name.endsWith('.ts') && !name.endsWith('.test.ts')) acc.push(full)
  }
}

function routeKey(moduleId: string, file: string): string {
  return `${moduleId}/${relative(join(modulesRoot, moduleId), file).split(sep).join('/')}`
}

describe('audit coverage — custom write routes record what they change', () => {
  const unaudited: string[] = []
  let mutatingRouteCount = 0

  for (const moduleId of MODULES_REQUIRING_MANUAL_AUDIT) {
    const files: string[] = []
    walk(join(modulesRoot, moduleId, 'api'), files)

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      const hasWriteHandler = /export async function (POST|PUT|PATCH|DELETE)\b/.test(source)
      if (!hasWriteHandler) continue
      if (!MUTATION_SIGNALS.some((pattern) => pattern.test(source))) continue

      const key = routeKey(moduleId, file)
      if (key in NOT_ACTUALLY_MUTATIONS) continue

      mutatingRouteCount += 1
      if (key in AUDITED_ELSEWHERE) continue
      if (!source.includes('writeDirectWriteAuditLog')) unaudited.push(key)
    }
  }

  it('finds the mutating routes it is meant to be guarding', () => {
    // Without this, a change to the module list or the heuristics could reduce
    // the check to zero routes and it would pass while guarding nothing.
    expect(mutatingRouteCount).toBeGreaterThanOrEqual(10)
  })

  it('every mutating custom route writes an audit entry', () => {
    expect(unaudited).toEqual([])
  })

  it('documents why each exemption is not a mutation', () => {
    for (const [route, reason] of Object.entries(NOT_ACTUALLY_MUTATIONS)) {
      expect(reason.length).toBeGreaterThan(20)
      expect(route).toMatch(/^[a-z_]+\/api\//)
    }
  })

  it('every route audited elsewhere names a file that really audits', () => {
    // Without this the map would be an unchecked way to opt out: a route could
    // point at a file that audits nothing, and the guard would agree.
    for (const [route, auditingFile] of Object.entries(AUDITED_ELSEWHERE)) {
      expect(route).toMatch(/^[a-z_]+\/api\//)
      const source = readFileSync(join(__dirname, '..', auditingFile), 'utf8')
      expect(source).toContain('writeDirectWriteAuditLog')
    }
  })
})
