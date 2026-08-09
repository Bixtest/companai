# Salvage analysis — the clear removals

`sales` · `catalog` · `wms` · `shipping_carriers` · `portal` ·
`checkout` · `gateway-stripe` · `sync-akeneo`

**Analysed:** 2026-08-08 · **Status: complete**
**Verdict: REMOVE all eight**, after four repairs and two extractions.
**Total:** ~233,000 LOC

These are unambiguously commerce domain. Rule One does not protect them: there is
no doubt to resolve. But given that three of my last five predictions about
modules were wrong, each was read rather than assumed — and two things turned up.

---

## Clean — nothing kept depends on them

| Module | LOC | Kept importers |
|---|---:|---|
| `wms` | 46,627 | **none** |
| `shipping_carriers` | 7,676 | **none** |
| `portal` | 1,869 | **none** |
| `checkout` | 19,261 | **none** |
| `gateway-stripe` | 2,232 | **none** |
| `sync-akeneo` | 10,988 | **none** |

Six of the eight come out with no repair at all. `portal` depends on
`customer_accounts`, which is being split in S3a — so it must go **after** that.

---

## `sales` — 86,777 LOC · 27 tables · four things to fix first

| # | Where | What | Fix |
|---|---|---|---|
| 1 | `dashboards/seed/analytics.ts:6` | Imports sales entities to seed demo charts | Remove the demo seed — see below |
| 2 | `resources/backend/resources/resource-types/[id]/edit/page.tsx:11` | Imports `extractCustomFieldValues` from `sales/components/documents/customFieldHelpers` | **Extract the helper** — see below |
| 3 | `workflows/widgets/injection/order-approval/widget.client.tsx:12` | Imports `emitSalesDocumentDataRefresh` | Remove the widget — it is a sales-specific approval card living inside `workflows` |
| 4 | `workflows/cli.ts:270` | A comment referencing a sales file path | Update the comment |

### The finding: a generic helper living inside a domain module

`sales/components/documents/customFieldHelpers.ts` is **31 lines** and contains
no sales logic whatsoever:

```ts
normalizeCustomFieldSubmitValue()   // normalise a submitted value
prefixCustomFieldValues()           // normalise cf_ / cf: key prefixes
extractCustomFieldValues()          // extract + normalise custom fields
```

It imports only from `@open-mercato/shared` and manipulates the `cf_` custom-field
convention used platform-wide. A **kept** module (`resources`) already depends on
it, which is how it surfaced.

**Action: move it to `packages/shared/lib/custom-fields/`** before removing
`sales`, and repoint `resources`.

This is Q5 — *generic machinery wearing a domain name* — found from the opposite
direction. I had been looking for it by scanning file names inside modules being
removed. It was easier to find by asking **what do the modules we keep reach in
for?** That question is now part of the protocol.

### The demo seed solves three modules at once

`dashboards/seed/analytics.ts` imports entities from `customers`, `sales` **and**
`catalog` to populate demo dashboards. One file blocks three removals.

**Action: delete the demo seed.** It exists to make an empty install look
populated with shop data — the opposite of what we want. `dashboards` itself is
kept; only its ERP demo data goes.

---

## `catalog` — 58,717 LOC · 12 tables · one real fix

| Where | What | Fix |
|---|---|---|
| `dashboards/seed/analytics.ts:15` | Demo seed again | Same deletion as above |
| `inbox_ops/lib/priceValidator.ts:56` | A comment pointing at `catalog/AGENTS.md` | Update the comment |
| `attachments`, `progress` | Matches in tests only | Nothing |

**Extract before removal:** `catalog/ai-agents.ts` — the second worked example of
a module shipping its own AI agent, alongside the one in `customers`. Copy both
to `attic/patterns/`; having two makes the shared shape obvious.

---

## Extraction and repair order

Ordered so nothing breaks mid-sequence.

1. **Move** `customFieldHelpers.ts` → `packages/shared/lib/custom-fields/`;
   repoint `resources`. *(Do this first — it is a kept module's dependency.)*
2. **Copy** `customers/ai-agents.ts` and `catalog/ai-agents.ts` →
   `attic/patterns/`.
3. **Copy** the `payment_gateways` provider-registration pattern and
   `sync_excel/integration.ts` → `attic/patterns/`.
4. **Delete** `dashboards/seed/analytics.ts` — unblocks `customers`, `sales`,
   `catalog`.
5. **Remove** `workflows/widgets/injection/order-approval/`.
6. **Fix** the two stale comments (`workflows/cli.ts`, `inbox_ops/priceValidator.ts`).
7. **Fix** `staff/api/team-members/assignable/route.ts:14` (from the workforce analysis).
8. **Fix** `configs/lib/upgrade-actions.ts` (from the customers analysis).
9. Remove in this order: `wms`, `shipping_carriers`, `checkout`, `gateway-stripe`,
   `sync-akeneo`, `catalog`, `sales`, `customers` → **then** `customer_accounts`
   (split, S3a) → **then** `portal`.
10. Generator, full gate, one commit per module referencing its report.

---

## Risk

**The last three are order-dependent.** `portal` requires `customer_accounts`,
and `customer_accounts` must be split before it goes. Removing `portal` first is
safe; removing `customer_accounts` before extracting `domain_mappings` loses the
custom-domains feature — the original mistake this whole protocol exists to
prevent.

**The generator is the safety net**, but only for declared `requires`. It will not
catch the four repairs above — those are ordinary imports and comments. They must
be done by hand, and the build gate is what proves they were.
