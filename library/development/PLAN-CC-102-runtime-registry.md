# PLAN — `CC-102`: `SR-02` slice 2 — the runtime registry gets a writer, a retire and a heartbeat

**Row:** `CC-102` (register §5), phase 28, and the row that **indicts slice 1**.
**What this is:** a **build plan**, written before code, per §4.1, and read through §4.2's chain rule
(factory · gate · consumer · deleter).

---

## 1. What was measured — and the finding that changes the slice

### 1.1 The chain, read in order

| # | Link | Measured |
|---|---|---|
| 1 | **Factory** — who CREATES a runtime | `AiAgentRuntimeRepository.register()` (`:206-245`). **No production caller.** |
| 2 | **Gate** — who CHECKS it | `resolveTenantRuntime` (`agent-runtime-registry.ts:115-144`) → `listActive` / `findByBindingName` |
| 3 | **Consumer** — who uses the answer | `api/chat/route.ts:340` → `resolveAiRuntimePort`, and `resolve-ai-runtime-port.ts:184-189` |
| 4 | **Deleter** — who removes it | **Nobody.** There is no `retire()` and no other writer of `deleted_at`. |

**★ THE FINDING: the table has no writer at all.** `grep` over `packages/ai-assistant/src` and `apps/`
for `AiAgentRuntime` / `ai_agent_runtimes` outside tests returns the repository, the registry, the
entity and one comment in the chat route. **No route, no CLI, no service calls `register()`.**
`register()` is a method nothing calls — `SR-47`'s class, in the slice that exists to remove that class.

So `deleted_at` is not the only unwritten column: **every column is unwritten.** `retire()` would be the
*second* method nothing calls, `touch()` the third, and the upsert a rewrite of a path no caller reaches.
That is why this plan does not start with them.

### 1.2 The five gaps as the register states them, re-measured

| Gap | Measured now | Status |
|---|---|---|
| (1) No `retire()`; `deleted_at` has no writer | Confirmed — and **no writer of any column** | **Real, and larger than stated** |
| (2) `register()` throws on a daemon reboot | Confirmed — `:239` throws `AiAgentRuntimeConflictError` on `(tenant, org, daemon, provider)` | Real **once anything calls it** |
| (3) `daemon_id` is caller-supplied text | Confirmed — `@Property({ name: 'daemon_id', type: 'text' })`; nothing validates its shape | Real |
| (4) No liveness writer | Confirmed — **there is no `last_seen_at` column at all**; slice 1 refused it deliberately (`entities.ts` docblock: *"They land with the probe"*) | Real; the column lands here |
| (5) Null-org caller cannot see a tenant-level runtime | Confirmed — `listActive` filters `organizationId: ctx.organizationId ?? null`, an **exact** match, so an org caller sees only org rows and a tenant-level row (org null) is invisible; `resolve-ai-runtime-port.ts:184-189` then takes `resolveAiRuntimeEngine(env)` | **Real, and reachable today** |

Gap 5 is the only one reachable with today's code, because it needs no writer: an empty `listActive`
already produces the fallback the registry's docblock forbids (*"Deliberately not a fallback"*, `:46`).

### 1.3 The entity, as it stands

`id · tenant_id · organization_id · daemon_id (text, NOT NULL) · name · provider · metadata ·
created_at · updated_at · deleted_at`. **No `status`, no `last_seen_at`** — both refused in slice 1 with
the reason written in the docblock. Four partial unique indexes, the house nullable-`org_id` pattern.

---

## 2. The requirement

1. **Something can register a runtime.** A writer exists in production, or the rest is decoration.
2. **A reboot updates the row, not the table.** Registering the same `(tenant, org, daemon, provider)`
   again refreshes it and reports whether it was new.
3. **A runtime can be retired**, and every `deleted_at IS NULL` predicate then means what it says.
4. **A heartbeat can be recorded**, so "which machine is alive" is a fact rather than a guess.
5. **An org-scoped caller sees the tenant-level runtime** it is entitled to.
6. **A hostname is not an identity** — the daemon id must be stable across reboots, and the failure
   mode when it is not must be visible rather than a second live row.

---

## 3. Donor re-read — `multica-main`, at the cited lines

Read at source: `server/pkg/db/queries/runtime.sql:63-95` and `:176-195`,
`server/migrations/048_runtime_daemon_uuid.up.sql`, `server/migrations/251_agent_runtime_unbind.up.sql`.

### HARVESTED

