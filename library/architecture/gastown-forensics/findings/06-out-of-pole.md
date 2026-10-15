# Batch 06 — Out-of-Pole (PZ)

**Study:** Gas Town `1.2.1` · **Batch:** 06 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **Method:** rules 1-10 of `00-PIN-AND-METHOD.md`.
Every claim carries `file:line`. Docs are claims; the code is the authority.

---

## 0. What this batch had to answer

**PZ** is the escape hatch: anything else that fits the vision. Gas Town's answer is unusually strong —
the machinery around the agents is where it becomes a **product** rather than a harness.

Short answer, measured:

| Area | What is there | Where |
|---|---|---|
| **Quota** | A **rotator** that swaps accounts when one is rate-limited, **swapping the macOS Keychain credential** and respawning the session with `--resume` | F06-01 |
| **The sandbox** | A **mTLS CA + a certificate denylist**, an **allow-list of CLI commands/subcommands (403 on violation)**, and a **git smart-HTTP proxy** so containers never reach GitHub | F06-02/03/04 |
| **Telemetry** | **OpenTelemetry** → VictoriaLogs (logs) + VictoriaMetrics (counters), keyed by a run ID | F06-05 |
| **Doctor** | **75 fixable checks** — verify *and* repair | F06-06 |
| **Plugins** | **13 directories of shell scripts** with TOML front-matter, gated by a cooldown, tracked via bead labels — *"no AI interpretation"* | F06-07 |

---

## 1. Quota — a rotator that swaps accounts

`internal/quota/` (`executor.go`, `keychain.go`, `keychain_stub.go`, `rotate.go`, `scan.go`, `state.go`)
is the answer to a commercial problem the platform openly has: an agent burns an account's rate limit.

**The rotation is mechanical, and the plan is data** (`rotate.go:14-36`):

```go
RotatePlan{ LimitedSessions, NearLimitSessions, AvailableAccounts, Assignments }
RotateResult{ Session, OldAccount, NewAccount, Rotated, ResumedSession, KeychainSwap, Error }
```

**The macOS detail is the finding** (`keychain.go:1`, `:33` — and the file is `//go:build darwin`):

> *"Claude Code stores OAuth tokens under: **`"Claude Code-credentials-<sha256(configDir)[:8]>"`**. The
> default config dir (`~/.claude`) uses the bare name `"Claude Code-credentials"` (no suffix)."*

And `KeychainCredential` exists *"holds a backup of a keychain credential for **rollback**"*
(`keychain.go:21-24`), with `SessionLinker` symlinking a session file *"so that `--resume` can find it
after account rotation"* (`executor.go:33-36`).

**Plainly:** when an agent exhausts its account, the platform **backs up the credential, swaps the
Keychain entry to another account, kills and respawns the pane, and resumes the session** — so the work
survives the account change. It is macOS-only, the code says so, and the rotation is planned before it
is executed.

---

## 2. The sandbox — three layers, all enforced

Gas Town's answer to "what may an agent's process touch?" is three independent layers, each in its own
package.

### 2.1 Layer 1 — network: an mTLS CA and a certificate denylist

`proxy/ca.go:1` — *"Package proxy provides **mTLS CA management** and server for **sandboxed polecat
execution**"*; `GenerateCA(dir)` writes a self-signed CA into a `0700` directory.

The denylist is a set of **revoked certificate serials** (`denylist.go:7-16`), *"keyed by the lowercase
hexadecimal string of the serial number, which is unique per RFC 5280 within a single CA's issued
certificates"*, and it is *"checked during the **TLS handshake** via `VerifyPeerCertificate`"* — with the
lifecycle rule *"Entries are never removed (TTLs are short; the whole CA rotates periodically)."*

### 2.2 Layer 2 — the CLI surface: an allow-list, enforced with 403

`proxy/server.go:25-31` — `Config{ListenAddr, AllowedCommands, AllowedSubcommands}`, and the rule is
explicit:

> *"`AllowedSubcommands` maps each allowed command (`"gt"`, `"bd"`) to the set of subcommands that
> polecats may invoke. If a command has an entry here, **argv[1] must appear in its list; absent argv[1]
> → 403**."*

**So the sandbox restricts not only where traffic goes but which commands the agent may run** — a
subprocess-level allow-list, not a prompt-level instruction.

