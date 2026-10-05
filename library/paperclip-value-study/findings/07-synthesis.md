# Findings 07 — The synthesis

**Batch 12. This is the answer to the question the study was opened with.**

**The question.** *"Read Paperclip again, every functionality, code, idea, flow and concept, and find
anything that adds value or inspires an idea for our platform. Document it only if there is."*

**The evidence.** Six findings files, batches 1 to 11, every claim carrying a `file:line` in the extracted
tree at `library/ai/paperclip-master/`. This file does not add evidence; it decides what the evidence
means.

---

## The answer, in one paragraph

**Yes, but not where Paperclip's own README points.** Almost everything Paperclip *advertises*, we already
have in our vision or already plan; this study **confirms four of our backlog items were right**, and it
corrects one capability we had recorded as missing that we had in fact already designed. What is worth
taking is **how** Paperclip does the things we have only described: the concrete mechanism, the ordering,
the fail-closed default. Two findings **change words we have already written**: one promise in `ML-4` that
we cannot keep as phrased, and one boundary we have never drawn. Three ideas are absent from our plan —
the self-modification gate's **process**, the **memory control plane** (an extension of a design we already
have, not a blank page), and the **plugin capability model**. And the single most useful output of the
whole study is the **trap list**, because we would have walked into two of them.

**So the short answer to "is there anything there that adds value" is: yes, six things worth acting on, and
two of them are corrections to our own plan.**

---

## 1. What to act on

**Six items across five sections** — §1.2 carries two, because both are warnings that change words we have
already written. They are, in order: (1) the responsible-user intersection; (2) `ML-4`'s wording;
(3) the orchestration boundary; (4) the concurrency rules; (5) the self-modification gate; (6) the memory
control plane. **Items 2 and 3 are the ones that change something we have already written down.**

**How the numbers in this file are counted**, so they are reproducible and not read as something they are
not:
- **"six things worth acting on"** = the six above. It is a judgement, not a count of markers in the
  findings files.
- **"four of our backlog items confirmed correct"** = `AH-3`, `AH-8`, `AH-9`, `ML-4`. It is a judgement
  about which **numbered backlog items** the study found to be right, and **not** a count of the literal
  `CONFIRMATION` verdicts in the findings files — those are **two** (`AH-8`, in findings 01 §4 and 05 §3).
- **"eight rejections"** = the **eight rows of §4**, not a count of the `NOT FOR US` verdicts, which is
  **one**.
- **The findings files' own verdict markers**, counted for reference: **LEARN 20 · IDEA 8 · WARN 5 ·
  CONFIRMATION 2 · NOT FOR US 1**.

### 1.1 The responsible-user intersection — the strongest single idea in the study

**Finding 01 §1.** An agent never acts *as* a person; it acts **on behalf of** a person, and its authority
is the **intersection** of its own permissions and that person's. If the person could not do the thing, the
agent cannot either, even when the agent's own grants would allow it. The mechanism
(`server/src/services/authorization.ts:2400-2427`) re-decides inside the single decider as a synthetic
actor for the responsible human, rather than asking each call site to remember.

**Why it is the strongest.** We already hold the *rule* — in our own words, *"An agent should normally
operate **on behalf of** an actor, not silently above the actor"*
(`library/ai/ai-first/06_Platform_Foundation_and_Security_Kernel_Specification.md:1308`) and *"AI should
never be allowed to bypass permissions"* (`library/05-platform-audit-and-srs/15-ai-first-operating-model.md:7`).
What we did not have is a **place** for it. The intersection is that place, and it is the difference
between a rule that is written down and a rule that **cannot be bypassed by accident**.

**What to do.** Implement the intersection as a step **inside** our resolver, not as a rule each caller
must remember. This lands on **`S-02`** (wire the resolver as the enforcement point) and **`AH-2`** (the
responsibility rule). It is a mechanism, not a new item.

### 1.2 Two warnings that change words we have already written

