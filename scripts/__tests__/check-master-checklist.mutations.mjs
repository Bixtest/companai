import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
    apply: (s) => s.replace('56 closed \u00b7 54 open \u00b7 110 total', '57 closed \u00b7 54 open \u00b7 111 total'),
    expect: /§5 says 57\/54\/111/,
  },
  {
    name: 'M4 — invent a CC code that has no register row',
    apply: (s) => s.replace('## 2. \u25b6 The frontier', 'A dangling reference: `CC-999`.\n\n## 2. \u25b6 The frontier'),
    expect: /CC-999/,
  },
  {
    name: 'M5 — change §4\'s own count line',
    apply: (s) => s.replace('all **54** open', 'all **52** open'),
    expect: /§4 says 52 open rows/,
  },
]

let allRed = true
for (const m of mutations) {
  fs.writeFileSync(FILE, m.apply(orig))
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
