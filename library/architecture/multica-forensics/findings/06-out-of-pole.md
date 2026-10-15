# Batch 06 — Out-of-Pole (PZ)

**Study:** Multica `0.2.0` · **Batch:** 06 of 07 · **Status:** COMPLETE
**Source:** `github.com/multica-ai/multica` → `platforms/_extracted/multica-main`
**Zip md5:** `30ddc64af536212e25a6c00db5672b82` · **License:** Apache-2.0 + Multica conditions
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; code is the authority. Nothing in this file was inferred from a README.

---

## 0. What this batch had to answer

**PZ** is the escape hatch: *"any other findings you identify there that can fit our vision, project,
architecture, or a potential use case or added value for the end user."* This batch reads the parts of
Multica that serve none of the three poles directly — the security model, secrets, the plugin system, MCP,
channels, telemetry and documentation practice — and keeps what has a one-line reason.

Short answer, measured:

| Area | What is there | Where |
|---|---|---|
| **Security** | JWT + session + PAT + daemon-token caching; a middleware stack including CSP and per-plugin rate limits | F06-01 |
| **Secrets** | A regex redactor that scrubs agent output *before* it reaches the DB or the socket | F06-02 |
| **Plugins** | A versioned contract (Action/Hook/Resource) — after a **14-table V1 was built and deleted outright** | F06-03/04 |
| **MCP** | A remote-MCP client with OAuth, plus per-agent workspace MCP servers | F06-05 |
| **Channels** | 10 `channel_*` tables generalized from a Lark-specific integration, with a documented zero-downtime cutover | F06-06 |
| **Telemetry** | Self-host telemetry with an industry-standard opt-out, and a collector that never leaves first-party | F06-07 |
| **Docs** | 225 `.mdx` files = **45 pages × 5 languages**, plus repo conventions that bind agents | F06-08 |

---

## 1. The security model

`server/internal/auth/` and `server/internal/middleware/` are the perimeter.

**Auth** (`internal/auth/`) covers the credential kinds: `jwt.go`, `session.go`, `cookie.go`,
`cloud_pat.go` (a personal access token for the Cloud plane), plus two **caches** — `membership_cache.go`
and `pat_cache.go` — and `daemon_token_cache.go`. Caching membership and tokens is what makes the
workspace fence cheap enough to check on every request (batch 01/03).

**Middleware** (`internal/middleware/`) is an ordered stack: `auth.go`, `workspace.go`,
`daemon_auth.go`, `plugin_auth.go`, `ratelimit.go`, `plugin_ratelimit.go`, `csp.go`,
`session_renewal.go`, `client.go`, `cloudfront.go`, `owner_lookup.go`, `request_logger.go`.

Three of those are worth naming:

- **`csp.go`** — a Content-Security-Policy middleware, i.e. the browser-side half of the security model.
- **`plugin_ratelimit.go`** — plugin traffic is rate-limited **separately** from user traffic, so a badly
  behaved plugin cannot exhaust a person's budget.
- **`session_renewal.go`** — sessions renew through middleware rather than a login round-trip.

---

## 2. Secret redaction — a small package with a big job

`server/pkg/redact/redact.go` is one of the highest-value-per-line packages in the tree. Its purpose is
stated in its first line: *"detecting and masking secrets in agent output **before it reaches the database
or WebSocket broadcast**."*

It is an ordered list of regexes, first match wins per position, each with a named replacement. The
patterns cover AWS keys, PEM private keys, GitHub tokens (classic **and** fine-grained), OpenAI/Anthropic
`sk-` keys, Slack tokens (`xox*` and `xapp-`), and more.

**The design detail that matters** is in two of the comments, which record the exact bug each line
prevents:

> *"GitHub fine-grained personal access tokens use the `github_pat_` prefix, which the classic
> `ghp_`/`gho_`/… pattern above does not cover. **Without this line a fine-grained PAT emitted in agent
> output leaks unredacted** to the database and WebSocket broadcast."*
>
> *"Slack app-level tokens use the `xapp-` prefix, which the `xox*` rule above does not match. **Without
> this an app-level token echoed in agent output leaks** unredacted to the DB / WebSocket broadcast."*

**Plainly:** because an agent can print anything it read, every place a secret can appear needs its own
rule, and the file records *which leak* each rule closes. It runs on the **write path** — the redaction
happens before persistence, not at display.

---

## 3. Tenancy and entitlement

The tenant fence is a three-layer story already measured across this study — a storage key (batch 03:
`workspace_id` on 82/144 tables), a runtime credential (batch 01: the `mat_` task token), and a request
middleware (`workspace.go`, batch 01). This batch adds the **commercial** layer:

`server/internal/entitlement/README.md` documents a deliberately narrow boundary. It is *"the mechanical
Multica-side consumer of the private Cloud enforcement-policy endpoint. **Commercial inputs stay in
Cloud**: this package does not contain plan names, subscription-state mapping, limit values, or policy
switches."* And the self-host behaviour is explicit: *"An empty URL performs no HTTP request … **Self-hosted
deployments therefore retain the unlimited paths**."*

Its contract is versioned and monotonic: `schema_version` (only v1 accepted), `policy_revision` (the
effective-instruction generation), `subscription_version` (a monotonic revision — *"a response that moves
this revision backwards cannot replace a cached policy while it is still usable"*), and
`valid_for_seconds` (*"measured from local receipt time with Go's monotonic clock … capped at five
minutes"*).

**The finding:** the enforcement mechanism is **separated from the commercial policy**. The self-hosted
product has no licence logic in it at all — it simply has no URL to ask.

---

## 4. The plugin system — and the one that was deleted

### 4.1 The V1 that was built and thrown away

This is the sharpest retirement in the study, and it is not a column — it is **a whole subsystem**.
`344_plugin_v2_reset.up.sql` opens:

> *"The previous design shipped **14 tables, an append-only revision log per relationship, a
> capability-snapshot compiler, and a per-task execution manifest pinned by an INSERT trigger on
> `agent_task_queue`**. It never left its feature flag and holds no production data, so this migration
> **removes it outright** rather than migrating it forward."*

The migration then drops the triggers, the functions, the column, and **all 14 tables**
(`plugin_identity`, `plugin_release`, `plugin_contribution`, `plugin_installation`, `plugin_grant`,
`plugin_binding`, `plugin_artifact_file`, `plugin_capability_snapshot`,
`plugin_workspace_capability_state`, `plugin_execution_manifest`, `plugin_health`,
`plugin_installation_config`, `plugin_remote_mcp_secret`, `plugin_remote_mcp_oauth_state`).

**The replacement is three tables** (`344`): `plugin_installation` (one row per workspace+plugin, holding
the manifest snapshot the admin consented to), `plugin_storage` (plugin-owned key/value, two scopes —
workspace and per-member), and `plugin_secret` (encrypted, *"in their own table so no storage read path
can reach them by construction"*).

**Why this is the finding:** the V1 was not wrong, it was *premature* — it built append-only revision logs
and a snapshot compiler for a system that had not yet shipped a single real plugin. The reset is a
deliberate act of **deleting complexity that had not earned its place**, and it is recorded in a migration
so a reader can see what was removed and why.

### 4.2 The V2 contract

`server/pkg/plugincontract/` is the versioned public contract, and its header states the whole model in
three lines (`manifest.go:1-20`):

> *"A plugin relates to Multica in exactly three ways:*
> *- **Action** (plugin → Multica): host capabilities the plugin calls.*
> *- **Hook** (Multica → plugin): plugin capabilities the host calls.*
> *- **Resource** (no call at all): static contributions such as skill text."*

And the orthogonality rule: *"'Who triggers' and 'what capability is called' are orthogonal: a hook is
declared once and may be invoked by any of the triggers it opts into."*

The manifest is JSON (`multica.plugin.json`, bounded to 1 MB), and there is a **capability gate**
(`capabilities.go:8-40`) that is the interesting part:

> *"The manifest schema is defined in full from the first release so publishers never chase a moving
> contract, but the host lands the machinery one slice at a time. **Anything a manifest declares that is
> not listed here fails installation loudly — a silently ignored contribution would look installed and
> never fire.**"*

`HostCapabilities()` is the shipped set, with the off-entries explained in-line (e.g. `sidebar_panel`
stays off *"because it has no host location, and enabling a surface the host cannot render installs a
plugin that silently never appears, which is precisely what this gate prevents"*).

**A TypeScript SDK** (`packages/plugin-sdk/`) mirrors the contract for authors.

---

## 5. MCP — two directions

Multica both **consumes** and **serves** MCP:

- **Consuming** (`server/pkg/remotemcp/`): a remote-MCP client with `oauth.go`, `devorigin.go` and
  `types.go`. Migration `319_remote_mcp_plugin_v1` and `325_plugin_remote_mcp_oauth` add the storage; the
  OAuth state has an **expiry index** (`326`), and there is a **one-active-secret index** (`324`).
- **Serving, per agent** (`315_workspace_mcp_server.up.sql`): a workspace library of MCP servers plus an
  explicit per-agent binding, *"deliberately shaped like `skill` + `agent_skill`: **creating a server here
  gives it to NOBODY.** It reaches an agent only when someone adds it to that agent."* The migration adds
  the binding carries its own **on/off toggle**, and states the design intent: *"Nothing about this layer
  propagates implicitly — that is the whole point of the shape."*

**The finding:** the same non-inheriting shape is used twice (skills, MCP servers) — a workspace-level
library plus an explicit per-agent binding with a toggle. It is a **repeated pattern**, not a one-off.

---

## 6. Channels — and a documented zero-downtime cutover

`124_channel_generalization.up.sql` turns a Lark/Feishu-specific integration into platform-agnostic
`channel_*` tables (10 of them: `channel_installation`, `channel_chat_session_binding`,
`channel_inbound_message_dedup`, `channel_inbound_audit`, `channel_outbound_message`,
`channel_outbound_card_message`, `channel_binding_token`, `channel_user_binding`, `channel_task_delivery`,
`channel_media_pending_object`). Each `lark_*` table gains a `channel_type` discriminator and moves its
platform-specific identifiers into a JSONB `config` column; cross-platform columns stay flat. Existing
rows backfill with `channel_type='feishu'`.

**What makes this a PZ finding is the cutover section**, which states the operational reality that most
schema changes hide:

> *"a cutover has TWO independent invariants: (a) `channel_*` must exist BEFORE any new build serves the
> HTTP paths that touch it … or those paths 500. (b) the OLD (`lark_*`) hub and the NEW (`channel_*`) hub
> **must never run at once**: each would claim the same Feishu bot's WS lease on its own table and open a
> duplicate connection, **double-processing inbound events**."*

It then splits the two deployment shapes: **self-host** satisfies both automatically (migrate-before-serve
gives (a); single-replica `Recreate` gives (b), so *"a normal version upgrade is a clean cutover"*), while
**PRD's rolling deploy** needed a one-time **park-switch** to hold one hub dormant — and the migration
records that the switch *"has since been removed"* as history. It also states the honest limit: *"Rollback
to a pre-cutover build is not lossless once the new hub has written Feishu state into `channel_*`."*

**The finding:** a rename-with-backfill is treated as a **deployment problem with named invariants**, not
just a DDL statement — including the case where two versions of the code would corrupt data if they
overlapped.

---

## 7. Telemetry and observability

- **Self-host telemetry** (`internal/selfhosttelemetry/`) is a first-party-only collector. Its config
  (`config.go:1-30`) states: *"Endpoint selection is deliberately absent: self-host telemetry can only be
  sent to Multica's first-party collector compiled into the client."* The opt-out is the industry-standard
  **`DO_NOT_TRACK`** variable (*"Only `1` and `true` … disable telemetry"*), and the startup log makes the
  default-on behaviour observable *"without logging the raw environment value or any telemetry data."*
- **Metrics** (`internal/metrics/`) is a large surface — `business.go`, `business_events.go`,
  `channel_lease.go`, `channel_media.go`, `daemonws.go`, `db.go`, `db_routing.go`, `http.go`, `labels.go`,
  `pricing.go`, `realtime.go`, `wecom.go`. Batch 04 saw one consumer of it: the failure taxonomy's
  `AllReasons()` exists to **pre-warm the Prometheus `failure_reason` label set**.
- **Profiling** (`internal/profiling/server.go`) and **maintenance** (`internal/maintenance/`) round out
  the operational surface.

**The finding:** telemetry is **first-party and opt-out-able**, with the endpoint not even configurable —
a deliberate constraint, and the startup log is careful not to log the value it read.

---

## 8. Documentation practice

`apps/docs` is a Fumadocs site: **225 `.mdx` files = 45 pages × 5 languages** (English is the default
suffix; `zh`/`ja`/`ko`/`fr` are parallel files). The developer section includes `architecture.mdx`,
`contributing.mdx` and `conventions.mdx` — each in all five languages.

And the repository binds its own coding agents with written rules: `AGENTS.md` (127 lines, 12 sections)
covers scope, package boundaries, verification commands, state rules, API compatibility, database and
migration rules, UUID rules, desktop rules, UI copy, UI rules and testing. Its own instruction is to keep
it current: *"Update instructions in the same change that alters the referenced workflow or boundary; do
not add incident timelines, dependency version lists, or duplicate rules."*

**The finding:** the conventions are not in a wiki — they are **in the repo, versioned with the code, and
addressed to the agents that write it** (this study's method itself came from the same posture).

---

## 9. The retirement ledger (rule 10)

| Migration | What was removed | Why |
|---|---|---|
| **`344_plugin_v2_reset`** | **the entire Plugin V1 — 14 tables, per-relationship append-only revision logs, a capability-snapshot compiler, a per-task manifest trigger** | *"It never left its feature flag and holds no production data"* — deleted rather than migrated |
| `302` / `303` | redundant channel / lark binding indexes | duplicates removed |
| `312` | the global `plugin_identity_key` index | superseded by the workspace-scoped key (`311`) |
| `382` | DingTalk group bindings that pointed at a non-default agent | *"A channel chat session is permanently owned by the agent recorded on its `chat_session` row"* — the next `@bot` message starts a fresh session |
| `124` (note) | the `MULTICA_LARK_HUB_DISABLED` park-switch | the cutover finished; *"this note is kept as history"* |

**The two lessons this batch adds:** (1) a subsystem can be **deleted**, not migrated, when it never
shipped — and recording that is the honest thing; (2) a **removed operational switch** belongs in the
migration as history, so a reader knows the multi-replica path once needed it.

---

## 10. Findings

Tagged **PZ** (this batch's whole subject); answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**,
each with a one-line reason for keeping it.

| # | Finding | Q1 · User value | Q2 · Vision value |
|---|---|---|---|
| **F06-01** | **A layered security perimeter** — credential kinds with caches, and an ordered middleware stack (CSP, separate plugin rate limits, session renewal). | A session stays safe and cheap to check on every request. | A reusable perimeter, with plugin traffic bounded away from user traffic. |
| **F06-02** | **Write-path secret redaction** — ordered regex rules, each comment naming the exact leak it closes; scrubbed before the DB and the socket. | An agent cannot leak a key into the record or the live feed. | A safety primitive that runs at the boundary, not at display. |
| **F06-03** | **A plugin contract of three relations** (Action/Hook/Resource) with triggers orthogonal to capabilities, versioned from release one. | Plugins extend the product without the contract moving under authors. | A stable extension seam. |
| **F06-04** | **The capability gate** — anything a manifest declares that the host cannot run **fails installation loudly**. | An install either works or says why. | No "looks installed, never fires" state. |
| **F06-05** | **The non-inheriting binding pattern, used twice** (skills, MCP servers) — a workspace library + an explicit per-agent binding with a toggle. | Adding a shared resource gives it to nobody until you assign it. | Least-privilege by construction, applied consistently. |
| **F06-06** | **A cutover as a deployment problem** — two named invariants, a self-host vs rolling-deploy split, and the honest rollback limit. | An upgrade does not double-process or 500. | Migrations are treated as operations, not just DDL. |
| **F06-07** | **First-party, opt-out telemetry** (`DO_NOT_TRACK`), with the endpoint not configurable and the value never logged. | Self-hosters can turn it off and trust what is collected. | Privacy as a default with a standard switch. |
| **F06-08** | **Conventions in the repo, addressed to the agents** (`AGENTS.md`, 127 lines / 12 sections; `conventions.mdx` in 5 languages). | (indirect) — the product's rules are readable. | Rules that ship with the code and bind human and agent alike. |
| **F06-09** | **Enforcement separated from commercial policy** (`entitlement` holds no plan names; self-host = unlimited). | A self-hosted install is not crippled by licence logic. | The commercial layer is a boundary, not a dependency. |
| **F06-10** | **The deleted subsystem** (`344`) — 14 tables removed outright, with the reason recorded. | (indirect) — less machinery to trust. | Complexity must earn its place; deleting it is a first-class act. |

---

## 11. Divergences and honest bounds

- **No doc-vs-code divergence was needed**; the migration headers and package comments carry the design
  record, as in every prior batch.
- **Bound:** this batch **sampled** the PZ surface — it read the security perimeter's shape, the redactor,
  the plugin system and its reset, MCP in both directions, the channel cutover, telemetry and docs. It did
  **not** read every metrics file or the integration clients (Composio, Slack, Lark, DingTalk) line by
  line. Those are named, not claimed.
- **Bound:** the plugin V2 is **new** (it replaced V1 in the same migration). Its runtime is a thin slice;
  the finding is the *contract and the gate*, not a claim that the plugin system is mature.
- **Bound (stated plainly):** `entitlement`'s README is a **doc**, and this batch's claim about it is
  therefore a claim about the package's stated contract plus its config shape — the Cloud endpoint is not
  in this tree.

---

## 12. Carried forward to batch 07 (the synthesis)

Four candidates for the highest transferable value, to be ranked in batch 07:

1. **Write-path secret redaction (F06-02)** — small, cheap, and each rule records the leak it closes.
2. **The plugin contract + capability gate (F06-03/04)** — three relations, and a loud failure for
   anything the host cannot run.
3. **The non-inheriting binding pattern (F06-05)** — used twice, so it is a convention rather than an
   accident.
4. **The deleted subsystem (F06-10)** — the willingness to remove 14 tables that never shipped, recorded
   in a migration.

All are **observations**, not decisions. The cross-platform mapping is batch 07's job (rule 5).

---

*Batch 06 of 07. Read from source on 2026-10-15. Next: `findings/07-SYNTHESIS.md`.*
