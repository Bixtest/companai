#!/usr/bin/env node
/**
 * check-master-checklist.mjs — proves MASTER-CHECKLIST.md is still true.
 *
 * Every number in the file is typed by a human, so every number is a claim. This script reads the
 * file's own tables and fails loudly when a typed count disagrees with the rows that carry it.
 *
 * HONEST STATE (2026-10-17, night): this checker is BUILT BUT NOT ENFORCED — and `CC-101`, which
 * wired the *code* repo's drift checkers, could not wire this one, because this file lives in the
 * **docs** repository and the code repo's `ci.yml` cannot reach it. The honest wiring work is now
 * `CC-113`: a small workflow in the docs repo, on push and PR, in a mode where it can fail. Until
 * then it is run by hand:
 *
 *     node scripts/check-master-checklist.mjs      # from the docs repo root
 *
 * Exit 0 = every measured claim in the file matches its tables. Exit 1 = the file is lying.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEV = path.join(HERE, '..', 'library', 'development')
const FILE = path.join(DEV, 'MASTER-CHECKLIST.md')

const GLYPH = { done: '\u2705', partial: '\uD83D\uDFE1', open: '\u2610', absent: '\u26D4' }
const fails = []
const ok = (m) => console.log('  \u2713 ' + m)
const fail = (m) => { fails.push(m); console.log('  \u2717 ' + m) }

const md = fs.readFileSync(FILE, 'utf8')
const lines = md.split('\n')

const section = (n) => {
  const i = lines.findIndex((l) => l.startsWith('## ' + n + '.'))
  if (i < 0) { fail('\u00a7' + n + ' is missing entirely'); return [] }
  let j = i + 1
  while (j < lines.length && !lines[j].startsWith('## ')) j++
  return lines.slice(i, j)
}
const tables = (sec) => sec.filter((l) => l.startsWith('| '))
const cells = (l) => l.split('|').slice(1, -1).map((c) => c.trim())

// ---------------------------------------------------------------- §3 checklist
const sec3 = section('3')
const rows3 = []
for (const l of tables(sec3)) {
  const m = /^\| (\d+b?) \| (\d+) \| (.*?) \| ([^|]+?) \|(.*)\|\s*$/.exec(l)
  if (m) rows3.push({ id: m[1], phase: +m[2], glyph: m[4].trim() })
}
const hist = {}
for (const r of rows3) {
  const s = Object.keys(GLYPH).find((k) => GLYPH[k] === r.glyph.replace(/\*\*/g, '').trim()) || 'UNKNOWN:' + r.glyph
  hist[s] = (hist[s] || 0) + 1
}
const phases = new Set(rows3.map((r) => r.phase))

// §3 must be in build order: the phase column monotonic, the row label agreeing with it
let prevPhase = -1
let inversions = []
for (const r of rows3) {
  if (r.phase < prevPhase) inversions.push(r.id + ' (phase ' + r.phase + ' after phase ' + prevPhase + ')')
  prevPhase = r.phase
}
const labels = rows3.map((r) => r.id)
const sorted = [...labels].sort((a, b) => {
  const na = /^(\d+)(b?)$/.exec(a), nb = /^(\d+)(b?)$/.exec(b)
  return (+na[1] - +nb[1]) || (na[2].length - nb[2].length)
})
const labelOrder = labels.join(',')
const sortedOrder = sorted.join(',')

// ---------------------------------------------------------------- §5 register
const sec5 = section('5')
const reg = []
for (const l of tables(sec5)) {
  const m = /^\| (CC-\d+) \| (.*?) \| ([^|]+?) \|\s*$/.exec(l)
  // The state word may carry prose after it — `✅ closed — **BUILT …**` is how a closed row records
  // its own proof. Read the word after the glyph, not the whole cell: stripping non-letters from
  // that cell yields `closedBUILT…`, which equals neither state, so the row silently counted as
  // neither closed nor open and the totals came up one short. Found 2026-10-17 by this very run.
  if (m) {
    const w = /^\s*(?:\u2705|\u2610|\uD83D\uDFE1|\u26D4)\s*\*{0,2}(closed|open)/.exec(m[3])
    reg.push({ id: m[1], state: w ? w[1] : m[3].replace(/[^a-z]/g, '') })
  }
}
const closed = reg.filter((r) => r.state === 'closed').length
const openReg = reg.filter((r) => r.state === 'open').length
// codes the register deliberately does not hold — CC-75 was never assigned, the numbering skips it
const SKIPPED = new Set(['CC-75'])

