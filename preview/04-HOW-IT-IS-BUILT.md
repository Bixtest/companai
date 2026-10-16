# How it is actually built — my read of the engineering shape

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**Rule I followed:** every claim here is a measurement I can point at a file for, not a summary of a
summary. Where I am unsure, I say so.

---

## 1. The two repositories

There are **two** git repositories, not one. This is the single most common source of confusion for a
newcomer, and it is a deliberate split, not an accident.

| | Repo 1 — the thinking | Repo 2 — the code |
|---|---|---|
| **Path** | `C:\Users\Ramzi\Downloads\companai` | `...\companai\workspace\starting-kit` |
| **Branch** | `master` | `main` |
| **Holds** | the vision, the plans, the journal, the lessons, the registers, the knowledge base | **every line of code the project owns** |
| **Rule** | — | **every batch ends with a commit in *both* repositories** |

**Never `git add -A` here.** A wildcard once swept 10,448 of the owner's unrelated files into a single
commit. Stage by explicit path, always.

### The thing that is not ours

- `aissistant-package/` — the **sibling project's** codebase, a fork of Paperclip. Do not edit, do not
  deploy from it.
- `companai.md` at the root — a **sibling document** that reads like a vision statement for our product.
  It is not one. It is, by the project's own account, the most misleading file in the folder.
- `library/ai/hermes-docs/`, `library/ai/paperclip-master/`, `library/ai/source-docs/` — imported study
  material. Evidence only, never decisions.

### The toolchain

- **Node 24 is mandatory and is project-local.** The system Node is 22 and the platform refuses to run on
  it. Every terminal in every session must begin with:
  ```
  export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
  ```
  Without it you get failures that describe the laptop, not the platform.
- **Yarn 4.17.1** with **Turbo**, one `node_modules` linker.
- **Docker Desktop** for the local stack. Only the owner can start it — the machine's security policy
  blocks an agent from launching it, and that block is not to be worked around.

---

## 2. The shape of the codebase

A **monorepo**: one app and about twenty-one packages, all named `@open-mercato/*`. The product's own
namespace is `companai`, so every document format is `companai.*`.

### The framework packages

| Package | What it is for |
|---|---|
| **`shared`** | Cross-cutting infrastructure — and the home of the entire "canonical model" stack: the kernel, the Business IR, User Functions, Business Widgets, the request-outcome layer, the permission catalogue, the authority resolver, the ledger, the guard registry, the command bus. Zero domain dependencies, by contract. |
| **`core`** | The business-module package. Around forty module folders, each with its own API, admin pages, commands, services, data model and migrations. |
| **`ui`** | The design system and the admin component library: about ninety primitives, plus the tables, forms, shell, dashboard and settings machinery. |
| **`cli`** | The `mercato` command line **and the code generator** that writes every `*.generated.ts` file. The generator is the single largest piece of build-time machinery. |
| **`events`** | An event bus with persistent subscriptions and a single-delivery guard. |
| **`queue`** | A job queue with multiple strategies and a per-job container. |
| **`cache`** | A multi-strategy cache with tag-based invalidation. |
| **`search`** | Search with pluggable strategies (tokens, vector, full-text) and indexer workers. |
| **`scheduler`** | Database-managed scheduled jobs. |

### The feature packages

- **`ai-assistant`** — the whole AI stack: typed agents, tool packs and the tool registry, agent
  bindings, an MCP server, the sandbox for code-mode tools, the mutation-approval path, and token metering.
- **`content`**, **`onboarding`**, **`webhooks`** — informational pages, self-service sign-up, and
  standards-compliant webhooks in and out.
- **`checkout`** — a public pay-link flow (currently parked in the app).
- One package per provider: **`gateway-stripe`**, **`channel-gmail`**, **`channel-imap`**, **`storage-s3`**,
  **`sync-akeneo`**. The rule is that a provider integration never lives inside `core`.

### The app

`apps/mercato` is a Next.js application, and its route tree is astonishingly small:

```
app/
  (backend)/backend/[...slug]/page.tsx   → the catch-all admin page dispatcher
  (frontend)/[...slug]/page.tsx          → the catch-all customer-portal dispatcher
  api/[...slug]/route.ts                 → the catch-all API dispatcher
  api/auth/login/route.ts
  api/docs/openapi/route.ts
```

