/**
 * The Widget IR is **semantic** — §35 and rule 6.
 *
 * This is the one property that decides whether the Widget layer is a data
 * contract or a disguised component library, so it is asserted two ways:
 *
 *   1. **Behaviourally** — a real placed IR is scanned, key by key, for frontend
 *      vocabulary, and the scan is first shown to **find** planted vocabulary, so
 *      a clean result cannot be the scan failing to look.
 *   2. **At the type level** — the IR type has no field for `className`, `style`
 *      or `props`, and the `@ts-expect-error` directives prove it: if any of those
 *      fields existed, the directives would be *unused* and `tsc` would fail with
 *      TS2578. That is what makes "no frontend code can be expressed" a checked
 *      claim rather than a comment.
 */

import { CUSTOM_FIELD_KINDS } from '../../../modules/entities/kinds'
import {
  FRONTEND_VOCABULARY,
  KIND_TO_CONTROL,
  WIDGET_CONTROLS,
  WIDGET_IR_TYPES,
  controlForKind,
  findFrontendVocabulary,
} from '../ir'
import type { WidgetIR } from '../ir'
import { place } from './fixtures'

describe('the kind-to-control mapping', () => {
  it('covers every one of the platform’s 13 kinds, and invents none', () => {
    // Two routes to the same set: the map's keys and the platform's own list.
    expect(Object.keys(KIND_TO_CONTROL).sort()).toEqual([...CUSTOM_FIELD_KINDS].sort())
  })

  it('maps every kind to a control that is in the closed union', () => {
    for (const kind of CUSTOM_FIELD_KINDS) {
      expect(WIDGET_CONTROLS).toContain(controlForKind(kind))
    }
  })

  it('maps the kinds a person would recognise to the controls they expect', () => {
    expect(controlForKind('currency')).toBe('money_input')
    expect(controlForKind('relation')).toBe('entity_picker')
    expect(controlForKind('boolean')).toBe('boolean_toggle')
    expect(controlForKind('datetime')).toBe('datetime_input')
  })
})

describe('the IR carries no frontend vocabulary', () => {
  it('finds none in a real placed IR', () => {
    const { ir } = place()
    expect(findFrontendVocabulary(ir)).toEqual([])
  })

  it('finds planted vocabulary at the top level and nested (so the scan works)', () => {
    const { ir } = place()
    expect(findFrontendVocabulary({ ...ir, className: 'x' })).toEqual(['$.className'])
    expect(findFrontendVocabulary({ ...ir, inputs: [{ ...ir.inputs[0], style: { color: 'red' } }] })).toEqual([
      '$.inputs[0].style',
    ])
    expect(findFrontendVocabulary({ ...ir, source: { function: 'f', props: {} } })).toEqual(['$.source.props'])
  })

  it('does not flag a legitimate value that merely contains a forbidden word', () => {
    // Keys, not values. A title may say "Class of 2026"; the IR must not
    // *structure* itself around frontend concepts.
    const { ir } = place({ name: 'Class of 2026' })
    expect(findFrontendVocabulary(ir)).toEqual([])
  })

  it('lists the forbidden words as data, not as prose', () => {
    expect(FRONTEND_VOCABULARY).toContain('classname')
    expect(FRONTEND_VOCABULARY).toContain('css')
    expect(FRONTEND_VOCABULARY).toContain('children')
  })
})

describe('the IR type forbids frontend vocabulary (type-level probe)', () => {
  it('cannot express a className, a style or React props', () => {
    const base: WidgetIR = {
      type: 'data_grid',
      title: 'A grid',
      source: { function: 'fn_x' },
      inputs: [],
      actions: [],
    }

    // Each directive below is USED only while the IR type has no such field. If
    // one were added, `tsc -p tsconfig.business-widget-tests.json` would report
    // TS2578 "Unused '@ts-expect-error' directive" and this suite would not
    // type-check — which is how the claim is falsified rather than asserted.
    // @ts-expect-error — the IR is semantic: there is no className.
    const withClass: WidgetIR = { ...base, className: 'grid' }
    // @ts-expect-error — and no style.
    const withStyle: WidgetIR = { ...base, style: { display: 'grid' } }
    // @ts-expect-error — and no React props.
    const withProps: WidgetIR = { ...base, props: { rows: [] } }
    // @ts-expect-error — and no children.
    const withChildren: WidgetIR = { ...base, children: [] }

    void withClass
    void withStyle
    void withProps
    void withChildren

    expect(WIDGET_IR_TYPES).toContain(base.type)
  })
})
