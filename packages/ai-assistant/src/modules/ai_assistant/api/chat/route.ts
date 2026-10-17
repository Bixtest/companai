import { createLogger } from '@open-mercato/shared/lib/logger'
import { NextResponse, type NextRequest } from 'next/server'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
// OPEN — row 28 / R28-3: the chat route reaches the AI runtime THROUGH THE
// PORT, never by importing an engine. The engine itself (OpenCode today) sits
// behind the door as one implementation (`opencode-port-adapter.ts`) — see
// `ARCHITECTURE-hermes-integration.md` §4/§9 Phase 1 ("the port, with OpenCode
// behind it"). This file must not name an engine anywhere below this line.
import {
  type AiRuntimeEnvelope,
  type AiRuntimePort,
  type AiRuntimeRunResult,
  type AiRuntimeStreamEvent,
} from '../../lib/ai-runtime-port'
import { textInputRef } from '../../lib/opencode-port-adapter'
import { resolveAiRuntimePort } from '../../lib/resolve-ai-runtime-port'
import { resolveTenantRuntime } from '../../lib/agent-runtime-registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import type { EntityManager } from '@mikro-orm/postgresql'
import {
  generateSessionToken,
  createSessionApiKey,
  bindOpencodeSessionToApiKey,
  findApiKeyByOpencodeSessionId,
} from '@open-mercato/core/modules/api_keys/services/apiKeyService'
import { checkAiChatRateLimit } from '../../lib/rate-limit'
import { getUserRoleIds } from '../../lib/user-role-ids'
import { createOpenCodeClient } from '../../lib/opencode-client'

const logger = createLogger('ai_assistant')

/**
 * A process-monotonic counter that makes each run's id unique even when two
 * runs start in the same millisecond. Purely local — it carries no authority
 * and is never a security token.
 *
 * **The honest limit (hostile-critic finding 3, 2026-10-11).** Today the port
 * is constructed **once per request** (`resolveAiRuntimePort` is called inside
 * the handler), so its run registry is request-scoped and two requests can
 * never collide through the adapter. The counter is therefore *not* load-
 * bearing today; it makes the id collision-proof as a property of the id
 * itself, so the safety does not depend on the adapter staying per-request.
 * It does **not** survive a module reload or span multiple server instances —
 * if the adapter ever became a process singleton (or the app ran in more than
 * one instance), a `<conv>:<engine>:run-<t>-1` from two instances could still
 * collide, and this counter would not prevent it. That limit is named here
 * rather than hidden; a truly process-global id would need a server-minted
 * UUID, which is the port's `runId` contract's business, not this file's.
 */
let runCounter = 0

/**
 * Mint the run id for one chat turn. Exported so its two guarantees can be
 * tested directly (a run is not a transcript; a run id is unique per run):
 *
 *  - **distinct from the conversation id** — §4.2's rule that the identifiers
 *    stay separate, which the R28-2 hostile critic made us enforce;
 *  - **unique per run, not per millisecond** — a repeated run id is treated by
 *    the adapter as an idempotent re-start, so two runs sharing an id would
 *    make the second never stream. The monotonic counter removes that.
 *
 * `implementation` is the engine that will serve this turn (`P2-5`, §2.11). It is
 * **required, not defaulted**: the id carries the engine name as its second
 * segment, and a defaulted `opencode` would write a false engine into the audit
 * record the moment a different engine served the run. The caller resolves the
 * engine before minting, so it always knows which one it is.
 */
export function mintChatRunId(
  conversationId: string,
  startedAt: number,
  implementation: string,
): string {
  const sequence = ++runCounter
  return `${conversationId}:${implementation}:run-${startedAt}-${sequence}`
}

/**
 * Close a run at the door (row 28 / R28-4) — the ONE place the chat route ends
 * a run, so "failure is normal" is a property of a single function rather than
 * a rule repeated at three call sites.
 *
 * **What it does, in order.** If the run was aborted (the browser closed the
 * socket — the Stop button, or a closed tab), it first asks the door to
 * **cancel** the run, then reports the run's outcome to the door. Cancelling
 * before completing is what makes a cancelled run record `cancelled`, not
 * `completed`: the adapter checks `completed` first, so completing before
 * cancelling would freeze the run as completed and the cancel would then be a
 * no-op (`already-complete`).
 *
 * **Why both calls are safe to repeat (that is the whole point of R28-4).**
 * `cancelRun` returns a *value* — a second cancel answers `already-cancelled`,
 * never an error. `completeRun` is replay-safe — a second completion reports
 * `alreadyComplete` and changes nothing. So this function may be reached twice
 * (e.g. the abort fires *and* the `finally` runs) without double-counting, and
 * it is the reason the sequence is fixed *here* rather than left to each caller.
 *
 * **The one honest limit (stated, not hidden).** The cancel is *cooperative*
 * for the engine behind the door today: `cancelRun` marks the run cancelled and
 * the consumer stops being fed further events, but the adapter holds no handle
 * to force-tear-down the engine's in-flight call (see the adapter's own header,
 * R28-2). This helper does not pretend otherwise — it reports the outcome the
 * door can actually vouch for.
 */
