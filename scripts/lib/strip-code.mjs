/**
 * The one lexer: strip strings, comments, template literals and regex literals from source,
 * preserving newlines and character positions, so a caller can match on CODE and still report real
 * line numbers.
 *
 * WHY IT IS SHARED
 * ----------------
 * Two checks now need to look at code rather than text:
 *
 *   - `check-declared-controls.mjs` — so a sentence that merely *mentions* `.delegable` is not read
 *     as a declaration site (`auth/acl.ts:112` was, before this).
 *   - `check-two-reads.mjs` — so a brace inside a string does not change the scope a setting read
 *     lands in, and so a `process.env.X` in a comment is not counted as a read.
 *
 * The lexer was written for the first. Extracting it here means the second reuses it rather than
 * growing a second, slightly different one — the repo's own lesson (`CC-91`): the work is
 * *generalise*, not *import a parallel copy*. The behaviour is unchanged; the mutation harness that
 * guards `check-declared-controls` was repointed at this file for the three lexer mutations, so the
 * extraction is proven, not assumed.
 *
 * THE HARD PART, AND HOW IT IS DECIDED
 * ------------------------------------
 * Regex vs division is disambiguated the way every lexer does it — by what precedes the slash. After
 * an identifier, number, `)` or `]` a `/` is division; anywhere else it opens a literal. (`}` counts
 * as a literal opener: a block boundary is far more often followed by a statement than by a
 * division.)
 *
 * KNOWN LIMIT
 * -----------
 * A template literal is blanked, and an `${ … }` interpolation body is blanked with it — the `${`
 * and its MATCHING `}` are both emitted, so the result stays brace-balanced. Two things are
 * therefore not seen: code inside an interpolation, and a *nested* template inside one (the inner
 * backtick ends the outer literal). Callers that are line-based treat that as residue, which is the
 * same trade the escape-hatch census makes.
 */

import { readFileSync } from 'node:fs'

/**
 * Replace every string, comment, template and regex literal in `text` with blanks, preserving
 * newlines so line numbers survive. The result is the same length as the input.
 */
export function strip(text) {
  let out = ''
  let i = 0
  const n = text.length
  /** Last significant character emitted — what a `/` would be operating on. */
  let lastSig = ''

  /** Is a `/` here division rather than the start of a regex literal? */
  const isDivision = () => lastSig === ')' || lastSig === ']' || /[\w$]/.test(lastSig)

  while (i < n) {
    const c = text[i]
    const c2 = text[i + 1]

    if (c === '/' && c2 === '/') {
      while (i < n && text[i] !== '\n') {
        out += ' '
        i += 1
      }
      continue
    }
    if (c === '/' && c2 === '*') {
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
        out += text[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += '  '
        i += 2
      }
      continue
    }
    if (c === '"' || c === "'") {
      const q = c
      out += q
      i += 1
      while (i < n && text[i] !== q) {
        if (text[i] === '\\') {
          out += '  '
          i += 2
          continue
        }
        out += text[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += q
        i += 1
      }
      lastSig = q
      continue
    }
    if (c === '`') {
      out += '`'
      i += 1
      while (i < n && text[i] !== '`') {
        if (text[i] === '\\') {
          out += '  '
          i += 2
          continue
        }
        if (text[i] === '$' && text[i + 1] === '{') {
          out += '${'
          lastSig = '{'
          i += 2
          // Consume the interpolation body to its MATCHING `}`, blanking the body and emitting that
          // closing brace. Without this the stripped text carries an unbalanced `{` for every
          // interpolation — harmless to a regex match, but it corrupts any brace-based reading of
          // the result (the two-reads scope mis-nested on exactly this, measured 2026-10-17).
          let depth = 1
          while (i < n && depth > 0) {
            const ic = text[i]
            if (ic === '\\') {
              out += '  '
              i += 2
              continue
            }
            if (ic === '`') break // unterminated interpolation: stop, do not swallow the rest
            if (ic === '{') depth += 1
            else if (ic === '}') {
              depth -= 1
              if (depth === 0) {
                out += '}'
                i += 1
                break
              }
            }
            out += ic === '\n' ? '\n' : ' '
            i += 1
          }
          continue
        }
        out += text[i] === '\n' ? '\n' : ' '
        i += 1
      }
      if (i < n) {
        out += '`'
        i += 1
      }
      lastSig = '`'
      continue
    }
    // A regex literal. Blank everything to the closing `/`, respecting `[...]` classes where a `/`
    // is an ordinary character and does not close the literal.
    if (c === '/' && !isDivision()) {
      out += '/'
      i += 1
      let inClass = false
      while (i < n) {
        const rc = text[i]
        if (rc === '\\') {
          out += '  '
          i += 2
          continue
        }
        if (rc === '[') inClass = true
        else if (rc === ']') inClass = false
        else if (rc === '/' && !inClass) {
          out += '/'
          i += 1
          break
        } else if (rc === '\n') {
          // An unterminated literal on one line: stop, do not swallow the rest of the file.
          out += '\n'
          i += 1
          break
        }
        out += rc === '\n' ? '\n' : ' '
        i += 1
      }
      // Flags (`g`, `i`, `m`, …) follow the closing slash and are copied through.
      while (i < n && /[a-z]/.test(text[i])) {
        out += text[i]
        lastSig = text[i]
        i += 1
      }
      continue
    }

    out += c
    if (!/\s/.test(c)) lastSig = c
    i += 1
  }
  return out
}

/**
 * Read a file once, stripped, keeping line boundaries so the caller can still report real line
 * numbers. `strippedLines[i]` corresponds to `lines[i]` in the original.
 *
 * Returns `null` if the file cannot be read (callers treat that as "skip", not as "clean").
 */
export function readStrippedLines(file) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return null
  }
  const stripped = strip(text)
  // strip() preserves newlines, so the line counts match; split both and pair them.
  const orig = text.split(/\r?\n/)
  const bare = stripped.split('\n')
  return orig.map((line, i) => (bare[i] === undefined ? strip(line) : bare[i]))
}
