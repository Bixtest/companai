import { SKIPPED_ACTION_LOG_RESOURCE_KINDS } from '../action-log-skip-list'

/**
 * The skip list is shared by both audit write paths — the command bus and the
 * CRUD factory's direct-write branch (R2a). It used to be a private constant in
 * `command-bus.ts`, back when that was the only path that wrote audit entries.
 *
 * These tests exist because the failure mode of a drifted copy is quiet: the
 * audit log fills with records of itself and nobody notices until it is
 * unreadable.
 */
describe('action-log skip list', () => {
  it('excludes the audit log itself, so auditing cannot recurse', () => {
    expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.has('audit_logs.access')).toBe(true)
    expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.has('audit_logs.action')).toBe(true)
  })

  it('excludes per-user dashboard view state, which is not a business fact', () => {
    expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.has('dashboards.layout')).toBe(true)
    expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.has('dashboards.user_widgets')).toBe(true)
    expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.has('dashboards.role_widgets')).toBe(true)
  })

  it('does not exclude the resource kinds R2a exists to start recording', () => {
    // These are the modules that write through the CRUD factory's direct path
    // and were unaudited entirely before R2a. If any ends up on the skip list,
    // the coverage fix silently does nothing for it.
    for (const kind of [
      'api_keys.api_key',
      'entities.custom_entity',
      'business_rules.rule',
      'workflows.definition',
      'configs.module_config',
      'integrations.integration',
      'attachments.attachment',
    ]) {
      expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.has(kind)).toBe(false)
    }
  })

  it('is a small, deliberate list rather than a growing exclusion dump', () => {
    // A guard against the easy fix for noisy audit logs: adding kinds here.
    // Growing this list is how audit coverage silently erodes, so a change
    // should have to justify itself by failing this test first.
    expect(SKIPPED_ACTION_LOG_RESOURCE_KINDS.size).toBe(5)
  })
})
