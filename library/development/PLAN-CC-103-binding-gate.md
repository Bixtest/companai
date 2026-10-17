# PLAN — `CC-103`: the binding gate fails open for every non-`ai_worker` principal

**Row:** `CC-103` (register §5), phase 20b, **security, high**.
**What this is:** a **build plan**, written before any code, as the donor re-read rule requires. It records
what was measured, one correction to the register's own claim, the requirement, the design, the donor
enrichment in both directions, and the proof that will make it true.

---

## 1. What was measured (2026-10-17, from source)

### 1.1 The gate

`packages/ai-assistant/src/modules/ai_assistant/lib/agent-binding.ts:52-54`:

```ts
// Human (or other non-AI-worker) principals are not subject to the binding check.
if (principal.kind !== 'ai_worker') {
  return { bound: true, toolAllowlist: null, requiredFeatures: [] }
}
```

`PrincipalKind = 'human' | 'ai_worker' | 'service' | 'system'`
(`packages/shared/src/lib/auth/principal.ts:28`). So the branch admits **`human`, `service` and `system`** —
every kind except the one it was written for. A `service` credential returns `bound: true` with
`toolAllowlist: null`, which `computeBoundRunScope` (`:97-100`) turns into **the agent's full declared tool
list**. The binding is a narrowing grant; a service principal receives the un-narrowed maximum.

The route above it requires only `ai_assistant.view` (`api/ai/chat/route.ts:191`,
`metadata.POST.requireFeatures`), then calls the resolver at `:552` and refuses only when
`binding.bound === false` (`:557-563`).

### 1.2 The type already knew

`ResolvedAgentBinding` (`:13-19`) declares:

```ts
{ bound: false; reason: 'no_binding' | 'not_ai_worker' }
```

`'not_ai_worker'` **is never produced anywhere in the repo**. The intent to deny non-workers was written into
the type and never implemented. The docstring 23 lines above the branch says *"A **human** principal is never
bound here"* (`:28-29`) — the code says *"not ai_worker"*. **The code is broader than its own doc, and the
broader reading is the one that shipped.**

### 1.3 The existing test asserts the hole as intended behaviour

`lib/__tests__/agent-binding.test.ts:112-123`:

> `it('treats a service principal (api_key:) as unbound', ...)`
> *"A service key is not an ai_worker, so it is NOT subject to the binding check — it keeps today's behaviour"*

So this is not an accident of a missing branch; it is a **deliberate passthrough** whose justification is the
same sentence the docstring uses for humans. The test will have to **invert**, and that inversion is the proof.

### 1.4 The binding table has no `principal_kind`

`migrations/Migration20261010180000_ai_agent_bindings.ts:15-29` — `principal_id uuid not null`, no kind column.
The table keys on the credential id. It *can* hold a service key's id, but the resolver never asks, so a
service binding would be inert.

### 1.5 The manage path accepts any non-empty string

`api/ai/agents/[agentId]/bindings/route.ts:29` — `principalId: z.string().min(1, 'principalId is required')`.
No uuid check, no existence check, no `principal_kind` check, no tenant match. The row is written with whatever
id was supplied.

### 1.6 `agent_id` is only normalised at the HTTP boundary

`route.ts:17` — `const agentIdPattern = /^[a-z0-9_]+\.[a-z0-9_]+$/`, enforced on the **path param only**. The
table stores `agent_id text` with no CHECK, and the two partial unique indexes
(`Migration20261010180000:33-41`) compare it exactly. A seed, a SQL fix or any future writer can insert
`CRM.Sales` beside `crm.sales`; the indexes will not stop it, and `findBinding` will not find it.

---

## 2. A correction to the register's own claim (rule 13)

`CC-103` says: *"`derivePrincipal` … resolves a context as `service` when `auth.isApiKey === true` EVEN WITHOUT
the `ai_worker:` prefix (:127 …) — so an **ai_worker key** on a legacy or cached envelope resolves as `service`
and passes the gate."*

**Measured by running the real function** (`node --experimental-strip-types`, six encodings):

