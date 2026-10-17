/**
 * Tests for `scripts/check-digital-twins.mjs` (SR-38).
 *
 * TWO LAYERS, ON PURPOSE
 * ----------------------
 * Most of the check is driven end-to-end through `--root <tmp>` with fixture files written under a
 * scratch tree — the same shape the two-reads suite uses. But ONE rule cannot be reached that way:
 * the "typechecked location" rule reads the fixture path **as the registry declares it**, not as it
 * resolves on disk, so a `--root` fixture can never make it fire. That rule is load-bearing — a twin
 * under `__tests__` is invisible to the package `tsc`, so drift in it would be silent — so it is
 * tested directly against the exported predicate instead of being left unproven.
 *
 * The case with teeth in the end-to-end layer is the import: a twin that merely *re-states* the
 * shape in prose compiles, so only the `import … from '<owning module>'` makes the type system the
 * mechanism. A checker that accepted a hand-copied shape would green-light exactly the drift SR-38
 * exists to catch.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import { importsType, isTypecheckedLocation } from '../check-digital-twins.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, '..', 'check-digital-twins.mjs')
const FIXTURE_REL = path.join('packages', 'core', 'src', 'testing', 'digital-twin', 'authority.ts')
const SEMANTIC_TEST_REL = path.join(
  'packages',
  'core',
  'src',
  'modules',
  'auth',
  'services',
  '__tests__',
  'record-lock-ceiling.twin.test.ts',
)

let base

/** A fixture that satisfies all three registered twins: every import, symbol, and `satisfies`. */
const GOOD_FIXTURE = [
  "import type { RecordLockState } from '@open-mercato/shared/modules/record-locks'",
  "import type { AutonomyGate } from '@open-mercato/shared/modules/capabilities'",
  "import type { AuthorityScope } from '../../modules/auth/services/authorityEnforcementService'",
  '',
  "export const RECORD_LOCK_CEILING_TWIN = { open: null, restricted: 'A2', locked: 'A0' } satisfies Record<RecordLockState, AutonomyGate | null>",
  "export const AUTONOMY_GATE_TWIN = { A0: 'refuse' } satisfies Record<AutonomyGate, string>",
  "export const ANONYMOUS_SCOPE_TWIN = { tenantId: null, organizationId: null } satisfies AuthorityScope",
  '',
].join('\n')

function writeFixture(body) {
  const full = path.join(base, FIXTURE_REL)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, body)
}

/** The file the fixture's docblock promises — the wiring check only needs it to exist. */
function writeSemanticTest() {
  const full = path.join(base, SEMANTIC_TEST_REL)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, '// stub for the wiring check\n')
}

/** The whole wiring, correct: the fixture plus the semantic test it names. */
function writeGood() {
  writeFixture(GOOD_FIXTURE)
  writeSemanticTest()
}

function clear() {
  rmSync(path.join(base, 'packages'), { recursive: true, force: true })
}

function run(extra = []) {
  const result = spawnSync(process.execPath, [CHECKER, '--root', base, '--json', ...extra], {
    encoding: 'utf8',
  })
  return { status: result.status, report: JSON.parse(result.stdout), stderr: result.stderr }
}

/** Find one twin's result by id. */
function twin(report, id) {
  return report.twins.find((t) => t.id === id)
}

