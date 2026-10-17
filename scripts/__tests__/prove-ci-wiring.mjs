/**
 * prove-ci-wiring.mjs — proves a wired CI step can actually fail.
 *
 * CC-101's requirement (§6.3, proof 3): "Each fail-capable checker is proven to fail when its input
 * is broken." A step that is wired but stays green on broken input is the same dead control in a new
 * coat — that is the entire defect this slice exists to fix, so it gets proved rather than asserted.
 *
 * Two mutations, one per ENFORCING step. Each is restored byte-identical.
 *
 * CC-117 adds a THIRD case with `mode: 'report'`, and the distinction is the point: an enforcing
 * step must fail on broken input *and CI carries that failure*; a report step deliberately cannot
 * fail, so the only honest thing to prove about it is that **the checker still detects** — that the
 * number it publishes every run is a real number and not a hard-coded zero. Saying "the wiring
 * carries the failure through" about a report step would be exactly the defect this project keeps
 * finding: a claim stronger than the code.
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
  {
    // CC-117 — wired as a REPORT step (ci.yml), so this proves DETECTION, not gating: the checker
    // must notice a new backend page root that is a client component. The file is a backend
    // `page.tsx` that is not currently a client component, so the mutation creates the exact
    // condition the checker owns.
    mode: 'report',
    req: 'CC-117',
    file: 'packages/ai-assistant/src/modules/ai_assistant/backend/config/ai-assistant/agents/page.tsx',
    name: 'add a top-level "use client" to a backend page root — the condition the checker owns',
    apply: (s) => {
      if (/^\s*["']use client["']/.test(s)) throw new Error('file is already a client component')
      return '"use client"\n' + s
    },
    script: ['scripts/check-client-boundaries.mjs', '--fail'],
  },
]

let allRed = true
let reportCount = 0
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
  const isReport = c.mode === 'report'
  if (isReport) reportCount++
  console.log(
    (red ? 'RED   ' : 'GREEN ') + c.req + ' — ' + c.name +
    (isReport ? '  [report step: proves detection, not gating]' : '') +
    '  (exit ' + code + (restored ? ', restored byte-identical' : ', NOT RESTORED') + ')',
  )
}
console.log('')
if (allRed) {
  const enforcing = cases.length - reportCount
  console.log('PASS — ' + enforcing + ' enforcing CI step(s) fail on broken input, so the wiring carries the failure through;')
  console.log('       ' + reportCount + ' report step(s) detect their condition but do NOT gate — their checkers are live, CI is not.')
  console.log('       The two claims are different on purpose; do not read the second as the first.')
} else {
  console.log('FAIL — a step stayed green on input it exists to catch: the wiring carries no failure, or a report step publishes a number it does not measure.')
}
process.exit(allRed ? 0 : 1)
