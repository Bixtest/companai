# Batch 02 — The Aissistant (P1)

**Study:** Gas Town `1.2.1` · **Batch:** 02 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **Method:** rules 1-10 of `00-PIN-AND-METHOD.md`.
Every claim carries `file:line`. Docs are claims; the code is the authority.

---

## 0. What this batch had to answer

P1 is **the aissistant** — what an agent *is* here, what runs it, how it is configured, what it can do,
and how it is kept alive. Batch 01 found the shape (7 TOML roles, Claude Code in tmux). This batch opens
the agent up.

Short answer, measured:

| Question | Gas Town's answer | Where |
|---|---|---|
| What is an agent? | **A bead** — an issue-tracker row whose description holds `key: value` fields | F02-01 |
| What is its identity? | `AgentIdentity{Role, Rig, Name, Prefix}`, parsed from a **mail-style address** | F02-02 |
| What runs it? | A **Claude Code process in a named tmux session**, chosen from a **13-preset registry** | F02-03 |
| How does it get its instructions? | **`gt prime`** — a CLI command that infers the role **from the directory** and is wired into the runtime's session-start hook | F02-05 |
| How is it nudged mid-run? | A **nudge queue** whose delivery differs per runtime (Claude drains via a hook; Gemini/Codex need a poller) | F02-06 |
| How is its state tracked? | **As bead labels** (`idle:3`, `backoff:2m`) and a completion block on the bead | F02-07 |

---

## 1. The agent as a record — a bead with `key: value` fields

Gas Town has **no agent table**. An agent is a **bead** in the same ledger as the work it does
(§ batch 01 §6), and its structured fields live **in the bead's description text**:

> *"AgentFields holds structured fields for agent beads. **These are stored as `key: value` lines in the
> description.**"* — `beads/beads_agent.go:39-40`

The fields (`beads/beads_agent.go:40-66`), read in full:

| Field | Purpose |
|---|---|
| `RoleType` | polecat, witness, refinery, deacon, mayor |
| `Rig` | the rig (empty for town-level agents) |
| **`AgentState`** | spawning, working, done, stuck, escalated, idle, running, nuked |
| **`HookBead`** | **the currently pinned work bead ID** |
| `CleanupStatus` | *"ZFC: polecat self-reports git state (clean, has_uncommitted, has_stash, has_unpushed)"* |
| `ActiveMR` | the active merge-request bead |
| `NotificationLevel` | `verbose` / `normal` / `muted` — **DND as a field** |
| `Mode` | `""` (normal) or **`"ralph"`** (*the Ralph Wiggum loop*) |
| `ExitType`, `MRID`, `Branch`, `LastSourceIssue`, `MRFailed`, `PushFailed`, `CompletionTime` | the completion block, written by `gt done` |

**Two things are worth stating plainly.**

1. **The agent's state is not a column — it is text that happens to be parseable.** There is no schema
   for an agent; there is a description with `key: value` lines, written under a **file lock**
   (`lockAgentBead`, `beads_agent.go:19-36`) so concurrent read-modify-write cannot race.
2. **The retirement is recorded in the struct itself** (`beads_agent.go:49`): *"Note: **RoleBead field
   removed** — role definitions are now config-based. See `internal/config/roles/*.toml`."* A field was
   deleted from the agent record and its replacement named in the same comment. (Batch 01 recorded the
   other half of the same move.)

**Operational state is a *second* mechanism**: `gt agents state <agent-bead>` reads and writes state as
**bead labels**, not description fields — *"Labels are stored as `key:value` pairs (e.g., `idle:3`,
`backoff:2m`)"* (`cmd/agent_state.go:36`). So an agent carries **description fields** (identity-ish) and
**labels** (operational counters), both on the same bead.

---

## 2. Identity — a role, a rig, a name, and a prefix

`session/identity.go:24-29`:

```go
type AgentIdentity struct {
    Role   Role   // mayor, deacon, witness, refinery, crew, polecat, dog
    Rig    string // rig name (empty for mayor/deacon/dog)
    Name   string // crew/polecat/dog name (empty for mayor/deacon/witness/refinery)
    Prefix string // beads prefix for rig-level agents (e.g. "gt", "bd", "hop")
}
```

