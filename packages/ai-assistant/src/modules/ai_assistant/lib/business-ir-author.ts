/**
 * **The join this whole item exists to make.** (G-17)
 *
 * Everything on one side of the Business IR already worked: a person can write
 * a `BusinessQueryIR` by hand, `compileQuery` validates it against the business
 * model, and the query engine runs the result. Everything on the other side
 * already worked too: the platform has a first-class structured-output agent
 * path ({@link runAiAgentObject}), the AI SDK's `generateObject`, and a schema
 * override so a caller can state the shape it wants. What was *missing* was the
 * single wire between them — nothing pointed a model at the IR.
 *
 * This module is that wire, and nothing more. It:
 *
 *   1. takes the IR's runtime schema ({@link businessQueryIrSchema}) as the
 *      output constraint, so the model can emit an IR **and nothing else** — an
 *      unknown key is a hard rejection, not a value that is trusted and stripped;
 *   2. hands it to the existing agent runtime through the existing
 *      `output: { schemaName, schema }` override — no new execution path, no
 *      second way of calling a model;
 *   3. re-parses the model's answer through the same schema, so a shape that
 *      slipped past the model still cannot be handed to the compiler.
 *
 * **What this module deliberately does not do** is compile or run the IR. A model
 * does not get to execute anything by *saying* an IR: the caller takes the IR
 * back, and the existing compiler is the only thing that turns it into a plan.
 * That separation is the vision's — the AI proposes a typed business request, and
 * a deterministic layer is what decides whether it means anything.
 *
 * **Why it lives here and not beside the IR.** The dependency direction is
 * `ai-assistant → shared`, never the reverse (see
 * `shared/src/modules/overrides.ts`). The IR and its schema belong in `shared`,
 * where they are dependency-free; the *act of calling a model* belongs here,
 * where a model is callable. Putting this file in `shared` would invert the
 * layering to save one import.
 *
 * **Who may ask.** The wire consults the same `(principal, agent)` binding the
 * routed dispatch paths do (`CC-27`): an AI worker that is not bound to
 * `business_ir.query_author` is refused (`agent_not_bound`) **before the model is
 * asked**, and a bound one runs under the binding's narrowed scope (`CC-55`). A
 * human session is a passthrough (`B4`). The binding is the grant; a grant that is
 * not consulted is not a grant — so this in-process path consults it too
 * (`CC-57`).
 *
 * Source: Doc 3 §49–§53 (`BusinessQueryIR` / `BusinessCommandIR`);
 * `library/development/ARCHITECTURE-request-outcomes.md`, outcome 3.
 */

import type { ZodIssue } from 'zod'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  BUSINESS_QUERY_IR_SCHEMA_NAME,
  businessQueryIrSchema,
} from '@open-mercato/shared/lib/business-ir/schema'
import type { BusinessQueryIR } from '@open-mercato/shared/lib/business-ir/types'
import type { AuthContext } from '@open-mercato/shared/lib/auth/server'
import { computeBoundRunScope, resolveAgentBinding } from './agent-binding'
import { runAiAgentObject } from './agent-runtime'
import type { AiChatRequestContext } from './attachment-bridge-types'

/**
 * The agent the wire uses.
 *
 * One named constant, not a string in two places: the caller that runs the agent
 * and the registry that declares it must agree, and the test that stubs the model
 * and the production path must exercise the *same* id.
 */
export const BUSINESS_IR_AGENT_ID = 'business_ir.query_author' as const

/** Re-exported, so a caller does not have to reach into `shared` for the name. */
export { BUSINESS_QUERY_IR_SCHEMA_NAME }

/** What the caller must supply — the prompt, and the scope it runs under. */
export interface AuthorBusinessQueryIrInput {
  /** The request in plain language: "invoices over 10,000 EUR, by customer". */
  prompt: string
  /**
   * The authenticated request context. Every scope decision (tenant,
   * organization, features) comes from here — **never** from the prompt, and
   * **never** from the IR the model emits (the IR has no scope field on purpose).
   */
  authContext: AiChatRequestContext
  /**
   * The authenticated **server** context — the source of the binding decision
   * (`CC-57`). Distinct from {@link authContext}: that one carries the *resolved*
   * scope the run executes under, this one carries the `sub`/`principal` the
   * binding is looked up **by**. The check is fail-closed for an `ai_worker` and
   * a passthrough for a human (`CC-27`), so the caller must state who is acting
   * rather than let the helper guess.
   */
  auth: AuthContext
  /**
   * The entity manager the binding lookup runs on (`CC-57`). Passed explicitly
   * rather than resolved from `container`, so this module's **one** database read
   * is visible at the call site and testable without a container.
   */
  em: EntityManager
  /** Optional per-call model override; resolution otherwise follows the agent. */
  modelOverride?: string
  /** Optional container for agent/tool resolution in a live request. */
  container?: unknown
}

