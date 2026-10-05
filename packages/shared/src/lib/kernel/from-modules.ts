/**
 * The live wiring — the kernel reading the platform's own declarations.
 *
 * `buildModelDescriptor` takes declarations as an argument so it stays pure and
 * testable. Something has to hand it the *real* ones. That is this module: it
 * collects the declarations the platform has already registered — each module's
 * `entityExtensions`, `customFieldSets` and `customEntities` — and builds the
 * canonical model from them.
 *
 * **This is the same source the installer reads.** `install-from-ce.ts` walks
 * `getModules()` for `customFieldSets` / `customEntities`; we read the same
 * registry. That is deliberate: the kernel and the runtime store must agree,
 * because the kernel is the *view* and the store is the *state* — two readers of
 * one source, never two sources.
 *
 * **No database, no side effects.** `getModules()` is an in-memory registry, so
 * this runs anywhere the modules have been registered — including a unit test.
 *
 * Source: SPEC-business-model-kernel.md §12.3 (the model is a view over the
 * declared source).
 */

import { getModules } from '../modules/registry'
import type { EntityExtension, CustomFieldDefinition, CustomEntitySpec } from '../../modules/entities'
import { buildModelDescriptor, type KernelDeclarationInput, type ModelDescriptor } from './model'

type ModuleWithDeclarations = {
  id: string
  entityExtensions?: EntityExtension[]
  customFieldSets?: Array<{ entity: string; fields: CustomFieldDefinition[]; source?: string }>
  customEntities?: CustomEntitySpec[]
}

/**
 * Collect the declarations from every registered module.
 *
 * Pure: it reads the registry and returns plain data. Calling it twice with an
 * unchanged registry returns equal data.
 */
export function collectDeclarations(modules: readonly ModuleWithDeclarations[] = getModules()): KernelDeclarationInput {
  const customEntities: CustomEntitySpec[] = []
  const customFieldSets: KernelDeclarationInput['customFieldSets'] = []
  const extensions: EntityExtension[] = []

  for (const mod of modules) {
    for (const spec of mod.customEntities ?? []) customEntities.push(spec)
    for (const set of mod.customFieldSets ?? []) {
      customFieldSets.push({ entity: set.entity, fields: set.fields ?? [], source: set.source ?? mod.id })
    }
    for (const ext of mod.entityExtensions ?? []) extensions.push(ext)
  }

  return { customEntities, customFieldSets, extensions }
}

/**
 * Build the canonical model from the platform's registered declarations.
 *
 * This is the entry point G-02 (the compiler) and any consumer calls. It is a
 * thin wrapper over `collectDeclarations` + `buildModelDescriptor` so there is
 * exactly one path from "what the modules declare" to "the canonical model".
 */
export function buildModelFromModules(
  modules: readonly ModuleWithDeclarations[] = getModules(),
): ModelDescriptor {
  return buildModelDescriptor(collectDeclarations(modules))
}

/**
 * The model built from the registered modules, or `null` when no modules have
 * been registered yet.
 *
 * A caller at a point where registration may not have happened (a CLI, a test,
 * an early boot path) uses this instead of `buildModelFromModules`, which would
 * throw. `null` is an honest "not ready", not an empty model — the difference
 * matters, because an empty model would look like a tenant with no entities.
 */
export function tryBuildModelFromModules(
  modules?: readonly ModuleWithDeclarations[],
): ModelDescriptor | null {
  try {
    const source = modules ?? getModules()
    return buildModelFromModules(source)
  } catch {
    return null
  }
}
