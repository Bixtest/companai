# Salvage analysis — the workforce three

`staff` · `planner` · `resources` — 58,612 LOC · 20 tables

**Analysed:** 2026-08-08 · **Status: complete**
**Verdict: KEEP all three.**
**Protocol:** [`references/salvage-analysis.md`](../references/salvage-analysis.md)
**Rule applied:** [Cookbook Rule One](../COOKBOOK.md) — doubt resolves to keep.

---

## Why these were deferred rather than deleted

They sit in the middle of our own product. `staff` is literally called
"Employees"; our platform is about employees — human and AI — working under one
model. Deleting the human half before designing the whole would be building
blind.

---

## The finding: `staff` is the human half of our Worker Charter, already built

Our [Worker Charter](../../compai/planning/03-worker-charter.md) specifies a
worker's position, supervision, schedule and history. `staff` implements those
for humans:

| Charter section | `staff` equivalent |
|---|---|
| §2 Position — `role`, `department`, `teams[]`, `employment_state` | `staff_team_members` — `team_id`, `role_ids`, `display_name`, `user_id`, `is_active` |
| §2 — teams and roles as first-class | `staff_teams`, `staff_team_roles` |
| §13 Runtime envelope — `schedule: active_hours` | `availability_rule_set_id` → `planner` |
| §16 Provenance — history of what a worker was | `staff_team_member_job_histories` |
| Approval flow (02 §7) | `staff_leave_requests` — `submitted_by`, `decided_by`, `decided_at`, `decision_comment` |
| Cost attribution (03 §13) | `staff_time_projects.cost_center` |

**`staff_leave_requests` is the most interesting row.** It is a complete
request → decision → comment approval cycle with both actors and a timestamp
recorded. That is the shape our approval model needs, working, on this platform's
conventions.

**`staff_time_entries`** tracks effort per member, per day, per project, with
start/end segments. When we attribute AI cost per worker, the human equivalent
already exists and should look consistent with it — same shapes, one workforce.

## The dependency chain is clean

```text
staff  →  requires planner, resources
resources  →  requires planner
```

All three or none. And critically:

| Q | Finding |
|---|---|
| **Q2 — kept importers** | **None** for any of the three |
| **Q3 — declared by** | Only each other |
| **Q4 — surfaces** | Each ships `acl.ts`, `di.ts`, `events.ts`, `setup.ts`, `ce.ts`, `cli.ts`; `staff` also has `encryption.ts` |
| **Q5 — generic machinery** | `planner`'s availability rules are entirely generic; `resources` models anything bookable |
| **Q6 — string references** | Low |
| **Q7 — UI coupling** | None from kept modules |

**They depend on nothing we keep, and nothing we keep depends on them.** They are
a self-contained island — which is exactly what makes keeping them cheap.

## Their one link to the ERP is loose, not structural

`staff_time_entries` and `staff_time_projects` carry `customer_id`, `deal_id` and
`order_id`. These looked like hard dependencies on modules we are deleting.

They are **plain nullable `uuid` columns with no foreign key**:

```ts
@Property({ name: 'customer_id', type: 'uuid', nullable: true })
customerId?: string | null
```

Every `@ManyToOne` in the module points at `StaffTeamMember` — its own entity.
This follows the platform's stated rule: *"NO direct ORM relationships between
modules — use foreign key IDs, fetch separately."*

**Consequence:** deleting `customers` and `sales` leaves three nullable columns
that stop being populated. No broken constraints, no migration needed. They
become available for us to repoint at our own concepts — a time entry against a
**project** or a **case** rather than a sales order.

**One real repair needed:** `staff/api/team-members/assignable/route.ts:14`
imports `interactionRequestContext` from `customers`. That breaks when `customers`
goes. One import, one route — fix during the `customers` removal.

## Verdict and reasoning

**KEEP all three.** Under Rule One this needs no argument, but the positive case
is stronger than "when in doubt":

1. **It is our domain, not the ERP's.** Teams, roles, memberships, availability,
   leave approval and time tracking are the human side of the workforce model we
   are building.
2. **Zero coupling cost.** Nothing we keep depends on them; they depend on
   nothing we keep. Keeping them changes nothing structurally.
3. **They are a reference implementation.** When we build the AI-worker half, the
   human half should already exist so the two can be made to match — that is
   invariant **I1** (one work system) made concrete.
4. **`planner` is directly reusable.** Availability rule sets are what our
   Charter's `active_hours` needs, for humans and AI workers alike.

## What to do with them

**PARK, not KEEP-enabled** — with one exception.

| Module | State | Why |
|---|---|---|
| `planner` | **KEEP enabled** | Availability rules feed the Charter schedule directly; we will use it early |
| `staff` | **PARK** | Disabled in `modules.ts`, code retained. We are not running HR yet, but we read it while designing the Charter and will re-enable when the workforce model lands |
| `resources` | **PARK** | Same — retained for the bookable-resource model, not needed yet |

Parking keeps the repair burden on code we use while losing nothing. If the
distinction proves fussy in practice, enable all three — the cost is small.

## Risks

- **They will need updating after the six repairs**, like all retained code. They
  use the old boolean permission model and string-prefix identities.
- **`staff` is 36,128 LOC** — the largest thing we keep without actively using it.
  Reconsider at the S6 review if the repair burden proves heavy.
- **The `customers` import must be fixed** before or during that module's removal,
  or the build breaks.

## Action

1. Fix `staff/api/team-members/assignable/route.ts:14` during `customers` removal.
2. Set `staff` and `resources` to disabled in `modules.ts`; keep `planner` enabled.
3. Update `attic/CATALOG.md` — remove the "deferred" section; these are not attic.
4. Read `staff`'s team/role/membership model while writing the Charter schema, and
   record in `planning/03` where we deliberately match or diverge.
