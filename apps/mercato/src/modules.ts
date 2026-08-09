// Central place to enable modules and their source.
// - id: module id (plural snake_case; special cases: 'auth')
// - from: '@open-mercato/core' | '@app' | custom alias/path in future
// - overrides: optional unified per-app override surface — replace or
//   disable any contract a module presents: AI, routes, events, workers,
//   widgets, notifications, interceptors, setup, ACL, DI, encryption, etc.
//   See `.ai/specs/implemented/2026-05-04-modules-ts-unified-overrides.md` and
//   `apps/docs/docs/framework/modules/overrides.mdx`.
import { parseBooleanWithDefault } from '@open-mercato/shared/lib/boolean'
import type { ModuleOverrides } from '@open-mercato/shared/modules/overrides'
import { officialModuleEntries } from './official-modules.generated'

export type ModuleEntry = {
  id: string
  from?: '@open-mercato/core' | '@app' | string
  overrides?: ModuleOverrides
}

/**
 * Copyable examples for every wired `entry.overrides` domain.
 *
 * This object is intentionally not assigned to any enabled module. Use it as
 * a reference when a downstream app needs to disable or replace contracts
 * from a package-backed module without editing that module's source.
 */
export const moduleOverrideExamples: ModuleOverrides = {
  ai: {
    agents: { 'catalog.catalog_assistant': null },
    tools: { inbox_ops_accept_action: null },
  },
  routes: {
    api: { 'DELETE /api/example/items': null },
    pages: { '/backend/example/reports': null },
  },
  events: {
    subscribers: { 'example.todo.audit': null },
  },
  workers: { 'example:sync': null },
  widgets: {
    injection: { 'example.sidebar': null },
    components: { 'page:/backend/example': null },
    dashboard: { 'example.kpi': null },
  },
  notifications: {
    types: { 'example.notice': null },
    handlers: { 'example.notice.toast': null },
  },
  interceptors: { 'example.items.interceptor': null },
  commandInterceptors: { 'example.command.interceptor': null },
  enrichers: { 'example.items.enricher': null },
  guards: { 'example.backend.guard': null },
  cli: { 'example seed': null },
  setup: {
    seedExamples: false,
  },
  acl: {
    features: { 'example.manage': null },
  },
  di: { exampleService: null },
  encryption: {
    maps: { 'example:item': null },
  },
}

/**
 * PARKED MODULES — code retained, module switched off.
 *
 * Our platform is an operating system for companies, not an ERP. The commerce
 * and warehouse modules are switched off here rather than deleted, because
 * disabling buys almost everything deleting would:
 *
 *   - no migrations run, so a fresh database never creates their tables
 *   - no API routes, pages, menu entries or ACL features are served
 *   - no workers, subscribers or DI registrations are loaded
 *
 * Their source stays on disk, still compiled and still type-checked, so it
 * remains available to read, to harvest patterns from, and to re-enable by
 * uncommenting a single line. Deleting would have bought only build time, at
 * the cost of days of analysis per module and the risk of losing something —
 * we nearly lost `domain_mappings` that way once already.
 *
 * Parked (uncomment to restore):
 *
 *   { id: 'customers', from: '@open-mercato/core' },
 *   { id: 'catalog', from: '@open-mercato/core' },
 *   { id: 'sales', from: '@open-mercato/core' },
 *   { id: 'wms', from: '@open-mercato/core' },
 *   { id: 'shipping_carriers', from: '@open-mercato/core' },
 *   { id: 'payment_gateways', from: '@open-mercato/core' },
 *   { id: 'sync_excel', from: '@open-mercato/core' },
 *   { id: 'customer_accounts', from: '@open-mercato/core' },
 *   { id: 'portal', from: '@open-mercato/core' },
 *   { id: 'staff', from: '@open-mercato/core' },
 *   { id: 'resources', from: '@open-mercato/core' },
 *   { id: 'checkout', from: '@open-mercato/checkout' },
 *   { id: 'gateway_stripe', from: '@open-mercato/gateway-stripe' },
 *   { id: 'sync_akeneo', from: '@open-mercato/sync-akeneo' },
 *
 * Restore order matters — these declare `requires`:
 *   sales → catalog, customers, dictionaries
 *   wms → catalog, sales, feature_toggles
 *   sync_akeneo → integrations, data_sync, catalog, sales
 *   portal → customer_accounts
 *   staff → planner, resources     resources → planner
 *
 * `customer_accounts` owns `domain_mappings` (per-tenant custom domains), which
 * we do want. It is not lost — the table simply is not created while parked.
 * Extracting it into `directory` is a graft-phase task, not a blocker.
 *
 * `customers` is upstream's reference module for CRUD patterns; AGENTS.md points
 * at it throughout. Parked, not deleted, precisely so it stays readable.
 *
 * Rationale and the decision behind it: workspace/references/parked-modules.md
 */
