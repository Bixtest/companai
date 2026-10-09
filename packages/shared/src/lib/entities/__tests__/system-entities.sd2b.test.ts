/**
 * SD-2b — the selectability gate closes the measured hole.
 *
 * **What this suite has to prove.** `DECISION-core-object-set.md` §3 measured a
 * concrete hole: a custom field could be attached to a **system table** because the
 * only block was a hardcoded **7-id** list that omitted `auth:user`, `auth:role`,
 * `directory:tenant`, `auth:session`. The owner ruled the reserved set becomes a
 * setting; this proves the seed **closes the hole** and that a superadmin override
 * is honoured — without breaking a synchronous call site.
 */

import {
  filterSelectableSystemEntityIds,
  isReservedSystemEntityType,
  isSystemEntitySelectable,
} from '../system-entities'
import { DEFAULT_CORE_SETTINGS, type CoreSettings } from '../../core-boundary/core-settings'

describe('the measured hole is closed — a custom field cannot attach to a backbone table', () => {
  it('the four measured offenders are now NOT selectable', () => {
    expect(isSystemEntitySelectable('auth:user')).toBe(false)
    expect(isSystemEntitySelectable('auth:role')).toBe(false)
    expect(isSystemEntitySelectable('directory:tenant')).toBe(false)
    expect(isSystemEntitySelectable('auth:session')).toBe(false)
  })

  it('the rest of the core set is excluded too (authz, audit, settings, substrate)', () => {
    for (const id of [
      'auth:role_acl',
      'auth:user_role',
      'auth:user_acl',
      'audit_logs:action_log',
      'audit_logs:access_log',
      'configs:module_config',
      'entities:custom_field_def',
      'query_index:search_token',
    ]) {
      expect(isSystemEntitySelectable(id)).toBe(false)
    }
  })

  it('an ordinary business entity is STILL selectable (the gate does not over-block)', () => {
    expect(isSystemEntitySelectable('customers:customer_person')).toBe(true)
    expect(isSystemEntitySelectable('catalog:catalog_product')).toBe(true)
  })

  it('the substrate ids (the original 7) are still reserved', () => {
    expect(isSystemEntitySelectable('entities:custom_entity')).toBe(false)
    expect(isSystemEntitySelectable('query_index:entity_index_row')).toBe(false)
  })

  it('an empty id is not selectable (unchanged behaviour)', () => {
    expect(isSystemEntitySelectable('')).toBe(false)
  })
})

describe('isReservedSystemEntityType agrees with the selectability gate', () => {
  it('reserved ⇔ not selectable', () => {
    expect(isReservedSystemEntityType('auth:user')).toBe(true)
    expect(isSystemEntitySelectable('auth:user')).toBe(false)
    expect(isReservedSystemEntityType('customers:customer_person')).toBe(false)
    expect(isSystemEntitySelectable('customers:customer_person')).toBe(true)
  })
})

describe('the override is honoured — a superadmin can widen or move the set (no deploy)', () => {
  it('adding a substrate id to the setting excludes a previously-selectable entity', () => {
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      reservedEntityTypes: [...DEFAULT_CORE_SETTINGS.reservedEntityTypes, 'customers:customer_person'],
    }
    expect(isSystemEntitySelectable('customers:customer_person')).toBe(true) // seed
    expect(isSystemEntitySelectable('customers:customer_person', overridden)).toBe(false) // setting
  })

  it('a superadmin could (deliberately) remove an entry — proving it is a setting, not closed', () => {
    const narrowed: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      reservedEntityTypes: DEFAULT_CORE_SETTINGS.reservedEntityTypes.filter((id) => id !== 'auth:user'),
    }
    expect(isSystemEntitySelectable('auth:user')).toBe(false) // seed protects it
    expect(isSystemEntitySelectable('auth:user', narrowed)).toBe(true) // an override can move it
  })
})

describe('filterSelectableSystemEntityIds honours the settings it is given', () => {
  it('filters with the seed by default', () => {
    const out = filterSelectableSystemEntityIds(['auth:user', 'customers:customer_person'])
    expect(out).toEqual(['customers:customer_person'])
  })

  it('filters with an override when supplied', () => {
    const overridden: CoreSettings = {
      ...DEFAULT_CORE_SETTINGS,
      reservedEntityTypes: [...DEFAULT_CORE_SETTINGS.reservedEntityTypes, 'customers:customer_person'],
    }
    const out = filterSelectableSystemEntityIds(['auth:user', 'customers:customer_person'], overridden)
    expect(out).toEqual([])
  })
})