export async function closeChatRun(
  port: AiRuntimePort,
  runId: string,
  outcome: { aborted: boolean; status?: AiRuntimeRunResult['status']; implementation?: string },
): Promise<void> {
  const status: AiRuntimeRunResult['status'] = outcome.status ?? (outcome.aborted ? 'cancelled' : 'completed')

  if (outcome.aborted) {
    // Bounded and idempotent (§4.3): a second cancel is a value, not an error.
    await port.cancelRun(runId)
  }

  // Replay-safe (§4.3): a second completion does not double-count. `status` is
  // the honest outcome — `cancelled` when the abort was observed, so a run the
  // user stopped is recorded as stopped, never as finished.
  //
  // `implementation` rides the result's provenance (`P2-5`, §2.11): once the
  // engine is selectable, a run's ledger entry must say WHICH engine served it,
  // or two engines' runs are indistinguishable in the record. It is omitted when
  // the caller does not know, rather than guessed.
  await port.completeRun(runId, {
    status,
    ...(outcome.implementation ? { provenance: { implementation: outcome.implementation } } : {}),
  })
}

/**
 * The engine choice used to live here, as a private function that could only
 * ever return OpenCode (`P2-5`, §2.11). It is now
 * `lib/resolve-ai-runtime-port.ts::resolveAiRuntimePort` — extracted so the row's
 * claim (*"swapping engines touches exactly one function"*) is **provable by a
 * test** rather than only assertable in a docstring. This file no longer
 * constructs an adapter at all: it calls the selector and talks to the port it
 * returns, never to an engine by name.
 */

/**
 * System instructions injected at the start of new chat sessions.
 * These ensure the AI follows the correct workflow for data operations.
 */
