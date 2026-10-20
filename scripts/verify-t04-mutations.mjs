#!/usr/bin/env node
/**
 * `T-04` mutation proof.
 *
 * Five mutations, each one a way the fix can be undone, each restored byte-identically afterwards.
 * A mutation whose test stays green is a defect in the test, not in the rule (`LESSONS.md` L23) —
 * so every mutation names the test that must go red, and a mutation that reddens a DIFFERENT test
 * is reported as collateral, not as proof.
 *
 * The fifth exists because the fix has a boundary: a gate that refuses everything would pass the
 * three refusals and break the one query this module exists to run. M4 asserts the boundary from
 * the refusing side, M5 from the wrong-field side (the original defect's exact shape: the gate
 * reads `operationType`, never the IR's `operation`).
 *
 * Run from the repo root:
 *   ../.toolchain/node24/node.exe scripts/verify-t04-mutations.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = join(here, '..')
const node = process.execPath
const jest = join(root, 'node_modules', 'jest', 'bin', 'jest.js')

const COMPILE = 'packages/shared/src/lib/business-ir/compile.ts'
const RUN = 'packages/shared/src/lib/user-function/run.ts'
const VERIFY = 'packages/shared/src/lib/user-function/verify.ts'
const SUITE = 'src/lib/user-function/__tests__/t04-count-returns-rows.test.ts'

const GATE = `  if (fn.businessIr.operation && fn.businessIr.operation !== 'list') {`

const mutations = [
  {
    name: 'the row-oriented refusal is a gap again (the original defect)',
    file: COMPILE,
    from: `    err(
      'plan_physical',
      'ROW_ORIENTED_TARGET',`,
    to: `    gap(
      'plan_physical',
      'ROW_ORIENTED_TARGET',`,
    expect: ['the compiler refuses the IR'],
  },
  {
    name: 'the runner gate is deleted',
    file: RUN,
    from: GATE,
    to: `  if (false) {`,
    expect: ['the runner refuses it and never calls the engine'],
  },
  {
    name: 'the verify message claims "without error" again, gaps unnamed',
    file: VERIFY,
    from: `          const gaps = compiled.diagnostics.filter((d) => d.severity === 'gap')
          const suffix =
            gaps.length > 0
              ? \` The plan is executable, but \${gaps.map((d) => d.message).join(' ')}\`
              : ''
          record(name, 'passed', \`The compiler resolved this check against the model without error.\${suffix}\`)`,
    to: `          record(name, 'passed', 'The compiler resolved this against the model without error.')`,
    expect: ['the honest message'],
  },
  {
    name: 'the gate refuses every IR, including the list it exists to run',
    file: RUN,
    from: GATE,
    to: `  if (fn.businessIr.operation) {`,
    expect: ['a list IR still runs'],
  },
  {
    name: 'the gate reads the wrong field — operationType, never the IR operation',
    file: RUN,
    from: GATE,
    to: `  if (fn.operationType !== 'query') {`,
    expect: ['the runner refuses it and never calls the engine'],
  },
]

function runGuard() {
  const result = spawnSync(node, [jest, '--config', 'jest.config.cjs', '--forceExit', SUITE], {
    cwd: join(root, 'packages', 'shared'),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  // Jest prints a failure as `● <describe path> › <test name>`; the `✕` list only appears in
  // verbose mode, so parsing only that would report "nothing failed" for every mutation.
  const bullets = [...output.matchAll(/^\s+●\s+(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((line) => line.includes('›'))
    .map((line) => line.split('›').pop().trim())
  const crosses = [...output.matchAll(/✕\s+(.+?)(?:\s+\(\d+\s*ms\))?$/gm)].map((m) => m[1].trim())
  const failed = [...new Set([...bullets, ...crosses])]
  // The denominator is asserted, not assumed (`LESSONS.md` L21): a suite that ran zero tests
  // would "fail" nothing and every mutation would look PROVEN.
  const totals = [...output.matchAll(/^Tests:\s+(.+)$/gm)].map((m) => m[1].trim())
  const last = totals.length ? totals[totals.length - 1] : ''
  const ran = Number(/(\d+)\s+total/.exec(last)?.[1] ?? '0')
  return { failed, ran, output }
}

let proven = 0
const results = []

for (const mutation of mutations) {
  const path = join(root, mutation.file)
  const original = readFileSync(path)
  const text = original.toString('utf8')

  if (!text.includes(mutation.from)) {
    results.push({ name: mutation.name, state: 'NOT APPLIED — anchor not found' })
    continue
  }

  writeFileSync(path, text.replace(mutation.from, mutation.to), { encoding: 'utf8' })

  let run
  try {
    run = runGuard()
  } finally {
    writeFileSync(path, original)
  }

  const restored = readFileSync(path).equals(original)
  const missed = mutation.expect.filter((expected) => !run.failed.some((name) => name.includes(expected)))

  let state
  if (!restored) state = 'NOT RESTORED'
  else if (run.ran === 0) state = 'NOT PROVEN — the suite ran 0 tests'
  else if (missed.length === 0) {
    const unexpected = run.failed.filter((name) => !mutation.expect.some((expected) => name.includes(expected)))
    state = unexpected.length ? `PROVEN, and it also broke: ${unexpected.join(' · ')}` : 'PROVEN'
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
