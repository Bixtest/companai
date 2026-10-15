# Batch 01 — Platform Overview

**Study:** Gas Town `1.2.1` · **Batch:** 01 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **License:** see `LICENSE`
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.
Docs are claims; code is the authority. Nothing in this file was inferred from a README.

---

## 0. What this batch had to answer

Gas Town is not a library and not a framework. It is a **product**: a CLI (`gt`), a background **daemon**,
a **web dashboard**, and a **role taxonomy of AI agents** coordinated through **tmux** and a git-backed
ledger. So the question for batch 01 is: **what is the shape of the machine, and does it already solve
the three poles we are building toward?**

Short answer, measured:

| Pole | Gas Town's answer | Verdict |
|---|---|---|
| **P1 — the assistant** | A **role taxonomy as data** (7 TOML role definitions) + a **tmux session per agent** + an **ACP proxy** | **Real, and unusual: the agent's identity is a config file, not a row** (F01-04, F01-05) |
| **P2 — the workspace** | **Town** (the HQ) and **Rig** (a managed repo) with a fixed agent directory layout | **Real, and it is a filesystem workspace, not a database tenant** (F01-03) |
| **P3 — automations** | A **daemon** with **named dogs** (checkpoint/compactor/doctor/quota), a **Boot watchdog that is itself an agent**, a **merge-queue Refinery**, and a **town-wide E-stop** | **Real, and the watchdog chain is the most distinctive mechanism found** (F01-06, F01-07) |

Everything in this batch is the *platform* layer. The three pole-specific batches (02, 03, 04) go deeper;
this one establishes that there is something there to go deeper into.

---

## 1. The measured shape

All numbers below were measured on the extraction, not taken from any manifest.

| Area | Files | Lines | Notes |
|---|---:|---:|---|
| `internal/` | 1,235 | **477,544** | 60+ packages — essentially the whole product |
| `docs/` | 68 | 24,592 | concepts, design, guides, glossary |
| `plugins/` | 15 | 3,220 | 10 plugin directories |
| `cmd/` | 6 | 697 | **three binaries** (`gt`, `gt-proxy-client`, `gt-proxy-server`) |
| `templates/` | 2 | 483 | per-role agent instruction templates |
| Go total | **1,231 files** | **474,724** | across **77 package directories** |

**Two counting hazards measured before any finding was written.**

1. **46 % of Go *files* are tests** — **568 of 1,231** are `_test.go`, and in `internal/` the split is
   **247,851 production lines vs 225,046 test lines (48 %)**. A "lines of Go" figure for this project is
   **half test code** unless it says otherwise. Every count in this study states its basis.
2. **`cmd/` is a 697-line shell for three binaries.** `cmd/gt/main.go` is ten lines
   (`main.go:1-10`) — it calls `cmd.Execute()` and exits. **The real command surface is `internal/cmd/`,
   which is 103,691 production lines** — the single largest package in the tree.

---

## 2. The control plane: one CLI, one daemon, one dashboard

### 2.1 The CLI is the product's spine

`internal/cmd/` defines **292 distinct commands** (measured by counting cobra `Use:` declarations). The
surface is enormous and the names are the domain: `agents`, `bead`, `beads`, `boot`, `broadcast`,
`capacity`, `channel`, `checkpoint`, `claim`, `commit`, `convoy`, `deacon`, `doctor`, `estop`, `hook`,
`mail`, `mayor`, `merge`, `nudge`, `patrol`, `polecat`, `prime`, `refinery`, `rig`, `sling`, `status`,
`witness`, and ~270 more.

**Plainly:** Gas Town is operated by typing commands, and almost every capability has a verb. That is the
opposite of a product with a thin CLI and a fat UI.

### 2.2 The daemon is the runtime

`internal/daemon/daemon.go` imports the whole domain in one file (`daemon.go:1-45`): `beads`, `boot`,
`config`, `deacon`, `deps`, `doltserver`, `estop`, `events`, `feed`, `git`, `mayor`, `polecat`,
`refinery`, `rig`, `session`, `telemetry`, `tmux`, `wisp`, `witness`.