**(a) `ML-4` promises something we cannot deliver as phrased.** Our item says *"a policy that can spend
must be able to stop."* Paperclip built exactly that, and its design **does not** deliver a mid-run stop:
spend is recorded **first** (`server/src/services/costs.ts:68`), then evaluated (`:101`); crossing a budget
**pauses the scope** and blocks future admission, and the code that cancels work **already in flight** is
an **optional hook** (`server/src/services/budgets.ts:252-258`) that only one of six services supplies.
Their own README says the same in plain words: *"usage reporting and in-flight work can delay a stop"*
(`README.md:292`). **What to do:** reword `ML-4` to what is actually enforceable — a budget **blocks
admission** and **pauses the scope**, and cancelling an in-flight run is a separate, best-effort action
that must be named as such. Do not promise a mid-run kill we have not built.

**(b) We have never drawn the line Paperclip drew.** Their technical report refuses to import runtime-level
cron, workflow and queue into the core, because it *"would create a second orchestration system inside the
product"* (`doc/plans/2026-04-08-agent-os-technical-report.md:230-232, 351-364`). We borrow Hermes as the
agent runtime and then add a wake queue (`AH-3`) and routines (`AH-4`). **What to do:** write down where
**our** line is, before `AH-3` is built. This is a one-paragraph rule, not a build.

### 1.3 The concurrency rules to write down before `AH-3` is built

**Finding 02 §1 and §2.** This is the best-executed engineering in the whole product, and two of its
mechanisms land exactly on items we already have.

| Mechanism | Evidence | Lands on |
|---|---|---|
| **One live run per subject is a database fact, not a convention.** A single conditional `UPDATE ... WHERE ... RETURNING` either wins or loses; the loser re-reads and returns `409`. Two locks on the row (`checkoutRunId` claimed, `executionRunId` executing), symmetric cleanup on terminal state, stale locks adopted under `FOR UPDATE` and audited | `server/src/services/issues.ts:11494-11518`, `:11659-11665`, `:7496-7591`, `:7644-7761` | nothing we have names — **write the rule down** |
| **A wake is a database row, and a wake for a busy agent is coalesced or deferred**, never a second run. Deferred wakes drain in `requestedAt` order, at most one promoted, and the row moves off `deferred_issue_execution` **before any side effect**. The drain **throws** if it sees the same row twice | `server/src/modules/wake-queue/domain/policy.ts:44-61`; `adapters/postgres.ts:426-446`, `:917-954`; `application/use-cases.ts:153, 162-168, 961-985` | **`AH-3`** — our backlog says *what*, this shows *how* |
| **Bound a run honestly.** Retry accounting separates failure retries from resource waits and productive continuations; continuation default 2, hard cap 10 | `server/src/services/execution-recovery-attempt.ts:9-13, 43-57`; `server/src/services/heartbeat.ts:827, 902-903` | nothing — a cheap rule that kills a whole class of runaway |
| **A document edit is append-only with an optimistic-concurrency guard**; a stale base is refused | `server/src/services/documents.ts:350-359` | the same shape as our spec's document round-trip (§12) |

### 1.4 The self-modification gate — the one new governance primitive

**Finding 01 §5.** A built-in agent that proposes changes to **agents' own instructions and skills** is held
to a fixed contract: it must **show a diff**, it must get an **accepted interaction**, and it may **only
apply in a separate follow-up run**. The shipped material adds an **evidence floor** (at least two linked
evidence tuples per proposed rule) and **size caps**
(`server/src/built-ins/agents/reflection-coach/AGENTS.md:18, 19, 30`;
`routines/recent-agent-reflection.md:73`;
`packages/skills-catalog/catalog/bundled/paperclip-operations/reflection-coach/SKILL.md:109`).

**Why it is new to us, stated precisely.** We have the **prohibition** (*"A Skill proposal or memory record
must not be able to mutate: role, permission, policy, secret, tenant boundary"*,
`library/ai/ai-first/06_Platform_Foundation_and_Security_Kernel_Specification.md:4775-4785`) and we have a
write-approval gate (`skills.write_approval: true`, `memory.write_approval: true`,
`library/16-konsult-product-docs/consulting-operating-model.md:87`). We do **not** have the **process**:
as measured before this study changed anything, `separate run`, `same-run` and `follow-up run` returned
**zero hits** across `library/development/` and `library/ai/ai-first/`. **What to do:** a new backlog item,
**N-16** — which is now the first place the rule is written down, so the exact phrases read one hit each
and both are our own line. This is a governance primitive aimed exactly at
our differentiator, and it stands on its own whether or not we ever build the "learning" features around
it.

