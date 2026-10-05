/**
 * Zero-AI execution — §47, end to end.
 *
 * The positive path is asserted first, and it asserts the **exact `QueryOptions`
 * that reached the engine** rather than merely that something ran. That matters
 * because the interesting failure of this module is not "it did not run" — it is
 * "it ran, and the wrong thing reached the database". So the assertions here are
 * on the bytes handed to the engine, not on a row count.
 *
 * Then each refusal, and every one of them asserts the same second thing: **the
 * engine was never called.** A refusal that had already read the database would
 * not be a refusal.
 */

import { runFunction } from '../run'
import type { QueryRunner, RunResult } from '../run'
import type { QueryOptions } from '../../query/types'
import {
  BINDINGS,
  CTX,
  EXPECTED_QUERY_OPTIONS,
  MODEL,
  MODEL_PLUS,
  MODEL_RENAMED,
  MODEL_VERSION,
  PLATFORM_ENTITY_ID,
  makeFunction,
} from './fixtures'

const DEFAULT_ROWS = [{ id: 'c-1', subject: 'Order 42' }]

function fakeEngine(rows: unknown[] = DEFAULT_ROWS): {
  calls: Array<{ entity: string; opts: QueryOptions }>
  engine: QueryRunner
} {
  const calls: Array<{ entity: string; opts: QueryOptions }> = []
  const engine: QueryRunner = {
    query: (async (entity: string, opts?: QueryOptions) => {
      calls.push({ entity, opts: opts ?? {} })
      return { items: rows, page: 1, pageSize: rows.length, total: rows.length }
    }) as QueryRunner['query'],
  }
  return { calls, engine }
}

function failingEngine(message: string): QueryRunner {
  return {
    query: (async () => {
      throw new Error(message)
    }) as QueryRunner['query'],
  }
}

function expectFailure(result: RunResult): Extract<RunResult, { ok: false }> {
  if (result.ok) throw new Error('expected a refusal, got rows')
  return result
}

describe('runFunction — the positive path', () => {
  it('runs a published Function and hands the engine the exact plan', async () => {
    const { calls, engine } = fakeEngine()
    const result = await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rows).toEqual(DEFAULT_ROWS)
    expect(result.total).toBe(1)

    // Exactly one call, to the platform entity id — not the canonical one.
    expect(calls).toHaveLength(1)
    expect(calls[0].entity).toBe(PLATFORM_ENTITY_ID)
    expect(calls[0].opts).toEqual(EXPECTED_QUERY_OPTIONS)
  })

  it('never lets a parameter marker reach the engine as a value', async () => {
    const { calls, engine } = fakeEngine()
    await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine)
    const serialised = JSON.stringify(calls[0].opts)
    expect(serialised).not.toContain('$param')
    expect(serialised).toContain('"value":3')
  })

  it('reports the provenance and an execution fingerprint', async () => {
    const { engine } = fakeEngine()
    const result = await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.provenance.entityId).toBe('external_conversation')
    expect(result.provenance.modelVersion).toBe(MODEL_VERSION)
    expect(result.provenance.stages).toContain('plan_physical')
    expect(result.executionFingerprint).toMatch(/^[0-9a-f]{8}$/)
    expect(result.entity).toBe(PLATFORM_ENTITY_ID)
  })

  it('is deterministic — the same Function and parameters give the same fingerprint', async () => {
    const first = await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, fakeEngine().engine)
    const second = await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL, BINDINGS, fakeEngine().engine)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.executionFingerprint).toBe(first.executionFingerprint)
  })

  it('scope comes from the context, never from the Function', async () => {
    const { calls, engine } = fakeEngine()
    // The Function claims organisation "org-evil". The context says "org-9".
    // The context wins, and the Function's own claim never reaches the engine.
    const result = await runFunction(
      makeFunction({ tenantId: 'tenant-1', organizationId: 'org-evil' }),
      { min_unread: 3 },
      { tenantId: 'tenant-1', organizationId: 'org-9' },
      MODEL,
      BINDINGS,
      engine,
    )
    expect(result.ok).toBe(true)
    expect(calls[0].opts.tenantId).toBe('tenant-1')
    expect(calls[0].opts.organizationId).toBe('org-9')
    expect(JSON.stringify(calls[0].opts)).not.toContain('org-evil')
  })
})

