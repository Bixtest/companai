#!/usr/bin/env node
/**
 * CC-132 measurement: what the capability-coverage guard can SEE, versus what is
 * ENABLED.
 *
 * The guard's denominator is parsed from `apps/mercato/src/modules.ts` and its
 * numerator is read from one directory: `packages/core/src/modules`. This script
 * resolves each enabled entry's `from` to the module root that actually ships
 * it, so the census is the enabled surface and nothing else.
 *
 * Two traps it is written to avoid, both found while measuring:
 *  - the file holds MORE THAN ONE list (`enabledModules` and the reference
 *    modules, which are deliberately off), so a scan for every `id:` literal
 *    over-counts;
 *  - `example` exists twice (the create-app template and the app), so walking
 *    packages double-counts it.
 *
 * Read-only. Prints a census; writes nothing.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = join(here, '..')
const modulesTsPath = join(root, 'apps', 'mercato', 'src', 'modules.ts')

/**
 * The `enabledModules` array, and only that array.
 *
 * Sliced from `export const enabledModules` to the first `\n]` at column 0 — the
 * array's own terminator. The reference modules live in a different export below
 * it and are deliberately off; reading them as enabled is the defect this
 * scoping exists to avoid.
 */
function readEnabledEntries() {
  const source = readFileSync(modulesTsPath, 'utf8')
  const start = source.indexOf('export const enabledModules')
  if (start < 0) throw new Error('enabledModules export not found')
  const end = source.indexOf('\n]', start)
  if (end < 0) throw new Error('enabledModules array terminator not found')
  const body = source.slice(start, end)

  // Strip comments first, so a commented-out entry is not an entry.
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

  const entries = []
  const re = /\{\s*id:\s*'([a-z0-9_]+)'\s*,\s*from:\s*'([^']+)'/g
  let m
  while ((m = re.exec(stripped))) entries.push({ id: m[1], from: m[2] })

  // A multi-line entry (dashboards) has `id` and `from` on separate lines.
  const loose = /\bid:\s*'([a-z0-9_]+)'[\s\S]{0,200}?\bfrom:\s*'([^']+)'/g
  while ((m = loose.exec(stripped))) {
    if (!entries.some((e) => e.id === m[1])) entries.push({ id: m[1], from: m[2] })
  }
  return entries
}

/** `from` → the directory that holds that package's modules. */
function moduleRootFor(from) {
  if (from === '@open-mercato/core') return join(root, 'packages', 'core', 'src', 'modules')
  if (from === '@app') return join(root, 'apps', 'mercato', 'src', 'modules')
  const m = /^@open-mercato\/(.+)$/.exec(from)
  if (!m) return null
  return join(root, 'packages', m[1], 'src', 'modules')
}

function readFeatureIds(path) {
  const source = readFileSync(path, 'utf8')
  const ids = []
  const described = []
  const blocks = source.split(/\bid:\s*'/).slice(1)
  for (const block of blocks) {
    const id = block.slice(0, block.indexOf("'"))
    if (!id) continue
    ids.push(id)
    if (/\bcapability:\s*\{/.test(block)) described.push(id)
  }
  return { ids, described }
}

const entries = readEnabledEntries()
const rows = entries.map((entry) => {
  const moduleRoot = moduleRootFor(entry.from)
  const path = moduleRoot ? join(moduleRoot, entry.id, 'acl.ts') : null
  const exists = Boolean(path && existsSync(path))
  const { ids, described } = exists ? readFeatureIds(path) : { ids: [], described: [] }
  return { ...entry, moduleRoot, path, exists, ids, described }
})

const sum = (list, key) => list.reduce((n, r) => n + r[key].length, 0)
const withFeatures = rows.filter((r) => r.ids.length > 0)
const coreRows = withFeatures.filter((r) => r.from === '@open-mercato/core')
const nonCoreRows = withFeatures.filter((r) => r.from !== '@open-mercato/core')

console.log('=== the guard today ===')
console.log('modulesRoot it reads:      packages/core/src/modules (hard-coded)')
console.log('enabled entries parsed:    ' + entries.length)
console.log('enabled modules with acl.ts and >=1 feature: ' + withFeatures.length)
console.log('')

console.log('=== enabled surface, split by package ===')
for (const [label, list] of [['core', coreRows], ['everywhere else', nonCoreRows]]) {
  console.log(
    `${label.padEnd(18)} modules ${String(list.length).padStart(3)}  features ${String(sum(list, 'ids')).padStart(4)}  described ${String(sum(list, 'described')).padStart(4)}`,
  )
}
const totalFeatures = sum(withFeatures, 'ids')
const totalDescribed = sum(withFeatures, 'described')
console.log(`TOTAL enabled      modules ${String(withFeatures.length).padStart(3)}  features ${String(totalFeatures).padStart(4)}  described ${String(totalDescribed).padStart(4)}`)
console.log(`enabled coverage: ${totalDescribed}/${totalFeatures} (${Math.round((totalDescribed / totalFeatures) * 100)}%)`)
console.log('')

console.log('=== enabled modules the guard cannot see ===')
for (const r of nonCoreRows.sort((a, b) => a.id.localeCompare(b.id))) {
  const missing = r.ids.filter((id) => !r.described.includes(id))
  console.log(`${r.id.padEnd(20)} ${r.from.padEnd(28)} ${String(r.ids.length).padStart(3)} features, ${String(missing.length).padStart(3)} undescribed`)
  if (missing.length) console.log('    ' + missing.join(', '))
}
console.log('')

console.log('=== enabled modules with NO acl.ts at the resolved path ===')
for (const r of rows.filter((r) => !r.exists)) {
  console.log(`  ${r.id.padEnd(20)} from ${r.from.padEnd(26)} expected ${r.path ? r.path.replace(root, '.') : '(unresolvable root)'}`)
}
console.log('')

console.log('=== enabled modules with an acl.ts but ZERO features ===')
for (const r of rows.filter((r) => r.exists && r.ids.length === 0)) {
  console.log('  ' + r.id + ' (' + r.path.replace(root, '.') + ')')
}
console.log('')

console.log('=== the features tools require, and whether the resolver can see them ===')
const toolRequired = ['ai_assistant.view', 'search.view', 'customers.people.view', 'attachments.view', 'attachments.manage']
for (const feature of toolRequired) {
  const row = withFeatures.find((r) => r.ids.includes(feature))
  const state = !row ? 'NOT DECLARED' : row.described.includes(feature) ? 'described' : 'UNDESCRIBED'
  console.log(`  ${feature.padEnd(24)} ${state}${row ? ' (' + row.id + ')' : ''}`)
}
console.log('')

console.log('=== duplicate module ids across the declared roots (must not double-count) ===')
const byId = new Map()
for (const r of rows) {
  if (!byId.has(r.id)) byId.set(r.id, [])
  byId.get(r.id).push(r.from)
}
let dupes = 0
for (const [id, froms] of byId) {
  if (froms.length > 1) {
    dupes++
    console.log('  ' + id + ': ' + froms.join(' | '))
  }
}
if (!dupes) console.log('  none')
console.log('')

console.log('=== modules in the file that are NOT in enabledModules (must be excluded) ===')
const allIds = new Set()
for (const line of readFileSync(modulesTsPath, 'utf8').split('\n')) {
  const t = line.trim()
  if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue
  const m = t.match(/^\{?\s*id:\s*'([a-z0-9_]+)'/)
  if (m) allIds.add(m[1])
}
const enabledIds = new Set(entries.map((e) => e.id))
for (const id of [...allIds].sort()) if (!enabledIds.has(id)) console.log('  ' + id)
