"use client"

import * as React from 'react'
import { Spinner } from '@open-mercato/ui/primitives/spinner'
import { Button } from '@open-mercato/ui/primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { apiCall, readApiResultOrThrow } from '@open-mercato/ui/backend/utils/apiCall'
import { raiseCrudError } from '@open-mercato/ui/backend/utils/serverErrors'
import { useOrganizationScopeVersion } from '@open-mercato/shared/lib/frontend/useOrganizationScope'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { createLogger } from '@open-mercato/shared/lib/logger'
import {
  DEFAULT_STRUCTURAL_LEVEL,
  DEFAULT_STRUCTURAL_SETTINGS,
  STRUCTURAL_ACTOR_TYPES,
  STRUCTURAL_LEVELS,
  STRUCTURAL_OBJECT_KINDS,
  normalizeStructuralSettings,
  structuralSettingsEqual,
  structuralSettingsGrid,
  withStructuralLevel,
  type StructuralActorType,
  type StructuralLevelCell,
  type StructuralObjectKind,
  type StructuralSettings,
} from '@open-mercato/shared/lib/permissions/structural-settings'
import { STRUCTURAL_VERBS, type StructuralVerb } from '@open-mercato/shared/lib/permissions/catalogue'
import type { StructurePermissionLevel } from '@open-mercato/shared/lib/request-outcome/tier-source'

const logger = createLogger('auth')

type SettingsResponse = {
  rules?: unknown
  defaultLevel?: unknown
}

/**
 * The **structural-permissions manage screen** (SD-5) — the S11/S12 grammar as a
 * settings surface.
 *
 * **The shape.** One card, grouped by **object kind** (the architecture's §4.1
 * axis: `table | column | relation | function | widget | agent`). Inside each
 * object group, one row per **verb** (`read | add | edit | remove | reference`)
 * and one select per **actor** (`human | ai | any`), each offering the four
 * **levels** (`straight | review | approval | never`) plus "inherited". This is
 * the "roles-and-permissions-style surface, grouped by object, each verb × actor ×
 * level as choices" of the SD-5 spec, reusing the roles UI's grouped-grid shape
 * (S5) over the same setting the CC-37 guard reads.
 *
 * **The policy is NOT here.** All the grammar logic — the closed sets, the grid,
 * the one-cell edit, the equality that drives the Save button — lives in
 * `@open-mercato/shared/lib/permissions/structural-settings`, the same module the
 * guard reads. This component only loads, renders and writes; it holds no rule of
 * its own, so the screen and the enforcement cannot drift.
 *
 * **Editor's choice: an explicit "inherited" option, distinct from the four
 * levels.** A cell may be *unset* (no explicit rule → it inherits `defaultLevel`,
 * S11). A select offering only the four levels could not express "unset", so it
 * would silently convert every save into "a person chose this" for all 90 cells.
 * The extra "Inherited" option preserves the difference the guard relies on
 * (explicit-vs-default, CC-37): choosing it clears the cell
 * ({@link withStructuralLevel} with `level: null`), choosing a level sets it.
 */
