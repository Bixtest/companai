# Salvage analysis — the four flagged modules

`currencies` · `payment_gateways` · `sync_excel` · `progress`

**Analysed:** 2026-08-08 · **Status: complete**
**Why grouped:** all four were flagged in the triage as *"name describes a domain,
contents may be infrastructure"* — the `domain_mappings` failure mode. Analysing
them together keeps the comparison honest.

**Protocol:** [`references/salvage-analysis.md`](../references/salvage-analysis.md)

---

## Verdicts

| Module | LOC | Tables | Verdict |
|---|---:|---:|---|
| `currencies` | 13,500 | 3 | **REMOVE — with one functional loss to accept** |
| `payment_gateways` | 7,203 | 4 | **REMOVE — cleanest of the four** |
| `sync_excel` | 7,851 | 1 | **REMOVE — but read `integration.ts` first** |
| `progress` | 3,177 | 1 | **REMOVE — with one functional loss to accept** |

None of the four turned out to be infrastructure in disguise. **The flag was
right to raise them and right to be cleared** — that is the protocol working, not
the protocol wasted.

---

## The finding that matters: two kept modules degrade

Two modules we are **keeping** reach into two modules we are **removing**. Both
were written to survive the absence — but both lose a real capability.

### `entities` → `currencies` — the custom-field engine loses currency validation

`entities/api/definitions.ts:97`:

```ts
const { Currency } = await import('@open-mercato/core/modules/currencies/data/entities')
// …validate the default value against real currencies…
} catch (err) {
  logger.debug('Currency validation skipped — module not available', { err })
}
```

A **dynamic import inside a try/catch**, with a comment stating the module may be
absent. It is designed for this.

**What is actually lost:** the custom-entities engine supports a `currency` field
type. Without the `currencies` module, a `currency` field still exists and still
accepts values — **it just stops checking that the value is a real currency.**

**Decision needed.** Three options:

1. Accept it — `currency` becomes an unvalidated text field.
2. Remove the `currency` field type from the engine, so nothing silently degrades.
3. **Keep `currencies`** — it is only 13,500 LOC and 3 tables, and any billing,
   AI-cost reporting or budget feature we build will want exchange rates anyway.

**Recommendation: option 3, keep it.** Our Worker Charter already specifies
budgets in currency (`daily: { amount: 40, currency: EUR }`), and
`exchange_rates` plus scheduled rate fetching is not something we want to rebuild.
This is the one module of the four I would not remove.

### `query_index` → `progress` — reindexing loses its progress reporting

`query_index/subscribers/reindex.ts:6` — a **type-only** import, plus a runtime
resolve wrapped in try/catch that sets `progressEnabled = false` on failure.

**What is lost:** long reindex jobs stop reporting progress. They still run.

**Decision needed.** `progress` is 3,177 LOC and one table, and it is entirely
generic — nothing about it is ERP-specific. Rebuilding job-progress tracking
later costs more than keeping it.

**Recommendation: keep `progress` too.**

---

## A strip hazard worth remembering: `import type`

`query_index` imports `ProgressService` with `import type`. TypeScript **erases**
those at compile time, so there is no runtime dependency at all — the code works
perfectly with `progress` deleted.

**But `yarn typecheck` will fail**, because the type no longer resolves.

So a type-only import is a dependency that:

- **runtime probes will not find** — nothing imports it at execution time;
- **`grep "modules/x"` will find**, but only if you are not filtering by runtime usage;
- **breaks the build, not the app.**

I checked for others across all delete-list modules: **this is currently the only
one.** Recorded in [`LESSONS.md`](../../LESSONS.md) as a hazard class, because the
next codebase may have many.

---

## Per-module detail

### `currencies` — 13,500 LOC · 3 tables

**Tables:** `currencies`, `exchange_rates`, `currency_fetch_configs`.
**Surfaces:** `acl.ts`, `di.ts`, `events.ts`, `setup.ts`, `cli.ts`.