describe('runFunction — the lifecycle gate', () => {
  const notRunnable = ['draft', 'generated', 'validated', 'verified', 'deprecated', 'archived'] as const

  it.each(notRunnable)('refuses a "%s" Function, and never calls the engine', async (status) => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction({ status }), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine),
    )
    expect(result.code).toBe('NOT_RUNNABLE')
    expect(result.reason).toContain(status)
    expect(calls).toHaveLength(0)
  })

  it('runs the two runnable states', async () => {
    for (const status of ['published', 'active'] as const) {
      const { calls, engine } = fakeEngine()
      const result = await runFunction(makeFunction({ status }), { min_unread: 3 }, CTX, MODEL, BINDINGS, engine)
      expect([status, result.ok]).toEqual([status, true])
      expect(calls).toHaveLength(1)
    }
  })

  it('checks the gate before it does any other work', async () => {
    // No parameters at all, and a stale model: if the gate were not first, this
    // would report a parameter problem instead of "not runnable".
    const { engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction({ status: 'draft' }), {}, CTX, MODEL_RENAMED, BINDINGS, engine),
    )
    expect(result.code).toBe('NOT_RUNNABLE')
  })
})

describe('runFunction — parameters', () => {
  it('refuses a missing required parameter, and never calls the engine', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction(), {}, CTX, MODEL, BINDINGS, engine),
    )
    expect(result.code).toBe('PARAMETERS_INVALID')
    expect(result.reason).toContain('min_unread')
    expect(calls).toHaveLength(0)
  })

  it('refuses a parameter of the wrong kind, and never calls the engine', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction(), { min_unread: 'three' }, CTX, MODEL, BINDINGS, engine),
    )
    expect(result.code).toBe('PARAMETERS_INVALID')
    expect(result.reason).toContain('integer')
    expect(calls).toHaveLength(0)
  })

  it('refuses an undeclared parameter', async () => {
    const { engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction(), { min_unread: 3, typo: 1 }, CTX, MODEL, BINDINGS, engine),
    )
    expect(result.code).toBe('PARAMETERS_INVALID')
    expect(result.reason).toContain('typo')
  })
})

describe('runFunction — a moved model', () => {
  it('keeps running when the model moved but the IR still resolves', async () => {
    const { calls, engine } = fakeEngine()
    const result = await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL_PLUS, BINDINGS, engine)
    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].opts).toEqual(EXPECTED_QUERY_OPTIONS)
  })

  it('refuses a stale Function when a field it uses is gone, and never calls the engine', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction(), { min_unread: 3 }, CTX, MODEL_RENAMED, BINDINGS, engine),
    )
    expect(result.code).toBe('STALE')
    expect(result.reason).toContain('unread_count')
    expect(calls).toHaveLength(0)
  })
})

describe('runFunction — the other refusals', () => {
  it('refuses a command Function, because this runner executes reads', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(
        makeFunction({
          operationType: 'command',
          businessIr: undefined,
          businessCommandIr: {
            command: 'conversation.close',
            inputs: {},
            requested_by: 'user-1',
            idempotency_key: 'key-1',
          },
        }),
        {},
        CTX,
        MODEL,
        BINDINGS,
        engine,
      ),
    )
    expect(result.code).toBe('NOT_A_QUERY')
    expect(calls).toHaveLength(0)
  })

  it('refuses when the entity has no physical binding', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(
        makeFunction(),
        { min_unread: 3 },
        CTX,
        MODEL,
        { ...BINDINGS, entities: {} },
        engine,
      ),
    )
    expect(result.code).toBe('NO_PHYSICAL_BINDING')
    expect(calls).toHaveLength(0)
  })

  it('refuses to run another tenant’s Function, and never calls the engine', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(
        makeFunction({ tenantId: 'tenant-a' }),
        { min_unread: 3 },
        { tenantId: 'tenant-b' },
        MODEL,
        BINDINGS,
        engine,
      ),
    )
    expect(result.code).toBe('WRONG_TENANT')
    expect(result.reason).toContain('tenant-a')
    expect(result.reason).toContain('tenant-b')
    expect(calls).toHaveLength(0)
  })

  it('checks the tenant gate after the lifecycle gate, so a draft is refused first', async () => {
    const { engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(
        makeFunction({ status: 'draft', tenantId: 'tenant-a' }),
        { min_unread: 3 },
        { tenantId: 'tenant-b' },
        MODEL,
        BINDINGS,
        engine,
      ),
    )
    expect(result.code).toBe('NOT_RUNNABLE')
  })

  it('refuses when the context carries no tenant', async () => {
    const { calls, engine } = fakeEngine()
    const result = expectFailure(
      await runFunction(makeFunction(), { min_unread: 3 }, {}, MODEL, BINDINGS, engine),
    )
    expect(result.code).toBe('COMPILE_FAILED')
    expect(result.reason.toLowerCase()).toContain('tenant')
    expect(calls).toHaveLength(0)
  })

  it('reports an engine failure as a value, with the engine’s own message', async () => {
    const result = expectFailure(
      await runFunction(
        makeFunction(),
        { min_unread: 3 },
        CTX,
        MODEL,
        BINDINGS,
        failingEngine('connection refused'),
      ),
    )
    expect(result.code).toBe('ENGINE_FAILED')
    expect(result.reason).toContain('connection refused')
  })
})