describe('check-digital-twins (SR-38)', () => {
  before(() => {
    base = mkdtempSync(path.join(tmpdir(), 'digital-twins-'))
  })
  after(() => {
    rmSync(base, { recursive: true, force: true })
  })
  beforeEach(clear)

  it('passes a fully-wired twin and the census exits 0', () => {
    writeGood()
    const { status, report } = run()
    assert.equal(status, 0)
    assert.equal(report.failed, 0)
    assert.equal(report.twins.length, 3)
    for (const t of report.twins) assert.equal(t.verdict, 'PASS', `${t.id} should pass`)
  })

  it('fails a missing fixture', () => {
    const { report } = run()
    assert.equal(report.failed, 3)
    for (const t of report.twins) {
      assert.equal(t.verdict, 'FAIL')
      assert.ok(
        t.problems.some((p) => /fixture not found/.test(p)),
        'the problem must name the missing fixture',
      )
    }
  })

  // ★ THE TRAP — re-stating the shape is not importing it.
  it('fails a twin that does not import the real type from its owning module', () => {
    const withoutImport = GOOD_FIXTURE.replace(
      "import type { RecordLockState } from '@open-mercato/shared/modules/record-locks'\n",
      '',
    )
    writeFixture(withoutImport)
    writeSemanticTest()
    const { report } = run()
    assert.equal(report.failed, 1)
    const failing = twin(report, 'record-lock-ceiling-twin')
    assert.equal(failing.verdict, 'FAIL')
    assert.ok(failing.problems.some((p) => /does not import RecordLockState/.test(p)))
    assert.equal(twin(report, 'autonomy-gate-twin').verdict, 'PASS', 'the others are unaffected')
  })

  it('fails a twin whose satisfies clause is dropped', () => {
    const withoutSatisfies = GOOD_FIXTURE.replace(
      ' satisfies Record<RecordLockState, AutonomyGate | null>',
      '',
    )
    writeFixture(withoutSatisfies)
    writeSemanticTest()
    const { report } = run()
    assert.equal(report.failed, 1)
    assert.equal(twin(report, 'record-lock-ceiling-twin').verdict, 'FAIL')
  })

  it('fails a twin that does not declare the symbol', () => {
    const renamed = GOOD_FIXTURE.replace('export const ANONYMOUS_SCOPE_TWIN', 'export const NOPE')
    writeFixture(renamed)
    writeSemanticTest()
    const { report } = run()
    assert.equal(report.failed, 1)
    const failing = twin(report, 'authority-scope-twin')
    assert.equal(failing.verdict, 'FAIL')
    assert.ok(failing.problems.some((p) => /does not declare/.test(p)))
  })

  it('fails when the fixture names a semantic test that is not there', () => {
    writeFixture(GOOD_FIXTURE) // the fixture is fine — only the file it promises is absent
    const { report } = run()
    assert.equal(report.failed, 1)
    const failing = twin(report, 'record-lock-ceiling-twin')
    assert.equal(failing.verdict, 'FAIL')
    assert.ok(failing.problems.some((p) => /semantic test that does not exist/.test(p)))
    assert.equal(twin(report, 'autonomy-gate-twin').verdict, 'PASS', 'a twin with no promise is fine')
  })

  it('--fail exits 1 on an unwired twin; the census exits 0', () => {
    const failing = spawnSync(process.execPath, [CHECKER, '--root', base, '--fail'], {
      encoding: 'utf8',
    })
    assert.equal(failing.status, 1)
    const census = spawnSync(process.execPath, [CHECKER, '--root', base], { encoding: 'utf8' })
    assert.equal(census.status, 0, 'the census is a report — it must still exit 0')
  })

  it('keeps --json pure on stdout and puts the status line on stderr', () => {
    const { stderr } = run()
    assert.match(stderr, /not wired/i)
  })
})

describe('check-digital-twins predicates (SR-38)', () => {
  it('recognises each import form and rejects the wrong name or module', () => {
    assert.equal(importsType("import { A } from 'x'", 'A', 'x'), true)
    assert.equal(importsType("import type { A } from 'x'", 'A', 'x'), true)
    assert.equal(importsType("import { type A } from 'x'", 'A', 'x'), true)
    assert.equal(importsType("import { B } from 'x'", 'A', 'x'), false, 'wrong name')
    assert.equal(importsType("import { A } from 'y'", 'A', 'x'), false, 'wrong module')
  })

  // ★ THE LOAD-BEARING RULE `--root` CANNOT REACH — tested directly.
  it('accepts a package src path and rejects excluded or non-src paths', () => {
    assert.equal(
      isTypecheckedLocation('packages/core/src/testing/digital-twin/authority.ts').ok,
      true,
    )
    for (const excluded of ['__tests__', '__integration__', '__e2e__']) {
      const fixture = `packages/core/src/${excluded}/authority.ts`
      assert.equal(isTypecheckedLocation(fixture).ok, false, `${excluded} is excluded from tsc`)
    }
    assert.equal(isTypecheckedLocation('apps/mercato/src/authority.ts').ok, false, 'not a package')
  })
})