### 1.5 The memory control plane — an extension of a design we already have

**Finding 06 §1, as corrected.** The first draft of that finding called this "a real gap" and said every
"memory" hit in our vision was about RAM. **That was wrong**, and the correction is recorded in the finding
itself. We had already designed a first-party tenant-scoped `PlatformMemoryProvider`
(`library/ai/ai-first/AI_Native_Business_Platform_Hermes_Forensic_Analysis_and_Architecture.md:385-410`),
and we had already recorded the gap it leaves (`library/development/ARCHITECTURE-hermes-integration.md:141`,
*"Long-lived memory and user model … **MISSING**"*).

**What is genuinely new** is the step past that: a **control plane over several providers**, where a company
picks a default and an agent may override it, with provenance back to the run and cost attributed to it
(`doc/plans/2026-03-17-memory-service-surface-api.md:326-342`). Our design is **one** provider,
tenant-scoped; Paperclip's is **many**, policy-selected. Same shape as our model layer, which we have
already chosen twice. **What to do:** the "do not lose this" list, not the roadmap.

---

## 2. The rest of the genuine value

Everything here is real and worth having, but it changes no existing plan. One line each, with where to
read it.

### 2.1 Governance

| Item | What to do |
|---|---|
| **Pure policy modules**: every governance branch is a function that takes facts and returns a decision, with no database access (`modules/wake-queue/domain/policy.ts:44-61`) | our governance layer is the product and needs tests that do not need a database. Adopt the shape |
| **Consumed-once, run-bound consent**: an approval authorises exactly one action, once, bound to the run that asked, and created in a **previous** run (`change-consent-gate.ts:165-175, 201-227`) | the concrete shape of our spec's approval token (§14); the "previous run" rule is the part we had not written |
| **Typed approval stages and reviewer identity**: only the current typed participant can advance a stage; an escalated human hold is sticky; a policy can require the approver is **not the creator** (`issue-execution-policy.ts:708-735`; `issue-review-policy.ts:111-147`) | the "not the creator" rule closes self-approval. Cheap |

### 2.2 Money

| Item | What to do |
|---|---|
| **The cost ledger**: an append-only row per run, attributed along company / agent / project / goal / issue / run / provider / biller / model, with an explicit **`unpriced`** status for spend you cannot price (`packages/db/src/schema/cost_events.ts:9`; `heartbeat.ts:5307-5344`) | take the shape and the `reported`/`unpriced` distinction into `ML-4` |
| **Four small budget mechanics**: incident dedupe by partial unique index; a resume clears **only** the budget reason so a manual pause survives; raising a budget must beat observed spend; attribution falls back through the audit log (`budget_incidents.ts:36`; `budgets.ts:272, 884`; `costs.ts:499`) | copy |
| **Three separated telemetry planes** with allowlisted, **hashed** span attributes, PII off by default, and a per-run `(runId, seq)` run log (`doc/observability.md:9, 24, 252, 388, 408`; `heartbeat_run_events.ts:40`) | the allowlist-plus-hash discipline is cheap and is what a multi-tenant platform needs |
| **The audit feed's responsible-user precedence chain**: run → issue → API key → company default (`activity-log.ts:93`) | the part our ledger lacks, and the same idea as §1.1 |

### 2.3 The org, the agents and training them

| Item | What to do |
|---|---|
| **Org integrity rules**: no reporting cycles; terminating an agent revokes its keys; removing an agent reassigns its work; hiring is idempotent (`agents.ts:463-471, 1024-1045, 1059-1071`; `routes/agents.ts:430-451`) | the difference between an org chart that is data and one that is only drawn |
| **Skill versioning by content hash**, with an update naming the version it expects to replace, and a **trust level derived from the file kinds** (`skill-snapshot.ts:13-20`; `company-skills.ts:3618-3672`; `catalog-builder.ts:763-775`) | exactly what **`AH-9`** will need, and the mechanism for the derived trust the item already asks for |
| **Collision handling as a policy**: default rename, plus a stricter `agent_safe` mode that forbids replace and deliberately loses fidelity (`company-portability.ts:194, 264-301, 1874-1884`) | the right shape for importing anything |
| **Evals as a scenario × candidate matrix with a fail-closed preflight** (`paperclip-eval-kernel/src/index.ts:40-79`) | **IDEA.** Not now, but when the deferred benchmark is built, this is the shape |
| **A portable package format with a vendor sidecar**: markdown-first `agentcompanies/v1-draft`, plus one vendor file beside it (`docs/companies/companies-spec.md:5, 26-36, 417-442`) | **IDEA.** Worth a design note only if we ever want third parties to read our company packages |

