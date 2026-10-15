# Paperclip Study — Batch 02: the aissistant (P1)

**Status:** DONE — 2026-10-15 · **Pole tag: P1 — the aissistant** (the AI user / agent: versatile,
integratable, rich-featured in itself, deployable in different contexts).
**Sources read:** `doc/AGENT-LIFECYCLE.md` (318 lines/17,858 B), `doc/AGENT-IDENTITY.md` (104/11,483 B),
`doc/agent-files.md` (302/19,244 B), `doc/agent-personas.md` (190/11,573 B), `doc/agent-permission-defaults.md`
(31/…B), `doc/memory-landscape.md` (176/10,142 B), `doc/SPEC.md` §2 (Agent Model), plus code verification.

---

## §0 — Plain words: what "the aissistant" is in Paperclip

An agent in Paperclip is **a worker with four separable layers**: a **body** (how it runs — its adapter), a
**soul** (its persistent files — `AGENTS.md`, notes, memory), a **cryptographic identity** (Ed25519 keys so
it can be recognised and authenticated), and a **permission set** (what it may do, granted by default and
then narrowed). Paperclip deliberately keeps these four apart, and it keeps the *soul* configurable by the
adapter rather than baked into the protocol. That separation is the single most transferable thing in this
batch.

---

## §1 — The four layers of an agent (verified)

### 1.1 The body — adapters (measured, `packages/adapters/`)

Paperclip's agent does not have *a* runtime; it has an **adapter type plus an adapter-specific config blob**
(`doc/SPEC.md:110–118`). The shipped adapter packages (measured):

`claude-local`, `codex-local`, `gemini-local`, `grok-local`, `kimi-local`, `opencode-local`, `pi-local`,
`cursor-local`, `cursor-cloud`, `openclaw-gateway`, **`hermes`**, **`hermes-gateway`** — plus the generic
`process` and `http` adapters under `server/src/adapters/`.

**Every adapter implements exactly three methods** (`doc/SPEC.md:262–268`): `invoke`, `status`, `cancel`.
That is the whole contract. **Code verification:** the adapter registry is real —
`server/src/adapters/registry.ts`, `server/src/adapters/registry.test.ts`, `server/src/adapters/types.ts`,
and plugins load through `server/src/adapters/plugin-loader.ts`. **VERIFIED IN CODE.**

**Plain gloss:** you can swap an agent's "body" (Claude Code → Hermes → a bare shell command) without
changing anything above it, because Paperclip only ever calls the same three verbs. **This is the
versatility mechanism** — and it is the same "one typed door" idea our own platform arrived at for the
Hermes integration.

**Cross-study note (Hermes b13/b10):** Hermes positions itself as an **ACP server** and treats other
runtimes as *clients*; Paperclip treats every runtime (including Hermes) as an **adapter it drives**. Both
models exist for the same reason — the boundary must be one narrow interface — but they point in opposite
directions. Both are viable; the mapping step decides which side our product should stand on.

### 1.2 The soul — persistent agent files (measured, `doc/agent-files.md`)

Each managed agent has **one current directory**, scoped by company and agent, with the layout
(`doc/agent-files.md:14–29`):

```
<instance>/companies/<company>/agents/<agent>/
  instructions/          ← current agent files (the Instructions Editor)
    AGENTS.md            ← the entry file (identity/instructions)
    notes/               ← ordinary files + nested folders the agent may create
    any-supported-file
  file-sync/             ← controller-only operational state (NOT user storage)
```

Load-bearing facts (all measured in that file):
- **`AGENTS.md` is the entry file** and **cannot be deleted**; it must stay valid UTF-8, ≤ 1 MiB.
- Agents may **create ordinary files and nested folders** for "notes, memory, and other personal working
  material" (`:4`). **This is Paperclip's answer to persona/memory: files in the agent's own directory.**
- The agent runs in a **private working copy** (`AGENT_HOME`) of those files under the agent lock; the
  canonical folder is restored and diffs are synced back at the stop boundary (`:112`+, "Run lifecycle").
