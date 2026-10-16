/**
 * Tests for `scripts/check-one-truth.mjs` (SR-39).
 *
 * The important case is the LAST one: a mutation proof. A checker that only ever reports PASS is
 * indistinguishable from a checker that does nothing — so the fixture is deliberately drifted and
 * the test asserts the check FAILS and names the stale copy. That is the behaviour that would have
 * caught `CC-90` at the re-pin.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CHECKER = path.resolve(HERE, '..', 'check-one-truth.mjs')

const DIGEST_A = '07ee857bdab59a875317035d8aaad4d6'
const DIGEST_B = 'ca760e97ff1ef1f0e2ed3deb0dfc2923'

let base
let repoRoot
let docsRoot

/**
 * Write the three copies of the pin digest. The docs repo is a SIBLING of the code repo
 * (`../../library/…`), which is why the fixture nests the code repo one level down.
 */
function writeFixture({ verify, compose, pinpy, verifyBody }) {
  mkdirSync(path.join(repoRoot, 'docker', 'hermes'), { recursive: true })
  mkdirSync(docsRoot, { recursive: true })

  writeFileSync(
    path.join(repoRoot, 'docker', 'hermes', 'verify_pin.py'),
    verifyBody ?? `# fixture\nDEFAULT_EXPECTED_DIGEST = "${verify}"\n`,
  )
  writeFileSync(
    path.join(repoRoot, 'docker-compose.hermes.yml'),
    `services:\n  hermes:\n    environment:\n      HERMES_PIN_DIGEST: \${HERMES_PIN_DIGEST:-${compose}}\n`,
  )
  writeFileSync(path.join(docsRoot, '.hermes_pin.py'), `# fixture\nEXPECTED_DIGEST = "${pinpy}"\n`)
}

function run() {
  const result = spawnSync(process.execPath, [CHECKER, '--root', repoRoot, '--json'], {
    encoding: 'utf8',
  })
  return { status: result.status, report: JSON.parse(result.stdout), stderr: result.stderr }
}

const factOf = (report, id) => report.facts.find((fact) => fact.id === id)

describe('check-one-truth (SR-39)', () => {
  before(() => {
    base = mkdtempSync(path.join(tmpdir(), 'one-truth-'))
    // The docs repo is a SIBLING two levels up from the code repo — exactly as on disk
    // (`companai/workspace/starting-kit` -> `companai`). The fixture mirrors that depth so the
    // `../../library/…` representation resolves INSIDE the temp tree instead of escaping it.
    repoRoot = path.join(base, 'workspace', 'starting-kit')
    docsRoot = path.join(base, 'library')
  })

  after(() => {
    rmSync(base, { recursive: true, force: true })
  })

  it('passes when every copy agrees', () => {
    writeFixture({ verify: DIGEST_A, compose: DIGEST_A, pinpy: DIGEST_A })
    const { status, report } = run()
    const fact = factOf(report, 'hermes-pin-digest')
    assert.equal(status, 0, 'exit code should be 0')
    assert.equal(fact.verdict, 'PASS')
    assert.deepEqual(fact.distinctValues, [DIGEST_A])
    assert.equal(fact.readable, 3, 'all three copies should be readable')
  })

  // ★ THE MUTATION PROOF — this is the case CC-90 would have hit.
  it('FAILS and names the stale copy when one representation drifts', () => {
    writeFixture({ verify: DIGEST_B, compose: DIGEST_A, pinpy: DIGEST_A })
    const { status, report } = run()
    const fact = factOf(report, 'hermes-pin-digest')
    assert.equal(status, 1, 'a drifted fact must fail the check')
    assert.equal(fact.verdict, 'FAIL')
    assert.equal(fact.distinctValues.length, 2)
    const stale = fact.representations.find((r) => r.label === 'verify_pin.py')
    assert.deepEqual(stale.values, [DIGEST_B], 'the stale copy is printed, so it can be named')
  })

  it('FAILS when one file disagrees with itself', () => {
    writeFixture({
      verify: DIGEST_A,
      compose: DIGEST_A,
      pinpy: DIGEST_A,
      verifyBody: `# fixture\nDEFAULT_EXPECTED_DIGEST = "${DIGEST_A}"\n# stale note: ${DIGEST_B}\nDEFAULT_EXPECTED_DIGEST = "${DIGEST_B}"\n`,
    })
    const { status, report } = run()
    const fact = factOf(report, 'hermes-pin-digest')
    assert.equal(status, 1)
    assert.equal(fact.verdict, 'FAIL')
    assert.deepEqual(fact.selfConflicts, ['verify_pin.py'])
  })

  it('SKIPs loudly when fewer than two copies are readable', () => {
    mkdirSync(repoRoot, { recursive: true })
    rmSync(path.join(repoRoot, 'docker'), { recursive: true, force: true })
    rmSync(path.join(repoRoot, 'docker-compose.hermes.yml'), { force: true })
    rmSync(path.join(docsRoot, '.hermes_pin.py'), { force: true })
    const { status, report } = run()
    const fact = factOf(report, 'hermes-pin-digest')
    assert.equal(status, 0, 'a SKIP is not a failure — but it is not a green either')
    assert.equal(fact.verdict, 'SKIP')
    assert.equal(fact.readable, 0)
  })
})
