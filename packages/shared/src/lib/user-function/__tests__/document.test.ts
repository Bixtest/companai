/**
 * The durable document — RQ-24, *"the IR is the durable asset"*.
 *
 * The discipline G-01 established is repeated here, and it is the whole point of
 * this suite: **assert the export is non-empty first**, then assert the round-trip
 * is empty. An empty diff on an empty export proves nothing, and a suite that only
 * checked the round-trip would pass against an exporter that wrote `{}`.
 */

import {
  exportFunction,
  FUNCTION_DOCUMENT_FORMAT,
  FUNCTION_DOCUMENT_VERSION,
  importFunction,
  roundTripFunction,
  serialiseFunctionDocument,
} from '../document'
import type { FunctionDocument } from '../document'
import { makeFunction, UNREAD_IR } from './fixtures'

describe('exportFunction — non-empty first', () => {
  it('carries the real IR, not an empty shell', () => {
    const doc = exportFunction(makeFunction())
    expect(doc.format).toBe(FUNCTION_DOCUMENT_FORMAT)
    expect(doc.version).toBe(FUNCTION_DOCUMENT_VERSION)
    expect(doc.function.businessIr).toEqual(UNREAD_IR)
    expect(doc.function.businessIr?.filters).toHaveLength(2)
    expect(serialiseFunctionDocument(doc)).toContain('external_conversation')
    expect(serialiseFunctionDocument(doc)).toContain('min_unread')
    // A meaningful floor, so "non-empty" is measured rather than asserted.
    expect(serialiseFunctionDocument(doc).length).toBeGreaterThan(400)
  })

  it('is deterministic — two exports of the same Function are identical strings', () => {
    const fn = makeFunction()
    expect(serialiseFunctionDocument(exportFunction(fn))).toBe(
      serialiseFunctionDocument(exportFunction(fn)),
    )
  })

  it('is stable across a different listing order of the reference sets', () => {
    const a = makeFunction({
      references: {
        entities: ['external_conversation'],
        fields: ['b', 'a'],
        metrics: [],
        commands: [],
        workflows: [],
      },
      requiredPermissions: ['z', 'a'],
    })
    const b = makeFunction({
      references: {
        entities: ['external_conversation'],
        fields: ['a', 'b'],
        metrics: [],
        commands: [],
        workflows: [],
      },
      requiredPermissions: ['a', 'z'],
    })
    expect(serialiseFunctionDocument(exportFunction(a))).toBe(
      serialiseFunctionDocument(exportFunction(b)),
    )
  })
})

describe('the round-trip is empty', () => {
  it('for a query Function', () => {
    const result = roundTripFunction(makeFunction())
    expect(result.empty).toBe(true)
    expect(result.before).toBe(result.after)
  })

  it('for a command Function', () => {
    const result = roundTripFunction(
      makeFunction({
        operationType: 'command',
        businessIr: undefined,
        businessCommandIr: {
          command: 'conversation.close',
          inputs: { conversation: 'c-1' },
          requested_by: 'user-1',
          idempotency_key: 'key-1',
        },
      }),
    )
    expect(result.empty).toBe(true)
  })

  it('for a Function carrying every optional and opaque field', () => {
    const result = roundTripFunction(
      makeFunction({
        status: 'verified',
        createdAt: '2026-10-01T00:00:00.000Z',
        publishedAt: '2026-10-02T00:00:00.000Z',
        createdBy: 'user-1',
        verifiedBy: 'user-2',
        compiledPlanFingerprint: 'deadbeef',
        executionFingerprint: 'cafebabe',
        verification: { notChecked: ['authorization_valid'] },
        presentation: { kind: 'table', columns: ['subject'] },
        resultSchema: { columns: ['subject', 'unread_count'] },
        executionPolicy: { maxRows: 100 },
        confirmationPolicy: { require: false },
        auditPolicy: { level: 'standard' },
        ui: { placement: 'inbox' },
      }),
    )
    expect(result.empty).toBe(true)
  })

  it('preserves a key the reader does not know about', () => {
    const doc = exportFunction(makeFunction()) as FunctionDocument & {
      function: Record<string, unknown>
    }
    doc.function.futureField = { anything: [1, 2, 3] }
    const imported = importFunction(doc) as unknown as Record<string, unknown>
    expect(imported.futureField).toEqual({ anything: [1, 2, 3] })
    expect(roundTripFunction(imported as never).empty).toBe(true)
  })
})