**Everything else is module-registered.** A module declares its pages and routes, the generator indexes
them, and the catch-alls dispatch to whatever matched.

### Enabled and parked modules

`apps/mercato/src/modules.ts` is the switchboard. Around **thirty-six modules are enabled** and
**fourteen are commented out**.

Parking means a module creates no tables, serves no routes, loads no code and appears in no menu — but its
source stays readable and restorable by removing one comment. **The restore order is written down**,
because some parked modules depend on others: sales needs catalogue, customers and dictionaries; the
portal needs customer-accounts; staff needs the planner and resources.

The `dashboards` module has an override block that switches ten of its tiles off individually, because
they all read the parked business areas and would otherwise render ten broken panels.

### Generated files

`yarn generate` writes about fifty-eight files into `apps/mercato/.mercato/generated/` — the module list,
the entity registry, the dependency-injection registry, the API route manifest, the dashboard widgets, the
injection widgets and tables, the search registry, the event registry, the guard registry, and more.
**They are never hand-edited.** A consequence worth knowing: a source change is invisible until the
packages and the app are rebuilt **and** the server is restarted. That has looked like a bug more than
once.

---

## 3. Where the product ideas actually live

This is the part I most wanted to get right, because it is not where you would expect. The distinctive
ideas are **not** spread through the modules — they are concentrated in `packages/shared/src/lib/`.

### 3.1 `kernel/` — the Business Model Kernel

| File | What it does |
|---|---|
| `model.ts` | Builds the canonical, versioned, id-keyed model **from the platform's own declarations**. It holds no copy — it is a view. Six entity classes (core, capability, projection, reference, external, temporary) and a twenty-one-item contract for every object. |
| `canonical-id.ts` | The ID grammar: `segment.segment.segment`, lowercase segments. An ID is stable (a rename creates a new version), unique by position (the parent is the prefix), and opaque (the grammar constrains form, never meaning). |
| `round-trip.ts` | A versioned, byte-stable export and import. The test is `export(import(export(model))) === export(model)` **byte for byte** — and it first asserts the export is non-empty, so an empty diff on an empty export cannot pass. |
| `metadata-registry.ts` | A read-only *service* over the model that answers what exists, what type it is, where it came from and what depends on it. For the questions it cannot answer it returns a **typed absence** rather than inventing an answer. |
| `rename.ts` | Distinguishes a clean rename (a label) from one that requires recompilation (a key). |
| `from-modules.ts` | The live wiring that reads the registered modules. |

A drift guard drives the kernel's view and the installer's view from the **same** module set and compares
them, so there cannot be two opinions about what a table is.

### 3.2 `business-ir/` — the typed request and its compiler

- `types.ts` — the request shapes. A query request (`list` / `count` / `aggregate`), a command request, a
  parameter placeholder, and the ten compiler stages. **There is deliberately no scope field** — nowhere
  to put a tenant, so a request cannot widen its own reach.
- `schema.ts` — the strict validation shape. Unknown keys are rejected.
- `compile.ts` — the compiler. Refuses an unbound placeholder; fails on an unknown entity or field; checks
  that an operator makes sense for the field's kind; injects scope from the authenticated context, failing
  closed if there is none; and produces a physical plan that is **the same query object the query engine
  already runs**. **It emits no SQL**, and records that as a declared gap.
- `bind.ts`, `bindings.ts`, `model-index.ts`, `recompile.ts` — turning placeholders into values, mapping
  logical entities to physical tables, and re-checking a request against a changed model.

### 3.3 `user-function/` — the saved capability

- `run.ts` — **the zero-AI execution path.** The function that runs a Function has no AI argument, no
  model client, and nowhere to put one. Eight ordered gates; the only step that touches the world is the
  last one. Every refusal is a **value** with a code, not a crash.
- `lifecycle.ts` — eight states, one step forward at a time, and it **refuses to mark a Function verified
  without a passing report**. A forged document claiming to be active is rejected on import.
- `verify.ts` — nine named checks that **call the compiler** rather than re-implementing it. Three
  outcomes: passed, failed, and **not checked** — which is what the permissions check reports today,
  because reporting it as passed would be a lie and reporting it as failed would make everything
  unverifiable.
