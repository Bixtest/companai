# Paperclip Study — Batch 06: out-of-pole findings (PZ)

**Status:** DONE — 2026-10-15 · **Pole tag: PZ** — findings that do not sit cleanly inside P1/P2/P3 but
"fit our vision, project, architecture, or a potential use case or added value for the end user" (the owner's
escape hatch).
**Sources read:** `doc/MCP-ACCESS-GOVERNANCE.md`, `doc/public-mcp.md`, `doc/observability.md`,
`rules/README.md` + `rules/*.mdc`, `.agents/skills/` (31 skills), `doc/evals.md`, `doc/CUSTOMER-SUCCESS-
INSPECTION.md`, `AGENTS.md`, `doc/DEVELOPING.md` (head), `doc/SEARCH.md`.

Each finding carries a **one-line reason it is kept**, per the owner's instruction.

---

## §0 — Plain words: what is in this batch and why

These are the things Paperclip does that are **bigger than one pole** or that **do not fit any pole** — the
way it governs who may touch what (MCP), the way it watches itself (observability), the way it develops
itself with agents (skills + rules + verify loops), the way it tests agents fairly (evals), and the cracks in
its single-tenant wall where cloud features are appearing (customer-success inspection). Each is kept because
it maps onto something our vision, platform, or users will need.

---

## §1 — MCP access governance (PZ)

`doc/MCP-ACCESS-GOVERNANCE.md` (32,060 B) + `doc/public-mcp.md` (31,387 B) describe how Paperclip governs
**Model Context Protocol** connections — the same protocol our platform uses for Hermes tool bridging.

Measured structure:
- **Mental model + canonical integration model** (`:25`, `:64`); "Install the example application +
  connection + profile in one call"; a **bundled smoke check** that "validates an allowed read, a denied
  write, **audit visibility**" (`:85`).
- **Paperclip as MCP endpoint vs MCP gateway** (`:97`) — it distinguishes *being* an MCP server from
  *proxying* MCP servers, which is exactly the distinction our Hermes bridge had to make.
- **Managed connections** with a lifecycle: create → **health check (no secrets in output)** → **catalog
  refresh (pulls schema, sets risk levels, quarantines unexpected writes)** → enable → **disable (does not
  delete; preserves audit history)** (`:148–190`).

**Plain gloss:** Paperclip treats each MCP connection like a **regulated door**: it pulls the schema, assigns
a risk level, **quarantines anything that unexpectedly tries to write**, and keeps the audit trail even after
you turn it off. For a platform whose agents call external tools on a customer's behalf, this is the
governance shape we will need.

**Kept because:** our Hermes bridge exposes platform tools to an agent; Paperclip's model is a direct
upgrade path for governing exactly that surface (risk levels + quarantine + audit-preserving disable).

---

## §2 — Observability: OpenTelemetry + Sentry (PZ)

`doc/observability.md` (103,111 B) is a full observability spec:
- **OTel tracing** with peer-dependency install, `OTEL_*` env config, protocol choice
  (`grpc | http/protobuf | http/json`), service identity attached to every span (`:66–118`).
- **`service.version` resolution order** (`:118`) — the running identity is derived, not assumed.
- **Controller preparation phases** traced (`:164`), and **Native Runner Trace Spans** (`:243`) — the runner
  is instrumented.
- **Sentry error monitoring**, **two Sentry projects**, **DSN delivery to the browser** (`:356–441`).

**Plain gloss:** the platform is **instrumented to be debugged in production** — traces across the control
plane and the runner, and error monitoring split into server+browser. Agent systems fail in *time-dependent,
distributed* ways; without traces you cannot tell "stuck" from "working". Our platform will need this.

**Kept because:** a multi-tenant agent platform cannot be operated blind; Paperclip's OTel+runner-span shape
is a concrete target for our own observability, and the Hermes study (b03, b07) already showed the cost of
not being able to see what a run is doing.

---

## §3 — The platform develops itself with agents (PZ) — the strongest "hidden" finding

