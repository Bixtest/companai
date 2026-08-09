# Phase S — Strip batches · **SUPERSEDED**

> **This plan was replaced on 2026-08-08.** ERP modules are now **parked**
> (switched off in `modules.ts`), not deleted — see
> [parked-modules.md](parked-modules.md). Phase S is complete.
>
> **Why this file is still here.** The per-module analysis below is the record of
> what each module contains and what depends on it. That is exactly what a future
> restore decision needs to read. The *verdicts* ("REMOVE") are obsolete; the
> *findings* are not.
>
> The removal checklist and the local-boot step below still apply to any genuine
> deletion, which is now the exception rather than the routine.

---


**Every batch runs the loop in [COOKBOOK.md](../COOKBOOK.md) → Phase S:**
analyse → extract → remove → gate → commit. The analyse step is
[salvage-analysis.md](salvage-analysis.md) and it is blocking.

Target: from 1,321,919 LOC to roughly 800,000, booting and green.

---

---

## The removal checklist — four steps, not three

**Learned the hard way on `packages/enterprise`.** My analysis listed three steps;
there are four, and the missing one broke the install immediately.

| # | Step | Applies to |
|---|---|---|
| 1 | Remove the registration from `apps/mercato/src/modules.ts` | every module |
| 2 | Remove it from `packages/create-app/src/lib/templates/modules-ts.template` | every module |
| 3 | **Remove the workspace dependency from `apps/mercato/package.json`** | **packages only** — `"@open-mercato/<name>": "workspace:*"` |
| 4 | Delete the directory (`git rm -r`), or move it to `attic/` | every module |

**Why step 3 is the one that gets missed:** it is a *packaging* concern, not a
module-system one. A module-focused analysis looks at registrations, imports and
generated registries — and never opens the consuming app's `package.json`. Yarn
then fails the whole install with
`Workspace not found (@open-mercato/<name>@workspace:*)`.

Modules under `packages/core/src/modules/` are **not** separate workspaces, so
step 3 does not apply to them. It applies to the standalone packages:
`checkout`, `gateway-stripe`, `sync-akeneo`, `content`, `onboarding`,
`storage-s3`, `channel-imap`, `channel-gmail`.

### After every removal

```bash
corepack yarn install --mode=skip-build   # step 3 failures surface here
corepack yarn build                       # regenerates every registry
corepack yarn typecheck
corepack yarn lint
```

The **build** is the meaningful check, not the typecheck: it re-runs the
generator, which is what proves the platform no longer knows the module existed.
Expect the typecheck task count to drop by one per removed *package* — record it
in the commit message so it is not later read as a regression.

**None of these four commands proves the platform starts.** They were all green
across four commits while `yarn initialize` died on a deleted seed file
(**L14**). Add the fifth step at least every third removal, on a clean database:

```bash
corepack yarn db:migrate
corepack yarn initialize -- --email=admin@local.test --password='<password>'
corepack yarn dev:classic
```

Full procedure and the list of known non-defects:
[local-instance.md](local-instance.md).

### Removing files from inside a module we keep

The salvage protocol assumes a whole module is going. When only *files* go —
seeds, fixtures, CLI commands, helpers — nothing governs it, and that is how the
workflow seed break happened. Do this instead:

1. Grep the **bare filename** of any data asset (`.json`, `.sql`, templates).
   Loaders reference these as strings; no import exists to find.
2. Run Q2 (who imports it) and Q6 (who names it in a string) from the protocol.
3. If a helper loses its last caller, decide **keep or delete deliberately** —
   exporting a domain-agnostic helper is usually right under doubt-means-keep.

### Orphaned database tables

Removing code does not drop tables from a database that already ran the module's
migrations. They remain, inert. Current policy: **leave them.** Dropping tables
is irreversible and they cost nothing. Revisit only as a deliberate migration
with a backup taken first.

## S1 — Fork hygiene · risk low

Rename the package scope, remove what is plainly not ours.

| Remove | Note |
|---|---|
| `.ai/` (155 specs, 160 runs, 34 skills) | **Read `.ai/skills` first** — it is the methodology that built this platform and may be worth keeping separately. Archive, do not delete. |
| `HIRING.md`, `SCREENSHOTS.md`, `report-high.md` | Upstream project artefacts |
| `docs/wms/`, `docs/manuals/` | Domain and setup docs for features we drop |
| `.github/workflows` | Replace with ours |

**Keep:** `AGENTS.md` (rewrite for us — it is the densest architectural statement
in the repo), `docs/design-system/` (30 documents — our Garage discipline),
`docs/superpowers/plans/…module-slimming` (a worked example of this very phase).

Salvage analysis not required for this batch — nothing here is code.

## S2 — Enterprise package · RESOLVED: clean removal · risk **low**

**Analysed:** [`salvage/enterprise-references.md`](../salvage/enterprise-references.md).
Risk downgraded from high to low — the MIT core has **zero real dependencies** on it.

Their own architecture rule (`@open-mercato/core` MUST NOT import from
`@open-mercato/enterprise`) was enforced consistently. The only two code
references are **comments explaining why the code does not import it**.