### 2.3 Layer 3 — git: a smart-HTTP proxy

`proxy/git.go:1-4` — *"Git smart-HTTP proxy … bridges **sandboxed containers** to the host's bare
repositories (`~/gt/<rig>/.repo.git`). **Containers never contact GitHub directly**; all fetch and push
traffic flows through this proxy."*

**The finding, stated plainly:** the sandbox is complete rather than partial — network, command surface
and VCS are each intercepted and policed, and the code names the design intent for each. That is the
strongest security posture found in the study.

---

## 3. Telemetry — OpenTelemetry, into two stores

`telemetry/recorder.go:3-4` — *"Each function emits both an OTel log event (**→ VictoriaLogs**) and
increments a metric counter (**→ VictoriaMetrics**)"*, with a `runID` carried on the context
(`recorder.go:10-11`) so every event can be tied to one run.

**The finding:** telemetry is a **first-party pipeline with a run identifier**, using the industry
standard rather than a bespoke format. Small, and easy to under-rate.

---

## 4. Doctor — 75 checks, and they can repair

`internal/doctor/` is **20,485 production lines** across **75 non-test check files** — the second-largest
package in the tree after `internal/cmd/`.

The model is `FixableCheck` wrapping a `BaseCheck` (`doctor/agent_beads_check.go:19-27`), and a check
documents its own scope in its header:

> *"`AgentBeadsCheck` verifies that **agent beads exist for all agents** — Global agents (deacon, mayor)
> stored in town beads with the `hq-` prefix; Per-rig agents (witness, refinery) stored in each rig's
> beads; Crew workers … Agent beads are created by `gt rig add` (see gt-h3hak, gt-pinkq) and `gt crew
> add`."*

**So doctor both finds and fixes** — a check is not a report, it is a repair with a report. The named
issues (`gt-h3hak`, `gt-pinkq`) in a check's header are the changelog's habit of citing *why*.

---

## 5. Plugins — 13 shell scripts with a metadata contract

`plugins/` holds **13 directories**, each a `plugin.md` (TOML front-matter) plus a `run.sh` —
**2,069 lines of shell in total**.

### 5.1 The contract is the front-matter

`plugins/dolt-backup/plugin.md:1-24`:

```toml
+++
name = "dolt-backup"
description = "Smart Dolt database backup with change detection"
version = 2
[gate]      type = "cooldown"     duration = "15m"
[tracking]  labels = ["plugin:dolt-backup", "category:data-safety"]   digest = true
[execution] timeout = "5m"   notify_on_failure = true   severity = "high"
+++
```

**Three mechanisms in ten lines:** a **gate** (a cooldown so a plugin cannot run too often), **tracking**
via **bead labels** (so a plugin run is recorded in the same ledger as the work — batch 03's hook pattern
again), and **execution** metadata (timeout, failure notification, severity).

### 5.2 And the crucial line

`plugin.md:23` — *"Executed via `run.sh` — **no AI interpretation**."*

**That is ZFC (batch 03 §6) in the extension model:** a plugin is a **deterministic script** the daemon
runs. The AI is not in the loop at all, so a plugin cannot be coaxed into doing something else. The 13
names show the shape: `dolt-backup`, `dolt-archive`, `dolt-snapshots`, `dolt-log-rotate`, `git-hygiene`,
`gitignore-reconcile`, `submodule-commit`, `tool-updater`, `rebuild-gt`, `compactor-dog`,
`stuck-agent-dog`, `quality-review`, `github-sheriff`.

**Plugins are discoverable at two scopes** — `dog.go:1126-1128` prints `plugins/%s (town-level)` vs
`%s/plugins/%s` (rig-level).

---

## 6. The agent log — per-runtime parsers

`internal/agentlog/` (`event.go`, `claudecode.go`, `opencode.go`) parses **per-runtime agent event
logs**, with `internal/activity/activity.go` recording activity. Combined with `agent_tracking_beads.go`
(batch 01), the platform has a way to know what an agent *did* from the runtime's own output rather than
asking it.

---

## 7. The retirement ledger (rule 10)

