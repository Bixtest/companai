/** @jest-environment node */
import fs from 'node:fs'
import path from 'node:path'

/**
 * CC-48 guard — the custom-entity records page must export through the SERVER, never in the browser.
 *
 * `CC-45` masks marked fields at the server export funnel. The records page originally built its
 * "view" export in the browser (`prepare` → `serializeExport`), which bypasses that mask entirely and
 * downloads a marked field in clear. This guard pins the fix in place.
 *
 * A hostile critic defeated a first, narrower version of this guard by inserting a *functional*
 * browser-`prepare` leak into a sibling section (it did not contain the literal `serializeExport`).
 * This version closes that hole: it asserts the file contains NO `prepare:` export at all, and that
 * BOTH export sections (`view` and `full`) route through `getUrl`.
 */
const PAGE_PATH = path.resolve(
  __dirname,
  '../backend/entities/user/[entityId]/records/page.tsx',
)

describe('CC-48 guard: records page exports are server-side only', () => {
  const source = fs.readFileSync(PAGE_PATH, 'utf8')

  it('does not serialize an export in the browser (no serializeExport reference)', () => {
    expect(source).not.toContain('serializeExport')
  })

  it('contains NO browser-built `prepare` export anywhere in the page', () => {
    // A `prepare` export is the only way this page can build a file client-side. Its absence is the
    // real invariant — stronger than checking a single section, so a leak cannot hide in a sibling.
    expect(source).not.toMatch(/\bprepare\s*:/)
  })

  it('routes BOTH the "view" and "full" exports through a server getUrl', () => {
    const viewIndex = source.indexOf('view: {')
    const fullIndex = source.indexOf('full: {')
    expect(viewIndex).toBeGreaterThan(-1)
    expect(fullIndex).toBeGreaterThan(viewIndex)
    const viewBlock = source.slice(viewIndex, fullIndex)
    expect(viewBlock).toContain('getUrl')
    expect(source.slice(fullIndex)).toContain('getUrl')
  })

  it('forwards the visible columns to the server as a projection', () => {
    expect(source).toContain("qp.set('exportColumns'")
  })

  it('routes the view export through the records API endpoint', () => {
    expect(source).toContain('/api/entities/records?')
  })
})
