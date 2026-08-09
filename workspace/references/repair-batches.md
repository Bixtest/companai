# Phase R — Repair batches

Six foundation fixes, in order. Each makes the next cheaper. **No feature work
until all six land** — every module built on top inherits the shape.

Evidence for each defect: [P2 forensic](../../compai/planning/platforms/02-open-mercato/01-forensic-analysis.md).

---

## R1 — Principal abstraction · risk **high** · part of the spike

**Defect.** A non-human actor exists (`sub: 'api_key:<id>'`, `isApiKey`, own
roles and scope — better than P1, which could not represent one at all), but the
*kind* is a string prefix re-parsed at each site. **30 files** branch on
`startsWith('api_key:')` or `isApiKey`, across `auth`, `audit_logs`, `customers`,
`messages`, `resources` and `ai-assistant`.

That is the `if (type === x)` pattern **I2** forbids: asymmetry in code rather
than in data.

**Fix.**

1. A `principals` table with `kind`: `human | ai_worker | service | system`, plus
   the per-kind optional attributes (`planning/03 §2`).
2. `AuthContext` carries a resolved principal, not a prefixed string.
3. RBAC resolves grants by principal, not by parsing `sub`.
4. Migrate all 30 branch sites. Find them with the same grep, and **re-run it at
   the end — zero matches is the exit gate.**
5. Existing users and API keys become principals by migration; ids stay stable.

**Watch for:** sites that branch implicitly — a `userId` that is sometimes a
prefixed string. Search for `sub` and `userId` usage in RBAC and audit paths, not
only for the prefix literal.

**Spike question:** does this land in roughly two weeks? If it metastasises into
every module, the foundation is not reshapeable and `planning/08 §9a` applies.

## R2 — Audit coverage, then atomicity · risk **high**

**Rescoped 2026-08-09 after the owner's testing.** R2 was written as a
correctness problem with the audit writes that happen. The larger problem is that
**for most modules the write never happens.**

### R2a — Coverage (do this first)

**Defect.** Action-log entries are written by the **command bus**. A module only
reaches it if it defines `commands/` and its CRUD route declares `commandId`s.
**9 of 25 enabled modules do.** Creating and revoking an API key — a credential —
is unrecorded. So are custom-entity schema changes, business rules, workflows,
system config, and integration credentials. Detail:
[upstream-issues.md](upstream-issues.md) → U1.

**The obvious fix is the expensive one.** Converting each module to commands
means a `commands/` implementation (~1,000 lines for `currencies`) plus route
wiring, across eight modules.

**The leverage point instead.** `makeCrudRoute` has exactly two write paths:

```text
useCommand = !!opts.actions?.<op>        → command bus   → audited
otherwise  → opts.<op> direct handler    → NOT audited
```

The direct path already resolves the actor, the entity and its identifiers — it
passes them to `emitCrudSideEffects`. Everything an audit record needs is present
at that point. **Writing the audit entry there covers every current and future
CRUD route in one change**, instead of eight module rewrites.

**What that path cannot give**, and must not pretend to: the command bus's undo
payload and redo envelope. A factory-level entry records *what happened* — actor,
entity, action, before/after — not *how to reverse it*. That is the right split:
audit is a record, undo is a capability, and a module that needs undo still
declares commands.

**Steps.**

1. Write the audit entry from the CRUD factory's direct-write branch, with the
   same actor resolution the command path uses.
2. Mark those entries as non-undoable so the Action Log's undo controls stay
   honest — do not render an undo button for something that cannot be undone.
3. Verify against the running platform: create and delete an API key, then check
   the Action Log actually shows both.
4. Re-measure coverage. Anything still unaudited after this is a **custom** route
   that bypasses the factory, and gets handled case by case.

### R2a-custom — the modules the factory does not reach

**Scoped 2026-08-09 by inspection, correcting two earlier guesses.**

**Guess 1, wrong:** *"33 route files need wiring."* That counted HTTP write
verbs. Many are **operational actions** — clearing a cache, re-checking health —
which change no persistent state and have nothing to audit.

**Guess 2, wrong:** *"`configs` holds system configuration that goes
unaudited."* Its four write routes clear caches and in-memory telemetry and run
upgrade actions. **None writes to the database.** That claim came from the
module's *name*, which is precisely the mistake **L1** describes.

