/**
 * @jest-environment jsdom
 *
 * The structural-permissions manage screen (SD-5), as a person meets it.
 *
 * The grammar, its parser and the one-cell edit are covered as pure functions in
 * `shared`. What is untested until now is the part that decides whether the
 * screen *means* anything: that "Inherited" is a distinct choice from the four
 * levels, that an untouched screen does not claim a change, and that a save sends
 * exactly what the grammar accepts.
 *
 * The distinction the whole screen rests on is explicit-vs-inherited: a cell a
 * person set and a cell nobody chose must not look the same, because only an
 * explicit level may loosen the fail-closed default. A screen that collapsed the
 * two would silently freeze all 90 cells the first time anyone pressed Save.
 *
 * The Radix `Select` is mocked down to a native `<select>` (the pattern this
 * repo uses — `ProductComplianceSection.test.tsx`): the component's own logic is
 * what is under test, not Radix's portal/pointer behaviour, and a native element
 * is drivable with `fireEvent.change`.
 */
import * as React from 'react'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@open-mercato/shared/lib/testing/renderWithProviders'

const readApiResultOrThrowMock = jest.fn()
const apiCallMock = jest.fn()
const flashMock = jest.fn()

jest.mock('@open-mercato/ui/backend/utils/apiCall', () => ({
  readApiResultOrThrow: (...args: unknown[]) => readApiResultOrThrowMock(...args),
  apiCall: (...args: unknown[]) => apiCallMock(...args),
}))

jest.mock('@open-mercato/ui/backend/FlashMessages', () => ({
  flash: (...args: unknown[]) => flashMock(...args),
}))

jest.mock('@open-mercato/shared/lib/frontend/useOrganizationScope', () => ({
  useOrganizationScopeVersion: () => 0,
}))

jest.mock('@open-mercato/shared/lib/i18n/context', () => {
  const translate = (key: string, fallback?: string) => (fallback ?? key) as string
  // `renderWithProviders` wraps the tree in `I18nProvider`; keep it a passthrough
  // so mocking `useT` does not blank the provider out.
  return {
    useT: () => translate,
    I18nProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// The DS Select, mocked to a native control so a change is directly drivable.
jest.mock('@open-mercato/ui/primitives/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}))

import { StructuralPermissionsSettings } from '../components/StructuralPermissionsSettings'

beforeEach(() => {
  readApiResultOrThrowMock.mockReset()
  apiCallMock.mockReset()
  flashMock.mockReset()
})

async function renderLoaded(payload: unknown) {
  readApiResultOrThrowMock.mockResolvedValue(payload)
  const utils = renderWithProviders(<StructuralPermissionsSettings />)
  await waitFor(() => expect(utils.getAllByRole('combobox').length).toBeGreaterThan(0))
  return utils
}

describe('StructuralPermissionsSettings — load', () => {
  it('renders one group per object kind (table, column, … agent)', async () => {
    const { getAllByText } = await renderLoaded({ rules: {}, defaultLevel: 'approval' })
    for (const objectKind of ['table', 'column', 'relation', 'function', 'widget', 'agent']) {
      expect(getAllByText(objectKind, { exact: true }).length).toBeGreaterThan(0)
    }
  })

  it('renders one select per (verb × actor) across every object kind — 6 × 5 × 3 = 90', async () => {
    const { getAllByRole } = await renderLoaded({ rules: {}, defaultLevel: 'approval' })
    expect(getAllByRole('combobox').length).toBe(90)
  })

  it('falls back to the fail-closed seed when the server sends a malformed value', async () => {
    // A `straight` default is refused by the parser; the screen must show the seed,
    // so every cell reads as "Inherited" — nothing is claimed as explicit.
    const { getAllByRole } = await renderLoaded({ rules: {}, defaultLevel: 'straight' })
    const selects = getAllByRole('combobox') as HTMLSelectElement[]
    expect(selects.length).toBe(90)
    expect(selects.every((select) => select.value === '__inherit__')).toBe(true)
  })

  it('shows an explicit rule as the chosen level, not as inherited', async () => {
    const { getAllByRole } = await renderLoaded({
      rules: { table: { read: { human: 'never' } } },
      defaultLevel: 'approval',
    })
    const selects = getAllByRole('combobox') as HTMLSelectElement[]
    // The first cell is `table × read × human` in declaration order.
    expect(selects[0].value).toBe('never')
    // A sibling cell with no rule stays inherited.
    expect(selects[1].value).toBe('__inherit__')
  })
})

describe('StructuralPermissionsSettings — editing and saving', () => {
  it('Save is disabled until a cell changes', async () => {
    const { getByRole } = await renderLoaded({ rules: {}, defaultLevel: 'approval' })
    const save = getByRole('button', { name: /^save$/i }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })

  it('changing a cell marks the form dirty and enables Save', async () => {
    const { getByRole, getAllByRole } = await renderLoaded({ rules: {}, defaultLevel: 'approval' })
    fireEvent.change(getAllByRole('combobox')[0], { target: { value: 'review' } })
    const save = getByRole('button', { name: /^save$/i }) as HTMLButtonElement
    await waitFor(() => expect(save.disabled).toBe(false))
  })

  it('saves an explicit rule and leaves every other cell unset (sparse write)', async () => {
    apiCallMock.mockResolvedValue({ ok: true, response: { ok: true } })
    const { getByRole, getAllByRole } = await renderLoaded({ rules: {}, defaultLevel: 'approval' })
    fireEvent.change(getAllByRole('combobox')[0], { target: { value: 'never' } })
    fireEvent.click(getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(apiCallMock).toHaveBeenCalledTimes(1))
    const [url, init] = apiCallMock.mock.calls[0]
    expect(url).toBe('/api/auth/structural-permissions')
    expect(init.method).toBe('PUT')
    const body = JSON.parse(init.body)
    expect(body.defaultLevel).toBe('approval')
    // The first cell is `table × read × human` (declaration order).
    expect(body.rules.table.read.human).toBe('never')
    // Sparse in ROWS: no other cell carries a level. The empty object-kind/verb
    // buckets the grammar's immutable edit carries are containers, not placements —
    // what matters is that no *other* (object, verb, actor) has a level.
    const placements: Array<[string, string, string, unknown]> = []
    for (const [objectKind, verbs] of Object.entries(body.rules as Record<string, Record<string, Record<string, unknown>>>)) {
      for (const [verb, actors] of Object.entries(verbs)) {
        for (const [actor, level] of Object.entries(actors)) {
          placements.push([objectKind, verb, actor, level])
        }
      }
    }
    expect(placements).toEqual([['table', 'read', 'human', 'never']])
  })

  it('clears a cell back to inheritance when "Inherited" is chosen', async () => {
    apiCallMock.mockResolvedValue({ ok: true, response: { ok: true } })
    const { getByRole, getAllByRole } = await renderLoaded({
      rules: { table: { read: { human: 'never' } } },
      defaultLevel: 'approval',
    })
    // Clear the one explicit cell, then save.
    fireEvent.change(getAllByRole('combobox')[0], { target: { value: '__inherit__' } })
    fireEvent.click(getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(apiCallMock).toHaveBeenCalledTimes(1))
    const body = JSON.parse(apiCallMock.mock.calls[0][1].body)
    // The row is removed, not set to the default.
    expect(body.rules.table?.read?.human).toBeUndefined()
  })
})
