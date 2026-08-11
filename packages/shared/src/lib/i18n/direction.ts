/**
 * Which way the text runs.
 *
 * The platform already had the *capability* — every Radix primitive accepts
 * `dir`, and the CSS logical properties follow it — but nothing decided what to
 * pass. Four LTR locales shipped, so the question never came up, and `<html>` was
 * left with a `lang` and no `dir`.
 *
 * That absence is not neutral. A browser handed `lang="ar"` and no `dir` renders
 * Arabic left-to-right: the letters are right, the layout is inside out, and
 * nothing errors. Direction has to be *decided* somewhere, and this is the
 * somewhere.
 */

export const TEXT_DIRECTIONS = ['ltr', 'rtl'] as const
export type TextDirection = (typeof TEXT_DIRECTIONS)[number]

/**
 * Language subtags written right-to-left.
 *
 * Matched on the **language subtag only**, never the whole tag: direction is a
 * property of the script, so `ar`, `ar-EG` and `ar-Arab-EG` all run the same way
 * and a list of full tags would be endless and still incomplete.
 *
 * The set is the ten with meaningful software presence — Arabic, Hebrew, Persian,
 * Urdu, Pashto, Sindhi, Uyghur, Yiddish, Dhivehi and Kurdish (Sorani). It is
 * deliberately a small closed list rather than an attempt at every RTL language
 * ever written: a wrong entry here silently mirrors somebody's entire interface.
 */
const RTL_LANGUAGE_SUBTAGS = new Set([
  'ar', // Arabic
  'he', // Hebrew
  'fa', // Persian
  'ur', // Urdu
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'yi', // Yiddish
  'dv', // Dhivehi
  'ckb', // Kurdish (Sorani)
])

/**
 * A locale tag's language subtag, or `null` when the value is not a locale.
 *
 * Tolerant on the way in — `en_GB`, ` EN-gb `, `ar-Arab-EG` all resolve — because
 * this reads values that arrived from a cookie, a header or a database column,
 * none of which are guaranteed to be well-formed.
 */
function languageSubtagOf(locale: string | null | undefined): string | null {
  if (typeof locale !== 'string') return null
  const normalized = locale.trim().toLowerCase().replace(/_/g, '-')
  if (!normalized) return null
  const [subtag] = normalized.split('-')
  // Language subtags are two or three letters. Anything else is not a locale,
  // and guessing at it would be worse than admitting we do not know.
  if (!/^[a-z]{2,3}$/.test(subtag)) return null
  return subtag
}

/**
 * The direction a locale is written in.
 *
 * **Falls back to `ltr` for anything unrecognised**, which is the safe direction
 * rather than the neutral one: an unknown locale rendered left-to-right is at
 * worst wrong for a language we do not ship, while defaulting to `rtl` would
 * mirror the interface for every locale we failed to parse.
 */
export function inferTextDirection(locale: string | null | undefined): TextDirection {
  const subtag = languageSubtagOf(locale)
  if (!subtag) return 'ltr'
  return RTL_LANGUAGE_SUBTAGS.has(subtag) ? 'rtl' : 'ltr'
}

export const TEXT_DIRECTION_POLICIES = ['auto', 'ltr', 'rtl'] as const
export type TextDirectionPolicy = (typeof TEXT_DIRECTION_POLICIES)[number]

/**
 * `auto` — infer from the locale. The default, and right for almost everyone.
 *
 * The overrides exist because inference is a property of the *language* and an
 * organisation may need a property of the *deployment*: a right-to-left interface
 * whose content is mostly English, or a tenant standardising on one direction
 * across mixed locales. Rare, real, and impossible to express any other way —
 * which is the test for whether a setting earns its place.
 */
export const DEFAULT_TEXT_DIRECTION_POLICY: TextDirectionPolicy = 'auto'

export function isTextDirectionPolicy(value: unknown): value is TextDirectionPolicy {
  return typeof value === 'string' && (TEXT_DIRECTION_POLICIES as readonly string[]).includes(value)
}

/**
 * The direction to render, given a locale and whatever policy is configured.
 *
 * An unreadable policy falls back to `auto` rather than to a fixed direction:
 * a corrupt setting should hand the decision back to the locale, not freeze the
 * interface in whichever way the corruption happened to read.
 */
export function resolveTextDirection(
  locale: string | null | undefined,
  policy?: unknown,
): TextDirection {
  const effective: TextDirectionPolicy = isTextDirectionPolicy(policy)
    ? policy
    : DEFAULT_TEXT_DIRECTION_POLICY
  if (effective === 'ltr' || effective === 'rtl') return effective
  return inferTextDirection(locale)
}