| `sub` | `isApiKey` | resolves to |
|---|---|---|
| `ai_worker:abc` | `true` | **`ai_worker`** |
| `ai_worker:abc` | absent | `ai_worker` |
| `api_key:abc` | absent | `service` |
| `abc` (bare) | `true` | **`service`** |
| `abc` (bare) | absent | `human` |

The ternary at `:137` is `kind: isAiWorker ? 'ai_worker' : isService ? 'service' : 'human'` — **`isAiWorker` is
tested first, so the prefix always wins.** An `ai_worker:` subject cannot be demoted to `service` by
`isApiKey`. **That half of the register's claim is false.**

What *is* true, and is the real residual: a context with `isApiKey: true` and a **bare, unprefixed** subject
resolves to `service` and passes the gate. Reachability: the only production writer of `isApiKey: true` is
`shared/src/lib/auth/server.ts:369`, and it always pairs it with a prefixed subject built at `:357`
(`aiWorkerSubject`/`apiKeySubject`). So the combination is **not reachable from the auth boundary** — only from
a hand-built context (a trusted envelope constructed wrong, or a test).

**Consequence for severity:** the *primary* finding stands and is reachable — **every `service` API key with
`ai_assistant.view` runs any agent, unbound, with the full tool list.** The `principal.ts:127` sub-claim is
**latent, not reachable**, and is recorded as corrected rather than repeated. The fix closes both anyway,
because it stops asking what kind the principal *claims* to be and starts requiring the kind it must *be*.

---

## 3. The requirement

1. **A machine principal may not run an agent unbound.** Only `human` passes without a binding row.
   `service`, `system` and any future kind go through the table and are refused when no live row matches.
2. **A binding may only name a principal that can hold one** — it exists, is not deleted, is an `ai_worker`
   credential, and belongs to the caller's tenant.
3. **`agent_id` is normalised at the data layer**, so a writer that bypasses the HTTP route cannot create a
   second spelling of the same agent.
4. **Each of the three is proven**, not asserted: a test that fails before the change, and a mutation that
   proves the test can fail.

---

## 4. The design

### 4.1 The gate — `agent-binding.ts`

```ts
// A human runs agents directly; the binding table governs machines only (B4).
if (principal.kind === 'human') {
  return { bound: true, toolAllowlist: null, requiredFeatures: [] }
}

// Every other kind is a machine. Only an ai_worker can hold a binding, so a
// service/system principal is refused here rather than passed through: the
// binding is a grant, and a credential that cannot be bound holds none.
if (principal.kind !== 'ai_worker') {
  return { bound: false, reason: 'not_ai_worker' }
}
```

This finally **produces** `'not_ai_worker'`, the reason the type has carried since it was written. The
unidentifiable-principal guard at `:47-49` stays exactly as it is.

### 4.2 The routes — surface the reason, do not change the code

Both call sites (`chat/route.ts:557`, `actions/[id]/confirm/route.ts:207`) already map `!bound` to `403`
`agent_not_bound`. **Keep the code** — *"this agent is not bound to this principal"* is precisely true for
`not_ai_worker`, and changing a public error code would break clients for no gain. The message gains the
reason.

### 4.3 The manage path — validate at write time

`bindings/route.ts` POST, after the schema parse and before the mutation guard:

- `principalId` must be a **uuid** (schema: `z.string().uuid()`);
- look the row up in `api_keys`: it must exist, `deleted_at IS NULL`, `principal_kind = 'ai_worker'`, and
  `tenant_id` must equal the caller's;
- refuse with `400` `validation_error` and a message naming which of the four failed.

Doing this **before** the mutation guard keeps the guard's payload honest — a rejected binding never enters
the approval pipeline.

### 4.4 The data layer — one migration

```sql
alter table "ai_agent_bindings"
  add constraint "ai_agent_bindings_agent_id_format_ck"
  check ("agent_id" ~ '^[a-z0-9_]+\.[a-z0-9_]+$');

create index "ai_agent_bindings_tenant_agent_lower_idx"
  on "ai_agent_bindings" ("tenant_id", lower("agent_id"));
```

The CHECK makes the second spelling **unrepresentable**, which is stronger than normalising on read. The
`lower()` index is the lookup path a case-insensitive read would need if one is ever added.

