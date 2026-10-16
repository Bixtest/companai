/**
 * Tests for `scripts/check-declared-controls.mjs` (SR-47).
 *
 * The important cases are the ones that were WRONG while the check was being built:
 *
 *  ★ THE PROSE TRAP — `auth/acl.ts:112` carries the sentence "Emphatically not itself delegable:".
 *    A raw grep reads that as a declaration site, and a naive matcher reads a `note:` string
 *    containing `.delegable` as a consumer. Both are prose. `strip()` removes them.
 *
 *  ★ THE SELF-REFERENCE TRAP — the registry's own `consumer: /\.delegable\b|\[['"]delegable['"]\]/`
 *    contains a quote inside a character class. String-stripping alone reads that as a string
 *    delimiter, the `\.delegable` before it survives, and the check reports ITSELF as the control's
 *    consumer — a dead control looking wired. Regex-literal stripping fixes it.
 *
 *  ★ THE RECURSION TRAP — `findFrontendVocabulary` calls itself at `ir.ts:217` and `:227`. A
 *    same-file consumer is usually recursion, so `export`-shaped controls count external consumers
 *    only.
 *
 * A coverage check that reports a wired control as dead is merely noisy. One that reports a dead
 * control as wired is worthless, so every test below points that direction.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, '..', 'check-declared-controls.mjs')

let base

/** Write one fixture file into `<root>/packages/…`. */
function writeSource(relPath, body) {
  const full = path.join(base, 'packages', relPath)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, Array.isArray(body) ? body.join('\n') : body)
}

/** Wipe every fixture package so each case starts from a clean tree. */
function reset() {
  rmSync(path.join(base, 'packages'), { recursive: true, force: true })
  rmSync(path.join(base, 'scripts'), { recursive: true, force: true })
}

function run(extra = []) {
  const result = spawnSync(process.execPath, [CHECKER, '--root', base, '--json', ...extra], {
    encoding: 'utf8',
  })
  return { status: result.status, report: JSON.parse(result.stdout), stderr: result.stderr }
}

/** The one control a case is about. */
function pick(report, id) {
  const control = report.controls.find((c) => c.id === id)
  assert.ok(control, `control ${id} missing from the report`)
  return control
}

/** The declaration fixture the real registry expects for `detectRepeatedRequest`. */
const REPEAT_DECLARATION = [
  'export function detectRepeatedRequest(input: { text: string; history: unknown[] }): { looksLikeRepeat: boolean } {',
  '  return { looksLikeRepeat: false }',
  '}',
  '',
].join('\n')

