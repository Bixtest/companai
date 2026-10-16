# OpenRig Study — Batch 01: the platform overview

**Folder:** `library/architecture/openrig-forensics/` · **Batch 01 of 08** · **Status:** OPEN
**What this batch answers:** *What IS OpenRig* — the shape of the monorepo, the daemon at its
centre, the four client surfaces, the runtime-adapter boundary, the documentation system, and
the tenancy question underneath. It is the **map**; batches 02–06 drill into one pole each.

**Rule 5 reminder:** no comparison to our own platform appears in this batch. Cross-platform
notes are **observations** carried only where an earlier *study* (not our product) is named.

**Rule 1 reminder:** every load-bearing claim below was read from the source at the time of
writing, and **the doc-vs-code divergences are recorded in §5**. The code wins in each case.

---

## 1. What was read, and its measured size

| Source | Size | What it gave |
|---|---:|---|
| `README.md` | **476 lines / 33.5 KB** | the product framing, the three teams (`starter`/`workshop`/`factory`), the "what OpenRig changes on your machine" ledger, requirements |
| `ARCHITECTURE.md` | **334 lines / 17 KB** | the authoritative shape — packages, request path, key counts, contributor recipes — *"this map is not the territory"*, pinned to `c750304f` (0.6.6) |
| `CHANGELOG.md` | **4,132 lines** | agent-readable release history back to `0.5.0`; **declares the version `0.6.10`** |
| `ROADMAP.md` | **49 lines** | what the maintainers welcome help with (a **"help wanted"** list, not a schedule) |
| `docs/DESIGN.md` | **358 lines** | the visual system — *"an operator's tactical dossier"*; describes the UI **in maintenance mode** |
| `docs/as-built/` | **24 files** (10 + 14 in `architecture/`) | a **structured, frontmattered, machine-navigable** module description of the whole system |
| `docs/reference/` | (of 141 under `docs/`) | user + operator reference; **ships inside the npm package** |
| `skills/_canonical/` | 18 category dirs under `_canonical/core/` | shipped agent skills (the "canonical edge") |

**One line:** OpenRig is a **local daemon + CLI + terminal UI + MCP server** that runs a team
of **unmodified Claude Code and Codex sessions** (plus Pi/OMP/terminal/stub) inside tmux, and
adds the coordination around them — launching, restoring, messaging, a durable queue, and
per-seat skills and context.

---

## 2. The monorepo, measured

### 2.1 The package map (and the one that ships)

| Package | `@scope` | `.ts`/`.tsx` files | Lines | Ships to npm? | Role |
|---|---|---:|---:|---|---|
| `packages/daemon` | `@openrig/daemon` | 1,748 | 40,441 | **private** → copied into the CLI | HTTP routes, domain services, SQLite, adapters, specs, skills, plugins |
| `packages/cli` | `@openrig/cli` | 468 | 39,451 | **YES — the only published package** | the `rig` command, the **MCP server**, daemon start/stop |
| `packages/ui` | `@openrig/ui` | 523 | 43,030 | **private**, maintenance mode → copied into the CLI | the **React 19** web UI |
| `packages/tui` | `@openrig/tui` | 185 | 29,473 | **private** → copied into the CLI | the terminal UI |
| `packages/test-system` | *(none)* | 0 | 0 | **not shipped** | the stub-agent scenario library + CI harness |

> **The packaging pattern that defines this platform.** `packages/cli/package.json` is the only
> entry in the npm registry; `scripts/build-package.sh` **assembles four packages into it** at
> publish time. Measured: the CLI package's published file list includes `dist`, `daemon`,
> `ui`, `tui` and `scripts` (`README`-adjacent fact, `ARCHITECTURE.md:29`). **A user runs one
> `npm install -g @openrig/cli` and receives a daemon, a TUI and a web UI they never see as
> separate packages.**

### 2.2 The layering, and the request path

From `ARCHITECTURE.md:44-59`, and the shape is worth stating plainly because it is **the same
in every client**:

