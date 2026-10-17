# AUDIT 2026-10-17 — the donor cross-check

**Ten delivered slices, re-read against the donor code each one was borrowed from.**

The owner's instruction: *"review if any of the work already done so far matches the features and findings
identified in the other plattoms analyzed earlier… forensically investigate the relevant code in the other
plattoms… Update your development plan accordingly if there are tasks done but need to be revisited based
on that analysis."*

**Method.** Ten third-person hostile critics (`analyst-01` … `analyst-10`), one per delivered slice, each
briefed with our files and the donor paths, each told it owed the code no loyalty. Then **every load-bearing
claim was re-verified by me against the real files** — an analyst's word is not a register entry (rule 1:
docs are claims, code is the authority).

**Status marks used throughout:**

| mark | meaning |
|---|---|
| **[V]** | I verified it myself this session, against the cited file and line |
| **[A]** | analyst-reported, **not** independently verified — recorded as an allegation, not a fact |
| **[X]** | I checked and it is wrong (or the citation is wrong and the claim does not survive) |

---

## 1. The verdict table

| # | slice audited | requirement | donor | verdict | what survives verification |
|---|---|---|---|---|---|
| 1 | the typed engine port | SR-01 | Multica | REVISIT | run identity, run-state ownership, the "ONLY path" invariant |
| 2 | `ai_agent_runtimes` | SR-02 | Multica | REVISIT | **no `retire()`; no upsert; no stable daemon id; no liveness writer; null-org invisibility** |
| 3 | `ai_agent_bindings` | SR-13 | zulip | REVISIT | **the binding gate fails open for `service` principals** |
| 4 | the authority gate | SR-03/SR-04 | openrig | REVISIT | unrecognised gate permits; replay bypass; obligations never enforced |
| 5 | the entity gate (T-02) | CC-95 | buzz (ours) | REVISIT | **the gate discards the config it reads** — the column-level strip is impossible |
| 6 | the digital-twin harness | SR-38 | openrig | REVISIT | the checker is comment-blind; the value test is optional; **CI never runs it** |
| 7 | the one-truth check | SR-39 | zulip | **KEEP the mechanism, "done" is false** | SKIP exits 0; no residue guard; **CI never runs it** |
| 8 | the escape-hatch census | SR-41 | zulip | REVISIT | `-- x` passes as a reason; 169 of 202 unnamed; **CI never runs it** |
| 9 | the two-reads lint | SR-46 | openrig | REVISIT | the donor proves call-count is the wrong instrument |
| 10 | conversation participants | SR-07 | zulip | REVISIT | a bot is still a column on the container, not a participant |

**Nine REVISIT, one KEEP-partial. Not one slice came back clean.**

**The single most consequential finding is shared by four rows:** `ci.yml` runs exactly two of the repo's
seven drift checkers. `check:dep-versions` (`ci.yml:499`) and `check:time-bombs:fail` (`ci.yml:509`) are the
only ones. `check:digital-twins:fail` (`package.json:121`), `check:escape-hatches:fail` (`:115`),
`check:one-truth` (`:113`) and `check:two-reads:fail` (`:119`) are **called by nothing** — not CI, not the
pre-commit hook. **[V]** Four requirements whose text says *"drift breaks the build"* are met by code that
breaks nothing. This is `CC-101`.

---

## 2. analyst-01 — the typed engine port (SR-01) → REVISIT

**RISK — all verified [V]:**

- `startRun` returns `existing.sessionId` on a `runId` match **without comparing tenant or principal** —
  `packages/ai-assistant/src/modules/ai_assistant/lib/opencode-port-adapter.ts:235-238` and
  `agent-runtime-port-adapter.ts:258-260`. `tenantId` is read only in `resumeConversation`. A replayed or
  colliding run id can hand back another tenant's session id.
- Run state is a **process-local `Map`** (`opencode-port-adapter.ts:175`). `completeRun` for an unseen run
  returns `{completed:false, alreadyComplete:false}` (`:481-485`, the return at `:484`) — a lost
  completion is indistinguishable from a fresh one, so a second process silently drops terminal state and
  usage.
