#!/usr/bin/env node
/**
 * Escape-hatch census — `SR-41` (zulip's `mark_sanitized`, generalised).
 *
 * WHY THIS EXISTS
 * ---------------
 * Every guard has holes: a lint rule switched off for one line, a type error suppressed. The lesson
 * from the platform study is not "have holes" — every real codebase does — it is that a hole must be
 * **named**, so that (a) one search finds every one, and (b) the reason travels with it. An unnamed
 * hole is indistinguishable from an accident, and the next reader cannot tell whether it is still
 * needed or was forgotten.
 *
 * WHAT IT CHECKS
 * --------------
 * Every directive hole must carry a REASON on the same line. The **native** reason forms are used on
 * purpose, so the convention costs nothing new and both tools already understand it:
 *
 *   // eslint-disable-next-line no-console -- the CLI's only legal writer (see logger.ts)
 *   // @ts-expect-error: the upstream signature is wrong for the 3rd arg (fixed upstream in v5)
 *
 *   named    -> a hole WITH a reason. Counted, not listed.
 *   unnamed  -> a hole with NO reason. Listed, so it can be fixed.
 *
 * USAGE
 * -----
 *   node scripts/check-escape-hatches.mjs               # census + list unnamed (exit 0)
 *   node scripts/check-escape-hatches.mjs --fail        # exit 1 if any hole is unnamed
 *   node scripts/check-escape-hatches.mjs --json        # machine-readable report
 *   node scripts/check-escape-hatches.mjs --root <dir>  # scan another checkout (used by the test)
 *
 * WHY THE DEFAULT IS exit 0
 * -------------------------
 * The first job of this script is to ANSWER A QUESTION — "how many holes do we have, and where?" —
 * and a census that refuses to print when it finds something is useless. So the report always
 * prints and always exits 0; `--fail` is the enforcement mode, for when the backlog is cleared and
 * the convention is worth defending. That is the same report-now / enforce-later split the repo
 * already uses for `check:time-bombs` and `check:client-boundaries`.
 *
 * DELIBERATELY NOT SCANNED
 * ------------------------
 * `as any` / `as unknown as` are type ASSERTIONS, not guard bypasses, and there are ~4.4k of them in
 * `src` (measured 2026-10-16, most inside tests). Requiring a reason on each would bury the ~178
 * real directive holes in noise. If the assertion form is ever wanted it belongs behind its own flag
 * and its own backlog, not folded into this count.
 *
 * KNOWN LIMIT
 * -----------
 * Scanning is line-based and lexical (no parser), so a line whose TEXT happens to look like
 * `// eslint-disable…` inside a string literal still counts. The `startsComment` rule below removes
 * the much larger prose class, and a census is a report rather than a gate, so the residue is an
 * acceptable trade — the same one `time-bomb-scanner.mjs` makes.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/** Where source lives. Walking only these keeps the scan bounded (the repo also holds GGUFs and
 *  a gitignored `workspace/`, none of which can carry a TS/JS directive hole). */
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

/**
 * The hole kinds this check knows. `token` is what is searched for; `isNamed` decides whether the
 * line that carries it also carries a reason.
 */
const KINDS = [
  {
    id: 'eslint-disable',
    token: 'eslint-disable',
    // ESLint's native reason separator: `-- <reason>`. A bare rule list is NOT a reason.
    isNamed: (line) => /--\s*\S/.test(line),
  },
  {
    id: 'ts-expect-error',
    token: '@ts-expect-error',
    isNamed: (line, idx) => hasTrailingText(line, idx, '@ts-expect-error'.length),
  },
  {
    id: 'ts-ignore',
    token: '@ts-ignore',
    isNamed: (line, idx) => hasTrailingText(line, idx, '@ts-ignore'.length),
  },
  {
    id: 'ts-nocheck',
    token: '@ts-nocheck',
    isNamed: (line, idx) => hasTrailingText(line, idx, '@ts-nocheck'.length),
  },
]

/** TypeScript has no `--` separator: ANY trailing text after the directive is the reason. */
function hasTrailingText(line, idx, len) {
  const rest = line
    .slice(idx + len)
    .replace(/\*\/\s*$/, '')
    .replace(/^[\s:\-–—]*/, '')
  return /\S/.test(rest)
}

