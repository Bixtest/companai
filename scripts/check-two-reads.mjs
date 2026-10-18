#!/usr/bin/env node
/**
 * Two-reads lint — `SR-46` (openrig's two-surface rule, generalised).
 *
 * WHY THIS EXISTS
 * ---------------
 * Anywhere a setting is read twice, the two reads can disagree with each other — and the
 * disagreement is silent until it bites. The platform study's correction note is explicit that the
 * origin is openrig's two-surface rule: a config-file policy whose schema a vendor may change "must
 * go through a skill that reads the installed version and adapts". Read it in two places and you
 * have two opinions about the installed version. This check enforces the mechanical half of that:
 * **a setting read twice must be read once.**
 *
 * WHAT THE SCOPE IS, AND WHY IT IS THE FILE
 * -----------------------------------------
 * The requirement does not name a scope; it names a population — "a setting read twice". The
 * obvious finer scope is the *block* (two reads inside one `{ … }` both execute, so they can
 * diverge), and it was built first. It was REJECTED because it could not be made reliable, and a
 * scope that is merely usually right produces false findings, which (LESSONS L178) are as wrong as
 * missed ones:
 *
 *   The block scope needs balanced braces in the stripped text. The shared lexer
 *   (`lib/strip-code.mjs`) blanks strings, comments, templates and regexes, but it is a JavaScript
 *   lexer and this repo is full of `.tsx`, where JSX is not JavaScript. Measured on the real repo
 *   (2026-10-17): **355 of 4,823 production files (7.4 %) strip to UNBALANCED braces.** A brace
 *   chain read from an unbalanced file mis-nests, and every read below the mis-nesting collapses
 *   into one bogus scope. On `packages/cli/src/mercato.ts` it reported `DATABASE_URL` four times in
 *   "one scope" when three of those reads sit in three different functions.
 *
 * So the scope is the **file** — the module. It is exact (no parsing to get wrong), it is the
 * population the requirement names, and "read once" is unambiguous: one read per file, hoisted to a
 * single site. The finer block scope is *scheduled*, not abandoned — its prerequisite is a
 * JSX-aware parse, which the repo does not have a stable one of today (root `typescript` is the
 * native port without the classic AST API; the classic API exists only nested under an app).
 *
 * A *write* (`process.env.X = …`, `+=`, `??=`) is not a read and is never counted.
 *
 * USAGE
 * -----
 *   node scripts/check-two-reads.mjs                  # census (exit 0)
 *   node scripts/check-two-reads.mjs --fail           # exit 1 if any setting is read twice
 *   node scripts/check-two-reads.mjs --json           # machine-readable report
 *   node scripts/check-two-reads.mjs --root <dir>     # scan another checkout (used by the test)
 *   node scripts/check-two-reads.mjs --include-tests  # include test files (excluded by default)
 *
 * WHY TESTS ARE EXCLUDED BY DEFAULT
 * ---------------------------------
 * A test that reads a setting twice is *testing the reader* — it sets a value, reads it, changes it,
 * reads it again, and asserts the difference. That is the mechanism working, not a defect. The
 * measured split (2026-10-17) is 688 production reads to 684 test reads, so folding them together
 * would bury the real backlog under the tests that exercise it. `--include-tests` shows them.
 *
 * KNOWN LIMIT
 * -----------
 * Lexical, not a full parse: a setting named dynamically (`process.env[KEY]`) is not a read of a
 * *named* setting and is not counted, and write-detection is the character after the match rather
 * than an AST. Both are the same conservative trade the escape-hatch census makes.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { readStrippedLines } from './lib/strip-code.mjs'

const SCAN_ROOTS = ['apps', 'packages', 'scripts']
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'build',
  'out',
  'generated',
  '.turbo',
  '.git',
  '.mercato',
])
const TEST_DIRS = new Set(['__tests__', '__integration__', '__e2e__'])
const isTestPath = (file) => {
  const parts = file.split(path.sep)
  if (parts.some((p) => TEST_DIRS.has(p))) return true
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
}

/**
 * The setting kinds this check knows. Each kind is a pure function of a stripped line: it yields
 * `{ name, index }` for every READ of that kind. Adding a new surface (a config getter, a settings
 * service) is a data change here — not a new script.
 */
