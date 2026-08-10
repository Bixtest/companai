/**
 * A command's declared capability has to be a real one.
 *
 * The authority resolver is keyed by capability and the command bus by command,
 * and `CommandHandler.capability` is the only thing joining them. The failure it
 * guards against is silent in the worst direction: a typo does not throw, it
 * simply means the resolver never recognises the capability, and the command
 * stops being gated while looking gated in the source.
 *
 * This is a text scan rather than a runtime check on purpose. The capability
 * registry only hydrates from *enabled* modules, so a runtime assertion would
 * pass for a parked module's typo and fail the day somebody restores it.
 */

import * as fs from 'fs'
import * as path from 'path'

const MODULES_ROOT = path.resolve(__dirname, '..', 'modules')

function listFiles(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name.startsWith('.tmp-')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listFiles(full, out)
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

function read(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

/** Every feature id any module declares, parked ones included. */
function declaredFeatureIds(): Set<string> {
  const ids = new Set<string>()
  for (const file of listFiles(MODULES_ROOT)) {
    if (path.basename(file) !== 'acl.ts') continue
    for (const match of read(file).matchAll(/id:\s*'([a-z_0-9]+\.[a-z_0-9.]+)'/g)) {
      ids.add(match[1])
    }
  }
  return ids
}

/** Every `capability: '…'` declared on a command handler. */
function declaredCommandCapabilities(): Array<{ file: string; capability: string }> {
  const found: Array<{ file: string; capability: string }> = []
  for (const file of listFiles(MODULES_ROOT)) {
    if (!file.includes(`${path.sep}commands${path.sep}`)) continue
    for (const match of read(file).matchAll(/^\s*capability:\s*'([^']+)'/gm)) {
      found.push({ file: path.relative(MODULES_ROOT, file), capability: match[1] })
    }
  }
  return found
}

describe('capabilities declared on commands', () => {
  it('name a feature that some module actually declares', () => {
    const known = declaredFeatureIds()
    const declared = declaredCommandCapabilities()

    // If this is zero the scan has broken, not the codebase — and a guard that
    // silently checks nothing is worse than no guard.
    expect(declared.length).toBeGreaterThan(0)
    expect(known.size).toBeGreaterThan(50)

    const unknown = declared.filter((entry) => !known.has(entry.capability))
    expect(unknown).toEqual([])
  })

  it('are not wildcards', () => {
    // `module.*` satisfies an RBAC check but describes no single act, so there is
    // no descriptor behind it and nothing for the resolver to weigh.
    const wildcards = declaredCommandCapabilities().filter((entry) => entry.capability.includes('*'))
    expect(wildcards).toEqual([])
  })
})
