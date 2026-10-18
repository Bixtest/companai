# PLAN-CC-126 — the tenant-visible type catalogue

**Status:** requirement, measured 2026-10-18 (night). Build follows — no code was written
for this phase, per the owner's rule.
**Row:** `CC-126` in `library/development/MASTER-CHECKLIST.md` §5.
**Answers the owner's clause:** *"bulk packaged capabilities, so a standardised agent is
cheap to create"* — under D1 (*the platform admin sets the ceiling, tenants narrow it*).
**Sibling of `CC-122`** (the hire): this row gives the catalogue a data layer; the
instance that pins a version is the next row, deliberately split.

---

## 1. The defect, measured

The type catalogue has exactly one layer, and it is code:

- `AiAgentDefinition` (`lib/ai-agent-definition.ts:290-409`) is a TypeScript
  interface. The registry that holds the instances (`lib/agent-registry.ts`) is a
  **module-level `Map`** (`:16`), and `getAgent(id)` takes only an id (`:301`) —
  global and unscoped. Merging tenant rows into that map would be a cross-tenant
  read by construction.
- Every tenant-side row is an **override of a code-declared agent**:
  `AiAgentPromptOverride` (`data/entities.ts:50`), `AiAgentRuntimeOverride` (`:254`),
  `AiAgentMutationPolicyOverride` (`:667`), `AiTenantModelAllowlist` (`:614`). Each
  carries the paired partial unique indexes on `(tenant_id, [organization_id,]
  agent_id, …)` — **the schema itself assumes `agent_id` names something that
  already exists in code.**
- The management surface proves the assumption: the per-agent route 404s on an
  unknown agent (`api/ai/agents/[agentId]/bindings/route.ts:205-207`). Nothing
  anywhere **creates** an agent definition; every surface decorates one.

**Consequence:** a tenant can **narrow** a platform type and cannot **create** one.
The owner's *"cheap to create"* clause works for the platform and not for a tenant.

**And a data row alone would be the `CC-101` shape — a thing nothing calls.**
`checkAgentPolicy` refuses an id the registry does not hold
(`lib/agent-policy.ts:167-174`, `agent_unknown`), and `computeBoundRunScope`
resolves `agent?.allowedTools ?? []` (`lib/agent-binding.ts:131-132`) — an unknown
id yields the **empty** tool set. So a type row without runtime resolution is an
agent that appears in the catalogue and can never run. **The data layer and the
tenant-scoped resolver are one change, not two.**

## 2. The chain (CREATES · CHECKS · CONSUMES · DELETES)

Read all four, not the one the row named:

| Step | Who | Form today |
|---|---|---|
| **CREATES** | code only — `populateFromAgents` throws on a duplicate id (`agent-registry.ts:193-195`) | no writer for a definition row exists anywhere |
| **CHECKS** | `checkAgentPolicy` (`agent-policy.ts:157`) → `getAgent(agentId)` | the registry and nothing else; a tenant row is invisible to the gate |
| **CONSUMES** | `api/ai/chat/route.ts:566,600` · `api/ai/run-object/route.ts:158,188` · `lib/agent-tools.ts:337,385` · `lib/business-ir-author.ts:164` | five sites, all resolving through the global registry |
| **DELETES** | nothing | no retire path for a code agent; and in the override family `deleted_at` has **no writer** (`CC-102`'s measurement — every `where deleted_at is null` is inert) |

The DELETES row decides a schema question: **a new soft-delete column with no
writer would repeat the defect `CC-102` measured.** The type row gets a `status`
with a real writer instead.

## 3. ★ The correction this owes the register row

**The row prescribes "owning tenant or null for platform" — that is the sentinel
the same row refuses, one paragraph later.** `tenant_id IS NULL` meaning *platform
level* is a value every query must remember to exclude: the `CC-103` class (a
permit written as a default), and plan §7's refusal by name (*a magic tenant id
for "platform level"*). The platform already answered this once — `RoleAcl.tenant_id`
is `NOT NULL`, commented *"Tenant scope is mandatory for ACL evaluation"*
(`auth/data/entities.ts:346-347`) — and even system roles live in a tenant.

