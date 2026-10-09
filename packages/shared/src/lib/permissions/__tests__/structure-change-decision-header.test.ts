/**
 * SD-1 — the structure-change decision carrier (CC-17).
 *
 * **What this suite has to prove.** The carrier is the boundary where untrusted
 * text (a header value) becomes a decision, so its job is to be **strict**: a
 * malformed value must be reported as malformed, never guessed at and never
 * silently swallowed. The load-bearing cases are therefore the malformed ones —
 * for each, a caller must be able to tell "a person decided nothing" (a refusal,
 * the gate's rule 4) from "no person decided" (the default) from "a decision was
 * attempted but is broken" (a 400).
 *
 *   - `absent` — no header, empty header, whitespace header;
 *   - `malformed` — not JSON, not an object, missing `decidedBy`, bad `records`;
 *   - `decision` — a well-formed decision, with `block` and `surfaceId` **derived**
 *     from each feature id rather than demanded of the caller.
 *
 * The derivation half is proven directly: a header that sends only feature ids
 * must still yield records shaped exactly like the catalogue's (correct `block`,
 * correct `surfaceId`), which is what keeps a header-supplied record
 * indistinguishable from a surface-supplied one.
 */

import {
  readStructureDecisionHeader,
  readStructureDecisionFromHeaders,
  toStructurePermissionDecision,
  STRUCTURE_DECISION_HEADER_NAME,
} from '../structure-change-decision-header'
import { evaluateStructureChange } from '../structure-change-gate'
import { STRUCTURAL_VERBS, type PermissionSurface } from '../catalogue'

const fieldSurface: PermissionSurface = {
  id: 'customers:customer_person.loyalty_tier',
  kind: 'field',
  owner: 'entities',
  source: 'recorded',
}

/** Build a header record as a request would present it (lower-cased names). */
function headers(value: string): Record<string, string> {
  return { [STRUCTURE_DECISION_HEADER_NAME]: value }
}

describe('the header name follows the platform convention', () => {
  it('is x-om-ext-permissions-decision', () => {
    expect(STRUCTURE_DECISION_HEADER_NAME).toBe('x-om-ext-permissions-decision')
  })
})

describe('absent — no person decided', () => {
  it('reads absent when the header is not present', () => {
    expect(readStructureDecisionHeader({}).kind).toBe('absent')
  })

  it('reads absent for an empty value', () => {
    expect(readStructureDecisionHeader(headers('')).kind).toBe('absent')
  })

  it('reads absent for a whitespace-only value', () => {
    expect(readStructureDecisionHeader(headers('   ')).kind).toBe('absent')
  })

  it('reads absent when the header name is capitalised differently', () => {
    // HTTP header names are case-insensitive; the platform's own parser lower-cases.
    expect(
      readStructureDecisionHeader({ 'X-OM-EXT-PERMISSIONS-DECISION': '' }).kind,
    ).toBe('absent')
  })
})

describe('malformed — a decision was attempted but cannot be read', () => {
  it('rejects a value that is not JSON, and says so', () => {
    const read = readStructureDecisionHeader(headers('not json at all'))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') {
      expect(read.reason).toBe('not_json')
      expect(read.because).toContain(STRUCTURE_DECISION_HEADER_NAME)
    }
  })

  it('rejects a JSON array (must be an object)', () => {
    const read = readStructureDecisionHeader(headers('[1,2,3]'))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('not_object')
  })

  it('rejects a JSON scalar (must be an object)', () => {
    const read = readStructureDecisionHeader(headers('"hello"'))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('not_object')
  })

  it('rejects a decision with no decidedBy — a decision with no author is not a decision', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ records: [] })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') {
      expect(read.reason).toBe('missing_decided_by')
      expect(read.because).toContain('decidedBy')
    }
  })

  it('rejects a blank decidedBy', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: '   ', records: [] })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('missing_decided_by')
  })

  it('rejects missing records', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: 'admin' })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('invalid_records')
  })

  it('rejects records that are not an array', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: 'admin', records: 'nope' })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('invalid_records')
  })

  it('rejects a record that is not an object', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: 'admin', records: ['x'] })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('invalid_records')
  })

  it('rejects a record with no readable feature', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: 'admin', records: [{ block: 'data' }] })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') {
      expect(read.reason).toBe('invalid_records')
      expect(read.because).toContain('feature')
    }
  })

  it('rejects a record whose feature is a blank string', () => {
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: 'admin', records: [{ feature: '  ' }] })))
    expect(read.kind).toBe('malformed')
    if (read.kind === 'malformed') expect(read.reason).toBe('invalid_records')
  })
})

describe('decision — a well-formed decision is read as-is', () => {
  it('reads a minimal decision (only feature ids)', () => {
    const read = readStructureDecisionHeader(
      headers(JSON.stringify({ decidedBy: 'role:finance-admin', records: [{ feature: 'only.this' }] })),
    )
    expect(read.kind).toBe('decision')
    if (read.kind === 'decision') {
      expect(read.decision.decidedBy).toBe('role:finance-admin')
      expect(read.decision.records).toEqual([{ feature: 'only.this' }])
      expect(read.decision.grantTo).toBeUndefined()
    }
  })

  it('carries grantTo through when supplied', () => {
    const read = readStructureDecisionHeader(
      headers(JSON.stringify({ decidedBy: 'admin', records: [{ feature: 'a.b.view' }], grantTo: 'finance' })),
    )
    expect(read.kind).toBe('decision')
    if (read.kind === 'decision') expect(read.decision.grantTo).toBe('finance')
  })

  it('trims decidedBy and grantTo', () => {
    const read = readStructureDecisionHeader(
      headers(JSON.stringify({ decidedBy: '  admin  ', records: [{ feature: 'a.b.view' }], grantTo: '  finance  ' })),
    )
    expect(read.kind).toBe('decision')
    if (read.kind === 'decision') {
      expect(read.decision.decidedBy).toBe('admin')
      expect(read.decision.grantTo).toBe('finance')
    }
  })

  it('reads an empty records array as a decision (the gate, not the carrier, refuses it)', () => {
    // The carrier's job ends at "is this readable"; "a decision that grants nothing
    // is not a decision" is the gate's rule 4, proven in the gate's own suite.
    const read = readStructureDecisionHeader(headers(JSON.stringify({ decidedBy: 'admin', records: [] })))
    expect(read.kind).toBe('decision')
  })
})