export function StructuralPermissionsSettings() {
  const t = useT()
  const scopeVersion = useOrganizationScopeVersion()
  const [loaded, setLoaded] = React.useState<StructuralSettings | null>(null)
  const [draft, setDraft] = React.useState<StructuralSettings | null>(null)
  const [saving, setSaving] = React.useState(false)

  const loadError = t(
    'auth.structuralPermissions.errors.load',
    'Failed to load structural permissions.',
  )
  const saveError = t(
    'auth.structuralPermissions.errors.save',
    'Failed to save structural permissions.',
  )

  const load = React.useCallback(async () => {
    try {
      const payload = await readApiResultOrThrow<SettingsResponse>(
        '/api/auth/structural-permissions',
        undefined,
        { errorMessage: loadError, fallback: {} },
      )
      // Normalise through the grammar's own parser so the rendered state is always
      // a valid setting — the same fail-closed reader the guard uses. A malformed
      // or absent value renders the seed (never a looser level).
      const settings = normalizeStructuralSettings({
        rules: (payload?.rules as StructuralSettings['rules']) ?? DEFAULT_STRUCTURAL_SETTINGS.rules,
        defaultLevel: (payload?.defaultLevel as StructurePermissionLevel) ?? DEFAULT_STRUCTURAL_LEVEL,
      })
      setLoaded(settings)
      setDraft(settings)
    } catch (err) {
      logger.error('auth.structuralPermissions.load failed', { err })
      flash(loadError, 'error')
      setLoaded(DEFAULT_STRUCTURAL_SETTINGS)
      setDraft(DEFAULT_STRUCTURAL_SETTINGS)
    }
  }, [loadError])

  React.useEffect(() => {
    load().catch(() => {})
  }, [load, scopeVersion])

  const dirty = React.useMemo(() => {
    if (!loaded || !draft) return false
    return !structuralSettingsEqual(loaded, draft)
  }, [loaded, draft])

  const handleChange = React.useCallback(
    (edit: {
      objectKind: StructuralObjectKind
      verb: StructuralVerb
      actorType: StructuralActorType
      level: StructurePermissionLevel | null
    }) => {
      setDraft((current) => {
        if (!current) return current
        const next = withStructuralLevel(current, edit)
        return next ?? current
      })
    },
    [],
  )

  const handleSave = React.useCallback(async () => {
    if (!draft) return
    setSaving(true)
    try {
      // optimistic-lock-exempt: tenant-scoped module-config setting (a single
      // settings row via ModuleConfigService), not a versioned editable entity —
      // no updated_at to lock against and no lost-update concern.
      const call = await apiCall('/api/auth/structural-permissions', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rules: draft.rules, defaultLevel: draft.defaultLevel }),
      })
      if (!call.ok) {
        await raiseCrudError(call.response, saveError)
      }
      setLoaded(draft)
      flash(t('auth.structuralPermissions.messages.saved', 'Structural permissions saved.'), 'success')
    } catch (err) {
      logger.error('auth.structuralPermissions.save failed', { err })
      const message = err instanceof Error ? err.message : saveError
      flash(message, 'error')
    } finally {
      setSaving(false)
    }
  }, [draft, saveError, t])

  const handleReset = React.useCallback(() => {
    if (loaded) setDraft(loaded)
  }, [loaded])

  // Build the grid once per render from the shared grammar, then slice it per
  // object group. The component never re-derives inheritance. This hook must run
  // on EVERY render — before the loading early-return below — or React sees a
  // different hook count on the first (null-draft) render and the next one.
  const grid = React.useMemo(
    () => (draft ? structuralSettingsGrid(draft) : []),
    [draft],
  )

  if (!draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" />
        {t('auth.structuralPermissions.loading', 'Loading…')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="border bg-card text-card-foreground shadow-sm">
        <div className="border-b px-6 py-4 space-y-1">
          <h2 className="text-lg font-semibold">
            {t('auth.structuralPermissions.title', 'Structural permissions')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              'auth.structuralPermissions.description',
              'The level each structural change is permitted at, per object, verb and actor. A cell left on “Inherited” falls back to the default level below — the strictest — so an undeclared change is held, never auto-approved. This is the same grammar the structural guard enforces.',
            )}
          </p>
        </div>

        <div className="px-6 py-4 space-y-6">
          {STRUCTURAL_OBJECT_KINDS.map((objectKind) => (
            <ObjectKindGroup
              key={objectKind}
              objectKind={objectKind}
              cells={grid.filter((cell) => cell.objectKind === objectKind)}
              disabled={saving}
              onChange={handleChange}
              t={t}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={handleReset}
          >
            {t('auth.structuralPermissions.actions.reset', 'Discard changes')}
          </Button>
          <Button
            type="button"
            disabled={!dirty || saving}
            onClick={() => { void handleSave() }}
          >
            {saving ? <Spinner className="h-4 w-4" /> : null}
            {t('auth.structuralPermissions.actions.save', 'Save')}
          </Button>
        </div>
      </section>
    </div>
  )
}

type Translator = (key: string, fallback?: string) => string

function ObjectKindGroup({
  objectKind,
  cells,
  disabled,
  onChange,
  t,
}: {
  objectKind: StructuralObjectKind
  cells: StructuralLevelCell[]
  disabled: boolean
  onChange: (edit: {
    objectKind: StructuralObjectKind
    verb: StructuralVerb
    actorType: StructuralActorType
    level: StructurePermissionLevel | null
  }) => void
  t: Translator
}) {
  // `cells` is the slice of `structuralSettingsGrid(settings)` for this object kind,
  // and that grid always emits one cell per (object × verb × actor). So a lookup
  // MUST hit. Returning a hand-built fallback here would be dead code that invents
  // an `effective` level the grammar never produced; if the invariant is ever
  // broken, failing loudly is the honest behaviour (and it is unreachable today).
  const cellFor = (verb: StructuralVerb, actorType: StructuralActorType): StructuralLevelCell => {
    const cell = cells.find((entry) => entry.verb === verb && entry.actorType === actorType)
    if (!cell) {
      throw new Error(`structural settings grid missing cell ${objectKind}/${verb}/${actorType}`)
    }
    return cell
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold capitalize">
        {t(`auth.structuralPermissions.objectKind.${objectKind}`, objectKind)}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-1 pr-4 font-medium">
                {t('auth.structuralPermissions.column.verb', 'Verb')}
              </th>
              {STRUCTURAL_ACTOR_TYPES.map((actorType) => (
                <th key={actorType} className="py-1 pr-4 font-medium capitalize">
                  {t(`auth.structuralPermissions.actorType.${actorType}`, actorType)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STRUCTURAL_VERBS.map((verb) => (
              <tr key={verb} className="border-t">
                <td className="py-2 pr-4 font-medium capitalize">
                  {t(`auth.structuralPermissions.verb.${verb}`, verb)}
                </td>
                {STRUCTURAL_ACTOR_TYPES.map((actorType) => (
                  <td key={actorType} className="py-2 pr-4">
                    <LevelSelect
                      cell={cellFor(verb, actorType)}
                      disabled={disabled}
                      onChange={(level) => onChange({ objectKind, verb, actorType, level })}
                      t={t}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** The sentinel select value for "no explicit rule — inherit the default". */
const INHERIT_VALUE = '__inherit__'

function LevelSelect({
  cell,
  disabled,
  onChange,
  t,
}: {
  cell: StructuralLevelCell
  disabled: boolean
  onChange: (level: StructurePermissionLevel | null) => void
  t: Translator
}) {
  const value = cell.explicit ?? INHERIT_VALUE
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        onChange(next === INHERIT_VALUE ? null : (next as StructurePermissionLevel))
      }}
    >
      <SelectTrigger size="sm" aria-label={`${cell.objectKind} ${cell.verb} ${cell.actorType}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={INHERIT_VALUE}>
          {t('auth.structuralPermissions.level.inherited', 'Inherited')}
        </SelectItem>
        {STRUCTURAL_LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            {t(`auth.structuralPermissions.level.${level}`, level)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
