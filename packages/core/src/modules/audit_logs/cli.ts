import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { parseBooleanToken } from '@open-mercato/shared/lib/boolean'
import { ActionLogService } from '@open-mercato/core/modules/audit_logs/services/actionLogService'
import { LedgerService } from '@open-mercato/core/modules/audit_logs/services/ledgerService'

function parseArgs(rest: string[]) {
  const args: Record<string, string | boolean> = {}

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    if (!arg || !arg.startsWith('--')) continue

    const [key, inlineValue] = arg.replace(/^--/, '').split('=')
    if (inlineValue !== undefined) {
      args[key] = inlineValue
      continue
    }

    const next = rest[index + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      index += 1
      continue
    }

    args[key] = true
  }

  return args
}

function parsePositiveInt(value: string | boolean | undefined, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const projectionsBackfill: ModuleCli = {
  command: 'projections:backfill',
  async run(rest) {
    const args = parseArgs(rest)
    const tenantId = typeof args.tenantId === 'string' ? args.tenantId : typeof args.tenant === 'string' ? args.tenant : null
    const organizationId = typeof args.organizationId === 'string'
      ? args.organizationId
      : typeof args.orgId === 'string'
        ? args.orgId
        : typeof args.org === 'string'
          ? args.org
          : null
    const batchSize = parsePositiveInt(args.batchSize ?? args.batch, 250)
    const force = parseBooleanToken(
      typeof args.force === 'boolean' ? 'true' : typeof args.force === 'string' ? args.force : null,
    ) === true

    const container = await createRequestContainer()
    const actionLogService = container.resolve('actionLogService') as ActionLogService

    console.log(
      `[backfill] Starting audit log projection backfill (tenant=${tenantId ?? 'all'}, org=${organizationId ?? 'all'}, batch=${batchSize}, force=${force})`,
    )

    const result = await actionLogService.backfillProjections({
      batchSize,
      force,
      logger: (message) => console.log(message),
      organizationId,
      tenantId,
    })

    console.log('[backfill] Complete.')
    console.log(`  Scanned: ${result.scanned}`)
    console.log(`  Updated: ${result.updated}`)
    console.log(`  Skipped: ${result.skipped}`)
    console.log(`  Errors: ${result.errors}`)
  },
}

/**
 * Verifies the hash chain (R3).
 *
 * A chain nobody checks proves nothing — it only creates the impression of proof.
 * This is the command that turns the guarantee into an observation, and it is
 * meant to be run on a schedule and after any database restore.
 *
 * Exits non-zero on a broken chain so a scheduler or CI job fails loudly rather
 * than printing a warning into a log nobody reads.
 */
const ledgerVerify: ModuleCli = {
  command: 'ledger:verify',
  async run(rest) {
    const args = parseArgs(rest)
    const tenantId = typeof args.tenantId === 'string'
      ? args.tenantId
      : typeof args.tenant === 'string'
        ? args.tenant
        : null
    const batchSize = parsePositiveInt(args.batchSize ?? args.batch, 500)

    const container = await createRequestContainer()
    const ledgerService = container.resolve('ledgerService') as LedgerService

    const tenants = tenantId ? [tenantId] : await ledgerService.listTenantsWithEvents()

    if (tenants.length === 0) {
      console.log('[ledger] No chains to verify — nothing has been recorded yet.')
      return
    }

    let broken = 0
    let totalChecked = 0

    for (const tenant of tenants) {
      const result = await ledgerService.verifyTenantChain(tenant, { batchSize })
      totalChecked += result.checked

      if (result.ok) {
        console.log(`[ledger] ${tenant}: OK — ${result.checked} event(s) verified.`)
        continue
      }

      broken += 1
      console.error(`[ledger] ${tenant}: BROKEN at seq ${result.brokenAtSeq}`)
      console.error(`         ${result.reason}`)
      console.error('         Everything before that position still verifies; everything after is unproven.')
    }

    console.log(`[ledger] ${tenants.length} chain(s), ${totalChecked} event(s) verified, ${broken} broken.`)

    if (broken > 0) {
      // A broken chain is not a warning. Either history was rewritten, or a
      // restore replayed a partial backup — both need a person, now.
      process.exitCode = 1
    }
  },
}

export default [projectionsBackfill, ledgerVerify]