/**
 * What comes back.
 *
 * A union rather than a throw, so a caller has to deal with "the model did not
 * produce a usable IR" instead of a `try/catch` it may forget. `ok: false`
 * carries the schema issues — the message the model would be shown if the caller
 * decides to retry.
 *
 * `reason: 'agent_not_bound'` (`CC-57`) means the acting principal may **not**
 * run this agent — the binding check refused it, before the model was asked. It
 * is a refusal, not a failure, so it carries nothing to retry.
 */
export type AuthorBusinessQueryIrResult =
  | { ok: true; ir: BusinessQueryIR }
  | { ok: false; reason: 'schema_rejected'; issues: ZodIssue[] }
  | { ok: false; reason: 'agent_error'; error: unknown }
  | { ok: false; reason: 'agent_not_bound' }

/**
 * Ask the configured agent to turn a plain-language request into a Business IR.
 *
 * **The constraint is the product here.** `generateObject` with
 * {@link businessQueryIrSchema} means the model is decoding against the IR's own
 * shape: `.strict()` objects reject unknown keys, required fields are required,
 * and enums are closed. A model that tries to widen its reach (`tenantId`) or to
 * guess (`foo`) does not get a partially-honoured answer — it gets a rejection.
 *
 * The result is re-parsed here even though the SDK already parsed it once. That
 * is not redundancy: the SDK's parse is an implementation detail of the SDK, and
 * this is the module's own guarantee to its caller. If the second parse ever
 * fails while the first passed, the SDK's contract has changed under us — and we
 * would rather find that at this boundary than in the compiler.
 */
export async function authorBusinessQueryIr(
  input: AuthorBusinessQueryIrInput,
): Promise<AuthorBusinessQueryIrResult> {
  let object: unknown
  try {
    // CC-57 — consult the grant BEFORE the model is asked anything. This is the
    // same fail-closed binding check the routed dispatch paths apply (`CC-27`):
    // an unbound `ai_worker` is refused here, as a value, with no model call. A
    // human principal is a passthrough (`B4`). Resolved inside the `try` so a
    // lookup failure is a value too, not a throw the caller may forget.
    const binding = await resolveAgentBinding({
      em: input.em,
      auth: input.auth,
      agentId: BUSINESS_IR_AGENT_ID,
    })
    if (!binding.bound) {
      return { ok: false, reason: 'agent_not_bound' }
    }

    // CC-55 / CC-57 — the binding's NARROWING (tools INTERSECT, features UNION)
    // is applied to the run, exactly as the routes do. `binding.bound` is true
    // here, so the scope is well-typed.
    const boundScope = computeBoundRunScope({ agentId: BUSINESS_IR_AGENT_ID, binding })

    const result = await runAiAgentObject({
      agentId: BUSINESS_IR_AGENT_ID,
      input: input.prompt,
      authContext: input.authContext,
      boundScope,
      ...(input.modelOverride !== undefined ? { modelOverride: input.modelOverride } : {}),
      ...(input.container !== undefined ? { container: input.container as never } : {}),
      output: {
        schemaName: BUSINESS_QUERY_IR_SCHEMA_NAME,
        schema: businessQueryIrSchema,
        mode: 'generate',
      },
    })

    if (result.mode !== 'generate') {
      // The override pins `mode: 'generate'`; a stream handle here would mean the
      // runtime ignored it, which is a contract break, not a user error.
      return { ok: false, reason: 'agent_error', error: new Error('expected generate mode') }
    }
    object = result.object
  } catch (error) {
    return { ok: false, reason: 'agent_error', error }
  }

  const parsed = businessQueryIrSchema.safeParse(object)
  if (!parsed.success) {
    return { ok: false, reason: 'schema_rejected', issues: parsed.error.issues }
  }
  return { ok: true, ir: parsed.data }
}