**An identity is parsed from a mail-style address** (`ParseAddress`, `identity.go:31`): `mayor`,
`deacon`, or a `<rig>/<name>` form. **Agents are addressable like email** — and batch 01 saw that the
`mail` package is a real subsystem, so this is not decoration.

### 2.1 The role constants hold one more role than the TOML files

`session/identity.go:12-21` declares **eight** roles: `mayor`, `deacon`, **`overseer`**, `witness`,
`refinery`, `crew`, `polecat`, `dog`. Batch 01 found **seven** TOML role files. The difference is
**`overseer`**, and the code says why in a single line (`identity.go:43`): *"overseer has no session"*.

**So "overseer" is a role with an identity and no runtime** — a real divergence between the identity
model and the role-config model, recorded here rather than smoothed. It is batch 04's job to find what
an overseer does.

### 2.2 Identity is also a bead ID, with two namespaces

`beads/agent_ids.go:11-12,20-38` gives the town-level agents bead IDs with an **`hq-` prefix**, stored in
`~/gt/.beads/`, distinct from rig-level beads (which use a project prefix):

- `hq-mayor`, `hq-deacon` — singletons
- `hq-dog-<name>` — named town agents
- `hq-<role>-role` — **role definition beads**, which batch 01 found are now vestigial (roles moved to
  TOML). The helper still exists; the thing it names has moved.

---

## 3. The provider registry — 13 presets, one source of truth

`config/agents.go` (1,241 lines) is the **agent-preset registry**, and its own header states the rule:

> *"This is the **single source of truth** for all agent-specific behavior. Adding a new agent = adding a
> `builtinPresets` entry + optional hook installer. **No provider-string switch statements should exist
> outside this registry.**"* — `config/agents.go:58-60`

**13 built-in presets** (measured): `claude`, `gemini`, `codex`, `kiro`, `cursor`, `auggie`, `amp`,
`opencode`, `copilot`, `pi`, `omp`, `vibe`, `groq-compound`.

Each `AgentPresetInfo` (`config/agents.go:61`) carries everything provider-specific:

| Field | What it encodes |
|---|---|
| `Command`, `Args`, `Env` | how to launch it |
| `ProcessNames` | **how to tell it is running** — checked against tmux's `pane_current_command` (e.g. `["node"]` for Claude) |
| `SessionIDEnv`, `ResumeFlag`, `ContinueFlag`, `ResumeStyle` | **how to resume a session** — `"flag"` (`--resume <id>`) or `"subcommand"` (`codex resume <id>`) |
| `SupportsHooks`, `SupportsForkSession` | capability flags |
| `PromptMode` | `"arg"` or `"none"` — how the first prompt is delivered |
| `ConfigDirEnv`, `ConfigDir` | where the runtime keeps config (e.g. `CLAUDE_CONFIG_DIR`, `.claude`) |
| `HooksProvider`, `HooksDir`, `HooksSettingsFile`, `HooksInformational`, `HooksUseSettingsDir` | how hooks are installed for that runtime |

**A second retirement is stated in the struct**: the block is labelled *"Runtime default fields
(**replaces scattered `default*()` switch statements**)"* (`config/agents.go:110`). Provider behaviour
moved from switch statements into data.

**Two details worth naming:**

- **`groq-compound` uses the Claude binary as a proxy.** Its comment (`agents.go:49-53`): *"routes the
  Claude CLI to Groq's compound-beta model via Groq's OpenAI-compatible API endpoint. The `claude` binary
  acts as the SDK proxy; `ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY` are overridden at runtime … and
  `GROQ_API_KEY` is read dynamically and **never stored in config files**."* A provider is emulated by
  re-pointing another provider's base URL — and the secret is kept out of config by rule.
- **A custom preset is supported** (`agents.go:1064` shows a `my-agent-cli` example in the loader's
  documentation), so the registry is open, not closed.

---

## 4. The session — one agent, one tmux session

`session/names.go` builds every session name, and its comments carry a **hard boundary**:

- `MayorSessionName()` → `hq-mayor`, with *"**One mayor per machine** — multi-town requires
  containers/VMs for isolation"* (`names.go:15`).
- `DeaconSessionName()` → `hq-deacon`, the same boundary (`names.go:21`).
- `WitnessSessionName(rigPrefix)` → `{rigPrefix}-witness`; `RefinerySessionName` → `{rigPrefix}-refinery`;
  `CrewSessionName(rigPrefix, name)` → `{rigPrefix}-crew-{name}`.

**The boundary, stated plainly:** Gas Town is **single-town per machine**; the product does not pretend
otherwise, and names containers/VMs as the isolation mechanism. (Batch 03 takes this up as a tenancy
finding.)

`internal/session/` is not a thin naming helper — it carries `identity.go`, `lifecycle.go`, `registry.go`,
`stale.go`, `startup.go`, `pidtrack.go`, `agent_logging_{unix,windows}.go`, `legacy_socket.go`,
`window_tint.go`, `town.go`. That is **real process and session management**, per-OS.

---

## 5. How the runtime is wired

### 5.1 `gt prime` — the instruction injector, and the role comes from the directory

`gt prime` is the mechanism by which an agent learns what it is. Its contract (`cmd/prime.go:71-90`) is
explicit:

> *"**Detect the agent role from the current directory** and output context.*
> *- Town root → Neutral (no role inferred; use `GT_ROLE`)*
> *- `mayor/` or `<rig>/mayor/` → Mayor context*
> *- `<rig>/witness/rig/` → Witness context*
> *- `<rig>/refinery/rig/` → Refinery context*
> *- `<rig>/polecats/<name>/` → Polecat context"*

**The role is inferred from where the process is standing.** That is the directory-is-the-org-chart
finding of batch 01, now seen from the agent's side.

`prime` runs in **hook mode** (`--hook`) at session start, and its session-ID resolution has **five
fallbacks in priority order** (`GT_SESSION_ID` → `CLAUDE_SESSION_ID` → persisted `.runtime/session_id` →
stdin JSON → a generated UUID), with the source read from `GT_HOOK_SOURCE` or stdin. The command's own
help shows the wiring for two runtimes:

```
Claude Code  (.claude/settings.json):  "SessionStart": [{"hooks":[{"type":"command","command":"gt prime --hook"}]}]
Gemini CLI   (.gemini/settings.json):  "SessionStart": "export GT_SESSION_ID=$(uuidgen) GT_HOOK_SOURCE=startup && gt prime --hook"
```

**Plainly:** the agent's context is not baked into a prompt string at launch — it is **produced by a CLI
command the runtime calls**, and that command works out the role from the filesystem.

### 5.2 The hooks installer — one installer, not one package per agent

`hooks/installer.go:1-8` states a consolidation:

> *"Instead of per-agent packages (`claude/`, `gemini/`, `cursor/`, etc.) each containing near-identical
> boilerplate, this package embeds all agent templates and provides **a single generic installer** that
> reads template metadata from `AgentPresetInfo`."*

There are **9 hook template providers** (`hooks/templates/`: `claude`, `codex`, `copilot`, `cursor`,
`gemini`, `omp`, `opencode`, `pi`, `vibe`), and Claude's carries **two modes** —
`settings-autonomous.json` and `settings-interactive.json`. The installer's documented safety rule is
worth naming: it creates the file if absent, overwrites **only** when the existing file contains known
stale patterns, and otherwise **does not clobber** — because a user may have customized the settings
(`installer.go:22-30`).

### 5.3 The nudge queue — delivery differs per runtime

`nudge/poller.go:1-9` is one of the sharpest cross-runtime findings in the study:

> *"provides a background nudge-queue poller for agents that **lack turn-boundary drain hooks** (e.g.,
> Gemini, Codex). **Claude Code drains its queue via the `UserPromptSubmit` hook on every turn.** Other
> runtimes have no equivalent hook, so queued nudges would sit undelivered forever. The poller … polls
> the queue every `PollInterval`, **waits for the agent to be idle**, then drains and injects the
> formatted nudges via tmux."*

