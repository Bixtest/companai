/**
 * The state-machine primitive — the four facets, each proven.
 *
 * The `SUB-IMPLEMENTATION-PLAN-CC40-and-G-22.md` §3 acceptance, stated as tests:
 * *a legal transition allowed; an illegal one refused with a reason; a transition
 * failing its permission refused; a transition failing a precondition refused;
 * every transition emits its event.* Each branch is its own `it`, so a mutation
 * that breaks one branch fails exactly one test rather than the whole file.
 */

import {
  attempt,
  canTransition,
  compile,
  declaredEvents,
  findTransition,
  initialState,
  type StateMachineDeclaration,
} from '..'

/* ------------------------------------------------------------------ *
 * A machine wide enough to exercise every facet, and no wider
 * ------------------------------------------------------------------ */

type Ctx = { hasValue: boolean; locked: boolean }
type Actor = { id: string; mayEdit: boolean }

const declaration: StateMachineDeclaration<Ctx, Actor> = {
  name: 'test pipeline',
  states: ['draft', 'open', 'won', 'lost', 'archived'],
  initial: 'draft',
  transitions: [
    // No gates at all: the bare "allowed transition" case.
    { from: 'draft', to: 'open', emit: 'opened' },
    // Permission only.
    {
      from: 'open',
      to: 'won',
      permission: (actor) => actor.mayEdit,
      emit: ['moved', 'won'],
    },
    // Precondition only.
    { from: 'open', to: 'lost', precondition: (_actor, ctx) => ctx.hasValue },
    // Both gates, so ordering (permission before precondition) can be pinned.
    {
      from: 'open',
      to: 'archived',
      permission: (actor) => actor.mayEdit,
      precondition: (_actor, ctx) => !ctx.locked,
    },
    // A gate that refuses *with its own reason* rather than a bare `false`.
    {
      from: 'won',
      to: 'archived',
      precondition: (_actor, ctx) =>
        ctx.locked ? 'A locked deal cannot be archived.' : true,
    },
    // A declared self-loop, to prove the engine does not special-case from === to.
    { from: 'lost', to: 'lost', emit: 'reaffirmed' },
  ],
}

const machine = compile(declaration)
const allowedActor: Actor = { id: 'a1', mayEdit: true }
const deniedActor: Actor = { id: 'a2', mayEdit: false }

/* ------------------------------------------------------------------ *
 * Facet 1 — allowed transitions (the graph)
 * ------------------------------------------------------------------ */

