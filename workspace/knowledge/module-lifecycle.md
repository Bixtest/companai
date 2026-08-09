# Module lifecycle: enabled, parked, deleted

**In one sentence.** A module is switched on by one line in
`apps/mercato/src/modules.ts`, and switching it **off** removes almost everything
deleting would — which is why we park rather than delete.

**Why it matters.** We inherited 1.3 million lines of ERP we do not want. Getting
this distinction right saved weeks of deletion work and, more importantly, kept
the code available to read and restore. Getting it *half* right cost us three
separate surprises, all documented below.

## How it works

```ts
// apps/mercato/src/modules.ts
export const enabledModules: ModuleEntry[] = [
  { id: 'auth', from: '@open-mercato/core' },
  // { id: 'catalog', from: '@open-mercato/core' },   ← parked
]
```

Every generated registry and the migration runner read
`resolver.loadEnabledModules()`. That single list decides a great deal:

| | Enabled | **Parked** | Deleted |
|---|---|---|---|
| Migrations run — tables exist | yes | **no** | no |
| API routes, pages, menus, ACL features | yes | **no** | no |
| Workers, subscribers, DI registrations | yes | **no** | no |
| Generated entity ids (`E.<module>.…`) | yes | **no** | no |
| Source readable on disk | yes | **yes** | no |
| Type-checked | yes | **no** | — |
| Tests run | yes | **no** | — |
| Cost to restore | — | **one line** | rebuild from scratch |

**Parked means frozen, not maintained.** Its source is excluded from
`tsconfig.json` and its tests from the jest run, because the generated artifacts
it depends on are no longer emitted. A module restored after months will need
bringing up to the current contract.

### The compile-time guard, which is a feature

The generated entity-id registry covers **enabled modules only**. So with
`catalog` parked:

```ts
E.catalog.catalog_product          // ✗ does not compile — deliberate
getEntityIds().catalog?.catalog_product   // ✓ the sanctioned optional form
```

That is not an oversight to work around. It stops enabled code taking a hard
dependency on entities whose tables no longer exist. Code that must work either
way uses the optional form — `attachments` does exactly this.

## How to do the common thing

### Park a module

1. Comment out its entry in `modules.ts` (keep it in the documented parked list).
2. Exclude its source in `packages/core/tsconfig.json`.
3. `yarn generate && yarn build`.

Steps 1–2 are drift-guarded: `parked-modules-typecheck-scope.test.ts` fails if
the two lists disagree — including the silent direction, where a re-enabled
module is left excluded and quietly stops being checked.

### Park a standalone package

Same, plus a fourth step that is easy to miss: **remove the workspace dependency
from `apps/mercato/package.json`**, or `yarn install` fails with
`Workspace not found`. Applies to `checkout`, `gateway-stripe`, `sync-akeneo`,
`content`, `onboarding`, `channel-imap`, `channel-gmail`.

### Restore a parked module

Uncomment its line, remove its `tsconfig.json` exclusion, `yarn generate`,
`yarn db:migrate`. **Respect declared `requires`:**

```text
sales → catalog, customers, dictionaries        wms → catalog, sales, feature_toggles
sync_akeneo → integrations, data_sync, catalog, sales
portal → customer_accounts    staff → planner, resources    resources → planner
```

The generator refuses to emit a registry when an enabled module's `requires` is
unmet, so a wrong order fails the build rather than shipping.

## What goes wrong

Three surprises, all of which cost real time:

| Surprise | Why | Lesson |
|---|---|---|
| **Parking does not disable what *other* modules ship about the parked one.** Ten dashboard widgets kept querying parked ERP data and rendered red error panels | The widgets live in `dashboards`, which we keep | Ask what other enabled modules provide *about* this one — widgets, enrichers, menu entries, subscribers |
| **Parked source stopped type-checking** — 579 errors — and a *cached* green hid it | The entity-id registry excludes parked modules by design | `Cached: N` on a task whose inputs you changed means the tool did not look |
| **A deleted seed file broke tenant setup**, though the build was green | A JSON referenced by filename at runtime — no import, no type | Static analysis proves code agrees with itself, never that it agrees with data on disk |

Plus one that is not about parking but always bites here: `modules.ts` entries
come in **two shapes** — single-line, and multi-line when an entry carries
`overrides`. A parser matching only the first silently reclassifies an enabled
module as parked. That skipped 123 tests before the drift guard caught it.

## Where the code lives

| Path | What |
|---|---|
| `apps/mercato/src/modules.ts` | The one list that decides everything |
| `packages/cli/src/lib/resolver.ts` | `loadEnabledModules()` |
| `packages/cli/src/lib/generators/entity-ids.ts` | Why parked modules lose `E.<module>` |
| `packages/core/tsconfig.json` | Parked-source exclusions, with the reasoning |
| `packages/core/jest.config.cjs` | Parked-test exclusion, derived from `modules.ts` |
| `packages/core/src/__tests__/parked-modules-typecheck-scope.test.ts` | The drift guard |

Full rationale and the deferred costs:
[`references/parked-modules.md`](../references/parked-modules.md).