**Risk, stated:** the CHECK fails the migration if any existing row is non-conforming. That is the intended
behaviour — a silent `NOT VALID` would leave the defect in place. The table is five days old and has one
writer (the route, which enforces the pattern), so the risk is low; if it fires, the offending row is named by
the error and is a data defect worth seeing.

---

## 5. Donor re-read — the enrichment question, both directions

Read at the source, not the digest: `multica-main/server/internal/handler/agent_access.go` and
`zulip-main/zerver/migrations/0295_case_insensitive_email_indexes.py`.

### HARVESTED

| Donor fact | Where | What it changes here |
|---|---|---|
| **"private (or any unknown mode) is deny-by-default"** | `agent_access.go:86-90` | The shape of §4.1: the branch tests for the **one** kind that passes (`human`) instead of the one that fails. An unknown future kind lands on the deny side by construction. |
| **"never trust the immediate principal, only the resolved human originator at the top of the chain"** | `agent_access.go:74-79` | Recorded, not built: it says a machine's authority should be traced to the human it acts for. Our `Principal.onBehalfOfUserId` carries that fact and the binding deliberately keys on the **credential**, which is the right axis for "which machine". Noted as a follow-up question for `SR-07`, not silently adopted. |
| **A constraint that makes the second spelling unrepresentable** | `0295_case_insensitive_email_indexes.py:11-17` — `UniqueConstraint(F('realm'), Upper(F('email')))` | §4.4. The donor's move is to constrain the *normalised* form, not to remember to normalise. |

### REFUSED, by name

| Donor fact | Where | Why not |
|---|---|---|
| **The workspace-broad exception** — an agent/system actor with **no** human originator is admitted to a `public_to workspace` target | `agent_access.go:97-107` | It is the exact fail-open this gate exists to prevent, and the donor itself calls it *"a DELIBERATE, product-approved exception"* — i.e. it needed a product decision to exist. We have no equivalent decision, so we do not inherit one. |
| **`PermissionMode` as the grant** | `agent_access.go:86` | A mutable per-agent field; ours is a per-`(principal, agent)` row, which can be revoked for one machine without touching the agent. |
| **zulip's dual `email`/`delivery_email` columns** | `0295_…py:11-24` | Two identity columns, two keys to keep in sync — the one-truth defect `SR-39` exists to catch. |

---

## 6. Proof plan

| # | Claim | Test | Fails before the change? |
|---|---|---|---|
| 1 | A `service` principal is refused | invert `agent-binding.test.ts:112` to expect `{bound:false, reason:'not_ai_worker'}` | **yes** — it currently expects `bound:true` |
| 2 | A `system` principal is refused | new case | **yes** |
| 3 | A `human` still passes without a DB read | existing `:76-85` unchanged | no (guard) |
| 4 | An `ai_worker` still resolves from the table | existing `:60-74` unchanged | no (guard) |
| 5 | The manage route rejects a non-`ai_worker` principal | route test: `principal_kind='service'` → 400 | **yes** |
| 6 | The manage route rejects a cross-tenant principal | route test | **yes** |
| 7 | `agent_id` cannot hold a second spelling | migration CHECK — verified by the constraint text and a DB-level assertion where a DB is available | n/a |

Mutation discipline: after the tests pass, flip §4.1 back to `!== 'ai_worker'` and confirm tests 1 and 2 go
red. A test that cannot fail is not a proof.

---

## 7. What this does not do

- It does not add a `principal_kind` column to `ai_agent_bindings`. The manage-time check makes a wrong row
  unrepresentable through the API; a direct SQL writer could still insert one, and the resolver would ignore it
  harmlessly (it never reads the table for a service principal).
- It does not touch the `principal.ts:127` fallback. The measurement above says it is latent, and changing the
  encoding resolver has a blast radius across nine call sites. Recorded as corrected, not "fixed" on a
  guess.
- It does not decide whether a service principal *should* be able to run agents at all. Under this change the
  answer is: **only with an explicit binding row**, which the table can hold today. That is the smallest
  change that closes the hole without inventing a product decision.

---

