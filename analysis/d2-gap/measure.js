#!/usr/bin/env node
/**
 * D2-gap measurement — walk every write verb in every ENABLED module's api/
 * tree and classify how it is guarded.
 *
 * Why a script and not a grep: the question is per-ROUTE-FILE ("does this file
 * export a write verb, and does that code path reach a guard?"), and a raw text
 * grep of the guard names answers a different question — it counts mentions,
 * including comments (the `planner` lesson: neither handler was a `route.ts`)
 * and misses files whose handler is a bare `export async function POST`.
 *
 * Classification, in the order the backlog specifies:
 *   GUARDED_WRAPPER   references begin<Module>MutationGuard -> this module's wrapper
 *   GUARDED_REGISTRY  references runRouteMutationGuards directly
 *   GUARDED_CRUD      built by makeCrudRoute (runs collectAndRunGuards itself)
 *   GUARDED_LOCAL     calls a module-local guard helper (see LOCAL_GUARD_HELPERS)
 *   GUARDED_DEPRECATED references only the @deprecated pair -> D2-wide territory
 *   UNGUARDED         exports a write verb and references no guard at all -> D2-gap
 *
 * GUARDED_LOCAL exists because "references none of the four shared symbols" is
 * NOT the same claim as "checked by nothing". `messages` proved it: every one
 * of its 17 write verbs calls `runMessageMutationGuards()`, a module-local
 * helper — so the D2-gap definition ("no guard whatsoever … checked by
 * nothing") was measurably FALSE for them, yet a four-symbol scan reads them as
 * GAP. A tool that cannot tell those apart over-claims, so the class is named
 * in LOCAL_GUARD_HELPERS rather than left in the GAP column.
 *
 * ⚠ THE LIMIT OF THIS BUCKET — it proves a guard CALL, not a REGISTRY guard.
 * Four helpers (`messages`, `integrations`, `payment_gateways`, `staff`) were
 * first written to run the legacy bridge ALONE — `runMutationGuards([legacyGuard])`
 * — which silently skips `getAllMutationGuardInstances()`. That is the SAME
 * one-way failure as the deprecated pair (D2-wide), just reached locally. All
 * four (plus two inline copies in `sales/api/quotes/{convert,send}` and one in
 * `configs/api/cache`) have been re-pointed at the registry. The tool cannot
 * detect a helper that regresses to legacy-only — that is a call-graph fact, not
 * a string — so `pending` here means "a helper exists AND was last read by hand".
 *
 * Two later entries (`communication_channels` via `validateRouteMutationGuard`,
 * `notifications` via `runGuardedNotificationWrite` + its two factories) were
 * added for a DIFFERENT reason: the helper was registry-backed from the start,
 * and the tool simply did not know its name, so a module that was fully guarded
 * read as fully unguarded. In both cases the correction changed the TOOL, not
 * the repo. Either way the rule holds: re-read the helper body by hand when this
 * number matters.
 * Re-read the LOCAL_GUARD_HELPERS bodies when this number matters.
 *
 * Usage: node measure.js [--json]
 */
const fs = require('fs');
const path = require('path');

const REPO = process.argv.find((a) => a.startsWith('--repo='))?.slice(7)
  || 'C:/Users/Ramzi/Downloads/companai/workspace/starting-kit';

// The ENABLED set, read from the app's own registry rather than typed by hand.
function readEnabledModules() {
  const file = path.join(REPO, 'apps/mercato/src/modules.ts');
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('export const enabledModules');
  const end = src.indexOf('enabledModules.push(', start);
  const block = src.slice(start, end === -1 ? undefined : end);
  const ids = new Set();
  for (const m of block.matchAll(/id:\s*'([a-z_0-9]+)'/g)) ids.add(m[1]);
  // conditional pushes that are unconditional in practice for this app
  return [...ids].sort();
}

// Where a module's source lives: core by default, but packages carry some.
function resolveModuleDir(id) {
  const candidates = [
    path.join(REPO, 'packages/core/src/modules', id),
    path.join(REPO, 'packages', id, 'src/modules', id),
    // App-local modules (`from: '@app'`) live under the app, not under packages/.
    // `ratelimit_probe` is the one default-enabled case; without this candidate
    // the tool silently skipped it and the "all 35 enabled modules" claim was
    // false by one (found by a hostile-critic pass, 2026-10-07).
    path.join(REPO, 'apps/mercato/src/modules', id),
  ];
  // package-backed modules (@open-mercato/content, /events, /search, ...)
  const pkgs = fs.readdirSync(path.join(REPO, 'packages')).filter((p) => !p.startsWith('.'));
  for (const p of pkgs) {
    candidates.push(path.join(REPO, 'packages', p, 'src/modules', id));
  }
  for (const c of candidates) {
    try { if (fs.statSync(c).isDirectory()) return c; } catch { /* keep looking */ }
  }
  return null;
}