| Donor fact | Where | What it changes |
|---|---|---|
| **Upsert on the identity tuple, returning `(xmax = 0) AS inserted`** | `runtime.sql:63-93` | `register()` becomes an upsert returning `{ row, inserted }`. The donor needs `inserted` for analytics (fire `runtime_registered` only on first registration); we need it because "first registration" is the only signal that a machine appeared. |
| **The conflict target must spell the partial index's predicate** | `runtime.sql:80-81` — `ON CONFLICT (…) WHERE profile_id IS NULL` | Our uniqueness lives in **two partial indexes** (org null / org not null). A bare `ON CONFLICT (cols)` cannot infer a partial index, so the SQL must name the matching predicate. This is the detail that makes the upsert work or fail at runtime. |
| **The heartbeat deliberately does not touch `updated_at`** | `runtime.sql:178-186` | `touch()` updates `last_seen_at` only. Keeping `updated_at` clean keeps the row HOT-eligible and stops every downstream `updated_at` watcher from firing once a minute. |
| **Return affected rows so the caller can detect a lost race** | `runtime.sql:190-193` | `touch()` returns the affected count. We have no `status` column to race with (refused, below), but the count is still how a caller learns the row was retired between its read and its write. |
| **A persistent daemon UUID, with `legacy_daemon_id` kept for audit** | `048_runtime_daemon_uuid.up.sql:1-6` | Validate `daemon_id` as a **uuid** at the repository boundary (a hostname can no longer be passed), and add `legacy_daemon_id` so a renamed identity stays traceable. |

### REFUSED, by name

| Donor fact | Where | Why not |
|---|---|---|
| **`status` (`online`/`offline`) as a column** | `runtime.sql:178-193` | Slice 1 refused it and was right: a status nobody sweeps is a claim nobody verifies. `last_seen_at` answers *"when did it last speak"*; `status` would answer *"is it online"* and need a sweeper to stay true. **We take the timestamp and refuse the verdict.** |
| **The whole unbind machinery** (two nullable columns, the `completed_at` CHECK, `NOT VALID`) | `251_agent_runtime_unbind.up.sql:1-45` | It exists because the donor's agents have a **foreign key** to a runtime and a cascade into task history. **Ours does not**: the binding is `text` in generic storage, so retiring a runtime destroys nothing and there is no cascade to disarm. The analogue is a **stale pointer**, which fails closed as `AiAgentRuntimeBindingNotFoundError`. Copying the machinery would add a constraint with nothing to constrain. |
| **`runtime_mode`, `device_info`, `owner_id`** | `runtime.sql:68-78` | Not needed to answer *"which process serves this tenant"*, and each is a column with no reader. |

---

## 4. The design

### 4.1 Migration — the two columns slice 1 withheld, and one it did not foresee

```sql
alter table "ai_agent_runtimes"
  add column "last_seen_at" timestamptz null,
  add column "legacy_daemon_id" text null;

create index "ai_agent_runtimes_tenant_last_seen_idx"
  on "ai_agent_runtimes" ("tenant_id", "last_seen_at" desc)
  where "deleted_at" is null;
```

`last_seen_at` is **nullable** on purpose: a row registered but never touched has no heartbeat, and a
default of `now()` would claim one. The index is the read path for "which of this tenant's runtimes is
alive", which is the question `SR-12` will ask.

### 4.2 Repository — three methods, one of them finally reachable

```ts
register(input, ctx): Promise<{ row: AiAgentRuntime; inserted: boolean }>   // upsert
retire(id, ctx): Promise<boolean>                                          // soft delete
touch(id, ctx): Promise<boolean>                                           // heartbeat
```

- **`register`** — raw SQL upsert inside the transaction, conflict target chosen by whether
  `organizationId` is null (the two partial indexes), `DO UPDATE SET name`, `metadata`, `last_seen_at = now()`.
  `RETURNING *, (xmax = 0) AS inserted`. Keeps the existing provider validation and the conflict
  translation for the **name** index, which is *not* the identity tuple and must still refuse.
- **`retire`** — `UPDATE … SET deleted_at = now() WHERE id = $1 AND tenant_id = $2 AND organization_id
  IS NOT DISTINCT FROM $3 AND deleted_at IS NULL`, returns `affected > 0`. Idempotent: retiring twice
  is `false` the second time, which is an honest answer rather than an error.
- **`touch`** — `UPDATE … SET last_seen_at = now() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS
  NULL`, returns `affected > 0`.

### 4.3 The writer — a CLI command, not a route

