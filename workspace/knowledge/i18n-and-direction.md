# Translations, and which way the text runs

**In one sentence.** Strings come from per-module dictionaries merged by locale,
and the direction the interface runs in is decided from the locale rather than
left to the browser.

**Why it matters.** Both halves fail silently. A missing translation renders its
English fallback and nobody notices; a missing `dir` renders Arabic
left-to-right, which also errors nowhere.

---

## Where strings live

**The module owns its own dictionary**, not the app:

```
packages/core/src/modules/<module>/i18n/{en,de,es,pl,ar}.json
```

`apps/mercato/src/i18n/*.json` exists too, and is the *app's* — putting a module's
strings there works, right up until somebody deletes them as orphans ([[L35]]).
Find an existing key of the same kind and add yours where its neighbours are.

The generator discovers whichever locale files each module happens to have and
merges them per locale, so **a module with no `ar.json` simply contributes
nothing** and each string falls back to the inline default in `t(key, fallback)`.
Partial dictionaries degrade to readable-but-English rather than to blank.

| Command | What it does |
|---|---|
| `yarn i18n:check-hardcoded` | Finds user-facing strings not routed through `t()` |
| `yarn i18n:check-values` | Finds keys missing from non-English dictionaries |

Both are advisory. Prefix genuinely internal messages with `[internal]` to opt out.

## Which way the text runs

`packages/shared/src/lib/i18n/direction.ts`, applied on `<html>` in the root
layout:

```tsx
const direction = resolveTextDirection(locale)
return <html lang={locale} dir={direction}>
```

- Decided on the **language subtag**, never the whole tag — direction is a
  property of the script, so `ar`, `ar-EG` and `ar-Arab-EG` all run the same way.
- Ten RTL subtags: `ar he fa ur ps sd ug yi dv ckb`.
- **Anything unrecognised falls back to `ltr`** — the safe direction, not the
  neutral one. Defaulting to `rtl` would mirror the interface for every locale we
  failed to parse.

**There is no tenant setting for this**, deliberately. Direction follows language
essentially universally, which puts it in the first row of rule zero-seven's
table: *there is a right answer → default, no setting*.
`resolveTextDirection(locale, policy)` accepts one anyway, so the seam is there if
something ever genuinely has a policy — but no configuration key exists, because a
key nothing reads is a control that is claimed and absent.

## Adding a locale

1. Add it to `Locale` and `locales` in `packages/shared/src/lib/i18n/config.ts`.
2. **Let the compiler find the rest.** Two maps enumerate locales by hand
   (`ProfileDropdown`, `LanguageSwitcher`); the union makes them fail the build
   rather than silently miss an entry. Use endonyms — `العربية`, not "Arabic".
3. Add `i18n/<locale>.json` to whichever modules you can translate. Skipping one
   is fine.
4. `yarn generate`, then rebuild — dictionaries are wired into the generated
   registry at build time.

**Do not assert the locale list in a test.** `TranslationManager.primitives` once
asserted `['EN','PL','ES','DE']`, so adding Arabic failed a test about *markup*.
Derive from `locales` — the assertion almost always means "one per locale", not
"these locales".

## Proving RTL end to end

```bash
curl -s -H "Accept-Language: ar" http://localhost:3000/login | grep -oE '<html[^>]*>'
```

Expect `<html lang="ar" dir="rtl">`; `Accept-Language: en` gives `dir="ltr"`.
`detectLocale()` prefers a `locale` cookie, then `Accept-Language`, then the
default, and `OM_FORCE_LOCALE` pins the whole app regardless.

## Where the code lives

| Path | What |
|---|---|
| `packages/shared/src/lib/i18n/config.ts` | The `Locale` union and the shipped list |
| `packages/shared/src/lib/i18n/direction.ts` | RTL subtags, inference, the policy seam |
| `packages/shared/src/lib/i18n/server.ts` | `detectLocale`, `loadDictionary`, `resolveTranslations` |
| `packages/shared/src/lib/i18n/context.tsx` | `useT` for client components |
| `apps/mercato/src/app/layout.tsx` | Where `dir` is applied — **mirror any change into `packages/create-app/template/src/app/layout.tsx`** |
