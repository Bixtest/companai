# PLAN — Row 21 / 21b (Phase 6, Audit / provenance): RE-MEASURED — the phase is BUILT

**Row:** `platform_points.md` LIST **row 21** (*"you can see who did what, when, on which record — and export it
for compliance"*, ID `P4`) and **row 21b** (*"audit history is independent of the business record — you cannot
edit your own past"*, ID `P4a`).
**What this is:** a **rule-0b re-measurement**, not a build. The appendix recorded `P4` as **`0/2` — *"no
sub-part verified in code this round"***. Measured this session, that is **stale**: the phase is built.

---

## 1. What was measured (rule 0b, 2026-10-11)

The module is `packages/core/src/modules/audit_logs/` — acl, 5 API routes, a backend viewer page, 3 services,
8 migrations, 8 service test files, `di.ts`, `setup.ts`, `cli.ts`.

| Facet | Measured | Evidence |
|---|---|---|
| **A read API** (who/when/which record) | **EXISTS, RBAC-gated** | `api/audit-logs/actions/route.ts` — `GET` only; `metadata.GET.requireFeatures: ['audit_logs.view_self']` (`:16`); `rbac.userHasAllFeatures` for `view_tenant`/`view_private` (`:165`, `:197`); filters by actor / resource / org; tenant+org scoping pushed into SQL. |
| **A viewer page** | **EXISTS and fetches** | `backend/audit-logs/page.tsx` (235 lines) — `readApiResultOrThrow('/api/audit_logs/audit-logs/actions')` + `/access`, renders the actions table + the access table with tabs/pagination/undo; `page.meta.ts` present. |
| **An export API** | **EXISTS** | `api/audit-logs/actions/export/route.ts` — `GET`, RBAC-gated, returns `serializeExport(prepared, 'csv')` with `content-disposition: attachment`. |
| **A hash-chained ledger** (tamper-evidence) | **EXISTS and is real** | `services/ledgerService.ts` — reads the predecessor's `hash` as `prevHash` (`:111-120`), feeds it into `computeLedgerHash` (`:125`), recomputes and compares on verify (`:262`), asserts `row.prev_hash === expectedPrevHash` (`:226`); `shared/lib/ledger/canonical.ts` `computeLedgerHash` covers `prevHash`; the DB enforces `unique(tenant_id, seq)` + `unique(tenant_id, hash)` (`Migration20260809170000.ts:43-44`); appends are serialised by a `pg_advisory_xact_lock`. |
| **The ledger is appended automatically** | **YES — not opt-in, no flag** | `services/actionLogService.ts:242` `await this.appendToLedger(...)` inside `log()`; the production caller is the **command bus** (`command-bus.ts:769 await service.log(...)`); `di.ts:9` registers the service and Awilix injects it. It records **`actorKind`** (human vs machine) from the raw subject. |
| **A verify path** | **EXISTS and is reachable** | `ledgerService.verifyTenantChain(tenantId)` (`:172`); the CLI exposes `ledger:verify` (`cli.ts:90-136`) and sets `process.exitCode = 1` on a break. |
| **Retention** | **EXISTS for the high-volume log** | `services/accessLogService.ts` `rotate()` (`:397`) — `AUDIT_LOGS_CORE_RETENTION_DAYS` (default **7d**) vs `AUDIT_LOGS_NON_CORE_RETENTION_HOURS` (default **8h**), `nativeDelete(AccessLog, …)` after each write (throttled by `AUDIT_LOGS_ROTATE_INTERVAL_MS`). |
| **The read API cannot edit history** | **YES** | The audit APIs export `GET` only; undo/redo are `POST` but **append** a new entry and flip only `executionState` on the source row — historical **content** columns are untouched. |

**Verdict:** `P4a` (read + create API and one viewer page) **is satisfied**; `P4b` (retention + export) **is
satisfied**; **row 21b** (history independent) **is satisfied** by the hash-chained ledger + its verify path.

---

## 2. The correction (rule 13)

The appendix's `P4` line — `▸ 0/2` *"no sub-part verified in code this round"* — was **never verified**, and
the phase has been built all along. Corrected to `▸ 2/2` with the evidence above, and LIST rows 21 / 21b flip
**🟡 → ✅**. **This moves the ONE NUMBER by +2 done** (`P4a` + `P4b`), re-derived by two routes.

**Also corrected:** LIST row 21b's ID was cited as **`P4a`**, which is the *read-API/viewer* sub-point — a
**mis-reference**. The audit sub-points are `P4` (parent) / `P4a` (API + viewer) / `P4b` (retention + export);
row 21b's own claim (history independent) rides the **ledger**, and now names it.

---

## 3. What the re-measurement found is genuinely MISSING (registered, not glossed)

A separate-agent hostile critic (8 claims, a command + output each) could **not** falsify the build — but it
found **three real cracks**, and two are register-worthy:

- **`CC-64` — an UNDO's trace entry bypasses the ledger.** `actionLogService.markUndone` builds its trace row
  via `createLogEntity` + `fork.persist` and **never calls `appendToLedger`**, so an undo's trace is
  **journal-only and unchained** (the same for `markRedone`'s state flip). A tamper-evidence gap in the one
  place the ledger exists to cover.
- **`CC-65` — `action_logs` has no retention path.** `rotate()` prunes **`access_logs`** only;
  `action_logs` (and `ledger_events`) grow unbounded. For `ledger_events` that is **intended** (pruning a row
  breaks the chain); for `action_logs` there is **no pruning path at all** — an unbounded-growth item, not a
  correctness bug.
- *(Not registered — stated, not hidden:)* **`action_logs` is mutable by design** — the `backfill-actor-kind
  --apply` and `projections:backfill` CLIs `UPDATE` derived columns in place. So the journal's integrity rests
  on the **ledger** (which digests the content), not on the table being immutable. That is the correct
  architecture; it is recorded here so nobody later reads "you cannot edit your own past" as "the table is
  write-once".

---

## 4. Acceptance (what "done" means for a re-measurement)

1. The appendix `P4`/`P4a`/`P4b` corrected to the measured state, with the evidence paths named.
2. LIST rows 21 / 21b → ✅, with the honest caveats inline.
3. The two real cracks registered (`CC-64`, `CC-65`) with triggers.
4. The ONE NUMBER re-derived by **two independent routes**.
5. The whole `audit_logs` module suite green (no code changed — this is a measurement).

---

*Source: `platform_points.md` §C `P4`/`P4a`/`P4b`; `COMPLETION-CALLBACKS.md`; the hostile-critic report.
Written 2026-10-11. If this plan disagrees with the code, the code wins and this plan is broken.*
