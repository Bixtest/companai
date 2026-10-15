# Batch 03 — The Workspace (P2)

**Study:** Gas Town `1.2.1` · **Batch:** 03 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **Method:** rules 1-10 of `00-PIN-AND-METHOD.md`.
Every claim carries `file:line`. Docs are claims; the code is the authority.

---

## 0. What this batch had to answer

P2 is **the workspace** — the container a person operates in. Batch 01 found that Gas Town's container
is **the filesystem** (a Town of Rigs of agent directories). This batch opens it up: how the container is
found and configured, what the "Hook" actually is, how the ledger stores work, and what philosophy holds
the whole thing together.

Short answer, measured:

| Question | Gas Town's answer | Where |
|---|---|---|
| How is the workspace found? | **By walking up the path** for a marker file (`mayor/town.json`) | F03-01 |
| How is it configured? | A **4-layer stack** (system → town → bead → wisp) with per-key *stacking* vs *override*, and a local **veto** | F03-02 |
| What is a "Hook"? | **The durability primitive** — a pointer on the agent bead that survives restarts | F03-03 |
| How does work survive a restart? | The agent re-reads its hook **at session start** — the work is never held in the session | F03-03 |
| What does the ledger store? | **Two tiers**: durable issues and ephemeral *wisps*, merged explicitly by readers | F03-04 |
| What holds it together? | **ZFC — "Zero Framework Cognition"**: the framework transports, the agent decides | F03-06 |

---

## 1. Town and Rig — the containers, found by path

### 1.1 The town is discovered, not configured

`workspace/find.go:20-25` declares the markers:

```go
PrimaryMarker   = "mayor/town.json"   // the main config file that identifies a workspace
SecondaryMarker = "mayor"             // an alternative indicator at the town level
```

`Find(startDir)` **walks up** from the given directory, prefers the primary marker, and — the
interesting part — *"Always continues to the outermost workspace, correctly handling nested workspace
structures (e.g., rig directories with their own `mayor/town.json`)"* (`find.go:27-31`).

**Plainly:** a Gas Town workspace is **wherever the path says it is**. There is no registry, no
connection string, no environment variable required — the tool walks upward until it finds the town, and
deliberately keeps going so a nested rig cannot shadow the real one.

### 1.2 The config types separate identity from behaviour, on purpose

`config/types.go` defines three distinct town-level types, and the comment states why
(`types.go:26-27`): *"This is separate from `TownConfig` (identity) to keep configuration concerns
distinct."*

| Type | Holds | Note |
|---|---|---|
| **`TownConfig`** | `Type`, `Version`, `Name`, **`Owner`** (*"owner email (entity identity)"*), `PublicName`, `CreatedAt` | **identity only** |
| **`MayorConfig`** | theme, daemon settings, deacon settings, `DefaultCrewName` | town behaviour |
| **`TownSettings`** | CLI theme, `DefaultAgent`, and agent config applying to all rigs | town defaults, overridable per rig |

**The finding:** a town has an **identity** (a name, an owner email, a public name) that is stored
separately from its **behaviour**. Identity is what other entities address; behaviour is what this
machine does.

---

## 2. The config stack — four layers, and a veto

`rig/config.go:13-22` declares where a value can come from:

```go
SourceWisp    = "wisp"    // Local wisp layer (.beads-wisp/config/)
SourceBead    = "bead"    // Rig identity bead labels
SourceTown    = "town"    // Town defaults (~/gt/settings/config.json)
SourceSystem  = "system"  // Compiled-in system defaults
SourceBlocked = "blocked" // Explicitly blocked at wisp layer
SourceNone    = "none"
```

And `ConfigResult{Value, Source}` returns **both the value and where it came from** — so a lookup can
always answer *"why is this setting what it is?"*

**Two mechanics make it more than a merge:**

1. **Per-key semantics.** `rig/config.go:44-45`: *"`StackingKeys` defines which keys use **stacking**
   semantics (values add up). All other keys use **override** semantics (first non-nil wins)."* So some
   keys accumulate and some replace — declared per key, not globally.
2. **A veto layer.** `SourceBlocked` — *"Explicitly blocked at wisp layer"* — lets the **local,
   never-synced** layer **refuse** a value set above it. The lowest layer can say no.

**Compiled-in defaults** (`rig/config.go:34-42`) include `status: operational`, `auto_restart: true`,
`auto_start_on_up: false`, **`max_polecats: 10`**, `priority_adjustment: 0`, `dnd: false`,
`polecat_branch_template: ""`, and **`default_formula: "mol-polecat-work"`** — i.e. the default workflow
for a new polecat is named, not hard-coded.

