/** @jest-environment node */
import fs from 'node:fs'
import path from 'node:path'

/**
 * CC-49 guard — the customer-tasks table must export through the SERVER, never in the browser.
 *
 * The tasks rows carry `todoTitle` / `todoDescription` / the customer `displayName`, which ALIAS the
 * marked fields `customer_interaction.title` / `.body` and `customer_entity.display_name`. The CC-45
 * mask keys on the true field name, so an alias never matched and a browser-built file left the
 * marked value in clear (LESSONS.md L102). The fix routes both export sections through a server
 * `getUrl` (the same shape the records page uses after CC-48). This guard pins it in place.
 */
const PAGE_PATH = path.resolve(
  __dirname,
  '../components/CustomerTodosTable.tsx',
)

describe('CC-49 guard: customer-tasks exports are server-side only', () => {
  const source = fs.readFileSync(PAGE_PATH, 'utf8')

  it('does not serialize an export in the browser (no serializeExport reference)', () => {
    expect(source).not.toContain('serializeExport')
  })

  it('contains NO browser-built `prepare` export anywhere in the table', () => {
    // A `prepare` export is the only way this table can build a file client-side. Its absence is the
    // real invariant — stronger than checking one section, so a leak cannot hide in a sibling.
    // The critic defeated an earlier token-only guard by spelling the property `['pre'+'pare']`;
    // so also reject any computed/concatenated spelling of it.
    expect(source).not.toMatch(/\bprepare\s*:/)
    expect(source).not.toMatch(/['"]pre['"]\s*\+['"]pare['"]/)
    expect(source).not.toMatch(/\[\s*['"]prepare['"]\s*\]/)
  })

  it('does not hand-assemble a download (no Blob / createObjectURL / anchor-click download)', () => {
    // The critic's bypass wrote a raw client export with `new Blob([...])` + a synthetic <a>.click()
    // instead of going through DataTable's exporter. A browser export must not exist here at all.
    expect(source).not.toContain('new Blob')
    expect(source).not.toContain('createObjectURL')
    expect(source).not.toMatch(/createElement\(\s*['"]a['"]\s*\)/)
  })

  it('routes BOTH the "view" and "full" exports through a server getUrl', () => {
    const viewIndex = source.indexOf('view: {')
    const fullIndex = source.indexOf('full: {')
    expect(viewIndex).toBeGreaterThan(-1)
    expect(fullIndex).toBeGreaterThan(viewIndex)
    expect(source.slice(viewIndex, fullIndex)).toContain('getUrl')
    expect(source.slice(fullIndex)).toContain('getUrl')
  })

  it('forwards the visible columns to the server as a projection', () => {
    expect(source).toContain("usp.set('exportColumns'")
  })

  it('routes the export through the tasks API endpoint with a format', () => {
    expect(source).toContain("CUSTOMER_TASKS_API_PATH = '/api/customers/interactions/tasks'")
    expect(source).toContain('usp.set(')
    expect(source).toContain('format')
  })
})