**The platform layer needs no row, because it already has a home: the code
registry.** The row's own correction paragraph says so — *a TYPE has two layers,
shipped by the platform or created by a tenant* — and the shipped layer **is**
`AiAgentDefinition`. So the type row is **always tenant-owned**: `tenant_id NOT
NULL`, no nullable variant, no sentinel. The catalogue is the **union of two
homes** (code + this table), not one table with a magic value.

**Second correction: the row says the bundle is "validated at write time as a
subset of the platform ceiling". The ceiling has no store** — that is `CC-128`'s
own first measurement (no plan, feature, limit or settings table exists anywhere
in `packages/`). What write-time validation *can* hold today is built; what
cannot is refused rather than faked:

- The tool registry is a mutable singleton populated by explicit `registerTool`
  calls (`lib/tool-registry.ts:14`, with `unregisterTool` at `:53`), so membership
  is **load-order dependent** — which is why the code catalogue itself tolerates
  unregistered names (`api/ai/agents/route.ts:79`, `registered: Boolean(tool)`).
  Making tool registration a write-time invariant would refuse valid types in a
  pre-generate build or the standalone MCP process.
- So: **shape is validated at write; per-tool authority is enforced at run**
  (`agent-policy.ts:197-204`, `tool_unknown`). The ceiling-subset check arrives
  with `CC-128`'s store and is named there — not faked here.

**Third correction (found while writing the migration, Rule 13): the row's
"paired PARTIAL unique indexes" prescription does not apply here.** The pair
exists for the override tables because their `organization_id` is **nullable** —
a plain unique over `(tenant, org, agent, …)` lets `(t, o, c, NULL, 'a')` duplicate
freely, which is why those tables carry one partial index per null-combination.
This table has **no org column** (§6), so there is one nullable column fewer and
one index: a plain unique over `(tenant_id, key)`, **not** partial on
`status = 'active'`. What protects the retired key is that the index covers
*every row regardless of status* — a partial-on-active index would make a
retired key reusable, which is the re-pointing failure the index exists to
prevent. Carried in §4.2.

## 4. The fix

**1. `AiAgentType`** — the thirteenth `Ai*` entity (`data/entities.ts`):
`tenant_id` **NOT NULL** · `key` text carrying the **same dialect CHECK as
`ai_agent_bindings.agent_id`** (`^[a-z0-9_]+\.[a-z0-9_]+$` — `Migration20261017160000:30-31`)
because the key must flow through the binding/override machinery, which is
text-keyed and dialect-constrained · `label`, `description` · `bundle` jsonb (the
JSON-safe subset, §4.5) · `version` int · `status` (`'active' | 'retired'`) ·
timestamps. **No `organization_id`** (§6) and **no `deleted_at`** (§2).

**2. One plain unique index over all rows regardless of status** —
`(tenant_id, key)`, not partial on `status = 'active'`. A retired key is **never
reusable**: re-creating it would silently re-point every binding written for the
old definition at the new one. The row's *"paired PARTIAL unique indexes"*
requirement is about a nullable `organization_id`; with no org column there is
one index and no pair.

**3. `Migration20261018120000_ai_agent_types.ts`** — house style, and the CHECK
**ships with the table in the same migration**, not as a later `alter`: a table
that exists unconstrained for even one migration is a window in which the second
spelling is representable. The docblock carries the standing rule: if this
migration fails, it is reporting a real defect.

**4. `AiAgentTypeRepository`** — tenant-scoped exactly like
`AiAgentBindingRepository` (the context carries `tenantId`; no wildcard, no
cross-tenant fallback): version bump on edit, `retire` as the only delete, and
a **key-collision refusal against existing rows** at write — active or retired
alike, carried as a typed error the route maps to 409, with the unique index
as the backstop. **★ Amended at build, 2026-10-18 (night), by re-measuring
where the check can live:** the requirement first placed the *code-registry*
collision check here too. The data layer must not import the code registry —
`agent-registry` loads the generated module and pulls the provider chain with
it, and `AiAgentRuntime.provider`'s precedent (validate the vocabulary at the
boundary against a lib that imports nothing) points the other way. More
fundamentally, **the guarantee never lived at the write**: resolution is
code-first (§5), so a tenant-authored definition cannot run under a
platform-claimed key even if a collision slipped through. The loud half is
the route's (it already loads the registry), the fail-closed half is the
resolver's.

