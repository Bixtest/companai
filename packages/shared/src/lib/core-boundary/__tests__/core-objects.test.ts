/**
 * SD-2 / S9 — the core-object registry.
 *
 * **What this suite has to prove.** The registry is the one place that answers
 * *"is this object core — undeletable by anyone?"*. Three things make it real, and
 * each is tested against the case that would break it:
 *
 *   1. **The owner's named surface IS core** — the roles-and-permissions manager
 *      (`superadmin`) reads `isCoreObject('role', 'superadmin') === true`. Without
 *      this the whole item is a mechanism with no first entry.
 *   2. **The match is exact and safe** — a near-miss (`'superadmin2'`, `'super'`,
 *      an empty string, a non-string) is **not** core, so the rule does not
 *      over-block ordinary roles. Case is folded so a stored `SuperAdmin` cannot
 *      slip past.
 *   3. **A refusal names a reason and never throws** — `coreObjectRefusal` returns
 *      the reason (dictionary S3: tell the user why) and `null` for a deletable
 *      object, so the caller — not this module — decides how to surface it.
 */

import {
  CORE_OBJECT_KINDS,
  coreObjectFor,
  coreObjectRefusal,
  coreObjects,
  isCoreObject,
  isCoreObjectKind,
} from '../core-objects'

describe('isCoreObject — the owner\'s named surface is core', () => {
  it('the roles-and-permissions manager (superadmin) is core', () => {
    expect(isCoreObject('role', 'superadmin')).toBe(true)
  })

  it('case is folded, so a stored SuperAdmin cannot slip past the rule', () => {
    expect(isCoreObject('role', 'SuperAdmin')).toBe(true)
    expect(isCoreObject('role', 'SUPERADMIN')).toBe(true)
  })

  it('surrounding whitespace does not defeat the match', () => {
    expect(isCoreObject('role', '  superadmin  ')).toBe(true)
  })
})

describe('isCoreObject — a near-miss is NOT core (no over-blocking)', () => {
  it('a different name is not core', () => {
    expect(isCoreObject('role', 'superadmin2')).toBe(false)
    expect(isCoreObject('role', 'super')).toBe(false)
    expect(isCoreObject('role', 'admin')).toBe(false)
    expect(isCoreObject('role', 'employee')).toBe(false)
  })

  it('an empty or whitespace-only id is not core', () => {
    expect(isCoreObject('role', '')).toBe(false)
    expect(isCoreObject('role', '   ')).toBe(false)
  })

  it('a non-string id is not core (never a crash)', () => {
    // The public signature is `string`, but a caller in JS (or a JSON payload) can
    // hand anything, and a throw here would be the fail-open this must avoid.
    expect(isCoreObject('role', undefined as unknown as string)).toBe(false)
    expect(isCoreObject('role', null as unknown as string)).toBe(false)
    expect(isCoreObject('role', 42 as unknown as string)).toBe(false)
  })
})

describe('coreObjectFor — the object and its reason', () => {
  it('returns the core object with its since and because', () => {
    const core = coreObjectFor('role', 'superadmin')
    expect(core).not.toBeNull()
    expect(core!.kind).toBe('role')
    expect(core!.id).toBe('superadmin')
    expect(core!.because).toContain('roles-and-permissions manager')
    expect(core!.since).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns null for a non-core object', () => {
    expect(coreObjectFor('role', 'admin')).toBeNull()
  })
})

describe('coreObjectRefusal — a reason, never a throw', () => {
  it('names the reason and the because for a core object', () => {
    const refusal = coreObjectRefusal('role', 'superadmin')
    expect(refusal).not.toBeNull()
    expect(refusal!.reason).toBe('"superadmin" is a core role and cannot be deleted.')
    expect(refusal!.because).toContain('roles-and-permissions manager')
  })

  it('returns null for a deletable object (the caller proceeds)', () => {
    expect(coreObjectRefusal('role', 'admin')).toBeNull()
  })
})

describe('the registry is exposed read-only and the kind set is closed', () => {
  it('coreObjects() lists the first entry and cannot be mutated through the return', () => {
    const list = coreObjects() as CoreObject[]
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('superadmin')
    // The array is a copy: a caller pushing into it does not change the registry.
    list.push({ kind: 'role', id: 'injected', since: '1999-01-01', because: 'x' })
    expect(coreObjects()).toHaveLength(1)
  })

  it('the kind set is exactly the declared kinds', () => {
    expect(CORE_OBJECT_KINDS).toEqual(['role'])
    expect(isCoreObjectKind('role')).toBe(true)
    expect(isCoreObjectKind('function')).toBe(false)
    expect(isCoreObjectKind(undefined)).toBe(false)
  })
})

// A local type only so the mutation-in-the-test above typechecks.
type CoreObject = ReturnType<typeof coreObjects>[number]
