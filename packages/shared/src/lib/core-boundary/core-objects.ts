/**
 * The core-object registry (SD-2 / S9) — which platform surfaces ship by default
 * and **cannot be deleted**.
 *
 * **What this is.** The platform has surfaces it needs in order to be *controlled
 * by the people who control it* — managing roles and permissions is the one the
 * owner named (`SPECIFICATIONS-DICTIONARY.md` §C.3 / `S9`). Such a surface ships
 * present by default and **no actor may delete it** — not a tenant, not a
 * superadmin, and not an AI. Without one place that says *"this object is core"*,
 * the rule is a convention a delete path can forget to apply.
 *
 * **What it deliberately is not.** It holds **no policy of its own** — it answers
 * *"is this object core?"*, never *"who may do what"*. The second question stays
 * with the existing engine (S5: one engine, never a second one). It is a registry
 * in the same shape as the permission catalogue (`lib/permissions/catalogue.ts`),
 * the capability registry (`lib/capabilities/registry.ts`) and the metadata
 * registry (`lib/kernel/metadata-registry.ts`): declared data, no decisions.
 *
 * **Why the first entry is a role matched by name.** The dictionary names the
 * *roles-and-permissions manager* as the first core function. In this codebase
 * that manager is the built-in **`superadmin` role** — created by name at setup
 * (`auth/lib/setup-app.ts:20`, `:536`, `:569`, with `isSuperAdmin: true`), per
 * tenant. Deleting it removes the ability to manage roles *in that scope*, which
 * is exactly what `S9` forbids. The `Role` entity carries no `isCore` column and
 * adding one needs a migration — unprovable on this host (the same boundary
 * `user-function/document.ts:22-28` and `COMPLETION-CALLBACKS.md` CC-23 already
 * record) — so the honest, migration-free shape is to match the platform's own
 * convention by name, which is testable today. **A migration may later add a
 * column; that is scheduled, not skipped.**
 *
 * **The list is the owner's to grow.** The dictionary: *"The rest is to be filled
 * in as the platform grows, and every addition to the list is itself a dictionary
 * change."* This module accepts new entries; the *decision* to add one is not the
 * code's.
 *
 * Source: `SPECIFICATIONS-DICTIONARY.md` §C.3 / `S9`; `CORE-BOUNDARY.md` §2, §5,
 * §3 ("core-function list additions"); `BUILD-ORDER.md` §7; `library/development/PLAN-SD-2.md`.
 */

/* ------------------------------------------------------------------ *
 * The core object
 * ------------------------------------------------------------------ */

/**
 * The kinds of object that can be core. A closed set, extended only by a
 * dictionary change — a new kind here is a new *shape* of core object, which is a
 * bigger statement than adding a name to an existing kind.
 *
 * `role` is the first, because the roles-and-permissions manager is the surface
 * the owner named. A `function` kind is deliberately **absent**: a `UserFunction`
 * has no record and no delete path yet (deferred to `G-09`), so a kind with nowhere
 * to be enforced would be a claim without a home.
 */
export const CORE_OBJECT_KINDS = ['role'] as const
export type CoreObjectKind = (typeof CORE_OBJECT_KINDS)[number]

/** One core object: what it is, and why it may not be deleted. */
export type CoreObject = {
  kind: CoreObjectKind
  /**
   * The object's identity within its kind. For a `role` this is the role **name**
   * (`'superadmin'`) — the platform's own convention, matched the way
   * `findRoleByName` matches (`{ name, tenantId }`).
   */
  id: string
  /** When it became core, so a reader can trace the decision. */
  since: string
  /** Why the system collapses without it — the dictionary's reason, in one line. */
  because: string
}

/**
 * The core objects, in one place. **The first entry is the one the owner named.**
 * Every addition is a dictionary change (see the header).
 */
const CORE_OBJECTS: readonly CoreObject[] = [
  {
    kind: 'role',
    id: 'superadmin',
    since: '2026-10-09',
    because:
      'the roles-and-permissions manager — deleting it removes the ability to manage roles in that scope (SPECIFICATIONS-DICTIONARY.md §C.3 / S9, the surface the owner named)',
  },
]

/** The list, as a fresh copy, so a caller cannot mutate the registry. */
export function coreObjects(): readonly CoreObject[] {
  return CORE_OBJECTS.map((o) => ({ ...o }))
}

/* ------------------------------------------------------------------ *
 * The questions
 * ------------------------------------------------------------------ */

/**
 * Is this object core — i.e. undeletable by anyone?
 *
 * Case-insensitive on `id`, because role names are matched case-insensitively
 * elsewhere in the platform (`superadmin` is written lowercase throughout, but a
 * stored `SuperAdmin` must not slip past the rule).
 */
export function isCoreObject(kind: CoreObjectKind, id: string): boolean {
  return coreObjectFor(kind, id) !== null
}

/** The core object, or `null` when it is not core. */
export function coreObjectFor(kind: CoreObjectKind, id: string): CoreObject | null {
  if (typeof id !== 'string') return null
  const needle = id.trim().toLowerCase()
  if (!needle) return null
  return CORE_OBJECTS.find((o) => o.kind === kind && o.id.toLowerCase() === needle) ?? null
}

/**
 * A typed refusal, returned (not thrown) so the caller decides how to surface it —
 * a shared module does not know whether it is answering an HTTP route, a CLI or a
 * test. The caller throws; this names the reason (dictionary S3: tell the user
 * why).
 *
 * Returns `null` when the object may be deleted, so the call site reads
 * `const refusal = coreObjectRefusal(...); if (refusal) throw ...`.
 */
export function coreObjectRefusal(
  kind: CoreObjectKind,
  id: string,
): { reason: string; because: string } | null {
  const core = coreObjectFor(kind, id)
  if (!core) return null
  return {
    reason: `"${core.id}" is a core ${core.kind} and cannot be deleted.`,
    because: core.because,
  }
}

/** A guard over the kind set, mirroring the catalogue's `isPermissionSurfaceKind`. */
export function isCoreObjectKind(value: unknown): value is CoreObjectKind {
  return typeof value === 'string' && (CORE_OBJECT_KINDS as readonly string[]).includes(value)
}
