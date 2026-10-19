/**
 * Principals — who is acting, as data rather than as a parsed string.
 *
 * The platform already supports a non-human actor: an API key authenticates with
 * `sub: 'api_key:<uuid>'` and carries its own roles and scope. What it does not
 * have is a first-class *kind*. The kind is encoded in a string prefix and
 * re-parsed at every site that cares, so `startsWith('api_key:')` and
 * `auth.isApiKey ? auth.userId : auth.sub` are spread across the codebase.
 *
 * That is the shape our invariant I2 forbids: asymmetry between actor types
 * expressed as branches in code instead of as fields in data. It does not scale
 * to the actors we are adding — an AI worker is a third kind, and every one of
 * those branch sites would need a third arm.
 *
 * This module is the single place that knows how a principal is encoded. Every
 * consumer reads `auth.principal`; nothing else parses `sub`.
 */

/**
 * The kinds of actor the platform can represent.
 *
 * **All four are produced, and the last one to get there took two edits.** `ai_worker` gained its
 * producer first: a credential marked as belonging to an AI worker issues an `ai_worker:` subject, so
 * the resolver, the journal and the ledger all see a machine where they previously saw a service.
 * `system` was declared from the start and had **nothing that could produce it** until `CC-136`: the
 * parser called every unrecognised subject `human`, and `human` is the one kind the machine floor does
 * not bind — so the platform acting on its own behalf was judged as a person. See
 * `SYSTEM_SUBJECT_PREFIX`.
 */
export type PrincipalKind = 'human' | 'ai_worker' | 'service' | 'system'

export type Principal = {
  /** Identifier of the actor itself: a user id, an API key id, a worker id. */
  id: string
  kind: PrincipalKind
  /**
   * The human this principal acts for, when there is one.
   *
   * An API key created by a person, or issued as that person's session key,
   * acts on their behalf: attribution, preferences and personal settings follow
   * this id, not the key's. `null` when the actor answers only to itself.
   */
  onBehalfOfUserId: string | null
  displayName: string | null
  tenantId: string | null
  organizationId: string | null
}

/**
 * Legacy subject encoding.
 *
 * Kept in exactly one place so it can be deleted in one edit once no persisted
 * token or cached ACL still carries the prefixed form. Nothing outside this
 * module should build or parse this string.
 */
const API_KEY_SUBJECT_PREFIX = 'api_key:'

/**
 * The prefix that makes an actor an **AI worker** rather than a service.
 *
 * `ai_worker` was a principal kind with **nothing that could produce one**: no
 * subject could encode it, so no ceiling, delegation, trust grant or denial
 * could ever target a machine, and the effect-class matrix — which exists to
 * bound machines — never engaged. The kind was a type with no inhabitants.
 *
 * An AI worker authenticates with a credential, and the credential we already
 * have is an API key: revocable, org-scoped, rate-limited, role-bearing. A key
 * marked as belonging to an AI worker issues this subject instead, so the whole
 * platform sees `ai_worker` where it previously saw `service` — the journal, the
 * ledger, the resolver and the approvals queue, all without a second auth path.
 */
const AI_WORKER_SUBJECT_PREFIX = 'ai_worker:'

/**
 * The prefix that makes an actor the **platform acting on its own behalf** rather than a person.
 *
 * `CC-136`. `system` was a principal kind with **no producer** — `parseSubject` recognised
 * `ai_worker:` and `api_key:` and called everything else `human`. That was not cosmetic: `decideFor`
 * takes a *subject string* and parses it, and `human` is the one kind the machine floor does not bind
 * (`machineFloor.ts`), so a platform act arrived as the widest kind and the seven capabilities no
 * configuration may grant a machine were grantable to it. The subject form was already in the wild —
 * `packages/create-app/template/src/modules/example_customers_sync/lib/` builds `system:…` today — so
 * the shape existed with nothing parsing it.
 *
 * **The owner's ruling (2026-10-19) was to teach the parser, accepting that `principalIdOf` then
 * returns the bare id for these subjects.** That is the platform's storage convention anyway: the id
 * is the id and the kind lives in its own column (`subject_kind`, `actor_kind`, …). Measured, the
 * change has no data to migrate — `action_logs.actor_user_id` is a **`uuid`** column, so a `system:…`
 * subject was never storable there, and nothing writes one into a `text` principal column either.
 */