| Step | Action |
|---|---|
| 1 | Delete `packages/enterprise/` |
| 2 | Remove its entries from `apps/mercato/src/modules.ts` |
| 3 | Remove them from `create-app`'s `modules-ts.template` |
| 4 | Reword (do not delete) the two explanatory comments in `communication_channels/lib/oauth-state.ts` and `ui/backend/utils/optimisticLock.ts` — they document a real decision that stays true |
| 5 | Optional: clean `OM_ENABLE_ENTERPRISE_MODULES*` from `packages/cli/src/lib/testing/` |

**Correction:** this batch previously claimed the MIT core contains a "fail-closed
delegation to the enterprise record-lock" requiring a decision. **It does not** —
only a conflict-code constant and UI handling for a response that will never
arrive. Nothing to unpick.

**What we lose:** record locking, SSO, security add-ons, status overlays. Record
locking is replaced by graft **G5** (Platform 1's `lock_state`) — which is
therefore a replacement, not an enhancement.

## S3 — ERP modules · risk high

One module per commit, each with its own salvage report.

| Module | LOC | Expected verdict |
|---|---|---|
| `customers` | 173,786 | REMOVE — but Q5 check for generic import/dedup machinery |
| `sales` | 86,777 | REMOVE |
| `catalog` | 58,717 | REMOVE — Q4 check: it ships `ai-agents.ts`, a reference example of agent definition. Keep a copy in `attic/` as a pattern reference |
| `wms` | 46,627 | REMOVE |
| `shipping_carriers` | 7,676 | REMOVE |
| `payment_gateways` | 7,203 | REMOVE — **extract the provider-registration pattern first** ([analysis](../salvage/flagged-four.md)) |
| `portal` | 1,869 | REMOVE — but see S3a |
| `sync_excel` | 7,851 | REMOVE — **extract `integration.ts` to `attic/patterns/` first** ([analysis](../salvage/flagged-four.md)) |

**Analysis complete for the four that were flagged.** Two were reversed:
`currencies` (13,500 LOC) and `progress` (3,177 LOC) are **kept** — both are
generic infrastructure and both are used by modules we keep. See
[`salvage/flagged-four.md`](../salvage/flagged-four.md). The flag was worth
raising: it saved ~16,700 lines we would have had to rebuild.

## S3a — `customer_accounts` · risk high · **split, do not delete**

Known already, from the miss that produced this protocol.

| Step | Action |
|---|---|
| 1 | Full salvage analysis — there may be more than `domain_mappings` |
| 2 | Extract `domain_mappings` (`data/entities.ts:320-347`) into `directory`, with a migration repointing the table |
| 3 | Verify the hostname unique index and the lowercase/no-trailing-dot check constraint survive the move |
| 4 | Then remove the remaining ~25k LOC |

## S4 — ERP packages · risk medium

`checkout` (19,261) · `gateway-stripe` (2,232) · `sync-akeneo` (10,988) ·
`content` (1,383) · `onboarding` (4,645).

`content` and `onboarding` get careful analysis — a CMS and an onboarding-flow
engine are both plausibly useful to us under different names.

## S5 — The workforce three · RESOLVED: keep all three

`staff` (36,128) · `planner` (9,655) · `resources` (12,829) — **analysed, kept.**

They are the human half of our workforce model, depend on nothing we keep, and
nothing we keep depends on them. `planner` enabled; `staff` and `resources`
**parked** (code retained, module disabled).

**One repair required:** `staff/api/team-members/assignable/route.ts:14` imports
from `customers` — fix during that module's removal or the build breaks.

Analysis: [`salvage/workforce-three.md`](../salvage/workforce-three.md).

## S6 — Confirm the keep set · risk low

No deletion. Verify each kept module still builds, and record why it is kept:

`auth` · `directory` · `entities` · `query_index` · `audit_logs` ·
`business_rules` · `workflows` · `feature_toggles` · `translations` ·
`dictionaries` · `attachments` · `configs` · `notifications` · `messages` ·
`communication_channels` · `inbox_ops` · `integrations` · `data_sync` ·
`dashboards` · `perspectives` · `api_docs` · `api_keys` · `ai_assistant` ·
**`currencies`** · **`progress`** *(both reversed from the delete list)*

plus `events` · `queue` · `cache` · `scheduler` · `search` · `webhooks` ·
`storage-s3` · `ui` · `cli` · `shared` · `create-app`.

`communication_channels` + `messages` + `inbox_ops` (~78k) are kept on the
strength of `inbox_ops` being an AI agent module. If the email stack proves heavy,
this is the next reasonable cut — but it is a decision, not a default.

## S7 — Green the build · risk high

The gate, on the stripped tree. **This is also the P-13 verification that was
never run during the assessment.**

If it fails badly here — not a few broken imports, but structurally — that is a
finding that reopens the host decision in `planning/08`. Report it as such rather
than grinding through it.

## S8 — Archive · risk low

Move every stripped module to `workspace/attic/`, outside the build. Keep the
pre-strip tag.

Cost: nothing. Benefit: a module we later want back can be diffed against what we
removed, instead of being reconstructed from memory. See
[08 §9b](../../compai/planning/08-host-selection-and-migration-plan.md).