**5. `lib/agent-type-catalog.ts`** — the single home for *"the catalogue in
tenant T"*:

- `resolveAgentDefinition({ agentId, scope: { tenantId }, em })` →
  `AiAgentDefinition | null`, with **code-first precedence**: the platform's
  definition wins any collision; the tenant's row is returned only for a key no
  code agent claims. A retired row resolves to nothing. The scope requires
  `tenantId` and nothing else — the `CC-128` lesson in both directions: a read
  that filters no tenant is a defect, and a scope demanding fields the read does
  not use is speculative surface.
- `materializeAgentTypeDefinition(row)` → the definition a row denotes.
  `id = key`; `moduleId` is a **resolver-owned constant** (`'ai_assistant'` — a
 tenant type is a first-class member of the module that owns the mechanism, so
  it inherits that module's env namespace (`model-factory.ts:604,613`,
  `agent-runtime.ts:485`) and usage attribution exactly like its code-shipped
  agents; **the wire format has no `moduleId` field**, so a tenant cannot name a
  module's env-override namespace); `executionMode` is structurally `'chat'`
  (object mode needs `output.schema`, a `ZodTypeAny` — `:261-265`); and the three
  non-JSON fields are dropped **by the schema, not by trust**: `resolvePageContext`
  (`:405`, a function), `output.schema`, `loop.prepareStep` (`:110`, a function).
- `listAgentCatalog(scope, em)` → entries tagged `layer: 'platform' | 'tenant'`,
  tenant rows carrying `version` and `shadowedByCode` — a tenant key the platform
  has since claimed, **visible rather than silent**.

A tenant type never passes through the module override/extension pipeline
(`agent-registry.ts:215-276` applies those at registry load, to code agents,
keyed by id) — resolution returns the row's own bundle, and no module's
`ai-agents.ts` can reach into tenant data.

**6. The gate is handed its subject.** `checkAgentPolicy` and
`computeBoundRunScope` take the resolved definition instead of doing the global
`getAgent` themselves; the five call sites resolve through
`resolveAgentDefinition` first, with the scope they hold. A call site with no
tenant scope resolves nothing and fails closed — the same rule
`resolveAgentBinding` already states (`agent-binding.ts:94-97`). The registry's
global `getAgent` stays for code-only paths.

**7. Routes `api/ai/agent-types/`** — the bindings route is the house pattern
(`agentIdParamSchema`'s dialect regex at `:18-27`; `ai_assistant.view` /
`ai_assistant.settings.manage` at `:40-41`; `jsonError`; null tenant ⇒ empty):
`GET` list, `POST` create, and `GET`/`PUT`/`DELETE` on `[key]`. **No new
feature** — the two existing ones cover reads and management.

**8. Read surfaces.** `GET /api/ai/agents` merges both layers, tagged — it
already holds `auth.tenantId` (`:47-58`) and filters by features uniformly
(`:68-70`), so a tenant type's `requiredFeatures` is honoured by the same filter
that governs code agents. The meta tools follow (`meta-pack.ts:82-151`; their
`McpToolContext` carries `tenantId` and a container).

**Read-surface policy on a shadowed row (build amendment):** the catalogue
function lists it flagged; a **picker drops it**. Both pickers
(`GET /api/ai/agents`, `meta.list_agents`) key their result by agent id, and a
shadowed tenant row resolves to the platform's definition under that same id —
listing both entries would offer one id twice, which is a duplicate-key defect
in the consumer, not visibility. The shadow stays visible where it is
actionable: `GET /api/ai/agent-types/[key]` reports `shadowedByCode`, `PUT`
refuses the edit with *"Retire it to remove the shadow"*, and the list route
shows the tombstone. Provenance is **not derivable from the definition** — a
tenant type carries `AGENT_TYPE_MODULE_ID`, which is also a real module id — so
`resolveAgentCatalogEntry` reports the layer and `describe_agent` asks it rather
than guessing.

## 5. Fail-direction proof, branch by branch