| Q | Finding |
|---|---|
| Q1 | 3 tables. `exchange_rates` and scheduled fetch config are **general financial infrastructure**, not commerce-specific |
| Q2 | `entities` imports it (guarded — see above) |
| Q3 | No kept module declares it |
| Q4 | Registers DI services and events; ships a CLI |
| Q5 | The rate-fetching scheduler is generic |
| Q6 | Low |
| Q7 | None |

**Verdict: recommend KEEP**, contrary to the original triage. Small, generic,
and our own Charter design needs currency amounts.

### `payment_gateways` — 7,203 LOC · 4 tables

**Tables:** `gateway_transactions`, `gateway_payment_operations`,
`gateway_session_initializations`, `gateway_webhook_events`.
**Surfaces:** `acl.ts`, `di.ts`, `events.ts`, `setup.ts`, `encryption.ts`.

| Q | Finding |
|---|---|
| Q1 | All four tables are payment-domain |
| Q2 | **No kept module imports it** |
| Q3 | Not declared by anything kept |
| Q4 | Self-contained; has its own encryption map |
| Q5 | The **provider-registration pattern** is reusable — but it is a pattern to read, not code to keep |
| Q6 | None |
| Q7 | None |

**Verdict: REMOVE.** The cleanest removal of the four. **Read its provider
registration before deleting** and copy the pattern to `attic/patterns/` — we
will need the same shape for AI providers, storage providers and integrations.

### `sync_excel` — 7,851 LOC · 1 table

**Tables:** `sync_excel_uploads`.
**Surfaces:** `acl.ts`, `di.ts`, `setup.ts`, **`integration.ts`**.

| Q | Finding |
|---|---|
| Q1 | One table, upload tracking |
| Q2 | Matches in `attachments` are **tests only** — no real dependency |
| Q3 | None |
| Q4 | **Ships an `integration.ts`** — it registers itself in the integration marketplace we are keeping |
| Q5 | Spreadsheet parsing and column mapping are generic |
| Q6 | Low |
| Q7 | None |

**Verdict: REMOVE — but read `integration.ts` first.** It is a worked example of
a module registering itself with the integration framework we keep, and it is the
smallest such example in the codebase. Copy to `attic/patterns/`.

### `progress` — 3,177 LOC · 1 table

**Tables:** `progress_jobs`.
**Surfaces:** `acl.ts`, `di.ts`, `events.ts`, `setup.ts`.

| Q | Finding |
|---|---|
| Q1 | One table — **entirely generic job progress**, nothing ERP-specific |
| Q2 | `query_index` uses it (guarded, type-only — see above) |
| Q3 | None |
| Q4 | Small, clean |
| Q5 | The whole module is generic machinery |
| Q6 | None |
| Q7 | None |

**Verdict: recommend KEEP**, contrary to the original triage. It is generic, it
is tiny, a kept module already uses it, and we will run long jobs (reindexing,
imports, AI batch work) that need progress reporting.

---

## Recommended change to the strip plan

| Module | Triage said | Analysis says |
|---|---|---|
| `currencies` | remove (careful) | **KEEP** — generic financial infrastructure; Charter budgets need it |
| `progress` | remove (careful) | **KEEP** — generic; already used by a kept module |
| `payment_gateways` | remove (careful) | **REMOVE** — extract the provider pattern first |
| `sync_excel` | remove (careful) | **REMOVE** — extract `integration.ts` as an example first |

**Net effect:** ~16,700 LOC that the triage marked for deletion should stay, and
two pattern files should be extracted before the other two go.

This is exactly what the "careful analysis" flag was for. Two of four flags were
justified.

## Extraction plan

1. Copy `payment_gateways` provider registration → `attic/patterns/`.
2. Copy `sync_excel/integration.ts` → `attic/patterns/`.
3. Update `strip-batches.md`: move `currencies` and `progress` to the keep set.
4. Update `attic/CATALOG.md`: remove those two entries; note why.
5. Remove `payment_gateways` and `sync_excel`; generator; gate; commit.
