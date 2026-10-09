/**
 * The **Widget registry** — the vision's §112–§114.
 *
 * §112 says a Widget is a first-class registry object, not a file on a screen. The
 * registry is what makes that true, and §114 says what it must be able to answer:
 *
 * > Where is this Widget used? What does it depend on? Which Functions use this
 * > Widget? Which Workspaces contain it? Which conversations reference it? Which
 * > users have access?
 *
 * **Two identities, and keeping them apart is the point (§113).** A Widget placed
 * in five workspaces has **one** `widgetId` and **five** instances. Rule 7 is
 * explicit — *"Widget definitions are distinct from widget instances"* — so this
 * registry stores definitions and instances separately, and `whereUsed` answers
 * about instances while `get` answers about the definition.
 *
 * **Collisions are reported, never merged.** Registering two different Widgets
 * under one id and version is refused, and the collision is recorded. The same
 * rule G-01 and G-02 both follow, for the same reason: a silent merge would make
 * the registry answer a question about an object nobody wrote.
 *
 * **Why it is a value and not a database table.** The same reason as G-03's
 * Function: the registry's shape is driven by **G-09**, which will query it, so a
 * schema written today would likely be rewritten — a **design/timing** decision,
 * **not** a proof boundary (`CORRECTED (rule 13)`: an earlier note called a
 * migration *"unprovable"* — **false and retracted**; `mercato-postgres-local` is
 * a live Postgres 17 where row DDL is written and read back). **Trigger for the
 * row: G-09.** Until then the registry is a value — built, tested, serialisable,
 * and re-derivable from stored Widget documents.
 *
 * Source: Doc 5 §106–§114, Part LXXIII rules 7, 26, 29; COOKBOOK Sprint G-07 step 3.4.
 */

import { isCanonicalId } from '../kernel/canonical-id'
import { canonicaliseWidget, stableStringify } from './document'
import type {
  BusinessWidget,
  WidgetCollision,
  WidgetDependencies,
  WidgetDependencyEdge,
  WidgetInstance,
  WidgetRegistryEntry,
} from './types'

export type RegisterOptions = {
  owner?: string
  scope?: string
}

export type RegisterResult =
  | {
      ok: true
      entry: WidgetRegistryEntry
      /**
       * `true` when this exact Widget was already registered. Registering the same
       * content twice is **idempotent**, not an error — a registry rebuilt from
       * documents must not fail on its own output.
       */
      alreadyPresent: boolean
    }
  | { ok: false; reason: string }

/** The instance fields a caller supplies; the id is derived unless given. */
export type NewWidgetInstance = {
  instanceId?: string
  widgetId: string
  version: number
  host?: string
  slot?: string
}

export type WidgetRegistry = {
  /** Register a definition. Refuses a collision; idempotent for identical content. */
  register(widget: BusinessWidget, options?: RegisterOptions): RegisterResult
  /** The definition, at a version (defaults to the newest). */
  get(widgetId: string, version?: number): BusinessWidget | undefined
  /** The newest version of a definition. */
  latest(widgetId: string): BusinessWidget | undefined
  /** Every registered version of a definition, ascending. */
  versions(widgetId: string): number[]
  /** Every registered widget id. */
  ids(): string[]
  /** Every entry, as §112 describes one. */
  entries(): WidgetRegistryEntry[]
  /** Record a placement. Idempotent for an identical instance. */
  addInstance(instance: NewWidgetInstance): WidgetInstance
  /** Every placement of a definition. */
  instancesOf(widgetId: string): WidgetInstance[]
  /** §114's *"where is this Widget used?"* — the instances. */
  whereUsed(widgetId: string): WidgetInstance[]
  /** §114's *"what does it depend on?"* — the definition's edges. */
  dependenciesOf(widgetId: string, version?: number): WidgetDependencyEdge[]
  /** §114's *"which Widgets use this Widget?"* — the reverse edges. */
  dependentsOf(widgetId: string): string[]
  /** Every identity claimed twice with different content. */
  collisions(): WidgetCollision[]
}

const DEPENDENCY_KINDS: readonly (keyof WidgetDependencies)[] = [
  'capabilities',
  'entities',
  'fields',
  'relationships',
  'metrics',
  'functions',
  'commands',
  'workflows',
  'policies',
  'knowledge',
  'skills',
  'widgets',
]

/**
 * The registry's notion of "the same content" — the Widget canonicalised, then
 * serialised stably. Deliberately the same pair the document uses.
 */
function contentOf(widget: BusinessWidget): string {
  return stableStringify(canonicaliseWidget(widget))
}

