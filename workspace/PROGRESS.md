# The roadmap — everything left, in order

**One line: the governance layer is built and verified. What remains is what
**Hermes** needs before it can act as an AI employee, what a server needs before
this is hosted, and the screens that make the whole thing operable by a person.**

**Arabic is dropped from this milestone** at the owner's instruction.

**The integration control plane is not part of this milestone.** The research is
sound and about a third of it we already built; its own estimate for a
production version is 220–380 person-weeks. Full reasoning:
[`references/integration-research-verdict.md`](references/integration-research-verdict.md).

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
| 10 | ✅ | **Re-verify the boot checks that used a cached build** | Done 2026-08-12. Several `build:packages --force` + `build:app --force` cycles today, each followed by a restart and a walk through the running instance. Routing, chrome, content pages and API docs all checked against a build known not to be cached ([[L38]]) | S |
| 11 | 💤 | **Native review of the Arabic** | Dropped from this milestone by the owner, 2026-08-12. `ar` still ships and falls back to English, which is harmless; only *wrong* translations would not be | S |

## The finish line — a checklist

**Everything below is mine and none of it needs the owner.** Plesk is dropped
from this milestone; hosting verification happens when there is a server.

*Kept here rather than in COOKBOOK.md because rule zero-three says one list, and
this is that list. The cookbook is how the work is done; this is what is left.*

Each item is **verified before it is started** — [[L42]]: a roadmap entry is a
claim about the past, not the present. Verified 2026-08-12.

| | Item | Verified state | Done |
|---|---|---|---|
| **14** | Correlation and causation ids | **Done 2026-08-12.** Correlation from the request container (one per request, by construction); causation parked on the runtime context under a **symbol**, so nothing arriving over HTTP can forge a causal chain. Both degrade to `null` rather than throwing — a missing id costs a trace, a throw would cost the write. 10 tests | ☑ |
| **16** | Finish command → capability mapping | **Done 2026-08-12. 54% → 98%** (55 of 56). Every capability referenced is one its module already declares — none invented. The one exception is the external-token path, documented in code, and a guard test fails if a new command arrives without a decision | ☑ |
| **13** | Give `ai_worker` a producer | **Done 2026-08-12.** A credential marked `principal_kind = ai_worker` issues an `ai_worker:` subject. Verified live: the journal and the ledger both record `ai_worker` for a real act, with a correlation id. Found and fixed a 500 on the way — adding a kind made every `=== 'service'` check silently partial | ☑ |
| **15** | Spend **metering** | **Done 2026-08-13.** Metering already existed; two things were wrong. `user_id` was `uuid not null` and the chat route passes `auth.sub` straight in — a 500 that item 13 made reachable. And a machine burning tokens was recorded identically to a person. Now mirrors `action_logs`: nullable `user_id`, plus `actor_kind` and `actor_id` | ☑ |
| **15b** | Budget **as a ceiling** | **Split out, not skipped.** Needs a per-model price table (external, volatile) and a limit policy (per tenant? per actor? per period? — a product decision). Not urgent: tokens × price is computable retroactively, so history is not lost by waiting. Attribution was not, which is why 15 landed now | ☐ |
| **19** | Phase G exit gate | **Done 2026-08-13** — `phase-g-exit-gate.test.ts`, the named artifact for what Phase G promised: a delegation ceiling, a project overlay and a record lock state all narrow the answer. Writing it taught me two of the three are **one input** by the time the resolver sees them — the enforcement service merges overlay and lock with `lowerOf` into `context.resourceCeiling`, and my first draft asserted a `projectCeiling` field that does not exist, which silently passed (L44). Each criterion is now checked where it actually lives | ☑ |
| **17** | Dependency advisories | **Done 2026-08-13, and the premise was wrong.** No advisory came from a parked module: the one **high** (`nanoid`) is transitive via the build toolchain, and all 27 **moderate** are `@react-email` **deprecation notices**, not vulnerabilities. `nanoid` pinned to 3.3.17 in `resolutions`; audit now reports no high/critical. The `@react-email` family being unmaintained is recorded as [U18](references/upstream-issues.md) — real maintenance risk, not a security one | ☑ |
| **18** | Production hardening | **Done 2026-08-13.** Two of the four claimed gaps were already closed: `storage_s3` exists (gated behind `OM_ENABLE_STORAGE_S3`) and `mercato auth rotate-encryption-key` exists. What was missing was a **runbook**, now §12 of `deployment.md`: backup schedule with a restore step, what to monitor and why, the rotation procedure, and multi-instance attachment storage. Zero-downtime deploy stays a stated gap — it is blue/green, genuinely separate work | ☑ |
| **21** | Governance screens | **4 of 5 done 2026-08-13** — delegations, denials, trust, projects. Each lists what is in force *and* what ended, because the question these get asked is "why could Sam not do that in March". None has a create form: delegations need a person and capability picker; trust promotion is refused unless the *evidence* passes, so a button would mostly return 409 and teach people the screen is broken; projects are three separate acts with three blast radii. Projects needed a new capability (`auth.projects.manage`), a read route and a `summaries()` aggregate kept off the resolver path. **Left: record locks — per-entity work on each record's own screen, the biggest of the five** | ☐ |
| **21b** | Seven guards name permissions nobody declared (U19) | **Found 2026-08-13.** `requireFeatures` gates seven pages on features absent from every `acl.ts`. They work only because `admin` holds a wildcard that happens to match — nobody can grant them to a narrower role, and the resolver cannot reason about them. Two parts: a guard test (cheap, stops the class permanently) and seven judgement calls about what each should actually be. Not a typo sweep | ☐ |
| **22** | Bulk approval with a diff | Not started | ☐ |
| **23** | Deputy cover and standing approvals | Not started | ☐ |
| **24** | Per-tenant approval expiry | Not started | ☐ |

