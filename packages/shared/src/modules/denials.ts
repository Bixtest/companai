/**
 * A permission taken away from one person, without touching anybody else.
 *
 * The platform had no way to do this. Permissions arrive through roles, so the
 * only way to stop one person doing one thing was to remove their whole role —
 * which takes away nine other things they still need — or to build them a
 * bespoke role, which is how an organisation ends up with forty roles and no
 * idea what any of them mean.
 *
 * A denial is the missing subtraction. It names a person, a permission, and a
 * reason, and it removes exactly that much.
 *
 * **This can only ever narrow.** There is no field here that grants anything,
 * and the call site consults denials *after* the ordinary permission check has
 * already said yes. That ordering is not an optimisation, it is the guarantee:
 * a denial cannot make somebody able to do something, only unable, so adding
 * one to a working system can break a workflow but can never open a hole.
 *
 * **It applies to superadmins too**, and that is deliberate. A control the most
 * powerful account ignores is not a control, it is a suggestion. The recovery
 * path when somebody withholds something they needed — possibly from the only
 * account that could give it back — is `mercato auth denials --tenant <id>
 * --lift <denial-id>`, which is out of band by design: recovering from a lockout
 * should require reaching the server, not merely persistence in a browser.
 */

/**
 * What a stored denial looks like once loaded.
 *
 * A plain shape rather than an entity, for the same reason as delegations: every
 * rule below is a pure function over it, so the rules are testable without a
 * database and cannot drift between the screen that writes one and the check
 * that enforces it.
 */
export type DenialRecord = {
  id: string
  /** Who loses the permission. A principal, not a user — an AI worker can be denied. */
  subjectPrincipalId: string
  /**
   * The permission being taken away. Wildcards are allowed and mean what they
   * mean everywhere else: `catalog.*` denies every capability in the module.
   */
  featurePattern: string
  /** `null` means the whole tenant rather than one organization. */
  organizationId: string | null
  startsAt: Date
  /**
   * `null` is a permanent denial.
   *
   * Unlike a delegation — where an unbounded grant is a role grant wearing a
   * costume and so forbidden — an unbounded *subtraction* is a legitimate
   * standing decision. "This person does not approve payments" is not a state
   * that should silently expire in ninety days.
   */
  expiresAt: Date | null
  /** Set when somebody deliberately ends the denial early. */
  liftedAt: Date | null
  reason: string
}

export type DenialQuery = {
  organizationId?: string | null
  now?: Date
}

/**
 * Whether this denial is in force right now.
 *
 * The order of the checks is the order of how badly getting one wrong would end,
 * and it is the mirror image of `isDelegationActive` on purpose — the two are
 * read side by side and a difference between them should mean something.
 */
export function isDenialActive(record: DenialRecord, query: DenialQuery = {}): boolean {
  if (record.liftedAt) return false

  const now = query.now ?? new Date()
  if (record.startsAt.getTime() > now.getTime()) return false
  // Exclusive, like delegations: a denial "until the 17th" has stopped applying
  // at the instant its expiry is reached.
  if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) return false

  // A tenant-wide denial (`null`) covers every organization. One scoped to an
  // organization covers only that one — never the other way round, or a denial
  // written for a subsidiary would quietly bite at the parent.
  if (record.organizationId !== null && record.organizationId !== (query.organizationId ?? null)) return false

  return true
}

/**
 * Whether a denial's pattern covers a required feature.
 *
 * **Deliberately not `matchFeature` with the arguments swapped.** That helper
 * asks "does this *grant* satisfy this requirement", and its `*` handling is
 * tuned for grants. Here the question is the opposite one and the safe direction
 * is the opposite too: when in doubt a grant should not match, and a denial
 * should. Keeping the two separate means a future change to grant matching
 * cannot silently widen or narrow what a denial reaches.
 */
export function denialCoversFeature(pattern: string, feature: string): boolean {
  if (pattern === '*') return true
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2)
    return feature === prefix || feature.startsWith(prefix + '.')
  }
  return pattern === feature
}

/**
 * The first denial that stops this act, or `null` if none does.
 *
 * **Any one required feature being denied stops the whole act.** A route that
 * declares `requireFeatures: ['sales.view', 'sales.refund']` needs both, so
 * removing either one removes the act. Returning the denial rather than a
 * boolean is what lets the refusal carry its reason (invariant **I6**) — a 403
 * whose cause lives only inside a function is the thing this platform exists to
 * abolish.
 */
export function findBlockingDenial(
  records: readonly DenialRecord[],
  required: readonly string[],
  query: DenialQuery = {},
): { feature: string; denial: DenialRecord } | null {
  if (!records.length || !required.length) return null

  for (const feature of required) {
    for (const record of records) {
      if (!denialCoversFeature(record.featurePattern, feature)) continue
      if (!isDenialActive(record, query)) continue
      return { feature, denial: record }
    }
  }
  return null
}

/** Why an act was refused, in words somebody can act on. */
export function denialReason(record: DenialRecord, feature: string): string {
  const until = record.expiresAt ? ` until ${record.expiresAt.toISOString().slice(0, 10)}` : ''
  return `${feature} is withheld from this account${until} (${record.reason})`
}

/**
 * What makes a proposed denial unwritable.
 *
 * `null` means it is fine. The reason check is the one that matters: a denial
 * with no reason is a permission that vanished, and six months later nobody can
 * tell whether lifting it is safe. That is not paperwork — it is the difference
 * between a control and a mystery.
 */
export function denialProblem(input: {
  featurePattern: string
  reason: string
  startsAt: Date
  expiresAt: Date | null
}): string | null {
  const pattern = input.featurePattern?.trim() ?? ''
  if (!pattern) return 'a denial must name a permission'
  if (/\s/.test(pattern)) return 'a permission id contains no spaces'
  if (pattern.includes('*') && !pattern.endsWith('*')) return 'a wildcard may only appear at the end'

  if (!input.reason || !input.reason.trim()) return 'a denial must record why'

  if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) return 'starts_at is not a date'
  if (input.expiresAt !== null) {
    if (!(input.expiresAt instanceof Date) || Number.isNaN(input.expiresAt.getTime())) return 'expires_at is not a date'
    if (input.expiresAt.getTime() <= input.startsAt.getTime()) return 'a denial must expire after it starts'
  }
  return null
}
