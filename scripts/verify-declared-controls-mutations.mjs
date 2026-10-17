#!/usr/bin/env node
/**
 * Mutation proof for `check-declared-controls.mjs` (SR-47).
 *
 * WHY THIS EXISTS
 * ---------------
 * A test that passes proves the check behaves correctly on the cases it was given. It does not
 * prove the test would NOTICE if the check regressed — a test suite where every assertion happens
 * to hold is indistinguishable from one that tests nothing. The way to tell the difference is to
 * break the check on purpose and watch the suite go red.
 *
 * That is not a theoretical concern for THIS check. It was wrong twice while being built, both
 * times in the dangerous direction — reporting a dead control as wired:
 *
 *   1. String literals were not stripped, so `auth/acl.ts:112`'s sentence "Emphatically not itself
 *      delegable:" read as a declaration site.
 *   2. Regex literals were not stripped, so the registry's own
 *      `consumer: /\.delegable\b|\[['"]delegable['"]\]/` — a quote inside a character class — read
 *      as a string delimiter, the `\.delegable` before it survived, and the check reported ITSELF
 *      as the control's consumer. On a real run this made `.delegable` look COVERED.
 *
 * Both were caught by a human reading the output, not by the suite. The suite has since been
 * extended with a case for each, and this harness is what proves those cases have teeth.
 *
 * ⚠️  IT MUTATES COMMITTED SOURCE — but only its own inputs, and only for the length of one run.
 * Each file a mutation can touch (the checker, and the shared lexer `lib/strip-code.mjs`) is copied
 * to `<file>.orig`, the mutations are applied, the suite is run, and every original is restored and
 * compared byte-for-byte before the script exits. It refuses to report success unless every restore
 * is exact. Do not run it with a mutated file open in an editor that autosaves.
 *
 * USAGE
 * -----
 *   node scripts/verify-declared-controls-mutations.mjs
 *
 * Exits 0 only if EVERY mutation is proven — the suite failed, AND it failed the case that mutation
 * was aimed at. A mutation the suite survives is reported as NOT PROVEN and is a real gap.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, 'check-declared-controls.mjs')
/**
 * The shared lexer. Three of the mutations below live in it now that `strip()` was extracted to
 * `scripts/lib/strip-code.mjs` (so `check-two-reads` can reuse it instead of growing a second
 * lexer). A mutation declares its `target`; the default is the checker.
 */
const STRIP_LIB = path.resolve(HERE, 'lib', 'strip-code.mjs')
const TEST = path.resolve(HERE, '__tests__', 'check-declared-controls.test.mjs')

/**
 * Each mutation is `{ find, replace }` applied to the checker's own text. `expects` names the test
 * case that must fail — a mutation the suite catches in the WRONG case is not proof of that case.
 */
const MUTATIONS = [
  {
    name: 'regex literals are no longer stripped',
    target: STRIP_LIB,
    expects: 'does NOT count its own registry as a consumer',
    find: "    if (c === '/' && !isDivision()) {",
    replace: "    if (c === '/' && false && !isDivision()) {",
  },
  {
    name: 'string literals are no longer stripped',
    target: STRIP_LIB,
    expects: 'does NOT let prose fake a declaration or a consumer',
    find: "    if (c === '\"' || c === \"'\") {",
    replace: '    if (false) {',
  },
  {
    name: 'comments are no longer stripped',
    target: STRIP_LIB,
    expects: 'does NOT let prose fake a declaration or a consumer',
    find: "    if (c === '/' && c2 === '/') {",
    replace: "    if (c === '\\u0000' && c2 === '/') {",
  },
  {
    name: 'same-file consumers always count (recursion reads as wired)',
    expects: 'does NOT count a recursive self-call as a consumer',
    find: "  const countedConsumers =\n    control.consumerScope === 'external'",
    replace: "  const countedConsumers =\n    control.consumerScope === 'any'",
  },
  {
    name: 'a declaration line counts as its own consumer',
    expects: 'reports DEAD-INPUT when a consumer exists but no producer declares the contract',
    find: '  const prodConsumers = consumerSites.prod.filter((s) => !isDeclaration(s))',
    replace: '  const prodConsumers = consumerSites.prod',
  },
  {
    name: 'test files are never walked (test-only consumers become invisible)',
    expects: 'reports UNCOVERED when the only consumers are tests',
    find: '    if (!includeTests && (TEST_DIRS.has(entry) || isTestFile(entry))) continue',
    replace: '    if (TEST_DIRS.has(entry) || isTestFile(entry)) continue',
  },
]

// Every file a mutation can touch is snapshotted up front, so the run is reversible even when a
// mutation targets the shared lexer rather than the checker itself.
const TARGETS = [CHECKER, STRIP_LIB]
const originals = new Map(TARGETS.map((file) => [file, readFileSync(file, 'utf8')]))
const backups = new Map()
for (const file of TARGETS) {
  const backup = `${file}.orig`
  copyFileSync(file, backup)
  backups.set(file, backup)
}

let allProven = true
try {
  for (const mutation of MUTATIONS) {
    const targetFile = mutation.target || CHECKER
    const original = originals.get(targetFile)
    if (!original.includes(mutation.find)) {
      console.log(`SKIP        ${mutation.name} — anchor not found in ${path.basename(targetFile)}`)
      allProven = false
      continue
    }
    const mutated = original.replace(mutation.find, mutation.replace)
    if (mutated === original) {
      console.log(`SKIP        ${mutation.name} — the replacement was a no-op`)
      allProven = false
      continue
    }
    writeFileSync(targetFile, mutated)

    const result = spawnSync(process.execPath, ['--test', TEST], { encoding: 'utf8' })
    const output = `${result.stdout}\n${result.stderr}`
    const suiteFailed = /not ok/.test(output)
    const caughtTheRightCase = output.includes(mutation.expects)

    if (suiteFailed && caughtTheRightCase) console.log(`PROVEN      ${mutation.name}`)
    else if (suiteFailed) {
      console.log(`PARTIAL     ${mutation.name} — the suite failed, but not the case it should`)
      allProven = false
    } else {
      console.log(`NOT PROVEN  ${mutation.name} — the suite still passed with the bug present`)
      allProven = false
    }
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
    ? 'All mutations proven: every precision case in the suite has teeth.'
    : 'SOME MUTATIONS NOT PROVEN — the suite has a gap. Read the NOT PROVEN lines above.',
)
if (!allProven) process.exitCode = 1
