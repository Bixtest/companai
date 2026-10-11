/**
 * `repeat.ts` — the S8 similarity signal.
 *
 * The rule under test is the one S8 names and the platform lacked: *"when the same
 * request repeats, the platform offers to save it as a Function"*. These tests pin
 * the **signal**, not the offer — the signal is pure, so it can be pinned exactly;
 * the offer is the caller's, and its gate is tested in `gate.test.ts`.
 */
import {
  DEFAULT_REPEAT_THRESHOLD,
  detectRepeatedRequest,
  normaliseRequestText,
  requestSimilarity,
  requestTokens,
} from '../repeat'

describe('S8 — normaliseRequestText', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normaliseRequestText('  Show me  the OVERDUE   invoices!! ')).toBe(
      'show me the overdue invoices',
    )
  })

  it('keeps non-Latin scripts (the strip is Unicode-aware, not ASCII)', () => {
    // A rule that only kept [a-z0-9] would empty these and make every
    // non-Latin request look like a repeat of every other one.
    expect(normaliseRequestText('Voir les factures')).toBe('voir les factures')
    expect(normaliseRequestText('Показать счета')).toBe('показать счета')
    expect(normaliseRequestText('未払いの請求書')).toBe('未払いの請求書')
  })

  it('returns the empty string for punctuation-only input', () => {
    expect(normaliseRequestText('!!! ... ???')).toBe('')
  })
})

describe('S8 — requestSimilarity', () => {
  it('is 1 for the same request said twice, whatever the punctuation', () => {
    expect(requestSimilarity('Show overdue invoices', 'show overdue invoices!!')).toBe(1)
  })

  it('is 0 for requests that share no words', () => {
    expect(requestSimilarity('show overdue invoices', 'add a new warehouse')).toBe(0)
  })

  it('is 0 when either side is empty — "nothing" is not a repeat of "nothing"', () => {
    // Returning 1 here would make an empty history match everything, and an
    // empty prompt look like a repeat of the last one.
    expect(requestSimilarity('', '')).toBe(0)
    expect(requestSimilarity('!!!', 'show invoices')).toBe(0)
    expect(requestSimilarity('show invoices', '   ')).toBe(0)
  })

  it('is the Jaccard ratio for a partial overlap', () => {
    // {show, overdue, invoices} vs {show, overdue, customers} → 2 / 4.
    expect(requestSimilarity('show overdue invoices', 'show overdue customers')).toBe(0.5)
  })

  it('counts a word once, however often it appears', () => {
    expect(requestTokens('invoices invoices invoices')).toEqual(new Set(['invoices']))
    expect(requestSimilarity('invoices invoices', 'invoices')).toBe(1)
  })
})

describe('S8 — detectRepeatedRequest', () => {
  const history = [
    { text: 'Show me all overdue invoices', at: '2026-10-01' },
    { text: 'Add a new warehouse in Ghent', at: '2026-10-02' },
  ]

  it('notices a repeat and names the closest past request', () => {
    const verdict = detectRepeatedRequest({
      text: 'show me all overdue invoices!',
      history,
    })
    expect(verdict.looksLikeRepeat).toBe(true)
    expect(verdict.matchCount).toBe(1)
    expect(verdict.bestScore).toBe(1)
    expect(verdict.nearest?.at).toBe('2026-10-01')
  })

  it('stays quiet for a request that only shares a topic', () => {
    // "show me all overdue invoices" (5 tokens) vs "show me all overdue credit
    // notes" (6): 4 shared, union 7 → 0.571, below the 0.8 default. A shared topic
    // is NOT a repeat, and offering to save here would be the annoying false
    // positive.
    const verdict = detectRepeatedRequest({
      text: 'show me all overdue credit notes',
      history,
    })
    expect(verdict.looksLikeRepeat).toBe(false)
    expect(verdict.matchCount).toBe(0)
    expect(verdict.bestScore).toBeLessThan(DEFAULT_REPEAT_THRESHOLD)
    expect(verdict.nearest).not.toBeNull()
  })

  it('is not a repeat when the history is empty', () => {
    const verdict = detectRepeatedRequest({ text: 'show invoices', history: [] })
    expect(verdict).toEqual({
      looksLikeRepeat: false,
      matchCount: 0,
      bestScore: 0,
      nearest: null,
      threshold: DEFAULT_REPEAT_THRESHOLD,
    })
  })

  it('never treats an empty request as a repeat of an empty one', () => {
    const verdict = detectRepeatedRequest({ text: '', history: [{ text: '' }, { text: '  ' }] })
    expect(verdict.looksLikeRepeat).toBe(false)
    expect(verdict.bestScore).toBe(0)
  })

  it('honours a caller-supplied threshold (and reports it back)', () => {
    const text = 'show me all overdue credit notes' // 0.571 vs the first entry
    expect(detectRepeatedRequest({ text, history }).looksLikeRepeat).toBe(false)
    expect(detectRepeatedRequest({ text, history, threshold: 0.5 }).looksLikeRepeat).toBe(true)
    expect(detectRepeatedRequest({ text, history, threshold: 0.5 }).threshold).toBe(0.5)
  })

  it('clamps a nonsense threshold rather than trusting it', () => {
    // A NaN threshold would make every comparison false (or true) silently.
    expect(detectRepeatedRequest({ text: 'x', history, threshold: Number.NaN }).threshold).toBe(
      DEFAULT_REPEAT_THRESHOLD,
    )
    expect(detectRepeatedRequest({ text: 'x', history, threshold: 5 }).threshold).toBe(1)
    expect(detectRepeatedRequest({ text: 'x', history, threshold: -1 }).threshold).toBe(0)
  })

  it('counts every match, not just the best one', () => {
    const verdict = detectRepeatedRequest({
      text: 'show overdue invoices',
      history: [
        { text: 'show overdue invoices' },
        { text: 'show overdue invoices please' }, // 3/4 shared = 0.75 → below 0.8
        { text: 'Show overdue invoices!' }, // identical → 1
      ],
    })
    expect(verdict.matchCount).toBe(2)
    expect(verdict.bestScore).toBe(1)
  })

  it('is pure — the same inputs give the same verdict, and the history is not mutated', () => {
    const frozen = Object.freeze([...history])
    const a = detectRepeatedRequest({ text: 'show me all overdue invoices', history: frozen })
    const b = detectRepeatedRequest({ text: 'show me all overdue invoices', history: frozen })
    expect(a).toEqual(b)
    expect(history).toHaveLength(2)
  })
})
