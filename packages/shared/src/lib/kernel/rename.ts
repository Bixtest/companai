/**
 * Rename planning — the model's answer to "a field changed; what now?".
 *
 * The plan's test (batch 9 §6 #1) is exact: **"rename a field; the IR either
 * recompiles cleanly or says 'requires recompilation'."** This module decides
 * which, and the decision is a value, not a log line.
 *
 * **Why a plan and not a diff.** A diff says what changed. A plan says what the
 * change *means*: whether anything downstream must be rebuilt, and whether an
 * identity was destroyed. Those are different questions, and only the second
 * one is about correctness. A rename that silently destroys an id leaves every
 * reference to it dangling, and no diff of the end state shows that.
 *
 * **The rule, from spec §12.1 property 3.** A label rename is metadata — clean.
 * A key rename creates a *new* id and supersedes the old one; the old id must
 * be treated as gone, and everything that referenced it must recompile. The old
 * id is **never rewritten**, because an authority object is superseded, never
 * edited (I14).
 *
 * Source: SPEC-business-model-kernel.md §12.1; plan §2 phase 1; batch 9 §6 #1.
 */

import type { ModelDescriptor } from './model'

export type RenameStatus = 'clean' | 'requires_recompilation'

export type RenamePlan = {
  status: RenameStatus
  /** True only when `status === 'requires_recompilation'`. */
  requiresRecompilation: boolean
  /** Field ids present before and gone after. A supersede, never an edit. */
  removedFieldIds: string[]
  /** Field ids new after. */
  addedFieldIds: string[]
  /**
   * A removed field whose canonical sibling kept its position — i.e. a probable
   * *rename* rather than a genuine delete. Reported so a caller can ask the
   * author to confirm, instead of guessing.
   *
   * Empty when the change is a plain addition or removal.
   */
  likelyRenames: Array<{ from: string; to: string }>
  /** Plain-language reasons, suitable for surfacing to a person. */
  reasons: string[]
}

/**
 * Plan the effect of a change to the model's fields.
 *
 * Compares the two models' field id sets. `before` is the model as it was,
 * `after` the model as it would be.
 */
export function planFieldRename(before: ModelDescriptor, after: ModelDescriptor): RenamePlan {
  const beforeIds = collectFieldIds(before)
  const afterIds = collectFieldIds(after)

  const removedFieldIds = [...beforeIds].filter((id) => !afterIds.has(id)).sort()
  const addedFieldIds = [...afterIds].filter((id) => !beforeIds.has(id)).sort()

  const reasons: string[] = []
  const likelyRenames: Array<{ from: string; to: string }> = []

  if (removedFieldIds.length === 0 && addedFieldIds.length === 0) {
    return {
      status: 'clean',
      requiresRecompilation: false,
      removedFieldIds,
      addedFieldIds,
      likelyRenames,
      reasons: [
        'No field identity changed. A label-only change leaves every canonical id intact.',
      ],
    }
  }

  if (removedFieldIds.length === 0) {
    return {
      status: 'clean',
      requiresRecompilation: false,
      removedFieldIds,
      addedFieldIds,
      likelyRenames,
      reasons: [
        `${addedFieldIds.length} field(s) added. Existing identities are untouched, so nothing downstream needs recompiling.`,
      ],
    }
  }

  // An id disappeared. If a new id appeared on the same entity, this is a
  // probable rename and it still requires recompilation — what changes is only
  // what we can tell the author.
  const removedByEntity = groupByEntity(removedFieldIds)
  const addedByEntity = groupByEntity(addedFieldIds)
  for (const [entity, removed] of removedByEntity) {
    const added = addedByEntity.get(entity) ?? []
    const pairs = Math.min(removed.length, added.length)
    for (let i = 0; i < pairs; i++) {
      likelyRenames.push({ from: removed[i], to: added[i] })
    }
  }

  reasons.push(
    `${removedFieldIds.length} field identit${removedFieldIds.length === 1 ? 'y' : 'ies'} disappeared: ${removedFieldIds.join(', ')}.`,
  )
  if (likelyRenames.length) {
    reasons.push(
      `This looks like a rename (${likelyRenames
        .map((r) => `${r.from} -> ${r.to}`)
        .join('; ')}). A rename creates a new id and supersedes the old one; the old id is not rewritten.`,
    )
  }
  reasons.push('Everything that referenced the old id must be recompiled.')

  return {
    status: 'requires_recompilation',
    requiresRecompilation: true,
    removedFieldIds,
    addedFieldIds,
    likelyRenames,
    reasons,
  }
}

function collectFieldIds(model: ModelDescriptor): Set<string> {
  const ids = new Set<string>()
  for (const entity of Object.values(model.entities)) {
    for (const field of entity.fields ?? []) ids.add(field.id)
  }
  return ids
}

function groupByEntity(ids: readonly string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const id of ids) {
    const entity = id.split('.')[0]
    const list = grouped.get(entity) ?? []
    list.push(id)
    grouped.set(entity, list)
  }
  for (const list of grouped.values()) list.sort()
  return grouped
}
