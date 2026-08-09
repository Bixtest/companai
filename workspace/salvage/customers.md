# Salvage analysis — `customers`

**Verdict:** REMOVE AFTER EXTRACTION
**Size:** 173,786 LOC · 833 files · 25 database tables
**Analysed:** 2026-08-08 · **Status: complete** — all seven questions answered
**Protocol:** [`references/salvage-analysis.md`](../references/salvage-analysis.md)

## What it is

A full CRM: people, companies, deals, pipelines, interactions, activities,
comments, labels, tags and per-tenant CRM settings. The largest module in the
codebase and a genuine business domain — not infrastructure wearing a domain name.

## Keep list

**Nothing in `customers` is platform infrastructure.** Its 25 tables are all CRM
records. Checked specifically for the `domain_mappings` failure mode (L1); it
does not repeat here.

**But four things must be repaired before it can be removed**, and one file is
worth reading before it is deleted.

| # | Where | What | Action |
|---|---|---|---|
| 1 | `configs/lib/upgrade-actions.ts:78-79` | Dynamically imports `customers/cli` and `customers/commands/shared` during upgrades | Remove those upgrade actions, or guard them on the module being enabled |
| 2 | `dashboards/seed/analytics.ts:11` | Imports customer entities to seed demo analytics | Remove the customer seed, or repoint it at a kept entity |
| 3 | `ai_assistant` | 23 non-test references to `customers.*` | Review each — expected to be CRM agent/tool registrations that leave with the module. **Confirm, do not assume.** |
| 4 | `communication_channels` | Three comments describe a `customers` subscriber that consumes hub events (`link-channel-message`) | The subscriber lives in `customers` and leaves with it. **Check the hub still behaves correctly with no consumer**, and update the stale comments |
| 5 | `customers/ai-agents.ts` (529 lines) | A worked example of a module shipping its own AI agent | **Copy to `attic/` as a pattern reference before deleting.** We will write these for our own modules |

## Answers to the seven questions

| Q | Finding |
|---|---|
| **Q1 — tables** | 25, all CRM domain records. **No platform infrastructure hiding here.** |
| **Q2 — importers** | 3 kept modules import it: `configs`, `dashboards`, `ai_assistant`. `inbox_ops` matches in tests only. All other importers (`sales`, `sync_excel`, `customer_accounts`, `staff`) are themselves being removed. |
| **Q3 — requires** | Only `sales` declares it, and `sales` is also going. **No kept module declares it.** |
| **Q4 — shared surfaces** | Contributes to nearly every surface the platform offers: `acl.ts` (101), `di.ts` (77), `events.ts` (98), `setup.ts` (110), `ce.ts` (53), `encryption.ts` (84), `vector.ts` (7), `cli.ts` (**3,251**), `ai-agents.ts` (529), plus `subscribers/`, `ai-tools/`, `widgets/` and `data/extensions.ts`. **Detail below.** |
| **Q5 — generic machinery** | 14 candidate files with non-CRM names. **Detail below.** |
| **Q6 — string references** | In non-test source of kept modules: `ai_assistant` 23 · `entities` 10 · `configs` 5 · `inbox_ops` 4 · `workflows` 3 · `dashboards` 3 · `auth` 1 · `data_sync` 0 · `audit_logs` 0 |
| **Q7 — UI coupling** | **None.** No kept module's pages link to CRM screens. |

### Q4 in detail — what actually blocks removal

- **DI services:** it registers only entity values plus `crudMutationGuardService`.
  That guard is *platform-wide and registered elsewhere* — `sales/di.ts:180`
  states so explicitly. `customers` consumes it, does not own it. **Not a blocker.**
- **Entity link:** `data/extensions.ts` declares
  `customers:customer_interaction` → `communication_channels:message_channel_link`.
  **`customers` is the base and declares the link**; `communication_channels`
  does not know about it. Removing `customers` removes the declaration cleanly.
  **One-way. Not a blocker.**
- **Event subscriber:** `communication_channels` emits hub events that a
  `customers` subscriber consumes. That subscriber leaves with the module. The
  hub keeps emitting into nothing, which is normal for an event bus — but it must
  be **verified, not assumed**, and three stale comments should be updated.

### Q5 in detail — reusable machinery worth a second look

Fourteen files under `lib/` and `services/` whose names are not CRM-specific:

```text
customFieldRouting.ts   detailHelpers.ts       detailTenantScope.ts
dictionaries.ts         displayName.ts         findPeopleByAddresses.ts
kysely.ts               link-channel-message-handler.ts
markdownPreference.ts   messageObjectPreviews.ts
operationMetadata.ts    roleTypeUsage.ts
todoCompatibility.ts    visibilityFilter.ts
```

Four are worth reading before deletion, because their names suggest platform
concerns rather than CRM ones:

| File | Why it might matter |
|---|---|
| `visibilityFilter.ts` | Row-level visibility rules — adjacent to our authority model |
| `detailTenantScope.ts` | Tenant scoping on detail views — a pattern we will need everywhere |
| `customFieldRouting.ts` | How custom fields are routed — pairs with the `entities` engine we keep |
| `kysely.ts` | Query-builder helpers, likely generic |

**Recommendation:** read these four before the delete commit. The other ten are
CRM-shaped despite generic names (`displayName`, `roleTypeUsage`,
`findPeopleByAddresses`) and can go.

## Extraction plan

Ordered. Each step is verified before the next.

1. Read the four Q5 files; extract anything genuinely generic into a kept module.
2. Copy `ai-agents.ts` to `attic/patterns/` as a reference example.
3. Repair `configs/lib/upgrade-actions.ts` — remove or guard the two imports.
4. Repair `dashboards/seed/analytics.ts` — remove the customer seed.
5. Review the 23 `ai_assistant` references; remove those that are CRM-scoped.
6. Confirm `communication_channels` behaves correctly with no `customers`
   subscriber; update its three stale comments.
7. Remove from `modules.ts` → run the generator → move the directory to `attic/`.
8. Run the full gate. Commit, referencing this report.

## Risks

- **`cli.ts` is 3,251 lines.** Unusually large for a module CLI. Not inspected in
  depth; if any kept command or setup script invokes it, step 3 will surface it,
  but the generator will not catch a string-based invocation.
- **The event subscriber is the least certain item.** The hub emitting to no
  consumer *should* be harmless, but "should" is doing work in that sentence and
  it needs a test run, not reasoning.
- **`ai_assistant`'s 23 references** are assumed to be CRM-scoped registrations.
  Assumed, not verified. Step 5 verifies them.

## Method notes

Two near-misses producing this report, both now in [`LESSONS.md`](../../LESSONS.md):

- **L2** — raw grep counts looked like deep entanglement (`ai_assistant` 362,
  `auth` 86). Almost all were test fixtures and doc examples using
  `customers.people.view` to illustrate the permission system. Real counts are an
  order of magnitude lower.
- **L3** — the script written to correct L2 was broken, returning `21` for all
  nine modules. Caught only because identical numbers across nine different
  modules is implausible. It would have put nine false findings into this file.
