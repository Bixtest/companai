# The AI engine — Hermes, and the model server it runs on

**Written:** 11 October 2026 · **Author:** an agent brought in to learn the project cold
**Status of the subject:** mostly **DESIGN, PART-BUILT** — Hermes is running today as a workbench, but
it is not yet the platform's engine. This document says exactly which is which.

> **Why this document exists.** I under-weighted this in my first pass, and the owner was right to
> call it out. Hermes is meant to be *the* AI engine of the platform, and the plumbing around it — the
> model server, the typed door, the model control plane — is a large share of what the project has
> actually designed and measured. It deserves its own document.

---

## 1. The shape: three pieces, two arrows

```
   ┌──────────────────────────────┐        (1) MCP, authorised by our gate        ┌──────────────────────────────┐
   │   THE PLATFORM (ours)        │◀───────────────────────────────────────────▶ │   HERMES (borrowed)           │
   │   the Starting Kit           │                                              │   the agent runtime          │
   │   — identity, truth,         │        (2) inference request                │   — the reasoning loop       │
   │     authority, records       │─────────────────────────────────────────────▶ │   — tool orchestration       │
   │   — every surface a user sees│                                              │   — context assembly         │
   │   — the model control plane  │                                              └──────────────────────────────┘
   └──────────────┬───────────────┘                                                         │
                  │ routes every call to a model                                            │ asks for inference
                  ▼                                                                         ▼
   ┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
   │   THE MODEL SERVER — llama.cpp, `model:8080`, ONE ENTRY in the platform's provider list              │
   │   Local inference, no cloud dependency. Cloud is an interim option, not the architecture.            │
   └──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**The three sentences that fix every joint:**

1. **The platform owns meaning and authority.** Who a user is, what they may do, what is true, who
   approved it, what it cost — all ours. A model cannot authorize itself.
2. **Hermes owns runtime mechanics only.** The reasoning loop, tool orchestration, context assembly,
   provider breadth, sessions. It sits **behind one typed door** and it is **headless** — the platform
   owns every screen a person ever sees.
3. **Llama is one entry in the platform's model control plane.** The platform decides *which provider
   and model a tenant may use*; Llama is the local option, reached exactly the way any other provider
   is reached.

The project's own phrase for the relationship, which I think is exactly right: **Hermes is an engine we
own the crankshaft of.**

---

## 2. What Hermes actually is

Hermes is a **Python** agent runtime — borrowed, not ours, and living in
`library/ai/hermes-agent-main/` (and an ignored twin at the repository root). It is large:

| Measure | Count |
|---|---|
| Python lines, excluding test trees | **~897,700** |
| Non-test Python files | **2,387** |
| Test files | **5,659** |
| The agent runtime (`agent/`) | 317 Python files, recursive |
| Tools (`tools/`) | 275 entries, of which 38 are tool files |
| **Always-on core tools** | **59** |
| Tool groups (`TOOLSETS`) | **61** — 37 general + 24 platform-scoped (`hermes-<platform>`) |
| Plugins | 18 directories |
| Optional MCP definitions | 65 |
| Skills | ~82 built-in, ~115 optional |
| Platform adapters | **34** (Telegram, Discord, …) |
| Locales | 17 |
| Example configuration file | 2,323 lines, 28 top-level keys |

**It is not the truth, and it is not the interface.** It holds a runtime/session state database and a
configuration file, and it ships its own dashboard and desktop client — **which this product will not
use**.

### 2.1 The capabilities the platform wants from it

- the reasoning loop, tool orchestration and streaming;
- context assembly and compression;
- **skills** — learned procedures;
- **memory** — built-in (`MEMORY.md`, `USER.md`) plus a provider interface with five external providers
  shipped, of which only **one** may be registered at a time (tool-schema bloat, conflicting backends);
- **subagents** — bounded child runs with delegations persisted and recoverable;
- **cron** — 33 Python files of scheduling (which this product deliberately does **not** let it use for
  business jobs);
- a plugin surface (`ctx.register_tool`, `ctx.register_middleware`) and MCP.

### 2.2 The two facts that decide the whole integration

1. **Hermes is Python 3.14, exactly.** Not "3.14+": `requires-python = ">=3.11,<3.15"`, and the `<3.11`
   floor is an updater escape hatch, not a supported runtime. The core dependencies carry a
   `python_version >= '3.14'` marker, and the shipped image pins CPython **3.14.7**. Four independent
   readings agree on this, and the first two alone would have supported a wrong answer.
2. **Node 24 cannot execute Python.** So Hermes can never be a library inside the app. The only options
   are a TypeScript rewrite of the agent loop, a native Python-in-Node bridge, or **a supervised
   process behind a typed door**. The third is what the design chose.

---

## 3. The decision that governs everything: B-05

**The owner decided it on 2026-10-05, after challenging the recommendation three times.** The approved
shape:

> **One product, one repository, one deployment, one interface (ours) — with Hermes as a supervised
> private runtime process behind the internal port. Hermes is headless.**

Not a separately administered Hermes product, and not a literal single process.

### 3.1 The three challenges, and how they were answered

**"Didn't Hermes' own documentation tell us which way to go?"** It did, and four independent readings
agree — which is why this stopped being a matter of taste:

- **Hermes' own integration guide** lists the protocols for driving it from another program. For a
  custom web host wanting every feature it names the **TUI gateway JSON-RPC**. The only *in-process*
  option it offers requires the host to be Python. Ours is Node.
- **Hermes' own front end is a separate application.** Its web UI is TypeScript; `hermes serve` exposes
  `/api/ws` and `/api/pty` for a desktop client; its compose file runs `gateway` and `dashboard` as two
  services. **Hermes never puts its own UI inside its Python process.**
- **Hermes' own source** has a first-class concept of *"the process holding the live session"* and a
  protocol to hand a turn to it — and its own comment names the failure a second writer would cause
  (two transcripts interleaving in state). So the capability exists, and it is a **boundary protocol**,
  not a shared address space.
- **Our own documents** had already decided it: the architecture document says add the Hermes *service*;
  the blocker register records a **published port**, not host networking.

**"Won't the crash threat still exist — and isn't two platforms worse, since it can go down in two
places?"** The honest answer splits in two:

| Shape | Failure events | Blast radius |
|---|---|---|
| One process | fewer | **total** — a fatal fault in the agent takes the business platform down with it |
| Two processes | more | **partial** — the assistant is down, the product is up |

For a product holding a customer's business records, a total outage is worse than a degraded feature.
**The blast-radius half is measured** (in the compose file the app depends on postgres, redis and
meilisearch — and **not** on OpenCode or Hermes, so the site boots and serves with the agent down).
**The frequency half is reasoning, not measurement, and is labelled as such.** One real gap belongs on
the list rather than in the argument: the Hermes service has a restart policy but **no healthcheck**, so
a wedged runtime is currently invisible to the platform.

**"Isn't one place more organic, given we're tailoring Hermes?"** Right about the *front end* — and the
design takes that: Hermes is headless and the Starting Kit owns the interface. Not right that tailoring
implies co-location. Most tailoring is not even source-level: `config.yaml`, `plugins/`,
`optional-skills/` and the toolset configuration are the supported surface. And an edited fork runs in
a container exactly as an unedited one does — a *source* choice and a *process* choice are independent.

### 3.2 What the decision deliberately does not cover

- **When OpenCode goes.** It is still load-bearing — the platform's chat route is wired to it. Tracked
  separately as **N-8**.
- **The Hermes profile topology.** Deferred with the trigger *the agent gateway exists*, because a
  topology cannot be tested before there is an agent to place in one.
- **Any performance claim.** None was measured, and none should be assumed.

---

## 4. The typed door — the only way in or out

One port, owned by the platform, and it is the only thing the runtime is allowed to know about us.
Deliberately small:

```
describeCapabilities(runtimeVersion)   -> runtime version, tool delivery, limits, health
startRun(admittedEnvelope)             -> accepts a run the platform already authorized
streamRun(runId)                       -> ordered, typed events (text, tool, status, usage)
cancelRun(runId)                       -> bounded, idempotent
steerRun(runId, instruction)           -> only if the approval semantics exist
resumeConversation(binding, input)     -> explicit session continuity, never implicit
resolveToolCall(call, capabilityGrant) -> the ONLY path to a business operation
completeRun(runId, result)             -> structured outcome, usage, provenance; idempotent
```

**The envelope** is generated by the server, immutable, and versioned. It carries the schema version,
run id, **tenant id**, principal and agent ids and kinds, the task, the platform conversation, the
runtime session, **the capability grant id**, policy and model versions, a deadline, a budget and a
correlation id.

Three rules make it safe, and each one is a real failure mode from somewhere:

1. **Identity is minted server-side and read-only to the runtime.** Hermes cannot name its own tenant.
2. **Secrets are referenced, never inlined.** Nothing secret is ever model-visible, and nothing secret is
   ever written into a prompt, a log or an instruction field. (The sibling project learned this the hard
   way, by putting a run token in instructions as an emergency measure.)
3. **The identifiers stay distinct.** A run is not a transcript is not a memory scope is not a room is
   not a task. Conflating them is how a "session" quietly becomes an authority.

**Failure is treated as normal, not exceptional.** Cancelling is bounded and safe to repeat. A
completion is safe to deliver twice. A crash can retry an eligible run without rewriting assignment or
business state.

### 4.1 The incumbent: this is a displacement, not an arrival

This is the single most important scheduling fact, and it is the thing a newcomer would miss.

**Hermes does not arrive on empty ground.** The platform's chat route is wired today to **OpenCode** —
a Go-based AI backend running as its own container and reached over HTTP. The project's own blocker
register says it plainly: *OpenCode cannot be removed yet; the platform's own chat is built on it.*

And the precedent settles the process question: **this product already runs a non-Node agent runtime,
in a different language, as a separate service.** So a Python runtime behind a typed port is a
*better-governed instance of the existing shape*, not a new kind of thing.

The consequences:

- **The port is the migration seam.** Build the door first, move the chat onto it, *then* put Hermes
   behind it. **Rewire first, delete second.**
- **No big bang.** The platform is already dual-runtime (a typed-agent path plus an OpenCode path).
   Adding Hermes carelessly would make it three. The port keeps it at two, then one.
- **Deleting OpenCode is a separate, later, testable step.**

### 4.2 Where the port stands right now

The **shape** was written on 2026-10-11 as definitions only, with zero imports, so no caller drags an
engine in behind the types. It declares the eight operations, the envelope (including the required
capability grant id), secret **references**, and cancel/complete results that are values rather than
exceptions. Nine tests, type-exactness guarded, mutation-proved.

**What is not done:** fitting OpenCode behind the door, moving the chat route onto it, the
cancel/complete semantics, and the check that nothing bypasses it. **The door exists; nobody walks
through it yet.**

---

## 5. The multi-tenancy problem, which is where this is won or lost

Everything above is architecture. This is the part that leaks a customer's data if it is wrong.

### 5.1 The rule

**A tenant is never inferred, and never declared by the caller. It is derived from an authenticated
principal and bound to the run.** Every database query, cache key, file root, secret and log line is
scoped from a value **the platform mints server-side**.

### 5.2 The trap: a profile is not a tenant

A Hermes **profile** is a runtime home — a config identity and a state directory. A **tenant** is a
security boundary. Equating them is the single most likely way to leak data, because it leaves services,
files, caches, subprocesses, logs and MCP credentials **outside** the boundary it claims to draw.

So the profile shape follows the **five agent kinds**, not the tenant count:

| Agent kind | Belongs to | Visible to | Acts as |
|---|---|---|---|
| **Personal assistant** | one user | that user only | that person's assistant |
| **Role assistant** | a role | everyone holding that role | that function's assistant |
| **Context agent** | the company | shared | **a named user**, for that user's work |
| **Independent agent** | the company | a worker in its own right | itself — its own role, permissions and queue |
| **System agent** | an admin | whoever the admin scopes it to | a system function (cron, backup, cleanup) |

**Two of the five are not assistants at all** — *independent* and *system* agents have no person they
serve. That is why the owner's answer was not one of the two options he was offered: the question had
assumed every agent is somebody's assistant.

### 5.3 The rule that carries responsibility

For each action, an agent either acts automatically or needs the relevant user's approval — **and that
choice is what identifies who is responsible.** The owner's own example is the whole rule in one case:
*an assistant may filter spam in my inbox; it may not clean it. I approve, or I do the cleaning.*

**The accountable party is always a person. An agent is never the party who is answerable.**

And the reason this is cheap rather than a new subsystem: **the agent half needs no new authorization
model.** An AI worker already authenticates as an `ai_worker` principal derived server-side, and the
approval rule already exists as the A0–A5 ladder. `A1` — *propose; a human performs* — is the spam
example exactly. Autonomy is assigned **per action class, not per agent**, so one agent can be `A5` for
reading and `A1` for deleting.

### 5.4 The four kinds of data, which must never be confused

| Kind | Example | Authority | Lifetime |
|---|---|---|---|
| **Business truth** | a customer, an invoice, a published Function | the platform | as long as the business needs it |
| **Tenant knowledge** | a policy document, a product manual | the platform, tenant owns it | tenant-controlled |
| **Runtime state** | the loop's message buffer, a compression artifact | the runtime — **disposable** | rebuildable; deletable without loss |
| **Derived advisory** | an agent's note-to-self, a suggested summary | nobody — **advisory only** | expiring, never citable as fact |

**A memory, a summary or a skill never becomes business truth merely by existing.** Retrieval resolves
canonical data under authorization; it does not promote a cached guess into a record.

### 5.5 Isolation must be proven, not asserted

For every pair of the four data kinds and every profile shape there must be an **adversarial negative
test**: two tenants, each asserting it cannot reach the other's chat, memory, skill, tool output, cache
entry or log line. **A tenant string inside a folder name is not isolation** and must never be accepted
as evidence of it.

---

## 6. The model server — what is actually running today

This part is **built and running**, which makes it different from everything above.

### 6.1 The engine and the model

| Fact | Value |
|---|---|
| Engine | `ghcr.io/ggml-org/llama.cpp:server` (official CPU image) |
| Model | `Qwen2.5-7B-Instruct-Q4_K_M.gguf` |
| Endpoint | `http://model:8080/v1`, OpenAI-compatible |
| Reach | loopback by default; in-network callers use the container name |
| Storage | `./models:/models` read-only, named by `MODEL_FILE` |
| Context | `-c 65536` **plus** YaRN RoPE scaling |
| Threads | `-t 4 -tb 8` — measured, not defaulted |
| Output | `-n 512` |

