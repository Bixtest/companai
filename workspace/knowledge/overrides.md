# Overrides — changing a module without editing it

**In one sentence.** Any contract a module presents — routes, widgets, workers,
AI agents, ACL features, DI registrations — can be replaced or switched off from
`apps/mercato/src/modules.ts`, without touching the module's source.

**Why it matters.** We forked this platform and take no upstream updates, so we
*could* edit anything. That freedom is a trap: every edit to a module's source is
a change we must understand forever. An override is one line, is visible in one
place, and is undone by deleting it.

## How it works

```ts
{
  id: 'dashboards',
  from: '@open-mercato/core',
  overrides: {
    widgets: { dashboard: { 'dashboards:aov-kpi:widget': null } },
  },
}
```

`null` disables. An object replaces. The dispatcher applies these when registries
first load, so it must run before anything reads them.

**Available domains:** `ai` (agents, tools) · `routes` (api, pages) · `events`
(subscribers) · `workers` · `widgets` (injection, components, dashboard) ·
`notifications` · `interceptors` · `commandInterceptors` · `enrichers` ·
`guards` · `cli` · `setup` · `acl` · `di` · `encryption`.

A copyable example of every one lives in `moduleOverrideExamples` in
`modules.ts` — deliberately assigned to no module, purely as reference.

## How to do the common thing

### Switch off a widget that queries a parked module

Parking a module does **not** disable widgets another enabled module ships about
it. Ten `dashboards` widgets kept querying parked ERP data and rendered red
"Failed to load" panels:

```ts
widgets: {
  dashboard: {
    'dashboards:aov-kpi:widget': null,
    'dashboards:new-customers-kpi:widget': null,
  },
},
```

### Find the right key — this is where the time goes

**Override keys are the registry's `key`, not the thing's `id`.** They are
different strings and using the wrong one fails silently.

```text
widget id   dashboards.analytics.aovKpi     ✗ what you will guess
entry key   dashboards:aov-kpi:widget       ✓ what the registry matches
```

Read the key from the generated registry:

```bash
grep -oE "key: '[^']+'" apps/mercato/.mercato/generated/dashboard-widgets.generated.ts
```

## What goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Override appears to do nothing | Key does not match any registered entry | **Read the server log.** It says so explicitly |
| Not sure whether it applied | Same | Same — the platform tells you |

The log line, which is the fastest debugging tool available here:

```text
component=module-overrides label=widgets.dashboard key=dashboards.analytics.aovKpi
msg="Override did not match any registered entry — override skipped"
```

That message appeared on the first run of a wrong override and named the exact
problem. **Read the application's own diagnostics before theorising** — this
platform is unusually good about saying what it did not do.

## Where the code lives

| Path | What |
|---|---|
| `apps/mercato/src/modules.ts` | Where overrides are declared, plus the examples |
| `packages/shared/src/modules/overrides.ts` | Types, composers, and the appliers |
| `apps/mercato/.mercato/generated/*.generated.ts` | The registries whose `key` values you need |
