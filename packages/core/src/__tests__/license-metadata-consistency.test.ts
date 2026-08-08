import { existsSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import fg from 'fast-glob'

/**
 * License-metadata consistency guard (#3475).
 *
 * **This fork is MIT throughout.** Upstream is open-core and this guard policed
 * the boundary from both sides; we deleted `packages/enterprise` — its licence
 * forbids redistribution — so the invariant collapses to the simpler and
 * stronger one: no file anywhere declares a proprietary licence, and the
 * commercial package is absent. The original rationale is kept below because it
 * explains why the metadata strings drifted in the first place.
 *
 * ---
 *
 * Open Mercato is open-core: the root LICENSE is MIT and every workspace
 * package ships under it, EXCEPT `@open-mercato/enterprise`, the single
 * commercial package (its own LICENSE.md + restricted publishConfig). The
 * `ModuleInfo.license` / `IntegrationDefinition.license` strings are
 * descriptive metadata only and are NOT the OSS-vs-proprietary boundary — the
 * PACKAGE is.
 *
 * Those metadata strings had drifted: ~28 OSS module/integration manifests
 * hardcoded `license: 'Proprietary'` (copy-paste legacy) even though their
 * packages are MIT, which misled adopters into thinking core needed a
 * commercial license. This guard pins the corrected invariant so the drift
 * cannot silently return on new modules:
 *
 *   1. No metadata file OUTSIDE packages/enterprise/ may declare
 *      `license: 'Proprietary'`.
 *   2. The known commercial enterprise modules MUST keep declaring it, so an
 *      accidental flip to MIT in the commercial package also fails here.
 */

const repoRoot = join(__dirname, '..', '..', '..', '..')

const metadataFiles = fg.sync(
  ['packages/*/src/modules/**/index.ts', 'packages/*/src/modules/**/integration.ts'],
  {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**', '**/__mocks__/**'],
  },
)

const licenseOf = (file: string): string | null => {
  const match = readFileSync(file, 'utf8').match(/license:\s*'([^']+)'/)
  return match ? match[1] : null
}

describe('license metadata consistency (#3475)', () => {
  it('discovers module/integration metadata files', () => {
    expect(metadataFiles.length).toBeGreaterThan(0)
  })

  it('no OSS-package metadata declares a proprietary license', () => {
    const offenders = metadataFiles
      .filter((file) => licenseOf(file) === 'Proprietary')
      .map((file) => relative(repoRoot, file).split(sep).join('/'))

    expect(offenders).toEqual([])
  })

  it('carries no proprietary-licensed code at all', () => {
    // Upstream is open-core, and this guard originally worked from both sides:
    // OSS packages must not claim Proprietary, and the commercial package must
    // not drift to MIT. This fork deleted `packages/enterprise` outright — its
    // licence forbids redistribution — so there is no second side left.
    //
    // The invariant that replaces it is stronger and is the one that matters
    // here: nothing in this repository is proprietary. Asserting the package is
    // absent as well as the metadata keeps it honest if the package ever
    // returns without this test being revisited.
    expect(existsSync(join(repoRoot, 'packages', 'enterprise'))).toBe(false)

    const proprietary = metadataFiles
      .filter((file) => licenseOf(file) === 'Proprietary')
      .map((file) => relative(repoRoot, file).split(sep).join('/'))

    expect(proprietary).toEqual([])
  })
})