It is not a single loop. It has **named, separate maintenance jobs**, several of them literally called
**dogs** — `checkpoint_dog.go`, `compactor_dog.go`, `doctor_dog.go`, `quota_dog.go`, `dog_molecule.go` —
plus `convoy_manager.go`, `dolt.go`, `dolt_backup.go`, `jsonl_git_backup.go`, `krc_pruner.go`,
`log_rotation.go`, `pressure.go`.

**The finding:** the daemon is a **supervisor of named, individually-testable maintenance routines**, not
a monolith — and it names them after the product's own metaphor.

### 2.3 The dashboard is a web shell over the CLI

`internal/web/` is an HTTP server (`api.go`, `handler.go`, `commands.go`, `fetcher.go`, `validate.go`)
with `static/` (`dashboard.css`, `dashboard.js`) and `templates/` (`convoy.html`). Its API is explicit:
`CommandRequest` is *"the JSON request body for `/api/run`"*, and its own comment says *"Command is the
`gt` command to run (without the `gt` prefix). Example: `status --json` or `mail inbox`"*
(`api.go:25-36`).

**Plainly:** the web UI **shells out to the same CLI a human types**. There is one command surface, and
the dashboard is a second front door onto it — not a second implementation.

---

## 3. Town and Rig — a filesystem workspace

### 3.1 The two containers

- **Town** — the management HQ (the docs say `~/gt/`), holding town-level agents and the daemon.
- **Rig** — *"a managed repository in the workspace"* (`rig/types.go:8-9`), i.e. a project under
  management.

The `Rig` record (`rig/types.go:9-40`) is the whole model, and three of its fields are worth naming:

| Field | What it is | Why it matters |
|---|---|---|
| `Name`, `Path` | the rig's identity and directory | a rig **is** a directory |
| `GitURL`, **`PushURL`** | fetch URL, and an **optional separate push URL** | *"an optional push URL for read-only upstreams. When set, polecats push here instead of to `GitURL` (e.g., personal fork)"* — a fork workflow built into the record |
| `Polecats`, `Crew`, `HasWitness`, `HasRefinery`, `HasMayor` | the agents in the rig | the rig **contains** its agents, as lists |

### 3.2 The layout is fixed and declared

`rig/types.go:48-54` declares the standard agent directories:

```go
var AgentDirs = []string{
    "polecats",
    "crew",
    "refinery/rig",
    "witness",
    "mayor/rig",
}
```

**The finding, stated plainly:** Gas Town's workspace is **the filesystem** — a town directory containing
rig directories containing agent directories containing git worktrees. There is no tenant database here;
the container is a path, and the unit of isolation is a directory.

---

## 4. The role taxonomy — and it is DATA

### 4.1 Seven roles, as TOML files embedded in the binary

The roles are **not** code paths. They are seven TOML files — `crew.toml`, `deacon.toml`, `dog.toml`,
`mayor.toml`, `polecat.toml`, `refinery.toml`, `witness.toml` — compiled into the binary
(`//go:embed roles/*.toml`, `config/roles.go:15`) and parsed into a `RoleDefinition`
(`config/roles.go:20`):

```go
type RoleDefinition struct {
    Role           string            // mayor, deacon, witness, refinery, polecat, crew, dog
    Scope          string            // "town" or "rig"
    Session        RoleSessionConfig // tmux session pattern + work_dir + start_command
    Env            map[string]string
    Health         RoleHealthConfig
    Nudge          string            // the initial prompt
    PromptTemplate string
}
```

**A retirement is recorded in its own comment** (`config/roles.go:19`): *"This replaces the role bead
system with config files."* Roles used to be beads; they are now config. (See §8.)

### 4.2 What a role actually declares

Read from the TOML files themselves:

| Role | Scope | Session pattern | `work_dir` | The `nudge` (its first prompt) | `stuck_threshold` |
|---|---|---|---|---|---|
| **mayor** | town | `hq-mayor` | `{town}/mayor` | *"Check mail and hook status, then act accordingly."* | 1h |
| **deacon** | town | `hq-deacon` | `{town}` | *"Run `gt prime` to check patrol status and begin heartbeat cycle."* | 1h |
| **dog** | town | `gt-dog-{name}` | `{town}/deacon/dogs/{name}` | *"Check your hook for work assignments."* | 2h |
| **polecat** | rig | `{prefix}-{name}` | `{town}/{rig}/polecats/{name}` | *"Check your hook for work assignments."* | 2h |
| **witness** | rig | `{prefix}-witness` | `{town}/{rig}/witness` | *"Run `gt prime` to check worker status and begin patrol cycle."* | 1h |
| **refinery** | rig | `{prefix}-refinery` | `{town}/{rig}/refinery/rig` | *"Run `gt prime` to check merge queue and begin processing."* | 2h |
| **crew** | rig | `{prefix}-crew-{name}` | `{town}/{rig}/crew/{name}` | *"Check your hook and mail, then act accordingly."* | 4h |

*(All seven TOML files were read; every row above is from the file itself. Each file's own header comment
also states its intent — e.g. dog: "Town-level workers for cross-rig tasks. **Dispatched by Deacon**";
crew: "Persistent user-managed workspaces. Multiple per rig.")*

**Four things are worth stating plainly:**

1. **Scope is `town` or `rig`** — the two containers of §3 are the two scopes a role can have.
2. **The agent's first prompt is data** (`nudge`), and it is short — *"Check your hook for work
   assignments."* The agent is told to go look for work, not given work.
3. **Every role carries a health policy**: `ping_timeout` (30s), `consecutive_failures` (3),
   `kill_cooldown` (5m), and a per-role `stuck_threshold` (**1h** for the town coordinators, **2h** for
   workers, **4h** for crew). **The liveness policy is per-role configuration.**
4. **`start_command = "exec claude --dangerously-skip-permissions"` in all seven** — the agent *is a
   Claude Code process*. That is the subject of §5.
5. **`work_dir` shows the hierarchy as paths**: a dog lives under `{town}/deacon/dogs/{name}`, a polecat
   under `{town}/{rig}/polecats/{name}`. The org chart is a directory tree.

### 4.3 The roles, as the docs describe them (claims to verify in batches 02/04)

`docs/glossary.md` and `docs/overview.md` describe: **Mayor** (town chief-of-staff), **Deacon** (a
watchdog running patrol cycles), **Dogs** (the Deacon's maintenance crew), **Boot** (a Dog that checks the
Deacon every 5 minutes), **Polecat** (*"persistent identity but ephemeral sessions"*), **Refinery** (the
merge queue), **Witness** (a patrol agent over Polecats), **Crew** (long-lived named agents).

**Verified in code in this batch:** the seven role files exist; `dog` and `boot` are real; `polecat`'s
doc comment in the repo's own glossary (*persistent identity, ephemeral sessions*) matches the TOML's
`work_dir` (`{town}/{rig}/polecats/{name}` — a **named, persistent** directory). The rest is batch 02/04's
job, and is named here rather than assumed.

---

## 5. The agent runtime: Claude Code in tmux, driven over ACP

### 5.1 The agent is a tmux session

Every role declares a `session.pattern` and a `work_dir`, and the daemon drives sessions through
`internal/tmux/` (which carries platform-specific files — `descendants_windows.go`,
`process_group_unix.go`, `flock_unix.go`, `socket_guard_unix.go`, `sysproc_unix.go` — i.e. **real process
management**, not just "run a command").

**Plainly:** an "agent" in Gas Town is **a Claude Code process inside a named tmux session, in a
directory**. The identity is the session name; the workspace is the work_dir.

### 5.2 ACP is proxied, and there is a "propulsion" concept

`internal/acp/` holds `proxy.go`, `propulsion.go` (plus per-OS variants). The proxy **intercepts the agent
protocol stream** — the test file `forward_from_agent_test.go` distinguishes *"standard message (not
propelled/injected)"* from a propelled one — and `propulsion.go` imports `internal/nudge`.

This is where the product's stated principle **GUPP** (*"If there is work on your Hook, YOU MUST RUN
IT"*, `docs/glossary.md`) becomes code: the proxy can **propel** the agent, and there is a **nudge**
package. The mechanism is real; its exact semantics are batch 02's subject.