```
  rig (CLI)            TUI            MCP server (rig mcp serve, stdio)
       \                |                /
        +---- HTTP to the daemon (port 7433) ----------+
                        |                              |
  server.ts   createApp(): context middleware, /healthz, app.route("/api/…")
                        |
  routes/     69 files, 65 Hono routers, 69 app.route() mounts
                        |
  domain/     317 files — services, repositories, orchestrators, event bus
              /                 |                  \
     SQLite (db/)       tmux (adapters/tmux.ts)    runtime adapters (*-adapter.ts)
```

- **All three clients are HTTP clients of one daemon.** The CLI and the MCP server share a
  single `DaemonClient` (`packages/cli/src/client.ts`) — the MCP server is **the same client,
  exposed as tools** (`createMcpServer(client)`). This is why the CLI and MCP surfaces cannot
  drift: they are one code path.
- **State** lives in `$OPENRIG_HOME` (default `~/.openrig`), DB `openrig.sqlite`.
- **Live updates** are **SSE**: `routes/events.ts` uses Hono's `streamSSE`; the TUI subscribes
  to `/api/activity/events`.

### 2.3 The daemon's internal shape — the `*-surface.ts` convention

`packages/daemon/src/` has a distinctive naming rule: **21 `*-surface.ts` files** sit at the
top level (`attention-surface.ts`, `bundle-identity-surface.ts`, `stream-classifier-surface.ts`,
…). Per `ARCHITECTURE.md:36-42`, these are **the shared API between the daemon and its
sibling packages**: the CLI and TUI import daemon code **only through the `exports` field of
`packages/daemon/package.json`**, and each export points at a `*-surface.ts` file. Measured:
**22 exports** (22 subpaths, 21 `*-surface.ts` files — the 22nd is `./daemon-shutdown`, which
points at `daemon-shutdown.ts`, not a `-surface` file). A build script
(`rewrite-daemon-imports.mjs`) **fails the build on a subpath that has no `exports` entry.**

> **★ A boundary enforced by the build, not by convention.** The daemon has **one narrow,
> enumerated door** to its siblings: 22 names. Everything else is private. This is the
> platform's own answer to "how do you keep a monorepo from becoming a mudball" — and it is
> the first platform in this study with a **build-time-enforced cross-package boundary**.

### 2.4 The runtime-adapter boundary (the P1 seam)

`packages/daemon/src/adapters/` holds **35 files**; six implement `RuntimeAdapter`
(`runtime`, `listInstalled`, `project`, `deliverStartup`, `launchHarness`, `checkReady`):

| Adapter | File | Note |
|---|---|---|
| `claude-code` | `claude-code-adapter.ts` | the primary harness |
| `codex` | `codex-runtime-adapter.ts` | the second harness |
| `pi` | `pi-runtime-adapter.ts` | via an RPC runner (`pi-runner.ts`) |
| `omp` | `omp-runtime-adapter.ts` | **`OmpRuntimeAdapter` extends `PiRuntimeAdapter`** — hence "6 adapters, 5 command counts" |
| `terminal` | `terminal-adapter.ts` | a plain shell seat |
| `stub` | `stub-runtime-adapter.ts` | the scripted test double |

**The README says the agents are unmodified** — OpenRig adds coordination, not agent code
(`ARCHITECTURE.md:15`). This adapter interface is **where P1 (the aissistant) lives in this
platform**, and batch 02 reads it properly.

### 2.5 The client surface, in numbers

| Surface | Measure | Value |
|---|---|---:|
| **CLI** | top-level `program.addCommand(...)` registrations | **87** |
| CLI | files under `commands/` | 93 (some are helpers, not commands) |
| **MCP** | `server.tool(...)` tools | **18** |
| **HTTP** | route files / Hono routers / `app.route` mounts | **69 / 65 / 69** |
| **TUI** | top-level `.ts` modules under `tui/src/` | **28** (+ subdirs) |
| **DB** | migrations | **105** files (001–109; missing 093, 100, 102, 106) |
| **Specs** | scenario YAMLs declaring `scenario:` | **16** |
| **Daemon API** | `exports` subpaths | **22** |