**The finding:** a capability the product *depends on* (delivering a nudge) has **no uniform primitive**,
so it is implemented **two ways** and selected per provider — a hook where one exists, a poller where it
does not. That is the honest consequence of building on other people's CLIs.

---

## 6. The instructions are prompt templates, and they are stern

`templates/polecat-CLAUDE.md` (296 lines) and `templates/witness-CLAUDE.md` (187 lines) are the actual
role instructions. They are not neutral descriptions; they are **directives**, and two sections are worth
quoting because they show the coordination problem being solved in prose:

> **"🚨 THE IDLE POLECAT HERESY 🚨"** — *"After completing work, you MUST run `gt done`. No exceptions."*
> … *"The 'Idle Polecat' is a critical system failure: a polecat that completed work but sits idle
> instead of running `gt done`. **There is no approval step.**"* … *"**Your session should NEVER end
> without running `gt done`.**"* (`templates/polecat-CLAUDE.md:5-27`)

> **"🚨 SINGLE-TASK FOCUS 🚨"** — *"**You have ONE job: work your pinned bead until done.**"* … *"File
> discovered work as beads (`bd create`) but don't fix it yourself."* (`:28-40`)

**The finding:** the agent's correct behaviour is enforced by **a long, emphatic prompt**, and the prompt
names the failure mode it is preventing (*the idle polecat*). Where the platform cannot enforce a
behaviour in code, it writes the behaviour down — and the writing is deliberately blunt.

---

## 7. The lifecycle

- **Eight states** on the agent bead: `spawning`, `working`, `done`, `stuck`, `escalated`, `idle`,
  `running`, `nuked` (`beads_agent.go:43`).
- **A completion block** written by `gt done`: `ExitType` (`COMPLETED`, `ESCALATED`, `DEFERRED`,
  `PHASE_COMPLETE`), `MRID`, `Branch`, `MRFailed`, `PushFailed`, `CompletionTime`
  (`beads_agent.go:54-66`). The fields exist so that **the Witness can discover completion from the bead
  instead of from a mail message** — the comment says exactly that.
- **A self-reported cleanup status**: the polecat reports its own git state (`clean`,
  `has_uncommitted`, `has_stash`, `has_unpushed`) — the agent is asked to account for its own mess.
- **`gt seance`** — *"Talk to your predecessor sessions"* (`cmd/seance.go:36`), paired with
  `SupportsForkSession` in the preset registry (§3). Sessions can be forked and consulted, not just
  resumed.
- **Per-role health policy** (batch 01 §4.2): ping 30s, 3 consecutive failures, 5m kill cooldown, and a
  per-role `stuck_threshold` of 1h / 2h / 4h.

---

## 8. The retirement ledger (rule 10)

| Location | What was retired | Why (its own words) |
|---|---|---|
| `beads/beads_agent.go:49` | **the `RoleBead` field on the agent record** | *"role definitions are now config-based"* |
| `config/agents.go:110` | **scattered `default*()` switch statements** | replaced by runtime-default fields on the preset |
| `hooks/installer.go:3-6` | **per-agent packages** (`claude/`, `gemini/`, …) | replaced by one generic installer + embedded templates |
| `config/roles.go:19` *(batch 01)* | the role **bead** system | replaced by TOML config |

**The pattern across the two batches is now visible and worth naming: Gas Town moved *agent
configuration out of the ledger and into code-as-data*.** Roles became TOML; provider behaviour became a
struct; hook boilerplate became templates; a `RoleBead` field was deleted. The ledger kept the **work**
and the **agent's live state**; the **configuration** moved to files that ship with the binary.

---