const CHAT_SYSTEM_INSTRUCTIONS = `
You are a helpful business assistant for Companai.

═══════════════════════════════════════
ABSOLUTE RULES — FOLLOW THESE OR BE CUT OFF
═══════════════════════════════════════
1. READ = GET only. If the user says find/list/show/search/get → use only GET. NEVER call PUT/POST/DELETE for a read query.
2. PUT path = collection path. id goes in the BODY, not the URL. Example: PUT /api/customers/companies with { id: '...', name: 'New' }. There are NO /{id} path segments.
3. Confirm before ANY write. Before POST/PUT/DELETE: present your plan in business language, then STOP and wait for user to say "yes". Do NOT execute the write in the same turn.
4. Maximum 4 tool calls per message. Hard limit is 10.

You have 2 tools — both accept a "code" parameter with an async JavaScript arrow function.

TOOL: search — discover endpoints and schemas (READ-ONLY, fast)
  - spec.findEndpoints(keyword) → [{ path, methods }]
  - spec.describeEndpoint(path, method) → COMPACT: { requiredFields, optionalFields, nestedCollections, example, relatedEndpoints, relatedEntity }
  - spec.describeEntity(keyword) → { className, fields, relationships }

TOOL: execute — make API calls (reads and writes)
  - api.request({ method, path, query?, body? }) → { success, statusCode, data }

COMMON API PATHS (use directly — do NOT call findEndpoints for these):
  /api/customers/companies      — companies (GET list, POST create, PUT update)
  /api/customers/people         — contacts/people
  /api/customers/deals          — deals/opportunities
  /api/customers/activities     — activities/tasks
  /api/sales/orders             — sales orders
  /api/sales/quotes             — quotes
  /api/sales/invoices           — invoices
  /api/catalog/products         — products
  /api/catalog/categories       — categories

═══════════════════════════════════════
RECIPES — follow EXACTLY for each task type
═══════════════════════════════════════

FIND/LIST records (1 call):
  For COMMON PATHS: skip describeEndpoint, go straight to execute.
  1. execute: api.request({ method: 'GET', path: '/api/<module>/<resource>' })
  The "search" query param only matches indexed text fields — it will NOT match concepts like "Polish" or "large".
  For conceptual/subjective queries, fetch ALL records and use YOUR reasoning to identify matches from the returned data.
  For unknown paths: 1 search + 1 execute.

UPDATE a record (3-4 calls):
  1. search: spec.describeEndpoint('/api/<module>/<resource>', 'PUT')  → learn requestBody fields AND relatedEntity
  2. execute: GET the record → find it, get its ID
  3. execute: PUT to the COLLECTION path with id IN THE BODY:
     api.request({ method: 'PUT', path: '/api/<module>/<resource>', body: { id: '<uuid>', ...changes } })
  NOTE: All CRUD endpoints use the COLLECTION path. The id goes in the request BODY, not the URL. There are NO /{id} path segments.

CREATE a record (2-3 calls):
  1. search: spec.describeEndpoint('/api/<module>/<resource>', 'POST') → gives requiredFields, optionalFields, nestedCollections, and a working example
  2. Ask user for confirmation with the field values
  3. execute: api.request({ method: 'POST', ...body })
  If the endpoint has nestedCollections (like lines), include them INLINE in the body — do NOT create them separately.
  Use the "example" from describeEndpoint as your template — fill in real values.
  Example — create a quote with line items:
    api.request({ method: 'POST', path: '/api/sales/quotes', body: {
      currencyCode: 'EUR', customerEntityId: '<company-uuid>',
      lines: [{ currencyCode: 'EUR', quantity: 1, productId: '<product-uuid>', name: 'Product Name', kind: 'product' }]
    }})
  Do NOT create lines separately. Do NOT include id, quoteId, or total fields — the server generates them.

CREATE MULTIPLE records (2-3 calls):
  1. search: spec.describeEndpoint('/api/<module>/<resource>', 'POST') → learn fields + example
  2. execute: loop in one call:
     async () => {
       const results = [];
       for (const item of items) {
         results.push(await api.request({ method: 'POST', path: '...', body: item }));
       }
       return results;
     }

DISCOVER (what endpoints/entities exist) (1 call):
  1. search: spec.findEndpoints('<keyword>') or spec.describeEntity('<keyword>')

═══════════════════════════════════════
HARD RULES
═══════════════════════════════════════
- MAXIMUM 4 tool calls per user message. You WILL be cut off after 10.
- NEVER call findEndpoints or describeEndpoint for COMMON PATHS listed above — use them directly with execute.
- NEVER call describeEntity if describeEndpoint already returned relatedEntity.
- NEVER repeat a search from earlier in the conversation — reuse previous results.
- NEVER make N+1 API calls (1 call per record). Fetch a list and reason about the results yourself.
- When you already have the data you need from a previous call, use it — do NOT fetch more data to "enrich" it.
- Do NOT write JavaScript filters/regex to match records. Fetch data with a simple api.request() call and use YOUR knowledge to interpret the results.
- The "search" query param is fulltext only — it won't match nationalities, categories, or subjective criteria. For those, fetch all and reason.
- describeEndpoint returns a COMPACT summary with requiredFields, optionalFields, and an example. Use the example as your template — fill in real values and send it.
- For fields you don't know, OMIT them — the API uses defaults for optional fields.
- NEVER try to set computed/total fields (amounts, totals, counts) — the server calculates them.
- For updates: describeEndpoint gives you the field names. Go straight to GET + PUT. PUT path is the COLLECTION path, id in BODY.
- For creates with children (e.g. quote + lines): include children INLINE in the body using the nestedCollections field name.

RESPONSE RULES:
- Be proactive — fetch data and present results, don't ask what the user wants to see.
- Never show technical terms, IDs, JSON, or internal reasoning.
- Present results in clean business language with **bold names** and bullet points.
- Only ask for confirmation before create/update/delete operations.
`.trim()

export const openApi: OpenApiRouteDoc = {
  tag: 'AI Assistant',
  summary: 'AI chat',
  methods: {
    POST: { summary: 'Send message to AI agent via SSE stream' },
  },
}

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['ai_assistant.view'] },
}