**The 87 commands group into recognisable families**: lifecycle (`up`, `down`, `restore`,
`snapshot`, `archive`), inspection (`ps`, `roster`, `status`, `watchdog`), coordination
(`send`, `stream`, `queue`, `chatroom`), topology evolution (`grow`, `shrink`, `launch`,
`remove`), tooling (`bundle`, `mcp`, `tui`, `ui`, `agent`, `transcript`, `slack`,
`terminal`, `project`, `workflow`, `view`), and machine prep (`setup`, `doctor`,
`requirements`, `bootstrap`). *(`grow`/`shrink`/`launch`/`remove` are sub-verbs; the
first-class list is the 87 above.)*

---

## 3. The four teams, and what "a rig" is

**OpenRig ships three teams plus specialists, and they grow in size** (`README.md:277-292`):

| Team | Talk to | Composition |
|---|---|---|
| `starter` | `dev-build@starter` | a Claude Code **builder** + a Codex **reviewer** — one bounded change |
| `workshop` | `orch-lead@workshop` | lead, builder, QA, reviewer — ongoing work in one repo |
| `factory` | `orch-lead@factory` | **seven**: lead, advisor, build, QA, design, two independent reviewers |
| *(specialists)* | | `code-review` (2 independent reviews), `research` (analyst + synthesizer), `pm` (product lead, researcher, builder) |

Plus a **`secrets-manager`** rig — *"a HashiCorp Vault instance run by a specialist agent"*
(`README.md:292`) — which is the shipped example of **agent-managed software**: a rig that
packages real software alongside the agents that operate it.

**The vocabulary of the container** (`README.md:335-344`), which batch 03 will measure in code:

- **RigSpec** — the YAML declaration: pods, members, edges, continuity policies, a `culture_file`.
- **AgentSpec** — a reusable agent blueprint (skills, guidance, hooks, profiles, startup contracts).
- **Seat** — *"a stable role and address, e.g. `dev-build@starter`. The conversation occupying
  it can change while its identity and authored context remain."* **(a seat is an address, not
  a process)**.
- **Pod** — a group of related seats with shared guidance and context.
- **RigBundle** — the portable archive with vendored AgentSpecs and **SHA-256 integrity**.
- **Culture** — `CULTURE.md`, the rig's coordination norms, on top of OpenRig's default culture.

---

## 4. The documentation system — a first for this study

OpenRig's documentation is **not prose about the code; it is a queryable system with its own
invariants.** Three mechanisms distinguish it:

1. **The as-built tree has structured frontmatter** (`docs/as-built/README.md:1-13`):
   `kind`, `title`, `status`, `topics`, `domains`, `applies-when`, `siblings`,
   `prerequisite-reads`, **`last-verified-against-source`** (a commit SHA), `last-updated`.
   The field `applies-when` reads like a **retrieval trigger** — *"Starting a technical task
   and choosing the as-built module or source entry point to read."*
2. **The as-built docs declare their own staleness.** The index is verified against
   `e8f0ab34…`; `architecture.md` carries **`status: superseded`** and exists only as a
   compatibility pointer. The tree names a document's **verification boundary** rather than
   pretending the whole tree is current.
3. **The docs tree is enforced by a test** — the **docs guard**
   (`scripts/check-docs-guard.mjs`, `ARCHITECTURE.md:288`): under `docs/`, git may track
   **only** `docs/as-built/`, `docs/reference/`, `docs/releases/` and exactly
   `docs/DESIGN.md`; `.gitignore` ignores the rest. A documentation layout **cannot drift
   silently past CI**.

> **Why this matters here (rule 6 — name every capability).** Every prior platform in this
> study *described* its docs in prose. OpenRig **gives its docs a schema, a self-verification
> stamp, and a test**. This capability has a name: **machine-navigable documentation with
> declared verification boundaries.** Whether we adopt it is the mapping step's call; that it
> exists, and works, is this batch's finding.

---

## 5. Divergences (rule 1) — where the docs and the code disagree

`ARCHITECTURE.md` pins its counts to commit `c750304f` (**0.6.6**); the tree declares
**0.6.10**. Every count below was re-measured on the disk.

