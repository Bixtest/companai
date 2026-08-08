import type { ModuleCli } from '@open-mercato/shared/modules/registry'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { getRedisUrl, getRedisUrlOrThrow } from '@open-mercato/shared/lib/redis/connection'
import type { EntityManager } from '@mikro-orm/postgresql'
import { WorkflowDefinition } from './data/entities'
import { BusinessRule, type RuleType } from '@open-mercato/core/modules/business_rules/data/entities'
import {
  invalidateBusinessRuleDiscoveryCache,
  resolveBusinessRuleDiscoveryCache,
} from '@open-mercato/core/modules/business_rules/lib/rule-engine'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]) {
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^-+/, '')  // Remove one or more dashes
    const value = args[i + 1]
    if (key && value) {
      result[key] = value
    }
  }
  return result
}

/**
 * Seed demo checkout workflow
 *
 * The 'workflows.checkout-demo' workflow is now code-defined
 * (see packages/core/src/modules/workflows/workflows.ts) and available
 * to every tenant without DB seeding. This command remains as a thin
 * wrapper that informs operators of the new location.
 */
const seedDemo: ModuleCli = {
  command: 'seed-demo',
  async run() {
    console.log('ℹ️  The "workflows.checkout-demo" workflow is now code-defined.')
    console.log('   No seeding required — it is auto-registered by the workflows module')
    console.log('   (see packages/core/src/modules/workflows/workflows.ts).')
    console.log('')
    console.log('   Visit /backend/definitions to view it as a Code-defined workflow.')
  },
}

/**
 * Seed demo checkout workflow guard rules
 *
 * The 'workflows.checkout-demo' workflow is code-defined; only the
 * guard rules still need DB seeding.
 */
const seedDemoWithRules: ModuleCli = {
  command: 'seed-demo-with-rules',
  async run(rest: string[]) {
    const args = parseArgs(rest)
    const tenantId = String(args.tenantId ?? args.tenant ?? args.t ?? '')
    const organizationId = String(args.organizationId ?? args.orgId ?? args.org ?? args.o ?? '')

    if (!tenantId || !organizationId) {
      console.error('Usage: mercato workflows seed-demo-with-rules --tenant <tenantId> --org <organizationId>')
      console.error('   or: mercato workflows seed-demo-with-rules -t <tenantId> -o <organizationId>')
      return
    }

    console.log('🧩 Seeding checkout-demo guard rules (workflow itself is code-defined)...\n')

    try {
      const { resolve } = await createRequestContainer()
      const em = resolve<EntityManager>('em')
      const cache = resolveBusinessRuleDiscoveryCache(resolve)

      // Import BusinessRule entity
      const { BusinessRule } = await import('../business_rules/data/entities')

      // Read guard rules
      const rulesPath = path.join(__dirname, 'examples', 'guard-rules-example.json')
      const rulesData = JSON.parse(fs.readFileSync(rulesPath, 'utf8'))

      let seededCount = 0
      let skippedCount = 0

      for (const ruleData of rulesData) {
        const existing = await em.findOne(BusinessRule, {
          ruleId: ruleData.ruleId,
          tenantId,
          organizationId,
        })

        if (existing) {
          console.log(`  ⊘ Guard rule '${ruleData.ruleId}' already exists`)
          skippedCount++
          continue
        }

        const rule = em.create(BusinessRule, {
          ...ruleData,
          tenantId,
          organizationId,
        })

        await em.persist(rule).flush()
        await invalidateBusinessRuleDiscoveryCache(cache, tenantId, organizationId)
        console.log(`  ✓ Seeded guard rule: ${rule.ruleName}`)
        seededCount++
      }

      console.log(`\n✅ Checkout-demo guard rules seeded successfully!`)
      console.log(`  - Workflow: workflows.checkout-demo (code-defined)`)
      console.log(`  - Guard rules seeded: ${seededCount}`)
      console.log(`  - Guard rules skipped: ${skippedCount}`)
    } catch (error) {
      console.error('Error seeding demo guard rules:', error)
      throw error
    }
  },
}

/**
 * Seed simple approval example
 *
 * The 'workflows.simple-approval' workflow is now code-defined
 * (see packages/core/src/modules/workflows/workflows.ts). This command
 * remains as a thin wrapper that informs operators of the new location.
 */
const seedSimpleApproval: ModuleCli = {
  command: 'seed-simple-approval',
  async run() {
    console.log('ℹ️  The "workflows.simple-approval" workflow is now code-defined.')
    console.log('   No seeding required — it is auto-registered by the workflows module')
    console.log('   (see packages/core/src/modules/workflows/workflows.ts).')
    console.log('')
    console.log('   Visit /backend/definitions to view it as a Code-defined workflow.')
  },
}

/**
 * Start workflow activity worker
 */
