import {
  aiWorkerSubject,
  apiKeySubject,
  derivePrincipal,
  effectiveUserId,
  isHumanPrincipal,
  isMachinePrincipal,
  normalizePrincipalSubject,
  parseSubject,
  principalIdOf,
  systemSubject,
} from '../principal'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const KEY_ID = '22222222-2222-4222-8222-222222222222'
const OWNER_ID = '33333333-3333-4333-8333-333333333333'

describe('subject encoding', () => {
  it('round-trips an api key subject', () => {
    expect(parseSubject(apiKeySubject(KEY_ID))).toEqual({ kind: 'service', id: KEY_ID })
  })

  it('treats a bare subject as a human', () => {
    expect(parseSubject(USER_ID)).toEqual({ kind: 'human', id: USER_ID })
  })
})

describe('derivePrincipal', () => {
  it('returns null for an absent context', () => {
    expect(derivePrincipal(null)).toBeNull()
    expect(derivePrincipal(undefined)).toBeNull()
  })

  it('returns null when the subject is blank', () => {
    expect(derivePrincipal({ sub: '   ' })).toBeNull()
  })

  it('derives a human principal from a bare subject', () => {
    expect(
      derivePrincipal({ sub: USER_ID, email: 'a@b.test', tenantId: 't1', orgId: 'o1' }),
    ).toEqual({
      id: USER_ID,
      kind: 'human',
      onBehalfOfUserId: null,
      displayName: 'a@b.test',
      tenantId: 't1',
      organizationId: 'o1',
    })
  })

  it('derives a service principal from the prefixed subject alone', () => {
    // A context read back from a cache carries the prefix but no `isApiKey`.
    const principal = derivePrincipal({ sub: apiKeySubject(KEY_ID), keyName: 'CI key' })
    expect(principal).toMatchObject({ id: KEY_ID, kind: 'service', displayName: 'CI key' })
  })

  it('derives a service principal from isApiKey alone', () => {
    // Belt-and-braces: the two encodings of the same fact must agree.
    const principal = derivePrincipal({ sub: KEY_ID, isApiKey: true, keyId: KEY_ID })
    expect(principal).toMatchObject({ id: KEY_ID, kind: 'service' })
  })

  it('carries the owning user for a key issued on someone behalf', () => {
    const principal = derivePrincipal({
      sub: apiKeySubject(KEY_ID),
      isApiKey: true,
      keyId: KEY_ID,
      userId: OWNER_ID,
    })
    expect(principal?.onBehalfOfUserId).toBe(OWNER_ID)
  })

  it('leaves onBehalfOfUserId null for a standalone key', () => {
    const principal = derivePrincipal({ sub: apiKeySubject(KEY_ID), isApiKey: true, keyId: KEY_ID })
    expect(principal?.onBehalfOfUserId).toBeNull()
  })
})

describe('effectiveUserId', () => {
  it('is the principal id for a human', () => {
    const auth = { principal: derivePrincipal({ sub: USER_ID }) }
    expect(effectiveUserId(auth)).toBe(USER_ID)
  })

  it('is the owning user for a key acting on their behalf', () => {
    const auth = {
      principal: derivePrincipal({ sub: apiKeySubject(KEY_ID), isApiKey: true, keyId: KEY_ID, userId: OWNER_ID }),
    }
    expect(effectiveUserId(auth)).toBe(OWNER_ID)
  })

  it('is null for a key that acts for nobody', () => {
    // Must not fall back to the key id: personal rows keyed by a key id can
    // never be read back by the person, and would leak across key rotations.
    const auth = {
      principal: derivePrincipal({ sub: apiKeySubject(KEY_ID), isApiKey: true, keyId: KEY_ID }),
    }
    expect(effectiveUserId(auth)).toBeNull()
  })

  it('is null when there is no principal', () => {
    expect(effectiveUserId(null)).toBeNull()
    expect(effectiveUserId({})).toBeNull()
  })

  it('derives the principal when the context never had one attached', () => {
    // Cached entries, trusted envelopes and test fixtures can reach a call site
    // without passing through the boundary that attaches `principal`. Reading
    // the field directly would return null and silently detach a real user from
    // their own preferences.
    expect(effectiveUserId({ sub: USER_ID })).toBe(USER_ID)
    expect(effectiveUserId({ sub: apiKeySubject(KEY_ID), isApiKey: true, keyId: KEY_ID, userId: OWNER_ID }))
      .toBe(OWNER_ID)
  })

  it('prefers an attached principal over deriving one', () => {
    const attached = { ...derivePrincipal({ sub: USER_ID })!, id: 'attached-wins' }
    expect(effectiveUserId({ sub: USER_ID, principal: attached })).toBe('attached-wins')
  })
})

