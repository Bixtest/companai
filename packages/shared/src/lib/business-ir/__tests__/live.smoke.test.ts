/**
 * Live smoke test — G-17's one open measurement.
 *
 * **What this answers.** Everything in G-17 was proven with a *stubbed* model:
 * the wire is correct, the schema rejects a widening, a model's answer reaches
 * the compiler. What was never tested is whether the **actual local model** — a
 * quantised Qwen2.5-7B — is good enough to produce an IR-shaped answer at all.
 * That is a different question, it needs a live model, and this file is how it
 * gets asked.
 *
 * **Why it talks to the model server directly.** `generateObject` would put the
 * app's auth, agent registry and provider config between us and the model. The
 * question here is narrower — *can this model produce this shape?* — so the test
 * sends the same instruction and validates the reply against the platform's own
 * {@link businessQueryIrSchema}. Nothing is hand-checked: the schema is the judge.
 *
 * **Skipped, not failed, when there is no server.** A smoke test that fails on a
 * laptop with no model running teaches nothing and trains people to ignore red.
 * It skips with a loud message, and the env vars let it be pointed elsewhere.
 *
 * **Measured 2026-10-06 against the running stack.** Qwen2.5-7B-Instruct-Q4_K_M
 * produced an object the schema accepted for all six requests below. The results
 * are recorded in `workspace/COOKBOOK.md` and `PLAN-G17-ir-generation.md`.
 *
 * Source: `workspace/COOKBOOK.md`, *Sprint G-17, Step 4* (the live-model question).
 */

import { businessQueryIrSchema } from '../schema'

const BASE = process.env.IR_SMOKE_BASE_URL ?? 'http://localhost:8080/v1'
const MODEL = process.env.IR_SMOKE_MODEL ?? 'Qwen2.5-7B-Instruct-Q4_K_M'

/**
 * Six requests, chosen to exercise different IR shapes rather than six ways of
 * asking the same thing: a filtered list, a count, a bucketed aggregate, a text
 * search, a sort-and-limit, and a grouped average.
 */
const REQUESTS: Record<string, string> = {
  'filtered list (the vision’s own §50 example)':
    'list invoices over 10,000 EUR for each customer, newest first, at most 50',
  'a count': 'how many open support tickets are there',
  'a bucketed aggregate over time': 'total revenue per month this year',
  'a text search': 'customers whose name contains "acme"',
  'a sort and a limit': 'the 10 newest orders',
  'a grouped average': 'average invoice value by country',
}

const instructionFor = (request: string): string => `Turn this business request into a JSON query object.
Request: "${request}"

Reply with ONLY a JSON object with these fields:
- operation: one of "list", "count", "aggregate"
- entity: a string, e.g. "invoice"
- dimensions: array of strings
- filters: array of {field, operator, value}; operator one of eq,ne,gt,gte,lt,lte,in,nin,like,ilike,exists,=,!=,>,>=,<,<=,contains
- sort: array of {field, direction: "asc"|"desc"}
- limit: a number

JSON:`

/** Pull the JSON object out of a reply that may be fenced or wrapped in prose. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('no JSON object in the reply: ' + text.slice(0, 300))
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

/**
 * Is the model server there?
 *
 * **Synchronous on purpose.** The result is needed *while the test file is being
 * assembled*, so the suite can be `describe.skip`ped — an async probe would only
 * be usable in `beforeAll`, and a skip decided there still reports the tests as
 * **passed**. A green tick over a run that contacted no model is the worst
 * outcome this file could produce.
 *
 * Measured 2026-10-06: pointing this at a dead port reported **"6 passed"** before
 * the fix and **"6 skipped"** after.
 */
function serverReachableSync(): boolean {
  const target = new URL(BASE)
  const { execFileSync } = require('node:child_process') as typeof import('node:child_process')
  try {
    // `curl` is available wherever this project's tooling runs (Windows Git Bash,
    // Linux CI). Two details that cost a debugging cycle on Windows:
    //   - do NOT use `-o /dev/null` — that is a shell path, and `curl.exe` cannot
    //     write to it, so the probe fails *even when the server is up*;
    //   - `--fail` makes a non-2xx or connection error a non-zero exit, which is
    //     what we test on, instead of inspecting the body.
    execFileSync('curl', ['-s', '-f', '-m', '3', `${target.origin}/v1/models`], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

async function askModel(request: string): Promise<string> {
  const res = await fetch(BASE + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer local' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: instructionFor(request) }],
      temperature: 0,
      max_tokens: 400,
    }),
  })
  if (!res.ok) throw new Error('model server returned ' + res.status)
  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return payload.choices?.[0]?.message?.content ?? ''
}

jest.setTimeout(600_000)

/**
 * Is the server there? Decided **once, at file load**, so the suite can be
 * skipped rather than silently passing.
 *
 * Why not a `beforeAll` flag with an early `return`: a `return` inside a test
 * still reports **pass**. A suite that says "6 passed" when it contacted no model
 * is the worst outcome this file could produce — a green tick over an unmeasured
 * claim. `describe.skip` is reported by Jest as *skipped*, which is the truth.
 *
 * Measured 2026-10-06: pointed at a dead port, this file reported **"6 passed"**
 * before the fix and **"6 skipped"** after.
 *
 * Set `IR_SMOKE_REQUIRE=1` to make a missing server a **failure** instead — for a
 * CI job whose whole job is to run this measurement.
 */
const REACHABLE = serverReachableSync()
const SUITE = REACHABLE ? describe : describe.skip

if (!REACHABLE) {
  // eslint-disable-next-line no-console
  console.log(
    '[live smoke] SKIPPED — no model server at ' +
      BASE +
      '. Start the stack to run this measurement. To make its absence a failure, ' +
      'set IR_SMOKE_REQUIRE=1.',
  )
} else if (process.env.IR_SMOKE_REQUIRE === '1') {
  // eslint-disable-next-line no-console
  console.log('[live smoke] REQUIRED and the server is reachable — running for real.')
}

SUITE('live smoke — can the local model emit a valid BusinessQueryIR?', () => {
  // One case per request shape. `it.each` names each failure by its request, so a
  // partial pass is legible: "5 of 6" says *which* shape the model struggles
  // with, which a single test never would.
  it.each(Object.entries(REQUESTS))('%s', async (_label, request) => {
    const content = await askModel(request)

    let parsed: unknown
    try {
      parsed = extractJson(content)
    } catch (error) {
      console.log('RAW REPLY (no JSON found):\n' + content)
      throw error
    }

    const result = businessQueryIrSchema.safeParse(parsed)
    // Print the reply and the exact issues on failure, so a "no" is a measurement
    // with evidence attached rather than a bare red line.
    if (!result.success) {
      console.log('REQUEST:\n' + request)
      console.log('RAW REPLY:\n' + content)
      console.log('SCHEMA ISSUES:\n' + JSON.stringify(result.error.issues, null, 2))
    }
    expect(result.success).toBe(true)
  })
})

