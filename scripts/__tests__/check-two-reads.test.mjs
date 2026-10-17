/**
 * Tests for `scripts/check-two-reads.mjs` (SR-46).
 *
 * The two cases with teeth are the middle ones. A **write** (`process.env.X = 'a'`) looks exactly
 * like a read to a naive matcher, and a checker that counted writes would report every test fixture
 * and every `ensureEnvLoaded()` as a two-reads defect. And a read that lives inside a **string or a
 * comment** is not a read at all — the lexer has to remove it first, or a file that merely *documents*
 * a setting reads as two reads of it.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, '..', 'check-two-reads.mjs')

let base

/** Write one fixture file into `<root>/packages/core/src/…`. */
function writeSource(relPath, body) {
  const full = path.join(base, 'packages', 'core', 'src', relPath)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, body)
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

describe('check-two-reads (SR-46)', () => {
  before(() => {
    base = mkdtempSync(path.join(tmpdir(), 'two-reads-'))
  })
  after(() => {
    rmSync(base, { recursive: true, force: true })
  })
  beforeEach(clear)

  it('reports a setting read twice in one file', () => {
    writeSource(
      'twice.ts',
      ['export function f() {', '  const a = process.env.CACHE_STRATEGY', '  const b = process.env.CACHE_STRATEGY', '  return a ?? b', '}', ''].join('\n'),
    )
    const { status, report } = run()
    assert.equal(status, 0)
    assert.equal(report.findings, 1)
    assert.equal(report.files[0].findings[0].setting, 'CACHE_STRATEGY')
    assert.equal(report.files[0].findings[0].reads, 2)
    assert.deepEqual(report.files[0].findings[0].lines, [2, 3])
  })

  it('does NOT report a setting read once', () => {
    writeSource('once.ts', ['export const url = process.env.APP_URL', ''].join('\n'))
    const { report } = run()
    assert.equal(report.findings, 0)
  })

  // ★ THE TRAP — a write is not a read.
  it('does NOT count a WRITE as a read', () => {
    writeSource(
      'writes.ts',
      [
        'export function setup() {',
        "  process.env.OM_TEST_MODE = '1'",
        "  process.env.OM_TEST_MODE = '2'",
        '  process.env.OM_TEST_MODE += \'x\'',
        '}',
        '',
      ].join('\n'),
    )
    const { report } = run()
    assert.equal(report.findings, 0, 'assignments are writes, not reads')
  })

  it('counts a read and a write as one read, not two', () => {
    writeSource(
      'readwrite.ts',
      [
        'export function f() {',
        "  process.env.OM_TEST_MODE = '1'",
        '  return process.env.OM_TEST_MODE',
        '}',
        '',
      ].join('\n'),
    )
    const { report } = run()
    assert.equal(report.findings, 0, 'one read plus one write is a single read')
  })

  // ★ THE PRECISION CASE — the lexer must remove strings and comments first.
  it('ignores a read inside a string or a comment (the lexer)', () => {
    writeSource(
      'prose.ts',
      [
        '// process.env.CACHE_STRATEGY is documented here',
        'export const doc = "process.env.CACHE_STRATEGY"',
        'export const real = process.env.CACHE_STRATEGY',
        '',
      ].join('\n'),
    )
    const { report } = run()
    assert.equal(report.findings, 0, 'only the one real read counts')
  })

  it('excludes test files by default and includes them with --include-tests', () => {
    writeSource(
      '__tests__/reader.test.ts',
      ['it("reads", () => {', '  const a = process.env.X', '  const b = process.env.X', '})', ''].join('\n'),
    )
    const excluded = run()
    assert.equal(excluded.report.findings, 0, 'a test file is skipped by default')
    assert.equal(excluded.report.skippedTestFiles, 1)

    const included = run(['--include-tests'])
    assert.equal(included.report.findings, 1, '--include-tests scans them')
  })

  it('--fail exits 1 on a finding; the census exits 0', () => {
    writeSource('twice.ts', ['const a = process.env.X', 'const b = process.env.X', ''].join('\n'))
    const failing = spawnSync(process.execPath, [CHECKER, '--root', base, '--fail'], { encoding: 'utf8' })
    assert.equal(failing.status, 1)
    const census = spawnSync(process.execPath, [CHECKER, '--root', base], { encoding: 'utf8' })
    assert.equal(census.status, 0, 'the census is a report — it must still exit 0')
  })

  it('keeps --json pure on stdout and puts the status line on stderr', () => {
    writeSource('twice.ts', ['const a = process.env.X', 'const b = process.env.X', ''].join('\n'))
    const { stderr } = run()
    assert.match(stderr, /read more than once/i)
  })
})