const KINDS = [
  {
    id: 'process-env',
    description: 'An environment variable read (`process.env.NAME` / `process.env["NAME"]`).',
    pattern: /process\.env\.([A-Za-z0-9_]+)|process\.env\[\s*(['"])([A-Za-z0-9_]+)\2\s*\]/g,
    name: (match) => match[1] ?? match[3],
  },
]

/** Is the text right after a match an assignment (a write), rather than a read? */
function isWriteAfter(after) {
  if (after.startsWith('??=')) return true
  if (/^=(?!=)/.test(after)) return true // `=` but not `==` / `===`
  if (/^[+\-*/%&|^]=/.test(after)) return true // compound assignment
  return false
}

function parseArgs(argv) {
  const options = { json: false, fail: false, root: process.cwd(), includeTests: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') options.json = true
    else if (arg === '--fail') options.fail = true
    else if (arg === '--include-tests') options.includeTests = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--root') {
      const value = argv[i + 1]
      if (!value) throw new Error('--root needs a directory')
      options.root = value
      i += 1
    } else throw new Error(`Unknown option: ${arg}`)
  }
  return options
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = path.join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, out)
    else if (SOURCE_EXT.test(entry) && !entry.includes('.generated.')) out.push(full)
  }
  return out
}

/** Every setting read more than once in one file. */
function scanFile(file) {
  const lines = readStrippedLines(file)
  if (!lines) return []

  /** setting name -> { kind, lines: number[] } */
  const reads = new Map()
  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li]
    for (const kind of KINDS) {
      kind.pattern.lastIndex = 0
      let match
      while ((match = kind.pattern.exec(line))) {
        const name = kind.name(match)
        if (!name) continue
        const after = line.slice(match.index + match[0].length).trimStart()
        if (isWriteAfter(after)) continue
        if (!reads.has(name)) reads.set(name, { kind: kind.id, lines: [] })
        reads.get(name).lines.push(li + 1)
      }
    }
  }

  const findings = []
  for (const [name, { kind, lines: readLines }] of reads) {
    if (readLines.length < 2) continue
    const sorted = [...readLines].sort((a, b) => a - b)
    findings.push({ setting: name, kind, reads: sorted.length, lines: sorted })
  }
  return findings.sort((a, b) => a.setting.localeCompare(b.setting))
}

function scan(root, includeTests) {
  const files = []
  for (const scanRoot of SCAN_ROOTS) files.push(...walk(path.join(root, scanRoot)))

  let scanned = 0
  let skippedTests = 0
  let totalFindings = 0
  const filesWithFindings = []
  const rootNorm = root.split(path.sep).join('/')

  for (const file of files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!includeTests && isTestPath(file)) {
      skippedTests += 1
      continue
    }
    scanned += 1
    const findings = scanFile(file)
    if (findings.length > 0) {
      totalFindings += findings.length
      const rel = file.split(path.sep).join('/')
      filesWithFindings.push({ file: rel.startsWith(`${rootNorm}/`) ? rel.slice(rootNorm.length + 1) : rel, findings })
    }
  }

  return { scannedFiles: scanned, skippedTestFiles: skippedTests, findings: totalFindings, files: filesWithFindings }
}

function report(result, options) {
  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }
  const out = process.stdout
  out.write('Two-reads lint (SR-46)\n')
  out.write(`- files scanned: ${result.scannedFiles} (test files skipped: ${result.skippedTestFiles})\n`)
  out.write(`- settings read more than once in one file: ${result.findings} in ${result.files.length} file(s)\n`)
  for (const file of result.files) {
    out.write(`\n- ${file.file}\n`)
    for (const f of file.findings) {
      out.write(`    ${f.setting} read ${f.reads}x — lines ${f.lines.join(', ')}\n`)
    }
  }
}

function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    return 1
  }
  if (options.help) {
    process.stdout.write('Usage: node scripts/check-two-reads.mjs [--fail] [--json] [--include-tests] [--root <dir>]\n')
    return 0
  }

  const result = scan(options.root, options.includeTests)
  report(result, options)

  const summary =
    result.findings > 0
      ? `\n${result.findings} setting(s) read more than once in one file — read each once.\n`
      : '\nNo setting is read more than once in one file.\n'

  // Keep `--json` pure JSON on stdout (the repo's convention), so the status line goes to stderr.
  if (options.json) process.stderr.write(summary)
  else process.stdout.write(summary)

  return options.fail && result.findings > 0 ? 1 : 0
}

process.exitCode = main()