**Why the YaRN flags are not optional:** Qwen2.5's GGUF declares `n_ctx_train = 32768`, and llama.cpp
**caps** the slot at that value. `-c 65536` on its own silently yields 32K. **Read the server's own
startup log for `n_ctx_slot = 65536`; do not trust the flag.**

**Why 64K is a floor and not a preference:** Hermes refuses a local endpoint below it
(`MINIMUM_CONTEXT_LENGTH = 64000`, *"needs at least 64K tokens for reliable tool use"*). It is also
what costs ~3.7 GB of KV cache.

**The thread split was a measured win.** Prompt ingest is compute-bound and wants all eight logical
CPUs; generation is memory-bandwidth-bound, where extra threads cost more than they save:

| `-t` / `-tb` | prompt ingest | generation |
|---|---|---|
| 4 / 4 (llama.cpp default) | 13.2 tok/s | 3.9 tok/s |
| 8 / 8 | 17.7 tok/s | 3.0 tok/s |
| **4 / 8 (what we ship)** | **19.3 tok/s** | **4.6 tok/s** |

The default wastes half the machine. That was the free 46%.

### 6.2 How the platform reaches it — and why that is slightly wrong today

The platform already owns a **model control plane**, and this is the finding that changes the size of
the job:

- a **provider registry** and adapters that are *protocols, not vendors*;
- **11 OpenAI-compatible presets** (OpenAI, DeepInfra, Groq, Together, Fireworks, Azure, LiteLLM,
  Ollama, OpenRouter, Requesty, LM Studio);