describe('check-declared-controls (SR-47)', () => {
  before(() => {
    base = mkdtempSync(path.join(tmpdir(), 'declared-controls-'))
  })

  after(() => {
    rmSync(base, { recursive: true, force: true })
  })

  it('reports COVERED when a production consumer exists outside the declaring file', () => {
    reset()
    writeSource('shared/src/lib/request-outcome/repeat.ts', REPEAT_DECLARATION)
    writeSource(
      'core/src/modules/assistant/request-path.ts',
      [
        "import { detectRepeatedRequest } from '../../shared/src/lib/request-outcome/repeat'",
        'export const verdict = detectRepeatedRequest({ text: "show invoices", history: [] })',
        '',
      ].join('\n'),
    )
    const { status, report } = run()
    assert.equal(status, 0)
    const control = pick(report, 'request-repeat-detector')
    assert.equal(control.verdict, 'COVERED')
    assert.equal(control.countedConsumers, 1)
    assert.equal(control.testConsumers, 0)
  })

  // ★ THE CORE DISTINCTION — a control exercised only by its own test is dead in production.
  //    `detectRepeatedRequest` has 13 callers in the real repo and every one of them is its test.
  it('reports UNCOVERED when the only consumers are tests', () => {
    reset()
    writeSource('shared/src/lib/request-outcome/repeat.ts', REPEAT_DECLARATION)
    writeSource(
      'shared/src/lib/request-outcome/__tests__/repeat.test.ts',
      [
        "import { detectRepeatedRequest } from '../repeat'",
        'describe("S8", () => {',
        '  it("is not a repeat", () => {',
        '    expect(detectRepeatedRequest({ text: "x", history: [] }).looksLikeRepeat).toBe(false)',
        '  })',
        '})',
        '',
      ].join('\n'),
    )
    const { report } = run()
    const control = pick(report, 'request-repeat-detector')
    assert.equal(control.verdict, 'UNCOVERED', 'a test-only consumer must not read as wired')
    assert.equal(control.countedConsumers, 0)
    assert.equal(control.testConsumers, 1, 'the test consumer is still counted, and reported')
  })

  // ★ THE PROSE TRAP — a sentence containing the word must not read as a declaration or a consumer.
  //    The real repo has five such notes; `auth/acl.ts:112` is "Emphatically not itself delegable:".
  it('does NOT let prose fake a declaration or a consumer', () => {
    reset()
    writeSource(
      'core/src/modules/auth/acl.ts',
      [
        "      note: 'Emphatically not itself delegable: somebody who can delegate the power to delegate",
        "        has created a chain nobody can see the end of.',",
        "    capability: { effectClass: 'E5', reversibility: 'reversible', delegable: false },",
        '',
      ].join('\n'),
    )
    writeSource(
      'core/src/modules/other/notes.ts',
      [
        "// this capability is never delegable: handing on the power to raise autonomy is how it rots",
        "export const why = 'the field .delegable is declared and never read anywhere'",
        '',
      ].join('\n'),
    )
    const { report } = run()
    const control = pick(report, 'capability-delegable')
    // Exactly ONE declaration site: the object literal on line 3. The prose on line 1 is gone.
    assert.equal(control.declarations, 1, 'a sentence ending in "delegable:" is not a declaration')
    assert.equal(control.verdict, 'UNCOVERED', 'a comment and a string mentioning the field are not consumers')
    assert.equal(control.countedConsumers, 0)
    assert.equal(control.testConsumers, 0)
  })

  // ★ THE SELF-REFERENCE TRAP — the exact shape that made this check report itself as the consumer.
  //    A regex literal containing a quote inside a character class must not be read as a string.
  it('does NOT count its own registry as a consumer of the control it checks', () => {
    reset()
    writeSource(
      'core/src/modules/auth/acl.ts',
      ['    capability: { effectClass: "E5", reversibility: "reversible", delegable: false },', ''].join('\n'),
    )
    // The registry's own line, verbatim, in a production file.
    writeSource(
      'core/src/modules/auth/registry.ts',
      [
        'export const CONSUMER = /\\.delegable\\b|\\[\'"]delegable[\'"]\\]/',
        'export const DECLARATION = /delegable\\s*\\?\\s*:|delegable\\s*:/',
        '',
      ].join('\n'),
    )
    const { report } = run()
    const control = pick(report, 'capability-delegable')
    assert.equal(control.verdict, 'UNCOVERED', 'a regex literal naming the field is not a consumer')
    assert.equal(control.countedConsumers, 0)
  })

  // ★ THE RECURSION TRAP — `findFrontendVocabulary` calls itself twice inside its own file.
  //    A same-file consumer must not make the control look wired.
  it('does NOT count a recursive self-call as a consumer', () => {
    reset()
    writeSource(
      'shared/src/lib/business-widget/ir.ts',
      [
        'export function findFrontendVocabulary(value: unknown, path = "$"): string[] {',
        '  const found: string[] = []',
        '  if (Array.isArray(value)) {',
        '    for (const entry of value) found.push(...findFrontendVocabulary(entry, path))',
        '  }',
        '  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {',
        '    found.push(...findFrontendVocabulary(entry, `${path}.${key}`))',
        '  }',
        '  return found',
        '}',
        '',
      ].join('\n'),
    )
    const { report } = run()
    const control = pick(report, 'business-widget-frontend-vocabulary')
    assert.equal(control.verdict, 'UNCOVERED', 'self-recursion is not a consumer')
    assert.equal(control.countedConsumers, 0)
    assert.equal(control.declarations, 1)
  })

  // The third shape: the READER is wired but nothing WRITES the field it reads.
  it('reports DEAD-INPUT when a consumer exists but no producer declares the contract', () => {
    reset()
    writeSource(
      'shared/src/lib/commands/command-bus.ts',
      [
        'export function commandContractMetadata(handler: Record<string, unknown>): unknown {',
        '  const out: Record<string, unknown> = {}',
        '  if (handler.risk) out.risk = handler.risk',
        '  if (handler.approval) out.approval = handler.approval',
        '  if (handler.idempotency) out.idempotency = handler.idempotency',
        '  return Object.keys(out).length > 0 ? out : null',
        '}',
        'export function run(handler: Record<string, unknown>) {',
        '  return commandContractMetadata(handler)',
        '}',
        '',
      ].join('\n'),
    )
    const { report } = run()
    const control = pick(report, 'command-contract-c6')
    assert.equal(control.verdict, 'DEAD-INPUT', 'the reader is wired; the writers are not')
    assert.equal(control.countedConsumers, 1, 'the consumer must still be counted, so the shape is visible')
    assert.equal(control.prodProducers, 0)
  })

  it('reports COVERED for the input shape once a producer declares the contract', () => {
    reset()
    writeSource(
      'shared/src/lib/commands/command-bus.ts',
      [
        'export function commandContractMetadata(handler: Record<string, unknown>): unknown {',
        '  return handler.risk ? { risk: handler.risk } : null',
        '}',
        'export function run(handler: Record<string, unknown>) {',
        '  return commandContractMetadata(handler)',
        '}',
        '',
      ].join('\n'),
    )
    writeSource(
      'core/src/modules/sales/commands/invoice.ts',
      [
        'export const invoiceCommand = {',
        '  risk: "high",',
        '  approval: { mode: "per-act" },',
        '  idempotency: { idempotent: false },',
        '}',
        '',
      ].join('\n'),
    )
    const { report } = run()
    const control = pick(report, 'command-contract-c6')
    assert.equal(control.verdict, 'COVERED', 'a handler declaring the contract makes the reader real')
    // `prodProducers` counts declaration LINES, and this fixture declares three C6 fields
    // (`risk`, `approval`, `idempotency`) on one handler — so 3, not 1.
    assert.equal(control.prodProducers, 3)
  })

  // A control absent from the tree is reported, never silently passed over — the same rule
  // `check-one-truth.mjs` applies to an absent representation.
  it('reports SKIP, not a green, when the control is absent from the tree', () => {
    reset()
    writeSource('core/src/unrelated.ts', ['export const nothing = 1', ''].join('\n'))
    const { status, report } = run()
    assert.equal(status, 0)
    for (const id of ['request-repeat-detector', 'authority-policy-problems', 'trust-demote-if-evidence-demands']) {
      assert.equal(pick(report, id).verdict, 'SKIP', `${id} has no declaration in this tree`)
    }
  })

  it('exits 0 by default and 1 under --fail when a control is uncovered', () => {
    reset()
    writeSource('shared/src/lib/request-outcome/repeat.ts', REPEAT_DECLARATION)
    const census = spawnSync(process.execPath, [CHECKER, '--root', base], { encoding: 'utf8' })
    assert.equal(census.status, 0, 'the default mode is a report, not a gate')
    const failing = spawnSync(process.execPath, [CHECKER, '--root', base, '--fail'], { encoding: 'utf8' })
    assert.equal(failing.status, 1, '--fail must exit 1 when a control has no production consumer')
  })

  it('keeps --json pure on stdout and puts the status line on stderr', () => {
    reset()
    writeSource('shared/src/lib/request-outcome/repeat.ts', REPEAT_DECLARATION)
    const { status, stderr } = run()
    assert.equal(status, 0)
    assert.match(stderr, /declared control/i, 'the human status line belongs on stderr under --json')
  })
})
