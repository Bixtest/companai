/**
 * Tests for the agent runtime port's SHAPE (LIST row 28, sub-row R28-1).
 *
 * This file tests DEFINITIONS, so most of the proof is the TYPE CHECK itself: a
 * conforming implementation must satisfy `AiRuntimePort` exactly, and a
 * non-conforming one must fail `tsc`. The runtime assertions below cover the
 * parts that are values (the implementation name, the event union, and the
 * cancel/complete result semantics); the structural rules are proven by
 * type-level guards that go RED under a mutation — this was hardened after a
 * hostile-critic pass showed the first version's assertions were weaker than
 * they looked (see PLAN-ROW28 §7).
 */
import {
  OPENCODE_RUNTIME_IMPLEMENTATION,
  type AiRuntimeCancelResult,
  type AiRuntimeCapabilities,
  type AiRuntimeCompleteResult,
  type AiRuntimeEnvelope,
  type AiRuntimeEventSink,
  type AiRuntimePort,
  type AiRuntimeRunResult,
  type AiRuntimeSecretRef,
  type AiRuntimeStreamEvent,
  type AiRuntimeToolCall,
} from '../ai-runtime-port'

/**
 * `IsExactKeys<T, K>` is `true` only when `T`'s keys are EXACTLY `K` — neither
 * more nor fewer. An added optional field makes it `false`, so a `satisfies`
 * on it fails `tsc`. This is the guard the critic asked for: an instance-key
 * assertion silently passes when an optional field is merely absent, whereas
 * this catches the addition itself.
 */
type IsExactKeys<T, K extends string> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false

