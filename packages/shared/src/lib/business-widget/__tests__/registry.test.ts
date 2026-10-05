/**
 * The registry — §112–§114.
 *
 * Two things are being checked, and both are about **identity**:
 *
 *   - §113: a definition and its instances are different objects. One `widgetId`,
 *     many `instanceId`s. If the registry conflated them, "where is this used?"
 *     would return the Widget itself, which is not an answer.
 *   - collisions are **reported, never merged** — the rule G-01 and G-02 both
 *     follow, because a silent merge makes the registry answer a question about an
 *     object nobody wrote.
 */

import { createWidgetRegistry } from '../registry'
import type { BusinessWidget } from '../types'
import { place } from './fixtures'

/** A minimal second Widget, so the graph tests have a real edge to follow. */
function dependentWidget(overrides: Partial<BusinessWidget> = {}): BusinessWidget {
  const { widget } = place()
  return {
    ...widget,
    id: 'management_review',
    name: 'Management review',
    version: 1,
    dependencies: { ...widget.dependencies, functions: [], widgets: ['unread_conversations'] },
    ...overrides,
  }
}

describe('the registry — §112, a first-class object', () => {
  it('registers a Widget and returns its entry with every §112 field', () => {
    const registry = createWidgetRegistry()
    const { widget } = place()
    const result = registry.register(widget, { owner: 'user-1' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.entry.objectType).toBe('widget')
    expect(result.entry.objectId).toBe('unread_conversations')
    expect(result.entry.version).toBe(1)
    expect(result.entry.owner).toBe('user-1')
    expect(result.entry.status).toBe('published')
    expect(result.entry.dependencies.functions).toEqual(['unread_conversations'])
    expect(result.alreadyPresent).toBe(false)
  })

  it('is idempotent for identical content, so a registry rebuilt from its own output does not fail', () => {
    const registry = createWidgetRegistry()
    const { widget } = place()
    expect(registry.register(widget).ok).toBe(true)
    const second = registry.register(widget)
    expect(second.ok).toBe(true)
    expect(second.ok && second.alreadyPresent).toBe(true)
    expect(registry.entries()).toHaveLength(1)
  })

  it('refuses a collision and records it, rather than merging', () => {
    const registry = createWidgetRegistry()
    registry.register(place().widget)
    // Same id, same version, different content — a different Widget wearing one name.
    const clash = registry.register(place({ name: 'Something else' }).widget)

    expect(clash.ok).toBe(false)
    expect(clash.ok || clash.reason).toContain('unread_conversations@1')
    expect(registry.collisions()).toHaveLength(1)
    expect(registry.collisions()[0].widgetId).toBe('unread_conversations')
    // The first Widget was kept; the registry did not silently pick one.
    expect(registry.get('unread_conversations')?.name).toBe('Unread conversations')
  })

  it('treats reordered set-like fields as the same content, not a collision', () => {
    const registry = createWidgetRegistry()
    const { widget } = place()
    registry.register(widget)
    // The same Widget, with its dependency list written in the other order.
    const reordered = {
      ...widget,
      dependencies: { ...widget.dependencies, entities: [...widget.dependencies.entities].reverse() },
      actions: [...widget.actions].reverse(),
    }
    const second = registry.register(reordered)
    expect(second.ok).toBe(true)
    expect(second.ok && second.alreadyPresent).toBe(true)
    expect(registry.collisions()).toHaveLength(0)
  })

  it('refuses a non-canonical id', () => {
    const registry = createWidgetRegistry()
    const bad = { ...place().widget, id: 'Not A Canonical Id' }
    const result = registry.register(bad)
    expect(result.ok).toBe(false)
    expect(result.ok || result.reason).toContain('canonical')
  })

  it('keeps every version, and `get` without a version returns the newest', () => {
    const registry = createWidgetRegistry()
    const { widget } = place()
    registry.register(widget)
    registry.register({ ...widget, version: 2, name: 'Unread conversations v2' })

    expect(registry.versions('unread_conversations')).toEqual([1, 2])
    expect(registry.get('unread_conversations', 1)?.name).toBe('Unread conversations')
    expect(registry.latest('unread_conversations')?.version).toBe(2)
    expect(registry.ids()).toEqual(['unread_conversations'])
  })
})

describe('the registry — §113, definitions are not instances', () => {
  it('answers "where is this used?" with instances, not with the definition', () => {
    const registry = createWidgetRegistry()
    const { widget } = place()
    registry.register(widget)

    registry.addInstance({ widgetId: widget.id, version: 1, host: 'workspace-1' })
    registry.addInstance({ widgetId: widget.id, version: 1, host: 'workspace-2', slot: 'sidebar' })

    const used = registry.whereUsed(widget.id)
    expect(used).toHaveLength(2)
    expect(used.map((instance) => instance.host)).toEqual(['workspace-1', 'workspace-2'])
    // One canonical identity, two placements.
    expect(new Set(used.map((instance) => instance.widgetId))).toEqual(new Set([widget.id]))
    expect(new Set(used.map((instance) => instance.instanceId)).size).toBe(2)
  })

  it('is idempotent for the same placement', () => {
    const registry = createWidgetRegistry()
    registry.addInstance({ widgetId: 'w', version: 1, host: 'workspace-1' })
    registry.addInstance({ widgetId: 'w', version: 1, host: 'workspace-1' })
    expect(registry.instancesOf('w')).toHaveLength(1)
  })
})

describe('the registry — §114, the object graph', () => {
  it('answers "what does it depend on?" as edges that name their kind', () => {
    const registry = createWidgetRegistry()
    registry.register(place().widget)

    const edges = registry.dependenciesOf('unread_conversations')
    expect(edges).toContainEqual({ from: 'unread_conversations', to: 'unread_conversations', kind: 'functions' })
    expect(edges).toContainEqual({
      from: 'unread_conversations',
      to: 'external_conversation',
      kind: 'entities',
    })
    expect(edges.every((edge) => edge.from === 'unread_conversations')).toBe(true)
  })

  it('answers "which Widgets use this Widget?" from the reverse edges', () => {
    const registry = createWidgetRegistry()
    registry.register(place().widget)
    registry.register(dependentWidget())

    expect(registry.dependentsOf('unread_conversations')).toEqual(['management_review'])
    expect(registry.dependentsOf('management_review')).toEqual([])
  })

  it('returns an empty graph for an unknown Widget, rather than throwing', () => {
    const registry = createWidgetRegistry()
    expect(registry.get('nobody')).toBeUndefined()
    expect(registry.dependenciesOf('nobody')).toEqual([])
    expect(registry.whereUsed('nobody')).toEqual([])
    expect(registry.dependentsOf('nobody')).toEqual([])
  })
})
