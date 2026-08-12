# The roadmap — everything left, in order

**One line: the Starting Kit is feature-complete. 16 of 16 batches are in, every
resolver input that can be supplied is supplied, and what remains is the
verification nobody has done yet plus the surfaces we deliberately deferred.**

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
| 1 | ✅ | **Explicit deny** | Done 2026-08-12, **migration applied and verified on the running instance**: withholding `currencies.*` from the superadmin turned a 200 into a 403, and lifting it from the terminal with nobody logged in turned it back. Subtracts only — a test asserts it is not even *called* when the ACL said no. This closes G1. See [`knowledge/denials.md`](knowledge/denials.md) | M |
| 2 | ✅ | **Full gate green, captured in full** | Done 2026-08-12: **22/22 tasks, 12,851 tests, 6m09s, zero cached**. 12,845 + the 6 new U11 edge tests = 12,851, so the new guards demonstrably ran. Output captured whole to a file — never through `tail` ([[L38]], and the flake whose evidence that destroyed) | S |

## Phase 2 — verify what nobody has checked

Nothing here is speculative. Each is a place where something may be broken and no
human or test has looked.

| # | | Task | Why | Size |
|---|---|---|---|---|
| 3 | ✅ | **The approvals page, end to end** | Done 2026-08-12, **through the screen itself**. The owner logged the in-app browser in, so the card, both buttons and both outcomes were verified by clicking: **Reject** → *"Rejected. It will not run."*, card gone, name unchanged; **Approve and run** → the rename executed. Test state restored afterwards (name, ceiling back to A5, enforcement back to `shadow`) | S |
| 4 | ✅ | **U4 — a superadmin could not delete a currency** | Reproduced live 2026-08-12 (`400 expected string, received undefined`), fixed, and re-verified (`{"ok":true}`). `currencyDeleteSchema` required an `organizationId` that **nothing reads** — the boundary is enforced by `ensureOrganizationScope` against the loaded record — so it gated nothing and rejected the one actor who has no organization. Now optional in the currency and exchange-rate delete schemas, with 10 tests | S |
| 5 | ✅ | **U12 — a deleted row kept its unique code forever** | Done 2026-08-12. Both constraints are now partial unique indexes (`where deleted_at is null`); entities drop `@Unique` since it cannot express a partial index, and the migration owns it — the `users_tenant_email_hash_uniq` pattern. Verified live: the `XTS` code blocked since 2026-08-09 creates again, and a **live** duplicate is still refused. The undo collision it creates is refused with a 409 naming the conflict, 6 tests | M |
| 6 | ✅ | **U14 — map live commands to capabilities** | Done 2026-08-12: **38% → 54%** of live commands gated, and the one that mattered is bound — `messages.email` (E3, irreversible, external) now binds to the send. Neither static answer was true: saving a draft and sending it are the same command with a flag, so `capability` may now be **a function of the input**. One call site reads it, a plain string is unchanged, and a classifier that throws degrades to ungated rather than failing the write. The 26 still ungated contain no irreversible external act | M |
| 7 | ✅ | **O1 — a denial lifted from the CLI left no record** | **My defect, made and fixed 2026-08-12.** The audit write moved from the route into `DenialService`, so every caller is recorded and the route no longer double-writes. Verified by planting a denial and lifting it from the console: audit rows 2 → 3, no user, `context_json` recording `origin: server-console, actorKind: system`. Six tests, including that a repeat lift writes nothing and an absent `audit_logs` module does not block the lift | S |
| 8 | ✅ | **U15 — the demo feedback feature, removed** | Started as "`DEMO_MODE` fails open"; the endpoint behind the bubble turned out to be **public** (`requireAuth: false`), to send email, and to default to a named personal address at the upstream vendor. Deleted outright per the owner's standing permission: widget, demo notice bar, endpoint, email template, tests, and 28 orphaned translation keys — mirrored into the create-app template so it cannot be scaffolded back | M |
| 9 | ✅ | **U16 — real privacy policy and terms** | Done 2026-08-12. The owner offered "short generic ones, or rebrand theirs"; the first was taken, because rebranding would bind our users under a licence grant and governing law drafted for a Polish company nobody here has read. Written from scratch, naming **the operator** as responsible rather than us, and stating that the activity record outlives a closed account — the one clause this product cannot promise away. Contact on `corprorate.com`. **Worth a lawyer before commercial use** | S |
| 10 | | **Re-verify the boot checks that used a cached build** | [[L38]]: `yarn build:app` was a Turbo cache hit, so earlier "the server boots and the route resolves" checks may have run stale bundles. The gate is unaffected — Jest runs from source | S |
| 11 | 🔒 | **Native review of the Arabic** | `ar` ships so the RTL policy is testable. Untranslated keys fall back to English and are harmless; *wrong* translations are not | S |

