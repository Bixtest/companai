import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Every mutation breaks MASTER-CHECKLIST.md on purpose, and the checker must go red.
 *
 * ★ THE GUARD THAT FOUND ITSELF (2026-10-17, night): three of these came back GREEN — not because
 * the checker was blind, but because their `apply` targets had gone stale (they still aimed at
 * "54 open" and "13 startable" after the document moved to 56 and 15). `String.replace` on a
 * missing target is a silent no-op, so the file went in unchanged, the checker passed, and the
 * suite reported three proofs that never happened. **A proof that cannot fail is worse than no
 * proof** — the same finding as `CC-101`, one layer down, in the instrument instead of the thing it
 * measures. So a mutation whose `apply` leaves the file unchanged is now itself a failure.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(HERE, '..', '..', 'library', 'development', 'MASTER-CHECKLIST.md')
const orig = fs.readFileSync(FILE, 'utf8')

const mutations = [
  {
    name: 'M1 — flip one §3 checklist status, §1 keeps the old tally',
    apply: (s) => s.replace('| 30 | 8 | ', '| 30 | 8 | ', 1).replace(/(\| 45 \| 11 \|[^\n]*?)\u2610 /, '$1\u2705 '),
    expect: /headline says \d+ open|headline says \d+ done|partial/,
  },
  {
    name: 'M2 — delete one §4 open-work row',
    apply: (s) => s.replace(/^\| `CC-111` \|[^\n]*\n/m, ''),
    expect: /§4 is missing 1 open register row/,
  },
  {
    name: 'M3 — change §5\'s count line',
    // anchored on §5's own sentence, not the bare number: §2 prints the same total, and a
    // first-occurrence replace would hit the copy this checker does not read
    apply: (s) => s.replace('the numbering skips it. **60 closed \u00b7 56 open \u00b7 116 total.**',
                            'the numbering skips it. **59 closed \u00b7 55 open \u00b7 113 total.**'),
    expect: /§5 says 59\/55\/113/,
  },
  {
    // ★ this mutation is why M3 above needed an anchor. The first version of check 5 ran its regex
    // over the whole document, so it read the FIRST "N closed · N open · N total" it found — §2's
    // headline — and never read §5's copy. Breaking §5's line went unseen; breaking §2's did not.
    name: 'M14 — change §2\'s headline count, which the first version of check 5 read instead of §5',
    apply: (s) => s.replace('**60 closed \u00b7 56 open \u00b7 116 total**, counted from \u00a75.',
                            '**59 closed \u00b7 55 open \u00b7 113 total**, counted from \u00a75.'),
    expect: /§2 says 59\/55\/113/,
  },
  {
    name: 'M4 — invent a CC code that has no register row',
    apply: (s) => s.replace('## 2. \u25b6 The frontier', 'A dangling reference: `CC-999`.\n\n## 2. \u25b6 The frontier'),
    expect: /CC-999/,
  },
  {
    name: 'M5 — change §4\'s own count line',
    apply: (s) => s.replace('all **56** open', 'all **52** open'),
    expect: /§4 says 52 open rows/,
  },
  {
    name: 'M6 — change §4\'s state tally (15 startable → 12)',
    apply: (s) => s.replace('**15 startable now**', '**12 startable now**'),
    expect: /state tally says 12 "startable now"/,
  },
  {
    name: 'M7 — change §8\'s id count for one family (G-* 21 → 22)',
    apply: (s) => s.replace('| `G-*` | the governance & security floor | `platform_points.md` §G | 21 |',
                            '| `G-*` | the governance & security floor | `platform_points.md` §G | 22 |'),
    expect: /§8 says 22 G-\* ids/,
  },
  {
    name: 'M8 — change §8\'s measured "now" coverage headline (80 → 79)',
    apply: (s) => s.replace('the unaddressed count is **80**', 'the unaddressed count is **79**'),
    expect: /says 79 ids unaddressed; measured 80/,
  },
  {
    name: 'M9 — change §8\'s benchmark "before" number (157 → 156)',
    apply: (s) => s.replace('**157 ids across 12 families had no address here at all**',
                            '**156 ids across 12 families had no address here at all**'),
    expect: /were unaddressed at 3970769; measured 157/,
  },
  {
    name: 'M10 — invent an id in a declared family that its home does not hold (NY-99)',
    apply: (s) => s.replace('## 2. \u25b6 The frontier', 'A phantom id: `NY-99`.\n\n## 2. \u25b6 The frontier'),
    expect: /NY-99 \(not in NEEDS-YOU\.md\)/,
  },
  {
    name: 'M11 — rename one §3 row to another row\'s label (20b -> 21), creating a duplicate',
    apply: (s) => s.replace('| 20b | 5 | An AI user can run only the agents bound to it',
                            '| 21 | 5 | An AI user can run only the agents bound to it'),
    expect: /duplicate row label: 21/,
  },
  {
    name: 'M12 — un-escape one code pipe in a register row, breaking that table\'s shape',
    apply: (s) => s.replace('\'human\' \\| \'ai_worker\' \\| \'service\'', '\'human\' | \'ai_worker\' | \'service\''),
    expect: /live pipes/,
  },
  {
    name: 'M13 — over-escape a code pipe (\\| -> \\\\|), which the first version of the check could not see',
    apply: (s) => s.replace('\'human\' \\| \'ai_worker\'', '\'human\' \\\\| \'ai_worker\''),
    expect: /live pipes/,
  },
]

let allRed = true
for (const m of mutations) {
  const mutated = m.apply(orig)
  if (mutated === orig) {
    // the target text is gone: the mutation is a no-op and any green it prints is a lie
    allRed = false
    console.log('GREEN ' + m.name + '  (DID NOT APPLY — its target text is no longer in the document;')
    console.log('       a mutation that cannot fire is not a proof, so this suite cannot pass until')
    console.log('       its target is re-aimed at the current text)')
    continue
  }
  fs.writeFileSync(FILE, mutated)
  let out = ''
  let code = 0
  try {
    out = execFileSync(process.execPath, [path.join(HERE, '..', 'check-master-checklist.mjs')], { encoding: 'utf8' })
    code = 0
  } catch (e) {
    out = String(e.stdout || '') + String(e.stderr || '')
    code = e.status
  }
  const matched = m.expect.test(out)
  const red = code === 1 && matched
  if (!red) allRed = false
  console.log((red ? 'RED   ' : 'GREEN ') + m.name + '  (exit ' + code + ')')
  if (!red) console.log('       expected output matching ' + m.expect + ' — got:\n' + out.split('\n').filter(Boolean).map((l) => '       ' + l).join('\n'))
}

fs.writeFileSync(FILE, orig)
const restored = fs.readFileSync(FILE, 'utf8') === orig
console.log('')
console.log(restored ? 'file restored byte-identical' : 'ERROR: FILE NOT RESTORED')
let green = ''
try { green = execFileSync(process.execPath, [path.join(HERE, '..', 'check-master-checklist.mjs')], { encoding: 'utf8' }); } catch (e) { green = String(e.stdout) }
console.log(green.includes('PASS') ? 'unmutated run: PASS' : 'unmutated run: ' + green.slice(0, 200))
process.exit(allRed && restored ? 0 : 1)