describe('state-machine — facet 1: allowed transitions', () => {
  it('allows a declared transition with no gates and returns its events', () => {
    const outcome = attempt(machine, 'draft', 'open', allowedActor, { hasValue: false, locked: false })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.from).toBe('draft')
    expect(outcome.to).toBe('open')
    expect(outcome.events).toEqual(['opened'])
  })

  it('refuses an undeclared transition, with a reason that names the legal targets', () => {
    const outcome = attempt(machine, 'draft', 'won', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('not-a-declared-transition')
    expect(outcome.reason).toContain('no transition from "draft" to "won"')
    // Actionable: the refusal lists what *is* reachable from here.
    expect(outcome.reason).toContain('"open"')
  })

  it('refuses a move out of a state that has no outgoing transitions', () => {
    const outcome = attempt(machine, 'archived', 'draft', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('not-a-declared-transition')
    expect(outcome.reason).toContain('has no outgoing transitions')
  })

  it('treats a self-transition as legal only when the graph declares one', () => {
    // Declared self-loop on "lost" → allowed.
    expect(canTransition(machine, 'lost', 'lost')).toBe(true)
    // No self-loop declared on "draft" → the from === to case is refused, not special-cased.
    expect(canTransition(machine, 'draft', 'draft')).toBe(false)
    const outcome = attempt(machine, 'draft', 'draft', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
  })

  it('answers "does this edge exist" independently of whether a move is permitted now', () => {
    // The edge exists…
    expect(canTransition(machine, 'open', 'won')).toBe(true)
    // …but this actor may not take it. The two questions stay separate.
    const outcome = attempt(machine, 'open', 'won', deniedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('permission')

    expect(findTransition(machine, 'open', 'won')).toBeDefined()
    expect(findTransition(machine, 'open', 'draft')).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ *
 * Facet 2 — permission
 * ------------------------------------------------------------------ */

describe('state-machine — facet 2: permission', () => {
  it('allows when the permission gate returns true', () => {
    const outcome = attempt(machine, 'open', 'won', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.events).toEqual(['moved', 'won'])
  })

  it('refuses with kind "permission" when the gate returns false', () => {
    const outcome = attempt(machine, 'open', 'won', deniedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('permission')
    expect(outcome.reason).toContain('not permitted for this actor')
  })

  it('uses the gate\'s own string as the refusal reason when it returns one', () => {
    // Fully typed, no `as never` — the string-reason path is reachable in normal code.
    const machine2 = compile<Ctx, Actor>({
      name: 'reasoned',
      states: ['a', 'b'],
      transitions: [
        {
          from: 'a',
          to: 'b',
          permission: (actor) => (actor.id === 'owner' ? true : 'Only an owner may move this.'),
        },
      ],
    })
    const outcome = attempt(machine2, 'a', 'b', { id: 'guest', mayEdit: true }, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('permission')
    expect(outcome.reason).toBe('Only an owner may move this.')
    // And the same edge, for the owner, allows.
    expect(attempt(machine2, 'a', 'b', { id: 'owner', mayEdit: true }, { hasValue: true, locked: false }).ok).toBe(true)
  })

  it('FAILS CLOSED: a gate returning null/undefined/0/NaN/empty-string refuses, it does not allow', () => {
    // The silent-allow defect: an untyped gate that fails to answer must not be read as "yes".
    const holes: Array<[string, () => unknown]> = [
      ['null', () => null],
      ['undefined', () => undefined],
      ['0', () => 0],
      ['NaN', () => NaN],
      ['empty string', () => ''],
    ]
    for (const [label, gate] of holes) {
      const m = compile<Ctx, Actor>({
        name: `hole-${label}`,
        states: ['a', 'b'],
        transitions: [{ from: 'a', to: 'b', permission: gate as never }],
      })
      const outcome = attempt(m, 'a', 'b', allowedActor, { hasValue: true, locked: false })
      expect(outcome.ok).toBe(false)
      if (outcome.ok) continue
      expect(outcome.kind).toBe('permission')
      // A refusal always carries a NON-EMPTY reason — never `''` wearing the shape of an explained refusal.
      expect(outcome.reason.length).toBeGreaterThan(0)
    }
  })

  it('distinguishes an ABSENT gate (allows) from a gate that returns undefined (refuses)', () => {
    const absent = compile<Ctx, Actor>({
      name: 'absent',
      states: ['a', 'b'],
      transitions: [{ from: 'a', to: 'b' }],
    })
    expect(attempt(absent, 'a', 'b', allowedActor, { hasValue: true, locked: false }).ok).toBe(true)

    const answeredNothing = compile<Ctx, Actor>({
      name: 'answered-nothing',
      states: ['a', 'b'],
      transitions: [{ from: 'a', to: 'b', permission: () => undefined as never }],
    })
    expect(attempt(answeredNothing, 'a', 'b', allowedActor, { hasValue: true, locked: false }).ok).toBe(false)
  })

  it('NEVER produces a refusal with an empty reason, on any branch', () => {
    // The contract: a refusal *carries a value* — a reason that says something.
    // `''` would be a silent refusal wearing the shape of an explained one.
    const cases: Array<Parameters<typeof compile<Ctx, Actor>>[0]> = [
      { name: 'n1', states: ['a', 'b'], transitions: [{ from: 'z', to: 'b' }] }, // a→b undeclared
      { name: 'n2', states: ['a', 'b'], transitions: [{ from: 'a', to: 'b', permission: () => false }] },
      { name: 'n3', states: ['a', 'b'], transitions: [{ from: 'a', to: 'b', precondition: () => false }] },
      { name: 'n4', states: ['a', 'b'], transitions: [{ from: 'a', to: 'b', permission: () => '' as never }] },
      { name: 'n5', states: ['a', 'b'], transitions: [{ from: 'a', to: 'b', precondition: () => '' as never }] },
    ]
    for (const decl of cases) {
      const m = compile(decl)
      const outcome = attempt(m, 'a', 'b', allowedActor, { hasValue: false, locked: false })
      expect(outcome.ok).toBe(false)
      if (outcome.ok) continue
      expect(typeof outcome.reason).toBe('string')
      expect(outcome.reason.length).toBeGreaterThan(0)
    }
  })
})

/* ------------------------------------------------------------------ *
 * Facet 3 — preconditions
 * ------------------------------------------------------------------ */

describe('state-machine — facet 3: preconditions', () => {
  it('allows when the precondition holds', () => {
    const outcome = attempt(machine, 'open', 'lost', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    // The "lost" edge declares no events → an empty array, never undefined.
    expect(outcome.events).toEqual([])
  })

  it('refuses with kind "precondition" when the gate returns false', () => {
    const outcome = attempt(machine, 'open', 'lost', allowedActor, { hasValue: false, locked: false })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('precondition')
    expect(outcome.reason).toContain('its precondition is not met')
  })

  it('checks the precondition on the FIRST edge that declares one, not only the last', () => {
    // Guards against a mutation that only consults a precondition on one branch:
    // every gated edge must enforce its own precondition.
    const m = compile<Ctx, Actor>({
      name: 'two-gates',
      states: ['s'],
      transitions: [
        { from: 's', to: 'x', precondition: (_a, c) => c.hasValue },
        { from: 's', to: 'y', precondition: (_a, c) => !c.locked },
      ],
    })
    expect(attempt(m, 's', 'x', allowedActor, { hasValue: false, locked: false }).ok).toBe(false)
    expect(attempt(m, 's', 'y', allowedActor, { hasValue: false, locked: true }).ok).toBe(false)
    expect(attempt(m, 's', 'x', allowedActor, { hasValue: true, locked: false }).ok).toBe(true)
    expect(attempt(m, 's', 'y', allowedActor, { hasValue: false, locked: false }).ok).toBe(true)
  })

  it('uses the precondition gate\'s own string as the reason when it returns one', () => {
    const outcome = attempt(machine, 'won', 'archived', allowedActor, { hasValue: true, locked: true })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('precondition')
    expect(outcome.reason).toBe('A locked deal cannot be archived.')
  })

  it('checks permission BEFORE precondition, so an unauthorised actor is told the permission failed', () => {
    // Both gates would fail here (deniedActor + locked). Permission is reported,
    // because a precondition is not the unauthorised actor's business.
    const outcome = attempt(machine, 'open', 'archived', deniedActor, { hasValue: true, locked: true })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('permission')
  })

  it('reports "permission" — not "precondition" — on a both-gated edge with a denied actor and an unmet precondition', () => {
    // The order, pinned on a purpose-built edge so a swap mutation kills this test specifically.
    const m = compile<Ctx, Actor>({
      name: 'ordered',
      states: ['a', 'b'],
      transitions: [
        {
          from: 'a',
          to: 'b',
          permission: (actor) => actor.mayEdit,
          precondition: () => false,
        },
      ],
    })
    const outcome = attempt(m, 'a', 'b', deniedActor, { hasValue: false, locked: true })
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.kind).toBe('permission')
  })
})

/* ------------------------------------------------------------------ *
 * Facet 4 — events
 * ------------------------------------------------------------------ */

describe('state-machine — facet 4: events', () => {
  it('returns a single declared event as a one-element array', () => {
    const outcome = attempt(machine, 'lost', 'lost', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.events).toEqual(['reaffirmed'])
  })

  it('returns multiple declared events in declaration order', () => {
    const outcome = attempt(machine, 'open', 'won', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.events).toEqual(['moved', 'won'])
  })

  it('returns an empty array — not undefined — when a transition announces nothing', () => {
    const outcome = attempt(machine, 'open', 'lost', allowedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.events).toEqual([])
  })

  it('does not emit events on a refusal', () => {
    const outcome = attempt(machine, 'open', 'won', deniedActor, { hasValue: true, locked: false })
    expect(outcome.ok).toBe(false)
    expect(outcome).not.toHaveProperty('events')
  })

  it('enumerates every declared event once, in first-seen order', () => {
    expect(declaredEvents(machine)).toEqual(['opened', 'moved', 'won', 'reaffirmed'])
  })
})

/* ------------------------------------------------------------------ *
 * Compilation, initial state, and the purity of the engine
 * ------------------------------------------------------------------ */

describe('state-machine — compilation and convenience', () => {
  it('returns the declared initial state, or null when none is named', () => {
    expect(initialState(machine)).toBe('draft')
    const noInitial = compile({ name: 'x', states: ['a'], transitions: [] })
    expect(initialState(noInitial)).toBeNull()
  })

  it('does not mutate the declaration it was given', () => {
    const decl: StateMachineDeclaration = {
      name: 'frozen',
      states: ['a', 'b'],
      transitions: [{ from: 'a', to: 'b', emit: 'go' }],
    }
    const snapshot = JSON.stringify(decl)
    const m = compile(decl)
    attempt(m, 'a', 'b', {}, {})
    attempt(m, 'a', 'z', {}, {})
    expect(JSON.stringify(decl)).toBe(snapshot)
  })

  it('keeps a gate\'s returned array from aliasing the declaration', () => {
    const events = ['one']
    const m = compile({ name: 'alias', states: ['a', 'b'], transitions: [{ from: 'a', to: 'b', emit: events }] })
    const outcome = attempt(m, 'a', 'b', {}, {})
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    events.push('two')
    // The outcome captured a copy, so a later mutation of the caller's array is invisible.
    expect(outcome.events).toEqual(['one'])
  })

  it('groups edges by from-state so an attempt only scans that state\'s edges', () => {
    const m = compile({
      name: 'wide',
      states: ['a', 'b', 'c', 'd'],
      transitions: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'a', to: 'd' },
        { from: 'b', to: 'a' },
      ],
    })
    expect(m.byFrom.get('a')?.length).toBe(3)
    expect(m.byFrom.get('b')?.length).toBe(1)
    expect(m.byFrom.get('c')).toBeUndefined()
  })
})