## Phase 3 — the surfaces we deferred on purpose

Each of these shipped an API and no screen, deliberately, so the control would
bind before it was pretty. None is a surprise; all are recorded at the time.

| # | | Task | Why | Size |
|---|---|---|---|---|
| 12 | | **Screens for delegations, record locks, trust, projects and denials** | Five features with working APIs and no page. Locking belongs on each record's own screen (per-entity work); a denial belongs on the person's record as well as in a list; the other three want one screen each | L |
| 13 | | **Bulk approval, with a diff** | The diff is the feature. A button that approves several acts without showing how they differ is a button for approving things unread | M |
| 14 | | **Deputy cover and standing approvals** | Both need a name — a deputy, a grantor — so both are inherently settings. Standing approvals need a mandatory expiry and a visible count of what they let through | L |
| 15 | | **Per-tenant approval expiry** | Decided with the owner and recorded as unbuilt. 24h is enforced in `PendingActService`; the knob is not there | S |

## Phase 4 — the record can be trusted

| # | | Task | Why | Size |
|---|---|---|---|---|
| 16 | | **U7 — the journal cannot tell a machine from a human** | `action_logs.actor_user_id` stores an API key's UUID with no record that it was a key. That is invariant **I2**, and telling them apart is the premise of the product | M |
| 17 | | **Ledger correlation and causation** | Both fields are recorded when a caller supplies them, and nothing supplies them. Until something threads a correlation id, the chain records events that cannot be assembled into a trace | M |
| 18 | | **Ledger Tier 2 — signed checkpoints** | R3's chain is verifiable only by us. A signed root in append-only storage lets a customer's auditor verify a range without our cooperation | L |

## Phase 5 — before it goes on a server

| # | | Task | Why | Size |
|---|---|---|---|---|
| 19 | | **Phase G exit gate — assertions and changelog** | The gate wants a test proving the resolver honours delegations, project overlays and lock states *each*, plus `planning/CHANGELOG.md` recording what was grafted and from where | S |
| 20 | 🔒 | **Run the deployment guide on a real Plesk VPS** | `references/deployment.md` is derived from the repo and the working local instance. **No Plesk step has ever been executed** | M |
| 21 | | **Production hardening the guide names** | No zero-downtime deploy, no backup schedule or monitoring, secrets in a plain `.env` with no rotation, no shared attachment storage for a second instance | L |
| 22 | | **Close out U5, and prune parked-module dependencies** | U5's record is stale — two more flake causes were found and fixed since. And parked modules carry CVEs a scanner will flag the moment this is hosted | M |

## Blocked — the preconditions do not exist

| # | | Task | Precondition |
|---|---|---|---|
| 23 | ⛔ | **Charter grants** | An AI worker entity (`ai_worker` is a type with no producer) **and** the Charter compiler. Phase K |
| 24 | ⛔ | **Budget as a resolver input** | Spend metering: what an act costs, what an actor has spent, a limit. None exist |

Both would *narrow*, so their absence leaves answers more permissive than the
design intends but never more permissive than the RBAC check that already ran.

## Deferred by decision

| # | | Task | Why it waits |
|---|---|---|---|
| 25 | 💤 | `domain_mappings` extraction | Per-tenant custom domains. Wanted, nothing needs it yet |
| 26 | 💤 | Orphaned-table decision (~127 tables) | Inert. Revisit only as a deliberate backed-up migration |
| 27 | 💤 | Phase K checkpoint | The scheduled date that stops "we'll clean up later" being a lie |

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
| 9 | **G1 — Layered resolver + explanation trace** | ✅ shape delivered by R5; explicit deny closed it 2026-08-12 |
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
