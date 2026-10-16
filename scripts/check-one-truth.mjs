#!/usr/bin/env node
/**
 * One-truth checker — `SR-39` (zulip's `check-schemas`, generalised).
 *
 * WHY THIS EXISTS
 * ---------------
 * Wherever one fact is written down in more than one place, the copies drift, and the drift is
 * invisible until it bites. It bit us: the 2026-10-16 Hermes re-pin updated **three of four**
 * copies of the pin digest and left `docker/hermes/verify_pin.py` naming the *previous* revision,
 * so any caller not handed `HERMES_PIN_DIGEST` read a correctly-pinned tree as `PIN BROKEN`
 * (`CC-90`, measured). A machine comparing the copies would have caught it at the re-pin and
 * named the stale one.
 *
 * This is not a new idea for this repo — `scripts/check-version-alignment.sh` already does exactly
 * this for ONE fact (the package version). The difference here is the **registry**: adding the
 * second fact is a data change, not a new script. That is the difference between a mechanism and
 * an anecdote.
 *
 * WHAT IT CHECKS
 * --------------
 * For each fact in `FACTS`, every listed representation is read and a value extracted. Then:
 *
 *   ≥2 readable, all equal        -> PASS   (the fact has one truth)
 *   ≥2 readable, any differ       -> FAIL   (and every representation is printed, so the divergent
 *                                            one is named — that is the whole point)
 *   a representation yields >1
 *     distinct value in one file  -> FAIL   (a copy that disagrees with ITSELF — see the
 *                                            `hermes-pin-digest` note below)
 *   fewer than 2 readable         -> SKIP   loudly. One representation is not a one-truth problem,
 *                                            and silence there would be a false green.
 *
 * USAGE
 * -----
 *   node scripts/check-one-truth.mjs                    # check (exit 1 on drift)
 *   node scripts/check-one-truth.mjs --json             # machine-readable report
 *   node scripts/check-one-truth.mjs --root <dir>       # check another checkout (used by the test)
 *
 * A representation whose file is ABSENT is reported, never silently skipped: the docs repo is a
 * SIBLING checkout (`../../library/…`), so a code-only clone legitimately has fewer copies — and
 * that must be visible in the output rather than read as agreement.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/**
 * The registry. One entry per fact that must have one truth.
 *
 * `pattern` is a RegExp source; group 1 is the value. Every match in the file is collected, so a
 * file that states the fact twice with different values is caught (that is a real failure mode —
 * see `hermes-pin-digest`).
 */
const FACTS = [
  {
    id: 'hermes-pin-digest',
    description: 'The digest the mounted Hermes tree must produce (the pin).',
    note:
      'The fact that drifted: the 2026-10-16 re-pin updated three of four copies and missed ' +
      'verify_pin.py (CC-90). HERMES-PIN.md is deliberately NOT registered yet — it carries TWO ' +
      'different 32-hex digests for the same tree (f57f729d… in its §1 table, 07ee857b… in its ' +
      '"computed twice" note) and never says which is the pin digest. A checker cannot demand ' +
      'agreement from a document that does not agree with itself; the document must be fixed first.',
    representations: [
      {
        label: 'verify_pin.py',
        path: 'docker/hermes/verify_pin.py',
        pattern: 'DEFAULT_EXPECTED_DIGEST\\s*=\\s*"([0-9a-f]{32})"',
      },
      {
        label: 'docker-compose.hermes.yml',
        path: 'docker-compose.hermes.yml',
        pattern: 'HERMES_PIN_DIGEST:\\s*\\$\\{HERMES_PIN_DIGEST:-([0-9a-f]{32})\\}',
      },
      {
        label: 'library/.hermes_pin.py (docs repo)',
        path: '../../library/.hermes_pin.py',
        pattern: 'EXPECTED_DIGEST\\s*=\\s*"([0-9a-f]{32})"',
      },
    ],
  },
]