export const enabledModules: ModuleEntry[] = [
  {
    id: 'dashboards',
    from: '@open-mercato/core',
    overrides: {
      // Ten of the dashboards module's own widgets read ERP data — sales orders,
      // customer people and deals. Those modules are parked, so the widgets have
      // no data source and render a red "Failed to load …" panel on the admin
      // start page.
      //
      // Parking a module does not disable widgets that *other* enabled modules
      // ship about it: the widget lives in `dashboards`, which we keep, and only
      // its feature requirements point at the parked module. This is the
      // sanctioned way to switch them off — one line each, reversed by deleting
      // the line, exactly like un-parking.
      //
      // Restore these together with `sales` / `customers`.
      widgets: {
        dashboard: {
          'dashboards:aov-kpi:widget': null,
          'dashboards:new-customers-kpi:widget': null,
          'dashboards:orders-by-status:widget': null,
          'dashboards:orders-kpi:widget': null,
          'dashboards:pipeline-summary:widget': null,
          'dashboards:revenue-kpi:widget': null,
          'dashboards:revenue-trend:widget': null,
          'dashboards:sales-by-region:widget': null,
          'dashboards:top-customers:widget': null,
          'dashboards:top-products:widget': null,
        },
      },
    },
  },
  { id: 'auth', from: '@open-mercato/core' },
  { id: 'directory', from: '@open-mercato/core' },
  { id: 'perspectives', from: '@open-mercato/core' },
  { id: 'entities', from: '@open-mercato/core' },
  { id: 'configs', from: '@open-mercato/core' },
  { id: 'query_index', from: '@open-mercato/core' },
  { id: 'audit_logs', from: '@open-mercato/core' },
  { id: 'attachments', from: '@open-mercato/core' },
  { id: 'api_keys', from: '@open-mercato/core' },
  { id: 'dictionaries', from: '@open-mercato/core' },
  { id: 'content', from: '@open-mercato/content' },
  { id: 'onboarding', from: '@open-mercato/onboarding' },
  { id: 'api_docs', from: '@open-mercato/core' },
  { id: 'business_rules', from: '@open-mercato/core' },
  { id: 'feature_toggles', from: '@open-mercato/core' },
  { id: 'workflows', from: '@open-mercato/core' },
  { id: 'search', from: '@open-mercato/search' },
  { id: 'currencies', from: '@open-mercato/core' },
  { id: 'planner', from: '@open-mercato/core' },
  { id: 'events', from: '@open-mercato/events' },
  { id: 'notifications', from: '@open-mercato/core' },
  { id: 'progress', from: '@open-mercato/core' },
  { id: 'integrations', from: '@open-mercato/core' },
  { id: 'data_sync', from: '@open-mercato/core' },
  { id: 'messages', from: '@open-mercato/core' },
  // Communication channels hub (SPEC-045d) — bridges external chat/email channels
  // (Slack, WhatsApp, Email) to the unified Messages inbox. Provider packages
  // (channel-slack, channel-whatsapp, future email providers) register adapters here.
  { id: 'communication_channels', from: '@open-mercato/core' },
  { id: 'ai_assistant', from: '@open-mercato/ai-assistant' },
  { id: 'translations', from: '@open-mercato/core' },
  { id: 'scheduler', from: '@open-mercato/scheduler' },
  { id: 'inbox_ops', from: '@open-mercato/core' },
  // Per-user email channels for the Communications Hub (SPEC-045d / email
  // integration spec). Each provider package registers its `ChannelAdapter`
  // at import time via `setup.ts`; the hub picks them up by `providerKey`.
  { id: 'channel_imap', from: '@open-mercato/channel-imap' },
  { id: 'channel_gmail', from: '@open-mercato/channel-gmail' },
  { id: 'webhooks', from: '@open-mercato/webhooks' },
  {
    id: 'example',
    from: '@app',
    overrides: {
      routes: {
        api: {
          'GET /api/example/override-probe': {
            handler: async () => Response.json({
              ok: true,
              source: 'modules.ts override',
              route: 'example.override-probe',
            }),
            metadata: { requireAuth: false },
          },
        },
      },
    },
  },
  { id: 'ratelimit_probe', from: '@app' },
]

// Official modules activated via official-modules.json / official-modules.local.json
// (managed by `yarn official-modules`; backed by the external/official-modules submodule).
for (const entry of officialModuleEntries) {
  if (!enabledModules.some((existing) => existing.id === entry.id)) enabledModules.push(entry)
}

if (enabledModules.some((entry) => entry.id === 'example')) {
  enabledModules.push({ id: 'example_customers_sync', from: '@app' })
}

if (parseBooleanWithDefault(process.env.OM_ENABLE_STORAGE_S3, false)) {
  enabledModules.push({ id: 'storage_s3', from: '@open-mercato/storage-s3' })
}