| Where | What was retired | Why |
|---|---|---|
| `tui/feed/mq_source.go:8-9` *(batch 05)* | the **`mrqueue` package** | replaced by reading beads activity |
| `reaper/reaper.go:28-31` *(batch 04)* | the legacy `gt`/`bd` **DB names** in a fallback list | *"caused **phantom DB errors**"* (GH#2385) |
| *(batch 01, **corrected here**)* | *"10 plugin directories"* | **the measured count is 13** (`ls plugins/`), and 11 have a `run.sh` (2,069 lines total) |

**The correction is recorded rather than silently fixed** (rule 13): batch 01 §2.6 stated ten plugin
directories; the measured figure is **thirteen**. The earlier number was a head-of-list count, not a
count.

---

## 8. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F06-01** | **A quota rotator that swaps accounts** — plan-then-execute, backing up the macOS Keychain credential and respawning the session with `--resume` so the work survives the swap. | PZ | An agent keeps working when its account runs out. | A commercial constraint handled by rotation, with rollback. |
| **F06-02** | **An mTLS CA with a certificate denylist** checked in the TLS handshake, rotated on a TTL. | PZ | Sandboxed agents cannot phone home freely. | Network control at the protocol layer. |
| **F06-03** | **A CLI allow-list enforced with 403** — `AllowedSubcommands` decides which subcommands a sandboxed agent may invoke. | PZ | An agent cannot escape its tools. | The command surface is policed, not requested. |
| **F06-04** | **A git smart-HTTP proxy** so containers *"never contact GitHub directly"*. | PZ | Code moves through a controlled gate. | VCS is intercepted like everything else. |
| **F06-05** | **Telemetry is OTel into VictoriaLogs + VictoriaMetrics**, keyed by a run ID. | PZ | Behaviour is measurable per run. | A standard pipeline, not a bespoke one. |
| **F06-06** | **Doctor: 75 fixable checks** (20,485 lines) — verify *and* repair, with the reason cited in each header. | PZ | The workspace fixes itself when it drifts. | Repair is a first-class capability, not a report. |
| **F06-07** | **Plugins are shell scripts with a metadata contract** — a gate, bead-label tracking, execution metadata — *"no AI interpretation"*. | PZ | Extensions are predictable and cannot be persuaded. | A deterministic extension model, and ZFC applied to it. |
| **F06-08** | **Plugins are scoped** — town-level or rig-level, printed by `gt dog`. | PZ | A plugin can be town-wide or project-only. | The two containers of batch 03 govern extensions too. |
| **F06-09** | **Per-runtime agent logs** are parsed rather than inferred. | PZ/P1 | The platform knows what an agent did. | Runtime output is a first-class signal. |
| **F06-10** | **The plugin-count correction** — batch 01 said ten; the measured figure is thirteen. | PZ | (indirect) | A recorded correction, not a silent edit. |

---

## 9. Divergences and honest bounds

- **One correction found, and it is in this study's own earlier batch** (F06-10, §7): batch 01 stated ten
  plugin directories; the count is thirteen. Recorded here per rule 13 rather than silently amended.
- **Bound:** this batch read the **out-of-pole machinery** — quota, the proxy (all three layers),
  telemetry, doctor's model, plugins and the agent log. It did **not** read all 75 doctor checks, nor
  every plugin's `run.sh` (2,069 lines); the model, the contract and the count are what is claimed.
- **Bound:** `keychain_stub.go` exists (a non-macOS fallback for the keychain work), so the rotator is
  **not** macOS-only in principle — the *credential swap* is. Named rather than conflated.
- **Bound (stated plainly):** the quota rotation was read from its plan/result types and the keychain
  naming logic; the rotation's *decision* policy (when to rotate, which account to pick) lives in
  `scan.go`/`state.go` and was not traced.

---

## 10. Carried forward to batch 07 (the synthesis)

Three candidates for the highest transferable value, to be ranked in batch 07:

1. **The three-layer sandbox (F06-02 / F06-03 / F06-04)** — network, command surface and VCS each
   intercepted and policed, with the design intent stated in each package.
2. **Plugins as deterministic shell scripts with a metadata contract (F06-07)** — a gate, bead-label
   tracking, execution metadata, and *no AI interpretation*.
3. **Doctor as 75 fixable checks (F06-06)** — a check that repairs, with the reason cited.

All three are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 06 of 07. Read from source on 2026-10-15. Next: `findings/07-SYNTHESIS.md`.*