Paperclip is **built by agents, and it ships the machinery for that**:
- **`rules/` — architectural guidance as scoped `.mdc` files** (`rules/README.md`): each has a `description`
  and an `alwaysApply` boolean, with `globs` for scoped rules; **root `AGENTS.md` tells coding agents to read
  matching rules before editing**; the rule body stays the single source of truth and is **wired into the
  hosted reviewer** (`.greptile/files.json`, `.greptile/rules.md`). Existing rules include
  `heartbeat-execution-boundaries.mdc`, `database-migration-snapshots.mdc`,
  `runtime-dependency-boundaries.mdc`, `product-harness-responsibility.mdc`.
- **`.agents/skills/` — 31 first-party skills for developing Paperclip**, including
  `company-creator`, `create-agent-adapter`, `create-external-bot-integration`, `check-pr`, `verify-paperclip`,
  `paperclip-dev-workspace-run-verify-fix`, `prcheckloop`, `terminal-bench-loop`, `test-audit`,
  `diagnose-why-work-stopped`, `fix-slow-queries`, `doc-maintenance`, `maintain-storybook`, `release`.
- **Four agent-tool config folders in-tree**: `.agents/`, `.claude/`, `.codex/`, `.devin/` — the repo is
  set up for **any** coding agent.

**Plain gloss:** the platform **practises what it ships** — it uses agents, skills, and scoped rules to
maintain itself, and it explicitly supports *any* coding agent doing so. This is the clearest evidence that
their "agents as workers" thesis is real and not marketing.

**Kept because:** this is the strongest match to our vision of an **agent-run company**. If our platform is to
be built and maintained with agents, Paperclip's **scoped-rule + first-party-skill-package + verify-loop**
pattern is the most transferable process finding in the whole study — independent of any code we reuse.
*(This also explains the repeated `verify`/`prcheckloop`/`terminal-bench-loop` skills at the top of the list.)

---

## §4 — Evals: testing agents fairly (PZ)

`doc/evals.md` (28,556 B) + `evals/promptfoo/` (measured present). The platform ships an **eval harness**
(Promptfoo-based) with prompts like `heartbeat-system.txt`.

**Cross-study note (Hermes b06 / our own M3-AGT-02):** our platform already has an **eval gate** on the hire
path (the Hermes forensics study recorded `M3-AGT-02`). Paperclip independently arrived at shipping an eval
harness. **Two platforms, same conclusion: an agent platform needs an eval system.** That convergence is
itself a signal for the mapping step.

**Kept because:** evals are the difference between "we hired some agents" and "we can prove our agents are
fit for the job" — foundational to our vision.

---

## §5 — The practical corpus: DEVELOPING, SEARCH, CLI, TASKS (PZ)

Measured, useful single artefacts a later build phase can mine directly:
- **`doc/DEVELOPING.md` is the single largest doc (161,651 B)** — the developer manual (workspace layout,
  checkouts, run-verify-fix loops).
- **`doc/CLI.md` (56,070 B)** + `cli/src/` (46,128 LOC) — a real CLI.
- **`doc/SEARCH.md`** — how search works across the surface.
- **`doc/TASKS.md` / `doc/TASKS-mcp.md`** — the task/MCP work registries.
- **`docs/api/*`** — a documented REST API (`activity`, `agents`, `approvals`, `companies`, `costs`,
  `dashboard`, …), plus `server/src/routes/openapi.ts` (measured: OpenAPI generation exists).

**Kept because:** these are **directly minable** by our build phase and reduce design guesswork; a documented
public API + CLI is a concrete integration surface for us.

---

## §6 — The single-tenant wall is already cracking: cloud / customer-success (PZ)

`doc/CUSTOMER-SUCCESS-INSPECTION.md` + `server/src/routes/customer-success.ts` describe a **Cloud inspection
broker**: authority and tenant-read endpoints **disabled unless explicitly enabled by env flag**
(`PAPERCLIP_CUSTOMER_SUCCESS_AUTHORITY_ENABLED`, `…_INSPECTION_ENABLED`), accepting **only a strict
instance/company-derived managed-run JWT**, and requiring **the agent's Ed25519 identity + an active running
heartbeat** (paused/finished agents rejected). A separate `cloud.ts` route and a "CloudAccessGate" surface
exist (batch 05 §, `CloudAccessGate.tsx`).