const SYSTEM_SUBJECT_PREFIX = 'system:'

/** Builds the legacy `sub` for an API key principal. */
export function apiKeySubject(apiKeyId: string): string {
  return `${API_KEY_SUBJECT_PREFIX}${apiKeyId}`
}

/** Builds the `sub` for a credential that acts as an AI worker. */
export function aiWorkerSubject(apiKeyId: string): string {
  return `${AI_WORKER_SUBJECT_PREFIX}${apiKeyId}`
}

/**
 * Builds the `sub` for **the platform acting on its own behalf** — a scheduled job, a CLI, an
 * outbound sync — as opposed to a person or a credential.
 *
 * `CC-136`. The module's own docblock says *"Nothing outside this module should build or parse this
 * string"*, and two files did: `example_customers_sync`'s `sync.ts` and `runtime.ts` both hand-rolled
 * `` `system:${origin}` ``. A hand-rolled prefix is a typo waiting to become a silently-human act, so
 * the builder exists and those two call it.
 */
export function systemSubject(origin: string): string {
  return `${SYSTEM_SUBJECT_PREFIX}${origin}`
}

/**
 * Splits a legacy `sub` into a kind and a bare id.
 *
 * Accepts a plain uuid (a human) or one of the three prefixed forms. This is the only reader of the
 * encoding; call sites should prefer `auth.principal`.
 *
 * **`system:` is tested first, and the order is load-bearing.** The prefixes share no leading
 * character, so order is not a correctness issue today — but the shortest one is the one a later edit
 * is most likely to append after a longer check, and a branch that can never fire looks exactly like
 * a branch that works. First is where it cannot be shadowed by accident.
 */
export function parseSubject(subject: string): { kind: PrincipalKind; id: string } {
  if (subject.startsWith(SYSTEM_SUBJECT_PREFIX)) {
    return { kind: 'system', id: subject.slice(SYSTEM_SUBJECT_PREFIX.length) }
  }
  if (subject.startsWith(AI_WORKER_SUBJECT_PREFIX)) {
    return { kind: 'ai_worker', id: subject.slice(AI_WORKER_SUBJECT_PREFIX.length) }
  }
  if (subject.startsWith(API_KEY_SUBJECT_PREFIX)) {
    return { kind: 'service', id: subject.slice(API_KEY_SUBJECT_PREFIX.length) }
  }
  return { kind: 'human', id: subject }
}

/**
 * The bare id of a subject, with any encoding prefix removed.
 *
 * `null` when the subject is empty or carries nothing after its prefix — the
 * caller's business, but a control that is asked "may this act" by an empty
 * subject must not silently get an answer derived from `''`.
 */
export function principalIdOf(subject: string): string | null {
  const trimmed = typeof subject === 'string' ? subject.trim() : ''
  if (!trimmed) return null
  const { id } = parseSubject(trimmed)
  return id.trim().length > 0 ? id : null
}