### 2.4 Extensibility and isolation

| Item | What to do |
|---|---|
| **A capability manifest, validated twice**: at install and again on **every call** from a plugin worker to the host; unknown operations rejected by default; and **each call bound to the invocation's company scope**, so capability and scope are separate checks (`plugin-capability-validator.ts:44-150, 391-433`; `host-client-factory.ts:594-700`) | **the one genuinely new idea in this batch.** It is a governance model for code. Worth deciding whether Companai is ever extended by third parties |
| **A plugin update that adds a capability is held until an operator approves it** (`DISTRIBUTION-PLUGINS.md:28-34, 57-69`) | a plugin cannot silently grant itself more power on upgrade |
| **Sandbox capability intersection**: what a provider can do is `verified ∩ declared ∩ narrowing`, and **omitting** a capability never grants it (`SANDBOX_PROVIDER_CAPABILITIES.md:36-56`) | generalises to any adapter we add: a model provider, a vector store, a storage backend |
| **Local isolation, concretely**: bubblewrap with an egress allowlist, `realpath` checks against symlink escape, and a write-lock file kept **outside** the directory being replaced (`local-process-sandbox.ts:230-310, 380-490`; `plugin-local-folders.ts:222-304`; `doc/workspace-restore-locks.md:9-23`) | we run agents locally. This is the shape of the isolation we will need, and it is cheap to borrow |
| **Secrets stay out of the platform**: values live in a secret store, the platform holds only an `externalRef` and version metadata (`SECRETS-AWS-PROVIDER.md:293-297`) | one layer further out from **`C-7`**, which we already hold |

### 2.5 The unbuilt ideas

| Item | Verdict |
|---|---|
| **Memory as a control plane over providers** | **IDEA** — see §1.5 |
| **Pipelines**: a shipped intake → stage → review substrate, which their roadmap mislabels as planned (`pipelines.ts:77-80`; `cli/src/commands/pipelines.ts:198`; `ui/src/pages/Pipelines.tsx`) | **IDEA.** If Companai runs a company day to day, work arriving continuously has to go somewhere. This is a proven shape for it |
| **Self-organization and organizational learning** | **IDEA, the substrate not the slogan.** The slogans are absent from our vision and backlog; the **gate** (§1.4) and the **carrier** (a durable proposal a human decides from a triage-ranked queue, `SPEC-implementation.md:1253-1266`) are the parts worth taking |
| **Bring-your-own ticket system** (Asana, Linear, Jira as on-ramps) | **IDEA, low priority.** Spec only (`docs/specs/external-task-protocol.md:2`, `Status: Draft v1`); no mechanism to learn from, only a stance |
| **MAXIMIZER MODE, Desktop App** | **NOT FOR US.** Roadmap bullets only, no mechanism |
| **Their explicit anti-goals** | **LEARN.** See §1.2(b) |

---

## 3. Confirmations — what this study says we already got right

**Four of these are numbered backlog items — `AH-3`, `AH-8`, `AH-9`, `ML-4` — and the rest are things we
already hold in the vision or the specification.** Recorded in one line each, so nobody re-opens them.