- `fingerprint.ts` — content fingerprint, plan fingerprint, execution fingerprint, and the freshness
  check that lets a Function survive a change to the model.
- `document.ts` — a byte-stable portable document. **No database row**, on purpose, with the trigger for
  one named in the file's own header.

### 3.4 `business-widget/` — the interaction layer

- `types.ts` — the Business Widget. Six states (not the Function's eight, because a Widget is not the
  thing that gets verified — the Function it places is). Twelve dependency lists, four permission groups,
  and the rule that **a Widget permission never replaces business authorisation**.
- `ir.ts` — the Widget IR: a type, a source (a Function or an entity), a title, inputs and actions. A
  **closed** set of thirteen input controls mapped **totally** by type to the platform's field kinds, so
  adding a fourteenth kind is a compile error until a control is chosen for it. And a guard that walks the
  IR's *keys* looking for forbidden front-end vocabulary — a Widget may say "Class of 2026" in a title,
  but it cannot mention a component or a style.
- `placement.ts` — the pure, one-way transformation of a published Function into a Widget.
- `registry.ts` — an in-memory registry that answers where a thing is used and what depends on it, and
  reports collisions rather than merging them.

### 3.5 `request-outcome/` — the three endings

- `triage.ts` — a **pure** decision of which ending a request gets. Structure first, then writes, then
  reads; an unclassifiable request fails **closed** into the strictest ending. It can classify a change; it
  can never perform one — the proposal type has no field for "applied".
- `gate.ts` — whether the Save option may be offered. It consumes a fresh verification report rather than
  reading a verdict off the artefact, *because a doctored Function would otherwise be able to vouch for
  itself*. It surfaces **not checked** even on success.
- `repeat.ts` — the "you have asked something like this before" signal. Pure, zero imports, Unicode-aware.
  **A signal, not a decision** — the name was changed after a critic flagged that it collided with the
  gate's real decision type.
