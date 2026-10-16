#!/usr/bin/env node
/**
 * Declared-control coverage check — `SR-47` (the class behind T-01, T-08, T-29, T-43).
 *
 * WHY THIS EXISTS
 * ---------------
 * A control is something the code *declares* — a field, an exported function, a contract shape —
 * in the belief that somebody will read it and act on it. When nobody reads it, the control is
 * still there: it type-checks, it lints clean, it ships, and it looks like protection. The build
 * cannot tell the difference between a guard that is wired and a guard that is decoration.
 *
 * That is not hypothetical here. Six findings in the `preview/` audit were the SAME finding:
 *
 *   `.delegable`                    declared 16x across the ACL tables, read 0x
 *   `demoteIfEvidenceDemands`       a public TrustService method, called only by its own test
 *   `authorityPolicyProblems`       exported, called only by its own test
 *   `findFrontendVocabulary`        exported, called only by its own test
 *   `detectRepeatedRequest`         exported, called only by its own test
 *   the C6 command contract         read at `command-bus.ts:452`, and no handler declares one
 *
 * Each was patched — or deferred — as an instance. `SR-47` closes the class: a control that
 * nothing reads is reported, mechanically, forever.
 *
 * This is the same shape as `SR-39` (`check-one-truth.mjs`, a registry) and `SR-41`
 * (`check-escape-hatches.mjs`, a census) — the two checks that landed before it. It is deliberately
 * a THIRD script rather than a third mode of either: the thing being counted is different, and a
 * check whose reason for existing is "invisible to the build" should not itself be buried inside
 * another script's flag table.
 *
 * THE THREE SHAPES
 * ----------------
 * `field`   — a property is declared and never read. `.delegable`.
 * `export`  — a symbol is exported and never called outside its own test.
 * `input`   — a consumer EXISTS and reads fields that no producer ever writes. The C6 contract:
 *            `commandContractMetadata` is genuinely called, but zero handlers declare
 *            `risk`/`approval`/`idempotency`, so it always returns `null`. Wiring a reader to a
 *            field nobody fills is still a dead control — it just fails more quietly.
 *
 * USAGE
 * -----
 *   node scripts/check-declared-controls.mjs               # report (exit 0)
 *   node scripts/check-declared-controls.mjs --fail        # exit 1 if any control is uncovered
 *   node scripts/check-declared-controls.mjs --json        # machine-readable report
 *   node scripts/check-declared-controls.mjs --root <dir>  # check another checkout (used by the test)
 *
 * WHY THE DEFAULT IS exit 0
 * -------------------------
 * Every one of the six controls above is currently UNCOVERED. A check that fails on the state it
 * was written to describe would be red from its first commit and would be switched off, which is
 * how a check becomes decoration — the very failure this script exists to catch. So the first job
 * is to ANSWER A QUESTION: which controls are dead, and which are wired. `--fail` is the
 * enforcement mode, for when the backlog is cleared and the class is worth defending. That is the
 * same report-now / enforce-later split `check-escape-hatches.mjs` uses.
 *
 * ★ WHY IT IS A CURATED REGISTRY AND NOT A FULL CENSUS
 * ---------------------------------------------------
 * A mechanical census of every exported symbol with no production consumer is computable, and it
 * was run while building this: **3,658 of 14,311 exported symbols (25.6%)** have zero mentions in
 * any other production file. That number is NOT a defect count. Most of it is zod schemas and type
 * aliases exported as a module's declared surface — the barrel file is the consumer, or the type
 * position is. Publishing 3,658 findings would bury the six that are real, which is exactly the
 * noise problem this workshop's `SR-41` was careful to avoid (it refuses to fold `as any` into the
 * escape-hatch count for the same reason).
 *
 * So the registry is curated, and the census is a REPORT that ships alongside it — a number to
 * watch, not a gate to trip. If the class ever needs to be enforced wholesale, the census count is
 * the thing to pin as a baseline and ratchet down, exactly as `SR-40` does.
 *
 * KNOWN LIMITS
 * ------------
 * Matching is lexical, not semantic. Two consequences, both handled and both named:
 *
 *  1. **Prose must not fake a consumer.** `auth/acl.ts:77` reads "...which is why it is never
 *     delegable and never covered by a standing approval" — the word `delegable` in a string
 *     literal. A first attempt at this check counted it as a read. `strip()` below removes string
 *     and comment CONTENTS before any pattern is applied, so the residue is gone.
 *  2. **A consumer inside the declaring file may be recursion.** `findFrontendVocabulary` calls
 *     itself at `ir.ts:217` and `:227`. `consumerScope` decides whether same-file consumers count;
 *     `export`-shaped controls default to `external`, so self-calls do not make a control look
 *     wired. `commandContractMetadata` is registered `any` because its real consumer sits in its
 *     own file at `command-bus.ts:452`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

/** Where source lives. Same roots as `check-escape-hatches.mjs`, so the two censuses agree. */
const SCAN_ROOTS = ['apps', 'packages', 'scripts']
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/
/** Never walked, whatever the mode — build output and dependency trees cannot carry a control. */
const ALWAYS_SKIP = new Set([
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
 * Test-only directories. Excluded from the PRODUCTION pass, but INCLUDED in the full pass —
 * otherwise "exercised only by its own test" could never be distinguished from "never exercised
 * at all", which is the single most important number this check reports.
 */
const TEST_DIRS = new Set([
  '__tests__',
  '__integration__',
  '__e2e__',
  '__mocks__',
  '__fixtures__',
  '__snapshots__',
])

const CONTROLS = [
  {
    id: 'capability-delegable',
    shape: 'field',
    symbol: 'delegable',
    description:
      'A capability descriptor declares whether it may appear in a delegation (`CapabilityDescriptor.delegable`).',
    why:
      'The delegation route checks `auth.delegations.manage` but never the capability being granted. ' +
      '`.delegable` is declared at 24 sites across 10 files — nine ACL tables plus the descriptor ' +
      'type itself — and read 0x, including the five notes that say "not delegable". A field that is ' +
      'written and never read is a promise the code does not keep. This is T-01: one of the two CRITICALs.\n' +
      '\n' +
      '      MEASUREMENT NOTE: a raw `grep -E "delegable\\s*\\??\\s*:"` reports 29, not 24. The extra ' +
      'five are prose inside `note:` strings — "Emphatically not itself delegable:" at ' +
      '`auth/acl.ts:112` is a sentence, not a declaration. `strip()` removes them; the count of 24 is ' +
      'the correct one, and it is the reason this script strips before matching at all.',
    // `delegable: false` (object literal) and `delegable?: boolean` (type field) both end in `:`.
    // Safe after `strip()` — the prose that mentions the word is gone by then.
    declaration: /delegable\s*\?\s*:|delegable\s*:/,
    consumer: /\.delegable\b|\[['"]delegable['"]\]/,
    consumerScope: 'external',
  },
  {
    id: 'trust-demote-if-evidence-demands',
    shape: 'export',
    symbol: 'demoteIfEvidenceDemands',
    description:
      'TrustService.demoteIfEvidenceDemands — demote a principal when the evidence says the current tier is no longer earned.',
    why:
      'A public method on TrustService with 4 callers, every one of them its own test file. Graduated ' +
      'trust that never actually demotes is a one-way ratchet, and it fails silently: the grant record ' +
      'looks correct forever. Called after an act is reversed, per its own docblock — which means the ' +
      'reversal path exists and the demotion hook into it does not. This is T-29-adjacent.',
    // Anchored: a method declaration sits at the start of a line, a CALL does not
    // (`await service.demoteIfEvidenceDemands(…)` would otherwise read as a second declaration).
    declaration: /^[ \t]*(?:async[ \t]+)?demoteIfEvidenceDemands[ \t]*\(/,
    consumer: /demoteIfEvidenceDemands\s*\(/,
    consumerScope: 'external',
  },
  {
    id: 'authority-policy-problems',
    shape: 'export',
    symbol: 'authorityPolicyProblems',
    description: 'authorityPolicyProblems — report the structural problems in an AuthorityPolicy before it is used.',
    why:
      'Exported and tested (4 callers, all its own test). A validator whose only reader is its own test ' +
      'catches nothing in production: a malformed policy that reaches the authority layer is never ' +
      'rejected. The check exists; the enforcement does not.',
    declaration: /export\s+function\s+authorityPolicyProblems\s*\(/,
    consumer: /authorityPolicyProblems\s*\(/,
    consumerScope: 'external',
  },
  {
    id: 'business-widget-frontend-vocabulary',
    shape: 'export',
    symbol: 'findFrontendVocabulary',
    description:
      'findFrontendVocabulary — walk a WidgetIR and return every place a client-specific vocabulary has leaked in.',
    why:
      'Exported, tested (5 callers, all its own test) and recursive (`ir.ts:217`, `:227` are self-calls). ' +
      'Its whole purpose is to keep the backend from emitting frontend vocabulary, and nothing runs it ' +
      'on the way out — so the leak it detects reaches the client unchecked.',
    declaration: /export\s+function\s+findFrontendVocabulary\s*\(/,
    consumer: /findFrontendVocabulary\s*\(/,
    consumerScope: 'external',
  },
  {
    id: 'request-repeat-detector',
    shape: 'export',
    symbol: 'detectRepeatedRequest',
    description: 'detectRepeatedRequest — decide whether an inbound request repeats one already handled.',
    why:
      'Exported with 13 callers, every one its own test — the most-tested dead control in the repo. ' +
      '"Show the saving" is unwired: the cost-saving surface the feature exists to feed does not exist, ' +
      'so the detector runs only when a test asks it to. This is T-43.',
    declaration: /export\s+function\s+detectRepeatedRequest\s*\(/,
    consumer: /detectRepeatedRequest\s*\(/,
    consumerScope: 'external',
  },
  {
    id: 'command-contract-c6',
    shape: 'input',
    symbol: 'commandContractMetadata',
    description:
      'The C6 command contract — a command handler may declare `risk`, `approval` and `idempotency`, and the bus reads them.',
    why:
      'The READER is wired: `commandContractMetadata(handler)` is called at `command-bus.ts:452` in ' +
      'production. The WRITERS are not: zero handlers declare any of the three fields, so the reader ' +
      'always gets `null` and the bus adds no key. The contract is dead at runtime while looking ' +
      'completely alive — the reader, the type, the test and the docblock are all present. This is T-29, ' +
      'and it is the shape that most deserves a check: wiring a reader to a field nobody fills is ' +
      'harder to see than a function nobody calls.',
    // The read side, so the check can prove the consumer exists before blaming the producers.
    consumer: /commandContractMetadata\s*\(/,
    consumerScope: 'any',
    // The function's own signature contains `commandContractMetadata(` and must not count as a
    // consumer of itself — the same self-match every other control's declaration regex excludes.
    declaration: /export\s+function\s+commandContractMetadata\s*\(/,
    // What would supply the contract. Any handler declaring one of the three C6 fields.
    producer: /^\s*(?:risk|approval|idempotency)\s*:/,
    producerNote:
      'A handler declaring `risk`, `approval` or `idempotency` at statement start. Zero found in ' +
      'production, so the contract is declared nowhere and the reader returns `null` for every handler.',
  },
]

/**
 * Replace the CONTENT of every string literal, comment and REGEX LITERAL with spaces, keeping the
 * length and the newlines so a line index still lines up afterwards. Template `${...}`
 * interpolations are KEPT — they are real code and may legitimately reference a control.
 *
 * This is the load-bearing part of the script, and it was wrong twice before it was right:
 *
 *  1. Without string/comment stripping, `auth/acl.ts:77`'s "...which is why it is never
 *     delegable..." counted as a read of `.delegable`, and the control looked wired.
 *  2. Without regex-literal stripping, THIS FILE counted as a consumer of itself: the registry's
 *     own `consumer: /\.delegable\b|\[['"]delegable['"]\]/` contains a quote inside a character
 *     class, which string-stripping alone reads as a string delimiter — so the `\.delegable`
 *     before it survives and the check reports its own source as the control's consumer.
 *
 * Both failures point the same way: a dead control looking WIRED. That is the one direction a
 * coverage check must never be wrong in.
 *
 * Regex vs division is disambiguated the way every lexer does it — by what precedes the slash.
 * After an identifier, number, `)` or `]` a `/` is division; anywhere else it opens a literal.
 * (`}` counts as a literal opener: a block boundary is far more often followed by a statement than
 * by a division.)
 */
function strip(text) {
  let out = ''
  let i = 0
  const n = text.length
  /** Last significant character emitted — what a `/` would be operating on. */
  let lastSig = ''

  /** Is a `/` here division rather than the start of a regex literal? */
  const isDivision = () => lastSig === ')' || lastSig === ']' || /[\w$]/.test(lastSig)

  /** Blank `count` characters, preserving newlines. */
  const blank = (count) => {
    for (let k = 0; k < count; k += 1) out += ' '
  }

  while (i < n) {
    const c = text[i]
    const c2 = text[i + 1]

    if (c === '/' && c2 === '/') {
      while (i < n && text[i] !== '\n') {
        out += ' '
        i += 1
      }
      continue
    }
    if (c === '/' && c2 === '*') {
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
        out += text[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += '  '
        i += 2
      }
      continue
    }
    if (c === '"' || c === "'") {
      const q = c
      out += q
      i += 1
      while (i < n && text[i] !== q) {
        if (text[i] === '\\') {
          out += '  '
          i += 2
          continue
        }
        out += text[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += q
        i += 1
      }
      lastSig = q
      continue
    }
    if (c === '`') {
      out += '`'
      i += 1
      while (i < n && text[i] !== '`') {
        if (text[i] === '\\') {
          out += '  '
          i += 2
          continue
        }
        if (text[i] === '$' && text[i + 1] === '{') {
          out += '${'
          lastSig = '{'
          i += 2
          continue
        }
        out += text[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += '`'
        i += 1
      }
      lastSig = '`'
      continue
    }
    // A regex literal. Blank everything to the closing `/`, respecting `[...]` classes where a `/`
    // is an ordinary character and does not close the literal.
    if (c === '/' && !isDivision()) {
      out += '/'
      i += 1
      let inClass = false
      while (i < n) {
        const rc = text[i]
        if (rc === '\\') {
          out += '  '
          i += 2
          continue
        }
        if (rc === '[') inClass = true
        else if (rc === ']') inClass = false
        else if (rc === '/' && !inClass) {
          out += '/'
          i += 1
          break
        } else if (rc === '\n') {
          // An unterminated literal on one line: stop, do not swallow the rest of the file.
          out += '\n'
          i += 1
          break
        }
        out += rc === '\n' ? '\n' : ' '
        i += 1
      }
      // Flags (`g`, `i`, `m`, …) follow the closing slash and are copied through.
      while (i < n && /[a-z]/.test(text[i])) {
        out += text[i]
        lastSig = text[i]
        i += 1
      }
      continue
    }

    out += c
    if (!/\s/.test(c)) lastSig = c
    i += 1
  }
  return out
}

function isTestFile(file) {
  return (
    /[\\/]__tests__[\\/]/.test(file) ||
    /[\\/]__integration__[\\/]/.test(file) ||
    /[\\/]__e2e__[\\/]/.test(file) ||
    /\.(test|spec)\.(ts|tsx|js|mjs)$/.test(file)
  )
}

/** Collect source files. `includeTests` controls whether test files are walked — they are needed
 *  for the "exercised only by its own test" figure, which is the difference between a dead control
 *  and an untested one. */
function walk(dir, out = [], includeTests = true) {
  if (!existsSync(dir)) return out
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (ALWAYS_SKIP.has(entry)) continue
    if (!includeTests && (TEST_DIRS.has(entry) || isTestFile(entry))) continue
    const full = path.join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, out, includeTests)
    else if (SOURCE_EXT.test(entry) && !entry.includes('.generated.')) out.push(full)
  }
  return out
}

function normalize(file) {
  return file.split(path.sep).join('/')
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

/**
 * Read a file once, stripped, and keep line boundaries so the caller can still report real line
 * numbers. `strippedLines[i]` corresponds to `lines[i]` in the original.
 */
function readStrippedLines(file) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return null
  }
  const stripped = strip(text)
  // strip() preserves newlines, so the line counts match; split both and pair them.
  const orig = text.split(/\r?\n/)
  const bare = stripped.split('\n')
  return orig.map((line, i) => (bare[i] === undefined ? strip(line) : bare[i]))
}

function checkControl(control, root) {
  const prodFiles = []
  const allFiles = []
  for (const scanRoot of SCAN_ROOTS) {
    prodFiles.push(...walk(path.join(root, scanRoot), [], false))
    allFiles.push(...walk(path.join(root, scanRoot)))
  }

  const declarationSites = []
  const consumerSites = { prod: [], test: [] }
  const producerSites = { prod: [], test: [] }

  for (const file of allFiles) {
    const lines = readStrippedLines(file)
    if (!lines) continue
    const rel = normalize(path.relative(root, file))
    const inTest = isTestFile(file)
    const bucket = inTest ? consumerSites.test : consumerSites.prod
    const prodBucket = inTest ? producerSites.test : producerSites.prod

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (control.declaration && control.declaration.test(line)) {
        declarationSites.push({ file: rel, line: i + 1 })
      }
      if (control.consumer.test(line)) {
        bucket.push({ file: rel, line: i + 1 })
      }
      if (control.shape === 'input' && control.producer && control.producer.test(line)) {
        prodBucket.push({ file: rel, line: i + 1 })
      }
    }
  }

  // A declaration line can also match the consumer pattern (`export function foo(` contains `foo(`).
  // It is not a consumer of itself.
  const declKey = new Set(declarationSites.map((d) => `${d.file}:${d.line}`))
  const isDeclaration = (site) => declKey.has(`${site.file}:${site.line}`)

  const prodConsumers = consumerSites.prod.filter((s) => !isDeclaration(s))
  const testConsumers = consumerSites.test.filter((s) => !isDeclaration(s))
  const prodProducers = producerSites.prod.filter((s) => !isDeclaration(s))

  // For `export`-shaped controls a same-file consumer is usually recursion, so the scope decides.
  const countedConsumers =
    control.consumerScope === 'external'
      ? prodConsumers.filter((s) => !declarationSites.some((d) => d.file === s.file))
      : prodConsumers

  let verdict
  let detail
  if (declarationSites.length === 0 && control.shape !== 'input') {
    verdict = 'SKIP'
    detail = 'no declaration found in this tree — not registered, and not a green'
  } else if (control.shape === 'input') {
    // The input shape is covered only when a producer actually writes the field.
    verdict = prodProducers.length > 0 ? 'COVERED' : 'DEAD-INPUT'
    detail =
      prodProducers.length > 0
        ? `${prodProducers.length} production producer(s) declare the contract`
        : `consumer is wired but ${prodProducers.length} production producers write the contract`
  } else {
    verdict = countedConsumers.length > 0 ? 'COVERED' : 'UNCOVERED'
    detail =
      countedConsumers.length > 0
        ? `${countedConsumers.length} production consumer(s)`
        : 'no production consumer'
  }

  return {
    id: control.id,
    shape: control.shape,
    symbol: control.symbol,
    description: control.description,
    why: control.why,
    verdict,
    detail,
    declarations: declarationSites.length,
    declarationSites: declarationSites.slice(0, 8),
    prodConsumers: prodConsumers.length,
    countedConsumers: countedConsumers.length,
    testConsumers: testConsumers.length,
    consumerSites: countedConsumers.slice(0, 8),
    prodProducers: prodProducers.length,
    producerNote: control.producerNote || null,
  }
}

function report(results, options) {
  if (options.json) {
    process.stdout.write(JSON.stringify({ controls: results }, null, 2) + '\n')
    return
  }
  const out = process.stdout
  out.write('Declared-control coverage (SR-47)\n')
  const counts = { COVERED: 0, UNCOVERED: 0, 'DEAD-INPUT': 0, SKIP: 0 }
  for (const r of results) counts[r.verdict] += 1
  out.write(
    `- controls: ${results.length}  (covered ${counts.COVERED}, uncovered ${counts.UNCOVERED}, ` +
      `dead-input ${counts['DEAD-INPUT']}, skipped ${counts.SKIP})\n`,
  )

  for (const r of results) {
    out.write(`\n${r.verdict}  ${r.id}  [${r.shape}]\n`)
    out.write(`  ${r.description}\n`)
    out.write(`  declarations: ${r.declarations}`)
    for (const d of r.declarationSites) out.write(`  ${d.file}:${d.line}`)
    out.write('\n')
    out.write(
      `  consumers: ${r.countedConsumers} production, ${r.testConsumers} test-only` +
        (r.shape === 'input' ? `   producers: ${r.prodProducers} production` : '') +
        `  — ${r.detail}\n`,
    )
    for (const s of r.consumerSites) out.write(`    - ${s.file}:${s.line}\n`)
    if (r.verdict !== 'COVERED') {
      out.write(`  WHY IT MATTERS: ${r.why}\n`)
      if (r.producerNote) out.write(`  PRODUCER TEST: ${r.producerNote}\n`)
    }
  }

  const uncovered = results.filter((r) => r.verdict === 'UNCOVERED' || r.verdict === 'DEAD-INPUT')
  if (uncovered.length > 0) {
    out.write(`\nControls with no production consumer (${uncovered.length}):\n`)
    for (const r of uncovered) out.write(`  ${r.verdict}  ${r.id}  — ${r.symbol}\n`)
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
      'Usage: node scripts/check-declared-controls.mjs [--fail] [--json] [--root <dir>]\n',
    )
    return 0
  }

  const results = CONTROLS.map((control) => checkControl(control, options.root))
  report(results, options)

  const bad = results.filter((r) => r.verdict === 'UNCOVERED' || r.verdict === 'DEAD-INPUT')
  const summary =
    bad.length > 0
      ? `\n${bad.length} of ${results.length} declared control(s) have no production consumer. ` +
          'Wire the consumer or delete the control — a half-built control is the defect.\n'
      : `\nAll ${results.length} declared control(s) have a production consumer.\n`

  // Keep `--json` pure JSON on stdout (the repo's convention); the status line goes to stderr,
  // and always to stderr on failure, where a CI reader looks.
  if (options.json || bad.length > 0) process.stderr.write(summary)
  else process.stdout.write(summary)

  return options.fail && bad.length > 0 ? 1 : 0
}

process.exitCode = main()
