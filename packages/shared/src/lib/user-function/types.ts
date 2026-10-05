/**
 * The User Function artifact — a validated, reusable business operation.
 *
 * The vision's definition (Doc 3 Part VIII §39), verbatim:
 *
 * > **A validated, reusable business operation created by the user with AI
 * > assistance and executable without AI once published.**
 *
 * Three things follow from that sentence, and they are the three things this
 * module is built around:
 *
 *   1. **It is not a code function.** §39 says so explicitly; it is a *saved
 *      business capability*, presented as a button or a report.
 *   2. **The durable asset is the IR, not the SQL.** §42, and RQ-24. The
 *      compiled plan is a cache; a recompilation can always regenerate it. So the
 *      artifact keeps the **IR** and records **what it was compiled against**.
 *   3. **It runs without AI.** §47. Not "usually" — the execution path contains
 *      no model call at all, which is why this module has no AI dependency and no
 *      place to put one.
 *
 * **What this file deliberately does NOT invent.** The vision's §41 artifact
 * lists `presentation_definition` and UI metadata. Those are the **Widget**
 * contract's shape (G-07), and typing them here would pre-empt a decision that is
 * not G-03's. They are carried as **opaque** values — present, preserved, and
 * unconstrained — so G-07 can define them without a migration.
 *
 * Source: SPEC-business-model-kernel.md §6; Doc 3 Part VIII §39–§51.
 */

import type { BusinessQueryIR, BusinessCommandIR } from '../business-ir/types'
import type { CustomFieldKind } from '../../modules/entities/kinds'

/* ------------------------------------------------------------------ *
 * The operation
 * ------------------------------------------------------------------ */

/**
 * §50 and §51 name exactly two kinds of deterministic Function.
 *
 * A **query** reads; a **command** writes. The distinction is load-bearing: a
 * command carries preconditions, policy and an impact step (§46), a query does
 * not. Declaring it as a union means a caller cannot forget which one it holds.
 */
export type FunctionOperationType = 'query' | 'command'

/* ------------------------------------------------------------------ *
 * Parameters — §47's "platform resolves parameters"
 * ------------------------------------------------------------------ */

/**
 * A declared parameter.
 *
 * `kind` uses the platform's own **13 field kinds** (`kinds.ts`) rather than a
 * second vocabulary, so a parameter's type check and a field's type check cannot
 * drift apart.
 */
export type FunctionParameter = {
  name: string
  kind: CustomFieldKind
  required: boolean
  /** Used when the caller supplies nothing and the parameter is not required. */
  default?: unknown
  label?: string
  description?: string
}

export type ParameterSchema = FunctionParameter[]

/* ------------------------------------------------------------------ *
 * The artifact — §41
 * ------------------------------------------------------------------ */

/**
 * §44's lifecycle, in the vision's order.
 *
 * `PUBLISHED` and `ACTIVE` are the only runnable states. That is enforced in
 * `lifecycle.ts`, so "an unverified Function cannot run" is true **by
 * construction** rather than by a caller remembering to check.
 */
export type FunctionStatus =
  | 'draft'
  | 'generated'
  | 'validated'
  | 'verified'
  | 'published'
  | 'active'
  | 'deprecated'
  | 'archived'

/**
 * What the Function refers to, and what it needs.
 *
 * §41 lists these as separate entries because they are the **dependency set**: the
 * things whose change can invalidate the Function. Recording them is what makes
 * `fingerprint.ts` able to answer "is this still fresh?" without re-deriving the
 * answer from the IR every time.
 */
export type FunctionReferences = {
  entities: string[]
  fields: string[]
  metrics: string[]
  commands: string[]
  workflows: string[]
}

/** A recorded semantic version of something the Function depends on. */
export type DependencyVersions = Record<string, string>