describe('importFunction — a document that could not be referenced is refused loudly', () => {
  const valid = (): FunctionDocument => exportFunction(makeFunction())

  const withFunction = (patch: Record<string, unknown>): FunctionDocument => {
    const doc = valid()
    return { ...doc, function: { ...doc.function, ...patch } as never }
  }

  it('refuses a document that is not an object', () => {
    expect(() => importFunction(undefined as never)).toThrow('document is required')
  })

  it('refuses an unknown format', () => {
    expect(() => importFunction({ ...valid(), format: 'companai.other' } as never)).toThrow(
      'unknown document format',
    )
  })

  it('refuses an unsupported version, and says which version it reads', () => {
    expect(() => importFunction({ ...valid(), version: 99 } as never)).toThrow(
      'unsupported document version 99',
    )
  })

  it('refuses a function id that is not canonical', () => {
    expect(() => importFunction(withFunction({ id: 'Unread-Conversations' }))).toThrow(
      'not a canonical id',
    )
  })

  it('refuses an unknown operation type', () => {
    expect(() => importFunction(withFunction({ operationType: 'report' }))).toThrow(
      'unknown operation type',
    )
  })

  it('refuses an unknown status, and lists the ones it knows', () => {
    expect(() => importFunction(withFunction({ status: 'live' }))).toThrow('unknown status')
  })

  it('refuses a non-numeric version', () => {
    expect(() => importFunction(withFunction({ version: '2' }))).toThrow('must be a number')
  })

  it('refuses a parameter name that is not a canonical segment', () => {
    expect(() =>
      importFunction(withFunction({ parameterSchema: [{ name: 'Min-Unread', kind: 'integer', required: true }] })),
    ).toThrow('not a canonical segment')
  })

  it('refuses a non-canonical reference id', () => {
    expect(() =>
      importFunction(
        withFunction({
          references: { entities: ['Not-An-Id'], fields: [], metrics: [], commands: [], workflows: [] },
        }),
      ),
    ).toThrow('references.entities')
  })

  it('refuses a non-canonical IR entity', () => {
    expect(() =>
      importFunction(
        withFunction({ businessIr: { operation: 'list', entity: 'External Conversation' } }),
      ),
    ).toThrow('the IR entity')
  })

  it('refuses a non-canonical field inside the IR', () => {
    expect(() =>
      importFunction(
        withFunction({
          businessIr: { operation: 'list', entity: 'external_conversation', dimensions: ['Bad Field'] },
        }),
      ),
    ).toThrow('an IR dimension')
  })

  it('refuses a non-canonical command name', () => {
    expect(() =>
      importFunction(
        withFunction({
          operationType: 'command',
          businessIr: undefined,
          businessCommandIr: {
            command: 'Conversation.Close',
            inputs: {},
            requested_by: 'user-1',
            idempotency_key: 'k',
          },
        }),
      ),
    ).toThrow('the command name')
  })

  it('refuses a status that only verification can reach, with no verification record', () => {
    // The lifecycle's guarantee must hold across the document boundary too: a
    // doctored document must not be able to claim it was verified.
    for (const status of ['verified', 'published', 'active', 'deprecated'] as const) {
      const doc = withFunction({ status, verification: undefined })
      expect(() => importFunction(doc)).toThrow(/without a verification record/)
    }
  })

  it('accepts an archived Function with no verification record, because archiving needs none', () => {
    // `archived` is reachable from any state, so an abandoned draft may be
    // archived without ever having been verified.
    const doc = withFunction({ status: 'archived', verification: undefined })
    expect(importFunction(doc).status).toBe('archived')
  })

  it('refuses an empty verification record, because an empty object says nothing', () => {
    const doc = withFunction({ status: 'active', verification: {} })
    expect(() => importFunction(doc)).toThrow(/must list the checks that could not be run/)
  })

  it('returns a copy — mutating the import does not touch the document', () => {
    const doc = valid()
    const imported = importFunction(doc)
    imported.name = 'changed'
    ;(imported.businessIr as { entity: string }).entity = 'no_such_entity'
    expect(doc.function.name).toBe('Unread conversations')
    expect(doc.function.businessIr?.entity).toBe('external_conversation')
  })
})