| We already have or plan | The study's finding |
|---|---|
| **`AH-8`** — MCP governance: binding precedence narrowest-first, changed-tool quarantine, argument-bound approvals | **Confirmed twice**, and now more built-out than the first study recorded. The mechanism behind "changed-tool quarantine" is that a trust rule carries the catalog and schema hash and **stops applying on drift** (`tool-access-policy.ts:1430-1451`). Approvals are bound to the canonicalised arguments and HMAC-signed (`tool-content-guards.ts:75-107`) |
| **`AH-3`** — every trigger is a database row, not an in-memory timer | **Confirmed.** Paperclip ships exactly this (§1.3) |
| **`AH-9`** — skills description-indexed with a **derived** trust level | **Confirmed.** The derivation is the file kinds; the identity is a content hash (§2.3) |
| **`ML-4`** — budgets and per-tenant quotas, required before any tenant is placed on C | **Confirmed as necessary.** Only the **wording** changes (§1.2a) |
| The **Document** and **Annotation** concepts (spec §12; `05_Widgetized_Collaborative_Workspace_Architecture.md:701, 1493, 1534`) | **Confirmed.** We have the concept; the revision guard is the mechanism we lacked (§1.3) |
| **`C-7`** — tenant secrets never enter a Hermes home | **Confirmed**, one layer further out (§2.4) |
| **`A-1`**'s approval rule — the agent is never the accountable party | **Confirmed** by the intersection (§1.1) |
| **`G-16`** — the ledger carries no `policy_version`/`decision_id` | **Confirmed as a real gap.** Their `activity_log` has the actor-and-entity shape; ours is hash-chained but carries neither field |
| **`P0-spec`**'s five normative sections (§12 to §16) | **Confirmed.** Their tool policy, approval token, capability manifest and outbox all have shipped counterparts |
| The **vision's `PlatformMemoryProvider`** | **Confirmed as the right extension point**, and now with the provider interface Paperclip designed beside it (`doc/plans/2026-03-17-memory-service-surface-api.md:326-342`) |

**One correction to our own documents, and it is the only one.** `ARCHITECTURE-hermes-integration.md:141`
records *"Long-lived memory and user model"* as **MISSING**, and `:151` counts it among three genuinely
absent capabilities. That is **right**. What was wrong was this study's first draft, which said we had *no*
memory concept at all. We have one; we have not built it. The finding is corrected in place.

---

## 4. Rejections — with the reason, so nobody re-opens them

| Rejected | Why |
|---|---|
| **Their task/ticket object model as a whole** | We do not have tickets, and our vision is not built around them. The value in that area is the **concurrency mechanics** (§1.3), not the object |
| **Skill Studio, evals and "performance reviews" as *features*** | Not now. The governance half is the valuable half and is already §1.4. Their "performance review" pillar is literally **one built-in agent plus a paused weekly routine that only emits proposals** (`built-in-agents.ts:332-402`) |
| **A knowledge base as core** | Their own explicit anti-goal (`doc/SPEC.md:563-567, 576`), and ours |
| **MAXIMIZER MODE and the Desktop App** | Roadmap bullets in exactly three files, no design, no mechanism. A slogan without a mechanism is not a finding. Our answer to "more output per supervisor" is the governance layer, which is already the product |
| **The plugin *UI* trust model** | A plugin's UI runs as same-origin JavaScript and the manifest capabilities **do not** stop it calling ordinary HTTP (`PLUGIN_SPEC.md:23-24`). Capabilities govern the **host API**, not the browser. Never treat that as a security boundary |
| **Their trusted-local deployment mode** | Fully unauthenticated: anyone who reaches the port is instance admin (`server/src/middleware/auth.ts:231-240`). We run a loopback stack too, and we must say so where it can be seen |
| **`agentcompanies/v1-draft` as something to *ship*** | Design note only (§2.3) |
| **The BYO ticket protocol as a mechanism** | Spec only, `Draft v1`, no implementation |

---

## 5. The traps — the most useful output of the study

These are mistakes we would have made. Each is a place where Paperclip's design contains a hole and says
so, or where the code does something its documentation does not.

