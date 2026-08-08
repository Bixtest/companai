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
 * `ai_worker` is declared but not yet produced — no authentication path creates
 * one today. It exists so consumers switch over a complete set now, rather than
 * being rewritten when AI workers become principals in their own right.
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

/** Builds the legacy `sub` for an API key principal. */
export function apiKeySubject(apiKeyId: string): string {
  return `${API_KEY_SUBJECT_PREFIX}${apiKeyId}`
}

/**
 * Splits a legacy `sub` into a kind and a bare id.
 *
 * Accepts a plain uuid (a human) or the prefixed API-key form. This is the only
 * reader of the encoding; call sites should prefer `auth.principal`.
 */
export function parseSubject(subject: string): { kind: PrincipalKind; id: string } {
  if (subject.startsWith(API_KEY_SUBJECT_PREFIX)) {
    return { kind: 'service', id: subject.slice(API_KEY_SUBJECT_PREFIX.length) }
  }
  return { kind: 'human', id: subject }
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
  const id = isService ? auth.keyId ?? parsed.id : parsed.id

  return {
    id,
    kind: isService ? 'service' : 'human',
    onBehalfOfUserId: isService ? auth.userId ?? null : null,
    displayName: (isService ? auth.keyName : auth.email) ?? null,
    tenantId: auth.tenantId ?? null,
    organizationId: auth.orgId ?? null,
  }
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
export function effectiveUserId(auth: { principal?: Principal | null } | null | undefined): string | null {
  const principal = auth?.principal
  if (!principal) return null
  if (principal.kind === 'human') return principal.id
  return principal.onBehalfOfUserId
}

/** True when the actor is a person authenticating as themselves. */
export function isHumanPrincipal(auth: { principal?: Principal | null } | null | undefined): boolean {
  return auth?.principal?.kind === 'human'
}

/**
 * True when the actor is not a person — an API key today, an AI worker later.
 *
 * Prefer a `switch` on `principal.kind` where the behaviour genuinely differs
 * per kind; this helper is for the cases that only distinguish "person" from
 * "not a person", such as skipping interactive session checks.
 */
export function isMachinePrincipal(auth: { principal?: Principal | null } | null | undefined): boolean {
  const kind = auth?.principal?.kind
  return kind === 'service' || kind === 'ai_worker' || kind === 'system'
}
