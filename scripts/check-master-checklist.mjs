#!/usr/bin/env node
/**
 * check-master-checklist.mjs — proves MASTER-CHECKLIST.md is still true.
 *
 * Every number in the file is typed by a human, so every number is a claim. This script reads the
 * file's own tables and fails loudly when a typed count disagrees with the rows that carry it.
 *
 * HONEST STATE (2026-10-17): this checker is BUILT BUT NOT ENFORCED. Nothing calls it — not CI,
 * not a pre-commit hook. Adding it to `.github/workflows/ci.yml` is exactly the work `CC-101`
 * describes for the other four checkers, and it should land with them. Until then, run it by hand:
 *
 *     node scripts/check-master-checklist.mjs
 *
 * Exit 0 = every measured claim in the file matches its tables. Exit 1 = the file is lying.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(HERE, '..', 'library', 'development', 'MASTER-CHECKLIST.md')

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

// ---------------------------------------------------------------- §5 register
const sec5 = section('5')
const reg = []
for (const l of tables(sec5)) {
  const m = /^\| (CC-\d+) \| (.*?) \| ([^|]+?) \|\s*$/.exec(l)
  if (m) reg.push({ id: m[1], state: m[3].replace(/[^a-z]/g, '') })
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

// ---------------------------------------------------------------- §1 headline
const sec1 = section('1')
const head = sec1.find((l) => /checklist rows across/.test(l)) || ''
const mh = /\*\*(\d+) checklist rows across (\d+) phases\.?\*\* (\d+) done \u00b7 (\d+) partial \u00b7 (\d+) open \u00b7 (\d+) absent/.exec(head.replace(/\u2014/g, '-'))

console.log('MASTER-CHECKLIST.md \u2014 ' + rows3.length + ' checklist rows \u00b7 ' + reg.length + ' register rows \u00b7 ' + rows4.length + ' open-work rows')

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

// 4 — every CC-nn named in the file resolves to a §5 row
const named = new Set(md.match(/CC-\d+/g) || [])
const regIds = new Set(reg.map((r) => r.id))
const dangling = [...named].filter((id) => !regIds.has(id) && !SKIPPED.has(id))
if (dangling.length) fail(dangling.length + ' CC code(s) named in this file have no \u00a75 register row: ' + dangling.join(', '))
else ok('all ' + named.size + ' distinct CC codes named here resolve in \u00a75')

// 5 — §5's own count line against its table
const c5 = /(\d+) closed \u00b7 (\d+) open \u00b7 (\d+) total/.exec(md)
if (!c5) fail('\u00a75: the "N closed \u00b7 N open \u00b7 N total" line was not found')
else if (+c5[1] !== closed || +c5[2] !== openReg || +c5[3] !== reg.length) {
  fail('\u00a75 says ' + c5[1] + '/' + c5[2] + '/' + c5[3] + '; its table holds ' + closed + '/' + openReg + '/' + reg.length)
} else ok('\u00a75 count line ' + c5[1] + '\u00b7' + c5[2] + '\u00b7' + c5[3] + ' = its table')

console.log('')
if (fails.length) {
  console.log('FAIL \u2014 ' + fails.length + ' measured claim(s) in MASTER-CHECKLIST.md do not match its tables:')
  for (const f of fails) console.log('  \u2022 ' + f)
  process.exit(1)
}
console.log('PASS \u2014 every measured claim in MASTER-CHECKLIST.md matches its tables.')