- Limits are explicit and bounded: **100,000 entries, 256 MiB/file, 2 GiB total**; symlinks/hardlinks/
  special files **rejected**; storage limits **never pause an agent** (`:62–78`).
- File-level delta sync, not block-level; canonical manifests **contain no file contents** (`:99–104`).
- `canCreateAgents` / `canCreateSkills` and **`agents:configure`** govern who may edit whose files
  (`doc/agent-permission-defaults.md:9,14–15`).

**Plain gloss:** the agent is **a folder with an instruction file at the centre**, versioned per run, and the
whole thing is inspectable and editable from a UI ("the Instructions Editor"). Persona is *files*, not a
database column — and **the adapter decides the file's meaning** (`doc/SPEC.md:112`: "SOUL.md … HEARTBEAT.md
are adapter-specific configurations").

**Cross-study note (Hermes b13 §3.1):** Hermes has the same primitive (`SOUL.md` + profile home) but
**owns the concept centrally**. Paperclip owns the *folder and the sync* and delegates the *meaning*.
Same primitive, opposite ownership — recorded for the mapping step.

### 1.3 The identity — cryptographic, permanent, per-agent (measured)

`doc/AGENT-IDENTITY.md` (+ code):
- Agents have **persistent Ed25519 identities**, generated at creation or lazily on next managed run (`:1–6`).
- Stored in `agent_identity_keys` (agent home DB); **one identity per agent, company-consistent**; deleting
  an agent cascades to its identity (`:10–14`).
- Keys are **SPKI PEM (public) / PKCS#8 PEM (private)**; `keyId = sha256:` + base64url SHA-256 of the public
  SPKI DER (`:16–18`).
- Private material is **encrypted** via the `local_encrypted` provider, wrapped by
  `PAPERCLIP_SECRETS_MASTER_KEY`, file published atomically `0600` (`:18–22`).
- Delivered to managed runs as **server-owned env vars**: `PAPERCLIP_AGENT_KEY_ID`,
  `PAPERCLIP_AGENT_PUBLIC_KEY`, `PAPERCLIP_AGENT_PRIVATE_KEY` (`:34–40`).
- **Renames, model changes, pauses, resumes, restarts preserve the keypair**; a bad master key/corrupt
  ciphertext **fails the run and does NOT auto-replace the key** (`:24–28`).

**Code verification:** `server/src/routes/agents.ts:2162` (`generateKeyPairSync("ed25519")`),
`server/src/routes/access.ts:538`, and the OKP/Ed25519 check in `server/src/routes/customer-success.ts:30`.
**VERIFIED IN CODE.**

**Plain gloss:** every worker has a **cryptographic passport that survives restarts and is never silently
replaced**. Note the honest limit the doc states: this "does not grant external authorization or change
bearer-token access" (`:1–6` — the key is identity, not permission).

### 1.4 The permissions — defaults, then narrowing (measured, `doc/agent-permission-defaults.md`)

A new **standard** agent is granted a concrete set by default (`:7–17`): `agents:configure`,
`agents:suggest-changes`, `skills:create`, `skills:suggest-changes`, `tools:manage_connections`,
`tools:manage_profiles`, `tools:view_audit`, `tools:use`, `tools:manage_runtime`,
`audit:view_agent_actions`, `inbox:manage`, `tasks:assign`, `tasks:assign_scope`,
`tasks:manage_active_checkouts`, plus `canCreateAgents`/`canCreateSkills`.

**Deliberately NOT granted** (`:19–25`): `agents:create` (as a grant row), `environments:manage`,
`tools:admin`, `users:invite`, `users:manage_permissions`, `pipelines:write`, `joins:approve`.

Two design details worth keeping:
1. **Deny-by-direction on dangerous surfaces:** agent-authenticated callers **cannot** set process-adapter
   config, change host command/args/workdir/sandbox, or **restore host-executed workspace commands through a
   configuration revision** (`:25`). "This keeps host-executed commands under board control."
