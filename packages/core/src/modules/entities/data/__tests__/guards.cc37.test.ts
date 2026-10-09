/**
 * CC-37 — the structural-permission **level** reaches the guard (S11, the wiring
 * Slice C left scheduled).
 *
 * **What this suite has to prove, and the trap it must not fall into.** The
 * grammar's *default* level is `approval` (fail closed). If the guard acted on the
 * resolved default, the absolute S9 refusal (`a core object cannot be restructured,
 * by anyone`) would silently become a 202 "pending review" for **every** protected
 * write that has no explicit rule — i.e. the wiring would **weaken** the very rule
 * it refines. So the guard must read `explicitStructuralLevel`: **only a level a
 * person chose** may turn the 422 into an escalation.
 *
 * The cases, in order:
 *   1. **no rule → 422 stands** (the seed must NOT escalate) — the anti-regression;
 *   2. **explicit `review` → escalate** (ok:true + escalation, nothing runs);
 *   3. **explicit `approval` → escalate**, with the higher gate;
 *   4. **explicit `never` → 422** (asserted, not weaker than the default);
 *   5. **`straight` cannot un-refuse** a protected object (S9 is absolute);
 *   6. the **actor axis** is read: a machine and a person can sit at different
 *      levels (S12) — an explicit `ai: never` keeps a machine at 422 while an
 *      explicit `human: review` escalates the same write.
 *   7. a **non-reserved** surface is untouched by the grammar.
 *   8. an **unresolved actor** is never escalated (fail closed) — added after a
 *      hostile-critic pass found the first version escalated `actorKind === undefined`.
 */

import { runMutationGuards, type MutationGuardInput } from '@open-mercato/shared/lib/crud/mutation-guard-registry'
import { guards, structuralLevelDecision } from '../guards'
import {
  DEFAULT_STRUCTURAL_SETTINGS,
  parseStructuralSettings,
  type StructuralSettings,
} from '@open-mercato/shared/lib/permissions/structural-settings'

function input(partial: Partial<MutationGuardInput>): MutationGuardInput {
  return {
    tenantId: 't1',
    organizationId: 'o1',
    userId: 'u1',
    resourceId: null,
    requestMethod: 'POST',
    requestHeaders: new Headers(),
    mutationPayload: null,
    ...partial,
  } as MutationGuardInput
}

const ctx = { userFeatures: [] as string[] }

/** A settings object with one explicit (object, verb, actor) rule. */
function withRule(
  objectKind: 'table' | 'column',
  verb: 'read' | 'add' | 'edit' | 'remove' | 'reference',
  actor: 'human' | 'ai' | 'any',
  level: 'straight' | 'review' | 'approval' | 'never',
): StructuralSettings {
  const parsed = parseStructuralSettings({
    rules: { [objectKind]: { [verb]: { [actor]: level } } },
    defaultLevel: 'approval',
  })
  if (!parsed) throw new Error('test settings should parse')
  return parsed
}