---

## 6. The ledger: Beads

Gas Town's work tracking is **an external project**: `github.com/steveyegge/beads`. It arrives three ways,
and all three are visible in the tree:

- **A Go SDK dependency** — `internal/beads/beads.go` imports `beadsdk "github.com/steveyegge/beads"`.
- **A CLI subprocess** — the same file is *"a wrapper for the `bd` (beads) CLI"* (`beads.go:1`), spawning
  `bd` and probing its capabilities (e.g. caching whether the installed `bd` supports `--allow-stale`).
- **A repo-local store** — `.beads/` in the tree (`config.yaml`, `PRIME.md`, `README.md`), with issues as
  `.beads/issues.jsonl` *"synced like code"*.

**The finding:** the ledger is **not built here** — it is a dependency the product wraps. And the wrapper
is not thin: `internal/beads/` spans ~12,246 production lines with sub-concerns for `agent_ids`, `audit`,
`channel`, `delegation`, `dog`, `escalation`, `group`, `merge_slot`, `mr` (merge request) and `queue`.

One more thing is visible and worth naming: `beads.go:25-31` records a **deliberate narrowing** —
*"ZFC: Only define errors that don't require stderr parsing for decisions. `ErrNotARepo` and
`ErrSyncConflict` were removed — agents should handle these directly."* An error type was **retired** in
favour of the agent handling the condition. (See §8.)

---

## 7. Town-wide controls

Three controls sit above every rig:

| Control | What it does | Evidence |
|---|---|---|
| **E-stop** | *"a town-wide mechanism to pause all agent work… a sentinel file (`ESTOP`) at the town root. When present, all agents should be frozen (`SIGTSTP`) and the daemon should not restart them."* — **the Mayor is exempt so it can coordinate recovery.** | `estop/estop.go:1-11` |
| **Boot** | *"the daemon's entry point for Deacon triage. Boot is a dog that runs fresh on each daemon tick, deciding whether to wake/nudge/interrupt the Deacon or let it continue. This centralizes the 'when to wake' decision in an agent."* | `boot/boot.go:1-5` |
| **Wisp** | `.beads-wisp/` — config storage that is *"local-only and never synced via git"* | `wisp/config.go:1-16,31` |

**Two of these are the study's most interesting early findings, and both are stated by the code itself:**

- **The watchdog chain is made of agents.** Boot is *"a dog that runs fresh on each daemon tick"* whose job
  is to decide whether to **wake the Deacon** — and the Deacon is the thing that watches the workers. So
  the supervision hierarchy is: **daemon → Boot (an agent) → Deacon (an agent) → Witness (an agent) →
  Polecat (an agent)**, each level deciding whether the level below is alive. That is a chain of
  accountability implemented *in the same material as the workers*.
- **The E-stop has one deliberate exception, stated in a comment**: *"The Mayor is exempt from E-stop so
  it can coordinate recovery."* A global stop with exactly one named bypass, and a reason.

---

## 8. The retirement ledger (rule 10)

| Location | What was retired | Why (its own words) |
|---|---|---|
| `config/roles.go:19` | **the role *bead* system** | *"This replaces the role bead system with config files."* — roles moved from the ledger to TOML |
| `beads/beads.go:25-31` | **`ErrNotARepo` and `ErrSyncConflict`** | *"ZFC: Only define errors that don't require stderr parsing for decisions… agents should handle these directly."* |
| `wisp/config.go:16,31` | *(not a retirement but a stated boundary)* | wisp config is *"never synced via git"* — a deliberate local-only tier |

**The first is the study's first real retirement, and it is a good one:** a concept (roles) **moved out of
the ledger and into configuration**, and the comment records it. A reader of the current code would see
seven TOML files and never know roles were once beads.

---