| Count | `ARCHITECTURE.md` (0.6.6) | **On disk (0.6.10)** | Verdict |
|---|---:|---:|---|
| **D1-1** Database migrations | **94** files, latest `095_…` | **105** files, latest **`109_mode_posture_coexist.ts`** | **DIVERGED** (aged 4 releases) |
| **D1-2** Files in `routes/` | 67 | **69** | **DIVERGED** |
| **D1-3** Hono routers in `routes/` | 65 | **65** | **HOLDS** |
| **D1-4** `app.route(...)` mounts | 69 | **69** | **HOLDS** |
| **D1-5** Top-level `rig` commands | **87** | **87** | **HOLDS** |
| **D1-6** MCP tools | **18** | **18** | **HOLDS** |
| **D1-7** Daemon `exports` subpaths | **21** | **22** | **DIVERGED** (+1) |
| **D1-8** Library scenarios | 15 | **16** (by `^scenario:`) | **DIVERGED** (+1) |
| **D1-9** Runtime adapters | 6 (5 command counts; OMP extends Pi) | 6 names present | **HOLDS (naming)** |
| **D1-10** Migration gaps | *"there is no 093"* | **093, 100, 102, 106** absent | **DIVERGED** (1 named → 4 real) |

**The shape of these divergences is instructive.** Four counts that a contributor is most
short-term likely to touch (`routes/`, `app.route` mounts, `rig` commands, MCP tools) **held
exactly** across three releases — so `ARCHITECTURE.md` is *carefully maintained*, not stale.
What aged is what **grows continuously**: migration files, route files, exports, scenarios.
**A count that describes a closed surface holds; a count that describes an open one drifts.**
That is the practical lesson of D1-1..D1-10.

**Plus the pin's `README` install-tag lag** (carried from batch 00): the README's copy-paste
install commands pin the **`v0.6.8`** release tag while the tree declares `0.6.10` — a live
document's example lagging the version, not a code disagreement.

---

## 6. Findings (batch 01)

**F1-1.** **The product is a coordination layer, and the code says so structurally.** 34,441
lines of `daemon` + 39,451 of `cli` exist to *launch, message, queue, restore and skill* agents
that are **shipped by someone else** (Claude Code, Codex). OpenRig declares six runtime
adapters; **none of them is an agent.** The agents are *unmodified* (`ARCHITECTURE.md:15`).

**F1-2.** ★ **The cross-package boundary is 22 exported names, and the build enforces it.** The
daemon reaches its siblings only through 22 `exports` subpaths, each a `*-surface.ts`; a build
script fails on an undeclared specifier. **This is the study's first build-time-enforced
monorepo boundary.** *(PZ — an out-of-pole mechanism of real interest.)*

**F1-3.** **Every client is the same client.** CLI and MCP share one `DaemonClient`; the MCP
server is *"the same client, exposed as tools."* So the CLI surface and the MCP surface are one
implementation — 87 commands and 18 tools over one HTTP client. *(P1/P2 seam.)*

**F1-4.** **The daemon is HTTP-first and SSE-live.** 69 route files, 65 Hono routers, 69 mounts,
one port (7433), and **SSE** (`streamSSE`) for push — not WebSockets (except the terminal
WebSocket in `routes/terminal-ws.ts`). *(P2.)*

**F1-5.** **The state is one SQLite file in one directory.** `$OPENRIG_HOME` (default
`~/.openrig`) → `openrig.sqlite`. **105 migrations** build it. There is no server database. *(P2
— and the hinge of the tenancy question, §7.)*

**F1-6.** **A "seat" is an address, not a process** (`README.md:339`): *"the conversation
occupying it can change while its identity and authored context remain."* This separation —
identity ≠ conversation — is the same idea seen in Multica's `agent_runtime`/`agent` split and
buzz's event-log-vs-view; here it is stated as a **first-class noun**. *(P1, to verify in b02.)*

**F1-7.** **Three shipped teams are the product's teaching surface**, sized to grow: 2 seats
(`starter`) → 4 (`workshop`) → 7 (`factory`), plus named specialists. They are **YAML specs**,
not code paths — the same mechanism a user would use to define their own. *(P1/P2.)*