## 8. DISCHARGE RECORD — what was built, and what the hostile critic found

**Built (code repo, `packages/ai-assistant`):**

| # | Change | File |
|---|---|---|
| 1 | The gate tests for the one kind that passes (`human`), then refuses every other non-`ai_worker` kind with `not_ai_worker` — the reason the type has always declared and nothing produced | `lib/agent-binding.ts` |
| 2 | `principalId` is a uuid; POST looks the key up and refuses unless it exists, is not deleted, is `ai_worker`, and matches the caller's tenant — before the mutation guard | `api/ai/agents/[agentId]/bindings/route.ts` |
| 3 | DELETE's `principalId` is a uuid too (was a 500 with raw Postgres text echoed back) | same |
| 4 | `agent_id` CHECK + `lower(agent_id)` index | `migrations/Migration20261017160000_…` |

**★ The hostile critic found two HIGH defects in the first attempt, and both were real.**

1. **A second dispatch route bypassed the gate entirely.** `api/chat/route.ts` (not `api/ai/chat/route.ts`) runs `ai_assistant.chat` through `resolveAiRuntimePort` + `port.startRun` with only `ai_assistant.view`. It never called `resolveAgentBinding` — and it **could not**: `ai_assistant.chat` is not a code-declared agent, so the manage surface 404s and no binding row can ever name it. **FIXED:** the route now refuses every non-`human` principal with `403 human_principal_required`, and gained its **first test** (it had none).
2. **A regression on the MCP path.** `lib/auth.ts` hardcoded `apiKeySubject()`, so every MCP caller resolved as `service` — including an `ai_worker` key. Harmless while `service` passed the gate; the moment it stopped, **every** MCP call to `business_ir.*` was refused, correctly-bound workers included. **FIXED:** the subject now carries the key's kind, exactly as the auth boundary does (`shared/src/lib/auth/server.ts:357`). `RbacService.loadAcl` parses both prefixes and resolves permissions from the same key row (`rbacService.ts:320`), so no permission changed — only the kind is now true.

**Why both survived the first attempt, recorded because it is the transferable part:** the binding-coverage gate detects a dispatch site by looking for `runAiAgentText`/`runAiAgentObject`. Since `CC-67` moved dispatch behind a port, a route can start a run by calling `resolveAiRuntimePort(...)` and never name either marker — so the gate was blind to the door. **FIXED:** `resolveAiRuntimePort` is now a dispatch marker, the door's definition file is excluded (it matches its own `export function` line), and two new pins assert that every door caller is either binding-gated or principal-gated, and that a principal-gated route really does refuse non-humans.

**One thing the critic got right that I had not:** `system` has no live path to an agent (its only producer feeds the command bus, not a route). The `system` test therefore pins a real kind, not a reachable attack — recorded so the test is not mistaken for evidence of an exploit.

**A breaking change, stated plainly:** a **`service` API key can no longer run any agent.** Under this change it must be an `ai_worker` key with a binding row. That is the posture the register asked for, and it is the point of the fix — but an existing service-key integration calling `/api/ai/chat`, `/api/ai/run-object`, `actions/confirm` or the MCP tools will now get `403 agent_not_bound`. **Upgrade path:** mark the key `principal_kind = 'ai_worker'` and create a binding. No data migration is required, and the binding table can hold a service key's uuid but the resolver no longer consults it.

**Proof (all run, exit codes captured directly):**

| Check | Result |
|---|---|
| `agent-binding.test.ts` | 10/10 pass; mutation (restore the old branch) → **2 failed**, file restored byte-identical |
| `bindings.route.test.ts` | 11/11 pass; mutation (remove the kind check) → **1 failed**, restored |
| `api/chat/route.test.ts` (new) | 4/4 pass |
| `binding-coverage.test.ts` | 16/16 pass; mutation (remove the new guard) → **1 failed**, restored |
| The 10 affected suites together | **113 passed / 113**, no suite failed to load |
| `tsc -p packages/ai-assistant` | **0** |