- `tier-source.ts` — the tier settings, which are live in production (this corrects a claim in one of the
  project's own documents that only a seed line imported this library).

### 3.6 `permissions/` — the structural gate

- `catalogue.ts` — the governable things a structure change creates, with two ID vocabularies on purpose
  (feature IDs dotted, entity IDs colon-prefixed) and five structural verbs, of which three are enforced.
- `structure-change-gate.ts` — a pure, fail-closed decision. Its refusals are a closed set, on the
  principle that *"we did not recognise this" is never evidence that it is safe*. A new surface is granted
  to the superadmin role, never to nobody — because invisible-to-everyone is a silent failure.
- `structural-settings.ts` — the per-(object kind × verb × actor) level matrix, stored as a setting rather
  than hard-coded. The default level is **approval** — never the most permissive option.
- `structure-change-decision-header.ts` — carries a person's decision across the HTTP boundary.

### 3.7 `authority/` — the one decision point

- `capabilities.ts` — the pure model: seven effect classes, three reversibilities, five data classes, six
  autonomy gates, five task grades, and the rule that **every combination takes the minimum**.
- `decision.ts` — the resolver. It considers ten rules in order and returns a level plus **every reason it
  considered**, marking the one that bound. It never returns a boolean. For a machine with no trust record
  it applies a vector by effect class — reads allowed, everything else approval-first.
- `graph.ts` — the organisational graph, seven relationship kinds, four inheritance modes, and ceilings
  inherited down the structure.
- `shadow.ts`, `shadow-report.ts` — shadow mode, deliberately kept as a **log rather than a table**,
  because giving it a schema would outlive the decision it informs.

### 3.8 `crud/mutation-guard-registry.ts` — the write gate

Guards are objects with a target entity, allowed operations, a priority and a feature list. A guard may
allow, refuse, or **escalate** — and an escalating guard is treated as *not performed*: no mutation, no
after-success hook, and a response that says plainly the act has not happened yet rather than a success
code that implies it has.

### 3.9 `commands/` — the typed action path

About a hundred and twenty command files across about eighteen modules. Every command declares what it
is: its input shape, its capability, what it does, how to undo and redo it, its **risk**, whether it needs
**approval**, and its **idempotency** key. Approval **declares**; the authority layer **enforces** — a bus
refusal would be a second permission engine, which is forbidden.

### 3.10 `ledger/` — the tamper-evident chain

Canonicalisation and a hash chain: each event carries a digest of its predecessor, and there is a command
that verifies a whole tenant's chain.

---

## 4. The path a request takes

```
  a browser or a program
            │
            ▼
  apps/mercato/src/app/api/[...slug]/route.ts      the ONE API dispatcher
            │   1. match against the generated route manifest
            │   2. resolve who is calling (session, API key, AI identity)
            │   3. every tenant/org parameter is validated against the session — never trusted
            │   4. the permission gate (which features are required)
            │   5. the rate limit
            ▼
  the module's route handler
            │
            ├── a read  → the CRUD factory, which adds its own tenant/org scope
            │
            └── a write → the guard registry (allow / refuse / escalate)
                          → the command bus
                              → the authority gate (may this act proceed, and at what level?)
                                  → the action log
                                  → the ledger
```

The **AI tool door** is a third entry point, and it asks the **same** authority resolver as the human path,
passing the responsible user through. That was a named build item and it is done.

---

## 5. The AI layer

**Full detail in [`07-THE-AI-ENGINE-HERMES-AND-LLAMA.md`](07-THE-AI-ENGINE-HERMES-AND-LLAMA.md).** This
section is the short version — three services, two arrows, and the door between them.

### 5.1 The three services that make up the AI

| Service | What runs there | Language |
|---|---|---|
| **`app`** / **`mcp`** | the platform, and the MCP tool server (21 tools) | Node 24 |
| **`model`** | llama.cpp's OpenAI-compatible server, serving `Qwen2.5-7B-Instruct-Q4_K_M` | C++ |
| **`hermes`** | the Hermes agent runtime, `command: ["gateway","run"]` | Python 3.14 |
| **`opencode`** | the incumbent agent runtime, still load-bearing | Go |

Two arrows connect the platform to the AI: **(1)** the agent reaches the platform's tools over MCP,
authorised by the platform's own gate; **(2)** the agent asks for inference, and the platform's model
control plane decides which provider serves it. Both were proven working on 2026-10-04.

### 5.2 The platform's own agent machinery

Lives in `packages/ai-assistant/src/modules/ai_assistant/` (~140 files):

| Piece | What it is |
|---|---|
| **Agents** | Declared in a module-root `ai-agents.ts` and auto-discovered. One module declares one agent whose **only** output is a typed Business IR — it does not answer in prose and it calls no tool. |
| **Tools** | Declared in `ai-tools.ts`, aggregated into packs: search, attachments, meta, and the Business IR query tool. |
| **Bindings** | An AI user may run only the agents it is **bound** to. The check is fail-closed for an AI identity and a pass-through for a person. A binding can only **intersect** tools and **union** features — never widen. |
| **MCP** | A server exposing the same tools, over both a local transport and HTTP. |
| **Sandbox** | Code-mode tools run in a process-isolated sandbox with a whitelist, a timeout, a cap on calls, and per-endpoint permission checks. |
| **The chain** | `prompt → authorBusinessQueryIr → typed IR → compileQuery → runFunction → rows`, with default guardrails (a row cap of 100 and a one-year maximum window) that only fill a gap and never override a stated limit. |

**The order matters in the AI path:** the binding is resolved **before** the model is asked. An unbound AI
worker is refused with no model call at all. That is deliberate — it means an AI that has lost its
authorisation cannot even start.

### 5.3 The model control plane — already built, and bigger than expected

- `packages/shared/src/lib/ai/llm-provider.ts` — the port (chat only; **no `embed` method**).
- `llm-provider-registry.ts` — the registry.
- `llm-adapters/{openai,anthropic,google}.ts` — **protocols, not vendors**.
- `openai-compatible-presets.ts` — **11 presets**, each with its own env keys.
- `model-factory.ts` — the **7-tier** resolution chain.
- `model-allowlist.ts` — an env allowlist intersected with a per-tenant database row.
- Six database entities governing the model layer: the tenant model allowlist, per-agent runtime / prompt
  / mutation-policy overrides, and token usage per event and per day.

**The headline finding:** the vision asks for a model registry, a model broker, per-tenant policy and
cost visibility. **Three of those four already have a working implementation.** The work is smaller than
anyone expected — and llama.cpp needs **one preset entry**, not an adapter.

### 5.4 The embedding lane — the one place the platform is not provider-neutral

A **closed union of six** providers (OpenAI, Google, Mistral, Cohere, Bedrock, Ollama) with no
OpenAI-compatible member. The `openai` client **ignores** the configured base URL — only Ollama reads
it. That is the root of the recorded blocker, and it is why pointing embeddings at a local server needs
a new union member rather than just a URL.

### 5.5 The door that does not exist yet

**This is the gap I would put in front of a newcomer first.** The platform's chat route imports the
OpenCode client directly and reads its URL from the environment. There is **no typed port** — the design
for it (eight operations, an envelope with a capability grant id, secret *references*) has just been
written, and nothing uses it. **Rewire first, delete second.**

---

## 6. The data

- **Migrations:** 250 files, one folder per module, MikroORM v7, named with a timestamp and an optional
  module suffix. Applied by `yarn db:migrate`.
- **Tenant and organisation** are on nearly every table, alongside a soft-delete timestamp.
- **`custom_entities_storage`** is the document store for user-defined records: one JSON column per row,
  with a carefully split uniqueness story — a plain unique index that the upsert can target, plus partial
  indexes that restore one-row-per-scope for the null-scope shapes, because a database will not infer a
  partial index for a bare conflict target and treats nulls as distinct. This was measured on a live
  Postgres 17, and two written premises were corrected as a result.
- **`module_configs`** is the settings table, with two partial unique indexes (one for global settings, one
  scoped to a tenant) so a tenant's setting never clobbers the global one. **The authority system's own
  knobs live here** — the enforcement mode, the pending-act lifetime, and the structural permission levels.
- **The AI chat tables** already persist conversations, participants and messages, with a JSON column for
  the rich cards a message rendered.

## 7. The tests

- **Roughly 2,950 test files** — about 1,975 unit tests and 978 integration specs.
- **Jest 30** with `ts-jest`, run through Turbo with a memory cap and a worker cap.
- The canonical-model stack has its own suites, and the distinctive ones assert **structure**, not just
  behaviour: there is an import-graph test proving a published Function cannot reach a model, and a
  type-level test proving the control mapping is total.
- Architecture guards exist to stop drift: module decoupling, command capability coverage, table coverage,
  and a guard-coverage test that fails if a new un-gated write route is added.

## 8. Running it locally

```
cd workspace/starting-kit
corepack yarn generate && corepack yarn build:packages \
  && corepack yarn typecheck && corepack yarn lint && corepack yarn test
```

Three things that will waste your time if nobody tells you:

1. **Turbo caches everything, including the things you use to check your work.** A green result from cache
   is not a green result. Read the `Cached:` line; use `--force` for anything you are about to claim.
2. **Never pipe these through `head` or `tail`** — you throw away the exit code. That has reported a
   failure as a success.
3. **The app serves built packages, and `next start` serves a frozen build.** A source change is invisible
   until you rebuild **and** restart.

## 9. The two machines

- **The laptop** (`BIXMASERVER`, Windows 10) holds the code, the docs and Docker Desktop. It is where the
  work happens.
- **The hosting VM** (`Platform-Server`, Ubuntu 24.04) runs Coolify and Traefik, and is reachable at
  `172.28.50.2` **only from the laptop**. It is invisible to the network on purpose.

The public route out is a **Cloudflare Tunnel** — outbound only, no inbound port, no router change. Behind
the tunnel, a domain must be declared as plain `http://`, not `https://`: typing the secure scheme binds
the router to the wrong port and produces a redirect loop. That is measured, recorded, and easy to get
wrong.

## 10. What I would tell a new engineer on day one

1. Set the Node path before anything else.
2. Read the two repositories as two different things that happen to be one project.
3. The product's ideas are in `packages/shared/src/lib/`, not in the modules. Start there.
4. `modules.ts` is the switchboard for what is alive.
5. Turn dashboard widgets off individually rather than deleting a module, and never delete a module at all
   without a written analysis first.
6. Reach every important answer two genuinely different ways, and expect a hostile critic to try to break
   it.
7. When a document and the code disagree, **the disagreement is the defect** — fix it, do not pick a side.
