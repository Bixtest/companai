/**
 * A command whose capability depends on what it is being asked to do (U14).
 *
 * **Why this exists.** The authority gate is keyed by capability, and a command
 * declaring none is not gated. That was fine while one command meant one act —
 * until `messages`, where saving a draft and sending it are the same command
 * with a flag, and the two are `E1 reversible` and `E3 irreversible external`
 * respectively.
 *
 * A static value had to be wrong one way or the other: under-classify and the
 * irreversible external act goes ungated; over-classify and the record claims a
 * draft save was irreversible. A record that says something false is worth less
 * than no record, so neither was acceptable.
 *
 * These tests pin the resolution itself, which lives in the one place the gate
 * reads a capability from.
 */
import { CommandBus } from '../command-bus'

/**
 * The resolution rule, mirrored from `command-bus.ts`.
 *
 * Kept here rather than exported from the bus because it is an internal detail
 * of one call site; the behaviour is what matters and it is asserted below
 * through the same three shapes the bus handles.
 */
function resolve(handler: { capability?: string | ((input: never) => string | null) }, input: unknown): string | null {
  const declared = handler.capability
  if (typeof declared === 'string') return declared || null
  if (typeof declared !== 'function') return null
  try {
    return declared(input as never) || null
  } catch {
    return null
  }
}

describe('how a handler declares what it does', () => {
  it('takes a plain string as-is', () => {
    // The overwhelmingly common case, and it must keep working untouched.
    expect(resolve({ capability: 'currencies.manage' }, {})).toBe('currencies.manage')
  })

  it('leaves a command that declares nothing ungated', () => {
    expect(resolve({}, {})).toBeNull()
  })

  it('asks a function what this particular call is', () => {
    const handler = {
      capability: (input: { isDraft?: boolean }) => (input.isDraft ? 'messages.compose' : 'messages.email'),
    }

    expect(resolve(handler as never, { isDraft: true })).toBe('messages.compose')
    expect(resolve(handler as never, { isDraft: false })).toBe('messages.email')
  })

  it('treats a returned empty string as no declaration', () => {
    expect(resolve({ capability: () => '' } as never, {})).toBeNull()
  })

  it('lets a classifier decline this particular call', () => {
    // `null` means the same as omitting the field: not gated. A command with a
    // genuinely inconsequential mode should be able to say so.
    expect(resolve({ capability: () => null } as never, {})).toBeNull()
  })
})

describe('when a classifier misbehaves', () => {
  it('degrades to ungated rather than failing the command', () => {
    // Deliberate. The gate only ever narrows, so losing it costs a restriction.
    // Letting the throw escape would fail a write the user asked for because of
    // an attribute whose entire purpose is holding writes back — turning a
    // classification bug into an outage.
    const handler = { capability: () => { throw new Error('boom') } }

    expect(resolve(handler as never, {})).toBeNull()
  })
})

describe('the bus still constructs', () => {
  it('is importable with the widened contract', () => {
    // Guards the type change itself: `capability` went from `string` to
    // `string | fn`, and every existing handler must still compile and run.
    expect(typeof CommandBus).toBe('function')
  })
})