| Case | Before | After | Direction |
|---|---|---|---|
| Tenant creates a key no code agent claims | impossible | resolvable; runs through the identical gate | **widened to correct** |
| Tenant creates a key colliding with a code agent | impossible | refused at write; and if the registry were not loaded at write, resolution still prefers code | closed → closed — **the guarantee is at resolution, not at the write check** |
| Platform later ships a colliding key | n/a | code wins; the tenant row is shadowed and **shown** shadowed; bindings keep running the platform's definition | **fail-closed**: the effective definition is always one the platform shipped, or one the tenant authored for an unclaimed key — **never a tenant-authored definition under a platform-claimed key** |
| Unknown id at the gate | `agent_unknown` | same refusal when neither layer holds it | unchanged |
| Retired tenant row | n/a | resolves to nothing | closed |
| Malformed bundle (hand-edited row) | n/a | shape schema at write; per-field narrowing at materialize → safe defaults | closed |
| Cross-tenant read attempt | n/a | no query path exists without a `tenantId` in context | closed |
| A binding whose agent is a tenant type | could not exist | tools = declared ∩ allowlist — the `computeBoundRunScope` math, unchanged | unchanged |

The third row is the security row. Tenant-first precedence would let a tenant
squat a key the platform ships later and obtain a **wider-than-platform**
definition under the platform's own id — D1's violation, arriving silently at a
deploy. Code-first precedence makes that unrepresentable.

## 6. What this change does not claim

- It does not create an agent **instance**. The hired row that pins a version per
  user is `CC-122`, blocked on `CC-121`. The `version` column is written and
  exposed in the catalogue; its pinner arrives then — a named debt, not a closed
  loop.
- It does not build the platform ceiling. The write-time subset-of-ceiling check
  is `CC-128`'s, and this document refuses to fake it (§3).
- It does not decide the floor (`CC-125`). A tenant type is machine-reachable
  through whatever that gate later declares; nothing here widens the surface.
- It is **not org-scoped.** The owner's two layers are platform and tenant;
  org-level types are not in the requirement, and adding the column later costs
  the paired-index ceremony once — not twice.
- It does not add a per-user home (the row's measured refusal: 200 users × 2
  assistants ≈ 400 home directories ≈ 2–8 GB per tenant, on one shared volume).
- A tenant type carries no structured output and no page-context hook —
  structurally a chat agent with a concrete tool list.

## 7. Open, recorded rather than assumed

- `business-ir-author.ts:164` names a **fixed code agent**. Whether it holds a
  tenant scope is measured at build time; the rule is uniform either way — no
  tenant scope, no tenant resolution.
- **The five per-agent management routes stay code-only.** `agents/[agentId]/
  bindings`, `loop-override`, `models`, `mutation-policy`, `prompt-override`
  each resolve `getAgent(agentId)` and 404 an unknown id — that refusal is
  correct for an id neither layer holds, and this change does not widen it to
  tenant rows. Consequence, recorded: a tenant type can be authored, resolved
  at the gate, picked in both pickers and retired, but cannot be **bound or
  overridden** through its per-agent manage surface yet. The runtime row that
  needs it is `CC-122` (the hire pins a version and takes a binding); extending
  those five routes to `resolveAgentDefinition` is that row's build, not this
  one's — named here so it is a decision, not an omission.
- The migration has never been applied to a project-shaped database. That is
  `CC-119`'s milestone, and this table joins the set it will carry (bindings,
  runtimes, the participant axis, types).
- Until `CC-122` pins versions, **a bundle edit changes what a binding runs with
  no record of the change on the binding.** The row prescribes the pin; the pin
  is the next row's.

## 8. The proof this owes

The resolver's precedence and shadowing (unit); the retired-key and
malformed-bundle cases (unit); the cross-tenant refusal — a second tenant's
row must be unreachable from the first (unit, with the repository context
forged); the gate's fail-closed branches with a tenant-shaped subject (unit);
the CHECK and the unique index **by mutation**, RED-then-GREEN, in the
schema-unique-indexes house style (`data/__tests__/schema-unique-indexes.test.ts`);
and the five call sites each still refusing an unknown id. The routes prove
their contract with the repository mocked (201, the two 409s, the bundle 400,
tombstones in the list, the retired/shadowed PUT refusals before the guard
opens, idempotent retirement); the read surfaces prove the merge, the tag, the
uniform feature filter, the shadowed-duplicate drop and the null-tenant
degradation. A hostile critic reads the finished slice against this document
before anything is committed.