| The trap | Evidence | What we must not do |
|---|---|---|
| **A budget stop does not stop running work** | `costs.ts:68-101`; `budgets.ts:252-258`; `README.md:292` | **Do not promise a mid-run kill we have not built** (§1.2a) |
| **Enforcement is post-hoc and best-effort against concurrency** — the admission gate re-sums spend outside any lock shared with the insert path, so two runs starting together can both pass | `budgets.ts:718` vs `costs.ts:68-101` | Either state the limit in plain words, or **reserve before spending**. There is no third option: you cannot both spend first and stop first |
| **A portability export can leak a secret, because sensitivity is decided by the *key name*, not the value** | `company-portability.ts:556-586, 617-628, 647, 665`; their own `README.md:321` | If we ever export a company, **scan the value, not the key name**. A credential called `URL` or `TOKEN2` defeats any name heuristic |
| **A governance gateway that can be bypassed** — an unmanaged client skips it, and they "cannot prevent or audit that bypass" | `doc/MCP-ACCESS-GOVERNANCE.md:135, 434` | Our claim is "one place decides". A bypass path is not a policy, it is a hole |
| **An enforcement switch that can be silently off** — in "shadow mode" some denials fall through to the agent's own decision | `authorization.ts:504-508, 2451` | Never ship a mode where the intersection is not applied. **Fail closed, or do not ship the switch** |
| **A risk classifier that falls through to `read`** for unknown providers | `tool-access.ts:2414` | Fail-open classification is the opposite of what a governance layer needs |
| **A claim challenge held only in process memory**, and a **rate limit held in process memory** | `board-claim.ts:22`; `plugin-secrets-handler.ts:175-195` | A one-time token or a limit that dies on restart is not a token and not a limit |
| **Idempotency by literal string prefix** (`question-response:%`) | `agent_wakeup_requests.ts:59-86` | Correctness depending on every caller using an exact prefix is a trap |
| **Liveness decided by a regex over transcript text** | `run-liveness.ts:65-78` | If we need it, **measure** it, do not regex it |
| **Agent files sync last-write-wins**, and an **over-quota save is discarded whole** | `doc/agent-files.md:63-73, 133-137` | A limit that silently drops work is a data-loss bug; if agents and humans edit the same file, say who wins |
| **A product's design doc is not its behaviour** | `doc/TASKS.md:4-5` says so; measured: no `teams` or `workflow_states` table exists, `issue_relations.type` is only `"blocks"` | We nearly read Paperclip's task doc as Paperclip's behaviour. **We read the code instead** |
| **A feature that exists but is not exposed** — issue worktrees ship runtime-only with the UI hard-gated off | `doc/experimental/issue-worktree-support.md:3, 14` | A capability that exists but is not exposed is a claim waiting to be misread |
| **Two enormous files** — `heartbeat.ts` ≈ 30k lines, `tool-access.ts` ≈ 20k, `tool-gateway.ts` ≈ 11k | `server/src/services/` | The cost of not extracting the policy modules (§2.1). The same lesson as our own `COOKBOOK` rule about thin adapters |

**Two of these are aimed at us directly:** the budget promise (§1.2a) and the orchestration boundary
(§1.2b). The rest are cheap to avoid now that they are written down.

---

## 6. What this changed

**Nothing in this study is a build order.** It changes documents, and only documents. Every row below was
made in the same change as the work (COOKBOOK rule zero).

### 6.1 The plan

| Changed | Where |
|---|---|
| **`ML-4`'s wording** — no longer promises a mid-run stop it cannot deliver | `library/development/BACKLOG.md` |
| **Four new items on the "do not lose this" list, `N-15` to `N-18`:** the **orchestration boundary** (`N-15`, which must be written before `AH-3` is built), the **self-modification gate** (`N-16`), the **memory control plane** (`N-17`), and the **plugin capability model** (`N-18`) | `library/development/BACKLOG.md` |
| **Three of our items now carry the mechanism, not only the intent:** the responsible-user intersection on **`S-02`**; the policy order, the `deny_default` and the drift-expiring trust rule on **`AH-8`**; the content-hash identity and file-kind trust on **`AH-9`** | `library/development/BACKLOG.md` |
| **`S0` is unblocked** — the owner turned Docker Desktop auto-start on, so the re-run is mine; and `S0` now has one thing to explain, that `mercato-mcp-local` reports `unhealthy` | `library/development/BACKLOG.md` |

### 6.2 The evidence base, and the four stale carriers a critic pass found

