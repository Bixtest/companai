#!/usr/bin/env node
/**
 * CC-132 mutation proof.
 *
 * Seven mutations, each one the defect the requirement names, each one restored
 * byte-identically afterwards. A mutation whose test does not go red is a defect
 * in the test, not in the rule (`LESSONS.md` L23) — so every mutation declares
 * which test must fail, and a mutation that fails a DIFFERENT test counts as
 * NOT PROVEN, because the guard would then be catching it for the wrong reason.
 *
 * Two of the seven cannot be proved by deleting a line:
 *  - a floor assertion is only load-bearing against the regression it guards, so
 *    M4 removes BOTH the floor's reason to exist and the floor;
 *  - "counts a module that is off" has no effect on coverage once that module is
 *    described, so M7 is asserted through the environment set instead.
 *
 * Run from the repo root:
 *   ../.toolchain/node24/node.exe scripts/verify-cc132-mutations.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = join(here, '..')
const node = process.execPath
const jest = join(root, 'node_modules', 'jest', 'bin', 'jest.js')

const GUARD = 'packages/core/src/__tests__/capability-coverage.test.ts'
const AI_ACL = 'packages/ai-assistant/src/modules/ai_assistant/acl.ts'
const MODULES = 'apps/mercato/src/modules.ts'

const mutations = [
  {
    name: 'the numerator reads one package again (the original defect)',
    file: GUARD,
    from: `  if (from === '@open-mercato/core') return join(repoRoot, 'packages', 'core', 'src', 'modules')
  if (from === '@app') return join(repoRoot, 'apps', 'mercato', 'src', 'modules')
  const match = /^@open-mercato\\/([a-z0-9-]+)$/.exec(from)
  return match ? join(repoRoot, 'packages', match[1], 'src', 'modules') : null`,
    to: `  return join(repoRoot, 'packages', 'core', 'src', 'modules')`,
    expect: ['finds an acl.ts for every enabled module that should have one'],
  },
  {
    name: 'one package resolves to the wrong tree',
    file: GUARD,
    from: `  const match = /^@open-mercato\\/([a-z0-9-]+)$/.exec(from)`,
    to: `  if (from === '@open-mercato/search') return join(repoRoot, 'packages', 'core', 'src', 'modules')
  const match = /^@open-mercato\\/([a-z0-9-]+)$/.exec(from)`,
    expect: ['finds an acl.ts for every enabled module that should have one'],
  },
  {
    name: 'a known root is treated as unknown and skipped',
    file: GUARD,
    from: `  if (from === '@app') return join(repoRoot, 'apps', 'mercato', 'src', 'modules')`,
    to: `  if (from === '@app') return null`,
    expect: ['resolves every enabled module to a package it knows'],
  },
  {
    name: 'a module enabled by a flag is dropped from the surface (and the floor that catches it)',
    file: GUARD,
    from: `  for (const site of pushSites(source)) {
    if (site.entry) entries.push(site.entry)
  }
  entries.push(...officialEntries())

  const unique: EnabledEntry[] = []`,
    to: `  const unique: EnabledEntry[] = []`,
    expect: ['finds the acl declarations it is meant to be guarding'],
    also: {
      from: `    expect(otherModules.length).toBeGreaterThanOrEqual(10)`,
      to: `    expect(otherModules.length).toBeGreaterThanOrEqual(0)`,
    },
  },
  {
    name: 'one descriptor is deleted from the agent surface',
    file: AI_ACL,
    from: `    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'ai_assistant.settings.manage',`,
    to: `  },
  {
    id: 'ai_assistant.settings.manage',`,
    expect: ['ai_assistant has a descriptor on every feature'],
  },
  {
    name: 'a new way to enable a module the guard does not know',
    file: MODULES,
    from: `if (parseBooleanWithDefault(process.env.OM_ENABLE_STORAGE_S3, false)) {`,
    to: `if (parseBooleanWithDefault(process.env.OM_ENABLE_WIDGETS, false)) {
  enabledModules.push({ id: 'api_docs', from: '@open-mercato/core' })
}

if (parseBooleanWithDefault(process.env.OM_ENABLE_STORAGE_S3, false)) {`,
    expect: ['understands every way a module can be enabled'],
  },
  {
    name: 'the denominator is parsed from the whole file, counting modules that are off',
    file: GUARD,
    from: `  const end = source.indexOf('\\n]', start)
  if (end < 0) throw new Error('enabledModules array terminator not found')
  return parseEntries(stripComments(source.slice(start, end)))`,
    to: `  return parseEntries(stripComments(source))`,
    expect: ['does not count a module the file says is off'],
  },
]

function runGuard() {
  const result = spawnSync(
    node,
    [jest, '--config', 'jest.config.cjs', '--forceExit', 'src/__tests__/capability-coverage.test.ts'],
    { cwd: join(root, 'packages', 'core'), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  // Jest reports a failure as `● <describe path> › <test name>`. The `✕` list
  // only appears in verbose mode, so parsing it would report "nothing failed"
  // for every mutation — a proof instrument that fails quietly (`LESSONS.md`
  // L181). Both forms are accepted; the `●` form is the one that always exists.
  const bullets = [...output.matchAll(/^\s+●\s+(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((line) => line.includes('›'))
    .map((line) => line.split('›').pop().trim())
  const crosses = [...output.matchAll(/✕\s+(.+?)(?:\s+\(\d+\s*ms\))?$/gm)].map((m) => m[1].trim())
  const failed = [...new Set([...bullets, ...crosses])]
  // The denominator is asserted, not assumed (`LESSONS.md` L21): a suite that ran
  // zero tests would "fail" nothing and every mutation would look PROVEN.
  const totals = [...output.matchAll(/^Tests:\s+(.+)$/gm)].map((m) => m[1].trim())
  const last = totals.length ? totals[totals.length - 1] : ''
  const ran = Number(/(\d+)\s+total/.exec(last)?.[1] ?? '0')
  return { failed, ran, output }
}

function restore(file, original) {
  writeFileSync(join(root, file), original, { encoding: 'utf8' })
}

let proven = 0
const results = []

for (const mutation of mutations) {
  const path = join(root, mutation.file)
  const original = readFileSync(path, 'utf8')
  const before = readFileSync(path)

  if (!original.includes(mutation.from)) {
    results.push({ name: mutation.name, state: 'NOT APPLIED — anchor not found' })
    continue
  }

  let mutated = original.replace(mutation.from, mutation.to)
  if (mutation.also) {
    if (!mutated.includes(mutation.also.from)) {
      results.push({ name: mutation.name, state: 'NOT APPLIED — secondary anchor not found' })
      continue
    }
    mutated = mutated.replace(mutation.also.from, mutation.also.to)
  }
  writeFileSync(path, mutated, { encoding: 'utf8' })

  let run
  try {
    run = runGuard()
  } finally {
    writeFileSync(path, before)
  }

  const restored = readFileSync(path).equals(before)
  const hit = mutation.expect.filter((expected) => run.failed.some((name) => name.includes(expected)))
  const missed = mutation.expect.filter((expected) => !run.failed.some((name) => name.includes(expected)))

  let state
  if (!restored) state = 'NOT RESTORED'
  else if (run.ran === 0) state = 'NOT PROVEN — the suite ran 0 tests'
  else if (missed.length === 0) {
    // Collateral red is honest, not a defect: one broken root legitimately breaks
    // the resolution test AND the floors that count what it resolved. What would
    // be a defect is the expected test staying GREEN, and that is `missed`.
    const unexpected = run.failed.filter((name) => !mutation.expect.some((expected) => name.includes(expected)))
    state = unexpected.length
      ? `PROVEN, and it also broke: ${unexpected.join(' · ')}`
      : 'PROVEN'
  } else state = `NOT PROVEN — expected red: ${missed.join(' · ')}`

  if (state.startsWith('PROVEN')) proven += 1
  results.push({ name: mutation.name, state, red: run.failed, ran: run.ran })
}

console.log('')
for (const result of results) {
  console.log(`${result.state.startsWith('PROVEN') ? '✓' : '✗'} ${result.name}`)
  console.log(`    ${result.state}`)
  if (result.red?.length) console.log(`    red: ${result.red.join(' · ')}`)
}
console.log('')
console.log(`${proven}/${mutations.length} mutations PROVEN`)
process.exitCode = proven === mutations.length ? 0 : 1
