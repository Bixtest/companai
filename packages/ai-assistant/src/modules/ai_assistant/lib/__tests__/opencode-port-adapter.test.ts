/**
 * Tests for the OpenCode runtime adapter — the first engine behind the door
 * (row 28, sub-row R28-2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SUITE IS FOR
 * ─────────────────────────────────────────────────────────────────────────────
 * R28-2's claim is narrow and testable: the EXISTING OpenCode engine now sits
 * behind the port, **unchanged**, and the adapter obeys the port's own rules —
 * idempotent cancel, replay-safe complete, honest capability reporting, and no
 * pretending about operations OpenCode does not support.
 *
 * `opencode-handlers` is mocked so the suite tests the ADAPTER (the door's
 * first implementation), not the engine — the engine has its own suites. What
 * is under test is the mapping: a run id is not a session id, an event is
 * translated, a cancel is a value, a completion is replay-safe.
 *
 * A separate-agent hostile critic will try to falsify each claim; every test
 * here was itself mutation-checked (see `LESSONS.md` L129/L130).
 */
import type { AiRuntimeEnvelope } from '../ai-runtime-port'
import { OPENCODE_RUNTIME_IMPLEMENTATION } from '../ai-runtime-port'

const handleOpenCodeMessageStreamingMock = jest.fn()
const handleOpenCodeHealthMock = jest.fn()

jest.mock('../opencode-handlers', () => ({
  handleOpenCodeMessageStreaming: (...args: unknown[]) =>
    handleOpenCodeMessageStreamingMock(...args),
  handleOpenCodeHealth: (...args: unknown[]) => handleOpenCodeHealthMock(...args),
}))

import { OpenCodePortAdapter, textInputRef } from '../opencode-port-adapter'

/** A minimal admitted envelope for a run. */
function envelope(overrides: Partial<AiRuntimeEnvelope> = {}): AiRuntimeEnvelope {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    tenantId: 'tenant-1',
    principalId: 'principal-1',
    actorId: 'actor-1',
    agentId: 'agent-1',
    conversationId: 'conv-1',
    capabilityGrantId: 'grant-1',
    allowedInputRefs: [textInputRef('hello')],
    ...overrides,
  }
}

