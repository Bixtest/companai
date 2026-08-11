/**
 * Which way the text runs, and what happens when we cannot tell.
 *
 * The failure this guards against is silent: a browser given `lang="ar"` and no
 * `dir` renders Arabic left-to-right without erroring. Nothing crashes, nothing
 * logs, and the interface is inside out. So the fallbacks matter as much as the
 * lookups, and they are asserted here rather than assumed.
 */
import {
  DEFAULT_TEXT_DIRECTION_POLICY,
  inferTextDirection,
  isTextDirectionPolicy,
  resolveTextDirection,
} from '../direction'

describe('inferring direction from a locale', () => {
  it('knows the locales we ship', () => {
    expect(inferTextDirection('ar')).toBe('rtl')
    for (const locale of ['en', 'pl', 'es', 'de']) {
      expect(inferTextDirection(locale)).toBe('ltr')
    }
  })

  it('decides on the language subtag, not the whole tag', () => {
    // Direction is a property of the script, so every Arabic variant runs the
    // same way. A list of full tags would be endless and still incomplete.
    for (const tag of ['ar-EG', 'ar-Arab-EG', 'AR-eg', 'ar_SA']) {
      expect(inferTextDirection(tag)).toBe('rtl')
    }
    expect(inferTextDirection('en-GB')).toBe('ltr')
  })

  it('covers the right-to-left languages with real software presence', () => {
    for (const subtag of ['he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb']) {
      expect(inferTextDirection(subtag)).toBe('rtl')
    }
  })

  it('falls back to ltr for anything it cannot read', () => {
    // The safe direction rather than the neutral one: guessing `rtl` would
    // mirror the whole interface for every locale we failed to parse.
    for (const value of [null, undefined, '', '   ', 'not-a-locale', '123', 'x', {}, 42]) {
      expect(inferTextDirection(value as string)).toBe('ltr')
    }
  })

  it('does not mistake a longer word starting with an rtl subtag', () => {
    // `arabic` is not `ar`. Matching on a prefix rather than the parsed subtag
    // would flip every locale whose name happens to start with one.
    expect(inferTextDirection('arbitrary')).toBe('ltr')
    expect(inferTextDirection('hello')).toBe('ltr')
  })
})

describe('the tenant policy', () => {
  it('defaults to inferring from the locale', () => {
    expect(DEFAULT_TEXT_DIRECTION_POLICY).toBe('auto')
    expect(resolveTextDirection('ar')).toBe('rtl')
    expect(resolveTextDirection('en')).toBe('ltr')
  })

  it('lets a tenant pin a direction against the locale', () => {
    // A right-to-left interface whose content is mostly English is a real
    // deployment, and there is no other way to express it.
    expect(resolveTextDirection('en', 'rtl')).toBe('rtl')
    expect(resolveTextDirection('ar', 'ltr')).toBe('ltr')
  })

  it('hands a corrupt policy back to the locale rather than freezing it', () => {
    // A setting we cannot read should not decide anything. Falling back to a
    // fixed direction would pin the interface whichever way the corruption read.
    for (const value of ['sideways', '', null, undefined, 7, {}]) {
      expect(resolveTextDirection('ar', value)).toBe('rtl')
      expect(resolveTextDirection('en', value)).toBe('ltr')
    }
  })

  it('recognises exactly the three policies it offers', () => {
    for (const value of ['auto', 'ltr', 'rtl']) expect(isTextDirectionPolicy(value)).toBe(true)
    for (const value of ['RTL', 'inherit', null, 1]) expect(isTextDirectionPolicy(value)).toBe(false)
  })
})