const startWorker: ModuleCli = {
  command: 'start-worker',
  async run(rest: string[]) {
    const args = parseArgs(rest)
    const concurrency = parseInt(args.concurrency ?? args.c ?? '5')

    const strategy = process.env.QUEUE_STRATEGY === 'async' ? 'async' : 'local'

    console.log('[Workflow Worker] Starting activity worker...')
    console.log(`[Workflow Worker] Strategy: ${strategy}`)

    if (strategy === 'local') {
      const pollMs = process.env.LOCAL_QUEUE_POLL_MS || '5000'
      console.log(`[Workflow Worker] Polling interval: ${pollMs}ms`)
      console.log('[Workflow Worker] NOTE: Local strategy is for development only.')
      console.log('[Workflow Worker] Use QUEUE_STRATEGY=async with Redis for production.')
    } else {
      console.log(`[Workflow Worker] Concurrency: ${concurrency}`)
      console.log(`[Workflow Worker] Redis: ${getRedisUrl('QUEUE') ?? '(not configured)'}`)
    }

    try {
      const container = await createRequestContainer()
      const em = container.resolve<EntityManager>('em')

      // Import queue and handler
      const { runWorker } = await import('@open-mercato/queue/worker')
      const { createActivityWorkerHandler } = await import('./lib/activity-worker-handler')
      const { WORKFLOW_ACTIVITIES_QUEUE_NAME } = await import('./lib/activity-queue-types')

      // Create handler
      const handler = createActivityWorkerHandler(em, container)

      // Run worker
      await runWorker({
        queueName: WORKFLOW_ACTIVITIES_QUEUE_NAME,
        handler,
        connection: strategy === 'async' ? {
          url: getRedisUrlOrThrow('QUEUE'),
        } : undefined,
        concurrency,
        gracefulShutdown: true,
      })
    } catch (error) {
      console.error('[Workflow Worker] Failed to start worker:', error)
      throw error
    }
  },
}

/**
 * Seed all example workflows
 */
const seedAll: ModuleCli = {
  command: 'seed-all',
  async run(rest: string[]) {
    const args = parseArgs(rest)
    const tenantId = String(args.tenantId ?? args.tenant ?? args.t ?? '')
    const organizationId = String(args.organizationId ?? args.orgId ?? args.org ?? args.o ?? '')

    if (!tenantId || !organizationId) {
      console.error('Usage: mercato workflows seed-all --tenant <tenantId> --org <organizationId>')
      return
    }

    console.log('🧩 Seeding all example workflows...\n')

    try {
      // Seed demo checkout with rules
      await seedDemoWithRules.run(rest)
      console.log('')


      // Seed simple approval
      await seedSimpleApproval.run(rest)
      console.log('')


      console.log('✅ All example workflows seeded successfully!')
    } catch (error) {
      console.error('Error seeding workflows:', error)
      throw error
    }
  },
}

/**
 * Manually process pending workflow activities
 */
const processActivities: ModuleCli = {
  command: 'process-activities',
  async run(rest: string[]) {
    const args = parseArgs(rest)
    const limit = parseInt(args.limit ?? args.l ?? '0')

    console.log('[Workflow Activities] Processing pending activities...')
    if (limit > 0) {
      console.log(`[Workflow Activities] Limit: ${limit} jobs`)
    }

    try {
      const container = await createRequestContainer()
      const em = container.resolve<EntityManager>('em')

      // Import queue and handler
      const { createQueue } = await import('@open-mercato/queue')
      const { createActivityWorkerHandler } = await import('./lib/activity-worker-handler')
      const { WORKFLOW_ACTIVITIES_QUEUE_NAME } = await import('./lib/activity-queue-types')

      // Create queue instance
      const queue = createQueue(WORKFLOW_ACTIVITIES_QUEUE_NAME, 'local')

      // Create handler
      const handler = createActivityWorkerHandler(em, container)

      // Get initial counts
      const initialCounts = await queue.getJobCounts()
      console.log(`[Workflow Activities] Pending jobs: ${initialCounts.waiting}`)

      if (initialCounts.waiting === 0) {
        console.log('[Workflow Activities] No jobs to process')
        await queue.close()
        return
      }

      // Process jobs
      const result = await queue.process(handler as any, limit > 0 ? { limit } : undefined)

      console.log(`\n[Workflow Activities] ✓ Processed ${result.processed} activities`)
      if (result.failed > 0) {
        console.log(`[Workflow Activities] ✗ Failed: ${result.failed} activities`)
      }

      // Show remaining
      const finalCounts = await queue.getJobCounts()
      if (finalCounts.waiting > 0) {
        console.log(`[Workflow Activities] Remaining: ${finalCounts.waiting} jobs`)
      }

      await queue.close()
    } catch (error) {
      console.error('[Workflow Activities] Error processing activities:', error)
      throw error
    }
  },
}

const workflowsCliCommands = [
  startWorker,
  processActivities,
  seedDemo,
  seedDemoWithRules,
  seedSimpleApproval,
  seedAll,
]

export default workflowsCliCommands
