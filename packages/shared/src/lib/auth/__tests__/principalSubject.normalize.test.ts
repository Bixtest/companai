/**
 * The write path's half of the principal encoding — `CC-124`.
 *
 * The defect: the authority tables store a principal as a **bare id with the
 * kind in a sibling column** (`subject_principal_id` / `subject_kind`,
 * `grantee_principal_id` / `grantee_kind`, and the same shape in
 * `audit_logs`.`actor_user_id`, which states the convention on its own column).
 * The write paths did not keep it. `POST api/authority/denials` accepted any
 * string, the entity docblock told the reader that an API key acting *is*
 * `api_key:<id>`, and the enforcement path — `withheldFromThisPerson` — passed
 * the **bare** id to the lookup, which is what it has always passed.
 *
 * So a denial naming a machine, written the way the schema documented, was
 * written, audited, listed, and **never applied**. `AI_WORKER_SUBJECT_PREFIX`
 * existed so no machine could be denied by accident; this path made every
 * machine undenyable on purpose of nobody.
 *
 * These tests pin the narrowing: one function, at the boundary, that both halves
 * of every pair must agree with. If it is deleted or made permissive, the rows
 * this guard produces stop being the rows the enforcement path looks for — and
 * the failure is silent, which is exactly why it needs a test rather than a
 * review.
 */
import {
  normalizePrincipalSubject,
  principalIdOf,
  aiWorkerSubject,
  apiKeySubject,
} from '../principal'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const KEY_ID = '22222222-2222-4222-8222-222222222222'

describe('a subject arriving with its prefix', () => {
  it('is stored bare when the prefix and the declared kind agree', () => {
    // The documented encoding, arriving exactly as documented. It is accepted —
    // the administrator was reading the docblock — and narrowed on the way in.
    expect(normalizePrincipalSubject(aiWorkerSubject(KEY_ID), 'ai_worker')).toBe(KEY_ID)
    expect(normalizePrincipalSubject(apiKeySubject(KEY_ID), 'service')).toBe(KEY_ID)
  })

  it('is refused when the two halves name different actors', () => {
    // Not normalised, not resolved by picking a half. A permission taken away
    // from a machine and landing on a person is a worse bug than the one being
    // fixed, so this is an error the operator sees.
    expect(() => normalizePrincipalSubject(aiWorkerSubject(KEY_ID), 'service')).toThrow(/ai_worker/)
    expect(() => normalizePrincipalSubject(apiKeySubject(KEY_ID), 'ai_worker')).toThrow(/api_key/)
    expect(() => normalizePrincipalSubject(apiKeySubject(KEY_ID), 'human')).toThrow()
  })
})

describe('a bare subject', () => {
  it('is the convention, and works for a person', () => {
    expect(normalizePrincipalSubject(USER_ID, 'human')).toBe(USER_ID)
  })

  it('is accepted for a machine too — the kind is what the sibling column is for', () => {
    // This is the shape the tables have carried since they were created. A
    // normaliser that rejected a bare machine subject would break every row
    // written before the boundary existed, to "fix" rows that were never wrong.
    expect(normalizePrincipalSubject(KEY_ID, 'ai_worker')).toBe(KEY_ID)
    expect(normalizePrincipalSubject(KEY_ID, 'service')).toBe(KEY_ID)
    expect(normalizePrincipalSubject(KEY_ID, 'system')).toBe(KEY_ID)
  })

  it('is accepted when no kind is declared at all', () => {
    // The caller that genuinely does not know. There is nothing to disagree.
    expect(normalizePrincipalSubject(KEY_ID, null)).toBe(KEY_ID)
    expect(normalizePrincipalSubject(`  ${KEY_ID}  `, undefined)).toBe(KEY_ID)
  })
})

describe('what it refuses outright', () => {
  it('an empty subject, or a prefix with nothing after it', () => {
    expect(() => normalizePrincipalSubject('', 'human')).toThrow(/must name somebody/)
    expect(() => normalizePrincipalSubject('   ', 'ai_worker')).toThrow()
    expect(() => normalizePrincipalSubject('ai_worker:', 'ai_worker')).toThrow(/must name somebody/)
    expect(() => normalizePrincipalSubject('api_key:', 'service')).toThrow()
  })
})

describe('the bare id helper', () => {
  it('strips a prefix and keeps the rest', () => {
    expect(principalIdOf(aiWorkerSubject(KEY_ID))).toBe(KEY_ID)
    expect(principalIdOf(apiKeySubject(KEY_ID))).toBe(KEY_ID)
    expect(principalIdOf(USER_ID)).toBe(USER_ID)
  })

  it('returns null rather than an answer derived from nothing', () => {
    expect(principalIdOf('')).toBeNull()
    expect(principalIdOf('   ')).toBeNull()
    expect(principalIdOf('ai_worker:')).toBeNull()
  })
})

describe('the round trip that matters', () => {
  it('what the write path stores is what the read path asks for', () => {
    // The read path is `parseSubject(auth.sub)` in `withheldFromThisPerson`: a
    // kind and a bare id. The write path must land on that same pair, or a row
    // and its lookup describe different actors.
    const subject = aiWorkerSubject(KEY_ID)
    const parsed = { kind: 'ai_worker' as const, id: KEY_ID }

    const stored = {
      subjectPrincipalId: normalizePrincipalSubject(subject, parsed.kind),
      subjectKind: parsed.kind,
    }

    expect(stored.subjectPrincipalId).toBe(parsed.id)
    expect(stored.subjectKind).toBe(parsed.kind)
  })
})
