#!/usr/bin/env node
/**
 * Mutation proof for `CC-123` — the invoker rule.
 *
 * WHY THIS EXISTS
 * ---------------
 * A passing suite proves the code behaves on the cases it was given; it does not
 * prove the suite would NOTICE if the behaviour regressed. This breaks the
 * production source on purpose — the plumbing, the invoker reaching the decision,
 * the descriptor-free half, the guard that stops it recursing, the fail-closed
 * reader, and the route reading the principal rather than `userId` — and watches
 * the suite go red IN THE CASE THE MUTATION WAS AIMED AT.
 *
 * Same discipline as `verify-cc127-mutations.mjs`: each target is copied to
 * `<file>.orig`, mutations are applied one at a time, the affected suites are run,
 * and every original is restored and compared byte-for-byte before exit. A
 * mutation the suite survives is reported NOT PROVEN and is a real gap.
 *
 * TWO PACKAGES. The rule spans `core` (the resolver and the RBAC door) and
 * `mercato` (the HTTP route), and each has its own jest config and its own
 * module resolution — so the runner takes a package per mutation rather than
 * pretending one invocation covers both.
 *
 * USAGE
 * -----
 *   node scripts/verify-cc123-mutations.mjs
 *
 * Run from the repo root. Exits 0 only if EVERY mutation is proven.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
// The suites carry the toolchain they were verified on; mirror it here.
// (`companai/workspace/.toolchain/node24` — two levels above the repo root.)
const NODE = path.resolve(HERE, '..', '..', '.toolchain', 'node24', 'node.exe')
const JEST = path.resolve(REPO, 'node_modules', 'jest', 'bin', 'jest.js')

const CORE = path.join(REPO, 'packages', 'core')
const APP = path.join(REPO, 'apps', 'mercato')

const CORE_SUITES = [
  'src/modules/auth/services/__tests__/authorityEnforcement.invokerHolding.test.ts',
  'src/modules/auth/services/__tests__/rbacService.invoker.test.ts',
]
const APP_SUITES = ['src/__tests__/api-authorization.test.ts']

const ENFORCEMENT = path.join(
  CORE,
  'src/modules/auth/services/authorityEnforcementService.ts',
)
const RBAC = path.join(CORE, 'src/modules/auth/services/rbacService.ts')
const ROUTE = path.join(APP, 'src/app/api/[...slug]/route.ts')

/**
 * Each mutation is `{ name, file, pkg, suites, find, replace, expects }`.
 * `expects` names the test that must fail — a mutation the suite catches in the
 * WRONG case is not proof of that case.
 */
const MUTATIONS = [
  // ── M1: the plumbing ───────────────────────────────────────────────────────
  {
    name: 'the RBAC door drops the invoker instead of forwarding it',
    file: RBAC,
    pkg: CORE,
    suites: CORE_SUITES,
    find: '    return !(await this.refusedByAuthority(userId, required, scope, options))',
    replace: '    return !(await this.refusedByAuthority(userId, required, scope))',
    expects: 'passes it to the capability-aware half',
  },
  // ── M2: the invoker reaches the decision ───────────────────────────────────
  {
    name: 'refusalFor decides without the invoker it was given',
    file: ENFORCEMENT,
    pkg: CORE,
    suites: CORE_SUITES,
    find: '      const decision = await this.decideFor(subject, feature, scope, { onBehalfOfUserId })',
    replace: '      const decision = await this.decideFor(subject, feature, scope)',
    expects: 'refuses when the person the credential acts for does not hold the capability',
  },
  // ── M3: the half that needs no descriptor ──────────────────────────────────
  {
    name: 'the descriptor-free holding refusal is removed',
    file: ENFORCEMENT,
    pkg: CORE,
    suites: CORE_SUITES,
    find: '      if (!holds) {',
    replace: '      if (!holds && false) {',
    expects: 'refuses an undescribed feature the person does not hold',
  },
  // ── M4: the guard that stops it recursing ──────────────────────────────────
  {
    // NOTE (Rule 13): the requirement said "a stack overflow, asserted as a
    // timeout". It cannot be asserted that way in a unit suite whose ACL layer is
    // stubbed — the recursion is unreachable there. What IS observable is the
    // guard's behaviour: with no invoker, no question is asked. That is what this
    // mutation removes, and that is the case it must turn red.
    name: 'the holding half runs even when there is no invoker',
    file: ENFORCEMENT,
    pkg: CORE,
    suites: CORE_SUITES,
    find: '    if (!invoker) return null',
    replace: '    if (!invoker && false) return null',
    expects: 'asks nothing when no invoker is supplied',
  },
  // ── M5: an unreadable invoker fails closed ─────────────────────────────────
  {
    name: 'a missing invoker reader stops refusing (fails open)',
    file: ENFORCEMENT,
    pkg: CORE,
    suites: CORE_SUITES,
    find: `    if (!this.invokerAuthority) {
      logger.error('Cannot read the invoker’s authority; refusing rather than running ungoverned', {`,
    replace: `    if (!this.invokerAuthority && false) {
      logger.error('Cannot read the invoker’s authority; refusing rather than running ungoverned', {`,
    expects: 'refuses when the reader is missing and the tenant is enforcing',
  },
  // ── M6: the route reads the principal, not userId ──────────────────────────
  {
    name: 'the route reads the invoker from auth.userId instead of the principal',
    file: ROUTE,
    pkg: APP,
    suites: APP_SUITES,
    find: '    const onBehalfOfUserId = derivePrincipal(auth)?.onBehalfOfUserId ?? null',
    replace: '    const onBehalfOfUserId = (auth as { userId?: string | null }).userId ?? null',
    expects: 'does not treat a person as acting for somebody else',
  },
]