`register()` needs a caller. A route would need a new RBAC feature, CSRF handling and a tenant-scoped
authorisation decision that does not exist yet; the daemon that must register is a **process on a host**,
not a browser. So the entry point is a CLI command, following the module's existing `mcp:ensure-api-key`
precedent:

```
ai:runtime:register --daemon <uuid> --name <binding-name> --provider <engine> [--tenant <uuid>]
ai:runtime:retire  --id <uuid> --tenant <uuid>
ai:runtime:touch   --id <uuid> --tenant <uuid>
```

**This is the part that makes the slice real.** Without it, the three methods are the same
declaration-nothing-calls that `CC-102` was opened to remove.

### 4.4 Null-org visibility

`listActive` and `findByBindingName` currently match `organizationId` **exactly**. An org-scoped caller
must also see the tenant-level row (org null) — the same nullable-`org_id` rule the rest of the codebase
uses. The filter becomes `organizationId: { $in: [ctx.organizationId, null] }`, and the **ambiguity rule
is unchanged**: two visible rows still refuse.

This is the one fix that is reachable without a writer, so it lands first and is proven against the
current tree.

---

## 5. Proof plan

| # | Claim | Test | Fails before? |
|---|---|---|---|
| 1 | A reboot updates the row instead of throwing | repository test with a fake em asserting the upsert SQL + `inserted` | **yes** — it throws today |
| 2 | First registration reports `inserted: true` | same | **yes** |
| 3 | Retiring twice is idempotent | repository test | **yes** — no method |
| 4 | A retired row is invisible to `listActive` | repository test | **yes** |
| 5 | `touch` updates only `last_seen_at` | repository test asserting the SQL's SET list | **yes** |
| 6 | An org caller sees the tenant-level runtime | `resolveTenantRuntime` test | **yes** — today it returns null |
| 7 | Two visible runtimes still refuse | existing ambiguity test | no (guard) |
| 8 | A hostname is rejected as a daemon id | repository test | **yes** |

Mutation discipline: after green, revert each fix and confirm the matching test fails.

---

## 6. What this does not do

- **It does not add `status`.** The heartbeat is a timestamp; a verdict needs a sweeper.
- **It does not build the unbind machinery.** There is no foreign key to unbind, and the stale-pointer
  case already fails closed.
- **It does not make the daemon's id persistent.** It validates the *shape* (uuid) and records
  `legacy_daemon_id`; keeping one id across reboots is a daemon-side change (`SR-12`'s territory).
- **It does not add an HTTP route.** Recorded as a deliberate choice, with the reason above.

---

## 7. PROGRESS — increment 1 of 3 (2026-10-17, `b36e4ffa`)

| # | Item | State |
|---|---|---|
| 1 | **Null-org visibility** (§4.4) — an org caller now sees its org **and** the tenant-level rows | ✅ **DONE** — `organizationScope()`, 3 new tests, mutation-proven |
| 2 | **The ambiguity the widening creates** — a tenant-level `primary` and an org-level `primary` can both exist | ✅ **DONE** — `findByBindingName` refuses with `AiAgentRuntimeAmbiguousNameError`, naming both ids |
| 3 | **The columns** — `last_seen_at`, `legacy_daemon_id`, the partial liveness index | ✅ **DONE** — `Migration20261017170000`; the entity's docblock updated, because it had promised these columns *"land with the probe"* |
| 4 | `register()` as an upsert returning `inserted` | ⬜ **NOT STARTED** |
| 5 | `retire()` | ⬜ **NOT STARTED** |
| 6 | `touch()` | ⬜ **NOT STARTED** |
| 7 | `daemon_id` uuid validation | ⬜ **NOT STARTED** |
| 8 | **The CLI writer** that makes 4–7 reachable | ⬜ **NOT STARTED — and this is the one that matters** |

**Why 4–8 are one increment and not four:** they are worthless apart. A `retire()` with no
`register()` is the declaration-nothing-calls this row was opened to remove; a `touch()` with no
`last_seen_at` writer is a column claiming liveness nobody records. They land together or not at all.

**Proof for increment 1:** 33/33 across the repository and registry suites; reverting
`organizationScope` to the exact match fails the widening test (1 failed, file restored
byte-identical); `tsc -p packages/ai-assistant` 0.

**A note on the order.** Item 1 landed first because it is the only gap reachable **today** — it needs
no writer, and an empty `listActive` already produces the environment fallback the registry forbids.
Everything else waits on the writer, which is why the writer is item 8 and the headline of increment 2.
