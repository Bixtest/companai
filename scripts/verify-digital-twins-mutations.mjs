#!/usr/bin/env node
/**
 * Mutation proof for `check-digital-twins.mjs` (SR-38).
 *
 * WHY THIS EXISTS
 * ---------------
 * A passing suite proves the check behaves on the cases it was given; it does not prove the suite
 * would NOTICE if the check regressed. This breaks the check on purpose and watches the suite go
 * red, in the case that mutation was aimed at.
 *
 * ⚠️  IT MUTATES COMMITTED SOURCE — but only its own input, and only for the length of one run. The
 * checker is copied to `<file>.orig`, each mutation is applied, the suite is run, and the original is
 * restored and compared byte-for-byte before the script exits. It refuses to report success unless
 * the restore is exact. Do not run it with the checker open in an editor that autosaves.
 *
 * USAGE
 * -----
 *   node scripts/verify-digital-twins-mutations.mjs
 *
 * Exits 0 only if EVERY mutation is proven — the suite failed, AND it failed the case that mutation
 * was aimed at. A mutation the suite survives is reported NOT PROVEN and is a real gap.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, 'check-digital-twins.mjs')
const TEST = path.resolve(HERE, '__tests__', 'check-digital-twins.test.mjs')

/**
 * Each mutation is `{ find, replace }` applied to the checker. `expects` names the test case that
 * must fail — a mutation the suite catches in the WRONG case is not proof of that case.
 */
const MUTATIONS = [
  {
    name: 'a missing fixture is no longer diagnosed',
    expects: 'fails a missing fixture',
    find: '  if (!existsSync(fixturePath)) {',
    replace: '  if (false) {',
  },
  {
    name: 'any file counts as importing the real type',
    expects: 'fails a twin that does not import the real type from its owning module',
    find: '  return pattern.test(text)',
    replace: '  return true',
  },
  {
    name: 'a twin need not declare the symbol',
    expects: 'fails a twin that does not declare the symbol',
    find: '  if (!declaresSymbol(text, twin.symbol)) {',
    replace: '  if (false) {',
  },
  {
    name: 'a twin need not carry its satisfies clause',
    expects: 'fails a twin whose satisfies clause is dropped',
    find: '  if (!carriesSatisfies(text, twin.satisfies)) {',
    replace: '  if (false) {',
  },
  {
    name: 'a fixture outside a typechecked location is accepted',
    expects: 'accepts a package src path and rejects excluded or non-src paths',
    find: '  return { ok: underSrc && !excluded, underSrc, excluded }',
    replace: '  return { ok: true, underSrc, excluded }',
  },
  {
    name: 'a fixture may name a semantic test that does not exist',
    expects: 'fails when the fixture names a semantic test that is not there',
    find: '  if (twin.semanticTest && !existsSync(path.resolve(root, twin.semanticTest))) {',
    replace: '  if (false) {',
  },
  {
    name: '--fail no longer fails',
    expects: '--fail exits 1 on an unwired twin; the census exits 0',
    find: '  return options.fail && result.failed > 0 ? 1 : 0',
    replace: '  return 0',
  },
]

const original = readFileSync(CHECKER, 'utf8')
const backup = `${CHECKER}.orig`
copyFileSync(CHECKER, backup)

let allProven = true
try {
  for (const mutation of MUTATIONS) {
    if (!original.includes(mutation.find)) {
      console.log(`SKIP        ${mutation.name} — anchor not found; the checker's code moved`)
      allProven = false
      continue
    }
    const mutated = original.replace(mutation.find, mutation.replace)
    if (mutated === original) {
      console.log(`SKIP        ${mutation.name} — the replacement was a no-op`)
      allProven = false
      continue
    }
    writeFileSync(CHECKER, mutated)

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
  copyFileSync(backup, CHECKER)
  try {
    unlinkSync(backup)
  } catch {
    /* already gone */
  }
}

if (readFileSync(CHECKER, 'utf8') !== original) {
  console.log('\nRESTORE FAILED — check-digital-twins.mjs is NOT byte-identical to before this run.')
  process.exitCode = 1
} else {
  console.log('\nChecker restored — byte-identical to before this run.')
}

console.log(
  allProven
    ? 'All mutations proven: every precision case in the suite has teeth.'
    : 'SOME MUTATIONS NOT PROVEN — the suite has a gap. Read the NOT PROVEN lines above.',
)
if (!allProven) process.exitCode = 1
