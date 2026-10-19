/**
 * Sandboxed Code Execution Engine
 *
 * Uses isolated-vm to run AI-generated JavaScript inside a separate V8 isolate.
 * Each execution gets a fresh isolate with no shared prototype chain, heap, or
 * handle access to the host process — preventing the node:vm escape via the
 * Promise prototype chain (NEW-01, CVSS 9.9).
 */

import ivm from 'isolated-vm'

export interface SandboxOptions {
  /** Execution timeout in milliseconds (default: 30_000) */
  timeout?: number
  /**
   * Maximum number of api.request() calls allowed per execute() run (default: 50).
   *
   * `T-35` — **this option was decorative until 2026-10-19.** It was declared here and destructured
   * nowhere, so a caller who wrote `{ maxApiCalls: 5 }` got no limit at all and no warning that they had.
   * The sandbox now enforces it itself, wrapping any injected `api.request`.
   */
  maxApiCalls?: number
  // `T-35` — **`maxOutputSize` was removed deliberately.** It was advertised with a default of 1MB and
  // implemented nowhere, which is worse than absent: a caller writing `{ maxOutputSize: 1024 }` believed a
  // run was bounded when it was not. The isolate's own `memoryLimit` (MEMORY_LIMIT_MB, 32MB) bounds a
  // runaway result, and the console proxy already caps entries and length. An option that promises a limit
  // nothing implements is a lie in the API surface; the fix is to delete it, with this reason, not to
  // keep it and hope.
}

export interface SandboxResult {
  result: unknown
  error?: string
  logs: string[]
  durationMs: number
  apiCallCount?: number
}

const MEMORY_LIMIT_MB = parseInt(process.env.SANDBOX_MEMORY_MB ?? '32', 10)
const MAX_LOG_ENTRIES = 100
const MAX_LOG_ENTRY_LENGTH = 1000

/**
 * Create a sandboxed execution environment.
 *
 * @param globals - Custom globals to inject (e.g., spec, api, context)
 * @param options - Sandbox configuration
 */
export function createSandbox(globals: Record<string, unknown>, options: SandboxOptions = {}) {
  const { timeout = 30_000, maxApiCalls = 50 } = options
  let observedApiCalls = 0

  return {
    async execute(code: string): Promise<SandboxResult> {
      const logs: string[] = []
      const start = Date.now()

      const isolate = new ivm.Isolate({ memoryLimit: MEMORY_LIMIT_MB })

      try {
        const ctx = await isolate.createContext()

        // Console proxy — fire-and-forget so logging never blocks the isolate
        await bootstrapConsole(ctx, logs)

        // Inject caller-provided globals (spec, api, context, etc.)
        //
        // `T-35` — the api-call cap is applied here rather than in the caller, because the caller's own
        // cap (`codemode-tools.ts`) counts what it can see from outside the isolate. This one counts what
        // the isolate actually did. Two controls, one axis, deliberately: a caller that forgets still gets
        // the documented default, and the sandbox's number is the one that reflects the run.
        await injectGlobals(ctx, applyApiCallCap(globals, maxApiCalls, () => { observedApiCalls += 1 }))

        // Shadow globalThis so user code cannot navigate to the isolate's global
        // object and inspect/escape via its properties
        await ctx.global.set('globalThis', undefined)

        const normalized = normalizeCode(code)

        const script = await isolate.compileScript(`(${normalized})()`)

        // promise: true  — user code is async; awaits the returned Promise
        // copy: true     — structured-clones the result back to the outer heap
        //                  before isolate.dispose() is called; required for
        //                  object/array returns (primitives work without it)
        const result = await Promise.race([
          script.run(ctx, { promise: true, copy: true }),
          new Promise<never>((_, reject) =>
            globalThis.setTimeout(
              () => reject(new Error(`Execution timed out after ${timeout}ms`)),
              timeout
            )
          ),
        ])

        return {
          result,
          logs,
          durationMs: Date.now() - start,
          // `T-35` — the third decorative member: declared since the file was written, never populated.
          // A caller that logs the result now reports what the sandbox counted, not its private tally.
          apiCallCount: observedApiCalls,
        }
      } catch (error) {
        const err = error as any
        return {
          result: null,
          error: err?.message ?? String(err),
          logs,
          durationMs: Date.now() - start,
          apiCallCount: observedApiCalls,
        }
      } finally {
        // Always release the V8 isolate to avoid memory leaks
        isolate.dispose()
      }
    },
  }
}

