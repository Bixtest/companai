export type Locale = 'en' | 'pl' | 'es' | 'de' | 'ar'

/**
 * `ar` is here to make the direction policy real rather than theoretical.
 *
 * Every other locale ships left-to-right, so nothing ever exercised `dir` and a
 * regression in it would have been invisible. Arabic is the cheapest honest
 * proof: choose it and the whole interface has to mirror.
 *
 * Its dictionaries are partial by design. A module with no `ar.json` contributes
 * nothing and each string renders its inline English fallback, so an untranslated
 * surface degrades to readable-but-English rather than to blank or broken.
 */
export const locales: Locale[] = ['en', 'pl', 'es', 'de', 'ar']
export const defaultLocale: Locale = 'en'