// Does the file EXPORT a write verb, however it is spelled?
//   export async function POST(...)
//   export const POST = async (...) => ...
//   export const POST = crud.POST            <- the one a naive regex misses
//   export { POST, PUT } from './x'          <- a re-export
//   export default ... with a POST in it     <- not a write verb; ignored
const ANY_WRITE_EXPORT = /(?:^|\n)\s*export\s+(?:async\s+)?(?:function|const|let|var|\{)[^\n]*\b(POST|PUT|PATCH|DELETE)\b/;
// A GET handler can also WRITE. The method-based write-verb scan above is blind
// to it, so a write performed inside a GET reached no guard AND was invisible to
// the count — the worst of both. `communication_channels/api/get/oauth/[provider]/
// callback/route.ts` is that shape: a GET that saves credentials + creates a
// channel. Found by a hostile-critic pass over the `communication_channels`
// close-out (2026-10-07). The two regexes below make the class VISIBLE: a route
// file that exports GET, performs a write, and exports no write verb is
// classified WRITE_GET_GUARDED / WRITE_GET_UNGUARDED (never silently dropped).
const RE_GET_EXPORT = /(?:^|\n)\s*export\s+(?:async\s+)?(?:function|const|let|var)\s+GET\b/;
// Strong write signals only — an ORM/command/raw-SQL write, not any `.create(`.
const RE_WRITE_SIGNAL = /\b(?:\.persist\s*\(|\.flush\s*\(|commandBus\.execute\s*\(|credentialsService\.save\s*\(|createConnectedChannelRow\s*\(|INSERT\s+INTO\b)/;
// A re-export of the verb inherits the source's guard. Two spellings:
//   export { POST, PUT } from './x'   <- inline, names the source
//   import { GET, POST } from './x'
//   export { GET, POST }              <- bare, the source is the import above
// The second form was missed until `webhooks/api/route.ts` exposed it: a
// two-line shim whose real handler (`./webhooks/route.ts`) is `makeCrudRoute`
// (GUARDED_CRUD), yet the shim read as an unguarded write verb. That is a tool
// defect, not a repo defect, so it is fixed HERE.
const RE_REEXPORT_INLINE = /(?:^|\n)\s*export\s*\{[^}]*(POST|PUT|PATCH|DELETE)[^}]*\}\s*from/;
// The bare form is only a re-export when the file does not define the verb
// locally AND the exported entry is the bare verb name (not an alias). If the
// verb has a local `export function POST` / `export const POST` (or an inner
// `function POST` / `const POST`), the file OWNS the handler and a missing
// guard must still read as GAP — a bare `export { POST }` must not launder it.
// An ALIASED entry (`helpers as POST`) likewise must not count: the token
// `POST` appears only as an alias target, so the file may own an unguarded
// write under that name; conservatively it reads GAP. `writeVerbs()` already
// finds the local definition, so the two agree by construction.
const RE_LOCAL_VERB_DEF = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:function|const|let|var)\s+(POST|PUT|PATCH|DELETE)\b/g;
const RE_REEXPORT_BARE = /(?:^|\n)\s*export\s*\{([^}]*)\}/g;

const RE_WRAPPER = /begin[A-Za-z]*MutationGuard\s*\(/;
const RE_REGISTRY = /runRouteMutationGuards\s*\(/;
// The registry can also be reached INLINE, without the shared wrapper: a route
// that reads the global guard store and runs it itself is doing exactly what
// `runRouteMutationGuards` does. `configs/api/cache/route.ts` is that shape —
// it imports `runMutationGuards` + `getAllMutationGuardInstances`, builds
// `[...getAllMutationGuardInstances()]`, and runs `runMutationGuards(...)`.
// Reading it as GAP (because it only referenced `runMutationGuards`, not the
// wrapper's name) was a tool blind spot, the same class as the two
// `LOCAL_GUARD_HELPERS` misses. Require BOTH symbols so a file that merely
// imports the runner without the store is not mistaken for registry-backed.
const RE_REGISTRY_INLINE_STORE = /getAllMutationGuardInstances\s*\(/;
const RE_REGISTRY_INLINE_RUN = /\brunMutationGuards\s*\(/;
// `crud.POST` / `makeCrudRoute(...)` / `createCrudRoute` — the factory runs the guard set itself.
const RE_CRUD = /makeCrudRoute\b|createCrudRoute\b|\bcrud\.(?:POST|PUT|PATCH|DELETE)\b/;
const RE_DEPRECATED = /validateCrudMutationGuard\s*\(|runCrudMutationGuardAfterSuccess\s*\(/;

/**
 * Module-local guard helpers — write routes that call one of these reach a
 * guard through a module-owned wrapper rather than through the four shared
 * symbols. Each entry is `moduleId` -> the helper call name(s) to look for.
 *
 * A helper belongs here ONLY if it actually runs guards. `messages`' helper was
 * first written to run the legacy bridge only (which silently skipped the
 * registry) — it has since been re-pointed at the registry, and this entry
 * records that the routes reach the guard set. Re-check this list whenever a
 * listed module's helper changes.
 */
const LOCAL_GUARD_HELPERS = {
  messages: /\brunMessageMutationGuards\s*\(/,
  integrations: /\brunIntegrationMutationGuards\s*\(/,
  payment_gateways: /\brunPaymentGatewayMutationGuards\s*\(/,
  staff: /\brunStaffMutationGuards\s*\(/,
  // `communication_channels` guards its routes through `validateRouteMutationGuard`
  // (lib/route-mutation-guard.ts), which is NOT legacy-only: it calls
  // `runRouteMutationGuards` -> `getAllMutationGuardInstances()` + the bridged
  // legacy guard. Proven by lib/__tests__/route-mutation-guard.test.ts, which
  // registers a real guard and asserts the helper BLOCKS on it and fires its
  // afterSuccess. Added after the D2-gap label read 15 unguarded here while the
  // artefact showed 11 of the 15 already calling this helper.
  communication_channels: /\bvalidateRouteMutationGuard\s*\(/,
  // `notifications` guards its routes through `lib/routeHelpers.ts`, which re-exports
  // three entry points that all reach the registry via `runRouteMutationGuards`:
  //   - `runGuardedNotificationWrite()`        — called directly by route.ts, settings,
  //                                              mark-all-read, [id]/action, [id]/restore
  //   - `createBulkNotificationRoute()`         — used by batch, feature, role
  //   - `createSingleNotificationActionRoute()`  — used by [id]/read, [id]/dismiss
  // All three are defined in the SAME file and the two factories call
  // `runGuardedNotificationWrite` internally, so a caller of a factory still runs the
  // guard. The marker therefore matches ANY of the three names (a regex on
  // `runGuardedNotificationWrite` alone would miss the five routes that consume a
  // factory). Registry-backed, proven by lib/__tests__/routeHelpers.guard.test.ts,
  // which registers a real guard and asserts the helper BLOCKS on it and fires its
  // afterSuccess. Added after the D2-gap label read 10 unguarded here while all ten
  // route files import one of these three helpers.
  notifications: /\b(?:runGuardedNotificationWrite|createBulkNotificationRoute|createSingleNotificationActionRoute)\s*\(/,
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

function stripComments(src) {
  // Remove block and line comments so a guard name in prose is not counted.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Count the WRITE VERBS a file exports — the unit the backlog records.
 * `directory/organization-edges/route.ts` is ONE file with THREE unguarded
 * verbs (POST, PATCH, DELETE); the backlog records "3", so the script must too.
 * Reading a file as "1" was a unit error, caught by comparing against the
 * recorded figures rather than by re-reading my own output.
 */
function writeVerbs(code) {
  const verbs = new Set();
  for (const m of code.matchAll(/(?:^|\n)\s*export\s+(?:async\s+)?(?:function|const|let|var|\{)([^\n]*)/g)) {
    const line = m[1];
    for (const v of line.matchAll(/\b(POST|PUT|PATCH|DELETE)\b/g)) verbs.add(v[1]);
  }
  return [...verbs];
}

/**
 * Auth-flow endpoints are NOT counted as D2-gap. They change session/credential
 * state and are guarded by their own mechanisms (rate limits, token checks,
 * one-shot reset tokens). The backlog measured `auth` as "12 unguarded
 * resource-writes" and set these eight aside by name; counting them would
 * inflate the figure. Kept identical to the backlog's list so the two agree.
 */
const AUTH_FLOW_PATHS = [
  'auth/api/feature-check.ts',
  'auth/api/locale/route.ts',
  'auth/api/login.ts',
  'auth/api/logout.ts',
  'auth/api/profile/route.ts',
  'auth/api/reset.ts',
  'auth/api/reset/confirm.ts',
  'auth/api/session/refresh.ts',
];

function isAuthFlow(relPath) {
  return AUTH_FLOW_PATHS.some((p) => relPath.endsWith(p.replace(/\//g, '/')));
}

/**
 * Actor-less endpoints are NOT counted as D2-gap. The mutation-guard registry
 * evaluates a guard against an AUTHENTICATED ACTOR — `runRouteMutationGuards`
 * types `auth.userId` as a non-nullable `string` and passes it to
 * `rbacService.getGrantedFeatures(userId, …)`, so a guard's `features` gate can
 * only be honoured for a real user. An endpoint with no session has no such
 * user: the guard set cannot be evaluated for it, and fabricating a userId
 * would make every feature-gated guard SKIP SILENTLY — "looks guarded while
 * doing nothing", the exact failure the D2-wide record warns about.
 *
 * `inbox_ops/api/webhook/inbound.ts` is the case that forced this class: it is
 * `metadata.POST = { requireAuth: false }` by design, it writes an InboxEmail
 * attributed to no actor (`auth: { sub: null, … }`), and it is guarded by its
 * OWN mechanisms — provider HMAC / Svix signature, a 5-minute replay window,
 * a 2 MB payload cap, global + per-tenant rate limits and de-duplication — none
 * of which the mutation-guard tool can see. It is set aside, not counted, and
 * the reason is MEASURED (read the route) rather than assumed. Re-check if the
 * endpoint ever gains a session.
 */
const ACTORLESS_PATHS = [
  'inbox_ops/api/webhook/inbound.ts',
  // `webhooks/api/inbound/[endpointId]/route.ts` POST — the second case, added
  // 2026-10-07 when the `webhooks` D2-gap was measured. Same shape as the
  // inbox_ops one: `metadata.POST = { requireAuth: false }` by design, it never
  // reads a session (`helpers.ts`' `resolveWebhookRequestScope`, which does the
  // `getAuthFromRequest` + 401, is NOT on this path), it writes a
  // `WebhookInboundReceiptEntity` whose `tenantId` may be `null`
  // (`verified.tenantId ?? null`), and it is guarded by its OWN mechanisms —
  // `adapter.verifyWebhook` (the provider signature IS the authentication), a
  // 60-per-minute rate limit, integration-enabled gating and a unique-violation
  // dedup on `(endpointId, messageId)`. A registry guard cannot be evaluated
  // with no actor, and fabricating one would make every feature-gated guard
  // SKIP SILENTLY. Set aside, not counted. Re-check if it ever gains a session.
  'webhooks/api/inbound/[endpointId]/route.ts',
  // `onboarding/api/post/onboarding.ts` POST — the third case, added 2026-10-07
  // when the `onboarding` D2-gap was measured. `metadata.POST =
  // { requireAuth: false }` by design (self-service signup, gated on
  // `SELF_SERVICE_ONBOARDING_ENABLED`), and it reads NO session: there is no
  // `getAuthFromRequest` anywhere on the path, and the `OnboardingRequest` row
  // it writes carries `tenantId: null` and is attributed to no actor. This is
  // the sharpest case for the class: the endpoint does not merely lack a user,
  // it CREATES the tenant, so there is no tenant to scope a guard against
  // either. It is guarded by its OWN mechanisms, all measured in the route and
  // its service: the feature flag, a 10-per-60s rate limit, a one-shot
  // email-verification token (24h) and a pending-request de-dup window. A
  // registry guard cannot be evaluated here, and fabricating an actor would
  // make every feature-gated guard SKIP SILENTLY. Set aside, not counted.
  // Re-check if it ever gains a session.
  'onboarding/api/post/onboarding.ts',
  // `communication_channels/api/post/webhook/[provider]/route.ts` POST — added
  // 2026-10-07 when `communication_channels` was closed out. `metadata.POST =
  // { requireAuth: false }` by design: the hub iterates every active channel for
  // the provider and asks each adapter to verify the inbound signature; the
  // FIRST verification that succeeds pins the request to that channel's tenant,
  // and the route never reads a session. Guarded by its OWN mechanisms —
  // `adapter.verifyWebhook` (the provider signature IS the authentication),
  // fail-closed 401 when no candidate verifies, and a 120-per-60s rate limit.
  // A registry guard cannot be evaluated with no actor; fabricating one would
  // make every feature-gated guard SKIP SILENTLY. Set aside, not counted.
  'communication_channels/api/post/webhook/[provider]/route.ts',
  // `communication_channels/api/post/webhooks/gmail/route.ts` POST — the Gmail
  // Pub/Sub push endpoint, same class, added in the same pass. `requireAuth:
  // false` by design; the auth is a Google-signed JWT in the Authorization
  // header, verified against Google's public certs
  // (`getGmailPubSubVerifier().verify`). It reads no session and looks channels
  // up ACROSS tenants by email address (each enqueued job carries its own tenant
  // scope). Own mechanisms: the JWT verifier, an audience + service-account-email
  // check, a 503 when unconfigured, and a 120-per-60s rate limit. Set aside.
  'communication_channels/api/post/webhooks/gmail/route.ts',
];

function isActorless(relPath) {
  return ACTORLESS_PATHS.some((p) => relPath.endsWith(p));
}

/**
 * Read-only "write verbs" are NOT counted as D2-gap. The tool classifies a route
 * by the HTTP verb it EXPORTS, and the D2-gap definition is "a WRITE there is
 * checked by nothing". A POST that performs no write is neither a gap nor a
 * place to wire a guard: a guard's `afterSuccess` would fire for a mutation that
 * never happened, and its `validate` would gate a read.
 *
 * `workflows/api/instances/validate-start/route.ts` is the case that forced this
 * class: its POST merely evaluates START pre-conditions. MEASURED, not assumed —
 * `lib/start-validator.ts` performs no entity-manager write, and
 * `validateWorkflowStart` calls `ruleEngine.executeRuleByRuleId(...)` with
 * `dryRun: true`, under which `logRuleExecution` (the only writer in that path)
 * is skipped, so no `RuleExecutionLog` row is created. It is set aside by name,
 * not wired. Re-check if the endpoint ever gains a write.
 *
 * Three more were measured and added 2026-10-07, when a re-measure of "closed"
 * modules found them still reading as GAP:
 *
 *  - `data_sync/api/validate.ts` POST — validates a sync connection. Calls
 *    `adapter.validateConnection` and `credentialsService.resolve`; `resolve`
 *    only READS (`getRaw`), and the credential writers (`persist`/`flush`) live
 *    in `save`/`saveField`, which this path never reaches. No write.
 *  - `dashboards/api/widgets/data/route.ts` POST and
 *    `dashboards/api/widgets/data/batch/route.ts` POST — fetch widget data
 *    (gated on `analytics.view`). They build a `widgetDataService` and call
 *    `fetchWidgetData`; the service's only mutation is `cache.set` (a memo of a
 *    read) and its `em` use is `getConnection().execute(<select>)`. No
 *    `persist`/`flush`/`remove` anywhere in the path. Wiring a guard here would
 *    gate a read and fire `afterSuccess` for a mutation that never happened.
 *
 * Two more were measured and added 2026-10-07 for the `configs` module, where
 * the label's 4 unguarded verbs split three ways (one already guarded inline,
 * one dev-only, and the two below):
 *
 *  - `configs/api/system-status/route.ts` POST — clears the CACHE for the
 *    current tenant (`runWithCacheTenant(tenantScope, () => cache.clear())`).
 *    It writes no business row: the only mutation is on the cache service. A
 *    registry guard describes writes to rows; there is no row here to describe,
 *    and wiring it would gate the cache teardown, not a business change.
 *  - `configs/api/module-telemetry/route.ts` DELETE — clears IN-PROCESS module
 *    telemetry, and is gated off outside development: `canClearModuleTelemetry()`
 *    returns `process.env.NODE_ENV === 'development'`, and the DELETE returns
 *    **403 BEFORE the clear**. Same shape as `communication_channels`'
 *    `test-seed` (env-gated off in production). No DB row, no production write.
 */
const READ_ONLY_PATHS = [
  'workflows/api/instances/validate-start/route.ts',
  'data_sync/api/validate.ts',
  'dashboards/api/widgets/data/route.ts',
  'dashboards/api/widgets/data/batch/route.ts',
  'configs/api/system-status/route.ts',
  'configs/api/module-telemetry/route.ts',
  // `communication_channels/api/post/oauth/[provider]/initiate/route.ts` POST —
  // added 2026-10-07 when `communication_channels` was closed out. Authenticated
  // (requireAuth + `communication_channels.connect_user_channel`) but it performs
  // NO business-row write: it reads the tenant's OAuth client credentials, builds
  // the provider's authorize URL and sets an httpOnly state COOKIE
  // (`createOAuthState`; verified `lib/oauth-state.ts` has no persist/flush). A
  // guard here would gate a read and fire its after-success for a mutation that
  // never happened. Set aside, not counted.
  'communication_channels/api/post/oauth/[provider]/initiate/route.ts',
];

function isReadOnly(relPath) {
  return READ_ONLY_PATHS.some((p) => relPath.endsWith(p));
}

/**
 * Guard-system set-asides are NOT counted as D2-gap. A write route can be
 * DELIBERATELY kept off the mutation-guard registry when the guard set cannot
 * be meaningfully evaluated for it, and the reason was measured and recorded at
 * the time each module was fixed. Re-reporting them as GAP over-counts the
 * headline and invites someone to "fix" a route that must stay as it is.
 *
 * Two sources, both from the `ai_assistant` D2-gap fix (`0af50c8`), where the
 * 24 unguarded verbs were split three ways and 9 were set aside BY NAME:
 *
 *  - session/flow (7): `ai/chat`, `ai/run-object`, `route`, `chat`,
 *    `session-key`, `mcp-key`, `tools/execute` — chat completion, transport and
 *    credential minting, governed by their own mechanisms (rate limits,
 *    short-TTL keys, per-tool feature checks). No resource row is written that
 *    a registry guard could describe.
 *  - pending-action gate (2): `ai/actions/[id]/confirm`, `ai/actions/[id]/cancel`
 *    — the AI mutation-approval gate, whose `runPendingActionRechecks()`
 *    re-verifies status, expiry, agent registration, features, mutation policy,
 *    tool whitelist, tenant scope, record version and schema drift. Wiring the
 *    registry here would put TWO gates on the same write, the second weaker.
 *
 * This class is keyed on `moduleId` + the file path, so it is exact: a NEW
 * unguarded verb in `ai_assistant` will still be reported as GAP.
 * Re-measure before trusting: if a listed path ever gains a registry guard, it
 * should drop out of this list.
 */
const GUARD_SYSTEM_SET_ASIDE = [
  'ai_assistant/api/ai/actions/[id]/cancel/route.ts',
  'ai_assistant/api/ai/actions/[id]/confirm/route.ts',
  'ai_assistant/api/ai/chat/route.ts',
  'ai_assistant/api/ai/run-object/route.ts',
  'ai_assistant/api/chat/route.ts',
  'ai_assistant/api/mcp-key/route.ts',
  'ai_assistant/api/route/route.ts',
  'ai_assistant/api/session-key/route.ts',
  'ai_assistant/api/tools/execute/route.ts',
];

function isGuardSystemSetAside(relPath) {
  return GUARD_SYSTEM_SET_ASIDE.some((p) => relPath.endsWith(p));
}

/**
 * The optimistic-lock floor is NOT the mutation-guard registry. A route whose
 * only "guard-shaped" call is `enforceCommandOptimisticLockWithGuards(...)` is
 * NOT mutation-guarded — that function runs the OSS optimistic-lock compare
 * plus the optional DI `commandOptimisticLockGuardService`, and never consults
 * `getAllMutationGuardInstances()`. `directory` recorded this trap when its
 * `organization-edges` verbs were mis-read; `entities/api/records.ts` hit it
 * again (a `grep -i guard` shows the file as "guarded"; it is not).
 *
 * A file is set aside here ONLY when EVERY write verb it exports is covered by
 * the floor. `entities/api/records.ts` is why that condition exists: it exports
 * POST, PUT and DELETE; PUT and DELETE call the floor, but POST calls NOTHING AT
 * ALL and is a genuine D2-gap. Because one verb is uncovered, the whole file
 * stays in the GAP column (3 verbs) rather than being set aside — the tool must
 * not let one protected verb launder an unprotected sibling in the same file.
 * So this list is currently EMPTY (0 verbs set aside). The class exists so that
 * a future file whose verbs are ALL on the floor is recorded honestly, with the
 * reason, instead of being read as a gap.
 */
const COMMAND_LOCK_FLOOR = [
  // No file currently qualifies: `entities/api/records.ts` is deliberately NOT
  // listed, because its POST verb reaches no guard and must keep reading as GAP.
];

function lockFloorCovers(relPath, moduleId, verbs) {
  return COMMAND_LOCK_FLOOR.some(
    (e) =>
      moduleId === e.module &&
      relPath.endsWith(e.path) &&
      verbs.length > 0 &&
      verbs.every((v) => e.verbs.includes(v)),
  );
}

/**
 * A bare `export { POST, GET }` (no `from`) is a re-export ONLY when the file
 * does not define that write verb locally AND the entry names the verb bare
 * (not `x as POST`). Returns true if at least one write verb is bare-exported,
 * un-aliased, and not locally defined in the same file.
 *
 * Why the local-definition guard matters: `export { POST }` in a file that
 * defines `export async function POST` re-exports its OWN handler, so the file
 * still owns the write and a missing guard must read as GAP. Only the shim case
 * (verb imported, never defined here) is a genuine re-export.
 *
 * Why the alias guard matters: `export { helpers as POST }` puts the token
 * `POST` in the list but does not re-export a handler *named* POST — it exposes
 * a differently-named binding under that name. The file may own an unguarded
 * write reached through it, so the conservative reading is GAP. Without this
 * check the token match laundered the whole file (a real defect a hostile
 * critic pass found in the `webhooks` tool fix).
 */
function bareReexportsAWriteVerb(code) {
  const localVerbs = new Set();
  for (const m of code.matchAll(RE_LOCAL_VERB_DEF)) localVerbs.add(m[1]);
  for (const m of code.matchAll(RE_REEXPORT_BARE)) {
    if (/\bfrom\b/.test(m[0])) continue; // inline form already handled
    // Split the brace list into entries. An entry counts as re-exporting a
    // write verb ONLY when it is the bare verb name — `export { POST, GET }`.
    // An ALIASED entry (`helpers as POST`, `POST as handlePost`) must NOT
    // count: the name in the list is not a same-named local handler, so the
    // file may still own an unguarded write under that name, and the
    // conservative reading is GAP. (This was a real defect: `x as POST` used
    // to launder a whole file because the token `POST` merely appeared in the
    // list. Found by a hostile critic pass over the `webhooks` fix.)
    for (const entry of m[1].split(',')) {
      const name = entry.trim().replace(/^type\s+/, '');
      if (!/^(POST|PUT|PATCH|DELETE)$/.test(name)) continue;
      if (!localVerbs.has(name)) return true;
    }
  }
  return false;
}

function detectGuards(code) {
  return {
    wrapper: RE_WRAPPER.test(code),
    registry: RE_REGISTRY.test(code) || (RE_REGISTRY_INLINE_STORE.test(code) && RE_REGISTRY_INLINE_RUN.test(code)),
    crud: RE_CRUD.test(code),
    local: Object.values(LOCAL_GUARD_HELPERS).some((re) => re.test(code)),
    deprecated: RE_DEPRECATED.test(code),
    reexport: RE_REEXPORT_INLINE.test(code) || bareReexportsAWriteVerb(code),
  };
}

function classify(file, moduleId) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);
  const isRoute = /[\\/]api[\\/]/.test(file);
  if (!isRoute) return null;
  const rel = path.relative(REPO, file).replace(/\\/g, '/');

  const exportsWrite = ANY_WRITE_EXPORT.test(code);
  if (!exportsWrite) return null;

  const g = detectGuards(code);

  let cls;
  if (g.wrapper) cls = 'GUARDED_WRAPPER';
  else if (g.registry) cls = 'GUARDED_REGISTRY';
  else if (g.crud) cls = 'GUARDED_CRUD';
  else if (g.local) cls = 'GUARDED_LOCAL';
  else if (g.reexport) cls = 'GUARDED_REEXPORT';
  else if (g.deprecated) cls = 'GUARDED_DEPRECATED';
  else cls = 'UNGUARDED';

  // Verbs this file exports. A guarded file's verbs are guarded by whatever
  // mechanism it uses; an UNGUARDED file's verbs are the D2-gap exposure.
  const verbs = writeVerbs(code);
  // An auth-flow endpoint is unguarded by the mutation-guard system on purpose.
  if (cls === 'UNGUARDED' && isAuthFlow(rel)) cls = 'AUTH_FLOW_SET_ASIDE';
  // An actor-less endpoint has no user to evaluate the guard set against.
  if (cls === 'UNGUARDED' && isActorless(rel)) cls = 'ACTORLESS_SET_ASIDE';
  // A POST that writes nothing is not a D2-gap (nothing to guard).
  if (cls === 'UNGUARDED' && isReadOnly(rel)) cls = 'READ_ONLY_SET_ASIDE';
  // A route kept off the registry by design (the ai_assistant set-asides).
  if (cls === 'UNGUARDED' && isGuardSystemSetAside(rel)) cls = 'GUARD_SYSTEM_SET_ASIDE';
  // A route protected by the command optimistic-lock floor, named per file+verb.
  if (cls === 'UNGUARDED' && lockFloorCovers(rel, moduleId, verbs)) cls = 'COMMAND_LOCK_FLOOR';

  return {
    file: rel,
    module: moduleId,
    cls,
    verbs,
    verbCount: verbs.length,
    g,
  };
}

// ── Write-performing GETs ──────────────────────────────────────────────────
// A GET can WRITE. The write-verb scan above is method-based (POST/PUT/PATCH/
// DELETE), so it is blind to it, and `classify` never sees such a file when the
// file ALSO exports a write verb. That is how `dashboards/api/layout` (GET
// lazily persists the default layout) and `messages/api/[id]` (GET auto-marks a
// message read) stayed invisible. This is a SEPARATE classifier so a mixed-
// method file contributes to BOTH the write-verb rows and the write-GET rows.
//
// Guard presence is read from the GET handler BODY ONLY — a file whose PUT is
// guarded must not launder its GET. `handlerBody` takes the text from the GET
// export to the next top-level `export` (or EOF): a heuristic, but the tool
// deliberately avoids a full parse, and the alternative (file-level guard
// detection) is provably wrong for `dashboards/api/layout`.
function handlerBody(code, verb) {
  const re = new RegExp(`(?:^|\\n)export\\s+(?:async\\s+)?(?:function|const|let|var)\\s+${verb}\\b`);
  const m = re.exec(code);
  if (!m) return null;
  const rest = code.slice(m.index + m[0].length);
  const next = rest.search(/\nexport\s/);
  return next === -1 ? rest : rest.slice(0, next);
}

// A GET that writes a READ SIDE-EFFECT is neither a write verb (by method) nor a
// user-intent mutation. Two shapes exist today:
//   - `dashboards/api/layout` GET lazily persists the user's OWN default layout
//     on first load (`em.persist` + `em.flush`).
//   - `messages/api/[id]` GET auto-marks a message read when `autoMarkRead`
//     (`commandBus.execute('messages.recipients.mark_read')`).
// Both write INTERNAL BOOKKEEPING as a side-effect of a read, with no user
// intent to mutate anything. Wiring a registry guard here would let a future
// business rule VETO LOADING THE DASHBOARD / READING A MESSAGE — a policy the
// owner has approved NOT to take (2026-10-07: "go with your recommendation").
// They are therefore SET ASIDE BY NAME (class `WRITE_GET_SET_ASIDE`), reported in
// the write-GET bucket, never counted as unguarded. To revisit: delete a path
// here and re-run — the route then reads `WRITE_GET_UNGUARDED` again.
const READ_SIDE_EFFECT_GET_PATHS = [
  'dashboards/api/layout/route.ts',
  'messages/api/[id]/route.ts',
];
function isReadSideEffectGet(rel) {
  return READ_SIDE_EFFECT_GET_PATHS.some((p) => rel.endsWith(p));
}

function classifyWriteGet(file, moduleId) {
  if (!/[\\/]api[\\/]/.test(file)) return null;
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  if (!RE_GET_EXPORT.test(code)) return null;
  const body = handlerBody(code, 'GET');
  if (body === null || !RE_WRITE_SIGNAL.test(body)) return null;
  const g = detectGuards(body);
  const guarded = g.wrapper || g.registry || g.crud || g.local || g.reexport || g.deprecated;
  const rel = path.relative(REPO, file).replace(/\\/g, '/');
  let cls = guarded ? 'WRITE_GET_GUARDED' : 'WRITE_GET_UNGUARDED';
  if (cls === 'WRITE_GET_UNGUARDED' && isReadSideEffectGet(rel)) cls = 'WRITE_GET_SET_ASIDE';
  return {
    file: rel,
    module: moduleId,
    cls,
    verbs: ['GET'],
    verbCount: 0, // not a "write verb" by HTTP method; counted in its own bucket
    g,
  };
}

const enabled = readEnabledModules();
const perModule = {};
const rows = [];
const writeGetRows = [];
const missing = [];
const outOfScope = [];
// Modules that are ENABLED but are NOT part of the product write surface, so
// they are resolved and reported but NOT counted in the write-verb total. The
// one case is `ratelimit_probe`: an app-local (`from: '@app'`) TEST module whose
// only route (`api/ping/route.ts` POST) returns `{ ok: true }` and writes
// nothing. Resolving it (rather than leaving it "no source dir found") is what
// makes "all 35 enabled modules" true; excluding it from the total keeps the
// figure comparable with the historical record, which never counted a test
// harness. If an app-local module ever ships a real write, remove it here.
const OUT_OF_SCOPE_MODULES = new Set(['ratelimit_probe']);

for (const id of enabled) {
  const dir = resolveModuleDir(id);
  if (!dir) { missing.push(id); continue; }
  if (OUT_OF_SCOPE_MODULES.has(id)) { outOfScope.push(id); continue; }
  const files = walk(dir);
  for (const f of files) {
    const r = classify(f, id);
    if (r) rows.push(r);
    const wg = classifyWriteGet(f, id);
    if (wg) writeGetRows.push(wg);
  }
  const mine = rows.filter((r) => r.module === id);
  const mineGet = writeGetRows.filter((r) => r.module === id);
  const sum = (f) => mine.filter(f).reduce((a, r) => a + r.verbCount, 0);
  perModule[id] = {
    writeFiles: mine.length,
    writeVerbs: sum(() => true),
    unguardedFiles: mine.filter((r) => r.cls === 'UNGUARDED').length,
    unguardedVerbs: sum((r) => r.cls === 'UNGUARDED'),
    wrapperVerbs: sum((r) => r.cls === 'GUARDED_WRAPPER'),
    registryVerbs: sum((r) => r.cls === 'GUARDED_REGISTRY'),
    crudVerbs: sum((r) => r.cls === 'GUARDED_CRUD'),
    localVerbs: sum((r) => r.cls === 'GUARDED_LOCAL'),
    reexportVerbs: sum((r) => r.cls === 'GUARDED_REEXPORT'),
    deprecatedVerbs: sum((r) => r.cls === 'GUARDED_DEPRECATED'),
    authFlowVerbs: sum((r) => r.cls === 'AUTH_FLOW_SET_ASIDE'),
    actorlessVerbs: sum((r) => r.cls === 'ACTORLESS_SET_ASIDE'),
    readOnlyVerbs: sum((r) => r.cls === 'READ_ONLY_SET_ASIDE'),
    guardSystemVerbs: sum((r) => r.cls === 'GUARD_SYSTEM_SET_ASIDE'),
    lockFloorVerbs: sum((r) => r.cls === 'COMMAND_LOCK_FLOOR'),
    writeGetFiles: mineGet.length,
    writeGetGuarded: mineGet.filter((r) => r.cls === 'WRITE_GET_GUARDED').length,
    writeGetSetAside: mineGet.filter((r) => r.cls === 'WRITE_GET_SET_ASIDE').length,
    writeGetUnguarded: mineGet.filter((r) => r.cls === 'WRITE_GET_UNGUARDED').length,
    fields: {
      wrapper: sum((r) => r.cls === 'GUARDED_WRAPPER'),
      registry: sum((r) => r.cls === 'GUARDED_REGISTRY'),
      crud: sum((r) => r.cls === 'GUARDED_CRUD'),
      local: sum((r) => r.cls === 'GUARDED_LOCAL'),
      reexport: sum((r) => r.cls === 'GUARDED_REEXPORT'),
      deprecated: sum((r) => r.cls === 'GUARDED_DEPRECATED'),
      unguarded: sum((r) => r.cls === 'UNGUARDED'),
      authFlow: sum((r) => r.cls === 'AUTH_FLOW_SET_ASIDE'),
      actorless: sum((r) => r.cls === 'ACTORLESS_SET_ASIDE'),
      readOnly: sum((r) => r.cls === 'READ_ONLY_SET_ASIDE'),
      guardSystem: sum((r) => r.cls === 'GUARD_SYSTEM_SET_ASIDE'),
      lockFloor: sum((r) => r.cls === 'COMMAND_LOCK_FLOOR'),
      writeGetGuarded: mineGet.filter((r) => r.cls === 'WRITE_GET_GUARDED').length,
      writeGetSetAside: mineGet.filter((r) => r.cls === 'WRITE_GET_SET_ASIDE').length,
      writeGetUnguarded: mineGet.filter((r) => r.cls === 'WRITE_GET_UNGUARDED').length,
    },
  };
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ enabled, perModule, rows, writeGetRows, missing, outOfScope }, null, 2));
  process.exit(0);
}

console.log(`ENABLED MODULES: ${enabled.length}`);
if (missing.length) console.log(`  (no source dir found: ${missing.join(', ')})`);
if (outOfScope.length) console.log(`(plus ${outOfScope.length} enabled module(s) resolved but NOT counted — test-only, not part of the product write surface: ${outOfScope.join(', ')})`);
console.log('');
console.log('Counted in VERBS (the unit the backlog records). W=wrapper R=registry C=crud L=local D=deprecated.');
console.log('');
console.log('module'.padEnd(24), 'wr'.padStart(3), 'verb'.padStart(4), 'W'.padStart(3), 'R'.padStart(3), 'C'.padStart(3), 'L'.padStart(3), 'D'.padStart(3), 'GAP'.padStart(4));
console.log('-'.repeat(56));
let totalGap = 0, totalWrite = 0;
for (const id of enabled) {
  const s = perModule[id];
  if (!s || s.writeVerbs === 0) continue;
  totalGap += s.unguardedVerbs; totalWrite += s.writeVerbs;
  console.log(
    id.padEnd(24),
    String(s.writeFiles).padStart(3),
    String(s.writeVerbs).padStart(4),
    String(s.wrapperVerbs).padStart(3),
    String(s.registryVerbs).padStart(3),
    String(s.crudVerbs).padStart(3),
    String(s.localVerbs).padStart(3),
    String(s.deprecatedVerbs).padStart(3),
    String(s.unguardedVerbs).padStart(4),
  );
}
console.log('-'.repeat(56));
console.log(`write verbs: ${totalWrite}, unguarded verbs (D2-gap): ${totalGap}`);
// A GET that WRITES: not a "write verb" by method, so it is not in the 256 — but
// it must never be invisible. Reported here; its unguarded count must be 0 too.
const totalWriteGet = writeGetRows.length;
const totalWriteGetUnguarded = writeGetRows.filter((r) => r.cls === 'WRITE_GET_UNGUARDED').length;
const totalWriteGetSetAside = writeGetRows.filter((r) => r.cls === 'WRITE_GET_SET_ASIDE').length;
console.log(`(plus ${totalWriteGet} write-performing GET handler(s) — a GET that writes rows, not counted as a write verb; ${totalWriteGetUnguarded} unguarded, ${totalWriteGetSetAside} set aside as read side-effects)`);
const totalSetAside = enabled.reduce((a, id) => a + (perModule[id]?.authFlowVerbs || 0), 0);
console.log(`(plus ${totalSetAside} auth-flow verbs set aside by design — login/logout/reset/session/profile/locale/feature-check)`);
const totalActorless = enabled.reduce((a, id) => a + (perModule[id]?.actorlessVerbs || 0), 0);
console.log(`(plus ${totalActorless} actor-less verbs set aside by design — public endpoints with no session, guarded by their own signature/rate-limit mechanisms)`);
const totalReadOnly = enabled.reduce((a, id) => a + (perModule[id]?.readOnlyVerbs || 0), 0);
console.log(`(plus ${totalReadOnly} read-only "write verb" set aside by design — a POST that performs no write, so there is nothing to guard)`);
const totalGuardSystem = enabled.reduce((a, id) => a + (perModule[id]?.guardSystemVerbs || 0), 0);
console.log(`(plus ${totalGuardSystem} guard-system verbs set aside by name — the ai_assistant session/flow + pending-action gate, governed by their own mechanisms)`);
const totalLockFloor = enabled.reduce((a, id) => a + (perModule[id]?.lockFloorVerbs || 0), 0);
console.log(`(plus ${totalLockFloor} command-lock-floor verbs set aside by name — protected by enforceCommandOptimisticLockWithGuards, NOT the registry)`);
console.log('');
console.log('UNGUARDED FILES (with the verbs each exposes):');
for (const r of rows.filter((r) => r.cls === 'UNGUARDED')) {
  console.log('  ' + r.module.padEnd(22) + r.verbs.join(',').padEnd(20) + r.file);
}
console.log('');
console.log('WRITE-PERFORMING GET HANDLERS (a GET that writes rows — see RE_WRITE_SIGNAL):');
for (const r of writeGetRows) {
  const tag = r.cls === 'WRITE_GET_UNGUARDED' ? 'UNGUARDED' : r.cls === 'WRITE_GET_SET_ASIDE' ? 'set-aside' : 'guarded  ';
  console.log('  ' + tag + ' ' + r.module.padEnd(22) + r.file);
}