**The migration — PROVEN on a real PostgreSQL 16, not merely written.** My first discharge record said
*"not applied to a database here (none available)"*. That was true of the project's own database, but not
of the claim: Docker was available, so the SQL was run against a throwaway `postgres:16-alpine` with the
table created exactly as `Migration20261010180000` defines it. Four cases, all as designed:

| Case | Result |
|---|---|
| **Before the fix** — insert `crm.sales` and `CRM.Sales` for the same principal | **both accepted** — the defect reproduced |
| **Apply the CHECK while the bad row exists** | **fails**: *"check constraint … is violated by some row"* — it reports the defect instead of installing silently |
| **Apply after removing the bad row** | `ALTER TABLE` + `CREATE INDEX` succeed |
| **Insert `CRM.Sales` afterwards** | **refused**: *"new row … violates check constraint"* |
| **Insert `customers.deal_analyzer`** | accepted — a legitimate id still works |
| **Indexes present** | `ai_agent_bindings_tenant_agent_lower_idx` created; 2 rows kept |

The container was removed afterwards; nothing was left running.

**What is still not done, named:** the migration has not been applied to the **project's own** database —
none is configured in this environment — so the first real deployment will run it for the first time.
That is an ordinary migration risk, not an unknown: the four current agent ids
(`business_ir.query_author`, `business_ir.query_runner`, `customers.deal_analyzer`,
`customers.deal_analyzer_tool_loop`) all match the pattern, and the route is the only writer. **Adjacent,
not caused here:** `CC-100` — the MikroORM snapshot is stale and consumed, so `migrator.create()` may
diff against a snapshot that does not know this table. This migration is raw SQL and does not depend on
the snapshot; generating the *next* one does.

---

## 9. A THIRD DEFECT, found by being asked to explain the breaking change

The owner asked, in plain words, whether he should be happy that a `service` key can no longer run an
agent. Answering that honestly required checking **who mints service keys** — and the answer was: the
product does.

**`CreateApiKeyInput` had no `principalKind` field.** So `createApiKey` — the one function every caller
uses — could only ever produce a key with `principal_kind = null`, which resolves as **`service`**. Two
of its callers exist specifically to hand a machine a credential to drive the AI tools:

| Caller | What it is | Was minting |
|---|---|---|
| `api/ai/mcp-key/route.ts` | the settings screen's "create MCP key" | a `service` key |
| `lib/mcp-ensure-api-key.ts` | `mcp:ensure-api-key`, the provisioned path | a `service` key |

So the breaking change would not have hit some hypothetical third-party integration — **it would have
hit the product's own MCP setup**, on both paths. The gate would have refused every MCP client, and the
message would have said `agent_not_bound`, which points at the binding table rather than at the key.

**FIXED:** `CreateApiKeyInput` gained `principalKind?: 'service' | 'ai_worker'`; `createApiKey` writes it
(`?? null`, so every existing caller is unchanged and still means `service`); **both** MCP creators pass
`'ai_worker'`. The generic `api_keys` CLI deliberately keeps the `service` default — it is a general
tool, and a key it makes for an agent is refused loudly rather than quietly privileged.

**A fourth defect, found in the same check — the cache invalidation used the wrong prefix.**
`createApiKey` and `deleteApiKey` both called `invalidateUserCache(apiKeySubject(id))`. But the ACL cache
is keyed by the **subject string**, and an AI-worker key's subject is `ai_worker:<id>` — so invalidating
`api_key:<id>` **missed**, leaving the `ai_worker:<id>` entry live until its TTL. A deleted key could keep
resolving its old permissions for that window. **FIXED:** both now derive the prefix from the key
(`keySubjectFor(record)`), so the two cannot drift.

**Proof:** `mcp-key/route.test.ts` and `mcp-ensure-api-key.test.ts` assert `principalKind: 'ai_worker'`
(14/14 pass); removing **both** lines makes **2 tests fail** (restored byte-identical); the
`apiKeyService` suites pass 11/11; `tsc` is 0 for **both** `core` and `ai-assistant`.

**Why the hostile critic did not find this:** it reviewed the gate and its callers, not the code that
**issues** credentials. A security review that stops at "who can call this" misses "who is allowed to
exist". Recorded as a gap in the review method, not just in the code.
