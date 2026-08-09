import { asClass } from 'awilix'
import type { AppContainer } from '@open-mercato/shared/lib/di/container'
import { ActionLogService } from '@open-mercato/core/modules/audit_logs/services/actionLogService'
import { AccessLogService } from '@open-mercato/core/modules/audit_logs/services/accessLogService'
import { LedgerService } from '@open-mercato/core/modules/audit_logs/services/ledgerService'

export function register(container: AppContainer) {
  container.register({
    actionLogService: asClass(ActionLogService).scoped(),
  })

  // Scoped, like the journal, so it holds the request's EntityManager and its
  // append joins whatever transaction the caller has open. A singleton would
  // hold a different manager and commit outside the caller's transaction —
  // exactly the failure the ledger exists to make impossible.
  container.register({
    ledgerService: asClass(LedgerService).scoped(),
  })

  container.register({
    accessLogService: asClass(AccessLogService).scoped(),
  })
}
