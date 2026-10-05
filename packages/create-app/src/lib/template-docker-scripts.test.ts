import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

// The standalone template ships its own copy of the database-readiness script, and
// nothing generates it: the two copies are kept in step only by
// scripts/template-sync.ts, which reconciles them when a release runs
// `yarn template:sync:fix`. So a fix applied to one copy and not the other would
// ship stale into every app created by this package, while every other check stayed
// green — a behaviour test run against each copy cannot see it, because a copy left
// behind at older-but-still-correct behaviour passes its own run.
//
// This asserts the invariant directly instead of inferring it. The CI step that runs
// this suite ("Check create-app template parity" in .github/workflows/ci.yml) is
// deliberately unfiltered so that template drift fails the pull request rather than
// develop.
test('standalone template init-or-migrate.sh mirrors the monorepo copy', () => {
  const templateUrl = new URL('../../template/docker/scripts/init-or-migrate.sh', import.meta.url)
  const monorepoUrl = new URL('../../../../docker/scripts/init-or-migrate.sh', import.meta.url)

  assert.equal(
    fs.readFileSync(templateUrl, 'utf8'),
    fs.readFileSync(monorepoUrl, 'utf8'),
    'template/docker/scripts/init-or-migrate.sh must stay byte-identical to ' +
      'docker/scripts/init-or-migrate.sh — run `yarn template:sync:fix` to repair the drift.',
  )
})

// template/docker/scripts/dev-entrypoint.sh is deliberately NOT asserted above. The
// monorepo copy and the standalone copy are different programs that happen to share a
// name: the monorepo one seeds volumes from prebuilt image artifacts, the standalone
// one installs into its own container. Do not "fix" the omission by adding it here.