const TARGETS = [...new Set(MUTATIONS.map((m) => m.file))]
const originals = new Map(TARGETS.map((file) => [file, readFileSync(file, 'utf8')]))
const backups = new Map()
for (const file of TARGETS) {
  const backup = `${file}.orig`
  copyFileSync(file, backup)
  backups.set(file, backup)
}

let allProven = true
let mutationLabel = '(harness)'
let currentSuites = []
let currentPkg = CORE

function runSuites() {
  const result = spawnSync(
    NODE,
    [JEST, '--config', 'jest.config.cjs', '--forceExit', ...currentSuites],
    { cwd: currentPkg, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  if (result.error) {
    // A harness that cannot run the suites is not a proof — say so loudly.
    console.log(`SPAWN ERROR ${mutationLabel} — ${result.error.message}`)
    allProven = false
    return ''
  }
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  // L21 — the denominator. A pattern that selects nothing exits 0 and looks
  // green; `Test Suites: … N total` is the only honest count. The line reads
  // "X failed, Y passed, M total" when a mutation bites, so the TOTAL is the
  // last number on the line, not the one after "passed".
  const ran = output.match(/Test Suites:[^\n]*?(\d+) total/)
  if (!ran) {
    console.log(`NO SUITE COUNT ${mutationLabel} — jest printed no summary; the run is not a proof`)
    allProven = false
  } else if (Number(ran[1]) !== currentSuites.length) {
    console.log(
      `SUITE COUNT ${mutationLabel} — asked for ${currentSuites.length}, jest ran ${ran[1]} (a pattern matched nothing)`,
    )
    allProven = false
  }
  return output
}

try {
  for (const mutation of MUTATIONS) {
    mutationLabel = mutation.name
    currentSuites = mutation.suites
    currentPkg = mutation.pkg
    const original = originals.get(mutation.file)
    if (!original.includes(mutation.find)) {
      console.log(`SKIP        ${mutation.name} — anchor not found in ${path.basename(mutation.file)}`)
      allProven = false
      continue
    }
    const mutated = original.replace(mutation.find, mutation.replace)
    if (mutated === original) {
      console.log(`SKIP        ${mutation.name} — the replacement was a no-op`)
      allProven = false
      continue
    }
    writeFileSync(mutation.file, mutated)

    const output = runSuites()
    const suiteFailed = /✕|● .*›/.test(output) || /Tests:.*failed/.test(output)
    const caughtTheRightCase = output.includes(mutation.expects)

    if (suiteFailed && caughtTheRightCase) console.log(`PROVEN      ${mutation.name}`)
    else if (suiteFailed) {
      console.log(`PARTIAL     ${mutation.name} — the suite failed, but not the case it should`)
      allProven = false
    } else {
      console.log(`NOT PROVEN  ${mutation.name} — the suite still passed with the bug present`)
      allProven = false
    }
    // Restore before the next mutation regardless of outcome.
    writeFileSync(mutation.file, original)
  }
} finally {
  for (const [file, backup] of backups) {
    copyFileSync(backup, file)
    try {
      unlinkSync(backup)
    } catch {
      /* already gone */
    }
  }
}

let restored = true
for (const file of TARGETS) {
  if (readFileSync(file, 'utf8') !== originals.get(file)) {
    console.log(`\nRESTORE FAILED — ${path.basename(file)} is NOT byte-identical to before this run.`)
    restored = false
  }
}
if (!restored) process.exitCode = 1
else console.log('\nEvery mutated file restored — byte-identical to before this run.')

console.log(
  allProven
    ? `All ${MUTATIONS.length} mutations proven: the plumbing, the invoker reaching the decision, the descriptor-free half, the recursion guard, the fail-closed reader and the route's source of truth all have teeth.`
    : 'SOME MUTATIONS NOT PROVEN — the suite has a gap. Read the NOT PROVEN lines above.',
)
if (!allProven) process.exitCode = 1
