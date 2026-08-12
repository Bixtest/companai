# The roadmap — everything left, in order

**One line: the Starting Kit is built. 16 of 16 batches are in, every resolver
input that can be supplied is supplied, and what remains is one feature, the
verification nobody has done yet, and the surfaces we deliberately deferred.**

**This is the only plan.** If a task is not on this list it is not tracked, and
the owner should not be the one who remembers it (COOKBOOK rule zero-three).
Order is mine to set; anything can be pulled forward on request.

| Tag | Meaning |
|---|---|
| ⏳ | next up |
| 🔒 | needs the owner — I cannot do it |
| ⛔ | blocked on something that does not exist yet |
| 💤 | deferred by decision, not forgotten |

The record of everything already done, with the reasoning:
[`references/completed-work.md`](references/completed-work.md).

---

## Phase 1 — finish the Starting Kit

| # | | Task | Why | Size |
|---|---|---|---|---|
| 1 | ⏳ | **Explicit deny** | Owner chose this 2026-08-11. Platform 1 can deny one person a permission their role grants; we cannot, so the only way to take one away is to remove the whole role. Only ever *takes* permissions away, so it fits the existing design and cannot make anything less safe. This is the last of G1 | M |
| 2 | ⏳ | **Full gate green, captured in full** | Outstanding since the U11 fix: the mock was corrected after the last full run. Must be run with output captured to a file — never piped through `tail` ([[L38]], and the flake whose evidence that destroyed) | S |

## Phase 2 — verify what nobody has checked

Nothing here is speculative. Each is a place where something may be broken and no
human or test has looked.

| # | | Task | Why | Size |
|---|---|---|---|---|
| 3 | 🔒 | **Test the approvals page end to end** | Six click-by-click steps in `references/how-to-test.md`. The page loads; approving, rejecting and the A3 veto are untested | S |
| 4 | 🔒 | **U4 — can a superadmin delete a currency?** | The route derives `organizationId` from `selectedOrganizationId ?? auth.orgId ?? undefined`. For a superadmin with no organization selected that is still `undefined` — the original bug's shape | S |
| 5 | | **Verify `messages.manage` / `messages.actions`** | The only 2 of 113 capability descriptors classified from their titles rather than from code, because no route enforces them | S |
| 6 | 🔒 | **Native review of the Arabic** | `ar` ships so the RTL policy is testable. Untranslated keys fall back to English and are harmless; *wrong* translations are not | S |
| 7 | | **Re-verify the boot checks that used a cached build** | [[L38]]: `yarn build:app` was a Turbo cache hit, so earlier "the server boots and the route resolves" checks may have run stale bundles. The gate is unaffected — Jest runs from source | S |

## Phase 3 — the surfaces we deferred on purpose

Each of these shipped an API and no screen, deliberately, so the control would
bind before it was pretty. None is a surprise; all are recorded at the time.

| # | | Task | Why | Size |
|---|---|---|---|---|
| 8 | | **Screens for delegations, record locks, trust and projects** | Four features with working APIs and no page. Locking belongs on each record's own screen (per-entity work); the other three want one screen each | L |
| 9 | | **Bulk approval, with a diff** | The diff is the feature. A button that approves several acts without showing how they differ is a button for approving things unread | M |
| 10 | | **Deputy cover and standing approvals** | Both need a name — a deputy, a grantor — so both are inherently settings. Standing approvals need a mandatory expiry and a visible count of what they let through | L |
| 11 | | **Per-tenant approval expiry** | Decided with the owner and recorded as unbuilt. 24h is enforced in `PendingActService`; the knob is not there | S |

## Phase 4 — the record can be trusted

| # | | Task | Why | Size |
|---|---|---|---|---|
| 12 | | **U7 — the journal cannot tell a machine from a human** | `action_logs.actor_user_id` stores an API key's UUID with no record that it was a key. That is invariant **I2**, and telling them apart is the premise of the product | M |
| 13 | | **Ledger correlation and causation** | Both fields are recorded when a caller supplies them, and nothing supplies them. Until something threads a correlation id, the chain records events that cannot be assembled into a trace | M |
| 14 | | **Ledger Tier 2 — signed checkpoints** | R3's chain is verifiable only by us. A signed root in append-only storage lets a customer's auditor verify a range without our cooperation | L |

