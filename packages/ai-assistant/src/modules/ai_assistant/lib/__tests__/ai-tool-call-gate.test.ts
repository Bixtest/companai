/**
 * The two-gate decision, proven pure (`P2-4` — plan §2.10).
 *
 * These tests are the contract's teeth: a tool call is executed only when BOTH
 * gates pass, and every path that cannot prove admission ends in a refusal with
 * a named reason. The order matters as much as the outcomes — identity is
 * checked before authority, so a foreign grant never learns what the run's menu
 * contains.
 */

import {
  checkToolCallAdmitted,
  describeToolCallRefusal,
  type ToolCallGateRun,
} from '../ai-tool-call-gate'

const run = (overrides: Partial<ToolCallGateRun> = {}): ToolCallGateRun => ({
  capabilityGrantId: 'chat-turn:user-1:run-1',
  admittedToolMenu: ['business_ir.run_query'],
  ...overrides,
})

describe('checkToolCallAdmitted — gate 1: the grant must be THIS run\'s own', () => {
  it('refuses a call with no grant at all', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: undefined,
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'no_grant' })
  })

  it('refuses a call whose grant is blank', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: '   ',
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'no_grant' })
  })

  it('refuses a call carrying a DIFFERENT run\'s grant', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: 'chat-turn:user-1:run-2',
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'foreign_grant' })
  })

  it('refuses a call carrying an invented grant string', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: 'anything-at-all',
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'foreign_grant' })
  })
})

describe('checkToolCallAdmitted — gate 2: the tool must be in the run\'s menu', () => {
  it('admits a call whose tool is in the menu under the run\'s own grant', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: 'chat-turn:user-1:run-1',
      run: run(),
    })
    expect(decision).toEqual({ ok: true })
  })

  it('refuses a tool outside the menu EVEN WITH a valid grant (the widening-refusal test)', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'search.hybrid_search',
      capabilityGrant: 'chat-turn:user-1:run-1',
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'tool_not_in_menu' })
  })

  it('refuses a tool with a NEAR-MISS name — the menu is exact, not prefix', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query_v2',
      capabilityGrant: 'chat-turn:user-1:run-1',
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'tool_not_in_menu' })
  })

  it('refuses every call on a run with NO recorded menu (fail-closed)', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: 'chat-turn:user-1:run-1',
      run: run({ admittedToolMenu: undefined }),
    })
    expect(decision).toEqual({ ok: false, reason: 'no_menu_recorded' })
  })

  it('refuses every call on a run recorded with an EMPTY menu', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: 'chat-turn:user-1:run-1',
      run: run({ admittedToolMenu: [] }),
    })
    expect(decision).toEqual({ ok: false, reason: 'no_menu_recorded' })
  })

  it('refuses on a null menu', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'business_ir.run_query',
      capabilityGrant: 'chat-turn:user-1:run-1',
      run: run({ admittedToolMenu: null }),
    })
    expect(decision).toEqual({ ok: false, reason: 'no_menu_recorded' })
  })
})

describe('checkToolCallAdmitted — the gate order (identity before authority)', () => {
  it('reports foreign_grant, not tool_not_in_menu, when BOTH would refuse', () => {
    // A foreign grant must be refused before the menu is consulted: the caller
    // learns nothing about what the run may call.
    const decision = checkToolCallAdmitted({
      toolName: 'search.hybrid_search',
      capabilityGrant: 'chat-turn:user-1:run-2',
      run: run(),
    })
    expect(decision).toEqual({ ok: false, reason: 'foreign_grant' })
  })

  it('reports no_grant before anything else', () => {
    const decision = checkToolCallAdmitted({
      toolName: 'search.hybrid_search',
      capabilityGrant: undefined,
      run: run({ admittedToolMenu: undefined }),
    })
    expect(decision).toEqual({ ok: false, reason: 'no_grant' })
  })
})

describe('describeToolCallRefusal — every reason is a sentence a person can act on', () => {
  const reasons = ['no_grant', 'foreign_grant', 'no_menu_recorded', 'tool_not_in_menu'] as const

  it.each(reasons)('names %s and what to do about it', (reason) => {
    const message = describeToolCallRefusal(reason, 'business_ir.run_query')
    expect(message).toContain('business_ir.run_query')
    expect(message.length).toBeGreaterThan(40)
    // No reason message may read as a bare code.
    expect(message).not.toMatch(/^[a-z_]+$/)
  })
})