/**
 * A principal subject the way the authority tables store it: **the bare id**.
 *
 * This is the write path's other half. The platform's convention — stated once
 * on `audit_logs`.`actor_user_id` and followed by every table in the authority
 * family — is that the **identifier is the bare id and the kind lives in its own
 * column**, never inside the id: `subject_kind`, `grantor_kind`/`grantee_kind`,
 * `principal_kind`, `actor_kind`. A text column exists precisely so the id can
 * be the id of a credential while the kind stays first-class.
 *
 * It exists because the write paths accepted a free-form string while the
 * enforcement paths passed the bare id, and nothing checked the two agreed. The
 * result (`CC-124`) was a denial naming a machine, written in the encoding the
 * entity's own docblock advertised, that was audited, listed and **never
 * applied**. `AI_WORKER_SUBJECT_PREFIX` was added so no machine would ever be
 * undeniable; the denial lookup ignored it and a machine was undeniable.
 *
 * **Three rules, and the middle one is the whole point:**
 *
 *  - a subject carrying the prefix that **agrees** with the declared kind is
 *    accepted and returned **bare** — the admin followed the documentation and
 *    the storage stays the convention;
 *  - a subject whose prefix **disagrees** with the declared kind **throws**.
 *    A permission taken away from a machine and landing on a person is a worse
 *    bug than the one being fixed, so a mismatch is an operator's mistake to be
 *    answered with a message, never a guess about which half was meant;
 *  - a bare subject with a machine kind is **accepted** — the bare id is the
 *    convention, and the kind is what the sibling column is for.
 *
 * `human` takes the bare id and **no prefix is defined for it**. `system` used to be described here as
 * sharing that property; `CC-136` gave it one, because a platform act with no prefix was parsed as a
 * person. So a `system:` subject is now stripped on write like the other two, and a **bare** subject
 * with kind `system` is still accepted — the bare id is the convention, and the kind is what the
 * sibling column is for.
 */
export function normalizePrincipalSubject(
  subject: string,
  kind: PrincipalKind | string | null | undefined,
): string {
  const trimmed = typeof subject === 'string' ? subject.trim() : ''
  if (!trimmed) throw new Error('a principal subject must name somebody')

  // Which prefix, if any, the subject carries. `null` means the subject is bare —
  // the convention, and the form a machine's row has taken since the tables were
  // created — so a bare subject is compatible with **any** declared kind.
  const prefixKind = trimmed.startsWith(SYSTEM_SUBJECT_PREFIX)
    ? 'system'
    : trimmed.startsWith(AI_WORKER_SUBJECT_PREFIX)
      ? 'ai_worker'
      : trimmed.startsWith(API_KEY_SUBJECT_PREFIX)
        ? 'service'
        : null

  const id = principalIdOf(trimmed)
  if (!id) throw new Error('a principal subject must name somebody')

  const declared = typeof kind === 'string' ? kind.trim() : ''
  // A prefixed subject tells us what the caller meant in a second place. When
  // the two disagree the request is wrong, and quietly trusting one half would
  // silently retarget the row onto a different actor.
  if (prefixKind && declared && prefixKind !== declared) {
    throw new Error(
      `subject "${trimmed}" names a ${prefixKind} but the request says ${declared} — ` +
      'they must be the same actor, so one of the two is wrong',
    )
  }
  return id
}

/** The minimum an auth context must expose for a principal to be derived from it. */
type PrincipalSource = {
  sub?: string | null
  isApiKey?: boolean
  userId?: string | null
  keyId?: string | null
  keyName?: string | null
  email?: string | null
  tenantId?: string | null
  orgId?: string | null
}

/**
 * Derives a principal from an auth context.
 *
 * Used to populate `AuthContext.principal` at the authentication boundary, and
 * as a fallback for contexts constructed before that boundary existed (cached
 * tokens, trusted envelopes, tests) so no call site has to cope with a missing
 * principal.
 */