## 9. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F01-01** | **The CLI is the spine** — 292 commands in `internal/cmd/` (103,691 prod lines); the entry binary is ten lines. | P2/P3 | Every capability has a verb you can type, script and pipe. | A single command surface a UI, an agent, or a person can all drive. |
| **F01-02** | **The dashboard is a shell over the CLI** — `POST /api/run` executes a `gt` command string. | PX-F | The web view shows exactly what the CLI shows. | One implementation, two front doors — no second source of truth. |
| **F01-03** | **Town / Rig is a filesystem model** — a rig *is* a directory; `AgentDirs` fixes the layout; `Rig` carries a separate `PushURL` for forks. | P2 | A project is a folder you can `cd` into and inspect. | The container is a path; isolation is a directory. |
| **F01-04** | **The role taxonomy is data** — 7 embedded TOML files → `RoleDefinition` (scope, session, env, health, nudge, template). | P1 | Roles can be read and changed as configuration. | The agent model is declarative and portable. |
| **F01-05** | **The agent is a Claude Code process in a named tmux session**, with a per-role health policy and an ACP proxy that can *propel* it. | P1 | Agents are real processes you can attach to and watch. | The runtime is an external engine, driven through a protocol seam. |
| **F01-06** | **The watchdog chain is made of agents** — Boot (a dog) decides whether to wake the Deacon, which watches the Witness, which watches the Polecats. | P3 | The system recovers itself without a human watching. | Supervision is implemented in the same material as the work. |
| **F01-07** | **A town-wide E-stop with exactly one named exemption** (the Mayor, so it can coordinate recovery). | P3/PZ | One switch freezes everything without losing the recovery path. | A global control with a reasoned, documented bypass. |
| **F01-08** | **Named, individually-testable daemon jobs** — `checkpoint_dog`, `compactor_dog`, `doctor_dog`, `quota_dog`, `convoy_manager`, … | P3 | Maintenance is legible instead of one opaque loop. | The supervisor is a set of small, named routines. |
| **F01-09** | **The ledger is an external dependency, wrapped** — Beads via SDK + `bd` subprocess + `.beads/issues.jsonl`, wrapped by ~12k lines. | P2/P3 | Issues live next to the code and sync with git. | Work tracking is not rebuilt; it is integrated. |
| **F01-10** | **A local-only config tier** (`.beads-wisp`, *"never synced via git"*) beside the git-backed store. | PZ | Machine-specific settings do not pollute the repo. | A deliberate split between durable shared state and local state. |
| **F01-11** | **The retirement ledger's first entry**: roles moved from **beads to TOML**, recorded in the code's own comment. | PZ | (indirect) — roles are now editable config. | Concepts can migrate between layers, and the move is recorded. |
| **F01-12** | **A measured hazard, stated**: **46 % of Go files (48 % of `internal/` lines) are tests**. | PZ | (indirect) — the product is heavily tested. | Every line count must declare its basis. |

---

## 10. Divergences and honest bounds

- **No doc-vs-code divergence was needed to reach these findings.** Where the docs describe a mechanism
  (the role taxonomy, the E-stop, Boot), the code agrees and says more. This is closer to the Multica
  shape than the CrewAI shape.
- **Bound (stated plainly):** this batch read the **platform layer** — the CLI surface, the daemon's
  structure, the containers, the roles, the runtime seam, the ledger, and the town-wide controls. It did
  **not** read the semantics of the roles in operation (how a polecat is dispatched, what a witness patrol
  does, how the merge queue decides) — those are batches 02 and 04, and are named rather than half-covered.
- **Bound:** the `acp` proxy and the `propulsion`/`nudge` mechanism are **located and named**, not
  explained. Their semantics belong to batch 02.
- **Bound:** `docs/` (24,592 lines) was used only to *name* claims to verify, never as authority (rule 1).

---

## 11. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The role taxonomy as data (F01-04)** — seven embedded TOML definitions carrying scope, session
   shape, environment, a health policy and the agent's first prompt. The cleanest declarative agent model
   seen in the study so far.
2. **The watchdog chain made of agents (F01-06)** — Boot → Deacon → Witness → Polecat, where each level
   decides whether the level below is alive. It is the most distinctive supervision design in the study.
3. **The one-surface, two-doors pattern (F01-01 / F01-02)** — 292 CLI commands, with the web dashboard
   executing the *same* commands rather than reimplementing them.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 01 of 07. Read from source on 2026-10-15. Next: `findings/02-the-aissistant.md`.*
