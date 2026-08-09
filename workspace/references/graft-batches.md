# Phase G — Graft batches

Eight pieces from Graph Portal Platform (P1). **P1's entire remaining edge is the
authority model** — everything else it has is superseded by a better Open Mercato
equivalent.

Source: `companai/Platform`. Salvage map:
[P1/03](../../compai/planning/platforms/01-graph-portal-platform/03-identity-and-salvage-map.md).

---

## The graft rule

**We re-implement P1's design in the host's idioms. We do not port P1's code.**

| Do | Do not |
|---|---|
| MikroORM entities in `data/entities.ts` | Copy Drizzle schemas |
| Awilix `di.ts` registration | Copy NestJS services or modules |
| Per-module migrations in the host format | Copy `packages/db/migrations` SQL |
| Follow the module conventions (`acl.ts`, `events.ts`, `i18n/`) | Introduce a second convention |
| Zod validators in `data/validators.ts` | Bring `class-validator` |

A grafted piece that still looks like P1 is a defect. It must read as though it
was always part of this codebase — that is what "organic" means, and it is the
whole point of choosing a host with strong conventions.

---

## G1 — Layered resolver with explanation trace · depends on **R5** · risk high

**What P1 has:** `permission.service.ts` resolves across eight ordered sources —
`bootstrap_capability`, `parent_portal_ceiling`, `explicit_deny`,
`project_overlay`, `record_policy`, `temporary_delegation`,
`direct_user`/`portal_role`/`group`/`team`, `platform_hard_rule` — accumulating a
`PermissionDecisionExplanation[]` through the whole evaluation.

**Take:** the *shape*. Ordered sources, deny-wins, an explanation entry appended
at every contributing step, and a `terminal` flag distinguishing denials that end
evaluation from those a later source could lift.

**Leave:** the binary effect, the code itself, and the load-all-then-filter query
pattern (`permission.repository.ts:84-88` selects every tenant rule and filters in
JavaScript — do not reproduce that here; compile predicates into SQL).

**Combine with:** Open Mercato's `mutationPolicy` restrictiveness ranking and
escalation rejection. P1 supplies the layering and the reasons; Open Mercato
supplies the ordering discipline. Neither alone is our resolver.

## G2 — Typed edges, ceilings, inheritance modes · depends on **R6** · risk high

**Take:** `relationship_type` (owns · manages · advises · serves · licenses ·
templates · supervises), `inheritance_mode` (strict · flexible · reference-only ·
none), and `permission_ceiling_id` per edge.

**Keep the host's** closure columns as the index. Schema only — no code moves.

## G3 — Temporary delegations · depends on **R1** · risk high

**Open Mercato has none at all.** P1's is complete and correct.

**Take:** the table (grantor, grantee, permission, optional project/object scope,
`starts_at`, `expires_at`, `revoked_at`, `revoked_by`, **mandatory `reason`**) and
the resolution logic: filter revoked, filter the time window, filter scope,
prefer the latest expiry.

**Change:** re-point both ends at **principals**, not users — so an AI worker can
hold a delegation. That is the whole reason R1 comes first.

## G4 — Project-level permission overlays · depends on **R5** · risk high

**Open Mercato scopes by tenant and organisation only** — verified absent.

**Take:** project workspaces with memberships carrying a `permission_overlay`, and
critically the **terminal deny** semantics — a project overlay that denies ends
evaluation rather than falling through.

**Change:** P1 encodes overlays as a string array with a `deny:`/`!` prefix
mini-DSL. Replace with typed grants; do not carry the DSL.

**Why it matters:** project, case and engagement contexts are central to our SRS
(FR-550, FR-560). Without this, scoping stops at the department.

## G5 — Record lock states · depends on **R5** · risk medium

**Take:** `lock_state` — `open` · `restricted` · `locked` — as a **floor** input
to the resolver: `locked` forces A0 on writes, `restricted` caps at A2, and
neither can be lifted by trust, delegation or a standing approval.

**Why it is now more important than first credited:** excluding
`packages/enterprise` leaves the MIT half with **no record locking at all**. This
is not an enhancement; it is the replacement for a capability we removed in S2.

## G6 — Event visibility scope · no dependency · risk low

**Take:** `visibility_scope` on the event envelope — `platform` · `tenant` ·
`portal` · `project` · `private`.

An event's audience is decided when it is written, not reconstructed at query
time. Without it, every audit query re-derives sensitivity from the payload and
one careless report leaks a private event into a shared timeline.

One column and a filter. Cheapest item on this list.

## G7 — Locale direction policy · no dependency · risk low

**The split:** Open Mercato has the *capability* — Radix primitives accept
`dir="rtl"` — but ships **four LTR locales** (de, en, es, pl) and has no
direction *policy* layer. P1 has the policy: `inferTextDirection()` with a
ten-language RTL prefix set, `LocalizedText`, `readLocalizedText()`, locale
pattern validation and graceful fallback — **111 dependency-free lines**.

**Take:** the policy layer into `packages/shared`. Add `text_direction_policy` to
portal/tenant configuration. Add an RTL locale to prove it end to end — Arabic is
in scope.

**Keep the host's** i18n *enforcement* (`yarn i18n:check-hardcoded`,
`check-values`, per-module allowlists), which is better than P1's. Policy from
P1, enforcement from the host.

## G8 — Migration advisory lock · no dependency · risk low

P1's `migrate.mjs` wraps the whole run in `pg_advisory_lock(733702121)`, runs each
file in its own transaction, and releases in `finally`.

**First check whether MikroORM's runner already does this.** If it does, close
this batch as "already covered" and record that. If it does not, add the advisory
lock — concurrent boots racing migrations is a real production failure and the
fix is a few lines.

---

## Exit gate for Phase G

- Every grafted piece reads as native to the host — no Drizzle, no NestJS, no
  second convention.
- The resolver takes **all** its inputs: capability risk class, task grade, data
  classification, record lock state, graph ceiling, charter grant, delegation,
  invoker authority, trust, budget.
- A denial renders as one plain sentence naming the binding rule (**I6**).
- Delegations, project overlays and lock states each have a test proving the
  resolver honours them.
- `planning/CHANGELOG.md` records what was grafted and from where.