- a **7-tier resolution chain**: request override → caller override → tenant override → module env →
  agent default → global env → provider default;
- an env allowlist that is the ultimate constraint, intersected with a **per-tenant allowlist row**;
- per-agent prompt, runtime and mutation-policy overrides;
- **token metering** per event and per day.

So: **"llama.cpp is one preset entry, not a project."** The preset file's own header states the design
goal — *adding a new backend takes one entry in this array, zero new adapter files, and zero changes to
route handlers* — and llama.cpp satisfies every word of it. There is no llama.cpp entry yet.

**But today the local server is reached by relabelling it as OpenAI:** `OM_AI_PROVIDER=openai` plus
`OPENAI_BASE_URL=http://model:8080/v1`. That works mechanically and it is wrong in three visible ways:

1. the model dropdown shows OpenAI's catalogue (GPT-5, GPT-4o) while the server serves Qwen2.5-7B;
2. the provider an operator sees is **"OpenAI"** for a machine in their own rack;
3. it is exactly the config drift the prior analysis warns about — one endpoint, two authorities.

**And it is now a requirement, not a preference.** The owner's instruction: the open-source lane must
not reserve any API setting that belongs to a vendor. A local server answering to `OPENAI_API_KEY` and
`OPENAI_BASE_URL` is precisely that — the open-source lane squatting on a vendor's name. The fix is a
`llamacpp` preset with its own `LLAMACPP_API_KEY` / `LLAMACPP_BASE_URL`, and the rule is general: **every
provider gets its own preset with its own env keys**, so no vendor's name is ever a routing hint for
somebody else's model.