describe('kind predicates', () => {
  const human = { principal: derivePrincipal({ sub: USER_ID }) }
  const service = { principal: derivePrincipal({ sub: apiKeySubject(KEY_ID), isApiKey: true, keyId: KEY_ID }) }

  it('separates people from machines', () => {
    expect(isHumanPrincipal(human)).toBe(true)
    expect(isMachinePrincipal(human)).toBe(false)
    expect(isHumanPrincipal(service)).toBe(false)
    expect(isMachinePrincipal(service)).toBe(true)
  })

  it('treats every non-human kind as a machine', () => {
    for (const kind of ['service', 'ai_worker', 'system'] as const) {
      expect(isMachinePrincipal({ principal: { ...service.principal!, kind } })).toBe(true)
    }
  })

  it('reports neither for an absent principal', () => {
    expect(isHumanPrincipal(null)).toBe(false)
    expect(isMachinePrincipal(null)).toBe(false)
  })

  it('derives when the context carries no principal', () => {
    expect(isHumanPrincipal({ sub: USER_ID })).toBe(true)
    expect(isMachinePrincipal({ sub: apiKeySubject(KEY_ID) })).toBe(true)
  })
})

/**
 * `CC-136` — a platform act is a platform act.
 *
 * The kind `system` was declared from the start and **nothing could produce it**: `parseSubject` knew
 * `ai_worker:` and `api_key:` and called everything else `human`, and `human` is the one kind the
 * machine floor does not bind. So the platform acting on its own behalf was judged as a person, and
 * the seven capabilities no configuration may grant a machine were grantable to it.
 *
 * **Two halves had to be fixed, and this block pins both.** The parser is one; `derivePrincipal` is
 * the other, because it does not pass the parser's kind through — it re-derives it from two booleans
 * whose fall-through is `human`. A fix that taught only the parser would have left every consumer of
 * `auth.principal` still calling a platform act a person.
 */
describe('the system subject (CC-136)', () => {
  const ORIGIN = 'example_customers_sync:outbound'

  it('builds, parses and reduces to a bare id', () => {
    expect(systemSubject(ORIGIN)).toBe(`system:${ORIGIN}`)
    expect(parseSubject(systemSubject(ORIGIN))).toEqual({ kind: 'system', id: ORIGIN })
    // The bare id is the platform's storage convention — the id is the id, and the kind lives in its
    // own column. Before this change `principalIdOf` returned the subject with its prefix attached.
    expect(principalIdOf(systemSubject(ORIGIN))).toBe(ORIGIN)
  })

  it('derives a system principal — and not by falling through to human', () => {
    const principal = derivePrincipal({ sub: systemSubject(ORIGIN), tenantId: 't1', orgId: 'o1' })
    expect(principal).toEqual({
      id: ORIGIN,
      kind: 'system',
      // The platform acts for nobody. A `system:` producer that also sets `userId` is setting the
      // *user* field to a non-user string; inheriting it here would put a machine's origin into an id
      // column expecting a person.
      onBehalfOfUserId: null,
      displayName: null,
      tenantId: 't1',
      organizationId: 'o1',
    })
  })

  it('does not take the credential branch — a system principal has no key row', () => {
    // `isApiKeyBackedKind('system')` is false, so the key id must not be preferred over the subject's
    // own id. Looking one up in `api_keys` finds nothing.
    const principal = derivePrincipal({ sub: systemSubject(ORIGIN), keyId: KEY_ID, keyName: 'a key' })
    expect(principal!.id).toBe(ORIGIN)
    expect(principal!.displayName).toBeNull()
  })

  it('is a machine to the predicates, and has no personal state', () => {
    const context = { sub: systemSubject(ORIGIN) }
    expect(isMachinePrincipal(context)).toBe(true)
    expect(isHumanPrincipal(context)).toBe(false)
    // No person behind it, so no preferences, no sidebar, no attribution to a human.
    expect(effectiveUserId(context)).toBeNull()
  })

  it('is stored bare by the write path, under the same three rules as every other prefix', () => {
    // An agreeing prefix is stripped — the admin followed the documentation and the row stays in the
    // convention.
    expect(normalizePrincipalSubject(systemSubject(ORIGIN), 'system')).toBe(ORIGIN)
    // A bare subject with a machine kind is accepted: the bare id is the convention.
    expect(normalizePrincipalSubject(ORIGIN, 'system')).toBe(ORIGIN)
    // A prefix that DISAGREES with the declared kind throws. A permission taken from the platform and
    // landing on a person is worse than the defect being fixed, so this is never a guess.
    expect(() => normalizePrincipalSubject(systemSubject(ORIGIN), 'human')).toThrow(/names a system/)
    expect(() => normalizePrincipalSubject(systemSubject(ORIGIN), 'service')).toThrow(/names a system/)
  })

  it('refuses a prefix with nothing behind it', () => {
    // A control asked "may this act" by an empty id must not get an answer derived from ''.
    expect(principalIdOf('system:')).toBeNull()
    expect(() => normalizePrincipalSubject('system:', 'system')).toThrow(/must name somebody/)
  })

  it('leaves the other three kinds exactly where they were', () => {
    // The regression that would be worst: a human must stay unbound by the machine floor, and the two
    // credential prefixes must keep their ids.
    expect(parseSubject(USER_ID)).toEqual({ kind: 'human', id: USER_ID })
    expect(parseSubject(apiKeySubject(KEY_ID))).toEqual({ kind: 'service', id: KEY_ID })
    expect(parseSubject(aiWorkerSubject(KEY_ID))).toEqual({ kind: 'ai_worker', id: KEY_ID })
    expect(principalIdOf(USER_ID)).toBe(USER_ID)
  })
})
