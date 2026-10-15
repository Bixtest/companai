# Batch 04 — Automations (P3)

**Study:** n8n `2.44.0` · **Batch:** 04 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` · **Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code (§ batch 00)
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.

---

## 0. What this batch had to answer

P3 is **automations** — where work is executed, waits, resumes, and is observed. Batch 01 found a
**designed v2 engine in ADRs but not in code**; this batch reads the engine that actually ships, and
tests whether the ADR's description of it is true.

Short answer, measured:

| Question | n8n's answer | Where |
|---|---|---|
| What runs a workflow? | **`packages/core/src/execution-engine/`** — 23 files, service-based, with hooks and a poll manager | F04-01 |
| How are expressions evaluated? | In **isolated workers from a pool** — two isolation backends (isolated-vm, QuickJS), an idle-scaling pool, and a **zod-validated RPC boundary** | F04-02/03 |
| How does a workflow wait? | **`putExecutionToWait`** — and it **sleeps in-process for short waits**, with the reason written in a comment | F04-04 |
| **Is the v2 ADR accurate?** | **Yes, measured.** `MAX_IN_PROCESS_WAIT_MS = 65_000` — the ADR's "under 65 seconds" is the real constant | F04-05 |
| How does a human get involved? | Dedicated nodes — **`Wait`**, **`Form`** and **`FormTrigger`** (two generations) — and `WAIT_INDEFINITELY` is the year 3000 | F04-06/07 |
| How is it observed? | A **designed sampling policy** — drop signal-free spans, keep DB/HTTP only when slow, sample poll triggers at **0.1 %** | F04-08 |

---

## 1. The shipped engine

`packages/core/src/execution-engine/` — **23 files** (excluding tests). The shape:

| File | What it is |
|---|---|
| **`workflow-execute.ts`** | the engine's entry point |
| `execution-context.ts` · `execution-context.service.ts` · `execution-context-hook-registry.service.ts` | the context, and **hooks on the context** |
| `execution-lifecycle-hooks.ts` | lifecycle hooks |
| `triggers-and-pollers.ts` · `poll-trigger-executor.ts` · `poll-job-manager.ts` | the trigger/poller machinery |
| `routing-node.ts` | the routing node (branching) |
| `scheduled-task-manager.ts` | scheduled tasks |
| `active-workflow-triggers.ts` · `workflow-active-triggers-state.ts` | active-trigger state |
| `external-secrets-proxy.ts` | **an external secrets proxy** |
| `ssh-clients-manager.ts` · `requests-response.ts` | SSH and HTTP plumbing |
| `noop-poll-job-manager.ts` · `partial-execution-utils/` | defaults and partial execution |

**➜ F04-01 [foundational] — The shipped engine is a service-based executor with a hook registry, a poll
manager, a routing node and a scheduled-task manager.** **Plain meaning:** it is a mature, ordinary
workflow engine — not the interesting part of n8n. **Why it matters:** it sets the baseline that the
*v2* ADRs are trying to improve on, which makes the ADRs diagnostic rather than aspirational (§3).

---

## 2. The expression runtime — the study's best security surface

`packages/@n8n/expression-runtime/` — **62 files**, described as ***"Secure, isolated expression
evaluation runtime for n8n"*** (`package.json`). An n8n expression is what a user types into a
`{{ }}` placeholder, so this package runs **user-authored code**.

### 2.1 The pool

`src/pool/isolate-pool.ts` defines `IPool { initialize, acquire, release, dispose,
waitForReplenishment }` and `IsolatePool`, which:
- creates `size` bridges with **`Promise.allSettled`** — a partial failure does not kill startup;
- tracks `warming` and `replenishPromises`;
- throws `IsolateError('IsolatePool failed to create any bridges')` **only when zero** bridges were
  created.

`src/pool/idle-scaling-pool.ts` wraps it and states its invariant:

> *"Wraps an `IsolatePool`, **disposing it after a configured idle period and recreating it on the next
> acquire**. The inner pool **either fully exists or does not**; callers never observe a partial state."*

Plus `PoolExhaustedError` and `PoolDisposedError`.

**➜ F04-02 [foundational] — User expressions run in a pool of isolates that scales to zero when idle,
with an explicit no-partial-state invariant.** **Plain meaning:** untrusted code runs somewhere else, and
when nobody is using it the workers are gone. **Why it matters:** it is the cheapest way to be safe *and*
not pay for idle capacity, and the invariant is written down so a caller cannot observe half a pool.

### 2.2 Two isolation backends and a validated boundary

`src/bridge/` holds **`isolated-vm-bridge.ts`** and **`quickjs-bridge.ts`** — two interchangeable
isolation backends behind one `RuntimeBridge`. And `src/bridge/bridge-messages.ts` states the security
model outright:

> *"Schemas for messages the in-isolate runtime sends to the host via the `callHost` typed-RPC
> dispatcher. **The isolate is an untrusted source: anything that crosses the bridge must be validated for
> shape and types at the boundary.** We do that with **zod** rather than relying on TypeScript
> discriminated unions, because **TS types are erased at runtime and contribute zero security**."*

**➜ F04-03 [foundational] — The boundary between untrusted code and the host is a zod-validated RPC, and
the reason is written in the code.** **Plain meaning:** the platform treats its own types as decoration
at runtime and validates every message that crosses. **Why it matters:** it is the single most portable
security decision in this study — one sentence, applicable anywhere, and it names the exact mistake it
prevents.

### 2.3 Three failure classes, classified

`src/evaluator/error-classification.ts`:
```ts
export type ExpressionErrorType = 'timeout' | 'memory_limit' | 'security' | 'syntax' | 'unknown';
```
against `TimeoutError`, `MemoryLimitError`, `SecurityViolationError` and `SyntaxError`.

**➜ F04-09 [foundational] — An expression can fail four ways, and the failure is classified.** **Plain
meaning:** a runaway expression is a *timeout*, a bloated one is a *memory limit*, and an escaping one is
a *security* violation — three different problems with three different answers. **Why it matters:**
classified failures can be reported to the right person and rate-limited correctly.

`src/evaluator/expression-evaluator.ts` also uses **`Tournament`** (so the engine can be swapped), an
**`LruCache`**, and records outcomes through `EXPRESSION_METRICS`.

---

## 3. The wait model — and the ADR is accurate

This is the batch's most satisfying finding, because batch 01's ADR made a claim about the shipped
engine and this batch **measured it**.

**ADR-20260902 said:**
> *"In engine v1, `putExecutionToWait` itself **sleeps in the process** for a time wait under 65 seconds
> that only its deadline can end. Such a wait never reaches the poller. Every other wait persists."*

**The shipped code** — `packages/core/src/execution-engine/node-execution-context/base-execute-context.ts:139-156`:

```ts
async putExecutionToWait(waitTill: Date, options?: { acceptsResumeRequest?: boolean }): Promise<void> {
	const waitMs = Math.max(waitTill.getTime() - Date.now(), 0);
	// Suspending a short wait costs a write and a reload, and the tracker polls too
	// slowly to promise an on-time resume.
	if (options?.acceptsResumeRequest === false && waitMs < MAX_IN_PROCESS_WAIT_MS) {
		// A cancelled execution ends the wait, and the step still returns its input.
		return await sleep(waitMs, this.abortSignal).catch(() => undefined);
	}
	this.runExecutionData.waitTill = waitTill;
	if (this.additionalData.setExecutionStatus) {
		this.additionalData.setExecutionStatus('waiting');
	}
}
```

**And the constant** — `packages/workflow/src/constants.ts:19`:
```ts
export const MAX_IN_PROCESS_WAIT_MS = 65_000;
```

**➜ F04-04 [foundational] — The shipped engine sleeps in-process for short waits, and the comment states
the trade: *"Suspending a short wait costs a write and a reload, and the tracker polls too slowly to
promise an on-time resume."*** **Plain meaning:** for a 30-second wait, persisting and reloading would
cost more than simply waiting — so n8n waits. **Why it matters:** it is an honest engineering trade,
recorded in the code, and it is the *opposite* of the v2 design.

**➜ F04-05 [foundational] — The v2 ADR is diagnostic, not aspirational: its "under 65 seconds" is the
real constant `65_000`.** **Plain meaning:** the ADR was written by people reading this code. **Why it
matters:** it is the best evidence in the study that an ADR practice is *real* — the design record
describes the system it is about to replace, accurately, with the number.

---

## 4. The human in the loop

### 4.1 The Wait node, and two sentinel dates

`packages/nodes-base/nodes/Wait/Wait.node.ts` imports `WAIT_INDEFINITELY` and `FORM_TRIGGER_NODE_TYPE`,
and `packages/workflow/src/constants.ts:7,9` defines:

```ts
export const WAIT_INDEFINITELY        = new Date('3000-01-01T00:00:00.000Z');
export const WAIT_FOR_SUB_EXECUTION   = new Date('2999-12-31T00:00:00.000Z');
```

**➜ F04-06 [foundational] — "Wait forever" is a sentinel date in the year 3000, and "wait for a
sub-execution" is 2999 — two distinguishable infinities.** **Plain meaning:** the engine can tell *"wait
for a human"* from *"wait for a child workflow"* without a new status. **Why it matters:** it is a small,
elegant answer to "how do I say 'no deadline' in a type that has a deadline", and it keeps the wait model
to one field.

### 4.2 The Form node — a human-facing surface, in two generations

`packages/nodes-base/nodes/Form/` holds `Form.node.ts`, **`FormTrigger.node.ts`**, plus **`v1/FormTriggerV1.node.ts`
and `v2/FormTriggerV2.node.ts`** — two generations kept side by side — along with
`common.descriptions.ts`, `cssVariables.ts`, `form.svg` and `interfaces.ts`. The constant is
`FORM_TRIGGER_NODE_TYPE = 'n8n-nodes-base.formTrigger'` (`workflow/src/constants.ts:73`).

**➜ F04-07 [foundational] — Human approval is a first-class node with a rendered form, and the form has
two live generations.** **Plain meaning:** a workflow can stop and ask a person something, and the
something is a real form, not a chat message. **Why it matters:** the "human in the loop" pole is served
by a node that renders UI — which is where P3 and PX-W meet.

---

## 5. Observability — a designed sampling policy

`packages/core/src/observability/tracing/` holds `tracing.ts`, `sentry-tracing.ts`, `noop-tracing.ts`
and **`span-sampling.ts`**, whose header comments are the design:

> *"Express auto-instrumentation span ops whose duration only mirrors the handler, so they carry **no
> independent signal**. **Dropped wholesale**."* — `DROPPED_EXPRESS_OPS` (`middleware.express`,
> `router.express`, `request_handler.express`)

> *"High-volume auto-instrumentation ops **kept only when slow or errored**."* —
> `DURATION_FILTERED_OPS = new Set(['db', 'http.client'])`

> *"**Near-zero sample rate** for high-frequency, low-value poll-trigger transactions."* —
> `POLL_TRIGGER_SAMPLE_RATE = 0.001`

**➜ F04-08 [foundational] — Observability is a *policy*, not a stream: drop spans that carry no signal,
keep database and HTTP spans only when slow or failed, and sample poll triggers at one in a thousand.**
**Plain meaning:** the system decides what is worth recording before it records anything, so tracing
stays affordable at scale. **Why it matters:** it is the same "cost is a first-class concern" discipline
as the agent budget guardrail (batch 02), applied to telemetry — and it is measurable in three
constants.

---

## 6. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F04-01** | **A service-based shipped engine** — 23 files, hook registry, poll manager, routing node, scheduled tasks, external secrets proxy. | P3 | Workflows run reliably. | The baseline the v2 ADRs improve on. |
| **F04-02** | **Expressions run in a pool of isolates that scales to zero when idle**, with a no-partial-state invariant. | P3/PZ | Untrusted code is contained and costs nothing when idle. | Safe *and* cheap, with the invariant written down. |
| **F04-03** | **A zod-validated RPC boundary** — *"TS types are erased at runtime and contribute zero security."* | P3/PZ | (indirect) — the platform is not trivially escapeable. | The most portable security decision in the study. |
| **F04-04** | **Short waits sleep in-process**, with the trade stated in a comment. | P3 | A 30-second wait costs nothing extra. | An honest trade, recorded. |
| **F04-05** | **The v2 ADR is diagnostic** — its "under 65 seconds" is the real `65_000`. | P3/PZ | (indirect) | Evidence the ADR practice is real. |
| **F04-06** | **Two sentinel dates** (year 3000 / 2999) for "wait forever" vs "wait for a sub-execution". | P3 | One field, two kinds of infinity. | A small, elegant typing answer. |
| **F04-07** | **Human approval is a node with a rendered form**, in two live generations. | P3/PX-W | A workflow can stop and ask a person properly. | Where the automations pole meets the UI pole. |
| **F04-08** | **Observability is a sampling policy** — drop signal-free spans, keep DB/HTTP only when slow, poll triggers at 0.1 %. | P3/PZ | Tracing stays affordable. | Cost discipline applied to telemetry. |
| **F04-09** | **Four expression failure classes**, classified (`timeout` / `memory_limit` / `security` / `syntax`). | P3/PZ | A runaway expression is reported as what it is. | Classified failures route correctly. |
| **F04-10** | **Two isolation backends behind one bridge** (isolated-vm, QuickJS) via `Tournament`. | PZ | (indirect) | The sandbox engine is swappable. |
| **F04-11** | **An `external-secrets-proxy`** in the engine's file list. | P3/PZ | Secrets stay outside the engine. | A named seam for secret isolation. |
| **F04-12** | **Tracing backends are pluggable** (`sentry-tracing.ts` / `noop-tracing.ts`). | PZ | Self-hosters get nothing by default. | The observability seam is a real one. |

---

## 7. Divergences and honest bounds

- **One cross-batch confirmation, not a divergence:** batch 01's ADR described v1's in-process sleep
  "under 65 seconds"; this batch measured `MAX_IN_PROCESS_WAIT_MS = 65_000` and the comment explaining
  it. **Recorded as F04-05 — a confirmation, stated as such rather than dressed up as a new finding.**
- **Bound:** this batch read the **expression runtime, the wait model, the human-in-the-loop nodes and
  the observability policy**. It did **not** read the full `workflow-execute.ts` (a large file), the
  trigger *catalogue* (563 nodes), or the execution queue's internals; those are named rather than
  half-covered.
- **Bound:** the two bridge implementations (`isolated-vm-bridge.ts`, `quickjs-bridge.ts`) are **named**
  and their purpose read from filenames and imports; neither was read in full.
- **Bound (stated plainly):** the sampling constants are read from `span-sampling.ts`; whether they are
  the *effective* production values depends on config, which this study has not traced.

---

## 8. Carried forward to batch 07 (the synthesis)

Four candidates for the highest transferable value, to be ranked in batch 07:

1. **The validated isolation boundary (F04-03)** — one sentence: the isolate is untrusted, validate
   everything that crosses, and TypeScript types are not validation.
2. **The idle-scaling isolate pool with a no-partial-state invariant (F04-02)** — safe and cheap at the
   same time, with the invariant written down.
3. **The ADR practice, proven accurate (F04-05)** — a design record that names the exact constant it is
   about to change.
4. **Observability as a sampling policy (F04-08)** — three constants that decide what is worth recording
   before anything is recorded.

All four are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 04 of 07. Read from source on 2026-10-15. Next: `findings/05-widgets-and-frontend.md`.*