### 6.3 How Hermes reaches it

Hermes is configured **through its own CLI, never by hand-editing its config file** — Hermes owns that
file, carries a version marker on it, and **rewrites it on startup**. A hand-written model block is
silently discarded: the file still reads the way you left it until the process starts, then your edits
are gone and the log contains no error.

```bash
H=/opt/hermes/bin/hermes
$H config set providers.mercato-local.base_url http://model:8080/v1 --force
$H config set providers.mercato-local.api_key local --force
$H config set model.provider mercato-local
$H config set model.default Qwen2.5-7B-Instruct-Q4_K_M
$H config set model.context_length 65536
$H config get model          # read it back — do not assume it took
```

Two traps here, both measured:

- **`model.provider: llamacpp` looks right and is wrong.** It routes to Hermes' **managed** local
  runtime, which expects a server *Hermes* supervises, and fails with *"The local model server is turned
  off."* Use an explicit named provider entry.
- **`model.context_length` is a claim about the server.** Set it only to a value the server actually
  serves, confirmed from llama.cpp's startup log, not from the flag you passed.

**The honest gap:** today that configuration is set by hand, per deployment. The platform registry and
Hermes' config are therefore **two authorities that can drift** until a generator produces Hermes'
provider config from the platform's records.

### 6.4 Hermes' own managed runtime — real, and deliberately not the production path

