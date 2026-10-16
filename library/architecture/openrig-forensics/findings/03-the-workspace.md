# OpenRig Study — Batch 03: the workspace (P2)

**Folder:** `library/architecture/openrig-forensics/` · **Batch 03 of 08** · **Status:** OPEN
**Pole:** **P2 — the workspace** (the container a person operates in: versatile, integratable,
compatible with a mix of current and future features)
**What this batch answers:** what the *container* is in OpenRig — what a rig is made of, how
topology is declared and enforced, what a project is, where state lives, and **whether there is
a tenant at all.**

**Rule 5 reminder:** no comparison to our own platform appears in this batch.

**Rule 1 reminder:** every claim was read from source; divergences are in §7.

---

## 1. The one-sentence shape

**An OpenRig workspace is a *rig* — a SQLite row holding a topology of `nodes` joined by typed
`edges`, declared in YAML, scoped to a *workspace* (a root plus named repos), driven by a
durable *queue*, and reachable only over loopback or a Tailscale tailnet. There is no tenant
column anywhere: the boundary is the process and the network, not a row.**

The eight ideas in this batch, each read from code:

| Idea | Owner | § |
|---|---|---|
| the rig = container | `db/migrations/001_core_schema.ts` | 2 |
| topology = nodes + typed edges | `rigspec-schema.ts` | 3 |
| the workspace primitive | migrations `038`, `039`; `domain/workspace/**` | 4 |
| the queue = durable work | migrations `024`, `025`, … | 5 |
| state = one SQLite file | `$OPENRIG_HOME/openrig.sqlite` | 6 |
| **the tenancy answer** | `middleware/auth-bearer-token.ts` | 7 |
| the missions/slices tree | `domain/slices/**` | 4.3 |

---

## 2. The core schema — a rig is three tables

`001_core_schema.ts` is the whole container, and it is **short enough to quote in full**:

```sql
-- rigs: top-level topology container
CREATE TABLE rigs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- nodes: logical identity within a rig
-- id = opaque DB primary key (ulid). All FKs reference this.
-- logical_id = logical name from rig spec (e.g. "orchestrator"). Human-facing.
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  logical_id TEXT NOT NULL, role TEXT, runtime TEXT, model TEXT, cwd TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(rig_id, logical_id)
);

-- edges: relationships between nodes
CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  rig_id TEXT NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Two design facts worth naming:**

1. **A node has two identities** — `id` (*"opaque DB primary key (ulid), all FKs reference
   this"*) and `logical_id` (*"the logical name from the rig spec, human-facing"*), with
   `UNIQUE(rig_id, logical_id)`. **This is the seat's identity≠process idea at the schema
   level**: the human-facing name is stable inside a rig; the row id is what FKs bind to.
2. **Edge integrity is enforced by a trigger, not a CHECK** — because SQLite cannot
   cross-reference tables:

   ```sql
   CREATE TRIGGER edge_same_rig_insert
   BEFORE INSERT ON edges BEGIN
     SELECT RAISE(ABORT, 'edge source and target must belong to the same rig')
     WHERE (SELECT rig_id FROM nodes WHERE id = NEW.source_id)
        != (SELECT rig_id FROM nodes WHERE id = NEW.target_id);
     SELECT RAISE(ABORT, 'edge rig_id must match source node rig_id')
     WHERE NEW.rig_id != (SELECT rig_id FROM nodes WHERE id = NEW.source_id);
   END;
   ```

   **A rig cannot contain a cross-rig edge.** The invariant is enforced at the storage layer
   with a **named abort message**, not left to application code. *(P2.)*

> **Named mechanism (rule 6): *schema-level edge integrity via a BEFORE INSERT trigger*.** The
> comment even explains *why* it is a trigger (*"SQLite CHECK cannot cross-reference tables"*).

---

## 3. The topology — RigSpec, validated strictly

`rigspec-schema.ts` is **1,340 lines** and the validation is unusually strict. Measured
vocabulary:

**5 edge kinds** (`VALID_EDGE_KINDS`): `delegates_to · spawned_by · can_observe ·
collaborates_with · escalates_to`. The set is **exported** so that a converge operation
validates against *"the SAME canonical set as a rigspec pod-local edge (no second, looser edge
input path)"* — one source of truth for what an edge may be. *(P2.)*

**Three levels of keys, each an allow-list** — `RIG_KEYS`, `POD_KEYS`, `MEMBER_KEYS` — and
`rejectUnknownTopologyKeys()` **refuses an unknown structural key** rather than ignoring it:

> *"OPR.0.5.8.7 — the topology normalizer is an explicit literal. Reject an unknown structural
> key before that literal can make accepted input vanish. This stays deliberately small: one
> check over the four topology object levels, **not a second schema framework**."*

**Other measured enums** (each a `Set`, so a typo is a validation error not a silent default):

| Constant | Values |
|---|---|
| `VALID_SYNC_TRIGGERS` | `pre_compaction · pre_shutdown · manual · milestone` |
| `VALID_RESTORE_POLICIES` | `resume_if_possible · relaunch_fresh · checkpoint_only` |
| `VALID_SERVICES_KIND` | `compose` |
| `VALID_DOWN_POLICIES` | `leave_running · down · down_and_volumes` |
| `VALID_WAIT_TARGET_CONDITIONS` | `healthy` |
| `VALID_IMPORT_PREFIXES` | `local: · path:` |

**And a capability registry with a self-destruct clause** — `SPEC_VALIDATION_CAPABILITIES`, whose
comment is one of the sharpest in the tree:

> *"a validation feature that other code must react to REGISTERS itself here, and consumers gate
> on the capability. Current contract: the spec-validation ADVISORY, when it lands model-pin
> canonicalization, MUST add `"model-pin-canonicalization"` — **that single line mechanically
> kills the claude alias migration bridge at runtime AND turns its pin test red until the bridge
> constant is deleted**."*

> **Named mechanism: a capability set that is also a self-destruct instruction.** When the
> follow-up feature lands, adding one string *mechanically* forces the temporary bridge to be
> deleted (its test goes red). **The codebase schedules its own cleanups as a data change.**
> *(PZ — a mechanism of real interest, carried to batch 06.)*

### 3.1 The shipped rigs, measured

`packages/daemon/specs/rigs/` holds two families: `launch/` (the real teams — `starter`,
`factory`, `kernel`, `secrets-manager`) and `focused/` (specialists — `code-review`, `pm`,
`research`). The `starter` rig (verbatim):

```yaml
version: "0.2"
name: starter
summary: >
  A Claude Code builder and a Codex reviewer in your repository…