**Guess 3, also wrong — my own detector.** A first pass grepped for direct ORM
calls and reported `integrations/credentials` as a non-writer. It persists
through `credentialsService`. Detecting mutation by ORM keywords misses every
service-mediated write, which is most of them (**L3** — verify the tool before
trusting the measurement).

**Corrected scope: 19 routes across 4 modules.**

| Module | Mutating routes | What is at stake |
|---|---|---|
| `workflows` | 6 | Definitions created, customized, reset; instances advanced and retried |
| `data_sync` | 6 | Mappings, schedules, run cancellation |
| `attachments` | 4 | Files added, moved between partitions, removed |
| `integrations` | 3 | **Credentials**, connection state, version |
| `configs` | **0** | Operational actions only — nothing to audit |

**`integrations/credentials` is the most important single route in this list.**
It stores the secrets that let this platform act on external systems.

#### Why not a dispatcher-level net

Every module route passes through one dispatcher
(`apps/mercato/src/app/api/[...slug]/route.ts` → `handleRequest`), so a single
audit call there would cover everything automatically and could never be
forgotten. It was rejected for two reasons:

1. **The transaction belongs next to the write.** Making a dispatcher-level entry
   fail closed means holding a database transaction open across the whole
   handler — including the external HTTP calls that `integrations` and
   `data_sync` make. Long-lived transactions across network calls are a worse
   defect than the one being fixed.
2. **`access_logs` already occupies that layer**, and records reads only. Writes
   belong in `action_logs` with what changed, not a second route-level trace.

**Coverage is instead made a build-time property:** a test that fails when a
mutating route in these modules has no audit call. That prevents "someone adds a
route and forgets" without holding transactions open — which is the actual
benefit the dispatcher idea was reaching for.

#### Steps

1. Per route: call the audit service inside the transaction that performs the
   write, tolerating an absent service and letting a write failure propagate —
   the same contract as `writeDirectWriteAuditLog`.
2. Where a route has no transaction, give it one first. `delete` in the CRUD
   factory needed exactly this.
3. Add the coverage test.
4. Verify live: change something in each module and confirm it appears in the
   Action Log.

**Order within the batch:** `integrations` first — credentials are the highest
stake — then `attachments`, `data_sync`, `workflows`.

### R2b — Atomicity and fail-closed

**Defect.** Business writes are atomic (`runCrudCommandWrite` →
`withAtomicFlush(..., { transaction: true })`). The audit write is not:
`ActionLogService.log()` opens `this.em.fork()` — a separate transaction — and
the bus calls it *after* `handler.execute()` has already committed.

Worse, `persistLog` **fails open**: it resolves the service in a `try/catch` and
returns `null` on failure. A committed change can exist with no record, and
nothing reports it.

**Fail-closed only makes sense together with transactional.** Throwing on a
failed audit write while the business write has already committed is *worse* than
silence — the caller sees an error for a change that actually happened. The two
halves are one change.

#### Feasibility — established 2026-08-09, before starting

**It works, and the platform is already built for it.** `withAtomicFlush` carries
a re-entrancy guard:

```ts
// packages/shared/src/lib/commands/flush.ts
const isInTransaction = (em as { isInTransaction?: () => boolean }).isInTransaction
if (typeof isInTransaction === 'function' && isInTransaction.call(em)) {
  await runPhasesAndFlush()   // join the caller's transaction
  return
}
```

So if the **command bus** opens a transaction on the request EM before
`handler.execute()`, every handler's own `withAtomicFlush({ transaction: true })`
joins it rather than nesting, and the outermost caller owns commit and rollback.

**The risk that had to be checked was side-effect ordering.** Events, indexing
and cache invalidation must fire *after* a commit, never inside it — otherwise an
event announces a change that then rolls back. The current order is:

```text
line 256  handler.execute()        business write, commits its own transaction
line 292  persistLog()             audit write, separate fork() — the defect
line 319  flushCrudSideEffects()   events / indexing / cache
```

Side effects already run **after** the audit write. So the new boundary is:

```text
begin (bus owns it)
  handler.execute()    → withAtomicFlush joins the active transaction
  persistLog()         → same EM, no fork()
commit
flushCrudSideEffects() → unchanged, still after the commit
```

**Ordering is preserved exactly.** That was the open question, and it is closed.

#### Steps