function parseArgs(argv) {
  const options = { json: false, root: process.cwd(), help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') options.json = true
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

/** Every distinct value a representation states, in file order. */
function readRepresentation(repoRoot, representation) {
  const full = path.resolve(repoRoot, representation.path)
  if (!existsSync(full)) {
    return { label: representation.label, status: 'absent', path: representation.path }
  }
  let text
  try {
    text = readFileSync(full, 'utf8')
  } catch (error) {
    return { label: representation.label, status: 'unreadable', path: representation.path, detail: String(error) }
  }
  const pattern = new RegExp(representation.pattern, 'g')
  const values = []
  for (const match of text.matchAll(pattern)) {
    if (match[1] && !values.includes(match[1])) values.push(match[1])
  }
  if (values.length === 0) {
    return { label: representation.label, status: 'no-match', path: representation.path }
  }
  return { label: representation.label, status: 'read', path: representation.path, values }
}

function checkFact(repoRoot, fact) {
  const results = fact.representations.map((representation) => readRepresentation(repoRoot, representation))
  const readable = results.filter((r) => r.status === 'read')

  // A copy that disagrees with itself is a failure on its own, independent of the others.
  const selfConflicts = readable.filter((r) => r.values.length > 1)

  const distinct = []
  for (const result of readable) {
    for (const value of result.values) if (!distinct.includes(value)) distinct.push(value)
  }

  let verdict
  if (selfConflicts.length > 0) verdict = 'FAIL'
  else if (readable.length >= 2) verdict = distinct.length === 1 ? 'PASS' : 'FAIL'
  else verdict = 'SKIP'

  return {
    id: fact.id,
    description: fact.description,
    verdict,
    distinctValues: distinct,
    representations: results,
    selfConflicts: selfConflicts.map((r) => r.label),
    readable: readable.length,
  }
}

function report(report_, options) {
  if (options.json) {
    process.stdout.write(JSON.stringify({ facts: report_ }, null, 2) + '\n')
    return
  }
  for (const fact of report_) {
    process.stdout.write(`\n${fact.verdict}  ${fact.id}\n  ${fact.description}\n`)
    for (const representation of fact.representations) {
      const where = `    - ${representation.label} [${representation.path}]`
      if (representation.status === 'read') {
        process.stdout.write(`${where}\n        ${representation.values.join('  |  ')}\n`)
      } else {
        process.stdout.write(`${where}\n        ${representation.status.toUpperCase()}\n`)
      }
    }
    if (fact.selfConflicts.length > 0) {
      process.stdout.write(`  DISAGREES WITH ITSELF: ${fact.selfConflicts.join(', ')}\n`)
    }
    if (fact.verdict === 'FAIL' && fact.selfConflicts.length === 0) {
      process.stdout.write(`  DRIFT: ${fact.readable} copies read, ${fact.distinctValues.length} distinct values\n`)
    }
    if (fact.verdict === 'SKIP') {
      process.stdout.write(
        `  NOT CHECKED: fewer than 2 representations readable (${fact.readable}) — ` +
          'one copy is not a one-truth problem, but it is also not a green.\n',
      )
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
    process.stdout.write('Usage: node scripts/check-one-truth.mjs [--json] [--root <dir>]\n')
    return 0
  }

  const report_ = FACTS.map((fact) => checkFact(options.root, fact))
  report(report_, options)

  const failed = report_.filter((fact) => fact.verdict === 'FAIL')
  const summary =
    failed.length > 0
      ? `\nONE-TRUTH CHECK FAILED — ${failed.length} fact(s) drifted.\n`
      : '\nOne-truth check passed.\n'

  // `--json` must keep stdout PURE JSON so a caller can pipe it into a parser (the repo's other
  // `--json` scripts do the same). The human status line therefore goes to stderr in that mode —
  // and always on failure, where stderr is where a CI reader looks.
  if (options.json || failed.length > 0) process.stderr.write(summary)
  else process.stdout.write(summary)

  return failed.length > 0 ? 1 : 0
}

process.exitCode = main()
