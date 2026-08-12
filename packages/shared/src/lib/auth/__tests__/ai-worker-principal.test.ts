/**
 * An AI worker is an actor the platform can represent (item 13).
 *
 * **What this closed.** `ai_worker` was one of four principal kinds and the only
 * one nothing could produce. No subject encoded it, so no ceiling, delegation,
 * trust grant or denial could target a machine, and the effect-class matrix —
 * which exists to bound machines — never engaged. The kind was a type with no
 * inhabitants.
 *
 * **The shape of the fix.** An AI worker authenticates with a credential, and an
 * API key already is one: hashed, revocable, org-scoped, rate-limited,
 * role-bearing. A key marked `principal_kind = 'ai_worker'` issues an
 * `ai_worker:` subject instead of `api_key:`. Nothing else changes, and the
 * journal, the ledger and the resolver all see a machine.
 *
 * **The bug that this file exists to prevent recurring** is in the last block.
 */
import {
  aiWorkerSubject,
  apiKeySubject,
  derivePrincipal,
  isApiKeyBackedKind,
  isMachinePrincipal,
  parseSubject,
} from '../principal'

const KEY_ID = '28c2b7f3-529e-4591-812c-c16bfcc1f738'
const USER_ID = 'cdb4f480-35e9-4874-84e4-51a41cd43030'

describe('encoding an AI worker', () => {
  it('round-trips through a subject', () => {
    expect(parseSubject(aiWorkerSubject(KEY_ID))).toEqual({ kind: 'ai_worker', id: KEY_ID })
  })

  it('stays distinct from an ordinary service key', () => {
    // The whole point. Before this, both were `service` and the resolver could
    // not treat a machine differently from an integration.
    expect(parseSubject(apiKeySubject(KEY_ID)).kind).toBe('service')
    expect(parseSubject(aiWorkerSubject(KEY_ID)).kind).toBe('ai_worker')
  })

  it('leaves a bare uuid a human', () => {
    expect(parseSubject(USER_ID).kind).toBe('human')
  })
})

describe('deriving the principal', () => {
  it('resolves an AI worker to its key id, not the subject string', () => {
    const principal = derivePrincipal({ sub: aiWorkerSubject(KEY_ID), keyId: KEY_ID, keyName: 'Hermes' })

    expect(principal).toMatchObject({ kind: 'ai_worker', id: KEY_ID, displayName: 'Hermes' })
  })

  it('carries the user it was issued on behalf of', () => {
    // An AI worker acts under somebody's sponsorship. Losing that would make it
    // impossible to ask whose authority a machine was drawing on.
    const principal = derivePrincipal({
      sub: aiWorkerSubject(KEY_ID), keyId: KEY_ID, userId: USER_ID,
    })

    expect(principal?.onBehalfOfUserId).toBe(USER_ID)
  })

  it('does not let an AI worker be mistaken for the person who sponsored it', () => {
    // The asymmetry invariant (I2). A machine acting on somebody's behalf is
    // still a machine, and attribution must never collapse the two.
    const principal = derivePrincipal({
      sub: aiWorkerSubject(KEY_ID), keyId: KEY_ID, userId: USER_ID,
    })

    expect(principal?.kind).not.toBe('human')
    expect(principal?.id).not.toBe(USER_ID)
  })
})

describe('which kinds resolve permissions from a key', () => {
  /**
   * **The bug this guards, found by using the platform rather than testing it.**
   *
   * Adding `ai_worker` made every `kind === 'service'` check silently
   * incomplete. Those checks meant *"resolve this actor's permissions from its
   * key row"*, and there were suddenly two kinds that needed it. `RbacService`
   * tested only for `service`, so an AI worker fell through to the **human**
   * branch and put `ai_worker:<uuid>` into a uuid column:
   *
   * ```text
   * DriverException: invalid input syntax for type uuid:
   *   "ai_worker:28c2b7f3-529e-4591-812c-c16bfcc1f738"
   * ```
   *
   * Every unit test passed. Typecheck passed. It only existed at the seam
   * between a new enum value and old conditionals that had quietly become
   * partial.
   */
  it('includes both credential-backed kinds', () => {
    expect(isApiKeyBackedKind('service')).toBe(true)
    expect(isApiKeyBackedKind('ai_worker')).toBe(true)
  })

  it('excludes a human', () => {
    expect(isApiKeyBackedKind('human')).toBe(false)
  })

  it('excludes `system`, which has no key row at all', () => {
    // The reason this predicate is not `isMachinePrincipal`. `system` is the
    // platform acting on its own behalf — a CLI, a scheduled job — and looking
    // one up in `api_keys` finds nothing. Reusing the broader predicate here
    // would have looked correct and failed differently.
    expect(isApiKeyBackedKind('system')).toBe(false)
    expect(isMachinePrincipal({ sub: 'anything', principal: { id: 'x', kind: 'system' } as never })).toBe(true)
  })

  it('handles an absent kind', () => {
    expect(isApiKeyBackedKind(null)).toBe(false)
    expect(isApiKeyBackedKind(undefined)).toBe(false)
  })
})