/**
 * `T-35` — make the advertised api-call cap real.
 *
 * Returns `globals` unchanged unless it carries an `api` object with a callable `request`. When it does, the
 * request is wrapped with a counter that throws past the cap — so the limit the interface has promised since
 * the file was written is the limit that applies, and a caller that forgets to opt in gets the default
 * instead of an unbounded run.
 *
 * **What this does not replace.** The caller's own cap in `codemode-tools.ts` counts against the
 * **observed HTTP method**, which is how a dynamically-built method (`'PO' + 'ST'`) is caught. That is a
 * different control on the same axis and it stays. This one is the backstop: it counts what the isolate
 * actually did, from inside the isolate.
 */
function applyApiCallCap(
  globals: Record<string, unknown>,
  maxApiCalls: number,
  onCall: () => void,
): Record<string, unknown> {
  const api = globals?.api
  if (!api || typeof api !== 'object') return globals
  const request = (api as { request?: unknown }).request
  if (typeof request !== 'function') return globals

  // Per-execute counter: each `execute()` builds its own wrapper, so a second run in the same sandbox starts
  // from zero. `maxApiCalls` calls succeed; the next one throws.
  let calls = 0

  return {
    ...globals,
    api: {
      ...(api as Record<string, unknown>),
      request: (...args: unknown[]) => {
        if (calls >= maxApiCalls) {
          throw new Error(`API call limit exceeded (max ${maxApiCalls})`)
        }
        calls += 1
        onCall()
        return (request as (...a: unknown[]) => unknown)(...args)
      },
    },
  }
}

/**
 * Normalize AI-generated code: strip markdown fencing and validate shape.
 */
