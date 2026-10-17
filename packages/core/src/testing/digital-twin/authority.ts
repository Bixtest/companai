/**
 * Digital twins — `SR-38` (openrig's harness, generalised).
 *
 * WHY THIS EXISTS
 * ---------------
 * The platform study's single cheapest correctness mechanism: a fixture that is **typechecked
 * against the real interface**, so that when the real thing drifts, the fixture stops compiling.
 * A stale fake that no longer matches the interface it stands in for is the quiet failure this
 * prevents — nothing throws, the fake still runs, and the test still passes while testing a shape
 * that no longer exists. Here the drift is a **build** failure, at the one place the type system
 * already looks.
 *
 * HOW TO READ A TWIN
 * ------------------
 * Every twin is a `satisfies` against a REAL type imported from the module that owns it — never a
 * hand-copied shape:
 *
 *   - a `Record<Union, …>` twin covers a **union**: if the union gains a member the map is
 *     incomplete and `tsc` fails; if it loses one, the map has an excess key and `tsc` fails. So
 *     adding a record-lock state, or an autonomy gate, cannot be done without touching this file.
 *   - a `satisfies Interface` twin pins an **object shape**: a renamed or added field is a compile
 *     error at the fixture, not a runtime surprise at a call site.
 *
 * These twins also carry MEANING, not just shape — the ceiling a lock state imposes, what a gate
 * does — so the file is a readable statement of the authority model that the types enforce.
 *
 * WHERE IT IS TYPECHECKED
 * -----------------------
 * This file lives in `src/` (not `__tests__/`, which `packages/core/tsconfig.json` EXCLUDES), so
 * `yarn typecheck` — `turbo run typecheck` → `tsc --noEmit` in `@open-mercato/core` — compiles it.
 * `scripts/check-digital-twins.mjs` verifies that wiring: the file exists, imports the real types
 * from the real modules, carries a `satisfies` for each, and sits in a typechecked location. That
 * check guards COMPLETENESS (the twin is registered and wired); `tsc` guards CORRECTNESS (the twin
 * matches the interface). Neither alone is the mechanism; together they are.
 */
import { type AutonomyGate } from '@open-mercato/shared/modules/capabilities'
import { type RecordLockState } from '@open-mercato/shared/modules/record-locks'
import type { AuthorityScope } from '../../modules/auth/services/authorityEnforcementService'

/**
 * Twin of `RecordLockState` — and of the ceiling each state imposes on a write.
 *
 * The semantics matter as much as the shape: `open` says nothing (`null`, which is not `A5` — the
 * resolver takes a minimum, and handing it `A5` for every open record would be noise in every
 * explanation), `restricted` holds a write until a person agrees, `locked` refuses it outright.
 * `recordLockCeiling` is asserted against this map by
 * `src/modules/auth/services/__tests__/record-lock-ceiling.twin.test.ts`.
 */
export const RECORD_LOCK_CEILING_TWIN = {
  open: null,
  restricted: 'A2',
  locked: 'A0',
} satisfies Record<RecordLockState, AutonomyGate | null>

/** Twin of `AutonomyGate` — what each gate does to an act. `A0` refuses, `A5` runs. */
export const AUTONOMY_GATE_TWIN = {
  A0: 'refuse',
  A1: 'hold-for-approval',
  A2: 'hold-for-approval',
  A3: 'commit-then-run',
  A4: 'run-then-review',
  A5: 'run',
} satisfies Record<AutonomyGate, string>

/**
 * Twin of `AuthorityScope` — the two ids every authority reader is scoped by, in the two shapes a
 * caller actually uses: the anonymous/system scope and a real tenant scope.
 */
export const ANONYMOUS_SCOPE_TWIN = {
  tenantId: null,
  organizationId: null,
} satisfies AuthorityScope

export const TENANT_SCOPE_TWIN = {
  tenantId: 'tenant-1',
  organizationId: 'org-1',
} satisfies AuthorityScope