function parseArgs(argv) {
  const options = { json: false, fail: false, root: process.cwd(), help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') options.json = true
    else if (arg === '--fail') options.fail = true
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

function normalize(file) {
  return file.split(path.sep).join('/')
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

/**
 * A directive only counts when it OPENS the comment. That is not a stylistic choice — it is how
 * both tools parse: ESLint ignores an `eslint-disable` that is not the comment's first content, and
 * TypeScript ignores a `@ts-expect-error` that is not at the start of the comment. Requiring the
 * same thing keeps PROSE out of the census, which is a real class of false positive here: the repo
 * contains lines like `// TS2578 "Unused '@ts-expect-error' directive" and this suite would not`
 * and `` *      or `props`, and the `@ts-expect-error` directives prove it `` — neither is a hole.
 */
function startsComment(line, idx) {
  const before = line.slice(0, idx)
  const open = Math.max(before.lastIndexOf('//'), before.lastIndexOf('/*'))
  if (open === -1) return false
  return /^\s*$/.test(line.slice(open + 2, idx))
}

/** Every hole on one line. A line may carry more than one kind; each is counted separately. */
function holesOnLine(line) {
  const holes = []
  for (const kind of KINDS) {
    const idx = line.indexOf(kind.token)
    if (idx === -1) continue
    if (!startsComment(line, idx)) continue
    holes.push({ kind: kind.id, named: kind.isNamed(line, idx) })
  }
  return holes
}

function scan(root) {
  const files = []
  for (const scanRoot of SCAN_ROOTS) files.push(...walk(path.join(root, scanRoot)))

  const byKind = {}
  for (const kind of KINDS) byKind[kind.id] = { total: 0, named: 0, unnamed: 0 }
  const unnamedHoles = []
  let total = 0
  let named = 0

  for (const file of files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      for (const hole of holesOnLine(lines[i])) {
        total += 1
        byKind[hole.kind].total += 1
        if (hole.named) {
          named += 1
          byKind[hole.kind].named += 1
        } else {
          byKind[hole.kind].unnamed += 1
          unnamedHoles.push({
            file: normalize(path.relative(root, file)),
            line: i + 1,
            kind: hole.kind,
            text: lines[i].trim(),
          })
        }
      }
    }
  }

  return {
    scannedFiles: files.length,
    holes: total,
    named,
    unnamed: total - named,
    byKind,
    unnamedHoles,
  }
}

function report(result, options) {
  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }
  const out = process.stdout
  out.write('Escape-hatch census (SR-41)\n')
  out.write(`- files scanned: ${result.scannedFiles}\n`)
  out.write(`- holes: ${result.holes}  (named ${result.named}, unnamed ${result.unnamed})\n`)
  for (const [kind, counts] of Object.entries(result.byKind)) {
    if (counts.total === 0) continue
    out.write(`  - ${kind}: ${counts.total} (named ${counts.named}, unnamed ${counts.unnamed})\n`)
  }
  if (result.unnamedHoles.length > 0) {
    out.write('\nUnnamed holes (no reason — add `-- <reason>` / `: <reason>`):\n')
    for (const hole of result.unnamedHoles.slice(0, 50)) {
      out.write(`- ${hole.file}:${hole.line}  [${hole.kind}]  ${hole.text}\n`)
    }
    if (result.unnamedHoles.length > 50) {
      out.write(`- ... ${result.unnamedHoles.length - 50} more\n`)
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
    process.stdout.write(
      'Usage: node scripts/check-escape-hatches.mjs [--fail] [--json] [--root <dir>]\n',
    )
    return 0
  }

  const result = scan(options.root)
  report(result, options)

  const summary =
    result.unnamed > 0
      ? `\n${result.unnamed} unnamed escape hatch(es) of ${result.holes} — a hole must carry a reason.\n`
      : `\nAll ${result.holes} escape hatch(es) are named.\n`

  // Keep `--json` pure JSON on stdout (the repo's convention), so the status line goes to stderr.
  if (options.json) process.stderr.write(summary)
  else process.stdout.write(summary)

  return options.fail && result.unnamed > 0 ? 1 : 0
}

process.exitCode = main()
