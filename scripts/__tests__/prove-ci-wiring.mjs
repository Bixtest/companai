/**
 * prove-ci-wiring.mjs — proves a wired CI step can actually fail.
 *
 * CC-101's requirement (§6.3, proof 3): "Each fail-capable checker is proven to fail when its input
 * is broken." A step that is wired but stays green on broken input is the same dead control in a new
 * coat — that is the entire defect this slice exists to fix, so it gets proved rather than asserted.
 *
 * Two mutations, one per ENFORCING step. Each is restored byte-identical.
 *
 * WHAT THE FIRST DRAFT GOT WRONG, and why proof earned its keep: the first SR-38 mutation flipped a
 * twin's VALUE (`locked: 'A0'` -> `'A1'`) and the checker stayed GREEN. That is not a bug — the
 * checker regexes for a `satisfies` clause (check-digital-twins.mjs:96) and never looks at values;
 * values are pinned by the jest suite (CC-108 records exactly this split). The mutation was testing
 * the wrong half of the mechanism. The mutation below removes the `satisfies`, which IS the half the
 * checker owns.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const run = (script) => {
  try {
    execFileSync(process.execPath, script, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' })
    return 0
  } catch (e) { return e.status }
}

const cases = [
  {
    req: 'SR-38',
    file: 'packages/core/src/testing/digital-twin/authority.ts',
    name: 'drop a twin\'s `satisfies` clause — the half the checker owns',
    apply: (s) => {
      const before = s
      const after = s.replace(
        /} satisfies Record<RecordLockState, AutonomyGate \| null>/,
        '} // satisfies removed by the wiring proof',
      )
      if (after === before) throw new Error('the satisfies clause to remove was not found')
      return after
    },
    script: ['scripts/check-digital-twins.mjs', '--fail'],
  },
  {
    req: 'SR-39',
    file: 'docker/hermes/verify_pin.py',
    name: 'flip one hex digit of the pinned digest in one of its copies',
    apply: (s) => {
      const m = /DEFAULT_EXPECTED_DIGEST\s*=\s*"([0-9a-f]{32})"/.exec(s)
      if (!m) throw new Error('DEFAULT_EXPECTED_DIGEST not found')
      const d = m[1]
      const flip = d[0] === '0' ? '1' : '0'
      return s.replace(d, flip + d.slice(1))
    },
    script: ['scripts/check-one-truth.mjs'],
  },
]

let allRed = true
for (const c of cases) {
  const p = path.join(ROOT, c.file)
  const orig = fs.readFileSync(p, 'utf8')
  let mutated
  try { mutated = c.apply(orig) } catch (e) { console.log('SKIP  ' + c.req + ' — ' + e.message); continue }
  fs.writeFileSync(p, mutated)
  const code = run(c.script)
  fs.writeFileSync(p, orig)
  const restored = fs.readFileSync(p, 'utf8') === orig
  const red = code === 1 && restored
  if (!red) allRed = false
  console.log((red ? 'RED   ' : 'GREEN ') + c.req + ' — ' + c.name + '  (exit ' + code + (restored ? ', restored byte-identical' : ', NOT RESTORED') + ')')
}
console.log('')
console.log(allRed
  ? 'PASS — every enforcing CI step fails on broken input; the wiring carries the failure through.'
  : 'FAIL — an enforcing step stayed green on broken input; the wiring carries no failure.')
process.exit(allRed ? 0 : 1)