/**
 * Chat endpoint that routes messages to OpenCode agent.
 * OpenCode connects to MCP server for tool access (search, execute, context_whoami).
 *
 * Emits verbose SSE events for debugging:
 * - thinking: Agent started processing
 * - metadata: Model, tokens, timing info
 * - tool-call: Tool invocation with args
 * - tool-result: Tool response
 * - text: Response text
 * - question: Confirmation question from agent
 * - done: Complete with session ID
 * - error: Error occurred
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req)

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { messages, sessionId, answerQuestion } = body as {
      messages?: Array<{ role: string; content: string }>
      sessionId?: string
      // For answering a question
      answerQuestion?: {
        questionId: string
        answer: number
        sessionId: string
      }
    }

    // Create SSE stream for frontend compatibility
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    let writerClosed = false

    const writeSSE = async (event: AiRuntimeStreamEvent | { type: string; [key: string]: unknown }) => {
      if (writerClosed) return // Guard against writes after close
      try {
        const jsonStr = JSON.stringify(event)
        await writer.write(encoder.encode(`data: ${jsonStr}\n\n`))
      } catch (err) {
        // Writer may have been closed by client disconnect
        logger.warn('Failed to write SSE event', { eventType: event.type })
      }
    }

    const closeWriter = async () => {
      if (writerClosed) return
      writerClosed = true
      try {
        await writer.close()
      } catch {
        // Already closed
      }
    }

    // Resolve a request-scoped EntityManager once — needed both by the
    // answerQuestion short-circuit (for ownership re-check) and by the
    // streaming branch (for session-token mint + post-`done` binding).
    const container = await createRequestContainer()
    const em = container.resolve<EntityManager>('em')

    // `SR-02` — the tenant's registered runtime, when it has one. This is the first
    // production reader of the `ai_agent_runtimes` row; `null` means the tenant has
    // registered nothing, and the selector below then behaves exactly as it did
    // before this table existed. A tenant with several runtimes and no binding
    // throws rather than being guessed at — see `agent-runtime-registry`.
    const tenantRuntime = await resolveTenantRuntime({
      em,
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId ?? null,
    })

    // The AI runtime door. Every engine call below goes through `port`. The
    // engine is chosen by the selector (§2.11), which also NAMES it back to us —
    // so both the run id and the run's ledger provenance say which engine
    // answered, instead of assuming OpenCode.
    const { port, implementation } = resolveAiRuntimePort({
      em,
      tenantRuntime,
      auth: {
        userId: auth.sub,
        tenantId: auth.tenantId ?? null,
        organizationId: auth.orgId ?? null,
      },
    })

    // The identity fields the door's envelope needs, read from the
    // authenticated principal (server-minted; the runtime cannot name its own).
    const actorIdentity = {
      userId: auth.sub,
      tenantId: auth.tenantId ?? null,
      organizationId: auth.orgId ?? null,
    }

    // Handle question answer - simple JSON response, not SSE
    // The original SSE stream continues and will receive the follow-up response
    //
    // REGISTERED BYPASS (`CC-69`, row 28 / R28-3): answering an in-flight
    // question is NOT a run — the port's contract (§4.1) has no
    // "list/answer a paused question" operation, and inventing a ninth one is a
    // design decision, not a wiring move. This is the ONE remaining place the
    // chat route reaches an engine directly; it is ownership-checked below
    // (fail-closed 403) and tracked in `COMPLETION-CALLBACKS.md`.
    if (answerQuestion) {
      try {
        const client = createOpenCodeClient()
        // Resolve the question's actual sessionID from the engine — never
        // trust the caller-supplied `answerQuestion.sessionId` blindly.
        const pending = await client.getPendingQuestions()
        const matching = pending.find((q) => q.id === answerQuestion.questionId)
        if (!matching) {
          // Unknown / stale question id — same opaque response as a
          // foreign-owner mismatch to avoid leaking which case occurred.
          return NextResponse.json({ error: 'Session not available' }, { status: 403 })
        }
        if (matching.sessionID !== answerQuestion.sessionId) {
          return NextResponse.json({ error: 'Session not available' }, { status: 403 })
        }
        // Look up the api_key row bound to this session and
        // assert ownership matches the authenticated caller.
        const ownerRow = await findApiKeyByOpencodeSessionId(em, matching.sessionID)
        if (
          !ownerRow ||
          ownerRow.sessionUserId !== actorIdentity.userId ||
          (ownerRow.tenantId ?? null) !== actorIdentity.tenantId ||
          (ownerRow.organizationId ?? null) !== actorIdentity.organizationId
        ) {
          return NextResponse.json({ error: 'Session not available' }, { status: 403 })
        }

        await client.answerQuestion(answerQuestion.questionId, answerQuestion.answer)
        return NextResponse.json({ success: true })
      } catch (error) {
        // Fail-closed: any failure during the answerQuestion path — ownership
        // mismatch, OpenCode unreachable, getPendingQuestions throwing,
        // findApiKeyByOpencodeSessionId throwing — returns the same opaque
        // 403 envelope used for ownership rejection. This matches finding #1's
        // security intent that the answerQuestion short-circuit MUST NOT leak
        // whether the failure was authorization vs backend connectivity vs
        // implementation error. The real reason is captured in server logs.
        logger.error('AI Chat — Answer error', { err: error })
        return NextResponse.json({ error: 'Session not available' }, { status: 403 })
      }
    }

    // Handle regular message
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    // Get the latest user message
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    // Bound per-user LLM spend, DB writes (incl. the ephemeral session-key insert
    // below), and SSE buffering. Fail-open so a missing limiter never blocks a turn.
    // Reuses the request container resolved above for the answerQuestion ownership re-check.
    const rateLimited = await checkAiChatRateLimit({
      req,
      container,
      userId: auth.sub,
      tenantId: auth.tenantId,
    })
    if (rateLimited) return rateLimited

    const chatStartTime = Date.now()
    logger.info('Chat request', {
      userId: auth.sub,
      sessionId: sessionId ? sessionId.slice(0, 16) : 'new',
      messageChars: lastUserMessage.length,
    })

    // For new sessions, create an ephemeral API key that inherits user permissions
    // The API key secret is encrypted and stored; MCP server recovers it via session token
    let sessionToken: string | null = null
    if (!sessionId) {
      try {
        // Get user's role IDs from database
        const userRoleIds = await getUserRoleIds(em, auth.sub, auth.tenantId)

        // Generate session token and create ephemeral key
        sessionToken = generateSessionToken()
        await createSessionApiKey(em, {
          sessionToken,
          userId: auth.sub,
          userRoles: userRoleIds,
          tenantId: auth.tenantId,
          organizationId: auth.orgId,
          ttlMinutes: 120,
        })
        logger.info('Created session token')
      } catch (error) {
        logger.error('AI Chat — Failed to create session key', { err: error })
        // Continue without session key - tools will use static API key auth
      }
    }

    // Build the message to send to OpenCode
    // For NEW sessions: inject system instructions + session token
    // For existing sessions: only inject session token if available
    let messageToSend = ''

    // For NEW sessions only, prepend system instructions
    if (!sessionId) {
      messageToSend = `${CHAT_SYSTEM_INSTRUCTIONS}\n\n`
    }

    // If we have a session token, prepend explicit instructions for the AI to include it in tool calls
    if (sessionToken) {
      messageToSend += `[Session Authorization: ${sessionToken}. Include "_sessionToken": "${sessionToken}" in EVERY tool call.]\n\n`
    }

    messageToSend += lastUserMessage

    // Process in background - starts AFTER Response is returned so there's a reader for the stream
    ;(async () => {
      let toolCallCount = 0
      let lastTokens: { input?: number; output?: number } | undefined
      let resultSessionId: string | undefined
      // The run this turn opened at the door, when it got that far. Hoisted so
      // the `finally` can close it (R28-4) even when the run ends by throwing.
      let runId: string | undefined
      // True once the client has gone away (Stop button, or closed tab). Read by
      // the `finally` to record the honest outcome — `cancelled`, not `completed`.
      let aborted = false

      // Observe the client disconnect (row 28 / R28-4). The UI's Stop button
      // aborts the browser's own fetch, which closes this request's socket; that
      // is the ONLY signal the server gets that the user stopped the run. We do
      // not cancel here — we only remember it, so the run is closed at the door
      // in ONE place below (cancelling here and again in `finally` would be
      // harmless — cancel is idempotent — but the single close point is what
      // keeps the ordering — cancel BEFORE complete — in one readable place).
      if (req.signal) {
        const onAbort = () => {
          aborted = true
          logger.info('Chat run aborted by client', { userId: auth.sub })
        }
        if (req.signal.aborted) onAbort()
        else req.signal.addEventListener('abort', onAbort, { once: true })
      }

      try {
        // Emit session-authorized event first (if we have a token)
        if (sessionToken) {
          logger.info('AI Chat — Emitting session-authorized event')
          await writeSSE({
            type: 'session-authorized',
            sessionToken: sessionToken.slice(0, 12) + '...',
          })
        }

        // Emit thinking event for UX feedback
        await writeSSE({ type: 'thinking' })

        // ── The door (row 28 / R28-3) ──────────────────────────────────────
        // Build the envelope the platform admits, then start the run and
        // stream it. The engine is never named; `port` decides what sits
        // behind it. Identity is minted here (server-side) and the run id is
        // distinct from the conversation id (the §4.2 rule the R28-2 hostile
        // critic made us apply — a run is not a transcript).
        //
        // The tenant is REQUIRED by the envelope and must not be empty: an
        // empty tenant read as "no restriction" would be a fail-open
        // (hostile-critic finding 4). The chat route already refuses an
        // unauthenticated request; this makes the same refusal explicit for a
        // missing tenant.
        if (!actorIdentity.tenantId) {
          await writeSSE({ type: 'error', error: 'A tenant is required to start a run' })
          return
        }

        // The run id must be UNIQUE PER RUN, not merely per millisecond (see
        // `mintChatRunId`).
        const conversationId = sessionId ?? `chat:${actorIdentity.userId}:${chatStartTime}`
        runId = mintChatRunId(conversationId, chatStartTime, implementation)
        const envelope: AiRuntimeEnvelope = {
          schemaVersion: 1,
          runId,
          tenantId: actorIdentity.tenantId,
          principalId: actorIdentity.userId,
          actorId: actorIdentity.userId,
          agentId: 'ai_assistant.chat',
          conversationId,
          // An explicit resume only when the caller supplied a session id.
          runtimeSessionId: sessionId ?? null,
          // A PER-TURN, NARROW grant: the user may act as themselves for this
          // chat turn. It is NOT the ephemeral session key (that stays a
          // referenced secret in the message, never an envelope value) and it
          // is NOT read by the OpenCode adapter yet — see `CC-70`. It is the
          // honest carrier for the authority this run acts under, and the
          // first engine that performs a business operation must consult it.
          capabilityGrantId: `chat-turn:${actorIdentity.userId}:${runId}`,
          allowedInputRefs: [textInputRef(messageToSend)],
          correlationId: runId,
        }

        await port.startRun(envelope)
        await port.streamRun(runId, async (event) => {
          // Track usage from stream events
          if (event.type === 'tool-call') toolCallCount++
          if (event.type === 'metadata' && 'tokens' in event) lastTokens = event.tokens
          if (event.type === 'done' && 'sessionId' in event) {
            resultSessionId = event.sessionId
            // First-time binding: when the caller did NOT supply a
            // sessionId (i.e., this is a freshly minted chat) and we
            // successfully created a session token earlier, bind the
            // newly-resolved session id to that api_key row so
            // subsequent resumes can be authorized.
            if (!sessionId && sessionToken && event.sessionId) {
              try {
                await bindOpencodeSessionToApiKey(em, sessionToken, event.sessionId)
              } catch (bindErr) {
                // The response stream is already in-flight — surface the
                // failure to logs without disturbing the SSE pipeline.
                logger.error('AI Chat — Failed to bind session to api_key', { err: bindErr })
              }
            }
          }

          await writeSSE(event)
        })
      } catch (error) {
        logger.error('AI Chat — runtime error', { err: error })
        await writeSSE({
          type: 'error',
          error: error instanceof Error ? error.message : 'OpenCode request failed',
        })
      } finally {
        // ── Close the run at the door (row 28 / R28-4) ─────────────────────
        // Every run that opened at the door is closed here, once: cancelled
        // first when the client went away, then completed with the honest
        // status. Both calls are safe to repeat (cancel → `already-cancelled`,
        // complete → `alreadyComplete`), so a run that is aborted AND reaches
        // this `finally` is not double-counted. Failure is normal, and this is
        // the one place the route treats it so.
        if (runId) {
          try {
            await closeChatRun(port, runId, { aborted, implementation })
          } catch (closeErr) {
            // Closing the run must never break the response — the user already
            // has (or has abandoned) the stream. Surface it to logs only.
            logger.error('AI Chat — failed to close run at the door', { err: closeErr })
          }
        }

        const durationMs = Date.now() - chatStartTime
        logger.info('Chat complete', {
          userId: auth.sub,
          sessionId: (resultSessionId || sessionId || 'unknown').slice(0, 16),
          durationMs,
          toolCalls: toolCallCount,
          inputTokens: lastTokens?.input || 0,
          outputTokens: lastTokens?.output || 0,
        })
        await closeWriter()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    logger.error('AI Chat — Error', { err: error })
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 })
  }
}
