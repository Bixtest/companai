/**
 * @jest-environment node
 *
 * `P2-7` (§2.13) — the live-turn VERDICT, proven without a live turn.
 *
 * The harness (`scripts/hermes-live-turn.mts`) can only be run against a live
 * stack; its *judgement* must not be. This suite pins every way a turn can fail
 * to be a pass, so the harness's `PASS` line means something. Each `it` below is
 * also a mutation target — the row's RED-then-GREEN mutations are listed in the
 * discharge record and each one turns a specific test here red.
 */
import { judgeLiveTurn } from '../hermes-live-turn-verdict'
import type { AiRuntimeStreamEvent } from '../ai-runtime-port'

const text = (content: string): AiRuntimeStreamEvent => ({ type: 'text', content })
const done = (): AiRuntimeStreamEvent => ({ type: 'done', sessionId: 's-1' })
const error = (message: string): AiRuntimeStreamEvent => ({ type: 'error', error: message })

describe('P2-7 — judgeLiveTurn', () => {
  it('PASSES a real turn: text, then done', () => {
    const verdict = judgeLiveTurn([{ type: 'status', status: 'streaming' }, text('HERMES LIVE TURN OK'), done()])
    expect(verdict.passed).toBe(true)
    expect(verdict.answer).toBe('HERMES LIVE TURN OK')
    expect(verdict.eventTypes).toEqual(['status', 'text', 'done'])
  })

  it('assembles the answer from EVERY text event, in order', () => {
    const verdict = judgeLiveTurn([text('HERMES '), { type: 'thinking' }, text('LIVE TURN OK'), done()])
    expect(verdict.answer).toBe('HERMES LIVE TURN OK')
    expect(verdict.passed).toBe(true)
  })

  it('FAILS an empty stream — "no events" is not a turn', () => {
    const verdict = judgeLiveTurn([])
    expect(verdict.passed).toBe(false)
    expect(verdict.reason).toMatch(/no events/i)
  })

  it('FAILS when the stream ends on anything but done', () => {
    // A stream that simply stops — the worker died, the socket closed — must not
    // read as a completed turn.
    const verdict = judgeLiveTurn([text('partial'), { type: 'status', status: 'working' }])
    expect(verdict.passed).toBe(false)
    expect(verdict.reason).toMatch(/ended on status, not done/i)
  })

  it('FAILS when an error appears anywhere, even alongside a done', () => {
    const verdict = judgeLiveTurn([text('ok'), done(), error('worker exited mid-run')])
    expect(verdict.passed).toBe(false)
    expect(verdict.reason).toContain('worker exited mid-run')
  })

  it('FAILS a done that is not the LAST event (something spoke after the turn)', () => {
    const verdict = judgeLiveTurn([text('ok'), done(), { type: 'status', status: 'late' }])
    expect(verdict.passed).toBe(false)
    expect(verdict.reason).toMatch(/ended on status, not done/i)
  })

  it('FAILS a completed turn that produced no answer text — the gate is a REAL answer', () => {
    const verdict = judgeLiveTurn([{ type: 'thinking' }, done()])
    expect(verdict.passed).toBe(false)
    expect(verdict.reason).toMatch(/no answer text/i)
  })

  it('FAILS a whitespace-only answer (an answer must have content)', () => {
    const verdict = judgeLiveTurn([text('   \n  '), done()])
    expect(verdict.passed).toBe(false)
    expect(verdict.answer).toBe('')
  })

  it('reports the event SHAPE on failure, so a red run is diagnosable', () => {
    const verdict = judgeLiveTurn([{ type: 'status', status: 'a' }, { type: 'thinking' }])
    expect(verdict.passed).toBe(false)
    expect(verdict.eventTypes).toEqual(['status', 'thinking'])
  })

  it('never throws and always carries a reason (a verdict is a VALUE, §4.3)', () => {
    const streams: AiRuntimeStreamEvent[][] = [
      [],
      [done()],
      [error('boom')],
      [text('x'), done()],
      [{ type: 'debug', partType: 'p', data: null }, done()],
    ]
    for (const stream of streams) {
      const verdict = judgeLiveTurn(stream)
      expect(typeof verdict.passed).toBe('boolean')
      expect(verdict.reason.length).toBeGreaterThan(0)
    }
  })
})
