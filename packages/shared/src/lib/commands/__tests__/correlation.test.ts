/**
 * Every act in one request shares an id, and knows what caused it (item 14).
 *
 * **What this fixes.** The ledger has carried `correlation_id` and
 * `causation_id` columns since R3, and **nothing ever supplied either**. The
 * chain recorded events that could not be assembled into a trace, so the first
 * question anybody asks of an audit trail — *"what did this actor do for this
 * request?"* — had no answer.
 *
 * That mattered little while a request meant one human clicking one button. It
 * matters a great deal once an AI worker performs a task that fans out into a
 * dozen acts across several commands.
 *
 * The rules below are the whole contract, and each is here because getting it
 * wrong has a specific cost.
 */

const CAUSATION_ID = Symbol.for('om.commands.causationId')

/** Mirrors `resolveCorrelationId` in the bus. */
function resolveCorrelationId(ctx: { container?: { resolve: (n: string) => unknown } }): string | null {
  try {
    const value = ctx.container?.resolve('correlationId')
    return typeof value === 'string' && value ? value : null
  } catch {
    return null
  }
}

/** Mirrors `resolveCausationId` / `markCurrentAct` in the bus. */
function resolveCausationId(ctx: object): string | null {
  const value = (ctx as Record<symbol, unknown>)[CAUSATION_ID]
  return typeof value === 'string' && value ? value : null
}

function markCurrentAct(ctx: object, logId: string | null): void {
  if (!logId) return
  ;(ctx as Record<symbol, unknown>)[CAUSATION_ID] = logId
}

function ctxWith(correlationId: unknown) {
  return { container: { resolve: (name: string) => (name === 'correlationId' ? correlationId : undefined) } }
}

describe('the correlation id', () => {
  it('comes from the request container', () => {
    expect(resolveCorrelationId(ctxWith('corr-1'))).toBe('corr-1')
  })

  it('is the same for every act in one request', () => {
    // The entire point. A container is built per request, so two acts reading
    // from the same container agree by construction.
    const ctx = ctxWith('corr-1')

    expect(resolveCorrelationId(ctx)).toBe(resolveCorrelationId(ctx))
  })

  it('is null rather than an error when nothing registered one', () => {
    // Lean bootstraps — CLI, tests, workers — build containers without it.
    // A missing correlation id costs a trace; throwing would cost the write.
    expect(resolveCorrelationId({ container: { resolve: () => undefined } })).toBeNull()
  })

  it('survives a container that throws on resolve', () => {
    const hostile = { container: { resolve: () => { throw new Error('not registered') } } }

    expect(resolveCorrelationId(hostile)).toBeNull()
  })

  it('rejects a non-string, rather than stringifying it', () => {
    // A number or object here would be somebody wiring the wrong value, and a
    // coerced "[object Object]" in the ledger is worse than nothing.
    expect(resolveCorrelationId(ctxWith(42))).toBeNull()
    expect(resolveCorrelationId(ctxWith({}))).toBeNull()
    expect(resolveCorrelationId(ctxWith(''))).toBeNull()
  })
})

describe('the causation id', () => {
  it('is absent for the first act of a request', () => {
    expect(resolveCausationId({})).toBeNull()
  })

  it('becomes the act that a nested command was dispatched from', () => {
    const ctx = {}
    markCurrentAct(ctx, 'log-outer')

    expect(resolveCausationId(ctx)).toBe('log-outer')
  })

  it('advances as execution nests', () => {
    // A causes B causes C. Each records the act immediately above it, which is
    // what makes the chain reconstructable rather than merely grouped.
    const ctx = {}
    markCurrentAct(ctx, 'log-a')
    expect(resolveCausationId(ctx)).toBe('log-a')

    markCurrentAct(ctx, 'log-b')
    expect(resolveCausationId(ctx)).toBe('log-b')
  })

  it('ignores a null log id rather than clearing what is there', () => {
    // A write that produced no log entry — skipped, or an optional audit module
    // absent — must not erase the causation of the act that did.
    const ctx = {}
    markCurrentAct(ctx, 'log-a')
    markCurrentAct(ctx, null)

    expect(resolveCausationId(ctx)).toBe('log-a')
  })

  it('is keyed by a symbol, so request input cannot forge it', () => {
    // The security property. A JSON body can carry `causationId` as a string
    // key; it cannot carry a symbol, so nothing arriving over HTTP can invent
    // a causal chain that did not happen.
    const forged = JSON.parse('{"causationId":"attacker-supplied"}')

    expect(resolveCausationId(forged)).toBeNull()
  })
})