export function normalizeCode(code: string): string {
  let normalized = code.trim()

  // Strip markdown code fences
  normalized = normalized
    .replace(/^```(?:javascript|js|typescript|ts)?\s*\n?/i, '')
    .replace(/\n?```\s*$/, '')
    .trim()

  // Auto-wrap bare code into async arrow functions
  if (!/^\s*async\s*\(/.test(normalized)) {
    // Detect statement-leading keywords — these cannot follow `return`
    const isStatement =
      /^\s*(const|let|var|for|while|if|try|switch|return|throw|class|function)\b/.test(normalized)
    normalized = isStatement
      ? `async () => { ${normalized} }`
      : `async () => { return ${normalized} }`
  }

  return normalized
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Inject a console proxy into the isolate that forwards to the outer logs array.
 * Uses ivm.Callback with { ignored: true } (fire-and-forget) so logging never
 * blocks the isolate event loop. Arguments are deep-copied automatically.
 */
async function bootstrapConsole(ctx: ivm.Context, logs: string[]): Promise<void> {
  const cb = new ivm.Callback((...args: unknown[]) => pushLog(logs, args), { ignored: true })

  await ctx.evalClosure(
    `globalThis.console = {
      log:   (...a) => $0(...a),
      info:  (...a) => $0(...a),
      warn:  (...a) => $0(...a),
      error: (...a) => $0(...a),
      debug: (...a) => $0(...a),
    }`,
    [cb]
  )
}

/**
 * Inject all caller-provided globals into the isolate context.
 *
 * Strategy per value type:
 *   null / undefined / primitive → jail.set directly
 *   function                     → SAB bridge (see injectFn) — synchronous-looking
 *                                  call inside the isolate that blocks on Atomics.wait
 *                                  while the host resolves the async work, then returns
 *                                  the result via a sync Callback
 *   object                       → split: data properties via ExternalCopy,
 *                                  function properties via SAB bridge wrappers
 */
async function injectGlobals(
  ctx: ivm.Context,
  globals: Record<string, unknown>
): Promise<void> {
  const jail = ctx.global

  for (const [key, value] of Object.entries(globals)) {
    if (value === null || value === undefined) {
      await jail.set(key, value as null | undefined)
      continue
    }

    if (typeof value === 'function') {
      await injectFn(ctx, value as (...a: unknown[]) => unknown, `globalThis[${JSON.stringify(key)}]`)
      continue
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>
      const dataEntries: Record<string, unknown> = {}
      const fnProps: Array<[string, (...a: unknown[]) => unknown]> = []

      for (const [prop, propVal] of Object.entries(obj)) {
        if (typeof propVal === 'function') {
          fnProps.push([prop, propVal as (...a: unknown[]) => unknown])
        } else {
          dataEntries[prop] = propVal
        }
      }

      // Copy data properties into the isolate first (object must exist before properties are added)
      await jail.set(key, new ivm.ExternalCopy(dataEntries).copyInto())

      // Add function-property SAB bridges one by one
      for (const [prop, fn] of fnProps) {
        await injectFn(ctx, fn, `globalThis[${JSON.stringify(key)}][${JSON.stringify(prop)}]`)
      }
      continue
    }

    // Primitive (string, number, boolean)
    await jail.set(key, value as string | number | boolean)
  }
}

/**
 * Wire a single host function into the isolate at `target` using a SAB bridge.
 *
 * How it works:
 *   1. A SharedArrayBuffer(4) acts as a one-bit signal (0 = pending, 1 = ready).
 *   2. `startCb` (fire-and-forget) launches the host async fn; when it settles it
 *      stores the result in `pending` then sets signal[0] = 1 and notifies.
 *   3. `getResultCb` (sync) reads the result from `pending` and returns it as an
 *      ExternalCopy so the value crosses the isolate boundary.
 *   4. Inside the isolate, `target` becomes a regular function that calls startCb,
 *      blocks on Atomics.wait (does NOT block the host event loop — only the
 *      isolate's worker thread), then calls getResultCb and returns or throws.
 */
async function injectFn(
  ctx: ivm.Context,
  fn: (...a: unknown[]) => unknown,
  target: string
): Promise<void> {
  const sab = new SharedArrayBuffer(4)
  const signal = new Int32Array(sab)
  const pending: { result: { ok: boolean; v?: unknown; e?: string } | null } = { result: null }

  const startCb = new ivm.Callback(
    (...args: unknown[]) => {
      try {
        const ret = fn(...args)
        const p = ret instanceof Promise ? ret : Promise.resolve(ret)
        p.then(
          (v) => {
            pending.result = { ok: true, v }
            Atomics.store(signal, 0, 1)
            Atomics.notify(signal, 0)
          },
          (e: unknown) => {
            const err = e as any
            pending.result = { ok: false, e: err?.message ?? String(err) }
            Atomics.store(signal, 0, 1)
            Atomics.notify(signal, 0)
          }
        )
      } catch (e) {
        const err = e as any
        pending.result = { ok: false, e: err?.message ?? String(err) }
        Atomics.store(signal, 0, 1)
        Atomics.notify(signal, 0)
      }
    },
    { ignored: true }
  )

  const getResultCb = new ivm.Callback(() => {
    const r = pending.result!
    pending.result = null
    Atomics.store(signal, 0, 0)
    return new ivm.ExternalCopy(r).copyInto()
  })

  await ctx.evalClosure(
    `const _s=$0,_sig=new Int32Array(_s),_start=$1,_get=$2
     ${target} = function(...a) {
       _start(...a)
       Atomics.wait(_sig, 0, 0)
       const r = _get()
       if (!r.ok) throw new Error(r.e)
       return r.v
     }`,
    [new ivm.ExternalCopy(sab).copyInto(), startCb, getResultCb]
  )
}

function pushLog(logs: string[], args: unknown[]): void {
  if (logs.length >= MAX_LOG_ENTRIES) return

  const message = args
    .map((arg) => {
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')

  logs.push(
    message.length > MAX_LOG_ENTRY_LENGTH
      ? message.slice(0, MAX_LOG_ENTRY_LENGTH) + '...'
      : message
  )
}
