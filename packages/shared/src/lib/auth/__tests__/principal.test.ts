import {
  apiKeySubject,
  derivePrincipal,
  effectiveUserId,
  isHumanPrincipal,
  isMachinePrincipal,
  parseSubject,
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
})