1. **Command bus** — wrap `handler.execute()` and `persistLog()` in one
   transaction on the request EM. Commit before `flushCrudSideEffects`.
2. **`ActionLogService.log()`** — persist on the transactional EM. Never
   `fork()`, which escapes the transaction and reintroduces the defect.
3. **Fail closed, precisely.** Keep tolerating an *absent* `actionLogService` —
   the `audit_logs` module can legitimately be disabled. Let a *write failure*
   propagate, so the transaction rolls back. These are different failures and
   only one of them means "we lost a record".
4. **The CRUD factory's direct path** (`writeDirectWriteAuditLog`, added in R2a)
   gets the same treatment. Its fail-open behaviour is documented there as
   deliberate and temporary, pending exactly this step.
5. **`skipLog` and the skipped-resource-kinds list stay** — but as explicit
   opt-outs, never as silent failures.

**The test that proves it:** force the log write to throw; assert the business
row does not exist afterwards. Without that assertion this batch is unverified.

**Risk: high.** This touches the execution path of every write in the platform.
It is worth its own batch, its own gate, and a live verification pass — not a
tail-end change appended to something else.

## R3 — Append-only ledger · risk **high**

**Defect.** `action_logs` is mutable *by design* — `execution_state` transitions
`done → undoing` via `nativeUpdate`, plus soft delete. There is no `REVOKE`,
rule or trigger on any audit table. It is a **command journal**, which is the
right thing for undo and the wrong thing for proof.

**Fix.** Add a ledger *alongside*; do not convert the journal.

1. Hash-chained append-only events (`planning/06 §2`), one chain per tenant.
2. Database-enforced immutability — revoke UPDATE and DELETE on the ledger table.
3. Signed acts for the consequential set (`planning/06 §2 Tier 2`).
4. The journal keeps doing undo; the ledger records what happened.

**Do not** try to make `action_logs` immutable. Undo needs to mutate it. Two
records, two jobs.

## R4 — Capability descriptor · risk medium

**Defect.** A feature carries `id`, `title`, `module` and `dependsOn`. Broad
coverage, **no risk semantics**: no effect class, reversibility, data
classification or amount binding.

**Fix.** Extend the `acl.ts` feature shape with the descriptor in
`planning/02 §4`: `effect_class`, `reversibility`, `compensation`,
`data_classes`, `external_effect`, `amount_binding`, `default_grade_floor`,
`delegable`, `standing_approvable`, plus `allowed_mutations`, `scope_rules`,
`evidence_required` and `audit_event_type` (the last four adopted *from* this
platform's own `AiToolContract` thinking).

Backfill existing features with conservative defaults — unknown effect class
resolves to the most restrictive gate, per **fail-closed**.

## R5 — Decision with reasons · risk **high** · part of the spike

**Defect.** `checkAuthorization` returns a boolean plus a `console.warn`. Our
**I6** requires the *reasons* to be in the return value.

**Fix.**

1. Return a `Decision` object: `{ gate, reasons[], binding_rule, obligations[],
   alternatives[], denial_kind: terminal | recoverable }`.
2. Replace boolean allow/deny with the six-level ladder (`planning/02 §2`),
   resolved most-restrictive-wins.
3. Keep the dispatcher as the single chokepoint — it is already right, and it is
   this platform's best structural asset.
4. **Fold `mutationPolicy` in** rather than replacing it: its three levels,
   restrictiveness ranking and escalation rejection are already correct
   (`forensic §10.5`), just scoped only to AI mutations. Generalise it.

**Spike question:** can the dispatcher return a rich decision without every
handler changing? If the boolean is load-bearing across hundreds of call sites,
that is the signal.

## R6 — Typed org edges and ceilings · risk **high**

**Defect.** `organizations` is a materialised-path tree with excellent traversal
(`tree_path`, `ancestor_ids`, `descendant_ids`) but **untyped edges and no
authority ceilings**.

**Fix — the synthesis, not a replacement.**

1. Add an edge table with `relationship_type`, `inheritance_mode` and
   `authority_ceiling` (from P1 — this is G2).
2. **Keep the closure columns** as the resolution index. A ceiling lookup becomes
   an array containment test instead of a recursive walk — which answers the
   performance worry in `planning/07 Q16`.
3. Feed the graph ceiling into the R5 resolver as a ceiling input.

Neither platform had both halves. This is the first place the graft strategy
produces something better than either donor.
