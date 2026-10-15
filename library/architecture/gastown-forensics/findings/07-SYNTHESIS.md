# Batch 07 — The Synthesis

**Study:** Gas Town `1.2.1` · **Batch:** 07 of 07 · **Status:** COMPLETE
**Source:** `github.com/gastownhall/gastown` → `platforms/_extracted/gastown-main` (module `github.com/steveyegge/gastown`)
**Zip md5:** `f2485c1baa647967a31a878224a09503` · **License:** see `LICENSE`

**Scope of this batch.** Batches 00–06 measured Gas Town from code. This batch does what a synthesis
must: state the platform's verdict in plain words, name the mechanisms worth carrying into the mapping
pass, state plainly what Gas Town does **not** give us, and answer the two value questions the method
requires. It is a *reading* of the six batches — no new claims about the source are introduced here, and
every claim restates a `file:line` already established in its originating batch.

**Method rules in force.** Code is the authority; docs are claims (rule 1). No comparison to our own
platform (rule 5) — this batch compares **batches to each other**, never Gas Town to our own platform;
that is the mapping pass's job. Pole-tag everything (rule 9). Name every capability (rule 6). Answer the
two value questions (rule 4). Report the negatives. Correct earlier batches where later evidence demands
it (rule 13). Run the retirement rule (rule 10).

---

## 7.1 The measured page

Everything below was counted or read, not estimated.

