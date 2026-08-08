import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createRailwayState,
  loadRailwayState,
  railwayStatePath,
  saveRailwayState,
} from '../state'

describe('Railway deployment state', () => {
  it('round-trips schema version 1 without secrets', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'mercato-railway-state-'))
    const path = railwayStatePath(cwd, true)
    const state = createRailwayState('my-shop', '0.6.4')
    state.projectId = 'project-id'
    state.environments.production = { environmentId: 'environment-id' }
    saveRailwayState(path, state)

    expect(loadRailwayState(path)).toEqual(state)
    expect(readFileSync(path, 'utf8')).not.toMatch(/token|password/i)
    // Build the expected suffix with `join` rather than hardcoding forward
    // slashes: `railwayStatePath` returns a native path, so on Windows this
    // compared against a separator the function never produces and failed on a
    // character unrelated to what is being asserted.
    expect(railwayStatePath(cwd, false).endsWith(join('.mercato', 'railway.json.local'))).toBe(true)
  })
})