export function createWidgetRegistry(): WidgetRegistry {
  /** Keyed by `id@version`. Insertion order is preserved for deterministic output. */
  const definitions = new Map<string, BusinessWidget>()
  const instances: WidgetInstance[] = []
  const collisions: WidgetCollision[] = []

  const keyOf = (widgetId: string, version: number): string => `${widgetId}@${version}`

  function register(widget: BusinessWidget, options: RegisterOptions = {}): RegisterResult {
    if (!widget || typeof widget !== 'object') {
      return { ok: false, reason: 'register: a widget is required.' }
    }
    if (!isCanonicalId(widget.id)) {
      return {
        ok: false,
        reason: `register: the widget id ${JSON.stringify(widget.id)} is not a canonical id.`,
      }
    }
    if (typeof widget.version !== 'number' || !Number.isFinite(widget.version)) {
      return { ok: false, reason: `register: the widget version must be a number, got ${JSON.stringify(widget.version)}.` }
    }

    const key = keyOf(widget.id, widget.version)
    const existing = definitions.get(key)

    if (existing) {
      // Same identity. Identical content is idempotent; different content is a
      // collision — refused, and recorded, never merged.
      //
      // The comparison is on **canonicalised** content, the same notion the
      // document uses, so a Widget whose dependencies were merely listed in a
      // different order is the same Widget — not a collision. Two different
      // notions of "the same content" would be two answers to one question.
      if (contentOf(existing) === contentOf(widget)) {
        return { ok: true, entry: entryOf(existing, options), alreadyPresent: true }
      }
      collisions.push({
        widgetId: widget.id,
        version: widget.version,
        reason: `Two different Widgets claim the identity "${key}". The first was kept; the second was refused.`,
      })
      return {
        ok: false,
        reason: `register: "${key}" is already registered with different content. A registry reports collisions rather than merging them, because a merge would answer a question about an object nobody wrote.`,
      }
    }

    definitions.set(key, widget)
    return { ok: true, entry: entryOf(widget, options), alreadyPresent: false }
  }

  function entryOf(widget: BusinessWidget, options: RegisterOptions): WidgetRegistryEntry {
    return {
      objectType: 'widget',
      objectId: widget.id,
      version: widget.version,
      ...(options.owner ?? widget.owner ? { owner: options.owner ?? widget.owner } : {}),
      ...(options.scope ?? widget.scope ? { scope: options.scope ?? widget.scope } : {}),
      status: widget.status,
      dependencies: widget.dependencies,
      permissions: widget.permissions,
    }
  }

  function versions(widgetId: string): number[] {
    const found: number[] = []
    for (const widget of definitions.values()) {
      if (widget.id === widgetId) found.push(widget.version)
    }
    return found.sort((a, b) => a - b)
  }

  function get(widgetId: string, version?: number): BusinessWidget | undefined {
    if (version !== undefined) return definitions.get(keyOf(widgetId, version))
    return latest(widgetId)
  }

  function latest(widgetId: string): BusinessWidget | undefined {
    const all = versions(widgetId)
    if (all.length === 0) return undefined
    return definitions.get(keyOf(widgetId, all[all.length - 1]))
  }

  function ids(): string[] {
    const seen = new Set<string>()
    for (const widget of definitions.values()) seen.add(widget.id)
    return [...seen]
  }

  function entries(): WidgetRegistryEntry[] {
    return [...definitions.values()].map((widget) => entryOf(widget, {}))
  }

  function addInstance(instance: NewWidgetInstance): WidgetInstance {
    const instanceId =
      instance.instanceId ??
      `${instance.widgetId}@${instance.version}:${instance.host ?? 'unplaced'}${instance.slot ? `/${instance.slot}` : ''}`
    const existing = instances.find((entry) => entry.instanceId === instanceId)
    if (existing) return existing
    const created: WidgetInstance = {
      instanceId,
      widgetId: instance.widgetId,
      version: instance.version,
      ...(instance.host ? { host: instance.host } : {}),
      ...(instance.slot ? { slot: instance.slot } : {}),
    }
    instances.push(created)
    return created
  }

  function instancesOf(widgetId: string): WidgetInstance[] {
    return instances.filter((instance) => instance.widgetId === widgetId)
  }

  function dependenciesOf(widgetId: string, version?: number): WidgetDependencyEdge[] {
    const widget = get(widgetId, version)
    if (!widget) return []
    const edges: WidgetDependencyEdge[] = []
    for (const kind of DEPENDENCY_KINDS) {
      for (const id of widget.dependencies?.[kind] ?? []) {
        edges.push({ from: widget.id, to: id, kind })
      }
    }
    return edges
  }

  function dependentsOf(widgetId: string): string[] {
    const dependents = new Set<string>()
    for (const widget of definitions.values()) {
      if (widget.id === widgetId) continue
      if ((widget.dependencies?.widgets ?? []).includes(widgetId)) dependents.add(widget.id)
    }
    return [...dependents].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  }

  return {
    register,
    get,
    latest,
    versions,
    ids,
    entries,
    addInstance,
    instancesOf,
    whereUsed: instancesOf,
    dependenciesOf,
    dependentsOf,
    collisions: () => [...collisions],
  }
}
