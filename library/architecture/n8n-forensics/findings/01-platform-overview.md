# Batch 01 — Platform Overview

**Study:** n8n `2.44.0` · **Batch:** 01 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` (extracted from `platforms/n8n-master.zip`, module `n8n-monorepo`)
**Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code — `.ee` files unlicensed (see batch 00 §2.5)
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; the code is the authority.

---

## 0. What this batch had to answer

n8n is not a library or a framework — it is a **product**: a monorepo whose centre is a workflow
engine, a node catalog, and a visual editor. So the question for batch 01 is: **what is the shape of the
machine, and where does the interesting architecture actually live?**

Short answer, measured:

| Question | n8n's answer | Where |
|---|---|---|
| What is it made of? | A **TypeScript monorepo** — 57 `@n8n` packages + 9 top-level groups; `packages/` is **95 % of the tree** | F01-01 |
| How is it operated? | A **CLI of 26 commands** (27 files) — audit, db revert, engine, execute, export, import, license, publish, start, webhook, worker… | F01-02 |
| How is a workflow run? | **Two engines**: a shipped one in `packages/core`, and a **v2 engine that its own README calls a scaffold** | F01-03 |
| **What is a node?** | `INodeType` — a description, an optional `execute`, an optional `supplyData` (for tools), an optional chat handler | F01-04 |
| How many nodes ship? | **563 `.node.ts` files** in `nodes-base` | F01-05 |
| **What is the most interesting thing?** | **Six ADRs in the v2 engine** recording real architecture decisions — durable execution, a token-based resume, a control/data plane split | F01-06 |

---

## 1. The measured shape

Recapped from batch 00 because it governs every count below.

| Quantity | Measured |
|---|---|
| Files / bytes | **31,629 files / 218,643,247 B** |
| `packages/` | **30,740 files / 208 MB — 95 % of the tree** |
| `.ts` | **22,715 files / 141.9 MB** (65 % of all bytes) |
| `.vue` | 1,409 files / 9.7 MB |
| Test share | **32.8 %** of `.ts` files (7,449 of 22,715) |
| `docs/` | 332 files |

**The hazard here is the opposite of CrewAI's (93 % documentation).** n8n is code-dominant and its doc
set is small enough to read entirely. Rule 1 applies as a habit, not a suspicion — but there is a
different trap: **the most valuable documents in this tree are not docs at all, they are ADRs**, and they
are easy to miss (§4).

---

## 2. The module map

`packages/` holds **nine top-level groups plus 57 scoped `@n8n` packages**:

| Group | Files (non-test) | What it is |
|---|---:|---|
| **`packages/@n8n/`** | — | **57 packages — the whole product, sliced** |
| `packages/cli` | 27 command files | the CLI |
| `packages/core` | — | **the shipped execution engine** (`src/execution-engine/`) |
| `packages/workflow` | **72 `src/` entries** | **the workflow data model and the node contract** |
| `packages/frontend` | — | the **Vue.js** editor UI |
| `packages/nodes-base` | **563 `.node.ts`** | the built-in node catalog |
| `packages/extensions` | — | the community extension mechanism |
| `packages/modules`, `node-dev`, `quality`, `workflow` | — | tooling and quality gates |

**The split between `packages/workflow` and `packages/core` is the first real architectural decision:**
`workflow` holds the **model** (types, expressions, the node contract, cron), `core` holds the
**runtime** (the execution engine, storage, encryption, observability). A workflow can be described
without being executed.

---

## 3. The control plane: the CLI

`packages/cli/src/commands/` holds **27 command files** (excluding `__tests__`), i.e. **26 commands**
plus `base-command.ts`, the base class they extend: `audit`, `db revert`, `engine`, `execute`,
`execute-batch`, `export credentials|entities|nodes|workflow`, `import credentials|entities|workflow`,
`ldap reset`, `license clear|info`, `list workflow`, `mfa disable`, `publish workflow`, `start`,
`ttwf generate|worker-pool`, `unpublish workflow`, `update workflow`, `user-management reset`,
`webhook`, `worker`.

**Three observations, plainly:**

1. **The CLI is an operator's tool, not the product.** It starts the server, runs a workflow once,
   exports/imports definitions, manages users and licences. The product is the **server plus the editor**.
2. **There is an `engine` command** — the CLI can talk to the (scaffold) v2 engine, which is how a
   not-yet-wired package still gets exercised.
3. **`execute-batch` and `execute` are separate** — running one workflow and running a batch are
   different verbs, which matters for the automations pole (batch 04).

**What the CLI does *not* have:** any notion of a tenant, a project, or a multi-user workspace. The CLI
operates **one installation**. (Batch 03 takes up tenancy.)

---

## 4. Two engines — and the second one is the finding

### 4.1 The shipped engine: `packages/core/src/execution-engine/`

Measured contents include `execution-context.service.ts`, `execution-lifecycle-hooks.ts`,
`routing-node.ts`, `poll-trigger-executor.ts`, `poll-job-manager.ts`, `scheduled-task-manager.ts`,
`external-secrets-proxy.ts`, `partial-execution-utils/`. The shape is a service-based engine with hooks
and a poll manager — competent, and not where the architectural interest is.

### 4.2 The v2 engine: a documented scaffold

**`packages/@n8n/engine` — version `0.24.0`, described as *"n8n workflow execution engine (v2)"*.** It
holds **138 files across 15 modules**:

| Module | Files | | Module | Files |
|---|---:|---|---|---:|
| **`execution`** | **38** | | `server` | 7 |
| **`database`** | 17 | | `lifecycle-events` | 7 |
| **`auth`** | 10 | | `response-channel` | 7 |
| **`graph`** | 9 | | `admittance` | 5 |
| `common` | 4 | | `queue` | 4 |
| `logging` / `runtime` / `testing` / `dependencies` | 3 / 3 / 3 / 2 | | `index.ts`, `serve.ts` | — |

**And its own README states the status outright:**

> *"Public API and core interfaces are still being defined; **the package is currently a scaffold and is
> not yet wired into n8n**."*

**This is a real finding, not a gap in the reading.** It is the same shape as CrewAI's unpopulated
`ToolFilterContext` seam — *a seam nobody populates is indistinguishable from a feature nobody shipped* —
with one decisive difference: **this scaffold carries six Architecture Decision Records**, so the
architecture is **designed and recorded** even though the code is not shipped. A scaffold with ADRs is
a different thing from an empty directory.

**The README also states a dependency rule worth naming** (`README.md:11-12`): *"This package should **not
have runtime dependencies on other n8n components, only interfaces**. If there is some functionality that
should be shared, it should be factored into a common library."* — the same "one seam, many providers"
discipline found in Multica (batch 02) and Gas Town (the 13-preset registry).

### 4.3 The six ADRs — the architecture, stated as decisions

`docs/adr/` holds six records, each dated and owned:

| ADR | Date | The decision (its title) |
|---|---|---|
| `ADR-20260828-obtain-trigger-output-before-creating-the-execution` | 2026-08-28 | get the trigger's output first, then create the execution |
| **`ADR-20260902-steps-declare-waits`** | 2026-09-02 | **a pause is a status of the step row, not a state of a process** |
| **`ADR-20260904-a-derived-token-authorizes-a-resume-request`** | 2026-09-04 | **a token on the URL authorizes the resume** |
| `ADR-20260904-store-the-workflow-revision-that-ran-with-the-execution` | 2026-09-04 | record which workflow version ran |
| `ADR-20260925-delete-binary-files-with-the-execution-that-wrote-them` | 2026-09-25 | binary files die with the execution that made them |
| **`ADR-20261002-share-the-binary-data-store-between-the-planes`** | 2026-10-02 | **one binary store across control and data planes** |

**Two of these are the durable-execution design, and both are worth quoting because the wording is the
finding:**

**ADR-20260902 — "Steps declare waits":**
> *"In engine v2, **an execution is a set of step rows. Events move each row from one status to the
> next.** A step is one call that returns output… Therefore a step executor cannot stay blocked for the
> length of a wait that reaches the engine. **A pause must be a status of the step row. It must not be a
> state of a process.**"*

And the ADR is explicit about what it is fixing in v1:
> *"In engine v1, `putExecutionToWait` itself **sleeps in the process** for a time wait under 65 seconds
> that only its deadline can end. Such a wait never reaches the poller. Every other wait persists."*

**Plainly:** v1 has a mixed durability model — some waits sleep inside the process, some persist — and
v2 makes durability uniform. That is exactly the problem Gas Town solved with its Hook (batch 03 of that
study), and here it is **designed and argued in an ADR before the code exists**.

**ADR-20260904 — "A derived token authorizes a resume request":**
> *"A caller outside n8n ends a wait… That caller uses a URL. **The URL travels through channels that the
> engine does not control.** It stays available for the length of the wait, which can be several months."*

The ADR then defines two URL kinds — **execution-bound** (names the execution; any node can read it) and
**step-bound** (names one step; the waiting node builds it with `getSignedResumeUrl` while its step runs)
— and two tokens with **opposite direction**:
> *"`IDENTITY_TOKEN` goes from the control plane to the data plane. `ACTION_TOKEN` goes from the data
> plane to the control plane. Their issuer and audience values are opposite. **This prevents the replay
> of one token at the endpoints of the other.**"*

**So the v2 architecture is a control-plane / data-plane split with two opposite-direction tokens.** That
is a serious distributed-execution design, and it is the reason the `response-channel`, `queue`,
`admittance` and `database` modules exist.

**The ADRs are also written in the repo's own mandated style** — ASD-STE100 Simplified Technical English
(`AGENTS.md`): short sentences, active voice, one instruction per sentence. A rule in the contributing
guide, visible in the architecture record.

---

## 5. The node model

`packages/workflow/src/interfaces.ts:2591` defines the contract. The core is small:

```ts
export interface INodeType {
	description: INodeTypeDescription;
	supplyData?(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
	execute?(this: IExecuteFunctions, response?: EngineResponse): Promise<NodeOutput>;
	// A function called when a node receives a chat message. Allows it to react…
}
```

**Plainly:** a node is **a description plus optional behaviours** — it may execute, it may *supply data*
(the hook by which a node becomes an AI tool or agent), and it may handle a chat message. A node that
only describes is a trigger; a node that supplies data is a tool.

**`packages/workflow/src/` (72 entries) is the model layer**, and the names show what it carries:
`expression.ts`, `expression-sandboxing.ts`, `expression-evaluator-proxy.ts`, `cron.ts`,
`auth-redaction.ts`, `credential-domain-restrictions.ts`, `credential-only-nodes.ts`,
`dynamic-credentials-helpers.ts`, `execution-context.ts`, `execution-context-establishment-hooks.ts`,
`execution-status.ts`, `augment-object.ts`, `connections-diff.ts`, `data-table.types.ts`.

**Three things are visible immediately and are batch 02/04's subject, named here rather than assumed:**
`expression-sandboxing.ts` (an expression language is sandboxed), `credential-domain-restrictions.ts`
(credentials are restricted by domain), and `execution-context-establishment-hooks.ts` (the execution
context can be extended by hooks).

### 5.1 The catalog

**563 `*.node.ts` files** in `packages/nodes-base` — the built-in integrations. (The product's public
claim is "1,500+ integrations"; the difference is community nodes, which is a distribution fact, not a
code one. Stated as the measured figure, with the claim marked as a claim.)

---

## 6. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F01-01** | **A TypeScript monorepo where `packages/` is 95 % of the tree** — 57 `@n8n` packages plus 9 groups; 22,715 `.ts` against 1,409 `.vue`. | PX-F | One install, one toolchain, one build. | A product cut into packages, each with a real boundary. |
| **F01-02** | **A CLI of 26 operator commands** (27 files) — `audit`, `db revert`, `engine`, `execute`, `execute-batch`, `export|import`, `license`, `publish`, `start`, `webhook`, `worker`… | P3 | Operate and script an installation without the UI. | An operator surface distinct from the product surface. |
| **F01-03** | **Two engines** — a shipped service-based engine in `packages/core`, and a v2 engine whose own README says it *"is currently a scaffold and is not yet wired into n8n"*. | P3 | (indirect) | A v2 designed in the open; the seam is honest about being empty. |
| **F01-04** | **`INodeType` is a description plus optional behaviours** — `execute`, `supplyData` (the tool/AI seam), a chat handler. | P1/PX-W | A node is a small, well-defined thing to write. | The composition primitive, and it already has an AI hook. |
| **F01-05** | **563 built-in nodes** measured (the "1,500+" claim is community nodes — a distribution fact, marked as a claim). | PX-W | Enormous reach out of the box. | The catalog is the product's surface area. |
| **F01-06** | **Six ADRs record a designed architecture before the code ships** — durable execution, a token-authorized resume, a control/data plane split. | P3/PZ | (indirect — not yet shipped) | Architecture as a written record, in the repo, reviewable. |
| **F01-07** | **The durable-execution decision, stated as a rule**: *"A pause must be a status of the step row. It must not be a state of a process"* — and the ADR names what it fixes in v1 (processes that sleep). | P3 | A waiting workflow survives a restart. | Durability by design, not by convention. |
| **F01-08** | **A resume is authorized by a token on the URL**, with two URL kinds (execution-bound vs step-bound) and two opposite-direction tokens that prevent replay. | P3/PZ | An approval link works for months, safely. | A real answer to long-lived, externally-reachable resume. |
| **F01-09** | **A stated dependency rule** — the engine *"should not have runtime dependencies on other n8n components, only interfaces"*. | PZ | (indirect) | The seam discipline, written into the package's README. |
| **F01-10** | **Model and runtime are separated** — `packages/workflow` (model) vs `packages/core` (engine). | PX-F | (indirect) | A workflow can be described without being executed. |
| **F01-11** | **The CLI has no tenancy notion** — it operates one installation (no tenant, project or workspace verb). | P2 | (n/a) | Recorded as the tenancy question batch 03 must answer. |
| **F01-12** | **The ADRs are written in the repo's mandated style** (ASD-STE100, per `AGENTS.md`) — a contributing rule visible in the architecture record. | PZ | (indirect) | Documentation standards that reach the design record. |

---

## 7. Divergences and honest bounds

- **One thing to correct from my own reading, recorded per rule 13:** an early pass reported the v2
  engine's module directories as *empty*. That was **my error, not n8n's** — the source lives under
  `src/` (138 files), and the directories are only empty at the package root. The finding stands as
  "a documented scaffold", not "an empty scaffold".
- **Bound:** this batch read the **platform layer** — the monorepo map, the CLI, both engines, the ADRs,
  the node contract and the catalog size. It did **not** read the v1 execution engine's internals, the
  expression language's semantics, or the editor UI; those are batches 04 and 05, and are named rather
  than half-covered.
- **Bound:** the 563-node figure is a **file count** (`*.node.ts`); a node file can define more than one
  node, and some nodes are built at runtime. The figure is stated as what it measures.
- **Bound (stated plainly):** the ADRs are quoted for **the decisions they record**, which is the finding;
  each is a longer document and a later batch could read more.

---

## 8. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The ADR practice (F01-06)** — architecture decisions written, dated, owned and versioned *in the
   repo*, including for code that is not shipped yet. The clearest example in the study of a team
   recording *why* before *what*.
2. **The durable-execution rule (F01-07 / F01-08)** — a pause is a row status, not a process state; a
   resume is authorized by a token that travels through channels you do not control. Both are answered
   in prose before the code.
3. **`INodeType` as the composition primitive (F01-04)** — a description plus optional behaviours, with
   `supplyData` already serving as the AI-tool seam.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 01 of 07. Read from source on 2026-10-15. Next: `findings/02-the-aissistant.md`.*