| Quantity | Measured | Source batch |
|---|---|---|
| Zip md5 | `f2485c1baa647967a31a878224a09503` | 00 |
| Archive | **1,737 entries = 174 dirs + 1,563 files**; **23,491,369 B** on disk; **no `.git`** | 00 |
| Declared version | **npm `@gastown/gt` `1.2.1`**; **go 1.26.2**; module `github.com/steveyegge/gastown` | 00 |
| Identity hazard | the **repo** is `gastownhall/gastown`, the **module** is `steveyegge/gastown` | 00 |
| Go | **1,231 files / 474,724 lines** across **77 package directories** | 00, 01 |
| **Test ratio** | **568 of 1,231 Go files (46 %)**; in `internal/` **225,046 test lines of 472,897 (48 %)** | 00 |
| `internal/cmd/` | **103,691 production lines** — the largest package; **292 commands** | 01 |
| `cmd/` entry | **6 files / 697 lines** for **three binaries** | 01 |
| `docs/` | 68 files / 24,592 lines | 00 |
| Roles | **7 TOML role files**, embedded; **8 role constants in code** (incl. `overseer`) | 01, 02 |
| Provider presets | **13 built-in**, 1 struct each; **9 hook template providers** | 02 |
| Ledger | durable issues + **ephemeral wisps**, merged explicitly; agent fields in the description; state as **labels** | 02, 03 |
| Formulas | **47 `.formula.toml`** embedded, 4 types | 04 |
| Mail | beads-backed; lists / queues / announce; **2 delivery modes**; 3s idle-or-queue | 04 |
| Merge queue | **batch-then-bisect**: batch 5, wait 30s, flaky retry on | 04 |
| Plugins | **13 directories**, `plugin.md` + `run.sh`; **2,069 lines** of shell | 06 |
| Doctor | **20,485 lines / 75 fixable checks** | 06 |
| Frontend | CLI **103,691** · web **15,488** · TUI ~4,319 · style ~1,503 | 05 |
| ZFC references | **52** in non-test Go | 03, 04 |
| **Findings written** | **68** (12 + 12 + 12 + 13 + 9 + 10 across batches 01–06) | all |
| Retirement entries | **4** recorded across batches 04–06 (+ batch 01's correction) | all |

**➜ F7-1 [foundational] — Gas Town is a **terminal product with an agent-runner inside it**: 103,691 lines
of CLI against ~20,000 for the entire web and TUI layer combined, and 46 % of its Go files are tests.**
**Plain meaning:** this is a Go CLI that manages AI agents; the UI is a second door, not the product.
**Why it matters:** every finding below is weighted accordingly — and the method's first rule mattered
here for a different reason than in the other four studies: the docs are excellent and *almost* true, so
rule 1 had to be applied as a habit rather than a suspicion.

---

## 7.2 The three poles, headlined

### Pole 1 — The aissistant

**An agent is a bead, and everything about it is data.**

The agent is **a row in the same ledger as its work** (F02-01): fields stored as `key: value` lines in the
bead's **description**, written under a file lock, with operational state as **labels**. Identity is
`{Role, Rig, Name, Prefix}` parsed from a **mail-style address** (F02-02) — agents are addressable like
email. The provider is chosen from a **13-preset registry** whose one struct carries launch, process
detection, resume semantics, hooks and prompt mode, governed by a written rule: *"No provider-string
switch statements should exist outside this registry"* (F02-03). The agent's instructions arrive through
**`gt prime`**, which **infers the role from the directory the process is standing in** (F02-05).

**Pole 1 verdict, plainly:** the *agent model* is declarative, data-driven and inspectable, and the
runtime is explicitly someone else's CLI. What it does **not** have is an engine of its own — the provider
is always an external process.

### Pole 2 — The workspace

**A filesystem workspace, discovered by walking up the path.**

Town and Rig are **directories** (F03-01): the town is found by walking up for `mayor/town.json`, and the
search deliberately continues to the **outermost** match so a nested rig cannot shadow it. The config is a
**four-layer stack** — system → town → bead → wisp — with a returned **source** per value, per-key
*stacking vs override* arithmetic, and a local **veto** (`SourceBlocked`) (F03-02). The ledger has **two
tiers**: durable issues and ephemeral *wisps*, merged explicitly by readers (F03-05). And the container's
durability primitive is the **Hook** — a pointer on the agent bead that survives restart, compaction and
handoff (F03-03).

**Pole 2 verdict, plainly:** it is a workspace in the truest sense — a path you can `cd` into, a config
stack you can interrogate, and a work ledger with two durability contracts. What it does **not** have is
**tenancy**: *"One mayor per machine — multi-town requires containers/VMs for isolation"*
(`session/names.go:15`), stated outright.

### Pole 3 — Automations

**The delivery layer, and the supervision design is a document the agents execute.**

Work flows through **mail** (queued or **interrupting the session**), through **hooks** (`sling` = assign
and keep context; `handoff` = assign and start fresh), and through **convoys** that feed the next ready
issue **reactively** rather than on a poll (F04-03/04/12). The whole workflow catalogue is **47 embedded
TOML formulas**, and their prose is **tested** (F04-01/02). Recovery is bounded and escalating: re-dispatch
**capped at 3** with a cooldown, then to the Mayor (F04-10). The merge queue is **batch-then-bisect** with
a flaky-test retry and a bead-label **safety stop** (F04-08/09).

**The supervision chain is the distinctive part** (F04-06/07): daemon → **Boot** (a dog that runs fresh
each tick and must wake the Deacon through `gt nudge`, never raw tmux) → **Deacon** (its heartbeat is a
file the daemon reads) → **Witness** → **Polecat** — and the patrol formula answers the recursion
explicitly: the watchers read a **timestamp** and escalate only if it goes stale, *"instead of sending
heartbeat mail"*.

**Pole 3 verdict, plainly:** work arrives, is queued, leased, retried, merged and attributed — and the
watchdog chain has a named base case. What it does **not** have is a **scheduler abstraction**: patrols
are agent prompts and daemon ticks, not a job graph.

### PX-W / PX-F — Widgets and frontend

**The CLI is the UI, and there is no widget model.**

Measured: the CLI is **~5× the entire web + TUI layer combined** (F05-01). The terminal is a designed
layer — Lipgloss over an **Ayu theme** — that **degrades to raw text in agent mode** (F05-02/03). The TUI
is **Bubble Tea**, two surfaces. The web dashboard is **one page, thirteen panels**, HTMX 1.9.10 + SSE, no
build step, its information architecture an **interface of 14 fetch methods**, and a **response cache with
a serialising mutex** because two refreshing tabs would cause *"cascading `bd` process storms"*
(F05-04/05/09).

**And the widget model is measured absent** (F05-06): zero composers; *"widget"* in 7 incidental files;
the dashboard is a fixed grid with tabs.

**PX verdict, plainly:** one command surface, three doors — cheap, honest, and complete for its users.
The composition layer is **not here**, and this is the **fourth platform** with none.

---

## 7.3 The ranked mechanisms — what to carry forward

Ranked by how much they would cost us to derive ourselves — value-first, not novelty-first.

1. **The Hook as a durability primitive** [P2/P3] — an ephemeral session over a durable `hook_bead`
   pointer, with `sling` (keep context) and `handoff` (fresh context) as two verbs. The cheapest
   restart-safety mechanism in the study. (§3.3)
2. **ZFC — "Zero Framework Cognition"** [P2/PZ] — *"Gas Town provides transport but doesn't make
   decisions for agents… communication channels, not control flow"*; 52 in-code references; a
   per-capability fallback table; and a **changelog of removals made to honour it**. The clearest
   stated-and-enforced philosophy in the study. (§3.6, §4.5)
3. **The three-layer sandbox** [PZ] — mTLS CA + certificate denylist, a CLI allow-list enforced with
   **403**, and a git smart-HTTP proxy so containers never reach GitHub. Each layer states its intent.
   (§6.2)
4. **The watchdog chain with a named base case** [P3] — Boot → Deacon → Witness → Polecat, where Boot is
   re-created every tick and the patrol formula answers *"who watches the watchers"* with a timestamp and
   no mail. (§4.6)
5. **The provider registry** [P1] — 13 presets, one struct each, with the anti-switch rule written down
   and enforced by the type. (§2.3)
6. **47 workflows as embedded TOML, with tested prose** [P3] — four formula types, `Pour` for durable
   sub-steps, and a test that forbids a specific instruction from reappearing. (§4.1)
7. **The four-layer config stack with a local veto** [P2] — system → town → bead → wisp, a returned
   source, per-key arithmetic. (§3.2)
8. **Plugins as deterministic shell scripts** [PZ] — 13 directories, a gate, bead-label tracking,
   execution metadata — *"no AI interpretation"*. ZFC applied to the extension model. (§6.5)
9. **The batch-then-bisect merge queue** [P3] — throughput vs O(log N) cost, a flaky-test retry so an
   innocent MR is not blamed, and an operator safety stop as a bead label. (§4.4)
10. **Doctor as 75 fixable checks** [PZ] — a check that repairs, with the reason cited. (§6.4)
11. **One command surface, three doors** [PX-F] — CLI, Bubble Tea TUI and an HTMX/SSE dashboard, all
    reading the same 292 commands. (§5.1)
12. **Agent mode returns raw text** [PX-F/PZ] — the presentation layer has a deliberate machine mode.
    (§5.2)

**➜ F7-2 [synthesis] — The top four are all about *honesty of boundaries*: a primitive that says where
durability lives, a philosophy that says who decides, a sandbox that says what may not be touched, and a
watchdog chain that says who watches the watchers.** **Plain meaning:** Gas Town's best contributions are
not features but **decided limits**, each written down. **Why it matters:** decided limits are cheap to
adopt and expensive to invent — and unlike a feature, a limit cannot be half-copied.

---

## 7.4 What Gas Town does NOT give us

Stated as plainly as the positives, because a study that only lists features is useless.

| Absent capability | Measured how | Batch |
|---|---|---|
| **A widget / composition model** | 0 composers; *"widget"* in 7 incidental files; a fixed 13-panel grid | 05 |
| **Tenancy of any kind** | *"One mayor per machine — multi-town requires containers/VMs for isolation"* (`names.go:15`) | 01 |
| **An engine of its own** | every preset is an external CLI; the platform adapts and drives | 02 |
| **A scheduler abstraction** | patrols are agent prompts + daemon ticks, not a job graph with dependencies | 04 |
| **A database of its own for work** | the ledger is an **external** project (Beads), wrapped | 03 |
| **A deployable agent runtime** | the runtime is the host's tmux and the user's CLI install | 02 |
| **Cross-platform account rotation** | the keychain swap is `//go:build darwin` only | 06 |
| **A live `team`-like membership model** | crew are user-managed workspaces; there is no permission model between agents | 03 |

**➜ F7-3 [synthesis] — The absences cluster into one sentence: Gas Town is a **single-machine, CLI-shaped
harness for driving other people's coding agents**, and it is honest about every boundary it draws.**
**Plain meaning:** it solves the *delivery and supervision* problem brilliantly for one operator on one
machine, and it explicitly delegates the rest (the ledger, the engine, tenancy) to other systems or to the
host. **Why it matters:** it tells the mapping pass what to take (mechanisms and decided limits) and what
not to look for here (a tenant model, an engine, a widget surface).

---

## 7.5 The consistency check across batches

A synthesis must look for contradictions between its own inputs. Four were found and are recorded rather
than smoothed:

1. **Roles: 7 vs 8.** Batch 01 counted seven TOML role files; batch 02 found **eight** role constants in
   `session/identity.go`, including `overseer`, which *"has no session"*. Both are true: the config model
   has seven; the identity model has eight. Recorded as F02-04, not reconciled by deleting one.
2. **Plugins: 10 vs 13.** Batch 01 stated ten plugin directories; batch 06 measured **thirteen** (with
   11 carrying a `run.sh`, 2,069 lines). The earlier number was a head-of-list count. **Corrected in batch
   06 per rule 13**, and the correction is recorded rather than applied silently.
3. **"Git-backed hooks" — two different hooks.** The PIN's phrase resolves to two unrelated things: the
   **Hook** (the durability pointer, batch 03) and the **hooks installer** (Claude Code's settings.json,
   batch 02). Both are real; the word is overloaded. Recorded so a later batch does not conflate them.
4. **The frontier is consistent.** Every batch found the same boundary in a different place — the
   framework transports, the agent decides, and something else owns the engine and the ledger. That is a
   coherent design, not a coincidence of readings.

**➜ F7-4 [synthesis] — No batch was falsified by a later batch; one was corrected, and one ambiguity was
resolved by naming both meanings.** **Plain meaning:** the 68 findings hold together as one body of
evidence. **Why it matters:** the mapping pass can use them as one corpus, with the plugin count corrected
and the two "hooks" distinguished.

---

## 7.6 The two value questions (rule 4)

### Q1 — What does this platform do for *its own users*?

**For a developer running AI coding agents across several projects: a great deal, and it is the point of
the product.** You get a workspace where agents are colleagues with roles and mailboxes; work that
survives a restart because it lives on a hook; a merge queue that does not blame an innocent change for a
flaky test; a system that stays silent when healthy and escalates only real problems; a sandbox that keeps
agents inside their tools and away from the network; and an operator switch that halts merging until you
remove it. The divergences are minimal — and where the docs and code disagree, the code is *more*
specific, which is the best of the four shapes encountered.

**Verdict on Q1:** as a **single-machine, CLI-shaped harness for driving AI coding agents**, this is
mature, coherent, and unusually well-documented by its own code. Its limits (one town per machine, an
external ledger, external engines) are **not gaps for its users** — a solo developer with a laptop does not
need tenancy, and their agent CLIs are already installed.

### Q2 — What does it do for *our vision*?

**A great deal as a mechanism source, and a clear set of boundaries it refuses to cross.** Gas Town is the
first platform studied that is aimed at the same target, and the most instructive thing about it is *how
narrowly it draws its lines*: one town per machine (stated), an external ledger (chosen), an external
engine (chosen), and **no widget model** (measured). What it *does* offer is a set of **decided limits**,
each written down: ZFC (transport, don't decide), the Hook (durability lives here), the sandbox (this may
not be touched), and the watchdog base case (this is who watches the watchers).

**Verdict on Q2:** Gas Town is a **mechanism source and a boundary-setting reference** — take the Hook,
the provider registry, the tested formulas, the three-layer sandbox and the patrol-as-document; and treat
its refusals (tenancy, an engine, a widget surface) as **signposts about what we must own**, not as gaps
to fill from here.

**➜ F7-5 [synthesis] — The two questions point the same way, as with the closest neighbour in the
study: excellent for its users, directly instructive for our delivery and supervision layers — and
explicitly empty on tenancy, engine and composition.** **Plain meaning:** the closer a platform is to the
target, the more valuable its *decided limits* become, because a limit is the thing you cannot copy by
accident.

---

## 7.7 The finding index

Consolidated for the mapping pass. Format: `id · pole · one line · batch §`.

**Foundations** — the pin, the identity hazard (repo vs module), the 46 % test ratio, the CLI-dominant
shape, and the 10-rule method · 00 §1–§6.

**Pole 1 — the aissistant** — F02-01 an agent is a bead, fields in the description, state as labels [P1]
02 §1 · F02-02 identity as a mail address, 8 roles incl. `overseer` [P1/PZ] 02 §2 · F02-03 the 13-preset
provider registry with the anti-switch rule [P1] 02 §3 · F02-04 the overseer divergence [P1/PZ] 02 §2.1 ·
F02-05 `gt prime` infers the role from the directory [P1] 02 §5.1 · F02-06 the nudge queue's two delivery
paths [P1] 02 §5.3 · F02-07 operational state as bead labels [P1] 02 §1 · F02-08 behaviour enforced by a
stern prompt template [P1] 02 §6 · F02-09 the completion block so supervision reads the ledger [P1/P3] 02
§7 · F02-10 the agent reports its own mess [P1] 02 §7 · F02-11 `groq-compound` re-points another provider's
base URL [P1/PZ] 02 §3 · F02-12 config moved out of the ledger into code-as-data [PZ] 02 §8.

**Pole 2 — the workspace** — F03-01 the town is discovered by walking up the path [P2] 03 §1.1 · F03-02 the
four-layer config stack with a local veto [P2] 03 §2 · F03-03 the Hook is the durability primitive [P2/P3]
03 §3 · F03-04 `sling` vs `handoff` [P2/P3] 03 §3.3 · F03-05 a two-tier ledger merged explicitly [P2] 03
§4 · F03-06 ZFC — Zero Framework Cognition [P2/PZ] 03 §6 · F03-07 the autonomous/interactive split [P2/P1]
03 §7 · F03-08 git errors carry raw output [P2] 03 §5 · F03-09 a guard refuses to mutate the town root [P2]
03 §5 · F03-10 identity stored apart from behaviour [P2] 03 §1.2 · F03-11 the ZFC removal ledger [PZ] 03 §8
· F03-12 `role_bead` removed on both records [PZ] 03 §4.2.

**Pole 3 — automations** — F04-01 47 embedded formulas in four types [P3] 04 §1 · F04-02 the formula's
prose is tested [P3/PZ] 04 §1.3 · F04-03 mail is a real bus [P3] 04 §2 · F04-04 the 3s idle-or-queue
fallback [P3] 04 §2.3 · F04-05 the Deacon's heartbeat is a file [P3] 04 §3.1 · F04-06 the patrol formula is
a design document [P3] 04 §3.2 · F04-07 the watchdog chain's named base case [P3] 04 §3.3 · F04-08 the
batch-then-bisect merge queue [P3] 04 §4 · F04-09 an operator safety stop as a bead label [P3] 04 §4 ·
F04-10 capped re-dispatch then escalate [P3] 04 §5 · F04-11 the reaper executes but decides nothing [P3/PZ]
04 §5 · F04-12 convoys feed reactively [P3] 04 §6 · F04-13 a fallback list is where a stale name hides [PZ]
04 §7.

**Widgets / frontend** — F05-01 three surfaces, one implementation [PX-F] 05 §1 · F05-02 a themed semantic
terminal style layer [PX-F] 05 §2.1 · F05-03 agent mode returns raw text [PX-F/PZ] 05 §2.2 · F05-04 the
fetcher interface as information architecture [PX-F] 05 §4.3 · F05-05 the dashboard throttles what it
stands on [PX-F/PZ] 05 §4.4 · **F05-06 no widget model [PX-W] 05 §6** · F05-07 the TUI is Bubble Tea [PX-F]
05 §3 · F05-08 a removed package left as a no-op stub [PZ] 05 §3 · F05-09 a server-rendered frontend with
no build step [PX-F] 05 §4.

**Out-of-pole** — F06-01 the quota rotator swaps accounts [PZ] 06 §1 · F06-02 an mTLS CA with a certificate
denylist [PZ] 06 §2.1 · F06-03 a CLI allow-list enforced with 403 [PZ] 06 §2.2 · F06-04 a git smart-HTTP
proxy [PZ] 06 §2.3 · F06-05 OTel telemetry with a run ID [PZ] 06 §3 · F06-06 75 fixable doctor checks [PZ]
06 §4 · F06-07 plugins as shell scripts with a metadata contract [PZ] 06 §5 · F06-08 plugins are scoped
[PZ] 06 §5 · F06-09 per-runtime agent logs are parsed [PZ/P1] 06 §6 · F06-10 the plugin-count correction
[PZ] 06 §7.

**Synthesis** — F7-1 the measured page [—] §7.1 · F7-2 twelve mechanisms ranked [—] §7.3 · F7-3 the
absences cluster [—] §7.4 · F7-4 one correction, one ambiguity named [—] §7.5 · F7-5 the two questions
answered [—] §7.6.

**➜ F7-6 [synthesis] — 68 findings, five of them load-bearing: F03-03 (the Hook), F03-06 (ZFC), F04-07
(the watchdog base case), F06-02/03/04 (the three-layer sandbox), F05-06 (no widget model).** **Plain
meaning:** if the mapping pass reads only five lines, these are the five — and four of the five are
*decided limits* rather than features. **Why it matters:** it gives the next stage a prioritised entry
point instead of 68 flat rows.

---

## 7.8 The platform verdict, in one paragraph

**Gas Town `1.2.1` is a single-machine, CLI-shaped Go harness for driving other people's AI coding agents
across projects, and it is the most honest platform in this workshop about where it stops.** Its
architecture is genuinely instructive: an **agent is a bead** whose fields live in its description and
whose state lives in labels; a **13-preset provider registry** whose one struct carries everything
provider-specific and whose anti-switch rule is written down; **`gt prime`** that infers an agent's role
from the directory it stands in; a **Hook** that makes work survive restart, compaction and handoff;
**47 embedded TOML formulas** whose prose is tested; a **three-layer sandbox** (mTLS CA + denylist, a CLI
allow-list enforced with 403, a git smart-HTTP proxy); **75 fixable doctor checks**; and a **watchdog
chain of agents** with a named base case and an explicit answer to *"who watches the watchers"*. Its
philosophy is named and enforced — **ZFC: the framework transports, the agent decides** — with a
changelog of code deleted to honour it. Where it stops is equally clear and equally stated: **one town per
machine** (containers for isolation), an **external ledger** (Beads), **external engines** (the agent
CLIs), and **no widget model at all**. The correct posture toward it is therefore **mechanism source and
boundary-setting reference** — take the Hook, the registry, the tested formulas, the sandbox and the
patrol-as-document; and treat its refusals as signposts about what we must own.

---

## 7.9 Batch 07 — checklist

- [x] Read from source only; no new source claims introduced (all restate verified findings).
- [x] Every finding carries its originating batch and section.
- [x] No comparison to our own platform (rule 5) — internal batch-to-batch consistency only (§7.5).
- [x] Both value questions answered separately (rule 4, §7.6).
- [x] Absences reported as findings, not omitted (rule 6, §7.4).
- [x] Four cross-batch consistencies recorded, none smoothed; one correction applied and recorded
  (rule 13, §7.5).
- [x] Retirement rule honoured: no earlier finding deleted to fit the synthesis (rule 10).
- [x] 6 synthesis findings: F7-1…F7-6, plus the complete finding index (§7.7).

The Gas Town study is complete: **pin (00) + 68 findings across six pole batches (01–06) + this
synthesis (07).** The reader is built from this markdown, at the end, with the platform-agnostic
generator — and no study markdown is edited to fit it.