- `completeRun`'s terminal write is `run.completed = true` (`:489`) with **no state check** — not the CAS
  the donor encodes in SQL.
- `resolveToolCall` **throws** in both adapters (`opencode-port-adapter.ts:467-470`,
  `agent-runtime-port-adapter.ts:463-465`) while `ai-runtime-port.ts` calls it *"the ONLY path to a
  business operation"*. The invariant is declared, not enforced.

**Donor, verified [V]:** `CompleteAgentTask` is `UPDATE agent_task_queue SET status='completed', … WHERE id
= $1 AND status = 'running'` (`multica-main/server/pkg/db/queries/agent.sql:1017-1038`, the CAS at `:1038`)
— a stale terminal write matches zero rows. The failure taxonomy is a string-backed enum, `type Reason
string` (`server/pkg/taskfailure/failure.go:45-49`), with the history note that the free-string bucket
reached ~30% and hid the cause.

**HARVEST (for the port's next slice):** the closed taxonomy `{code, retryable, resumeUnsafe}`; retry policy
derived from the reason rather than the caller; CAS completion.
**REFUSE:** the donor's regex classifier over error text (inference is what created the bucket); daemon
identity + heartbeat leases (a second, weaker authority beside the server-minted envelope); a SKIP LOCKED
claim queue (run state would have two owners).

---

## 3. analyst-02 — `ai_agent_runtimes` (SR-02) → REVISIT

**★ This is the row that indicts my own slice 1.** The slice exists to remove a dead control, and it
contains one.

**RISK — all verified [V]:**

1. **There is no `retire()`.** `AiAgentRuntimeRepository` has no such method; `deleted_at` has **no
   writer**. Every `where deleted_at is null` predicate is inert, and the repository tells operators to
   *"retire it first"* (`AiAgentRuntimeRepository.ts:253`) and *"retire the existing runtime first"*
   (`:260`) with **no API to do it**. `CC-99` omitted `status`/`last_seen_at` because *"a column claiming
   online that nothing sets is the same defect, pointed the other way"* — and then shipped `deleted_at`
   with nothing setting it. The omission was applied to the wrong column.
2. **`register` refuses a daemon reboot.** The `(tenant, org, daemon, provider)` conflict throws
   `AiAgentRuntimeConflictError` (`:239`). The donor **upserts**: `UpsertAgentRuntime`
   (`multica-main/server/pkg/db/queries/runtime.sql:63-93`) is `INSERT … ON CONFLICT (workspace_id,
   daemon_id, provider) … last_seen_at = now(), updated_at = now() RETURNING *, (xmax = 0) AS inserted` —
   restart is not a conflict, and `xmax = 0` tells first registration from re-registration so analytics
   fire once.
3. **Daemon identity is caller-supplied text.** The donor migrated to a persistent daemon UUID
   (`048_runtime_daemon_uuid.up.sql:1`: *"Runtime identity is moving from `os.Hostname()` to a persistent
   daemon UUID"*). Here a hostname change creates a second live row with no binding — a permanent
   `AiAgentRuntimeAmbiguousError`.
4. **The liveness writer exists in the donor and is one line.** `TouchAgentRuntimeLastSeen`
   (`runtime.sql:178-193`): `UPDATE agent_runtime SET last_seen_at = now() WHERE id = $1 AND
   status='online'` (`:192-193`). The `status='online'` predicate is **load-bearing** (a sweeper may have
   flipped the row between the caller's SELECT and this UPDATE); returning affected rows lets the caller
   detect that race and restore the row. It deliberately never touches `status` or `updated_at` — avoiding
   `updated_at` keeps the row HOT-eligible. `CC-99`'s "they land with the probe" was right about the probe
   and wrong about the need for a separate one.
5. **A null-org caller cannot see a tenant-level runtime, and the silence is a fallback.**
   `agent-runtime-registry.ts:41` (`NO_TENANT_RUNTIME = null`) and `:138` (no active row → `null`) feed
   `resolve-ai-runtime-port.ts:184-189`, which then takes `resolveAiRuntimeEngine(env)` — the deployment
   default. The registry's own docblock says a fallback *"is how an agent ends up served by the wrong
   engine"* (`:27`) and that the binding is *"deliberately not a fallback"* (`:46`); the null-org hole
   delivers exactly that.

**★ The retire design is in the donor's DELETE migration, and it is richer than the digest recorded.**
`multica-main/server/migrations/251_agent_runtime_unbind.up.sql`, verified in full [V]:

- *"Retiring a laptop is an ordinary action; losing the agents configured on it is not an ordinary
  consequence."*
- **Two columns become nullable, not one** — `agent.runtime_id` **and** `agent_task_queue.runtime_id`,
  because the second carries an `ON DELETE CASCADE` that would take `task_message`/`task_usage`/
  `task_token` with it. Unbinding the runtime is not enough; the rows that name it must be released in the
  same transaction.
- **No new foreign keys** (their repository rule): the unbind is an explicit application-layer UPDATE
  inside the same transaction as the delete; the pre-existing CASCADE is left inert as the last-resort
  guarantee.
- **The invariant is a CHECK, not a code path:** `CHECK (runtime_id IS NOT NULL OR completed_at IS NOT
  NULL) NOT VALID` — NULL is confined to *history*; an active task must always have a runtime. Expressed
  with `completed_at` rather than a status list so a future non-terminal status **fails closed**, and
  `NOT VALID` so adding it to a hot table is metadata-only while still enforced on every INSERT/UPDATE.
- `autopilot.pause_reason` is added so retiring a runtime pauses affected automations instead of letting a
  schedule append one identical skipped run on every tick forever; the reason is persisted separately from
  status so a client can explain a recoverable condition.

**Confirmed correct in our slice [V]:** `daemon_id NOT NULL` (donor 004:4,14 leaves it nullable inside
`UNIQUE (workspace_id, daemon_id, provider)` — NULLs escape it); `provider` with no CHECK (donor 004:7 does
the same; only `runtime_mode`/`status` get CHECKs); the partial unique index split on nullable org (donor
121 adopts the same shape).

**REFUSE (donor's, verified):** `status` + sweeper + Redis TTL store — fleet machinery for one supervised
process, and the donor itself degrades to the DB; `runtime_mode` — a constant column once `daemon_id` is
NOT NULL; hard delete after unbind — it destroys history, and we soft-retire.

---

## 4. analyst-03 — `ai_agent_bindings` (SR-13) → REVISIT

**★ RISK — a fail-open, verified [V] in full:**

`packages/ai-assistant/src/modules/ai_assistant/lib/agent-binding.ts:52`, under the comment *"Human (or
other non-AI-worker) principals are not subject to the binding check"*:

```ts
if (principal.kind !== 'ai_worker') {
  return { bound: true, toolAllowlist: null, requiredFeatures: [] }
}
```

`PrincipalKind = 'human' | 'ai_worker' | 'service' | 'system'`
(`packages/shared/src/lib/auth/principal.ts:28` — the analyst's path was wrong, the claim is right), so
**every `service` API key bypasses the binding table entirely**. And `derivePrincipal`
(`principal.ts:118-142`, verified) resolves a context as `service` when `auth.isApiKey === true` **even
without the `ai_worker:` prefix** (`:127`: `const isService = parsed.kind === 'service' ||
auth.isApiKey === true`), with the comment *"Honour either, so a context built by an older path still
resolves correctly."* An ai_worker key on a legacy or cached envelope is therefore a `service` and passes
the gate. The route above it requires only `ai_assistant.view` (`api/ai/chat/route.ts:191`).

Note what sits eleven lines above the hole (`:41-49`): the code already refuses an **unidentifiable**
principal as fail-open, with the reasoning written out. The same reasoning, one branch over, is not applied.

**Secondary, verified [V]:** `principalId` is accepted as `z.string().min(1)` (`bindings/route.ts:29`) — no
uuid check, no foreign key, no `principal_kind` check, no tenant match. And the lowercase
`agent_id` pattern lives **only** in the HTTP route's path schema (`bindings/route.ts:17`
`/^[a-z0-9_]+\.[a-z0-9_]+$/`); the migration's unique indexes (`Migration20261010180000:33-41`) have no
CHECK and no normalization, so any other writer can insert `CRM.Sales` beside `crm.sales` and uniqueness
will not stop it.

**Donor, verified [V]:** zulip's realm uniqueness is **normalized** —
`0295_case_insensitive_email_indexes.py:11-17` adds `UniqueConstraint(F("realm"), Upper(F("email")))` and
*removes* `unique_together` because *"Django's unique_together is case sensitive"*
(`zerver/models/users.py:506-509`).

**HARVEST:** a CHECK on `agent_id` plus a `lower(agent_id)` index (zulip 0295); validate the principal at
manage time — the key exists, is `principal_kind='ai_worker'`, belongs to this tenant; deny unknown modes
(Multica's `invokeAgentDecision`: *"private (or any unknown mode) is deny-by-default"*).
**REFUSE:** zulip's dual `email`/`delivery_email` columns (two identity columns, two keys to keep in sync);
Multica's `public_to workspace` exception where an agent passes with **no human originator**
(`agent_access.go:100-113`) — the exact fail-open this gate exists to prevent; a mutable per-agent
`permission_mode` as the grant.

---

## 5. analyst-04 — the authority gate (SR-03/SR-04) → REVISIT

**RISK — all verified [V]:**

- `packages/core/src/modules/auth/commands/interceptors.ts:246`:
  `if (!decision || !HELD_GATES.has(decision.gate))` falls through to *"Gate permits the act to run
  now."* **A gate value the interceptor does not recognise is a permission.** `A3` and `A4` are handled
  *inside* that same "not held" branch (`:254`, `:274`).
- `interceptors.ts:174`: `if (replayId) return` — an approved-act replay **re-decides nothing**
  (approved at `A2`, the record locked since, the replay writes anyway). The symbol is attached at
  `pendingActService.ts:343` and `:417`.
- Obligations are **computed and never enforced**: pushed at
  `packages/shared/src/lib/authority/decision.ts:440-463` (`approval`, `hold_window`, `review`,
  `evidence`, `justification`) and only *rendered* at `pendingActService.ts:506`. A grep for
  `obligation.kind` outside `__tests__` finds **nothing** — `T-45`'s shape, one layer up.
- `refusalFor(subject, required, scope)` (`authorityEnforcementService.ts:227-229`, called at
  `rbacService.ts:595`) threads **neither `recordId` nor `onBehalfOfUserId`**, so I4 and record locks are
  unenforced on the HTTP path — the same hole `T-45` named, from the other side.

**Donor, verified [V]:** openrig's `builtinLaunchPosture`
(`packages/cli/src/lib/permission-policy/policy-ref.ts:165`) is *"The single mapping point"* — a **total**
function with a named floor: `yolo → full_bypass`, `auto → auto`, *"everything else → floor"*. Our own code
already contains the better version of this idea: `record-locks.ts:62-77` switches over the state union
with `default: { const unreachable: never = state; return unreachable }` at `:72-77` — *"A state added to
the union without a rule fails the build rather than silently permitting everything."* The gate enum
simply never got the treatment.

**HARVEST:** one exhaustive `Record<AutonomyGate, …>` with a `never` default; re-decide on replay
(re-run `decideFor` with the record id, refuse if the ceiling tightened); persist the resolved decision on
the pending act and compare rather than re-invent.
**REFUSE:** policy applied by agent prose (`SKILL.md` — unenforceable); surface exclusivity (splits one
decision across two readers); the donor's advisory fail-open on an unreadable policy (`policy-ref.ts:159`),
where we already fail closed.

---

## 6. analyst-05 — the entity gate, T-02 (CC-95) → REVISIT

**★ RISK — verified [V], and sharper than reported.** `authorizeEntityRead`
(`packages/ai-assistant/src/modules/ai_assistant/lib/business-ir-run.ts:214-251`) reads the entity's
search config and then returns `{ ok: true } | { ok: false; reason }` — **it throws away the object it
just read.** The package it was copied from does not: `packages/search/src/modules/search/ai-tools.ts:86`
`authorizeEntityAccess(entityType, ctx): SearchEntityConfig` **returns the config**, and its callers use
it — `:125-126`, `:144-145`, `:148` project `config.fieldPolicy` (`hashOnly`, `excluded`, `searchable`),
with *"Only fields explicitly declared `searchable` are allowed."*

So the fix recorded as *"copied from the search package's `authorizeEntityAccess`"* copied the five steps
and dropped the sixth. The column-level strip is **structurally impossible** at the current return type —
sensitive fields are fetched and returned whenever the model names them as dimensions, because
`compile.ts:416` sets `fields` straight from model-chosen `dimensionIds`.

**Also verified [V]:** the compiler says so out loud — `compile.ts:378-382` emits
`AUTHORIZATION_NOT_IMPLEMENTED` as a **gap** (*"no authorized projection is injected. This compile is a
plan, not a permission"*), while a missing tenant is an **error** (`:387-392`); org scope is injected only
when present (`:421-422`), so row narrowing is conditional on org and mandatory on tenant; and the gate
runs at **step 7** (`business-ir-run.ts:398` the header, the call at `:404`) — after the LLM authoring
call, so an unauthorized entity still costs a model invocation.

**Donor, verified [V]:** zulip narrows in SQL before execution — `zerver/lib/message.py:789`
`messages.filter(realm_id=…, recipient_id=…)` and `:800` `return Message.objects.none()` on failure.

**HARVEST:** return `{ ok: true, config }` and project **before** the read (drop
`config.fieldPolicy.excluded/hashOnly` from `plan.physical.fields` — query-level, not post-fetch, zero
extra lookups); make org scope fail closed like tenant.
**REFUSE:** per-row fetch-then-filter (`bulk_access_messages`) — the exact shape our tests forbid; the
silent empty page; the superadmin bypass *before* the empty-`aclFeatures` check (donor parity, not safety).

---

## 7. analyst-06 — the digital-twin harness (SR-38) → REVISIT

**RISK — verified [V], by proof rather than reading:**

- `carriesSatisfies` is `new RegExp('satisfies\s+' + clause)` over **raw text**
  (`scripts/check-digital-twins.mjs:96-97`) — no comment stripping, no binding to the symbol. The analyst
  fed it a fixture whose `satisfies` line is a `//` comment and whose twin says `A5` for every lock state;
  all three predicates returned true.
- `semanticTest` is **optional** (`:146`) and only **1 of the 3** twins registers one (the analyst wrote
  "1 of 4" — the registry holds three; the substance stands).
- The fixture's placement is genuinely right [V]: `packages/core/src/testing/digital-twin/authority.ts` is
  under `src/`, and `packages/core/tsconfig.json:19` excludes `**/__tests__/**` — so `tsc` really does see
  it.
- **No production code imports any twin** — the only importer is
  `packages/core/src/modules/auth/services/__tests__/record-lock-ceiling.twin.test.ts:23`. So the claim
  that the twin is what other suites read is currently false.

**Donor, verified [V]:** openrig validates **live output** against a checked-in JSON Schema with Ajv
(`packages/cli/test/bundle-behaviour.test.ts:44-47`) — the contract is a serialized artifact and the
assertion runs on the real function's return value. `satisfies` erases at compile time and never sees a
value.

**HARVEST:** strip comments/strings before the regex (our own `check-declared-controls.mjs:75` already
documents why); make `semanticTest` mandatory; adopt a regenerated-snapshot twin so drift yields a
reviewable diff.
**REFUSE:** openrig's `fixtures/invalid/**` directory — it looks like a negative-test suite but no test
reads it; orphaned fixtures rot silently.

---

## 8. analyst-07 — the one-truth check (SR-39) → **KEEP the mechanism; "done" is false**

**RISK — verified [V]:**

- `check:one-truth` (`package.json:113`) is referenced by **nothing** — not CI, not the pre-commit hook.
- **SKIP exits 0.** `main()` returns 1 only for `FAIL` (`check-one-truth.mjs:196-208`), while the
  docstring calls silence *"a false green"* (`:29-30`) and the SKIP report says *"it is also not a green"*
  (`:171-176`). The exit code calls it green.
- `FACTS` is hand-registered (`:53`) — a PASS 3/3 the day somebody adds a fourth copy, and nothing
  compares the digest to the external truth (the upstream commit).

**Donor, verified [V]:** `version.py:36` is the **only** place the number exists
(`API_FEATURE_LEVEL = 513`, *"bumped exclusively by tools/merge-api-changelogs"*); the tool rewrites every
copy (`merge_api_changelogs.py`); and `tools/check-feature-level-updated:26` is a **residue guard** —
`if "ZF-" in file.read():` fails if a placeholder survived, catching a *new, unregistered* copy, a class
ours cannot see.

**HARVEST:** the residue guard (~15 lines: fail on any 32-hex hit outside registered paths); register the
doc — `library/development/HERMES-PIN.md:183` already says *"The pinned digest — this is the value the
harness enforces"* [V], and the pattern `/^\s*digest\s*:\s*([0-9a-f]{32})/m` yields exactly one, so the
one copy a human reads is currently the unguarded one; SKIP exits 2 unless `--allow-skip`.
**REFUSE (and the reasoning is the valuable part):** **do not generate the digest.** `verify_pin.py` must
stay independent of the tree it verifies — generating the pin from a sibling makes it agree by
construction, which is the exact failure it exists to detect. And a checker must stay read-only: a tool
that edits the tree can silently "fix" drift into agreement.

---

## 9. analyst-08 — the escape-hatch census (SR-41) → REVISIT

**RISK — measured by me this session, not taken on report:**

- **202 holes, 169 unnamed, 33 named** — and the checker **exits 0**. With `--fail` it exits 1, but
  nothing calls that.
- `isNamed` is `/--\s*\S/` (`scripts/check-escape-hatches.mjs:83`) — so `-- x` passes as a reason.
- `ts-nocheck: 10 (named 1, unnamed 9)`.
- The census is one edit from meaning nothing: `/* eslint-disable -- legacy */` atop a file turns 160
  unnamed into 0 while exempting the entire file, and the checker scores it as a single hole.

**Donor, verified [V]:** `tools/linter_lib/custom_check.py:325` requires code **and** reason in one regex —
`# type: ignore[code] # explanation`, with ` +# +\S` closing the empty-reason loophole;
`pyproject.toml:395` (`"ignore-without-code"`) makes mypy itself reject a codeless ignore and `:484`
(`"PGH"`) rejects blanket `# noqa`; `eslint.config.js:72` sets `reportUnusedDisableDirectives: true`, so a
dead disable **errors**. Old violations are tolerated by an **exact-line allowlist**
(`custom_check.py:310` pins identity by string), not by a count.

**HARVEST:** require the rule id inside the reason; turn on `reportUnusedDisableDirectives`; replace
all-or-nothing `--fail` with a committed `{file,line,text}` baseline that fails on new **and** on stale, so
it can only shrink.
**REFUSE:** whole-directory exclusion (`custom_check.py:326` — 160 of our 169 are test-adjacent, so this
would legalise exactly our backlog); code-only `noqa` with no reason.

---

## 10. analyst-09 — the two-reads lint (SR-46) → REVISIT

**★ The donor refutes the premise, not the implementation.** Verified [V]: openrig has **no such lint at
all**. It centralises resolution — `SettingsStore.resolveOne`
(`packages/daemon/src/domain/user-settings/settings-store.ts:955`) implements env > file > default in one
place, and `ConfigStore.resolve()` projects the whole config; consumers call the accessor and **call count
is not policed**. `claude-compaction-enforcer.ts` calls the resolver six times in one file — and ships it,
correctly, because a second call through the same pure resolver cannot disagree. What *can* disagree is a
second **implementation** of resolution, which openrig guards with a **parity test**
(`user-settings-store.test.ts:3-6`), not a lint. [A] — the specific line numbers for the resolver pairs
and the enforcer's six call sites are the analyst's; the `resolveOne` shape at :955 I verified myself.

**Measured by me this session [V]:** the check reports **89 settings read twice in 46 files** across
**4,832 files scanned / 3,159 skipped** (the record said 4,823 — the script is the authority). My own
cross-file census over the same exclusions: **306** distinct settings, **103** read in ≥2 distinct files,
`NODE_ENV` in **75** (the analyst reported 307 / 111 / 74 — same family, his measured as files, mine as
files; both agree the class is real). The important part is what neither number can see: **divergent
resolvers** — two implementations of the same resolution — are invisible to any per-file check, and
accessor reads are invisible because `KINDS` knows only `process.env`.

**HARVEST:** build `resolveSetting()` first, then retarget the check to *"no direct `process.env` read
outside the resolver module"*; replace read-counting with a parity test over the key/env manifest; keep
the census, drop `--fail` until the premise holds.
**REFUSE:** the twin duplication (`cli/config-store` + `daemon/settings-store`) — we have one monorepo,
share the module; fresh-read-per-call — six calls means six disk reads and six chances to observe a
half-written file.

---

## 11. analyst-10 — conversation participants (SR-07) → REVISIT

**MATCHES/RISK — verified [V]:** the conversation container carries `agent_id` (text) **and**
`owner_user_id` (uuid) (`data/entities.ts:761-765`; `Migration20260518092853`); the participant table is
**users-only with no foreign key at all** (`… participants … "user_id" uuid not null`, migration line 21);
`canAccessConversation` (`data/repositories/AiChatConversationRepository.ts:770-776`) is
`canManage || ownerUserId === ctx.userId || isParticipant` — **the agent is never consulted**. Every
access check in that repository is user-shaped — `ownerUserId !== ctx.userId` at `:153`, `:200`, `:452`,
`:586`, `:624`, `:685`, and the participant filters at `:179`, `:228`, `:246` — and none consults
`agent_id`. The revoke route is keyed by `userId: z.string().uuid()`
(`api/ai/conversations/[conversationId]/participants/[userId]/route.ts:26`), so an agent can never be
addressed. Membership has two homes today; with the planned participant slice it would have three.

**Donor, verified [V]:** zulip's bot is **not a special row** — `is_bot =
models.BooleanField(default=False, db_index=True)` (`zerver/models/users.py:556`); membership is one FK
pair (`zerver/models/streams.py:377-378`); the polymorphism lives on the **audience**, not the member —
`unique_together = ("type", "type_id")` (`zerver/models/recipients.py:48-49`), and `type_id` is an
IntegerField with **no FK** (`:39`).

**HARVEST:** **two partial unique indexes, not one** — a plain unique over `(tenant, conv, user_id,
agent_id)` will not dedupe agents because Postgres treats NULLs as distinct, so mirror `streams.py:410-418`:
`unique (tenant, conv, user_id) where user_id is not null` + `unique (tenant, conv, agent_id) where
agent_id is not null`; add `agent_owner_user_id` (the `bot_owner` analogue — authorization and audit need a
human principal); exempt agents from idle-pruning (`subscription_info.py:654`:
`(is_bot OR NOT long_term_idle)`).
**REFUSE:** `type_id` polymorphism with no FK (our participant table already has zero FKs; add none);
`huddle_hash` content-addressed conversations (our `createOrGet` is client-UUID idempotent); making agents
rows in the auth `User` table (they have no password or email; zulip pays for it with
`is_bot`/`bot_type`/`bot_owner` triples).

---

## 12. The through-line

Three of the ten findings are the same defect in three costumes, and the audit named them within an hour
of each other:

1. **A check that never runs.** `SR-38`, `SR-39`, `SR-41`, `SR-46` are all *"drift breaks the build"* —
   and CI runs two of seven checkers. The escape-hatch census reports 169 unnamed holes **and exits 0**.
   One-truth's docstring calls SKIP *"a false green"* and then returns 0.
2. **A control that asks the right question and discards its answer.** `authorizeEntityRead` reads the
   config and returns a boolean. `refusalFor` resolves a whole decision and returns a refusal-or-null.
   `deleted_at` is filtered on and never written. The audit's own name for this already existed (L179);
   what is new is that it is not a one-off — it is what happens when the *return type* of a check is
   chosen before its use is known.
3. **A permit written as a default.** `if (!decision || !HELD_GATES.has(...))` permits; `principal.kind
   !== 'ai_worker'` permits; an unrecognised escape hatch without a reason is merely unnamed. Every one of
   these is a branch whose *else* is permissive and whose author believed the else was unreachable.

The fourth pattern, from the donor side, is the inverse and the more useful lesson: **every donor
mechanism worth copying is a total function with a named default** — `builtinLaunchPosture` floors,
`recordLockCeiling` fails the build, the unbind CHECK fails closed on a future status, multica's CAS
matches zero rows. The best version of each of our gates is the one that cannot express "unrecognized".

---

## 13. What this audit changes — the revisit register

New register rows, all **open**:

| row | finding | severity |
|---|---|---|
| `CC-101` | the four drift checkers are not wired into CI; escape-hatches exits 0 with 169 unnamed holes | high |
| `CC-102` | `SR-02` slice 2 must carry `retire()`, the registration upsert, a stable daemon id, the liveness writer, null-org visibility, and the unbind redesign | high |
| `CC-103` | the binding gate fails open for `service` principals; `principalId` unvalidated; `agent_id` unnormalized | high |
| `CC-104` | the port's run identity (no tenant compare on idempotent `startRun`), process-local run state, non-CAS completion, the throwing "ONLY path" | medium |
| `CC-105` | the authority gate permits an unrecognised gate; replay re-decides nothing; obligations are computed and never enforced; `refusalFor` threads no record id | high |
| `CC-106` | the entity gate discards its config — the column-level projection is structurally impossible; org scope conditional; the gate runs after the model call | medium-high |
| `CC-107` | `SR-07` — a bot is a participant, not a column: two partial unique indexes, a human owner, no idle-pruning | planned |
| `CC-108` | the twin checker is comment-blind and its value test is optional | medium |
| `CC-109` | one-truth: SKIP exits 0; no residue guard; the pin has one guarded copy and two unguarded ones | medium |
| `CC-110` | escape hatches: `-- x` passes; no baseline; no unused-directive reporting | medium |
| `CC-111` | the two-reads lint polices the symptom; the accessor comes first | low-medium |

**Requirement states corrected (rule 13, by name):** `SR-38`, `SR-39`, `SR-41` and `SR-46` revert from
**done** to **built-but-not-enforced** in the checklist twin. Each requirement's own text is the standard:
*"drift breaks the build"* — and measured, drift breaks nothing. The built artefacts are not wrong; the
claim about them was.

---

## 14. Corrections this audit forces on my own records

1. **`principal.ts` "does not exist" was wrong.** I recorded the analyst's `derivePrincipal` claim as
   unverifiable because the cited path did not exist. The file exists at
   `packages/shared/src/lib/auth/principal.ts` and the claim is **true** at `:28` and `:127-137`. A wrong
   citation nearly cost us the audit's most serious security finding.
2. **`authorizeEntityAccess` is ours, not a donor's.** Analyst-05 called it donor parity; it is our own
   `packages/search`. That makes `CC-106` sharper, not softer: the copy dropped a step the original
   still has.
3. **The two-reads census figures.** The record says 4,823 production files; the script measures 4,832
   (3,159 test files skipped). The script is the authority and its number is recorded.
4. **The twins count.** The analyst wrote "1 of 4 twins"; the registry holds **3**. Only one has a
   semantic test — the substance stands, the number is corrected.

---

*Compiled 2026-10-17 from the ten analysts' reports. Every claim that could move the register was checked
against the code before it was written down; where a citation was wrong the corrected line is used and the
wrong one is named in §14. Four claims are recorded as analyst-reported and **not** verified, because none
of them changes what we build: the donor-internal retry/resume line numbers in §2's harvest list, the
`merge_api_changelogs.py` lines in §8, the `eslint.config.js:72` line in §9, and the resolver-pair line
numbers in §10. The `derivePrincipal` path that §4 records as verified was first recorded as
unverifiable — see §14.1.*