// ---------------------------------------------------------------- §4 open work
const sec4 = section('4')
const rows4 = []
for (const l of tables(sec4)) {
  const m = /^\| `(CC-\d+)` \| ([^|]*?) \| (.*?) \| (.*?) \| ([^|]+?) \|\s*$/.exec(l)
  if (m) rows4.push({ id: m[1], state: m[5].replace(/\*\*/g, '').trim() })
}
const ids4 = new Set(rows4.map((r) => r.id))
const STATE = {
  startable: 'startable now',
  db: 'startable, needs a live DB',
  you: 'needs you',
  blocked: 'blocked on its trigger',
}
const tally = {}
for (const r of rows4) tally[r.state] = (tally[r.state] || 0) + 1

// ---------------------------------------------------------------- §7 SR requirements
const sec7 = section('7')
const srRows = tables(sec7).filter((l) => /^\| SR-/.test(l)).length

// ---------------------------------------------------------------- §8 vocabularies
const sec8 = section('8')
const fams = []
for (const l of tables(sec8)) {
  const c = cells(l)
  if (c.length >= 5 && /^`[A-Z]/.test(c[0]) && /^\d+$/.test(c[3])) {
    fams.push({ fam: c[0].replace(/`/g, ''), home: c[2].replace(/`/g, ''), claimed: +c[3], carried: c[4] })
  }
}
// a family's id pattern, derived from the label the table declares. The lookbehind keeps a filename
// like `AUDIT-2026-10-17-…` from reading as a `T-2026` id.
const famRe = (f) => (f.startsWith('GAP')
  ? /GAP [A-Z]/g
  : new RegExp('(?<![A-Za-z])' + f.replace(/\*+$/, '') + '\\d+', 'g'))
// `T-04` and `T-4` are the same id written two ways — normalise before counting or comparing
const norm = (id) => id.replace(/(\d+)$/, (d) => String(+d).padStart(2, '0'))
const idsIn = (text, f) => {
  const m = text.match(famRe(f))
  return m ? [...new Set(m.map(norm))].sort() : []
}
const homeText = (home) => {
  if (/this file/.test(home)) return null // this file's own table — handled by its own row count
  // a home may name several files, separated by a middle dot: `platform_points.md §K · BACKLOG.md`
  const parts = home.split('\u00b7').map((h) => h.replace(/\*/g, '').replace(/\s*\u00a7[A-Z].*$/, '').trim()).filter(Boolean)
  if (!parts.length) return undefined
  const texts = []
  for (const p of parts) {
    const full = path.join(DEV, p)
    if (!fs.existsSync(full)) return undefined
    texts.push(fs.readFileSync(full, 'utf8'))
  }
  return texts.join('\n')
}

// ---------------------------------------------------------------- §1 headline
const sec1 = section('1')
const head = sec1.find((l) => /checklist rows across/.test(l)) || ''
const mh = /\*\*(\d+) checklist rows across (\d+) phases\.?\*\* (\d+) done \u00b7 (\d+) partial \u00b7 (\d+) open \u00b7 (\d+) absent/.exec(head.replace(/\u2014/g, '-'))

console.log('MASTER-CHECKLIST.md \u2014 ' + rows3.length + ' checklist rows \u00b7 ' + reg.length + ' register rows \u00b7 ' + rows4.length + ' open-work rows \u00b7 ' + srRows + ' SR rows \u00b7 ' + fams.length + ' vocabularies')

// 1 — the §1 headline against the §3 table
if (!mh) {
  fail('\u00a71: the headline line does not match the expected shape \u2014 cannot verify it')
} else {
  const [, n, p, d, pa, o, a] = mh.map(Number)
  if (+n !== rows3.length) fail('\u00a71 headline says ' + n + ' checklist rows; \u00a73 holds ' + rows3.length)
  else ok('\u00a71 row total ' + n + ' = \u00a73')
  if (+p !== phases.size) fail('\u00a71 headline says ' + p + ' phases; \u00a73 spans ' + phases.size)
  else ok('\u00a71 phase count ' + p + ' = \u00a73')
  for (const [label, claimed] of [['done', d], ['partial', pa], ['open', o], ['absent', a]]) {
    if (claimed !== (hist[label] || 0)) fail('\u00a71 headline says ' + claimed + ' ' + label + '; \u00a73 holds ' + (hist[label] || 0))
    else ok('\u00a71 ' + label + ' ' + claimed + ' = \u00a73')
  }
}

// 1b — §3 is in build order and its labels agree with it
if (inversions.length) fail('\u00a73 phase order inverted at row(s): ' + inversions.join(', '))
else ok('\u00a73 phase column is monotonic \u2014 every row sits at or above the previous phase')
if (labelOrder !== sortedOrder) fail('\u00a73 row labels are out of order: printed ' + labelOrder.slice(0, 60) + '\u2026')
else ok('\u00a73 row labels are in ascending order (' + rows3.length + ' rows)')
// a duplicate label is invisible to a sort comparison (sorting [.. 21, 21 ..] changes nothing), so it
// needs its own check. Found by the mutation proof: M11 renamed 20b -> 21 and every count stayed green.
const dupLabels = labels.filter((l, i) => labels.indexOf(l) !== i)
if (dupLabels.length) fail('\u00a73 has a duplicate row label: ' + [...new Set(dupLabels)].join(', '))
else ok('\u00a73 row labels are unique (' + rows3.length + ' distinct)')
const dupReg = reg.map((r) => r.id).filter((id, i, a) => a.indexOf(id) !== i)
if (dupReg.length) fail('\u00a75 has a duplicate register row: ' + [...new Set(dupReg)].join(', '))
const dupOpen = rows4.map((r) => r.id).filter((id, i, a) => a.indexOf(id) !== i)
if (dupOpen.length) fail('\u00a74 has a duplicate open-work row: ' + [...new Set(dupOpen)].join(', '))

// 2 — every open register row has an open-work line, and vice versa
const regOpenIds = reg.filter((r) => r.state === 'open').map((r) => r.id)
const regClosedIds = reg.filter((r) => r.state === 'closed').map((r) => r.id)
const missingIn4 = regOpenIds.filter((id) => !ids4.has(id))
const staleIn4 = regOpenIds.length ? [...ids4].filter((id) => regClosedIds.includes(id)) : []
if (missingIn4.length) fail('\u00a74 is missing ' + missingIn4.length + ' open register row(s): ' + missingIn4.join(', '))
else ok('\u00a74 lists every one of the ' + regOpenIds.length + ' open register rows')
if (staleIn4.length) fail('\u00a74 still lists closed row(s): ' + staleIn4.join(', '))
else if (!missingIn4.length) ok('\u00a74 lists nothing that \u00a75 says is closed')

// 3 — §4's own count line against its table
const c4 = /\*\*(\d+)\*\* open\s*\n?register rows/.exec(sec4.join('\n')) || /all \*\*(\d+)\*\* open/.exec(sec4.join('\n'))
if (!c4) fail('\u00a74: the "all N open register rows" count line was not found')
else if (+c4[1] !== rows4.length) fail('\u00a74 says ' + c4[1] + ' open rows but its table holds ' + rows4.length)
else ok('\u00a74 count line ' + c4[1] + ' = its table')

// 3b — §4's state tally against its table. The line wraps, so match on whitespace, not on a literal
const tallyLine = (sec4.join('\n').match(/\*Grouped by state:\*\s+\*\*(\d+) startable now\*\*\s*\u00b7\s*\*\*(\d+) needs a database\*\*\s*\u00b7\s*\*\*(\d+) need you\*\*\s*\u00b7\s*\*\*(\d+) blocked\*\*/) || [])
  .slice(1).map(Number)
if (tallyLine.length !== 4) fail('\u00a74: the "grouped by state" tally line was not found')
else {
  const claimed = { [STATE.startable]: tallyLine[0], [STATE.db]: tallyLine[1], [STATE.you]: tallyLine[2], [STATE.blocked]: tallyLine[3] }
  let bad = 0
  for (const [k, v] of Object.entries(claimed)) {
    if (v !== (tally[k] || 0)) { fail('\u00a74 state tally says ' + v + ' "' + k + '"; its table holds ' + (tally[k] || 0)); bad++ }
  }
  if (!bad) ok('\u00a74 state tally ' + tallyLine.join('/') + ' = its table (' + Object.values(tally).reduce((a, b) => a + b, 0) + ' rows)')
}

// 4 — every CC-nn named in the file resolves to a §5 row
const named = new Set(md.match(/CC-\d+/g) || [])
const regIds = new Set(reg.map((r) => r.id))
const dangling = [...named].filter((id) => !regIds.has(id) && !SKIPPED.has(id))
if (dangling.length) fail(dangling.length + ' CC code(s) named in this file have no \u00a75 register row: ' + dangling.join(', '))
else ok('all ' + named.size + ' distinct CC codes named here resolve in \u00a75')

// 5 — the register's headline count, typed in TWO places, and BOTH must be read.
//
// ★ The first draft ran one regex over the whole file: `.exec(md)` returns the FIRST match, which is
// §2's headline at line 50 — 184 lines before §5's own count line — so the check named §5 and
// actually read §2, and §5's copy was never read at all. M3 proved it: the mutation changed §5's
// line, the checker stayed green, and the suite reported a proof that never happened. A check that
// names one line and reads another is the `CC-101` defect in miniature (a check that reads the wrong
// thing is indistinguishable, from the outside, from a check that works).
//
// The Rule 13 history line ("The committed header read **52 closed · 44 open · 96 total**") is a
// dated record of a past state, not a claim, and is deliberately excluded — it is left as it stands.
const HEADLINE = [
  ['\u00a72', /\*\*(\d+) closed \u00b7 (\d+) open \u00b7 (\d+) total\*\*, counted from \u00a75/],
  ['\u00a75', /numbering skips it\. \*\*(\d+) closed \u00b7 (\d+) open \u00b7 (\d+) total\.\*\*/],
]
for (const [where, re] of HEADLINE) {
  const m = re.exec(md)
  const want = closed + '/' + openReg + '/' + reg.length
  if (!m) fail(where + ': the "N closed \u00b7 N open \u00b7 N total" headline was not found')
  else if (+m[1] !== closed || +m[2] !== openReg || +m[3] !== reg.length) {
    fail(where + ' says ' + m[1] + '/' + m[2] + '/' + m[3] + '; its table holds ' + want)
  } else ok(where + ' headline ' + m[1] + '\u00b7' + m[2] + '\u00b7' + m[3] + ' = its table')
}

// 5b — §7's row count against its own claim
const srClaim = (sec7.join('\n').match(/(\d+) HAVE \u00b7 (\d+) BUILD \u00b7 (\d+) BORROW \u00b7 (\d+) RE-ENGINEER = (\d+)/) || []).slice(1).map(Number)
if (srClaim.length !== 5) fail('\u00a77: the "N HAVE \u00b7 N BUILD \u00b7 N BORROW \u00b7 N RE-ENGINEER = N" line was not found')
else if (srClaim[4] !== srRows) fail('\u00a77 claims ' + srClaim[4] + ' requirements; its table holds ' + srRows)
else ok('\u00a77 claim ' + srClaim[4] + ' requirements = its table (' + srClaim[0] + '+' + srClaim[1] + '+' + srClaim[2] + '+' + srClaim[3] + ')')

// 6 — §8's vocabulary table counts the ids actually in each named home
if (!fams.length) fail('\u00a78: no vocabulary rows were parsed \u2014 the table shape changed')
for (const f of fams) {
  const t = homeText(f.home)
  if (t === undefined) { fail('\u00a78: ' + f.fam + "'s home `" + f.home + '` does not exist'); continue }
  if (t === null) {
    // this file's own table: the count must match the rows that carry it
    const own = f.fam === 'CC-*' ? reg.length : srRows
    if (f.claimed !== own) fail('\u00a78 says ' + f.claimed + ' ' + f.fam + ' ids; its own table holds ' + own)
    else ok('\u00a78 ' + f.fam + ' ' + f.claimed + ' = its own table')
    continue
  }
  const ids = idsIn(t, f.fam)
  if (f.claimed !== ids.length) fail('\u00a78 says ' + f.claimed + ' ' + f.fam + ' ids in `' + f.home + '`; it holds ' + ids.length + ' (' + ids.join(' ') + ')')
  else ok('\u00a78 ' + f.fam + ' ' + f.claimed + ' = counted in `' + f.home + '`')
}

// 7 — every id of a declared family named here exists in that family's home (dangling, reversed)
const invented = []
for (const f of fams) {
  const t = homeText(f.home)
  if (!t) continue
  const homeIds = new Set(idsIn(t, f.fam))
  for (const id of idsIn(md, f.fam)) if (!homeIds.has(id)) invented.push(id + ' (not in ' + f.home + ')')
}
if (invented.length) fail(invented.length + ' id(s) named in this file do not exist in their home register: ' + invented.join(', '))
else ok('every id of every declared family named here exists in its home register')

// 7b — the §8 coverage headline must equal what the tables actually measure, in both directions:
//      the "before" is read from git HEAD (the version this section superseded), the "after" from the
//      working tree. Two typed numbers became two measured ones.
const external = fams.filter((f) => homeText(f.home))
const WORK_FAMS = new Set(['G-', 'AH-', 'S-0', 'V-', 'N-', 'ML-'])
const measure = (mdText) => {
  let total = 0, work = 0
  const per = []
  for (const f of external) {
    const home = new Set(idsIn(homeText(f.home), f.fam))
    const here = new Set(idsIn(mdText, f.fam))
    const gap = [...home].filter((id) => !here.has(id))
    total += gap.length
    if (WORK_FAMS.has(f.fam.replace(/\*+$/, ''))) work += gap.length
    per.push(f.fam.replace(/\*+$/, '') + ':' + gap.length)
  }
  return { total, work, per }
}
const now = measure(md)
const sec8txt = sec8.join('\n')
const claimAfter = sec8txt.match(/the unaddressed count is \*\*(\d+)\*\*/)
const claimBefore = sec8txt.match(/\*\*(\d+) ids across 12 families had no address here/)

if (!claimAfter) fail('\u00a78: the "unaddressed count is N" line was not found')
else if (+claimAfter[1] !== now.total) fail('\u00a78 says ' + claimAfter[1] + ' ids unaddressed; measured ' + now.total + ' (' + now.per.join(' ') + ')')
else ok('\u00a78 coverage now: ' + now.total + ' unaddressed = measured (' + now.per.join(' ') + ')')

if (!claimBefore) fail('\u00a78: the "N ids across 12 families" before-line was not found')
else {
  // The benchmark revision is NAMED IN THE DOCUMENT, not assumed to be HEAD — otherwise the claim
  // silently changes meaning the moment this change is committed.
  const rev = sec8txt.match(/revision `([0-9a-f]{7,40})`/)
  if (!rev) fail('\u00a78: no benchmark revision is named, so the before-number cannot be verified')
  else {
    let beforeText = null
    try {
      beforeText = execSync('git show ' + rev[1] + ':library/development/MASTER-CHECKLIST.md', { encoding: 'utf8', cwd: path.join(HERE, '..') })
    } catch (e) { /* revision unreadable — handled below */ }
    if (!beforeText) fail('\u00a78: could not read revision ' + rev[1] + ' from git \u2014 the before-number is unverifiable')
    else {
      const before = measure(beforeText)
      if (+claimBefore[1] !== before.total) fail('\u00a78 says ' + claimBefore[1] + ' ids were unaddressed at ' + rev[1].slice(0, 7) + '; measured ' + before.total + ' (' + before.per.join(' ') + ')')
      else ok('\u00a78 coverage at ' + rev[1].slice(0, 7) + ': ' + before.total + ' unaddressed = measured (' + before.per.join(' ') + ')')
      if (now.work >= before.work) fail('\u00a78 claims \u00a79 closed the six work families, but they hold ' + now.work + ' unaddressed vs ' + before.work + ' at ' + rev[1].slice(0, 7))
      else ok('\u00a79 closed the six work families: ' + before.work + ' \u2192 ' + now.work + ' unaddressed')
    }
  }
}

// 8 — every markdown table in this file has one shape. An unescaped `|` from a code snippet ends the
//     cell in the renderer, so the table silently breaks: six register rows carried `||`, `a | b`
//     and `Record<A, B>` raw and were ragged until 2026-10-17.
// A pipe is escaped when preceded by an ODD number of backslashes: `\|` is escaped, `\\|` is a literal
// backslash followed by a LIVE pipe. Both wrong forms were shipped and both were invisible to the
// checks as first written — the mutation proof is what caught each one, which is why M12 and M13 exist.
const livePipes = (s) => {
  let live = 0, bs = 0
  for (const ch of s) {
    if (ch === '\\') bs++
    else if (ch === '|') { if (bs % 2 === 0) live++; bs = 0 }
    else bs = 0
  }
  return live
}
let ragged = []
{
  let i = 0
  while (i < lines.length) {
    if (lines[i].startsWith('|')) {
      let j = i
      while (j < lines.length && lines[j].startsWith('|')) j++
      const want = livePipes(lines[i])
      for (let k = i; k < j; k++) {
        const got = livePipes(lines[k])
        if (got !== want) ragged.push('line ' + (k + 1) + ' has ' + got + ' live pipes, its table header has ' + want)
      }
      i = j
    } else i++
  }
}
if (ragged.length) fail(ragged.length + ' table row(s) have the wrong number of live pipes \u2014 the table will not render: ' + ragged[0])
else ok('every one of this file\'s ' + (md.match(/^\|/gm) || []).length + ' table rows matches its table\'s shape')

console.log('')
if (fails.length) {
  console.log('FAIL \u2014 ' + fails.length + ' measured claim(s) in MASTER-CHECKLIST.md do not match its tables:')
  for (const f of fails) console.log('  \u2022 ' + f)
  process.exit(1)
}
console.log('PASS \u2014 every measured claim in MASTER-CHECKLIST.md matches its tables.')