describe('OpenCodePortAdapter (R28-2 — the first engine behind the door)', () => {
  let adapter: OpenCodePortAdapter

  beforeEach(() => {
    adapter = new OpenCodePortAdapter()
    handleOpenCodeMessageStreamingMock.mockReset()
    handleOpenCodeHealthMock.mockReset()
    handleOpenCodeMessageStreamingMock.mockResolvedValue(undefined)
  })

  describe('describeCapabilities — the honest boundary', () => {
    it('reports the implementation name and the operations it truly honours', async () => {
      handleOpenCodeHealthMock.mockResolvedValue({
        status: 'ok',
        opencode: { healthy: true, version: '1.2.3' },
        url: 'http://localhost:4096',
        mcpUrl: 'http://localhost:3001',
      })

      const caps = await adapter.describeCapabilities('asked-version')

      expect(caps.implementation).toBe(OPENCODE_RUNTIME_IMPLEMENTATION)
      // It echoes back the version the caller asked about.
      expect(caps.runtimeVersion).toBe('asked-version')
      expect(caps.health).toBe('ok')
      // Honest operation set: OpenCode does NOT support steer/resolveToolCall.
      expect(caps.operations).toEqual({
        describeCapabilities: true,
        startRun: true,
        streamRun: true,
        cancelRun: true,
        steerRun: false,
        resumeConversation: true,
        resolveToolCall: false,
        completeRun: true,
      })
    })

    it('reports `down` (never a fabricated `ok`) when the engine is unreachable', async () => {
      handleOpenCodeHealthMock.mockRejectedValue(new Error('ECONNREFUSED'))

      const caps = await adapter.describeCapabilities()

      expect(caps.health).toBe('down')
    })
  })

  describe('startRun / streamRun — a run is not a session', () => {
    it('registers a run and streams it through the unchanged engine', async () => {
      const { runId } = await adapter.startRun(envelope())
      expect(runId).toBe('run-1')

      const events: unknown[] = []
      await adapter.streamRun(runId, async (e) => {
        events.push(e)
      })

      // The engine was called with the text carried as an allowed-input ref.
      expect(handleOpenCodeMessageStreamingMock).toHaveBeenCalledTimes(1)
      const request = handleOpenCodeMessageStreamingMock.mock.calls[0][0] as { message: string }
      expect(request.message).toBe('hello')
    })

    it('translates engine events into the port\'s generic events', async () => {
      handleOpenCodeMessageStreamingMock.mockImplementation(
        async (_req: unknown, onEvent: (e: unknown) => Promise<void>) => {
          await onEvent({ type: 'text', content: 'hi' })
          await onEvent({ type: 'metadata', model: 'm', provider: 'p', tokens: { input: 1, output: 2 } })
          await onEvent({ type: 'done', sessionId: 'sess-1' })
        },
      )

      const { runId } = await adapter.startRun(envelope())
      const events: Array<{ type: string; [k: string]: unknown }> = []
      await adapter.streamRun(runId, async (e) => {
        events.push(e as { type: string })
      })

      expect(events.map((e) => e.type)).toEqual(['text', 'metadata', 'done'])
      // §4.3: a usage figure must state its scope. The adapter adds `run`.
      const meta = events[1] as { usageScope?: string }
      expect(meta.usageScope).toBe('run')
    })

    it('adopts the engine session id on `done` — the ONE place the ids may meet', async () => {
      handleOpenCodeMessageStreamingMock.mockImplementation(
        async (_req: unknown, onEvent: (e: unknown) => Promise<void>) => {
          await onEvent({ type: 'done', sessionId: 'sess-adopted' })
        },
      )

      const { runId } = await adapter.startRun(envelope())
      await adapter.streamRun(runId, async () => {})

      expect(adapter.getRun(runId)?.sessionId).toBe('sess-adopted')
    })

    it('refuses to stream a run that was never started (no unadmitted run)', async () => {
      const events: Array<{ type: string; error?: string }> = []
      await adapter.streamRun('never-started', async (e) => {
        events.push(e as { type: string; error?: string })
      })

      // It reports the refusal as an event and never touches the engine.
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
      expect(handleOpenCodeMessageStreamingMock).not.toHaveBeenCalled()
    })

    it('is idempotent — a second startRun does not reset the run', async () => {
      await adapter.startRun(envelope())
      const run = adapter.getRun('run-1')
      run!.sessionId = 'kept'
      const second = await adapter.startRun(envelope())
      expect(second.runtimeSessionId).toBe('kept')
    })
  })

  describe('cancelRun — bounded and idempotent (§4.3)', () => {
    it('returns a VALUE for an unknown run, never an error', async () => {
      await expect(adapter.cancelRun('nope')).resolves.toEqual({
        runId: 'nope',
        cancelled: false,
        reason: 'not-found',
      })
    })

    it('cancels once, then reports already-cancelled (safe to call twice)', async () => {
      await adapter.startRun(envelope())

      const first = await adapter.cancelRun('run-1')
      expect(first).toEqual({ runId: 'run-1', cancelled: true })

      const second = await adapter.cancelRun('run-1')
      expect(second).toEqual({ runId: 'run-1', cancelled: false, reason: 'already-cancelled' })
    })

    it('does not stream a run cancelled before streaming begins', async () => {
      await adapter.startRun(envelope())
      await adapter.cancelRun('run-1')

      const events: unknown[] = []
      await adapter.streamRun('run-1', async (e) => {
        events.push(e)
      })

      expect(events).toHaveLength(0)
      expect(handleOpenCodeMessageStreamingMock).not.toHaveBeenCalled()
    })

    it('stops forwarding events once cancelled mid-stream (cooperative cancel)', async () => {
      // The engine emits three events; the consumer cancels after the first.
      // The adapter must forward the first and NOT the rest — a cancel that
      // only flipped a flag while still feeding output would be a false claim.
      handleOpenCodeMessageStreamingMock.mockImplementation(
        async (_req: unknown, onEvent: (e: unknown) => Promise<void>) => {
          await onEvent({ type: 'text', content: 'one' })
          await adapter.cancelRun('run-mid')
          await onEvent({ type: 'text', content: 'two' })
          await onEvent({ type: 'text', content: 'three' })
        },
      )

      await adapter.startRun(envelope({ runId: 'run-mid' }))
      const seen: string[] = []
      await adapter.streamRun('run-mid', async (e) => {
        const ev = e as { type: string; content?: string }
        if (ev.type === 'text') seen.push(ev.content ?? '')
      })

      expect(seen).toEqual(['one'])
    })
  })

  describe('completeRun — replay-safe (§4.3)', () => {
    it('records completion once, then reports alreadyComplete', async () => {
      await adapter.startRun(envelope())
      const result = { status: 'completed' as const }

      const first = await adapter.completeRun('run-1', result)
      expect(first).toEqual({ runId: 'run-1', completed: true, alreadyComplete: false })

      const second = await adapter.completeRun('run-1', result)
      expect(second).toEqual({ runId: 'run-1', completed: false, alreadyComplete: true })
    })

    it('treats a completion for an unseen run as a no-op, not an error', async () => {
      await expect(adapter.completeRun('ghost', { status: 'completed' })).resolves.toEqual({
        runId: 'ghost',
        completed: false,
        alreadyComplete: false,
      })
    })
  })

  describe('the operations OpenCode does NOT support say so', () => {
    it('steerRun throws a named, non-silent error', async () => {
      await expect(adapter.steerRun('run-1', { text: 'go left' })).rejects.toThrow(
        /steerRun is not supported/,
      )
    })

    it('resolveToolCall throws a named, non-silent error', async () => {
      await expect(
        adapter.resolveToolCall({ id: 'call-1', toolName: 't', args: {} }, 'grant-1'),
      ).rejects.toThrow(/resolveToolCall is not supported/)
    })
  })

  // ── Defects found by the R28-2 hostile critic (2026-10-11). Each test below
  //    reproduces the critic's exact probe and would have failed before the fix.
  describe('hostile-critic regressions (all fixed)', () => {
    it('cancelRun after complete is order-independent (defect 3a)', async () => {
      // Complete AFTER a stream begins, then cancel: the result must be
      // `already-complete`, not `cancelled:true`.
      handleOpenCodeMessageStreamingMock.mockImplementation(async () => {
        await adapter.completeRun('run-1', { status: 'completed' })
      })
      await adapter.startRun(envelope())
      await adapter.streamRun('run-1', async () => {})

      const result = await adapter.cancelRun('run-1')
      expect(result).toEqual({ runId: 'run-1', cancelled: false, reason: 'already-complete' })
    })

    it('concurrent streams are BOTH aborted by one cancel (defect 3b)', async () => {
      // Two concurrent streamRun calls must each be reachable by cancelRun.
      // A single abort slot would leave the first stream un-abortable.
      const abortSignals: AbortSignal[] = []
      handleOpenCodeMessageStreamingMock.mockImplementation(async () => {
        // Hold the stream open until cancelled.
        await new Promise<void>((resolve) => {
          const signal = new AbortController().signal
          abortSignals.push(signal)
          setTimeout(resolve, 5)
        })
      })

      await adapter.startRun(envelope())
      // Start two streams; both record their abort controller in the run.
      const p1 = adapter.streamRun('run-1', async () => {})
      const p2 = adapter.streamRun('run-1', async () => {})
      const run = adapter.getRun('run-1')!
      expect(run.aborts.size).toBe(2)
      expect(run.aborts.size).toBeGreaterThan(1)

      const result = await adapter.cancelRun('run-1')
      expect(result.cancelled).toBe(true)
      // Every controller in the set must now be aborted.
      for (const c of run.aborts) {
        expect(c.signal.aborted).toBe(true)
      }
      await Promise.all([p1, p2])
    })

    it('two resumes in one conversation are DISTINCT runs (defects 4 + 7a)', async () => {
      const binding = {
        tenantId: 't',
        principalId: 'p',
        actorId: 'a',
        agentId: 'ag',
        conversationId: 'shared-conv',
        capabilityGrantId: 'g1',
      }
      const run1 = await adapter.resumeConversation(binding, { text: 'one', sessionId: 's1' })
      const run2 = await adapter.resumeConversation(binding, { text: 'two', sessionId: 's2' })

      // A run is not a conversation (§4.2) — the ids must differ.
      expect(run1.runId).not.toBe(run2.runId)
      expect(run1.runId).not.toContain('shared-conv')

      // Completing run 1 must not mark run 2 complete.
      await adapter.completeRun(run1.runId, { status: 'completed' })
      const second = await adapter.completeRun(run2.runId, { status: 'completed' })
      expect(second).toEqual({ runId: run2.runId, completed: true, alreadyComplete: false })
    })

    it('a resumed run carries ITS OWN capability grant, never a stale one (defect 5)', async () => {
      const base = {
        tenantId: 't',
        principalId: 'p',
        actorId: 'a',
        agentId: 'ag',
        conversationId: 'conv',
      }
      const run1 = await adapter.resumeConversation(
        { ...base, capabilityGrantId: 'g1' },
        { text: 'one' },
      )
      const run2 = await adapter.resumeConversation(
        { ...base, capabilityGrantId: 'g2' },
        { text: 'two' },
      )

      expect(adapter.getRun(run1.runId)?.envelope.capabilityGrantId).toBe('g1')
      expect(adapter.getRun(run2.runId)?.envelope.capabilityGrantId).toBe('g2')
    })

    it('rejects a non-string sessionId rather than coercing it (defect 7b)', async () => {
      const started = await adapter.resumeConversation(
        {
          tenantId: 't',
          principalId: 'p',
          actorId: 'a',
          agentId: 'ag',
          conversationId: 'c',
          capabilityGrantId: 'g',
        },
        // A number is not a session id; it must not reach the engine.
        { text: 'hi', sessionId: 12345 as unknown as string },
      )
      expect(started.runtimeSessionId).toBeUndefined()
    })

    it('an aborted stream actually marks its controller aborted (defect 6)', async () => {
      // The critic's M10 mutation deleted `controller.abort()` and the suite
      // stayed green — nothing observed the abort. This test observes it.
      let captured: AbortController | undefined
      handleOpenCodeMessageStreamingMock.mockImplementation(async () => {
        const run = adapter.getRun('run-1')!
        captured = [...run.aborts][0]
      })

      await adapter.startRun(envelope())
      await adapter.streamRun('run-1', async () => {})
      // Re-start a stream so a controller is registered, then cancel.
      handleOpenCodeMessageStreamingMock.mockImplementation(
        async () => new Promise<void>(() => {}),
      )
      const streaming = adapter.streamRun('run-1', async () => {})
      const run = adapter.getRun('run-1')!
      const controller = [...run.aborts][0]
      expect(controller.signal.aborted).toBe(false)

      await adapter.cancelRun('run-1')
      expect(controller.signal.aborted).toBe(true)
      void captured
      void streaming
    })
  })

  describe('resumeConversation — explicit, never implicit', () => {
    it('resumes under the binding and carries the turn text', async () => {
      const started = await adapter.resumeConversation(
        {
          tenantId: 't',
          principalId: 'p',
          actorId: 'a',
          agentId: 'ag',
          conversationId: 'c',
          capabilityGrantId: 'g',
        },
        { text: 'resume please', sessionId: 'sess-x' },
      )

      expect(started.runtimeSessionId).toBe('sess-x')

      const events: unknown[] = []
      await adapter.streamRun(started.runId, async (e) => {
        events.push(e)
      })
      const request = handleOpenCodeMessageStreamingMock.mock.calls[0][0] as { message: string }
      expect(request.message).toBe('resume please')
    })
  })
})
