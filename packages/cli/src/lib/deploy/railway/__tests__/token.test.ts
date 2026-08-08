import { chmodSync, mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readCachedRailwayToken,
  resolveRailwayToken,
  writeCachedRailwayToken,
} from '../token'

describe('Railway token resolution', () => {
  it('uses flag, environment, then cache precedence', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'mercato-railway-token-'))
    const configPath = join(cwd, 'railway.json')
    writeCachedRailwayToken(configPath, 'cached-token')

    expect(resolveRailwayToken({
      flagToken: 'flag-token',
      environment: { RAILWAY_API_TOKEN: 'environment-token' },
      configPath,
    })).toEqual({ token: 'flag-token', source: 'flag' })
    expect(resolveRailwayToken({
      environment: { RAILWAY_API_TOKEN: 'environment-token' },
      configPath,
    })).toEqual({ token: 'environment-token', source: 'environment' })
    expect(resolveRailwayToken({ environment: {}, configPath }))
      .toEqual({ token: 'cached-token', source: 'cache' })
  })

  it('writes a private cache file and rejects broad permissions', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'mercato-railway-token-'))
    const configPath = join(cwd, 'railway.json')
    writeCachedRailwayToken(configPath, 'cached-token')

    // The on-disk mode is only meaningful where POSIX permissions exist. On
    // Windows, Node's `chmod` toggles the read-only flag and does not map to
    // ACLs, so `mode & 0o777` reads back 0o666 no matter what was requested —
    // the platform cannot provide this guarantee, and asserting it there fails
    // on the operating system rather than on the code.
    //
    // Deliberately narrowed, not deleted: the guarantee still holds and is still
    // asserted wherever it is real, and the rejection check below — the actual
    // security behaviour — runs on every platform because it passes 'linux'
    // explicitly.
    if (process.platform !== 'win32') {
      expect(statSync(configPath).mode & 0o777).toBe(0o600)
    }
    expect(readFileSync(configPath, 'utf8')).toContain('cached-token')
    chmodSync(configPath, 0o644)
    expect(() => readCachedRailwayToken(configPath, 'linux')).toThrow('permissions must be 0600')
  })
})