**The order, and why:** 14 first — contained, and every later item benefits from
acts being traceable. Then 16 (mechanical, and it closes the gap Hermes widens),
13 (needs design), 15 (needs 13 to exist first). Then 19, 17, 18 — cheapest to
most invasive. Screens last, because they are the only ones a person can work
around.

**Done means:** the gate is green, it is verified against the running instance
where that is possible, and the documentation says what it does.


## Phase 3 — what Hermes needs before it arrives

**Hermes is the AI engine that lands next, inside the Starting Kit.** These are
not tidy-ups: each one is something that becomes permanently wrong, or
permanently missing, the moment a machine starts acting.

| # | | Task | Why it cannot wait for Hermes | Size |
|---|---|---|---|---|
| 12 | ✅ | **U7 — the journal tells a machine from a human** | **Was already done** (`ce7fb61`) and the roadmap was carrying the original finding as current state — the [[L36]] trap. Verified live 2026-08-12 with a real API key: the machine write recorded `actor_kind = service` against the key's id, the human write `actor_kind = human` against the person's. The one genuine gap was that the audit **screen** never showed it, so a key acting looked like a person whose name had not loaded. Now rendered as a tag beside the actor, in four locales |  S |
| 13 | | **Give `ai_worker` a producer** | The principal kind exists and **nothing creates one**. Until something does, no ceiling, delegation, trust grant or denial can target a machine, and the effect-class matrix — which exists to bound machines — never engages. Also the precondition for charter grants | M |
| 14 | | **Correlation and causation ids** | One Hermes task is many acts. Without a correlation id the ledger records events that cannot be assembled into *"what did the agent do for this request"* — which is the question a customer will ask first | M |
| 15 | | **Spend metering, then budget as a ceiling** | Hermes calls models, and models cost money. Today nothing meters spend, so no budget can bound it. This was blocked on "an AI actor exists"; Hermes *is* that actor | M |
| 16 | | **Finish command → capability mapping** | 54% of live commands are gated. The 46% ungated matters far more when the actor is a machine than when it is a person who can be asked afterwards | M |

## Phase 4 — before it goes on a server

| # | | Task | Why | Size |
|---|---|---|---|---|
| 17 | | **Prune parked-module dependencies** | 14 parked modules still carry their dependencies. A scanner flags their CVEs the moment this is reachable from the internet | M |
| 18 | | **Production hardening** | No backup schedule, no monitoring, secrets in a plain `.env` with no rotation, no zero-downtime deploy, no shared attachment storage for a second instance | L |
| 19 | | **Phase G exit gate** | Our own discipline gate: a test proving the resolver honours delegations, project overlays and lock states *each*, plus a changelog of what was grafted and from where | S |
| 20 | 🔒 | **Run the deployment guide on a real Plesk VPS** | Not one step has ever been executed on Plesk | M |

## Phase 5 — operable by a human

The governance layer works through APIs. A control nobody can see is a control
nobody uses.

| # | | Task | Size |
|---|---|---|---|
| 21 | | **Screens for delegations, record locks, trust, projects and denials** | L |
| 22 | | **Bulk approval, with a diff** — the diff is the feature | M |
| 23 | | **Deputy cover and standing approvals** | L |
| 24 | | **Per-tenant approval expiry** | S |

## Decisions waiting on the owner

| | Question | My recommendation |
|---|---|---|
| A | ✅ **Settled 2026-08-12.** The owner pushed back on parking the `example` modules and was right: the damage was presentational, not technical, while the module is the reference every `AGENTS.md` points at. **Kept, and gated behind `OM_ENABLE_EXAMPLES` (default off)** — the code stays, its tests keep running, every doc link still resolves, and a customer sees none of it |
| B | `apps/docs` is upstream's documentation **content**, not just their branding | **Drop it.** Renaming would ship somebody else's docs under our name |
| C | Real legal review of the new privacy/terms before commercial use | Worth a lawyer; fine for internal use now |

## Deferred by decision

| # | | Task | Why it waits |
|---|---|---|---|
| 25 | 💤 | Ledger Tier 2 — signed checkpoints | A customer's-auditor feature. No customer yet |
| 26 | 💤 | `domain_mappings` extraction | Per-tenant custom domains. Nothing needs it |
| 27 | 💤 | Orphaned-table decision (~127 tables) | Inert |
| 28 | 💤 | Charter grants | Needs 13 first, then the Charter compiler. Phase K |
| 29 | 💤 | **The universal integration control plane** | See [`references/integration-research-verdict.md`](references/integration-research-verdict.md). Its own estimate is **220–380 person-weeks**. Post-hosting, and only if a customer needs it |

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