**F1-8.** **Documentation is a first-class, tested subsystem.** As-built pages carry a
frontmatter schema with a `last-verified-against-source` commit and an `applies-when`
retrieval trigger; a docs guard test pins which paths git may track. **No prior platform in
this study has machine-navigable docs with declared verification boundaries.** *(PZ.)*

**F1-9.** ★ **A count that describes a closed surface holds; a count that describes an open one
drifts.** Six-count reconciliation (D1-1..D1-10): stable surfaces (routes routers, mounts,
commands, MCP tools) held across 3 releases; growing surfaces (migrations, route files,
exports, scenarios) drifted. **The method's own rule — "count FIRST" — now has a corollary:
count *the open sets* first, because those are what a doc can't keep.** *(method.)*

**F1-10.** **`ARCHITECTURE.md` is unusually honest and unusually precise** — it opens *"this map
is not the territory… where it disagrees with the code, the code is right; please fix the
page"* and **gives the command for every count** so any reader can re-run it. The divergences
in §5 are therefore **self-announced staleness**, not deception. *(method — a doc pattern worth
stealing.)*

---

## 7. The tenancy question — stated now, answered in later batches

The workshop's later mapping turns on **tenancy** (one-tenant ↔ one-Hermes). This batch states
the question and records what is *already* visible, without concluding:

- **The daemon is a single-process local control plane** (`ARCHITECTURE.md:11`: *"on your
  machine"*), **with one SQLite database** at `$OPENRIG_HOME/openrig.sqlite`. There is no
  server, no per-tenant database, no tenant column visible in the pin.
- **The bearer-token check** (`middleware/auth-bearer-token.ts`) guards *"operator write
  routes"*, with **loopback and Tailscale bind detection at startup** (`ARCHITECTURE.md:86`);
  the token is derived from *"loopback + port"* (`startup.ts:561`).
- So the **tenant boundary, if any, is the machine/instance**, not a row. **Multica had
  `workspace_id` on 82 tables; n8n had `Project personal|team`; buzz had a host-resolved
  community.** **OpenRig's pin shows no tenant column at all.**

**This is recorded as an open question, not a verdict.** Batches 03 and 06 will read the auth
middleware and the migrations to confirm or falsify it. **If confirmed, it makes OpenRig the
first platform in this study with *no* tenancy concept** — which is itself a finding about
what kind of product this is: **a personal/team-local cockpit, not a multi-tenant service.**

---

## 8. Plain-English summary of batch 01

OpenRig is **a local control plane for a team of coding agents you already have.** It ships a
daemon that keeps the team's state in one SQLite file, runs each agent as an ordinary Claude
Code or Codex session inside tmux, and gives you three ways to drive it — a `rig` command line
(87 commands), a terminal UI, and an MCP server (18 tools) so an agent can manage its own team.
Four packages exist; **one** is published, and it contains the other three. The daemon's one
narrow door to its siblings is **22 exported names**, enforced by the build.

Its documentation is the most machine-native of any platform studied so far: pages carry
frontmatter with a verification commit and a retrieval trigger, and a **test** pins which doc
paths may exist. Its `ARCHITECTURE.md` pins every count to a commit **and prints the command
that produced it** — so when three releases passed, four counts held and four drifted, and the
drift is **self-announceable**.

**The pin's biggest open question — already visible, not yet decided — is tenancy.** Nothing in
the pin shows a tenant column: state is one SQLite file in one home directory, guarded by a
token derived from loopback and port. If the later batches confirm it, OpenRig is **the first
platform in this study with no tenancy model at all** — a deliberate shape for a
single-operator cockpit, and a load-bearing fact for the mapping step.

**Next: batch 02 — the aissistant (P1).** The runtime adapters, AgentSpec, seats, skills,
permission modes and the YOLO question, read from source.

---

*Batch 01 of 08 — the platform overview. All counts measured at `0.6.10`. 10 divergences
recorded; 10 findings (F1-1..F1-10).*
