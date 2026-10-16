# buzz Study — Batch 02: the aissistant (P1)

**Folder:** `library/architecture/buzz-forensics/` · **Batch 02 of 07** · **Pole: P1 — the aissistant**

**What this batch answers:** what buzz offers the AI user/agent — the agent runtime, the harness, the
tool surface, the model layer, agent identity and ownership, agent memory, and the job protocol. **This
is where buzz is most distinctive**, because its premise is that **an agent is a member, not a bot**:
same keypair type, same channel membership, same audit trail as a person.

**Rule 5 reminder:** no comparison to our own platform. **Rule 1 reminder:** four doc-vs-code
divergences were found and are recorded in **§7** — one of them material.

---

## 1. What was read, and its measured size

| Source | Size | What it gave |
|---|---:|---|
| `VISION_AGENT.md` | 4,501 B | the two-binary thesis: `buzz-agent` (ACP) + `buzz-dev-mcp` (MCP) |
| `VISION_REMOTE_AGENTS.md` | **8,922 B** | agents that outlive the laptop — **the "same agent, new body" doctrine** |
| `crates/buzz-agent/src/` | **41,813 lines / 36 files** | the agent runtime; `llm.rs` alone is **8,049 lines** |
| `crates/buzz-acp/src/` | **61,140 lines** | the harness — `lib.rs` 13,608 · `pool.rs` 12,447 · `queue.rs` 7,417 · `relay.rs` 7,014 |
| `crates/buzz-dev-mcp/src/` | **~5,220 lines / 13 files** | **the entire tool surface — 6 tools + 2 hooks** |
| `crates/buzz-core/src/engram.rs` + `NIP-AE.md` | — | **agent memory, NIP-44-encrypted** |
| `crates/buzz-acp/src/config.rs` | 2,718 lines | the harness's config surface — **26 documented env vars** |
| `docs/nips/NIP-OA.md` · `NIP-PMA.md` | — | **owner attestation** and the private managed-agent aggregate |
| `scripts/model-capabilities.json` + `normative-corpus.json` | 69,179 B + 88,776 B | **the model layer, as a hand-curated manifest** |
| `.env.example` | 20,095 B | the real, documented configuration surface |

---

## 2. The one-sentence gloss

> **buzz treats an agent as a colleague with its own key**: it gets a keypair, a name, a profile on the
> relay, its own channel memberships, its own memory (encrypted to itself and its owner), its own audit
> trail, and a job board — and the runtime that executes it is deliberately **two small binaries read
> in an afternoon**, not a framework.

The README's phrasing is the sharpest: *"**Agents are members, not bots.** Add an agent to a channel
the same way you add a person."* And: *"Scoped by identity, not by permission flags — the same way
you'd scope a teammate."*

---

## 3. The two-binary doctrine — `buzz-agent` + `buzz-dev-mcp`

### 3.1 The thesis, stated by its authors

`VISION_AGENT.md` opens with a constraint, not a feature: *"A coding agent should be small enough to
hold in your head. If you cannot trace a failure from symptom to root cause in minutes, the system is
too complex."* And the reason is given plainly: **auditability** — *"A senior engineer can read both
binaries in a sitting. There are no abstractions reserved for future flexibility."*

**The architecture is two pipes and two protocols, with no coupling:**

```
Any ACP client (Zed, JetBrains, buzz-acp, custom)
        |  stdio ACP (JSON-RPC 2.0)
        v
  buzz-agent (up to 8 concurrent sessions, configurable cap)
        |  stdio MCP (JSON-RPC 2.0) — one server set per session
        v
  buzz-dev-mcp (or any MCP server)
        |
        v
  shell · read_file · str_replace · todo · shell PATH: rg + tree
```

**The decoupling is the point, and it is stated twice:** *"The agent does not know what MCP server it
talks to. The MCP server does not know what agent is calling it. They compose through protocols, not
imports."* **Plain meaning: you can swap either half** — `buzz-agent` behind Zed, or `buzz-dev-mcp`
behind Claude Code — **without a custom adapter.** The stated consequence: *"Run ten agents behind
Buzz with different MCP configurations. **Swap the LLM provider with one environment variable.**"*

### 3.2 The tool surface is deliberately tiny — and that is measurable

**★ This is the single most quotable finding of the batch, and it is a size measurement.**