describe('structuralLevelDecision — the pure decision at its exact inputs', () => {
  it('returns null for the seed (no explicit rule) — the absolute refusal is NOT escalated', () => {
    // The anti-regression: the seed's `approval` default must not weaken S9.
    const decision = structuralLevelDecision(
      'entities.field_definition',
      'delete',
      true,
      'human',
      DEFAULT_STRUCTURAL_SETTINGS,
    )
    expect(decision).toBeNull()
  })

  it('escalates an explicit `review` on a column remove', () => {
    const settings = withRule('column', 'remove', 'human', 'review')
    const decision = structuralLevelDecision('entities.field_definition', 'delete', true, 'human', settings)
    expect(decision).not.toBeNull()
    expect(decision?.rule).toBe('structural_permission.column.remove.review')
    expect(decision?.status).toBe(202)
    expect(decision?.gate).toBe('A2')
  })

  it('escalates an explicit `approval` with the higher gate (A3)', () => {
    const settings = withRule('column', 'edit', 'human', 'approval')
    const decision = structuralLevelDecision('entities.field_definition', 'update', true, 'human', settings)
    expect(decision?.gate).toBe('A3')
  })

  it('does NOT escalate `never` (the existing 422 refusal stands)', () => {
    const settings = withRule('column', 'remove', 'human', 'never')
    expect(structuralLevelDecision('entities.field_definition', 'delete', true, 'human', settings)).toBeNull()
  })

  it('does NOT let `straight` un-refuse a protected object (S9 is absolute)', () => {
    const settings = withRule('column', 'remove', 'human', 'straight')
    expect(structuralLevelDecision('entities.field_definition', 'delete', true, 'human', settings)).toBeNull()
  })

  it('reads the actor axis (S12): an explicit ai rule governs a machine, not a person', () => {
    const aiReview = withRule('column', 'remove', 'ai', 'review')
    // A machine escalates by the `ai` rule…
    const byMachine = structuralLevelDecision('entities.field_definition', 'delete', true, 'ai_worker', aiReview)
    expect(byMachine).not.toBeNull()
    // …and a person does not (no `human` and no `any` rule → no explicit level).
    expect(structuralLevelDecision('entities.field_definition', 'delete', true, 'human', aiReview)).toBeNull()

    // The `because` names *who* — the reason must tell the truth about the actor, not
    // just carry a level. A person and a machine on the same write get different text,
    // so a regression that dropped the actor from the reason is caught here.
    const humanReview = withRule('column', 'remove', 'human', 'review')
    const byHuman = structuralLevelDecision('entities.field_definition', 'delete', true, 'human', humanReview)
    expect(byHuman).not.toBeNull()
    expect(byMachine?.because).toContain('ai_worker')
    expect(byHuman?.because).toContain('a person')
    expect(byHuman?.because).not.toContain('automated')
  })

  it('does not judge a non-reserved surface', () => {
    const settings = withRule('column', 'remove', 'human', 'review')
    expect(structuralLevelDecision('entities.field_definition', 'delete', false, 'human', settings)).toBeNull()
  })

  it('does NOT escalate an UNRESOLVED actor, even against an `any` rule (fail closed)', () => {
    // A hostile-critic pass found the earlier version escalated `actorKind === undefined`
    // (via the `any` axis) and labelled it "a person" — a false statement about who is
    // acting. `undefined` means *"we could not name who is acting"* (actorKind is
    // optional; a pre-S12 route passes none). S9 may be loosened only for a **named**
    // actor, so no name → no escalation → the absolute 422 stands.
    const anyApproval = withRule('column', 'remove', 'any', 'approval')
    expect(structuralLevelDecision('entities.field_definition', 'delete', true, undefined, anyApproval)).toBeNull()
  })

  it('a person and a machine never share the `because` label', () => {
    // The reason must name *who*, truthfully: only a `human` principal is "a person".
    const human = structuralLevelDecision(
      'entities.field_definition',
      'delete',
      true,
      'human',
      withRule('column', 'remove', 'human', 'review'),
    )
    const machine = structuralLevelDecision(
      'entities.field_definition',
      'delete',
      true,
      'ai_worker',
      withRule('column', 'remove', 'ai', 'review'),
    )
    expect(human?.because).toContain('by a person')
    expect(machine?.because).toContain('by an automated actor (ai_worker)')
    expect(machine?.because).not.toContain('by a person')
  })

  it('maps the operation to the verb (create→add, update→edit, delete→remove)', () => {
    // `add` on a column, explicitly reviewed, escalates an (unusual) create-shaped call.
    const settings = withRule('column', 'add', 'human', 'review')
    expect(structuralLevelDecision('entities.field_definition', 'create', true, 'human', settings)?.rule).toBe(
      'structural_permission.column.add.review',
    )
  })

  it('maps the resource kind to the object (field_definition→column, entity→table)', () => {
    const settings = withRule('table', 'remove', 'human', 'review')
    expect(structuralLevelDecision('entities.entity', 'delete', true, 'human', settings)?.rule).toBe(
      'structural_permission.table.remove.review',
    )
  })
})

describe('the guard end-to-end (runMutationGuards)', () => {
  it('under the seed, a protected delete still returns 422 (not escalated)', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'auth:user', key: 'nickname' },
      }),
      ctx,
    )
    expect(result.ok).toBe(false)
    expect(result.errorStatus).toBe(422)
    expect(result.escalation).toBeUndefined()
  })

  it('an ordinary object is still allowed', async () => {
    const result = await runMutationGuards(
      guards,
      input({
        resourceKind: 'entities.field_definition',
        operation: 'delete',
        mutationPayload: { entityId: 'customers:customer_person', key: 'loyalty_tier' },
      }),
      ctx,
    )
    expect(result.ok).toBe(true)
    expect(result.escalation).toBeUndefined()
  })
})
