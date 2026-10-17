#!/usr/bin/env node
/**
 * derive-counts.mjs — re-derive THE ONE NUMBER from platform_points.md's appendix boxes.
 *
 * The rule, in one place (as written in platform_points.md §"How the numbers are derived"):
 *   1. Walk each section A–K (section L is the verification ledger — it holds no points).
 *   2. A line starting "- " is a WHOLE POINT — count once as a unit.
 *   3. A line starting "- " WITH a "▸ n/N" is a SPLIT PARENT — a unit, but its ticks live on its
 *      children, so it is NEVER counted as done.
 *   4. A line starting "-   - " is a SUB-POINT — count once as a unit.
 *   5. units = whole + split parents + sub-points; done = whole points + sub-points carrying ☑.
 *   6. coverage % = done ÷ units.
 *
 * A line that carries no box glyph (☑ ☐ ⬜ 🟡 ✅) is prose, a quote or a note — not a unit. That one
 * rule is what stopped the earlier over-count: "# was PART" notes and indented commentary all start
 * with "- " and none of them is a point.
 *
 * Run: node scripts/derive-counts.mjs [--path <platform_points.md>]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
let pp = path.join(HERE, '..', 'library', 'development', 'platform_points.md')
const i = process.argv.indexOf('--path')
if (i > 0) pp = path.resolve(process.argv[i + 1])

const BOX = /[\u2611\u2610\u2b1c\ud83d\udfe1\u2705]/
const lines = fs.readFileSync(pp, 'utf8').split('\n')
const start = lines.findIndex((l) => /^## A\. /.test(l))
const end = lines.findIndex((l) => /^## L\. /.test(l))
if (start < 0 || end < 0) {
  console.error('FAIL — sections A..L not found in ' + pp)
  process.exit(1)
}

const secs = {}
let cur = null
for (let k = start; k < end; k++) {
  const h = /^## ([A-K])\. /.exec(lines[k])
  if (h) { cur = h[1]; secs[cur] = { whole: 0, split: 0, sub: 0, done: 0 }; continue }
  if (!cur) continue
  const l = lines[k]
  if (!BOX.test(l)) continue
  if (/^- {3}- /.test(l)) {
    secs[cur].sub++
    if (/\u2611/.test(l)) secs[cur].done++
  } else if (/^- /.test(l)) {
    if (/\u25b8\s*\d+\/\d+/.test(l)) secs[cur].split++
    else { secs[cur].whole++; if (/\u2611/.test(l)) secs[cur].done++ }
  }
}

let units = 0, done = 0
console.log('section  done/units  (whole · split parents · sub-points)')
for (const k of Object.keys(secs).sort()) {
  const s = secs[k]
  const u = s.whole + s.split + s.sub
  units += u; done += s.done
  console.log('  ' + k + '     ' + String(s.done).padStart(3) + '/' + String(u).padEnd(4) +
    '   (' + s.whole + ' \u00b7 ' + s.split + ' \u00b7 ' + s.sub + ')')
}
const pct = ((done / units) * 100).toFixed(1)
console.log('')
console.log('TOTAL ' + done + ' / ' + units + ' units = ' + pct + '%')

// --- compare against what the documents actually claim ---
const CLAIMED = { done: 78, units: 321 }
let bad = 0
if (done !== CLAIMED.done) { console.log('DRIFT: documents claim ' + CLAIMED.done + ' done; measured ' + done); bad++ }
if (units !== CLAIMED.units) { console.log('DRIFT: documents claim ' + CLAIMED.units + ' units; measured ' + units); bad++ }
if (bad) { process.exit(1) }
console.log('MATCHES the claimed ' + CLAIMED.done + '/' + CLAIMED.units + ' (' + ((CLAIMED.done / CLAIMED.units) * 100).toFixed(1) + '%)')