| Changed | Where |
|---|---|
| **The extraction record is corrected, and the tree is repaired** — the archive holds **8,300 files**, the missing migration has been restored, and the two now agree exactly (see §7) | `library/paperclip-value-study/LOG.md`, `library/paperclip-hermes-study/findings/00-inventory.md` |
| **The first study's inventory was wrong and is corrected** — it said 8,299 files and blamed symlinks that failed to extract. Neither was true. Corrected in place, with the working | `library/paperclip-hermes-study/findings/00-inventory.md` |
| **The ISO is gone, and four documents still said "keep it"** — a runbook task, a runbook table row, a plan row and the hosting runbook. All four corrected | `RUNBOOK-platform-server.md` (§6a Task 5, §9.7, §10), `PLAN-coolify-laptop-implementation.md` (row 21), `RUNBOOK-hosting-server-manual.md` |
| **Docker Desktop auto-start is on, and the sprint-0 runbook still said it was off** — corrected, with the part that is still true kept: **the agent** still cannot start it | `RUNBOOK-sprint0.md` |
| **The budget over-promise was also sitting in the model-layer document** — *"a per-tenant policy that can spend must be able to stop"* is the exact phrase this study corrected in `ML-4`, and it was still there | `ARCHITECTURE-model-server-integration.md` §10 |

**And three corrections to this study's own findings, made by the critic pass and left visible rather than
quietly edited:**
1. The first draft of findings 01 and 06 said **"we have nothing"** about two things we do in fact have —
   the agent-learning prohibition, and a designed tenant-scoped memory provider. Both corrected in place,
   with the measurement that disproved them.
2. A **zero-hits** claim in findings 01 was made false by this study's own backlog change. The claim is now
   scoped to the documents as they were, and the exact phrases are named so the number is reproducible.
3. A **"only in the predecessor's audit"** claim was too strong — the audit exists in two copies, and
   Paperclip's own copied text also carries the words. The full search is recorded.

---

## 7. Method, and the limits of this answer

**How the claims were reached.**

- **Two routes for the extraction.** Route one, walk the filesystem: **8,300 files, 132,839,980 bytes**.
  Route two, sum the archive's own uncompressed sizes and diff it name by name against the tree: the same
  **8,300 files and 132,839,980 bytes**, with **zero missing, zero extra and zero size mismatches**. The
  two agree.
- **The extraction had a defect, and it is fixed.** The first pass recorded that the tree differed from the
  archive by *"a single symlink Windows will not create"*. That was **wrong**, and the measurement that
  disproved it is recorded in `LOG.md`. The archive holds **two** symlinks
  (`.claude/skills/company-creator`, `.claude/skills/paperclip`), and **both are present in the tree** as
  ordinary files holding their target paths. The real difference was **one file missing**:
  `packages/db/src/migrations/0118_pipeline_case_agent_fanout.sql`, 346 bytes. It has been restored from
  the archive, byte-for-byte. A claim of "the two agree" that had never been checked against the file list
  is exactly the class of error this study's own method exists to catch, so it is named here rather than
  buried.
- **Every load-bearing claim was re-read at its cited line** before this synthesis was written: the
  responsible-user contract, the budget hook, the checkout compare-and-swap, the built-in mutation policy,
  the reflection coach's rules, the memory adapter interface, the pipeline stages.
- **The critic pass found four errors in our own documents and findings**, all corrected: the two "we have
  nothing" claims above; the extraction record; and the broken link in this study's `README.md`.

**What this study did not do, and where its limits are.**

- **It did not run Paperclip.** Every claim is a reading of source and documentation. Where the code and the
  documentation disagree, the code is recorded and the disagreement is named (finding 02 §5).
- **It did not measure Paperclip's own claims about itself.** Where their README says a feature exists, the
  study checked whether code references it, and twice the answer was no (finding 04 §8).
- **It did not attempt to read all 8,300 files.** It read the root documents, the 30-plus documents under
  `doc/`, and the source at every line it cites. Areas with no bearing on us were skipped deliberately, and
  that is a limit: a value that is real but buried somewhere unread would not have been found.
- **It did not re-derive the first study.** Where the two overlap, this study cites
  `../paperclip-hermes-study/findings/10-lessons-and-target-design.md` rather than re-deriving it.

---

*Written 2026-10-05, the day the owner asked; finished 2026-10-06. Batches 1 to 12 complete.*
