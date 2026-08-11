/**
 * Authority lent for a while, and taken back.
 *
 * The platform had none of this. Role and user ACLs are both permanent until
 * somebody edits them, so covering a colleague's approvals for a fortnight meant
 * granting a role and hoping to remember to remove it. What actually happens is
 * that nobody remembers, and the grant becomes permanent by neglect.
 *
 * A delegation is the same grant with an end date attached and a reason recorded,
 * which turns "we gave Sam approval rights at some point" into "Priya delegated
 * approval to Sam from the 3rd to the 17th while she was away, and here is why".
 *
 * **Both ends are principals, not users** — the entire point of R1 arriving
 * first. An AI worker can hold a delegation, and a delegation can be granted by
 * one, which is unrepresentable if the columns say `user_id`.
 */
import type { AutonomyGate } from './capabilities'

/**
 * What a stored delegation looks like once loaded.
 *
 * Deliberately a plain shape rather than an entity: every rule below is a pure
 * function over it, so the rules can be tested without a database and cannot
 * drift between the grant path and the resolver, which both consult them.
 */
export type DelegationRecord = {
  id: string
  granteePrincipalId: string
  grantorPrincipalId: string
  capabilityId: string
  /** `null` means the whole tenant rather than one organization. */
  organizationId: string | null
  startsAt: Date
  expiresAt: Date
  revokedAt: Date | null
  /** A cap the grantor chose, at or below what they hold themselves. */
  authorityCeiling: AutonomyGate | null
  reason: string
}

export type DelegationQuery = {
  capabilityId: string
  organizationId?: string | null
  now?: Date
}

/**
 * Whether this delegation is in force right now.
 *
 * Four filters, and the order they are written in is the order of how badly
 * getting one wrong would end:
 *
 * 1. **Revoked.** An explicit "stop" beats every other consideration, including
 *    a window that has not closed yet.
 * 2. **Started.** A delegation dated for next month is not authority today.
 * 3. **Not expired.** The whole point.
 * 4. **In scope.** A delegation for one organization is not authority in another.
 */
export function isDelegationActive(record: DelegationRecord, query: DelegationQuery): boolean {
  if (record.capabilityId !== query.capabilityId) return false
  if (record.revokedAt) return false

  const now = query.now ?? new Date()
  if (record.startsAt.getTime() > now.getTime()) return false
  // Exclusive: a delegation "until the 17th" has stopped granting at the instant
  // its expiry is reached, not a moment after.
  if (record.expiresAt.getTime() <= now.getTime()) return false

  // A tenant-wide delegation (`null`) covers every organization. One scoped to an
  // organization covers only that one — never the other way round, or a
  // delegation for a subsidiary would quietly become authority at the parent.
  if (record.organizationId !== null && record.organizationId !== (query.organizationId ?? null)) return false

  return true
}

/**
 * The delegation to act under, when more than one applies.
 *
 * **The latest expiry wins**, which is the rule Platform 1 uses and worth keeping
 * for a reason it does not state: the alternatives are worse. Picking the newest
 * *created* would let a hastily-added short delegation silently shorten a
 * carefully-agreed long one, and picking the most permissive would make the
 * answer depend on a ceiling rather than on the grant.
 *
 * Note this chooses the delegation, not the ceiling. A longer delegation with a
 * tighter cap still wins, and the tighter cap is what applies — because every
 * ceiling in this system narrows and none of them negotiate.
 */
export function selectActiveDelegation(
  records: DelegationRecord[],
  query: DelegationQuery,
): DelegationRecord | null {
  let chosen: DelegationRecord | null = null
  for (const record of records) {
    if (!isDelegationActive(record, query)) continue
    if (!chosen || record.expiresAt.getTime() > chosen.expiresAt.getTime()) chosen = record
  }
  return chosen
}

/**
 * Why an act was permitted, for the explanation the resolver returns.
 *
 * A delegated act that reads like an ordinary one is how "who allowed this?"
 * becomes unanswerable three months later (invariant **I6**).
 */
export function delegationReason(record: DelegationRecord): string {
  const until = record.expiresAt.toISOString().slice(0, 10)
  return `acting under a delegation from ${record.grantorPrincipalId} until ${until} (${record.reason})`
}

/** Hard bounds on how long authority may be lent for. */
export const MAX_DELEGATION_DAYS = 90

/**
 * Why there is a maximum at all.
 *
 * A delegation with no practical end is a role grant wearing a costume, and the
 * failure this feature exists to prevent is exactly the grant nobody revisits.
 * Ninety days is long enough for parental leave and short enough that somebody
 * has to look at it again within a quarter.
 *
 * It can be re-granted. That is the point: re-granting is a decision somebody
 * makes, and letting one run for a year is a decision nobody makes.
 */
export function delegationWindowProblem(startsAt: Date, expiresAt: Date): string | null {
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) return 'starts_at is not a date'
  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.getTime())) return 'expires_at is not a date'
  if (expiresAt.getTime() <= startsAt.getTime()) return 'a delegation must expire after it starts'
  const days = (expiresAt.getTime() - startsAt.getTime()) / 86_400_000
  if (days > MAX_DELEGATION_DAYS) return `a delegation may not run longer than ${MAX_DELEGATION_DAYS} days`
  return null
}