export type UserFunction = {
  /** The §12.1 canonical id of the function itself. */
  id: string
  tenantId: string
  organizationId?: string | null
  name: string
  description?: string

  operationType: FunctionOperationType

  /**
   * **The durable asset** (§42, RQ-24). Exactly one of these is set, matching
   * `operationType`. The other is absent — declared absence, never an empty
   * object, so a reader can tell "this is a query" from "this is a query whose
   * command part is missing".
   */
  businessIr?: BusinessQueryIR
  businessCommandIr?: BusinessCommandIR

  parameterSchema: ParameterSchema

  references: FunctionReferences
  requiredPermissions: string[]

  /**
   * The model version this was compiled against (G-01's `contentVersion`).
   * A mismatch is how a Function is discovered to be **stale**.
   */
  businessModelVersion: string
  dependencyVersions: DependencyVersions
  compilerVersion: string

  /** §43's optional extras, when a compiled plan has been recorded. */
  compiledPlanFingerprint?: string
  executionFingerprint?: string

  /** Carried, not interpreted — G-07's shape. */
  presentation?: unknown
  /** Carried, not interpreted — the result contract's shape. */
  resultSchema?: unknown
  executionPolicy?: unknown
  confirmationPolicy?: unknown
  auditPolicy?: unknown
  ui?: unknown

  createdBy?: string
  verifiedBy?: string
  createdAt?: string
  publishedAt?: string

  /**
   * What verification could and could not establish, recorded on the artifact.
   *
   * §46 insists verification be **objective**, and objectivity includes being
   * explicit about its own limits. `notChecked` names the checks that could not be
   * run — today that is §46's *"authorization valid"*, because the data-axis
   * authorization layer is **G-04** and does not exist yet. Recording it here means
   * a person looking at a published Function can see what was never established,
   * rather than inferring that a green report means everything was proved.
   *
   * **Deliberately not part of the content fingerprint.** Verification is a claim
   * *about* the definition, not part of it, so recording a verification must not
   * change the Function's identity.
   */
  verification?: {
    notChecked: VerificationCheckName[]
  }

  version: number
  status: FunctionStatus
}

/* ------------------------------------------------------------------ *
 * Verification — §46
 * ------------------------------------------------------------------ */

/**
 * §46's checks, named.
 *
 * The vision is emphatic that verification must not be *"the user saw something
 * that looked right"*, and lists objective checks. Each becomes a named check
 * here, so a failure can say **which** one failed and why.
 */
export type VerificationCheckName =
  | 'operation_type_valid'
  | 'ir_valid'
  | 'entities_valid'
  | 'fields_valid'
  | 'relationships_valid'
  | 'parameter_schema_valid'
  | 'tenant_scope_valid'
  | 'query_plan_valid'
  | 'authorization_valid'

/**
 * **Three outcomes, because "passed" and "could not be checked" are different
 * claims.**
 *
 * `not_checked` exists for §46's *"authorization valid"*: the data-axis
 * authorization layer is **G-04**, and it does not exist yet. Reporting that as
 * `passed` would be a lie, and reporting it as `failed` would make every Function
 * unverifiable until G-04 lands. `not_checked` says exactly what is true, and
 * `VerificationReport.notChecked` names them so a reader is never left guessing.
 */
export type VerificationOutcome = 'passed' | 'failed' | 'not_checked'

export type VerificationCheck = {
  name: VerificationCheckName
  outcome: VerificationOutcome
  /** Plain language, and never empty — a check that says nothing is not a check. */
  detail: string
}

export type VerificationReport = {
  /** True when **no** check failed. `not_checked` never fails a report. */
  passed: boolean
  checks: VerificationCheck[]
  /** The checks that could not be run, named explicitly. */
  notChecked: VerificationCheckName[]
}

/* ------------------------------------------------------------------ *
 * Freshness
 * ------------------------------------------------------------------ */

/**
 * The answer to "the model moved; what now?".
 *
 * `recompiled` is the interesting one: the model changed, but the Function's IR
 * still resolves and compiles, so the compiled plan is refreshed and the Function
 * keeps working. `requires_recompilation` is G-02's own answer, passed through
 * rather than re-derived — one rule, one implementation.
 */
export type FreshnessStatus = 'fresh' | 'recompiled' | 'requires_recompilation'

export type FreshnessResult = {
  status: FreshnessStatus
  reasons: string[]
}
