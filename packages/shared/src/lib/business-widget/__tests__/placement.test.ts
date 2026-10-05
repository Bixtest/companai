/**
 * Placement — the Function → Widget arrow (§160).
 *
 * The property that matters is **direction**: every part of the Widget is derived
 * from the Function, so the two cannot drift. So the assertions below check the
 * derivation itself — that the input *is* the parameter, that the control *is* the
 * kind's control — rather than a hand-written expected Widget, which would only
 * prove that a fixture matches itself.
 */

import { placeFunction } from '../placement'
import type { PlacementResult } from '../placement'
import { place, placedFunction } from './fixtures'

function expectRefusal(result: PlacementResult): Extract<PlacementResult, { ok: false }> {
  if (result.ok) throw new Error('expected a refusal, got a Widget')
  return result
}

describe('placeFunction — the derivations', () => {
  it('derives the inputs from the Function’s parameterSchema, one for one', () => {
    const { widget, ir } = place()
    const fn = placedFunction()

    expect(ir.inputs).toHaveLength(fn.parameterSchema.length)
    expect(ir.inputs.map((input) => input.id)).toEqual(fn.parameterSchema.map((parameter) => parameter.name))
    expect(widget.inputs.map((input) => input.id)).toEqual(fn.parameterSchema.map((parameter) => parameter.name))

    const first = ir.inputs[0]
    const parameter = fn.parameterSchema[0]
    expect(first.type).toBe(parameter.kind)
    expect(first.required).toBe(parameter.required)
    expect(first.label).toBe(parameter.label)
  })

  it('chooses the control from the declared kind, never from a name', () => {
    const { ir } = place({
      parameterSchema: [
        { name: 'threshold', kind: 'currency', required: true },
        { name: 'assignee', kind: 'relation', required: false },
        { name: 'only_open', kind: 'boolean', required: false, default: true },
      ],
    })
    expect(ir.inputs.map((input) => input.control)).toEqual(['money_input', 'entity_picker', 'boolean_toggle'])
    expect(ir.inputs.map((input) => input.type)).toEqual(['currency', 'relation', 'boolean'])
  })

  it('declares each input’s source as the Function parameter (§11)', () => {
    const { widget } = place()
    for (const input of widget.inputs) {
      expect(input.source).toBe('function_parameter')
    }
  })

  it('points the source at the Function, so the Widget holds no data of its own', () => {
    const { widget, ir } = place()
    expect(ir.source).toEqual({ function: 'unread_conversations' })
    expect(widget.dependencies.functions).toEqual(['unread_conversations'])
    // Rule 2: a Widget is not an independent data silo. It carries no rows.
    expect(JSON.stringify(widget)).not.toContain('"rows"')
  })

  it('takes the Function’s version, so one number moves', () => {
    const { widget } = place({ version: 7 })
    expect(widget.version).toBe(7)
  })

  it('carries the Function’s references as its dependency set (§15)', () => {
    const { widget } = place()
    const fn = placedFunction()
    expect(widget.dependencies.entities).toEqual(fn.references.entities)
    expect(widget.dependencies.fields.sort()).toEqual([...fn.references.fields].sort())
    expect(widget.dependencies.metrics).toEqual(fn.references.metrics)
  })

  it('puts a read’s permissions in `read` and a write’s in `execute`', () => {
    expect(place({ requiredPermissions: ['conversations.read'] }).widget.permissions.read).toEqual([
      'conversations.read',
    ])

    const command = placeFunction(
      placedFunction({
        operationType: 'command',
        businessIr: undefined,
        businessCommandIr: {
          command: 'conversation.close',
          inputs: {},
          requested_by: 'user-1',
          idempotency_key: 'key-1',
        },
        requiredPermissions: ['conversations.write'],
      }),
    )
    expect(command.ok).toBe(true)
    if (!command.ok) return
    expect(command.widget.permissions.execute).toEqual(['conversations.write'])
    expect(command.widget.permissions.read).toEqual([])
  })

  it('gives a read a `data_grid` and a write a `form`', () => {
    expect(place().ir.type).toBe('data_grid')

    const command = placeFunction(
      placedFunction({
        operationType: 'command',
        businessIr: undefined,
        businessCommandIr: {
          command: 'conversation.close',
          inputs: {},
          requested_by: 'user-1',
          idempotency_key: 'key-1',
        },
      }),
    )
    expect(command.ok && command.ir.type).toBe('form')
  })

  it('carries the Function’s name and description into the presentation (G-03’s opaque field)', () => {
    const { widget } = place()
    expect(widget.presentation?.title).toBe('Unread conversations')
    expect(widget.presentation?.description).toBe(placedFunction().description)
  })

  it('is pure — the same Function places to the same Widget twice', () => {
    const first = placeFunction(placedFunction())
    const second = placeFunction(placedFunction())
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(JSON.stringify(second.widget)).toBe(JSON.stringify(first.widget))
    expect(JSON.stringify(second.ir)).toBe(JSON.stringify(first.ir))
  })

  it('lets the caller override the id, the title and the IR type', () => {
    const { widget, ir } = place({}, { widgetId: 'my_grid', title: 'My grid', irType: 'chart', layout: 'grid' })
    expect(widget.id).toBe('my_grid')
    expect(widget.name).toBe('My grid')
    expect(ir.title).toBe('My grid')
    expect(ir.type).toBe('chart')
    expect(widget.presentation?.layout).toBe('grid')
  })

  it('marks the placed Widget usable, because the Function it places already is', () => {
    const { widget } = place()
    expect(widget.status).toBe('published')
    expect(widget.tenantId).toBe('tenant-1')
    expect(widget.ai.required).toBe(false)
    expect(widget.rendering.renderer).toBe('semantic')
  })
})

describe('placeFunction — the refusals', () => {
  const notRunnable = ['draft', 'validated', 'deprecated', 'archived'] as const

  it.each(notRunnable)('refuses to place a "%s" Function', (status) => {
    const result = expectRefusal(placeFunction(placedFunction({ status })))
    expect(result.code).toBe('NOT_RUNNABLE')
    expect(result.reason).toContain(status)
  })

  it('uses G-03’s own gate, not a second opinion', () => {
    // The two runnable states are exactly the two `isRunnable` accepts.
    for (const status of ['published', 'active'] as const) {
      expect([status, placeFunction(placedFunction({ status })).ok]).toEqual([status, true])
    }
  })
})