export function derivePrincipal(auth: PrincipalSource | null | undefined): Principal | null {
  if (!auth) return null

  const subject = typeof auth.sub === 'string' ? auth.sub.trim() : ''
  if (!subject) return null

  const parsed = parseSubject(subject)
  // `isApiKey` and the prefix are two encodings of the same fact. Honour either,
  // so a context built by an older path still resolves correctly.
  const isService = parsed.kind === 'service' || auth.isApiKey === true
  const isAiWorker = parsed.kind === 'ai_worker'
  // **`system` is a kind of its own and must be named here explicitly.** This function does not pass
  // `parseSubject`'s kind through — it re-derives it from two booleans, and the final ternary's
  // fall-through is `human`. So teaching the parser the prefix, and stopping there, would have left
  // every consumer of `auth.principal` still calling a platform act a person. `CC-136` measured that
  // and fixed both halves; the parser and the derivation are two producers of one fact.
  const isSystem = parsed.kind === 'system'
  // Both are credentials rather than people, so both resolve their identity from
  // the key and carry the user they were issued on behalf of. Only the *kind*
  // differs — and that difference is the one the whole governance layer turns on.
  //
  // `system` is a machine too, but it is **not credential-backed** (`isApiKeyBackedKind` returns
  // false for it), so it must not take the key branch: there is no key row to look up, and the bare
  // subject id is the identity.
  const isMachine = isService || isAiWorker
  const id = isMachine ? auth.keyId ?? parsed.id : parsed.id

  return {
    id,
    kind: isAiWorker ? 'ai_worker' : isService ? 'service' : isSystem ? 'system' : 'human',
    // The platform acts for nobody. `auth.userId` is deliberately not consulted for `system`: a
    // `system:` producer that also sets `userId` is setting the *user* field to a non-user string, and
    // inheriting that here would put a machine's origin into an id column expecting a person.
    onBehalfOfUserId: isMachine ? auth.userId ?? null : null,
    displayName: (isMachine ? auth.keyName : auth.email) ?? null,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
  }
}

/** An auth context, whether or not it already carries a resolved principal. */
type PrincipalCarrier = (PrincipalSource & { principal?: Principal | null }) | null | undefined

/**
 * Resolves the acting principal, deriving it when the context predates the
 * field.
 *
 * Not every context passes through the authentication boundary that attaches
 * `principal`: cached entries, trusted envelopes handed to the in-process AI
 * runner, and test fixtures can all arrive without one. Reading `auth.principal`
 * directly would silently treat those as "no principal" and, for
 * `effectiveUserId`, hand back `null` where a real user id exists. Every helper
 * below goes through this instead.
 */
function resolvePrincipal(auth: PrincipalCarrier): Principal | null {
  if (!auth) return null
  return auth.principal ?? derivePrincipal(auth)
}

/**
 * The user whose personal state this request should read and write — sidebar
 * layout, preferences, assignment, attribution.
 *
 * Replaces the `auth.isApiKey ? auth.userId : auth.sub` idiom that appeared
 * identically at nine call sites. A service principal acting for nobody has no
 * personal state, and returns `null` rather than falling back to the key's own
 * id — using a key id where a user id is expected silently writes rows nobody
 * can read back.
 */
export function effectiveUserId(auth: PrincipalCarrier): string | null {
  const principal = resolvePrincipal(auth)
  if (!principal) return null
  if (principal.kind === 'human') return principal.id
  return principal.onBehalfOfUserId
}

/** True when the actor is a person authenticating as themselves. */
export function isHumanPrincipal(auth: PrincipalCarrier): boolean {
  return resolvePrincipal(auth)?.kind === 'human'
}

/**
 * True when the actor is not a person — an API key today, an AI worker later.
 *
 * Prefer a `switch` on `principal.kind` where the behaviour genuinely differs
 * per kind; this helper is for the cases that only distinguish "person" from
 * "not a person", such as skipping interactive session checks.
 */
/**
 * Whether this kind of actor is backed by an **API key row**.
 *
 * Narrower than `isMachinePrincipal`, and the difference matters: `system` is a
 * machine but has no credential behind it — the platform acting on its own
 * behalf, from a CLI or a scheduled job. Looking one up in `api_keys` finds
 * nothing.
 *
 * This exists because adding `ai_worker` made every `kind === 'service'` check
 * silently incomplete. Those checks meant *"resolve this actor's permissions
 * from its key"* and now had a second kind to cover; the one in `RbacService`
 * fell through to the human branch and put `ai_worker:<uuid>` into a uuid
 * column, which is a 500 rather than a wrong answer. A named predicate makes
 * the next kind a compile-time question instead of a runtime surprise.
 */
export function isApiKeyBackedKind(kind: PrincipalKind | null | undefined): boolean {
  return kind === 'service' || kind === 'ai_worker'
}

export function isMachinePrincipal(auth: PrincipalCarrier): boolean {
  const kind = resolvePrincipal(auth)?.kind
  return kind === 'service' || kind === 'ai_worker' || kind === 'system'
}
