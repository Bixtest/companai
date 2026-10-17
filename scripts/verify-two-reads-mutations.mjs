#!/usr/bin/env node
/**
 * Mutation proof for `check-two-reads.mjs` (SR-46).
 *
 * WHY THIS EXISTS
 * ---------------
 * A passing suite proves the check behaves on the cases it was given; it does not prove the suite
 * would NOTICE if the check regressed. This breaks the check on purpose — and the shared lexer with
 * it — and watches the suite go red, in the case that mutation was aimed at.
 *
 * ⚠️  IT MUTATES COMMITTED SOURCE — but only its own inputs, and only for the length of one run.
 * The checker and the shared lexer `lib/strip-code.mjs` are each copied to `<file>.orig`, the
 * mutations are applied, the suite is run, and every original is restored and compared
 * byte-for-byte before the script exits. It refuses to report success unless every restore is exact.
 * Do not run it with a mutated file open in an editor that autosaves.
 *
 * USAGE
 * -----
 *   node scripts/verify-two-reads-mutations.mjs
 *
 * Exits 0 only if EVERY mutation is proven — the suite failed, AND it failed the case that mutation
 * was aimed at. A mutation the suite survives is reported NOT PROVEN and is a real gap.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, 'check-two-reads.mjs')
const STRIP_LIB = path.resolve(HERE, 'lib', 'strip-code.mjs')
const TEST = path.resolve(HERE, '__tests__', 'check-two-reads.test.mjs')

/**
 * Each mutation is `{ find, replace }` applied to its `target` file (default: the checker).
 * `expects` names the test case that must fail — a mutation the suite catches in the WRONG case is
 * not proof of that case.
 */
const MUTATIONS = [
  {
    name: 'a write counts as a read',
    expects: 'does NOT count a WRITE as a read',
    find: '  if (/^=(?!=)/.test(after)) return true',
    replace: '  if (false) return true',
  },
  {
    name: 'a single read is reported (the >=2 guard is dropped)',
    expects: 'does NOT report a setting read once',
    find: '    if (readLines.length < 2) continue',
    replace: '    if (readLines.length < 1) continue',
  },
  {
    name: 'test files are no longer skipped',
    expects: 'excludes test files by default and includes them with --include-tests',
    find: '    if (!includeTests && isTestPath(file)) {',
    replace: '    if (false && isTestPath(file)) {',
  },
  {
    name: '--fail no longer fails',
    expects: '--fail exits 1 on a finding; the census exits 0',
    find: '  return options.fail && result.findings > 0 ? 1 : 0',
    replace: '  return 0',
  },
  {
    name: 'the lexer stops stripping strings (a documented setting reads as a read)',
    target: STRIP_LIB,
    expects: 'ignores a read inside a string or a comment (the lexer)',
    find: "    if (c === '\"' || c === \"'\") {",
    replace: '    if (false) {',
  },
]

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