## Phase 5 — before it goes on a server

| # | | Task | Why | Size |
|---|---|---|---|---|
| 15 | | **Phase G exit gate — assertions and changelog** | The gate wants a test proving the resolver honours delegations, project overlays and lock states *each*, plus `planning/CHANGELOG.md` recording what was grafted and from where | S |
| 16 | 🔒 | **Run the deployment guide on a real Plesk VPS** | `references/deployment.md` is derived from the repo and the working local instance. **No Plesk step has ever been executed** | M |
| 17 | | **Production hardening the guide names** | No zero-downtime deploy, no backup schedule or monitoring, secrets in a plain `.env` with no rotation, no shared attachment storage for a second instance | L |
| 18 | | **Close out U5, and prune parked-module dependencies** | U5's record is stale — two more flake causes were found and fixed since. And parked modules carry CVEs a scanner will flag the moment this is hosted | M |

## Blocked — the preconditions do not exist

| # | | Task | Precondition |
|---|---|---|---|
| 19 | ⛔ | **Charter grants** | An AI worker entity (`ai_worker` is a type with no producer) **and** the Charter compiler. Phase K |
| 20 | ⛔ | **Budget as a resolver input** | Spend metering: what an act costs, what an actor has spent, a limit. None exist |

Both would *narrow*, so their absence leaves answers more permissive than the
design intends but never more permissive than the RBAC check that already ran.

## Deferred by decision

| # | | Task | Why it waits |
|---|---|---|---|
| 21 | 💤 | `domain_mappings` extraction | Per-tenant custom domains. Wanted, nothing needs it yet |
| 22 | 💤 | Orphaned-table decision (~127 tables) | Inert. Revisit only as a deliberate backed-up migration |
| 23 | 💤 | Phase K checkpoint | The scheduled date that stops "we'll clean up later" being a lie |

---

## The 16 batches — the milestone view

Kept because it is how the Starting Kit was scoped, and it is now complete.

| # | Batch | State |
|---|---|---|
| 1 | **S — Park** | ✅ 2026-08-08 |
| 2 | **R1 — Principal abstraction** | ✅ 2026-08-09 |
| 3 | **T — Test debt** | ✅ 2026-08-09 |
| 4 | **R2 — Audit coverage and atomicity** | ✅ 2026-08-09 |
| 4b | **R2c — Decisions about machine output** | ✅ 2026-08-09 |
| 5 | **R3 — Append-only ledger** | ✅ 2026-08-09 |
| 6 | **R4 — Capability descriptor** | ✅ 2026-08-09 |
| 7 | **R5 — Decision with reasons** | ✅ 2026-08-09 |
| 8 | **R6 — Typed org edges** | ✅ 2026-08-09 |
| 9 | **G1 — Layered resolver + explanation trace** | ✅ shape delivered by R5; **explicit deny is roadmap item 1** |
| 10 | **G2 — Org edges, ceilings, inheritance** | ✅ covered by R6 — verified 2026-08-10 |
| 11 | **G3 — Temporary delegations** | ✅ 2026-08-11 |
| 12 | **G4 — Project permission overlays** | ✅ 2026-08-11 |
| 13 | **G5 — Record lock states** | ✅ 2026-08-11 |
| 14 | **G6 — Event visibility scope** | ✅ 2026-08-11 |
| 15 | **G7 — Locale direction + RTL** | ✅ 2026-08-11 |
| 16 | **G8 — Migration advisory lock** | ✅ 2026-08-11 |

After the roadmap above is clear, **Phase K** begins — our own kernel, the actual
product. That is a separate plan and is not counted here.

---

*Updated at the end of every batch. If this disagrees with the code, the code wins
and this file is broken — fix it.*
