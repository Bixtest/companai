# Batch 07 — The Synthesis

**Study:** n8n `2.44.0` · **Batch:** 07 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` (extract of `platforms/n8n-master.zip`) · **Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code — read only, nothing here is a licence to copy (§ batch 00 §2.5)

**Scope of this batch.** Batches 00–06 measured n8n from code. This batch does what a synthesis must:
state the platform's verdict in plain words, name the mechanisms worth carrying into the mapping pass,
state plainly what n8n does **not** give us, and answer the two value questions the method requires.
It is a *reading* of the six batches — no new claim about the source is introduced here, and every claim
restates a `file:line` already established in its originating batch.

**Method rules in force.** Code is the authority; docs are claims (rule 1). No comparison to our own
platform (rule 5) — this batch compares **batches to each other**, never n8n to our own platform; that is
the mapping pass's job. Pole-tag everything (rule 9). Name every capability, including the ones we will
not use (rule 6). Answer the two value questions (rule 4). Report the negatives. Correct earlier batches
where later evidence demands it (rule 13). Run the retirement rule before reusing an older-doc setting
(rule 10). **And the owner's §7 directive** — *what fits the vision* and *what could be taken further* —
which §7.7 carries, as **observations, never decisions**.

---

## 7.1 The measured page

Everything below was counted or read, not estimated.

| Quantity | Measured | Source batch |
|---|---|---|
| Zip md5 | `7cc78a5ea124ba2c270bccabf282d9ed` | 00 |
| Archive | **38,689 entries = 7,060 dirs + 31,629 files**; **76,776,813 B** zip; **218,643,247 B** on disk | 00 |
| Extraction | **`C:\n8n` — verified exact: 31,629 of 31,629 files, 0 missing, 0 extra** (not the workspace: MAX_PATH) | 00 |
| Declared version | **`2.44.0`** (`n8n-monorepo`); Node ≥ 24 · **pnpm 12.4.2** · **Turborepo** | 00 |
| Identity limit | **no `.git`** — the exact upstream commit cannot be read; "latest n8n" means *this extract* | 00 |
| `.ts` files | **22,715** (141,917,795 B — **65 % of all bytes**) | 00 |
| **Test ratio** | **15,266 product + 7,449 test = 32.8 % by filename** | 00 |
| `.vue` files | **1,409** in batch 00's whole-tree count · **1,351** inside `packages/frontend` (batch 05) | 00, 05 |
| **`packages/`** | **30,740 files / 208,063,359 B = 95 % of the tree** | 00 |
| `@n8n` packages | **57** internal packages + 9 top-level groups | 00 |
| CLI | **26 operator commands** (27 files) — audit, db revert, engine, execute, export/import, license, publish, start, webhook, worker… | 01 |
| Engines | **two** — a shipped service-based engine in `packages/core`, and a **v2 engine its own README calls *"a scaffold … not yet wired into n8n"*** | 01 |
| ADRs | **6** in the v2 engine — durable execution, token-authorized resume, control/data plane split | 01 |
| Nodes | **563** built-in `.node.ts` ("1,500+" is community nodes — a distribution claim, marked) | 01 |
| `@n8n/agents` | **v0.29.0** — 133 runtime files + 42 SDK files + 40 workspace files | 02 |
| Skills | a **`SKILL.md`** validated, **72 KB output cap**, content-hashed linked files, declared MCP deps | 02 |
| Model catalog | fetched from **`models.dev`** — USD-per-million-token cost + context limits, provider aliases | 02 |
| Tenancy | **`Project` `personal \| team`**; **10 roles** (4 global + 6 resource-level); **206 `resource:action` scopes** (4 of 5 scope files are `.ee`) | 03 |
| Identity | **`User` + `AuthIdentity` + `ApiKey`** — one person, several logins, unique per provider | 03 |
| Expression sandbox | **isolate pool** scaling to zero when idle; **zod-validated RPC boundary**; two backends (isolated-vm, QuickJS) | 04 |
| Wait model | short waits **in-process**; **two sentinel dates** (year 3000 / 2999); the v2 ADR's "under 65 s" = the real **`65_000`** | 04 |
| Observability | a **sampling policy** — drop signal-free spans; DB/HTTP only when slow; poll triggers at **0.1 %** | 04 |
| Frontend | **`editor-ui` + 12 `@n8n` packages**; **129 design-system components** enforced by their own ESLint plugin | 05 |
| Composition surface | **a canvas of 7 element types**; **CRDT on y-websocket with awareness**; `create-node` scaffolder | 05 |
| Quality gates | **299 hashed architectural violations** (6 rules) + **110 boundary issues** — two ratchets that can only shrink | 06 |
| Agent harness | **pinned + lock-validated** (`cat-bot` `harness-v0.6.0`); `agent-check.mjs` shows the agent an excerpt only | 06 |
| Licence enforcement | a **13-line `@licensed` method decorator** on route metadata — marked, not wrapped | 06 |
| Telemetry | PostHog, **enabled by default**, project key as a hardcoded default | 06 |
| Extensions | **`packages/extensions/` holds one file — `.gitkeep`, 0 bytes** | 06 |
| **Findings written** | **73** (12 + 13 + 12 + 12 + 12 + 12 across batches 01–06) | all |
| Corrections recorded | **1** in batch 06 (the "extensions" subject) + the batch-01 silent-tenancy resolution | all |

**➜ F7-1 [foundational] — n8n is a **code-dominant TypeScript monorepo in which a real composition
surface exists for the first time in this study**: 22,715 `.ts` files at 65 % of all bytes, 57 internal
packages, 563 built-in nodes, and a Vue frontend of 1,351 files carrying a 129-component design system
and a canvas.** **Plain meaning:** this is a product cut into packages, with its interface — not its
engine — as the largest and most deliberate part. **Why it matters:** every finding below is weighted
accordingly, and the study's predicted headline (batch 00: *"PX-W is expected to be the strongest"*) is
**confirmed by measurement, not assumed**.

---

## 7.2 The three poles, headlined

### Pole 1 — The aissistant

**An agent is a configuration object built by a fluent API, and its safety is written as two questions
asked at two moments.**

`@n8n/agents` v0.29.0 is the AI surface (F02-01): an `Agent` is a **builder with 25+ configuration
methods**, lazily built, and *"user code never calls `.build()`"* — `build()` is `protected`. So an agent
is **data you describe**, not a class you inherit. Capability arrives as a **`SKILL.md`** (F02-03):
validated, with a **72 KB output cap**, **content-hashed** linked files, a UI contract, an invocation
policy, declared MCP dependencies, and a schema-versioned registry — *the most complete declarative-
capability design in the study*. Delegation is a **first-class tool with suspend/resume**, a max-children
cap and a difficulty rating (F02-04). Cost is a **guardrail**, not a report (F02-07): a `SpendLedger`
idempotent per `callId`, a per-session cap and a monthly budget. And the two primitives that make it
safe are small and exact (F02-05/06): a guardrail is **`allow` or `stop(code)`**, run **before a model
call and before a tool call**; and **tool output is untrusted input** — invisible Unicode stripped,
wrapped with its source.

**Pole 1 verdict, plainly:** the agent model is **declarative, priced, and defended by default** — the
prompt-injection defence and the spend stop are built in, not bolted on. What it does **not** have is a
tenancy-aware tool door of its own: the agent's tools are its tools, and where an MCP server or a
platform tool is reached, the identity it reaches them as is **not** decided here (the seam is the
platform's, batch 03).

### Pole 2 — The workspace

**The container is one object with two modes, membership is a row, and permissions are a vocabulary
rather than a question.**

The container is **`Project`**, and its `type` is `personal | team` (F03-01) — your private space and
your team's space are **the same object**, so there is no second hierarchy to maintain. Membership is a
**join row keyed `(userId, projectId)` carrying a Role by slug** (F03-02), which is why a custom role
needs no migration. Roles are **two-level** (F03-03): a **global** role for the instance
(`owner`/`admin`/`member`/`chatUser`) and a **resource-level** role for the thing — *"what can I do
anywhere"* and *"what can I do to this"* kept apart. Underneath, permissions are **206
`resource:action` scopes** (F03-04): nothing asks *"are you an admin?"*, it asks *"may you do X to
this"*. Identity is separated from login (F03-05) — **`User` ≠ `AuthIdentity`**, one person, several
identities, unique per provider. Sharing reuses the membership primitive (F03-06): a **join row plus a
role**, for workflows and credentials alike. Variables are **project-scoped or explicitly global**
(F03-07), and workflows are **versioned, one active version, shared not copied** (F03-09).

**Pole 2 verdict, plainly:** this is a **real tenancy model** — the strongest of the six studied — where
the container, the membership and the permission are three clean, separate things. What it does **not**
have is a per-datum read filter: the scopes gate *actions*, and where a row-level read decision is
needed, that is a finer grain than the scope vocabulary expresses (a boundary, not a gap).

### Pole 3 — Automations

**A workflow engine whose best security decision is one sentence, and whose durability rule is a
written, accurate ADR.**

The shipped engine is service-based (F04-01): a hook registry, a poll manager, a routing node,
scheduled tasks, an **external-secrets proxy**. But the finding that travels furthest is in the
expression runtime (F04-02/03): expressions run in a **pool of isolates that scales to zero when idle**,
with a **no-partial-state invariant** written down, across a **zod-validated RPC boundary** whose own
comment states the rule the whole study should remember — ***"TS types are erased at runtime and
contribute zero security."*** Durability is a written ADR, and it is **accurate** (F04-05): *"a pause must
be a status of the step row; it must not be a state of a process"*, and its "under 65 seconds" is the
real `65_000` in code. Long-lived resumption is authorized by a **token on the URL**, in two kinds
(execution-bound, step-bound) with two opposite-direction tokens to prevent replay (F01-08). The human is
a **node with a rendered form** (F04-07). Observability is a **sampling policy** (F04-08): three
constants decide what is worth recording *before* anything is recorded.

**Pole 3 verdict, plainly:** work is started, waited on, approved, resumed and observed — with the
**security boundary and the durability rule both stated in prose before the code**. What it does **not**
have is a *design-time* job graph: the engine executes workflows, but the v2 engine that would make
durable execution a first-class property is **still a scaffold** (F01-03), so the durable model is
**designed and documented, not yet shipped**.

### PX-W / PX-F — Widgets and frontend

**The composition surface this workshop has been looking for, and it is enforced by its own linter.**

Measured: the frontend is **1,351 `.vue` files** (F05-01) built from **`editor-ui` + 12 `@n8n`
packages** (F05-02), with **129 design-system components** documented by tokens and **enforced by their
own ESLint plugin** (F05-03) — a design system that *cannot drift*. The composition surface is a
**canvas of seven element types**: nodes, edges, handles, groups, selection, background, buttons (F05-05),
with a layout engine and a mapping layer (F05-09). Collaboration is a **CRDT layer on the y-websocket
protocol with awareness** — presence and cursors as a separate channel from document sync (F05-06) — with
`CanvasCollaborationPill` / `CanvasThinkingPill` making both presence and AI activity visible (F05-10).
Third parties author nodes through **`create-node`**, declaratively or programmatically, CLI-scaffolded
(F05-08).

**PX verdict, plainly:** **this is the first platform in the study with a real widget / composition
model** — the four closed studies each measured **none** (Paperclip none, Multica none, Gas Town none,
and Paperclip's claim to a composer is *not* one). It is not a widget *composer* in the drag-any-element
sense; it is a **typed canvas of workflow elements with a shared editing surface**. That distinction is
the finding.

---

## 7.3 The ranked mechanisms — what to carry forward

Ranked by how much they would cost us to derive ourselves — value-first, not novelty-first.

1. **The zod-validated isolation boundary** [P3/PZ] — expressions in an isolate pool, a validated RPC
   edge, and the sentence that makes it portable: *"TS types are erased at runtime and contribute zero
   security."* The most transferable security decision in the study. (§4.2)
2. **The two guardrail primitives + untrusted tool output** [P1/PZ] — **`allow` or `stop(code)`**, run
   before a model call and before a tool call; tool results stripped of invisible Unicode and wrapped
   with their source. A small, complete, measurable prompt-injection defence. (§2.5, §2.6)
3. **The `SKILL.md` contract** [P1] — validated, **72 KB capped**, content-hashed, with an invocation
   policy and declared MCP dependencies. The most complete declarative-capability design in the study.
   (§2.3)
4. **Cost as a guardrail with a spend ledger** [P1] — idempotent per `callId`, a per-session cap and a
   monthly budget; **overspend stops instead of reporting**. (§2.6.1)
5. **The ADR practice, proven accurate** [P3/PZ] — six decisions written, dated and owned *in the repo*,
   including for code not yet shipped; and the ADR names the exact constant it will change (`65_000`).
   (§1.4)
6. **The two ratchets** [PZ] — **299 hashed architectural violations** across 6 rules and **110 boundary
   issues**, in baselines CI can only reduce. The retirement rule turned into a build gate. (§6.1)
7. **The durable-execution rule + token-authorized resume** [P3] — *"a pause is a status of the step row,
   not a state of a process"*; two URL kinds, two opposite-direction tokens, replay-proof. (§1.4, §4.3)
8. **The two-mode container + the scope vocabulary** [P2] — `Project` `personal | team` in one column;
   **206 `resource:action` scopes**; roles two-level. The cleanest tenancy model in the study. (§3.1–§3.3)
9. **`INodeType` as the composition primitive** [PX-W] — a description plus optional behaviours, with
   `supplyData` already serving as the AI-tool seam and a chat handler beside it. (§1.5)
10. **The canvas + the enforced design system** [PX-W/PX-F] — a seven-element-type canvas, a layout
    engine, a CRDT collaboration layer with awareness, and **129 components enforced by a lint rule**.
    (§5.3–§5.5)
11. **Observability as a sampling policy** [P3/PZ] — three constants decide what is recorded before
    anything is recorded. (§4.5)
12. **The pinned, validated agent harness + the context budget** [PZ] — agents as a supply chain
    (`harness-v0.6.0`, lock-validated); full output to disk, **an excerpt to the agent** (`agent-check.mjs`).
    (§6.2, §6.3)
13. **Licence-as-metadata** [PZ/P2] — a **13-line `@licensed` decorator** marking route metadata; one
    registry enforces it; a feature is **marked, not wrapped**. (§6.4)
14. **The model catalog as fetched data** [P1] — cost and context limits carried with the model, so
    *"no lock-in"* is measurable and price feeds the guardrail. (§2.8)

**➜ F7-2 [synthesis] — The top four are all about **making a limit enforceable at one seam**: validate
every value that crosses the boundary, decide allow-or-stop at the two moments that matter, cap the
capability's output, and cap the money — each written once and applied everywhere.** **Plain meaning:**
n8n's best contributions are **one-sentence rules with one implementation point**, not features. **Why it
matters:** a rule at one seam is cheap to adopt, cheap to prove, and impossible to half-copy — the same
property that made Gas Town's *decided limits* the most valuable thing there.

---

## 7.4 What n8n does NOT give us

Stated as plainly as the positives, because a study that only lists features is useless.

| Absent capability | Measured how | Batch |
|---|---|---|
| **A shipped durable-execution engine** | the v2 engine's own README: *"a scaffold … not yet wired into n8n"*; the ADRs describe it | 01 |
| **A per-datum / row-level read filter** | permissions are **206 action scopes**, not row predicates; the grain is the action | 03 |
| **A single agent runtime of its own** | the AI surface is a **builder + SDK**, not an engine; the model is fetched, the tools are the caller's | 02 |
| **A tenancy-aware tool door for the agent** | the agent's tools are its own; where a tool reaches a platform, the principal is **not decided in the AI surface** | 02, 03 |
| **The commercial core is copyable** | **`.ee` files are unlicensed**, incl. `ai-workflow-builder.ee` and 4 of the 5 scope files | 00, 03 |
| **Telemetry is opt-in** | PostHog **enabled by default**, key as a hardcoded default | 06 |
| **A populated extensions mechanism** | **`packages/extensions/` is one `.gitkeep`, 0 bytes** — a name, not a capability | 06 |
| **A widget *composer* of arbitrary elements** | the canvas composes **workflow elements** (7 types), not general-purpose UI widgets | 05 |
| **Public-domain licensing** | **fair-code / Sustainable Use License**, not open source | 00 |

**➜ F7-3 [synthesis] — The absences cluster into one sentence: n8n is a **fair-code workflow-automation
product with an outstanding composition surface and a real tenancy model, whose durability engine is
designed but not yet shipped and whose commercial core is not copyable.** **Plain meaning:** the parts
most valuable to us (the isolation boundary, the guardrails, the skill contract, the two ratchets) are in
the **readable, Sustainable-Use-licensed** majority; the parts that are `.ee` we may **read to understand
and must reimplement to use**. **Why it matters:** it tells the mapping pass exactly what posture to take
— *read the architecture, reimplement what is worth having* — and warns it that the "extensions" seam and
the "shipped durable engine" are the two places a careless reader would over-claim.

---

## 7.5 The consistency check across batches

A synthesis must look for contradictions between its own inputs. Three were found and are recorded rather
than smoothed, and one correction was applied and recorded in the batch that made it.

1. **`.vue` count: 1,409 vs 1,351.** Batch 00 counted **1,409** `.vue` files over the **whole tree**;
   batch 05 counted **1,351** inside **`packages/frontend`**. Both are true and they measure different
   things: the tree count includes `.vue` files elsewhere (test fixtures, tooling). Recorded, not
   reconciled by deleting one — the synthesis states the basis of each, as the pin's checklist requires.
2. **The CLI's silence on tenancy (batch 01) was not a missing model.** Batch 01 recorded that the CLI
   has **no** tenant/project/workspace verb (F01-11) and carried the question to batch 03. Batch 03
   answered it: the **server** has a full tenancy model (Projects, membership, 206 scopes); the CLI is an
   **operator tool** for one installation. **Recorded as F03-10** — a resolution, not a guess. This is the
   one place the synthesis is entitled to say "batch 03 closed batch 01's question," and it does so with
   the evidence, not the assertion.
3. **"Extensions" was a name, not a mechanism.** The batch-00 plan named *"extensions"* as a PZ subject,
   implying a mechanism at `packages/extensions/`. Batch 06 measured that directory as **one `.gitkeep`,
   0 bytes**, and went to find the real mechanism elsewhere. **Corrected in batch 06 per rule 13, and
   recorded** (F06-08) rather than silently amended. The synthesis carries the correction, not the plan.
4. **The frontier is consistent.** Every batch found the same shape from a different side: a **code-first
   product whose seams are named and whose limits are stated** — the engine is honest about being a
   scaffold, the licence is explicit about what is not licensed, the extensions directory is an empty
   promise recorded as empty. That is a coherent posture, not a coincidence of readings.

**➜ F7-4 [synthesis] — No batch was falsified by a later batch; one question was closed with evidence,
one count had its basis stated, and one plan item was corrected by measurement.** **Plain meaning:** the
73 findings hold together as **one body of evidence**. **Why it matters:** the mapping pass can use them
as one corpus, with the `.vue` basis stated, batch 01's tenancy question marked closed by batch 03, and
the "extensions" subject corrected.

---

## 7.6 The two value questions (rule 4)

### Q1 — What does this platform do for *its own users*?

**For a team that wants to automate work with a visual canvas and code where it is needed: it does a
great deal, and the AI surface is now part of the product rather than a bolt-on.** You get a canvas of
nodes and edges you compose by hand, with **presence and cursors** while a colleague edits beside you
(F05-05/06); **129 design-system components** that keep it consistent without a style meeting (F05-03); an
**agent builder** whose skills are checked packages and whose spend is capped before it can run away
(F02-03/07); **MCP servers that plug in as ordinary tools** (F02-10); expressions that are **contained and
cost nothing when idle** (F04-02); a human-approval node with a real form (F04-07); and **two ratchets**
that make the codebase get better by construction (F06-01/02). The divergences are few, and where docs and
code disagree the code is *more* precise — the same happy shape found in Gas Town.

**Verdict on Q1:** as a **workflow-automation product with a real tenancy model and a real composition
surface**, this is the **most complete platform studied**, and mature for its users. Its limits are not
gaps for them: a team on one instance does not need per-datum read filters, and the durable v2 engine is
the vendor's roadmap, not a missing feature of the product they run today.

### Q2 — What does it do for *our vision*?

**A great deal as a mechanism source, and it answers a question the workshop has been carrying for five
studies: what a composition surface actually looks like.** n8n is the **first platform measured to have
one** — a seven-element-type canvas, a layout engine, and a CRDT collaboration layer with awareness —
which the four closed studies could not show. Inside the readable majority it also offers the study's
best **portable security decision** (the validated isolation boundary and its one-sentence rule), its best
**declarative capability** (the `SKILL.md` contract), its best **tenancy vocabulary** (206 scopes,
two-level roles, `personal | team`), and a **retirement rule turned into CI** (the two ratchets).

**Verdict on Q2:** n8n is a **mechanism source and a composition-surface reference** — take the isolation
boundary, the two guardrail primitives, the skill contract, the cost-as-guardrail, the ADR practice, the
ratchets, the tenancy vocabulary and the canvas-plus-design-system; and treat its `.ee` boundary and its
scaffold engine as **the line between what we may read and what we must build**, not as gaps to fill from
here.

**➜ F7-5 [synthesis] — The two questions point the same way, and for the first time one of the answers is
a *shape* rather than a mechanism: n8n shows what a composition surface is, and it also shows — in `.ee`
and in a scaffold — exactly where the copyable part of the product stops.** **Plain meaning:** the closer
a platform gets to the whole vision, the more important its **licence line** becomes, because that line is
where *understanding* ends and *building* begins.

---

## 7.7 The finding index

Consolidated for the mapping pass. Format: `id · pole · one line · batch §`.

**Foundations** — the pin (md5 `7cc78a5e…`, 31,629 files, extract-verified), the MAX_PATH extraction
hazard, the identity limit (no `.git`), the code-dominant shape (65 % of bytes are `.ts`), the 32.8 %
test ratio, and the fair-code licence that governs every reuse question · 00 §1–§6.

**Pole 1 — the aissistant** — F02-01 the agent is a lazy-built configuration object [P1] 02 §2 · F02-02 a
133-file runtime organised by concern [P1] 02 §1 · F02-03 the `SKILL.md` contract, 72 KB capped,
content-hashed [P1] 02 §3 · F02-04 sub-agent delegation with suspend/resume and a max-children cap
[P1] 02 §4 · F02-05 a guardrail is `allow` or `stop(code)` at two points [P1/PZ] 02 §6 · F02-06 tool
output is untrusted input, stripped and wrapped [P1/PZ] 02 §5 · F02-07 cost is a guardrail with a spend
ledger [P1] 02 §6.1 · F02-08 model choice is fetched data with price and limits [P1] 02 §9 · F02-09
memory is an observation log with a reflector [P1] 02 §7 · F02-10 an MCP client that connects lazily and
deduplicates [P1] 02 §8 · F02-11 tools are deferred (`LOAD_TOOL`/`SEARCH_TOOLS`) [P1] 02 §5 · F02-12 the
agent can keep a plan [P1] 02 §5 · F02-13 `ai-node-sdk` is a 1-file barrel, not a feature — recorded so it
is not misread [PZ] 02 §1.

**Pole 2 — the workspace** — F03-01 `Project` with `type: personal | team` [P2] 03 §1 · F03-02 membership
is a composite-key join row carrying a Role by slug [P2] 03 §2 · F03-03 roles are two-level, global +
resource [P2] 03 §3.1 · F03-04 206 `resource:action` scopes, 4 of 5 files `.ee` [P2] 03 §3.2 · F03-05
`User` ≠ `AuthIdentity` [P2] 03 §4 · F03-06 sharing is the same primitive as membership [P2] 03 §5 ·
F03-07 variables are project-scoped or global [P2] 03 §6.1 · F03-08 `ByteStore` is pluggable, S3/Azure are
`.ee` [P2/PZ] 03 §6.2 · F03-09 workflows are versioned, one active version, shared not copied [P2] 03 §6.3
· F03-10 the CLI's silence was not the product's — the tenancy model is the server's [P2] 03 §7 ·
F03-11 `roleMappingRules` many-to-many for external role mapping [P2/PZ] 03 §7 · F03-12
`customTelemetryTags` on `Project` [PZ] 03 §7.

**Pole 3 — automations** — F04-01 the service-based shipped engine [P3] 04 §1 · F04-02 the idle-scaling
isolate pool with a no-partial-state invariant [P3/PZ] 04 §2.1 · F04-03 the zod-validated RPC boundary —
*"TS types … contribute zero security"* [P3/PZ] 04 §2.2 · F04-04 short waits sleep in-process, trade
stated [P3] 04 §3 · F04-05 the v2 ADR is accurate (`65_000`) [P3/PZ] 04 §3 · F04-06 two sentinel dates for
"wait forever" vs "wait for a sub-execution" [P3] 04 §3 · F04-07 human approval is a node with a rendered
form [P3/PX-W] 04 §4 · F04-08 observability is a sampling policy [P3/PZ] 04 §5 · F04-09 four expression
failure classes, classified [P3/PZ] 04 §2.3 · F04-10 two isolation backends behind one `Tournament`
bridge [PZ] 04 §2.2 · F04-11 an `external-secrets-proxy` seam [P3/PZ] 04 §1 · F04-12 pluggable tracing
backends [PZ] 04 §5.

**Widgets / frontend** — F05-01 1,351 `.vue` files — the frontend is a product [PX-F] 05 §1 · F05-02
`editor-ui` + 12 packages [PX-F] 05 §2 · F05-03 129 components enforced by their own ESLint plugin
[PX-F] 05 §3 · F05-04 a frontend `AGENTS.md` with an isolation rule and icon discipline [PX-F] 05 §6 ·
**F05-05 the canvas of seven element types [PX-W] 05 §4.1** · **F05-06 CRDT on y-websocket with awareness
[PX-W] 05 §5** · F05-07 pluggable modules with a hard isolation rule [PX-F] 05 §6 · F05-08 `create-node`,
declarative and programmatic [PX-W] 05 §7 · F05-09 a canvas layout engine and agent-node geometry [PX-W]
05 §4.2 · F05-10 canvas-specific components — presence and AI activity as UI [PX-W] 05 §4.2 · F05-11 a
styleguide with tokens and a `VariableTable` [PX-F] 05 §3 · F05-12 the frontend is Vue, with `el-plus` and
Pinia — recorded per rule 6 [PX-F] 05 §1.

**Out-of-pole** — F06-01 a hashed baseline of 299 architectural violations that can only shrink [PZ]
06 §1.2 · F06-02 a boundaries baseline of 110 issues [PZ] 06 §1.1 · F06-03 a pinned, lock-validated agent
harness from a separate repo [PZ] 06 §2 · F06-04 `agent-check.mjs` files the output, shows the agent an
excerpt [PZ] 06 §3 · F06-05 licence enforcement is a `@licensed` decorator on route metadata [PZ/P2]
06 §4 · F06-06 telemetry is opt-out, default on, key in source [PZ] 06 §5 · F06-07 community packages are
scanned for provenance [PZ] 06 §6 · **F06-08 `packages/extensions/` is empty — a name is not a capability
[PZ] 06 §7** · F06-09 the `@Env` JSDoc is public documentation [PZ] 06 §1 · F06-10 a real scripts
toolchain of executable guardrails [PZ] 06 §1 · F06-11 `lefthook.yml` wires the git gates [PZ] 06 §1 ·
F06-12 `agent-setup.mjs` gives each agent an isolated working directory [PZ] 06 §2.

**Synthesis** — F7-1 the measured page [—] §7.1 · F7-2 fourteen mechanisms ranked [—] §7.3 · F7-3 the
absences cluster [—] §7.4 · F7-4 three consistencies recorded, one correction carried [—] §7.5 · F7-5 the
two questions answered [—] §7.6 · F7-6 the owner's §7 directive, as observations [—] §7.8 · F7-7 the
five load-bearing findings named [—] §7.7.

**➜ F7-7 [synthesis] — 73 findings, five of them load-bearing: F04-03 (the validated isolation
boundary), F02-05/06 (the guardrails + untrusted tool output), F02-03 (the skill contract), F05-05 (the
canvas — the study's first composition surface), and F06-01/02 (the two ratchets).** **Plain meaning:** if
the mapping pass reads only five lines, these are the five — and unlike Gas Town's, only one of them is a
*decided limit*; the rest are **mechanisms with one implementation point**. **Why it matters:** it gives
the next stage a prioritised entry point, and it names where this platform's value is different in kind
from the previous five.

---

## 7.8 The owner's §7 directive — what fits, and what could be taken further

The pin's §5 records the owner's two questions. This section answers them **as observations, never as
decisions** (rule 5 stops at the observation; the mapping pass and the owner decide), and the licence
gate from batch 00 §2.5 travels with every one.

**What fits the vision (measured, per capability).** Answered per capability across batches 01–06, and
ranked in §7.3. In one paragraph: the **isolation boundary and its rule** (F04-03) fit any place we run
untrusted code; the **two guardrail primitives and untrusted tool output** (F02-05/06) fit the aissistant
pole directly; the **skill contract** (F02-03) is a shape our capability layer can adopt; **cost as a
guardrail** (F02-07) fits wherever a model call has a budget; the **ADR practice** (F01-06) fits our own
design record; the **two ratchets** (F06-01/02) fit our quality gates; the **two-mode container and the
scope vocabulary** (F03-01/03/04) fit the workspace pole; and the **canvas + enforced design system**
(F05-03/05) fit the widgets pole — the workshop's long-open question.

**What could be taken further (observations only).** Each names a mechanism and the shape of an
extension, and **stops**:

- **The scope vocabulary → a per-datum filter.** The 206 action scopes gate *actions*; n8n has no row
  predicate. *Observation:* the same `resource:action` pattern could carry a **row predicate** beside the
  action, but n8n does not do it and the mapping pass decides whether it should be built. (§3.3)
- **The two ratchets → a ratchet on our own boundaries.** The pattern is **measured, hashed debt in a
  baseline that CI only reduces**. *Observation:* it is a general mechanism — it could hold any
  violation count we choose, not only n8n's six rules. (§6.1)
- **The canvas → a composition surface for our nuggets.** The canvas composes **workflow elements**.
  *Observation:* the same seven-element-type distinction (element, edge, handle, group, selection,
  background, control) could describe a **nugget surface**, but that is our design decision, not n8n's.
  (§5.4)
- **The skill contract → our declarative capability.** *Observation:* the `SKILL.md` shape (validated,
  capped, content-hashed, with declared dependencies) is a **complete** design; whether our capability
  layer adopts it verbatim, in part, or not at all is a decision for the mapping pass. (§2.3)
- **The agent harness → our own agent quality loop.** *Observation:* the pinned, lock-validated harness
  plus the excerpt-to-the-agent context budget is a **pattern for running an AI agent on our own
  repository**, which is a decision we have not yet made. (§6.2/6.3)
- **The licence line as a design input.** *Observation:* `.ee` marks the exact boundary between
  *readable architecture* and *unlicensed feature*; in a later build, the same seam discipline (a marker
  on the route, one registry) could express **our own** commercial boundary. (§6.4)

**➜ F7-6 [synthesis] — Six observations, each a **shape we could extend**, none a decision.** **Plain
meaning:** n8n offers at least six mechanisms that are *general enough to push further* — a scope
vocabulary that could carry row predicates, a ratchet that could hold any debt, a canvas that could
describe nuggets, a skill contract, an agent harness, and a licence seam. **Why it matters:** it turns the
synthesis from a list of what n8n *is* into a short list of what n8n *could become in our hands* — which
is exactly what the owner's §7 directive asked for, held at the observation line.

---

## 7.9 The platform verdict, in one paragraph

**n8n `2.44.0` is a fair-code workflow-automation product, and it is the most complete platform this
workshop has studied.** It is a **code-dominant TypeScript monorepo** — 22,715 `.ts` files at 65 % of all
bytes, 57 internal packages, one Turborepo, one pnpm lockfile — whose AI surface (`@n8n/agents` v0.29.0)
is a **lazy-built agent configuration object** with **`SKILL.md` skills**, **`allow`/`stop(code)`
guardrails** at the two moments that matter, **tool output treated as untrusted**, and **cost as a
guardrail with a spend ledger**. Its workspace is a **real tenancy model** — a `Project` that is
`personal | team`, membership as a composite-key join row, **10 roles** two-level, and **206
`resource:action` scopes** — with `User` separated from `AuthIdentity`. Its automations rest on the
study's single best portable security decision — expressions in an **isolate pool** behind a
**zod-validated RPC boundary**, under the sentence *"TS types are erased at runtime and contribute zero
security"* — plus a durable-execution rule written and **accurate** in an ADR (*"a pause is a status of
the step row"*), and observability as a **sampling policy**. And its frontend is the **first real
composition surface in the study**: a canvas of seven element types, a layout engine, **CRDT collaboration
with awareness**, and **129 design-system components enforced by their own linter**. It is honest about
its limits — its durable v2 engine is a **documented scaffold**, its `packages/extensions/` is an **empty
directory**, and its commercial core is **`.ee` and unlicensed**. The correct posture toward it is
therefore **mechanism source, composition-surface reference, and a licence line to respect**: read the
architecture in the Sustainable-Use-licensed majority, **reimplement what is worth having**, and treat
the `.ee` boundary and the scaffold engine as the exact place where understanding ends and building
begins.

---

## 7.10 Batch 07 — checklist

- [x] Read from source only; no new source claims introduced (all restate verified findings).
- [x] Every finding carries its originating batch and section (§7.7 index).
- [x] No comparison to our own platform (rule 5) — internal batch-to-batch consistency only (§7.5); the
  owner's §7 notes are held as **observations** (§7.8).
- [x] Both value questions answered separately (rule 4, §7.6).
- [x] Absences reported as findings, not omitted (rule 6, §7.4).
- [x] Three cross-batch consistencies recorded, none smoothed; one correction (the "extensions" subject)
  carried from batch 06 rather than reapplied (rule 13, §7.5).
- [x] Retirement rule honoured: no earlier finding deleted to fit the synthesis (rule 10).
- [x] The licence gate applied to every "take it further" observation (§7.8; batch 00 §2.5).
- [x] 7 synthesis findings: F7-1…F7-7, plus the complete finding index (§7.7).

The n8n study is complete: **pin (00) + 73 findings across six pole batches (01–06) + this synthesis
(07).** The reader is built from this markdown, at the end, with the platform-agnostic generator — and
no study markdown is edited to fit it.

---

*Batch 07 of 07. Written 2026-10-15. The n8n study is CLOSED. Next: the n8n reader, then the next
platform (order not fixed — ask before extracting another ~700 MB).*
