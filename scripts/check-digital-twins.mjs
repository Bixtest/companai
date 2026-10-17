#!/usr/bin/env node
/**
 * Digital-twin wiring check — `SR-38` (openrig's harness, generalised).
 *
 * WHAT IT GUARDS, AND WHAT IT DOES NOT
 * ------------------------------------
 * The mechanism of SR-38 is the TYPE SYSTEM: a twin is a fixture declared `satisfies <RealType>`, so
 * a drifted interface fails `tsc`. This check does not re-do that — it guards the wiring that makes
 * `tsc` able to do it. For every registered twin it verifies six things:
 *
 *   1. the fixture file EXISTS;
 *   2. it IMPORTS each real type from the module that owns it — not a hand-copied shape;
 *   3. it DECLARES the twin symbol (`export const …`);
 *   4. it carries a `satisfies <RealType>` — the clause that turns drift into a build error;
 *   5. it lives in a TYPECHECKED location (`packages/<pkg>/src/**`, and NOT under `__tests__`,
 *      which the package tsconfigs exclude);
 *   6. the SEMANTIC test it names (if it names one) EXISTS. `satisfies` checks a twin's shape, never
 *      its values; a fixture that promises "asserted against this map by <file>" must have that file,
 *      or the promise is a comment that rots.
 *
 * So the split is clean: **this check guards completeness** (every registered twin is present and
 * wired), **`tsc` guards correctness** (the twin actually matches the interface). A twin that is
 * deleted, unregistered, moved out of `src`, or has its `satisfies` dropped fails here; a twin
 * whose real interface moved fails the build. Neither check alone is the mechanism.
 *
 * USAGE
 * -----
 *   node scripts/check-digital-twins.mjs                  # census (exit 0)
 *   node scripts/check-digital-twins.mjs --fail           # exit 1 if any twin is unwired
 *   node scripts/check-digital-twins.mjs --json           # machine-readable report
 *   node scripts/check-digital-twins.mjs --root <dir>     # check another checkout (used by the test)
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

/**
 * The registry. One entry per twin. Adding a twin is a data change here — plus the fixture itself.
 *
 * `realTypes` names each type the fixture must import, and from where, EXACTLY as it is written in
 * the import statement (a package specifier or a relative path). `satisfies` is the clause the
 * fixture must carry.
 */
export const TWINS = [
  {
    id: 'record-lock-ceiling-twin',
    description: 'The ceiling each RecordLockState imposes on a write.',
    fixture: 'packages/core/src/testing/digital-twin/authority.ts',
    symbol: 'RECORD_LOCK_CEILING_TWIN',
    realTypes: [
      { name: 'RecordLockState', from: '@open-mercato/shared/modules/record-locks' },
      { name: 'AutonomyGate', from: '@open-mercato/shared/modules/capabilities' },
    ],
    satisfies: 'Record<RecordLockState, AutonomyGate | null>',
    semanticTest: 'packages/core/src/modules/auth/services/__tests__/record-lock-ceiling.twin.test.ts',
  },
  {
    id: 'autonomy-gate-twin',
    description: 'What each AutonomyGate does to an act.',
    fixture: 'packages/core/src/testing/digital-twin/authority.ts',
    symbol: 'AUTONOMY_GATE_TWIN',
    realTypes: [{ name: 'AutonomyGate', from: '@open-mercato/shared/modules/capabilities' }],
    satisfies: 'Record<AutonomyGate, string>',
  },
  {
    id: 'authority-scope-twin',
    description: 'The two ids every authority reader is scoped by.',
    fixture: 'packages/core/src/testing/digital-twin/authority.ts',
    symbol: 'ANONYMOUS_SCOPE_TWIN',
    realTypes: [
      { name: 'AuthorityScope', from: '../../modules/auth/services/authorityEnforcementService' },
    ],
    satisfies: 'AuthorityScope',
  },
]

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Does `text` import `name` from `from`? Handles `import { x }`, `import { type x }`, `import type { x }`. */
export function importsType(text, name, from) {
  const pattern = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${escapeRegExp(name)}\\b[^}]*\\}\\s+from\\s+['"]${escapeRegExp(from)}['"]`,
  )
  return pattern.test(text)
}