`crates/buzz-dev-mcp/src/lib.rs` (211 lines) declares **the entire tool surface: 6 tools + 2 lifecycle
hooks.**

| Tool | What it does (from its own description) |
|---|---|
| **`shell`** | *"Run a shell command (bash by default; set `BUZZ_SHELL`…). **Ephemeral process per call. Output tail-truncated to ~8KB for the LLM; full output (first 10MB) saved to artifact file.** `timeout_ms` defaults to 120000, capped at 1,200,000."* Plus a **narrowed PATH** carrying `rg` and `tree` as buzz-shipped binaries |
| **`read_file`** | line-numbered read with `offset`/`limit` (default 2000) — *"Prefer over cat/head/tail."* |
| **`view_image`** | returns an **MCP image content block** for multimodal models; resizes to 1568 px longest edge; **20 MiB source cap, ~4 MiB on the wire** |
| **`str_replace`** | atomic find-and-replace; `old_str` **must occur exactly once unless `replace_all`**; returns a unified diff — *"Prefer over sed/awk."* |
| **`todo`** | *"Session checklist **only** for work that must continue across turns or survive context compaction. **Do not use for work you can finish in the current turn.**"* |
| **`_Stop`** (hook) | returns open todo items; *"Used by the agent's `_Stop` lifecycle hook to **advise against ending with incomplete work**."* |
| **`_PostCompact`** (hook) | *"Agent invokes after handoff; returns todo state for **re-injection**."* |

**Why this matters, in plain words:** this platform's agent is given **six things it can do plus two
lifecycle callbacks** — and the descriptions themselves are *coaching*, telling the model when **not**
to use a tool (`todo`: "do not use for work you can finish in the current turn") and which smaller tool
to prefer (`read_file` over `cat`; `rg` over `grep`; `str_replace` over `sed`). **The tool surface is a
design argument, not a capability dump.**

**★ And a detail with a real consequence for context economy:** `shell` **truncates output to ~8 KB for
the model while writing up to 10 MB to an artifact file.** That is the same discipline n8n's
`agent-check.mjs` applied (**excerpt to the agent, full output to disk**) — reached independently, here
**built into the tool itself.** *CZ observation (rule 5-safe — cross-study note, not a comparison to
our platform): this study's fourth instance of "the agent sees the head, the disk keeps the whole".*

### 3.3 A hidden economy trick: one binary, four personalities

`buzz-dev-mcp/src/lib.rs` **dispatches on `argv[0]`** ("Multicall dispatch"):