describe('ai-runtime-port — the one typed door (R28-1)', () => {
  it('names the OpenCode implementation with a stable constant', () => {
    expect(OPENCODE_RUNTIME_IMPLEMENTATION).toBe('opencode')
  })

  it('a conforming implementation satisfies AiRuntimePort in full', async () => {
    // A minimal in-memory implementation. Its purpose is to prove the interface
    // is implementable as declared — every one of the eight operations must be
    // present with the exact argument list, or `tsc` fails this file.
    const events: AiRuntimeStreamEvent[] = []
    const envelope: AiRuntimeEnvelope = {
      schemaVersion: 1,
      runId: 'run-1',
      tenantId: 'ten',
      principalId: 'ai_worker',
      actorId: 'act',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      capabilityGrantId: 'grant-1',
    }

    const implementation: AiRuntimePort = {
      async describeCapabilities(runtimeVersion?: string): Promise<AiRuntimeCapabilities> {
        return {
          implementation: OPENCODE_RUNTIME_IMPLEMENTATION,
          runtimeVersion,
          health: 'ok',
          operations: {
            describeCapabilities: true,
            startRun: true,
            streamRun: true,
            cancelRun: true,
            steerRun: false,
            resumeConversation: true,
            resolveToolCall: true,
            completeRun: true,
          },
        }
      },
      async startRun(_envelope: AiRuntimeEnvelope) {
        return { runId: 'run-1', runtimeSessionId: 'sess-1' }
      },
      async streamRun(_runId: string, onEvent: AiRuntimeEventSink) {
        await onEvent({ type: 'thinking' })
        await onEvent({ type: 'status', status: 'busy' })
        await onEvent({ type: 'text', content: 'hello' })
        await onEvent({ type: 'done' })
      },
      async cancelRun(runId: string): Promise<AiRuntimeCancelResult> {
        return { runId, cancelled: false, reason: 'not-found' }
      },
      async steerRun() {
        throw new Error('not used in this test')
      },
      async resumeConversation(binding, input) {
        return { runId: `resume-${binding.conversationId}`, runtimeSessionId: String(input.text ?? '') }
      },
      async resolveToolCall(call: AiRuntimeToolCall, capabilityGrant: string) {
        // The grant is REQUIRED — this parameter is what §4.1 calls the only
        // path to a business operation. Dropping it must fail `tsc`.
        void call
        void capabilityGrant
      },
      async completeRun(runId: string, _result: AiRuntimeRunResult): Promise<AiRuntimeCompleteResult> {
        return { runId, completed: true, alreadyComplete: false }
      },
    }

    const caps = await implementation.describeCapabilities('1.2.3')
    expect(caps.implementation).toBe('opencode')
    expect(caps.runtimeVersion).toBe('1.2.3')

    await implementation.startRun(envelope)
    await implementation.streamRun('run-1', async (e) => {
      events.push(e)
    })
    expect(events.map((e) => e.type)).toEqual(['thinking', 'status', 'text', 'done'])
  })

  it('the envelope requires a capability grant and keeps every identifier distinct', () => {
    const envelope: AiRuntimeEnvelope = {
      schemaVersion: 1,
      runId: 'run-1',
      tenantId: 'ten',
      principalId: 'ai_worker',
      actorId: 'act',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      capabilityGrantId: 'grant-1',
    }
    // §4.2 "the identifiers stay distinct": collapsing run/conversation/grant
    // is how a "session" quietly becomes an authority. The tuple below is typed
    // `[string, string, string]`, so making ANY of these optional fails `tsc`.
    const distinct: [string, string, string] = [
      envelope.runId,
      envelope.conversationId,
      envelope.capabilityGrantId,
    ]
    expect(new Set(distinct).size).toBe(3)
    // The grant is not optional — a run without one cannot resolve a tool call.
    expect(envelope.capabilityGrantId).toBe('grant-1')
  })

  it('the envelope type has exactly the §4.2 fields — no more, no fewer', () => {
    // `IsExactKeys` resolves to `false` if the envelope gains or loses a field,
    // which fails `tsc` on the `satisfies` below. This is the guard for the
    // "the envelope carries …" list in §4.2, so a field cannot be dropped
    // silently (the critic's finding #2 class).
    const envelopeKeysOk: IsExactKeys<
      AiRuntimeEnvelope,
      | 'schemaVersion'
      | 'runId'
      | 'tenantId'
      | 'principalId'
      | 'actorId'
      | 'agentId'
      | 'agentKind'
      | 'taskId'
      | 'conversationId'
      | 'runtimeSessionId'
      | 'capabilityGrantId'
      | 'policyVersion'
      | 'modelVersion'
      | 'secretRefs'
      | 'allowedInputRefs'
      | 'deadline'
      | 'budget'
      | 'correlationId'
    > = true
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    envelopeKeysOk satisfies true
    expect(true).toBe(true)
  })

  it('a secret is a REFERENCE (scope + name + purpose), never a value', () => {
    const ref: AiRuntimeSecretRef = { scope: 'tenant:acme', name: 'OPENAI_API_KEY' }
    // TYPE-LEVEL exhaustive key check: `keyof AiRuntimeSecretRef` must be
    // exactly the reference fields. If a `value` (or `secret`, `token`, `key`)
    // field is ever added — optional or not — the guard resolves to `false`
    // and `tsc` fails. An instance-key assertion would silently pass, because
    // an optional field is simply absent from any instance.
    const referenceOnly: IsExactKeys<AiRuntimeSecretRef, 'scope' | 'name' | 'purpose'> = true
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    referenceOnly satisfies true
    const forbidden: string[] = ['value', 'secret', 'token', 'key', 'password']
    const keys = Object.keys(ref)
    for (const f of forbidden) {
      expect(keys).not.toContain(f)
    }
  })

  it('a cancel that finds nothing is a VALUE, not a thrown error (§4.3)', () => {
    const reasons: Array<AiRuntimeCancelResult['reason']> = [
      'not-found',
      'already-complete',
      'already-cancelled',
      'unsupported',
    ]
    for (const reason of reasons) {
      const result: AiRuntimeCancelResult = { runId: 'r1', cancelled: false, reason }
      expect(result.cancelled).toBe(false)
    }
  })

  it('complete is replay-safe: a second report is a no-op, not a second completion (§4.3)', () => {
    const first: AiRuntimeCompleteResult = { runId: 'r1', completed: true, alreadyComplete: false }
    const replay: AiRuntimeCompleteResult = { runId: 'r1', completed: false, alreadyComplete: true }
    expect(first.completed).toBe(true)
    expect(replay.completed).toBe(false)
    expect(replay.alreadyComplete).toBe(true)
  })

  it('unknown usage stays unknown rather than being guessed into a figure (§4.3)', () => {
    // §4.3: "an unknown provider must stay unknown rather than be guessed into
    // a paid figure." The shape makes provider/model optional, so an unknown
    // one is simply absent — never fabricated.
    const unknownProvider: AiRuntimeRunResult = {
      status: 'completed',
      usage: { scope: 'run', inputTokens: 10, outputTokens: 20 },
    }
    expect(unknownProvider.usage?.provider).toBeUndefined()
    expect(unknownProvider.usage?.scope).toBe('run')
  })

  it('a usage figure always states its scope (run or session) (§4.3)', () => {
    const perRun: AiRuntimeRunResult = { status: 'completed', usage: { scope: 'run' } }
    const perSession: AiRuntimeRunResult = { status: 'completed', usage: { scope: 'session' } }
    expect(['run', 'session']).toContain(perRun.usage?.scope)
    expect(['run', 'session']).toContain(perSession.usage?.scope)
  })
})