culture_file: CULTURE.md
pods:
  - id: dev
    label: Project
    members:
      - id: build
        agent_ref: "local:../../../agents/development/implementer"
        runtime: claude-code
        profile: default
        cwd: "."
        startup: { files: [ { path: guidance/lead-first-move.md,
                              delivery_hint: send_text, required: true } ] }
      - id: review
        agent_ref: "local:../../../agents/development/qa"
        runtime: codex
        model: gpt-6-astra
        profile: default
        cwd: "."
    edges: [ { kind: delegates_to, from: build, to: review } ]
edges: []
```

**A rig is `pods → members → edges`, and an edge is always `kind + from + to`.** The `factory`
rig is the same shape at seven seats, with 11 `delegates_to` edges from `orch.lead` to each
member and from each reviewer back to build/design/qa — **the topology is a declared graph,
not a convention.** *(P2.)*

---

## 4. The workspace primitive — where the work lives

A rig may declare **`workspace`** — *"the typed declaration that lets a rig name where its work
lives"* (`docs/as-built/architecture/workspace-primitive.md`, 606 lines, verified against
`e8f0ab34…`). It carries `workspaceRoot`, named `repos[]` with **kinds**, an optional
`defaultRepo`, and an optional `knowledgeRoot`.

**Persistence is two columns, added by two migrations** (deliberately split so a test can apply
one half without the other):

| Migration | Change | Why split |
|---|---|---|
| **`038_workspace_primitive`** | `rigs.workspace_json TEXT` | the rig's typed workspace block as JSON |
| **`039_queue_target_repo`** | `queue_items.target_repo TEXT` + index | *"so test fixtures that exercise rigs without queue_items (and vice versa) can apply only the half they need"* |

**`target_repo` is the per-item repo scope**, *"validated at the route layer against the source
rig's `RigSpec.workspace.repos[]`"*. So **a queue item can name which repo it is for**, and that
name is validated against the rig's declared repos. *(P2.)*

### 4.1 The missions/slices tree

Alongside the typed workspace, *"a **file-backed missions/slices tree** is indexed **read-only**
and projected into the Project UI's mission / slice surfaces"* (`workspace-primitive.md`).
Three concepts, measured from the file names: **mission → project → slice** (`domain/slices/`:
`slice-indexer.ts`, `slice-detail-projector.ts`; `routes/missions.ts`). The tree is
**file-backed and indexed read-only** — the files are the truth, the DB holds a projection.
*(P2 — "altitudes": mission, slice.)*

### 4.2 What a "project" is

`project-catalog-surface.ts` / `domain/project-*` back the **Project** view. Per the
CHANGELOG section read in the pin, *"Queue folds into Story"* and the *"Project tab"* renamed
**Topology → Workflow** with a **stable test-id** (`project-tab-topology`) — so a shipped UI
label can change while an automation's handle stays put. *(P2/PX-F.)*

---

## 5. The queue — durable owned work

The queue is the workspace's **work ledger**, and it is P3's core (batch 04), read here only
for its P2 shape. `024_queue_items.ts`:

- **`queue_items`** with **8-state** validation (`pending | in-progress | done | blocked |
  failed | denied | canceled | handed-off`) and a **closure-reason enum** required on `done`
  (`handed_off_to | blocked_on | denied | canceled | no-follow-on | escalation`) — the comment
  calls it **"hot-potato strict-rejection"**: *a unit of work cannot be closed without saying
  where it went.*
- Columns for the baton: `handed_off_to`, `handed_off_from`, `chain_of_record`, `claimed_at`,
  `last_heartbeat`, `last_nudge_attempt`, `last_nudge_result`, `closure_required_at`,
  `expires_at`, `resolution`.
- **Nine queue migrations** in total (`024`, `025` transitions, `039` target_repo, `044`
  summary, `048` evidence_ref, `054` transitions_archive, `073` transition_wakes, `098`
  transition order, `099` recovery_tags) — **the queue is the most-evolved table in the
  schema.**

> **The queue's own comment states its authority:** *"Live runtime state is SQLite-canonical;
> markdown queue mirrors are read-only debug/export only."* **One truth, and the file copy
> cannot be it.** *(P2 — a rule worth carrying.)*

---

## 6. State, and the two ways to reach it

**State is one SQLite file** at `$OPENRIG_HOME/openrig.sqlite` (default `~/.openrig`), opened
**WAL mode with foreign keys on** (`startup.ts` → `db/connection.ts`). **105 migrations** build
it. There is no server database, no per-tenant schema, no row-level security.

**Reachability is decided at startup** by `assertBindAuthInvariant()` (`middleware/auth-bearer-token.ts`):

| Bind | Behaviour |
|---|---|
| loopback (`127.x`, `::1`, `localhost`) | no bearer required — *"short-circuit"* |
| **Tailscale** (CGNAT `100.64.0.0/10`, ULA `fd7a:115c:a1e0::/48`) | no bearer required — **"the tailnet is the auth boundary"** |
| anything else (LAN, `0.0.0.0`, `::`, public IP/hostname) | **the daemon REFUSES TO START unless a bearer token is set** |

The hostname path **resolves via DNS (5-second timeout)** and re-checks the resolved IP. A
`0.0.0.0` default is treated as **non-loopback for safety** — *"force operator to either bind
explicitly to 127.0.0.1 or set the bearer token."* *(P2 — a fail-closed startup invariant.)*

---

## 7. The tenancy answer — measured, and it is "none"

The pin (§7 of batch 00) predicted no tenant column. **The code confirms it in its own words.**
The header of `auth-bearer-token.ts` states the model exactly:

> *"**MVP context (single-developer, single-user, single-host): one static bearer token sourced
> from a config field. NO OAuth / SSO / per-user routing / role-based permissions / token
> rotation. Token holder is fully privileged.**"*

**Measured checks:**

| Check | Result |
|---|---|
| `tenant_id` / `tenantId` in `packages/daemon/src/**` | **0 hits** |
| `workspace_id` in migrations | **1 hit**, in `108_pi_usage_charges.ts` — a **Pi usage** table, not tenancy |
| a per-user / per-org column on `rigs` / `nodes` | **none** — `rigs(id, name, created_at, updated_at)` |
| auth model | **one static bearer token**, `timingSafeEqual`; **no roles, no per-user routing** |

> ★★★ **OPENRIG IS THE FIRST PLATFORM IN THIS STUDY WITH NO TENANCY CONCEPT AT ALL.**
> For comparison across the seven prior studies: Multica carried `workspace_id` on **82
> tables**; n8n had `Project personal|team` with **10 roles + 206 scopes**; buzz resolved a
> **community** from the request host and *proved* the isolation with TLA+/Tamarin. **OpenRig's
> boundary is the machine and the network**: one daemon, one SQLite file, loopback or tailnet,
> one token whose holder is fully privileged. *(P2 — the batch's headline.)*

**Why this is coherent, not a gap.** The product is *"a local control plane"* / *"a serious
local cockpit, not a cloud marketing product"* (`docs/DESIGN.md`). A **rig is a personal or
team-local asset**; sharing happens by **exporting a bundle** (`RigBundle`, SHA-256 integrity),
not by hosting many teams in one daemon. **There is nothing to isolate because there is no
second party inside the process.** *(Observation only; the mapping decision is the owner's.)*

### 7.1 The one place sharing *is* modelled: the bundle

`RigBundle` (`README.md:343`) is *"a portable archive with vendored AgentSpecs and **SHA-256
integrity**"*; `rig bundle check` validates a folder before you share it; `rig bundle inspect`
*"shows what a bundle will do before you install it"*; installs are recorded in
`$OPENRIG_HOME/bundle-audit.jsonl`. **Sharing is a signed artefact with an audit trail**, not a
tenancy row. *(P2/PZ.)*

---

## 8. Divergences (rule 1)

| # | Claim | Reality | Verdict |
|---|---|---|---|
| **D3-1** | The `starter` rig's builder carries `startup.files: guidance/lead-first-move.md` | **verified**: the file exists at `specs/rigs/launch/starter/guidance/lead-first-move.md` — **rig-local**, resolved relative to the **rig spec**, not the agent. `resolveAuthoredCwd` (`cwd-resolution.ts:21`) + the 7-layer `resolveStartup` own the resolution | **HOLDS** (§F3-3b) |
| **D3-2** | `docs/DESIGN.md` says the web UI is *"in maintenance mode"* | confirmed — `packages/ui` still builds and ships but gets *"no new feature work"*; the **TUI and CLI are the supported surfaces** (`ARCHITECTURE.md:26`) | **HOLDS** (a doc that tells you not to rely on the UI) |
| **D3-3** | batch 00 hypothesis: *no tenant column* | **confirmed**: 0 `tenant_id`; auth is one static bearer token; §7 | **HYPOTHESIS CONFIRMED** |
| **D3-4** | `workspace-primitive.md` attributes the primitive to **0.3.0** and explicitly says *"do not back-attribute it to 0.3.1"* | the module itself carries the correction — a **self-correcting attribution** rather than a silent drift | **HOLDS** (and exemplary — see F3-8) |

---

## 9. Findings (batch 03)

**F3-1.** ★ **A rig is three tables — `rigs` → `nodes` → `edges` — and a node has two
identities** (`id` for FKs, `logical_id` human-facing, `UNIQUE(rig_id, logical_id)`). The
seat's identity≠process idea is **enforced at the schema**. *(P2.)*

**F3-2.** ★ **A rig cannot contain a cross-rig edge, and a BEFORE INSERT trigger enforces it**
with a named abort message — because *"SQLite CHECK cannot cross-reference tables."* The
invariant lives at the storage layer, not in application code. *(P2.)*

**F3-3.** **Topology is validated strictly: 5 edge kinds, three allow-lists of keys, and an
unknown structural key is REJECTED** — *"not a second schema framework"*, a deliberate
single-small-check design. *(P2.)*

**F3-3b.** ★ **Startup is assembled in a fixed 7-layer additive order** (`resolveStartup`):
agent base → profile → **rig culture file** (as a synthetic startup file) → rig startup →
pod shared → member → *"operator debug append (always last)"*. **Files and actions are
concatenated with NO deduplication** — the comment delegates it: *"adapters handle replay
tolerance per the startup contract."* So *where* a seat's context comes from is a **declared,
ordered stack**, and an optional culture file is **a layer in that stack**, not a separate
mechanism. *(P2/P1.)*

**F3-4.** ★ **A capability set doubles as a self-destruct instruction**
(`SPEC_VALIDATION_CAPABILITIES`): adding one string when a feature lands *"mechanically kills
the bridge at runtime AND turns its pin test red until the bridge constant is deleted."*
**The codebase schedules its own cleanup as a data change.** *(PZ — top-tier.)*

**F3-5.** **The workspace is a typed declaration, persisted as one JSON column, with a
deliberately split companion column** (`rigs.workspace_json` + `queue_items.target_repo`,
*"so test fixtures … can apply only the half they need"*). **A migration split for test
independence** is a small, honest craft detail. *(P2.)*

**F3-6.** **The mission/project/slice tree is file-backed and indexed read-only** — the files
are the truth, the DB holds a projection. Same rule as the queue (*"SQLite-canonical; markdown
mirrors are read-only"*) applied in the opposite direction: **each surface names which side is
authoritative.** *(P2.)*

**F3-7.** **The queue is the most-evolved table in the schema**: 8 states, a required closure
reason (hot-potato), the baton columns, and **nine migrations** — the workspace's work ledger is
where the platform's real complexity lives. *(P2 — hands to batch 04.)*

**F3-8.** ★ **`workspace-primitive.md` corrects a future reader pre-emptively**: *"The workspace
primitive … is a 0.3.0 feature — do not back-attribute it to 0.3.1."* **A doc that anticipates
its own most likely misreading and forbids it.** *(PZ — let it be a candidate for the mapping
step's documentation conventions.)*

**F3-9.** ★★★ **OpenRig has NO tenancy concept.** 0 `tenant_id`; one static bearer token whose
*"token holder is fully privileged"*; no roles, no per-user routing. **The boundary is the
machine and the network** — loopback, or a Tailscale tailnet where *"the tailnet is the auth
boundary."* **First platform in the study with no tenant at all.** *(P2 — headline.)*

**F3-10.** **The bind/auth invariant is fail-closed at startup**: loopback and tailnet
short-circuit; **anything else REFUSES to start without a bearer token**, and `0.0.0.0` is
treated as non-loopback *"for safety"*. *(P2.)*

**F3-11.** **Sharing is a signed, inspectable artefact, not a hosted tenant**: `RigBundle`
(SHA-256), `bundle check` (validate before sharing), `bundle inspect` (what will it do),
`bundle-audit.jsonl` (an install audit trail). *(P2/PZ.)*

**F3-12.** **The data model is legible enough to quote in full.** `001_core_schema.ts` is ~60
lines and carries the *why* for each structural choice in comments. **A container whose
foundation a newcomer can read in one sitting.** *(P2 — a quality, not a mechanism, but a
real one.)*

---

## 10. Plain-English summary of batch 03

The OpenRig **workspace is a *rig*** — and a rig is three small tables: `rigs`, `nodes` and
`edges`. A node has a human-facing name and a stable row id; an edge is `kind + from + to`, from
a fixed set of five kinds; and a **database trigger** makes it impossible to draw an edge
between two different rigs. The topology is declared in YAML, validated strictly (unknown keys
are **rejected**, not ignored), and the shipped teams (`starter`, `factory`, `code-review`, …)
are just YAML files the user could have written.

Work lives in a **durable queue** with eight states and a rule that **you cannot close a task
without saying where it went** — and the queue is the most-evolved table in the schema. Alongside
it, a **file-backed mission/project/slice tree** is indexed read-only into the Project UI. The
rig can declare a **typed workspace** (a root, named repos, a default repo, a knowledge root),
persisted as one JSON column, and a queue item can name which repo it targets.

Two things define this pole. First, **the container is legible**: the whole foundation is ~60
lines of SQL a person can read in one sitting. Second — and this is the batch's headline —
**there is no tenant.** Measured: zero `tenant_id`, one static bearer token whose holder is
*"fully privileged"*, no roles, no per-user routing; the only boundary is the machine and the
network (loopback, or a Tailscale tailnet). Every other platform in this study modelled a
tenant somehow; **OpenRig models a *rig*.** Sharing is a **signed, inspectable bundle**, not a
hosted row. That is a coherent choice for *"a serious local cockpit"* — and it is the single
most important fact about this platform for the mapping step.

**Next: batch 04 — automations (P3).** The queue as the at-least-once baton, message delivery,
the watchdog, continuity and restore.

---

*Batch 03 of 08 — the workspace (P2). All claims read from source at `0.6.10`. 4 divergences
(3 holds, 1 hypothesis-confirmed); 13 findings (F3-1..F3-12 + F3-3b).*