describe('readStructureDecisionFromHeaders — accepts a live Headers object', () => {
  it('reads a decision from a Headers instance the same way as a plain record', () => {
    const h = new Headers()
    h.set(STRUCTURE_DECISION_HEADER_NAME, JSON.stringify({ decidedBy: 'admin', records: [{ feature: 'a.b.view' }] }))
    const read = readStructureDecisionFromHeaders(h)
    expect(read.kind).toBe('decision')
    if (read.kind === 'decision') expect(read.decision.decidedBy).toBe('admin')
  })

  it('reads absent from an empty Headers instance', () => {
    expect(readStructureDecisionFromHeaders(new Headers()).kind).toBe('absent')
  })
})

describe('toStructurePermissionDecision — derives block and surfaceId, never demands them', () => {
  it('derives the data block and the surface id from a bare feature id', () => {
    const mapped = toStructurePermissionDecision({
      decidedBy: 'admin',
      records: [{ feature: 'customers:customer_person.loyalty_tier.view' }],
    })
    expect(mapped.records).toEqual([
      { feature: 'customers:customer_person.loyalty_tier.view', block: 'data', surfaceId: 'customers:customer_person.loyalty_tier' },
    ])
  })

  it('derives the structural block from each S11 structural verb', () => {
    // SD-4 Slice C: the block is read from the catalogue's own structural verb set.
    for (const verb of STRUCTURAL_VERBS) {
      const mapped = toStructurePermissionDecision({
        decidedBy: 'admin',
        records: [{ feature: `customers:customer_person.loyalty_tier.${verb}` }],
      })
      expect(mapped.records[0].block).toBe('structural')
    }
  })

  it('a legacy `.structure` verb is NOT structural any more (it is not an S11 verb)', () => {
    // The old single-verb name is gone from the grammar; a feature carrying it must
    // not be silently classified structural — that would reintroduce the flag.
    const mapped = toStructurePermissionDecision({
      decidedBy: 'admin',
      records: [{ feature: 'customers:customer_person.loyalty_tier.structure' }],
    })
    expect(mapped.records[0].block).toBe('data')
  })

  it('lets an explicit block/surfaceId win over the derivation', () => {
    const mapped = toStructurePermissionDecision({
      decidedBy: 'admin',
      records: [{ feature: 'x.y.view', block: 'structural', surfaceId: 'explicit.surface' }],
    })
    expect(mapped.records[0].block).toBe('structural')
    expect(mapped.records[0].surfaceId).toBe('explicit.surface')
  })

  it('leaves a feature with no verb separator whole as its own surface id', () => {
    const mapped = toStructurePermissionDecision({ decidedBy: 'admin', records: [{ feature: 'plainfeature' }] })
    expect(mapped.records[0].surfaceId).toBe('plainfeature')
  })

  it('carries grantTo through when present, and omits it otherwise', () => {
    const withTarget = toStructurePermissionDecision({ decidedBy: 'admin', records: [{ feature: 'a.b.view' }], grantTo: 'finance' })
    expect(withTarget.grantTo).toBe('finance')
    const withoutTarget = toStructurePermissionDecision({ decidedBy: 'admin', records: [{ feature: 'a.b.view' }] })
    expect(withoutTarget.grantTo).toBeUndefined()
  })
})

describe('CC-17 end-to-end — a header decision reaches the gate and decides', () => {
  it('a header decision produces a decided outcome naming the decision’s own target', () => {
    const read = readStructureDecisionHeader(
      headers(
        JSON.stringify({
          decidedBy: 'role:finance-admin',
          grantTo: 'finance',
          records: [
            { feature: 'customers:customer_person.loyalty_tier.view' },
            { feature: 'customers:customer_person.loyalty_tier.manage' },
          ],
        }),
      ),
    )
    expect(read.kind).toBe('decision')
    if (read.kind !== 'decision') return

    const result = evaluateStructureChange({
      surfaces: [fieldSurface],
      decision: toStructurePermissionDecision(read.decision),
    })
    expect(result.outcome).toBe('decided')
    if (result.outcome === 'decided') {
      expect(result.grantTo).toBe('finance')
      expect(result.decidedBy).toBe('role:finance-admin')
      expect(result.records.map((r) => r.feature)).toEqual([
        'customers:customer_person.loyalty_tier.view',
        'customers:customer_person.loyalty_tier.manage',
      ])
    }
  })

  it('a malformed header must not be read as "no decision" — the two mean opposite things', () => {
    // If a caller treated malformed as absent, the gate would default-grant the
    // superadmin role — silently swapping a person's intent for a fail-open grant.
    const read = readStructureDecisionHeader(headers('{ not json'))
    expect(read.kind).toBe('malformed')
    expect(read.kind).not.toBe('absent')
  })
})