2. **No silent backfill:** *"There is no permission backfill or upgrade migration for existing agents"*, and
   *"a grant removed by an operator stays removed; ordinary updates and startup do not reapply it"* (`:29`).

**Exceptions:** the rich defaults are **withheld from low-trust agents and managed built-in agents** (`:29`).

**Plain gloss:** a new worker gets *useful* powers by default, but **never the powers that let it escape the
sandbox or rewrite its own execution**, and a human's decision to revoke a power is **permanent**. This is a
mature permission posture and belongs in P1.

---

## §2 — The lifecycle — an implemented state machine (verified)

`doc/AGENT-LIFECYCLE.md` describes hire → verify → ready → pause/resume → terminate as a **real state
machine**, and it is in code (`server/src/modules/agent-lifecycle/` with `domain/`, `application/`,
`adapters/`, `__tests__/`).

**States (measured, `doc/AGENT-LIFECYCLE.md:36–55`):**

| State | Meaning | Next |
|---|---|---|
| `pending_approval` | hire needs board approval | `preparing` / `rejected` |
| `preparing` | required plugins prepare the agent | `verifying` |
| `verifying` | host tests the saved harness config | `ready` |
| `ready` | lifecycle permits work | `pausing` / `terminating` |
| `pausing` → `paused` | host stops work; pause hold | `resuming` / `terminating` |
| `resuming` | plugins restart resources | (state saved before pause) |
| `terminating` → `cleaning_up` → `terminated` | revoke keys, stop, remove resources | none |
| `rejected` | board rejected the hire | none |

**Code verification:** `server/src/modules/agent-lifecycle/index.ts:20` defines
`policyStates = ["preparing","verifying","ready","pausing","paused","resuming"]`, and `:53` reads
`agent.lifecycleState`. **VERIFIED IN CODE.**

**Design commitments in the lifecycle worth naming:**
- **Every hire/transition command owns its transaction**; callers never pass a transaction (`:6–7`).
- **Config updates accept only `AGENT_CONFIGURATION_FIELDS`** and **reject identity, company, accounting
  totals, timestamp, lifecycle fields** (`:26–29`) — the four layers of §1 **cannot be cross-contaminated
  through the config channel**.
- **Queue-then-ready:** messages during setup are queued until verification completes; on `ready` the
  scheduler is asked to dispatch **immediately**, and if dispatch fails **readiness stays committed** and a
  sweep retries — **setup is not repeated** (`:57–62`).
- **Verification is a real probe:** native OpenCode verification "checks the selected model with the real
  hello probe" and authentication failures/unavailable models/timeouts **block readiness** (`:64–68`).
- **A failed command does not save the config change** (`updateAndTransition`, `:88–89`).

**Plain gloss:** hiring a worker is not "insert a row" — it is a **gated pipeline** (approve → prepare →
verify the runtime actually works → ready), and a worker **cannot start work until its body has been proven
to run**. This is the structural answer to "how do you know a hired agent works?" and it is directly
relevant to P1 and P3.

---

## §3 — Memory: a designed *non*-decision (measured, `doc/memory-landscape.md`)

Paperclip surveyed the memory-tool landscape and **chose not to build one**. Its recommendation (`:143–176`)
is a **two-layer model**:

1. **Paperclip owns the binding + control plane** — which provider is in effect per company/agent/project;
   provenance back to comments/documents/runs/activity; cost/latency reporting; browse surfaces; governance
   on destructive ops.
2. **The provider adapter owns the engine** — extraction, embeddings, ranking, profile synthesis,
   contradiction resolution, forgetting, storage.

The **portable core contract stays small** (`:135–141`): ingest/write, search/recall, browse/inspect, get by
handle, forget/correct, usage reporting. Optional capability flags cover profile synthesis, async ingest,
multimodal, tool/skill memory, graph browsing.

**Plain gloss:** Paperclip treats memory like Paperclip treats agents — **a narrow contract with a swappable
engine behind it**. It explicitly aims to support "a local markdown-first baseline" (like `memsearch`) up to
hosted services (`mem0`, `supermemory`) **without becoming a monolithic memory engine**.