**Plain gloss:** even though Paperclip calls itself single-tenant self-host, it has begun building the
**hosted, multi-customer edge** — with strict flags and identity gates. This is the crack the owner's plan
("later we fix the hermes-per-tenant issue") will need to widen.

**Kept because:** it is the one place Paperclip itself walks toward multi-tenancy, so it is the most relevant
prior art for our hardest known problem — and its **fail-closed, env-gated, strict-JWT** posture is a good
model for how to add tenancy without weakening the base.

---

## §7 — Divergences found in this batch

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D1** | `SPEC.md:433` says "Single-tenant, self-hostable. Not a SaaS." | The tree ships **cloud routes, a CloudAccessGate, customer-success inspection broker, and a Tailscale HTTPS broker package** | **Divergence that is really a *direction*:** the base is single-tenant; cloud is being added at the edge behind flags. Recorded because the SPEC's flat claim understates where the product is actually going. |
| **D2** | `rules/README.md:9` says "Cursor does not automatically load it as `.cursor/rules/`" | Yet `.agents/`, `.claude/`, `.codex/`, `.devin/` all exist — multiple agents are supported | **Not a contradiction**: the caveat is that the `.mdc` files are a *repo convention* wired through `AGENTS.md` + Greptile, not a Cursor-native path. Recorded to avoid misreading the rule system as Cursor-only. |

---

## §8 — Carried forward

| ID | Carry | To |
|---|---|---|
| **C6-1** | **MCP access governance**: risk levels, **quarantine unexpected writes**, audit-preserving disable, endpoint-vs-gateway distinction. | mapping (Hermes bridge) |
| **C6-2** | **Observability**: OTel traces incl. **runner spans** + two-project Sentry + browser DSN. | PX-F, platform |
| **C6-3** | **The platform develops itself with agents**: scoped `.mdc` rules + `AGENTS.md` wiring + 31 first-party dev skills + verify/prloop skills; **any** coding agent supported (`.agents/.claude/.codex/.devin`). | all (process) |
| **C6-4** | **Evals ship in-tree** (`evals/promptfoo`) — converges with our own M3-AGT-02 eval gate. | P1, mapping |
| **C6-5** | **Minable corpus**: `DEVELOPING.md` (162 KB), documented REST API + OpenAPI, a real CLI, `SEARCH.md`. | build phase |
| **C6-6** | **The tenancy crack**: cloud routes + customer-success broker behind **fail-closed env flags** + strict managed-run JWT + Ed25519. | mapping (multi-tenant) |
| **C6-7** | **`company-creator` + `create-agent-adapter` skills** — the platform can be extended by an agent following a skill. | PZ, P1 |

---

## §9 — Value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a real user use case?**
Indirectly but powerfully: governance (MCP), observability, and evals are what let a user **trust** the
system when it misbehaves — they can see the trace, see why a write was denied, see that an agent passed its
eval. And the self-development machinery means the product **improves faster** than a hand-built one.

**Q2 — how does this serve an AI-first business & resources planner?**
The strongest PZ findings are process, not features: **(C6-3) a platform that builds itself with agents using
scoped rules and packaged skills** is the closest thing in the survey to *living our own vision*, and
**(C6-6) the fail-closed tenancy crack** is the most relevant prior art for the one problem we know we must
solve beyond Paperclip. **(C6-1) MCP governance** and **(C6-4) in-tree evals** are direct upgrades to
surfaces we already have (the Hermes bridge, the M3-AGT-02 gate).

---

*Batch 06 of 07 complete. Divergences: 2 (1 direction, 1 clarification). Carried: C6-1…C6-7.
Next: `07-SYNTHESIS.md` — the per-pole synthesis and what goes to the mapping step.*
