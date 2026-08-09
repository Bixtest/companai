/**
 * The capability registry (R4).
 *
 * Descriptors are declared in each module's `acl.ts`, beside the feature they
 * describe — the same file, the same line of sight, so a new permission and its
 * risk semantics are added together or the guard notices.
 *
 * This indexes them for lookup at runtime. It deliberately holds no policy: it
 * answers *what kind of act is this*, never *may this actor perform it*. The
 * second question is R5's, and keeping them apart is what stops risk semantics
 * from quietly becoming a second, parallel permission system.
 */

import { getModules } from '../modules/registry'
import type { CapabilityDescriptor } from '../../modules/capabilities'
import { validateCapabilityDescriptor, type CapabilityDescriptorProblem } from '../../modules/capabilities'

/**
 * A feature declaration as it appears in a module's `acl.ts`.
 *
 * `capability` is optional so that adding descriptors can proceed module by
 * module without breaking every module that has not been described yet. The
 * coverage guard is what keeps "optional" from becoming "forgotten".
 */
export type AclFeatureDeclaration = {
  id: string
  title: string
  module: string
  /** Features this one implies, an existing convention in several modules. */
  dependsOn?: string[]
  capability?: Omit<CapabilityDescriptor, 'id' | 'module'>
}

const registry = new Map<string, CapabilityDescriptor>()

/**
 * Registers the descriptors declared by one module.
 *
 * Re-registering the same id **replaces** it, matching how module overrides work
 * everywhere else in this platform: a downstream app may need to reclassify an
 * act for its own risk posture, and must not have to fork the module to do it.
 */
export function registerCapabilityDescriptors(features: AclFeatureDeclaration[]): void {
  for (const feature of features) {
    if (!feature.capability) continue
    registry.set(feature.id, {
      ...feature.capability,
      id: feature.id,
      module: feature.module,
    })
  }
}

/**
 * Populates the registry from the registered modules, once.
 *
 * Lazily rather than at bootstrap, deliberately: the app's bootstrap file is not
 * ours to edit, and a lookup that silently returns nothing because somebody
 * forgot a registration call is exactly the kind of quiet gap this whole area is
 * meant to remove. Reading from the module registry means the descriptors are
 * available wherever the modules are.
 */
let hydratedFromModules = false

function hydrateFromModules(): void {
  if (hydratedFromModules) return
  hydratedFromModules = true

  let modules: ReturnType<typeof getModules>
  try {
    modules = getModules()
  } catch {
    // `getModules()` throws when the app has not bootstrapped — in a CLI command,
    // a worker, or a test. That is a legitimate state, not an error: asking what
    // kind of act something is should never bring down the caller. Descriptors
    // registered explicitly still resolve; there is simply nothing to discover.
    return
  }

  for (const module of modules) {
    const features = module.features as AclFeatureDeclaration[] | undefined
    if (features?.length) registerCapabilityDescriptors(features)
  }
}

export function getCapabilityDescriptor(featureId: string): CapabilityDescriptor | null {
  hydrateFromModules()
  return registry.get(featureId) ?? null
}

export function getAllCapabilityDescriptors(): CapabilityDescriptor[] {
  hydrateFromModules()
  return [...registry.values()]
}

export function clearCapabilityRegistry(): void {
  registry.clear()
  hydratedFromModules = false
}

/**
 * Validates the descriptors currently registered.
 *
 * Meant for a build-time guard rather than a runtime check: a descriptor that
 * contradicts itself is a mistake to catch before it ships, not a condition to
 * handle in a request.
 *
 * Deliberately does **not** hydrate from the module registry. A validator that
 * quietly pulls in every module's descriptors cannot be pointed at a specific
 * set, which makes it useless for testing the validation rules themselves — call
 * `getAllCapabilityDescriptors()` first when the whole platform is the subject.
 */
export function validateRegisteredCapabilities(): CapabilityDescriptorProblem[] {
  return [...registry.values()].flatMap((descriptor) => validateCapabilityDescriptor(descriptor))
}

export type CapabilityCoverage = {
  described: number
  total: number
  undescribedByModule: Record<string, string[]>
}

/**
 * How much of the permission surface has risk semantics yet.
 *
 * Reported rather than merely asserted, because the number is the point: R5
 * cannot reason about an act nobody has described, and a gap that is not counted
 * is a gap nobody closes.
 */
export function measureCapabilityCoverage(features: AclFeatureDeclaration[]): CapabilityCoverage {
  const undescribedByModule: Record<string, string[]> = {}
  let described = 0

  for (const feature of features) {
    if (feature.capability) {
      described += 1
      continue
    }
    const list = undescribedByModule[feature.module] ?? (undescribedByModule[feature.module] = [])
    list.push(feature.id)
  }

  return { described, total: features.length, undescribedByModule }
}
