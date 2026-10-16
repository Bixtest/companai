/**
 * Tests for `scripts/check-escape-hatches.mjs` (SR-41).
 *
 * The important case is the LAST one: a rule list is NOT a reason. `// eslint-disable-next-line
 * no-console` looks named to a naive matcher — it has text after the directive — but it says
 * nothing about WHY the hole exists, which is the whole point of the convention. A checker that
 * accepted it would report a clean census over 149 holes that are all still unexplained.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, '..', 'check-escape-hatches.mjs')

let base

/** Write one fixture file into `<root>/packages/core/src/…`. */
function writeSource(relPath, body) {
  const full = path.join(base, 'packages', 'core', 'src', relPath)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, body)
}

function run(extra = []) {
  const result = spawnSync(process.execPath, [CHECKER, '--root', base, '--json', ...extra], {
    encoding: 'utf8',
  })
  return { status: result.status, report: JSON.parse(result.stdout), stderr: result.stderr }
}

describe('check-escape-hatches (SR-41)', () => {
  before(() => {
    base = mkdtempSync(path.join(tmpdir(), 'escape-hatches-'))
  })

  after(() => {
    rmSync(base, { recursive: true, force: true })
  })

  it('counts a NAMED hole of every kind and reports no findings', () => {
    writeSource(
      'named.ts',
      [
        '// eslint-disable-next-line no-console -- the CLI is the one legal writer',
        '// @ts-expect-error: upstream signature is wrong for the 3rd arg',
        '// @ts-ignore because the vendor types never shipped',
        '// @ts-nocheck -- generated-ish fixture, typed elsewhere',
        'export const x = 1',
        '',
      ].join('\n'),
    )
    const { status, report } = run()
    assert.equal(status, 0)
    assert.equal(report.unnamed, 0, 'every hole in this fixture carries a reason')
    assert.equal(report.named, 4)
    assert.equal(report.holes, 4)
    for (const kind of ['eslint-disable', 'ts-expect-error', 'ts-ignore', 'ts-nocheck']) {
      assert.equal(report.byKind[kind].total, 1, `${kind} should be counted once`)
      assert.equal(report.byKind[kind].unnamed, 0)
    }
  })

  it('lists an UNNAMED hole and fails under --fail', () => {
    rmSync(path.join(base, 'packages'), { recursive: true, force: true })
    writeSource('unnamed.ts', ['// eslint-disable-next-line no-console', 'export const y = 2', ''].join('\n'))
    const { report } = run()
    assert.equal(report.unnamed, 1)
    assert.equal(report.unnamedHoles[0].file, 'packages/core/src/unnamed.ts')
    assert.equal(report.unnamedHoles[0].line, 1)
    assert.equal(report.unnamedHoles[0].kind, 'eslint-disable')

    const failing = spawnSync(process.execPath, [CHECKER, '--root', base, '--fail'], { encoding: 'utf8' })
    assert.equal(failing.status, 1, '--fail must exit 1 when a hole is unnamed')

    const census = spawnSync(process.execPath, [CHECKER, '--root', base], { encoding: 'utf8' })
    assert.equal(census.status, 0, 'the census mode must still exit 0 — it is a report')
  })

  // ★ THE TRAP — a rule list is text, but it is not a reason.
  it('does NOT accept a bare rule list as a reason', () => {
    rmSync(path.join(base, 'packages'), { recursive: true, force: true })
    writeSource(
      'trap.ts',
      [
        '// eslint-disable-next-line no-console, no-var',
        '// eslint-disable-next-line no-console --',
        '/* @ts-expect-error */',
        'export const z = 3',
        '',
      ].join('\n'),
    )
    const { report } = run()
    assert.equal(report.unnamed, 3, 'a rule list, an empty reason and a bare block comment are all unnamed')
    assert.equal(report.named, 0)
  })

  // ★ THE PRECISION CASE — both tools only honour a directive that OPENS the comment, so prose that
  // merely MENTIONS one is not a hole. This is a real class: the repo contains lines like
  // `// TS2578 "Unused '@ts-expect-error' directive" …`.
  it('ignores a directive that does not open the comment (prose, not a hole)', () => {
    rmSync(path.join(base, 'packages'), { recursive: true, force: true })
    writeSource(
      'prose.ts',
      [
        '// TS2578 "Unused \'@ts-expect-error\' directive" and this suite would not',
        '// see @ts-expect-error for the pattern',
        '// this explains the eslint-disable rule we chose',
        'export const p = 4',
        '',
      ].join('\n'),
    )
    const { report } = run()
    assert.equal(report.holes, 0, 'prose mentioning a directive is not a hole')
    assert.equal(report.unnamed, 0)
  })

  it('keeps --json pure on stdout and puts the status line on stderr', () => {
    const { status, stderr } = run()
    assert.equal(status, 0)
    assert.match(stderr, /escape hatch/i, 'the human status line belongs on stderr under --json')
  })
})