**Cross-study note (Hermes b04):** Hermes *does* ship a built-in memory system (files with hard char caps,
`memory_char_limit: 2200`). So on memory the two platforms again split: **Hermes owns the engine, Paperclip
owns only the binding.** Both are defensible; a platform that must integrate many engines leans Paperclip's
way, which is the owner's stated direction. Recorded for the mapping step.

---

## §4 — Divergences found in this batch

**No hard doc-vs-code divergences** — every load-bearing claim in §1–§3 that I checked against code held
(Ed25519 generation, the lifecycle `policyStates`, the adapter registry and its three-method contract, the
`agent-lifecycle` module layout). Two **caveats** are recorded rather than divergences:

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D1** | SPEC §2 reads as a settled agent model | Many `[DRAFT]`/open-questions markers; e.g. "Is this a strict tree or can agents report to multiple managers?" is still open (`SPEC.md:229–233`) | **Genre caveat** (same as batch 01 D1) — SPEC is intent |
| **D2** | `doc/agent-files.md` reads as current | It contains explicit **"Existing installations"** / upgrade sections (`:280–311`), i.e. the model has already changed once and carries compatibility paths | **Caveat:** the file model is evolving; treat layout specifics as moveable |

---

## §5 — Carried forward

| ID | Carry | To |
|---|---|---|
| **C2-1** | **Four separable layers** (body/adapter · soul/files · identity/keys · permissions) that config updates cannot cross-contaminate. | P1 (core), mapping |
| **C2-2** | **Three-method adapter contract** (`invoke`/`status`/`cancel`) is the whole body interface. | P1, P3 |
| **C2-3** | **Soul = a per-agent folder** with a non-deletable `AGENTS.md` entry + free-form notes/memory. | P1 |
| **C2-4** | **Persona meaning is adapter-owned**, not protocol-owned (opposite to Hermes). | P1, mapping |
| **C2-5** | **Persistent Ed25519 identity**, restart-surviving, never auto-replaced, delivered as env vars. | P1, P3 |
| **C2-6** | **Permission defaults that never include escape-the-sandbox powers**, and **revocation is permanent**. | P1, P2 |
| **C2-7** | **Hire is a gated pipeline with a real liveness probe** before `ready`. | P1, P3 |
| **C2-8** | **Config channel is field-whitelisted** — identity/company/accounting/lifecycle are not settable through it. | P1, P2 |
| **C2-9** | **Memory is a binding + small contract**, engine behind it (markdown-first baseline to hosted). | P1, PZ |
| **C2-10** | **Agent visual identity** is a real subsystem: `AgentAvatar`/`AgentIdentity`/`AgentCharacter`, 17 palettes, on-demand image API, Storybook-verified, reduced-motion aware. | PX-W, P1 |

---

## §6 — Value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a real user use case?**
It lets a person **hire, trust, and manage a worker without trusting it blindly**: the worker proves it can
run before it starts; it has a stable identity; it has a private folder the user can read and edit; and it
gets useful powers but never the ones that would let it escape. For the user, that is the difference between
an agent you babysit and an agent you can delegate to.

**Q2 — how does this serve an AI-first business & resources planner?**
Four things are directly reusable for "engineer the agent to be versatile, integratable and rich-featured":
(1) the **four-layer separation (C2-1)** — it is the schema for a worker that can be redeployed across
workspaces/automations/studio without redesign; (2) the **three-method body contract (C2-2)** — the exact
versatility seam; (3) the **gated hire with a real probe (C2-7)** — a planner must not "employ" a worker it
has never seen run; (4) **memory-as-binding (C2-9)** — keeps the planner free to switch engines per tenant.
The one thing Paperclip does that our vision must outgrow is the **single-operator assumption**; P1's worker
model is otherwise the cleanest of the three poles' foundations.

---

*Batch 02 of 07 complete. Divergences: 0 (2 caveats). Carried: C2-1…C2-10. Next: `03-the-workspace.md` (P2).*