/** Does `text` declare `export const <symbol>`? */
export function declaresSymbol(text, symbol) {
  return new RegExp(`export\\s+const\\s+${escapeRegExp(symbol)}\\b`).test(text)
}

/** Does `text` carry a `satisfies <clause>`? That clause is what turns interface drift into a build error. */
export function carriesSatisfies(text, clause) {
  return new RegExp(`satisfies\\s+${escapeRegExp(clause)}`).test(text)
}

/** Is a fixture path in a location a package tsconfig typechecks? */
export function isTypecheckedLocation(fixture) {
  const normalized = fixture.split(path.sep).join('/')
  const underSrc = /^packages\/[^/]+\/src\//.test(normalized)
  const excluded = /(^|\/)(__tests__|__integration__|__e2e__)(\/|$)/.test(normalized)
  return { ok: underSrc && !excluded, underSrc, excluded }
}

export function checkTwin(twin, root) {
  const problems = []
  const fixturePath = path.resolve(root, twin.fixture)

  if (!existsSync(fixturePath)) {
    return { ...twin, verdict: 'FAIL', problems: [`fixture not found: ${twin.fixture}`] }
  }

  let text
  try {
    text = readFileSync(fixturePath, 'utf8')
  } catch (error) {
    return { ...twin, verdict: 'FAIL', problems: [`fixture unreadable: ${String(error)}`] }
  }

  const location = isTypecheckedLocation(twin.fixture)
  if (!location.ok) {
    problems.push(
      location.excluded
        ? `fixture is under an excluded directory (tsc will not see it): ${twin.fixture}`
        : `fixture is not under a package src/ (tsc will not see it): ${twin.fixture}`,
    )
  }

  for (const realType of twin.realTypes) {
    if (!importsType(text, realType.name, realType.from)) {
      problems.push(`does not import ${realType.name} from '${realType.from}'`)
    }
  }

  if (!declaresSymbol(text, twin.symbol)) {
    problems.push(`does not declare 'export const ${twin.symbol}'`)
  }

  if (!carriesSatisfies(text, twin.satisfies)) {
    problems.push(`does not carry 'satisfies ${twin.satisfies}'`)
  }

  if (twin.semanticTest && !existsSync(path.resolve(root, twin.semanticTest))) {
    problems.push(`names a semantic test that does not exist: ${twin.semanticTest}`)
  }

  return { ...twin, verdict: problems.length === 0 ? 'PASS' : 'FAIL', problems }
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

export function scan(root) {
  const twins = TWINS.map((twin) => checkTwin(twin, root))
  return { twins, failed: twins.filter((t) => t.verdict === 'FAIL').length }
}

function report(result, options) {
  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }
  const out = process.stdout
  out.write('Digital-twin wiring (SR-38)\n')
  out.write(`- twins registered: ${result.twins.length}  (wired ${result.twins.length - result.failed}, unwired ${result.failed})\n`)
  for (const twin of result.twins) {
    out.write(`\n${twin.verdict}  ${twin.id}\n  ${twin.description}\n  fixture: ${twin.fixture}\n`)
    for (const problem of twin.problems) out.write(`    - ${problem}\n`)
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
    process.stdout.write('Usage: node scripts/check-digital-twins.mjs [--fail] [--json] [--root <dir>]\n')
    return 0
  }

  const result = scan(options.root)
  report(result, options)

  const summary =
    result.failed > 0
      ? `\n${result.failed} digital twin(s) are not wired — a fixture is missing, unimported, unannotated, or outside tsc.\n`
      : `\nAll ${result.twins.length} digital twin(s) are wired into a typecheck.\n`

  // Keep `--json` pure JSON on stdout (the repo's convention), so the status line goes to stderr.
  if (options.json) process.stderr.write(summary)
  else process.stdout.write(summary)

  return options.fail && result.failed > 0 ? 1 : 0
}

// Run only when invoked as a script. Importing this module (the test suite does, to reach the pure
// predicates) must NOT execute the census or touch `process.exitCode`.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) process.exitCode = main()
