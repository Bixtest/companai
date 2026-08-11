import type { EntityManager } from '@mikro-orm/postgresql'
import { RecordLock } from '@open-mercato/core/modules/auth/data/entities'
import {
  DEFAULT_RECORD_LOCK_STATE,
  parseRecordLockState,
  type RecordLockState,
} from '@open-mercato/shared/modules/record-locks'

export type RecordLockScope = {
  tenantId?: string | null
  organizationId?: string | null
}

export type RecordLockEntry = {
  recordId: string
  state: RecordLockState
  reason: string | null
  commandHint: string | null
  lockedByUserId: string | null
  updatedAt: Date
}

/**
 * Reads and writes the state a record is in.
 *
 * Deliberately thin. The decision of what a state *permits* is a pure function in
 * `@open-mercato/shared/modules/record-locks`, so it can be tested without a
 * database and cannot drift between the resolver and whatever renders a lock in
 * the interface.
 */
export class RecordLockService {
  constructor(private readonly em: EntityManager) {}

  /**
   * The state of one record, or `open` when nothing has been said about it.
   *
   * Tenant-scoped, and that is not optional: a lock is a statement inside one
   * tenant, and a lookup that crossed tenants would let one company's freeze
   * constrain another's work.
   */
  async stateFor(recordId: string, scope: RecordLockScope): Promise<RecordLockEntry | null> {
    if (!scope.tenantId || !recordId) return null
    const row = await this.em.findOne(RecordLock, { tenantId: scope.tenantId, recordId })
    if (!row) return null
    return this.toEntry(row)
  }

  /**
   * States for several records at once.
   *
   * Present so a list view can render locks without a query per row. The
   * alternative is the N+1 that makes people stop showing the state at all.
   */
  async statesFor(recordIds: string[], scope: RecordLockScope): Promise<Map<string, RecordLockEntry>> {
    const result = new Map<string, RecordLockEntry>()
    const ids = recordIds.filter((id) => typeof id === 'string' && id.length)
    if (!scope.tenantId || !ids.length) return result
    const rows = await this.em.find(RecordLock, { tenantId: scope.tenantId, recordId: { $in: ids } })
    for (const row of rows) result.set(row.recordId, this.toEntry(row))
    return result
  }

  /**
   * Sets a record's state, creating the row or updating it in place.
   *
   * Setting `open` **deletes** the row rather than storing "open". The table is
   * then a list of records that are constrained, which is the question anybody
   * asks of it — and a table of mostly-`open` rows would need every reader to
   * filter them out, which is one place to forget.
   */
  async setState(
    recordId: string,
    state: RecordLockState,
    scope: RecordLockScope,
    details: { reason?: string | null; commandHint?: string | null; lockedByUserId?: string | null } = {},
  ): Promise<RecordLockEntry | null> {
    if (!scope.tenantId) throw new Error('[internal] a record lock needs a tenant')
    const existing = await this.em.findOne(RecordLock, { tenantId: scope.tenantId, recordId })

    if (state === 'open') {
      if (existing) {
        this.em.remove(existing)
        await this.em.flush()
      }
      return null
    }

    if (existing) {
      existing.lockState = state
      existing.reason = details.reason ?? existing.reason ?? null
      existing.commandHint = details.commandHint ?? existing.commandHint ?? null
      existing.lockedByUserId = details.lockedByUserId ?? existing.lockedByUserId ?? null
      await this.em.flush()
      return this.toEntry(existing)
    }

    const created = this.em.create(RecordLock, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId ?? null,
      recordId,
      lockState: state,
      reason: details.reason ?? null,
      commandHint: details.commandHint ?? null,
      lockedByUserId: details.lockedByUserId ?? null,
      // Supplied explicitly rather than left to the entity defaults: `em.create`
      // types them as required, and the `onCreate` hooks fire too late for it.
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await this.em.persist(created).flush()
    return this.toEntry(created)
  }

  /** Every constrained record in the tenant. `open` rows do not exist. */
  async list(scope: RecordLockScope): Promise<RecordLockEntry[]> {
    if (!scope.tenantId) return []
    const rows = await this.em.find(
      RecordLock,
      { tenantId: scope.tenantId },
      { orderBy: { updatedAt: 'desc' } },
    )
    return rows.map((row) => this.toEntry(row))
  }

  private toEntry(row: RecordLock): RecordLockEntry {
    return {
      recordId: row.recordId,
      // Parsed rather than cast: a state this version does not recognise reads
      // back as `locked`, so an unreadable row constrains rather than opens.
      state: parseRecordLockState(row.lockState),
      reason: row.reason ?? null,
      commandHint: row.commandHint ?? null,
      lockedByUserId: row.lockedByUserId ?? null,
      updatedAt: row.updatedAt,
    }
  }
}

export { DEFAULT_RECORD_LOCK_STATE }