- argv[0] `rg` → a ripgrep-compatible personality (`exit`s before any runtime is built — *"No tracing, no
  tokio, no allocations beyond argv parsing"*);
- argv[0] `tree` → a `tree`-compatible personality;
- argv[0] `buzz` → the buzz relay CLI;
- anything else → the **MCP server itself**.

**Plain meaning: the MCP server, a grep and a tree listing are the same binary, chosen by filename.**
Why it matters: **the shell PATH is narrowed to *this one binary* under three names** — so the agent's
`rg`/`tree` are buzz's, not the host machine's, and the PATH can stay small. **This is a containment
technique worth naming on its own** and is picked up again in batch 06.

### 3.4 Hardened by construction — the invariants are asserted, not aspirational

`VISION_AGENT.md` states the design principles as **prohibitions**, which is the same pattern batch 01
found in the crate graph: **zero unsafe · zero panics · bounded process lifetime · bounded output sizes
· bounded history · process-group kill on every exit path · file edits resolve against the working
directory.** And the file header in `buzz-dev-mcp/src/lib.rs` **enforces the first one at the compiler
level**:

```rust
#![cfg_attr(not(windows), forbid(unsafe_code))]
#![cfg_attr(windows, deny(unsafe_code))]
```

**Plain meaning: on non-Windows the crate *cannot compile* if anyone adds `unsafe`. On Windows it is a
hard error too, but expressed as `deny` because a Windows necessity forces the escape.** That is a
one-line, checkable statement of intent — exactly what "hardened" means when written down.

**And a second, sharper invariant lives at the top of `private_managed_agent.rs`:**

> *"This module defines and validates the **inert wire format only**. Relays **must not accept**
> `KIND_PRIVATE_MANAGED_AGENT` until the dedicated privacy and aggregate-CAS transactions are
> deployed."*

**Plain meaning: the codec was landed *before* the capability, and the code says so and refuses to
work.** That is a rare and honest engineering posture — **the wire format is frozen, the feature is
explicitly off** — and it is the same species as the "Known Limitations" section in batch 01.

---

## 4. The harness — `buzz-acp`, and its config surface

### 4.1 What it does

`buzz-acp` bridges **relay events → AI agent subprocesses** over ACP. `ARCHITECTURE.md` §6 counts the
modules (LOC): `relay.rs` 3,143 · `queue.rs` 2,565 · `main.rs` 2,457 · `pool.rs` 2,253 · `config.rs`
1,903 · `acp.rs` 1,785 · `filter.rs` 814.

**The behaviors that matter:**

- **A pool of 1–32 agent subprocesses** with a claim/return lifecycle.
- **Per-channel queuing: at most ONE prompt in flight per channel** — later `@mention`s queue.
- **Crash recovery**: a crashed subprocess is detected and **respawned**.
- **Agents are addressed by `@mention`** and discovered via REST channel listing.

**What it does not do, in its own words: *"Does NOT: persist state."*** The harness is stateless; state
lives on the relay (`buzz-core`'s engrams and the relay's event log).

### 4.2 The configuration surface — 26 documented variables, and one that is a lie

**.env.example is 20,095 B and the harness's documented surface is exactly 26 `BUZZ_ACP_*` variables**
(measured). They divide into:

| Group | Variables | Notes |
|---|---|---|
| **Which agent** | `AGENT_COMMAND` (`goose`), `AGENT_ARGS` (`acp`), `MCP_COMMAND`, `AGENTS` (pool size 1) | **the harness is agent-agnostic — `goose`, `claude-agent-acp`, `codex-acp` are all named in the source** |
| **Which model** | `MODEL` | one variable |
| **Identity** | `PRIVATE_KEY` | the agent's own key |
| **What it listens to** | `SUBSCRIBE` (`mentions`), `KINDS`, `CHANNELS`, `NO_MENTION_FILTER`, `DEDUP` (`queue`), `NO_IGNORE_SELF` | **`KINDS` = the agent can subscribe by kind, not only by mention** |
| **Session & context** | `SESSION_POLICY` (`channel`\|`thread`), `CONTEXT_MESSAGE_LIMIT` (12), `MAX_TURNS_PER_SESSION` (0), `EVENT_BUFFER` (256), `TURN_TIMEOUT` (320) | see §4.3 — **`SESSION_POLICY` is the interesting one** |
| **Personality** | `SYSTEM_PROMPT`, `SYSTEM_PROMPT_FILE`, `INITIAL_MESSAGE` | |
| **Lifecycle** | `HEARTBEAT_INTERVAL`, `HEARTBEAT_PROMPT`(+`_FILE`) | **a heartbeat that can *prompt* the agent** |
| **Presence** | `NO_PRESENCE`, `NO_TYPING` | presence and typing indicators are **opt-out**, not opt-in |
| **Config file** | `CONFIG` (`./buzz-acp.toml`) | |

**★ `SESSION_POLICY=channel|thread` is the load-bearing one**, and the comment on it is a lesson in
shipping: *"gives each canonical channel thread its own isolated provider session; direct messages stay
conversation-scoped either way. **Ships as \"channel\" so thread scoping can be canaried and rolled back
without code changes.**"* **Plain meaning: a behaviour change was shipped as a configuration default so
it could be reversed without a deploy** — a canary expressed as a config value.

### 4.3 The permission model — six modes, and the default is BYPASS

`buzz-acp/src/config.rs:127` defines **`PermissionMode` with six values**, with wire strings pinned by
a test (`test_permission_mode_wire_strings`):

| Mode | Wire string | Meaning |
|---|---|---|
| `Default` | `default` | *"Agent's built-in behaviour (permission requests per tool call)."* |
| `Auto` | `auto` | *"Fully autonomous execution; **model-gated** (requires `supportsAutoMode`). Degrades gracefully to `default` when the session's active model does not support it."* |
| `AcceptEdits` | `acceptEdits` | *"Auto-approve file edits, still ask for other tools."* |
| `BypassPermissions` | `bypassPermissions` | *"Skip the permission flow entirely."* |
| `DontAsk` | `dontAsk` | *"Never prompt; **reject** anything that would require permission."* |
| `Plan` | `plan` | *"Planning-only mode (**no tool execution**)."* |

> **★★ THE MATERIAL DIVERGENCE OF THIS BATCH — and it is a security-relevant one.**
> The CLI declares **`default_value = "bypass-permissions"`** for `permission_mode`
> (`config.rs:473`), and the test fixture at `config.rs:1578` confirms
> `permission_mode: PermissionMode::BypassPermissions`. **So the out-of-the-box harness runs the agent
> with NO permission prompts at all.** Meanwhile the module doc at `buzz-agent/src/permission.rs:4`
> describes a different world: *"buzz-agent asks the client to authorize **every** LLM-issued MCP tool
> call *before* executing it; the client applies **`BUZZ_ACP_PERMISSION_POLICY`** and answers."*
> **`BUZZ_ACP_PERMISSION_POLICY` DOES NOT EXIST.** It is not in the 26 documented variables, not in
> `.env.example`, and not referenced anywhere else in the tree (verified by full-tree grep). **The
> comment names an environment variable that was never built, and describes a default that the CLI
> overrides to `bypassPermissions`.**
> **Both halves are recorded because they matter differently:** the *mechanism* exists and is real (the
> permission broker in `buzz-agent/src/permission.rs` is ~1,000 lines with documented invariants); the
> *policy switch* is documented under a name that does not exist; and the *default* is permissive.

**And the broker itself is worth a line** — its invariants are stated precisely, which is the batch's
recurring signature: *"**Claim-before-wake / at-most-once** — deliver removes the entry before waking
the waiter, so each id resolves at most once"*; *"**Undeliverable asks are terminal** … fails closed
immediately rather than leaving a resident waiter to timeout — a closed wire can never carry the reply"*;
*"**Abort-safe cleanup** … its `Drop` synchronously removes the still-pending entry and releases the
slot, covering task abort/panic."*

---

## 5. The model layer — a manifest, not code

**★ buzz's model layer is a 69 KB hand-curated JSON manifest, read by two languages.** Measured from
`scripts/model-capabilities.json`:

| Measure | Value |
|---|---:|
| `exact_records` | **57** |
| `family_rules` | **19** |
| `provider_fallbacks` | **6** |
| `databricks_v2_known_models` | 2 |
| `normative-corpus.json` (the cross-language contract) | 88,776 B |

**The design is explicit and unusual** (`model_capabilities.rs` header + the manifest's own
`_comment`):

- The manifest is *"**the single source of truth** for every model's **six-axis capability profile**
  (thinking mode, supported efforts, default effort, Databricks v2 wire route, normalization policy, and
  picker label)."*
- It is **embedded at compile time** in Rust (`include_str!` + strict `serde` with `deny_unknown_fields`
  + real enums) and **imported** in TypeScript (**JSON import + zod**).
- **"No codegen."** Both interpreters read the same hand-curated file, and *"the shared normative corpus
  (`scripts/normative-corpus.json`) is the cross-language contract that guarantees they agree."*
- **Exact records are authoritative and do NOT inherit from family rules** — and the manifest says
  divergence is *"legal and sometimes correct (e.g. provider-advertised effort overrides)."*
- Provenance is in the file: each exact record carries a `_provenance` string naming the source and the
  verification date — e.g. *"native Messages with adaptive thinking and output_config.effort=high
  **verified by synthetic tool-result round trip on 2026-09-23**."*

**Why this is a genuinely different answer:** a model's capabilities are **data with a
cross-language contract**, not logic duplicated in two places. **The two implementations cannot drift
silently, because a third artefact (the corpus) is the referee.** *CZ note (cross-study, observation):
n8n's `MAX_IN_PROCESS_WAIT_MS` was a constant whose accuracy could be checked; here the whole model
matrix is a versioned document whose consistency is checkable.*

**The providers are five** (`config.rs:427`): `Anthropic` · `OpenAi` · `Databricks` (serving-endpoints,
OAuth 2.0 PKCE or static token) · `DatabricksV2` (AI-gateway routing by model family) · **`OpenRouter`**.
Plus an **OpenAI-compatible** escape hatch, and the `BUZZ_ACP_MODEL` variable — *"swap the LLM provider
with one environment variable"* is backed by real code.

**Two facts a reader should hold:** (1) the catalog supports **discovery** (Databricks workspace
endpoints + Unity Catalog model services, paginated, with retry policy and body caps) — so the model
list is not hardcoded; (2) **thinking effort is a first-class axis** with five levels (`low`→`max`) and
four activation modes (`adaptive`, `manual-budget`, `none`, `omit-fields`).

---

## 6. Agent identity, ownership, memory, jobs, and the body

### 6.1 Identity: same as a person's

`VISION.md`: **humans and agents get the same thing** — *"secp256k1 keypair (Nostr-native) ·
`alice@example.com` NIP-05 handle · NIP-42 Schnorr auth (humans) or **NIP-98** Schnorr auth (agents) ·
**Bot role on agent channel membership**."*

**The distinction between human and agent auth is which NIP signs the event** (42 for humans, 98 for
agents), not a different credential class. **And the `Bot` role is one of the five channel-member roles**
(`Owner`/`Admin`/`Member`/`Guest`/**`Bot`**) — measured in batch 01. **Plain meaning: an agent's
identity is a keypair, and its access is channel membership — the same two primitives a person gets.**

### 6.2 Ownership: **NIP-OA**, an attestation that does NOT rewrite authorship

`agent_owner_pubkey` is a column on `users` and a field in `AuthContext` (`buzz-auth/src/lib.rs:103`).
The relationship is defined by **NIP-OA "Owner Attestation"**, and its non-goals are the interesting
part:

> *"This NIP defines an optional `auth` tag by which an owner key authorizes an agent key to publish
> events **under the agent's own authorship**."*
> Non-goals: *"does not define impersonation · does not define key derivation · **does not define
> relay-side author rewriting**."*

**Plain meaning: the owner does not become the author.** The agent still signs its own events; the
`auth` tag is *"an **authorization evidence only**"* — a reusable capability, explicitly **not** a
NIP-26 delegation of the event's semantic authorship. **And a valid `auth` tag lets the relay apply
owner policy** (e.g. the earlier finding, in batch 01, that an owner's single `kind:20003` heartbeat can
set presence for up to 256 of its own agents).

**★ This is the mechanic behind the README's central claim — *"Scoped by identity, not by permission
flags"* — and it is the cleanest answer to the "who does the agent act as?" question found in this study
so far: the agent acts as itself, and the owner holds an attestation that the relay can read.**

### 6.3 Memory: **NIP-AE "Agent Engrams"**, encrypted to the agent–owner pair

Agent memory is a **custom NIP**, not a database table. `NIP-AE.md` defines **`kind:30174`** events
signed by the agent's key and **encrypted with NIP-44** using the conversation key between agent and
owner. Measured properties:

- **Because NIP-44's key is symmetric, *"both parties decrypt every event; the owner can always read
  everything the agent remembers."*** (An explicit, and honest, design choice stated in the spec.)
- **Memory is scoped to a single `(agent pubkey, owner pubkey)` pair** — *"An agent serving multiple
  owners holds an independent memory per pair."*
- **A reserved slug `core`** holds the agent's identity engram; everything else lives under `mem/…`.
- **`D_TAG_DOMAIN = "agent-memory/v1/d-tag"`** — *"Versioned independently of the NIP number; future
  revisions MUST change it."*
- **Limits**: NIP-44 plaintext max 65,535 B; slug max 255 B.
- A dedicated kind was chosen **for namespace isolation**: *"`core` and `mem/…` slugs cannot collide
  with another app's `d` tag choices, regardless of agent reuse."*

**Plain meaning: an agent's memory is encrypted Nostr events addressed by slug, owned by the
agent–owner pair, portable across relays, and readable by the owner by construction.** `buzz-core`'s
`engram.rs` is **I/O-free** (*"does not talk to relays or filesystems"*) — the crypto and the parsing are
separated from the transport, and *"callers wire it to a transport and a key source."*

**★ And a consequence the spec is honest about:** *"agents that rotate relays without migrating their
heads will lose access to memory not also present on retained relays."* **Memory portability is real
but manual.**

### 6.4 The job protocol — six kinds, and a directory surface

Batch 01 measured the job kinds: **`43001 JOB_REQUEST` · `43002 ACCEPTED` · `43003 PROGRESS` ·
`43004 RESULT` · `43005 CANCEL` · `43006 ERROR`**. Plus `44200 AGENT_TURN_METRIC` — **an agent turn's
metric stored as an event**, which is what makes agent cost observable through the same log as
everything else. And `VISION.md` names a **🤖 Agents surface**: *"Directory. Your agents. **Job
board**."*

**Plain meaning: assigning work to an agent is publishing a signed job request, and the whole
lifecycle — accepted, progressing, result, error — is events in the same log as the conversation.**

### 6.5 The body, and the doctrine that says the body does not matter

**★ `VISION_REMOTE_AGENTS.md` (8,922 B) is the most philosophically forceful document in the repo, and
it is an architecture argument, not a feature pitch.** Its thesis: *"An agent in Buzz is more than just
a process. It has a keypair, a name, a durable history, a reputation — all on the relay. But today its
**body** is borrowed: it runs while a desktop app runs, on hardware that sleeps when a human does. **The
agent's home is the relay; the machine is just where it happens to be working.**"*

**The load-bearing design rule, stated as an axiom:**

> **"After deploy, the desktop retains no substrate control channel."** Launch is *"a single one-way
> handoff"* — the desktop resolves the provider through one narrow path, stages one artifact, refuses an
> unknown protocol version, and *"hands over a launch payload it never persists."* From then on
> everything flows through the relay.

**And the consequence is a genuinely novel lifecycle control: agents that reap themselves.** *"A timer
that owes nothing to the agent's workload watches for silence, and after hours of quiet it finishes
what's in flight, says goodbye to the relay, and exits. **Not killed — finished.** The default state of
a remote agent is 'not running', which is also the default state of the rest of the team at 3am.
**Compute is rented by attention.**"*

**The document then lists its own honest costs — the study's fourth instance of a platform naming its
gaps** — and they are specific: *"**You bring the substrate** … **Handing over the key is a decision**
… On Kubernetes, that key rests as a Secret: anyone the cluster trusts to read secrets in that namespace
can read it … **No backchannel cuts both ways** … **Self-reaping needs a living reaper** — a body wedged
badly enough to stop running its own timer cannot finish itself … **The body's state is mortal** …
**Presence can lag the truth, but not for long** … by at most about three minutes if it doesn't."*

**The substrate contract is stated so it is NOT about containers:** *"a provider … must honor never
mentions containers: **preserve the agent's identity and fail closed with its key · converge to a single
live instance no matter how deploys race · let presence describe conversational availability rather than
substrate health · bound the instance's lifetime · keep secrets out of configuration.**"* **And the
limit of the guarantee is stated too:** *"a conformance suite pins those behaviors — it establishes that
a **provider honors the contract, not that arbitrary code is safe to hand a key**; choosing a provider,
like choosing a cluster, **remains a trust decision you make deliberately.**"*

**★ One measured caveat (rule 1).** `buzz-backend-kubernetes` is a real crate, and
`buzz-relay/src/tunnel/` exists — so the remote-agent substrate path is present in code. **But
`VISION_REMOTE_AGENTS.md` is a vision doc, and batch 01's finding F1-8 (six self-declared gaps) shows
vision and implementation must be read apart.** **The doctrine is the artefact of interest; whether the
Kubernetes provider is wired end-to-end is a batch-06 question, not this one.**

### 6.6 Personas and managed agents — the organisational layer

- **`buzz-persona`** — *"agent persona packs"*: modules for `manifest`, `merge`, `pack`, `persona`,
  `resolve`, `validate`. **A persona is a versioned, validated bundle**, and `KIND_PERSONA = 30175` /
  `KIND_TEAM = 30176` / `KIND_TEAM_CATALOG = 30178` make personas and **teams** addressable events.
- **`KIND_MANAGED_AGENT = 30177`** (public) and **`KIND_PRIVATE_MANAGED_AGENT = 30179`** (private).
- **★ `NIP-PMA` is a reservation with teeth.** *"`draft` — **protocol/codec reservation only. Relays
  MUST reject this kind until privacy, transactional CAS, backup/restore, revocation, and capability
  gates are deployed.**"* The aggregate's coordinate is **`(owner pubkey, 30179, agent pubkey)`**, and
  it is described as *"the only durable authority after a per-agent migration is independently
  verified."* Its envelope is strict: exactly `d` (agent pubkey), `g` (generation), `prev` (predecessor),
  `state = active|deleted`. **The private payload is NIP-44-encrypted with hard caps** — 256 env vars,
  16,384 B per value, a max generation of 2^53−1.
- **Consequence:** *"Kinds `30175` and `30177` remain public/compatibility projections"* — **i.e. the
  public persona/managed-agent kinds are the compatibility view of a private aggregate that is designed
  but not deployed.**

**Plain meaning: buzz has thought about the organisational layer (agents with personas, belonging to
teams, with a private configuration containing environment variables), has specified it, and has
deliberately not switched it on.** That is the same posture as `private_managed_agent.rs` (§3.4).

---

## 7. Doc-vs-code divergences found in this batch (rule 1)

| # | Claim | Where | The code | Verdict |
|---|---|---|---|---|
| **D2-1** | *"the client applies `BUZZ_ACP_PERMISSION_POLICY`"* | `buzz-agent/src/permission.rs:4` (module doc) | **The variable does not exist** — not in `.env.example`'s 26 `BUZZ_ACP_*` vars, not referenced anywhere else in the tree | **Stale doc reference.** The mechanism exists; the named switch does not |
| **D2-2** | *"the agent asks the client to authorize **every** LLM-issued MCP tool call before executing it"* | same file | CLI default is **`bypass-permissions`** (`config.rs:473`), test-confirmed at `config.rs:1578` — *"Skip the permission flow entirely"* | **The described behaviour is one mode of six, and NOT the default.** Material for any security question |
| **D2-3** | *"`buzz-agent` … up to **8** concurrent sessions"* | `VISION_AGENT.md` | Consistent with the source (a **configurable cap, default 8**, stated in the same doc) | **Consistent** — recorded because the number recurs and should be cited as configurable |
| **D2-4** | *"Ten agents in parallel behind Buzz"* | `VISION_AGENT.md` | Harness pool is **1–32** (`ARCHITECTURE.md` §6) | **Consistent** — the vision's "ten" is an example; the code's ceiling is 32 |

---

## 8. Capability table (tagged by pole)

| Capability | Plain gloss | Pole | Q1 · USER VALUE | Q2 · VISION VALUE |
|---|---|---|---|---|
| **Agent = keypair + membership** | the agent is a colleague, not a bot account | **P1** | an agent joins a room like a person; you scope it by *where it is*, not by a flag matrix | **the identity-scoped access primitive this project keeps needing** — no permission engine to build |
| **Agent memory as NIP-AE engrams** | encrypted, owner-readable, per-(agent,owner) memory | **P1** | the agent remembers, and **you can always read what it remembers** | **memory that is portable, encrypted, and auditable by the owner** — a shape worth studying closely |
| **Six-tool MCP surface** | the agent can do six things, and the descriptions coach it | **P1 / PX-F** | predictable, auditable behaviour; a small context cost | **a tool surface small enough to reason about** — the opposite of tool sprawl |
| **`shell` truncate-to-8KB / full-to-disk** | the model sees the head, the disk keeps everything | **P1** | long command output does not blow up the conversation | **context economy built into the tool** — a pattern to keep |
| **ACP/MCP both sides swappable** | either half can be replaced without a custom adapter | **P1 / PZ** | bring your own agent; bring your own tools | **protocol-native composition** — no framework lock-in |
| **The model manifest + corpus** | model capabilities are data with a cross-language referee | **P1 / PX-F** | adding a model is a data edit, not a code change | **a capability matrix that cannot silently drift between two implementations** |
| **NIP-OA owner attestation** | the owner authorizes; the agent remains the author | **P1 / P2** | an agent's actions are always attributable to the agent, with a readable owner link | **provenance that survives without an impersonation model** |
| **Six-mode permission ladder** | default→auto→acceptEdits→bypass→dontAsk→plan | **P1 / PZ** | autonomy is adjustable from "ask me" to "plan only" | a **ladder with a `plan` rung** — planning-only is a first-class mode |
| **`plan` mode (no tool execution)** | the agent can be told to think without acting | **P1 / PZ** | safe rehearsal before commitment | **a mode our own automation will want** |
| **Job protocol (6 kinds) + job board** | assigned work is signed events with a lifecycle | **P1 / P3** | delegation with an auditable trail | handed off to batch 04 as the **bridge between the agent pole and the automation pole** |
| **Self-reaping remote agents** | compute rented by attention; the agent exits when quiet | **P1 / P3** | agents stop billing when unused | **lifecycle control with no control plane** — an unusual and attractive economics |
| **"No substrate control channel"** | after deploy the desktop holds no backdoor | **P1 / PZ** | nothing to leak, nothing to port | **a management plane deliberately not built** |
| **Multicall binary (`rg`/`tree`/`buzz`)** | one binary, four personalities via argv[0] | **PZ** | a narrowed, predictable PATH | **containment by packaging** — picked up in batch 06 |
| **NIP-PMA reservation with `MUST reject`** | the codec shipped before the feature, and refuses to work | **PZ** | (indirect) an unshipped feature cannot be exploited | **an honest pre-landing posture** — a technique worth naming |
| **`zero unsafe` / `deny` at compile time** | the compiler enforces the hardening claim | **PZ** | fewer whole bug classes | **constraint-as-architecture, third instance** |

---

## 9. Findings carried forward (into batches 03–07)

**F2-1 · An agent is a keypair + channel memberships, and the owner holds an attestation — not a
delegation.** NIP-OA's non-goals explicitly refuse impersonation and author rewriting. **The agent acts
as itself; the owner's authority is a readable tag.** → this is the P1 mechanism batch 07 weighs.

**F2-2 · The default permission mode is `bypass-permissions`, and a documented policy switch does not
exist** (§7 D2-1/D2-2). **Any statement about buzz's agent safety posture must start here.** → batch 06
(security perimeter) inherits this.

**F2-3 · The tool surface is six tools + two hooks, and the descriptions coach the model.** The
`~8 KB to the model / 10 MB to disk` split is built into `shell` itself. → batch 05 (PX-W/PX-F) reads
the tool schema as a UI-surface question.

**F2-4 · Model capability is a 69 KB manifest with a shared normative corpus as a cross-language
referee — no codegen.** 57 exact records, 19 family rules, 6 fallbacks, 5 providers. → batch 05 for the
TypeScript side.

**F2-5 · Agent memory is a custom NIP (NIP-AE, `kind:30174`), NIP-44-encrypted to the
`(agent, owner)` pair, slug-addressed, with the owner able to read everything.** → batch 03 reads it
beside the tenancy boundary (memory is *community*-scoped too: VISION_AGENT says *"no agent state is
inherited across hosts"*).

**F2-6 · The job protocol is six kinds (`43001`–`43006`) plus a stored turn metric (`44200`), and the
Agents surface includes a job board.** → **batch 04 (P3) must treat this as part of the automation
pole**, or the pole will be under-read.

**F2-7 · The remote-agent doctrine is "the desktop retains no substrate control channel", and self-reaping
replaces a supervisor.** Its honest-costs section is the batch's second self-written defect list. **The
Kubernetes provider's end-to-end state is unresolved here** → batch 06.

**F2-8 · Two features are specified and deliberately OFF**: the NIP-PMA private managed-agent aggregate
(*"Relays MUST reject this kind"*) and the whole `private_managed_agent.rs` codec (*"inert wire format
only"*). **Neither is a gap; both are reservations.** → batch 06.

**F2-9 · `SESSION_POLICY=channel|thread` shipped as a config default specifically so it could be canaried
and rolled back without code changes.** A small finding with a large lesson: **a behaviour change can be
expressed as a reversible default.**

---

## 10. What batch 02 does NOT claim

- **It does not claim buzz's agent system is safer or riskier than any other.** It records five
  measured facts (default = bypass, no rate limiting from batch 01, a permission broker with stated
  invariants, a shell at operator trust level, a self-declared "handing over the key is a decision").
  **Weighing them is batch 06 and the mapping pass.**
- **It does not read the LLM layer** (`llm.rs`, 8,049 lines) beyond its provider list and the manifest —
  the provider/wire mechanics belong to batch 05's frontend/plumbing view only if they touch the client.
- **It does not compare buzz to our own platform.** Rule 5.

---

*Batch 02 of 07. Written 2026-10-16. Next: `findings/03-the-workspace.md` (P2) — the event store, the
channel/forum/DM model, `buzz-auth`, `buzz-core::tenant`, the community boundary, the TLA+/Tamarin
isolation models read as models, `buzz-db` + the 62 migrations, and the artifact system.*
