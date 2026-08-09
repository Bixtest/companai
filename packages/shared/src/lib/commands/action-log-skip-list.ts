/**
 * Resource kinds that must never produce an action-log entry.
 *
 * Two of these would be self-referential — auditing the audit log records the
 * act of reading or writing audit records, which grows without bound. The
 * dashboard-layout kinds are per-user view state, not business facts; recording
 * every widget drag would bury real activity in noise.
 *
 * **One list, both write paths.** The command bus consulted this before R2a,
 * when it was the only path that wrote audit entries. The CRUD factory's
 * direct-write path now writes them too, and must skip exactly the same kinds —
 * a second copy would drift, and the drift would show up as an audit log that
 * quietly fills with its own reads.
 */
export const SKIPPED_ACTION_LOG_RESOURCE_KINDS: ReadonlySet<string> = new Set<string>([
  'audit_logs.access',
  'audit_logs.action',
  'dashboards.layout',
  'dashboards.user_widgets',
  'dashboards.role_widgets',
])