**Plainly:** configuration is a **stack you can inspect**, with a local veto and per-key arithmetic. It is
closer to a resolver than to a settings file.

---

## 3. The Hook — the durability primitive

This is the batch's most important finding, and the command's own help states it (`cmd/hook.go:33-37`):

> *"The hook is the **'durability primitive'** — work on your hook survives session restarts, context
> compaction, and handoffs. When you restart (via `gt handoff`), your SessionStart hook finds the attached
> work and you continue from where you left off."*

### 3.1 What a hook is, mechanically

A hook is **a field on the agent's bead** — `HookBead` (batch 02 §1), serialized as the line
`hook_bead: <bead-id>` in the agent bead's description (`beads_agent.go:90-93`). When it is empty the line
reads `hook_bead: null`.

So the whole mechanism is: **an agent is told which work item it owns, and that pointer is stored in the
same ledger as the work.**

### 3.2 Why that makes it durable

The session is **ephemeral**; the pointer is **not**. On restart, the agent's session-start hook runs
`gt prime` (batch 02 §5.1), which reads the agent bead, finds `hook_bead`, and hands the agent its work
back. **Nothing about the agent's task lives in the session**, so losing the session loses nothing.

That is what makes the stated principle **GUPP** (*"If there is work on your Hook, YOU MUST RUN IT"*,
`docs/glossary.md`) implementable: "is there work?" is a **field lookup**, not a memory.

### 3.3 The verbs around it

`cmd/hook.go:41-47` names the family, and the distinction between them is the whole point:

| Command | What it does | Context |
|---|---|---|
| `gt hook <bead>` | attach work to a hook (yours, or another agent's) | — |
| **`gt sling <bead>`** | **Hook + start now** | **keeps** the current context |
| **`gt handoff <bead>`** | **Hook + restart** | **fresh** context |
| `gt unsling` | remove work from the hook | — |

**Plainly:** "assign this work and keep going" and "assign this work and start clean" are **two different
verbs**, and the difference is exactly the context. A durable pointer makes that choice cheap.

---

## 4. The ledger's two tiers

### 4.1 Durable issues and ephemeral wisps

`cmd/hooked_work.go:11-13` is explicit:

> *"lists matching **durable issues and ephemeral wisps**. Hooked molecule roots can live in **either
> table**, so active-work readers must **explicitly merge both sources** instead of relying on issue-only
> `bd list` output."*

And the record carries the flag: `Issue.Ephemeral` — *"Wisp/ephemeral issues, not synced to git"*
(`beads/beads.go:197`); queries pass `Ephemeral` to choose *"search wisps table (ephemeral issues) instead
of issues table"* (`beads.go:509`).

**So the ledger has two tables with different durability contracts** — one git-synced and shared, one
local and transient — and the readers are written to merge them. The trap is named in the comment: a
reader that queries only the durable table **silently misses half the work**.

### 4.2 The work record

`beads/beads.go:176-205` (the `Issue` type) is a familiar issue-tracker shape — `title`, `description`,
`design`, `notes`, `status`, `priority`, `type`, timestamps, `parent`, `assignee`, `labels` — plus
**graph fields** (`Children`, `DependsOn`, `Blocks`, `BlockedBy`), an `ExternalRef`, and the
**agent-bead slots** (`HookBead`, `AgentState`).

**And the retirement appears a second time**, on this struct too (`beads.go:205`): *"Note: `role_bead`
field removed — role definitions are now config-based."* The same deletion is recorded on both the agent
record and the work record, which is what you would expect if a field was removed from a shared shape.

### 4.3 Where the two tiers live

`wisp/types.go:9` → `WispDir = ".beads"`; `wisp/config.go:17` → `WispConfigDir = ".beads-wisp"`, described
as *"local-only and never synced via git"*. Both sit inside the repo tree; neither is pushed.

---

## 5. Git-backed: worktrees, and a guard that says no

`internal/git/` is *"a wrapper for git operations via subprocess"* (`git/git.go:1`) — git is driven as a
command, not linked as a library — and it handles **worktrees** explicitly (`git.go:338-339`, `:416`,
`:439`).

**Two design decisions are worth naming, and both are stated in the code:**

1. **Errors carry raw output for the agent, deliberately.** `GitError` holds `Command`, `Args`, `Stdout`,
   `Stderr` and the underlying error, with the comment (`git.go:25-28`): *"**ZFC:** Callers observe the raw
   output and decide what to do. The error interface methods provide human-readable messages, but **agents
   should use Stdout/Stderr for programmatic observation**."* A git failure is not interpreted for the
   agent; it is **transported** to it.
2. **A guard refuses to mutate the town root.** `ErrUnsafeTownRootGitMutation` — *"unsafe git mutation
   targets Gas Town town root"* (`git.go:70-72`) — and `EnsureSafeMutationWorkDir` fails when a mutating
   operation's effective worktree **is the town root** (`git.go:264-276`). The platform protects its own
   container from the agents inside it.

---

## 6. ZFC — "Zero Framework Cognition", the philosophy stated in the docs

`docs/agent-provider-integration.md:619-623` defines the platform's design principle outright:

> **"### ZFC: Zero Framework Cognition**
> The agent decides what to do with instructions. Gas Town provides **transport** (tmux, hooks, nudges)
> but **doesn't make decisions for agents**. The interface is about **communication channels, not control
> flow**."*

And the section immediately after it, **"Graceful Degradation"** (`:625-631`), is the same principle
applied to capabilities:

> *"Every capability has a fallback:*
> *- No hooks? → Startup fallback commands via tmux*
> *- No prompt mode? → Nudge delivery*
> *- No resume? → Fresh session with handoff mail*
> *- No process API? → Tmux pane_current_command"*

**This is the single best explanation of the platform found in the study.** It explains three earlier
findings at once: why the nudge queue has two delivery paths (batch 02 §5.3), why git errors are handed
over raw (§5 above), and why the role is inferred from a directory rather than pushed (batch 02 §5.1).
The framework **moves information**; it does not decide.

**ZFC is not just documented — it is enforced by refactoring.** The token appears **52 times** in
non-test Go, and the `CHANGELOG.md` records **removals** made to comply:

| Changelog | What was removed for ZFC |
|---|---|
| `:471`, `:634` | *"**Removed ZFC-violating decision engine**"* from Boot triage (twice) |
| `:607` | *"Hardcoded thresholds"* → **`OperationalConfig` for config-driven thresholds (ZFC)** |
| `:626` | *"Replaced screen-scraping with structured signals"* (ZFC violation) |
| `:631` | *"Removed dead `findTownRoot` filesystem inference"* (ZFC) |
| `:794` | *"Remove redundant `Status.Running` field"* (ZFC compliance) |

**Plainly:** the principle has a name, a definition, a fallback table, and a **history of code deleted to
honour it**. That combination is rare, and it is the strongest "stated philosophy, enforced" finding in
the study.

---

## 7. The autonomous / interactive split

`hookutil/roletype.go:12-22` classifies every role, and its comment says it is authoritative:

> *"`IsAutonomousRole` returns true if the given role operates **without human prompting** and needs
> **automatic mail injection on startup**. Autonomous roles: polecat, witness, refinery, deacon, boot.
> Interactive roles: mayor, crew (and anything else). **This is the single source of truth for the
> autonomous/interactive classification** used by all hook installer packages … and the runtime fallback
> logic."*

**The finding:** the workspace distinguishes agents **that must be woken with work** from agents **that
wait for a person**, and that distinction drives what gets injected at startup. It is a two-line function
that encodes a real product decision — and it is named as the single source of truth, so the hook
installers cannot drift from it.

---

## 8. The retirement ledger (rule 10)

This batch's ledger is unusually rich, because the project's own changelog records the removals:

| Where | What was retired | Why |
|---|---|---|
| `CHANGELOG:471,634` | the **Boot triage decision engine** | *"ZFC-violating"* — the framework was deciding |
| `CHANGELOG:631` | **`findTownRoot` filesystem inference** in the Refinery | ZFC — dead inference |
| `CHANGELOG:607` | **hardcoded thresholds** | replaced by `OperationalConfig` (config-driven) |
| `CHANGELOG:626` | **screen-scraping** for state | replaced by structured signals |
| `CHANGELOG:794` | the **`Status.Running` field** | ZFC compliance |
| `beads/beads.go:205` + `beads_agent.go:49` | the **`role_bead` field** (on *both* the work and agent records) | roles are config-based now |

**The pattern, now complete across three batches:** Gas Town repeatedly **removes decision-making from
the framework** — whether that is a field, a threshold, an inference, or a whole triage engine — and moves
it either **into config** or **to the agent**. The changelog is the ledger of that campaign.

---

## 9. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F03-01** | **The town is discovered by walking up the path** for `mayor/town.json`, and the search deliberately continues to the **outermost** match so nested rigs cannot shadow it. | P2 | It just works from any directory inside the workspace. | The container is a location, not a record — no registry to keep. |
| **F03-02** | **A 4-layer config stack** (system → town → bead → wisp) with **per-key stacking vs override**, a returned **source**, and a local **veto** (`SourceBlocked`). | P2 | A setting can always be explained, and the local machine can refuse one. | Configuration as a resolver with inspectable provenance. |
| **F03-03** | **The Hook is the durability primitive** — a `hook_bead` pointer on the agent bead; the session is ephemeral and the work is not. | P2/P3 | Restart, compaction or handoff never loses the task. | Durability by re-reading a pointer, not by persisting a session. |
| **F03-04** | **`sling` vs `handoff`** — hook-and-keep-context vs hook-and-restart are two verbs. | P2/P3 | You choose whether a hand-over keeps the thread. | The context decision is explicit, not implied. |
| **F03-05** | **A two-tier ledger** — durable issues and ephemeral wisps in separate tables, **merged explicitly**, with the merge trap named in a comment. | P2 | Scratch work does not pollute the shared history. | Two durability contracts over one work model. |
| **F03-06** | **ZFC — "Zero Framework Cognition"** — the framework **transports** (tmux, hooks, nudges) and does not decide; with a **graceful-degradation fallback per capability**, 52 in-code references, and a changelog of removals that honour it. | P2/PZ | The agent is never second-guessed by the tool. | A named, enforced design philosophy — the clearest one in the study. |
| **F03-07** | **The autonomous/interactive split** — `polecat/witness/refinery/deacon/boot` are woken with work; `mayor/crew` wait for a person; named as the single source of truth. | P2/P1 | The right agents get moving on their own. | One classification drives all startup injection. |
| **F03-08** | **Git is a subprocess whose errors carry raw stdout/stderr for the agent**, by stated rule. | P2 | The agent sees the real failure, not a paraphrase. | The framework transports a signal instead of interpreting it. |
| **F03-09** | **A guard that refuses to mutate the town root** (`ErrUnsafeTownRootGitMutation`). | P2 | An agent cannot wreck the workspace container itself. | The platform protects its own structure from its agents. |
| **F03-10** | **Town identity is stored apart from town behaviour** (`TownConfig` vs `MayorConfig`/`TownSettings`), with the reason in a comment. | P2 | A town has a name and an owner that are not settings. | Identity is a first-class, addressable thing. |
| **F03-11** | **The retirement ledger**: decision engines, inference, thresholds and a field removed **for ZFC** — recorded in the changelog. | PZ | (indirect) — less magic in the middle. | A principle with a deletion history is a principle that is actually held. |
| **F03-12** | **The `role_bead` removal is recorded on *both* the work and agent records.** | PZ | (indirect) | A shared shape's deletion is noted everywhere it appeared. |

---

## 10. Divergences and honest bounds

- **One doc-vs-code divergence found, and it is minor:** `wisp/io.go:10-11` says `EnsureDir` *"ensures the
  `.beads` directory exists"* while the constant it uses is `WispDir = ".beads"` — consistent in code, but
  the wisp layer's **two** directories (`.beads` for data, `.beads-wisp` for config) are easy to confuse.
  Recorded so a later batch does not conflate them.
- **Bound:** this batch read the **container** — discovery, config, the hook primitive, the ledger's two
  tiers, the git guard, the philosophy and the role split. It did **not** read the merge queue, the
  patrols or the scheduler — those are batch 04.
- **Bound:** the `mol` (molecule) subsystem is **named** (`molecule.go`, `molecule_dag.go`,
  `molecule_attach.go`, `molecule_await_event.go`, …) and its role in the hook is stated, but its internals
  are not; `MEOW` as a decomposition model is batch 04's subject.
- **Bound (stated plainly):** the ZFC changelog entries are **claims by the project about its own
  history**, and this batch cites them as *the project's account*, which is what a changelog is. The code
  evidence — 52 `ZFC:` comments and the `GitError` design — is what makes the principle real rather than
  rhetorical.

---

## 11. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The Hook as a durability primitive (F03-03)** — an ephemeral session over a durable pointer, with
   `sling` and `handoff` as the two verbs. The cheapest restart-safety mechanism found in the study.
2. **ZFC (F03-06)** — a named principle ("transport, don't decide") with a per-capability fallback table
   and a deletion history. Directly relevant to how our own layer should behave toward an agent.
3. **The config stack with a local veto (F03-02)** — four layers, per-key arithmetic, a returned source,
   and the lowest layer able to refuse.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 03 of 07. Read from source on 2026-10-15. Next: `findings/04-automations.md`.*