Hermes can install, supervise and route a llama.cpp runtime itself. Measured: **19 Python modules plus
a JSON catalog, 4,307 lines**, with `enabled: False` by default, `models_max: 4` and `port: 0`.

So the precise statement: that capability is a **desktop/canary feature**, its provider resolves only
when Hermes itself has staged models, and in a headless container deployment with an externally managed
server it is not the path. **The recommendation is to keep it that way** — Hermes' managed runtime is
the right answer for a single-user desktop install, and adopting it as a multi-tenant control plane
would put model lifecycle in the hands of the component whose job is to reason, not to govern.

---

## 7. Arrow (1) — the tool door, and the two defects in it

This is how the AI reaches business data. It is the joint where "the model cannot widen its own
authority" is enforced or lost.

### 7.1 How it is wired today

Hermes connects to the platform's **MCP server** as an HTTP service, and the platform's MCP endpoint is
the door. Sprint 0 proved the wire: **21 platform tools discovered**, a direct authenticated tool call
returning real data with HTTP 200.

The platform's own in-process tool bridge already authenticates **before** it executes — by API key or a
pre-authenticated context — and the tool registry and executor re-check on every call.

**One detail that costs an afternoon:** the MCP endpoint accepts exactly two credential forms —
`x-api-key: <secret>` or `Authorization: ApiKey <secret>`. **Not `Bearer`.** Hermes' `mcp add --auth
header` flow asks for an "API key / Bearer token" and stores the `Bearer` form, so every call fails with
`401 {"error":"API key required (x-api-key header)"}` until the header is corrected. And the key is
**generated by the platform** — read it out of the container, never set it in `.env`, or the service
authenticates with a different string than the one it provisioned.

### 7.2 The two defects that are live right now

**Defect 1 — the model server has no `--jinja` flag.** Hermes' own documentation carries the caution:
without it, `llama-server` **ignores the `tools` parameter entirely**, and the model's tool call
degrades to raw JSON in the message text. Our own prior study reads it the other way and says newer
builds enable it by default, so **the conflict is named rather than resolved by argument**. The
settling test is one command:

```bash
curl -s http://model:8080/props | jq '.chat_template'
```

A template → the behaviour is active and this is **NOT AN ISSUE**. `null` → the parameter is being
ignored and the one-line change is required. **And the recorded symptom is consistent with the
diagnosis:** in the real agent turn the model enumerated all 21 tools by name, chose one, and **nothing
reached the platform** — no MCP log line at all. Two of the three checks the runbook cites are
structurally NULL regardless (a read-only tool writes no action log, and the platform never records
API-key usage), so the MCP log line is the only discriminating one — and it is empty. The flag is free
and explicit, so the recommendation is to set it regardless and close the claim with the reading.

**Defect 2 — the MCP service was never given `OPENAI_BASE_URL`.** This is blocker **B-16**, and its
error text is the giveaway: `Invalid OpenAI API key` is **OpenAI's own error code**. llama.cpp does not
emit that code. So the request reached OpenAI — which means it never reached the local server. The
embedding lane defaults to the `openai` provider, sees a key, builds a client **with no explicit base
URL**, and the SDK falls back to `api.openai.com`. Measured two routes: the compose file gives the base
URL to `opencode` and to `app` and **not** to `mcp`, and the SDK's own dist names the env var as the
default source for the base URL.

**Defect 2b — there is no embedding model at all.** Even with the URL fixed, the `model` service carries
no `--embeddings` flag and the loaded model is a **chat** model. The honest fix is a **second**
`llama-server` with an embedding GGUF on its own port — and that needs a new member in the embedding
provider union, because the embedding lane is a **closed union of six providers** with no
OpenAI-compatible member, and its `openai` client **ignores** the configured base URL (only Ollama reads
it).

**Why this matters beyond a log line:** the same lane serves the vector drivers (pgvector, qdrant,
chromadb) that the product's retrieval is built on. **A silent embedding failure is a degraded product,
not a degraded log line** — and today it fails as a warning, not a gate.

**Also worth knowing:** the embedding dimension is not a free choice. Changing it sets
`requiresReindex`, and the vector layer has a recreate-with-dimension path precisely because switching
embedding models is **a data migration, not a setting**. Pick once, before there is an index worth
keeping.

### 7.3 The call order across the door

```
1. The platform admits a run and mints the envelope (tenant, principal, agent, capability grant)
2. Hermes reasons and chooses a tool
3. THE TOOL CALL crosses back over the door          ← the only path to a business operation
4. the agent policy gate: is this agent allowed this tool at all?
5. the authority decision: is THIS principal allowed THIS operation on THIS object RIGHT NOW?
6. the tool executes, inside the platform, as the derived principal, on behalf of the user
7. the platform records: journal, ledger, audit, budget
```

**The traps, each a real way this has been or can be broken:**

- **Authorizing at admission only.** An envelope authorized at step 1 says nothing about step 5.
  **Re-authorize at execution** — a permission revoked mid-run must not still work. The code already
  does this; do not "optimize" it away.
- **The model deciding authorization.** A guard must be a **pure predicate** the platform runs, never a
  model output the platform trusts.
- **A direct database handle in the runtime.** There is none by design. Keep it that way.
- **Fail-open on a missing decision.** If the decider cannot reach a verdict, the answer is **deny**.
- **A bypassable gateway is not a policy.** If an unmanaged client can call a tool without passing the
  door, the policy is decorative.

---

## 8. The performance reality — measured, and it is the honest headline

This is the part nobody should be allowed to forget, because "local-first" sounds like it should be
fast and on this machine it is not.

| Measurement | Value |
|---|---|
| The machine | Dell Precision 7510, i7-6820HQ (4 cores / 8 threads), 32 GB RAM, **CPU-only** |
| Hermes' prompt | **~15,700 tokens** (system prompt + 21 MCP tool schemas) |
| Prompt ingest | **~13 tok/s** at default threads, declining as context grows |
| Generation | **~0.8 to 4.6 tok/s** depending on the thread split |
| A real agent turn | **~20 minutes just to ingest the prompt**; ~41 minutes per turn measured; hour-scale in the worst case |
| Memory | the model container reaches **~10 GiB of the Docker VM's 15.56 GiB** |

**Nothing here transfers to other hardware.** No GPU offload is possible on this machine (the Quadro
M2000M has 4 GiB; the model is ~4.4 GB and the 64K KV cache ~3.7 GB, so partial at best on a 2015
chip). And **no comparative benchmark against a hosted provider exists** — the project cannot say local
is slower or faster per euro, because the same workload has never been measured both ways.

### 8.1 Where the real wins are, in order

1. **Stop paying the prompt tax.** ~15,700 tokens of tool schemas re-ingested every turn. Expose fewer
   tools per task. **This is the single largest lever and it needs no new hardware.**
2. **Use deterministic Functions.** The vision's whole point: repeated verified work needs no model at
   all. Every such Function is a turn that costs zero tokens.
3. **Right-size the context.** Not every request needs 64K.
4. **Right-size the model.** The project already names Qwen2.5-3B (~2.3×) and 1.5B (~4.6×) for
   iteration, keeping 7B for final checks.
5. **Only then** consider router mode, sleep-on-idle or multiple profiles — after measuring the
   model-switch latency and memory churn.

**The order matters.** Fixing the thread split was free. Buying a GPU is not, and on this machine it
would not work.

---

## 9. The model default — decided

The long-term question was cloud, local, or per-tenant. **The owner decided on 2026-10-05: per-tenant
policy is the destination; cloud-first is the interim.**

| Option | What it means | What it costs |
|---|---|---|
| **Cloud-first, local as fallback** | hosted models by default; local for offline, privacy-classified and cheap-repetitive work | best quality and speed today; per-token spend; data leaves the machine |
| **Local-first, cloud as fallback** | local is default; cloud is gated escalation | no per-token spend, data stays in the rack — **but hour-scale turns on today's hardware** |
| **Per-tenant policy** | each tenant declares *local only / local preferred / cloud allowed / approved providers only*, and the broker enforces it before the request leaves | the vision's actual target; needs the registry and budget work |

**Why that split:** the vision already specifies per-tenant policy (seven modes, including *no data
leaving the VPS*), so it is the stated direction rather than a new one. Cloud-first is the only honest
interim while the hardware is this slow — local-first would ship a product where a turn takes twenty
minutes. And per-tenant is not buildable today, because a broker cannot enforce a policy it cannot read.

**What the decision sets in motion — and this is the part that matters.** Choosing per-tenant is not a
preference; it turns three pieces of work from *nice* into **required**:

1. **The model registry stops being optional.** A broker cannot enforce a policy it cannot read.
2. **The agent mapping gets its reason.** Per-tenant policy needs something to attach to — Hermes'
   agents, personas and profiles mapped onto the platform's tenants and roles.
3. **Platform-managed local models become a requirement.** *Local only* and *local preferred* tenants
   are only honest if the platform can say **which** model runs locally, per deployment and per new
   release.

That third one is the owner's own stated requirement: manage which llama models run **from the main
platform**, so models change per need — depending on the server the platform is deployed on and what new
models are released. Half of it already exists (the compose file reads `MODEL_FILE` from the
environment). What is missing is a record of what this deployment serves, a hardware profile so the
platform can say which models are *viable*, a catalogue that is **data rather than code**, and a swap
procedure the platform can drive. **A swap is a restart, not a hot reload** — so a run in flight must be
drained, not migrated mid-run.

---

## 10. The adoption order — and where we actually are

The order is set by the product plan, not by preference. Each phase has an exit gate measured, not
asserted.

| Phase | What lands | Exit gate |
|---|---|---|
| **0. Pin and map** | the source pin that does not exist (a digest + a compatibility harness); the licence position | a digest recorded; the harness runs; the licence position stated |
| **1. The port, with OpenCode behind it** | the typed port; the chat route moved onto it. **No Hermes yet** | the chat works through the door; OpenCode is one implementation behind it; the suite is green |
| **2. One tenant, one tool** | a single Hermes worker, one provider, one narrow tool | cancellation, retry idempotency, usage capture, bounded CPU/RSS, and **no cross-scope access**, proven on one tenant then two adversarial ones |
| **3. Durable sessions and governed tools** | session continuity; provider fallback; more tools, each authorized | median and p95 latency, tokens, CPU, database I/O measured **against the current assistant** |
| **4. Memory and skills** | tenant- and user-scoped, with provenance, review, version, rollback, export, deletion | contamination tests pass; **a skill cannot widen authority**; deletion is real |
| **5. Autonomous work** | recurring and event work through **our** scheduler and queue | durable run records, per-tenant budgets, a global stop, deadlines, idempotency, audit |
| **6. Execution environments and channels** | sandboxed terminal, browser, subagents, messaging | a separate threat model, disposable sandboxes, quotas, network policy, measured cost |

**Where we are:** the model server and the tool wire are **running**. Phase 0 is unfinished (no source
pin exists — the snapshot has no `.git` and declares version `0.0.0`; the dependency set *is* pinned,
which is half the work). **Phase 1 has just started** — the door's shape is written; the door is not yet
used.

### 10.1 The fifteen joints, and their honest status

This is the roadmap in one table. **Read the status column as the plan.**

| # | Hermes capability | Our joint | Status |
|---|---|---|---|
| 1 | Agent loop, tool invocation, streaming | `agent-runtime.ts`, `agent-tools.ts` | **PART** |
| 2 | Agent identity | `principal.ts` (`aiWorkerSubject`, `derivePrincipal`) | **PART** — the seam exists |
| 3 | Tool access to business data | `in-process-client.ts`, `tool-registry.ts`, `tool-executor.ts`, `mcp-tool-adapter.ts` | **PART** — bridge built |
| 4 | Authorization of a tool call | `authority/{decision,graph,preflight,shadow}.ts` + `auth/api/authority/*` | **PART** — must complete before broad tools |
| 5 | Provider choice and fallback | `llm-provider-registry.ts`, `model-allowlist.ts` | **PART** |
| 6 | Sessions, compression, recall | `session-memory.ts` + chat entities | **PART** — a projection, keyed by our ids |
| 7 | Long-lived memory and user model | *(nothing)* | **MISSING** |
| 8 | Skills (learned procedures) | *(nothing)* | **MISSING** |
| 9 | Scheduling and cron | `scheduler`, `queue`, `events`, `webhooks` | **PART** — **our** scheduler owns business jobs |
| 10 | Terminal, browser, code, filesystem | `sandbox.ts` | **PART** — highest risk in the design |
| 11 | Subagents and parallel work | *(nothing)* | **MISSING** |
| 12 | Channels and rooms | `channel-gmail`, `channel-imap` | **PART** |
| 13 | Business meaning (intent → typed operation) | `business-ir`, `user-function`, `business-widget` | **BUILT** (the compiler); Hermes authoring into it **PART** |
| 14 | Deterministic execution with no AI | `user-function/run.ts` | **BUILT** — and it must stay true |
| 15 | Runtime state | *(nothing)* | **MISSING** — the one whose absence matters most |

**Three capabilities are genuinely absent, one is absent in the sense that matters most, and the rest are
seams that exist but are not yet the behaviour needed.**

---

## 11. The four things that must never be possible

The security floor, restated because it governs every joint above:

1. **A model-widened grant.** Hermes may propose a call; it may not mint or widen authority.
2. **A secret in a prompt, a log or an instruction.** Secrets are *referenced*, never inlined.
3. **A business mutation outside the typed command path and its approval.**
4. **A second identity plane.** No Hermes account, dashboard or pairing flow becomes a way to be
   someone. **Hermes is headless.**

---

## 12. What I would flag about this part of the project

**1. The gap between "running" and "integrated" is the biggest single risk in the plan.** Hermes is up,
it discovers 21 tools, the model server answers — and none of it is wired into the product's request
path. It would be very easy for a status report to read *"Hermes is integrated"* when what is true is
*"Hermes is connected to a door that leads nowhere the product uses."*

**2. The `--jinja` question is cheap to settle and nobody has settled it.** One `curl`. It decides
whether tool calling is capable or silently degraded, and it has been documented as an open conflict
between two of our own studies since 2026-10-05.

**3. The embedding lane fails silently.** It fails as a warning, not a gate, on the same lane the
product's retrieval is built on. And there is no embedding model at all. This is a degraded product
wearing the costume of a degraded log line.

**4. The performance numbers should be quoted every time the local-first claim is made.** Hour-scale
turns are not a tuning problem; they are the price of the 64K floor on CPU-only hardware. Anyone who
promises "self-sustaining on local models" without those numbers is over-promising.

**5. The Hermes healthcheck is missing.** A wedged runtime is invisible to the platform today. That is
a one-line fix and it is the difference between a degraded assistant and an invisible one.

**6. The source pin does not exist.** The snapshot has no `.git` and declares version `0.0.0`, so "which
Hermes is this?" currently has no answer. The dependencies are pinned, which is half the problem; the
other half is real.

**7. The licence position is unstated** for Hermes and its optional components. It is Phase 0's own exit
gate and it has not been met.

**8. "Most AI-adjacent work is wiring, not agent runs."** This is the service map's best insight and I
would put it in front of every new developer: if a human's request has to be understood, it is an agent
run. If an admin turns a knob, it is wiring. **Reading wiring as an agent run is the most common way a
newcomer over-complicates this platform.**