## 9. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F02-01** | **An agent is a bead** — structured fields stored as `key: value` lines in the description, written under a file lock. | P1 | An agent is inspectable with the same tool as its work. | No second store; the agent lives where the work lives. |
| **F02-02** | **Identity = `{Role, Rig, Name, Prefix}`, parsed from a mail-style address**; agents are addressable like email. | P1 | You can mail a colleague by name. | Identity is a string that routes, not a row that joins. |
| **F02-03** | **A 13-preset provider registry** — one struct per provider carrying launch, resume, process-detection, hooks and prompt mode; *"no provider-string switch statements should exist outside this registry."* | P1 | Any supported CLI works the same way. | Provider behaviour is data, and the rule against switches is written down. |
| **F02-04** | **`overseer` is a role with an identity and no session** — a real divergence between the identity model and the 7 role-config files. | P1/PZ | (indirect) | The model admits a non-runtime role; recorded, not smoothed. |
| **F02-05** | **`gt prime` infers the role from the directory** and injects context, wired into the runtime's session-start hook, with a 5-step session-ID fallback. | P1 | The agent knows what it is from where it is. | Context is produced by a command, not frozen into a launch string. |
| **F02-06** | **The nudge queue has two delivery paths** — a hook where the runtime has one (Claude), a poller where it does not (Gemini/Codex). | P1 | Instructions arrive even on runtimes that cannot receive them natively. | A depended-on capability with no uniform primitive is implemented twice, honestly. |
| **F02-07** | **Operational state as bead labels** (`idle:3`, `backoff:2m`) beside the description fields. | P1 | Counters and backoff are visible and editable. | Cheap extensible state without a schema change. |
| **F02-08** | **Behaviour is enforced by a stern prompt template** (296 lines for a polecat) that names the failure mode — *"THE IDLE POLECAT HERESY"*. | P1 | Agents actually finish and report. | Where code cannot enforce a behaviour, the platform writes it down bluntly. |
| **F02-09** | **The completion block exists so supervision reads the ledger, not mail** — `ExitType`/`MRID`/`Branch`/`CompletionTime` on the bead. | P1/P3 | Completion is discoverable without a message. | State lives in the durable store, not in a transient channel. |
| **F02-10** | **The agent reports its own mess** — `CleanupStatus` (clean / has_uncommitted / has_stash / has_unpushed). | P1 | Leftover work is not silently lost. | Self-accounting as a first-class field. |
| **F02-11** | **`groq-compound` re-points another provider's base URL** and keeps the key out of config by rule. | P1/PZ | A model can be swapped without a new integration. | Provider emulation at the transport layer; secrets stay in the environment. |
| **F02-12** | **The retirement ledger**: config moved **out of the ledger into code-as-data** (RoleBead → TOML; switches → a struct; per-agent packages → one installer). | PZ | (indirect) — less duplicated boilerplate. | A clear direction of travel: the ledger holds work and live state; config ships with the binary. |

---

## 10. Divergences and honest bounds

- **One real divergence found and recorded:** the identity model has **8 roles** (including `overseer`)
  while the role-config model has **7 files** — and the code states that `overseer` *"has no session"*.
  Not smoothed (F02-04).
- **Bound:** this batch read the **agent record, identity, provider registry, session wiring, instruction
  injection, nudge delivery and lifecycle**. It did **not** trace what each role *does* in operation
  (how a polecat is dispatched, what a witness patrol examines, how the Refinery decides) — those are
  batch 04's subject, and are named rather than half-covered.
- **Bound:** `gt prime`'s **output** was not read in full (it has its own files — `prime_output.go`,
  `prime_session.go`, `prime_molecule.go`); this batch established what it is, when it runs and how the
  role is resolved.
- **Bound (stated plainly):** the polecat/witness templates are quoted for the **behaviour they demand**,
  not summarised as a whole; 296 and 187 lines respectively, and a later batch may find more in them.
- **No doc-vs-code divergence was needed**; where the docs describe the agent model, the code agrees and
  says more.

---

## 11. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The provider registry (F02-03)** — 13 presets, one struct each, with the anti-switch rule written
   down. The cleanest multi-provider seam in the study so far.
2. **`gt prime` (F02-05)** — context injected by a command that infers identity **from the filesystem**,
   with a 5-step session-ID fallback. A very cheap way to give an agent a self-model.
3. **The nudge queue's two delivery paths (F02-06)** — an honest answer to a capability that does not
   exist uniformly across runtimes.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 02 of 07. Read from source on 2026-10-15. Next: `findings/03-the-workspace.md`.*
